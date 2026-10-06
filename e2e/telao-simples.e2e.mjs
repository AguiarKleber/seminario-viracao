// O formato simples (regras.formatoSimples; decisão do Kleber de 05/10 à noite)
// no telão por file://, sem celulares, no Playwright com o Chrome ou o Edge
// instalados: `npm run e2e:simples` (o `npm run e2e` roda este depois do e2e
// do telão com o config.json).
//
// O conteúdo vem de test/fixtures/config-simples.json; outro config do formato
// simples entra por `npm run e2e:simples -- --config caminho` (o config.json,
// quando o conteúdo do Jonas entrar). Tudo o que o teste espera sai do próprio
// config e do motor, recalculado aqui no Node.
//
// O que prova, com as seis equipes abertas, em 1024×768, 1280×720 e 1920×1080 (sem
// rolagem, nada abaixo de 28 px, nada fora da tela, nada cortado e nenhum
// controle de operador na projeção, como o e2e do telão):
// 1. "Conheça o Jonas" no lugar das personas: uma casa só, com a falta de um
//    mês comum (motor.mesComum);
// 2. a decisão com as 5 opções, cada uma com a letra, o rótulo e a
//    mini-história (a narrativa), sem nenhum dinheiro (D-079: às cegas), e a
//    equipe pela cor ("Equipe Laranja") em toda tela; na célula da decisão e
//    na tabela do caminho, só a cor ("Laranja");
// 3. o fechamento sem sorteio: do "decidindo" ao "resultado" direto (o telão
//    nunca desenha a tela do sorteio), e o resultado com o evento do mês uma
//    vez no topo e, por equipe, só a opção, o saldo do bimestre e o dinheiro
//    da família ("tem"/"devendo"), iguais ao motor;
// 4. o placar final em três páginas: o caminho de cada equipe (a tabela das
//    letras e dos saldos, da melhor para a pior), "Quanto sobrou, ou ficou
//    devendo" (as barras, com a linha da referência e sem a do que faltou na
//    mesa) e "Das N combinações possíveis" (a melhor e a pior, iguais a
//    motor.enumerarCombinacoes, sem a lista do lugar de cada equipe, D-079),
//    com o tempo da contagem no navegador;
// 5. com o config.json do dia (D-079), cada bloco com contexto: o contexto,
//    os itens e a fonte do config, sem a trilha do seminário e sem o placar
//    resumido, cabendo nos dois tamanhos.
/* global document, innerWidth, innerHeight, NodeFilter, getComputedStyle, SVGElement, requestAnimationFrame, MutationObserver */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';

const V = await carregarNucleo();
await import(pathToFileURL(join(RAIZ, 'js/ui/formatar.js')).href);
const F = globalThis.Viracao.formatar;

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const URL_TELAO = pathToFileURL(join(RAIZ, 'telao', 'index.html')).href;
// 1280×720 (revisão de 06/10): o projetor 16:9 de 720p, ou o notebook 1920×1080
// com escala de 150% no Windows; é o mais baixo dos tamanhos comuns.
const TAMANHOS = [[1024, 768], [1280, 720], [1920, 1080]];
const MIN_FONTE = 28;
const ROTEIRO = '60min';
const LETRAS = 'ABCDEFGHIJ';

function caminhoDoConfig() {
  const i = process.argv.indexOf('--config');
  const arg = i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length);
  return resolve(RAIZ, arg || join('test', 'fixtures', 'config-simples.json'));
}

