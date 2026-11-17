const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\Administrador\\Downloads\\DeadEx\\item_icon';

function scan(dir, depth = 0) {
    if (!fs.existsSync(dir)) {
        console.log('Dir does not exist:', dir);
        return;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const indent = '  '.repeat(depth);
        if (e.isDirectory()) {
            console.log(`${indent}[DIR] ${e.name}`);
            if (depth < 3) {
                scan(path.join(dir, e.name), depth + 1);
            }
        } else {
            console.log(`${indent}[FILE] ${e.name}`);
        }
    }
}

console.log('Scanning:', baseDir);
scan(baseDir);
