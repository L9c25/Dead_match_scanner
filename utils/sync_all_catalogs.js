const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');

const BUCKET = 'composer-icons';
const R2_PUBLIC_BASE = 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev';
const LOCAL_DIR = 'C:/Users/Administrador/Downloads/DeadEx/Item_description';

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

async function main() {
  console.log('🔄 Sincronizando catálogos e arquivos JSON do projeto...');

  // 1. Atualizar items_db.json
  const localFiles = getAllFiles(LOCAL_DIR);
  const itemsDb = localFiles.map(filePath => {
    const rel = path.relative(LOCAL_DIR, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    return {
      name: fileName,
      rel: rel,
      fullPath: filePath
    };
  });
  const itemsDbPath = path.join(__dirname, 'tests_and_data', 'items_db.json');
  fs.writeFileSync(itemsDbPath, JSON.stringify(itemsDb, null, 2), 'utf8');
  console.log(`✅ items_db.json atualizado com ${itemsDb.length} itens locais.`);

  // 2. Atualizar catalog.json
  const catalogPath = path.join(__dirname, 'tests_and_data', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  catalog.updatedAt = new Date().toISOString();

  // Atualizar itens renomeados mantendo aliases
  let foundShredder = false;
  let foundPiercer = false;

  catalog.items = catalog.items.map(item => {
    if (item.name === 'Spirit Shredder Bullets' || item.name === 'Spirit Shredder') {
      foundShredder = true;
      return {
        ...item,
        name: 'Spirit Shredder',
        tier: 'Tier 2',
        r2Key: 'Item_description/Weapon/Tier 2/Spirit Shredder.png',
        url: `${R2_PUBLIC_BASE}/Item_description/Weapon/Tier%202/Spirit%20Shredder.png`,
        relPath: 'Weapon\\Tier 2\\Spirit Shredder.png',
        iconR2Key: 'item_icon/Weapon/Spirit ShredderBullets.png',
        iconUrl: `${R2_PUBLIC_BASE}/item_icon/Weapon/Spirit%20ShredderBullets.png`,
        iconRelPath: 'item_icon\\Weapon\\Spirit ShredderBullets.png',
        aliases: ['Spirit Shredder Bullets']
      };
    }
    if (item.name === 'Armor Piercing Rounds' || item.name === 'Armor Piercer') {
      foundPiercer = true;
      return {
        ...item,
        name: 'Armor Piercer',
        tier: 'Tier 4',
        r2Key: 'Item_description/Weapon/Tier 4/Armor Piercer.png',
        url: `${R2_PUBLIC_BASE}/Item_description/Weapon/Tier%204/Armor%20Piercer.png`,
        relPath: 'Weapon\\Tier 4\\Armor Piercer.png',
        iconR2Key: 'item_icon/Weapon/Armor PiercingRounds.png',
        iconUrl: `${R2_PUBLIC_BASE}/item_icon/Weapon/Armor%20PiercingRounds.png`,
        iconRelPath: 'item_icon\\Weapon\\Armor PiercingRounds.png',
        aliases: ['Armor Piercing Rounds']
      };
    }
    return item;
  });

  // Atualizar lista de itemIcons
  if (Array.isArray(catalog.itemIcons)) {
    const addIconIfMissing = (norm, file, cat) => {
      if (!catalog.itemIcons.some(ic => ic.norm === norm)) {
        catalog.itemIcons.push({
          cat: cat,
          file: file,
          r2Key: `item_icon/${cat}/${file}`,
          url: `${R2_PUBLIC_BASE}/item_icon/${cat}/${encodeURI(file)}`,
          norm: norm
        });
      }
    };
    addIconIfMissing('armorpiercer', 'Armor Piercer.png', 'Weapon');
    addIconIfMissing('spiritshredder', 'Spirit Shredder.png', 'Weapon');
  }

  catalog.itemsCount = catalog.items.length;
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✅ catalog.json local atualizado.`);

  // 3. Subir catalog.json para o R2
  console.log('☁️ Fazendo upload do catalog.json atualizado para o Cloudflare R2...');
  const catalogBuffer = Buffer.from(JSON.stringify(catalog, null, 2), 'utf8');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: 'catalog.json',
    Body: catalogBuffer,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=60'
  }));
  console.log('✅ catalog.json publicado no R2 com sucesso!');

  console.log('\n✨ Sincronização de catálogos concluída!');
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
