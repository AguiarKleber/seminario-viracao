// O motor do jogo: semântica dos efeitos, chances, resolução, consolidação da
// decisão e placar decomposto (contratos seção 3; arquitetura seções 7 e 8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { configMinimo, lerConfigTeste, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;

function aplicarA(config, estado, { opcaoId = 'a', cartaId = 'normal' } = {}) {
  return M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId, cartaId, estado });
}

test('efeitos na ordem fixa: persona → gerais → opção → carta', () => {
  // Arrange: cada etapa alterna soma e multiplica, então qualquer outra ordem
  // daria outro número. ((0 + 100) × 2 + 10) × 3 = 630.
  const bruto = configMinimo();
  bruto.personas[0].todoMes = [{ soma: { renda: 100 } }];
  bruto.rodadas[0].efeitosGerais = [{ multiplica: { renda: 2 } }];
  bruto.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: 10 } }];
  bruto.cartas[0].efeitos = [{ multiplica: { renda: 3 } }];
  const config = normalizar(V, bruto);

  // Act
  const r = aplicarA(config, { renda: 0, energia: 8 });

  // Assert
  assert.equal(r.delta.renda, 630);
  assert.deepEqual(r.linhas.map((l) => l.origem), ['persona', 'geral', 'opcao', 'carta']);
  assert.deepEqual(r.linhas.map((l) => l.valor), [100, 100, 10, 420]);
});

test('soma adiciona ao delta; multiplica multiplica só o delta daquele indicador', () => {
  // Arrange
  const bruto = configMinimo();
  bruto.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: 200, energia: -2 } }];
  bruto.cartas[0].efeitos = [{ multiplica: { renda: 0.5 } }, { multiplica: { energia: 0 } }];
  const config = normalizar(V, bruto);

  // Act
  const r = aplicarA(config, { renda: 1000, energia: 8 });

  // Assert: o fator age no delta do mês (200 → 100), nunca no acumulado (1000).
  assert.equal(r.delta.renda, 100);
  assert.equal(r.depois.renda, 1100);
  assert.ok(Object.is(r.delta.energia, 0), 'delta negativo × 0 precisa dar 0, e não -0');
  assert.equal(r.depois.energia, 8);
});

test('condição lê o estado de ANTES da rodada, não o delta em andamento', () => {
  // Arrange: a persona derruba a energia de 8 para 3 neste mês, mas as condições
  // da carta enxergam 8.
  const bruto = configMinimo();
  bruto.personas[0].todoMes = [{ soma: { energia: -5 } }];
  bruto.cartas[0].efeitos = [
    { se: { indicador: { energia: { abaixoDe: 5 } } }, soma: { renda: 999 } },
    { se: { indicador: { energia: { acimaDe: 7 } } }, soma: { renda: 1 } },
  ];
  bruto.cartas.push({
    id: 'queda', titulo: 'Queda', peso: 1, efeitos: [],
    somenteSe: { indicador: { energia: { abaixoDe: 5 } } },
  });
  const config = normalizar(V, bruto);
  const estado = { renda: 0, energia: 8 };

  // Act
  const r = aplicarA(config, estado);
  const ch = M.chances(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', estado });

  // Assert
  assert.equal(r.delta.renda, 1);
  assert.equal(r.depois.energia, 3);
  assert.deepEqual(ch.map((c) => c.carta), ['normal'], 'somenteSe também lê o estado anterior');
});

test('clamp em min e max só no fim; o delta devolvido é o de antes do clamp', () => {
  // Arrange
  const bruto = configMinimo();
  bruto.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: 5000, energia: -20 } }];
  const config = normalizar(V, bruto);

  // Act
  const r = aplicarA(config, { renda: 99000, energia: 8 });

  // Assert
  assert.deepEqual(r.depois, { renda: 100000, energia: 0 });
  assert.deepEqual(r.delta, { renda: 5000, energia: -20 });
});

