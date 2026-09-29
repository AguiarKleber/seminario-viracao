// O motor do Jogo da Viração: condições, efeitos, chances das cartas, resolução
// da rodada, consolidação da decisão da equipe e o placar decomposto.
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. É genérico: nenhuma persona, carta ou valor
// mora aqui (tudo vem do config normalizado, contratos seção 1). Sem DOM, sem rede
// e sem Math.random: a sorte chega pela semente, para a apuração ser uma função
// pura e o simulador conseguir conferir o placar gravado pelo telão.
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // O placar é decomposto sempre na renda (contratos seção 3, Decomposicao).
  const INDICADOR_PLACAR = 'renda';

  // O motor também lê o conteúdo que volta do Realtime Database, e o RTDB some com
  // lista vazia e pode devolver lista como objeto { "0": …, "1": … }. Sem isto, um
  // efeitosGerais: [] gravado na sala viraria undefined e quebraria a apuração.
  function lista(x) {
    if (Array.isArray(x)) return x;
    return x && typeof x === 'object' ? Object.values(x) : [];
  }

  // Object.hasOwn, e nunca mapa[id] direto: um id "constructor" acharia o
  // construtor de Object e pareceria uma persona válida.
  function obter(mapa, id) {
    return mapa && typeof id === 'string' && Object.hasOwn(mapa, id) ? mapa[id] : undefined;
  }

  function exigir(mapa, id, oque) {
    const achado = obter(mapa, id);
    if (achado === undefined) throw new Error(`${oque} desconhecida no config: "${id}".`);
    return achado;
  }

  function ids(config, colecao) {
    const ordem = lista(config.ordem && config.ordem[colecao]);
    return ordem.length > 0 ? ordem : Object.keys(config[colecao] || {});
  }

  // Um id, ou uma lista de ids (contratos seção 1, Condicao).
  function contem(valor, id) {
    return typeof valor === 'string' ? valor === id : lista(valor).includes(id);
  }

  // historico = { [rodadaId]: { decisao, carta } }: o que a equipe decidiu e tirou
  // nas rodadas anteriores (o mesmo formato de resultados/{r}/{eq}). É o que
  // decidiu/sorteou leem (D-043).
  function contexto(config, equipeId, rodadaId, opcaoId, estado, historico) {
    const equipe = exigir(config.equipes, equipeId, 'Equipe');
    return { equipeId, personaId: equipe.persona, rodadaId, opcaoId, estado, historico: historico || {} };
  }

  // O histórico da equipe a partir dos resultados gravados, só com as rodadas
  // pedidas (as anteriores à atual, na ordem do roteiro). Rodada sem resultado
  // (pulada no dia) fica de fora, e aí decidiu/sorteou dela vale falso.
  function historicoDe(resultados, equipeId, rodadas) {
    const historico = {};
    for (const rodadaId of lista(rodadas)) {
      const res = obter(obter(resultados, rodadaId), equipeId);
      if (res) historico[rodadaId] = { decisao: res.decisao, carta: res.carta };
    }
    return historico;
  }

  // Todas as rodadas citadas precisam valer, e rodada não jogada é falso.
  function historicoVale(exigido, historico, campo) {
    for (const [rodadaId, valor] of Object.entries(exigido)) {
      const feito = obter(historico, rodadaId);
      if (!feito || !contem(valor, feito[campo])) return false;
    }
    return true;
  }

  function estadoInicial(config, equipeId) {
    const equipe = exigir(config.equipes, equipeId, 'Equipe');
    const persona = exigir(config.personas, equipe.persona, 'Persona');
    const daPersona = persona.inicial || {};
    const estado = {};
    for (const ind of ids(config, 'indicadores')) {
      estado[ind] = Object.hasOwn(daPersona, ind) ? daPersona[ind] : config.indicadores[ind].inicial;
    }
    return estado;
  }

  // Todas as chaves presentes precisam valer ao mesmo tempo. "abaixoDe" e
  // "acimaDe" são estritos: { protecao: { acimaDe: 2 } } quer dizer 3 ou mais.
  // A condição lê ctx.estado, que é o estado de ANTES da rodada: se lesse o delta
  // em andamento, mudar a ordem de duas cartas mudaria o resultado.
  function condicaoVale(config, cond, ctx) {
    if (!cond) return true;
    const personaId = ctx.personaId !== undefined ? ctx.personaId : obter(config.equipes, ctx.equipeId)?.persona;
    if (cond.opcao !== undefined && !contem(cond.opcao, ctx.opcaoId)) return false;
    if (cond.persona !== undefined && !contem(cond.persona, personaId)) return false;
    if (cond.equipe !== undefined && !contem(cond.equipe, ctx.equipeId)) return false;
    if (cond.rodada !== undefined && !contem(cond.rodada, ctx.rodadaId)) return false;
    for (const [ind, limite] of Object.entries(cond.indicador || {})) {
      const valor = ctx.estado[ind];
      if (limite.abaixoDe !== undefined && !(valor < limite.abaixoDe)) return false;
      if (limite.acimaDe !== undefined && !(valor > limite.acimaDe)) return false;
    }
    if (cond.decidiu !== undefined && !historicoVale(cond.decidiu, ctx.historico, 'decisao')) return false;
    if (cond.sorteou !== undefined && !historicoVale(cond.sorteou, ctx.historico, 'carta')) return false;
    return true;
  }

  // Só entram as cartas que podem sair: elegíveis (rodadas, somenteSe) e com peso
  // ajustado acima de 0. Uma fatia de 0% não tem o que desenhar no sorteio, e a
  // enumeração do placar não precisa de ramo impossível. Lista vazia quer dizer
  // "nenhuma carta possível", e é o validador quem impede isso de chegar à aula.
  function chances(config, { equipeId, rodadaId, opcaoId, estado, historico }) {
    const ctx = contexto(config, equipeId, rodadaId, opcaoId, estado, historico);
    const possiveis = [];
    let total = 0;
    for (const id of ids(config, 'cartas')) {
      const carta = config.cartas[id];
      if (carta.rodadas !== undefined && !contem(carta.rodadas, rodadaId)) continue;
      if (!condicaoVale(config, carta.somenteSe, ctx)) continue;
      // Ajustes na ordem do config: soma e multiplica não comutam.
      let peso = carta.peso;
      for (const ajuste of lista(carta.ajustesDePeso)) {
        if (!condicaoVale(config, ajuste.se, ctx)) continue;
        if (ajuste.soma !== undefined) peso += ajuste.soma;
        if (ajuste.multiplica !== undefined) peso *= ajuste.multiplica;
      }
      if (peso > 0) {
        possiveis.push({ carta: id, peso });
        total += peso;
      }
    }
    return possiveis.map((p) => ({ carta: p.carta, peso: p.peso, chance: p.peso / total }));
  }

  // O básico da casa é a soma dos itens (D-044). O motor soma, e não o config:
  // um total escrito à mão desencontraria dos itens na primeira edição.
  function totalBasico(persona) {
    return lista(persona && persona.basico && persona.basico.itens).reduce((s, item) => s + (Number(item && item.valor) || 0), 0);
  }

  // O tipo de um efeito na ordem do mês (esquema v2.1, contratos seção 3):
  // "gasto" (conserto, remédio, multa), "protecao" (D-059: o dinheiro que chega
  // por causa de uma proteção, como o INSS pago ao MEI ou a ajuda da
  // associação), "custoFixo" (parcela, aluguel do veículo) ou "trabalho" (o
  // resto, o único que multiplica atinge).
  function tipoDoEfeito(efeito) {
    if (efeito.categoria === 'gasto' || efeito.categoria === 'protecao') return efeito.categoria;
    return efeito.fixo === true ? 'custoFixo' : 'trabalho';
  }

  // Os efeitos do mês, em quatro passadas (esquema v2.1 e D-059):
  // 1. trabalho variável, na ordem todoMes → gerais → opção → carta: soma
  //    adiciona ao delta, e multiplica multiplica o delta daquele indicador. É
  //    a única passada em que multiplica vale, e por isso a carta que zera a
  //    renda zera o que se ganha, e não a parcela da moto: antes do v2.1 ela
  //    zerava também a parcela, e o acidentado ficava R$ 741 melhor (revisão de
  //    29/09, item 4);
  // 2. − custos fixos (efeitos com fixo, de qualquer origem);
  // 3. − gastos (efeitos com categoria "gasto", de qualquer origem): ficam fora
  //    do "entrou", que antes chegava a −R$ 2.541 porque levava o conserto e o
  //    remédio junto (revisão de 29/09, item 2);
  // 4. + proteção (efeitos com categoria "protecao", D-059): também fora do
  //    "entrou" e de qualquer multiplica. Dentro do trabalho, o INSS do MEI
  //    sumia no meio da renda (o celular dizia "Do trabalho e da decisão" de
  //    quem ficou parado), e a tela não tinha como dizer "a proteção pagou
  //    R$ X". Fica fora do piso: o piso é do trabalho, e ela não é trabalho.
  // Custo fixo, gasto e proteção só têm soma (o validador recusa multiplica).
  // A carta é o último grupo da passada 1, então o trabalho "sem a carta" é o
  // delta logo antes dela: nenhuma condição lê a carta do próprio mês, e por
  // isso isto dá o mesmo que refazer o mês sem a carta, sem aplicar duas vezes
  // (a enumeração do placar chama aplicar centenas de milhares de vezes).
  // Um efeito geral "de antes" é consequência de um mês anterior: a condição
  // lê o que a equipe decidiu ou tirou antes, ou o estado de antes do mês
  // (a multa do aluguel lê o saldo). A tela nomeia essas linhas ("a fratura
  // continua −R$ 2.233 · auxílio do INSS +R$ 2.431"): sem isso, os 25 dias da
  // fratura e o INSS sumiam dentro do "trabalho", e a conta lida na tela não
  // fechava (revisão de 29/09, 2ª rodada, achado 10). O corte que vale para
  // todos, o efeito da opção e a carta ficam de fora: a rodada, a letra e o
  // custo da carta já os dizem. O custo fixo também: já está em "custos fixos".
  // A proteção também fica de fora: a tela a diz numa linha própria ("a
  // proteção pagou R$ X"), e em "veio de antes" ela apareceria duas vezes.
  function deAntes(origem, efeito) {
    const se = efeito.se;
    const tipo = tipoDoEfeito(efeito);
    return origem === 'geral' && tipo !== 'custoFixo' && tipo !== 'protecao'
      && !!se && (se.decidiu !== undefined || se.sorteou !== undefined || se.indicador !== undefined);
  }

  function efeitosDoMes(config, ctx, grupos, delta, linhas) {
    const ind = INDICADOR_PLACAR;
    const valem = [];
    for (const [origem, efeitos, rotuloPadrao] of grupos) {
      for (const efeito of lista(efeitos)) {
        if (condicaoVale(config, efeito.se, ctx)) valem.push({ origem, efeito, rotulo: efeito.rotulo || rotuloPadrao });
      }
    }
    // Só na renda: é ela que a tela nomeia, e o placar é decomposto nela.
    const marcar = (linha, origem, efeito) => {
      if (linha.indicador === ind && deAntes(origem, efeito)) linha.deAntes = true;
      linhas.push(linha);
    };
    let trabalhoSemCarta = null;
    for (const { origem, efeito, rotulo } of valem) {
      if (tipoDoEfeito(efeito) !== 'trabalho') continue;
      if (origem === 'carta' && trabalhoSemCarta === null) trabalhoSemCarta = delta[ind];
      for (const [i, valor] of Object.entries(efeito.soma || {})) {
        delta[i] += valor;
        marcar({ origem, rotulo, indicador: i, valor }, origem, efeito);
      }
      for (const [i, fator] of Object.entries(efeito.multiplica || {})) {
        const antes = delta[i];
        // "+ 0" troca -0 por 0 (delta negativo × 0). O -0 passa despercebido na
        // tela, mas quebra a comparação exata do placar recalculado pelo simulador.
        delta[i] = antes * fator + 0;
        marcar({ origem, rotulo, indicador: i, valor: delta[i] - antes }, origem, efeito);
      }
    }
    // Piso do trabalho variável em 0 (revisão de 29/09, 2ª rodada, achados 2 e
    // 9). Os dias parados são somas a preço cheio (a fratura que continua, os
    // 3 dias da carta), e o "exausto" (× 0,9) ou o bloqueio (× 0) já tinham
    // cortado a renda antes deles: o trabalho chegava a −R$ 96, e a tela dizia
    // "renda perdida R$ 268" de uma renda de R$ 179. Não se perde mais renda do
    // que havia. A linha "piso" devolve a diferença, e as linhas continuam
    // somando o delta. Custos fixos e gastos vêm depois, fora do piso: a
    // parcela vence parado ou não.
    // Só com regras.pisoTrabalho (esquema v2.1): num config v2 o "trabalho"
    // ainda leva custos e perdas, e pode ficar negativo de propósito.
    const piso = config.regras && config.regras.pisoTrabalho === true;
    if (piso && delta[ind] < 0) {
      linhas.push({ origem: 'piso', rotulo: 'o trabalho do mês não fica abaixo de zero', indicador: ind, valor: -delta[ind] });
      delta[ind] = 0;
    }
    const trabalho = delta[ind];
    if (trabalhoSemCarta === null) trabalhoSemCarta = trabalho;
    if (piso) trabalhoSemCarta = Math.max(0, trabalhoSemCarta);
    const somados = { custoFixo: 0, gasto: 0, gastoDaCarta: 0, protecao: 0 };
    const protecaoItens = [];
    for (const tipo of ['custoFixo', 'gasto', 'protecao']) {
      for (const { origem, efeito, rotulo } of valem) {
        if (tipoDoEfeito(efeito) !== tipo) continue;
        for (const [i, valor] of Object.entries(efeito.soma || {})) {
          delta[i] += valor;
          marcar({ origem: tipo, rotulo, indicador: i, valor }, origem, efeito);
          if (i !== ind) continue;
          somados[tipo] += valor;
          if (tipo === 'gasto' && origem === 'carta') somados.gastoDaCarta += valor;
          if (tipo === 'protecao') protecaoItens.push({ rotulo, valor });
        }
      }
    }
    // Custos e gastos saem com o sinal da tela ("gastos R$ 400"): positivos
    // quando tiram dinheiro. "+ 0" troca o -0 de −(0) por 0. A proteção sai
    // como chega, positiva ("a proteção pagou R$ 900").
    return {
      trabalho, custosFixos: -somados.custoFixo + 0, gastos: -somados.gasto + 0,
      rendaPerdida: Math.max(0, trabalhoSemCarta - trabalho), gastosDaCarta: -somados.gastoDaCarta + 0,
      protecao: somados.protecao, protecaoItens,
    };
  }

  // A parte determinística da rodada (arquitetura, seção 7; D-044, D-046 e o
  // esquema v2.1):
  // - o delta de cada indicador começa em 0;
  // - (1) trabalho variável → (2) − custos fixos → (3) − gastos → (3b) +
  //   proteção (efeitosDoMes);
  // - depois, na renda: (4) + outra renda da casa, (5) − básico da casa (a soma
  //   dos itens), (6) − juros sobre a dívida que vinha de ANTES do mês. É no fim
  //   porque a conta da casa chega igual, com ou sem acidente: a carta que corta
  //   a renda pela metade corta o que se ganha, e não o aluguel;
  // - toda condição lê o estado de antes da rodada (e o histórico da equipe);
  // - no fim, depois = clamp(estado + delta, min, max).
  // O delta devolvido é o de antes do clamp; o efeito real está em "depois".
  // cartaCusto é o custo real da carta para a tela (D-052): os dias parados
  // (informativo, do config), a renda do trabalho que ela tirou e os gastos
  // que ela trouxe.
  // protecaoEvitou (D-059) é quanto o saldo do mês seria menor sem os efeitos
  // de proteção daquele mês, e é o mes.protecao: os juros do mês são cobrados
  // sobre a dívida que vinha de ANTES, e a proteção deste mês não os muda. O
  // que ela evita de juros nos meses seguintes aparece nas contas deles e no
  // piorCasoSemProtecao do placar. protecaoItens nomeia o que pagou ("auxílio
  // do INSS (45 dias)"), para a frase do celular.
  function aplicar(config, { equipeId, rodadaId, opcaoId, cartaId, estado, historico }) {
    const ctx = contexto(config, equipeId, rodadaId, opcaoId, estado, historico);
    const persona = exigir(config.personas, ctx.personaId, 'Persona');
    const rodada = exigir(config.rodadas, rodadaId, 'Rodada');
    const opcao = exigir(rodada.opcoes, opcaoId, 'Opção');
    const carta = cartaId == null ? null : exigir(config.cartas, cartaId, 'Carta');
    const indicadores = ids(config, 'indicadores');
    const delta = {};
    for (const ind of indicadores) delta[ind] = 0;
    const linhas = [];
    const grupos = [
      ['persona', persona.todoMes, persona.nome],
      ['geral', rodada.efeitosGerais, rodada.titulo],
      ['opcao', opcao.efeitos, opcao.rotulo],
      ['carta', carta ? carta.efeitos : [], carta ? carta.titulo : ''],
    ];
    const efeitos = efeitosDoMes(config, ctx, grupos, delta, linhas);
    const mes = contasDoMes(config, persona, estado, delta, linhas, efeitos);
    const cartaCusto = {
      diasParado: carta && Number.isInteger(carta.diasParado) ? carta.diasParado : 0,
      rendaPerdida: efeitos.rendaPerdida,
      gastos: efeitos.gastosDaCarta,
    };
    const depois = {};
    for (const ind of indicadores) {
      const { inicial, min, max } = config.indicadores[ind];
      const base = Object.hasOwn(estado, ind) ? estado[ind] : inicial;
      depois[ind] = Math.min(max, Math.max(min, base + delta[ind]));
    }
    // O que veio dos meses anteriores, nomeado para a tela (deAntes, acima). O
    // anfitrião grava junto do resultado: o celular não carrega o motor. O
    // gasto (a multa, o saldo do empréstimo) vai marcado: está nos "gastos" do
    // mês, e não no "entrou", e a tela o nomeia quando os gastos têm mais de
    // uma origem.
    const antes = linhas.filter((l) => l.deAntes)
      .map((l) => (l.origem === 'gasto' ? { rotulo: l.rotulo, valor: l.valor, gasto: true } : { rotulo: l.rotulo, valor: l.valor }));
    return { delta, depois, linhas, mes, cartaCusto, deAntes: antes, protecaoEvitou: mes.protecao, protecaoItens: efeitos.protecaoItens };
  }

  // Outra renda, básico e juros entram no delta da renda e nas linhas. Linha de
  // valor 0 não entra: "juros R$ 0" em todo mês sem dívida seria só ruído.
  function contasDoMes(config, persona, estado, delta, linhas, { trabalho, custosFixos, gastos, protecao }) {
    const ind = INDICADOR_PLACAR;
    const outra = persona.outraRenda && Number(persona.outraRenda.valor) > 0 ? persona.outraRenda.valor : 0;
    if (outra > 0) {
      delta[ind] += outra;
      linhas.push({ origem: 'outraRenda', rotulo: persona.outraRenda.rotulo, indicador: ind, valor: outra });
    }
    for (const item of lista(persona.basico && persona.basico.itens)) {
      if (!item || !(item.valor > 0)) continue;
      delta[ind] -= item.valor;
      linhas.push({ origem: 'basico', rotulo: item.rotulo, indicador: ind, valor: -item.valor });
    }
    // Juros sobre a dívida que vinha do mês anterior (D-046), e não sobre a do
    // fim deste mês: é o cheque especial que já estava em uso.
    const antes = estado && Object.hasOwn(estado, ind) ? estado[ind] : config.indicadores[ind].inicial;
    const dividaAntes = antes < 0 ? -antes : 0;
    const taxa = Number(config.regras && config.regras.jurosDividaMes) || 0;
    const juros = Math.round(dividaAntes * taxa);
    if (juros > 0) {
      delta[ind] -= juros;
      linhas.push({ origem: 'juros', rotulo: 'juros da dívida', indicador: ind, valor: -juros });
    }
    const basico = totalBasico(persona);
    // O "entrou" é o que o trabalho deixou (já sem os custos fixos) mais a outra
    // renda da casa; os gastos do problema e o que a proteção pagou (D-059)
    // ficam cada um numa linha própria.
    const entrou = trabalho - custosFixos + outra;
    return {
      trabalho, custosFixos, gastos, protecao, outraRenda: outra, entrou, basico, juros,
      saldoMes: entrou + protecao - gastos - basico - juros, dividaAntes,
    };
  }

  // O furo de um mês comum (tela de personas do telão; revisão de 29/09): só o
  // todoMes da persona, a outra renda e o básico, sem rodada, sem carta e sem
  // dívida. É a coluna "Falta num mês comum" do rascunho do conteúdo. Efeito do
  // todoMes com condição de rodada, opção ou histórico não vale aqui (não há
  // rodada); condição de indicador lê o estado inicial da equipe.
  function mesComum(config, equipeId) {
    const estado = estadoInicial(config, equipeId);
    const ctx = contexto(config, equipeId, null, null, estado, {});
    const persona = exigir(config.personas, ctx.personaId, 'Persona');
    const delta = {};
    for (const ind of ids(config, 'indicadores')) delta[ind] = 0;
    // A mesma ordem do mês de verdade: o custo fixo do todoMes (a parcela da
    // moto) entra num mês comum, e o multiplica não o atinge.
    const efeitos = efeitosDoMes(config, ctx, [['persona', persona.todoMes, persona.nome]], delta, []);
    return contasDoMes(config, persona, estado, delta, [], efeitos);
  }

  function resolverRodada(config, { equipeId, rodadaId, opcaoId, estado, semente, historico }) {
    const S = raiz.Viracao.sorte;
    const baralho = chances(config, { equipeId, rodadaId, opcaoId, estado, historico });
    if (baralho.length === 0) {
      throw new Error(`Nenhuma carta possível para a equipe "${equipeId}" na rodada "${rodadaId}".`);
    }
    // Semente derivada por equipe: a carta da e3 não depende de quais equipes
    // estão abertas nem da ordem de apuração (contratos seção 2).
    const aleatorio = S.gerador(S.derivar(semente, 'carta:' + equipeId));
    const carta = S.sortearPonderado(baralho.map((c) => ({ id: c.carta, peso: c.peso })), aleatorio);
    const a = aplicar(config, { equipeId, rodadaId, opcaoId, cartaId: carta, estado, historico });
    return {
      carta, chances: baralho, delta: a.delta, depois: a.depois, linhas: a.linhas, mes: a.mes, cartaCusto: a.cartaCusto,
      deAntes: a.deAntes, protecaoEvitou: a.protecaoEvitou, protecaoItens: a.protecaoItens,
    };
  }

  // Como a equipe chega à decisão (arquitetura, seção 8). A ordem dos testes é a
  // ordem de precedência: apresentador > piloto > maioria > empate.
  function consolidarDecisao(config, { rodadaId, votos, forcada, aposProrrogacao, semente, equipeId, candidatas }) {
    const rodada = exigir(config.rodadas, rodadaId, 'Rodada');
    const ordem = lista(rodada.ordemOpcoes);
    const opcoes = ordem.length > 0 ? ordem : Object.keys(rodada.opcoes || {});
    const contagem = {};
    for (const id of opcoes) contagem[id] = 0;
    // Os votos já chegam filtrados (contratos seção 3), mas um voto numa opção que
    // não existe seria contado como "maioria" de nada. Ignorar é o mais seguro.
    for (const opcaoId of Object.values(votos || {})) {
      if (typeof opcaoId === 'string' && Object.hasOwn(contagem, opcaoId)) contagem[opcaoId] += 1;
    }
    if (forcada !== undefined && forcada !== null) {
      exigir(rodada.opcoes, forcada, 'Opção forçada');
      return { decisao: forcada, origem: 'apresentador', contagem, empate: null };
    }
    const total = opcoes.reduce((s, id) => s + contagem[id], 0);
    if (total === 0) return { decisao: rodada.padrao, origem: 'piloto', contagem, empate: null };
    // Na prorrogação só as opções empatadas concorrem. Quem sai da equipe durante
    // a prorrogação (inativo removido, aluno movido) deixa o voto antigo numa
    // opção de fora; sem este corte, ela podia ganhar a moeda ou virar maioria,
    // embora ninguém pudesse votar nela na prorrogação.
    const soAsCandidatas = Array.isArray(candidatas) ? opcoes.filter((id) => candidatas.includes(id)) : [];
    const concorrentes = soAsCandidatas.length > 0 ? soAsCandidatas : opcoes;
    const maximo = Math.max(...concorrentes.map((id) => contagem[id]));
    const lideres = concorrentes.filter((id) => contagem[id] === maximo);
    if (lideres.length === 1) {
      return { decisao: lideres[0], origem: aposProrrogacao ? 'prorrogacao' : 'maioria', contagem, empate: null };
    }
    // Empate na primeira volta: ainda não há decisão, nem origem. O anfitrião abre
    // a prorrogação só para esta equipe.
    if (!aposProrrogacao) return { decisao: null, origem: null, contagem, empate: lideres };
    const S = raiz.Viracao.sorte;
    const aleatorio = S.gerador(S.derivar(semente, 'moeda:' + equipeId));
    const decisao = S.sortearPonderado(lideres.map((id) => ({ id, peso: 1 })), aleatorio);
    return { decisao, origem: 'moeda', contagem, empate: lideres };
  }

  // Esperado e pior caso da renda final, enumerando a árvore inteira de cartas.
  // Árvore, e não produto de chances independentes: a chance da carta do mês 2
  // depende do estado depois do mês 1 (condições de indicador), e o clamp faz o
  // resultado depender do caminho.
  // O histórico vai junto no caminho: a recaída do mês 3 só existe no ramo em
  // que o mês 2 tirou o acidente.
  function explorar(config, equipeId, plano, estado, k, historico) {
    if (k === plano.length) return { esperado: estado[INDICADOR_PLACAR], pior: estado[INDICADOR_PLACAR] };
    const { rodadaId, opcaoId } = plano[k];
    const baralho = chances(config, { equipeId, rodadaId, opcaoId, estado, historico });
    if (baralho.length === 0) {
      throw new Error(`Nenhuma carta possível para a equipe "${equipeId}" na rodada "${rodadaId}".`);
    }
    let esperado = 0;
    let pior = Infinity;
    for (const c of baralho) {
      const depois = aplicar(config, { equipeId, rodadaId, opcaoId, cartaId: c.carta, estado, historico }).depois;
      const ramo = explorar(config, equipeId, plano, depois, k + 1, { ...historico, [rodadaId]: { decisao: opcaoId, carta: c.carta } });
      esperado += c.chance * ramo.esperado;
      pior = Math.min(pior, ramo.pior);
    }
    return { esperado, pior };
  }

  // O plano "sem a proteção" (D-059): as mesmas decisões, com cada opção
  // marcada com protege trocada pelo padrão do mês. Devolve null quando a
  // equipe não escolheu nenhuma: aí o pior caso sem proteção é o próprio
  // piorCaso, e a enumeração não precisa ser refeita.
  function planoSemProtecao(config, plano) {
    let trocou = false;
    const sem = plano.map((p) => {
      const rodada = exigir(config.rodadas, p.rodadaId, 'Rodada');
      if (obter(rodada.opcoes, p.opcaoId)?.protege !== true || p.opcaoId === rodada.padrao) return p;
      trocou = true;
      return { rodadaId: p.rodadaId, opcaoId: rodada.padrao };
    });
    return trocou ? sem : null;
  }

  // O placar decomposto (D-009): realizado = piloto + efeitoDecisoes + sorte.
  // piorCasoSemProtecao (D-059): a proteção funciona como seguro, que perde em
  // valor esperado e ganha no pior caso. O esperado nunca mostraria o que ela
  // vale; o pior caso com e sem ela mostra.
  function decompor(config, { equipeId, rodadas }) {
    const inicial = estadoInicial(config, equipeId);
    let estado = inicial;
    const historico = {};
    for (const r of rodadas) {
      estado = aplicar(config, { equipeId, rodadaId: r.rodadaId, opcaoId: r.opcaoId, cartaId: r.cartaId, estado, historico }).depois;
      historico[r.rodadaId] = { decisao: r.opcaoId, carta: r.cartaId };
    }
    const realizado = estado[INDICADOR_PLACAR];
    const planoDecidido = rodadas.map((r) => ({ rodadaId: r.rodadaId, opcaoId: r.opcaoId }));
    const planoPiloto = rodadas.map((r) => ({
      rodadaId: r.rodadaId,
      opcaoId: exigir(config.rodadas, r.rodadaId, 'Rodada').padrao,
    }));
    const comDecisoes = explorar(config, equipeId, planoDecidido, inicial, 0, {});
    const piloto = explorar(config, equipeId, planoPiloto, inicial, 0, {});
    const semProtecao = planoSemProtecao(config, planoDecidido);
    return {
      realizado,
      esperadoComDecisoes: comDecisoes.esperado,
      esperadoPiloto: piloto.esperado,
      efeitoDecisoes: comDecisoes.esperado - piloto.esperado,
      sorte: realizado - comDecisoes.esperado,
      piorCaso: comDecisoes.pior,
      piorCasoSemProtecao: semProtecao ? explorar(config, equipeId, semProtecao, inicial, 0, {}).pior : comDecisoes.pior,
    };
  }

  V.motor = { estadoInicial, condicaoVale, chances, resolverRodada, aplicar, consolidarDecisao, decompor, historicoDe, totalBasico, mesComum };
})(globalThis);
