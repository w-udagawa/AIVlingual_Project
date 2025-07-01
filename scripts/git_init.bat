@echo off
echo ====================================
echo   Git Initial Setup for AIVlingual
echo ====================================
echo.

cd /d C:\ClaudeWork\AIVlingual_Project

echo [1/4] Initializing Git repository...
git init

echo.
echo [2/4] Adding all files...
git add .

echo.
echo [3/4] Creating initial commit...
git commit -m "Initial commit: Organized project structure for GitHub"

echo.
echo [4/4] Setup complete!
echo.
echo Next steps:
echo 1. Create a repository on GitHub named 'AIVlingual_Project'
echo 2. Run the following commands:
echo    git remote add origin https://github.com/YOUR_USERNAME/AIVlingual_Project.git
echo    git branch -M main
echo    git push -u origin main
echo.
pause