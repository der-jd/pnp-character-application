#!/bin/bash

# API Schema Testing echo "*** API Schema Testing with Terraform Symlinks + LocalStack ***"
echo "============================================================="

# Check for cleanup flag
if [ "$1" = "--clean" ]; then
    print_step "Cleaning up API schema testing environment..."
    
    # Stop LocalStack container
    if docker ps | grep -q locaecho ">>> API Endpoint: $API_ENDPOINT"
echo ">>> Environment File: $PROJECT_ROOT/frontend/.env.api-testing"tack; then
        print_step "Stopping LocalStack container..."
        docker compose -f docker-compose.localstack.yml down
        print_success "LocalStack container stopped"
    fi
    
    # Remove testing directory
    if [ -d "$SCHEMA_TESTING_DIR" ]; then
        print_step "Removing API schema testing directory..."
        rm -rf "$SCHEMA_TESTING_DIR"
        print_success "Testing directory removed"
    fi
    
    # Remove environment file
    if [ -f "$PROJECT_ROOT/frontend/.env.api-testing" ]; then
        rm -f "$PROJECT_ROOT/frontend/.env.api-testing"
        print_success "Environment file removed"
    fi
    
    echo ""
    print_success "API schema testing environment cleaned up!"
    echo ""
    exit 0
fi

# Check LocalStack Terraform + LocalStack using Symlinks
# Creates symbolic links to original Terraform files with LocalStack provider override
# Use --clean flag to clean up testing environment

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_TESTING_DIR="$PROJECT_ROOT/terraform/api-schema-testing"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==> $1${NC}"
}

print_success() {
    echo -e "${GREEN}[+] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[-] $1${NC}"
}

echo "*** API Schema Testing with Terraform Symlinks + LocalStack ***"
echo "============================================================="

# Check prerequisites
print_step "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed!"
    echo ""
    echo "Please install Docker:"
    echo "  • Ubuntu/Debian: sudo apt-get install docker.io docker-compose-plugin"
    echo "  • macOS: Install Docker Desktop from https://docker.com/products/docker-desktop"
    echo "  • Windows: Install Docker Desktop from https://docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is required but not available!"
    echo ""
    echo "Please install Docker Compose plugin:"
    echo "  • Ubuntu/Debian: sudo apt-get install docker-compose-plugin"
    echo "  • Or use standalone: sudo apt-get install docker-compose"
    echo ""
    exit 1
fi

# Check Terraform
if ! command -v terraform &> /dev/null; then
    print_error "Terraform is required but not installed!"
    echo ""
    echo "Please install Terraform:"
    echo "  • Ubuntu/Debian: https://developer.hashicorp.com/terraform/install"
    echo "  • macOS: brew install terraform"
    echo "  • Windows: Use Chocolatey or download from https://terraform.io"
    echo ""
    exit 1
fi

# Check jq for JSON parsing
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed!"
    echo ""
    echo "Please install jq:"
    echo "  • Ubuntu/Debian: sudo apt-get install jq"
    echo "  • macOS: brew install jq"
    echo "  • Windows: Use Chocolatey or download from https://jqlang.github.io/jq/"
    echo ""
    exit 1
fi

print_success "All prerequisites available"

# Check LocalStack status and start if needed
print_step "Checking LocalStack status..."
if ! curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
    print_warning "LocalStack is not running. Starting LocalStack..."
    
    # Start LocalStack using docker compose
    if ! docker compose -f "$PROJECT_ROOT/docker-compose.localstack.yml" up -d; then
        print_error "Failed to start LocalStack!"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check if Docker daemon is running: sudo systemctl status docker"
        echo "  2. Check if ports are available: sudo netstat -tlnp | grep :4566"
        echo "  3. Check Docker Compose file: $PROJECT_ROOT/docker-compose.localstack.yml"
        echo "  4. Try manual start: docker compose -f docker-compose.localstack.yml up"
        echo ""
        exit 1
    fi
    
    # Wait for LocalStack to be ready
    print_step "Waiting for LocalStack to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "LocalStack failed to start within 30 seconds!"
            echo ""
            echo "Check LocalStack logs: docker compose -f docker-compose.localstack.yml logs"
            exit 1
        fi
        sleep 1
    done
    
    print_success "LocalStack started successfully"
else
    print_success "LocalStack is already running"
fi

# Build backend first
print_step "Building backend..."
cd "$PROJECT_ROOT/backend"

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed!"
    echo ""
    echo "Please install Node.js:"
    echo "  • Ubuntu/Debian: sudo apt-get install nodejs npm"
    echo "  • macOS: brew install node"
    echo "  • Windows: Download from https://nodejs.org"
    echo ""
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Backend dependencies not installed. Installing..."
    if ! npm install; then
        print_error "Failed to install backend dependencies!"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check Node.js version: node --version (requires Node.js 18+)"
        echo "  2. Clear npm cache: npm cache clean --force"
        echo "  3. Delete node_modules and try again: rm -rf node_modules && npm install"
        echo ""
        exit 1
    fi
fi

# Build the backend
if ! npm run build > /dev/null 2>&1; then
    print_error "Backend build failed!"
    echo ""
    echo "Try building manually to see detailed error:"
    echo "  cd backend && npm run build"
    echo ""
    exit 1
fi

print_success "Backend built successfully"

# Create API schema testing directory structure
print_step "Setting up symlinked Terraform configuration..."
mkdir -p "$SCHEMA_TESTING_DIR"
cd "$SCHEMA_TESTING_DIR"

# Clean up any existing files/links
rm -rf .terraform *.tf modules terraform.tfstate* *.tfplan

