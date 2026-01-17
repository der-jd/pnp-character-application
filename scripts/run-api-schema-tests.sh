#!/bin/bash

# API Schema Validation Runner - LocalStack
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}==> $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Running API Schema Tests..."

# Check LocalStack
print_step "Checking LocalStack..."
if ! curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
    print_error "LocalStack not running. Run: npm run localstack:start"
    exit 1
fi
print_success "LocalStack running"

# Load environment
if [ ! -f "$FRONTEND_DIR/.env.api-testing" ]; then
    print_error "Environment not configured. Run: npm run api-schema-tests:setup"
    exit 1
fi
source "$FRONTEND_DIR/.env.api-testing"

# Validate deployment
AWS_CREDENTIALS="--region eu-central-1 --endpoint-url http://localhost:4566"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

if ! aws lambda get-function --function-name pnp-update-level $AWS_CREDENTIALS > /dev/null 2>&1; then
    print_error "Lambda not deployed. Run: npm run api-schema-tests:setup"
    exit 1
fi

if ! aws apigateway get-rest-api --rest-api-id "$LOCALSTACK_API_GATEWAY_ID" $AWS_CREDENTIALS > /dev/null 2>&1; then
    print_error "API Gateway not found. Run: npm run api-schema-tests:setup"
    exit 1
fi
print_success "Deployment validated"

# Check dependencies
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    print_step "Installing dependencies..."
    npm install
fi

# Set environment variables for the test
export LOCALSTACK_API_GATEWAY_ID
export LOCALSTACK_ENDPOINT
export LOCALSTACK_API_BASE_URL
export AWS_REGION
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

# Run the specific API schema validation test with environment variables
if INCLUDE_API_SCHEMA_TESTS=true LOCALSTACK_API_BASE_URL="$LOCALSTACK_API_BASE_URL" npx vitest run src/test/api-schema/level-up-api-schema-validation.test.ts --reporter=verbose; then
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
            if INCLUDE_API_SCHEMA_TESTS=true npx vitest run src/test/api-schema/ --reporter=verbose; then
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