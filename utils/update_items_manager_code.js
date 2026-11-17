const fs = require('fs');
const path = require('path');

const catalog = require('./tests_and_data/catalog.json');
const itemsManagerPath = path.join(__dirname, '..', 'plugin', 'js', 'itemsManager.js');

let code = fs.readFileSync(itemsManagerPath, 'utf8');

// 1. Substituir o EMBEDDED_ITEMS_CATALOG
const startCatalog = code.indexOf('const EMBEDDED_ITEMS_CATALOG = [');
const endCatalog = code.indexOf('const ItemsManager = {');

if (startCatalog === -1 || endCatalog === -1) {
  console.error('Marcadores de catálogo não encontrados!');
  process.exit(1);
}

const newCatalogJs = 'const EMBEDDED_ITEMS_CATALOG = ' + JSON.stringify(catalog.items, null, 2) + ';\n\n';

// 2. Construir o novo corpo do ItemsManager com suporte completo às tags
const newItemsManagerBody = `const ItemsManager = {
    r2BaseUrl: R2_ITEMS_BASE,
    itemsIndex: new Map(),
    isIndexed: false,

    normalize(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/['’\`\\-_\\.\\s]/g, '')
            .replace(/[^a-z0-9]/g, '');
    },

    CUSTOM_ASSETS_DIR_KEY: 'deadlock_custom_assets_dir',
    ITEM_STYLE_KEY: 'deadlock_item_style_pref',
    _currentStyle: null,

    // Estilos válidos:
    // 'card_pt_new' (padrão)
    // 'card_en_new'
    // 'card_pt_old'
    // 'card_en_old'
    // 'description_en'
    // 'both' (card_pt_new + description_en)
    VALID_STYLES: ['card_pt_new', 'card_en_new', 'card_pt_old', 'card_en_old', 'description_en', 'both'],

    getItemStyle() {
        if (this._currentStyle) return this._currentStyle;
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem) {
                const saved = localStorage.getItem(this.ITEM_STYLE_KEY);
                if (saved) {
                    if (this.VALID_STYLES.includes(saved)) return saved;
                    // Migração de valores antigos
                    if (saved === 'icon') return 'card_pt_new';
                    if (saved === 'description') return 'description_en';
                }
            }
        } catch (e) {}
        return this._currentStyle || 'card_pt_new';
    },

    setItemStyle(style) {
        let valid = 'card_pt_new';
        if (this.VALID_STYLES.includes(style)) {
            valid = style;
        } else if (style === 'icon') {
            valid = 'card_pt_new';
        } else if (style === 'description') {
            valid = 'description_en';
        }

        this._currentStyle = valid;
        try {
            if (typeof localStorage !== 'undefined' && localStorage.setItem) {
                localStorage.setItem(this.ITEM_STYLE_KEY, valid);
            }
        } catch (e) {}
        this.indexDirectory();
        return valid;
    },

    getCustomAssetsDir() {
        try {
            return localStorage.getItem(this.CUSTOM_ASSETS_DIR_KEY);
        } catch (e) {
            return null;
        }
    },

    setCustomAssetsDir(dirPath) {
        try {
            if (dirPath && dirPath.trim()) {
                localStorage.setItem(this.CUSTOM_ASSETS_DIR_KEY, dirPath.trim());
            } else {
                localStorage.removeItem(this.CUSTOM_ASSETS_DIR_KEY);
            }
        } catch (e) {}
        this.indexDirectory();
        if (typeof HeroesManager !== 'undefined' && typeof HeroesManager.init === 'function') {
            HeroesManager.init();
        }
        return this.checkLocalAssetsStatus();
    },

    checkLocalAssetsStatus() {
        const cacheDir = this.getCacheDir();
        let fs = null;
        try {
            if (typeof window !== 'undefined' && window.require) fs = window.require('fs');
            else if (typeof require !== 'undefined') fs = require('fs');
        } catch (e) {}

        const exists = !!(fs && cacheDir && fs.existsSync(cacheDir));
        const cachedCount = Array.from(this.itemsIndex.values()).filter(x => x.isCached).length;
        const hasAssets = cachedCount >= 10;

        return {
            exists,
            dirPath: cacheDir,
            customDir: this.getCustomAssetsDir(),
            cachedCount,
            itemCount: cachedCount,
            totalItems: EMBEDDED_ITEMS_CATALOG.length,
            hasAssets,
            isReady: hasAssets
        };
    },

    getCacheDir(styleOverride) {
        let path = null;
        let os = null;
        let fs = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                path = window.require('path');
                os = window.require('os');
                fs = window.require('fs');
            } else if (typeof require !== 'undefined') {
                path = require('path');
                os = require('os');
                fs = require('fs');
            }
        } catch (e) {}

        if (!path) return null;

        const effectiveStyle = styleOverride || (this.getItemStyle() === 'both' ? 'card_pt_new' : this.getItemStyle());

        // 1. Diretório customizado
        const customDir = this.getCustomAssetsDir();
        if (customDir && fs && fs.existsSync(customDir)) {
            const subDir = path.join(customDir, effectiveStyle);
            if (fs.existsSync(subDir)) return subDir;
            return customDir;
        }

        // 2. AppData padrão
        let appData = null;
        if (typeof process !== 'undefined' && process.env && process.env.APPDATA) {
            appData = process.env.APPDATA;
        } else if (os && typeof os.homedir === 'function') {
            appData = path.join(os.homedir(), 'AppData', 'Roaming');
        } else if (typeof process !== 'undefined' && process.env && process.env.USERPROFILE) {
            appData = path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
        }

        if (appData) {
            const fullDir = path.join(appData, 'DeadlockMatchScanner', effectiveStyle);
            if (fs && !fs.existsSync(fullDir)) {
                try { fs.mkdirSync(fullDir, { recursive: true }); } catch (e) {}
            }
            return fullDir;
        }
        return null;
    },

    getManifestPath() {
        let path = null;
        let os = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                path = window.require('path');
                os = window.require('os');
            } else if (typeof require !== 'undefined') {
                path = require('path');
                os = require('os');
            }
        } catch (e) {}

        if (!path) return null;
        const appData = (typeof process !== 'undefined' && process.env && process.env.APPDATA) || (os && typeof os.homedir === 'function' ? path.join(os.homedir(), 'AppData', 'Roaming') : null);
        return appData ? path.join(appData, 'DeadlockMatchScanner', 'cache_manifest.json') : null;
    },

    loadManifest() {
        let fs = null;
        try {
            if (typeof window !== 'undefined' && window.require) fs = window.require('fs');
            else if (typeof require !== 'undefined') fs = require('fs');
        } catch (e) {}

        const p = this.getManifestPath();
        if (fs && p && fs.existsSync(p)) {
            try {
                return JSON.parse(fs.readFileSync(p, 'utf8'));
            } catch (e) {}
        }
        return { version: 1, items: {}, heroes: {}, catalogUpdatedAt: null };
    },

    saveManifest(data) {
        let fs = null;
        let path = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                fs = window.require('fs');
                path = window.require('path');
            } else if (typeof require !== 'undefined') {
                fs = require('fs');
                path = require('path');
            }
        } catch (e) {}

        const p = this.getManifestPath();
        if (fs && path && p) {
            try {
                const dir = path.dirname(p);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
            } catch (e) {}
        }
    },

    async fetchRemoteCatalog() {
        const url = \`\${this.r2BaseUrl}/catalog.json?_t=\${Date.now()}\`;
        try {
            if (typeof window !== 'undefined' && window.fetch) {
                const res = await window.fetch(url);
                if (res.ok) return await res.json();
            } else if (typeof require !== 'undefined') {
                const https = require('https');
                return new Promise((resolve, reject) => {
                    https.get(url, (res) => {
                        let d = '';
                        res.on('data', c => d += c);
                        res.on('end', () => {
                            try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
                        });
                    }).on('error', reject);
                });
            }
        } catch (e) {
            console.warn('[ItemsManager] Falha ao consultar catalog.json:', e.message);
        }
        return null;
    },

    async syncRemoteCatalog(force = false) {
        try {
            const manifest = this.loadManifest();
            const remoteData = await this.fetchRemoteCatalog();
            if (remoteData && remoteData.items) {
                manifest.catalogUpdatedAt = remoteData.updatedAt || new Date().toISOString();
                this.saveManifest(manifest);
                this.indexDirectory();
                return { success: true, count: remoteData.items.length };
            }
        } catch (err) {
            console.warn('[ItemsManager] Erro na sincronização:', err);
        }
        return { success: false };
    },

    // Extrai o asset correto de um item conforme o estilo selecionado
    getItemAssetForStyle(item, style) {
        if (!item) return null;
        const targetStyle = style || this.getItemStyle();
        
        switch (targetStyle) {
            case 'card_pt_new':
                return item.card_pt_new || item.card_en_new || null;
            case 'card_en_new':
                return item.card_en_new || null;
            case 'card_pt_old':
                return item.card_pt_old || item.card_en_old || null;
            case 'card_en_old':
                return item.card_en_old || null;
            case 'description_en':
                return item.description_en || null;
            default:
                return item.card_pt_new || item.card_en_new || item.description_en || null;
        }
    },

    indexDirectory() {
        this.itemsIndex.clear();

        let fs = null;
        let path = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                fs = window.require('fs');
                path = window.require('path');
            } else if (typeof require !== 'undefined') {
                fs = require('fs');
                path = require('path');
            }
        } catch (e) {}

        const currentStyle = this.getItemStyle();
        const effectiveStyle = (currentStyle === 'both') ? 'card_pt_new' : currentStyle;
        const cacheDir = this.getCacheDir(effectiveStyle);

        EMBEDDED_ITEMS_CATALOG.forEach(item => {
            const normEn = this.normalize(item.name);
            const normPt = this.normalize(item.namePt);

            const activeAsset = this.getItemAssetForStyle(item, effectiveStyle);
            const descAsset = this.getItemAssetForStyle(item, 'description_en');
            const cardAsset = this.getItemAssetForStyle(item, 'card_pt_new');

            const r2Key = activeAsset ? activeAsset.r2Key : item.r2Key;
            const r2Url = activeAsset ? activeAsset.url : item.url;
            const rel = activeAsset ? (activeAsset.relPath ? activeAsset.relPath.replace(/\\//g, '\\\\') : '') : '';

            let localFullPath = null;
            let isCached = false;

            if (path && cacheDir && rel) {
                localFullPath = path.join(cacheDir, path.basename(rel));
                if (fs && fs.existsSync(localFullPath)) {
                    isCached = true;
                }
            }

            const entry = {
                rawName: item.name,
                name: item.name,
                namePt: item.namePt || item.name,
                category: item.category,
                tier: item.tier,
                cost: item.cost || 0,
                relPath: rel,
                r2Key: r2Key,
                url: r2Url,
                activeAsset: activeAsset,
                cardAsset: cardAsset,
                descAsset: descAsset,
                card_pt_new: item.card_pt_new,
                card_en_new: item.card_en_new,
                card_pt_old: item.card_pt_old,
                card_en_old: item.card_en_old,
                description_en: item.description_en,
                fullPath: localFullPath,
                localPngPath: localFullPath,
                isCached: isCached
            };

            this.itemsIndex.set(normEn, entry);
            this.itemsIndex.set(item.name.toLowerCase(), entry);
            if (normPt) {
                this.itemsIndex.set(normPt, entry);
                this.itemsIndex.set((item.namePt || '').toLowerCase(), entry);
            }
        });

        this.isIndexed = true;
        return {
            success: true,
            count: EMBEDDED_ITEMS_CATALOG.length,
            cachedCount: Array.from(this.itemsIndex.values()).filter(x => x.isCached).length
        };
    },

    findItem(itemName) {
        if (!this.isIndexed || this.itemsIndex.size === 0) {
            this.indexDirectory();
        }
        if (!itemName) return null;

        const normKey = this.normalize(itemName);
        if (this.itemsIndex.has(normKey)) return this.itemsIndex.get(normKey);

        const lowerKey = itemName.toLowerCase();
        if (this.itemsIndex.has(lowerKey)) return this.itemsIndex.get(lowerKey);

        // Fuzzy match
        for (const [k, val] of this.itemsIndex.entries()) {
            if (normKey.length >= 4 && (k.includes(normKey) || normKey.includes(k))) {
                return val;
            }
        }
        return null;
    },

    async ensureLocalPng(item, styleOverride) {
        if (!item) return null;

        if (!styleOverride && this.getItemStyle() === 'both') {
            const cardPath = await this.ensureLocalPng(item, 'card_pt_new');
            const descPath = await this.ensureLocalPng(item, 'description_en');
            item.localPngPath = cardPath;
            item.localDescPngPath = descPath;
            item.fullPath = cardPath;
            item.isCached = !!(cardPath && descPath);
            return cardPath;
        }

        const effectiveStyle = styleOverride || (this.getItemStyle() === 'both' ? 'card_pt_new' : this.getItemStyle());
        const rawName = item.rawName || item.name || (item.itemRef ? item.itemRef.rawName : '');
        const master = this.findItem(rawName);

        let fs = null;
        let path = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                fs = window.require('fs');
                path = window.require('path');
            } else if (typeof require !== 'undefined') {
                fs = require('fs');
                path = require('path');
            }
        } catch (e) {}

        const cacheDir = this.getCacheDir(effectiveStyle);
        if (!fs || !path || !cacheDir) {
            return item.localPngPath || item.fullPath || null;
        }

        const asset = master ? this.getItemAssetForStyle(master, effectiveStyle) : null;
        if (!asset || !asset.url) return null;

        const fileName = path.basename(asset.relPath || asset.r2Key);
        const localPath = path.join(cacheDir, fileName);

        const applyFound = (foundPath) => {
            if (effectiveStyle === 'description_en') {
                item.localDescPngPath = foundPath;
            } else {
                item.localPngPath = foundPath;
            }
            if (!styleOverride) item.fullPath = foundPath;
            item.isCached = true;
            return foundPath;
        };

        if (fs.existsSync(localPath)) {
            try {
                const stat = fs.statSync(localPath);
                if (stat.size > 200) return applyFound(localPath);
            } catch (eStat) {}
        }

        // Garantir diretório
        if (!fs.existsSync(cacheDir)) {
            try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (eMk) {}
        }

        // GATEKEEPER PRO
        const isUserPro = (typeof LicenseManager !== 'undefined' && typeof LicenseManager.isPro === 'function') ? LicenseManager.isPro() : true;
        if (!isUserPro) {
            item.isProRequired = true;
            return null;
        }

        // Download PNG
        try {
            let buffer = null;
            if (typeof window !== 'undefined' && window.fetch) {
                try {
                    const res = await window.fetch(asset.url);
                    if (res.ok) {
                        const ab = await res.arrayBuffer();
                        if (typeof Buffer !== 'undefined') {
                            buffer = Buffer.from(ab);
                        } else if (window.require) {
                            const { Buffer: NodeBuf } = window.require('buffer');
                            buffer = NodeBuf.from(ab);
                        } else {
                            buffer = new Uint8Array(ab);
                        }
                    }
                } catch (eFetch) {}
            }

            if (!buffer && typeof require !== 'undefined') {
                const https = require('https');
                buffer = await new Promise((resolve, reject) => {
                    https.get(asset.url, (res) => {
                        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                            return https.get(res.headers.location, r2 => {
                                const chunks = [];
                                r2.on('data', c => chunks.push(c));
                                r2.on('end', () => resolve(Buffer.concat(chunks)));
                            }).on('error', reject);
                        }
                        const chunks = [];
                        res.on('data', c => chunks.push(c));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                    }).on('error', reject);
                });
            }

            if (buffer && buffer.length > 200) {
                fs.writeFileSync(localPath, buffer);
                return applyFound(localPath);
            }
        } catch (errDl) {
            console.warn('[ItemsManager] Erro no download de ' + asset.url + ':', errDl.message);
        }

        if (fs.existsSync(localPath)) return applyFound(localPath);
        return null;
    },

    async cacheAllMatchItems(itemsList, onProgress) {
        if (!itemsList || itemsList.length === 0) return;
        let completed = 0;
        const total = itemsList.length;

        const downloadPromises = itemsList.map(async (it) => {
            const localPath = await this.ensureLocalPng(it);
            completed++;
            if (typeof onProgress === 'function') {
                onProgress(completed, total, it.name || it.rawName);
            }
            return localPath;
        });

        await Promise.all(downloadPromises);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemsManager;
}
if (typeof window !== 'undefined') {
    window.ItemsManager = ItemsManager;
}
`;

const updatedFullCode = code.slice(0, startCatalog) + newCatalogJs + newItemsManagerBody;
fs.writeFileSync(itemsManagerPath, updatedFullCode, 'utf8');
console.log('✅ itemsManager.js atualizado com sucesso com 156 itens e novo motor de tags!');

