#!/bin/bash
# GitHubへプッシュするスクリプト for WSL

echo "===================================="
echo "   Push to GitHub - AIVlingual"
echo "===================================="
echo

# プロジェクトディレクトリに移動
cd /mnt/c/ClaudeWork/AIVlingual_Project

# GitHubユーザー名を入力
read -p "Enter your GitHub username: " username

echo
echo "Adding GitHub remote..."
git remote add origin https://github.com/$username/AIVlingual_Project.git

# すでにoriginが存在する場合は更新
if [ $? -ne 0 ]; then
    echo "Remote 'origin' already exists. Updating URL..."
    git remote set-url origin https://github.com/$username/AIVlingual_Project.git
fi

echo
echo "Setting main branch..."
git branch -M main

echo
echo "Pushing to GitHub..."
echo "Note: You may be prompted for your GitHub credentials or Personal Access Token"
git push -u origin main

if [ $? -eq 0 ]; then
    echo
    echo "===================================="
    echo "   Push complete!"
    echo "===================================="
    echo
    echo "Your repository is now available at:"
    echo "https://github.com/$username/AIVlingual_Project"
else
    echo
    echo "Push failed. Common issues:"
    echo "1. Make sure you've created the repository on GitHub"
    echo "2. Check your GitHub credentials or Personal Access Token"
    echo "3. Ensure the repository name matches 'AIVlingual_Project'"
fi