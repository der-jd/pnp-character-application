#!/bin/bash

# Stop LocalStack Script
# Stops LocalStack container but keeps data for next run

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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
print_step "Stopping LocalStack..."

# Stop LocalStack container
if docker ps | grep -q localstack; then
    docker compose -f "$PROJECT_ROOT/docker-compose.localstack.yml" stop 2>/dev/null
    print_success "LocalStack stopped (data preserved)"
else
    echo "LocalStack is not running"
fi

echo ""
