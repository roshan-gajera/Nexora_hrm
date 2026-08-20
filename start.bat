@echo off
echo ===================================================
echo Starting Nexora HRM (Backend + Frontend)
echo ===================================================

echo [1/2] Launching Django Backend Server (PostgreSQL)...
start "Nexora HRM Backend" cmd /k "cd /d %~dp0Backend\Nexora_hrm && python manage.py runserver 8000"

echo [2/2] Launching React Frontend Dev Server...
start "Nexora HRM Frontend" cmd /k "cd /d %~dp0frontend\Nexora_hrm && npm run dev"

echo.
echo ===================================================
echo Both servers are launching!
echo Backend:  http://127.0.0.1:8000/api/
echo Frontend: http://localhost:5173/
echo ===================================================
