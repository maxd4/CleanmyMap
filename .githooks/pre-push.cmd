@echo off
setlocal
cd /d "%~dp0.."
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "npm.cmd run prepush:guard"
exit /b %errorlevel%
