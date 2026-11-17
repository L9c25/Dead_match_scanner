/**
 * DeadlockApi - Service to fetch match and asset data from Deadlock API
 */
const DeadlockApi = {
    baseUrl: 'https://api.deadlock-api.com/v1',
    heroesCache: null,
    itemsCache: null,

    getItemsManager() {
        if (typeof ItemsManager !== 'undefined') {
            return ItemsManager;
        }
        if (typeof window !== 'undefined' && window.ItemsManager) {
            return window.ItemsManager;
        }
        if (typeof require !== 'undefined') {
            try {
                return require('./itemsManager.js');
            } catch (e) {}
        }
        return null;
    },

    getHeroesManager() {
        if (typeof HeroesManager !== 'undefined') {
            return HeroesManager;
        }
        if (typeof window !== 'undefined' && window.HeroesManager) {
            return window.HeroesManager;
        }
        if (typeof require !== 'undefined') {
            try {
                return require('./heroesManager.js');
            } catch (e) {}
        }
        return null;
    },

    /**
     * Helper to perform HTTP GET (supports Node.js https and browser fetch)
     */
    async httpGet(url) {
        if (typeof window !== 'undefined' && window.fetch) {
            const resp = await window.fetch(url);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            }
            return await resp.json();
        } else if (typeof fetch !== 'undefined') {
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            }
            return await resp.json();
        } else if (typeof require !== 'undefined') {
            const https = require('https');
            return new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                    let raw = '';
                    res.on('data', chunk => raw += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(raw));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', reject);
            });
        } else {
            throw new Error('Nenhum cliente HTTP suportado no ambiente.');
        }
    },

    /**
     * Load and cache all Deadlock heroes and items assets
     */
    async loadAssets() {
        if (this.heroesCache && this.itemsCache) {
            return { heroes: this.heroesCache, items: this.itemsCache };
        }

        console.log('[DeadlockApi] Baixando banco de assets da API...');
        const [heroesList, itemsList] = await Promise.all([
            this.httpGet(`${this.baseUrl}/assets/heroes`),
            this.httpGet(`${this.baseUrl}/assets/items`)
        ]);

        const heroesMap = new Map();
        heroesList.forEach(h => heroesMap.set(h.id, h));

        const itemsMap = new Map();
        itemsList.forEach(it => itemsMap.set(it.id, it));

        this.heroesCache = heroesMap;
        this.itemsCache = itemsMap;
        console.log(`[DeadlockApi] Assets carregados: ${heroesMap.size} heróis, ${itemsMap.size} itens/habilidades.`);
        return { heroes: heroesMap, items: itemsMap };
    },

    /**
     * Format seconds into MM:SS string
     */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    /**
     * Determine tier label from upgrade_info flag
     */
    getUpgradeTierLabel(upgradeInfo) {
        switch (upgradeInfo) {
            case 65537:
                return 'Desbloqueio Inicial';
            case 196609:
                return 'Tier 1 (+1 Pt)';
            case 458753:
                return 'Tier 2 (+2 Pts)';
            case 983041:
                return 'Tier 3 (+5 Pts - Max)';
            default:
                return `Up (${upgradeInfo})`;
        }
    },

    getShortTierLabel(upgradeInfo) {
        switch (upgradeInfo) {
            case 65537:
                return 'T0';
            case 196609:
                return 'T1';
            case 458753:
                return 'T2';
            case 983041:
                return 'T3';
            default:
                return 'UP';
        }
    },

    /**
     * Get marker color index for Premiere Pro:
     * 0 = Green (T0 / Desbloqueio)
     * 7 = Cyan (T1 / Tier 1)
     * 2 = Purple (T2 / Tier 2)
     * 3 = Orange (T3 / Tier 3 Max)
     * 4 = Yellow (Items)
     * 5 = White (Kills)
     * 1 = Red (Deaths)
     */
    getMarkerColorIndex(shortTier) {
        switch (shortTier) {
            case 'kill':
                return 7; // Cyan (Ciano para Abates)
            case 'assist':
                return 3; // Orange (Laranja para Assistências)
            case 'death':
                return 1; // Red (Vermelho para Mortes)
            case 'item':
                return 4; // Yellow (Amarelo para Itens)
            case 'T0':
            case 'T1':
            case 'T2':
            case 'T3':
            default:
                return 5; // White (Cor Branca única para Upgrades de Habilidades)
        }
    },

    /**
     * Fetch match metadata and parse all players, abilities, items, kills, and deaths
     */
    async fetchMatch(matchId) {
        const cleanMatchId = String(matchId).trim().replace(/[^0-9]/g, '');
        if (!cleanMatchId) {
            throw new Error('ID de partida inválido.');
        }

        const { heroes, items } = await this.loadAssets();
        const itemsMgr = this.getItemsManager();
        const heroesMgr = this.getHeroesManager();

        let licenseKey = '';
        let hwid = '';

        if (typeof LicenseManager !== 'undefined') {
            const lic = LicenseManager.loadLocalLicense();
            if (lic && lic.licenseKey) licenseKey = lic.licenseKey;
            hwid = LicenseManager.getMachineHardwareId();
        }

        const supabaseUrl = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url) ? 
            SUPABASE_CONFIG.url : 'https://mhuaevxnbvnsozstpkza.supabase.co';
        const anonKey = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.anonKey) ? 
            SUPABASE_CONFIG.anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odWFldnhuYnZuc296c3Rwa3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjA5NzAsImV4cCI6MjEwMzkzNjk3MH0.V8v-DCsb4z5GLQ13htg6paO_3I-F4-Zeg7hJJy59Yvg';

        const endpoint = `${supabaseUrl}/functions/v1/fetch-match`;

        let matchData = null;

        // Tentar via Servidor Seguro Supabase primeiro (para validação de licença quando ativo)
        try {
            console.log(`[DeadlockApi] Buscando partida ${cleanMatchId} via Servidor Seguro Supabase...`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey
                },
                body: JSON.stringify({
                    matchId: cleanMatchId,
                    licenseKey: licenseKey,
                    hwid: hwid
                })
            });

            if (res.ok) {
                matchData = await res.json();
            } else {
                console.warn(`[DeadlockApi] Supabase retornou status ${res.status}. Tentando API direta do Deadlock...`);
            }
        } catch (supaErr) {
            console.warn(`[DeadlockApi] Falha na rota Supabase (${supaErr.message}). Utilizando conexão direta com a API do Deadlock...`);
        }

        // Fallback direto para a API oficial do Deadlock se Supabase estiver offline/indisponível
        if (!matchData) {
            console.log(`[DeadlockApi] Buscando partida ${cleanMatchId} diretamente na API oficial...`);
            const directUrl = `${this.baseUrl}/matches/${cleanMatchId}/metadata`;
            matchData = await this.httpGet(directUrl);
        }

        if (!matchData || !matchData.match_info) {
            throw new Error('Dados da partida não encontrados na API.');
        }

        const info = matchData.match_info;
        const durationS = info.duration_s || 0;
        const startTime = info.start_time ? new Date(info.start_time * 1000) : null;
        const winningTeam = info.winning_team !== undefined ? info.winning_team : null;
        const rawPlayers = info.players || [];
        const matchPaths = (info.match_paths && Array.isArray(info.match_paths.paths)) ? info.match_paths.paths : [];

        // Build slot to hero name dictionary for cross-referencing kills/deaths
        const slotToHeroName = {};
        const slotToPlayer = {};
        rawPlayers.forEach(p => {
            const h = heroes.get(p.hero_id);
            slotToHeroName[p.player_slot] = h ? h.name : `Hero #${p.hero_id}`;
            slotToPlayer[p.player_slot] = p;
        });

        // Pre-index coordinate paths for ultra-fast position lookups
        const pathsBySlot = {};
        matchPaths.forEach(pPath => {
            if (pPath && Array.isArray(pPath.x_pos) && Array.isArray(pPath.y_pos)) {
                pathsBySlot[pPath.player_slot] = {
                    xMin: pPath.x_min,
                    yMin: pPath.y_min,
                    scaleX: (pPath.x_max - pPath.x_min) / 16383,
                    scaleY: (pPath.y_max - pPath.y_min) / 16383,
                    xPos: pPath.x_pos,
                    yPos: pPath.y_pos
                };
            }
        });

        const players = rawPlayers.map((p, idx) => {
            const hero = heroes.get(p.hero_id) || {
                name: `Hero #${p.hero_id}`,
                id: p.hero_id,
                images: {}
            };

            const heroImage = heroesMgr ? 
                heroesMgr.getHeroImage(hero.name) : 
                (hero.images?.icon || hero.images?.vertical || `https://assets.deadlock-api.com/v1/heroes/${p.hero_id}/icon.png`);

            const rawItems = (p.items || []).slice().sort((a, b) => a.game_time_s - b.game_time_s);

            const abilitiesTimeline = [];
            const itemsTimeline = [];

            // 1. Parse Abilities & Items
            rawItems.forEach(it => {
                const asset = items.get(it.item_id);
                const assetName = asset ? asset.name : `Item #${it.item_id}`;
                const isAbility = asset && asset.type === 'ability';
                const timeFormatted = this.formatTime(it.game_time_s);

                if (isAbility) {
                    const isUnlock = it.upgrade_info === 65537;
                    const shortTier = this.getShortTierLabel(it.upgrade_info);
                    abilitiesTimeline.push({
                        timeSeconds: it.game_time_s,
                        timeFormatted,
                        abilityId: it.item_id,
                        name: assetName,
                        className: asset.class_name,
                        upgradeInfo: it.upgrade_info,
                        isUnlock,
                        tierLabel: this.getUpgradeTierLabel(it.upgrade_info),
                        shortTier,
                        markerColorIndex: this.getMarkerColorIndex(shortTier),
                        slot: asset.slot_type || 'ability',
                        image: asset.image || `https://assets.deadlock-api.com/v1/items/${it.item_id}/icon.png`
                    });
                } else {
                    const localItem = itemsMgr ? itemsMgr.findItem(assetName) : null;
                    const slotType = asset ? (asset.item_slot_type || asset.slot_type || 'weapon') : 'weapon';
                    const itemImageUrl = localItem ? localItem.url : (asset ? (asset.shop_image || asset.image) : `https://assets.deadlock-api.com/v1/items/${it.item_id}/icon.png`);

                    itemsTimeline.push({
                        timeSeconds: it.game_time_s,
                        timeFormatted,
                        itemId: it.item_id,
                        name: assetName,
                        rawName: assetName,
                        className: asset ? asset.class_name : '',
                        cost: asset ? asset.cost : 0,
                        tier: localItem ? localItem.tier : (asset ? asset.tier : 1),
                        category: localItem ? localItem.category : (slotType.charAt(0).toUpperCase() + slotType.slice(1)),
                        slotType: slotType.toLowerCase(),
                        soldTimeS: it.sold_time_s,
                        image: itemImageUrl,
                        url: localItem ? localItem.url : null,
                        r2Url: localItem ? localItem.url : null,
                        relPath: localItem ? localItem.relPath : null,
                        localPngPath: localItem ? localItem.fullPath : null,
                        localFound: !!localItem,
                        localCategory: localItem ? localItem.category : null,
                        localTier: localItem ? localItem.tier : null,
                        itemRef: localItem,
                        markerColorIndex: 4 // Yellow for item purchases
                    });
                }
            });

            // 2. Parse Deaths (Mortes do Jogador)
            const deathsTimeline = (p.death_details || []).map(d => {
                const killerHeroName = slotToHeroName[d.killer_player_slot] || `Inimigo (Slot ${d.killer_player_slot})`;
                const durationS = d.death_duration_s || 0;
                return {
                    type: 'death',
                    timeSeconds: d.game_time_s,
                    deathDurationS: durationS,
                    durationSeconds: durationS,
                    timeFormatted: this.formatTime(d.game_time_s),
                    killerHero: killerHeroName,
                    killerSlot: d.killer_player_slot,
                    markerColorIndex: 1 // 1 = Red (Cor Vermelha)
                };
            }).sort((a, b) => a.timeSeconds - b.timeSeconds);

            // 3. Parse Kills (Abates feitos pelo Jogador)
            const killsTimeline = [];
            rawPlayers.forEach(victim => {
                (victim.death_details || []).forEach(d => {
                    if (d.killer_player_slot === p.player_slot) {
                        const victimHeroName = slotToHeroName[victim.player_slot] || `Inimigo (Slot ${victim.player_slot})`;
                        killsTimeline.push({
                            type: 'kill',
                            timeSeconds: d.game_time_s,
                            timeFormatted: this.formatTime(d.game_time_s),
                            victimHero: victimHeroName,
                            victimSlot: victim.player_slot,
                            markerColorIndex: 7 // 7 = Cyan (Cor Ciano)
                        });
                    }
                });
            });
            killsTimeline.sort((a, b) => a.timeSeconds - b.timeSeconds);

            // 4. Parse Assists (Participações em Fights / Abates de Aliados no raio de combate)
            const assistsTimeline = [];
            const playerPath = pathsBySlot[p.player_slot];
            const MAX_COMBAT_DIST_SQ = 3000 * 3000; // Raio de combate (3000 unidades ao quadrado para evitar Math.hypot)

            const enemyTeam = p.team === 0 ? 1 : 0;
            const enemyPlayers = rawPlayers.filter(victim => victim.team === enemyTeam);

            enemyPlayers.forEach(victim => {
                (victim.death_details || []).forEach(d => {
                    const killer = slotToPlayer[d.killer_player_slot];
                    // Abate feito por um colega de equipe (não pelo próprio jogador)
                    if (killer && killer.team === p.team && killer.player_slot !== p.player_slot) {
                        let participated = true;

                        // Se tivermos as coordenadas de movimento, valida a proximidade do jogador ao combate
                        if (playerPath && playerPath.xPos && playerPath.yPos) {
                            const sec = d.game_time_s;
                            const rx = playerPath.xPos[sec];
                            const ry = playerPath.yPos[sec];

                            if (rx !== undefined && rx !== null && ry !== undefined && ry !== null) {
                                const px = playerPath.xMin + rx * playerPath.scaleX;
                                const py = playerPath.yMin + ry * playerPath.scaleY;
                                let near = false;

                                if (d.death_pos) {
                                    const dx = px - d.death_pos.x;
                                    const dy = py - d.death_pos.y;
                                    if (dx * dx + dy * dy <= MAX_COMBAT_DIST_SQ) {
                                        near = true;
                                    }
                                }

                                if (!near && d.killer_pos) {
                                    const dx = px - d.killer_pos.x;
                                    const dy = py - d.killer_pos.y;
                                    if (dx * dx + dy * dy <= MAX_COMBAT_DIST_SQ) {
                                        near = true;
                                    }
                                }

                                participated = near;
                            }
                        }

                        if (participated) {
                            const victimHeroName = slotToHeroName[victim.player_slot] || `Inimigo (Slot ${victim.player_slot})`;
                            const killerHeroName = slotToHeroName[killer.player_slot] || `Aliado (Slot ${killer.player_slot})`;
                            assistsTimeline.push({
                                type: 'assist',
                                timeSeconds: d.game_time_s,
                                timeFormatted: this.formatTime(d.game_time_s),
                                victimHero: victimHeroName,
                                killerHero: killerHeroName,
                                victimSlot: victim.player_slot,
                                killerSlot: killer.player_slot,
                                markerColorIndex: 3 // 3 = Orange (Cor Laranja)
                            });
                        }
                    }
                });
            });
            assistsTimeline.sort((a, b) => a.timeSeconds - b.timeSeconds);

            return {
                playerIndex: idx,
                accountId: p.account_id,
                playerSlot: p.player_slot,
                team: p.team, // 0 = Sapphire Flame / Team 1, 1 = Amber Hand / Team 2
                heroId: p.hero_id,
                heroName: hero.name,
                heroImage,
                kills: p.kills || 0,
                deaths: p.deaths || 0,
                assists: p.assists || 0,
                netWorth: p.net_worth || 0,
                level: p.level || 1,
                lastHits: p.last_hits || 0,
                denies: p.denies || 0,
                damage: (p.stats && p.stats.length > 0) ? (p.stats[p.stats.length - 1].player_damage || 0) : 0,
                abilitiesTimeline,
                itemsTimeline,
                killsTimeline,
                assistsTimeline,
                deathsTimeline
            };
        });

        // Separate teams: Team 0 (Sapphire) and Team 1 (Amber)
        const teamSapphire = players.filter(p => p.team === 0);
        const teamAmber = players.filter(p => p.team === 1);

        return {
            matchId: cleanMatchId,
            durationS,
            durationFormatted: this.formatTime(durationS),
            startTime,
            winningTeam,
            players,
            teamSapphire,
            teamAmber
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeadlockApi;
}
