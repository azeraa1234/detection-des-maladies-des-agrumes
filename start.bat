@echo off
setlocal

:: Get the directory of this script (project root)
set "ROOT=%~dp0"

echo ========================================
echo   Jumeau Agri-Scan - Starting...
echo ========================================

echo [1/2] Launching FastAPI Backend on port 8000...
start "FastAPI Backend" cmd /k "cd /d "%ROOT%backend" && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Launching React Frontend...
start "React Frontend" cmd /k "cd /d "%ROOT%" && npm run dev"

echo.
echo ========================================
echo   All services launched!
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: (Check the React Frontend terminal)
echo ========================================
