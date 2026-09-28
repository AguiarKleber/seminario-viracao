// Montagem de tela sem innerHTML (AGENTS.md, regra 4), para o telão e o celular.
//
// Por que não innerHTML: todo texto das telas vem do config.json ou do banco, e um
// "<" numa afirmação, ou um nome de equipe adulterado no banco, viraria marcação
// executável. Com textContent e createElement, texto é sempre texto.
//
// Script clássico (IIFE): o telão offline abre por file://.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});
  const NS_SVG = 'http://www.w3.org/2000/svg';

  function acrescentar(pai, filhos) {
    for (const f of [].concat(filhos)) {
      if (f === null || f === undefined || f === false) continue;
      if (Array.isArray(f)) acrescentar(pai, f);
      else pai.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
    }
    return pai;
  }

  // atributos: "classe" (string ou lista), "texto", "ao" ({ click: fn }),
  // "dados" ({ chave: valor } → data-chave), "estilo" ({ '--var': valor }) e o
  // resto vira setAttribute. Valor false/null/undefined não é gravado.
  function aplicar(no, atributos) {
    for (const [k, v] of Object.entries(atributos || {})) {
      if (v === null || v === undefined || v === false) continue;
      // Listas aninhadas (botao() junta a classe dele com a de quem chama) são
      // achatadas: sem isso, a lista virava "a,b" dentro do atributo.
      if (k === 'classe') no.setAttribute('class', [v].flat(Infinity).filter(Boolean).join(' '));
      else if (k === 'texto') no.textContent = String(v);
      else if (k === 'ao') for (const [evento, fn] of Object.entries(v)) no.addEventListener(evento, fn);
      else if (k === 'dados') for (const [d, valor] of Object.entries(v)) no.dataset[d] = String(valor);
      else if (k === 'estilo') for (const [p, valor] of Object.entries(v)) no.style.setProperty(p, String(valor));
      else no.setAttribute(k, v === true ? '' : String(v));
    }
    return no;
  }

  function el(tag, atributos, filhos) {
    return acrescentar(aplicar(document.createElement(tag), atributos), filhos ?? []);
  }

  function svg(tag, atributos, filhos) {
    return acrescentar(aplicar(document.createElementNS(NS_SVG, tag), atributos), filhos ?? []);
  }

  function limpar(no) {
    no.replaceChildren();
    return no;
  }

  // Todo botão perde o foco depois do clique (arquitetura, seção 5): com o foco
  // preso, o Espaço seguinte (o passador, ou o "Avançar") acionaria de novo o
  // último botão clicado, que pode ser "Encerrar" ou "Desfazer".
  function botao(rotulo, acao, opcoes = {}) {
    const { classe, titulo, dica, desabilitado, segurarMs, dados, pressionado } = opcoes;
    const filhos = [el('span', { classe: 'botao-rotulo', texto: rotulo })];
    if (dica) filhos.push(el('kbd', { classe: 'botao-dica', texto: dica }));
    const b = el('button', {
      type: 'button', classe: ['botao', classe], title: titulo, disabled: desabilitado, dados,
      'aria-pressed': pressionado === undefined ? null : String(Boolean(pressionado)),
    }, filhos);
    if (segurarMs) segurar(b, segurarMs, acao);
    else {
      b.addEventListener('click', (ev) => {
        b.blur();
        acao(ev);
      });
    }
    return b;
  }

  // Ações sem volta ("Continuar sem celulares", "Encerrar jogo", "Apagar a sala")
  // exigem segurar o botão (arquitetura, seção 5): um clique acidental, ou o
  // Espaço, nunca apaga a sala. O progresso aparece como faixa dentro do botão
  // (--progresso de 0 a 1). O timer aqui é de interface: não toca o estado.
  function segurar(b, ms, acao) {
    let inicio = 0;
    let quadro = 0;
    b.classList.add('botao-segurar');
    const parar = () => {
      cancelAnimationFrame(quadro);
      inicio = 0;
      b.style.setProperty('--progresso', '0');
    };
    const passo = () => {
      if (!inicio) return;
      const p = Math.min(1, (performance.now() - inicio) / ms);
      b.style.setProperty('--progresso', String(p));
      if (p >= 1) {
        parar();
        b.blur();
        acao();
        return;
      }
      quadro = requestAnimationFrame(passo);
    };
    b.addEventListener('pointerdown', (ev) => {
      if (b.disabled || ev.button !== 0) return;
      inicio = performance.now();
      quadro = requestAnimationFrame(passo);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, parar);
    // O clique curto só lembra que é preciso segurar.
    b.addEventListener('click', () => b.blur());
  }

  // Baixa um arquivo gerado na hora. Funciona também por file://, onde não há
  // servidor para devolver o arquivo.
  function baixar(nomeArquivo, conteudo, tipo = 'application/json') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo + ';charset=utf-8' }));
    const a = el('a', { href: url, download: nomeArquivo, hidden: true });
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revogar na hora cancelaria o download em alguns navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function lerArquivo(arquivo) {
    if (arquivo && typeof arquivo.text === 'function') return arquivo.text();
    return new Promise((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result));
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsText(arquivo, 'utf-8');
    });
  }

  V.dom = { el, svg, limpar, botao, segurar, baixar, lerArquivo, acrescentar, NS_SVG };
})(globalThis);
