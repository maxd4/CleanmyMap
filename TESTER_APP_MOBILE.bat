@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 (
  echo [ERREUR] Impossible de se placer a la racine du depot.
  pause
  exit /b 1
)

call npm run check -w apps/mobile
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" (
  echo [OK] Les validations mobiles sont passees.
) else (
  echo [ERREUR] Les validations mobiles ont echoue avec le code %EXIT_CODE%.
)

pause
exit /b %EXIT_CODE%
