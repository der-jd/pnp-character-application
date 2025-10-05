#!/bin/bash

# PnP Character Application - API Schema Validation Runner (Multi-Environment)
# This script runs API schema validation tests against LocalStack OR real backend
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

# Parse command line arguments
ENVIRONMENT="localstack"  # Default to localstack
VERBOSE=false

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env=ENV        Environment to test against (localstack|prod)"
    echo "  --verbose        Enable verbose output"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                        # Test against LocalStack (default)"
    echo "  $0 --env=localstack       # Test against LocalStack explicitly" 
    echo "  $0 --env=prod --verbose   # Test against prod with verbose output"
    echo ""
    echo "Environment Details:"
    echo "  localstack - Fast local testing with mocked AWS services"
    echo "  prod       - Test against production backend (data drift detection)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*)
            ENVIRONMENT="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment parameter
case $ENVIRONMENT in
    localstack|prod)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: localstack, prod"
        exit 1
        ;;
esac

echo "API Schema Validation Tests - Environment: $ENVIRONMENT"
echo "========================================================="

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_step "API Schema Validation Runner - Environment: $ENVIRONMENT"
print_step "Project root: $PROJECT_ROOT"

# Function to setup LocalStack environment
setup_localstack_env() {
    print_step "Setting up LocalStack environment..."
    
    # Check if LocalStack is running
    if ! curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
        print_error "LocalStack is not running!"
        echo ""
        echo "Quick start:"
        echo "   1. Run: ./scripts/terraform-symlink-setup.sh"
        echo "   2. Or manually: docker-compose -f docker-compose.localstack.yml up -d"
        echo ""
        exit 1
    fi
    print_success "LocalStack is running"

    # Check if API schema testing environment is set up
    if [ ! -f "$FRONTEND_DIR/.env.api-testing" ]; then
        print_error "API schema testing environment not configured!"
        echo ""
        echo "Quick fix:"
        echo "   Run: ./scripts/terraform-symlink-setup.sh"
        echo ""
        exit 1
    fi

    # Load LocalStack environment variables
    source "$FRONTEND_DIR/.env.api-testing"
    export API_BASE_URL="$LOCALSTACK_API_BASE_URL"
    export API_ENVIRONMENT="localstack"
    
    print_success "LocalStack environment configured"
    print_info "API Base URL: $API_BASE_URL"
}



# Function to setup production environment
setup_prod_env() {
    print_step "Setting up production environment..."
    
    print_warning "Running against PRODUCTION backend!"
    print_warning "This will test against real production data and APIs."
    
    # Safety confirmation for production
    echo ""
    read -p "Are you sure you want to run API schema tests against PRODUCTION? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Production testing cancelled."
        exit 0
    fi
    
    # Configure production environment from terraform_output or .env.production
    TERRAFORM_OUTPUT_FILE="$PROJECT_ROOT/terraform/terraform_output"
    
    if [ -f "$TERRAFORM_OUTPUT_FILE" ]; then
        # Use CircleCI terraform_output (production deployment)
        source "$TERRAFORM_OUTPUT_FILE"
        export API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL"
        export AWS_REGION="$NEXT_PUBLIC_COGNITO_REGION"
        export TEST_CHARACTER_ID="${CHARACTER_TEST:-}"
        export TEST_USER_ID="${USER_TEST:-}"
        export AUTH_TOKEN="${CIRCLECI_OIDC_TOKEN:-}"
        export API_ENVIRONMENT="production"
        
        print_success "Production environment configured from terraform_output"
        return 0
    fi
    
    # Fallback to .env.production file
    if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        print_error "Production environment file not found: $FRONTEND_DIR/.env.production"
        echo ""
        echo "Either:"
        echo "1. Run 'terraform output' in the terraform/ directory to generate outputs, OR"
        echo "2. Create .env.production with the following variables:"
        echo "   PROD_API_BASE_URL=https://your-prod-api-gateway-url"
        echo "   PROD_API_KEY=your-prod-api-key"
        echo "   PROD_AUTH_TOKEN=your-prod-auth-token"
        echo ""
        echo "Terraform outputs (if available):"
        echo "   api_gateway_url - Production API Gateway URL"
        echo "   aws_region - AWS region"
        echo "   cognito_user_pool_id - Cognito User Pool ID"
        echo "   cognito_app_client_id - Cognito App Client ID"
        echo ""
        exit 1
    fi

    # Load production environment variables from .env.production
    print_step "Loading production configuration from .env.production..."
    source "$FRONTEND_DIR/.env.production"
    export API_BASE_URL="$PROD_API_BASE_URL"
    export API_KEY="$PROD_API_KEY"
    export AUTH_TOKEN="$PROD_AUTH_TOKEN"
    export API_ENVIRONMENT="production"
    
    print_success "Production environment configured from .env.production"
    print_info "API Base URL: $API_BASE_URL"
}

# Setup environment based on selection
case $ENVIRONMENT in
    localstack)
        setup_localstack_env
        ;;
    prod)
        setup_prod_env
        ;;
esac

