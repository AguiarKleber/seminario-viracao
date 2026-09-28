// O canal do Firebase: a mesma interface do canal-local (contratos seção 6), sobre
// o Realtime Database com login anônimo. É o ÚNICO arquivo do site que conhece o
// Firebase.
//
// O SDK é INJETADO, e não importado aqui:
// - no navegador, o telão e o celular carregam por import() dinâmico os três
//   módulos da CDN gstatic (firebase-app, firebase-auth, firebase-database,
//   versão 12.19.0), só online e com tempo-limite de 4 s, e passam os módulos;
// - no Node (simulador e testes contra o emulador), o chamador passa o pacote
//   npm firebase@12.19.0 ('firebase/app', 'firebase/auth', 'firebase/database').
// Assim o mesmo arquivo serve aos dois, e o simulador exercita exatamente o
// código que roda no celular (arquitetura, seção 12).
//
// Script clássico (IIFE), e não módulo ES: o telão abre também por file://, e ali
// o Chrome e o Edge bloqueiam módulos. Sem o SDK, este arquivo só registra a
// fábrica e não faz nada.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // O emulador só existe na própria máquina. Aceitar outro host deixaria uma URL
  // adulterada apontar o celular para um banco qualquer sem regra nenhuma.
  const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost']);
  const EMULADOR_PADRAO = { host: '127.0.0.1', portaAuth: 9099, portaBanco: 9000 };
  // Quanto o ler() espera a conexão voltar antes de desistir. Sem conexão, o SDK
  // responderia com o cache de um ouvinte, que pode estar velho: a apuração
  // perderia votos que o servidor aceitou (red team, falha 1).
  const ESPERA_CONEXAO_MS = 10000;
  const CHAVE_PROIBIDA = /[.#$[\]]/;

  const FUNCOES_SDK = {
    app: ['initializeApp', 'deleteApp'],
    auth: ['getAuth', 'signInAnonymously', 'connectAuthEmulator'],
    database: [
      'getDatabase', 'ref', 'get', 'onValue', 'update', 'runTransaction', 'serverTimestamp',
      'connectDatabaseEmulator', 'goOffline', 'goOnline', 'forceLongPolling', 'onDisconnect',
    ],
  };

  // Nomes de app com um canal vivo neste contexto. Dois canais no mesmo app
  // dividiriam a conexão e o login sem ninguém perceber: o simulador acharia que
  // tem 20 celulares e teria um só.
  const appsEmUso = new Set();

  function conferirSdk(sdk) {
    const faltam = [];
    for (const [modulo, nomes] of Object.entries(FUNCOES_SDK)) {
      for (const n of nomes) if (typeof sdk?.[modulo]?.[n] !== 'function') faltam.push(`${modulo}.${n}`);
    }
    if (faltam.length > 0) throw new TypeError(`SDK do Firebase incompleto: falta ${faltam.join(', ')}.`);
  }

  // O canal-local recusa com Error('PERMISSION_DENIED: …'). O SDK usa textos
  // diferentes na escrita ("PERMISSION_DENIED: Permission denied") e no ouvinte
  // cancelado ("permission_denied at /…"). Quem chama (celular, telão,
  // simulador) confere um formato só, nos dois modos.
  function traduzirErro(erro) {
    const texto = `${erro?.code || ''} ${erro?.message || erro}`;
    if (/permission[_ ]denied/i.test(texto)) {
      const e = new Error('PERMISSION_DENIED: ' + String(erro?.message || erro).replace(/^PERMISSION_DENIED:\s*/i, ''));
      e.code = 'PERMISSION_DENIED';
      e.cause = erro;
      return e;
    }
    return erro instanceof Error ? erro : new Error(String(erro));
  }

  function normalizarCaminho(caminho) {
    if (typeof caminho !== 'string') throw new TypeError('O caminho precisa ser texto.');
    const segs = caminho.split('/').filter((s) => s !== '');
    for (const s of segs) if (CHAVE_PROIBIDA.test(s)) throw new Error(`Caminho inválido: "${caminho}".`);
    return segs;
  }

  const ehPrefixo = (a, b) => a.length <= b.length && a.every((s, i) => s === b[i]);

  function alvoDoEmulador(opcoes) {
    if (!opcoes.emulador) return null;
    // Só o chamador sabe se está na máquina de desenvolvimento (location do
    // navegador, ou o simulador). Sem essa afirmação explícita, um parâmetro na
    // URL publicada não pode desviar o celular para o emulador.
    if (opcoes.ambienteLocal !== true) {
      throw new Error('O emulador só é permitido em ambiente local: passe ambienteLocal: true.');
    }
    const alvo = { ...EMULADOR_PADRAO, ...(typeof opcoes.emulador === 'object' ? opcoes.emulador : {}) };
    if (!HOSTS_LOCAIS.has(alvo.host)) throw new Error(`Emulador fora da máquina local: "${alvo.host}".`);
    return alvo;
  }

  // criar({ sdk, conexao, longPolling?, emulador?, ambienteLocal?, nome?, esperaConexaoMs? })
  // - conexao: as chaves públicas do Firebase (conexao.json);
  // - longPolling: ?lp=1, para rede que bloqueia WebSocket (arquitetura, seção 10);
  // - nome: o nome do app. O padrão é fixo de propósito: no navegador o login
  //   anônimo fica guardado por nome de app, e um nome novo a cada carga daria um
  //   uid novo a cada recarregar (I6). O simulador passa um nome por robô.
  function criar(opcoes = {}) {
    const { sdk } = opcoes;
    conferirSdk(sdk);
    if (!opcoes.conexao || typeof opcoes.conexao !== 'object') throw new TypeError('conexao (as chaves públicas do Firebase) é obrigatória.');
    const nome = opcoes.nome || 'viracao';
    if (appsEmUso.has(nome)) throw new Error(`Já existe um canal aberto no app "${nome}": use outro nome ou feche o anterior.`);
    const emulador = alvoDoEmulador(opcoes);
    const esperaConexaoMs = opcoes.esperaConexaoMs ?? ESPERA_CONEXAO_MS;
    const A = sdk.auth;
    const D = sdk.database;

    const conexao = { ...opcoes.conexao };
    // O emulador acha o banco pelo namespace da URL; o projeto demo não tem uma.
    if (emulador && !conexao.databaseURL) conexao.databaseURL = `https://${conexao.projectId}-default-rtdb.firebaseio.com`;
    // Vale para todo o contexto e precisa vir antes da primeira conexão.
    if (opcoes.longPolling) D.forceLongPolling();

    const app = sdk.app.initializeApp(conexao, nome);
    appsEmUso.add(nome);
    const auth = A.getAuth(app);
    const db = D.getDatabase(app);
    if (emulador) {
      A.connectAuthEmulator(auth, `http://${emulador.host}:${emulador.portaAuth}`, { disableWarnings: true });
      D.connectDatabaseEmulator(db, emulador.host, emulador.portaBanco);
    }

    const referencia = (caminho) => D.ref(db, normalizarCaminho(caminho).join('/'));
    const internos = []; // ouvintes do próprio canal, desligados no fechar()
    let fechado = false;

    // Hora do servidor = relógio local + serverTimeOffset. Serve ao cronômetro e
    // ao prazo que o anfitrião grava; quem decide se o voto vale é o "now" da
    // regra (I5).
    let deslocamento = 0;
    internos.push(D.onValue(D.ref(db, '.info/serverTimeOffset'), (s) => {
      deslocamento = Number(s.val()) || 0;
    }));

    let conectado = false;
    const esperandoConexao = new Set();
    internos.push(D.onValue(D.ref(db, '.info/connected'), (s) => {
      conectado = s.val() === true;
      if (conectado) for (const avisar of esperandoConexao) avisar();
    }));

    function esperarConexao() {
      if (conectado) return Promise.resolve();
      return new Promise((resolver, rejeitar) => {
        const avisar = () => {
          clearTimeout(limite);
          esperandoConexao.delete(avisar);
          resolver();
        };
        const limite = setTimeout(() => {
          esperandoConexao.delete(avisar);
          rejeitar(new Error('SEM_CONEXAO: sem conexão com o servidor; a leitura não usa o cache.'));
        }, esperaConexaoMs);
        esperandoConexao.add(avisar);
      });
    }

    // A transação do SDK chama a função primeiro com o valor do cache local. Sem
    // cache, ela recebe null, o anfitrião devolve undefined ("estado sumiu") e a
    // transação aborta à toa (contratos, seção 7). Por isso cada caminho de
    // transação ganha um ouvinte fixo, e a primeira transação espera o primeiro
    // valor dele. Sem conexão, segue depois do limite: a transação aborta e o
    // anfitrião mostra o conflito, em vez de travar a tela.
    const ancoras = new Map();
    function ancorar(caminho) {
      const chave = normalizarCaminho(caminho).join('/');
      if (!ancoras.has(chave)) {
        ancoras.set(chave, new Promise((resolver) => {
          const limite = setTimeout(resolver, esperaConexaoMs);
          internos.push(D.onValue(D.ref(db, chave), () => {
            clearTimeout(limite);
            resolver();
          }, () => {
            clearTimeout(limite);
            ancoras.delete(chave);
            resolver();
          }));
        }));
      }
      return ancoras.get(chave);
    }

    const canal = {
      // Login anônimo invisível. No navegador o SDK guarda o usuário no
      // IndexedDB: recarregar a página devolve o mesmo uid.
      async entrar() {
        if (typeof auth.authStateReady === 'function') await auth.authStateReady();
        if (auth.currentUser) return auth.currentUser.uid;
        const credencial = await A.signInAnonymously(auth);
        return credencial.user.uid;
      },

      // Sempre do servidor (contratos, seção 6). O get() do SDK responde com o
      // cache de um ouvinte ativo, e esse cache só é confiável com a conexão de
      // pé (o servidor o mantém em dia, em ordem). Sem conexão, espera voltar.
      async ler(caminho) {
        const r = referencia(caminho);
        await esperarConexao();
        try {
          return (await D.get(r)).val();
        } catch (erro) {
          throw traduzirErro(erro);
        }
      },

      // O SDK pode chamar o retorno dentro do próprio onValue, quando o valor já
      // está em cache. O canal-local nunca faz isso (contratos, seção 6): a entrega
      // vai para uma microtarefa, e só quando o valor muda.
      ouvir(caminho, cb, aoErro) {
        const r = referencia(caminho);
        let ativo = true;
        let ultimo;
        const cancelar = D.onValue(r, (s) => {
          const valor = s.val();
          queueMicrotask(() => {
            if (!ativo) return;
            const texto = JSON.stringify(valor);
            if (texto === ultimo) return;
            ultimo = texto;
            cb(valor);
          });
        }, (erro) => {
          queueMicrotask(() => {
            if (!ativo) return;
            ativo = false;
            if (aoErro) aoErro(traduzirErro(erro));
          });
        });
        return () => {
          ativo = false;
          cancelar();
        };
      },

      // Um update na raiz: todos os caminhos passam juntos pela regra, ou nenhum.
      async gravar(mapa) {
        const entradas = Object.entries(mapa);
        const segs = entradas.map(([c]) => normalizarCaminho(c));
        for (let i = 0; i < segs.length; i += 1) {
          for (let j = 0; j < segs.length; j += 1) {
            if (i !== j && ehPrefixo(segs[i], segs[j])) throw new Error('Caminhos sobrepostos no mesmo gravar().');
          }
        }
        const atualizacao = {};
        entradas.forEach(([, valor], i) => {
          if (typeof valor === 'number' && !Number.isFinite(valor)) throw new Error(`Número inválido para o banco: ${valor}.`);
          atualizacao[segs[i].join('/')] = valor === undefined ? null : valor;
        });
        if (entradas.length === 0) return;
        try {
          await D.update(D.ref(db), atualizacao);
        } catch (erro) {
          throw traduzirErro(erro);
        }
      },

      // applyLocally: false para o telão nunca desenhar um estado que o servidor
      // ainda não aceitou.
      async transacao(caminho, fn) {
        const r = referencia(caminho);
        await ancorar(caminho);
        try {
          const res = await D.runTransaction(r, (atual) => fn(atual === undefined ? null : atual), { applyLocally: false });
          return { confirmado: res.committed, valor: res.snapshot.val() };
        } catch (erro) {
          throw traduzirErro(erro);
        }
      },

      agora: () => Date.now() + deslocamento,

      // O "true"/"false" de /.info/connected. O SDK avisa false logo ao ligar e
      // true quando conecta; repetições do mesmo valor não são repassadas.
      aoMudarConexao(cb) {
        let ativo = true;
        let ultimo;
        const cancelar = D.onValue(D.ref(db, '.info/connected'), (s) => {
          const valor = s.val() === true;
          queueMicrotask(() => {
            if (!ativo || valor === ultimo) return;
            ultimo = valor;
            cb(valor);
          });
        });
        return () => {
          ativo = false;
          cancelar();
        };
      },

      marcadorDeHora: () => D.serverTimestamp(),

      // ---------- Só no Firebase ----------

      // O ciclo de reconexão (arquitetura, seção 10): goOffline + goOnline
      // reinicia o recuo do SDK e derruba a conexão "zumbi" do iOS. Quando
      // chamar é política da tela (5 s sem conexão, página que voltou a ficar
      // visível), e não daqui.
      reconectar() {
        D.goOffline(db);
        D.goOnline(db);
      },

      // "Continuar sem celulares" (arquitetura, seção 11): só de ida.
      desconectar() {
        D.goOffline(db);
      },

      // A presença some sozinha quando o aparelho cai (arquitetura, seção 6). A
      // regra confere com o login de quem registrou.
      async apagarAoDesconectar(caminho) {
        try {
          await D.onDisconnect(referencia(caminho)).remove();
        } catch (erro) {
          throw traduzirErro(erro);
        }
      },

      uid: () => auth.currentUser?.uid ?? null,

      // Solta o app: o simulador abre e fecha dezenas deles. Encerra também a
      // sessão anônima: o deleteApp do SDK 12.19.0 não para o timer de
      // renovação do token que o database liga no auth, e o processo do Node
      // não termina. Por isso é só para o simulador e os testes; o celular
      // nunca chama fechar(), ou perderia o uid (I6).
      async fechar() {
        if (fechado) return;
        fechado = true;
        for (const desligar of internos) desligar();
        appsEmUso.delete(nome);
        D.goOffline(db);
        if (typeof A.signOut === 'function') await A.signOut(auth).catch(() => {});
        await sdk.app.deleteApp(app);
      },
    };
    return canal;
  }

  V.canalFirebase = { criar };
})(globalThis);
