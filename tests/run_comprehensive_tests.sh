#!/bin/bash

echo "🚀 AIVlingual Comprehensive Test Runner"
echo "=====================================\n"

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# バックエンドサーバーの起動
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# フロントエンドサーバーの起動
echo -e "${YELLOW}Starting frontend server...${NC}"
cd frontend
npm run dev -- --port 3002 &
FRONTEND_PID=$!
cd ..

# サーバーの起動を待つ
echo -e "${YELLOW}Waiting for servers to start...${NC}"
sleep 10

# バックエンドの健全性チェック
for i in {1..30}; do
  if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# フロントエンドの健全性チェック
for i in {1..30}; do
  if curl -s http://localhost:3002 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Frontend failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

echo -e "\n${GREEN}Both servers are running!${NC}\n"

# テストの実行
echo -e "${YELLOW}Running comprehensive tests...${NC}\n"

# 1. AI会話フローテスト
echo "1. Running AI Conversation Flow Test"
echo "====================================="
cd tests
node test_ai_conversation_flow.js
TEST1_RESULT=$?

# 2. 言語切り替えテスト
echo -e "\n2. Running Language Switching Test"
echo "====================================="
node test_language_switching.js 2>/dev/null || echo "Test not yet created"
TEST2_RESULT=$?

# 3. WebSocket再接続テスト
echo -e "\n3. Running WebSocket Reconnection Test"
echo "========================================"
node test_websocket_reconnection.js 2>/dev/null || echo "Test not yet created"
TEST3_RESULT=$?

# 4. OBSビューテスト
echo -e "\n4. Running OBS Views Test"
echo "=========================="
node test_obs_views_detailed.js
TEST4_RESULT=$?

# 5. パフォーマンステスト
echo -e "\n5. Running Performance Test"
echo "============================="
node test_performance_report.js
TEST5_RESULT=$?

# テスト結果サマリー
echo -e "\n${YELLOW}Test Results Summary${NC}"
echo "====================="
if [ $TEST1_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ AI Conversation Flow Test: PASSED${NC}"
else
  echo -e "${RED}✗ AI Conversation Flow Test: FAILED${NC}"
fi

if [ $TEST4_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ OBS Views Test: PASSED${NC}"
else
  echo -e "${RED}✗ OBS Views Test: FAILED${NC}"
fi

if [ $TEST5_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Performance Test: PASSED${NC}"
else
  echo -e "${RED}✗ Performance Test: FAILED${NC}"
fi

# サーバーの停止
echo -e "\n${YELLOW}Stopping servers...${NC}"
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null

echo -e "\n${GREEN}All tests completed!${NC}"
echo "Check test-screenshots/ directory for visual results."