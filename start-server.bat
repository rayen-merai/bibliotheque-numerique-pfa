@echo off
REM ====================================
REM Bibliothèque Numérique - Start Server
REM ====================================

echo.
echo =====================================
echo  Demarrage du serveur...
echo =====================================
echo.

REM Change to project directory
cd /d "%~dp0"

REM Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js n'est pas installe ou non trouve dans PATH
    echo Veuillez installer Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installation des dependances npm...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Echec de l'installation npm
        pause
        exit /b 1
    )
)

REM Start the server
echo [INFO] Demarrage du serveur sur http://localhost:3000
echo.
call npm start

REM Pause to keep window open on error
if %ERRORLEVEL% NEQ 0 (
    pause
)

