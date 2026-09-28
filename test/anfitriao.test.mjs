// O anfitrião sobre o canal-local, com as travas das regras ligadas: a sessão
// inteira com 20 alunos, o fechamento em duas fases, empate, piloto, decisão do
// apresentador, desfazer, dois anfitriões e o "antes" pulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, configDaSessao, SALA, HOST } from './fixtures/sessao.mjs';

const V = await carregarNucleo();
const s = (...partes) => ['salas', SALA, ...partes].join('/');
const NEGADO = /PERMISSION_DENIED/;

// Sala criada, alunos distribuídos à mão e a rodada r1 aberta (índice 5 do
// roteiro de teste). porEquipe = { e1: 2, e2: 1 } cria 2 alunos na e1 e 1 na e2.
async function prepararRodada({ porEquipe, travas = true, sementes } = {}) {
  const sessao = montarSessao(V, { travas, sementes });
  const { anf, indiceDe } = sessao;
  await anf.criarSala();
  const alunos = {};
  for (const [eq, n] of Object.entries(porEquipe)) {
    alunos[eq] = [];
    for (let i = 0; i < n; i += 1) {
      const a = sessao.novoAluno(`u-${eq}-${i}`);
      await a.entrar();
      await a.presenca();
      alunos[eq].push(a);
    }
  }
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(Object.keys(porEquipe));
  for (const [eq, lista] of Object.entries(alunos)) for (const a of lista) await a.escolher(eq);
  await anf.avancar(); // personas: as equipes travam
  sessao.relogio.passar(1000);
  await anf.avancar(); // rodada r1, decidindo
  assert.equal(anf.estado().subfase, 'decidindo');
  return { ...sessao, alunos };
}

const lerResultados = (sessao, r) => sessao.host.ler(s('resultados', r));

// Outra instância de anfitrião sobre a mesma sala (outra aba, outra máquina, ou
// um canal adulterado pelo teste).
function outroAnfitriao(sessao, canal, gerarSemente = () => 5) {
  return V.anfitriao.criar({
    canal, config: sessao.config, sala: SALA, nomeRoteiro: '60min', agora: sessao.relogio.agora, uid: HOST, gerarSemente,
  });
}

