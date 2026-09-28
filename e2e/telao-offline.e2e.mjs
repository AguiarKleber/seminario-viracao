// O telão por file://, no Playwright, com o Chrome ou o Edge instalados (sem
// baixar navegador): `npm run e2e`. Fica fora do `npm run check` (arquitetura,
// seção 13) porque depende de um navegador na máquina.
//
// O que prova:
// 1. o telão abre pelo arquivo (pendrive), carrega o config.json pelo seletor de
//    arquivo e joga a sessão INTEIRA do roteiro 60min sem celulares, só com o
//    teclado e cliques da barra: contagens manuais nas enquetes e decisões pelo
//    apresentador;
// 2. o placar projetado bate com o motor recalculado aqui no Node, a partir das
//    sementes gravadas (a carta de cada equipe e as três parcelas do placar);
// 3. desfazer e encerrar de novo tira as mesmas cartas; recarregar a página
//    oferece "Retomar a sessão"; "Carregar estado" retoma de um JSON salvo;
// 4. em cada tipo de tela, nenhuma rolagem e nenhum texto abaixo de 28 px no
//    corpo do telão, em 1024×768 e em 1920×1080, com capturas em e2e/capturas/;
// 5. as telas que dependem de celular (QR, "14 de 18 votaram", "2 de 3
//    decidiram", prorrogação, faixa de entrada) desenhadas sobre um canal local
//    com alunos simulados, pelo mesmo ponto de encaixe que o modo online usa.
// As funções passadas a page.evaluate/waitForFunction rodam no navegador, e não
// no Node: os globais delas são os da página.
/* global document, innerWidth, innerHeight, NodeFilter, getComputedStyle, SVGElement, requestAnimationFrame, DataTransfer, DragEvent */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';

const V = await carregarNucleo();
await import(pathToFileURL(join(RAIZ, 'js/ui/formatar.js')).href);
const F = globalThis.Viracao.formatar;

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const URL_TELAO = pathToFileURL(join(RAIZ, 'telao', 'index.html')).href;
const CAMINHO_CONFIG = join(RAIZ, 'config.json');
const TAMANHOS = [[1024, 768], [1920, 1080]];
const MIN_FONTE = 28;

const configNode = (() => {
  const r = V.validarConfig.validarTexto(readFileSync(CAMINHO_CONFIG, 'utf8'));
  assert.ok(r.ok, 'o config.json real precisa ser válido para o e2e');
  return r.config;
})();

// ---------- Navegador ----------

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

const navegador = await abrirNavegador();
const contexto = await navegador.newContext({ viewport: { width: 1024, height: 768 }, acceptDownloads: true });
const page = await contexto.newPage();
const errosDaPagina = [];
page.on('pageerror', (e) => errosDaPagina.push(`pageerror: ${e.message}`));
// Por file://, o fetch do config.json falha sempre (é o caminho previsto: o
// telão pede o arquivo). Esses dois avisos do navegador são esperados; qualquer
// outro erro reprova.
const ERRO_ESPERADO = [/Access to fetch at 'file:.*config\.json'.*CORS/, /Failed to load resource: net::ERR_FAILED/];
page.on('console', (m) => {
  if (m.type() === 'error' && !ERRO_ESPERADO.some((re) => re.test(m.text()))) errosDaPagina.push(`console: ${m.text()}`);
});
const downloads = [];
page.on('download', (d) => downloads.push(d));

rmSync(CAPTURAS, { recursive: true, force: true });
mkdirSync(CAPTURAS, { recursive: true });

// ---------- Ajudantes ----------

const telaAtual = () => page.evaluate(() => document.body.dataset.tela);
const estado = () => page.evaluate(() => globalThis.Viracao.telao.estado());

async function esperarTela(id, timeout = 8000) {
  await page.waitForFunction((t) => document.body.dataset.tela === t, id, { timeout });
}

async function esperarEstado(teste, descricao, timeout = 8000) {
  const inicio = Date.now();
  for (;;) {
    const e = await estado();
    if (e && teste(e)) return e;
    if (Date.now() - inicio > timeout) throw new Error(`Tempo esgotado esperando: ${descricao}. Estado: ${JSON.stringify(e)}`);
    await page.waitForTimeout(50);
  }
}

// O Avançar trava 1,5 s depois de cada uso (proteção contra o passador): o
// teste espera a trava, como faria o apresentador.
let ultimoAvanco = 0;
async function avancar() {
  const falta = 1600 - (Date.now() - ultimoAvanco);
  if (falta > 0) await page.waitForTimeout(falta);
  const antes = await estado();
  await page.keyboard.press('Space');
  ultimoAvanco = Date.now();
  return antes;
}

async function avancarPara(teste, descricao) {
  await avancar();
  return esperarEstado(teste, descricao);
}

// Avança passo a passo (blocos da apresentação no meio) até o estado pedido.
async function avancarAte(teste, descricao, maximo = 6) {
  for (let i = 0; i < maximo; i += 1) {
    const e = await estado();
    if (teste(e)) return e;
    const indice = e.indice;
    const sub = e.subfase;
    await avancar();
    await esperarEstado((x) => x.indice !== indice || x.subfase !== sub, `sair do passo ${indice}`);
  }
  return esperarEstado(teste, descricao);
}

async function mostrarBarra() {
  await page.mouse.move(200 + Math.random() * 50, 300);
  await page.waitForFunction(() => !document.getElementById('barra').hidden);
}

async function clicarBarra(acao) {
  await mostrarBarra();
  await page.click(`#barra [data-acao="${acao}"]`);
}

async function escolherNoModal(textoInicial) {
  await page.waitForFunction(() => document.getElementById('modal').open);
  const botao = page.locator('#modal button').filter({ hasText: textoInicial }).first();
  await botao.click();
}

// As confirmações que cortam a conversa ou desfazem começam com o foco no
// "Cancelar" (revisão da F2, achado 15): confirmar pede Tab e Enter.
async function confirmarModal() {
  await page.waitForFunction(() => document.getElementById('modal').open);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('modal').open);
}

