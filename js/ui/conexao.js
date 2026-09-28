// Selo de conexão, Wake Lock e o aviso de "a página voltou a ficar visível".
// Serve ao telão e ao celular.
//
// Aqui fica só o mecanismo. A política (quando ligar o Wake Lock, o que fazer ao
// voltar à vista) é de quem chama: o celular liga o Wake Lock só durante votação e
// decisão (arquitetura, seção A, item 6); o telão, a sessão inteira.
//
// Script clássico (IIFE): o telão offline abre por file://.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});
  const D = () => raiz.Viracao.dom;

  // Cada estado tem texto e forma próprios: a cor nunca é o único canal (D-016).
  const ESTADOS = {
    conectado: { texto: 'Conectado', forma: 'cheio' },
    reconectando: { texto: 'Reconectando…', forma: 'metade' },
    offline: { texto: 'Sem conexão', forma: 'vazio' },
  };

  function icone(forma) {
    const { svg } = D();
    const filhos = [svg('circle', { cx: 8, cy: 8, r: 6, fill: forma === 'cheio' ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 2 })];
    if (forma === 'metade') filhos.push(svg('path', { d: 'M8 2 A6 6 0 0 1 8 14 Z', fill: 'currentColor' }));
    if (forma === 'vazio') filhos.push(svg('line', { x1: 3, y1: 13, x2: 13, y2: 3, stroke: 'currentColor', 'stroke-width': 2 }));
    return svg('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true', classe: 'selo-icone' }, filhos);
  }

  // criarSelo() → { elemento, definir(estado, texto?), estado() }
  // estado ∈ conectado | reconectando | offline. texto troca o rótulo padrão
  // (o telão offline diz "Sem celulares", e não "Sem conexão").
  function criarSelo() {
    const { el } = D();
    const rotulo = el('span', { classe: 'selo-texto' });
    const elemento = el('div', { classe: 'selo', role: 'status', 'aria-live': 'polite' }, [rotulo]);
    let atual = null;
    function definir(estado, texto) {
      const def = ESTADOS[estado];
      if (!def) throw new Error(`Estado de conexão desconhecido: "${estado}".`);
      atual = estado;
      elemento.dataset.estado = estado;
      const velho = elemento.querySelector('.selo-icone');
      if (velho) velho.remove();
      elemento.insertBefore(icone(def.forma), rotulo);
      rotulo.textContent = texto || def.texto;
    }
    return { elemento, definir, estado: () => atual };
  }

  // O navegador solta o Wake Lock sozinho quando a página some (troca de aba,
  // tela bloqueada). Por isso o pedido é refeito ao voltar à vista, se ainda
  // for desejado. Sem suporte (ou negado, como numa aba sem gesto do usuário),
  // falha em silêncio: a tela apagar é incômodo, não perda de dado.
  function criarWakeLock() {
    let querLigado = false;
    let trava = null;
    const suportado = Boolean(raiz.navigator && raiz.navigator.wakeLock);

    async function pedir() {
      if (!suportado || !querLigado || trava || document.visibilityState !== 'visible') return Boolean(trava);
      try {
        trava = await raiz.navigator.wakeLock.request('screen');
        trava.addEventListener('release', () => { trava = null; });
      } catch {
        trava = null;
      }
      return Boolean(trava);
    }

    const aoVoltar = () => { if (document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', aoVoltar);

    return {
      suportado,
      ligar() {
        querLigado = true;
        return pedir();
      },
      async desligar() {
        querLigado = false;
        const t = trava;
        trava = null;
        if (t) {
          try { await t.release(); } catch { /* já solto pelo navegador */ }
        }
      },
      ativo: () => Boolean(trava),
    };
  }

  // Chama cb(motivo) quando a página volta a ficar visível: visibilitychange,
  // pageshow (voltar pelo histórico, ou página restaurada do cache) e online.
  // É o gancho do "relê o estado ao voltar" (arquitetura, seção A, item 3): o
  // telão escondido atrás dos slides pode ter perdido avisos.
  function aoVoltarAVista(cb) {
    const visivel = () => { if (document.visibilityState === 'visible') cb('visibilidade'); };
    const mostrada = (ev) => { if (ev.persisted) cb('pageshow'); };
    const rede = () => cb('online');
    document.addEventListener('visibilitychange', visivel);
    raiz.addEventListener('pageshow', mostrada);
    raiz.addEventListener('online', rede);
    return () => {
      document.removeEventListener('visibilitychange', visivel);
      raiz.removeEventListener('pageshow', mostrada);
      raiz.removeEventListener('online', rede);
    };
  }

  V.conexao = { criarSelo, criarWakeLock, aoVoltarAVista, ESTADOS };
})(globalThis);
