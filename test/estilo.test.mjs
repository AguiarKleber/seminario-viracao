// Conferências estáticas do CSS, sem navegador (entram no npm test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './carregar-nucleo.mjs';

const ARQUIVOS = ['base.css', 'telao.css', 'aluno.css'];
const ler = (nome) => readFileSync(join(RAIZ, 'css', nome), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Tira os blocos @media (hover: hover) inteiros, contando as chaves.
function semBlocosDeHover(css) {
  let saida = '';
  let i = 0;
  const re = /@media[^{]*\(hover:\s*hover\)[^{]*\{/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    saida += css.slice(i, m.index);
    let nivel = 1;
    let j = re.lastIndex;
    while (nivel > 0 && j < css.length) {
      if (css[j] === '{') nivel += 1;
      else if (css[j] === '}') nivel -= 1;
      j += 1;
    }
    i = j;
    re.lastIndex = j;
  }
  return saida + css.slice(i);
}

// Revisão da F2, achado 16: no celular, o :hover fica preso no botão que estava
// sob o dedo e aparece na tela seguinte como uma resposta pré-marcada (empurrão
// de ancoragem na enquete). Todo :hover só vale com mouse de verdade.
test('todo :hover fica dentro de @media (hover: hover)', () => {
  for (const nome of ARQUIVOS) {
    const fora = semBlocosDeHover(ler(nome)).split('\n').filter((l) => l.includes(':hover'));
    assert.deepEqual(fora, [], `${nome}: :hover fora de @media (hover: hover)`);
  }
});
