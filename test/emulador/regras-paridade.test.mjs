// Paridade entre as travas do canal-local e as regras reais (firebase/regras.json)
// no emulador. O canal-local é a especificação executável (contratos, seção 6):
// cada cenário abaixo roda IGUAL nos dois ambientes, e cada passo tem de ser
// aceito ou recusado do mesmo jeito. Se as regras aceitarem algo que o
// canal-local recusa (ou o contrário), o offline e o online deixam de ser o mesmo
// sistema (I7), e o erro só apareceria na aula.
//
// Roda com: npm run emulador
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from '../carregar-nucleo.mjs';
import { novoCanalNoEmulador, administrador, namespaceComRegras, PIN_EMULADOR } from '../../bin/emulador.mjs';

const V = await carregarNucleo();
const PIN = PIN_EMULADOR;
// A versão que as regras publicadas aceitam em regrasVersao, lida do próprio
// arquivo (test/regras.test.mjs amarra o valor ao conteúdo das regras).
const VERSAO_REGRAS = JSON.parse(readFileSync(join(RAIZ, 'firebase', 'regras.json'), 'utf8')).rules.regrasVersao.$uid['.validate'].match(/=== '([^']+)'/)[1];
const GRACA_MS = 5000;

// Salas "P???" são deste arquivo: os arquivos de test/emulador/ rodam em
// paralelo no mesmo emulador, cada um com o seu prefixo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let contadorSalas = Math.floor(Math.random() * 1000);
function novaSala() {
  contadorSalas += 1;
  let n = contadorSalas;
  let codigo = '';
  for (let i = 0; i < 3; i += 1) {
    codigo += ALFABETO[n % 32];
    n = Math.floor(n / 32);
  }
  return 'P' + codigo;
}

// O PIN é semeado antes de tudo: outro arquivo (ou uma execução anterior) pode
// ter deixado outro valor no emulador.
before(() => administrador('PUT', 'privado/pinApresentador', PIN));

const abertos = [];
after(async () => {
  await Promise.all(abertos.map((c) => c.fechar()));
});

// ---------- Os dois ambientes, com a mesma cara ----------

function ambienteLocal() {
  // A hora fica parada até a próxima volta do laço de eventos, como o "now" único
  // de uma escrita no servidor. Com o Date.now puro, virar o milissegundo entre o
  // marcadorDeHora() e a trava "entrouEm === agora" recusava a entrada de vez em
  // quando (o teste falhou em 2 de 6 rodadas). É o mesmo relógio do
  // bin/simular-alunos.mjs, que anda pelo menos 1 ms a cada volta.
  let congelada = null;
  let ultima = 0;
  const relogio = () => {
    if (congelada === null) {
      congelada = Math.max(Date.now(), ultima + 1);
      ultima = congelada;
      setImmediate(() => { congelada = null; });
    }
    return congelada;
  };
  const base = V.canalLocal.criar({ relogio });
  // Como no projeto real, o PIN fica em privado/, que nenhuma conta escreve.
  base.importar({ privado: { pinApresentador: PIN } });
  return {
    nome: 'local',
    async usuario(rotulo) {
      const canal = base.comoUsuario(rotulo);
      return { canal, uid: await canal.entrar() };
    },
    semLogin: async () => base,
  };
}

function ambienteEmulador() {
  return {
    nome: 'emulador',
    async usuario(rotulo) {
      const canal = await novoCanalNoEmulador(rotulo);
      abertos.push(canal);
      return { canal, uid: await canal.entrar() };
    },
    async semLogin() {
      const canal = await novoCanalNoEmulador('sem-login');
      abertos.push(canal);
      return canal;
    },
  };
}

// Um passo: roda, classifica e confere com o esperado. Recusa é só a da regra
// (PERMISSION_DENIED); qualquer outro erro é defeito do teste ou do canal.
function registrador(amb) {
  const falhas = [];
  return {
    falhas,
    async tentar(rotulo, fn, esperado) {
      let obtido;
      try {
        await fn();
        obtido = 'aceito';
      } catch (erro) {
        obtido = /PERMISSION_DENIED/.test(String(erro?.message)) ? 'recusado' : `erro: ${erro?.message}`;
      }
      if (obtido !== esperado) falhas.push(`[${amb.nome}] ${rotulo}: esperado ${esperado}, veio ${obtido}`);
    },
  };
}

const CONTEUDO = {
  tempos: { gracaSeg: GRACA_MS / 1000 },
  equipes: { e1: { id: 'e1' }, e2: { id: 'e2' } },
  rodadas: { r1: { opcoes: { a: { id: 'a' }, b: { id: 'b' } } } },
  enquetes: { q: { afirmacoes: { a1: { id: 'a1' }, a2: { id: 'a2' } } } },
};

