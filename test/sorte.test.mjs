// A sorte reproduzível e as chances efetivas das cartas (contratos seções 2 e 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { lerConfigTeste, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const S = V.sorte;
const M = V.motor;

test('gerador: mesma semente, mesma sequência, sempre em [0, 1)', () => {
  // Arrange
  const a = S.gerador(123);
  const b = S.gerador(123);

  // Act
  const sa = Array.from({ length: 1000 }, () => a());
  const sb = Array.from({ length: 1000 }, () => b());

  // Assert
  assert.deepEqual(sa, sb);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(sa.slice(0, 5), Array.from({ length: 5 }, S.gerador(124)));
});

test('gerador e derivar recusam semente que não é uint32', () => {
  // NaN >>> 0 é 0: sem esta trava, toda sala sem semente tiraria as mesmas cartas.
  for (const ruim of [NaN, -1, 1.5, 2 ** 32, '7', undefined]) {
    assert.throws(() => S.gerador(ruim), TypeError, String(ruim));
    assert.throws(() => S.derivar(ruim, 'carta:e1'), TypeError, String(ruim));
  }
});

test('derivar: determinístico, uint32 e diferente por rótulo', () => {
  // Act
  const e1 = S.derivar(42, 'carta:e1');
  const e2 = S.derivar(42, 'carta:e2');

  // Assert
  assert.equal(S.derivar(42, 'carta:e1'), e1);
  assert.ok(Number.isInteger(e1) && e1 >= 0 && e1 <= 0xFFFFFFFF);
  assert.notEqual(e1, e2);
  assert.notEqual(S.derivar(42, 'moeda:e1'), e1);
  assert.notEqual(S.derivar(43, 'carta:e1'), e1);
});

test('mesma semente, mesma carta; a carta de uma equipe não depende das outras', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());
  const args = (equipeId) => ({ equipeId, rodadaId: 'r2', opcaoId: 'a', estado: M.estadoInicial(config, equipeId), semente: 555 });

  // Act: e3 sozinha, e depois e3 apurada no meio das outras, em outra ordem.
  const sozinha = M.resolverRodada(config, args('e3'));
  const emGrupo = ['e6', 'e1', 'e3', 'e2'].map((e) => M.resolverRodada(config, args(e)))[2];

  // Assert
  assert.deepEqual(M.resolverRodada(config, args('e3')), sozinha);
  assert.deepEqual(emGrupo, sozinha);
});

test('sortearPonderado: 100 mil sorteios a ±1 ponto percentual das chances', () => {
  // Arrange
  const itens = [{ id: 'normal', peso: 50 }, { id: 'acidente', peso: 20 }, { id: 'chuva', peso: 12 }, { id: 'bonus', peso: 15 }, { id: 'raro', peso: 3 }];
  const total = itens.reduce((s, i) => s + i.peso, 0);
  const aleatorio = S.gerador(S.derivar(2026, 'teste'));
  const N = 100000;
  const contagem = Object.fromEntries(itens.map((i) => [i.id, 0]));

  // Act
  for (let k = 0; k < N; k++) contagem[S.sortearPonderado(itens, aleatorio)] += 1;

  // Assert
  for (const { id, peso } of itens) {
    const obtido = contagem[id] / N;
    assert.ok(Math.abs(obtido - peso / total) < 0.01, `${id}: ${obtido} × ${peso / total}`);
  }
});

test('sortearPonderado: peso 0 nunca sai, nem com o aleatório no limite', () => {
  // Arrange
  const itens = [{ id: 'zero_inicio', peso: 0 }, { id: 'a', peso: 1 }, { id: 'zero_meio', peso: 0 }, { id: 'b', peso: 2 }, { id: 'zero_fim', peso: 0 }];
  const aleatorio = S.gerador(9);
  const saiu = new Set();

  // Act
  for (let k = 0; k < 100000; k++) saiu.add(S.sortearPonderado(itens, aleatorio));
  const noTopo = S.sortearPonderado(itens, () => 0.9999999999999999);
  const noChao = S.sortearPonderado(itens, () => 0);

  // Assert
  assert.deepEqual([...saiu].sort(), ['a', 'b']);
  assert.equal(noTopo, 'b');
  assert.equal(noChao, 'a');
});

