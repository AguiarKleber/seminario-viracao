// O empréstimo como dívida, e não como renda (esquema v2.2, contratos seções 1
// e 3). O caso que motivou: no teste real de 30/09, o Jonas faltou R$ 467 no
// mês 1, pegou R$ 1.500 no mês 2, e a tela mostrou "dívida R$ 1" e saldo
// −R$ 1. O empréstimo tinha entrado como renda do trabalho, e a dívida dele não
// aparecia em lugar nenhum.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { configMinimo, normalizar, textoConfigRealV22 } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;
const H = V.historia;

// O conteúdo do dia do teste (v2.2, 3 rodadas mensais), congelado na fixture:
// o config.json de 12 meses (D-060) não tem mais o empréstimo no mês 2 nem o
// caminho de −R$ 467 do Jonas.
function configReal() {
  const r = V.validarConfig.validarTexto(textoConfigRealV22());
  assert.deepEqual(r.erros, [], 'o config do teste de 30/09 é válido');
  return r.config;
}

function configJsonDaRaiz() {
  const r = V.validarConfig.validarTexto(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  assert.deepEqual(r.erros, [], 'o config.json real é válido');
  return r.config;
}

// O caminho do teste real: equipe 1 (Jonas), mês 1 na jornada de sempre sem
// carta (falta R$ 467), mês 2 pegando o empréstimo, mês 3 no padrão.
function caminhoDoJonas(config, cartaMes2 = 'normal') {
  const e0 = M.estadoInicial(config, 'e1');
  const m1 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'c', cartaId: 'normal', estado: e0, historico: {} });
  const h1 = { r1: { decisao: 'c', carta: 'normal' } };
  const m2 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'd', cartaId: cartaMes2, estado: m1.depois, historico: h1 });
  const h2 = { ...h1, r2: { decisao: 'd', carta: cartaMes2 } };
  const m3 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r3', opcaoId: 'd', cartaId: 'normal', estado: m2.depois, historico: h2 });
  return { m1, m2, m3 };
}

test('Jonas do teste de 30/09: o mês 2 mostra o empréstimo à parte, e a dívida inclui os R$ 1.500 (nunca "dívida R$ 1")', () => {
  // Arrange
  const config = configReal();

  // Act
  const { m1, m2 } = caminhoDoJonas(config);

  // Assert: o mês 1 é o do teste real.
  assert.equal(m1.depois.renda, -467);
  assert.equal(m1.depois.emprestimo, 0);
  // O mês 2: o dinheiro emprestado entra no caixa (o cheque especial cai para
  // R$ 1), mas fica fora do "entrou" e do saldo do mês, e sobe o saldo devedor.
  assert.equal(m2.mes.emprestimo, 1500);
  assert.equal(m2.mes.entrou, 3297, 'antes: R$ 4.797, com o empréstimo dentro');
  assert.equal(m2.mes.saldoMes, -1034, 'antes: "sobrou R$ 466"');
  assert.equal(m2.mes.parcela, 0, 'a 1ª parcela vence no mês seguinte');
  assert.equal(m2.mes.saldoDevedor, 1500);
  assert.equal(m2.depois.renda, -1);
  assert.equal(m2.depois.emprestimo, 1500);
  // A dívida da tela: cheque especial + empréstimo = a de antes + o que faltou.
  const divida = H.dividaTotal(m2.depois);
  assert.deepEqual(divida, { chequeEspecial: 1, emprestimo: 1500, total: 1501 });
  assert.equal(divida.total, 467 - m2.mes.saldoMes, 'dívida antes + faltou = dívida depois');
  assert.equal(H.patrimonioDe(m2.depois), -1501);
  // Fica devendo 12 parcelas de R$ 183 (a última de R$ 179), R$ 2.192 no total.
  assert.equal(m2.mes.parcelasRestantes, 12);
  assert.equal(m2.mes.proximaParcela, 183);
  assert.equal(m2.mes.aPagar, 2192);
});

