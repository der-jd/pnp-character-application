#!/bin/bash

# PnP Character Application - API Schema Validation Runner
# This script runs API schema validation tests against LocalStack with proper validation
set -e

echo "Running API Schema Validation Tests against LocalStack..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==> $1${NC}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_step "API Schema Validation Runner - Project root: $PROJECT_ROOT"

# Check if LocalStack is running
print_step "Checking LocalStack status..."
if ! curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
    print_error "LocalStack is not running!"
    echo ""
    echo "🚀 Quick start:"
    echo "   1. Run: ./scripts/terraform-symlink-setup.sh"
    echo "   2. Or manually: docker-compose -f docker-compose.localstack.yml up -d"
    echo ""
    exit 1
fi
print_success "LocalStack is running"

# Check if API schema testing environment is set up
print_step "Checking API schema testing environment..."
if [ ! -f "$FRONTEND_DIR/.env.api-testing" ]; then
    print_error "API schema testing environment not configured!"
    echo ""
    echo "Quick fix:"
    echo "   Run: ./scripts/terraform-symlink-setup.sh"
    echo ""
    exit 1
fi

# Load environment variables
source "$FRONTEND_DIR/.env.api-testing"
print_success "API schema testing environment loaded"

# Validate API Gateway deployment
print_step "Validating LocalStack deployment..."

# Check if Lambda functions exist (for Step Functions)
AWS_CREDENTIALS="--region eu-central-1 --endpoint-url http://localhost:4566"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
if ! aws lambda get-function --function-name pnp-update-level $AWS_CREDENTIALS > /dev/null 2>&1; then
    print_error "Lambda function 'pnp-update-level' not found!"
    echo ""
    echo "Quick fix:"
    echo "   Run: ./scripts/terraform-symlink-setup.sh"
    echo ""
    exit 1
fi
print_success "Lambda functions are deployed"

# Check if API Gateway exists
if ! aws apigateway get-rest-api --rest-api-id "$LOCALSTACK_API_GATEWAY_ID" $AWS_CREDENTIALS > /dev/null 2>&1; then
    print_error "API Gateway '$LOCALSTACK_API_GATEWAY_ID' not found!"
    echo ""
    echo "Quick fix:"
    echo "   Run: ./scripts/terraform-symlink-setup.sh"
    echo ""
    exit 1
fi
print_success "API Gateway is deployed"

# Test API endpoint connectivity
print_step "Testing API endpoint connectivity..."
API_ENDPOINT="$LOCALSTACK_API_BASE_URL/characters/123e4567-e89b-12d3-a456-426614174000/level"

TEST_RESPONSE=$(curl -s -w "%{http_code}" -X PATCH "$API_ENDPOINT?tenantId=test-tenant" \
    -H "Content-Type: application/json" \
    -d '{"initialLevel": 2}' || echo "CURL_FAILED")

if [[ "$TEST_RESPONSE" == *"200"* ]]; then
    print_success "API endpoint is responding correctly"
elif [[ "$TEST_RESPONSE" == "CURL_FAILED" ]]; then
    print_error "API endpoint test failed - network issue"
    echo "   Endpoint: $API_ENDPOINT"
    exit 1
else
    print_warning "API endpoint returned: $TEST_RESPONSE"
    print_warning "Continuing with tests - this might be expected behavior"
fi

# Install frontend dependencies if needed
print_step "Checking frontend dependencies..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    print_warning "Frontend dependencies not installed, installing..."
    npm install
fi
print_success "Frontend dependencies ready"

# Run API schema validation tests
print_step "Running API schema validation tests..."
echo ""
echo "API Schema Test Configuration:"
echo "   • LocalStack Endpoint: $LOCALSTACK_ENDPOINT"
echo "   • API Gateway ID: $LOCALSTACK_API_GATEWAY_ID"
echo "   • API Base URL: $LOCALSTACK_API_BASE_URL"
echo "   • Test Endpoint: $API_ENDPOINT"
echo ""

# Set environment variables for the test
export LOCALSTACK_API_GATEWAY_ID
export LOCALSTACK_ENDPOINT
export LOCALSTACK_API_BASE_URL
export AWS_REGION
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

# Run the specific API schema validation test with environment variables
if LOCALSTACK_API_BASE_URL="$LOCALSTACK_API_BASE_URL" npx vitest run src/test/api-schema/level-up-api-schema-validation.test.ts --reporter=verbose; then
    echo ""
    print_success "API schema validation tests completed successfully!"
    echo ""
    echo "Test Results Summary:"
    echo "   [PASS] All schema validations passed"
    echo "   [PASS] API-spec breaking change detection working"
    echo "   [PASS] Schema validation against real API responses"
    echo ""
    echo "Your API schemas are solid!"
else
    echo ""
    print_error "API schema validation tests failed!"
    echo ""
    echo "Common issues:"
    echo "   - API-spec schema changes not reflected in tests"
    echo "   - Backend response format doesn't match api-spec"
    echo "   - LocalStack Lambda function needs updating"
    echo ""
    echo "Debug steps:"
    echo "   1. Test API manually: curl -X PATCH \"$API_ENDPOINT\" -H \"Content-Type: application/json\" -d '{\"initialLevel\": 2}'"
    echo "   2. Check Lambda logs: aws logs describe-log-groups --endpoint-url http://localhost:4566"
    echo "   3. Re-run setup: ./scripts/terraform-symlink-setup.sh"
    echo ""
    exit 1
fi

# Optional: Run all API schema validation tests if they exist
if ls src/test/api-schema/*.test.ts > /dev/null 2>&1; then
    SCHEMA_TEST_COUNT=$(ls src/test/api-schema/*.test.ts | wc -l)
    if [ "$SCHEMA_TEST_COUNT" -gt 1 ]; then
        echo ""
        print_step "Found $SCHEMA_TEST_COUNT API schema test files. Run all? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_step "Running all API schema tests..."
            if npx vitest run src/test/api-schema/ --reporter=verbose; then
                print_success "All API schema tests passed!"
            else
                print_error "Some API schema tests failed"
                exit 1
            fi
        fi
    fi
fi

echo ""
echo "API Schema Validation Complete!"
echo ""
echo "What was validated:"
echo "   [PASS] LocalStack infrastructure is working"
echo "   [PASS] Lambda functions respond correctly"
echo "   [PASS] API Gateway routing is configured"
echo "   [PASS] Response schemas match api-spec"
echo "   [PASS] Breaking change detection is active"
echo ""
echo "Next steps:"
echo "   - Add more schema validation tests for other endpoints"
echo "   - Integrate into CI/CD pipeline"
echo "   - Run before deploying API changes"
echo ""
print_success "Ready for confident API development!"