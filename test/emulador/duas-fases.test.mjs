// O fechamento em duas fases contra as regras reais (arquitetura, seção 5; red
// team, falha 1): nenhum voto que o servidor aceitou fica de fora, e nenhum voto
// que chegou depois do "fechando" entra. É a invariante I4 medida do jeito que
// importa: confirmados === contados, voto a voto.
//
// Roda com: npm run emulador
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from '../carregar-nucleo.mjs';
import { configDaSessao } from '../fixtures/sessao.mjs';
import { novoCanalNoEmulador, administrador, PIN_EMULADOR } from '../../bin/emulador.mjs';

const V = await carregarNucleo();
const PIN = PIN_EMULADOR;
const NEGADO = /PERMISSION_DENIED/;
const abertos = [];

before(() => administrador('PUT', 'privado/pinApresentador', PIN));
after(async () => {
  await Promise.all(abertos.map((c) => c.fechar()));
});

async function abrir(prefixo) {
  const c = await novoCanalNoEmulador(prefixo);
  abertos.push(c);
  return c;
}

async function telaoComPin(prefixo = 'telao') {
  const c = await abrir(prefixo);
  await c.gravar({ [`pedidosAnfitriao/${await c.entrar()}`]: PIN });
  return c;
}

// Salas "D???" são deste arquivo.
let seq = 0;
const salaNova = () => `D${'ABCDEFGH'[seq++ % 8]}${'JKLMNPQR'[Math.floor(Math.random() * 8)]}${'23456789'[Math.floor(Math.random() * 8)]}`;

// Sala criada, alunos distribuídos à mão e a rodada r1 aberta.
async function prepararRodada(porEquipe) {
  const config = configDaSessao(V);
  const sala = salaNova();
  await administrador('DELETE', `salas/${sala}`);
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const telao = await telaoComPin();
  const anf = V.anfitriao.criar({ canal: telao, config, sala, nomeRoteiro: '60min', gerarSemente: () => 4242 });
  await anf.criarSala();
  const alunos = [];
  for (const [eq, n] of Object.entries(porEquipe)) {
    for (let i = 0; i < n; i += 1) {
      const canal = await abrir(`aluno-${eq}-${i}`);
      const uid = await canal.entrar();
      await canal.gravar({ [s('membros', uid)]: { entrouEm: canal.marcadorDeHora() } });
      alunos.push({ canal, uid, eq });
    }
  }
  const passos = V.roteiro.passos(config, '60min');
  await anf.pularPara(passos.findIndex((p) => p.tipo === 'formarEquipes'));
  await anf.definirEquipesAbertas(Object.keys(porEquipe));
  for (const a of alunos) await a.canal.gravar({ [s('membros', a.uid, 'equipe')]: a.eq });
  await anf.avancar(); // personas: trava
  await new Promise((r) => setTimeout(r, 5)); // entrouEm < abertoEm, com folga de relógio
  await anf.avancar(); // rodada r1
  assert.equal(anf.estado().subfase, 'decidindo');
  return { config, sala, s, telao, anf, alunos };
}

test('voto entre o "fechando" e a leitura é recusado pela regra e não conta', async () => {
  const { s, telao, anf, alunos, config, sala } = await prepararRodada({ e1: 3 });
  const [a0, a1, a2] = alunos;
  await a0.canal.gravar({ [s('decisoes', 'r1', 'e1', a0.uid)]: 'a' });
  await a1.canal.gravar({ [s('decisoes', 'r1', 'e1', a1.uid)]: 'b' });
  const recusas = [];
  // Um telão que, entre a fase 1 ("fechando" confirmado) e a leitura dos votos,
  // deixa dois celulares tentarem votar: o que muda de voto e o que chega agora.
  const espiao = {
    ...telao,
    async ler(caminho) {
      if (caminho === s('decisoes', 'r1')) {
        await a1.canal.gravar({ [s('decisoes', 'r1', 'e1', a1.uid)]: 'a' }).catch((e) => recusas.push(e));
        await a2.canal.gravar({ [s('decisoes', 'r1', 'e1', a2.uid)]: 'b' }).catch((e) => recusas.push(e));
      }
      return telao.ler(caminho);
    },
  };
  const anfEspiao = V.anfitriao.criar({ canal: espiao, config, sala, nomeRoteiro: '60min', gerarSemente: () => 7 });
  await anfEspiao.carregarSala();
  await anfEspiao.encerrar();
  assert.equal(recusas.length, 2);
  for (const e of recusas) assert.match(String(e), NEGADO);
  // 1 × 1: os dois votos confirmados antes contaram; os de depois, não.
  assert.equal(anfEspiao.estado().subfase, 'prorrogacao');
  assert.deepEqual(anfEspiao.estado().empatadas, { e1: { a: true, b: true } });
  assert.deepEqual(await telao.ler(s('decisoes', 'r1', 'e1')), { [a0.uid]: 'a', [a1.uid]: 'b' });
  assert.equal(anf.estado().subfase, 'decidindo', 'o anfitrião antigo não sabe de nada até ler');
});

