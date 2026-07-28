@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

echo Starting Punch Logic admin preview...
echo Leave this window open while using the admin page.
start "" /min cmd /c "ping 127.0.0.1 -n 3 >nul & explorer http://127.0.0.1:4173/admin.html"
node server.js

echo.
echo Preview stopped.
pause
