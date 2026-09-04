@echo off
setlocal
title CleanMyMap Launcher (ROLE ADMIN)

echo ==========================================
echo    CLEANMYMAP - LOCALHOST (ROLE ADMIN)
echo ==========================================
echo.

:: Le lanceur commun prépare l'environnement, choisit le port et ouvre le navigateur.
cd /d "%~dp0"
echo Lancement du serveur Next.js (bypass auth / role=admin)...
node "scripts\dev\launch-local-role.mjs" admin
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo [ERREUR] Le serveur local admin s'est arrêté avant ou pendant le démarrage.
)

pause
exit /b %EXIT_CODE%
