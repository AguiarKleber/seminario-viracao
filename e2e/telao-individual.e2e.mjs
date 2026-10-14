// O modo individual (regras.individual; decisão do Kleber de 13/10 à noite) no
// telão por file://, sem celulares, no Playwright com o Chrome ou o Edge
// instalados: `node e2e/telao-individual.e2e.mjs` (o config.json do dia; outro
// config individual entra por `--config caminho`). O e2e com celulares, contra
// o emulador, é o e2e/individual-online.e2e.mjs.
//
// Em 1024×768, 1280×720 e 1920×1080, toda tela conferida: sem rolagem, nada
// abaixo de 28 px, nada fora da tela, nada cortado, nada sobreposto, nenhum
// controle de operador na projeção e NENHUMA vaga nem nome (o telão mostra só o
// resumo da turma: o voto é secreto e o tema é sensível).
//
// Parte 1, "a turma" (Começar sem celulares, sem membro nenhum): o telão joga um
// caminho só, com a escolha da turma marcada pelo apresentador (anfitriao.
// decidirPelaTurma), para nunca travar se a internet cair antes da aula:
// 1. o lobby sem celulares diz que a turma escolhe junto, de mão levantada;
// 2. "Conheça o Jonas" diz "Todos jogam com o mesmo personagem";
// 3. a decisão: as 5 opções com a mini-história e, no lugar das células das
//    equipes, as letras da "Escolha da turma"; uma rodada fica sem escolha e
//    joga a opção de sempre;
// 4. o resultado: o evento do mês e uma faixa só, "A turma", com a opção, o
//    saldo do bimestre e o dinheiro da família, iguais ao motor, e a
//    consequência de uma escolha de antes;
// 5. o placar: "A turma terminou o ano …", "O caminho da turma" e as
//    combinações; o Fim com a frase da turma; o modo revendo.
// Parte 2, a turma de 20 pessoas sem celulares: o estado de uma sala com 20
// vagas, jogada no Node com o anfitrião real sobre o canal-local (como os
// testes), carregado pelo "Carregar estado (JSON)" (os membros não vêm no
// arquivo, e a sala segue com as 20 vagas, como depois de "Continuar sem
// celulares"):
// 6. o resultado da turma: quantas pessoas ficaram com cada opção (com quem
//    não votou contado na opção de sempre e dito em uma linha), e o que veio de
//    uma escolha de antes, para quantas pessoas;
// 7. a escolha da turma marcada pelo apresentador vale para as 20 vagas;
// 8. o placar: "Quanto sobrou, ou ficou devendo" com a frase de
//    historia.fraseDoFimDaTurma (quantos terminaram com dinheiro sobrando e
//    quantos devendo) e uma coluna por pessoa, sem nome; "As escolhas da
//    turma" (bimestre × opção); as combinações; e nada por vaga (sem "O caminho
//    de cada equipe").
/* global document, innerWidth, innerHeight, NodeFilter, getComputedStyle, SVGElement, requestAnimationFrame, MutationObserver */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';
import { montarSessao, SALA } from '../test/fixtures/sessao.mjs';

const V = await carregarNucleo();
await import(pathToFileURL(join(RAIZ, 'js/ui/formatar.js')).href);
const F = globalThis.Viracao.formatar;
const H = V.historia;
const M = V.motor;

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
// Uma cópia das capturas fora do repositório (o relatório da fase aponta para
// lá): VIRACAO_CAPTURAS=pasta.
const COPIA = process.env.VIRACAO_CAPTURAS || null;
const URL_TELAO = pathToFileURL(join(RAIZ, 'telao', 'index.html')).href;
const TAMANHOS = [[1024, 768], [1280, 720], [1920, 1080]];
const MIN_FONTE = 28;
const ROTEIRO = '60min';
const LETRAS = 'ABCDEFGHIJ';
const lido = (t) => String(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const ARG = (() => {
  const i = process.argv.indexOf('--config');
  return i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length);
})();
const CAMINHO = resolve(RAIZ, ARG || 'config.json');
const TEXTO_CONFIG = readFileSync(CAMINHO, 'utf8');
const validacao = V.validarConfig.validarTexto(TEXTO_CONFIG);
assert.ok(validacao.ok, `o config precisa ser válido: ${JSON.stringify(validacao.erros.slice(0, 5))}`);
const cfg = validacao.config;
assert.equal(cfg.regras.individual, true, 'este e2e é do modo individual (regras.individual: true)');
console.log(`Config: ${CAMINHO}`);
const PASSOS = V.roteiro.passos(cfg, ROTEIRO);
const RODADAS = PASSOS.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
const VAGAS = cfg.ordem.equipes;
const PERSONA = cfg.equipes[VAGAS[0]].persona;
const PERIODO = H.periodo(cfg);
const opcoesDe = (r) => cfg.rodadas[r].ordemOpcoes;
const letraDe = (r, op) => LETRAS[opcoesDe(r).indexOf(op)];
const meses = RODADAS.length * PERIODO.meses;
const PERIODO_JOGADO = meses === 12 ? 'o ano' : meses === 1 ? 'o mês' : `os ${meses} meses`;

// O caminho de uma pessoa (uma vaga) pelo motor, rodada a rodada: a opção
// (null = a de sempre), o saldo, a família, o que veio de antes e o fim.
function caminhoNoMotor(escolhas) {
  let estado = M.estadoInicial(cfg, VAGAS[0]);
  const historico = {};
  const linhas = RODADAS.map((r, k) => {
    const opcaoId = escolhas[k] ?? cfg.rodadas[r].padrao;
    const baralho = M.chances(cfg, { equipeId: VAGAS[0], rodadaId: r, opcaoId, estado, historico });
    assert.equal(baralho.length, 1, `${r}: uma carta só`);
    const a = M.aplicar(cfg, { equipeId: VAGAS[0], rodadaId: r, opcaoId, cartaId: baralho[0].carta, estado, historico });
    historico[r] = { decisao: opcaoId, carta: baralho[0].carta };
    estado = a.depois;
    return { rodada: r, opcao: opcaoId, carta: baralho[0].carta, saldo: Math.round(a.mes.saldoMes) + 0, saldoMes: a.mes.saldoMes, depois: a.depois, familia: H.dinheiroDaFamilia(a.depois), deAntes: a.deAntes };
  });
  return { linhas, final: Math.round(M.patrimonio(estado)) + 0 };
}

