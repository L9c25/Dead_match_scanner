const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const match = JSON.parse(fs.readFileSync('match_sample.json'));
  console.log('Fetching assets...');
  const [allItems, heroes] = await Promise.all([
    get('https://api.deadlock-api.com/v1/assets/items'),
    get('https://api.deadlock-api.com/v1/assets/heroes')
  ]);

  const heroesMap = {};
  heroes.forEach(h => heroesMap[h.id] = h);
  const itemsMap = {};
  allItems.forEach(it => itemsMap[it.id] = it);

  console.log(`Loaded ${heroes.length} heroes and ${allItems.length} items/abilities.`);

  for (let i = 0; i < match.match_info.players.length; i++) {
    const p = match.match_info.players[i];
    const hero = heroesMap[p.hero_id];
    console.log(`\n========================================`);
    console.log(`Player ${i + 1}: Hero: ${hero ? hero.name : p.hero_id} (Slot: ${p.player_slot}, Team: ${p.team}, Net Worth: ${p.net_worth})`);
    console.log(`========================================`);

    const abilitiesTimeline = [];
    const itemsTimeline = [];

    p.items.forEach(it => {
      const asset = itemsMap[it.item_id];
      const upgradeAsset = itemsMap[it.upgrade_id];
      const minutes = Math.floor(it.game_time_s / 60);
      const seconds = it.game_time_s % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} (${it.game_time_s}s)`;

      if (asset && asset.type === 'ability') {
        abilitiesTimeline.push({
          timeStr,
          game_time_s: it.game_time_s,
          name: asset.name,
          class_name: asset.class_name,
          upgrade_id: it.upgrade_id,
          upgrade_info: it.upgrade_info
        });
      } else {
        itemsTimeline.push({
          timeStr,
          game_time_s: it.game_time_s,
          name: asset ? asset.name : `Unknown (${it.item_id})`,
          type: asset ? asset.type : 'unknown',
          slot_type: asset ? asset.slot_type : '',
          item_slot_type: asset ? asset.item_slot_type : '',
          cost: asset ? asset.cost : 0,
          sold_time_s: it.sold_time_s
        });
      }
    });

    console.log(`--- ABILITY UPGRADES (${abilitiesTimeline.length}) ---`);
    abilitiesTimeline.forEach(a => {
      console.log(`[${a.timeStr}] Ability: "${a.name}" (upgrade_info: ${a.upgrade_info})`);
    });

    console.log(`--- ITEMS BOUGHT (${itemsTimeline.length}) ---`);
    itemsTimeline.forEach(it => {
      console.log(`[${it.timeStr}] Item: "${it.name}" (Cost: ${it.cost}, Slot: ${it.item_slot_type || it.slot_type})`);
    });

    if (i >= 1) break; // test 2 players
  }
}

run();
