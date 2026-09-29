// O roteiro da aula: a lista de passos que o anfitrião percorre, e o atraso
// acumulado que a barra do apresentador mostra.
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. Nada aqui toca DOM, rede ou relógio: a hora
// chega por parâmetro, para o atraso ser testável e igual online e offline.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // Conjunto fechado (contratos, seção 1). O antigo passo "jogo", com todas as
  // rodadas juntas, saiu em 28/09 (D-006) e agora é recusado como qualquer outro.
  const TIPOS = new Set([
    'lobby', 'enquete', 'bloco', 'formarEquipes', 'personas', 'rodada', 'placarFinal', 'comparativo', 'fim',
  ]);

  // Congeladas porque são devolvidas por referência: um chamador que desse push
  // numa delas mudaria as subfases de todos os passos daquele tipo.
  const SUBFASES = {
    enquete: Object.freeze(['votando', 'fechando', 'apurada']),
    rodada: Object.freeze(['decidindo', 'fechando', 'prorrogacao', 'sorteio', 'resultado']),
  };
  const SO_ATIVO = Object.freeze(['ativo']);

  function passos(config, nomeRoteiro) {
    const lista = config?.roteiros?.[nomeRoteiro];
    if (!Array.isArray(lista)) throw new Error(`O roteiro "${nomeRoteiro}" não existe no config.`);
    // Sem passo nenhum a sala nem teria o lobby; melhor recusar ao criar a sala
    // do que travar o telão na frente da turma.
    if (lista.length === 0) throw new Error(`O roteiro "${nomeRoteiro}" está vazio.`);
    // O passo opcional (a enquete "antes", D-008) continua na lista: quem decide
    // pular é o apresentador, pelo "Pular para…", e não o roteiro.
    return lista.map((passo, indice) => {
      if (!TIPOS.has(passo?.tipo)) {
        throw new Error(`Roteiro "${nomeRoteiro}", passo ${indice + 1}: tipo desconhecido "${passo?.tipo}".`);
      }
      // Cópia rasa: o config normalizado é congelado na sala e não pode mudar.
      return { ...passo, indice };
    });
  }

  function subfasesDe(tipo) {
    if (!TIPOS.has(tipo)) throw new Error(`Tipo de passo desconhecido: "${tipo}".`);
    return SUBFASES[tipo] ?? SO_ATIVO;
  }

  // Passo sem alvoSeg (o "fim") não consome tempo do plano.
  function somaAlvos(lista) {
    return lista.reduce((total, passo) => total + (passo.alvoSeg ?? 0), 0);
  }

  function indiceValido(lista, indice) {
    return Number.isInteger(indice) && indice >= 0 && indice < lista.length;
  }

  // Índice fora da lista é erro do anfitrião, e não "fim do roteiro": devolver
  // null aqui faria o telão encerrar a aula no meio.
  function exigirIndice(lista, indice) {
    if (!indiceValido(lista, indice)) throw new RangeError(`Índice de passo inválido: ${indice}.`);
  }

  // Tempo decorrido desde o início da sessão menos a soma dos alvos dos passos
  // anteriores ao atual; positivo é atraso. O tempo já gasto dentro do passo atual
  // entra como atraso: para o número de quando o passo abriu, que não cresce
  // sozinho, passe como agoraMs a hora de abertura do passo.
  function atrasoSeg(lista, indiceAtual, inicioSessaoMs, agoraMs) {
    exigirIndice(lista, indiceAtual);
    if (!Number.isFinite(inicioSessaoMs) || !Number.isFinite(agoraMs)) {
      throw new TypeError('atrasoSeg: as horas precisam ser números finitos, em ms.');
    }
    return (agoraMs - inicioSessaoMs) / 1000 - somaAlvos(lista.slice(0, indiceAtual));
  }

  // null depois do último passo. Não pula o opcional: isso é com o anfitrião.
  function proximoIndice(lista, indice) {
    exigirIndice(lista, indice);
    return indice + 1 < lista.length ? indice + 1 : null;
  }

  // A palavra de cada passo no item que junta o fim do seminário. Com o roteiro
  // de 60 min: "debrief, termômetro, medição, fechamento" (rascunho, seção 7,
  // item 15). O placar final é o debrief do jogo; a enquete "depois" e o
  // comparativo são a medição do antes e depois; o último bloco, o fechamento.
  // Um bloco no meio (o roteiro de 120 min tem dois depois do placar) entra pela
  // primeira palavra do título: "Caminhos: convidado…" vira "caminhos".
  function palavraDoFinal(config, passo, ehUltimoBloco) {
    switch (passo.tipo) {
      case 'placarFinal': return 'debrief';
      case 'comparativo': return 'medição';
      case 'enquete': {
        if (passo.momento === 'depois') return 'medição';
        const titulo = config?.enquetes?.[passo.enquete]?.titulo || 'enquete';
        return titulo.charAt(0).toLowerCase() + titulo.slice(1);
      }
      case 'bloco': {
        if (ehUltimoBloco) return 'fechamento';
        const palavra = String(passo.titulo || '').trim().split(/\s+/)[0].replace(/[:,.;!?]+$/, '');
        return palavra ? palavra.toLowerCase() : 'apresentação';
      }
      case 'formarEquipes': return 'equipes';
      default: return passo.tipo;
    }
  }

  // Os itens da linha do tempo do seminário (D-042), do primeiro passo depois
  // da entrada na sala até o último antes da tela do fim: um item por passo, e
  // nenhum passo escondido. Antes (29/09), a linha tinha só os blocos e os meses,
  // e o "a seguir" apontava para passos que não estavam nela (formação das
  // equipes, placar, termômetro); depois do mês 3, só o "Fim" (item 15).
  // Com mais de maxItens (o que cabe no "Mapa do seminário" em 1024×768), os
  // passos depois do último mês viram um item só, { tipo: 'final', palavras },
  // em vez de sumirem. O telão decide o maxItens; aqui não há DOM para medir.
  function linhaDoTempo(config, lista, { maxItens = Infinity } = {}) {
    const visiveis = lista.filter((p) => p.tipo !== 'lobby' && p.tipo !== 'fim');
    const itens = visiveis.map((p) => ({ tipo: p.tipo, indices: [p.indice] }));
    const ultimaRodada = visiveis.map((p) => p.tipo).lastIndexOf('rodada');
    const cauda = ultimaRodada >= 0 ? visiveis.slice(ultimaRodada + 1) : [];
    if (itens.length <= maxItens || cauda.length < 2) return { itens, agrupado: false };
    const ultimoBloco = cauda.map((p) => p.tipo).lastIndexOf('bloco');
    // O fechamento só é o último bloco se nada além da tela do fim vem depois.
    const fecha = ultimoBloco === cauda.length - 1 ? ultimoBloco : -1;
    const palavras = [...new Set(cauda.map((p, i) => palavraDoFinal(config, p, i === fecha)))];
    return {
      itens: [...itens.slice(0, ultimaRodada + 1), { tipo: 'final', indices: cauda.map((p) => p.indice), palavras }],
      agrupado: true,
    };
  }

  V.roteiro = { passos, subfasesDe, somaAlvos, atrasoSeg, proximoIndice, indiceValido, linhaDoTempo };
})(globalThis);
