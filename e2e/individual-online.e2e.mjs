// O modo individual (regras.individual; decisão do Kleber de 13/10 à noite) com
// celulares, contra o emulador do Firebase: `node e2e/individual-online.e2e.mjs`
// (o config.json do dia; outro config individual por `--config caminho`). Fica
// fora do `npm run check`, como os outros e2e online (navegador instalado e
// JDK 21).
//
// Sobe o bin/servir.mjs e o emulador (projeto demo-seminario), abre o telão de
// verdade e joga com 21 celulares simulados no Node, cada um com o próprio app
// (conexão e login anônimo) sobre o canal-firebase, como o simulador: eles
// gravam só o que o celular grava (o registro com a entrouEm, a presença e o
// voto), e as regras reais recusam o resto. O nome de cada aluno fica no
// celular e nunca vai ao banco: aqui, nem existe.
//
// O que prova:
// 1. vários entram juntos e cada um ganha uma vaga própria, dada pelo telão
//    (nunca duas pessoas na mesma vaga); o lobby diz "N pessoas na sala";
// 2. o Espaço dado enquanto o telão grava as vagas de quem acabou de entrar
//    não é jogado fora (anfitriao.soMudaramAsVagas);
// 3. o 21º não ganha vaga, e a conta do celular diz "A sala está cheia (20
//    pessoas)"; quem já tem vaga não troca nem larga a vaga;
// 4. o celular que "recarrega" (a conexão cai e volta) continua na mesma vaga
//    e vota normalmente;
// 5. a decisão diz "N de M já escolheram", sem nenhuma vaga nem nome;
// 6. o resultado diz quantas pessoas ficaram com cada opção, quem não votou e
//    o que veio de antes, iguais ao que o motor calcula para cada aluno;
// 7. o placar: "Quanto sobrou, ou ficou devendo" (quantos terminaram com
//    dinheiro sobrando e quantos devendo, uma coluna por pessoa), "As escolhas
//    da turma" e as combinações;
// 8. toda tela conferida cabe em 1024×768 e 1280×720 com a faixa de entrada
//    embaixo e em 1920×1080: sem rolagem, nada abaixo de 28 px, nada fora do
//    palco, nada sobreposto, e nada por vaga.
// 9. a internet cai no lobby, com alunos já na sala: "Continuar sem celulares"
//    passa a jogar "a turma", um caminho só (revisão de 14/10, achado 3).
/* global document, getComputedStyle, innerHeight, innerWidth, NodeFilter, requestAnimationFrame, SVGElement */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { administrador, novoCanalNoEmulador, PIN_EMULADOR, RAIZ, rodarNoEmulador } from '../bin/emulador.mjs';
import { servir } from '../bin/servir.mjs';
import { carregarNucleo } from '../test/carregar-nucleo.mjs';

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const COPIA = process.env.VIRACAO_CAPTURAS || null;
const SDK_CDN = 'https://www.gstatic.com/firebasejs/12.19.0/';
const TAMANHOS = [[1024, 768], [1280, 720], [1920, 1080]];
const MIN_FONTE = 28;
const LETRAS = 'ABCDEFGHIJ';
const NEGADO = /PERMISSION_DENIED/;
const ARG_CONFIG = (() => {
  const i = process.argv.indexOf('--config');
  return i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length);
})();
const TEXTO_CONFIG = readFileSync(resolve(RAIZ, ARG_CONFIG || 'config.json'), 'utf8');

if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  process.exitCode = await rodarNoEmulador(`node e2e/individual-online.e2e.mjs${ARG_CONFIG ? ` --config ${ARG_CONFIG}` : ''}`);
} else {
  await sessao();
  // Os apps do SDK no Node seguram o processo (as conexões dos celulares).
  process.exit(process.exitCode ?? 0);
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
  if (COPIA) mkdirSync(COPIA, { recursive: true });
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
  const celulares = [];
  try {
    await jogar({ site, navegador, vigiar, celulares });
    await semCelularesNoLobby({ site, navegador, vigiar, celulares });
  } finally {
    await Promise.allSettled(celulares.map((c) => c.fechar()));
    await navegador.close();
    await site.fechar();
  }
  assert.deepEqual(erros, [], 'nenhum erro inesperado no console do telão');
}

