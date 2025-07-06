# PowerShell script to start backend with conda
Write-Host "Starting AIVlingual backend with NLP support..." -ForegroundColor Green

# Set Miniconda path
$condaPath = "$env:USERPROFILE\miniconda3\Scripts\conda.exe"

if (Test-Path $condaPath) {
    Write-Host "Found conda at: $condaPath" -ForegroundColor Yellow
    
    # Activate environment and start server
    & $condaPath activate aivlingual_py311
    cd "$PSScriptRoot\..\backend"
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} else {
    Write-Host "Conda not found. Starting with venv (limited NLP support)..." -ForegroundColor Yellow
    cd "$PSScriptRoot\..\backend"
    
    if (Test-Path "venv\Scripts\activate.ps1") {
        & venv\Scripts\activate.ps1
    }
    
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}