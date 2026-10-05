// O telão: carrega o config, escolhe o canal, desenha cada passo do roteiro e
// recebe os comandos do apresentador (arquitetura, seções 3, 5, 9 e 11).
//
// Quem decide é o anfitrião (js/nucleo/anfitriao.js), o mesmo online e offline
// (invariante I7). Este arquivo só:
// - abre o canal (offline: canal-local persistente; online: ponto de encaixe em
//   abrirCanal, isolado de propósito);
// - ouve o banco e desenha a tela como função dos dados (I6);
// - traduz teclado e barra em chamadas do anfitrião, em fila, uma de cada vez.
//
// Nenhum timer muda o estado (D-007, D-010). O telão fica escondido atrás dos
// slides (Alt+Tab), e o navegador estrangula os timers de aba escondida: um
// fechamento por timer dispararia minutos depois. O único timer daqui redesenha o
// cronômetro e o atraso na barra; ao voltar à vista, o telão relê o estado.
//
// Script clássico (IIFE), sem módulos: o modo offline abre por file:// no
// pendrive, e ali o Chrome e o Edge bloqueiam módulos, import() e fetch.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});
  const N = () => raiz.Viracao; // os outros módulos são buscados na hora da chamada

  // Tem de ser igual ao ?v= das tags <script> do telao/index.html: é por ele que
  // se vê, na meta da sala, qual versão do telão criou a sala.
  const VERSAO_APP = '7';
  // Chaves do localStorage com a versão: um formato novo nunca lê o estado de um
  // telão velho como se fosse seu.
  const PREFIXO = `viracao:telao:v${VERSAO_APP}:`;
  const CHAVE_ULTIMA = PREFIXO + 'ultima';
  const ALFABETO_SALA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const RE_SALA = /^[A-HJ-NP-Z2-9]{4}$/;
  // O passador de slides e o dedo nervoso mandam dois Espaços seguidos: o
  // segundo pularia um passo inteiro (arquitetura, seção 5).
  const TRAVA_AVANCAR_MS = 1500;
  const SEGURAR_MS = 2000;
  const ESCONDER_BARRA_MS = 3000;
  // D-038: a barra só aparece com o mouse encostado nesta faixa de baixo (ou com
  // H). A qualquer movimento, ela cobria o que estava projetado.
  const BORDA_BARRA_PX = 48;
  const ATIVO_MS = 60000;
  const RODAPE_ENQUETE = 'Retrato desta turma, não pesquisa.';
  const LETRAS = 'ABCDEFGHIJ';

  const app = {
    el: {},
    config: null, validacao: null, hash: null, textoConfig: null, origemConfig: null,
    roteiroEscolhido: null, erroLeitura: null, lendo: true,
    modo: null, canal: null, anf: null, sala: null, nomeRoteiro: null, passos: null,
    estado: null,
    dados: { meta: null, membros: null, presenca: null, resultados: null, placar: null, enquetes: null, votos: null, decisoes: null },
    // Estado de interface (entra na chave do desenho): nada disto vai ao banco.
    // pagina: a página do comparativo e a do placar final (D-041).
    ui: { pagina: 0, afirmacaoManual: 0, lp: false },
    desligar: [], desligarPasso: [], chavePasso: null,
    chaveDesenho: null, graficos: new Map(),
    // Ajustes que precisam da tela já medida (o aperto do resultado da rodada),
    // rodados logo depois dos gráficos, a cada desenho.
    depoisDeMedir: [],
    ultimoAvanco: -Infinity, inicioPasso: null,
    selo: null, wake: null, barraTimer: 0, barraVisivel: false,
    // mouseNaBorda: o último movimento do mouse foi na faixa de baixo (sair dela
    // recomeça os 3 s da barra).
    mouseNaBorda: false,
    // Só online: a conexão (undefined = ainda não se sabe, e não recusa nada), a
    // hora da última reconexão forçada pelo próprio telão, a releitura adiada
    // para quando a rede voltar e o modo passivo (outra máquina assumiu).
    conectado: undefined, reconectouEm: 0, sincronizarAoVoltar: false, passivo: false,
    // "estado salvo às 14:05 (r2)": o último salvamento, mostrado na barra.
    ultimoSalvo: '',
    // O último "N ativos / M membros" desenhado (o tique compara com ele).
    ultimosAtivos: '',
  };

  // ---------- Utilidades ----------

  const D = () => N().dom;
  const G = () => N().graficos;
  const F = () => N().formatar;

  function lista(x) {
    if (Array.isArray(x)) return x;
    return x && typeof x === 'object' ? Object.values(x) : [];
  }
  const tem = (mapa, id) => Boolean(mapa) && typeof id === 'string' && Object.hasOwn(mapa, id);

  // localStorage pode lançar (dado bloqueado, aba anônima) ou voltar vazio: o
  // telão segue, e o "Salvar estado (JSON)" continua sendo o seguro.
  function lerLocal(chave) {
    try {
      const t = raiz.localStorage.getItem(chave);
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  function gravarLocal(chave, valor) {
    try { raiz.localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* segue em memória */ }
  }
  function apagarLocal(chave) {
    try { raiz.localStorage.removeItem(chave); } catch { /* nada a fazer */ }
  }
  function existeLocal(chave) {
    try { return raiz.localStorage.getItem(chave) !== null; } catch { return false; }
  }

  const chaveSessao = (sala) => `${PREFIXO}sala:${sala}`;
  const chavePassoLocal = (sala) => `${PREFIXO}passo:${sala}`;
  const chaveBaixados = (sala) => `${PREFIXO}baixados:${sala}`;

  function aleatorioUint32() {
    return raiz.crypto.getRandomValues(new Uint32Array(1))[0];
  }

  function gerarSala() {
    const bytes = raiz.crypto.getRandomValues(new Uint8Array(4));
    return Array.from(bytes, (b) => ALFABETO_SALA[b % ALFABETO_SALA.length]).join('');
  }

  const agora = () => (app.canal ? app.canal.agora() : Date.now());

  // ---------- Fila de comandos ----------

  // Um comando de cada vez. Duas teclas rápidas (duas contagens manuais, por
  // exemplo) disparariam duas transições com a mesma geracao esperada, e a
  // segunda voltaria com CONFLITO. Em fila, a segunda parte do estado da primeira.
  //
  // Revisão da F2 (achados 22 e 23), o que a fila faz além disso:
  // - online sem conexão, o comando é recusado na hora. Enfileirado, ele ficava
  //   preso no update() do SDK (que não resolve sem rede) e travava a fila
  //   inteira, "Continuar sem celulares" e "Salvar estado" inclusive; e, quando
  //   a rede voltava, os presos eram aplicados em rajada;
  // - o comando online que não termina em ESPERA_SERVICO_MS libera a fila (a
  //   escrita pode ainda chegar quando a rede voltar: o aviso diz isso);
  // - opcoes.geracao: a geracao que o apresentador via ao apertar a tecla. Se o
  //   estado mudou até o comando rodar, ele é descartado. Sem isto, um Enter dado
  //   no lobby rodava depois do Espaço e fechava a enquete recém-aberta, sem a
  //   confirmação do tempo mínimo de conversa;
  // - o comando vale para o anfitrião da hora da tecla: se a sessão trocou
  //   (seguiu sem celulares, voltou à abertura), ele é descartado;
  // - "Continuar sem celulares" e "Salvar estado" nem passam por aqui (socorro).
  let fila = Promise.resolve();
  function executar(fn, { geracao } = {}) {
    if (app.passivo) {
      avisar(AVISO_PASSIVO, 'erro');
      return Promise.resolve();
    }
    if (semConexao()) {
      avisar(AVISO_SEM_CONEXAO, 'erro');
      return Promise.resolve();
    }
    const anf = app.anf;
    const online = app.modo === 'online';
    const p = fila.then(() => {
      if (app.anf !== anf) throw new Error('ESTADO_MUDOU: a sessão mudou antes de o comando rodar.');
      if (geracao !== undefined && app.estado?.geracao !== geracao) throw new Error('ESTADO_MUDOU: o estado mudou antes de o comando rodar.');
      const r = fn();
      return online ? comLimite(Promise.resolve(r), ESPERA_SERVICO_MS, 'SEM_RESPOSTA: o serviço não respondeu.') : r;
    });
    fila = p.catch(() => {});
    p.catch(mostrarErro);
    return p;
  }

  // A geracao que o apresentador vê agora: é o que os comandos que dependem do
  // passo atual levam para a fila.
  const vista = () => ({ geracao: app.estado?.geracao });

  const AVISO_SEM_CONEXAO = 'Sem conexão com o serviço: o comando não foi enviado. Espere o selo voltar a "conectado", ou siga sem celulares.';
  const AVISO_PASSIVO = 'Outra máquina assumiu esta sala com o PIN: este telão só acompanha. Para voltar a comandar daqui, recarregue e retome com o PIN.';

  // Online, com o selo em "reconectando" por queda de verdade. A reconexão que o
  // próprio telão força ao voltar à vista (sincronizar) derruba a conexão por um
  // instante: ali o comando espera na fila, com o tempo-limite.
  function semConexao() {
    if (app.modo !== 'online' || app.conectado !== false) return false;
    return Date.now() - app.reconectouEm > CONEXAO_LENTA_MS;
  }

  function traduzirErro(msg) {
    const m = String(msg || '');
    if (/^ESTADO_MUDOU/.test(m)) return 'O estado mudou antes de o comando rodar: confira a tela e repita, se ainda quiser.';
    if (/^SEM_RESPOSTA/.test(m)) return 'O serviço não respondeu em 10 s: o comando pode chegar quando a rede voltar. Confira a tela antes de repetir.';
    if (/^SEM_CONEXAO/.test(m)) return 'Sem conexão com o serviço: o telão relê o estado quando a rede voltar.';
    if (/^Votação aberta/.test(m)) return 'Votação aberta: quem fecha é o apresentador (Enter).';
    if (/^Nada para encerrar/.test(m)) return 'Não há votação aberta neste passo.';
    if (/^Nada para desfazer/.test(m)) return 'Nada para desfazer neste passo.';
    if (/^Fim do roteiro/.test(m)) return 'Este é o último passo do roteiro.';
    if (/^Não há votação aberta/.test(m)) return 'Não há votação aberta.';
    if (/^Encerre a votação/.test(m)) return 'Encerre a votação (Enter) antes de pular.';
    return m;
  }

  function mostrarErro(erro) {
    avisar(traduzirErro(erro && erro.message ? erro.message : erro), 'erro');
  }

  let avisoTimer = 0;
  // O aviso some sozinho: é só interface, não muda nada no estado.
  //
  // Em sessão, todo aviso é conversa com o apresentador ("Enter encerra…",
  // "Totais exportados…", "Laranja sempre joga"), e fica junto da barra oculta
  // (D-047): o CSS só o mostra com a barra aberta, logo acima dela. Solto no
  // topo, ele ficava de 4 a 7 s no projetor (revisão de 29/09). Por isso ele
  // dura mais em sessão (quem apertou uma tecla com a barra escondida ainda o
  // lê ao abri-la com H), e o erro abre a barra: o comando recusado não pode
  // passar calado. Na abertura (antes de projetar), o aviso continua no topo.
  function avisar(texto, tipo = 'info') {
    const a = app.el.aviso;
    if (!a) return;
    a.textContent = texto;
    a.dataset.tipo = tipo;
    a.hidden = false;
    const emSessao = document.body.classList.contains('em-sessao');
    if (emSessao && tipo === 'erro') mostrarBarra();
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => { a.hidden = true; }, emSessao ? 15000 : (tipo === 'erro' ? 7000 : 4000));
  }

  // ---------- Modal (confirmação e escolhas) ----------

  // <dialog> nativo: Esc cancela e o foco fica preso nele. Um window.confirm
  // tiraria o navegador da tela cheia no projetor.
  function abrirModal(titulo, corpo, botoes) {
    const { el, botao, limpar } = D();
    const dlg = app.el.modal;
    return new Promise((resolver) => {
      let feito = false;
      const fechar = (valor) => {
        if (feito) return;
        feito = true;
        dlg.close();
        resolver(valor);
      };
      limpar(dlg);
      const areaBotoes = el('div', { classe: 'modal-botoes' });
      let primario = null;
      let focado = null;
      for (const b of botoes) {
        const bt = botao(b.rotulo, () => fechar(b.valor), { classe: [b.primario ? 'botao-primario' : null, b.classe], desabilitado: b.desabilitado });
        if (b.primario) primario = bt;
        if (b.foco) focado = bt;
        areaBotoes.appendChild(bt);
      }
      D().acrescentar(dlg, [el('h2', { texto: titulo }), corpo, areaBotoes]);
      dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(null); }, { once: true });
      dlg.showModal();
      (dlg.querySelector('[autofocus]') || focado || primario || areaBotoes.querySelector('button:not([disabled])'))?.focus();
    });
  }

  // focarCancelar: nas confirmações que cortam a conversa das equipes, desfazem
  // uma apuração ou descartam votos (revisão da F2, achado 15). Com o foco no
  // botão de confirmar, a tecla repetida (ou o Enter impaciente) confirmava sem
  // o apresentador perceber; com o foco no "Cancelar", confirmar pede um Tab ou
  // um clique.
  function confirmar(texto, rotuloOk = 'Confirmar', { focarCancelar = false } = {}) {
    return abrirModal(texto, null, [
      { rotulo: 'Cancelar', valor: false, foco: focarCancelar },
      { rotulo: rotuloOk, valor: true, primario: true },
    ]).then((v) => v === true);
  }

  function escolher(titulo, opcoes, { explicacao } = {}) {
    const { el } = D();
    const corpo = explicacao ? el('p', { classe: 'modal-texto', texto: explicacao }) : null;
    return abrirModal(titulo, corpo, [
      ...opcoes.map((o) => ({ rotulo: o.rotulo, valor: o.valor, classe: ['botao-opcao', o.marcada ? 'botao-marcado' : null], desabilitado: o.desabilitado })),
      { rotulo: 'Cancelar', valor: null, classe: 'botao-cancelar' },
    ]);
  }

  // ---------- Config e roteiro ----------

  const passoDe = (e) => (app.passos && e ? app.passos[e.indice] : null);
  const equipesOrdem = () => lista(app.config.ordem.equipes);
  const numeroEquipe = (id) => equipesOrdem().indexOf(id) + 1;

  // Teste do Kleber de 05/10 (prints 12 a 14): o telão chamava a equipe pelo
  // nome da cor ("1 Laranja"), e a sala não ligava a cor ao personagem que
  // estava jogando. Agora a equipe aparece pelo personagem, "Jonas, motoboy",
  // com a forma e a cor na frente (são elas que ligam a equipe do telão à do
  // celular) e o número (o das teclas e dos modais do apresentador). A cor por
  // extenso fica na formação das equipes (cor: true), onde o aluno escolhe a
  // equipe pela cor, e na dica (title). O nome e o ofício são pedaços inteiros:
  // numa coluna estreita (a célula da decisão, a coluna da equipe no resultado),
  // o rótulo só quebra entre eles.
  function rotuloEquipe(id, classe, { cor = false } = {}) {
    const equipe = app.config.equipes[id];
    const rotulo = G().rotuloEquipe(equipe, numeroEquipe(id), { classe });
    const persona = personaDaEquipe(id);
    const nome = rotulo.querySelector('.equipe-nome');
    if (cor || !persona || !nome) return rotulo;
    const oficio = oficioDe(persona);
    D().acrescentar(D().limpar(nome), [
      D().el('span', { classe: 'equipe-quem', texto: oficio ? `${persona.nome},` : persona.nome }),
      oficio ? [' ', D().el('span', { classe: 'equipe-oficio', texto: oficio })] : null,
    ]);
    nome.setAttribute('title', equipe.nome);
    return rotulo;
  }

  // O ofício do personagem, para o rótulo da equipe: o começo da descrição da
  // persona no config (até a primeira vírgula ou ponto, primeiroTrecho),
  // cortado antes da primeira preposição ou "e", com a primeira letra
  // minúscula. Com o config de 05/10: "Motoboy, 34 anos…" → "motoboy";
  // "Manicure por aplicativo" → "manicure"; "Motorista de aplicativo na 99 e na
  // Uber" → "motorista"; "Influenciadora de beleza" → "influenciadora";
  // "Entregador de bicicleta pelo iFood" → "entregador"; "Vende doces e
  // marmitas pelo Instagram" → "vende doces". O trecho inteiro ("Bruna,
  // influenciadora de beleza") não cabia na coluna da equipe do sorteio e do
  // resultado em 1024×768. O texto vem só do config (AGENTS.md, regra 1): para
  // mudar o ofício na tela, muda-se o começo da descrição.
  const RE_CORTE_OFICIO = /\s(?:de|do|da|dos|das|em|no|na|nos|nas|por|pelo|pela|pelos|pelas|com|e)\s/i;
  function oficioDe(persona) {
    const curto = primeiroTrecho(persona?.descricao).trim().split(RE_CORTE_OFICIO)[0].trim();
    // Só quando a segunda letra já é minúscula: uma sigla ("DJ") fica como está.
    return /^\p{Lu}\p{Ll}/u.test(curto) ? curto.charAt(0).toLowerCase() + curto.slice(1) : curto;
  }

  // "Jonas, motoboy": o personagem por extenso (a formação das equipes, ao lado
  // da cor).
  function nomeDoPersonagem(id) {
    const persona = personaDaEquipe(id);
    if (!persona) return '';
    const oficio = oficioDe(persona);
    return oficio ? `${persona.nome}, ${oficio}` : persona.nome;
  }
  const ativas = (e) => equipesOrdem().filter((id) => e && e.equipesAbertas && e.equipesAbertas[id] === true);
  const ordemOpcoes = (rodada) => (lista(rodada.ordemOpcoes).length > 0 ? lista(rodada.ordemOpcoes) : Object.keys(rodada.opcoes));
  const letraDe = (rodada, opcao) => LETRAS[ordemOpcoes(rodada).indexOf(opcao)] || '?';
  const ordemAfirmacoes = (enq) => (lista(enq.ordemAfirmacoes).length > 0 ? lista(enq.ordemAfirmacoes) : Object.keys(enq.afirmacoes));

  function rotuloMomento(m) {
    return { antes: 'antes', depois: 'depois' }[m] || null;
  }

  function descreverPasso(p) {
    const c = app.config;
    switch (p.tipo) {
      case 'lobby': return 'Entrada na sala';
      case 'enquete': return [c.enquetes[p.enquete]?.titulo, rotuloMomento(p.momento)].filter(Boolean).join(' · ');
      case 'bloco': return p.titulo || 'Apresentação';
      case 'formarEquipes': return 'Formação das equipes';
      case 'personas': return 'As personas';
      case 'rodada': return c.rodadas[p.rodada]?.titulo || 'Rodada';
      case 'placarFinal': return 'Placar final';
      case 'comparativo': return `Comparativo · ${c.enquetes[p.enquete]?.titulo || ''}`;
      case 'fim': return 'Fim';
      default: return p.tipo;
    }
  }

  // O número da rodada entre as rodadas do roteiro ("rodada 2 de 3").
  function posicaoRodada(rodadaId) {
    const rodadas = app.passos.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
    return { n: rodadas.indexOf(rodadaId) + 1, total: rodadas.length };
  }

  // Esquema v3 (D-060): quantos meses cada rodada cobre e como a tela chama o
  // período ("bimestre" com 6 rodadas de 2 meses). Com rodadas mensais, "mês",
  // e as telas dizem o que diziam. A regra mora no historia.js, que o celular
  // também carrega: as duas telas falam o mesmo período.
  const periodo = () => N().historia.periodo(app.config);

  // O nome curto da rodada ("Jan–fev"), pela posição dela no config: a mesma
  // regra da história e do resumo do celular (historia.rotuloDaRodada).
  function rotuloDaRodada(rodadaId) {
    const ordem = lista(app.config.ordem.rodadas);
    return N().historia.rotuloDaRodada(app.config.rodadas[rodadaId]?.titulo, Math.max(0, ordem.indexOf(rodadaId)));
  }

  // O estado da equipe antes de uma rodada: o "depois" da última rodada já
  // apurada, na ordem do roteiro. É a mesma conta do anfitrião; aqui serve só
  // para mostrar o efeito real da carta no resultado.
  function estadoAntes(equipe, rodadaId) {
    let estado = N().motor.estadoInicial(app.config, equipe);
    for (const p of app.passos) {
      if (p.tipo !== 'rodada') continue;
      if (p.rodada === rodadaId) break;
      const r = app.dados.resultados?.[p.rodada]?.[equipe];
      if (r) estado = r.depois;
    }
    return estado;
  }

  // As rodadas do roteiro antes desta, na ordem em que o anfitrião as aplica.
  function rodadasAntes(rodadaId) {
    const anteriores = [];
    for (const p of app.passos) {
      if (p.tipo !== 'rodada') continue;
      if (p.rodada === rodadaId) break;
      anteriores.push(p.rodada);
    }
    return anteriores;
  }

  // O histórico da equipe antes da rodada (decidiu/sorteou, D-043), a mesma conta
  // do anfitrião. Sem ele, o motor calcula outro mês quando o config tem
  // consequências que atravessam os meses (a parcela do empréstimo, o auxílio do
  // INSS que chega no mês seguinte ao acidente).
  const historicoAntes = (equipe, rodadaId) => N().motor.historicoDe(app.dados.resultados, equipe, rodadasAntes(rodadaId));

  // Ativo = membro com presença nos últimos 60 s. Só membro conta: a presença
  // de quem foi removido fica no banco, e o ouvinte da presença pode chegar
  // antes do de membros; sem o filtro, o "N ativos / M membros" mostraria mais
  // ativos que membros.
  function ativosAgora() {
    const t = agora();
    const ativos = new Set();
    for (const [u, p] of Object.entries(app.dados.presenca || {})) if (typeof p === 'number' && t - p <= ATIVO_MS && tem(app.dados.membros, u)) ativos.add(u);
    return ativos;
  }

  // "18 ativos / 21 membros" (arquitetura, seção 10): quem entrou e sumiu (aba
  // fechada, celular no bolso) continua membro, mas não conta no "todos
  // votaram". Só números: a tela é projetada, e nem uid nem crachá aparecem.
  function textoAtivos() {
    const ativos = ativosAgora().size;
    const membros = Object.keys(app.dados.membros || {}).length;
    return `${F().inteiro(ativos)} ${ativos === 1 ? 'ativo' : 'ativos'} / ${F().inteiro(membros)} ${membros === 1 ? 'membro' : 'membros'}`;
  }

  // ---------- Canal (ponto de encaixe do modo online) ----------

  // A escolha do canal fica toda aqui, isolada: o resto do telão só conhece a
  // interface comum (contratos, seção 6).
  // - offline: canal-local, persistido no localStorage por versão e sessão;
  // - online: canal-firebase, preparado uma vez por página (seção "Modo online",
  //   logo abaixo): conexao.json, SDK com tempo-limite, login e autoteste.
  async function abrirCanal(modo, { sala, uid } = {}) {
    if (modo === 'offline') {
      return N().canalLocal.criar({ persistirEm: chaveSessao(sala), uid: uid || undefined });
    }
    return abrirCanalOnline();
  }

  // ---------- Modo online (com celulares) ----------
  //
  // Tudo o que só existe com celulares: o SDK do Firebase, o autoteste das
  // regras, o PIN do apresentador, o pulso, o espelho local e a distribuição de
  // quem chega depois da trava. O anfitrião e as telas são os mesmos do offline
  // (I7); o que muda é o canal.

  // A mesma versão do npm usado pelo simulador e pelos testes (contratos, seção
  // 6): o celular e o simulador exercitam o mesmo SDK.
  const SDK_BASE = 'https://www.gstatic.com/firebasejs/12.19.0/';
  // Sem o SDK em 4 s, o apresentador decide ir sem celulares (red team, falha
  // 10): travar a abertura esperando a CDN do campus é pior que oferecer o offline.
  const SDK_LIMITE_MS = 4000;
  // Uma escrita que não confirma nisso é tratada como "sem conexão": o SDK
  // guardaria a escrita em memória para sempre, e a abertura ficaria parada.
  const ESPERA_SERVICO_MS = 10000;
  // Arquitetura, seção 10: a primeira conexão passar de 8 s é o sinal de rede
  // que estrangula WebSocket; o telão sugere a "Rede restrita" (?lp=1).
  const CONEXAO_LENTA_MS = 8000;
  // Tem de ser o mesmo valor que firebase/regras.json aceita em regrasVersao
  // (test/regras.test.mjs confere, e prende a versão ao conteúdo das regras).
  const REGRAS_VERSAO = 'v4';
  const CHAVE_ULTIMA_ONLINE = PREFIXO + 'ultimaOnline';
  const CAMPOS_CONEXAO = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  // O emulador (arquitetura, seção A, item 9) não precisa de chave de verdade:
  // o projeto "demo-" nunca fala com um projeto real.
  const CONEXAO_EMULADOR = { apiKey: 'chave-do-emulador', projectId: 'demo-seminario' };
  const MAX_SORTEIOS_SALA = 8;

  // fase: parado | preparando | pronto | indisponivel (tente de novo) |
  //       semConexao (sem conexao.json: só offline) | regras | encerrado
  const online = {
    fase: 'parado', mensagem: '', canal: null, uid: null, promessa: null, lento: false,
    // O PIN fica só em memória, digitado no notebook antes de projetar
    // (arquitetura, seção 6). Nunca vai para o localStorage nem para a tela.
    pin: '', salaRetomar: '', el: null,
  };

  const ehMaquinaLocal = () => ['localhost', '127.0.0.1'].includes(raiz.location.hostname);
  const parametro = (nome) => new URLSearchParams(raiz.location.search).get(nome);
  // ?emulador=1 só vale na própria máquina: numa URL publicada, um parâmetro não
  // pode desviar o telão para um banco sem regras (o canal-firebase confere de novo).
  const usaEmulador = () => parametro('emulador') === '1' && ehMaquinaLocal();
  const usaLongPolling = () => parametro('lp') === '1';

  // O limite conta só o tempo em que o telão ficou livre, esperando o serviço.
  // Revisão da F6d: no fechamento da 6ª rodada, o placar (a simulação das 6
  // equipes) trava a página de 4 a 8 s dentro da janela de 10 s; a gravação
  // chegava, mas o telão já tinha dito "o serviço não respondeu" diante da
  // turma, e um Enter repetido fechava a rodada de novo. Um tique a cada 250 ms
  // mede o atraso do próprio relógio: a página ocupada calculando não é espera.
  const TIQUE_LIMITE_MS = 250;
  function comLimite(promessa, ms, texto) {
    const inicio = Date.now();
    let ultimo = inicio;
    let ocupado = 0;
    let timer = 0;
    const limite = new Promise((_, rejeitar) => {
      timer = setInterval(() => {
        const agora = Date.now();
        const atraso = agora - ultimo - TIQUE_LIMITE_MS;
        if (atraso > 50) ocupado += atraso;
        ultimo = agora;
        if (agora - inicio - ocupado >= ms) rejeitar(new Error(texto));
      }, TIQUE_LIMITE_MS);
    });
    return Promise.race([promessa, limite]).finally(() => clearInterval(timer));
  }

  const recusado = (erro) => /PERMISSION_DENIED/.test(String(erro?.message || erro));

  async function lerConexao() {
    if (usaEmulador()) return { ...CONEXAO_EMULADOR };
    let conexao;
    try {
      // no-store pelo mesmo motivo do config.json: o cache de 10 min do GitHub Pages.
      const r = await raiz.fetch('../conexao.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      conexao = await r.json();
    } catch (erro) {
      const e = new Error(`Não foi possível ler o conexao.json (${erro.message}): só o modo sem celulares.`);
      e.semConexao = true;
      throw e;
    }
    const faltam = CAMPOS_CONEXAO.filter((k) => typeof conexao?.[k] !== 'string' || conexao[k] === '' || conexao[k].includes('COLE_AQUI'));
    if (faltam.length > 0) {
      const e = new Error(`O conexao.json ainda não foi preenchido (${faltam.join(', ')}): só o modo sem celulares.`);
      e.semConexao = true;
      throw e;
    }
    return conexao;
  }

  // O SDK é a ÚNICA coisa carregada por import() (AGENTS.md, regra 3), e só aqui,
  // online: por file:// o import() falha, e o offline nunca passa por esta função.
  async function carregarSdk() {
    const nomes = ['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'];
    const [app, auth, database] = await comLimite(
      Promise.all(nomes.map((n) => import(SDK_BASE + n))),
      SDK_LIMITE_MS,
      'o serviço (SDK do Firebase) não carregou em 4 s',
    );
    return { app, auth, database };
  }

  // Autoteste (arquitetura, seção 6): o canário TEM de ser recusado, e a versão
  // TEM de passar. Canário aceito = regras em modo de teste ("abertas"); versão
  // recusada = regras de outra versão publicadas. Nos dois casos a sala não é
  // criada. O teste nunca escreve em nenhuma sala.
  async function autotestarRegras(canal, uid) {
    let canarioPassou = false;
    try {
      await comLimite(canal.gravar({ [`autoteste/${uid}`]: true }), ESPERA_SERVICO_MS, 'sem resposta do serviço');
      canarioPassou = true;
    } catch (erro) {
      if (!recusado(erro)) throw erro;
    }
    let versaoPassou = true;
    try {
      await comLimite(canal.gravar({ [`regrasVersao/${uid}`]: REGRAS_VERSAO }), ESPERA_SERVICO_MS, 'sem resposta do serviço');
    } catch (erro) {
      if (!recusado(erro)) throw erro;
      versaoPassou = false;
    }
    return !canarioPassou && versaoPassou;
  }

  function definirOnline(fase, mensagem) {
    online.fase = fase;
    online.mensagem = mensagem;
    atualizarBlocoOnline();
  }

  // Uma vez por página: o canal-firebase usa um nome de app fixo (o uid anônimo
  // fica guardado por nome), e dois canais com o mesmo nome não convivem.
  async function prepararOnline() {
    definirOnline('preparando', usaEmulador() ? 'Conectando ao emulador local…' : 'Conectando ao serviço…');
    try {
      if (!online.canal) {
        const conexao = await lerConexao();
        const sdk = await carregarSdk();
        online.canal = N().canalFirebase.criar({
          sdk, conexao, longPolling: usaLongPolling(),
          emulador: usaEmulador() ? true : undefined, ambienteLocal: usaEmulador(),
        });
        vigiarPrimeiraConexao(online.canal);
      }
      online.uid = await comLimite(online.canal.entrar(), ESPERA_SERVICO_MS, 'sem resposta do serviço de login');
      if (!(await autotestarRegras(online.canal, online.uid))) {
        definirOnline('regras', 'REGRAS ABERTAS ou DESATUALIZADAS: não use. Publique o firebase/regras.json desta versão no console e recarregue.');
        return;
      }
      definirOnline('pronto', `${usaEmulador() ? 'Emulador local' : 'Serviço conectado'} · regras ${REGRAS_VERSAO} conferidas.`);
    } catch (erro) {
      if (erro.semConexao) definirOnline('semConexao', erro.message);
      else if (/too-many-requests/.test(String(erro.code || erro.message))) {
        definirOnline('indisponivel', 'Muitas contas novas nesta rede na última hora (limite do serviço). Espere alguns minutos ou siga sem celulares.');
      } else definirOnline('indisponivel', `Sem acesso ao serviço (${erro.message}). Siga sem celulares ou tente de novo.`);
    }
  }

  function vigiarPrimeiraConexao(canal) {
    let desligar = null;
    const timer = setTimeout(() => {
      online.lento = true;
      atualizarBlocoOnline();
      if (app.anf && app.modo === 'online') avisar('A conexão demorou mais de 8 s: se os celulares não entrarem, ligue "Rede restrita" na barra.');
    }, CONEXAO_LENTA_MS);
    desligar = canal.aoMudarConexao((ok) => {
      if (!ok) return;
      clearTimeout(timer);
      if (desligar) desligar();
    });
  }

  async function abrirCanalOnline() {
    if (online.fase === 'encerrado') throw new Error(online.mensagem);
    if (!online.promessa) online.promessa = prepararOnline();
    await online.promessa;
    if (online.fase !== 'pronto') throw new Error(online.mensagem || 'O modo com celulares não está disponível.');
    return online.canal;
  }

  // O PIN vai para pedidosAnfitriao/{uid}, que ninguém lê; a regra compara com
  // privado/pinApresentador. Só assim o servidor aceita criar a sala ou assumir
  // o hostUid em outra máquina.
  async function gravarPin(canal, motivo) {
    const pin = online.pin;
    if (!pin) throw new Error(`Digite o PIN do apresentador para ${motivo}.`);
    if (pin.length < 8 || pin.length > 32) throw new Error('O PIN do apresentador tem de 8 a 32 caracteres.');
    await comLimite(canal.gravar({ [`pedidosAnfitriao/${online.uid}`]: pin }), ESPERA_SERVICO_MS, 'sem resposta do serviço');
  }

  // O pedido vive só durante a operação (revisão da F2, achados 4 e 24). Deixado
  // no banco, ele dava ao uid anônimo daquele navegador um PIN_OK permanente:
  // qualquer pessoa que abrisse o site naquele perfil, dias depois, assumia
  // qualquer sala viva sem saber o PIN; e o telão antigo, só por voltar à vista,
  // tomava de volta a sala de quem tinha assumido. A regra permite apagar (o
  // .validate não roda no apagamento). Falhou o apagamento (rede): o pedido
  // fica, e a próxima criação ou retomada tenta de novo.
  async function apagarPedido(canal) {
    if (!online.uid) return;
    try {
      await comLimite(canal.gravar({ [`pedidosAnfitriao/${online.uid}`]: null }), ESPERA_SERVICO_MS, 'sem resposta do serviço');
    } catch {
      // Sem rede agora: não impede a sessão, que já está ligada (ou já falhou).
    }
  }

  function explicarRecusa(erro) {
    if (!recusado(erro)) return erro;
    return new Error('O servidor recusou: o PIN não confere com o cadastrado no console (privado/pinApresentador), ou ele ainda não foi cadastrado.');
  }

  // Uma aba escritora por máquina (invariante I3): duas abas do mesmo navegador
  // têm o mesmo uid anônimo, e as duas passariam na regra do anfitrião. A
  // transação na geracao evita estado corrompido, mas não a confusão de dois
  // telões mandando pulso e comandos. Devolve a função que solta a trava.
  //
  // Vale também no offline (revisão da F2, achado 26): duas abas com a mesma
  // sessão do pendrive gravavam a árvore inteira no mesmo localStorage, e a que
  // ficou para trás apagava as apurações da outra sem aviso.
  // esperarMs: espera a trava ser solta (a passagem do online para o offline,
  // que solta a trava e a pega de novo), em vez de recusar na hora.
  function travarAba(sala, { esperarMs = 0 } = {}) {
    if (!raiz.navigator.locks?.request) return Promise.resolve(() => {});
    const recusa = () => new Error(`A sala ${sala} já está aberta em outra aba deste navegador: use aquela aba.`);
    const opcoes = esperarMs > 0 && raiz.AbortSignal?.timeout ? { signal: raiz.AbortSignal.timeout(esperarMs) } : { ifAvailable: true };
    return new Promise((resolver, rejeitar) => {
      raiz.navigator.locks.request(`viracao:telao:${sala}`, opcoes, (trava) => {
        if (!trava) {
          rejeitar(recusa());
          return undefined;
        }
        return new Promise((soltar) => resolver(soltar));
      }).catch((erro) => rejeitar(erro?.name === 'AbortError' || erro?.name === 'TimeoutError' ? recusa() : erro));
    });
  }

  // Outra aba segura a sessão guardada? Então ela não é apagada daqui.
  async function salaEmUso(sala) {
    try {
      const { held = [] } = await raiz.navigator.locks.query();
      return held.some((x) => x.name === `viracao:telao:${sala}`);
    } catch {
      return false;
    }
  }

  async function ligarOnline(canal, sala, nomeRoteiro, criar) {
    const soltar = await travarAba(sala);
    try {
      await ligarSessao({ modo: 'online', canal, sala, nomeRoteiro, criar });
    } catch (erro) {
      soltar();
      throw erro;
    }
    depoisDeLigarOnline(soltar);
  }

  async function criarSalaOnline() {
    if (!app.config) throw new Error('Carregue um config.json válido antes.');
    const canal = await abrirCanal('online');
    await gravarPin(canal, 'criar a sala');
    try {
      // Código já usado por outra sala: o anfitrião recusa ("já existe"), e o
      // telão sorteia outro. Com 32^4 códigos, mais de uma volta é raro.
      let ultimo = null;
      for (let i = 0; i < MAX_SORTEIOS_SALA; i += 1) {
        try {
          await ligarOnline(canal, gerarSala(), app.roteiroEscolhido, true);
          return;
        } catch (erro) {
          if (!/já existe/.test(String(erro.message))) throw explicarRecusa(erro);
          ultimo = erro;
        }
      }
      throw ultimo;
    } finally {
      await apagarPedido(canal);
    }
  }

  // Recarregar o telão (mesmo uid, guardado pelo SDK: não pede PIN) ou assumir
  // em outra máquina (R6: o PIN autoriza gravar meta/hostUid).
  async function retomarOnline() {
    if (!app.config) throw new Error('Carregue um config.json válido antes.');
    const sala = String(online.salaRetomar || '').trim().toUpperCase();
    if (!RE_SALA.test(sala)) throw new Error('Digite o código da sala a retomar (4 caracteres, como no QR).');
    const canal = await abrirCanal('online');
    const meta = await canal.ler(`salas/${sala}/meta`);
    if (!meta) throw new Error(`A sala ${sala} não existe (ou já foi apagada).`);
    if (!tem(app.config.roteiros, meta.roteiro)) throw new Error(`A sala ${sala} usa o roteiro "${meta.roteiro}", que não está neste config.json.`);
    const assumir = meta.hostUid !== online.uid;
    if (assumir) await gravarPin(canal, 'assumir a sala nesta máquina');
    try {
      await ligarOnline(canal, sala, meta.roteiro, false);
    } catch (erro) {
      throw explicarRecusa(erro);
    } finally {
      if (assumir) await apagarPedido(canal);
    }
  }

  function depoisDeLigarOnline(soltarTrava) {
    online.pin = '';
    online.salaRetomar = app.sala;
    gravarLocal(CHAVE_ULTIMA_ONLINE, { sala: app.sala, roteiro: app.nomeRoteiro, hashConfig: app.hash, criadaEm: app.dados.meta?.criadaEm ?? agora() });
    // O QR já nasce com ?lp=1 quando o próprio telão precisou de long-polling.
    app.ui.lp = usaLongPolling();
    ligarExtrasOnline();
    app.desligar.push(soltarTrava);
    // Substitui um aviso de erro de antes (PIN errado, por exemplo), que ainda
    // estaria na tela por alguns segundos e diria o contrário do que aconteceu.
    avisar(`Sala ${app.sala} pronta: os celulares já podem entrar.`);
    app.chaveDesenho = null;
    agendarDesenho();
  }

  // Outra máquina assumiu com o PIN (retomada, R6): este telão para de mandar
  // pulso e comandos e só acompanha (revisão da F2, achado 24; invariante I3,
  // um só escritor). Sem isto, voltar à vista gravava o hostUid de volta, e as
  // duas máquinas se revezavam na sala. "Continuar sem celulares" e "Salvar
  // estado" também ficam de fora: o espelho parou quando a leitura da sala
  // inteira deixou de ser deste uid, e sairiam de uma cópia congelada.
  function entrarEmModoPassivo() {
    if (app.passivo) return;
    app.passivo = true;
    app.selo.definir('offline', 'Outra máquina assumiu');
    avisar(AVISO_PASSIVO, 'erro');
    app.chaveDesenho = null;
    agendarDesenho();
  }

  // O que só o modo online mantém, ligado depois do ligarSessao (que religa os
  // ouvintes do zero) e desligado junto com eles (app.desligar), ao encerrar a
  // sessão ou ao seguir sem celulares.
  function ligarExtrasOnline() {
    const c = app.canal;
    const base = `salas/${app.sala}`;
    let conectado = false;
    let avisouHost = false;

    // Espelho contínuo da sala no formato do banco (arquitetura, seção 11): é
    // dele que saem o "Continuar sem celulares" e o "Salvar estado", que
    // precisam funcionar justamente quando a rede caiu. O telão é o anfitrião,
    // o único que pode ler a sala inteira.
    let espelho = null;
    app.lerEspelho = () => (espelho ? structuredClone(espelho) : null);
    app.desligar.push(() => { app.lerEspelho = null; });
    app.desligar.push(c.ouvir(base, (arvore) => {
      espelho = arvore;
      if (arvore === null) {
        if (lerLocal(CHAVE_ULTIMA_ONLINE)?.sala === app.sala) apagarLocal(CHAVE_ULTIMA_ONLINE);
        return;
      }
      vigiarAtrasados(arvore);
    }, (erro) => avisar(`O espelho da sala parou (${erro.message}). "Salvar estado" usa a última cópia.`, 'erro')));

    // Pulso (arquitetura, seção 6): o celular mostra "aguardando o telão" quando
    // ele envelhece. É sinal de vida, não comando: nenhum estado muda aqui.
    const gravarPulso = () => {
      if (!conectado || app.canal !== c || app.passivo) return;
      c.gravar({ [`${base}/pulso`]: c.marcadorDeHora() }).catch((erro) => {
        if (!recusado(erro) || avisouHost) return;
        avisouHost = true;
        entrarEmModoPassivo();
      });
    };
    app.desligar.push(c.aoMudarConexao((ok) => {
      conectado = ok;
      app.conectado = ok;
      if (!app.passivo) app.selo.definir(ok ? 'conectado' : 'reconectando');
      if (ok) {
        app.reconectouEm = 0;
        gravarPulso();
        // A releitura que o voltar à vista adiou por falta de rede (achado 29).
        if (app.sincronizarAoVoltar) sincronizar();
      }
    }));
    app.desligar.push(() => { app.conectado = undefined; });
    const intervalo = setInterval(gravarPulso, (app.config.tempos.pulsoSeg || 10) * 1000);
    app.desligar.push(() => clearInterval(intervalo));

    // Quem entra depois da trava (ou tem equipe fechada) vai para uma equipe pelo
    // telão (contratos, seção 7). A assinatura evita repetir a mesma distribuição
    // a cada presença que chega.
    let assinatura = '';
    function vigiarAtrasados(arvore) {
      const e = app.estado;
      if (!app.anf || !e || e.equipesTravadas !== true) return;
      const soltos = Object.keys(arvore.membros || {}).filter((u) => !tem(e.equipesAbertas, arvore.membros[u]?.equipe)).sort();
      const nova = soltos.join(',');
      if (nova === assinatura) return;
      assinatura = nova;
      if (soltos.length > 0) executar(() => app.anf.distribuirAtrasados());
    }
  }

  // O bloco "Com celulares" da abertura. Os campos guardam o valor em memória
  // (online.pin, online.salaRetomar) porque a abertura é remontada quando o
  // config chega; o status é atualizado no lugar, sem remontar, para não tirar
  // o foco de quem está digitando o PIN.
  function montarBlocoOnline(podeCriar) {
    const { el, botao } = D();
    if (!online.promessa && online.fase === 'parado') online.promessa = prepararOnline();
    const ultima = lerLocal(CHAVE_ULTIMA_ONLINE);
    if (!online.salaRetomar && ultima && RE_SALA.test(String(ultima.sala))) online.salaRetomar = ultima.sala;
    // Sem classe própria no telao.css: os dois campos herdam o estilo por aqui.
    const estiloCampo = {
      font: 'inherit', padding: '.35em .6em', 'min-height': '48px', background: 'var(--fundo)', color: 'var(--texto)',
      border: '2px solid var(--linha-forte)', 'border-radius': 'var(--raio)',
    };
    const pin = el('input', {
      type: 'password', id: 'pin-apresentador', autocomplete: 'off', maxlength: '32', spellcheck: 'false', value: online.pin || null,
      estilo: { ...estiloCampo, width: '100%' }, ao: { input: (ev) => { online.pin = ev.target.value; } },
    });
    const codigo = el('input', {
      type: 'text', id: 'sala-retomar', maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
      'aria-label': 'Código da sala a retomar', placeholder: 'código', value: online.salaRetomar || null,
      estilo: { ...estiloCampo, width: '6.5em', 'letter-spacing': '.15em', 'text-transform': 'uppercase' },
      ao: { input: (ev) => { online.salaRetomar = ev.target.value.toUpperCase(); } },
    });
    online.el = {
      podeCriar,
      status: el('p', { classe: 'abertura-status', id: 'status-online', role: 'status' }),
      criar: botao('Criar sala com celulares', () => executar(criarSalaOnline), { classe: 'botao-primario', dados: { acao: 'criar-online' } }),
      retomar: botao('Retomar sala', () => executar(retomarOnline), { dados: { acao: 'retomar-online' } }),
      // Recarrega a página, e não só repete o import() (revisão da F2, achado
      // 25): o navegador guarda a falha do import() de um endereço para aquele
      // documento, e repetir no mesmo documento falha na hora, mesmo com a CDN de
      // volta. O PIN ainda não foi usado aqui: é digitado de novo.
      tentar: botao('Tentar de novo', () => raiz.location.reload(), { dados: { acao: 'tentar-online' } }),
    };
    atualizarBlocoOnline();
    return el('section', { classe: 'abertura-bloco', id: 'bloco-online', 'aria-labelledby': 'titulo-online' }, [
      el('h2', { id: 'titulo-online', texto: '3. Com celulares' }),
      online.el.status,
      el('label', { for: 'pin-apresentador', texto: 'PIN do apresentador (digite antes de projetar)' }),
      pin,
      el('div', { classe: 'abertura-acoes' }, [online.el.criar, online.el.tentar]),
      el('div', { classe: 'abertura-acoes' }, [codigo, online.el.retomar]),
      el('p', { classe: 'abertura-nota', texto: 'Retomar: a mesma sala depois de recarregar, ou em outra máquina (com o PIN).' }),
    ]);
  }

  function atualizarBlocoOnline() {
    // Sem conferir isConnected: o bloco recém-montado ainda não está no
    // documento quando é preenchido pela primeira vez.
    const x = online.el;
    if (!x) return;
    const problema = ['regras', 'indisponivel', 'semConexao', 'encerrado'].includes(online.fase);
    x.status.textContent = online.mensagem + (online.lento && online.fase !== 'semConexao'
      ? ' A primeira conexão passou de 8 s: se os celulares não entrarem, ligue "Rede restrita" na barra.' : '');
    x.status.classList.toggle('abertura-erro', problema);
    x.status.classList.toggle('abertura-ok', online.fase === 'pronto');
    x.status.setAttribute('role', online.fase === 'regras' ? 'alert' : 'status');
    const pronto = online.fase === 'pronto' && x.podeCriar;
    x.criar.disabled = !pronto;
    x.retomar.disabled = !pronto;
    x.tentar.hidden = online.fase !== 'indisponivel';
  }

  // ---------- Sessão ----------

  async function ligarSessao({ modo, sala, nomeRoteiro, criar, canal }) {
    if (!app.config) throw new Error('Carregue um config.json válido antes.');
    if (!RE_SALA.test(String(sala))) throw new Error(`Código de sala inválido: "${sala}".`);
    const c = canal || await abrirCanal(modo, { sala });
    const passos = N().roteiro.passos(app.config, nomeRoteiro);
    Object.assign(app, { modo, canal: c, sala, nomeRoteiro, passos, estado: null, chaveDesenho: null, chavePasso: null });
    app.dados = { meta: null, membros: null, presenca: null, resultados: null, placar: null, enquetes: null, votos: null, decisoes: null };
    app.ui = { pagina: 0, afirmacaoManual: 0, lp: false };
    app.inicioPasso = lerLocal(chavePassoLocal(sala));
    app.passivo = false;
    // Só o anfitrião desta sessão desenha: o de uma sessão anterior (um comando
    // online que ainda termina depois de seguir sem celulares) não mexe na tela.
    const anf = N().anfitriao.criar({
      canal: c, config: app.config, sala, nomeRoteiro, versaoApp: VERSAO_APP,
      gerarSemente: aleatorioUint32, aoMudar: (e) => { if (app.anf === anf) aoMudarEstado(e); },
    });
    app.anf = anf;
    try {
      if (criar) await app.anf.criarSala();
      else await app.anf.carregarSala();
    } catch (erro) {
      app.anf = null;
      app.canal = null;
      throw erro;
    }
    const meta = await c.ler(`salas/${sala}/meta`);
    app.dados.meta = meta;
    if (modo === 'offline') {
      gravarLocal(CHAVE_ULTIMA, { sala, roteiro: nomeRoteiro, hashConfig: app.hash, criadaEm: meta?.criadaEm ?? agora(), hostUid: meta?.hostUid ?? null });
    }
    document.body.classList.remove('em-abertura');
    document.body.classList.add('em-sessao');
    app.selo.definir(modo === 'offline' ? 'offline' : 'conectado', modo === 'offline' ? 'Sem celulares' : undefined);
    app.wake.ligar();
    ligarOuvintes();
    montarBarra();
    // Sem mostrarBarra() aqui (D-038): ela só aparece com H ou com o mouse na
    // borda de baixo, e começar a sessão projetava a barra por cima do lobby.
    processarEstado(app.anf.estado());
    agendarDesenho();
    return app.anf.estado();
  }

  function encerrarSessao() {
    desligarOuvintes();
    if (app.sala && app.modo === 'offline') {
      apagarLocal(chaveSessao(app.sala));
      apagarLocal(chavePassoLocal(app.sala));
      apagarLocal(chaveBaixados(app.sala));
      if (lerLocal(CHAVE_ULTIMA)?.sala === app.sala) apagarLocal(CHAVE_ULTIMA);
    }
    Object.assign(app, { anf: null, canal: null, sala: null, estado: null, modo: null, chaveDesenho: null });
    app.wake.desligar();
    esconderBarra(true);
    document.body.classList.remove('em-sessao');
    document.body.classList.add('em-abertura');
    delete document.body.dataset.tela;
    D().limpar(app.el.faixa).hidden = true;
    montarAbertura();
  }

  function apagarSessaoLocal(sala) {
    apagarLocal(chaveSessao(sala));
    apagarLocal(chavePassoLocal(sala));
    apagarLocal(chaveBaixados(sala));
  }

  // ---------- Ouvintes do banco ----------

  function desligarOuvintes() {
    for (const f of app.desligar.splice(0)) f();
    for (const f of app.desligarPasso.splice(0)) f();
    app.chavePasso = null;
  }

  function ouvir(caminho, campo, destino = app.desligar) {
    const base = `salas/${app.sala}`;
    destino.push(app.canal.ouvir(`${base}/${caminho}`, (v) => {
      app.dados[campo] = v;
      agendarDesenho();
    }, (erro) => avisar(`Leitura interrompida (${caminho}): ${erro.message}`, 'erro')));
  }

  function ligarOuvintes() {
    desligarOuvintes();
    for (const no of ['meta', 'membros', 'presenca', 'resultados', 'placar', 'enquetes']) ouvir(no, no);
    // O estado também é ouvido, e não só recebido do anfitrião: outra janela (ou
    // outra máquina, online) pode tê-lo mudado. O anfitrião descobre no próximo
    // comando (CONFLITO); a tela, já.
    const base = `salas/${app.sala}`;
    app.desligar.push(app.canal.ouvir(`${base}/estado`, (v) => {
      if (!app.anf) return;
      if (v === null) {
        if (app.estado !== null) aoMudarEstado(null);
        return;
      }
      if (!app.estado || v.geracao > app.estado.geracao) processarEstado(v);
      agendarDesenho();
    }));
  }

  // Os ouvintes que dependem do passo: votos da enquete aberta e decisões da
  // rodada. Religados só quando o passo muda de enquete ou de rodada.
  function religarOuvintesDoPasso(e) {
    const chave = e ? `${e.tipo}|${e.enquete || ''}|${e.momento || ''}|${e.rodada || ''}` : null;
    if (chave === app.chavePasso) return;
    for (const f of app.desligarPasso.splice(0)) f();
    app.chavePasso = chave;
    app.dados.votos = null;
    app.dados.decisoes = null;
    if (!e) return;
    if (e.tipo === 'enquete') ouvir(`votosEnquete/${e.enquete}/${e.momento}`, 'votos', app.desligarPasso);
    if (e.tipo === 'rodada') ouvir(`decisoes/${e.rodada}`, 'decisoes', app.desligarPasso);
  }

  function aoMudarEstado(e) {
    if (!app.anf) {
      app.estado = e;
      return;
    }
    if (e === null) {
      encerrarSessao();
      return;
    }
    processarEstado(e);
    agendarDesenho();
  }

  function processarEstado(e) {
    const anterior = app.estado;
    app.estado = e;
    if (!e) return;
    if (!anterior || anterior.indice !== e.indice) {
      app.ui.pagina = 0;
      if (!app.inicioPasso || app.inicioPasso.indice !== e.indice) {
        app.inicioPasso = { indice: e.indice, em: agora() };
        gravarLocal(chavePassoLocal(app.sala), app.inicioPasso);
      }
      podarVotosLocais();
    }
    if (!anterior || anterior.enquete !== e.enquete || anterior.momento !== e.momento) app.ui.afirmacaoManual = 0;
    religarOuvintesDoPasso(e);
    baixarAoFimDaRodada(e);
  }

  // D-015: ao fim de cada rodada, o telão baixa sozinho um JSON pequeno com o
  // estado, o seguro para o caso "travou e caiu a internet". Uma vez por
  // apuração (rodada + geracao), guardado no localStorage para recarregar a
  // página não baixar de novo.
  function baixarAoFimDaRodada(e) {
    if (e.tipo !== 'rodada' || e.subfase !== 'sorteio') return;
    const marca = `${e.rodada}:${e.geracao}`;
    const baixados = lista(lerLocal(chaveBaixados(app.sala)));
    if (baixados.includes(marca)) return;
    gravarLocal(chaveBaixados(app.sala), [...baixados, marca]);
    esperarEspelhoDaRodada(e).then(() => salvarEstado(e.rodada)).catch(mostrarErro);
  }

  // O espelho (o ouvinte da sala inteira) chega depois do ouvinte do estado.
  // Salvar no instante em que o estado vira "sorteio" gravava o arquivo com a
  // rodada ainda "fechando" e sem o resultado: os três arquivos do teste de
  // 30/09 saíram assim, e carregar um deles refaria a rodada sem nenhum voto
  // (os votos ficam fora do arquivo). Espera o espelho alcançar a geração do
  // sorteio e trazer o resultado da rodada, por até 10 s. Offline não há
  // espelho: o salvarEstado lê o canal local, que já está consistente.
  async function esperarEspelhoDaRodada(e) {
    if (typeof app.lerEspelho !== 'function') return;
    for (let i = 0; i < 50; i += 1) {
      const esp = app.lerEspelho();
      if (esp && (esp.estado?.geracao || 0) >= e.geracao && esp.resultados?.[e.rodada]) return;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // ---------- Salvar e carregar estado ----------

  // O estado da sala, sem nenhum voto individual (AGENTS.md, regra 8): os votos
  // de celular, as decisões por aparelho, a presença e os membros ficam de fora.
  // O que sobra (meta, conteúdo, estado, sementes, resultados, placar e
  // apurações) basta para seguir sem celulares: no offline as enquetes são
  // contadas à mão e as decisões, registradas pelo apresentador.
  const FORA_DO_ESTADO_SALVO = ['votosEnquete', 'decisoes', 'presenca', 'membros'];

  async function salvarEstado(motivo = 'manual') {
    if (!app.canal || !app.sala) return;
    // Online, do espelho local: o "Salvar estado" tem de funcionar justamente
    // quando a rede caiu, e o ler() esperaria a conexão voltar.
    const espelho = app.modo === 'online' && typeof app.lerEspelho === 'function' ? app.lerEspelho() : null;
    const dados = { ...(espelho || (await app.canal.ler(`salas/${app.sala}`)) || {}) };
    for (const k of FORA_DO_ESTADO_SALVO) delete dados[k];
    const arquivo = { formato: 'viracao-estado', versaoApp: VERSAO_APP, sala: app.sala, salvoEm: agora(), dados };
    D().baixar(`viracao-estado-${app.sala}-${motivo}-${F().carimbo(agora())}.json`, JSON.stringify(arquivo, null, 1));
    // O salvamento automático não avisa na tela (revisão da F2, achado 9): ele
    // acontece ao abrir o sorteio, e a caixa do aviso tapava o título justamente
    // enquanto os ponteiros corriam. Fica registrado, discreto, na barra do
    // apresentador. O "Salvar estado" apertado à mão continua avisando.
    app.ultimoSalvo = `estado salvo às ${F().dataHora(agora()).split(', ').pop()}${motivo === 'manual' ? '' : ` (${motivo})`}`;
    const marca = app.el.barra?.querySelector('[data-barra-salvo]');
    if (marca) marca.textContent = app.ultimoSalvo;
    if (motivo === 'manual') avisar('Estado salvo (JSON baixado).');
  }

  // "Carregar estado" do offline: o pendrive, por file://, é outra origem e não
  // enxerga o localStorage do site (arquitetura, seção 11). O canal-local nasce
  // com uid = meta.hostUid do arquivo: offline não há PIN, e com outro uid o
  // anfitrião não seria o host da sala (contratos, seção 6).
  async function carregarEstadoDeArquivo(arquivo) {
    const texto = await D().lerArquivo(arquivo);
    let json;
    try {
      json = JSON.parse(texto.replace(/^\uFEFF/, ''));
    } catch (erro) {
      throw new Error(`O arquivo não é um JSON válido: ${erro.message}`);
    }
    if (!json || json.formato !== 'viracao-estado' || !json.dados || !RE_SALA.test(String(json.sala))) {
      throw new Error('Este arquivo não é um estado salvo pelo telão ("Salvar estado").');
    }
    const meta = json.dados.meta;
    if (!meta || typeof meta.hostUid !== 'string' || !meta.roteiro) throw new Error('O estado salvo não tem a meta da sala.');
    if (!app.config) throw new Error('Carregue o config.json antes do estado.');
    if (meta.hashConfig !== app.hash) {
      throw new Error(`O estado é de outro config.json (${meta.hashConfig}); o carregado é ${app.hash}. Use o mesmo arquivo da sessão.`);
    }
    const anterior = lerLocal(CHAVE_ULTIMA);
    if (anterior?.sala && anterior.sala !== json.sala && !(await salaEmUso(anterior.sala))) apagarSessaoLocal(anterior.sala);
    return ligarOffline({ sala: json.sala, uid: meta.hostUid, nomeRoteiro: meta.roteiro, criar: false, arvore: json.dados });
  }

  // Toda sessão offline passa por aqui: a trava de aba vem antes de o canal
  // tocar no localStorage (o importar grava a árvore inteira).
  async function ligarOffline({ sala, uid, nomeRoteiro, criar, arvore, esperarMs }) {
    const soltar = await travarAba(sala, { esperarMs });
    try {
      const canal = await abrirCanal('offline', { sala, uid: uid || undefined });
      if (arvore) canal.importar({ salas: { [sala]: arvore } });
      await ligarSessao({ modo: 'offline', canal, sala, nomeRoteiro, criar });
    } catch (erro) {
      soltar();
      throw erro;
    }
    app.desligar.push(soltar);
  }

  // Os votos individuais que o offline ainda usa: os da votação do passo atual
  // (o encerrar ainda vai apurá-los) e os do "antes" quando o passo é o "depois"
  // da mesma enquete (a transição). O resto sai da árvore local, que o
  // canal-local grava inteira no localStorage do notebook, onde ficaria sem
  // prazo se a aula acabasse sem "Apagar a sala" (revisão da F2, achado 30;
  // AGENTS.md, regra 8). A presença não serve ao offline. Devolve se mudou.
  function podarVotos(sala, e) {
    let mudou = false;
    if (sala.presenca) {
      delete sala.presenca;
      mudou = true;
    }
    for (const [enq, momentos] of Object.entries(sala.votosEnquete || {})) {
      for (const m of Object.keys(momentos || {})) {
        const usa = e?.tipo === 'enquete' && e.enquete === enq && (e.momento === m || (e.momento === 'depois' && m === 'antes'));
        if (!usa) {
          delete momentos[m];
          mudou = true;
        }
      }
    }
    for (const r of Object.keys(sala.decisoes || {})) {
      if (!(e?.tipo === 'rodada' && e.rodada === r)) {
        delete sala.decisoes[r];
        mudou = true;
      }
    }
    return mudou;
  }

  // Ao mudar de passo no offline: sai da árvore local o que o passo anterior
  // usava. Pelo exportar/importar do canal-local, e não por gravar: nem o
  // anfitrião escreve voto alheio pelas travas (como nas regras).
  function podarVotosLocais() {
    if (app.modo !== 'offline' || typeof app.canal?.exportar !== 'function') return;
    const arvore = app.canal.exportar();
    const sala = arvore.salas?.[app.sala];
    if (sala && podarVotos(sala, app.estado)) app.canal.importar(arvore);
  }

  // "Continuar sem celulares" (online → offline, caminho só de ida). Segue a
  // partir do espelho local da sala, se o modo online o mantiver (app.lerEspelho),
  // ou da última leitura do canal. Quem ligar o online também deve chamar o
  // goOffline() do SDK aqui, antes de trocar de canal.
  async function continuarSemCelulares() {
    if (app.modo !== 'online') return;
    const arvore = typeof app.lerEspelho === 'function' ? app.lerEspelho() : await app.canal.ler(`salas/${app.sala}`);
    if (!arvore || !arvore.meta) throw new Error('Não há cópia local da sala para seguir sem celulares.');
    // Só de ida (arquitetura, seção 11): o SDK sai do ar e não volta nesta
    // página, senão uma reconexão tardia gravaria por cima do que foi feito offline.
    if (typeof app.canal.desconectar === 'function') {
      app.canal.desconectar();
      online.fase = 'encerrado';
      online.mensagem = 'A sessão seguiu sem celulares: recarregue a página para usar celulares de novo.';
    }
    const { sala, nomeRoteiro } = app;
    desligarOuvintes();
    // Só de ida também depois de recarregar (revisão da F2, achado 28): sem a
    // última sala online, a abertura não oferece religar a sala do banco, que
    // ficou no passo de antes da queda e gravaria por cima do que foi feito aqui.
    apagarLocal(CHAVE_ULTIMA_ONLINE);
    online.salaRetomar = '';
    podarVotos(arvore, arvore.estado);
    // A trava da aba passa do online para o offline: o desligarOuvintes acabou
    // de soltá-la, e o navegador pode levar um instante para liberar.
    await ligarOffline({ sala, uid: arvore.meta.hostUid, nomeRoteiro, criar: false, arvore, esperarMs: 3000 });
    avisar('Seguindo sem celulares a partir daqui.');
  }

  // ---------- Abertura ----------

  async function carregarConfigPorRede() {
    app.lendo = true;
    try {
      // no-store: o GitHub Pages guarda cache por 10 min, e um config velho
      // criaria a sala com conteúdo errado (arquitetura, seção 2).
      const r = await raiz.fetch('../config.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      aceitarTextoConfig(await r.text(), 'rede');
    } catch (erro) {
      // Por file://, o fetch sempre falha: o apresentador carrega o arquivo à mão.
      app.lendo = false;
      app.erroLeitura = location.protocol === 'file:' ? null : String(erro.message || erro);
      if (!app.anf) montarAbertura();
    }
  }

  function aceitarTextoConfig(texto, origem) {
    const v = N().validarConfig.validarTexto(texto);
    app.lendo = false;
    app.validacao = v;
    app.origemConfig = origem;
    app.erroLeitura = null;
    if (v.ok) {
      app.config = v.config;
      app.hash = N().validarConfig.hash(v.config);
      const nomes = Object.keys(v.config.roteiros);
      if (!nomes.includes(app.roteiroEscolhido)) app.roteiroEscolhido = nomes[0];
    } else {
      app.config = null;
      app.hash = null;
    }
    if (!app.anf) montarAbertura();
  }

  async function lerConfigDeArquivo(arquivo) {
    if (!arquivo) return;
    aceitarTextoConfig(await D().lerArquivo(arquivo), arquivo.name);
  }

  function montarAbertura() {
    const { el, botao, limpar } = D();
    const palco = limpar(app.el.palco);
    document.body.dataset.tela = 'abertura';
    const v = app.validacao;
    const titulo = app.config ? app.config.titulo : 'Telão do seminário';

    // Config: estado da leitura, erros (a lista inteira), avisos e o hash.
    const blocoConfig = el('section', { classe: 'abertura-bloco', 'aria-labelledby': 'titulo-config' }, [
      el('h2', { id: 'titulo-config', texto: '1. config.json' }),
    ]);
    if (app.lendo) blocoConfig.appendChild(el('p', { classe: 'abertura-status', texto: 'Lendo config.json…' }));
    else if (!v) {
      blocoConfig.appendChild(el('p', { classe: 'abertura-status', texto: app.erroLeitura
        ? `Não foi possível ler o config.json do site (${app.erroLeitura}). Carregue o arquivo.`
        : 'Aberto pelo arquivo (pendrive): carregue o config.json.' }));
    } else if (v.ok) {
      blocoConfig.appendChild(el('p', { classe: 'abertura-status abertura-ok' }, [
        el('span', { classe: 'marca-ok', 'aria-hidden': 'true', texto: '✓' }),
        ` Válido · versão ${app.config.versao} · hash `, el('code', { id: 'hash-config', texto: app.hash }),
      ]));
    } else {
      blocoConfig.appendChild(el('p', { classe: 'abertura-status abertura-erro', role: 'alert', texto: `O config.json tem ${v.erros.length} ${v.erros.length === 1 ? 'problema' : 'problemas'}. A sala não pode ser criada até corrigir todos:` }));
      blocoConfig.appendChild(el('ol', { classe: 'lista-erros', id: 'erros-config' }, v.erros.map((e) => el('li', {}, [el('code', { texto: e.caminho }), ` ${e.mensagem}`]))));
    }
    if (v && v.avisos.length > 0) {
      blocoConfig.appendChild(el('details', { classe: 'lista-avisos' }, [
        el('summary', { texto: `${v.avisos.length} ${v.avisos.length === 1 ? 'aviso' : 'avisos'} (não impedem a sala)` }),
        el('ul', {}, v.avisos.map((a) => el('li', {}, [el('code', { texto: a.caminho }), ` ${a.mensagem}`]))),
      ]));
    }
    const entradaConfig = el('input', { type: 'file', id: 'arquivo-config', accept: '.json,application/json', classe: 'invisivel',
      ao: { change: (ev) => lerConfigDeArquivo(ev.target.files[0]).catch(mostrarErro) } });
    blocoConfig.appendChild(el('div', { classe: 'zona-arquivo', id: 'zona-config' }, [
      entradaConfig,
      el('label', { for: 'arquivo-config', classe: 'botao', texto: 'Carregar config.json' }),
      el('span', { classe: 'zona-dica', texto: 'ou arraste o arquivo para esta janela' }),
    ]));

    // Roteiro: 60 ou 120 min (D-019).
    const blocoRoteiro = el('section', { classe: 'abertura-bloco', 'aria-labelledby': 'titulo-roteiro' }, [el('h2', { id: 'titulo-roteiro', texto: '2. Roteiro' })]);
    if (app.config) {
      const opcoes = Object.keys(app.config.roteiros).map((nome) => {
        const passos = N().roteiro.passos(app.config, nome);
        const min = Math.round(N().roteiro.somaAlvos(passos) / 60);
        return el('label', { classe: 'opcao-roteiro' }, [
          el('input', { type: 'radio', name: 'roteiro', value: nome, checked: nome === app.roteiroEscolhido,
            ao: { change: () => { app.roteiroEscolhido = nome; } } }),
          el('span', {}, [el('b', { texto: nome }), ` · ${passos.length} passos, ${min} min planejados`]),
        ]);
      });
      blocoRoteiro.appendChild(el('div', { classe: 'opcoes-roteiro', role: 'radiogroup' }, opcoes));
    } else {
      blocoRoteiro.appendChild(el('p', { classe: 'abertura-status', texto: 'Aparece depois do config.json.' }));
    }

    // Retomar a sessão offline guardada neste navegador.
    const ultima = lerLocal(CHAVE_ULTIMA);
    const temUltima = ultima && RE_SALA.test(String(ultima.sala)) && existeLocal(chaveSessao(ultima.sala));
    let blocoRetomar = null;
    if (temUltima) {
      const outroConfig = app.hash && ultima.hashConfig !== app.hash;
      blocoRetomar = el('section', { classe: 'abertura-bloco abertura-retomar', id: 'bloco-retomar' }, [
        el('p', { classe: 'abertura-pergunta', texto: `Retomar a sessão de ${F().dataHora(ultima.criadaEm)}?` }),
        el('p', { classe: 'abertura-status', texto: outroConfig
          ? `Ela foi criada com outro config.json (${ultima.hashConfig}). Carregue o mesmo arquivo para retomar.`
          : `Roteiro ${ultima.roteiro} · sem celulares.` }),
        el('div', { classe: 'abertura-acoes' }, [
          botao('Retomar', () => executar(retomarOffline),
            { classe: 'botao-primario', desabilitado: !app.config || outroConfig, dados: { acao: 'retomar' } }),
          botao('Descartar', async () => {
            if (await confirmar('Descartar a sessão guardada? O que não foi salvo em JSON se perde.', 'Descartar')) {
              apagarSessaoLocal(ultima.sala);
              apagarLocal(CHAVE_ULTIMA);
              montarAbertura();
            }
          }, { dados: { acao: 'descartar' } }),
        ]),
      ]);
    }

    // Começar. O botão offline está na página desde a primeira pintura: sem
    // celulares é sempre escolha explícita, nunca dedução de falha (seção 11).
    const podeCriar = Boolean(app.config);
    const entradaEstado = el('input', { type: 'file', id: 'arquivo-estado', accept: '.json,application/json', classe: 'invisivel',
      ao: { change: (ev) => { const a = ev.target.files[0]; ev.target.value = ''; if (a) executar(() => carregarEstadoDeArquivo(a)); } } });
    const acoes = [
      botao('Começar sem celulares', () => executar(comecarOffline), { classe: 'botao-primario', desabilitado: !podeCriar, dados: { acao: 'comecar-offline' } }),
    ];
    // Por file:// o online nunca funciona (import() e fetch falham): o bloco nem aparece.
    const blocoOnline = location.protocol !== 'file:' ? montarBlocoOnline(podeCriar) : null;
    acoes.push(entradaEstado, el('label', { for: 'arquivo-estado', classe: ['botao', podeCriar ? null : 'botao-inativo'], texto: 'Carregar estado (JSON)' }));
    const blocoComecar = el('section', { classe: 'abertura-bloco', 'aria-labelledby': 'titulo-comecar' }, [
      // Com o bloco "Com celulares" (site publicado), ele vem antes: é o modo
      // normal da aula, e o sem celulares vira a alternativa.
      el('h2', { id: 'titulo-comecar', texto: blocoOnline ? '4. Sem celulares' : '3. Começar' }),
      el('div', { classe: 'abertura-acoes' }, acoes),
      el('p', { classe: 'abertura-nota', texto: 'Sem celulares: as enquetes são contadas por mão levantada (teclas 1 a 5) e cada equipe anuncia a sua decisão.' }),
    ]);

    D().acrescentar(palco, el('section', { classe: 'tela tela-abertura' }, [
      el('header', { classe: 'tela-cabecalho' }, [
        el('div', {}, [el('p', { classe: 'kicker', texto: 'Telão do apresentador' }), el('h1', { texto: titulo })]),
      ]),
      el('div', { classe: 'abertura-grade' }, [blocoConfig, blocoRoteiro, blocoRetomar, blocoOnline, blocoComecar]),
    ]));
  }

  // Retomar a sessão offline guardada neste navegador. O canal nasce com o
  // hostUid gravado: uma sessão vinda de um estado salvo online tem o uid do
  // telão online, e com outro uid o carregarSala seria recusado.
  async function retomarOffline() {
    const ultima = lerLocal(CHAVE_ULTIMA);
    if (!ultima || !RE_SALA.test(String(ultima.sala))) throw new Error('Não há sessão guardada neste navegador.');
    await ligarOffline({ sala: ultima.sala, uid: ultima.hostUid, nomeRoteiro: ultima.roteiro, criar: false });
  }

  async function comecarOffline() {
    if (!app.config) throw new Error('Carregue um config.json válido antes.');
    // A sessão anterior não teria mais como ser retomada pela tela: apagar evita
    // que o localStorage acumule salas velhas.
    const anterior = lerLocal(CHAVE_ULTIMA);
    if (anterior?.sala && !(await salaEmUso(anterior.sala))) apagarSessaoLocal(anterior.sala);
    let sala = gerarSala();
    while (existeLocal(chaveSessao(sala))) sala = gerarSala();
    await ligarOffline({ sala, nomeRoteiro: app.roteiroEscolhido, criar: true });
  }

  // ---------- Desenho ----------

  let desenhoAgendado = false;
  function agendarDesenho() {
    if (desenhoAgendado) return;
    desenhoAgendado = true;
    queueMicrotask(() => {
      desenhoAgendado = false;
      desenhar();
    });
  }

  // Um gráfico é desenhado depois que a tela está no documento: ele mede o
  // espaço que o CSS lhe deu e desenha o SVG nesse tamanho exato.
  function grafico(classe, desenhar) {
    const div = D().el('div', { classe: ['grafico', classe] });
    app.graficos.set(div, desenhar);
    return div;
  }

  function preencherGraficos() {
    for (const [div, fn] of app.graficos) {
      if (!div.isConnected) continue;
      const r = div.getBoundingClientRect();
      const fonte = parseFloat(getComputedStyle(div).fontSize) || 28;
      if (r.width < 4 || r.height < 4) continue;
      const svg = fn(Math.floor(r.width), Math.floor(r.height), fonte);
      if (svg) div.appendChild(svg);
    }
    app.graficos.clear();
  }

  function desenhar() {
    if (!app.anf || !app.estado || !app.config) return;
    const e = app.estado;
    // A faixa de entrada antes da tela: as medidas feitas depois do desenho (o
    // aperto do resultado, das personas e do mapa) precisam da altura que sobra
    // com a faixa. Desenhada depois, a primeira tela depois do lobby (e toda
    // troca de tamanho, que muda a altura do QR) era medida sem ela.
    desenharFaixa();
    const tela = escolherTela(e);
    const chave = JSON.stringify([
      tela.id, e.geracao, e.indice, e.subfase, e.afirmacao, app.ui, app.modo,
      raiz.innerWidth, raiz.innerHeight, tela.chave ? tela.chave(e) : null,
    ]);
    if (chave !== app.chaveDesenho) {
      app.chaveDesenho = chave;
      document.body.dataset.tela = tela.id;
      const secao = D().el('section', { classe: ['tela', `tela-${tela.id}`] });
      D().limpar(app.el.palco).appendChild(secao);
      app.graficos.clear();
      app.depoisDeMedir = [];
      tela.desenhar(secao, e);
      preencherGraficos();
      for (const ajustar of app.depoisDeMedir.splice(0)) ajustar();
    }
    atualizarBarra();
    tique();
  }

  // Mesmo "fechando" no banco, duas telas: o do desfazer da abertura, feito por
  // esta janela, não é uma apuração (o id diferente também refaz o desenho).
  function telaDoFechando(e) {
    return app.anf.desfazendoAbertura(e) ? { id: 'desfazendo', desenhar: telaDesfazendo } : { id: 'apurando', desenhar: telaApurando };
  }

  function escolherTela(e) {
    switch (e.tipo) {
      case 'lobby': return { id: 'lobby', desenhar: telaLobby, chave: chaveLobby };
      case 'enquete':
        if (e.subfase === 'votando') return { id: 'enquete-votando', desenhar: telaEnqueteVotando, chave: chaveEnqueteVotando };
        if (e.subfase === 'fechando') return telaDoFechando(e);
        return { id: 'enquete-apurada', desenhar: telaEnqueteApurada, chave: () => app.dados.enquetes?.[e.enquete]?.[e.momento] ?? null };
      case 'bloco': return { id: 'bloco', desenhar: telaBloco, chave: () => app.dados.placar };
      case 'formarEquipes': return { id: 'formar-equipes', desenhar: telaFormarEquipes, chave: chaveMembrosPorEquipe };
      case 'personas': return { id: 'personas', desenhar: telaPersonas };
      case 'rodada':
        if (e.subfase === 'decidindo') return { id: 'rodada-decidindo', desenhar: telaRodadaDecidindo, chave: chaveDecisoes };
        if (e.subfase === 'prorrogacao') return { id: 'rodada-prorrogacao', desenhar: telaProrrogacao, chave: chaveDecisoes };
        if (e.subfase === 'fechando') return telaDoFechando(e);
        if (e.subfase === 'sorteio') return { id: 'rodada-sorteio', desenhar: telaSorteio, chave: () => app.dados.resultados?.[e.rodada] ?? null };
        return { id: 'rodada-resultado', desenhar: telaResultado, chave: () => app.dados.resultados?.[e.rodada] ?? null };
      case 'placarFinal': return { id: 'placar-final', desenhar: telaPlacarFinal, chave: () => app.dados.placar };
      case 'comparativo': return { id: 'comparativo', desenhar: telaComparativo, chave: () => app.dados.enquetes?.[e.enquete] ?? null };
      case 'fim': return { id: 'fim', desenhar: telaFim, chave: () => app.dados.placar };
      default: return { id: 'desconhecida', desenhar: (s) => s.appendChild(D().el('h1', { texto: e.tipo })) };
    }
  }

  function cabecalho(kicker, titulo, { cronometro = false, extra = null, classeTitulo } = {}) {
    const { el } = D();
    return el('header', { classe: 'tela-cabecalho' }, [
      el('div', { classe: 'cabecalho-textos' }, [
        kicker ? el('p', { classe: 'kicker', texto: kicker }) : null,
        // O título pode ser texto ou uma lista de nós (a equipe com a forma, na
        // história do placar final).
        el('h1', { classe: classeTitulo }, [].concat(titulo)),
      ]),
      cronometro || extra ? el('div', { classe: 'cabecalho-lado' }, [
        cronometro ? el('p', { classe: 'cronometro', dados: { cronometro: '1' }, 'aria-live': 'off' }) : null,
        extra,
      ]) : null,
    ]);
  }

  const rodapeEnquete = () => D().el('footer', { classe: 'rodape-enquete', texto: RODAPE_ENQUETE });

  // O cronômetro é só desenho (I5): lê o prazo gravado e o relógio do canal.
  // Chegar a zero não fecha nada; quem fecha é o apresentador (D-010). O prazo
  // gravado é o da regra, com a folga de 12 h (contratos, seção 7): o
  // cronômetro desconta a folga e mostra o tempo configurado da etapa.
  function textoCronometro(e) {
    if (typeof e.restanteMs === 'number') return `pausado · ${F().relogio(e.restanteMs)}`;
    const fim = N().alunoLogica.fimDoCronometro(e);
    if (fim === null) return '';
    const resta = fim - agora();
    return resta > 0 ? F().relogio(resta) : 'tempo esgotado';
  }

  // O único timer do telão: redesenha texto que depende do relógio. Não muda
  // o estado, não chama o anfitrião.
  function tique() {
    const e = app.estado;
    if (!e || !app.anf) return;
    for (const c of app.el.palco.querySelectorAll('[data-cronometro]')) {
      const t = textoCronometro(e);
      if (c.textContent !== t) c.textContent = t;
      c.dataset.esgotado = String(t === 'tempo esgotado');
    }
    const dica = app.el.barra.querySelector('[data-barra-dica]');
    if (dica) {
      const t = dicaDoPasso(e);
      if (dica.textContent !== t) dica.textContent = t;
    }
    const info = app.el.barra.querySelector('[data-barra-passo]');
    if (info) {
      const t = textoPassoBarra(e);
      if (info.textContent !== t) info.textContent = t;
    }
    // A presença envelhece sem nenhum aviso do banco: quem some deixa de ser
    // ativo 60 s depois do último sinal, e nenhum ouvinte dispara nessa hora.
    // Sem isto, o "N ativos / M membros" e o denominador do "n de m votaram"
    // ficavam com o número velho até o próximo sinal de outro celular. Só
    // redesenha quando a contagem muda (o desenho chama o tique de novo).
    if (app.modo === 'online') {
      const ativos = textoAtivos();
      if (ativos !== app.ultimosAtivos) {
        app.ultimosAtivos = ativos;
        agendarDesenho();
      }
    }
  }

  // ---------- Tela: lobby ----------

  function urlAluno() {
    const u = new URL('../aluno/', raiz.location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('sala', app.sala);
    if (app.ui.lp) u.searchParams.set('lp', '1');
    // No ensaio com o emulador, o celular também precisa ir para o emulador.
    if (app.modo === 'online' && usaEmulador()) u.searchParams.set('emulador', '1');
    return u.href;
  }

  function urlCurta() {
    const u = new URL('../aluno/', raiz.location.href);
    return (u.host + u.pathname).replace(/\/$/, '');
  }

  function chaveLobby() {
    return [ativosAgora().size, Object.keys(app.dados.membros || {}).length, app.dados.meta?.entradaAberta];
  }

  function telaLobby(s) {
    const { el } = D();
    if (app.modo === 'offline') {
      D().acrescentar(s, [
        cabecalho('Sessão sem celulares', app.config.titulo),
        el('div', { classe: 'lobby-offline' }, [
          el('p', { classe: 'texto-grande', texto: 'Nesta sessão não há votação pelo celular.' }),
          el('ul', { classe: 'lista-simples' }, [
            el('li', { texto: 'Enquetes: mão levantada ou cartões, contados pelo apresentador.' }),
            el('li', { texto: 'Decisões: cada equipe anuncia a sua, e o apresentador registra.' }),
          ]),
        ]),
      ]);
      return;
    }
    const url = urlAluno();
    const lado = Math.floor(Math.min(raiz.innerHeight * 0.6, raiz.innerWidth * 0.45));
    const conectados = ativosAgora().size;
    D().acrescentar(s, el('div', { classe: 'lobby' }, [
      el('div', { classe: 'lobby-qr' }, [G().qr(url, { lado, rotuloAria: `QR para entrar na sala ${app.sala}` })]),
      el('div', { classe: 'lobby-info' }, [
        el('p', { classe: 'kicker', texto: app.config.titulo }),
        el('p', { classe: 'lobby-chamada', texto: 'Entre pelo celular' }),
        el('p', { classe: 'lobby-url', texto: url }),
        el('p', { classe: 'kicker', texto: 'Código da sala' }),
        el('p', { classe: 'codigo-sala', texto: app.sala }),
        // O "N ativos / M membros" é do apresentador e fica só na barra (D-047):
        // a turma precisa do número de conectados, e não do controle de inativos.
        el('p', { classe: 'lobby-conectados' }, [el('b', { classe: 'numero-grande', texto: F().inteiro(conectados) }), conectados === 1 ? ' conectado' : ' conectados']),
      ]),
    ]));
  }

  // Faixa de entrada: URL curta, código e QR pequeno em toda tela, enquanto a
  // entrada estiver aberta (quem chega atrasado ainda entra). Só com celulares.
  function desenharFaixa() {
    const { el, limpar } = D();
    const f = app.el.faixa;
    const mostrar = app.modo !== 'offline' && app.dados.meta?.entradaAberta === true && app.estado && app.estado.tipo !== 'lobby';
    const chave = mostrar ? `${app.sala}|${app.ui.lp}|${raiz.innerHeight}` : '';
    if (f.dataset.chave === chave) return;
    f.dataset.chave = chave;
    limpar(f);
    f.hidden = !mostrar;
    if (!mostrar) return;
    // 12% da altura, nunca menos de 96 px: com 72 px (9,5% em 1024×768), o QR
    // não era lido do fundo da sala num projetor 4:3 (revisão da F2, achado 13).
    const lado = Math.max(96, Math.floor(raiz.innerHeight * 0.12));
    D().acrescentar(f, [
      G().qr(urlAluno(), { lado, rotuloAria: 'QR para entrar na sala' }),
      el('p', { classe: 'faixa-texto' }, ['Entre em ', el('b', { texto: urlCurta() }), ' · código ', el('b', { classe: 'faixa-codigo', texto: app.sala })]),
    ]);
  }

  // ---------- Tela: enquete ----------

  function afirmacaoEmFoco(e) {
    const enq = app.config.enquetes[e.enquete];
    const ordem = ordemAfirmacoes(enq);
    if (e.afirmacao && e.afirmacao !== '*') return e.afirmacao;
    if (app.modo === 'offline') return ordem[Math.min(Math.max(0, app.ui.afirmacaoManual), ordem.length - 1)];
    return null;
  }

  function histManual(e, afirm) {
    const h = lista(e.manual?.[afirm]);
    return h.length === 5 ? h.slice() : [0, 0, 0, 0, 0];
  }

  // "14 de 18 votaram": no modo "todas", votou quem respondeu todas as
  // afirmações; no "uma_por_vez", quem respondeu a da vez. O total são os
  // membros ativos (presença nos últimos 60 s), nunca menor que quem votou.
  function contagemVotaram(e) {
    const enq = app.config.enquetes[e.enquete];
    const abertas = e.afirmacao === '*' ? ordemAfirmacoes(enq) : [e.afirmacao];
    const porUid = new Map();
    for (const a of abertas) {
      for (const [u, v] of Object.entries(app.dados.votos?.[a] || {})) {
        if (Number.isInteger(v) && v >= 1 && v <= 5) porUid.set(u, (porUid.get(u) || 0) + 1);
      }
    }
    let votaram = 0;
    for (const n of porUid.values()) if (n === abertas.length) votaram += 1;
    const ativos = ativosAgora().size;
    return { votaram, total: Math.max(ativos, votaram) };
  }

  function chaveEnqueteVotando(e) {
    if (app.modo === 'offline') return null; // o manual já está no estado (geracao)
    const foco = afirmacaoEmFoco(e);
    const enq = app.config.enquetes[e.enquete];
    return [contagemVotaram(e), enq.revelar === 'ao_vivo' && foco ? N().enquete.histograma(app.dados.votos?.[foco]) : null];
  }

  function kickerEnquete(e) {
    const enq = app.config.enquetes[e.enquete];
    return [enq.titulo, rotuloMomento(e.momento)].filter(Boolean).join(' · ');
  }

  function telaEnqueteVotando(s, e) {
    const { el } = D();
    const enq = app.config.enquetes[e.enquete];
    const ordem = ordemAfirmacoes(enq);
    const offline = app.modo === 'offline';
    const aoVivo = enq.revelar === 'ao_vivo';
    const foco = afirmacaoEmFoco(e);
    const escalaLonga = lista(app.config.escala.longos);
    const posicao = foco ? `afirmação ${ordem.indexOf(foco) + 1} de ${ordem.length}` : `${ordem.length} afirmações no celular`;

    s.appendChild(cabecalho(`${kickerEnquete(e)} · ${posicao}`, foco ? enq.afirmacoes[foco].texto : enq.titulo,
      { cronometro: true, classeTitulo: foco ? 'afirmacao' : null }));

    if (!foco) {
      // Online, modo "todas": as afirmações aparecem para leitura; o voto é no celular.
      s.appendChild(el('ol', { classe: 'lista-afirmacoes' }, ordem.map((a) => el('li', { texto: enq.afirmacoes[a].texto }))));
    }

    if (offline) {
      const hist = histManual(e, foco);
      const n = hist.reduce((t, x) => t + x, 0);
      s.appendChild(el('p', { classe: 'enquete-status' }, [
        el('b', { classe: 'numero-destaque', texto: F().inteiro(n) }), n === 1 ? ' contado nesta afirmação' : ' contados nesta afirmação',
      ]));
      // Votos de celular de antes da queda (achado 27): a tela diz quantos são,
      // e que a contagem à mão os substitui. Sem isto, "0 contados" escondia N
      // votos, que o Enter apurava sem o apresentador ter visto.
      const celular = e.manual ? 0 : votosDeCelular(e);
      // O que fazer com eles (o Enter apura; a contagem à mão substitui) é
      // conversa do apresentador e fica na barra (D-047, dicaDoPasso).
      if (celular > 0) {
        s.appendChild(el('p', { classe: 'aviso-celulares', dados: { votosCelular: String(celular) } }, [
          el('b', { texto: F().inteiro(celular) }), celular === 1 ? ' pessoa votou' : ' pessoas votaram',
          ' pelo celular antes da queda.',
        ]));
      }
      if (aoVivo) {
        s.appendChild(grafico('grafico-histograma', (largura, altura, fonte) => G().histograma({
          largura, altura, fonte, series: [{ hist, estilo: 'cheio' }], rotuloAria: 'Contagem por mão levantada',
        })));
        s.appendChild(G().rotulosEscala(escalaLonga));
      } else {
        // O "antes" pareado não tem gráfico até o comparativo (D-011): aqui ficam
        // só os contadores que o apresentador digita.
        s.appendChild(el('ol', { classe: 'contadores' }, hist.map((c, i) => el('li', { classe: 'contador', dados: { categoria: String(i + 1) } }, [
          el('b', { classe: 'contador-tecla', texto: String(i + 1) }),
          el('span', { classe: 'contador-valor', texto: F().inteiro(c) }),
          el('span', { classe: 'contador-rotulo', texto: escalaLonga[i] }),
        ]))));
      }
    } else {
      const { votaram, total } = contagemVotaram(e);
      s.appendChild(el('p', { classe: 'enquete-status' }, [
        el('b', { classe: 'numero-destaque', texto: F().inteiro(votaram) }), ` de ${F().inteiro(total)} votaram`,
      ]));
      if (aoVivo && foco) {
        const hist = N().enquete.histograma(app.dados.votos?.[foco]);
        s.appendChild(grafico('grafico-histograma', (largura, altura, fonte) => G().histograma({ largura, altura, fonte, series: [{ hist, estilo: 'cheio' }] })));
        s.appendChild(G().rotulosEscala(escalaLonga));
      }
    }
    s.appendChild(rodapeEnquete());
  }

  function telaApurando(s) {
    const { el } = D();
    D().acrescentar(s, [cabecalho(null, 'Apurando…'), el('p', { classe: 'texto-grande', texto: 'Um instante: contando os votos que o servidor aceitou.' })]);
  }

  // O "fechando" do desfazer da abertura (D-037). "Apurando…" diante da turma
  // dizia que a votação aberta por engano estava sendo contada.
  function telaDesfazendo(s) {
    const { el } = D();
    D().acrescentar(s, [cabecalho(null, 'Desfazendo a abertura…'), el('p', { classe: 'texto-grande', texto: 'Um instante: a votação foi aberta antes da hora.' })]);
  }

  function telaEnqueteApurada(s, e) {
    const { el } = D();
    const enq = app.config.enquetes[e.enquete];
    const ap = app.dados.enquetes?.[e.enquete]?.[e.momento];
    const ordem = ordemAfirmacoes(enq);
    const metodo = ap?.metodo === 'manual' ? 'contagem por mão levantada' : 'votos pelo celular';
    if (!ap) {
      D().acrescentar(s, [cabecalho(kickerEnquete(e), 'Apurando…')]);
      return;
    }
    if (enq.revelar === 'so_no_comparativo') {
      const n = Math.max(0, ...ordem.map((a) => ap.n?.[a] || 0));
      D().acrescentar(s, [
        cabecalho(kickerEnquete(e), 'Respostas registradas'),
        el('p', { classe: 'texto-grande' }, [el('b', { classe: 'numero-destaque', texto: F().inteiro(n) }), n === 1 ? ' pessoa respondeu' : ' pessoas responderam', ` (${metodo}).`]),
        el('p', { classe: 'texto-grande texto-secundario', texto: 'O resultado fica guardado e aparece só no comparativo, no fim do seminário.' }),
        rodapeEnquete(),
      ]);
      return;
    }
    s.appendChild(cabecalho(`Resultado · ${rotuloMomento(e.momento) ? `${rotuloMomento(e.momento)} · ` : ''}${metodo}`, enq.titulo));
    s.appendChild(el('p', { classe: 'legenda' }, [
      G().amostra('discorda'), ' discorda (1 e 2) ', G().amostra('neutro'), ' neutro (3) ', G().amostra('concorda'), ' concorda (4 e 5)',
    ]));
    const linhas = el('div', { classe: 'resumos' });
    for (const a of ordem) {
      const hist = lista(ap.histogramas?.[a]);
      const r = N().enquete.resumo(hist.length === 5 ? hist : [0, 0, 0, 0, 0]);
      const estat = r.n === 0
        ? [el('span', { texto: 'sem votos' })]
        : [el('span', {}, ['mediana ', el('b', { classe: 'mediana', texto: F().decimal(r.mediana) })]), el('span', { classe: 'media', texto: ` · média ${F().decimal(r.media)} · n = ${r.n}` })];
      linhas.appendChild(el('div', { classe: 'resumo-linha', dados: { afirmacao: a } }, [
        el('p', { classe: 'resumo-texto', texto: enq.afirmacoes[a].texto }),
        el('div', { classe: 'resumo-dados' }, [
          r.n === 0 ? el('div', { classe: 'grafico grafico-vazio' }) : grafico('grafico-partes', (largura, altura, fonte) => G().tresPartes({ largura, altura, fonte, resumo: r })),
          el('p', { classe: 'resumo-estat' }, estat),
        ]),
      ]));
    }
    s.appendChild(linhas);
    s.appendChild(rodapeEnquete());
  }

  // ---------- Tela: bloco ----------

  function placarResumido(classe) {
    const { el } = D();
    const e = app.estado;
    const renda = app.config.indicadores.renda;
    const itens = ativas(e).map((id) => {
      // O patrimônio (esquema v2.2): o empréstimo a pagar é dívida, e não
      // dinheiro em caixa. Antes do placar, o estado inicial da equipe. O nome
      // do personagem já está no rótulo da equipe (teste do Kleber de 05/10).
      const valor = patrimonioDe(app.dados.placar?.[id] ?? N().motor.estadoInicial(app.config, id));
      return el('li', { classe: 'resumido-linha', dados: { equipe: id } }, [
        rotuloEquipe(id),
        el('span', { classe: 'resumido-valor', texto: F().indicador(renda, valor) }),
      ]);
    });
    return el('div', { classe: ['placar-resumido', classe] }, [
      el('p', { classe: 'kicker', texto: renda ? renda.nome : 'Saldo' }),
      el('ol', { classe: 'resumido-lista' }, itens),
    ]);
  }

  // ---------- Linha do tempo do seminário (D-042) ----------

  // O "Mapa do seminário" põe os itens por extenso em duas colunas: até 8 por
  // coluna cabem em 1024×768, com os títulos do config quebrando em duas linhas
  // (o e2e confere). Passou disso, o fim do seminário vira um item só
  // (roteiro.linhaDoTempo). O mesmo limite vale para a trilha dos outros blocos,
  // para o "k de n" ser o mesmo em todos eles.
  const MAX_ITENS_LINHA = 16;

  // O bloco do mapa não tem campo próprio no passo (o validador descarta chave
  // nova no roteiro, com aviso): é reconhecido pelo título, o do roteiro.
  const RE_MAPA = /^mapa do semin[aá]rio\b/i;
  const ehMapa = (passo) => passo?.tipo === 'bloco' && RE_MAPA.test(passo.titulo || '');

  const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const descreverItem = (item) => (item.tipo === 'final' ? maiuscula(item.palavras.join(', ')) : descreverPasso(app.passos[item.indices[0]]));

  // O seminário inteiro, do primeiro passo depois da entrada na sala até o
  // último (D-042; rascunho, seção 7, item 15). "Você está aqui" é o item do
  // passo atual; "a seguir" é o item seguinte da própria linha, marcado nela.
  // Antes, o "a seguir" era o próximo passo do roteiro, que muitas vezes nem
  // estava na linha (formação das equipes, placar, termômetro, "Fim").
  function linhaDoTempo(e, { mapa }) {
    const { el } = D();
    const { itens } = N().roteiro.linhaDoTempo(app.config, app.passos, { maxItens: MAX_ITENS_LINHA });
    const posicao = itens.findIndex((x) => x.indices.includes(e.indice));
    const seguinte = posicao >= 0 ? itens[posicao + 1] : itens.find((x) => x.indices[0] > e.indice);
    const momento = (item) => {
      if (item.indices.includes(e.indice)) return 'atual';
      return item.indices[0] < e.indice ? 'passado' : 'futuro';
    };
    const comum = (item) => ({
      classe: [`trecho-${item.tipo}`, `trecho-${momento(item)}`, item === seguinte ? 'trecho-seguinte' : null],
      dados: { trecho: String(item.indices[0]), passos: item.indices.join(','), ...(item === seguinte ? { seguinte: '1' } : {}) },
      'aria-current': momento(item) === 'atual' ? 'step' : null,
    });
    const seguir = el('p', { classe: 'linha-tempo-seguir' }, [
      el('b', { texto: 'Você está aqui' }),
      posicao >= 0 ? ` (${posicao + 1} de ${itens.length})` : null,
      seguinte ? [' · a seguir: ', el('b', { texto: descreverItem(seguinte) })] : ' · é o último trecho',
    ]);
    if (mapa) {
      // No "Mapa do seminário", a linha é o conteúdo: todos os itens por
      // extenso, em duas colunas quando passam de seis (cabe em 1024×768).
      // Esquema v3 (D-060): com 6 rodadas e os blocos de dados entre elas, o
      // roteiro de 60 min dá 19 itens, e vários títulos quebram em duas linhas.
      // As colunas são de texto corrido (CSS columns), e não linhas de grade: na
      // grade, cada linha tinha a altura do item mais alto do par, e a lista
      // passava da faixa de entrada em 1024×768. Se ainda transbordar (medido
      // depois do desenho), os itens se aproximam (data-aperto), sem baixar a
      // letra dos 28 px.
      const colunas = itens.length > 6 ? 2 : 1;
      app.depoisDeMedir.push(() => {
        const nav = app.el.palco.querySelector('.linha-tempo-mapa');
        if (nav && nav.scrollHeight > nav.clientHeight + 1) nav.dataset.aperto = '1';
      });
      return el('nav', { classe: 'linha-tempo linha-tempo-mapa', 'aria-label': 'Mapa do seminário' }, [
        el('ol', {
          classe: 'linha-tempo-lista',
          estilo: { '--colunas': String(colunas) },
        }, itens.map((item) => {
          const c = comum(item);
          return el('li', { ...c, classe: ['trecho-mapa', ...c.classe] }, [
            el('span', { classe: 'trecho-marca', 'aria-hidden': 'true' }),
            el('span', { classe: 'trecho-titulo' }, [
              descreverItem(item),
              momento(item) === 'atual' ? el('b', { classe: 'trecho-aqui', texto: ' · você está aqui' }) : null,
            ]),
          ]);
        })),
        seguir,
      ]);
    }
    // Nos outros blocos, discreta: uma trilha de marcas (o mês do jogo escrito
    // dentro da dele) e uma linha de texto. Esquema v3: com rodadas de mais de
    // um mês, a marca leva o nome curto do período ("Jan–fev"), e não "mês 1"
    // (o jogo tem 12 meses em 6 rodadas, e "mês 2" seria o bimestre mar–abr).
    const mensal = periodo().meses === 1;
    const trilha = el('ol', { classe: 'linha-tempo-trilha' }, itens.map((item) => {
      const c = comum(item);
      const passo = app.passos[item.indices[0]];
      if (item.tipo !== 'rodada') {
        return el('li', { ...c, classe: ['trecho', ...c.classe], 'aria-label': descreverItem(item), title: descreverItem(item) }, []);
      }
      const n = posicaoRodada(passo.rodada).n;
      const nome = rotuloDaRodada(passo.rodada);
      // O começo do período ("Jan" de "Jan–fev"), para a trilha apertada. Sem
      // o traço (um título que não é período), o número.
      const curto = /[–-]/.test(nome) ? nome.split(/[–-]/)[0].trim() : String(n);
      return el('li', {
        ...c, classe: ['trecho', ...c.classe], 'aria-label': descreverItem(item), title: descreverItem(item),
        dados: { ...c.dados, numero: String(n), curto },
      }, [mensal ? `mês ${n}` : nome]);
    }));
    // Seis nomes de bimestre e os blocos entre eles não cabem na largura de
    // 1024×768 com a letra de 28 px: medida a trilha, se ela transborda, as
    // marcas das rodadas ficam com o começo do período ("Jan", "Mar", "Mai":
    // data-compacta="curto") e, só se nem assim couberem, com o número
    // ("numero"). O nome inteiro continua na dica e no "a seguir". Em 1920×1080
    // os nomes cabem. Revisão da F7 (achado 13 da revisão de conteúdo e
    // legibilidade): ia direto para o número, e em 1024×768 as marcas saíam
    // "1"…"6", sem o vínculo com o calendário que é o ponto da D-060.
    if (!mensal) {
      app.depoisDeMedir.push(() => {
        const marcas = trilha.querySelectorAll('.trecho-rodada');
        for (const nivel of ['curto', 'numero']) {
          if (trilha.scrollWidth <= trilha.clientWidth + 1) return;
          trilha.dataset.compacta = nivel;
          for (const li of marcas) li.textContent = li.dataset[nivel];
        }
      });
    }
    return el('nav', { classe: 'linha-tempo', 'aria-label': 'Linha do tempo do seminário' }, [trilha, seguir]);
  }

  function telaBloco(s, e) {
    const passo = passoDe(e);
    const mapa = ehMapa(passo);
    if (mapa) s.classList.add('bloco-mapa');
    s.appendChild(cabecalho('Apresentação', passo.titulo || 'Apresentação', { classeTitulo: 'titulo-bloco' }));
    s.appendChild(linhaDoTempo(e, { mapa }));
    if (!mapa && e.equipesTravadas && ativas(e).length > 0) s.appendChild(placarResumido('placar-discreto'));
  }

  // ---------- Tela: formar equipes ----------

  function membrosPorEquipe() {
    const conta = {};
    let semEquipe = 0;
    for (const m of Object.values(app.dados.membros || {})) {
      if (m && tem(app.config.equipes, m.equipe) && app.estado?.equipesAbertas?.[m.equipe] === true) conta[m.equipe] = (conta[m.equipe] || 0) + 1;
      else semEquipe += 1;
    }
    return { conta, semEquipe };
  }

  function chaveMembrosPorEquipe() {
    return app.modo === 'offline' ? null : membrosPorEquipe();
  }

  const limitesEquipes = () => {
    const total = equipesOrdem().length;
    return { min: Math.min(3, total), max: Math.min(6, total) };
  };

  // "De 3 a 6 equipes" fica na tela (contratos, seção 7): o anfitrião só exige
  // pelo menos uma, e as obrigatórias ficam sempre abertas.
  function alternarEquipe(id) {
    const e = app.estado;
    if (!e || e.tipo !== 'formarEquipes' || e.equipesTravadas) return;
    const abertas = new Set(ativas(e));
    const { min, max } = limitesEquipes();
    const eq = app.config.equipes[id];
    if (!eq) return;
    if (abertas.has(id)) {
      if (eq.obrigatoria) return avisar(`${eq.nome} sempre joga (equipe obrigatória).`);
      if (abertas.size <= min) return avisar(`O mínimo é de ${min} equipes.`);
      abertas.delete(id);
    } else {
      if (abertas.size >= max) return avisar(`O máximo é de ${max} equipes.`);
      abertas.add(id);
    }
    executar(() => app.anf.definirEquipesAbertas([...abertas]), { geracao: e.geracao });
  }

  function telaFormarEquipes(s, e) {
    const { el, botao } = D();
    const abertas = ativas(e);
    const { conta, semEquipe } = membrosPorEquipe();
    const offline = app.modo === 'offline';
    s.appendChild(cabecalho('Formação das equipes', 'Quantas equipes jogam?'));
    const grade = el('div', { classe: 'grade-equipes' });
    equipesOrdem().forEach((id) => {
      const eq = app.config.equipes[id];
      const aberta = abertas.includes(id);
      // A cor (é por ela que o aluno escolhe a equipe no celular) e o
      // personagem, "Jonas, motoboy": daqui em diante, o telão chama a equipe
      // pelo personagem (teste do Kleber de 05/10), e é aqui que a sala liga um
      // ao outro.
      const detalhes = [el('span', { classe: 'equipe-persona', texto: nomeDoPersonagem(id) })];
      if (eq.lugar) detalhes.push(el('span', { classe: 'equipe-lugar', texto: eq.lugar }));
      if (!offline && aberta) detalhes.push(el('span', { classe: 'equipe-conta', texto: F().pessoas(conta[id] || 0) }));
      detalhes.push(el('span', { classe: 'equipe-situacao', texto: aberta ? (eq.obrigatoria ? 'sempre joga' : 'aberta') : 'fechada' }));
      const b = botao('', () => alternarEquipe(id), { classe: ['cartao-equipe', aberta ? 'aberta' : 'fechada'], pressionado: aberta, dados: { equipe: id } });
      D().limpar(b);
      D().acrescentar(b, [rotuloEquipe(id, null, { cor: true }), el('span', { classe: 'cartao-equipe-detalhes' }, detalhes)]);
      grade.appendChild(b);
    });
    s.appendChild(grade);
    const status = [`${abertas.length} ${abertas.length === 1 ? 'equipe aberta' : 'equipes abertas'}`];
    if (!offline) status.push(semEquipe === 1 ? '1 pessoa sem equipe' : `${semEquipe} pessoas sem equipe`);
    s.appendChild(el('p', { classe: 'formar-status', texto: status.join(' · ') }));
  }

  // ---------- Tela: personas ----------

  // "Motoboy, 34 anos, entrega…" → "Motoboy": o ofício, até a primeira vírgula
  // ou ponto. O celular mostra a persona inteira (arquitetura, seção 5); a
  // primeira frase inteira, com a casa ao lado, fazia as cinco personas
  // passarem de 1024×768 com a letra de 28 px (revisão de 29/09).
  function primeiroTrecho(texto) {
    const m = /^(.+?)[,.;:!?](\s|$)/.exec(String(texto || ''));
    return m ? m[1] : String(texto || '');
  }

  // A casa de cada persona no telão, que é o que a sala inteira vê (D-044;
  // D-065): quantas pessoas, o básico, a outra renda (ou que não há outra) e,
  // numa linha própria, o furo de um mês comum (motor.mesComum: o todoMes, a
  // outra renda e o básico, sem rodada nem carta). A frase inteira da família,
  // o rótulo da outra renda e o básico item a item ficam no celular (o rótulo
  // vai na dica). Cada pedaço é inteiro: a linha só quebra entre eles.
  //
  // No teste de 30/09, a tela parecia sobreposta: o nome da equipe (com a
  // forma) e o nome da persona tinham linhas de base diferentes, e o "· 3
  // pessoas em casa" caía sozinho na linha de baixo, com o ponto na frente.
  // Agora são três linhas fixas por persona: quem é, a casa, e a conta do mês.
  function linhasDaCasa(p, equipeId) {
    const { el } = D();
    const mes = N().motor.mesComum(app.config, equipeId);
    const outra = p.outraRenda && p.outraRenda.valor > 0 ? p.outraRenda : null;
    const pessoas = p.familia?.pessoas;
    const pedaco = (texto, valor, extra) => el('span', { classe: 'conta', ...extra }, [texto, valor ? el('b', { texto: valor }) : null]);
    const pedacos = [
      Number.isInteger(pessoas) ? pedaco(pessoas === 1 ? '1 pessoa em casa' : `${pessoas} pessoas em casa`) : null,
      pedaco('básico da casa ', F().moeda(mes.basico)),
      outra ? pedaco('outra renda ', F().moeda(outra.valor), { title: outra.rotulo }) : pedaco('sem outra renda'),
    ].filter(Boolean);
    // "A conta do mês não fecha: faltam R$ W", e não "falta R$ W por mês": no
    // ensaio, "falta" solto no fim da linha não dizia o que faltava. Em
    // vermelho (ou verde, quando sobra), como o saldo do resultado da rodada, e
    // com a palavra dizendo o mesmo que a cor.
    const fecha = mes.saldoMes >= 0;
    return [
      el('p', { classe: ['texto-secundario', 'persona-casa'] }, juntarPedacos(pedacos)),
      el('p', {
        classe: 'persona-mes', dados: { saldoMesComum: String(mes.saldoMes), sinal: sinalDoSaldo(mes.saldoMes) },
      }, fecha
        ? ['a conta do mês fecha: sobram ', el('b', { texto: F().moeda(mes.saldoMes) })]
        : ['a conta do mês não fecha: faltam ', el('b', { texto: F().moeda(-mes.saldoMes) })]),
    ];
  }

  function telaPersonas(s, e) {
    const { el } = D();
    s.appendChild(cabecalho(null, 'As personas'));
    const abertas = ativas(e);
    const linhas = el('div', { classe: 'personas' });
    // Na ordem das equipes (a persona da equipe 1 primeiro), e não na ordem das
    // personas do config: com o config de 30/09, a tela saía "1 e 2, 5, 3, 4,
    // 6", e cada equipe tinha de varrer a tela atrás do próprio número (revisão
    // de 30/09, achado 12). As equipes da mesma persona continuam juntas.
    const personas = [...new Set(abertas.map((id) => app.config.equipes[id].persona))];
    for (const pid of personas) {
      const equipes = abertas.filter((id) => app.config.equipes[id].persona === pid);
      const p = app.config.personas[pid];
      linhas.appendChild(el('div', { classe: 'persona-linha', dados: { persona: pid, equipes: equipes.join(',') } }, [
        el('p', { classe: 'persona-quem' }, [
          // A equipe pelo personagem, "◯ 1 Jonas, motoboy" (teste do Kleber de
          // 05/10): o nome e o ofício já estão no rótulo, e o ".persona-nome"
          // ao lado repetiria os dois. Duas equipes da mesma persona (config
          // anterior à D-061) ficam juntas, ligadas por "e".
          el('span', { classe: 'persona-equipes' }, equipes.flatMap((id, i) => [i > 0 ? el('span', { classe: 'persona-e', texto: 'e' }) : null, rotuloEquipe(id)])),
        ]),
        ...linhasDaCasa(p, equipes[0]),
      ]));
    }
    s.appendChild(linhas);
    // D-061: seis personagens, um por equipe, são seis entradas de três linhas;
    // com a faixa de entrada embaixo, em 1024×768, a sexta passava 84 px da
    // borda. Só quando a lista transborda (medida depois do desenho), as
    // entradas se aproximam (entrelinha e vãos menores, o fio entre elas fica):
    // a letra continua nos 28 px e cada linha continua sem quebrar. Sem a faixa,
    // ou com cinco personas, nada muda.
    app.depoisDeMedir.push(() => {
      if (linhas.scrollHeight > linhas.clientHeight + 1) linhas.dataset.aperto = '1';
    });
  }

  // ---------- Tela: rodada ----------

  function contagemDecisoes(e, eq) {
    const votos = app.dados.decisoes?.[eq] || {};
    const membros = app.dados.membros || {};
    const ativos = ativosAgora();
    let decidiram = 0;
    for (const u of Object.keys(votos)) {
      const m = membros[u];
      if (m && m.equipe === eq && typeof m.entrouEm === 'number' && m.entrouEm <= e.abertoEm) decidiram += 1;
    }
    let total = 0;
    for (const [u, m] of Object.entries(membros)) {
      if (m && m.equipe === eq && typeof m.entrouEm === 'number' && m.entrouEm <= e.abertoEm && ativos.has(u)) total += 1;
    }
    return { decidiram, total: Math.max(total, decidiram) };
  }

  function chaveDecisoes(e) {
    if (app.modo === 'offline') return null; // as decisões do apresentador estão no estado
    return ativas(e).map((eq) => contagemDecisoes(e, eq));
  }

  function equipeDecidiu(e, eq) {
    if (e.forcadas?.[eq]) return true;
    if (app.modo === 'offline') return false;
    const { decidiram, total } = contagemDecisoes(e, eq);
    return total > 0 && decidiram >= total;
  }

  function dicaDaRodada(e) {
    if (e.subfase === 'prorrogacao') return 'Enter encerra a prorrogação.';
    const decorrido = (agora() - e.abertoEm) / 1000;
    const minimo = app.config.tempos.decisaoMinSeg;
    if (decorrido < minimo) return `Tempo mínimo de conversa: faltam ${F().relogio((minimo - decorrido) * 1000)}`;
    const equipes = ativas(e);
    if (equipes.length > 0 && equipes.every((eq) => equipeDecidiu(e, eq))) return 'Todas as equipes decidiram. Enter encerra.';
    return 'Enter encerra a decisão.';
  }

  // A dica de operação do passo (teclas, tempo mínimo de conversa, o que o Enter
  // e o Espaço fazem) fica só na barra do apresentador (D-047): na projeção, ela
  // falava com a turma de teclas que só o apresentador aperta. O tique a
  // atualiza, porque o tempo mínimo de conversa corre.
  function dicaDoPasso(e) {
    switch (e.tipo) {
      case 'enquete': {
        if (e.subfase !== 'votando') return '';
        if (app.modo !== 'offline') return 'Enter encerra a votação.';
        const teclas = e.afirmacao === '*'
          ? 'Teclas 1 a 5 somam · Shift + tecla desconta · Espaço: próxima afirmação (↑ volta) · Enter encerra a enquete inteira'
          : 'Teclas 1 a 5 somam · Shift + tecla desconta · Espaço: próxima afirmação · Enter encerra';
        const celular = e.manual ? 0 : votosDeCelular(e);
        return celular > 0 ? `Enter apura esses votos; a contagem à mão os substitui. ${teclas}` : teclas;
      }
      case 'formarEquipes': {
        const { min, max } = limitesEquipes();
        return `De ${min} a ${max} equipes · teclas 1 a ${equipesOrdem().length} abrem e fecham`;
      }
      case 'rodada': return ['decidindo', 'prorrogacao'].includes(e.subfase) ? dicaDaRodada(e) : '';
      case 'placarFinal':
      case 'comparativo': {
        const total = e.tipo === 'placarFinal' ? paginasDoPlacar().length : ordemAfirmacoes(app.config.enquetes[e.enquete]).length;
        const pagina = Math.min(Math.max(0, app.ui.pagina), total - 1);
        return pagina < total - 1 ? `Espaço: próxima página (${pagina + 2} de ${total})` : 'Espaço: segue o roteiro';
      }
      case 'fim': return 'A exportação leva só totais. Apagar a sala remove tudo o que ficou neste navegador.';
      default: return '';
    }
  }

  // No offline, o apresentador clica a opção de cada equipe (arquitetura, seção
  // 11). Clicar de novo na opção marcada desfaz.
  function decidirOffline(eq, opcao) {
    const atual = app.estado.forcadas?.[eq] ?? null;
    executar(() => app.anf.decidirPorEquipe(eq, atual === opcao ? null : opcao), vista());
  }

  function celulaEquipe(e, eq, rodada, opcoesVisiveis) {
    const { el, botao } = D();
    const filhos = [rotuloEquipe(eq)];
    const forcada = e.forcadas?.[eq] ?? null;
    if (app.modo === 'offline') {
      filhos.push(el('div', { classe: 'botoes-opcao', role: 'group', 'aria-label': `Decisão da equipe ${numeroEquipe(eq)}, ${nomeDoPersonagem(eq)}` },
        opcoesVisiveis.map((op) => botao(letraDe(rodada, op), () => decidirOffline(eq, op), {
          classe: ['botao-letra', forcada === op ? 'botao-marcado' : null], pressionado: forcada === op,
          titulo: rodada.opcoes[op].rotulo, dados: { equipe: eq, opcao: op },
        }))));
    } else if (forcada) {
      filhos.push(el('span', { classe: 'equipe-andamento', texto: 'decidida pelo apresentador' }));
    } else {
      const { decidiram, total } = contagemDecisoes(e, eq);
      filhos.push(el('span', { classe: 'equipe-andamento' }, [el('b', { texto: `${decidiram} de ${total}` }), ' decidiram']));
    }
    return el('div', { classe: ['equipe-status', equipeDecidiu(e, eq) ? 'decidida' : null], dados: { equipe: eq } }, filhos);
  }

  function telaRodadaDecidindo(s, e) {
    const { el } = D();
    const rodada = app.config.rodadas[e.rodada];
    const { n, total } = posicaoRodada(e.rodada);
    s.appendChild(cabecalho(`Rodada ${n} de ${total} · decisão`, rodada.titulo, { cronometro: true }));
    s.appendChild(el('p', { classe: 'situacao', texto: rodada.texto }));
    s.appendChild(el('ol', { classe: 'opcoes' }, ordemOpcoes(rodada).map((op) => el('li', { dados: { opcao: op } }, [
      el('b', { classe: 'letra', texto: letraDe(rodada, op) }), el('span', { texto: rodada.opcoes[op].rotulo }),
    ]))));
    s.appendChild(el('div', { classe: 'equipes-status' }, ativas(e).map((eq) => celulaEquipe(e, eq, rodada, ordemOpcoes(rodada)))));
  }

  function telaProrrogacao(s, e) {
    const { el } = D();
    const rodada = app.config.rodadas[e.rodada];
    s.appendChild(cabecalho(`${rodada.titulo} · empate`, 'Empate: conversem', { cronometro: true }));
    const celulas = ativas(e).map((eq) => {
      const empatadas = e.empatadas?.[eq];
      if (!empatadas) {
        return el('div', { classe: 'equipe-status decidida', dados: { equipe: eq } }, [rotuloEquipe(eq), el('span', { classe: 'equipe-andamento', texto: 'decidida' })]);
      }
      const ops = ordemOpcoes(rodada).filter((op) => empatadas[op] === true);
      const celula = celulaEquipe(e, eq, rodada, ops);
      celula.insertBefore(el('span', { classe: 'equipe-empate', texto: `entre ${ops.map((op) => letraDe(rodada, op)).join(' e ')}` }), celula.children[1] || null);
      return celula;
    });
    s.appendChild(el('ol', { classe: 'opcoes opcoes-compactas' }, ordemOpcoes(rodada).map((op) => el('li', {}, [
      el('b', { classe: 'letra', texto: letraDe(rodada, op) }), el('span', { texto: rodada.opcoes[op].rotulo }),
    ]))));
    s.appendChild(el('div', { classe: 'equipes-status' }, celulas));
  }

  function resultadosDaRodada(e) {
    const res = app.dados.resultados?.[e.rodada] || {};
    return ativas(e).filter((eq) => res[eq]).map((eq) => ({ eq, r: res[eq] }));
  }

  function telaSorteio(s, e) {
    const { el } = D();
    const rodada = app.config.rodadas[e.rodada];
    const itens = resultadosDaRodada(e);
    const graves = new Set(Object.values(app.config.cartas).filter((c) => c.tom === 'grave').map((c) => c.id));
    const animar = !raiz.matchMedia('(prefers-reduced-motion: reduce)').matches;
    s.appendChild(cabecalho(rodada.titulo, 'Sorteio das cartas'));
    s.appendChild(el('p', { classe: 'texto-secundario', texto: 'A decisão mudou o tamanho das fatias. A sorte escolhe a fatia.' }));
    const estiloLinhas = { '--linhas': String(Math.max(1, itens.length)) };
    s.appendChild(el('div', { classe: 'linhas-grafico linhas-sorteio' }, [
      // A chance de carta grave de cada equipe, escrita sob o nome (achado 8): as
      // fatias graves são finas demais para levar o número, e é essa chance que a
      // decisão mudou ("a decisão muda o tamanho das fatias", seção 8). A letra
      // da decisão vem antes (revisão de 30/09, achado 9): é ela que mudou as
      // fatias, e o sorteio não dizia qual tinha sido.
      el('div', { classe: 'coluna-rotulos', estilo: estiloLinhas }, itens.map(({ eq, r }) => el('div', { classe: 'linha-rotulo linha-rotulo-sorteio' }, [
        rotuloEquipe(eq),
        graves.size > 0 ? el('span', { classe: 'linha-graves', dados: { equipe: eq } }, [
          el('span', { classe: 'linha-decisao', dados: { decisao: r.decisao } }, ['decisão ', el('b', { texto: letraDe(rodada, r.decisao) })]), ' · ',
          'cartas graves ', el('b', { texto: F().porcento(lista(r.chances).filter((c) => graves.has(c.carta)).reduce((t, c) => t + c.chance, 0)) }),
        ]) : null,
      ]))),
      grafico('grafico-fatias', (largura, altura, fonte) => G().fatias({
        largura, altura, fonte, animar,
        // D-040: o nome curto da carta dentro da fatia, quando cabe.
        curtos: Object.fromEntries(Object.values(app.config.cartas).filter((c) => c.curto).map((c) => [c.id, c.curto])),
        linhas: itens.map(({ r }) => ({ chances: lista(r.chances), sorteada: r.carta, graves })),
      })),
      el('div', { classe: 'coluna-valores', estilo: estiloLinhas }, itens.map(({ eq, r }) => el('div', {
        classe: ['linha-valor', 'carta-sorteada', animar ? 'revelar-apos' : null], dados: { equipe: eq, carta: r.carta },
      }, [app.config.cartas[r.carta]?.titulo || r.carta]))),
    ]));
    if (graves.size > 0) s.appendChild(el('p', { classe: 'legenda' }, [G().amostra('antes'), ' cartas graves (hachuradas)']));
  }

  // O mês de uma equipe refeito pelo motor, com o estado e o histórico de antes
  // (a mesma conta do anfitrião). cartaId null refaz o mesmo mês sem carta.
  function refazerMes(rodadaId, eq, r, cartaId = r.carta) {
    return N().motor.aplicar(app.config, {
      equipeId: eq, rodadaId, opcaoId: r.decisao, cartaId, estado: estadoAntes(eq, rodadaId), historico: historicoAntes(eq, rodadaId),
    });
  }

  // O efeito da carta sobre o saldo do mês: o mês com a carta menos o mesmo mês
  // sem carta nenhuma. Somar só as linhas de origem "carta" deixava de fora o
  // conserto e o remédio, que no esquema v2.1 saem com a origem "gasto".
  function efeitoDaCarta(e, eq, r) {
    return refazerMes(e.rodada, eq, r).mes.saldoMes - refazerMes(e.rodada, eq, r, null).mes.saldoMes;
  }

  // As contas do mês gravadas pelo anfitrião (resultados/{r}/{eq}.mes). Um
  // resultado sem elas (sala criada antes do esquema v2) é refeito com a mesma
  // conta do motor.
  function mesDoResultado(rodadaId, eq, r) {
    return r.mes || refazerMes(rodadaId, eq, r).mes;
  }

  // O custo real da carta gravado pelo anfitrião (D-052). Resultado de sala
  // anterior ao v2.1 não o tem, e é refeito com a mesma conta do motor.
  function custoDoResultado(rodadaId, eq, r) {
    return r.cartaCusto || refazerMes(rodadaId, eq, r).cartaCusto;
  }

  // O que veio dos meses anteriores (motor, deAntes; D-052): "fratura: mais 25
  // dias parado −R$ 2.233 · auxílio do INSS (45 dias) +R$ 2.431". Nenhuma tela
  // mostrava essas linhas, e a conta lida não fechava: os 25 dias sumiam dentro
  // do trabalho (revisão de 29/09, 2ª rodada, achado 10). Gravado pelo
  // anfitrião só quando há; resultado de sala anterior (sem o campo) é refeito
  // pelo motor, que devolve [] quando não há nada.
  function deAntesDoResultado(rodadaId, eq, r) {
    return Object.hasOwn(r, 'deAntes') ? lista(r.deAntes) : lista(refazerMes(rodadaId, eq, r).deAntes);
  }

  // Com sinal: o que veio de antes pode tirar (a fratura) ou pôr (o INSS).
  const pedacosDeAntes = (itens) => itens.map((x) => rotuloEValor(x.rotulo, F().moeda(x.valor, { sinal: true }), ['de-antes'], { deAntes: x.rotulo }));

  // Um rótulo e o valor dele. Só a última palavra do rótulo fica colada ao
  // valor (nunca "R$" sozinho no começo da linha); o resto do rótulo quebra
  // como texto. Com o pedaço inteiro sem quebra, "multa do aluguel R$ 130"
  // pulava de linha e deixava meia linha vazia, e seis equipes de três linhas
  // viravam quatro em 1024×768 (revisão de 29/09, 2ª rodada, achado 13).
  function rotuloEValor(rotulo, valorTexto, classes = [], dados = undefined) {
    const { el } = D();
    const palavras = String(rotulo).split(' ');
    const ultima = palavras.pop();
    return el('span', { classe: ['conta-quebra', ...classes], dados }, [
      palavras.length > 0 ? `${palavras.join(' ')} ` : null,
      el('span', { classe: 'conta-fim' }, [`${ultima} `, el('b', { texto: valorTexto })]),
    ]);
  }

  // O que a linha do mês nomeia (revisão de 29/09, 2ª rodada, achados 10 e 13),
  // cabendo seis equipes em 1024×768: o que veio de antes e mexeu no trabalho,
  // com sinal, e os gastos por origem dentro das próprias contas, somando à
  // vista ("gastos R$ 1.079 + curso de alongamento em gel, com kit R$ 1.500 +
  // multa do aluguel atrasado R$ 130"). A regra mora no núcleo
  // (historia.nomesDosGastos), com teste: aqui, com um gasto de opção, a multa
  // saía com sinal trocado e contada duas vezes (revisão da F7, achado 9).
  const nomesDoMes = (quem, custo, mes, deAntes) => N().historia.nomesDosGastos(app.config, quem, custo, mes, deAntes);

  // Um pedaço da conta: o rótulo e o valor sempre juntos (a linha só quebra
  // entre pedaços).
  const pedacoConta = (rotulo, valor) => rotuloEValor(rotulo, F().moeda(valor));
  const juntarPedacos = (pedacos) => pedacos.flatMap((p, i) => [i > 0 ? ' · ' : null, p]);

  // "entrou R$ X · gastos R$ G · básico R$ Y · faltou R$ Z" (D-044), com os
  // juros da dívida quando houve (D-046): sem eles, a conta projetada não
  // fechava. Os gastos (conserto, remédio, multa) vão numa linha própria desde o
  // esquema v2.1: dentro do "entrou", ele chegava a −R$ 2.541 (revisão de
  // 29/09, item 2). O faltou é o saldo do mês do motor (entrou − gastos −
  // básico − juros), e a conta lida na tela fecha. Resultado de antes do v2.1
  // não tem gastos, e a linha sai como antes. "gastos" é a lista de parcelas de
  // nomesDoMes (juntas por " + "); sem ela, "gastos R$ G".
  // D-059: o que a proteção pagou (o INSS do MEI, a ajuda da associação) vem
  // logo depois do "entrou", como "a proteção pagou R$ X": ela fica fora do
  // "entrou" no motor, e sem o pedaço a conta lida na tela não fecharia.
  // Resultado de antes da D-059 não tem mes.protecao, e a linha sai como antes.
  function contasDoMes(mes, classe, tag = 'p', gastos = null) {
    const pedacos = [pedacoConta('entrou', mes.entrou)];
    if (mes.protecao > 0) {
      // Espaço fixo entre "a" e "proteção": solto, o "a" ficava sozinho no fim
      // da linha, com o resto na linha de baixo.
      pedacos.push(rotuloEValor('a\u00a0proteção pagou', F().moeda(mes.protecao), ['conta-protecao'], { protecao: String(mes.protecao) }));
    }
    if (mes.gastos > 0) {
      const partes = gastos || [{ rotulo: 'gastos', valor: mes.gastos }];
      pedacos.push(partes.flatMap((p, i) => [i > 0 ? ' + ' : null, pedacoConta(p.rotulo, p.valor)]));
    }
    // D-066 (sala com o limite do cheque especial): a comida que não deu para
    // comprar não saiu do caixa, então o básico da conta é o que a casa de
    // fato consumiu, e o que faltou na mesa vem logo ao lado, entre
    // parênteses: "básico R$ 2.400 (faltou na mesa R$ 800)". A multa e os
    // juros do atraso (a mora) entram depois dos juros do banco: são dívida
    // nova (vão para as contas atrasadas) e, sem eles, a conta lida não
    // fecharia no saldo do motor. As contas que atrasaram ou foram pagas não
    // entram: trocam dinheiro por dívida, e o saldo não muda.
    // Revisão da F6c: os itens que não atrasam (gás, ônibus, remédio) e que a
    // casa ficou sem também não saíram do caixa; saem do básico, como a
    // comida, e vêm ao lado ("ficou sem R$ Z"). Só num config que os marca.
    const mesa = reaisInteiros(mes.faltouNaMesa);
    const semComprar = reaisInteiros(mes.ficouSem);
    const consumido = mes.basico - mesa - semComprar;
    pedacos.push(mesa > 0 ? [pedacoConta('básico', consumido), ' ', mesaEntreParenteses(mesa)] : pedacoConta('básico', consumido));
    if (semComprar > 0) pedacos.push(rotuloEValor('ficou sem', F().moeda(semComprar), ['conta-ficou-sem'], { ficouSem: String(semComprar) }));
    if (mes.juros > 0) pedacos.push(pedacoConta('juros', mes.juros));
    const multa = reaisInteiros(mes.multa);
    const mora = reaisInteiros(mes.mora);
    if (multa + mora > 0) {
      const rotulo = multa > 0 && mora > 0 ? 'multa e juros do atraso' : multa > 0 ? 'multa do atraso' : 'juros do atraso';
      pedacos.push(rotuloEValor(rotulo, F().moeda(multa + mora), ['conta-atraso'], { atraso: String(multa + mora) }));
    }
    pedacos.push(mes.saldoMes < 0 ? pedacoConta('faltou', -mes.saldoMes) : pedacoConta('sobrou', mes.saldoMes));
    return D().el(tag, { classe: ['contas', classe] }, juntarPedacos(pedacos));
  }

  // "(faltou na mesa R$ 800)": o parêntese de fechar fica colado ao valor; solto,
  // podia cair sozinho no começo da linha de baixo.
  function mesaEntreParenteses(valor) {
    const { el } = D();
    return el('span', { classe: ['conta-quebra', 'historia-mesa'], dados: { faltouNaMesa: String(valor) } }, [
      '(faltou na ', el('span', { classe: 'conta-fim' }, ['mesa ', el('b', { texto: F().moeda(valor) }), ')']),
    ]);
  }

  // O custo real da carta (D-052): "20 dias parado · renda perdida R$ X ·
  // gastos R$ Y", só com o que for maior que zero (carta sem custo não escreve
  // nada). Os gastos da carta ficam de fora quando as contas logo ao lado já os
  // dizem (cartaNosGastos, de nomesDoMes, ou quando são todos os gastos do
  // mês): o mesmo valor duas vezes na frase empurrava seis equipes para fora
  // de 1024×768. Senão, saem como "gastos da carta": ao lado de "gastos R$ X"
  // nas contas, dois "gastos" de valores diferentes confundiam a turma
  // (revisão de 29/09, 2ª rodada, achado 13).
  function pedacosDoCusto(custo, mes, cartaNosGastos = false) {
    if (!custo) return [];
    const { el } = D();
    const pedacos = [];
    if (custo.diasParado > 0) {
      pedacos.push(el('span', { classe: 'conta', dados: { custo: 'dias' } }, [el('b', { texto: F().inteiro(custo.diasParado) }), custo.diasParado === 1 ? ' dia parado' : ' dias parado']));
    }
    if (custo.rendaPerdida > 0) pedacos.push(pedacoConta('renda perdida', custo.rendaPerdida));
    if (custo.gastos > 0 && !cartaNosGastos && custo.gastos !== mes?.gastos) pedacos.push(pedacoConta('gastos da carta', custo.gastos));
    return pedacos;
  }

  function custoDaCarta(custo, mes, classe, cartaNosGastos = false) {
    const pedacos = pedacosDoCusto(custo, mes, cartaNosGastos);
    return pedacos.length > 0 ? D().el('span', { classe: ['custo-carta', classe] }, juntarPedacos(pedacos)) : null;
  }

  const textoSaldo = (valor) => (valor < 0 ? `faltou ${F().moeda(-valor)}` : `sobrou ${F().moeda(valor)}`);
  // A regra do celular (aluno.js, sinalDe): pelo valor arredondado, e o zero
  // neutro. Antes, o telão pintava "+R$ 0" de verde e o celular mostrava "R$ 0"
  // sem cor (revisão de 30/09, achado 16).
  const sinalDoSaldo = (v) => (Math.round(v) > 0 ? 'positivo' : Math.round(v) < 0 ? 'negativo' : 'zero');
  const personaDaEquipe = (eq) => app.config.personas[app.config.equipes[eq]?.persona];

  // O placar e a dívida contam o empréstimo como dívida (esquema v2.2): o
  // "saldo" de uma equipe é o patrimônio (o saldo acumulado menos o empréstimo
  // a pagar), e a dívida é o cheque especial mais o saldo devedor. No teste de
  // 30/09, o Jonas pegou R$ 1.500 no mês 2 e a tela mostrou "dívida R$ 1": o
  // empréstimo tinha entrado como renda, e a dívida dele não aparecia.
  const patrimonioDe = (valores) => N().historia.patrimonioDe(valores) ?? 0;
  const patrimonioNoPlacar = (eq) => patrimonioDe(app.dados.placar?.[eq]);

  // A dívida da tela é sempre a total (cheque especial + empréstimo), e o caixa
  // positivo, quando há, aparece ao lado como "caixa R$ X" (revisão da F6a):
  // com o empréstimo, a família pode ter R$ 800 no bolso e dever R$ 1.500 ao
  // banco, e "dívida R$ 1.500" sozinha escondia o dinheiro que ela ainda tinha
  // (e, sem dívida, "sem dívida" não dizia quanto sobrava). Os dois em reais
  // inteiros, como a tela os escreve: "caixa R$ 0" seria um número sem nada.
  // D-066 (esquema v3.1, sala com o limite do cheque especial): as contas
  // atrasadas saem da "dívida" e ganham um número próprio. A dívida passa a ser
  // a do banco (o cheque especial, que nunca passa do limite) mais o
  // empréstimo; somadas numa coisa só, "dívida R$ 19.316" escondia que R$ 1.500
  // eram do banco e o resto era aluguel e luz atrasados, com risco de despejo e
  // corte, que é a escolha que a D-066 quer mostrar. contasAtrasadas é null em
  // sala sem o limite (os valores não têm o indicador), e a tela fica como antes.
  // Teste do Kleber de 05/10 (print 7): com "dívida R$ 2.000" numa linha e
  // "contas atrasadas R$ 19.797" na outra, a sala lia dois números de dívida e
  // não somava. No telão, a dívida volta a ser um número só, a "dívida total":
  // o banco (cheque especial), o empréstimo e as contas atrasadas
  // (historia.dividaTotal: total + contasAtrasadas). É o mesmo número do
  // "faltou R$ X" do placar quando o caixa é zero (o patrimônio desconta as
  // três), no resultado, na história e no placar. contasAtrasadas continua no
  // retorno (o data-contas-atrasadas do resultado). O celular da equipe ainda
  // separa "dívida no banco" e "contas atrasadas" (js/aluno.js, fora deste
  // pedido).
  function dividaECaixa(valores) {
    const renda = Number(valores?.renda);
    const d = N().historia.dividaTotal(valores);
    const atrasadas = Number.isFinite(d?.contasAtrasadas) ? Math.round(d.contasAtrasadas) + 0 : null;
    return {
      divida: Math.round((d?.total ?? 0) + (d?.contasAtrasadas ?? 0)) + 0,
      contasAtrasadas: atrasadas,
      caixa: Number.isFinite(renda) && Math.round(renda) > 0 ? Math.round(renda) : 0,
    };
  }

  // D-066: o "faltou na mesa" é a comida que a casa deixou de comprar. Não é
  // dívida (ninguém cobra depois) e fica fora do saldo, mas é o custo humano
  // que a sala precisa ver; por isso vem sempre com o nome inteiro, à parte do
  // dinheiro. Em reais inteiros; 0 em sala sem o limite.
  const reaisInteiros = (v) => (Number.isFinite(v) ? Math.round(v) + 0 : 0);
  const pedacoMesa = (valor, classe) => rotuloEValor('faltou na mesa', F().moeda(valor), [classe], { faltouNaMesa: String(valor) });

  // D-067: a frase de quando a proteção pagou mais do que o trabalho daria num
  // período comum ("Auxílio do INSS (MEI): R$ 2.431, mais do que Bruna ganhava
  // trabalhando num bimestre comum (R$ 1.400)."). A regra e o texto moram no
  // núcleo (historia.fraseAcimaDoTrabalho), com teste; o celular usa a mesma.
  // null quando não é o caso, ou em sala de antes da D-067 (sem o campo).
  function fraseAcimaDoTrabalho(eq, r) {
    const protecao = N().historia.protecaoDoResultado(r);
    return N().historia.fraseAcimaDoTrabalho(protecao, personaDaEquipe(eq)?.nome, F().moeda, periodo());
  }

  // No resultado, a origem vai curta e discreta, ao lado do custo da carta. O
  // celular da equipe traz a frase inteira ("ninguém votou: ficou o de
  // sempre"). O termo "piloto automático" saiu de todas as telas (D-041;
  // rascunho, seção 7, item 14): no ensaio, ele confundia, e soava como a opção
  // boa de quem não votou.
  const ORIGENS = {
    piloto: 'ninguém votou',
    moeda: 'empate na moeda',
    prorrogacao: 'na prorrogação',
    apresentador: 'pelo apresentador',
  };

  // A linha curta da carta de parada (D-052, D-065): "20 dias parado · perdeu
  // R$ 1.787". Só com dias parados; a carta que custa só dinheiro (o conserto,
  // o calote) já aparece no saldo do mês, e o detalhe fica no celular e na
  // história. "perdeu", e não "renda perdida": a linha tem de caber ao lado do
  // saldo, numa linha só, com seis equipes em 1024×768.
  // Revisão da F7 (achado 11): "perdeu" é o prejuízo inteiro da carta, a renda
  // perdida mais os gastos dela. Em sala, "perdeu" se lê como tudo o que a carta
  // tirou, e só com a renda o Marcos "perdeu R$ 287" numa quebra que custou
  // R$ 1.887 com a embreagem: o telão suavizava justo as cartas de desgaste
  // (D-063).
  function linhaDaParada(custo) {
    if (!(custo?.diasParado > 0)) return null;
    const { el } = D();
    const perdeu = (custo.rendaPerdida || 0) + (custo.gastos || 0);
    return el('span', { classe: ['custo-carta', 'resultado-custo'] }, [
      el('span', { classe: 'conta', dados: { custo: 'dias' } }, [el('b', { texto: F().inteiro(custo.diasParado) }), custo.diasParado === 1 ? ' dia parado' : ' dias parado']),
      perdeu > 0 ? [' · ', rotuloEValor('perdeu', F().moeda(perdeu), [], { custo: 'perdeu' })] : null,
    ]);
  }

  // D-065 (teste de 30/09): o resultado projetado mostra só o essencial, com
  // espaço entre as equipes. Antes, cada equipe era uma frase de três linhas
  // (letra, carta, custo, o que veio de antes, entrou, gastos, multa, básico,
  // juros, faltou, dívida), e o Kleber achou a tela difícil de explicar em
  // aula. Agora, uma faixa por equipe, em três colunas alinhadas entre as
  // faixas (subgrid):
  // - a equipe (forma, número e personagem) e, embaixo, a letra da decisão;
  // - a carta que saiu, grande, e embaixo só o que a sala precisa ouvir: o
  //   empréstimo tomado no mês, os dias parados, o que a proteção pagou (D-059)
  //   e a origem da decisão quando não foi a maioria;
  // - o saldo do período em destaque, com + ou − e em verde ou vermelho, e o
  //   rótulo "saldo do bimestre" logo acima dele (o sinal e o rótulo dizem o
  //   mesmo que a cor, que nunca é o único canal; o zero fica neutro, "R$ 0",
  //   como no celular);
  // - embaixo da carta e do saldo, uma linha discreta com a dívida total e o
  //   que faltou na mesa.
  // Teste do Kleber de 05/10 (print 7): o "saldo do bimestre" ficava só no
  // cabeçalho, no canto de cima, e o número colorido não dizia o que era; e a
  // dívida vinha em duas linhas ("dívida R$ 2.000" e "contas atrasadas
  // R$ 19.797"), que a sala lia como duas dívidas. Agora o rótulo vai junto de
  // cada saldo, e a dívida é um número só (dividaECaixa).
  // Revisão de 30/09 (achado 9): sem a decisão, duas equipes do Jonas com a
  // mesma carta mostravam saldos diferentes sem explicação, e nada dizia que
  // uma delas tinha pegado R$ 1.500 (a dívida total fica igual com ou sem o
  // empréstimo). A letra é a mesma do telão da decisão e do celular (D-051).
  // O detalhamento das contas (entrou, gastos, multa, básico, juros,
  // empréstimo) fica no celular de cada equipe e na história do placar final.
  function telaResultado(s, e) {
    const { el } = D();
    const rodada = app.config.rodadas[e.rodada];
    const itens = resultadosDaRodada(e);
    // Só as N cartas mais extremas ganham animação (arquitetura, seção 5, R13):
    // seis cartas se mexendo ao mesmo tempo ninguém lê. A carta grave nunca é
    // animada, nem destacada com cor (D-016; seção 8, "tema sensível").
    const efeitos = itens.map(({ eq, r }) => ({ eq, efeito: efeitoDaCarta(e, eq, r) }));
    const n = app.config.regras.destacarCartas ?? 2;
    const destacadas = new Set(efeitos.filter((x) => x.efeito !== 0)
      .sort((a, b) => Math.abs(b.efeito) - Math.abs(a.efeito) || numeroEquipe(a.eq) - numeroEquipe(b.eq))
      .slice(0, n).map((x) => x.eq));
    // "saldo do bimestre" com rodadas de 2 meses (esquema v3): o número grande
    // é o saldo da rodada inteira, e "do mês" diria metade do que ele é. O
    // rótulo vai em cada faixa, logo acima do número (teste do Kleber de 05/10);
    // no cabeçalho, ele ficava longe do número que nomeava.
    const { doPeriodo } = periodo();
    const rotuloSaldo = `saldo ${doPeriodo}`;
    s.appendChild(cabecalho(null, rodada.titulo));
    const grade = el('div', { classe: 'grade-resultados', role: 'list', 'aria-label': `Resultado ${doPeriodo} por equipe` });
    for (const { eq, r } of itens) {
      const carta = app.config.cartas[r.carta] || {};
      const grave = carta.tom === 'grave';
      const mes = mesDoResultado(e.rodada, eq, r);
      const saldo = Math.round(mes.saldoMes) + 0;
      // A dívida total de depois do período (cheque especial, empréstimo e
      // contas atrasadas) e o caixa, se positivo. Resultado de sala antiga sem
      // o "depois" não tem de onde tirá-los, e fica em 0.
      const { divida, contasAtrasadas, caixa } = dividaECaixa(r.depois);
      const mesa = reaisInteiros(mes.faltouNaMesa);
      const acima = fraseAcimaDoTrabalho(eq, r);
      // Offline, toda decisão é do apresentador: dizer isso em cada faixa é ruído.
      const origem = r.origem === 'apresentador' && app.modo === 'offline' ? null : ORIGENS[r.origem];
      const rotuloDaOpcao = N().historia.textoDaOpcao(app.config, e.rodada, r.decisao, app.config.equipes[eq]?.persona).rotulo;
      const detalhes = [
        mes.emprestimo > 0 ? el('span', { classe: ['conta', 'resultado-emprestimo'], dados: { emprestimo: String(mes.emprestimo) } }, ['empréstimo ', el('b', { texto: F().moeda(mes.emprestimo) })]) : null,
        linhaDaParada(custoDoResultado(e.rodada, eq, r)),
        // D-067: com a frase embaixo da faixa, "a proteção pagou" sairia com o
        // mesmo valor duas vezes; a frase já diz quanto ela pagou.
        mes.protecao > 0 && !acima ? rotuloEValor('a\u00a0proteção pagou', F().moeda(mes.protecao), ['conta-protecao'], { protecao: String(mes.protecao) }) : null,
      ].filter(Boolean);
      // A linha de baixo, embaixo da carta e do saldo, alinhada à direita: a
      // dívida total ("sem dívida" quando não há dívida nem caixa), o caixa
      // positivo, quando há (revisão da F6a: com o empréstimo, a família pode
      // ter dinheiro no bolso e dever ao banco), e a comida que não deu para
      // comprar NESTE período (D-066), que não é dívida e por isso vem com o
      // próprio nome. Na coluna do dinheiro, um texto comprido alargava a
      // coluna, a parada da carta quebrava em duas linhas, e seis equipes
      // passavam de 1024×768; aqui, a linha cabe inteira na largura da faixa.
      // Teste do Kleber de 05/10 (print 7): a dívida e as contas atrasadas eram
      // duas linhas; a "dívida total" junta as duas.
      const limite = [
        divida > 0 ? el('span', { classe: ['conta', 'resultado-divida'] }, ['dívida total ', el('b', { texto: F().moeda(divida) })])
          : caixa === 0 ? el('span', { classe: ['conta', 'resultado-divida'] }, ['sem dívida']) : null,
        caixa > 0 ? el('span', { classe: ['conta', 'resultado-caixa'] }, ['caixa ', el('b', { texto: F().moeda(caixa) })]) : null,
        mesa > 0 ? pedacoMesa(mesa, 'resultado-mesa') : null,
      ].filter(Boolean);
      const dados = { equipe: eq, carta: r.carta, origem: r.origem, saldoMes: String(saldo), divida: String(divida), caixa: String(caixa) };
      if (contasAtrasadas !== null) dados.contasAtrasadas = String(contasAtrasadas);
      if (mesa > 0) dados.faltouNaMesa = String(mesa);
      // As cartas mais extremas só entram animadas; sem contorno de destaque
      // (revisão da F6a): um contorno mais grosso em duas faixas, sem legenda,
      // a turma lia como "as equipes que ganharam".
      grade.appendChild(el('article', {
        classe: ['cartao-resultado', grave ? 'grave' : null, destacadas.has(eq) && !grave ? 'animada' : null],
        dados, role: 'listitem',
      }, [
        el('div', { classe: 'resultado-quem' }, [
          rotuloEquipe(eq),
          // Quem jogou e o que decidiu, à esquerda; o que aconteceu (a carta)
          // no meio; o dinheiro à direita. Na linha de detalhe, a letra
          // empurrava a parada para uma terceira linha, e seis faixas deixavam
          // de caber em 1024×768 com a faixa de entrada. O nome do personagem
          // saiu daqui: está no rótulo da equipe (teste do Kleber de 05/10).
          el('span', { classe: 'resultado-escolha', title: rotuloDaOpcao || null, dados: { decisao: r.decisao } }, ['decisão ', el('b', { texto: letraDe(rodada, r.decisao) })]),
        ]),
        el('div', { classe: 'resultado-meio' }, [
          // O título inteiro da carta; se ele não couber numa linha, o
          // encurtarCartas troca pelo curto (D-040), e o título fica na dica.
          el('p', { classe: 'resultado-carta', title: carta.titulo || null, dados: carta.curto ? { curto: carta.curto } : undefined, texto: carta.titulo || r.carta }),
          detalhes.length > 0 || origem ? el('p', { classe: 'resultado-detalhe' }, [
            juntarPedacos(detalhes),
            // O separador vai dentro do mesmo span: no aperto, some junto.
            origem ? el('span', { classe: 'resultado-origem' }, [detalhes.length > 0 ? ' · ' : null, el('span', { classe: 'resultado-decisao', texto: origem })]) : null,
          ]) : null,
        ]),
        el('div', { classe: 'resultado-dinheiro' }, [
          el('p', { classe: 'resultado-saldo-rotulo', texto: rotuloSaldo }),
          el('p', {
            classe: 'resultado-saldo', title: textoSaldo(saldo),
            dados: { sinal: sinalDoSaldo(saldo) }, texto: F().moeda(saldo, { sinal: true }),
          }),
        ]),
        el('p', { classe: 'resultado-limite' }, juntarPedacos(limite)),
        // D-067: a faixa inteira, embaixo das três colunas. É dado real e
        // ponto de debate (o auxílio tem o piso de um salário mínimo, e a renda
        // do app fica abaixo dele); sem a frase, a sala lia "o acidente
        // compensou". Só quando acontece, e raramente em mais de uma equipe.
        acima ? el('p', { classe: 'resultado-acima', texto: acima }) : null,
      ]));
    }
    s.appendChild(grade);
    app.depoisDeMedir.push(() => {
      encurtarCartas(grade);
      apertarResultado(grade);
    });
  }

  // O título da carta vai inteiro quando cabe numa linha ("Uma semana boa") e
  // pelo curto do config quando quebraria ("A mobilização arrancou um reajuste"
  // → "Reajuste"): uma carta em duas linhas faz a faixa crescer, e seis faixas
  // deixam de caber em 1024×768. O título inteiro acabou de aparecer no
  // sorteio e fica na dica. O desenho refaz a conta a cada tamanho de tela.
  function encurtarCartas(grade) {
    for (const p of grade.querySelectorAll('.resultado-carta[data-curto]')) {
      const linha = parseFloat(getComputedStyle(p).lineHeight);
      if (Number.isFinite(linha) && p.getBoundingClientRect().height > linha * 1.5) {
        p.textContent = p.dataset.curto;
        p.dataset.encurtada = '1';
      }
    }
  }

  // O pior caso ainda pode não caber: seis equipes com a faixa de entrada
  // embaixo (online), todas com a carta de parada, a proteção e a origem. Não
  // há fonte menor que 28 px nem rolagem no telão; então, só quando a lista
  // transborda, a tela aproxima as faixas (sem colar uma na outra) e tira a
  // origem da decisão ("ninguém votou"), que o celular de cada equipe também
  // mostra. O texto continua no DOM.
  // Revisão de 30/09 (achado 15): também quando a linha de detalhe de alguma
  // faixa quebra em duas. Com seis equipes, "a proteção pagou R$ 900 · ninguém
  // votou" cabia no limite, o aperto não agia, e a faixa ganhava uma terceira
  // linha que encostava o título na lista.
  function apertarResultado(grade) {
    const quebrou = [...grade.querySelectorAll('.resultado-detalhe')].some((p) => {
      const linha = parseFloat(getComputedStyle(p).lineHeight);
      return Number.isFinite(linha) && p.getBoundingClientRect().height > linha * 1.5;
    });
    if (quebrou || grade.scrollHeight > grade.clientHeight + 1) grade.dataset.aperto = '1';
    // D-066 e D-067: com o limite do cheque especial, a faixa de quem estourou
    // ganha a linha das contas atrasadas, e a frase da proteção acima do
    // trabalho ocupa duas linhas na largura da faixa. Seis faixas assim, uma
    // delas com o empréstimo e a parada quebrando a linha de detalhe, ainda
    // passavam ~35 px de 1024×768 depois do primeiro aperto. Só então, um
    // segundo: o saldo e a carta um pouco menores (ainda acima do corpo), o
    // título do mês menor e o vão entre as faixas no mínimo de 8 px. A letra do
    // corpo continua nos 28 px.
    if (grade.dataset.aperto && grade.scrollHeight > grade.clientHeight + 1) {
      grade.dataset.aperto = '2';
      grade.closest('.tela')?.setAttribute('data-aperto', '2');
    }
  }

  // ---------- Tela: placar final (D-041) ----------

  function dominioCom(valores, { incluirZero = true } = {}) {
    let min = Math.min(...valores, incluirZero ? 0 : Infinity);
    let max = Math.max(...valores, incluirZero ? 0 : -Infinity);
    if (min === max) { min -= 1; max += 1; }
    const folga = (max - min) * 0.04;
    return [min - folga, max + folga];
  }

  // As equipes que jogaram, na ordem do config.
  const equipesDoPlacar = () => equipesOrdem().filter((id) => app.dados.placar?.[id]?.ativa === true);

  // Maior saldo primeiro. Não é ranking de vencedor: é a fila de quanto faltou,
  // e o título conta quantas não fecharam as contas. O saldo é o patrimônio
  // (esquema v2.2): o empréstimo a pagar conta como dívida.
  function equipesPorSaldo() {
    return equipesDoPlacar().sort((a, b) => patrimonioNoPlacar(b) - patrimonioNoPlacar(a) || numeroEquipe(a) - numeroEquipe(b));
  }

  // Três páginas, e a terceira se repete para cada equipe: (1) o saldo contra o
  // básico; (2) escolha ou sorte, contada como história; (3) a história dos três
  // meses de cada equipe (D-045). Substitui a tela decomposta com legenda
  // (piloto automático, efeito das decisões, sorte), que confundia a turma, e com
  // ela a tecla C (critério) e o interruptor "sem vencedor": não há mais
  // critério a trocar, e nenhuma página aponta vencedor.
  // D-059: com alguma opção que protege no config, uma página a mais depois de
  // "Escolha ou sorte?": o pior que podia acontecer com as escolhas de cada
  // equipe, e sem a proteção. Não cabia numa das duas: com seis equipes, a
  // conta do "Escolha ou sorte?" já ocupa três linhas por equipe em 1024×768,
  // e a página 1 é o gráfico. Config sem proteção fica com as páginas de antes.
  // Esquema v3 (D-060): com 6 bimestres, a história de uma equipe vai em
  // páginas de até 3 rodadas (jan–jun, jul–dez). Três rodadas, com a linha
  // curta de duas linhas, as contas e o que veio de antes, é o que já cabia em
  // 1024×768 com a letra de 28 px; seis numa página só passavam da altura, e
  // tirar a narrativa ou as contas apagaria a D-045 e a D-052. Com 3 rodadas,
  // uma página por equipe, como antes.
  const RODADAS_POR_PAGINA_HISTORIA = 3;

  function paginasDoPlacar() {
    const equipes = equipesDoPlacar();
    if (equipes.length === 0) return [{ tipo: 'vazio' }];
    const pior = configTemProtecao() ? [{ tipo: 'pior' }] : [];
    const historias = equipes.flatMap((eq) => {
      const n = N().historia.historiaDaEquipe(app.config, eq, app.dados.resultados).length;
      const partes = Math.max(1, Math.ceil(n / RODADAS_POR_PAGINA_HISTORIA));
      return Array.from({ length: partes }, (_, parte) => ({ tipo: 'historia', eq, parte, partes }));
    });
    return [{ tipo: 'saldo' }, { tipo: 'escolhas' }, ...pior, ...historias];
  }

  const configTemProtecao = () => N().historia.temProtecao(app.config);

  function tituloSaldo(naoFecharam, total) {
    if (naoFecharam === 0) return total === 1 ? 'A equipe fechou as contas' : `As ${total} equipes fecharam as contas`;
    return `${naoFecharam} de ${total} equipes não ${naoFecharam === 1 ? 'fechou' : 'fecharam'} as contas`;
  }

  function telaPlacarFinal(s) {
    const { el } = D();
    const paginas = paginasDoPlacar();
    const i = Math.min(Math.max(0, app.ui.pagina), paginas.length - 1);
    const pagina = paginas[i];
    s.dataset.pagina = pagina.tipo;
    if (pagina.eq) s.dataset.equipe = pagina.eq;
    if (pagina.tipo === 'historia') {
      s.dataset.parte = String(pagina.parte + 1);
      s.dataset.partes = String(pagina.partes);
    }
    const lado = paginas.length > 1 ? el('p', { classe: 'pagina-placar', texto: `${i + 1} de ${paginas.length}` }) : null;
    if (pagina.tipo === 'saldo') paginaSaldo(s, lado);
    else if (pagina.tipo === 'escolhas') paginaEscolhas(s, lado);
    else if (pagina.tipo === 'pior') paginaPiorCaso(s, lado);
    else if (pagina.tipo === 'historia') paginaHistoria(s, pagina, lado);
    else {
      s.appendChild(cabecalho('Placar final', 'Nenhuma rodada foi jogada nesta sessão.'));
    }
    // Esquema v3: com 12 meses, os valores passam de R$ 10 mil e as contas
    // crescem; seis equipes de nome comprido ("Verde-azulado") no "Escolha ou
    // sorte?" passavam 6 px da altura de 1024×768. Só quando a lista transborda
    // (medida depois do desenho), as linhas se aproximam (data-aperto), com a
    // letra nos 28 px.
    app.depoisDeMedir.push(() => {
      for (const lista of s.querySelectorAll('.historias-escolha, .historia-meses')) {
        if (lista.scrollHeight > lista.clientHeight + 1) lista.dataset.aperto = '1';
        // D-066: com o limite do cheque especial, as contas de cada bimestre da
        // história ganham a comida que faltou e a multa e os juros do atraso, e
        // três bimestres com o que veio de antes passavam ~60 px de 1024×768
        // mesmo apertados. Só então, a linha curta de cada bimestre fica em uma
        // linha (com reticências no fim, como já ficava na segunda): as contas
        // fecham no saldo e não podem ser cortadas.
        if (lista.dataset.aperto && lista.classList.contains('historia-meses') && lista.scrollHeight > lista.clientHeight + 1) lista.dataset.aperto = '2';
      }
    });
  }

  // O título da página do saldo (D-041). Com o limite do cheque especial
  // (D-066), a barra é o patrimônio (caixa menos o banco, o empréstimo e as
  // contas atrasadas), e a comida que faltou fica de fora, numa linha própria:
  // "quanto faltou para o básico" lia-se como tudo o que faltou, e o número
  // grande ficava menor justamente porque a família comeu menos (revisão da
  // F6c). O título diz o que a barra mede: o que ficou devendo. Sem o limite,
  // o de sempre.
  function tituloDaPaginaSaldo() {
    return Number.isInteger(app.config?.regras?.limiteChequeEspecial)
      ? 'Quanto sobrou, e quanto ficou devendo'
      : 'Quanto sobrou, e quanto faltou para o básico';
  }

  // Página 1: uma barra por equipe com o saldo dos três meses, "faltou R$ X" ao
  // lado, e a referência (por exemplo, "Jonas com carteira assinada") só nas
  // equipes da persona dela (revisão da F2, achado 20).
  function paginaSaldo(s, lado) {
    const { el } = D();
    const ordenadas = equipesPorSaldo();
    const naoFecharam = ordenadas.filter((id) => patrimonioNoPlacar(id) < 0).length;
    s.appendChild(cabecalho(tituloDaPaginaSaldo(), tituloSaldo(naoFecharam, ordenadas.length), { extra: lado }));
    const referencias = lista(app.config.ordem.referencias).map((id) => app.config.referencias[id]).filter(Boolean);
    const dominio = dominioCom(ordenadas.map(patrimonioNoPlacar).concat(referencias.map((r) => r.renda)));
    const estiloLinhas = { '--linhas': String(ordenadas.length) };
    s.appendChild(el('div', { classe: 'linhas-grafico linhas-placar' }, [
      // O nome do personagem está no rótulo da equipe (teste do Kleber de
      // 05/10): a linha de baixo com o nome saiu.
      el('div', { classe: 'coluna-rotulos', estilo: estiloLinhas }, ordenadas.map((id) => el('div', { classe: 'linha-rotulo linha-rotulo-placar' }, [
        rotuloEquipe(id),
      ]))),
      grafico('grafico-placar', (largura, altura, fonte) => G().barras({
        largura, altura, fonte, dominio,
        linhas: ordenadas.map((id) => ({ valor: patrimonioNoPlacar(id) })),
        referencias: referencias.map((r) => ({
          id: r.id, valor: r.renda,
          linhas: r.persona ? ordenadas.flatMap((id, k) => (app.config.equipes[id]?.persona === r.persona ? [k] : [])) : undefined,
        })),
      })),
      el('div', { classe: 'coluna-valores', estilo: estiloLinhas }, ordenadas.map((id) => el('div', {
        classe: 'linha-valor valor-saldo', dados: { equipe: id, valor: String(patrimonioNoPlacar(id)) },
      }, [textoSaldo(patrimonioNoPlacar(id))]))),
    ]));
    if (referencias.length > 0) {
      s.appendChild(el('ul', { classe: 'referencias' }, referencias.map((r) => el('li', { dados: { referencia: r.id } }, [
        el('span', { classe: 'marca-referencia', 'aria-hidden': 'true', texto: '┊' }), ` ${r.nome}: `, el('b', { texto: F().moeda(r.renda) }),
      ]))));
    }
    const mesa = linhaDaMesaNoAno(ordenadas);
    if (mesa) s.appendChild(mesa);
  }

  // D-066: o que faltou na mesa no ano, por equipe, embaixo do gráfico do saldo.
  // É o custo humano, à parte do dinheiro: a comida que a casa deixou de
  // comprar quando o cheque especial acabou. Não entra no saldo nem na barra
  // (não é dívida), e por isso não vira uma segunda barra nem um segundo número
  // ao lado do "faltou R$ X", onde se leria como parte dele. Todas as equipes
  // que jogaram, na ordem do gráfico, inclusive as de R$ 0 (quem comeu todos os
  // meses também é informação). Só em sala com o limite (o placar tem o
  // indicador); sem ele, null.
  function linhaDaMesaNoAno(ordenadas) {
    const { el } = D();
    const valores = ordenadas.map((id) => [id, N().historia.faltouNaMesaDe(app.dados.placar?.[id])]);
    if (valores.length === 0 || valores.every(([, v]) => v === null)) return null;
    const meses = Math.max(...ordenadas.map((id) => N().historia.mesesJogados(app.config, N().historia.historiaDaEquipe(app.config, id, app.dados.resultados))));
    const quando = meses === 12 ? 'no ano' : meses === 1 ? 'no mês' : `em ${meses} meses`;
    // O título e as equipes correm na mesma lista: com o título numa linha
    // própria (e a explicação da comida), o bloco ia a quatro linhas em
    // 1024×768 e espremia as barras. "Faltou na mesa" se explica sozinho; o
    // "fora do saldo" fica, para ninguém somar os dois números.
    return el('ul', { classe: 'mesa-no-ano', 'aria-label': `Faltou na mesa ${quando}` }, [
      el('li', { classe: 'mesa-titulo' }, [el('b', { texto: `Faltou na mesa ${quando}` }), ' (fora do saldo):']),
      ...valores.map(([id, v]) => {
        const valor = reaisInteiros(v);
        return el('li', { classe: 'mesa-equipe', dados: { equipe: id, faltouNaMesa: String(valor) } }, [rotuloEquipe(id), ' ', el('b', { texto: F().moeda(valor) })]);
      }),
    ]);
  }

  // Página 2: a decomposição do motor (placar: piloto, efeitoDecisoes, sorte,
  // renda) contada como história, uma linha por equipe e sem legenda. Cada passo
  // da conta é inteiro: a linha quebra entre eles. Os valores vêm de
  // historia.escolhaOuSorte, já inteiros e fechando com o total: a conta é lida
  // em voz alta, e R$ 1 de diferença ficava à vista de quem somava.
  // Os dois totais (sem mudar nada, e o do fim) vão sem sinal de variação; as
  // duas variações, sempre com + ou − (rascunho, seção 7, item 11): no mesmo
  // formato, "−R$ 4.150 → −R$ 395" parecia uma sequência de saldos. O total do
  // fim entra com "=" e em destaque, e não com mais uma seta.
  function paginaEscolhas(s, lado) {
    const { el } = D();
    const placar = app.dados.placar;
    const passo = (texto, valor, classe) => el('span', { classe: ['passo-conta', classe] }, [texto, el('b', { texto: valor })]);
    const ordenadas = equipesPorSaldo();
    // Esquema v3: com 6 rodadas, o "se não mudassem nada" e as escolhas vêm da
    // simulação do motor (placar.estimado), e não da conta exata. A tela diz
    // isso uma vez, no kicker, em vez de repetir em cada linha.
    const estimado = ordenadas.some((id) => placar[id]?.estimado === true);
    s.appendChild(cabecalho(estimado ? 'Placar final · valores estimados por simulação' : 'Placar final', 'Escolha ou sorte?', { extra: lado }));
    // Em grade fixa (escolhas-em-grade, css/telao.css): três linhas por
    // equipe, os mesmos passos em cada uma e as colunas alinhadas entre as
    // equipes. Corrida como texto, cada equipe quebrava a conta num ponto
    // diferente, e na projeção não dava para comparar (revisão da F7, achado 13
    // da revisão de conteúdo e legibilidade).
    s.appendChild(el('ol', { classe: ['historias-escolha', 'escolhas-em-grade'] }, ordenadas.map((id) => {
      const c = N().historia.escolhaOuSorte(placar[id]);
      return el('li', { classe: 'historia-escolha', dados: { equipe: id, ...(c?.estimado ? { estimado: '1' } : {}) } }, [
        rotuloEquipe(id),
        c ? el('span', { classe: 'historia-conta' }, [
          passo('se não mudassem nada: ', F().moeda(c.piloto), 'passo-total'), ' ',
          passo('→ as escolhas: ', F().variacao(c.escolhas), 'passo-variacao'), ' ',
          passo('→ a sorte: ', F().variacao(c.sorte), 'passo-variacao'), ' ',
          passo('= terminaram com ', F().moeda(c.total), ['passo-total', 'passo-final']),
        ]) : null,
      ]);
    })));
  }

  // Página "o pior que podia acontecer" (D-059), uma linha por equipe, na
  // ordem do "Escolha ou sorte?": o pior caso com as escolhas da equipe
  // (placar.piorCaso, a menor renda possível com as mesmas decisões) e, se ela
  // escolheu alguma opção que protege, o pior caso sem ela
  // (placar.piorCasoSemProtecao, as mesmas decisões com o padrão no lugar da
  // proteção). A proteção é seguro: perde na média e ganha no pior caso, e
  // sem esta página o placar só mostrava a média (rascunho, seção 8, item 17).
  // O que vem depois do primeiro número é o historia.piorCasoDoPlacar que
  // decide (a mesma regra do celular):
  // - "evitou": "sem a proteção: R$ B · a proteção evitou R$ X". A diferença
  //   vem pronta: a sala não precisa subtrair −R$ 9.483 de −R$ 10.469 de
  //   cabeça (revisão da F5, achado 10);
  // - "naoMelhorou": texto neutro, sem número. Antes, o "sem" saía mesmo
  //   quando era MELHOR que o "com" (o MEI com a sessão acabando antes do mês
  //   3, a associação), embaixo da nota "ela evita o pior" (achado 1);
  // - "semEscolha": "não escolheram proteção"; "semDado" (sala anterior à
  //   D-059): só o primeiro número.
  // Revisão da F6a (os textos da proteção coerentes entre si): a nota dizia
  // "ela evita o pior" como regra, e a linha logo abaixo podia dizer "a
  // proteção não melhorou o pior caso", uma contradizendo a outra. Agora a nota
  // não promete: diz o que a proteção PODE fazer ("pode evitar o pior"), a
  // linha diz o que ela fez neste jogo ("a proteção evitou R$ X" ou "a proteção
  // não melhorou o pior caso", as mesmas palavras do celular), e o resultado e
  // a história dizem quanto ela pagou ("a proteção pagou R$ X").
  // Esquema v3: com o placar estimado (6 rodadas), o kicker diz "pior caso
  // estimado", e cada linha leva data-estimado.
  function paginaPiorCaso(s, lado) {
    const { el } = D();
    const placar = app.dados.placar;
    const passo = (texto, valor, classe) => el('span', { classe: ['passo-conta', classe] }, [texto, el('b', { texto: valor })]);
    const nota = (texto) => el('span', { classe: ['passo-conta', 'pior-sem-escolha'], texto });
    const ordenadas = equipesPorSaldo();
    const estimado = ordenadas.some((id) => placar[id]?.estimado === true);
    s.appendChild(cabecalho(estimado ? 'Placar final · pior caso estimado' : 'Placar final', 'O pior que podia acontecer', { extra: lado }));
    s.appendChild(el('p', { classe: 'pior-nota', texto: 'Na média, a proteção custa dinheiro. O que ela pode fazer é evitar o pior.' }));
    s.appendChild(el('ol', { classe: ['historias-escolha', 'piores-casos'] }, ordenadas.map((id) => {
      const p = N().historia.piorCasoDoPlacar(placar[id], N().historia.escolheuProtecao(app.config, app.dados.resultados, id));
      // dataset grava "null" como texto: só entra o que existe.
      const dados = { equipe: id };
      if (p) dados.pior = String(p.comEscolhas);
      if (p?.situacao === 'evitou') {
        dados.piorSem = String(p.semProtecao);
        dados.evitou = String(p.evitou);
      }
      if (p) dados.situacao = p.situacao;
      if (p?.estimado) dados.estimado = '1';
      let depois = null;
      if (p?.situacao === 'evitou') {
        depois = [
          passo('· sem a proteção: ', F().moeda(p.semProtecao), ['passo-total', 'pior-sem-protecao']), ' ',
          passo('· a proteção evitou ', F().moeda(p.evitou), ['passo-total', 'passo-final', 'pior-evitou']),
        ];
      } else if (p?.situacao === 'naoMelhorou') depois = nota('· a proteção não melhorou o pior caso');
      else if (p?.situacao === 'semEscolha') depois = nota('· não escolheram proteção');
      return el('li', { classe: 'historia-escolha', dados }, [
        rotuloEquipe(id),
        p ? el('span', { classe: 'historia-conta' }, [
          passo('com as escolhas de vocês: ', F().moeda(p.comEscolhas), 'passo-total'), depois ? ' ' : null, depois,
        ]) : null,
      ]);
    })));
  }

  // Página 3 (uma por equipe; com 6 bimestres, duas, de até 3 rodadas cada):
  // cada rodada com uma linha curta em primeira pessoa (a primeira frase da
  // narrativa da opção e a da carta, historia.linhaDoMes) e as contas (D-045;
  // rascunho, seção 7, item 12). Antes, o telão mostrava só os rótulos
  // ("escolheram: … · aconteceu: …"), e a história ficava no celular. A linha
  // tem no máximo duas linhas na tela e, se não couber, termina em reticências
  // (CSS), sem baixar dos 28 px. Sem narrativa no config, volta aos rótulos. O
  // texto da opção é o do ofício da equipe (historiaDaEquipe já traz
  // rotuloPor/narrativaPor, D-054).
  // O custo real da carta (D-052) abre a linha das contas, na mesma frase: numa
  // linha própria, três meses com narrativa de duas linhas, custo e contas
  // passavam da altura de 1024×768.
  // Esquema v3: o kicker diz o trecho do ano da página ("Jan–fev a Mai–jun"),
  // e a última linha de uma página que não é a última diz como a família
  // chegou ao fim dela ("Depois de 6 meses: faltou R$ X"); a da última, "No fim
  // dos 12 meses".
  function paginaHistoria(s, pagina, lado) {
    const { el } = D();
    const { eq, parte, partes } = pagina;
    const historia = N().historia.historiaDaEquipe(app.config, eq, app.dados.resultados);
    const inicio = parte * RODADAS_POR_PAGINA_HISTORIA;
    const trecho = historia.slice(inicio, inicio + RODADAS_POR_PAGINA_HISTORIA);
    const kicker = partes > 1 && trecho.length > 0
      ? `A história da equipe · ${trecho[0].rotulo}${trecho.length > 1 ? ` a ${trecho.at(-1).rotulo}` : ''}`
      : 'A história da equipe';
    // A equipe pelo personagem ("◯ 1 Jonas, motoboy"): o " · Jonas" que vinha
    // depois do nome da cor repetiria o nome (teste do Kleber de 05/10).
    s.appendChild(cabecalho(kicker, [rotuloEquipe(eq)], { extra: lado }));
    s.appendChild(el('ol', { classe: 'historia-meses' }, trecho.map((h) => {
      const r = app.dados.resultados?.[h.rodadaId]?.[eq] || {};
      const linha = N().historia.linhaDoMes(h);
      const mes = h.mes || mesDoResultado(h.rodadaId, eq, r);
      const custoGravado = h.cartaCusto || custoDoResultado(h.rodadaId, eq, r);
      const nomes = nomesDoMes({ equipeId: eq, rodadaId: h.rodadaId, decisao: r.decisao }, custoGravado, mes, h.deAntes?.length ? h.deAntes : deAntesDoResultado(h.rodadaId, eq, r));
      const custo = custoDaCarta(custoGravado, mes, 'historia-custo', nomes.cartaNosGastos);
      const acima = fraseAcimaDoTrabalho(eq, r);
      return el('li', { classe: 'historia-mes', dados: { rodada: h.rodadaId } }, [
        el('p', { classe: 'historia-titulo', texto: h.titulo || h.rodadaId }),
        linha ? el('p', { classe: 'historia-narrativa', texto: linha }) : el('p', { classe: 'historia-fatos' }, [
          'escolheram: ', el('b', { texto: h.opcao.rotulo || r.decisao || '' }),
          ' · aconteceu: ', el('b', { texto: h.carta.titulo || r.carta || '' }),
        ]),
        el('p', { classe: 'historia-dinheiro' }, [
          custo, custo ? ' · ' : null,
          nomes.antes.length > 0 ? [el('span', { classe: 'historia-de-antes' }, juntarPedacos(pedacosDeAntes(nomes.antes))), ' · '] : null,
          contasDoMes(mes, 'historia-contas', 'span', nomes.gastos),
          // O empréstimo do mês vai depois das contas, como dívida, e nunca
          // dentro do "entrou" (esquema v2.2): a conta lida continua fechando
          // no "faltou", e a sala vê que o dinheiro entrou devendo.
          mes.emprestimo > 0 ? [' · ', rotuloEValor('pegou empréstimo de', F().moeda(mes.emprestimo), ['historia-emprestimo'], { emprestimo: String(mes.emprestimo) })] : null,
        ]),
        // D-067: a mesma frase do resultado da rodada, no mês em que a
        // proteção pagou mais do que o trabalho daria.
        acima ? el('p', { classe: 'historia-acima', texto: acima }) : null,
      ]);
    })));
    const { meses } = periodo();
    if (parte < partes - 1 && trecho.length > 0) {
      // Uma página do meio: como a família chegou ao fim do trecho, pelo "depois"
      // gravado da última rodada dele (o patrimônio, a dívida e o caixa).
      const ultimo = trecho.at(-1);
      const depois = app.dados.resultados?.[ultimo.rodadaId]?.[eq]?.depois;
      const jogados = (inicio + trecho.length) * meses;
      s.appendChild(el('p', { classe: ['historia-final', 'historia-parcial'] }, [
        `Depois de ${jogados === 1 ? '1 mês' : `${jogados} meses`}: `, el('b', { texto: textoSaldo(ultimo.saldoAcumulado ?? 0) }), ...pedacosDaDivida(depois),
      ]));
      return;
    }
    const total = N().historia.mesesJogados(app.config, historia);
    s.appendChild(el('p', { classe: 'historia-final' }, [
      `No fim ${total === 1 ? 'do mês' : `dos ${total} meses`}: `, el('b', { texto: textoSaldo(patrimonioNoPlacar(eq)) }), ...pedacosDaDivida(app.dados.placar?.[eq]),
    ]));
  }

  // A dívida com que a equipe termina (cheque especial + empréstimo, sempre a
  // total) e o caixa, quando positivo (revisão da F6a). Antes, vinha também
  // "(R$ S do empréstimo, em N parcelas)": a parcela detalhada fica só no
  // celular da equipe (revisão da F6a), onde cabe a frase inteira, e o telão
  // diz só quanto a família deve e quanto tem. Aqui o caixa só vem junto de
  // uma dívida (o empréstimo): sem dívida, o "sobrou R$ X" já é o caixa, e
  // "sobrou R$ 8.252 · caixa R$ 8.252" repetia o número.
  // D-066: com o limite, o que faltou na mesa até ali vem em seguida, com o
  // próprio nome (não é dívida: é a comida que não deu para comprar,
  // acumulada). Teste do Kleber de 05/10 (print 7): a dívida é a total, o
  // banco, o empréstimo e as contas atrasadas num número só ("dívida total"),
  // o mesmo do resultado da rodada; antes, "dívida" e "contas atrasadas" vinham
  // separadas. data-contas-atrasadas fica no span da dívida (a parte dela que é
  // aluguel, luz e água atrasados). Sala sem o limite: a dívida é o banco e o
  // empréstimo, como antes.
  function pedacosDaDivida(valores) {
    const { el } = D();
    const { divida, contasAtrasadas, caixa } = dividaECaixa(valores);
    const mesa = reaisInteiros(N().historia.faltouNaMesaDe(valores));
    const dadosDivida = { divida: String(divida), ...(contasAtrasadas !== null ? { contasAtrasadas: String(contasAtrasadas) } : {}) };
    return [
      divida > 0 ? [' · ', el('span', { classe: 'historia-divida', dados: dadosDivida }, ['dívida total ', el('b', { texto: F().moeda(divida) })])] : null,
      divida > 0 && caixa > 0 ? [' · ', el('span', { classe: 'historia-caixa', dados: { caixa: String(caixa) } }, ['caixa ', el('b', { texto: F().moeda(caixa) })])] : null,
      mesa > 0 ? [' · ', pedacoMesa(mesa, 'historia-mesa-total')] : null,
    ];
  }

  // ---------- Tela: comparativo ----------

  const somaLinhas = (m) => lista(m).map((l) => lista(l).reduce((t, x) => t + x, 0));
  const somaColunas = (m) => [0, 1, 2, 3, 4].map((j) => lista(m).reduce((t, l) => t + (lista(l)[j] || 0), 0));
  const nomeMetodo = (ap) => (ap?.metodo === 'manual' ? 'mão levantada' : 'celular');

  function histDe(ap, a) {
    const h = lista(ap?.histogramas?.[a]);
    return h.length === 5 ? h : [0, 0, 0, 0, 0];
  }

  function painelDistribuicao(titulo, hist, estilo) {
    const { el } = D();
    const n = hist.reduce((t, x) => t + x, 0);
    return el('div', { classe: 'painel-distribuicao' }, [
      el('p', { classe: 'painel-titulo' }, [G().amostra(estilo === 'antes' ? 'antes' : 'depois'), ` ${titulo} · n = ${n}`]),
      grafico('grafico-histograma', (largura, altura, fonte) => G().histograma({ largura, altura, fonte, series: [{ hist, estilo }] })),
      G().rotulosEscala(['', '', '', '', ''], { soNumeros: true }),
    ]);
  }

  function telaComparativo(s, e) {
    const { el } = D();
    const enq = app.config.enquetes[e.enquete];
    const ordem = ordemAfirmacoes(enq);
    const pagina = Math.min(Math.max(0, app.ui.pagina), ordem.length - 1);
    const a = ordem[pagina];
    const antes = app.dados.enquetes?.[e.enquete]?.antes ?? null;
    const depois = app.dados.enquetes?.[e.enquete]?.depois ?? null;
    const pc = N().enquete.podeComparar(antes, depois, app.config.regras.minPareados);
    s.dataset.caso = pc.caso;
    s.appendChild(cabecalho(`Comparativo · afirmação ${pagina + 1} de ${ordem.length}`, enq.afirmacoes[a].texto, { classeTitulo: 'afirmacao' }));
    const escala = lista(app.config.escala.longos);
    if (pc.caso === 'pareado') {
      const tr = depois.transicao[a];
      const soUmaVez = (tr.soAntes || 0) + (tr.soDepois || 0);
      const frase = `Dos ${tr.pares} que responderam as duas vezes: ${tr.mais} foram para mais concordância, ${tr.igual} ficaram, ${tr.menos} foram para menos.`;
      s.appendChild(el('p', { classe: 'frase-comparativo' }, [frase, soUmaVez > 0 ? el('span', { classe: 'texto-secundario', texto: ` Mais ${soUmaVez} ${soUmaVez === 1 ? 'respondeu' : 'responderam'} só uma vez.` }) : null]));
      s.appendChild(el('p', { classe: 'legenda' }, [G().amostra('antes'), ' antes ', G().amostra('depois'), ' depois']));
      const hAntes = somaLinhas(tr.matriz);
      const hDepois = somaColunas(tr.matriz);
      s.appendChild(grafico('grafico-histograma', (largura, altura, fonte) => G().histograma({
        largura, altura, fonte, series: [{ hist: hAntes, estilo: 'antes' }, { hist: hDepois, estilo: 'depois' }], rotuloAria: 'Antes e depois, só de quem respondeu as duas vezes',
      })));
      s.appendChild(G().rotulosEscala(escala));
    } else if (pc.caso === 'sem_antes' || pc.caso === 'sem_depois') {
      const so = pc.caso === 'sem_antes' ? depois : antes;
      const estilo = pc.caso === 'sem_antes' ? 'depois' : 'antes';
      s.appendChild(el('p', { classe: 'aviso-comparativo', texto: pc.motivo }));
      s.appendChild(el('div', { classe: 'paineis paineis-um' }, [painelDistribuicao(`${estilo === 'depois' ? 'Depois' : 'Antes'} (${nomeMetodo(so)})`, histDe(so, a), estilo)]));
      s.appendChild(G().legendaEscala(escala));
    } else if (pc.caso === 'sem_dados') {
      s.appendChild(el('p', { classe: 'aviso-comparativo', texto: pc.motivo }));
    } else {
      // Métodos diferentes, mão levantada nos dois lados ou poucos pares: as duas
      // distribuições lado a lado, nunca sobrepostas nem somadas (seção 9).
      s.appendChild(el('p', { classe: 'aviso-comparativo', texto: pc.motivo }));
      s.appendChild(el('div', { classe: 'paineis' }, [
        painelDistribuicao(`Antes (${nomeMetodo(antes)})`, histDe(antes, a), 'antes'),
        painelDistribuicao(`Depois (${nomeMetodo(depois)})`, histDe(depois, a), 'depois'),
      ]));
      s.appendChild(G().legendaEscala(escala));
    }
    s.appendChild(rodapeEnquete());
  }

  // ---------- Tela: fim ----------

  async function exportarTotais() {
    const totais = await app.anf.exportarTotais();
    D().baixar(`viracao-totais-${app.sala}-${F().carimbo(agora())}.json`, JSON.stringify(totais, null, 1));
    avisar('Totais exportados (só agregados, sem nenhum voto individual).');
  }

  // "Exportar totais" e "Apagar a sala" ficam na barra (D-047): projetados no
  // fim, eram os primeiros botões que a turma via depois do jogo.
  function telaFim(s) {
    s.appendChild(cabecalho(app.config.titulo, 'Fim'));
    if (app.dados.placar && ativas(app.estado).length > 0) s.appendChild(placarResumido('placar-fim'));
  }

  // ---------- Barra do apresentador ----------

  const BOTOES = [
    { id: 'avancar', rotulo: 'Avançar', dica: 'Espaço', acao: () => avancar() },
    { id: 'encerrar', rotulo: 'Encerrar', dica: 'Enter', acao: () => encerrar() },
    { id: 'mais30', rotulo: '+30 s', acao: () => executar(() => app.anf.maisTempo(30), vista()) },
    { id: 'pausar', rotulo: 'Pausar', dica: 'P', acao: () => pausarOuRetomar() },
    { id: 'desfazer', rotulo: 'Desfazer', dica: 'Ctrl+Z', acao: () => desfazer() },
    { id: 'pular', rotulo: 'Pular para…', acao: () => pularPara() },
    { id: 'decidir', rotulo: 'Decidir por esta equipe', acao: () => decidirPorEquipe() },
    { id: 'mover', rotulo: 'Mover aluno', acao: () => moverAluno() },
    // Sem tecla de atalho: apaga membros, e uma tecla só dispararia por engano.
    { id: 'removerInativos', rotulo: 'Remover inativos (segure)', segurar: true, acao: () => removerInativos() },
    { id: 'entrada', rotulo: 'Entrada', acao: () => executar(() => app.anf.abrirEntrada(app.dados.meta?.entradaAberta !== true)) },
    { id: 'rede', rotulo: 'Rede restrita', acao: () => { app.ui.lp = !app.ui.lp; app.chaveDesenho = null; agendarDesenho(); } },
    { id: 'salvar', rotulo: 'Salvar estado', acao: () => socorro(() => salvarEstado('manual')) },
    { id: 'telaCheia', rotulo: 'Tela cheia', dica: 'F', acao: () => alternarTelaCheia() },
    { id: 'encerrarJogo', rotulo: 'Encerrar jogo (segure)', segurar: true, acao: () => encerrarJogo() },
    { id: 'semCelulares', rotulo: 'Continuar sem celulares (segure)', segurar: true, acao: () => socorro(continuarSemCelulares) },
    // Vieram da tela do fim (D-047). Apagar só no fim: no meio da aula, um
    // engano apagaria o jogo inteiro.
    { id: 'exportar', rotulo: 'Exportar totais', acao: () => executar(exportarTotais) },
    { id: 'apagar', rotulo: 'Apagar a sala (segure 2 s)', segurar: true, acao: () => executar(() => app.anf.apagarSala()) },
  ];

  // As duas saídas para a rede que caiu (arquitetura, seção 11) não passam pela
  // fila: um comando preso nela (a transação que espera a rede) não pode travar
  // justamente o socorro (revisão da F2, achado 22). Nenhuma das duas depende da
  // geracao: saem do espelho local.
  let socorrendo = false;
  function socorro(fn) {
    if (app.passivo) return avisar(AVISO_PASSIVO, 'erro');
    if (socorrendo) return undefined;
    socorrendo = true;
    return Promise.resolve().then(fn).catch(mostrarErro).finally(() => { socorrendo = false; });
  }

  function montarBarra() {
    const { el, botao, limpar } = D();
    const barra = limpar(app.el.barra);
    const botoes = BOTOES.map((b) => botao(b.rotulo, b.acao, { dica: b.dica, segurarMs: b.segurar ? SEGURAR_MS : null, dados: { acao: b.id }, classe: 'botao-barra' }));
    D().acrescentar(barra, [
      el('div', { classe: 'barra-info' }, [
        el('p', { classe: 'barra-passo', dados: { barraPasso: '1' } }),
        el('p', { classe: 'barra-titulo', dados: { barraTitulo: '1' } }),
        el('p', { classe: 'barra-salvo', dados: { barraSalvo: '1' }, texto: app.ultimoSalvo || '' }),
        el('p', { classe: 'barra-ativos', dados: { contagemAtivos: '1' } }),
        // A dica do passo (D-047): o que antes ficava projetado para o apresentador.
        el('p', { classe: 'barra-dica', dados: { barraDica: '1' } }),
        app.selo.elemento,
      ]),
      el('div', { classe: 'barra-botoes' }, botoes),
    ]);
  }

  function textoPassoBarra(e) {
    const total = app.passos.length;
    let texto = `passo ${e.indice + 1} de ${total}`;
    const inicio = app.dados.meta?.criadaEm;
    if (Number.isFinite(inicio) && app.inicioPasso && app.inicioPasso.indice === e.indice) {
      const passo = app.passos[e.indice];
      const aoAbrir = N().roteiro.atrasoSeg(app.passos, e.indice, inicio, app.inicioPasso.em);
      // O tempo além do alvo do passo atual também é atraso; o que ainda está
      // dentro do alvo, não (senão todo passo começaria "atrasado").
      const estouro = Math.max(0, (agora() - app.inicioPasso.em) / 1000 - (passo.alvoSeg ?? 0));
      texto += ` · ${F().atraso(aoAbrir + estouro)}`;
    }
    return texto;
  }

  function atualizarBarra() {
    const e = app.estado;
    if (!e || !app.anf) return;
    const b = (id) => app.el.barra.querySelector(`[data-acao="${id}"]`);
    const aberta = ['votando', 'decidindo', 'prorrogacao'].includes(e.subfase);
    const online = app.modo === 'online';
    const titulo = app.el.barra.querySelector('[data-barra-titulo]');
    if (titulo) titulo.textContent = descreverPasso(app.passos[e.indice]);
    // Offline não há presença: a linha fica vazia (e some pelo CSS).
    const ativos = app.el.barra.querySelector('[data-contagem-ativos]');
    if (ativos) ativos.textContent = online ? textoAtivos() : '';
    const pausado = typeof e.restanteMs === 'number';
    const conf = {
      encerrar: aberta || e.subfase === 'fechando',
      mais30: aberta,
      pausar: aberta,
      // decidindo e votando: desfazer a abertura (D-037); a prorrogação não.
      desfazer: (e.tipo === 'rodada' && ['decidindo', 'sorteio', 'resultado', 'fechando'].includes(e.subfase)) || (e.tipo === 'enquete' && ['votando', 'apurada', 'fechando'].includes(e.subfase)),
      decidir: e.tipo === 'rodada' && (e.subfase === 'decidindo' || e.subfase === 'prorrogacao'),
      mover: online,
      removerInativos: online,
      entrada: online,
      rede: online,
      avancar: e.tipo !== 'fim',
      pular: e.tipo !== 'fim',
      encerrarJogo: e.tipo !== 'fim',
      apagar: e.tipo === 'fim',
    };
    // Passivo (outra máquina assumiu): nenhum comando sai daqui, nem o socorro.
    if (app.passivo) for (const bt of app.el.barra.querySelectorAll('[data-acao]')) if (bt.dataset.acao !== 'telaCheia') conf[bt.dataset.acao] = false;
    for (const [id, ativo] of Object.entries(conf)) { const bt = b(id); if (bt) bt.disabled = !ativo; }
    const bp = b('pausar');
    if (bp) bp.querySelector('.botao-rotulo').textContent = pausado ? 'Retomar' : 'Pausar';
    const be = b('entrada');
    if (be) {
      be.querySelector('.botao-rotulo').textContent = app.dados.meta?.entradaAberta === true ? 'Entrada aberta' : 'Entrada fechada';
      be.setAttribute('aria-pressed', String(app.dados.meta?.entradaAberta === true));
    }
    b('rede')?.setAttribute('aria-pressed', String(app.ui.lp));
    const bs = b('semCelulares');
    if (bs) bs.hidden = !online;
  }

  // D-038: aberta pelo H ou pela borda de baixo, some sozinha 3 s depois. O
  // texto aprovado é "some sozinha depois de 3 s" para os dois jeitos de abrir:
  // uma barra que só fechava com outro H ficava projetada sobre o sorteio
  // sempre que o apresentador esquecia de apertar a tecla de novo.
  function mostrarBarra() {
    const barra = app.el.barra;
    if (!app.anf) return;
    barra.hidden = false;
    app.barraVisivel = true;
    document.body.classList.add('barra-visivel');
    // O aviso de operação fica logo acima da barra (D-047), e a altura dela muda
    // com a largura da tela (os botões quebram linha).
    document.body.style.setProperty('--altura-barra', `${barra.offsetHeight}px`);
    clearTimeout(app.barraTimer);
    app.barraTimer = setTimeout(() => {
      // Só a seguram: um menu aberto, ou o foco do teclado dentro dela (quem usa
      // só o teclado navega com Tab e não pode perder a barra no meio). O mouse
      // parado em cima dela ou na borda não segura: o apresentador encosta o
      // mouse embaixo para tirar o cursor do caminho (ou dá Alt+Tab com ele ali)
      // e nenhum evento avisa que ele deixou de olhar. Quem usa a barra mexe o
      // mouse, e cada movimento sobre ela recomeça os 3 s (aoMoverMouse).
      if (app.el.modal.open || barra.contains(document.activeElement)) return mostrarBarra();
      esconderBarra();
    }, ESCONDER_BARRA_MS);
  }

  // Movimento fora da borda não mostra a barra. Ao sair da borda com ela aberta,
  // os 3 s recomeçam: contam a partir de quando o mouse saiu, e não de quando
  // ele entrou na faixa. Movimento sobre a barra aberta também recomeça.
  function aoMoverMouse(ev) {
    if (!app.anf) return;
    const naBorda = ev.clientY >= raiz.innerHeight - BORDA_BARRA_PX;
    const saiu = app.mouseNaBorda && !naBorda;
    const sobreABarra = app.barraVisivel && app.el.barra.contains(ev.target);
    app.mouseNaBorda = naBorda;
    if (naBorda || sobreABarra || (saiu && app.barraVisivel)) mostrarBarra();
  }

  function esconderBarra(tambemDesligar = false) {
    clearTimeout(app.barraTimer);
    app.el.barra.hidden = true;
    app.barraVisivel = false;
    document.body.classList.remove('barra-visivel');
    if (tambemDesligar) D().limpar(app.el.barra);
  }

  // ---------- Comandos ----------

  function avancar() {
    if (!app.anf || !app.estado) return;
    const t = performance.now();
    if (t - app.ultimoAvanco < TRAVA_AVANCAR_MS) return;
    app.ultimoAvanco = t;
    const e = app.estado;
    // O comparativo (uma afirmação por tela) e o placar final (D-041): o Avançar
    // pagina dentro do passo e, na última página, segue o roteiro.
    if (e.tipo === 'comparativo' || e.tipo === 'placarFinal') {
      const total = e.tipo === 'placarFinal' ? paginasDoPlacar().length : ordemAfirmacoes(app.config.enquetes[e.enquete]).length;
      if (app.ui.pagina < total - 1) {
        app.ui.pagina += 1;
        agendarDesenho();
        return;
      }
    }
    // Offline, enquete no modo "todas": o Espaço vai para a próxima afirmação,
    // como no termômetro (uma por vez). Antes, ele caía no aviso "Votação
    // aberta… (Enter)", e o Enter seguinte encerrava a enquete com as afirmações
    // seguintes zeradas (revisão da F2, achado 11).
    if (app.modo === 'offline' && e.tipo === 'enquete' && e.subfase === 'votando' && e.afirmacao === '*') {
      const total = ordemAfirmacoes(app.config.enquetes[e.enquete]).length;
      if (app.ui.afirmacaoManual < total - 1) mudarAfirmacaoManual(1);
      else avisar('Esta é a última afirmação: Enter encerra a enquete inteira.');
      return;
    }
    executar(() => app.anf.avancar(), { geracao: e.geracao });
  }

  // Offline, a enquete aberta pode ter votos de celular que chegaram antes da
  // queda ("Continuar sem celulares" no meio dela): quantos aparelhos votaram.
  function votosDeCelular(e) {
    if (app.modo !== 'offline' || e.tipo !== 'enquete') return 0;
    const uids = new Set();
    for (const porUid of Object.values(app.dados.votos || {})) {
      for (const [u, v] of Object.entries(porUid || {})) if (Number.isInteger(v) && v >= 1 && v <= 5) uids.add(u);
    }
    return uids.size;
  }

  // Offline, encerrar com uma afirmação sem contagem apura n = 0 nela: o Enter
  // dado por engano (ou pelo aviso) punha "sem votos" no resultado sem o
  // apresentador perceber (achado 11). Com os votos de celular de antes da
  // queda e nenhuma contagem manual, a apuração é a dos celulares, que a tela
  // mostra: não há o que confirmar.
  async function confirmarEncerrarEnquete(e) {
    if (app.modo !== 'offline' || e.tipo !== 'enquete' || e.subfase !== 'votando') return true;
    if (!e.manual && votosDeCelular(e) > 0) return true;
    const ordem = ordemAfirmacoes(app.config.enquetes[e.enquete]);
    const zeradas = ordem.map((a, i) => (histManual(e, a).every((x) => x === 0) ? i + 1 : null)).filter(Boolean);
    if (zeradas.length === 0) return true;
    const quais = zeradas.length === 1 ? `A afirmação ${zeradas[0]} está` : `As afirmações ${zeradas.join(', ')} estão`;
    return confirmar(`${quais} sem contagem e ${zeradas.length === 1 ? 'vai' : 'vão'} para o resultado como "sem votos". Encerrar a enquete inteira assim mesmo?`,
      'Encerrar a enquete', { focarCancelar: true });
  }

  async function encerrar() {
    const e = app.estado;
    if (!app.anf || !e) return;
    if (e.tipo === 'rodada' && e.subfase === 'decidindo') {
      const falta = app.config.tempos.decisaoMinSeg - (agora() - e.abertoEm) / 1000;
      // O tempo mínimo protege a conversa da equipe (red team, falha 11), mas
      // quem decide é o apresentador: ele pode encerrar antes, confirmando.
      if (falta > 0 && !(await confirmar(`Ainda no tempo mínimo de conversa (faltam ${F().relogio(falta * 1000)}). Encerrar a decisão agora?`, 'Encerrar agora', { focarCancelar: true }))) return;
    }
    // O desfazer da abertura parou no meio: diante da tela parada, o Enter é o
    // gesto natural, e apuraria a votação aberta por engano (a rodada inteira no
    // piloto, ou a enquete com n = 0). O caminho de volta é o Ctrl+Z.
    if (app.anf.desfazendoAbertura(e) && !(await confirmar('Esta votação foi aberta por engano, e o desfazer não terminou. Encerrar vai apurá-la assim mesmo. Para voltar ao passo anterior, cancele e use Ctrl+Z. Apurar mesmo assim?',
      'Apurar mesmo assim', { focarCancelar: true }))) return;
    if (!(await confirmarEncerrarEnquete(e))) return;
    executar(() => app.anf.encerrar(), { geracao: e.geracao });
  }

  function pausarOuRetomar() {
    const e = app.estado;
    if (!e || !['votando', 'decidindo', 'prorrogacao'].includes(e.subfase)) return;
    executar(() => (typeof e.restanteMs === 'number' ? app.anf.retomar() : app.anf.pausar()), { geracao: e.geracao });
  }

  async function desfazer() {
    const e = app.estado;
    if (!app.anf || !e) return;
    let texto;
    // D-037: o Espaço a mais abriu a votação. O anfitrião confere no servidor se
    // algum voto chegou e, havendo, recusa e deixa a votação aberta.
    const umaPorVez = e.tipo === 'enquete' && e.afirmacao !== '*' && ordemAfirmacoes(app.config.enquetes[e.enquete]).indexOf(e.afirmacao) > 0;
    if ((e.tipo === 'enquete' && e.subfase === 'votando') || (e.tipo === 'rodada' && e.subfase === 'decidindo')) {
      // Na rodada, a decisão do apresentador também conta como voto: offline,
      // sem celular, "nenhum voto chegou" parecia sempre verdade.
      const condicao = e.tipo === 'rodada' ? 'nenhum voto chegou e o apresentador não decidiu por nenhuma equipe' : 'nenhum voto chegou';
      texto = `Desfazer a abertura desta votação? Só funciona se ${condicao}; a tela volta ${umaPorVez ? 'à afirmação anterior' : 'ao passo anterior'}.`;
    } else if (app.anf.desfazendoAbertura(e)) {
      texto = 'O desfazer da abertura não terminou (o serviço não respondeu). Tentar de novo? Sem voto, a tela volta ao passo anterior.';
    } else if (e.subfase === 'fechando') texto = 'A apuração não terminou. Voltar à votação, sem apagar nada?';
    else if (e.tipo === 'rodada') texto = 'Desfazer a apuração desta rodada? As decisões e a semente continuam: encerrar de novo tira as mesmas cartas.';
    else if (e.tipo === 'enquete') texto = 'Reabrir a votação desta enquete? A apuração é apagada e refeita no próximo encerrar.';
    else return avisar('Nada para desfazer neste passo.');
    if (await confirmar(texto, 'Desfazer', { focarCancelar: true })) executar(() => app.anf.desfazer(), { geracao: e.geracao });
  }

  async function pularPara() {
    const e = app.estado;
    if (!app.anf || !e) return;
    const opcoes = app.passos.filter((p) => p.indice > e.indice).map((p) => ({ rotulo: `${p.indice + 1}. ${descreverPasso(p)}${p.opcional ? ' (opcional)' : ''}`, valor: p.indice }));
    if (opcoes.length === 0) return avisar('Não há passo depois deste.');
    const escolhido = await escolher('Pular para…', opcoes, { explicacao: 'Só para a frente. Os passos no meio ficam sem acontecer.' });
    if (escolhido !== null && escolhido !== undefined) executar(() => app.anf.pularPara(escolhido), { geracao: e.geracao });
  }

  async function encerrarJogo() {
    const e = app.estado;
    if (!app.anf || !e) return;
    const fim = app.passos.findIndex((p) => p.tipo === 'fim');
    if (fim < 0 || fim <= e.indice) return avisar('Não há passo "fim" à frente no roteiro.');
    executar(() => app.anf.pularPara(fim), { geracao: e.geracao });
  }

  async function decidirPorEquipe() {
    const e = app.estado;
    if (!e || e.tipo !== 'rodada' || !['decidindo', 'prorrogacao'].includes(e.subfase)) return avisar('Só com uma decisão aberta.');
    const rodada = app.config.rodadas[e.rodada];
    const equipes = ativas(e).filter((eq) => e.subfase === 'decidindo' || e.empatadas?.[eq]);
    const eq = await escolher('Decidir por esta equipe', equipes.map((id) => ({
      rotulo: `${numeroEquipe(id)} ${app.config.equipes[id].nome}${e.forcadas?.[id] ? ` (agora: ${letraDe(rodada, e.forcadas[id])})` : ''}`,
      valor: id,
    })), { explicacao: 'Para a equipe sem celular, ou que anunciou a decisão em voz alta.' });
    if (!eq) return;
    const permitidas = e.subfase === 'prorrogacao' ? ordemOpcoes(rodada).filter((op) => e.empatadas[eq]?.[op] === true) : ordemOpcoes(rodada);
    const opcoes = permitidas.map((op) => ({ rotulo: `${letraDe(rodada, op)} · ${rodada.opcoes[op].rotulo}`, valor: op, marcada: e.forcadas?.[eq] === op }));
    if (e.forcadas?.[eq]) opcoes.push({ rotulo: 'Tirar a decisão do apresentador', valor: '__nenhuma__' });
    const op = await escolher(`${app.config.equipes[eq].nome}: qual opção?`, opcoes);
    if (!op) return;
    executar(() => app.anf.decidirPorEquipe(eq, op === '__nenhuma__' ? null : op), { geracao: e.geracao });
  }

  async function moverAluno() {
    if (app.modo !== 'online' || !app.anf) return;
    const { el } = D();
    const campo = el('input', { type: 'text', maxlength: '3', autocomplete: 'off', autofocus: true, classe: 'campo-cracha', 'aria-label': 'Código do crachá' });
    const codigo = await abrirModal('Mover aluno: código do crachá (as 3 letras depois do ·)', el('div', {}, [campo]), [
      { rotulo: 'Cancelar', valor: null },
      { rotulo: 'Procurar', valor: 'ok', primario: true },
    ]);
    if (!codigo) return;
    const alvo = campo.value.trim().toUpperCase();
    const achados = Object.keys(app.dados.membros || {}).filter((u) => N().alunoLogica.codigoCracha(u) === alvo);
    if (achados.length === 0) return avisar(`Nenhum aparelho com o crachá ${alvo}.`, 'erro');
    if (achados.length > 1) return avisar(`Dois aparelhos com o crachá ${alvo}: peça para um deles recarregar a página.`, 'erro');
    const eq = await escolher(`Mover ${alvo} para qual equipe?`, ativas(app.estado).map((id) => ({ rotulo: `${numeroEquipe(id)} ${app.config.equipes[id].nome}`, valor: id })));
    if (!eq) return;
    // Revisão de 30/09 (achado P1): com a decisão aberta, o voto que o aparelho
    // já deu pela equipe de agora deixa de valer (a apuração conta só quem é da
    // equipe: anfitrião, votosDaEquipe). O celular avisa o aluno; aqui, o
    // apresentador confirma sabendo disso. Sem voto, move direto.
    const e = app.estado;
    const de = app.dados.membros?.[achados[0]]?.equipe;
    const aberta = e?.tipo === 'rodada' && ['decidindo', 'prorrogacao'].includes(e.subfase);
    if (aberta && de && de !== eq && typeof app.dados.decisoes?.[de]?.[achados[0]] === 'string') {
      const ok = await confirmar(
        `${alvo} já votou nesta decisão pela equipe ${numeroEquipe(de)} ${app.config.equipes[de]?.nome || ''}. Movido agora, esse voto é descartado, e o aluno precisa votar de novo pela equipe ${numeroEquipe(eq)} ${app.config.equipes[eq].nome}.`,
        'Mover e descartar o voto', { focarCancelar: true },
      );
      if (!ok) return;
    }
    executar(() => app.anf.moverMembro(achados[0], eq));
  }

  // "Remover inativos" (arquitetura, seção 10): apaga o registro de quem está
  // sem presença há mais de 2 min. O dobro da janela de "ativo", de propósito:
  // quem só trocou de rede ou deixou a tela apagar por um minuto não perde a
  // equipe. O celular removido que volta é registrado de novo sozinho (com a
  // entrada aberta), mas sem voto na decisão já aberta: por isso a barra pede
  // segurar 2 s. O aviso diz só quantos saíram, sem uid nem crachá (a tela é
  // projetada).
  // Revisão da F6a: com uma votação aberta, quem já votou nela fica, mesmo sem
  // sinal (quem confere é o anfitrião, contratos, seção 7): o voto confirmado
  // nunca some. O aviso diz isso, para o "ativos / membros" não surpreender.
  const REMOVER_INATIVOS_MS = 120000;
  function removerInativos() {
    if (app.modo !== 'online' || !app.anf) return;
    const e = app.estado;
    const comVotacao = (e?.tipo === 'rodada' && ['decidindo', 'prorrogacao', 'fechando', 'sorteio', 'resultado'].includes(e.subfase))
      || (e?.tipo === 'enquete' && ['votando', 'fechando'].includes(e.subfase));
    const fica = comVotacao ? ' Quem já votou nesta votação continua na sala.' : '';
    executar(async () => {
      const n = await app.anf.removerInativos(REMOVER_INATIVOS_MS);
      avisar(n === 0
        ? `Nenhum membro sem sinal há mais de 2 min: ninguém saiu.${fica}`
        : `${n === 1 ? '1 membro inativo removido' : `${F().inteiro(n)} membros inativos removidos`} (sem sinal há mais de 2 min).${fica}`);
    });
  }

  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      avisar('O navegador não deixou entrar em tela cheia: use F11.');
    }
  }

  // Contagem manual (offline): teclas 1 a 5 somam, Shift + tecla desconta.
  // A contagem manual substitui os votos de celular da enquete aberta (métodos
  // nunca se misturam, contratos seção 7). Antes da primeira tecla, o
  // apresentador confirma: sem isto, os votos que chegaram antes da queda
  // sumiam calados na primeira contagem (revisão da F2, achado 27).
  let manualAceito = null;
  async function contar(categoria, delta) {
    const e = app.estado;
    if (app.modo !== 'offline' || !e || e.tipo !== 'enquete' || e.subfase !== 'votando') return;
    const afirm = afirmacaoEmFoco(e);
    if (!afirm) return;
    const chave = `${app.sala}|${e.enquete}|${e.momento}`;
    const celular = votosDeCelular(e);
    if (!e.manual && celular > 0 && manualAceito !== chave) {
      const texto = `${celular} ${celular === 1 ? 'aparelho votou' : 'aparelhos votaram'} pelo celular antes da queda. A contagem à mão substitui todos os votos de celular desta enquete. Contar à mão?`;
      if (!(await confirmar(texto, 'Contar à mão', { focarCancelar: true }))) return;
      manualAceito = chave;
    }
    executar(async () => {
      const atual = app.anf.estado();
      const hist = histManual(atual, afirm);
      const novo = Math.max(0, hist[categoria] + delta);
      if (novo === hist[categoria]) return;
      hist[categoria] = novo;
      await app.anf.contagemManual(afirm, hist);
    });
  }

  function mudarAfirmacaoManual(delta) {
    const e = app.estado;
    if (app.modo !== 'offline' || !e || e.tipo !== 'enquete' || e.subfase !== 'votando' || e.afirmacao !== '*') return;
    const total = ordemAfirmacoes(app.config.enquetes[e.enquete]).length;
    app.ui.afirmacaoManual = Math.min(total - 1, Math.max(0, app.ui.afirmacaoManual + delta));
    agendarDesenho();
  }

  // ---------- Teclado ----------

  function numeroDaTecla(ev) {
    const m = /^(?:Digit|Numpad)([0-9])$/.exec(ev.code || '');
    return m ? Number(m[1]) : null;
  }

  function aoTeclar(ev) {
    if (app.el.modal.open) return; // o <dialog> cuida de Enter e Esc
    const alvo = ev.target;
    if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return;
    if (!app.anf) return; // na abertura, o teclado é o do formulário
    const tecla = ev.key;
    const numero = numeroDaTecla(ev);
    let tratada = true;
    if (ev.ctrlKey && (tecla === 'z' || tecla === 'Z')) desfazer();
    else if (ev.ctrlKey || ev.altKey || ev.metaKey) tratada = false;
    else if (tecla === ' ' || tecla === 'ArrowRight' || tecla === 'PageDown') avancar();
    // O passador de slides manda ← e PageUp no "voltar": aqui não fazem nada.
    else if (tecla === 'ArrowLeft' || tecla === 'PageUp') { /* de propósito, nada */ }
    else if (tecla === 'Enter') encerrar();
    else if (tecla === 'p' || tecla === 'P') pausarOuRetomar();
    else if (tecla === 'f' || tecla === 'F') alternarTelaCheia();
    else if (tecla === 'h' || tecla === 'H') { if (app.barraVisivel) esconderBarra(); else mostrarBarra(); }
    else if (tecla === 'ArrowUp') mudarAfirmacaoManual(-1);
    else if (tecla === 'ArrowDown') mudarAfirmacaoManual(1);
    else if (numero !== null && app.estado?.tipo === 'enquete' && numero >= 1 && numero <= 5) contar(numero - 1, ev.shiftKey ? -1 : 1);
    else if (numero !== null && app.estado?.tipo === 'formarEquipes' && numero >= 1) {
      const id = equipesOrdem()[numero - 1];
      if (id) alternarEquipe(id);
    } else tratada = false;
    // preventDefault: sem ele, o Espaço rolaria a página e o Enter acionaria
    // o botão que estivesse com foco, além do comando.
    if (tratada) ev.preventDefault();
  }

  // ---------- Arrastar o config.json ----------

  function ligarArrastar() {
    document.addEventListener('dragover', (ev) => {
      if (app.anf) return;
      ev.preventDefault();
      document.body.classList.add('arrastando');
    });
    document.addEventListener('dragleave', (ev) => {
      if (ev.relatedTarget === null) document.body.classList.remove('arrastando');
    });
    document.addEventListener('drop', (ev) => {
      if (app.anf) return;
      ev.preventDefault();
      document.body.classList.remove('arrastando');
      const arquivo = ev.dataTransfer?.files?.[0];
      if (arquivo) lerConfigDeArquivo(arquivo).catch(mostrarErro);
    });
  }

  // ---------- Início ----------

  // Ao voltar à vista (Alt+Tab dos slides), relê meta e estado do banco: com a
  // aba escondida, o navegador pode ter atrasado ou perdido avisos.
  //
  // Revisão da F2:
  // - sem rede de verdade (achado 29), só o ciclo de reconexão: a releitura
  //   fica para quando o selo voltar a "conectado". Enfileirada, ela ocupava a
  //   fila por 10 s e terminava num erro técnico projetado para a turma;
  // - online, confere o hostUid antes de reler (achado 24). O carregarSala
  //   grava o hostUid quando ele não é deste uid: era assim que o telão antigo
  //   tomava de volta a sala de quem tinha assumido com o PIN. Outra máquina é
  //   a anfitriã: este telão fica passivo.
  function sincronizar() {
    if (!app.anf || app.passivo) return;
    app.sincronizarAoVoltar = false;
    // Online, o mesmo ciclo de reconexão do celular (arquitetura, seção A,
    // item 3): a conexão pode ter ficado "zumbi" com a janela escondida.
    if (app.modo === 'online' && typeof app.canal?.reconectar === 'function') {
      if (app.conectado === false) {
        app.sincronizarAoVoltar = true;
        app.canal.reconectar();
        return;
      }
      app.reconectouEm = Date.now();
      app.canal.reconectar();
    }
    executar(async () => {
      try {
        const meta = await app.canal.ler(`salas/${app.sala}/meta`);
        if (meta && app.modo === 'online' && meta.hostUid !== (await app.canal.entrar())) {
          app.dados.meta = meta;
          entrarEmModoPassivo();
          return;
        }
        const e = await app.anf.carregarSala();
        app.dados.meta = meta;
        processarEstado(e);
        app.chaveDesenho = null;
        agendarDesenho();
      } catch (erro) {
        if (/^SEM_CONEXAO/.test(String(erro?.message))) app.sincronizarAoVoltar = true;
        throw erro;
      }
    });
  }

  function iniciar() {
    const $ = (sel) => document.querySelector(sel);
    app.el = { palco: $('#palco'), faixa: $('#faixa'), barra: $('#barra'), aviso: $('#aviso'), modal: $('#modal') };
    app.selo = N().conexao.criarSelo();
    app.wake = N().conexao.criarWakeLock();
    document.body.classList.add('em-abertura');
    montarAbertura();
    ligarArrastar();
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousemove', aoMoverMouse);
    // O mouse que sai da janela pela borda de baixo não fica "na borda" para sempre.
    document.documentElement.addEventListener('mouseleave', () => { app.mouseNaBorda = false; });
    raiz.addEventListener('resize', () => agendarDesenho());
    N().conexao.aoVoltarAVista(() => sincronizar());
    setInterval(tique, 250);
    carregarConfigPorRede();
  }

  // Ponto de encaixe para quem ligar o modo online, e leitura para o e2e.
  V.telao = {
    versaoApp: VERSAO_APP,
    ligarSessao, abrirCanal, salvarEstado,
    estado: () => app.estado,
    sala: () => app.sala,
    modo: () => app.modo,
    chaveSessao,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }
})(globalThis);
