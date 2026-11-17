/**
 * reset_licenca.js - Remove a licença ativada neste computador
 * Permite testar novamente o fluxo de bloqueio e ativação no Premiere Pro.
 */

const fs = require('fs');
const path = require('path');

console.log('======================================================');
console.log('🔄 RESET DE LICENÇA LOCAL - DEADLOCK MATCH SCANNER');
console.log('======================================================\n');

// 1. Arquivo de Licença Local e Bloqueios Rate-Limit
const licensePath = path.join(process.env.APPDATA, 'DeadlockMatchScanner', 'license.json');
const rateLimitPath = path.join(process.env.APPDATA, 'DeadlockMatchScanner', 'rate_limit.json');

if (fs.existsSync(licensePath)) {
  try {
    const data = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
    console.log(`📋 Licença ativa encontrada: ${data.licenseKey || 'N/A'}`);
    console.log(`👤 E-mail: ${data.customerEmail || 'N/A'}`);
  } catch (e) {}

  try {
    fs.unlinkSync(licensePath);
    console.log('✅ Arquivo license.json removido com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao deletar license.json:', err.message);
  }
} else {
  console.log('ℹ️ Nenhuma licença ativa encontrada no PC (o plugin já está bloqueado).');
}

if (fs.existsSync(rateLimitPath)) {
  try {
    fs.unlinkSync(rateLimitPath);
    console.log('✅ Arquivo rate_limit.json (contadores de tentativas e bloqueios) resetado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao deletar rate_limit.json:', err.message);
  }
}

// 2. Limpeza de Cache do Adobe CEP
const tempDir = path.join(process.env.LOCALAPPDATA, 'Temp', 'cep_cache');
if (fs.existsSync(tempDir)) {
  try {
    for (const item of fs.readdirSync(tempDir)) {
      if (item.toLowerCase().includes('deadlock') || item.toLowerCase().includes('matchscanner')) {
        fs.rmSync(path.join(tempDir, item), { recursive: true, force: true });
        console.log(`🧹 Cache limpo: ${item}`);
      }
    }
  } catch (e) {}
}

console.log('\n======================================================');
console.log('🎉 COMPUTADOR RESETADO COM SUCESSO!');
console.log('======================================================');
console.log('Agora, ao abrir o Premiere Pro (ou reiniciar o painel),');
console.log('a tela de bloqueio pedindo a chave será exibida!');
console.log('======================================================\n');
