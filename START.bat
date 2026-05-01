@echo off
echo Starting Mukurweini Hospital Stores App...
echo.

cd /d "%~dp0backend"
start "Mukurweini Hospital Stores App API" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

cd /d "%~dp0frontend"
start "Mukurweini Hospital Stores App Frontend" cmd /k "npx vite"

echo.
echo ============================================
echo  Mukurweini Hospital Stores App is starting up!
echo  Open http://localhost:5173 in your browser
echo  Login: admin / admin123
echo ============================================
echo.
pause
