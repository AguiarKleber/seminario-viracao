// O telão por file://, no Playwright, com o Chrome ou o Edge instalados (sem
// baixar navegador): `npm run e2e`. Fica fora do `npm run check` (arquitetura,
// seção 13) porque depende de um navegador na máquina.
//
// O conteúdo vem do config.json da raiz; outro arquivo entra por
// `VIRACAO_CONFIG=caminho npm run e2e` ou `npm run e2e -- --config caminho`
// (a fixture v2 dos testes, enquanto o config.json está em reescrita). Tudo o
// que o teste precisa do conteúdo (passos, equipes, opções, afirmações) sai do
// próprio config: o conteúdo muda até o congelamento, e o teste não pode quebrar
// porque uma rodada ganhou uma opção. Sem um bloco "Mapa do seminário" no
// roteiro de 60 min, o teste acrescenta um, para conferir a linha do tempo como
// conteúdo principal (D-042).
//
// O que prova:
// 1. o telão abre pelo arquivo (pendrive), carrega o config pelo seletor de
//    arquivo e joga a sessão INTEIRA do roteiro 60min sem celulares, só com o
//    teclado e cliques da barra: contagens manuais nas enquetes e decisões pelo
//    apresentador;
// 2. o que foi projetado bate com o motor recalculado aqui no Node, a partir das
//    sementes gravadas: no resultado enxuto (D-065), a carta de cada equipe, os
//    dias parados (D-052), o saldo do mês com sinal e cor e a dívida total
//    (cheque especial + empréstimo); e as páginas do placar final (D-041, D-044
//    a D-046), pelo patrimônio (o empréstimo é dívida), com as contas de cada
//    mês na história;
// 3. desfazer e encerrar de novo tira as mesmas cartas; recarregar a página
//    oferece "Retomar a sessão"; "Carregar estado" retoma de um JSON salvo;
// 4. em cada tipo de tela, nenhuma rolagem, nenhum texto abaixo de 28 px no
//    corpo do telão e nenhum controle de operador fora da barra (D-047), em
//    1024×768 e em 1920×1080, com capturas em e2e/capturas/;
// 5. a linha do tempo do seminário em todo bloco, com o seminário inteiro até
//    o fim, "você está aqui" e um "a seguir" que aponta para um item dela
//    (D-042; rascunho, seção 7, item 15), e as opções da rodada sem setas de
//    tendência (D-043);
// 6. as telas que dependem de celular (QR, "14 de 18 votaram", "2 de 3
//    decidiram", prorrogação, faixa de entrada) desenhadas sobre um canal local
//    com alunos simulados, pelo mesmo ponto de encaixe que o modo online usa.
// 7. as seis equipes abertas: a tela de personas com a casa de cada uma, em
//    três linhas e sem nenhum texto sobreposto (também com a faixa de entrada),
//    e as páginas do placar final em 1024×768; com a barra escondida, nem o
//    aviso de operação nem o modal ficam na projeção;
// 8. "piloto automático" em nenhuma tela projetada (D-041; item 14), a cadeia
//    do "Escolha ou sorte?" com os totais sem sinal e as variações com + ou −
//    (item 11), e a história de cada equipe com a linha curta em primeira
//    pessoa de cada mês (D-045; item 12).
// 10. esquema v3 (D-060), com N rodadas (6 bimestres na fixture v3: `npm run
//    e2e -- --config test/fixtures/config-teste-v3.json`): "saldo do bimestre"
//    no resultado, a marca de cada rodada na linha do tempo com o nome curto
//    ("Jan–fev") ou, se não couber, o número, a história em páginas de até 3
//    rodadas, "No fim dos 12 meses", "pior caso estimado" quando o placar é
//    simulado, e a tela de personas com uma persona por equipe (parte 7);
// 11. as decisões da revisão da F6a: a dívida é sempre a total (cheque especial
//    + empréstimo), com "caixa R$ X" quando o caixa é positivo; nenhum contorno
//    de destaque no resultado; a parcela do empréstimo detalhada só no celular.
// 12. D-066 e D-067 (parte 8, fixture v3.1 com o limite do cheque especial):
//    no resultado, a dívida (banco + empréstimo) e, numa linha própria, as
//    contas atrasadas e o que faltou na mesa; a frase da proteção acima do
//    trabalho; no placar final, o saldo pelo patrimônio (menos as contas
//    atrasadas) e a linha "Faltou na mesa no ano" por equipe; na história, a
//    comida que faltou, a multa e os juros do atraso e, no fim, as contas
//    atrasadas e o que faltou na mesa. Seis equipes em 1024×768, sem rolagem.
// 9. esquema v2.1, com as seis equipes e a carta mais cara que cada uma podia
//    tirar em cada mês (parte 4): o resultado enxuto cabendo em 1024×768, com
//    um vão entre as faixas, e a história com o custo real da carta ("N dias
//    parado · renda perdida R$ X · gastos R$ Y", D-052), os gastos fora do
//    "entrou" e o empréstimo como dívida (a equipe 1 o pega); e a história com
//    o texto da opção do jeito do ofício da persona (rotuloPor/narrativaPor,
//    D-054), quando o config o traz.
// As funções passadas a page.evaluate/waitForFunction rodam no navegador, e não
// no Node: os globais delas são os da página.
/* global document, innerWidth, innerHeight, NodeFilter, getComputedStyle, SVGElement, requestAnimationFrame, DataTransfer, DragEvent */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';

const V = await carregarNucleo();
await import(pathToFileURL(join(RAIZ, 'js/ui/formatar.js')).href);
const F = globalThis.Viracao.formatar;

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const URL_TELAO = pathToFileURL(join(RAIZ, 'telao', 'index.html')).href;
const TAMANHOS = [[1024, 768], [1920, 1080]];
const MIN_FONTE = 28;
const ROTEIRO = '60min';
const LETRAS = 'ABCD';
// O mesmo critério do telão para achar o bloco do mapa (js/telao.js, ehMapa).
const RE_MAPA = /^mapa do semin[aá]rio\b/i;

// ---------- Conteúdo ----------

function caminhoDoConfig() {
  const i = process.argv.indexOf('--config');
  const arg = i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length);
  return resolve(RAIZ, process.env.VIRACAO_CONFIG || arg || 'config.json');
}

const lista = (x) => (Array.isArray(x) ? x : Object.values(x || {}));
const CAMINHO_CONFIG = caminhoDoConfig();
const TEXTO_ORIGINAL = readFileSync(CAMINHO_CONFIG, 'utf8');
// Sem o BOM do começo (o validador aceita, com aviso; o JSON.parse, não).
const brutoConfig = JSON.parse(TEXTO_ORIGINAL.charCodeAt(0) === 0xfeff ? TEXTO_ORIGINAL.slice(1) : TEXTO_ORIGINAL);
let injetouMapa = false;
{
  const passos = brutoConfig.roteiros?.[ROTEIRO] || [];
  if (!passos.some((p) => p.tipo === 'bloco' && RE_MAPA.test(p.titulo || ''))) {
    passos.splice(passos.findIndex((p) => p.tipo === 'bloco') + 1, 0, { tipo: 'bloco', titulo: 'Mapa do seminário', alvoSeg: 120 });
    injetouMapa = true;
  }
}
// Sem injeção, o arquivo vai como está (BOM e acentos inclusive).
const TEXTO_CONFIG = injetouMapa ? JSON.stringify(brutoConfig, null, 1) : TEXTO_ORIGINAL;
const ARQUIVO_CONFIG = { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(TEXTO_CONFIG) };

const CONFIG_PADRAO = (() => {
  const r = V.validarConfig.validarTexto(TEXTO_CONFIG);
  assert.ok(r.ok, `o config do e2e precisa ser válido (${CAMINHO_CONFIG}): ${JSON.stringify(r.erros.slice(0, 5))}`);
  return r.config;
})();
const configNode = CONFIG_PADRAO;
console.log(`Config: ${CAMINHO_CONFIG}${injetouMapa ? ' (com um bloco "Mapa do seminário" acrescentado ao roteiro 60min)' : ''}`);

const PASSOS = V.roteiro.passos(configNode, ROTEIRO);
const achar = (teste) => PASSOS.findIndex(teste);
const I_ANTES = achar((p) => p.tipo === 'enquete' && p.momento === 'antes');
const I_FORMAR = achar((p) => p.tipo === 'formarEquipes');
const I_R1 = achar((p) => p.tipo === 'rodada');
const RODADAS = PASSOS.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
const PASSO_TERMOMETRO = PASSOS.find((p) => p.tipo === 'enquete' && p.momento === 'unico');
// Esquema v3 (D-060): 3 rodadas mensais (config de 30/09) ou 6 bimestrais.
assert.ok(I_ANTES >= 0 && I_FORMAR > I_ANTES && I_R1 > I_FORMAR && RODADAS.length >= 3 && PASSO_TERMOMETRO, `o roteiro ${ROTEIRO} tem enquete antes, formação, 3 rodadas ou mais e termômetro`);
// O período de cada rodada ("bimestre" com mesesPorRodada 2), refeito aqui e
// não com o historia.js da tela.
const mesesDe = (cfg) => (Number.isInteger(cfg.regras.mesesPorRodada) ? cfg.regras.mesesPorRodada : 1);
const doPeriodoDe = (cfg) => ({ 1: 'do mês', 2: 'do bimestre', 3: 'do trimestre', 6: 'do semestre' }[mesesDe(cfg)] ?? `do período de ${mesesDe(cfg)} meses`);
const MESES = mesesDe(configNode);
const DO_PERIODO = doPeriodoDe(configNode);
// O período do config carregado no telão agora (a parte 6 troca pela fixture v2.1, mensal).
let doPeriodoNaTela = DO_PERIODO;
// A história em páginas de até 3 rodadas (js/telao.js, RODADAS_POR_PAGINA_HISTORIA).
const RODADAS_POR_PAGINA = 3;
console.log(`  ${RODADAS.length} rodadas de ${MESES} ${MESES === 1 ? 'mês' : 'meses'}`);
const ENQ_ANTES = configNode.enquetes[PASSOS[I_ANTES].enquete];
const AFIRM_ANTES = lista(ENQ_ANTES.ordemAfirmacoes);
const ENQ_TERMOMETRO = configNode.enquetes[PASSO_TERMOMETRO.enquete];
const EQUIPES = lista(configNode.ordem.equipes);
const OBRIGATORIA = EQUIPES.find((id) => configNode.equipes[id].obrigatoria);
const FECHADA = [...EQUIPES].reverse().find((id) => !configNode.equipes[id].obrigatoria);
const ATIVAS = EQUIPES.filter((id) => id !== FECHADA);
const opcoesDe = (r) => lista(configNode.rodadas[r].ordemOpcoes);
const letraDe = (r, op) => LETRAS[opcoesDe(r).indexOf(op)];
const numeroDe = (eq) => EQUIPES.indexOf(eq) + 1;
const nomes = Object.fromEntries(EQUIPES.map((eq) => [eq, `${numeroDe(eq)} ${configNode.equipes[eq].nome}`]));

// A decisão de cada equipe em cada rodada: todas as opções aparecem, e a última
// equipe ativa fica no piloto automático na primeira e na terceira rodadas.
const plano = Object.fromEntries(RODADAS.map((r, k) => [r, Object.fromEntries(ATIVAS.flatMap((eq, i) => (
  k !== 1 && i === ATIVAS.length - 1 ? [] : [[eq, opcoesDe(r)[(i + k) % opcoesDe(r).length]]]
)))]));

// Contagens à mão, determinísticas por afirmação e momento.
const contagemDe = (k) => [0, 1, 2, 3, 4].map((i) => 1 + ((k * 7 + i * 3) % 5));
const contagens = {
  antes: Object.fromEntries(AFIRM_ANTES.map((a, k) => [a, contagemDe(k)])),
  unico: Object.fromEntries(lista(ENQ_TERMOMETRO.ordemAfirmacoes).map((a, k) => [a, contagemDe(k + 3)])),
  depois: Object.fromEntries(AFIRM_ANTES.map((a, k) => [a, contagemDe(k + 6)])),
};

