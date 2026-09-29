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
// 8. "Continuar sem celulares" segue do espelho local, no mesmo passo;
// 9. o redesenho de 29/09 no celular: o contexto da família na decisão, até 4
//    opções com a narrativa e sem setas (D-043), "entrou · o básico custa ·
//    faltou" e a dívida (D-044, D-046), e a história da equipe no fim (D-045);
// 10. "piloto automático" em nenhuma tela do celular nem no resultado do telão
//    (D-041; rascunho, seção 7, item 14), e o "Escolha ou sorte?" do celular com
//    os totais sem sinal e as variações com + ou − (item 11);
// 11. o esquema v2.1 no celular: tocar numa opção abre a explicação sem votar, e
//    o "Votar nesta" confirma e muda o voto (D-055); o texto da opção do jeito
//    da persona da equipe (D-054); o custo real da carta (dias parado, renda
//    perdida, gastos) e a linha "entrou · gastos · básico · juros · faltou"
//    (D-052).
// Capturas do celular em e2e/capturas/celular-*.png (as antigas são apagadas no
// começo: uma captura nova muda a numeração das seguintes).
//
// O SDK vem do próprio node_modules/firebase (os mesmos arquivos da CDN
// gstatic 12.19.0), servido pelo Playwright no endereço da CDN: o teste não
// depende de internet e exercita o mesmo import() do site.
//
// As funções passadas a page.evaluate/waitForFunction rodam no navegador.
/* global document, innerWidth, innerHeight, getComputedStyle, MutationObserver */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
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
// O --fixture segue junto: sem ele, a segunda execução voltava ao config.json.
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  const repassar = process.argv.includes('--fixture') ? ' --fixture' : '';
  process.exitCode = await rodarNoEmulador(`node e2e/sessao-online.e2e.mjs${repassar}`);
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

// Enquanto o config.json da raiz não passa no validador (ou com E2E_FIXTURE=1),
// o e2e joga com a fixture v2.1 dos testes, servida pelo Playwright no lugar
// dele, com ajustes que só valem aqui:
// - cada opção ganha uma narrativa do tamanho das do rascunho (cerca de 110
//   letras) e, para a persona da equipe 1, um rótulo e uma narrativa próprios
//   (D-054), a narrativa com cerca de 150 letras: o pior caso da decisão em
//   360×740 é uma opção aberta com a narrativa mais longa (D-055);
// - a enquete de entrada passa a "todas", como no config.json: o roteiro do e2e
//   responde as 3 afirmações de uma vez, com "voltar" e "mudar";
// - como no config.json, um bloco entre as personas e o primeiro mês: é nele que
//   o celular mostra a situação antes da primeira rodada;
// - no mês 1, só a carta do acidente (20 dias parado, conserto e remédio): o
//   custo real da carta (D-052) aparece sempre, e não só quando a sorte quer;
// - no mês 2, um seguro contra acidente (categoria "protecao", valor de teste)
//   para quem tirou o acidente no mês 1: o celular mostra sempre "a proteção
//   pagou" (D-059). O INSS do MEI da fixture depende de a equipe 1 votar no
//   MEI, e o roteiro do e2e vota na primeira opção.
function fixtureV21ParaE2e() {
  const cfg = JSON.parse(readFileSync(join(RAIZ, 'test', 'fixtures', 'config-teste-v21.json'), 'utf8'));
  cfg.enquetes.find((e) => e.id === 'entrada').modo = 'todas';
  for (const passos of Object.values(cfg.roteiros)) {
    const i = passos.findIndex((p) => p.tipo === 'personas');
    if (passos[i + 1]?.tipo !== 'bloco') passos.splice(i + 1, 0, { tipo: 'bloco', titulo: 'Antes do primeiro mês', alvoSeg: 120 });
  }
  // O básico do Rafa (equipe 1) passa de R$ 2.000 para R$ 5.000: com qualquer
  // opção e qualquer carta o mês 1 não fecha (sem o acidente, o melhor caso
  // entraria com R$ 4.700), e o e2e passa sempre pelo "faltou", pela dívida e
  // pelos juros do mês 2.
  cfg.personas.find((p) => p.id === 'motoboy').basico.itens.push({ rotulo: 'dívida antiga da família', valor: 3000, fonte: 'valor de teste do e2e' });
  const mes1 = cfg.rodadas[0].id;
  const todas = cfg.rodadas.map((r) => r.id);
  for (const carta of cfg.cartas) {
    if (carta.id !== 'acidente') carta.rodadas = (carta.rodadas ?? todas).filter((r) => r !== mes1);
  }
  cfg.rodadas[1].efeitosGerais.push({
    se: { sorteou: { [mes1]: 'acidente' } }, soma: { renda: 500 }, categoria: 'protecao', rotulo: 'seguro contra acidente (valor de teste do e2e)',
  });
  const personaE1 = cfg.equipes[0].persona;
  for (const r of cfg.rodadas) {
    const opcoes = Array.isArray(r.opcoes) ? r.opcoes : Object.values(r.opcoes);
    for (const o of opcoes) {
      o.narrativa ??= `Escolhi "${o.rotulo}" sabendo que o mês não fecha: cada real conta, e ninguém garante o pedido de amanhã.`;
      o.rotuloPor = { ...o.rotuloPor, [personaE1]: `${o.rotulo}, na moto`.slice(0, 60) };
      o.narrativaPor = {
        ...o.narrativaPor,
        [personaE1]: `Na moto, escolhi "${o.rotulo}" com a parcela vencendo, o filho pedindo lanche e o app mudando a regra sem avisar.`.slice(0, 160),
      };
    }
  }
  return JSON.stringify(cfg, null, 2);
}

// O config real com o mês 1 só com as cartas de parada (diasParado > 0), que
// o próprio config diz quais são.
function soCartasDeParadaNoMes1(texto) {
  const cfg = JSON.parse(texto);
  const todas = cfg.rodadas.map((r) => r.id);
  const mes1 = todas[0];
  for (const carta of cfg.cartas) {
    if (!(carta.diasParado > 0)) carta.rodadas = (carta.rodadas ?? todas).filter((r) => r !== mes1);
  }
  return JSON.stringify(cfg, null, 2);
}

