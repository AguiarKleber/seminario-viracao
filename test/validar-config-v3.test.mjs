// O validador no esquema v3 (D-060: 12 meses em 6 rodadas bimestrais):
// regras.mesesPorRodada, os dias parados que cabem na rodada inteira, a
// garantia de "carta possível" sem enumerar (6 rodadas passam de 20 mil
// estados) e o bin, que passa à simulação acima de 200 mil caminhos de cartas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { CAMINHO_CONFIG_TESTE_V3, configMinimo, lerConfigTesteV21, lerConfigTesteV3, textoConfigRealV22 } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { validar, validarTexto, hash } = V.validarConfig;

const carta = (b, id) => b.cartas.find((c) => c.id === id);
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));
const listar = (lista) => lista.map((p) => `  ${p.caminho}: ${p.mensagem}`).join('\n') || '  (nada)';

test('a fixture v3 (6 rodadas, 20 cartas, bimestre) é válida, sem aviso, e valida depressa', () => {
  // Act
  const t = performance.now();
  const r = validar(lerConfigTesteV3());
  const ms = performance.now() - t;

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
  assert.equal(r.config.regras.mesesPorRodada, 2);
  assert.equal(r.config.ordem.rodadas.length, 6);
  assert.equal(r.config.ordem.cartas.length, 20);
  for (const passos of Object.values(r.config.roteiros)) assert.equal(passos.filter((p) => p.tipo === 'rodada').length, 6);
  // O telão valida o config ao abrir: com a garantia sem enumerar, é instantâneo.
  assert.ok(ms < 2000, `validar levou ${Math.round(ms)} ms`);
});

test('mesesPorRodada ausente não entra no normalizado (o hash do config antigo não muda); presente, entra', () => {
  // Arrange
  const semChave = lerConfigTesteV21();
  const comUm = lerConfigTesteV21();
  comUm.regras.mesesPorRodada = 1;

  // Act
  const a = validar(semChave).config;
  const b = validar(comUm).config;

  // Assert
  assert.equal(Object.hasOwn(a.regras, 'mesesPorRodada'), false);
  assert.equal(b.regras.mesesPorRodada, 1);
  assert.notEqual(hash(a), hash(b), 'escrito, faz parte do conteúdo');
  // O config do teste de 30/09 (3 rodadas, sem a chave) continua válido, sem ela
  // e com o mesmo hash de antes; o config.json de 12 meses (D-060) a escreve.
  const v22 = validarTexto(textoConfigRealV22());
  assert.equal(v22.ok, true, listar(v22.erros));
  assert.equal(Object.hasOwn(v22.config.regras, 'mesesPorRodada'), false);
  assert.equal(hash(v22.config), 'fc0c3c35');
  const real = validarTexto(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  assert.equal(real.ok, true, listar(real.erros));
  assert.equal(real.config.regras.mesesPorRodada, 2);
});

test('mesesPorRodada: inteiro ≥ 1; outro valor é erro', () => {
  for (const [valor, re] of [[0, /maior que 0/], [-2, /maior que 0/], [1.5, /inteiro/], ['2', /número finito/], [null, /número finito/]]) {
    // Arrange
    const b = configMinimo();
    b.regras.mesesPorRodada = valor;

    // Act
    const r = validar(b);

    // Assert
    assert.ok(achou(r.erros, 'regras.mesesPorRodada', re), `${JSON.stringify(valor)}:\n${listar(r.erros)}`);
  }
});

test('diasParado cabe na rodada inteira: 60 no bimestre, 30 no mês', () => {
  // Arrange
  const caso = (meses, dias) => {
    const b = configMinimo();
    if (meses !== undefined) b.regras.mesesPorRodada = meses;
    carta(b, 'normal').diasParado = dias;
    return validar(b);
  };

  // Act e Assert
  assert.equal(caso(2, 45).ok, true, 'a fratura de 45 dias cabe no bimestre');
  assert.equal(caso(2, 60).ok, true);
  assert.ok(achou(caso(2, 61).erros, 'cartas.normal.diasParado', /61 dias parado: uma rodada de 2 meses tem 60/));
  assert.ok(achou(caso(undefined, 31).erros, 'cartas.normal.diasParado', /31 dias parado: um mês tem 30/), 'a mensagem de antes, com rodadas mensais');
});

test('carta possível: com uma carta que sai em qualquer estado, 6 rodadas não precisam enumerar', () => {
  // Arrange: a "normal" da fixture v3 não tem condição. Um ajuste que só sobe o
  // peso (soma > 0 com energia baixa) não tira a garantia.
  const b = lerConfigTesteV3();
  carta(b, 'normal').ajustesDePeso = [{ se: { indicador: { energia: { abaixoDe: 3 } } }, soma: 10 }, { se: { rodada: 'r6' }, multiplica: 2 }];

  // Act
  const r = validar(b);

  // Assert
  assert.equal(r.ok, true, listar(r.erros));
});

test('carta possível: sem carta garantida, 6 rodadas passam do limite de estados, e é erro', () => {
  // Arrange: toda carta passa a ler o estado (um somenteSe de proteção que
  // sempre vale), e a "normal" some com a energia baixa (multiplica 0, que pode
  // baixar o peso): nenhuma carta sai em qualquer estado, e a garantia depende
  // da enumeração, que passa de 20 mil estados antes da 6ª rodada.
  const b = lerConfigTesteV3();
  for (const c of b.cartas) c.somenteSe = { ...c.somenteSe, indicador: { ...c.somenteSe?.indicador, protecao: { acimaDe: -1 } } };
  carta(b, 'normal').ajustesDePeso = [{ se: { indicador: { energia: { abaixoDe: 1 } } }, multiplica: 0 }];

  // Act
  const r = validar(b);

  // Assert
  assert.equal(r.ok, false);
  assert.ok(achou(r.erros, 'cartas', /estados alcançáveis/), listar(r.erros));
});

test('carta possível: carta garantida só numa persona não vale pelas outras', () => {
  // Arrange: no mínimo, a única carta sai só com a opção "a"; com a "b", a
  // garantia sem enumerar falha, e a enumeração acha o baralho vazio.
  const b = configMinimo();
  carta(b, 'normal').somenteSe = { opcao: 'a' };

  // Act
  const r = validar(b);

  // Assert
  assert.ok(achou(r.erros, 'rodadas.r1.opcoes.b', /nenhuma carta possível/), listar(r.erros));
});

test('bin/validar-config.mjs com 6 rodadas × 20 cartas: simulação determinística, em menos de 2 minutos', () => {
  // Act
  const t = performance.now();
  const saida = spawnSync(process.execPath, [join(RAIZ, 'bin', 'validar-config.mjs'), CAMINHO_CONFIG_TESTE_V3], { encoding: 'utf8', timeout: 180000 });
  const segundos = (performance.now() - t) / 1000;

  // Assert
  assert.equal(saida.status, 0, saida.stderr + saida.stdout.slice(-2000));
  assert.match(saida.stdout, /Modo: SIMULAÇÃO determinística/);
  assert.match(saida.stdout, /Quem fecha o básico no fim dos 12 meses \(D-050, D-058\), estimado/);
  assert.match(saida.stdout, /Cada rodada vale 2 meses/);
  assert.match(saida.stdout, /\(i\) Conta do mês/);
  assert.ok(segundos < 120, `o validador levou ${Math.round(segundos)} s`);
});