// O que o telão escreve, recalculado aqui (a mesma regra da tela, js/telao.js).
// Refeito aqui, e não pelo F da página: "7,43%" com as casas que a fonte usa
// (revisão de 29/09; o decimal() de uma casa dava 7,4%).
function descreverPasso(p) {
  if (!p) return null;
  if (p.tipo === 'bloco') return p.titulo || 'Apresentação';
  if (p.tipo === 'rodada') return configNode.rodadas[p.rodada].titulo;
  if (p.tipo === 'enquete') return [configNode.enquetes[p.enquete].titulo, { antes: 'antes', depois: 'depois' }[p.momento]].filter(Boolean).join(' · ');
  return { lobby: 'Entrada na sala', formarEquipes: 'Formação das equipes', personas: 'As personas', placarFinal: 'Placar final', comparativo: `Comparativo · ${configNode.enquetes[p.enquete]?.titulo || ''}`, fim: 'Fim' }[p.tipo];
}
// Esquema v2.1: os gastos (conserto, remédio, multa) numa linha própria, fora
// do "entrou"; entrou − gastos − básico − juros = o saldo do mês.
// D-059: o que a proteção pagou vem logo depois do "entrou" (fora dele).
function textoContas(mes, gastos = null) {
  const partes = [`entrou ${F.moeda(mes.entrou)}`];
  if (mes.protecao > 0) partes.push(`a\u00a0proteção pagou ${F.moeda(mes.protecao)}`);
  if (mes.gastos > 0) partes.push((gastos || [{ rotulo: 'gastos', valor: mes.gastos }]).map((p) => `${p.rotulo} ${F.moeda(p.valor)}`).join(' + '));
  // D-066: com o limite, o básico é o que a casa consumiu, e a comida que não
  // deu para comprar vem entre parênteses; a multa e os juros do atraso (a
  // mora) vêm depois dos juros do banco. A conta lida continua fechando no
  // saldo do motor.
  const mesa = Math.round(mes.faltouNaMesa ?? 0);
  // Revisão da F6c: o que a casa ficou sem (itens semAtraso: gás, ônibus,
  // remédio) também não saiu do caixa; sai do básico, como a comida, e vem
  // logo depois ("ficou sem R$ Z"). Até 05/10 o config.json não marcava nenhum
  // item e esta conta não o previa: com a proposta 3(a), a história do telão
  // mostrava a conta certa e a conferência esperava o básico cheio.
  const semComprar = Math.round(mes.ficouSem ?? 0);
  const consumido = mes.basico - mesa - semComprar;
  partes.push(mesa > 0 ? `básico ${F.moeda(consumido)} (faltou na mesa ${F.moeda(mesa)})` : `básico ${F.moeda(consumido)}`);
  if (semComprar > 0) partes.push(`ficou sem ${F.moeda(semComprar)}`);
  if (mes.juros > 0) partes.push(`juros ${F.moeda(mes.juros)}`);
  const multa = Math.round(mes.multa ?? 0);
  const mora = Math.round(mes.mora ?? 0);
  if (multa + mora > 0) partes.push(`${multa > 0 && mora > 0 ? 'multa e juros do atraso' : multa > 0 ? 'multa do atraso' : 'juros do atraso'} ${F.moeda(multa + mora)}`);
  partes.push(mes.saldoMes < 0 ? `faltou ${F.moeda(-mes.saldoMes)}` : `sobrou ${F.moeda(mes.saldoMes)}`);
  return partes.join(' · ');
}
// D-052: o custo real da carta, só com o que for maior que zero; os gastos da
// carta ficam de fora quando são todos os gastos do mês (a linha das contas já
// os diz, e o mesmo valor duas vezes não cabia em 1024×768 com seis equipes).
function textoCusto(custo, mes, cartaNosGastos = false) {
  if (!custo) return null;
  const partes = [];
  if (custo.diasParado > 0) partes.push(`${custo.diasParado} ${custo.diasParado === 1 ? 'dia parado' : 'dias parado'}`);
  if (custo.rendaPerdida > 0) partes.push(`renda perdida ${F.moeda(custo.rendaPerdida)}`);
  // "gastos da carta": ao lado de "gastos R$ X" do mês, dois "gastos" de
  // valores diferentes confundiam (revisão de 29/09, 2ª rodada, achado 13).
  if (custo.gastos > 0 && !cartaNosGastos && custo.gastos !== mes.gastos) partes.push(`gastos da carta ${F.moeda(custo.gastos)}`);
  return partes.length > 0 ? partes.join(' · ') : null;
}
// O que veio dos meses anteriores (motor, deAntes), com sinal: "fratura: mais
// 25 dias parado −R$ 2.233" (revisão de 29/09, 2ª rodada, achado 10).
const textoDeAntes = (itens) => lista(itens).map((x) => `${x.rotulo} ${F.moeda(x.valor, { sinal: true })}`);
// O que a linha nomeia (a mesma regra da tela, historia.nomesDosGastos,
// refeita aqui): o que veio de antes no trabalho, sempre; os gastos por origem
// dentro das contas, positivos e somando os gastos do mês: a carta sem nome
// ("gastos R$ 1.079"), os gastos da opção e os gerais da rodada sem condição
// ou só com a da persona (o curso de gel), os de antes (a multa) e, se faltar,
// "outros gastos". Revisão da F7 (achado 9): com um gasto de opção, a tela
// caía no jeito antigo, e a multa saía "−R$ 130" e contada duas vezes.
function gastosDoConfigEsperados(cfg, { equipeId, rodadaId, decisao }) {
  const persona = cfg.equipes[equipeId]?.persona;
  const rodada = cfg.rodadas[rodadaId] || {};
  const vale = (se) => !se || (Object.keys(se).every((k) => k === 'persona') && [].concat(se.persona).includes(persona));
  return [...lista(rodada.opcoes?.[decisao]?.efeitos), ...lista(rodada.efeitosGerais)]
    .filter((e) => e.categoria === 'gasto' && e.soma?.renda < 0 && vale(e.se))
    .map((e) => ({ rotulo: e.rotulo, valor: -e.soma.renda }));
}
function nomesEsperados(cfg, quem, custo, mes, deAntes) {
  const itens = lista(deAntes);
  const trabalho = itens.filter((x) => !x.gasto);
  const daCarta = custo?.gastos > 0 ? [{ rotulo: null, valor: custo.gastos }] : [];
  const deAntesGastos = itens.filter((x) => x.gasto).map((x) => ({ rotulo: x.rotulo, valor: -x.valor }));
  for (const doConfig of [gastosDoConfigEsperados(cfg, quem), []]) {
    const partes = [...daCarta, ...doConfig, ...deAntesGastos];
    const resto = (mes.gastos || 0) - partes.reduce((t, p) => t + p.valor, 0);
    if (resto < -0.5) continue;
    if (resto > 0.5) partes.push({ rotulo: 'outros gastos', valor: resto });
    if (partes.length === 0) break;
    const gastos = partes.map((p, i) => (i > 0 ? p : { rotulo: !p.rotulo ? 'gastos' : partes.length > 1 ? `gastos: ${p.rotulo}` : p.rotulo, valor: p.valor }));
    assert.equal(gastos.reduce((t, p) => t + p.valor, 0), mes.gastos || 0, 'as parcelas dos gastos somam os gastos do mês');
    return { antes: trabalho, gastos, cartaNosGastos: daCarta.length > 0 };
  }
  return { antes: trabalho, gastos: null, cartaNosGastos: false };
}
// D-054: a opção do jeito do ofício da persona aparece na história quando o que
// a história mostra (a narrativa, ou o rótulo sem ela) difere do texto comum.
function temTextoDoOficio(r, o, persona) {
  const op = configNode.rodadas[r].opcoes[o];
  return ((op.narrativaPor?.[persona] ?? op.narrativa) ?? (op.rotuloPor?.[persona] ?? op.rotulo)) !== (op.narrativa ?? op.rotulo);
}
// Os valores em reais de um texto da tela, na ordem ("−R$ 4.150" → −4150).
// Cada mês da história projetada contra historia.historiaDaEquipe (que já traz
// o texto do ofício da persona, D-054, e o custo real da carta, D-052):
// - com narrativa, a linha curta em primeira pessoa (opção e carta), em no
//   máximo duas linhas e nunca abaixo de 28 px; o que não couber termina em
//   reticências no fim (D-045 e item 12). Sem narrativa no config, os rótulos
//   ("escolheram: … · aconteceu: …");
// - o custo da carta e as contas do mês, com os gastos fora do "entrou".
// O texto da opção esperado sai do config cru (rotuloPor/narrativaPor da
// persona, senão o comum), e não do textoDaOpcao: a conferência não pode usar a
// mesma função que a tela. Devolve quantos meses mostraram um texto que só
// aquela persona tem.
const cortadasNaHistoria = [];
function conferirMesesDaHistoria(eq, historia, meses, resultados, cfg = configNode) {
  assert.deepEqual(meses.map((m) => m.rodada), historia.map((h) => h.rodadaId), `${eq}: um mês por rodada jogada`);
  const persona = cfg.equipes[eq].persona;
  let doOficio = 0;
  for (const [i, h] of historia.entries()) {
    const lido = meses[i];
    const onde = `${eq}/${h.rodadaId}`;
    const decisao = resultados[h.rodadaId][eq].decisao;
    const op = cfg.rodadas[h.rodadaId].opcoes[decisao];
    const esperado = { rotulo: op.rotuloPor?.[persona] ?? op.rotulo, narrativa: op.narrativaPor?.[persona] ?? op.narrativa ?? null };
    assert.deepEqual(h.opcao, esperado, `${onde}: a opção dita do jeito do ofício da persona (D-054)`);
    // O que a história mostra da opção é a narrativa, ou o rótulo sem ela.
    if ((esperado.narrativa ?? esperado.rotulo) !== (op.narrativa ?? op.rotulo)) doOficio += 1;
    const linha = V.historia.linhaDoMes(h);
    assert.equal(lido.narrativa, linha, `${onde}: a narrativa do mês na história`);
    if (linha) {
      assert.ok(lido.linhas >= 1 && lido.linhas <= 2, `${onde}: a narrativa em até duas linhas (${lido.linhas})`);
      assert.ok(lido.fonte >= MIN_FONTE - 0.01, `${onde}: a narrativa em ${lido.fonte} px`);
      if (lido.cortada) cortadasNaHistoria.push(onde);
    } else {
      assert.equal(lido.fatos, `escolheram: ${h.opcao.rotulo} · aconteceu: ${h.carta.titulo}`, `${onde}: sem narrativa, os rótulos`);
    }
    const nomes = nomesEsperados(cfg, { equipeId: eq, rodadaId: h.rodadaId, decisao }, h.cartaCusto, h.mes, h.deAntes);
    // A multa (gasto de antes) nunca aparece com sinal entre o que veio de antes.
    assert.ok(!lido.deAntes.some((t) => /multa/.test(t)), `${onde}: a multa só dentro dos gastos (${JSON.stringify(lido.deAntes)})`);
    assert.equal(lido.custo, textoCusto(h.cartaCusto, h.mes, nomes.cartaNosGastos), `${onde}: o custo real da carta na história`);
    assert.deepEqual(lido.deAntes, textoDeAntes(nomes.antes), `${onde}: o que veio de antes na história`);
    assert.equal(lido.contas, textoContas(h.mes, nomes.gastos), `${onde}: as contas do mês na história`);
    // O empréstimo do mês, como dívida, depois das contas (esquema v2.2).
    assert.equal(lido.emprestimo, h.mes.emprestimo > 0 ? `pegou empréstimo de ${F.moeda(h.mes.emprestimo)}` : null, `${onde}: o empréstimo na história`);
    // D-067: a frase da proteção acima do trabalho, só no mês em que aconteceu.
    assert.equal(lido.acima, fraseAcimaEsperada(cfg, eq, resultados[h.rodadaId][eq]), `${onde}: a frase da D-067 na história`);
  }
  return doOficio;
}
// A última linha da história: o saldo (o patrimônio) e, com dívida, quanto é e
// quanto dela é.
// Revisão da F6a: a dívida é sempre a total, o caixa positivo vem como "caixa
// R$ X" junto dela (sem dívida, o "sobrou" já é o caixa), e as parcelas do
// empréstimo ficam só no celular. Esquema v3: "No fim dos 12 meses" (rodadas ×
// meses por rodada), e cada página do meio termina com "Depois de 6 meses: …",
// pelo "depois" da última rodada dela.
// D-066: com o limite, depois da dívida (banco + empréstimo) vêm as contas
// atrasadas e o que faltou na mesa até ali, cada um com o próprio nome.
const textoDividaECaixa = (v) => {
  const divida = Math.round(dividaEsperada(v)) + 0;
  const caixa = Math.round(v.renda) > 0 ? Math.round(v.renda) : 0;
  const atrasadas = Math.round(v.contas_atrasadas ?? 0);
  const mesa = Math.round(v.faltou_na_mesa ?? 0);
  return [
    divida > 0 ? ` · dívida ${F.moeda(divida)}` : '',
    divida > 0 && caixa > 0 ? ` · caixa ${F.moeda(caixa)}` : '',
    atrasadas > 0 ? ` · contas atrasadas ${F.moeda(atrasadas)}` : '',
    mesa > 0 ? ` · faltou na mesa ${F.moeda(mesa)}` : '',
  ].join('');
};
function conferirFinalDaHistoria(eq, lida, realizado, placarEq, resultados, rodadas = RODADAS, mesesPorRodada = MESES) {
  const jogadas = rodadas.filter((r) => resultados[r]?.[eq]);
  const meses = jogadas.length * mesesPorRodada;
  const esperado = `No fim ${meses === 1 ? 'do mês' : `dos ${meses} meses`}: ${textoSaldo(realizado)}${textoDividaECaixa(placarEq)}`;
  assert.equal(lida.final, esperado, `${eq}: a última linha da história`);
  assert.ok(!/parcela/.test(lida.final), `${eq}: a parcela do empréstimo não aparece no telão (fica no celular)`);
  // As páginas do meio: "Depois de N meses", com o patrimônio, a dívida e o
  // caixa do fim da última rodada da página.
  const esperadasParciais = [];
  for (let k = RODADAS_POR_PAGINA; k < jogadas.length; k += RODADAS_POR_PAGINA) {
    const depois = resultados[jogadas[k - 1]][eq].depois;
    esperadasParciais.push(`Depois de ${k * mesesPorRodada === 1 ? '1 mês' : `${k * mesesPorRodada} meses`}: ${textoSaldo(patrimonioEsperado(depois))}${textoDividaECaixa(depois)}`);
  }
  assert.deepEqual(lida.parciais, esperadasParciais, `${eq}: a última linha de cada página do meio da história`);
}
// D-059: o config tem alguma opção que protege? Com ela, o placar ganha a
// página "O pior que podia acontecer" depois do "Escolha ou sorte?".
const temProtecao = (cfg) => Object.values(cfg.rodadas).some((r) => Object.values(r.opcoes).some((o) => o.protege === true));
const escolheuProtecao = (cfg, resultados, eq) => Object.entries(resultados).some(([r, doMes]) => cfg.rodadas[r]?.opcoes[doMes?.[eq]?.decisao]?.protege === true);
// A página "O pior que podia acontecer", lida na tela.
const lerPiorCaso = () => page.evaluate(() => ({
  titulo: document.querySelector('#palco h1').textContent,
  kicker: document.querySelector('#palco .kicker')?.textContent ?? '',
  estimados: document.querySelectorAll('.piores-casos .historia-escolha[data-estimado="1"]').length,
  linhas: Object.fromEntries(Array.from(document.querySelectorAll('.piores-casos .historia-escolha'), (n) => [n.dataset.equipe, {
    pior: n.dataset.pior ?? null, piorSem: n.dataset.piorSem ?? null, evitou: n.dataset.evitou ?? null, texto: n.querySelector('.historia-conta')?.textContent ?? null,
  }])),
}));
// O que a página precisa dizer de cada equipe, a partir do placar gravado:
// o pior caso com as escolhas e, só para quem escolheu uma proteção que
// MELHOROU o pior caso, sem ela e quanto ela evitou. Quem escolheu uma
// proteção que não melhorou (o MEI com a sessão acabando antes do mês 3, a
// associação) vê um texto neutro, sem número: o "sem" nunca aparece melhor que
// o "com" (revisão da F5, achado 1). Devolve quantas mostraram o "sem".
function conferirPiorCaso(lido, cfg, placar, resultados, equipes) {
  assert.equal(lido.titulo, 'O pior que podia acontecer');
  const estimados = equipes.filter((eq) => placar[eq].estimado === true).length;
  assert.equal(lido.estimados, estimados, 'data-estimado nas linhas do placar simulado');
  assert.equal(lido.kicker, estimados > 0 ? 'Placar final · pior caso estimado' : 'Placar final', 'o kicker diz "pior caso estimado" só quando o motor simulou');
  assert.deepEqual(Object.keys(lido.linhas).sort(), [...equipes].sort(), 'uma linha por equipe que jogou');
  let comSem = 0;
  for (const eq of equipes) {
    const pior = Math.round(placar[eq].piorCaso) + 0;
    const sem = Math.round(placar[eq].piorCasoSemProtecao) + 0;
    const protegeu = escolheuProtecao(cfg, resultados, eq);
    const mostra = protegeu && sem < pior;
    let depois = ' · não escolheram proteção';
    if (mostra) depois = ` · sem a proteção: ${F.moeda(sem)} · a proteção evitou ${F.moeda(pior - sem)}`;
    else if (protegeu) depois = ' · a proteção não melhorou o pior caso';
    const texto = `com as escolhas de vocês: ${F.moeda(pior)}${depois}`;
    assert.deepEqual(lido.linhas[eq], { pior: String(pior), piorSem: mostra ? String(sem) : null, evitou: mostra ? String(pior - sem) : null, texto }, `${eq}: o pior caso com e sem a proteção`);
    if (lido.linhas[eq].piorSem !== null) assert.ok(Number(lido.linhas[eq].piorSem) < Number(lido.linhas[eq].pior), `${eq}: o "sem" nunca é melhor que o "com"`);
    if (mostra) comSem += 1;
  }
  return comSem;
}
const reaisDoTexto = (t) => [...t.matchAll(/([−+]?)R\$\s?([\d.]+)/g)].map((m) => (m[1] === '−' ? -1 : 1) * Number(m[2].replace(/\./g, '')));
const textoSaldo = (renda) => (renda < 0 ? `faltou ${F.moeda(-renda)}` : `sobrou ${F.moeda(renda)}`);
function tituloSaldo(naoFecharam, total) {
  if (naoFecharam === 0) return total === 1 ? 'A equipe fechou as contas' : `As ${total} equipes fecharam as contas`;
  return `${naoFecharam} de ${total} equipes não ${naoFecharam === 1 ? 'fechou' : 'fecharam'} as contas`;
}
// O placar conta o empréstimo como dívida (esquema v2.2): o saldo de uma equipe
// é o patrimônio (renda − empréstimo a pagar), e a dívida, o cheque especial
// mais o saldo devedor. Conta refeita aqui, e não com o historia.js da tela.
// Esquema v3.1 (D-066): menos as contas atrasadas também (o "faltou na mesa"
// não entra: não é dívida). A dívida da tela continua sendo a do banco mais o
// empréstimo; as contas atrasadas têm linha própria.
const patrimonioEsperado = (v) => v.renda - Math.max(0, v.emprestimo ?? 0) - Math.max(0, v.contas_atrasadas ?? 0) + 0;
const dividaEsperada = (v) => Math.max(0, -v.renda) + Math.max(0, v.emprestimo ?? 0);

// ---------- Resultado da rodada enxuto (D-065, teste de 30/09) ----------

// A linha curta da carta de parada: "20 dias parado · perdeu R$ 1.787". Carta
// sem dias parados não escreve nada (o custo em dinheiro está no saldo).
// Revisão da F7 (achado 11): "perdeu" é o prejuízo inteiro da carta, a renda
// perdida MAIS os gastos dela (a embreagem, o celular novo). Só com a renda, o
// Marcos "perdeu R$ 287" numa carta que custou R$ 1.887.
function textoParada(custo) {
  if (!(custo?.diasParado > 0)) return null;
  const dias = `${custo.diasParado} ${custo.diasParado === 1 ? 'dia parado' : 'dias parado'}`;
  const perdeu = (custo.rendaPerdida || 0) + (custo.gastos || 0);
  return perdeu > 0 ? `${dias} · perdeu ${F.moeda(perdeu)}` : dias;
}
// O que a faixa de uma equipe precisa mostrar, a partir do resultado gravado:
// a carta, a letra da decisão e o empréstimo tomado no mês (revisão de 30/09,
// achado 9: duas equipes do Jonas com a mesma carta tinham saldos diferentes
// sem explicação), a parada, o que a proteção pagou (D-059), a origem (quando
// não é a maioria), o saldo do mês com sinal (o zero neutro, "R$ 0", achado
// 16) e a dívida total de depois do mês.
// D-066: com o limite, uma linha embaixo do dinheiro com as contas atrasadas
// (no fim do período) e o que faltou na mesa NESTE período. D-067: a frase da
// proteção acima do trabalho na largura da faixa, e então "a proteção pagou"
// sai do detalhe (a frase já diz o valor).
function faixaEsperada(x, origem, cfg, rodadaId, eq) {
  const saldo = Math.round(x.mes.saldoMes) + 0;
  const divida = dividaEsperada(x.depois);
  const letra = 'ABCDEFGHIJ'[lista(cfg.rodadas[rodadaId].ordemOpcoes).indexOf(x.decisao)];
  const acima = fraseAcimaEsperada(cfg, eq, x);
  const atrasadas = Math.round(x.depois.contas_atrasadas ?? 0);
  const mesa = Math.round(x.mes.faltouNaMesa ?? 0);
  const limite = [atrasadas > 0 ? `contas atrasadas ${F.moeda(atrasadas)}` : null, mesa > 0 ? `faltou na mesa ${F.moeda(mesa)}` : null].filter(Boolean).join(' · ') || null;
  return {
    carta: x.carta,
    escolha: `decisão ${letra}`,
    emprestimo: x.mes.emprestimo > 0 ? `empréstimo ${F.moeda(x.mes.emprestimo)}` : null,
    custo: textoParada(x.cartaCusto),
    protecao: x.mes.protecao > 0 && !acima ? `a\u00a0proteção pagou ${F.moeda(x.mes.protecao)}` : null,
    origem,
    saldo: `${saldo < 0 ? '−' : saldo > 0 ? '+' : ''}${F.moeda(Math.abs(saldo))}`,
    sinal: saldo < 0 ? 'negativo' : saldo > 0 ? 'positivo' : 'zero',
    // Revisão da F6a: sem dívida e com caixa, só "caixa R$ X"; com os dois,
    // "dívida" e "caixa" em linhas próprias.
    divida: Math.round(divida) > 0 ? `dívida ${F.moeda(divida)}` : Math.round(x.depois.renda) > 0 || atrasadas > 0 ? null : 'sem dívida',
    caixa: Math.round(x.depois.renda) > 0 ? `caixa ${F.moeda(x.depois.renda)}` : null,
    limite,
    acima,
  };
}
// D-067, refeita aqui (e não com o historia.js da tela): quando a proteção do
// período passou do que o trabalho deixa num período comum, "Auxílio do INSS
// (MEI): R$ 4.000, mais do que Dani ganhava trabalhando num bimestre comum
// (R$ 3.800).". O resultado leva protecaoAcimaDoTrabalho só nesse caso.
const NOME_DO_PERIODO = { 1: 'mês', 2: 'bimestre', 3: 'trimestre', 6: 'semestre' };
function fraseAcimaEsperada(cfg, eq, x) {
  const acima = x?.protecaoAcimaDoTrabalho;
  if (!acima || !(x.mes?.protecao > acima.trabalhoComum)) return null;
  const nomes = lista(x.protecaoItens).map((i) => i.rotulo);
  const oQue = nomes.length > 0 ? nomes.join(' e ') : 'a proteção';
  const nome = cfg.personas[cfg.equipes[eq].persona].nome;
  const periodo = NOME_DO_PERIODO[mesesDe(cfg)] ?? `período de ${mesesDe(cfg)} meses`;
  return `${oQue.charAt(0).toUpperCase()}${oQue.slice(1)}: ${F.moeda(x.mes.protecao)}, mais do que ${nome} ganhava trabalhando num ${periodo} comum (${F.moeda(acima.trabalhoComum)}).`;
}
const lerFaixas = () => page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('.cartao-resultado'), (c) => [c.dataset.equipe, {
  carta: c.dataset.carta,
  escolha: c.querySelector('.resultado-escolha')?.textContent ?? null,
  emprestimo: c.querySelector('.resultado-emprestimo')?.textContent ?? null,
  custo: c.querySelector('.resultado-custo')?.textContent ?? null,
  protecao: c.querySelector('.conta-protecao')?.textContent ?? null,
  origem: c.querySelector('.resultado-decisao')?.textContent ?? null,
  saldo: c.querySelector('.resultado-saldo')?.textContent ?? null,
  sinal: c.querySelector('.resultado-saldo')?.dataset.sinal ?? null,
  divida: c.querySelector('.resultado-divida')?.textContent ?? null,
  caixa: c.querySelector('.resultado-caixa')?.textContent ?? null,
  limite: c.querySelector('.resultado-limite')?.textContent ?? null,
  acima: c.querySelector('.resultado-acima')?.textContent ?? null,
  titulo: c.querySelector('.resultado-carta')?.textContent ?? null,
  encurtada: c.querySelector('.resultado-carta')?.dataset.encurtada === '1',
}])));
// Confere as faixas lidas contra o esperado. O nome da carta é o título do
// config, ou o curto quando o título não coube numa linha (encurtada).
function conferirFaixas(lidas, esperadas, cfg, onde) {
  const semTitulo = Object.fromEntries(Object.entries(lidas).map(([eq, l]) => [eq, Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'titulo' && k !== 'encurtada'))]));
  assert.deepEqual(semTitulo, esperadas, `${onde}: carta, decisão, empréstimo, parada, proteção, origem, saldo com sinal, dívida e caixa, por equipe`);
  for (const [eq, l] of Object.entries(lidas)) {
    const carta = cfg.cartas[l.carta];
    if (l.encurtada) assert.equal(l.titulo, carta.curto, `${onde}/${eq}: o título que não coube vira o curto (D-040)`);
    else assert.equal(l.titulo, carta.titulo, `${onde}/${eq}: o título da carta`);
  }
}
// Contraste WCAG a partir de cores rgb() do navegador.
function contrasteRgb(a, b) {
  const lum = (rgb) => {
    const [r, g, bl] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, escuro] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}