// A linha embaixo da opção no resultado da turma, como o telão a escreve
// (telao.js, itensDaOpcao): primeiro o destaque da opção (D-084, nota de
// 14/10: "Bloqueado 5 dias pelo app depois da greve −R$ 450: 3 dessas
// pessoas"), depois o que veio de antes; cada item com quantas dessas pessoas,
// e o mesmo motivo de novo (outro valor) sem repetir. Recebe uma opção de
// historia.resultadoPorOpcao; null quando não há nada embaixo dela.
function linhaEsperada(o) {
  const itens = [...o.destaques.map((g) => ({ g, tipo: 'destaque' })), ...o.consequencias.map((g) => ({ g, tipo: 'antes' }))];
  if (itens.length === 0) return null;
  return itens.map(({ g, tipo }, j) => {
    const repetido = j > 0 && itens[j - 1].tipo === tipo && itens[j - 1].g.motivo === g.motivo;
    const motivo = j === 0 ? `${g.motivo.charAt(0).toUpperCase()}${g.motivo.slice(1)}` : g.motivo;
    return `${j > 0 ? ' · ' : ''}${repetido ? '' : `${motivo} `}${F.moeda(g.valor, { sinal: true })}: ${o.n === 1 ? '1 pessoa' : `${g.pessoas} dessas pessoas`}`;
  }).join('');
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
mkdirSync(CAPTURAS, { recursive: true });
if (COPIA) mkdirSync(COPIA, { recursive: true });

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
// Passa pelos passos do meio: a enquete (sem contagem: Enter e a
// confirmação), o comparativo (uma página por afirmação) e os blocos de dados
// (conferidos no caminho).
async function avancarAte(teste, descricao, aoPassarNoBloco = null) {
  for (let i = 0; i < 40; i += 1) {
    const e = await estado();
    if (teste(e)) return e;
    if (e.tipo === 'bloco' && aoPassarNoBloco) await aoPassarNoBloco(e.indice);
    if (e.tipo === 'enquete' && e.subfase === 'votando') {
      await page.keyboard.press('Enter');
      await confirmarModal();
      await esperarEstado((x) => x.subfase === 'apurada', `enquete ${e.enquete} apurada`);
      continue;
    }
    const paginas = e.tipo === 'comparativo' ? (cfg.enquetes[e.enquete]?.ordemAfirmacoes?.length ?? 1) : 1;
    for (let p = 0; p < paginas; p += 1) await avancar();
    await esperarEstado((x) => x.indice !== e.indice || x.subfase !== e.subfase, `sair do passo ${e.indice}`);
  }
  return esperarEstado(teste, descricao);
}

// Os critérios do visual, os mesmos do telao-simples.e2e.mjs, mais: nenhuma
// vaga nem rótulo de equipe na projeção (o modo individual não mostra nada por
// pessoa).
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
    const folhas = [...document.querySelectorAll('#palco *')].filter((n) => n.children.length === 0 && n.textContent.trim() && n.getClientRects().length > 0);
    const caixas = folhas.map((n) => [...n.getClientRects()].map((r) => ({ left: r.left, right: r.right, top: r.top + r.height * 0.25, bottom: r.bottom - r.height * 0.25 })));
    const sobrepostos = [];
    for (let i = 0; i < caixas.length; i += 1) {
      for (let j = i + 1; j < caixas.length; j += 1) {
        const area = Math.max(0, ...caixas[i].flatMap((a) => caixas[j].map((b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)))));
        if (area > 4 && !folhas[i].contains(folhas[j]) && !folhas[j].contains(folhas[i])) sobrepostos.push(`"${folhas[i].textContent.trim().slice(0, 20)}" × "${folhas[j].textContent.trim().slice(0, 20)}"`);
      }
    }
    const vazados = [];
    for (const caixa of document.querySelectorAll('#palco .resultado-simples, #palco .turma-opcao, #palco .tabela-turma td, #palco .tabela-turma th, #palco .turma-decisao')) {
      const c = caixa.getBoundingClientRect();
      for (const n of caixa.querySelectorAll('*')) {
        const r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) {
          vazados.push(`${n.tagName.toLowerCase()}.${n.getAttribute('class') || ''} "${n.textContent.trim().slice(0, 20)}" fora de .${caixa.className}`);
        }
      }
    }
    // O texto dos blocos é conteúdo do config, e é o Kleber quem decide (até
    // a D-083, a "Conversa em grupos" do roteiro de 120 min falava em
    // equipe): fica fora da busca por "equipe".
    const noPalco = document.getElementById('palco');
    const semBlocos = [...noPalco.querySelectorAll('*')].filter((n) => n.children.length === 0 && !n.closest('.bloco-contexto, .bloco-itens, .bloco-fonte'))
      .map((n) => n.textContent).join(' ');
    const porPessoa = {
      rotulos: noPalco.querySelectorAll('.equipe[data-equipe], .equipe-nome').length,
      vaga: /\bVaga \d/.test(noPalco.textContent),
      equipe: /\bequipes?\b/i.test(semBlocos),
    };
    return { rolagem, pequenos, fora: fora.slice(0, 6), cortados, sobrepostos: sobrepostos.slice(0, 6), vazados: vazados.slice(0, 6), porPessoa };
  }, MIN_FONTE);
}

const SELETORES_OPERADOR = ['[data-acao]', 'input', 'select', 'textarea', '.botao-segurar', '.dica-operador', '[data-contagem-ativos]', '[data-barra-dica]', '.fim-acoes'];
async function controlesNaProjecao() {
  return page.evaluate((seletores) => {
    const achados = [];
    const r = document.getElementById('palco');
    for (const sel of seletores) for (const n of r.querySelectorAll(sel)) achados.push(`${sel} "${n.textContent.trim().slice(0, 40)}"`);
    for (const b of r.querySelectorAll('button')) if (!b.matches('.botao-letra')) achados.push(`button "${b.textContent.trim().slice(0, 40)}"`);
    if (/\bEnter\b|\bEspaço\b|\bShift\b|\bCtrl\b|\bteclas?\b|\bsegure\b/i.test(r.textContent)) achados.push('texto de operador');
    return achados;
  }, SELETORES_OPERADOR);
}

const capturadas = [];
async function conferirTela(nome, aoMedir = null) {
  for (const [largura, altura] of TAMANHOS) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a, [largura, altura]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (!(await page.evaluate(() => document.getElementById('barra').hidden))) await page.keyboard.press('h');
    await page.waitForFunction(() => document.getElementById('barra').hidden);
    const m = await medir();
    const arquivo = `individual-${prefixo}-${nome}-${largura}x${altura}.png`;
    await page.screenshot({ path: join(CAPTURAS, arquivo) });
    if (COPIA) copyFileSync(join(CAPTURAS, arquivo), join(COPIA, arquivo));
    capturadas.push(arquivo);
    const onde = `${prefixo}/${nome} em ${largura}×${altura}`;
    assert.deepEqual(m.rolagem, { vertical: false, horizontal: false }, `${onde}: a página rola. Fora: ${m.fora.join('; ')}`);
    assert.deepEqual(m.pequenos, [], `${onde}: texto abaixo de ${MIN_FONTE} px`);
    assert.deepEqual(m.fora, [], `${onde}: elemento fora da tela`);
    assert.deepEqual(m.cortados, [], `${onde}: texto cortado com reticências`);
    assert.deepEqual(m.sobrepostos, [], `${onde}: texto sobreposto`);
    assert.deepEqual(m.vazados, [], `${onde}: elemento fora da própria caixa`);
    assert.deepEqual(m.porPessoa, { rotulos: 0, vaga: false, equipe: false }, `${onde}: nada por vaga nem por equipe na projeção`);
    assert.deepEqual(await controlesNaProjecao(), [], `${onde}: controle de operador na projeção`);
    if (aoMedir) await aoMedir(onde);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => innerWidth === 1024);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// O bloco de dados com o contexto, os itens e a fonte do config, cabendo.
