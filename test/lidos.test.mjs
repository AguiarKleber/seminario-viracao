// [Li] "Li, pode seguir" (pedido do Kleber de 07/10; regras v5): no "Conheça o
// Jonas" e nos blocos de dados, o celular grava lidos/{uid} = o índice do passo
// que leu, a tela dele diz "Você já leu ✓" (telaDoAluno, lido) e o telão conta
// "N de M leram" (historia.contagemDeLidos). Só informa: quem avança é o
// apresentador. As travas do caminho estão em test/canal-local.test.mjs e na
// paridade do emulador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';
import { configIndividual } from './fixtures/individual.mjs';

const V = await carregarNucleo();
const A = V.alunoLogica;
const H = V.historia;
const s = (...partes) => ['salas', SALA, ...partes].join('/');
const NEGADO = /PERMISSION_DENIED/;

test('[Li] contagemDeLidos: conta quem tem o índice do passo atual, entre quem joga; o "li" de outro passo não conta', () => {
  const cfg = configIndividual(V);
  const estado = { indice: 4, equipesAbertas: { e1: true, e2: true, e3: true } };
  const membros = {
    a: { entrouEm: 1, equipe: 'e1' }, b: { entrouEm: 1, equipe: 'e2' }, c: { entrouEm: 1, equipe: 'e3' },
    semVaga: { entrouEm: 1 },
  };
  const lidos = { a: 4, b: 3, semVaga: 4, fantasma: 4 };
  assert.deepEqual(H.contagemDeLidos(cfg, { estado, membros, lidos }), { leram: 1, total: 3 });
  // Quem sumiu sem ler sai do M; quem leu e sumiu continua contando.
  assert.deepEqual(H.contagemDeLidos(cfg, { estado, membros, lidos, ativos: new Set(['b']) }), { leram: 1, total: 2 });
  // Sem equipesAbertas (antes das equipes), todo membro conta.
  assert.deepEqual(H.contagemDeLidos(cfg, { estado: { indice: 4 }, membros, lidos }), { leram: 2, total: 4 });
  assert.deepEqual(H.contagemDeLidos(cfg, {}), { leram: 0, total: 0 });
});

test('[Li] telaDoAluno: com o meuLido, o "Conheça o Jonas" e o bloco dizem se este aparelho leu o passo atual; sem ele, a tela é a de antes', async () => {
  // Arrange: a sala individual, um aluno com vaga, no "Conheça o Jonas".
  const sessao = montarSessao(V, { config: configIndividual(V) });
  const { anf, relogio } = sessao;
  await anf.criarSala();
  const a = sessao.novoAluno('a');
  await a.entrar();
  await anf.atribuirVagas();
  await anf.avancar(); // personas
  const indice = anf.estado().indice;
  const tela = async (extra) => A.telaDoAluno({ ...(await a.entradaDaTela()), ...extra });

  // Act + Assert: personas
  assert.equal(Object.hasOwn((await tela({})).dados, 'lido'), false);
  assert.equal((await tela({ meuLido: null })).dados.lido, false);
  await a.canal.gravar({ [s('lidos', 'a')]: indice });
  const meuLido = await a.canal.ler(s('lidos', 'a'));
  assert.equal((await tela({ meuLido })).tipo, 'persona');
  assert.equal((await tela({ meuLido })).dados.lido, true);

  // O bloco depois da rodada: o "li" do Jonas não vale aqui.
  relogio.passar(1000);
  await anf.avancar(); // r1
  await anf.encerrar();
  await anf.avancar(); // bloco
  assert.equal((await tela({ meuLido })).tipo, 'situacao');
  assert.equal((await tela({ meuLido })).dados.lido, false);
  await a.canal.gravar({ [s('lidos', 'a')]: anf.estado().indice });
  assert.equal((await tela({ meuLido: await a.canal.ler(s('lidos', 'a')) })).dados.lido, true);
});

test('[Li] na sala: cada um grava o próprio "li", o telão conta "N de M leram", e o passo seguinte começa do zero', async () => {
  // Arrange: 4 alunos com vaga, no "Conheça o Jonas".
  const sessao = montarSessao(V, { config: configIndividual(V) });
  const { anf, host, config } = sessao;
  await anf.criarSala();
  const alunos = ['a', 'b', 'c', 'd'].map((u) => sessao.novoAluno(u));
  for (const al of alunos) await al.entrar();
  await anf.atribuirVagas();
  await anf.avancar(); // personas
  const conta = async () => H.contagemDeLidos(config, {
    estado: anf.estado(), membros: await host.ler(s('membros')), lidos: await host.ler(s('lidos')),
  });

  // Act + Assert
  assert.deepEqual(await conta(), { leram: 0, total: 4 });
  await alunos[0].canal.gravar({ [s('lidos', 'a')]: anf.estado().indice });
  await alunos[1].canal.gravar({ [s('lidos', 'b')]: anf.estado().indice });
  assert.deepEqual(await conta(), { leram: 2, total: 4 });
  await assert.rejects(alunos[2].canal.gravar({ [s('lidos', 'c')]: anf.estado().indice + 1 }), NEGADO, 'o passo seguinte, ainda não');
  await assert.rejects(alunos[2].canal.gravar({ [s('lidos', 'd')]: anf.estado().indice }), NEGADO, 'em nome de outro');
  await anf.avancar(); // r1: o "li" do Jonas não conta mais
  assert.deepEqual(await conta(), { leram: 0, total: 4 });
  await assert.rejects(alunos[2].canal.gravar({ [s('lidos', 'c')]: anf.estado().indice - 1 }), NEGADO, 'o "li" atrasado');
});