const rgbDe = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
// Textos que se sobrepõem no palco (a tela de personas parecia sobreposta no
// teste de 30/09): as caixas de cada linha de texto e de cada forma de equipe,
// duas a duas. Cada caixa de texto é reduzida à metade do meio da altura: a
// caixa que o navegador dá para o texto (ascendente + descendente) é mais alta
// que a entrelinha de 1,15, e linhas vizinhas se tocariam sem sobrepor nada.
const textoSobreposto = (seletor) => page.evaluate((sel) => {
  const caixas = [];
  for (const raiz of document.querySelectorAll(sel)) {
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode;
      if (!t.textContent.trim() || t.parentElement.getClientRects().length === 0) continue;
      const faixa = document.createRange();
      faixa.selectNodeContents(t);
      for (const r of faixa.getClientRects()) {
        if (r.width < 1) continue;
        caixas.push({ nome: t.textContent.trim().slice(0, 30), l: r.left + 1, r: r.right - 1, t: r.top + r.height * 0.25, b: r.bottom - r.height * 0.25 });
      }
    }
    for (const f of raiz.querySelectorAll('svg.forma')) {
      const r = f.getBoundingClientRect();
      caixas.push({ nome: `forma ${f.closest('[data-equipe]')?.dataset.equipe ?? ''}`, l: r.left + 1, r: r.right - 1, t: r.top + 1, b: r.bottom - 1 });
    }
  }
  const achados = [];
  for (let i = 0; i < caixas.length; i += 1) {
    for (let j = i + 1; j < caixas.length; j += 1) {
      const a = caixas[i];
      const b = caixas[j];
      if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) achados.push(`"${a.nome}" × "${b.nome}"`);
    }
  }
  return achados.slice(0, 6);
}, seletor);
// O resultado enxuto em cada tamanho de tela (chamado pelo conferirTela):
// - sem texto sobreposto, e as colunas alinhadas entre as faixas (subgrid);
// - um vão de pelo menos 8 px entre uma faixa e a seguinte;
// - o saldo com sinal, em verde (+) ou vermelho (−), a cor do token do
//   base.css, com contraste ≥ 4,5:1 sobre o fundo da faixa, e nunca abaixo do
//   corpo;
// - o detalhamento das contas fora do telão (fica no celular e na história).
const VAO_MIN_FAIXAS = 8;
// Até 1 px de diferença: o arredondamento de meio pixel entre faixas.
const espalhamento = (xs) => Math.max(...xs) - Math.min(...xs);
// "Escolha ou sorte?" em grade fixa (revisão da F7, achado 13 da revisão de
// conteúdo e legibilidade): cada equipe quebrava a conta num ponto diferente
// ("= terminaram com" na linha 2 de umas e na 3 de outras), e os números não
// ficavam em coluna. Agora toda equipe tem as mesmas linhas, com os mesmos
// passos em cada uma, e cada passo começa no mesmo x em todas as equipes.
async function conferirGradeDasEscolhas(onde) {
  const linhas = await page.evaluate(() => Array.from(document.querySelectorAll('.historias-escolha:not(.piores-casos) .historia-escolha'), (li) => {
    const topo = li.getBoundingClientRect().top;
    return Array.from(li.querySelectorAll(':scope > .equipe, .passo-conta'), (n) => {
      const r = n.getBoundingClientRect();
      return { topo: r.top - topo, x: r.left, altura: r.height, caixas: n.getClientRects().length };
    });
  }));
  assert.ok(linhas.length > 0 && linhas.every((l) => l.length === 5), `${onde}: a equipe e os quatro passos em cada linha (${JSON.stringify(linhas.map((l) => l.length))})`);
  // Cada passo numa linha só, sem quebrar por dentro.
  assert.ok(linhas.flat().every((p) => p.caixas === 1), `${onde}: um passo quebrou por dentro`);
  // A linha visual de cada passo, pelo centro vertical dentro da equipe: uma
  // linha nova quando o centro desce mais de meia altura de passo (a equipe,
  // com a forma, é um pouco mais alta que os passos).
  const padrao = (l) => {
    const centros = l.map((p) => p.topo + p.altura / 2);
    const inicios = [];
    for (const c of [...centros].sort((a, b) => a - b)) if (inicios.length === 0 || c - inicios.at(-1) > l[1].altura / 2) inicios.push(c);
    return centros.map((c) => inicios.filter((i) => c >= i - 0.5).length - 1).join(',');
  };
  const padroes = new Set(linhas.map(padrao));
  assert.equal(padroes.size, 1, `${onde}: as equipes quebram a conta em pontos diferentes (${[...padroes].join(' | ')})`);
  for (let k = 0; k < 5; k += 1) {
    assert.ok(espalhamento(linhas.map((l) => l[k].x)) <= 1, `${onde}: o passo ${k} não começa no mesmo x em todas as equipes (${linhas.map((l) => Math.round(l[k].x)).join(', ')})`);
  }
  // Revisão do voto (achado 7): o valor fica junto do rótulo. Com a segunda
  // coluna em 1fr, em 1920×1080 "→ a sorte:" ficava a ~1.200 px do valor, e a
  // conta se lia em diagonal. Cada coluna tem a largura do passo mais largo
  // dela (max-content), e não mais: o vão de um passo é só o que falta para ele
  // alcançar o mais largo. Antes, o teto era de 8 letras de vão, e com a sorte
  // ao acaso da parte 1 ("se não mudassem nada: −R$ 28.538" contra "→ a sorte:
  // +R$ 5", D-066) o vão natural chegava a 8,5 letras e o teste falhava sem
  // a coluna esticar.
  const passos = await page.evaluate(() => Array.from(document.querySelectorAll('.historias-escolha:not(.piores-casos) .passo-conta'), (p) => {
    const faixa = document.createRange();
    faixa.selectNodeContents(p.firstChild);
    const rotulo = faixa.getBoundingClientRect();
    const valor = p.querySelector('b').getBoundingClientRect();
    const caixa = p.getBoundingClientRect();
    const estilo = getComputedStyle(p);
    return { texto: p.firstChild.textContent.trim(), x: Math.round(caixa.left), largura: caixa.width, natural: rotulo.width + valor.width + parseFloat(estilo.columnGap || '0'), fonte: parseFloat(estilo.fontSize) };
  }));
  const colunas = Object.groupBy(passos, (q) => q.x);
  for (const [x, doX] of Object.entries(colunas)) {
    const largura = Math.max(...doX.map((q) => q.largura));
    const natural = Math.max(...doX.map((q) => q.natural));
    // Meia letra de folga: o espaço do fim do rótulo entra ou não na medida.
    assert.ok(largura <= natural + doX[0].fonte / 2, `${onde}: a coluna em x=${x} tem ${Math.round(largura)} px, e o passo mais largo dela, ${Math.round(natural)} px (a coluna esticou)`);
  }
}
async function conferirVisualDoResultado(onde) {
  // A entrada das cartas destacadas desloca a faixa (transform): as posições
  // só valem depois que a animação termina.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null))));
  const m = await page.evaluate(() => {
    const faixas = [...document.querySelectorAll('.cartao-resultado')];
    const rects = faixas.map((f) => f.getBoundingClientRect());
    const raiz = getComputedStyle(document.documentElement);
    return {
      vaos: rects.slice(1).map((r, i) => Math.round((r.top - rects[i].bottom) * 10) / 10),
      meio: faixas.map((f) => Math.round(f.querySelector('.resultado-meio').getBoundingClientRect().left)),
      dinheiro: faixas.map((f) => Math.round(f.querySelector('.resultado-dinheiro').getBoundingClientRect().right)),
      saldos: faixas.map((f) => {
        const s = f.querySelector('.resultado-saldo');
        return { equipe: f.dataset.equipe, texto: s.textContent, sinal: s.dataset.sinal, cor: getComputedStyle(s).color, fundo: getComputedStyle(f).backgroundColor, px: parseFloat(getComputedStyle(s).fontSize) };
      }),
      tokens: { positivo: raiz.getPropertyValue('--positivo').trim(), negativo: raiz.getPropertyValue('--negativo').trim() },
      corpo: parseFloat(getComputedStyle(document.body).fontSize),
      texto: document.getElementById('palco').textContent,
      legenda: document.querySelector('.resultado-legenda')?.textContent ?? '',
      contornos: faixas.map((f) => ({ grave: f.classList.contains('grave'), borda: getComputedStyle(f).borderTopColor, sombra: getComputedStyle(f).boxShadow })),
    };
  });
  assert.deepEqual(await textoSobreposto('#palco .grade-resultados'), [], `${onde}: texto sobreposto no resultado`);
  assert.ok(m.vaos.every((v) => v >= VAO_MIN_FAIXAS), `${onde}: o vão entre as faixas (${m.vaos.join(', ')} px) é de pelo menos ${VAO_MIN_FAIXAS} px`);
  assert.ok(espalhamento(m.meio) <= 1, `${onde}: a coluna da carta alinhada entre as faixas (${m.meio.join(', ')})`);
  assert.ok(espalhamento(m.dinheiro) <= 1, `${onde}: a coluna do saldo alinhada entre as faixas (${m.dinheiro.join(', ')})`);
  for (const s of m.saldos) {
    // O zero é neutro, sem "+" e na cor da letra (revisão de 30/09, achado 16).
    if (s.sinal === 'zero') {
      assert.match(s.texto, /^R\$\s?0$/, `${onde}/${s.equipe}: o saldo zero sem sinal ("${s.texto}")`);
      continue;
    }
    assert.match(s.texto, s.sinal === 'negativo' ? /^−R\$\s?[\d.]+$/ : /^\+R\$\s?[\d.]+$/, `${onde}/${s.equipe}: o saldo com o sinal ("${s.texto}")`);
    assert.equal(s.cor, rgbDe(m.tokens[s.sinal]), `${onde}/${s.equipe}: o saldo ${s.sinal} na cor --${s.sinal}`);
    const k = contrasteRgb(s.cor, s.fundo);
    assert.ok(k >= 4.5, `${onde}/${s.equipe}: contraste do saldo ${k.toFixed(2)}:1 (mínimo 4,5:1)`);
    assert.ok(s.px > m.corpo, `${onde}/${s.equipe}: o saldo em destaque (${s.px} px, corpo ${m.corpo} px)`);
  }
  assert.notEqual(m.tokens.positivo, m.tokens.negativo, 'verde e vermelho diferentes');
  // O termo seguido de valor, como as contas o escreviam ("entrou R$ 900"): o
  // título de uma carta pode ter a palavra ("O dono entrou com o despejo", D-066).
  for (const termo of ['entrou', 'básico', 'juros', 'multa']) assert.ok(!new RegExp(`${termo}\\s+[−+]?R\\$`).test(m.texto), `${onde}: "${termo}" saiu do resultado projetado (D-065)`);
  // Revisão da F6a: nenhum contorno de destaque sem legenda. As faixas que não
  // são graves têm todas a mesma borda, e nenhuma tem sombra por dentro.
  const bordas = new Set(m.contornos.filter((c) => !c.grave).map((c) => c.borda));
  assert.ok(bordas.size <= 1 && m.contornos.every((c) => c.sombra === 'none'), `${onde}: faixa com contorno de destaque (${JSON.stringify(m.contornos)})`);
  assert.equal(m.legenda, `saldo ${doPeriodoNaTela}`, `${onde}: o cabeçalho da coluna do saldo`);
}
// As personas em cada tamanho de tela: nenhum texto sobreposto e três linhas
// por persona (quem é, a casa, a conta do mês), cada uma sem quebrar.
async function conferirVisualDasPersonas(onde) {
  assert.deepEqual(await textoSobreposto('#palco .personas'), [], `${onde}: texto sobreposto nas personas`);
  const linhas = await page.evaluate(() => Array.from(document.querySelectorAll('.persona-linha'), (n) => ({
    persona: n.dataset.persona,
    alturas: ['.persona-quem', '.persona-casa', '.persona-mes'].map((s) => {
      const el = n.querySelector(s);
      return el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : 0;
    }),
  })));
  for (const l of linhas) assert.deepEqual(l.alturas, [1, 1, 1], `${onde}/${l.persona}: quem é, a casa e a conta do mês, uma linha cada`);
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
// Por file://, o fetch do config.json falha sempre (é o caminho previsto: o
// telão pede o arquivo). Esses dois avisos do navegador são esperados; qualquer
// outro erro reprova.
const ERRO_ESPERADO = [/Access to fetch at 'file:.*config\.json'.*CORS/, /Failed to load resource: net::ERR_FAILED/];
page.on('console', (m) => {
  if (m.type() === 'error' && !ERRO_ESPERADO.some((re) => re.test(m.text()))) errosDaPagina.push(`console: ${m.text()}`);
});
const downloads = [];
page.on('download', (d) => downloads.push(d));

// Só o que este e2e gera: as telas do telão ("nome-1024x768.png") e o
// estado-salvo.json. A pasta é dividida com o e2e:online (celular-*,
// online-telao-*) e o e2e:votos (votos-*): apagada inteira aqui, sumiam as
// capturas do celular, e a revisão da F7 só as viu rodando o online de novo
// (achado 12 da revisão de conteúdo e legibilidade).
const DESTE_E2E = /^(.+-\d+x\d+\.png|estado-salvo\.json)$/;
mkdirSync(CAPTURAS, { recursive: true });
for (const n of readdirSync(CAPTURAS)) if (DESTE_E2E.test(n)) rmSync(join(CAPTURAS, n), { force: true });

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

// Avança passo a passo até o estado pedido. aoPassar(e) roda em cada passo do
// caminho (os blocos da apresentação no meio, por exemplo), antes de avançar.
async function avancarAte(teste, descricao, { maximo = 8, aoPassar } = {}) {
  for (let i = 0; i < maximo; i += 1) {
    const e = await estado();
    if (teste(e)) return e;
    if (aoPassar) await aoPassar(e);
    const { indice, subfase } = e;
    await avancar();
    await esperarEstado((x) => x.indice !== indice || x.subfase !== subfase, `sair do passo ${indice}`);
  }
  return esperarEstado(teste, descricao);
}

// D-038: a barra só aparece com o mouse encostado na borda de baixo (ou com H).
async function mostrarBarra() {
  const { height } = page.viewportSize();
  await page.mouse.move(200 + Math.random() * 50, height - 12);
  await page.waitForFunction(() => !document.getElementById('barra').hidden);
}

const barraVisivel = () => page.evaluate(() => !document.getElementById('barra').hidden);

// D-040: dentro das fatias do sorteio, em cada tamanho, os rótulos visíveis não
// se sobrepõem, nenhum passa da própria fatia, e o texto tem contraste de pelo
// menos 4,5:1 sobre a fatia (na hachurada, sobre o halo que o contorna).
async function conferirRotulosFatias() {
  const vistos = new Set();
  for (const [largura, altura] of TAMANHOS) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a && document.querySelector('.grafico-fatias svg'), [largura, altura]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await page.evaluate(() => {
      const G = globalThis.Viracao.graficos;
      const hex = (cor) => {
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cor);
        return m ? '#' + m.slice(1, 4).map((x) => Number(x).toString(16).padStart(2, '0')).join('') : null;
      };
      const svg = document.querySelector('.grafico-fatias svg');
      const textos = Array.from(svg.querySelectorAll('text'));
      const caixas = textos.map((n) => n.getBoundingClientRect());
      const cruza = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const sobrepostos = [];
      for (let i = 0; i < caixas.length; i += 1) for (let j = i + 1; j < caixas.length; j += 1) if (cruza(caixas[i], caixas[j]) > 1) sobrepostos.push(`"${textos[i].textContent}" × "${textos[j].textContent}"`);
      const foraDaFatia = [];
      const semContraste = [];
      const curtos = [];
      textos.forEach((n, i) => {
        const fatia = svg.querySelector(`rect.fatia[data-linha="${n.dataset.linha}"][data-carta="${n.dataset.carta}"]`);
        if (!fatia) return foraDaFatia.push(`"${n.textContent}" sem fatia`);
        const f = fatia.getBoundingClientRect();
        const c = caixas[i];
        if (c.left < f.left - 0.5 || c.right > f.right + 0.5) foraDaFatia.push(`"${n.textContent}" (${Math.round(c.left)}–${Math.round(c.right)} fora de ${Math.round(f.left)}–${Math.round(f.right)})`);
        const estilo = getComputedStyle(n);
        const fundo = fatia.getAttribute('fill')?.startsWith('url(') ? hex(estilo.stroke) : hex(getComputedStyle(fatia).fill);
        const k = G.contraste(hex(estilo.fill), fundo);
        if (!(k >= 4.5)) semContraste.push(`"${n.textContent}" ${k.toFixed(2)}:1`);
        if (n.dataset.curto) curtos.push(n.dataset.curto);
      });
      // A fração da largura do gráfico da fatia mais larga de cada carta.
      const larguraSvg = svg.getBoundingClientRect().width;
      const larguras = {};
      for (const x of svg.querySelectorAll('rect.fatia')) {
        const w = x.getBoundingClientRect().width / larguraSvg;
        larguras[x.dataset.carta] = Math.max(larguras[x.dataset.carta] ?? 0, w);
      }
      return { sobrepostos, foraDaFatia, semContraste, curtos, larguras };
    });
    const tamanho = `${largura}×${altura}`;
    assert.deepEqual(r.sobrepostos, [], `fatias em ${tamanho}: rótulos sobrepostos`);
    assert.deepEqual(r.foraDaFatia, [], `fatias em ${tamanho}: rótulo fora da fatia`);
    assert.deepEqual(r.semContraste, [], `fatias em ${tamanho}: rótulo com contraste abaixo de 4,5:1`);
    for (const c of r.curtos) vistos.add(c);
    // Com 20 cartas e um curto só (a fixture v3), ele pode cair numa fatia fina
    // demais para qualquer texto: só quando alguma carta com curto tem uma fatia
    // de pelo menos 30% da largura o teste exige ver um nome dentro de uma fatia.
    if (Object.entries(r.larguras).some(([carta, w]) => configNode.cartas[carta]?.curto && w >= 0.3)) vistos.largaComCurto = true;
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => innerWidth === 1024);
  return vistos;
}

async function clicarBarra(acao) {
  await mostrarBarra();
  await page.click(`#barra [data-acao="${acao}"]`);
}

