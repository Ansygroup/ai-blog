@echo off
cd /d "%~dp0"
echo Mission Control — AI Agent Fleet Dashboard
echo ============================================
echo.
echo Checking for GITHUB_API_TOKEN...
if "%GITHUB_API_TOKEN%"=="" (
    echo ⚠  GITHUB_API_TOKEN is not set!
    echo.
    echo    Set it first:
    echo    set GITHUB_API_TOKEN=ghp_your_token_here
    echo    python main.py
    pause
    exit /b 1
)
echo ✓ Token found
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Launching Mission Control...
python main.py
pause