// A sala mínima dos testes do canal-local: meta (sozinha, com o PIN), depois
// conteudo e estado, gravados pelo anfitrião.
async function salaPronta(amb, { estado = {} } = {}) {
  const S = 'salas/' + novaSala();
  if (amb.nome === 'emulador') await administrador('DELETE', S);
  const h = await amb.usuario('h');
  await h.canal.gravar({ [`pedidosAnfitriao/${h.uid}`]: PIN });
  const t = h.canal.agora();
  await h.canal.gravar({ [`${S}/meta`]: { hostUid: h.uid, criadaEm: t, expiraEm: t + 3_600_000, entradaAberta: true } });
  await h.canal.gravar({ [`${S}/conteudo`]: CONTEUDO, [`${S}/estado`]: { geracao: 1, tipo: 'lobby', subfase: 'ativo', ...estado } });
  const mudarEstado = (mudanca) => h.canal.transacao(`${S}/estado`, (atual) => (atual ? { ...atual, ...mudanca, geracao: atual.geracao + 1 } : undefined));
  async function membro(rotulo, equipe) {
    const a = await amb.usuario(rotulo);
    await a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm: a.canal.marcadorDeHora() } });
    if (equipe) await h.canal.gravar({ [`${S}/membros/${a.uid}/equipe`]: equipe });
    return a;
  }
  return { S, h, mudarEstado, membro };
}

// Roda o cenário nos dois ambientes e junta as divergências numa mensagem só.
function paridade(nome, cenario) {
  test(nome, async () => {
    const falhas = [];
    for (const amb of [ambienteLocal(), ambienteEmulador()]) {
      const r = registrador(amb);
      await cenario(amb, r.tentar);
      falhas.push(...r.falhas);
    }
    assert.deepEqual(falhas, []);
  });
}

// ---------- Cenários: os mesmos casos de test/canal-local.test.mjs ----------

paridade('sem login não grava', async (amb, tentar) => {
  const anonimo = await amb.semLogin();
  await tentar('meta sem login', () => anonimo.gravar({ 'salas/ZZZZ/meta': { hostUid: 'x' } }), 'recusado');
  await tentar('pedido sem login', () => anonimo.gravar({ 'pedidosAnfitriao/x': 'um pin qualquer' }), 'recusado');
});

paridade('estado só com geracao = anterior + 1, e só as chaves conhecidas', async (amb, tentar) => {
  const { S, h } = await salaPronta(amb);
  await tentar('geracao solta 5', () => h.canal.gravar({ [`${S}/estado/geracao`]: 5 }), 'recusado');
  await tentar('estado com geracao 1 de novo', () => h.canal.gravar({ [`${S}/estado`]: { geracao: 1, tipo: 'bloco' } }), 'recusado');
  await tentar('estado com geracao 2', () => h.canal.gravar({ [`${S}/estado`]: { geracao: 2, tipo: 'bloco' } }), 'aceito');
  await tentar('campo novo', () => h.canal.gravar({ [`${S}/estado/campoNovo`]: 1, [`${S}/estado/geracao`]: 3 }), 'recusado');
  // Todas as chaves de CHAVES_ESTADO, inclusive os mapas, passam juntas.
  const completo = {
    geracao: 3, indice: 4, tipo: 'rodada', subfase: 'prorrogacao', rodada: 'r1', enquete: 'q', momento: 'antes', afirmacao: '*',
    abertoEm: 1, prazo: 2, restanteMs: 3, equipesTravadas: true, equipesAbertas: { e1: true, e2: true },
    forcadas: { e1: 'a' }, empatadas: { e2: { a: true, b: true } }, manual: { a1: [1, 2, 3, 4, 5] },
  };
  await tentar('estado com todas as chaves', () => h.canal.gravar({ [`${S}/estado`]: completo }), 'aceito');
  await tentar('regravar o mesmo estado', () => h.canal.gravar({ [`${S}/estado`]: completo }), 'recusado');
});

paridade('aluno não escreve estado, meta, conteudo, resultados, placar, sementes nem pulso', async (amb, tentar) => {
  const { S, membro } = await salaPronta(amb);
  const a = await membro('a');
  for (const [caminho, valor] of [
    ['estado', { geracao: 2 }], ['meta/entradaAberta', false], ['conteudo/x', 1],
    ['resultados/r1', { e1: { carta: 'x' } }], ['placar/e1', { renda: 9 }], ['sementes/r1', 1], ['pulso', a.canal.marcadorDeHora()],
  ]) {
    await tentar(`aluno em ${caminho}`, () => a.canal.gravar({ [`${S}/${caminho}`]: valor }), 'recusado');
  }
});

paridade('criar sala: meta inexistente, hostUid do próprio (com o PIN, que online é obrigatório)', async (amb, tentar) => {
  const { S } = await salaPronta(amb);
  const intruso = await amb.usuario('intruso');
  const nova = 'salas/' + novaSala();
  const outra = 'salas/' + novaSala();
  await tentar('tomar o anfitrião sem PIN', () => intruso.canal.gravar({ [`${S}/meta/hostUid`]: intruso.uid }), 'recusado');
  await intruso.canal.gravar({ [`pedidosAnfitriao/${intruso.uid}`]: PIN });
  await tentar('criar sala nova', () => intruso.canal.gravar({ [`${nova}/meta`]: { hostUid: intruso.uid } }), 'aceito');
  await tentar('criar sala para outro uid', () => intruso.canal.gravar({ [`${outra}/meta`]: { hostUid: 'outro' } }), 'recusado');
  await tentar('campo desconhecido na meta', () => intruso.canal.gravar({ [`${nova}/meta/lixo`]: 1 }), 'recusado');
});

