// O simulador de 20 robôs contra as regras reais, com ataques e perturbações
// (arquitetura, seção 13): a sessão inteira tem de terminar com 0 violações.
// A --rajada fica de fora aqui só pelo tempo (ela espera o fim de cada prazo);
// rode à mão: npm run simular -- --emulador --rapido --rajada --atacar
//
// Roda com: npm run emulador
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { RAIZ } from '../../bin/emulador.mjs';

function simular(args) {
  return new Promise((resolver) => {
    const filho = spawn(process.execPath, [join(RAIZ, 'bin', 'simular-alunos.mjs'), ...args], { cwd: RAIZ, env: process.env });
    let saida = '';
    filho.stdout.on('data', (d) => { saida += d; });
    filho.stderr.on('data', (d) => { saida += d; });
    filho.once('exit', (codigo) => resolver({ codigo, saida }));
  });
}

test('simulador: 20 robôs, ataques, quedas, recargas e telão derrubado, com 0 violações', { timeout: 240_000 }, async () => {
  const { codigo, saida } = await simular(['--emulador', '--rapido', '--atacar', '--quedas', '--recargas', '--derrubar-telao']);
  assert.match(saida, /RESULTADO: 0 violações\./, saida);
  assert.match(saida, /ataques: (\d+) de \1 recusados \(100\.0%/, saida);
  assert.match(saida, /legítimas: 0 de \d+/, saida);
  assert.match(saida, /placar recalculado === gravado/, saida);
  assert.equal(codigo, 0, saida);
});
