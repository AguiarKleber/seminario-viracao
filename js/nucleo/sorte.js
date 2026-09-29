// A sorte do jogo, reproduzível: dada a semente gravada em sementes/{r}, a
// mesma carta sai no telão online, no offline, no simulador e nos testes.
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. Nada aqui chama Math.random nem Date.now:
// semente nova vem de fora (gerarSemente no anfitrião, com crypto.getRandomValues).
// Sem isso, desfazer e refazer uma rodada tiraria outra carta na frente da turma.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // Um número qualquer viraria semente em silêncio (NaN >>> 0 é 0), e toda sala
  // passaria a tirar as mesmas cartas. Melhor quebrar alto no teste.
  function exigirSemente(semente) {
    if (!Number.isInteger(semente) || semente < 0 || semente > 0xFFFFFFFF) {
      throw new TypeError(`Semente inválida: ${semente}. Precisa ser um inteiro de 0 a 4294967295.`);
    }
    return semente >>> 0;
  }

  // mulberry32: 32 bits de estado, período 2^32, e passa nos testes de
  // distribuição que importam para sortear uma carta entre ~8. Cabe em 6 linhas,
  // sem dependência, e dá o mesmo resultado em qualquer motor de JavaScript.
  function gerador(semente) {
    let estado = exigirSemente(semente);
    return function () {
      estado = (estado + 0x6D2B79F5) | 0;
      let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Uma semente independente por uso ('carta:e3', 'moeda:e3'). Assim a carta da
  // equipe e3 não muda se a e2 estiver fechada ou se a ordem de apuração mudar.
  function derivar(semente, rotulo) {
    if (typeof rotulo !== 'string') throw new TypeError('O rótulo da semente derivada precisa ser texto.');
    const texto = exigirSemente(semente) + ':' + rotulo;
    let h = 0x811c9dc5; // FNV-1a de 32 bits
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    // Finalizador do murmur3. O FNV sozinho mistura pouco os bits altos quando os
    // rótulos diferem só no último caractere ('carta:e1' e 'carta:e2'), e o
    // mulberry32 usa a semente crua: as primeiras cartas das equipes sairiam
    // correlacionadas.
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // itens = [{ id, peso }]. Peso 0 nunca sai (é assim que o ajuste de peso tira
  // uma carta do baralho). Soma 0 é erro, e não "sai a primeira": um baralho vazio
  // é defeito do config que o validador deveria ter barrado.
  function sortearPonderado(itens, aleatorio) {
    let total = 0;
    for (const item of itens) {
      if (!Number.isFinite(item.peso) || item.peso < 0) {
        throw new RangeError(`Peso inválido para "${item.id}": ${item.peso}.`);
      }
      total += item.peso;
    }
    if (!(total > 0)) throw new RangeError('Sorteio impossível: a soma dos pesos é 0.');
    const alvo = aleatorio() * total;
    let acumulado = 0;
    let ultimoPossivel;
    for (const item of itens) {
      if (item.peso === 0) continue;
      acumulado += item.peso;
      ultimoPossivel = item.id;
      if (alvo < acumulado) return item.id;
    }
    // Só chega aqui por arredondamento (a soma parcial ficou um fio abaixo do
    // total). Cai no último item que podia sair, nunca num de peso 0.
    return ultimoPossivel;
  }

  V.sorte = { gerador, derivar, sortearPonderado };
})(globalThis);