// Segura um botão da barra (os que apagam pedem 2 s). Com o mouse pressionado
// sobre ele, o botão fica com o foco, e a barra não some no meio (D-038).
async function segurarNaBarra(acao, ms = 2300) {
  await mostrarBarra();
  const caixa = await page.locator(`#barra [data-acao="${acao}"]`).boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function escolherNoModal(texto) {
  await page.waitForFunction(() => document.getElementById('modal').open);
  const botao = page.locator('#modal button').filter({ hasText: texto }).first();
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
  await page.setInputFiles('#arquivo-config', ARQUIVO_CONFIG);
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
    // Fora da tela, e também fora do próprio palco: com a faixa de entrada
    // embaixo, uma lista que transbordava o palco passava por cima da faixa sem
    // rolar a página (o resultado de 6 equipes, no redesenho de 29/09).
    const fora = [];
    const palco = document.getElementById('palco').getBoundingClientRect();
    const baixo = Math.min(innerHeight, palco.bottom);
    for (const el of document.querySelectorAll('#palco *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.bottom > baixo + 1 || r.left < -1 || r.top < -1)) {
        fora.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} (${Math.round(r.right)}, ${Math.round(r.bottom)} > ${Math.round(baixo)})`);
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

// D-047: nada que só o apresentador usa fica na projeção. Seletores e textos
// conferidos no #palco e na faixa de entrada (a abertura, antes de projetar,
// fica de fora):
// - qualquer [data-acao], input, select, textarea ou botão de segurar;
// - .dica-operador, [data-contagem-ativos], [data-barra-dica], .fim-acoes;
// - todo <button>, menos .cartao-equipe (formação das equipes) e .botao-letra
//   (a decisão registrada de cada equipe no offline): os dois são o que a turma
//   precisa ver (quais equipes jogam; o que cada equipe anunciou);
// - os textos de operação: Enter, Espaço, Shift, Ctrl, "tecla(s)", "segure",
//   "Exportar", "Apagar a sala", "A exportação", "C troca", "ativos /".
const SELETORES_OPERADOR = ['[data-acao]', 'input', 'select', 'textarea', '.botao-segurar', '.dica-operador', '[data-contagem-ativos]', '[data-barra-dica]', '.fim-acoes'];
const RE_TEXTO_OPERADOR = /\bEnter\b|\bEspaço\b|\bShift\b|\bCtrl\b|\bteclas?\b|\bsegure\b|Exportar|Apagar a sala|A exportação|C troca|ativos \//i;
async function controlesNaProjecao() {
  return page.evaluate(([seletores, fonte]) => {
    const achados = [];
    const raizes = ['palco', 'faixa'].map((id) => document.getElementById(id)).filter((x) => x && !x.hidden);
    for (const r of raizes) {
      for (const sel of seletores) for (const n of r.querySelectorAll(sel)) achados.push(`${sel} "${n.textContent.trim().slice(0, 40)}"`);
      for (const b of r.querySelectorAll('button')) if (!b.matches('.cartao-equipe, .botao-letra')) achados.push(`button "${b.textContent.trim().slice(0, 40)}"`);
      const m = new RegExp(fonte, 'i').exec(r.textContent);
      if (m) achados.push(`texto de operador "${m[0]}"`);
    }
    // Revisão de 29/09: o aviso flutuante (#aviso) e o modal ficavam fora da
    // varredura. Com a barra escondida, nenhum dos dois pode estar à vista: o
    // aviso de operação ("Enter encerra…", "Totais exportados…") mora junto da
    // barra, e o modal só existe enquanto o apresentador o usa.
    const barraEscondida = document.getElementById('barra').hidden;
    const aviso = document.getElementById('aviso');
    if (barraEscondida && !aviso.hidden && aviso.getClientRects().length > 0) achados.push(`aviso à vista com a barra escondida: "${aviso.textContent.slice(0, 50)}"`);
    if (document.getElementById('modal').open) achados.push('modal aberto na projeção');
    return achados;
  }, [SELETORES_OPERADOR, RE_TEXTO_OPERADOR.source]);
}

const verificadas = [];
// Em cada tamanho: redesenha, esconde a barra, mede, captura. aoMedir(onde)
// confere o que é próprio da tela (o resultado enxuto, as personas), no mesmo
// tamanho.
async function conferirTela(nome, { esperarMs = 0, criterios = true, aoMedir = null } = {}) {
  for (const [largura, altura] of TAMANHOS) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.waitForFunction(([l, a]) => innerWidth === l && innerHeight === a, [largura, altura]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (esperarMs) await page.waitForTimeout(esperarMs);
    // O aviso não é mais escondido à mão aqui: com a barra escondida, ele
    // precisa sumir sozinho (D-047), e controlesNaProjecao confere.
    if (!(await page.evaluate(() => document.getElementById('barra').hidden))) await page.keyboard.press('h');
    await page.waitForFunction(() => document.getElementById('barra').hidden || !document.body.classList.contains('em-sessao'));
    const m = await medir();
    await page.screenshot({ path: join(CAPTURAS, `${nome}-${largura}x${altura}.png`) });
    if (criterios) {
      assert.deepEqual(m.rolagem, { vertical: false, horizontal: false }, `${nome} em ${largura}×${altura}: a página rola. Fora da tela: ${m.fora.join('; ')}`);
      assert.deepEqual(m.pequenos, [], `${nome} em ${largura}×${altura}: texto abaixo de ${MIN_FONTE} px`);
      assert.deepEqual(m.fora, [], `${nome} em ${largura}×${altura}: elemento fora da tela`);
      assert.deepEqual(m.cortados, [], `${nome} em ${largura}×${altura}: texto cortado com reticências`);
      assert.deepEqual(await controlesNaProjecao(), [], `${nome} em ${largura}×${altura}: controle de operador fora da barra (D-047)`);
      assert.ok(!/piloto autom/i.test(await page.textContent('#palco')), `${nome}: "piloto automático" na tela (D-041)`);
      if (aoMedir) await aoMedir(`${nome} em ${largura}×${altura}`);
    }
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => innerWidth === 1024);
  // O redesenho do novo tamanho, antes de quem chama ler a tela.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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

// Offline, a próxima afirmação: no modo "todas", ↓ (ou Espaço) só troca a
// afirmação em foco; no "uma_por_vez", o Espaço abre a seguinte.
async function proximaAfirmacao(enq, k, tecla = 'ArrowDown') {
  const ordem = lista(enq.ordemAfirmacoes);
  if (enq.modo === 'uma_por_vez') {
    await avancarPara((e) => e.afirmacao === ordem[k], `afirmação ${ordem[k]}`);
    return;
  }
  if (tecla === 'Space') await avancar();
  else await page.keyboard.press(tecla);
  await page.waitForFunction(([i, n]) => document.querySelector('.kicker')?.textContent.includes(`afirmação ${i} de ${n}`), [k + 1, ordem.length]);
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

// "12. Placar final", e não o "2. " dentro do "12. ": o número do passo no começo.
const passoNoModal = (indice) => new RegExp(`^${indice + 1}\\. `);

// D-042 e rascunho, seção 7, item 15: a linha do tempo do bloco mostra o
// seminário inteiro, sem esconder passo. Se não couber, os passos depois do
// último mês viram um item só ("debrief, termômetro, medição, fechamento").
// "Você está aqui" no item do passo atual; o "a seguir" nomeia o item seguinte,
// que está na linha, à vista e marcado.
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
async function conferirLinhaDoTempo({ mapa, passos = PASSOS }) {
  const e = await estado();
  // Todo passo, menos a entrada na sala e a tela do fim.
  const visiveis = passos.filter((p) => p.tipo !== 'lobby' && p.tipo !== 'fim').map((p) => p.indice);
  const ultimaRodada = passos.findLast((p) => p.tipo === 'rodada').indice;
  const r = await page.evaluate(() => {
    const lt = document.querySelector('#palco .linha-tempo');
    if (!lt) return null;
    return {
      itens: Array.from(lt.querySelectorAll('[data-trecho]'), (n) => {
        const caixa = n.getBoundingClientRect();
        return {
          passos: n.dataset.passos.split(',').map(Number),
          atual: n.getAttribute('aria-current'),
          seguinte: n.dataset.seguinte === '1',
          rotulo: n.getAttribute('aria-label') ?? n.querySelector('.trecho-titulo')?.firstChild?.textContent ?? '',
          visivel: caixa.width > 0 && caixa.height > 0 && caixa.right <= innerWidth + 1 && caixa.bottom <= innerHeight + 1,
        };
      }),
      seguir: lt.querySelector('.linha-tempo-seguir')?.textContent ?? null,
      mapa: lt.classList.contains('linha-tempo-mapa'),
      texto: lt.textContent,
      rodadas: Array.from(lt.querySelectorAll('.linha-tempo-trilha > .trecho-rodada'), (n) => ({ texto: n.textContent, numero: n.dataset.numero, passos: n.dataset.passos })),
      compacta: lt.querySelector('.linha-tempo-trilha')?.dataset.compacta ?? '',
      visivel: lt.getBoundingClientRect().height > 0,
    };
  });
  assert.ok(r && r.visivel, `bloco ${e.indice}: sem a linha do tempo`);
  assert.deepEqual(r.itens.flatMap((x) => x.passos), visiveis, 'a linha do tempo traz o seminário inteiro, até o fim, na ordem, sem esconder passo');
  const final = r.itens.at(-1);
  if (final.passos.length > 1) {
    // Agrupado: só o que vem depois do último mês, num item só.
    assert.deepEqual(final.passos, visiveis.filter((i) => i > ultimaRodada), 'o item agrupado junta os passos depois do último mês');
    const { itens } = V.roteiro.linhaDoTempo(configNode, passos, { maxItens: 1 });
    assert.equal(final.rotulo, maiuscula(itens.at(-1).palavras.join(', ')), 'o item agrupado diz o que junta');
    if (final.passos.map((i) => passos[i].tipo).join() === 'placarFinal,enquete,enquete,comparativo,bloco') {
      assert.equal(final.rotulo, 'Debrief, termômetro, medição, fechamento');
    }
  }
  for (const x of r.itens.filter((i) => i.passos.length === 1)) assert.equal(x.rotulo, descreverPasso(passos[x.passos[0]]), `o item do passo ${x.passos[0]}`);
  const k = r.itens.findIndex((x) => x.atual === 'step');
  assert.equal(r.itens.filter((x) => x.atual === 'step').length, 1, 'um item só com "você está aqui"');
  assert.ok(r.itens[k].passos.includes(e.indice), '"você está aqui" no item do passo atual');
  assert.match(r.texto, /você está aqui/i);
  assert.ok(r.seguir.includes(`(${k + 1} de ${r.itens.length})`), `"${k + 1} de ${r.itens.length}" em "${r.seguir}"`);
  const seguinte = r.itens[k + 1];
  assert.deepEqual(r.itens.filter((x) => x.seguinte), seguinte ? [seguinte] : [], 'só o item do "a seguir" fica marcado na linha');
  if (seguinte) {
    assert.ok(r.seguir.includes(`a seguir: ${seguinte.rotulo}`), `"a seguir: ${seguinte.rotulo}" em "${r.seguir}"`);
    assert.ok(seguinte.visivel, `o item do "a seguir" (${seguinte.rotulo}) está à vista`);
  } else {
    assert.match(r.seguir, /é o último trecho/, 'no último item, sem "a seguir" para fora da linha');
  }
  assert.equal(r.mapa, mapa, mapa ? 'no "Mapa do seminário", a linha do tempo é o conteúdo principal' : 'nos outros blocos, a linha do tempo é discreta');
  if (mapa) for (const x of r.itens) assert.ok(r.texto.includes(x.rotulo), `o mapa traz "${x.rotulo}"`);
  // Esquema v3: na trilha, a rodada mensal diz "mês N"; a de mais de um mês, o
  // nome curto do período ("Jan–fev") ou, quando os seis nomes não cabem na
  // largura, o começo dele ("Jan", data-compacta="curto"). Só o número
  // (data-compacta="numero") fica para o título sem o traço do período, ou
  // para quando nem o começo cabe. Revisão da F7 (achado 13 da revisão de
  // conteúdo e legibilidade): em 1024×768 as marcas saíam "1"…"6", e o vínculo
  // com o calendário (D-060) sumia da tela; com o config do e2e, os bimestres
  // têm de aparecer pelo nome.
  if (!mapa) {
    const rodadasDoRoteiro = passos.filter((p) => p.tipo === 'rodada');
    assert.equal(r.rodadas.length, rodadasDoRoteiro.length, 'uma marca por rodada na trilha');
    for (const [i, x] of r.rodadas.entries()) {
      const passo = rodadasDoRoteiro[i];
      let esperado = `mês ${i + 1}`;
      if (MESES > 1) {
        const nome = (configNode.rodadas[passo.rodada].titulo || '').split(':')[0].trim();
        esperado = { '': nome, curto: nome.split(/[–-]/)[0].trim(), numero: String(i + 1) }[r.compacta];
      }
      assert.equal(x.texto, esperado, `a marca da rodada ${passo.rodada} na trilha (${r.compacta || 'inteira'})`);
    }
    if (MESES === 1) assert.equal(r.compacta, '', 'com rodadas mensais, a trilha não é compactada');
    const comTraco = rodadasDoRoteiro.every((p) => /[–-]/.test((configNode.rodadas[p.rodada].titulo || '').split(':')[0]));
    if (MESES > 1 && comTraco) assert.notEqual(r.compacta, 'numero', 'em 1024×768, a trilha nomeia os bimestres ("Jan"), e não só números');
  }
}

// ---------- Parte 1: sessão inteira sem celulares ----------

console.log(`Parte 1: sessão inteira do roteiro ${ROTEIRO}, sem celulares`);
await page.goto(URL_TELAO);
await esperarTela('abertura');
// O botão offline está lá desde a primeira pintura, mesmo antes do config.
assert.equal(await page.locator('button', { hasText: 'Começar sem celulares' }).count(), 1);

// Config com problema: a lista INTEIRA aparece e a sala não pode ser criada.
await page.setInputFiles('#arquivo-config', join(RAIZ, 'test', 'fixtures', 'config-json-quebrado.json'));
await page.waitForSelector('#erros-config');
assert.match(await page.textContent('#erros-config'), /JSON inválido/);
assert.equal(await page.isDisabled('[data-acao="comecar-offline"]'), true, 'config quebrado não cria sala');
const brutoComErros = structuredClone(brutoConfig);
const primeiroDe = (colecao, k = 0) => (Array.isArray(colecao) ? colecao[k] : colecao[Object.keys(colecao)[k]]);
primeiroDe(brutoComErros.cartas, 0).peso = -1;
primeiroDe(brutoComErros.equipes, 1).persona = 'ninguem';
primeiroDe(brutoComErros.cartas, 1).efeitos = [{ 'soma ': { renda: 1 } }]; // a chave com espaço
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
}, TEXTO_CONFIG);
await page.waitForSelector('#hash-config');
// E o seletor de arquivo, de novo, com o config do teste.
await carregarConfig();
const hashNaTela = await page.textContent('#hash-config');
assert.equal(hashNaTela, V.validarConfig.hash(configNode), 'o telão mostra o hash do config carregado');
// Por file:// o botão do modo com celulares nem aparece.
assert.equal(await page.locator('[data-acao="criar-online"]').count(), 0);
await conferirTela('abertura', { criterios: false });
await page.check(`input[name="roteiro"][value="${ROTEIRO}"]`);
await page.click('[data-acao="comecar-offline"]');
await esperarTela('lobby');
await conferirTela('lobby-offline');

// D-038: a barra do apresentador só aparece com H ou com o mouse na borda de
// baixo, e some sozinha 3 s depois de o mouse sair dela.
{
  assert.equal(await barraVisivel(), false, 'a barra não aparece sozinha ao começar a sessão');
  await page.mouse.move(400, 300);
  await page.mouse.move(520, 420);
  await page.waitForTimeout(400);
  assert.equal(await barraVisivel(), false, 'mouse no meio da tela não mostra a barra');
  await page.mouse.move(520, 768 - 70); // perto, mas fora da faixa de 48 px
  await page.waitForTimeout(300);
  assert.equal(await barraVisivel(), false, 'fora da faixa da borda, a barra continua escondida');
  await page.mouse.move(520, 768 - 10);
  await page.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 2000 });
  await page.mouse.move(520, 300);
  const saiu = Date.now();
  await page.waitForTimeout(1500);
  assert.equal(await barraVisivel(), true, 'a barra não some antes de 3 s');
  await page.waitForFunction(() => document.getElementById('barra').hidden, null, { timeout: 3000 });
  const durou = Date.now() - saiu;
  assert.ok(durou >= 2800 && durou <= 4200, `a barra some cerca de 3 s depois de o mouse sair da borda (${durou} ms)`);
  // H mostra a barra, e ela também some sozinha em 3 s (D-038: "some sozinha
  // depois de 3 s" vale para os dois jeitos de abrir). H com ela aberta esconde.
  await page.mouse.move(520, 300);
  await page.keyboard.press('h');
  await page.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 1000 });
  const abriuPeloH = Date.now();
  await page.waitForTimeout(1500);
  assert.equal(await barraVisivel(), true, 'aberta pelo H, a barra não some antes de 3 s');
  await page.waitForFunction(() => document.getElementById('barra').hidden, null, { timeout: 3500 })
    .catch(() => assert.fail('aberta pelo H, a barra não sumiu sozinha em 5 s'));
  const durouH = Date.now() - abriuPeloH;
  assert.ok(durouH >= 2800 && durouH <= 4500, `aberta pelo H, a barra some cerca de 3 s depois (${durouH} ms)`);
  await page.keyboard.press('h');
  await page.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 1000 });
  await page.keyboard.press('h');
  await page.waitForFunction(() => document.getElementById('barra').hidden, null, { timeout: 1000 });
  // Quem usa só o teclado: com o foco dentro da barra, ela não some no meio da
  // navegação por Tab.
  await page.keyboard.press('h');
  await page.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 1000 });
  await page.evaluate(() => document.querySelector('#barra button:not([disabled])')?.focus());
  await page.waitForTimeout(3600);
  assert.equal(await barraVisivel(), true, 'com o foco dentro dela, a barra fica aberta');
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForFunction(() => document.getElementById('barra').hidden, null, { timeout: 4500 })
    .catch(() => assert.fail('sem o foco dentro dela, a barra não sumiu em 4,5 s'));
  // Revisão da D-038, achado 3: o mouse parado na borda de baixo (para tirar o
  // cursor do caminho, ou antes do Alt+Tab) segurava a barra projetada por cima
  // do sorteio. Parado ali, ela some em 3 s; o próximo movimento na borda a traz.
  await page.mouse.move(530, 768 - 6);
  await page.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 2000 });
  const parou = Date.now();
  await page.waitForFunction(() => document.getElementById('barra').hidden, null, { timeout: 4500 })
    .catch(() => assert.fail('com o mouse parado na borda de baixo, a barra não sumiu em 4,5 s'));
  const parada = Date.now() - parou;
  assert.ok(parada >= 2800, `parado na borda, a barra some depois de cerca de 3 s, e não antes (${parada} ms)`);
  await page.mouse.move(540, 768 - 6);
  await page.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 2000 });
  await page.mouse.move(520, 300);
  await page.waitForFunction(() => document.getElementById('barra').hidden, null, { timeout: 4500 });
  // Os atalhos continuam valendo com a barra escondida: o Espaço logo abaixo
  // abre a enquete sem a barra ter aparecido.
}
// D-047: os controles que saíram da tela do fim estão na barra; o placar final
// não tem mais critério (tecla C) nem o interruptor "sem vencedor".
for (const acao of ['exportar', 'apagar']) assert.equal(await page.locator(`#barra [data-acao="${acao}"]`).count(), 1, `a barra tem o "${acao}"`);
assert.equal(await page.locator('#barra [data-acao="semVencedor"]').count(), 0, 'a barra não tem mais o "Sem vencedor"');

// Revisão da F2, achado 26: offline também há uma aba escritora só. Outra aba do
// mesmo navegador oferece "Retomar", mas a trava recusa; antes, as duas gravavam
// a árvore inteira no mesmo localStorage e uma apagava as apurações da outra.
{
  const aba2 = await contexto.newPage();
  aba2.on('pageerror', (e) => errosDaPagina.push(`aba 2 pageerror: ${e.message}`));
  await aba2.goto(URL_TELAO);
  await aba2.setInputFiles('#arquivo-config', ARQUIVO_CONFIG);
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

// Enquete "antes" (revelada só no comparativo)
await avancarAte((e) => e.indice === I_ANTES, 'enquete antes');
for (const [k, a] of AFIRM_ANTES.entries()) {
  if (k > 0) await proximaAfirmacao(ENQ_ANTES, k);
  await contarManual(contagens.antes[a]);
  await esperarManual(a, contagens.antes[a]);
  if (k === 0) {
    await conferirTela('enquete-votando-contadores');
    // Revisão da F2, achado 11: Enter com afirmações sem contagem pede
    // confirmação, com o foco no "Cancelar"; um segundo Enter cancela.
    const zeradas = AFIRM_ANTES.slice(1).map((_, i) => i + 2);
    const re = zeradas.length === 1 ? `afirmação ${zeradas[0]} está sem contagem` : `afirmações ${zeradas.join(', ')} estão sem contagem`;
    await page.keyboard.press('Enter');
    await page.waitForFunction((fonte) => document.getElementById('modal').open && new RegExp(fonte).test(document.getElementById('modal').textContent), re);
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

// Blocos (com a linha do tempo), formação das equipes e personas
const blocosVistos = new Set();
async function conferirBloco(e, sufixo = '') {
  if (e.tipo !== 'bloco') return;
  const mapa = RE_MAPA.test(PASSOS[e.indice].titulo || '');
  const tipo = mapa ? 'bloco-mapa' : (e.equipesTravadas ? 'bloco-com-placar' : 'bloco');
  if (blocosVistos.has(tipo + sufixo)) return;
  blocosVistos.add(tipo + sufixo);
  await esperarTela('bloco');
  await conferirLinhaDoTempo({ mapa });
  await conferirTela(tipo + sufixo);
}
await avancarAte((e) => e.tipo === 'formarEquipes', 'formar equipes', { aoPassar: (e) => conferirBloco(e) });
assert.ok(blocosVistos.has('bloco-mapa'), 'o "Mapa do seminário" passou pela tela');
await esperarEstado((e) => Object.keys(e.equipesAbertas || {}).length === EQUIPES.length, 'todas as equipes abertas');
await page.keyboard.press(`Digit${numeroDe(FECHADA)}`); // fecha a última equipe não obrigatória
await esperarEstado((e) => !e.equipesAbertas[FECHADA] && Object.keys(e.equipesAbertas).length === ATIVAS.length, `equipe ${FECHADA} fechada`);
if (OBRIGATORIA) {
  await page.keyboard.press(`Digit${numeroDe(OBRIGATORIA)}`);
  await page.waitForTimeout(300);
  assert.equal((await estado()).equipesAbertas[OBRIGATORIA], true, 'a equipe obrigatória continua aberta');
}
await conferirTela('formar-equipes');
await avancarPara((e) => e.tipo === 'personas' && e.equipesTravadas === true, 'personas');
await conferirTela('personas', { aoMedir: conferirVisualDasPersonas });
// D-044 e D-065 (teste de 30/09): cada persona em três linhas: as equipes
// (duas da mesma persona juntas, com "e"), o nome e o ofício; as pessoas em
// casa, o básico da casa e a outra renda (ou "sem outra renda"); e a conta de
// um mês comum (motor.mesComum), em vermelho quando não fecha.
async function conferirCasaDasPersonas(abertas, configNode = CONFIG_PADRAO) {
  // Num evaluate só, com a busca dentro: com o $$eval, um redesenho entre a
  // busca e a leitura deixava os nós fora do documento, e a cor lida vinha vazia.
  const lidas = await page.evaluate(() => Array.from(document.querySelectorAll('.persona-linha'), (n) => ({
    persona: n.dataset.persona,
    equipes: Array.from(n.querySelectorAll('.persona-equipes .equipe'), (x) => x.dataset.equipe),
    juntas: n.querySelectorAll('.persona-e').length,
    quem: n.querySelector('.persona-quem')?.textContent ?? '',
    casa: n.querySelector('.persona-casa')?.textContent ?? '',
    mes: n.querySelector('.persona-mes')?.textContent ?? '',
    sinal: n.querySelector('.persona-mes')?.dataset.sinal ?? null,
    cor: n.querySelector('.persona-mes') ? getComputedStyle(n.querySelector('.persona-mes')).color : null,
    fundo: getComputedStyle(document.body).backgroundColor,
  })));
  const tokens = await page.evaluate(() => ({ positivo: getComputedStyle(document.documentElement).getPropertyValue('--positivo').trim(), negativo: getComputedStyle(document.documentElement).getPropertyValue('--negativo').trim() }));
  // Na ordem das equipes, e não na das personas do config (revisão de 30/09,
  // achado 12: a tela saía "1 e 2, 5, 3, 4, 6").
  const esperadas = [...new Set(lista(configNode.ordem.equipes).filter((eq) => abertas.includes(eq)).map((eq) => configNode.equipes[eq].persona))];
  assert.deepEqual(lidas.map((l) => l.persona), esperadas, 'uma linha por persona com equipe aberta, na ordem das equipes');
  // A primeira equipe de cada linha cresce de cima para baixo. Com a persona
  // repetida em equipes que não são vizinhas (a fixture v3: 1 e 6 com o Rafa),
  // a 6 vem junto da 1, e só a primeira de cada linha manda na ordem.
  const numeros = lidas.map((l) => lista(configNode.ordem.equipes).indexOf(l.equipes[0]));
  assert.deepEqual(numeros, [...numeros].sort((a, b) => a - b), 'os números das equipes crescem de cima para baixo');
  for (const l of lidas) {
    const p = configNode.personas[l.persona];
    const suas = abertas.filter((eq) => configNode.equipes[eq].persona === l.persona);
    assert.deepEqual(l.equipes, suas, `${l.persona}: as equipes da persona, juntas`);
    assert.equal(l.juntas, suas.length - 1, `${l.persona}: duas equipes da mesma persona ligadas por "e"`);
    assert.ok(l.quem.includes(`${p.nome} · `), `${l.persona}: o nome e o ofício ("${l.quem}")`);
    const mes = V.motor.mesComum(configNode, suas[0]);
    const pessoas = p.familia.pessoas;
    const casa = [
      `${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'} em casa`,
      `básico da casa ${F.moeda(mes.basico)}`,
      p.outraRenda?.valor > 0 ? `outra renda ${F.moeda(p.outraRenda.valor)}` : 'sem outra renda',
    ].join(' · ');
    assert.equal(l.casa, casa, `${l.persona}: a casa`);
    const fecha = mes.saldoMes >= 0;
    assert.equal(l.mes, fecha ? `a conta do mês fecha: sobram ${F.moeda(mes.saldoMes)}` : `a conta do mês não fecha: faltam ${F.moeda(-mes.saldoMes)}`, `${l.persona}: a conta do mês comum`);
    assert.equal(l.sinal, Math.round(mes.saldoMes) > 0 ? 'positivo' : Math.round(mes.saldoMes) < 0 ? 'negativo' : 'zero');
    assert.equal(l.cor, rgbDe(tokens[l.sinal]), `${l.persona}: a conta do mês na cor --${l.sinal}`);
    assert.ok(contrasteRgb(l.cor, l.fundo) >= 4.5, `${l.persona}: contraste da conta do mês`);
  }
}
await conferirCasaDasPersonas(ATIVAS);

// As três rodadas, decididas pelo apresentador pela barra
let cartasR1 = null;
const downloadsAntesR = downloads.length;
const contasNaTela = {};

for (const r of RODADAS) {
  await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `rodada ${r}`, { aoPassar: (e) => conferirBloco(e) });
  if (r === RODADAS[0]) {
    // D-037: o Espaço abriu a rodada antes da hora. Ctrl+Z (com confirmação, foco
    // no "Cancelar") desfaz a abertura: sem voto, a tela volta ao passo anterior.
    const aberta = await estado();
    const anterior = PASSOS[aberta.indice - 1];
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => document.getElementById('modal').open && /Desfazer a abertura desta votação/.test(document.getElementById('modal').textContent));
    await page.keyboard.press('Enter'); // o foco está no "Cancelar"
    await page.waitForFunction(() => !document.getElementById('modal').open);
    assert.equal((await estado()).geracao, aberta.geracao, 'Enter na confirmação cancela');
    await page.keyboard.press('Control+z');
    await confirmarModal();
    const voltou = await esperarEstado((e) => e.indice === aberta.indice - 1, 'volta ao passo de antes da rodada');
    assert.deepEqual([voltou.tipo, voltou.subfase, voltou.rodada], [anterior.tipo, 'ativo', undefined]);
    await avancarPara((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `rodada ${r} de novo`);
    // D-043: até 4 opções, todas na tela, e nenhuma tendência nem seta.
    const opcoesNaTela = await page.$$eval('#palco .opcoes li', (ns) => ns.map((n) => n.dataset.opcao));
    assert.deepEqual(opcoesNaTela, opcoesDe(r), 'todas as opções da rodada, na ordem');
    const textoPalco = await page.textContent('#palco');
    for (const op of opcoesDe(r)) {
      const tendencia = configNode.rodadas[r].opcoes[op].tendencia;
      if (tendencia) assert.ok(!textoPalco.includes(tendencia), `a tendência da opção ${op} não aparece (D-043)`);
    }
    assert.ok(!/[↑↓↗↘⬆⬇▲▼]/.test(await page.textContent('#palco .opcoes')), 'sem setas nas opções');
  }
  for (const [eq, op] of Object.entries(plano[r])) await decidirPelaBarra(nomes[eq], letraDe(r, op));
  await esperarEstado((e) => Object.keys(e.forcadas || {}).length === Object.keys(plano[r]).length, `decisões de ${r} gravadas`);
  if (r === RODADAS[0]) {
    // Revisão da D-037, achado 1: offline, toda decisão é do apresentador, e o
    // Ctrl+Z apagava as decisões já registradas. A confirmação as cita, e o
    // anfitrião recusa sem mexer no estado.
    const decidida = await estado();
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => /não decidiu por nenhuma equipe/.test(document.getElementById('modal').textContent));
    await confirmarModal();
    await page.waitForFunction(() => /contando as decisões do apresentador\); não dá para desfazer a abertura/.test(document.getElementById('aviso')?.textContent || ''));
    const depois = await estado();
    assert.deepEqual([depois.geracao, depois.forcadas], [decidida.geracao, decidida.forcadas], 'as decisões do apresentador continuam lá');
    await conferirTela('rodada-decidindo');
    // A barra do apresentador, para revisão visual (fica fora dos critérios do
    // corpo do telão: é do apresentador, e some sozinha). A dica do passo (o
    // tempo mínimo de conversa, "Enter encerra") está nela, e não na projeção.
    await mostrarBarra();
    await page.screenshot({ path: join(CAPTURAS, 'barra-do-apresentador-1024x768.png') });
    assert.match(await page.textContent('[data-barra-passo]'), new RegExp(`^passo ${I_R1 + 1} de ${PASSOS.length} · `));
    assert.match(await page.textContent('#barra [data-barra-dica]'), /Tempo mínimo de conversa|Enter encerra/);
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
  if (r === RODADAS[0]) {
    // Achado 8: o contorno da fatia sorteada só aparece quando os ponteiros param.
    const contorno = () => page.evaluate(() => getComputedStyle(document.querySelector('.fatia-sorteada')).stroke);
    assert.match(await contorno(), /rgba\(0, 0, 0, 0\)|transparent|none/, 'a fatia sorteada não aparece contornada antes da parada');
    const linhas = await page.locator('.linha-rotulo-sorteio').count();
    assert.equal(await page.locator('.linha-graves').count(), linhas, 'cada equipe mostra a chance de carta grave');
    // A letra da decisão antes da chance (revisão de 30/09, achado 9): é ela
    // que mudou as fatias.
    assert.ok((await page.locator('.linha-graves').allTextContents()).every((x) => /^decisão [A-D] · cartas graves \d+%$/.test(x)));
    await page.waitForTimeout(3000);
    assert.equal(await contorno(), 'rgb(242, 242, 242)', 'contornada depois que os ponteiros param');
    // Achado 9: o salvamento automático não cobre o título com um aviso.
    for (let k = 0; k < 40 && downloads.length <= baixadosAntes; k += 1) await page.waitForTimeout(50);
    assert.ok(downloads.length > baixadosAntes, 'o JSON automático foi baixado');
    const aviso = await page.evaluate(() => ({ visivel: !document.getElementById('aviso').hidden, texto: document.getElementById('aviso').textContent }));
    assert.ok(!(aviso.visivel && /automaticamente/.test(aviso.texto)), `o salvamento automático não avisa na tela: "${aviso.texto}"`);
    assert.match(await page.textContent('[data-barra-salvo]'), new RegExp(`^estado salvo às \\d{2}:\\d{2} \\(${r}\\)$`));
    await conferirTela('rodada-sorteio', { esperarMs: 3200 });
    const curtosVistos = await conferirRotulosFatias();
    const aprovados = new Set(Object.values(configNode.cartas).map((c) => c.curto).filter(Boolean));
    if (curtosVistos.largaComCurto) assert.ok(curtosVistos.size > 0, 'pelo menos um rótulo curto aparece dentro de uma fatia larga');
    assert.ok([...curtosVistos].every((c) => aprovados.has(c)), `os rótulos vêm do "curto" do config (${[...curtosVistos].join(', ')})`);
  }
  await avancarPara((e) => e.subfase === 'resultado', `resultado de ${r}`);
  await esperarTela('rodada-resultado');
  if (r === RODADAS[0]) {
    await conferirTela('rodada-resultado', { esperarMs: 900, aoMedir: conferirVisualDoResultado });
    cartasR1 = await page.evaluate(() => Array.from(document.querySelectorAll('.cartao-resultado'), (c) => `${c.dataset.equipe}:${c.dataset.carta}`));
    // Desfazer (Ctrl+Z, com confirmação) e encerrar de novo: mesmas cartas.
    await page.keyboard.press('Control+z');
    await confirmarModal();
    await esperarEstado((e) => e.subfase === 'decidindo' && Object.keys(e.forcadas || {}).length === Object.keys(plano[r]).length, `${r} reaberta com as decisões`);
    await page.keyboard.press('Enter');
    await confirmarModal();
    await esperarEstado((e) => e.subfase === 'sorteio', `sorteio de ${r} de novo`);
    await avancarPara((e) => e.subfase === 'resultado', `resultado de ${r} de novo`);
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
  // D-065: por equipe, a carta, a parada, o saldo do mês com sinal e a dívida
  // total. Conferidos contra os resultados gravados no fim.
  contasNaTela[r] = await lerFaixas();
  contasNaTela[r].cabecalho = await page.textContent('#palco .tela-cabecalho');
  if (r !== RODADAS[0]) {
    const temDivida = Object.values(contasNaTela[r]).some((x) => x?.divida?.startsWith('dívida'));
    if (temDivida) await conferirTela(`rodada-resultado-divida-${r}`, { esperarMs: 900, aoMedir: conferirVisualDoResultado });
  }
  await page.waitForTimeout(300);
}
// D-015: um download automático do estado ao fim de cada rodada (uma apuração
// por rodada, mais a primeira refeita).
await page.waitForTimeout(500);
const automaticos = downloads.slice(downloadsAntesR).filter((d) => new RegExp(`viracao-estado-.*-(${RODADAS.join('|')})-`).test(d.suggestedFilename()));
assert.equal(automaticos.length, RODADAS.length + 1, `um JSON automático por apuração de rodada (vieram ${automaticos.length})`);

// Placar final em páginas (D-041): o saldo contra o básico, "escolha ou sorte?"
// e a história de cada equipe (D-045). O Espaço pagina dentro do passo; na
// última página, avança o roteiro.
await avancarAte((e) => e.tipo === 'placarFinal', 'placar final', { aoPassar: (e) => conferirBloco(e) });
await esperarTela('placar-final');
const paginaAtual = () => page.evaluate(() => {
  const s = document.querySelector('.tela-placar-final');
  return s ? { pagina: s.dataset.pagina, equipe: s.dataset.equipe ?? null } : null;
});
assert.deepEqual(await paginaAtual(), { pagina: 'saldo', equipe: null });
const saldoNaTela = await page.evaluate(() => ({
  titulo: document.querySelector('#palco h1').textContent,
  ordem: Array.from(document.querySelectorAll('.valor-saldo'), (n) => n.dataset.equipe),
  valores: Object.fromEntries(Array.from(document.querySelectorAll('.valor-saldo'), (n) => [n.dataset.equipe, n.textContent])),
  referencias: Array.from(document.querySelectorAll('.grafico-placar line.referencia'), (l) => `${l.dataset.referencia}:${l.dataset.linha}`),
}));
await conferirTela('placar-saldo');
await avancar();
await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'escolhas');
const escolhasNaTela = await page.evaluate(() => ({
  titulo: document.querySelector('#palco h1').textContent,
  kicker: document.querySelector('#palco .kicker')?.textContent ?? '',
  contas: Object.fromEntries(Array.from(document.querySelectorAll('.historia-escolha'), (n) => [n.dataset.equipe, n.querySelector('.historia-conta').textContent])),
  // O destaque é o passo inteiro ("= terminaram com R$ d") em negrito; nos
  // outros, só o valor é negrito.
  destaques: Array.from(document.querySelectorAll('.historia-escolha'), (n) => {
    const final = n.querySelector('.passo-final');
    const variacao = n.querySelector('.passo-variacao');
    return {
      texto: final?.textContent ?? null,
      peso: final ? Number(getComputedStyle(final).fontWeight) : 0,
      pesoVariacao: variacao ? Number(getComputedStyle(variacao).fontWeight) : 0,
    };
  }),
  legendas: document.querySelectorAll('#palco .legenda').length,
  texto: document.getElementById('palco').textContent,
}));
assert.equal(escolhasNaTela.titulo, 'Escolha ou sorte?');
assert.equal(escolhasNaTela.legendas, 0, '"escolha ou sorte?" sem legenda');
for (const termo of ['piloto automático', 'efeito das decisões']) assert.ok(!escolhasNaTela.texto.includes(termo), `o termo "${termo}" saiu da tela`);
// O total do fim, depois do "=", em destaque em cada linha (item 11).
for (const d of escolhasNaTela.destaques) {
  assert.match(d.texto ?? '', /^= terminaram com /, 'o total do fim entra com "="');
  assert.ok(d.peso >= 700 && d.pesoVariacao < 700, `o total do fim em destaque (${d.peso}), e as variações não (${d.pesoVariacao})`);
}
await conferirTela('placar-escolhas', { aoMedir: conferirGradeDasEscolhas });
// D-059: com proteção no config, a página do pior caso vem logo depois.
let piorNaTela = null;
if (temProtecao(configNode)) {
  await avancar();
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'pior');
  piorNaTela = await lerPiorCaso();
  await conferirTela('placar-pior');
}
// A história projetada de uma equipe (página 3 do placar final), lida na página.
const lerHistoria = () => page.evaluate(() => ({
  meses: Array.from(document.querySelectorAll('.historia-mes'), (n) => {
    const nar = n.querySelector('.historia-narrativa');
    const estilo = nar ? getComputedStyle(nar) : null;
    // A altura da narrativa sem o limite de linhas, numa cópia invisível da
    // mesma largura: o scrollHeight do line-clamp passa da altura por fração
    // de pixel mesmo sem cortar nada, e acusava corte em quase todo mês.
    const alturaCheia = () => {
      const copia = nar.cloneNode(true);
      Object.assign(copia.style, { display: 'block', webkitLineClamp: 'unset', position: 'absolute', visibility: 'hidden', width: `${nar.clientWidth}px` });
      n.appendChild(copia);
      const h = copia.getBoundingClientRect().height;
      copia.remove();
      return h;
    };
    return {
      rodada: n.dataset.rodada, texto: n.textContent, contas: n.querySelector('.historia-contas')?.textContent ?? null,
      custo: n.querySelector('.historia-custo')?.textContent ?? null,
      emprestimo: n.querySelector('.historia-emprestimo')?.textContent ?? null,
      acima: n.querySelector('.historia-acima')?.textContent ?? null,
      deAntes: Array.from(n.querySelectorAll('.de-antes'), (x) => x.textContent),
      fatos: n.querySelector('.historia-fatos')?.textContent ?? null,
      narrativa: nar?.textContent ?? null,
      // Quantas linhas a narrativa ocupa, e se o fim dela ficou de fora (as
      // reticências do line-clamp, só no fim).
      linhas: nar ? Math.round(nar.getBoundingClientRect().height / parseFloat(estilo.lineHeight)) : 0,
      cortada: nar ? alturaCheia() > nar.getBoundingClientRect().height + 2 : false,
      fonte: estilo ? parseFloat(estilo.fontSize) : 0,
    };
  }),
  final: document.querySelector('.historia-final:not(.historia-parcial)')?.textContent ?? null,
  parcial: document.querySelector('.historia-parcial')?.textContent ?? null,
  kicker: document.querySelector('#palco .kicker')?.textContent ?? '',
  partes: Number(document.querySelector('.tela-placar-final')?.dataset.partes),
}));
// Esquema v3: a história de uma equipe em páginas de até 3 rodadas (6
// bimestres, duas páginas). Avança por todas elas, confere cada uma em 1024×768
// e 1920×1080, e devolve os meses juntos, as linhas das páginas do meio e a
// última linha. Com mais de uma página, o kicker diz o trecho do ano ("Jan–fev
// a Mai–jun").
const rotuloCurto = (r, cfg = configNode) => (cfg.rodadas[r].titulo || '').split(':')[0].trim();
async function lerHistoriaInteira(eq, nome, cfg = configNode) {
  const junta = { meses: [], parciais: [], final: null };
  for (let k = 1; ; k += 1) {
    await avancar();
    await page.waitForFunction(([x, parte]) => {
      const s = document.querySelector('.tela-placar-final');
      return s?.dataset.pagina === 'historia' && s.dataset.equipe === x && s.dataset.parte === String(parte);
    }, [eq, k]);
    const lida = await lerHistoria();
    const trecho = lida.meses.map((m) => m.rodada);
    assert.ok(trecho.length >= 1 && trecho.length <= RODADAS_POR_PAGINA, `${eq}, página ${k}: de 1 a ${RODADAS_POR_PAGINA} rodadas (${trecho.length})`);
    const kicker = lida.partes > 1
      ? `A história da equipe · ${rotuloCurto(trecho[0], cfg)}${trecho.length > 1 ? ` a ${rotuloCurto(trecho.at(-1), cfg)}` : ''}`
      : 'A história da equipe';
    assert.equal(lida.kicker, kicker, `${eq}, página ${k}: o trecho do ano no kicker`);
    junta.meses.push(...lida.meses);
    await conferirTela(lida.partes > 1 ? `${nome}-${k}` : nome);
    if (k < lida.partes) {
      assert.equal(lida.final, null, `${eq}, página ${k}: a linha "No fim" só na última página`);
      junta.parciais.push(lida.parcial);
      continue;
    }
    assert.equal(lida.parcial, null, `${eq}: a última página termina com "No fim"`);
    junta.final = lida.final;
    return junta;
  }
}
const historiaNaTela = {};
for (const eq of ATIVAS) historiaNaTela[eq] = await lerHistoriaInteira(eq, `placar-historia-${eq}`);
// A última página avança o roteiro.
await avancarPara((e) => e.tipo !== 'placarFinal', 'sair do placar final');

// Termômetro (uma afirmação por vez, ao vivo) e a enquete "depois"
const afirmacoesTermometro = lista(ENQ_TERMOMETRO.ordemAfirmacoes);
await avancarAte((e) => e.tipo === 'enquete' && e.enquete === PASSO_TERMOMETRO.enquete && e.momento === 'unico', 'termômetro', { aoPassar: (e) => conferirBloco(e) });
for (const [i, t] of afirmacoesTermometro.entries()) {
  if (i > 0) await proximaAfirmacao(ENQ_TERMOMETRO, i);
  await contarManual(contagens.unico[t]);
  await esperarManual(t, contagens.unico[t]);
  if (i === 0) await conferirTela('termometro-ao-vivo');
}
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'termômetro apurado');
await esperarTela('enquete-apurada');
await conferirTela('termometro-apurado');

await avancarAte((e) => e.tipo === 'enquete' && e.momento === 'depois', 'enquete depois', { aoPassar: (e) => conferirBloco(e) });
// Achado 11: no modo "todas", o Espaço vai para a próxima afirmação (como no
// termômetro); na última, ele avisa que o Enter encerra a enquete inteira.
for (const [k, a] of AFIRM_ANTES.entries()) {
  if (k > 0) await proximaAfirmacao(ENQ_ANTES, k, 'Space');
  await contarManual(contagens.depois[a]);
  await esperarManual(a, contagens.depois[a]);
}
if (ENQ_ANTES.modo !== 'uma_por_vez') {
  await avancar();
  await page.waitForFunction(() => /última afirmação: Enter encerra a enquete inteira/.test(document.getElementById('aviso')?.textContent || ''));
  assert.equal((await estado()).subfase, 'votando', 'o Espaço na última afirmação não encerra nem avança');
}
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'depois apurado');

// Comparativo: mão levantada dos dois lados → sem pareamento, lado a lado
await avancarAte((e) => e.tipo === 'comparativo', 'comparativo', { aoPassar: (e) => conferirBloco(e) });
await esperarTela('comparativo');
assert.equal(await page.getAttribute('.tela-comparativo', 'data-caso'), 'sem_pareamento');
await conferirTela('comparativo-lado-a-lado');
for (let n = 2; n <= AFIRM_ANTES.length; n += 1) {
  await avancar();
  await page.waitForFunction(([k, total]) => document.querySelector('.kicker')?.textContent.includes(`afirmação ${k} de ${total}`), [n, AFIRM_ANTES.length]);
}
await avancarAte((e) => e.tipo === 'fim', 'fim', { aoPassar: (e) => conferirBloco(e, '-final') });
await esperarTela('fim');
await conferirTela('fim');

// Exportar totais (na barra, D-047): só agregados, sem nenhum uid
let esperaDownload = page.waitForEvent('download');
await clicarBarra('exportar');
const totais = await lerDownload(await esperaDownload);
assert.equal(totais.roteiro, ROTEIRO);
assert.ok(!JSON.stringify(totais).includes('apresentador-local'), 'a exportação não leva uid');
assert.deepEqual(totais.enquetes[ENQ_ANTES.id].antes.histogramas[AFIRM_ANTES[0]], contagens.antes[AFIRM_ANTES[0]]);
assert.equal(totais.enquetes[ENQ_ANTES.id].antes.metodo, 'manual');

// Salvar estado (barra) e conferir o que foi projetado contra o motor, no Node
esperaDownload = page.waitForEvent('download');
await clicarBarra('salvar');
const salvo = await lerDownload(await esperaDownload);
assert.equal(salvo.formato, 'viracao-estado');
for (const k of ['votosEnquete', 'decisoes', 'presenca', 'membros']) assert.ok(!(k in salvo.dados), `o estado salvo não leva ${k}`);
const { sementes, resultados, placar } = salvo.dados;
const estadoNode = Object.fromEntries(ATIVAS.map((eq) => [eq, V.motor.estadoInicial(configNode, eq)]));
const jogadas = Object.fromEntries(ATIVAS.map((eq) => [eq, []]));
let viuJuros = false;
let viuDivida = false;
for (const [k, r] of RODADAS.entries()) {
  for (const eq of ATIVAS) {
    const opcao = plano[r][eq] ?? configNode.rodadas[r].padrao;
    // O histórico (decidiu/sorteou, D-043): as rodadas anteriores desta equipe.
    const historico = V.motor.historicoDe(resultados, eq, RODADAS.slice(0, k));
    const res = V.motor.resolverRodada(configNode, { equipeId: eq, rodadaId: r, opcaoId: opcao, estado: estadoNode[eq], semente: sementes[r], historico });
    assert.equal(resultados[r][eq].decisao, opcao, `${r}/${eq}: decisão`);
    assert.equal(resultados[r][eq].origem, plano[r][eq] ? 'apresentador' : 'piloto', `${r}/${eq}: origem`);
    assert.equal(resultados[r][eq].carta, res.carta, `${r}/${eq}: a carta sai da semente gravada`);
    assert.deepEqual(resultados[r][eq].depois, res.depois, `${r}/${eq}: indicadores depois da rodada`);
    assert.deepEqual(resultados[r][eq].mes, res.mes, `${r}/${eq}: as contas do mês gravadas`);
    assert.deepEqual(resultados[r][eq].cartaCusto, res.cartaCusto, `${r}/${eq}: o custo real da carta gravado (D-052)`);
    // O que foi projetado no resultado da rodada (D-065). Offline, a decisão
    // do apresentador não é dita; a do padrão, sim, sem "piloto automático"
    // (D-041; rascunho, seção 7, item 14).
    conferirFaixas({ [eq]: contasNaTela[r][eq] }, { [eq]: faixaEsperada({ ...res, decisao: opcao }, plano[r][eq] ? null : 'ninguém votou', configNode, r, eq) }, configNode, `${r}/${eq}`);
    assert.deepEqual(resultados[r][eq].deAntes ?? [], res.deAntes, `${r}/${eq}: o que veio de antes, gravado`);
    // D-059: o que a proteção pagou, gravado só quando houve.
    assert.equal(resultados[r][eq].protecaoEvitou ?? 0, res.protecaoEvitou, `${r}/${eq}: protecaoEvitou gravado`);
    assert.deepEqual(resultados[r][eq].protecaoItens ?? [], res.protecaoItens, `${r}/${eq}: protecaoItens gravado`);
    if (res.mes.juros > 0) viuJuros = true;
    if (dividaEsperada(res.depois) > 0) viuDivida = true;
    assert.ok(contasNaTela[r].cabecalho.includes(`saldo ${DO_PERIODO}`), `${r}: o cabeçalho diz que o número grande é o saldo ${DO_PERIODO} ("${contasNaTela[r].cabecalho}")`);
    estadoNode[eq] = res.depois;
    jogadas[eq].push({ rodadaId: r, opcaoId: opcao, cartaId: res.carta });
  }
}
if (CAMINHO_CONFIG.endsWith('config-teste-v2.json')) assert.ok(viuJuros && viuDivida, 'a fixture v2 exercita a dívida e os juros');
assert.equal(placar[FECHADA].ativa, false, 'a equipe fechada não joga');
// Página 1: saldo dos 3 meses, ordenado, com "faltou/sobrou" e o título
// calculado. O saldo é o patrimônio (esquema v2.2): o empréstimo é dívida.
const ordemEsperada = ATIVAS.slice().sort((a, b) => patrimonioEsperado(placar[b]) - patrimonioEsperado(placar[a]) || numeroDe(a) - numeroDe(b));
assert.deepEqual(saldoNaTela.ordem, ordemEsperada, 'página 1: equipes ordenadas pelo saldo');
assert.equal(saldoNaTela.titulo, tituloSaldo(ATIVAS.filter((eq) => patrimonioEsperado(placar[eq]) < 0).length, ATIVAS.length), 'página 1: título calculado');
// A referência com persona atravessa só as linhas das equipes dessa persona.
const referenciasEsperadas = lista(configNode.ordem.referencias).flatMap((id) => {
  const ref = configNode.referencias[id];
  return ordemEsperada.flatMap((eq, i) => (!ref.persona || configNode.equipes[eq].persona === ref.persona ? [`${id}:${i}`] : []));
});
assert.deepEqual(saldoNaTela.referencias, referenciasEsperadas, 'página 1: referência só nas equipes da persona dela');
for (const eq of ATIVAS) {
  const d = V.motor.decompor(configNode, { equipeId: eq, rodadas: jogadas[eq] });
  const p = placar[eq];
  // O caixa e o empréstimo gravados são os do fim do último mês; o realizado
  // do motor é o patrimônio (renda − empréstimo a pagar).
  assert.deepEqual([p.renda, p.emprestimo ?? 0], [estadoNode[eq].renda, estadoNode[eq].emprestimo ?? 0], `${eq}: caixa e empréstimo do placar = os do fim do último mês`);
  assert.ok(Math.abs(patrimonioEsperado(p) - d.realizado) < 1e-6, `${eq}.patrimônio: gravado ${patrimonioEsperado(p)}, motor ${d.realizado}`);
  for (const [campo, esperado] of [['piloto', d.esperadoPiloto], ['efeitoDecisoes', d.efeitoDecisoes], ['sorte', d.sorte], ['piorCaso', d.piorCaso], ['piorCasoSemProtecao', d.piorCasoSemProtecao]]) {
    assert.ok(Math.abs(p[campo] - esperado) < 1e-6, `${eq}.${campo}: gravado ${p[campo]}, motor ${esperado}`);
  }
  // Esquema v3: a simulação do telão é a mesma do Node (semente do hash do config).
  assert.equal(p.estimado === true, d.estimado, `${eq}: estimado no placar = o do motor`);
  assert.equal(saldoNaTela.valores[eq], textoSaldo(d.realizado), `${eq}: página 1, "faltou/sobrou" projetado`);
  // Página 2: a conta contada como história.
  // Em reais inteiros que fecham a conta (revisão de 29/09): cada valor do
  // motor arredondado sozinho errava a soma por R$ 1 em ~15% das equipes.
  const c = V.historia.escolhaOuSorte({ piloto: d.esperadoPiloto, efeitoDecisoes: d.efeitoDecisoes, sorte: d.sorte, renda: d.realizado });
  // Rascunho, seção 7, item 11: os totais sem sinal de variação (nunca "+"),
  // as variações sempre com + ou −, e o total do fim com "=".
  const conta = `se não mudassem nada: ${F.moeda(c.piloto)} → as escolhas: ${F.variacao(c.escolhas)} → a sorte: ${F.variacao(c.sorte)} = terminaram com ${F.moeda(c.total)}`;
  assert.equal(escolhasNaTela.contas[eq], conta, `${eq}: página 2, escolha ou sorte`);
  assert.match(escolhasNaTela.contas[eq], /^se não mudassem nada: −?R\$\s?[\d.]+ → as escolhas: [+−]R\$\s?[\d.]+ → a sorte: [+−]R\$\s?[\d.]+ = terminaram com −?R\$\s?[\d.]+$/, `${eq}: totais sem "+", variações com sinal`);
  const [lPiloto, lEscolhas, lSorte, lTotal] = reaisDoTexto(escolhasNaTela.contas[eq]);
  assert.equal(lPiloto + lEscolhas + lSorte, lTotal, `${eq}: página 2, as parcelas projetadas somam o "terminaram com"`);
  // Páginas da história: um item por mês, com a escolha, a carta e as contas.
  conferirMesesDaHistoria(eq, V.historia.historiaDaEquipe(configNode, eq, resultados), historiaNaTela[eq].meses, resultados);
  conferirFinalDaHistoria(eq, historiaNaTela[eq], d.realizado, p, resultados);
}

if (piorNaTela) conferirPiorCaso(piorNaTela, configNode, placar, resultados, ATIVAS);
{
  const estimado = ATIVAS.some((eq) => placar[eq].estimado === true);
  assert.equal(escolhasNaTela.kicker, estimado ? 'Placar final · valores estimados por simulação' : 'Placar final', '"Escolha ou sorte?": o kicker diz quando os valores são estimados');
  if (RODADAS.length >= 6) assert.ok(estimado, 'com 6 rodadas, o placar é estimado (simulação do motor)');
}
if (cortadasNaHistoria.length > 0) console.log(`  história: narrativa com reticências em ${cortadasNaHistoria.join(', ')}`);

// Apagar a sala (na barra, segurar 2 s): volta à abertura e limpa o navegador
const chave = await page.evaluate(() => globalThis.Viracao.telao.chaveSessao(globalThis.Viracao.telao.sala()));
await clicarBarra('apagar'); // clique curto não apaga
await page.waitForTimeout(300);
assert.equal(await telaAtual(), 'fim', 'um clique curto não apaga a sala');
await segurarNaBarra('apagar');
await esperarTela('abertura');
assert.equal(await page.evaluate((k) => localStorage.getItem(k), chave), null, 'a sala sai do localStorage');

// Carregar estado: o JSON salvo retoma a sessão onde parou
const caminhoSalvo = join(RAIZ, 'e2e', 'capturas', 'estado-salvo.json');
await (await downloads.filter((d) => /-manual-/.test(d.suggestedFilename())).at(-1)).saveAs(caminhoSalvo);
await page.setInputFiles('#arquivo-estado', caminhoSalvo);
await esperarTela('fim');
assert.equal((await estado()).tipo, 'fim');
await segurarNaBarra('apagar');
await esperarTela('abertura');

// ---------- Parte 2: as telas com celulares, sobre alunos simulados ----------

console.log('Parte 2: telas com celulares (alunos simulados num canal local)');
// O mesmo ponto de encaixe que o modo online vai usar (ligarSessao com um
// canal pronto). O canal local imita as regras do banco, e cada "aluno" é uma
// visão autenticada como outro uid.
await page.evaluate(async (roteiro) => {
  const V2 = globalThis.Viracao;
  // Relógio parado: a regra exige presença e entrada com a hora exata do
  // servidor, e com Date.now o milissegundo pode virar entre o marcador e a
  // gravação.
  const agoraFixo = Date.now();
  const canal = V2.canalLocal.criar({ relogio: () => agoraFixo });
  globalThis.__canalTeste = canal;
  await V2.telao.ligarSessao({ modo: 'online', canal, sala: 'K7Q2', nomeRoteiro: roteiro, criar: true });
  const base = 'salas/K7Q2';
  globalThis.__alunos = [];
  for (let i = 0; i < 14; i += 1) {
    const uid = `aluno-${String(i).padStart(2, '0')}`;
    const c = canal.comoUsuario(uid);
    await c.gravar({ [`${base}/membros/${uid}`]: { entrouEm: c.marcadorDeHora() } });
    await c.gravar({ [`${base}/presenca/${uid}`]: c.marcadorDeHora() });
    globalThis.__alunos.push({ uid, c });
  }
}, ROTEIRO);
await esperarTela('lobby');
await page.waitForFunction(() => document.querySelector('.lobby-conectados b')?.textContent === '14');
// Controle de inativos (arquitetura, seção 10): "N ativos / M membros" é do
// apresentador e fica só na barra (D-047); o lobby projeta os conectados. O
// sumiço e o "Remover inativos" são provados contra o emulador, no e2e:online
// (aqui o relógio do canal é fixo).
assert.equal(await page.locator('#palco [data-contagem-ativos]').count(), 0, 'o "ativos / membros" não fica na projeção');
assert.equal(await page.textContent('#barra [data-contagem-ativos]'), '14 ativos / 14 membros');
assert.equal(await page.locator('#barra [data-acao="removerInativos"]').count(), 1, 'a barra tem o "Remover inativos"');
assert.match(await page.textContent('.lobby-url'), /\/aluno\/\?sala=K7Q2$/, 'a URL do QR termina em /aluno/?sala=XXXX');
assert.ok(await page.evaluate(() => document.querySelector('.lobby-qr svg path')?.getAttribute('d').length > 1000), 'o QR foi desenhado');
await conferirTela('lobby-com-celulares');

// Os celulares votam só nas afirmações abertas (a regra recusa as outras).
async function votarAntes(sala, alunos, quantos, valor) {
  await page.evaluate(async ([s, nomeAlunos, n, ordem, v0]) => {
    const e = globalThis.Viracao.telao.estado();
    const abertas = e.afirmacao === '*' ? ordem : [e.afirmacao];
    for (const [i, { uid, c }] of globalThis[nomeAlunos].entries()) {
      if (i >= n) break;
      for (const a of abertas) await c.gravar({ [`salas/${s}/votosEnquete/${e.enquete}/${e.momento}/${a}/${uid}`]: v0 === null ? 1 + (i % 5) : v0 + i });
    }
  }, [sala, alunos, quantos, AFIRM_ANTES, valor]);
}

await avancarPara((e) => e.tipo === 'enquete' && e.momento === 'antes', 'enquete antes (celulares)');
await votarAntes('K7Q2', '__alunos', 11, null); // 3 não votam
await page.waitForFunction(() => /11\s*de 14 votaram/.test(document.querySelector('.enquete-status')?.textContent || ''));
assert.equal(await page.locator('#faixa').isVisible(), true, 'a faixa de entrada aparece com a entrada aberta');
await conferirTela('enquete-votando-celulares');
await page.keyboard.press('Enter');
await esperarEstado((e) => e.subfase === 'apurada', 'antes apurado (celulares)');
// Os blocos até a formação, com a faixa de entrada embaixo (a linha do tempo e o
// mapa precisam caber junto com ela).
await avancarAte((e) => e.tipo !== 'bloco' && e.indice > I_ANTES, 'depois dos blocos (celulares)', { aoPassar: (e) => conferirBloco(e, '-celulares') });

// "Pular para…" pela barra, direto à formação das equipes
if ((await estado()).tipo !== 'formarEquipes') {
  await clicarBarra('pular');
  await escolherNoModal(passoNoModal(I_FORMAR));
}
await esperarEstado((e) => e.tipo === 'formarEquipes', 'formar equipes (celulares)');
await page.evaluate(async (eqs) => {
  for (const [i, { uid, c }] of globalThis.__alunos.entries()) {
    if (i < eqs.length) await c.gravar({ [`salas/K7Q2/membros/${uid}/equipe`]: eqs[i] });
  }
}, [0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5].map((k) => EQUIPES[k % EQUIPES.length]));
await page.waitForFunction(() => /1 pessoa sem equipe/.test(document.querySelector('.formar-status')?.textContent || ''));
await conferirTela('formar-equipes-celulares');
{
  // As seis equipes com gente, e a faixa de entrada embaixo: o caso mais
  // apertado da tela de personas (as cinco personas com a casa).
  const e = await avancarPara((x) => x.tipo === 'personas', 'personas (celulares)');
  const abertas = EQUIPES.filter((eq) => e.equipesAbertas?.[eq]);
  assert.equal(abertas.length, EQUIPES.length, 'as seis equipes abertas');
  assert.equal(await page.locator('#faixa').isVisible(), true, 'com a faixa de entrada');
  await conferirTela('personas-celulares', { aoMedir: conferirVisualDasPersonas });
  await conferirCasaDasPersonas(abertas);
}
await clicarBarra('pular');
await escolherNoModal(passoNoModal(I_R1));
await esperarEstado((e) => e.tipo === 'rodada' && e.subfase === 'decidindo', 'primeira rodada (celulares)');
// e1: 2 × 1 (maioria), e2: 1 × 1 (empate → prorrogação), e3: 3 votos, e4 sem voto
{
  const [O1, O2, O3] = opcoesDe(RODADAS[0]);
  await page.evaluate(async ([r, votos]) => {
    const membros = await globalThis.__canalTeste.comoUsuario('aluno-00').ler('salas/K7Q2/membros');
    for (const { uid, c } of globalThis.__alunos) {
      if (votos[uid]) await c.gravar({ [`salas/K7Q2/decisoes/${r}/${membros[uid].equipe}/${uid}`]: votos[uid] });
    }
  }, [RODADAS[0], { 'aluno-00': O1, 'aluno-01': O1, 'aluno-02': O2, 'aluno-03': O1, 'aluno-04': O2, 'aluno-05': O3, 'aluno-06': O3, 'aluno-07': O3 }]);
}
await page.waitForFunction((eq) => /3 de 3/.test(document.querySelector(`.equipe-status[data-equipe="${eq}"]`)?.textContent || ''), EQUIPES[0]);
{
  const antes = await estado();
  await page.keyboard.press('Control+z');
  await confirmarModal();
  await page.waitForFunction(() => /Já chegaram 8 votos; não dá para desfazer a abertura/.test(document.getElementById('aviso')?.textContent || ''));
  const depois = await estado();
  assert.deepEqual([depois.subfase, depois.prazo, depois.geracao], ['decidindo', antes.prazo, antes.geracao], 'com voto, recusa sem mexer no estado');
}
await conferirTela('rodada-decidindo-celulares');
await page.keyboard.press('Enter');
await confirmarModal();
await esperarEstado((e) => e.subfase === 'prorrogacao' && e.empatadas?.[EQUIPES[1]], 'prorrogação da segunda equipe');
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
const origemE2 = await page.evaluate(([r, eq]) => globalThis.__canalTeste.ler(`salas/K7Q2/resultados/${r}/${eq}/origem`), [RODADAS[0], EQUIPES[1]]);
assert.equal(origemE2, 'moeda', 'empate que continua na prorrogação vai para a moeda');
await avancarPara((e) => e.subfase === 'resultado', 'resultado (celulares)');
await esperarTela('rodada-resultado');
await conferirTela('rodada-resultado-celulares', { esperarMs: 900, aoMedir: conferirVisualDoResultado });

// ---------- Parte 3: seguir sem celulares no meio de uma enquete ----------

console.log('Parte 3: "Continuar sem celulares" no meio de uma enquete com votos de celular');
// Revisão da F2, achados 27 e 30: a tela offline diz quantos votaram pelo
// celular antes da queda, a primeira contagem à mão pede confirmação (ela
// substitui esses votos), e a árvore guardada no navegador perde a presença e
// os votos que o offline não usa mais.
const SALA3 = 'M3Q2';
await page.evaluate(async ([sala, roteiro]) => {
  const V2 = globalThis.Viracao;
  const agoraFixo = Date.now();
  const canal = V2.canalLocal.criar({ relogio: () => agoraFixo });
  await V2.telao.ligarSessao({ modo: 'online', canal, sala, nomeRoteiro: roteiro, criar: true });
  globalThis.__alunos3 = [];
  for (let i = 0; i < 4; i += 1) {
    const uid = `p3-${i}`;
    const c = canal.comoUsuario(uid);
    await c.gravar({ [`salas/${sala}/membros/${uid}`]: { entrouEm: c.marcadorDeHora() } });
    await c.gravar({ [`salas/${sala}/presenca/${uid}`]: c.marcadorDeHora() });
    globalThis.__alunos3.push({ uid, c });
  }
}, [SALA3, ROTEIRO]);
await esperarTela('lobby');
await avancarPara((e) => e.tipo === 'enquete' && e.momento === 'antes', 'enquete antes (parte 3)');
await votarAntes(SALA3, '__alunos3', 3, 2); // um não vota
await page.waitForFunction(() => /3\s*de 4 votaram/.test(document.querySelector('.enquete-status')?.textContent || ''));
await segurarNaBarra('semCelulares', 2400);
await page.waitForFunction(() => globalThis.Viracao.telao.modo() === 'offline');
await page.waitForFunction(() => document.querySelector('.aviso-celulares')?.dataset.votosCelular === '3');
// O que fazer com esses votos é conversa do apresentador: fica na barra (D-047).
await mostrarBarra();
assert.match(await page.textContent('#barra [data-barra-dica]'), /Enter apura esses votos; a contagem à mão os substitui/);
await page.mouse.move(520, 300);
// O prefixo do localStorage leva a versão do app: lida da página, e não
// escrita aqui, para o teste não reprovar quando o bin/versao.mjs subir a versão.
const chave3 = `viracao:telao:v${await page.evaluate(() => globalThis.Viracao.telao.versaoApp)}:sala:${SALA3}`;
const guardada3 = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), chave3);
let arvore3 = (await guardada3()).salas[SALA3];
assert.equal(arvore3.presenca, undefined, 'a presença não vai para a árvore guardada no navegador');
assert.equal(Object.keys(arvore3.votosEnquete[ENQ_ANTES.id].antes[AFIRM_ANTES[0]]).length, 3, 'os votos da enquete aberta ficam: o encerrar ainda os apura');
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
assert.equal(arvore3.enquetes[ENQ_ANTES.id].antes.metodo, 'celular');
assert.equal(arvore3.enquetes[ENQ_ANTES.id].antes.n[AFIRM_ANTES[0]], 3);
// Saindo do passo, os votos individuais saem da árvore local.
await avancarPara((e) => e.tipo === 'bloco', 'bloco depois da enquete (parte 3)');
await page.waitForFunction(([k, s]) => !JSON.parse(localStorage.getItem(k)).salas[s].votosEnquete, [chave3, SALA3]);

