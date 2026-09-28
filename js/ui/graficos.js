// Gráficos em SVG desenhado à mão: formas das equipes, histogramas das enquetes,
// fatias do sorteio, cascata do placar, barras simples e o QR da sala.
//
// Por que à mão, e não uma biblioteca: o telão abre por file:// no pendrive, sem
// internet e sem build; e cada gráfico aqui tem regras que uma biblioteca não
// traz pronta (D-016):
// - rótulo e número escritos na própria barra, nunca só numa legenda;
// - "antes" em cinza hachurado e "depois" em cor cheia, para a diferença não
//   depender só de cor;
// - a cor da equipe sempre acompanhada de forma, nome e número.
//
// Quem chama mede o espaço e passa largura, altura e fonte em pixels: o SVG sai
// com viewBox igual ao tamanho real, sem escala. Assim o texto dentro do gráfico
// tem exatamente o tamanho do corpo do telão (nunca abaixo de 28 px), e o e2e
// consegue conferir isso.
//
// Script clássico (IIFE): o telão offline abre por file://.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});
  const D = () => raiz.Viracao.dom;

  let sequencia = 0;
  const novoId = (prefixo) => `${prefixo}-${++sequencia}`;

  // Largura aproximada de um texto: 0,58 em por caractere cobre os dígitos
  // tabulares e o "R$" da fonte do sistema. Serve só para decidir se o rótulo
  // cabe dentro da barra; errar para mais só leva o rótulo para fora.
  const larguraTexto = (texto, fonte) => String(texto).length * fonte * 0.62;

  // ---------- Formas das equipes ----------

  const PONTOS = {
    triangulo: '50,6 95,90 5,90',
    losango: '50,3 97,50 50,97 3,50',
    estrela: '50,4 61,37 96,37 68,58 79,93 50,72 21,93 32,58 4,37 39,37',
    cruz: '36,6 64,6 64,36 94,36 94,64 64,64 64,94 36,94 36,64 6,64 6,36 36,36',
    hexagono: '27,8 73,8 96,50 73,92 27,92 4,50',
  };

  function forma(nome, cor, tamanho = 32) {
    const { svg } = D();
    const comum = { fill: cor, classe: 'forma-traco' };
    let desenho;
    if (nome === 'circulo') desenho = svg('circle', { cx: 50, cy: 50, r: 44, ...comum });
    else if (nome === 'quadrado') desenho = svg('rect', { x: 9, y: 9, width: 82, height: 82, ...comum });
    else if (PONTOS[nome]) desenho = svg('polygon', { points: PONTOS[nome], ...comum });
    // Forma desconhecida (o validador aceita outras): um círculo com miolo, para
    // nunca ficar igual ao "circulo" de outra equipe.
    else desenho = [svg('circle', { cx: 50, cy: 50, r: 44, ...comum }), svg('circle', { cx: 50, cy: 50, r: 14, classe: 'forma-miolo' })];
    return svg('svg', {
      viewBox: '0 0 100 100', width: tamanho, height: tamanho, classe: 'forma', 'aria-hidden': 'true', dados: { forma: nome },
    }, desenho);
  }

  // Forma, número e nome, sempre juntos: a cor nunca é o único canal (D-016).
  function rotuloEquipe(equipe, numero, { classe } = {}) {
    const { el } = D();
    return el('span', { classe: ['equipe', classe], dados: { equipe: equipe.id } }, [
      forma(equipe.forma, equipe.cor, '1em'),
      el('b', { classe: 'equipe-numero', texto: String(numero) }),
      el('span', { classe: 'equipe-nome', texto: equipe.nome }),
    ]);
  }

  // ---------- Peças comuns ----------

  function hachura(id, cor) {
    const { svg } = D();
    return svg('pattern', { id, width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
      svg('rect', { width: 14, height: 14, fill: '#2a2a2a' }),
      svg('rect', { width: 6, height: 14, fill: cor }),
    ]);
  }

  // Texto com "halo" da cor do fundo (paint-order: stroke no CSS): lê-se sobre
  // qualquer preenchimento, com o contraste do texto sobre o fundo (≥ 7:1).
  function rotulo(texto, x, y, fonte, ancora = 'middle', classe) {
    const { svg } = D();
    return svg('text', {
      x, y, 'font-size': fonte, 'text-anchor': ancora, 'dominant-baseline': 'central', classe: ['rotulo-halo', classe],
    }, [String(texto)]);
  }

  function raizSvg(largura, altura, filhos, atributos = {}) {
    const { svg } = D();
    return svg('svg', {
      viewBox: `0 0 ${largura} ${altura}`, width: largura, height: altura, classe: 'grafico-svg', role: 'img', ...atributos,
    }, filhos);
  }

  // ---------- Histograma de 1 a 5 ----------

  // series: [{ hist: [5 contagens], estilo: 'antes' | 'depois' | 'cheio', nome }]
  // As categorias ocupam 5 colunas iguais, alinhadas com a linha de legenda HTML
  // de rotulosEscala() logo abaixo (texto longo quebra melhor em HTML do que em SVG).
  function histograma({ largura, altura, fonte, series, rotuloAria }) {
    const { svg } = D();
    const maximo = Math.max(1, ...series.flatMap((s) => s.hist));
    const topo = fonte * 1.4;
    const base = altura - 4;
    const util = Math.max(1, base - topo);
    const coluna = largura / 5;
    const folga = coluna * 0.14;
    const larguraBarra = (coluna - folga * 2) / series.length;
    const idHachura = novoId('hachura');
    const filhos = [svg('defs', {}, [hachura(idHachura, '#bdbdbd')])];
    for (let c = 0; c < 5; c += 1) {
      series.forEach((s, i) => {
        const valor = s.hist[c];
        const h = (valor / maximo) * util;
        const x = c * coluna + folga + i * larguraBarra;
        const w = larguraBarra - (series.length > 1 ? 6 : 0);
        const preenchimento = s.estilo === 'antes' ? `url(#${idHachura})` : null;
        filhos.push(svg('rect', {
          x, y: base - h, width: w, height: Math.max(h, 0), classe: ['barra', `barra-${s.estilo}`], fill: preenchimento, rx: 3,
        }));
        // O número vai dentro da barra quando cabe; senão, logo acima.
        const dentro = h > fonte * 1.5;
        filhos.push(rotulo(valor, x + w / 2, dentro ? base - h + fonte * 0.8 : base - h - fonte * 0.65, fonte));
      });
    }
    filhos.push(svg('line', { x1: 0, y1: base + 2, x2: largura, y2: base + 2, classe: 'eixo' }));
    return raizSvg(largura, altura, filhos, { 'aria-label': rotuloAria || 'Distribuição das respostas de 1 a 5' });
  }

  // A legenda da escala, em 5 colunas alinhadas com o histograma.
  // soNumeros: só "1 … 5" embaixo das barras (dois gráficos lado a lado não
  // têm largura para o texto), e a legenda por extenso vai numa linha à parte
  // (legendaEscala).
  function rotulosEscala(rotulos, { soNumeros } = {}) {
    const { el } = D();
    return el('ol', { classe: ['escala-legenda', soNumeros ? 'escala-legenda-numeros' : null] },
      rotulos.map((r, i) => el('li', {}, [el('b', { texto: String(i + 1) }), soNumeros ? null : el('span', { texto: r })])));
  }

  function legendaEscala(rotulos) {
    const { el } = D();
    return el('p', { classe: 'escala-em-linha' }, rotulos.flatMap((r, i) => [i > 0 ? ' · ' : null, el('b', { texto: String(i + 1) }), ` ${r}`]));
  }

  // Amostra desenhada para a legenda: "antes" hachurado e "depois" cheio nas
  // enquetes; "piloto", "decisoes" e "sorte" (hachurada) no placar.
  const CLASSE_AMOSTRA = {
    antes: 'barra barra-antes', depois: 'barra barra-depois', cheio: 'barra barra-cheio',
    piloto: 'segmento segmento-piloto', decisoes: 'segmento segmento-decisoes', sorte: 'segmento segmento-sorte',
    discorda: 'barra parte-discorda', neutro: 'barra parte-neutro', concorda: 'barra parte-concorda',
  };
  function amostra(estilo) {
    const { svg } = D();
    const id = novoId('amostra');
    const hachurada = estilo === 'antes' || estilo === 'sorte' || estilo === 'discorda';
    const filhos = hachurada ? [svg('defs', {}, [hachura(id, estilo === 'discorda' ? '#8f8f8f' : '#bdbdbd')])] : [];
    filhos.push(svg('rect', {
      x: 1, y: 1, width: 30, height: 22, rx: 3, classe: CLASSE_AMOSTRA[estilo] || 'barra',
      fill: hachurada ? `url(#${id})` : null,
    }));
    return svg('svg', { viewBox: '0 0 32 24', width: '1.3em', height: '1em', classe: 'amostra', 'aria-hidden': 'true' }, filhos);
  }

  // ---------- Barra 100% (discorda / neutro / concorda) ----------

  function tresPartes({ largura, altura, fonte, resumo }) {
    const { svg } = D();
    const partes = [
      { chave: 'discorda', nome: 'discorda', estilo: 'parte-discorda' },
      { chave: 'neutro', nome: 'neutro', estilo: 'parte-neutro' },
      { chave: 'concorda', nome: 'concorda', estilo: 'parte-concorda' },
    ];
    const filhos = [];
    let x = 0;
    const idHachura = novoId('hachura');
    filhos.push(svg('defs', {}, [hachura(idHachura, '#8f8f8f')]));
    for (const p of partes) {
      const f = resumo[p.chave] || 0;
      const w = f * largura;
      if (w > 0) {
        filhos.push(svg('rect', { x, y: 0, width: w, height: altura, classe: ['barra', p.estilo], fill: p.chave === 'discorda' ? `url(#${idHachura})` : null }));
        const texto = `${p.nome} ${Math.round(f * 100)}%`;
        const curto = `${Math.round(f * 100)}%`;
        if (larguraTexto(texto, fonte) + 16 < w) filhos.push(rotulo(texto, x + w / 2, altura / 2, fonte));
        else if (larguraTexto(curto, fonte) + 12 < w) filhos.push(rotulo(curto, x + w / 2, altura / 2, fonte));
      }
      x += w;
    }
    return raizSvg(largura, altura, filhos, { 'aria-label': 'Discorda, neutro e concorda' });
  }

  // ---------- Fatias do sorteio ----------

  // linhas: [{ chances: [{ carta, chance }], sorteada, graves: Set<carta> }]
  // Uma linha por equipe, na mesma escala. O ponteiro de cada linha para no meio
  // da fatia sorteada. Todos os ponteiros usam a mesma animação, com a mesma
  // duração: param juntos (arquitetura, seção 5), e nenhuma equipe "sai antes".
  function fatias({ largura, altura, fonte, linhas, animar = true }) {
    const { svg } = D();
    const h = altura / Math.max(1, linhas.length);
    const idHachura = novoId('hachura');
    const filhos = [svg('defs', {}, [hachura(idHachura, '#9a9a9a')])];
    const rotulos = [];
    const ponteiros = [];
    linhas.forEach((linha, i) => {
      const y0 = i * h;
      const topoBarra = y0 + h * 0.32;
      const altBarra = h * 0.56;
      let x = 0;
      let alvo = 0;
      linha.chances.forEach((c, k) => {
        const w = c.chance * largura;
        const grave = linha.graves && linha.graves.has(c.carta);
        const classe = ['fatia', grave ? 'fatia-grave' : (k % 2 === 0 ? 'fatia-par' : 'fatia-impar'), c.carta === linha.sorteada ? 'fatia-sorteada' : null];
        filhos.push(svg('rect', {
          x: x + 1, y: topoBarra, width: Math.max(0, w - 2), height: altBarra, classe, fill: grave ? `url(#${idHachura})` : null, dados: { carta: c.carta },
        }));
        const pct = `${Math.round(c.chance * 100)}%`;
        if (larguraTexto(pct, fonte) + 10 < w) rotulos.push(rotulo(pct, x + w / 2, topoBarra + altBarra / 2, fonte));
        if (c.carta === linha.sorteada) alvo = x + w / 2;
        x += w;
      });
      const ponteiro = svg('g', {
        classe: ['ponteiro', animar ? 'ponteiro-animado' : null],
        estilo: { '--alvo': `${alvo}px`, '--fim': `${largura}px` },
        transform: animar ? null : `translate(${alvo} 0)`,
      }, [
        svg('polygon', { points: `0,${topoBarra - 2} ${-h * 0.14},${y0 + h * 0.06} ${h * 0.14},${y0 + h * 0.06}`, classe: 'ponteiro-seta' }),
        // A haste para na borda da barra: atravessá-la cobriria o número da fatia.
        svg('line', { x1: 0, y1: topoBarra - 2, x2: 0, y2: topoBarra + 6, classe: 'ponteiro-linha' }),
        svg('line', { x1: 0, y1: topoBarra + altBarra - 6, x2: 0, y2: topoBarra + altBarra + h * 0.1, classe: 'ponteiro-linha' }),
      ]);
      ponteiros.push(ponteiro);
    });
    // Ordem de pintura: fatias, números e, por cima, os ponteiros.
    filhos.push(...rotulos, ...ponteiros);
    // Com animação, o contorno da fatia sorteada só aparece quando os ponteiros
    // param (telao.css, .fatias-animadas): contornada desde o início, ela dava a
    // resposta antes do sorteio (revisão da F2, achado 8).
    return raizSvg(largura, altura, filhos, { 'aria-label': 'Fatias do sorteio por equipe', classe: ['grafico-svg', animar ? 'fatias-animadas' : null] });
  }

  // ---------- Cascata do placar ----------

  // linhas: [{ segmentos: [{ de, ate, estilo, rotulo, rotuloCurto? }], fim }]
  // dominio: [min, max] comum a todas as linhas. Cada segmento vai de "de" até
  // "ate" no eixo da renda: piloto (0 → piloto), decisões (piloto → +efeito) e
  // sorte (→ saldo). Negativo anda para a esquerda, sem truque de eixo.
  // referencias: [{ id, valor, linhas? }] viram linhas tracejadas; com `linhas`
  // (índices), só nessas linhas (a referência de uma persona só atravessa as
  // equipes dessa persona: revisão da F2, achado 20).
  //
  // Cada segmento tem a sua própria faixa dentro da linha, e os três números vão
  // numa linha de texto logo abaixo, cada um com a amostra do segmento (revisão
  // da F2, achado 7). Na mesma faixa, o caso comum (piloto negativo, decisão
  // positiva, sorte negativa) punha um segmento por cima do outro: o efeito das
  // decisões sumia sob a sorte, justamente a mensagem da D-009, e os rótulos se
  // atropelavam. rotuloCurto (sem "R$") entra quando os três não cabem na largura.
  function cascata({ largura, altura, fonte, dominio, linhas, referencias = [] }) {
    const { svg } = D();
    const [min, max] = dominio;
    const escala = (v) => ((v - min) / (max - min || 1)) * largura;
    const h = altura / Math.max(1, linhas.length);
    const idHachura = novoId('hachura');
    const filhos = [svg('defs', {}, [hachura(idHachura, '#bdbdbd')])];
    const rotulos = [];
    const folga = h * 0.06;
    const linhaTexto = Math.min(fonte * 1.3, h * 0.55);
    const faixa = Math.max(6, h - linhaTexto - folga * 2);
    const sub = faixa / 3;
    const amostraL = fonte * 0.9;
    const vao = fonte * 0.6;
    const preencher = (estilo) => (estilo === 'sorte' ? `url(#${idHachura})` : null);
    const faixas = [];
    linhas.forEach((linha, i) => {
      const y0 = i * h + folga;
      faixas.push([y0, y0 + faixa]);
      linha.segmentos.forEach((s, k) => {
        const x1 = escala(Math.min(s.de, s.ate));
        const w = escala(Math.max(s.de, s.ate)) - x1;
        if (w <= 0.5) return;
        filhos.push(svg('rect', {
          x: x1, y: y0 + k * sub + 1, width: w, height: Math.max(1, sub - 2), classe: ['segmento', `segmento-${s.estilo}`],
          fill: preencher(s.estilo), dados: { segmento: s.estilo },
        }));
      });
      if (Number.isFinite(linha.fim)) {
        const xf = escala(linha.fim);
        filhos.push(svg('line', { x1: xf, y1: y0 - 3, x2: xf, y2: y0 + faixa + 3, classe: 'marcador-fim' }));
      }
      // A linha dos números: amostra + número, na ordem piloto, decisões, sorte.
      const medida = (chave) => linha.segmentos.reduce((t, s) => t + amostraL + 6 + larguraTexto(s[chave] ?? s.rotulo ?? '', fonte) + vao, -vao);
      const chave = medida('rotulo') <= largura || !linha.segmentos.every((s) => s.rotuloCurto) ? 'rotulo' : 'rotuloCurto';
      const yTexto = y0 + faixa + folga + linhaTexto / 2;
      let x = 0;
      for (const s of linha.segmentos) {
        const texto = s[chave] ?? s.rotulo ?? '';
        filhos.push(svg('rect', {
          x, y: yTexto - fonte * 0.32, width: amostraL, height: fonte * 0.64, rx: 3,
          classe: ['segmento', `segmento-${s.estilo}`, 'amostra-rotulo'], fill: preencher(s.estilo),
        }));
        rotulos.push(rotulo(texto, x + amostraL + 6, yTexto, fonte, 'start', 'rotulo-parcela'));
        x += amostraL + 6 + larguraTexto(texto, fonte) + vao;
      }
    });
    const x0 = escala(0);
    filhos.push(svg('line', { x1: x0, y1: 0, x2: x0, y2: altura, classe: 'eixo' }));
    for (const r of referencias) {
      const xr = escala(r.valor);
      const onde = Array.isArray(r.linhas) ? r.linhas : linhas.map((_, i) => i);
      for (const i of onde) {
        if (!faixas[i]) continue;
        filhos.push(svg('line', { x1: xr, y1: faixas[i][0] - 3, x2: xr, y2: faixas[i][1] + 3, classe: 'referencia', dados: { referencia: r.id, linha: String(i) } }));
      }
    }
    filhos.push(...rotulos);
    return raizSvg(largura, altura, filhos, { 'aria-label': 'Saldo decomposto: piloto automático, efeito das decisões e sorte' });
  }

  // ---------- Barras simples (pior caso, energia, proteção) ----------

  function barras({ largura, altura, fonte, dominio, linhas }) {
    const { svg } = D();
    const [min, max] = dominio;
    const escala = (v) => ((v - min) / (max - min || 1)) * largura;
    const h = altura / Math.max(1, linhas.length);
    const x0 = escala(Math.max(min, Math.min(0, max)));
    const filhos = [];
    linhas.forEach((linha, i) => {
      const y = i * h + h * 0.18;
      const alt = h * 0.64;
      const x = escala(linha.valor);
      const x1 = Math.min(x0, x);
      const w = Math.abs(x - x0);
      filhos.push(svg('rect', { x: x1, y, width: Math.max(w, 2), height: alt, classe: ['segmento', 'segmento-simples'] }));
      if (linha.rotulo) {
        const cabe = larguraTexto(linha.rotulo, fonte) + 14 < w;
        filhos.push(rotulo(linha.rotulo, cabe ? x1 + w / 2 : x1 + w + 10, y + alt / 2, fonte, cabe ? 'middle' : 'start'));
      }
    });
    filhos.push(svg('line', { x1: x0, y1: 0, x2: x0, y2: altura, classe: 'eixo' }));
    return raizSvg(largura, altura, filhos);
  }

  // ---------- QR ----------

  // QR em módulos escuros sobre fundo claro (os leitores de celular esperam
  // esse contraste), com a zona de silêncio de 4 módulos. Um path só, e não
  // centenas de <rect>: o telão redesenha a faixa de entrada em toda tela.
  function qr(texto, { lado = 200, rotuloAria } = {}) {
    const { svg } = D();
    if (typeof raiz.qrcode !== 'function') throw new Error('vendor/qrcode.js não foi carregado.');
    const codigo = raiz.qrcode(0, 'M');
    codigo.addData(texto);
    codigo.make();
    const n = codigo.getModuleCount();
    const margem = 4;
    const total = n + margem * 2;
    let d = '';
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) if (codigo.isDark(r, c)) d += `M${c + margem} ${r + margem}h1v1h-1z`;
    }
    return svg('svg', {
      viewBox: `0 0 ${total} ${total}`, width: lado, height: lado, classe: 'qr', role: 'img',
      'aria-label': rotuloAria || `QR code: ${texto}`, 'shape-rendering': 'crispEdges',
    }, [
      svg('rect', { width: total, height: total, fill: '#ffffff' }),
      svg('path', { d, fill: '#000000' }),
    ]);
  }

  V.graficos = { forma, rotuloEquipe, histograma, rotulosEscala, legendaEscala, amostra, tresPartes, fatias, cascata, barras, qr, larguraTexto };
})(globalThis);
