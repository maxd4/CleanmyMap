@echo off
setlocal
cd /d "%~dp0apps\mobile"
if errorlevel 1 (
  echo [ERREUR] Impossible de se placer dans apps\mobile.
  pause
  exit /b 1
)

call npx expo run:android
if errorlevel 1 (
  echo [ERREUR] Le build natif Android a echoue.
  pause
  exit /b 1
)

endlocal
