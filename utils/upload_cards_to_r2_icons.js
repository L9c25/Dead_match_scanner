const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = 'composer-icons';
const R2_PUBLIC_BASE = 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev';
const SOURCE_DIR = 'C:/Users/Administrador/Downloads/deadlock_todos_os_cards_200x316';

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '07746b9807695b823b003e5942f723ee',
    secretAccessKey: '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99'
  }
});

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/['’`\-_\.\s&]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function listAllKeys(prefix = '') {
  let list = [];
  let token = undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix || undefined,
      ContinuationToken: token
    }));
    if (res.Contents) {
      list.push(...res.Contents.map(c => c.Key));
    }
    token = res.NextContinuationToken;
  } while (token);
  return list;
}

async function uploadToR2(key, buffer, contentType = 'image/png') {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable'
  });
  await s3.send(command);
  return `${R2_PUBLIC_BASE}/${encodeURI(key)}`;
}

async function main() {
  console.log('🚀 Iniciando processo de upload dos cards para o Cloudflare R2...');
  console.log(`📂 Diretório de origem: ${SOURCE_DIR}`);

  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Diretório de origem não encontrado: ${SOURCE_DIR}`);
  }

  // 1. Obter todas as chaves existentes em item_icon/ no R2
  console.log('📡 Buscando itens existentes na pasta item_icon/ do R2...');
  const existingR2Keys = await listAllKeys('item_icon/');
  console.log(`📦 Encontrados ${existingR2Keys.length} arquivos existentes em item_icon/ no R2.`);

  // Mapa de correspondência por categoria e nome normalizado
  // r2Map.get("spirit:arcanesurge") -> "item_icon/Spirit/ArcaneSurge.png"
  const r2Map = new Map();
  for (const k of existingR2Keys) {
    const parts = k.split('/');
    if (parts.length >= 3) {
      const cat = parts[1].toLowerCase();
      const fn = path.basename(k, path.extname(k));
      r2Map.set(`${cat}:${normalize(fn)}`, k);
    }
    // Também mapa global por nome normalizado caso mude de pasta
    const fnOnly = path.basename(k, path.extname(k));
    r2Map.set(`global:${normalize(fnOnly)}`, k);
  }

  // 2. Varrer os arquivos locais
  const categories = fs.readdirSync(SOURCE_DIR);
  const tasks = [];

  for (const cat of categories) {
    const catPath = path.join(SOURCE_DIR, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;

    const files = fs.readdirSync(catPath).filter(f => f.toLowerCase().endsWith('.png'));
    for (const file of files) {
      const fullPath = path.join(catPath, file);
      const nameWithoutExt = path.basename(file, path.extname(file));
      const normName = normalize(nameWithoutExt);

      // Determinar a chave de destino no R2
      let targetKey = r2Map.get(`${cat.toLowerCase()}:${normName}`);
      let matchType = 'exact_r2_match';

      if (!targetKey) {
        targetKey = r2Map.get(`global:${normName}`);
        if (targetKey) {
          matchType = 'global_r2_match';
        }
      }

      if (!targetKey) {
        // Formatar para PascalCase sem underscores se for item novo
        const pascalName = nameWithoutExt
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join('');
        targetKey = `item_icon/${cat}/${pascalName}.png`;
        matchType = 'new_formatted_name';
      }

      tasks.push({
        cat,
        originalFile: file,
        fullPath,
        targetKey,
        matchType
      });
    }
  }

  console.log(`\n📋 Mapeamento concluído: ${tasks.length} arquivos locais preparados para upload.`);

  // 3. Executar uploads em concorrência controlada (8 simultâneos)
  const CONCURRENCY = 8;
  let successCount = 0;
  let failCount = 0;
  const results = [];

  async function processTask(task, index) {
    try {
      const buffer = fs.readFileSync(task.fullPath);
      const publicUrl = await uploadToR2(task.targetKey, buffer, 'image/png');
      successCount++;
      console.log(`[${index + 1}/${tasks.length}] ✅ [${task.cat}] ${task.originalFile} ➔ ${task.targetKey} (${buffer.length} bytes)`);
      results.push({
        status: 'ok',
        cat: task.cat,
        originalFile: task.originalFile,
        targetKey: task.targetKey,
        publicUrl,
        matchType: task.matchType
      });
    } catch (err) {
      failCount++;
      console.error(`[${index + 1}/${tasks.length}] ❌ ERRO ao enviar ${task.originalFile}:`, err.message);
      results.push({
        status: 'error',
        originalFile: task.originalFile,
        error: err.message
      });
    }
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const chunk = tasks.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((task, idx) => processTask(task, i + idx)));
  }

  console.log('\n======================================================');
  console.log('🎉 RESUMO DO UPLOAD PARA O CLOUDFLARE R2');
  console.log('======================================================');
  console.log(`Total processados: ${tasks.length}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Falhas: ${failCount}`);

  // Salvar relatório em JSON para verificação
  const reportPath = path.join(__dirname, 'tests_and_data', 'cards_upload_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`📄 Relatório detalhado salvo em: ${reportPath}`);

  // 4. Executar sync_all_catalogs.js para garantir consistência
  console.log('\n🔄 Rodando sincronização dos catálogos do projeto...');
  try {
    const syncScript = path.join(__dirname, 'sync_all_catalogs.js');
    if (fs.existsSync(syncScript)) {
      require(syncScript);
    }
  } catch (syncErr) {
    console.warn('Aviso na sincronização do catálogo:', syncErr.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
