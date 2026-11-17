const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const srcDir = path.join(ROOT_DIR, 'plugin');
const destDir = path.join(process.env.APPDATA, 'Adobe', 'CEP', 'extensions', 'com.deadlock.toolkit');

console.log('Installing clean extension to:', destDir);

// 1. Wipe destination to ensure no junk or sensitive files remain
if (fs.existsSync(destDir)) {
    try {
        fs.rmSync(destDir, { recursive: true, force: true });
    } catch (e) {
        console.warn('Could not clean directory:', e.message);
    }
}
fs.mkdirSync(destDir, { recursive: true });

// 2. Allowed files and folders to deploy into Adobe CEP
const allowedItems = ['CSXS', 'css', 'js', 'host', 'assets', 'icons', 'index.html'];

for (const item of allowedItems) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    if (fs.existsSync(srcPath)) {
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            fs.cpSync(srcPath, destPath, {
                recursive: true,
                filter: (src) => {
                    const base = path.basename(src).toLowerCase();
                    // Skip any raw asset folders or temp files
                    return !base.startsWith('deadlock_assets') && !base.endsWith('.tmp') && !base.endsWith('.log');
                }
            });
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('✅ Clean extension files deployed successfully.');

// 3. Enable PlayerDebugMode for CSXS 7 through 25
console.log('Enabling PlayerDebugMode in Windows Registry...');
for (let v = 7; v <= 25; v++) {
    try {
        const cmd = 'reg add "HKCU\\Software\\Adobe\\CSXS.' + v + '" /v PlayerDebugMode /t REG_SZ /d 1 /f';
        execSync(cmd, { stdio: 'ignore' });
    } catch (e) {}
}
console.log('✅ PlayerDebugMode enabled for CSXS.7 through CSXS.25.');
