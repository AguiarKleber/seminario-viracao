// O destaque da opção (D-084, nota de 14/10; pedido do Kleber antes do
// seminário): "destaque": true num efeito de opção vira uma linha no
// resultado de quem a escolheu ("Bloqueado 5 dias pelo app depois da greve
// −R$ 450: 3 dessas pessoas"). Os 5 dias de bloqueio da greve, do protesto e
// do breque já estavam somados no dinheiro da opção e não apareciam escritos.
// Aqui: o validador (só booleano, só onde a tela conta certo sem o motor, e o
// hash de um config sem a chave igual), a conta da tela (historia.
// destaquesDaOpcao e resultadoPorOpcao) contra o motor, e o jogo que não muda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { VAGAS, brutoIndividual } from './fixtures/individual.mjs';

const V = await carregarNucleo();
const H = V.historia;
const M = V.motor;
const { validar, hash } = V.validarConfig;

const brutoDoDia = () => JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const configDoDia = () => validar(brutoDoDia()).config;
const opcaoBruta = (bruto, rodadaId, opcaoId) => bruto.rodadas.find((r) => r.id === rodadaId).opcoes.find((o) => o.id === opcaoId);
const errosEm = (bruto, prefixo) => validar(bruto).erros.filter((e) => e.caminho.startsWith(prefixo));

// O config do dia sem nenhuma chave "destaque": o jogo de antes da nota.
function semDestaque(bruto) {
  for (const r of bruto.rodadas) for (const o of r.opcoes) for (const e of o.efeitos) delete e.destaque;
  return bruto;
}

const BLOQUEIOS = [
  ['r2', 'a', 'bloqueado 5 dias pelo app depois da greve'],
  ['r4', 'b', 'bloqueado 5 dias pelo app depois do protesto'],
  ['r5', 'c', 'bloqueado 5 dias pelo app depois do breque'],
];

// ---------- O validador ----------

test('config.json do dia: o destaque só nos 5 dias de bloqueio da greve, do protesto e do breque (−R$ 450 cada)', () => {
  // Arrange + Act
  const r = validar(brutoDoDia());
  const marcados = [];
  for (const rodadaId of r.config.ordem.rodadas) {
    for (const opcaoId of r.config.rodadas[rodadaId].ordemOpcoes) {
      for (const e of r.config.rodadas[rodadaId].opcoes[opcaoId].efeitos) if (e.destaque) marcados.push([rodadaId, opcaoId, e.rotulo, e.soma.renda]);
    }
  }

  // Assert
  assert.deepEqual(r.erros, []);
  assert.deepEqual(marcados, BLOQUEIOS.map(([rodadaId, opcaoId, rotulo]) => [rodadaId, opcaoId, rotulo, -450]));
});

test('validador: "destaque": false (ou ausente) some no normalizado, e o hash não muda; true entra e muda o hash', () => {
  // Arrange: a fixture individual (sem destaque) e a mesma com false e com true no "parar na greve".
  const base = brutoIndividual();
  const comFalse = brutoIndividual();
  opcaoBruta(comFalse, 'r2', 'a').efeitos[0].destaque = false;
  const comTrue = brutoIndividual();
  opcaoBruta(comTrue, 'r2', 'a').efeitos[0].destaque = true;

  // Act
  const [a, b, c] = [base, comFalse, comTrue].map((x) => validar(x));

  // Assert
  assert.deepEqual([a.erros, b.erros, c.erros], [[], [], []]);
  assert.equal(JSON.stringify(a.config).includes('"destaque"'), false, 'sem a chave, nada no normalizado');
  assert.equal(Object.hasOwn(b.config.rodadas.r2.opcoes.a.efeitos[0], 'destaque'), false, 'false some');
  assert.equal(hash(b.config), hash(a.config), 'false: o mesmo hash de sem a chave');
  assert.equal(c.config.rodadas.r2.opcoes.a.efeitos[0].destaque, true);
  assert.notEqual(hash(c.config), hash(a.config), 'true: é outro config');
});