# Create symlinks to ALL original Terraform files (dependencies require all files)
ln -sf ../*.tf .
ln -sf ../modules .

# Create backend directory structure that Terraform expects (from contract-testing perspective)
mkdir -p ../backend/build/src/lambdas
mkdir -p ../backend/dist

# Copy actual Lambda builds to where Terraform expects them
cp -r ../../backend/build/src/lambdas/* ../backend/build/src/lambdas/ 2>/dev/null || true

# Create LocalStack provider override file
cat > provider_override.tf << 'EOF'
# LocalStack Provider Override
# This file overrides the AWS provider to point to LocalStack
# All original terraform files remain unchanged

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
  # Override Terraform Cloud backend to use local backend
  backend "local" {}
}

# Override AWS provider to use LocalStack
provider "aws" {
  region                      = "eu-central-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  # Point all AWS services to LocalStack
  endpoints {
    apigateway     = "http://localhost:4566"
    cloudformation = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    iam            = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    s3             = "http://localhost:4566"
    stepfunctions  = "http://localhost:4566"
    sts            = "http://localhost:4566"
  }
}

# Override table names for LocalStack (use existing local values)
locals {
  characters_table_name = "pnp-app-characters-local"
  history_table_name    = "pnp-app-history-local"
}
EOF

# Create terraform.tfvars for LocalStack
cat > terraform.tfvars << 'EOF'
# LocalStack variables override
backup_alert_email = "test@localstack.example.com"
EOF

print_success "Symlinked Terraform configuration created"

# Initialize Terraform
print_step "Initializing Terraform..."
terraform init > /dev/null 2>&1
print_success "Terraform initialized"

# Plan and apply
print_step "Planning Terraform deployment to LocalStack..."
echo "Planning only essential resources for contract testing..."

# Target only the resources needed for API schema testing
# Exclude Cognito (Pro feature), CloudWatch, and Step Functions that depend on them
# Focus on core Lambda + API Gateway + DynamoDB for schema validation
ESSENTIAL_TARGETS=(
    "module.update_level_lambda"
    "module.add_history_record_lambda"
    "aws_api_gateway_rest_api.pnp_rest_api"
    "aws_api_gateway_resource.characters"
    "aws_api_gateway_resource.character_id"
    "aws_api_gateway_resource.level"
    "aws_dynamodb_table.characters"
    "aws_dynamodb_table.characters_history"
    "aws_iam_role.lambda_exec_role"
    "aws_iam_role.api_gateway_role"
)

# Build target arguments
TARGET_ARGS=""
for target in "${ESSENTIAL_TARGETS[@]}"; do
    TARGET_ARGS="$TARGET_ARGS -target=$target"
done

print_step "Planning targeted deployment (only contract testing resources)..."
terraform plan $TARGET_ARGS -out=contract-test.tfplan

print_step "Applying Terraform configuration to LocalStack..."
echo "Deploying only essential resources for faster setup..."
terraform apply contract-test.tfplan

# Get API Gateway URL from Terraform state
print_step "Extracting API Gateway information..."
API_ID=$(terraform show -json | jq -r '.values.root_module.resources[] | select(.type == "aws_api_gateway_rest_api") | .values.id')

if [ -z "$API_ID" ] || [ "$API_ID" = "null" ]; then
    print_error "Failed to get API Gateway ID from Terraform state"
    exit 1
fi

API_ENDPOINT="http://localhost:4566/restapis/$API_ID/dev/_user_request_"
print_success "API Gateway ID: $API_ID"

# Create environment file for API schema testing
print_step "Updating API schema testing environment..."
cat > "$PROJECT_ROOT/frontend/.env.api-testing" << EOF
# API Schema Testing Environment - Generated by Terraform Symlinks + LocalStack
# Auto-generated on $(date)
LOCALSTACK_API_GATEWAY_ID=$API_ID
LOCALSTACK_ENDPOINT=http://localhost:4566
LOCALSTACK_API_BASE_URL=$API_ENDPOINT
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
EOF
print_success "Environment file updated: $PROJECT_ROOT/frontend/.env.api-testing"

cd "$PROJECT_ROOT"

echo ""
echo ">>> API Schema Testing Setup Complete! <<<"
echo "========================================="
echo ""
echo "### What was deployed (using original Terraform files):"
echo "   [+] Lambda functions for API schema testing"
echo "   [+] API Gateway resources and endpoints"
echo "   [+] DynamoDB tables for data storage"
echo "   [+] IAM roles and permissions"
echo "   [+] Core infrastructure for schema validation"
echo ""
echo "### Symlinked files (automatically sync with changes):"
echo "   * terraform/api-schema-testing/* -> terraform/*.tf"
echo ""
echo ">>> API Endpoint: $API_ENDPOINT
>>> Environment File: $PROJECT_ROOT/frontend/.env.contract-testing"
echo ""
echo "*** Run API Schema Tests:"
echo "   npm run api-schema-tests:run"
echo ""
echo "### Test manually:"
echo "   curl -X PATCH \"$API_ENDPOINT/characters/123e4567-e89b-12d3-a456-426614174000/level\" \\"
echo "        -H \"Content-Type: application/json\" \\"
echo "        -H \"Authorization: Bearer user-test-123456789012345678901234567890\" \\"
echo "        -d '{\"initialLevel\": 2}'"
echo ""
echo "### Clean up when done:"
echo "   npm run api-schema-tests:clean"
echo ""
echo "[+] API schema testing infrastructure deployed to LocalStack using symlinked files!"
echo "    Any changes to original terraform/*.tf files will automatically apply here!"
echo ""
echo "Next steps:"
echo "  1. Run tests: npm run api-schema-tests:run"
echo "  2. Clean up: npm run api-schema-tests:clean"