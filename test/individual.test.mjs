// O modo individual (regras.individual; decisão do Kleber de 13/10 à noite):
// cada aluno joga sozinho, numa vaga própria, uma "equipe de uma pessoa" que o
// telão dá quando ele entra (anfitriao.atribuirVagas), no máximo 20 na sala.
// O nome fica só no celular; o telão mostra só o resumo da turma.
//
// A fixture é a do formato simples (test/fixtures/config-simples.json: o Jonas,
// 3 bimestres × 5 opções, as costas que travam em mar–abr para quem puxou 12
// horas em jan–fev) com a chave individual, 20 vagas e sem "formarEquipes".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, novoAluno, SALA, HOST } from './fixtures/sessao.mjs';
import { VAGAS, lerSimples, brutoIndividual, configIndividual as configDaFixture } from './fixtures/individual.mjs';

const V = await carregarNucleo();
const A = V.alunoLogica;
const H = V.historia;
const s = (...partes) => ['salas', SALA, ...partes].join('/');
const NEGADO = /PERMISSION_DENIED/;

// ---------- A fixture (test/fixtures/individual.mjs) ----------

const configIndividual = () => configDaFixture(V);

function sessaoIndividual(opcoes = {}) {
  return montarSessao(V, { config: configIndividual(), ...opcoes });
}

// Cria a sala e faz n alunos entrarem no mesmo instante (a mesma entrouEm).
async function salaComAlunos(n, opcoes = {}) {
  const sessao = sessaoIndividual(opcoes);
  await sessao.anf.criarSala();
  const alunos = [];
  for (let i = 0; i < n; i += 1) {
    const a = sessao.novoAluno(`u${String(i).padStart(2, '0')}`);
    await a.entrar();
    await a.presenca();
    alunos.push(a);
  }
  return { ...sessao, alunos };
}

const vagaDe = async (sessao, uid) => (await sessao.host.ler(s('membros', uid)))?.equipe ?? null;
const telaDe = async (aluno) => A.telaDoAluno(await aluno.entradaDaTela());

// ---------- Validador ----------

test('validador: a fixture individual é válida, com 20 vagas, a chave no normalizado e sem "formarEquipes"', () => {
  const r = V.validarConfig.validar(brutoIndividual());
  assert.deepEqual(r.erros, []);
  assert.equal(r.config.regras.individual, true);
  assert.deepEqual(r.config.ordem.equipes, VAGAS);
});

test('validador: o modo individual exige o formato simples, recusa "formarEquipes" e vaga obrigatória, e aceita até 20 vagas', () => {
  const caminhos = (bruto) => V.validarConfig.validar(bruto).erros.map((e) => e.caminho);

  const semSimples = brutoIndividual();
  delete semSimples.regras.formatoSimples;
  assert.ok(caminhos(semSimples).includes('regras.individual'));

  const comFormar = brutoIndividual();
  comFormar.roteiros['60min'].splice(1, 0, { tipo: 'formarEquipes', alvoSeg: 60 });
  assert.ok(caminhos(comFormar).includes('roteiros.60min[1]'));

  const obrigatoria = brutoIndividual();
  obrigatoria.equipes[2].obrigatoria = true;
  assert.ok(caminhos(obrigatoria).includes('equipes.e3.obrigatoria'));

  assert.ok(caminhos(brutoIndividual({ vagas: 21 })).includes('equipes'), '21 vagas: uma a mais que o máximo');
  assert.deepEqual(caminhos(brutoIndividual({ vagas: 20 })), []);
});

test('validador: sem a chave, as equipes continuam no máximo 6 e com cor e forma distintas', () => {
  const bruto = brutoIndividual({ vagas: 7 });
  delete bruto.regras.individual;
  const caminhos = V.validarConfig.validar(bruto).erros.map((e) => e.caminho);
  assert.ok(caminhos.includes('equipes'), '7 equipes no modo de equipes');
  assert.ok(caminhos.some((c) => /^equipes\.e7\.(cor|forma)$/.test(c)), 'a e7 repete a cor e a forma da e1');
});

test('validador: individual false ou ausente não entra no normalizado (o hash não muda)', () => {
  const semChave = lerSimples();
  const falso = lerSimples();
  falso.regras.individual = false;
  const a = V.validarConfig.validar(semChave);
  const b = V.validarConfig.validar(falso);
  assert.deepEqual([a.erros, b.erros], [[], []]);
  assert.equal(Object.hasOwn(a.config.regras, 'individual'), false);
  assert.equal(V.validarConfig.hash(a.config), V.validarConfig.hash(b.config));
});

// ---------- alunoLogica.vagasParaAtribuir (a conta pura) ----------

test('vagasParaAtribuir: quem entrou primeiro ganha a menor vaga; no mesmo instante, o uid desempata', () => {
  const cfg = configIndividual();
  const membros = { zeca: { entrouEm: 10 }, ana: { entrouEm: 20 }, bia: { entrouEm: 10 } };
  const plano = A.vagasParaAtribuir(cfg, { membros, equipesAbertas: null });
  assert.deepEqual(plano.atribuicoes, { bia: 'e1', zeca: 'e2', ana: 'e3' });
  assert.deepEqual(plano.abrir, ['e1', 'e2', 'e3']);
  assert.deepEqual(plano.semVaga, []);
  assert.equal(plano.capacidade, 20);
  assert.equal(plano.ocupadas, 3);
});

test('vagasParaAtribuir: a mesma entrada dá a mesma conta, em qualquer ordem de chaves', () => {
  const cfg = configIndividual();
  const membros = {};
  for (let i = 0; i < 12; i += 1) membros[`u${(i * 7) % 12}`] = { entrouEm: 100 + (i % 3) };
  const invertido = Object.fromEntries(Object.entries(membros).reverse());
  assert.deepEqual(A.vagasParaAtribuir(cfg, { membros }), A.vagasParaAtribuir(cfg, { membros: invertido }));
});

