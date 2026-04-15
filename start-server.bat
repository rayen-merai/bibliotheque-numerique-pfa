@echo off
SET "NODEJS_PATH=C:\Program Files\nodejs"
SET "PATH=%NODEJS_PATH%;%PATH%"
cd /d c:\xampp\htdocs\FINAL
"%NODEJS_PATH%\npm.cmd" install
"%NODEJS_PATH%\node.exe" server.js
pause
