// O celular do aluno: entrar na sala, votar e reenviar o que não chegou
// (arquitetura, seções 5, 9 e 10; contratos, seção 8).
//
// A tela é uma função dos dados (invariante I6): tudo o que o aluno vê sai de
// Viracao.alunoLogica.telaDoAluno, a mesma função que o simulador de 20 alunos
// usa. Este arquivo só:
// - fala com o banco pelo canal-firebase (o único que conhece o Firebase);
// - guarda o voto no aparelho ANTES de enviar e só diz "registrado" quando o
//   servidor confirma (o SDK na web guarda a fila de escrita só em memória);
// - percebe a própria queda e reconecta, sem depender do pulso do telão (red
//   team, falha 7);
// - desenha cada tela com createElement (nenhum innerHTML, AGENTS.md regra 4).
//
// Script clássico (IIFE), sem módulos: a mesma regra do site inteiro. O SDK do
// Firebase é a única coisa carregada por import(), com tempo-limite de 4 s.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});
  const N = () => raiz.Viracao; // os outros módulos são buscados na hora da chamada
  const D = () => N().dom;
  const F = () => N().formatar;
  const G = () => N().graficos;
  const L = () => N().alunoLogica;

  // Tem de ser igual ao ?v= das tags do aluno/index.html e à versaoApp do telão
  // (bin/versao.mjs sobe os três juntos). Diferente da meta da sala = o celular
  // está com código velho em cache: a faixa pede para atualizar.
  const VERSAO_APP = '3';
  // Sem a versão na chave, de propósito: a faixa manda recarregar, e o voto
  // guardado pela versão velha precisa ser reenviado pela nova.
  const PREFIXO = 'viracao:aluno:';
  const RE_SALA = /^[A-HJ-NP-Z2-9]{4}$/;
  const FORA_DO_ALFABETO = /[^A-HJ-NP-Z2-9]/g;

  const SDK_BASE = 'https://www.gstatic.com/firebasejs/12.19.0/';
  const SDK_LIMITE_MS = 4000;
  const CAMPOS_CONEXAO = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  const CONEXAO_EMULADOR = { apiKey: 'chave-do-emulador', projectId: 'demo-seminario' };
  const ESPERA_SERVICO_MS = 15000;
  const REPETIR_SERVICO_MS = 10000;
  // Depois de uma falha do import() da CDN, o celular recarrega a página, no
  // máximo uma vez nesse intervalo (contado no sessionStorage): sem o limite, uma
  // CDN fora do ar viraria um laço de recargas.
  const RECARGA_MIN_MS = 15000;
  const LIMITE_SDK = 'o serviço não carregou em 4 s';
  // Detector de queda própria (arquitetura, seção 10).
  const QUEDA_MS = 5000;
  const RECONECTAR_MS = 10000;
  const SONDA_MS = 5000;
  const PRESENCA_MS = 20000;
  // Voto em trânsito (arquitetura, seção 10).
  const ENVIO_LENTO_MS = 5000;
  const ENVIO_GUARDADO_MS = 20000;
  // O membro que sumiu (removido por inatividade) é registrado de novo, mas não
  // mais que uma vez nesse intervalo: uma recusa não pode virar laço.
  const REGISTRO_INTERVALO_MS = 5000;
  // Pulso do telão velho = mais de 3 pulsos perdidos. Só avisa, nunca reconecta.
  const PULSOS_PERDIDOS = 3;
  // Navegador embutido do Instagram e do Facebook: guarda o login num lugar que
  // some ao fechar, e o aluno volta como outro aparelho (membro fantasma, R15).
  const NAVEGADOR_EMBUTIDO = /Instagram|FBAN|FBAV/i;
  const LETRAS = 'ABCDEFGHIJ';
  // Etapas em que a tela precisa ficar acesa (arquitetura, seção A, item 6).
  const TELAS_ACESAS = new Set(['enquete', 'decisao', 'prorrogacao']);

  const app = {
    el: {},
    // entrada | conectando | sala | erro
    fase: 'entrada',
    erro: null, aviso: null, codigo: '', sala: null,
    emulador: false, lp: false, embutido: false,
    servico: null, canal: null, uid: null,
    dados: { meta: null, conteudo: null, estado: null, membros: null, resultados: null, placar: null, pulso: null, decisoes: null },
    recebido: { meta: false, membros: false },
    votosServidor: {}, // { [enquete]: { [momento]: { [afirmacao]: v } } }, só os do próprio aparelho
    desligar: [], desligarEquipe: null, chaveEquipe: null, desligarVotos: [], chaveVotos: null,
    membroConfirmado: false, registrando: false, ultimoRegistro: 0, trocandoEquipe: false,
    conectado: false, jaConectou: false, timerQueda: 0, intervaloReconexao: 0, intervaloPresenca: 0,
    envios: new Map(), reenviados: new Set(),
    ui: { foco: null, chavePasso: null, nota: null },
    selo: null, wake: null, querAceso: false, chaveDesenho: null, repetirTimer: 0,
  };

  // ---------- Utilidades ----------

  function lista(x) {
    if (Array.isArray(x)) return x;
    return x && typeof x === 'object' ? Object.values(x) : [];
  }
  const tem = (mapa, id) => Boolean(mapa) && typeof mapa === 'object' && typeof id === 'string' && Object.hasOwn(mapa, id);
  const parametro = (nome) => new URLSearchParams(raiz.location.search).get(nome);
  const ehMaquinaLocal = () => ['localhost', '127.0.0.1'].includes(raiz.location.hostname);
  const normalizarSala = (x) => String(x || '').toUpperCase().replace(FORA_DO_ALFABETO, '').slice(0, 4);
  const recusado = (erro) => /PERMISSION_DENIED/.test(String(erro?.message || erro));
  const cam = (...partes) => ['salas', app.sala, ...partes].join('/');
  const agoraServidor = () => (app.canal ? app.canal.agora() : Date.now());

  // localStorage pode lançar (aba anônima, dado bloqueado) ou voltar vazio: o
  // voto continua sendo enviado, só não sobrevive a recarregar a página.
  function lerLocal(chave) {
    try {
      const t = raiz.localStorage.getItem(PREFIXO + chave);
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  function gravarLocal(chave, valor) {
    try { raiz.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor)); } catch { /* segue em memória */ }
  }
  function apagarLocal(chave) {
    try { raiz.localStorage.removeItem(PREFIXO + chave); } catch { /* nada a fazer */ }
  }

  function comLimite(promessa, ms, texto) {
    let timer = 0;
    const limite = new Promise((_, rejeitar) => { timer = setTimeout(() => rejeitar(new Error(texto)), ms); });
    return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
  }

  function ordemDe(conteudo, colecao) {
    const ordem = lista(conteudo?.ordem?.[colecao]);
    return ordem.length > 0 ? ordem : Object.keys(conteudo?.[colecao] || {});
  }
  const numeroEquipe = (id) => ordemDe(app.dados.conteudo, 'equipes').indexOf(id) + 1;
  function rotuloEquipe(equipe) {
    return equipe ? G().rotuloEquipe(equipe, numeroEquipe(equipe.id)) : null;
  }
  function ordemOpcoes(rodadaId) {
    const r = app.dados.conteudo?.rodadas?.[rodadaId];
    const o = lista(r?.ordemOpcoes);
    return o.length > 0 ? o : Object.keys(r?.opcoes || {});
  }
  const letraDe = (rodadaId, opcao) => LETRAS[ordemOpcoes(rodadaId).indexOf(opcao)] || '?';
  const escalaCurta = () => lista(app.dados.conteudo?.escala?.curtos);
  const rotuloVoto = (v) => `${v} · ${escalaCurta()[v - 1] || ''}`;

  // ---------- Serviço (conexao.json + SDK) ----------

  async function lerConexao() {
    // O emulador só na própria máquina: numa URL publicada, ?emulador=1 não pode
    // desviar o celular para um banco sem regras (o canal confere de novo).
    if (app.emulador) return { ...CONEXAO_EMULADOR };
    let conexao;
    try {
      const r = await raiz.fetch('../conexao.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      conexao = await r.json();
    } catch (erro) {
      throw new Error(`o site não conseguiu ler a configuração do serviço (${erro.message})`);
    }
    if (CAMPOS_CONEXAO.some((k) => typeof conexao?.[k] !== 'string' || conexao[k] === '' || conexao[k].includes('COLE_AQUI'))) {
      throw new Error('o site ainda não foi ligado ao serviço (conexao.json sem as chaves)');
    }
    return conexao;
  }

  // O navegador guarda a falha do import() de um endereço para o documento
  // inteiro: repetir o import() na mesma página falha na hora, mesmo com a CDN de
  // volta (revisão da F2, achado 25). Por isso a falha de rede (e não o
  // tempo-limite, em que o import() ainda pode chegar) pede recarregar a página.
  // Um ?t= no endereço não resolve: firebase-auth.js e firebase-database.js
  // importam o firebase-app.js pelo endereço fixo.
  async function carregarSdk() {
    const nomes = ['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'];
    try {
      const [appFb, auth, database] = await comLimite(Promise.all(nomes.map((n) => import(SDK_BASE + n))), SDK_LIMITE_MS, LIMITE_SDK);
      return { app: appFb, auth, database };
    } catch (erro) {
      if (erro?.message !== LIMITE_SDK) erro.recarregar = true;
      throw erro;
    }
  }

  function lerSessao(chave) {
    try { return raiz.sessionStorage.getItem(PREFIXO + chave); } catch { return null; }
  }
  function gravarSessao(chave, valor) {
    try { raiz.sessionStorage.setItem(PREFIXO + chave, valor); } catch { /* segue sem o limite */ }
  }

  // Recarrega a página para uma tentativa nova do import(), com a sala na URL e a
  // marca de "entrar direto" no sessionStorage: o aluno volta à sala sem tocar
  // em nada. No máximo uma recarga a cada RECARGA_MIN_MS.
  function agendarRecarga(sala) {
    const ultima = Number(lerSessao('recarregouEm')) || 0;
    const espera = Math.max(1500, ultima + RECARGA_MIN_MS - Date.now());
    clearTimeout(app.repetirTimer);
    app.repetirTimer = setTimeout(() => recarregarPara(sala), espera);
  }

  function recarregarPara(sala) {
    if (RE_SALA.test(String(sala))) {
      gravarSessao('entrarAposRecarga', sala);
      const busca = new URLSearchParams(raiz.location.search);
      busca.set('sala', sala);
      try { raiz.history.replaceState(null, '', `${raiz.location.pathname}?${busca}`); } catch { /* só conveniência */ }
    }
    gravarSessao('recarregouEm', String(Date.now()));
    raiz.location.reload();
  }

  function prepararServico() {
    if (!app.servico) {
      app.servico = (async () => ({ conexao: await lerConexao(), sdk: await carregarSdk() }))();
      // Falhou (CDN bloqueada, rede do campus): a próxima tentativa começa do zero.
      app.servico.catch(() => { app.servico = null; });
    }
    return app.servico;
  }

  // Um canal por página, com o nome de app fixo do canal-firebase: o uid
  // anônimo fica guardado por nome de app, e recarregar devolve o mesmo uid (I6).
  async function obterCanal() {
    if (app.canal) return app.canal;
    const { conexao, sdk } = await prepararServico();
    if (app.canal) return app.canal;
    app.canal = N().canalFirebase.criar({
      sdk, conexao, longPolling: app.lp, emulador: app.emulador ? true : undefined, ambienteLocal: app.emulador,
    });
    vigiarConexao();
    return app.canal;
  }

  // ---------- Detector de queda própria (arquitetura, seção 10) ----------

  // Sinal 1: .info/connected falso por mais de 5 s com a página visível. Reação:
  // goOffline + goOnline (reinicia o recuo do SDK), repetido a cada 10 s
  // enquanto estiver fora. O pulso do telão NÃO entra aqui: um telão escondido
  // atrás dos slides viraria uma tempestade de reconexões de 20 celulares.
  function vigiarConexao() {
    app.selo.elemento.hidden = false;
    app.canal.aoMudarConexao((ok) => {
      app.conectado = ok;
      clearTimeout(app.timerQueda);
      clearInterval(app.intervaloReconexao);
      app.intervaloReconexao = 0;
      if (ok) {
        app.jaConectou = true;
        app.selo.definir('conectado');
        // O servidor executa o onDisconnect e o esquece: a cada reconexão, a
        // presença e o "apague ao cair" são registrados de novo.
        if (app.membroConfirmado) {
          registrarDesconexao();
          enviarPresenca();
        }
      } else {
        app.selo.definir('reconectando', app.jaConectou ? 'Reconectando…' : 'Conectando…');
        app.timerQueda = setTimeout(() => {
          reconectarSeVisivel();
          app.intervaloReconexao = setInterval(reconectarSeVisivel, RECONECTAR_MS);
        }, QUEDA_MS);
      }
      desenhar();
    });
  }

  function reconectarSeVisivel() {
    if (!app.conectado && document.visibilityState === 'visible') reconectar();
  }

  function reconectar() {
    if (app.canal) app.canal.reconectar();
  }

  // Sinal 2: a escrita de presença é também a sonda. Sem confirmação em 5 s, a
  // conexão está "zumbi" (o iOS mantém o socket morto com a tela bloqueada).
  function enviarPresenca() {
    if (!app.membroConfirmado || !app.canal) return;
    let respondeu = false;
    const sonda = setTimeout(() => { if (!respondeu) reconectar(); }, SONDA_MS);
    app.canal.gravar({ [cam('presenca', app.uid)]: app.canal.marcadorDeHora() })
      // Recusa = o membro sumiu (removido por inatividade); garantirMembro cuida.
      .catch(() => {})
      .finally(() => {
        respondeu = true;
        clearTimeout(sonda);
      });
  }

  function registrarDesconexao() {
    app.canal.apagarAoDesconectar(cam('presenca', app.uid)).catch(() => {});
  }

  function iniciarPresenca() {
    registrarDesconexao();
    enviarPresenca();
    if (app.intervaloPresenca) return;
    // Só com a página visível: com a tela bloqueada o aluno não está
    // participando, e o telão deve contar isso (ativos × membros).
    app.intervaloPresenca = setInterval(() => { if (document.visibilityState === 'visible') enviarPresenca(); }, PRESENCA_MS);
  }

  // Ao voltar a página (visibilitychange, pageshow, online): o mesmo ciclo, e
  // relê o estado. É o que derruba a conexão zumbi do iOS. O Wake Lock é
  // pedido de novo pelo próprio conexao.criarWakeLock.
  function aoVoltarAVista() {
    if (!app.canal || app.fase !== 'sala') return;
    reconectar();
    reler();
  }

  async function reler() {
    const nos = { estado: 'estado', meta: 'meta', membros: 'membros', resultados: 'resultados', placar: 'placar', pulso: 'pulso' };
    await Promise.allSettled(Object.entries(nos).map(async ([campo, no]) => {
      const v = await app.canal.ler(cam(no));
      if (campo === 'meta') app.recebido.meta = true;
      if (campo === 'membros') app.recebido.membros = true;
      app.dados[campo] = v;
    }));
    aoMudarDados();
  }

  // ---------- Entrar na sala ----------

  async function entrarNaSala(sala) {
    if (app.embutido || !RE_SALA.test(sala)) return;
    clearTimeout(app.repetirTimer);
    app.sala = sala;
    app.fase = 'conectando';
    app.aviso = null;
    desenhar();
    let meta;
    try {
      const canal = await obterCanal();
      app.uid = await comLimite(canal.entrar(), ESPERA_SERVICO_MS, 'sem resposta do login');
      meta = await canal.ler(cam('meta'));
    } catch (erro) {
      mostrarErroServico(erro, () => entrarNaSala(sala));
      return;
    }
    if (!meta) {
      if (lerLocal('sala') === sala) apagarLocal('sala');
      app.fase = 'entrada';
      app.aviso = `Não há sala com o código ${sala}. Confira o código no telão.`;
      desenhar();
      return;
    }
    gravarLocal('sala', sala);
    // A URL fica com a sala: recarregar (ou o navegador reabrir a aba) volta aqui.
    const busca = new URLSearchParams(raiz.location.search);
    busca.set('sala', sala);
    try { raiz.history.replaceState(null, '', `${raiz.location.pathname}?${busca}`); } catch { /* só conveniência */ }
    app.fase = 'sala';
    ligarOuvintes();
    desenhar();
  }

  function mostrarErroServico(erro, repetir) {
    const texto = String(erro?.code || '') + ' ' + String(erro?.message || erro);
    let titulo = 'Sem acesso ao serviço';
    let explicacao = `Não foi possível falar com o servidor (${String(erro?.message || erro)}). Tentando de novo a cada 10 s.`;
    if (/too-many-requests/.test(texto)) {
      titulo = 'Muitas entradas nesta rede';
      explicacao = 'O serviço limitou as contas novas desta rede por uma hora. Tente pelo 4G, ou espere alguns minutos.';
    } else if (/conexao\.json|ligado ao serviço/.test(texto)) {
      titulo = 'Site ainda não configurado';
      explicacao = `${String(erro.message)}. Avise o apresentador: nesta aula as respostas serão por mão levantada.`;
      repetir = null;
    }
    app.fase = 'erro';
    clearTimeout(app.repetirTimer);
    if (erro?.recarregar && repetir) {
      // A falha do import() fica guardada nesta página: tentar de novo é recarregar.
      const sala = app.sala;
      explicacao = `Não foi possível baixar o app do servidor (${String(erro?.message || erro)}). A página recarrega sozinha em instantes para tentar de novo.`;
      app.erro = { titulo, texto: explicacao, repetir: () => recarregarPara(sala) };
      agendarRecarga(sala);
    } else {
      app.erro = { titulo, texto: explicacao, repetir };
      if (repetir) app.repetirTimer = setTimeout(repetir, REPETIR_SERVICO_MS);
    }
    desenhar();
  }

  // O registro de membro: grava membros/{uid} (sem equipe) com a hora do
  // servidor. Nunca regrava um membro que já existe: um entrouEm novo tiraria o
  // voto da decisão aberta (a regra só aceita quem entrou antes da abertura).
  async function garantirMembro() {
    const d = app.dados;
    if (app.fase !== 'sala' || !app.recebido.membros || !app.recebido.meta || !d.meta) return;
    if (tem(d.membros, app.uid)) {
      if (!app.membroConfirmado) {
        app.membroConfirmado = true;
        iniciarPresenca();
        aoMudarDados();
      }
      return;
    }
    app.membroConfirmado = false;
    if (d.meta.entradaAberta !== true || app.registrando || Date.now() - app.ultimoRegistro < REGISTRO_INTERVALO_MS) return;
    app.registrando = true;
    app.ultimoRegistro = Date.now();
    try {
      await app.canal.gravar({ [cam('membros', app.uid)]: { entrouEm: app.canal.marcadorDeHora() } });
    } catch (erro) {
      if (recusado(erro)) app.ui.nota = 'A sala não aceitou a entrada (fechada ou expirada). Fale com o apresentador.';
    } finally {
      app.registrando = false;
      desenhar();
    }
  }

  // ---------- Ouvintes ----------

  // Ouvinte cancelado por permissão (o aluno foi movido de equipe, a regra
  // mudou no meio) é religado sozinho, com espera crescente até 10 s.
  function ouvinteResistente(caminho, cb) {
    let atual = null;
    let parado = false;
    let timer = 0;
    let tentativas = 0;
    const ligar = () => {
      if (parado) return;
      atual = app.canal.ouvir(caminho, (v) => {
        tentativas = 0;
        cb(v);
      }, () => {
        if (parado) return;
        tentativas += 1;
        timer = setTimeout(ligar, Math.min(10000, 1000 * 2 ** (tentativas - 1)));
      });
    };
    ligar();
    return () => {
      parado = true;
      clearTimeout(timer);
      if (atual) atual();
    };
  }

  function ligarOuvintes() {
    for (const f of app.desligar.splice(0)) f();
    const campos = ['meta', 'conteudo', 'estado', 'pulso', 'membros', 'resultados', 'placar'];
    for (const no of campos) {
      app.desligar.push(ouvinteResistente(cam(no), (v) => {
        app.dados[no] = v;
        if (no === 'meta') app.recebido.meta = true;
        if (no === 'membros') app.recebido.membros = true;
        aoMudarDados();
      }));
    }
  }

  function aoMudarDados() {
    garantirMembro();
    const e = app.dados.estado;
    const chavePasso = e ? `${e.indice}|${e.subfase}|${e.afirmacao || ''}` : null;
    if (chavePasso !== app.ui.chavePasso) {
      app.ui.chavePasso = chavePasso;
      app.ui.foco = null;
      app.ui.nota = null;
    }
    religarEquipe();
    religarVotos();
    talvezReenviar();
    desenhar();
  }

  // As decisões da própria equipe (a regra só deixa ler essas), ligadas só
  // depois de o membro ser confirmado e religadas quando o apresentador move o
  // aluno ou a rodada muda (arquitetura, seção 10).
  function religarEquipe() {
    const e = app.dados.estado;
    const membro = app.membroConfirmado ? app.dados.membros?.[app.uid] : null;
    const chave = e?.tipo === 'rodada' && membro?.equipe ? `${e.rodada}|${membro.equipe}` : null;
    if (chave === app.chaveEquipe) return;
    app.chaveEquipe = chave;
    if (app.desligarEquipe) app.desligarEquipe();
    app.desligarEquipe = null;
    app.dados.decisoes = null;
    if (!chave) return;
    app.desligarEquipe = ouvinteResistente(cam('decisoes', e.rodada, membro.equipe), (v) => {
      app.dados.decisoes = v;
      desenhar();
    });
  }

  // Os próprios votos, lidos do servidor (a regra deixa cada um ler só a
  // própria folha): recarregar a página não perde o "você já votou", e o
  // comparativo mostra "você antes: 4, agora: 2" sem guardar voto no aparelho.
  function religarVotos() {
    const e = app.dados.estado;
    const c = app.dados.conteudo;
    let alvos = [];
    if (app.membroConfirmado && e && c && tem(c.enquetes, e.enquete)) {
      const enq = c.enquetes[e.enquete];
      const ordem = lista(enq.ordemAfirmacoes).length > 0 ? lista(enq.ordemAfirmacoes) : Object.keys(enq.afirmacoes || {});
      const momentos = e.tipo === 'enquete' ? [e.momento] : e.tipo === 'comparativo' ? ['antes', 'depois'] : [];
      alvos = momentos.flatMap((m) => ordem.map((a) => [e.enquete, m, a]));
    }
    const chave = JSON.stringify(alvos);
    if (chave === app.chaveVotos) return;
    app.chaveVotos = chave;
    for (const f of app.desligarVotos.splice(0)) f();
    for (const [enq, m, a] of alvos) {
      app.desligarVotos.push(ouvinteResistente(cam('votosEnquete', enq, m, a, app.uid), (v) => {
        const porMomento = ((app.votosServidor[enq] ||= {})[m] ||= {});
        if (Number.isInteger(v)) porMomento[a] = v;
        else delete porMomento[a];
        desenhar();
      }));
    }
  }

  // ---------- Voto em trânsito (arquitetura, seção 10) ----------

  const chavePendentes = () => `pendentes:${app.sala}:${app.uid}`;
  const lerPendentes = () => lerLocal(chavePendentes()) || {};
  function guardarPendente(caminho, pendente) {
    gravarLocal(chavePendentes(), { ...lerPendentes(), [caminho]: pendente });
  }
  function removerPendente(caminho) {
    const p = lerPendentes();
    delete p[caminho];
    if (Object.keys(p).length > 0) gravarLocal(chavePendentes(), p);
    else apagarLocal(chavePendentes());
  }

  const caminhoDe = (p) => (p.tipo === 'enquete'
    ? cam('votosEnquete', p.enquete, p.momento, p.afirmacao, app.uid)
    : cam('decisoes', p.rodada, p.equipe, app.uid));
  const valorDe = (p) => (p.tipo === 'enquete' ? p.valor : p.opcao);
  const emVoo = (envio) => Boolean(envio) && (envio.estagio === 'enviando' || envio.estagio === 'lento');

  // O valor que o servidor já confirmou para uma folha. O SDK aplica a escrita
  // no cache local antes da confirmação, e o ouvinte avisa na hora: sem este
  // cuidado, a tela avançaria (e mostraria o voto como feito) sem o servidor
  // ter aceitado nada.
  function confirmadoAntes(p) {
    if (p.tipo === 'enquete') return app.votosServidor[p.enquete]?.[p.momento]?.[p.afirmacao] ?? null;
    return app.dados.decisoes?.[app.uid] ?? null;
  }

  function votar(escolha) {
    // A janela em que o voto foi dado: depois de recarregar, o reenvio só vale
    // nela (pendenteAindaVale), e não numa reabertura da mesma etapa (D-037).
    const pendente = { ...escolha, abertoEm: app.dados.estado?.abertoEm };
    const caminho = caminhoDe(pendente);
    if (emVoo(app.envios.get(caminho))) return; // botão desabilitado enquanto envia
    // 1. Primeiro no aparelho: se a página cair agora, o voto não se perde.
    guardarPendente(caminho, pendente);
    enviar(caminho, pendente);
  }

  function enviar(caminho, pendente) {
    const antigo = app.envios.get(caminho);
    if (antigo) for (const t of antigo.timers) clearTimeout(t);
    const envio = { pendente, estagio: 'enviando', anterior: emVoo(antigo) ? antigo.anterior : confirmadoAntes(pendente), timers: [] };
    app.envios.set(caminho, envio);
    // 3. Sem confirmação em 5 s: "enviando…" e um ciclo de reconexão.
    envio.timers.push(setTimeout(() => {
      if (envio.estagio !== 'enviando') return;
      envio.estagio = 'lento';
      reconectar();
      desenhar();
    }, ENVIO_LENTO_MS));
    // 4. Em 20 s: "guardado; será reenviado". O SDK continua com a escrita na
    // fila e manda quando a conexão voltar; se a página for recarregada antes,
    // o pendente do localStorage é reenviado (talvezReenviar).
    envio.timers.push(setTimeout(() => {
      if (!emVoo(envio)) return;
      envio.estagio = 'guardado';
      if (pendente.tipo === 'enquete' && app.ui.foco === pendente.afirmacao) app.ui.foco = null;
      desenhar();
    }, ENVIO_GUARDADO_MS));
    desenhar();
    app.canal.gravar({ [caminho]: valorDe(pendente) }).then(() => {
      if (app.envios.get(caminho) !== envio) return;
      // 2. "Registrado" só com a confirmação do servidor.
      envio.estagio = 'registrado';
      removerPendente(caminho);
      if (pendente.tipo === 'enquete') {
        ((app.votosServidor[pendente.enquete] ||= {})[pendente.momento] ||= {})[pendente.afirmacao] = pendente.valor;
        if (app.ui.foco === pendente.afirmacao) app.ui.foco = null; // avança sozinho
        // A tela já passou para a próxima afirmação: a confirmação da anterior
        // aparece nela, para o aluno saber que a resposta chegou.
        app.ui.nota = `Resposta registrada: ${rotuloVoto(pendente.valor)}.`;
      } else app.ui.nota = null;
    }, (erro) => {
      if (app.envios.get(caminho) !== envio) return;
      if (recusado(erro)) {
        // 5. Recusa da regra: o app nunca finge que contou.
        envio.estagio = 'recusado';
        removerPendente(caminho);
        app.ui.nota = 'A votação fechou antes do seu voto chegar.';
      } else {
        envio.estagio = 'guardado';
      }
    }).finally(() => {
      for (const t of envio.timers) clearTimeout(t);
      desenhar();
    });
  }

  // Depois de recarregar: o pendente cuja etapa continua aberta é reenviado
  // (a chave é a mesma, então não duplica). O que já não vale é descartado, e o
  // aluno fica sabendo.
  function talvezReenviar() {
    const e = app.dados.estado;
    if (!app.membroConfirmado || !e) return;
    for (const [caminho, p] of Object.entries(lerPendentes())) {
      if (app.envios.has(caminho)) continue;
      if (L().pendenteAindaVale(p, e)) {
        if (app.reenviados.has(caminho)) continue;
        app.reenviados.add(caminho);
        enviar(caminho, p);
      } else {
        removerPendente(caminho);
        app.ui.nota = 'Um voto guardado no aparelho não chegou a tempo: aquela votação já tinha fechado.';
      }
    }
  }

  // Os votos que a tela considera: os confirmados, com a folha em voo voltando
  // ao valor anterior, e o "guardado" contando como respondido (o aluno segue
  // para a próxima afirmação com a rede ruim; o reenvio fica por conta do SDK).
  function votosParaTela() {
    const v = structuredClone(app.votosServidor);
    for (const envio of app.envios.values()) {
      const p = envio.pendente;
      if (p.tipo !== 'enquete') continue;
      const folha = ((v[p.enquete] ||= {})[p.momento] ||= {});
      if (emVoo(envio)) {
        if (Number.isInteger(envio.anterior)) folha[p.afirmacao] = envio.anterior;
        else delete folha[p.afirmacao];
      } else if (envio.estagio === 'guardado') folha[p.afirmacao] = p.valor;
    }
    return v;
  }

  function decisoesParaTela() {
    const d = app.dados.decisoes ? { ...app.dados.decisoes } : null;
    const e = app.dados.estado;
    const membro = app.dados.membros?.[app.uid];
    if (!e || !membro) return d;
    const envio = app.envios.get(cam('decisoes', e.rodada, membro.equipe, app.uid));
    if (!envio) return d;
    // Em voo ou guardado, a contagem da equipe fica com o que o servidor já
    // confirmou: "2 votos" com um deles só no aparelho seria fingir que contou.
    // A opção escolhida continua marcada (telaDecisao), com a nota explicando.
    if (!emVoo(envio) && envio.estagio !== 'guardado') return d;
    const saida = d || {};
    if (envio.anterior) saida[app.uid] = envio.anterior;
    else delete saida[app.uid];
    return saida;
  }

  // ---------- Equipe ----------

  async function escolherEquipe(equipeId) {
    if (app.trocandoEquipe) return;
    app.trocandoEquipe = true;
    desenhar();
    try {
      await app.canal.gravar({ [cam('membros', app.uid, 'equipe')]: equipeId });
      app.ui.nota = null;
    } catch (erro) {
      app.ui.nota = recusado(erro) ? 'Não deu para trocar: o apresentador já travou as equipes.' : `Não deu para trocar (${erro.message}).`;
    } finally {
      app.trocandoEquipe = false;
      desenhar();
    }
  }

  function colocarNumaEquipe() {
    const e = app.dados.estado;
    const eq = L().sugerirEquipe(app.dados.conteudo, { membros: app.dados.membros, equipesAbertas: e?.equipesAbertas });
    if (eq) escolherEquipe(eq);
  }

  // ---------- Desenho ----------

  function calcularTela() {
    const d = app.dados;
    if (app.recebido.meta && d.meta === null) return { tipo: 'salaEncerrada', dados: {} };
    if (!app.recebido.membros || !app.recebido.meta) return { tipo: 'aguardando', dados: { motivo: 'entrando' } };
    const membro = tem(d.membros, app.uid) ? d.membros[app.uid] : null;
    return L().telaDoAluno({
      conteudo: d.conteudo, estado: d.estado, membro, membros: d.membros,
      meusVotos: votosParaTela(), decisoesDaEquipe: decisoesParaTela(),
      resultados: d.resultados, placar: d.placar, uid: app.uid, agora: agoraServidor(), meta: d.meta,
    });
  }

  let desenhoAgendado = false;
  function desenhar() {
    if (desenhoAgendado) return;
    desenhoAgendado = true;
    queueMicrotask(() => {
      desenhoAgendado = false;
      desenharAgora();
    });
  }

  function resumoEnvios() {
    return [...app.envios.entries()].map(([c, e]) => [c, e.estagio]);
  }

  function desenharAgora() {
    const tela = app.fase === 'sala' ? calcularTela() : null;
    const chave = JSON.stringify([
      app.fase, app.aviso, app.erro?.titulo, app.erro?.texto, app.embutido, tela, app.ui.foco, app.ui.nota,
      resumoEnvios(), app.trocandoEquipe, app.fase === 'sala' ? contagemEquipes() : null,
    ]);
    desenharCracha();
    desenharFaixas();
    if (chave !== app.chaveDesenho) {
      app.chaveDesenho = chave;
      const { limpar } = D();
      const alvo = limpar(app.el.tela);
      let tipo;
      if (app.fase === 'entrada') tipo = telaEntrada(alvo);
      else if (app.fase === 'conectando') tipo = telaSimples(alvo, 'conectando', `Sala ${app.sala}`, 'Entrando na sala…', 'Conectando ao servidor. Na primeira vez pode levar alguns segundos.');
      else if (app.fase === 'erro') tipo = telaErro(alvo);
      else tipo = desenharTela(alvo, tela);
      document.body.dataset.tela = tipo;
      aplicarWakeLock(TELAS_ACESAS.has(tipo));
      // De novo depois do layout: a altura das opções só existe quando o
      // navegador pinta a tela nova.
      raiz.requestAnimationFrame?.(conferirDobra);
    }
    conferirDobra();
    tique();
  }

  function aplicarWakeLock(quer) {
    if (quer === app.querAceso) return;
    app.querAceso = quer;
    // Só durante votação e decisão (arquitetura, seção A, item 6): no resto da
    // aula a tela pode apagar, e a bateria agradece.
    if (quer) app.wake.ligar();
    else app.wake.desligar();
  }

  function desenharCracha() {
    const alvo = app.el.cracha;
    const membro = app.uid ? app.dados.membros?.[app.uid] : null;
    const equipe = membro && tem(app.dados.conteudo?.equipes, membro.equipe) ? app.dados.conteudo.equipes[membro.equipe] : null;
    const chave = app.fase === 'sala' && app.uid ? `${app.uid}|${equipe?.id || ''}` : '';
    if (alvo.dataset.chave === chave) return;
    alvo.dataset.chave = chave;
    const { limpar, acrescentar, el } = D();
    limpar(alvo);
    if (!chave) return;
    const codigo = L().codigoCracha(app.uid);
    // Crachá curto e não pessoal (arquitetura, seção 10): é por ele que o
    // apresentador acha o aparelho no "Mover aluno".
    // O espaço entre as partes é o gap do CSS: num flex, espaço no começo ou no
    // fim de um texto some ("CracháK7Q").
    if (equipe) acrescentar(alvo, [rotuloEquipe({ ...equipe, id: membro.equipe }), el('span', { classe: 'cracha-rotulo', texto: '·' }), el('b', { classe: 'cracha-codigo', texto: codigo })]);
    else acrescentar(alvo, [el('span', { classe: 'cracha-rotulo', texto: 'Crachá' }), el('b', { classe: 'cracha-codigo', texto: codigo })]);
  }

  function pulsoVelho() {
    const d = app.dados;
    if (app.fase !== 'sala' || !app.membroConfirmado || !d.estado || typeof d.pulso !== 'number') return false;
    // Durante o bloco, o telão fica escondido atrás dos slides e o navegador
    // estrangula os timers dele: pulso velho ali é o normal (seção A, item 2).
    if (d.estado.tipo === 'bloco') return false;
    const seg = Number(d.conteudo?.tempos?.pulsoSeg) || 10;
    return agoraServidor() - d.pulso > PULSOS_PERDIDOS * seg * 1000;
  }

  function desenharFaixas() {
    const fv = app.el.faixaVersao;
    const versaoSala = app.dados.meta?.versaoApp;
    const desatualizado = app.fase === 'sala' && versaoSala !== undefined && versaoSala !== null && String(versaoSala) !== VERSAO_APP;
    if (fv.hidden === desatualizado) {
      const { limpar, acrescentar, el, botao } = D();
      limpar(fv);
      if (desatualizado) {
        acrescentar(fv, [
          el('span', { texto: 'Há uma versão nova do app: atualize a página.' }),
          botao('Atualizar', () => raiz.location.reload(), { classe: 'botao-faixa', dados: { acao: 'atualizar' } }),
        ]);
      }
      fv.hidden = !desatualizado;
    }
  }

  // O único timer da tela: redesenha o que depende do relógio (cronômetro e o
  // aviso do pulso). Não decide nada (I5): o prazo que vale é o da regra.
  function tique() {
    for (const c of app.el.tela.querySelectorAll('[data-prazo]')) {
      const t = textoCronometro(c.dataset);
      if (c.textContent !== t) c.textContent = t;
    }
    const ft = app.el.faixaTelao;
    const velho = pulsoVelho();
    if (ft.hidden === velho) {
      ft.textContent = velho ? 'Aguardando o telão… (o seu celular está conectado)' : '';
      ft.hidden = !velho;
    }
  }

  function textoCronometro(dados) {
    if (dados.pausado === '1') return 'pausado';
    const prazo = Number(dados.prazo);
    if (!Number.isFinite(prazo) || prazo <= 0) return '';
    const resta = prazo - agoraServidor();
    return resta > 0 ? F().relogio(resta) : 'tempo esgotado';
  }

  function cronometro(d) {
    return D().el('p', {
      classe: 'cronometro-aluno', 'aria-live': 'off',
      dados: { prazo: String(d.prazo ?? 0), pausado: d.pausado ? '1' : '0' },
    });
  }

  function contagemEquipes() {
    const conta = {};
    for (const m of Object.values(app.dados.membros || {})) if (m?.equipe) conta[m.equipe] = (conta[m.equipe] || 0) + 1;
    return conta;
  }

  // ---------- Telas ----------

  function cabecalho(kicker, titulo, { classeTitulo, lado } = {}) {
    const { el } = D();
    return el('header', { classe: 'cabecalho' }, [
      el('div', { classe: 'cabecalho-textos' }, [
        kicker ? el('p', { classe: 'kicker', texto: kicker }) : null,
        el('h1', { classe: classeTitulo, texto: titulo }),
      ]),
      lado || null,
    ]);
  }

  function nota(texto, tipo = 'info') {
    return texto ? D().el('p', { classe: 'nota', dados: { tipo }, role: tipo === 'erro' ? 'alert' : 'status', texto }) : null;
  }

  const privacidade = () => D().el('p', { classe: 'privacidade', texto: 'Ninguém, nem o apresentador, vê o seu voto: só os totais.' });

  function telaSimples(alvo, tipo, kicker, titulo, texto) {
    const { el, acrescentar } = D();
    acrescentar(alvo, el('section', { classe: 'bloco' }, [cabecalho(kicker, titulo), texto ? el('p', { classe: 'texto', texto }) : null]));
    return tipo;
  }

  function telaEntrada(alvo) {
    const { el, botao, acrescentar } = D();
    const campo = el('input', {
      id: 'codigo-sala', classe: 'campo-codigo', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters',
      spellcheck: 'false', maxlength: '4', 'aria-describedby': 'dica-codigo', value: app.codigo || null, disabled: app.embutido,
    });
    const entrar = botao('Entrar', () => entrarNaSala(normalizarSala(campo.value)), {
      classe: 'botao-primario botao-largo', desabilitado: app.embutido || !RE_SALA.test(app.codigo), dados: { acao: 'entrar' },
    });
    campo.addEventListener('input', () => {
      const limpo = normalizarSala(campo.value);
      if (campo.value !== limpo) campo.value = limpo;
      app.codigo = limpo;
      entrar.disabled = app.embutido || !RE_SALA.test(limpo);
    });
    campo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !entrar.disabled) entrarNaSala(normalizarSala(campo.value));
    });
    const filhos = [
      cabecalho('Seminário da Viração', 'Entrar na sala'),
      el('label', { for: 'codigo-sala', classe: 'rotulo', texto: 'Código da sala' }),
      campo,
      el('p', { id: 'dica-codigo', classe: 'texto-2', texto: 'As 4 letras e números que aparecem no telão.' }),
    ];
    if (app.embutido) filhos.push(blocoNavegadorEmbutido());
    filhos.push(nota(app.aviso, 'erro'), entrar,
      el('p', { classe: 'privacidade', texto: 'Sem nome e sem cadastro: o celular recebe só um crachá curto, como "Laranja · K7Q".' }));
    acrescentar(alvo, el('section', { classe: 'bloco' }, filhos));
    return 'entrada';
  }

  // Detectado na tela de entrada, que bloqueia o "Entrar" (arquitetura, seção
  // 10): quem entra pelo navegador do Instagram vira um membro fantasma ao
  // trocar de navegador depois.
  function blocoNavegadorEmbutido() {
    const { el, botao } = D();
    const busca = new URLSearchParams();
    if (RE_SALA.test(app.codigo)) busca.set('sala', app.codigo);
    if (app.lp) busca.set('lp', '1');
    const url = `${raiz.location.origin}${raiz.location.pathname}${busca.toString() ? `?${busca}` : ''}`;
    const campo = el('input', { classe: 'campo-url', type: 'text', readonly: true, value: url, 'aria-label': 'Endereço para abrir no navegador' });
    const retorno = el('span', { classe: 'texto-2', role: 'status' });
    const copiar = botao('Copiar endereço', () => {
      campo.select();
      const aviso = () => { retorno.textContent = ' Copiado.'; };
      if (raiz.navigator.clipboard?.writeText) raiz.navigator.clipboard.writeText(url).then(aviso, () => { retorno.textContent = ' Selecionado: copie pelo menu.'; });
      else retorno.textContent = ' Selecionado: copie pelo menu.';
    }, { dados: { acao: 'copiar' } });
    return el('div', { classe: 'embutido', role: 'alert' }, [
      el('p', { classe: 'embutido-titulo', texto: 'Abra no navegador' }),
      el('p', { classe: 'texto', texto: 'Este é o navegador de dentro do Instagram ou do Facebook, e ele perde o seu lugar na sala. Toque no menu (⋯) e escolha "Abrir no navegador", ou copie o endereço:' }),
      campo,
      el('p', {}, [copiar, retorno]),
    ]);
  }

  function telaErro(alvo) {
    const { el, botao, acrescentar } = D();
    const e = app.erro || { titulo: 'Erro', texto: '' };
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho(app.sala ? `Sala ${app.sala}` : 'Seminário da Viração', e.titulo),
      el('p', { classe: 'texto', texto: e.texto }),
      e.repetir ? botao('Tentar de novo', () => e.repetir(), { classe: 'botao-primario botao-largo', dados: { acao: 'tentar' } }) : null,
      botao('Entrar em outra sala', () => voltarParaEntrada(), { classe: 'botao-largo', dados: { acao: 'outra-sala' } }),
    ]));
    return 'erro';
  }

  function voltarParaEntrada() {
    clearTimeout(app.repetirTimer);
    for (const f of app.desligar.splice(0)) f();
    for (const f of app.desligarVotos.splice(0)) f();
    if (app.desligarEquipe) app.desligarEquipe();
    clearInterval(app.intervaloPresenca);
    Object.assign(app, {
      fase: 'entrada', erro: null, aviso: null, sala: null, desligarEquipe: null, chaveEquipe: null, chaveVotos: null,
      membroConfirmado: false, intervaloPresenca: 0, votosServidor: {},
      dados: { meta: null, conteudo: null, estado: null, membros: null, resultados: null, placar: null, pulso: null, decisoes: null },
      recebido: { meta: false, membros: false },
    });
    apagarLocal('sala');
    desenhar();
  }

  const MOTIVOS = {
    entrando: ['Entrando na sala…', 'Um instante.'],
    telao: ['Aguardando o telão', 'O apresentador ainda não começou este passo.'],
    lobby: ['Você está na sala', 'Aguarde o apresentador começar. Deixe esta página aberta.'],
    apresentacao: ['Acompanhe a apresentação', 'O celular volta a pedir algo na hora certa.'],
    semEquipe: ['Aguardando uma equipe', 'O apresentador vai colocar você numa equipe.'],
    votacaoEncerrada: ['Votação encerrada', 'Olhe o telão.'],
    desempateDeOutrasEquipes: ['Outras equipes estão desempatando', 'A sua equipe já decidiu. Olhe o telão.'],
  };

  function desenharTela(alvo, tela) {
    const d = tela.dados;
    switch (tela.tipo) {
      case 'salaEncerrada': return telaSalaEncerrada(alvo);
      case 'entradaFechada':
        return telaSimples(alvo, 'entradaFechada', `Sala ${app.sala}`, 'Entrada fechada',
          'O apresentador fechou a entrada nesta sala. Se você acabou de chegar, avise: quando ele abrir de novo, você entra sozinho.');
      case 'aguardando': return telaAguardando(alvo, d);
      case 'enquete': return telaEnquete(alvo, focoOuPadrao(d));
      case 'enqueteRegistrada': {
        const foco = app.ui.foco && !d.encerrada ? d.afirmacoes.find((a) => a.id === app.ui.foco) : null;
        return foco ? telaEnquete(alvo, dadosVotoDe(d, foco)) : telaEnqueteRegistrada(alvo, d);
      }
      case 'escolherEquipe': return telaEscolherEquipe(alvo, d);
      case 'persona': return telaPersona(alvo, d);
      case 'situacao': return telaSituacao(alvo, d);
      case 'decisao':
      case 'prorrogacao': return telaDecisao(alvo, tela.tipo, d);
      case 'sorteando': return telaSorteando(alvo, d);
      case 'resultado': return telaResultado(alvo, d);
      case 'comparativo': return telaComparativo(alvo, d);
      case 'fim': return telaFim(alvo, d);
      default: return telaAguardando(alvo, { motivo: 'telao' });
    }
  }

  function telaAguardando(alvo, d) {
    const [titulo, texto] = MOTIVOS[d.motivo] || MOTIVOS.telao;
    const { el, acrescentar } = D();
    const kicker = d.titulo || app.dados.conteudo?.titulo || 'Seminário da Viração';
    acrescentar(alvo, el('section', { classe: 'bloco', dados: { motivo: d.motivo } }, [
      cabecalho(kicker, titulo), el('p', { classe: 'texto', texto }), nota(app.ui.nota),
    ]));
    return 'aguardando';
  }

  function telaSalaEncerrada(alvo) {
    const { el, botao, acrescentar } = D();
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho(`Sala ${app.sala}`, 'Esta sala foi encerrada'),
      el('p', { classe: 'texto', texto: 'O apresentador apagou a sala. Obrigado pela participação.' }),
      botao('Entrar em outra sala', () => voltarParaEntrada(), { classe: 'botao-largo', dados: { acao: 'outra-sala' } }),
    ]));
    return 'salaEncerrada';
  }

  // ----- Enquete: uma afirmação por vez, "1 de 3", avança sozinho, pode voltar

  // O aluno pode voltar a uma afirmação já respondida (ui.foco). Sem foco, vale
  // a primeira sem voto, que é o que a telaDoAluno devolve.
  function focoOuPadrao(d) {
    const foco = app.ui.foco ? d.afirmacoes.find((a) => a.id === app.ui.foco) : null;
    return foco ? dadosVotoDe(d, foco) : d;
  }

  function dadosVotoDe(d, afirmacao) {
    const e = app.dados.estado || {};
    const enq = app.dados.conteudo?.enquetes?.[d.enquete.id];
    const todas = lista(enq?.ordemAfirmacoes).length > 0 ? lista(enq.ordemAfirmacoes) : Object.keys(enq?.afirmacoes || {});
    return {
      ...d, afirmacao, posicao: todas.indexOf(afirmacao.id) + 1, total: todas.length,
      escala: d.escala || escalaCurta(), prazo: e.prazo ?? null, pausado: typeof e.restanteMs === 'number', restanteMs: e.restanteMs ?? null,
    };
  }

  function rotuloMomento(m) {
    return { antes: 'antes', depois: 'depois' }[m] || null;
  }

  function textoEnvio(envio, registradoTexto = 'Voto registrado.') {
    if (!envio) return null;
    return {
      enviando: null,
      lento: 'Enviando…',
      guardado: 'Guardado no aparelho: será reenviado quando a conexão voltar.',
      registrado: registradoTexto,
      recusado: 'A votação fechou antes do seu voto chegar.',
    }[envio.estagio];
  }

  function telaEnquete(alvo, d) {
    const { el, botao, acrescentar } = D();
    const a = d.afirmacao;
    const pendente = { tipo: 'enquete', enquete: d.enquete.id, momento: d.momento, afirmacao: a.id };
    const envio = app.envios.get(caminhoDe(pendente));
    const enviando = emVoo(envio);
    const abertas = d.afirmacoes.map((x) => x.id);
    const i = abertas.indexOf(a.id);
    const escolhido = enviando ? envio.pendente.valor : a.voto;
    const botoes = lista(d.escala).map((rotulo, k) => {
      const valor = k + 1;
      const b = botao('', () => {
        app.ui.foco = a.id; // fica nesta afirmação até o servidor confirmar
        votar({ ...pendente, valor });
      }, {
        classe: ['botao-escala', enviando && escolhido === valor ? 'enviando' : null],
        pressionado: escolhido === valor, desabilitado: enviando, dados: { valor: String(valor) },
      });
      D().limpar(b);
      acrescentar(b, [el('b', { classe: 'escala-numero', texto: String(valor) }), el('span', { classe: 'escala-rotulo', texto: rotulo })]);
      return b;
    });
    const navegar = [];
    if (i > 0) navegar.push(botao('‹ Anterior', () => { app.ui.foco = abertas[i - 1]; desenhar(); }, { dados: { acao: 'anterior' } }));
    if (app.ui.foco && a.voto !== null && i < abertas.length - 1) {
      navegar.push(botao('Próxima ›', () => {
        const proxima = d.afirmacoes[i + 1];
        app.ui.foco = proxima.voto === null ? null : proxima.id;
        desenhar();
      }, { dados: { acao: 'proxima' } }));
    }
    const kicker = [d.enquete.titulo, rotuloMomento(d.momento)].filter(Boolean).join(' · ');
    acrescentar(alvo, el('section', { classe: 'bloco bloco-enquete', dados: { afirmacao: a.id } }, [
      cabecalho(kicker, a.texto, { classeTitulo: 'afirmacao', lado: cronometro(d) }),
      el('p', { classe: 'progresso', texto: `${d.posicao} de ${d.total}` }),
      el('div', { classe: 'escala', role: 'group', 'aria-label': 'Sua resposta, de 1 a 5' }, botoes),
      nota(textoEnvio(envio, `Registrado: ${escolhido ? rotuloVoto(escolhido) : ''}`), envio?.estagio === 'recusado' ? 'erro' : 'info') || nota(app.ui.nota),
      navegar.length > 0 ? el('div', { classe: 'navegar' }, navegar) : null,
      privacidade(),
    ]));
    return 'enquete';
  }

  function telaEnqueteRegistrada(alvo, d) {
    const { el, botao, acrescentar } = D();
    const guardados = d.afirmacoes.filter((a) => app.envios.get(caminhoDe({ tipo: 'enquete', enquete: d.enquete.id, momento: d.momento, afirmacao: a.id }))?.estagio === 'guardado');
    const titulo = guardados.length > 0 ? 'Guardado no aparelho' : 'Registrado';
    const itens = d.afirmacoes.map((a) => el('li', { classe: 'resposta', dados: { afirmacao: a.id } }, [
      el('p', { classe: 'resposta-texto', texto: a.texto }),
      el('p', { classe: 'resposta-voto' }, [
        a.voto !== null ? ['Sua resposta: ', el('b', { texto: rotuloVoto(a.voto) })] : 'Sem resposta',
        guardados.includes(a) ? ' (será reenviada)' : null,
      ]),
      d.encerrada ? null : botao('Mudar', () => { app.ui.foco = a.id; desenhar(); }, { classe: 'botao-pequeno', dados: { acao: 'mudar' } }),
    ]));
    const kicker = [d.enquete.titulo, rotuloMomento(d.momento)].filter(Boolean).join(' · ');
    // A confirmação vem antes da lista, e a lista é compacta (uma linha por
    // afirmação, texto em até 2 linhas, "Mudar" à direita): em 360×740 a tela
    // cabe sem rolagem, e o aluno vê que a resposta chegou (revisão da F2,
    // achado 19). O texto inteiro aparece de novo no "Mudar".
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho(kicker, titulo),
      el('p', { classe: 'texto', texto: d.encerrada ? 'A votação foi encerrada. Olhe o telão.' : 'Pode mudar até o apresentador encerrar.' }),
      nota(app.ui.nota),
      el('ol', { classe: 'respostas respostas-compactas' }, itens),
      privacidade(),
    ]));
    return 'enqueteRegistrada';
  }

  // ----- Equipes, persona e situação

  function telaEscolherEquipe(alvo, d) {
    const { el, botao, acrescentar } = D();
    const conta = contagemEquipes();
    const minha = d.minha;
    const botoes = d.equipes.map((eq) => {
      const b = botao('', () => escolherEquipe(eq.id), {
        classe: 'botao-equipe', pressionado: minha === eq.id, desabilitado: app.trocandoEquipe, dados: { equipe: eq.id },
      });
      D().limpar(b);
      const n = conta[eq.id] || 0;
      acrescentar(b, [rotuloEquipe(eq), el('span', { classe: 'equipe-conta', texto: minha === eq.id ? 'sua equipe' : F().pessoas(n) })]);
      return b;
    });
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho('Formação das equipes', minha ? 'Você está numa equipe' : 'Escolha a sua equipe'),
      botao(minha ? 'Me coloque em outra equipe' : 'Me coloque numa equipe', () => colocarNumaEquipe(), {
        classe: [minha ? null : 'botao-primario', 'botao-largo'], desabilitado: app.trocandoEquipe, dados: { acao: 'me-coloque' },
      }),
      el('p', { classe: 'texto-2', texto: 'Ou escolha uma (sente-se com ela). Dá para trocar até o apresentador travar as equipes.' }),
      el('div', { classe: 'lista-equipes', role: 'group', 'aria-label': 'Equipes' }, botoes),
      nota(app.ui.nota),
    ]));
    return 'escolherEquipe';
  }

  function listaIndicadores(indicadores, deltas) {
    const { el } = D();
    return el('dl', { classe: 'indicadores' }, indicadores.flatMap((ind) => {
      const delta = deltas ? deltas[ind.id] : undefined;
      return [
        el('dt', { texto: ind.nome }),
        el('dd', { dados: { indicador: ind.id } }, [
          F().indicador(ind, ind.valor),
          typeof delta === 'number' && delta !== 0 ? el('span', { classe: 'delta', texto: ` (${F().indicador(ind, delta, { sinal: true })} no mês)` }) : null,
        ]),
      ];
    }));
  }

  // ----- O dinheiro da casa (D-044, D-046)
  //
  // O jogo cobra o básico da família no fim de cada mês, depois de tudo: a tela
  // diz quanto entrou, quanto o básico custa e quanto faltou, sem suavizar. O
  // que faltou é o número em destaque (tamanho e borda, nunca só cor: D-016).

  // A tela de resultado não traz a persona; o rótulo da outra renda sai do conteúdo.
  function personaDaEquipe(equipeId) {
    const c = app.dados.conteudo;
    const id = tem(c?.equipes, equipeId) ? c.equipes[equipeId].persona : null;
    return tem(c?.personas, id) ? c.personas[id] : null;
  }

  // "Em casa: Lia sustenta sozinha a casa com dois filhos", em uma linha.
  function linhaFamilia(persona) {
    const f = persona?.familia;
    if (!f?.descricao) return null;
    const { el } = D();
    return el('p', { classe: 'familia' }, [el('span', { classe: 'familia-rotulo', texto: 'Em casa:' }), ` ${f.descricao}`]);
  }

  // Antes do primeiro mês (persona e situação) e na decisão: o custo que vem aí.
  function linhaBasico(persona) {
    const total = persona?.basico?.total;
    if (!Number.isFinite(total) || total <= 0) return null;
    const { el } = D();
    return el('p', { classe: 'basico-linha', dados: { basicoTotal: String(total) } }, [
      'O básico da família custa ', el('b', { texto: F().moeda(total) }), ' por mês',
    ]);
  }

  // Na tela da persona, o básico item a item, com a fonte de cada valor: o
  // número do jogo é o da vida real, e a turma pode conferir (D-044).
  function detalheBasico(persona) {
    const itens = lista(persona?.basico?.itens);
    if (itens.length === 0) return null;
    const { el } = D();
    const outra = persona.outraRenda;
    return el('div', { classe: 'basico' }, [
      el('h2', { classe: 'subtitulo', texto: 'O básico da casa, todo mês' }),
      el('ul', { classe: 'basico-itens' }, itens.map((i) => el('li', { classe: 'basico-item' }, [
        el('span', { classe: 'basico-rotulo', texto: i.rotulo }),
        el('b', { classe: 'basico-valor', texto: F().moeda(i.valor) }),
        i.fonte ? el('span', { classe: 'fonte', texto: `Fonte: ${i.fonte}` }) : null,
      ]))),
      linhaBasico(persona),
      outra ? el('p', { classe: 'outra-renda' }, [
        `Outra renda da casa: ${outra.rotulo}, `, el('b', { texto: F().moeda(outra.valor) }), ' por mês',
        outra.fonte ? el('span', { classe: 'fonte', texto: ` (fonte: ${outra.fonte})` }) : null,
      ]) : null,
    ]);
  }

  // "Entrou R$ X · o básico da família custa R$ Y · faltou R$ Z" (D-044), com os
  // números que o telão gravou no resultado (mes). Os juros entram na conta
  // quando houver: sem eles, "faltou" não fecharia com as outras duas parcelas.
  function contaDoMes(mes, persona) {
    if (!mes || !Number.isFinite(mes.saldoMes)) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    const faltou = mes.saldoMes < 0;
    const linha = ['Entrou ', moeda(mes.entrou), ' · o básico da família custa ', moeda(mes.basico)];
    if (mes.juros > 0) linha.push(' · juros da dívida ', moeda(mes.juros));
    // De onde veio o que entrou, quando a casa tem outra renda: a turma vê que o
    // trabalho sozinho não pagava a conta.
    const origem = mes.outraRenda > 0
      ? `Do trabalho: ${F().moeda(mes.trabalho)} · ${persona?.outraRenda?.rotulo || 'outra renda da casa'}: ${F().moeda(mes.outraRenda)}`
      : null;
    return el('div', {
      classe: 'conta-mes',
      dados: { entrou: mes.entrou, basico: mes.basico, juros: mes.juros || 0, saldoMes: mes.saldoMes, resultado: faltou ? 'faltou' : 'sobrou' },
    }, [
      el('p', { classe: 'conta-linha' }, linha),
      origem ? el('p', { classe: 'conta-origem', texto: origem }) : null,
      el('p', { classe: 'conta-saldo' }, [faltou ? 'Faltou ' : 'Sobrou ', moeda(Math.abs(mes.saldoMes))]),
    ]);
  }

  // "Dívida R$ D · juros de J% ao mês" (D-046), só com o saldo negativo. Os juros
  // são cobrados no fim do mês seguinte, sobre a dívida que vinha de antes.
  function linhaDivida(divida) {
    if (!divida || !(divida.valor > 0)) return null;
    const { el } = D();
    const juros = Number.isFinite(divida.jurosMes) ? [' · juros de ', el('b', { texto: F().taxa(divida.jurosMes) }), ' ao mês'] : [];
    return el('p', { classe: 'divida', dados: { divida: String(divida.valor) } }, ['Dívida ', el('b', { texto: F().moeda(divida.valor) }), ...juros]);
  }

  // A história da equipe, mês a mês (D-045): a opção, a carta e a conta de cada
  // mês. Carta grave aparece como as outras, sem destaque (arquitetura, seção 8).
  function blocoHistoria(historia) {
    const meses = lista(historia);
    if (meses.length === 0) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    return [
      el('h2', { classe: 'subtitulo', texto: 'A história da sua equipe' }),
      el('ol', { classe: 'historia' }, meses.map((h) => {
        const m = h.mes;
        const conta = m && Number.isFinite(m.saldoMes)
          ? el('p', { classe: 'historia-conta' }, [
            'Entrou ', moeda(m.entrou), ' · básico ', moeda(m.basico),
            m.juros > 0 ? [' · juros ', moeda(m.juros)] : null,
            m.saldoMes < 0 ? ' · faltou ' : ' · sobrou ', moeda(Math.abs(m.saldoMes)),
          ])
          : null;
        return el('li', { classe: 'historia-mes', dados: { rodada: h.rodadaId } }, [
          el('p', { classe: 'kicker', texto: h.titulo || '' }),
          el('p', {}, ['Decisão: ', el('b', { texto: h.opcao?.rotulo || '' })]),
          h.opcao?.narrativa ? el('blockquote', { classe: 'narrativa', texto: h.opcao.narrativa }) : null,
          el('p', {}, ['Carta: ', el('b', { texto: h.carta?.titulo || '' })]),
          h.carta?.narrativa ? el('blockquote', { classe: 'narrativa', texto: h.carta.narrativa }) : null,
          conta,
        ]);
      })),
    ];
  }

  function telaPersona(alvo, d) {
    const { el, acrescentar } = D();
    const persona = { ...(app.dados.conteudo?.personas?.[d.persona.id] || {}), ...d.persona };
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]),
      cabecalho('A persona da sua equipe', persona.nome || ''),
      el('p', { classe: 'texto', texto: persona.descricao || '' }),
      linhaFamilia(persona),
      detalheBasico(persona),
      el('h2', { classe: 'subtitulo', texto: 'Ponto de partida' }),
      listaIndicadores(d.indicadores),
      el('p', { classe: 'texto-2', texto: 'Nas rodadas, a equipe decide junto. Vale a opção mais votada.' }),
    ]));
    return 'persona';
  }

  function descreverDecisao(rodadaId, decisao, origem) {
    if (!decisao?.id) return '';
    const base = `${letraDe(rodadaId, decisao.id)} · ${decisao.rotulo || decisao.id}`;
    // "piloto automático" saiu das telas (D-041; rascunho, seção 7, item 14):
    // no ensaio, soava como a opção boa de quem não votou.
    const origens = { piloto: 'ninguém votou: ficou o de sempre', moeda: 'empate decidido na moeda', prorrogacao: 'decidida na prorrogação', apresentador: 'registrada pelo apresentador' };
    return origens[origem] ? `${base} (${origens[origem]})` : base;
  }

  function telaSituacao(alvo, d) {
    const { el, acrescentar } = D();
    const filhos = [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe), el('span', { classe: 'texto-2', texto: `· ${d.persona?.nome || ''}` })]),
      cabecalho(d.final ? 'Placar final' : 'Acompanhe a apresentação', d.final ? `A situação de ${d.persona?.nome || 'sua persona'}` : (d.titulo || `A situação de ${d.persona?.nome || 'sua persona'}`)),
      linhaFamilia(d.persona),
    ];
    if (d.final) {
      // No fim, a história dos meses substitui o "último mês" (D-045).
      filhos.push(blocoHistoria(d.historia), linhaDivida(d.divida));
    } else if (d.mes) {
      // A conta do mês primeiro: é o que a família sente (D-044). Depois, a
      // narrativa do último mês, em primeira pessoa (D-006). Carta grave: só o
      // texto, sem destaque nenhum (arquitetura, seção 8, "tema sensível").
      filhos.push(contaDoMes(d.mes, d.persona), linhaDivida(d.divida));
      filhos.push(el('div', { classe: 'mes', dados: { tom: d.mes.carta?.tom || 'normal' } }, [
        el('p', { classe: 'kicker', texto: `Último mês · ${d.mes.titulo || ''}` }),
        el('p', {}, ['Decisão: ', el('b', { texto: descreverDecisao(d.mes.rodada, d.mes.decisao, d.mes.origem) })]),
        el('p', {}, ['Carta: ', el('b', { texto: d.mes.carta?.titulo || '' })]),
        ...lista(d.narrativa).map((t) => el('blockquote', { classe: 'narrativa', texto: t })),
      ]));
    } else {
      filhos.push(linhaBasico(d.persona), linhaDivida(d.divida),
        el('p', { classe: 'texto-2', texto: 'Ainda não houve rodada: este é o ponto de partida.' }));
    }
    filhos.push(el('h2', { classe: 'subtitulo', texto: 'Indicadores' }), listaIndicadores(d.indicadores));
    if (d.final && N().historia.escolhaOuSorte(d.placar)) {
      // "Escolha ou sorte?", contada como história (D-041): os termos "piloto
      // automático", "efeito das decisões" e "sorte" como legenda saíram da tela,
      // porque confundiam no ensaio.
      // Os valores inteiros de historia.escolhaOuSorte fecham com o total: cada
      // um arredondado sozinho errava a soma por R$ 1 (revisão de 29/09). Como
      // no telão, os totais vão sem sinal de variação e as variações sempre com
      // + ou −, e o total do fim, com "=", em destaque (rascunho, seção 7, item 11).
      const c = N().historia.escolhaOuSorte(d.placar);
      const linhas = c ? [
        ['Se não mudassem nada', F().moeda(c.piloto)],
        ['As escolhas', F().variacao(c.escolhas)],
        ['A sorte', F().variacao(c.sorte)],
        ['= Terminaram com', F().moeda(c.total), 'placar-total'],
      ] : [];
      filhos.push(el('h2', { classe: 'subtitulo', texto: 'Escolha ou sorte?' }),
        el('dl', { classe: 'indicadores placar-historia' }, linhas.flatMap(([k, v, classe]) => [el('dt', { classe, texto: k }), el('dd', { classe, texto: v })])));
    }
    acrescentar(alvo, el('section', { classe: 'bloco' }, filhos));
    return 'situacao';
  }

  // ----- Decisão da equipe, com a contagem ao vivo (só da própria equipe)

  function telaDecisao(alvo, tipo, d) {
    const { el, botao, acrescentar } = D();
    const membro = app.dados.membros?.[app.uid] || {};
    const pendenteBase = { tipo: 'decisao', rodada: d.rodada.id, equipe: membro.equipe };
    const envio = app.envios.get(caminhoDe(pendenteBase));
    const enviando = emVoo(envio);
    const escolhido = enviando || envio?.estagio === 'guardado' ? envio.pendente.opcao : d.meuVoto;
    const opcoesDoConteudo = app.dados.conteudo?.rodadas?.[d.rodada.id]?.opcoes;
    const botoes = d.opcoes.map((op) => {
      const b = botao('', () => votar({ ...pendenteBase, opcao: op.id }), {
        classe: ['botao-opcao-aluno', enviando && escolhido === op.id ? 'enviando' : null],
        pressionado: escolhido === op.id, desabilitado: !d.podeVotar || enviando, dados: { opcao: op.id },
      });
      D().limpar(b);
      // A narrativa conta o dilema em primeira pessoa (D-043), e aparece só na
      // opção escolhida: com as quatro abertas, cada cartão tinha 5 ou 6 linhas,
      // e em 360×740 só a opção A aparecia antes de rolar (revisão de 29/09). A
      // tendência do config nunca aparece: a seta dizia qual era a opção "certa".
      const narrativa = escolhido === op.id && tem(opcoesDoConteudo, op.id) ? opcoesDoConteudo[op.id].narrativa : null;
      acrescentar(b, [
        el('b', { classe: 'opcao-letra', texto: letraDe(d.rodada.id, op.id) }),
        el('span', { classe: 'opcao-textos' }, [
          el('span', { classe: 'opcao-rotulo', texto: op.rotulo || op.id }),
          narrativa ? el('span', { classe: 'opcao-narrativa', texto: narrativa }) : null,
        ]),
        el('span', { classe: 'opcao-votos', texto: op.votos === 1 ? '1 voto' : `${op.votos} votos` }),
      ]);
      return b;
    });
    const motivos = {
      entrouDepois: 'Você entrou depois de esta decisão abrir: acompanhe a conversa. O seu voto vale na próxima.',
      pausado: 'Pausado pelo apresentador.',
    };
    const forcada = d.forcada ? `O apresentador registrou a decisão da equipe: ${letraDe(d.rodada.id, d.forcada)}.` : null;
    const s = d.situacao;
    const persona = s?.persona?.nome;
    // A ordem é o que se lê antes de votar: o aperto da casa no topo (D-043) e
    // as opções. O texto da rodada fica no telão: no celular, ele empurrava as
    // opções para baixo da dobra (revisão de 29/09). A situação completa fica fechada depois das opções,
    // para os botões de voto subirem na tela.
    const pressao = [linhaBasico(s?.persona), linhaDivida(s?.divida)].filter(Boolean);
    const aviso = botao('Mais opções abaixo ↓', () => rolarAteUltimaOpcao(), { classe: 'aviso-rolagem', dados: { avisoRolagem: '1' } });
    aviso.hidden = true;
    acrescentar(alvo, el('section', { classe: 'bloco', dados: { rodada: d.rodada.id } }, [
      cabecalho(tipo === 'prorrogacao' ? 'Empate na sua equipe · só as empatadas' : 'Decisão da equipe', tipo === 'prorrogacao' ? 'Empate: conversem' : d.rodada.titulo, { lado: cronometro(d) }),
      d.contexto ? el('div', { classe: 'contexto-familia', role: 'note' }, [
        el('p', { classe: 'contexto-rotulo', texto: `Na casa ${persona ? `de ${persona}` : 'da sua persona'}` }),
        el('p', { classe: 'contexto-texto', texto: d.contexto }),
      ]) : null,
      pressao.length > 0 ? el('div', { classe: 'pressao' }, pressao) : null,
      el('div', { classe: 'opcoes-aluno', role: 'group', 'aria-label': `Opções da rodada (${botoes.length})` }, botoes),
      nota(d.motivo ? motivos[d.motivo] : null),
      nota(forcada),
      nota(textoEnvio(envio, escolhido ? `Seu voto: ${letraDe(d.rodada.id, escolhido)} · registrado.` : null), envio?.estagio === 'recusado' ? 'erro' : 'info') || nota(app.ui.nota),
      el('p', { classe: 'texto-2', texto: `Os números são os votos da ${s?.equipe?.nome || 'sua equipe'}. Vale a mais votada; dá para mudar até o apresentador encerrar.` }),
      s ? el('details', { classe: 'situacao-resumo' }, [
        el('summary', { texto: `Situação de ${persona || 'sua persona'}` }),
        el('div', { classe: 'situacao-corpo' }, [linhaFamilia(s.persona), contaDoMes(s.mes, s.persona)]),
        listaIndicadores(s.indicadores),
      ]) : null,
      aviso,
    ]));
    return tipo;
  }

  // ----- A dobra da decisão: 4 opções com narrativa podem não caber em 360×740.
  //
  // A primeira opção sempre cabe; enquanto a última estiver abaixo da tela, o
  // aviso fixo "Mais opções abaixo" fica visível (um voto escondido atrás de
  // rolagem, sem aviso, some da conversa da equipe). Conferido a cada desenho,
  // rolagem e mudança de tamanho, sempre no DOM atual: a tela é remontada a
  // cada mudança de dados.
  function ultimaOpcao() {
    const opcoes = app.el.tela.querySelectorAll('.botao-opcao-aluno');
    return opcoes.length > 0 ? opcoes[opcoes.length - 1] : null;
  }

  function conferirDobra() {
    const aviso = app.el.tela?.querySelector('[data-aviso-rolagem]');
    if (!aviso) return;
    const ultima = ultimaOpcao();
    const escondida = Boolean(ultima) && ultima.getBoundingClientRect().bottom > raiz.innerHeight + 1;
    if (aviso.hidden === escondida) aviso.hidden = !escondida;
  }

  function rolarAteUltimaOpcao() {
    const ultima = ultimaOpcao();
    if (!ultima) return;
    const suave = !raiz.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ultima.scrollIntoView({ block: 'end', behavior: suave ? 'smooth' : 'auto' });
  }

  function telaSorteando(alvo, d) {
    const { el, acrescentar } = D();
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]),
      cabecalho(d.rodada?.titulo || 'Rodada', 'Sorteando…'),
      el('p', { classe: 'texto', texto: 'Olhe o telão: a decisão mudou o tamanho das fatias, e a sorte escolhe a fatia.' }),
      nota(app.ui.nota),
    ]));
    return 'sorteando';
  }

  function telaResultado(alvo, d) {
    const { el, acrescentar } = D();
    const grave = d.carta?.tom === 'grave';
    acrescentar(alvo, el('section', { classe: 'bloco', dados: { tom: grave ? 'grave' : 'normal', carta: d.carta?.id || '' } }, [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]),
      cabecalho(`${d.rodada?.titulo || 'Rodada'} · a carta da equipe`, d.carta?.titulo || ''),
      d.carta?.narrativa ? el('blockquote', { classe: 'narrativa', texto: d.carta.narrativa }) : null,
      el('p', {}, ['Decisão: ', el('b', { texto: descreverDecisao(d.rodada?.id, d.decisao, d.origem) })]),
      d.decisao?.narrativa ? el('blockquote', { classe: 'narrativa', texto: d.decisao.narrativa }) : null,
      contaDoMes(d.mes, personaDaEquipe(d.equipe?.id)),
      linhaDivida(d.divida),
      el('h2', { classe: 'subtitulo', texto: 'Como ficou' }),
      listaIndicadores(d.indicadores, d.delta),
    ]));
    return 'resultado';
  }

  function telaComparativo(alvo, d) {
    const { el, acrescentar } = D();
    const voto = (v) => (v ? rotuloVoto(v) : 'sem resposta');
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho(`Comparativo · ${d.enquete.titulo}`, 'Você antes e agora'),
      el('p', { classe: 'texto-2', texto: 'Só você vê esta tela. O telão mostra apenas os totais da turma.' }),
      el('ol', { classe: 'respostas' }, d.afirmacoes.map((a) => el('li', { classe: 'resposta', dados: { afirmacao: a.id } }, [
        el('p', { classe: 'resposta-texto', texto: a.texto }),
        el('p', { classe: 'resposta-voto' }, ['Você antes: ', el('b', { texto: voto(a.antes) }), ', agora: ', el('b', { texto: voto(a.depois) })]),
      ]))),
    ]));
    return 'comparativo';
  }

  function telaFim(alvo, d) {
    const { el, acrescentar } = D();
    const renda = app.dados.conteudo?.indicadores?.renda;
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      d.equipe ? el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]) : null,
      cabecalho(app.dados.conteudo?.titulo || 'Seminário da Viração', 'Obrigado pela participação'),
      d.placar && renda ? el('p', { classe: 'texto' }, [`${renda.nome} da sua equipe: `, el('b', { texto: F().indicador(renda, d.placar.renda) })]) : null,
      blocoHistoria(d.historia),
      el('p', { classe: 'texto-2', texto: 'Pode fechar esta página. Os votos individuais são apagados com a sala.' }),
    ]));
    return 'fim';
  }

  // ---------- Início ----------

  function iniciar() {
    const $ = (sel) => document.querySelector(sel);
    app.el = { tela: $('#tela'), cracha: $('#cracha'), faixaVersao: $('#faixa-versao'), faixaTelao: $('#faixa-telao'), selo: $('#lugar-selo') };
    app.selo = N().conexao.criarSelo();
    app.selo.definir('reconectando', 'Conectando…');
    // Escondido até existir um canal: na tela de entrada não há conexão ainda,
    // e "Conectando…" ali seria mentira.
    app.selo.elemento.hidden = true;
    app.el.selo.appendChild(app.selo.elemento);
    app.wake = N().conexao.criarWakeLock();

    app.embutido = NAVEGADOR_EMBUTIDO.test(raiz.navigator.userAgent || '');
    app.emulador = parametro('emulador') === '1' && ehMaquinaLocal();
    // ?lp=1 (rede restrita) fica lembrado no aparelho: o aluno que recarrega
    // pela aba, sem o QR, continua em long-polling.
    if (parametro('lp') === '1') gravarLocal('lp', true);
    if (parametro('lp') === '0') apagarLocal('lp');
    app.lp = lerLocal('lp') === true;

    const daUrl = normalizarSala(parametro('sala'));
    const guardada = normalizarSala(lerLocal('sala'));
    app.codigo = RE_SALA.test(daUrl) ? daUrl : RE_SALA.test(guardada) ? guardada : '';
    // Voltou de uma recarga pedida pela falha da CDN: entra direto na sala que
    // estava tentando, sem o aluno tocar em "Entrar" de novo.
    const aposRecarga = lerSessao('entrarAposRecarga');
    if (aposRecarga) gravarSessao('entrarAposRecarga', '');
    if (!app.embutido && RE_SALA.test(daUrl) && aposRecarga === daUrl) {
      entrarNaSala(daUrl);
      return;
    }

    N().conexao.aoVoltarAVista(aoVoltarAVista);
    setInterval(tique, 1000);
    raiz.addEventListener('scroll', conferirDobra, { passive: true });
    raiz.addEventListener('resize', conferirDobra);

    // Recarregar volta direto à sala (I6). Um QR novo, de outra sala, passa pela
    // tela de entrada: um toque em "Entrar".
    if (!app.embutido && RE_SALA.test(guardada) && (!RE_SALA.test(daUrl) || daUrl === guardada)) {
      entrarNaSala(guardada);
    } else {
      desenhar();
      // Já vai buscando o SDK enquanto o aluno confere o código.
      if (!app.embutido) prepararServico().catch(() => {});
    }
  }

  V.aluno = {
    versaoApp: VERSAO_APP,
    // Leitura para o e2e: nada aqui muda o estado.
    uid: () => app.uid,
    sala: () => app.sala,
    tela: () => (app.fase === 'sala' ? calcularTela() : { tipo: app.fase, dados: {} }),
    pendentes: () => (app.sala && app.uid ? lerPendentes() : {}),
    envios: () => resumoEnvios(),
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }
})(globalThis);