test('sessão inteira com 20 alunos, do lobby ao fim, sobre o canal-local com travas', async () => {
  // Arrange
  const sessao = montarSessao(V, { sementes: [111, 222, 333] });
  const { anf, host, relogio, config } = sessao;
  const M = V.motor;
  const A = V.alunoLogica;
  const alunos = Array.from({ length: 20 }, (_, i) => sessao.novoAluno(`aluno${String(i).padStart(2, '0')}`));
  const tela = async (a, votadas) => A.telaDoAluno(await a.entradaDaTela(votadas));
  const confirmados = {};
  async function votarTodos(enquete, momento, afirmacao, valorDe) {
    for (const [i, a] of alunos.entries()) {
      await a.votar(enquete, momento, afirmacao, valorDe(i));
      confirmados[`${enquete}/${momento}/${afirmacao}`] = (confirmados[`${enquete}/${momento}/${afirmacao}`] || 0) + 1;
    }
  }

  // Act + Assert: lobby
  await anf.criarSala();
  for (const a of alunos) {
    await a.entrar();
    await a.presenca();
  }
  assert.equal((await tela(alunos[0])).tipo, 'aguardando');
  assert.equal((await host.ler(s('meta'))).hostUid, HOST);

  // Enquete "antes", uma afirmação por vez
  await anf.avancar();
  assert.deepEqual([anf.estado().tipo, anf.estado().afirmacao], ['enquete', 'a1']);
  assert.equal((await tela(alunos[0], [['entrada', 'antes']])).tipo, 'enquete');
  const antes = { a1: (i) => 1 + (i % 5), a2: (i) => 5 - (i % 5), a3: (i) => 1 + (i % 3) };
  for (const [idx, a] of ['a1', 'a2', 'a3'].entries()) {
    await votarTodos('entrada', 'antes', a, antes[a]);
    relogio.passar(10_000);
    if (idx < 2) await anf.avancar();
  }
  assert.equal((await tela(alunos[0], [['entrada', 'antes']])).tipo, 'enqueteRegistrada');
  await anf.encerrar();
  const apuracaoAntes = await host.ler(s('enquetes', 'entrada', 'antes'));
  assert.equal(anf.estado().subfase, 'apurada');
  assert.equal(apuracaoAntes.metodo, 'celular');
  for (const a of ['a1', 'a2', 'a3']) assert.equal(apuracaoAntes.n[a], confirmados[`entrada/antes/${a}`], `confirmados = contados em ${a}`);
  assert.deepEqual(apuracaoAntes.histogramas.a1, [4, 4, 4, 4, 4]);

  // Bloco antes das equipes: o celular só pede para acompanhar
  await anf.avancar();
  assert.deepEqual(await tela(alunos[3]), { tipo: 'aguardando', dados: { motivo: 'apresentacao', titulo: 'Abertura' } });

  // Formar equipes: 18 escolhem pelo "me coloque", 2 não escolhem a tempo
  await anf.avancar();
  await anf.definirEquipesAbertas(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
  assert.equal((await tela(alunos[0])).tipo, 'escolherEquipe');
  for (const a of alunos.slice(0, 18)) {
    const membros = await a.canal.ler(s('membros'));
    await a.escolher(A.sugerirEquipe(config, { membros, equipesAbertas: anf.estado().equipesAbertas }));
  }
  await anf.avancar(); // personas: trava e distribui os atrasados
  const membros = await host.ler(s('membros'));
  const equipeDe = Object.fromEntries(alunos.map((a) => [a.uid, membros[a.uid].equipe]));
  const tamanho = (eq) => Object.values(equipeDe).filter((x) => x === eq).length;
  assert.deepEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].map(tamanho), [4, 4, 3, 3, 3, 3]);
  assert.equal(anf.estado().equipesTravadas, true);
  await assert.rejects(alunos[0].escolher('e6'), NEGADO);
  const telaPersona = await tela(alunos[0]);
  assert.equal(telaPersona.tipo, 'persona');
  assert.equal(telaPersona.dados.persona.id, config.equipes[equipeDe[alunos[0].uid]].persona);

  // Três rodadas intercaladas com blocos
  const escolhas = {
    r1: { e1: 'a', e2: 'b', e3: 'c', e4: 'a', e5: 'b' }, // e6 não vota: piloto
    r2: { e1: 'b', e2: 'a', e3: 'a', e4: 'c', e5: 'b', e6: 'a' },
    r3: { e1: 'c', e2: 'a', e3: 'b', e4: 'c', e5: 'a', e6: 'c' },
  };
  const estadoEquipe = Object.fromEntries(config.ordem.equipes.map((eq) => [eq, M.estadoInicial(config, eq)]));
  const jogadas = Object.fromEntries(config.ordem.equipes.map((eq) => [eq, []]));
  const sementes = { r1: 111, r2: 222, r3: 333 };
  let blocosComSituacao = 0;
  for (const r of ['r1', 'r2', 'r3']) {
    if (anf.estado().tipo !== 'rodada') await anf.avancar();
    assert.deepEqual([anf.estado().tipo, anf.estado().rodada, anf.estado().subfase], ['rodada', r, 'decidindo']);
    for (const a of alunos) {
      const op = escolhas[r][equipeDe[a.uid]];
      if (op) await a.decidir(r, equipeDe[a.uid], op);
    }
    const telaDecisao = await tela(alunos[0]);
    assert.equal(telaDecisao.tipo, 'decisao');
    assert.equal(telaDecisao.dados.opcoes.find((o) => o.id === escolhas[r][equipeDe[alunos[0].uid]]).votos, 4);
    relogio.passar(30_000);
    await anf.encerrar();
    assert.equal(anf.estado().subfase, 'sorteio');
    assert.equal((await tela(alunos[0])).tipo, 'sorteando');
    const resultados = await lerResultados(sessao, r);
    // Conferência independente: o motor, com a mesma semente, dá o mesmo resultado.
    for (const eq of config.ordem.equipes) {
      const decisao = escolhas[r][eq] ?? config.rodadas[r].padrao;
      const esperado = M.resolverRodada(config, { equipeId: eq, rodadaId: r, opcaoId: decisao, estado: estadoEquipe[eq], semente: sementes[r] });
      assert.equal(resultados[eq].decisao, decisao, `${r}/${eq}`);
      assert.equal(resultados[eq].origem, escolhas[r][eq] ? 'maioria' : 'piloto');
      assert.equal(resultados[eq].carta, esperado.carta);
      assert.deepEqual(resultados[eq].depois, esperado.depois);
      estadoEquipe[eq] = esperado.depois;
      jogadas[eq].push({ rodadaId: r, opcaoId: decisao, cartaId: esperado.carta });
    }
    await anf.avancar();
    const telaResultado = await tela(alunos[0]);
    assert.equal(telaResultado.tipo, 'resultado');
    assert.equal(telaResultado.dados.carta.id, resultados[equipeDe[alunos[0].uid]].carta);
    await anf.avancar();
    if (anf.estado().tipo === 'bloco') {
      // Entre as rodadas, o celular mostra a situação da persona (D-006).
      blocosComSituacao += 1;
      const situacao = await tela(alunos[5]);
      const eq = equipeDe[alunos[5].uid];
      assert.equal(situacao.tipo, 'situacao');
      assert.equal(situacao.dados.indicadores.find((i) => i.id === 'renda').valor, estadoEquipe[eq].renda);
      assert.deepEqual(situacao.dados.narrativa, [
        `Escolhi: ${config.rodadas[r].opcoes[resultados[eq].decisao].rotulo}.`,
        `Aconteceu: ${config.cartas[resultados[eq].carta].titulo}.`,
      ]);
    }
  }

  // Placar final: a decomposição gravada bate com a do motor
  assert.equal(blocosComSituacao, 2, 'os blocos depois de r1 e de r2');
  assert.equal(anf.estado().tipo, 'placarFinal');
  const placar = await host.ler(s('placar'));
  for (const eq of config.ordem.equipes) {
    const d = M.decompor(config, { equipeId: eq, rodadas: jogadas[eq] });
    assert.equal(placar[eq].renda, d.realizado);
    assert.equal(placar[eq].piloto, d.esperadoPiloto);
    assert.equal(placar[eq].efeitoDecisoes, d.efeitoDecisoes);
    assert.equal(placar[eq].sorte, d.sorte);
    assert.equal(placar[eq].piorCaso, d.piorCaso);
    assert.equal(placar[eq].ativa, true);
  }
  const telaFinal = await tela(alunos[0]);
  assert.equal(telaFinal.tipo, 'situacao');
  assert.equal(telaFinal.dados.final, true);

  // Debrief, termômetro (todas as afirmações abertas) e o "depois"
  await anf.avancar();
  await anf.avancar();
  assert.deepEqual([anf.estado().enquete, anf.estado().afirmacao], ['termometro', '*']);
  await votarTodos('termometro', 'unico', 't1', () => 4);
  await votarTodos('termometro', 'unico', 't2', (i) => (i < 10 ? 2 : 5));
  await anf.encerrar();
  assert.deepEqual((await host.ler(s('enquetes', 'termometro', 'unico'))).histogramas.t2, [0, 10, 0, 0, 10]);
  await anf.avancar();
  const depois = { a1: (i) => Math.max(1, antes.a1(i) - 1), a2: antes.a2, a3: (i) => Math.min(5, antes.a3(i) + 1) };
  for (const [idx, a] of ['a1', 'a2', 'a3'].entries()) {
    await votarTodos('entrada', 'depois', a, depois[a]);
    if (idx < 2) await anf.avancar();
  }
  await anf.encerrar();
  const apuracaoDepois = await host.ler(s('enquetes', 'entrada', 'depois'));
  assert.equal(apuracaoDepois.transicao.a1.pares, 20);
  assert.equal(apuracaoDepois.transicao.a2.igual, 20);
  assert.equal(apuracaoDepois.transicao.a3.mais + apuracaoDepois.transicao.a3.igual, 20);

  // Comparativo e fim
  await anf.avancar();
  assert.equal(anf.estado().tipo, 'comparativo');
  const comparar = V.enquete.podeComparar(apuracaoAntes, apuracaoDepois, config.regras.minPareados);
  assert.equal(comparar.caso, 'pareado');
  const telaComparativo = await tela(alunos[7], [['entrada', 'antes'], ['entrada', 'depois']]);
  assert.equal(telaComparativo.tipo, 'comparativo');
  assert.deepEqual(telaComparativo.dados.afirmacoes[0], { id: 'a1', texto: config.enquetes.entrada.afirmacoes.a1.texto, antes: antes.a1(7), depois: depois.a1(7) });
  await anf.avancar();
  assert.equal((await tela(alunos[0])).tipo, 'fim');
  await assert.rejects(anf.avancar(), /Fim do roteiro/);

  // Exportação só de agregados, e a sala apagada no fim (D-015)
  const totais = await anf.exportarTotais();
  const texto = JSON.stringify(totais);
  for (const a of alunos) assert.equal(texto.includes(a.uid), false, `o uid ${a.uid} vazou na exportação`);
  assert.equal(texto.includes(HOST), false);
  assert.equal(totais.participantes, 20);
  assert.deepEqual(totais.enquetes.entrada.antes.histogramas.a1, [4, 4, 4, 4, 4]);
  assert.equal(totais.placar.e1.renda, placar.e1.renda);
  await anf.apagarSala();
  assert.equal(await sessao.canal.comoUsuario('qualquer').ler(s('meta')), null);
});