async function jogar({ site, navegador, vigiar, celulares }) {
  const V = await carregarNucleo();
  await import(new URL('../js/ui/formatar.js', import.meta.url).href);
  const F = globalThis.Viracao.formatar;
  const H = V.historia;
  const M = V.motor;
  const A = V.alunoLogica;
  const cfg = V.validarConfig.validarTexto(TEXTO_CONFIG).config;
  assert.equal(cfg.regras.individual, true, 'este e2e é do modo individual');
  const VAGAS = cfg.ordem.equipes;
  const PERSONA = cfg.equipes[VAGAS[0]].persona;
  const opcoesDe = (r) => cfg.rodadas[r].ordemOpcoes;
  const letraDe = (r, op) => LETRAS[opcoesDe(r).indexOf(op)];
  const lido = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------- Telão (online) ----------
  const ctxTelao = await navegador.newContext({ viewport: { width: 1024, height: 768 }, acceptDownloads: true });
  await servirSdk(ctxTelao);
  await ctxTelao.route(`${site.url}config.json`, (rota) => rota.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: TEXTO_CONFIG }));
  const telao = await ctxTelao.newPage();
  vigiar(telao, 'telão');
  await telao.goto(`${site.url}telao/?emulador=1`);
  await telao.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await telao.waitForFunction(() => document.getElementById('hash-config'));
  assert.equal(await telao.textContent('#hash-config'), V.validarConfig.hash(cfg), 'o telão leu o config individual');
  await telao.fill('#pin-apresentador', PIN_EMULADOR);
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'lobby', null, { timeout: 20000 });
  const sala = await telao.evaluate(() => globalThis.Viracao.telao.sala());
  const roteiro = (await administrador('GET', `salas/${sala}/meta`)).roteiro;
  const PASSOS = V.roteiro.passos(cfg, roteiro);
  const RODADAS = PASSOS.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  console.log(`Sala ${sala} (modo individual, roteiro ${roteiro}) criada.`);

  const estado = () => telao.evaluate(() => globalThis.Viracao.telao.estado());
  async function esperarEstado(teste, descricao, timeout = 20000) {
    const inicio = Date.now();
    for (;;) {
      const e = await estado();
      if (e && teste(e)) return e;
      if (Date.now() - inicio > timeout) throw new Error(`Tempo esgotado esperando: ${descricao}. Estado: ${JSON.stringify(e)}`);
      await telao.waitForTimeout(80);
    }
  }
  async function esperar(teste, descricao, timeout = 20000) {
    const inicio = Date.now();
    for (;;) {
      const v = await teste();
      if (v) return v;
      if (Date.now() - inicio > timeout) throw new Error(`Tempo esgotado esperando: ${descricao}`);
      await new Promise((r) => setTimeout(r, 100));
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
  async function confirmarSeAbrir() {
    await telao.waitForTimeout(400);
    if (await telao.evaluate(() => document.getElementById('modal').open)) {
      await telao.keyboard.press('Tab');
      await telao.keyboard.press('Enter');
      await telao.waitForFunction(() => !document.getElementById('modal').open);
    }
  }
  async function avancarAte(teste, descricao) {
    for (let i = 0; i < 30; i += 1) {
      const e = await estado();
      if (teste(e)) return e;
      if (e.tipo === 'enquete' && e.subfase === 'votando') {
        await telao.keyboard.press('Enter');
        await confirmarSeAbrir();
        await esperarEstado((x) => x.subfase === 'apurada', `enquete ${e.enquete} apurada`);
        continue;
      }
      // O comparativo tem uma página por afirmação (a página é da tela, e não
      // do estado). O placar final é paginado à mão, no jogo.
      const paginas = e.tipo === 'comparativo' ? (cfg.enquetes[e.enquete]?.ordemAfirmacoes?.length ?? 1) : 1;
      for (let p = 0; p < paginas - 1; p += 1) {
        await telao.waitForTimeout(1700);
        await telao.keyboard.press('Space');
        ultimoAvanco = Date.now();
      }
      await avancar();
    }
    return esperarEstado(teste, descricao);
  }

  // O telão: o mesmo critério do telao-individual.e2e.mjs, com a faixa de
  // entrada embaixo (o pior caso de altura) em 1024×768 e 1280×720.
  async function medir() {
    return telao.evaluate((minimo) => {
      const se = document.scrollingElement;
      const palco = document.getElementById('palco');
      const caixaPalco = palco.getBoundingClientRect();
      const pequenos = [];
      for (const raiz of [palco, document.getElementById('faixa')]) {
        if (!raiz || raiz.hidden) continue;
        const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const t = w.currentNode;
          if (!t.textContent.trim()) continue;
          const el = t.parentElement;
          if (!el || el.getClientRects().length === 0) continue;
          let px = parseFloat(getComputedStyle(el).fontSize);
          if (el instanceof SVGElement) {
            const m = el.getScreenCTM();
            if (m) px *= Math.hypot(m.a, m.b);
          }
          if (px < minimo - 0.01) pequenos.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} ${px.toFixed(1)}px`);
        }
      }
      const fora = [];
      for (const el of palco.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.bottom > Math.min(innerHeight, caixaPalco.bottom) + 1)) fora.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`);
      }
      const vazados = [];
      for (const caixa of palco.querySelectorAll('.turma-opcao, .tabela-turma td, .tabela-turma th')) {
        const c = caixa.getBoundingClientRect();
        for (const n of caixa.querySelectorAll('*')) {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) vazados.push(`${n.tagName.toLowerCase()}.${n.getAttribute('class') || ''}`);
        }
      }
      const folhas = [...palco.querySelectorAll('*')].filter((n) => n.children.length === 0 && n.textContent.trim() && n.getClientRects().length > 0);
      const meio = folhas.map((n) => [...n.getClientRects()].map((r) => ({ left: r.left, right: r.right, top: r.top + r.height * 0.25, bottom: r.bottom - r.height * 0.25 })));
      const sobrepostos = [];
      for (let i = 0; i < meio.length; i += 1) {
        for (let j = i + 1; j < meio.length; j += 1) {
          const area = Math.max(0, ...meio[i].flatMap((a) => meio[j].map((b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)))));
          if (area > 4 && !folhas[i].contains(folhas[j]) && !folhas[j].contains(folhas[i])) sobrepostos.push(`"${folhas[i].textContent.trim().slice(0, 20)}" × "${folhas[j].textContent.trim().slice(0, 20)}"`);
        }
      }
      const semBlocos = folhas.filter((n) => !n.closest('.bloco-contexto, .bloco-itens, .bloco-fonte')).map((n) => n.textContent).join(' ');
      return {
        rola: se.scrollHeight > innerHeight + 1 || se.scrollWidth > innerWidth + 1,
        pequenos, fora: fora.slice(0, 5), vazados: vazados.slice(0, 5), sobrepostos: sobrepostos.slice(0, 5),
        faixa: !document.getElementById('faixa').hidden,
        porPessoa: { rotulos: palco.querySelectorAll('.equipe[data-equipe], .equipe-nome').length, vaga: /\bVaga \d/.test(palco.textContent), equipe: /\bequipes?\b/i.test(semBlocos) },
      };
    }, MIN_FONTE);
  }
  const capturas = [];
  async function conferirTelao(nome, aoMedir = null, { faixa = true } = {}) {
    for (const [largura, altura] of TAMANHOS) {
      await telao.setViewportSize({ width: largura, height: altura });
      await telao.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a, [largura, altura]);
      await telao.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      if (!(await telao.evaluate(() => document.getElementById('barra').hidden))) await telao.keyboard.press('h');
      await telao.waitForFunction(() => document.getElementById('barra').hidden);
      const m = await medir();
      const arquivo = `individual-online-${nome}-${largura}x${altura}.png`;
      await telao.screenshot({ path: join(CAPTURAS, arquivo) });
      if (COPIA) copyFileSync(join(CAPTURAS, arquivo), join(COPIA, arquivo));
      capturas.push(arquivo);
      const onde = `${nome} em ${largura}×${altura}`;
      if (faixa) assert.equal(m.faixa, true, `${onde}: a faixa de entrada está embaixo`);
      assert.equal(m.rola, false, `${onde}: o telão rola`);
      assert.deepEqual(m.pequenos, [], `${onde}: texto abaixo de ${MIN_FONTE} px`);
      assert.deepEqual(m.fora, [], `${onde}: elemento fora do palco`);
      assert.deepEqual(m.vazados, [], `${onde}: elemento fora da própria caixa`);
      assert.deepEqual(m.sobrepostos, [], `${onde}: texto sobre texto`);
      assert.deepEqual(m.porPessoa, { rotulos: 0, vaga: false, equipe: false }, `${onde}: nada por vaga nem por equipe`);
      if (aoMedir) await aoMedir(onde);
    }
    await telao.setViewportSize({ width: 1024, height: 768 });
    await telao.waitForFunction(() => innerWidth === 1024);
  }

  // ---------- Celulares simulados ----------
  // O que o celular grava, e só isso: o registro (entrouEm), a presença (a cada
  // 15 s, como os 20 s do aluno.js) e o voto.
  async function novoCelular(i) {
    const canal = await novoCanalNoEmulador(`cel${i}`);
    celulares.push(canal);
    const uid = await canal.entrar();
    const c = {
      i, uid, canal,
      entrar: () => canal.gravar({ [s('membros', uid)]: { entrouEm: canal.marcadorDeHora() } }),
      presenca: () => canal.gravar({ [s('presenca', uid)]: canal.marcadorDeHora() }).catch(() => {}),
      vaga: async () => (await canal.ler(s('membros', uid)))?.equipe ?? null,
      votar: async (r, op) => canal.gravar({ [s('decisoes', r, await c.vaga(), uid)]: op }),
      // [Li] "Li, pode seguir": o índice do passo lido (regras v5).
      ler: (indice) => canal.gravar({ [s('lidos', uid)]: indice }),
      // A conta que o celular faz para desenhar a tela (alunoLogica), com o
      // que ele pode ler.
      async tela() {
        const [conteudo, est, membros, resultados, placar, meta] = await Promise.all(['conteudo', 'estado', 'membros', 'resultados', 'placar', 'meta'].map((p) => canal.ler(s(p))));
        return A.telaDoAluno({ conteudo, estado: est, membro: membros?.[uid] ?? null, membros, resultados, placar, meta, uid, meusVotos: {}, agora: Date.now() });
      },
    };
    return c;
  }
  const todos = await Promise.all(Array.from({ length: VAGAS.length + 1 }, (_, i) => novoCelular(i)));
  const presencas = setInterval(() => { for (const c of todos.filter((x) => x.entrou)) c.presenca(); }, 15000);
  try {
    // 1. Primeira leva: 15 entram juntos.
    const primeira = todos.slice(0, 15);
    await Promise.all(primeira.map(async (c) => { await c.entrar(); c.entrou = true; await c.presenca(); }));
    await telao.waitForFunction(() => document.querySelector('.lobby-conectados')?.dataset.pessoas === '15', null, { timeout: 20000 });
    await conferirTelao('lobby', async (onde) => {
      assert.equal(lido(await telao.textContent('.lobby-conectados')), '15 pessoas na sala', `${onde}: N pessoas na sala`);
    }, { faixa: false });

    // 2. Segunda leva: mais 5, e o Espaço do apresentador no meio das vagas
    // sendo gravadas. O comando não pode cair com "o estado mudou".
    const segunda = todos.slice(15, VAGAS.length);
    const geracaoAntes = (await estado()).geracao;
    const entrando = Promise.all(segunda.map(async (c) => { await c.entrar(); c.entrou = true; await c.presenca(); }));
    await telao.waitForTimeout(150);
    await telao.keyboard.press('Space');
    ultimoAvanco = Date.now();
    await entrando;
    const depois = await esperarEstado((e) => e.indice > 0, 'o Espaço dado no meio das vagas avançou o lobby');
    const aviso = await telao.evaluate(() => document.getElementById('aviso').textContent);
    assert.ok(!/O estado mudou/.test(aviso), `o Espaço não foi descartado ("${aviso}")`);
    const membros20 = await esperar(async () => {
      const m = await administrador('GET', `salas/${sala}/membros`);
      return todos.slice(0, VAGAS.length).every((c) => VAGAS.includes(m?.[c.uid]?.equipe)) ? m : null;
    }, 'as 20 vagas gravadas');
    const vagas = todos.slice(0, VAGAS.length).map((c) => membros20[c.uid].equipe);
    assert.equal(new Set(vagas).size, VAGAS.length, 'nunca duas pessoas na mesma vaga');
    const est20 = await administrador('GET', `salas/${sala}/estado`);
    assert.deepEqual(new Set(Object.keys(est20.equipesAbertas)), new Set(vagas), 'as vagas abertas são as ocupadas');
    console.log(`  20 vagas diferentes; o Espaço no meio das vagas avançou (geracao ${geracaoAntes} → ${depois.geracao} no estado do Espaço)`);

    // 3. O 21º: sem vaga, e a sala cheia na conta do celular.
    const vigesimoPrimeiro = todos[VAGAS.length];
    await vigesimoPrimeiro.entrar();
    vigesimoPrimeiro.entrou = true;
    await vigesimoPrimeiro.presenca();
    await telao.waitForTimeout(1500);
    assert.equal(await vigesimoPrimeiro.vaga(), null, 'o 21º não ganha vaga');
    assert.deepEqual(await vigesimoPrimeiro.tela(), { tipo: 'aguardando', dados: { motivo: 'salaCheia', capacidade: VAGAS.length } }, 'o 21º vê "A sala está cheia"');
    {
      const c = todos[0];
      const minha = await c.vaga();
      const outra = VAGAS.find((v) => v !== minha);
      await assert.rejects(c.canal.gravar({ [s('membros', c.uid, 'equipe')]: outra }), NEGADO, 'quem tem vaga não troca');
      await assert.rejects(c.canal.gravar({ [s('membros', c.uid)]: null }), NEGADO, 'quem tem vaga não larga a vaga');
    }
    // Revisão de 14/10 (achado 4): na enquete, o "N de M votaram" conta só
    // quem tem vaga. O 21º manda presença e nunca vê a enquete; com ele no M,
    // a conta ficava em "20 de 21" e nunca chegava a "todos votaram".
    if ((await estado()).tipo === 'enquete') {
      await esperar(async () => lido(await telao.textContent('.enquete-status').catch(() => '')) === `0 de ${VAGAS.length} votaram`, `"0 de ${VAGAS.length} votaram" na enquete, sem o 21º`, 10000);
      console.log(`  na enquete, "0 de ${VAGAS.length} votaram", sem o 21º (que manda presença e não tem vaga)`);
    }

    // O plano de cada aluno: os cinco primeiros na melhor combinação do config
    // do dia (A D C E D A); os outros mudam de opção a cada bimestre; os de
    // índice 6 e 13 nunca votam (ficam na opção de sempre).
    const MELHOR = [0, 3, 2, 4, 3, 0];
    const alunos = todos.slice(0, VAGAS.length);
    const planoDe = (c, k) => {
      const r = RODADAS[k];
      if (c.i % 7 === 6) return null;
      return opcoesDe(r)[(c.i < 5 ? MELHOR[k % MELHOR.length] : c.i + k) % opcoesDe(r).length];
    };
    const caminhos = new Map(alunos.map((c) => {
      let est = M.estadoInicial(cfg, VAGAS[0]);
      const historico = {};
      const linhas = RODADAS.map((r, k) => {
        const opcaoId = planoDe(c, k) ?? cfg.rodadas[r].padrao;
        const baralho = M.chances(cfg, { equipeId: VAGAS[0], rodadaId: r, opcaoId, estado: est, historico });
        const a = M.aplicar(cfg, { equipeId: VAGAS[0], rodadaId: r, opcaoId, cartaId: baralho[0].carta, estado: est, historico });
        historico[r] = { decisao: opcaoId, carta: baralho[0].carta };
        est = a.depois;
        return { opcao: opcaoId, carta: baralho[0].carta, deAntes: a.deAntes };
      });
      return [c.uid, { linhas, final: Math.round(M.patrimonio(est)) + 0 }];
    }));

    // Personas ("Conheça o Jonas"), com a faixa de entrada.
    await avancarAte((e) => e.tipo === 'personas', 'personas');
    await telao.waitForFunction(() => document.body.dataset.tela === 'personas');
    await conferirTelao('conheca', async (onde) => {
      // [Li] Com o "N de M leram" no kicker (ninguém leu ainda).
      assert.equal(await telao.textContent('#palco .kicker'), `Todos jogam com o mesmo personagem · 0 de ${VAGAS.length} leram`, `${onde}: o kicker`);
    });
    // [Li] "Li, pode seguir": o celular grava lidos/{uid} = o índice do passo
    // (regras v5), e o telão conta "N de M leram", sem ninguém de fora da conta
    // (o 21º, sem vaga, pode gravar, e não conta) e sem o "li" de outro passo.
    async function conferirLidos(nome) {
      const indice = (await estado()).indice;
      const lidos = () => telao.evaluate(() => ({ leram: document.querySelector('.tela')?.dataset.leram, total: document.querySelector('.tela')?.dataset.totalLidos }));
      await telao.waitForFunction((n) => document.querySelector('.tela')?.dataset.totalLidos === n, String(VAGAS.length));
      assert.deepEqual(await lidos(), { leram: '0', total: String(VAGAS.length) }, `${nome}: ninguém leu este passo ainda (o "li" do passo anterior não vale)`);
      const leram = alunos.slice(0, 12);
      await Promise.all(leram.map((c) => c.ler(indice)));
      await vigesimoPrimeiro.ler(indice);
      await assert.rejects(alunos[12].ler(indice + 1), NEGADO, `${nome}: o "li" de outro passo é recusado`);
      await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.leram === '12');
      assert.ok((await telao.textContent('#palco .kicker')).endsWith(` · 12 de ${VAGAS.length} leram`), `${nome}: "12 de 20 leram" no kicker`);
      await conferirTelao(`${nome}-lidos`);
      await Promise.all(alunos.slice(12).map((c) => c.ler(indice)));
      await telao.waitForFunction((n) => document.querySelector('.tela')?.dataset.leram === n, String(VAGAS.length));
      assert.deepEqual(await lidos(), { leram: String(VAGAS.length), total: String(VAGAS.length) }, `${nome}: todos leram`);
    }
    await conferirLidos('conheca');

    let comAntes = 0;
    for (const [k, r] of RODADAS.entries()) {
      await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r, `${r}`);
      await esperarEstado((e) => e.subfase === 'decidindo', `${r} aberta`);
      await telao.waitForFunction(() => document.body.dataset.tela === 'rodada-decidindo');
      const votantes = alunos.filter((c) => planoDe(c, k) !== null);
      // 4. A "recarga" (a conexão cai e volta) de três celulares no 2º
      // bimestre: a vaga é a mesma, e o voto vale.
      if (k === 1) {
        for (const c of alunos.slice(0, 3)) {
          const antes = await c.vaga();
          c.canal.reconectar();
          await c.presenca();
          assert.equal(await c.vaga(), antes, `${c.i}: depois de recarregar, a mesma vaga`);
        }
      }
      // Metade vota, e o telão diz "N de 20 já escolheram".
      const metade = votantes.slice(0, Math.ceil(votantes.length / 2));
      await Promise.all(metade.map((c) => c.votar(r, planoDe(c, k))));
      await telao.waitForFunction((n) => document.querySelector('.turma-andamento')?.dataset.escolheram === String(n), metade.length, { timeout: 20000 });
      const t1 = await telao.evaluate(() => ({ ...document.querySelector('.turma-andamento').dataset, texto: document.querySelector('.turma-andamento').textContent }));
      assert.deepEqual([Number(t1.escolheram), Number(t1.total)], [metade.length, VAGAS.length], `${r}: N de M`);
      assert.equal(lido(t1.texto), `${metade.length} de ${VAGAS.length} já escolheram`, `${r}: o texto do andamento`);
      if (k === 0) await conferirTelao('decisao');
      await Promise.all(votantes.slice(metade.length).map((c) => c.votar(r, planoDe(c, k))));
      await telao.waitForFunction((n) => document.querySelector('.turma-andamento')?.dataset.escolheram === String(n), votantes.length, { timeout: 20000 });
      // Encerrar (o tempo mínimo de conversa pede confirmação).
      await telao.keyboard.press('Enter');
      await confirmarSeAbrir();
      await esperarEstado((e) => e.subfase === 'resultado' && e.rodada === r, `resultado de ${r}`, 30000);
      await telao.waitForFunction(() => document.body.dataset.tela === 'rodada-resultado' && document.querySelectorAll('.turma-opcao').length > 0);
      // 6. O resultado, conferido com o motor pessoa por pessoa.
      const n = Object.fromEntries(opcoesDe(r).map((op) => [op, 0]));
      for (const c of alunos) n[caminhos.get(c.uid).linhas[k].opcao] += 1;
      const semVoto = alunos.length - votantes.length;
      const porVaga = Object.fromEntries(alunos.map((c) => [membros20[c.uid].equipe, { deAntes: caminhos.get(c.uid).linhas[k].deAntes }]));
      const grupos = H.consequenciasDaTurma(cfg, r, { [r]: porVaga });
      const conferir = async (onde) => {
        const t = await telao.evaluate(() => ({
          kicker: document.querySelector('#palco .kicker')?.textContent ?? null,
          opcoes: Array.from(document.querySelectorAll('.turma-opcao'), (li) => [li.dataset.opcao, Number(li.dataset.n), li.querySelector('.turma-opcao-rotulo').textContent]),
          semVoto: document.querySelector('.turma-sem-voto')?.textContent ?? null,
          antes: Array.from(document.querySelectorAll('.turma-antes-item'), (li) => [li.dataset.motivo, Number(li.dataset.pessoas)]),
        }));
        assert.equal(t.kicker, `O que a turma escolheu · ${F.pessoas(alunos.length)}`, `${onde}: quantas pessoas`);
        assert.deepEqual(t.opcoes, opcoesDe(r).map((op) => [op, n[op], H.textoDaOpcao(cfg, r, op, PERSONA).rotulo]), `${onde}: quantas pessoas em cada opção`);
        const padrao = letraDe(r, cfg.rodadas[r].padrao);
        assert.equal(t.semVoto, semVoto === 0 ? null : `${semVoto} pessoas não escolheram e ficaram na ${padrao}, a opção de sempre.`, `${onde}: quem não votou`);
        assert.deepEqual(t.antes, grupos.map((g) => [g.motivo, g.pessoas]), `${onde}: o que veio de antes`);
      };
      if (grupos.length > 0) comAntes += 1;
      // As telas mais altas: o primeiro resultado e os que têm consequência.
      if (k === 0 || grupos.length > 0) await conferirTelao(`resultado-${r}`, conferir);
      else await conferir(r);
      // O resultado gravado, lido como o celular lê (resultados é livre para ler).
      const gravados = await todos[0].canal.ler(s('resultados', r));
      assert.ok(gravados, `${r}: o resultado gravado (admin: ${JSON.stringify(await administrador('GET', `salas/${sala}/resultados`, undefined)).slice(0, 80)})`);
      for (const c of alunos) assert.equal(gravados[membros20[c.uid].equipe]?.decisao, caminhos.get(c.uid).linhas[k].opcao, `${r}: a decisão gravada do aluno ${c.i}`);
      // [Li] O bloco de dados depois do 1º bimestre, com o "N de M leram".
      if (k === 0 && PASSOS[(await estado()).indice + 1]?.tipo === 'bloco') {
        await avancar();
        await esperarEstado((e) => e.tipo === 'bloco', 'o bloco de dados depois do 1º bimestre');
        await telao.waitForFunction(() => document.body.dataset.tela === 'bloco');
        await conferirLidos('bloco');
      }
    }

    // 7. O placar.
    await avancarAte((e) => e.tipo === 'placarFinal', 'placar final');
    await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'fimDaTurma');
    const valores = alunos.map((c) => caminhos.get(c.uid).final).sort((a, b) => b - a);
    const fim = { pessoas: valores.length, positivos: valores.filter((v) => v >= 0).length, negativos: valores.filter((v) => v < 0).length };
    await conferirTelao('placar-fim', async (onde) => {
      const t = await telao.evaluate(() => ({
        h1: document.querySelector('#palco h1').textContent,
        colunas: Array.from(document.querySelectorAll('.grafico-turma rect'), (x) => Number(x.dataset.valor)),
      }));
      assert.equal(lido(t.h1), lido(H.fraseDoFimDaTurma(fim)), `${onde}: quantos terminaram com dinheiro sobrando e quantos devendo`);
      assert.deepEqual(t.colunas, valores, `${onde}: uma coluna por pessoa, do maior para o menor`);
    });
    await telao.waitForTimeout(1700);
    await telao.keyboard.press('Space');
    await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'escolhasDaTurma');
    await conferirTelao('placar-escolhas', async (onde) => {
      const linhas = await telao.evaluate(() => Array.from(document.querySelectorAll('.tabela-turma tbody tr'), (tr) => Array.from(tr.querySelectorAll('td'), (td) => Number(td.dataset.n))));
      const esperadas = RODADAS.map((r, k) => opcoesDe(r).map((op) => alunos.filter((c) => caminhos.get(c.uid).linhas[k].opcao === op).length));
      assert.deepEqual(linhas, esperadas, `${onde}: bimestre × opção`);
    });
    await telao.waitForTimeout(1700);
    await telao.keyboard.press('Space');
    await telao.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'combinacoes');
    await conferirTelao('placar-combinacoes');
    ultimoAvanco = Date.now();
    await avancarAte((e) => e.tipo === 'fim', 'o fim');
    await telao.waitForFunction(() => document.body.dataset.tela === 'fim');
    await conferirTelao('fim', async (onde) => {
      assert.equal(lido(await telao.textContent('#palco .fim-turma-resumo')), lido(H.fraseDoFimDaTurma(fim)), `${onde}: a frase da turma no Fim`);
    });
    // O 21º continuou de fora o jogo inteiro.
    assert.equal(await vigesimoPrimeiro.vaga(), null, 'o 21º nunca ganhou vaga');
    console.log(`  ${H.fraseDoFimDaTurma(fim)} Resultados com consequência de antes: ${comAntes}; capturas: ${capturas.length}`);
    console.log('OK: o modo individual com 21 celulares simulados (telão em 1024×768 e 1280×720 com a faixa de entrada, e em 1920×1080).');
  } finally {
    clearInterval(presencas);
  }
}

