// Formatação de números, dinheiro, horas e durações para as telas (telão e celular).
//
// Por que um módulo só para isso: o mesmo valor aparece no telão, no celular e no
// e2e, que confere o placar projetado contra o motor. Se cada tela formatasse do
// seu jeito, "R$ 1.234" num lugar e "1234" no outro, a conferência quebraria e a
// turma veria números diferentes para a mesma coisa.
//
// Fuso fixo em America/Sao_Paulo: o notebook do apresentador pode estar com o
// relógio em outro fuso (máquina emprestada), e "Retomar a sessão de 28/09, 14:05"
// precisa bater com o relógio da sala.
//
// Script clássico (IIFE): o telão offline abre por file://.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  const LOCAL = 'pt-BR';
  const FUSO = 'America/Sao_Paulo';
  // Sinal de menos tipográfico: o hífen é curto demais e some no projetor a 5 m.
  const MENOS = '\u2212';

  const formatadores = new Map();
  function numero(chave, opcoes) {
    if (!formatadores.has(chave)) formatadores.set(chave, new Intl.NumberFormat(LOCAL, opcoes));
    return formatadores.get(chave);
  }

  function sinalDe(n, comMais) {
    if (n < 0) return MENOS;
    return comMais && n > 0 ? '+' : '';
  }

  // Reais sem centavos: o jogo trabalha com valores redondos, e centavo no telão
  // só atrapalha a leitura. Arredonda antes de decidir o sinal, senão -0,4 viraria
  // "\u2212R$ 0".
  function moeda(n, { sinal = false } = {}) {
    if (!Number.isFinite(n)) return '—';
    const r = Math.round(n);
    const corpo = numero('moeda', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(r));
    return sinalDe(r, sinal) + corpo;
  }

  // Variação em reais: sempre com + ou −, inclusive a nula ("+R$ 0"). Na cadeia
  // do "Escolha ou sorte?" (D-041; rascunho, seção 7, item 11), variação e total
  // tinham o mesmo formato, e "−R$ 4.150 → −R$ 395" parecia uma sequência de
  // saldos. O total usa moeda(), que nunca leva "+".
  function variacao(n) {
    if (!Number.isFinite(n)) return '—';
    const r = Math.round(n);
    return r < 0 ? moeda(r) : `+${moeda(r + 0)}`;
  }

  function inteiro(n, { sinal = false } = {}) {
    if (!Number.isFinite(n)) return '—';
    const r = Math.round(n);
    return sinalDe(r, sinal) + numero('inteiro', { maximumFractionDigits: 0 }).format(Math.abs(r));
  }

  // Uma casa decimal só quando existe (mediana 3,5; média 3,6).
  function decimal(n) {
    if (!Number.isFinite(n)) return '—';
    return numero('decimal', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(n);
  }

  // Taxa de juros ao mês (fração) → "7,43%": até duas casas, como a fonte
  // escreve. Com o decimal() (uma casa), o telão dizia 7,4% e o contexto do
  // celular, 7,43%, na mesma sessão (revisão de 29/09).
  function taxa(fracao) {
    if (!Number.isFinite(fracao)) return '—';
    // O arredondamento a 4 casas tira o resíduo binário (0,0743 × 100 = 7,430000000000001).
    return `${numero('taxa', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(fracao * 1e6) / 1e4)}%`;
  }

  // Fração de 0 a 1 → "42%". null é "sem votos" (enquete.resumo), nunca "0%".
  function porcento(fracao) {
    if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return '—';
    return `${Math.round(fracao * 100)}%`;
  }

  // O valor de um indicador do config: "moeda" ou "inteiro".
  function indicador(ind, valor, opcoes) {
    return ind && ind.formato === 'moeda' ? moeda(valor, opcoes) : inteiro(valor, opcoes);
  }

  const partesData = new Intl.DateTimeFormat(LOCAL, {
    timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // "28/09, 14:05": o formato do "Retomar a sessão de …?".
  function dataHora(ms) {
    if (!Number.isFinite(ms)) return '—';
    const p = Object.fromEntries(partesData.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return `${p.day}/${p.month}, ${p.hour}:${p.minute}`;
  }

  // "2026-09-28-1405", para nome de arquivo baixado (sem ":" nem "/", que o
  // Windows recusa).
  function carimbo(ms) {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}-${p.hour === '24' ? '00' : p.hour}${p.minute}`;
  }

  // Cronômetro: milissegundos restantes → "1:05". Arredonda para cima: com 0,4 s
  // faltando, mostrar "0:00" faria parecer que o tempo acabou.
  function relogio(ms) {
    if (!Number.isFinite(ms)) return '—';
    const seg = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  }

  // O atraso da barra do apresentador: "+3 min de atraso", "2 min adiantado".
  // Menos de 1 min para qualquer lado é "no horário": oscilar entre +0 e \u22120 a
  // cada segundo distrairia quem apresenta.
  function atraso(seg) {
    if (!Number.isFinite(seg)) return '';
    const min = Math.round(seg / 60);
    if (min === 0) return 'no horário';
    return min > 0 ? `+${min} min de atraso` : `${-min} min adiantado`;
  }

  function pessoas(n) {
    return n === 1 ? '1 pessoa' : `${inteiro(n)} pessoas`;
  }

  V.formatar = { moeda, variacao, inteiro, decimal, taxa, porcento, indicador, dataHora, carimbo, relogio, atraso, pessoas, MENOS };
})(globalThis);