test('vagasParaAtribuir: quem já tem vaga fica nela; a vaga aberta sem dono nunca é dada a outra pessoa', () => {
  const cfg = configIndividual();
  const membros = { a: { entrouEm: 1, equipe: 'e1' }, b: { entrouEm: 2, equipe: 'e3' }, novo: { entrouEm: 3 } };
  // e2 foi aberta (tem o caminho de alguém que saiu) e não volta para a fila.
  const plano = A.vagasParaAtribuir(cfg, { membros, equipesAbertas: { e1: true, e2: true, e3: true } });
  assert.deepEqual(plano.atribuicoes, { novo: 'e4' });
  assert.deepEqual(plano.abrir, ['e4']);
});

test('vagasParaAtribuir: duas pessoas na mesma vaga (não deveria acontecer) ficam separadas: fica quem entrou primeiro', () => {
  const cfg = configIndividual();
  const membros = { tarde: { entrouEm: 9, equipe: 'e2' }, cedo: { entrouEm: 5, equipe: 'e2' } };
  const plano = A.vagasParaAtribuir(cfg, { membros, equipesAbertas: { e2: true } });
  assert.deepEqual(plano.atribuicoes, { tarde: 'e1' });
});

test('vagasParaAtribuir: a vaga gravada no membro e ainda fechada (gravação pela metade) é aberta, sem trocar o dono', () => {
  const cfg = configIndividual();
  const plano = A.vagasParaAtribuir(cfg, { membros: { a: { entrouEm: 1, equipe: 'e4' } }, equipesAbertas: null });
  assert.deepEqual(plano.atribuicoes, {});
  assert.deepEqual(plano.abrir, ['e4']);
});

test('vagasParaAtribuir: com 21 pessoas, a 21ª (a última a entrar) fica sem vaga', () => {
  const cfg = configIndividual();
  const membros = {};
  for (let i = 0; i < 21; i += 1) membros[`u${String(i).padStart(2, '0')}`] = { entrouEm: 1000 + i };
  const plano = A.vagasParaAtribuir(cfg, { membros });
  assert.equal(Object.keys(plano.atribuicoes).length, 20);
  assert.deepEqual(new Set(Object.values(plano.atribuicoes)), new Set(VAGAS));
  assert.deepEqual(plano.semVaga, ['u20']);
  assert.equal(plano.ocupadas, 20);
});

// ---------- O anfitrião dá as vagas (canal-local com as travas das regras) ----------

test('sala individual: nasce com as vagas fechadas e as equipes travadas (sem formar equipes)', async () => {
  const { anf } = sessaoIndividual();
  const e = await anf.criarSala();
  assert.equal(e.equipesTravadas, true);
  assert.equal(e.equipesAbertas, null);
});

test('20 alunos entram no mesmo instante: o telão dá 20 vagas diferentes numa gravação só, e o 21º vê "a sala está cheia"', async () => {
  const sessao = await salaComAlunos(21);
  const { anf, alunos } = sessao;
  // Antes da vaga, o celular diz "Entrando na sala…".
  assert.deepEqual(await telaDe(alunos[0]), { tipo: 'aguardando', dados: { motivo: 'entrando' } });
  const geracao = anf.estado().geracao;

  const r = await anf.atribuirVagas();

  assert.equal(r.atribuidas, 20);
  assert.deepEqual(r.semVaga, ['u20']);
  assert.equal(anf.estado().geracao, geracao + 1, 'uma gravação só, com geracao + 1');
  const vagas = await Promise.all(alunos.map((a) => vagaDe(sessao, a.uid)));
  assert.deepEqual(vagas.slice(0, 20), VAGAS, 'na ordem do uid (todos com a mesma entrouEm)');
  assert.equal(vagas[20], null);
  assert.deepEqual(Object.keys(anf.estado().equipesAbertas).sort(), [...VAGAS].sort());
  assert.deepEqual(await telaDe(alunos[0]), { tipo: 'aguardando', dados: { motivo: 'lobby' } });
  assert.deepEqual(await telaDe(alunos[20]), { tipo: 'aguardando', dados: { motivo: 'salaCheia', capacidade: 20 } });
  // Nada mais a fazer: a chamada seguinte não grava.
  assert.deepEqual(await anf.atribuirVagas(), { atribuidas: 0, semVaga: ['u20'] });
  assert.equal(anf.estado().geracao, geracao + 1);
});

test('entradas em ondas: quem chega depois ganha a menor vaga livre, sem mexer em quem já tem', async () => {
  const sessao = await salaComAlunos(3);
  const { anf, relogio } = sessao;
  await anf.atribuirVagas();
  relogio.passar(500);
  const quarto = sessao.novoAluno('a-quarto');
  await quarto.entrar();
  relogio.passar(500);
  const quinto = sessao.novoAluno('0-quinto'); // uid "menor", mas entrou depois
  await quinto.entrar();

  await anf.atribuirVagas();

  assert.deepEqual(
    await Promise.all(['u00', 'u01', 'u02', 'a-quarto', '0-quinto'].map((u) => vagaDe(sessao, u))),
    ['e1', 'e2', 'e3', 'e4', 'e5'],
  );
});

test('corrida: dois anfitriões dando vagas ao mesmo tempo nunca põem duas pessoas na mesma vaga', async () => {
  const sessao = await salaComAlunos(6);
  const { anf, config, relogio } = sessao;
  // A segunda janela (outra aba, a mesma conta): a regra recusa a gravação com
  // a geracao velha, e a segunda tentativa relê tudo.
  const outro = V.anfitriao.criar({
    canal: sessao.canal.comoUsuario(HOST), config, sala: SALA, nomeRoteiro: '60min', agora: relogio.agora, uid: HOST, gerarSemente: () => 7,
  });
  await outro.carregarSala();

  // Act: as duas ao mesmo tempo; depois, mais gente chega e as duas correm de novo.
  const [r1, r2] = await Promise.all([anf.atribuirVagas(), outro.atribuirVagas()]);
  for (let i = 0; i < 8; i += 1) {
    relogio.passar(i % 2);
    await sessao.novoAluno(`v${i}`).entrar();
  }
  await Promise.all([outro.atribuirVagas(), anf.atribuirVagas()]);

  // Assert
  assert.equal(r1.atribuidas + r2.atribuidas, 6, 'cada uma das 6 vagas foi dada uma vez só');
  const membros = await sessao.host.ler(s('membros'));
  const vagas = Object.values(membros).map((m) => m.equipe);
  assert.equal(vagas.length, 14);
  assert.equal(new Set(vagas).size, 14, 'nenhuma vaga repetida');
  const estado = await sessao.host.ler(s('estado'));
  assert.deepEqual(new Set(Object.keys(estado.equipesAbertas)), new Set(vagas), 'abertas = ocupadas');
});

