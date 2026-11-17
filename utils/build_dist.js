/**
 * build_dist.js - Production Builder & Code Obfuscator for Deadlock Match Scanner
 * Creates an encrypted/obfuscated standalone distribution package + 1-Click Installer + .ZXP
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { ZipArchive } = require('archiver');

const ROOT_DIR = path.resolve(__dirname, '..');
const PLUGIN_SRC_DIR = path.join(ROOT_DIR, 'plugin');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PLUGIN_DIST = path.join(DIST_DIR, 'com.deadlock.toolkit');

console.log('🚀 Iniciando compilação e ofuscação do Deadlock Match Scanner...\n');

// 1. Clean / create dist directories
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PLUGIN_DIST, { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIST, 'js'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIST, 'host'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIST, 'css'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIST, 'icons'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIST, 'assets'), { recursive: true });
fs.mkdirSync(path.join(PLUGIN_DIST, 'CSXS'), { recursive: true });

// Obfuscator options (high protection, tamper-resistant)
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

// 2. Process and Obfuscate JS Files
const jsFiles = ['app.js', 'deadlockApi.js', 'heroesManager.js', 'itemsManager.js', 'i18n.js', 'CSInterface.js', 'licenseManager.js'];

jsFiles.forEach(file => {
    const srcPath = path.join(PLUGIN_SRC_DIR, 'js', file);
    const destPath = path.join(PLUGIN_DIST, 'js', file);

    if (fs.existsSync(srcPath)) {
        const code = fs.readFileSync(srcPath, 'utf8');
        console.log(`🔒 Ofuscando e criptografando: js/${file}...`);

        try {
            const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
            fs.writeFileSync(destPath, obfuscated.getObfuscatedCode(), 'utf8');
            console.log(`   ✅ js/${file} protegido (${code.length} bytes -> ${obfuscated.getObfuscatedCode().length} bytes)`);
        } catch (err) {
            console.error(`   ❌ Erro ao ofuscar ${file}:`, err.message);
            fs.writeFileSync(destPath, code, 'utf8');
        }
    }
});

// 3. Copy ExtendScript JSX Host Script (host/index.jsx)
const hostSrc = path.join(PLUGIN_SRC_DIR, 'host', 'index.jsx');
const hostDest = path.join(PLUGIN_DIST, 'host', 'index.jsx');
if (fs.existsSync(hostSrc)) {
    const code = fs.readFileSync(hostSrc, 'utf8');
    fs.writeFileSync(hostDest, code, 'utf8');
    console.log(`✅ Copiado ExtendScript Host: host/index.jsx (${code.length} bytes)`);
} else {
    console.error(`❌ ALERTA CRÍTICO: host/index.jsx NÃO ENCONTRADO em ${hostSrc}!`);
}

// 4. Copy CSS and Minify
const cssFiles = ['styles.css'];
cssFiles.forEach(file => {
    const srcPath = path.join(PLUGIN_SRC_DIR, 'css', file);
    const destPath = path.join(PLUGIN_DIST, 'css', file);
    if (fs.existsSync(srcPath)) {
        let css = fs.readFileSync(srcPath, 'utf8');
        css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
        fs.writeFileSync(destPath, css, 'utf8');
        console.log(`✅ Minificado CSS: css/${file}`);
    }
});

// 5. Copy HTML
const srcHtml = path.join(PLUGIN_SRC_DIR, 'index.html');
const destHtml = path.join(PLUGIN_DIST, 'index.html');
if (fs.existsSync(srcHtml)) {
    fs.copyFileSync(srcHtml, destHtml);
    console.log(`✅ Copiado HTML: index.html`);
}

// 6. Copy Icons
const iconsDir = path.join(PLUGIN_SRC_DIR, 'icons');
if (fs.existsSync(iconsDir)) {
    fs.cpSync(iconsDir, path.join(PLUGIN_DIST, 'icons'), { recursive: true });
    console.log(`✅ Copiados Ícones`);
}

// 6.1 Copy Assets (Logos, images - ignore separate assets pack)
const assetsDir = path.join(PLUGIN_SRC_DIR, 'assets');
if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    assetFiles.forEach(file => {
        if (file.toLowerCase().startsWith('deadlock_assets')) return; // Ignore large assets pack
        const src = path.join(assetsDir, file);
        const dest = path.join(PLUGIN_DIST, 'assets', file);
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dest, { recursive: true });
        } else {
            fs.copyFileSync(src, dest);
        }
    });
    console.log(`✅ Copiados Assets de UI do Plugin`);
}

// 7. Copy Manifest XML
const manifestSrc = path.join(PLUGIN_SRC_DIR, 'CSXS', 'manifest.xml');
const manifestDest = path.join(PLUGIN_DIST, 'CSXS', 'manifest.xml');
if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log(`✅ Copiado Manifest: CSXS/manifest.xml`);
}

// 8. Create 1-Click Windows Batch Installer
const installerBatchContent = `@echo off
chcp 65001 >nul
cls
title Instalador - Deadlock Toolkit v1.0
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
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.7" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.8" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.9" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.10" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.11" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.12" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.13" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.14" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.15" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.16" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.17" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.18" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.19" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.20" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.21" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.22" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.23" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.24" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul
reg add "HKEY_CURRENT_USER\\Software\\Adobe\\CSXS.25" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>nul

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

fs.writeFileSync(path.join(DIST_DIR, 'Instalar_Deadlock_Scanner.bat'), installerBatchContent.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`✅ Criado Instalador de 1-Clique: dist/Instalar_Deadlock_Scanner.bat`);

// Copy HOW TO INSTALL.txt to DIST_DIR
const srcHowTo = fs.existsSync(path.join(__dirname, 'HOW TO INSTALL.txt')) 
    ? path.join(__dirname, 'HOW TO INSTALL.txt') 
    : path.join(ROOT_DIR, 'HOW TO INSTALL.txt');

if (fs.existsSync(srcHowTo)) {
    fs.copyFileSync(srcHowTo, path.join(DIST_DIR, 'HOW TO INSTALL.txt'));
    console.log(`✅ Utilizado Guia Oficial: dist/HOW TO INSTALL.txt`);
}

// 9. Generate Standalone .ZIP for Google Drive Distribution directly inside dist/
async function generateZips() {
    const primaryZip = path.join(DIST_DIR, 'Deadlock_Toolkit_v1.0.zip');
    if (fs.existsSync(primaryZip)) fs.unlinkSync(primaryZip);

    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(primaryZip);
        const archive = new ZipArchive();

        output.on('close', () => {
            console.log(`\n🎉 Pacote .ZIP Criado com Sucesso (${(archive.pointer() / 1024).toFixed(1)} KB):`);
            console.log(`   📁 ${primaryZip}`);
            resolve();
        });

        archive.on('error', err => {
            console.error('❌ Erro no archiver:', err);
            reject(err);
        });

        archive.pipe(output);

        // Add installer & guide inside zip
        const batFile = path.join(DIST_DIR, 'Instalar_Deadlock_Scanner.bat');
        const exeFile = path.join(DIST_DIR, 'Instalar_Deadlock_Scanner.exe');
        const txtFile = path.join(DIST_DIR, 'HOW TO INSTALL.txt');
        if (fs.existsSync(batFile)) archive.file(batFile, { name: 'Instalar_Deadlock_Scanner.bat' });
        if (fs.existsSync(exeFile)) archive.file(exeFile, { name: 'Instalar_Deadlock_Scanner.exe' });
        if (fs.existsSync(txtFile)) archive.file(txtFile, { name: 'HOW TO INSTALL.txt' });

        // Add extension directory
        archive.directory(PLUGIN_DIST, 'com.deadlock.toolkit');

        archive.finalize();
    });
}

generateZips().then(() => {
    console.log('\n======================================================');
    console.log('📦 PASTA DE INSTALAÇÃO PRONTA EM:');
    console.log(`   ${DIST_DIR}`);
    console.log('======================================================\n');
}).catch(err => {
    console.error('Erro na finalização do zip:', err);
});

console.log('\n======================================================');
console.log('📦 PASTA DE INSTALAÇÃO PRONTA EM:');
console.log(`   ${DIST_DIR}`);
console.log('======================================================\n');
