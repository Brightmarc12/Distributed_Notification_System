#!/bin/bash

###############################################################################
# Performance Test Suite Runner
# 
# Runs all performance tests and generates a comprehensive report.
# 
# Usage:
#   ./run_all_tests.sh
# 
# Requirements:
#   - All services must be running (docker-compose up)
#   - Node.js 18+ installed
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="$SCRIPT_DIR/performance_report_$(date +%Y%m%d_%H%M%S).txt"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo "================================================================================"
    echo -e "${BLUE}$1${NC}"
    echo "================================================================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if services are running
check_services() {
    print_header "Checking Services"
    
    local services=("http://localhost:3000/health" "http://localhost:3001/health" "http://localhost:3002/health")
    local service_names=("API Gateway" "User Service" "Template Service")
    local all_healthy=true
    
    for i in "${!services[@]}"; do
        local url="${services[$i]}"
        local name="${service_names[$i]}"
        
        echo -n "Checking $name... "
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_error "$name is not responding"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = false ]; then
        print_error "Some services are not running. Please start all services with 'docker-compose up -d'"
        exit 1
    fi
    
    print_success "All services are healthy"
}

# Run a single test
run_test() {
    local test_name="$1"
    local test_script="$2"
    
    print_header "Running: $test_name"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if node "$SCRIPT_DIR/$test_script" 2>&1 | tee -a "$REPORT_FILE"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        print_success "$test_name PASSED"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        print_error "$test_name FAILED"
        return 1
    fi
}

# Generate summary report
generate_summary() {
    print_header "Test Summary"
    
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "ALL TESTS PASSED! 🎉"
        echo ""
        echo "Your system meets all performance requirements:"
        echo "  ✅ Throughput: >= 1000 notifications/minute"
        echo "  ✅ Response Time: < 100ms average"
        echo "  ✅ Success Rate: >= 99.5%"
    else
        print_warning "SOME TESTS FAILED"
        echo ""
        echo "Please review the test results above and optimize your system."
    fi
    
    echo ""
    echo "Full report saved to: $REPORT_FILE"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    # Print banner
    echo ""
    echo "================================================================================"
    echo "🔔 Distributed Notification System - Performance Test Suite"
    echo "================================================================================"
    echo ""
    echo "Start Time: $(date)"
    echo "Report File: $REPORT_FILE"
    echo ""
    
    # Initialize report file
    {
        echo "================================================================================"
        echo "Distributed Notification System - Performance Test Report"
        echo "================================================================================"
        echo ""
        echo "Date: $(date)"
        echo "System: $(uname -a)"
        echo ""
    } > "$REPORT_FILE"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ to run performance tests."
        exit 1
    fi
    
    print_info "Node.js version: $(node --version)"
    
    # Check if services are running
    check_services
    
    # Wait a moment for services to stabilize
    print_info "Waiting 5 seconds for services to stabilize..."
    sleep 5
    
    # Run tests
    echo ""
    print_header "Starting Performance Tests"
    
    # Test 1: API Response Times
    run_test "API Response Times" "test_api_response_times.js"
    
    # Wait between tests
    print_info "Waiting 10 seconds before next test..."
    sleep 10
    
    # Test 2: Notification Throughput
    run_test "Notification Throughput" "test_notification_throughput.js"
    
    # Generate summary
    echo ""
    generate_summary
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"