test('Jonas no mês 3: a parcela sai do caixa, os juros dela entram em "juros" e o resto abate o saldo devedor', () => {
  // Arrange
  const config = configReal();

  // Act
  const { m2, m3 } = caminhoDoJonas(config);

  // Assert: parcela de R$ 183 = R$ 96 de juros (6,39% de 1.500) + R$ 87 que abatem.
  assert.equal(m3.mes.parcela, 183);
  assert.equal(m3.mes.jurosEmprestimo, 96);
  assert.equal(m3.mes.amortizacao, 87);
  assert.equal(m3.mes.juros, 96, 'o cheque especial de R$ 1 não rende juros (arredonda a 0)');
  assert.equal(m3.mes.saldoDevedor, 1413, 'a fonte do config: 1.500 × 1,0639 − 182,76 = 1.413,09');
  assert.equal(m3.depois.emprestimo, 1413);
  // O caixa anda o saldo do mês menos o que abateu a dívida.
  assert.equal(m3.delta.renda, m3.mes.saldoMes - m3.mes.amortizacao);
  assert.equal(m3.mes.entrou + m3.mes.protecao - m3.mes.gastos - m3.mes.basico - m3.mes.juros, m3.mes.saldoMes);
  // Dívida antes + faltou = dívida depois, somando as duas dívidas.
  assert.equal(H.dividaTotal(m3.depois).total, H.dividaTotal(m2.depois).total - m3.mes.saldoMes);
  // O fim do jogo é o mesmo patrimônio da modelagem antiga (−R$ 2.110, em que o
  // saldo devedor era cobrado como gasto no mês 3): só a forma mudou.
  assert.equal(M.patrimonio(m3.depois), -2110);
  // E a dívida continua depois do jogo: 11 parcelas, R$ 2.009 a pagar.
  assert.equal(m3.mes.parcelasRestantes, 11);
  assert.equal(m3.mes.aPagar, 10 * 183 + 179);
  // A linha de cada indicador soma o delta dele.
  for (const ind of ['renda', 'emprestimo']) {
    assert.equal(m3.linhas.filter((l) => l.indicador === ind).reduce((s, l) => s + l.valor, 0), m3.delta[ind], ind);
  }
});

test('placar: o empréstimo nunca é dinheiro de graça, nem no fim do mês 2 nem com o mês 3 pulado', () => {
  // Arrange
  const config = configReal();
  const doisMeses = [{ rodadaId: 'r1', opcaoId: 'c', cartaId: 'normal' }, { rodadaId: 'r2', opcaoId: 'd', cartaId: 'normal' }];
  const semEmprestimo = [doisMeses[0], { rodadaId: 'r2', opcaoId: 'a', cartaId: 'normal' }];

  // Act
  const d = M.decompor(config, { equipeId: 'e1', rodadas: doisMeses });
  const sem = M.decompor(config, { equipeId: 'e1', rodadas: semEmprestimo });

  // Assert: antes, o placar dava −R$ 1 e o empréstimo "valia" +R$ 1.304 de decisão.
  assert.equal(d.realizado, -1501);
  assert.ok(Math.abs(d.esperadoPiloto + d.efeitoDecisoes + d.sorte - d.realizado) < 1e-9, 'o placar decomposto continua exato');
  assert.ok(d.efeitoDecisoes < 0, `o empréstimo não é decisão que rende (${d.efeitoDecisoes})`);
  assert.ok(d.realizado < sem.realizado + 1500, 'pegar emprestado não soma os R$ 1.500 ao placar');
});