let blocosConferidos = 0;
async function conferirBlocoDeDados(indice) {
  const p = PASSOS[indice];
  if (!p?.contexto && !p?.itens) return;
  await esperarTela('bloco');
  await conferirTela(`bloco-${String(indice).padStart(2, '0')}`, async (onde) => {
    const t = await page.evaluate(() => ({
      h1: document.querySelector('#palco h1')?.textContent,
      contexto: document.querySelector('#palco .bloco-contexto')?.textContent ?? null,
      itens: Array.from(document.querySelectorAll('#palco .bloco-item'), (n) => n.textContent),
      placar: document.querySelectorAll('#palco .placar-resumido').length,
    }));
    assert.equal(t.h1, p.titulo, `${onde}: o título`);
    assert.equal(t.contexto, p.contexto ?? null, `${onde}: o contexto`);
    assert.deepEqual(t.itens, p.itens || [], `${onde}: os itens`);
    assert.equal(t.placar, 0, `${onde}: sem o placar resumido`);
  });
  blocosConferidos += 1;
}

async function abrirConfig() {
  await page.goto(URL_TELAO);
  await esperarTela('abertura');
  await page.setInputFiles('#arquivo-config', { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(TEXTO_CONFIG) });
  await page.waitForSelector('#hash-config');
  assert.equal(await page.textContent('#hash-config'), V.validarConfig.hash(cfg));
  // D-083: com um roteiro só no config (o do dia), a abertura não tem o bloco
  // "Roteiro", e o telão usa esse; com mais de um (as fixtures), escolhe.
  const radios = await page.locator('input[name="roteiro"]').count();
  assert.equal(radios, Object.keys(cfg.roteiros).length > 1 ? Object.keys(cfg.roteiros).length : 0, 'o bloco "Roteiro" só com mais de um roteiro');
  if (radios > 0) await page.check(`input[name="roteiro"][value="${ROTEIRO}"]`);
}

// O placar, página 3: as combinações possíveis (a mesma do formato simples).
async function conferirCombinacoes() {
  await page.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'combinacoes');
  const contagem = M.enumerarCombinacoes(cfg, { equipeId: VAGAS[0], rodadas: RODADAS });
  await conferirTela('placar-combinacoes', async (onde) => {
    const t = await page.evaluate(() => ({
      h1: document.querySelector('#palco h1').textContent,
      melhor: { ...document.querySelector('.combinacao-melhor').dataset },
      pior: { ...document.querySelector('.combinacao-pior').dataset },
    }));
    const letrasDe = (opcoes) => opcoes.map((o, i) => letraDe(RODADAS[i], o)).join('');
    const fechar = meses === 12 ? 'o ano' : 'as contas';
    const quantas = contagem.fecham === 0 ? `nenhuma fecha ${fechar}` : contagem.fecham === 1 ? `1 fecha ${fechar}` : `${F.inteiro(contagem.fecham)} fecham ${fechar}`;
    assert.equal(lido(t.h1), lido(`Das ${F.inteiro(contagem.total)} combinações possíveis, ${quantas}`), `${onde}: o título`);
    assert.deepEqual([t.melhor.letras, Number(t.melhor.valor)], [letrasDe(contagem.melhor.opcoes), Math.round(contagem.melhor.valor)], `${onde}: a melhor`);
    assert.deepEqual([t.pior.letras, Number(t.pior.valor)], [letrasDe(contagem.pior.opcoes), Math.round(contagem.pior.valor)], `${onde}: a pior`);
  });
}

// A decisão: as opções com a mini-história, e nada por vaga. Offline, as letras
// da "Escolha da turma" no lugar das células das equipes.
async function conferirDecisao(r, onde) {
  const t = await page.evaluate(() => ({
    opcoes: Array.from(document.querySelectorAll('ol.opcoes > li'), (li) => ({
      opcao: li.dataset.opcao, rotulo: li.querySelector('.opcao-rotulo')?.textContent, narrativa: li.querySelector('.opcao-narrativa')?.textContent ?? null,
    })),
    celulas: document.querySelectorAll('#palco .equipe-status').length,
    botoes: Array.from(document.querySelectorAll('#palco .turma-decisao .botao-letra'), (b) => ({ opcao: b.dataset.opcao, letra: b.textContent, marcado: b.getAttribute('aria-pressed') === 'true' })),
    rotulo: document.querySelector('#palco .turma-decisao-rotulo')?.textContent ?? null,
    andamento: document.querySelectorAll('#palco .turma-andamento').length,
  }));
  assert.equal(t.opcoes.length, opcoesDe(r).length, `${onde}: as opções`);
  t.opcoes.forEach((o, i) => {
    const texto = H.textoDaOpcao(cfg, r, opcoesDe(r)[i], PERSONA);
    assert.equal(o.rotulo, texto.rotulo, `${onde}: o rótulo da ${LETRAS[i]}`);
    assert.equal(o.narrativa, texto.narrativa ? ` — ${texto.narrativa}` : null, `${onde}: a mini-história da ${LETRAS[i]}`);
  });
  assert.equal(t.celulas, 0, `${onde}: sem as células das equipes`);
  assert.equal(t.andamento, 0, `${onde}: offline, sem o "N de M já escolheram"`);
  assert.equal(t.rotulo, 'Escolha da turma:', `${onde}: a escolha da turma`);
  assert.deepEqual(t.botoes.map((b) => [b.opcao, b.letra]), opcoesDe(r).map((op, i) => [op, LETRAS[i]]), `${onde}: uma letra por opção`);
  return t;
}

async function escolherPelaTurma(r, op) {
  const geracao = (await estado()).geracao;
  await page.click(`.turma-decisao .botao-letra[data-opcao="${op}"]`);
  await esperarEstado((e) => e.geracao > geracao && Object.values(e.forcadas || {}).length > 0 && Object.values(e.forcadas).every((x) => x === op), `a turma escolheu ${op} em ${r}`);
  await page.waitForFunction((o) => document.querySelector(`.turma-decisao .botao-letra[data-opcao="${o}"]`)?.getAttribute('aria-pressed') === 'true', op);
}

async function encerrarDecisao(r) {
  await page.keyboard.press('Enter');
  // O tempo mínimo de conversa ainda corre: o telão pede confirmação.
  if (await page.evaluate(() => document.getElementById('modal').open)) await confirmarModal();
  else {
    await page.waitForTimeout(300);
    if (await page.evaluate(() => document.getElementById('modal').open)) await confirmarModal();
  }
  await esperarEstado((x) => x.subfase === 'resultado' && x.rodada === r, `resultado de ${r}`);
  await esperarTela('rodada-resultado');
}

// ---------- Parte 1: "a turma" ----------

