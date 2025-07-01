@echo off
echo ====================================
echo   Push to GitHub - AIVlingual
echo ====================================
echo.

set /p username="Enter your GitHub username: "

cd /d C:\ClaudeWork\AIVlingual_Project

echo.
echo Adding GitHub remote...
git remote add origin https://github.com/%username%/AIVlingual_Project.git

echo.
echo Setting main branch...
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo ====================================
echo   Push complete!
echo ====================================
echo.
echo Your repository is now available at:
echo https://github.com/%username%/AIVlingual_Project
echo.
pause