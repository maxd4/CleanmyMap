@echo off
setlocal
title CleanMyMap Launcher

echo ==========================================
echo    CLEANMYMAP - LANCEMENT LOCAL
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

:: Lancer le serveur dans une nouvelle fenetre
echo Lancement du serveur Next.js...
start "Next.js Dev Server" cmd /k "npm run dev"

:: Attendre un peu que le serveur demarre
echo Patience... ouverture de la carte dans 5 secondes...
timeout /t 5 /nobreak > nul

:: Ouvrir le navigateur
start http://localhost:3000

echo.
echo ==========================================
echo    SERVEUR LANCE SUR http://localhost:3000
echo ==========================================
echo.
pause
