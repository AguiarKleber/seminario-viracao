// O canal local: interface do canal (contratos seção 6) e as travas que espelham
// as regras do Firebase. Cada trava tem um teste que tenta passar por ela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { esperarAvisos } from './fixtures/sessao.mjs';

const V = await carregarNucleo();
const NEGADO = /^Error: PERMISSION_DENIED: /;
const negado = (padrao) => (erro) => NEGADO.test(String(erro)) && (!padrao || padrao.test(erro.message));

const S = 'salas/ABCD';

// Uma sala mínima: meta, conteudo e estado gravados pelo anfitrião "h".
async function salaPronta({ estado = {}, relogio } = {}) {
  let t = 1000;
  const r = relogio || { agora: () => t, passar: (ms) => { t += ms; } };
  const canal = V.canalLocal.criar({ relogio: r.agora });
  const h = canal.comoUsuario('h');
  await h.gravar({ [`${S}/meta`]: { hostUid: 'h', criadaEm: 0, expiraEm: 10_000_000, entradaAberta: true } });
  await h.gravar({
    [`${S}/conteudo`]: {
      tempos: { gracaSeg: 5 },
      equipes: { e1: { id: 'e1' }, e2: { id: 'e2' } },
      rodadas: { r1: { opcoes: { a: { id: 'a' }, b: { id: 'b' } } } },
      enquetes: { q: { afirmacoes: { a1: { id: 'a1' }, a2: { id: 'a2' } } } },
    },
    [`${S}/estado`]: { geracao: 1, tipo: 'lobby', subfase: 'ativo', ...estado },
  });
  return { canal, h, relogio: r };
}

async function mudarEstado(h, mudanca) {
  return h.transacao(`${S}/estado`, (atual) => ({ ...atual, ...mudanca, geracao: atual.geracao + 1 }));
}

async function membro(canal, uid, equipe) {
  const a = canal.comoUsuario(uid);
  await a.gravar({ [`${S}/membros/${uid}`]: { entrouEm: a.marcadorDeHora() } });
  if (equipe) await canal.comoUsuario('h').gravar({ [`${S}/membros/${uid}/equipe`]: equipe });
  return a;
}

test('gravar e ler: update de vários caminhos, null apaga e nó vazio some como no RTDB', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  // Act
  await canal.gravar({ 'x/a': 1, 'x/b': { c: 'texto' }, 'x/vazio': {}, 'x/lista': [] });
  await canal.gravar({ 'x/a': null });
  // Assert
  assert.deepEqual(await canal.ler('x'), { b: { c: 'texto' } });
  assert.equal(await canal.ler('nada/aqui'), null);
});

test('gravar recusa número não finito, chave proibida e caminhos sobrepostos, sem gravar nada', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  // Act + Assert
  await assert.rejects(canal.gravar({ ok: 1, n: NaN }), /Número inválido/);
  await assert.rejects(canal.gravar({ 'a.b': 1 }), /Caminho inválido/);
  await assert.rejects(canal.gravar({ x: { 'a/b': 1 } }), /Chave inválida/);
  await assert.rejects(canal.gravar({ a: { b: 1 }, 'a/b': 2 }), /sobrepostos/);
  assert.equal(await canal.ler('ok'), null);
});

test('ouvir: o aviso é assíncrono, repete a cada mudança e para no desligar', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  const vistos = [];
  // Act
  const desligar = canal.ouvir('p/q', (v) => vistos.push(v));
  const logoDepois = vistos.length;
  await esperarAvisos();
  const gravacao = canal.gravar({ 'p/q/r': 1 });
  const antesDoAviso = vistos.length;
  await gravacao;
  await esperarAvisos();
  await canal.gravar({ 'outro/lugar': 1 });
  await esperarAvisos();
  desligar();
  await canal.gravar({ 'p/q/r': 2 });
  await esperarAvisos();
  // Assert
  assert.equal(logoDepois, 0, 'nunca dentro da própria chamada');
  assert.equal(antesDoAviso, 1, 'o aviso da gravação ainda não chegou');
  assert.deepEqual(vistos, [null, { r: 1 }]);
});

