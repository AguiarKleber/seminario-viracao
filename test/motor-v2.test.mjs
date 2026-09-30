// O motor no esquema v2 (D-043, D-044, D-046): o básico da casa cobrado no fim
// do mês, a outra renda da casa, os juros sobre a dívida que vinha de antes e as
// consequências que atravessam os meses (decidiu/sorteou, lidas do histórico da
// equipe). Contratos seção 3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { configMinimo, lerConfigTesteV2, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;

// configMinimo com uma segunda rodada no roteiro, para as consequências entre meses.
function minimoComDuasRodadas() {
  const b = configMinimo();
  b.rodadas.push({ id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'b', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  b.roteiros['60min'].splice(2, 0, { tipo: 'rodada', rodada: 'r2' });
  return b;
}

test('ordem do mês: trabalho → outra renda → básico → juros, e o limite só no fim', () => {
  // Arrange: dívida de 500 antes do mês e juros de 10% ao mês.
  //   trabalho = (1000 × 2) + 100 = 2100; entrou = 2100 + 300 = 2400;
  //   saldo do mês = 2400 − 900 − 50 = 1450.
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 1000 }, rotulo: 'corridas' }];
  b.personas[0].outraRenda = { rotulo: 'pensão', valor: 300, fonte: 'teste' };
  b.personas[0].basico = { itens: [{ rotulo: 'aluguel', valor: 700, fonte: 'teste' }, { rotulo: 'comida', valor: 200, fonte: 'teste' }] };
  b.rodadas[0].opcoes.a.efeitos = [{ multiplica: { renda: 2 } }];
  b.cartas[0].efeitos = [{ soma: { renda: 100 } }];
  const config = normalizar(V, b);

  // Act
  const r = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: { renda: -500, energia: 8 } });

  // Assert
  assert.deepEqual(r.mes, { trabalho: 2100, custosFixos: 0, gastos: 0, protecao: 0, outraRenda: 300, entrou: 2400, basico: 900, juros: 50, saldoMes: 1450, dividaAntes: 500, emprestimo: 0, parcela: 0, jurosEmprestimo: 0, amortizacao: 0, saldoDevedor: 0, parcelasRestantes: 0, proximaParcela: 0, aPagar: 0 });
  assert.equal(r.delta.renda, 1450);
  assert.equal(r.depois.renda, 950);
  assert.deepEqual(r.linhas.map((l) => [l.origem, l.rotulo, l.valor]), [
    ['persona', 'corridas', 1000], ['opcao', 'A', 1000], ['carta', 'Normal', 100],
    ['outraRenda', 'pensão', 300], ['basico', 'aluguel', -700], ['basico', 'comida', -200], ['juros', 'juros da dívida', -50],
  ]);
});

test('multiplica corta o que se ganha, e não o básico nem a outra renda', () => {
  // Arrange: a carta zera a renda do trabalho (acidente). A conta da casa chega igual.
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 1000 } }];
  b.personas[0].outraRenda = { rotulo: 'benefício', valor: 300, fonte: 'teste' };
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 900, fonte: 'teste' }] };
  b.cartas[0].efeitos = [{ multiplica: { renda: 0 } }];
  const config = normalizar(V, b);

  // Act
  const r = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: { renda: 0, energia: 8 } });

  // Assert
  assert.equal(r.mes.trabalho, 0);
  assert.equal(r.mes.entrou, 300);
  assert.equal(r.mes.saldoMes, -600);
  assert.equal(r.depois.renda, -600);
});

test('juros só sobre a dívida que vinha de antes do mês, arredondados', () => {
  // Arrange
  const b = configMinimo();
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 900, fonte: 'teste' }] };
  const config = normalizar(V, b);
  const mes = (renda) => M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: { renda, energia: 8 } }).mes;

  // Act / Assert: saldo positivo antes não paga juros, mesmo terminando o mês no vermelho.
  assert.deepEqual([mes(200).juros, mes(200).dividaAntes], [0, 0]);
  assert.deepEqual([mes(0).juros, mes(0).dividaAntes], [0, 0]);
  assert.equal(mes(-1000).juros, 100);
  assert.equal(mes(-1234).juros, 123, '123,4 arredonda para 123');
  assert.equal(mes(-1235).juros, 124, '123,5 arredonda para 124');
  assert.equal(mes(-1235).dividaAntes, 1235);
  assert.equal(mes(-1000).saldoMes, -1000);
});

