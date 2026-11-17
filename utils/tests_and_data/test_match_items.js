const fs = require('fs');
const path = require('path');

// Extract embedded catalog from itemsManager.js
const itemsManagerContent = fs.readFileSync(path.join(__dirname, 'js', 'itemsManager.js'), 'utf8');
const match = itemsManagerContent.match(/const EMBEDDED_ITEMS_CATALOG = (\[[\s\S]*?\]);/);
if (!match) {
    console.error('Could not find EMBEDDED_ITEMS_CATALOG');
    process.exit(1);
}
const embeddedCatalog = JSON.parse(match[1]);

const baseDir = 'C:\\Users\\Administrador\\Downloads\\DeadEx\\item_icon';
const categories = ['Weapon', 'Vitality', 'Spirit'];
const iconFiles = [];

for (const cat of categories) {
    const p = path.join(baseDir, cat);
    if (!fs.existsSync(p)) continue;
    const files = fs.readdirSync(p);
    for (const f of files) {
        if (!f.endsWith('.png')) continue;
        iconFiles.push({
            category: cat,
            fileName: f,
            baseName: path.basename(f, '.png'),
            fullPath: path.join(p, f)
        });
    }
}

function normalize(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const iconMap = new Map();
iconFiles.forEach(ic => {
    iconMap.set(normalize(ic.baseName), ic);
});

let matched = 0;
let unmatchedItems = [];

embeddedCatalog.forEach(item => {
    const key = normalize(item.name);
    const found = iconMap.get(key);
    if (found) {
        matched++;
    } else {
        unmatchedItems.push(item.name);
    }
});

console.log(`Matched ${matched} out of ${embeddedCatalog.length} embedded items!`);
console.log('Unmatched items:', unmatchedItems);