test('fechamento em duas fases: voto confirmado antes do "fechando" conta; voto entre o "fechando" e a leitura é recusado e não conta', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 3 } });
  const [a0, a1, a2] = sessao.alunos.e1;
  await a0.decidir('r1', 'e1', 'a');
  await a1.decidir('r1', 'e1', 'b');
  let recusaDoAtrasado = null;
  let recusaDoNovo = null;
  const espiao = {
    ...sessao.host,
    async ler(caminho) {
      // Entre a fase 1 ("fechando" confirmado) e a leitura dos votos.
      if (caminho === s('decisoes', 'r1')) {
        await a1.decidir('r1', 'e1', 'a').catch((e) => { recusaDoAtrasado = e; });
        await a2.decidir('r1', 'e1', 'b').catch((e) => { recusaDoNovo = e; });
      }
      return sessao.host.ler(caminho);
    },
  };
  const anfEspiao = outroAnfitriao(sessao, espiao, () => 7);
  await anfEspiao.carregarSala();
  // Act
  await anfEspiao.encerrar();
  // Assert
  assert.match(String(recusaDoAtrasado), NEGADO);
  assert.match(String(recusaDoNovo), NEGADO);
  // a/b empatados em 1 × 1: os dois votos de antes contaram, os de depois não.
  assert.equal(anfEspiao.estado().subfase, 'prorrogacao');
  assert.deepEqual(anfEspiao.estado().empatadas, { e1: { a: true, b: true } });
  assert.deepEqual(await sessao.host.ler(s('decisoes', 'r1', 'e1')), { 'u-e1-0': 'a', 'u-e1-1': 'b' });
});

test('empate: prorrogação só para a equipe empatada e, sem mudança, moeda com a semente gravada', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 2, e2: 1 }, sementes: [2024] });
  const { anf, alunos, config } = sessao;
  await alunos.e1[0].decidir('r1', 'e1', 'a');
  await alunos.e1[1].decidir('r1', 'e1', 'b');
  await alunos.e2[0].decidir('r1', 'e2', 'c');
  // Act
  await anf.encerrar();
  const naProrrogacao = anf.estado();
  const votoDeOutraEquipe = alunos.e2[0].decidir('r1', 'e2', 'a');
  const opcaoNaoEmpatada = alunos.e1[0].decidir('r1', 'e1', 'c');
  await assert.rejects(votoDeOutraEquipe, NEGADO);
  await assert.rejects(opcaoNaoEmpatada, NEGADO);
  const resultadosNaProrrogacao = await sessao.host.ler(s('resultados', 'r1'));
  const telaEmpatado = V.alunoLogica.telaDoAluno(await alunos.e1[0].entradaDaTela());
  const telaOutra = V.alunoLogica.telaDoAluno(await alunos.e2[0].entradaDaTela());
  await anf.encerrar();
  // Assert
  assert.equal(naProrrogacao.subfase, 'prorrogacao');
  assert.equal(naProrrogacao.prazo, sessao.relogio.agora() + config.tempos.prorrogacaoSeg * 1000);
  assert.deepEqual(naProrrogacao.empatadas, { e1: { a: true, b: true } });
  assert.equal(resultadosNaProrrogacao, null, 'com empate, nenhum resultado é gravado ainda');
  assert.equal(telaEmpatado.tipo, 'prorrogacao');
  assert.deepEqual(telaEmpatado.dados.opcoes.map((o) => o.id), ['a', 'b']);
  assert.equal(telaOutra.tipo, 'aguardando');
  const resultados = await lerResultados(sessao, 'r1');
  const moeda = V.motor.consolidarDecisao(config, {
    rodadaId: 'r1', votos: { x: 'a', y: 'b' }, aposProrrogacao: true, semente: 2024, equipeId: 'e1',
  });
  assert.equal(resultados.e1.origem, 'moeda');
  assert.equal(resultados.e1.decisao, moeda.decisao);
  assert.equal(resultados.e2.origem, 'maioria');
  assert.equal(anf.estado().subfase, 'sorteio');
  assert.equal(anf.estado().empatadas, null);
});

