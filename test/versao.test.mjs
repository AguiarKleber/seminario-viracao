// A versão do app (bin/versao.mjs) contra a da main publicada.
//
// Revisão de 29/09: o redesenho mudou JS, CSS e HTML e as tags continuaram em
// ?v=1, como na main. Com o cache de 10 min do GitHub Pages, o navegador podia
// juntar o telao.js novo com o motor.js velho (TypeError no encerrar da rodada),
// e o celular com o aluno.js velho não recebia o "atualize a página", porque a
// versaoApp da sala continuava a mesma. Este teste reprova a branch que mexeu
// no site sem subir a versão; na main (ou sem git), ele não tem o que comparar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { conferir } from '../bin/versao.mjs';
import { RAIZ } from './carregar-nucleo.mjs';

// O que o navegador baixa: é isso que o cache pode misturar.
const DO_SITE = ['index.html', 'telao', 'aluno', 'js', 'css', 'vendor'];

function git(args) {
  return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

test('mexeu no site em relação à main: a versão do app subiu', (t) => {
  let versaoMain;
  let mudou;
  try {
    versaoMain = /const VERSAO_APP = '(\d+)';/.exec(git(['show', 'main:js/telao.js']))?.[1];
    // Árvore de trabalho contra a main: pega também o que ainda não foi commitado.
    mudou = git(['diff', '--name-only', 'main', '--', ...DO_SITE]).trim().split('\n').filter(Boolean);
  } catch {
    t.skip('sem git ou sem a branch main para comparar');
    return;
  }
  if (!versaoMain) return t.skip('a main não tem VERSAO_APP');
  const { versao, problemas } = conferir(RAIZ);
  assert.deepEqual(problemas, [], 'as versões do telão, do celular e das páginas andam juntas');
  if (mudou.length === 0) return;
  assert.notEqual(versao, versaoMain, `mudaram ${mudou.length} arquivos do site (${mudou.slice(0, 4).join(', ')}…) e a versão continua ${versao}: rode npm run versao`);
});
