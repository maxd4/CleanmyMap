@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 (
  echo [ERREUR] Impossible de se placer a la racine du depot.
  pause
  exit /b 1
)

call npm run web -w apps/mobile
if errorlevel 1 (
  echo [ERREUR] Le lancement Expo Web a echoue.
  pause
  exit /b 1
)

endlocal