test('estadoInicial: o inicial do indicador, sobrescrito pela persona', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act / Assert
  assert.deepEqual(M.estadoInicial(config, 'e1'), { renda: 0, energia: 8, protecao: 0 });
  assert.deepEqual(M.estadoInicial(config, 'e2'), { renda: 0, energia: 9, protecao: 0 });
  assert.deepEqual(M.estadoInicial(config, 'e3'), { renda: 0, energia: 8, protecao: 1 });
});

test('condicaoVale: id ou lista, todas as chaves juntas, limites estritos', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());
  const ctx = { equipeId: 'e6', rodadaId: 'r2', opcaoId: 'a', estado: { renda: 0, energia: 3, protecao: 2 } };

  // Act / Assert
  assert.equal(M.condicaoVale(config, undefined, ctx), true);
  assert.equal(M.condicaoVale(config, { persona: 'motoboy' }, ctx), true, 'persona vem da equipe');
  assert.equal(M.condicaoVale(config, { opcao: ['b', 'a'], rodada: 'r2' }, ctx), true);
  assert.equal(M.condicaoVale(config, { opcao: 'a', rodada: 'r1' }, ctx), false, 'todas precisam valer');
  assert.equal(M.condicaoVale(config, { equipe: ['e1', 'e2'] }, ctx), false);
  assert.equal(M.condicaoVale(config, { indicador: { protecao: { acimaDe: 2 } } }, ctx), false, 'acimaDe é estrito');
  assert.equal(M.condicaoVale(config, { indicador: { energia: { abaixoDe: 4, acimaDe: 2 } } }, ctx), true);
});

test('referência: config, decisões e semente fixos dão um placar exato', () => {
  // Arrange: se este número mudar, a apuração mudou, e uma sala já jogada deixa
  // de bater com o simulador. Mude só de propósito, e explique no commit.
  const config = normalizar(V, lerConfigTeste());
  const semente = 20260928;
  const decisoes = { e1: ['a', 'a', 'b'], e2: ['b', 'b', 'c'], e3: ['c', 'a', 'a'], e4: ['a', 'c', 'b'], e5: ['b', 'b', 'a'], e6: ['a', 'a', 'b'] };

  // Act
  const placar = {};
  for (const [equipeId, opcoes] of Object.entries(decisoes)) {
    let estado = M.estadoInicial(config, equipeId);
    const rodadas = [];
    config.ordem.rodadas.forEach((rodadaId, i) => {
      // Uma semente por rodada, como em sementes/{r}.
      const sementeRodada = V.sorte.derivar(semente, 'rodada:' + rodadaId);
      const r = M.resolverRodada(config, { equipeId, rodadaId, opcaoId: opcoes[i], estado, semente: sementeRodada });
      rodadas.push({ rodadaId, opcaoId: opcoes[i], cartaId: r.carta });
      estado = r.depois;
    });
    const d = M.decompor(config, { equipeId, rodadas });
    placar[equipeId] = { cartas: rodadas.map((r) => r.cartaId).join(','), ...estado, ...arredondar(d) };
  }

  // Assert
  assert.deepEqual(placar, REFERENCIA);
});

// Arredonda a 2 casas só para comparar: o motor guarda o número exato.
function arredondar(d) {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Math.round(v * 100) / 100]));
}

