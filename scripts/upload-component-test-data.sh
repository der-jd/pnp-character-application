#!/usr/bin/env bash

# Script to upload test data for component tests to DynamoDB tables
# Usage: ./upload-component-test-data.sh [OPTIONS]

set -euo pipefail

# Script metadata
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"

# Configuration constants
readonly DEFAULT_REGION="eu-central-1"
readonly DEFAULT_CHARACTERS_DIR="$SCRIPT_DIR/../backend/test/component-tests/test-data/characters"
readonly DEFAULT_HISTORY_DIR="$SCRIPT_DIR/../backend/test/component-tests/test-data/history"
readonly TABLE_PREFIX="pnp-app"
readonly CHARACTERS_TABLE_BASE="$TABLE_PREFIX-characters"
readonly HISTORY_TABLE_BASE="$TABLE_PREFIX-characters-history"

# ANSI color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Upload test data for component tests to DynamoDB tables.
Test data must be in DynamoDB JSON format (with Type annotations).

OPTIONS:
    -p, --profile PROFILE         AWS profile name (required)
    -e, --env ENV                 Environment name for table suffix, e.g. dev or prod (required)
    -r, --region REGION           AWS region (default: $DEFAULT_REGION)
    -c, --characters-dir DIR      Directory containing character JSON files (default: $DEFAULT_CHARACTERS_DIR)
    -h, --history-dir DIR         Directory containing history JSON files (default: $DEFAULT_HISTORY_DIR)
    -o, --overwrite               Overwrite existing items (with confirmation)
    --dry-run                     Show what would be uploaded without actually doing it
    --help                        Show this help message

EXAMPLES:
    $SCRIPT_NAME -p my-aws-profile -e dev
    $SCRIPT_NAME -p my-aws-profile -e prod -r us-west-2 -o
    $SCRIPT_NAME -p my-aws-profile -e dev --characters-dir /path/to/characters --history-dir /path/to/history --dry-run

EOF
}

get_characters_table_name() {
    local environment="$1"
    echo "$CHARACTERS_TABLE_BASE-$environment"
}

get_history_table_name() {
    local environment="$1"
    echo "$HISTORY_TABLE_BASE-$environment"
}

is_history_table() {
    local table="$1"
    [[ "$table" == "$HISTORY_TABLE_BASE-"* ]]
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first (apt-get install jq)."
        exit 1
    fi
}

validate_environment() {
    local environment="$1"

    case "$environment" in
        dev|prod)
            ;;
        *)
            log_error "Environment must be one of: dev, prod. Received '$environment'."
            exit 1
            ;;
    esac
}

# Function to validate directory
validate_directory() {
    local dir="$1"
    local dir_type="$2"

    if [[ ! -d "$dir" ]]; then
        log_error "$dir_type directory '$dir' does not exist."
        exit 1
    fi

    if [[ ! -r "$dir" ]]; then
        log_error "$dir_type directory '$dir' is not readable."
        exit 1
    fi
}

# Function to check if item exists in DynamoDB
item_exists() {
    local table="$1"
    local key="$2"
    local profile="$3"
    local region="$4"

    local result
    result=$(aws dynamodb get-item \
        --table-name "$table" \
        --key "$key" \
        --profile "$profile" \
        --region "$region" \
        --output json 2>/dev/null || echo "{}")

    echo "$result" | jq -e '.Item' > /dev/null 2>&1
}

