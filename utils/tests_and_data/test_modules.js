const ItemsManager = require('./js/itemsManager.js');
const HeroesManager = require('./js/heroesManager.js');
const DeadlockApi = require('./js/deadlockApi.js');

async function test() {
  ItemsManager.indexDirectory();
  HeroesManager.indexDirectory();

  const testMatchId = 99817609;
  const match = await DeadlockApi.fetchMatch(testMatchId);
  const p = match.players[0]; // Pocket

  const tierOnly = p.abilitiesTimeline.filter(a => !a.isUnlock);
  const unlocks = p.abilitiesTimeline.filter(a => a.isUnlock);

  console.log(`Hero: ${p.heroName}`);
  console.log(`Total Events: ${p.abilitiesTimeline.length}`);
  console.log(`\n❌ Desbloqueios Iniciais (T0 - DESLIGADO POR PADRÃO): ${unlocks.length}`);
  unlocks.forEach(u => console.log(`   Ignorado: [${u.timeFormatted}] ${u.name} (T0 - Desbloqueio)`));

  console.log(`\n✅ Upgrades de Tier (T1, T2, T3 - MARCADORES ATIVOS NO PREMIERE): ${tierOnly.length}`);
  tierOnly.forEach(t => {
    const colorName = t.markerColorIndex === 7 ? '🔷 Ciano (T1)' : (t.markerColorIndex === 2 ? '🟣 Roxo (T2)' : '🟠 Laranja (T3)');
    console.log(`   Marcador: [${t.timeFormatted}] ⚡ ${t.name} (${t.shortTier}) -> ${colorName}`);
  });
}

test().catch(console.error);
