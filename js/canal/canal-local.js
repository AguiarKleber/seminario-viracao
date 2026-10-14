// O canal local: a mesma interface do canal-firebase (contratos seção 6), com o
// banco inteiro em memória.
//
// Serve a três casos:
// - o telão offline (pendrive por file://, ou "Continuar sem celulares");
// - os testes e o simulador --memoria, sem rede;
// - o espelho do estado que o telão mantém para seguir sem internet.
//
// Por que imitar as regras do Firebase aqui: quem mais erra com o banco é o
// próprio anfitrião (gravar sem geracao + 1, regravar um resultado, apagar a
// semente). Se só as regras reais recusassem isso, o erro apareceria no ensaio
// com celulares, ou na aula. Com as travas, ele aparece no `npm test`.
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // O Firebase recusa esses caracteres numa chave. Recusar aqui também impede
  // que um id vindo de fora ("a/b", "x.y") monte um caminho diferente do pedido.
  const CHAVE_PROIBIDA = /[.#$[\]/]/;
  const RE_EQUIPE = /^e[0-9]{1,2}$/;
  const RE_ID = /^[a-z0-9_]{1,24}$/;

  // $outro: false das regras (arquitetura seção 6). Um campo novo no estado ou na
  // meta precisa entrar aqui E em firebase/regras.json, senão só um dos dois
  // modos funciona.
  const CHAVES_META = new Set(['hostUid', 'criadaEm', 'expiraEm', 'versaoApp', 'hashConfig', 'roteiro', 'entradaAberta']);
  const CHAVES_ESTADO = new Set([
    'geracao', 'indice', 'tipo', 'subfase', 'rodada', 'enquete', 'momento', 'afirmacao', 'abertoEm', 'prazo',
    'restanteMs', 'equipesTravadas', 'equipesAbertas', 'forcadas', 'empatadas', 'manual',
  ]);
  // O valor que firebase/regras.json aceita em regrasVersao (test/regras.test.mjs
  // confere que é o mesmo do regras.json e do telão, e que a versão está presa
  // ao conteúdo das regras).
  const REGRAS_VERSAO = 'v4';
  const LIVRES_PARA_LER = new Set(['meta', 'conteudo', 'estado', 'pulso', 'resultados', 'placar', 'enquetes', 'membros']);

  function negar(motivo) {
    return new Error('PERMISSION_DENIED: ' + motivo);
  }

  const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

  // Object.hasOwn a cada passo: um segmento "constructor" acharia o construtor de
  // Object num objeto comum e pareceria uma equipe ou afirmação existente.
  function em(arvore, segs) {
    let no = arvore;
    for (const s of segs) {
      if (!ehObjeto(no) || !Object.hasOwn(no, s)) return null;
      no = no[s];
    }
    return no === undefined ? null : no;
  }

  const clonar = (x) => (x === null || x === undefined ? null : structuredClone(x));

  function segmentos(caminho) {
    if (typeof caminho !== 'string') throw new TypeError('O caminho precisa ser texto.');
    const segs = caminho.split('/').filter((s) => s !== '');
    for (const s of segs) {
      if (CHAVE_PROIBIDA.test(s)) throw new Error(`Caminho inválido: "${caminho}".`);
    }
    return segs;
  }

  // O RTDB não guarda null nem nó vazio: gravar {} ou [] apaga. O motor e a tela
  // do celular já leem o conteúdo nesse formato; guardar o vazio aqui faria o
  // modo offline aceitar dado que o online perderia.
  function podar(valor) {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'number') {
      if (!Number.isFinite(valor)) throw new Error(`Número inválido para o banco: ${valor}.`);
      return valor;
    }
    if (typeof valor === 'string' || typeof valor === 'boolean') return valor;
    if (Array.isArray(valor)) {
      const itens = valor.map(podar);
      return itens.every((i) => i === null) ? null : itens;
    }
    if (typeof valor === 'object') {
      const saida = {};
      for (const [k, v] of Object.entries(valor)) {
        if (k === '' || CHAVE_PROIBIDA.test(k)) throw new Error(`Chave inválida para o banco: "${k}".`);
        const p = podar(v);
        if (p !== null) saida[k] = p;
      }
      return Object.keys(saida).length > 0 ? saida : null;
    }
    throw new TypeError(`Valor que o banco não guarda: ${typeof valor}.`);
  }

  function definirEm(arvore, segs, valor) {
    if (segs.length === 0) return valor ?? {};
    let no = arvore;
    for (const s of segs.slice(0, -1)) {
      if (!ehObjeto(no[s])) no[s] = {};
      no = no[s];
    }
    const ultimo = segs[segs.length - 1];
    if (valor === null) delete no[ultimo];
    else no[ultimo] = valor;
    return arvore;
  }

  const ehPrefixo = (a, b) => a.length <= b.length && a.every((s, i) => s === b[i]);

  // As folhas que mudaram sob um caminho. A regra é conferida folha a folha, e
  // não pelo caminho gravado: gravar salas/X/membros/u = { entrouEm, equipe }
  // não pode passar a equipe pela porta da entrada (ver conferirMembro).
  function folhasAlteradas(a, b, segs, saida) {
    if (ehObjeto(a) && ehObjeto(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        folhasAlteradas(Object.hasOwn(a, k) ? a[k] : null, Object.hasOwn(b, k) ? b[k] : null, [...segs, k], saida);
      }
    } else if (ehObjeto(a) && b === null) {
      for (const k of Object.keys(a)) folhasAlteradas(a[k], null, [...segs, k], saida);
    } else if (a === null && ehObjeto(b)) {
      for (const k of Object.keys(b)) folhasAlteradas(null, b[k], [...segs, k], saida);
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      saida.push(segs);
    }
    return saida;
  }

  // ---------- As travas (espelho de firebase/regras.json) ----------

  // ABERTO das regras: now <= prazo + graça. Sem prazo (etapa pausada), a regra
  // do Firebase dá falso, porque null + número não vale; aqui também.
  function etapaAberta(sala, estado, agora) {
    if (typeof estado.prazo !== 'number') return false;
    const graca = em(sala, ['conteudo', 'tempos', 'gracaSeg']);
    return agora <= estado.prazo + (typeof graca === 'number' ? graca : 0) * 1000;
  }

  function conferirMembro(ctx, alvo, campo, resto) {
    const { uid, sala, estado, agora, valor, host, novaSala } = ctx;
    const meta = sala.meta || {};
    const proprio = alvo === uid;
    const entradaOk = proprio && meta.entradaAberta === true && typeof meta.expiraEm === 'number' && agora < meta.expiraEm;
    if (resto.length > 0) throw negar(`campo desconhecido em membros: "${campo}/${resto.join('/')}"`);
    // O nó do membro, depois da escrita, é um objeto com entrouEm ou não existe
    // (revisão da F2, achados 1 e 3; .validate de membros/$uid no regras.json).
    // Sem isto, um texto solto no lugar do nó passava (não tem filhos para as
    // travas abaixo olharem), e gravar só a equipe criava um membro sem passar
    // pela entrada aberta nem pelo prazo da sala.
    const noNovo = em(novaSala, ['membros', alvo]);
    if (noNovo !== null && !(ehObjeto(noNovo) && typeof noNovo.entrouEm === 'number')) {
      throw negar('o nó do membro precisa ser um objeto com entrouEm (o registro de entrada)');
    }
    if (campo === undefined || campo === 'entrouEm') {
      if (!host && !entradaOk) throw negar('entrada fechada, sala expirada ou membro de outro uid');
      // entrouEm = now: é o que impede um aluno de forjar que entrou antes de a
      // decisão abrir (arquitetura seção 12, "forjar entrouEm"). Regravar a
      // mesma entrouEm passa, como no .validate do Firebase (data.val()).
      const antiga = em(sala, ['membros', alvo, 'entrouEm']);
      if (campo === 'entrouEm' && valor !== null && valor !== agora && valor !== antiga) throw negar('entrouEm precisa ser a hora do servidor');
      return;
    }
    if (campo === 'equipe') {
      // Mais estrito que o esboço: a equipe é conferida mesmo quando o nó inteiro
      // do membro é gravado, senão a porta da entrada trocaria de equipe depois
      // da trava. E o aluno só entra em equipe aberta pelo apresentador.
      if (!host) {
        if (!proprio) throw negar('equipe de outro uid');
        if (estado.equipesTravadas === true) throw negar('as equipes já estão travadas');
        if (valor !== null && em(estado, ['equipesAbertas', valor]) !== true) throw negar(`a equipe "${valor}" não está aberta`);
      }
      if (valor !== null && !(typeof valor === 'string' && RE_EQUIPE.test(valor) && em(sala, ['conteudo', 'equipes', valor]))) {
        throw negar(`equipe inexistente: "${valor}"`);
      }
      return;
    }
    throw negar(`campo desconhecido em membros: "${campo}"`);
  }

  function conferirVotoEnquete(ctx, [enq, momento, afirmacao, dono, ...resto]) {
    const { uid, sala, estado, agora, valor } = ctx;
    if (dono === undefined || resto.length > 0) throw negar('voto de enquete fora do formato');
    if (dono !== uid) throw negar('voto de enquete em nome de outro uid');
    if (!em(sala, ['membros', uid])) throw negar('voto de quem não é membro da sala');
    if (estado.tipo !== 'enquete' || estado.enquete !== enq || estado.momento !== momento || estado.subfase !== 'votando') {
      throw negar('a enquete não está em votação');
    }
    // Com o modo "uma_por_vez", só a afirmação que o telão mostra aceita voto.
    if (estado.afirmacao !== '*' && estado.afirmacao !== afirmacao) throw negar('afirmação fora da vez');
    if (!etapaAberta(sala, estado, agora)) throw negar('fora do prazo da votação');
    if (valor !== null && !(Number.isInteger(valor) && valor >= 1 && valor <= 5)) throw negar('voto precisa ser inteiro de 1 a 5');
    if (!em(sala, ['conteudo', 'enquetes', enq, 'afirmacoes', afirmacao])) throw negar('afirmação inexistente');
  }

  function conferirDecisao(ctx, [rodada, equipe, dono, ...resto]) {
    const { uid, sala, estado, agora, valor } = ctx;
    if (dono === undefined || resto.length > 0) throw negar('decisão fora do formato');
    if (dono !== uid) throw negar('decisão em nome de outro uid');
    const membro = em(sala, ['membros', uid]);
    if (!membro || membro.equipe !== equipe) throw negar('decisão em equipe que não é a sua');
    if (estado.tipo !== 'rodada' || estado.rodada !== rodada) throw negar('a rodada não está aberta');
    // Na prorrogação só as equipes empatadas votam, e só entre as opções
    // empatadas (acréscimo ao esboço das regras: estado.empatadas).
    const emProrrogacao = estado.subfase === 'prorrogacao' && em(estado, ['empatadas', equipe]) !== null;
    if (estado.subfase !== 'decidindo' && !emProrrogacao) throw negar('a decisão não está aberta para esta equipe');
    if (!(typeof membro.entrouEm === 'number' && typeof estado.abertoEm === 'number' && membro.entrouEm <= estado.abertoEm)) {
      throw negar('entrou depois de a decisão abrir');
    }
    if (!etapaAberta(sala, estado, agora)) throw negar('fora do prazo da decisão');
    if (valor !== null) {
      if (!(typeof valor === 'string' && RE_ID.test(valor) && em(sala, ['conteudo', 'rodadas', rodada, 'opcoes', valor]))) {
        throw negar(`opção inexistente: "${valor}"`);
      }
      if (emProrrogacao && em(estado, ['empatadas', equipe, valor]) !== true) throw negar('na prorrogação, só as opções empatadas');
    }
  }

  function conferirFolhaDaSala(ctx, no, resto) {
    const { uid, sala, host, novaSala, valor, agora, escrito, pinOk } = ctx;
    switch (no) {
      case 'meta':
        if (resto.length > 0 && !CHAVES_META.has(resto[0])) throw negar(`campo desconhecido em meta: "${resto[0]}"`);
        // Criar a sala: só com a meta ainda inexistente e o hostUid do próprio.
        if (host || (!sala.meta && em(novaSala, ['meta', 'hostUid']) === uid)) return;
        // Retomar em outra máquina (R6): com o PIN, a conta troca o hostUid para
        // si mesma, gravando exatamente meta/hostUid. No Firebase a permissão
        // vem desse caminho (hostUid .write: PIN_OK) e nunca de um filho: gravar
        // a meta inteira seria recusado mesmo mudando só o hostUid.
        if (pinOk && valor === uid && escrito.length === 4 && escrito[3] === 'hostUid') return;
        throw negar('só o anfitrião escreve em meta');
      case 'estado':
        if (!host) throw negar('só o anfitrião escreve o estado');
        if (resto.length > 0 && !CHAVES_ESTADO.has(resto[0])) throw negar(`campo desconhecido no estado: "${resto[0]}"`);
        return;
      case 'conteudo':
      case 'pulso':
      case 'placar':
      case 'sementes':
      case 'prorrogacoes':
      case 'resultados':
      case 'enquetes':
        if (!host) throw negar(`só o anfitrião escreve em ${no}`);
        return;
      case 'membros':
        return conferirMembro(ctx, resto[0], resto[1], resto.slice(2));
      case 'presenca':
        if (resto.length !== 1 || resto[0] !== uid) throw negar('presença de outro uid');
        if (!em(sala, ['membros', uid])) throw negar('presença de quem não é membro');
        if (valor !== null && valor !== agora) throw negar('presença precisa ser a hora do servidor');
        return;
      case 'votosEnquete':
        return conferirVotoEnquete(ctx, resto);
      case 'decisoes':
        return conferirDecisao(ctx, resto);
      default:
        throw negar(`nó desconhecido na sala: "${no}"`);
    }
  }

  // PIN_OK das regras: o PIN existe e o pedido do próprio uid é igual a ele,
  // lidos do dado ANTERIOR à escrita (root, nas regras). Offline não há PIN
  // (privado/ só existe no console), então ninguém assume uma sala do pendrive.
  function pinConfere(antigo, uid) {
    const pin = em(antigo, ['privado', 'pinApresentador']);
    return pin !== null && em(antigo, ['pedidosAnfitriao', uid]) === pin;
  }

  function conferirFolha(uid, segs, antigo, novo, agora, escrito) {
    const [topo, a, b, ...resto] = segs;
    const valor = em(novo, segs);
    if (topo === 'regrasVersao') {
      if (segs.length !== 2 || a !== uid || (valor !== null && valor !== REGRAS_VERSAO)) throw negar(`regrasVersao só aceita "${REGRAS_VERSAO}" no próprio uid`);
      return;
    }
    if (topo === 'pedidosAnfitriao') {
      const ok = segs.length === 2 && a === uid && (valor === null || (typeof valor === 'string' && valor.length >= 8 && valor.length <= 32));
      if (!ok) throw negar('pedido de anfitrião fora do formato');
      return;
    }
    if (topo !== 'salas' || b === undefined) throw negar(`escrita não permitida em "${segs.join('/')}"`);
    const sala = em(antigo, ['salas', a]) || {};
    const ctx = {
      uid, sala, valor, agora, escrito,
      pinOk: pinConfere(antigo, uid),
      novaSala: em(novo, ['salas', a]) || {},
      estado: sala.estado || {},
      host: em(sala, ['meta', 'hostUid']) === uid,
    };
    conferirFolhaDaSala(ctx, b, resto);
  }

  // As travas que olham o nó inteiro, e não cada folha. Valem sempre que a
  // escrita toca o nó, mesmo com o mesmo valor: no Firebase, regravar o estado
  // sem geracao + 1, ou regravar uma semente ou um resultado idênticos, é
  // recusado (a regra olha data/newData, e não se mudou). Aceitar aqui faria o
  // segundo anfitrião que conclui a mesma apuração passar offline e dar
  // PERMISSION_DENIED online (I7).
  function conferirNos(escritas, salasTocadas, antigo, novo) {
    // O nó foi tocado se a escrita caiu nele, dentro dele ou acima dele.
    const tocou = (alvo) => escritas.some(([segs]) => ehPrefixo(segs, alvo) || ehPrefixo(alvo, segs));
    for (const s of salasTocadas) {
      const velha = em(antigo, ['salas', s]) || {};
      const nova = em(novo, ['salas', s]) || {};
      const eA = velha.estado ?? null;
      const eN = nova.estado ?? null;
      if (eN !== null && tocou(['salas', s, 'estado'])) {
        const esperada = eA === null ? 1 : eA.geracao + 1;
        if (eN.geracao !== esperada) throw negar(`estado exige geracao ${esperada}, veio ${eN.geracao}`);
      }
      // A semente é gravada uma vez e nunca apagada, nem pelo desfazer: é ela que
      // faz o refazer tirar a mesma carta.
      for (const r of new Set([...Object.keys(velha.sementes || {}), ...Object.keys(nova.sementes || {})])) {
        if (!tocou(['salas', s, 'sementes', r])) continue;
        const a = em(velha, ['sementes', r]);
        const b = em(nova, ['sementes', r]);
        if (a !== null) throw negar(`a semente de ${r} já foi gravada e nunca muda`);
        if (b !== null && typeof b !== 'number') throw negar('semente precisa ser número');
      }
      // A marca de prorrogação segue a semente (D-035): o desfazer apaga o
      // resultado e as empatadas do estado, e só ela lembra que a rodada já teve
      // prorrogação. Apagada, refazer a rodada abriria uma segunda.
      for (const r of new Set([...Object.keys(velha.prorrogacoes || {}), ...Object.keys(nova.prorrogacoes || {})])) {
        if (!tocou(['salas', s, 'prorrogacoes', r])) continue;
        const a = em(velha, ['prorrogacoes', r]);
        const b = em(nova, ['prorrogacoes', r]);
        if (a !== null) throw negar(`a prorrogação de ${r} já foi marcada e nunca muda`);
        if (b !== null && b !== true) throw negar('a marca de prorrogação só aceita true');
      }
      // Resultado e apuração: gravados de uma vez, ou apagados; nunca remendados.
      const unicos = [];
      for (const r of new Set([...Object.keys(velha.resultados || {}), ...Object.keys(nova.resultados || {})])) unicos.push(['resultados', r]);
      for (const e of new Set([...Object.keys(velha.enquetes || {}), ...Object.keys(nova.enquetes || {})])) {
        const momentos = new Set([...Object.keys(em(velha, ['enquetes', e]) || {}), ...Object.keys(em(nova, ['enquetes', e]) || {})]);
        for (const m of momentos) unicos.push(['enquetes', e, m]);
      }
      for (const segs of unicos) {
        if (!tocou(['salas', s, ...segs])) continue;
        const a = em(velha, segs);
        const b = em(nova, segs);
        if (a !== null && b !== null) {
          throw negar(`${segs.join('/')} já foi gravado; só pode ser apagado`);
        }
      }
    }
  }

  // No Firebase, a permissão de escrita vem da regra do caminho gravado ou de um
  // ancestral, nunca de um filho: gravar salas/X/resultados inteiro é recusado
  // mesmo que resultados/{r} aceite. Este é o nível mais raso de cada nó.
  const NIVEL_MINIMO = {
    meta: 3, conteudo: 3, estado: 3, pulso: 3, placar: 3,
    membros: 4, presenca: 4, sementes: 4, prorrogacoes: 4, resultados: 4, enquetes: 5, decisoes: 6, votosEnquete: 7,
  };

  function exigirNivel(segs) {
    // Em salas/{S} mesmo, só apagar (tratado antes): gravar um objeto ali é recusado.
    const minimo = segs[0] === 'salas' ? (NIVEL_MINIMO[segs[2]] ?? 3) : 2;
    if (segs.length < minimo) throw negar(`escrita acima do nível permitido: "${segs.join('/')}"`);
  }

  function conferirEscrita(uid, escritas, antigo, novo, agora) {
    if (!uid) throw negar('sem login');
    const salasTocadas = new Set();
    for (const [segs, valor] of escritas) {
      if (segs[0] === 'salas' && segs.length >= 2) salasTocadas.add(segs[1]);
      // Apagar a sala inteira é a única escrita permitida em salas/{S} (e só o
      // anfitrião): é assim que o fim da aula remove os votos individuais.
      if (segs[0] === 'salas' && segs.length === 2 && valor === null) {
        if (em(antigo, ['salas', segs[1], 'meta', 'hostUid']) !== uid) throw negar('só o anfitrião apaga a sala');
        salasTocadas.delete(segs[1]);
        continue;
      }
      exigirNivel(segs);
      const folhas = folhasAlteradas(em(antigo, segs), em(novo, segs), segs, []);
      // Gravar o mesmo valor também passa pela regra, como no Firebase: reenviar
      // o voto depois do prazo, ou a equipe depois da trava, é recusado igual.
      if (folhas.length === 0) folhas.push(segs);
      // No Firebase, o .validate roda em todo filho do dado gravado, mudado ou
      // não. Regravar o nó do membro com a mesma equipe passa de novo pela regra
      // da equipe: depois da trava (ou com a equipe fechada), é recusado lá, e
      // aceitar aqui faria o offline divergir do online (paridade no emulador).
      const equipe = [...segs, 'equipe'];
      if (segs.length === 4 && segs[0] === 'salas' && segs[2] === 'membros' && em(novo, equipe) !== null
        && !folhas.some((f) => f.length === 5 && f[4] === 'equipe')) folhas.push(equipe);
      for (const folha of folhas) conferirFolha(uid, folha, antigo, novo, agora, segs);
    }
    conferirNos(escritas, salasTocadas, antigo, novo);
  }

  // A leitura também tem trava: o aluno não lê a semente, o voto alheio nem a
  // decisão de outra equipe. Como no Firebase, a permissão desce da raiz para os
  // filhos e nunca sobe: ler salas/X/decisoes/r1 inteiro é recusado ao aluno.
  function podeLer(uid, segs, arvore) {
    if (!uid) return false;
    if (segs[0] !== 'salas' || segs.length < 2) return false;
    const sala = em(arvore, ['salas', segs[1]]);
    if (em(sala, ['meta', 'hostUid']) === uid) return true;
    if (segs.length < 3) return false;
    const no = segs[2];
    if (LIVRES_PARA_LER.has(no)) return true;
    // Regras v4 (D-064): o celular do apresentador, com o PIN, lê a decisão de
    // qualquer equipe (o modo espectador), e continua sem ler a rodada inteira.
    if (no === 'decisoes') return segs.length >= 5 && (em(sala, ['membros', uid, 'equipe']) === segs[4] || pinConfere(arvore, uid));
    if (no === 'votosEnquete') return segs.length >= 7 && segs[6] === uid;
    return false;
  }

  // ---------- Persistência opcional ----------

  // localStorage pode não existir (Node), lançar (aba anônima, dado bloqueado) ou
  // voltar vazio. Nada disso pode impedir o telão offline de seguir em memória.
  function carregar(chave) {
    if (!chave) return null;
    try {
      const texto = raiz.localStorage ? raiz.localStorage.getItem(chave) : null;
      return texto ? podar(JSON.parse(texto)) : null;
    } catch {
      return null;
    }
  }

  function persistir(mundo) {
    if (!mundo.persistirEm) return;
    try {
      if (raiz.localStorage) raiz.localStorage.setItem(mundo.persistirEm, JSON.stringify(mundo.arvore));
    } catch {
      // Cota cheia ou armazenamento bloqueado: o canal segue em memória, e o
      // "Salvar estado (JSON)" continua sendo o seguro.
    }
  }

  // ---------- Ouvintes ----------

  function agendar(mundo, ouvinte) {
    if (ouvinte.agendado) return;
    ouvinte.agendado = true;
    // Assíncrono de propósito: no Firebase o aviso nunca chega dentro da própria
    // chamada de gravar. Um código que só funcionasse com o aviso síncrono
    // passaria nos testes e quebraria online.
    queueMicrotask(() => entregar(mundo, ouvinte));
  }

  function entregar(mundo, ouvinte) {
    ouvinte.agendado = false;
    if (!ouvinte.ativo) return;
    if (mundo.travas && !podeLer(ouvinte.uid, ouvinte.segs, mundo.arvore)) {
      // Como o Firebase: perdeu a permissão (aluno movido de equipe), o ouvinte é
      // cancelado e avisa pelo retorno de erro.
      ouvinte.ativo = false;
      mundo.ouvintes.delete(ouvinte);
      if (ouvinte.aoErro) ouvinte.aoErro(negar(`leitura de "${ouvinte.segs.join('/')}"`));
      return;
    }
    const valor = em(mundo.arvore, ouvinte.segs);
    const texto = JSON.stringify(valor);
    if (texto === ouvinte.ultimo) return;
    ouvinte.ultimo = texto;
    ouvinte.cb(clonar(valor));
  }

  // Todo ouvinte é reconferido a cada escrita, e não só os do caminho gravado:
  // mover um aluno de equipe (membros/…) muda a permissão de ler decisoes/…, e o
  // Firebase cancela esse ouvinte. entregar() só chama o retorno se o valor mudou.
  function notificar(mundo) {
    for (const ouvinte of mundo.ouvintes) agendar(mundo, ouvinte);
  }

  // ---------- Escrita ----------

  // Síncrona do começo ao fim: duas chamadas feitas no mesmo instante são
  // aplicadas uma depois da outra, e a segunda enxerga a primeira. É isso que faz
  // o compare-and-swap da transação valer entre dois anfitriões.
  function aplicarEscrita(mundo, uid, entradas) {
    const agora = mundo.relogio();
    const escritas = entradas.map(([c, v]) => [segmentos(c), podar(v)]);
    for (let i = 0; i < escritas.length; i += 1) {
      for (let j = 0; j < escritas.length; j += 1) {
        // O Firebase recusa um update com um caminho dentro de outro.
        if (i !== j && ehPrefixo(escritas[i][0], escritas[j][0])) throw new Error('Caminhos sobrepostos no mesmo gravar().');
      }
    }
    const antigo = mundo.arvore;
    let novo = structuredClone(antigo);
    for (const [segs, valor] of escritas) novo = definirEm(novo, segs, clonar(valor));
    novo = podar(novo) || {};
    if (mundo.travas) conferirEscrita(uid, escritas, antigo, novo, agora);
    mundo.arvore = novo;
    persistir(mundo);
    notificar(mundo);
  }

  function visao(mundo, uidInicial, uidAoEntrar) {
    let uid = uidInicial;

    function exigirLeitura(segs) {
      if (mundo.travas && !podeLer(uid, segs, mundo.arvore)) throw negar(`leitura de "${segs.join('/')}"`);
    }

    const canal = {
      async entrar() {
        if (!uid) uid = uidAoEntrar;
        return uid;
      },
      async ler(caminho) {
        const segs = segmentos(caminho);
        exigirLeitura(segs);
        return clonar(em(mundo.arvore, segs));
      },
      // aoErro é opcional (o Firebase também tem o retorno de cancelamento).
      ouvir(caminho, cb, aoErro) {
        const ouvinte = { segs: segmentos(caminho), cb, aoErro, uid, ativo: true, agendado: false, ultimo: undefined };
        mundo.ouvintes.add(ouvinte);
        agendar(mundo, ouvinte);
        return () => {
          ouvinte.ativo = false;
          mundo.ouvintes.delete(ouvinte);
        };
      },
      async gravar(mapa) {
        aplicarEscrita(mundo, uid, Object.entries(mapa));
      },
      async transacao(caminho, fn) {
        const segs = segmentos(caminho);
        exigirLeitura(segs);
        const novo = fn(clonar(em(mundo.arvore, segs)));
        if (novo === undefined) return { confirmado: false, valor: clonar(em(mundo.arvore, segs)) };
        aplicarEscrita(mundo, uid, [[caminho, novo]]);
        return { confirmado: true, valor: clonar(em(mundo.arvore, segs)) };
      },
      agora: () => mundo.relogio(),
      marcadorDeHora: () => mundo.relogio(),
      // O canal local nunca cai: avisa "conectado" uma vez, como o Firebase faz
      // logo depois de ligar o ouvinte de /.info/connected.
      aoMudarConexao(cb) {
        let ligado = true;
        queueMicrotask(() => {
          if (ligado) cb(true);
        });
        return () => {
          ligado = false;
        };
      },
      comoUsuario: (outro) => visao(mundo, outro, outro),
      // O seguro "Salvar estado (JSON)" e o "Carregar estado" do pendrive, que
      // por file:// é outra origem e não enxerga o localStorage do site.
      exportar: () => clonar(mundo.arvore) || {},
      importar(json) {
        const dado = typeof json === 'string' ? JSON.parse(json) : json;
        mundo.arvore = podar(dado) || {};
        persistir(mundo);
        notificar(mundo);
      },
    };
    return canal;
  }

  function criar(opcoes = {}) {
    const mundo = {
      arvore: carregar(opcoes.persistirEm) || {},
      ouvintes: new Set(),
      travas: opcoes.travas !== false,
      // Fora do núcleo, Date.now é permitido: offline, o relógio do notebook é o
      // "servidor". Os testes injetam um relógio controlado.
      relogio: opcoes.relogio || (() => Date.now()),
      persistirEm: opcoes.persistirEm || null,
    };
    return visao(mundo, null, opcoes.uid || 'apresentador-local');
  }

  V.canalLocal = { criar };
})(globalThis);