paridade('semente: gravada uma vez, nunca alterada nem apagada', async (amb, tentar) => {
  const { S, h } = await salaPronta(amb);
  await tentar('semente nova', () => h.canal.gravar({ [`${S}/sementes/r1`]: 99 }), 'aceito');
  await tentar('trocar semente', () => h.canal.gravar({ [`${S}/sementes/r1`]: 100 }), 'recusado');
  await tentar('apagar semente', () => h.canal.gravar({ [`${S}/sementes/r1`]: null }), 'recusado');
  await tentar('semente texto', () => h.canal.gravar({ [`${S}/sementes/r2`]: 'texto' }), 'recusado');
  await tentar('regravar a mesma semente', () => h.canal.gravar({ [`${S}/sementes/r1`]: 99 }), 'recusado');
  assert.equal(await h.canal.ler(`${S}/sementes/r1`), 99);
});

// D-035: a marca de prorrogação da rodada tem a trava da semente, só com true.
paridade('prorrogação da rodada: marcada uma vez, só true, nunca apagada; só o anfitrião escreve e lê', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb);
  const a = await membro('a', 'e1');
  await tentar('aluno marca a prorrogação', () => a.canal.gravar({ [`${S}/prorrogacoes/r1`]: true }), 'recusado');
  await tentar('marcar a prorrogação', () => h.canal.gravar({ [`${S}/prorrogacoes/r1`]: true }), 'aceito');
  await tentar('regravar a marca', () => h.canal.gravar({ [`${S}/prorrogacoes/r1`]: true }), 'recusado');
  await tentar('apagar a marca', () => h.canal.gravar({ [`${S}/prorrogacoes/r1`]: null }), 'recusado');
  await tentar('aluno apaga a marca', () => a.canal.gravar({ [`${S}/prorrogacoes/r1`]: null }), 'recusado');
  for (const valor of [false, 1, 'sim', { x: true }]) {
    await tentar(`marca ${JSON.stringify(valor)}`, () => h.canal.gravar({ [`${S}/prorrogacoes/r2`]: valor }), 'recusado');
  }
  await tentar('marcas pelo nó de cima', () => h.canal.gravar({ [`${S}/prorrogacoes`]: { r3: true } }), 'recusado');
  await tentar('marca junto com o estado', () => h.canal.gravar({
    [`${S}/prorrogacoes/r2`]: true, [`${S}/estado`]: { geracao: 2, tipo: 'rodada', subfase: 'prorrogacao', rodada: 'r2' },
  }), 'aceito');
  await tentar('aluno lê a marca', () => a.canal.ler(`${S}/prorrogacoes/r1`), 'recusado');
  await tentar('aluno lê as marcas', () => a.canal.ler(`${S}/prorrogacoes`), 'recusado');
  await tentar('anfitrião lê a marca', () => h.canal.ler(`${S}/prorrogacoes/r1`), 'aceito');
  assert.equal(await h.canal.ler(`${S}/prorrogacoes/r1`), true);
});

paridade('resultados e apurações: gravados uma vez; apagar é permitido', async (amb, tentar) => {
  const { S, h } = await salaPronta(amb);
  const resultado = { e1: { carta: 'x' } };
  await tentar('resultado e apuração', () => h.canal.gravar({ [`${S}/resultados/r1`]: resultado, [`${S}/enquetes/q/antes`]: { n: { a1: 1 } } }), 'aceito');
  await tentar('remendar resultado', () => h.canal.gravar({ [`${S}/resultados/r1/e2`]: { carta: 'y' } }), 'recusado');
  await tentar('remendar apuração', () => h.canal.gravar({ [`${S}/enquetes/q/antes/n/a1`]: 2 }), 'recusado');
  await tentar('regravar resultado igual', () => h.canal.gravar({ [`${S}/resultados/r1`]: resultado }), 'recusado');
  await tentar('regravar equipe igual', () => h.canal.gravar({ [`${S}/resultados/r1/e1`]: resultado.e1 }), 'recusado');
  await tentar('apagar resultado', () => h.canal.gravar({ [`${S}/resultados/r1`]: null }), 'aceito');
  await tentar('gravar de novo depois de apagar', () => h.canal.gravar({ [`${S}/resultados/r1`]: { e1: { carta: 'z' } } }), 'aceito');
  await tentar('resultados inteiro (acima do nível)', () => h.canal.gravar({ [`${S}/resultados`]: { r2: resultado } }), 'recusado');
});