test('empate desfeito na prorrogação: vale a maioria, com origem "prorrogacao"', async () => {
  // Arrange
  const { anf, alunos, host } = await prepararRodada({ porEquipe: { e1: 2 } });
  await alunos.e1[0].decidir('r1', 'e1', 'a');
  await alunos.e1[1].decidir('r1', 'e1', 'b');
  await anf.encerrar();
  // Act
  await alunos.e1[1].decidir('r1', 'e1', 'a');
  await anf.encerrar();
  // Assert
  const r = await host.ler(s('resultados', 'r1', 'e1'));
  assert.deepEqual([r.decisao, r.origem, r.contagem], ['a', 'prorrogacao', { a: 2, b: 0, c: 0 }]);
});

test('piloto: equipe sem nenhum voto fica no padrão da rodada', async () => {
  // Arrange
  const { anf, host, config } = await prepararRodada({ porEquipe: { e1: 2, e3: 1 } });
  // Act
  await anf.encerrar();
  // Assert
  const resultados = await host.ler(s('resultados', 'r1'));
  for (const eq of ['e1', 'e3']) assert.deepEqual([resultados[eq].decisao, resultados[eq].origem], [config.rodadas.r1.padrao, 'piloto']);
  assert.equal(resultados.e2, undefined, 'equipe fechada não joga');
  const placar = await host.ler(s('placar'));
  assert.equal(placar.e2.ativa, false);
  assert.equal(placar.e1.ativa, true);
});

test('decisão do apresentador vence os votos da equipe, e pode ser desfeita com null', async () => {
  // Arrange
  const { anf, alunos, host } = await prepararRodada({ porEquipe: { e1: 2, e2: 2 } });
  for (const a of [...alunos.e1, ...alunos.e2]) await a.decidir('r1', a.uid.split('-')[1], 'b');
  // Act
  await anf.decidirPorEquipe('e1', 'a');
  await anf.decidirPorEquipe('e2', 'c');
  await anf.decidirPorEquipe('e2', null);
  await anf.encerrar();
  // Assert
  const resultados = await host.ler(s('resultados', 'r1'));
  assert.deepEqual([resultados.e1.decisao, resultados.e1.origem], ['a', 'apresentador']);
  assert.deepEqual([resultados.e2.decisao, resultados.e2.origem], ['b', 'maioria']);
  await assert.rejects(anf.decidirPorEquipe('e1', 'a'), /decisão aberta/);
});

test('voto de quem não é da equipe, ou de quem entrou depois da abertura, é recusado pela trava e ignorado na apuração', async () => {
  // Arrange: com travas, a regra recusa
  const comTrava = await prepararRodada({ porEquipe: { e1: 1, e2: 1 } });
  await assert.rejects(comTrava.alunos.e2[0].decidir('r1', 'e1', 'a'), NEGADO);
  comTrava.relogio.passar(1);
  const tardio = comTrava.novoAluno('tardio');
  await tardio.entrar();
  await comTrava.host.gravar({ [s('membros', 'tardio', 'equipe')]: 'e1' });
  await assert.rejects(tardio.decidir('r1', 'e1', 'a'), NEGADO);
  // Arrange: sem travas (as regras falharam), a apuração filtra mesmo assim
  const semTrava = await prepararRodada({ porEquipe: { e1: 1, e2: 1 }, travas: false });
  await semTrava.alunos.e1[0].decidir('r1', 'e1', 'b');
  await semTrava.alunos.e2[0].decidir('r1', 'e1', 'a');
  semTrava.relogio.passar(1);
  const intruso = semTrava.novoAluno('intruso');
  await intruso.entrar();
  await semTrava.host.gravar({ [s('membros', 'intruso', 'equipe')]: 'e1' });
  await intruso.decidir('r1', 'e1', 'a');
  // Act
  await semTrava.anf.encerrar();
  // Assert
  const r = await semTrava.host.ler(s('resultados', 'r1', 'e1'));
  assert.deepEqual([r.decisao, r.origem, r.contagem], ['b', 'maioria', { a: 0, b: 1, c: 0 }]);
});