test('o limite mínimo vale depois do básico e dos juros; o delta é o de antes do limite', () => {
  // Arrange
  const b = configMinimo();
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 900, fonte: 'teste' }] };
  const config = normalizar(V, b);

  // Act
  const r = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: { renda: -9900, energia: 8 } });

  // Assert: juros de 990 sobre a dívida de 9.900.
  assert.equal(r.delta.renda, -1890);
  assert.equal(r.depois.renda, -10000);
});

test('decidiu e sorteou leem o histórico da equipe; rodada não jogada é falso', () => {
  // Arrange
  const config = normalizar(V, lerConfigTesteV2());
  const ctx = (historico) => ({ equipeId: 'e5', rodadaId: 'r3', opcaoId: 'a', estado: { renda: 0, energia: 8, protecao: 0 }, historico });
  const jogou = { r1: { decisao: 'd', carta: 'normal' }, r2: { decisao: 'a', carta: 'acidente' } };

  // Act / Assert
  assert.equal(M.condicaoVale(config, { decidiu: { r1: 'd' } }, ctx(jogou)), true);
  assert.equal(M.condicaoVale(config, { decidiu: { r1: ['b', 'd'] } }, ctx(jogou)), true, 'lista de opções');
  assert.equal(M.condicaoVale(config, { decidiu: { r1: 'c' } }, ctx(jogou)), false);
  assert.equal(M.condicaoVale(config, { sorteou: { r2: 'acidente' } }, ctx(jogou)), true);
  assert.equal(M.condicaoVale(config, { sorteou: { r2: ['chuva', 'bonus'] } }, ctx(jogou)), false);
  assert.equal(M.condicaoVale(config, { decidiu: { r1: 'd' }, sorteou: { r2: 'acidente' } }, ctx(jogou)), true, 'as duas juntas');
  assert.equal(M.condicaoVale(config, { decidiu: { r1: 'd', r2: 'b' } }, ctx(jogou)), false, 'todas as rodadas precisam valer');
  assert.equal(M.condicaoVale(config, { decidiu: { r1: 'd' } }, ctx({ r2: jogou.r2 })), false, 'r1 pulada no dia');
  assert.equal(M.condicaoVale(config, { sorteou: { r2: 'acidente' } }, ctx(undefined)), false, 'sem histórico');
});

test('a consequência atravessa o mês: a parcela do empréstimo do mês 1 chega no mês 2 e no mês 3', () => {
  // Arrange
  const config = normalizar(V, lerConfigTesteV2());
  const estado = { renda: 1000, energia: 8, protecao: 0 };
  const noMes = (rodadaId, historico) => M.aplicar(config, { equipeId: 'e1', rodadaId, opcaoId: 'c', cartaId: 'normal', estado, historico });

  // Act
  const comEmprestimo = noMes('r2', { r1: { decisao: 'd', carta: 'normal' } });
  const semEmprestimo = noMes('r2', { r1: { decisao: 'c', carta: 'normal' } });
  const mes3 = noMes('r3', { r1: { decisao: 'd', carta: 'normal' }, r2: { decisao: 'c', carta: 'normal' } });

  // Assert
  assert.equal(comEmprestimo.mes.trabalho - semEmprestimo.mes.trabalho, -600);
  assert.ok(comEmprestimo.linhas.some((l) => l.origem === 'geral' && l.rotulo === 'parcela do empréstimo' && l.valor === -600));
  assert.ok(mes3.linhas.some((l) => l.rotulo === 'parcela do empréstimo'));
});

test('chances e resolverRodada usam o histórico: a recaída só existe depois do acidente', () => {
  // Arrange
  const config = normalizar(V, lerConfigTesteV2());
  const base = { equipeId: 'e1', rodadaId: 'r3', opcaoId: 'a', estado: { renda: 0, energia: 8, protecao: 0 } };
  const acidentado = { r1: { decisao: 'c', carta: 'normal' }, r2: { decisao: 'c', carta: 'acidente' } };

  // Act
  const sem = M.chances(config, base).map((c) => c.carta);
  const com = M.chances(config, { ...base, historico: acidentado }).map((c) => c.carta);
  const saidas = new Set();
  for (let s = 0; s < 300; s++) saidas.add(M.resolverRodada(config, { ...base, historico: acidentado, semente: s }).carta);

  // Assert
  assert.ok(!sem.includes('recaida'));
  assert.ok(com.includes('recaida'));
  assert.ok(saidas.has('recaida'), 'o sorteio com histórico tira a recaída');
});

