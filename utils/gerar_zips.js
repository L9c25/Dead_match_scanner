/**
 * gerar_zips.js
 * Transforma os itens da pasta dist\Deadlock_Toolkit em:
 * 1) Deadlock_Toolkit_v{VERSAO}.zip (ex: Deadlock_Toolkit_v1.0.zip)
 * 2) Deadlock_Toolkit_Latest.zip
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ZipArchive } = require('archiver');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TOOLKIT_DIR = path.join(DIST_DIR, 'Deadlock_Toolkit');

if (!fs.existsSync(TOOLKIT_DIR)) {
    console.error('❌ ERRO: A pasta dist\\Deadlock_Toolkit não foi encontrada!');
    console.error('Execute primeiro o script "1_Criptografar_Plugin" antes de gerar os zips.\n');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askVersion() {
    const defaultVersion = process.argv[2] || '1.0';
    
    if (process.argv[2]) {
        createPackages(process.argv[2]);
        return;
    }

    console.log('======================================================');
    console.log('🗜️  GERADOR DE PACOTES ZIP - DEADLOCK TOOLKIT');
    console.log('======================================================\n');

    rl.question(`Informe a versão para o pacote [Padrão: ${defaultVersion}]: `, (answer) => {
        let version = (answer || '').trim();
        if (!version) version = defaultVersion;
        // Se a pessoa digitou com 'v' no início, remove para padronizar
        if (version.toLowerCase().startsWith('v')) version = version.substring(1);
        
        rl.close();
        createPackages(version);
    });
}

function zipFolder(targetZipPath) {
    if (fs.existsSync(targetZipPath)) fs.unlinkSync(targetZipPath);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(targetZipPath);
        const archive = new ZipArchive();

        output.on('close', () => {
            resolve(archive.pointer());
        });

        archive.on('error', err => {
            reject(err);
        });

        archive.pipe(output);

        // Adiciona todos os itens que estão dentro de dist\Deadlock_Toolkit
        const items = fs.readdirSync(TOOLKIT_DIR);
        for (const item of items) {
            const itemPath = path.join(TOOLKIT_DIR, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                archive.directory(itemPath, item);
            } else {
                archive.file(itemPath, { name: item });
            }
        }

        archive.finalize();
    });
}

async function createPackages(version) {
    const versionZipName = `Deadlock_Toolkit_v${version}.zip`;
    const latestZipName = `Deadlock_Toolkit_Latest.zip`;

    const versionZipPath = path.join(DIST_DIR, versionZipName);
    const latestZipPath = path.join(DIST_DIR, latestZipName);

    console.log(`\n⏳ Compactando itens de dist\\Deadlock_Toolkit...`);

    try {
        // 1. Gera o zip da versão (ex: Deadlock_Toolkit_v1.0.zip)
        const bytes = await zipFolder(versionZipPath);
        const sizeMb = (bytes / (1024 * 1024)).toFixed(2);
        console.log(`\n✅ Pacote de Versão gerado:`);
        console.log(`   📁 ${versionZipName} (${sizeMb} MB / ${(bytes / 1024).toFixed(0)} KB)`);

        // 2. Copia / Gera o zip Latest (Deadlock_Toolkit_Latest.zip)
        if (fs.existsSync(latestZipPath)) fs.unlinkSync(latestZipPath);
        fs.copyFileSync(versionZipPath, latestZipPath);
        console.log(`\n✅ Pacote _Latest gerado:`);
        console.log(`   📁 ${latestZipName} (${sizeMb} MB / ${(bytes / 1024).toFixed(0)} KB)`);

        console.log('\n======================================================');
        console.log('🎉 TODOS OS ARQUIVOS .ZIP FORAM GERADOS COM SUCESSO!');
        console.log('======================================================');
        console.log(`Localização: ${DIST_DIR}`);
        console.log(`- ${versionZipName}`);
        console.log(`- ${latestZipName}`);
        console.log('======================================================\n');

    } catch (err) {
        console.error('❌ Erro ao criar arquivos ZIP:', err.message);
    }
}

askVersion();