test('comoUsuario: várias visões do mesmo armazenamento, cada uma com o seu uid', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  const a = canal.comoUsuario('a');
  const b = canal.comoUsuario('b');
  // Act
  await a.gravar({ 'k/a': 1 });
  // Assert
  assert.equal(await a.entrar(), 'a');
  assert.equal(await b.entrar(), 'b');
  assert.equal(await b.ler('k/a'), 1);
  assert.equal(await canal.entrar(), 'apresentador-local');
});

test('transacao: undefined aborta sem gravar; o novo valor é gravado e devolvido', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  await canal.gravar({ c: 5 });
  // Act
  const abortada = await canal.transacao('c', () => undefined);
  const feita = await canal.transacao('c', (v) => v + 1);
  // Assert
  assert.deepEqual(abortada, { confirmado: false, valor: 5 });
  assert.deepEqual(feita, { confirmado: true, valor: 6 });
});

test('agora e marcadorDeHora vêm do relógio injetado; aoMudarConexao avisa conectado', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ relogio: () => 777 });
  let conectado = null;
  // Act
  canal.aoMudarConexao((c) => { conectado = c; });
  await esperarAvisos();
  // Assert
  assert.equal(canal.agora(), 777);
  assert.equal(canal.marcadorDeHora(), 777);
  assert.equal(conectado, true);
});

test('exportar e importar: o estado inteiro vai e volta, e os ouvintes recebem', async () => {
  // Arrange
  const origem = V.canalLocal.criar({ travas: false });
  await origem.gravar({ 'a/b': [1, 2], 'c': 'x' });
  const destino = V.canalLocal.criar({ travas: false });
  const vistos = [];
  destino.ouvir('a', (v) => vistos.push(v));
  await esperarAvisos();
  // Act
  destino.importar(JSON.stringify(origem.exportar()));
  await esperarAvisos();
  // Assert
  assert.deepEqual(await destino.ler(''), { a: { b: [1, 2] }, c: 'x' });
  assert.deepEqual(vistos, [null, { b: [1, 2] }]);
});

test('persistência opcional: grava no localStorage e recarrega; sem localStorage, segue em memória', async () => {
  // Arrange
  const guardado = new Map();
  globalThis.localStorage = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, v) };
  try {
    const canal = V.canalLocal.criar({ travas: false, persistirEm: 'viracao-teste' });
    // Act
    await canal.gravar({ 'a': 1 });
    const recarregado = V.canalLocal.criar({ travas: false, persistirEm: 'viracao-teste' });
    // Assert
    assert.equal(await recarregado.ler('a'), 1);
  } finally {
    delete globalThis.localStorage;
  }
  globalThis.localStorage = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('cheio'); } };
  try {
    const semArmazenamento = V.canalLocal.criar({ persistirEm: 'x', travas: false });
    await semArmazenamento.gravar({ b: 2 });
    assert.equal(await semArmazenamento.ler('b'), 2);
  } finally {
    delete globalThis.localStorage;
  }
});

test('trava: sem login não grava', async () => {
  // Arrange
  const canal = V.canalLocal.criar();
  // Act + Assert
  await assert.rejects(canal.gravar({ [`${S}/meta`]: { hostUid: 'x' } }), negado(/sem login/));
});

test('trava: estado só com geracao = anterior + 1 (e 1 na criação)', async () => {
  // Arrange
  const { h } = await salaPronta();
  // Act + Assert
  await assert.rejects(h.gravar({ [`${S}/estado/geracao`]: 5 }), negado(/geracao 2/));
  await assert.rejects(h.gravar({ [`${S}/estado`]: { geracao: 1, tipo: 'bloco' } }), negado(/geracao 2/));
  await h.gravar({ [`${S}/estado`]: { geracao: 2, tipo: 'bloco' } });
  await assert.rejects(h.gravar({ [`${S}/estado/campoNovo`]: 1, [`${S}/estado/geracao`]: 3 }), negado(/campo desconhecido/));
  assert.equal((await h.ler(`${S}/estado`)).geracao, 2);
});