# Test API endpoint connectivity
print_step "Testing API endpoint connectivity..."
if [ "$ENVIRONMENT" = "localstack" ]; then
    # LocalStack-specific connectivity test
    API_ENDPOINT="$API_BASE_URL/characters/123e4567-e89b-12d3-a456-426614174000/level"
    TEST_RESPONSE=$(curl -s -w "%{http_code}" -X PATCH "$API_ENDPOINT?tenantId=test-tenant" \
        -H "Content-Type: application/json" \
        -d '{"initialLevel": 2}' || echo "CURL_FAILED")
    
    if [[ "$TEST_RESPONSE" == *"404"* ]]; then
        print_warning "API endpoint returned: $(echo "$TEST_RESPONSE" | tail -c 4)"
        print_warning "Continuing with tests - this might be expected behavior"
    elif [[ "$TEST_RESPONSE" == "CURL_FAILED" ]]; then
        print_error "Failed to connect to API endpoint"
        exit 1
    else
        print_success "API endpoint is accessible"
    fi
else
    # Real backend connectivity test (simpler health check)
    HEALTH_ENDPOINT="$API_BASE_URL/health"
    if curl -s --fail "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        print_success "API endpoint is accessible"
    else
        print_warning "Health check failed, but continuing with schema tests"
        print_info "Some APIs may not have health endpoints"
    fi
fi

# Check frontend dependencies
print_step "Checking frontend dependencies..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    print_error "Frontend dependencies not installed!"
    echo "Run: npm install"
    exit 1
fi
print_success "Frontend dependencies ready"

# Export environment variables for tests
export API_ENVIRONMENT
export API_ENVIRONMENT_TYPE="$ENVIRONMENT"
if [ "$VERBOSE" = true ]; then
    export VITEST_VERBOSE=true
fi

# Run API schema validation tests
print_step "Running API schema validation tests..."
echo ""
echo "API Schema Test Configuration:"
echo "   • Environment: $ENVIRONMENT"
echo "   • API Base URL: $API_BASE_URL"
echo "   • Test Framework: Vitest"
echo "   • Schema Library: Zod + api-spec"

if [ "$ENVIRONMENT" = "localstack" ]; then
    echo "   • LocalStack Gateway ID: $LOCALSTACK_API_GATEWAY_ID"
    echo "   • Test Endpoint: $API_BASE_URL/characters/{id}/level"
else
    echo "   • Real Backend: $API_BASE_URL"
    echo "   • Authentication: ${AUTH_TOKEN:0:10}..."
fi

echo ""

# Run tests with environment-specific configuration
if [ "$VERBOSE" = true ]; then
    REPORTER="--reporter=verbose"
else
    REPORTER="--reporter=default"
fi

# Run specific test files based on environment
if [ "$ENVIRONMENT" = "localstack" ]; then
    # Run all schema tests for LocalStack (full test suite)
    TEST_PATTERN="src/test/api-schema/*.test.ts"
else
    # Run only non-destructive schema tests for real backends
    TEST_PATTERN="src/test/api-schema/*-schema-validation.test.ts"
    print_warning "Running read-only schema validation tests against real backend"
fi

if npx vitest run $TEST_PATTERN $REPORTER; then
    echo ""
    print_success "API schema validation tests completed successfully!"
    echo ""
    echo "Test Results Summary:"
    echo "   [PASS] All schema validations passed"
    echo "   [PASS] API-spec breaking change detection working"
    echo "   [PASS] Schema validation against $ENVIRONMENT backend"
    echo ""
    
    if [ "$ENVIRONMENT" = "localstack" ]; then
        echo "✨ Your API schemas are solid against LocalStack!"
        echo ""
        echo "Next steps:"
        echo "   • Run against staging: $0 --env=staging"
        echo "   • Run against prod: $0 --env=prod"
    else
        echo "🚀 Your API schemas are compatible with $ENVIRONMENT backend!"
        echo ""
        echo "This confirms:"
        echo "   • No breaking changes in production data"
        echo "   • Frontend schemas match backend reality"
        echo "   • API compatibility maintained"
    fi
else
    echo ""
    print_error "API schema validation tests failed!"
    echo ""
    if [ "$ENVIRONMENT" = "localstack" ]; then
        echo "Common LocalStack issues:"
        echo "   - API-spec schema changes not reflected in tests"
        echo "   - Backend response format doesn't match api-spec" 
        echo "   - LocalStack Lambda function needs updating"
        echo ""
        echo "Debug steps:"
        echo "   1. Re-run setup: ./scripts/terraform-symlink-setup.sh"
        echo "   2. Check Lambda logs: aws logs describe-log-groups --endpoint-url http://localhost:4566"
    else
        echo "Common $ENVIRONMENT backend issues:"
        echo "   - Production data structure differs from api-spec"
        echo "   - Backend API has been updated without frontend sync"
        echo "   -Older data formats exist in $ENVIRONMENT"
        echo ""
        echo "Debug steps:"
        echo "   1. Check API documentation for recent changes"
        echo "   2. Compare LocalStack vs $ENVIRONMENT test results"
        echo "   3. Review backend deployment logs"
    fi
    echo ""
    exit 1
fi

echo ""
print_info "API Schema Validation Complete for $ENVIRONMENT!"

if [ "$ENVIRONMENT" = "localstack" ]; then
    echo ""
    echo "🎯 Recommended workflow:"
    echo "   1. ✅ LocalStack tests passed"
    echo "   2. 🔄 Run against staging: $0 --env=staging"
    echo "   3. 🚀 Run against prod: $0 --env=prod"
    echo ""
    echo "This ensures compatibility across all environments!"
fi