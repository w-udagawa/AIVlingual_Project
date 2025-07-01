@echo off
echo ====================================
echo   Installing AIVlingual Dependencies
echo ====================================
echo.

:: Install backend dependencies
echo Installing Python packages...
cd /d C:\ClaudeWork\AIVlingual_Project\backend
pip install -r requirements.txt
echo.

:: Install frontend dependencies
echo Installing Node packages...
cd /d C:\ClaudeWork\AIVlingual_Project\frontend
npm install
echo.

echo ====================================
echo   Installation Complete!
echo ====================================
echo.
echo You can now run start_aivlingual_no_venv.bat
echo.
pause
