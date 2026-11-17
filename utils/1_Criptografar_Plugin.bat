@echo off
chcp 65001 >nul
cls
title 1. Criptografar Plugin - Deadlock Toolkit
color 0B

echo ==============================================================================
echo             🔒 CRIPTOGRAFANDO E GERANDO DIST/DEADLOCK_TOOLKIT
echo ==============================================================================
echo.
node "%~dp0criptografar_plugin.js"
echo.
pause
