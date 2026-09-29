// O celular, a história da equipe e o anfitrião no esquema v2.1: a mesma
// escolha dita do jeito de cada ofício (rotuloPor/narrativaPor, D-054), o custo
// real da carta (cartaCusto, D-052) e as contas do mês com gastos e custos
// fixos. Contratos seções 3, 7 e 8.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';
import { lerConfigTesteV21, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { telaDoAluno } = V.alunoLogica;
const conteudo = normalizar(V, lerConfigTesteV21());
const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
const meta = { roteiro: '60min', entradaAberta: true };

function entrada(estado, equipe, extra = {}) {
  return {
    conteudo, estado, membro: { entrouEm: 100, equipe }, meusVotos: {}, decisoesDaEquipe: null,
    resultados: null, placar: null, uid: 'eu', agora: 0, meta, ...extra,
  };
}

const rodada = (rodadaId, subfase) => ({
  geracao: 9, indice: 7, tipo: 'rodada', rodada: rodadaId, subfase, abertoEm: 200, prazo: 120_200,
  equipesTravadas: true, equipesAbertas: TODAS,
});

// O que o anfitrião grava no mês 2: a Cida (e3, manicure) e o Rafa (e1,
// motoboy) escolheram a mesma opção "a" e tiraram o acidente.
const MES = { trabalho: 984, custosFixos: 560, gastos: 400, outraRenda: 0, entrou: 424, basico: 2000, juros: 0, saldoMes: -1976, dividaAntes: 0 };
const CUSTO = { diasParado: 20, rendaPerdida: 2296, gastos: 400 };
const RESULTADOS = {
  r2: {
    e3: { decisao: 'a', origem: 'maioria', carta: 'acidente', delta: {}, depois: { renda: -1976, energia: 6, protecao: 1 }, mes: MES, cartaCusto: CUSTO },
    e1: { decisao: 'a', origem: 'maioria', carta: 'acidente', delta: {}, depois: { renda: -1976, energia: 6, protecao: 0 }, mes: MES, cartaCusto: CUSTO },
  },
};

test('textoDaOpcao: o texto da persona, e o da opção quando ela não tem entrada', () => {
  // Act / Assert
  assert.deepEqual(V.historia.textoDaOpcao(conteudo, 'r2', 'a', 'manicure'), { rotulo: 'Aceitar todos os atendimentos', narrativa: 'Atendi até cliente longe e barata.' });
  assert.deepEqual(V.historia.textoDaOpcao(conteudo, 'r2', 'a', 'costureira'),
    { rotulo: 'Aceitar todas as encomendas', narrativa: 'Aceitei tudo o que apareceu, até o que não compensava.' }, 'só o rótulo é dela');
  assert.deepEqual(V.historia.textoDaOpcao(conteudo, 'r2', 'a', 'motoboy'), { rotulo: 'Aceitar tudo', narrativa: 'Aceitei tudo o que apareceu, até o que não compensava.' });
  assert.deepEqual(V.historia.textoDaOpcao(conteudo, 'r2', 'b', 'manicure'), { rotulo: 'Recusar corridas ruins', narrativa: null });
  assert.deepEqual(V.historia.textoDaOpcao(conteudo, 'r2', 'z', 'manicure'), { rotulo: null, narrativa: null });
  assert.deepEqual(V.historia.textoDaOpcao(conteudo, 'r2', 'a', 'constructor'), { rotulo: 'Aceitar tudo', narrativa: 'Aceitei tudo o que apareceu, até o que não compensava.' });
});

test('historiaDaEquipe: o texto da opção pela persona da equipe, o cartaCusto e o mes com gastos', () => {
  // Act
  const cida = V.historia.historiaDaEquipe(conteudo, 'e3', RESULTADOS);
  const rafa = V.historia.historiaDaEquipe(conteudo, 'e1', RESULTADOS);

  // Assert
  assert.deepEqual(cida[0].opcao, { rotulo: 'Aceitar todos os atendimentos', narrativa: 'Atendi até cliente longe e barata.' });
  assert.deepEqual(rafa[0].opcao, { rotulo: 'Aceitar tudo', narrativa: 'Aceitei tudo o que apareceu, até o que não compensava.' });
  assert.deepEqual(cida[0].cartaCusto, CUSTO);
  assert.equal(cida[0].mes.gastos, 400);
  assert.equal(cida[0].mes.custosFixos, 560);
  assert.equal(V.historia.linhaDoMes(cida[0]), 'Atendi até cliente longe e barata.');
});

test('historiaDaEquipe: resultado de sala anterior ao v2.1 (sem cartaCusto) dá null', () => {
  // Arrange
  const antigo = { r1: { e1: { decisao: 'c', carta: 'normal', mes: { trabalho: 1, outraRenda: 0, entrou: 1, basico: 0, juros: 0, saldoMes: 1, dividaAntes: 0 } } } };

  // Act / Assert
  assert.equal(V.historia.historiaDaEquipe(conteudo, 'e1', antigo)[0].cartaCusto, null);
});

test('decisão: os botões com o rótulo do ofício da equipe (D-054)', () => {
  // Act
  const cida = telaDoAluno(entrada(rodada('r2', 'decidindo'), 'e3'));
  const lia = telaDoAluno(entrada(rodada('r2', 'decidindo'), 'e5'));
  const rafa = telaDoAluno(entrada(rodada('r2', 'decidindo'), 'e1'));

  // Assert
  assert.deepEqual(cida.dados.opcoes.map((o) => o.rotulo), ['Aceitar todos os atendimentos', 'Recusar corridas ruins', 'Seguir como está', 'Trocar de aplicativo']);
  assert.deepEqual(lia.dados.opcoes.map((o) => o.rotulo), ['Aceitar todas as encomendas', 'Recusar corridas ruins', 'Seguir como está', 'Vender numa feira nova']);
  assert.deepEqual(rafa.dados.opcoes.map((o) => o.rotulo), ['Aceitar tudo', 'Recusar corridas ruins', 'Seguir como está', 'Trocar de aplicativo']);
  for (const o of cida.dados.opcoes) assert.deepEqual(Object.keys(o).sort(), ['id', 'rotulo', 'votos'], 'a tendência continua fora (D-043)');
});

test('prorrogação: só as empatadas, com o rótulo do ofício', () => {
  // Arrange
  const estado = { ...rodada('r2', 'prorrogacao'), empatadas: { e5: { a: true, d: true } } };

  // Act
  const r = telaDoAluno(entrada(estado, 'e5'));

  // Assert
  assert.deepEqual(r.dados.opcoes.map((o) => [o.id, o.rotulo]), [['a', 'Aceitar todas as encomendas'], ['d', 'Vender numa feira nova']]);
});

test('resultado: a decisão com o texto do ofício, as contas com gastos e o custo real da carta (D-052)', () => {
  // Act
  const cida = telaDoAluno(entrada(rodada('r2', 'resultado'), 'e3', { resultados: RESULTADOS }));
  const rafa = telaDoAluno(entrada(rodada('r2', 'resultado'), 'e1', { resultados: RESULTADOS }));

  // Assert
  assert.equal(cida.tipo, 'resultado');
  assert.deepEqual(cida.dados.decisao, { id: 'a', rotulo: 'Aceitar todos os atendimentos', narrativa: 'Atendi até cliente longe e barata.' });
  assert.deepEqual(rafa.dados.decisao, { id: 'a', rotulo: 'Aceitar tudo', narrativa: 'Aceitei tudo o que apareceu, até o que não compensava.' });
  assert.deepEqual(cida.dados.mes, MES);
  assert.deepEqual(cida.dados.cartaCusto, CUSTO);
});

test('resultado de sala anterior ao v2.1: cartaCusto null', () => {
  // Arrange
  const antigo = { r2: { e1: { ...RESULTADOS.r2.e1, cartaCusto: undefined } } };

  // Act
  const r = telaDoAluno(entrada(rodada('r2', 'resultado'), 'e1', { resultados: antigo }));

  // Assert
  assert.equal(r.dados.cartaCusto, null);
});

test('situação: o último mês com o rótulo e a narrativa do ofício, os gastos e o cartaCusto', () => {
  // Arrange
  const estado = { tipo: 'bloco', subfase: 'ativo', indice: 8, equipesTravadas: true, equipesAbertas: TODAS };

  // Act
  const r = telaDoAluno(entrada(estado, 'e3', { resultados: RESULTADOS }));

  // Assert
  assert.equal(r.dados.mes.decisao.rotulo, 'Aceitar todos os atendimentos');
  assert.equal(r.dados.narrativa[0], 'Atendi até cliente longe e barata.');
  assert.equal(r.dados.mes.gastos, 400);
  assert.equal(r.dados.mes.custosFixos, 560);
  assert.equal(r.dados.mes.entrou, 424);
  assert.deepEqual(r.dados.mes.cartaCusto, CUSTO);
});

test('anfitrião: grava o cartaCusto e o mes v2.1 do motor em resultados/{r}/{eq}', async () => {
  // Arrange: todas as decisões pelo apresentador, para não depender de votos.
  const sessao = montarSessao(V, { config: conteudo, sementes: [11, 22, 33] });
  const { anf, host, relogio, indiceDe } = sessao;
  const s = (...partes) => ['salas', SALA, ...partes].join('/');
  await anf.criarSala();
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(['e1', 'e4']);
  await anf.avancar();
  relogio.passar(1000);
  await anf.avancar();
  const plano = { r1: { e1: 'b', e4: 'a' }, r2: { e1: 'a', e4: 'a' } };

  // Act
  for (const r of ['r1', 'r2']) {
    if (r !== 'r1') await anf.pularPara(indiceDe('rodada', { rodada: r }));
    for (const [eq, op] of Object.entries(plano[r])) await anf.decidirPorEquipe(eq, op);
    await anf.encerrar();
  }

  // Assert
  const resultados = await host.ler(s('resultados'));
  const sementes = await host.ler(s('sementes'));
  for (const eq of ['e1', 'e4']) {
    let estado = V.motor.estadoInicial(conteudo, eq);
    const historico = {};
    for (const r of ['r1', 'r2']) {
      const esperado = V.motor.resolverRodada(conteudo, { equipeId: eq, rodadaId: r, opcaoId: plano[r][eq], estado, semente: sementes[r], historico });
      assert.deepEqual(resultados[r][eq].mes, esperado.mes, `${r}/${eq}: mes`);
      assert.deepEqual(resultados[r][eq].cartaCusto, esperado.cartaCusto, `${r}/${eq}: cartaCusto`);
      historico[r] = { decisao: plano[r][eq], carta: esperado.carta };
      estado = esperado.depois;
    }
  }
  assert.equal(resultados.r1.e4.mes.custosFixos, 900, 'o aluguel do carro do Jorge é custo fixo');
  assert.equal(resultados.r2.e1.mes.custosFixos, 560, 'parcela da moto + DAS do MEI (efeito geral, porque o Rafa pagou o MEI no mês 1)');
});

// O que veio dos meses anteriores, como o anfitrião grava (deAntes, só quando há).
const DE_ANTES = [{ rotulo: 'fratura: mais 25 dias parado', valor: -2233 }, { rotulo: 'auxílio do INSS (45 dias)', valor: 2431 }];
const COM_DE_ANTES = { r3: { e3: { ...RESULTADOS.r2.e3, deAntes: DE_ANTES } } };

test('deAntes: o resultado, a situação e a história trazem o que veio dos meses anteriores', () => {
  // Arrange
  const estadoBloco = { tipo: 'bloco', subfase: 'ativo', indice: 8, equipesTravadas: true, equipesAbertas: TODAS };

  // Act
  const resultado = telaDoAluno(entrada(rodada('r3', 'resultado'), 'e3', { resultados: COM_DE_ANTES }));
  const situacao = telaDoAluno(entrada(estadoBloco, 'e3', { resultados: COM_DE_ANTES }));
  const historia = V.historia.historiaDaEquipe(conteudo, 'e3', COM_DE_ANTES);
  const semNada = telaDoAluno(entrada(rodada('r2', 'resultado'), 'e3', { resultados: RESULTADOS }));

  // Assert
  assert.deepEqual(resultado.dados.deAntes, DE_ANTES);
  assert.deepEqual(situacao.dados.mes.deAntes, DE_ANTES);
  assert.deepEqual(historia[0].deAntes, DE_ANTES);
  assert.deepEqual(semNada.dados.deAntes, [], 'sem nada gravado (ou sala antiga), lista vazia');
});

test('deAntes: a lista que volta do RTDB como objeto { "0": … } é lida igual', () => {
  // Arrange
  const doBanco = { r3: { e3: { ...COM_DE_ANTES.r3.e3, deAntes: { 0: DE_ANTES[0], 1: DE_ANTES[1] } } } };

  // Act
  const r = telaDoAluno(entrada(rodada('r3', 'resultado'), 'e3', { resultados: doBanco }));

  // Assert
  assert.deepEqual(r.dados.deAntes, DE_ANTES);
});
