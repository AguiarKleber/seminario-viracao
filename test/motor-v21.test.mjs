// O motor no esquema v2.1 (contratos seção 3): custo fixo do trabalho (fixo) e
// gasto por causa de um evento (categoria "gasto") fora de qualquer multiplica,
// o "entrou" sem os gastos, e o custo real da carta (cartaCusto, D-052).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { configMinimo, lerConfigTesteV2, lerConfigTesteV21, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;

const ESTADO = { renda: 0, energia: 8 };
const aplicarMinimo = (b, extra = {}) => M.aplicar(normalizar(V, b), { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: ESTADO, ...extra });

test('ordem do mês v2.1: trabalho variável → − custos fixos → − gastos → + outra renda → − básico → − juros', () => {
  // Arrange: dívida de 500 antes do mês e juros de 10% ao mês.
  //   trabalho variável = (2000 − 200) × 2 − 300 (carta, soma) = 3300;
  //   custos fixos = 480 (todoMes) + 80 (geral) = 560; gastos = 150 (opção) + 400 (carta) = 550;
  //   entrou = 3300 − 560 + 250 = 2990; saldo = 2990 − 550 − 1000 − 50 = 1390.
  const b = configMinimo();
  b.personas[0].todoMes = [
    { soma: { renda: 2000 }, rotulo: 'corridas' },
    { soma: { renda: -480 }, fixo: true, rotulo: 'parcela da moto' },
    { soma: { renda: -200 }, rotulo: 'gasolina' },
  ];
  b.personas[0].outraRenda = { rotulo: 'bolsa', valor: 250, fonte: 'teste' };
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 1000, fonte: 'teste' }] };
  b.rodadas[0].efeitosGerais = [{ soma: { renda: -80 }, fixo: true, rotulo: 'DAS do MEI' }];
  b.rodadas[0].opcoes.a.efeitos = [{ multiplica: { renda: 2 } }, { soma: { renda: -150 }, categoria: 'gasto', rotulo: 'curso' }];
  b.cartas[0].efeitos = [{ soma: { renda: -300 } }, { soma: { renda: -400 }, categoria: 'gasto', rotulo: 'conserto' }];

  // Act
  const r = aplicarMinimo(b, { estado: { renda: -500, energia: 8 } });

  // Assert
  assert.deepEqual(r.mes, { trabalho: 3300, custosFixos: 560, gastos: 550, protecao: 0, outraRenda: 250, entrou: 2990, basico: 1000, juros: 50, saldoMes: 1390, dividaAntes: 500 });
  assert.equal(r.delta.renda, 1390);
  assert.equal(r.depois.renda, 890);
  assert.deepEqual(r.linhas.map((l) => [l.origem, l.rotulo, l.valor]), [
    ['persona', 'corridas', 2000], ['persona', 'gasolina', -200], ['opcao', 'A', 1800], ['carta', 'Normal', -300],
    ['custoFixo', 'parcela da moto', -480], ['custoFixo', 'DAS do MEI', -80],
    ['gasto', 'curso', -150], ['gasto', 'conserto', -400],
    ['outraRenda', 'bolsa', 250], ['basico', 'casa', -1000], ['juros', 'juros da dívida', -50],
  ]);
});

test('multiplica não atinge o custo fixo nem o gasto, venham de onde vierem', () => {
  // Arrange: a carta zera a renda do trabalho. Antes do v2.1, o multiplica 0
  // zerava também a parcela da moto, e o acidentado ficava melhor (revisão de
  // 29/09, item 4). O gasto da opção vem ANTES da carta na ordem dos grupos, e
  // mesmo assim não é zerado.
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 3000 } }, { soma: { renda: -741 }, fixo: true, rotulo: 'parcela e manutenção' }];
  b.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: -100 }, categoria: 'gasto', rotulo: 'remédio' }];
  b.cartas[0].efeitos = [{ multiplica: { renda: 0 } }];

  // Act
  const r = aplicarMinimo(b);

  // Assert
  assert.equal(r.mes.trabalho, 0);
  assert.equal(r.mes.custosFixos, 741);
  assert.equal(r.mes.gastos, 100);
  assert.equal(r.mes.entrou, -741, 'o custo fixo continua a ser pago sem renda');
  assert.equal(r.delta.renda, -841);
});