test('recarregar o celular: o mesmo uid volta para a mesma vaga, e a vaga não muda nem some pelo celular', async () => {
  const sessao = await salaComAlunos(2);
  const { anf, alunos, relogio } = sessao;
  await anf.atribuirVagas();
  relogio.passar(60_000);

  // O celular recarregou: é outro objeto, com o mesmo uid (o login anônimo fica no aparelho).
  const deNovo = novoAluno(sessao.canal, relogio, alunos[1].uid);
  assert.deepEqual(await deNovo.membro(), { entrouEm: (await alunos[1].membro()).entrouEm, equipe: 'e2' });
  assert.deepEqual(await telaDe(deNovo), { tipo: 'aguardando', dados: { motivo: 'lobby' } });
  assert.deepEqual(await anf.atribuirVagas(), { atribuidas: 0, semVaga: [] });

  // O celular não regrava o registro (a vaga sumiria), não troca de vaga e não sai da sala.
  await assert.rejects(deNovo.entrar(), NEGADO);
  await assert.rejects(deNovo.escolher('e3'), NEGADO);
  await assert.rejects(deNovo.canal.gravar({ [s('membros', deNovo.uid)]: null }), NEGADO);
  assert.equal(await vagaDe(sessao, deNovo.uid), 'e2');
});

test('modo individual: "Remover inativos" nunca tira quem tem vaga, e "Mover aluno" é recusado', async () => {
  const sessao = await salaComAlunos(21);
  const { anf, relogio } = sessao;
  await anf.atribuirVagas();
  relogio.passar(10 * 60_000); // ninguém mandou presença há 10 min

  const removidos = await anf.removerInativos();

  assert.equal(removidos, 1, 'só o 21º, sem vaga');
  assert.equal(Object.keys(await sessao.host.ler(s('membros'))).length, 20);
  await assert.rejects(anf.moverMembro('u00', 'e5'), /não dá para mover/);
});

// Revisão de 14/10 (achado 2): a vaga presa. O apresentador lê o QR com o
// próprio celular no lobby, para conferir, e fica com a e1; com 20 alunos, o
// 20º via "A sala está cheia".
async function salaComVagaPresa() {
  const sessao = sessaoIndividual();
  const { anf, relogio } = sessao;
  await anf.criarSala();
  const doApresentador = sessao.novoAluno('celular-do-apresentador');
  await doApresentador.entrar();
  await doApresentador.presenca();
  await anf.atribuirVagas();
  relogio.passar(30_000);
  const alunos = [];
  for (let i = 0; i < 20; i += 1) {
    const a = sessao.novoAluno(`u${String(i).padStart(2, '0')}`);
    await a.entrar();
    alunos.push(a);
  }
  await anf.atribuirVagas();
  return { ...sessao, doApresentador, alunos };
}

const presencaDeTodos = (alunos) => Promise.all(alunos.map((a) => a.presenca()));

test('vaga presa: "Remover inativos" devolve a quem espera a vaga sem bimestre de quem está sem sinal', async () => {
  const sessao = await salaComVagaPresa();
  const { anf, relogio, alunos, doApresentador, config } = sessao;
  assert.equal(await vagaDe(sessao, doApresentador.uid), 'e1');
  assert.deepEqual(await telaDe(alunos[19]), { tipo: 'aguardando', dados: { motivo: 'salaCheia', capacidade: 20 } });
  relogio.passar(3 * 60_000); // o celular do apresentador voltou ao bolso
  await presencaDeTodos(alunos);
  const geracao = anf.estado().geracao;

  const removidos = await anf.removerInativos(120_000);

  assert.equal(removidos, 1);
  assert.equal(await doApresentador.membro(), null, 'o registro do celular do apresentador saiu');
  assert.equal(await vagaDe(sessao, alunos[19].uid), 'e1', 'quem esperava ganhou a vaga');
  const membros = await sessao.host.ler(s('membros'));
  assert.equal(Object.keys(membros).length, 20);
  assert.equal(new Set(Object.values(membros).map((m) => m.equipe)).size, 20, 'nenhuma vaga repetida');
  assert.equal(H.pessoasNaSala(config, { estado: anf.estado(), membros }), 20);
  assert.ok(anf.estado().geracao > geracao, 'a vaga sai e volta pelo estado, com a geracao');
  assert.deepEqual(await telaDe(alunos[19]), { tipo: 'aguardando', dados: { motivo: 'lobby' } });
});

test('vaga presa: sem ninguém esperando, ninguém com vaga sai', async () => {
  const sessao = await salaComVagaPresa();
  const { anf, relogio, alunos } = sessao;
  relogio.passar(3 * 60_000);
  await presencaDeTodos(alunos);
  await alunos[19].canal.gravar({ [s('membros', alunos[19].uid)]: null }); // o 21º desistiu e saiu

  assert.equal(await anf.removerInativos(120_000), 0);
  assert.equal(await vagaDe(sessao, 'celular-do-apresentador'), 'e1');
});

test('vaga presa: a vaga com bimestre jogado e a de quem já votou nunca são devolvidas', async () => {
  const sessao = sessaoIndividual();
  const { anf, relogio } = sessao;
  await anf.criarSala();
  const antigos = [];
  for (let i = 0; i < 20; i += 1) {
    const a = sessao.novoAluno(`u${String(i).padStart(2, '0')}`);
    await a.entrar();
    await a.presenca();
    antigos.push(a);
  }
  await anf.atribuirVagas();
  await anf.avancar(); // personas
  relogio.passar(1000);
  await anf.avancar(); // r1
  await anf.encerrar(); // as 20 vagas jogaram r1
  relogio.passar(1000);
  await anf.avancar(); // bloco
  await anf.avancar(); // r2, decidindo
  const r2 = anf.estado().rodada;
  await antigos[0].decidir(r2, 'e1', 'a');
  const novo = sessao.novoAluno('chegou-tarde');
  await novo.entrar();
  await novo.presenca();
  await anf.atribuirVagas();
  relogio.passar(3 * 60_000); // ninguém mais mandou sinal, só quem chegou

  await novo.presenca();
  assert.equal(await anf.removerInativos(120_000), 0);
  assert.equal(Object.keys(await sessao.host.ler(s('membros'))).length, 21);
  assert.equal(await vagaDe(sessao, 'chegou-tarde'), null, 'continua esperando: todas as vagas já jogaram');
});

