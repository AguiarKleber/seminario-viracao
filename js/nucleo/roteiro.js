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

  V.roteiro = { passos, subfasesDe, somaAlvos, atrasoSeg, proximoIndice, indiceValido };
})(globalThis);
