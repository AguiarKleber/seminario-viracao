// A matriz de votos do modo individual (regras.individual; decisão do Kleber
// de 13/10 à noite): `node e2e/votos-individual.e2e.mjs`, dentro do
// `npm run e2e:votos`. Fica fora do `npm run check`, como os outros e2e
// (navegador instalado e JDK 21 do emulador).
//
// Por que existe: na noite de 13/10, o celular de verdade (aluno/index.html)
// foi conferido só com o canal-local (e2e/celular-individual.e2e.mjs), e as
// regras reais só com celulares simulados no Node
// (e2e/individual-online.e2e.mjs). Faltava os dois juntos: o aluno.js de
// verdade, o canal-firebase de verdade, as regras reais no emulador e o telão
// de verdade, que é como a turma vai jogar no dia 14/10.
//
// A sessão inteira do roteiro 60min com o config.json do dia e N celulares de
// 360×740 (--celulares N, de 3 a 20; o padrão é 8), votando pela TELA, com
// toques. Cobre:
// - a entrada: o código vem do QR, o aluno digita o nome, e só então entra na
//   sala; vários confirmam o nome juntos e cada um ganha uma vaga própria,
//   dada pelo telão; o nome nunca vai para o banco, e o topo mostra o nome;
// - o lobby ("N pessoas na sala") no telão e no celular do apresentador;
// - a enquete de entrada e as do fim, respondidas pela tela;
// - "Conheça o Jonas" e cada bloco de dados no celular, com o título do telão;
// - os 6 bimestres: cada celular vota na própria vaga, e toda opção de todo
//   bimestre é tocada em algum celular e contada no resultado; o "N de M já
//   escolheram" no telão e no celular do apresentador; o resultado de cada
//   vaga no banco é o voto da tela (ou a opção de sempre, sem voto); "A sua
//   escolha" no celular; quantas pessoas ficaram com cada opção no telão;
// - a troca de voto, o celular recarregado no meio da decisão (a mesma vaga, o
//   mesmo nome, o voto marcado), o voto sem rede (conta quando a rede volta),
//   quem chega no meio de uma decisão (ganha vaga, fica com a opção de sempre
//   nela e vota na seguinte) e o voto depois do cronômetro, que ainda vale
//   enquanto o apresentador não encerra;
// - o placar: "Quanto sobrou, ou ficou devendo" no telão e "Das N pessoas da
//   turma…" no celular, com as contas do banco; as três páginas do telão;
// - o fim, e a sala cheia: o 21º aparelho vê "A sala está cheia (20 pessoas)";
// - nenhum erro inesperado no console de nenhuma página.
// Com N = 20, o 20º é quem chega no meio, e o 21º é um celular de verdade. Com
// menos, as vagas que faltam são preenchidas no fim por registros gravados
// pelo administrador do emulador (como 20 - N celulares que entraram e nunca
// votaram), e o celular seguinte é o 21º.
//
// Uso: node e2e/votos-individual.e2e.mjs [--celulares N] [--sem-espera]
// [--config caminho]. Com --sem-espera, a espera do voto depois do cronômetro
// encolhe, para depurar o próprio teste (não vale como verificação). Com
// VIRACAO_CAPTURAS=pasta, as capturas também são copiadas para lá.
/* global document */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { administrador, PIN_EMULADOR, RAIZ, rodarNoEmulador } from '../bin/emulador.mjs';
import { servir } from '../bin/servir.mjs';
import { carregarNucleo } from '../test/carregar-nucleo.mjs';

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const COPIA = process.env.VIRACAO_CAPTURAS || null;
const SDK_CDN = 'https://www.gstatic.com/firebasejs/12.19.0/';
const UA_CELULAR = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const LETRAS = 'ABCDEFGHIJ';
const ROTEIRO = '60min';
const SEM_ESPERA = process.argv.includes('--sem-espera');
const arg = (nome) => {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith(`${nome}=`))?.slice(nome.length + 1);
};
const ARG_CONFIG = arg('--config');
const N_CELULARES = Number(arg('--celulares') ?? 8);
if (!Number.isInteger(N_CELULARES) || N_CELULARES < 3 || N_CELULARES > 20) throw new Error(`--celulares vai de 3 a 20 (veio "${arg('--celulares')}")`);
const TEXTO_CONFIG = readFileSync(resolve(RAIZ, ARG_CONFIG || 'config.json'), 'utf8');
// Nomes com acento, espaço e cedilha: é o que a turma digita. Nenhum pode
// aparecer no banco.
const NOMES = ['Ana Clara', 'Bruno', 'Cauã Souza', 'Débora Lúcia', 'Érico', 'Fátima', 'Gabriel', 'Heloísa', 'Iago', 'Júlia',
  'Kauê', 'Laís', 'Márcio', 'Núbia', 'Otávio', 'Patrícia', 'Quésia', 'Raí', 'Sílvia', 'Tainá', 'Ulisses'];

if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  process.exitCode = await rodarNoEmulador(`node e2e/votos-individual.e2e.mjs --celulares ${N_CELULARES}${SEM_ESPERA ? ' --sem-espera' : ''}${ARG_CONFIG ? ` --config ${ARG_CONFIG}` : ''}`);
} else {
  await sessao();
}

async function abrirNavegador() {
  const erros = [];
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      erros.push(`${channel}: ${e.message.split('\n')[0]}`);
    }
  }
  throw new Error(`Nenhum navegador instalado serviu (Edge ou Chrome):\n${erros.join('\n')}`);
}