async function parteTurma() {
  prefixo = 'turma';
  console.log('Parte 1: "a turma", sem celulares, um caminho só');
  // Uma rodada sem escolha (a de sempre), para provar o padrão.
  const indices = [4, 1, 2, null, 3, 1];
  const escolhas = RODADAS.map((r, k) => {
    const i = indices[k % indices.length];
    return k === Math.min(3, RODADAS.length - 1) ? null : opcoesDe(r)[i % opcoesDe(r).length];
  });
  const caminho = caminhoNoMotor(escolhas);
  await abrirConfig();
  await page.click('[data-acao="comecar-offline"]');
  await esperarTela('lobby');
  await page.evaluate(() => {
    globalThis.__telas = [];
    new MutationObserver(() => globalThis.__telas.push(document.body.dataset.tela)).observe(document.body, { attributes: true, attributeFilter: ['data-tela'] });
  });
  await conferirTela('lobby', async (onde) => {
    const itens = await page.evaluate(() => Array.from(document.querySelectorAll('#palco .lista-simples li'), (n) => n.textContent));
    assert.ok(itens.includes('Decisões: a turma escolhe junto, de mão levantada, e o apresentador registra a escolha.'), `${onde}: a decisão da turma (${JSON.stringify(itens)})`);
  });

  await avancarAte((e) => e.tipo === 'personas', 'personas');
  await esperarTela('personas');
  await conferirTela('conheca', async (onde) => {
    const t = await page.evaluate(() => ({ kicker: document.querySelector('#palco .kicker')?.textContent, h1: document.querySelector('#palco h1')?.textContent }));
    assert.equal(t.kicker, 'Todos jogam com o mesmo personagem', `${onde}: o kicker`);
    assert.equal(t.h1, `Conheça o ${cfg.personas[PERSONA].nome}`, `${onde}: o título`);
  });

  let consequencias = 0;
  for (const [k, r] of RODADAS.entries()) {
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r, `${r}`, conferirBlocoDeDados);
    await esperarEstado((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `${r} aberta`);
    await esperarTela('rodada-decidindo');
    if (k === 0) await conferirTela('decisao', (onde) => conferirDecisao(r, onde));
    else await conferirDecisao(r, r);
    if (escolhas[k] !== null) {
      await escolherPelaTurma(r, escolhas[k]);
      if (k === 0) await conferirTela('decisao-marcada', (onde) => conferirDecisao(r, onde));
    }
    await encerrarDecisao(r);
    const x = caminho.linhas[k];
    await conferirTela(`resultado-${r}`, async (onde) => {
      const t = await page.evaluate(() => ({
        evento: document.querySelector('.evento-do-mes')?.dataset.carta,
        faixas: Array.from(document.querySelectorAll('.resultado-simples'), (n) => ({
          ...n.dataset, quem: n.querySelector('.simples-quem')?.textContent, letra: n.querySelector('.simples-opcao .letra').textContent,
          opcaoTexto: n.querySelector('.simples-opcao span').textContent, familia: n.querySelector('.simples-familia-valor').textContent,
          obs: n.querySelector('.simples-obs')?.textContent ?? null,
        })),
      }));
      assert.equal(t.evento, x.carta, `${onde}: o evento do mês`);
      assert.equal(t.faixas.length, 1, `${onde}: uma faixa só, a da turma`);
      const f = t.faixas[0];
      assert.equal(f.quem, 'A turma', `${onde}: "A turma" no lugar da equipe`);
      assert.equal(f.decisao, x.opcao, `${onde}: a opção (null = a de sempre)`);
      assert.equal(f.letra, letraDe(r, x.opcao));
      assert.equal(f.opcaoTexto, H.textoDaOpcao(cfg, r, x.opcao, PERSONA).rotulo);
      assert.equal(Number(f.saldoMes), x.saldo, `${onde}: o saldo do bimestre do motor`);
      assert.equal(lido(f.familia), lido(`${x.familia.situacao} ${F.moeda(x.familia.valor)}`), `${onde}: o dinheiro da família`);
      // D-084, nota de 14/10: o destaque da opção (o bloqueio de quem parou)
      // vem antes da consequência de antes, na mesma observação.
      const grupos = [...H.destaquesDaOpcao(cfg, r, x.opcao, PERSONA), ...H.consequenciasDaRodada([{ equipeId: VAGAS[0], deAntes: x.deAntes }])];
      const obs = grupos.map((g) => `${g.motivo.charAt(0).toUpperCase()}${g.motivo.slice(1)} ${F.moeda(g.valor, { sinal: true })}`).join(' · ');
      assert.equal(f.obs === null ? null : lido(f.obs), grupos.length > 0 ? lido(obs) : null, `${onde}: o destaque e a consequência de antes`);
      if (grupos.length > 0 && onde.endsWith('1024×768')) consequencias += 1;
    });
  }
  assert.ok((await page.evaluate(() => globalThis.__telas)).every((t) => t !== 'rodada-sorteio' && t !== 'rodada-prorrogacao'), 'nem sorteio nem prorrogação');

  // O placar.
  await avancarAte((e) => e.tipo === 'placarFinal', 'placar final', conferirBlocoDeDados);
  await esperarTela('placar-final');
  const familiaFinal = H.dinheiroDaFamilia({ renda: caminho.final });
  const fraseFinal = `A turma terminou ${PERIODO_JOGADO} ${familiaFinal.situacao === 'devendo' ? 'devendo' : 'com'} ${F.moeda(familiaFinal.valor)}`;
  await conferirTela('placar-fim', async (onde) => {
    const t = await page.evaluate(() => ({
      pagina: document.querySelector('.tela').dataset.pagina, kicker: document.querySelector('#palco .kicker')?.textContent,
      h1: document.querySelector('#palco h1')?.textContent, letras: document.querySelector('.fim-turma-caminho')?.dataset.letras,
      colunas: document.querySelectorAll('.grafico-turma rect').length,
    }));
    assert.equal(t.pagina, 'fimDaTurma');
    assert.equal(t.kicker, 'Quanto sobrou, ou ficou devendo');
    assert.equal(lido(t.h1), lido(fraseFinal), `${onde}: como a turma terminou`);
    assert.equal(t.letras, caminho.linhas.map((x) => letraDe(x.rodada, x.opcao)).join(''), `${onde}: as escolhas da turma`);
    assert.equal(t.colunas, 0, `${onde}: sem as colunas por pessoa (é um caminho só)`);
  });
  await avancarPara(() => true, 'página 2');
  await page.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'escolhasDaTurma');
  await conferirTela('placar-caminho', async (onde) => {
    const t = await page.evaluate(() => ({
      h1: document.querySelector('#palco h1')?.textContent,
      linhas: Array.from(document.querySelectorAll('.tabela-caminho-turma tbody tr'), (tr) => ({ ...tr.dataset })),
    }));
    assert.equal(t.h1, 'O caminho da turma');
    assert.deepEqual(t.linhas.map((l) => [l.rodada, l.decisao, Number(l.saldoMes)]), caminho.linhas.map((x) => [x.rodada, x.opcao, x.saldo]), `${onde}: as escolhas e os saldos`);
  });
  await avancarPara(() => true, 'página 3');
  await conferirCombinacoes();
  // O modo revendo: ← revê o passo anterior (o bloco do último bimestre, ou o
  // resultado), só no telão; → volta.
  {
    const antes = await estado();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.body.dataset.tela === 'revendo');
    if (PASSOS[antes.indice - 1]?.tipo === 'bloco') await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.body.dataset.tela === 'revendo' && document.querySelectorAll('.resultado-simples').length === 1);
    assert.equal(await page.textContent('.resultado-simples .simples-quem'), 'A turma', 'revendo: o resultado da turma');
    await page.keyboard.press('ArrowRight');
    ultimoAvanco = Date.now();
    await esperarTela('placar-final');
    assert.equal((await estado()).geracao, antes.geracao, 'revendo não grava nada');
  }
  await avancarPara((e) => e.tipo !== 'placarFinal', 'o passo depois do placar');
  await avancarAte((e) => e.tipo === 'fim', 'o fim', conferirBlocoDeDados);
  await esperarTela('fim');
  await conferirTela('fim', async (onde) => {
    assert.equal(lido(await page.textContent('#palco .fim-turma-resumo')), lido(`${fraseFinal}.`), `${onde}: a frase da turma no Fim`);
  });
  console.log(`  ${RODADAS.length} rodadas; a turma terminou com ${caminho.final}; resultados com consequência de antes: ${consequencias}; blocos conferidos: ${blocosConferidos}`);
}

