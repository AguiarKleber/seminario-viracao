// O celular no modo individual (regras.individual; decisão do Kleber de 13/10
// à noite), de verdade, no navegador, em 360×740, SEM o emulador:
// `node e2e/celular-individual.e2e.mjs`. Fica fora do `npm run check`, como
// os outros e2e (navegador instalado).
//
// Por que sem o emulador: na noite de 13/10, a frente do telão usava o
// emulador ao mesmo tempo, e o celular precisava ser conferido pela tela. O
// aluno/index.html é o de verdade (o aluno.js, o CSS, a telaDoAluno), e só o
// canal-firebase.js é trocado, na rota, pelo canal-local com as MESMAS travas
// das regras (o espelho do firebase/regras.json, conferido pelo
// test/emulador/regras-paridade.test.mjs). Na mesma página roda um anfitrião
// de verdade (o "telão": dá as vagas, abre e fecha as etapas) e os outros
// alunos, cada um com o próprio uid. A sala fica no localStorage da página
// (persistirEm), e recarregar volta com o mesmo banco e o mesmo uid.
//
// Confere, com o config.json do dia:
// 1. a entrada: depois do código, "Qual é o seu nome?"; o aparelho só entra
//    na sala depois do nome, e o nome nunca vai para o banco (só para o
//    localStorage); o topo mostra o nome;
// 2. "Entrando na sala…" até a vaga, e o lobby;
// 3. "Conheça o Jonas", a decisão (5 opções, sem a contagem de votos, a dica
//    na 2ª pessoa), o voto, o resultado ("A sua escolha", "O seu saldo do
//    bimestre") e cada bloco de dados com o título, o contexto, os itens e a
//    fonte do telão, sem "Vaga" nem "Equipe" em tela nenhuma;
// 4. o placar final: "Você escolheu…" e "Das N pessoas da turma, …";
// 5. recarregar: a mesma vaga, o mesmo nome, sem pedir o nome de novo;
// 6. os blocos depois do placar ("Dados: e nos outros aplicativos?" e
//    "Fim: quem é o patrão?") e o fim;
// 7. o 21º aparelho: "A sala está cheia (20 pessoas)";
// 8. o celular do apresentador (espectador): o resumo da turma, nunca uma vaga;
// 9. sem a chave (a fixture das equipes), nada de nome: tudo como antes.
// [Li] E o "Li, pode seguir": o botão no Jonas e nos blocos, o "Você já leu
// ✓" depois do toque, o lidos/{uid} = o índice do passo, e o "N de M leram"
// no celular do apresentador.
// Em toda tela: nada passa da largura de 360 px. As capturas vão para
// e2e/capturas/celular-individual-*.png.
/* global document, innerWidth, requestAnimationFrame */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, servir } from '../bin/servir.mjs';

const CAPTURAS = join(RAIZ, 'e2e', 'capturas');
const SALA = 'K7Q2';
const PIN = 'pin-do-ensaio-local';
const UA_CELULAR = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const CONFIG_DIA = readFileSync(join(RAIZ, 'config.json'), 'utf8');
const CONFIG_EQUIPES = readFileSync(join(RAIZ, 'test', 'fixtures', 'config-simples.json'), 'utf8');
const NUCLEO = ['js/nucleo/validar-config.js', 'js/nucleo/sorte.js', 'js/nucleo/motor.js', 'js/nucleo/enquete.js', 'js/nucleo/roteiro.js', 'js/canal/canal-local.js', 'js/nucleo/anfitriao.js']
  .map((f) => readFileSync(join(RAIZ, f), 'utf8')).join('\n;\n');
const ESPACO_FIXO = new RegExp(String.fromCharCode(160), 'g'); // o espaço sem quebra do formatar.moeda
const lido = (t) => String(t ?? '').replace(ESPACO_FIXO, ' ').replace(/\s+/g, ' ').trim();

