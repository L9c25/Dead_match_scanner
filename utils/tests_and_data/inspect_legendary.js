const fs = require('fs');
const path = 'C:\\Users\\Administrador\\Downloads\\DeadEx\\item_icon\\Legendary';
console.log(fs.existsSync(path) ? fs.readdirSync(path) : 'Does not exist');
