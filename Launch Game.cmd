@echo off
setlocal
cd /d "%~dp0"
if not exist dist\index.html (
  echo Build the game with pnpm build first.
  pause
  exit /b 1
)
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 is required for this local static-file launcher.
  pause
  exit /b 1
)
python scripts\launch.py
if errorlevel 1 pause