paridade('membro: entrada aberta, em nome próprio, entrouEm = hora do servidor e nenhum outro campo', async (amb, tentar) => {
  const { S, h } = await salaPronta(amb);
  const a = await amb.usuario('a');
  await tentar('entrouEm forjado', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm: 1 } }), 'recusado');
  await tentar('membro de outro uid', () => a.canal.gravar({ [`${S}/membros/outro`]: { entrouEm: a.canal.marcadorDeHora() } }), 'recusado');
  await tentar('campo pessoal', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm: a.canal.marcadorDeHora(), nome: 'Ana' } }), 'recusado');
  await tentar('entrar', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm: a.canal.marcadorDeHora() } }), 'aceito');
  const entrouEm = (await a.canal.ler(`${S}/membros/${a.uid}`)).entrouEm;
  await tentar('regravar com a mesma entrouEm', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm } }), 'aceito');
  await tentar('forjar entrouEm do próprio', () => a.canal.gravar({ [`${S}/membros/${a.uid}/entrouEm`]: entrouEm - 60_000 }), 'recusado');
  // Revisão da F2, achado 6: a mesma entrouEm pela folha passa nos dois.
  await new Promise((r) => setTimeout(r, 20));
  await tentar('regravar a mesma entrouEm pela folha', () => a.canal.gravar({ [`${S}/membros/${a.uid}/entrouEm`]: entrouEm }), 'aceito');
  await h.canal.gravar({ [`${S}/meta/entradaAberta`]: false });
  const b = await amb.usuario('b');
  await tentar('entrada fechada', () => b.canal.gravar({ [`${S}/membros/${b.uid}`]: { entrouEm: b.canal.marcadorDeHora() } }), 'recusado');
});

// Revisão da F2, achado 1: sem .validate no nó do membro, um valor solto (texto
// de MB, número, true) passava com a entrada aberta, até depois da trava: não
// tem filhos para as regras de entrouEm, equipe e $outro olharem.
paridade('achado 1: o nó do membro é um objeto com entrouEm; valor solto é recusado', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb, { estado: { equipesTravadas: true } });
  const a = await amb.usuario('a');
  for (const solto of ['x'.repeat(100_000), 42, true]) {
    await tentar(`membro = ${JSON.stringify(solto).slice(0, 10)}`, () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: solto }), 'recusado');
  }
  await tentar('anfitrião põe equipe em quem não é membro', () => h.canal.gravar({ [`${S}/membros/ninguem/equipe`]: 'e1' }), 'recusado');
  const b = await membro('b', 'e1');
  await tentar('apagar só a entrouEm (fica só a equipe)', () => h.canal.gravar({ [`${S}/membros/${b.uid}/entrouEm`]: null }), 'recusado');
  await tentar('apagar o membro inteiro', () => h.canal.gravar({ [`${S}/membros/${b.uid}`]: null }), 'aceito');
});

// Achado 3: o .write da equipe concedia sozinho, sem olhar a entrada nem o
// prazo: um uid qualquer virava membro gravando só a equipe, e depois
// registrava presença e votava na enquete.
paridade('achado 3: sem registro de membro, gravar só a equipe não faz entrar (entrada fechada ou sala expirada)', async (amb, tentar) => {
  const { S, h, mudarEstado } = await salaPronta(amb, { estado: { tipo: 'formarEquipes', equipesAbertas: { e1: true, e2: true }, equipesTravadas: false } });
  await h.canal.gravar({ [`${S}/meta/entradaAberta`]: false });
  const x = await amb.usuario('x');
  await tentar('entrar com a entrada fechada', () => x.canal.gravar({ [`${S}/membros/${x.uid}`]: { entrouEm: x.canal.marcadorDeHora() } }), 'recusado');
  await tentar('só a equipe, com a entrada fechada', () => x.canal.gravar({ [`${S}/membros/${x.uid}/equipe`]: 'e1' }), 'recusado');
  await tentar('presença de quem não entrou', () => x.canal.gravar({ [`${S}/presenca/${x.uid}`]: x.canal.marcadorDeHora() }), 'recusado');
  await mudarEstado({ tipo: 'enquete', enquete: 'q', momento: 'antes', subfase: 'votando', afirmacao: '*', prazo: h.canal.agora() + 60_000 });
  await tentar('voto de enquete de quem não entrou', () => x.canal.gravar({ [`${S}/votosEnquete/q/antes/a1/${x.uid}`]: 1 }), 'recusado');
  await mudarEstado({ tipo: 'formarEquipes', subfase: 'ativo', enquete: null, momento: null, afirmacao: null, prazo: null });
  await h.canal.gravar({ [`${S}/meta/entradaAberta`]: true, [`${S}/meta/expiraEm`]: h.canal.agora() - 1000 });
  await tentar('só a equipe, com a sala expirada', () => x.canal.gravar({ [`${S}/membros/${x.uid}/equipe`]: 'e2' }), 'recusado');
  assert.equal(await h.canal.ler(`${S}/membros/${x.uid}`), null);
});

paridade('equipe: só aberta, só antes da trava; o anfitrião move a qualquer hora', async (amb, tentar) => {
  const { S, h, mudarEstado, membro } = await salaPronta(amb, { estado: { equipesAbertas: { e1: true } } });
  const a = await membro('a');
  const eq = `${S}/membros/${a.uid}/equipe`;
  await tentar('equipe fechada', () => a.canal.gravar({ [eq]: 'e2' }), 'recusado');
  await tentar('equipe aberta', () => a.canal.gravar({ [eq]: 'e1' }), 'aceito');
  await mudarEstado({ equipesTravadas: true });
  await tentar('mesma equipe depois da trava', () => a.canal.gravar({ [eq]: 'e1' }), 'recusado');
  await tentar('nó inteiro com entrouEm nova', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm: a.canal.marcadorDeHora(), equipe: 'e2' } }), 'recusado');
  await tentar('anfitrião move', () => h.canal.gravar({ [eq]: 'e2' }), 'aceito');
  await tentar('anfitrião, equipe inexistente', () => h.canal.gravar({ [eq]: 'e9' }), 'recusado');
  assert.equal(await h.canal.ler(eq), 'e2');
});

