// A história de cada equipe no fim do jogo (D-045): uma linha por mês jogado,
// com a opção decidida, a carta sorteada e as contas do mês. O telão mostra as
// histórias no placar final (D-041), e o celular mostra a da própria equipe.
//
// Arquivo à parte, e não dentro do motor: o celular não carrega o motor.js (nem
// o validador, nem a sorte), e a história precisa rodar nos dois. Script
// clássico (IIFE), sem DOM, sem rede e sem relógio: função pura do conteúdo e
// dos resultados gravados.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // O conteúdo vem do banco: o RTDB some com lista vazia e pode devolver lista
  // como objeto { "0": … }.
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

  // D-054: a mesma escolha dita do jeito de cada ofício. rotuloPor/narrativaPor
  // da persona, e o rotulo/narrativa da opção quando ela não tem entrada. O
  // telão também usa isto (o resultado de cada equipe fala do jeito dela);
  // opção que não existe dá os dois null.
  function textoDaOpcao(conteudo, rodadaId, opcaoId, personaId) {
    const opcao = em(conteudo, 'rodadas', rodadaId, 'opcoes', opcaoId) || {};
    return {
      rotulo: em(opcao, 'rotuloPor', personaId) ?? opcao.rotulo ?? null,
      narrativa: em(opcao, 'narrativaPor', personaId) ?? opcao.narrativa ?? null,
    };
  }

  // Na ordem das rodadas do config; rodada sem resultado da equipe (pulada no
  // dia, ou equipe fechada naquele mês) não entra. cartaCusto é o gravado pelo
  // telão (D-052); resultado de sala anterior ao v2.1 não o tem, e fica null.
  function historiaDaEquipe(conteudo, equipeId, resultados) {
    const ordem = lista(em(conteudo, 'ordem', 'rodadas'));
    const rodadas = ordem.length > 0 ? ordem : Object.keys(em(conteudo, 'rodadas') || {});
    const personaId = em(conteudo, 'equipes', equipeId, 'persona');
    const historia = [];
    for (const rodadaId of rodadas) {
      const res = em(resultados, rodadaId, equipeId);
      if (!res) continue;
      const rodada = em(conteudo, 'rodadas', rodadaId) || {};
      const carta = em(conteudo, 'cartas', res.carta) || {};
      historia.push({
        rodadaId,
        titulo: rodada.titulo ?? null,
        opcao: textoDaOpcao(conteudo, rodadaId, res.decisao, personaId),
        carta: { titulo: carta.titulo ?? null, narrativa: carta.narrativa ?? null, tom: carta.tom ?? null },
        mes: res.mes ?? null,
        cartaCusto: res.cartaCusto ?? null,
        // O que veio dos meses anteriores (motor, deAntes), gravado pelo
        // anfitrião; lista vazia quando não há, ou em sala antiga.
        deAntes: lista(res.deAntes),
        // O que a proteção pagou no mês (D-059), ou null.
        protecaoDoMes: protecaoDoResultado(res),
      });
    }
    return historia;
  }

  // D-059: o que a proteção pagou num mês, a partir do resultado gravado pelo
  // anfitrião (mes.protecao, protecaoEvitou e protecaoItens). null quando ela
  // não pagou nada, e em sala anterior à D-059 (sem mes.protecao). evitou
  // ausente vale o pago: é o que o motor calcula (a proteção do mês não muda
  // os juros do mês).
  function protecaoDoResultado(res) {
    const pagou = Number(res?.mes?.protecao) || 0;
    const evitou = Number.isFinite(res?.protecaoEvitou) ? res.protecaoEvitou : pagou;
    if (!(pagou > 0) && !(evitou > 0)) return null;
    const itens = lista(res.protecaoItens).filter((x) => x && typeof x.rotulo === 'string' && Number.isFinite(x.valor));
    const saldoMes = Number.isFinite(res.mes?.saldoMes) ? res.mes.saldoMes : null;
    return { pagou, evitou, itens, saldoMes };
  }

  // A frase do celular (D-059): "A proteção pagou R$ 900: auxílio do INSS
  // (MEI). Sem ela, teria faltado R$ 900 a mais." O "sem ela" muda com o mês:
  // quem fechou no vermelho teria faltado mais; quem fechou por causa dela
  // teria faltado a diferença; quem sobrou teria sobrado menos. A proteção
  // não "rende" na média (é seguro); o que ela vale é isto. A moeda vem da
  // tela (Viracao.formatar): o núcleo não formata dinheiro.
  function fraseDaProtecao(protecao, moeda) {
    if (!protecao) return null;
    const nomes = protecao.itens.map((x) => x.rotulo);
    const pagou = `A proteção pagou ${moeda(protecao.pagou)}${nomes.length > 0 ? `: ${nomes.join(' e ')}` : ''}.`;
    if (protecao.saldoMes === null || !(protecao.evitou > 0)) return pagou;
    const semEla = protecao.saldoMes - protecao.evitou;
    let depois;
    if (protecao.saldoMes < 0) depois = `Sem ela, teria faltado ${moeda(protecao.evitou)} a mais.`;
    else if (semEla < 0) depois = `Sem ela, teria faltado ${moeda(-semEla)}.`;
    else depois = `Sem ela, teria sobrado ${moeda(protecao.evitou)} a menos.`;
    return `${pagou} ${depois}`;
  }

  // O pior caso do placar (D-059), em reais inteiros para a tela: com as
  // escolhas da equipe e, se ela escolheu alguma opção que protege, sem ela.
  // situacao diz o que a tela escreve depois do primeiro número:
  // - "semEscolha": a equipe não escolheu proteção;
  // - "evitou": sem a proteção, o pior caso seria mais fundo (semProtecao e
  //   evitou = a diferença, que a sala não precisa calcular de cabeça);
  // - "naoMelhorou": com as escolhas jogadas, a proteção não melhorou o pior
  //   caso. Acontece com o MEI quando a sessão acaba antes do mês 3 (o INSS
  //   só chega no mês seguinte à fratura, e até lá só pesa o DAS) e com a
  //   associação, que não cobre o acidente (rascunho, seção 0.4). Antes desta
  //   trava, o telão escrevia "sem a proteção: −R$ 6.032" embaixo de
  //   "com as escolhas de vocês: −R$ 6.210" e da nota "ela evita o pior": o
  //   "sem" nunca pode aparecer melhor que o "com" (revisão da F5, achado 1);
  // - "semDado": sala anterior à D-059, sem piorCasoSemProtecao (a tela não
  //   inventa).
  // Placar sem piorCaso (sala antiga) devolve null.
  function piorCasoDoPlacar(placar, protegeu) {
    if (!placar || !Number.isFinite(placar.piorCaso)) return null;
    const com = Math.round(placar.piorCaso) + 0;
    const base = { comEscolhas: com, semProtecao: null, evitou: 0 };
    if (protegeu !== true) return { ...base, situacao: 'semEscolha' };
    if (!Number.isFinite(placar.piorCasoSemProtecao)) return { ...base, situacao: 'semDado' };
    const sem = Math.round(placar.piorCasoSemProtecao) + 0;
    if (sem < com) return { comEscolhas: com, semProtecao: sem, evitou: com - sem, situacao: 'evitou' };
    return { ...base, situacao: 'naoMelhorou' };
  }

  // D-059: o config tem alguma opção que protege? Sem ela, o placar não tem o
  // pior caso "sem a proteção" para mostrar.
  function temProtecao(conteudo) {
    return Object.values(em(conteudo, 'rodadas') || {})
      .some((r) => Object.values((r && r.opcoes) || {}).some((o) => o && o.protege === true));
  }

  // A equipe escolheu, em algum mês jogado, uma opção que protege. O telão e o
  // celular leem a mesma coisa daqui.
  function escolheuProtecao(conteudo, resultados, equipeId) {
    return Object.keys(resultados || {}).some((rodadaId) => {
      const decisao = em(resultados, rodadaId, equipeId, 'decisao');
      return typeof decisao === 'string' && em(conteudo, 'rodadas', rodadaId, 'opcoes', decisao, 'protege') === true;
    });
  }

  // "Escolha ou sorte?" em reais inteiros, para a tela (D-041): o motor devolve
  // piloto, efeitoDecisoes e sorte fracionários, e arredondar cada um sozinho
  // fazia a conta lida em voz alta ("se não mudassem nada → as escolhas → a
  // sorte → terminaram com") errar por R$ 1 em ~15% das equipes (revisão de
  // 29/09). A sorte exibida é o que falta para fechar com o total arredondado:
  // a diferença para a do motor fica abaixo de R$ 1,50, e a conta sempre fecha.
  // Placar sem os quatro números (sala antiga) devolve null: a tela não inventa.
  function escolhaOuSorte(placar) {
    if (!placar) return null;
    const { piloto, efeitoDecisoes, renda } = placar;
    if (![piloto, efeitoDecisoes, renda].every(Number.isFinite)) return null;
    const total = Math.round(renda);
    const p = Math.round(piloto);
    const escolhas = Math.round(efeitoDecisoes);
    // "+ 0" troca -0 por 0: "−R$ 0" na tela seria um sinal sem valor.
    return { piloto: p + 0, escolhas: escolhas + 0, sorte: total - p - escolhas + 0, total: total + 0 };
  }

  // A primeira frase de um texto: até o primeiro ".", "!" ou "?" seguido de
  // espaço (ou do fim). O ponto de "R$ 1.500" vem colado no número e não conta.
  function primeiraFrase(texto) {
    if (typeof texto !== 'string' || !texto.trim()) return null;
    const limpo = texto.trim();
    return /^.*?[.!?](?=\s|$)/s.exec(limpo)?.[0] ?? limpo;
  }

  // A linha curta de um mês na história do telão (D-045; rascunho, seção 7,
  // item 12): a primeira frase da narrativa da opção e a da carta, em primeira
  // pessoa. As narrativas inteiras (de 90 a 150 letras cada) davam quatro
  // linhas por mês, e três meses não cabiam em 1024×768 com o corpo em 28 px.
  // O corte é sempre no fim de uma frase; o celular mostra as duas inteiras.
  function linhaDoMes(mes) {
    const frases = [primeiraFrase(mes?.opcao?.narrativa), primeiraFrase(mes?.carta?.narrativa)].filter(Boolean);
    return frases.length > 0 ? frases.join(' ') : null;
  }

  V.historia = {
    historiaDaEquipe, escolhaOuSorte, linhaDoMes, textoDaOpcao, protecaoDoResultado, fraseDaProtecao, piorCasoDoPlacar,
    temProtecao, escolheuProtecao,
  };
})(globalThis);
