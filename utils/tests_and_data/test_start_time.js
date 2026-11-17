const assert = require('assert');

function parseTimeToSeconds(inputStr) {
    if (!inputStr) return 0;
    const s = String(inputStr).trim().toLowerCase();
    if (!s || s === '0' || s === '00:00' || s === '0:00') return 0;

    if (s.includes(':')) {
        const parts = s.split(':').map(p => parseFloat(p) || 0);
        if (parts.length === 3) {
            return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
        } else if (parts.length === 2) {
            return Math.max(0, parts[0] * 60 + parts[1]);
        }
    }

    let total = 0;
    let matched = false;
    const mMatch = s.match(/(\d+(?:\.\d+)?)\s*m/);
    if (mMatch) {
        total += parseFloat(mMatch[1]) * 60;
        matched = true;
    }
    const sMatch = s.match(/(\d+(?:\.\d+)?)\s*s/);
    if (sMatch) {
        total += parseFloat(sMatch[1]);
        matched = true;
    }
    if (matched) return Math.max(0, total);

    const num = parseFloat(s);
    return isNaN(num) ? 0 : Math.max(0, num);
}

function formatSecondsToTime(seconds) {
    const sec = Math.max(0, Math.round(seconds || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

console.log('🧪 1. Testando parseTimeToSeconds...');
assert.strictEqual(parseTimeToSeconds('00:00'), 0);
assert.strictEqual(parseTimeToSeconds('00:10'), 10);
assert.strictEqual(parseTimeToSeconds('10'), 10);
assert.strictEqual(parseTimeToSeconds('1:30'), 90);
assert.strictEqual(parseTimeToSeconds('02:00:15'), 7215);
assert.strictEqual(parseTimeToSeconds('2m30s'), 150);
assert.strictEqual(parseTimeToSeconds('45s'), 45);
console.log('✅ parseTimeToSeconds passou em todos os testes!');

console.log('\n🧪 2. Testando formatSecondsToTime...');
assert.strictEqual(formatSecondsToTime(0), '00:00');
assert.strictEqual(formatSecondsToTime(10), '00:10');
assert.strictEqual(formatSecondsToTime(90), '01:30');
assert.strictEqual(formatSecondsToTime(7215), '02:00:15');
console.log('✅ formatSecondsToTime passou em todos os testes!');

console.log('\n🧪 3. Testando cálculo de sincronia no Premiere Pro (ExtendScript simulation)...');
function simulateCalculateEventTimes(baseT0, eventSec, gameStartTimeSec) {
    const remainingGameSec = Math.max(0, Number(eventSec) - gameStartTimeSec);
    return baseT0 + remainingGameSec;
}

// Suponha clipe cortado no início da timeline (baseT0 = 0s do clipe), e o corte foi feito quando o game marcava 10s:
const baseT0 = 100; // Clip começa aos 100s na sequência do Premiere
const gameStart = 10; // Usuário configurou 00:10 no plugin

// Evento aos 10s de partida (primeiro segundo após o corte)
const t10 = simulateCalculateEventTimes(baseT0, 10, gameStart);
assert.strictEqual(t10, 100); // Cai exatamente no início do clipe (100 + 0)

// Evento aos 15s de partida (5 segundos após o corte)
const t15 = simulateCalculateEventTimes(baseT0, 15, gameStart);
assert.strictEqual(t15, 105); // Cai 5 segundos após o início do clipe (100 + 5)

// Evento aos 70s de partida (60 segundos após o corte)
const t70 = simulateCalculateEventTimes(baseT0, 70, gameStart);
assert.strictEqual(t70, 160); // Cai 60 segundos após o início do clipe (100 + 60)

console.log('✅ Simulação de sincronização com o clipe cortado passou perfeitamente!');
console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