test('o "entrou" não leva os gastos: a fratura não vira "entrou negativo"', () => {
  // Arrange: o caso da revisão de 29/09, item 2. 20 dias parado (renda × 1/3),
  // conserto e remédio como gastos.
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 2200 } }];
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 4166, fonte: 'teste' }] };
  b.cartas[0].diasParado = 20;
  b.cartas[0].efeitos = [
    { multiplica: { renda: 0.3333 } },
    { soma: { renda: -1500 }, categoria: 'gasto', rotulo: 'conserto da moto' },
    { soma: { renda: -150 }, categoria: 'gasto', rotulo: 'remédio' },
  ];

  // Act
  const { mes } = aplicarMinimo(b);

  // Assert
  assert.ok(mes.entrou > 0, `entrou ${mes.entrou}`);
  assert.equal(mes.gastos, 1650);
  assert.ok(Math.abs(mes.saldoMes - (mes.entrou - 1650 - 4166)) < 1e-9);
});

test('cartaCusto: dias parados, renda perdida (trabalho variável sem a carta − com a carta) e gastos da carta', () => {
  // Arrange: sem a carta, o trabalho variável seria (1000 + 200) = 1200; com a
  // carta (× 0,5 e − 100), 500. A renda perdida é 700. Os gastos da carta são
  // 300; o gasto da opção (50) é da opção, e não da carta.
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 1000 } }, { soma: { renda: -400 }, fixo: true }];
  b.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: 200 } }, { soma: { renda: -50 }, categoria: 'gasto' }];
  b.cartas[0].diasParado = 15;
  b.cartas[0].efeitos = [{ multiplica: { renda: 0.5 } }, { soma: { renda: -100 } }, { soma: { renda: -300 }, categoria: 'gasto', rotulo: 'recurso' }];
  const config = normalizar(V, b);
  const args = { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', estado: ESTADO };

  // Act
  const com = M.aplicar(config, { ...args, cartaId: 'normal' });
  const sem = M.aplicar(config, { ...args, cartaId: null });

  // Assert
  assert.deepEqual(com.cartaCusto, { diasParado: 15, rendaPerdida: 700, gastos: 300 });
  assert.equal(com.cartaCusto.rendaPerdida, sem.mes.trabalho - com.mes.trabalho, 'é o mesmo que refazer o mês sem a carta');
  assert.equal(com.cartaCusto.gastos, com.mes.gastos - sem.mes.gastos);
  assert.deepEqual(sem.cartaCusto, { diasParado: 0, rendaPerdida: 0, gastos: 0 });
});

test('cartaCusto: carta que ajuda não tem renda perdida negativa; carta sem diasParado vale 0', () => {
  // Arrange
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 1000 } }];
  b.cartas[0].efeitos = [{ multiplica: { renda: 1.5 } }];

  // Act / Assert
  assert.deepEqual(aplicarMinimo(b).cartaCusto, { diasParado: 0, rendaPerdida: 0, gastos: 0 });
});

test('resolverRodada devolve o cartaCusto do aplicar', () => {
  // Arrange
  const config = normalizar(V, lerConfigTesteV21());
  const args = { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', estado: M.estadoInicial(config, 'e1') };

  // Act: procura uma semente que tire o acidente.
  let r = null;
  for (let s = 0; s < 500 && (!r || r.carta !== 'acidente'); s++) r = M.resolverRodada(config, { ...args, semente: s });

  // Assert
  assert.equal(r.carta, 'acidente');
  assert.deepEqual(r.cartaCusto, M.aplicar(config, { ...args, cartaId: 'acidente' }).cartaCusto);
  assert.equal(r.cartaCusto.diasParado, 20);
  assert.equal(r.cartaCusto.gastos, 400);
  assert.ok(r.cartaCusto.rendaPerdida > 0);
});

test('mesComum entra com o custo fixo do todoMes, e o gasto fora do "entrou"', () => {
  // Arrange
  const b = configMinimo();
  b.personas[0].todoMes = [
    { soma: { renda: 2200 } },
    { soma: { renda: -480 }, fixo: true, rotulo: 'parcela' },
    { soma: { renda: -60 }, categoria: 'gasto', rotulo: 'celular quebrado todo mês' },
    { multiplica: { renda: 0.5 } },
  ];
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 1000, fonte: 'teste' }] };
  const config = normalizar(V, b);

  // Act
  const mes = M.mesComum(config, 'e1');

  // Assert: 2200 × 0,5 = 1100 de trabalho; 1100 − 480 = 620 entrou; 620 − 60 − 1000 = −440.
  assert.deepEqual(mes, { trabalho: 1100, custosFixos: 480, gastos: 60, protecao: 0, outraRenda: 0, entrou: 620, basico: 1000, juros: 0, saldoMes: -440, dividaAntes: 0 });
});

