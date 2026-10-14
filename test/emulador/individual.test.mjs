// O modo individual (regras.individual; decisão do Kleber de 13/10 à noite)
// contra as regras reais no emulador, com o anfitriao.js real sobre o
// canal-firebase e um app (conexão e login anônimo) por celular: a vaga que o
// telão dá numa gravação só (o membro e o estado com geracao + 1) passa nas
// regras v4 sem mudança, duas gravações com a mesma geracao nunca passam juntas
// (nunca duas pessoas na mesma vaga), o celular não troca nem larga a vaga, e
// a rodada apura um voto por vaga, sem prorrogação.
//
// Roda com: npm run emulador
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from '../carregar-nucleo.mjs';
import { configIndividual } from '../fixtures/individual.mjs';
import { novoCanalNoEmulador, administrador, PIN_EMULADOR } from '../../bin/emulador.mjs';

const V = await carregarNucleo();
const NEGADO = /PERMISSION_DENIED/;
const abertos = [];

before(() => administrador('PUT', 'privado/pinApresentador', PIN_EMULADOR));
after(async () => {
  await Promise.all(abertos.map((c) => c.fechar()));
});

async function abrir(prefixo) {
  const c = await novoCanalNoEmulador(prefixo);
  abertos.push(c);
  return c;
}

// Salas "V???" são deste arquivo: os arquivos de test/emulador/ rodam em
// paralelo no mesmo emulador, cada um com o seu prefixo.
let seq = 0;
const salaNova = () => `V${'ABCDEFGH'[seq++ % 8]}${'JKLMNPQR'[Math.floor(Math.random() * 8)]}${'23456789'[Math.floor(Math.random() * 8)]}`;

// A sala individual criada pelo telão (com o PIN) e n celulares que entram ao
// mesmo tempo, cada um com o próprio app.
async function salaIndividual(n) {
  const config = configIndividual(V);
  const sala = salaNova();
  await administrador('DELETE', `salas/${sala}`);
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const telao = await abrir('telao-ind');
  await telao.gravar({ [`pedidosAnfitriao/${await telao.entrar()}`]: PIN_EMULADOR });
  const anf = V.anfitriao.criar({ canal: telao, config, sala, nomeRoteiro: '60min', gerarSemente: () => 4242 });
  await anf.criarSala();
  const alunos = await Promise.all(Array.from({ length: n }, async (_, i) => {
    const canal = await abrir(`ind${i}`);
    return { canal, uid: await canal.entrar() };
  }));
  const entrar = (a) => a.canal.gravar({ [s('membros', a.uid)]: { entrouEm: a.canal.marcadorDeHora() } });
  await Promise.all(alunos.map(entrar));
  return { config, sala, s, telao, anf, alunos, entrar };
}

test('21 celulares entram juntos: o telão dá 20 vagas diferentes, o 21º fica sem vaga, e o celular não troca nem larga a vaga', async () => {
  const { config, s, telao, anf, alunos } = await salaIndividual(21);

  const r = await anf.atribuirVagas();

  assert.equal(r.atribuidas, 20);
  assert.equal(r.semVaga.length, 1);
  const membros = await telao.ler(s('membros'));
  const vagas = alunos.map((a) => membros[a.uid].equipe).filter(Boolean);
  assert.equal(vagas.length, 20);
  assert.equal(new Set(vagas).size, 20, 'nenhuma vaga repetida');
  const estado = await telao.ler(s('estado'));
  assert.deepEqual(new Set(Object.keys(estado.equipesAbertas)), new Set(vagas), 'abertas = ocupadas');

  // O 21º: o celular faz a mesma conta e diz que a sala está cheia.
  const fora = alunos.find((a) => a.uid === r.semVaga[0]);
  const [conteudo, estadoLido, membrosLidos] = await Promise.all(['conteudo', 'estado', 'membros'].map((p) => fora.canal.ler(s(p))));
  const tela = V.alunoLogica.telaDoAluno({ conteudo, estado: estadoLido, membro: membrosLidos[fora.uid], membros: membrosLidos, uid: fora.uid });
  assert.deepEqual(tela, { tipo: 'aguardando', dados: { motivo: 'salaCheia', capacidade: 20 } });

  // Quem tem vaga: não troca, não regrava o registro sem ela e não sai.
  const a = alunos.find((x) => membros[x.uid].equipe === 'e1');
  await assert.rejects(a.canal.gravar({ [s('membros', a.uid, 'equipe')]: 'e2' }), NEGADO);
  await assert.rejects(a.canal.gravar({ [s('membros', a.uid)]: { entrouEm: membros[a.uid].entrouEm } }), NEGADO);
  await assert.rejects(a.canal.gravar({ [s('membros', a.uid)]: null }), NEGADO);
  // O 21º também não pega uma vaga sozinho.
  await assert.rejects(fora.canal.gravar({ [s('membros', fora.uid, 'equipe')]: 'e20' }), NEGADO);
  assert.equal((await telao.ler(s('membros', a.uid))).equipe, 'e1');
  assert.equal(config.ordem.equipes.length, 20);
});