test('corrida: 12 votos disparados junto com o encerrar; cada voto confirmado conta, cada recusado não', async () => {
  const { s, telao, anf, alunos } = await prepararRodada({ e1: 4, e2: 4, e3: 4 });
  const confirmado = {};
  // Todos da mesma equipe votam igual: sem empate, o resultado sai na hora.
  const votos = alunos.map((a, i) => new Promise((r) => setTimeout(r, i % 4)).then(() => a.canal.gravar({ [s('decisoes', 'r1', a.eq, a.uid)]: 'a' }))
    .then(() => { confirmado[a.uid] = true; }, (e) => {
      assert.match(String(e), NEGADO);
      confirmado[a.uid] = false;
    }));
  await Promise.all([anf.encerrar(), ...votos]);
  assert.equal(anf.estado().subfase, 'sorteio');
  const resultados = await telao.ler(s('resultados', 'r1'));
  const gravadas = (await telao.ler(s('decisoes', 'r1'))) || {};
  for (const eq of ['e1', 'e2', 'e3']) {
    const daEquipe = alunos.filter((a) => a.eq === eq);
    const confirmados = daEquipe.filter((a) => confirmado[a.uid]).length;
    const contados = Object.values(resultados[eq].contagem).reduce((x, y) => x + y, 0);
    assert.equal(contados, confirmados, `${eq}: contados = confirmados`);
    // Recusado não fica no banco: não há voto "fantasma" que entraria num refazer.
    for (const a of daEquipe) assert.equal(Boolean(gravadas[eq]?.[a.uid]), confirmado[a.uid], `${eq}/${a.uid}`);
  }
});

test('corrida na enquete: votos junto com o encerrar; n apurado = votos confirmados', async () => {
  const config = configDaSessao(V);
  const sala = salaNova();
  await administrador('DELETE', `salas/${sala}`);
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const telao = await telaoComPin();
  const anf = V.anfitriao.criar({ canal: telao, config, sala, nomeRoteiro: '60min', gerarSemente: () => 1 });
  await anf.criarSala();
  const alunos = [];
  for (let i = 0; i < 10; i += 1) {
    const canal = await abrir(`enq-${i}`);
    const uid = await canal.entrar();
    await canal.gravar({ [s('membros', uid)]: { entrouEm: canal.marcadorDeHora() } });
    alunos.push({ canal, uid });
  }
  await anf.avancar(); // enquete "antes", afirmação a1
  const afirm = anf.estado().afirmacao;
  let confirmados = 0;
  const votos = alunos.map((a, i) => new Promise((r) => setTimeout(r, i % 5)).then(() => a.canal.gravar({ [s('votosEnquete', 'entrada', 'antes', afirm, a.uid)]: 1 + (i % 5) }))
    .then(() => { confirmados += 1; }, (e) => assert.match(String(e), NEGADO)));
  await Promise.all([anf.encerrar(), ...votos]);
  const apuracao = await telao.ler(s('enquetes', 'entrada', 'antes'));
  assert.equal(apuracao.n[afirm], confirmados);
});

test('telão cai depois do "fechando": outro telão assume com o PIN e conclui a mesma apuração', async () => {
  const { s, telao, anf, alunos, config, sala } = await prepararRodada({ e1: 2, e2: 2 });
  for (const a of alunos) await a.canal.gravar({ [s('decisoes', 'r1', a.eq, a.uid)]: a.eq === 'e1' ? 'b' : 'c' });
  // O primeiro telão grava o "fechando" e morre antes de ler os votos.
  const quebrado = { ...telao, ler: async (c) => (c === s('decisoes', 'r1') ? Promise.reject(new Error('o notebook travou')) : telao.ler(c)) };
  const anfQuebrado = V.anfitriao.criar({ canal: quebrado, config, sala, nomeRoteiro: '60min', gerarSemente: () => 99 });
  await anfQuebrado.carregarSala();
  await assert.rejects(anfQuebrado.encerrar(), /travou/);
  assert.equal((await telao.ler(s('estado'))).subfase, 'fechando');
  // Sem o PIN, outra conta não assume.
  const intruso = await abrir('intruso');
  await intruso.entrar();
  const anfIntruso = V.anfitriao.criar({ canal: intruso, config, sala, nomeRoteiro: '60min', gerarSemente: () => 1 });
  await assert.rejects(anfIntruso.carregarSala(), NEGADO);
  // Com o PIN, assume, conclui e reusa a semente já gravada.
  const novo = await telaoComPin('telao-novo');
  const anfNovo = V.anfitriao.criar({ canal: novo, config, sala, nomeRoteiro: '60min', gerarSemente: () => 12345 });
  await anfNovo.carregarSala();
  await anfNovo.encerrar();
  assert.equal(anfNovo.estado().subfase, 'sorteio');
  const resultados = await novo.ler(s('resultados', 'r1'));
  assert.deepEqual([resultados.e1.decisao, resultados.e2.decisao], ['b', 'c']);
  assert.equal(await novo.ler(s('sementes', 'r1')), 99);
  // O telão antigo perdeu a escrita (o anf antigo ainda acha que está decidindo).
  assert.equal(anf.estado().subfase, 'decidindo');
  await assert.rejects(telao.gravar({ [s('pulso')]: telao.marcadorDeHora() }), NEGADO);
});