test('validador: o destaque é booleano e só vale onde a tela conta certo sem o motor', () => {
  const casos = [
    ['não booleano', (b) => { opcaoBruta(b, 'r2', 'a').efeitos[0].destaque = 'sim'; }, 'rodadas.r2.opcoes.a.efeitos[0].destaque', /true ou false/],
    ['sem rótulo', (b) => { const e = opcaoBruta(b, 'r2', 'a').efeitos[0]; e.destaque = true; delete e.rotulo; }, 'rodadas.r2.opcoes.a.efeitos[0].destaque', /sem "rotulo"/],
    ['com multiplica', (b) => { opcaoBruta(b, 'r2', 'a').efeitos.push({ multiplica: { renda: 0.9 }, rotulo: 'x', destaque: true }); }, 'rodadas.r2.opcoes.a.efeitos[1].destaque', /sem "soma" na renda/],
    ['soma fora da renda', (b) => { opcaoBruta(b, 'r2', 'a').efeitos.push({ soma: { energia: -1 }, rotulo: 'x', destaque: true }); }, 'rodadas.r2.opcoes.a.efeitos[1].destaque', /sem "soma" na renda/],
    ['com condição de histórico', (b) => { opcaoBruta(b, 'r2', 'a').efeitos.push({ se: { decidiu: { r1: 'a' } }, soma: { renda: -100 }, rotulo: 'x', destaque: true }); }, 'rodadas.r2.opcoes.a.efeitos[1].destaque', /condição de decidiu/],
    ['nos efeitos gerais da rodada', (b) => { b.rodadas.find((r) => r.id === 'r2').efeitosGerais[0].destaque = true; }, 'rodadas.r2.efeitosGerais[0].destaque', /só vale nos efeitos de uma opção/],
    ['junto do empréstimo', (b) => { opcaoBruta(b, 'r2', 'c').efeitos[0].destaque = true; }, 'rodadas.r2.opcoes.c.efeitos[0].destaque', /junto de "emprestimo"/],
  ];
  for (const [nome, mexer, caminho, mensagem] of casos) {
    // Arrange
    const bruto = brutoIndividual();
    mexer(bruto);

    // Act
    const erros = errosEm(bruto, caminho);

    // Assert
    assert.ok(erros.some((e) => mensagem.test(e.mensagem)), `${nome}: ${JSON.stringify(validar(bruto).erros)}`);
  }
  // A condição de persona, opção ou rodada (o efeito direto) é aceita.
  const direto = brutoIndividual();
  Object.assign(opcaoBruta(direto, 'r2', 'a').efeitos[0], { se: { persona: 'motoboy', rodada: 'r2' }, destaque: true });
  assert.deepEqual(validar(direto).erros, []);
});

// ---------- A conta da tela ----------

test('destaquesDaOpcao: o motivo e o valor do efeito marcado, só na opção dele; config sem destaque dá []', () => {
  const cfg = configDoDia();
  for (const [rodadaId, opcaoId, rotulo] of BLOQUEIOS) {
    for (const outra of cfg.rodadas[rodadaId].ordemOpcoes) {
      const esperado = outra === opcaoId ? [{ motivo: rotulo, valor: -450 }] : [];
      assert.deepEqual(H.destaquesDaOpcao(cfg, rodadaId, outra, 'motoboy'), esperado, `${rodadaId}/${outra}`);
    }
  }
  const sem = validar(semDestaque(brutoDoDia())).config;
  assert.deepEqual(H.destaquesDaOpcao(sem, 'r2', 'a', 'motoboy'), []);
  // Com condição de persona, só a persona dela leva o destaque (efeitoDireto).
  const soDoMotoboy = brutoIndividual();
  Object.assign(opcaoBruta(soDoMotoboy, 'r2', 'a').efeitos[0], { se: { persona: 'motoboy' }, destaque: true });
  const cfgMotoboy = validar(soDoMotoboy).config;
  assert.deepEqual(H.destaquesDaOpcao(cfgMotoboy, 'r2', 'a', 'motoboy'), [{ motivo: 'Parar no dia da greve', valor: -720 }]);
  assert.deepEqual(H.destaquesDaOpcao(cfgMotoboy, 'r2', 'a', 'outra'), []);
});

test('o destaque é o que o motor cobra: em todo caminho até a greve, o protesto e o breque, a linha da opção com o mesmo rótulo e o mesmo valor', () => {
  const cfg = configDoDia();
  const rodadas = cfg.ordem.rodadas;
  let conferidos = 0;
  // Todos os caminhos até a rodada do bloqueio (5^k), e nela cada uma das 5 opções.
  const andar = (k, alvo, estado, historico) => {
    const rodadaId = rodadas[k];
    for (const opcaoId of cfg.rodadas[rodadaId].ordemOpcoes) {
      const carta = M.chances(cfg, { equipeId: VAGAS[0], rodadaId, opcaoId, estado, historico })[0].carta;
      const a = M.aplicar(cfg, { equipeId: VAGAS[0], rodadaId, opcaoId, cartaId: carta, estado, historico });
      if (k < alvo) {
        andar(k + 1, alvo, a.depois, { ...historico, [rodadaId]: { decisao: opcaoId, carta } });
        continue;
      }
      const daOpcao = a.linhas.filter((l) => l.origem === 'opcao' && l.indicador === 'renda').map((l) => ({ motivo: l.rotulo, valor: Math.round(l.valor) + 0 }));
      for (const d of H.destaquesDaOpcao(cfg, rodadaId, opcaoId, 'motoboy')) {
        assert.ok(daOpcao.some((l) => l.motivo === d.motivo && l.valor === d.valor), `${rodadaId}/${opcaoId}: ${JSON.stringify(daOpcao)}`);
        assert.equal(a.linhas.some((l) => l.origem === 'piso'), false, `${rodadaId}/${opcaoId}: o piso do trabalho não come o bloqueio`);
        conferidos += 1;
      }
    }
  };
  for (const [rodadaId] of BLOQUEIOS) andar(0, rodadas.indexOf(rodadaId), M.estadoInicial(cfg, VAGAS[0]), {});
  assert.equal(conferidos, 5 + 5 ** 3 + 5 ** 4, 'r2 (5 caminhos), r4 (125) e r5 (625)');
});

