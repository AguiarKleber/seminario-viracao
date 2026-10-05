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
  const VERSAO_APP = '7';
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
  // Escrita que falhou sem ser recusa da regra: o SDK não repete a escrita que
  // falhou, e o "guardado; será reenviado" ficava sem reenvio até recarregar a
  // página. O celular tenta de novo, poucas vezes, enquanto a etapa estiver aberta.
  const REENVIO_MS = 3000;
  const REENVIOS_MAX = 5;
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
    // aberta: a opção da decisão com a explicação à mostra (D-055); rolarAte: a
    // que acabou de ser aberta e ainda precisa rolar para a vista.
    // recolhidos: os detalhes recolhidos que o aluno abriu nesta tela (D-065),
    // para um redesenho (a contagem das equipes, um voto) não fechá-los na mão dele.
    ui: { foco: null, chavePasso: null, nota: null, aberta: null, rolarAte: null, recolhidos: new Set() },
    selo: null, wake: null, querAceso: false, chaveDesenho: null, repetirTimer: 0,
    // D-064: o modo espectador, o celular do apresentador. null fora dele;
    // dentro, { equipe, pin }: a equipe cuja tela ele vê e o PIN, só em memória
    // (nunca no aparelho), para gravar o pedido de novo depois de uma queda (o
    // servidor apaga o pedido quando a conexão cai: apagarAoDesconectar).
    // pedindoPin: a tela de entrada com o campo do PIN aberto.
    // pedidoGravado: o PIN pode estar em pedidosAnfitriao/{uid} (marcado antes
    // da gravação, e não depois da prova): é ele, e não o app.espectador, que
    // diz se há o que apagar ao sair, ao fechar a aba e quando a prova falha.
    espectador: null, pedindoPin: false, pedidoGravado: false,
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
  const caminhoDoPedido = () => `pedidosAnfitriao/${app.uid}`;
  // A sala foi encerrada: a meta já chegou uma vez e sumiu.
  const salaSumiu = () => app.recebido.meta && !app.dados.meta;
  // O PIN tem o tamanho que a regra aceita em pedidosAnfitriao (8 a 32).
  const pinNoFormato = (pin) => typeof pin === 'string' && pin.length >= 8 && pin.length <= 32;
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
  // Esquema v3 (D-060): quantos meses cada rodada cobre, e como a tela chama o
  // período. Com 6 rodadas bimestrais, "o saldo do mês" vira "o saldo do
  // bimestre", e o resumo, "por bimestre". A regra é a do historia.js (a mesma
  // do telão); sem ele, o mês de sempre.
  const PERIODO_MES = { meses: 1, nome: 'mês', noPeriodo: 'no mês', doPeriodo: 'do mês' };
  const periodo = () => N().historia?.periodo?.(app.dados.conteudo) || PERIODO_MES;
  const maiuscula = (texto) => texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
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
  function agendarRecarga(sala, entrar = true) {
    const ultima = Number(lerSessao('recarregouEm')) || 0;
    const espera = Math.max(1500, ultima + RECARGA_MIN_MS - Date.now());
    clearTimeout(app.repetirTimer);
    app.repetirTimer = setTimeout(() => recarregarPara(sala, entrar), espera);
  }

  // entrar = false: a página volta à tela de entrada, e não à sala. É o caso do
  // espectador (D-064): entrar direto o registraria como aluno (membro), e o
  // PIN, que só existe em memória, não sobrevive à recarga.
  function recarregarPara(sala, entrar = true) {
    if (RE_SALA.test(String(sala))) {
      if (entrar) gravarSessao('entrarAposRecarga', sala);
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
        if (app.espectador) reafirmarPedido();
        // Caiu no meio da entrada do espectador, entre o "apague ao cair" e a
        // prova: o servidor executou o apagamento e o esqueceu, e o SDK reenvia
        // a gravação do pedido nesta conexão nova. Sem registrar de novo, o
        // pedido ficaria sem quem o apague se a aba fechasse em seguida.
        else if (app.pedidoGravado) app.canal.apagarAoDesconectar(caminhoDoPedido()).catch(() => {});
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
    // A página voltou do cache do navegador depois de um pagehide, que apagou
    // o pedido do espectador: sem ele, a contagem da equipe não chega.
    if (app.espectador && !app.pedidoGravado) reafirmarPedido();
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
    // O cinto do achado 1 (revisão da F7): com o campo do PIN aberto, ou no
    // modo espectador, nada entra como aluno. Só o "Voltar" da tela do
    // espectador (e o "Sair do modo espectador") leva à entrada comum.
    if (app.embutido || app.pedindoPin || app.espectador || !RE_SALA.test(sala)) return;
    // Quem entra como aluno deixa de ser o espectador desta aba: com a marca,
    // toda recarga caía no campo do PIN e não voltava à sala (I6), e o voto
    // guardado no aparelho não era reenviado (revisão do voto da F6b).
    gravarSessao('espectador', '');
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

  function mostrarErroServico(erro, repetir, { espectador = false } = {}) {
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
      // O espectador volta ao campo do PIN desta sala, e não à entrada comum,
      // onde uma sala de aluno guardada no aparelho entraria direto como aluno.
      if (espectador) gravarSessao('espectador', sala);
      explicacao = `Não foi possível baixar o app do servidor (${String(erro?.message || erro)}). A página recarrega sozinha em instantes para tentar de novo.`;
      app.erro = { titulo, texto: explicacao, repetir: () => recarregarPara(sala, !espectador) };
      agendarRecarga(sala, !espectador);
    } else {
      app.erro = { titulo, texto: explicacao, repetir };
      if (repetir) app.repetirTimer = setTimeout(repetir, REPETIR_SERVICO_MS);
    }
    desenhar();
  }

  // ---------- Modo espectador (D-064) ----------
  //
  // O celular do apresentador vê a tela de qualquer equipe, exatamente como o
  // aluno daquela equipe vê (a mesma telaDoAluno, com um membro virtual), e
  // nunca vira membro: não grava membros/{uid} nem presença, não vota, não
  // entra no "N de M" e nunca grava meta/hostUid (não assume a sala). O PIN vai
  // para pedidosAnfitriao/{uid}, e as regras v4 dão a quem tem o PIN certo a
  // leitura de decisoes/{r}/{equipe} (a contagem ao vivo, que nas regras v3 só
  // a própria equipe lia). O resto que o celular lê já é aberto a quem tem login.
  async function entrarComoEspectador(sala, pin) {
    if (app.embutido || !RE_SALA.test(sala)) return;
    if (!pinNoFormato(pin)) {
      app.aviso = 'O PIN do apresentador tem de 8 a 32 caracteres.';
      desenhar();
      return;
    }
    clearTimeout(app.repetirTimer);
    app.sala = sala;
    app.fase = 'conectando';
    app.aviso = null;
    desenhar();
    let meta;
    let jaMembro = false;
    try {
      const canal = await obterCanal();
      app.uid = await comLimite(canal.entrar(), ESPERA_SERVICO_MS, 'sem resposta do login');
      meta = await canal.ler(cam('meta'));
      // Revisão da F6b (achado 16): um aparelho que já é membro desta sala não
      // vira espectador. O registro dele continuaria contando no "N de M" da
      // equipe (o espectador nunca manda presença nem vota), e o celular não
      // apaga o próprio membro: depois da trava das equipes, a regra nem
      // deixaria, e quem tira um aluno da sala é o apresentador, pelo telão.
      jaMembro = Boolean(meta) && (await comLimite(canal.ler(cam('membros', app.uid)), ESPERA_SERVICO_MS, 'sem resposta do serviço')) != null;
      if (meta && !jaMembro) {
        // O "apague ao cair" vem ANTES da gravação, e espera a confirmação: o
        // servidor trata os pedidos de uma conexão em ordem, então não há
        // instante em que o pedido esteja no banco sem ele. Registrado depois
        // da prova, um pedido gravado sobrevivia a uma prova sem resposta e
        // dava ao uid anônimo deste navegador um PIN_OK permanente (revisão da
        // F7, achado 2; revisão da F6b, achado 15).
        await comLimite(canal.apagarAoDesconectar(caminhoDoPedido()), ESPERA_SERVICO_MS, 'sem resposta do serviço');
        app.pedidoGravado = true;
        await comLimite(canal.gravar({ [caminhoDoPedido()]: pin }), ESPERA_SERVICO_MS, 'sem resposta do serviço');
        // A prova do PIN: a decisão de uma equipe só se lê com ele (para quem
        // não é da equipe, e nenhum aparelho é da equipe "_pin"). A gravação do
        // pedido passa com qualquer texto de 8 a 32 caracteres.
        await comLimite(canal.ler(cam('decisoes', '_pin', '_pin')), ESPERA_SERVICO_MS, 'sem resposta do serviço');
      }
    } catch (erro) {
      // Recusa ou não, o pedido não fica no banco. Falha que não é recusa
      // (rede, tempo-limite expirado): ele pode ter sido gravado, e sai já. A
      // tela de erro tenta de novo sozinha, e a nova tentativa grava outra vez.
      apagarPedido();
      if (recusado(erro)) {
        // PIN errado: a tela volta ao campo do PIN.
        Object.assign(app, { fase: 'entrada', pedindoPin: true, sala: null, aviso: 'O PIN não confere com o cadastrado no console. Confira e tente de novo.' });
        desenhar();
        return;
      }
      mostrarErroServico(erro, () => entrarComoEspectador(sala, pin), { espectador: true });
      return;
    }
    if (!meta) {
      Object.assign(app, { fase: 'entrada', sala: null, aviso: `Não há sala com o código ${sala}. Confira o código no telão.` });
      desenhar();
      return;
    }
    if (jaMembro) {
      Object.assign(app, { fase: 'entrada', pedindoPin: true, sala: null, aviso: 'Este aparelho já entrou como aluno nesta sala e conta na equipe dele. Use outro aparelho para espiar as equipes.' });
      desenhar();
      return;
    }
    // A equipe vem com o conteúdo, que chega pelos ouvintes ligados logo
    // abaixo (equipeInicial, em aoMudarDados).
    app.espectador = { equipe: null, pin };
    app.pedindoPin = false;
    // O "apague ao cair" já está registrado (acima, antes da gravação): se o
    // aparelho cair ou a aba fechar, o servidor apaga o pedido. Na volta da
    // conexão, reafirmarPedido o registra e grava de novo.
    // Recarregar a página volta ao campo do PIN desta sala, e nunca entra como
    // aluno: a sala guardada no aparelho (a de aluno) sai, e a marca fica só na
    // aba (sessionStorage), sem o PIN.
    apagarLocal('sala');
    gravarSessao('espectador', sala);
    const busca = new URLSearchParams(raiz.location.search);
    busca.set('sala', sala);
    try { raiz.history.replaceState(null, '', `${raiz.location.pathname}?${busca}`); } catch { /* só conveniência */ }
    app.fase = 'sala';
    ligarOuvintes();
    desenhar();
  }

  // Depois de uma queda, o pedido foi apagado pelo servidor (apagarAoDesconectar):
  // sem ele, a contagem da equipe deixa de chegar (o ouvinte recusado religa
  // sozinho, com espera, e passa assim que o pedido volta). A mesma ordem da
  // entrada: o "apague ao cair" antes da gravação. Com a sala encerrada (a meta
  // sumiu), o pedido não volta: não há mais o que espiar.
  function reafirmarPedido() {
    if (!app.espectador || !app.canal || !app.uid || salaSumiu()) return;
    const caminho = caminhoDoPedido();
    const espectador = app.espectador;
    app.canal.apagarAoDesconectar(caminho)
      .then(() => {
        // Saiu do modo enquanto o servidor confirmava: nada a gravar. Nem com
        // a sala encerrada nesse meio-tempo: na reconexão, o SDK reenvia as
        // escutas antes de avisar .info/connected, a meta nula chega antes
        // desta confirmação, e aoMudarDados já apagou o pedido. Sem esta
        // conferência, o PIN_OK voltava ao banco com o celular na tela "sala
        // encerrada" (revisão do voto da F6b, achado 2).
        if (app.espectador !== espectador || salaSumiu()) return undefined;
        app.pedidoGravado = true;
        return app.canal.gravar({ [caminho]: espectador.pin });
      })
      .catch(() => {});
  }

  // Apaga o próprio pedido, se ele pode estar no banco: ao sair do modo
  // espectador, quando a prova do PIN falha ou o tempo-limite dela expira, ao
  // fechar a aba (pagehide) e quando a sala é encerrada. Sem rede, a escrita
  // fica na fila do SDK e sai quando a conexão volta; se a aba fechar antes
  // disso, quem apaga é o servidor, pelo "apague ao cair" registrado antes da
  // gravação (o risco que sobra está no docs/contratos.md, seção 10).
  function apagarPedido() {
    if (!app.pedidoGravado) return;
    app.pedidoGravado = false;
    if (app.canal && app.uid) app.canal.gravar({ [caminhoDoPedido()]: null }).catch(() => {});
  }

  // A equipe que o espectador vê ao entrar: a primeira aberta, na ordem do
  // conteúdo (antes de o apresentador abrir e fechar equipes, a primeira).
  // E quando o apresentador fecha a equipe vista, a primeira aberta de novo:
  // o espectador que entrou no lobby (equipesAbertas ainda não existe) ficava
  // na e1 fechada, com "Aguardando uma equipe" e o botão dela apagado no
  // seletor, até alguém notar (revisão do voto da F6b, achado 3). Sem equipe
  // aberta nenhuma, fica onde está.
  function equipeInicial() {
    if (!app.espectador || !app.dados.conteudo) return;
    const abertas = app.dados.estado?.equipesAbertas;
    const aberta = (id) => !abertas || abertas[id] === true;
    const atual = app.espectador.equipe;
    if (atual && aberta(atual)) return;
    const ordem = ordemDe(app.dados.conteudo, 'equipes');
    const primeira = ordem.find(aberta);
    if (atual) {
      if (!primeira) return;
      Object.assign(app.ui, { aberta: null, rolarAte: null, nota: null });
      app.ui.recolhidos.clear();
    }
    app.espectador.equipe = primeira ?? ordem[0] ?? null;
  }

  // O seletor de equipe do espectador: a tela passa a ser a de um aluno da
  // equipe escolhida, e o ouvinte da decisão troca de equipe (religarEquipe).
  function verEquipe(equipeId) {
    if (!app.espectador || app.espectador.equipe === equipeId) return;
    app.espectador.equipe = equipeId;
    Object.assign(app.ui, { aberta: null, rolarAte: null, nota: null });
    app.ui.recolhidos.clear();
    aoMudarDados();
  }

  // O registro de membro que a tela usa: o do servidor, ou, no modo espectador,
  // um membro virtual da equipe escolhida, que nunca vai para o banco. O
  // entrouEm não conta: a telaDoAluno dá o motivo "espectador" antes de olhar.
  function membroDaTela() {
    if (app.espectador) return app.espectador.equipe ? { equipe: app.espectador.equipe, entrouEm: 0 } : null;
    return tem(app.dados.membros, app.uid) ? app.dados.membros[app.uid] : null;
  }

  // O registro de membro: grava membros/{uid} (sem equipe) com a hora do
  // servidor. Nunca regrava um membro que já existe: um entrouEm novo tiraria o
  // voto da decisão aberta (a regra só aceita quem entrou antes da abertura).
  async function garantirMembro() {
    // O espectador nunca vira membro (D-064): não aparece no "N de M" do telão.
    if (app.espectador) return;
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
  // aoRecusar: chamado a cada recusa, antes da nova tentativa.
  function ouvinteResistente(caminho, cb, aoRecusar = null) {
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
        if (aoRecusar) aoRecusar();
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
    // O apresentador apagou a sala: o espectador não tem mais o que ver, e o
    // PIN_OK não fica no banco à espera de ele tocar em "Entrar em outra sala".
    if (app.espectador && salaSumiu()) apagarPedido();
    garantirMembro();
    equipeInicial();
    const e = app.dados.estado;
    const chavePasso = e ? `${e.indice}|${e.subfase}|${e.afirmacao || ''}` : null;
    if (chavePasso !== app.ui.chavePasso) {
      app.ui.chavePasso = chavePasso;
      app.ui.foco = null;
      app.ui.nota = null;
      // A prorrogação e a rodada seguinte começam com tudo fechado.
      app.ui.aberta = null;
      app.ui.rolarAte = null;
      app.ui.recolhidos.clear();
    }
    // O aviso de "movido de equipe" vale até a rodada acabar (a prorrogação é a
    // mesma rodada).
    if (app.ui.movido && !(e?.tipo === 'rodada' && e.rodada === app.ui.movido.rodada)) app.ui.movido = null;
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
    const membro = app.espectador ? membroDaTela() : app.membroConfirmado ? app.dados.membros?.[app.uid] : null;
    const chave = e?.tipo === 'rodada' && membro?.equipe ? `${e.rodada}|${membro.equipe}` : null;
    if (chave === app.chaveEquipe) return;
    avisarSeMovido(app.chaveEquipe, chave, e);
    app.chaveEquipe = chave;
    if (app.desligarEquipe) app.desligarEquipe();
    app.desligarEquipe = null;
    app.dados.decisoes = null;
    if (!chave) return;
    // O espectador lê a decisão pelo PIN (regras v4): recusada, o pedido pode
    // ter sido apagado por um apagarAoDesconectar atrasado (a página recarregada
    // e religada depressa), e ele é gravado de novo antes de a leitura religar.
    app.desligarEquipe = ouvinteResistente(cam('decisoes', e.rodada, membro.equipe), (v) => {
      app.dados.decisoes = v;
      desenhar();
    }, app.espectador ? reafirmarPedido : null);
  }

  // Revisão de 30/09 (achado P1): o apresentador moveu o aparelho de equipe com
  // a decisão aberta, depois de o aluno votar. O voto da equipe anterior deixa
  // de valer (a apuração conta só quem é da equipe: anfitrião, votosDaEquipe),
  // e a tela redesenhava a decisão da equipe nova sem voto marcado e sem uma
  // palavra: só o crachá mudava. Chamado antes de trocar o ouvinte, com as
  // decisões da equipe anterior ainda em app.dados.decisoes.
  function avisarSeMovido(chaveAntiga, chaveNova, e) {
    // O espectador troca de equipe pelo seletor, e não tem voto a perder.
    if (app.espectador) return;
    if (!chaveAntiga || !chaveNova || !['decidindo', 'prorrogacao'].includes(e?.subfase)) return;
    const [rodadaAntiga, equipeAntiga] = chaveAntiga.split('|');
    const [rodadaNova, equipeNova] = chaveNova.split('|');
    if (rodadaAntiga !== rodadaNova || equipeAntiga === equipeNova) return;
    const envio = app.envios.get(cam('decisoes', rodadaAntiga, equipeAntiga, app.uid));
    const votou = typeof app.dados.decisoes?.[app.uid] === 'string' || emVoo(envio) || guardadoNoAparelho(envio) || envio?.estagio === 'registrado';
    if (!votou) return;
    app.ui.movido = { rodada: rodadaNova, de: equipeAntiga, para: equipeNova };
    // O aviso "Vote de novo" vai dentro da opção aberta, junto do botão, e tem
    // de ficar à vista: com um contexto da família mais longo no topo (a
    // fixture de 6 rodadas da matriz de votos, esquema v3), ele caía 5 px abaixo
    // da tela de 360×740, e a tela não rolava, porque só abrir uma opção rola.
    if (app.ui.aberta) app.ui.rolarAte = app.ui.aberta;
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
    // Os votos ainda não lidos do servidor. Sem isso, um celular recarregado
    // no meio da sessão (que perde os votos guardados na memória) abria o
    // comparativo mostrando "você antes: sem resposta" até a leitura chegar,
    // uma fração de segundo depois: o aluno via a própria resposta sumir.
    app.votosLendo = new Set(alvos.map(([enq, m, a]) => `${enq}|${m}|${a}`));
    // Teto de 4 s para o "carregando…": no e2e, o ouvinte de um voto que não
    // existe (quem não votou no "depois") às vezes não devolve o vazio num
    // celular recarregado, e a tela ficava presa em "carregando…". Passado o
    // teto, ausência vira "sem resposta", como era antes; voto que existe chega
    // em milissegundos e aparece normalmente.
    setTimeout(() => {
      if (app.chaveVotos !== chave || app.votosLendo.size === 0) return;
      app.votosLendo.clear();
      desenhar();
    }, 4000);
    for (const [enq, m, a] of alvos) {
      app.desligarVotos.push(ouvinteResistente(cam('votosEnquete', enq, m, a, app.uid), (v) => {
        app.votosLendo.delete(`${enq}|${m}|${a}`);
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
  // Guardado no aparelho, esperando a rede ('guardado') ou o apresentador
  // retomar a votação pausada ('esperaRetomar'): a tela marca a opção, mas a
  // contagem da equipe fica com o que o servidor confirmou.
  const guardadoNoAparelho = (envio) => Boolean(envio) && (envio.estagio === 'guardado' || envio.estagio === 'esperaRetomar');
  // O que o motivoDaRecusa precisa saber de agora, além do pendente.
  const contextoDaRecusa = (envio) => ({
    estado: app.dados.estado, membro: app.dados.membros?.[app.uid] ?? null,
    anterior: envio.anterior ?? null, entradaAberta: app.dados.meta?.entradaAberta !== false,
  });

  // O valor que o servidor já confirmou para uma folha. O SDK aplica a escrita
  // no cache local antes da confirmação, e o ouvinte avisa na hora: sem este
  // cuidado, a tela avançaria (e mostraria o voto como feito) sem o servidor
  // ter aceitado nada.
  function confirmadoAntes(p) {
    if (p.tipo === 'enquete') return app.votosServidor[p.enquete]?.[p.momento]?.[p.afirmacao] ?? null;
    return app.dados.decisoes?.[app.uid] ?? null;
  }

  function votar(escolha) {
    // O espectador não vota (D-064): o botão já vem apagado, e isto é o cinto.
    if (app.espectador) return;
    // A janela em que o voto foi dado: depois de recarregar, o reenvio só vale
    // nela (pendenteAindaVale), e não numa reabertura da mesma etapa (D-037).
    const pendente = { ...escolha, abertoEm: app.dados.estado?.abertoEm };
    const caminho = caminhoDe(pendente);
    if (emVoo(app.envios.get(caminho))) return; // botão desabilitado enquanto envia
    // 1. Primeiro no aparelho: se a página cair agora, o voto não se perde.
    guardarPendente(caminho, pendente);
    enviar(caminho, pendente);
  }

  function enviar(caminho, pendente, tentativa = 1) {
    const antigo = app.envios.get(caminho);
    if (antigo) {
      for (const t of antigo.timers) clearTimeout(t);
      clearTimeout(antigo.reenvio);
    }
    // criadoEm: uma recusa anterior a este envio já foi vista pelo aluno quando
    // este chega (recusaDaEtapa). Um envio que só repete o mesmo voto (o
    // reenvio, o retomar da pausa) herda a hora do primeiro.
    const repete = Boolean(antigo) && valorDe(antigo.pendente) === valorDe(pendente);
    const envio = {
      pendente, estagio: 'enviando', anterior: emVoo(antigo) || antigo?.estagio === 'esperaRetomar' ? antigo.anterior : confirmadoAntes(pendente),
      timers: [], reenvio: 0, criadoEm: repete ? antigo.criadoEm : Date.now(),
    };
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
        marcarRecusasVistas(envio);
      } else app.ui.nota = null;
    }, async (erro) => {
      if (app.envios.get(caminho) !== envio) return;
      if (recusado(erro)) {
        // 5. Recusa da regra: o app nunca finge que contou, e nunca fica calado.
        // O motivo sai do estado de agora, na hora do desenho (recusaParaTela):
        // junto do botão tocado, na nota e nas telas seguintes desta etapa
        // (recusaDaEtapa). No teste de 30/09, a única pista era uma nota fixa
        // embaixo da lista, fora da tela, e o "Votar nesta" ficava igual.
        const pausada = await pausadaNoServidor(pendente);
        if (app.envios.get(caminho) !== envio) return;
        if (pausada) {
          // Revisão de 30/09 (achado 6): o voto em trânsito quando o
          // apresentador apertou P era apagado do aparelho, e o aluno tinha de
          // notar, depois da retomada, que precisava votar de novo. O voto
          // recarregado com a votação pausada já ficava guardado e ia sozinho
          // (talvezReenviar): agora o em trânsito faz o mesmo.
          envio.estagio = 'esperaRetomar';
          return;
        }
        envio.estagio = 'recusado';
        envio.recusadoEm = Date.now();
        removerPendente(caminho);
        // A explicação entra na opção aberta, que rola para a vista.
        if (pendente.tipo === 'decisao' && app.ui.aberta === pendente.opcao) app.ui.rolarAte = pendente.opcao;
      } else if (tentativa < REENVIOS_MAX) {
        envio.estagio = 'guardado';
        envio.reenvio = setTimeout(() => reenviarSeVale(caminho, envio, tentativa + 1), REENVIO_MS);
      } else {
        // Revisão de 30/09 (achado 5): depois da última tentativa, a tela dizia
        // "guardado: será reenviado" para sempre, e nada mais reenviava (o SDK
        // não repete a escrita que falhou). O botão volta a valer, e a tela diz
        // para tocar de novo. O pendente fica no aparelho: recarregar reenvia.
        envio.estagio = 'falhou';
        // O aviso cresce junto do botão e podia passar da borda de baixo de
        // 360×740 (16 px fora, no mês 1 da matriz de votos de 01/10, depois de
        // uma recarga): como na recusa, a opção aberta rola para a vista.
        if (pendente.tipo === 'decisao' && app.ui.aberta === pendente.opcao) app.ui.rolarAte = pendente.opcao;
      }
    }).finally(() => {
      for (const t of envio.timers) clearTimeout(t);
      desenhar();
    });
  }

  // A votação do pendente está pausada, pelo estado lido agora do servidor. O
  // celular que volta da rede recebe a recusa do voto guardado e o estado novo
  // (pausado) quase juntos, em qualquer ordem: pelo estado em memória, a recusa
  // podia ser julgada pelo estado de antes da pausa, e o voto se perdia.
  async function pausadaNoServidor(pendente) {
    let estado = app.dados.estado;
    try {
      estado = (await app.canal.ler(cam('estado'))) ?? estado;
    } catch { /* fica o estado em memória */ }
    return L().pendenteAindaVale(pendente, estado) && typeof estado.restanteMs === 'number';
  }

  // O reenvio da escrita que falhou sem recusa da regra. Com a etapa fechada
  // nesse meio-tempo, o voto não chegou a tempo: a tela diz, como numa recusa.
  function reenviarSeVale(caminho, envio, tentativa) {
    if (app.envios.get(caminho) !== envio) return;
    if (L().pendenteAindaVale(envio.pendente, app.dados.estado)) {
      enviar(caminho, envio.pendente, tentativa);
      return;
    }
    envio.estagio = 'recusado';
    envio.recusadoEm = Date.now();
    removerPendente(caminho);
    desenhar();
  }

  // Depois de recarregar: o pendente cuja etapa continua aberta é reenviado
  // (a chave é a mesma, então não duplica). O que já não vale é descartado, e o
  // aluno fica sabendo. O mesmo para o voto recusado pela pausa, que esperava o
  // apresentador retomar (esperaRetomar).
  function talvezReenviar() {
    const e = app.dados.estado;
    if (app.espectador || !app.membroConfirmado || !e) return;
    for (const [caminho, p] of Object.entries(lerPendentes())) {
      const atual = app.envios.get(caminho);
      const esperando = atual?.estagio === 'esperaRetomar';
      if (atual && !esperando) continue;
      if (L().pendenteAindaVale(p, e)) {
        // Pausada, a regra recusaria (sem prazo), e o voto guardado se perderia
        // com a mensagem de "fechou". Fica no aparelho até o apresentador
        // retomar: o retomar muda o estado, e esta função roda de novo.
        if (typeof e.restanteMs === 'number') continue;
        if (!esperando) {
          if (app.reenviados.has(caminho)) continue;
          app.reenviados.add(caminho);
        }
        enviar(caminho, p);
      } else if (esperando) {
        // A votação fechou durante a pausa: o voto não foi contado, e a tela diz
        // (recusaParaTela, com o motivo de agora).
        removerPendente(caminho);
        atual.estagio = 'recusado';
        atual.recusadoEm = Date.now();
      } else {
        removerPendente(caminho);
        app.ui.nota = 'Um voto guardado no aparelho não chegou a tempo: aquela votação já tinha fechado.';
      }
    }
  }

  // Revisão de 30/09 (achado P3): a recusa de uma afirmação anterior do mesmo
  // momento aparece nas telas seguintes (recusaDaEtapa) até o aluno responder
  // outra afirmação DEPOIS de vê-la. Sem isto, a tela "Registrado" mostrava em
  // vermelho "não foi contado" logo acima das respostas que contaram.
  function marcarRecusasVistas(confirmado) {
    const c = confirmado.pendente;
    for (const envio of app.envios.values()) {
      const p = envio.pendente;
      if (envio.estagio !== 'recusado' || p.tipo !== 'enquete' || p.enquete !== c.enquete || p.momento !== c.momento || p.afirmacao === c.afirmacao) continue;
      if (envio.recusadoEm < confirmado.criadoEm) envio.vista = true;
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
      } else if (guardadoNoAparelho(envio)) folha[p.afirmacao] = p.valor;
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
    if (!emVoo(envio) && !guardadoNoAparelho(envio)) return d;
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
    const membro = membroDaTela();
    return L().telaDoAluno({
      conteudo: d.conteudo, estado: d.estado, membro, membros: d.membros, espectador: Boolean(app.espectador),
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
      app.fase, app.aviso, app.erro?.titulo, app.erro?.texto, app.embutido, tela, app.ui.foco, app.ui.nota, app.ui.aberta, app.ui.movido,
      // A recusa já vista some da tela (marcarRecusasVistas) sem mudar o estágio.
      [...app.envios.values()].filter((x) => x.vista).length,
      resumoEnvios(), app.trocandoEquipe, app.fase === 'sala' ? contagemEquipes() : null,
      // Os votos ainda em leitura entram na chave: o "carregando…" do
      // comparativo só vira "sem resposta" com um redesenho, e a chegada de um
      // voto vazio não muda nenhum outro dado da tela (a tela ficava presa).
      [...(app.votosLendo || [])].sort(),
      app.espectador?.equipe ?? null, app.pedindoPin,
    ]);
    desenharCracha();
    desenharBarraEspectador();
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
      // O espectador sai por aqui, no fim de toda tela: o seletor de equipe,
      // no topo, fica só com as equipes (cabe em 360 px sem apertar o toque).
      if (app.fase === 'sala' && app.espectador) {
        D().acrescentar(alvo, D().botao('Sair do modo espectador', () => voltarParaEntrada(), { classe: 'botao-largo botao-sair-espectador', dados: { acao: 'sair-espectador' } }));
      }
      document.body.dataset.tela = tipo;
      aplicarWakeLock(TELAS_ACESAS.has(tipo));
      // De novo depois do layout: a altura das opções só existe quando o
      // navegador pinta a tela nova. A opção recém-aberta rola para a vista
      // antes da conferência da dobra.
      raiz.requestAnimationFrame?.(() => {
        rolarParaAberta();
        conferirDobra();
      });
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
    const chave = app.fase === 'sala' && app.uid ? `${app.uid}|${equipe?.id || ''}|${app.espectador ? 'espectador' : ''}` : '';
    if (alvo.dataset.chave === chave) return;
    alvo.dataset.chave = chave;
    const { limpar, acrescentar, el } = D();
    limpar(alvo);
    if (!chave) return;
    // D-064: no lugar do crachá, o selo do modo espectador (o espectador não é
    // aluno: não tem crachá, e o apresentador não o acha no "Mover aluno").
    if (app.espectador) {
      acrescentar(alvo, el('b', { classe: 'selo-espectador', dados: { espectador: '1' }, texto: 'modo espectador' }));
      return;
    }
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
    if (app.fase !== 'sala' || !(app.membroConfirmado || app.espectador) || !d.estado || typeof d.pulso !== 'number') return false;
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
      if (ev.key !== 'Enter') return;
      // Na tela do modo espectador, o mesmo campo serve ao apresentador, e o
      // Enter (o "Ir" do teclado do celular) é o gesto de passar ao PIN. Antes
      // ele chamava entrarNaSala: o celular do apresentador virava membro,
      // entrava no "N de M" de uma equipe na trava e, recarregado, voltava
      // direto como aluno (revisão da F7, achado 1).
      if (app.pedindoPin) {
        ev.preventDefault();
        document.getElementById('pin-espectador')?.focus();
        return;
      }
      if (!entrar.disabled) entrarNaSala(normalizarSala(campo.value));
    });
    const filhos = [
      cabecalho('Seminário da Viração', 'Entrar na sala'),
      el('label', { for: 'codigo-sala', classe: 'rotulo', texto: 'Código da sala' }),
      campo,
      el('p', { id: 'dica-codigo', classe: 'texto-2', texto: 'As 4 letras e números que aparecem no telão.' }),
    ];
    if (app.embutido) filhos.push(blocoNavegadorEmbutido());
    if (app.pedindoPin && !app.embutido) {
      acrescentar(alvo, el('section', { classe: 'bloco', dados: { espectador: '1' } }, [
        cabecalho('Seminário da Viração', 'Modo espectador'),
        el('p', { classe: 'texto-2', texto: 'Para o apresentador: com o PIN, este celular mostra a tela de qualquer equipe, como o aluno vê. Ele não vota e não entra na contagem.' }),
        ...filhos.slice(1),
        ...camposDoEspectador(campo),
      ]));
      return 'entrada';
    }
    filhos.push(nota(app.aviso, 'erro'), entrar,
      el('p', { classe: 'privacidade', texto: 'Sem nome e sem cadastro: o celular recebe só um crachá curto, como "Laranja · K7Q".' }));
    // D-064: discreto, depois de tudo: o aluno não tem o que fazer aqui.
    if (!app.embutido) {
      filhos.push(botao('Sou apresentador', () => {
        app.pedindoPin = true;
        app.aviso = null;
        desenhar();
      }, { classe: 'botao-discreto', dados: { acao: 'sou-apresentador' } }));
    }
    acrescentar(alvo, el('section', { classe: 'bloco' }, filhos));
    return 'entrada';
  }

  // O campo do PIN (de senha; o valor vai direto para a entrada, e dali só para
  // a memória: nunca para o aparelho) e os botões do modo espectador.
  function camposDoEspectador(campoSala) {
    const { el, botao } = D();
    const pin = el('input', {
      id: 'pin-espectador', classe: 'campo-pin', type: 'password', autocomplete: 'off', autocapitalize: 'off',
      spellcheck: 'false', maxlength: '32', 'aria-describedby': 'dica-pin',
    });
    const ver = () => {
      const valor = pin.value;
      pin.value = '';
      entrarComoEspectador(normalizarSala(campoSala.value), valor);
    };
    pin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ver(); });
    return [
      el('label', { for: 'pin-espectador', classe: 'rotulo', texto: 'PIN do apresentador' }),
      pin,
      el('p', { id: 'dica-pin', classe: 'texto-2', texto: 'O mesmo PIN do telão.' }),
      nota(app.aviso, 'erro'),
      botao('Ver as equipes', ver, { classe: 'botao-primario botao-largo', dados: { acao: 'entrar-espectador' } }),
      botao('Voltar', () => {
        // A marca da aba sai junto: deixada aqui, ela fazia a próxima recarga
        // voltar ao campo do PIN mesmo depois de o aparelho entrar como aluno.
        gravarSessao('espectador', '');
        app.pedindoPin = false;
        app.aviso = null;
        desenhar();
      }, { classe: 'botao-discreto', dados: { acao: 'voltar-entrada' } }),
    ];
  }

  // O seletor de equipe do espectador, sempre visível no topo (D-064): um botão
  // por equipe, com a forma e o número (o nome inteiro não cabe seis vezes em
  // 360 px; está no aria-label e na linha da equipe, na tela). Equipe fechada
  // pelo apresentador fica apagada: não tem tela de aluno.
  function desenharBarraEspectador() {
    const barra = app.el.barraEspectador;
    const ligado = app.fase === 'sala' && Boolean(app.espectador);
    document.body.classList.toggle('espectador', ligado);
    const c = app.dados.conteudo;
    const abertas = app.dados.estado?.equipesAbertas;
    const ordem = ligado ? ordemDe(c, 'equipes') : [];
    const chave = ligado ? JSON.stringify([app.espectador.equipe, ordem, abertas || null]) : '';
    if (barra.dataset.chave === chave) return;
    barra.dataset.chave = chave;
    const { limpar, acrescentar, botao } = D();
    limpar(barra);
    barra.hidden = !ligado;
    if (!ligado) return;
    acrescentar(barra, ordem.map((id, i) => {
      const eq = c.equipes[id];
      const b = botao('', () => verEquipe(id), {
        classe: 'botao-ver-equipe', pressionado: app.espectador.equipe === id,
        desabilitado: Boolean(abertas) && abertas[id] !== true, dados: { verEquipe: id },
      });
      b.setAttribute('aria-label', `Ver a tela da equipe ${i + 1} ${eq?.nome || ''}`.trim());
      limpar(b);
      acrescentar(b, [G().forma(eq?.forma, eq?.cor, '1.1em'), D().el('b', { texto: String(i + 1) })]);
      return b;
    }));
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
    // O espectador sai (D-064): os ouvintes já foram desligados (sem o pedido,
    // o da decisão seria recusado e religaria), e o próprio pedido sai do banco.
    // Sem rede, quem apaga é o servidor, quando a conexão cair
    // (apagarAoDesconectar). O PIN some da memória. Vale também para quem
    // nem chegou a espectador: a prova do PIN que falhou depois de o pedido
    // ser gravado (revisão da F6b, achado 15).
    apagarPedido();
    gravarSessao('espectador', '');
    app.espectador = null;
    app.pedindoPin = false;
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

  // Por que o "Votar nesta" está apagado (telaDoAluno, motivo), dito junto do
  // botão e embaixo da lista.
  const MOTIVOS_SEM_VOTO = {
    entrouDepois: 'Você entrou depois de esta decisão abrir: acompanhe a conversa. O seu voto vale na próxima.',
    pausado: 'Pausado pelo apresentador: o voto volta a valer quando ele retomar.',
    espectador: 'Modo espectador: não vota.',
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
      cabecalho(kicker, titulo), el('p', { classe: 'texto', texto }), notaDaRecusaDaEtapa() || nota(app.ui.nota),
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
      // O fim do cronômetro, e não o prazo da regra, que leva a folga de 12 h.
      escala: d.escala || escalaCurta(), prazo: L().fimDoCronometro(e), pausado: typeof e.restanteMs === 'number', restanteMs: e.restanteMs ?? null,
    };
  }

  function rotuloMomento(m) {
    return { antes: 'antes', depois: 'depois' }[m] || null;
  }

  // A nota do envio da tela atual: o estágio dele, ou o motivo da recusa.
  function notaDoEnvio(envio, registradoTexto = 'Voto registrado.') {
    if (!envio) return null;
    if (envio.estagio === 'recusado') return notaDaRecusa(recusaParaTela(envio));
    const decisao = envio.pendente.tipo === 'decisao';
    const texto = {
      enviando: null,
      lento: 'Enviando…',
      guardado: 'Guardado no aparelho: será reenviado quando a conexão voltar.',
      esperaRetomar: decisao
        ? 'Votação pausada pelo apresentador: o seu voto fica guardado no aparelho e vai sozinho quando ele retomar.'
        : 'Votação pausada pelo apresentador: a sua resposta fica guardada no aparelho e vai sozinha quando ele retomar.',
      falhou: decisao
        ? 'Não foi possível enviar o voto: toque de novo em “Votar nesta”.'
        : 'Não foi possível enviar a resposta: toque de novo nela.',
      registrado: registradoTexto,
    }[envio.estagio];
    return nota(texto, envio.estagio === 'falhou' ? 'erro' : 'info');
  }

  const notaDaRecusa = (r) => (r ? nota(r.texto, r.tipo) : null);

  // A posição da afirmação na enquete ("afirmação 1"), a mesma do "1 de 3".
  function posicaoDaAfirmacao(p) {
    const enq = app.dados.conteudo?.enquetes?.[p.enquete];
    const todas = lista(enq?.ordemAfirmacoes).length > 0 ? lista(enq.ordemAfirmacoes) : Object.keys(enq?.afirmacoes || {});
    return todas.indexOf(p.afirmacao) + 1;
  }

  // O que dizer quando a regra recusou um voto: o motivo (alunoLogica.
  // motivoDaRecusa, com o estado, o registro de membro e a entrada de agora, e
  // o voto que o servidor já tinha confirmado antes) e o que fazer. tipo 'info'
  // quando nada se perdeu: na troca que chegou tarde, valeu o voto anterior.
  function recusaParaTela(envio) {
    const p = envio.pendente;
    const motivo = L().motivoDaRecusa(p, contextoDaRecusa(envio));
    const decisao = p.tipo === 'decisao';
    const deNovo = decisao ? 'toque em “Votar nesta” de novo' : 'toque de novo na sua resposta';
    const erro = (texto) => ({ texto, tipo: 'erro' });
    switch (motivo) {
      case 'fechou': return erro('A votação fechou antes do seu voto chegar: ele não foi contado.');
      // Revisão de 30/09 (achado P2): quem trocou A por B sem rede via "não foi
      // contado", e o A tinha contado; o apresentador podia até desfazer a
      // apuração sem motivo.
      case 'trocaTarde': return {
        tipo: 'info',
        texto: decisao
          ? `A troca para ${letraDe(p.rodada, p.opcao)} chegou depois do fechamento: valeu o seu voto anterior, ${letraDe(p.rodada, envio.anterior)}.`
          : `A mudança para ${rotuloVoto(p.valor)} chegou depois do fechamento: valeu a sua resposta anterior, ${rotuloVoto(envio.anterior)}.`,
      };
      case 'soEmpatadas': return erro('O seu voto chegou depois de a primeira votação fechar. Agora só valem as opções empatadas: vote numa delas.');
      // Revisão de 30/09 (achado P3): diz qual resposta se perdeu.
      case 'outraAfirmacao': return erro(`A resposta da afirmação ${posicaoDaAfirmacao(p)} chegou depois de o apresentador avançar e não foi contada.`);
      case 'pausado': return erro(`A votação foi pausada antes do seu voto chegar: quando o apresentador retomar, ${deNovo}.`);
      // Quem volta à sala depois de a decisão abrir só vota na próxima; na
      // enquete, não há essa trava, e dá para responder de novo.
      case 'foraDaSala': return erro(decisao
        ? 'O seu aparelho saiu da sala antes de o voto chegar: ele entra de novo sozinho, e o voto vale na próxima decisão.'
        : 'O seu aparelho saiu da sala antes de o voto chegar: ele entra de novo sozinho; depois, toque de novo na sua resposta.');
      // Revisão de 30/09 (achado 7): com a entrada fechada, garantirMembro não
      // regrava o membro, e o "entra de novo sozinho" era falso.
      case 'foraDaSalaFechada': return erro('O seu aparelho saiu da sala antes de o voto chegar, e a entrada está fechada: peça ao apresentador para abrir a entrada.');
      case 'outraEquipe': return erro('O seu aparelho mudou de equipe antes de o voto chegar: vote de novo, agora pela equipe nova.');
      case 'entrouDepois': return erro('O seu aparelho entrou de novo na sala depois de a decisão abrir: o voto só vale na próxima.');
      default: return erro(`O voto não foi aceito: ${deNovo}. Se não der certo, avise o apresentador.`);
    }
  }

  // O voto recusado da etapa atual (a mesma rodada da própria equipe, ou a
  // mesma enquete e momento), para as telas que vêm depois dele: "votação
  // encerrada", "sorteando", "registrado". Sem isto, quem votou tarde via
  // "Votação encerrada" e achava que o voto tinha contado. A recusa de outra
  // equipe (o aparelho foi movido; revisão de 30/09, achado P1) não é desta, e
  // a de uma afirmação anterior some depois que o aluno responde outra
  // (marcarRecusasVistas). excetoAfirmacao: na tela de uma afirmação, a recusa
  // dela mesma já sai pela notaDoEnvio.
  function recusaDaEtapa({ excetoAfirmacao = null } = {}) {
    const e = app.dados.estado;
    if (!e) return null;
    const equipe = app.dados.membros?.[app.uid]?.equipe;
    let daEtapa = null;
    for (const envio of app.envios.values()) {
      if (envio.estagio !== 'recusado' || envio.vista) continue;
      const p = envio.pendente;
      const mesmaEtapa = p.tipo === 'decisao'
        ? e.tipo === 'rodada' && p.rodada === e.rodada && p.equipe === equipe
        : e.tipo === 'enquete' && p.enquete === e.enquete && p.momento === e.momento && p.afirmacao !== excetoAfirmacao;
      if (mesmaEtapa) daEtapa = envio;
    }
    return daEtapa ? recusaParaTela(daEtapa) : null;
  }
  const notaDaRecusaDaEtapa = (opcoes) => notaDaRecusa(recusaDaEtapa(opcoes));

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
        pressionado: escolhido === valor, desabilitado: enviando || Boolean(app.espectador), dados: { valor: String(valor) },
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
      // D-064: o espectador vê a afirmação da vez com os números apagados.
      app.espectador ? nota(MOTIVOS_SEM_VOTO.espectador) : null,
      notaDoEnvio(envio, `Registrado: ${escolhido ? rotuloVoto(escolhido) : ''}`) || notaDaRecusaDaEtapa({ excetoAfirmacao: a.id }) || nota(app.ui.nota),
      navegar.length > 0 ? el('div', { classe: 'navegar' }, navegar) : null,
      privacidade(),
    ]));
    return 'enquete';
  }

  function telaEnqueteRegistrada(alvo, d) {
    const { el, botao, acrescentar } = D();
    // Guardado à espera da rede ou do fim da pausa (guardadoNoAparelho).
    const guardados = d.afirmacoes.filter((a) => guardadoNoAparelho(app.envios.get(caminhoDe({ tipo: 'enquete', enquete: d.enquete.id, momento: d.momento, afirmacao: a.id }))));
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
      notaDaRecusaDaEtapa() || nota(app.ui.nota),
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
        classe: 'botao-equipe', pressionado: minha === eq.id, desabilitado: app.trocandoEquipe || Boolean(app.espectador), dados: { equipe: eq.id },
      });
      D().limpar(b);
      const n = conta[eq.id] || 0;
      acrescentar(b, [rotuloEquipe(eq), el('span', { classe: 'equipe-conta', texto: minha === eq.id ? 'sua equipe' : F().pessoas(n) })]);
      return b;
    });
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho('Formação das equipes', minha ? 'Você está numa equipe' : 'Escolha a sua equipe'),
      botao(minha ? 'Me coloque em outra equipe' : 'Me coloque numa equipe', () => colocarNumaEquipe(), {
        classe: [minha ? null : 'botao-primario', 'botao-largo'], desabilitado: app.trocandoEquipe || Boolean(app.espectador), dados: { acao: 'me-coloque' },
      }),
      el('p', { classe: 'texto-2', texto: 'Ou escolha uma (sente-se com ela). Dá para trocar até o apresentador travar as equipes.' }),
      el('div', { classe: 'lista-equipes', role: 'group', 'aria-label': 'Equipes' }, botoes),
      // D-064: o espectador não escolhe equipe (gravaria membros/{uid}).
      nota(app.espectador ? 'Modo espectador: não escolhe equipe. Use os números no topo para ver cada uma.' : app.ui.nota),
    ]));
    return 'escolherEquipe';
  }

  // semDinheiro: sem os indicadores em reais (o saldo acumulado e o empréstimo a
  // pagar), nas telas que já trazem o resumo mês a mês e a dívida (D-065). No
  // teste de 30/09, o Jonas via "Saldo acumulado −R$ 1" logo depois de pegar
  // R$ 1.500 emprestado: o caixa, e não o que a família devia. O empréstimo em
  // R$ 0 também sai (era uma linha a mais para todo mundo, sem dizer nada).
  function listaIndicadores(indicadores, deltas, { semDinheiro = false } = {}) {
    const { el } = D();
    const visiveis = lista(indicadores).filter((ind) => {
      if (semDinheiro && ind.formato === 'moeda') return false;
      return !(ind.id === 'emprestimo' && !(ind.valor > 0) && !(deltas?.[ind.id]));
    });
    if (visiveis.length === 0) return null;
    return el('dl', { classe: 'indicadores' }, visiveis.flatMap((ind) => {
      const delta = deltas ? deltas[ind.id] : undefined;
      return [
        el('dt', { texto: ind.nome }),
        el('dd', { dados: { indicador: ind.id } }, [
          F().indicador(ind, ind.valor),
          typeof delta === 'number' && delta !== 0 ? el('span', { classe: 'delta', texto: ` (${F().indicador(ind, delta, { sinal: true })} ${periodo().noPeriodo})` }) : null,
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
  function personaIdDaEquipe(equipeId) {
    const c = app.dados.conteudo;
    return tem(c?.equipes, equipeId) ? c.equipes[equipeId].persona : null;
  }
  function personaDaEquipe(equipeId) {
    const c = app.dados.conteudo;
    const id = personaIdDaEquipe(equipeId);
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
  // Esquema v3: com rodadas de 2 meses, o básico da rodada é o dobro. Na
  // persona e na situação, os dois ("R$ Y por mês, R$ 2Y no bimestre"); na
  // decisão (curta), só o do período, que é o que a decisão tem de pagar: uma
  // linha a mais ali empurraria as letras das opções para baixo da dobra.
  function linhaBasico(persona, { curta = false } = {}) {
    const total = persona?.basico?.total;
    if (!Number.isFinite(total) || total <= 0) return null;
    const { el } = D();
    const p = periodo();
    let texto = ['O básico da família custa ', el('b', { texto: F().moeda(total) }), ' por mês'];
    if (p.meses > 1 && curta) texto = ['O básico da família custa ', el('b', { texto: F().moeda(total * p.meses) }), ` ${p.noPeriodo}`];
    else if (p.meses > 1) texto.push(', ', el('b', { texto: F().moeda(total * p.meses) }), ` ${p.noPeriodo}`);
    return el('p', { classe: 'basico-linha', dados: { basicoTotal: String(total), meses: String(p.meses) } }, texto);
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

  // "Entrou R$ X · gastos R$ G · o básico da família custa R$ Y · juros da
  // dívida R$ J", e embaixo "Faltou R$ Z" (D-044, D-052), com os números que o
  // telão gravou no resultado (mes). Gastos e juros entram na linha quando
  // existem: sem eles, "faltou" não fecharia com as outras parcelas. Os gastos
  // (conserto, remédio, multa) ficam fora do "entrou" desde o esquema v2.1:
  // dentro dele, o "entrou" chegava a ficar negativo (decisões, "Correções de
  // conta").
  // D-059: "a proteção pagou R$ X" entra logo depois do "Entrou" (ela fica fora
  // dele no motor, e sem ela a conta da linha não fecharia), e a frase inteira
  // da proteção vem numa linha própria (linhaProtecao).
  // D-066: com o limite do cheque especial, a comida que não foi comprada volta
  // para a conta (o básico saiu inteiro, mas ela não foi paga), e a multa e a
  // mora das contas atrasadas saem dela: sem as duas partes, a linha não
  // fecharia com o "faltou" de baixo (contratos, seção 3). D-067: a frase da
  // proteção acima do trabalho fica na conta, menos no resultado, que a mostra
  // à vista (comAcima: false), para não repetir.
  function contaDoMes(mes, persona, deAntes = mes?.deAntes, protecaoDoMes = mes?.protecaoDoMes, { comAcima = true } = {}) {
    if (!mes || !Number.isFinite(mes.saldoMes)) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    const faltou = mes.saldoMes < 0;
    // Sala de antes do v2.1 não grava gastos nem custos fixos: valem 0, e o
    // "entrou" dela já os trazia dentro (a conta continua fechando). Sala de
    // antes da D-059 não grava a proteção: vale 0.
    const gastos = Number(mes.gastos) || 0;
    const custosFixos = Number(mes.custosFixos) || 0;
    const protecao = Number(mes.protecao) || 0;
    // Sala sem o limite (ou de antes da D-066) não tem os campos: nada muda.
    const limite = camposDoLimite(mes);
    const linha = ['Entrou ', moeda(mes.entrou)];
    if (protecao > 0) linha.push(' · a proteção pagou ', moeda(protecao));
    if (gastos > 0) linha.push(' · gastos ', moeda(gastos));
    // Com rodadas de 2 meses, o básico (e o trabalho) da conta são os do
    // bimestre: sem o "no bimestre", o dobro do "por mês" da persona parecia erro.
    linha.push(' · o básico da família custa ', moeda(mes.basico));
    if (periodo().meses > 1) linha.push(` ${periodo().noPeriodo}`);
    if (limite?.faltouNaMesa > 0) linha.push(' (', moeda(limite.faltouNaMesa), ' de comida não foi comprada)');
    // Revisão da F6c: os itens que não atrasam (gás, ônibus, remédio) e que a
    // casa ficou sem. Também não saíram do caixa: sem a linha, a conta lida não
    // fechava no saldo.
    if (limite?.ficouSem > 0) linha.push(' (a casa ficou sem ', moeda(limite.ficouSem), ' do que não se paga depois)');
    if (mes.juros > 0) linha.push(' · juros da dívida ', moeda(mes.juros));
    if (limite && limite.multa + limite.mora > 0) linha.push(' · multa e mora das contas atrasadas ', moeda(limite.multa + limite.mora));
    // De onde veio o "entrou", quando ele não é só o trabalho: a parcela da
    // moto sai antes (custo fixo do trabalho), e a outra renda da casa soma. A
    // turma vê que o trabalho sozinho não pagava a conta. As parcelas somam o
    // "entrou" (entrou = trabalho − custos fixos + outra renda).
    // "Do trabalho e da decisão", e não "Do trabalho": o número é o trabalho
    // variável do motor, que leva também o efeito da decisão (o empréstimo de
    // R$ 1.500 do mês 2) e o que veio de antes (o auxílio do INSS). Com o rótulo
    // antigo, o celular dizia "Do trabalho: R$ 2.694" de quem ficou 25 dias
    // parado (revisão de 29/09, 2ª rodada, achado 10).
    const origem = [];
    if (custosFixos > 0 || mes.outraRenda > 0) origem.push(`Do trabalho e da decisão: ${F().moeda(mes.trabalho)}`);
    if (custosFixos > 0) origem.push(`custos fixos do trabalho: ${F().moeda(-custosFixos)}`);
    if (mes.outraRenda > 0) origem.push(`${persona?.outraRenda?.rotulo || 'outra renda da casa'}: ${F().moeda(mes.outraRenda)}`);
    return el('div', {
      classe: 'conta-mes',
      dados: {
        entrou: mes.entrou, protecao, gastos, basico: mes.basico, juros: mes.juros || 0, saldoMes: mes.saldoMes, resultado: faltou ? 'faltou' : 'sobrou',
        ...(limite ? { faltouNaMesa: limite.faltouNaMesa, multa: limite.multa, mora: limite.mora } : {}),
        ...(limite?.ficouSem > 0 ? { ficouSem: limite.ficouSem } : {}),
      },
    }, [
      el('p', { classe: 'conta-linha' }, linha),
      origem.length > 0 ? el('p', { classe: 'conta-origem', texto: origem.join(' · ') }) : null,
      linhaDeAntes(deAntes),
      linhaProtecao(protecaoDoMes),
      comAcima ? linhaAcimaDoTrabalho(protecaoDoMes, persona?.nome) : null,
      linhaEmprestimo(mes),
      linhaLimite(mes),
      el('p', { classe: 'conta-saldo' }, [faltou ? 'Faltou ' : 'Sobrou ', moeda(Math.abs(mes.saldoMes))]),
    ]);
  }

  // D-066: os campos do limite no mês gravado, em números (0 quando faltam), ou
  // null em sala sem o limite (o contasAtrasadas só existe com ele).
  function camposDoLimite(mes) {
    if (!mes || !Number.isFinite(mes.contasAtrasadas)) return null;
    const n = (k) => Number(mes[k]) || 0;
    return {
      dividaBanco: n('dividaBanco'), mora: n('mora'), contasPagas: n('contasPagas'), atrasou: n('atrasou'), multa: n('multa'),
      contasAtrasadas: n('contasAtrasadas'), faltouNaMesa: n('faltouNaMesa'), faltouNaMesaAcumulado: n('faltouNaMesaAcumulado'),
      ficouSem: n('ficouSem'),
    };
  }

  // D-066: o bimestre em que o dinheiro e o limite do cheque especial acabaram.
  // "O limite do cheque especial acabou: R$ X de contas ficaram atrasadas
  // (multa de R$ M) e R$ Y de comida não deu para comprar." e "Pagou R$ Z de
  // contas atrasadas." vêm do núcleo (historia.fraseDoLimite). A mora, que a
  // frase do núcleo não diz, vem depois: é a parte da dívida que cresce
  // sozinha, e sem ela a conta atrasada parecia subir do nada de um bimestre
  // para o outro. Nada disso no mês (ou sala sem o limite): sem a linha.
  function linhaLimite(mes) {
    const limite = camposDoLimite(mes);
    if (!limite) return null;
    const frase = N().historia?.fraseDoLimite?.(mes, (v) => F().moeda(v)) ?? null;
    const partes = [frase, limite.mora > 0 ? `Mora de ${F().moeda(limite.mora)} sobre as contas que já estavam atrasadas.` : null].filter(Boolean);
    if (partes.length === 0) return null;
    const { atrasou, multa, mora, contasPagas, contasAtrasadas, dividaBanco } = limite;
    return D().el('p', { classe: 'conta-limite', dados: { atrasou, multa, mora, contasPagas, contasAtrasadas, dividaBanco }, texto: partes.join(' ') });
  }

  // D-067: "Auxílio do INSS (MEI): R$ 2.431, mais do que Bruna ganhava
  // trabalhando num bimestre comum (R$ 1.400)." A frase é do núcleo
  // (historia.fraseAcimaDoTrabalho); sem ela, a sala lia "o acidente
  // compensa", quando o dado é que o piso do INSS passa da renda do app. Só no
  // mês em que o anfitrião gravou o caso. classe: "acima-trabalho" à vista no
  // resultado, "conta-acima-trabalho" dentro da conta e da história.
  function linhaAcimaDoTrabalho(protecaoDoMes, nome, classe = 'conta-acima-trabalho') {
    const frase = N().historia?.fraseAcimaDoTrabalho?.(protecaoDoMes, nome, (v) => F().moeda(v), periodo()) ?? null;
    if (!frase) return null;
    return D().el('p', { classe, dados: { trabalhoComum: protecaoDoMes.acimaDoTrabalho.trabalhoComum }, texto: frase });
  }

  // D-066: o que faltou na mesa, à parte da dívida. É a comida que a casa
  // deixou de comprar quando o limite acabou: não se paga depois e não entra no
  // "ficou com" (contratos, seção 3), mas é o custo que a sala precisa ver ao
  // lado do dinheiro. acumulado é o do jogo até ali; noPeriodo (no resultado)
  // é o do bimestre. Nada faltou (ou sala sem o limite, com null): sem a linha.
  function linhaMesa(acumulado, noPeriodo = null) {
    const total = Number(acumulado) || 0;
    const doPeriodo = Number(noPeriodo) || 0;
    if (total <= 0 && doPeriodo <= 0) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    let texto = ['Faltou na mesa: ', moeda(total), ' de comida que não deu para comprar, até agora.'];
    if (doPeriodo > 0) {
      texto = ['Faltou na mesa: ', moeda(doPeriodo), ` de comida que não deu para comprar neste ${periodo().nome}`];
      if (total > doPeriodo) texto.push(' (', moeda(total), ' até agora)');
      texto.push('.');
    }
    return el('p', { classe: 'faltou-mesa', dados: { faltouNaMesa: total, ...(noPeriodo === null ? {} : { noPeriodo: doPeriodo }) } }, texto);
  }

  // Esquema v2.2: o empréstimo é dívida, e não renda. O dinheiro entra no caixa,
  // mas fica fora do "entrou" e do saldo do mês; a parcela sai do caixa, e só
  // os juros dela entram na conta (a outra parte abate a dívida). Sem esta linha,
  // o mês do empréstimo mostrava "faltou R$ 1.034" com o caixa em −R$ 1, e
  // ninguém entendia de onde vinha a diferença. Sem empréstimo no mês (ou sala
  // antiga, sem os campos), sem a linha.
  function linhaEmprestimo(mes) {
    const entrada = Number(mes?.emprestimo) || 0;
    const parcela = Number(mes?.parcela) || 0;
    if (entrada <= 0 && parcela <= 0) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    const partes = [];
    if (entrada > 0) partes.push(['Empréstimo de ', moeda(entrada), ': o dinheiro entrou no caixa, mas é dívida, e não conta como sobra do mês.']);
    if (parcela > 0) {
      partes.push([
        entrada > 0 ? ' ' : '', 'Parcela do empréstimo ', moeda(parcela), ': ', moeda(Number(mes.jurosEmprestimo) || 0),
        ' de juros (já na conta) e ', moeda(Number(mes.amortizacao) || 0), ' que abatem a dívida.',
      ]);
    }
    return el('p', { classe: 'conta-emprestimo', dados: { emprestimo: entrada, parcela } }, partes);
  }

  // D-059: "A proteção pagou R$ 900: auxílio do INSS (MEI). Sem ela, teria
  // faltado R$ 900 a mais." A proteção é seguro, e não rende na média: o que
  // ela vale é o que evitou naquele mês. A frase vem de historia.js, a mesma
  // que o núcleo testa. Sem proteção no mês (ou sala antiga), sem a linha.
  function linhaProtecao(protecaoDoMes) {
    const frase = N().historia?.fraseDaProtecao(protecaoDoMes, (v) => F().moeda(v));
    if (!frase) return null;
    return D().el('p', { classe: 'conta-protecao', dados: { evitou: String(protecaoDoMes.evitou) }, texto: frase });
  }

  // O que veio dos meses anteriores (motor, deAntes, gravado pelo anfitrião):
  // "fratura: mais 25 dias parado −R$ 2.233 · auxílio do INSS (45 dias)
  // +R$ 2.431". Já estão somados na conta de cima; a linha diz de onde vieram,
  // porque sem ela os 25 dias e o INSS sumiam dentro do trabalho (revisão de
  // 29/09, 2ª rodada, achado 10). Sem nada (ou sala antiga), sem a linha.
  function linhaDeAntes(itens) {
    const validos = lista(itens).filter((x) => x && typeof x.rotulo === 'string' && Number.isFinite(x.valor));
    if (validos.length === 0) return null;
    const { el } = D();
    const partes = validos.map((x) => [`${x.rotulo} `, el('b', { texto: F().moeda(x.valor, { sinal: true }) })]);
    return el('p', { classe: 'conta-de-antes', dados: { deAntes: String(validos.length) } },
      ['Veio dos meses anteriores (já na conta): ', partes.map((p, i) => (i > 0 ? [' · ', p] : p))]);
  }

  // D-052: "O que a carta custou: 20 dias parado · renda perdida R$ X · gastos
  // R$ Y", com o cartaCusto que o telão gravou (o tempo parado custa quanto?).
  // Carta que não custou nada, e sala de antes do v2.1 (sem cartaCusto), ficam
  // sem a linha. A mesma forma para toda carta: a grave não ganha destaque
  // (arquitetura, seção 8).
  function linhaCustoCarta(custo) {
    if (!custo) return null;
    const dias = Number(custo.diasParado) || 0;
    const perdida = Number(custo.rendaPerdida) || 0;
    const gastos = Number(custo.gastos) || 0;
    if (dias <= 0 && perdida <= 0 && gastos <= 0) return null;
    const { el } = D();
    const partes = [];
    if (dias > 0) partes.push([el('b', { texto: `${dias} ${dias === 1 ? 'dia parado' : 'dias parado'}` })]);
    if (perdida > 0) partes.push(['renda perdida ', el('b', { texto: F().moeda(perdida) })]);
    if (gastos > 0) partes.push(['gastos ', el('b', { texto: F().moeda(gastos) })]);
    return el('p', { classe: 'carta-custo', dados: { diasParado: dias, rendaPerdida: perdida, gastos } },
      ['O que a carta custou: ', partes.map((p, i) => (i > 0 ? [' · ', p] : p))]);
  }

  // ----- A dívida da família (D-046; esquema v2.2, D-065)
  //
  // Duas dívidas: o cheque especial (o saldo acumulado negativo, com os juros do
  // config) e o empréstimo a pagar. A "dívida" das telas é a soma
  // (historia.dividaTotal). No teste de 30/09, o Jonas pegou R$ 1.500 no mês 2 e
  // o celular disse "Dívida R$ 1", porque olhava só o cheque especial.

  const valoresDe = (indicadores) => Object.fromEntries(lista(indicadores).map((i) => [i.id, i.valor]));

  // As duas dívidas e o caixa, a partir dos indicadores do fim do mês (o
  // "depois" gravado). null sem a renda (sala sem resultado).
  function dividaDe(valores) {
    const d = N().historia?.dividaTotal(valores);
    if (!d) return null;
    return { ...d, caixa: Number(valores.renda), ...regrasDaDivida() };
  }

  // As regras que a dívida da tela escreve: os juros do banco e, com o limite do
  // cheque especial (D-066), o limite, a multa e a mora das contas atrasadas.
  // Sem o limite no config, só os juros, como antes.
  function regrasDaDivida() {
    const r = app.dados.conteudo?.regras || {};
    if (!Number.isInteger(r.limiteChequeEspecial)) return { jurosMes: r.jurosDividaMes };
    return { jurosMes: r.jurosDividaMes, limite: r.limiteChequeEspecial, multaAtraso: r.multaAtraso, moraMes: r.moraMes };
  }

  // Na decisão, uma linha só (a dobra de 360×740 não tem espaço): "Dívida R$ D ·
  // juros de J% ao mês" quando é só o cheque especial, e "Dívida R$ D, com R$ E
  // de empréstimo" quando há empréstimo (os juros dele são outros).
  // Com o limite (D-066), o D é o do telão: o banco e o empréstimo, sem as
  // contas atrasadas (revisão da F6c: o telão escrevia "dívida R$ 3.000" e o
  // celular, "Dívida R$ 7.811", para a mesma equipe). As contas atrasadas
  // ficam na situação, logo abaixo das opções (blocoDivida): na mesma linha,
  // "· contas atrasadas R$ 4.811" quebrava em duas em 360 px e empurrava a
  // confirmação do voto para baixo da dobra (matriz de votos, r4).
  const temAtrasadas = (divida) => divida?.contasAtrasadas > 0;
  function linhaDivida(divida) {
    if (!divida || !(divida.total > 0)) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    let resto = [];
    if (divida.emprestimo > 0) resto = [', com ', moeda(divida.emprestimo), ' de empréstimo'];
    else if (Number.isFinite(divida.jurosMes)) resto = [' · juros de ', el('b', { texto: F().taxa(divida.jurosMes) }), ' ao mês'];
    return el('p', { classe: 'divida', dados: { divida: String(divida.total) } }, ['Dívida ', moeda(divida.total), ...resto]);
  }

  // Nas telas de situação, resultado e fim, a dívida por partes, debaixo do
  // saldo: "Dívida hoje R$ 1.501", "Cheque especial R$ 1 · juros de 7,43% ao
  // mês", "Empréstimo a 6,39% ao mês: fica devendo R$ 1.500 em 12 parcelas" e "a
  // próxima: R$ 183 · R$ 2.192 no total, com os juros" (11 × 183 + 179). A taxa
  // do empréstimo vem do mês gravado (taxaEmprestimo): sem ela, só a taxa do
  // cheque especial aparecia, mesmo com R$ 1 nele (revisão de 30/09, achado 17). As parcelas vêm do mês gravado (o mesmo
  // mês dos indicadores). Com empréstimo e caixa positivo, o caixa aparece: sem
  // ele, "ficou com −R$ 1.000" ao lado de "dívida R$ 1.500" não fechava.
  // Sem dívida, sem o bloco.
  // Com o limite (D-066; revisão da F6c), o total é "Dívida no banco" (o
  // cheque especial e o empréstimo, o mesmo número que o telão chama de
  // dívida), e as contas atrasadas vêm numa linha com nome próprio, fora dele.
  function blocoDivida(divida, mes) {
    if (!divida || !(divida.total > 0 || temAtrasadas(divida))) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    const partes = [];
    // D-066: com o limite, "Cheque especial R$ 1.500 de R$ 1.500 do limite": a
    // sala vê que o banco parou ali, e que o resto da falta foi para as contas
    // atrasadas, logo embaixo (com a multa e a mora do config).
    if (divida.chequeEspecial > 0) {
      partes.push(el('p', { classe: 'divida-parte', dados: { parte: 'cheque' } }, [
        'Cheque especial ', moeda(divida.chequeEspecial),
        Number.isFinite(divida.limite) ? [' de ', moeda(divida.limite), ' do limite'] : null,
        Number.isFinite(divida.jurosMes) ? [' · juros de ', el('b', { texto: F().taxa(divida.jurosMes) }), ' ao mês'] : null,
      ]));
    }
    if (divida.contasAtrasadas > 0) {
      const taxas = Number.isFinite(divida.multaAtraso) && Number.isFinite(divida.moraMes);
      partes.push(el('p', { classe: 'divida-parte', dados: { parte: 'atrasadas' } }, [
        'Contas atrasadas ', moeda(divida.contasAtrasadas),
        taxas ? [' · multa de ', el('b', { texto: F().taxa(divida.multaAtraso) }), ' e mora de ', el('b', { texto: F().taxa(divida.moraMes) }), ' ao mês'] : null,
      ]));
    }
    if (divida.emprestimo > 0) {
      const n = Number(mes?.parcelasRestantes) || 0;
      partes.push(el('p', { classe: 'divida-parte', dados: { parte: 'emprestimo', parcelas: n } }, [
        'Empréstimo', Number.isFinite(mes?.taxaEmprestimo) ? [' a ', el('b', { texto: F().taxa(mes.taxaEmprestimo) }), ' ao mês'] : null,
        ': fica devendo ', moeda(divida.emprestimo), n > 0 ? ` em ${n} ${n === 1 ? 'parcela' : 'parcelas'}` : null,
      ]));
      const proxima = Number(mes?.proximaParcela) || 0;
      const aPagar = Number(mes?.aPagar) || 0;
      if (n > 0 && proxima > 0) {
        partes.push(el('p', { classe: 'divida-nota' }, [`a próxima: ${F().moeda(proxima)}`, aPagar > 0 ? ` · ${F().moeda(aPagar)} no total, com os juros` : null]));
      }
      if (divida.caixa > 0) partes.push(el('p', { classe: 'divida-nota', texto: `Dinheiro em caixa: ${F().moeda(divida.caixa)}` }));
    }
    // data-atrasadas e data-limite só com o limite: a sala sem ele fica igual.
    const doLimite = {
      ...(divida.contasAtrasadas !== undefined ? { atrasadas: divida.contasAtrasadas } : {}),
      ...(Number.isFinite(divida.limite) ? { limite: divida.limite } : {}),
    };
    return el('div', {
      classe: 'divida', dados: { divida: divida.total, cheque: divida.chequeEspecial, emprestimo: divida.emprestimo, ...doLimite },
    }, [el('p', { classe: 'divida-total' }, [divida.contasAtrasadas !== undefined ? 'Dívida no banco ' : 'Dívida hoje ', moeda(divida.total)]), ...partes]);
  }

  // ----- O resumo mês a mês (D-065)
  //
  // No teste de 30/09, a situação da persona era um parágrafo de números
  // ("entrou · gastos · básico · juros · faltou", a origem, o que veio de antes,
  // a proteção, a carta, os indicadores), difícil de explicar em aula. Agora o
  // topo é uma tabela: uma linha por mês jogado, com o saldo do mês e com quanto
  // a família ficou, verde se positivo e vermelho se negativo, sempre com o
  // sinal (a cor nunca é o único canal, D-016: o "+" e o "−" dizem o mesmo). O
  // detalhe fica recolhido.

  // "+" e "−" pelo valor arredondado, o mesmo que a tela mostra: −0,4 é "R$ 0",
  // e não pode sair vermelho.
  const sinalDe = (v) => {
    const r = Math.round(v);
    return r > 0 ? 'positivo' : r < 0 ? 'negativo' : 'zero';
  };
  function valorSaldo(v, classe) {
    const ok = Number.isFinite(v);
    return D().el('b', { classe: ['valor-saldo', classe], dados: { sinal: ok ? sinalDe(v) : 'zero' }, texto: ok ? F().moeda(v, { sinal: true }) : '—' });
  }

  // "Mês 1: quanto trabalhar?" vira "Mês 1", e "Jan–fev: …", "Jan–fev": o
  // título inteiro não cabe na coluna em 360 px. A regra é a do historia.js
  // (rotuloDaRodada, a mesma do telão); sem os dois-pontos, o título inteiro.
  function rotuloDoMes(titulo, i) {
    const H = N().historia;
    if (H?.rotuloDaRodada) return H.rotuloDaRodada(titulo, i);
    const t = typeof titulo === 'string' ? titulo.split(':')[0].trim() : '';
    return t || `Rodada ${i + 1}`;
  }

  // A história da equipe a partir dos resultados do banco, pela mesma função do
  // placar final (historia.historiaDaEquipe): nos blocos, a telaDoAluno manda só
  // o último mês.
  function historiaDaSala(equipeId) {
    const H = N().historia;
    return H && equipeId ? H.historiaDaEquipe(app.dados.conteudo, equipeId, app.dados.resultados) : [];
  }

  // A tabela e, embaixo, a dívida de hoje (a do último mês jogado). "Ficou com"
  // é o patrimônio (o saldo acumulado menos o empréstimo a pagar,
  // historia.patrimonioDe): pelo caixa, quem pegou R$ 1.500 e não pagou nada
  // parecia R$ 1.500 mais rico. Sala antiga, sem o "depois", fica com "—".
  // null sem nenhum mês jogado.
  function resumoMesAMes(historia) {
    const meses = lista(historia).filter((h) => Number.isFinite(h?.mes?.saldoMes));
    if (meses.length === 0) return null;
    const { el } = D();
    const linhas = meses.map((h, i) => el('tr', { dados: { rodada: h.rodadaId, saldoMes: h.mes.saldoMes, ficouCom: h.saldoAcumulado ?? '', ...(h.faltouNaMesa !== undefined ? { faltouNaMesa: h.faltouNaMesa } : {}) } }, [
      // O nome curto pela posição da rodada no config (historia), e não pela
      // posição na lista: uma rodada pulada não muda o nome das seguintes.
      el('th', { scope: 'row', texto: h.rotulo || rotuloDoMes(h.titulo, i) }),
      el('td', {}, [valorSaldo(h.mes.saldoMes, 'saldo-mes')]),
      el('td', {}, [valorSaldo(h.saldoAcumulado, 'saldo-ficou')]),
    ]));
    const ultimo = meses.at(-1);
    // O caixa é o patrimônio mais o que ele desconta: o empréstimo e, com o
    // limite (D-066), as contas atrasadas.
    const divida = ultimo.divida && Number.isFinite(ultimo.saldoAcumulado)
      ? { ...ultimo.divida, caixa: ultimo.saldoAcumulado + ultimo.divida.emprestimo + (ultimo.divida.contasAtrasadas || 0), ...regrasDaDivida() }
      : null;
    // Esquema v3: "Bimestre · Saldo do bimestre · Ficou com", uma linha por
    // bimestre (6 no jogo de 12 meses); com rodadas mensais, como antes.
    const p = periodo();
    return el('section', { classe: 'resumo-meses', 'aria-label': p.meses === 1 ? 'Resumo mês a mês' : `Resumo por ${p.nome}`, dados: { linhas: String(meses.length) } }, [
      el('table', { classe: 'tabela-meses' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { scope: 'col', texto: maiuscula(p.nome) }), el('th', { scope: 'col', texto: `Saldo ${p.doPeriodo}` }), el('th', { scope: 'col', texto: 'Ficou com' }),
        ])]),
        el('tbody', {}, linhas),
      ]),
      blocoDivida(divida, ultimo.mes),
      // D-066: o que faltou na mesa até aqui, embaixo da dívida e fora dela.
      linhaMesa(ultimo.faltouNaMesa),
    ]);
  }

  // O detalhe recolhido (toque para abrir), com o mesmo marcador "▸ ver /
  // ▾ fechar" da situação na decisão. A tela é remontada a cada mudança dos
  // dados (alguém entra na sala, a equipe vota): o aberto fica lembrado em
  // app.ui.recolhidos, pela chave, até o próximo passo.
  function recolhido(chave, resumo, filhos) {
    const { el } = D();
    const corpo = [filhos].flat(Infinity).filter(Boolean);
    if (corpo.length === 0) return null;
    const caixa = el('details', { classe: 'recolhido', dados: { recolhido: chave }, open: app.ui.recolhidos.has(chave) }, [
      el('summary', { texto: resumo }),
      el('div', { classe: 'recolhido-corpo' }, corpo),
    ]);
    caixa.addEventListener('toggle', () => {
      if (caixa.open) app.ui.recolhidos.add(chave);
      else app.ui.recolhidos.delete(chave);
    });
    return caixa;
  }

  // A história da equipe, mês a mês (D-045): a opção, a carta e a conta de cada
  // mês. Carta grave aparece como as outras, sem destaque (arquitetura, seção 8).
  // Fica recolhida debaixo do resumo mês a mês (D-065): aberta, eram de 8 a 10
  // linhas por mês, e o placar final virava uma rolagem sem fim.
  // nome: o da persona da equipe, para a frase da proteção acima do trabalho
  // (D-067).
  function blocoHistoria(historia, nome) {
    const meses = lista(historia);
    if (meses.length === 0) return null;
    const { el } = D();
    const moeda = (v) => el('b', { texto: F().moeda(v) });
    const p = periodo();
    const titulo = p.meses === 1 ? 'A história mês a mês' : `A história ${p.nome} a ${p.nome}`;
    return recolhido('historia', titulo, el('ol', { classe: 'historia' }, meses.map((h) => {
      const m = h.mes;
      // A mesma ordem da conta do mês: entrou · gastos · básico · juros ·
      // faltou (D-052), com gastos e juros só quando existem. Com o limite
      // (D-066), a comida não comprada e a multa e a mora, como na conta do mês.
      const limite = camposDoLimite(m);
      const conta = m && Number.isFinite(m.saldoMes)
        ? el('p', { classe: 'historia-conta' }, [
          'Entrou ', moeda(m.entrou),
          m.protecao > 0 ? [' · a proteção pagou ', moeda(m.protecao)] : null,
          m.gastos > 0 ? [' · gastos ', moeda(m.gastos)] : null,
          ' · básico ', moeda(m.basico),
          limite?.faltouNaMesa > 0 ? [' (', moeda(limite.faltouNaMesa), ' de comida não foi comprada)'] : null,
          m.juros > 0 ? [' · juros ', moeda(m.juros)] : null,
          limite && limite.multa + limite.mora > 0 ? [' · multa e mora das contas atrasadas ', moeda(limite.multa + limite.mora)] : null,
          m.saldoMes < 0 ? ' · faltou ' : ' · sobrou ', moeda(Math.abs(m.saldoMes)),
        ])
        : null;
      // O texto da opção já vem do jeito da persona da equipe
      // (historia.historiaDaEquipe, D-054).
      return el('li', { classe: 'historia-mes', dados: { rodada: h.rodadaId } }, [
        el('p', { classe: 'kicker', texto: h.titulo || '' }),
        el('p', {}, ['Decisão: ', el('b', { texto: h.opcao?.rotulo || '' })]),
        h.opcao?.narrativa ? el('blockquote', { classe: 'narrativa', texto: h.opcao.narrativa }) : null,
        el('p', {}, ['Carta: ', el('b', { texto: h.carta?.titulo || '' })]),
        h.carta?.narrativa ? el('blockquote', { classe: 'narrativa', texto: h.carta.narrativa }) : null,
        linhaCustoCarta(h.cartaCusto),
        linhaDeAntes(h.deAntes),
        conta,
        linhaEmprestimo(m),
        linhaLimite(m),
        linhaProtecao(h.protecaoDoMes),
        linhaAcimaDoTrabalho(h.protecaoDoMes, nome),
      ]);
    })));
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

  // A situação da persona nos blocos e no placar final (D-065). De cima para
  // baixo: o resumo mês a mês e a dívida de hoje (o que se explica em aula, e
  // cabe em 360×740 sem rolar), o detalhe recolhido e, por último, a família
  // e os indicadores que não são dinheiro (energia, proteção). No teste de
  // 30/09, a conta do mês, a origem, o que veio de antes, a proteção, a carta,
  // a narrativa e os indicadores vinham todos abertos, um depois do outro.
  function telaSituacao(alvo, d) {
    const { el, acrescentar } = D();
    const nome = d.persona?.nome || 'sua persona';
    // No placar final a história vem pronta; nos blocos, a telaDoAluno manda só
    // o último mês, e o resumo sai dos resultados do banco (a mesma função).
    const historia = d.final ? lista(d.historia) : historiaDaSala(d.equipe?.id);
    const resumo = resumoMesAMes(historia);
    const filhos = [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe), el('span', { classe: 'texto-2', texto: `· ${d.persona?.nome || ''}` })]),
      cabecalho(d.final ? 'Placar final' : 'Acompanhe a apresentação', d.final ? `A situação de ${nome}` : (d.titulo || `A situação de ${nome}`)),
    ];
    if (resumo) filhos.push(resumo);
    else if (!d.final) {
      filhos.push(linhaBasico(d.persona), linhaDivida(dividaDe(valoresDe(d.indicadores))),
        el('p', { classe: 'texto-2', texto: 'Ainda não houve rodada: este é o ponto de partida.' }));
    }
    if (d.final) {
      // "Escolha ou sorte?" e o pior caso logo depois do resumo: são o fecho da
      // aula. A história inteira fica recolhida (D-045, D-065).
      const jaEstimado = N().historia.escolhaOuSorte(d.placar)?.estimado === true;
      filhos.push(blocoEscolhaOuSorte(d.placar), blocoPiorCaso(d.piorCaso, { comNota: !jaEstimado }), blocoHistoria(historia, d.persona?.nome));
    } else if (d.mes) {
      // O último mês, recolhido: a conta (D-044, D-052), a decisão e a carta, com
      // a narrativa em primeira pessoa (D-006). Carta grave: só o texto, sem
      // destaque nenhum (arquitetura, seção 8, "tema sensível").
      const rotulo = rotuloDoMes(d.mes.titulo, historia.length - 1);
      filhos.push(recolhido(`mes:${d.mes.rodada}`, `${rotulo}: a conta em detalhe`, [
        contaDoMes(d.mes, d.persona),
        el('div', { classe: 'mes', dados: { tom: d.mes.carta?.tom || 'normal' } }, [
          el('p', {}, ['Decisão: ', el('b', { texto: descreverDecisao(d.mes.rodada, d.mes.decisao, d.mes.origem) })]),
          el('p', {}, ['Carta: ', el('b', { texto: d.mes.carta?.titulo || '' })]),
          linhaCustoCarta(d.mes.cartaCusto),
          ...lista(d.narrativa).map((t) => el('blockquote', { classe: 'narrativa', texto: t })),
        ]),
      ]));
    }
    filhos.push(linhaFamilia(d.persona));
    const indicadores = listaIndicadores(d.indicadores, null, { semDinheiro: true });
    if (indicadores) filhos.push(el('h2', { classe: 'subtitulo', texto: 'Indicadores' }), indicadores);
    acrescentar(alvo, el('section', { classe: 'bloco' }, filhos));
    return 'situacao';
  }

  // "Escolha ou sorte?", contada como história (D-041): os termos "piloto
  // automático", "efeito das decisões" e "sorte" como legenda saíram da tela,
  // porque confundiam no ensaio.
  // Os valores inteiros de historia.escolhaOuSorte fecham com o total: cada um
  // arredondado sozinho errava a soma por R$ 1 (revisão de 29/09). Como no
  // telão, os totais vão sem sinal de variação e as variações sempre com + ou −,
  // e o total do fim, com "=", em destaque (rascunho, seção 7, item 11). O total
  // é o patrimônio, o mesmo "ficou com" da última linha do resumo.
  function blocoEscolhaOuSorte(placar) {
    const c = N().historia.escolhaOuSorte(placar);
    if (!c) return null;
    const { el } = D();
    const linhas = [
      ['Se não mudassem nada', F().moeda(c.piloto)],
      ['As escolhas', F().variacao(c.escolhas)],
      ['A sorte', F().variacao(c.sorte)],
      ['= Terminaram com', F().moeda(c.total), 'placar-total'],
    ];
    return [
      el('h2', { classe: 'subtitulo', texto: c.estimado ? 'Escolha ou sorte? (estimado)' : 'Escolha ou sorte?' }),
      el('dl', { classe: 'indicadores placar-historia' }, linhas.flatMap(([k, v, classe]) => [el('dt', { classe, texto: k }), el('dd', { classe, texto: v })])),
      c.estimado ? notaEstimado() : null,
    ];
  }

  // ----- Decisão da equipe, com a contagem ao vivo (só da própria equipe)

  function telaDecisao(alvo, tipo, d) {
    const { el, botao, acrescentar } = D();
    const membro = membroDaTela() || {};
    const pendenteBase = { tipo: 'decisao', rodada: d.rodada.id, equipe: membro.equipe };
    const envio = app.envios.get(caminhoDe(pendenteBase));
    const enviando = emVoo(envio);
    const escolhido = enviando || guardadoNoAparelho(envio) ? envio.pendente.opcao : d.meuVoto;
    const personaId = personaIdDaEquipe(membro.equipe);
    const aberta = d.opcoes.some((op) => op.id === app.ui.aberta) ? app.ui.aberta : null;
    const eqNova = app.ui.movido?.rodada === d.rodada.id && !escolhido ? app.dados.conteudo?.equipes?.[app.ui.movido.para] : null;
    const eqNovaTexto = eqNova
      ? `Você foi movido para a equipe ${numeroEquipe(app.ui.movido.para)} ${eqNova.nome}: o voto na equipe anterior não vale aqui. Vote de novo.`
      : null;
    // D-055: tocar na opção abre a explicação dela, e só o "Votar nesta" vota. No
    // ensaio, o toque direto votava antes de a equipe ler o dilema. A narrativa
    // aparece só na opção aberta: com as quatro abertas, cada cartão tinha 5 ou
    // 6 linhas, e em 360×740 só a opção A aparecia antes de rolar (revisão de
    // 29/09). A tendência do config nunca aparece: a seta dizia qual era a
    // opção "certa".
    const opcoes = d.opcoes.map((op, i) => {
      const minha = escolhido === op.id;
      const estaAberta = aberta === op.id;
      const idDetalhe = `opcao-detalhe-${i}`;
      const b = botao('', () => alternarOpcao(op.id), {
        classe: ['botao-opcao-aluno', minha ? 'meu-voto' : null, enviando && minha ? 'enviando' : null],
        dados: minha ? { opcao: op.id, meuVoto: '1' } : { opcao: op.id },
      });
      b.setAttribute('aria-expanded', String(estaAberta));
      if (estaAberta) b.setAttribute('aria-controls', idDetalhe);
      D().limpar(b);
      // "Seu voto" em texto, e não só no fundo claro: estado nunca só por cor (D-016).
      // "✓" só com a confirmação do servidor: sem rede, a opção marcada dizia
      // "✓ seu voto" com o voto ainda no aparelho, e parecia que tinha contado.
      let marca = '✓ seu voto';
      if (minha && enviando) marca = 'enviando…';
      else if (minha && envio?.estagio === 'guardado') marca = 'guardado no aparelho';
      else if (minha && envio?.estagio === 'esperaRetomar') marca = 'guardado até retomar';
      acrescentar(b, [
        el('b', { classe: 'opcao-letra', texto: letraDe(d.rodada.id, op.id) }),
        el('span', { classe: 'opcao-textos' }, [
          el('span', { classe: 'opcao-rotulo', texto: op.rotulo || op.id }),
          minha ? el('span', { classe: 'opcao-seu-voto', texto: marca }) : null,
        ]),
        el('span', { classe: 'opcao-votos', texto: op.votos === 1 ? '1 voto' : `${op.votos} votos` }),
      ]);
      return el('div', { classe: ['opcao-aluno', estaAberta ? 'aberta' : null], dados: { opcaoBloco: op.id } }, [
        b, estaAberta ? detalheDaOpcao(d, op, { idDetalhe, personaId, minha, envio, enviando, pendenteBase, movido: eqNovaTexto }) : null,
      ]);
    });
    const forcada = d.forcada ? `O apresentador registrou a decisão da equipe: ${letraDe(d.rodada.id, d.forcada)}.` : null;
    const s = d.situacao;
    const persona = s?.persona?.nome;
    // A ordem é o que se lê antes de votar: o aperto da casa no topo (D-043) e
    // as opções. O texto da rodada fica no telão: no celular, ele empurrava as
    // opções para baixo da dobra (revisão de 29/09). A situação completa fica fechada depois das opções,
    // para os botões de voto subirem na tela.
    // A dívida é a soma do cheque especial com o empréstimo (esquema v2.2): no
    // teste de 30/09, o Jonas decidiu o mês 3 lendo "Dívida R$ 1" com R$ 1.500
    // emprestados. Só a linha muda; o voto não.
    const pressao = [linhaBasico(s?.persona, { curta: true }), linhaDivida(s ? dividaDe(valoresDe(s.indicadores)) : null)].filter(Boolean);
    const aviso = botao('Mais opções abaixo ↓', () => rolarAteUltimaOpcao(), { classe: 'aviso-rolagem', dados: { avisoRolagem: '1' } });
    aviso.hidden = true;
    // Movido de equipe depois de votar (avisarSeMovido): a nota fica acima das
    // opções e dentro da opção aberta (onde o aluno está olhando), até ele
    // votar pela equipe nova.
    const movido = eqNovaTexto ? nota(eqNovaTexto, 'erro') : null;
    if (movido) movido.dataset.movido = '1';
    acrescentar(alvo, el('section', { classe: 'bloco', dados: { rodada: d.rodada.id } }, [
      // A dica de como se vota (D-055) no lugar do "Decisão da equipe": a frase
      // inteira fica depois das opções, e em 360×740 caía abaixo da dobra; uma
      // linha a mais acima das opções empurrava a letra D para fora da primeira
      // tela (revisão de 29/09, 2ª rodada, achado 19). O título da rodada já diz
      // que é a decisão.
      cabecalho(tipo === 'prorrogacao' ? 'Empate na sua equipe · só as empatadas' : 'Toque para ler; vote no botão', tipo === 'prorrogacao' ? 'Empate: conversem' : d.rodada.titulo, { lado: cronometro(d) }),
      d.contexto ? el('div', { classe: 'contexto-familia', role: 'note' }, [
        el('p', { classe: 'contexto-rotulo', texto: `Na casa ${persona ? `de ${persona}` : 'da sua persona'}` }),
        el('p', { classe: 'contexto-texto', texto: d.contexto }),
      ]) : null,
      pressao.length > 0 ? el('div', { classe: 'pressao' }, pressao) : null,
      movido,
      el('div', { classe: 'opcoes-aluno', role: 'group', 'aria-label': `Opções da rodada (${opcoes.length})` }, opcoes),
      nota(d.motivo ? MOTIVOS_SEM_VOTO[d.motivo] : null),
      nota(forcada),
      notaDoEnvio(envio, escolhido ? `Seu voto: ${letraDe(d.rodada.id, escolhido)} · registrado.` : null) || nota(app.ui.nota),
      // A dica do toque que não vota (D-055) fica aqui, depois das opções: acima
      // delas, a linha a mais empurrava a letra D para baixo da dobra em 360×740.
      el('p', { classe: 'texto-2', texto: `Toque numa opção para ler a explicação; o voto só vale no “Votar nesta”. Os números são os votos da ${s?.equipe?.nome || 'sua equipe'}. Vale a mais votada; dá para mudar até o apresentador encerrar.` }),
      s ? el('details', { classe: 'situacao-resumo' }, [
        el('summary', { texto: `Situação de ${persona || 'sua persona'}` }),
        el('div', { classe: 'situacao-corpo' }, [linhaFamilia(s.persona), contaDoMes(s.mes, s.persona)]),
        listaIndicadores(s.indicadores),
      ]) : null,
      aviso,
    ]));
    return tipo;
  }

  // A explicação da opção aberta (D-055): a narrativa do jeito da persona da
  // equipe (D-054; o celular não recebe a narrativa da telaDoAluno, que manda
  // só id, rótulo e votos, e a busca no conteúdo pela mesma regra do telão) e o
  // "Votar nesta". Na opção que já tem o voto, uma frase no lugar do botão.
  function detalheDaOpcao(d, op, { idDetalhe, personaId, minha, envio, enviando, pendenteBase, movido }) {
    const { el, botao } = D();
    const { narrativa } = N().historia.textoDaOpcao(app.dados.conteudo, d.rodada.id, op.id, personaId);
    let confirmacao;
    let aviso = null;
    if (!minha) {
      confirmacao = botao('Votar nesta', () => votar({ ...pendenteBase, opcao: op.id }), {
        classe: 'botao-primario botao-votar', desabilitado: !d.podeVotar || enviando, dados: { votar: op.id },
      });
      // O porquê fica logo abaixo do botão tocado. No teste de 30/09, a recusa
      // só aparecia numa nota embaixo da lista (fora da tela em 360×740), o
      // botão ficava igual, e o "Votar nesta" parecia quebrado. O mesmo para o
      // botão apagado (entrou depois, pausado): sem o motivo à vista, parecia defeito.
      if (!d.podeVotar) aviso = avisoDaOpcao(MOTIVOS_SEM_VOTO[d.motivo], 'info');
      else if (envio?.estagio === 'recusado' && envio.pendente.opcao === op.id) {
        const r = recusaParaTela(envio);
        aviso = avisoDaOpcao(r.texto, r.tipo);
      } else if (envio?.estagio === 'falhou' && envio.pendente.opcao === op.id) {
        aviso = avisoDaOpcao('Não foi possível enviar o voto: toque de novo em “Votar nesta”.', 'erro');
      } else if (movido) aviso = avisoDaOpcao(movido, 'erro');
    } else {
      let texto = 'Seu voto está nesta.';
      if (enviando) texto = 'Enviando o seu voto nesta…';
      else if (envio?.estagio === 'guardado') texto = 'Seu voto nesta está guardado no aparelho.';
      else if (envio?.estagio === 'esperaRetomar') texto = 'Seu voto nesta está guardado: vai sozinho quando o apresentador retomar.';
      confirmacao = el('p', { classe: 'opcao-votada', texto });
    }
    return el('div', { classe: 'opcao-detalhe', id: idDetalhe, dados: { detalhe: op.id } }, [
      narrativa ? el('p', { classe: 'opcao-narrativa', texto: narrativa }) : null,
      confirmacao,
      aviso,
    ]);
  }

  // A nota de sempre (mesmo estilo), dentro da opção aberta, com a classe
  // própria para o e2e achar a do botão, e não a do fim da lista.
  function avisoDaOpcao(texto, tipo) {
    if (!texto) return null;
    const n = nota(texto, tipo);
    n.classList.add('opcao-aviso');
    return n;
  }

  // Uma aberta por vez: tocar na aberta fecha, tocar noutra troca. A que abriu
  // rola para a vista depois do desenho (rolarParaAberta).
  function alternarOpcao(id) {
    app.ui.aberta = app.ui.aberta === id ? null : id;
    app.ui.rolarAte = app.ui.aberta;
    desenhar();
  }

  // Só logo depois de abrir, e nunca a cada desenho: a contagem ao vivo redesenha
  // a tela a cada voto da equipe, e puxar a rolagem ali tiraria o aluno do lugar.
  // O scroll-margin do CSS desconta o topo fixo e o aviso "Mais opções abaixo".
  function rolarParaAberta() {
    const id = app.ui.rolarAte;
    app.ui.rolarAte = null;
    if (!id) return;
    const alvo = [...app.el.tela.querySelectorAll('[data-opcao-bloco]')].find((n) => n.dataset.opcaoBloco === id);
    const suave = !raiz.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    alvo?.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
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
    let mostrar = Boolean(ultima) && ultima.getBoundingClientRect().bottom > raiz.innerHeight + 1;
    // D-055: o "Votar nesta" da opção aberta nunca fica atrás do aviso fixo, nem
    // a explicação logo abaixo dele (voto recusado, botão apagado). A faixa do
    // aviso é medida com ele à mostra (a altura muda com a área segura do
    // iPhone); trocar o hidden duas vezes no mesmo quadro não pisca.
    const alvos = [...app.el.tela.querySelectorAll('[data-detalhe] [data-votar], [data-detalhe] .opcao-votada, [data-detalhe] .opcao-aviso')];
    if (mostrar && alvos.length > 0) {
      const topo = Math.min(...alvos.map((n) => n.getBoundingClientRect().top));
      const baixo = Math.max(...alvos.map((n) => n.getBoundingClientRect().bottom));
      const estava = aviso.hidden;
      aviso.hidden = false;
      const topoAviso = aviso.getBoundingClientRect().top;
      aviso.hidden = estava;
      if (baixo > topoAviso && topo < raiz.innerHeight) mostrar = false;
    }
    if (aviso.hidden === mostrar) aviso.hidden = !mostrar;
  }

  function rolarAteUltimaOpcao() {
    const ultima = ultimaOpcao();
    if (!ultima) return;
    const suave = !raiz.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // A última aberta desce com a explicação e o "Votar nesta" junto.
    (ultima.closest('.opcao-aluno') || ultima).scrollIntoView({ block: 'end', behavior: suave ? 'smooth' : 'auto' });
  }

  function telaSorteando(alvo, d) {
    const { el, acrescentar } = D();
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]),
      cabecalho(d.rodada?.titulo || 'Rodada', 'Sorteando…'),
      el('p', { classe: 'texto', texto: 'Olhe o telão: a decisão mudou o tamanho das fatias, e a sorte escolhe a fatia.' }),
      notaDaRecusaDaEtapa() || nota(app.ui.nota),
    ]));
    return 'sorteando';
  }

  // O resultado da rodada no celular (D-065), o mesmo padrão da situação: a
  // carta, a decisão em uma linha, o saldo do mês em destaque (verde se
  // positivo, vermelho se negativo, sempre com o sinal) e a dívida de hoje. A
  // conta inteira (D-044, D-052, D-059), a narrativa da decisão e o custo da
  // carta ficam recolhidos; a energia e a proteção, com a variação do mês, ficam
  // à vista (são duas linhas, e mudam a sorte do mês seguinte, D-051).
  function telaResultado(alvo, d) {
    const { el, acrescentar } = D();
    const grave = d.carta?.tom === 'grave';
    const mes = d.mes;
    const persona = personaDaEquipe(d.equipe?.id);
    const indicadores = listaIndicadores(d.indicadores, d.delta, { semDinheiro: true });
    acrescentar(alvo, el('section', { classe: 'bloco', dados: { tom: grave ? 'grave' : 'normal', carta: d.carta?.id || '' } }, [
      el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]),
      cabecalho(`${d.rodada?.titulo || 'Rodada'} · a carta da equipe`, d.carta?.titulo || ''),
      // O voto que chegou depois do fechamento: o resultado não é o dele, e a
      // tela diz, logo no alto (o celular pode ter pulado a "votação encerrada").
      notaDaRecusaDaEtapa(),
      d.carta?.narrativa ? el('blockquote', { classe: 'narrativa', texto: d.carta.narrativa }) : null,
      el('p', { classe: 'decisao-linha' }, ['Decisão: ', el('b', { texto: descreverDecisao(d.rodada?.id, d.decisao, d.origem) })]),
      Number.isFinite(mes?.saldoMes)
        ? el('p', { classe: 'saldo-destaque', dados: { saldoMes: mes.saldoMes, sinal: sinalDe(mes.saldoMes) } }, [
          el('span', { classe: 'saldo-rotulo', texto: `Saldo ${periodo().doPeriodo}` }),
          valorSaldo(mes.saldoMes),
        ])
        : null,
      // D-067: a proteção que passou do trabalho é ponto de debate da aula, e
      // fica à vista, logo abaixo do saldo; a conta recolhida não a repete.
      linhaAcimaDoTrabalho(d.protecaoDoMes, persona?.nome, 'acima-trabalho'),
      blocoDivida(dividaDe(valoresDe(d.indicadores)), mes),
      // D-066: o que faltou na mesa no bimestre e até agora, à vista e fora da
      // dívida. O acumulado vem do mês gravado; sem ele, do indicador.
      camposDoLimite(mes) ? linhaMesa(Number.isFinite(mes.faltouNaMesaAcumulado) ? mes.faltouNaMesaAcumulado : valoresDe(d.indicadores).faltou_na_mesa, mes.faltouNaMesa) : null,
      recolhido(`resultado:${d.rodada?.id}`, `A conta ${periodo().doPeriodo} em detalhe`, [
        linhaCustoCarta(d.cartaCusto),
        d.decisao?.narrativa ? el('blockquote', { classe: 'narrativa', texto: d.decisao.narrativa }) : null,
        contaDoMes(mes, persona, d.deAntes, d.protecaoDoMes, { comAcima: false }),
      ]),
      indicadores ? [el('h2', { classe: 'subtitulo', texto: 'Como ficou' }), indicadores] : null,
    ]));
    return 'resultado';
  }

  function telaComparativo(alvo, d) {
    const { el, acrescentar } = D();
    // Enquanto a leitura do servidor não chegou, "carregando…", e nunca
    // "sem resposta": ausência de voto só depois de o servidor confirmar.
    const idEnquete = app.dados.estado?.enquete;
    const lendo = (m, a) => Boolean(app.votosLendo?.has(`${idEnquete}|${m}|${a}`));
    const voto = (v, m, a) => (v ? rotuloVoto(v) : lendo(m, a) ? 'carregando…' : 'sem resposta');
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      cabecalho(`Comparativo · ${d.enquete.titulo}`, 'Você antes e agora'),
      el('p', { classe: 'texto-2', texto: 'Só você vê esta tela. O telão mostra apenas os totais da turma.' }),
      el('ol', { classe: 'respostas' }, d.afirmacoes.map((a) => el('li', { classe: 'resposta', dados: { afirmacao: a.id } }, [
        el('p', { classe: 'resposta-texto', texto: a.texto }),
        el('p', { classe: 'resposta-voto' }, ['Você antes: ', el('b', { texto: voto(a.antes, 'antes', a.id) }), ', agora: ', el('b', { texto: voto(a.depois, 'depois', a.id) })]),
      ]))),
    ]));
    return 'comparativo';
  }

  // "O pior que podia acontecer" (D-059), o mesmo do telão: o pior caso com
  // as escolhas da equipe e, se ela escolheu uma proteção que o melhorou, sem
  // ela e quanto ela evitou. A regra do que aparece é a do núcleo
  // (historia.piorCasoDoPlacar): o "sem" nunca sai melhor que o "com". Antes,
  // o pior caso só existia no telão (revisão da F5, achado 10). Sem pior caso
  // (config sem proteção, sala antiga), sem o bloco.
  // comNota: false quando a mesma tela já explicou o estimado (o "Escolha ou
  // sorte?" logo acima, no placar final): a nota repetida era ruído.
  function blocoPiorCaso(p, { comNota = true } = {}) {
    if (!p) return null;
    const { el } = D();
    const linhas = [['Com as escolhas de vocês', F().moeda(p.comEscolhas)]];
    let nota = null;
    if (p.situacao === 'evitou') {
      linhas.push(['Sem a proteção', F().moeda(p.semProtecao)], ['A proteção evitou', F().moeda(p.evitou), 'placar-total']);
    } else if (p.situacao === 'naoMelhorou') nota = 'Nos meses jogados, a proteção não melhorou o pior caso.';
    else if (p.situacao === 'semEscolha') nota = 'Vocês não escolheram proteção.';
    return el('div', { classe: 'pior-caso', dados: { situacao: p.situacao, estimado: p.estimado ? '1' : '0' } }, [
      el('h2', { classe: 'subtitulo', texto: p.estimado ? 'O pior que podia acontecer (pior caso estimado)' : 'O pior que podia acontecer' }),
      el('dl', { classe: 'indicadores pior-caso-lista' }, linhas.flatMap(([k, v, classe]) => [el('dt', { classe, texto: k }), el('dd', { classe, texto: v })])),
      nota ? el('p', { classe: 'texto-2', texto: nota }) : null,
      p.estimado && comNota ? notaEstimado() : null,
    ]);
  }

  // Esquema v3: com 6 rodadas, os caminhos de cartas passam do limite do motor,
  // e o telão estima por simulação (a mesma semente em toda tela): a tela diz,
  // para ninguém tomar o número por exato.
  function notaEstimado() {
    return D().el('p', { classe: 'texto-2 nota-estimado', texto: 'Estimado: são caminhos de cartas demais para contar um por um, e o telão simulou milhares deles.' });
  }

  // O fim (D-065): o resumo mês a mês e a dívida no topo, o pior caso e a
  // história recolhida. Antes, a primeira linha era "Saldo acumulado da sua
  // equipe", o caixa gravado no placar: com o empréstimo, ele dizia R$ 1.500 a
  // mais do que a família tinha. O "ficou com" da última linha é o patrimônio.
  function telaFim(alvo, d) {
    const { el, acrescentar } = D();
    acrescentar(alvo, el('section', { classe: 'bloco' }, [
      d.equipe ? el('p', { classe: 'equipe-linha' }, [rotuloEquipe(d.equipe)]) : null,
      cabecalho(app.dados.conteudo?.titulo || 'Seminário da Viração', 'Obrigado pela participação'),
      resumoMesAMes(d.historia),
      blocoPiorCaso(d.piorCaso),
      blocoHistoria(d.historia, personaDaEquipe(d.equipe?.id)?.nome),
      el('p', { classe: 'texto-2', texto: 'Pode fechar esta página. Os votos individuais são apagados com a sala.' }),
    ]));
    return 'fim';
  }

  // ---------- Início ----------

  function iniciar() {
    const $ = (sel) => document.querySelector(sel);
    app.el = {
      tela: $('#tela'), cracha: $('#cracha'), faixaVersao: $('#faixa-versao'), faixaTelao: $('#faixa-telao'), selo: $('#lugar-selo'),
      barraEspectador: $('#barra-espectador'),
    };
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
    // Voltou de uma recarga no modo espectador (D-064): o campo do PIN desta
    // sala (o PIN só existia em memória), e nunca a entrada automática como
    // aluno, que gravaria membros/{uid}.
    const espectadorDe = normalizarSala(lerSessao('espectador'));
    if (!app.embutido && RE_SALA.test(espectadorDe)) {
      app.pedindoPin = true;
      app.codigo = espectadorDe;
    }
    // Os ouvintes vêm antes de qualquer desvio de entrada (revisão da F6c): o
    // return da volta pela recarga da CDN, abaixo, ficava antes deles, e o
    // celular entrava na sala sem o tique do cronômetro (o tempo do voto
    // parado na tela), sem reler o estado ao desbloquear a tela e sem conferir
    // a dobra do "Votar nesta".
    N().conexao.aoVoltarAVista(aoVoltarAVista);
    // A aba que fecha (ou sai para outra página) apaga o próprio pedido, sem
    // esperar o servidor notar a queda (revisão da F6b, achado 15). É o melhor
    // esforço: o pagehide não espera a escrita, e o "apague ao cair" cobre o
    // resto. O beforeunload fica de fora: ele tira a página do cache do
    // navegador, e o pagehide dispara nos mesmos casos.
    raiz.addEventListener('pagehide', apagarPedido);
    setInterval(tique, 1000);
    raiz.addEventListener('scroll', conferirDobra, { passive: true });
    raiz.addEventListener('resize', conferirDobra);

    const aposRecarga = lerSessao('entrarAposRecarga');
    if (aposRecarga) gravarSessao('entrarAposRecarga', '');
    if (!app.embutido && !app.pedindoPin && RE_SALA.test(daUrl) && aposRecarga === daUrl) {
      entrarNaSala(daUrl);
      return;
    }

    // Recarregar volta direto à sala (I6). Um QR novo, de outra sala, passa pela
    // tela de entrada: um toque em "Entrar".
    if (!app.embutido && !app.pedindoPin && RE_SALA.test(guardada) && (!RE_SALA.test(daUrl) || daUrl === guardada)) {
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
    // D-064: a equipe que o espectador vê, ou null fora do modo espectador.
    espectador: () => (app.espectador ? { equipe: app.espectador.equipe } : null),
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }
})(globalThis);
