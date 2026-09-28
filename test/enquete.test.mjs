// Apuração das enquetes: histograma, resumo, antes → depois e quando comparar.
// Os votos e a enquete são montados à mão, já no formato normalizado (contratos,
// seção 1), para o teste não depender do validador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';

const { histograma, resumo, apurar, transicao, podeComparar } = (await carregarNucleo()).enquete;

// Enquete pareada já normalizada: afirmações em mapa por id, ordem num array.
const ENQUETE_ENTRADA = {
  id: 'entrada',
  titulo: 'Termômetro de entrada',
  pareada: true,
  revelar: 'so_no_comparativo',
  modo: 'todas',
  afirmacoes: {
    a1: { id: 'a1', texto: 'Quem trabalha por aplicativo é empreendedor.' },
    a2: { id: 'a2', texto: 'Com esforço, qualquer um cresce no aplicativo.' },
  },
  ordemAfirmacoes: ['a1', 'a2'],
};

// A apuração gravada em enquetes/{e}/{m}, no formato que o anfitrião grava.
function apuracao({ metodo = 'celular', n = { a1: 10, a2: 10 }, pares } = {}) {
  const resultado = { histogramas: { a1: [0, 0, 0, 0, 0], a2: [0, 0, 0, 0, 0] }, n, metodo, apuradaEm: 0 };
  if (pares) resultado.transicao = Object.fromEntries(Object.entries(pares).map(([a, p]) => [a, { pares: p }]));
  return resultado;
}

// ---------- histograma ----------

test('histograma conta um voto por aparelho em cada valor de 1 a 5', () => {
  // prepara
  const votos = { u1: 1, u2: 5, u3: 5, u4: 3, u5: 2, u6: 5 };

  // age
  const hist = histograma(votos);

  // confere
  assert.deepEqual(hist, [1, 1, 1, 0, 3]);
});

test('histograma ignora valor fora de 1..5, fracionário, texto, booleano e nulo', () => {
  // prepara: só u1 e u2 são votos válidos
  const votos = { u1: 4, u2: 1, u3: 0, u4: 6, u5: 2.5, u6: '5', u7: true, u8: null, u9: NaN, u10: -1 };

  // age
  const hist = histograma(votos);

  // confere
  assert.deepEqual(hist, [1, 0, 0, 1, 0]);
});

test('histograma de nó vazio (null do RTDB) é tudo zero', () => {
  // prepara / age
  const deNulo = histograma(null);
  const deIndefinido = histograma(undefined);

  // confere
  assert.deepEqual(deNulo, [0, 0, 0, 0, 0]);
  assert.deepEqual(deIndefinido, [0, 0, 0, 0, 0]);
});

// ---------- resumo ----------

test('resumo com n ímpar: mediana é o voto central', () => {
  // prepara: votos 1, 2, 2, 4, 5
  const hist = [1, 2, 0, 1, 1];

  // age
  const r = resumo(hist);

  // confere
  assert.equal(r.n, 5);
  assert.equal(r.mediana, 2);
  assert.equal(r.media, 14 / 5);
  assert.equal(r.discorda, 3 / 5);
  assert.equal(r.neutro, 0);
  assert.equal(r.concorda, 2 / 5);
});

test('resumo com n par e centrais diferentes: mediana é a média dos dois (x,5)', () => {
  // prepara: votos 2, 3, 4, 5 → centrais 3 e 4
  const hist = [0, 1, 1, 1, 1];

  // age
  const r = resumo(hist);

  // confere
  assert.equal(r.n, 4);
  assert.equal(r.mediana, 3.5);
  assert.equal(r.media, 3.5);
});

test('resumo com n par e centrais iguais: mediana é o próprio valor', () => {
  // prepara: votos 1, 3, 3, 5
  const hist = [1, 0, 2, 0, 1];

  // age
  const r = resumo(hist);

  // confere
  assert.equal(r.mediana, 3);
});

test('resumo com n par e centrais nas pontas da escala: mediana cai no neutro', () => {
  // prepara: votos 1, 1, 5, 5 → turma rachada, centrais 1 e 5
  const hist = [2, 0, 0, 0, 2];

  // age
  const r = resumo(hist);

  // confere
  assert.equal(r.mediana, 3);
  assert.equal(r.discorda, 0.5);
  assert.equal(r.concorda, 0.5);
});

test('resumo com n = 0: tudo null, para o telão dizer "sem votos" e nunca zero', () => {
  // prepara
  const hist = [0, 0, 0, 0, 0];

  // age
  const r = resumo(hist);

  // confere
  assert.deepEqual(r, { n: 0, mediana: null, media: null, discorda: null, neutro: null, concorda: null });
});

