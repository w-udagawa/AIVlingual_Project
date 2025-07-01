#!/bin/bash

echo "===================================="
echo "   AIVlingual 起動中..."
echo "===================================="
echo ""

# バックエンドの起動
echo "[1/3] バックエンドサーバーを起動しています..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 5

# フロントエンドの起動
echo "[2/3] フロントエンドサーバーを起動しています..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
sleep 5

# ブラウザを開く
echo "[3/3] ブラウザを開いています..."
echo ""
echo "===================================="
echo "   AIVlingual が起動しました！"
echo "===================================="
echo ""
echo "アプリケーションURL: http://localhost:3003"
echo ""
echo "終了するには Ctrl+C を押してください。"
echo ""

# OSに応じてブラウザを開く
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3003
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3003
fi

# プロセスの監視
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait