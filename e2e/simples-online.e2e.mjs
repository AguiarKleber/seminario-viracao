// O formato simples (regras.formatoSimples; decisão do Kleber de 05/10 à noite)
// com celulares, contra o emulador do Firebase: `npm run e2e:online:simples`.
// Fica fora do `npm run check`, como o e2e:online (navegador instalado e JDK 21).
//
// Sobe o bin/servir.mjs e o emulador (projeto demo-seminario), e joga a
// fixture test/fixtures/config-simples.json (servida no lugar do config.json)
// com o telão de verdade em 1024×768 e em 1280×720, com a faixa de entrada
// aberta embaixo (o pior caso de altura), e 3 celulares de verdade em 360×740:
// 1. "Conheça o Jonas" no celular, sem o ponto de partida dos indicadores;
// 2. a decisão: as 5 opções com a letra, o rótulo e o custo humano, sem o
//    dinheiro (D-079: às cegas); a dobra "Mais opções abaixo" aparece enquanto
//    a última opção está abaixo da tela e some quando ela aparece; aberta a
//    última opção, o "Votar nesta" fica à vista (e não atrás do aviso);
// 3. o fechamento sem sorteio: o celular vai da decisão ao resultado sem
//    passar pela tela "Sorteando…", e o telão também não desenha o sorteio;
// 4. o resultado no celular: o saldo do bimestre e o dinheiro da família
//    (tem/devendo), sem os indicadores (energia, proteção) e sem o detalhe da
//    dívida; a situação do bloco seguinte, idem;
// 5. o placar final: o celular mostra as escolhas da equipe, sem "Escolha ou
//    sorte?" e sem o pior caso; o telão, as três páginas, cabendo em 1024×768
//    com a faixa de entrada.
/* global document, innerHeight, innerWidth, MutationObserver, requestAnimationFrame */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { administrador, PIN_EMULADOR, RAIZ, rodarNoEmulador } from '../bin/emulador.mjs';
import { servir } from '../bin/servir.mjs';
import { carregarNucleo } from '../test/carregar-nucleo.mjs';

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const SDK_CDN = 'https://www.gstatic.com/firebasejs/12.19.0/';
const UA_CELULAR = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
// A fixture por padrão; `npm run e2e:online:simples -- --config config.json` joga o
// config do dia (D-078), com a enquete de entrada antes da formação e os blocos
// de dados entre as rodadas.
const ARG_CONFIG = (() => {
  const i = process.argv.indexOf('--config');
  return i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length);
})();
const TEXTO_CONFIG = readFileSync(ARG_CONFIG ? resolve(RAIZ, ARG_CONFIG) : join(RAIZ, 'test', 'fixtures', 'config-simples.json'), 'utf8');

if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  process.exitCode = await rodarNoEmulador(`node e2e/simples-online.e2e.mjs${ARG_CONFIG ? ` --config ${ARG_CONFIG}` : ''}`);
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

async function sessao() {
  mkdirSync(CAPTURAS, { recursive: true });
  const site = await servir({ porta: 0 });
  await administrador('PUT', 'privado/pinApresentador', PIN_EMULADOR);
  const navegador = await abrirNavegador();
  const erros = [];
  const vigiar = (p, nome) => {
    p.on('pageerror', (e) => erros.push(`${nome} pageerror: ${e.message}`));
    p.on('console', (m) => {
      if (m.type() === 'error' && !/PERMISSION_DENIED|permission_denied|ERR_INTERNET_DISCONNECTED|WebSocket|FIREBASE WARNING/i.test(m.text())) erros.push(`${nome} console: ${m.text()}`);
    });
  };
  try {
    await jogar({ site, navegador, vigiar });
  } finally {
    await navegador.close();
    await site.fechar();
  }
  assert.deepEqual(erros, [], 'nenhum erro inesperado no console das páginas');
}