test('desfazer apaga resultado e placar, nunca a semente; refazer tira a mesma carta', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 1, e2: 1, e3: 1 }, sementes: [987654321] });
  const { anf, alunos, host, geradas } = sessao;
  await alunos.e1[0].decidir('r1', 'e1', 'a');
  await anf.encerrar();
  const primeiro = await host.ler(s('resultados', 'r1'));
  // Act
  await anf.desfazer();
  const depoisDoDesfazer = {
    estado: anf.estado(), resultados: await host.ler(s('resultados', 'r1')),
    placar: await host.ler(s('placar')), semente: await host.ler(s('sementes', 'r1')),
  };
  await anf.encerrar();
  // Assert
  assert.equal(depoisDoDesfazer.estado.subfase, 'decidindo');
  assert.equal(depoisDoDesfazer.resultados, null);
  assert.equal(depoisDoDesfazer.placar, null);
  assert.equal(depoisDoDesfazer.semente, 987654321);
  assert.deepEqual(geradas, [987654321], 'a semente foi gerada uma vez só');
  assert.deepEqual(await host.ler(s('resultados', 'r1')), primeiro);
  await assert.rejects(host.gravar({ [s('sementes', 'r1')]: null }), NEGADO);
});

test('desfazer reabre a enquete apurada; fora de uma apuração, não há o que desfazer', async () => {
  // Arrange
  const sessao = montarSessao(V);
  const { anf, host } = sessao;
  await anf.criarSala();
  await assert.rejects(anf.desfazer(), /Nada para desfazer/);
  const a = sessao.novoAluno('a');
  await a.entrar();
  await anf.avancar();
  await a.votar('entrada', 'antes', 'a1', 2);
  await anf.encerrar();
  // Act
  await anf.desfazer();
  await a.votar('entrada', 'antes', 'a1', 5);
  await anf.encerrar();
  // Assert
  assert.deepEqual((await host.ler(s('enquetes', 'entrada', 'antes'))).histogramas.a1, [0, 0, 0, 0, 1]);
});

test('dois anfitriões disputando o estado: o segundo perde o compare-and-swap e nada se corrompe', async () => {
  // Arrange
  const sessao = montarSessao(V);
  const { anf: a, host } = sessao;
  await a.criarSala();
  const b = outroAnfitriao(sessao, sessao.canal.comoUsuario(HOST));
  await b.carregarSala();
  // Act: os dois apertam "avançar" no mesmo instante
  const [ra, rb] = await Promise.allSettled([a.avancar(), b.avancar()]);
  // Assert
  assert.equal(ra.status, 'fulfilled');
  assert.equal(rb.status, 'rejected');
  assert.match(String(rb.reason), /CONFLITO/);
  const estado = await host.ler(s('estado'));
  assert.deepEqual([estado.geracao, estado.indice], [2, 1]);
  assert.equal(b.estado().geracao, 2, 'o perdedor passa a enxergar o estado atual');

  // Act: um anfitrião com estado velho tenta avançar depois
  await a.avancar(); // enquete "uma_por_vez" aberta: vai para a afirmação a2
  const c = outroAnfitriao(sessao, sessao.canal.comoUsuario(HOST));
  await c.carregarSala();
  await a.avancar();
  // Assert
  await assert.rejects(c.avancar(), /CONFLITO/);
  const final = await host.ler(s('estado'));
  assert.equal(final.geracao, a.estado().geracao);
  assert.equal(final.afirmacao, 'a3');
});

test('o telão que cai durante o "fechando" é substituído: outra instância conclui a apuração', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 1 } });
  await sessao.alunos.e1[0].decidir('r1', 'e1', 'b');
  const canalQueCai = {
    ...sessao.host,
    async ler(caminho) {
      if (caminho.includes('/sementes/')) throw new Error('rede caiu');
      return sessao.host.ler(caminho);
    },
  };
  const telaoQueCai = outroAnfitriao(sessao, canalQueCai);
  const reserva = outroAnfitriao(sessao, sessao.canal.comoUsuario(HOST));
  await telaoQueCai.carregarSala();
  // Act
  await assert.rejects(telaoQueCai.encerrar(), /rede caiu/);
  const noMeio = await sessao.host.ler(s('estado'));
  await reserva.carregarSala();
  await reserva.encerrar();
  // Assert
  assert.equal(noMeio.subfase, 'fechando');
  assert.equal(reserva.estado().subfase, 'sorteio');
  assert.equal((await sessao.host.ler(s('resultados', 'r1', 'e1'))).decisao, 'b');
});

test('nada fecha sozinho pelo tempo: o prazo só corta o voto, e "+30 s" reabre', async () => {
  // Arrange
  const { anf, alunos, relogio, config } = await prepararRodada({ porEquipe: { e1: 1 } });
  // Act
  relogio.passar((config.tempos.decisaoSeg + config.tempos.gracaSeg) * 1000 + 60 * 60 * 1000);
  const recusado = alunos.e1[0].decidir('r1', 'e1', 'a');
  // Assert
  await assert.rejects(recusado, NEGADO);
  assert.equal(anf.estado().subfase, 'decidindo');
  await anf.maisTempo(30);
  assert.equal(anf.estado().prazo, relogio.agora() + 30_000);
  await alunos.e1[0].decidir('r1', 'e1', 'a');
});

test('pausar congela a votação e guarda o que faltava; retomar devolve o prazo', async () => {
  // Arrange
  const { anf, alunos, relogio, config } = await prepararRodada({ porEquipe: { e1: 1 } });
  relogio.passar(10_000);
  const faltava = anf.estado().prazo - relogio.agora();
  // Act
  await anf.pausar();
  const pausado = anf.estado();
  const votoNaPausa = alunos.e1[0].decidir('r1', 'e1', 'a');
  await assert.rejects(votoNaPausa, NEGADO);
  const tela = V.alunoLogica.telaDoAluno(await alunos.e1[0].entradaDaTela());
  relogio.passar(120_000);
  await anf.maisTempo(10);
  await anf.retomar();
  // Assert
  assert.deepEqual([pausado.prazo, pausado.restanteMs], [undefined, faltava]);
  assert.equal(tela.dados.pausado, true);
  assert.equal(anf.estado().prazo, relogio.agora() + faltava + 10_000);
  assert.equal(config.tempos.decisaoSeg * 1000 - 10_000, faltava);
  await alunos.e1[0].decidir('r1', 'e1', 'a');
});