// ---------- Parte 4: as seis equipes, com o custo real das cartas ----------

console.log('Parte 4: seis equipes com as cartas mais caras (resultado da rodada e placar final)');
// Revisão de 29/09: a parte 1 joga com cinco equipes (a da Rose fica fechada),
// e as páginas do placar com seis nunca tinham sido vistas em 1024×768. "Escolha
// ou sorte?" com seis equipes passava da altura.
// D-052 e D-054: a sorte da parte 1 vem de sementes aleatórias, e pode não tirar
// nenhuma carta com custo. Aqui, depois de cada apuração, o resultado de cada
// equipe é trocado pelo que o anfitrião gravaria se a carta sorteada fosse a
// mais cara que ela podia tirar (dias parado, renda perdida e gastos), e a
// decisão pela opção que tem texto do ofício da persona, quando há. Tudo sai do
// motor, com o estado e o histórico da equipe: é o pior caso de texto, e é
// nele que o resultado com seis equipes e a história precisam caber em 1024×768.
// O telão só lê o banco, então é o mesmo desenho de uma sessão de verdade.
const SALA4 = 'P6Q4';
await page.evaluate(async ([sala, roteiro]) => {
  const V2 = globalThis.Viracao;
  // O mesmo canal que o telão abriria no offline, guardado para o teste gravar
  // os resultados como o apresentador (o dono da sala).
  const canal = V2.canalLocal.criar({ persistirEm: V2.telao.chaveSessao(sala) });
  globalThis.__canal4 = canal;
  await V2.telao.ligarSessao({ modo: 'offline', sala, nomeRoteiro: roteiro, criar: true, canal });
}, [SALA4, ROTEIRO]);
await esperarTela('lobby');
ultimoAvanco = 0;
await clicarBarra('pular');
await escolherNoModal(passoNoModal(I_FORMAR));
// Depois do "Pular para…": o foco sai do botão da barra (ali o Espaço
// apertaria o botão), e o próximo Espaço espera a trava de 1,5 s do telão,
// que o pulo também arma.
const soltarFoco = async () => {
  await page.evaluate(() => document.activeElement?.blur());
  ultimoAvanco = Date.now();
};
await soltarFoco();
await esperarEstado((e) => e.tipo === 'formarEquipes' && Object.keys(e.equipesAbertas || {}).length === EQUIPES.length, 'as seis equipes abertas (parte 4)');
await avancarPara((e) => e.tipo === 'personas', 'personas (parte 4)');
await conferirCasaDasPersonas(EQUIPES);
await clicarBarra('pular');
await escolherNoModal(passoNoModal(I_R1));
await soltarFoco();

// A carta que a equipe podia tirar (chance > 0) com mais pedaços de custo e,
// entre essas, a de maior custo: é a que escreve mais na tela.
function cartaMaisCara(pedido) {
  let melhor = null;
  for (const { carta } of V.motor.chances(configNode, pedido)) {
    const a = V.motor.aplicar(configNode, { ...pedido, cartaId: carta });
    const k = a.cartaCusto;
    const nota = [k.diasParado > 0, k.rendaPerdida > 0, k.gastos > 0].filter(Boolean).length * 1e7 + k.rendaPerdida + k.gastos;
    if (!melhor || nota > melhor.nota) melhor = { carta, nota, a };
  }
  return melhor;
}
// A decisão de cada equipe: a opção com texto do ofício da persona, quando há
// (D-054), senão o padrão.
// A primeira equipe (a do Jonas, no teste de 30/09) pega o empréstimo quando
// o config tem um (esquema v2.2): o resultado mostra a dívida com ele, e a
// história diz "pegou empréstimo de R$ X" e com quanto dele a equipe termina.
const opcaoDeEmprestimo = (r) => opcoesDe(r).find((o) => lista(configNode.rodadas[r].opcoes[o].efeitos).some((ef) => ef.emprestimo));
const plano4 = Object.fromEntries(EQUIPES.map((eq, i) => {
  const persona = configNode.equipes[eq].persona;
  return [eq, RODADAS.map((r) => (i === 0 && opcaoDeEmprestimo(r)) || opcoesDe(r).find((o) => temTextoDoOficio(r, o, persona)) || configNode.rodadas[r].padrao)];
}));
const temEmprestimoNoConfig = RODADAS.some((r) => opcaoDeEmprestimo(r));
// O que o anfitrião gravaria (js/nucleo/anfitriao.js, fecharRodada) com esta
// decisão e esta carta. A origem é "ninguém votou" em todas: offline, é a
// única origem que o telão escreve (a do apresentador fica calada, e moeda e
// prorrogação precisam de votos de celular). Com a carta mais
// cara, a multa do aluguel e a dívida que vêm do saldo negativo, é o pior caso
// da revisão de 29/09 (2ª rodada, achado 13): origem, multa, gasto de carta e
// dívida em todas as seis equipes, e o que veio de antes (a fratura do mês 2
// que continua no mês 3).
const resultados4 = {};
function resultadoCaro(r, k, eq, real) {
  const decisao = plano4[eq][k];
  const historico = V.motor.historicoDe(resultados4, eq, RODADAS.slice(0, k));
  const estadoAntes = k === 0 ? V.motor.estadoInicial(configNode, eq) : resultados4[RODADAS[k - 1]][eq].depois;
  const pedido = { equipeId: eq, rodadaId: r, opcaoId: decisao, estado: estadoAntes, historico };
  const { carta, a } = cartaMaisCara(pedido);
  return {
    decisao, origem: 'piloto', contagem: real.contagem,
    chances: V.motor.chances(configNode, pedido), carta, delta: a.delta, depois: a.depois, mes: a.mes, cartaCusto: a.cartaCusto,
    ...camposOpcionais(a),
  };
}
// Os campos que o anfitrião grava só quando há (o RTDB apaga lista vazia):
// o que veio de antes e o que a proteção pagou (D-059).
function camposOpcionais(a) {
  return {
    ...(a.deAntes.length > 0 ? { deAntes: a.deAntes } : {}),
    ...(a.protecaoEvitou > 0 ? { protecaoEvitou: a.protecaoEvitou } : {}),
    ...(a.protecaoItens.length > 0 ? { protecaoItens: a.protecaoItens } : {}),
  };
}
// O placar do anfitrião (calcularPlacar), refeito sobre os resultados trocados.
function placarDe(resultados, cfg = configNode, equipes = EQUIPES, rodadas = RODADAS) {
  return Object.fromEntries(equipes.map((eq) => {
    const jogadas = rodadas.map((r) => ({ rodadaId: r, opcaoId: resultados[r][eq].decisao, cartaId: resultados[r][eq].carta }));
    const d = V.motor.decompor(cfg, { equipeId: eq, rodadas: jogadas });
    return [eq, {
      ...resultados[rodadas.at(-1)][eq].depois, piloto: d.esperadoPiloto, efeitoDecisoes: d.efeitoDecisoes, sorte: d.sorte,
      piorCaso: d.piorCaso, piorCasoSemProtecao: d.piorCasoSemProtecao, ativa: true, ...(d.estimado ? { estimado: true } : {}),
    }];
  }));
}
let custosVistos4 = 0;
let placar4 = null;
let deAntesVistos4 = 0;
for (const [k, r] of RODADAS.entries()) {
  await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `rodada ${r} (parte 4)`, { maximo: 12 });
  await page.keyboard.press('Enter');
  await confirmarModal();
  await esperarEstado((e) => e.subfase === 'sorteio', `sorteio de ${r} (parte 4)`);
  await avancarPara((e) => e.subfase === 'resultado', `resultado de ${r} (parte 4)`);
  await esperarTela('rodada-resultado');
  const reais = await page.evaluate(([s, rr]) => globalThis.__canal4.ler(`salas/${s}/resultados/${rr}`), [SALA4, r]);
  resultados4[r] = Object.fromEntries(EQUIPES.map((eq) => [eq, resultadoCaro(r, k, eq, reais[eq])]));
  const escritas = { [`salas/${SALA4}/resultados/${r}`]: resultados4[r] };
  if (k === RODADAS.length - 1) escritas[`salas/${SALA4}/placar`] = placar4 = placarDe(resultados4);
  // As regras deixam o resultado ser gravado uma vez só, e apagado: o teste
  // apaga o da apuração e grava o trocado, como o desfazer do anfitrião faz.
  await page.evaluate(async (m) => {
    await globalThis.__canal4.gravar(Object.fromEntries(Object.keys(m).map((c) => [c, null])));
    await globalThis.__canal4.gravar(m);
  }, escritas);
  // O telão redesenha com o que foi gravado (ouvinte do canal).
  const esperado = Object.fromEntries(EQUIPES.map((eq) => [eq, faixaEsperada(resultados4[r][eq], 'ninguém votou', configNode, r, eq)]));
  await page.waitForFunction((esp) => Object.entries(esp).every(([eq, x]) => {
    const c = document.querySelector(`.cartao-resultado[data-equipe="${eq}"]`);
    return c?.dataset.carta === x.carta && c.querySelector('.resultado-saldo')?.textContent === x.saldo;
  }), esperado);
  const lido = await lerFaixas();
  conferirFaixas(lido, esperado, configNode, `${r} (parte 4)`);
  custosVistos4 += Object.values(lido).filter((x) => x.custo).length;
  // O que veio de antes saiu do resultado projetado (D-065): fica no celular e
  // na história, onde a parte 4 também o confere.
  deAntesVistos4 += EQUIPES.reduce((t, eq) => t + lista(resultados4[r][eq].deAntes).length, 0);
  await conferirTela(`rodada-resultado-custos-${r}-6-equipes`, { esperarMs: 900, aoMedir: conferirVisualDoResultado });
}
const temCustoNoConfig = Object.values(configNode.cartas).some((c) => c.diasParado > 0 || lista(c.efeitos).some((ef) => ef.categoria === 'gasto'));
// Só a carta de parada escreve no resultado projetado (D-065): o custo em
// dinheiro das outras está no saldo do mês, e o detalhe, na história.
const temParadaNoConfig = temCustoNoConfig && Object.values(configNode.cartas).some((c) => c.diasParado > 0);
if (temParadaNoConfig) assert.ok(custosVistos4 > 0, 'o config tem carta de parada, e o resultado da rodada mostrou os dias parados');
await avancarAte((e) => e.tipo === 'placarFinal', 'placar final (parte 4)', { maximo: 12 });
await esperarTela('placar-final');
await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'saldo');
assert.equal(await page.locator('.valor-saldo').count(), EQUIPES.length, 'página 1 com as seis equipes');
await conferirTela('placar-saldo-6-equipes');
await avancar();
await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'escolhas');
{
  const contas = await page.$$eval('.historia-escolha .historia-conta', (ns) => ns.map((n) => n.textContent));
  assert.equal(contas.length, EQUIPES.length, 'página 2 com as seis equipes');
  for (const t of contas) {
    assert.match(t, / → as escolhas: [+−]R\$.* → a sorte: [+−]R\$.* = terminaram com −?R\$/, `página 2: variações com sinal ("${t}")`);
    const [a1, a2, a3, a4] = reaisDoTexto(t);
    assert.equal(a1 + a2 + a3, a4, `página 2: as parcelas somam o total ("${t}")`);
  }
}
await conferirTela('placar-escolhas-6-equipes', { aoMedir: conferirGradeDasEscolhas });
if (temProtecao(configNode)) {
  await avancar();
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'pior');
  conferirPiorCaso(await lerPiorCaso(), configNode, placar4, resultados4, EQUIPES);
  await conferirTela('placar-pior-6-equipes');
}
// A história de cada uma das seis equipes, com três meses de carta cara: o caso
// mais alto da página. O texto da opção é o do ofício da persona (D-054).
let doOficio4 = 0;
let emprestimosVistos4 = 0;
for (const eq of EQUIPES) {
  const lida = await lerHistoriaInteira(eq, `placar-historia-${eq}-6-equipes`);
  doOficio4 += conferirMesesDaHistoria(eq, V.historia.historiaDaEquipe(configNode, eq, resultados4), lida.meses, resultados4);
  conferirFinalDaHistoria(eq, lida, patrimonioEsperado(placar4[eq]), placar4[eq], resultados4);
  emprestimosVistos4 += lida.meses.filter((m) => m.emprestimo).length;
}
const temOficio = EQUIPES.some((eq) => RODADAS.some((r, k) => temTextoDoOficio(r, plano4[eq][k], configNode.equipes[eq].persona)));
if (temOficio) assert.ok(doOficio4 > 0, 'o config tem texto por ofício, e a história o mostrou (D-054)');
if (temEmprestimoNoConfig) assert.ok(emprestimosVistos4 > 0, 'o config tem empréstimo, e a história o mostrou como dívida');
const temDeAntesNoConfig = RODADAS.some((r) => lista(configNode.rodadas[r].efeitosGerais).some((ef) => ef.fixo !== true && ef.se && (ef.se.decidiu || ef.se.sorteou || ef.se.indicador)));
if (temDeAntesNoConfig) assert.ok(deAntesVistos4 > 0, 'o config tem efeito geral de antes, e a parte 4 o exercitou (a história o confere)');
console.log(`  parte 4: ${custosVistos4} resultado(s) com custo da carta; ${deAntesVistos4} item(ns) do que veio de antes; ${doOficio4} mês(es) da história com o texto do ofício`);