async function carregarConfig() {
  await page.setInputFiles('#arquivo-config', CAMINHO_CONFIG);
  await page.waitForSelector('#hash-config');
}

// Os critérios do visual, medidos no navegador: rolagem da página e o menor
// texto visível no corpo do telão (#palco e faixa de entrada; a barra do
// apresentador e os avisos ficam de fora). Texto de SVG conta com a escala real
// do desenho (getScreenCTM), e não só com o font-size declarado.
async function medir() {
  return page.evaluate((minimo) => {
    const se = document.scrollingElement;
    const rolagem = { vertical: se.scrollHeight > innerHeight + 1, horizontal: se.scrollWidth > innerWidth + 1 };
    const pequenos = [];
    for (const raiz of [document.getElementById('palco'), document.getElementById('faixa')]) {
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
        if (px < minimo - 0.01) pequenos.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} ${px.toFixed(1)}px "${t.textContent.trim().slice(0, 40)}"`);
      }
    }
    const fora = [];
    for (const el of document.querySelectorAll('#palco *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1)) {
        fora.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} (${Math.round(r.right)}, ${Math.round(r.bottom)})`);
      }
    }
    // Texto cortado com reticências (revisão da F2, achado 18: "Ka…" no lugar
    // de "Kauã" no placar resumido): o e2e não via texto truncado.
    const cortados = [];
    for (const el of document.querySelectorAll('#palco *, #faixa *')) {
      if (getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) cortados.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} "${el.textContent.trim().slice(0, 30)}"`);
    }
    return { rolagem, pequenos, fora: fora.slice(0, 6), cortados };
  }, MIN_FONTE);
}

const verificadas = [];
// Em cada tamanho: redesenha, esconde a barra e o aviso, mede, captura.
async function conferirTela(nome, { esperarMs = 0, criterios = true } = {}) {
  for (const [largura, altura] of TAMANHOS) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a, [largura, altura]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (esperarMs) await page.waitForTimeout(esperarMs);
    await page.evaluate(() => {
      document.getElementById('aviso').hidden = true;
    });
    if (!(await page.evaluate(() => document.getElementById('barra').hidden))) await page.keyboard.press('h');
    await page.waitForFunction(() => document.getElementById('barra').hidden || !document.body.classList.contains('em-sessao'));
    const m = await medir();
    await page.screenshot({ path: join(CAPTURAS, `${nome}-${largura}x${altura}.png`) });
    if (criterios) {
      assert.deepEqual(m.rolagem, { vertical: false, horizontal: false }, `${nome} em ${largura}×${altura}: a página rola. Fora da tela: ${m.fora.join('; ')}`);
      assert.deepEqual(m.pequenos, [], `${nome} em ${largura}×${altura}: texto abaixo de ${MIN_FONTE} px`);
      assert.deepEqual(m.fora, [], `${nome} em ${largura}×${altura}: elemento fora da tela`);
      assert.deepEqual(m.cortados, [], `${nome} em ${largura}×${altura}: texto cortado com reticências`);
    }
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => innerWidth === 1024);
  verificadas.push(nome);
}

async function pressionarVezes(tecla, vezes) {
  for (let i = 0; i < vezes; i += 1) await page.keyboard.press(tecla);
}

// Digita a contagem manual de uma afirmação: teclas 1 a 5 somam. Testa também
// o Shift + tecla, que desconta, somando um a mais e tirando em seguida.
async function contarManual(hist) {
  for (let i = 0; i < 5; i += 1) await pressionarVezes(`Digit${i + 1}`, hist[i]);
  await page.keyboard.press('Digit3');
  await page.keyboard.press('Shift+Digit3');
}

async function esperarManual(afirmacao, hist) {
  await esperarEstado((e) => JSON.stringify(e.manual?.[afirmacao]) === JSON.stringify(hist), `contagem manual de ${afirmacao} = ${hist}`);
}

async function lerDownload(download) {
  const caminho = await download.path();
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

async function decidirPelaBarra(numeroENome, letra) {
  await clicarBarra('decidir');
  await escolherNoModal(numeroENome);
  await escolherNoModal(`${letra} ·`);
  await page.waitForFunction(() => !document.getElementById('modal').open);
}

// ---------- Parte 1: sessão inteira sem celulares ----------

console.log('Parte 1: sessão inteira do roteiro 60min, sem celulares');
await page.goto(URL_TELAO);
await esperarTela('abertura');
// O botão offline está lá desde a primeira pintura, mesmo antes do config.
assert.equal(await page.locator('button', { hasText: 'Começar sem celulares' }).count(), 1);

// Config com problema: a lista INTEIRA aparece e a sala não pode ser criada.
await page.setInputFiles('#arquivo-config', join(RAIZ, 'test', 'fixtures', 'config-json-quebrado.json'));
await page.waitForSelector('#erros-config');
assert.match(await page.textContent('#erros-config'), /JSON inválido/);
assert.equal(await page.isDisabled('[data-acao="comecar-offline"]'), true, 'config quebrado não cria sala');
const brutoComErros = JSON.parse(readFileSync(CAMINHO_CONFIG, 'utf8'));
brutoComErros.cartas[0].peso = -1;
brutoComErros.equipes[1].persona = 'ninguem';
brutoComErros.cartas[1].efeitos = [{ 'soma ': { renda: 1 } }]; // a chave com espaço
const esperadosNoValidador = V.validarConfig.validar(brutoComErros).erros.length;
await page.setInputFiles('#arquivo-config', { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(brutoComErros)) });
await page.waitForFunction((n) => document.querySelectorAll('#erros-config li').length === n, esperadosNoValidador);
assert.ok(esperadosNoValidador >= 3, 'os três problemas plantados aparecem juntos');
await conferirTela('abertura-com-erros', { criterios: false });

// Arrastar o arquivo para a janela também carrega o config (seção 11).
await page.evaluate((texto) => {
  const dt = new DataTransfer();
  dt.items.add(new File([texto], 'config.json', { type: 'application/json' }));
  document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, readFileSync(CAMINHO_CONFIG, 'utf8'));
await page.waitForSelector('#hash-config');
// E o seletor de arquivo, de novo, com o config real.
await carregarConfig();
const hashNaTela = await page.textContent('#hash-config');
assert.equal(hashNaTela, V.validarConfig.hash(configNode), 'o telão mostra o hash do config carregado');
// Por file:// o botão do modo com celulares nem aparece.
assert.equal(await page.locator('[data-acao="criar-online"]').count(), 0);
await conferirTela('abertura', { criterios: false });
await page.check('input[name="roteiro"][value="60min"]');
await page.click('[data-acao="comecar-offline"]');
await esperarTela('lobby');
await conferirTela('lobby-offline');

// Revisão da F2, achado 26: offline também há uma aba escritora só. Outra aba do
// mesmo navegador oferece "Retomar", mas a trava recusa; antes, as duas gravavam
// a árvore inteira no mesmo localStorage e uma apagava as apurações da outra.
{
  const aba2 = await contexto.newPage();
  aba2.on('pageerror', (e) => errosDaPagina.push(`aba 2 pageerror: ${e.message}`));
  await aba2.goto(URL_TELAO);
  await aba2.setInputFiles('#arquivo-config', CAMINHO_CONFIG);
  await aba2.waitForSelector('#bloco-retomar');
  await aba2.click('[data-acao="retomar"]');
  await aba2.waitForFunction(() => /aberta em outra aba/.test(document.getElementById('aviso')?.textContent || ''));
  assert.equal(await aba2.evaluate(() => document.body.dataset.tela), 'abertura', 'a segunda aba não liga a sessão');
  await aba2.close();
}

// ← e PageUp (o "voltar" do passador) não fazem nada.
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('PageUp');
await page.waitForTimeout(200);
assert.equal((await estado()).indice, 0);

// Enquete "antes" (modo "todas", revelada só no comparativo)
await avancarPara((e) => e.tipo === 'enquete' && e.momento === 'antes', 'enquete antes');
const contagens = {
  antes: { a1: [3, 5, 2, 4, 1], a2: [1, 2, 3, 6, 3], a3: [4, 4, 3, 2, 2] },
  unico: { t1: [1, 1, 3, 6, 4], t2: [5, 4, 3, 2, 1], t3: [6, 5, 2, 1, 1] },
  depois: { a1: [5, 5, 2, 2, 1], a2: [4, 4, 3, 3, 1], a3: [1, 2, 3, 5, 4] },
};
for (const [i, a] of ['a1', 'a2', 'a3'].entries()) {
  if (i > 0) await page.keyboard.press('ArrowDown');
  await contarManual(contagens.antes[a]);
  await esperarManual(a, contagens.antes[a]);
  if (i === 0) {
    await conferirTela('enquete-votando-contadores');
    // Revisão da F2, achado 11: Enter com afirmações sem contagem pede
    // confirmação, com o foco no "Cancelar"; um segundo Enter cancela.
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('modal').open && /afirmações 2, 3 estão sem contagem/.test(document.getElementById('modal').textContent));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('modal').open);
    assert.equal((await estado()).subfase, 'votando', 'o Enter com afirmações zeradas não encerra sem confirmação');
  }
}
// Sem gráfico no "antes" pareado (D-011).
assert.equal(await page.locator('#palco svg.grafico-svg').count(), 0, 'o "antes" não mostra gráfico');
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'enquete antes apurada');
await esperarTela('enquete-apurada');
await conferirTela('enquete-apurada-escondida');

// Blocos, formação das equipes e personas
await avancarPara((e) => e.tipo === 'bloco' && e.indice === 2, 'bloco 1');
await conferirTela('bloco');
await avancarPara((e) => e.indice === 3, 'bloco 2');
await avancarPara((e) => e.tipo === 'formarEquipes', 'formar equipes');
await esperarEstado((e) => Object.keys(e.equipesAbertas || {}).length === 6, 'todas as equipes abertas');
await page.keyboard.press('Digit6'); // fecha a equipe 6
await esperarEstado((e) => !e.equipesAbertas.e6 && Object.keys(e.equipesAbertas).length === 5, 'equipe 6 fechada');
// A obrigatória não fecha.
await page.keyboard.press('Digit1');
await page.waitForTimeout(300);
assert.equal((await estado()).equipesAbertas.e1, true, 'a equipe obrigatória continua aberta');
await conferirTela('formar-equipes');
await avancarPara((e) => e.tipo === 'personas' && e.equipesTravadas === true, 'personas');
await conferirTela('personas');
await avancarPara((e) => e.tipo === 'bloco' && e.indice === 6, 'bloco com placar');
await conferirTela('bloco-com-placar');

// As três rodadas, decididas pelo apresentador pela barra
const plano = {
  r1: { e1: 'a', e2: 'b', e3: 'c', e4: 'a' }, // e5 fica no piloto automático
  r2: { e1: 'b', e2: 'c', e3: 'a', e4: 'b', e5: 'c' },
  r3: { e1: 'c', e2: 'a', e3: 'b', e4: 'c' },
};
const nomes = Object.fromEntries(Object.values(configNode.equipes).map((eq, i) => [eq.id, `${i + 1} ${eq.nome}`]));
const letraDe = (r, op) => 'ABC'[configNode.rodadas[r].ordemOpcoes.indexOf(op)];
let cartasR1 = null;
let downloadsAntesR = downloads.length;

for (const r of ['r1', 'r2', 'r3']) {
  await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `rodada ${r}`);
  for (const [eq, op] of Object.entries(plano[r])) await decidirPelaBarra(nomes[eq], letraDe(r, op));
  await esperarEstado((e) => Object.keys(e.forcadas || {}).length === Object.keys(plano[r]).length, `decisões de ${r} gravadas`);
  if (r === 'r1') {
    await conferirTela('rodada-decidindo');
    // A barra do apresentador, para revisão visual (fica fora dos critérios do
    // corpo do telão: é do apresentador, e some sozinha).
    await mostrarBarra();
    await page.screenshot({ path: join(CAPTURAS, 'barra-do-apresentador-1024x768.png') });
    assert.match(await page.textContent('[data-barra-passo]'), /^passo 8 de 19 · /);
  }
  if (r === 'r1') {
    // Revisão da F2, achado 15: Enter duplo não corta a conversa. O modal abre
    // com o foco no "Cancelar", e o segundo Enter cancela.
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('modal').open);
    assert.equal((await estado()).subfase, 'decidindo', 'Enter duplo não encerra a decisão no tempo mínimo');
  }
  // Enter antes do tempo mínimo de conversa pede confirmação.
  const baixadosAntes = downloads.length;
  await page.keyboard.press('Enter');
  await confirmarModal();
  await esperarEstado((e) => e.subfase === 'sorteio', `sorteio de ${r}`);
  await esperarTela('rodada-sorteio');
  if (r === 'r1') {
    // Achado 8: o contorno da fatia sorteada só aparece quando os ponteiros param.
    const contorno = () => page.evaluate(() => getComputedStyle(document.querySelector('.fatia-sorteada')).stroke);
    assert.match(await contorno(), /rgba\(0, 0, 0, 0\)|transparent|none/, 'a fatia sorteada não aparece contornada antes da parada');
    const linhas = await page.locator('.linha-rotulo-sorteio').count();
    assert.equal(await page.locator('.linha-graves').count(), linhas, 'cada equipe mostra a chance de carta grave');
    assert.ok((await page.locator('.linha-graves').allTextContents()).every((x) => /^cartas graves \d+%$/.test(x)));
    await page.waitForTimeout(3000);
    assert.equal(await contorno(), 'rgb(242, 242, 242)', 'contornada depois que os ponteiros param');
    // Achado 9: o salvamento automático não cobre o título com um aviso.
    for (let k = 0; k < 40 && downloads.length <= baixadosAntes; k += 1) await page.waitForTimeout(50);
    assert.ok(downloads.length > baixadosAntes, 'o JSON automático foi baixado');
    const aviso = await page.evaluate(() => ({ visivel: !document.getElementById('aviso').hidden, texto: document.getElementById('aviso').textContent }));
    assert.ok(!(aviso.visivel && /automaticamente/.test(aviso.texto)), `o salvamento automático não avisa na tela: "${aviso.texto}"`);
    assert.match(await page.textContent('[data-barra-salvo]'), /^estado salvo às \d{2}:\d{2} \(r1\)$/);
    await conferirTela('rodada-sorteio', { esperarMs: 3200 });
  }
  await avancarPara((e) => e.subfase === 'resultado', `resultado de ${r}`);
  await esperarTela('rodada-resultado');
  if (r === 'r1') {
    await conferirTela('rodada-resultado', { esperarMs: 900 });
    cartasR1 = await page.evaluate(() => Array.from(document.querySelectorAll('.cartao-resultado'), (c) => `${c.dataset.equipe}:${c.dataset.carta}`));
    // Desfazer (Ctrl+Z, com confirmação) e encerrar de novo: mesmas cartas.
    await page.keyboard.press('Control+z');
    await confirmarModal();
    await esperarEstado((e) => e.subfase === 'decidindo' && Object.keys(e.forcadas || {}).length === 4, 'r1 reaberta com as decisões');
    await page.keyboard.press('Enter');
    await confirmarModal();
    await esperarEstado((e) => e.subfase === 'sorteio', 'sorteio de r1 de novo');
    await avancarPara((e) => e.subfase === 'resultado', 'resultado de r1 de novo');
    await esperarTela('rodada-resultado');
    const cartasDeNovo = await page.evaluate(() => Array.from(document.querySelectorAll('.cartao-resultado'), (c) => `${c.dataset.equipe}:${c.dataset.carta}`));
    assert.deepEqual(cartasDeNovo, cartasR1, 'desfazer e encerrar de novo tira as mesmas cartas (semente gravada)');

    // Recarregar a página: o telão oferece retomar a sessão guardada.
    await page.reload();
    await esperarTela('abertura');
    await carregarConfig();
    await page.waitForSelector('#bloco-retomar');
    assert.match(await page.textContent('#bloco-retomar'), /Retomar a sessão de \d{2}\/\d{2}, \d{2}:\d{2}\?/);
    await page.click('[data-acao="retomar"]');
    await esperarTela('rodada-resultado');
    ultimoAvanco = 0;
  }
  await page.waitForTimeout(300);
}
// D-015: um download automático do estado ao fim de cada rodada (4 apurações:
// r1, r1 refeita, r2 e r3).
await page.waitForTimeout(500);
const automaticos = downloads.slice(downloadsAntesR).filter((d) => /viracao-estado-.*-r[123]-/.test(d.suggestedFilename()));
assert.equal(automaticos.length, 4, `um JSON automático por apuração de rodada (vieram ${automaticos.length})`);

// Placar final: C troca o critério, e o interruptor "sem vencedor"
await avancarAte((e) => e.tipo === 'placarFinal', 'placar final');
await esperarTela('placar-final');
await conferirTela('placar-final');

// Revisão da F2, achado 7: na cascata, nenhum rótulo cruza outro e nenhum
// segmento cobre outro (antes, o efeito das decisões sumia sob a sorte).
async function conferirCascata() {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('.grafico-placar svg');
    const caixas = (sel) => Array.from(svg.querySelectorAll(sel), (n) => n.getBoundingClientRect());
    const cruza = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const pares = (lista) => {
      const ruins = [];
      for (let i = 0; i < lista.length; i += 1) for (let j = i + 1; j < lista.length; j += 1) if (cruza(lista[i], lista[j]) > 1) ruins.push([i, j]);
      return ruins;
    };
    const textos = caixas('text');
    const segmentos = caixas('rect[data-segmento]');
    return { textos: textos.length, segmentos: segmentos.length, textosCruzados: pares(textos), segmentosCruzados: pares(segmentos) };
  });
  assert.deepEqual(r.textosCruzados, [], 'rótulos do placar se cruzam');
  assert.deepEqual(r.segmentosCruzados, [], 'segmentos do placar se cobrem');
  assert.equal(r.textos, 3 * 5, 'três números por equipe (piloto, decisões e sorte)');
  return r;
}
await conferirCascata();
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForFunction(() => innerWidth === 1920);
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await conferirCascata();
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForFunction(() => innerWidth === 1024);
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
// Achado 20: a referência com persona só atravessa as linhas dessa persona.
const referencia = await page.evaluate(() => {
  const svg = globalThis.Viracao.graficos.cascata({
    largura: 600, altura: 300, fonte: 28, dominio: [-1000, 1000],
    linhas: [0, 1, 2].map(() => ({ fim: 100, segmentos: [{ de: 0, ate: 100, estilo: 'piloto', rotulo: 'R$ 100' }] })),
    referencias: [{ id: 'clt', valor: 500, linhas: [1] }, { id: 'todas', valor: -500 }],
  });
  return Array.from(svg.querySelectorAll('line.referencia'), (l) => `${l.dataset.referencia}:${l.dataset.linha}`);
});
assert.deepEqual(referencia, ['clt:1', 'todas:0', 'todas:1', 'todas:2'], 'a referência da persona só na linha dela; sem persona, em todas');
const placarNaTela = {};
for (const criterio of ['efeitoDecisoes', 'renda', 'sorte', 'piorCaso', 'energia', 'protecao']) {
  const atual = await page.getAttribute('.criterio', 'data-criterio');
  assert.equal(atual, criterio, 'a tecla C percorre os critérios na ordem');
  placarNaTela[criterio] = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('.valor-criterio'), (v) => [v.dataset.equipe, v.textContent])));
  if (criterio === 'renda') await conferirTela('placar-final-saldo');
  if (criterio === 'energia') await conferirTela('placar-final-energia');
  await page.keyboard.press('c');
  await page.waitForTimeout(150);
}
await clicarBarra('semVencedor');
await page.waitForFunction(() => document.querySelector('.criterio')?.textContent.includes('Sem vencedor'));
await conferirTela('placar-final-sem-vencedor');
await page.keyboard.press('v');
await page.waitForFunction(() => !document.querySelector('.criterio')?.textContent.includes('Sem vencedor'));

// Termômetro (uma afirmação por vez, ao vivo) e a enquete "depois"
// Qual termômetro e quais afirmações saem do roteiro do config, e não de um id
// escrito aqui: com a D-032, o roteiro de 60 min passou a usar o
// "termometro_curto" (t1 e t3), e o teste parou no termômetro de 3 afirmações.
const passoTermometro = configNode.roteiros['60min'].find((p) => p.tipo === 'enquete' && p.momento === 'unico');
const afirmacoesTermometro = configNode.enquetes[passoTermometro.enquete].ordemAfirmacoes;
assert.ok(afirmacoesTermometro.every((t) => contagens.unico[t]), `há contagem de teste para cada afirmação do termômetro (${afirmacoesTermometro.join(', ')})`);
await avancarPara((e) => e.tipo === 'enquete' && e.enquete === passoTermometro.enquete, 'termômetro');
for (const [i, t] of afirmacoesTermometro.entries()) {
  if (i > 0) await avancarPara((e) => e.afirmacao === t, `termômetro ${t}`);
  await contarManual(contagens.unico[t]);
  await esperarManual(t, contagens.unico[t]);
  if (i === 0) await conferirTela('termometro-ao-vivo');
}
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'termômetro apurado');
await esperarTela('enquete-apurada');
await conferirTela('termometro-apurado');

await avancarPara((e) => e.tipo === 'enquete' && e.momento === 'depois', 'enquete depois');
// Achado 11: no modo "todas", o Espaço vai para a próxima afirmação (como no
// termômetro); na última, ele avisa que o Enter encerra a enquete inteira.
for (const [i, a] of ['a1', 'a2', 'a3'].entries()) {
  if (i > 0) {
    await avancar();
    await page.waitForFunction((k) => document.querySelector('.kicker')?.textContent.includes(`afirmação ${k} de 3`), i + 1);
  }
  await contarManual(contagens.depois[a]);
  await esperarManual(a, contagens.depois[a]);
}
await avancar();
await page.waitForFunction(() => /última afirmação: Enter encerra a enquete inteira/.test(document.getElementById('aviso')?.textContent || ''));
assert.equal((await estado()).subfase, 'votando', 'o Espaço na última afirmação não encerra nem avança');
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'depois apurado');

// Comparativo: mão levantada dos dois lados → sem pareamento, lado a lado
await avancarPara((e) => e.tipo === 'comparativo', 'comparativo');
await esperarTela('comparativo');
assert.equal(await page.getAttribute('.tela-comparativo', 'data-caso'), 'sem_pareamento');
await conferirTela('comparativo-lado-a-lado');
for (const n of [2, 3]) {
  await avancar();
  await page.waitForFunction((k) => document.querySelector('.kicker')?.textContent.includes(`afirmação ${k} de 3`), n);
}
await avancarPara((e) => e.tipo === 'bloco', 'bloco final');
await avancarPara((e) => e.tipo === 'fim', 'fim');
await esperarTela('fim');
await conferirTela('fim');

// Exportar totais: só agregados, sem nenhum uid
let esperaDownload = page.waitForEvent('download');
await page.click('[data-acao="exportar"]');
const totais = await lerDownload(await esperaDownload);
assert.equal(totais.roteiro, '60min');
assert.ok(!JSON.stringify(totais).includes('apresentador-local'), 'a exportação não leva uid');
assert.deepEqual(totais.enquetes.entrada.antes.histogramas.a1, contagens.antes.a1);
assert.equal(totais.enquetes.entrada.antes.metodo, 'manual');

// Salvar estado (barra) e conferir o placar contra o motor, no Node
esperaDownload = page.waitForEvent('download');
await clicarBarra('salvar');
const salvo = await lerDownload(await esperaDownload);
assert.equal(salvo.formato, 'viracao-estado');
for (const k of ['votosEnquete', 'decisoes', 'presenca', 'membros']) assert.ok(!(k in salvo.dados), `o estado salvo não leva ${k}`);
const { sementes, resultados, placar } = salvo.dados;
const ativas = ['e1', 'e2', 'e3', 'e4', 'e5'];
const estadoNode = Object.fromEntries(ativas.map((eq) => [eq, V.motor.estadoInicial(configNode, eq)]));
const jogadas = Object.fromEntries(ativas.map((eq) => [eq, []]));
for (const r of ['r1', 'r2', 'r3']) {
  for (const eq of ativas) {
    const opcao = plano[r][eq] ?? configNode.rodadas[r].padrao;
    const res = V.motor.resolverRodada(configNode, { equipeId: eq, rodadaId: r, opcaoId: opcao, estado: estadoNode[eq], semente: sementes[r] });
    assert.equal(resultados[r][eq].decisao, opcao, `${r}/${eq}: decisão`);
    assert.equal(resultados[r][eq].origem, plano[r][eq] ? 'apresentador' : 'piloto', `${r}/${eq}: origem`);
    assert.equal(resultados[r][eq].carta, res.carta, `${r}/${eq}: a carta sai da semente gravada`);
    assert.deepEqual(resultados[r][eq].depois, res.depois, `${r}/${eq}: indicadores depois da rodada`);
    estadoNode[eq] = res.depois;
    jogadas[eq].push({ rodadaId: r, opcaoId: opcao, cartaId: res.carta });
  }
}
assert.equal(placar.e6.ativa, false, 'a equipe fechada não joga');
for (const eq of ativas) {
  const d = V.motor.decompor(configNode, { equipeId: eq, rodadas: jogadas[eq] });
  const p = placar[eq];
  for (const [campo, esperado] of [['renda', d.realizado], ['piloto', d.esperadoPiloto], ['efeitoDecisoes', d.efeitoDecisoes], ['sorte', d.sorte], ['piorCaso', d.piorCaso]]) {
    assert.ok(Math.abs(p[campo] - esperado) < 1e-6, `${eq}.${campo}: gravado ${p[campo]}, motor ${esperado}`);
  }
  // O que foi projetado é o que o motor calcula.
  assert.equal(placarNaTela.renda[eq], F.moeda(d.realizado), `${eq}: saldo projetado`);
  assert.equal(placarNaTela.efeitoDecisoes[eq], F.moeda(d.efeitoDecisoes, { sinal: true }), `${eq}: efeito das decisões projetado`);
  assert.equal(placarNaTela.sorte[eq], F.moeda(d.sorte, { sinal: true }), `${eq}: sorte projetada`);
  assert.equal(placarNaTela.piorCaso[eq], F.moeda(d.piorCaso), `${eq}: pior caso projetado`);
  assert.equal(placarNaTela.energia[eq], F.inteiro(estadoNode[eq].energia), `${eq}: energia projetada`);
}

// Apagar a sala (segurar 2 s): volta à abertura e limpa o navegador
const chave = await page.evaluate(() => globalThis.Viracao.telao.chaveSessao(globalThis.Viracao.telao.sala()));
const apagar = page.locator('[data-acao="apagar"]');
await apagar.click(); // clique curto não apaga
await page.waitForTimeout(300);
assert.equal(await telaAtual(), 'fim', 'um clique curto não apaga a sala');
const caixa = await apagar.boundingBox();
await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
await page.mouse.down();
await page.waitForTimeout(2300);
await page.mouse.up();
await esperarTela('abertura');
assert.equal(await page.evaluate((k) => localStorage.getItem(k), chave), null, 'a sala sai do localStorage');

// Carregar estado: o JSON salvo retoma a sessão onde parou
const caminhoSalvo = join(RAIZ, 'e2e', 'capturas', 'estado-salvo.json');
await (await downloads.filter((d) => /-manual-/.test(d.suggestedFilename())).at(-1)).saveAs(caminhoSalvo);
await page.setInputFiles('#arquivo-estado', caminhoSalvo);
await esperarTela('fim');
assert.equal((await estado()).tipo, 'fim');
const caixa2 = await page.locator('[data-acao="apagar"]').boundingBox();
await page.mouse.move(caixa2.x + caixa2.width / 2, caixa2.y + caixa2.height / 2);
await page.mouse.down();
await page.waitForTimeout(2300);
await page.mouse.up();
await esperarTela('abertura');

// ---------- Parte 2: as telas com celulares, sobre alunos simulados ----------

console.log('Parte 2: telas com celulares (alunos simulados num canal local)');
// O mesmo ponto de encaixe que o modo online vai usar (ligarSessao com um
// canal pronto). O canal local imita as regras do banco, e cada "aluno" é uma
// visão autenticada como outro uid.
await page.evaluate(async () => {
  const V2 = globalThis.Viracao;
  // Relógio parado: a regra exige presença e entrada com a hora exata do
  // servidor, e com Date.now o milissegundo pode virar entre o marcador e a
  // gravação.
  const agoraFixo = Date.now();
  const canal = V2.canalLocal.criar({ relogio: () => agoraFixo });
  globalThis.__canalTeste = canal;
  await V2.telao.ligarSessao({ modo: 'online', canal, sala: 'K7Q2', nomeRoteiro: '60min', criar: true });
  const base = 'salas/K7Q2';
  globalThis.__alunos = [];
  for (let i = 0; i < 14; i += 1) {
    const uid = `aluno-${String(i).padStart(2, '0')}`;
    const c = canal.comoUsuario(uid);
    await c.gravar({ [`${base}/membros/${uid}`]: { entrouEm: c.marcadorDeHora() } });
    await c.gravar({ [`${base}/presenca/${uid}`]: c.marcadorDeHora() });
    globalThis.__alunos.push({ uid, c });
  }
});
await esperarTela('lobby');
await page.waitForFunction(() => document.querySelector('.lobby-conectados b')?.textContent === '14');
// Controle de inativos (arquitetura, seção 10): "N ativos / M membros", discreto
// no lobby e na barra do apresentador. O sumiço e o "Remover inativos" são
// provados contra o emulador, no e2e:online (aqui o relógio do canal é fixo).
assert.equal(await page.textContent('.lobby [data-contagem-ativos]'), '14 ativos / 14 membros');
assert.equal(await page.textContent('#barra [data-contagem-ativos]'), '14 ativos / 14 membros');
assert.equal(await page.locator('#barra [data-acao="removerInativos"]').count(), 1, 'a barra tem o "Remover inativos"');
assert.match(await page.textContent('.lobby-url'), /\/aluno\/\?sala=K7Q2$/, 'a URL do QR termina em /aluno/?sala=XXXX');
assert.ok(await page.evaluate(() => document.querySelector('.lobby-qr svg path')?.getAttribute('d').length > 1000), 'o QR foi desenhado');
await conferirTela('lobby-com-celulares');

await avancarPara((e) => e.tipo === 'enquete' && e.momento === 'antes', 'enquete antes (celulares)');
await page.evaluate(async () => {
  const e = globalThis.Viracao.telao.estado();
  for (const [i, { uid, c }] of globalThis.__alunos.entries()) {
    if (i >= 11) break; // 3 não votam
    for (const a of ['a1', 'a2', 'a3']) await c.gravar({ [`salas/K7Q2/votosEnquete/${e.enquete}/${e.momento}/${a}/${uid}`]: 1 + (i % 5) });
  }
});
await page.waitForFunction(() => /11\s*de 14 votaram/.test(document.querySelector('.enquete-status')?.textContent || ''));
assert.equal(await page.locator('#faixa').isVisible(), true, 'a faixa de entrada aparece com a entrada aberta');
await conferirTela('enquete-votando-celulares');
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'antes apurado (celulares)');

// "Pular para…" pela barra, direto à formação das equipes
await clicarBarra('pular');
await escolherNoModal('5. Formação das equipes');
await esperarEstado((e) => e.tipo === 'formarEquipes', 'formar equipes (celulares)');
await page.evaluate(async () => {
  const eqs = ['e1', 'e1', 'e1', 'e2', 'e2', 'e3', 'e3', 'e3', 'e4', 'e4', 'e5', 'e5', 'e6'];
  for (const [i, { uid, c }] of globalThis.__alunos.entries()) {
    if (i < eqs.length) await c.gravar({ [`salas/K7Q2/membros/${uid}/equipe`]: eqs[i] });
  }
});
await page.waitForFunction(() => /1 pessoa sem equipe/.test(document.querySelector('.formar-status')?.textContent || ''));
await conferirTela('formar-equipes-celulares');
await avancarPara((e) => e.tipo === 'personas', 'personas (celulares)');
await clicarBarra('pular');
await escolherNoModal('8. ');
await esperarEstado((e) => e.tipo === 'rodada' && e.subfase === 'decidindo', 'rodada r1 (celulares)');
// e1: 2 × 1 (maioria), e2: 1 × 1 (empate → prorrogação), e3: 3 votos, e4 sem voto
await page.evaluate(async () => {
  const votos = { 'aluno-00': 'a', 'aluno-01': 'a', 'aluno-02': 'b', 'aluno-03': 'a', 'aluno-04': 'b', 'aluno-05': 'c', 'aluno-06': 'c', 'aluno-07': 'c' };
  const membros = await globalThis.__canalTeste.comoUsuario('aluno-00').ler('salas/K7Q2/membros');
  for (const { uid, c } of globalThis.__alunos) {
    if (votos[uid]) await c.gravar({ [`salas/K7Q2/decisoes/r1/${membros[uid].equipe}/${uid}`]: votos[uid] });
  }
});
await page.waitForFunction(() => /3 de 3/.test(document.querySelector('.equipe-status[data-equipe="e1"]')?.textContent || ''));
await conferirTela('rodada-decidindo-celulares');
await page.keyboard.press('Enter');
await confirmarModal();
await esperarEstado((e) => e.subfase === 'prorrogacao' && e.empatadas?.e2, 'prorrogação da e2');
await esperarTela('rodada-prorrogacao');
await conferirTela('rodada-prorrogacao');
// Com "reduzir movimento" no sistema, o sorteio aparece parado, já no fim.
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'sorteio', 'sorteio depois da moeda');
await esperarTela('rodada-sorteio');
assert.equal(await page.locator('.ponteiro-animado, .revelar-apos').count(), 0, 'sem animação com prefers-reduced-motion');
assert.ok(await page.locator('.ponteiro').count() > 0, 'os ponteiros aparecem já parados');
await page.emulateMedia({ reducedMotion: 'no-preference' });
const origemE2 = await page.evaluate(() => globalThis.__canalTeste.ler('salas/K7Q2/resultados/r1/e2/origem'));
assert.equal(origemE2, 'moeda', 'empate que continua na prorrogação vai para a moeda');
await avancarPara((e) => e.subfase === 'resultado', 'resultado (celulares)');
await esperarTela('rodada-resultado');
await conferirTela('rodada-resultado-celulares');
await page.evaluate(() => globalThis.Viracao.telao.estado());

// ---------- Parte 3: seguir sem celulares no meio de uma enquete ----------

console.log('Parte 3: "Continuar sem celulares" no meio de uma enquete com votos de celular');
// Revisão da F2, achados 27 e 30: a tela offline diz quantos votaram pelo
// celular antes da queda, a primeira contagem à mão pede confirmação (ela
// substitui esses votos), e a árvore guardada no navegador perde a presença e
// os votos que o offline não usa mais.
const SALA3 = 'M3Q2';
await page.evaluate(async (sala) => {
  const V2 = globalThis.Viracao;
  const agoraFixo = Date.now();
  const canal = V2.canalLocal.criar({ relogio: () => agoraFixo });
  await V2.telao.ligarSessao({ modo: 'online', canal, sala, nomeRoteiro: '60min', criar: true });
  globalThis.__alunos3 = [];
  for (let i = 0; i < 4; i += 1) {
    const uid = `p3-${i}`;
    const c = canal.comoUsuario(uid);
    await c.gravar({ [`salas/${sala}/membros/${uid}`]: { entrouEm: c.marcadorDeHora() } });
    await c.gravar({ [`salas/${sala}/presenca/${uid}`]: c.marcadorDeHora() });
    globalThis.__alunos3.push({ uid, c });
  }
}, SALA3);
await esperarTela('lobby');
await avancarPara((e) => e.tipo === 'enquete' && e.momento === 'antes', 'enquete antes (parte 3)');
await page.evaluate(async (sala) => {
  const e = globalThis.Viracao.telao.estado();
  for (const [i, { uid, c }] of globalThis.__alunos3.entries()) {
    if (i === 3) break; // um não vota
    for (const a of ['a1', 'a2', 'a3']) await c.gravar({ [`salas/${sala}/votosEnquete/${e.enquete}/${e.momento}/${a}/${uid}`]: 2 + i });
  }
}, SALA3);
await page.waitForFunction(() => /3\s*de 4 votaram/.test(document.querySelector('.enquete-status')?.textContent || ''));
await mostrarBarra();
const semCelulares = page.locator('#barra [data-acao="semCelulares"]');
await semCelulares.hover();
await page.mouse.down();
await page.waitForTimeout(2400);
await page.mouse.up();
await page.waitForFunction(() => globalThis.Viracao.telao.modo() === 'offline');
await page.waitForFunction(() => document.querySelector('.aviso-celulares')?.dataset.votosCelular === '3');
// O prefixo do localStorage leva a versão do app: lida da página, e não
// escrita aqui, para o teste não reprovar quando o bin/versao.mjs subir a versão.
const chave3 = `viracao:telao:v${await page.evaluate(() => globalThis.Viracao.telao.versaoApp)}:sala:${SALA3}`;
const guardada3 = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), chave3);
let arvore3 = (await guardada3()).salas[SALA3];
assert.equal(arvore3.presenca, undefined, 'a presença não vai para a árvore guardada no navegador');
assert.equal(Object.keys(arvore3.votosEnquete.entrada.antes.a1).length, 3, 'os votos da enquete aberta ficam: o encerrar ainda os apura');
// A primeira contagem à mão pede confirmação, com o foco no "Cancelar".
await page.keyboard.press('Digit3');
await page.waitForFunction(() => document.getElementById('modal').open && /3 aparelhos votaram pelo celular/.test(document.getElementById('modal').textContent));
await page.keyboard.press('Enter');
await page.waitForFunction(() => !document.getElementById('modal').open);
assert.equal((await estado()).manual, undefined, 'cancelar não cria contagem à mão');
// Enter apura os votos de celular que a tela mostrou.
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'antes apurado com os votos de celular');
arvore3 = (await guardada3()).salas[SALA3];
assert.equal(arvore3.enquetes.entrada.antes.metodo, 'celular');
assert.equal(arvore3.enquetes.entrada.antes.n.a1, 3);
// Saindo do passo, os votos individuais saem da árvore local.
await avancarPara((e) => e.tipo === 'bloco', 'bloco depois da enquete (parte 3)');
await page.waitForFunction((k) => !JSON.parse(localStorage.getItem(k)).salas.M3Q2.votosEnquete, chave3);

// ---------- Fim ----------

// A versão que o telão carregado diz ter (a constante VERSAO_APP do
// js/telao.js), lida antes de a página sair do telão: é contra ela que os ?v=
// das tags são conferidos lá embaixo.
const versaoApp = await page.evaluate(() => globalThis.Viracao.telao.versaoApp);
assert.match(versaoApp, /^\d+$/, 'a versaoApp é um inteiro, como o bin/versao.mjs espera');

// A página de entrada repassa só um código de sala válido para o celular.
await page.goto(`${pathToFileURL(join(RAIZ, 'index.html')).href}?sala=k7q2&lp=1`);
assert.equal(await page.getAttribute('#ir-aluno', 'href'), 'aluno/index.html?sala=K7Q2&lp=1');
await page.goto(`${pathToFileURL(join(RAIZ, 'index.html')).href}?sala=%3Cx%3E`);
assert.equal(await page.getAttribute('#ir-aluno', 'href'), 'aluno/index.html');

// Nenhum script do site usa innerHTML nem type="module" (AGENTS.md, regras 3 e 4).
for (const arquivo of ['js/telao.js', 'js/ui/dom.js', 'js/ui/graficos.js', 'js/ui/formatar.js', 'js/ui/conexao.js', 'telao/index.html', 'index.html']) {
  const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
  // O uso, e não a palavra: os comentários explicam por que não usar.
  assert.ok(!/\.(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(|document\.write\s*\(/.test(texto), `${arquivo}: sem innerHTML`);
  assert.ok(!/type=["']module["']/.test(texto), `${arquivo}: sem type="module"`);
}
// As tags <script> do telão seguem a ORDEM do carregador de testes, todas com ?v=.
const { ORDEM } = await import('../test/carregar-nucleo.mjs');
const html = readFileSync(join(RAIZ, 'telao/index.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="\.\.\/([^"?]+)\?v=(\d+)"/g)];
assert.deepEqual(srcs.slice(0, ORDEM.length).map((m) => m[1]), ORDEM, 'o núcleo carrega na ordem de test/carregar-nucleo.mjs');
assert.deepEqual(srcs.filter((m) => m[2] !== versaoApp).map((m) => `${m[1]}?v=${m[2]}`), [], `todo script com ?v=${versaoApp} (a versaoApp do telão)`);
assert.deepEqual(srcs.slice(-5).map((m) => m[1]), ['js/ui/formatar.js', 'js/ui/dom.js', 'js/ui/graficos.js', 'js/ui/conexao.js', 'js/telao.js']);

assert.deepEqual(errosDaPagina, [], 'nenhum erro no console da página');
await navegador.close();
console.log(`ok: sessão inteira, placar = motor, ${verificadas.length} telas conferidas em ${TAMANHOS.map((t) => t.join('×')).join(' e ')}; capturas em e2e/capturas/`);