test('Marcos pega pelo app da 99: 9,36% ao mês, parcela de R$ 213 e saldo de R$ 1.427', () => {
  // Arrange
  const config = configReal();
  const e0 = M.estadoInicial(config, 'e4');
  const h1 = { r1: { decisao: 'c', carta: 'normal' } };
  const m1 = M.aplicar(config, { equipeId: 'e4', rodadaId: 'r1', opcaoId: 'c', cartaId: 'normal', estado: e0, historico: {} });
  const m2 = M.aplicar(config, { equipeId: 'e4', rodadaId: 'r2', opcaoId: 'd', cartaId: 'normal', estado: m1.depois, historico: h1 });

  // Act
  const m3 = M.aplicar(config, { equipeId: 'e4', rodadaId: 'r3', opcaoId: 'd', cartaId: 'normal', estado: m2.depois, historico: { ...h1, r2: { decisao: 'd', carta: 'normal' } } });

  // Assert
  assert.equal(m2.mes.emprestimo, 1500);
  assert.equal(m3.mes.parcela, 213);
  assert.equal(m3.mes.jurosEmprestimo, 140);
  assert.equal(m3.depois.emprestimo, 1427);
  assert.equal(m2.mes.taxaEmprestimo, 0.0936, 'a taxa do empréstimo da 99 vai no mês gravado');
});

// Revisão de 30/09 (achado 17): o celular mostrava "Cheque especial R$ 1 ·
// juros de 7,43% ao mês" e o empréstimo sem taxa nenhuma, e o Kleber
// perguntou justamente pela taxa. A taxa vai no mês gravado, do mês em que o
// empréstimo entra até a última parcela; sem empréstimo, sem o campo.
test('a taxa do empréstimo vai no mês gravado (6,39% do crédito pessoal do Jonas), e some sem empréstimo', () => {
  // Arrange
  const config = configReal();

  // Act
  const { m1, m2, m3 } = caminhoDoJonas(config);

  // Assert
  assert.equal(Object.hasOwn(m1.mes, 'taxaEmprestimo'), false, 'sem empréstimo, sem o campo (o RTDB apagaria o null)');
  assert.equal(m2.mes.taxaEmprestimo, 0.0639);
  assert.equal(m3.mes.taxaEmprestimo, 0.0639);
});

test('cronograma: tabela Price em reais inteiros, que zera o saldo na última parcela', () => {
  // Act
  const t = M.cronograma(1500, 12, 0.0639);

  // Assert
  assert.equal(t.length, 12);
  assert.deepEqual(t[0], { parcela: 183, juros: 96, amortizacao: 87, saldo: 1413 });
  assert.equal(t.reduce((s, p) => s + p.amortizacao, 0), 1500);
  assert.equal(t[11].saldo, 0);
  assert.ok(t.slice(0, 11).every((p) => p.parcela === 183));
  // A cópia protege o cache: alterar o que voltou não muda a próxima tabela.
  t[0].parcela = 0;
  assert.equal(M.cronograma(1500, 12, 0.0639)[0].parcela, 183);
});

// Um config mínimo com 3 meses, empréstimo de 1.000 em 4 parcelas a 10% na
// opção "a" do mês 1, e o indicador do saldo devedor.
function configComEmprestimo() {
  const b = configMinimo();
  b.indicadores.push({ id: 'emprestimo', nome: 'Empréstimo a pagar', formato: 'moeda', inicial: 0, min: 0, max: 100000 });
  b.rodadas = ['r1', 'r2', 'r3'].map((id) => ({
    id, titulo: id, texto: 'Texto', padrao: 'b',
    opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } },
  }));
  b.rodadas[0].opcoes.a.efeitos = [{ emprestimo: { valor: 1000, parcelas: 4, taxaMes: 0.1, fonte: 'teste' }, rotulo: 'empréstimo' }];
  b.roteiros = { '60min': [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'rodada', rodada: 'r2' }, { tipo: 'rodada', rodada: 'r3' }, { tipo: 'fim' }] };
  return b;
}