test('sortearPonderado: soma 0 ou peso inválido é erro', () => {
  assert.throws(() => S.sortearPonderado([], () => 0.5), /soma dos pesos é 0/);
  assert.throws(() => S.sortearPonderado([{ id: 'a', peso: 0 }], () => 0.5), /soma dos pesos é 0/);
  assert.throws(() => S.sortearPonderado([{ id: 'a', peso: -1 }], () => 0.5), /Peso inválido/);
  assert.throws(() => S.sortearPonderado([{ id: 'a', peso: NaN }], () => 0.5), /Peso inválido/);
});

function mapaDeChances(config, equipeId, rodadaId, opcaoId, estado) {
  const ch = M.chances(config, { equipeId, rodadaId, opcaoId, estado: estado || M.estadoInicial(config, equipeId) });
  return Object.fromEntries(ch.map((c) => [c.carta, c.peso]));
}

test('chances: "rodadas" restringe em que mês a carta existe', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act
  const r1 = mapaDeChances(config, 'e5', 'r1', 'c');
  const r3 = mapaDeChances(config, 'e5', 'r3', 'c');

  // Assert: acidente só em r2 e r3; bônus só em r1 e r2.
  assert.deepEqual(r1, { normal: 50, chuva: 12, bonus: 10 });
  assert.deepEqual(r3, { normal: 50, acidente: 6, chuva: 12 });
});

test('chances: "somenteSe" filtra por persona e por indicador', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());
  const cansado = { renda: 0, energia: 4, protecao: 0 };

  // Act / Assert
  assert.ok('multa' in mapaDeChances(config, 'e1', 'r1', 'c'), 'motoboy leva multa');
  assert.ok(!('multa' in mapaDeChances(config, 'e3', 'r1', 'c')), 'manicure não leva multa');
  assert.ok('cliente_fiel' in mapaDeChances(config, 'e3', 'r2', 'c'));
  assert.ok(!('doenca' in mapaDeChances(config, 'e5', 'r1', 'c')), 'energia 8 não adoece');
  assert.ok('doenca' in mapaDeChances(config, 'e5', 'r1', 'c', cansado), 'energia 4 adoece');
});

test('chances: "ajustesDePeso" em ordem, e as chances somam 1', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());
  const exausto = { renda: 0, energia: 2, protecao: 0 };

  // Act
  const opcaoC = mapaDeChances(config, 'e5', 'r2', 'c');
  const opcaoA = mapaDeChances(config, 'e5', 'r2', 'a');
  // (6 + 14) × 2: a soma vem antes da multiplicação, como no config.
  const opcaoAExausto = mapaDeChances(config, 'e5', 'r2', 'a', exausto);
  const lista = M.chances(config, { equipeId: 'e5', rodadaId: 'r2', opcaoId: 'a', estado: exausto });

  // Assert
  assert.equal(opcaoC.acidente, 6);
  assert.equal(opcaoA.acidente, 20);
  assert.equal(opcaoA.bonus, 15);
  assert.equal(opcaoAExausto.acidente, 40);
  assert.ok(Math.abs(lista.reduce((s, c) => s + c.chance, 0) - 1) < 1e-12);
});

test('chances: peso ajustado a 0 some da lista e nunca é sorteado', () => {
  // Arrange: a opção "b" zera a chuva.
  const bruto = lerConfigTeste();
  bruto.cartas.find((c) => c.id === 'chuva').ajustesDePeso = [{ se: { opcao: 'b' }, multiplica: 0 }];
  const config = normalizar(V, bruto);
  const estado = M.estadoInicial(config, 'e5');

  // Act
  const lista = M.chances(config, { equipeId: 'e5', rodadaId: 'r1', opcaoId: 'b', estado });
  const cartas = new Set();
  for (let s = 0; s < 3000; s++) cartas.add(M.resolverRodada(config, { equipeId: 'e5', rodadaId: 'r1', opcaoId: 'b', estado, semente: s }).carta);

  // Assert
  assert.ok(!lista.some((c) => c.carta === 'chuva'));
  assert.ok(!cartas.has('chuva'));
});