// Achado 15 (contratos, seção 6): no Firebase o .write de membros/$uid vale para
// os filhos. Sem a conferência no .write e no .validate, o aluno trocaria de
// equipe depois da trava regravando o nó inteiro.
paridade('achado 15: depois da trava, regravar o nó inteiro do membro não troca de equipe', async (amb, tentar) => {
  const { S, mudarEstado, membro } = await salaPronta(amb, { estado: { equipesAbertas: { e1: true, e2: true } } });
  const a = await membro('a', 'e1');
  const entrouEm = (await a.canal.ler(`${S}/membros/${a.uid}`)).entrouEm;
  await mudarEstado({ equipesTravadas: true });
  await tentar('nó inteiro com a entrouEm antiga', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm, equipe: 'e2' } }), 'recusado');
  await tentar('nó inteiro sem equipe (sair da equipe)', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm } }), 'recusado');
  await tentar('apagar a equipe', () => a.canal.gravar({ [`${S}/membros/${a.uid}/equipe`]: null }), 'recusado');
  // O .validate do Firebase roda em todo filho do nó gravado, mudado ou não: a
  // equipe regravada depois da trava é recusada, e o canal-local faz o mesmo.
  await tentar('regravar o mesmo nó com a equipe', () => a.canal.gravar({ [`${S}/membros/${a.uid}`]: { entrouEm, equipe: 'e1' } }), 'recusado');
  assert.equal((await a.canal.ler(`${S}/membros/${a.uid}`)).equipe, 'e1');
});

paridade('presença: só do próprio membro, com a hora do servidor', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb);
  const z = await amb.usuario('z');
  const a = await membro('a');
  await tentar('não membro', () => z.canal.gravar({ [`${S}/presenca/${z.uid}`]: z.canal.marcadorDeHora() }), 'recusado');
  await tentar('blob na presença', () => a.canal.gravar({ [`${S}/presenca/${a.uid}`]: 'x'.repeat(100_000) }), 'recusado');
  await tentar('presença de outro uid', () => a.canal.gravar({ [`${S}/presenca/${z.uid}`]: a.canal.marcadorDeHora() }), 'recusado');
  await tentar('anfitrião na presença', () => h.canal.gravar({ [`${S}/presenca/${a.uid}`]: h.canal.marcadorDeHora() }), 'recusado');
  await tentar('presença', () => a.canal.gravar({ [`${S}/presenca/${a.uid}`]: a.canal.marcadorDeHora() }), 'aceito');
});

paridade('voto de enquete: etapa, afirmação da vez, prazo + graça, 1 a 5 e a própria chave', async (amb, tentar) => {
  const { S, h, mudarEstado, membro } = await salaPronta(amb);
  const a = await membro('a');
  const voto = (afirm, v, dono = a.uid) => () => a.canal.gravar({ [`${S}/votosEnquete/q/antes/${afirm}/${dono}`]: v });
  const agora = () => h.canal.agora();
  await tentar('fora de votação', voto('a1', 3), 'recusado');
  await mudarEstado({ tipo: 'enquete', enquete: 'q', momento: 'antes', subfase: 'votando', afirmacao: 'a1', prazo: agora() + 60_000 });
  await tentar('afirmação fora da vez', voto('a2', 3), 'recusado');
  await tentar('em nome de outro uid', voto('a1', 3, 'outro'), 'recusado');
  for (const invalido of [0, 6, 2.5, '5']) await tentar(`voto ${JSON.stringify(invalido)}`, voto('a1', invalido), 'recusado');
  await tentar('voto 3', voto('a1', 3), 'aceito');
  await mudarEstado({ prazo: agora() - GRACA_MS / 2 });
  await tentar('dentro da graça', voto('a1', 4), 'aceito');
  await mudarEstado({ prazo: agora() - GRACA_MS - 2000 });
  await tentar('depois do prazo + graça', voto('a1', 5), 'recusado');
  await mudarEstado({ afirmacao: '*', prazo: agora() + 60_000 });
  await tentar('afirmação inexistente', voto('zz', 3), 'recusado');
  await tentar('modo todas', voto('a2', 1), 'aceito');
  await mudarEstado({ prazo: null, restanteMs: 30_000 });
  await tentar('etapa pausada', voto('a2', 2), 'recusado');
  await mudarEstado({ prazo: agora() + 60_000, restanteMs: null, subfase: 'fechando' });
  await tentar('fechando', voto('a2', 2), 'recusado');
  const naoMembro = await amb.usuario('nm');
  await mudarEstado({ subfase: 'votando' });
  await tentar('não membro', () => naoMembro.canal.gravar({ [`${S}/votosEnquete/q/antes/a1/${naoMembro.uid}`]: 3 }), 'recusado');
  assert.equal(await h.canal.ler(`${S}/votosEnquete/q/antes/a1/${a.uid}`), 4);
});