const REFERENCIA = {
  e1: { cartas: 'normal,chuva,normal', renda: 8950, energia: 0, protecao: 0, realizado: 8950, esperadoComDecisoes: 8466.66, esperadoPiloto: 7254.75, efeitoDecisoes: 1211.91, sorte: 483.34, piorCaso: 4790 },
  e2: { cartas: 'normal,normal,normal', renda: 3520, energia: 4, protecao: 6, realizado: 3520, esperadoComDecisoes: 3617.15, esperadoPiloto: 4764.21, efeitoDecisoes: -1147.06, sorte: -97.15, piorCaso: 2470 },
  e3: { cartas: 'normal,normal,cliente_fiel', renda: 5600, energia: 6, protecao: 3, realizado: 5600, esperadoComDecisoes: 4721.01, esperadoPiloto: 6036.39, efeitoDecisoes: -1315.38, sorte: 878.99, piorCaso: 2490 },
  e4: { cartas: 'normal,multa,normal', renda: 9500, energia: 3, protecao: 0, realizado: 9500, esperadoComDecisoes: 9401.59, esperadoPiloto: 8116.08, efeitoDecisoes: 1285.51, sorte: 98.41, piorCaso: 5300 },
  // e5 conferido à mão: 1420 no mês 1; no mês 2, 1000 × 0,3 + 1500 de auxílio
  // (proteção 3 > 2 no estado de ANTES) = 1800; no mês 3, +1000. Total 4220.
  e5: { cartas: 'normal,acidente,normal', renda: 4220, energia: 8, protecao: 5, realizado: 4220, esperadoComDecisoes: 3661.18, esperadoPiloto: 5049.96, efeitoDecisoes: -1388.78, sorte: 558.82, piorCaso: 2320 },
  // Mesma persona e mesmas decisões da e1 (D-004): só a sorte difere.
  e6: { cartas: 'normal,normal,normal', renda: 9250, energia: 0, protecao: 0, realizado: 9250, esperadoComDecisoes: 8466.66, esperadoPiloto: 7254.75, efeitoDecisoes: 1211.91, sorte: 783.34, piorCaso: 4790 },
};

test('decompor: enumeração exata num caso feito à mão', () => {
  // Arrange: a opção "a" aumenta a fatia da carta boa (1:3 vira 3:3).
  //   piloto (b): (500×1 + 100×3) / 4 = 200
  //   decisão (a): (500×3 + 100×3) / 6 = 300
  const bruto = configMinimo();
  bruto.cartas = [
    { id: 'boa', titulo: 'Boa', peso: 1, ajustesDePeso: [{ se: { opcao: 'a' }, soma: 2 }], efeitos: [{ soma: { renda: 500 } }] },
    { id: 'normal', titulo: 'Normal', peso: 3, efeitos: [{ soma: { renda: 100 } }] },
  ];
  const config = normalizar(V, bruto);

  // Act
  const d = M.decompor(config, { equipeId: 'e1', rodadas: [{ rodadaId: 'r1', opcaoId: 'a', cartaId: 'boa' }] });

  // Assert
  assert.deepEqual(d, { realizado: 500, esperadoComDecisoes: 300, esperadoPiloto: 200, efeitoDecisoes: 100, sorte: 200, piorCaso: 100 });
});