test('vaga presa: entre várias, sai primeiro a de quem está há mais tempo sem sinal, e só uma por pessoa esperando', async () => {
  const sessao = await salaComVagaPresa();
  const { anf, relogio, alunos } = sessao;
  // u00 (e2) e u01 (e3) somem também, mas depois do celular do apresentador.
  relogio.passar(60_000);
  await alunos[0].presenca();
  await alunos[1].presenca();
  relogio.passar(3 * 60_000);
  await presencaDeTodos(alunos.slice(2));

  assert.equal(await anf.removerInativos(120_000), 1, 'só um esperando: só uma vaga');
  assert.equal(await vagaDe(sessao, 'celular-do-apresentador'), null);
  assert.equal(await vagaDe(sessao, alunos[0].uid), 'e2');
  assert.equal(await vagaDe(sessao, alunos[1].uid), 'e3');
  assert.equal(await vagaDe(sessao, alunos[19].uid), 'e1');
});

// Revisão de 14/10 (achado 7, a sonda S3 do revisor): um aluno sem vaga, por
// script, apaga o próprio registro entre a leitura e a gravação do telão, e
// entra de novo logo depois. A vaga dele criaria um membro sem entrouEm, e a
// regra recusava a gravação inteira, com a vaga do aluno honesto, nas duas
// tentativas que havia.
test('atribuirVagas: o aluno sem vaga que sai entre a leitura e a gravação, duas vezes, não deixa os outros sem vaga', async () => {
  const sessao = sessaoIndividual();
  await sessao.anf.criarSala();
  const honesto = sessao.novoAluno('honesto');
  await honesto.entrar();
  const atacante = sessao.novoAluno('atacante');
  await atacante.entrar();
  const host = sessao.canal.comoUsuario(HOST);
  let recusas = 0;
  const canal = {
    ...host,
    async gravar(escritas) {
      if (recusas >= 2 || !Object.keys(escritas).some((k) => k.endsWith('/equipe'))) return host.gravar(escritas);
      await atacante.canal.gravar({ [s('membros', 'atacante')]: null });
      try {
        return await host.gravar(escritas);
      } finally {
        recusas += 1;
        await atacante.entrar();
      }
    },
  };
  const anf = V.anfitriao.criar({ canal, config: sessao.config, sala: SALA, nomeRoteiro: '60min', agora: sessao.relogio.agora, uid: HOST, gerarSemente: () => 7 });
  await anf.carregarSala();

  const r = await anf.atribuirVagas();

  assert.equal(recusas, 2, 'as duas primeiras gravações foram recusadas');
  assert.equal(r.atribuidas, 2);
  assert.ok(await vagaDe(sessao, 'honesto'), 'o aluno honesto ganhou a vaga');
});

test('distribuirAtrasados no modo individual dá as vagas (é o que o telão e o simulador chamam quando alguém entra)', async () => {
  const { anf, alunos, ...sessao } = await salaComAlunos(4);
  assert.equal(await anf.distribuirAtrasados(), 4);
  assert.equal(await vagaDe(sessao, alunos[3].uid), 'e4');
});

// ---------- O jogo: decisão, apuração, resumo da turma ----------

// Lobby → personas → r1 aberta, com n alunos com vaga.
async function jogoAberto(n, opcoes) {
  const sessao = await salaComAlunos(n, opcoes);
  const { anf, relogio } = sessao;
  await anf.atribuirVagas();
  await anf.avancar(); // personas
  relogio.passar(1000);
  await anf.avancar(); // r1, decidindo
  assert.equal(anf.estado().subfase, 'decidindo');
  return sessao;
}