paridade('decisão: própria equipe, decisão aberta, entrou antes, opção existente; prorrogação só empatadas', async (amb, tentar) => {
  const { S, h, mudarEstado, membro } = await salaPronta(amb);
  const a = await membro('a', 'e1');
  const agora = () => h.canal.agora();
  const decidir = (quem, eq, op, dono = quem.uid) => () => quem.canal.gravar({ [`${S}/decisoes/r1/${eq}/${dono}`]: op });
  await tentar('rodada fechada', decidir(a, 'e1', 'a'), 'recusado');
  await new Promise((r) => setTimeout(r, 5));
  await mudarEstado({ tipo: 'rodada', rodada: 'r1', subfase: 'decidindo', abertoEm: agora(), prazo: agora() + 60_000 });
  await new Promise((r) => setTimeout(r, 5));
  const tardio = await membro('t', 'e1');
  const novo = await membro('n', 'e2');
  await tentar('outra equipe', decidir(a, 'e2', 'a'), 'recusado');
  await tentar('opção inexistente', decidir(a, 'e1', 'zz'), 'recusado');
  await tentar('entrou depois de abrir', decidir(tardio, 'e1', 'a'), 'recusado');
  await tentar('uid novo em outra equipe', decidir(novo, 'e1', 'a'), 'recusado');
  await tentar('em nome de outro uid', decidir(a, 'e1', 'a', tardio.uid), 'recusado');
  await tentar('decisão', decidir(a, 'e1', 'b'), 'aceito');
  await tentar('valor não texto', decidir(a, 'e1', 7), 'recusado');
  await mudarEstado({ subfase: 'prorrogacao', empatadas: { e2: { a: true, b: true } } });
  await tentar('prorrogação de outra equipe', decidir(a, 'e1', 'a'), 'recusado');
  await mudarEstado({ empatadas: { e1: { a: true } } });
  await tentar('opção não empatada', decidir(a, 'e1', 'b'), 'recusado');
  await tentar('opção empatada', decidir(a, 'e1', 'a'), 'aceito');
  await mudarEstado({ prazo: agora() - GRACA_MS - 2000 });
  await tentar('prorrogação depois do prazo', decidir(a, 'e1', 'a'), 'recusado');
  assert.equal(await h.canal.ler(`${S}/decisoes/r1/e1/${a.uid}`), 'a');
});

paridade('leitura: o aluno não lê semente, presença, voto alheio, decisão de outra equipe nem a sala', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb);
  const a = await membro('a', 'e1');
  await h.canal.gravar({ [`${S}/sementes/r1`]: 5 });
  await tentar('ler semente', () => a.canal.ler(`${S}/sementes/r1`), 'recusado');
  await tentar('ler sementes', () => a.canal.ler(`${S}/sementes`), 'recusado');
  await tentar('ler presença', () => a.canal.ler(`${S}/presenca`), 'recusado');
  await tentar('ler decisão da outra equipe', () => a.canal.ler(`${S}/decisoes/r1/e2`), 'recusado');
  await tentar('ler decisões da rodada inteira', () => a.canal.ler(`${S}/decisoes/r1`), 'recusado');
  await tentar('ler voto alheio', () => a.canal.ler(`${S}/votosEnquete/q/antes/a1/outro`), 'recusado');
  await tentar('ler votos da afirmação', () => a.canal.ler(`${S}/votosEnquete/q/antes/a1`), 'recusado');
  await tentar('ler a sala inteira', () => a.canal.ler(S), 'recusado');
  await tentar('ler privado', () => a.canal.ler('privado/pinApresentador'), 'recusado');
  await tentar('ler pedidos', () => a.canal.ler('pedidosAnfitriao'), 'recusado');
  for (const no of ['meta', 'conteudo', 'estado', 'pulso', 'resultados', 'placar', 'enquetes', 'membros']) {
    await tentar(`ler ${no}`, () => a.canal.ler(`${S}/${no}`), 'aceito');
  }
  await tentar('ler a própria equipe', () => a.canal.ler(`${S}/decisoes/r1/e1`), 'aceito');
  await tentar('ler o próprio voto', () => a.canal.ler(`${S}/votosEnquete/q/antes/a1/${a.uid}`), 'aceito');
  await tentar('anfitrião lê a semente', () => h.canal.ler(`${S}/sementes/r1`), 'aceito');
  await tentar('anfitrião lê a sala', () => h.canal.ler(S), 'aceito');
});

paridade('ouvinte que perde a permissão (aluno movido de equipe) é cancelado com erro', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb);
  const a = await membro('a', 'e1');
  let erro = null;
  let primeiro;
  const chegou = new Promise((r) => { primeiro = r; });
  a.canal.ouvir(`${S}/decisoes/r1/e1`, () => primeiro(), (e) => { erro = e; });
  await chegou;
  await h.canal.gravar({ [`${S}/membros/${a.uid}/equipe`]: 'e2' });
  for (let i = 0; i < 100 && !erro; i += 1) await new Promise((r) => setTimeout(r, 30));
  await tentar('ouvinte cancelado', async () => {
    if (erro) throw erro;
  }, 'recusado');
});

paridade('gravação com uma folha proibida é recusada inteira', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb);
  const a = await membro('a');
  await tentar('presença + placar', () => a.canal.gravar({ [`${S}/presenca/${a.uid}`]: a.canal.marcadorDeHora(), [`${S}/placar/e1`]: { renda: 1 } }), 'recusado');
  assert.equal(await h.canal.ler(`${S}/presenca/${a.uid}`), null);
});

