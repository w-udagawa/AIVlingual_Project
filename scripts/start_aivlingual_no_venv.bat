@echo off
chcp 65001 > nul
echo ====================================
echo   AIVlingual Starting (No venv)...
echo ====================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Start backend without venv
echo [1/3] Starting backend server...
cd /d C:\ClaudeWork\AIVlingual_Project\backend
start cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 5 /nobreak > nul

:: Start frontend
echo [2/3] Starting frontend server...
cd /d C:\ClaudeWork\AIVlingual_Project\frontend
start cmd /k "npm run dev"
timeout /t 5 /nobreak > nul

:: Open browser
echo [3/3] Opening browser...
echo.
echo ====================================
echo   AIVlingual is ready!
echo ====================================
echo.
echo Backend URL: http://localhost:8000
echo Frontend URL: http://localhost:3003
echo.

:: Auto open browser
timeout /t 3 /nobreak > nul
start http://localhost:3003

echo Press any key to exit...
pause > nul