// ---------- Parte 2: a turma de 20 pessoas, sem celulares ----------

// A sala jogada no Node: o anfitrião real sobre o canal-local (com as travas
// das regras), 20 alunos que entram juntos e ganham as vagas e1 a e20 (o uid
// desempata: u00 → e1), e as primeiras rodadas votadas no celular simulado.
// Devolve o arquivo do "Salvar estado" (sem membros, votos nem presença) e o
// plano de cada pessoa. planoDado: as escolhas de cada pessoa em cada rodada
// (o pior caso do destaque, na parte 3); sem ele, o plano de sempre.
async function salaDe20(rodadasNoNode, planoDado = null) {
  const sessao = montarSessao(V, { config: cfg, roteiro: ROTEIRO });
  const { anf, relogio } = sessao;
  await anf.criarSala();
  const alunos = [];
  for (let i = 0; i < VAGAS.length; i += 1) {
    const a = sessao.novoAluno(`u${String(i).padStart(2, '0')}`);
    await a.entrar();
    alunos.push(a);
  }
  const { atribuidas } = await anf.atribuirVagas();
  assert.equal(atribuidas, VAGAS.length, 'as 20 vagas');
  // Quem não vota em cada rodada (u05, u11, u17): fica na opção de sempre. Os
  // cinco primeiros começam pelo caminho da melhor combinação do config do dia
  // (A, D, C): com o fim que a turma marca no telão, 5 terminam com dinheiro
  // sobrando e 15 devendo, e a página do fim tem colunas dos dois lados.
  const inicio = [0, 3, 2];
  const plano = planoDado ?? alunos.map((_, i) => RODADAS.slice(0, rodadasNoNode).map((r, k) => {
    if (i < 5) return opcoesDe(r)[inicio[k % inicio.length] % opcoesDe(r).length];
    return i % 6 === 5 ? null : opcoesDe(r)[(i + k) % opcoesDe(r).length];
  }));
  for (const [k, r] of RODADAS.slice(0, rodadasNoNode).entries()) {
    for (let guarda = 0; guarda < 40 && !(anf.estado().tipo === 'rodada' && anf.estado().rodada === r); guarda += 1) {
      const e = anf.estado();
      if (e.subfase === 'votando') await anf.encerrar();
      else await anf.avancar();
      relogio.passar(1000);
    }
    for (const [i, a] of alunos.entries()) if (plano[i][k] !== null) await a.decidir(r, VAGAS[i], plano[i][k]);
    relogio.passar(60000);
    await anf.encerrar();
    assert.equal(anf.estado().subfase, 'resultado', `${r} apurada no Node`);
  }
  const sala = structuredClone(sessao.canal.exportar().salas[SALA]);
  for (const k of ['votosEnquete', 'decisoes', 'presenca', 'membros']) delete sala[k];
  return {
    arquivo: { formato: 'viracao-estado', versaoApp: 'e2e', sala: SALA, salvoEm: relogio.agora(), dados: sala },
    plano,
  };
}

