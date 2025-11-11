#!/bin/bash

# Distributed Notification System - System Validation Script
# This script validates that all services are running and healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        print_success "PASSED"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        print_error "FAILED"
        return 1
    fi
}

# Main validation
print_header "Distributed Notification System - Validation"

print_info "Starting system validation..."
echo ""

# Check if services are running
print_header "1. Service Health Checks"

run_test "API Gateway (Port 3000)" "curl -sf http://localhost:3000/health"
run_test "User Service (Port 3001)" "curl -sf http://localhost:3001/health"
run_test "Template Service (Port 3002)" "curl -sf http://localhost:3002/health"

# Worker services don't expose HTTP endpoints, check if containers are running
print_info "Checking worker services (via Docker)..."
run_test "Email Service Container" "docker ps | grep -q email_service"
run_test "Push Service Container" "docker ps | grep -q push_service"

# Check infrastructure
print_header "2. Infrastructure Health Checks"

print_info "Checking infrastructure services (via Docker)..."
run_test "PostgreSQL Container" "docker ps | grep -q postgres"
run_test "Redis Container" "docker ps | grep -q redis"
run_test "RabbitMQ Container" "docker ps | grep -q rabbitmq"
run_test "RabbitMQ Management UI" "curl -sf http://localhost:15672"

# Check API documentation
print_header "3. API Documentation Checks"

run_test "API Gateway Swagger UI" "curl -sf http://localhost:3000/api-docs/"
run_test "User Service Swagger UI" "curl -sf http://localhost:3001/api-docs/"
run_test "Template Service Swagger UI" "curl -sf http://localhost:3002/api-docs/"

# Check API endpoints
print_header "4. API Endpoint Checks"

run_test "API Gateway - Health Endpoint" "curl -sf http://localhost:3000/health"
run_test "User Service - List Users" "curl -sf http://localhost:3001/api/v1/users"
run_test "Template Service - List Templates" "curl -sf http://localhost:3002/api/v1/templates"

# Check documentation files
print_header "5. Documentation File Checks"

run_test "README.md exists" "test -f README.md"
run_test "SYSTEM_DESIGN.md exists" "test -f SYSTEM_DESIGN.md"
run_test "API_DOCUMENTATION.md exists" "test -f API_DOCUMENTATION.md"
run_test "CI_CD_DOCUMENTATION.md exists" "test -f CI_CD_DOCUMENTATION.md"
run_test "PERFORMANCE_REPORT.md exists" "test -f PERFORMANCE_REPORT.md"
run_test "PROJECT_STATUS.md exists" "test -f PROJECT_STATUS.md"
run_test "SUBMISSION_CHECKLIST.md exists" "test -f SUBMISSION_CHECKLIST.md"
run_test "PRESENTATION_GUIDE.md exists" "test -f PRESENTATION_GUIDE.md"
run_test "PROJECT_SUMMARY.md exists" "test -f PROJECT_SUMMARY.md"

# Check Docker configuration
print_header "6. Docker Configuration Checks"

run_test "docker-compose.yml exists" "test -f docker-compose.yml"
run_test "API Gateway Dockerfile" "test -f api_gateway_service/Dockerfile"
run_test "User Service Dockerfile" "test -f user_service/Dockerfile"
run_test "Template Service Dockerfile" "test -f template_service/Dockerfile"
run_test "Email Service Dockerfile" "test -f email_service/Dockerfile"
run_test "Push Service Dockerfile" "test -f push_service/Dockerfile"

# Check CI/CD workflows
print_header "7. CI/CD Workflow Checks"

run_test ".github/workflows directory exists" "test -d .github/workflows"
run_test "ci-cd.yml workflow exists" "test -f .github/workflows/ci-cd.yml"
run_test "test.yml workflow exists" "test -f .github/workflows/test.yml"
run_test "docker-publish.yml workflow exists" "test -f .github/workflows/docker-publish.yml"

# Check performance tests
print_header "8. Performance Test Checks"

run_test "performance_tests directory exists" "test -d performance_tests"
run_test "test_notification_throughput.js exists" "test -f performance_tests/test_notification_throughput.js"
run_test "test_api_response_times.js exists" "test -f performance_tests/test_api_response_times.js"
run_test "run_all_tests.sh exists" "test -f performance_tests/run_all_tests.sh"
run_test "run_all_tests.sh is executable" "test -x performance_tests/run_all_tests.sh"

# Summary
print_header "Validation Summary"

echo ""
echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All validation tests passed! ✅"
    echo ""
    print_info "Your system is ready for submission! 🚀"
    echo ""
    echo "Next steps:"
    echo "1. Review SUBMISSION_CHECKLIST.md"
    echo "2. Review PRESENTATION_GUIDE.md"
    echo "3. Run performance tests: cd performance_tests && ./run_all_tests.sh"
    echo "4. Prepare your presentation"
    echo ""
    exit 0
else
    print_error "Some validation tests failed. Please fix the issues before submission."
    echo ""
    print_info "Common issues:"
    echo "- Services not running: Run 'docker-compose up -d'"
    echo "- Ports already in use: Check for conflicting services"
    echo "- Missing files: Ensure all files are committed to git"
    echo ""
    exit 1
fi

