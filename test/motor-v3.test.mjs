// O motor no esquema v3 (D-060: 12 meses em 6 rodadas bimestrais):
// regras.mesesPorRodada multiplica o que é por mês (o todoMes, o básico, a
// outra renda, as parcelas do empréstimo) e compõe os juros do cheque especial;
// o que é por evento (efeitos gerais, da opção e da carta) conta uma vez. E o
// decompor, que enumera abaixo de 200 mil caminhos de cartas e simula acima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { configMinimo, lerConfigTesteV3, normalizar, textoConfigRealV22 } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;

// O mínimo com as rodadas pedidas (cada uma com as opções a e b, padrão b).
function minimoComRodadas(n, meses) {
  const b = configMinimo();
  if (meses !== undefined) b.regras.mesesPorRodada = meses;
  b.rodadas = [];
  for (let k = 1; k <= n; k += 1) {
    b.rodadas.push({ id: `r${k}`, titulo: `Rodada ${k}`, texto: 'Texto', padrao: 'b', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  }
  b.roteiros['60min'] = [{ tipo: 'lobby' }, ...b.rodadas.map((r) => ({ tipo: 'rodada', rodada: r.id })), { tipo: 'fim' }];
  return b;
}

test('juros compostos no bimestre: (1 + j)^m − 1 sobre a dívida de antes da rodada', () => {
  // Arrange: R$ 1.000 de dívida a 10% ao mês.
  //   1 mês: 1000 × 0,1 = 100; bimestre: 1000 × (1,1² − 1) = 210; trimestre: 1000 × 0,331 = 331.
  const conta = (meses, taxa = 0.1) => {
    const b = minimoComRodadas(1, meses);
    b.regras.jurosDividaMes = taxa;
    return M.aplicar(normalizar(V, b), { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: { renda: -1000, energia: 8 } });
  };

  // Act
  const mes = conta(undefined);
  const bimestre = conta(2);
  const trimestre = conta(3);
  const real = conta(2, 0.0743);

  // Assert
  assert.equal(mes.mes.juros, 100);
  assert.equal(bimestre.mes.juros, 210, 'o bimestre compõe, e não é 2 × 100');
  assert.equal(trimestre.mes.juros, 331);
  assert.equal(real.mes.juros, 154, 'R$ 1.000 a 7,43% ao mês num bimestre: 1000 × (1,0743² − 1) = 154,12');
  assert.equal(bimestre.mes.dividaAntes, 1000);
  assert.equal(bimestre.mes.saldoMes, -210);
  assert.deepEqual(bimestre.linhas.filter((l) => l.origem === 'juros'), [{ origem: 'juros', rotulo: 'juros da dívida', indicador: 'renda', valor: -210 }]);
  assert.equal(bimestre.depois.renda, -1210);
});

test('bimestre: todoMes, básico e outra renda × 2; efeitos gerais, da opção e da carta uma vez; o multiplica não se repete', () => {
  // Arrange (valores por mês no config):
  //   todoMes: +1000 de trabalho, × 0,9 (o exausto), −200 de custo fixo, −1 de energia;
  //   geral −30; opção +150; carta +50 e um gasto de 80; básico 700 + 300; outra renda 400.
  //   Bimestre: trabalho = 2000 × 0,9 − 30 + 150 + 50 = 1970; custos fixos 400; outra renda 800;
  //     entrou = 1970 − 400 + 800 = 2370; básico 2000; saldo = 2370 − 80 − 2000 = 290.
  //   Mês: trabalho = 900 − 30 + 150 + 50 = 1070; entrou = 1070 − 200 + 400 = 1270; saldo = 1270 − 80 − 1000 = 190.
  const montar = (meses) => {
    const b = minimoComRodadas(1, meses);
    Object.assign(b.personas[0], {
      todoMes: [
        { soma: { renda: 1000 }, rotulo: 'trabalho' },
        { multiplica: { renda: 0.9 }, rotulo: 'exausto' },
        { soma: { renda: -200 }, fixo: true, rotulo: 'parcela da moto' },
        { soma: { energia: -1 } },
      ],
      basico: { itens: [{ rotulo: 'aluguel', valor: 700, fonte: 't' }, { rotulo: 'comida', valor: 300, fonte: 't' }] },
      outraRenda: { rotulo: 'pensão', valor: 400, fonte: 't' },
    });
    b.rodadas[0].efeitosGerais = [{ soma: { renda: -30 }, rotulo: 'taxa' }];
    b.rodadas[0].opcoes.a.efeitos = [{ soma: { renda: 150 } }];
    b.cartas[0].efeitos = [{ soma: { renda: 50 } }, { soma: { renda: -80 }, categoria: 'gasto', rotulo: 'conserto' }];
    return normalizar(V, b);
  };
  const aplicar = (config) => M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: { renda: 0, energia: 8 } });

  // Act
  const bi = aplicar(montar(2));
  const um = aplicar(montar(undefined));

  // Assert
  assert.equal(bi.mes.trabalho, 1970);
  assert.equal(bi.mes.custosFixos, 400, 'o custo fixo do todoMes também conta duas vezes');
  assert.equal(bi.mes.outraRenda, 800);
  assert.equal(bi.mes.entrou, 2370);
  assert.equal(bi.mes.basico, 2000);
  assert.equal(bi.mes.gastos, 80, 'o gasto da carta é por evento');
  assert.equal(bi.mes.saldoMes, 290);
  assert.equal(bi.delta.energia, -2);
  assert.deepEqual(bi.linhas.filter((l) => l.origem === 'basico').map((l) => l.valor), [-1400, -600]);
  assert.equal(bi.linhas.find((l) => l.origem === 'outraRenda').valor, 800);
  assert.equal(bi.linhas.reduce((s, l) => s + (l.indicador === 'renda' ? l.valor : 0), 0), bi.delta.renda, 'as linhas somam o delta');
  assert.deepEqual([um.mes.trabalho, um.mes.entrou, um.mes.basico, um.mes.saldoMes], [1070, 1270, 1000, 190]);
  // O furo de um mês comum (tela de personas) continua sendo de UM mês.
  assert.equal(M.mesComum(montar(2), 'e1').basico, 1000);
});