// ---------- Parte 5: a linha do tempo do roteiro longo ----------

// Rascunho, seção 7, item 15: o roteiro de 120 min tem mais passos, e dois
// blocos depois do placar. O "Mapa do seminário" precisa caber em 1024×768 com
// o seminário inteiro (o fim agrupado), e o bloco dentro do grupo final mostra
// "você está aqui" no grupo.
const ROTEIRO_LONGO = Object.keys(configNode.roteiros).find((nome) => nome !== ROTEIRO && configNode.roteiros[nome].length > PASSOS.length);
if (ROTEIRO_LONGO) {
  console.log(`Parte 5: linha do tempo do roteiro ${ROTEIRO_LONGO}`);
  const passosLongo = V.roteiro.passos(configNode, ROTEIRO_LONGO);
  const ultimaRodada = passosLongo.findLast((p) => p.tipo === 'rodada').indice;
  const alvos = [
    { passo: passosLongo.find((p) => p.tipo === 'bloco' && RE_MAPA.test(p.titulo || '')), mapa: true, nome: 'bloco-mapa' },
    { passo: passosLongo.find((p) => p.tipo === 'bloco' && p.indice > ultimaRodada), mapa: false, nome: 'bloco-no-fim' },
  ].filter((a) => a.passo);
  await page.evaluate(async ([sala, roteiro]) => {
    await globalThis.Viracao.telao.ligarSessao({ modo: 'offline', sala, nomeRoteiro: roteiro, criar: true });
  }, ['L5TR', ROTEIRO_LONGO]);
  await esperarTela('lobby');
  for (const { passo, mapa, nome } of alvos) {
    ultimoAvanco = 0;
    await clicarBarra('pular');
    await escolherNoModal(passoNoModal(passo.indice));
    await esperarEstado((e) => e.indice === passo.indice, `${ROTEIRO_LONGO}: ${passo.titulo}`);
    await esperarTela('bloco');
    await page.evaluate(() => document.activeElement?.blur());
    await conferirLinhaDoTempo({ mapa, passos: passosLongo });
    await conferirTela(`${nome}-${ROTEIRO_LONGO}`);
  }
}

// ---------- Parte 6: a proteção (D-059), com a fixture v2.1 ----------

// O config.json pode não ter nenhuma opção que protege (a calibragem da D-059
// é de conteúdo, feita depois), e a sorte das partes 1 e 4 pode nunca pagar a
// proteção. Aqui o telão carrega a fixture v2.1, que tem o MEI (r1 "b",
// protege) e o INSS do MEI no mês 2 para quem pagou e tirou o acidente no mês
// 1, com o mês 1 só com o acidente (como no e2e online). As equipes 1 e 6 (o
// Rafa) pagam o MEI; as outras ficam no padrão. Os resultados são trocados
// pelos do motor, como na parte 4. Prova, em 1024×768 e 1920×1080:
// - o resultado do mês 2 diz "a proteção pagou R$ 900" nas contas das duas;
// - a página "O pior que podia acontecer" com o pior caso com e sem a
//   proteção, e "não escolheram proteção" nas outras;
// - a história do Rafa com a proteção no mês 2.
console.log('Parte 6: a proteção (D-059), com a fixture v2.1');
{
  const bruto6 = JSON.parse(readFileSync(join(RAIZ, 'test', 'fixtures', 'config-teste-v21.json'), 'utf8'));
  const todas6 = bruto6.rodadas.map((r) => r.id);
  for (const c of bruto6.cartas) if (c.id !== 'acidente') c.rodadas = (c.rodadas ?? todas6).filter((r) => r !== todas6[0]);
  const texto6 = JSON.stringify(bruto6, null, 1);
  const r6 = V.validarConfig.validarTexto(texto6);
  assert.ok(r6.ok, `a fixture da parte 6 é válida: ${JSON.stringify(r6.erros.slice(0, 3))}`);
  const cfg6 = r6.config;
  doPeriodoNaTela = doPeriodoDe(cfg6);
  assert.ok(temProtecao(cfg6), 'a fixture v2.1 tem uma opção que protege');
  const passos6 = V.roteiro.passos(cfg6, ROTEIRO);
  const rodadas6 = passos6.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
  const equipes6 = lista(cfg6.ordem.equipes);
  const protegem6 = new Set(equipes6.filter((eq) => cfg6.equipes[eq].persona === cfg6.equipes[equipes6[0]].persona));
  // No mês 1, o MEI para o Rafa; no resto, o padrão. As cartas: o acidente no
  // mês 1 (a única), e o mês sem surpresas depois.
  const plano6 = Object.fromEntries(rodadas6.map((r, k) => [r, Object.fromEntries(equipes6.map((eq) => [eq, {
    decisao: k === 0 && protegem6.has(eq) ? 'b' : cfg6.rodadas[r].padrao,
    carta: k === 0 ? 'acidente' : 'normal',
  }]))]));

  await page.goto(URL_TELAO);
  await esperarTela('abertura');
  await page.setInputFiles('#arquivo-config', { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(texto6) });
  await page.waitForFunction((h) => document.getElementById('hash-config')?.textContent === h, V.validarConfig.hash(cfg6));
  const SALA6 = 'R6P9';
  await page.evaluate(async ([sala, roteiro]) => {
    const V2 = globalThis.Viracao;
    const canal = V2.canalLocal.criar({ persistirEm: V2.telao.chaveSessao(sala) });
    globalThis.__canal6 = canal;
    await V2.telao.ligarSessao({ modo: 'offline', sala, nomeRoteiro: roteiro, criar: true, canal });
  }, [SALA6, ROTEIRO]);
  await esperarTela('lobby');
  ultimoAvanco = 0;
  await clicarBarra('pular');
  await escolherNoModal(passoNoModal(passos6.findIndex((p) => p.tipo === 'formarEquipes')));
  await page.evaluate(() => document.activeElement?.blur());
  ultimoAvanco = Date.now();
  await esperarEstado((e) => e.tipo === 'formarEquipes' && Object.keys(e.equipesAbertas || {}).length === equipes6.length, 'as seis equipes abertas (parte 6)');
  await avancarPara((e) => e.tipo === 'personas', 'personas (parte 6)');
  await clicarBarra('pular');
  await escolherNoModal(passoNoModal(passos6.findIndex((p) => p.tipo === 'rodada')));
  await page.evaluate(() => document.activeElement?.blur());
  ultimoAvanco = Date.now();

  const resultados6 = {};
  let protecoesVistas = 0;
  for (const [k, r] of rodadas6.entries()) {
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `rodada ${r} (parte 6)`, { maximo: 12 });
    await page.keyboard.press('Enter');
    await confirmarModal();
    await esperarEstado((e) => e.subfase === 'sorteio', `sorteio de ${r} (parte 6)`);
    await avancarPara((e) => e.subfase === 'resultado', `resultado de ${r} (parte 6)`);
    await esperarTela('rodada-resultado');
    const reais = await page.evaluate(([s, rr]) => globalThis.__canal6.ler(`salas/${s}/resultados/${rr}`), [SALA6, r]);
    resultados6[r] = Object.fromEntries(equipes6.map((eq) => {
      const { decisao, carta } = plano6[r][eq];
      const historico = V.motor.historicoDe(resultados6, eq, rodadas6.slice(0, k));
      const estadoAntes = k === 0 ? V.motor.estadoInicial(cfg6, eq) : resultados6[rodadas6[k - 1]][eq].depois;
      const pedido = { equipeId: eq, rodadaId: r, opcaoId: decisao, estado: estadoAntes, historico };
      const chances = V.motor.chances(cfg6, pedido);
      assert.ok(chances.some((c) => c.carta === carta), `${r}/${eq}: a carta ${carta} pode sair`);
      const a = V.motor.aplicar(cfg6, { ...pedido, cartaId: carta });
      return [eq, {
        decisao, origem: 'piloto', contagem: reais[eq].contagem, chances, carta,
        delta: a.delta, depois: a.depois, mes: a.mes, cartaCusto: a.cartaCusto, ...camposOpcionais(a),
      }];
    }));
    const escritas = { [`salas/${SALA6}/resultados/${r}`]: resultados6[r] };
    if (k === rodadas6.length - 1) escritas[`salas/${SALA6}/placar`] = placarDe(resultados6, cfg6, equipes6, rodadas6);
    await page.evaluate(async (m) => {
      await globalThis.__canal6.gravar(Object.fromEntries(Object.keys(m).map((c) => [c, null])));
      await globalThis.__canal6.gravar(m);
    }, escritas);
    // O resultado projetado (D-065), com "a proteção pagou" (D-059) só em quem
    // ela pagou, embaixo da carta.
    const esperado = Object.fromEntries(equipes6.map((eq) => [eq, faixaEsperada(resultados6[r][eq], 'ninguém votou', cfg6, r, eq)]));
    await page.waitForFunction((esp) => Object.entries(esp).every(([eq, x]) => {
      const c = document.querySelector(`.cartao-resultado[data-equipe="${eq}"]`);
      return c?.dataset.carta === x.carta && c.querySelector('.resultado-saldo')?.textContent === x.saldo;
    }), esperado);
    const lido = await lerFaixas();
    conferirFaixas(lido, esperado, cfg6, `${r} (parte 6)`);
    const comProtecao = Object.values(lido).filter((x) => x.protecao).length;
    protecoesVistas += comProtecao;
    if (comProtecao > 0) await conferirTela(`rodada-resultado-protecao-${r}`, { esperarMs: 900, aoMedir: conferirVisualDoResultado });
  }
  assert.equal(protecoesVistas, protegem6.size, 'o INSS do MEI apareceu no mês 2 de quem pagou o MEI, e só nele');
  assert.ok(equipes6.filter((eq) => protegem6.has(eq)).every((eq) => resultados6[rodadas6[1]][eq].mes.protecao === 900), 'o INSS do MEI é de R$ 900 na fixture');

  await avancarAte((e) => e.tipo === 'placarFinal', 'placar final (parte 6)', { maximo: 12 });
  await esperarTela('placar-final');
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'saldo');
  await avancar();
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'escolhas');
  await avancar();
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'pior');
  const placar6 = placarDe(resultados6, cfg6, equipes6, rodadas6);
  const comSem = conferirPiorCaso(await lerPiorCaso(), cfg6, placar6, resultados6, equipes6);
  assert.equal(comSem, protegem6.size, 'o "sem a proteção" só nas equipes que pagaram o MEI');
  for (const eq of protegem6) assert.ok(placar6[eq].piorCaso > placar6[eq].piorCasoSemProtecao, `${eq}: com o MEI, o pior caso é melhor`);
  await conferirTela('placar-pior-protecao-6-equipes');
  // A história da primeira equipe: o mês 2 com o que a proteção pagou.
  const eq1 = equipes6[0];
  await avancar();
  await page.waitForFunction((x) => document.querySelector('.tela-placar-final')?.dataset.equipe === x, eq1);
  const historia6 = await page.evaluate(() => Array.from(document.querySelectorAll('.historia-mes'), (n) => ({
    rodada: n.dataset.rodada, contas: n.querySelector('.historia-contas')?.textContent ?? null, protecao: n.querySelector('.conta-protecao')?.textContent ?? null,
  })));
  assert.deepEqual(historia6.map((h) => h.protecao), rodadas6.map((r) => (resultados6[r][eq1].mes.protecao > 0 ? `a\u00a0proteção pagou ${F.moeda(resultados6[r][eq1].mes.protecao)}` : null)), `${eq1}: a proteção na história, só no mês em que pagou`);
  for (const h of historia6) {
    const x = resultados6[h.rodada][eq1];
    assert.equal(h.contas, textoContas(x.mes, nomesEsperados(cfg6, { equipeId: eq1, rodadaId: h.rodada, decisao: x.decisao }, x.cartaCusto, x.mes, x.deAntes).gastos), `${eq1}/${h.rodada}: as contas da história`);
  }
  await conferirTela('placar-historia-protecao');
  console.log(`  parte 6: "a proteção pagou" em ${protecoesVistas} resultado(s); pior caso com e sem a proteção em ${comSem} equipe(s)`);
}