// O "servidor" e o "telão" dentro da página: o canal-local (com as travas), um
// anfitrião de verdade e os outros alunos. É o que a rota serve no lugar do
// canal-firebase.js.
function palco(textoConfig) {
  return `${NUCLEO}
;(function (raiz) {
  'use strict';
  const V = raiz.Viracao;
  const SALA = ${JSON.stringify(SALA)};
  const TEXTO_CONFIG = ${JSON.stringify(textoConfig)};
  // O relógio do "servidor" anda a cada 20 ms e fica parado dentro de uma
  // mesma volta do laço de eventos: a regra confere entrouEm === now, e o
  // marcadorDeHora e a gravação acontecem na mesma volta.
  let t = Date.now();
  setInterval(() => { t = Date.now(); }, 20);
  const relogio = () => t;
  const mundo = V.canalLocal.criar({ travas: true, relogio, persistirEm: '__palco:mundo', uid: 'host' });
  let uid = localStorage.getItem('__palco:uid');
  if (!uid) {
    uid = 'cel-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('__palco:uid', uid);
  }
  V.canalFirebase = {
    criar() {
      const c = mundo.comoUsuario(uid);
      return { ...c, reconectar() {}, apagarAoDesconectar: async () => {} };
    },
  };
  const cfg = V.validarConfig.validarTexto(TEXTO_CONFIG).config;
  const host = mundo.comoUsuario('host');
  const cam = (...p) => ['salas', SALA, ...p].join('/');
  let anf = null;
  const novoAnfitriao = () => V.anfitriao.criar({ canal: host, config: cfg, sala: SALA, nomeRoteiro: '60min', agora: relogio, uid: 'host', gerarSemente: () => 42 });
  raiz.__palco = {
    uid: () => uid,
    async criarSala() { anf = novoAnfitriao(); await anf.criarSala(); },
    async carregarSala() { anf = novoAnfitriao(); await anf.carregarSala(); },
    estado: () => anf.estado(),
    // O que o telão faz quando alguém entra sem vaga (vigiarAtrasados).
    ligarTelao() {
      let rodando = false;
      let denovo = false;
      const dar = async () => {
        if (rodando) { denovo = true; return; }
        rodando = true;
        try {
          do { denovo = false; await anf.distribuirAtrasados(); } while (denovo);
        } catch (e) {
          console.error('telão: ' + e.message);
        } finally {
          rodando = false;
        }
      };
      host.ouvir(cam('membros'), (m) => {
        if (Object.values(m || {}).some((x) => x && typeof x.equipe !== 'string')) dar();
      });
    },
    // Um passo do apresentador: encerra a votação aberta, senão avança.
    async passo() {
      const e = anf.estado();
      if ((e.tipo === 'enquete' && e.subfase === 'votando') || (e.tipo === 'rodada' && ['decidindo', 'prorrogacao', 'fechando'].includes(e.subfase))) {
        await anf.encerrar();
      } else {
        await anf.avancar();
      }
      return anf.estado();
    },
    async entrarOutros(prefixo, n) {
      for (let i = 0; i < n; i += 1) {
        const u = prefixo + String(i).padStart(2, '0');
        await mundo.comoUsuario(u).gravar({ [cam('membros', u)]: { entrouEm: relogio() } });
      }
    },
    // Os outros votam na rodada aberta: escolhas[i] é a opção do i-ésimo
    // (na ordem dos uids), ou null para não votar.
    async votarOutros(prefixo, escolhas) {
      const e = anf.estado();
      const membros = await host.ler(cam('membros'));
      const uids = Object.keys(membros || {}).filter((u) => u.startsWith(prefixo)).sort();
      for (const [i, u] of uids.entries()) {
        const op = escolhas[i % escolhas.length];
        if (!op || typeof membros[u].equipe !== 'string') continue;
        await mundo.comoUsuario(u).gravar({ [cam('decisoes', e.rodada, membros[u].equipe, u)]: op });
      }
    },
    ler: (caminho) => host.ler(caminho),
    texto: () => JSON.stringify(mundo.exportar()),
    // O PIN do apresentador fica em privado/ (só o console grava): aqui, por
    // fora das travas, como o console.
    semearPin(pin) { mundo.importar({ ...mundo.exportar(), privado: { pinApresentador: pin } }); },
    // [Li] Os n primeiros outros tocam em "Li, pode seguir" no passo atual.
    async lerOutros(prefixo, n) {
      for (let i = 0; i < n; i += 1) {
        const u = prefixo + String(i).padStart(2, '0');
        await mundo.comoUsuario(u).gravar({ [cam('lidos', u)]: anf.estado().indice });
      }
    },
  };
})(globalThis);
`;
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

const site = await servir({ porta: 0 });
const navegador = await abrirNavegador();
const erros = [];
mkdirSync(CAPTURAS, { recursive: true });

// Um celular novo (contexto novo: localStorage e uid próprios) com o palco.
async function novoCelular(nome, textoConfig = CONFIG_DIA) {
  const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, userAgent: UA_CELULAR, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.route('**/js/canal/canal-firebase.js*', (rota) => rota.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: palco(textoConfig) }));
  await ctx.route('https://www.gstatic.com/firebasejs/**', (rota) => rota.fulfill({
    status: 200, contentType: 'text/javascript; charset=utf-8', body: 'export {};', headers: { 'Access-Control-Allow-Origin': '*' },
  }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(`${nome} pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') erros.push(`${nome} console: ${m.text()}`); });
  await p.goto(`${site.url}aluno/?sala=${SALA}&emulador=1`);
  await p.waitForFunction(() => globalThis.__palco && document.body.dataset.tela === 'entrada');
  return { ctx, p };
}

const tela = (p) => p.evaluate(() => document.body.dataset.tela);
const textoDaTela = async (p) => lido(await p.textContent('#tela'));
const estado = (p) => p.evaluate(() => globalThis.__palco.estado());
async function esperarTela(p, tipo, descricao = tipo) {
  try {
    await p.waitForFunction((t) => document.body.dataset.tela === t, tipo, { timeout: 8000 });
  } catch {
    throw new Error(`Tempo esgotado esperando a tela "${descricao}". Tela: ${await tela(p)}; texto: ${(await textoDaTela(p)).slice(0, 300)}`);
  }
}
// Passos do apresentador até o estado pedido.
async function ate(p, teste, descricao) {
  for (let i = 0; i < 40; i += 1) {
    const e = await estado(p);
    if (teste(e)) return e;
    await p.evaluate(() => globalThis.__palco.passo());
  }
  throw new Error(`Não cheguei a: ${descricao}`);
}

// Nada passa da largura do celular (360 px), em nenhuma tela; e a captura.
async function conferirLargura(p, nome) {
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const m = await p.evaluate(() => {
    const largos = [];
    for (const n of document.querySelectorAll('body *')) {
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.left < -1)) largos.push(`${n.tagName.toLowerCase()}.${n.getAttribute('class') || ''}`);
    }
    return { rolagem: document.scrollingElement.scrollWidth, largura: innerWidth, largos };
  });
  assert.ok(m.rolagem <= m.largura, `${nome}: rolagem lateral (${m.rolagem} px em uma tela de ${m.largura})`);
  assert.deepEqual(m.largos, [], `${nome}: elementos passam da largura de 360 px`);
  await p.screenshot({ path: join(CAPTURAS, `celular-individual-${nome}.png`), fullPage: true });
}

// Em nenhuma tela do modo individual aparece a vaga ("Vaga 7") nem "Equipe".
async function semVaga(p, nome) {
  const t = `${await textoDaTela(p)} ${lido(await p.textContent('#cracha'))}`;
  assert.doesNotMatch(t, /\bVaga\b|\bequipe\b/i, `${nome}: a vaga ou "equipe" apareceu na tela: ${t.slice(0, 200)}`);
}

// [Li] O botão embaixo do texto; o toque grava lidos/{uid} = o índice do
// passo atual (as regras v5 só aceitam esse), e a tela diz "Você já leu ✓".
async function conferirLi(p, nome, uid) {
  await p.waitForSelector('[data-acao="li"]', { timeout: 8000 });
  assert.equal(lido(await p.textContent('[data-acao="li"]')), 'Li, pode seguir', `${nome}: o botão`);
  await p.click('[data-acao="li"]');
  await p.waitForFunction(() => document.querySelector('.lido-feito')?.textContent === 'Você já leu ✓', null, { timeout: 8000 });
  assert.equal(await p.locator('[data-acao="li"]').count(), 0, `${nome}: depois do toque, sem o botão`);
  const indice = (await estado(p)).indice;
  assert.equal(await p.evaluate((c) => globalThis.__palco.ler(c), `salas/${SALA}/lidos/${uid}`), indice, `${nome}: lidos/{uid} = o índice do passo`);
  await conferirLargura(p, `li-${nome}`);
}

// [Li] O "N de M leram" no celular do apresentador.
async function esperarLeram(p, leram, total) {
  await p.waitForFunction(([n, m]) => document.querySelector('.lidos-contagem')?.textContent === `${n} de ${m} leram`, [leram, total], { timeout: 8000 });
}

try {
  // ---------- 1 a 6: o aluno do começo ao fim ----------
  const cfg = JSON.parse(CONFIG_DIA);
  const passos = cfg.roteiros['60min'];
  const { ctx: ctxAna, p: ana } = await novoCelular('ana');
  await ana.evaluate(() => globalThis.__palco.criarSala());
  await ana.evaluate(() => globalThis.__palco.ligarTelao());
  await ana.evaluate(() => globalThis.__palco.entrarOutros('outro', 4));

  // 1. O código já vem da URL; "Entrar" leva ao nome, e ainda não à sala.
  await ana.click('[data-acao="entrar"]');
  await esperarTela(ana, 'nome');
  const uidAna = await ana.evaluate(() => globalThis.__palco.uid());
  assert.equal(await ana.evaluate((c) => globalThis.__palco.ler(c), `salas/${SALA}/membros/${uidAna}`), null, 'sem o nome, o aparelho não entra na sala (não ocupa vaga)');
  assert.equal(lido(await ana.textContent('h1')), 'Qual é o seu nome?');
  assert.equal(await ana.isDisabled('[data-acao="confirmar-nome"]'), true, 'nome vazio: "Entrar" apagado');
  await ana.fill('#nome-aluno', '    ');
  assert.equal(await ana.isDisabled('[data-acao="confirmar-nome"]'), true, 'só espaço não é nome');
  assert.equal(await ana.getAttribute('#nome-aluno', 'maxlength'), '20');
  assert.equal(lido(await ana.textContent('#cracha')), '', 'sem nome, o topo vazio');
  await conferirLargura(ana, '01-nome');
  await ana.fill('#nome-aluno', '  Ana   Zuleica ');
  await ana.click('[data-acao="confirmar-nome"]');

  // 2. A vaga chega (a menor livre: as 4 primeiras são dos outros) e o lobby.
  await ana.waitForFunction(() => document.querySelector('#tela [data-motivo="lobby"]'), null, { timeout: 8000 });
  assert.equal(lido(await ana.textContent('#cracha')), 'Ana Zuleica', 'o topo mostra o nome, limpo');
  assert.equal(await ana.evaluate((c) => globalThis.__palco.ler(c), `salas/${SALA}/membros/${uidAna}/equipe`), 'e5');
  assert.equal((await ana.evaluate(() => globalThis.__palco.texto())).includes('Zuleica'), false, 'o nome nunca vai para o banco');
  assert.deepEqual(await ana.evaluate(() => JSON.parse(localStorage.getItem('viracao:aluno:nome'))), { sala: SALA, nome: 'Ana Zuleica' });
  assert.match(await textoDaTela(ana), /Você está na sala.*cada pessoa faz as próprias escolhas/);
  await semVaga(ana, 'lobby');
  await conferirLargura(ana, '02-lobby');

  // 3. "Conheça o Jonas".
  await ate(ana, (e) => e.tipo === 'personas', 'Conheça o Jonas');
  await esperarTela(ana, 'persona');
  assert.match(lido(await ana.textContent('h1')), /^Conheça o /);
  assert.match(await textoDaTela(ana), /a escolha é sua/);
  await semVaga(ana, 'persona');
  await conferirLargura(ana, '03-persona');
  await conferirLi(ana, 'persona', uidAna);

  // As 6 rodadas, com os blocos de dados depois de cada uma. Ana vota em
  // todas menos na 3ª (fica a opção de sempre).
  const rodadas = passos.map((x, i) => [x, i]).filter(([x]) => x.tipo === 'rodada');
  const votosAna = ['a', 'b', null, 'd', 'e', 'a'];
  for (const [k, [passo, indice]] of rodadas.entries()) {
    await ate(ana, (e) => e.indice === indice && e.subfase === 'decidindo', `decisão de ${passo.rodada}`);
    await esperarTela(ana, 'decisao', `decisão de ${passo.rodada}`);
    assert.equal(await ana.locator('.opcao-aluno').count(), 5, '5 opções');
    assert.equal(await ana.locator('.opcao-votos').count(), 0, 'sem a contagem de votos (vaga de uma pessoa)');
    assert.match(await textoDaTela(ana), /A escolha é só sua, ninguém vê o seu voto/);
    await semVaga(ana, `decisao-${passo.rodada}`);
    if (k === 0) await conferirLargura(ana, '04-decisao');
    const op = votosAna[k];
    if (op) {
      await ana.click(`.opcao-aluno[data-opcao-bloco="${op}"] .botao-opcao-aluno`);
      await ana.click(`[data-votar="${op}"]`);
      await ana.waitForFunction((o) => document.querySelector(`[data-opcao="${o}"][data-meu-voto="1"]`)
        && /registrado/.test(document.getElementById('tela').textContent), op, { timeout: 8000 });
      if (k === 0) await conferirLargura(ana, '05-decisao-votada');
    }
    await ana.evaluate(() => globalThis.__palco.votarOutros('outro', ['a', 'c', 'e', null]));
    await ana.evaluate(() => globalThis.__palco.passo()); // encerra
    await ate(ana, (e) => e.indice === indice && e.subfase === 'resultado', `resultado de ${passo.rodada}`);
    await esperarTela(ana, 'resultado', `resultado de ${passo.rodada}`);
    const decisao = lido(await ana.textContent('.decisao-linha'));
    assert.match(decisao, /^A sua escolha: /);
    if (op) assert.match(decisao, new RegExp(`^A sua escolha: ${op.toUpperCase()} · `));
    else assert.match(decisao, /\(você não votou: ficou o de sempre\)$/);
    assert.equal(lido(await ana.textContent('.saldo-rotulo')), 'O seu saldo do bimestre');
    assert.equal(await ana.locator('.equipe-linha').count(), 0);
    await semVaga(ana, `resultado-${passo.rodada}`);
    if (k === 0 || k === 2) await conferirLargura(ana, `06-resultado-${passo.rodada}`);

    // O bloco de dados seguinte, com o texto do telão.
    const bloco = passos[indice + 1];
    await ate(ana, (e) => e.indice === indice + 1, `bloco depois de ${passo.rodada}`);
    await esperarTela(ana, 'situacao', `bloco ${bloco.titulo}`);
    assert.equal(lido(await ana.textContent('h1')), bloco.titulo);
    assert.equal(lido(await ana.textContent('.dados-contexto')), lido(bloco.contexto));
    assert.deepEqual((await ana.locator('.dados-item').allTextContents()).map(lido), bloco.itens.map(lido));
    assert.equal(lido(await ana.textContent('.dados-fonte')), lido(`Fonte: ${bloco.fonte}`));
    assert.equal(lido(await ana.textContent('.subtitulo-seu-ano')), k === rodadas.length - 1 ? 'O seu ano' : 'O seu ano até aqui');
    assert.equal(await ana.locator('.tabela-meses tbody tr').count(), k + 1, 'o resumo do próprio ano, uma linha por bimestre');
    await semVaga(ana, `bloco-${k + 1}`);
    await conferirLargura(ana, `07-bloco-${k + 1}`);
    await conferirLi(ana, `bloco-${k + 1}`, uidAna);
  }

  // 4. O placar final.
  await ate(ana, (e) => e.tipo === 'placarFinal', 'placar final');
  await esperarTela(ana, 'situacao', 'placar final');
  assert.equal(lido(await ana.textContent('h1')), 'As suas escolhas');
  assert.match(lido(await ana.textContent('.escolhas-frase')), /^Você escolheu em 5 dos 6 bimestres, e a família (ainda ficou devendo|fechou as contas: sobrou) R\$ [\d.]+\.$/);
  assert.match(lido(await ana.textContent('.turma-frase')), /^Das 5 pessoas da turma, (nenhuma|1|\d+) (fechou|fecharam) o ano com dinheiro sobrando e (nenhuma|1|\d+) (terminou|terminaram) devendo\.$/);
  assert.equal(await ana.locator('.escolha').count(), 6);
  await semVaga(ana, 'placar');
  await conferirLargura(ana, '08-placar');

  // 5. Recarregar: a mesma vaga e o mesmo nome, sem pedir o nome de novo.
  await ana.reload();
  await ana.waitForFunction(() => document.body.dataset.tela === 'situacao', null, { timeout: 10000 });
  assert.equal(lido(await ana.textContent('#cracha')), 'Ana Zuleica');
  assert.equal(await ana.evaluate(() => globalThis.__palco.uid()), uidAna, 'o mesmo uid');
  assert.equal(await ana.evaluate((c) => globalThis.__palco.ler(c), `salas/${SALA}/membros/${uidAna}/equipe`), 'e5', 'a mesma vaga');
  assert.equal(lido(await ana.textContent('h1')), 'As suas escolhas');

  // 6. Depois do placar: os dois blocos do fim e o fim.
  await ana.evaluate(() => globalThis.__palco.carregarSala());
  for (const indice of passos.map((x, i) => i).filter((i) => i > passos.findIndex((x) => x.tipo === 'placarFinal') && passos[i].tipo === 'bloco')) {
    await ate(ana, (e) => e.indice === indice, `bloco ${passos[indice].titulo}`);
    await esperarTela(ana, 'situacao', passos[indice].titulo);
    assert.equal(lido(await ana.textContent('h1')), passos[indice].titulo);
    assert.equal(await ana.locator('.dados-item').count(), passos[indice].itens.length);
    await semVaga(ana, `bloco-fim-${indice}`);
    await conferirLargura(ana, `09-bloco-${indice}`);
  }
  await ate(ana, (e) => e.tipo === 'fim', 'fim');
  await esperarTela(ana, 'fim');
  assert.match(await textoDaTela(ana), /Obrigado pela participação.*Das 5 pessoas da turma/);
  await semVaga(ana, 'fim');
  await conferirLargura(ana, '10-fim');
  await ctxAna.close();
  console.log('ok: o aluno do começo ao fim (nome, vaga, decisões, dados, placar, recarga, fim)');

  // ---------- 7. O 21º aparelho ----------
  const { ctx: ctxCheia, p: cheia } = await novoCelular('sala-cheia');
  await cheia.evaluate(() => globalThis.__palco.criarSala());
  await cheia.evaluate(() => globalThis.__palco.ligarTelao());
  await cheia.evaluate(() => globalThis.__palco.entrarOutros('outro', 20));
  await cheia.click('[data-acao="entrar"]');
  await esperarTela(cheia, 'nome');
  await cheia.fill('#nome-aluno', 'Bruno');
  await cheia.click('[data-acao="confirmar-nome"]');
  await cheia.waitForFunction(() => document.querySelector('#tela [data-motivo="salaCheia"]'), null, { timeout: 8000 });
  assert.equal(lido(await cheia.textContent('h1')), 'A sala está cheia (20 pessoas)');
  const uidCheia = await cheia.evaluate(() => globalThis.__palco.uid());
  assert.equal(await cheia.evaluate((c) => globalThis.__palco.ler(c), `salas/${SALA}/membros/${uidCheia}/equipe`), null, 'sem vaga');
  await conferirLargura(cheia, '11-sala-cheia');
  await ctxCheia.close();
  console.log('ok: o 21º vê "A sala está cheia (20 pessoas)"');

  // ---------- 8. O celular do apresentador (espectador) ----------
  const { ctx: ctxEsp, p: esp } = await novoCelular('espectador');
  await esp.evaluate(() => globalThis.__palco.criarSala());
  await esp.evaluate((pin) => globalThis.__palco.semearPin(pin), PIN);
  await esp.evaluate(() => globalThis.__palco.ligarTelao());
  await esp.evaluate(() => globalThis.__palco.entrarOutros('outro', 3));
  await esp.click('[data-acao="sou-apresentador"]');
  await esp.fill('#pin-espectador', PIN);
  await esp.click('[data-acao="entrar-espectador"]');
  await esperarTela(esp, 'turmaLobby');
  await esp.waitForFunction(() => /3 pessoas na sala/.test(document.querySelector('#tela h1')?.textContent || ''), null, { timeout: 8000 });
  assert.equal(await esp.isHidden('#barra-espectador'), true, 'sem o seletor de vagas');
  assert.equal(lido(await esp.textContent('#cracha')), 'modo espectador');
  await conferirLargura(esp, '12-espectador-lobby');
  await ate(esp, (e) => e.tipo === 'personas', 'Conheça o Jonas (espectador)');
  await esperarTela(esp, 'persona');
  await semVaga(esp, 'espectador-persona');
  await esperarLeram(esp, 0, 3);
  assert.equal(await esp.locator('[data-acao="li"]').count(), 0, 'o espectador não tem o botão');
  await esp.evaluate(() => globalThis.__palco.lerOutros('outro', 2));
  await esperarLeram(esp, 2, 3);
  const r1 = passos.findIndex((x) => x.tipo === 'rodada');
  await ate(esp, (e) => e.indice === r1 && e.subfase === 'decidindo', 'decisão (espectador)');
  await esperarTela(esp, 'turmaDecisao');
  await esp.waitForFunction(() => /0 de 3 já escolheram/.test(document.querySelector('.turma-contagem')?.textContent || ''), null, { timeout: 8000 });
  await esp.evaluate(() => globalThis.__palco.votarOutros('outro', ['b', 'b', null]));
  await esp.waitForFunction(() => /2 de 3 já escolheram/.test(document.querySelector('.turma-contagem')?.textContent || ''), null, { timeout: 8000 });
  assert.equal(await esp.locator('[data-votar]').count(), 0, 'o espectador não vota');
  await esp.click('.opcao-aluno[data-opcao-bloco="a"] .botao-opcao-aluno');
  await esp.waitForSelector('.opcao-narrativa');
  await semVaga(esp, 'espectador-decisao');
  await conferirLargura(esp, '13-espectador-decisao');
  await esp.evaluate(() => globalThis.__palco.passo()); // encerra
  await esperarTela(esp, 'turmaResultado');
  const contagem = Object.fromEntries((await esp.locator('.turma-opcao').evaluateAll((ns) => ns.map((n) => [n.dataset.opcao, Number(n.dataset.n)]))));
  const padrao = cfg.rodadas.find((r) => r.id === passos[r1].rodada).padrao;
  const esperado = { a: 0, b: 2, c: 0, d: 0, e: 0 };
  esperado[padrao] += 1;
  assert.deepEqual(contagem, esperado, 'quantas pessoas ficaram com cada opção (a que não votou, na de sempre)');
  assert.match(await textoDaTela(esp), /1 pessoa não votou e ficou com a opção de sempre/);
  await conferirLargura(esp, '14-espectador-resultado');
  await ate(esp, (e) => e.indice === r1 + 1, 'bloco (espectador)');
  await esperarTela(esp, 'aguardando', 'bloco no espectador');
  assert.equal(lido(await esp.textContent('h1')), passos[r1 + 1].titulo);
  assert.equal(await esp.locator('.dados-item').count(), passos[r1 + 1].itens.length);
  assert.equal(await esp.locator('.tabela-meses').count(), 0, 'o espectador não vê o ano de ninguém');
  await esperarLeram(esp, 0, 3);
  await conferirLargura(esp, '15-espectador-bloco');
  await ate(esp, (e) => e.tipo === 'placarFinal', 'placar (espectador)');
  await esperarTela(esp, 'turmaPlacar');
  assert.match(lido(await esp.textContent('.turma-destaque')), /^De 3 alunos, /);
  assert.equal(await esp.locator('.tabela-turma tbody tr').count(), 6);
  await semVaga(esp, 'espectador-placar');
  await conferirLargura(esp, '16-espectador-placar');
  await ctxEsp.close();
  console.log('ok: o espectador mostra o resumo da turma, nunca uma vaga');

  // ---------- 9. Sem a chave: as equipes, sem nome ----------
  const { ctx: ctxEq, p: eq } = await novoCelular('equipes', CONFIG_EQUIPES);
  await eq.evaluate(() => globalThis.__palco.criarSala());
  await eq.click('[data-acao="entrar"]');
  await eq.waitForFunction(() => document.querySelector('#tela [data-motivo="lobby"]'), null, { timeout: 8000 });
  assert.match(lido(await eq.textContent('#cracha')), /^Crachá ?[A-HJ-NP-Z2-9]{3}$/, 'o crachá de sempre (o espaço é o gap do CSS)');
  assert.equal(await eq.locator('#nome-aluno').count(), 0, 'sem o campo do nome');
  await ate(eq, (e) => e.tipo === 'formarEquipes', 'formar equipes');
  await esperarTela(eq, 'escolherEquipe');
  await ctxEq.close();
  console.log('ok: sem a chave, as equipes ficam como antes (sem nome)');
} finally {
  await navegador.close();
  await site.fechar();
}
assert.deepEqual(erros, [], 'nenhum erro no console das páginas');
console.log('e2e do celular no modo individual: tudo certo.');