// O mínimo com o empréstimo de R$ 1.200 em 6 parcelas a 5% na opção "a" do mês 1.
function comEmprestimo(meses, rodadas = 4) {
  const b = minimoComRodadas(rodadas, meses);
  b.indicadores.push({ id: 'emprestimo', nome: 'Empréstimo a pagar', formato: 'moeda', inicial: 0, min: 0, max: 10000 });
  b.rodadas[0].opcoes.a.efeitos = [{ emprestimo: { valor: 1200, parcelas: 6, taxaMes: 0.05, fonte: 't' }, rotulo: 'empréstimo' }];
  return normalizar(V, b);
}

test('parcelas duplas: no bimestre, cada rodada depois do empréstimo paga 2 parcelas da tabela, mês a mês', () => {
  // Arrange
  const config = comEmprestimo(2);
  const t = M.cronograma(1200, 6, 0.05);
  const soma = (itens, campo) => itens.reduce((s, p) => s + p[campo], 0);
  let estado = M.estadoInicial(config, 'e1');
  const historico = {};
  const meses = {};

  // Act: pega no r1 e joga até o r4.
  for (const [k, r] of ['r1', 'r2', 'r3', 'r4'].entries()) {
    const op = k === 0 ? 'a' : 'b';
    const a = M.aplicar(config, { equipeId: 'e1', rodadaId: r, opcaoId: op, cartaId: 'normal', estado, historico });
    meses[r] = a;
    historico[r] = { decisao: op, carta: 'normal' };
    estado = a.depois;
  }

  // Assert
  assert.equal(meses.r1.mes.emprestimo, 1200);
  assert.equal(meses.r1.mes.parcela, 0, 'a 1ª parcela vence na rodada seguinte');
  const [p1, p2, p3, p4, p5, p6] = t;
  assert.equal(meses.r2.mes.parcela, p1.parcela + p2.parcela);
  assert.equal(meses.r2.mes.jurosEmprestimo, p1.juros + p2.juros);
  assert.equal(meses.r2.mes.amortizacao, p1.amortizacao + p2.amortizacao);
  assert.equal(meses.r2.mes.saldoDevedor, 1200 - p1.amortizacao - p2.amortizacao);
  assert.equal(meses.r2.mes.parcelasRestantes, 4);
  assert.equal(meses.r2.mes.proximaParcela, p3.parcela, 'a próxima parcela (mensal)');
  assert.equal(meses.r2.mes.aPagar, soma([p3, p4, p5, p6], 'parcela'));
  assert.deepEqual(meses.r2.linhas.filter((l) => l.origem === 'juros').map((l) => l.rotulo),
    ['juros da parcela 1 de 6 do empréstimo', 'juros da parcela 2 de 6 do empréstimo']);
  assert.equal(meses.r3.mes.parcela, p3.parcela + p4.parcela);
  assert.equal(meses.r3.mes.parcelasRestantes, 2);
  assert.equal(meses.r4.mes.parcela, p5.parcela + p6.parcela);
  assert.equal(meses.r4.mes.parcelasRestantes, 0);
  assert.equal(meses.r4.mes.saldoDevedor, 0);
  assert.equal(meses.r4.depois.emprestimo, 0, 'o saldo devedor zera junto com a tabela');
  assert.equal(meses.r4.mes.taxaEmprestimo, 0.05);
  // Com rodadas mensais, a mesma rodada paga uma parcela só (a conta de antes).
  const mensal = comEmprestimo(undefined);
  const r1 = M.aplicar(mensal, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: M.estadoInicial(mensal, 'e1') });
  const r2 = M.aplicar(mensal, { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'b', cartaId: 'normal', estado: r1.depois, historico: { r1: { decisao: 'a', carta: 'normal' } } });
  assert.equal(r2.mes.parcela, p1.parcela);
  assert.equal(r2.mes.parcelasRestantes, 5);
});

