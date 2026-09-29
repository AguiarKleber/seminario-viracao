// Apuração das enquetes de 1 a 5: histograma, resumo e o comparativo antes → depois.
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. Nada aqui toca DOM, rede ou relógio. Assim
// a mesma apuração roda no telão, no simulador e nos testes, e dá o mesmo número.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  const somar = (lista) => lista.reduce((total, x) => total + x, 0);

  // A regra do banco já recusa voto fora de 1..5, mas a apuração não depende só
  // dela: o canal-local, um estado importado de JSON ou uma regra publicada errada
  // deixariam passar "5" como texto ou 2,5. Somado, um voto desses vira NaN no
  // telão; ignorado, só deixa de contar.
  function votoValido(v) {
    return Number.isInteger(v) && v >= 1 && v <= 5;
  }

  function histograma(votos) {
    const contagem = [0, 0, 0, 0, 0];
    // O RTDB devolve null para um nó sem filhos: enquete sem nenhum voto.
    for (const v of Object.values(votos ?? {})) if (votoValido(v)) contagem[v - 1] += 1;
    return contagem;
  }

  // O histograma da contagem manual (mão levantada) chega digitado pelo
  // apresentador, sem passar por histograma(). Recusar aqui evita que um valor
  // torto vire uma porcentagem errada projetada para a turma.
  function lerHistograma(hist) {
    if (!Array.isArray(hist) || hist.length !== 5 || !hist.every((c) => Number.isInteger(c) && c >= 0)) {
      throw new TypeError('Histograma inválido: são esperadas 5 contagens inteiras e não negativas.');
    }
    return hist;
  }

  // O voto que ocupa a posição k (1 = o menor) na lista ordenada dos votos,
  // lido direto das contagens, sem remontar a lista.
  function votoNaPosicao(hist, k) {
    let acumulado = 0;
    for (let i = 0; i < 5; i += 1) {
      acumulado += hist[i];
      if (acumulado >= k) return i + 1;
    }
    return null; // k > n: resumo() nunca pede, porque só chama com 1 <= k <= n
  }

  function resumo(hist) {
    const c = lerHistograma(hist);
    const n = somar(c);
    // Sem votos, o telão diz "sem votos", nunca zero (arquitetura, seção 9). Por
    // isso as frações também viram null: um 0 aqui seria desenhado "0% concorda".
    if (n === 0) return { n, mediana: null, media: null, discorda: null, neutro: null, concorda: null };
    // Mediana com n par: a média dos dois votos centrais, que pode dar x,5. Das
    // convenções possíveis, é a única simétrica: pegar sempre o central de baixo
    // (ou o de cima) puxaria toda turma par para a discordância (ou a concordância).
    const mediana = n % 2 === 1
      ? votoNaPosicao(c, (n + 1) / 2)
      : (votoNaPosicao(c, n / 2) + votoNaPosicao(c, n / 2 + 1)) / 2;
    return {
      n,
      mediana,
      media: somar(c.map((x, i) => x * (i + 1))) / n,
      discorda: (c[0] + c[1]) / n,
      neutro: c[2] / n,
      concorda: (c[3] + c[4]) / n,
    };
  }

  function apurar(enquete, votosPorAfirmacao) {
    const histogramas = {};
    const n = {};
    // Percorre as afirmações do config, e não as chaves dos votos: afirmação sem
    // voto nenhum precisa aparecer (n = 0, "sem votos"), e voto em afirmação que
    // não existe no config não entra.
    for (const afirmacao of Object.keys(enquete.afirmacoes)) {
      const hist = histograma(votosPorAfirmacao?.[afirmacao]);
      histogramas[afirmacao] = hist;
      n[afirmacao] = somar(hist);
    }
    return { histogramas, n };
  }

  function votosValidos(votos) {
    const validos = new Map();
    for (const [uid, v] of Object.entries(votos ?? {})) if (votoValido(v)) validos.set(uid, v);
    return validos;
  }

  // Pareia por uid (o mesmo aparelho nas duas vezes). Voto inválido conta como
  // ausente, pela mesma regra do histograma: quem tem só um voto válido entra em
  // soAntes ou soDepois, e não num par.
  function transicao(votosAntes, votosDepois) {
    const antes = votosValidos(votosAntes);
    const depois = votosValidos(votosDepois);
    // matriz[antes - 1][depois - 1]: a linha é o voto de antes, a coluna o de depois.
    const matriz = [0, 1, 2, 3, 4].map(() => [0, 0, 0, 0, 0]);
    let mais = 0;
    let igual = 0;
    let menos = 0;
    for (const [uid, a] of antes) {
      const d = depois.get(uid);
      if (d === undefined) continue;
      matriz[a - 1][d - 1] += 1;
      // A escala cresce para a concordância (5 = concordo totalmente).
      if (d > a) mais += 1;
      else if (d === a) igual += 1;
      else menos += 1;
    }
    const pares = mais + igual + menos;
    return { matriz, pares, mais, igual, menos, soAntes: antes.size - pares, soDepois: depois.size - pares };
  }

  // Uma apuração sem nenhum voto (etapa aberta e fechada sem ninguém votar, ou
  // contagem manual deixada em branco) conta como lado faltando: desenhá-la como
  // distribuição vazia sugeriria uma medição que não houve.
  function temVotos(apuracao) {
    return Boolean(apuracao) && Object.values(apuracao.n ?? {}).some((x) => x > 0);
  }

  // O comparativo é uma afirmação por tela, mas a decisão vale para a enquete
  // inteira: trocar de "pareado" para "turmas diferentes" no meio da sequência
  // confundiria a sala. Por isso vale a afirmação com menos pares.
  function menorNumeroDePares(apuracaoDepois) {
    const pares = Object.keys(apuracaoDepois.n).map((a) => apuracaoDepois.transicao?.[a]?.pares);
    // Transição ausente ou torta conta como zero par: nunca libera o comparativo.
    return Math.min(...pares.map((p) => (Number.isInteger(p) && p >= 0 ? p : 0)));
  }

  function responderam(k) {
    if (k === 0) return 'ninguém respondeu';
    return k === 1 ? '1 pessoa respondeu' : `${k} pessoas responderam`;
  }

  const recusa = (caso, motivo) => ({ comparar: false, caso, motivo });

  function podeComparar(enqAntes, enqDepois, minPareados) {
    if (!Number.isInteger(minPareados) || minPareados < 0) {
      throw new TypeError('minPareados precisa ser um inteiro não negativo.');
    }
    const temAntes = temVotos(enqAntes);
    const temDepois = temVotos(enqDepois);
    if (!temAntes && !temDepois) return recusa('sem_dados', 'Nenhuma das duas medições tem votos.');
    // D-008: o "antes" é opcional e pode ter sido pulado no dia.
    if (!temAntes) return recusa('sem_antes', 'Sem medição de entrada.');
    if (!temDepois) return recusa('sem_depois', 'Sem medição de saída.');
    // Métodos nunca se misturam (arquitetura, seção 9): a mão levantada é pública
    // e não diz quem votou no celular, então pôr as duas lado a lado como antes e
    // depois compararia medições diferentes como se fossem a mesma.
    if (enqAntes.metodo !== enqDepois.metodo) {
      return recusa('metodos_diferentes',
        'Antes e depois foram contados de formas diferentes (celular e mão levantada): só as duas distribuições, lado a lado.');
    }
    // Só o celular sabe quem votou nas duas vezes. Um método desconhecido também
    // cai aqui, e nunca libera o pareamento.
    if (enqDepois.metodo !== 'celular') {
      return recusa('sem_pareamento',
        'A contagem por mão levantada não diz quem respondeu as duas vezes: só as duas distribuições, lado a lado.');
    }
    const pares = menorNumeroDePares(enqDepois);
    // Com zero par não há transição para desenhar, mesmo que o config peça 0.
    const minimo = Math.max(minPareados, 1);
    if (pares < minimo) {
      return recusa('poucos_pares', `Turmas diferentes: ${responderam(pares)} as duas vezes (o mínimo é ${minimo}).`);
    }
    return { comparar: true, caso: 'pareado', motivo: `${responderam(pares)} as duas vezes.` };
  }

  V.enquete = { histograma, resumo, apurar, transicao, podeComparar };
})(globalThis);