const H = V.historia;
const M = V.motor;
// O config da vez (a fixture de 3 rodadas, e depois a de 6): usarConfig() troca.
let TEXTO_CONFIG;
let cfg;
let PASSOS;
let RODADAS;
let EQUIPES;
let PERSONA;
let PERIODO;
let plano;
let esperado;
let contagem;
const opcoesDe = (r) => cfg.rodadas[r].ordemOpcoes;
const letraDe = (r, op) => LETRAS[opcoesDe(r).indexOf(op)];
const lido = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
function usarConfig(texto, nome) {
  TEXTO_CONFIG = texto;
  const validacao = V.validarConfig.validarTexto(TEXTO_CONFIG);
  assert.ok(validacao.ok, `o config do e2e precisa ser válido: ${JSON.stringify(validacao.erros.slice(0, 5))}`);
  cfg = validacao.config;
  assert.equal(cfg.regras.formatoSimples, true, 'este e2e é do formato simples (regras.formatoSimples: true)');
  console.log(`Config: ${nome}`);

  PASSOS = V.roteiro.passos(cfg, ROTEIRO);
  RODADAS = PASSOS.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
  EQUIPES = cfg.ordem.equipes;
  PERSONA = cfg.equipes[EQUIPES[0]].persona;
  PERIODO = H.periodo(cfg);
  // Cada equipe numa opção diferente em cada rodada (todas as letras aparecem).
  plano = Object.fromEntries(RODADAS.map((r, k) => [r, Object.fromEntries(EQUIPES.map((eq, i) => [eq, opcoesDe(r)[(i + k) % opcoesDe(r).length]]))]));

  // O que o motor diz de cada equipe, rodada a rodada (uma carta por rodada).
  esperado = {};
  for (const eq of EQUIPES) {
    let estado = M.estadoInicial(cfg, eq);
    const historico = {};
    esperado[eq] = [];
    for (const r of RODADAS) {
      const opcaoId = plano[r][eq];
      const baralho = M.chances(cfg, { equipeId: eq, rodadaId: r, opcaoId, estado, historico });
      assert.equal(baralho.length, 1, `${r}/${eq}: uma carta só`);
      const a = M.aplicar(cfg, { equipeId: eq, rodadaId: r, opcaoId, cartaId: baralho[0].carta, estado, historico });
      esperado[eq].push({ rodada: r, opcao: opcaoId, carta: baralho[0].carta, saldo: Math.round(a.mes.saldoMes) + 0, familia: H.dinheiroDaFamilia(a.depois), deAntes: a.deAntes });
      historico[r] = { decisao: opcaoId, carta: baralho[0].carta };
      estado = a.depois;
    }
    esperado[eq].final = Math.round(M.patrimonio(estado)) + 0;
  }
  contagem = M.enumerarCombinacoes(cfg, { equipeId: EQUIPES[0], rodadas: RODADAS });
}

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
const ERRO_ESPERADO = [/Access to fetch at 'file:.*config\.json'.*CORS/, /Failed to load resource: net::ERR_FAILED/];
page.on('console', (m) => {
  if (m.type() === 'error' && !ERRO_ESPERADO.some((re) => re.test(m.text()))) errosDaPagina.push(`console: ${m.text()}`);
});
const downloads = [];
page.on('download', (d) => downloads.push(d));
mkdirSync(CAPTURAS, { recursive: true });

// O prefixo das capturas (simples-3r-…, simples-6r-…).
let prefixo = '';
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
let ultimoAvanco = 0;
async function avancar() {
  const falta = 1600 - (Date.now() - ultimoAvanco);
  if (falta > 0) await page.waitForTimeout(falta);
  await page.keyboard.press('Space');
  ultimoAvanco = Date.now();
}
async function avancarPara(teste, descricao) {
  await avancar();
  return esperarEstado(teste, descricao);
}
async function confirmarModal() {
  await page.waitForFunction(() => document.getElementById('modal').open);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('modal').open);
}
// Com o config.json do dia (D-078), o roteiro tem a enquete de entrada antes da
// formação e blocos de dados entre as rodadas, que a fixture não tem: passa por
// eles (a enquete, sem contagem: Enter e a confirmação) até o teste valer.
async function avancarAte(teste, descricao) {
  for (let i = 0; i < 30; i += 1) {
    const e = await estado();
    if (teste(e)) return e;
    if (e.tipo === 'bloco' && PASSOS[e.indice]?.contexto) await conferirBlocoDeDados(e.indice);
    if (e.tipo === 'enquete' && e.subfase === 'votando') {
      await page.keyboard.press('Enter');
      await confirmarModal();
      await esperarEstado((x) => x.subfase === 'apurada', `enquete ${e.enquete} apurada`);
      continue;
    }
    // O comparativo tem uma página por afirmação, e o Espaço só sai dele
    // depois da última (a página é da tela, e não do estado).
    const paginas = e.tipo === 'comparativo' ? (cfg.enquetes[e.enquete]?.ordemAfirmacoes?.length ?? 1) : 1;
    for (let p = 0; p < paginas; p += 1) await avancar();
    await esperarEstado((x) => x.indice !== e.indice || x.subfase !== e.subfase, `sair do passo ${e.indice}`);
  }
  return esperarEstado(teste, descricao);
}

