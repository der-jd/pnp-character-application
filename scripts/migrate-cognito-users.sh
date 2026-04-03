#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly AWS_REGION="eu-central-1"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Migrate users from one Cognito user pool to another.
Migrates email addresses. Users will receive a new sub (user ID) in the target pool.
Temporary passwords are generated and printed to the console. Deliver them to the
users out-of-band. Users must change the password on first login.

OPTIONS:
  -s, --source-pool-id ID         Source Cognito user pool ID (required)
  -t, --target-pool-id ID         Target Cognito user pool ID (required)
  -p, --profile PROFILE           AWS profile name (required)
  -r, --region REGION             AWS region (default: $AWS_REGION)
  --dry-run                       Print users that would be migrated without making changes
  --help                          Show this help message

Note: The user sub (ID) cannot be preserved across pools. Cognito always generates
a new sub for each user. If your application stores data keyed by sub (e.g. in
DynamoDB), you will need to update those references after migration. The script
outputs old and new sub mappings to help with this.

EXAMPLES:
  $SCRIPT_NAME -s eu-central-1_ABC123 -t eu-central-1_DEF456 -p my-aws-profile
  $SCRIPT_NAME -s eu-central-1_ABC123 -t eu-central-1_DEF456 -p my-aws-profile --dry-run

EOF
}

source_pool_id=""
target_pool_id=""
aws_profile=""
aws_region="$AWS_REGION"
dry_run=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--source-pool-id)
      source_pool_id="$2"
      shift 2
      ;;
    -t|--target-pool-id)
      target_pool_id="$2"
      shift 2
      ;;
    -p|--profile)
      aws_profile="$2"
      shift 2
      ;;
    -r|--region)
      aws_region="$2"
      shift 2
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
      echo "Error: Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$source_pool_id" ]]; then
  echo "Error: Missing source pool ID. Use -s or --source-pool-id to specify it."
  usage
  exit 1
fi

if [[ -z "$target_pool_id" ]]; then
  echo "Error: Missing target pool ID. Use -t or --target-pool-id to specify it."
  usage
  exit 1
fi

if [[ -z "$aws_profile" ]]; then
  echo "Error: Missing AWS profile. Use -p or --profile to specify it."
  usage
  exit 1
fi

generate_password() {
  openssl rand -base64 32
}

# Suppress AWS CLI pager output --> write output of AWS CLI commands directly to the console
export AWS_PAGER=""

source_pool_name=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$source_pool_id" \
    --query 'UserPool.Name' \
    --output text \
    --profile "$aws_profile" \
    --region "$aws_region")

target_pool_name=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$target_pool_id" \
    --query 'UserPool.Name' \
    --output text \
    --profile "$aws_profile" \
    --region "$aws_region")

echo "Source pool: $source_pool_name ($source_pool_id)"
echo "Target pool: $target_pool_name ($target_pool_id)"
echo ""
echo "Fetching users from source pool..."

# Collect all users across paginated responses (list-users returns max 60 per call)
all_users="[]"
pagination_token=""

while true; do
  if [[ -n "$pagination_token" ]]; then
    response=$(aws cognito-idp list-users \
      --user-pool-id "$source_pool_id" \
      --pagination-token "$pagination_token" \
      --profile "$aws_profile" \
      --region "$aws_region" \
      --output json)
  else
    response=$(aws cognito-idp list-users \
      --user-pool-id "$source_pool_id" \
      --profile "$aws_profile" \
      --region "$aws_region" \
      --output json)
  fi

  page_users=$(echo "$response" | jq '.Users')
  all_users=$(echo "$all_users $page_users" | jq -s '.[0] + .[1]')

  pagination_token=$(echo "$response" | jq -r '.PaginationToken // empty')
  if [[ -z "$pagination_token" ]]; then
    break
  fi
  echo "  Fetched $(echo "$page_users" | jq 'length') users, fetching next page..."
done

user_count=$(echo "$all_users" | jq 'length')
echo "Found $user_count user(s) in source pool."

if [[ "$user_count" -eq 0 ]]; then
  echo "No users to migrate."
  exit 0
fi

echo ""
echo "Sub mapping (old -> new):"
echo "========================="

for i in $(seq 0 $((user_count - 1))); do
  user=$(echo "$all_users" | jq ".[$i]")
  old_sub=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "sub") | .Value')
  user_email=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "email") | .Value')
  email_verified=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "email_verified") | .Value')

  echo ""
  echo "User $((i + 1))/$user_count:"
  echo "  Email:              $user_email"
  echo "  Old sub:            $old_sub"

  if [[ "$dry_run" == true ]]; then
    echo "  [dry-run] Would create user in target pool"
    continue
  fi

  # Suppress invitation email — temporary password is printed to the console
  # and must be delivered to the user out-of-band.
  temporary_password=$(generate_password)
  create_output=$(aws cognito-idp admin-create-user \
    --user-pool-id "$target_pool_id" \
    --username "$user_email" \
    --user-attributes \
      Name="email",Value="$user_email" \
      Name="email_verified",Value="${email_verified:-true}" \
    --temporary-password "$temporary_password" \
    --message-action SUPPRESS \
    --profile "$aws_profile" \
    --region "$aws_region" \
    --output json)

  new_sub=$(echo "$create_output" | jq -r '.User.Attributes[] | select(.Name == "sub") | .Value')
  echo "  New sub:            $new_sub"
  echo "  Temporary password: $temporary_password"
done

echo ""
echo "Migration complete. $user_count user(s) processed."
echo ""
echo "IMPORTANT:"
echo "  - Deliver the temporary passwords to the users out-of-band."
echo "    On first login, the application will prompt them to set a new password."
echo "  - User subs have changed. If your application stores data keyed by user sub"
echo "    (e.g. userId in DynamoDB), you will need to update those references."
