@echo off
echo ===================================
echo AIVlingual Project Setup (Windows)
echo ===================================
echo.

:: Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11 or higher
    exit /b 1
)

:: Check Node.js installation
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18 or higher
    exit /b 1
)

echo Setting up Backend...
cd backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing backend dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Creating .env file from example...
if not exist .env (
    copy .env.example .env
    echo IMPORTANT: Please edit backend\.env with your API keys!
)

cd ..

echo.
echo Setting up Frontend...
cd frontend
echo Installing frontend dependencies...
npm install

echo.
echo ===================================
echo Setup Complete!
echo ===================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your API keys:
echo    - GEMINI_API_KEY (from Google AI Studio)
echo    - AZURE_SPEECH_KEY (from Azure Portal)
echo    - NOTION_TOKEN (from Notion Integrations)
echo    - YOUTUBE_API_KEY (from Google Cloud Console)
echo.
echo 2. Start the backend:
echo    cd backend
echo    venv\Scripts\activate
echo    uvicorn app.main:app --reload
echo.
echo 3. Start the frontend (in a new terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
pause