// Os critérios do visual, os mesmos do e2e do telão (telao-offline.e2e.mjs).
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
    const palco = document.getElementById('palco').getBoundingClientRect();
    const baixo = Math.min(innerHeight, palco.bottom);
    for (const el of document.querySelectorAll('#palco *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.bottom > baixo + 1 || r.left < -1 || r.top < -1)) {
        fora.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} (${Math.round(r.right)}, ${Math.round(r.bottom)} > ${Math.round(baixo)})`);
      }
    }
    const cortados = [];
    for (const el of document.querySelectorAll('#palco *, #faixa *')) {
      if (getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) cortados.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`);
    }
    // Texto sobreposto: duas folhas de texto do palco que se cruzam.
    const folhas = [...document.querySelectorAll('#palco *')].filter((n) => n.children.length === 0 && n.textContent.trim() && n.getClientRects().length > 0);
    // Só a faixa do meio de cada caixa: a caixa de uma linha de texto passa da
    // entrelinha (1,1 a 1,25), e as de duas linhas seguidas sempre se tocam.
    // Uma caixa por linha de cada folha (getClientRects): a mini-história da
    // opção (D-079) corre na mesma linha do rótulo, e a caixa inteira dela,
    // de duas linhas, cobria o rótulo sem que nenhuma letra se cruzasse.
    const caixas = folhas.map((n) => [...n.getClientRects()].map((r) => ({ left: r.left, right: r.right, top: r.top + r.height * 0.25, bottom: r.bottom - r.height * 0.25 })));
    const sobrepostos = [];
    for (let i = 0; i < caixas.length; i += 1) {
      for (let j = i + 1; j < caixas.length; j += 1) {
        const area = Math.max(0, ...caixas[i].flatMap((a) => caixas[j].map((b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)))));
        if (area > 4 && !folhas[i].contains(folhas[j]) && !folhas[j].contains(folhas[i])) sobrepostos.push(`"${folhas[i].textContent.trim().slice(0, 20)}" × "${folhas[j].textContent.trim().slice(0, 20)}"`);
      }
    }
    // Nada sai da própria caixa (a célula da equipe na decisão, a faixa do
    // resultado, a linha da combinação, a célula da tabela): com 5 opções, o
    // quinto botão da decisão offline saía da célula da equipe e ficava por
    // baixo da vizinha, sem sair da tela.
    const vazados = [];
    for (const caixa of document.querySelectorAll('#palco .equipe-status, #palco .resultado-simples, #palco .combinacao-equipe, #palco .tabela-caminho td, #palco .tabela-caminho th')) {
      const c = caixa.getBoundingClientRect();
      for (const n of caixa.querySelectorAll('*')) {
        const r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) {
          vazados.push(`${n.tagName.toLowerCase()}.${n.getAttribute('class') || ''} "${n.textContent.trim().slice(0, 20)}" fora de .${caixa.className}`);
        }
      }
    }
    // G1 (revisão de 06/10): no Fim, na tabela do caminho e na célula da
    // decisão, o nome da equipe numa linha só. Em 1024×768, "Equipe / Verde- /
    // azulado" ia a três linhas no Fim e "Verde- / azulado" a duas na tabela.
    const quebrados = [...document.querySelectorAll('#palco :is(.placar-fim, .tabela-caminho, .equipe-status) .equipe-nome')]
      .filter((n) => n.getClientRects().length > 1 || n.getBoundingClientRect().height > parseFloat(getComputedStyle(n).fontSize) * 1.8)
      .map((n) => n.textContent.trim());
    return { rolagem, pequenos, fora: fora.slice(0, 6), cortados, sobrepostos: sobrepostos.slice(0, 6), vazados: vazados.slice(0, 6), quebrados };
  }, MIN_FONTE);
}

const SELETORES_OPERADOR = ['[data-acao]', 'input', 'select', 'textarea', '.botao-segurar', '.dica-operador', '[data-contagem-ativos]', '[data-barra-dica]', '.fim-acoes'];
async function controlesNaProjecao() {
  return page.evaluate((seletores) => {
    const achados = [];
    const r = document.getElementById('palco');
    for (const sel of seletores) for (const n of r.querySelectorAll(sel)) achados.push(`${sel} "${n.textContent.trim().slice(0, 40)}"`);
    for (const b of r.querySelectorAll('button')) if (!b.matches('.cartao-equipe, .botao-letra')) achados.push(`button "${b.textContent.trim().slice(0, 40)}"`);
    if (/\bEnter\b|\bEspaço\b|\bShift\b|\bCtrl\b|\bteclas?\b|\bsegure\b/i.test(r.textContent)) achados.push('texto de operador');
    return achados;
  }, SELETORES_OPERADOR);
}

// A equipe pela cor em toda tela ("Equipe Laranja"); na tabela do caminho
// (a coluna já se chama "Equipe") e na célula da decisão (D-079: com a
// mini-história nas opções, "Equipe Verde-azulado" quebrava em duas linhas e
// a tela não cabia), só a cor.
async function conferirRotulos(onde) {
  const rotulos = await page.evaluate(() => Array.from(document.querySelectorAll('#palco .equipe[data-equipe]'), (n) => ({
    equipe: n.dataset.equipe, nome: n.querySelector('.equipe-nome')?.textContent ?? '', curto: Boolean(n.closest('.tabela-caminho, .equipe-status')),
    forma: Boolean(n.querySelector('svg.forma')),
  })));
  for (const r of rotulos) {
    assert.ok(r.forma, `${onde}/${r.equipe}: a forma na frente`);
    assert.equal(r.nome, r.curto ? cfg.equipes[r.equipe].nome : `Equipe ${cfg.equipes[r.equipe].nome}`, `${onde}/${r.equipe}: a equipe pela cor`);
  }
}