test('config v2 (sem fixo nem gasto): as contas continuam as mesmas, com custosFixos e gastos em 0', () => {
  // Arrange: tudo o que é v2.1 é opcional, e o v2 é o config real até a reescrita.
  const config = normalizar(V, lerConfigTesteV2());
  const args = { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'a', cartaId: 'acidente', estado: { renda: -300, energia: 8, protecao: 0 }, historico: {} };

  // Act
  const r = M.aplicar(config, args);

  // Assert: trabalho (3200 − 600 − 200 + 400) × 0,3 − 400 = 440; sem a carta seria 2800.
  assert.equal(r.mes.custosFixos, 0);
  assert.equal(r.mes.gastos, 0);
  assert.equal(r.mes.trabalho, 440);
  assert.equal(r.mes.entrou, r.mes.trabalho + r.mes.outraRenda);
  assert.equal(r.mes.saldoMes, r.mes.entrou - r.mes.basico - r.mes.juros);
  assert.deepEqual(r.cartaCusto, { diasParado: 0, rendaPerdida: 2800 - 840 + 400, gastos: 0 });
});

test('decompor v2.1 confere com 10.000 simulações (custo fixo, gasto, multiplica e histórico)', () => {
  // Arrange: Rafa (e1) tem parcela da moto fixa; "a" no mês 1 puxa o acidente
  // (× 0,3 e gastos); "b" paga o MEI, que vira custo fixo no mês 2; o acidente
  // do mês 2 traz a recaída (× 0,8 e fisioterapia) no mês 3.
  const config = normalizar(V, lerConfigTesteV21());
  const equipeId = 'e1';
  const opcoes = ['b', 'a', 'd'];
  const padroes = config.ordem.rodadas.map((r) => config.rodadas[r].padrao);
  const semear = V.sorte.gerador(2121);
  const N = 10000;
  const vistos = { gasto: 0, custoFixo: 0, recaida: 0 };

  const simular = (plano) => {
    const rendas = [];
    for (let i = 0; i < N; i++) {
      let estado = M.estadoInicial(config, equipeId);
      const historico = {};
      config.ordem.rodadas.forEach((rodadaId, k) => {
        const semente = Math.floor(semear() * 4294967296);
        const r = M.resolverRodada(config, { equipeId, rodadaId, opcaoId: plano[k], estado, semente, historico });
        if (r.mes.gastos > 0) vistos.gasto += 1;
        if (r.linhas.some((l) => l.origem === 'custoFixo' && l.rotulo === 'DAS do MEI')) vistos.custoFixo += 1;
        if (r.carta === 'recaida') vistos.recaida += 1;
        historico[rodadaId] = { decisao: plano[k], carta: r.carta };
        estado = r.depois;
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
  assert.ok(vistos.gasto > 0 && vistos.custoFixo > 0 && vistos.recaida > 0, `o caso precisa exercitar os campos novos: ${JSON.stringify(vistos)}`);
  assert.ok(Math.abs(comDecisoes.media - d.esperadoComDecisoes) < 4 * comDecisoes.erroPadrao,
    `simulado ${comDecisoes.media} × enumerado ${d.esperadoComDecisoes}`);
  assert.ok(Math.abs(piloto.media - d.esperadoPiloto) < 4 * piloto.erroPadrao,
    `simulado ${piloto.media} × enumerado ${d.esperadoPiloto}`);
  assert.ok(comDecisoes.minimo >= d.piorCaso - 1e-9, 'nenhuma simulação fica abaixo do pior caso');
  assert.ok(Math.abs(d.esperadoPiloto + d.efeitoDecisoes + d.sorte - d.realizado) < 1e-9);
});

test('o motor lê o conteúdo v2.1 que volta do RTDB (listas viram objetos, vazios somem)', () => {
  // Arrange
  const config = normalizar(V, lerConfigTesteV21());
  const doBanco = JSON.parse(JSON.stringify(config), (_k, v) => {
    if (Array.isArray(v)) return v.length === 0 ? undefined : Object.fromEntries(v.map((x, i) => [String(i), x]));
    if (v && typeof v === 'object' && Object.keys(v).length === 0) return undefined;
    return v;
  });
  const args = {
    equipeId: 'e1', rodadaId: 'r2', opcaoId: 'a', estado: { renda: -700, energia: 2, protecao: 3 }, semente: 7,
    historico: { r1: { decisao: 'b', carta: 'normal' } },
  };

  // Act
  const doConfig = M.resolverRodada(config, args);

  // Assert
  assert.deepEqual(M.resolverRodada(doBanco, args), doConfig);
  assert.equal(doConfig.mes.custosFixos, 560, 'parcela da moto (todoMes) + DAS do MEI (geral)');
});

test('piso do trabalho variável: dias parados a preço cheio não levam o trabalho abaixo de 0', () => {
  // Arrange: o caso da revisão de 29/09 (2ª rodada, achados 2 e 9). Jonas
  // exausto (× 0,9) com a fratura que continua (25 dias a preço cheio, geral) e
  // a carta de 3 dias: 2680 × 0,9 − 2233 = 179 antes da carta; − 268 daria −89,
  // e a tela mostrava "renda perdida R$ 268" de uma renda de R$ 179.
  const b = configMinimo();
  b.regras.pisoTrabalho = true;
  b.personas[0].todoMes = [
    { soma: { renda: 2680 } },
    { multiplica: { renda: 0.9 }, rotulo: 'exausto' },
    { soma: { renda: -480 }, fixo: true, rotulo: 'parcela da moto' },
  ];
  b.rodadas[0].efeitosGerais = [{ soma: { renda: -2233 }, rotulo: 'a fratura continua' }];
  b.cartas[0].diasParado = 3;
  b.cartas[0].efeitos = [{ soma: { renda: -268 } }, { soma: { renda: -522 }, categoria: 'gasto', rotulo: 'conserto' }];

  // Act
  const r = aplicarMinimo(b);

  // Assert
  assert.equal(r.mes.trabalho, 0, 'não se perde mais renda do que havia');
  assert.equal(r.cartaCusto.rendaPerdida, 179, 'a renda perdida é a que existia sem a carta');
  assert.equal(r.mes.entrou, -480, 'o custo fixo continua a ser pago');
  assert.equal(r.mes.gastos, 522);
  const piso = r.linhas.filter((l) => l.origem === 'piso');
  assert.equal(piso.length, 1);
  assert.ok(Math.abs(piso[0].valor - 89) < 1e-9);
  const somaRenda = r.linhas.filter((l) => l.indicador === 'renda').reduce((s, l) => s + l.valor, 0);
  assert.ok(Math.abs(somaRenda - r.delta.renda) < 1e-9, 'as linhas continuam somando o delta');
});

test('piso do trabalho variável: sem a carta abaixo de 0, a renda perdida é 0', () => {
  // Arrange: o trabalho já estava negativo antes da carta (a opção custou mais
  // do que havia); a carta não pode "perder" renda nenhuma.
  const b = configMinimo();
  b.regras.pisoTrabalho = true;
  b.personas[0].todoMes = [{ soma: { renda: 100 } }];
  b.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: -150 } }];
  b.cartas[0].efeitos = [{ soma: { renda: -50 } }];

  // Act
  const r = aplicarMinimo(b);

  // Assert
  assert.equal(r.mes.trabalho, 0);
  assert.equal(r.cartaCusto.rendaPerdida, 0);
});

test('deAntes: os efeitos gerais que vêm de um mês anterior saem nomeados, fora os custos fixos', () => {
  // Arrange: no mês 2, a fratura do mês 1 continua (sorteou), o INSS entra
  // (decidiu), a multa do aluguel vem do saldo negativo (indicador) e o DAS é
  // custo fixo (fica de fora: já está em "custos fixos"). O corte que vale para
  // todos (sem condição de antes) e o efeito da opção também ficam de fora.
  const b = lerConfigTesteV21();
  const r2 = b.rodadas.find((r) => r.id === 'r2');
  r2.efeitosGerais = [
    ...(r2.efeitosGerais || []),
    { soma: { renda: -100 }, rotulo: 'corte para todos' },
    { se: { sorteou: { r1: 'acidente' } }, soma: { renda: -900 }, rotulo: 'fratura: mais 25 dias parado' },
    { se: { decidiu: { r1: 'b' } }, soma: { renda: 700 }, rotulo: 'auxílio do INSS' },
    { se: { indicador: { renda: { abaixoDe: 0 } } }, soma: { renda: -130 }, categoria: 'gasto', rotulo: 'multa do aluguel' },
    { se: { decidiu: { r1: 'b' } }, soma: { renda: -50 }, fixo: true, rotulo: 'DAS de teste' },
  ];
  const config = normalizar(V, b);
  const args = { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'a', cartaId: 'normal', estado: { renda: -300, energia: 8, protecao: 3 }, historico: { r1: { decisao: 'b', carta: 'acidente' } } };

  // Act
  const r = M.aplicar(config, args);
  const semHistorico = M.aplicar(config, { ...args, estado: { renda: 100, energia: 8, protecao: 3 }, historico: {} });

  // Assert
  const nossos = r.deAntes.filter((x) => ['fratura: mais 25 dias parado', 'auxílio do INSS', 'multa do aluguel', 'DAS de teste', 'corte para todos'].includes(x.rotulo));
  assert.deepEqual(nossos, [
    { rotulo: 'fratura: mais 25 dias parado', valor: -900 },
    { rotulo: 'auxílio do INSS', valor: 700 },
    { rotulo: 'multa do aluguel', valor: -130, gasto: true },
  ]);
  assert.deepEqual(semHistorico.deAntes.filter((x) => nossos.some((n) => n.rotulo === x.rotulo)), []);
});

test('deAntes: o multiplica de um efeito geral de antes sai com o que tirou, e o resolverRodada o devolve', () => {
  // Arrange: a conta bloqueada no mês 1 toma o mês 2 inteiro (× 0).
  const b = configMinimo();
  b.rodadas.push({ id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'b', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } },
    efeitosGerais: [{ se: { sorteou: { r1: 'normal' } }, multiplica: { renda: 0 }, rotulo: 'conta bloqueada o mês inteiro' }] });
  b.roteiros['60min'] = [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'rodada', rodada: 'r2' }, { tipo: 'fim' }];
  b.regras.pisoTrabalho = true;
  b.personas[0].todoMes = [{ soma: { renda: 1000 } }];
  const config = normalizar(V, b);
  const args = { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'a', estado: ESTADO, historico: { r1: { decisao: 'a', carta: 'normal' } } };

  // Act
  const r = M.resolverRodada(config, { ...args, semente: 1 });

  // Assert
  assert.deepEqual(r.deAntes, [{ rotulo: 'conta bloqueada o mês inteiro', valor: -1000 }]);
  assert.equal(r.mes.trabalho, 0);
  assert.deepEqual(M.aplicar(config, { ...args, historico: {} }).deAntes, []);
});

test('sem regras.pisoTrabalho (config v2), o trabalho pode ficar negativo, como antes', () => {
  // Arrange: a mesma perda do caso do piso, sem a regra.
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 100 } }];
  b.cartas[0].efeitos = [{ soma: { renda: -250 } }];

  // Act
  const r = aplicarMinimo(b);

  // Assert
  assert.equal(r.mes.trabalho, -150);
  assert.equal(r.cartaCusto.rendaPerdida, 250);
  assert.ok(!r.linhas.some((l) => l.origem === 'piso'));
});
