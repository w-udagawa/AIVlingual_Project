#!/bin/bash

# E2Eテスト実行スクリプト
# 使用方法: ./e2e/run-tests.sh [options]

set -e

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# デフォルト値
HEADED=false
DEBUG=false
UI=false
SPECIFIC_TEST=""

# コマンドライン引数を解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --ui)
            UI=true
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--headed] [--debug] [--ui] [--test <test-file>]"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}=== AIVlingual E2E Tests ===${NC}"

# バックエンドが起動しているか確認
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend server is not running!${NC}"
    echo "Please start the backend server first:"
    echo "  cd backend && python main.py"
    exit 1
fi

echo -e "${GREEN}✅ Backend server is running${NC}"

# フロントエンドが起動しているか確認
if ! curl -s http://localhost:3003 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend dev server is not running${NC}"
    echo "Starting frontend dev server..."
    npm run dev &
    FRONTEND_PID=$!
    
    # フロントエンドの起動を待つ
    echo "Waiting for frontend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3003 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend server started${NC}"
            break
        fi
        sleep 1
    done
else
    echo -e "${GREEN}✅ Frontend server is running${NC}"
fi

# Playwrightがインストールされているか確認
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing Playwright...${NC}"
    npm install
    npx playwright install --with-deps
fi

# テストコマンドを構築
TEST_CMD="npx playwright test"

if [ "$HEADED" = true ]; then
    TEST_CMD="$TEST_CMD --headed"
fi

if [ "$DEBUG" = true ]; then
    TEST_CMD="$TEST_CMD --debug"
fi

if [ "$UI" = true ]; then
    TEST_CMD="$TEST_CMD --ui"
fi

if [ -n "$SPECIFIC_TEST" ]; then
    TEST_CMD="$TEST_CMD $SPECIFIC_TEST"
fi

# テストを実行
echo -e "${YELLOW}Running E2E tests...${NC}"
echo "Command: $TEST_CMD"

$TEST_CMD

# クリーンアップ
if [ -n "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}Stopping frontend server...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
fi

echo -e "${GREEN}✅ E2E tests completed!${NC}"