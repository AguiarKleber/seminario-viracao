// A matriz de votos: `npm run e2e:votos`. Fica fora do `npm run check`, como os
// outros e2e (depende de um navegador instalado e do JDK 21 do emulador).
//
// Por que existe (teste de 30/09, no site publicado): no mês 3, na equipe do
// Jonas, tocar em "Votar nesta" não registrou o voto. A causa, conferida no JSON
// que o telão baixou ao fim da rodada: a decisão do mês 3 ficou aberta 7 min 35 s
// (quem encerra é o apresentador, D-010), mas a regra do banco recusava todo voto
// depois de prazo + graça (120 s + 5 s), e a única pista no celular era uma nota
// embaixo da lista, fora da tela em 360×740. O prazo gravado passou a ser o da
// regra (o fim do cronômetro mais a folga de 12 h), e toda recusa aparece junto
// do botão tocado.
//
// A sessão inteira do roteiro 60min, com o config.json real, contra o emulador:
// 6 equipes com um celular de 360×740 em cada (mais um na segunda equipe do
// Jonas, para o empate), votando pela TELA, com toques (tocar na opção →
// "Votar nesta"; tocar no número da enquete). A cada voto, confere o servidor e
// a contagem da equipe no telão; ao fim de cada etapa, a apuração. Cobre:
// - as 3 rodadas e as 3 enquetes, com celulares nas 6 equipes (as duas do Jonas);
// - o voto depois do cronômetro, em tempo real (o "now" da regra é o relógio do
//   emulador, que o teste não controla): o teste espera, pelo relógio do próprio
//   servidor, passar 5 s do corte que a regra fazia com o prazo antigo (o fim do
//   cronômetro + a graça: 125 s no mês 3, 25 s na prorrogação, 65 s na enquete de
//   entrada), com o cronômetro em "tempo esgotado" no celular e no telão;
// - celular recarregado no meio da enquete, da rodada e do mês 3, e celular que
//   volta da tela bloqueada (o ciclo de reconexão) e vota logo em seguida;
// - a pausa (P): o "Votar nesta" apagado, com o motivo junto dele, e o voto de
//   volta ao retomar;
// - Ctrl+Z que desfaz a abertura, e a reabertura (D-037); Ctrl+Z que desfaz a
//   apuração, e o voto mudado depois;
// - a prorrogação, com só as opções empatadas no celular;
// - a ordem das opções de cada mês: a letra tocada é a opção gravada (D-051);
// - o voto sem rede: "enviando" na hora, e contado quando a rede volta; o voto
//   sem rede que só chega depois do fechamento: recusado, e o celular diz;
// - membro regravado no meio da decisão (entrouEm > abertoEm): o motivo do botão
//   apagado aparece junto dele.
// Revisão de 30/09 (depois do teste real), mais cinco situações:
// - o aluno movido de equipe DEPOIS de votar, com a decisão aberta: o telão
//   pede confirmação dizendo que o voto será descartado, o celular avisa junto
//   das opções, e o voto pela equipe nova conta (achado P1);
// - a TROCA de voto que chega depois do fechamento: o celular diz que valeu o
//   voto anterior, e a apuração o conta (achado P2);
// - no termômetro de uma afirmação por vez, a resposta sem rede que só chega
//   depois de o apresentador avançar: o celular diz qual afirmação se perdeu, e
//   o aviso some depois que ele responde a seguinte (achado P3);
// - a escrita que falha 5 vezes sem ser recusa: o botão volta a valer, e a tela
//   pede para tocar de novo (achado 5);
// - o voto em trânsito na hora da pausa: fica guardado e vai sozinho quando o
//   apresentador retoma (achado 6).
// D-064: o celular do apresentador fica ligado a matriz inteira no modo
// espectador (com o PIN), trocando de equipe a cada rodada e conferindo a tela e
// a contagem de cada uma; todas as conferências dos alunos continuam as mesmas,
// e ele nunca vira membro nem vota. Revisão da F7: antes dele, outro celular
// aperta Enter no código da tela do espectador (tem de ir ao PIN, e não entrar
// como aluno) e pede o modo com a prova do PIN sem resposta (o pedido tem de
// sair do banco quando o tempo-limite expira, ao voltar à entrada e ao fechar a
// aba). Revisão da F6b (achado 16): um aparelho que já é membro da sala pede o
// modo espectador e fica na tela do PIN, com o aviso, sem gravar o pedido e sem
// apagar o próprio membro. Revisão do voto da F6b (achado 1): o sétimo celular
// passa pelo modo espectador, volta ("Voltar") e entra como aluno; na primeira
// rodada do meio, recarrega com o voto guardado e tem de voltar à sala e
// reenviá-lo.
// O número de rodadas vem do roteiro (a D-060 leva a 6): a primeira e a
// segunda têm os casos acima, as do meio são votadas por todos, e a última é o
// caso do teste de 30/09 (todos votam depois do cronômetro).
// Esquema v3 (D-060: 12 meses em 6 bimestres): a matriz roda DUAS sessões,
// uma com o config.json (as 6 rodadas bimestrais do conteúdo real) e outra com a fixture
// de 6 rodadas bimestrais (test/fixtures/config-teste-v3.json), para as 6
// rodadas, o placar estimado das duas últimas e o fechamento mais pesado do
// telão (o decompor simulado) passarem pelos mesmos toques. Com --config
// <arquivo>, só aquele.
// Capturas em e2e/capturas/votos-*.png (as antigas são apagadas no começo; as
// da fixture v3 levam "votos-v3-").
//
// Uso: npm run e2e:votos. Com --sem-espera, as esperas longas encolhem para
// depurar o próprio teste; a verificação de verdade é sem ele.
//
// As funções passadas a page.evaluate/waitForFunction rodam no navegador.
/* global document, innerHeight */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { administrador, emuladorNoAr, PIN_EMULADOR, RAIZ, rodarNoEmulador } from '../bin/emulador.mjs';
import { servir } from '../bin/servir.mjs';
import { carregarNucleo } from '../test/carregar-nucleo.mjs';

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const SDK_CDN = 'https://www.gstatic.com/firebasejs/12.19.0/';
const UA_CELULAR = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const SEM_ESPERA = process.argv.includes('--sem-espera');
// Os configs da matriz: o do --config, ou os dois (o real e a fixture de 6
// rodadas). Relativos à raiz do projeto.
const ARG_CONFIG = process.argv.includes('--config') ? process.argv[process.argv.indexOf('--config') + 1] : null;
// Desde 06/10 (D-078), o config.json é o jogo simples (sem sorteio), com os votos
// conferidos pelo simples-online.e2e.mjs; a matriz segue com o conteúdo de 05/10
// (sorteio e 6 personas), congelado em test/fixtures/config-real-v31.json.
const CONFIG_REAL = 'test/fixtures/config-real-v31.json';
const CONFIGS = ARG_CONFIG ? [ARG_CONFIG] : [CONFIG_REAL, 'test/fixtures/config-teste-v3.json'];
const ROTEIRO = '60min';
const LETRAS = 'ABCDEFGHIJ';
const lista = (x) => (Array.isArray(x) ? x : Object.values(x || {}));

