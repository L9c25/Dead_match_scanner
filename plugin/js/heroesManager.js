/**
 * HeroesManager - Cloudflare R2 & Local Hero Portrait Manager
 * Loads portraits directly from Cloudflare R2 CDN with local cache and offline fallbacks
 */

const HeroesManager = {
    r2BaseUrl: 'https://pub-1262c312111a4da68f9d930a896858bf.r2.dev',
    heroesMap: new Map(),
    isIndexed: false,

    normalize(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/['’`\-_\.\s&]/g, '')
            .replace(/[^a-z0-9]/g, '');
    },

    getCacheDir() {
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

        // 1. Checa se o usuário definiu uma pasta personalizada
        try {
            const customDir = localStorage.getItem('deadlock_custom_assets_dir');
            if (customDir && fs && fs.existsSync(customDir)) {
                const subHeroes = path.join(customDir, 'heroes');
                if (fs.existsSync(subHeroes)) return subHeroes;

                const subIcons = path.join(customDir, 'character icons');
                if (fs.existsSync(subIcons)) return subIcons;

                const subChar = path.join(customDir, 'character_icons');
                if (fs.existsSync(subChar)) return subChar;

                // Se a pasta já tiver imagens de heróis diretas
                return customDir;
            }
        } catch (eCustom) {}

        const appData = process.env.APPDATA || (os ? path.join(os.homedir(), 'AppData', 'Roaming') : null);
        if (appData) {
            return path.join(appData, 'DeadlockMatchScanner', 'cache', 'heroes');
        }
        return null;
    },

    /**
     * Index catalog and local cached icons
     */
    init() {
        return this.indexDirectory();
    },

    indexDirectory() {
        this.heroesMap.clear();

        // 1. Try to index from local cache dir if exists
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

        const cacheDir = this.getCacheDir();
        if (fs && path && cacheDir && fs.existsSync(cacheDir)) {
            try {
                const list = fs.readdirSync(cacheDir);
                list.forEach(file => {
                    if (file.toLowerCase().endsWith('.png')) {
                        const fullPath = path.join(cacheDir, file);
                        const rawName = path.basename(file, path.extname(file)).trim();
                        const normKey = this.normalize(rawName);
                        this.heroesMap.set(normKey, {
                            name: rawName,
                            fullPath: fullPath,
                            fileName: file,
                            cached: true
                        });
                    }
                });
            } catch (err) {
                console.warn('[HeroesManager] Erro ao indexar cache local de heróis:', err);
            }
        }

        this.isIndexed = true;
    },

    /**
     * Get image URL for a hero:
     * 1. If cached locally in Node.js fs, returns base64 Data URL or file:// URI
     * 2. Otherwise returns direct Cloudflare R2 Web CDN URL
     */
    getHeroImage(heroName) {
        if (!this.isIndexed) {
            this.init();
        }

        if (!heroName) {
            return `${this.r2BaseUrl}/character%20icons/Abrams.png`;
        }

        const normKey = this.normalize(heroName);
        let found = this.heroesMap.get(normKey) || this.heroesMap.get(heroName.toLowerCase());

        // Fuzzy match if needed
        if (!found) {
            for (const [k, val] of this.heroesMap.entries()) {
                if (normKey.length >= 3 && (k.includes(normKey) || normKey.includes(k))) {
                    found = val;
                    break;
                }
            }
        }

        // 1. If local cached file exists, read as Base64 for instant display in CEP
        if (found && found.fullPath) {
            let fs = null;
            try {
                if (typeof window !== 'undefined' && window.require) {
                    fs = window.require('fs');
                } else if (typeof require !== 'undefined') {
                    fs = require('fs');
                }
            } catch (e) {}

            if (fs && fs.existsSync(found.fullPath)) {
                try {
                    const buf = fs.readFileSync(found.fullPath);
                    return `data:image/png;base64,${buf.toString('base64')}`;
                } catch (e) {}
            }
        }

        // 2. Direct Cloudflare R2 Web CDN URL
        const cleanName = encodeURIComponent(heroName.trim());
        const r2Url = `${this.r2BaseUrl}/character%20icons/${cleanName}.png`;

        // Trigger background download to local cache if Node.js fs is available
        this.cacheHeroImageAsync(heroName, r2Url);

        return r2Url;
    },

    /**
     * Background async cache helper
     */
    async cacheHeroImageAsync(heroName, url) {
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

        const cacheDir = this.getCacheDir();
        if (!fs || !path || !cacheDir) return;

        try {
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }
            const filePath = path.join(cacheDir, `${heroName}.png`);
            if (fs.existsSync(filePath)) return;

            let buffer = null;
            const fetchFn = (typeof fetch !== 'undefined') ? fetch : (typeof window !== 'undefined' ? window.fetch : null);
            if (fetchFn) {
                const res = await fetchFn(url);
                if (res.ok) {
                    const arrayBuf = await res.arrayBuffer();
                    buffer = Buffer.from(arrayBuf);
                }
            }

            if (buffer) {
                fs.writeFileSync(filePath, buffer);
                const normKey = this.normalize(heroName);
                this.heroesMap.set(normKey, {
                    name: heroName,
                    fullPath: filePath,
                    fileName: `${heroName}.png`,
                    cached: true
                });
            }
        } catch (err) {
            // Silently ignore background caching errors
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeroesManager;
}
if (typeof window !== 'undefined') {
    window.HeroesManager = HeroesManager;
}