// 9. Revisão de 14/10 (achado 3): a internet cai no lobby, com 4 alunos já na
// sala, e o apresentador segura "Continuar sem celulares". O telão passa a
// jogar "a turma", um caminho só, como no pendrive: no resultado, "A turma", e
// não "O que a turma escolheu · 4 pessoas" com a mesma escolha em todas. Antes
// da correção, os membros e as vagas iam junto para a cópia local.
async function semCelularesNoLobby({ site, navegador, vigiar, celulares }) {
  const V = await carregarNucleo();
  const cfg = V.validarConfig.validarTexto(TEXTO_CONFIG).config;
  const ctx = await navegador.newContext({ viewport: { width: 1024, height: 768 } });
  await servirSdk(ctx);
  await ctx.route(`${site.url}config.json`, (rota) => rota.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: TEXTO_CONFIG }));
  const telao = await ctx.newPage();
  vigiar(telao, 'telão (sem celulares)');
  await telao.goto(`${site.url}telao/?emulador=1`);
  await telao.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await telao.waitForFunction(() => document.getElementById('hash-config'));
  await telao.fill('#pin-apresentador', PIN_EMULADOR);
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'lobby', null, { timeout: 20000 });
  const sala = await telao.evaluate(() => globalThis.Viracao.telao.sala());
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  for (let i = 0; i < 4; i += 1) {
    const canal = await novoCanalNoEmulador(`turma${i}`);
    celulares.push(canal);
    const uid = await canal.entrar();
    await canal.gravar({ [s('membros', uid)]: { entrouEm: canal.marcadorDeHora() } });
    await canal.gravar({ [s('presenca', uid)]: canal.marcadorDeHora() });
  }
  await telao.waitForFunction(() => document.querySelector('.lobby-conectados')?.dataset.pessoas === '4', null, { timeout: 20000 });

  // Segurar o botão da barra (2 s), como o apresentador.
  await telao.mouse.move(310, 768 - 10);
  await telao.waitForFunction(() => !document.getElementById('barra').hidden);
  await telao.locator('#barra [data-acao="semCelulares"]').hover();
  await telao.mouse.down();
  await telao.waitForTimeout(2400);
  await telao.mouse.up();
  await telao.waitForFunction(() => globalThis.Viracao.telao.modo() === 'offline', null, { timeout: 10000 });
  const estado = () => telao.evaluate(() => globalThis.Viracao.telao.estado());
  assert.equal((await estado()).equipesAbertas ?? null, null, 'sem as vagas da sala online');

  // Até a primeira decisão; a turma escolhe D, de mão levantada.
  const esperarEstado = async (teste, descricao) => {
    for (let i = 0; i < 200; i += 1) {
      const e = await estado();
      if (e && teste(e)) return e;
      await telao.waitForTimeout(80);
    }
    throw new Error(`Tempo esgotado esperando: ${descricao}`);
  };
  const confirmarSeAbrir = async () => {
    await telao.waitForTimeout(400);
    if (await telao.evaluate(() => document.getElementById('modal').open)) {
      await telao.keyboard.press('Tab');
      await telao.keyboard.press('Enter');
    }
  };
  for (let i = 0; i < 10; i += 1) {
    const e = await estado();
    if (e.tipo === 'rodada') break;
    if (e.tipo === 'enquete' && e.subfase === 'votando') {
      await telao.keyboard.press('Enter');
      await confirmarSeAbrir();
      await esperarEstado((x) => x.subfase === 'apurada', 'a enquete apurada');
      continue;
    }
    await telao.waitForTimeout(1700);
    await telao.keyboard.press('Space');
    await esperarEstado((x) => x.indice !== e.indice || x.subfase !== e.subfase, `sair do passo ${e.indice}`);
  }
  const r1 = await esperarEstado((e) => e.tipo === 'rodada' && e.subfase === 'decidindo', 'a primeira decisão');
  const op = cfg.rodadas[r1.rodada].ordemOpcoes[3];
  await telao.click(`.turma-decisao .botao-letra[data-opcao="${op}"]`);
  await esperarEstado((x) => Object.values(x.forcadas || {}).length > 0, 'a escolha da turma marcada');
  assert.deepEqual((await estado()).forcadas, { [cfg.ordem.equipes[0]]: op }, 'a escolha da turma é um caminho só');
  await telao.keyboard.press('Enter');
  await confirmarSeAbrir();
  await esperarEstado((x) => x.subfase === 'resultado', 'o resultado da primeira decisão');
  await telao.waitForFunction(() => document.body.dataset.tela === 'rodada-resultado');
  const t = await telao.evaluate(() => ({
    quem: Array.from(document.querySelectorAll('.turma-quem'), (x) => x.textContent),
    opcoes: document.querySelectorAll('.turma-opcao').length,
    kicker: document.querySelector('#palco .kicker')?.textContent ?? '',
  }));
  assert.deepEqual(t.quem, ['A turma'], 'o resultado é o da turma, um caminho só');
  assert.equal(t.opcoes, 0, 'sem a contagem por pessoas');
  assert.ok(!/pessoas/.test(t.kicker), `sem "N pessoas" no alto ("${t.kicker}")`);
  assert.deepEqual((await estado()).equipesAbertas, { [cfg.ordem.equipes[0]]: true }, 'uma vaga só, a da turma');
  await telao.screenshot({ path: join(CAPTURAS, 'individual-sem-celulares-no-lobby.png') });
  if (COPIA) copyFileSync(join(CAPTURAS, 'individual-sem-celulares-no-lobby.png'), join(COPIA, 'individual-sem-celulares-no-lobby.png'));
  await ctx.close();
  console.log('OK: "Continuar sem celulares" no lobby, com 4 alunos na sala, joga "a turma" (um caminho só).');
}