test('avançar nunca fecha votação, e o "Pular para…" só vai para a frente e com a votação encerrada', async () => {
  // Arrange
  const { anf, indiceDe } = await prepararRodada({ porEquipe: { e1: 1 } });
  // Act + Assert
  await assert.rejects(anf.avancar(), /encerrar/);
  await assert.rejects(anf.pularPara(indiceDe('fim')), /Encerre/);
  await anf.encerrar();
  await assert.rejects(anf.pularPara(0), /só vai para a frente/);
  await assert.rejects(anf.pularPara(99), RangeError);
  await anf.pularPara(indiceDe('placarFinal'));
  assert.equal(anf.estado().tipo, 'placarFinal');
});

test('enquete "antes" pulada: o comparativo recusa com "Sem medição de entrada."', async () => {
  // Arrange
  const sessao = montarSessao(V);
  const { anf, host, indiceDe, config } = sessao;
  await anf.criarSala();
  const alunos = ['a', 'b', 'c'].map((u) => sessao.novoAluno(u));
  for (const a of alunos) await a.entrar();
  // Act: pula a enquete opcional, direto para o bloco
  await anf.pularPara(indiceDe('bloco'));
  await anf.pularPara(indiceDe('enquete', { momento: 'depois' }));
  for (const [i, af] of ['a1', 'a2', 'a3'].entries()) {
    for (const a of alunos) await a.votar('entrada', 'depois', af, 3);
    if (i < 2) await anf.avancar();
  }
  await anf.encerrar();
  await anf.avancar();
  // Assert
  assert.equal(anf.estado().tipo, 'comparativo');
  const antes = await host.ler(s('enquetes', 'entrada', 'antes'));
  const depois = await host.ler(s('enquetes', 'entrada', 'depois'));
  assert.equal(antes, null);
  assert.deepEqual(depois.transicao.a1, { matriz: depois.transicao.a1.matriz, pares: 0, mais: 0, igual: 0, menos: 0, soAntes: 0, soDepois: 3 });
  const r = V.enquete.podeComparar(antes, depois, config.regras.minPareados);
  assert.deepEqual(r, { comparar: false, caso: 'sem_antes', motivo: 'Sem medição de entrada.' });
});

test('contagem manual (offline): a apuração grava metodo "manual" e ignora voto de celular', async () => {
  // Arrange
  const sessao = montarSessao(V);
  const { anf, host, indiceDe } = sessao;
  await anf.criarSala();
  const a = sessao.novoAluno('a');
  await a.entrar();
  await anf.pularPara(indiceDe('enquete', { enquete: 'termometro' }));
  await a.votar('termometro', 'unico', 't1', 5);
  // Act
  await anf.contagemManual('t1', [1, 2, 3, 4, 5]);
  await assert.rejects(anf.contagemManual('t1', [1, 2, 3]), TypeError);
  await assert.rejects(anf.contagemManual('zz', [0, 0, 0, 0, 0]), /inexistente/);
  await anf.encerrar();
  // Assert
  const ap = await host.ler(s('enquetes', 'termometro', 'unico'));
  assert.equal(ap.metodo, 'manual');
  assert.deepEqual(ap.histogramas, { t1: [1, 2, 3, 4, 5], t2: [0, 0, 0, 0, 0] });
  assert.deepEqual(ap.n, { t1: 15, t2: 0 });
});

test('atrasado depois da trava é distribuído pelo telão; inativos são removidos', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 3, e2: 2 } });
  const { anf, host, relogio } = sessao;
  relogio.passar(1000);
  const atrasado = sessao.novoAluno('atrasado');
  await atrasado.entrar();
  await atrasado.presenca();
  // Act
  const distribuidos = await anf.distribuirAtrasados();
  // Assert
  assert.equal(distribuidos, 1);
  assert.equal((await host.ler(s('membros', 'atrasado'))).equipe, 'e2', 'a e2 estava abaixo do alvo de 3');
  // Act: 2 min depois, só o atrasado renova a presença
  relogio.passar(120_000);
  await atrasado.presenca();
  const removidos = await anf.removerInativos(60_000);
  // Assert
  assert.equal(removidos, 5);
  assert.deepEqual(Object.keys(await host.ler(s('membros'))), ['atrasado']);
  await assert.rejects(anf.moverMembro('sumiu', 'e1'), /não encontrado/);
  await anf.moverMembro('atrasado', 'e1');
  assert.equal((await host.ler(s('membros', 'atrasado'))).equipe, 'e1');
});

test('abrir e fechar a entrada; criar a sala de novo por cima é recusado', async () => {
  // Arrange
  const sessao = montarSessao(V);
  const { anf } = sessao;
  await anf.criarSala();
  // Act
  await anf.abrirEntrada(false);
  const barrado = sessao.novoAluno('b').entrar();
  // Assert
  await assert.rejects(barrado, NEGADO);
  await assert.rejects(anf.criarSala(), /já existe/);
  await anf.abrirEntrada(true);
  await sessao.novoAluno('c').entrar();
});

// ---------- Achados da revisão adversarial de 28/09 ----------