paridade('apagar a sala: só o anfitrião, e só apagar', async (amb, tentar) => {
  const { S, h, membro } = await salaPronta(amb);
  const a = await membro('a');
  await h.canal.gravar({ [`${S}/sementes/r1`]: 1 });
  await tentar('aluno apaga a sala', () => a.canal.gravar({ [S]: null }), 'recusado');
  await tentar('anfitrião grava objeto na sala', () => h.canal.gravar({ [S]: { meta: { hostUid: h.uid } } }), 'recusado');
  await tentar('anfitrião grava nó desconhecido', () => h.canal.gravar({ [`${S}/lixo`]: 1 }), 'recusado');
  await tentar('anfitrião apaga a sala', () => h.canal.gravar({ [S]: null }), 'aceito');
  assert.equal(await h.canal.ler(`${S}/meta`), null);
});

paridade('regrasVersao só a versão destas regras; autoteste e privado nunca; pedido de 8 a 32 caracteres', async (amb, tentar) => {
  const u = await amb.usuario('u');
  await tentar(`regrasVersao ${VERSAO_REGRAS}`, () => u.canal.gravar({ [`regrasVersao/${u.uid}`]: VERSAO_REGRAS }), 'aceito');
  await tentar('regrasVersao de outra versão', () => u.canal.gravar({ [`regrasVersao/${u.uid}`]: 'v0-velha' }), 'recusado');
  await tentar('regrasVersao de outro', () => u.canal.gravar({ 'regrasVersao/outro': VERSAO_REGRAS }), 'recusado');
  await tentar('autoteste', () => u.canal.gravar({ [`autoteste/${u.uid}`]: true }), 'recusado');
  await tentar('privado', () => u.canal.gravar({ 'privado/pinApresentador': '1234567890' }), 'recusado');
  await tentar('pedido curto', () => u.canal.gravar({ [`pedidosAnfitriao/${u.uid}`]: 'curto' }), 'recusado');
  await tentar('pedido longo', () => u.canal.gravar({ [`pedidosAnfitriao/${u.uid}`]: 'x'.repeat(33) }), 'recusado');
  await tentar('pedido objeto', () => u.canal.gravar({ [`pedidosAnfitriao/${u.uid}`]: { a: 'x'.repeat(100_000) } }), 'recusado');
  await tentar('pedido de outro', () => u.canal.gravar({ 'pedidosAnfitriao/outro': 'um pin qualquer' }), 'recusado');
  await tentar('pedido', () => u.canal.gravar({ [`pedidosAnfitriao/${u.uid}`]: 'um pin qualquer' }), 'aceito');
});

paridade('retomada: hostUid só com o PIN certo, só o próprio uid e só esse campo', async (amb, tentar) => {
  const { S, h, mudarEstado } = await salaPronta(amb);
  const n = await amb.usuario('novo');
  const hostUid = `${S}/meta/hostUid`;
  await tentar('sem pedido', () => n.canal.gravar({ [hostUid]: n.uid }), 'recusado');
  await n.canal.gravar({ [`pedidosAnfitriao/${n.uid}`]: 'pin-errado-000' });
  await tentar('PIN errado', () => n.canal.gravar({ [hostUid]: n.uid }), 'recusado');
  await n.canal.gravar({ [`pedidosAnfitriao/${n.uid}`]: PIN });
  await tentar('para outro uid', () => n.canal.gravar({ [hostUid]: 'outro' }), 'recusado');
  await tentar('outro campo da meta', () => n.canal.gravar({ [`${S}/meta/entradaAberta`]: false }), 'recusado');
  const meta = await n.canal.ler(`${S}/meta`);
  await tentar('meta inteira mudando só o hostUid', () => n.canal.gravar({ [`${S}/meta`]: { ...meta, hostUid: n.uid } }), 'recusado');
  await tentar('assumir', () => n.canal.gravar({ [hostUid]: n.uid }), 'aceito');
  await tentar('anfitrião antigo deixa de escrever', () => mudarEstado({ tipo: 'bloco' }), 'recusado');
  await tentar('anfitrião novo escreve', () => n.canal.transacao(`${S}/estado`, (e) => (e ? { ...e, tipo: 'bloco', geracao: e.geracao + 1 } : undefined)), 'aceito');
  await tentar('anfitrião antigo não apaga a sala', () => h.canal.gravar({ [S]: null }), 'recusado');
});

// ---------- Diferenças de propósito (contratos, seção 6) ----------