test('trava: aluno não escreve estado, meta, conteudo, resultados, placar, sementes nem prorrogacoes', async () => {
  // Arrange
  const { canal } = await salaPronta();
  const a = await membro(canal, 'a');
  // Act + Assert
  for (const [caminho, valor] of [
    ['estado', { geracao: 2 }], ['meta/entradaAberta', false], ['conteudo/x', 1],
    ['resultados/r1', { e1: { carta: 'x' } }], ['placar/e1', { renda: 9 }], ['sementes/r1', 1], ['pulso', 1],
    ['prorrogacoes/r1', true], ['prorrogacoes/r1', null],
  ]) {
    await assert.rejects(a.gravar({ [`${S}/${caminho}`]: valor }), negado(), caminho);
  }
});

test('trava: criar sala só com a meta inexistente e o hostUid do próprio', async () => {
  // Arrange
  const { canal } = await salaPronta();
  const intruso = canal.comoUsuario('intruso');
  // Act + Assert
  await assert.rejects(intruso.gravar({ [`${S}/meta/hostUid`]: 'intruso' }), negado(/meta/));
  await intruso.gravar({ 'salas/WXYZ/meta': { hostUid: 'intruso' } });
  await assert.rejects(intruso.gravar({ 'salas/QRST/meta': { hostUid: 'outro' } }), negado(/meta/));
  await assert.rejects(intruso.gravar({ 'salas/WXYZ/meta/lixo': 1 }), negado(/campo desconhecido em meta/));
});

test('trava: semente gravada uma vez, nunca alterada nem apagada', async () => {
  // Arrange
  const { h } = await salaPronta();
  // Act
  await h.gravar({ [`${S}/sementes/r1`]: 99 });
  // Assert
  await assert.rejects(h.gravar({ [`${S}/sementes/r1`]: 100 }), negado(/semente/));
  await assert.rejects(h.gravar({ [`${S}/sementes/r1`]: null }), negado(/semente/));
  await assert.rejects(h.gravar({ [`${S}/sementes/r2`]: 'texto' }), negado(/número/));
  assert.equal(await h.ler(`${S}/sementes/r1`), 99);
});

// D-035: a marca de que a rodada já teve prorrogação segue a semente. Se o
// desfazer (ou um anfitrião com defeito) pudesse apagá-la, refazer a rodada
// abriria uma segunda prorrogação.
test('trava: marca de prorrogação gravada uma vez, só true, nunca alterada nem apagada; só o anfitrião lê', async () => {
  // Arrange
  const { canal, h } = await salaPronta();
  const a = await membro(canal, 'a', 'e1');
  // Act
  await h.gravar({ [`${S}/prorrogacoes/r1`]: true });
  // Assert
  await assert.rejects(h.gravar({ [`${S}/prorrogacoes/r1`]: true }), negado(/prorrogação/));
  await assert.rejects(h.gravar({ [`${S}/prorrogacoes/r1`]: null }), negado(/prorrogação/));
  for (const valor of [false, 1, 'sim', { x: true }]) {
    await assert.rejects(h.gravar({ [`${S}/prorrogacoes/r2`]: valor }), negado(/true/), JSON.stringify(valor));
  }
  await assert.rejects(h.gravar({ [`${S}/prorrogacoes`]: { r3: true } }), negado(/nível/));
  await assert.rejects(a.ler(`${S}/prorrogacoes/r1`), negado());
  await assert.rejects(a.ler(`${S}/prorrogacoes`), negado());
  assert.equal(await h.ler(`${S}/prorrogacoes/r1`), true);
});

test('trava: resultados e apurações gravados uma vez; apagar é permitido', async () => {
  // Arrange
  const { h } = await salaPronta();
  await h.gravar({ [`${S}/resultados/r1`]: { e1: { carta: 'x' } }, [`${S}/enquetes/q/antes`]: { n: { a1: 1 } } });
  // Act + Assert
  await assert.rejects(h.gravar({ [`${S}/resultados/r1/e2`]: { carta: 'y' } }), negado(/só pode ser apagado/));
  await assert.rejects(h.gravar({ [`${S}/enquetes/q/antes/n/a1`]: 2 }), negado(/só pode ser apagado/));
  await h.gravar({ [`${S}/resultados/r1`]: null });
  await h.gravar({ [`${S}/resultados/r1`]: { e1: { carta: 'z' } } });
  assert.equal(await h.ler(`${S}/resultados/r1/e1/carta`), 'z');
});