test('resumo com n = 1: o único voto é mediana e média', () => {
  // prepara
  const hist = [0, 0, 0, 1, 0];

  // age
  const r = resumo(hist);

  // confere
  assert.deepEqual(r, { n: 1, mediana: 4, media: 4, discorda: 0, neutro: 0, concorda: 1 });
});

test('resumo: as três frações somam 1', () => {
  // prepara
  const hist = [3, 1, 4, 1, 5];

  // age
  const r = resumo(hist);

  // confere
  assert.ok(Math.abs(r.discorda + r.neutro + r.concorda - 1) < 1e-12);
});

test('resumo recusa histograma torto (a contagem manual chega digitada)', () => {
  // prepara
  const tortos = [null, [1, 2, 3, 4], [1, 2, 3, 4, 5, 6], [1, -1, 0, 0, 0], [1, 2.5, 0, 0, 0], [1, '2', 0, 0, 0]];

  // age / confere
  for (const hist of tortos) assert.throws(() => resumo(hist), TypeError, `deveria recusar ${JSON.stringify(hist)}`);
});

// ---------- apurar ----------

test('apurar dá histograma e n de cada afirmação do config, inclusive a sem voto', () => {
  // prepara: a2 ninguém votou; "zz" não existe na enquete; u3 votou inválido
  const votos = {
    a1: { u1: 5, u2: 4, u3: 9 },
    zz: { u1: 1 },
  };

  // age
  const r = apurar(ENQUETE_ENTRADA, votos);

  // confere
  assert.deepEqual(r, {
    histogramas: { a1: [0, 0, 0, 1, 1], a2: [0, 0, 0, 0, 0] },
    n: { a1: 2, a2: 0 },
  });
});

test('apurar sem voto nenhum (nó null) dá n = 0 em todas as afirmações', () => {
  // prepara / age
  const r = apurar(ENQUETE_ENTRADA, null);

  // confere
  assert.deepEqual(r.n, { a1: 0, a2: 0 });
});

// ---------- transicao ----------

test('transicao pareia por uid e conta quem foi para mais, igual e menos concordância', () => {
  // prepara: u1 4→2 (menos), u2 2→2 (igual), u3 1→5 (mais), u4 3→4 (mais);
  // u5 só antes; u6 e u7 só depois
  const antes = { u1: 4, u2: 2, u3: 1, u4: 3, u5: 5 };
  const depois = { u1: 2, u2: 2, u3: 5, u4: 4, u6: 1, u7: 3 };

  // age
  const t = transicao(antes, depois);

  // confere
  assert.equal(t.pares, 4);
  assert.equal(t.mais, 2);
  assert.equal(t.igual, 1);
  assert.equal(t.menos, 1);
  assert.equal(t.soAntes, 1);
  assert.equal(t.soDepois, 2);
  // matriz[antes - 1][depois - 1]
  assert.equal(t.matriz[3][1], 1);
  assert.equal(t.matriz[1][1], 1);
  assert.equal(t.matriz[0][4], 1);
  assert.equal(t.matriz[2][3], 1);
  assert.equal(t.matriz.flat().reduce((s, x) => s + x, 0), t.pares);
  assert.equal(t.matriz.length, 5);
  assert.ok(t.matriz.every((linha) => linha.length === 5));
});

test('transicao: voto inválido de um lado conta como só do outro lado', () => {
  // prepara: u1 inválido no depois; u2 inválido no antes
  const antes = { u1: 3, u2: '4' };
  const depois = { u1: 7, u2: 4 };

  // age
  const t = transicao(antes, depois);

  // confere
  assert.equal(t.pares, 0);
  assert.equal(t.soAntes, 1);
  assert.equal(t.soDepois, 1);
});

test('transicao só com antes (o depois não teve voto)', () => {
  // prepara / age
  const t = transicao({ u1: 3, u2: 4 }, null);

  // confere
  assert.deepEqual(
    { pares: t.pares, mais: t.mais, igual: t.igual, menos: t.menos, soAntes: t.soAntes, soDepois: t.soDepois },
    { pares: 0, mais: 0, igual: 0, menos: 0, soAntes: 2, soDepois: 0 },
  );
});

test('transicao só com depois (o antes foi pulado, D-008)', () => {
  // prepara / age
  const t = transicao(null, { u1: 3, u2: 4, u3: 5 });

  // confere
  assert.equal(t.pares, 0);
  assert.equal(t.soAntes, 0);
  assert.equal(t.soDepois, 3);
  assert.ok(t.matriz.flat().every((x) => x === 0));
});

// ---------- podeComparar ----------

test('podeComparar libera o pareado com pares suficientes, no mesmo método', () => {
  // prepara
  const antes = apuracao();
  const depois = apuracao({ pares: { a1: 16, a2: 15 } });

  // age
  const r = podeComparar(antes, depois, 5);

  // confere
  assert.equal(r.comparar, true);
  assert.equal(r.caso, 'pareado');
  assert.match(r.motivo, /15 pessoas responderam as duas vezes/);
});