test('o jogo individual: cada vaga apura o próprio voto, só as vagas ocupadas jogam, e o resumo da turma bate', async () => {
  // Arrange: 5 alunos; u04 nunca vota (fica no padrão, "c" em jan–fev).
  const sessao = await jogoAberto(5, { sementes: [1, 2, 3] });
  const { anf, alunos, relogio, config } = sessao;
  const escolhas = { r1: ['a', 'a', 'b', 'e'], r2: ['b', 'c', 'c', 'd'], r3: ['c', 'd', 'a', 'c'] };
  const decidir = async (r) => {
    for (const [i, op] of escolhas[r].entries()) await alunos[i].decidir(r, `e${i + 1}`, op);
  };

  // Act + Assert: r1
  const telaDecisao = await telaDe(alunos[0]);
  assert.equal(telaDecisao.tipo, 'decisao');
  assert.equal(telaDecisao.dados.podeVotar, true);
  await decidir('r1');
  const decisoes = await sessao.host.ler(s('decisoes', 'r1'));
  const membros = await sessao.host.ler(s('membros'));
  assert.deepEqual(H.contagemDaDecisao(config, { estado: anf.estado(), membros, decisoes }), { escolheram: 4, total: 5 });
  await anf.encerrar();
  assert.equal(anf.estado().subfase, 'resultado', 'formato simples: direto ao resultado');
  const r1 = await sessao.host.ler(s('resultados', 'r1'));
  assert.deepEqual(Object.keys(r1).sort(), ['e1', 'e2', 'e3', 'e4', 'e5'], 'só as 5 vagas ocupadas');
  assert.deepEqual(['e1', 'e2', 'e3', 'e4', 'e5'].map((v) => [r1[v].decisao, r1[v].origem]),
    [['a', 'maioria'], ['a', 'maioria'], ['b', 'maioria'], ['e', 'maioria'], ['c', 'piloto']]);
  const porOpcao = H.contagemPorOpcao(config, 'r1', { r1 });
  assert.deepEqual(porOpcao.porOpcao.map((o) => `${o.letra}:${o.n}`), ['A:2', 'B:1', 'C:1', 'D:0', 'E:1']);
  assert.equal(porOpcao.pessoas, 5);
  assert.equal(porOpcao.semVoto, 1);
  assert.equal((await telaDe(alunos[0])).tipo, 'resultado');

  // r2: as costas travam para quem puxou 12 horas em jan–fev (e1 e e2).
  relogio.passar(1000);
  await anf.avancar(); // bloco
  await anf.avancar(); // r2
  await decidir('r2');
  await anf.encerrar();
  const resultados2 = await sessao.host.ler(s('resultados'));
  const costas = H.consequenciasDaTurma(config, 'r2', resultados2);
  assert.equal(costas.length, 1);
  assert.deepEqual(costas, [{ motivo: 'as costas travaram (2 bimestres puxados seguidos)', pessoas: 2, valores: [-1230] }]);
  // D-084: o mesmo resultado, por opção. As costas aparecem embaixo da opção de
  // quem foi atingido, e a soma das pessoas atingidas é a da turma; o saldo e a
  // família de cada opção são os das vagas que a escolheram.
  const porOpcao2 = H.resultadoPorOpcao(config, 'r2', resultados2);
  assert.equal(porOpcao2.pessoas, 5);
  assert.deepEqual(porOpcao2.porOpcao.map((o) => [o.id, o.n]), H.contagemPorOpcao(config, 'r2', resultados2).porOpcao.map((o) => [o.id, o.n]));
  const atingidas = porOpcao2.porOpcao.flatMap((o) => o.consequencias).filter((g) => g.motivo === costas[0].motivo);
  assert.equal(atingidas.reduce((soma, g) => soma + g.pessoas, 0), 2, 'as 2 pessoas das costas, distribuídas pelas opções');
  for (const o of porOpcao2.porOpcao) {
    const deles = ['e1', 'e2', 'e3', 'e4', 'e5'].filter((v) => resultados2.r2[v].decisao === o.id);
    assert.equal(o.n, deles.length, `${o.id}: quantas pessoas`);
    if (deles.length === 0) {
      assert.deepEqual([o.saldo, o.familia, o.consequencias], [null, null, []], `${o.id}: sem ninguém, sem valores`);
      continue;
    }
    const saldos = deles.map((v) => Math.round(resultados2.r2[v].mes.saldoMes) + 0);
    assert.equal(o.saldo.media, new Set(saldos).size > 1, `${o.id}: "em média" só quando os saldos variam`);
    if (!o.saldo.media) assert.equal(o.saldo.valor, saldos[0], `${o.id}: o saldo de todos`);
    const familias = deles.map((v) => H.dinheiroDaFamilia(resultados2.r2[v].depois));
    if (!o.familia.media) assert.deepEqual({ situacao: o.familia.situacao, valor: o.familia.valor }, familias[0], `${o.id}: a família de todos`);
  }

  // r3 e o placar final.
  await anf.avancar(); // bloco
  await anf.avancar(); // r3
  await decidir('r3');
  await anf.encerrar();
  await anf.avancar(); // placarFinal
  const resultados = await sessao.host.ler(s('resultados'));

  const escolhasTurma = H.escolhasDaTurma(config, resultados);
  assert.deepEqual(escolhasTurma.map((l) => l.rodadaId), ['r1', 'r2', 'r3']);
  assert.deepEqual(escolhasTurma.map((l) => l.pessoas), [5, 5, 5]);
  const fim = H.fimDoAnoDaTurma(config, resultados);
  assert.equal(fim.pessoas, 5);
  assert.equal(fim.positivos + fim.negativos, 5);
  assert.equal(fim.entraramDepois, 0);
  assert.deepEqual(fim.valores, [...fim.valores].sort((a, b) => b - a), 'do maior para o menor');
  const placar = await sessao.host.ler(s('placar'));
  const esperado = ['e1', 'e2', 'e3', 'e4', 'e5'].map((v) => H.dinheiroDaFamilia(placar[v])).map((d) => (d.situacao === 'devendo' ? -d.valor : d.valor));
  assert.deepEqual(fim.valores, esperado.sort((a, b) => b - a), 'o mesmo número que o celular de cada um mostra');

  // O celular no placar final: o próprio ano e o da turma, sem ranking.
  const final = await telaDe(alunos[0]);
  assert.equal(final.tipo, 'situacao');
  assert.equal(final.dados.final, true);
  assert.deepEqual(final.dados.turma, fim);

  // A exportação: só totais, nenhum uid.
  const exportado = await anf.exportarTotais();
  assert.deepEqual(exportado.resultados.r1.porOpcao, { a: 2, b: 1, c: 1, d: 0, e: 1 });
  assert.deepEqual([exportado.placar.pessoas, exportado.placar.positivos, exportado.placar.negativos], [5, fim.positivos, fim.negativos]);
  const texto = JSON.stringify(exportado);
  for (const a of alunos) assert.equal(texto.includes(a.uid), false, `${a.uid} não pode sair na exportação`);
  for (const v of ['e1', 'e2', 'e3']) assert.equal(texto.includes(`"${v}"`), false, 'nada por vaga');
});

test('sem prorrogação no modo individual: mesmo com dois votos diferentes na mesma vaga, vai direto à moeda', async () => {
  // Sem as travas, para forçar o impossível: duas pessoas na mesma vaga.
  const sessao = await jogoAberto(2, { travas: false });
  const { anf, host, alunos } = sessao;
  await host.gravar({ [s('membros', alunos[1].uid, 'equipe')]: 'e1' });
  await alunos[0].decidir('r1', 'e1', 'a');
  await alunos[1].decidir('r1', 'e1', 'b');

  await anf.encerrar();

  assert.equal(anf.estado().subfase, 'resultado', 'nada de "prorrogacao"');
  assert.equal(await host.ler(s('prorrogacoes', 'r1')), null);
  const r1 = await host.ler(s('resultados', 'r1'));
  assert.equal(r1.e1.origem, 'moeda');
  assert.ok(['a', 'b'].includes(r1.e1.decisao));
});