test('mês pulado no dia não cobra parcela: a do mês 3 é a 1ª quando o mês 2 não foi jogado', () => {
  // Arrange: PMT(1.000; 4; 10%) = 315,47 → 315; juros 100; abate 215.
  const config = normalizar(V, configComEmprestimo());
  const e0 = M.estadoInicial(config, 'e1');
  const m1 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: e0, historico: {} });
  const h1 = { r1: { decisao: 'a', carta: 'normal' } };

  // Act
  const pulado = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r3', opcaoId: 'b', cartaId: 'normal', estado: m1.depois, historico: h1 });
  const m2 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'b', cartaId: 'normal', estado: m1.depois, historico: h1 });
  const m3 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r3', opcaoId: 'b', cartaId: 'normal', estado: m2.depois, historico: { ...h1, r2: { decisao: 'b', carta: 'normal' } } });

  // Assert
  assert.deepEqual(m1.depois, { renda: 1000, energia: 8, emprestimo: 1000 });
  assert.equal(m1.mes.saldoMes, 0, 'pegar emprestado não é ganhar');
  assert.equal(M.patrimonio(m1.depois), 0);
  assert.deepEqual([pulado.mes.parcela, pulado.mes.jurosEmprestimo, pulado.mes.amortizacao, pulado.depois.emprestimo], [315, 100, 215, 785]);
  assert.deepEqual([m2.mes.parcela, m2.depois.emprestimo], [315, 785]);
  assert.deepEqual([m3.mes.parcela, m3.mes.jurosEmprestimo, m3.depois.emprestimo], [315, 79, 549], '2ª parcela: juros de 10% sobre 785');
  assert.equal(m3.mes.parcelasRestantes, 2);
});

test('sem histórico, a parcela não é cobrada; o empréstimo não entra no multiplica nem no piso do trabalho', () => {
  // Arrange: a carta zera o trabalho, e o piso está ligado.
  const b = configComEmprestimo();
  b.regras.pisoTrabalho = true;
  b.cartas[0].efeitos = [{ multiplica: { renda: 0 } }];
  const config = normalizar(V, b);

  // Act
  const m1 = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado: M.estadoInicial(config, 'e1'), historico: {} });
  const semHistorico = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r2', opcaoId: 'b', cartaId: 'normal', estado: m1.depois });

  // Assert
  assert.equal(m1.mes.trabalho, 0);
  assert.equal(m1.mes.emprestimo, 1000);
  assert.equal(m1.depois.renda, 1000, 'o multiplica 0 da carta não zera o dinheiro emprestado');
  assert.equal(semHistorico.mes.parcela, 0);
});

// ------------------------------------------------------------- validador

const erros = (b) => V.validarConfig.validar(b).erros.map((e) => `${e.caminho}: ${e.mensagem}`);
const temErro = (b, trecho) => assert.ok(erros(b).some((e) => e.includes(trecho)), `esperava um erro com "${trecho}"; veio:\n${erros(b).join('\n')}`);

test('validador: o empréstimo válido é normalizado, e o config.json real passa sem erro', () => {
  // Act
  const r = V.validarConfig.validar(configComEmprestimo());

  // Assert
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.config.rodadas.r1.opcoes.a.efeitos, [{ rotulo: 'empréstimo', emprestimo: { valor: 1000, parcelas: 4, taxaMes: 0.1, fonte: 'teste' } }]);
  configReal();
  configJsonDaRaiz();
});

test('validador: empréstimo só numa opção, sem soma e com condição que não lê estado nem histórico', () => {
  const emprestimo = { valor: 1000, parcelas: 4, taxaMes: 0.1, fonte: 'teste' };
  let b = configComEmprestimo();
  b.personas[0].todoMes = [{ emprestimo }];
  temErro(b, 'só vale nos efeitos de uma opção');
  b = configComEmprestimo();
  b.cartas[0].efeitos = [{ emprestimo }];
  temErro(b, 'só vale nos efeitos de uma opção');
  b = configComEmprestimo();
  b.rodadas[1].efeitosGerais = [{ emprestimo }];
  temErro(b, 'só vale nos efeitos de uma opção');
  b = configComEmprestimo();
  b.rodadas[0].opcoes.a.efeitos[0].soma = { renda: 1000 };
  temErro(b, '"soma" junto de "emprestimo"');
  b = configComEmprestimo();
  b.rodadas[1].opcoes.a.efeitos = [{ se: { indicador: { renda: { abaixoDe: 0 } } }, emprestimo }];
  temErro(b, 'a condição de um empréstimo só pode usar');
  b = configComEmprestimo();
  b.rodadas[1].opcoes.a.efeitos = [{ se: { decidiu: { r1: 'a' } }, emprestimo }];
  temErro(b, 'a condição de um empréstimo só pode usar');
});

