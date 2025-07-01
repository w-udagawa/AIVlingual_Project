#!/bin/bash

echo "==================================="
echo "AIVlingual Project Setup (Linux/Mac)"
echo "==================================="
echo

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.11 or higher"
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js 18 or higher"
    exit 1
fi

echo "Setting up Backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
echo
echo "Creating .env file from example..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "IMPORTANT: Please edit backend/.env with your API keys!"
fi

cd ..

echo
echo "Setting up Frontend..."
cd frontend
echo "Installing frontend dependencies..."
npm install

echo
echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo
echo "Next steps:"
echo "1. Edit backend/.env with your API keys:"
echo "   - GEMINI_API_KEY (from Google AI Studio)"
echo "   - AZURE_SPEECH_KEY (from Azure Portal)"
echo "   - NOTION_TOKEN (from Notion Integrations)"
echo "   - YOUTUBE_API_KEY (from Google Cloud Console)"
echo
echo "2. Start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo
echo "3. Start the frontend (in a new terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo
echo "4. Open http://localhost:3000 in your browser"
echo