test('quem entra com a decisão aberta ganha vaga, acompanha sem votar, joga no padrão e fica fora da conta do fim do ano', async () => {
  const sessao = await jogoAberto(2);
  const { anf, relogio, config } = sessao;
  relogio.passar(5000);
  const atrasado = sessao.novoAluno('z-atrasado');
  await atrasado.entrar();
  await anf.atribuirVagas();
  assert.equal(await vagaDe(sessao, atrasado.uid), 'e3');

  const tela = await telaDe(atrasado);
  assert.deepEqual([tela.tipo, tela.dados.podeVotar, tela.dados.motivo], ['decisao', false, 'entrouDepois']);
  await assert.rejects(atrasado.decidir('r1', 'e3', 'a'), NEGADO);
  const decisoes = await sessao.host.ler(s('decisoes', 'r1'));
  const membros = await sessao.host.ler(s('membros'));
  assert.deepEqual(H.contagemDaDecisao(config, { estado: anf.estado(), membros, decisoes }), { escolheram: 0, total: 2 }, 'quem não pode votar fica fora do M');
  await anf.encerrar();
  assert.equal((await sessao.host.ler(s('resultados', 'r1'))).e3.origem, 'piloto');

  // Entrou no meio do ano (r2): fica fora da conta, contado à parte.
  relogio.passar(1000);
  await anf.avancar(); // bloco
  const tarde = sessao.novoAluno('z-tarde');
  await tarde.entrar();
  await anf.atribuirVagas();
  await anf.avancar(); // r2
  await anf.encerrar();
  const fim = H.fimDoAnoDaTurma(config, await sessao.host.ler(s('resultados')));
  assert.equal(fim.pessoas, 3);
  assert.equal(fim.entraramDepois, 1);
  assert.equal(H.fraseDosQueEntraramDepois(fim), '1 aluno entrou no meio do ano e não está nessa conta.');
});

// ---------- Sem celulares: "a turma" ----------

test('sem celulares (offline): o telão joga um caminho só, "a turma", com a escolha do apresentador', async () => {
  const sessao = sessaoIndividual({ semCelulares: true });
  const { anf, host, relogio, config } = sessao;
  await anf.criarSala();
  await anf.avancar(); // personas
  relogio.passar(1000);
  await anf.avancar(); // r1

  await anf.decidirPelaTurma('a');
  assert.deepEqual(anf.estado().equipesAbertas, { e1: true });
  assert.deepEqual(anf.estado().forcadas, { e1: 'a' });
  await anf.decidirPelaTurma(null);
  assert.equal(anf.estado().forcadas ?? null, null, 'null desfaz');
  await anf.decidirPelaTurma('b');
  await anf.encerrar();
  const r1 = await host.ler(s('resultados', 'r1'));
  assert.deepEqual(Object.keys(r1), ['e1'], 'um caminho só');
  assert.deepEqual([r1.e1.decisao, r1.e1.origem], ['b', 'apresentador']);

  // Em r2 o apresentador não escolhe: "a turma" fica no padrão, e a rodada nunca fecha vazia.
  await anf.avancar(); // bloco
  await anf.avancar(); // r2
  await anf.encerrar();
  const r2 = await host.ler(s('resultados', 'r2'));
  assert.deepEqual(Object.keys(r2), ['e1']);
  assert.equal(r2.e1.origem, 'piloto');
  assert.equal(H.fimDoAnoDaTurma(config, await host.ler(s('resultados'))).pessoas, 1);
});

test('sem celulares, sem decisão nenhuma: a primeira rodada também joga "a turma" no padrão', async () => {
  const sessao = sessaoIndividual({ semCelulares: true });
  const { anf, host, relogio } = sessao;
  await anf.criarSala();
  await anf.avancar();
  relogio.passar(1000);
  await anf.avancar();
  await anf.encerrar();
  const r1 = await host.ler(s('resultados', 'r1'));
  assert.deepEqual(Object.keys(r1), ['e1']);
  assert.equal(r1.e1.origem, 'piloto');
  assert.deepEqual(anf.estado().equipesAbertas, { e1: true });
});

// Revisão de 14/10 (achado 1): online, a rodada fechada antes de qualquer
// celular entrar (a rede da turma demorou) abria a e1 para sempre, sem dono. A
// e1 tirava um lugar dos 20 e era a única pessoa contada no placar.
test('com celulares, a rodada que fecha sem ninguém na sala fica sem resultado, e as 20 vagas continuam livres', async () => {
  const sessao = sessaoIndividual();
  const { anf, host, relogio, config } = sessao;
  await anf.criarSala();
  await anf.avancar(); // personas
  relogio.passar(1000);
  await anf.avancar(); // r1
  await anf.encerrar();
  assert.equal(anf.estado().subfase, 'resultado');
  assert.equal(anf.estado().equipesAbertas ?? null, null, 'nenhuma vaga aberta sem dono');
  assert.equal(await host.ler(s('resultados', 'r1')), null);

  const alunos = [];
  for (let i = 0; i < 20; i += 1) {
    const a = sessao.novoAluno(`u${String(i).padStart(2, '0')}`);
    await a.entrar();
    alunos.push(a);
  }
  const r = await anf.atribuirVagas();
  assert.deepEqual(r, { atribuidas: 20, semVaga: [] });
  assert.notEqual((await telaDe(alunos[19])).dados?.motivo, 'salaCheia');
  assert.equal(H.pessoasNaSala(config, { estado: anf.estado(), membros: await host.ler(s('membros')) }), 20);

  while (anf.estado().tipo !== 'placarFinal') {
    const e = anf.estado();
    if ((e.tipo === 'rodada' && e.subfase === 'decidindo') || (e.tipo === 'enquete' && e.subfase === 'votando')) await anf.encerrar();
    else {
      relogio.passar(1000);
      await anf.avancar();
    }
  }
  const fim = H.fimDoAnoDaTurma(config, await host.ler(s('resultados')));
  assert.equal(fim.pessoas, 20, 'as 20 contam: r1, sem resultado, fica fora da conta');
  assert.equal(fim.entraramDepois, 0);
});