test('parcelas duplas: rodada pulada no dia não cobra, e a seguinte paga as duas primeiras', () => {
  // Arrange: pega no r1; o r2 foi pulado.
  const config = comEmprestimo(2);
  const t = M.cronograma(1200, 6, 0.05);
  const r1 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: M.estadoInicial(config, 'e1') });

  // Act
  const r3 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r3', opcaoId: 'b', cartaId: 'normal', estado: r1.depois, historico: { r1: { decisao: 'a', carta: 'normal' } } });

  // Assert
  assert.equal(r3.mes.parcela, t[0].parcela + t[1].parcela);
  assert.equal(r3.mes.parcelasRestantes, 4);
});

test('decompor: abaixo de 200 mil caminhos é exato; acima, estimado (a 5ª rodada da fixture v3)', () => {
  // Arrange
  const config = normalizar(V, lerConfigTesteV3());
  const ids = config.ordem.rodadas;
  const caminhos = [1, 2, 3, 4, 5, 6].map((k) => M.caminhosDeCartas(config, 'e1', ids.slice(0, k)));
  const jogadas = ids.map((rodadaId) => ({ rodadaId, opcaoId: config.rodadas[rodadaId].padrao, cartaId: 'normal' }));

  // Act
  const quatro = M.decompor(config, { equipeId: 'e1', rodadas: jogadas.slice(0, 4) });
  const cinco = M.decompor(config, { equipeId: 'e1', rodadas: jogadas.slice(0, 5) });

  // Assert
  assert.equal(M.LIMITE_CAMINHOS, 200000);
  assert.equal(M.AMOSTRAS, 20000);
  assert.ok(caminhos[3] <= M.LIMITE_CAMINHOS && caminhos[4] > M.LIMITE_CAMINHOS, `caminhos por rodada: ${caminhos.join(', ')}`);
  assert.equal(quatro.estimado, false);
  assert.equal(cinco.estimado, true);
  // O config do teste de 30/09 (3 rodadas mensais) fica muito abaixo do limite:
  // exato. O config.json de 12 meses é exato até a 4ª rodada e estimado na 6ª,
  // em todas as equipes (de 1,45 a 4,04 milhões de caminhos).
  const v22 = V.validarConfig.validarTexto(textoConfigRealV22()).config;
  for (const eq of v22.ordem.equipes) assert.ok(M.caminhosDeCartas(v22, eq, v22.ordem.rodadas) < M.LIMITE_CAMINHOS / 10, `${eq}: o config de 30/09 continua exato`);
  const real = V.validarConfig.validarTexto(readFileSync(join(RAIZ, 'config.json'), 'utf8')).config;
  for (const eq of real.ordem.equipes) {
    assert.ok(M.caminhosDeCartas(real, eq, real.ordem.rodadas.slice(0, 4)) <= M.LIMITE_CAMINHOS, `${eq}: config.json exato até a 4ª rodada`);
    assert.ok(M.caminhosDeCartas(real, eq, real.ordem.rodadas) > M.LIMITE_CAMINHOS, `${eq}: config.json estimado na 6ª rodada`);
  }
});