test('decompor: a chance do mês 2 depende do mês 1 (árvore, não produto)', () => {
  // Arrange: "queda" só existe se o mês 1 derrubou a energia. Esperado:
  // ½ × (½ × −1000 + ½ × 0) + ½ × 0 = −250.
  const bruto = configMinimo();
  bruto.rodadas.push({ id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'a', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  bruto.roteiros['60min'].splice(2, 0, { tipo: 'rodada', rodada: 'r2' });
  bruto.cartas = [
    { id: 'normal', titulo: 'Normal', peso: 1, efeitos: [] },
    { id: 'cansa', titulo: 'Cansa', peso: 1, rodadas: ['r1'], efeitos: [{ soma: { energia: -5 } }] },
    { id: 'queda', titulo: 'Queda', peso: 1, rodadas: ['r2'], somenteSe: { indicador: { energia: { abaixoDe: 5 } } }, efeitos: [{ soma: { renda: -1000 } }] },
  ];
  const config = normalizar(V, bruto);

  // Act
  const d = M.decompor(config, {
    equipeId: 'e1',
    rodadas: [{ rodadaId: 'r1', opcaoId: 'a', cartaId: 'cansa' }, { rodadaId: 'r2', opcaoId: 'a', cartaId: 'queda' }],
  });

  // Assert
  assert.equal(d.esperadoComDecisoes, -250);
  assert.equal(d.realizado, -1000);
  assert.equal(d.piorCaso, -1000);
});

test('decompor confere com 10.000 simulações', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());
  const equipeId = 'e1';
  const opcoes = ['a', 'a', 'b'];
  const padroes = config.ordem.rodadas.map((r) => config.rodadas[r].padrao);
  const semear = V.sorte.gerador(777);
  const N = 10000;

  const simular = (plano) => {
    const rendas = [];
    for (let i = 0; i < N; i++) {
      let estado = M.estadoInicial(config, equipeId);
      config.ordem.rodadas.forEach((rodadaId, k) => {
        const semente = Math.floor(semear() * 4294967296);
        estado = M.resolverRodada(config, { equipeId, rodadaId, opcaoId: plano[k], estado, semente }).depois;
      });
      rendas.push(estado.renda);
    }
    const media = rendas.reduce((s, x) => s + x, 0) / N;
    const dp = Math.sqrt(rendas.reduce((s, x) => s + (x - media) ** 2, 0) / (N - 1));
    return { media, erroPadrao: dp / Math.sqrt(N), minimo: Math.min(...rendas) };
  };

  // Act
  const d = M.decompor(config, {
    equipeId,
    rodadas: config.ordem.rodadas.map((rodadaId, k) => ({ rodadaId, opcaoId: opcoes[k], cartaId: 'normal' })),
  });
  const comDecisoes = simular(opcoes);
  const piloto = simular(padroes);

  // Assert: 4 erros-padrão deixam o teste estável (falso alarme < 1 em 10.000).
  assert.ok(Math.abs(comDecisoes.media - d.esperadoComDecisoes) < 4 * comDecisoes.erroPadrao,
    `simulado ${comDecisoes.media} × enumerado ${d.esperadoComDecisoes}`);
  assert.ok(Math.abs(piloto.media - d.esperadoPiloto) < 4 * piloto.erroPadrao,
    `simulado ${piloto.media} × enumerado ${d.esperadoPiloto}`);
  assert.ok(comDecisoes.minimo >= d.piorCaso - 1e-9, 'nenhuma simulação fica abaixo do pior caso');
  assert.ok(Math.abs(d.esperadoPiloto + d.efeitoDecisoes + d.sorte - d.realizado) < 1e-9);
});

test('consolidarDecisao: maioria', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act
  const c = M.consolidarDecisao(config, { rodadaId: 'r1', votos: { u1: 'a', u2: 'a', u3: 'b' }, equipeId: 'e1', semente: 1 });

  // Assert
  assert.deepEqual(c, { decisao: 'a', origem: 'maioria', contagem: { a: 2, b: 1, c: 0 }, empate: null });
});

test('consolidarDecisao: sem votos vale o padrão (piloto automático)', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act
  const c = M.consolidarDecisao(config, { rodadaId: 'r3', votos: {}, equipeId: 'e1', semente: 1 });

  // Assert
  assert.deepEqual(c, { decisao: 'b', origem: 'piloto', contagem: { a: 0, b: 0, c: 0 }, empate: null });
});

test('consolidarDecisao: empate na primeira volta pede prorrogação', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act
  const c = M.consolidarDecisao(config, { rodadaId: 'r1', votos: { u1: 'c', u2: 'a', u3: 'b', u4: 'c', u5: 'a' }, equipeId: 'e1', semente: 1 });

  // Assert: empatados na ordem do config, e nenhuma decisão ainda.
  assert.deepEqual(c, { decisao: null, origem: null, contagem: { a: 2, b: 1, c: 2 }, empate: ['a', 'c'] });
});

test('consolidarDecisao: maioria depois da prorrogação', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act
  const c = M.consolidarDecisao(config, { rodadaId: 'r1', votos: { u1: 'c', u2: 'c', u3: 'a' }, aposProrrogacao: true, equipeId: 'e1', semente: 1 });

  // Assert
  assert.equal(c.decisao, 'c');
  assert.equal(c.origem, 'prorrogacao');
  assert.equal(c.empate, null);
});