test('validador: valor, parcelas, taxa e fonte do empréstimo', () => {
  const com = (campos) => {
    const b = configComEmprestimo();
    Object.assign(b.rodadas[0].opcoes.a.efeitos[0].emprestimo, campos);
    return b;
  };
  temErro(com({ valor: 0 }), 'emprestimo.valor');
  temErro(com({ valor: 10.5 }), 'emprestimo.valor');
  temErro(com({ parcelas: 61 }), 'o máximo é 60');
  temErro(com({ taxaMes: 6.39 }), '0,0639 = 6,39% ao mês');
  temErro(com({ fonte: '' }), 'emprestimo.fonte');
  const b = configComEmprestimo();
  delete b.rodadas[0].opcoes.a.efeitos[0].emprestimo.fonte;
  temErro(b, 'emprestimo.fonte');
  temErro(com({ prazo: 3 }), 'emprestimo');
});

test('validador: o indicador do saldo devedor existe, começa em 0, cabe o empréstimo e só o motor o muda', () => {
  let b = configComEmprestimo();
  b.indicadores = b.indicadores.filter((i) => i.id !== 'emprestimo');
  temErro(b, 'falta o indicador "emprestimo"');
  b = configComEmprestimo();
  b.indicadores[2].min = -10;
  temErro(b, 'o mínimo precisa ser 0');
  b = configComEmprestimo();
  b.indicadores[2].inicial = 500;
  temErro(b, 'o saldo devedor começa em 0');
  b = configComEmprestimo();
  b.personas[0].inicial = { emprestimo: 500 };
  temErro(b, 'o saldo devedor começa em 0');
  b = configComEmprestimo();
  b.indicadores[2].max = 999;
  temErro(b, 'menor que os empréstimos somados');
  b = configComEmprestimo();
  b.indicadores[2].formato = 'inteiro';
  temErro(b, 'use "moeda"');
  b = configComEmprestimo();
  b.cartas[0].efeitos = [{ soma: { emprestimo: -100 } }];
  temErro(b, 'só muda pelo empréstimo e pelas parcelas');
});

test('validador: com empréstimo, todo roteiro segue a ordem das rodadas do config', () => {
  // Arrange: o motor conta as parcelas pagas na ordem do config.
  const b = configComEmprestimo();
  b.roteiros['60min'] = [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'rodada', rodada: 'r3' }, { tipo: 'rodada', rodada: 'r2' }, { tipo: 'fim' }];

  // Assert
  temErro(b, 'fora da ordem do config');
});

// ------------------------------------------------------------- história

test('historia: dívida total, patrimônio, o resumo mês a mês e "escolha ou sorte" no patrimônio', () => {
  // Assert
  assert.deepEqual(H.dividaTotal({ renda: -1, emprestimo: 1500 }), { chequeEspecial: 1, emprestimo: 1500, total: 1501 });
  assert.deepEqual(H.dividaTotal({ renda: 200 }), { chequeEspecial: 0, emprestimo: 0, total: 0 }, 'sala sem o indicador do empréstimo');
  assert.equal(H.dividaTotal({}), null);
  assert.equal(H.patrimonioDe({ renda: 1000, emprestimo: 1500 }), -500);
  // O placar grava o caixa (renda) e o saldo devedor; piloto e efeitoDecisoes já
  // vêm no patrimônio, e a conta exibida tem de fechar no patrimônio.
  const e = H.escolhaOuSorte({ renda: -1, emprestimo: 1500, piloto: -1766.8, efeitoDecisoes: -195.8 });
  assert.equal(e.total, -1501);
  assert.equal(e.piloto + e.escolhas + e.sorte, e.total);
  const conteudo = configReal();
  const historia = H.historiaDaEquipe(conteudo, 'e1', { r2: { e1: { decisao: 'd', carta: 'normal', depois: { renda: -1, energia: 5, protecao: 0, emprestimo: 1500 } } } });
  assert.equal(historia[0].saldoAcumulado, -1501);
  assert.equal(historia[0].divida.total, 1501);
});
