const fs = require('fs');
const path = require('path');
const https = require('https');
const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = 'composer-icons';
const R2_PUBLIC_BASE = 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev';
const LOCAL_DIR = 'C:/Users/Administrador/Downloads/DeadEx/Item_description';
const BACKUP_DIR = path.join(__dirname, 'tests_and_data', 'backup_item_description_obsolete');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '07746b9807695b823b003e5942f723ee',
    secretAccessKey: '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99'
  }
});

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

async function listAllKeys(prefix) {
  let list = [];
  let token = undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: token
    }));
    if (res.Contents) {
      list.push(...res.Contents.map(c => c.Key));
    }
    token = res.NextContinuationToken;
  } while (token);
  return list;
}

async function runPool(items, concurrency, fn) {
  let index = 0;
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item, index++));
    executing.push(p);
    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(executing);
}

async function main() {
  console.log('🚀 Iniciando processo de sincronização e upload para o Cloudflare R2...');
  console.log(`📁 Diretório local de origem: ${LOCAL_DIR}`);
  console.log(`🪣 Bucket de destino: ${BUCKET}`);

  // 1. Ler arquivos locais
  const localFiles = getAllFiles(LOCAL_DIR);
  console.log(`📦 Encontrados ${localFiles.length} arquivos locais.`);

  const uploadList = localFiles.map(filePath => {
    const rel = path.relative(LOCAL_DIR, filePath).split(path.sep).join('/');
    return {
      filePath,
      key: `Item_description/${rel}`
    };
  });

  const localKeySet = new Set(uploadList.map(u => u.key));

  // 2. Listar arquivos existentes no R2 em Item_description/
  console.log('🔍 Consultando arquivos existentes no R2 em Item_description/...');
  const remoteKeys = await listAllKeys('Item_description/');
  console.log(`☁️ Encontrados ${remoteKeys.length} arquivos no R2 em Item_description/.`);

  // Identificar obsoletos
  const obsoleteKeys = remoteKeys.filter(k => !localKeySet.has(k));
  console.log(`⚠️ Arquivos no R2 que não existem mais localmente: ${obsoleteKeys.length}`);

  // 3. Fazer backup e remover obsoletos
  if (obsoleteKeys.length > 0) {
    console.log(`💾 Criando backup local dos ${obsoleteKeys.length} arquivos obsoletos em: ${BACKUP_DIR}`);
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    for (const key of obsoleteKeys) {
      try {
        const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        const res = await s3.send(getCmd);
        const destFile = path.join(BACKUP_DIR, path.basename(key));
        const stream = fs.createWriteStream(destFile);
        await new Promise((resolve, reject) => {
          res.Body.pipe(stream);
          res.Body.on('error', reject);
          stream.on('finish', resolve);
        });
      } catch (err) {
        console.warn(`Aviso ao baixar backup de ${key}:`, err.message);
      }
    }
    console.log('✅ Backup dos arquivos obsoletos concluído.');

    console.log('🗑️ Removendo arquivos obsoletos do R2...');
    const deleteParams = {
      Bucket: BUCKET,
      Delete: {
        Objects: obsoleteKeys.map(k => ({ Key: k })),
        Quiet: false
      }
    };
    await s3.send(new DeleteObjectsCommand(deleteParams));
    console.log(`✅ ${obsoleteKeys.length} arquivos obsoletos removidos do R2 com sucesso.`);
  }

  // 4. Upload dos 155 arquivos
  console.log(`\n📤 Iniciando upload de ${uploadList.length} arquivos para o R2...`);
  let completed = 0;
  await runPool(uploadList, 10, async (item) => {
    const fileBuffer = fs.readFileSync(item.filePath);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: item.key,
      Body: fileBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable'
    }));
    completed++;
    if (completed % 25 === 0 || completed === uploadList.length) {
      console.log(`  Progresso: ${completed}/${uploadList.length} (${Math.round((completed / uploadList.length) * 100)}%)`);
    }
  });

  console.log('🎉 Todos os arquivos foram enviados com sucesso!');

  // 5. Validação final
  console.log('\n🔎 Verificando estado final no R2...');
  const finalRemoteKeys = await listAllKeys('Item_description/');
  console.log(`✅ Total de arquivos em Item_description/ agora no R2: ${finalRemoteKeys.length}`);

  // Testar uma URL pública
  const testKey = uploadList[0].key;
  const testUrl = `${R2_PUBLIC_BASE}/${encodeURI(testKey)}`;
  console.log(`🌐 Testando URL pública: ${testUrl}`);

  await new Promise((resolve) => {
    https.get(testUrl, (res) => {
      console.log(`📡 Status da URL de teste: ${res.statusCode} ${res.statusMessage} (Content-Type: ${res.headers['content-type']}, Tamanho: ${res.headers['content-length']} bytes)`);
      resolve();
    }).on('error', (e) => {
      console.error('Erro ao testar URL:', e.message);
      resolve();
    });
  });

  console.log('\n✨ Concluído com sucesso total!');
}

main().catch(err => {
  console.error('❌ Erro durante o processo:', err);
  process.exit(1);
});
