// O celular no esquema v2 (D-043 a D-046): o contexto da família na decisão, as
// opções sem tendência, as contas do mês na situação e no resultado, a dívida
// com os juros e a história da equipe no fim. Contratos seção 8.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { lerConfigTesteV2, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { telaDoAluno } = V.alunoLogica;
const conteudo = normalizar(V, lerConfigTesteV2());
const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
const meta = { roteiro: '60min', entradaAberta: true };

function entrada(estado, equipe, extra = {}) {
  return {
    conteudo, estado, membro: { entrouEm: 100, equipe }, meusVotos: {}, decisoesDaEquipe: null,
    resultados: null, placar: null, uid: 'eu', agora: 0, meta, ...extra,
  };
}

const rodada = (rodadaId, subfase) => ({
  geracao: 9, indice: 5, tipo: 'rodada', rodada: rodadaId, subfase, abertoEm: 200, prazo: 120_200,
  equipesTravadas: true, equipesAbertas: TODAS,
});

const MES_R1 = { trabalho: 1700, outraRenda: 0, entrou: 1700, basico: 1800, juros: 0, saldoMes: -100, dividaAntes: 0 };
const RESULTADOS = {
  r1: { e5: { decisao: 'c', origem: 'maioria', carta: 'normal', delta: { renda: -100 }, depois: { renda: -100, energia: 8, protecao: 0 }, mes: MES_R1 } },
};

test('decisão: o contexto da família da própria equipe, e as opções sem tendência', () => {
  // Act
  const lia = telaDoAluno(entrada(rodada('r1', 'decidindo'), 'e5'));
  const dani = telaDoAluno(entrada(rodada('r1', 'decidindo'), 'e2'));

  // Assert
  assert.equal(lia.tipo, 'decisao');
  assert.equal(lia.dados.contexto, 'O aluguel vence dia 10 e a geladeira está vazia.');
  assert.equal(dani.dados.contexto, null, 'persona sem contexto nesta rodada');
  assert.deepEqual(lia.dados.opcoes.map((o) => o.id), ['a', 'b', 'c', 'd']);
  for (const o of lia.dados.opcoes) assert.deepEqual(Object.keys(o).sort(), ['id', 'rotulo', 'votos'], 'a tendência não vai para a tela (D-043)');
});

test('prorrogação também leva o contexto', () => {
  // Arrange
  const estado = { ...rodada('r1', 'prorrogacao'), empatadas: { e5: { a: true, d: true } } };

  // Act
  const r = telaDoAluno(entrada(estado, 'e5'));

  // Assert
  assert.equal(r.tipo, 'prorrogacao');
  assert.equal(r.dados.contexto, 'O aluguel vence dia 10 e a geladeira está vazia.');
});

test('persona: a família, o básico da casa com os itens e a outra renda', () => {
  // Act
  const lia = telaDoAluno(entrada({ tipo: 'personas', subfase: 'ativo', indice: 4, equipesTravadas: true, equipesAbertas: TODAS }, 'e5'));
  const dani = telaDoAluno(entrada({ tipo: 'personas', subfase: 'ativo', indice: 4, equipesTravadas: true, equipesAbertas: TODAS }, 'e2'));

  // Assert
  assert.deepEqual(lia.dados.persona.familia, { descricao: 'Lia sustenta sozinha a casa com dois filhos que não trabalham.', pessoas: 3 });
  assert.equal(lia.dados.persona.basico.total, 1800);
  assert.deepEqual(lia.dados.persona.basico.itens.map((i) => [i.rotulo, i.valor]), [['aluguel', 700], ['comida', 900], ['contas', 200]]);
  assert.equal(lia.dados.persona.outraRenda, null);
  assert.deepEqual(dani.dados.persona.outraRenda, { rotulo: 'aposentadoria da mãe', valor: 600, fonte: 'valor de teste' });
});

test('situação: as contas do último mês e a dívida com os juros', () => {
  // Arrange
  const estado = { tipo: 'bloco', subfase: 'ativo', indice: 6, equipesTravadas: true, equipesAbertas: TODAS };

  // Act
  const inicio = telaDoAluno(entrada(estado, 'e5'));
  const r = telaDoAluno(entrada(estado, 'e5', { resultados: RESULTADOS }));

  // Assert
  assert.equal(inicio.dados.mes, null);
  assert.deepEqual(inicio.dados.divida, { valor: 0, jurosMes: 0.08 });
  assert.equal(r.dados.mes.decisao.id, 'c', 'os campos de antes continuam');
  assert.equal(r.dados.mes.entrou, 1700);
  assert.equal(r.dados.mes.basico, 1800);
  assert.equal(r.dados.mes.saldoMes, -100);
  assert.deepEqual(r.dados.divida, { valor: 100, jurosMes: 0.08 });
});

test('resultado: as contas do mês que acabou de ser sorteado', () => {
  // Act
  const r = telaDoAluno(entrada(rodada('r1', 'resultado'), 'e5', { resultados: RESULTADOS }));

  // Assert
  assert.equal(r.tipo, 'resultado');
  assert.deepEqual(r.dados.mes, MES_R1);
  assert.deepEqual(r.dados.divida, { valor: 100, jurosMes: 0.08 });
});

test('fim e placar final: a história da própria equipe', () => {
  // Act
  const fim = telaDoAluno(entrada({ tipo: 'fim', subfase: 'ativo', indice: 15, equipesTravadas: true, equipesAbertas: TODAS }, 'e5', { resultados: RESULTADOS }));
  const final = telaDoAluno(entrada({ tipo: 'placarFinal', subfase: 'ativo', indice: 10, equipesTravadas: true, equipesAbertas: TODAS }, 'e5', { resultados: RESULTADOS }));

  // Assert
  assert.deepEqual(fim.dados.historia, V.historia.historiaDaEquipe(conteudo, 'e5', RESULTADOS));
  assert.equal(fim.dados.historia.length, 1);
  assert.equal(fim.dados.historia[0].opcao.rotulo, '8 horas, sem pagar nada');
  assert.deepEqual(final.dados.historia, fim.dados.historia);
});