async function parteDe20() {
  prefixo = 'turma20';
  const noNode = Math.max(1, Math.min(3, RODADAS.length - 1));
  console.log(`Parte 2: 20 pessoas sem celulares (${noNode} rodadas jogadas no Node, o resto no telão pela turma)`);
  const { arquivo, plano } = await salaDe20(noNode);
  // No telão: a escolha da turma (para as 20 vagas) em uma rodada, nenhuma na
  // seguinte (cada uma na opção de sempre), e de novo a da turma (E, nada, B).
  const fimDaTurma = [4, null, 1];
  const daTurma = RODADAS.slice(noNode).map((r, k) => {
    const i = fimDaTurma[k % fimDaTurma.length];
    return i === null ? null : opcoesDe(r)[i % opcoesDe(r).length];
  });
  const escolhasDe = (i) => [...plano[i], ...daTurma];
  const caminhos = VAGAS.map((_, i) => caminhoNoMotor(escolhasDe(i)));
  const naoVotou = (i, k) => (k < noNode ? plano[i][k] === null : daTurma[k - noNode] === null);
  // O que a tela tem de dizer, contado aqui, pessoa por pessoa.
  const contagem = (k) => {
    const r = RODADAS[k];
    const n = Object.fromEntries(opcoesDe(r).map((op) => [op, 0]));
    let semVoto = 0;
    caminhos.forEach((c, i) => {
      n[c.linhas[k].opcao] += 1;
      if (naoVotou(i, k)) semVoto += 1;
    });
    return { n, semVoto };
  };
  // D-084: o resultado por opção, com os números do motor de cada pessoa
  // (calculados aqui, rodada a rodada, e não lidos da sala).
  const porOpcaoEsperado = (k) => H.resultadoPorOpcao(cfg, RODADAS[k], {
    [RODADAS[k]]: Object.fromEntries(VAGAS.map((v, i) => {
      const l = caminhos[i].linhas[k];
      return [v, { decisao: l.opcao, origem: naoVotou(i, k) ? 'piloto' : 'maioria', mes: { saldoMes: l.saldoMes }, depois: l.depois, deAntes: l.deAntes }];
    })),
  });

  await abrirConfig();
  await page.setInputFiles('#arquivo-estado', { name: 'estado.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(arquivo)) });
  await esperarEstado((e) => e.tipo === 'rodada' && e.rodada === RODADAS[noNode - 1] && e.subfase === 'resultado', 'o estado carregado');
  await esperarTela('rodada-resultado');

  const conferirResultado = async (k, onde) => {
    const r = RODADAS[k];
    const t = await page.evaluate(() => ({
      kicker: document.querySelector('#palco .kicker')?.textContent ?? null,
      evento: document.querySelector('.evento-do-mes')?.dataset.carta,
      opcoes: Array.from(document.querySelectorAll('.turma-opcao'), (li) => ({
        opcao: li.dataset.opcao, n: Number(li.dataset.n), dados: { ...li.dataset },
        rotulo: li.querySelector('.turma-opcao-rotulo')?.textContent ?? null, pessoas: li.querySelector('.turma-n')?.textContent ?? null,
        saldo: li.querySelector('.turma-saldo-opcao')?.textContent ?? null, familia: li.querySelector('.turma-familia-opcao')?.textContent ?? null,
        consequencias: li.querySelector('.turma-consequencias')?.textContent ?? null,
      })),
      colunas: document.querySelector('.turma-colunas')?.textContent ?? null,
      semVoto: document.querySelector('.turma-sem-voto')?.textContent ?? null,
      antes: Array.from(document.querySelectorAll('.turma-antes-item'), (li) => ({ opcao: li.closest('.turma-opcao').dataset.opcao, motivo: li.dataset.motivo, pessoas: Number(li.dataset.pessoas), valor: Number(li.dataset.valor) })),
      destaques: Array.from(document.querySelectorAll('.turma-destaque-item'), (li) => ({ opcao: li.closest('.turma-opcao').dataset.opcao, motivo: li.dataset.motivo, pessoas: Number(li.dataset.pessoas), valor: Number(li.dataset.valor) })),
      faixas: document.querySelectorAll('.resultado-simples').length,
    }));
    const c = contagem(k);
    assert.equal(t.faixas, 0, `${onde}: nenhuma faixa por vaga`);
    assert.equal(t.kicker, `O que a turma escolheu · ${F.pessoas(VAGAS.length)}`, `${onde}: quantas pessoas`);
    assert.equal(t.evento, caminhos[0].linhas[k].carta, `${onde}: o evento do mês`);
    assert.deepEqual(t.opcoes.map((o) => [o.opcao, o.n]), opcoesDe(r).map((op) => [op, c.n[op]]), `${onde}: quantas pessoas em cada opção`);
    // D-084: por opção, o rótulo, "N pessoas", o saldo do bimestre e a família
    // de quem a escolheu (o valor, se todos têm o mesmo; "em média", se
    // variam) e, embaixo, as consequências com quantas dessas pessoas.
    assert.equal(lido(t.colunas), lido(`saldo ${PERIODO.doPeriodo}a família`), `${onde}: os nomes das colunas`);
    const esperado = porOpcaoEsperado(k);
    for (const [i, o] of t.opcoes.entries()) {
      const e = esperado.porOpcao[i];
      const deles = caminhos.filter((cam) => cam.linhas[k].opcao === o.opcao).map((cam) => cam.linhas[k]);
      assert.equal(o.rotulo, H.textoDaOpcao(cfg, r, o.opcao, PERSONA).rotulo, `${onde}: o rótulo da ${LETRAS[i]}`);
      assert.equal(lido(o.pessoas), `${o.n} ${o.n === 1 ? 'pessoa' : 'pessoas'}`, `${onde}: "N pessoas" da ${LETRAS[i]}`);
      if (deles.length === 0) {
        assert.deepEqual([o.saldo, o.familia, o.consequencias], [null, null, null], `${onde}: a ${LETRAS[i]}, sem ninguém, sem valores`);
        continue;
      }
      // O "em média" conferido com os números de cada pessoa, contados aqui.
      const saldos = new Set(deles.map((l) => l.saldo));
      const familias = new Set(deles.map((l) => (l.familia.situacao === 'devendo' ? -l.familia.valor : l.familia.valor)));
      assert.equal(e.saldo.media, saldos.size > 1, `${onde}: o saldo da ${LETRAS[i]} em média só quando varia`);
      assert.equal(e.familia.media, familias.size > 1, `${onde}: a família da ${LETRAS[i]} em média só quando varia`);
      if (saldos.size === 1) assert.equal(e.saldo.valor, [...saldos][0], `${onde}: o saldo de todos da ${LETRAS[i]}`);
      assert.deepEqual([o.dados.saldo, o.dados.saldoMedia, o.dados.familia, o.dados.valorFamilia, o.dados.familiaMedia],
        [String(e.saldo.valor), String(e.saldo.media), e.familia.situacao, String(e.familia.valor), String(e.familia.media)], `${onde}: os números da ${LETRAS[i]}`);
      assert.equal(lido(o.saldo), lido(`${F.moeda(e.saldo.valor, { sinal: true })}${e.saldo.media ? ' em média' : ''}`), `${onde}: o saldo da ${LETRAS[i]}`);
      assert.equal(lido(o.familia), lido(`${e.familia.situacao === 'devendo' ? 'devendo' : 'tem'} ${F.moeda(e.familia.valor)}${e.familia.media ? ' em média' : ''}`), `${onde}: a família da ${LETRAS[i]}`);
      const frase = linhaEsperada(e);
      assert.equal(o.consequencias === null ? null : lido(o.consequencias), frase === null ? null : lido(frase), `${onde}: o destaque e as consequências da ${LETRAS[i]}`);
    }
    // D-084, nota de 14/10: o destaque de cada opção vale para todos que a
    // escolheram (é efeito direto dela): "N dessas pessoas", com N = a opção.
    assert.deepEqual(t.destaques, esperado.porOpcao.flatMap((o) => o.destaques.map((g) => ({ opcao: o.id, motivo: g.motivo, pessoas: g.pessoas, valor: g.valor }))), `${onde}: o destaque, por opção`);
    for (const d of t.destaques) assert.equal(d.pessoas, c.n[d.opcao], `${onde}: o destaque da ${d.opcao} para todos que a escolheram`);
    const padrao = letraDe(r, cfg.rodadas[r].padrao);
    assert.equal(t.semVoto === null ? null : lido(t.semVoto), c.semVoto === 0 ? null
      : lido(c.semVoto === 1 ? `1 pessoa não escolheu e ficou na ${padrao}, a opção de sempre.` : `${c.semVoto} pessoas não escolheram e ficaram na ${padrao}, a opção de sempre.`), `${onde}: quem não votou`);
    assert.deepEqual(t.antes, esperado.porOpcao.flatMap((o) => o.consequencias.map((g) => ({ opcao: o.id, motivo: g.motivo, pessoas: g.pessoas, valor: g.valor }))), `${onde}: o que veio de antes, por opção`);
    // As pessoas atingidas por cada motivo, somadas pelas opções, batem com a
    // conta da turma inteira (historia.consequenciasDaTurma).
    const daTurma = H.consequenciasDaTurma(cfg, r, { [r]: Object.fromEntries(VAGAS.map((v, i) => [v, { deAntes: caminhos[i].linhas[k].deAntes }])) });
    for (const g of daTurma) assert.equal(t.antes.filter((a) => a.motivo === g.motivo).reduce((s, a) => s + a.pessoas, 0), g.pessoas, `${onde}: "${g.motivo}", para ${g.pessoas} pessoas`);
    return { semVoto: c.semVoto, antes: t.antes.length };
  };
  const vistos = { semVoto: 0, antes: 0 };
  const anotar = (x) => {
    if (x.semVoto > 0) vistos.semVoto += 1;
    if (x.antes > 0) vistos.antes += 1;
  };
  await conferirTela(`resultado-${RODADAS[noNode - 1]}`, async (onde) => anotar(await conferirResultado(noNode - 1, onde)));

  for (let k = noNode; k < RODADAS.length; k += 1) {
    const r = RODADAS[k];
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r, `${r}`);
    await esperarEstado((e) => e.subfase === 'decidindo', `${r} aberta`);
    await esperarTela('rodada-decidindo');
    if (k === noNode) await conferirTela('decisao', (onde) => conferirDecisao(r, onde));
    const op = daTurma[k - noNode];
    if (op !== null) {
      await escolherPelaTurma(r, op);
      const e = await estado();
      assert.deepEqual(Object.keys(e.forcadas).sort(), [...VAGAS].sort(), `${r}: a escolha da turma vale para as 20 vagas`);
    }
    await encerrarDecisao(r);
    const resultadoK = k;
    if (k === noNode || k === RODADAS.length - 1 || op === null) await conferirTela(`resultado-${r}`, async (onde) => anotar(await conferirResultado(resultadoK, onde)));
    else anotar(await conferirResultado(k, r));
  }

  // O placar: nada por vaga.
  await avancarAte((e) => e.tipo === 'placarFinal', 'placar final');
  await esperarTela('placar-final');
  const valores = caminhos.map((c) => c.final).sort((a, b) => b - a);
  const fim = { pessoas: valores.length, positivos: valores.filter((v) => v >= 0).length, negativos: valores.filter((v) => v < 0).length };
  const media = Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) + 0;
  await conferirTela('placar-fim', async (onde) => {
    const t = await page.evaluate(() => {
      const s = document.querySelector('.tela');
      return {
        pagina: s.dataset.pagina, kicker: document.querySelector('#palco .kicker')?.textContent, h1: document.querySelector('#palco h1')?.textContent,
        dados: { pessoas: s.dataset.pessoas, positivos: s.dataset.positivos, negativos: s.dataset.negativos },
        colunas: Array.from(document.querySelectorAll('.grafico-turma rect'), (r) => ({ valor: Number(r.dataset.valor), classe: r.getAttribute('class') })),
        media: document.querySelector('.linha-media')?.dataset.media ?? null,
        legenda: document.querySelector('.fim-turma-legenda')?.textContent ?? null,
        caminho: document.querySelectorAll('.tabela-caminho').length,
      };
    });
    assert.equal(t.pagina, 'fimDaTurma', `${onde}: a primeira página`);
    assert.equal(t.caminho, 0, `${onde}: sem "O caminho de cada equipe"`);
    assert.equal(t.kicker, 'Quanto sobrou, ou ficou devendo');
    assert.equal(lido(t.h1), lido(H.fraseDoFimDaTurma(fim)), `${onde}: quantos terminaram com dinheiro sobrando e quantos devendo`);
    assert.deepEqual(t.dados, { pessoas: String(fim.pessoas), positivos: String(fim.positivos), negativos: String(fim.negativos) });
    assert.deepEqual(t.colunas.map((c) => c.valor), valores, `${onde}: uma coluna por pessoa, do maior para o menor`);
    assert.ok(t.colunas.every((c) => c.classe === (c.valor >= 0 ? 'coluna-sobrou' : 'coluna-devendo')), `${onde}: a cor de cada coluna`);
    assert.equal(Number(t.media), media, `${onde}: a média`);
    assert.ok(lido(t.legenda).includes(lido(`média da turma: ${media < 0 ? `devendo ${F.moeda(-media)}` : `${F.moeda(media)} sobrando`}`)), `${onde}: a legenda da média`);
  });
  await avancarPara(() => true, 'página 2');
  await page.waitForFunction(() => document.querySelector('.tela')?.dataset.pagina === 'escolhasDaTurma');
  await conferirTela('placar-escolhas', async (onde) => {
    const t = await page.evaluate(() => ({
      h1: document.querySelector('#palco h1')?.textContent,
      cabeca: Array.from(document.querySelectorAll('.tabela-turma thead th'), (n) => n.textContent),
      linhas: Array.from(document.querySelectorAll('.tabela-turma tbody tr'), (tr) => ({
        rodada: tr.dataset.rodada, rotulo: tr.querySelector('th').textContent,
        celulas: Array.from(tr.querySelectorAll('td'), (td) => ({ opcao: td.dataset.opcao, n: Number(td.dataset.n), maior: td.classList.contains('turma-celula-maior') })),
      })),
      nota: document.querySelector('.turma-nota')?.textContent ?? null,
    }));
    assert.equal(t.h1, 'As escolhas da turma');
    assert.deepEqual(t.cabeca, [PERIODO.nome.charAt(0).toUpperCase() + PERIODO.nome.slice(1), ...opcoesDe(RODADAS[0]).map((_, i) => LETRAS[i])]);
    assert.deepEqual(t.linhas.map((l) => [l.rodada, l.rotulo]), RODADAS.map((r, i) => [r, H.rotuloDaRodada(cfg.rodadas[r].titulo, i)]), `${onde}: um bimestre por linha`);
    for (const [k, l] of t.linhas.entries()) {
      const c = contagem(k);
      assert.deepEqual(l.celulas.map((x) => [x.opcao, x.n]), opcoesDe(RODADAS[k]).map((op) => [op, c.n[op]]), `${onde}/${l.rodada}: quantas pessoas em cada opção`);
      const maior = Math.max(...Object.values(c.n));
      assert.deepEqual(l.celulas.map((x) => x.maior), opcoesDe(RODADAS[k]).map((op) => c.n[op] === maior && maior > 0), `${onde}/${l.rodada}: a mais escolhida em negrito`);
    }
    assert.equal(t.nota, 'Quem não escolheu ficou na opção de sempre e está contado nela.', `${onde}: a nota de quem não votou`);
  });
  await avancarPara(() => true, 'página 3');
  await conferirCombinacoes();
  await avancarPara((e) => e.tipo !== 'placarFinal', 'o passo depois do placar');
  await avancarAte((e) => e.tipo === 'fim', 'o fim');
  await esperarTela('fim');
  await conferirTela('fim', async (onde) => {
    assert.equal(lido(await page.textContent('#palco .fim-turma-resumo')), lido(H.fraseDoFimDaTurma(fim)), `${onde}: a frase da turma no Fim`);
  });
  assert.ok(vistos.semVoto > 0, 'algum resultado com quem não votou');
  console.log(`  ${H.fraseDoFimDaTurma(fim)} Resultados com quem não votou: ${vistos.semVoto}; com consequência de antes: ${vistos.antes}`);
}

