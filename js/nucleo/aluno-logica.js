// A lógica do celular: qual tela mostrar, se o voto guardado ainda vale, qual
// equipe sugerir e o crachá (contratos seção 8).
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. Sem DOM, sem rede e sem relógio próprio: a
// tela é uma função dos dados (arquitetura, invariante I6). Recarregar o celular
// dá a mesma tela, e o simulador de 20 alunos usa exatamente esta função.
//
// O conteúdo chega do banco, e o RTDB some com lista e objeto vazios. Por isso
// todo campo opcional é lido com cuidado (lista(), em()).
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // O mesmo alfabeto do código da sala: sem 0/O e 1/I, que se confundem no
  // telão e falados em voz alta.
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // A folga da regra: o anfitrião grava em estado.prazo o fim do cronômetro MAIS
  // esta folga, e é esse prazo que a regra do banco confere (now <= prazo +
  // graça). No teste de 30/09, o prazo era o próprio fim do cronômetro: a decisão
  // do mês 3 ficou aberta 7 min 35 s no telão (quem encerra é o apresentador,
  // D-010), a regra recusou todo voto depois de 2 min 5 s, e o "Votar nesta" do
  // Jonas não contava. Com a folga do tempo de vida da sala (12 h), o voto vale
  // enquanto a votação estiver aberta: é o "fechando" que corta, e não o relógio.
  // Fica aqui, e não no anfitrião, porque o celular não carrega o anfitrião e
  // precisa da mesma folga para desenhar o cronômetro.
  const FOLGA_DA_REGRA_MS = 12 * 60 * 60 * 1000;

  // O fim do cronômetro (o tempo configurado da etapa, mais o "+30 s"), a partir
  // do prazo da regra. Só desenho (I5): o voto não olha isto. null sem prazo
  // (etapa pausada, ou sem votação).
  function fimDoCronometro(estado) {
    const prazo = estado?.prazo;
    return typeof prazo === 'number' ? prazo - FOLGA_DA_REGRA_MS : null;
  }

  function lista(x) {
    if (Array.isArray(x)) return x;
    return x && typeof x === 'object' ? Object.values(x) : [];
  }

  // Object.hasOwn a cada passo: um id "constructor" não pode achar o construtor.
  function em(obj, ...chaves) {
    let no = obj;
    for (const k of chaves) {
      if (!no || typeof no !== 'object' || typeof k !== 'string' || !Object.hasOwn(no, k)) return null;
      no = no[k];
    }
    return no ?? null;
  }

  function ids(conteudo, colecao) {
    const ordem = lista(em(conteudo, 'ordem', colecao));
    return ordem.length > 0 ? ordem : Object.keys(em(conteudo, colecao) || {});
  }

  const votoValido = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
  const tela = (tipo, dados = {}) => ({ tipo, dados });
  const aguardando = (motivo, extra = {}) => tela('aguardando', { motivo, ...extra });

  function resumoEquipe(conteudo, id) {
    const e = em(conteudo, 'equipes', id);
    return e ? { id, nome: e.nome, cor: e.cor, forma: e.forma } : null;
  }

  // Indicadores iniciais sem depender do motor.js: o celular não carrega o motor.
  function estadoInicial(conteudo, equipeId) {
    const persona = em(conteudo, 'personas', em(conteudo, 'equipes', equipeId, 'persona'));
    const estado = {};
    for (const ind of ids(conteudo, 'indicadores')) {
      const daPersona = em(persona, 'inicial', ind);
      estado[ind] = daPersona !== null ? daPersona : em(conteudo, 'indicadores', ind, 'inicial');
    }
    return estado;
  }

  function listaIndicadores(conteudo, valores) {
    return ids(conteudo, 'indicadores').map((id) => {
      const ind = em(conteudo, 'indicadores', id) || {};
      return { id, nome: ind.nome, formato: ind.formato, valor: em(valores, id) ?? ind.inicial };
    });
  }

  // D-054: o rótulo e a narrativa da opção do jeito do ofício da persona. É a
  // mesma regra de historia.textoDaOpcao, repetida aqui porque a lógica do
  // celular não pode depender da ordem de carga do historia.js para montar a
  // decisão (sem ele, a história do fim fica vazia, mas a decisão não pode).
  function textoOpcao(conteudo, rodadaId, opcaoId, personaId) {
    const opcao = em(conteudo, 'rodadas', rodadaId, 'opcoes', opcaoId) || {};
    return {
      rotulo: em(opcao, 'rotuloPor', personaId) ?? opcao.rotulo ?? null,
      narrativa: em(opcao, 'narrativaPor', personaId) ?? opcao.narrativa ?? null,
    };
  }

  const personaDe = (conteudo, equipeId) => em(conteudo, 'equipes', equipeId, 'persona');

  // A família e o básico da casa vão junto com a persona (D-044): a tela mostra
  // "o básico custa R$ Y" desde antes do primeiro mês. O total é a soma dos
  // itens, a mesma conta do motor (que o celular não carrega).
  function resumoPersona(conteudo, equipeId) {
    const id = em(conteudo, 'equipes', equipeId, 'persona');
    const p = em(conteudo, 'personas', id) || {};
    const itens = lista(em(p, 'basico', 'itens')).map((i) => ({ rotulo: i.rotulo, valor: i.valor, fonte: i.fonte ?? null }));
    const outra = em(p, 'outraRenda');
    return {
      id, nome: p.nome, descricao: p.descricao,
      familia: p.familia ? { descricao: p.familia.descricao, pessoas: p.familia.pessoas } : null,
      basico: { total: itens.reduce((soma, i) => soma + (Number(i.valor) || 0), 0), itens },
      outraRenda: outra ? { rotulo: outra.rotulo, valor: outra.valor, fonte: outra.fonte ?? null } : null,
    };
  }

  // D-046: "dívida: R$ X · juros de Y% ao mês". A dívida é o saldo negativo, e os
  // juros dela são cobrados no fim do próximo mês.
  function dividaDe(conteudo, valores) {
    const renda = em(valores, 'renda');
    return { valor: typeof renda === 'number' && renda < 0 ? -renda : 0, jurosMes: em(conteudo, 'regras', 'jurosDividaMes') };
  }

  // A situação da persona nos blocos (D-006): indicadores e a narrativa do
  // último mês, em primeira pessoa, com a opção decidida e a carta.
  function dadosSituacao(conteudo, equipeId, resultados) {
    let ultimo = null;
    let rodadaId = null;
    for (const r of ids(conteudo, 'rodadas')) {
      const res = em(resultados, r, equipeId);
      if (res) {
        ultimo = res;
        rodadaId = r;
      }
    }
    const valores = ultimo ? ultimo.depois : estadoInicial(conteudo, equipeId);
    const dados = {
      equipe: resumoEquipe(conteudo, equipeId),
      persona: resumoPersona(conteudo, equipeId),
      indicadores: listaIndicadores(conteudo, valores),
      mes: null,
      divida: dividaDe(conteudo, valores),
      narrativa: [],
    };
    if (ultimo) {
      const rodada = em(conteudo, 'rodadas', rodadaId) || {};
      const opcao = textoOpcao(conteudo, rodadaId, ultimo.decisao, personaDe(conteudo, equipeId));
      const carta = em(conteudo, 'cartas', ultimo.carta) || {};
      // As contas do mês (entrou, gastos, básico, juros, saldoMes…) entram no
      // mesmo objeto: "entrou R$ X · gastos R$ G · o básico custa R$ Y · faltou
      // R$ Z" (D-044, esquema v2.1). cartaCusto é o custo real da carta (D-052).
      dados.mes = {
        ...(ultimo.mes || {}),
        rodada: rodadaId, titulo: rodada.titulo, origem: ultimo.origem,
        decisao: { id: ultimo.decisao, rotulo: opcao.rotulo },
        carta: { id: ultimo.carta, titulo: carta.titulo, tom: carta.tom ?? null },
        cartaCusto: ultimo.cartaCusto ?? null,
        // O que veio dos meses anteriores (a fratura que continua, o INSS, a
        // multa do aluguel), gravado pelo anfitrião; vazio em sala antiga.
        deAntes: lista(ultimo.deAntes),
        // O que a proteção pagou no mês (D-059), ou null.
        protecaoDoMes: protecaoDe(ultimo),
      };
      if (opcao.narrativa) dados.narrativa.push(opcao.narrativa);
      if (carta.narrativa) dados.narrativa.push(carta.narrativa);
    }
    return dados;
  }

  function afirmacoesDe(enq) {
    const ordem = lista(em(enq, 'ordemAfirmacoes'));
    return ordem.length > 0 ? ordem : Object.keys(em(enq, 'afirmacoes') || {});
  }

  function telaEnquete(conteudo, estado, meusVotos) {
    const enq = em(conteudo, 'enquetes', estado.enquete);
    if (!enq) return aguardando('telao');
    const meus = em(meusVotos, estado.enquete, estado.momento) || {};
    const todas = afirmacoesDe(enq);
    const abertas = estado.afirmacao === '*' ? todas : todas.filter((a) => a === estado.afirmacao);
    const item = (a) => ({ id: a, texto: em(enq, 'afirmacoes', a, 'texto'), voto: votoValido(meus[a]) ? meus[a] : null });
    const cabecalho = { enquete: { id: enq.id, titulo: enq.titulo }, momento: estado.momento };
    if (estado.subfase === 'votando') {
      const itens = abertas.map(item);
      const falta = itens.findIndex((i) => i.voto === null);
      if (falta < 0) return tela('enqueteRegistrada', { ...cabecalho, afirmacoes: itens, encerrada: false });
      // Uma afirmação por vez no celular, na ordem, com "1 de 3" (arquitetura
      // seção 9). A lista aberta vai junto para o aluno poder voltar e mudar. A
      // posição conta na enquete inteira: no uma_por_vez a lista aberta tem uma
      // afirmação só, e contar nela dava "1 de 1" em toda afirmação.
      return tela('enquete', {
        ...cabecalho, afirmacao: itens[falta], posicao: todas.indexOf(itens[falta].id) + 1, total: todas.length, afirmacoes: itens,
        escala: lista(em(conteudo, 'escala', 'curtos')),
        // O fim do cronômetro, e não o prazo da regra (que leva a folga de 12 h).
        prazo: fimDoCronometro(estado), pausado: typeof estado.restanteMs === 'number', restanteMs: estado.restanteMs ?? null,
      });
    }
    // Fechando ou apurada: "registrado" só para quem votou. Quem não votou não
    // pode ver uma confirmação de voto que não existe.
    const itens = todas.map(item);
    if (itens.some((i) => i.voto !== null)) return tela('enqueteRegistrada', { ...cabecalho, afirmacoes: itens, encerrada: true });
    return aguardando('votacaoEncerrada');
  }

  // Com os membros em mãos, o mesmo filtro da apuração (anfitrião,
  // votosDaEquipe): o voto de quem foi movido de equipe, removido por
  // inatividade ou entrou depois da abertura continua em decisoes/, mas não
  // conta. Sem o filtro a equipe via 2 × 1, achava que tinha decidido, e a
  // apuração dava 1 × 1 e abria a prorrogação.
  function contar(decisoesDaEquipe, membros, equipeId, abertoEm) {
    const contagem = {};
    for (const [u, op] of Object.entries(decisoesDaEquipe || {})) {
      if (typeof op !== 'string') continue;
      if (membros) {
        const m = em(membros, u);
        if (!m || m.equipe !== equipeId || typeof m.entrouEm !== 'number' || m.entrouEm > abertoEm) continue;
      }
      contagem[op] = (contagem[op] || 0) + 1;
    }
    return contagem;
  }

  function telaRodada(conteudo, estado, entrada, equipeId) {
    const { membro, membros, decisoesDaEquipe, resultados, uid } = entrada;
    const rodada = em(conteudo, 'rodadas', estado.rodada);
    if (!rodada) return aguardando('telao');
    const sub = estado.subfase;
    const infoRodada = { id: estado.rodada, titulo: rodada.titulo, texto: rodada.texto };
    const empatadas = em(estado, 'empatadas', equipeId);
    if (sub === 'decidindo' || (sub === 'prorrogacao' && empatadas)) {
      const ordem = lista(rodada.ordemOpcoes).length > 0 ? lista(rodada.ordemOpcoes) : Object.keys(rodada.opcoes || {});
      const visiveis = empatadas ? ordem.filter((o) => em(empatadas, o) === true) : ordem;
      const contagem = contar(decisoesDaEquipe, membros, equipeId, estado.abertoEm);
      // Quem entrou depois de a decisão abrir acompanha, mas não vota (a regra
      // recusaria; mostrar o botão seria prometer um voto que não conta).
      const entrouATempo = typeof membro.entrouEm === 'number' && typeof estado.abertoEm === 'number' && membro.entrouEm <= estado.abertoEm;
      const pausado = typeof estado.restanteMs === 'number';
      let motivo = null;
      if (!entrouATempo) motivo = 'entrouDepois';
      else if (pausado) motivo = 'pausado';
      return tela(sub === 'decidindo' ? 'decisao' : 'prorrogacao', {
        rodada: infoRodada,
        // D-043: a situação da família durante a decisão ("o aluguel vence dia 10").
        contexto: em(rodada, 'contexto', em(conteudo, 'equipes', equipeId, 'persona')),
        // Sem a tendência (D-043): a seta dizia qual era a opção "certa", e a
        // decisão deixava de ser um dilema.
        opcoes: visiveis.map((o) => ({ id: o, rotulo: textoOpcao(conteudo, estado.rodada, o, personaDe(conteudo, equipeId)).rotulo, votos: contagem[o] || 0 })),
        meuVoto: em(decisoesDaEquipe, uid),
        podeVotar: motivo === null,
        motivo,
        forcada: em(estado, 'forcadas', equipeId),
        prazo: fimDoCronometro(estado), pausado, restanteMs: estado.restanteMs ?? null,
        // A situação junto com a decisão: decide-se olhando os indicadores (R13).
        situacao: dadosSituacao(conteudo, equipeId, resultados),
      });
    }
    if (sub === 'prorrogacao') return aguardando('desempateDeOutrasEquipes');
    if (sub === 'fechando') return aguardando('votacaoEncerrada');
    const res = em(resultados, estado.rodada, equipeId);
    // No sorteio o resultado já está gravado, mas o celular não revela antes do
    // telão: a sala vê as fatias girarem junto.
    if (sub === 'sorteio' || !res) return tela('sorteando', { equipe: resumoEquipe(conteudo, equipeId), rodada: infoRodada });
    const opcao = textoOpcao(conteudo, estado.rodada, res.decisao, personaDe(conteudo, equipeId));
    const carta = em(conteudo, 'cartas', res.carta) || {};
    return tela('resultado', {
      equipe: resumoEquipe(conteudo, equipeId), rodada: infoRodada, origem: res.origem,
      decisao: { id: res.decisao, rotulo: opcao.rotulo, narrativa: opcao.narrativa },
      carta: { id: res.carta, titulo: carta.titulo, narrativa: carta.narrativa ?? null, tom: carta.tom ?? null },
      delta: res.delta || {}, indicadores: listaIndicadores(conteudo, res.depois),
      mes: res.mes ?? null, divida: dividaDe(conteudo, res.depois),
      // D-052: "20 dias parado · renda perdida R$ X · gastos R$ Y". null em sala
      // anterior ao v2.1, que não gravava o custo.
      cartaCusto: res.cartaCusto ?? null,
      // "fratura: mais 25 dias parado −R$ 2.233 · auxílio do INSS +R$ 2.431":
      // sem isto, os dois sumiam dentro do "Do trabalho" (revisão de 29/09,
      // 2ª rodada, achado 10). Lista vazia quando não há (ou sala antiga).
      deAntes: lista(res.deAntes),
      // D-059: "A proteção pagou R$ 900: auxílio do INSS. Sem ela, teria
      // faltado R$ 900 a mais." null quando ela não pagou nada.
      protecaoDoMes: protecaoDe(res),
    });
  }

  // O roteiro volta do banco como lista ou como objeto { "0": … }; em() lê os dois.
  function tituloDoBloco(conteudo, estado, meta) {
    return em(conteudo, 'roteiros', meta?.roteiro, String(estado.indice), 'titulo');
  }

  function telaDoAluno(entrada) {
    const { conteudo, estado, membro, meusVotos, resultados, placar, meta } = entrada;
    // Sem registro de membro: ou a entrada fechou, ou o registro ainda não foi
    // confirmado pelo servidor.
    if (!membro) return meta && meta.entradaAberta === false ? tela('entradaFechada') : aguardando('entrando');
    if (!conteudo || !estado) return aguardando('telao');
    const equipeId = em(conteudo, 'equipes', membro.equipe) ? membro.equipe : null;
    // Equipe fechada pelo apresentador não joga: o membro espera ser redistribuído.
    const abertas = em(estado, 'equipesAbertas');
    const equipeValida = equipeId !== null && (!abertas || em(abertas, equipeId) === true) ? equipeId : null;
    const formadas = equipeValida !== null && estado.equipesTravadas === true;
    switch (estado.tipo) {
      case 'lobby':
        return aguardando('lobby');
      case 'enquete':
        return telaEnquete(conteudo, estado, meusVotos);
      case 'bloco':
        // Antes das equipes: "acompanhe a apresentação". Depois: a situação da
        // persona (D-006), sem Wake Lock e sem "aguardando o telão".
        return formadas
          ? tela('situacao', { ...dadosSituacao(conteudo, equipeValida, resultados), titulo: tituloDoBloco(conteudo, estado, meta), final: false })
          : aguardando('apresentacao', { titulo: tituloDoBloco(conteudo, estado, meta) });
      case 'formarEquipes':
        if (estado.equipesTravadas === true) return formadas ? tela('persona', dadosPersona(conteudo, equipeValida)) : aguardando('semEquipe');
        return tela('escolherEquipe', {
          equipes: ids(conteudo, 'equipes').filter((id) => !abertas || em(abertas, id) === true).map((id) => resumoEquipe(conteudo, id)),
          minha: equipeValida,
        });
      case 'personas':
        return equipeValida ? tela('persona', dadosPersona(conteudo, equipeValida)) : aguardando('semEquipe');
      case 'rodada':
        return equipeValida ? telaRodada(conteudo, estado, entrada, equipeValida) : aguardando('semEquipe');
      case 'placarFinal':
        return formadas
          ? tela('situacao', {
            ...dadosSituacao(conteudo, equipeValida, resultados), placar: em(placar, equipeValida), final: true,
            historia: historia(conteudo, equipeValida, resultados),
            piorCaso: piorCasoDaEquipe(conteudo, placar, resultados, equipeValida),
          })
          : aguardando('apresentacao');
      case 'comparativo':
        return telaComparativo(conteudo, estado, meusVotos);
      case 'fim':
        return tela('fim', {
          equipe: equipeValida ? resumoEquipe(conteudo, equipeValida) : null, placar: equipeValida ? em(placar, equipeValida) : null,
          historia: equipeValida ? historia(conteudo, equipeValida, resultados) : [],
          piorCaso: equipeValida ? piorCasoDaEquipe(conteudo, placar, resultados, equipeValida) : null,
        });
      default:
        return aguardando('telao');
    }
  }

  // O que a proteção pagou (D-059), com a mesma função da história: o celular
  // e o telão contam a mesma coisa. Buscado na hora da chamada, como abaixo.
  function protecaoDe(res) {
    const H = raiz.Viracao.historia;
    return H ? H.protecaoDoResultado(res) : null;
  }

  // O pior caso da equipe no placar (D-059), com e sem a proteção, pela mesma
  // regra do telão (historia.piorCasoDoPlacar): o "sem" só quando é pior que o
  // "com". Antes, só o telão mostrava o pior caso, e a D-059 o pede também na
  // história da equipe (revisão da F5, achado 10). null quando o config não
  // tem proteção (a página do telão também não existe) ou o placar não o tem.
  function piorCasoDaEquipe(conteudo, placar, resultados, equipeId) {
    const H = raiz.Viracao.historia;
    if (!H || !H.temProtecao(conteudo)) return null;
    return H.piorCasoDoPlacar(em(placar, equipeId), H.escolheuProtecao(conteudo, resultados, equipeId));
  }

  // A história da equipe (D-045) vem de historia.js, buscado na hora da chamada
  // (e não na carga), como todo módulo do núcleo.
  function historia(conteudo, equipeId, resultados) {
    const H = raiz.Viracao.historia;
    return H ? H.historiaDaEquipe(conteudo, equipeId, resultados) : [];
  }

  function dadosPersona(conteudo, equipeId) {
    return {
      equipe: resumoEquipe(conteudo, equipeId),
      persona: resumoPersona(conteudo, equipeId),
      indicadores: listaIndicadores(conteudo, estadoInicial(conteudo, equipeId)),
    };
  }

  // "Você antes: 4, agora: 2", visível só para o próprio aluno.
  function telaComparativo(conteudo, estado, meusVotos) {
    const enq = em(conteudo, 'enquetes', estado.enquete);
    if (!enq) return aguardando('telao');
    const voto = (m, a) => {
      const v = em(meusVotos, estado.enquete, m, a);
      return votoValido(v) ? v : null;
    };
    return tela('comparativo', {
      enquete: { id: enq.id, titulo: enq.titulo },
      afirmacoes: afirmacoesDe(enq).map((a) => ({ id: a, texto: em(enq, 'afirmacoes', a, 'texto'), antes: voto('antes', a), depois: voto('depois', a) })),
    });
  }

  function estaNoConjunto(conjunto, id) {
    if (conjunto instanceof Set) return conjunto.has(id);
    if (Array.isArray(conjunto)) return conjunto.includes(id);
    return em(conjunto, id) !== null && em(conjunto, id) !== false;
  }

  // "Me coloque numa equipe": completa cada equipe aberta até alvoPorEquipe, na
  // ordem do config, antes de abrir a próxima. Com todas cheias, vai para a de
  // menos membros ativos (empate: a primeira na ordem). Membro inativo não
  // conta: um aparelho fantasma não pode fechar vaga (red team, falha 6).
  function sugerirEquipe(conteudo, { membros, ativos, equipesAbertas } = {}) {
    const abertas = ids(conteudo, 'equipes').filter((id) => equipesAbertas == null || estaNoConjunto(equipesAbertas, id));
    if (abertas.length === 0) return null;
    const conta = {};
    for (const id of abertas) conta[id] = 0;
    for (const [u, m] of Object.entries(membros || {})) {
      if (!m || !Object.hasOwn(conta, m.equipe)) continue;
      if (ativos != null && !estaNoConjunto(ativos, u)) continue;
      conta[m.equipe] += 1;
    }
    const alvo = em(conteudo, 'regras', 'alvoPorEquipe');
    const incompleta = abertas.find((id) => conta[id] < alvo);
    if (incompleta) return incompleta;
    return abertas.reduce((melhor, id) => (conta[id] < conta[melhor] ? id : melhor));
  }

  // O voto guardado no aparelho ainda pode ser reenviado? Só se a mesma etapa
  // continua aberta. Não olha o relógio (invariante I5): o prazo é a regra do
  // banco que corta. Pausado ainda vale: a etapa é a mesma, e o reenvio passa
  // quando o apresentador retomar.
  // pendente = { tipo: 'enquete', enquete, momento, afirmacao, valor, abertoEm }
  //          | { tipo: 'decisao', rodada, equipe, opcao, abertoEm }
  // "A mesma etapa" é também a mesma janela (abertoEm): o voto guardado na janela
  // aberta por engano e desfeita pelo Ctrl+Z (D-037) não entra na reabertura, que
  // tem outro abertoEm. Pendente sem abertoEm é de antes desta conferência.
  function pendenteAindaVale(pendente, estado) {
    if (!pendente || !estado) return false;
    if (typeof pendente.abertoEm === 'number' && pendente.abertoEm !== estado.abertoEm) return false;
    if (pendente.tipo === 'enquete') {
      return estado.tipo === 'enquete' && estado.subfase === 'votando'
        && estado.enquete === pendente.enquete && estado.momento === pendente.momento
        && (estado.afirmacao === '*' || estado.afirmacao === pendente.afirmacao);
    }
    if (pendente.tipo === 'decisao') {
      if (estado.tipo !== 'rodada' || estado.rodada !== pendente.rodada) return false;
      if (estado.subfase === 'decidindo') return true;
      return estado.subfase === 'prorrogacao' && em(estado, 'empatadas', pendente.equipe, pendente.opcao) === true;
    }
    return false;
  }

  // Por que a regra recusou um voto, pelo que o celular sabe AGORA (o estado e o
  // próprio registro de membro). No teste de 30/09 a recusa só aparecia numa
  // nota embaixo da lista, fora da tela em 360×740, e o "Votar nesta" ficava
  // igual: o aluno achava que o botão não funcionava. A tela diz o motivo junto
  // do botão, e o motivo diz o que fazer:
  // - 'fechou': aquela votação (a mesma janela) já não está aberta;
  // - 'pausado': a mesma votação, pausada pelo apresentador (sem prazo, a regra
  //   recusa tudo);
  // - 'foraDaSala': o registro de membro sumiu (removido por inatividade);
  // - 'outraEquipe': o aparelho foi movido para outra equipe;
  // - 'entrouDepois': o aparelho entrou (ou voltou) depois de a decisão abrir;
  // - 'semMotivo': a votação continua aberta e nada explica a recusa; vale tentar de novo.
  // Revisão de 30/09, os casos em que o 'fechou' ("ele não foi contado") ou o
  // 'foraDaSala' diziam uma coisa falsa ou fora de contexto:
  // - 'trocaTarde': o que chegou tarde foi a TROCA; o voto anterior (anterior,
  //   o valor que o servidor já tinha confirmado) contou na apuração;
  // - 'soEmpatadas': a própria equipe está na prorrogação, e a opção votada não
  //   é uma das empatadas;
  // - 'outraAfirmacao': no termômetro de uma afirmação por vez, a resposta de
  //   uma afirmação que o apresentador já passou;
  // - 'foraDaSalaFechada': fora da sala com a entrada fechada: o aparelho não
  //   volta sozinho (garantirMembro só regrava o membro com a entrada aberta).
  function motivoDaRecusa(pendente, { estado, membro, anterior = null, entradaAberta = true } = {}) {
    if (!pendenteAindaVale(pendente, estado)) return motivoDoFechamento(pendente, estado, membro, anterior);
    if (typeof estado.restanteMs === 'number') return 'pausado';
    if (!membro) return entradaAberta === false ? 'foraDaSalaFechada' : 'foraDaSala';
    if (pendente.tipo === 'decisao') {
      if (membro.equipe !== pendente.equipe) return 'outraEquipe';
      const aTempo = typeof membro.entrouEm === 'number' && typeof estado.abertoEm === 'number' && membro.entrouEm <= estado.abertoEm;
      if (!aTempo) return 'entrouDepois';
    }
    return 'semMotivo';
  }

  // Por que a votação do pendente já não estava aberta quando ele chegou.
  function motivoDoFechamento(p, estado, membro, anterior) {
    if (!p || !estado) return 'fechou';
    // A mesma janela: o pendente sem abertoEm é de antes desta conferência.
    const mesmaJanela = typeof p.abertoEm !== 'number' || p.abertoEm === estado.abertoEm;
    if (p.tipo === 'enquete') {
      if (estado.tipo !== 'enquete' || estado.enquete !== p.enquete || estado.momento !== p.momento) return 'fechou';
      if (estado.afirmacao !== '*' && estado.afirmacao !== p.afirmacao) return 'outraAfirmacao';
      return mesmaJanela && votoValido(anterior) && anterior !== p.valor ? 'trocaTarde' : 'fechou';
    }
    if (p.tipo !== 'decisao' || estado.tipo !== 'rodada' || estado.rodada !== p.rodada) return 'fechou';
    if (estado.subfase === 'prorrogacao' && em(estado, 'empatadas', p.equipe)) return 'soEmpatadas';
    // O anterior só contou se o aparelho continuava na equipe e tinha entrado
    // antes da abertura: é o filtro da apuração (anfitrião, votosDaEquipe).
    const contava = Boolean(membro) && membro.equipe === p.equipe && typeof membro.entrouEm === 'number' && membro.entrouEm <= estado.abertoEm;
    return mesmaJanela && contava && typeof anterior === 'string' && anterior !== p.opcao ? 'trocaTarde' : 'fechou';
  }

  // Três caracteres derivados do uid (FNV-1a de 32 bits, 5 bits por caractere).
  // Não é pessoal e não identifica ninguém fora da sala; serve para o
  // apresentador achar o aparelho no "Mover aluno". Com 32^3 = 32.768 códigos e
  // 20 alunos, a chance de dois iguais na mesma sala fica perto de 0,6%.
  function codigoCracha(uid) {
    let h = 0x811c9dc5;
    const texto = String(uid);
    for (let i = 0; i < texto.length; i += 1) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h >>>= 0;
    return ALFABETO[h & 31] + ALFABETO[(h >>> 5) & 31] + ALFABETO[(h >>> 10) & 31];
  }

  function cracha(uid, equipe) {
    const nome = typeof equipe === 'string' ? equipe : equipe?.nome;
    const codigo = codigoCracha(uid);
    return nome ? `${nome} · ${codigo}` : codigo;
  }

  V.alunoLogica = {
    telaDoAluno, sugerirEquipe, pendenteAindaVale, motivoDaRecusa, cracha, codigoCracha, fimDoCronometro, FOLGA_DA_REGRA_MS,
  };
})(globalThis);