# Function to upload item to DynamoDB
upload_item() {
    local table="$1"
    local item_file="$2"
    local profile="$3"
    local region="$4"
    local dry_run="$5"

    if [[ "$dry_run" == "true" ]]; then
        # Extract and display key information for dry run too
        local item_json
        item_json=$(cat "$item_file")

        local key_info=""
        if is_history_table "$table"; then
            local character_id=$(echo "$item_json" | jq -r '.characterId.S // "unknown"')
            local block_number=$(echo "$item_json" | jq -r '.blockNumber.N // "unknown"')
            key_info=" (characterId: $character_id, blockNumber: $block_number)"
        else
            local user_id=$(echo "$item_json" | jq -r '.userId.S // "unknown"')
            local character_id=$(echo "$item_json" | jq -r '.characterId.S // "unknown"')
            key_info=" (userId: $user_id, characterId: $character_id)"
        fi

        log_info "[DRY RUN] Would upload: $(basename "$item_file") to $table$key_info"
        return 0
    fi

    local item_json
    item_json=$(cat "$item_file")

    # Extract and display key information
    local key_info=""
    if is_history_table "$table"; then
        local character_id=$(echo "$item_json" | jq -r '.characterId.S // "unknown"')
        local block_number=$(echo "$item_json" | jq -r '.blockNumber.N // "unknown"')
        key_info=" (characterId: $character_id, blockNumber: $block_number)"
    else
        local user_id=$(echo "$item_json" | jq -r '.userId.S // "unknown"')
        local character_id=$(echo "$item_json" | jq -r '.characterId.S // "unknown"')
        key_info=" (userId: $user_id, characterId: $character_id)"
    fi

    if aws dynamodb put-item \
        --table-name "$table" \
        --item "$item_json" \
        --profile "$profile" \
        --region "$region" \
        --output json 2>/dev/null; then
        log_success "Uploaded: $(basename "$item_file") to $table$key_info"
        return 0
    else
        log_error "Failed to upload: $(basename "$item_file") to $table"
        return 1
    fi
}

# Function to upload items with overwrite handling
upload_items() {
    local table="$1"
    local source_dir="$2"
    local profile="$3"
    local region="$4"
    local overwrite="$5"
    local dry_run="$6"

    local uploaded=0
    local skipped=0
    local failed=0
    local files=()

    log_info "Processing items for table: $table"

    # Use while loop for better compatibility
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$source_dir" -name "*.dynamodb.json" -print0)

    for file in "${files[@]}"; do
        local item_json
        item_json=$(cat "$file")

        # Extract key for existence check
        local key
        if is_history_table "$table"; then
            key=$(echo "$item_json" | jq '{characterId: .characterId, blockNumber: .blockNumber}')
        else
            key=$(echo "$item_json" | jq '{userId: .userId, characterId: .characterId}')
        fi

        # Check if item exists
        if item_exists "$table" "$key" "$profile" "$region"; then
            if [[ "$overwrite" == "true" ]]; then
                log_warning "Overwriting existing item: $(basename "$file")"
                if upload_item "$table" "$file" "$profile" "$region" "$dry_run"; then
                    ((uploaded++))
                else
                    ((failed++))
                fi
            else
                log_warning "Item already exists, skipping: $(basename "$file")"
                ((skipped++))
            fi
        else
            if upload_item "$table" "$file" "$profile" "$region" "$dry_run"; then
                ((uploaded++))
            else
                ((failed++))
            fi
        fi
    done

    echo
    log_info "Summary for $table:"
    log_info "  Uploaded: $uploaded"
    log_info "  Skipped: $skipped"
    if (( failed > 0 )); then
        log_error "  Failed: $failed"
    fi

    return $failed
}

