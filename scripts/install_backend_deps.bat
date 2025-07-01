@echo off
echo ====================================
echo   Installing AIVlingual Backend Dependencies
echo ====================================
echo.

cd /d C:\ClaudeWork\AIVlingual_Project\backend

echo Installing required Python packages...
echo.

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo ====================================
echo   Installation Complete!
echo ====================================
echo.
echo Now you can start the backend server with:
echo python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
pause
