/**
 * criptografar_plugin.js
 * Criptografa/ofusca o código fonte do plugin e coloca em dist\Deadlock_Toolkit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT_DIR = path.resolve(__dirname, '..');
const PLUGIN_SRC_DIR = path.join(ROOT_DIR, 'plugin');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TOOLKIT_DIR = path.join(DIST_DIR, 'Deadlock_Toolkit');
const PLUGIN_DIR = path.join(TOOLKIT_DIR, 'com.deadlock.toolkit');

console.log('======================================================');
console.log('🔒 CRIPTOGRAFADOR DE CÓDIGO - DEADLOCK TOOLKIT');
console.log('======================================================\n');

// 1. Limpa e recria a pasta dist\Deadlock_Toolkit
if (fs.existsSync(TOOLKIT_DIR)) {
    fs.rmSync(TOOLKIT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PLUGIN_DIR, { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIR, 'js'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIR, 'host'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIR, 'css'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIR, 'icons'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIR, 'assets'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIR, 'CSXS'), { recursive: true });

// Opções de Ofuscação Avançada
const OBFUSCATION_OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayThreshold: 0.8,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
};

// 2. Ofuscação dos Arquivos JavaScript
console.log('📦 Passo 1: Criptografando arquivos JavaScript...');
const jsFiles = ['app.js', 'deadlockApi.js', 'heroesManager.js', 'itemsManager.js', 'i18n.js', 'CSInterface.js', 'licenseManager.js'];

jsFiles.forEach(file => {
    const srcPath = path.join(PLUGIN_SRC_DIR, 'js', file);
    const destPath = path.join(PLUGIN_DIR, 'js', file);

    if (fs.existsSync(srcPath)) {
        const code = fs.readFileSync(srcPath, 'utf8');
        try {
            const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
            fs.writeFileSync(destPath, obfuscated.getObfuscatedCode(), 'utf8');
            console.log(`   🔒 js/${file} protegido com sucesso (${code.length} bytes -> ${obfuscated.getObfuscatedCode().length} bytes)`);
        } catch (err) {
            console.warn(`   ⚠️ js/${file} copiado sem ofuscação devido a aviso:`, err.message);
            fs.writeFileSync(destPath, code, 'utf8');
        }
    }
});

// 3. Copia ExtendScript JSX
const hostSrc = path.join(PLUGIN_SRC_DIR, 'host', 'index.jsx');
const hostDest = path.join(PLUGIN_DIR, 'host', 'index.jsx');
if (fs.existsSync(hostSrc)) {
    fs.copyFileSync(hostSrc, hostDest);
    console.log(`\n📦 Passo 2: Copiado ExtendScript Host: host/index.jsx`);
}

// 4. Copia e Minifica CSS
const cssSrc = path.join(PLUGIN_SRC_DIR, 'css', 'styles.css');
const cssDest = path.join(PLUGIN_DIR, 'css', 'styles.css');
if (fs.existsSync(cssSrc)) {
    let css = fs.readFileSync(cssSrc, 'utf8');
    css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    fs.writeFileSync(cssDest, css, 'utf8');
    console.log(`📦 Passo 3: Minificado CSS: css/styles.css`);
}

// 5. Copia HTML e Manifest
const srcHtml = path.join(PLUGIN_SRC_DIR, 'index.html');
const destHtml = path.join(PLUGIN_DIR, 'index.html');
if (fs.existsSync(srcHtml)) {
    fs.copyFileSync(srcHtml, destHtml);
    console.log(`📦 Passo 4: Copiado index.html`);
}

const manifestSrc = path.join(PLUGIN_SRC_DIR, 'CSXS', 'manifest.xml');
const manifestDest = path.join(PLUGIN_DIR, 'CSXS', 'manifest.xml');
if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log(`📦 Passo 5: Copiado CSXS/manifest.xml`);
}

// 6. Copia Ícones e Assets
const iconsDir = path.join(PLUGIN_SRC_DIR, 'icons');
if (fs.existsSync(iconsDir)) {
    fs.cpSync(iconsDir, path.join(PLUGIN_DIR, 'icons'), { recursive: true });
    console.log(`📦 Passo 6: Copiados Ícones`);
}

const assetsDir = path.join(PLUGIN_SRC_DIR, 'assets');
if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    assetFiles.forEach(file => {
        if (file.toLowerCase().startsWith('deadlock_assets')) return;
        const src = path.join(assetsDir, file);
        const dest = path.join(PLUGIN_DIR, 'assets', file);
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dest, { recursive: true });
        } else {
            fs.copyFileSync(src, dest);
        }
    });
    console.log(`📦 Passo 7: Copiados Assets de UI`);
}

// 7. Cria o Instalador .BAT dentro de dist\Deadlock_Toolkit
const installerBatchContent = `@echo off
chcp 65001 >nul
cls
title Instalador - Deadlock Toolkit
color 0B

echo ==============================================================================
echo                 🔮 DEADLOCK TOOLKIT - INSTALADOR OFICIAL
echo ==============================================================================
echo.
echo  [1/3] Verificando pasta de extensões do Adobe Premiere Pro...

set "TARGET_DIR=%APPDATA%\\Adobe\\CEP\\extensions\\com.deadlock.toolkit"
set "SOURCE_DIR=%~dp0com.deadlock.toolkit"

if not exist "%APPDATA%\\Adobe\\CEP\\extensions" (
    mkdir "%APPDATA%\\Adobe\\CEP\\extensions" 2>nul
)

echo  [2/3] Instalando arquivos do plugin criptografado...
if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%" 2>nul
)
mkdir "%TARGET_DIR%" 2>nul
xcopy /e /y /i /q "%SOURCE_DIR%" "%TARGET_DIR%" >nul

echo  [3/3] Habilitando PlayerDebugMode no Registro do Windows...
for /L %%i in (7,1,25) do (
    reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
)

cls
color 0A
echo.
echo ==============================================================================
echo                 ✅ DEADLOCK TOOLKIT INSTALADO COM SUCESSO!
echo ==============================================================================
echo.
echo   Como abrir no Adobe Premiere Pro:
echo   1. Abra ou reinicie o Adobe Premiere Pro.
echo   2. No menu superior, clique em: Janela (Window) ^> Extensoes (Extensions).
echo   3. Selecione: "Deadlock Toolkit".
echo.
echo ==============================================================================
echo.
pause
`;

fs.writeFileSync(path.join(TOOLKIT_DIR, 'Instalar_Deadlock_Toolkit.bat'), installerBatchContent.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`📦 Passo 8: Gerado Instalar_Deadlock_Toolkit.bat`);

// 8. Copia Guia HOW TO INSTALL.txt
const howToSrc = fs.existsSync(path.join(__dirname, 'HOW TO INSTALL.txt')) 
    ? path.join(__dirname, 'HOW TO INSTALL.txt') 
    : path.join(ROOT_DIR, 'HOW TO INSTALL.txt');
if (fs.existsSync(howToSrc)) {
    fs.copyFileSync(howToSrc, path.join(TOOLKIT_DIR, 'HOW TO INSTALL.txt'));
    console.log(`📦 Passo 9: Copiado HOW TO INSTALL.txt`);
}

// 9. Compila o Instalador .EXE nativo se Installer.cs existir
const installerCsPath = fs.existsSync(path.join(__dirname, 'Installer.cs')) 
    ? path.join(__dirname, 'Installer.cs') 
    : path.join(ROOT_DIR, 'Installer.cs');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
if (fs.existsSync(installerCsPath) && fs.existsSync(cscPath)) {
    try {
        console.log(`📦 Passo 10: Compilando Instalar_Deadlock_Toolkit.exe nativo C#...`);
        const outExe = path.join(TOOLKIT_DIR, 'Instalar_Deadlock_Toolkit.exe');
        execSync(`"${cscPath}" /target:winexe /out:"${outExe}" "${installerCsPath}"`, { stdio: 'inherit' });
        console.log(`   ✅ Instalar_Deadlock_Toolkit.exe compilado com sucesso!`);
    } catch (e) {
        console.warn(`   ⚠️ Aviso ao compilar .exe:`, e.message);
    }
}

console.log('\n======================================================');
console.log('🎉 SUCESSO: Plugin criptografado e preparado em:');
console.log(`📁 ${TOOLKIT_DIR}`);
console.log('======================================================\n');