// ---------- Parte 3: o pior caso do destaque, 20 pessoas ----------

// D-084, nota de 14/10 (pedido do Kleber antes do seminário): nas rodadas com
// destaque (o bloqueio da greve, do protesto e do breque), o resultado da
// turma no pior caso de altura: as 20 pessoas repartidas pelas 5 opções (4 em
// cada) e, em cada opção, os caminhos que juntam todas as consequências de
// antes que o jogo permite ali (contadas pelo motor, caminho por caminho),
// com valores diferentes entre si (o "em média" do saldo e da família, que
// pode quebrar a linha). O destaque entra na linha de baixo da opção dele.
function piorCasoDaRodada(k) {
  const r = RODADAS[k];
  const porOpcao = Math.floor(VAGAS.length / opcoesDe(r).length);
  const candidatos = new Map(opcoesDe(r).map((op) => [op, []]));
  const andar = (prefixo) => {
    if (prefixo.length < k) {
      for (const op of opcoesDe(RODADAS[prefixo.length])) andar([...prefixo, op]);
      return;
    }
    for (const op of opcoesDe(r)) {
      const l = caminhoNoMotor([...prefixo, op]).linhas[k];
      const grupos = new Set(H.consequenciasDaRodada([{ equipeId: VAGAS[0], deAntes: l.deAntes }]).map((g) => `${g.motivo}=${g.valor}`));
      candidatos.get(op).push({ escolhas: [...prefixo, op], grupos, saldo: l.saldo });
    }
  };
  andar([]);
  const plano = [];
  for (const op of opcoesDe(r)) {
    const todos = new Set(candidatos.get(op).flatMap((c) => [...c.grupos]));
    const cobertos = new Set();
    const escolhidos = [];
    while (escolhidos.length < porOpcao) {
      // O que mais junta consequências novas; no empate, um saldo ainda não visto.
      let melhor = null;
      let ganho = -1;
      for (const c of candidatos.get(op)) {
        if (escolhidos.includes(c)) continue;
        const g = [...c.grupos].filter((x) => !cobertos.has(x)).length + (escolhidos.every((x) => x.saldo !== c.saldo) ? 0.5 : 0);
        if (g > ganho) [melhor, ganho] = [c, g];
      }
      if (!melhor) break;
      escolhidos.push(melhor);
      for (const x of melhor.grupos) cobertos.add(x);
    }
    assert.equal(cobertos.size, todos.size, `${r}/${op}: o pior caso junta todas as ${todos.size} consequências possíveis (${[...todos].join('; ')})`);
    plano.push(...escolhidos.map((c) => c.escolhas));
  }
  while (plano.length < VAGAS.length) plano.push(plano[plano.length % porOpcao]);
  return plano;
}

