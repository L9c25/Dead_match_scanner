const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\Administrador\\Downloads\\DeadEx\\item_icon';
const categories = ['Weapon', 'Vitality', 'Spirit'];

const catalog = [];

for (const cat of categories) {
    const p = path.join(baseDir, cat);
    if (!fs.existsSync(p)) continue;
    const files = fs.readdirSync(p);
    for (const f of files) {
        if (!f.endsWith('.png')) continue;
        catalog.push({
            category: cat,
            fileName: f,
            baseName: path.basename(f, '.png'),
            fullPath: path.join(p, f)
        });
    }
}

console.log('Total valid icon files in Spirit, Vitality, Weapon:', catalog.length);
console.log('Sample files:');
console.log(catalog.slice(0, 20).map(c => `${c.category} -> ${c.fileName}`));