// ---------- Parte 7: seis personagens, um por equipe (D-061) ----------

// A D-061 põe uma persona em cada equipe (seis personagens). O config de 30/09 e
// a fixture v3 ainda repetem uma persona em duas equipes: aqui, a segunda equipe
// de cada persona repetida ganha uma persona própria (a cópia da casa, com
// outro nome e outro ofício), e a tela de personas é conferida com as seis
// equipes abertas e a faixa de entrada embaixo, o caso mais apertado: seis
// entradas de três linhas, cada linha sem quebrar, nada sobreposto, nada
// abaixo de 28 px e sem rolagem, em 1024×768 e em 1920×1080.
console.log('Parte 7: a tela de personas com uma persona por equipe');
{
  const bruto7 = structuredClone(brutoConfig);
  const personas7 = lista(bruto7.personas);
  const usadas = new Set();
  const novas = [];
  for (const eq of lista(bruto7.equipes)) {
    if (!usadas.has(eq.persona)) {
      usadas.add(eq.persona);
      continue;
    }
    const base = personas7.find((p) => p.id === eq.persona);
    const nova = { ...structuredClone(base), id: `${base.id}_b`.slice(0, 24), nome: 'Bia', descricao: 'Influenciadora digital, 24 anos, vive de publis e de parcerias com marcas.' };
    novas.push(nova);
    eq.persona = nova.id;
  }
  if (Array.isArray(bruto7.personas)) bruto7.personas.push(...novas);
  else for (const p of novas) bruto7.personas[p.id] = p;
  const texto7 = JSON.stringify(bruto7, null, 1);
  const r7 = V.validarConfig.validarTexto(texto7);
  assert.ok(r7.ok, `o config da parte 7 é válido: ${JSON.stringify(r7.erros.slice(0, 3))}`);
  const cfg7 = r7.config;
  doPeriodoNaTela = doPeriodoDe(cfg7);
  const equipes7 = lista(cfg7.ordem.equipes);
  assert.equal(new Set(equipes7.map((eq) => cfg7.equipes[eq].persona)).size, equipes7.length, 'uma persona por equipe');
  const passos7 = V.roteiro.passos(cfg7, ROTEIRO);
  await page.goto(URL_TELAO);
  await esperarTela('abertura');
  await page.setInputFiles('#arquivo-config', { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(texto7) });
  await page.waitForFunction((h) => document.getElementById('hash-config')?.textContent === h, V.validarConfig.hash(cfg7));
  // Online sobre um canal local, com a entrada aberta: a faixa de entrada
  // aparece embaixo, como na aula com celulares.
  await page.evaluate(async ([sala, roteiro]) => {
    const V2 = globalThis.Viracao;
    const agoraFixo = Date.now();
    const canal = V2.canalLocal.criar({ relogio: () => agoraFixo });
    await V2.telao.ligarSessao({ modo: 'online', canal, sala, nomeRoteiro: roteiro, criar: true });
  }, ['S7P6', ROTEIRO]);
  await esperarTela('lobby');
  ultimoAvanco = 0;
  await clicarBarra('pular');
  await escolherNoModal(passoNoModal(passos7.findIndex((p) => p.tipo === 'formarEquipes')));
  await page.evaluate(() => document.activeElement?.blur());
  ultimoAvanco = Date.now();
  await esperarEstado((e) => e.tipo === 'formarEquipes' && Object.keys(e.equipesAbertas || {}).length === equipes7.length, 'as seis equipes abertas (parte 7)');
  await avancarPara((e) => e.tipo === 'personas', 'personas (parte 7)');
  assert.equal(await page.locator('#faixa').isVisible(), true, 'com a faixa de entrada');
  assert.equal(await page.locator('.persona-linha').count(), equipes7.length, 'uma entrada por equipe');
  await conferirTela('personas-uma-por-equipe', { aoMedir: conferirVisualDasPersonas });
  await conferirCasaDasPersonas(equipes7, cfg7);
}

// ---------- Parte 8: o limite do cheque especial (D-066) e a proteção acima do trabalho (D-067) ----------

// O config.json ainda não tem o limite (o valor e a fonte são conteúdo), e a
// sorte das outras partes nunca estoura o cheque especial com a fixture certa.
// Aqui o telão carrega a fixture v3.1 (limite de R$ 1.500, multa e mora de
// teste, 6 bimestres), com o INSS do MEI de mar–abr subido para R$ 4.000:
// passa do trabalho de um bimestre comum do ciclista (R$ 3.800) e fica abaixo
// do do motoboy (R$ 5.200), as duas pontas da D-067. O plano:
// - a equipe 2 (Dani, ciclista) paga o MEI em jan–fev e tira o acidente; em
//   mar–abr, o INSS chega e passa do trabalho dela (a frase da D-067);
// - a equipe 6 (Rafa, motoboy) faz o mesmo, e o INSS fica abaixo do trabalho
//   dele: "a proteção pagou", sem a frase;
// - a equipe 1 pega o empréstimo em mar–abr (a dívida soma o banco e o
//   empréstimo, e as contas atrasadas ficam à parte);
// - no resto, o padrão e a carta que deixa a equipe mais pobre: o limite
//   estoura, as contas atrasam e a comida falta em quase todo bimestre, com
//   valores de cinco dígitos. É o caso mais alto do resultado e da história.
// Os resultados são trocados pelos do motor, como nas partes 4 e 6, com a
// marca da D-067 que o anfitrião grava (motor.protecaoAcimaDoTrabalho). Prova,
// em 1024×768 e 1920×1080 e sem rolagem:
// - o resultado de cada bimestre: "dívida R$ X" (banco + empréstimo) e, numa
//   linha própria, "contas atrasadas R$ Y · faltou na mesa R$ Z"; a frase da
//   D-067 só na equipe 2, em mar–abr; nada abaixo de 28 px;
// - o placar final: o saldo pelo patrimônio (menos as contas atrasadas) e a
//   linha "Faltou na mesa no ano" por equipe, à parte do dinheiro;
// - a história de cada equipe, com a comida que faltou, a multa e os juros do
//   atraso nas contas do bimestre, a frase da D-067 e, no fim, a dívida, as
//   contas atrasadas e o que faltou na mesa.
console.log('Parte 8: o limite do cheque especial (D-066) e a proteção acima do trabalho (D-067), com a fixture v3.1');
{
  const bruto8 = JSON.parse(readFileSync(join(RAIZ, 'test', 'fixtures', 'config-teste-v31.json'), 'utf8'));
  const inss8 = bruto8.rodadas.find((r) => r.id === 'r2').efeitosGerais.find((ef) => ef.categoria === 'protecao');
  inss8.soma.renda = 4000;
  const texto8 = JSON.stringify(bruto8, null, 1);
  const r8 = V.validarConfig.validarTexto(texto8);
  assert.ok(r8.ok, `a fixture da parte 8 é válida: ${JSON.stringify(r8.erros.slice(0, 3))}`);
  const cfg8 = r8.config;
  assert.ok(cfg8.regras.limiteChequeEspecial > 0, 'a fixture v3.1 tem o limite do cheque especial');
  doPeriodoNaTela = doPeriodoDe(cfg8);
  const passos8 = V.roteiro.passos(cfg8, ROTEIRO);
  const rodadas8 = passos8.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
  const equipes8 = lista(cfg8.ordem.equipes);
  const [eqLoan, eqAcima] = equipes8;
  const eqAbaixo = equipes8.at(-1);
  assert.equal(cfg8.equipes[eqAbaixo].persona, cfg8.equipes[eqLoan].persona, 'a primeira e a última equipe são do motoboy');
  const mei8 = lista(cfg8.rodadas[rodadas8[0]].ordemOpcoes).find((o) => cfg8.rodadas[rodadas8[0]].opcoes[o].protege === true);
  const emprestimo8 = lista(cfg8.rodadas[rodadas8[1]].ordemOpcoes).find((o) => lista(cfg8.rodadas[rodadas8[1]].opcoes[o].efeitos).some((ef) => ef.emprestimo));
  assert.ok(mei8 && emprestimo8, 'a fixture tem o MEI em jan–fev e o empréstimo em mar–abr');
  assert.ok(V.motor.trabalhoComum(cfg8, eqAcima) < 4000 && V.motor.trabalhoComum(cfg8, eqAbaixo) > 4000, 'o INSS de R$ 4.000 passa do trabalho de uma persona e não da outra');

  await page.goto(URL_TELAO);
  await esperarTela('abertura');
  await page.setInputFiles('#arquivo-config', { name: 'config.json', mimeType: 'application/json', buffer: Buffer.from(texto8) });
  await page.waitForFunction((h) => document.getElementById('hash-config')?.textContent === h, V.validarConfig.hash(cfg8));
  const SALA8 = 'L8M2';
  await page.evaluate(async ([sala, roteiro]) => {
    const V2 = globalThis.Viracao;
    const canal = V2.canalLocal.criar({ persistirEm: V2.telao.chaveSessao(sala) });
    globalThis.__canal8 = canal;
    await V2.telao.ligarSessao({ modo: 'offline', sala, nomeRoteiro: roteiro, criar: true, canal });
  }, [SALA8, ROTEIRO]);
  await esperarTela('lobby');
  ultimoAvanco = 0;
  await clicarBarra('pular');
  await escolherNoModal(passoNoModal(passos8.findIndex((p) => p.tipo === 'formarEquipes')));
  await page.evaluate(() => document.activeElement?.blur());
  ultimoAvanco = Date.now();
  await esperarEstado((e) => e.tipo === 'formarEquipes' && Object.keys(e.equipesAbertas || {}).length === equipes8.length, 'as seis equipes abertas (parte 8)');
  await avancarPara((e) => e.tipo === 'personas', 'personas (parte 8)');
  await clicarBarra('pular');
  await escolherNoModal(passoNoModal(passos8.findIndex((p) => p.tipo === 'rodada')));
  await page.evaluate(() => document.activeElement?.blur());
  ultimoAvanco = Date.now();

  // A decisão e a carta de cada equipe em cada bimestre (o plano lá de cima).
  function jogada8(resultados, k, eq) {
    const r = rodadas8[k];
    const historico = V.motor.historicoDe(resultados, eq, rodadas8.slice(0, k));
    const estado = k === 0 ? V.motor.estadoInicial(cfg8, eq) : resultados[rodadas8[k - 1]][eq].depois;
    const protege = eq === eqAcima || eq === eqAbaixo;
    let decisao = cfg8.rodadas[r].padrao;
    let carta = null;
    if (protege && k === 0) [decisao, carta] = [mei8, 'acidente'];
    else if (protege && k === 1) carta = 'normal';
    else if (eq === eqLoan && k === 1) decisao = emprestimo8;
    const pedido = { equipeId: eq, rodadaId: r, opcaoId: decisao, estado, historico };
    const chances = V.motor.chances(cfg8, pedido);
    if (!carta) {
      // A carta que deixa a equipe com o menor patrimônio depois do bimestre.
      carta = chances.map(({ carta: c }) => ({ c, p: V.motor.patrimonio(V.motor.aplicar(cfg8, { ...pedido, cartaId: c }).depois) }))
        .reduce((a, b) => (b.p < a.p ? b : a)).c;
    }
    assert.ok(chances.some((c) => c.carta === carta), `${r}/${eq}: a carta ${carta} pode sair`);
    const a = V.motor.aplicar(cfg8, { ...pedido, cartaId: carta });
    // O anfitrião grava a marca da D-067 só quando ela existe.
    const acima = V.motor.protecaoAcimaDoTrabalho(cfg8, eq, a.mes);
    return {
      decisao, origem: 'piloto', contagem: {}, chances, carta, delta: a.delta, depois: a.depois, mes: a.mes, cartaCusto: a.cartaCusto,
      ...camposOpcionais(a), ...(acima ? { protecaoAcimaDoTrabalho: acima } : {}),
    };
  }

  const resultados8 = {};
  let limitesVistos = 0;
  let mesasVistas = 0;
  const acimaVistas = [];
  let placar8 = null;
  for (const [k, r] of rodadas8.entries()) {
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === r && e.subfase === 'decidindo', `rodada ${r} (parte 8)`, { maximo: 12 });
    await page.keyboard.press('Enter');
    await confirmarModal();
    await esperarEstado((e) => e.subfase === 'sorteio', `sorteio de ${r} (parte 8)`);
    await avancarPara((e) => e.subfase === 'resultado', `resultado de ${r} (parte 8)`);
    await esperarTela('rodada-resultado');
    resultados8[r] = Object.fromEntries(equipes8.map((eq) => [eq, jogada8(resultados8, k, eq)]));
    const escritas = { [`salas/${SALA8}/resultados/${r}`]: resultados8[r] };
    if (k === rodadas8.length - 1) escritas[`salas/${SALA8}/placar`] = placar8 = placarDe(resultados8, cfg8, equipes8, rodadas8);
    await page.evaluate(async (m) => {
      await globalThis.__canal8.gravar(Object.fromEntries(Object.keys(m).map((c) => [c, null])));
      await globalThis.__canal8.gravar(m);
    }, escritas);
    const esperado = Object.fromEntries(equipes8.map((eq) => [eq, faixaEsperada(resultados8[r][eq], 'ninguém votou', cfg8, r, eq)]));
    await page.waitForFunction((esp) => Object.entries(esp).every(([eq, x]) => {
      const c = document.querySelector(`.cartao-resultado[data-equipe="${eq}"]`);
      return c?.dataset.carta === x.carta && c.querySelector('.resultado-saldo')?.textContent === x.saldo;
    }), esperado);
    const lido = await lerFaixas();
    conferirFaixas(lido, esperado, cfg8, `${r} (parte 8)`);
    // A dívida da faixa é a do banco mais o empréstimo; as contas atrasadas
    // vão num atributo próprio (e o banco nunca passa do limite).
    const dados = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('.cartao-resultado'), (c) => [c.dataset.equipe, { divida: c.dataset.divida, atrasadas: c.dataset.contasAtrasadas ?? null, mesa: c.dataset.faltouNaMesa ?? null }])));
    for (const eq of equipes8) {
      const x = resultados8[r][eq];
      assert.ok(x.mes.dividaBanco <= cfg8.regras.limiteChequeEspecial, `${r}/${eq}: o banco não passa do limite`);
      assert.deepEqual(dados[eq], {
        divida: String(Math.round(dividaEsperada(x.depois))), atrasadas: String(Math.round(x.depois.contas_atrasadas)),
        mesa: x.mes.faltouNaMesa > 0 ? String(Math.round(x.mes.faltouNaMesa)) : null,
      }, `${r}/${eq}: data-divida, data-contas-atrasadas e data-faltou-na-mesa`);
      // Revisão da F6c: a "dívida" do telão é o total de historia.dividaTotal,
      // o mesmo que o celular da equipe escreve em "Dívida no banco" (o
      // e2e:online confere o lado do celular contra a mesma função). Antes, o
      // telão dizia "dívida R$ 3.000" e o celular, "Dívida hoje R$ 7.811".
      assert.equal(dados[eq].divida, String(Math.round(V.historia.dividaTotal(x.depois).total)), `${r}/${eq}: a dívida do telão é a do celular`);
    }
    limitesVistos += Object.values(lido).filter((x) => x.limite?.includes('contas atrasadas')).length;
    mesasVistas += Object.values(lido).filter((x) => x.limite?.includes('faltou na mesa')).length;
    for (const [eq, x] of Object.entries(lido)) if (x.acima) acimaVistas.push(`${r}/${eq}`);
    await conferirTela(`rodada-resultado-limite-${r}-6-equipes`, { esperarMs: 900, aoMedir: conferirVisualDoResultado });
  }
  assert.deepEqual(acimaVistas, [`${rodadas8[1]}/${eqAcima}`], 'a frase da D-067 só na equipe em que o INSS passou do trabalho, no bimestre em que ele chegou');
  assert.equal(resultados8[rodadas8[1]][eqAbaixo].mes.protecao, 4000, 'o INSS também pagou a equipe do motoboy');
  assert.ok(limitesVistos >= 20 && mesasVistas >= 15, `o limite estourou na maior parte dos bimestres (${limitesVistos} com contas atrasadas, ${mesasVistas} com comida que faltou)`);

  await avancarAte((e) => e.tipo === 'placarFinal', 'placar final (parte 8)', { maximo: 12 });
  await esperarTela('placar-final');
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'saldo');
  // Página 1: o saldo é o patrimônio (menos as contas atrasadas), e a linha
  // "Faltou na mesa no ano" vem à parte, com todas as equipes na ordem do
  // gráfico (inclusive as de R$ 0).
  // Revisão da F6c: com o limite, a barra é o patrimônio (o que ficou
  // devendo), e a comida que faltou vem à parte; o título diz isso.
  assert.equal(await page.textContent('.tela-placar-final .kicker'), 'Quanto sobrou, e quanto ficou devendo', 'parte 8, página 1: o título com o limite');
  const saldo8 = await page.evaluate(() => ({
    valores: Object.fromEntries(Array.from(document.querySelectorAll('.valor-saldo'), (n) => [n.dataset.equipe, n.textContent])),
    ordem: Array.from(document.querySelectorAll('.valor-saldo'), (n) => n.dataset.equipe),
    mesaTitulo: document.querySelector('.mesa-no-ano .mesa-titulo')?.textContent ?? null,
    mesa: Array.from(document.querySelectorAll('.mesa-no-ano .mesa-equipe'), (n) => [n.dataset.equipe, n.dataset.faltouNaMesa, n.querySelector(':scope > b').textContent]),
  }));
  const ordem8 = equipes8.slice().sort((a, b) => patrimonioEsperado(placar8[b]) - patrimonioEsperado(placar8[a]) || equipes8.indexOf(a) - equipes8.indexOf(b));
  assert.deepEqual(saldo8.ordem, ordem8, 'parte 8, página 1: ordenadas pelo patrimônio, com as contas atrasadas');
  for (const eq of equipes8) assert.equal(saldo8.valores[eq], textoSaldo(patrimonioEsperado(placar8[eq])), `${eq}: "faltou" pelo patrimônio (caixa − empréstimo − contas atrasadas)`);
  assert.equal(saldo8.mesaTitulo, 'Faltou na mesa no ano (fora do saldo):', 'a linha do que faltou na mesa no ano');
  assert.deepEqual(saldo8.mesa, ordem8.map((eq) => {
    const v = Math.round(placar8[eq].faltou_na_mesa);
    return [eq, String(v), F.moeda(v)];
  }), 'o que faltou na mesa no ano, por equipe, na ordem do gráfico');
  assert.ok(saldo8.mesa.some(([, v]) => Number(v) > 0) && saldo8.mesa.some(([, v]) => Number(v) === 0), 'há equipe com comida faltando e equipe sem');
  await conferirTela('placar-saldo-limite-6-equipes');
  await avancar();
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'escolhas');
  await conferirTela('placar-escolhas-limite-6-equipes', { aoMedir: conferirGradeDasEscolhas });
  await avancar();
  await page.waitForFunction(() => document.querySelector('.tela-placar-final')?.dataset.pagina === 'pior');
  conferirPiorCaso(await lerPiorCaso(), cfg8, placar8, resultados8, equipes8);
  // A história de cada equipe, em duas páginas de três bimestres.
  let acimaNaHistoria = 0;
  let mesaNaHistoria = 0;
  for (const eq of equipes8) {
    const lida = await lerHistoriaInteira(eq, `placar-historia-limite-${eq}`, cfg8);
    conferirMesesDaHistoria(eq, V.historia.historiaDaEquipe(cfg8, eq, resultados8), lida.meses, resultados8, cfg8);
    conferirFinalDaHistoria(eq, lida, patrimonioEsperado(placar8[eq]), placar8[eq], resultados8, rodadas8, mesesDe(cfg8));
    acimaNaHistoria += lida.meses.filter((m) => m.acima).length;
    mesaNaHistoria += lida.meses.filter((m) => /faltou na mesa/.test(m.contas)).length;
  }
  assert.equal(acimaNaHistoria, 1, 'a frase da D-067 na história, uma vez');
  assert.ok(mesaNaHistoria >= 15, `a comida que faltou nas contas da história (${mesaNaHistoria} bimestres)`);
  console.log(`  parte 8: contas atrasadas em ${limitesVistos} faixa(s), comida que faltou em ${mesasVistas}; a frase da D-067 em ${acimaVistas.join(', ')}`);
}

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
console.log(`ok: sessão inteira, telão = motor, ${verificadas.length} telas conferidas em ${TAMANHOS.map((t) => t.join('×')).join(' e ')}; capturas em e2e/capturas/`);
