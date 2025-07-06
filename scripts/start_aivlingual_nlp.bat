@echo off
echo ====================================
echo   AIVlingual Starting with NLP...
echo ====================================
echo.

:: Start backend with conda environment
echo [1/3] Starting backend server with NLP support...
start /B cmd /c "cd /d %~dp0\..\backend && conda activate aivlingual_py311 && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a bit for backend to start
timeout /t 5 /nobreak > nul

:: Start frontend
echo [2/3] Starting frontend server...
start /B cmd /c "cd /d %~dp0\..\frontend && npm run dev"

:: Wait for services to be ready
timeout /t 5 /nobreak > nul

:: Open browser
echo [3/3] Opening browser...
start http://localhost:3003

echo.
echo ====================================
echo   AIVlingual is ready with NLP!
echo ====================================
echo.
echo Backend URL: http://localhost:8000
echo Frontend URL: http://localhost:3003
echo.
echo NLP Features:
echo - spaCy Japanese model: ja_core_news_sm
echo - Enhanced vocabulary extraction (30+ items)
echo - CEFR level assignment
echo.
echo Press any key to exit...
pause > nul

:: Kill processes when exiting
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul