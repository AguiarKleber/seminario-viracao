// O modo com celulares, de ponta a ponta, contra o emulador do Firebase:
// `npm run e2e:online`. Fica fora do `npm run check` (arquitetura, seção 13),
// porque depende de um navegador instalado e do JDK 21 do emulador.
//
// Sobe o bin/servir.mjs (o site por http, como no GitHub Pages) e o emulador
// (bin/emulador.mjs, projeto demo-seminario), semeia o PIN do apresentador e
// joga uma sessão curta com o telão de verdade e 3 celulares de verdade
// (360×740, cada um no próprio contexto, com login anônimo próprio):
// 1. o telão confere as regras (autoteste), cria a sala com o PIN e mostra o QR;
// 2. os celulares entram pelo link do QR; o navegador do Instagram é barrado;
// 3. enquete "antes" uma afirmação por vez, com "voltar" e mudar o voto;
// 4. formação das equipes ("me coloque" e escolha manual), persona e situação;
// 5. uma rodada com a contagem ao vivo da equipe; um celular perde a rede no
//    meio da votação, e o voto guardado no aparelho é reenviado ao voltar; outro
//    recarrega a página com um voto pendente, e o reenvio acontece na volta;
// 6. fechamento em duas fases, sorteio e resultado; o resultado gravado é o
//    que os votos confirmados dizem;
// 7. recarregar o celular volta à tela certa, com o mesmo uid;
// 8. "Continuar sem celulares" segue do espelho local, no mesmo passo.
// Capturas do celular em e2e/capturas/celular-*.png.
//
// O SDK vem do próprio node_modules/firebase (os mesmos arquivos da CDN
// gstatic 12.19.0), servido pelo Playwright no endereço da CDN: o teste não
// depende de internet e exercita o mesmo import() do site.
//
// As funções passadas a page.evaluate/waitForFunction rodam no navegador.
/* global document, innerWidth, innerHeight, getComputedStyle, MutationObserver */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { administrador, PIN_EMULADOR, RAIZ, rodarNoEmulador } from '../bin/emulador.mjs';
import { servir } from '../bin/servir.mjs';
import { carregarNucleo } from '../test/carregar-nucleo.mjs';

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const SDK_CDN = 'https://www.gstatic.com/firebasejs/12.19.0/';
const UA_CELULAR = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const UA_INSTAGRAM = `${UA_CELULAR} Instagram 300.0.0.0 Android`;

// Dentro do emulators:exec (ou com o emulador já no ar), o bin/emulador.mjs
// entrega FIREBASE_DATABASE_EMULATOR_HOST. Sem ela, este arquivo sobe o
// emulador e roda a si mesmo lá dentro.
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  process.exitCode = await rodarNoEmulador('node e2e/sessao-online.e2e.mjs');
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

// Os três módulos da CDN saem do node_modules, com CORS (import() de outra origem).
// falhar(): enquanto devolver true, a CDN recusa a conexão (rede do campus).
async function servirSdk(contexto, { falhar = () => false } = {}) {
  await contexto.route(`${SDK_CDN}*`, async (rota) => {
    if (falhar()) return rota.abort('connectionrefused');
    const nome = new URL(rota.request().url()).pathname.split('/').pop();
    const arquivo = join(RAIZ, 'node_modules', 'firebase', nome);
    if (!/^firebase-[a-z-]+\.js$/.test(nome) || !existsSync(arquivo)) return rota.fulfill({ status: 404, body: 'não há' });
    return rota.fulfill({
      status: 200, body: readFileSync(arquivo, 'utf8'),
      headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  });
}

// O que o teste precisa do config.json, tirado dele (e não escrito aqui): o
// conteúdo ainda muda até o congelamento (docs/decisoes.md), e o teste não pode
// quebrar porque uma equipe trocou de nome.
async function conteudoDoTeste() {
  const V = await carregarNucleo();
  const r = V.validarConfig.validarTexto(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  assert.ok(r.ok, 'o config.json precisa ser válido para o e2e');
  const cfg = r.config;
  const lista = (x) => (Array.isArray(x) ? x : Object.values(x || {}));
  // A abertura do telão começa no primeiro roteiro do config.
  const passos = lista(cfg.roteiros[Object.keys(cfg.roteiros)[0]]);
  const antes = passos.find((p) => p.tipo === 'enquete' && p.momento === 'antes');
  const rodada = passos.find((p) => p.tipo === 'rodada').rodada;
  const ordem = lista(cfg.enquetes[antes.enquete].ordemAfirmacoes);
  const todasOpcoes = lista(cfg.rodadas[rodada].ordemOpcoes);
  const equipes = lista(cfg.ordem.equipes);
  assert.ok(ordem.length >= 3 && todasOpcoes.length >= 3 && equipes.length >= 3 && cfg.regras.alvoPorEquipe >= 2,
    'o roteiro do teste precisa de 3 afirmações no "antes", 3 opções na rodada, 3 equipes e alvoPorEquipe ≥ 2');
  return {
    antes: { enquete: antes.enquete, ordem, total: ordem.length },
    rodada, todasOpcoes, opcoes: todasOpcoes.slice(0, 3), equipes, nomeE1: cfg.equipes[equipes[0]].nome,
    passos, opcoesDe: (r) => lista(cfg.rodadas[r].ordemOpcoes),
  };
}

async function sessao() {
  mkdirSync(CAPTURAS, { recursive: true });
  const site = await servir({ porta: 0 });
  // O PIN só do emulador, o mesmo dos testes de test/emulador/ (no projeto real,
  // ele fica só no console do Firebase, AGENTS.md regra 7).
  await administrador('PUT', 'privado/pinApresentador', PIN_EMULADOR);
  const navegador = await abrirNavegador();
  const errosDaPagina = [];
  const vigiar = (p, nome) => {
    p.on('pageerror', (e) => errosDaPagina.push(`${nome} pageerror: ${e.message}`));
    p.on('console', (m) => {
      // O SDK avisa no console quando uma recusa esperada acontece (o canário do
      // autoteste, o voto tardio) e quando a rede do contexto cai de propósito.
      if (m.type() === 'error' && !/PERMISSION_DENIED|permission_denied|ERR_INTERNET_DISCONNECTED|WebSocket|FIREBASE WARNING/i.test(m.text())) {
        errosDaPagina.push(`${nome} console: ${m.text()}`);
      }
    });
  };
  try {
    await jogar({ site, navegador, vigiar });
  } finally {
    await navegador.close();
    await site.fechar();
  }
  assert.deepEqual(errosDaPagina, [], 'nenhum erro inesperado no console das páginas');
}

// O que o telão grava logo depois de a tela mudar (o apagamento do pedido, por
// exemplo) chega um instante depois: espera até 5 s pelo valor.
async function esperarNoBanco(caminho, esperado, esperaMs = 5000) {
  let valor;
  for (let i = 0; i < esperaMs / 100; i += 1) {
    valor = await administrador('GET', caminho);
    if (JSON.stringify(valor) === JSON.stringify(esperado)) return valor;
    await new Promise((r) => setTimeout(r, 100));
  }
  return valor;
}

async function jogar({ site, navegador, vigiar }) {
  const C = await conteudoDoTeste();
  // ---------- Sem serviço: o offline continua sendo a saída ----------
  // Sem ?emulador=1, vale o conexao.json do site; aqui ele é o modelo com
  // "COLE_AQUI": o telão explica e só oferece o modo sem celulares. O modelo é
  // servido pelo Playwright, e não lido do repositório: desde que o conexao.json
  // foi preenchido com as chaves do projeto real, este bloco fazia login anônimo
  // e o autoteste das regras NO PROJETO REAL (AGENTS.md, regra 6). A CDN também
  // fica bloqueada aqui, para nada deste contexto sair para o serviço.
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.route(`${site.url}conexao.json`, (rota) => rota.fulfill({
      status: 200, contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(Object.fromEntries(['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'].map((k) => [k, 'COLE_AQUI']))),
    }));
    await ctx.route(`${SDK_CDN}*`, (rota) => rota.abort('connectionrefused'));
    const p = await ctx.newPage();
    vigiar(p, 'telão sem conexao.json');
    await p.goto(`${site.url}telao/`);
    await p.waitForFunction(() => /conexao.json ainda não foi preenchido/.test(document.getElementById('status-online')?.textContent || ''));
    await p.waitForFunction(() => document.getElementById('hash-config'));
    assert.equal(await p.isDisabled('[data-acao="criar-online"]'), true);
    assert.equal(await p.isDisabled('[data-acao="comecar-offline"]'), false, 'o modo sem celulares continua disponível');
    await p.setViewportSize({ width: 360, height: 740 });
    await p.goto(`${site.url}aluno/?sala=ABCD`);
    await p.click('[data-acao="entrar"]');
    await p.waitForFunction(() => document.body.dataset.tela === 'erro');
    assert.match(await p.textContent('h1'), /Site ainda não configurado/);
    await ctx.close();
  }
  // A CDN que não responde (rede do campus): o telão desiste em 4 s e oferece o
  // offline; o celular diz "sem acesso ao serviço" e tenta de novo sozinho.
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.route(`${SDK_CDN}*`, () => { /* nunca responde */ });
    const p = await ctx.newPage();
    const inicio = Date.now();
    await p.goto(`${site.url}telao/?emulador=1`);
    await p.waitForFunction(() => /não carregou em 4 s/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 10000 });
    assert.ok(Date.now() - inicio < 9000, 'o tempo-limite do SDK é de 4 s');
    assert.equal(await p.isVisible('[data-acao="tentar-online"]'), true);
    await p.setViewportSize({ width: 360, height: 740 });
    await p.goto(`${site.url}aluno/?sala=ABCD&emulador=1`);
    await p.click('[data-acao="entrar"]');
    await p.waitForFunction(() => document.body.dataset.tela === 'erro', null, { timeout: 10000 });
    assert.match(await p.textContent('h1'), /Sem acesso ao serviço/);
    await ctx.close();
  }

  // A CDN que recusa a conexão e depois volta (revisão da F2, achado 25): o
  // navegador guarda a falha do import() para a página, e repetir o import() na
  // mesma página falha na hora. O "Tentar de novo" do telão recarrega a página, e
  // o celular recarrega sozinho e volta a entrar na sala.
  {
    let falhar = true;
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    await servirSdk(ctx, { falhar: () => falhar });
    const p = await ctx.newPage();
    await p.goto(`${site.url}telao/?emulador=1`);
    await p.waitForFunction(() => /Sem acesso ao serviço/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 15000 });
    falhar = false;
    await p.click('[data-acao="tentar-online"]');
    await p.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
    falhar = true;
    const cel = await ctx.newPage();
    await cel.setViewportSize({ width: 360, height: 740 });
    await cel.goto(`${site.url}aluno/?sala=ABCD&emulador=1`);
    await cel.click('[data-acao="entrar"]');
    await cel.waitForFunction(() => document.body.dataset.tela === 'erro', null, { timeout: 10000 });
    assert.match(await cel.textContent('.texto'), /recarrega sozinha/);
    falhar = false;
    // Recarrega, entra direto na sala que tentava e descobre que ela não existe.
    await cel.waitForFunction(() => document.body.dataset.tela === 'entrada' && /Não há sala com o código ABCD/.test(document.querySelector('.nota')?.textContent || ''), null, { timeout: 30000 });
    await ctx.close();
  }

  // ---------- Telão ----------
  const ctxTelao = await navegador.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  await servirSdk(ctxTelao);
  // let: no fim, outra máquina assume a sala, e os ajudantes passam a falar com ela.
  let telao = await ctxTelao.newPage();
  vigiar(telao, 'telão');
  await telao.goto(`${site.url}telao/?emulador=1`);
  // Autoteste das regras: o canário recusado e a versão aceita.
  await telao.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await telao.waitForFunction(() => document.getElementById('hash-config'));
  await telao.screenshot({ path: join(CAPTURAS, 'online-telao-abertura.png') });
  // Sem PIN, criar a sala é recusado na própria tela.
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => /PIN do apresentador/.test(document.getElementById('aviso')?.textContent || ''));
  // PIN errado: o servidor recusa (a regra compara com privado/pinApresentador).
  await telao.fill('#pin-apresentador', 'pin-errado-123');
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => /PIN não confere/.test(document.getElementById('aviso')?.textContent || ''), null, { timeout: 15000 });
  await telao.fill('#pin-apresentador', PIN_EMULADOR);
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'lobby', null, { timeout: 20000 });
  const sala = await telao.evaluate(() => globalThis.Viracao.telao.sala());
  assert.match(sala, /^[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(await telao.evaluate(() => globalThis.Viracao.telao.modo()), 'online');
  const urlQr = await telao.textContent('.lobby-url');
  assert.match(urlQr, new RegExp(`/aluno/\\?sala=${sala}&emulador=1$`), 'o QR leva ao celular com a sala');
  const meta = await administrador('GET', `salas/${sala}/meta`);
  // A versão vem do telão carregado (a constante VERSAO_APP), e não de um
  // literal: o teste não pode reprovar quando o bin/versao.mjs subir a versão.
  const versaoApp = await telao.evaluate(() => globalThis.Viracao.telao.versaoApp);
  assert.match(versaoApp, /^\d+$/);
  assert.equal(meta.versaoApp, versaoApp, 'a sala guarda a versão do telão que a criou');
  // Revisão da F2, achado 4: o pedido vive só durante a criação. Deixado no
  // banco, ele dava ao uid deste navegador um PIN_OK permanente.
  assert.equal(await esperarNoBanco(`pedidosAnfitriao/${meta.hostUid}`, null), null, 'o PIN sai de pedidosAnfitriao depois de criar a sala');
  console.log(`Sala ${sala} criada com o PIN; autoteste das regras ok.`);

  const estado = () => telao.evaluate(() => globalThis.Viracao.telao.estado());
  async function esperarEstado(teste, descricao, timeout = 15000) {
    const inicio = Date.now();
    for (;;) {
      const e = await estado();
      if (e && teste(e)) return e;
      if (Date.now() - inicio > timeout) throw new Error(`Tempo esgotado esperando: ${descricao}. Estado: ${JSON.stringify(e)}`);
      await telao.waitForTimeout(80);
    }
  }
  let ultimoAvanco = 0;
  async function avancar() {
    const falta = 1650 - (Date.now() - ultimoAvanco);
    if (falta > 0) await telao.waitForTimeout(falta);
    const antes = await estado();
    await telao.keyboard.press('Space');
    ultimoAvanco = Date.now();
    await esperarEstado((e) => e.indice !== antes.indice || e.subfase !== antes.subfase, `sair do passo ${antes.indice}`);
    return estado();
  }
  async function avancarAte(teste, descricao) {
    for (let i = 0; i < 8; i += 1) {
      if (teste(await estado())) return estado();
      await avancar();
    }
    return esperarEstado(teste, descricao);
  }

  // ---------- Celulares ----------
  const url = `${site.url}aluno/?sala=${sala}&emulador=1`;
  async function novoCelular(nome, ua = UA_CELULAR) {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: ua });
    await servirSdk(ctx);
    const p = await ctx.newPage();
    vigiar(p, nome);
    await p.goto(url);
    return { nome, ctx, p };
  }
  const telaDe = (c) => c.p.evaluate(() => document.body.dataset.tela);
  async function esperarTela(c, tipo, timeout = 20000) {
    try {
      await c.p.waitForFunction((t) => document.body.dataset.tela === t, tipo, { timeout });
    } catch (erro) {
      throw new Error(`${c.nome}: esperava a tela "${tipo}", está em "${await telaDe(c)}" (${erro.message.split('\n')[0]})`);
    }
  }
  let capturas = 0;
  // Nada de rolagem lateral e todo alvo de toque com pelo menos 48 px.
  async function conferirCelular(c, nome) {
    const r = await c.p.evaluate(() => {
      const pequenos = [];
      for (const n of document.querySelectorAll('button, summary, input, a.botao')) {
        const q = n.getBoundingClientRect();
        if (q.width === 0 || getComputedStyle(n).visibility === 'hidden') continue;
        if (q.height < 47.5) pequenos.push(`${n.tagName} "${(n.textContent || n.value || '').trim().slice(0, 30)}" ${Math.round(q.height)} px`);
      }
      return { rolagem: document.documentElement.scrollWidth - innerWidth, pequenos };
    });
    assert.ok(r.rolagem <= 0, `${nome}: rolagem lateral de ${r.rolagem} px`);
    assert.deepEqual(r.pequenos, [], `${nome}: alvos de toque abaixo de 48 px`);
    await c.p.screenshot({ path: join(CAPTURAS, `celular-${String(++capturas).padStart(2, '0')}-${nome}.png`), fullPage: true });
  }

  // Navegador embutido do Instagram: a própria tela de entrada barra.
  const insta = await novoCelular('instagram', UA_INSTAGRAM);
  await esperarTela(insta, 'entrada');
  assert.equal(await insta.p.locator('.embutido').count(), 1);
  assert.equal(await insta.p.isDisabled('[data-acao="entrar"]'), true, 'o "Entrar" fica bloqueado no navegador embutido');
  assert.match(await insta.p.inputValue('.campo-url'), new RegExp(`/aluno/\\?sala=${sala}$`));
  await conferirCelular(insta, 'navegador-embutido');
  await insta.ctx.close();

  const cel = [];
  for (const nome of ['ana', 'bia', 'caio']) cel.push(await novoCelular(nome));
  await esperarTela(cel[0], 'entrada');
  assert.equal(await cel[0].p.inputValue('#codigo-sala'), sala, 'o código vem do link');
  await conferirCelular(cel[0], 'entrada');
  for (const c of cel) await c.p.click('[data-acao="entrar"]');
  for (const c of cel) await esperarTela(c, 'aguardando');
  await telao.waitForFunction(() => document.querySelector('.lobby-conectados b')?.textContent === '3', null, { timeout: 20000 });
  const uids = await Promise.all(cel.map((c) => c.p.evaluate(() => globalThis.Viracao.aluno.uid())));
  assert.equal(new Set(uids).size, 3, 'cada celular é um aparelho (uid próprio)');
  await conferirCelular(cel[0], 'lobby');
  await telao.screenshot({ path: join(CAPTURAS, 'online-telao-lobby.png') });

  // ---------- Controle de inativos (arquitetura, seção 10) ----------
  // "N ativos / M membros", discreto no lobby e na barra. Um quarto celular entra
  // e some; o registro de membro fica. 60 s depois do último sinal ele deixa de
  // ser ativo (e sai do denominador do "todos votaram"), e o "Remover inativos"
  // (segurar 2 s) apaga quem está sem sinal há mais de 2 min.
  const ativosNoLobby = (texto, timeout = 20000) => telao.waitForFunction((t) => document.querySelector('.lobby [data-contagem-ativos]')?.textContent === t, texto, { timeout });
  const avisoDiz = (re, timeout = 15000) => telao.waitForFunction((fonte) => new RegExp(fonte).test(document.getElementById('aviso')?.textContent || ''), re.source, { timeout });
  async function segurarNaBarra(acao) {
    await telao.mouse.move(300 + Math.random() * 40, 300);
    await telao.waitForFunction(() => !document.getElementById('barra').hidden);
    await telao.locator(`#barra [data-acao="${acao}"]`).hover();
    await telao.mouse.down();
    await telao.waitForTimeout(2400);
    await telao.mouse.up();
  }
  await ativosNoLobby('3 ativos / 3 membros');
  const dudu = await novoCelular('dudu');
  await dudu.p.click('[data-acao="entrar"]');
  await esperarTela(dudu, 'aguardando');
  const uidDudu = await dudu.p.evaluate(() => globalThis.Viracao.aluno.uid());
  await ativosNoLobby('4 ativos / 4 membros');
  assert.equal(await telao.textContent('#barra [data-contagem-ativos]'), '4 ativos / 4 membros');
  // O celular some (a aba fechada; o servidor apaga a presença dele pelo
  // onDisconnect). O último sinal é então regravado 50 s para trás, para o teste
  // não esperar o minuto inteiro: quando ele cruza os 60 s, nenhum aviso do banco
  // chega, e o telão tem de perceber sozinho.
  await dudu.ctx.close();
  assert.equal(await esperarNoBanco(`salas/${sala}/presenca/${uidDudu}`, null, 20000), null, 'a presença sai quando o celular some');
  await administrador('PUT', `salas/${sala}/presenca/${uidDudu}`, Date.now() - 50000);
  await ativosNoLobby('4 ativos / 4 membros', 5000);
  await ativosNoLobby('3 ativos / 4 membros', 15000);
  assert.equal(await telao.textContent('#barra [data-contagem-ativos]'), '3 ativos / 4 membros');
  // Sem sinal há pouco mais de 1 min: ainda não sai (o limite é de 2 min, para
  // quem só trocou de rede ou apagou a tela não perder a equipe).
  await segurarNaBarra('removerInativos');
  await avisoDiz(/ninguém saiu/);
  assert.ok(await administrador('GET', `salas/${sala}/membros/${uidDudu}`), 'com menos de 2 min sem sinal, o membro fica');
  await administrador('PUT', `salas/${sala}/presenca/${uidDudu}`, Date.now() - 130000);
  await segurarNaBarra('removerInativos');
  await avisoDiz(/^1 membro inativo removido/);
  await ativosNoLobby('3 ativos / 3 membros');
  assert.equal(await administrador('GET', `salas/${sala}/membros/${uidDudu}`), null, '"Remover inativos" apagou o membro sem sinal há mais de 2 min');
  assert.deepEqual(Object.keys(await administrador('GET', `salas/${sala}/membros`)).sort(), [...uids].sort(), 'os três ativos continuam membros');
  assert.ok(!(await telao.textContent('body')).includes(uidDudu), 'nenhum uid na tela projetada');
  console.log('Inativos: o celular que sumiu sai dos ativos em 60 s, e "Remover inativos" o apaga depois de 2 min.');

  // Faixa "atualize a página" quando a versão da sala não é a do celular.
  await administrador('PUT', `salas/${sala}/meta/versaoApp`, '999');
  await cel[0].p.waitForFunction(() => !document.getElementById('faixa-versao').hidden);
  await conferirCelular(cel[0], 'faixa-versao');
  await administrador('PUT', `salas/${sala}/meta/versaoApp`, versaoApp);
  await cel[0].p.waitForFunction(() => document.getElementById('faixa-versao').hidden);

  // ---------- Enquete "antes": uma por vez, avança sozinho, pode voltar ----------
  await avancarAte((e) => e.tipo === 'enquete' && e.momento === 'antes', 'enquete antes');
  for (const c of cel) await esperarTela(c, 'enquete');
  const { total, ordem: afirmacoes } = C.antes;
  assert.equal(await cel[0].p.textContent('.progresso'), `1 de ${total}`);
  assert.match(await cel[0].p.textContent('.privacidade'), /nem o apresentador/);
  await conferirCelular(cel[0], 'enquete-1-de-n');
  async function responder(c, valor, posicao) {
    await c.p.waitForFunction((t) => document.querySelector('.progresso')?.textContent === t, `${posicao} de ${total}`);
    await c.p.click(`[data-valor="${valor}"]`);
  }
  // Ana: 4 na primeira, 5 na segunda (depois volta e muda para 2), 3 nas outras.
  await responder(cel[0], 4, 1);
  await responder(cel[0], 5, 2);
  await cel[0].p.waitForFunction((t) => document.querySelector('.progresso')?.textContent === t, `3 de ${total}`);
  assert.match(await cel[0].p.textContent('.nota'), /Resposta registrada: 5/);
  await cel[0].p.click('[data-acao="anterior"]');
  await cel[0].p.waitForFunction((t) => document.querySelector('.progresso')?.textContent === t, `2 de ${total}`);
  assert.equal(await cel[0].p.getAttribute('[data-valor="5"]', 'aria-pressed'), 'true', 'a resposta anterior aparece marcada');
  await conferirCelular(cel[0], 'enquete-voltar');
  await cel[0].p.click('[data-valor="2"]');
  for (let k = 3; k <= total; k += 1) await responder(cel[0], 3, k);
  await esperarTela(cel[0], 'enqueteRegistrada');
  // Revisão da F2, achado 19: a confirmação e o aviso de privacidade cabem em
  // 360×740, sem rolar.
  assert.ok(await cel[0].p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'a tela "Registrado" cabe sem rolagem em 360×740');
  await conferirCelular(cel[0], 'enquete-registrada');
  for (const [i, c] of cel.slice(1).entries()) {
    for (let k = 1; k <= total; k += 1) await responder(c, 1 + ((i + k) % 5), k);
    await esperarTela(c, 'enqueteRegistrada');
  }
  await telao.waitForFunction(() => /3\s*de 3 votaram/.test(document.querySelector('.enquete-status')?.textContent || ''), null, { timeout: 15000 });
  const votosAntes = await administrador('GET', `salas/${sala}/votosEnquete/${C.antes.enquete}/antes`);
  assert.deepEqual(afirmacoes.map((a) => votosAntes[a]?.[uids[0]]), afirmacoes.map((_, k) => [4, 2][k] ?? 3), 'o voto mudado chegou ao servidor');
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'apurada', 'antes apurado');
  for (const c of cel) await esperarTela(c, 'enqueteRegistrada');
  assert.equal(await cel[0].p.locator('[data-acao="mudar"]').count(), 0, 'votação encerrada: sem "Mudar"');

  // ---------- Equipes, persona e situação ----------
  const [E1, E2, E3] = C.equipes;
  const marcada = (c, seletor) => c.p.waitForFunction((s) => document.querySelector(s)?.getAttribute('aria-pressed') === 'true', seletor);
  await avancarAte((e) => e.tipo === 'formarEquipes', 'formar equipes');
  for (const c of cel) await esperarTela(c, 'escolherEquipe');
  await conferirCelular(cel[0], 'escolher-equipe');
  await cel[0].p.click('[data-acao="me-coloque"]');
  await cel[0].p.waitForFunction(() => document.querySelector('[data-equipe][aria-pressed="true"]'));
  await cel[1].p.click(`.botao-equipe[data-equipe="${E2}"]`);
  await marcada(cel[1], `.botao-equipe[data-equipe="${E2}"]`);
  // Troca livre antes da trava: sai de uma equipe e volta.
  await cel[1].p.click(`.botao-equipe[data-equipe="${E3}"]`);
  await marcada(cel[1], `.botao-equipe[data-equipe="${E3}"]`);
  await cel[1].p.click(`.botao-equipe[data-equipe="${E2}"]`);
  await marcada(cel[1], `.botao-equipe[data-equipe="${E2}"]`);
  await cel[2].p.click('[data-acao="me-coloque"]');
  await cel[2].p.waitForFunction(() => document.querySelector('[data-equipe][aria-pressed="true"]'));
  const membros = await administrador('GET', `salas/${sala}/membros`);
  const equipeDe = (i) => membros[uids[i]].equipe;
  assert.equal(equipeDe(0), E1, '"me coloque" completa a primeira equipe');
  assert.equal(equipeDe(2), E1, '"me coloque" completa a primeira equipe até o alvo');
  assert.equal(equipeDe(1), E2);
  // O crachá: forma, número e nome da equipe, e o código curto que o
  // apresentador digita no "Mover aluno" (o mesmo de alunoLogica.codigoCracha).
  await cel[0].p.waitForFunction((n) => document.querySelector('#cracha .equipe-nome')?.textContent === n, C.nomeE1);
  const codigoAna = await cel[0].p.textContent('#cracha .cracha-codigo');
  assert.match(codigoAna, /^[A-HJ-NP-Z2-9]{3}$/, 'crachá curto com a equipe');
  assert.equal(await cel[0].p.evaluate((n) => globalThis.Viracao.alunoLogica.cracha(globalThis.Viracao.aluno.uid(), n), C.nomeE1), `${C.nomeE1} · ${codigoAna}`);
  await conferirCelular(cel[0], 'equipe-escolhida');

  await avancar(); // personas (as equipes travam)
  await esperarEstado((e) => e.tipo === 'personas' && e.equipesTravadas === true, 'personas');
  for (const c of cel) await esperarTela(c, 'persona');
  await conferirCelular(cel[0], 'persona');
  await avancar(); // bloco: a situação da persona
  await esperarEstado((e) => e.tipo === 'bloco', 'bloco');
  await esperarTela(cel[0], 'situacao');
  await conferirCelular(cel[0], 'situacao-bloco');

  // ---------- Rodada: contagem ao vivo, queda de rede e recarga ----------
  const R = C.rodada;
  const [OA, OB, OC] = C.opcoes;
  const opcao = (op) => `.botao-opcao-aluno[data-opcao="${op}"]`;
  const temNota = (c, re, timeout = 10000) => c.p.waitForFunction((fonte) => new RegExp(fonte).test(document.querySelector('.nota')?.textContent || ''), re.source, { timeout });
  await avancarAte((e) => e.tipo === 'rodada' && e.subfase === 'decidindo' && e.rodada === R, `rodada ${R}`);
  for (const c of cel) await esperarTela(c, 'decisao');
  // Revisão da F2, achado 17: a caixa "Situação de …" tem um marcador de que abre.
  const marcador = () => cel[0].p.evaluate(() => getComputedStyle(document.querySelector('.situacao-resumo summary'), '::after').content);
  assert.match(await marcador(), /ver/);
  await cel[0].p.click('.situacao-resumo summary');
  assert.match(await marcador(), /fechar/);
  await cel[0].p.click('.situacao-resumo summary');
  await cel[0].p.click(opcao(OA));
  await temNota(cel[0], /registrado/);
  // A contagem ao vivo da própria equipe chega ao outro celular da equipe.
  await cel[2].p.waitForFunction((op) => document.querySelector(`[data-opcao="${op}"] .opcao-votos`)?.textContent === '1 voto', OA);
  await cel[2].p.click(opcao(OB));
  await temNota(cel[2], /registrado/);
  await conferirCelular(cel[0], 'decisao-contagem');
  await telao.waitForFunction((eq) => /2 de 2/.test(document.querySelector(`.equipe-status[data-equipe="${eq}"]`)?.textContent || ''), E1, { timeout: 15000 });

  // Caio perde a rede e muda de opção: o voto fica guardado no aparelho.
  const caio = cel[2];
  await caio.ctx.setOffline(true);
  await caio.p.click(opcao(OA));
  await caio.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 1);
  const pendenteCaio = await caio.p.evaluate(() => Object.values(globalThis.Viracao.aluno.pendentes())[0]);
  assert.deepEqual({ ...pendenteCaio }, { tipo: 'decisao', rodada: R, equipe: E1, opcao: OA });
  assert.equal(await caio.p.isDisabled(opcao(OC)), true, 'botões desabilitados enquanto envia');
  await temNota(caio, /Enviando…/, 9000);
  await conferirCelular(caio, 'decisao-enviando');
  assert.equal(await administrador('GET', `salas/${sala}/decisoes/${R}/${E1}/${uids[2]}`), OB, 'sem rede, o servidor ainda tem o voto antigo');
  await temNota(caio, /Guardado no aparelho/, 20000);
  await conferirCelular(caio, 'decisao-guardado');
  await caio.ctx.setOffline(false);
  await caio.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 0, null, { timeout: 30000 });
  await temNota(caio, /registrado/);
  assert.equal(await administrador('GET', `salas/${sala}/decisoes/${R}/${E1}/${uids[2]}`), OA, 'o voto guardado foi reenviado ao voltar a rede');
  console.log('Queda de rede no meio da votação: voto guardado e reenviado.');

  // Bia vota sem rede e recarrega a página: o pendente do localStorage é
  // reenviado pela página nova (a fila do SDK morreu com a página velha).
  const bia = cel[1];
  await bia.ctx.setOffline(true);
  await bia.p.click(opcao(OC));
  await bia.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 1);
  await bia.p.close();
  assert.equal(await administrador('GET', `salas/${sala}/decisoes/${R}/${E2}/${uids[1]}`), null);
  await bia.ctx.setOffline(false);
  bia.p = await bia.ctx.newPage();
  await bia.p.goto(url);
  await esperarTela(bia, 'decisao');
  assert.equal(await bia.p.evaluate(() => globalThis.Viracao.aluno.uid()), uids[1], 'recarregar mantém o mesmo aparelho (uid)');
  await bia.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 0, null, { timeout: 20000 });
  assert.equal(await administrador('GET', `salas/${sala}/decisoes/${R}/${E2}/${uids[1]}`), OC, 'o pendente foi reenviado depois de recarregar');
  await marcada(bia, opcao(OC));
  console.log('Recarga com voto pendente: reenviado pela página nova.');

  await telao.keyboard.press('Enter');
  // Ainda no tempo mínimo de conversa: o telão pede confirmação.
  await telao.waitForFunction(() => document.getElementById('modal').open);
  // O foco começa no "Cancelar" (revisão da F2, achado 15): confirmar é Tab e Enter.
  await telao.keyboard.press('Tab');
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'sorteio', 'sorteio', 20000);
  for (const c of cel) await esperarTela(c, 'sorteando');
  await conferirCelular(cel[0], 'sorteando');
  const resultados = await administrador('GET', `salas/${sala}/resultados/${R}`);
  assert.equal(resultados[E1].decisao, OA);
  assert.equal(resultados[E1].origem, 'maioria');
  assert.deepEqual({ ...resultados[E1].contagem }, Object.fromEntries(C.todasOpcoes.map((o) => [o, o === OA ? 2 : 0])), 'contados = confirmados (fechamento em duas fases)');
  assert.equal(resultados[E2].decisao, OC);
  await avancar(); // resultado
  await esperarEstado((e) => e.subfase === 'resultado', 'resultado');
  for (const c of cel) await esperarTela(c, 'resultado');
  const cartaAna = await cel[0].p.getAttribute('.bloco[data-carta]', 'data-carta');
  assert.equal(cartaAna, resultados[E1].carta, 'o celular mostra a carta que o telão sorteou');
  await conferirCelular(cel[0], 'resultado');

  // Recarregar o celular volta à mesma tela, com o mesmo uid.
  await cel[0].p.reload();
  await esperarTela(cel[0], 'resultado');
  assert.equal(await cel[0].p.evaluate(() => globalThis.Viracao.aluno.uid()), uids[0]);
  assert.equal(await cel[0].p.evaluate(() => localStorage.getItem('viracao:aluno:sala')), JSON.stringify(sala));

  // O próximo bloco: a situação com a narrativa do mês (D-006).
  await avancar();
  await esperarEstado((e) => e.tipo === 'bloco', 'bloco depois da rodada');
  await esperarTela(cel[0], 'situacao');
  assert.ok(await cel[0].p.locator('.mes').count() === 1, 'a situação traz o último mês');
  await conferirCelular(cel[0], 'situacao-depois-da-rodada');

  // ---------- Uma aba escritora por máquina (I3) ----------
  // Outra aba do mesmo navegador tem o mesmo uid e passaria na regra do
  // anfitrião: a trava de aba (navigator.locks) recusa, sem pedir PIN.
  const outraAba = await ctxTelao.newPage();
  vigiar(outraAba, 'telão, outra aba');
  await outraAba.goto(`${site.url}telao/?emulador=1`);
  await outraAba.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await outraAba.waitForFunction(() => document.getElementById('hash-config'));
  assert.equal(await outraAba.inputValue('#sala-retomar'), sala, 'a última sala online vem preenchida');
  await outraAba.click('[data-acao="retomar-online"]');
  await outraAba.waitForFunction(() => /aberta em outra aba/.test(document.getElementById('aviso')?.textContent || ''), null, { timeout: 15000 });
  assert.equal(await outraAba.evaluate(() => document.body.dataset.tela), 'abertura');
  await outraAba.close();

  // ---------- Queda de rede no telão (revisão da F2, achados 22, 23 e 29) ----------
  // Sem rede, o comando é recusado na hora (antes, ficava preso no SDK, travava
  // a fila inteira, o "Salvar estado" inclusive, e era reaplicado em rajada
  // quando a rede voltava); o voltar à vista não enfileira uma leitura que só
  // terminaria num erro técnico projetado.
  await telao.evaluate(() => {
    globalThis.__avisos = [];
    const a = document.getElementById('aviso');
    new MutationObserver(() => { if (!a.hidden) globalThis.__avisos.push(a.textContent); })
      .observe(a, { childList: true, characterData: true, subtree: true, attributes: true });
  });
  const antesDaQueda = await estado();
  await ctxTelao.setOffline(true);
  await telao.waitForFunction(() => document.querySelector('#barra .selo')?.dataset.estado === 'reconectando', null, { timeout: 30000 });
  const inicioQueda = Date.now();
  await telao.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  // A trava do Avançar (1,5 s depois do último uso) vale aqui também.
  await telao.waitForTimeout(Math.max(0, 1650 - (Date.now() - ultimoAvanco)));
  await telao.keyboard.press('Space');
  await telao.waitForFunction(() => globalThis.__avisos.some((x) => /Sem conexão com o serviço: o comando não foi enviado/.test(x)), null, { timeout: 5000 });
  await telao.keyboard.press('Enter');
  await telao.mouse.move(300, 760);
  await telao.waitForFunction(() => !document.getElementById('barra').hidden);
  const baixando = telao.waitForEvent('download', { timeout: 5000 });
  await telao.click('#barra [data-acao="salvar"]');
  const salvoSemRede = JSON.parse(readFileSync(await (await baixando).path(), 'utf8'));
  assert.equal(salvoSemRede.dados.estado.geracao, antesDaQueda.geracao, '"Salvar estado" funciona sem rede, do espelho');
  await telao.waitForTimeout(Math.max(0, 11_000 - (Date.now() - inicioQueda)));
  assert.deepEqual(await telao.evaluate(() => globalThis.__avisos.filter((x) => /SEM_CONEXAO|SEM_RESPOSTA/.test(x))), [], 'nenhum erro técnico projetado');
  await ctxTelao.setOffline(false);
  await telao.waitForFunction(() => document.querySelector('#barra .selo')?.dataset.estado === 'conectado', null, { timeout: 60000 });
  await telao.waitForTimeout(3000);
  const depoisDaQueda = await administrador('GET', `salas/${sala}/estado`);
  assert.equal(depoisDaQueda.geracao, antesDaQueda.geracao, 'nada do que foi apertado sem rede é reaplicado quando a rede volta');
  assert.equal((await estado()).geracao, antesDaQueda.geracao);
  console.log('Queda de rede no telão: comandos recusados na hora, "Salvar estado" funciona, nada reaplicado depois.');

  // ---------- "Continuar sem celulares" (segurar 2 s) ----------
  const antes = await estado();
  await telao.mouse.move(300, 300);
  await telao.waitForFunction(() => !document.getElementById('barra').hidden);
  const botao = telao.locator('#barra [data-acao="semCelulares"]');
  await botao.hover();
  await telao.mouse.down();
  await telao.waitForTimeout(2400);
  await telao.mouse.up();
  await telao.waitForFunction(() => globalThis.Viracao.telao.modo() === 'offline', null, { timeout: 10000 });
  const depois = await estado();
  assert.equal(depois.indice, antes.indice, 'segue do mesmo passo');
  assert.equal(depois.geracao, antes.geracao, 'o estado veio do espelho, sem transição');
  await telao.screenshot({ path: join(CAPTURAS, 'online-telao-sem-celulares.png') });
  // Revisão da F2, achado 30: a árvore guardada no navegador do notebook não
  // leva presença nem os votos de passos já encerrados.
  const guardada = await telao.evaluate(([s, v]) => JSON.parse(localStorage.getItem(`viracao:telao:v${v}:sala:${s}`)).salas[s], [sala, versaoApp]);
  assert.equal(guardada.presenca, undefined, 'sem presença no localStorage');
  assert.equal(guardada.decisoes, undefined, 'sem as decisões da rodada já apurada');
  assert.equal(guardada.votosEnquete, undefined, 'sem os votos da enquete já apurada');
  assert.ok(guardada.enquetes && guardada.resultados, 'as apurações ficam');
  // Achado 28: só de ida também depois de recarregar. A abertura não oferece
  // religar a sala do banco, que ficou no passo de antes da queda.
  await telao.reload();
  await telao.waitForFunction(() => document.getElementById('sala-retomar'));
  assert.equal(await telao.inputValue('#sala-retomar'), '', 'a sala online não vem preenchida para retomar');
  console.log('"Continuar sem celulares": seguiu do espelho local, no mesmo passo.');

  // ---------- Retomar a sala ----------
  // Outra máquina (outro contexto, outro uid): sem PIN, não assume; com o PIN,
  // grava meta/hostUid e segue do passo em que a sala está.
  const ctxOutra = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  await servirSdk(ctxOutra);
  const outra = await ctxOutra.newPage();
  vigiar(outra, 'telão, outra máquina');
  await outra.goto(`${site.url}telao/?emulador=1`);
  await outra.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await outra.waitForFunction(() => document.getElementById('hash-config'));
  await outra.fill('#sala-retomar', sala.toLowerCase());
  await outra.click('[data-acao="retomar-online"]');
  await outra.waitForFunction(() => /Digite o PIN/.test(document.getElementById('aviso')?.textContent || ''));
  await outra.fill('#pin-apresentador', PIN_EMULADOR);
  await outra.click('[data-acao="retomar-online"]');
  await outra.waitForFunction(() => globalThis.Viracao.telao.estado() && document.body.dataset.tela !== 'abertura', null, { timeout: 20000 });
  assert.equal(await outra.evaluate(() => globalThis.Viracao.telao.modo()), 'online');
  const assumido = await outra.evaluate(() => globalThis.Viracao.telao.estado());
  assert.equal(assumido.indice, antes.indice, 'a outra máquina segue do mesmo passo');
  const novoHost = await administrador('GET', `salas/${sala}/meta/hostUid`);
  assert.notEqual(novoHost, meta.hostUid, 'o hostUid passou para a outra máquina (com o PIN)');
  await esperarTela(cel[0], 'situacao');
  console.log('Retomar: outra aba recusada pela trava; outra máquina assumiu com o PIN.');

  assert.equal(await esperarNoBanco(`pedidosAnfitriao/${novoHost}`, null), null, 'o PIN sai de pedidosAnfitriao depois de assumir');

  // ---------- Uma terceira máquina assume (revisão da F2, achado 24) ----------
  // A máquina que perdeu a sala não a toma de volta só por voltar à vista (antes,
  // o carregarSala regravava o hostUid com o PIN que ficava em pedidosAnfitriao, e
  // as duas se revezavam): ela fica passiva.
  const ctxTerceira = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  await servirSdk(ctxTerceira);
  const terceira = await ctxTerceira.newPage();
  vigiar(terceira, 'telão, terceira máquina');
  await terceira.goto(`${site.url}telao/?emulador=1`);
  await terceira.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await terceira.waitForFunction(() => document.getElementById('hash-config'));
  await terceira.fill('#sala-retomar', sala);
  await terceira.fill('#pin-apresentador', PIN_EMULADOR);
  await terceira.click('[data-acao="retomar-online"]');
  await terceira.waitForFunction(() => globalThis.Viracao.telao.estado() && document.body.dataset.tela !== 'abertura', null, { timeout: 20000 });
  const hostTerceira = await administrador('GET', `salas/${sala}/meta/hostUid`);
  assert.notEqual(hostTerceira, novoHost, 'a terceira máquina assumiu');
  await outra.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await outra.waitForFunction(() => /Outra máquina assumiu/.test(document.getElementById('aviso')?.textContent || ''), null, { timeout: 15000 });
  await outra.waitForTimeout(2000);
  assert.equal(await administrador('GET', `salas/${sala}/meta/hostUid`), hostTerceira, 'a máquina que perdeu a sala não a tomou de volta');
  const geracaoAntes = (await administrador('GET', `salas/${sala}/estado`)).geracao;
  await outra.keyboard.press('Space');
  await outra.waitForTimeout(1500);
  assert.equal((await administrador('GET', `salas/${sala}/estado`)).geracao, geracaoAntes, 'o telão passivo não manda comando');
  assert.equal(await esperarNoBanco(`pedidosAnfitriao/${hostTerceira}`, null), null);
  await ctxOutra.close();
  console.log('Terceira máquina assumiu; a anterior ficou passiva e não retomou sozinha.');

  // ---------- Daqui em diante, o telão é o da terceira máquina ----------
  telao = terceira;
  ultimoAvanco = 0;
  async function pularPara(teste, descricao) {
    const atual = await estado();
    const alvo = C.passos.findIndex((p, i) => i > atual.indice && teste(p));
    assert.ok(alvo > atual.indice, `não há passo à frente: ${descricao}`);
    await telao.mouse.move(320 + Math.random() * 40, 300);
    await telao.waitForFunction(() => !document.getElementById('barra').hidden);
    await telao.click('#barra [data-acao="pular"]');
    await telao.waitForFunction(() => document.getElementById('modal').open);
    await telao.locator('#modal button').filter({ hasText: new RegExp(`^${alvo + 1}\\. `) }).first().click();
    return esperarEstado((e) => e.indice === alvo, descricao);
  }

  // ---------- Prorrogação: empate dentro da equipe ----------
  await avancarAte((e) => e.tipo === 'rodada' && e.subfase === 'decidindo', 'segunda rodada');
  const R2 = (await estado()).rodada;
  const [P1, P2] = C.opcoesDe(R2);
  for (const c of cel) await esperarTela(c, 'decisao');
  await cel[0].p.click(opcao(P1));
  await temNota(cel[0], /registrado/);
  await caio.p.click(opcao(P2));
  await temNota(caio, /registrado/);
  await telao.keyboard.press('Enter');
  await telao.waitForFunction(() => document.getElementById('modal').open);
  // O foco começa no "Cancelar" (revisão da F2, achado 15): confirmar é Tab e Enter.
  await telao.keyboard.press('Tab');
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'prorrogacao', 'prorrogação', 20000);
  await esperarTela(cel[0], 'prorrogacao');
  await esperarTela(caio, 'prorrogacao');
  assert.deepEqual(await cel[0].p.$$eval('.botao-opcao-aluno', (bs) => bs.map((b) => b.dataset.opcao)), [P1, P2], 'na prorrogação, só as opções empatadas');
  await conferirCelular(cel[0], 'prorrogacao');
  // A outra equipe (a da Bia, que não votou) espera o desempate.
  await esperarTela(bia, 'aguardando');
  assert.equal(await bia.p.getAttribute('.bloco[data-motivo]', 'data-motivo'), 'desempateDeOutrasEquipes');
  await cel[0].p.click(opcao(P2));
  await temNota(cel[0], /registrado/);
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'sorteio', 'sorteio da segunda rodada', 20000);
  const res2 = await administrador('GET', `salas/${sala}/resultados/${R2}`);
  assert.equal(res2[E1].decisao, P2);
  assert.equal(res2[E1].origem, 'prorrogacao');
  assert.equal(res2[E2].origem, 'piloto', 'equipe sem voto: piloto automático');
  console.log('Prorrogação: só as empatadas no celular; a outra equipe espera.');

  // ---------- Enquete "depois" e comparativo pessoal ----------
  await pularPara((p) => p.tipo === 'enquete' && p.momento === 'depois' && p.enquete === C.antes.enquete, 'enquete depois');
  for (const c of cel) await esperarTela(c, 'enquete');
  for (let k = 1; k <= total; k += 1) await responder(cel[0], k === 1 ? 2 : 3, k);
  await esperarTela(cel[0], 'enqueteRegistrada');
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'apurada', 'depois apurado');
  await pularPara((p) => p.tipo === 'comparativo', 'comparativo');
  await esperarTela(cel[0], 'comparativo');
  const linha1 = await cel[0].p.textContent(`.resposta[data-afirmacao="${afirmacoes[0]}"] .resposta-voto`);
  assert.match(linha1, /Você antes: 4 · .+, agora: 2 · /, '"você antes: 4, agora: 2", só no próprio celular');
  const linhaBia = await bia.p.textContent(`.resposta[data-afirmacao="${afirmacoes[0]}"] .resposta-voto`);
  assert.match(linhaBia, /agora: sem resposta/);
  await conferirCelular(cel[0], 'comparativo');

  // ---------- Fim, entrada fechada e sala apagada ----------
  await pularPara((p) => p.tipo === 'fim', 'fim');
  for (const c of cel) await esperarTela(c, 'fim');
  await conferirCelular(cel[0], 'fim');
  await telao.mouse.move(360, 320);
  await telao.waitForFunction(() => !document.getElementById('barra').hidden);
  await telao.click('#barra [data-acao="entrada"]');
  await telao.waitForFunction(() => document.querySelector('#barra [data-acao="entrada"]')?.getAttribute('aria-pressed') === 'false');
  const dani = await novoCelular('dani');
  await dani.p.click('[data-acao="entrar"]');
  await esperarTela(dani, 'entradaFechada');
  await conferirCelular(dani, 'entrada-fechada');
  // O apresentador reabre: quem esperava entra sozinho.
  await telao.mouse.move(380, 330);
  await telao.waitForFunction(() => !document.getElementById('barra').hidden);
  await telao.click('#barra [data-acao="entrada"]');
  await esperarTela(dani, 'fim', 20000);
  const segurar = async (seletor) => {
    await telao.locator(seletor).hover();
    await telao.mouse.down();
    await telao.waitForTimeout(2400);
    await telao.mouse.up();
  };
  await segurar('[data-acao="apagar"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'abertura', null, { timeout: 15000 });
  for (const c of [...cel, dani]) await esperarTela(c, 'salaEncerrada');
  await conferirCelular(cel[0], 'sala-encerrada');
  assert.equal(await administrador('GET', `salas/${sala}`), null, 'a sala foi apagada (e os votos individuais com ela)');
  console.log('Comparativo pessoal, fim, entrada fechada e reaberta, sala apagada.');

  // Nenhum script do celular usa innerHTML nem type="module" (AGENTS.md, regras 3 e 4).
  for (const arquivo of ['js/aluno.js', 'aluno/index.html']) {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
    assert.ok(!/\.(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(|document\.write\s*\(/.test(texto), `${arquivo}: sem innerHTML`);
    assert.ok(!/type=["']module["']/.test(texto), `${arquivo}: sem type="module"`);
  }
  console.log(`ok: sessão online com 3 celulares no emulador (sala ${sala}); ${capturas} capturas do celular em e2e/capturas/`);
}
