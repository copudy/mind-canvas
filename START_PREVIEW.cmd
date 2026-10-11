@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. See README.md.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm.cmd run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173/ after the Local URL appears.
echo Keep this window open. If port 4173 is already in use, open the existing preview.
call npm.cmd run preview -- --port 4173 --strictPort
pause
