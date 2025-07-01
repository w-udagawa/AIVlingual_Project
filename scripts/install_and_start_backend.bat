@echo off
echo ====================================
echo   Installing remaining dependencies
echo ====================================
echo.

cd /d C:\ClaudeWork\AIVlingual_Project\backend

echo Installing core dependencies...
python -m pip install pydantic-settings python-dotenv
echo.

echo Installing AI dependencies...
python -m pip install google-generativeai
echo.

echo Installing database and networking...
python -m pip install aiosqlite websockets python-multipart httpx aiofiles
echo.

echo ====================================
echo   Installation Complete!
echo ====================================
echo.
echo Starting AIVlingual backend...
echo.
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
