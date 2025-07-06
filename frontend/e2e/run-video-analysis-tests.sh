#!/bin/bash

# E2E Test Runner for Video Analysis Features
# This script runs the comprehensive video analysis tests

echo "🎥 AIVlingual Video Analysis E2E Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if servers are running
check_server() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running"
        return 1
    fi
}

echo "Checking prerequisites..."
echo ""

# Check backend
if ! check_server "http://localhost:8000/health" "Backend server"; then
    echo -e "${YELLOW}Starting backend server...${NC}"
    cd ../../../backend
    python main.py &
    BACKEND_PID=$!
    sleep 5
fi

# Check frontend
if ! check_server "http://localhost:3003" "Frontend server"; then
    echo -e "${YELLOW}Starting frontend server...${NC}"
    cd ../../../frontend
    npm run dev &
    FRONTEND_PID=$!
    sleep 10
fi

echo ""
echo "Running E2E tests..."
echo ""

# Create test directories
mkdir -p test-screenshots
mkdir -p test-results

# Run the comprehensive test suite
echo "📋 Running video-analysis-comprehensive tests..."
npx playwright test video-analysis-comprehensive.spec.ts \
    --project=chromium \
    --reporter=html \
    --output=test-results \
    --screenshot=on \
    --video=retain-on-failure

TEST_EXIT_CODE=$?

# Generate test report
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    echo "Opening test report..."
    npx playwright show-report
fi

# Run individual test scenarios if requested
if [ "$1" == "--all" ]; then
    echo ""
    echo "Running additional test scenarios..."
    
    # Run performance tests
    echo "📊 Running performance tests..."
    npx playwright test video-analysis-comprehensive.spec.ts \
        --grep "パフォーマンステスト" \
        --project=chromium
    
    # Run batch processing tests
    echo "⚡ Running batch processing tests..."
    npx playwright test video-analysis-comprehensive.spec.ts \
        --grep "バッチ処理機能" \
        --project=chromium
fi

# Cleanup if we started servers
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo "Stopping backend server..."
    kill $BACKEND_PID
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo "Stopping frontend server..."
    kill $FRONTEND_PID
fi

echo ""
echo "Test summary:"
echo "============="
echo "Screenshots saved to: test-screenshots/"
echo "Test results saved to: test-results/"
echo "HTML report available at: playwright-report/index.html"
echo ""

exit $TEST_EXIT_CODE