// O que o teste precisa do conteúdo, tirado dele (e não escrito aqui): o
// conteúdo ainda muda até o congelamento (docs/decisoes.md), e o teste não pode
// quebrar porque uma equipe trocou de nome.
async function conteudoDoTeste() {
  const V = await carregarNucleo();
  let textoConfig = readFileSync(join(RAIZ, 'config.json'), 'utf8');
  let origem = 'config.json';
  let r = V.validarConfig.validarTexto(textoConfig);
  // E2E_FIXTURE=1 força a fixture mesmo com o config.json válido: é ela que passa
  // com certeza pelo "faltou", pela dívida e pelos juros (o config real depende da carta).
  // --fixture faz o mesmo, e é o que o "npm run e2e:online:fixture" usa: variável
  // de ambiente na linha do npm não funciona no cmd do Windows.
  const forcarFixture = process.env.E2E_FIXTURE === '1' || process.argv.includes('--fixture');
  if (!r.ok || forcarFixture) {
    textoConfig = fixtureV21ParaE2e();
    origem = `test/fixtures/config-teste-v21.json (${forcarFixture ? 'forçada: E2E_FIXTURE=1 ou --fixture' : 'o config.json da raiz ainda não passa no validador'})`;
    r = V.validarConfig.validarTexto(textoConfig);
  }
  if (r.ok && origem === 'config.json') {
    // Revisão de 29/09, 2ª rodada (achado 19): com o config real, o resultado
    // no celular saía com a carta "Normal" ou "Semana boa", e a linha "O que a
    // carta custou" (D-052) nunca era vista em 360×740. No mês 1, só as cartas
    // com dias parados podem sair (as outras continuam nos meses seguintes).
    textoConfig = soCartasDeParadaNoMes1(textoConfig);
    origem = 'config.json (no mês 1, só as cartas com dias parados)';
    r = V.validarConfig.validarTexto(textoConfig);
  }
  assert.ok(r.ok, `o conteúdo do e2e precisa ser válido (${origem}): ${JSON.stringify(r.erros)}`);
  console.log(`Conteúdo do e2e: ${origem}.`);
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
    cfg, textoConfig, historiaDaEquipe: V.historia.historiaDaEquipe, textoDaOpcao: V.historia.textoDaOpcao,
    decompor: V.motor.decompor, protecaoDoResultado: V.historia.protecaoDoResultado, historia: V.historia,
    usandoFixture: !origem.startsWith('config.json'),
  };
}