test('trava: membro entra só com a entrada aberta, em nome próprio e com entrouEm = hora do servidor', async () => {
  // Arrange
  const { canal, h } = await salaPronta();
  const a = canal.comoUsuario('a');
  // Act + Assert
  await assert.rejects(a.gravar({ [`${S}/membros/a`]: { entrouEm: 1 } }), negado(/entrouEm/));
  await assert.rejects(a.gravar({ [`${S}/membros/b`]: { entrouEm: a.marcadorDeHora() } }), negado());
  await assert.rejects(a.gravar({ [`${S}/membros/a`]: { entrouEm: a.marcadorDeHora(), nome: 'Ana' } }), negado(/campo desconhecido/));
  await a.gravar({ [`${S}/membros/a`]: { entrouEm: a.marcadorDeHora() } });
  await h.gravar({ [`${S}/meta/entradaAberta`]: false });
  const b = canal.comoUsuario('b');
  await assert.rejects(b.gravar({ [`${S}/membros/b`]: { entrouEm: b.marcadorDeHora() } }), negado(/entrada fechada/));
});

test('trava: equipe só aberta, só antes da trava, e o anfitrião move a qualquer hora', async () => {
  // Arrange
  const { canal, h } = await salaPronta({ estado: { equipesAbertas: { e1: true } } });
  const a = await membro(canal, 'a');
  // Act + Assert
  await assert.rejects(a.gravar({ [`${S}/membros/a/equipe`]: 'e2' }), negado(/não está aberta/));
  await a.gravar({ [`${S}/membros/a/equipe`]: 'e1' });
  await mudarEstado(h, { equipesTravadas: true });
  await assert.rejects(a.gravar({ [`${S}/membros/a/equipe`]: 'e1' }), negado(/travadas/));
  // A porta da entrada não pode trocar a equipe depois da trava.
  await assert.rejects(a.gravar({ [`${S}/membros/a`]: { entrouEm: a.marcadorDeHora(), equipe: 'e2' } }), negado(/travadas/));
  await h.gravar({ [`${S}/membros/a/equipe`]: 'e2' });
  await assert.rejects(h.gravar({ [`${S}/membros/a/equipe`]: 'e9' }), negado(/inexistente/));
  assert.equal(await h.ler(`${S}/membros/a/equipe`), 'e2');
});

test('trava: presença só do próprio membro, com a hora do servidor', async () => {
  // Arrange
  const { canal } = await salaPronta();
  const naoMembro = canal.comoUsuario('z');
  const a = await membro(canal, 'a');
  // Act + Assert
  await assert.rejects(naoMembro.gravar({ [`${S}/presenca/z`]: naoMembro.marcadorDeHora() }), negado(/não é membro/));
  await assert.rejects(a.gravar({ [`${S}/presenca/a`]: 'x'.repeat(100) }), negado(/hora do servidor/));
  await a.gravar({ [`${S}/presenca/a`]: a.marcadorDeHora() });
});

test('trava: voto de enquete só na etapa, na afirmação da vez, no prazo + graça, de 1 a 5 e na própria chave', async () => {
  // Arrange
  const { canal, h, relogio } = await salaPronta();
  const a = await membro(canal, 'a');
  const voto = (afirm, v, dono = 'a') => a.gravar({ [`${S}/votosEnquete/q/antes/${afirm}/${dono}`]: v });
  // Act + Assert
  await assert.rejects(voto('a1', 3), negado(/não está em votação/));
  await mudarEstado(h, { tipo: 'enquete', enquete: 'q', momento: 'antes', subfase: 'votando', afirmacao: 'a1', prazo: relogio.agora() + 1000 });
  await assert.rejects(voto('a2', 3), negado(/fora da vez/));
  await assert.rejects(voto('a1', 3, 'b'), negado(/outro uid/));
  for (const invalido of [0, 6, 2.5, '5']) await assert.rejects(voto('a1', invalido), negado(/1 a 5/), String(invalido));
  await voto('a1', 3);
  relogio.passar(1000 + 5000); // exatamente no fim da graça: ainda vale
  await voto('a1', 4);
  relogio.passar(1);
  await assert.rejects(voto('a1', 5), negado(/prazo/));
  await mudarEstado(h, { afirmacao: '*', prazo: relogio.agora() + 1000 });
  await assert.rejects(a.gravar({ [`${S}/votosEnquete/q/antes/zz/a`]: 3 }), negado(/inexistente/));
  await voto('a2', 1);
  await mudarEstado(h, { subfase: 'fechando' });
  await assert.rejects(voto('a2', 2), negado(/não está em votação/));
  assert.equal(await h.ler(`${S}/votosEnquete/q/antes/a1/a`), 4);
});

