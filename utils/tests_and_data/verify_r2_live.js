const https = require('https');

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

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, res => {
      resolve({ status: res.statusCode, contentType: res.headers['content-type'], size: res.headers['content-length'] });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function verifyAll() {
  console.log('--- TESTANDO CATALOG.JSON NO CLOUDFLARE R2 ---');
  const catalog = await httpGet('https://pub-1262c312111a4da68f9d930a896858bf.r2.dev/catalog.json');
  console.log(`Versão: ${catalog.version}`);
  console.log(`Heróis cadastrados: ${catalog.heroesCount}`);
  console.log(`Itens cadastrados: ${catalog.itemsCount}`);
  console.log(`Data de atualização: ${catalog.updatedAt}`);

  console.log('\n--- VERIFICANDO NOVOS HERÓIS DIRETAMENTE NO CLOUDFLARE R2 ---');
  const newHeroNames = ['Deadman Danny', 'Rat King', 'Solomon', 'Violet', 'Nurse Harrow', 'Baba', 'Druid', 'hero_testhero'];
  for (const name of newHeroNames) {
    const url = `https://pub-1262c312111a4da68f9d930a896858bf.r2.dev/character%20icons/${encodeURIComponent(name)}.png`;
    const res = await checkUrl(url);
    console.log(`🦸 ${name}: status ${res.status}, size: ${res.size} bytes (${url})`);
  }

  console.log('\n--- VERIFICANDO NOVOS ITENS NO CLOUDFLARE R2 ---');
  const sampleItems = ['Omnicharge Signet', 'Shrink Ray', 'Infinite Rounds', 'Express Shot', 'Trophy Collector'];
  for (const name of sampleItems) {
    const heroItem = catalog.items.find(i => i.name === name);
    if (heroItem) {
      const resIcon = await checkUrl(heroItem.iconUrl);
      const resDesc = await checkUrl(heroItem.url);
      console.log(`📦 ${name}: icon=${resIcon.status} (${resIcon.size}b), desc=${resDesc.status} (${resDesc.size}b)`);
    }
  }
}

verifyAll().catch(console.error);
