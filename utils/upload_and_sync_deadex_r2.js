/**
 * upload_and_sync_deadex_r2.js
 * 
 * 1. Conecta ao Cloudflare R2 (bucket composer-icons)
 * 2. Deleta os arquivos antigos de `item_icon/` e `Item_description/` (mantendo `character icons/` intacto!)
 * 3. Envia os 780 novos assets de DeadEx organizados:
 *    - item_card/en/new/Category/Tier/Item.png (156)
 *    - item_card/en/old/Category/Tier/Item.png (156)
 *    - item_card/pt/new/Category/Tier/Item.png (156)
 *    - item_card/pt/old/Category/Tier/Item.png (156)
 *    - item_description/en/Category/Tier/Item.png (156)
 * 4. Gera catalog.json mestre atualizado e envia ao R2
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = 'composer-icons';
const R2_PUBLIC_BASE = 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev';
const DEADEX_DIR = 'C:/Users/Administrador/Downloads/DeadEx';

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '07746b9807695b823b003e5942f723ee',
    secretAccessKey: '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99'
  }
});

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    }).on('error', reject);
  });
}

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

async function deleteKeys(keys) {
  if (!keys || keys.length === 0) return;
  console.log(`🗑️ Deletando ${keys.length} objetos do bucket...`);
  // Delete in batches of 1000 (S3 limit)
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: batch.map(k => ({ Key: k })),
        Quiet: true
      }
    }));
  }
  console.log(`✅ ${keys.length} objetos deletados.`);
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
  console.log('🚀 Iniciando atualização dos assets do Deadlock no Cloudflare R2 com base em DeadEx...');

  // 1. Deletar chaves antigas de item_icon e Item_description
  console.log('\n--- ETAPA 1: Limpando assets antigos no R2 ---');
  const [oldDescKeys, oldIconKeys] = await Promise.all([
    listAllKeys('Item_description/'),
    listAllKeys('item_icon/')
  ]);
  const toDelete = [...oldDescKeys, ...oldIconKeys];
  console.log(`Encontrados ${oldDescKeys.length} em Item_description/ e ${oldIconKeys.length} em item_icon/. Total: ${toDelete.length}`);
  if (toDelete.length > 0) {
    await deleteKeys(toDelete);
  }

  // 2. Coletar dados da API do Deadlock para correlacionar IDs, classes e nomes
  console.log('\n--- ETAPA 2: Consultando API do Deadlock ---');
  const [apiHeroes, apiItemsEn, apiItemsBr] = await Promise.all([
    httpGet('https://api.deadlock-api.com/v1/assets/heroes'),
    httpGet('https://api.deadlock-api.com/v1/assets/items'),
    httpGet('https://api.deadlock-api.com/v1/assets/items?language=brazilian')
  ]);
  console.log(`Deadlock API: ${apiHeroes.length} heróis, ${apiItemsEn.length} itens EN, ${apiItemsBr.length} itens BR.`);

  const brNameMap = new Map();
  for (const it of apiItemsBr) {
    if (it.id) brNameMap.set(it.id, it.name);
  }

  // 3. Preparar lista de uploads de DeadEx
  console.log('\n--- ETAPA 3: Mapeando 780 arquivos locais do DeadEx ---');

  const catMap = {
    '1_Arma': 'Weapon',
    '2_Vitalidade': 'Vitality',
    '3_Espirito': 'Spirit',
    'weapon': 'Weapon',
    'vitality': 'Vitality',
    'spirit': 'Spirit'
  };

  const uploadTasks = [];
  const itemsCatalogMap = new Map(); // enName -> itemMetadata

  // A) Item Cards (4 pastas: EN_new, EN_old, PT_new, PT_old)
  const cardFolders = [
    { dir: 'item_icon/EN_Fundo_Atual_CARD', lang: 'en', version: 'new' },
    { dir: 'item_icon/EN_Fundo_Antigo_Buildlocker', lang: 'en', version: 'old' },
    { dir: 'item_icon/PT_Fundo_Atual_CARD', lang: 'pt', version: 'new' },
    { dir: 'item_icon/PT_Fundo_Antigo_Buildlocker', lang: 'pt', version: 'old' }
  ];

  for (const cf of cardFolders) {
    const fullFolderPath = path.join(DEADEX_DIR, cf.dir);
    for (const catFolder of fs.readdirSync(fullFolderPath)) {
      const catPath = path.join(fullFolderPath, catFolder);
      if (!fs.statSync(catPath).isDirectory()) continue;
      const canonicalCategory = catMap[catFolder] || catFolder;

      for (const tierFolder of fs.readdirSync(catPath)) {
        const tierPath = path.join(catPath, tierFolder);
        if (!fs.statSync(tierPath).isDirectory()) continue;
        const canonicalTier = tierFolder.replace('_', ' '); // Tier 1, Tier 2...

        const cartoesPath = path.join(tierPath, 'cartoes');
        const targetSearchPath = fs.existsSync(cartoesPath) ? cartoesPath : tierPath;

        for (const file of fs.readdirSync(targetSearchPath)) {
          if (!file.endsWith('.png')) continue;
          const filePath = path.join(targetSearchPath, file);

          // Nome do item a partir do arquivo (ex: Close_Quarters_cartao.png -> Close Quarters)
          const rawItemName = file.replace(/_cartao\.png$/i, '').replace(/_/g, ' ').trim();

          // Chave organizada no R2
          const r2Key = `item_card/${cf.lang}/${cf.version}/${canonicalCategory}/${canonicalTier}/${file}`;

          uploadTasks.push({
            localPath: filePath,
            r2Key: r2Key,
            type: 'card',
            lang: cf.lang,
            version: cf.version,
            category: canonicalCategory,
            tier: canonicalTier,
            rawName: rawItemName,
            file: file
          });
        }
      }
    }
  }

  // B) Item Descriptions (EN)
  const descDir = path.join(DEADEX_DIR, 'Item_description');
  for (const catFolder of fs.readdirSync(descDir)) {
    const catPath = path.join(descDir, catFolder);
    if (!fs.statSync(catPath).isDirectory()) continue;
    const canonicalCategory = catMap[catFolder.toLowerCase()] || catFolder;

    for (const tierFolder of fs.readdirSync(catPath)) {
      const tierPath = path.join(catPath, tierFolder);
      if (!fs.statSync(tierPath).isDirectory()) continue;
      const canonicalTier = tierFolder.charAt(0).toUpperCase() + tierFolder.slice(1); // 'tier 1' -> 'Tier 1'

      for (const file of fs.readdirSync(tierPath)) {
        if (!file.endsWith('.png')) continue;
        const filePath = path.join(tierPath, file);
        const rawItemName = path.basename(file, '.png').trim();

        const r2Key = `item_description/en/${canonicalCategory}/${canonicalTier}/${file}`;

        uploadTasks.push({
          localPath: filePath,
          r2Key: r2Key,
          type: 'description',
          lang: 'en',
          version: 'current',
          category: canonicalCategory,
          tier: canonicalTier,
          rawName: rawItemName,
          file: file
        });
      }
    }
  }

  console.log(`Total de tarefas de upload preparadas: ${uploadTasks.length} arquivos.`);

  // 4. Executar uploads com concorrência de 12 conexões
  console.log('\n--- ETAPA 4: Realizando upload para o Cloudflare R2 ---');
  const CONCURRENCY = 12;
  let successCount = 0;
  let failCount = 0;

  async function processTask(task, idx) {
    try {
      const buffer = fs.readFileSync(task.localPath);
      await uploadToR2(task.r2Key, buffer, 'image/png');
      successCount++;
      if (successCount % 50 === 0 || successCount === uploadTasks.length) {
        console.log(`Progresso: ${successCount}/${uploadTasks.length} uploads concluídos...`);
      }
    } catch (err) {
      failCount++;
      console.error(`Erro no upload de ${task.r2Key}:`, err.message);
    }
  }

  for (let i = 0; i < uploadTasks.length; i += CONCURRENCY) {
    const chunk = uploadTasks.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((task, idx) => processTask(task, i + idx)));
  }

  console.log(`\n🎉 Uploads finalizados: ${successCount} sucessos, ${failCount} falhas.`);

  // 5. Construir o Catalog Mestre unificado com suporte a todas as tags
  console.log('\n--- ETAPA 5: Construindo catalog.json atualizado ---');

  // Heróis (mantendo as chaves existentes do R2)
  const r2AllKeys = await listAllKeys('character icons/');
  const heroKeysMap = new Map();
  r2AllKeys
    .filter(k => !k.includes('/Critic/') && !k.includes('/Gloat/'))
    .forEach(k => {
      const fn = k.replace('character icons/', '').replace(/\.png$/i, '').trim();
      heroKeysMap.set(normalize(fn), k);
    });

  const catalogHeroes = apiHeroes.map(h => {
    const norm = normalize(h.name);
    const r2Key = heroKeysMap.get(norm) || `character icons/${h.name}.png`;
    const r2Url = `${R2_PUBLIC_BASE}/${encodeURI(r2Key)}`;
    const fallback = h.images?.icon_image_small || h.images?.icon_hero_card || r2Url;
    return {
      id: h.id,
      name: h.name,
      className: h.class_name,
      r2Key: r2Key,
      url: r2Url,
      fallbackUrl: fallback
    };
  });

  // Mapear cada um dos 156 itens do DeadEx
  const enCardsList = uploadTasks.filter(t => t.type === 'card' && t.lang === 'en' && t.version === 'new');
  const catalogItems = [];

  for (const task of enCardsList) {
    const enName = task.rawName;
    const apiItem = apiItemsEn.find(it => it.name && normalize(it.name) === normalize(enName));
    const ptName = apiItem ? brNameMap.get(apiItem.id) : null;

    // Encontrar os arquivos correspondentes para cada variação
    const cardEnNewTask = uploadTasks.find(t => t.type === 'card' && t.lang === 'en' && t.version === 'new' && normalize(t.rawName) === normalize(enName));
    const cardEnOldTask = uploadTasks.find(t => t.type === 'card' && t.lang === 'en' && t.version === 'old' && normalize(t.rawName) === normalize(enName));

    // Para PT, encontrar pelo ptName ou equivalente
    const cardPtNewTask = uploadTasks.find(t => t.type === 'card' && t.lang === 'pt' && t.version === 'new' && ptName && normalize(t.rawName) === normalize(ptName));
    const cardPtOldTask = uploadTasks.find(t => t.type === 'card' && t.lang === 'pt' && t.version === 'old' && ptName && normalize(t.rawName) === normalize(ptName));

    // Descrição em inglês
    const descEnTask = uploadTasks.find(t => t.type === 'description' && t.lang === 'en' && normalize(t.rawName) === normalize(enName));

    const itemEntry = {
      id: apiItem ? apiItem.id : null,
      name: enName,
      namePt: ptName || enName,
      className: apiItem ? apiItem.class_name : `upgrade_${normalize(enName)}`,
      category: task.category,
      tier: task.tier,
      cost: apiItem ? (apiItem.cost || 0) : 0,

      // Item Cards (Atual / Novo)
      card_en_new: {
        r2Key: cardEnNewTask ? cardEnNewTask.r2Key : null,
        url: cardEnNewTask ? `${R2_PUBLIC_BASE}/${encodeURI(cardEnNewTask.r2Key)}` : null,
        relPath: cardEnNewTask ? cardEnNewTask.r2Key.replace(/^item_card\//, '') : null
      },
      card_pt_new: {
        r2Key: cardPtNewTask ? cardPtNewTask.r2Key : null,
        url: cardPtNewTask ? `${R2_PUBLIC_BASE}/${encodeURI(cardPtNewTask.r2Key)}` : null,
        relPath: cardPtNewTask ? cardPtNewTask.r2Key.replace(/^item_card\//, '') : null
      },

      // Item Cards (Antigo / Old)
      card_en_old: {
        r2Key: cardEnOldTask ? cardEnOldTask.r2Key : null,
        url: cardEnOldTask ? `${R2_PUBLIC_BASE}/${encodeURI(cardEnOldTask.r2Key)}` : null,
        relPath: cardEnOldTask ? cardEnOldTask.r2Key.replace(/^item_card\//, '') : null
      },
      card_pt_old: {
        r2Key: cardPtOldTask ? cardPtOldTask.r2Key : null,
        url: cardPtOldTask ? `${R2_PUBLIC_BASE}/${encodeURI(cardPtOldTask.r2Key)}` : null,
        relPath: cardPtOldTask ? cardPtOldTask.r2Key.replace(/^item_card\//, '') : null
      },

      // Item Description (EN)
      description_en: {
        r2Key: descEnTask ? descEnTask.r2Key : null,
        url: descEnTask ? `${R2_PUBLIC_BASE}/${encodeURI(descEnTask.r2Key)}` : null,
        relPath: descEnTask ? descEnTask.r2Key.replace(/^item_description\//, '') : null
      },

      // Campos retrocompatíveis padrão (apontando para card_en_new e description_en)
      r2Key: descEnTask ? descEnTask.r2Key : null,
      url: descEnTask ? `${R2_PUBLIC_BASE}/${encodeURI(descEnTask.r2Key)}` : null,
      iconR2Key: cardEnNewTask ? cardEnNewTask.r2Key : null,
      iconUrl: cardEnNewTask ? `${R2_PUBLIC_BASE}/${encodeURI(cardEnNewTask.r2Key)}` : null,
      relPath: descEnTask ? `${task.category}\\${task.tier}\\${task.rawName}.png` : null,
      iconRelPath: cardEnNewTask ? `${task.category}\\${task.tier}\\${cardEnNewTask.file}` : null
    };

    catalogItems.push(itemEntry);
  }

  const catalog = {
    version: '3.0.0',
    updatedAt: new Date().toISOString(),
    totalItems: catalogItems.length,
    totalHeroes: catalogHeroes.length,
    styles: [
      { id: 'card_en_new', label: 'Item Card (Atual) - EN', lang: 'en', type: 'card', version: 'new' },
      { id: 'card_pt_new', label: 'Item Card (Atual) - PT', lang: 'pt', type: 'card', version: 'new' },
      { id: 'card_en_old', label: 'Item Card (Antigo) - EN', lang: 'en', type: 'card', version: 'old' },
      { id: 'card_pt_old', label: 'Item Card (Antigo) - PT', lang: 'pt', type: 'card', version: 'old' },
      { id: 'desc_en', label: 'Item Description - EN', lang: 'en', type: 'description', version: 'current' }
    ],
    items: catalogItems,
    heroes: catalogHeroes
  };

  const catalogJsonStr = JSON.stringify(catalog, null, 2);
  const catalogLocalPath = path.join(__dirname, 'tests_and_data', 'catalog.json');
  fs.writeFileSync(catalogLocalPath, catalogJsonStr, 'utf8');
  console.log(`✅ catalog.json local salvo com ${catalogItems.length} itens.`);

  // Upload do catalog.json para o R2
  console.log('☁️ Fazendo upload do catalog.json para o Cloudflare R2...');
  const catBuffer = Buffer.from(catalogJsonStr, 'utf8');
  const catPublicUrl = await uploadToR2('catalog.json', catBuffer, 'application/json');
  console.log(`✅ catalog.json publicado no R2: ${catPublicUrl}`);

  console.log('\n======================================================');
  console.log('🎉 SINCRONIZAÇÃO COMPLETA COM R2 CONCLUÍDA!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});

