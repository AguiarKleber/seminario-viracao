// O jogo de 12 meses (esquema v3, D-060) de ponta a ponta no canal-local: o
// anfitrião apura as 6 rodadas bimestrais, grava o placar (estimado a partir
// da 5ª, quando os caminhos de cartas passam de 200 mil) e a história, o
// resumo por rodada e as telas do celular falam em "bimestre".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';
import { lerConfigTesteV3, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const s = (...partes) => ['salas', SALA, ...partes].join('/');

test('6 rodadas bimestrais: resultados do motor com o histórico, placar estimado a partir da 5ª e igual ao decompor', async () => {
  // Arrange: três equipes; a e1 paga o MEI no bimestre 1 e pega o empréstimo
  // no 2; as decisões pelo apresentador, para o teste não depender de votos.
  const config = normalizar(V, lerConfigTesteV3());
  const rodadas = config.ordem.rodadas;
  const sessao = montarSessao(V, { config, sementes: [101, 202, 303, 404, 505, 606] });
  const { anf, host, relogio, indiceDe } = sessao;
  const ativas = ['e1', 'e3', 'e5'];
  const plano = {
    r1: { e1: 'b', e3: 'a', e5: 'c' }, r2: { e1: 'd', e3: 'a', e5: 'b' }, r3: { e1: 'a', e3: 'c', e5: 'd' },
    r4: { e1: 'b', e3: 'a', e5: 'd' }, r5: { e1: 'c', e3: 'b', e5: 'a' }, r6: { e1: 'a', e3: 'd', e5: 'c' },
  };
  await anf.criarSala();
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(ativas);
  await anf.avancar();
  relogio.passar(1000);
  await anf.avancar();
  const estimadoNoPlacar = {};

  // Act
  for (const r of rodadas) {
    if (r !== 'r1') await anf.pularPara(indiceDe('rodada', { rodada: r }));
    for (const eq of ativas) await anf.decidirPorEquipe(eq, plano[r][eq]);
    await anf.encerrar();
    estimadoNoPlacar[r] = (await host.ler(s('placar', 'e1'))).estimado === true;
  }

  // Assert
  const resultados = await host.ler(s('resultados'));
  const sementes = await host.ler(s('sementes'));
  const placar = await host.ler(s('placar'));
  assert.deepEqual(estimadoNoPlacar, { r1: false, r2: false, r3: false, r4: false, r5: true, r6: true },
    'exato até a 4ª (41 mil caminhos), estimado na 5ª e na 6ª');
  for (const eq of ativas) {
    let estado = V.motor.estadoInicial(config, eq);
    const historico = {};
    const jogadas = [];
    for (const r of rodadas) {
      const esperado = V.motor.resolverRodada(config, { equipeId: eq, rodadaId: r, opcaoId: plano[r][eq], estado, semente: sementes[r], historico });
      const gravado = resultados[r][eq];
      assert.equal(gravado.carta, esperado.carta, `${r}/${eq}: carta`);
      assert.deepEqual(gravado.depois, esperado.depois, `${r}/${eq}: depois`);
      assert.deepEqual(gravado.mes, esperado.mes, `${r}/${eq}: mes`);
      historico[r] = { decisao: plano[r][eq], carta: esperado.carta };
      jogadas.push({ rodadaId: r, opcaoId: plano[r][eq], cartaId: esperado.carta });
      estado = esperado.depois;
    }
    // O placar gravado é o decompor recalculado (a mesma semente da simulação).
    const d = V.motor.decompor(config, { equipeId: eq, rodadas: jogadas });
    assert.equal(d.estimado, true);
    for (const [campo, valor] of [['piloto', d.esperadoPiloto], ['efeitoDecisoes', d.efeitoDecisoes], ['sorte', d.sorte], ['piorCaso', d.piorCaso], ['piorCasoSemProtecao', d.piorCasoSemProtecao]]) {
      assert.equal(placar[eq][campo], valor, `placar ${eq}.${campo}`);
    }
    assert.equal(placar[eq].renda, estado.renda);
    assert.equal(placar[eq].estimado, true);
  }
  // A equipe que não jogou fica no placar sem a marca (0 rodada: exato).
  assert.equal(Object.hasOwn(placar.e2, 'estimado'), false);
  // O básico do bimestre é o dobro do básico do mês (a Rafa: 2.000 por mês).
  assert.equal(resultados.r1.e1.mes.basico, 4000);
  // O empréstimo do bimestre 2 da e1 é pago de duas em duas parcelas.
  const tabela = V.motor.cronograma(1500, 6, 0.0639);
  assert.equal(resultados.r3.e1.mes.parcela, tabela[0].parcela + tabela[1].parcela);
  assert.equal(resultados.r5.e1.mes.parcelasRestantes, 0);
  assert.equal(resultados.r6.e1.mes.parcela, 0, 'as 6 parcelas acabaram no bimestre 5');
});

test('história, resumo por rodada e telas do celular com 6 bimestres', async () => {
  // Arrange: resultados de 6 rodadas feitos pelo motor (a e3), e o placar estimado.
  const config = normalizar(V, lerConfigTesteV3());
  const M = V.motor;
  const resultados = {};
  let estado = M.estadoInicial(config, 'e3');
  const historico = {};
  for (const r of config.ordem.rodadas) {
    const res = M.resolverRodada(config, { equipeId: 'e3', rodadaId: r, opcaoId: config.rodadas[r].padrao, estado, semente: 7, historico });
    resultados[r] = { e3: { decisao: config.rodadas[r].padrao, origem: 'piloto', carta: res.carta, depois: res.depois, mes: res.mes, cartaCusto: res.cartaCusto } };
    historico[r] = { decisao: config.rodadas[r].padrao, carta: res.carta };
    estado = res.depois;
  }
  const placar = { e3: { ...estado, piloto: 100, efeitoDecisoes: 0, sorte: 50, piorCaso: -9000, piorCasoSemProtecao: -9000, ativa: true, estimado: true } };
  const H = V.historia;

  // Act
  const periodo = H.periodo(config);
  const resumo = H.resumoPorRodada(config, 'e3', resultados);
  const historia = H.historiaDaEquipe(config, 'e3', resultados);
  const membro = { entrouEm: 1, equipe: 'e3' };
  const base = { conteudo: config, membro, meusVotos: {}, decisoesDaEquipe: null, resultados, placar, uid: 'u1', agora: 0 };
  const fim = V.alunoLogica.telaDoAluno({ ...base, estado: { tipo: 'fim', subfase: 'ativo', equipesTravadas: true } });
  const bloco = V.alunoLogica.telaDoAluno({ ...base, estado: { tipo: 'bloco', subfase: 'ativo', equipesTravadas: true, indice: 7 } });

  // Assert
  assert.deepEqual(periodo, { meses: 2, nome: 'bimestre', noPeriodo: 'no bimestre', doPeriodo: 'do bimestre' });
  assert.deepEqual(H.periodo({ regras: {} }), { meses: 1, nome: 'mês', noPeriodo: 'no mês', doPeriodo: 'do mês' }, 'sem a chave, o mês de sempre');
  assert.equal(resumo.length, 6);
  assert.deepEqual(resumo.map((x) => x.rotulo), ['Jan–fev', 'Mar–abr', 'Mai–jun', 'Jul–ago', 'Set–out', 'Nov–dez']);
  assert.deepEqual(resumo.map((x) => x.saldo), historia.map((h) => h.mes.saldoMes));
  assert.equal(resumo[5].ficouCom, H.patrimonioDe(estado));
  assert.equal(H.mesesJogados(config, historia), 12, 'No fim dos 12 meses');
  assert.equal(fim.tipo, 'fim');
  assert.equal(fim.dados.resumo.length, 6);
  assert.equal(fim.dados.periodo.nome, 'bimestre');
  assert.equal(bloco.tipo, 'situacao');
  assert.equal(bloco.dados.periodo.noPeriodo, 'no bimestre');
  assert.equal(bloco.dados.resumo.length, 6);
  assert.equal(bloco.dados.mes.rodada, 'r6', 'a situação traz o último bimestre');
  // O placar estimado chega à tela com a marca, para ela dizer "pior caso estimado".
  assert.equal(H.piorCasoDoPlacar(placar.e3, false).estimado, true);
  assert.equal(H.escolhaOuSorte(placar.e3).estimado, true);
  assert.equal(Object.hasOwn(H.piorCasoDoPlacar({ ...placar.e3, estimado: undefined }, false), 'estimado'), false, 'placar exato: sem a marca');
});
