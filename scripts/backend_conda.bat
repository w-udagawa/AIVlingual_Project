@echo off
echo Starting backend with conda environment...
cd /d "%~dp0\..\backend"
call conda activate aivlingual_py311
echo Activated conda environment: aivlingual_py311
echo Starting uvicorn server...
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause