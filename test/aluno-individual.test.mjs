// As contas puras do celular no modo individual (regras.individual; decisão do
// Kleber de 13/10 à noite), sem navegador (entram no npm test). O js/aluno.js
// carrega no Node sem DOM: sem document, ele só registra Viracao.aluno, e as
// telas não são desenhadas. O desenho em 360×740 fica no
// e2e/celular-individual.e2e.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';

const V = await carregarNucleo();
await import(pathToFileURL(join(RAIZ, 'js', 'aluno.js')).href);
const { partesDaFrase, fraseDaTurma, limparNome } = V.aluno.textos;
const H = V.historia;
const frase = (f) => (f ? `${f.antes}R$ ${f.reais}${f.depois}` : null);

// ---------- O nome (só do aparelho) ----------

test('nome: obrigatório, sem espaço nas pontas nem repetido, no máximo 20 letras', () => {
  assert.equal(limparNome('  Ana   Clara '), 'Ana Clara');
  assert.equal(limparNome(''), null);
  assert.equal(limparNome('   '), null, 'só espaço não é nome');
  assert.equal(limparNome(null), null);
  assert.equal(limparNome(undefined), null);
  assert.equal(limparNome('Maria Eduarda Albuquerque'), 'Maria Eduarda Albuqu', '20 letras');
  assert.equal(limparNome('Maria Eduarda Albuqu e').length, 20);
  // O corte na 20ª letra não deixa espaço no fim.
  assert.equal(limparNome('Joaquim Nabuco Silva Santos'), 'Joaquim Nabuco Silva');
});

test('nome: o corte é por letra, e não por unidade de código (acento e emoji inteiros)', () => {
  const nome = limparNome('Ánâ 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀');
  assert.equal(Array.from(nome).length, 20);
  assert.equal(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(nome), false, 'nenhum emoji cortado ao meio');
});

test('nome: caractere de controle sai, e quebra de linha vira espaço', () => {
  assert.equal(limparNome('Ana\u0000\u0007Clara'), 'AnaClara');
  assert.equal(limparNome('Ana\nClara\t'), 'Ana Clara');
});

// ---------- A frase do próprio ano, na 2ª pessoa ----------

test('frase do ano no modo individual: "Você escolheu…", e a família ficou devendo', () => {
  const op = { individual: true, simples: true };
  assert.equal(frase(partesDaFrase(Array(6).fill('maioria'), -2742, 'bimestre', op)),
    'Você escolheu em todos os 6 bimestres, e a família ainda ficou devendo R$ 2742.');
  assert.equal(frase(partesDaFrase(['maioria', 'piloto', 'maioria', 'maioria', 'maioria', 'maioria'], -900, 'bimestre', op)),
    'Você escolheu em 5 dos 6 bimestres, e a família ainda ficou devendo R$ 900.');
  assert.equal(frase(partesDaFrase(Array(6).fill('piloto'), -500, 'bimestre', op)),
    'Você não votou em nenhum bimestre, e a família ficou devendo R$ 500.');
  assert.equal(frase(partesDaFrase(['maioria'], -10, 'bimestre', op)), 'Você escolheu no bimestre jogado, e a família ainda ficou devendo R$ 10.');
});

test('frase do ano no modo individual: quem fecha as contas é a família, com voto ou sem ele', () => {
  const op = { individual: true, simples: true };
  const f = partesDaFrase(Array(6).fill('maioria'), 1714, 'bimestre', op);
  assert.equal(frase(f), 'Você escolheu em todos os 6 bimestres, e a família fechou as contas: sobrou R$ 1714.');
  assert.deepEqual([f.resultado, f.valor, f.escolheram, f.total], ['fechou', 1714, 6, 6]);
  assert.equal(frase(partesDaFrase(Array(6).fill('piloto'), 0, 'bimestre', op)),
    'Você não votou em nenhum bimestre, e a família fechou as contas: sobrou R$ 0.');
  // −R$ 0,40 arredonda para R$ 0: "fechou", como na régua do telão (R$ 0 ou mais).
  assert.equal(partesDaFrase(['maioria'], -0.4, 'bimestre', op).resultado, 'fechou');
});

