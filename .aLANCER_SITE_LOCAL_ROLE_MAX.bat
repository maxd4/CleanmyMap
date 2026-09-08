@echo off
setlocal
chcp 65001 >nul
title CleanMyMap Launcher (ROLE MAX)

echo ==========================================
echo    CLEANMYMAP - LOCALHOST (ROLE MAX)
echo ==========================================
echo.

:: Le lanceur commun prépare l'environnement, choisit le port et ouvre le navigateur.
cd /d "%~dp0"
echo Lancement du serveur Next.js (bypass auth / role=max)...
node "scripts\dev\launch-local-role.mjs" max
set "EXIT_CODE=%ERRORLEVEL%"

if "%EXIT_CODE%"=="0" goto :NORMAL_EXIT
if "%EXIT_CODE%"=="130" goto :INTENTIONAL_STOP
if "%EXIT_CODE%"=="143" goto :INTENTIONAL_STOP
if "%EXIT_CODE%"=="-1073741510" goto :INTENTIONAL_STOP
if "%EXIT_CODE%"=="3221225786" goto :INTENTIONAL_STOP
echo [ERREUR] Le serveur local s'est arrêté de manière inattendue (code %EXIT_CODE%).
goto :DONE

:NORMAL_EXIT
echo [INFO] Serveur local terminé normalement.
goto :DONE

:INTENTIONAL_STOP
echo [INFO] Serveur local arrêté.

:DONE

pause
exit /b %EXIT_CODE%