test('trava: decisão só da própria equipe, com a decisão aberta, de quem entrou antes e em opção existente', async () => {
  // Arrange
  const { canal, h, relogio } = await salaPronta();
  const a = await membro(canal, 'a', 'e1');
  relogio.passar(10);
  await mudarEstado(h, { tipo: 'rodada', rodada: 'r1', subfase: 'decidindo', abertoEm: relogio.agora(), prazo: relogio.agora() + 1000 });
  relogio.passar(10);
  const tardio = await membro(canal, 't', 'e1');
  const decidir = (quem, eq, op) => quem.gravar({ [`${S}/decisoes/r1/${eq}/${quem === a ? 'a' : 't'}`]: op });
  // Act + Assert
  await assert.rejects(decidir(a, 'e2', 'a'), negado(/não é a sua/));
  await assert.rejects(decidir(a, 'e1', 'zz'), negado(/inexistente/));
  await assert.rejects(decidir(tardio, 'e1', 'a'), negado(/entrou depois/));
  await assert.rejects(a.gravar({ [`${S}/decisoes/r1/e1/t`]: 'a' }), negado(/outro uid/));
  await decidir(a, 'e1', 'b');
  // Prorrogação: só a equipe empatada, e só entre as opções empatadas.
  await mudarEstado(h, { subfase: 'prorrogacao', empatadas: { e2: { a: true, b: true } } });
  await assert.rejects(decidir(a, 'e1', 'a'), negado(/não está aberta para esta equipe/));
  await mudarEstado(h, { empatadas: { e1: { a: true } } });
  await assert.rejects(decidir(a, 'e1', 'b'), negado(/empatadas/));
  await decidir(a, 'e1', 'a');
  assert.equal(await h.ler(`${S}/decisoes/r1/e1/a`), 'a');
});

test('trava de leitura: o aluno não lê semente, voto alheio nem a decisão de outra equipe', async () => {
  // Arrange
  const { canal, h } = await salaPronta();
  const a = await membro(canal, 'a', 'e1');
  await h.gravar({ [`${S}/sementes/r1`]: 5 });
  // Act + Assert
  await assert.rejects(a.ler(`${S}/sementes/r1`), negado());
  await assert.rejects(a.ler(`${S}/decisoes/r1/e2`), negado());
  await assert.rejects(a.ler(`${S}/decisoes/r1`), negado());
  await assert.rejects(a.ler(`${S}/votosEnquete/q/antes/a1/b`), negado());
  await assert.rejects(a.ler(S), negado());
  assert.equal(await a.ler(`${S}/decisoes/r1/e1`), null);
  assert.equal(await a.ler(`${S}/votosEnquete/q/antes/a1/a`), null);
  assert.equal((await a.ler(`${S}/estado`)).geracao, 1);
  assert.equal(await h.ler(`${S}/sementes/r1`), 5);
});

test('regras v4 (D-064): com o PIN, o espectador lê a decisão de qualquer equipe, e só isso; sem o PIN, não', async () => {
  // Arrange: o PIN em privado/, semeado por fora, como no console.
  const { canal } = await salaPronta();
  const arvore = canal.exportar();
  arvore.privado = { pinApresentador: 'pin-certo-0001' };
  canal.importar(arvore);
  await membro(canal, 'a', 'e1');
  const esp = canal.comoUsuario('esp');
  // Act + Assert
  await assert.rejects(esp.ler(`${S}/decisoes/r1/e1`), negado(), 'sem pedido');
  await esp.gravar({ 'pedidosAnfitriao/esp': 'pin-errado-000' });
  await assert.rejects(esp.ler(`${S}/decisoes/r1/e1`), negado(), 'PIN errado');
  await esp.gravar({ 'pedidosAnfitriao/esp': 'pin-certo-0001' });
  assert.equal(await esp.ler(`${S}/decisoes/r1/e1`), null);
  assert.equal(await esp.ler(`${S}/decisoes/r1/e2`), null);
  await assert.rejects(esp.ler(`${S}/decisoes/r1`), negado(), 'a rodada inteira, não');
  await assert.rejects(esp.ler(S), negado(), 'a sala inteira, não');
  await esp.gravar({ 'pedidosAnfitriao/esp': null });
  await assert.rejects(esp.ler(`${S}/decisoes/r1/e1`), negado(), 'pedido apagado');
});