test('consolidarDecisao: empate depois da prorrogação vai para a moeda, reproduzível', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());
  const votos = { u1: 'a', u2: 'b' };
  const moeda = (semente, equipeId) => M.consolidarDecisao(config, { rodadaId: 'r1', votos, aposProrrogacao: true, semente, equipeId });

  // Act
  const c = moeda(42, 'e3');
  const resultados = new Set();
  for (let s = 0; s < 200; s++) resultados.add(moeda(s, 'e3').decisao);

  // Assert
  assert.equal(c.origem, 'moeda');
  assert.deepEqual(c.empate, ['a', 'b']);
  assert.ok(['a', 'b'].includes(c.decisao));
  assert.deepEqual(moeda(42, 'e3'), c, 'mesma semente e equipe, mesma moeda');
  assert.deepEqual([...resultados].sort(), ['a', 'b'], 'a moeda tem os dois lados');
});

test('consolidarDecisao: com candidatas (a prorrogação), maioria e moeda só entre as empatadas', () => {
  // Arrange: na prorrogação entre a e b, saíram um eleitor de cada; o voto em c ficou
  const config = normalizar(V, lerConfigTeste());
  const votos = { u1: 'a', u2: 'b', u3: 'c' };
  const pedido = (semente) => ({ rodadaId: 'r1', votos, aposProrrogacao: true, semente, equipeId: 'e1', candidatas: ['a', 'b'] });

  // Act
  const moedas = new Set();
  for (let s = 0; s < 200; s++) moedas.add(M.consolidarDecisao(config, pedido(s)).decisao);
  const soC = M.consolidarDecisao(config, { ...pedido(1), votos: { u3: 'c' } });

  // Assert
  assert.deepEqual([...moedas].sort(), ['a', 'b'], 'c nunca sai da moeda');
  assert.deepEqual(M.consolidarDecisao(config, pedido(3)).empate, ['a', 'b']);
  assert.deepEqual(M.consolidarDecisao(config, pedido(3)).contagem, { a: 1, b: 1, c: 1 });
  assert.equal(soC.origem, 'moeda', 'c sozinho não vira maioria na prorrogação');
  assert.ok(['a', 'b'].includes(soC.decisao));
});

test('consolidarDecisao: a decisão do apresentador vence tudo', () => {
  // Arrange
  const config = normalizar(V, lerConfigTeste());

  // Act
  const c = M.consolidarDecisao(config, { rodadaId: 'r1', votos: { u1: 'a', u2: 'a' }, forcada: 'b', equipeId: 'e1', semente: 1 });
  const semVotos = M.consolidarDecisao(config, { rodadaId: 'r1', votos: {}, forcada: 'a', equipeId: 'e1', semente: 1 });

  // Assert
  assert.deepEqual(c, { decisao: 'b', origem: 'apresentador', contagem: { a: 2, b: 0, c: 0 }, empate: null });
  assert.equal(semVotos.origem, 'apresentador');
  assert.throws(() => M.consolidarDecisao(config, { rodadaId: 'r1', votos: {}, forcada: 'zz', equipeId: 'e1', semente: 1 }), /zz/);
});

test('o motor lê o conteúdo que volta do RTDB (listas vazias somem, listas viram objetos)', () => {
  // Arrange: imita o RTDB, que apaga [] e {} e pode devolver lista como objeto.
  const config = normalizar(V, lerConfigTeste());
  const doBanco = JSON.parse(JSON.stringify(config), (_k, v) => {
    if (Array.isArray(v)) return v.length === 0 ? undefined : Object.fromEntries(v.map((x, i) => [String(i), x]));
    if (v && typeof v === 'object' && Object.keys(v).length === 0) return undefined;
    return v;
  });
  const args = { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'a', estado: { renda: 100, energia: 2, protecao: 3 }, semente: 99 };

  // Act / Assert
  assert.deepEqual(M.resolverRodada(doBanco, args), M.resolverRodada(config, args));
});