# Function to show upload overview
show_upload_overview() {
    local characters_dir="$1"
    local history_dir="$2"
    local characters_table="$3"
    local history_table="$4"
    local dry_run="$5"

    local character_files=()
    local history_files=()

    # Get file lists
    while IFS= read -r -d '' file; do
        character_files+=("$file")
    done < <(find "$characters_dir" -name "*.dynamodb.json" -print0)

    while IFS= read -r -d '' file; do
        history_files+=("$file")
    done < <(find "$history_dir" -name "*.dynamodb.json" -print0)

    echo
    log_info "=== UPLOAD OVERVIEW ==="
    echo

    # Characters overview
    log_info "Characters Table: $characters_table"
    log_info "Source Directory: $characters_dir"
    log_info "Files to upload: ${#character_files[@]}"
    if (( ${#character_files[@]} > 0 )); then
        echo
        for file in "${character_files[@]}"; do
            log_info "  - $(basename "$file")"
        done
    fi
    echo

    # History overview
    log_info "History Table: $history_table"
    log_info "Source Directory: $history_dir"
    log_info "Files to upload: ${#history_files[@]}"
    if (( ${#history_files[@]} > 0 )); then
        echo
        for file in "${history_files[@]}"; do
            log_info "  - $(basename "$file")"
        done
    fi

    echo
    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY RUN: No files will actually be uploaded"
    else
        log_info "Total files to upload: $(( ${#character_files[@]} + ${#history_files[@]} ))"
    fi
    echo
}

# Main function
main() {
    local aws_profile=""
    local environment=""
    local aws_region="$DEFAULT_REGION"
    local characters_dir="$DEFAULT_CHARACTERS_DIR"
    local history_dir="$DEFAULT_HISTORY_DIR"
    local overwrite=false
    local dry_run=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--profile)
                aws_profile="$2"
                shift 2
                ;;
            -e|--env)
                environment="$2"
                shift 2
                ;;
            -r|--region)
                aws_region="$2"
                shift 2
                ;;
            -c|--characters-dir)
                characters_dir="$2"
                shift 2
                ;;
            -h|--history-dir)
                history_dir="$2"
                shift 2
                ;;
            -o|--overwrite)
                overwrite=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo
                log_info "Available options:"
                log_info "  -p, --profile PROFILE         AWS profile name (required)"
                log_info "  -e, --env ENV                 Environment name for table suffix (required)"
                log_info "  -r, --region REGION           AWS region (default: eu-central-1)"
                log_info "  -c, --characters-dir DIR      Directory containing character JSON files"
                log_info "  -h, --history-dir DIR         Directory containing history JSON files"
                log_info "  -o, --overwrite               Overwrite existing items"
                log_info "  --dry-run                     Show what would be uploaded"
                log_info "  --help                        Show this help message"
                echo
                usage
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [[ -z "$aws_profile" ]]; then
        log_error "AWS profile is required. Use -p or --profile to specify it."
        usage
        exit 1
    fi

    if [[ -z "$environment" ]]; then
        log_error "Environment is required. Use -e or --env to specify it."
        usage
        exit 1
    fi

    validate_environment "$environment"

    local characters_table
    characters_table=$(get_characters_table_name "$environment")

    local history_table
    history_table=$(get_history_table_name "$environment")

    check_jq

    # Validate inputs
    validate_directory "$characters_dir" "Characters"
    validate_directory "$history_dir" "History"

    # Show configuration
    echo
    log_info "Configuration:"
    log_info "  AWS Profile: $aws_profile"
    log_info "  Environment: $environment"
    log_info "  AWS Region: $aws_region"
    log_info "  Characters Directory: $characters_dir"
    log_info "  History Directory: $history_dir"
    log_info "  Characters Table: $characters_table"
    log_info "  History Table: $history_table"
    log_info "  Overwrite: $overwrite"
    log_info "  Dry Run: $dry_run"
    echo

    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
        echo
    fi

    # Show upload overview and get confirmation
    show_upload_overview "$characters_dir" "$history_dir" "$characters_table" "$history_table" "$dry_run"

    if [[ "$dry_run" != "true" ]]; then
        if [[ "$overwrite" == "true" ]]; then
            log_warning "OVERWRITE MODE ENABLED - This will REPLACE any existing items in DynamoDB"
            read -p "Do you want to proceed with the upload and OVERWRITE existing items? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Upload cancelled by user."
                exit 0
            fi
        else
            read -p "Do you want to proceed with the upload? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Upload cancelled by user."
                exit 0
            fi
        fi
    fi

    # Upload characters
    local total_failed=0
    upload_items "$characters_table" "$characters_dir" "$aws_profile" "$aws_region" "$overwrite" "$dry_run"
    total_failed=$((total_failed + $?))

    echo

    # Upload history
    upload_items "$history_table" "$history_dir" "$aws_profile" "$aws_region" "$overwrite" "$dry_run"
    total_failed=$((total_failed + $?))

    echo
    if (( total_failed == 0 )); then
        if [[ "$dry_run" == "true" ]]; then
            log_success "Dry run completed successfully!"
        else
            log_success "Upload completed successfully!"
        fi
    else
        log_error "Upload completed with $total_failed failures."
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