test('decompor: a simulação dá o mesmo que a enumeração num config pequeno (dentro da tolerância)', () => {
  // Arrange: a fixture v3 com 3 rodadas (2.744 caminhos): as duas contas cabem.
  // Tolerância: o erro padrão da média de 20 mil caminhos, com o desvio da renda
  // final da e1 perto de R$ 2.000, é ~R$ 14; 5 erros padrão = R$ 70.
  const config = normalizar(V, lerConfigTesteV3());
  const jogadas = [
    { rodadaId: 'r1', opcaoId: 'b', cartaId: 'acidente' },
    { rodadaId: 'r2', opcaoId: 'd', cartaId: 'normal' },
    { rodadaId: 'r3', opcaoId: 'c', cartaId: 'chuva' },
  ];

  for (const equipeId of ['e1', 'e3']) {
    // Act
    const exato = M.decompor(config, { equipeId, rodadas: jogadas, modo: 'exato' });
    const estimado = M.decompor(config, { equipeId, rodadas: jogadas, modo: 'estimado' });

    // Assert
    assert.equal(exato.estimado, false);
    assert.equal(estimado.estimado, true);
    assert.equal(estimado.realizado, exato.realizado, 'o realizado é sempre exato');
    for (const campo of ['esperadoComDecisoes', 'esperadoPiloto', 'efeitoDecisoes', 'sorte']) {
      assert.ok(Math.abs(estimado[campo] - exato[campo]) <= 70, `${equipeId}.${campo}: simulado ${estimado[campo]} × exato ${exato[campo]}`);
    }
    // O pior estimado é um caminho de verdade: nunca abaixo do pior exato; e a
    // busca dirigida o deixa perto dele.
    for (const campo of ['piorCaso', 'piorCasoSemProtecao']) {
      assert.ok(estimado[campo] >= exato[campo] - 1e-9, `${equipeId}.${campo}: estimado ${estimado[campo]} abaixo do exato ${exato[campo]}`);
      assert.ok(estimado[campo] - exato[campo] <= 0.25 * Math.abs(exato[campo]), `${equipeId}.${campo}: estimado ${estimado[campo]} longe do exato ${exato[campo]}`);
    }
  }
});

test('decompor estimado é determinístico: mesma semente (hash do config, equipe, rodadas) = mesmo número', () => {
  // Arrange: 6 rodadas (estimado).
  const bruto = lerConfigTesteV3();
  const config = normalizar(V, bruto);
  const jogadas = config.ordem.rodadas.map((rodadaId, k) => ({ rodadaId, opcaoId: config.rodadas[rodadaId].ordemOpcoes[k % 3], cartaId: 'normal' }));

  // Act
  const a = M.decompor(config, { equipeId: 'e1', rodadas: jogadas });
  const b = M.decompor(config, { equipeId: 'e1', rodadas: jogadas });
  // O conteúdo lido da sala é outro objeto, com o mesmo hash: dá o mesmo número.
  const c = M.decompor(structuredClone(config), { equipeId: 'e1', rodadas: jogadas });
  const outraEquipe = M.decompor(config, { equipeId: 'e6', rodadas: jogadas });

  // Assert
  assert.equal(a.estimado, true);
  assert.deepEqual(b, a);
  assert.deepEqual(c, a);
  // A e6 tem a mesma persona e as mesmas decisões da e1 (D-004), mas outra
  // semente: a simulação não é a mesma, e os números diferem um pouco.
  assert.notEqual(outraEquipe.esperadoComDecisoes, a.esperadoComDecisoes);
  assert.ok(Math.abs(outraEquipe.esperadoComDecisoes - a.esperadoComDecisoes) < 150, 'mas ficam perto');
});

test('decompor estimado: o piloto e as decisões usam os mesmos sorteios (a diferença sai sem ruído de sementes)', () => {
  // Arrange: com as decisões iguais ao padrão, o efeito das decisões é exatamente 0.
  const config = normalizar(V, lerConfigTesteV3());
  const jogadas = config.ordem.rodadas.map((rodadaId) => ({ rodadaId, opcaoId: config.rodadas[rodadaId].padrao, cartaId: 'normal' }));

  // Act
  const d = M.decompor(config, { equipeId: 'e3', rodadas: jogadas });

  // Assert
  assert.equal(d.estimado, true);
  assert.equal(d.efeitoDecisoes, 0);
  assert.equal(d.piorCasoSemProtecao, d.piorCaso, 'sem proteção escolhida, o mesmo pior caso');
});