// D-079: o bloco de dados com o contexto, os itens e a fonte do config, e
// nada mais (sem a trilha do seminário e sem o placar resumido), cabendo.
let blocosDeDados = 0;
async function conferirBlocoDeDados(indice) {
  const p = PASSOS[indice];
  await esperarTela('bloco');
  await conferirTela(`bloco-${String(indice).padStart(2, '0')}`, async (onde) => {
    const t = await page.evaluate(() => ({
      h1: document.querySelector('#palco h1')?.textContent,
      contexto: document.querySelector('#palco .bloco-contexto')?.textContent ?? null,
      itens: Array.from(document.querySelectorAll('#palco .bloco-item'), (n) => n.textContent),
      fonte: document.querySelector('#palco .bloco-fonte')?.textContent ?? null,
      trilha: document.querySelectorAll('#palco .linha-tempo').length,
      placar: document.querySelectorAll('#palco .placar-resumido').length,
    }));
    assert.equal(t.h1, p.titulo, `${onde}: o título`);
    assert.equal(t.contexto, p.contexto, `${onde}: o contexto`);
    assert.deepEqual(t.itens, p.itens || [], `${onde}: os itens`);
    assert.equal(t.fonte, p.fonte ? `Fontes: ${p.fonte}` : null, `${onde}: a fonte`);
    assert.equal(t.trilha, 0, `${onde}: sem a trilha do seminário`);
    assert.equal(t.placar, 0, `${onde}: sem o placar resumido`);
  });
  blocosDeDados += 1;
}

async function conferirTela(nome, aoMedir = null) {
  for (const [largura, altura] of TAMANHOS) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a, [largura, altura]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (!(await page.evaluate(() => document.getElementById('barra').hidden))) await page.keyboard.press('h');
    await page.waitForFunction(() => document.getElementById('barra').hidden);
    const m = await medir();
    await page.screenshot({ path: join(CAPTURAS, `simples-${prefixo}-${nome}-${largura}x${altura}.png`) });
    const onde = `${nome} em ${largura}×${altura}`;
    assert.deepEqual(m.rolagem, { vertical: false, horizontal: false }, `${onde}: a página rola. Fora: ${m.fora.join('; ')}`);
    assert.deepEqual(m.pequenos, [], `${onde}: texto abaixo de ${MIN_FONTE} px`);
    assert.deepEqual(m.fora, [], `${onde}: elemento fora da tela`);
    assert.deepEqual(m.cortados, [], `${onde}: texto cortado com reticências`);
    assert.deepEqual(m.sobrepostos, [], `${onde}: texto sobreposto`);
    assert.deepEqual(m.vazados, [], `${onde}: elemento fora da própria caixa`);
    assert.deepEqual(m.quebrados, [], `${onde}: nome de equipe em mais de uma linha`);
    assert.deepEqual(await controlesNaProjecao(), [], `${onde}: controle de operador na projeção`);
    await conferirRotulos(onde);
    if (aoMedir) await aoMedir(onde);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => innerWidth === 1024);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// ---------- A sessão ----------