// O PIN existe só no console do Firebase (privado/pinApresentador), que nenhuma
// conta escreve. O teste o semeia por fora das travas, com exportar/importar.
const PIN = 'pin-de-teste-01';
function semearPin(canal) {
  const arvore = canal.exportar();
  arvore.privado = { pinApresentador: PIN };
  canal.importar(arvore);
}

function anfitriaoComo(sessao, uid, { canal = sessao.canal.comoUsuario(uid), nomeRoteiro = '60min', config = sessao.config, gerarSemente = () => 5 } = {}) {
  return V.anfitriao.criar({ canal, config, sala: SALA, nomeRoteiro, agora: sessao.relogio.agora, uid, gerarSemente });
}

test('outra máquina assume a sala com o PIN no meio da decisão e conclui a apuração (R6)', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 2 } });
  for (const a of sessao.alunos.e1) await a.decidir('r1', 'e1', 'a');
  semearPin(sessao.canal);
  const semPin = anfitriaoComo(sessao, 'intruso');
  const canalNovo = sessao.canal.comoUsuario('uid-novo-notebook');
  await canalNovo.gravar({ 'pedidosAnfitriao/uid-novo-notebook': PIN });
  const reserva = anfitriaoComo(sessao, 'uid-novo-notebook', { canal: canalNovo });
  // Act
  await assert.rejects(semPin.carregarSala(), NEGADO);
  await reserva.carregarSala();
  await reserva.encerrar();
  // Assert
  assert.equal((await sessao.host.ler(s('meta'))).hostUid, 'uid-novo-notebook');
  assert.equal(reserva.estado().subfase, 'sorteio');
  assert.equal((await lerResultados(sessao, 'r1')).e1.decisao, 'a');
  await assert.rejects(sessao.anf.avancar());
});

test('online → offline no meio da rodada: o canal-local nasce com o uid do anfitrião e o resultado é igual ao da sessão que ficou online (I7)', async () => {
  // Arrange: a mesma sessão, espelhada no meio da decisão
  const sessao = await prepararRodada({ porEquipe: { e1: 2, e2: 1 }, sementes: [77] });
  const { alunos, relogio, config } = sessao;
  await alunos.e1[0].decidir('r1', 'e1', 'a');
  await alunos.e1[1].decidir('r1', 'e1', 'a');
  await alunos.e2[0].decidir('r1', 'e2', 'c');
  const espelho = sessao.canal.exportar();
  const hostUid = espelho.salas[SALA].meta.hostUid;
  const offline = V.canalLocal.criar({ relogio: relogio.agora, uid: hostUid });
  offline.importar(espelho);
  const comUidPadrao = V.canalLocal.criar({ relogio: relogio.agora });
  comUidPadrao.importar(espelho);
  const criarOffline = (canal) => V.anfitriao.criar({ canal, config, sala: SALA, nomeRoteiro: '60min', agora: relogio.agora, gerarSemente: () => 77 });
  const anfOffline = criarOffline(offline);
  // Act
  await sessao.anf.encerrar();
  await anfOffline.carregarSala();
  await anfOffline.encerrar();
  // Assert
  const ler = (canal, ...p) => canal.ler(s(...p));
  assert.deepEqual(await ler(offline, 'resultados'), await ler(sessao.host, 'resultados'));
  assert.deepEqual(await ler(offline, 'placar'), await ler(sessao.host, 'placar'));
  assert.equal(anfOffline.estado().subfase, 'sorteio');
  // Com o uid padrão ('apresentador-local') o anfitrião não é o host do espelho:
  // a recusa vem já no carregar, e não no primeiro encerrar da aula.
  await assert.rejects(criarOffline(comUidPadrao).carregarSala(), NEGADO);
});

test('carregarSala recusa roteiro ou config diferentes dos da criação, e estado que não bate com o passo', async () => {
  // Arrange
  const sessao = montarSessao(V);
  await sessao.anf.criarSala();
  const outroConfig = structuredClone(sessao.config);
  outroConfig.titulo = 'Outro pendrive';
  // Act + Assert
  await assert.rejects(anfitriaoComo(sessao, HOST, { nomeRoteiro: '120min' }).carregarSala(), /roteiro "60min"/);
  await assert.rejects(anfitriaoComo(sessao, HOST, { config: outroConfig }).carregarSala(), /config/);
  const e = await sessao.host.ler(s('estado'));
  await sessao.host.gravar({ [s('estado')]: { ...e, indice: 2, geracao: e.geracao + 1 } }); // tipo lobby, passo bloco
  await assert.rejects(anfitriaoComo(sessao, HOST).carregarSala(), /não bate/);
});

test('desfazer depois de prorrogação e moeda: o encerrar seguinte não abre outra prorrogação', {
  todo: 'precisa de decisão: "uma prorrogação só por rodada" vale também depois do desfazer?',
}, async () => {
  // Arrange
  const { anf, alunos } = await prepararRodada({ porEquipe: { e1: 2 } });
  await alunos.e1[0].decidir('r1', 'e1', 'a');
  await alunos.e1[1].decidir('r1', 'e1', 'b');
  await anf.encerrar(); // prorrogação
  await anf.encerrar(); // moeda
  // Act
  await anf.desfazer();
  await anf.encerrar();
  // Assert
  assert.equal(anf.estado().subfase, 'sorteio');
});

