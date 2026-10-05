// "Remover inativos" com uma votação aberta (revisão da F6a): quem já votou
// nela fica, mesmo sem sinal há mais de 2 min. A apuração da rodada conta só o
// voto de quem ainda é membro, e o celular removido volta sem direito a voto:
// remover o eleitor apagava um voto já confirmado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';

const V = await carregarNucleo();
const s = (...partes) => ['salas', SALA, ...partes].join('/');

// Sala com a rodada r1 aberta, dois alunos na e1 e um na e2.
async function rodadaAberta() {
  const sessao = montarSessao(V, { sementes: [777] });
  const { anf, indiceDe } = sessao;
  await anf.criarSala();
  const alunos = [];
  for (const [uid, eq] of [['vota', 'e1'], ['calado', 'e1'], ['outro', 'e2']]) {
    const a = sessao.novoAluno(uid);
    await a.entrar();
    await a.presenca();
    alunos.push({ a, eq });
  }
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(['e1', 'e2']);
  for (const { a, eq } of alunos) await a.escolher(eq);
  await anf.avancar(); // personas: as equipes travam
  sessao.relogio.passar(1000);
  await anf.avancar(); // rodada r1, decidindo
  return { ...sessao, alunos: Object.fromEntries(alunos.map(({ a }) => [a.uid, a])) };
}

test('com a decisão aberta, "Remover inativos" não tira quem já votou nela, e o voto conta na apuração', async () => {
  // Arrange: "vota" vota e some; "calado" some sem votar; "outro" continua ativo
  const sessao = await rodadaAberta();
  const { anf, host, relogio, alunos } = sessao;
  await alunos.vota.decidir('r1', 'e1', 'b');
  relogio.passar(130_000);
  await alunos.outro.presenca();
  // Act
  const removidos = await anf.removerInativos(120_000);
  await anf.encerrar();
  // Assert
  assert.equal(removidos, 1, 'só quem não votou sai');
  assert.deepEqual(Object.keys(await host.ler(s('membros'))).sort(), ['outro', 'vota']);
  const r = await host.ler(s('resultados', 'r1', 'e1'));
  assert.equal(r.decisao, 'b', 'o voto confirmado de quem estava sem sinal contou');
  assert.equal(r.origem, 'maioria');
});

test('depois da apuração da rodada, o eleitor continua protegido: o desfazer reabre e apura de novo', async () => {
  // Arrange
  const sessao = await rodadaAberta();
  const { anf, host, relogio, alunos } = sessao;
  await alunos.vota.decidir('r1', 'e1', 'b');
  await anf.encerrar();
  relogio.passar(130_000);
  // Act: no resultado, remove os inativos, desfaz e encerra de novo
  await anf.avancar(); // sorteio → resultado
  await anf.removerInativos(120_000);
  await anf.desfazer();
  await anf.encerrar();
  // Assert
  assert.ok(await host.ler(s('membros', 'vota')), 'o eleitor continua membro');
  assert.equal(await host.ler(s('membros', 'calado')), null, 'quem não votou saiu');
  assert.equal((await host.ler(s('resultados', 'r1', 'e1'))).decisao, 'b');
});

test('com a enquete aberta, quem já votou nela fica; sem votação aberta, sai como antes', async () => {
  // Arrange: enquete "antes" aberta, um aluno vota e os dois somem
  const sessao = montarSessao(V);
  const { anf, host, relogio } = sessao;
  await anf.criarSala();
  const votou = sessao.novoAluno('votou');
  const nao = sessao.novoAluno('nao');
  for (const a of [votou, nao]) {
    await a.entrar();
    await a.presenca();
  }
  await anf.avancar();
  const e = anf.estado();
  await votou.votar(e.enquete, e.momento, e.afirmacao, 4);
  relogio.passar(130_000);
  // Act
  const naEnquete = await anf.removerInativos(120_000);
  await anf.encerrar();
  await anf.avancar();
  const depois = await anf.removerInativos(120_000);
  // Assert
  assert.equal(naEnquete, 1);
  assert.equal(await host.ler(s('membros', 'nao')), null);
  assert.equal(depois, 1, 'fora da votação, o inativo que tinha votado sai');
  assert.equal(await host.ler(s('membros', 'votou')), null);
});