async function jogar(nome) {
  console.log(`Formato simples (${nome}): a sessão inteira, sem celulares, com as seis equipes`);
  prefixo = nome;
  await page.goto(URL_TELAO);
  await esperarTela('abertura');
  await page.setInputFiles('#arquivo-config', { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(TEXTO_CONFIG) });
  await page.waitForSelector('#hash-config');
  assert.equal(await page.textContent('#hash-config'), V.validarConfig.hash(cfg));
  await page.check(`input[name="roteiro"][value="${ROTEIRO}"]`);
  await page.click('[data-acao="comecar-offline"]');
  await esperarTela('lobby');
  // Toda tela que o telão desenhar, para provar que o sorteio nunca aparece.
  await page.evaluate(() => {
    globalThis.__telas = [];
    new MutationObserver(() => globalThis.__telas.push(document.body.dataset.tela)).observe(document.body, { attributes: true, attributeFilter: ['data-tela'] });
  });

  await avancarAte((e) => e.tipo === 'formarEquipes', 'formação das equipes');
  await esperarTela('formar-equipes');
  assert.equal(await page.locator('.cartao-equipe .equipe-persona').count(), 0, 'na formação, sem o personagem (todas são o Jonas)');
  await conferirTela('formacao');

  // 1. Conheça o Jonas
  await avancarPara((e) => e.tipo === 'personas', 'personas');
  await esperarTela('personas');
  {
    const p = cfg.personas[PERSONA];
    const mes = M.mesComum(cfg, EQUIPES[0]);
    await conferirTela('conheca', async (onde) => {
      const lidoTela = await page.evaluate(() => ({
        h1: document.querySelector('#palco h1').textContent,
        personas: document.querySelectorAll('.persona-linha').length,
        mes: document.querySelector('.conheca-mes')?.dataset.saldoMesComum,
        quem: document.querySelector('.conheca-quem')?.textContent,
      }));
      assert.equal(lidoTela.h1, `Conheça o ${p.nome}`, `${onde}: o título`);
      assert.equal(lidoTela.personas, 0, `${onde}: sem a lista de personas`);
      assert.equal(Number(lidoTela.mes), mes.saldoMes, `${onde}: a conta de um mês comum`);
      assert.equal(lidoTela.quem, p.descricao);
    });
  }

  let consequenciasVistas = 0;
  const sorteiosNaTela = async () => (await page.evaluate(() => globalThis.__telas)).filter((t) => t === 'rodada-sorteio').length;
  const geracaoAntes = {};
  for (const [k, r] of RODADAS.entries()) {
    // A rodada (com o bloco no meio, como no roteiro).
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r, `${r}`);
    await esperarEstado((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `${r} aberta`);
    await esperarTela('rodada-decidindo');
    // 2. A decisão com as 5 opções e a mini-história de cada uma, às cegas
    // (D-079): nenhum dinheiro na tela da decisão.
    const conferirDecisao = async (onde) => {
      const opcoes = await page.evaluate(() => Array.from(document.querySelectorAll('ol.opcoes > li'), (li) => ({
        opcao: li.dataset.opcao, letra: li.querySelector('.letra').textContent, rotulo: li.querySelector('.opcao-rotulo')?.textContent,
        narrativa: li.querySelector('.opcao-narrativa')?.textContent ?? null, dinheiro: li.querySelectorAll('.opcao-dinheiro').length,
      })));
      assert.equal(opcoes.length, opcoesDe(r).length, `${onde}: todas as opções`);
      opcoes.forEach((o, i) => {
        const op = opcoesDe(r)[i];
        const texto = H.textoDaOpcao(cfg, r, op, PERSONA);
        assert.equal(o.opcao, op);
        assert.equal(o.letra, LETRAS[i]);
        assert.equal(o.rotulo, texto.rotulo, `${onde}/${op}: o rótulo`);
        assert.equal(o.narrativa, texto.narrativa ? ` — ${texto.narrativa}` : null, `${onde}/${op}: a mini-história`);
        assert.equal(o.dinheiro, 0, `${onde}/${op}: sem a linha do dinheiro`);
      });
      const textoDaTela = await page.evaluate(() => document.querySelector('ol.opcoes').textContent);
      for (const op of opcoesDe(r)) {
        const linha = H.textoDoDinheiro(H.dinheiroDaOpcao(cfg, r, op, PERSONA), F.moeda, PERIODO);
        assert.ok(!lido(textoDaTela).includes(lido(linha)), `${onde}/${op}: o dinheiro da opção ("${linha}") não aparece`);
      }
    };
    if (k === 0) {
      assert.equal(opcoesDe(r).length, 5, 'a fixture tem 5 opções por rodada');
      await conferirTela('decisao', conferirDecisao);
    } else await conferirDecisao(r);
    // As decisões pelo apresentador (o offline), clicando a letra de cada equipe.
    for (const eq of EQUIPES) {
      const antes = Object.keys((await estado()).forcadas || {}).length;
      await page.click(`.botao-letra[data-equipe="${eq}"][data-opcao="${plano[r][eq]}"]`);
      await esperarEstado((e) => Object.keys(e.forcadas || {}).length === antes + 1, `decisão de ${eq} em ${r}`);
    }
    if (k === 0) await conferirTela('decisao-decidida', conferirDecisao);
    // 3. Encerrar: direto ao resultado, sem sorteio.
    geracaoAntes[r] = (await estado()).geracao;
    const baixadosAntes = downloads.length;
    await page.keyboard.press('Enter');
    await confirmarModal();
    const e = await esperarEstado((x) => x.subfase === 'resultado' && x.rodada === r, `resultado de ${r}`);
    assert.equal(e.geracao, geracaoAntes[r] + 2, `${r}: "fechando" e o resultado, sem o passo do sorteio`);
    await esperarTela('rodada-resultado');
    assert.equal(await sorteiosNaTela(), 0, `${r}: a tela do sorteio nunca apareceu`);
    // D-078 (pedido do Kleber de 05/10, que muda a D-015): o fim da rodada não
    // baixa mais o JSON sozinho; o seguro é o "Salvar estado" da barra, à mão.
    await page.waitForTimeout(1500);
    assert.equal(downloads.length, baixadosAntes, `${r}: nenhum JSON baixado sozinho no fim da rodada`);
    const conferirResultado = async (onde) => {
      const lidoTela = await page.evaluate(() => ({
        evento: document.querySelector('.evento-do-mes')?.dataset.carta,
        eventoTitulo: document.querySelector('.evento-titulo')?.textContent,
        eventos: document.querySelectorAll('.evento-do-mes').length,
        faixas: Array.from(document.querySelectorAll('.resultado-simples'), (n) => ({
          ...n.dataset, letra: n.querySelector('.simples-opcao .letra').textContent, opcaoTexto: n.querySelector('.simples-opcao span').textContent,
          saldo: n.querySelector('.resultado-saldo').textContent, sinal: n.querySelector('.resultado-saldo').dataset.sinal,
          familia: n.querySelector('.simples-familia-valor').textContent,
        })),
        texto: document.getElementById('palco').textContent,
        antes: Array.from(document.querySelectorAll('.simples-antes li'), (n) => ({ ...n.dataset, texto: n.textContent })),
      }));
      const carta = esperado[EQUIPES[0]][k].carta;
      // D-078: a consequência de uma escolha de antes, com o motivo, uma linha
      // por motivo e valor (historia.consequenciasDaRodada, sobre o deAntes do motor).
      const grupos = H.consequenciasDaRodada(EQUIPES.map((eq) => ({ equipeId: eq, deAntes: esperado[eq][k].deAntes })));
      assert.deepEqual(lidoTela.antes.map((g) => [g.motivo, Number(g.valor), g.equipes]), grupos.map((g) => [g.motivo, g.valor, g.equipes.join(' ')]), `${onde}: as consequências de antes`);
      for (const [i, g] of grupos.entries()) {
        assert.equal(lido(lidoTela.antes[i].texto), lido(`${g.motivo.charAt(0).toUpperCase()}${g.motivo.slice(1)} ${F.moeda(g.valor, { sinal: true })}: ${g.equipes.map((eq) => cfg.equipes[eq].nome).join(', ')}`), `${onde}: o texto da consequência`);
      }
      if (grupos.length > 0) consequenciasVistas += 1;
      assert.equal(lidoTela.eventos, 1, `${onde}: o evento do mês uma vez`);
      assert.equal(lidoTela.evento, carta);
      assert.equal(lidoTela.eventoTitulo, H.textoDaCarta(cfg, carta, PERSONA).titulo);
      assert.equal(lidoTela.faixas.length, EQUIPES.length, `${onde}: as seis equipes`);
      for (const f of lidoTela.faixas) {
        const x = esperado[f.equipe][k];
        assert.equal(f.decisao, x.opcao, `${onde}/${f.equipe}: a decisão`);
        assert.equal(f.letra, letraDe(r, x.opcao));
        assert.equal(f.opcaoTexto, H.textoDaOpcao(cfg, r, x.opcao, PERSONA).rotulo);
        assert.equal(Number(f.saldoMes), x.saldo, `${onde}/${f.equipe}: o saldo do bimestre do motor`);
        assert.equal(lido(f.saldo), lido(F.moeda(x.saldo, { sinal: true })));
        assert.equal(f.sinal, x.saldo > 0 ? 'positivo' : x.saldo < 0 ? 'negativo' : 'zero');
        assert.deepEqual({ situacao: f.familia === undefined ? null : f.familia.startsWith('devendo') ? 'devendo' : 'tem' }, { situacao: x.familia.situacao });
        assert.equal(lido(f.familia), lido(`${x.familia.situacao} ${F.moeda(x.familia.valor)}`), `${onde}/${f.equipe}: o dinheiro da família`);
      }
      assert.ok(!/contas atrasadas|faltou na mesa|ficou sem|energia|dívida/i.test(lidoTela.texto), `${onde}: só o essencial (sem contas atrasadas, mesa, dívida, energia)`);
    };
    await conferirTela(`resultado-${r}`, conferirResultado);
  }

  // 4. O placar final em três páginas.
  await avancarAte((e) => e.tipo === 'placarFinal', 'placar final');
  await esperarTela('placar-final');
  const ordem = [...EQUIPES].sort((a, b) => esperado[b].final - esperado[a].final || EQUIPES.indexOf(a) - EQUIPES.indexOf(b));
  await conferirTela('placar-caminho', async (onde) => {
    const t = await page.evaluate(() => ({
      pagina: document.querySelector('.tela').dataset.pagina,
      h1: document.querySelector('#palco h1').textContent,
      cabeca: Array.from(document.querySelectorAll('.tabela-caminho thead th'), (n) => n.textContent),
      linhas: Array.from(document.querySelectorAll('.tabela-caminho tbody tr'), (tr) => ({
        equipe: tr.dataset.equipe, total: tr.dataset.total,
        celulas: Array.from(tr.querySelectorAll('td.caminho-celula'), (td) => ({ letra: td.dataset.letra, saldo: td.dataset.saldoMes, sinal: td.querySelector('.caminho-saldo').dataset.sinal })),
      })),
    }));
    assert.equal(t.pagina, 'caminho');
    assert.equal(t.h1, 'O caminho de cada equipe');
    assert.deepEqual(t.cabeca, ['Equipe', ...RODADAS.map((r, i) => H.rotuloDaRodada(cfg.rodadas[r].titulo, i)), 'Total']);
    assert.deepEqual(t.linhas.map((l) => l.equipe), ordem, `${onde}: da melhor para a pior`);
    for (const l of t.linhas) {
      assert.equal(Number(l.total), esperado[l.equipe].final, `${onde}/${l.equipe}: o total`);
      assert.deepEqual(l.celulas.map((c) => [c.letra, Number(c.saldo)]), esperado[l.equipe].map((x) => [letraDe(x.rodada, x.opcao), x.saldo]), `${onde}/${l.equipe}: as letras e os saldos`);
      // O total é a soma dos saldos (a família começa em zero).
      assert.ok(Math.abs(esperado[l.equipe].reduce((s, x) => s + x.saldo, 0) - esperado[l.equipe].final) <= RODADAS.length, `${l.equipe}: o total fecha com a soma dos saldos`);
    }
  });
  await avancarPara(() => true, 'página 2');
  await page.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'saldo');
  await conferirTela('placar-saldo', async (onde) => {
    const t = await page.evaluate(() => ({
      kicker: document.querySelector('#palco .kicker')?.textContent,
      valores: Array.from(document.querySelectorAll('.valor-saldo'), (n) => ({ equipe: n.dataset.equipe, texto: n.textContent })),
      mesa: document.querySelectorAll('.mesa-no-ano').length,
      referencias: Array.from(document.querySelectorAll('.referencias li'), (n) => n.textContent),
      linhasReferencia: document.querySelectorAll('line.referencia').length,
    }));
    assert.equal(t.kicker, 'Quanto sobrou, ou ficou devendo');
    assert.equal(t.mesa, 0, `${onde}: sem a linha do que faltou na mesa`);
    assert.deepEqual(t.valores.map((v) => v.equipe), ordem);
    for (const v of t.valores) {
      const d = H.dinheiroDaFamilia({ renda: esperado[v.equipe].final });
      assert.equal(lido(v.texto), lido(`${d.situacao} ${F.moeda(d.valor)}`), `${onde}/${v.equipe}`);
    }
    const refs = cfg.ordem.referencias || [];
    assert.equal(t.referencias.length, refs.length, `${onde}: a referência ("com carteira assinada")`);
    if (refs.length > 0) assert.equal(t.linhasReferencia, EQUIPES.length * refs.length, `${onde}: a linha da referência em todas as equipes (uma persona só)`);
  });
  await avancarPara(() => true, 'página 3');
  await page.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'combinacoes');
  let msNoNavegador = null;
  await conferirTela('placar-combinacoes', async (onde) => {
    const t = await page.evaluate(() => ({
      h1: document.querySelector('#palco h1').textContent,
      ms: document.querySelector('.tela').dataset.msCombinacoes,
      melhor: { ...document.querySelector('.combinacao-melhor').dataset },
      pior: { ...document.querySelector('.combinacao-pior').dataset },
      equipes: document.querySelectorAll('#palco .combinacao-equipe, #palco .combinacao-lugar').length,
      texto: document.getElementById('palco').textContent,
    }));
    msNoNavegador = Number(t.ms);
    const letrasDe = (opcoes) => opcoes.map((o, i) => letraDe(RODADAS[i], o)).join('');
    const fechar = RODADAS.length * PERIODO.meses === 12 ? 'o ano' : 'as contas';
    const quantas = contagem.fecham === 0 ? `nenhuma fecha ${fechar}` : contagem.fecham === 1 ? `1 fecha ${fechar}` : `${F.inteiro(contagem.fecham)} fecham ${fechar}`;
    assert.equal(lido(t.h1), lido(`Das ${F.inteiro(contagem.total)} combinações possíveis, ${quantas}`), `${onde}: o título`);
    assert.deepEqual([t.melhor.letras, Number(t.melhor.valor)], [letrasDe(contagem.melhor.opcoes), Math.round(contagem.melhor.valor)], `${onde}: a melhor`);
    assert.deepEqual([t.pior.letras, Number(t.pior.valor)], [letrasDe(contagem.pior.opcoes), Math.round(contagem.pior.valor)], `${onde}: a pior`);
    // D-079 (print 6 do Kleber): sem a lista do lugar de cada equipe.
    assert.equal(t.equipes, 0, `${onde}: sem a lista de posições`);
    assert.ok(!/\d+º de /.test(t.texto), `${onde}: nenhum "Nº de N"`);
  });
  assert.ok(msNoNavegador < 1000, `a contagem das combinações no navegador levou ${msNoNavegador} ms`);
  // O modo revendo (pedido 6 do Kleber, 05/10): ← revê o resultado do último
  // bimestre, no formato simples, só no telão; → volta ao placar. Com o
  // config.json do dia (D-079), o passo antes do placar é o bloco de dados do
  // último bimestre: o primeiro ← revê o bloco (com o contexto), o segundo, o
  // resultado.
  {
    const antes = await estado();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.body.dataset.tela === 'revendo');
    const iAnterior = PASSOS.findLastIndex((p, k) => k < antes.indice && p.tipo !== 'enquete');
    if (PASSOS[iAnterior]?.tipo === 'bloco') {
      if (PASSOS[iAnterior].contexto) {
        await page.waitForFunction(() => document.querySelector('#palco .bloco-contexto') !== null);
        assert.equal(await page.textContent('#palco .bloco-contexto'), PASSOS[iAnterior].contexto, 'revendo: o bloco de dados com o contexto');
      }
      await page.keyboard.press('ArrowLeft');
    }
    await page.waitForFunction(() => document.body.dataset.tela === 'revendo' && document.querySelectorAll('.resultado-simples').length > 0);
    assert.equal(await page.locator('.resultado-simples').count(), EQUIPES.length, 'revendo: o resultado do último bimestre, no formato simples');
    assert.equal(await page.locator('.grafico-fatias').count(), 0, 'revendo: sem sorteio');
    await page.keyboard.press('ArrowRight');
    // Sair do modo pela tecla trava o Avançar por 1,5 s, como o passador.
    ultimoAvanco = Date.now();
    await esperarTela('placar-final');
    assert.equal((await estado()).geracao, antes.geracao, 'revendo não grava nada');
  }
  // Não há uma quarta página: o Espaço segue o roteiro.
  await avancarPara((e) => e.tipo !== 'placarFinal', 'o passo depois do placar');
  // Até o fim do roteiro: com o config.json do dia, passa pelo bloco "Fim:
  // quem é o patrão?" (D-079), conferido como os blocos de dados.
  await avancarAte((e) => e.tipo === 'fim', 'o fim do roteiro');
  console.log(`  ${RODADAS.length} rodadas × ${opcoesDe(RODADAS[0]).length} opções; ${contagem.total} combinações, ${contagem.fecham} fecham; contagem no navegador: ${msNoNavegador} ms; telas de resultado com consequência de antes: ${consequenciasVistas}; blocos de dados conferidos: ${blocosDeDados}`);
}

