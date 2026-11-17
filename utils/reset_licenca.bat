@echo off
chcp 65001 >nul
cls
title Reset de Licença Local - Deadlock Match Scanner
color 0C

echo ==============================================================================
echo           🔄 RESET DE LICENÇA LOCAL - DEADLOCK MATCH SCANNER
echo ==============================================================================
echo.

node "%~dp0reset_licenca.js"

pause