test('ouvinte que perde a permissão (aluno movido de equipe) é cancelado com erro', async () => {
  // Arrange
  const { canal, h } = await salaPronta();
  const a = await membro(canal, 'a', 'e1');
  let erro = null;
  a.ouvir(`${S}/decisoes/r1/e1`, () => {}, (e) => { erro = e; });
  await esperarAvisos();
  // Act
  await h.gravar({ [`${S}/membros/a/equipe`]: 'e2' });
  await esperarAvisos();
  // Assert
  assert.match(String(erro), NEGADO);
});

test('gravação com uma folha proibida é recusada inteira: nada fica pela metade', async () => {
  // Arrange
  const { canal } = await salaPronta();
  const a = await membro(canal, 'a');
  // Act
  const tentativa = a.gravar({ [`${S}/presenca/a`]: a.marcadorDeHora(), [`${S}/placar/e1`]: { renda: 1 } });
  // Assert
  await assert.rejects(tentativa, negado());
  assert.equal(await canal.comoUsuario('h').ler(`${S}/presenca/a`), null);
});

test('apagar a sala: só o anfitrião, e apaga tudo, inclusive as sementes', async () => {
  // Arrange
  const { canal, h } = await salaPronta();
  const a = await membro(canal, 'a');
  await h.gravar({ [`${S}/sementes/r1`]: 1 });
  // Act + Assert
  await assert.rejects(a.gravar({ [S]: null }), negado(/só o anfitrião apaga/));
  await assert.rejects(h.gravar({ [S]: { meta: { hostUid: 'h' } } }), negado(/nível/));
  await assert.rejects(h.gravar({ [`${S}/resultados`]: { r1: { e1: { carta: 'x' } } } }), negado(/nível/));
  await h.gravar({ [S]: null });
  assert.equal(await V.canalLocal.criar({ travas: false }).ler(S), null);
  assert.deepEqual(canal.exportar(), {});
});

test('regrasVersao só aceita a versão destas regras; autoteste e privado nunca aceitam escrita', async () => {
  // Arrange
  const canal = V.canalLocal.criar().comoUsuario('u');
  // Act + Assert
  await canal.gravar({ 'regrasVersao/u': 'v4' });
  await assert.rejects(canal.gravar({ 'regrasVersao/u': 'v3' }), negado());
  await assert.rejects(canal.gravar({ 'regrasVersao/u': 'v2' }), negado());
  await assert.rejects(canal.gravar({ 'regrasVersao/u': 'v1' }), negado());
  await assert.rejects(canal.gravar({ 'autoteste/u': true }), negado());
  await assert.rejects(canal.gravar({ 'privado/pinApresentador': '1234567890' }), negado());
  await assert.rejects(canal.gravar({ 'pedidosAnfitriao/u': 'curto' }), negado());
  await canal.gravar({ 'pedidosAnfitriao/u': 'um pin qualquer' });
});

test('trava: trocar o hostUid só com o PIN certo, só para o próprio uid e só esse campo (retomada, R6)', async () => {
  // Arrange: o PIN fica em privado/, que nenhuma conta escreve; o teste semeia por fora.
  const { canal, h } = await salaPronta();
  const arvore = canal.exportar();
  arvore.privado = { pinApresentador: 'pin-certo-0001' };
  canal.importar(arvore);
  const n = canal.comoUsuario('novo');
  // Act + Assert
  await assert.rejects(n.gravar({ [`${S}/meta/hostUid`]: 'novo' }), negado(/meta/), 'sem pedido');
  await n.gravar({ 'pedidosAnfitriao/novo': 'pin-errado-000' });
  await assert.rejects(n.gravar({ [`${S}/meta/hostUid`]: 'novo' }), negado(/meta/), 'PIN errado');
  await n.gravar({ 'pedidosAnfitriao/novo': 'pin-certo-0001' });
  await assert.rejects(n.gravar({ [`${S}/meta/hostUid`]: 'outro' }), negado(/meta/), 'para outro uid');
  await assert.rejects(n.gravar({ [`${S}/meta/entradaAberta`]: false }), negado(/meta/), 'outro campo da meta');
  await n.gravar({ [`${S}/meta/hostUid`]: 'novo' });
  assert.equal(await n.ler(`${S}/meta/hostUid`), 'novo');
  await assert.rejects(mudarEstado(h, { tipo: 'bloco' }), negado(/estado/), 'o anfitrião antigo deixa de escrever');
  await mudarEstado(n, { tipo: 'bloco' });
});

