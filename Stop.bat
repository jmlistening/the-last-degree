@echo off
setlocal
cd /d "%~dp0"
python scripts\launch.py --stop
if errorlevel 1 pause