// Dentro do emulators:exec (ou com o emulador já no ar), o bin/emulador.mjs
// entrega FIREBASE_DATABASE_EMULATOR_HOST. Sem ela, este arquivo sobe o
// emulador e roda a si mesmo lá dentro.
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  // Revisão de 30/09 (achado 8): com um emulador já no ar, aberto por outro
  // processo (outro e2e, outro agente), a matriz roda nele, e se ele cair no
  // meio a matriz falha sem defeito nenhum no app. As portas são as do
  // firebase.json, fixas: o aviso diz de onde veio a falha.
  if (await emuladorNoAr()) {
    console.warn('AVISO: o emulador já estava no ar, aberto por outro processo. Se ele cair no meio (outro e2e terminando), a matriz falha sem defeito no app: rode de novo com as portas 9000 e 9099 livres.');
  }
  process.exitCode = await rodarNoEmulador(`node e2e/matriz-votos.e2e.mjs${SEM_ESPERA ? ' --sem-espera' : ''}${ARG_CONFIG ? ` --config ${ARG_CONFIG}` : ''}`);
} else {
  await matriz();
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

// Os três módulos da CDN saem do node_modules, com CORS: o teste não depende de
// internet e exercita o mesmo import() do site (como o e2e:online).
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

// O config (o config.json da raiz, ou a fixture v3), lido UMA vez e servido
// pelo Playwright ao telão: o conteúdo ainda muda até o congelamento (outro
// agente pode estar gravando o arquivo agora), e a sessão inteira precisa de
// um conteúdo só.
async function conteudoDoTeste(arquivo) {
  const V = await carregarNucleo();
  const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
  const r = V.validarConfig.validarTexto(texto);
  assert.ok(r.ok, `o ${arquivo} precisa passar no validador para a matriz de votos: ${JSON.stringify(r.erros.slice(0, 3))}`);
  const cfg = r.config;
  const passos = lista(cfg.roteiros[ROTEIRO]);
  const equipes = lista(cfg.ordem.equipes);
  const rodadas = passos.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
  const enquetes = passos.filter((p) => p.tipo === 'enquete').map((p) => ({ enquete: p.enquete, momento: p.momento }));
  assert.equal(equipes.length, 6, 'a matriz joga com as 6 equipes do config');
  // Da configuração, e não fixo (revisão de 30/09, achado 8): a D-060 leva o
  // jogo a 6 rodadas, e a D-061 dá uma persona a cada equipe. O empate da
  // prorrogação não depende da persona: é o sétimo celular na equipe 2.
  assert.ok(rodadas.length >= 3, `a matriz precisa de pelo menos 3 rodadas no roteiro ${ROTEIRO} (tem ${rodadas.length})`);
  // A D-060 leva o jogo a 6 rodadas: a matriz do config.json tem de passar pelas 6 (revisão da F7).
  if (arquivo === CONFIG_REAL) assert.equal(rodadas.length, 6, `o config de 05/10 tem 6 rodadas no roteiro ${ROTEIRO} (D-060)`);
  for (const rId of rodadas) assert.ok(lista(cfg.rodadas[rId].ordemOpcoes).length >= 3, `a rodada ${rId} tem pelo menos 3 opções`);
  console.log(`Conteúdo: ${arquivo} (versão ${cfg.versao}), roteiro ${ROTEIRO}, ${passos.length} passos, ${rodadas.length} rodadas de ${V.motor.mesesPorRodada(cfg)} mês(es).`);
  // As capturas da fixture v3 levam o prefixo, para não sobrescrever as do config.json.
  const prefixo = arquivo === CONFIG_REAL ? 'votos' : 'votos-v3';
  return { V, cfg, texto, passos, equipes, rodadas, enquetes, prefixo, opcoesDe: (rId) => lista(cfg.rodadas[rId].ordemOpcoes) };
}

// O que o telão grava logo depois de a tela mudar chega um instante depois:
// espera até esperaMs pelo valor (o mesmo ajudante do e2e:online).
async function esperarNoBanco(caminho, esperado, esperaMs = 8000) {
  let valor;
  for (let i = 0; i < esperaMs / 100; i += 1) {
    valor = await administrador('GET', caminho);
    if (JSON.stringify(valor) === JSON.stringify(esperado)) return valor;
    await new Promise((r) => setTimeout(r, 100));
  }
  return valor;
}

async function matriz() {
  mkdirSync(CAPTURAS, { recursive: true });
  for (const n of readdirSync(CAPTURAS)) if (/^votos-.*\.png$/.test(n)) rmSync(join(CAPTURAS, n));
  for (const arquivo of CONFIGS) await sessaoDaMatriz(await conteudoDoTeste(arquivo));
}

async function sessaoDaMatriz(C) {
  const site = await servir({ porta: 0 });
  // O PIN só do emulador (no projeto real, ele fica só no console, AGENTS.md regra 7).
  await administrador('PUT', 'privado/pinApresentador', PIN_EMULADOR);
  const navegador = await abrirNavegador();
  const errosDaPagina = [];
  const vigiar = (p, nome) => {
    p.on('pageerror', (e) => errosDaPagina.push(`${nome} pageerror: ${e.message}`));
    p.on('console', (m) => {
      // As recusas esperadas (o canário do autoteste, o voto que chega depois do
      // fechamento) e a rede derrubada de propósito aparecem no console do SDK.
      if (m.type() === 'error' && !/PERMISSION_DENIED|permission_denied|ERR_INTERNET_DISCONNECTED|WebSocket|FIREBASE WARNING/i.test(m.text())) {
        errosDaPagina.push(`${nome} console: ${m.text()}`);
      }
    });
  };
  const inicio = Date.now();
  try {
    await jogar({ C, site, navegador, vigiar });
  } finally {
    await navegador.close();
    await site.fechar();
  }
  assert.deepEqual(errosDaPagina, [], 'nenhum erro inesperado no console das páginas');
  console.log(`ok: matriz de votos (${C.rodadas.length} rodadas, ${C.cfg.versao}) em ${Math.round((Date.now() - inicio) / 1000)} s${SEM_ESPERA ? ' (--sem-espera: NÃO vale como verificação)' : ''}.`);
}

async function jogar({ C, site, navegador, vigiar }) {
  const servirConfig = (ctx) => ctx.route(`${site.url}config.json`, (rota) => rota.fulfill({
    status: 200, contentType: 'application/json; charset=utf-8', body: C.texto,
  }));

  // ---------- Telão ----------
  const ctxTelao = await navegador.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  await servirSdk(ctxTelao);
  await servirConfig(ctxTelao);
  const telao = await ctxTelao.newPage();
  vigiar(telao, 'telão');
  await telao.goto(`${site.url}telao/?emulador=1`);
  await telao.waitForFunction(() => /regras v[0-9]+ conferidas/.test(document.getElementById('status-online')?.textContent || ''), null, { timeout: 30000 });
  await telao.waitForFunction(() => document.getElementById('hash-config'));
  await telao.check(`input[name="roteiro"][value="${ROTEIRO}"]`);
  await telao.fill('#pin-apresentador', PIN_EMULADOR);
  await telao.click('[data-acao="criar-online"]');
  await telao.waitForFunction(() => document.body.dataset.tela === 'lobby', null, { timeout: 20000 });
  const sala = await telao.evaluate(() => globalThis.Viracao.telao.sala());
  assert.equal((await administrador('GET', `salas/${sala}/meta`)).roteiro, ROTEIRO);
  console.log(`Sala ${sala} criada (roteiro ${ROTEIRO}).`);
  const s = (...partes) => ['salas', sala, ...partes].join('/');

  const estado = () => telao.evaluate(() => globalThis.Viracao.telao.estado());
  async function esperarEstado(teste, descricao, timeout = 20000) {
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
  // Espaço até o estado chegar onde se quer. O placar final e o comparativo
  // paginam com o Espaço sem mudar o estado: não dá para esperar cada Espaço
  // mudar o passo.
  async function avancarAte(teste, descricao) {
    for (let i = 0; i < 30; i += 1) {
      if (teste(await estado())) return estado();
      await espaco();
      await telao.waitForTimeout(250);
    }
    return esperarEstado(teste, descricao);
  }
  async function avancar(descricao, teste) {
    const antes = await estado();
    await espaco();
    return esperarEstado(teste || ((e) => e.indice !== antes.indice || e.subfase !== antes.subfase), descricao);
  }
  // Os modais de confirmação começam com o foco no "Cancelar": confirmar é Tab e Enter.
  async function confirmarModal() {
    await telao.waitForFunction(() => document.getElementById('modal').open, null, { timeout: 5000 });
    await telao.keyboard.press('Tab');
    await telao.keyboard.press('Enter');
    await telao.waitForFunction(() => !document.getElementById('modal').open);
  }
  // Enter encerra; dentro do tempo mínimo de conversa, o telão pede confirmação.
  async function encerrar(descricao, teste) {
    const antes = await estado();
    await telao.keyboard.press('Enter');
    const modal = await telao.waitForFunction(() => document.getElementById('modal').open, null, { timeout: 1200 }).then(() => true, () => false);
    if (modal) {
      await telao.keyboard.press('Tab');
      await telao.keyboard.press('Enter');
    }
    return esperarEstado(teste || ((e) => e.geracao > antes.geracao + 1 || !['votando', 'decidindo', 'prorrogacao', 'fechando'].includes(e.subfase)), descricao, 30000);
  }
  async function desfazer(descricao, teste) {
    await telao.keyboard.press('Control+z');
    await confirmarModal();
    return esperarEstado(teste, descricao, 30000);
  }

  // O relógio do emulador (o "now" da regra), pedido ao próprio servidor. O do
  // telão e o do celular são estimativas (Date.now() + o serverTimeOffset do
  // SDK), e numa execução com 8 páginas na mesma máquina o de um celular errou
  // 22 s: o celular mostrava 0:12 quando o servidor já tinha passado do corte.
  // Quem decide se o voto vale é o servidor, e é pelo relógio dele que a espera
  // passa do corte do prazo antigo.
  const agoraNoServidor = () => administrador('PUT', 'e2e/relogio', { '.sv': 'timestamp' });
  async function esperarPassarDoPrazoAntigo(e, oque, margemSeg = 5) {
    // Com o prazo antigo (o fim do cronômetro), a regra cortava em fim + graça.
    const corteAntigo = C.V.alunoLogica.fimDoCronometro(e) + C.cfg.tempos.gracaSeg * 1000;
    const alvo = SEM_ESPERA ? (await agoraNoServidor()) + 2000 : corteAntigo + margemSeg * 1000;
    const falta = alvo - (await agoraNoServidor());
    console.log(`${oque}: esperando ${Math.max(0, Math.round(falta / 1000))} s com a votação aberta, até o servidor passar do corte do prazo antigo (fim do cronômetro + ${C.cfg.tempos.gracaSeg} s de graça).`);
    if (falta > 0) await telao.waitForTimeout(falta);
    while ((await agoraNoServidor()) < alvo) await telao.waitForTimeout(200);
  }
  // O cronômetro esgotado na tela (o celular, ou o telão com [data-cronometro]).
  // Com espera: cada tela desenha pelo próprio relógio, que pode errar alguns
  // segundos para o lado de lá (o comentário acima).
  async function cronometroEsgotado(p, seletor, oque) {
    if (SEM_ESPERA) return;
    await p.waitForFunction((sel) => document.querySelector(sel)?.textContent === 'tempo esgotado', seletor, { timeout: 45000 })
      .catch(async () => { throw new Error(`${oque}: o cronômetro não chegou a "tempo esgotado" (mostra "${await p.textContent(seletor)}")`); });
  }

  // ---------- Celulares ----------
  const url = `${site.url}aluno/?sala=${sala}&emulador=1`;
  async function novoCelular(nome) {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA_CELULAR });
    await servirSdk(ctx);
    // Falha de rede simulada (achado 5): com globalThis.__falhasGravar > 0, a
    // escrita de uma decisão falha sem ser recusa da regra, como numa rede que
    // derruba a escrita. É o único jeito de exercitar o reenvio até o teto: o
    // emulador só recusa por permissão. Sem o contador, nada muda.
    await ctx.addInitScript(() => {
      const V = (globalThis.Viracao ||= {});
      let fabrica;
      Object.defineProperty(V, 'canalFirebase', {
        configurable: true,
        enumerable: true,
        get: () => fabrica,
        set: (f) => {
          fabrica = {
            ...f,
            criar: (opcoes) => {
              const canal = f.criar(opcoes);
              const gravar = canal.gravar;
              canal.gravar = (escritas) => {
                if (globalThis.__falhasGravar > 0 && Object.keys(escritas).some((c) => c.includes('/decisoes/'))) {
                  globalThis.__falhasGravar -= 1;
                  return Promise.reject(new Error('falha de rede simulada pelo teste'));
                }
                return gravar.call(canal, escritas);
              };
              // A prova do PIN que não responde (revisão da F7, achado 2):
              // com globalThis.__provaSemResposta, a leitura de
              // decisoes/_pin/_pin nunca volta, como numa rede que cai entre a
              // gravação do pedido e a prova. O emulador não segura uma
              // leitura: é o único jeito de chegar a esse caminho.
              const ler = canal.ler;
              canal.ler = (caminho, ...resto) => {
                if (globalThis.__provaSemResposta && String(caminho).includes('decisoes/_pin')) return new Promise(() => {});
                return ler.call(canal, caminho, ...resto);
              };
              return canal;
            },
          };
        },
      });
    });
    const p = await ctx.newPage();
    vigiar(p, nome);
    await p.goto(url);
    return { nome, ctx, p, uid: null, equipe: null };
  }
  const telaDe = (c) => c.p.evaluate(() => document.body.dataset.tela);
  async function esperarTela(c, tipo, timeout = 25000) {
    try {
      await c.p.waitForFunction((t) => document.body.dataset.tela === t, tipo, { timeout });
    } catch (erro) {
      throw new Error(`${c.nome}: esperava a tela "${tipo}", está em "${await telaDe(c)}" (${erro.message.split('\n')[0]})`);
    }
  }
  // O elemento inteiro à vista: abaixo do topo fixo e acima do aviso "Mais
  // opções abaixo" (quando ele aparece). Um retorno fora da tela é um retorno
  // que ninguém vê (teste de 30/09).
  async function naTela(c, seletor, oque) {
    try {
      await c.p.waitForFunction((sel) => {
        const n = document.querySelector(sel);
        if (!n) return false;
        const r = n.getBoundingClientRect();
        const topo = document.querySelector('.topo')?.getBoundingClientRect().bottom ?? 0;
        const aviso = document.querySelector('[data-aviso-rolagem]');
        const limite = aviso && !aviso.hidden ? aviso.getBoundingClientRect().top : innerHeight;
        return r.height > 0 && r.top >= topo - 1 && r.bottom <= limite + 1;
      }, seletor, { timeout: 8000 });
    } catch {
      const onde = await c.p.evaluate((sel) => {
        const n = document.querySelector(sel);
        return n ? { texto: n.textContent, topo: Math.round(n.getBoundingClientRect().top), base: Math.round(n.getBoundingClientRect().bottom), altura: innerHeight } : null;
      }, seletor);
      throw new Error(`${c.nome}: ${oque} não está à vista na tela (${seletor}: ${JSON.stringify(onde)})`);
    }
  }
  let capturas = 0;
  const capturar = (c, nome) => c.p.screenshot({ path: join(CAPTURAS, `${C.prefixo}-${String(++capturas).padStart(2, '0')}-${nome}.png`) });

  // Os 6 da matriz (um por equipe, na ordem do config) e o sétimo, na segunda
  // equipe do Jonas, para o empate da prorrogação.
  const [E1, E2, E3, E4, E5, E6] = C.equipes;
  const cel = [];
  for (const [i, eq] of [E1, E2, E3, E4, E5, E6, E2].entries()) {
    const c = await novoCelular(`celular ${i + 1} (${eq})`);
    c.equipe = eq;
    cel.push(c);
  }
  const extra = cel[6];
  // Revisão do voto (achado da marca do espectador): o sétimo celular passa
  // antes pelo modo espectador, recarrega (volta ao campo do PIN), toca em
  // "Voltar" e entra como ALUNO, como na orientação do teste das 18h (um
  // celular a mais, entrando como aluno). Antes, a marca "espectador" da aba
  // sobrevivia ao "Voltar": toda recarga desse aparelho caía no campo do PIN e
  // não voltava à sala. A recarga com o voto guardado fica na primeira rodada
  // do meio (votoGuardadoERecarga).
  await espectadorQueViraAluno(extra);
  for (const c of cel) {
    await esperarTela(c, 'entrada');
    await c.p.locator('[data-acao="entrar"]').tap();
  }
  for (const c of cel) {
    await esperarTela(c, 'aguardando');
    c.uid = await c.p.evaluate(() => globalThis.Viracao.aluno.uid());
  }
  assert.equal(new Set(cel.map((c) => c.uid)).size, cel.length, 'cada celular é um aparelho');
  await telao.waitForFunction((n) => document.querySelector('.lobby-conectados b')?.textContent === String(n), cel.length, { timeout: 30000 });
  console.log(`${cel.length} celulares na sala.`);

  // ---------- O espectador (D-064), ligado a matriz inteira ----------
  // O celular do apresentador entra com o PIN no lobby e fica ligado até o fim,
  // trocando de equipe a cada rodada. O voto dos alunos não pode sentir nada:
  // o "N de M" do telão, os votos no servidor e a apuração continuam os dos
  // alunos (as conferências abaixo são as mesmas de sem ele), e ele nunca vira
  // membro nem vota.
  // Revisão da F7 (achados 1 e 2), só na primeira sessão (a prova sem
  // resposta espera os 15 s do tempo-limite): dois caminhos em que o celular do
  // apresentador escapava do modo espectador.
  if (C.prefixo === 'votos') await tropecosDoEspectador();
  const esp = await novoCelular('espectador');
  await esperarTela(esp, 'entrada');
  await esp.p.locator('[data-acao="sou-apresentador"]').tap();
  await esp.p.locator('#pin-espectador').fill(PIN_EMULADOR);
  await esp.p.locator('[data-acao="entrar-espectador"]').tap();
  await esperarTela(esp, 'aguardando');
  esp.uid = await esp.p.evaluate(() => globalThis.Viracao.aluno.uid());
  assert.equal(await administrador('GET', `pedidosAnfitriao/${esp.uid}`), PIN_EMULADOR, 'o pedido do espectador está no banco');
  await telao.waitForTimeout(1500);
  assert.equal(await telao.textContent('.lobby-conectados b'), String(cel.length), 'o espectador não entra na contagem do lobby');
  async function tropecosDoEspectador() {
    const t = await novoCelular('espectador-tropecos');
    const uidDe = () => t.p.evaluate(() => globalThis.Viracao.aluno.uid());
    const membroDe = async (uid) => (uid ? (await administrador('GET', s('membros')))?.[uid] ?? null : null);
    // (1) Enter no campo do código, na tela do modo espectador, é o gesto de
    // quem passa ao campo do PIN. Antes, entrava como ALUNO: membros/{uid}
    // gravado, contado no "N de M" depois da trava e, recarregada a página,
    // a sala guardada entrava direto como aluno, sem o "Sou apresentador".
    await esperarTela(t, 'entrada');
    await t.p.locator('[data-acao="sou-apresentador"]').tap();
    await t.p.locator('#pin-espectador').waitFor();
    await t.p.locator('#codigo-sala').focus();
    await t.p.keyboard.press('Enter');
    await t.p.waitForTimeout(2500);
    assert.equal(await telaDe(t), 'entrada', 'Enter no código do espectador: continua na tela do PIN');
    assert.equal(await t.p.evaluate(() => document.activeElement?.id), 'pin-espectador', 'Enter no código do espectador: o foco vai para o PIN');
    assert.equal(await membroDe(await uidDe()), null, 'Enter no código do espectador: não vira membro');
    await t.p.reload();
    await esperarTela(t, 'entrada');
    await t.p.waitForTimeout(1500);
    assert.equal(await telaDe(t), 'entrada', 'recarregada, a página não entra sozinha na sala');
    assert.equal(await t.p.locator('[data-acao="sou-apresentador"]').count(), 1, 'recarregada, a entrada tem o "Sou apresentador"');
    console.log('Espectador: Enter no código leva ao PIN, e o aparelho não vira aluno (achado 1).');
    // (2) A prova do PIN sem resposta depois de o pedido gravado: o pedido
    // não pode ficar no banco (seria um PIN_OK permanente para o uid anônimo
    // deste navegador), nem ao sair pela tela de erro, nem ao fechar a aba no
    // meio da espera.
    async function pedirSemProva() {
      await t.p.evaluate(() => { globalThis.__provaSemResposta = true; });
      if (await t.p.locator('#pin-espectador').count() === 0) await t.p.locator('[data-acao="sou-apresentador"]').tap();
      await t.p.locator('#pin-espectador').fill(PIN_EMULADOR);
      await t.p.locator('[data-acao="entrar-espectador"]').tap();
      await t.p.waitForFunction(() => globalThis.Viracao.aluno.uid(), null, { timeout: 20000 });
      const uid = await uidDe();
      assert.equal(await esperarNoBanco(`pedidosAnfitriao/${uid}`, PIN_EMULADOR), PIN_EMULADOR, 'o pedido foi gravado antes da prova');
      return uid;
    }
    const uidT = await pedirSemProva();
    await esperarTela(t, 'erro', 30000);
    // O tempo-limite da prova expirou: o pedido sai já, sem esperar o toque.
    assert.equal(await esperarNoBanco(`pedidosAnfitriao/${uidT}`, null, 5000), null, 'prova sem resposta: o pedido sai do banco quando o tempo-limite expira');
    await t.p.locator('[data-acao="outra-sala"]').tap();
    await esperarTela(t, 'entrada');
    assert.equal(await esperarNoBanco(`pedidosAnfitriao/${uidT}`, null), null, 'prova sem resposta: o pedido sai do banco ao voltar à entrada');
    assert.equal(await pedirSemProva(), uidT, 'o mesmo aparelho');
    await t.p.close();
    assert.equal(await esperarNoBanco(`pedidosAnfitriao/${uidT}`, null, 20000), null, 'prova sem resposta: o pedido sai do banco quando a aba fecha no meio da espera');
    assert.equal(await membroDe(uidT), null, 'o aparelho nunca virou membro');
    await t.ctx.close();
    console.log('Espectador: com a prova do PIN sem resposta, o pedido some ao sair e ao fechar a aba (achado 2).');
    // (3) Um aparelho que já é membro da sala não entra no modo espectador:
    // seria um membro fantasma no "N de M" (o registro fica, e o espectador
    // nunca manda presença nem vota). O celular avisa e não apaga o membro: quem
    // tira um aluno da sala é o apresentador, pelo telão. O caminho real: o
    // aparelho entrou como aluno e voltou à entrada por uma tela de erro
    // ("Entrar em outra sala" esquece a sala guardada), como faz o teste.
    const m = await novoCelular('espectador-ja-membro');
    await esperarTela(m, 'entrada');
    await m.p.locator('[data-acao="entrar"]').tap();
    await esperarTela(m, 'aguardando');
    const uidM = await m.p.evaluate(() => globalThis.Viracao.aluno.uid());
    // A tela "aguardando" vem antes do registro ("Entrando na sala…"): espera
    // o membro chegar ao banco.
    for (let i = 0; i < 100 && !(await membroDe(uidM)); i += 1) await m.p.waitForTimeout(100);
    assert.ok(await membroDe(uidM), 'o aparelho entrou como aluno');
    await m.p.evaluate(() => localStorage.removeItem('viracao:aluno:sala'));
    await m.p.reload();
    await esperarTela(m, 'entrada');
    await m.p.locator('[data-acao="sou-apresentador"]').tap();
    await m.p.locator('#pin-espectador').fill(PIN_EMULADOR);
    await m.p.locator('[data-acao="entrar-espectador"]').tap();
    await m.p.waitForFunction(() => /já entrou como aluno/.test(document.querySelector('[data-espectador] .nota')?.textContent || ''), null, { timeout: 20000 })
      .catch(async () => { throw new Error(`aparelho que já é membro: esperava o aviso na tela do PIN; tela "${await telaDe(m)}", espectador ${JSON.stringify(await m.p.evaluate(() => globalThis.Viracao.aluno.espectador()))}`); });
    assert.equal(await m.p.evaluate(() => globalThis.Viracao.aluno.uid()), uidM, 'o mesmo aparelho');
    assert.equal(await telaDe(m), 'entrada', 'aparelho que já é membro: fica na tela do PIN');
    assert.equal(await m.p.evaluate(() => globalThis.Viracao.aluno.espectador()), null, 'aparelho que já é membro: não entra no modo espectador');
    assert.equal(await administrador('GET', `pedidosAnfitriao/${uidM}`), null, 'aparelho que já é membro: o PIN nem vai para o banco');
    assert.ok(await membroDe(uidM), 'aparelho que já é membro: o celular não apaga o próprio membro');
    await capturar(m, 'espectador-ja-membro');
    await m.ctx.close();
    // A limpeza é do teste (o apresentador usaria "Remover inativos"): a matriz
    // conta só os celulares dela.
    await administrador('DELETE', s('membros', uidM));
    await administrador('DELETE', s('presenca', uidM));
    await telao.waitForFunction((n) => document.querySelector('.lobby-conectados b')?.textContent === String(n), cel.length, { timeout: 30000 });
    console.log('Espectador: um aparelho que já é membro da sala não entra no modo espectador, com o aviso (achado 16).');
  }
  async function espectadorQueViraAluno(c) {
    await esperarTela(c, 'entrada');
    await c.p.locator('[data-acao="sou-apresentador"]').tap();
    await c.p.locator('#pin-espectador').fill(PIN_EMULADOR);
    await c.p.locator('[data-acao="entrar-espectador"]').tap();
    await esperarTela(c, 'aguardando');
    const uid = await c.p.evaluate(() => globalThis.Viracao.aluno.uid());
    assert.equal(await esperarNoBanco(`pedidosAnfitriao/${uid}`, PIN_EMULADOR), PIN_EMULADOR, `${c.nome}: entrou no modo espectador`);
    await c.p.reload();
    await c.p.locator('#pin-espectador').waitFor({ timeout: 15000 });
    await c.p.locator('[data-acao="voltar-entrada"]').tap();
    await c.p.locator('[data-acao="entrar"]').waitFor();
    assert.equal(await c.p.evaluate(() => sessionStorage.getItem('viracao:aluno:espectador') || null), null, `${c.nome}: o "Voltar" apaga a marca do modo espectador na aba`);
    assert.equal(await esperarNoBanco(`pedidosAnfitriao/${uid}`, null), null, `${c.nome}: o pedido do espectador saiu do banco`);
  }
  // O voto que falha sem ser recusa fica guardado no aparelho; a recarga tem de
  // voltar à sala (e não ao campo do PIN do espectador) e reenviar o voto. A
  // falha simulada do novoCelular some com a recarga (o addInitScript começa
  // sem o contador).
  async function votoGuardadoERecarga(c, rId, op) {
    await c.p.evaluate(() => { globalThis.__falhasGravar = 99; });
    const botaoOpcao = c.p.locator(opcaoNoCelular(op));
    if (await botaoOpcao.getAttribute('aria-expanded') !== 'true') await botaoOpcao.tap();
    await c.p.locator(`[data-detalhe="${op}"] [data-votar]`).tap();
    await c.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length > 0, null, { timeout: 10000 });
    assert.equal(await administrador('GET', s('decisoes', rId, c.equipe, c.uid)), null, `${c.nome}: o voto ficou só no aparelho`);
    await c.p.reload();
    await esperarTela(c, 'decisao').catch(async (erro) => {
      throw new Error(`${c.nome}: recarregado, não voltou à sala (campo do PIN na tela: ${await c.p.locator('#pin-espectador').count()}; ${erro.message})`);
    });
    assert.equal(await esperarNoBanco(s('decisoes', rId, c.equipe, c.uid), op, 15000), op, `${c.nome}: o voto guardado no aparelho foi reenviado depois da recarga`);
    await c.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 0, null, { timeout: 10000 });
    console.log(`${c.nome}: o aparelho que foi espectador e entrou como aluno recarregou com o voto guardado, voltou à sala e o voto foi reenviado.`);
  }
  async function espectadorFora(oque) {
    const m = await administrador('GET', s('membros'));
    assert.equal(m?.[esp.uid], undefined, `${oque}: o espectador não é membro`);
    assert.equal(await administrador('GET', s('presenca', esp.uid)), null, `${oque}: nem manda presença`);
  }
  await espectadorFora('lobby');
  // Troca o espectador para a equipe e confere que ele vê a tela de um aluno
  // dela: a mesma tela, as mesmas opções e a mesma contagem ao vivo, com o
  // "Votar nesta" apagado e o motivo junto dele.
  const contagemNaTela = (c) => c.p.$$eval('.botao-opcao-aluno', (bs) => bs.map((b) => [b.dataset.opcao, b.querySelector('.opcao-votos')?.textContent]));
  async function espectadorVe(eq, oque) {
    await esp.p.locator(`[data-ver-equipe="${eq}"]`).tap();
    await esp.p.waitForFunction((e) => globalThis.Viracao.aluno.espectador()?.equipe === e, eq, { timeout: 10000 });
    const aluno = cel.find((c) => c.equipe === eq);
    const tela = await telaDe(aluno);
    await esperarTela(esp, tela);
    const esperado = JSON.stringify(await contagemNaTela(aluno));
    await esp.p.waitForFunction((x) => JSON.stringify([...document.querySelectorAll('.botao-opcao-aluno')].map((b) => [b.dataset.opcao, b.querySelector('.opcao-votos')?.textContent])) === x, esperado, { timeout: 15000 })
      .catch(async () => { throw new Error(`${oque}: o espectador na equipe ${eq} mostra ${JSON.stringify(await contagemNaTela(esp))}; o ${aluno.nome}, ${esperado}`); });
    if (tela === 'decisao' || tela === 'prorrogacao') {
      const [[op]] = await contagemNaTela(aluno);
      const b = esp.p.locator(opcaoNoCelular(op));
      if (await b.getAttribute('aria-expanded') !== 'true') await b.tap();
      const votar = esp.p.locator(`[data-detalhe="${op}"] [data-votar]`);
      await votar.waitFor({ timeout: 10000 });
      assert.equal(await votar.isDisabled(), true, `${oque}: o espectador não vota`);
      assert.equal(await esp.p.textContent(`[data-detalhe="${op}"] .opcao-aviso`), 'Modo espectador: não vota.', `${oque}: o motivo junto do botão`);
    }
    await espectadorFora(oque);
  }

  // ---------- Enquete ----------
  // Toca no número da escala da afirmação da vez. No modo "todas", o celular
  // avança sozinho depois da confirmação do servidor.
  async function responderEnquete(c, afirmacao, valor) {
    await c.p.waitForFunction((a) => document.querySelector('.bloco-enquete')?.dataset.afirmacao === a, afirmacao, { timeout: 20000 });
    await c.p.locator(`[data-valor="${valor}"]`).tap();
  }
  const valorDe = (i, k) => 1 + ((i + k) % 5);
  // faltam: as respostas [celular, afirmação] que chegaram tarde e não contam.
  const faltou = (faltam, c, a) => faltam.some(([x, y]) => x === c && y === a);
  async function conferirVotosEnquete(enq, momento, afirmacoes, celulares, oque, faltam = []) {
    for (const a of afirmacoes) {
      for (const [i, c] of celulares.entries()) {
        const esperado = faltou(faltam, c, a) ? null : valorDe(cel.indexOf(c), afirmacoes.indexOf(a));
        const lido = await esperarNoBanco(s('votosEnquete', enq, momento, a, c.uid), esperado);
        assert.equal(lido, esperado, `${oque}: o voto do ${c.nome} na afirmação ${a} chegou ao servidor (${i})`);
      }
    }
  }
  async function conferirApuracaoEnquete(enq, momento, afirmacoes, celulares, oque, faltam = []) {
    const ap = await esperarNoBanco(s('enquetes', enq, momento, 'metodo'), 'celular', 10000)
      .then(() => administrador('GET', s('enquetes', enq, momento)));
    for (const a of afirmacoes) {
      const hist = [0, 0, 0, 0, 0];
      const contam = celulares.filter((c) => !faltou(faltam, c, a));
      for (const c of contam) hist[valorDe(cel.indexOf(c), afirmacoes.indexOf(a)) - 1] += 1;
      assert.deepEqual(lista(ap.histogramas[a]), hist, `${oque}: a apuração da afirmação ${a} é a dos votos da tela`);
      assert.equal(ap.n[a], contam.length, `${oque}: n da afirmação ${a}`);
    }
  }
  const votaramNoTelao = (n, total) => telao.waitForFunction(([a, b]) => {
    const t = document.querySelector('.enquete-status')?.textContent.replace(/\s+/g, ' ') || '';
    return t.includes(`${a} de ${b} votaram`);
  }, [n, total], { timeout: 20000 });

  const passoDaEnquete = (enq, momento) => C.passos.findIndex((p) => p.tipo === 'enquete' && p.enquete === enq && p.momento === momento);
  // atrasado (achado P3, só no modo uma por vez): o celular responde a primeira
  // afirmação sem rede, o apresentador avança, e a resposta chega tarde.
  async function jogarEnquete({ enq, momento, tardios = [], recarrega = null, atrasado = null }) {
    const def = C.cfg.enquetes[enq];
    const afirmacoes = lista(def.ordemAfirmacoes);
    const e = await esperarEstado((x) => x.tipo === 'enquete' && x.enquete === enq && x.momento === momento && x.subfase === 'votando', `enquete ${enq}/${momento}`);
    const umaPorVez = e.afirmacao !== '*';
    const agora = cel.filter((c) => !tardios.includes(c));
    const faltam = [];
    if (atrasado && (!umaPorVez || afirmacoes.length < 2)) throw new Error('o atrasado só existe no modo uma por vez, com 2 afirmações ou mais');
    for (const [k, a] of afirmacoes.entries()) {
      if (umaPorVez && k > 0) {
        await avancar(`afirmação ${a}`, (x) => x.afirmacao === a);
        if (atrasado && k === 1) await respostaQueChegouTarde(atrasado, a);
      }
      for (const c of agora) {
        await esperarTela(c, 'enquete');
        if (c === atrasado && k === 0) {
          await c.ctx.setOffline(true);
          await responderEnquete(c, a, valorDe(cel.indexOf(c), k));
          faltam.push([c, a]);
          continue;
        }
        await responderEnquete(c, a, valorDe(cel.indexOf(c), k));
        if (c === recarrega && k === 0) {
          // Recarregar no meio da enquete: o voto dado continua lá, e o
          // celular volta na afirmação seguinte, sem perder nada.
          await c.p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 0, null, { timeout: 15000 });
          await c.p.reload();
          await c.p.waitForFunction(() => globalThis.Viracao?.aluno?.uid(), null, { timeout: 20000 });
          assert.equal(await c.p.evaluate(() => globalThis.Viracao.aluno.uid()), c.uid, 'recarregar mantém o aparelho');
        }
      }
      if (umaPorVez) {
        for (const c of agora) if (!faltou(faltam, c, a)) await esperarTela(c, 'enqueteRegistrada');
      }
      if (umaPorVez && tardios.length > 0) throw new Error('a matriz só espera o tempo longo em enquete "todas"');
    }
    if (!umaPorVez) for (const c of agora) await esperarTela(c, 'enqueteRegistrada');
    if (atrasado) {
      // Respondeu a afirmação seguinte depois de ver o aviso: o aviso some, e a
      // tela "Registrado" não fica com um "não foi contado" em vermelho ao lado
      // de respostas que contaram.
      await esperarTela(atrasado, 'enqueteRegistrada');
      assert.equal(await atrasado.p.locator('.nota[data-tipo="erro"]').count(), 0, `${atrasado.nome}: o aviso da resposta perdida some depois de responder a seguinte`);
    }
    if (tardios.length > 0) {
      // Com o prazo antigo, a regra cortava em enqueteSeg + graça (65 s): os
      // tardios votam depois disso, com a enquete ainda aberta no telão.
      await esperarPassarDoPrazoAntigo(e, `Enquete ${enq}/${momento}`);
      await cronometroEsgotado(tardios[0].p, '.cronometro-aluno', `${tardios[0].nome}, enquete ${enq}/${momento}`);
      assert.equal((await estado()).subfase, 'votando', 'e o telão ainda não encerrou');
      for (const c of tardios) {
        for (const [k, a] of afirmacoes.entries()) await responderEnquete(c, a, valorDe(cel.indexOf(c), k));
        await esperarTela(c, 'enqueteRegistrada');
      }
    }
    await conferirVotosEnquete(enq, momento, afirmacoes, cel, `enquete ${enq}/${momento}`, faltam);
    await votaramNoTelao(cel.length, cel.length);
    await encerrar(`apurar ${enq}/${momento}`, (x) => x.subfase === 'apurada');
    await conferirApuracaoEnquete(enq, momento, afirmacoes, cel, `enquete ${enq}/${momento}`, faltam);
    for (const c of cel) await esperarTela(c, 'enqueteRegistrada');
    console.log(`Enquete ${enq}/${momento}: ${cel.length} celulares votaram pela tela${tardios.length > 0 ? `, ${tardios.length} depois do cronômetro` : ''}${atrasado ? '; a resposta que chegou depois do avanço foi avisada e não contou' : ''}; apuração conferida.`);
  }

  // A resposta da primeira afirmação chega depois de o apresentador avançar: a
  // regra recusa, e o celular, já na afirmação seguinte, diz qual se perdeu.
  // Antes, nada aparecia ali, e o "não foi contado" só surgia depois, em
  // vermelho, ao lado de respostas que contaram.
  async function respostaQueChegouTarde(c, afirmacaoDaVez) {
    await c.ctx.setOffline(false);
    const texto = 'A resposta da afirmação 1 chegou depois de o apresentador avançar e não foi contada.';
    await c.p.waitForFunction(({ a, t }) => document.querySelector('.bloco-enquete')?.dataset.afirmacao === a
      && [...document.querySelectorAll('.bloco-enquete .nota')].some((n) => n.textContent === t), { a: afirmacaoDaVez, t: texto }, { timeout: 30000 })
      .catch(async (erro) => {
        const notas = await c.p.$$eval('.nota', (ns) => ns.map((n) => n.textContent));
        throw new Error(`${c.nome}: a resposta recusada depois do avanço não foi avisada (notas ${JSON.stringify(notas)}, envios ${JSON.stringify(await c.p.evaluate(() => globalThis.Viracao.aluno.envios()))}; ${erro.message.split('\n')[0]})`);
      });
    await naTela(c, '.bloco-enquete .nota[data-tipo="erro"]', 'o aviso da resposta que chegou tarde');
    await capturar(c, 'termometro-resposta-depois-do-avanco');
  }

  // ---------- Rodada ----------
  const opcaoNoCelular = (op) => `.botao-opcao-aluno[data-opcao="${op}"]`;
  // D-051: a letra que o aluno lê é a posição da opção no config daquele mês, no
  // celular e no telão; a opção gravada é a tocada.
  async function conferirOrdem(c, rId) {
    const ordem = C.opcoesDe(rId);
    const lidas = await c.p.$$eval('.botao-opcao-aluno', (bs) => bs.map((b) => [b.dataset.opcao, b.querySelector('.opcao-letra').textContent]));
    const empatadas = (await estado()).empatadas?.[c.equipe];
    const esperadas = ordem.map((o, i) => [o, LETRAS[i]]).filter(([o]) => !empatadas || empatadas[o] === true);
    assert.deepEqual(lidas, esperadas, `${c.nome}: as opções de ${rId} na ordem do config, com as letras certas`);
  }
  async function conferirOrdemNoTelao(rId) {
    const lidas = await telao.$$eval('.opcoes li', (ls) => ls.map((l) => [l.dataset.opcao, l.querySelector('.letra').textContent]));
    assert.deepEqual(lidas, C.opcoesDe(rId).map((o, i) => [o, LETRAS[i]]), `telão: as opções de ${rId} na ordem do config`);
  }
  // "k de m decidiram" da equipe, no telão.
  const decidiramNoTelao = (eq, k, m) => telao.waitForFunction(([e, t]) => {
    const n = document.querySelector(`.equipe-status[data-equipe="${e}"] .equipe-andamento`);
    return Boolean(n) && n.textContent.replace(/\s+/g, ' ').includes(t);
  }, [eq, `${k} de ${m} decidiram`], { timeout: 20000 }).catch(async (erro) => {
    const t = await telao.textContent(`.equipe-status[data-equipe="${eq}"]`).catch(() => null);
    throw new Error(`telão, equipe ${eq}: esperava "${k} de ${m} decidiram", mostra "${t}" (${erro.message.split('\n')[0]})`);
  });
  // Tocar na opção (abre a explicação, sem votar) e tocar em "Votar nesta". O
  // retorno tem de aparecer à vista, junto do botão: a opção marcada "✓ seu
  // voto" e "Seu voto está nesta." no lugar do botão.
  async function votarPelaTela(c, rId, op) {
    const botaoOpcao = c.p.locator(opcaoNoCelular(op));
    if (await botaoOpcao.getAttribute('aria-expanded') !== 'true') await botaoOpcao.tap();
    const votar = c.p.locator(`[data-detalhe="${op}"] [data-votar]`);
    await votar.waitFor({ timeout: 10000 });
    assert.equal(await votar.isEnabled(), true, `${c.nome}: "Votar nesta" habilitado em ${rId}/${op}`);
    await votar.tap();
    await c.p.waitForFunction((o) => {
      const b = document.querySelector(`.botao-opcao-aluno[data-opcao="${o}"]`);
      return b?.dataset.meuVoto === '1' && /✓ seu voto/.test(b.textContent) && /Seu voto está nesta/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || '');
    }, op, { timeout: 15000 }).catch(async (erro) => {
      const envios = await c.p.evaluate(() => globalThis.Viracao.aluno.envios());
      const notas = await c.p.$$eval('.nota', (ns) => ns.map((n) => n.textContent));
      throw new Error(`${c.nome}: o voto em ${rId}/${op} não foi confirmado na tela (envios ${JSON.stringify(envios)}, notas ${JSON.stringify(notas)}; ${erro.message.split('\n')[0]})`);
    });
    await naTela(c, `[data-detalhe="${op}"] .opcao-votada`, `a confirmação do voto em ${rId}/${op}`);
    const noServidor = await esperarNoBanco(s('decisoes', rId, c.equipe, c.uid), op);
    assert.equal(noServidor, op, `${c.nome}: o voto em ${rId}/${op} está no servidor`);
  }
  // O que a apuração tem de dar, equipe por equipe: { eq: { decisao, origem, contagem? } }.
  async function conferirResultado(rId, esperado) {
    const res = await esperarNoBanco(s('resultados', rId, E1, 'origem'), esperado[E1].origem, 15000)
      .then(() => administrador('GET', s('resultados', rId)));
    assert.ok(res, `resultados/${rId} gravado`);
    for (const [eq, exp] of Object.entries(esperado)) {
      const r = res[eq];
      assert.ok(r, `resultados/${rId}/${eq} gravado`);
      assert.deepEqual([r.decisao, r.origem], [exp.decisao, exp.origem], `${rId}/${eq}: decisão e origem (${JSON.stringify(r.contagem)})`);
      if (exp.contagem) {
        const contagem = Object.fromEntries(C.opcoesDe(rId).map((o) => [o, exp.contagem[o] ?? 0]));
        assert.deepEqual({ ...r.contagem }, contagem, `${rId}/${eq}: a contagem da apuração é a dos votos da tela`);
      }
    }
  }
  const umVoto = (op) => ({ [op]: 1 });

  // Achado 5: a escrita da decisão falha 5 vezes sem ser recusa da regra (a
  // falha simulada do novoCelular). Antes, depois da quinta, a tela dizia
  // "guardado: será reenviado" para sempre, e nada mais reenviava. Agora o
  // "Votar nesta" volta a valer, com o aviso junto dele.
  async function votoQueFalha(c, rId, op) {
    await c.p.evaluate(() => { globalThis.__falhasGravar = 5; });
    const botaoOpcao = c.p.locator(opcaoNoCelular(op));
    if (await botaoOpcao.getAttribute('aria-expanded') !== 'true') await botaoOpcao.tap();
    await c.p.locator(`[data-detalhe="${op}"] [data-votar]`).tap();
    await c.p.waitForFunction((o) => /Não foi possível enviar o voto: toque de novo em “Votar nesta”/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-aviso`)?.textContent || ''), op, { timeout: 45000 })
      .catch(async (erro) => {
        const notas = await c.p.$$eval('.nota', (ns) => ns.map((n) => n.textContent));
        throw new Error(`${c.nome}: depois de 5 falhas, a tela não pediu para votar de novo (notas ${JSON.stringify(notas)}, envios ${JSON.stringify(await c.p.evaluate(() => globalThis.Viracao.aluno.envios()))}; ${erro.message.split('\n')[0]})`);
      });
    await naTela(c, `[data-detalhe="${op}"] .opcao-aviso`, 'o aviso da falha junto do botão');
    assert.equal(await c.p.locator(`[data-detalhe="${op}"] [data-votar]`).isEnabled(), true, `${c.nome}: depois da falha, o "Votar nesta" volta a valer`);
    assert.equal(await c.p.evaluate(() => globalThis.__falhasGravar), 0, `${c.nome}: as 5 tentativas foram feitas`);
    assert.equal(await administrador('GET', s('decisoes', rId, c.equipe, c.uid)), null, `${c.nome}: nada chegou ao servidor`);
    await capturar(c, `${rId}-falhou-5-vezes`);
  }

  // "Mover aluno" pela barra do telão, como o apresentador faz: o crachá, a
  // equipe e, com a decisão aberta e o voto dado (descarta), a confirmação de
  // que o voto será descartado (achado P1).
  async function moverPeloTelao(c, eq, { descarta = false } = {}) {
    const codigo = C.V.alunoLogica.codigoCracha(c.uid);
    const modal = telao.locator('#modal');
    // O mouse na borda de baixo mostra a barra (D-038), como no e2e:online: o H
    // alterna, e com a barra já aberta a esconderia.
    await telao.mouse.move(640, 800 - 10);
    await telao.waitForFunction(() => !document.getElementById('barra').hidden, null, { timeout: 5000 });
    await telao.locator('#barra [data-acao="mover"]').click();
    await modal.locator('.campo-cracha').fill(codigo);
    await modal.getByRole('button', { name: 'Procurar', exact: true }).click();
    await modal.getByRole('button', { name: `${C.equipes.indexOf(eq) + 1} ${C.cfg.equipes[eq].nome}`, exact: true }).click();
    if (descarta) {
      await telao.waitForFunction(() => /já votou nesta decisão/.test(document.querySelector('#modal h2')?.textContent || ''), null, { timeout: 5000 })
        .catch(() => { throw new Error(`telão: mover ${c.nome} depois de votar não pediu confirmação`); });
      assert.match(await modal.locator('h2').textContent(), /esse voto é descartado, e o aluno precisa votar de novo/);
      await modal.getByRole('button', { name: 'Mover e descartar o voto', exact: true }).click();
    }
    assert.equal(await esperarNoBanco(s('membros', c.uid, 'equipe'), eq), eq, `${c.nome} movido para a equipe ${eq}`);
    c.equipe = eq;
  }

  const primeiroPasso = C.passos.findIndex((p) => p.tipo === 'lobby');
  assert.equal(primeiroPasso, 0, 'o roteiro começa no lobby');

  // ---------- 1. Enquete de entrada: 3 celulares votam depois do cronômetro ----------
  const antes = C.enquetes.find((x) => x.momento === 'antes');
  await avancar('enquete de entrada', (e) => e.tipo === 'enquete');
  assert.equal((await estado()).indice, passoDaEnquete(antes.enquete, antes.momento));
  await esperarTela(esp, 'enquete');
  assert.equal(await esp.p.locator('[data-valor="1"]').isDisabled(), true, 'o espectador não responde a enquete');
  await jogarEnquete({ enq: antes.enquete, momento: antes.momento, tardios: [cel[4], cel[5], cel[6]], recarrega: cel[3] });

  // ---------- 2. Equipes ----------
  await avancar('até formar equipes', (e) => e.tipo === 'formarEquipes' || e.tipo === 'bloco');
  await avancarAte((e) => e.tipo === 'formarEquipes', 'até formar equipes');
  for (const c of cel) {
    await esperarTela(c, 'escolherEquipe');
    await c.p.locator(`.botao-equipe[data-equipe="${c.equipe}"]`).tap();
    await c.p.waitForFunction((eq) => document.querySelector(`.botao-equipe[data-equipe="${eq}"]`)?.getAttribute('aria-pressed') === 'true', c.equipe, { timeout: 15000 });
  }
  const membros = await administrador('GET', s('membros'));
  for (const c of cel) assert.equal(membros[c.uid]?.equipe, c.equipe, `${c.nome} na equipe ${c.equipe}`);
  await avancar('personas', (e) => e.tipo === 'personas' && e.equipesTravadas === true);
  for (const c of cel) await esperarTela(c, 'persona');

  // ---------- 3. Mês 1: Ctrl+Z desfaz a abertura; recarga; voto sem rede ----------
  // A primeira, a segunda e a última rodada do roteiro; as do meio (a D-060
  // leva a 6) são votadas por todos, sem casos especiais.
  const [R1, R2] = C.rodadas;
  const R3 = C.rodadas.at(-1);
  await avancarAte((e) => e.tipo === 'rodada', 'até o mês 1');
  const abertura1 = await esperarEstado((e) => e.rodada === R1 && e.subfase === 'decidindo', 'mês 1 aberto');
  const blocoAntes = C.passos[abertura1.indice - 1];
  // D-037: um Espaço a mais abriu a decisão; sem voto, o Ctrl+Z volta ao passo anterior.
  await desfazer('desfazer a abertura do mês 1', (e) => e.indice === abertura1.indice - 1 && e.tipo === blocoAntes.tipo);
  for (const c of cel) await esperarTela(c, blocoAntes.tipo === 'bloco' ? 'situacao' : 'persona');
  await avancar('reabrir o mês 1', (e) => e.rodada === R1 && e.subfase === 'decidindo');
  const reaberta1 = await estado();
  assert.ok(reaberta1.abertoEm > abertura1.abertoEm, 'a reabertura é outra janela (outro abertoEm)');
  await conferirOrdemNoTelao(R1);
  for (const c of cel) {
    await esperarTela(c, 'decisao');
    await conferirOrdem(c, R1);
  }
  const o1 = C.opcoesDe(R1);
  const plano1 = new Map([[cel[0], o1[0]], [cel[1], o1[1]], [cel[2], o1[2]], [cel[3], o1[3] ?? o1[0]], [cel[4], o1[0]], [cel[5], o1[1]], [extra, o1[1]]]);
  // O celular 3 recarrega no meio da rodada, antes de votar.
  await cel[2].p.reload();
  await esperarTela(cel[2], 'decisao');
  // O celular 4 vota sem rede: "enviando" na hora, junto do botão, e o voto
  // conta quando a rede volta, com a decisão ainda aberta.
  await cel[3].ctx.setOffline(true);
  {
    const c = cel[3];
    const op = plano1.get(c);
    await c.p.locator(opcaoNoCelular(op)).tap();
    await c.p.locator(`[data-detalhe="${op}"] [data-votar]`).tap();
    await c.p.waitForFunction((o) => /Enviando o seu voto nesta/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || ''), op, { timeout: 5000 });
    await naTela(c, `[data-detalhe="${op}"] .opcao-votada`, '"Enviando o seu voto nesta…"');
    assert.doesNotMatch(await c.p.textContent(opcaoNoCelular(op)), /✓ seu voto/, 'sem a confirmação do servidor, a opção não diz "✓ seu voto"');
    await capturar(c, 'mes1-enviando-sem-rede');
  }
  const votosPorEquipe = {};
  for (const [c, op] of plano1) {
    if (c === cel[3]) continue;
    // O celular 3 (o que recarregou) tem a escrita derrubada 5 vezes antes.
    if (c === cel[2]) await votoQueFalha(c, R1, op);
    await votarPelaTela(c, R1, op);
    (votosPorEquipe[c.equipe] ||= []).push(op);
    const k = votosPorEquipe[c.equipe].length;
    await decidiramNoTelao(c.equipe, k, cel.filter((x) => x.equipe === c.equipe).length);
  }
  await cel[3].ctx.setOffline(false);
  await cel[3].p.waitForFunction(() => Object.keys(globalThis.Viracao.aluno.pendentes()).length === 0, null, { timeout: 30000 });
  assert.equal(await esperarNoBanco(s('decisoes', R1, E4, cel[3].uid), plano1.get(cel[3]), 15000), plano1.get(cel[3]), 'o voto sem rede chegou quando a rede voltou');
  await decidiramNoTelao(E4, 1, 1);
  // Achado P1: o celular 6 já votou pela equipe 6, e o apresentador o move
  // para a equipe 5 com a decisão aberta. O telão confirma dizendo que o voto
  // será descartado; o celular avisa, acima das opções e dentro da opção
  // aberta, que precisa votar de novo; e o voto pela equipe 5 conta. Antes, o
  // telão movia calado, e o celular redesenhava a decisão sem voto e sem aviso.
  const movido = cel[5];
  await moverPeloTelao(movido, E5, { descarta: true });
  await esperarTela(movido, 'decisao');
  await movido.p.waitForFunction(() => document.querySelector('[data-movido]'), null, { timeout: 15000 })
    .catch(() => { throw new Error(`${movido.nome}: movido depois de votar, o celular não avisou`); });
  assert.match(await movido.p.textContent('[data-movido]'), new RegExp(`movido para a equipe 5 ${C.cfg.equipes[E5].nome}: o voto na equipe anterior não vale aqui`));
  assert.equal(await movido.p.locator('.botao-opcao-aluno[data-meu-voto]').count(), 0, `${movido.nome}: na equipe nova, nenhuma opção marcada como voto`);
  await naTela(movido, `[data-detalhe="${plano1.get(movido)}"] .opcao-aviso`, 'o aviso de "movido" junto do botão');
  await capturar(movido, 'mes1-movido-depois-de-votar');
  await votarPelaTela(movido, R1, o1[0]);
  assert.equal(await movido.p.locator('[data-movido]').count(), 0, `${movido.nome}: votou pela equipe nova, e o aviso sai`);
  await decidiramNoTelao(E5, 2, 2);
  await espectadorVe(E2, 'mês 1');
  await capturar(esp, 'mes1-espectador');
  await capturar(cel[0], 'mes1-votado');
  await encerrar('apurar o mês 1', (e) => e.subfase === 'sorteio');
  const esperado1 = {
    [E1]: { decisao: o1[0], origem: 'maioria', contagem: umVoto(o1[0]) },
    [E2]: { decisao: o1[1], origem: 'maioria', contagem: { [o1[1]]: 2 } },
    [E3]: { decisao: o1[2], origem: 'maioria', contagem: umVoto(o1[2]) },
    [E4]: { decisao: plano1.get(cel[3]), origem: 'maioria', contagem: umVoto(plano1.get(cel[3])) },
    // O movido votou pela equipe 5; o voto dele pela 6 foi descartado.
    [E5]: { decisao: o1[0], origem: 'maioria', contagem: { [o1[0]]: 2 } },
    [E6]: { decisao: C.cfg.rodadas[R1].padrao, origem: 'piloto', contagem: {} },
  };
  await conferirResultado(R1, esperado1);
  // Ctrl+Z desfaz a apuração: a decisão reabre, o celular 1 muda o voto, e a
  // apuração seguinte conta o voto novo.
  await desfazer('desfazer a apuração do mês 1', (e) => e.rodada === R1 && e.subfase === 'decidindo');
  await esperarTela(cel[0], 'decisao');
  await votarPelaTela(cel[0], R1, o1[2]);
  await decidiramNoTelao(E1, 1, 1);
  await encerrar('apurar o mês 1 de novo', (e) => e.subfase === 'sorteio');
  await conferirResultado(R1, { ...esperado1, [E1]: { decisao: o1[2], origem: 'maioria', contagem: umVoto(o1[2]) } });
  await avancar('resultado do mês 1', (e) => e.subfase === 'resultado');
  for (const c of cel) await esperarTela(c, 'resultado');
  // Fora da decisão, mover não descarta voto nenhum: volta sem confirmação.
  await moverPeloTelao(movido, E6);
  await esperarTela(movido, 'resultado');
  console.log('Mês 1: Ctrl+Z desfez a abertura e a apuração; recarga, voto sem rede, 5 falhas de escrita avisadas, aluno movido depois de votar (confirmado no telão, avisado no celular) e 7 votos pela tela conferidos no servidor, no telão e na apuração.');

  // ---------- 4. Mês 2: prorrogação, voto 30 s depois do cronômetro dela e voto que chega depois do fechamento ----------
  await avancarAte((e) => e.tipo === 'rodada' && e.rodada === R2, 'até o mês 2');
  await esperarEstado((e) => e.subfase === 'decidindo', 'mês 2 aberto');
  await conferirOrdemNoTelao(R2);
  for (const c of cel) {
    await esperarTela(c, 'decisao');
    await conferirOrdem(c, R2);
  }
  const o2 = C.opcoesDe(R2);
  // Pausa (P): sem prazo, a regra recusa todo voto; o celular apaga o "Votar
  // nesta" e diz o porquê junto dele. Retomar (P) devolve o voto.
  // Achado 6: o celular 3 vota sem rede, e o apresentador pausa antes de o voto
  // chegar. A regra recusa (sem prazo), e o voto fica guardado no aparelho até
  // o retomar, quando vai sozinho. Antes, ele era apagado, e o aluno tinha de
  // notar que precisava votar de novo.
  const c3 = cel[2];
  const opPausa = o2[1];
  await c3.ctx.setOffline(true);
  await c3.p.locator(opcaoNoCelular(opPausa)).tap();
  await c3.p.locator(`[data-detalhe="${opPausa}"] [data-votar]`).tap();
  await c3.p.waitForFunction((o) => /Enviando o seu voto nesta/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || ''), opPausa, { timeout: 5000 });
  {
    await telao.keyboard.press('p');
    await esperarEstado((e) => typeof e.restanteMs === 'number', 'mês 2 pausado');
    await c3.ctx.setOffline(false);
    await c3.p.waitForFunction((o) => /vai sozinho quando o apresentador retomar/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || ''), opPausa, { timeout: 30000 })
      .catch(async (erro) => {
        const notas = await c3.p.$$eval('.nota', (ns) => ns.map((n) => n.textContent));
        throw new Error(`${c3.nome}: o voto recusado pela pausa não ficou guardado (notas ${JSON.stringify(notas)}, envios ${JSON.stringify(await c3.p.evaluate(() => globalThis.Viracao.aluno.envios()))}; ${erro.message.split('\n')[0]})`);
      });
    await naTela(c3, `[data-detalhe="${opPausa}"] .opcao-votada`, '"guardado: vai sozinho quando o apresentador retomar"');
    assert.equal(Object.keys(await c3.p.evaluate(() => globalThis.Viracao.aluno.pendentes())).length, 1, `${c3.nome}: o voto continua guardado no aparelho`);
    assert.equal(await administrador('GET', s('decisoes', R2, c3.equipe, c3.uid)), null, 'pausado, o voto não entrou');
    await capturar(c3, 'mes2-guardado-ate-retomar');
    const c = cel[0];
    await c.p.waitForFunction(() => document.querySelector('.cronometro-aluno')?.textContent === 'pausado', null, { timeout: 15000 });
    await c.p.locator(opcaoNoCelular(o2[0])).tap();
    const votar = c.p.locator(`[data-detalhe="${o2[0]}"] [data-votar]`);
    await votar.waitFor();
    assert.equal(await votar.isDisabled(), true, 'pausado, o "Votar nesta" fica apagado');
    await naTela(c, `[data-detalhe="${o2[0]}"] .opcao-aviso`, 'o motivo da pausa junto do botão');
    assert.match(await c.p.textContent(`[data-detalhe="${o2[0]}"] .opcao-aviso`), /Pausado pelo apresentador/);
    await capturar(c, 'mes2-pausado');
    await telao.keyboard.press('p');
    await esperarEstado((e) => typeof e.prazo === 'number' && typeof e.restanteMs !== 'number', 'mês 2 retomado');
    await c.p.waitForFunction((o) => document.querySelector(`[data-detalhe="${o}"] [data-votar]`)?.disabled === false, o2[0], { timeout: 15000 });
    // Retomou: o voto guardado do celular 3 foi sozinho, e contou.
    assert.equal(await esperarNoBanco(s('decisoes', R2, c3.equipe, c3.uid), opPausa, 15000), opPausa, `${c3.nome}: o voto guardado na pausa foi sozinho na retomada`);
    await c3.p.waitForFunction((o) => /✓ seu voto/.test(document.querySelector(`.botao-opcao-aluno[data-opcao="${o}"]`)?.textContent || ''), opPausa, { timeout: 15000 });
  }
  const plano2 = new Map([[cel[0], o2[3] ?? o2[2]], [cel[1], o2[0]], [cel[2], o2[1]], [cel[3], o2[2]], [cel[5], o2[3] ?? o2[0]], [extra, o2[1]]]);
  const votos2 = {};
  assert.equal(plano2.get(c3), opPausa, 'o plano do mês 2 conta o voto que foi na retomada');
  for (const [c, op] of plano2) {
    // O voto do celular 3 já foi, sozinho, na retomada da pausa.
    if (c !== c3) await votarPelaTela(c, R2, op);
    (votos2[c.equipe] ||= []).push(op);
    await decidiramNoTelao(c.equipe, votos2[c.equipe].length, cel.filter((x) => x.equipe === c.equipe).length);
  }
  await espectadorVe(E1, 'mês 2');
  // Recarregar depois de votar: o voto continua marcado.
  await cel[3].p.reload();
  await esperarTela(cel[3], 'decisao');
  await cel[3].p.waitForFunction((o) => document.querySelector(`.botao-opcao-aluno[data-opcao="${o}"]`)?.dataset.meuVoto === '1', plano2.get(cel[3]), { timeout: 15000 });
  // O celular 5 vota sem rede e só volta depois do fechamento: o voto chega com
  // a votação já fechada, a regra recusa, e o celular diz, à vista.
  // Achado P2: o celular 4 já votou e troca de opção sem rede; a troca só
  // chega depois do fechamento. A regra recusa a troca, o voto anterior conta,
  // e o celular diz exatamente isso. Antes: "ele não foi contado".
  const c4 = cel[3];
  const troca4 = o2.find((o) => o !== plano2.get(c4));
  await c4.ctx.setOffline(true);
  await c4.p.locator(opcaoNoCelular(troca4)).tap();
  await c4.p.locator(`[data-detalhe="${troca4}"] [data-votar]`).tap();
  await c4.p.waitForFunction((o) => /Enviando o seu voto nesta/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || ''), troca4, { timeout: 5000 });
  const c5 = cel[4];
  await c5.ctx.setOffline(true);
  const op5 = o2[0];
  await c5.p.locator(opcaoNoCelular(op5)).tap();
  await c5.p.locator(`[data-detalhe="${op5}"] [data-votar]`).tap();
  await c5.p.waitForFunction((o) => /guardado no aparelho/.test(document.querySelector(`[data-detalhe="${o}"] .opcao-votada`)?.textContent || ''), op5, { timeout: 30000 });
  await naTela(c5, `[data-detalhe="${op5}"] .opcao-votada`, '"Seu voto nesta está guardado no aparelho."');
  assert.doesNotMatch(await c5.p.textContent(opcaoNoCelular(op5)), /✓ seu voto/, 'guardado no aparelho não diz "✓ seu voto"');
  await capturar(c5, 'mes2-guardado-sem-rede');
  // Empate na segunda equipe do Jonas (1 × 1): prorrogação só para ela.
  await encerrar('fechar o mês 2 (prorrogação)', (e) => e.subfase === 'prorrogacao');
  const naProrrogacao = await estado();
  assert.deepEqual(Object.keys(naProrrogacao.empatadas || {}), [E2], 'só a equipe empatada vai para a prorrogação');
  await c5.ctx.setOffline(false);
  await esperarTela(c5, 'aguardando');
  await c5.p.waitForFunction(() => /A votação fechou antes do seu voto chegar/.test(document.querySelector('.nota')?.textContent || ''), null, { timeout: 30000 })
    .catch(async (erro) => {
      throw new Error(`celular 5: o voto recusado depois do fechamento não foi avisado (notas ${JSON.stringify(await c5.p.$$eval('.nota', (ns) => ns.map((n) => n.textContent)))}; ${erro.message.split('\n')[0]})`);
    });
  await naTela(c5, '.nota', 'o aviso do voto recusado');
  assert.equal(await administrador('GET', s('decisoes', R2, E5, c5.uid)), null, 'o voto que chegou depois do fechamento não entrou');
  await capturar(c5, 'mes2-recusado-depois-do-fechamento');
  await c4.ctx.setOffline(false);
  await esperarTela(c4, 'aguardando');
  const textoTroca = `A troca para ${LETRAS[o2.indexOf(troca4)]} chegou depois do fechamento: valeu o seu voto anterior, ${LETRAS[o2.indexOf(plano2.get(c4))]}.`;
  await c4.p.waitForFunction((t) => [...document.querySelectorAll('.nota')].some((n) => n.textContent === t), textoTroca, { timeout: 30000 })
    .catch(async (erro) => {
      throw new Error(`celular 4: a troca recusada depois do fechamento não foi avisada como troca (notas ${JSON.stringify(await c4.p.$$eval('.nota', (ns) => ns.map((n) => n.textContent)))}; ${erro.message.split('\n')[0]})`);
    });
  await naTela(c4, '.nota', 'o aviso da troca que chegou tarde');
  assert.doesNotMatch(await c4.p.textContent('.bloco'), /não foi contado/, 'a troca tardia não diz "não foi contado": o voto anterior contou');
  assert.equal(await administrador('GET', s('decisoes', R2, E4, c4.uid)), plano2.get(c4), 'no servidor, continua o voto anterior');
  await capturar(c4, 'mes2-troca-depois-do-fechamento');
  for (const c of [cel[1], extra]) {
    await esperarTela(c, 'prorrogacao');
    await conferirOrdem(c, R2);
  }
  // Com o prazo antigo, a regra cortava a prorrogação em prorrogacaoSeg + graça (25 s).
  await esperarPassarDoPrazoAntigo(naProrrogacao, 'Mês 2, prorrogação');
  await cronometroEsgotado(extra.p, '.cronometro-aluno', `${extra.nome}, prorrogação`);
  assert.equal((await estado()).subfase, 'prorrogacao', 'a prorrogação continua aberta no telão');
  await votarPelaTela(extra, R2, o2[0]);
  await decidiramNoTelao(E2, 2, 2);
  await espectadorVe(E2, 'prorrogação do mês 2');
  await encerrar('apurar o mês 2', (e) => e.subfase === 'sorteio');
  const padrao2 = C.cfg.rodadas[R2].padrao;
  await conferirResultado(R2, {
    [E1]: { decisao: plano2.get(cel[0]), origem: 'maioria', contagem: umVoto(plano2.get(cel[0])) },
    [E2]: { decisao: o2[0], origem: 'prorrogacao', contagem: { [o2[0]]: 2 } },
    [E3]: { decisao: o2[1], origem: 'maioria', contagem: umVoto(o2[1]) },
    [E4]: { decisao: o2[2], origem: 'maioria', contagem: umVoto(o2[2]) },
    [E5]: { decisao: padrao2, origem: 'piloto', contagem: {} },
    [E6]: { decisao: plano2.get(cel[5]), origem: 'maioria', contagem: umVoto(plano2.get(cel[5])) },
  });
  await avancar('resultado do mês 2', (e) => e.subfase === 'resultado');
  console.log('Mês 2: pausa com o motivo à vista, e o voto em trânsito guardado e enviado na retomada; prorrogação votada depois do corte do prazo antigo; voto sem rede que chegou depois do fechamento recusado e avisado à vista; troca tardia avisada com o voto anterior contado.');

  // ---------- 4b. As rodadas do meio (a D-060 leva o roteiro a 6): todos votam ----------
  for (const [iMeio, rMeio] of C.rodadas.slice(2, -1).entries()) {
    await avancarAte((e) => e.tipo === 'rodada' && e.rodada === rMeio, `até ${rMeio}`);
    await esperarEstado((e) => e.subfase === 'decidindo', `${rMeio} aberto`);
    await conferirOrdemNoTelao(rMeio);
    const op = C.opcoesDe(rMeio)[0];
    const votosMeio = {};
    for (const c of cel) {
      await esperarTela(c, 'decisao');
      await conferirOrdem(c, rMeio);
      if (c === extra && iMeio === 0) await votoGuardadoERecarga(c, rMeio, op);
      else await votarPelaTela(c, rMeio, op);
      votosMeio[c.equipe] = (votosMeio[c.equipe] || 0) + 1;
    }
    await espectadorVe(C.equipes[(2 + iMeio) % C.equipes.length], rMeio);
    await encerrar(`apurar ${rMeio}`, (e) => e.subfase === 'sorteio');
    await conferirResultado(rMeio, Object.fromEntries(C.equipes.map((eq) => [eq, { decisao: op, origem: 'maioria', contagem: { [op]: votosMeio[eq] } }])));
    await avancar(`resultado de ${rMeio}`, (e) => e.subfase === 'resultado');
    console.log(`${rMeio}: ${cel.length} votos pela tela, contados.`);
  }

  // ---------- 5. Mês 3, o caso do teste de 30/09: todos votam 130 s depois de abrir ----------
  await avancarAte((e) => e.tipo === 'rodada' && e.rodada === R3, 'até o mês 3');
  const abertura3 = await esperarEstado((e) => e.subfase === 'decidindo', 'mês 3 aberto');
  await conferirOrdemNoTelao(R3);
  for (const c of cel) {
    await esperarTela(c, 'decisao');
    await conferirOrdem(c, R3);
  }
  // Com o prazo antigo, a regra cortava em decisaoSeg + graça (125 s): no teste
  // de 30/09, a decisão ficou aberta 7 min 35 s, e o voto não contava.
  await esperarPassarDoPrazoAntigo(abertura3, 'Mês 3');
  await cronometroEsgotado(cel[0].p, '.cronometro-aluno', 'celular do Jonas');
  await cronometroEsgotado(telao, '[data-cronometro]', 'telão');
  assert.equal((await estado()).subfase, 'decidindo', 'e o apresentador ainda não encerrou');
  // O sétimo celular some da sala (o registro de membro apagado) e entra de
  // novo sozinho: o entrouEm novo é depois da abertura, e ele acompanha sem
  // votar. O motivo aparece junto do botão apagado, à vista. (Depois da
  // espera: o entrouEm é do relógio do servidor, e o abertoEm, do telão.)
  await administrador('DELETE', s('membros', extra.uid));
  const regravado = await (async () => {
    for (let i = 0; i < 200; i += 1) {
      const m = await administrador('GET', s('membros', extra.uid));
      if (m?.equipe && m.entrouEm > abertura3.abertoEm) return m;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error('o sétimo celular não entrou de novo (registro de membro e equipe do telão)');
  })();
  extra.equipe = regravado.equipe;
  await esperarTela(extra, 'decisao');
  {
    const op = C.opcoesDe(R3)[0];
    await extra.p.locator(opcaoNoCelular(op)).tap();
    const votar = extra.p.locator(`[data-detalhe="${op}"] [data-votar]`);
    await votar.waitFor();
    assert.equal(await votar.isDisabled(), true, 'quem entrou depois da abertura não vota');
    await naTela(extra, `[data-detalhe="${op}"] .opcao-aviso`, 'o motivo do botão apagado');
    assert.match(await extra.p.textContent(`[data-detalhe="${op}"] .opcao-aviso`), /entrou depois de esta decisão abrir/);
    await capturar(extra, 'mes3-entrou-depois');
  }
  // O celular 6 recarrega aqui, no meio do caso do teste.
  await cel[5].p.reload();
  await esperarTela(cel[5], 'decisao');
  // O celular da segunda equipe do Jonas volta da tela bloqueada (o ciclo de
  // reconexão do aoVoltarAVista) e vota logo em seguida: a escrita espera a
  // conexão voltar e conta.
  await cel[1].p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const o3 = C.opcoesDe(R3);
  const plano3 = new Map([[cel[0], o3[1]], [cel[1], o3[2]], [cel[2], o3[3] ?? o3[0]], [cel[3], o3[0]], [cel[4], o3[1]], [cel[5], o3[2]]]);
  const votos3 = {};
  for (const [c, op] of plano3) {
    await votarPelaTela(c, R3, op);
    (votos3[c.equipe] ||= []).push(op);
    // O denominador conta só quem pode votar nesta decisão (o sétimo, não).
    await decidiramNoTelao(c.equipe, votos3[c.equipe].length, 1);
  }
  const ultimoVoto3 = await agoraNoServidor();
  await espectadorVe(E4, 'mês 3');
  await capturar(cel[0], 'mes3-jonas-votou-depois-do-cronometro');
  await capturar(cel[1], 'mes3-jonas2-votou-depois-do-cronometro');
  await encerrar('apurar o mês 3', (e) => e.subfase === 'sorteio');
  await conferirResultado(R3, Object.fromEntries([...plano3].map(([c, op]) => [c.equipe, { decisao: op, origem: 'maioria', contagem: umVoto(op) }])));
  await avancar('resultado do mês 3', (e) => e.subfase === 'resultado');
  for (const c of cel) await esperarTela(c, 'resultado');
  console.log(`Mês 3: 6 votos pela tela, o último ${Math.round((ultimoVoto3 - abertura3.abertoEm) / 1000)} s depois de abrir, todos contados (servidor, telão e apuração); o regravado viu o motivo à vista.`);

  // ---------- 6. Placar final e as enquetes do fim ----------
  // O placar final pagina com o Espaço (D-041) sem mudar o estado.
  await avancarAte((e) => e.tipo === 'enquete', 'até a enquete do fim');
  // Achado P3: na primeira enquete de uma afirmação por vez (o termômetro), o
  // celular 5 responde a primeira afirmação sem rede, e ela chega tarde.
  let atrasadoUsado = false;
  for (const x of C.enquetes.filter((q) => q.momento !== 'antes')) {
    const umaPorVez = C.cfg.enquetes[x.enquete].modo === 'uma_por_vez' && lista(C.cfg.enquetes[x.enquete].ordemAfirmacoes).length >= 2;
    const atrasado = umaPorVez && !atrasadoUsado ? cel[4] : null;
    if (atrasado) atrasadoUsado = true;
    await avancarAte((e) => e.tipo === 'enquete' && e.enquete === x.enquete && e.momento === x.momento, `até ${x.enquete}/${x.momento}`);
    await jogarEnquete({ enq: x.enquete, momento: x.momento, atrasado });
    await avancar(`sair de ${x.enquete}/${x.momento}`);
  }
  await avancarAte((e) => e.tipo === 'comparativo', 'até o comparativo');
  await esperarTela(cel[0], 'comparativo');
  await cel[0].p.waitForFunction(() => ![...document.querySelectorAll('.resposta-voto')].some((n) => n.textContent.includes('carregando')), null, { timeout: 15000 });
  const a1 = lista(C.cfg.enquetes[antes.enquete].ordemAfirmacoes)[0];
  assert.match(await cel[0].p.textContent(`.resposta[data-afirmacao="${a1}"] .resposta-voto`), new RegExp(`Você antes: ${valorDe(0, 0)} · .+, agora: ${valorDe(0, 0)} · `));
  await avancarAte((e) => e.tipo === 'fim', 'até o fim');
  for (const c of cel) await esperarTela(c, 'fim');
  await capturar(cel[0], 'fim');

  // O espectador ficou ligado a sessão inteira sem virar membro; ao sair, o
  // pedido sai do banco.
  await espectadorFora('fim');
  await esp.p.locator('[data-acao="sair-espectador"]').tap();
  await esperarTela(esp, 'entrada');
  assert.equal(await esperarNoBanco(`pedidosAnfitriao/${esp.uid}`, null), null, 'ao sair, o espectador apaga o próprio pedido');

  // Nenhum voto individual sai do banco pelo telão: o placar tem as 6 equipes.
  const placar = await administrador('GET', s('placar'));
  assert.deepEqual(Object.keys(placar).sort(), [...C.equipes].sort());
  // Esquema v3: com caminhos de cartas demais (as 6 rodadas da fixture), o
  // placar é estimado e diz isso; com o config de 3 rodadas, exato e sem a marca.
  for (const eq of C.equipes) {
    const estimado = C.V.motor.caminhosDeCartas(C.cfg, eq, C.rodadas) > C.V.motor.LIMITE_CAMINHOS;
    assert.equal(placar[eq].estimado === true, estimado, `placar ${eq}: estimado ${estimado}`);
  }
  await telao.keyboard.press('h');
  await telao.locator('[data-acao="apagar"]').hover();
  await telao.mouse.down();
  await telao.waitForTimeout(2400);
  await telao.mouse.up();
  await telao.waitForFunction(() => document.body.dataset.tela === 'abertura', null, { timeout: 15000 });
  assert.equal(await administrador('GET', `salas/${sala}`), null, 'a sala foi apagada');
  assert.equal(await cel[0].p.evaluate(() => localStorage.getItem('viracao:aluno:sala')), JSON.stringify(sala));
  console.log('Placar, enquetes do fim, comparativo e fim: conferidos; sala apagada.');
}