test('frase do ano: sem a opção individual, a das equipes não muda', () => {
  assert.equal(frase(partesDaFrase(Array(6).fill('voto'), -2742, 'bimestre', { simples: true })),
    'Vocês escolheram em todos os 6 bimestres, e a família ainda ficou devendo R$ 2742.');
  assert.equal(frase(partesDaFrase(['voto', 'voto'], 250, 'bimestre', { simples: true })),
    'Vocês escolheram em todos os 2 bimestres e fecharam as contas: sobrou R$ 250.');
});

// ---------- A frase da turma (pedido do Kleber de 13/10, 21h) ----------

test('frase da turma: quantas pessoas fecharam o ano e quantas terminaram devendo, sem nome', () => {
  assert.equal(fraseDaTurma({ pessoas: 18, positivos: 3, negativos: 15 }),
    'Das 18 pessoas da turma, 3 fecharam o ano com dinheiro sobrando e 15 terminaram devendo.');
  assert.equal(fraseDaTurma({ pessoas: 20, positivos: 1, negativos: 19 }),
    'Das 20 pessoas da turma, 1 fechou o ano com dinheiro sobrando e 19 terminaram devendo.');
  assert.equal(fraseDaTurma({ pessoas: 5, positivos: 0, negativos: 5 }),
    'Das 5 pessoas da turma, nenhuma fechou o ano com dinheiro sobrando e 5 terminaram devendo.');
  assert.equal(fraseDaTurma({ pessoas: 2, positivos: 1, negativos: 1 }),
    'Das 2 pessoas da turma, 1 fechou o ano com dinheiro sobrando e 1 terminou devendo.');
  assert.equal(fraseDaTurma({ pessoas: 4, positivos: 4, negativos: 0 }),
    'Das 4 pessoas da turma, 4 fecharam o ano com dinheiro sobrando e nenhuma terminou devendo.');
});

test('frase da turma: uma pessoa só, e ninguém que tenha jogado o ano inteiro', () => {
  assert.equal(fraseDaTurma({ pessoas: 1, positivos: 0, negativos: 1 }), 'Na turma, 1 pessoa jogou o ano inteiro e terminou devendo.');
  assert.equal(fraseDaTurma({ pessoas: 1, positivos: 1, negativos: 0 }), 'Na turma, 1 pessoa jogou o ano inteiro e terminou com dinheiro sobrando.');
  assert.equal(fraseDaTurma({ pessoas: 0, positivos: 0, negativos: 0 }), null);
  assert.equal(fraseDaTurma(null), null);
  assert.equal(fraseDaTurma(undefined), null);
});

test('frase da turma: com o fimDoAnoDaTurma do núcleo, a mesma conta do telão', () => {
  // Três vagas que jogaram 2 rodadas, e uma que entrou na segunda.
  const conteudo = {
    ordem: { rodadas: ['r1', 'r2'], equipes: ['e1', 'e2', 'e3', 'e4'] },
    rodadas: { r1: {}, r2: {} },
    equipes: { e1: {}, e2: {}, e3: {}, e4: {} },
  };
  const depois = (renda) => ({ renda, emprestimo: 0, contas_atrasadas: 0 });
  const resultados = {
    r1: { e1: { depois: depois(100) }, e2: { depois: depois(-50) }, e3: { depois: depois(10) } },
    r2: { e1: { depois: depois(300) }, e2: { depois: depois(-700) }, e3: { depois: depois(0) }, e4: { depois: depois(5000) } },
  };
  const fim = H.fimDoAnoDaTurma(conteudo, resultados);
  assert.deepEqual([fim.pessoas, fim.positivos, fim.negativos, fim.entraramDepois], [3, 2, 1, 1]);
  assert.equal(fraseDaTurma(fim), 'Das 3 pessoas da turma, 2 fecharam o ano com dinheiro sobrando e 1 terminou devendo.');
});
