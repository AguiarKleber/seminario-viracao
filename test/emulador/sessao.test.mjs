// A sessão inteira com o anfitriao.js REAL sobre o canal-firebase, contra as
// regras reais no emulador, com 20 alunos, cada um com o próprio app (conexão e
// login anônimo independentes). A mesma sessão roda também sobre o canal-local,
// e os totais exportados têm de ser iguais: online e offline são o mesmo sistema
// (I7), e o canal-firebase não muda nada no que o anfitrião apura.
//
// Roda com: npm run emulador
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from '../carregar-nucleo.mjs';
import { configDaSessao } from '../fixtures/sessao.mjs';
import { novoCanalNoEmulador, administrador, PIN_EMULADOR } from '../../bin/emulador.mjs';
import { relogioParado } from './relogio-parado.mjs';

const V = await carregarNucleo();
const PIN = PIN_EMULADOR;
const abertos = [];

before(() => administrador('PUT', 'privado/pinApresentador', PIN));
after(async () => {
  await Promise.all(abertos.map((c) => c.fechar()));
});

// As duas famílias de canal com a mesma cara: um canal para o telão e um por aluno.
function mundoLocal() {
  // A hora parada por volta do laço, como o "now" de uma escrita no servidor:
  // com o Date.now puro, o marcadorDeHora() da presença e a trava "presença
  // === agora" caíam às vezes em milissegundos diferentes, e o teste falhava
  // com "presença precisa ser a hora do servidor" (relogio-parado.mjs).
  const base = V.canalLocal.criar({ relogio: relogioParado() });
  return {
    nome: 'local',
    telao: async () => base.comoUsuario('telao'),
    aluno: async (i) => base.comoUsuario(`aluno${String(i).padStart(2, '0')}`),
  };
}

function mundoEmulador() {
  const abrir = async (prefixo) => {
    const c = await novoCanalNoEmulador(prefixo);
    abertos.push(c);
    return c;
  };
  return {
    nome: 'emulador',
    async telao() {
      const c = await abrir('telao');
      // O PIN digitado no telão antes de projetar: é o que deixa criar a sala.
      await c.gravar({ [`pedidosAnfitriao/${await c.entrar()}`]: PIN });
      return c;
    },
    aluno: (i) => abrir(`aluno${i}`),
  };
}

// Votos por equipe, iguais nos dois mundos: e6 não vota (piloto).
const ESCOLHAS = {
  r1: { e1: 'a', e2: 'b', e3: 'c', e4: 'a', e5: 'b' },
  r2: { e1: 'b', e2: 'a', e3: 'a', e4: 'c', e5: 'b', e6: 'a' },
  r3: { e1: 'c', e2: 'a', e3: 'b', e4: 'c', e5: 'a', e6: 'c' },
};
const ANTES = { a1: (i) => 1 + (i % 5), a2: (i) => 5 - (i % 5), a3: (i) => 1 + (i % 3) };
const DEPOIS = { a1: (i) => Math.max(1, ANTES.a1(i) - 1), a2: ANTES.a2, a3: (i) => Math.min(5, ANTES.a3(i) + 1) };