test('resultadoPorOpcao: o destaque embaixo da opção, com quantas dessas pessoas; a opção sem ninguém e as outras ficam sem', () => {
  // Arrange: 20 pessoas em mar–abr; 3 pararam na greve (A), 2 rodaram no 99Food (B), 15 no resto.
  const cfg = configDoDia();
  const escolhas = ['a', 'a', 'a', 'b', 'b', ...Array.from({ length: 15 }, (_, i) => ['d', 'e'][i % 2])];
  const resultados = { r2: Object.fromEntries(VAGAS.map((v, i) => [v, { decisao: escolhas[i], mes: { saldoMes: -100 * i }, depois: { renda: -1000 } }])) };

  // Act
  const c = H.resultadoPorOpcao(cfg, 'r2', resultados);

  // Assert
  assert.deepEqual(c.porOpcao.map((o) => [o.id, o.n, o.destaques]), [
    ['a', 3, [{ motivo: 'bloqueado 5 dias pelo app depois da greve', valor: -450, pessoas: 3 }]],
    ['b', 2, []],
    ['c', 0, []],
    ['d', 8, []],
    ['e', 7, []],
  ]);
  assert.equal(H.quantasDessas(3, 3), '3 dessas pessoas');
});

test('resultadoPorOpcao: config sem destaque, tudo igual a antes e nenhum destaque', () => {
  // Arrange: o mesmo resultado lido com o config do dia e com ele sem a chave.
  const com = configDoDia();
  const sem = validar(semDestaque(brutoDoDia())).config;
  const resultados = { r5: Object.fromEntries(VAGAS.map((v, i) => [v, { decisao: 'abcde'[i % 5], mes: { saldoMes: 10 * i }, depois: { renda: 50 * i }, deAntes: i % 3 === 0 ? [{ rotulo: 'a moto quebrou (revisão adiada): relação', valor: -790 }] : [] }])) };

  // Act
  const a = H.resultadoPorOpcao(com, 'r5', resultados);
  const b = H.resultadoPorOpcao(sem, 'r5', resultados);

  // Assert
  assert.ok(b.porOpcao.every((o) => o.destaques.length === 0), 'sem a chave, nenhum destaque');
  const semOsDestaques = (x) => ({ ...x, porOpcao: x.porOpcao.map(({ destaques: _destaques, ...resto }) => resto) });
  assert.deepEqual(semOsDestaques(a), semOsDestaques(b), 'o resto do resultado é o mesmo');
  assert.deepEqual(a.porOpcao.find((o) => o.id === 'c').destaques, [{ motivo: 'bloqueado 5 dias pelo app depois do breque', valor: -450, pessoas: 4 }]);
});

// ---------- O jogo não muda ----------

test('o destaque não muda o jogo: as 15.625 combinações dão o mesmo com e sem a chave (281 fecham, ADCEDA +R$ 1.714, DAECCC −R$ 6.135)', () => {
  const letras = (cfg, opcoes) => opcoes.map((o, k) => 'ABCDE'[cfg.rodadas[cfg.ordem.rodadas[k]].ordemOpcoes.indexOf(o)]).join('');
  const resumo = (cfg) => {
    const c = M.enumerarCombinacoes(cfg, { equipeId: VAGAS[0], rodadas: cfg.ordem.rodadas });
    return [c.total, c.fecham, letras(cfg, c.melhor.opcoes), Math.round(c.melhor.valor), letras(cfg, c.pior.opcoes), Math.round(c.pior.valor)];
  };
  const com = configDoDia();
  const sem = validar(semDestaque(brutoDoDia())).config;
  assert.deepEqual(resumo(com), [15625, 281, 'ADCEDA', 1714, 'DAECCC', -6135]);
  assert.deepEqual(resumo(sem), resumo(com));
});