test('trava: regravar o mesmo valor em estado, semente, resultado e apuração é recusado, como no Firebase', async () => {
  // Arrange
  const { h } = await salaPronta();
  const resultado = { e1: { carta: 'x' } };
  const apuracao = { n: { a1: 1 } };
  await h.gravar({ [`${S}/sementes/r1`]: 7, [`${S}/resultados/r1`]: resultado, [`${S}/enquetes/q/antes`]: apuracao });
  const estado = await h.ler(`${S}/estado`);
  // Act + Assert
  await assert.rejects(h.gravar({ [`${S}/estado`]: estado }), negado(/geracao 2/));
  await assert.rejects(h.gravar({ [`${S}/sementes/r1`]: 7 }), negado(/semente/));
  await assert.rejects(h.gravar({ [`${S}/resultados/r1`]: resultado }), negado(/só pode ser apagado/));
  await assert.rejects(h.gravar({ [`${S}/enquetes/q/antes`]: apuracao }), negado(/só pode ser apagado/));
  await assert.rejects(h.gravar({ [`${S}/resultados/r1/e1`]: resultado.e1 }), negado(/só pode ser apagado/));
});

test('trava: depois da trava, regravar o nó inteiro do membro com a entrouEm antiga não troca de equipe', async () => {
  // Arrange: o furo do esboço das regras (o .write de membros/$uid cascateia)
  const { canal, h } = await salaPronta({ estado: { equipesAbertas: { e1: true, e2: true } } });
  const a = await membro(canal, 'a', 'e1');
  const entrouEm = (await a.ler(`${S}/membros/a`)).entrouEm;
  await mudarEstado(h, { equipesTravadas: true });
  // Act + Assert
  await assert.rejects(a.gravar({ [`${S}/membros/a`]: { entrouEm, equipe: 'e2' } }), negado(/travadas/));
  assert.equal((await a.ler(`${S}/membros/a`)).equipe, 'e1');
});

test('trava: regravar o nó do membro com a mesma equipe passa pela regra da equipe, como o .validate do Firebase', async () => {
  // Arrange: no Firebase o .validate roda em todo filho gravado, mudado ou não
  const { canal, h } = await salaPronta({ estado: { equipesAbertas: { e1: true, e2: true } } });
  const a = await membro(canal, 'a', 'e1');
  const entrouEm = (await a.ler(`${S}/membros/a`)).entrouEm;
  // Act + Assert: antes da trava, com a equipe aberta, passa
  await a.gravar({ [`${S}/membros/a`]: { entrouEm, equipe: 'e1' } });
  await mudarEstado(h, { equipesAbertas: { e2: true } });
  await assert.rejects(a.gravar({ [`${S}/membros/a`]: { entrouEm, equipe: 'e1' } }), negado(/não está aberta/));
  await mudarEstado(h, { equipesAbertas: { e1: true, e2: true }, equipesTravadas: true });
  await assert.rejects(a.gravar({ [`${S}/membros/a`]: { entrouEm, equipe: 'e1' } }), negado(/travadas/));
  // Sem equipe no nó, a regra da equipe não entra: quem chega depois da trava entra.
  const b = canal.comoUsuario('b');
  await b.gravar({ [`${S}/membros/b`]: { entrouEm: b.marcadorDeHora() } });
  await h.gravar({ [`${S}/membros/a/equipe`]: 'e2' });
});

