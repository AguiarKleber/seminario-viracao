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

  // Na ordem das rodadas do config; rodada sem resultado da equipe (pulada no
  // dia, ou equipe fechada naquele mês) não entra.
  function historiaDaEquipe(conteudo, equipeId, resultados) {
    const ordem = lista(em(conteudo, 'ordem', 'rodadas'));
    const rodadas = ordem.length > 0 ? ordem : Object.keys(em(conteudo, 'rodadas') || {});
    const historia = [];
    for (const rodadaId of rodadas) {
      const res = em(resultados, rodadaId, equipeId);
      if (!res) continue;
      const rodada = em(conteudo, 'rodadas', rodadaId) || {};
      const opcao = em(rodada, 'opcoes', res.decisao) || {};
      const carta = em(conteudo, 'cartas', res.carta) || {};
      historia.push({
        rodadaId,
        titulo: rodada.titulo ?? null,
        opcao: { rotulo: opcao.rotulo ?? null, narrativa: opcao.narrativa ?? null },
        carta: { titulo: carta.titulo ?? null, narrativa: carta.narrativa ?? null, tom: carta.tom ?? null },
        mes: res.mes ?? null,
      });
    }
    return historia;
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

  V.historia = { historiaDaEquipe, escolhaOuSorte };
})(globalThis);
