@echo off
chcp 65001 > nul
title Instalador - Deadlock Toolkit

echo =======================================================
echo    🔮 INSTALADOR - DEADLOCK TOOLKIT PREMIERE PRO
echo =======================================================
echo.

set "SOURCE_DIR=%~dp0"
if exist "%~dp0com.deadlock.toolkit" (
    set "SOURCE_DIR=%~dp0com.deadlock.toolkit\"
)
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\com.deadlock.toolkit"

echo [1/3] Criando pasta de destino...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
if not exist "%TARGET_DIR%\CSXS" mkdir "%TARGET_DIR%\CSXS"
if not exist "%TARGET_DIR%\host" mkdir "%TARGET_DIR%\host"
if not exist "%TARGET_DIR%\js" mkdir "%TARGET_DIR%\js"
if not exist "%TARGET_DIR%\css" mkdir "%TARGET_DIR%\css"
if not exist "%TARGET_DIR%\assets" mkdir "%TARGET_DIR%\assets"

echo [2/3] Copiando arquivos da extensao...
xcopy "%SOURCE_DIR%CSXS" "%TARGET_DIR%\CSXS" /E /I /Y > nul
xcopy "%SOURCE_DIR%host" "%TARGET_DIR%\host" /E /I /Y > nul
xcopy "%SOURCE_DIR%js" "%TARGET_DIR%\js" /E /I /Y > nul
xcopy "%SOURCE_DIR%css" "%TARGET_DIR%\css" /E /I /Y > nul
xcopy "%SOURCE_DIR%assets" "%TARGET_DIR%\assets" /E /I /Y > nul
copy "%SOURCE_DIR%index.html" "%TARGET_DIR%\index.html" /Y > nul

echo [3/3] Ativando PlayerDebugMode no Registro do Windows (Premiere 2019 a 2026+)...
for /L %%V in (7,1,25) do (
    reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f > nul 2>&1
)

echo.
echo =======================================================
echo    ✅ EXTENSAO INSTALADA COM SUCESSO NO PREMIERE PRO!
echo =======================================================
echo.
echo Como abrir no Adobe Premiere Pro:
echo   1. Abra o Adobe Premiere Pro
echo   2. No menu superior: Janela > Extensoes > Deadlock Toolkit
echo      (ou Window > Extensions > Deadlock Toolkit)
echo.
pause
