#!/bin/bash

# API Schema Testing Cleanup Script
# Stops LocalStack and removes all testing artifacts

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_TESTING_DIR="$PROJECT_ROOT/terraform/api-schema-testing"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▸ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo ""
print_step "Cleaning up LocalStack testing environment..."

# Stop LocalStack containers and remove volumes
if docker ps -a | grep -q localstack; then
    docker compose -f "$PROJECT_ROOT/docker-compose.localstack.yml" down --volumes 2>/dev/null || true
    print_success "Stopped containers and removed volumes"
fi

# Remove Terraform testing directory
if [ -d "$SCHEMA_TESTING_DIR" ]; then
    rm -rf "$SCHEMA_TESTING_DIR"
    print_success "Removed Terraform testing directory"
fi

# Remove environment file
if [ -f "$PROJECT_ROOT/frontend/.env.api-testing" ]; then
    rm -f "$PROJECT_ROOT/frontend/.env.api-testing"
    print_success "Removed environment file"
fi

# Clean up any orphaned Docker volumes
docker volume prune -f > /dev/null 2>&1 || true

echo ""
print_success "Cleanup complete!"
echo ""