test('só online: criar sala exige o PIN (offline não há PIN, e o canal-local aceita)', async () => {
  const intruso = await ambienteEmulador().usuario('sem-pin');
  const S = 'salas/' + novaSala();
  await assert.rejects(intruso.canal.gravar({ [`${S}/meta`]: { hostUid: intruso.uid } }), /PERMISSION_DENIED/);
  // Com o PIN errado, também não.
  await intruso.canal.gravar({ [`pedidosAnfitriao/${intruso.uid}`]: 'pin-errado-000' });
  await assert.rejects(intruso.canal.gravar({ [`${S}/meta`]: { hostUid: intruso.uid } }), /PERMISSION_DENIED/);
  // Sem privado/pinApresentador, null === null não passa (red team, falha 2).
  // Num namespace só deste teste, com as mesmas regras: apagar o PIN do banco
  // padrão atrapalharia os outros arquivos, que rodam em paralelo.
  const ns = 'demo-seminario-sem-pin';
  const conexao = await namespaceComRegras(ns);
  await administrador('DELETE', '', undefined, ns);
  const semPin = await novoCanalNoEmulador('sem-pin-ns', { conexao });
  abertos.push(semPin);
  const uid = await semPin.entrar();
  await assert.rejects(semPin.gravar({ [`${S}/meta`]: { hostUid: uid } }), /PERMISSION_DENIED/);
  await assert.rejects(semPin.gravar({ [`salas/${novaSala()}/meta/hostUid`]: uid }), /PERMISSION_DENIED/);
  await semPin.gravar({ [`regrasVersao/${uid}`]: VERSAO_REGRAS }); // as regras estão lá: o que falhou foi o PIN
});

// Revisão da F2, achado 2: a prioridade (.priority) é um valor de tamanho livre
// ao lado de cada nó, e nenhuma regra olhava para ela. Um aluno (ou qualquer
// pessoa com a apiKey pública, em regrasVersao e pedidosAnfitriao, que não
// exigem sala) gravava MB ali e enchia a cota do plano grátis. O canal-local
// não representa prioridade (a chave com "." é recusada ao gravar), por isso o
// caso é só online. O SDK aceita a prioridade dentro do valor, também num filho.
test('só online: prioridade recusada em todo nó que o aluno grava', async () => {
  const { S, h, mudarEstado, membro } = await salaPronta(ambienteEmulador(), { estado: { equipesAbertas: { e1: true } } });
  const a = await membro('a');
  const blob = 'x'.repeat(100_000);
  const comPrioridade = (valor) => ({ '.value': valor, '.priority': blob });
  const tentativas = [
    ['pedidosAnfitriao', `pedidosAnfitriao/${a.uid}`, comPrioridade('um pin qualquer')],
    ['regrasVersao', `regrasVersao/${a.uid}`, comPrioridade(VERSAO_REGRAS)],
    ['membro (nó)', `${S}/membros/${a.uid}`, { entrouEm: a.canal.marcadorDeHora(), '.priority': blob }],
    ['membro (entrouEm no filho)', `${S}/membros/${a.uid}`, { entrouEm: comPrioridade(a.canal.marcadorDeHora()) }],
    ['equipe', `${S}/membros/${a.uid}/equipe`, comPrioridade('e1')],
    ['presença', `${S}/presenca/${a.uid}`, comPrioridade(a.canal.marcadorDeHora())],
  ];
  for (const [rotulo, caminho, valor] of tentativas) {
    await assert.rejects(a.canal.gravar({ [caminho]: valor }), /PERMISSION_DENIED/, `${rotulo} com prioridade`);
  }
  await mudarEstado({ tipo: 'enquete', enquete: 'q', momento: 'antes', subfase: 'votando', afirmacao: '*', prazo: h.canal.agora() + 60_000 });
  await assert.rejects(a.canal.gravar({ [`${S}/votosEnquete/q/antes/a1/${a.uid}`]: comPrioridade(4) }), /PERMISSION_DENIED/, 'voto de enquete com prioridade');
  const d = await membro('d', 'e1');
  await new Promise((r) => setTimeout(r, 5));
  await mudarEstado({ tipo: 'rodada', rodada: 'r1', subfase: 'decidindo', abertoEm: h.canal.agora(), prazo: h.canal.agora() + 60_000 });
  await assert.rejects(d.canal.gravar({ [`${S}/decisoes/r1/e1/${d.uid}`]: comPrioridade('a') }), /PERMISSION_DENIED/, 'decisão com prioridade');
  // Sem prioridade, as mesmas escritas passam: o que falhou foi só a prioridade.
  await d.canal.gravar({ [`${S}/decisoes/r1/e1/${d.uid}`]: 'a' });
  await a.canal.gravar({ [`${S}/presenca/${a.uid}`]: a.canal.marcadorDeHora(), [`regrasVersao/${a.uid}`]: VERSAO_REGRAS });
  assert.equal(await h.canal.ler(`${S}/membros/${a.uid}/equipe`), null);
});

test('só online: pulso e meta com tipo conferido (o anfitrião do canal-local não é conferido)', async () => {
  const { S, h } = await salaPronta(ambienteEmulador());
  await h.canal.gravar({ [`${S}/pulso`]: h.canal.marcadorDeHora() });
  await assert.rejects(h.canal.gravar({ [`${S}/pulso`]: 1 }), /PERMISSION_DENIED/);
  await assert.rejects(h.canal.gravar({ [`${S}/meta/entradaAberta`]: 'sim' }), /PERMISSION_DENIED/);
  await assert.rejects(h.canal.gravar({ [`${S}/meta/expiraEm`]: h.canal.agora() + 13 * 3_600_000 }), /PERMISSION_DENIED/);
  await h.canal.gravar({ [`${S}/meta/entradaAberta`]: false });
});
