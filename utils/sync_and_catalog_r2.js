/**
 * sync_and_catalog_r2.js
 * 1. Scans existing files in Cloudflare R2 bucket `composer-icons`
 * 2. Fetches missing Deadlock heroes and items from official Deadlock API
 * 3. Uploads missing PNGs to R2
 * 4. Generates a master `catalog.json` and uploads it to R2
 */

const https = require('https');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
// No external mime-types required

const R2_PUBLIC_BASE = 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev';
const BUCKET = 'composer-icons';

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
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve(d);
        }
      });
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/['’`\-_\.\s&]/g, '')
    .replace(/[^a-z0-9]/g, '');
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

async function uploadBuffer(key, buffer, contentType = 'image/png') {
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
  console.log('📡 1. Lendo dados da Deadlock API e do R2...');
  const [apiHeroes, apiItems, r2HeroKeys, r2ItemKeys] = await Promise.all([
    httpGet('https://api.deadlock-api.com/v1/assets/heroes'),
    httpGet('https://api.deadlock-api.com/v1/assets/items'),
    listAllKeys('character icons/'),
    listAllKeys('Item_description/')
  ]);

  console.log(`✅ API: ${apiHeroes.length} heróis, ${apiItems.length} itens/habilidades.`);
  console.log(`✅ R2: ${r2HeroKeys.length} arquivos em character icons/, ${r2ItemKeys.length} arquivos em Item_description/.`);

  // Build maps of existing R2 files
  const existingHeroesMap = new Map();
  r2HeroKeys.forEach(k => {
    const filename = k.split('/').pop();
    const name = filename.replace(/\.png$/i, '').trim();
    existingHeroesMap.set(normalize(name), k);
    existingHeroesMap.set(name.toLowerCase(), k);
  });

  const existingItemsMap = new Map();
  r2ItemKeys.forEach(k => {
    const filename = k.split('/').pop();
    const name = filename.replace(/\.png$/i, '').trim();
    existingItemsMap.set(normalize(name), k);
    existingItemsMap.set(name.toLowerCase(), k);
  });

  // --- SYNC MISSING HEROES ---
  console.log('\n🦸 2. Verificando heróis faltantes...');
  let heroesUploaded = 0;
  for (const h of apiHeroes) {
    const norm = normalize(h.name);
    if (!existingHeroesMap.has(norm)) {
      const imgUrl = h.images?.icon_image_small || h.images?.icon_hero_card || h.images?.top_bar_vertical_image;
      if (imgUrl) {
        try {
          console.log(`Baixando imagem para o herói: ${h.name} (${imgUrl})...`);
          const buf = await fetchBuffer(imgUrl);
          const key = `character icons/${h.name}.png`;
          await uploadBuffer(key, buf, 'image/png');
          existingHeroesMap.set(norm, key);
          existingHeroesMap.set(h.name.toLowerCase(), key);
          heroesUploaded++;
          console.log(`  -> Enviado para R2: ${key}`);
        } catch (err) {
          console.warn(`  x Falha ao baixar/enviar imagem de ${h.name}:`, err.message);
        }
      }
    }
  }
  console.log(`✨ ${heroesUploaded} novos heróis adicionados ao R2.`);

  // --- SYNC MISSING ITEMS ---
  console.log('\n📦 3. Verificando itens faltantes...');
  let itemsUploaded = 0;
  const upgradeItems = apiItems.filter(it => it.type === 'upgrade' && !it.disabled && it.name && !it.name.startsWith('upgrade_'));
  for (const it of upgradeItems) {
    const norm = normalize(it.name);
    if (!existingItemsMap.has(norm)) {
      const imgUrl = it.shop_image || it.image;
      if (imgUrl) {
        try {
          console.log(`Baixando imagem para o item: ${it.name} (${imgUrl})...`);
          const buf = await fetchBuffer(imgUrl);
          const category = (it.item_slot_type || 'Weapon').charAt(0).toUpperCase() + (it.item_slot_type || 'Weapon').slice(1);
          const tier = `Tier ${it.tier || 1}`;
          const key = `Item_description/${category}/${tier}/${it.name}.png`;
          await uploadBuffer(key, buf, 'image/png');
          existingItemsMap.set(norm, key);
          existingItemsMap.set(it.name.toLowerCase(), key);
          itemsUploaded++;
          console.log(`  -> Enviado para R2: ${key}`);
        } catch (err) {
          console.warn(`  x Falha ao baixar/enviar item ${it.name}:`, err.message);
        }
      }
    }
  }
  console.log(`✨ ${itemsUploaded} novos itens adicionados ao R2.`);

  // --- BUILD MASTER CATALOG JSON ---
  console.log('\n📑 4. Gerando catalog.json mestre...');
  const catalogHeroes = apiHeroes.map(h => {
    const norm = normalize(h.name);
    const r2Key = existingHeroesMap.get(norm) || existingHeroesMap.get((h.name || '').toLowerCase()) || `character icons/${h.name}.png`;
    const r2Url = `${R2_PUBLIC_BASE}/${encodeURI(r2Key)}`;
    return {
      id: h.id,
      name: h.name,
      className: h.class_name,
      r2Key: r2Key,
      url: r2Url,
      fallbackUrl: h.images?.icon_image_small || h.images?.icon_hero_card || r2Url
    };
  });

  const catalogItems = upgradeItems.map(it => {
    const norm = normalize(it.name);
    let r2Key = existingItemsMap.get(norm) || existingItemsMap.get((it.name || '').toLowerCase());
    if (!r2Key) {
      const category = (it.item_slot_type || 'Weapon').charAt(0).toUpperCase() + (it.item_slot_type || 'Weapon').slice(1);
      const tier = `Tier ${it.tier || 1}`;
      r2Key = `Item_description/${category}/${tier}/${it.name}.png`;
    }
    const r2Url = `${R2_PUBLIC_BASE}/${encodeURI(r2Key)}`;
    const category = (it.item_slot_type || 'Weapon').charAt(0).toUpperCase() + (it.item_slot_type || 'Weapon').slice(1);
    const tier = `Tier ${it.tier || 1}`;

    return {
      id: it.id,
      name: it.name,
      className: it.class_name,
      category: category,
      tier: tier,
      cost: it.cost || 0,
      r2Key: r2Key,
      url: r2Url,
      relPath: r2Key.replace(/^Item_description\//i, '').replace(/\//g, '\\')
    };
  });

  const masterCatalog = {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    baseUrl: R2_PUBLIC_BASE,
    heroesCount: catalogHeroes.length,
    itemsCount: catalogItems.length,
    heroes: catalogHeroes,
    items: catalogItems
  };

  // Upload catalog.json to R2
  console.log('Subindo catalog.json para o Cloudflare R2...');
  const catalogBuffer = Buffer.from(JSON.stringify(masterCatalog, null, 2), 'utf-8');
  await uploadBuffer('catalog.json', catalogBuffer, 'application/json');
  console.log(`✅ catalog.json publicado em: ${R2_PUBLIC_BASE}/catalog.json`);

  // Also save locally for instant fallback / offline use
  const fs = require('fs');
  fs.writeFileSync('catalog.json', JSON.stringify(masterCatalog, null, 2));
  console.log('✅ catalog.json salvo localmente no projeto.');
}

main().catch(console.error);
