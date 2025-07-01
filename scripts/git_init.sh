#!/bin/bash
# Git初期化スクリプト for WSL

echo "===================================="
echo "   Git Initial Setup for AIVlingual"
echo "===================================="
echo

# プロジェクトディレクトリに移動
cd /mnt/c/ClaudeWork/AIVlingual_Project

# Gitがインストールされているか確認
if ! command -v git &> /dev/null; then
    echo "Error: Git is not installed"
    echo "Please install git: sudo apt update && sudo apt install git"
    exit 1
fi

echo "[1/4] Initializing Git repository..."
git init

echo
echo "[2/4] Configuring Git (if needed)..."
# ユーザー情報が設定されていない場合の処理
if [ -z "$(git config user.name)" ]; then
    read -p "Enter your name for Git commits: " name
    git config user.name "$name"
fi

if [ -z "$(git config user.email)" ]; then
    read -p "Enter your email for Git commits: " email
    git config user.email "$email"
fi

echo
echo "[3/4] Adding all files..."
git add .

echo
echo "[4/4] Creating initial commit..."
git commit -m "Initial commit: Organized project structure for GitHub"

echo
echo "===================================="
echo "   Git initialization complete!"
echo "===================================="
echo
echo "Next steps:"
echo "1. Create a repository on GitHub named 'AIVlingual_Project'"
echo "2. Run: ./scripts/git_push_to_github.sh"
echo