async function jogar({ site, navegador, vigiar }) {
  const V = await carregarNucleo();
  await import(new URL('../js/ui/formatar.js', import.meta.url).href);
  const F = globalThis.Viracao.formatar;
  const H = V.historia;
  const cfg = V.validarConfig.validarTexto(TEXTO_CONFIG).config;
  const RODADAS = cfg.ordem.rodadas;
  const PERSONA = cfg.equipes.e1.persona;
  const lido = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const servirConfig = (ctx) => ctx.route(`${site.url}config.json`, (rota) => rota.fulfill({
    status: 200, contentType: 'application/json; charset=utf-8', body: TEXTO_CONFIG,
  }));

  // ---------- Telão (online, com a faixa de entrada aberta) ----------
  const ctxTelao = await navegador.newContext({ viewport: { width: 1024, height: 768 }, acceptDownloads: true });
  await servirSdk(ctxTelao);
  await servirConfig(ctxTelao);
  const telao = await ctxTelao.newPage();
  vigiar(telao, 'telão');
  await telao.goto(`${site.url}telao/?emulador=1`);
  await telao.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await telao.waitForFunction(() => document.getElementById('hash-config'));
  assert.equal(await telao.textContent('#hash-config'), V.validarConfig.hash(cfg), 'o telão leu a fixture do formato simples');
  await telao.fill('#pin-apresentador', PIN_EMULADOR);
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'lobby', null, { timeout: 20000 });
  const sala = await telao.evaluate(() => globalThis.Viracao.telao.sala());
  await telao.evaluate(() => {
    globalThis.__telas = [];
    new MutationObserver(() => globalThis.__telas.push(document.body.dataset.tela)).observe(document.body, { attributes: true, attributeFilter: ['data-tela'] });
  });
  console.log(`Sala ${sala} (formato simples) criada.`);

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
  }
  // A enquete (a de entrada, no config do dia) é encerrada sem votos: Enter e,
  // se o telão pedir, a confirmação.
  async function avancarAte(teste, descricao) {
    for (let i = 0; i < 10; i += 1) {
      const e = await estado();
      if (teste(e)) return;
      if (e.tipo === 'enquete' && e.subfase === 'votando') {
        await telao.keyboard.press('Enter');
        await telao.waitForTimeout(800);
        if (await telao.evaluate(() => document.getElementById('modal').open)) {
          await telao.keyboard.press('Tab');
          await telao.keyboard.press('Enter');
        }
        await esperarEstado((x) => x.subfase === 'apurada', `enquete ${e.enquete} apurada`);
        continue;
      }
      await avancar();
    }
    await esperarEstado(teste, descricao);
  }
  // O telão com a faixa de entrada: nada rola, nada sai do palco nem da
  // própria caixa (a faixa do resultado, a linha das combinações). Em 1024×768
  // e em 1280×720 (revisão de 06/10): no projetor 16:9 de 720p, a segunda
  // fileira de equipes da decisão ficava 39 px embaixo da faixa, e só em
  // 1024×768 o e2e não via.
  async function conferirTelao(nome) {
    for (const [largura, altura] of [[1280, 720], [1024, 768]]) {
      await telao.setViewportSize({ width: largura, height: altura });
      await telao.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a, [largura, altura]);
      await medirTelao(largura === 1024 ? nome : `${nome}-${largura}x${altura}`);
    }
  }
  async function medirTelao(nome) {
    await telao.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await telao.evaluate(() => {
      const se = document.scrollingElement;
      const palco = document.getElementById('palco').getBoundingClientRect();
      const fora = [];
      for (const el of document.querySelectorAll('#palco *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.bottom > Math.min(innerHeight, palco.bottom) + 1)) fora.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`);
      }
      const vazados = [];
      for (const caixa of document.querySelectorAll('#palco .resultado-simples, #palco .combinacao-equipe, #palco .equipe-status, #palco .tabela-caminho td')) {
        const c = caixa.getBoundingClientRect();
        for (const n of caixa.querySelectorAll('*')) {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) vazados.push(`${n.tagName.toLowerCase()}.${n.getAttribute('class') || ''}`);
        }
      }
      // Texto sobre texto (D-078): as linhas das consequências chegaram a ficar
      // por cima da última equipe, dentro do palco e sem sair de caixa nenhuma.
      // O mesmo critério do telao-simples.e2e.mjs: a faixa do meio de cada folha.
      const folhas = [...document.querySelectorAll('#palco *')].filter((n) => n.children.length === 0 && n.textContent.trim() && n.getClientRects().length > 0);
      // Uma caixa por linha de cada folha (getClientRects): a mini-história
      // corre na mesma linha do rótulo (D-079).
      const meio = folhas.map((n) => [...n.getClientRects()].map((r) => ({ left: r.left, right: r.right, top: r.top + r.height * 0.25, bottom: r.bottom - r.height * 0.25 })));
      const sobrepostos = [];
      for (let i = 0; i < meio.length; i += 1) {
        for (let j = i + 1; j < meio.length; j += 1) {
          const area = Math.max(0, ...meio[i].flatMap((a) => meio[j].map((b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)))));
          if (area > 4 && !folhas[i].contains(folhas[j]) && !folhas[j].contains(folhas[i])) sobrepostos.push(`"${folhas[i].textContent.trim().slice(0, 20)}" × "${folhas[j].textContent.trim().slice(0, 20)}"`);
        }
      }
      return { rola: se.scrollHeight > innerHeight + 1 || se.scrollWidth > innerWidth + 1, fora: fora.slice(0, 5), vazados: vazados.slice(0, 5), sobrepostos: sobrepostos.slice(0, 5), faixa: !document.getElementById('faixa').hidden };
    });
    await telao.screenshot({ path: join(CAPTURAS, `online-simples-telao-${nome}.png`) });
    assert.equal(m.faixa, true, `${nome}: a faixa de entrada está embaixo`);
    assert.equal(m.rola, false, `${nome}: o telão rola`);
    assert.deepEqual(m.fora, [], `${nome}: elemento fora do palco (com a faixa de entrada)`);
    assert.deepEqual(m.vazados, [], `${nome}: elemento fora da própria caixa`);
    assert.deepEqual(m.sobrepostos, [], `${nome}: texto sobre texto`);
  }

  // Abre ou fecha a entrada pela barra (tecla H), como o apresentador, e espera
  // a tela se refazer. O mouse sai de cima da barra para ela não reabrir.
  async function alternarEntrada(querAberta) {
    await telao.keyboard.press('h');
    await telao.waitForSelector('#barra [data-acao="entrada"]', { state: 'visible' });
    await telao.click('#barra [data-acao="entrada"]');
    await telao.waitForFunction((q) => document.getElementById('faixa').hidden === !q, querAberta, { timeout: 8000 });
    await telao.mouse.move(512, 300);
    await telao.keyboard.press('h');
    await telao.waitForFunction(() => document.getElementById('barra').hidden);
    await telao.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }

  // ---------- Celulares (360×740) ----------
  const url = `${site.url}aluno/?sala=${sala}&emulador=1`;
  async function novoCelular(nome) {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA_CELULAR });
    await servirSdk(ctx);
    const p = await ctx.newPage();
    vigiar(p, nome);
    await p.goto(url);
    // Entrar na sala (o toque de "Entrar"); depois, aguarda o telão.
    await p.click('[data-acao="entrar"]');
    await p.waitForFunction(() => document.body.dataset.tela === 'aguardando', null, { timeout: 20000 });
    await p.evaluate(() => {
      globalThis.__telas = [];
      new MutationObserver(() => globalThis.__telas.push(document.body.dataset.tela)).observe(document.body, { attributes: true, attributeFilter: ['data-tela'] });
    });
    return { nome, ctx, p };
  }
  const esperarTela = (c, tipo, timeout = 20000) => c.p.waitForFunction((t) => document.body.dataset.tela === t, tipo, { timeout });
  let capturas = 0;
  async function conferirCelular(c, nome) {
    const r = await c.p.evaluate(() => ({ rolagem: document.documentElement.scrollWidth - innerWidth }));
    assert.ok(r.rolagem <= 0, `${nome}: rolagem lateral de ${r.rolagem} px`);
    await c.p.screenshot({ path: join(CAPTURAS, `celular-simples-${String(++capturas).padStart(2, '0')}-${nome}.png`) });
  }
  const cel = [await novoCelular('Ana'), await novoCelular('Bia'), await novoCelular('Caio')];
  const EQUIPES_CEL = ['e1', 'e2', 'e3'];
  // Quantas vezes o detalhe da conta mostrou o que veio de antes e as parcelas
  // do empréstimo (leitura final de 06/10), para o log.
  const vistos = { deAntes: 0, parcelas: 0, emprestimo: 0 };

  // Formação: cada celular numa equipe; as seis ficam abertas (as sem
  // celular jogam no padrão).
  await avancarAte((e) => e.tipo === 'formarEquipes', 'formar equipes');
  for (const [i, c] of cel.entries()) {
    await esperarTela(c, 'escolherEquipe');
    await c.p.click(`.botao-equipe[data-equipe="${EQUIPES_CEL[i]}"]`);
    await c.p.waitForFunction((s) => document.querySelector(s)?.getAttribute('aria-pressed') === 'true', `.botao-equipe[data-equipe="${EQUIPES_CEL[i]}"]`);
  }
  assert.match(lido(await cel[0].p.textContent(`.botao-equipe[data-equipe="e1"]`)), /Equipe Laranja/, 'no celular, a equipe pela cor');

  // 1. Conheça o Jonas
  await avancar();
  await esperarEstado((e) => e.tipo === 'personas', 'personas');
  await esperarTela(cel[0], 'persona');
  {
    const t = await cel[0].p.evaluate(() => ({ h1: document.querySelector('#tela h1')?.textContent, subtitulos: Array.from(document.querySelectorAll('#tela h2'), (n) => n.textContent), indicadores: document.querySelectorAll('#tela .indicadores').length }));
    assert.equal(t.h1, `Conheça o ${cfg.personas[PERSONA].nome}`);
    assert.ok(!t.subtitulos.includes('Ponto de partida'), 'sem o ponto de partida dos indicadores');
    assert.equal(t.indicadores, 0);
  }
  await conferirCelular(cel[0], 'conheca');

  for (const [k, r] of RODADAS.entries()) {
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r, `${r} aberta`);
    await esperarEstado((e) => e.subfase === 'decidindo', `${r} decidindo`);
    for (const c of cel) await esperarTela(c, 'decisao');
    const c0 = cel[0];
    // 2. As 5 opções, com o custo humano e sem o dinheiro (D-079: às cegas).
    const opcoes = await c0.p.evaluate(() => Array.from(document.querySelectorAll('.botao-opcao-aluno'), (b) => ({
      opcao: b.dataset.opcao, letra: b.querySelector('.opcao-letra')?.textContent, rotulo: b.querySelector('.opcao-rotulo')?.textContent,
      dinheiro: b.querySelectorAll('.opcao-dinheiro').length, texto: b.textContent, impacto: b.querySelector('.opcao-impacto')?.textContent ?? null,
    })));
    assert.equal(opcoes.length, cfg.rodadas[r].ordemOpcoes.length, `${r}: as opções no celular`);
    for (const [i, o] of opcoes.entries()) {
      const op = cfg.rodadas[r].ordemOpcoes[i];
      assert.equal(o.opcao, op);
      assert.equal(o.letra, 'ABCDE'[i]);
      assert.equal(o.dinheiro, 0, `${r}/${op}: sem a linha do dinheiro no celular`);
      assert.ok(!lido(o.texto).includes(lido(H.textoDoDinheiro(H.dinheiroDaOpcao(cfg, r, op, PERSONA), F.moeda, H.periodo(cfg)))), `${r}/${op}: o dinheiro da opção não aparece`);
      assert.equal(o.impacto, H.textoDaOpcao(cfg, r, op, PERSONA).impacto, `${r}/${op}: o custo humano no celular`);
    }
    assert.ok(!(await c0.p.locator('#tela .indicadores').count()), `${r}: a decisão sem os indicadores`);
    assert.match(lido(await c0.p.textContent('.pressao')), /^A família (tem|está devendo) R\$ [\d.]+\.$/, `${r}: uma linha só, o dinheiro da família`);
    if (k === 0) {
      // A dobra: com 5 opções, a última fica abaixo da tela, e o aviso aparece.
      await c0.p.evaluate(() => globalThis.scrollTo(0, 0));
      await c0.p.waitForFunction(() => !document.querySelector('[data-aviso-rolagem]').hidden);
      await conferirCelular(c0, 'decisao-topo');
      // Abrir a última opção pelo aviso e pelo toque: o "Votar nesta" à vista,
      // e não atrás do aviso.
      await c0.p.click('[data-aviso-rolagem]');
      await c0.p.waitForFunction(() => document.querySelector('.botao-opcao-aluno:last-of-type, .opcao-aluno:last-child .botao-opcao-aluno').getBoundingClientRect().bottom <= innerHeight + 1);
      await c0.p.waitForFunction(() => document.querySelector('[data-aviso-rolagem]').hidden, null, { timeout: 5000 });
      const ultima = cfg.rodadas[r].ordemOpcoes.at(-1);
      await c0.p.click(`.botao-opcao-aluno[data-opcao="${ultima}"]`);
      await c0.p.waitForSelector(`[data-detalhe="${ultima}"] [data-votar]`);
      await c0.p.waitForTimeout(600);
      const votar = await c0.p.evaluate((op) => {
        const b = document.querySelector(`[data-detalhe="${op}"] [data-votar]`).getBoundingClientRect();
        const aviso = document.querySelector('[data-aviso-rolagem]');
        const coberto = !aviso.hidden && aviso.getBoundingClientRect().top < b.bottom;
        return { topo: b.top, baixo: b.bottom, coberto };
      }, ultima);
      assert.ok(votar.topo >= 0 && votar.baixo <= 740 + 1 && !votar.coberto, `o "Votar nesta" da última opção fica à vista (${JSON.stringify(votar)})`);
      await conferirCelular(c0, 'decisao-ultima-aberta');
    }
    // Cada celular vota: a Ana e a Bia, a primeira e a segunda opção (somando uma
    // a cada rodada); o Caio começa pela quinta, para que, com o config do dia,
    // mar–abr tenha as três consequências de uma vez (as costas da Ana, a parcela
    // da Bia e o IPVA já pago do Caio), o pior caso de altura no telão.
    for (const [i, c] of cel.entries()) {
      const op = cfg.rodadas[r].ordemOpcoes[((i === 2 ? 4 : i) + k) % 5];
      const aberta = await c.p.evaluate((o) => Boolean(document.querySelector(`[data-detalhe="${o}"]`)), op);
      if (!aberta) await c.p.click(`.botao-opcao-aluno[data-opcao="${op}"]`);
      await c.p.click(`[data-detalhe="${op}"] [data-votar]`);
      await c.p.waitForFunction((o) => document.querySelector(`.botao-opcao-aluno[data-opcao="${o}"]`)?.dataset.meuVoto === '1', op, { timeout: 15000 });
    }
    await telao.waitForFunction(() => /1 de 1/.test(document.querySelector('.equipe-status[data-equipe="e3"]')?.textContent || ''), null, { timeout: 15000 });
    if (k === 0) await conferirTelao('decisao');
    // 3. Encerrar: o celular vai ao resultado sem o "Sorteando…".
    await telao.keyboard.press('Enter');
    await telao.waitForFunction(() => document.getElementById('modal').open);
    await telao.keyboard.press('Tab');
    await telao.keyboard.press('Enter');
    await esperarEstado((e) => e.subfase === 'resultado' && e.rodada === r, `resultado de ${r}`, 20000);
    for (const c of cel) await esperarTela(c, 'resultado');
    for (const c of cel) assert.ok(!(await c.p.evaluate(() => globalThis.__telas)).includes('sorteando'), `${c.nome}: a tela "Sorteando…" nunca apareceu`);
    assert.ok(!(await telao.evaluate(() => globalThis.__telas)).includes('rodada-sorteio'), 'o telão nunca desenhou o sorteio');
    // 4. O resultado no celular: o saldo e o dinheiro da família, e mais nada.
    const gravado = await administrador('GET', `salas/${sala}/resultados/${r}/e1`);
    const t = await c0.p.evaluate(() => ({
      saldo: document.querySelector('.saldo-destaque')?.dataset.saldoMes,
      familia: document.querySelector('.familia-dinheiro')?.textContent,
      situacao: document.querySelector('.familia-dinheiro')?.dataset.situacao,
      indicadores: document.querySelectorAll('#tela .indicadores').length,
      divida: document.querySelectorAll('#tela .divida').length,
      mesa: document.querySelectorAll('#tela .faltou-mesa').length,
    }));
    assert.equal(Number(t.saldo), gravado.mes.saldoMes, `${r}: o saldo do bimestre gravado`);
    const d = H.dinheiroDaFamilia(gravado.depois);
    assert.equal(t.situacao, d.situacao);
    assert.equal(lido(t.familia), lido(`A família ${d.situacao === 'devendo' ? 'está devendo' : 'tem'} ${F.moeda(d.valor)}.`), `${r}: o dinheiro da família`);
    assert.deepEqual([t.indicadores, t.divida, t.mesa], [0, 0, 0], `${r}: sem indicadores, sem o detalhe da dívida, sem a mesa`);
    // D-078: a consequência de uma escolha de antes, à vista no celular e, no
    // telão, na faixa da equipe (D-080; com a faixa de entrada, o pior caso de altura).
    {
      const grupos = H.consequenciasDaRodada([{ equipeId: 'e1', deAntes: gravado.deAntes || [] }]);
      const linha = await c0.p.evaluate(() => document.querySelector('.consequencia-linha')?.textContent ?? null);
      if (grupos.length === 0) assert.equal(linha, null, `${r}: sem consequência, sem a linha`);
      else {
        assert.equal(lido(linha), lido(`Por causa de escolhas anteriores: ${grupos.map((g) => `${g.motivo} ${F.moeda(g.valor, { sinal: true })}`).join(' · ')}`), `${r}: a consequência no celular`);
        await conferirCelular(c0, `resultado-consequencia-${r}`);
      }
      // D-080: no telão, a observação na faixa da equipe atingida (e não mais a lista embaixo).
      const obsTelao = await telao.evaluate(() => document.querySelector('.resultado-simples[data-equipe="e1"] .simples-obs')?.textContent ?? null);
      assert.equal(obsTelao === null ? null : lido(obsTelao), grupos.length > 0 ? lido(grupos.map((g) => `${g.motivo.charAt(0).toUpperCase()}${g.motivo.slice(1)} ${F.moeda(g.valor, { sinal: true })}`).join(' · ')) : null, `${r}: a observação no telão`);
      assert.equal(await telao.locator('.simples-antes').count(), 0, `${r}: sem a lista embaixo das faixas`);
      if (await telao.locator('.simples-obs').count() > 0) await conferirTelao(`resultado-consequencia-${r}`);
    }
    // Leitura final de 06/10: no detalhe recolhido da conta ("A conta do
    // bimestre em detalhe"), o que veio de antes com o mesmo nome da linha à
    // vista e sem dois-pontos em sequência (o ": " do rótulo vira ", " na
    // tela), e o empréstimo pelo nome do período: "não entra no saldo do
    // bimestre" e "Parcelas do empréstimo no bimestre R$ 366" (duas parcelas).
    for (const [i, c] of cel.entries()) {
      const g = await administrador('GET', `salas/${sala}/resultados/${r}/${EQUIPES_CEL[i]}`);
      const lidos = await c.p.evaluate(() => ({
        deAntes: document.querySelector('.conta-de-antes')?.textContent ?? null,
        emprestimo: document.querySelector('.conta-emprestimo')?.textContent ?? null,
      }));
      const itens = (Array.isArray(g.deAntes) ? g.deAntes : Object.values(g.deAntes || {})).filter((x) => x && typeof x.rotulo === 'string' && Number.isFinite(x.valor));
      if (itens.length === 0) assert.equal(lidos.deAntes, null, `${r}, ${c.nome}: sem nada de antes, sem a linha no detalhe`);
      else {
        assert.equal(lido(lidos.deAntes), lido(`Por causa de escolhas anteriores (já na conta): ${itens.map((x) => `${x.rotulo.replaceAll(': ', ', ')} ${F.moeda(x.valor, { sinal: true })}`).join(' · ')}`), `${r}, ${c.nome}: o que veio de antes, no detalhe`);
        assert.ok(!/: [^:]*: /.test(lidos.deAntes), `${r}, ${c.nome}: sem dois-pontos em sequência ("${lido(lidos.deAntes)}")`);
        vistos.deAntes += 1;
      }
      const m = g.mes || {};
      if (m.emprestimo > 0) {
        assert.ok(lido(lidos.emprestimo).includes(lido(`Empréstimo de ${F.moeda(m.emprestimo)}: o dinheiro entrou no caixa, mas é dívida, e não entra no saldo do bimestre.`)), `${r}, ${c.nome}: a linha do empréstimo ("${lido(lidos.emprestimo)}")`);
        vistos.emprestimo += 1;
      }
      if (m.parcela > 0) {
        assert.ok(lido(lidos.emprestimo).includes(lido(`Parcelas do empréstimo no bimestre ${F.moeda(m.parcela)}: ${F.moeda(m.jurosEmprestimo)} de juros (já na conta) e ${F.moeda(m.amortizacao)} que abatem a dívida.`)), `${r}, ${c.nome}: a linha das parcelas ("${lido(lidos.emprestimo)}")`);
        vistos.parcelas += 1;
      }
    }
    // A entrada fechada e reaberta com o resultado na tela (o roteiro manda
    // reabrir quando chega um atrasado), em mar–abr, com as três consequências:
    // a tela se refaz nas duas vezes. Antes (revisão de 06/10), reabrir punha a
    // faixa por cima das linhas das consequências, e fechar com o aperto 4 não
    // devolvia o evento do mês.
    if (k === 1) {
      await alternarEntrada(false);
      const fechada = await telao.evaluate(() => ({
        evento: globalThis.getComputedStyle(document.querySelector('.evento-do-mes')).display !== 'none',
        rola: document.scrollingElement.scrollHeight > innerHeight + 1,
      }));
      assert.deepEqual(fechada, { evento: true, rola: false }, `${r}: com a entrada fechada, o evento do mês volta ao resultado`);
      await telao.screenshot({ path: join(CAPTURAS, `online-simples-telao-resultado-entrada-fechada-${r}.png`) });
      await alternarEntrada(true);
      await conferirTelao(`resultado-entrada-reaberta-${r}`);
    }
    if (k === 0) {
      await conferirCelular(c0, 'resultado');
      await conferirTelao('resultado');
    }
    // O bloco seguinte: a situação, com o mesmo dinheiro da família.
    if (k < RODADAS.length - 1) {
      await avancar();
      await esperarEstado((e) => e.tipo === 'bloco', 'bloco');
      await esperarTela(c0, 'situacao');
      const s = await c0.p.evaluate(() => ({
        familia: document.querySelector('.familia-dinheiro')?.textContent, indicadores: document.querySelectorAll('#tela .indicadores').length, divida: document.querySelectorAll('#tela .divida').length,
      }));
      assert.equal(lido(s.familia), lido(`A família ${d.situacao === 'devendo' ? 'está devendo' : 'tem'} ${F.moeda(d.valor)}.`), `${r}: a situação diz o mesmo dinheiro`);
      assert.deepEqual([s.indicadores, s.divida], [0, 0], `${r}: a situação sem indicadores nem o detalhe da dívida`);
      if (k === 0) await conferirCelular(c0, 'situacao');
    }
  }

  // 5. O placar final.
  await avancarAte((e) => e.tipo === 'placarFinal', 'placar final');
  await esperarTela(cel[0], 'situacao');
  await cel[0].p.waitForSelector('.escolhas-ano');
  {
    const t = await cel[0].p.evaluate(() => ({
      escolhas: Array.from(document.querySelectorAll('.escolha'), (n) => n.dataset.letra),
      pior: document.querySelectorAll('.pior-caso').length, sorte: document.querySelectorAll('.placar-historia').length,
      indicadores: document.querySelectorAll('#tela .indicadores').length,
      mesa: document.querySelectorAll('#tela .faltou-mesa').length,
    }));
    assert.deepEqual(t.escolhas, RODADAS.map((_, k) => 'ABCDE'[k % 5]), 'o celular mostra as escolhas da equipe');
    // Sem a linha do que faltou na mesa, como no telão: com o config do dia, ela
    // dizia "R$ 0" embaixo de "Cortar comida e remédio" (revisão de 06/10).
    assert.deepEqual([t.pior, t.sorte, t.indicadores, t.mesa], [0, 0, 0, 0], 'sem o pior caso, sem "Escolha ou sorte?", sem indicadores, sem o "faltou na mesa"');
  }
  await conferirCelular(cel[0], 'placar');
  for (const pagina of ['caminho', 'saldo', 'combinacoes']) {
    await telao.waitForFunction((p) => document.querySelector('.tela')?.dataset.pagina === p, pagina);
    await conferirTelao(`placar-${pagina}`);
    if (pagina !== 'combinacoes') {
      await telao.waitForTimeout(1700);
      await telao.keyboard.press('Space');
    }
  }
  console.log(`  o detalhe da conta no celular: o que veio de antes em ${vistos.deAntes} tela(s), o empréstimo em ${vistos.emprestimo}, as parcelas em ${vistos.parcelas}`);
  console.log('OK: o formato simples com celulares (telão em 1024×768 e 1280×720 com a faixa de entrada; celulares em 360×740).');
}
