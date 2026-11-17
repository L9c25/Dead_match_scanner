@echo off
chcp 65001 >nul
cls
title 2. Gerar Arquivos ZIP de Release - Deadlock Toolkit
color 0A

node "%~dp0gerar_zips.js" %*
echo.
pause
