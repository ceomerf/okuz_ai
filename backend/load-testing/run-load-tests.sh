#!/bin/bash

# Load Testing Script for Okuz AI Backend
# This script runs comprehensive load tests using k6

set -e

echo "🚀 Starting Okuz AI Backend Load Tests"
echo "======================================"

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3000"}
RESULTS_DIR="./load-testing/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p $RESULTS_DIR

echo "📊 Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Results Directory: $RESULTS_DIR"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Function to run test and save results
run_test() {
    local test_name=$1
    local test_file=$2
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"
    
    echo "🧪 Running $test_name..."
    echo "  Test file: $test_file"
    echo "  Output: $output_file"
    
    k6 run --out json=$output_file $test_file
    
    if [ $? -eq 0 ]; then
        echo "  ✅ $test_name completed successfully"
    else
        echo "  ❌ $test_name failed"
        exit 1
    fi
    echo ""
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Please install k6 first:"
    echo "   brew install k6  # macOS"
    echo "   or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if backend is running
echo "🔍 Checking if backend is running at $BASE_URL..."
if ! curl -s -f "$BASE_URL/health" > /dev/null; then
    echo "❌ Backend is not running at $BASE_URL"
    echo "   Please start the backend first: npm run start:dev"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# 1. Stress Test (1000 concurrent users)
echo "🔥 PHASE 1: STRESS TEST"
echo "Testing 1000 concurrent users for login and plan creation..."
run_test "stress_test" "k6-stress-test.js"

# 2. Spike Test (5000 concurrent requests to smart tools)
echo "⚡ PHASE 2: SPIKE TEST"
echo "Testing 5000 concurrent requests to smart tools endpoints..."
run_test "spike_test" "k6-spike-test.js"

# 3. Soak Test (8 hours sustained load)
echo "⏰ PHASE 3: SOAK TEST"
echo "Testing 8 hours of sustained load (50 concurrent users)..."
echo "⚠️  WARNING: This test will run for 8 hours!"
read -p "Do you want to continue with the soak test? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_test "soak_test" "k6-soak-test.js"
else
    echo "⏭️  Skipping soak test"
fi

# Generate summary report
echo "📋 GENERATING TEST SUMMARY"
echo "=========================="

cat > "$RESULTS_DIR/test_summary_${TIMESTAMP}.md" << EOF
# Load Test Results Summary

**Test Date:** $(date)
**Base URL:** $BASE_URL

## Test Phases

### 1. Stress Test
- **Duration:** ~9 minutes
- **Peak Users:** 1000
- **Test Scenario:** User registration, login, plan creation, smart tools usage
- **Results:** Check \`stress_test_${TIMESTAMP}.json\`

### 2. Spike Test  
- **Duration:** ~1 minute
- **Peak Requests:** 5000 concurrent
- **Test Scenario:** Smart tools endpoints under extreme load
- **Results:** Check \`spike_test_${TIMESTAMP}.json\`

### 3. Soak Test
- **Duration:** 8 hours
- **Sustained Load:** 50 concurrent users
- **Test Scenario:** Long-term stability and memory leak detection
- **Results:** Check \`soak_test_${TIMESTAMP}.json\`

## Key Metrics to Monitor

- **Response Time (p95):** Should be < 2-3 seconds
- **Error Rate:** Should be < 5%
- **Rate Limit Effectiveness:** Should handle spikes gracefully
- **Memory Usage:** Should remain stable over time
- **Database Connections:** Should not exceed pool limits

## Next Steps

1. Analyze JSON results for detailed metrics
2. Check for any performance bottlenecks
3. Verify rate limiting is working correctly
4. Monitor memory usage trends in soak test
5. Update system configuration based on findings

EOF

echo "✅ Load testing completed!"
echo "📁 Results saved in: $RESULTS_DIR"
echo "📋 Summary report: $RESULTS_DIR/test_summary_${TIMESTAMP}.md"
echo ""
echo "🔍 To analyze results:"
echo "   - Check JSON files for detailed metrics"
echo "   - Look for response time trends"
echo "   - Verify error rates are within acceptable limits"
echo "   - Monitor memory usage patterns"