// Revisão da F2, achado 1: um texto, número ou booleano no lugar do nó do membro
// não tem filhos, e as travas dos filhos (entrouEm, equipe, $outro) não viam
// nada. Um texto de 5 MB ali ia para os 20 celulares a cada regravação.
test('trava: o nó do membro é sempre um objeto com entrouEm; valor solto é recusado', async () => {
  // Arrange
  const { canal, h } = await salaPronta({ estado: { equipesTravadas: true } });
  const a = canal.comoUsuario('a');
  // Act + Assert
  for (const solto of ['x'.repeat(1000), 42, true]) {
    await assert.rejects(a.gravar({ [`${S}/membros/a`]: solto }), negado(/membro/), JSON.stringify(solto).slice(0, 12));
  }
  // O anfitrião também não cria um membro sem entrouEm (mover quem não existe).
  await assert.rejects(h.gravar({ [`${S}/membros/z/equipe`]: 'e1' }), negado(/entrouEm/));
  await a.gravar({ [`${S}/membros/a`]: { entrouEm: a.marcadorDeHora() } });
  assert.equal(typeof (await h.ler(`${S}/membros/a`)).entrouEm, 'number');
  // Apagar a entrouEm deixaria o membro só com a equipe: recusado; apagar o nó inteiro, não.
  await h.gravar({ [`${S}/membros/a/equipe`]: 'e1' });
  await assert.rejects(h.gravar({ [`${S}/membros/a/entrouEm`]: null }), negado(/entrouEm/));
  await h.gravar({ [`${S}/membros/a`]: null });
});

// Achado 3: gravar só membros/{uid}/equipe criava o membro por uma porta que não
// olha a entrada nem o prazo da sala. Depois, esse "membro" registrava presença
// e votava na enquete.
test('trava: sem registro de membro, gravar só a equipe não faz ninguém entrar (entrada fechada ou sala expirada)', async () => {
  // Arrange
  const { canal, h, relogio } = await salaPronta({ estado: { tipo: 'formarEquipes', equipesAbertas: { e1: true, e2: true }, equipesTravadas: false } });
  await h.gravar({ [`${S}/meta/entradaAberta`]: false });
  const x = canal.comoUsuario('x');
  // Act + Assert
  await assert.rejects(x.gravar({ [`${S}/membros/x`]: { entrouEm: x.marcadorDeHora() } }), negado(/entrada fechada/));
  await assert.rejects(x.gravar({ [`${S}/membros/x/equipe`]: 'e1' }), negado(/entrouEm/));
  await assert.rejects(x.gravar({ [`${S}/presenca/x`]: x.marcadorDeHora() }), negado(/não é membro/));
  // Sala expirada, com a entrada aberta: o mesmo.
  await h.gravar({ [`${S}/meta/entradaAberta`]: true });
  relogio.passar(20_000_000);
  await assert.rejects(x.gravar({ [`${S}/membros/x/equipe`]: 'e2' }), negado(/entrouEm/));
  assert.equal(await h.ler(`${S}/membros/x`), null);
});

// Achado 6: a regra do Firebase aceita regravar a mesma entrouEm pela folha
// (newData.val() === data.val()); o canal-local recusava. Direção inofensiva,
// mas divergência entre os dois modos (I7).
test('trava: regravar a mesma entrouEm pela folha passa, como no Firebase; outra hora não', async () => {
  // Arrange
  const { canal, relogio } = await salaPronta();
  const a = await membro(canal, 'a');
  const entrouEm = await a.ler(`${S}/membros/a/entrouEm`);
  relogio.passar(5000);
  // Act + Assert
  await a.gravar({ [`${S}/membros/a/entrouEm`]: entrouEm });
  await assert.rejects(a.gravar({ [`${S}/membros/a/entrouEm`]: entrouEm - 60_000 }), negado(/hora do servidor/));
  await a.gravar({ [`${S}/membros/a/entrouEm`]: a.marcadorDeHora() });
});

test('com travas: false tudo passa (canal de apoio do simulador)', async () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  // Act
  await canal.gravar({ 'salas/ABCD/estado': { geracao: 99 }, 'salas/ABCD/sementes/r1': 1 });
  await canal.gravar({ 'salas/ABCD/sementes/r1': 2 });
  // Assert
  assert.equal(await canal.ler('salas/ABCD/sementes/r1'), 2);
});
