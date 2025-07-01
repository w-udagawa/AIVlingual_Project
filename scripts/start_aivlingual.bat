@echo off
chcp 65001 > nul
echo ====================================
echo   AIVlingual Starting...
echo ====================================
echo.

:: Start backend
echo [1/3] Starting backend server...
cd backend
start /B cmd /c "venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 5 /nobreak > nul

:: Start frontend
echo [2/3] Starting frontend server...
cd ..\frontend
start /B cmd /c "npm run dev"
timeout /t 5 /nobreak > nul

:: Open browser
echo [3/3] Opening browser...
echo.
echo ====================================
echo   AIVlingual is ready!
echo ====================================
echo.
echo Application URL: http://localhost:3002
echo.
echo To exit, close this window.
echo.

:: Auto open browser
timeout /t 3 /nobreak > nul
start http://localhost:3002

:: Keep window open
pause > nul