test('decompor carrega o histórico no caminho: caso feito à mão', () => {
  // Arrange: no mês 1, acidente ou normal (½ cada). No mês 2, a recaída (−1000)
  // só existe se o mês 1 tirou o acidente, e aí sai com ½. A opção "a" do mês 1
  // custa 100 no mês 2 (decidiu).
  //   esperado piloto (b): ½ × ½ × −1000 = −250
  //   esperado com a decisão (a): −250 − 100 = −350
  const b = minimoComDuasRodadas();
  b.rodadas[1].efeitosGerais = [{ se: { decidiu: { r1: 'a' } }, soma: { renda: -100 }, rotulo: 'parcela' }];
  b.cartas = [
    { id: 'normal', titulo: 'Normal', peso: 1, efeitos: [] },
    { id: 'acidente', titulo: 'Acidente', peso: 1, rodadas: ['r1'], efeitos: [] },
    { id: 'recaida', titulo: 'Recaída', peso: 0, rodadas: ['r2'], ajustesDePeso: [{ se: { sorteou: { r1: 'acidente' } }, soma: 1 }], efeitos: [{ soma: { renda: -1000 } }] },
  ];
  const config = normalizar(V, b);

  // Act
  const d = M.decompor(config, {
    equipeId: 'e1',
    rodadas: [{ rodadaId: 'r1', opcaoId: 'a', cartaId: 'acidente' }, { rodadaId: 'r2', opcaoId: 'a', cartaId: 'recaida' }],
  });

  // Assert
  assert.deepEqual(d, { realizado: -1100, esperadoComDecisoes: -350, esperadoPiloto: -250, efeitoDecisoes: -100, sorte: -750, piorCaso: -1100, piorCasoSemProtecao: -1100 });
});