// Os módulos da CDN saem do node_modules (o mesmo SDK 12.19.0), sem internet.
async function servirSdk(contexto) {
  await contexto.route(`${SDK_CDN}*`, async (rota) => {
    const nome = new URL(rota.request().url()).pathname.split('/').pop();
    const arquivo = join(RAIZ, 'node_modules', 'firebase', nome);
    if (!/^firebase-[a-z-]+\.js$/.test(nome) || !existsSync(arquivo)) return rota.fulfill({ status: 404, body: 'não há' });
    return rota.fulfill({
      status: 200, body: readFileSync(arquivo, 'utf8'),
      headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  });
}

// O que o telão grava logo depois de a tela mudar chega um instante depois.
async function esperarNoBanco(caminho, esperado, esperaMs = 10000) {
  let valor;
  for (let i = 0; i < esperaMs / 100; i += 1) {
    valor = await administrador('GET', caminho);
    if (JSON.stringify(valor) === JSON.stringify(esperado)) return valor;
    await new Promise((r) => setTimeout(r, 100));
  }
  return valor;
}

async function sessao() {
  mkdirSync(CAPTURAS, { recursive: true });
  if (COPIA) mkdirSync(COPIA, { recursive: true });
  const site = await servir({ porta: 0 });
  // O PIN só do emulador (no projeto real, ele fica só no console, AGENTS.md regra 7).
  await administrador('PUT', 'privado/pinApresentador', PIN_EMULADOR);
  const navegador = await abrirNavegador();
  const erros = [];
  const vigiar = (p, nome) => {
    p.on('pageerror', (e) => erros.push(`${nome} pageerror: ${e.message}`));
    p.on('console', (m) => {
      // A rede derrubada de propósito e as recusas esperadas aparecem no console do SDK.
      if (m.type() === 'error' && !/PERMISSION_DENIED|permission_denied|ERR_INTERNET_DISCONNECTED|WebSocket|FIREBASE WARNING/i.test(m.text())) erros.push(`${nome} console: ${m.text()}`);
    });
  };
  const inicio = Date.now();
  try {
    await jogar({ site, navegador, vigiar });
  } finally {
    await navegador.close();
    await site.fechar();
  }
  assert.deepEqual(erros, [], 'nenhum erro inesperado no console das páginas');
  console.log(`OK: a matriz de votos do modo individual (${N_CELULARES} celulares de verdade contra as regras reais) em ${Math.round((Date.now() - inicio) / 1000)} s${SEM_ESPERA ? ' (--sem-espera: NÃO vale como verificação)' : ''}.`);
}

async function jogar({ site, navegador, vigiar }) {
  const V = await carregarNucleo();
  const H = V.historia;
  const r = V.validarConfig.validarTexto(TEXTO_CONFIG);
  assert.ok(r.ok, `o config precisa passar no validador: ${JSON.stringify(r.erros.slice(0, 3))}`);
  const cfg = r.config;
  assert.equal(cfg.regras.individual, true, 'esta matriz é do modo individual');
  const VAGAS = cfg.ordem.equipes;
  const PASSOS = V.roteiro.passos(cfg, ROTEIRO);
  const RODADAS = PASSOS.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
  assert.equal(RODADAS.length, 6, 'os 6 bimestres');
  const opcoesDe = (rId) => cfg.rodadas[rId].ordemOpcoes;
  for (const rId of RODADAS) assert.equal(opcoesDe(rId).length, 5, `${rId}: 5 opções`);
  const letraDe = (rId, op) => LETRAS[opcoesDe(rId).indexOf(op)];
  const PERSONA = cfg.equipes[VAGAS[0]].persona;
  const lido = (t) => String(t ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------- Telão ----------
  const ctxTelao = await navegador.newContext({ viewport: { width: 1024, height: 768 } });
  await servirSdk(ctxTelao);
  await ctxTelao.route(`${site.url}config.json`, (rota) => rota.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: TEXTO_CONFIG }));
  const telao = await ctxTelao.newPage();
  vigiar(telao, 'telão');
  await telao.goto(`${site.url}telao/?emulador=1`);
  await telao.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await telao.waitForFunction(() => document.getElementById('hash-config'));
  assert.equal(await telao.textContent('#hash-config'), V.validarConfig.hash(cfg), 'o telão leu o config individual');
  await telao.check(`input[name="roteiro"][value="${ROTEIRO}"]`);
  await telao.fill('#pin-apresentador', PIN_EMULADOR);
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'lobby', null, { timeout: 20000 });
  const sala = await telao.evaluate(() => globalThis.Viracao.telao.sala());
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  console.log(`Sala ${sala} (modo individual, roteiro ${ROTEIRO}) com ${N_CELULARES} celulares de verdade.`);

  const estado = () => telao.evaluate(() => globalThis.Viracao.telao.estado());
  async function esperarEstado(teste, descricao, timeout = 25000) {
    const t0 = Date.now();
    for (;;) {
      const e = await estado();
      if (e && teste(e)) return e;
      if (Date.now() - t0 > timeout) throw new Error(`Tempo esgotado esperando: ${descricao}. Estado: ${JSON.stringify(e)}`);
      await telao.waitForTimeout(80);
    }
  }
  // A trava do Avançar do telão é de 1,5 s depois do último uso.
  let ultimoAvanco = 0;
  async function espaco() {
    const falta = 1650 - (Date.now() - ultimoAvanco);
    if (falta > 0) await telao.waitForTimeout(falta);
    await telao.keyboard.press('Space');
    ultimoAvanco = Date.now();
  }
  async function avancar(descricao, teste) {
    const antes = await estado();
    await espaco();
    return esperarEstado(teste || ((e) => e.indice !== antes.indice || e.subfase !== antes.subfase), descricao);
  }
  // Enter encerra; dentro do tempo mínimo de conversa, o telão pede confirmação.
  async function encerrar(descricao, teste) {
    await telao.keyboard.press('Enter');
    const modal = await telao.waitForFunction(() => document.getElementById('modal').open, null, { timeout: 1200 }).then(() => true, () => false);
    if (modal) {
      await telao.keyboard.press('Tab');
      await telao.keyboard.press('Enter');
      await telao.waitForFunction(() => !document.getElementById('modal').open);
    }
    return esperarEstado(teste, descricao, 30000);
  }
  // O relógio do emulador (o "now" da regra), pedido ao próprio servidor.
  const agoraNoServidor = () => administrador('PUT', 'e2e/relogio', { '.sv': 'timestamp' });

  let capturas = 0;
  // alvo: a página do telão ou um celular ({ p }).
  async function capturar(alvo, nome) {
    const p = alvo.p ?? alvo;
    const arquivo = `votos-individual-${String(++capturas).padStart(2, '0')}-${nome}.png`;
    await p.screenshot({ path: join(CAPTURAS, arquivo), fullPage: true });
    if (COPIA) copyFileSync(join(CAPTURAS, arquivo), join(COPIA, arquivo));
  }

  // ---------- Celulares ----------
  const url = `${site.url}aluno/?sala=${sala}&emulador=1`;
  async function novoCelular(nome, rotulo) {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA_CELULAR });
    await servirSdk(ctx);
    const p = await ctx.newPage();
    vigiar(p, rotulo);
    await p.goto(url);
    return { nome, rotulo, ctx, p, uid: null, vaga: null };
  }
  const telaDe = (c) => c.p.evaluate(() => document.body.dataset.tela);
  async function esperarTela(c, tipo, timeout = 25000) {
    try {
      await c.p.waitForFunction((t) => document.body.dataset.tela === t, tipo, { timeout });
    } catch (erro) {
      throw new Error(`${c.rotulo}: esperava a tela "${tipo}", está em "${await telaDe(c)}" (${lido(await c.p.textContent('#tela').catch(() => '')).slice(0, 200)}; ${erro.message.split('\n')[0]})`);
    }
  }
  const textoDaTela = async (c) => lido(await c.p.textContent('#tela'));
  const cracha = async (c) => lido(await c.p.textContent('#cracha'));
  // Em nenhuma tela do modo individual aparece a vaga ("Vaga 7") nem "equipe".
  async function semVaga(c, oque) {
    const t = `${await textoDaTela(c)} ${await cracha(c)}`;
    assert.doesNotMatch(t, /\bVaga\b|\bequipes?\b/i, `${c.rotulo}, ${oque}: apareceu a vaga ou "equipe": ${t.slice(0, 200)}`);
  }
  async function esperarLobby(c) {
    await c.p.waitForFunction(() => document.querySelector('#tela [data-motivo="lobby"]'), null, { timeout: 30000 })
      .catch(async (erro) => { throw new Error(`${c.rotulo}: não chegou ao lobby (tela "${await telaDe(c)}": ${(await textoDaTela(c)).slice(0, 160)}; ${erro.message.split('\n')[0]})`); });
  }
  // O celular abre pelo QR (o código já na URL), toca em "Entrar" e chega ao
  // nome. Sem o nome, ainda não é membro da sala (não ocupa vaga).
  async function ateONome(c) {
    await esperarTela(c, 'entrada');
    await c.p.locator('[data-acao="entrar"]').tap();
    await esperarTela(c, 'nome');
    c.uid = await c.p.evaluate(() => globalThis.Viracao.aluno.uid());
    assert.equal(await administrador('GET', s('membros', c.uid)), null, `${c.rotulo}: sem o nome, não entra na sala`);
    await c.p.locator('#nome-aluno').fill(c.nome);
  }
  async function confirmarNome(c) {
    await c.p.locator('[data-acao="confirmar-nome"]').tap();
  }
  // A vaga do aparelho, dada pelo telão.
  async function vagaDe(c) {
    for (let i = 0; i < 300; i += 1) {
      const v = (await administrador('GET', s('membros', c.uid)))?.equipe;
      if (typeof v === 'string') return v;
      await new Promise((ok) => setTimeout(ok, 100));
    }
    throw new Error(`${c.rotulo}: a vaga não chegou`);
  }

  // O celular do apresentador (D-064), ligado a matriz inteira.
  const esp = await novoCelular(null, 'espectador');
  await esperarTela(esp, 'entrada');
  await esp.p.locator('[data-acao="sou-apresentador"]').tap();
  await esp.p.locator('#pin-espectador').fill(PIN_EMULADOR);
  await esp.p.locator('[data-acao="entrar-espectador"]').tap();
  await esperarTela(esp, 'turmaLobby');

  // Os N - 1 do começo entram juntos: o nome digitado, e o "Entrar" tocado ao
  // mesmo tempo nos N - 1 aparelhos.
  const cel = [];
  for (let i = 0; i < N_CELULARES - 1; i += 1) cel.push(await novoCelular(NOMES[i], `celular ${i + 1}`));
  for (const c of cel) await ateONome(c);
  await capturar(cel[0], 'entrada-nome');
  await Promise.all(cel.map(confirmarNome));
  for (const c of cel) {
    await esperarLobby(c);
    c.vaga = await vagaDe(c);
    assert.equal(await cracha(c), c.nome, `${c.rotulo}: o topo mostra o nome`);
  }
  assert.equal(new Set(cel.map((c) => c.vaga)).size, cel.length, 'nunca duas pessoas na mesma vaga');
  for (const c of cel) assert.ok(VAGAS.includes(c.vaga), `${c.rotulo}: uma vaga do config (${c.vaga})`);
  // O nome fica só no aparelho: em nenhum lugar do banco.
  async function nenhumNomeNoBanco(oque) {
    const banco = JSON.stringify(await administrador('GET', ''));
    for (const n of NOMES) assert.ok(!banco.includes(n), `${oque}: o nome "${n}" foi parar no banco`);
  }
  await nenhumNomeNoBanco('lobby');
  await telao.waitForFunction((n) => document.querySelector('.lobby-conectados')?.dataset.pessoas === String(n), cel.length, { timeout: 20000 });
  assert.equal(lido(await telao.textContent('.lobby-conectados')), `${cel.length} pessoas na sala`);
  await esp.p.waitForFunction((n) => new RegExp(`${n} pessoas na sala`).test(document.querySelector('#tela h1')?.textContent || ''), cel.length, { timeout: 15000 });
  await semVaga(cel[0], 'lobby');
  await capturar(cel[0], 'lobby');
  await capturar(esp, 'espectador-lobby');
  console.log(`${cel.length} celulares entraram juntos com o nome: ${cel.length} vagas diferentes, nenhum nome no banco.`);

  // ---------- Enquetes ----------
  const valorDe = (i, k) => 1 + ((i + k) % 5);
  async function jogarEnquete(passo, quem) {
    const e = await esperarEstado((x) => x.tipo === 'enquete' && x.enquete === passo.enquete && x.momento === passo.momento && x.subfase === 'votando', `enquete ${passo.enquete}/${passo.momento}`);
    const afirmacoes = cfg.enquetes[passo.enquete].ordemAfirmacoes;
    const umaPorVez = e.afirmacao !== '*';
    for (const [k, a] of afirmacoes.entries()) {
      if (umaPorVez && k > 0) await avancar(`afirmação ${a}`, (x) => x.afirmacao === a);
      for (const [i, c] of quem.entries()) {
        await esperarTela(c, 'enquete');
        await c.p.waitForFunction((x) => document.querySelector('.bloco-enquete')?.dataset.afirmacao === x, a, { timeout: 20000 });
        await c.p.locator(`[data-valor="${valorDe(i, k)}"]`).tap();
      }
      if (umaPorVez) for (const c of quem) await esperarTela(c, 'enqueteRegistrada');
    }
    for (const c of quem) await esperarTela(c, 'enqueteRegistrada');
    for (const [k, a] of afirmacoes.entries()) {
      for (const [i, c] of quem.entries()) {
        assert.equal(await esperarNoBanco(s('votosEnquete', passo.enquete, passo.momento, a, c.uid), valorDe(i, k)), valorDe(i, k), `enquete ${passo.enquete}/${passo.momento}: a resposta do ${c.rotulo} chegou`);
      }
    }
    await encerrar(`apurar ${passo.enquete}/${passo.momento}`, (x) => x.subfase === 'apurada');
    const ap = await administrador('GET', s('enquetes', passo.enquete, passo.momento));
    for (const a of afirmacoes) assert.equal(ap.n[a], quem.length, `enquete ${passo.enquete}/${passo.momento}: n da afirmação ${a}`);
    console.log(`Enquete ${passo.enquete}/${passo.momento}: ${quem.length} celulares responderam pela tela.`);
  }

  // As telas de ler ("Conheça o Jonas" e os blocos de dados): a captura do
  // primeiro celular.
  async function lerTodos(quem, oque, { capturarComo = null } = {}) {
    if (capturarComo) await capturar(quem[0], capturarComo);
  }

  // ---------- Do lobby ao Jonas ----------
  for (;;) {
    const e = await estado();
    if (e.tipo === 'personas') break;
    const passo = PASSOS[e.indice];
    if (e.tipo === 'enquete' && e.subfase === 'votando') {
      await jogarEnquete(passo, cel);
      continue;
    }
    await avancar(`depois de ${e.tipo}`);
  }
  for (const c of cel) {
    await esperarTela(c, 'persona');
    await semVaga(c, 'Conheça o Jonas');
  }
  await esperarTela(esp, 'persona');
  await lerTodos(cel, 'Conheça o Jonas', { capturarComo: 'conheca-o-jonas' });
  console.log(`Conheça o Jonas: no celular dos ${cel.length}.`);

  // ---------- Os 6 bimestres ----------
  // O plano: o celular i vota na opção (i + k) mod 5 do bimestre k, e assim
  // toda opção de todo bimestre é tocada (com 5 celulares ou mais). Os casos:
  // - bimestre 1: o celular 2 vota em outra e troca;
  // - bimestre 2: o celular 3 recarrega depois de votar, e quem chega no meio
  //   entra (nome, vaga) e não vota nesta;
  // - bimestre 3: o último dos que entraram no começo não vota (fica a opção
  //   de sempre); a opção dele também é a de outro celular, com 7 ou mais;
  // - bimestre 4: o celular 4 vota sem rede;
  // - bimestre 6: os celulares 1 e 2 votam depois do cronômetro.
  let atrasado = null;
  const todos = () => (atrasado ? [...cel, atrasado] : cel);
  const plano = (c, k) => {
    if (k === 2 && c === cel.at(-1)) return null;
    if (c === atrasado && k <= 1) return null;
    const i = todos().indexOf(c);
    return opcoesDe(RODADAS[k])[(i + k) % 5];
  };
  const cobertas = Object.fromEntries(RODADAS.map((rId) => [rId, new Set()]));
  const opcaoNoCelular = (op) => `.botao-opcao-aluno[data-opcao="${op}"]`;
  async function tocarVotar(c, op) {
    const b = c.p.locator(opcaoNoCelular(op));
    if (await b.getAttribute('aria-expanded') !== 'true') await b.tap();
    const votar = c.p.locator(`[data-detalhe="${op}"] [data-votar]`);
    await votar.waitFor({ timeout: 10000 });
    assert.equal(await votar.isEnabled(), true, `${c.rotulo}: "Votar nesta" habilitado em ${op}`);
    await votar.tap();
  }
  async function votarPelaTela(c, rId, op) {
    await tocarVotar(c, op);
    await c.p.waitForFunction((o) => {
      const b = document.querySelector(`.botao-opcao-aluno[data-opcao="${o}"]`);
      return b?.dataset.meuVoto === '1' && /✓ seu voto/.test(b.textContent) && /Seu voto está nesta/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || '');
    }, op, { timeout: 20000 }).catch(async (erro) => {
      const envios = await c.p.evaluate(() => globalThis.Viracao.aluno.envios());
      throw new Error(`${c.rotulo}: o voto em ${rId}/${op} não foi confirmado na tela (envios ${JSON.stringify(envios)}; ${erro.message.split('\n')[0]})`);
    });
    assert.equal(await esperarNoBanco(s('decisoes', rId, c.vaga, c.uid), op), op, `${c.rotulo}: o voto em ${rId}/${op} está no banco, na vaga dele`);
  }
  async function escolheramNoTelao(n, m, oque) {
    await telao.waitForFunction(([a, b]) => {
      const x = document.querySelector('.turma-andamento');
      return x?.dataset.escolheram === a && x?.dataset.total === b;
    }, [String(n), String(m)], { timeout: 20000 }).catch(async () => {
      const x = await telao.evaluate(() => ({ ...document.querySelector('.turma-andamento')?.dataset }));
      throw new Error(`${oque}: o telão mostra ${JSON.stringify(x)}, esperado ${n} de ${m}`);
    });
    assert.equal(lido(await telao.textContent('.turma-andamento')), `${n} de ${m} já ${n === 1 ? 'escolheu' : 'escolheram'}`, `${oque}: o texto do telão`);
    await esp.p.waitForFunction(([a, b]) => {
      const x = document.querySelector('.turma-contagem');
      return x?.dataset.escolheram === a && x?.dataset.total === b;
    }, [String(n), String(m)], { timeout: 20000 }).catch(async () => {
      throw new Error(`${oque}: o celular do apresentador mostra "${await esp.p.textContent('.turma-contagem').catch(() => null)}", esperado ${n} de ${m}`);
    });
  }
  async function conferirOrdem(c, rId) {
    const lidas = await c.p.$$eval('.botao-opcao-aluno', (bs) => bs.map((b) => [b.dataset.opcao, b.querySelector('.opcao-letra').textContent]));
    assert.deepEqual(lidas, opcoesDe(rId).map((o, i) => [o, LETRAS[i]]), `${c.rotulo}: as opções de ${rId} na ordem do config, com as letras`);
  }

  for (const [k, rId] of RODADAS.entries()) {
    // Do Jonas (ou do bloco anterior), um Espaço abre a decisão.
    if ((await estado()).tipo !== 'rodada') await avancar(`abrir ${rId}`, (e) => e.tipo === 'rodada' && e.rodada === rId && e.subfase === 'decidindo');
    const aberta = await esperarEstado((e) => e.rodada === rId && e.subfase === 'decidindo', `${rId} aberta`);
    const telaoOrdem = await telao.$$eval('.opcoes li', (ls) => ls.map((l) => [l.dataset.opcao, l.querySelector('.letra').textContent]));
    assert.deepEqual(telaoOrdem, opcoesDe(rId).map((o, i) => [o, LETRAS[i]]), `telão: as opções de ${rId} na ordem do config`);
    await esperarTela(esp, 'turmaDecisao');
    for (const c of todos()) {
      await esperarTela(c, 'decisao');
      await conferirOrdem(c, rId);
      await semVaga(c, `decisão de ${rId}`);
    }
    if (k === 0) await capturar(cel[0], 'decisao');

    // Quem chega no meio da decisão do bimestre 2: digita o nome, ganha uma
    // vaga e acompanha; nesta, fica a opção de sempre, e o "N de M" não conta
    // com ele.
    if (k === 1) {
      atrasado = await novoCelular(NOMES[N_CELULARES - 1], `celular ${N_CELULARES} (chegou no meio)`);
      await ateONome(atrasado);
      await confirmarNome(atrasado);
      atrasado.vaga = await vagaDe(atrasado);
      assert.ok(!cel.some((c) => c.vaga === atrasado.vaga), 'quem chega no meio ganha uma vaga só dele');
      await esperarTela(atrasado, 'decisao');
      assert.equal(await cracha(atrasado), atrasado.nome, 'quem chega no meio: o topo mostra o nome');
      const op = opcoesDe(rId)[0];
      await atrasado.p.locator(opcaoNoCelular(op)).tap();
      const votar = atrasado.p.locator(`[data-detalhe="${op}"] [data-votar]`);
      await votar.waitFor({ timeout: 10000 });
      assert.equal(await votar.isDisabled(), true, 'quem chega no meio não vota nesta decisão');
      assert.match(await textoDaTela(atrasado), /Você entrou depois de esta decisão abrir: nesta, fica a opção de sempre\. O seu voto vale na próxima\./);
      await capturar(atrasado, 'chegou-no-meio');
      const membro = await administrador('GET', s('membros', atrasado.uid));
      assert.ok(membro.entrouEm > aberta.abertoEm, 'quem chega no meio entrou depois de a decisão abrir');
      console.log(`${atrasado.rotulo}: entrou no meio do ${rId} com o nome, ganhou a vaga e não vota nesta.`);
    }

    const votantes = todos().filter((c) => plano(c, k) !== null);
    // O total do "N de M": quem estava na sala quando a decisão abriu.
    const total = todos().filter((c) => c !== atrasado || k >= 2).length;
    let n = 0;
    await escolheramNoTelao(0, total, `${rId}, ninguém votou`);
    const depoisDoCronometro = k === 5 ? [cel[0], cel[1]] : [];
    for (const c of votantes) {
      if (depoisDoCronometro.includes(c)) continue;
      const op = plano(c, k);
      if (k === 0 && c === cel[1]) {
        // A troca de voto: primeiro outra opção, depois a do plano.
        const outra = opcoesDe(rId)[(cel.indexOf(c) + k + 2) % 5];
        await votarPelaTela(c, rId, outra);
        n += 1;
        await escolheramNoTelao(n, total, `${rId}, antes da troca`);
        await votarPelaTela(c, rId, op);
        await escolheramNoTelao(n, total, `${rId}, a troca não conta duas vezes`);
        continue;
      }
      if (k === 3 && c === cel[3]) {
        // O voto sem rede: "Enviando…" na hora, e conta quando a rede volta.
        await c.ctx.setOffline(true);
        await tocarVotar(c, op);
        await c.p.waitForFunction((o) => /Enviando o seu voto nesta/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || ''), op, { timeout: 8000 });
        await capturar(c, 'voto-sem-rede');
        await c.ctx.setOffline(false);
        await c.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 0, null, { timeout: 30000 });
        assert.equal(await esperarNoBanco(s('decisoes', rId, c.vaga, c.uid), op, 20000), op, `${c.rotulo}: o voto sem rede chegou quando a rede voltou`);
        n += 1;
        await escolheramNoTelao(n, total, `${rId}, o voto sem rede`);
        continue;
      }
      await votarPelaTela(c, rId, op);
      n += 1;
      if (k === 1 && c === cel[2]) {
        // Recarregar depois de votar: a mesma vaga, o mesmo nome (sem pedir
        // de novo) e o voto marcado.
        await c.p.reload();
        await esperarTela(c, 'decisao');
        assert.equal(await c.p.evaluate(() => globalThis.Viracao.aluno.uid()), c.uid, `${c.rotulo}: recarregado, o mesmo aparelho`);
        assert.equal(await cracha(c), c.nome, `${c.rotulo}: recarregado, o mesmo nome`);
        assert.equal((await administrador('GET', s('membros', c.uid))).equipe, c.vaga, `${c.rotulo}: recarregado, a mesma vaga`);
        await c.p.waitForFunction((o) => document.querySelector(`.botao-opcao-aluno[data-opcao="${o}"]`)?.dataset.meuVoto === '1', op, { timeout: 15000 });
        console.log(`${c.rotulo}: recarregou no meio do ${rId}, voltou com o mesmo nome, a mesma vaga e o voto marcado.`);
      }
      await escolheramNoTelao(n, total, `${rId}, ${c.rotulo}`);
    }
    if (k === 0) await capturar(cel[0], 'decisao-votada');
    if (k === 0) await capturar(esp, 'espectador-decisao');
    if (depoisDoCronometro.length > 0) {
      // Com o prazo antigo, a regra cortava no fim do cronômetro + a graça: o
      // voto que chega depois disso tem de valer, com a decisão ainda aberta.
      const corte = V.alunoLogica.fimDoCronometro(aberta) + cfg.tempos.gracaSeg * 1000;
      const alvo = SEM_ESPERA ? (await agoraNoServidor()) + 1000 : corte + 5000;
      const falta = alvo - (await agoraNoServidor());
      console.log(`${rId}: esperando ${Math.max(0, Math.round(falta / 1000))} s, até o servidor passar do fim do cronômetro + ${cfg.tempos.gracaSeg} s.`);
      if (falta > 0) await telao.waitForTimeout(falta);
      while ((await agoraNoServidor()) < alvo) await telao.waitForTimeout(200);
      assert.equal((await estado()).subfase, 'decidindo', 'e o telão ainda não encerrou');
      for (const c of depoisDoCronometro) {
        await votarPelaTela(c, rId, plano(c, k));
        n += 1;
        await escolheramNoTelao(n, total, `${rId}, depois do cronômetro`);
      }
      console.log(`${rId}: ${depoisDoCronometro.length} votos depois do cronômetro valeram.`);
    }

    await encerrar(`apurar ${rId}`, (e) => e.rodada === rId && e.subfase === 'resultado');
    // O resultado de cada vaga no banco é o voto da tela, ou a opção de sempre.
    const resultados = await esperarNoBanco(s('resultados', rId, todos()[0].vaga, 'decisao'), plano(todos()[0], k) ?? cfg.rodadas[rId].padrao, 15000)
      .then(() => administrador('GET', s('resultados', rId)));
    const contagem = Object.fromEntries(opcoesDe(rId).map((op) => [op, 0]));
    for (const c of todos()) {
      const esperado = plano(c, k) ?? cfg.rodadas[rId].padrao;
      assert.equal(resultados?.[c.vaga]?.decisao, esperado, `${rId}: o resultado do ${c.rotulo} (vaga ${c.vaga}) é o voto da tela`);
      contagem[esperado] += 1;
      if (plano(c, k)) cobertas[rId].add(plano(c, k));
    }
    assert.deepEqual(Object.keys(resultados).sort(), todos().map((c) => c.vaga).sort(), `${rId}: um resultado por pessoa na sala, e nenhum a mais`);
    // O telão: quantas pessoas em cada opção, e quem não votou.
    await telao.waitForFunction(() => document.body.dataset.tela === 'rodada-resultado' && document.querySelectorAll('.turma-opcao').length > 0, null, { timeout: 15000 });
    const noTelao = await telao.$$eval('.turma-opcao', (ls) => ls.map((l) => [l.dataset.opcao, Number(l.dataset.n)]));
    assert.deepEqual(noTelao, opcoesDe(rId).map((op) => [op, contagem[op]]), `${rId}: o telão conta as pessoas de cada opção`);
    const semVoto = todos().length - votantes.length;
    const semVotoNoTelao = await telao.$eval('.turma-sem-voto', (x) => x.textContent).catch(() => null);
    if (semVoto === 0) assert.equal(semVotoNoTelao, null, `${rId}: todos votaram`);
    else assert.match(lido(semVotoNoTelao), new RegExp(`^${semVoto} pessoas? não (escolheu|escolheram) e (ficou|ficaram) na ${letraDe(rId, cfg.rodadas[rId].padrao)}`), `${rId}: quem não votou, no telão`);
    // O celular de cada um: "A sua escolha".
    for (const c of todos()) {
      await esperarTela(c, 'resultado');
      const linha = lido(await c.p.textContent('.decisao-linha'));
      const op = plano(c, k);
      if (op) assert.ok(linha.startsWith(`A sua escolha: ${letraDe(rId, op)} · ${H.textoDaOpcao(cfg, rId, op, PERSONA).rotulo}`), `${c.rotulo}, ${rId}: "${linha}"`);
      else assert.match(linha, /\(você não votou: ficou o de sempre\)$/, `${c.rotulo}, ${rId}: sem voto`);
      assert.equal(lido(await c.p.textContent('.saldo-rotulo')), 'O seu saldo do bimestre', `${c.rotulo}, ${rId}: o saldo`);
      await semVaga(c, `resultado de ${rId}`);
    }
    await esperarTela(esp, 'turmaResultado');
    const noEspectador = Object.fromEntries(await esp.p.$$eval('.turma-opcao', (ls) => ls.map((l) => [l.dataset.opcao, Number(l.dataset.n)])));
    assert.deepEqual(noEspectador, contagem, `${rId}: o celular do apresentador conta as pessoas de cada opção`);
    if (k === 0) {
      await capturar(cel[0], 'resultado');
      await capturar(esp, 'espectador-resultado');
    }
    if (k === 2) await capturar(cel.at(-1), 'resultado-sem-voto');

    // O bloco de dados seguinte, no celular.
    const passoBloco = PASSOS[aberta.indice + 1];
    if (passoBloco?.tipo === 'bloco') {
      await avancar(`bloco depois de ${rId}`, (e) => e.indice === aberta.indice + 1);
      for (const c of todos()) {
        await esperarTela(c, 'situacao');
        assert.equal(lido(await c.p.textContent('h1')), lido(passoBloco.titulo), `${c.rotulo}: o título do bloco`);
        assert.equal(await c.p.locator('.dados-item').count(), (passoBloco.itens || []).length, `${c.rotulo}: os itens do bloco`);
        await semVaga(c, `bloco ${passoBloco.titulo}`);
      }
      await lerTodos(todos(), passoBloco.titulo, { capturarComo: k === 0 ? 'bloco' : null });
    }
    console.log(`${rId}: ${votantes.length} de ${todos().length} votaram pela tela; resultados, "A sua escolha" e o bloco seguinte conferidos.`);
  }
  // Com 7 celulares ou mais, toda opção de todo bimestre passa por um toque.
  if (N_CELULARES >= 7) for (const rId of RODADAS) assert.deepEqual([...cobertas[rId]].sort(), [...opcoesDe(rId)].sort(), `${rId}: toda opção foi tocada em um celular e contada`);

  // ---------- O placar ----------
  await avancar('placar final', (e) => e.tipo === 'placarFinal');
  const resultados = await administrador('GET', s('resultados'));
  const fim = H.fimDoAnoDaTurma(cfg, resultados);
  // Quem chegou no meio do ano fica fora da conta, e a tela diz.
  assert.deepEqual([fim.pessoas, fim.entraramDepois], [todos().length - 1, 1], 'o placar conta quem jogou o ano inteiro');
  const fraseDoAtrasado = H.fraseDosQueEntraramDepois(fim);
  await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'fimDaTurma');
  assert.equal(lido(await telao.textContent('#palco h1')), lido(H.fraseDoFimDaTurma(fim)), 'telão: quantos terminaram com dinheiro sobrando e quantos devendo');
  assert.ok(lido(await telao.textContent('#palco')).includes(fraseDoAtrasado), `telão: "${fraseDoAtrasado}"`);
  await capturar(telao, 'telao-placar-1');
  // "nenhuma fechou", "1 fechou", "3 fecharam": "pessoa" é feminino.
  const quantas = (n, um, varios) => (n === 0 ? `nenhuma ${um}` : n === 1 ? `1 ${um}` : `${n} ${varios}`);
  const fraseDaTurma = `Das ${fim.pessoas} pessoas da turma, ${quantas(fim.positivos, 'fechou', 'fecharam')} o ano com dinheiro sobrando e ${quantas(fim.negativos, 'terminou', 'terminaram')} devendo.`;
  for (const c of todos()) {
    await esperarTela(c, 'situacao');
    assert.equal(lido(await c.p.textContent('h1')), 'As suas escolhas', `${c.rotulo}: o placar`);
    assert.equal(lido(await c.p.textContent('.turma-frase')), fraseDaTurma, `${c.rotulo}: a frase da turma`);
    assert.ok((await textoDaTela(c)).includes(fraseDoAtrasado), `${c.rotulo}: "${fraseDoAtrasado}"`);
    await semVaga(c, 'placar');
  }
  await capturar(cel[0], 'placar');
  await esperarTela(esp, 'turmaPlacar');
  assert.ok(lido(await esp.p.textContent('.turma-destaque')).startsWith(`De ${fim.pessoas} alunos, `), 'o celular do apresentador: a frase da turma');
  await capturar(esp, 'espectador-placar');
  await espaco();
  await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'escolhasDaTurma');
  const linhas = await telao.evaluate(() => Array.from(document.querySelectorAll('.tabela-turma tbody tr'), (tr) => Array.from(tr.querySelectorAll('td'), (td) => Number(td.dataset.n))));
  assert.deepEqual(linhas, RODADAS.map((rId) => opcoesDe(rId).map((op) => Object.values(resultados[rId]).filter((x) => x.decisao === op).length)), 'telão: as escolhas da turma (bimestre × opção)');
  await capturar(telao, 'telao-placar-2');
  await espaco();
  await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'combinacoes');
  await capturar(telao, 'telao-placar-3');
  console.log(`Placar: ${H.fraseDoFimDaTurma(fim)} (telão, celulares e apresentador iguais).`);

  // ---------- Do placar ao fim ----------
  const blocosDoFim = [];
  for (let volta = 0; volta < 30; volta += 1) {
    const e = await estado();
    if (e.tipo === 'fim') break;
    const passo = PASSOS[e.indice];
    if (e.tipo === 'enquete' && e.subfase === 'votando') {
      await jogarEnquete(passo, todos());
      continue;
    }
    if (e.tipo === 'bloco' && !blocosDoFim.includes(e.indice) && (passo.itens || []).length > 0) {
      blocosDoFim.push(e.indice);
      for (const c of todos()) {
        await esperarTela(c, 'situacao');
        assert.equal(lido(await c.p.textContent('h1')), lido(passo.titulo), `${c.rotulo}: o título do bloco`);
        assert.equal(await c.p.locator('.dados-item').count(), passo.itens.length, `${c.rotulo}: os itens do bloco`);
      }
      await lerTodos(todos(), passo.titulo);
      console.log(`${passo.titulo}: no celular de todos.`);
    }
    // O comparativo pagina com o Espaço sem mudar o estado.
    await espaco();
    await telao.waitForTimeout(300);
  }
  await esperarEstado((e) => e.tipo === 'fim', 'o fim');
  for (const c of todos()) {
    await esperarTela(c, 'fim');
    assert.ok((await textoDaTela(c)).includes(fraseDaTurma), `${c.rotulo}: a frase da turma no fim`);
  }
  await nenhumNomeNoBanco('fim');

  // ---------- A sala cheia ----------
  const ocupadas = todos().length;
  for (let i = ocupadas; i < VAGAS.length; i += 1) {
    await administrador('PUT', s('membros', `registro-${String(i).padStart(2, '0')}`), { entrouEm: { '.sv': 'timestamp' } });
  }
  const membrosCheios = async () => Object.values((await administrador('GET', s('membros'))) || {}).filter((m) => typeof m?.equipe === 'string').length;
  for (let i = 0; i < 200 && (await membrosCheios()) < VAGAS.length; i += 1) await telao.waitForTimeout(100);
  assert.equal(await membrosCheios(), VAGAS.length, `as ${VAGAS.length} vagas ocupadas`);
  const cheia = await novoCelular(NOMES[20], 'o 21º celular');
  await ateONome(cheia);
  await confirmarNome(cheia);
  await cheia.p.waitForFunction(() => document.querySelector('#tela [data-motivo="salaCheia"]'), null, { timeout: 20000 });
  assert.equal(lido(await cheia.p.textContent('h1')), `A sala está cheia (${VAGAS.length} pessoas)`);
  await telao.waitForTimeout(1500);
  assert.equal((await administrador('GET', s('membros', cheia.uid)))?.equipe, undefined, 'o 21º não ganha vaga');
  await capturar(cheia, 'sala-cheia');
  console.log(`O 21º celular vê "A sala está cheia (${VAGAS.length} pessoas)".`);
}
