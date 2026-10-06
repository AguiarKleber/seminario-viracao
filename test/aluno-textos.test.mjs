// As contas puras do celular para os pedidos do Kleber de 05/10, sem navegador
// (entram no npm test). O js/aluno.js carrega no Node sem DOM: sem document,
// ele só registra Viracao.aluno, e as telas não são desenhadas. O desenho e a
// dobra de 360×740 ficam no e2e:online (conferirEscolhas e conferirDivida).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';

const V = await carregarNucleo();
await import(pathToFileURL(join(RAIZ, 'js', 'aluno.js')).href);
const { totalDaDivida, partesDaFrase, quandoDosMeses } = V.aluno.textos;
const H = V.historia;
const frase = (f) => (f ? `${f.antes}R$ ${f.reais}${f.depois}` : null);

// Item 3: no teste do Kleber de 05/10, o telão escrevia "dívida R$ 2.000" e
// "contas atrasadas R$ 19.797" em duas linhas, e a sala não somava. O número
// principal do celular é a "dívida total", o mesmo do telão
// (historia.dividaTotal: total + contasAtrasadas).
test('dívida total: banco + empréstimo + contas atrasadas, o mesmo número do telão', () => {
  const valores = { renda: -1500, emprestimo: 625, contas_atrasadas: 4811 };
  const d = H.dividaTotal(valores);
  assert.equal(totalDaDivida(d), 1500 + 625 + 4811);
  assert.equal(totalDaDivida(d), d.total + d.contasAtrasadas, 'a conta do telão');
  // Sem caixa, a dívida total é o "faltou" do placar (o patrimônio negativo).
  assert.equal(totalDaDivida(d), -H.patrimonioDe(valores));
});

test('dívida total: sala sem o limite (sem contas atrasadas), com caixa e sem dívida', () => {
  assert.equal(totalDaDivida(H.dividaTotal({ renda: -1, emprestimo: 1500 })), 1501, 'teste de 30/09: o Jonas com R$ 1.500 emprestados');
  assert.equal(totalDaDivida(H.dividaTotal({ renda: 800, emprestimo: 1500, contas_atrasadas: 0 })), 1500, 'o caixa positivo não abate a dívida');
  assert.equal(totalDaDivida(H.dividaTotal({ renda: 300 })), 0);
  assert.equal(totalDaDivida(null), 0);
});

// Item 4: a frase do topo do placar final no celular.
test('frase das escolhas: todos os bimestres escolhidos, e faltou', () => {
  const f = partesDaFrase(['voto', 'voto', 'moeda', 'voto', 'apresentador', 'prorrogacao'], -10872.4, 'bimestre');
  assert.equal(frase(f), 'Vocês escolheram em todos os 6 bimestres, e ainda faltou R$ 10872.');
  assert.deepEqual([f.resultado, f.valor, f.escolheram, f.total], ['faltou', -10872, 6, 6]);
});

test('frase das escolhas: o "ninguém votou" não conta como escolha', () => {
  assert.equal(frase(partesDaFrase(['voto', 'voto', 'piloto', 'voto', 'voto', 'voto'], -19837, 'bimestre')),
    'Vocês escolheram em 5 dos 6 bimestres, e ainda faltou R$ 19837.');
  const nenhum = partesDaFrase(Array(6).fill('piloto'), -500, 'bimestre');
  assert.equal(frase(nenhum), 'A equipe não votou em nenhum bimestre, e faltou R$ 500.');
  assert.equal(nenhum.escolheram, 0);
});

// Leitura final de 06/10: no formato simples, o telão diz "devendo R$ X" e o
// celular, "A família está devendo R$ X."; a frase do topo usa a mesma palavra.
// O jogo com sorteio continua com o "faltou", o mesmo da barra dele.
test('frase das escolhas no formato simples: a família ficou devendo', () => {
  const f = partesDaFrase(Array(6).fill('voto'), -2742, 'bimestre', { simples: true });
  assert.equal(frase(f), 'Vocês escolheram em todos os 6 bimestres, e a família ainda ficou devendo R$ 2742.');
  assert.equal(f.resultado, 'faltou', 'o atributo continua o mesmo');
  assert.equal(frase(partesDaFrase(['voto', 'piloto', 'voto', 'voto', 'voto', 'voto'], -900, 'bimestre', { simples: true })),
    'Vocês escolheram em 5 dos 6 bimestres, e a família ainda ficou devendo R$ 900.');
  assert.equal(frase(partesDaFrase(Array(6).fill('piloto'), -500, 'bimestre', { simples: true })),
    'A equipe não votou em nenhum bimestre, e a família ficou devendo R$ 500.');
  assert.equal(frase(partesDaFrase(['voto', 'voto'], 250, 'bimestre', { simples: true })),
    'Vocês escolheram em todos os 2 bimestres e fecharam as contas: sobrou R$ 250.', 'quando fecha, não muda');
});

test('frase das escolhas: fechou as contas (e o arredondamento decide)', () => {
  const f = partesDaFrase(['voto', 'voto'], 250, 'bimestre');
  assert.equal(frase(f), 'Vocês escolheram em todos os 2 bimestres e fecharam as contas: sobrou R$ 250.');
  assert.equal(f.resultado, 'fechou');
  // −R$ 0,40 arredonda para R$ 0: a tela não diz "faltou R$ 0".
  const zero = partesDaFrase(['voto'], -0.4, 'bimestre');
  assert.equal(frase(zero), 'Vocês escolheram no bimestre jogado e fecharam as contas: sobrou R$ 0.');
  assert.ok(Object.is(zero.valor, 0), 'sem o −0');
  assert.equal(frase(partesDaFrase(['piloto'], 10, 'bimestre')), 'A equipe não votou em nenhum bimestre e fechou as contas: sobrou R$ 10.', '"a equipe… fechou", e não "fecharam"');
});

test('frase das escolhas: rodadas mensais e entradas sem o que dizer', () => {
  assert.equal(frase(partesDaFrase(Array(12).fill('voto'), -3000, 'mês')), 'Vocês escolheram em todos os 12 meses, e ainda faltou R$ 3000.');
  assert.equal(partesDaFrase([], -100, 'bimestre'), null, 'sem rodada jogada');
  assert.equal(partesDaFrase(['voto'], null, 'bimestre'), null, 'sem patrimônio');
  assert.equal(partesDaFrase(['voto'], Number.NaN, 'bimestre'), null);
});

test('"faltou na mesa": no ano, no mês ou em N meses, como o telão', () => {
  assert.equal(quandoDosMeses(12), 'no ano');
  assert.equal(quandoDosMeses(1), 'no mês');
  assert.equal(quandoDosMeses(6), 'em 6 meses');
});