test('"Continuar sem celulares" no meio do jogo: a escolha da turma vale para todas as vagas abertas', async () => {
  const sessao = await jogoAberto(3);
  const { anf, host } = sessao;
  await anf.decidirPelaTurma('d');
  assert.deepEqual(anf.estado().forcadas, { e1: 'd', e2: 'd', e3: 'd' });
  await anf.encerrar();
  const r1 = await host.ler(s('resultados', 'r1'));
  assert.deepEqual(Object.keys(r1).sort(), ['e1', 'e2', 'e3']);
  for (const v of ['e1', 'e2', 'e3']) assert.deepEqual([r1[v].decisao, r1[v].origem], ['d', 'apresentador']);
});

test('decidirPelaTurma: só no modo individual e só com a decisão aberta', async () => {
  const sessao = sessaoIndividual();
  await sessao.anf.criarSala();
  await assert.rejects(sessao.anf.decidirPelaTurma('a'), /decisão aberta/);
  const equipes = montarSessao(V);
  await equipes.anf.criarSala();
  await assert.rejects(equipes.anf.decidirPelaTurma('a'), /modo individual/);
  await assert.rejects(equipes.anf.atribuirVagas(), /modo individual/);
});

// ---------- O resumo da turma (historia), puro ----------

// D-084 (pedido do Kleber de 13/10 à noite): o resultado do bimestre por opção,
// com números feitos à mão. A: duas pessoas com o mesmo saldo e a mesma família
// depois do arredondamento (o valor, sem "em média") e a mesma consequência; B:
// três pessoas com valores diferentes (a média, arredondada) e as costas de duas
// delas (a de um efeito em duas partes, somadas, e a de um efeito só); C: ninguém.
test('resultadoPorOpcao: por opção, quantas pessoas, o saldo e a família (o valor ou a média) e as consequências, com quantas dessas pessoas', () => {
  const config = configIndividual();
  const [a, b, c, d] = config.rodadas.r2.ordemOpcoes;
  const depois = (renda, extra = {}) => ({ renda, emprestimo: 0, contas_atrasadas: 0, ...extra });
  const moto = { rotulo: 'a moto quebrou (revisão adiada): conserto', valor: -790 };
  const resultados = {
    r2: {
      e1: { decisao: a, origem: 'maioria', mes: { saldoMes: -1386.6 }, depois: depois(-3083), deAntes: [moto] },
      e2: { decisao: a, origem: 'maioria', mes: { saldoMes: -1387.4 }, depois: depois(-3082.6), deAntes: [moto] },
      e3: { decisao: b, origem: 'maioria', mes: { saldoMes: -100 }, depois: depois(500),
        deAntes: [{ rotulo: 'as costas travaram: 7 dias parado', valor: -1000 }, { rotulo: 'as costas travaram: fisioterapia', valor: -230 }] },
      e4: { decisao: b, origem: 'maioria', mes: { saldoMes: -300 }, depois: depois(-500, { emprestimo: 300 }) },
      e5: { decisao: b, origem: 'piloto', mes: { saldoMes: -201 }, depois: depois(-1), deAntes: [{ rotulo: 'as costas travaram: 7 dias parado', valor: -1230 }] },
      // D: a moto com dois valores e as costas no meio; o mesmo motivo fica junto.
      e6: { decisao: d, origem: 'maioria', mes: { saldoMes: -10 }, depois: depois(-10), deAntes: [{ ...moto, valor: -560 }] },
      e7: { decisao: d, origem: 'maioria', mes: { saldoMes: -10 }, depois: depois(-10), deAntes: [{ rotulo: 'as costas travaram: 7 dias parado', valor: -1230 }] },
      e8: { decisao: d, origem: 'maioria', mes: { saldoMes: -10 }, depois: depois(-10), deAntes: [moto] },
    },
  };

  const r = H.resultadoPorOpcao(config, 'r2', resultados);

  assert.deepEqual([r.pessoas, r.semVoto], [8, 1]);
  const [oa, ob, oc, od] = r.porOpcao;
  assert.deepEqual([oa.id, oa.letra, oa.n, oa.saldo, oa.familia, oa.consequencias], [a, 'A', 2, { valor: -1387, media: false },
    { situacao: 'devendo', valor: 3083, media: false }, [{ motivo: 'a moto quebrou (revisão adiada)', valor: -790, pessoas: 2 }]]);
  // B: saldos −100, −300 e −201 (média −200,3); família +500, −800 e −1 (média −100,3).
  assert.deepEqual([ob.id, ob.n, ob.saldo, ob.familia, ob.consequencias], [b, 3, { valor: -200, media: true },
    { situacao: 'devendo', valor: 100, media: true }, [{ motivo: 'as costas travaram', valor: -1230, pessoas: 2 }]]);
  assert.deepEqual([oc.id, oc.n, oc.saldo, oc.familia, oc.consequencias], [c, 0, null, null, []]);
  assert.deepEqual([od.n, od.saldo, od.familia], [3, { valor: -10, media: false }, { situacao: 'devendo', valor: 10, media: false }]);
  assert.deepEqual(od.consequencias, [
    { motivo: 'a moto quebrou (revisão adiada)', valor: -560, pessoas: 1 },
    { motivo: 'a moto quebrou (revisão adiada)', valor: -790, pessoas: 1 },
    { motivo: 'as costas travaram', valor: -1230, pessoas: 1 },
  ], 'o mesmo motivo junto, na ordem em que aparece');
  assert.equal(oa.rotulo, H.textoDaOpcao(config, 'r2', a, 'motoboy').rotulo);
  // A frase das pessoas atingidas.
  assert.equal(H.quantasDessas(3, 5), '3 dessas pessoas');
  assert.equal(H.quantasDessas(1, 4), '1 dessas pessoas');
  assert.equal(H.quantasDessas(1, 1), '1 pessoa');
  // Família em zero conta como "tem" (a régua do "fechou", patrimônio ≥ 0).
  const zero = H.resultadoPorOpcao(config, 'r2', { r2: { e1: { decisao: a, mes: { saldoMes: 0 }, depois: depois(0) } } });
  assert.deepEqual(zero.porOpcao[0].familia, { situacao: 'tem', valor: 0, media: false });
});