// Parte 1: o config pedido (a fixture de 3 rodadas, por padrão).
const CAMINHO_CONFIG = caminhoDoConfig();
usarConfig(readFileSync(CAMINHO_CONFIG, 'utf8'), CAMINHO_CONFIG);
await jogar(`${RODADAS.length}r`);
// Parte 2: só com a fixture, a mesma com 6 rodadas (r4 a r6 repetem r1 a r3,
// com a consequência encadeada também em r5), como o jogo de 12 meses: a
// tabela do caminho com seis bimestres e as 15.625 combinações, contadas no
// navegador.
if (!process.argv.some((a) => a.startsWith('--config'))) {
  const bruto = JSON.parse(TEXTO_CONFIG);
  const extra = bruto.rodadas.map((r, i) => ({ ...structuredClone(r), id: `r${i + 4}`, titulo: `${['Jul–ago', 'Set–out', 'Nov–dez'][i]}: ${r.titulo.split(': ')[1]}` }));
  bruto.rodadas.push(...extra);
  bruto.cartas.push(...bruto.cartas.map((c, i) => ({ ...structuredClone(c), id: `${c.id}2`, rodadas: [`r${i + 4}`] })));
  bruto.cartas[4].efeitos[1].se = { decidiu: { r4: 'a' } };
  const passos = bruto.roteiros['60min'];
  const iPlacar = passos.findIndex((p) => p.tipo === 'placarFinal');
  passos.splice(iPlacar, 0, ...['r4', 'r5', 'r6'].flatMap((rodada) => [{ tipo: 'bloco', titulo: `Dados antes de ${rodada}`, alvoSeg: 60 }, { tipo: 'rodada', rodada, alvoSeg: 210 }]));
  usarConfig(JSON.stringify(bruto, null, 1), 'fixture com 6 rodadas');
  await page.goto('about:blank');
  await jogar('6r');
}
assert.deepEqual(errosDaPagina, [], 'nenhum erro na página');
console.log('OK: o formato simples no telão offline (1024×768, 1280×720 e 1920×1080).');
await navegador.close();