test('decompor confere com 10.000 simulações, com histórico, básico e juros', () => {
  // Arrange: Lia (e5) fecha o mês no vermelho e paga juros; "d" no mês 1 é o
  // empréstimo com parcela nos meses 2 e 3; "a" no mês 2 puxa o acidente, que
  // traz a recaída no mês 3.
  const config = normalizar(V, lerConfigTesteV2());
  const equipeId = 'e5';
  const opcoes = ['d', 'a', 'c'];
  const padroes = config.ordem.rodadas.map((r) => config.rodadas[r].padrao);
  const semear = V.sorte.gerador(4242);
  const N = 10000;
  let pagouJuros = 0;

  const simular = (plano) => {
    const rendas = [];
    for (let i = 0; i < N; i++) {
      let estado = M.estadoInicial(config, equipeId);
      const historico = {};
      config.ordem.rodadas.forEach((rodadaId, k) => {
        const semente = Math.floor(semear() * 4294967296);
        const r = M.resolverRodada(config, { equipeId, rodadaId, opcaoId: plano[k], estado, semente, historico });
        if (r.mes.juros > 0) pagouJuros += 1;
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
  assert.ok(pagouJuros > 0, 'o caso precisa exercitar os juros');
  assert.ok(Math.abs(comDecisoes.media - d.esperadoComDecisoes) < 4 * comDecisoes.erroPadrao,
    `simulado ${comDecisoes.media} × enumerado ${d.esperadoComDecisoes}`);
  assert.ok(Math.abs(piloto.media - d.esperadoPiloto) < 4 * piloto.erroPadrao,
    `simulado ${piloto.media} × enumerado ${d.esperadoPiloto}`);
  assert.ok(comDecisoes.minimo >= d.piorCaso - 1e-9, 'nenhuma simulação fica abaixo do pior caso');
  assert.ok(Math.abs(d.esperadoPiloto + d.efeitoDecisoes + d.sorte - d.realizado) < 1e-9);
});

test('historicoDe monta o histórico a partir dos resultados, só das rodadas pedidas', () => {
  // Arrange
  const resultados = {
    r1: { e1: { decisao: 'd', carta: 'normal', depois: {} }, e2: { decisao: 'a', carta: 'chuva' } },
    r3: { e1: { decisao: 'b', carta: 'chuva' } },
  };

  // Act / Assert
  assert.deepEqual(M.historicoDe(resultados, 'e1', ['r1', 'r2']), { r1: { decisao: 'd', carta: 'normal' } });
  assert.deepEqual(M.historicoDe(resultados, 'e1', ['r1', 'r2', 'r3']), { r1: { decisao: 'd', carta: 'normal' }, r3: { decisao: 'b', carta: 'chuva' } });
  assert.deepEqual(M.historicoDe(null, 'e1', ['r1']), {});
});

test('o motor lê o conteúdo v2 que volta do RTDB (listas viram objetos, vazios somem)', () => {
  // Arrange: imita o RTDB, que apaga [] e {} e pode devolver lista como objeto.
  const config = normalizar(V, lerConfigTesteV2());
  const doBanco = JSON.parse(JSON.stringify(config), (_k, v) => {
    if (Array.isArray(v)) return v.length === 0 ? undefined : Object.fromEntries(v.map((x, i) => [String(i), x]));
    if (v && typeof v === 'object' && Object.keys(v).length === 0) return undefined;
    return v;
  });
  const args = {
    equipeId: 'e5', rodadaId: 'r3', opcaoId: 'a', estado: { renda: -700, energia: 2, protecao: 3 }, semente: 99,
    historico: { r1: { decisao: 'd', carta: 'normal' }, r2: { decisao: 'a', carta: 'acidente' } },
  };

  // Act
  const doConfig = M.resolverRodada(config, args);

  // Assert
  assert.deepEqual(M.resolverRodada(doBanco, args), doConfig);
  assert.equal(doConfig.mes.basico, 1800);
  assert.equal(doConfig.mes.juros, 56);
});

// Revisão de 29/09: a tela de personas do telão mostra o furo de um mês comum
// (o todoMes, a outra renda e o básico, sem rodada nem carta), a mesma conta da
// coluna "Falta num mês comum" do rascunho do conteúdo.
test('mesComum: só o todoMes da persona, mais a outra renda, menos o básico, sem dívida', () => {
  // Arrange
  const b = configMinimo();
  b.personas[0].todoMes = [
    { soma: { renda: 2200 }, rotulo: 'entregas' },
    { soma: { renda: -480 }, rotulo: 'parcela' },
    { soma: { energia: -1 }, rotulo: 'cansaço' },
    // Efeito preso a uma rodada não é "mês comum".
    { soma: { renda: -999 }, rotulo: 'só no mês 1', se: { rodada: 'r1' } },
  ];
  b.personas[0].outraRenda = { rotulo: 'salário da companheira', valor: 1499, fonte: 'teste' };
  b.personas[0].basico = { itens: [{ rotulo: 'aluguel', valor: 1300, fonte: 'teste' }, { rotulo: 'comida', valor: 2866, fonte: 'teste' }] };
  const config = normalizar(V, b);

  // Act
  const mes = M.mesComum(config, 'e1');

  // Assert: 2200 − 480 + 1499 − 4166 = −947.
  assert.deepEqual(mes, { trabalho: 1720, custosFixos: 0, gastos: 0, protecao: 0, outraRenda: 1499, entrou: 3219, basico: 4166, juros: 0, saldoMes: -947, dividaAntes: 0, emprestimo: 0, parcela: 0, jurosEmprestimo: 0, amortizacao: 0, saldoDevedor: 0, parcelasRestantes: 0, proximaParcela: 0, aPagar: 0 });
});

test('mesComum: no config.json real, a conta à mão do rascunho (todoMes + outra renda − básico)', () => {
  // Arrange: a conta refeita aqui a partir do JSON cru, sem o motor. O config
  // muda até o congelamento; os números do rascunho de 29/09 (Jonas −1.208,
  // Rose −2.412…) saem desta mesma conta.
  const texto = readFileSync(join(RAIZ, 'config.json'), 'utf8');
  const r = V.validarConfig.validarTexto(texto);
  assert.ok(r.ok);
  const cru = JSON.parse(texto);

  for (const p of cru.personas) {
    const trabalho = p.todoMes.filter((e) => !e.se).reduce((t, e) => t + (e.soma?.renda ?? 0), 0);
    const basico = p.basico.itens.reduce((t, i) => t + i.valor, 0);
    const equipeId = cru.equipes.find((e) => e.persona === p.id).id;

    // Act / Assert
    assert.equal(M.mesComum(r.config, equipeId).saldoMes, trabalho + (p.outraRenda?.valor ?? 0) - basico, p.id);
  }
});
