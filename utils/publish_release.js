/**
 * publish_release.js - Compila, empacota e publica releases no Cloudflare R2
 * 
 * Uso:
 *   node publish_release.js [versao]
 * Exemplo:
 *   node publish_release.js 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configurações do R2
const R2_CONFIG = {
  endpoint: process.env.R2_ENDPOINT || 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '07746b9807695b823b003e5942f723ee',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99',
  bucket: process.env.R2_BUCKET || 'deadlock-match-scanner',
  publicUrl: process.env.R2_PUBLIC_URL || 'https://pub-3d2e50a01e2e4fd5af92763dd84d26a6.r2.dev'
};

const VERSION = process.argv[2] || '1.0.0';
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASES_DIR = path.join(DIST_DIR, 'releases');

function createZip(versionZipPath) {
  if (fs.existsSync(versionZipPath)) fs.unlinkSync(versionZipPath);

  const pathsToZip = [
    `'${path.join(DIST_DIR, 'Instalar_Deadlock_Scanner.bat')}'`,
    `'${path.join(DIST_DIR, 'com.deadlock.toolkit')}'`
  ];

  const exePath = path.join(__dirname, 'Instalar_Deadlock_Scanner.exe');
  if (fs.existsSync(exePath)) {
    pathsToZip.push(`'${exePath}'`);
  }

  const psCmd = `Compress-Archive -Path ${pathsToZip.join(', ')} -DestinationPath '${versionZipPath}' -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`);

  return fs.statSync(versionZipPath).size;
}

async function uploadToR2(s3, key, filePath, contentType) {
  console.log(`📤 Enviando para Cloudflare R2: ${key}...`);
  const fileStream = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucket,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
    CacheControl: key.endsWith('.json') ? 'no-cache, max-age=60' : 'public, max-age=31536000'
  });

  await s3.send(command);
  console.log(`✅ Sucesso: ${R2_CONFIG.publicUrl}/${key}`);
}

async function main() {
  console.log('======================================================');
  console.log(`🚀 PUBLICADOR DE RELEASES - DEADLOCK MATCH SCANNER v${VERSION}`);
  console.log('======================================================\n');

  // 1. Compilação e ofuscação
  console.log('📦 Passo 1: Compilando e ofuscando o código...');
  execSync('node build_dist.js', { stdio: 'inherit', cwd: __dirname });

  // 1.1 Compila o Instalador .EXE nativo C#
  try {
    const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
    if (fs.existsSync(cscPath)) {
      console.log('🔨 Compilando Instalar_Deadlock_Scanner.exe nativo...');
      execSync(`"${cscPath}" /target:winexe /out:Instalar_Deadlock_Scanner.exe Installer.cs`, { cwd: __dirname, stdio: 'inherit' });
      console.log('   ✅ Instalar_Deadlock_Scanner.exe pronto.');
    }
  } catch (eCsc) {
    console.warn('   ⚠️ Aviso ao compilar .exe:', eCsc.message);
  }

  // 2. Cria pasta de releases
  if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
  }

  // 3. Compactação ZIP
  const versionZipName = `Deadlock_Toolkit_v${VERSION}.zip`;
  const latestZipName = `Deadlock_Toolkit_v${VERSION}.zip`;
  const versionZipPath = path.join(RELEASES_DIR, versionZipName);

  console.log(`\n🗜️  Passo 2: Criando pacote ${versionZipName}...`);
  const bytes = createZip(versionZipPath);
  console.log(`   ✅ Pacote gerado com sucesso: ${(bytes / (1024 * 1024)).toFixed(2)} MB`);

  // 4. Criação do version.json
  console.log('\n📝 Passo 3: Gerando version.json...');
  const versionInfo = {
    version: VERSION,
    name: 'Deadlock Toolkit Pro',
    releaseDate: new Date().toISOString().split('T')[0],
    downloadUrl: `${R2_CONFIG.publicUrl}/${versionZipName}`,
    versionDownloadUrl: `${R2_CONFIG.publicUrl}/${versionZipName}`,
    mandatory: false,
    changelog: `Versão oficial v${VERSION} com suporte nativo ao Premiere Pro 2025 e 2026.`
  };

  const versionJsonPath = path.join(RELEASES_DIR, 'version.json');
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2), 'utf8');
  console.log('   ✅ version.json criado com sucesso.');

  // 5. Upload para o Cloudflare R2
  console.log('\n☁️  Passo 4: Conectando e enviando para o Cloudflare R2...');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey
    }
  });

  try {
    await uploadToR2(s3, versionZipName, versionZipPath, 'application/zip');
    await uploadToR2(s3, latestZipName, latestZipPath, 'application/zip');
    await uploadToR2(s3, 'version.json', versionJsonPath, 'application/json');

    console.log('\n======================================================');
    console.log('🎉 RELEASE PUBLICADA COM SUCESSO NO CLOUDFLARE R2!');
    console.log('======================================================');
    console.log(`🔗 Link Direto Latest: ${R2_CONFIG.publicUrl}/${latestZipName}`);
    console.log(`🔗 Link da Versão:     ${R2_CONFIG.publicUrl}/${versionZipName}`);
    console.log(`🔗 URL de Atualizações: ${R2_CONFIG.publicUrl}/version.json`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Erro durante o upload para o R2:', err.message);
    if (err.message.includes('Access Denied')) {
      console.error('\n⚠️  DICA: A chave de API atual do R2 está restrita ao bucket antigo.');
      console.error('   Para liberar o upload no bucket "deadlock-match-scanner":');
      console.error('   1. Vá no painel da Cloudflare > R2 > Manage R2 API Tokens');
      console.error('   2. Crie um token com permissão "Object Read & Write" para o bucket "deadlock-match-scanner" (ou All Buckets)');
      console.error('   3. E rode novamente passando as credenciais no terminal ou arquivo env.env.');
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Falha fatal:', err);
  process.exit(1);
});
