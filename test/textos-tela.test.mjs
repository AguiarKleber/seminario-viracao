// Conferências estáticas dos textos das telas, sem navegador (entram no npm test).
//
// D-041 e rascunho, seção 7, item 14: "piloto automático" saiu do placar final
// no redesenho, mas continuou no resultado do mês (telão), na história da
// equipe e na decisão do celular. O e2e só vê as telas por onde o roteiro dele
// passa; aqui, o termo é procurado no código inteiro das duas telas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './carregar-nucleo.mjs';

const TELAS = ['js/telao.js', 'js/aluno.js', 'telao/index.html', 'aluno/index.html', 'index.html'];

// Só o que pode virar texto na tela: os comentários de JS e de HTML podem citar
// o termo, porque é assim que o porquê fica registrado.
function semComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('"piloto automático" não aparece em nenhum texto das telas (telão e celular)', () => {
  for (const arquivo of TELAS) {
    const achados = semComentarios(readFileSync(join(RAIZ, arquivo), 'utf8')).split('\n').filter((l) => /piloto autom/i.test(l));
    assert.deepEqual(achados, [], `${arquivo}: "piloto automático" num texto de tela`);
  }
});