test('avançar na enquete uma_por_vez pausada vai para a próxima afirmação e continua pausada', async () => {
  // Arrange
  const sessao = montarSessao(V);
  const { anf, relogio, config } = sessao;
  await anf.criarSala();
  await anf.avancar(); // enquete "antes", a1
  relogio.passar(5000);
  await anf.pausar();
  // Act
  await anf.avancar();
  const pausado = anf.estado();
  await anf.retomar();
  // Assert
  assert.equal(pausado.afirmacao, 'a2');
  assert.deepEqual([pausado.prazo, pausado.restanteMs], [undefined, config.tempos.enqueteSeg * 1000]);
  assert.equal(anf.estado().prazo, relogio.agora() + config.tempos.enqueteSeg * 1000);
});

test('definirEquipesAbertas recusa a lista vazia', async () => {
  // Arrange
  const sessao = montarSessao(V);
  await sessao.anf.criarSala();
  await sessao.anf.pularPara(sessao.indiceDe('formarEquipes'));
  // Act + Assert
  await assert.rejects(sessao.anf.definirEquipesAbertas([]), /pelo menos uma/);
  assert.equal(Object.keys(sessao.anf.estado().equipesAbertas).length, 6);
});

test('moeda da prorrogação sorteia só entre as opções empatadas, mesmo com eleitores removidos durante a prorrogação', async () => {
  // Arrange: uma semente em que a moeda entre a, b e c tiraria "c"
  const config = configDaSessao(V);
  const moedaSem = (semente) => V.motor.consolidarDecisao(config, {
    rodadaId: 'r1', votos: { x: 'a', y: 'b', z: 'c' }, aposProrrogacao: true, semente, equipeId: 'e1',
  }).decisao;
  const semente = Array.from({ length: 200 }, (_, i) => i + 1).find((n) => moedaSem(n) === 'c');
  const sessao = await prepararRodada({ porEquipe: { e1: 5 }, sementes: [semente] });
  const [a0, a1, a2, a3, a4] = sessao.alunos.e1;
  for (const [a, op] of [[a0, 'a'], [a1, 'a'], [a2, 'b'], [a3, 'b'], [a4, 'c']]) await a.decidir('r1', 'e1', op);
  await sessao.anf.encerrar(); // prorrogação entre a e b
  // Act: um eleitor de "a" e um de "b" saem (removerInativos ou moverMembro)
  await sessao.host.gravar({ [s('membros', a0.uid)]: null, [s('membros', a2.uid)]: null });
  await sessao.anf.encerrar();
  // Assert
  const r = (await lerResultados(sessao, 'r1')).e1;
  assert.ok(['a', 'b'].includes(r.decisao), `saiu "${r.decisao}", que não estava empatada`);
  assert.equal(r.origem, 'moeda');
  assert.deepEqual(r.contagem, { a: 1, b: 1, c: 1 });
});

test('apuração que lança depois da fase 1: desfazer tira a sala do "fechando", e o encerrar seguinte tira a mesma carta', async () => {
  // Arrange
  const sessao = await prepararRodada({ porEquipe: { e1: 1 }, sementes: [4242] });
  const { anf, alunos, host } = sessao;
  await alunos.e1[0].decidir('r1', 'e1', 'a');
  const original = V.motor.resolverRodada;
  V.motor.resolverRodada = () => { throw new Error('Nenhuma carta possível (simulado)'); };
  try {
    await assert.rejects(anf.encerrar(), /simulado/);
  } finally {
    V.motor.resolverRodada = original;
  }
  const preso = anf.estado();
  await assert.rejects(anf.avancar(), /Apuração em andamento/);
  // Act
  await anf.desfazer();
  const reaberto = anf.estado();
  await anf.encerrar();
  // Assert
  assert.equal(preso.subfase, 'fechando');
  assert.deepEqual([reaberto.subfase, reaberto.geracao], ['decidindo', preso.geracao + 1]);
  assert.equal(await host.ler(s('sementes', 'r1')), 4242);
  const esperado = V.motor.resolverRodada(sessao.config, {
    equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', estado: V.motor.estadoInicial(sessao.config, 'e1'), semente: 4242,
  });
  assert.equal((await lerResultados(sessao, 'r1')).e1.carta, esperado.carta);
});

test('apuração de enquete que lança: desfazer volta a "votando"; na prorrogação, volta à prorrogação', async () => {
  // Arrange: enquete
  const sessao = montarSessao(V);
  await sessao.anf.criarSala();
  await sessao.anf.avancar();
  const original = V.enquete.apurar;
  V.enquete.apurar = () => { throw new Error('falha simulada'); };
  try {
    await assert.rejects(sessao.anf.encerrar(), /simulada/);
  } finally {
    V.enquete.apurar = original;
  }
  // Arrange: rodada que cai no fechamento da prorrogação
  const rod = await prepararRodada({ porEquipe: { e1: 2 } });
  await rod.alunos.e1[0].decidir('r1', 'e1', 'a');
  await rod.alunos.e1[1].decidir('r1', 'e1', 'b');
  await rod.anf.encerrar();
  const resolver = V.motor.resolverRodada;
  V.motor.resolverRodada = () => { throw new Error('falha simulada'); };
  try {
    await assert.rejects(rod.anf.encerrar(), /simulada/);
  } finally {
    V.motor.resolverRodada = resolver;
  }
  // Act
  await sessao.anf.desfazer();
  await rod.anf.desfazer();
  // Assert
  assert.equal(sessao.anf.estado().subfase, 'votando');
  assert.equal(rod.anf.estado().subfase, 'prorrogacao');
  assert.deepEqual(rod.anf.estado().empatadas, { e1: { a: true, b: true } });
  assert.equal(rod.anf.estado().prazo, rod.relogio.agora() + rod.config.tempos.prorrogacaoSeg * 1000);
});
