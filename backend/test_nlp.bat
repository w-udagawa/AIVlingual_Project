@echo off
echo ========================================
echo AIVlingual NLP Test Suite
echo ========================================
echo.

REM Check if conda is available
where conda >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Activating conda environment...
    call conda activate aivlingual_py311
    if %ERRORLEVEL% NEQ 0 (
        echo Warning: Could not activate conda environment
        echo Continuing with current Python environment...
    ) else (
        echo Conda environment activated successfully
    )
) else (
    echo Conda not found, using current Python environment
)

echo.
echo Running NLP tests...
echo.

python test_nlp_improved.py

echo.
pause