async function sessao() {
  mkdirSync(CAPTURAS, { recursive: true });
  for (const n of readdirSync(CAPTURAS)) if (/^celular-.*.png$/.test(n)) rmSync(join(CAPTURAS, n));
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
  // Todo telão lê o mesmo conteúdo (a fixture, enquanto o config.json da raiz
  // não passa): retomar a sala exige o mesmo hash de config.
  const servirConfig = (ctx) => ctx.route(`${site.url}config.json`, (rota) => rota.fulfill({
    status: 200, contentType: 'application/json; charset=utf-8', body: C.textoConfig,
  }));
  // ---------- Sem serviço: o offline continua sendo a saída ----------
  // Sem ?emulador=1, vale o conexao.json do site; aqui ele é o modelo com
  // "COLE_AQUI": o telão explica e só oferece o modo sem celulares. O modelo é
  // servido pelo Playwright, e não lido do repositório: desde que o conexao.json
  // foi preenchido com as chaves do projeto real, este bloco fazia login anônimo
  // e o autoteste das regras NO PROJETO REAL (AGENTS.md, regra 6). A CDN também
  // fica bloqueada aqui, para nada deste contexto sair para o serviço.
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    await servirConfig(ctx);
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
    await servirConfig(ctx);
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
    await servirConfig(ctx);
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
  await servirConfig(ctxTelao);
  // let: no fim, outra máquina assume a sala, e os ajudantes passam a falar com ela.
  let telao = await ctxTelao.newPage();
  // D-038: a barra do apresentador só aparece com o mouse na faixa de 48 px da
  // borda de baixo (ou com H). O telão tem 800 px de altura.
  const mouseNaBorda = (x) => telao.mouse.move(x, 800 - 10);
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
    assert.ok(!/piloto autom/i.test(await c.p.textContent('body')), `${nome}: "piloto automático" no celular (D-041)`);
    assert.deepEqual(r.pequenos, [], `${nome}: alvos de toque abaixo de 48 px`);
    await c.p.screenshot({ path: join(CAPTURAS, `celular-${String(++capturas).padStart(2, '0')}-${nome}.png`), fullPage: true });
  }

  // ---------- O redesenho de 29/09 no celular (D-043 a D-046) ----------
  const personaDe = (eq) => C.cfg.personas[C.cfg.equipes[eq].persona];
  const listaDe = (x) => (Array.isArray(x) ? x : Object.values(x || {}));
  const inclui = (texto, trecho) => String(texto).toLocaleLowerCase('pt-BR').includes(String(trecho).toLocaleLowerCase('pt-BR'));
  // O dinheiro formatado pelo próprio celular (o mesmo Viracao.formatar da tela).
  const moedaNa = (c, v) => c.p.evaluate((x) => globalThis.Viracao.formatar.moeda(x), v);
  // "Entrou R$ X · gastos R$ G · o básico da família custa R$ Y · faltou R$ Z"
  // (D-044, D-052), com os números do mês que o telão gravou em
  // resultados/{r}/{eq}.mes. Os gastos e os juros só aparecem quando existem.
  async function conferirContaDoMes(c, mes, onde) {
    assert.ok(mes && Number.isFinite(mes.saldoMes), `${onde}: o telão gravou o mês no resultado`);
    const lido = await c.p.evaluate(() => {
      const n = document.querySelector('.conta-mes');
      return n ? { ...n.dataset, texto: n.textContent } : null;
    });
    assert.ok(lido, `${onde}: a conta do mês aparece`);
    for (const k of ['entrou', 'protecao', 'gastos', 'basico', 'juros', 'saldoMes']) assert.equal(Number(lido[k]), mes[k] ?? 0, `${onde}: ${k} do mês`);
    const trechos = [
      `entrou ${await moedaNa(c, mes.entrou)}`,
      `o básico da família custa ${await moedaNa(c, mes.basico)}`,
      mes.saldoMes < 0 ? `faltou ${await moedaNa(c, -mes.saldoMes)}` : `sobrou ${await moedaNa(c, mes.saldoMes)}`,
    ];
    // D-059: o que a proteção pagou, na linha da conta (fora do "entrou").
    if (mes.protecao > 0) trechos.push(`a proteção pagou ${await moedaNa(c, mes.protecao)}`);
    if (mes.gastos > 0) trechos.push(`gastos ${await moedaNa(c, mes.gastos)}`);
    if (mes.juros > 0) trechos.push(`juros da dívida ${await moedaNa(c, mes.juros)}`);
    // De onde veio o "entrou", quando ele não é só o trabalho: o custo fixo do
    // trabalho (parcela da moto) e a outra renda da casa.
    if (mes.custosFixos > 0 || mes.outraRenda > 0) trechos.push(`do trabalho e da decisão: ${await moedaNa(c, mes.trabalho)}`);
    if (mes.custosFixos > 0) trechos.push(`custos fixos do trabalho: ${await moedaNa(c, -mes.custosFixos)}`);
    for (const x of trechos) assert.ok(inclui(lido.texto, x), `${onde}: "${x}" em "${lido.texto}"`);
    // A conta fecha na tela: entrou + proteção − gastos − básico − juros = saldo do mês.
    assert.equal(mes.entrou + (mes.protecao ?? 0) - (mes.gastos ?? 0) - mes.basico - mes.juros, mes.saldoMes, `${onde}: a conta do mês fecha`);
  }
  // D-059: "A proteção pagou R$ X: <rótulo>. Sem ela, teria faltado R$ Y a
  // mais.", a partir do resultado gravado pelo telão; sem proteção no mês, sem
  // a linha. O "sem ela" é refeito aqui, e não pela função da tela.
  // "O pior que podia acontecer" no celular (D-059): os números e o texto que
  // historia.piorCasoDoPlacar manda mostrar, e nunca um "sem" melhor que o
  // "com". Config sem proteção: sem o bloco.
  async function conferirPiorCasoNoCelular(c, placarDaEquipe, resultados, onde) {
    const lido = await c.p.evaluate(() => {
      const b = document.querySelector('.pior-caso');
      return b ? { situacao: b.dataset.situacao, dd: Array.from(b.querySelectorAll('dd'), (n) => n.textContent.trim()), nota: b.querySelector('.texto-2')?.textContent ?? null } : null;
    });
    const H = C.historia;
    if (!H.temProtecao(C.cfg)) {
      assert.equal(lido, null, `${onde}: config sem proteção, sem o pior caso no celular`);
      return;
    }
    const p = H.piorCasoDoPlacar(placarDaEquipe, H.escolheuProtecao(C.cfg, resultados, E1));
    const esperados = [p.comEscolhas, ...(p.situacao === 'evitou' ? [p.semProtecao, p.evitou] : [])];
    assert.ok(lido, `${onde}: o celular mostra o pior caso`);
    assert.equal(lido.situacao, p.situacao, `${onde}: a situação do pior caso`);
    assert.deepEqual(lido.dd, await Promise.all(esperados.map((v) => moedaNa(c, v))), `${onde}: os valores do pior caso`);
    if (p.situacao === 'evitou') assert.ok(p.semProtecao < p.comEscolhas);
    else assert.ok(lido.nota, `${onde}: sem o "sem", uma frase no lugar`);
  }

  async function conferirFraseDaProtecao(c, res, onde) {
    const texto = await c.p.evaluate(() => document.querySelector('.conta-protecao')?.textContent ?? null);
    const p = C.protecaoDoResultado(res);
    if (!p) {
      assert.equal(texto, null, `${onde}: sem proteção no mês, sem a frase`);
      return false;
    }
    const nomes = p.itens.map((x) => x.rotulo);
    assert.ok(nomes.length > 0, `${onde}: o telão gravou o que a proteção pagou (protecaoItens)`);
    const semEla = res.mes.saldoMes < 0
      ? `Sem ela, teria faltado ${await moedaNa(c, p.evitou)} a mais.`
      : res.mes.saldoMes - p.evitou < 0 ? `Sem ela, teria faltado ${await moedaNa(c, p.evitou - res.mes.saldoMes)}.` : `Sem ela, teria sobrado ${await moedaNa(c, p.evitou)} a menos.`;
    assert.equal(texto, `A proteção pagou ${await moedaNa(c, p.pagou)}: ${nomes.join(' e ')}. ${semEla}`, `${onde}: a frase da proteção`);
    return true;
  }
  // "Custo da carta: 20 dias parado · renda perdida R$ X · gastos R$ Y" (D-052),
  // com o cartaCusto gravado pelo telão. Carta sem custo nenhum, sem a linha.
  const trechosDoCusto = async (c, custo) => [
    custo.diasParado > 0 ? `${custo.diasParado} ${custo.diasParado === 1 ? 'dia parado' : 'dias parado'}` : null,
    custo.rendaPerdida > 0 ? `renda perdida ${await moedaNa(c, custo.rendaPerdida)}` : null,
    custo.gastos > 0 ? `gastos ${await moedaNa(c, custo.gastos)}` : null,
  ].filter(Boolean);
  const temCusto = (custo) => Boolean(custo) && (custo.diasParado > 0 || custo.rendaPerdida > 0 || custo.gastos > 0);
  async function conferirCartaCusto(c, custo, onde) {
    const lido = await c.p.evaluate(() => {
      const n = document.querySelector('.carta-custo');
      return n ? { ...n.dataset, texto: n.textContent } : null;
    });
    if (!temCusto(custo)) {
      assert.equal(lido, null, `${onde}: carta sem custo, sem a linha do custo`);
      return;
    }
    assert.ok(lido, `${onde}: o custo real da carta aparece`);
    for (const k of ['diasParado', 'rendaPerdida', 'gastos']) assert.equal(Number(lido[k]), custo[k], `${onde}: ${k} da carta`);
    for (const x of await trechosDoCusto(c, custo)) assert.ok(inclui(lido.texto, x), `${onde}: "${x}" em "${lido.texto}"`);
  }
  // "Dívida R$ D · juros de J% ao mês" (D-046), só quando o saldo está negativo.
  async function conferirDivida(c, renda, onde) {
    const texto = await c.p.evaluate(() => document.querySelector('.divida')?.textContent ?? null);
    if (renda >= 0) {
      assert.equal(texto, null, `${onde}: sem dívida, sem a linha da dívida`);
      return;
    }
    // Com as casas da fonte (7,43%), refeito aqui, e não pelo formatador da página.
    const juros = `${(C.cfg.regras.jurosDividaMes * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    for (const x of [`dívida ${await moedaNa(c, -renda)}`, `juros de ${juros} ao mês`]) assert.ok(inclui(texto, x), `${onde}: "${x}" em "${texto}"`);
  }
  async function conferirFamilia(c, eq, onde) {
    const texto = await c.p.evaluate(() => document.querySelector('.familia')?.textContent ?? '');
    assert.ok(texto.includes(personaDe(eq).familia.descricao), `${onde}: a família em uma linha`);
  }
  // A história da equipe, mês a mês (D-045): a mesma função pura do núcleo.
  async function conferirHistoria(c, eq, resultadosDaSala, onde) {
    const esperada = C.historiaDaEquipe(C.cfg, eq, resultadosDaSala);
    assert.ok(esperada.length >= 2, `${onde}: a equipe jogou pelo menos dois meses`);
    const lida = await c.p.$$eval('.historia-mes', (ns) => ns.map((n) => ({ rodada: n.dataset.rodada, texto: n.textContent })));
    assert.deepEqual(lida.map((x) => x.rodada), esperada.map((x) => x.rodadaId), `${onde}: um item por mês jogado, na ordem`);
    for (const [i, h] of esperada.entries()) {
      for (const x of [h.titulo, h.opcao.rotulo, h.opcao.narrativa, h.carta.titulo, h.carta.narrativa]) {
        if (x) assert.ok(lida[i].texto.includes(x), `${onde}: o mês ${h.rodadaId} traz "${x}"`);
      }
      if (h.mes) {
        const saldo = h.mes.saldoMes < 0 ? `faltou ${await moedaNa(c, -h.mes.saldoMes)}` : `sobrou ${await moedaNa(c, h.mes.saldoMes)}`;
        assert.ok(inclui(lida[i].texto, saldo), `${onde}: o mês ${h.rodadaId} traz "${saldo}"`);
        if (h.mes.juros > 0) {
          const juros = `juros ${await moedaNa(c, h.mes.juros)}`;
          assert.ok(inclui(lida[i].texto, juros), `${onde}: o mês ${h.rodadaId} traz "${juros}"`);
        }
        if (h.mes.gastos > 0) {
          const gastos = `gastos ${await moedaNa(c, h.mes.gastos)}`;
          assert.ok(inclui(lida[i].texto, gastos), `${onde}: o mês ${h.rodadaId} traz "${gastos}"`);
        }
        // D-059: a proteção na conta do mês e a frase dela.
        if (h.mes.protecao > 0) {
          for (const x of [`a proteção pagou ${await moedaNa(c, h.mes.protecao)}`, `A proteção pagou ${await moedaNa(c, h.protecaoDoMes.pagou)}`]) {
            assert.ok(lida[i].texto.includes(x), `${onde}: o mês ${h.rodadaId} traz "${x}"`);
          }
        } else {
          assert.ok(!lida[i].texto.includes('proteção pagou'), `${onde}: o mês ${h.rodadaId} sem proteção não fala dela`);
        }
      }
      // D-052: o custo real da carta também na história.
      if (temCusto(h.cartaCusto)) {
        for (const x of await trechosDoCusto(c, h.cartaCusto)) assert.ok(inclui(lida[i].texto, x), `${onde}: o mês ${h.rodadaId} traz "${x}"`);
      }
    }
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
  // D-047: a contagem de ativos é texto de operação e fica só na barra oculta,
  // fora da tela projetada.
  const ativosNaBarra = (texto, timeout = 20000) => telao.waitForFunction((t) => document.querySelector('#barra [data-contagem-ativos]')?.textContent === t, texto, { timeout });
  const avisoDiz = (re, timeout = 15000) => telao.waitForFunction((fonte) => new RegExp(fonte).test(document.getElementById('aviso')?.textContent || ''), re.source, { timeout });
  async function segurarNaBarra(acao) {
    await mouseNaBorda(300 + Math.random() * 40);
    await telao.waitForFunction(() => !document.getElementById('barra').hidden);
    await telao.locator(`#barra [data-acao="${acao}"]`).hover();
    await telao.mouse.down();
    await telao.waitForTimeout(2400);
    await telao.mouse.up();
  }
  await ativosNaBarra('3 ativos / 3 membros');
  assert.equal(await telao.locator('.lobby [data-contagem-ativos]').count(), 0, 'a contagem de ativos não fica no lobby projetado (D-047)');
  const dudu = await novoCelular('dudu');
  await dudu.p.click('[data-acao="entrar"]');
  await esperarTela(dudu, 'aguardando');
  const uidDudu = await dudu.p.evaluate(() => globalThis.Viracao.aluno.uid());
  await ativosNaBarra('4 ativos / 4 membros');
  assert.equal(await telao.textContent('#barra [data-contagem-ativos]'), '4 ativos / 4 membros');
  // O celular some (a aba fechada; o servidor apaga a presença dele pelo
  // onDisconnect). O último sinal é então regravado 50 s para trás, para o teste
  // não esperar o minuto inteiro: quando ele cruza os 60 s, nenhum aviso do banco
  // chega, e o telão tem de perceber sozinho.
  await dudu.ctx.close();
  assert.equal(await esperarNoBanco(`salas/${sala}/presenca/${uidDudu}`, null, 20000), null, 'a presença sai quando o celular some');
  await administrador('PUT', `salas/${sala}/presenca/${uidDudu}`, Date.now() - 50000);
  await ativosNaBarra('4 ativos / 4 membros', 5000);
  await ativosNaBarra('3 ativos / 4 membros', 15000);
  assert.equal(await telao.textContent('#barra [data-contagem-ativos]'), '3 ativos / 4 membros');
  // Sem sinal há pouco mais de 1 min: ainda não sai (o limite é de 2 min, para
  // quem só trocou de rede ou apagou a tela não perder a equipe).
  await segurarNaBarra('removerInativos');
  await avisoDiz(/ninguém saiu/);
  assert.ok(await administrador('GET', `salas/${sala}/membros/${uidDudu}`), 'com menos de 2 min sem sinal, o membro fica');
  await administrador('PUT', `salas/${sala}/presenca/${uidDudu}`, Date.now() - 130000);
  await segurarNaBarra('removerInativos');
  await avisoDiz(/^1 membro inativo removido/);
  await ativosNaBarra('3 ativos / 3 membros');
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
  await conferirFamilia(cel[0], E1, 'persona');
  const basicoE1 = listaDe(personaDe(E1).basico.itens).reduce((soma, i) => soma + i.valor, 0);
  {
    const texto = await cel[0].p.textContent('#tela');
    assert.ok(inclui(texto, `o básico da família custa ${await moedaNa(cel[0], basicoE1)}`), 'persona: o total do básico da casa');
    for (const i of listaDe(personaDe(E1).basico.itens)) assert.ok(texto.includes(i.rotulo) && texto.includes(i.fonte), `persona: o item "${i.rotulo}" do básico, com a fonte`);
  }
  await conferirCelular(cel[0], 'persona');
  await avancar(); // bloco: a situação da persona
  await esperarEstado((e) => e.tipo === 'bloco', 'bloco');
  await esperarTela(cel[0], 'situacao');
  await conferirFamilia(cel[0], E1, 'situação antes do primeiro mês');
  assert.ok(inclui(await cel[0].p.textContent('#tela'), `o básico da família custa ${await moedaNa(cel[0], basicoE1)}`), 'situação: o básico antes do primeiro mês');
  assert.equal(await cel[0].p.locator('.conta-mes').count(), 0, 'antes do primeiro mês não há conta do mês');
  await conferirCelular(cel[0], 'situacao-bloco');

  // ---------- Rodada: contagem ao vivo, queda de rede e recarga ----------
  const R = C.rodada;
  const [OA, OB, OC] = C.opcoes;
  const opcao = (op) => `.botao-opcao-aluno[data-opcao="${op}"]`;
  const botaoVotar = (op) => `[data-votar="${op}"]`;
  const temNota = (c, re, timeout = 10000) => c.p.waitForFunction((fonte) => new RegExp(fonte).test(document.querySelector('.nota')?.textContent || ''), re.source, { timeout });
  // D-055: tocar na opção só abre a explicação; o voto é o "Votar nesta". Tocar
  // na opção já aberta a fecharia, por isso abrir() confere antes.
  async function abrir(c, op) {
    if (await c.p.getAttribute(opcao(op), 'aria-expanded') !== 'true') await c.p.click(opcao(op));
    await c.p.waitForSelector(`[data-detalhe="${op}"]`);
  }
  async function votarNa(c, op) {
    await abrir(c, op);
    await c.p.click(botaoVotar(op));
  }
  const votada = (c, op) => c.p.waitForFunction((s) => document.querySelector(s)?.dataset.meuVoto === '1', opcao(op));
  // O "Votar nesta" (ou o "Seu voto está nesta") da opção aberta, inteiro na
  // tela: abaixo do topo fixo e acima do aviso "Mais opções abaixo", se houver.
  const votarAVista = (c, op) => c.p.waitForFunction((o) => {
    const alvo = document.querySelector(`[data-detalhe="${o}"] [data-votar], [data-detalhe="${o}"] .opcao-votada`);
    if (!alvo) return false;
    const r = alvo.getBoundingClientRect();
    const topo = document.querySelector('.topo').getBoundingClientRect().bottom;
    const aviso = document.querySelector('[data-aviso-rolagem]');
    const limite = aviso && !aviso.hidden ? aviso.getBoundingClientRect().top : innerHeight;
    return r.height > 0 && r.top >= topo - 1 && r.bottom <= limite + 1;
  }, op, { timeout: 5000 });
  await avancarAte((e) => e.tipo === 'rodada' && e.subfase === 'decidindo' && e.rodada === R, `rodada ${R}`);
  for (const c of cel) await esperarTela(c, 'decisao');
  // D-043: o contexto da família no topo, só no celular da equipe daquela persona.
  const rodadaR = C.cfg.rodadas[R];
  for (const [c, eq] of [[cel[0], E1], [cel[1], E2]]) {
    const esperado = rodadaR.contexto?.[C.cfg.equipes[eq].persona] ?? null;
    const lido = await c.p.evaluate(() => {
      const n = document.querySelector('.contexto-familia');
      const op = document.querySelector('.botao-opcao-aluno');
      return n ? { texto: n.textContent, antesDasOpcoes: n.getBoundingClientRect().bottom <= op.getBoundingClientRect().top } : null;
    });
    if (esperado === null) assert.equal(lido, null, `${c.nome}: sem contexto para a persona, sem a caixa`);
    else {
      assert.ok(lido?.texto.includes(esperado), `${c.nome}: o contexto da família na decisão`);
      assert.ok(lido.antesDasOpcoes, `${c.nome}: o contexto vem antes das opções`);
    }
  }
  // Até 4 opções, cada uma com a narrativa, e nenhuma tendência nem seta.
  const lidasOpcoes = await cel[0].p.$$eval('.botao-opcao-aluno', (bs) => bs.map((b) => ({ id: b.dataset.opcao, narrativa: b.querySelector('.opcao-narrativa')?.textContent ?? null })));
  assert.ok(C.todasOpcoes.length <= 4, 'no máximo 4 opções por mês');
  assert.deepEqual(lidasOpcoes.map((o) => o.id), C.todasOpcoes, 'todas as opções da rodada, na ordem');
  // Nenhuma opção aberta, nenhuma narrativa (revisão de 29/09: com as quatro,
  // só a A cabia antes de rolar); a narrativa aparece ao tocar na opção (D-055).
  for (const o of lidasOpcoes) assert.equal(o.narrativa, null, `sem tocar, sem a narrativa da opção ${o.id}`);
  // D-054: o rótulo de cada opção do jeito da persona da equipe.
  const personaE1 = C.cfg.equipes[E1].persona;
  const textoE1 = (r, op) => C.textoDaOpcao(C.cfg, r, op, personaE1);
  assert.deepEqual(await cel[0].p.$$eval('.botao-opcao-aluno .opcao-rotulo', (ns) => ns.map((n) => n.textContent)),
    C.todasOpcoes.map((id) => textoE1(R, id).rotulo), 'os rótulos das opções com o texto da persona da equipe');
  if (C.usandoFixture) {
    assert.ok(C.todasOpcoes.every((id) => textoE1(R, id).rotulo !== rodadaR.opcoes[id].rotulo), 'a fixture do e2e tem rotuloPor para a persona da equipe 1');
  }
  {
    const texto = await cel[0].p.textContent('#tela');
    for (const id of C.todasOpcoes) {
      const tendencia = rodadaR.opcoes[id].tendencia;
      if (tendencia) assert.ok(!texto.includes(tendencia), `a tendência da opção ${id} não aparece (D-043)`);
    }
    assert.ok(!/[↑↓↗↘⬆⬇▲▼]/.test(await cel[0].p.textContent('.opcoes-aluno')), 'sem setas nas opções');
  }
  const restaSeg = await cel[0].p.evaluate(() => {
    const [m, s] = document.querySelector('.cronometro-aluno').textContent.split(':').map(Number);
    return m * 60 + s;
  });
  assert.ok(restaSeg <= C.cfg.tempos.decisaoSeg && restaSeg > C.cfg.tempos.decisaoSeg - 45, `o cronômetro parte de ${C.cfg.tempos.decisaoSeg} s (lido: ${restaSeg} s)`);
  // Em 360×740, 4 opções com narrativa podem passar da dobra: a primeira fica
  // inteira à vista, e, enquanto a última não aparece, o aviso "mais opções
  // abaixo" fica na tela. Voto escondido atrás de rolagem, só com aviso.
  await cel[0].p.evaluate(() => globalThis.scrollTo(0, 0));
  const avisoCoerente = () => cel[0].p.waitForFunction(() => {
    const bs = [...document.querySelectorAll('.botao-opcao-aluno')];
    const aviso = document.querySelector('[data-aviso-rolagem]');
    const ultimaVisivel = bs.at(-1).getBoundingClientRect().bottom <= innerHeight + 1;
    return (Boolean(aviso) && !aviso.hidden) === !ultimaVisivel;
  }, null, { timeout: 5000 });
  await avisoCoerente();
  const dobra = await cel[0].p.evaluate(() => {
    const bs = [...document.querySelectorAll('.botao-opcao-aluno')];
    return { primeira: bs[0].getBoundingClientRect().bottom <= innerHeight, ultima: bs.at(-1).getBoundingClientRect().bottom <= innerHeight + 1 };
  });
  assert.ok(dobra.primeira, 'a primeira opção cabe inteira sem rolar');
  // Revisão de 29/09, 2ª rodada (achado 19): a instrução de como se vota ficava
  // abaixo da dobra; a dica curta vem antes das opções, na primeira tela.
  // Fica no lugar do "Decisão da equipe", no cabeçalho: uma linha a mais antes
  // das opções empurrava a letra D para fora da primeira tela.
  const dica = await cel[0].p.evaluate(() => {
    const n = document.querySelector('.cabecalho .kicker');
    const opcoes = document.querySelector('.opcoes-aluno');
    return n ? { baixo: n.getBoundingClientRect().bottom, antes: n.getBoundingClientRect().bottom <= opcoes.getBoundingClientRect().top + 1, texto: n.textContent } : null;
  });
  assert.ok(dica && dica.baixo <= 740 && dica.antes, `a dica do voto na primeira tela, antes das opções (${JSON.stringify(dica)})`);
  assert.match(dica.texto, /Toque para ler; vote no botão/);
  // Revisão de 29/09: só a opção A aparecia antes de rolar. As letras de todas
  // as opções cabem na primeira tela (a narrativa longa fica só na escolhida, e
  // o texto da rodada, no telão).
  const letrasFora = await cel[0].p.evaluate(() => {
    // O aviso fixo "Mais opções abaixo" cobre a base da tela quando aparece.
    const aviso = document.querySelector('[data-aviso-rolagem]');
    const limite = aviso && !aviso.hidden ? aviso.getBoundingClientRect().top : innerHeight;
    return [...document.querySelectorAll('.botao-opcao-aluno .opcao-letra')].filter((l) => l.getBoundingClientRect().bottom > limite).map((l) => l.textContent);
  });
  assert.deepEqual(letrasFora, [], 'as letras de todas as opções cabem em 360×740 sem rolar');
  if (dobra.ultima) console.log('Decisão: as opções cabem em 360×740 sem rolar.');
  else {
    await cel[0].p.screenshot({ path: join(CAPTURAS, `celular-${String(++capturas).padStart(2, '0')}-decisao-dobra.png`) });
    await cel[0].p.click('[data-aviso-rolagem]');
    await cel[0].p.waitForFunction(() => {
      const bs = [...document.querySelectorAll('.botao-opcao-aluno')];
      return bs.at(-1).getBoundingClientRect().bottom <= innerHeight + 1 && document.querySelector('[data-aviso-rolagem]').hidden;
    }, null, { timeout: 5000 });
    await cel[0].p.evaluate(() => globalThis.scrollTo(0, 0));
    await avisoCoerente();
    console.log('Decisão: as opções passam da dobra em 360×740, com o aviso "mais opções abaixo" até a última aparecer.');
  }
  // Revisão da F2, achado 17: a caixa "Situação de …" tem um marcador de que abre.
  const marcador = () => cel[0].p.evaluate(() => getComputedStyle(document.querySelector('.situacao-resumo summary'), '::after').content);
  assert.match(await marcador(), /ver/);
  await cel[0].p.click('.situacao-resumo summary');
  assert.match(await marcador(), /fechar/);
  await cel[0].p.click('.situacao-resumo summary');

  // D-055: tocar numa opção abre a explicação dela, com a narrativa da persona,
  // e NÃO vota. Só o "Votar nesta" vota.
  const caminhoVotoAna = `salas/${sala}/decisoes/${R}/${E1}/${uids[0]}`;
  const narrativasAbertas = () => cel[0].p.$$eval('[data-detalhe]', (ns) => ns.map((n) => [n.dataset.detalhe, n.querySelector('.opcao-narrativa')?.textContent ?? null]));
  await cel[0].p.evaluate(() => globalThis.scrollTo(0, 0));
  await cel[0].p.click(opcao(OA));
  await cel[0].p.waitForSelector(`[data-detalhe="${OA}"]`);
  assert.deepEqual(await narrativasAbertas(), [[OA, textoE1(R, OA).narrativa]], 'uma opção aberta, com a narrativa da persona');
  assert.equal(await cel[0].p.getAttribute(opcao(OA), 'aria-expanded'), 'true');
  assert.equal(await cel[0].p.textContent(`${opcao(OA)} .opcao-votos`), '0 votos', 'abrir não conta voto');
  await cel[0].p.waitForTimeout(800);
  assert.equal(await administrador('GET', caminhoVotoAna), null, 'tocar na opção não grava voto');
  assert.deepEqual(await cel[0].p.evaluate(() => globalThis.Viracao.aluno.pendentes()), {}, 'tocar na opção não guarda voto no aparelho');
  // Com uma opção aberta, o "Votar nesta" fica à vista (D-055); a medida da
  // tela inteira vai para o log, para quem mexer no conteúdo saber a folga.
  await votarAVista(cel[0], OA);
  {
    const cabe = await cel[0].p.evaluate(() => {
      const aviso = document.querySelector('[data-aviso-rolagem]');
      const limite = aviso && !aviso.hidden ? aviso.getBoundingClientRect().top : innerHeight;
      return [...document.querySelectorAll('.botao-opcao-aluno')].every((b) => b.getBoundingClientRect().bottom <= limite + 1);
    });
    console.log(cabe ? 'Decisão com uma opção aberta: tudo cabe em 360×740.' : 'Decisão com uma opção aberta: passa da dobra em 360×740; o "Votar nesta" fica à vista.');
  }
  await conferirCelular(cel[0], 'decisao-opcao-aberta');
  // Tocar de novo fecha; tocar em outra troca a aberta.
  await cel[0].p.click(opcao(OA));
  await cel[0].p.waitForFunction((o) => !document.querySelector(`[data-detalhe="${o}"]`), OA);
  await cel[0].p.click(opcao(OB));
  await cel[0].p.waitForSelector(`[data-detalhe="${OB}"]`);
  assert.deepEqual(await narrativasAbertas(), [[OB, textoE1(R, OB).narrativa]], 'só uma opção aberta por vez');
  // "Votar nesta" vota; a votada fica marcada; dá para mudar até o fechamento.
  await votarNa(cel[0], OA);
  await temNota(cel[0], /registrado/);
  await votada(cel[0], OA);
  assert.equal(await esperarNoBanco(caminhoVotoAna, OA), OA, '"Votar nesta" grava o voto');
  assert.equal(await cel[0].p.locator(`[data-detalhe="${OA}"] .opcao-votada`).count(), 1, 'a opção votada diz que o voto está nela');
  await votarNa(cel[0], OB);
  await votada(cel[0], OB);
  assert.equal(await esperarNoBanco(caminhoVotoAna, OB), OB, 'mudar o voto com outro "Votar nesta"');
  assert.equal(await cel[0].p.getAttribute(opcao(OA), 'data-meu-voto'), null, 'só a opção votada fica marcada');
  await votarNa(cel[0], OA);
  await votada(cel[0], OA);
  assert.equal(await esperarNoBanco(caminhoVotoAna, OA), OA);
  // A última opção, aberta a partir do topo da tela: ela rola para a vista, e
  // o "Votar nesta" nunca some atrás do aviso fixo.
  const ultimaOp = C.todasOpcoes.at(-1);
  await cel[0].p.evaluate(() => globalThis.scrollTo(0, 0));
  await cel[0].p.click(opcao(ultimaOp));
  await cel[0].p.waitForSelector(`[data-detalhe="${ultimaOp}"]`);
  await votarAVista(cel[0], ultimaOp);
  await conferirCelular(cel[0], 'decisao-ultima-aberta');
  console.log('D-055: tocar abre sem votar; "Votar nesta" vota e muda o voto; o botão fica à vista.');
  // A contagem ao vivo da própria equipe chega ao outro celular da equipe.
  await cel[2].p.waitForFunction((op) => document.querySelector(`[data-opcao="${op}"] .opcao-votos`)?.textContent === '1 voto', OA);
  await votarNa(cel[2], OB);
  await temNota(cel[2], /registrado/);
  await conferirCelular(cel[0], 'decisao-contagem');
  await telao.waitForFunction((eq) => /2 de 2/.test(document.querySelector(`.equipe-status[data-equipe="${eq}"]`)?.textContent || ''), E1, { timeout: 15000 });

  // Caio perde a rede e muda de opção: o voto fica guardado no aparelho.
  const caio = cel[2];
  await caio.ctx.setOffline(true);
  await votarNa(caio, OA);
  await caio.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 1);
  const pendenteCaio = await caio.p.evaluate(() => Object.values(globalThis.Viracao.aluno.pendentes())[0]);
  // Com a janela (abertoEm) da etapa: o reenvio só vale nela (D-037).
  const janela = await telao.evaluate(() => globalThis.Viracao.telao.estado().abertoEm);
  assert.deepEqual({ ...pendenteCaio }, { tipo: 'decisao', rodada: R, equipe: E1, opcao: OA, abertoEm: janela });
  // Enquanto envia, dá para abrir outra opção e ler, mas não votar nela.
  await abrir(caio, OC);
  assert.equal(await caio.p.isDisabled(botaoVotar(OC)), true, '"Votar nesta" desabilitado enquanto envia');
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
  await votarNa(bia, OC);
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
  await votada(bia, OC);
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
  if (C.usandoFixture) assert.ok(resultados[E1].mes.saldoMes < 0 && resultados[E1].depois.renda < 0, 'com a fixture, o mês 1 da equipe 1 não fecha');
  await conferirContaDoMes(cel[0], resultados[E1].mes, 'resultado');
  await conferirDivida(cel[0], resultados[E1].depois.renda, 'resultado');
  // D-052: o custo real da carta. Com a fixture, o mês 1 é sempre o acidente;
  // com o config real, o mês 1 só tem cartas de parada.
  if (C.usandoFixture) {
    const custo = resultados[E1].cartaCusto;
    assert.ok(custo?.diasParado === 20 && custo.gastos > 0 && custo.rendaPerdida > 0, `com a fixture, o acidente tem custo (${JSON.stringify(custo)})`);
  } else {
    assert.ok(resultados[E1].cartaCusto?.diasParado > 0, `com o config real, o mês 1 tira uma carta de parada (${JSON.stringify(resultados[E1].cartaCusto)})`);
  }
  await conferirCartaCusto(cel[0], resultados[E1].cartaCusto, 'resultado');
  {
    // D-054: a decisão no resultado com o texto da persona da equipe.
    const texto = await cel[0].p.textContent('#tela');
    const t = textoE1(R, resultados[E1].decisao);
    for (const x of [t.rotulo, t.narrativa]) if (x) assert.ok(texto.includes(x), `resultado: a decisão com o texto da persona ("${x}")`);
  }
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
  await conferirContaDoMes(cel[0], resultados[E1].mes, 'situação depois da rodada');
  await conferirDivida(cel[0], resultados[E1].depois.renda, 'situação depois da rodada');
  await conferirCartaCusto(cel[0], resultados[E1].cartaCusto, 'situação depois da rodada');
  {
    const t = textoE1(R, resultados[E1].decisao);
    const texto = await cel[0].p.textContent('.mes');
    for (const x of [t.rotulo, t.narrativa]) if (x) assert.ok(texto.includes(x), `situação: o último mês com o texto da persona ("${x}")`);
  }
  await conferirFamilia(cel[0], E1, 'situação depois da rodada');
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
  await mouseNaBorda(300);
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
  await mouseNaBorda(310);
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
  await servirConfig(ctxOutra);
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
  await servirConfig(ctxTerceira);
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
    await mouseNaBorda(320 + Math.random() * 40);
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
  await votarNa(cel[0], P1);
  await temNota(cel[0], /registrado/);
  await votarNa(caio, P2);
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
  await votarNa(cel[0], P2);
  await temNota(cel[0], /registrado/);
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'sorteio', 'sorteio da segunda rodada', 20000);
  const res2 = await administrador('GET', `salas/${sala}/resultados/${R2}`);
  assert.equal(res2[E1].decisao, P2);
  assert.equal(res2[E1].origem, 'prorrogacao');
  assert.equal(res2[E2].origem, 'piloto', 'equipe sem voto: fica o padrão da rodada');
  console.log('Prorrogação: só as empatadas no celular; a outra equipe espera.');

  // A equipe que não votou (D-041; rascunho, seção 7, item 14): "ninguém votou"
  // no resultado do telão e "ninguém votou: ficou o de sempre" no celular, e
  // nunca "piloto automático".
  await avancar();
  await esperarEstado((e) => e.subfase === 'resultado', 'resultado da segunda rodada');
  await telao.waitForFunction((eq) => document.querySelector(`.cartao-resultado[data-equipe="${eq}"]`), E2);
  assert.equal(await telao.textContent(`.cartao-resultado[data-equipe="${E2}"] .resultado-decisao`), 'ninguém votou', 'resultado no telão: a origem da equipe sem voto');
  assert.ok(!/piloto autom/i.test(await telao.textContent('#palco')), 'resultado no telão sem "piloto automático"');
  // O que veio dos meses anteriores (a multa do aluguel, por exemplo), gravado
  // pelo telão e mostrado no celular da equipe (revisão de 29/09, 2ª rodada,
  // achado 10).
  {
    await esperarTela(cel[0], 'resultado');
    const deAntes = listaDe(res2[E1].deAntes);
    const texto = await cel[0].p.evaluate(() => document.querySelector('.conta-de-antes')?.textContent ?? null);
    if (deAntes.length === 0) assert.equal(texto, null, 'sem nada de antes, sem a linha');
    else for (const x of deAntes) assert.ok(texto?.includes(x.rotulo), `o celular diz o que veio de antes ("${x.rotulo}" em "${texto}")`);
    // D-059: com a fixture, o seguro contra acidente do mês 2 paga sempre (o
    // mês 1 é sempre o acidente): a conta e a frase da proteção no celular, e
    // "a proteção pagou" nas contas do telão.
    await conferirContaDoMes(cel[0], res2[E1].mes, 'resultado da segunda rodada');
    const viu = await conferirFraseDaProtecao(cel[0], res2[E1], 'resultado da segunda rodada');
    if (C.usandoFixture) {
      assert.ok(viu && res2[E1].mes.protecao === 500, `com a fixture, a proteção pagou no mês 2 (${JSON.stringify(res2[E1].mes)})`);
      assert.equal(await telao.textContent(`.cartao-resultado[data-equipe="${E1}"] .conta-protecao`), `a\u00a0proteção pagou ${await moedaNa(cel[0], 500)}`, 'o telão diz o que a proteção pagou');
      await conferirCelular(cel[0], 'resultado-protecao');
    }
  }
  const depoisDeR2 = C.passos[(await estado()).indice + 1];
  if (depoisDeR2?.tipo === 'bloco') {
    await avancar();
    await esperarEstado((e) => e.tipo === 'bloco', 'bloco depois da segunda rodada');
    await esperarTela(bia, 'situacao');
    await bia.p.waitForFunction(() => document.querySelector('.mes'));
    assert.match(await bia.p.textContent('.mes'), /\(ninguém votou: ficou o de sempre\)/, 'celular da equipe sem voto: a origem da decisão');
    await conferirCelular(bia, 'situacao-sem-voto');
  }

  // ---------- Placar final no celular: a história da equipe (D-045) ----------
  await pularPara((p) => p.tipo === 'placarFinal', 'placar final');
  await esperarTela(cel[0], 'situacao');
  const resultadosDaSala = await administrador('GET', `salas/${sala}/resultados`);
  await conferirHistoria(cel[0], E1, resultadosDaSala, 'placar final');
  assert.ok(!/piloto autom|efeito das decisões/i.test(await cel[0].p.textContent('#tela')), 'placar final sem "piloto automático" nem "efeito das decisões" (D-041)');
  {
    // "Escolha ou sorte?" (revisão de 29/09): as quatro linhas em reais inteiros,
    // e as três parcelas somam o "Terminaram com" que a tela mostra.
    const reais = (t) => (/^[−-]/.test(t.trim()) ? -1 : 1) * Number(t.replace(/\D/g, ''));
    const lidos = (await cel[0].p.$$eval('.placar-historia dd', (ns) => ns.map((n) => n.textContent))).map(reais);
    const placarE1 = await administrador('GET', `salas/${sala}/placar/${E1}`);
    // D-059: o placar gravado leva o pior caso com e sem a proteção, iguais aos
    // do motor com as decisões e cartas gravadas.
    {
      const jogadas = C.passos.filter((p) => p.tipo === 'rodada' && resultadosDaSala[p.rodada]?.[E1])
        .map((p) => ({ rodadaId: p.rodada, opcaoId: resultadosDaSala[p.rodada][E1].decisao, cartaId: resultadosDaSala[p.rodada][E1].carta }));
      const d = C.decompor(C.cfg, { equipeId: E1, rodadas: jogadas });
      assert.ok(Math.abs(placarE1.piorCaso - d.piorCaso) < 1e-6 && Math.abs(placarE1.piorCasoSemProtecao - d.piorCasoSemProtecao) < 1e-6,
        `placar: pior caso com e sem a proteção (gravado ${placarE1.piorCaso} / ${placarE1.piorCasoSemProtecao}, motor ${d.piorCaso} / ${d.piorCasoSemProtecao})`);
    }
    const c = await cel[0].p.evaluate((p) => globalThis.Viracao.historia.escolhaOuSorte(p), placarE1);
    assert.deepEqual(lidos, [c.piloto, c.escolhas, c.sorte, c.total], 'escolha ou sorte: os valores de historia.escolhaOuSorte');
    assert.equal(lidos[0] + lidos[1] + lidos[2], lidos[3], 'escolha ou sorte: as parcelas somam o total mostrado');
    // Rascunho, seção 7, item 11: os totais sem sinal de variação (nunca "+"),
    // as variações sempre com + ou −, e o total do fim com "=" e em destaque.
    const linhas = await cel[0].p.$$eval('.placar-historia dd', (ns) => ns.map((n) => ({ texto: n.textContent.trim(), total: n.classList.contains('placar-total') })));
    const rotulos = await cel[0].p.$$eval('.placar-historia dt', (ns) => ns.map((n) => n.textContent.trim()));
    assert.deepEqual(rotulos, ['Se não mudassem nada', 'As escolhas', 'A sorte', '= Terminaram com']);
    for (const i of [0, 3]) assert.ok(!linhas[i].texto.startsWith('+'), `o total "${linhas[i].texto}" sem "+"`);
    for (const i of [1, 2]) assert.match(linhas[i].texto, /^[+−]R\$/, `a variação "${linhas[i].texto}" com sinal`);
    assert.ok(linhas[3].total && !linhas[0].total, 'o total do fim em destaque');
    // D-059 (revisão da F5, achado 10): o pior caso também no celular, pela
    // mesma regra do telão (historia.piorCasoDoPlacar): o "sem a proteção" só
    // quando ele é pior que o "com".
    await conferirPiorCasoNoCelular(cel[0], placarE1, resultadosDaSala, 'placar final');
  }
  await conferirCelular(cel[0], 'placar-final');

  // ---------- Enquete "depois" e comparativo pessoal ----------
  await pularPara((p) => p.tipo === 'enquete' && p.momento === 'depois' && p.enquete === C.antes.enquete, 'enquete depois');
  for (const c of cel) await esperarTela(c, 'enquete');
  for (let k = 1; k <= total; k += 1) await responder(cel[0], k === 1 ? 2 : 3, k);
  await esperarTela(cel[0], 'enqueteRegistrada');
  await telao.keyboard.press('Enter');
  await esperarEstado((e) => e.subfase === 'apurada', 'depois apurado');
  await pularPara((p) => p.tipo === 'comparativo', 'comparativo');
  await esperarTela(cel[0], 'comparativo');
  // O comparativo pode abrir antes de a leitura dos votos chegar (celular
  // recarregado no meio da sessão): enquanto isso a tela diz "carregando…",
  // e nunca "sem resposta". O teste espera a leitura, como o aluno esperaria.
  const semLeitura = (c) => c.p.waitForFunction(() => ![...document.querySelectorAll('.resposta-voto')].some((n) => n.textContent.includes('carregando')), null, { timeout: 15000 })
    .catch(async (erro) => {
      const textos = await c.p.$$eval('.resposta-voto', (ns) => ns.map((n) => n.textContent.trim()));
      throw new Error(`o comparativo não terminou de ler os votos: ${JSON.stringify(textos)} (${erro.message})`);
    });
  await semLeitura(cel[0]);
  await semLeitura(bia);
  const linha1 = await cel[0].p.textContent(`.resposta[data-afirmacao="${afirmacoes[0]}"] .resposta-voto`);
  assert.match(linha1, /Você antes: 4 · .+, agora: 2 · /, '"você antes: 4, agora: 2", só no próprio celular');
  const linhaBia = await bia.p.textContent(`.resposta[data-afirmacao="${afirmacoes[0]}"] .resposta-voto`);
  assert.match(linhaBia, /agora: sem resposta/);
  await conferirCelular(cel[0], 'comparativo');

  // ---------- Fim, entrada fechada e sala apagada ----------
  await pularPara((p) => p.tipo === 'fim', 'fim');
  for (const c of cel) await esperarTela(c, 'fim');
  await conferirHistoria(cel[0], E1, resultadosDaSala, 'fim');
  await conferirHistoria(bia, E2, resultadosDaSala, 'fim (outra equipe)');
  await conferirPiorCasoNoCelular(cel[0], await administrador('GET', `salas/${sala}/placar/${E1}`), resultadosDaSala, 'fim');
  await conferirCelular(cel[0], 'fim');
  await mouseNaBorda(360);
  await telao.waitForFunction(() => !document.getElementById('barra').hidden);
  await telao.click('#barra [data-acao="entrada"]');
  await telao.waitForFunction(() => document.querySelector('#barra [data-acao="entrada"]')?.getAttribute('aria-pressed') === 'false');
  const dani = await novoCelular('dani');
  await dani.p.click('[data-acao="entrar"]');
  await esperarTela(dani, 'entradaFechada');
  await conferirCelular(dani, 'entrada-fechada');
  // O apresentador reabre: quem esperava entra sozinho.
  await mouseNaBorda(380);
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
