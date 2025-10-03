#!/bin/bash

# API Schema Testing Cleanup Script
# Stops LocalStack and removes all testing artifacts

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

echo "*** API Schema Testing Cleanup ***"
echo "=================================="

# Stop LocalStack container
print_step "Stopping LocalStack container..."
if docker ps | grep -q localstack; then
    docker compose -f "$PROJECT_ROOT/docker-compose.localstack.yml" down
    print_success "LocalStack container stopped"
else
    print_warning "LocalStack container not running"
fi

# Remove testing directory
if [ -d "$SCHEMA_TESTING_DIR" ]; then
    print_step "Removing API schema testing directory..."
    rm -rf "$SCHEMA_TESTING_DIR"
    print_success "Testing directory removed"
else
    print_warning "Testing directory not found"
fi

# Remove environment file
if [ -f "$PROJECT_ROOT/frontend/.env.api-testing" ]; then
    print_step "Removing environment file..."
    rm -f "$PROJECT_ROOT/frontend/.env.api-testing"
    print_success "Environment file removed"
else
    print_warning "Environment file not found"
fi

echo ""
print_success "API schema testing environment cleaned up!"
echo ""
print_step "You can now run 'npm run api-schema-tests:setup' to recreate the testing environment"