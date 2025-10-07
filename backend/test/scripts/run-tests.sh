#!/bin/bash

# Test runner script for comprehensive testing
set -e

echo "🧪 Starting comprehensive test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    print_status "Checking environment variables..."
    
    if [ -z "$TEST_DATABASE_URL" ]; then
        export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/okuz_ai_test"
        print_warning "TEST_DATABASE_URL not set, using default: $TEST_DATABASE_URL"
    fi
    
    if [ -z "$TEST_REDIS_URL" ]; then
        export TEST_REDIS_URL="redis://localhost:6380"
        print_warning "TEST_REDIS_URL not set, using default: $TEST_REDIS_URL"
    fi
    
    if [ -z "$NODE_ENV" ]; then
        export NODE_ENV="test"
        print_warning "NODE_ENV not set, using: test"
    fi
    
    print_success "Environment variables configured"
}

# Setup test database
setup_test_db() {
    print_status "Setting up test database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
        print_error "PostgreSQL test database is not running on port 5433"
        print_status "Please start PostgreSQL test database:"
        print_status "  docker run --name postgres-test -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=okuz_ai_test -p 5433:5432 -d postgres:13"
        exit 1
    fi
    
    # Check if Redis is running
    if ! redis-cli -h localhost -p 6380 ping >/dev/null 2>&1; then
        print_error "Redis test instance is not running on port 6380"
        print_status "Please start Redis test instance:"
        print_status "  docker run --name redis-test -p 6380:6379 -d redis:7-alpine"
        exit 1
    fi
    
    print_success "Test database setup completed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    
    print_success "Database migrations completed"
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    npm run test:unit -- --coverage --detectOpenHandles --forceExit
    
    print_success "Unit tests completed"
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    npm run test:integration -- --coverage --detectOpenHandles --forceExit
    
    print_success "Integration tests completed"
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    npm run test:e2e -- --coverage --detectOpenHandles --forceExit
    
    print_success "E2E tests completed"
}

# Run all tests
run_all_tests() {
    print_status "Running all tests..."
    
    npm run test -- --coverage --detectOpenHandles --forceExit
    
    print_success "All tests completed"
}

# Check coverage
check_coverage() {
    print_status "Checking test coverage..."
    
    # Run tests with coverage
    npm run test:coverage
    
    # Check if coverage meets threshold
    COVERAGE=$(npm run test:coverage 2>&1 | grep -o 'All files[^|]*|[^|]*|[^|]*|[^|]*|[^|]*' | tail -1 | awk '{print $NF}' | sed 's/%//')
    
    if [ -z "$COVERAGE" ]; then
        print_error "Could not determine coverage percentage"
        exit 1
    fi
    
    print_status "Current coverage: ${COVERAGE}%"
    
    if [ "$COVERAGE" -lt 98 ]; then
        print_error "Coverage threshold not met: ${COVERAGE}% < 98%"
        exit 1
    fi
    
    print_success "Coverage threshold met: ${COVERAGE}% >= 98%"
}

# Generate coverage report
generate_coverage_report() {
    print_status "Generating coverage report..."
    
    # Generate HTML coverage report
    npm run test:coverage -- --coverageReporters=html
    
    # Generate LCOV coverage report
    npm run test:coverage -- --coverageReporters=lcov
    
    print_success "Coverage report generated in coverage/ directory"
}

# Clean up test data
cleanup() {
    print_status "Cleaning up test data..."
    
    # Clean up test database
    if [ -n "$TEST_DATABASE_URL" ]; then
        npx prisma db push --force-reset --schema=./prisma/schema.prisma
    fi
    
    # Clean up Redis
    if [ -n "$TEST_REDIS_URL" ]; then
        redis-cli -h localhost -p 6380 FLUSHALL
    fi
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    local command=${1:-"all"}
    
    case $command in
        "env")
            check_env
            ;;
        "setup")
            check_env
            setup_test_db
            run_migrations
            ;;
        "unit")
            check_env
            run_unit_tests
            ;;
        "integration")
            check_env
            run_integration_tests
            ;;
        "e2e")
            check_env
            run_e2e_tests
            ;;
        "all")
            check_env
            setup_test_db
            run_migrations
            run_all_tests
            check_coverage
            generate_coverage_report
            ;;
        "coverage")
            check_env
            run_all_tests
            check_coverage
            generate_coverage_report
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  env         - Check environment variables"
            echo "  setup       - Setup test database and run migrations"
            echo "  unit        - Run unit tests"
            echo "  integration - Run integration tests"
            echo "  e2e         - Run E2E tests"
            echo "  all         - Run all tests with coverage check"
            echo "  coverage    - Check coverage and generate report"
            echo "  cleanup     - Clean up test data"
            echo "  help        - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 setup     # Setup test environment"
            echo "  $0 all       # Run all tests with coverage"
            echo "  $0 coverage  # Check coverage only"
            echo "  $0 cleanup   # Clean up test data"
            ;;
        *)
            print_error "Unknown command: $command"
            echo "Use '$0 help' for available commands"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