test('podeComparar aceita exatamente minPareados pares', () => {
  // prepara
  const depois = apuracao({ pares: { a1: 5, a2: 5 } });

  // age
  const r = podeComparar(apuracao(), depois, 5);

  // confere
  assert.equal(r.comparar, true);
});

test('podeComparar recusa métodos misturados (celular antes, mão levantada depois)', () => {
  // prepara: mesmo com pares de sobra, métodos diferentes nunca se comparam
  const antes = apuracao({ metodo: 'celular' });
  const depois = apuracao({ metodo: 'manual', pares: { a1: 16, a2: 16 } });

  // age
  const r = podeComparar(antes, depois, 5);

  // confere
  assert.equal(r.comparar, false);
  assert.equal(r.caso, 'metodos_diferentes');
  assert.match(r.motivo, /formas diferentes/);
});

test('podeComparar recusa mão levantada nos dois lados: não há como parear', () => {
  // prepara
  const antes = apuracao({ metodo: 'manual' });
  const depois = apuracao({ metodo: 'manual' });

  // age
  const r = podeComparar(antes, depois, 5);

  // confere
  assert.equal(r.comparar, false);
  assert.equal(r.caso, 'sem_pareamento');
});

test('podeComparar sem a enquete "antes" (pulada no dia, D-008) avisa "sem medição de entrada"', () => {
  // prepara
  const depois = apuracao({ pares: { a1: 0, a2: 0 } });

  // age
  const r = podeComparar(null, depois, 5);

  // confere
  assert.equal(r.comparar, false);
  assert.equal(r.caso, 'sem_antes');
  assert.equal(r.motivo, 'Sem medição de entrada.');
});

test('podeComparar trata "antes" aberto e fechado sem nenhum voto como antes ausente', () => {
  // prepara
  const antes = apuracao({ n: { a1: 0, a2: 0 } });

  // age
  const r = podeComparar(antes, apuracao({ pares: { a1: 0, a2: 0 } }), 5);

  // confere
  assert.equal(r.caso, 'sem_antes');
});

test('podeComparar sem o "depois", ou sem nenhum dos dois', () => {
  // prepara / age
  const semDepois = podeComparar(apuracao(), undefined, 5);
  const semNada = podeComparar(null, null, 5);

  // confere
  assert.equal(semDepois.comparar, false);
  assert.equal(semDepois.caso, 'sem_depois');
  assert.equal(semNada.comparar, false);
  assert.equal(semNada.caso, 'sem_dados');
});

test('podeComparar com menos de minPareados pares: "turmas diferentes"', () => {
  // prepara
  const depois = apuracao({ pares: { a1: 4, a2: 9 } });

  // age
  const r = podeComparar(apuracao(), depois, 5);

  // confere
  assert.equal(r.comparar, false);
  assert.equal(r.caso, 'poucos_pares');
  assert.match(r.motivo, /Turmas diferentes: 4 pessoas responderam as duas vezes \(o mínimo é 5\)/);
});

test('podeComparar decide pela afirmação com menos pares, para não trocar de tela no meio', () => {
  // prepara: a1 passa folgado, a2 não
  const depois = apuracao({ pares: { a1: 18, a2: 3 } });

  // age
  const r = podeComparar(apuracao(), depois, 5);

  // confere
  assert.equal(r.caso, 'poucos_pares');
});

test('podeComparar sem transição gravada no "depois" nunca libera o pareado', () => {
  // prepara: celular nos dois lados, mas a transição não foi gravada
  const depois = apuracao();

  // age
  const r = podeComparar(apuracao(), depois, 5);

  // confere
  assert.equal(r.comparar, false);
  assert.equal(r.caso, 'poucos_pares');
  assert.match(r.motivo, /ninguém respondeu as duas vezes/);
});

test('podeComparar com minPareados 0 ainda exige pelo menos 1 par', () => {
  // prepara
  const semPar = apuracao({ pares: { a1: 0, a2: 0 } });
  const umPar = apuracao({ pares: { a1: 1, a2: 1 } });

  // age
  const r0 = podeComparar(apuracao(), semPar, 0);
  const r1 = podeComparar(apuracao(), umPar, 0);

  // confere
  assert.equal(r0.comparar, false);
  assert.equal(r1.comparar, true);
  assert.match(r1.motivo, /1 pessoa respondeu as duas vezes/);
});

test('podeComparar recusa minPareados que não é inteiro não negativo', () => {
  // prepara
  const antes = apuracao();
  const depois = apuracao({ pares: { a1: 10, a2: 10 } });

  // age / confere
  for (const min of [undefined, null, -1, 2.5, '5']) {
    assert.throws(() => podeComparar(antes, depois, min), TypeError, `deveria recusar ${min}`);
  }
});