test('corrida: duas janelas do telão dando vagas ao mesmo tempo, com gente chegando no meio, nunca repetem uma vaga', async () => {
  const { config, sala, s, telao, anf, alunos, entrar } = await salaIndividual(6);
  const outro = V.anfitriao.criar({ canal: telao, config, sala, nomeRoteiro: '60min', gerarSemente: () => 7 });
  await outro.carregarSala();

  const [r1, r2] = await Promise.all([anf.atribuirVagas(), outro.atribuirVagas()]);
  const mais = await Promise.all(Array.from({ length: 4 }, async (_, i) => {
    const canal = await abrir(`ind-mais${i}`);
    return { canal, uid: await canal.entrar() };
  }));
  await Promise.all([...mais.map(entrar), outro.atribuirVagas(), anf.atribuirVagas()]);
  await anf.atribuirVagas(); // quem chegou depois das duas contas

  assert.equal(r1.atribuidas + r2.atribuidas, 6, 'cada vaga foi dada uma vez só');
  const membros = await telao.ler(s('membros'));
  const vagas = [...alunos, ...mais].map((a) => membros[a.uid].equipe);
  assert.ok(vagas.every(Boolean), 'todos com vaga');
  assert.equal(new Set(vagas).size, 10, 'nenhuma vaga repetida');
  const estado = await telao.ler(s('estado'));
  assert.deepEqual(new Set(Object.keys(estado.equipesAbertas)), new Set(vagas), 'abertas = ocupadas');
});

test('a rodada individual contra as regras reais: um voto por vaga, só na própria, e a apuração sem prorrogação', async () => {
  const { s, telao, anf, alunos } = await salaIndividual(3);
  await anf.atribuirVagas();
  await anf.avancar(); // personas
  await anf.avancar(); // r1, decidindo
  const membros = await telao.ler(s('membros'));
  const vagaDe = (a) => membros[a.uid].equipe;
  const escolhas = ['a', 'b', 'b'];

  await Promise.all(alunos.map((a, i) => a.canal.gravar({ [s('decisoes', 'r1', vagaDe(a), a.uid)]: escolhas[i] })));
  await assert.rejects(alunos[0].canal.gravar({ [s('decisoes', 'r1', vagaDe(alunos[1]), alunos[0].uid)]: 'c' }), NEGADO, 'voto na vaga de outro');
  await assert.rejects(alunos[0].canal.ler(s('decisoes', 'r1', vagaDe(alunos[1]))), NEGADO, 'ler o voto de outro');
  await anf.encerrar();

  assert.equal(anf.estado().subfase, 'resultado');
  const r1 = await telao.ler(s('resultados', 'r1'));
  assert.deepEqual(Object.keys(r1).sort(), alunos.map(vagaDe).sort(), 'só as vagas ocupadas');
  alunos.forEach((a, i) => assert.deepEqual([r1[vagaDe(a)].decisao, r1[vagaDe(a)].origem], [escolhas[i], 'maioria']));
  assert.equal(await telao.ler(s('prorrogacoes', 'r1')), null);
});

// Revisão de 14/10 (achado 2): a vaga presa (o celular de teste do
// apresentador, uma segunda aba) volta para quem espera, com o membro e o
// estado na mesma gravação. As regras reais aceitam: o anfitrião apaga o
// membro e grava o estado com a geracao + 1.
test('vaga presa contra as regras reais: "Remover inativos" devolve a vaga de quem nunca deu sinal a quem espera', async () => {
  const { s, telao, anf, alunos } = await salaIndividual(1); // o celular de teste, sem presença
  await anf.atribuirVagas();
  const presa = alunos[0];
  assert.equal((await telao.ler(s('membros', presa.uid))).equipe, 'e1');
  const novos = await Promise.all(Array.from({ length: 20 }, async (_, i) => {
    const canal = await abrir(`ind-presa${i}`);
    return { canal, uid: await canal.entrar() };
  }));
  for (const a of novos) await a.canal.gravar({ [s('membros', a.uid)]: { entrouEm: a.canal.marcadorDeHora() } });
  await anf.atribuirVagas();
  await Promise.all(novos.map((a) => a.canal.gravar({ [s('presenca', a.uid)]: a.canal.marcadorDeHora() })));
  const semVaga = [];
  for (const a of novos) if (!(await telao.ler(s('membros', a.uid))).equipe) semVaga.push(a);
  assert.equal(semVaga.length, 1, 'um aluno de verdade ficou de fora');

  assert.equal(await anf.removerInativos(60_000), 1);

  assert.equal(await telao.ler(s('membros', presa.uid)), null);
  assert.equal((await telao.ler(s('membros', semVaga[0].uid))).equipe, 'e1', 'quem esperava ganhou a vaga');
  const membros = await telao.ler(s('membros'));
  const vagas = Object.values(membros).map((m) => m.equipe);
  assert.equal(vagas.length, 20);
  assert.equal(new Set(vagas).size, 20, 'nenhuma vaga repetida');
  const estado = await telao.ler(s('estado'));
  assert.deepEqual(new Set(Object.keys(estado.equipesAbertas)), new Set(vagas), 'abertas = ocupadas');
});
