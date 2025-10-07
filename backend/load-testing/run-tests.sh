#!/bin/bash

# Okuz AI Load Testing Suite
# This script runs various load tests to ensure the system can handle millions of users

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print header
print_header() {
    echo ""
    print_color $CYAN "=========================================="
    print_color $CYAN "$1"
    print_color $CYAN "=========================================="
    echo ""
}

# Function to print success
print_success() {
    print_color $GREEN "✅ $1"
}

# Function to print error
print_error() {
    print_color $RED "❌ $1"
}

# Function to print warning
print_warning() {
    print_color $YELLOW "⚠️  $1"
}

# Function to print info
print_info() {
    print_color $BLUE "ℹ️  $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_info "Installing npm packages..."
    npm install
    
    if ! command_exists artillery; then
        print_info "Installing Artillery globally..."
        npm install -g artillery
    fi
    
    if ! command_exists k6; then
        print_warning "k6 is not installed. Please install k6 first."
        print_info "Installation instructions: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to run smoke test
run_smoke_test() {
    print_header "Running Smoke Test"
    
    print_info "Smoke test validates basic functionality with minimal load..."
    
    artillery run artillery-config.yml --config smoke-test.yml
    
    print_success "Smoke test completed"
}

# Function to run load test
run_load_test() {
    print_header "Running Load Test"
    
    print_info "Load test validates system performance under expected load..."
    
    artillery run artillery-config.yml --config load-test.yml
    
    print_success "Load test completed"
}

# Function to run stress test
run_stress_test() {
    print_header "Running Stress Test"
    
    print_info "Stress test validates system behavior under extreme load..."
    
    artillery run artillery-config.yml --config stress-test.yml
    
    print_success "Stress test completed"
}

# Function to run spike test
run_spike_test() {
    print_header "Running Spike Test"
    
    print_info "Spike test validates system behavior under sudden load spikes..."
    
    artillery run artillery-config.yml --config spike-test.yml
    
    print_success "Spike test completed"
}

# Function to run volume test
run_volume_test() {
    print_header "Running Volume Test"
    
    print_info "Volume test validates system behavior under high data volume..."
    
    artillery run artillery-config.yml --config volume-test.yml
    
    print_success "Volume test completed"
}

# Function to run soak test
run_soak_test() {
    print_header "Running Soak Test"
    
    print_info "Soak test validates system behavior under sustained load..."
    
    artillery run artillery-config.yml --config soak-test.yml
    
    print_success "Soak test completed"
}

# Function to run performance test
run_performance_test() {
    print_header "Running Performance Test"
    
    print_info "Performance test validates system performance metrics..."
    
    artillery run artillery-config.yml --config performance-test.yml
    
    print_success "Performance test completed"
}

# Function to run scalability test
run_scalability_test() {
    print_header "Running Scalability Test"
    
    print_info "Scalability test validates system scalability..."
    
    artillery run artillery-config.yml --config scalability-test.yml
    
    print_success "Scalability test completed"
}

# Function to run reliability test
run_reliability_test() {
    print_header "Running Reliability Test"
    
    print_info "Reliability test validates system reliability..."
    
    artillery run artillery-config.yml --config reliability-test.yml
    
    print_success "Reliability test completed"
}

# Function to run security test
run_security_test() {
    print_header "Running Security Test"
    
    print_info "Security test validates system security..."
    
    artillery run artillery-config.yml --config security-test.yml
    
    print_success "Security test completed"
}

# Function to run compatibility test
run_compatibility_test() {
    print_header "Running Compatibility Test"
    
    print_info "Compatibility test validates system compatibility..."
    
    artillery run artillery-config.yml --config compatibility-test.yml
    
    print_success "Compatibility test completed"
}

# Function to run usability test
run_usability_test() {
    print_header "Running Usability Test"
    
    print_info "Usability test validates system usability..."
    
    artillery run artillery-config.yml --config usability-test.yml
    
    print_success "Usability test completed"
}

# Function to run accessibility test
run_accessibility_test() {
    print_header "Running Accessibility Test"
    
    print_info "Accessibility test validates system accessibility..."
    
    artillery run artillery-config.yml --config accessibility-test.yml
    
    print_success "Accessibility test completed"
}

# Function to run maintainability test
run_maintainability_test() {
    print_header "Running Maintainability Test"
    
    print_info "Maintainability test validates system maintainability..."
    
    artillery run artillery-config.yml --config maintainability-test.yml
    
    print_success "Maintainability test completed"
}

# Function to run portability test
run_portability_test() {
    print_header "Running Portability Test"
    
    print_info "Portability test validates system portability..."
    
    artillery run artillery-config.yml --config portability-test.yml
    
    print_success "Portability test completed"
}

# Function to run efficiency test
run_efficiency_test() {
    print_header "Running Efficiency Test"
    
    print_info "Efficiency test validates system efficiency..."
    
    artillery run artillery-config.yml --config efficiency-test.yml
    
    print_success "Efficiency test completed"
}

# Function to run effectiveness test
run_effectiveness_test() {
    print_header "Running Effectiveness Test"
    
    print_info "Effectiveness test validates system effectiveness..."
    
    artillery run artillery-config.yml --config effectiveness-test.yml
    
    print_success "Effectiveness test completed"
}

# Function to run satisfaction test
run_satisfaction_test() {
    print_header "Running Satisfaction Test"
    
    print_info "Satisfaction test validates system satisfaction..."
    
    artillery run artillery-config.yml --config satisfaction-test.yml
    
    print_success "Satisfaction test completed"
}

# Function to run learnability test
run_learnability_test() {
    print_header "Running Learnability Test"
    
    print_info "Learnability test validates system learnability..."
    
    artillery run artillery-config.yml --config learnability-test.yml
    
    print_success "Learnability test completed"
}

# Function to run memorability test
run_memorability_test() {
    print_header "Running Memorability Test"
    
    print_info "Memorability test validates system memorability..."
    
    artillery run artillery-config.yml --config memorability-test.yml
    
    print_success "Memorability test completed"
}

# Function to run error prevention test
run_error_prevention_test() {
    print_header "Running Error Prevention Test"
    
    print_info "Error prevention test validates system error prevention..."
    
    artillery run artillery-config.yml --config error-prevention-test.yml
    
    print_success "Error prevention test completed"
}

# Function to run error recovery test
run_error_recovery_test() {
    print_header "Running Error Recovery Test"
    
    print_info "Error recovery test validates system error recovery..."
    
    artillery run artillery-config.yml --config error-recovery-test.yml
    
    print_success "Error recovery test completed"
}

# Function to run error tolerance test
run_error_tolerance_test() {
    print_header "Running Error Tolerance Test"
    
    print_info "Error tolerance test validates system error tolerance..."
    
    artillery run artillery-config.yml --config error-tolerance-test.yml
    
    print_success "Error tolerance test completed"
}

# Function to run error handling test
run_error_handling_test() {
    print_header "Running Error Handling Test"
    
    print_info "Error handling test validates system error handling..."
    
    artillery run artillery-config.yml --config error-handling-test.yml
    
    print_success "Error handling test completed"
}

# Function to run error reporting test
run_error_reporting_test() {
    print_header "Running Error Reporting Test"
    
    print_info "Error reporting test validates system error reporting..."
    
    artillery run artillery-config.yml --config error-reporting-test.yml
    
    print_success "Error reporting test completed"
}

# Function to run error logging test
run_error_logging_test() {
    print_header "Running Error Logging Test"
    
    print_info "Error logging test validates system error logging..."
    
    artillery run artillery-config.yml --config error-logging-test.yml
    
    print_success "Error logging test completed"
}

# Function to run error monitoring test
run_error_monitoring_test() {
    print_header "Running Error Monitoring Test"
    
    print_info "Error monitoring test validates system error monitoring..."
    
    artillery run artillery-config.yml --config error-monitoring-test.yml
    
    print_success "Error monitoring test completed"
}

# Function to run error alerting test
run_error_alerting_test() {
    print_header "Running Error Alerting Test"
    
    print_info "Error alerting test validates system error alerting..."
    
    artillery run artillery-config.yml --config error-alerting-test.yml
    
    print_success "Error alerting test completed"
}

# Function to run error notification test
run_error_notification_test() {
    print_header "Running Error Notification Test"
    
    print_info "Error notification test validates system error notification..."
    
    artillery run artillery-config.yml --config error-notification-test.yml
    
    print_success "Error notification test completed"
}

# Function to run error escalation test
run_error_escalation_test() {
    print_header "Running Error Escalation Test"
    
    print_info "Error escalation test validates system error escalation..."
    
    artillery run artillery-config.yml --config error-escalation-test.yml
    
    print_success "Error escalation test completed"
}

# Function to run error resolution test
run_error_resolution_test() {
    print_header "Running Error Resolution Test"
    
    print_info "Error resolution test validates system error resolution..."
    
    artillery run artillery-config.yml --config error-resolution-test.yml
    
    print_success "Error resolution test completed"
}

# Function to run all tests
run_all_tests() {
    print_header "Running All Tests"
    
    print_info "Running comprehensive test suite..."
    
    run_smoke_test
    run_load_test
    run_stress_test
    run_spike_test
    run_volume_test
    run_soak_test
    run_performance_test
    run_scalability_test
    run_reliability_test
    run_security_test
    run_compatibility_test
    run_usability_test
    run_accessibility_test
    run_maintainability_test
    run_portability_test
    run_efficiency_test
    run_effectiveness_test
    run_satisfaction_test
    run_learnability_test
    run_memorability_test
    run_error_prevention_test
    run_error_recovery_test
    run_error_tolerance_test
    run_error_handling_test
    run_error_reporting_test
    run_error_logging_test
    run_error_monitoring_test
    run_error_alerting_test
    run_error_notification_test
    run_error_escalation_test
    run_error_resolution_test
    
    print_success "All tests completed successfully"
}

# Function to run k6 tests
run_k6_tests() {
    print_header "Running k6 Tests"
    
    print_info "Running k6 load tests..."
    
    k6 run k6-script.js
    
    print_success "k6 tests completed"
}

# Function to run k6 cloud tests
run_k6_cloud_tests() {
    print_header "Running k6 Cloud Tests"
    
    print_info "Running k6 cloud load tests..."
    
    k6 cloud k6-script.js
    
    print_success "k6 cloud tests completed"
}

# Function to generate report
generate_report() {
    print_header "Generating Test Report"
    
    print_info "Generating comprehensive test report..."
    
    # Generate Artillery report
    artillery run artillery-config.yml --output report.json
    artillery report report.json
    
    # Generate k6 report
    k6 run k6-script.js --out json=report-k6.json
    
    print_success "Test report generated successfully"
}

# Function to show help
show_help() {
    print_header "Okuz AI Load Testing Suite"
    
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  install                 Install dependencies"
    echo "  smoke                   Run smoke test"
    echo "  load                    Run load test"
    echo "  stress                  Run stress test"
    echo "  spike                   Run spike test"
    echo "  volume                  Run volume test"
    echo "  soak                    Run soak test"
    echo "  performance             Run performance test"
    echo "  scalability            Run scalability test"
    echo "  reliability             Run reliability test"
    echo "  security                Run security test"
    echo "  compatibility           Run compatibility test"
    echo "  usability               Run usability test"
    echo "  accessibility           Run accessibility test"
    echo "  maintainability         Run maintainability test"
    echo "  portability             Run portability test"
    echo "  efficiency              Run efficiency test"
    echo "  effectiveness           Run effectiveness test"
    echo "  satisfaction            Run satisfaction test"
    echo "  learnability            Run learnability test"
    echo "  memorability            Run memorability test"
    echo "  error-prevention        Run error prevention test"
    echo "  error-recovery          Run error recovery test"
    echo "  error-tolerance         Run error tolerance test"
    echo "  error-handling          Run error handling test"
    echo "  error-reporting          Run error reporting test"
    echo "  error-logging            Run error logging test"
    echo "  error-monitoring         Run error monitoring test"
    echo "  error-alerting           Run error alerting test"
    echo "  error-notification       Run error notification test"
    echo "  error-escalation         Run error escalation test"
    echo "  error-resolution         Run error resolution test"
    echo "  all                      Run all tests"
    echo "  k6                       Run k6 tests"
    echo "  k6-cloud                 Run k6 cloud tests"
    echo "  report                   Generate test report"
    echo "  help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install              Install dependencies"
    echo "  $0 smoke                Run smoke test"
    echo "  $0 load                 Run load test"
    echo "  $0 stress               Run stress test"
    echo "  $0 all                  Run all tests"
    echo "  $0 k6                   Run k6 tests"
    echo "  $0 report               Generate test report"
    echo ""
}

# Main function
main() {
    case "${1:-help}" in
        install)
            install_dependencies
            ;;
        smoke)
            run_smoke_test
            ;;
        load)
            run_load_test
            ;;
        stress)
            run_stress_test
            ;;
        spike)
            run_spike_test
            ;;
        volume)
            run_volume_test
            ;;
        soak)
            run_soak_test
            ;;
        performance)
            run_performance_test
            ;;
        scalability)
            run_scalability_test
            ;;
        reliability)
            run_reliability_test
            ;;
        security)
            run_security_test
            ;;
        compatibility)
            run_compatibility_test
            ;;
        usability)
            run_usability_test
            ;;
        accessibility)
            run_accessibility_test
            ;;
        maintainability)
            run_maintainability_test
            ;;
        portability)
            run_portability_test
            ;;
        efficiency)
            run_efficiency_test
            ;;
        effectiveness)
            run_effectiveness_test
            ;;
        satisfaction)
            run_satisfaction_test
            ;;
        learnability)
            run_learnability_test
            ;;
        memorability)
            run_memorability_test
            ;;
        error-prevention)
            run_error_prevention_test
            ;;
        error-recovery)
            run_error_recovery_test
            ;;
        error-tolerance)
            run_error_tolerance_test
            ;;
        error-handling)
            run_error_handling_test
            ;;
        error-reporting)
            run_error_reporting_test
            ;;
        error-logging)
            run_error_logging_test
            ;;
        error-monitoring)
            run_error_monitoring_test
            ;;
        error-alerting)
            run_error_alerting_test
            ;;
        error-notification)
            run_error_notification_test
            ;;
        error-escalation)
            run_error_escalation_test
            ;;
        error-resolution)
            run_error_resolution_test
            ;;
        all)
            run_all_tests
            ;;
        k6)
            run_k6_tests
            ;;
        k6-cloud)
            run_k6_cloud_tests
            ;;
        report)
            generate_report
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
