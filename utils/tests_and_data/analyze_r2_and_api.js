const https = require('https');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const BUCKET = 'composer-icons';
const R2_PUBLIC_BASE = 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev';

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

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/['’`\-_\.\s&]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function listAllKeys() {
  let list = [];
  let token = undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token
    }));
    if (res.Contents) {
      list.push(...res.Contents.map(c => c.Key));
    }
    token = res.NextContinuationToken;
  } while (token);
  return list;
}

async function main() {
  console.log('🔍 Conectando ao Cloudflare R2 (bucket: ' + BUCKET + ')...');
  const allKeys = await listAllKeys();
  console.log(`📦 Total de arquivos no Cloudflare R2: ${allKeys.length}`);

  const heroKeys = allKeys.filter(k => k.startsWith('character icons/'));
  const itemDescKeys = allKeys.filter(k => k.startsWith('Item_description/'));
  const itemIconKeys = allKeys.filter(k => k.startsWith('item_icon/'));
  
  console.log(`- character icons/ (ícones de heróis): ${heroKeys.length}`);
  console.log(`- Item_description/ (descrições de itens): ${itemDescKeys.length}`);
  console.log(`- item_icon/ (ícones de itens): ${itemIconKeys.length}`);

  console.log('\n🌐 Consultando a API oficial do Deadlock (api.deadlock-api.com)...');
  const [apiHeroes, apiItems] = await Promise.all([
    httpGet('https://api.deadlock-api.com/v1/assets/heroes'),
    httpGet('https://api.deadlock-api.com/v1/assets/items')
  ]);

  console.log(`API retornou ${apiHeroes.length} heróis e ${apiItems.length} itens/habilidades.`);

  // Map of existing hero filenames in R2
  const r2DirectHeroFiles = heroKeys
    .filter(k => !k.startsWith('character icons/Critic/'))
    .map(k => k.replace('character icons/', ''));

  const r2HeroesMap = new Map();
  r2DirectHeroFiles.forEach(f => {
    const nameWithoutExt = f.replace(/\.png$/i, '').trim();
    r2HeroesMap.set(normalize(nameWithoutExt), f);
    r2HeroesMap.set(nameWithoutExt.toLowerCase(), f);
  });

  const missingHeroes = [];
  const existingHeroes = [];

  for (const h of apiHeroes) {
    const name = h.name;
    const norm = normalize(name);
    const existingFile = r2HeroesMap.get(norm) || r2HeroesMap.get((name || '').toLowerCase());

    const imgUrl = h.images?.icon_image_small || 
                   h.images?.icon_hero_card || 
                   h.images?.top_bar_vertical_image ||
                   h.images?.minimap_image;

    if (existingFile) {
      existingHeroes.push({
        id: h.id,
        name: h.name,
        className: h.class_name,
        file: existingFile
      });
    } else {
      missingHeroes.push({
        id: h.id,
        name: h.name,
        className: h.class_name,
        disabled: h.disabled,
        in_development: h.in_development,
        hasApiImage: !!imgUrl,
        apiUrl: imgUrl,
        availableImages: Object.keys(h.images || {})
      });
    }
  }

  console.log('\n=============================================');
  console.log(`✅ Heróis encontrados no Cloudflare R2: ${existingHeroes.length}`);
  console.log(`❌ Heróis FALTANTES no Cloudflare R2: ${missingHeroes.length}`);
  console.log('=============================================');

  console.log('\n📋 LISTA DOS PERSONAGENS FALTANTES:');
  missingHeroes.forEach((h, idx) => {
    console.log(`${idx + 1}. [ID ${h.id}] "${h.name}" (classe: ${h.className})`);
    console.log(`   - Tem imagem na API? ${h.hasApiImage ? 'SIM (' + h.apiUrl + ')' : 'NÃO'}`);
    console.log(`   - Em desenvolvimento: ${h.in_development}, Desativado: ${h.disabled}`);
    console.log(`   - Tipos de imagem na API: ${h.availableImages.join(', ')}`);
  });

  // Also check items
  console.log('\n--- VERIFICAÇÃO DE ITENS ---');
  const upgradeItems = apiItems.filter(it => it.type === 'upgrade' && !it.disabled && it.name && !it.name.startsWith('upgrade_'));
  const r2ItemsMap = new Map();
  itemDescKeys.forEach(k => {
    const fn = k.split('/').pop().replace(/\.png$/i, '').trim();
    r2ItemsMap.set(normalize(fn), k);
  });
  const r2ItemIconsMap = new Map();
  itemIconKeys.forEach(k => {
    const fn = k.split('/').pop().replace(/\.png$/i, '').trim();
    r2ItemIconsMap.set(normalize(fn), k);
  });

  const missingDescItems = [];
  const missingIconItems = [];

  for (const it of upgradeItems) {
    const norm = normalize(it.name);
    if (!r2ItemsMap.has(norm)) {
      missingDescItems.push({ id: it.id, name: it.name, shop_image: it.shop_image, image: it.image });
    }
    if (!r2ItemIconsMap.has(norm)) {
      missingIconItems.push({ id: it.id, name: it.name, shop_image: it.shop_image, image: it.image });
    }
  }

  console.log(`Itens de upgrade ativos na API: ${upgradeItems.length}`);
  console.log(`Itens faltando em Item_description/: ${missingDescItems.length}`);
  console.log(`Itens faltando em item_icon/: ${missingIconItems.length}`);
  if (missingDescItems.length > 0) {
    console.log('Itens faltando em Item_description/:', missingDescItems.map(i => i.name));
  }
  if (missingIconItems.length > 0) {
    console.log('Itens faltando em item_icon/:', missingIconItems.map(i => i.name));
  }
}

main().catch(console.error);