test('pessoasNaSala: conta quem tem vaga aberta, uma vez por vaga', () => {
  const cfg = configIndividual();
  const estado = { equipesAbertas: { e1: true, e2: true, e3: true } };
  const membros = { a: { entrouEm: 1, equipe: 'e1' }, b: { entrouEm: 1, equipe: 'e2' }, c: { entrouEm: 1 }, d: { entrouEm: 1, equipe: 'e9' } };
  assert.equal(H.pessoasNaSala(cfg, { estado, membros }), 2);
  assert.equal(H.pessoasNaSala(cfg, { estado: {}, membros }), 0);
});

test('contagemDaDecisao: a vaga decidida pelo apresentador conta, e quem sumiu sem votar sai do M', () => {
  const cfg = configIndividual();
  const estado = { abertoEm: 100, equipesAbertas: { e1: true, e2: true, e3: true, e4: true }, forcadas: { e4: 'a' } };
  const membros = { a: { entrouEm: 50, equipe: 'e1' }, b: { entrouEm: 60, equipe: 'e2' }, c: { entrouEm: 70, equipe: 'e3' } };
  const decisoes = { e1: { a: 'b' } };
  assert.deepEqual(H.contagemDaDecisao(cfg, { estado, membros, decisoes }), { escolheram: 2, total: 4 });
  assert.deepEqual(H.contagemDaDecisao(cfg, { estado, membros, decisoes, ativos: new Set(['a', 'b']) }), { escolheram: 2, total: 3 });
});

test('fimDoAnoDaTurma e a frase: positivos (R$ 0 ou mais) e negativos somam todos; singular, plural e "nenhum"', () => {
  const cfg = configIndividual();
  const depois = (renda) => ({ depois: { renda, emprestimo: 0, contas_atrasadas: 0 } });
  const resultados = {
    r1: { e1: depois(10), e2: depois(-10), e3: depois(0) },
    r2: { e1: depois(500), e2: depois(-0.4), e3: depois(-1200), e4: depois(300) },
  };
  const fim = H.fimDoAnoDaTurma(cfg, resultados);
  assert.deepEqual(fim, { pessoas: 3, positivos: 2, negativos: 1, media: Math.round((500 + 0 - 1200) / 3), valores: [500, 0, -1200], entraramDepois: 1, rodadas: 2 });
  assert.equal(H.fraseDoFimDaTurma(fim), 'De 3 alunos, 2 terminaram com dinheiro sobrando e 1 terminou devendo.');
  assert.equal(H.fraseDoFimDaTurma({ pessoas: 18, positivos: 3, negativos: 15 }), 'De 18 alunos, 3 terminaram com dinheiro sobrando e 15 terminaram devendo.');
  assert.equal(H.fraseDoFimDaTurma({ pessoas: 1, positivos: 0, negativos: 1 }), 'De 1 aluno, nenhum terminou com dinheiro sobrando e 1 terminou devendo.');
  assert.equal(H.fraseDoFimDaTurma({ pessoas: 0, positivos: 0, negativos: 0 }), null);
  assert.equal(H.fraseDosQueEntraramDepois({ entraramDepois: 2 }), '2 alunos entraram no meio do ano e não estão nessa conta.');
  assert.equal(H.fraseDosQueEntraramDepois({ entraramDepois: 0 }), null);
  assert.deepEqual(H.fimDoAnoDaTurma(cfg, null), { pessoas: 0, positivos: 0, negativos: 0, media: null, valores: [], entraramDepois: 0, rodadas: 0 });
});

// ---------- O celular: os dados do bloco (pedido do Kleber de 13/10, 21h) ----------

test('o bloco de dados também no celular: título, contexto, itens e fonte, do roteiro congelado na sala', async () => {
  const sessao = await jogoAberto(1);
  const { anf, alunos } = sessao;
  await anf.encerrar();
  await anf.avancar(); // o bloco com contexto, itens e fonte

  const tela = await telaDe(alunos[0]);

  assert.equal(tela.tipo, 'situacao');
  assert.deepEqual(tela.dados.bloco, {
    titulo: 'Dados: quem trabalha por aplicativo', contexto: 'No app não há jornada fixa.',
    itens: ['44,9 horas por semana.', 'R$ 2.221 por mês.'], fonte: 'IBGE, PNAD 2025 (ilustrativo de teste).',
  });
  // O bloco seguinte não tem nada além do título: a tela fica como antes, sem o campo.
  await anf.avancar(); // r2
  await anf.encerrar();
  await anf.avancar();
  assert.equal(Object.hasOwn((await telaDe(alunos[0])).dados, 'bloco'), false);
});

// ---------- anfitriao.soMudaramAsVagas (para o telão não descartar o comando) ----------

test('soMudaramAsVagas: só a geracao e as vagas abertas mudaram (o comando na fila ainda vale); passo ou subfase mudou, não', () => {
  const antes = { geracao: 4, indice: 0, tipo: 'lobby', subfase: 'ativo', equipesTravadas: true, restanteMs: null };
  const comVaga = { indice: 0, tipo: 'lobby', subfase: 'ativo', equipesTravadas: true, geracao: 5, equipesAbertas: { e1: true } };
  assert.equal(V.anfitriao.soMudaramAsVagas(antes, comVaga), true);
  assert.equal(V.anfitriao.soMudaramAsVagas(antes, { ...comVaga, indice: 1, tipo: 'enquete' }), false);
  assert.equal(V.anfitriao.soMudaramAsVagas(antes, { ...comVaga, subfase: 'fechando' }), false);
  assert.equal(V.anfitriao.soMudaramAsVagas(antes, { ...comVaga, forcadas: { e1: 'a' } }), false);
  assert.equal(V.anfitriao.soMudaramAsVagas(null, comVaga), false);
});

test('soMudaramAsVagas com o anfitrião de verdade: o estado antes e depois de atribuirVagas', async () => {
  const sessao = await salaComAlunos(2);
  const antes = structuredClone(sessao.anf.estado());
  await sessao.anf.atribuirVagas();
  assert.equal(V.anfitriao.soMudaramAsVagas(antes, await sessao.host.ler(s('estado'))), true);
  await sessao.anf.avancar();
  assert.equal(V.anfitriao.soMudaramAsVagas(antes, sessao.anf.estado()), false);
});