async function parteDoDestaque() {
  prefixo = 'destaque';
  const alvos = RODADAS.map((r, k) => [r, k]).filter(([r]) => opcoesDe(r).some((op) => H.destaquesDaOpcao(cfg, r, op, PERSONA).length > 0));
  console.log(`Parte 3: o pior caso do destaque, 20 pessoas (${alvos.map(([r]) => r).join(', ') || 'nenhuma rodada com destaque'})`);
  const medidas = [];
  for (const [r, k] of alvos) {
    const plano = piorCasoDaRodada(k);
    const linhas = plano.map((escolhas) => caminhoNoMotor(escolhas).linhas[k]);
    const esperado = H.resultadoPorOpcao(cfg, r, {
      [r]: Object.fromEntries(VAGAS.map((v, i) => [v, { decisao: linhas[i].opcao, mes: { saldoMes: linhas[i].saldoMes }, depois: linhas[i].depois, deAntes: linhas[i].deAntes }])),
    });
    const { arquivo } = await salaDe20(k + 1, plano);
    // O arquivo do "Salvar estado" fica junto das capturas: carregado no telão
    // ("Carregar estado"), mostra o pior caso para conferir à mão.
    writeFileSync(join(CAPTURAS, `estado-pior-caso-${r}.json`), JSON.stringify(arquivo));
    await abrirConfig();
    await page.setInputFiles('#arquivo-estado', { name: 'estado.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(arquivo)) });
    await esperarEstado((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'resultado', `o estado do pior caso de ${r}`);
    await esperarTela('rodada-resultado');
    await conferirTela(`resultado-${r}`, async (onde) => {
      const t = await page.evaluate(() => {
        const s = document.querySelector('.tela');
        const palco = document.getElementById('palco').getBoundingClientRect();
        const fundo = Math.max(...[...s.querySelectorAll('*')].map((n) => n.getBoundingClientRect().bottom));
        return {
          aperto: s.dataset.aperto ?? '0', sobra: Math.round(Math.min(innerHeight, palco.bottom) - fundo),
          opcoes: Array.from(document.querySelectorAll('.turma-opcao'), (li) => ({ opcao: li.dataset.opcao, n: Number(li.dataset.n), linha: li.querySelector('.turma-consequencias')?.textContent ?? null })),
          destaques: Array.from(document.querySelectorAll('.turma-destaque-item'), (li) => ({ opcao: li.closest('.turma-opcao').dataset.opcao, motivo: li.dataset.motivo, pessoas: Number(li.dataset.pessoas), valor: Number(li.dataset.valor) })),
          antes: Array.from(document.querySelectorAll('.turma-antes-item'), (li) => ({ opcao: li.closest('.turma-opcao').dataset.opcao, motivo: li.dataset.motivo, pessoas: Number(li.dataset.pessoas), valor: Number(li.dataset.valor) })),
        };
      });
      assert.deepEqual(t.opcoes.map((o) => [o.opcao, o.n]), esperado.porOpcao.map((o) => [o.id, o.n]), `${onde}: quantas pessoas em cada opção`);
      assert.deepEqual(t.destaques, esperado.porOpcao.flatMap((o) => o.destaques.map((g) => ({ opcao: o.id, motivo: g.motivo, pessoas: g.pessoas, valor: g.valor }))), `${onde}: o destaque, por opção`);
      assert.ok(t.destaques.length > 0, `${onde}: alguma opção com destaque`);
      for (const d of t.destaques) assert.equal(d.pessoas, esperado.porOpcao.find((o) => o.id === d.opcao).n, `${onde}: o destaque da ${d.opcao} para todos que a escolheram`);
      assert.deepEqual(t.antes, esperado.porOpcao.flatMap((o) => o.consequencias.map((g) => ({ opcao: o.id, motivo: g.motivo, pessoas: g.pessoas, valor: g.valor }))), `${onde}: o que veio de antes, por opção`);
      // O texto inteiro de cada linha; no aperto 6, o motivo perde o resto
      // (" (revisão adiada)"), que fica no DOM, escondido.
      for (const [i, o] of t.opcoes.entries()) {
        const frase = linhaEsperada(esperado.porOpcao[i]);
        assert.equal(o.linha === null ? null : lido(o.linha), frase === null ? null : lido(frase), `${onde}: a linha embaixo da ${LETRAS[i]}`);
      }
      medidas.push(`${r} ${onde.split(' em ')[1]}: aperto ${t.aperto}, sobram ${t.sobra} px`);
    });
  }
  for (const m of medidas) console.log(`  ${m}`);
}

await parteTurma();
await page.goto('about:blank');
await parteDe20();
await page.goto('about:blank');
await parteDoDestaque();
assert.deepEqual(errosDaPagina, [], 'nenhum erro na página');
console.log(`OK: o modo individual no telão offline (1024×768, 1280×720 e 1920×1080; ${capturadas.length} capturas).`);
await navegador.close();
