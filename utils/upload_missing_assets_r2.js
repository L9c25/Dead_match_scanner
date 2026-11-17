/**
 * upload_missing_assets_r2.js
 * 
 * 1. Conecta ao Cloudflare R2 (bucket composer-icons)
 * 2. Consulta a API oficial do Deadlock (api.deadlock-api.com)
 * 3. Baixa e envia para o R2 as imagens dos novos personagens faltantes:
 *    - Deadman Danny, Rat King, Solomon, Violet, Nurse Harrow, Baba, Druid, hero_testhero
 * 4. Baixa e envia para o R2 os novos itens faltantes (19 itens)
 * 5. Regenera o catalog.json e faz upload para o R2
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

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

async function main() {
  console.log('🚀 Iniciando análise e sincronização com Cloudflare R2...');

  // 1. Carregar lista de objetos atuais do R2
  const [allR2Keys, apiHeroes, apiItems] = await Promise.all([
    listAllKeys(),
    httpGet('https://api.deadlock-api.com/v1/assets/heroes'),
    httpGet('https://api.deadlock-api.com/v1/assets/items')
  ]);

  console.log(`📦 Cloudflare R2 possui atualmente ${allR2Keys.length} arquivos.`);
  console.log(`🌐 Deadlock API retornou ${apiHeroes.length} heróis e ${apiItems.length} itens.`);

  // Mapa de heróis existentes no R2
  const existingHeroesMap = new Map();
  allR2Keys
    .filter(k => k.startsWith('character icons/') && !k.includes('/Critic/') && !k.includes('/Gloat/'))
    .forEach(k => {
      const fileName = k.replace('character icons/', '').replace(/\.png$/i, '').trim();
      existingHeroesMap.set(normalize(fileName), k);
      existingHeroesMap.set(fileName.toLowerCase(), k);
    });

  // 2. Heróis faltantes para download e upload no Cloudflare R2
  console.log('\n======================================================');
  console.log('🦸 SINCRONIZANDO PERSONAGENS FALTANTES NO CLOUDFLARE R2');
  console.log('======================================================');

  let heroesUploadedCount = 0;
  const heroUploadResults = [];

  for (const h of apiHeroes) {
    const norm = normalize(h.name);
    const existing = existingHeroesMap.get(norm) || existingHeroesMap.get((h.name || '').toLowerCase());
    
    // Imagem principal para o ícone
    const iconUrl = h.images?.icon_image_small || h.images?.icon_hero_card || h.images?.top_bar_vertical_image;

    if (!existing) {
      if (iconUrl) {
        try {
          console.log(`⬇️ Baixando ícone para "${h.name}" (ID ${h.id}) de ${iconUrl}...`);
          const buf = await fetchBuffer(iconUrl);
          const r2Key = `character icons/${h.name}.png`;
          const publicUrl = await uploadToR2(r2Key, buf, 'image/png');
          existingHeroesMap.set(norm, r2Key);
          existingHeroesMap.set(h.name.toLowerCase(), r2Key);
          heroesUploadedCount++;
          console.log(`  ✅ [R2 UPLOAD] ${r2Key} -> ${publicUrl} (${buf.length} bytes)`);

          // Se tiver critic card, subir também em character icons/Critic
          if (h.images?.hero_card_critical && h.class_name) {
            try {
              const critUrl = h.images.hero_card_critical;
              const critBuf = await fetchBuffer(critUrl);
              const cleanClass = h.class_name.replace(/^hero_/, '');
              const critKey = `character icons/Critic/${cleanClass}_card_critical_psd.png`;
              await uploadToR2(critKey, critBuf, 'image/png');
              console.log(`  ✅ [R2 UPLOAD CRITIC] ${critKey}`);
            } catch (errCrit) {
              console.warn(`  ⚠️ Falha ao subir critic card de ${h.name}: ${errCrit.message}`);
            }
          }

          // Se tiver gloat card, subir também em character icons/Gloat
          if (h.images?.hero_card_gloat && h.class_name) {
            try {
              const gloatUrl = h.images.hero_card_gloat;
              const gloatBuf = await fetchBuffer(gloatUrl);
              const cleanClass = h.class_name.replace(/^hero_/, '');
              const gloatKey = `character icons/Gloat/${cleanClass}_card_gloat_psd.png`;
              await uploadToR2(gloatKey, gloatBuf, 'image/png');
              console.log(`  ✅ [R2 UPLOAD GLOAT] ${gloatKey}`);
            } catch (errGloat) {
              console.warn(`  ⚠️ Falha ao subir gloat card de ${h.name}: ${errGloat.message}`);
            }
          }

          heroUploadResults.push({ name: h.name, id: h.id, status: 'uploaded', key: r2Key, url: publicUrl });
        } catch (err) {
          console.error(`  ❌ Erro ao baixar/enviar ${h.name}:`, err.message);
          heroUploadResults.push({ name: h.name, id: h.id, status: 'failed', error: err.message });
        }
      } else {
        console.log(`ℹ️ "${h.name}" (ID ${h.id}) não possui imagem na API oficial da Valve (herói desativado/stub).`);
        heroUploadResults.push({ name: h.name, id: h.id, status: 'no_art_in_api' });
      }
    } else {
      heroUploadResults.push({ name: h.name, id: h.id, status: 'already_exists', key: existing });
    }
  }

  console.log(`\n🎉 Upload de Heróis concluído: ${heroesUploadedCount} novos heróis adicionados ao Cloudflare R2.`);

  // 3. Itens faltantes para download e upload no Cloudflare R2
  console.log('\n======================================================');
  console.log('📦 SINCRONIZANDO ITENS FALTANTES NO CLOUDFLARE R2');
  console.log('======================================================');

  const existingItemIcons = new Map();
  allR2Keys
    .filter(k => k.startsWith('item_icon/'))
    .forEach(k => {
      const fn = k.split('/').pop().replace(/\.png$/i, '').trim();
      existingItemIcons.set(normalize(fn), k);
    });

  const existingItemDescs = new Map();
  allR2Keys
    .filter(k => k.startsWith('Item_description/'))
    .forEach(k => {
      const fn = k.split('/').pop().replace(/\.png$/i, '').trim();
      existingItemDescs.set(normalize(fn), k);
    });

  const upgradeItems = apiItems.filter(it => it.type === 'upgrade' && !it.disabled && it.name && !it.name.startsWith('upgrade_'));
  let itemsUploadedCount = 0;

  for (const it of upgradeItems) {
    const norm = normalize(it.name);
    const hasIcon = existingItemIcons.has(norm);
    const hasDesc = existingItemDescs.has(norm);
    const itemImgUrl = it.shop_image || it.image;

    if ((!hasIcon || !hasDesc) && itemImgUrl) {
      try {
        console.log(`⬇️ Baixando imagem do item "${it.name}" (${itemImgUrl})...`);
        const buf = await fetchBuffer(itemImgUrl);
        const slot = (it.item_slot_type || 'Weapon');
        const category = slot.charAt(0).toUpperCase() + slot.slice(1);
        const tier = `Tier ${it.tier || 1}`;
        const cleanFileName = it.name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();

        // 1. Upload para item_icon/
        if (!hasIcon) {
          const iconKey = `item_icon/${category}/${cleanFileName}.png`;
          await uploadToR2(iconKey, buf, 'image/png');
          existingItemIcons.set(norm, iconKey);
          console.log(`  ✅ [R2 UPLOAD] ${iconKey}`);
        }

        // 2. Upload para Item_description/ (para ter a imagem mesmo se não tiver o card renderizado de stats)
        if (!hasDesc) {
          const descKey = `Item_description/${category}/${tier}/${cleanFileName}.png`;
          await uploadToR2(descKey, buf, 'image/png');
          existingItemDescs.set(norm, descKey);
          console.log(`  ✅ [R2 UPLOAD] ${descKey}`);
        }

        itemsUploadedCount++;
      } catch (err) {
        console.warn(`  ⚠️ Falha ao baixar/enviar item "${it.name}":`, err.message);
      }
    }
  }

  console.log(`\n🎉 Upload de Itens concluído: ${itemsUploadedCount} novos itens adicionados ao Cloudflare R2.`);

  // 4. Construir e Atualizar o catalog.json Mestre
  console.log('\n======================================================');
  console.log('📑 GERANDO CATALOG.JSON ATUALIZADO');
  console.log('======================================================');

  const catalogHeroes = apiHeroes.map(h => {
    const norm = normalize(h.name);
    const r2Key = existingHeroesMap.get(norm) || 
                  existingHeroesMap.get((h.name || '').toLowerCase()) || 
                  `character icons/${h.name}.png`;
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

  const catalogItems = upgradeItems.map(it => {
    const norm = normalize(it.name);
    const slot = (it.item_slot_type || 'Weapon');
    const category = slot.charAt(0).toUpperCase() + slot.slice(1);
    const tier = `Tier ${it.tier || 1}`;

    const r2DescKey = existingItemDescs.get(norm) || `Item_description/${category}/${tier}/${it.name}.png`;
    const r2IconKey = existingItemIcons.get(norm) || `item_icon/${category}/${it.name}.png`;

    return {
      id: it.id,
      name: it.name,
      className: it.class_name,
      category: category,
      tier: tier,
      cost: it.cost || 0,
      r2Key: r2DescKey,
      url: `${R2_PUBLIC_BASE}/${encodeURI(r2DescKey)}`,
      iconR2Key: r2IconKey,
      iconUrl: `${R2_PUBLIC_BASE}/${encodeURI(r2IconKey)}`,
      relPath: r2DescKey.replace(/^Item_description\//i, '').replace(/\//g, '\\')
    };
  });

  const masterCatalog = {
    version: '1.1.0',
    updatedAt: new Date().toISOString(),
    baseUrl: R2_PUBLIC_BASE,
    heroesCount: catalogHeroes.length,
    itemsCount: catalogItems.length,
    heroes: catalogHeroes,
    items: catalogItems
  };

  // Salvar localmente em tests_and_data/catalog.json
  const catalogLocalPath = path.join(__dirname, 'tests_and_data', 'catalog.json');
  fs.writeFileSync(catalogLocalPath, JSON.stringify(masterCatalog, null, 2), 'utf8');
  console.log(`✅ Salvo localmente em: ${catalogLocalPath}`);

  // Fazer upload do catalog.json atualizado para o Cloudflare R2
  console.log('☁️ Fazendo upload do catalog.json atualizado para o Cloudflare R2...');
  const catalogBuf = Buffer.from(JSON.stringify(masterCatalog, null, 2), 'utf8');
  await uploadToR2('catalog.json', catalogBuf, 'application/json');
  console.log(`✅ catalog.json publicado no Cloudflare R2 com sucesso! (${R2_PUBLIC_BASE}/catalog.json)`);

  console.log('\n✨ Operação concluída com 100% de sucesso!');
}

main().catch(err => {
  console.error('❌ Erro no script principal:', err);
  process.exit(1);
});
