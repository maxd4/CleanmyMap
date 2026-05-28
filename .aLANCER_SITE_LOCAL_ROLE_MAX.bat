@echo off
setlocal
title CleanMyMap Launcher (ROLE MAX)

echo ==========================================
echo    CLEANMYMAP - LOCALHOST (ROLE MAX)
echo ==========================================
echo.

:: Aller au dossier du site
cd /d "%~dp0apps\web"

:: Verifier le .env.local
if not exist .env.local (
    echo [ATTENTION] Fichier .env.local manquant.
    echo Tentative de recuperation des variables depuis Vercel...
    node scripts\vercel-sync-env.mjs --file=.env.local --environments=development
)

:: Lancer le serveur dans une nouvelle fenetre avec bypass auth + role max
echo Lancement du serveur Next.js (bypass auth / role=max)...
start "Next.js Dev Server (max)" cmd /k "set CMM_DEV_AUTH_BYPASS=1&& set CMM_DEV_AUTH_BYPASS_ROLE=max&& set CMM_DEV_AUTH_BYPASS_USER_ID=dev-max&& set CMM_DEV_AUTH_BYPASS_DISPLAY_NAME=Dev Max&& set CMM_DEV_AUTH_BYPASS_USERNAME=dev-max&& npm run dev"

:: Attendre un peu que le serveur demarre
echo Patience... ouverture du site dans 5 secondes...
timeout /t 5 /nobreak > nul

:: Ouvrir le navigateur
start http://localhost:3000

echo.
echo ==========================================
echo    SERVEUR LANCE SUR http://localhost:3000
echo    ROLE SIMULE: max
echo ==========================================
echo.
pause