async function rodarSessao(mundo, sala) {
  const config = configDaSessao(V);
  const M = V.motor;
  const A = V.alunoLogica;
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const telao = await mundo.telao();
  const sementes = [111, 222, 333];
  const anf = V.anfitriao.criar({ canal: telao, config, sala, nomeRoteiro: '60min', gerarSemente: () => sementes.shift() });
  await anf.criarSala();

  // Entrada: um canal por celular, na ordem (a distribuição dos atrasados usa a
  // hora de entrada, e os dois mundos precisam da mesma ordem).
  const alunos = [];
  for (let i = 0; i < 20; i += 1) {
    const canal = await mundo.aluno(i);
    const uid = await canal.entrar();
    await canal.gravar({ [s('membros', uid)]: { entrouEm: canal.marcadorDeHora() } });
    await canal.gravar({ [s('presenca', uid)]: canal.marcadorDeHora() });
    alunos.push({ canal, uid });
  }
  const confirmados = {};
  async function votarTodos(enquete, momento, afirmacao, valorDe) {
    await Promise.all(alunos.map(async (a, i) => {
      await a.canal.gravar({ [s('votosEnquete', enquete, momento, afirmacao, a.uid)]: valorDe(i) });
      confirmados[`${enquete}/${momento}/${afirmacao}`] = (confirmados[`${enquete}/${momento}/${afirmacao}`] || 0) + 1;
    }));
  }

  // Enquete "antes", uma afirmação por vez, com os 20 votando ao mesmo tempo
  await anf.avancar();
  for (const [idx, a] of ['a1', 'a2', 'a3'].entries()) {
    await votarTodos('entrada', 'antes', a, ANTES[a]);
    if (idx < 2) await anf.avancar();
  }
  await anf.encerrar();
  const apuracaoAntes = await telao.ler(s('enquetes', 'entrada', 'antes'));
  for (const a of ['a1', 'a2', 'a3']) assert.equal(apuracaoAntes.n[a], confirmados[`entrada/antes/${a}`], `${mundo.nome}: confirmados = contados em ${a}`);

  // Formar equipes: 18 pelo "me coloque", na ordem; 2 ficam para o telão distribuir
  await anf.avancar();
  await anf.avancar();
  await anf.definirEquipesAbertas(config.ordem.equipes);
  for (const a of alunos.slice(0, 18)) {
    const membros = await a.canal.ler(s('membros'));
    await a.canal.gravar({ [s('membros', a.uid, 'equipe')]: A.sugerirEquipe(config, { membros, equipesAbertas: anf.estado().equipesAbertas }) });
  }
  await anf.avancar(); // personas: trava e distribui
  const membros = await telao.ler(s('membros'));
  const equipeDe = alunos.map((a) => membros[a.uid].equipe);
  const tamanho = (eq) => equipeDe.filter((x) => x === eq).length;
  assert.deepEqual(config.ordem.equipes.map(tamanho), [4, 4, 3, 3, 3, 3], mundo.nome);
  // Depois da trava, o nó inteiro do membro não troca a equipe (achado 15).
  await assert.rejects(alunos[0].canal.gravar({ [s('membros', alunos[0].uid)]: { entrouEm: membros[alunos[0].uid].entrouEm, equipe: 'e6' } }), /PERMISSION_DENIED/);

  // Três rodadas; cada celular desenha a tela com o aluno-logica, como o de verdade
  const estadoEquipe = Object.fromEntries(config.ordem.equipes.map((eq) => [eq, M.estadoInicial(config, eq)]));
  const jogadas = Object.fromEntries(config.ordem.equipes.map((eq) => [eq, []]));
  for (const [r, semente] of [['r1', 111], ['r2', 222], ['r3', 333]]) {
    while (anf.estado().tipo !== 'rodada') await anf.avancar();
    await Promise.all(alunos.map(async (a, i) => {
      const [conteudo, estado, membrosAgora, decisoes] = await Promise.all([
        a.canal.ler(s('conteudo')), a.canal.ler(s('estado')), a.canal.ler(s('membros')), a.canal.ler(s('decisoes', r, equipeDe[i])),
      ]);
      const tela = A.telaDoAluno({ conteudo, estado, membro: membrosAgora[a.uid], membros: membrosAgora, meusVotos: {}, decisoesDaEquipe: decisoes, resultados: null, placar: null, uid: a.uid, agora: a.canal.agora() });
      assert.equal(tela.tipo, 'decisao');
      assert.equal(tela.dados.podeVotar, true);
      const op = ESCOLHAS[r][equipeDe[i]];
      if (op) await a.canal.gravar({ [s('decisoes', r, equipeDe[i], a.uid)]: op });
    }));
    await anf.encerrar();
    assert.equal(anf.estado().subfase, 'sorteio', `${mundo.nome} ${r}`);
    const resultados = await telao.ler(s('resultados', r));
    for (const eq of config.ordem.equipes) {
      const decisao = ESCOLHAS[r][eq] ?? config.rodadas[r].padrao;
      const esperado = M.resolverRodada(config, { equipeId: eq, rodadaId: r, opcaoId: decisao, estado: estadoEquipe[eq], semente });
      assert.equal(resultados[eq].decisao, decisao, `${mundo.nome} ${r}/${eq}`);
      assert.equal(resultados[eq].carta, esperado.carta);
      assert.deepEqual(resultados[eq].depois, esperado.depois);
      const votos = Object.values(resultados[eq].contagem).reduce((x, y) => x + y, 0);
      assert.equal(votos, ESCOLHAS[r][eq] ? tamanho(eq) : 0, `${mundo.nome} ${r}/${eq}: confirmados = contados`);
      estadoEquipe[eq] = esperado.depois;
      jogadas[eq].push({ rodadaId: r, opcaoId: decisao, cartaId: esperado.carta });
    }
    // O aluno não lê a semente, nem a decisão de outra equipe.
    await assert.rejects(alunos[0].canal.ler(s('sementes', r)), /PERMISSION_DENIED/);
    await assert.rejects(alunos[0].canal.ler(s('decisoes', r, equipeDe[0] === 'e1' ? 'e2' : 'e1')), /PERMISSION_DENIED/);
    await anf.avancar(); // resultado
    await anf.avancar();
  }

  // Placar gravado = placar recalculado pelo motor
  assert.equal(anf.estado().tipo, 'placarFinal');
  const placar = await telao.ler(s('placar'));
  for (const eq of config.ordem.equipes) {
    const d = M.decompor(config, { equipeId: eq, rodadas: jogadas[eq] });
    assert.deepEqual(
      [placar[eq].renda, placar[eq].piloto, placar[eq].efeitoDecisoes, placar[eq].sorte, placar[eq].piorCaso],
      [d.realizado, d.esperadoPiloto, d.efeitoDecisoes, d.sorte, d.piorCaso],
      `${mundo.nome} placar ${eq}`,
    );
  }

  // Termômetro, "depois", comparativo e fim
  await anf.avancar();
  await anf.avancar();
  assert.deepEqual([anf.estado().enquete, anf.estado().afirmacao], ['termometro', '*']);
  await votarTodos('termometro', 'unico', 't1', () => 4);
  await votarTodos('termometro', 'unico', 't2', (i) => (i < 10 ? 2 : 5));
  await anf.encerrar();
  assert.deepEqual((await telao.ler(s('enquetes', 'termometro', 'unico'))).histogramas.t2, [0, 10, 0, 0, 10]);
  await anf.avancar();
  for (const [idx, a] of ['a1', 'a2', 'a3'].entries()) {
    await votarTodos('entrada', 'depois', a, DEPOIS[a]);
    if (idx < 2) await anf.avancar();
  }
  await anf.encerrar();
  const apuracaoDepois = await telao.ler(s('enquetes', 'entrada', 'depois'));
  assert.equal(apuracaoDepois.transicao.a1.pares, 20, mundo.nome);
  await anf.avancar();
  await anf.avancar();
  assert.equal(anf.estado().tipo, 'fim');
  const totais = await anf.exportarTotais();
  const texto = JSON.stringify(totais);
  for (const a of alunos) assert.equal(texto.includes(a.uid), false, `${mundo.nome}: uid vazou na exportação`);
  await anf.apagarSala();
  assert.equal(await alunos[0].canal.ler(s('meta')), null);
  delete totais.exportadoEm;
  for (const momentos of Object.values(totais.enquetes)) for (const ap of Object.values(momentos)) delete ap.apuradaEm;
  return totais;
}

test('sessão inteira: anfitriao.js real sobre canal-firebase, 20 alunos em apps separados, igual ao canal-local', async () => {
  await administrador('DELETE', 'salas/SQ2K');
  const noEmulador = await rodarSessao(mundoEmulador(), 'SQ2K');
  const noLocal = await rodarSessao(mundoLocal(), 'SQ2K');
  assert.deepEqual(noEmulador, noLocal);
});
