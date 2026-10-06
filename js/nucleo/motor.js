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

  // A renda é o caixa da família: o saldo da conta, que fica negativo quando
  // entra o cheque especial. As linhas do mês e as contas da casa são nela.
  const INDICADOR_PLACAR = 'renda';
  // O saldo devedor do empréstimo (esquema v2.2, teste real de 30/09). É uma
  // dívida à parte do cheque especial: o dinheiro emprestado entra no caixa, e
  // este indicador sobe o mesmo valor. Antes dele, os R$ 1.500 entravam como
  // renda do trabalho, e o Jonas aparecia com "dívida R$ 1" no fim do mês 2
  // devendo R$ 1.501; se o mês 3 fosse pulado, o empréstimo virava dinheiro de
  // graça no placar.
  const INDICADOR_EMPRESTIMO = 'emprestimo';
  // Esquema v3.1 (D-066: o cheque especial tem limite). Na revisão de 01/10,
  // os juros de 7,43% ao mês compunham sobre a dívida inteira, e em 12 meses a
  // Rose terminava devendo R$ 35.112 ao banco e a Daiane R$ 38.782: nenhum
  // banco dá esse crédito a essa renda. Com regras.limiteChequeEspecial, o
  // caixa nunca passa de −limite; o que passaria vira conta atrasada (dívida,
  // com multa e mora, e entra no patrimônio) e comida que não foi comprada
  // (o que faltou na mesa: custo humano, acumulado, que não é dívida).
  const INDICADOR_ATRASADAS = 'contas_atrasadas';
  const INDICADOR_MESA = 'faltou_na_mesa';
  // Revisão da F6c: o principal das contas atrasadas (o que atrasou, sem a
  // multa e a mora), a base da mora. Fica no "depois", fora dos indicadores
  // do config: é contabilidade do motor, e a tela não o mostra. Estado sem
  // ele (sala de antes, estado inicial) conta todo o atrasado como principal.
  const PRINCIPAL_ATRASADO = 'contas_atrasadas_principal';

  // Esquema v3 (D-060: 12 meses em 6 rodadas bimestrais). Acima deste número de
  // caminhos de cartas, o decompor deixa de enumerar a árvore e passa a uma
  // simulação determinística: com 6 rodadas e ~20 cartas por rodada são 64
  // milhões de caminhos, e o telão ficaria minutos parado no fechamento da
  // rodada (o comando online desiste em 10 s). Abaixo do limite, continua
  // exato; o config de 3 rodadas (1.836 caminhos) nunca chega perto.
  const LIMITE_CAMINHOS = 200000;
  // Sorteios da simulação. Com 20 mil, o erro padrão do esperado fica perto de
  // 0,7% do desvio da renda final (1/√20000), bem abaixo do R$ 1 que a tela
  // arredonda na maior parte das equipes, e a conta cabe em ~1 s no telão.
  const AMOSTRAS = 20000;

  // Quantos meses cada rodada representa (esquema v3). Ausente vale 1: o config
  // de 3 rodadas mensais continua dando exatamente as mesmas contas.
  function mesesPorRodada(config) {
    const m = config && config.regras && config.regras.mesesPorRodada;
    return Number.isInteger(m) && m >= 1 ? m : 1;
  }

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

  // O placar é o patrimônio líquido: o caixa menos o saldo devedor do
  // empréstimo. Pelo caixa, quem pegou R$ 1.500 no mês 2 e não pagou nada
  // ainda (a 1ª parcela vence no mês seguinte) ficaria R$ 1.500 mais rico. Sem
  // o indicador do empréstimo (config antigo), é a própria renda.
  // Esquema v3.1 (D-066): as contas atrasadas também contam contra (são
  // dívida com o dono da casa, a companhia de luz, o DMAE). O que faltou na
  // mesa não: é comida que não se comeu, e não dinheiro devido.
  function patrimonio(estado) {
    const saldoDevedor = Number(estado && estado[INDICADOR_EMPRESTIMO]) || 0;
    const atrasadas = Number(estado && estado[INDICADOR_ATRASADAS]) || 0;
    return estado[INDICADOR_PLACAR] - saldoDevedor - atrasadas + 0;
  }

  // O limite do cheque especial (esquema v3.1), ou null sem ele.
  function limiteDe(config) {
    const l = config && config.regras && config.regras.limiteChequeEspecial;
    return Number.isInteger(l) && l > 0 ? l : null;
  }

  // A tabela Price em reais inteiros, parcela a parcela: a parcela fixa é o
  // PMT arredondado; os juros de cada mês, o saldo × a taxa, arredondados; o
  // resto abate o saldo; a última parcela fecha o saldo. Inteiros porque o
  // resto do jogo é em reais inteiros, e a conta do mês tem de fechar
  // exatamente. A mesma tabela sai a cada chamada (a enumeração do placar
  // chama o motor centenas de milhares de vezes; daí o cache).
  const cronogramas = new Map();
  function cronograma(valor, parcelas, taxaMes) {
    const chave = `${valor}|${parcelas}|${taxaMes}`;
    const pronto = cronogramas.get(chave);
    if (pronto) return pronto;
    const fixa = Math.round((valor * taxaMes) / (1 - (1 + taxaMes) ** -parcelas));
    const tabela = [];
    let saldo = valor;
    for (let k = 1; k <= parcelas; k += 1) {
      const juros = Math.round(saldo * taxaMes);
      const amortizacao = k === parcelas ? saldo : Math.max(0, Math.min(saldo, fixa - juros));
      saldo -= amortizacao;
      tabela.push({ parcela: juros + amortizacao, juros, amortizacao, saldo });
    }
    cronogramas.set(chave, tabela);
    return tabela;
  }

  // Os empréstimos de uma opção cuja condição vale. O validador só aceita
  // empréstimo em efeito de opção e com condição que não lê estado nem
  // histórico: é isso que deixa o motor refazer, meses depois, o empréstimo
  // tomado lá atrás só com o histórico (qual opção a equipe decidiu).
  function emprestimosDaOpcao(config, opcao, ctx) {
    const achados = [];
    for (const efeito of lista(opcao && opcao.efeitos)) {
      if (!efeito || !efeito.emprestimo || !condicaoVale(config, efeito.se, ctx)) continue;
      const { valor, parcelas, taxaMes } = efeito.emprestimo;
      achados.push({ rotulo: efeito.rotulo || opcao.rotulo, valor, parcelas, taxaMes });
    }
    return achados;
  }

  // O empréstimo no mês: o que entra (tomado neste mês, pela opção) e as
  // parcelas que vencem (de empréstimos tomados em meses anteriores, lidos do
  // histórico). A parcela k é a do k-ésimo mês jogado depois do empréstimo, na
  // ordem das rodadas do config: mês pulado no dia não cobra parcela, e também
  // não mexeu no saldo devedor gravado, então as duas contas andam juntas (o
  // validador exige que todo roteiro siga a ordem do config quando há
  // empréstimo). As parcelas continuam depois do fim do jogo: restantes,
  // proxima e aPagar dizem quanto fica ("fica devendo R$ X em N parcelas").
  // Esquema v3: com mesesPorRodada m, cada rodada jogada depois do empréstimo
  // paga m parcelas da tabela (a amortização continua mês a mês, e a rodada
  // bimestral paga as duas do bimestre): a rodada k depois dele paga as
  // parcelas (k − 1)·m + 1 até k·m. A 1ª continua vencendo na rodada seguinte à
  // do empréstimo, como no jogo mês a mês. restantes, proxima e aPagar são por
  // empréstimo (emAberto), e não por parcela: somados por parcela, contariam a
  // mesma dívida duas vezes no bimestre.
  function emprestimoDoMes(config, ctx, opcao, meses = 1) {
    const entradas = emprestimosDaOpcao(config, opcao, ctx).map((e) => {
      const tabela = cronograma(e.valor, e.parcelas, e.taxaMes);
      return { ...e, restantes: e.parcelas, proxima: tabela[0].parcela, aPagar: tabela.reduce((s, p) => s + p.parcela, 0) };
    });
    const parcelas = [];
    const emAberto = [];
    const ordem = ids(config, 'rodadas');
    const atual = ordem.indexOf(ctx.rodadaId);
    for (let pos = 0; pos < atual; pos += 1) {
      const rodadaId = ordem[pos];
      const feito = obter(ctx.historico, rodadaId);
      if (!feito) continue;
      const opcaoDela = obter(obter(config.rodadas, rodadaId)?.opcoes, feito.decisao);
      const doMes = emprestimosDaOpcao(config, opcaoDela, { ...ctx, rodadaId, opcaoId: feito.decisao });
      if (doMes.length === 0) continue;
      const rodadasPagas = ordem.slice(pos + 1, atual).filter((id) => obter(ctx.historico, id)).length;
      const inicio = rodadasPagas * meses;
      for (const e of doMes) {
        const tabela = cronograma(e.valor, e.parcelas, e.taxaMes);
        let venceu = false;
        for (let j = 0; j < meses; j += 1) {
          const item = tabela[inicio + j];
          if (!item || item.parcela === 0) continue;
          venceu = true;
          parcelas.push({
            rotulo: e.rotulo, taxaMes: e.taxaMes, numero: inicio + j + 1, de: e.parcelas, parcela: item.parcela, juros: item.juros,
            amortizacao: item.amortizacao,
          });
        }
        if (!venceu) continue;
        const depois = tabela.slice(inicio + meses).filter((p) => p.parcela > 0);
        emAberto.push({
          taxaMes: e.taxaMes, restantes: depois.length, proxima: depois.length > 0 ? depois[0].parcela : 0,
          aPagar: depois.reduce((s, p) => s + p.parcela, 0),
        });
      }
    }
    const soma = (itens, campo) => itens.reduce((s, x) => s + x[campo], 0);
    const todos = [...entradas, ...emAberto];
    return {
      entradas, parcelas,
      entrada: soma(entradas, 'valor'), parcela: soma(parcelas, 'parcela'), juros: soma(parcelas, 'juros'),
      amortizacao: soma(parcelas, 'amortizacao'),
      restantes: todos.reduce((m, x) => Math.max(m, x.restantes), 0),
      proxima: soma(todos, 'proxima'), aPagar: soma(todos, 'aPagar'),
      // A taxa ao mês dos empréstimos em aberto, para a tela dizer "empréstimo a
      // 6,39% ao mês" (revisão de 30/09, achado 17: só a taxa do cheque especial
      // aparecia). Com dois empréstimos de taxas diferentes, null: uma taxa só
      // seria mentira.
      taxaMes: todos.length > 0 && todos.every((x) => x.taxaMes === todos[0].taxaMes) ? todos[0].taxaMes : null,
    };
  }

  const SEM_EMPRESTIMO = { entradas: [], parcelas: [], entrada: 0, parcela: 0, juros: 0, amortizacao: 0, restantes: 0, proxima: 0, aPagar: 0, taxaMes: null };

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

  // vezes (esquema v3): quantas vezes a soma do grupo conta na rodada. O
  // todoMes é por mês e conta mesesPorRodada vezes; os efeitos gerais, da opção
  // e da carta são por evento e contam uma vez. O multiplica não se repete: ele
  // age sobre o delta já acumulado (o "exausto" tira 10% do bimestre inteiro, e
  // não 19%).
  function efeitosDoMes(config, ctx, grupos, delta, linhas) {
    const ind = INDICADOR_PLACAR;
    const valem = [];
    for (const [origem, efeitos, rotuloPadrao, vezes = 1] of grupos) {
      for (const efeito of lista(efeitos)) {
        // O empréstimo não é soma nem multiplica: é dívida, e entra à parte
        // (emprestimoDoMes), fora do trabalho, do piso e de qualquer multiplica.
        if (efeito.emprestimo) continue;
        if (condicaoVale(config, efeito.se, ctx)) valem.push({ origem, efeito, rotulo: efeito.rotulo || rotuloPadrao, vezes });
      }
    }
    // Só na renda: é ela que a tela nomeia, e o placar é decomposto nela.
    const marcar = (linha, origem, efeito) => {
      if (linha.indicador === ind && deAntes(origem, efeito)) linha.deAntes = true;
      linhas.push(linha);
    };
    let trabalhoSemCarta = null;
    for (const { origem, efeito, rotulo, vezes } of valem) {
      if (tipoDoEfeito(efeito) !== 'trabalho') continue;
      if (origem === 'carta' && trabalhoSemCarta === null) trabalhoSemCarta = delta[ind];
      for (const [i, bruto] of Object.entries(efeito.soma || {})) {
        const valor = bruto * vezes;
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
      for (const { origem, efeito, rotulo, vezes } of valem) {
        if (tipoDoEfeito(efeito) !== tipo) continue;
        for (const [i, bruto] of Object.entries(efeito.soma || {})) {
          const valor = bruto * vezes;
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
  // de proteção daquele mês. Sem o limite do cheque especial, é o mes.protecao:
  // os juros do mês são cobrados sobre a dívida que vinha de ANTES, e a
  // proteção deste mês não os muda (com o limite, ver o cálculo abaixo). O
  // que ela evita de juros nos meses seguintes aparece nas contas deles e no
  // piorCasoSemProtecao do placar. protecaoItens nomeia o que pagou ("auxílio
  // do INSS (45 dias)"), para a frase do celular.
  // O empréstimo (esquema v2.2) entra depois de tudo, nas contas da casa
  // (contasDoMes): o dinheiro emprestado no caixa e no saldo devedor, a
  // parcela saindo do caixa e abatendo o saldo devedor.
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
    // Esquema v3: o todoMes conta mesesPorRodada vezes; o resto é por evento.
    const meses = mesesPorRodada(config);
    const grupos = [
      ['persona', persona.todoMes, persona.nome, meses],
      ['geral', rodada.efeitosGerais, rodada.titulo],
      ['opcao', opcao.efeitos, opcao.rotulo],
      ['carta', carta ? carta.efeitos : [], carta ? carta.titulo : ''],
    ];
    const efeitos = efeitosDoMes(config, ctx, grupos, delta, linhas);
    const emp = emprestimoDoMes(config, ctx, opcao, meses);
    const limite = limiteDe(config);
    // A conta sem a proteção (revisão da F6c) precisa do delta de antes das
    // contas da casa. Só quando há proteção e limite: é raro, e a enumeração
    // do placar chama o aplicar centenas de milhares de vezes.
    const refazerSemProtecao = limite !== null && efeitos.protecao > 0;
    const deltaSemProtecao = refazerSemProtecao ? { ...delta, [INDICADOR_PLACAR]: delta[INDICADOR_PLACAR] - efeitos.protecao } : null;
    const mes = contasDoMes(config, persona, estado, delta, linhas, efeitos, emp, meses);
    // protecaoEvitou (D-059): quanto o saldo do mês seria menor sem a
    // proteção. Sem o limite, é o pago (os juros do mês são sobre a dívida de
    // antes). Com o limite (revisão da F6c), não: sem ela, parte da falta vira
    // comida cortada (que não sai do saldo) e a multa do atraso entra nele. Na
    // Daiane depois da fratura com MEI, o INSS pagou R$ 2.431, e o saldo sem
    // ele seria só R$ 826 menor, com R$ 1.659 de comida a menos na mesa; a
    // frase dizia "teria faltado R$ 2.431 a mais". A conta é refeita sem os
    // efeitos de proteção (o mesmo estado, o mesmo empréstimo), e a comida que
    // ela evitou cortar vai em protecaoEvitouMesa, só quando há.
    let protecaoEvitou = mes.protecao;
    let protecaoEvitouMesa = 0;
    if (refazerSemProtecao) {
      const sem = contasDoMes(config, persona, estado, deltaSemProtecao, [], { ...efeitos, protecao: 0 }, emp, meses);
      protecaoEvitou = Math.round(mes.saldoMes - sem.saldoMes) + 0;
      protecaoEvitouMesa = Math.round(sem.faltouNaMesa - mes.faltouNaMesa) + 0;
    }
    const cartaCusto = {
      diasParado: carta && Number.isInteger(carta.diasParado) ? carta.diasParado : 0,
      rendaPerdida: efeitos.rendaPerdida,
      gastos: efeitos.gastosDaCarta,
    };
    const depois = {};
    // D-066: com o limite, o caixa para em −limite exato. O corte já leva a
    // conta até lá, mas com a renda fracionária (o exausto × 0,9) a soma em
    // ponto flutuante parava em −1500,0000000002, e a dívida no banco
    // "passava" do limite.
    for (const ind of indicadores) {
      const { inicial, min, max } = config.indicadores[ind];
      const base = Object.hasOwn(estado, ind) ? estado[ind] : inicial;
      const piso = ind === INDICADOR_PLACAR && limite !== null ? Math.max(min, -limite) : min;
      depois[ind] = Math.min(max, Math.max(piso, base + delta[ind]));
    }
    // O principal das contas atrasadas segue para a próxima rodada no
    // "depois" (é o estado de antes dela), nunca acima do atrasado.
    if (Object.hasOwn(mes, 'contasAtrasadasPrincipal') && Object.hasOwn(depois, INDICADOR_ATRASADAS)) {
      depois[PRINCIPAL_ATRASADO] = Math.max(0, Math.min(depois[INDICADOR_ATRASADAS], mes.contasAtrasadasPrincipal));
    }
    // O que veio dos meses anteriores, nomeado para a tela (deAntes, acima). O
    // anfitrião grava junto do resultado: o celular não carrega o motor. O
    // gasto (a multa do aluguel atrasado) vai marcado: está nos "gastos" do
    // mês, e não no "entrou", e a tela o nomeia quando os gastos têm mais de
    // uma origem.
    const antes = linhas.filter((l) => l.deAntes)
      .map((l) => (l.origem === 'gasto' ? { rotulo: l.rotulo, valor: l.valor, gasto: true } : { rotulo: l.rotulo, valor: l.valor }));
    return {
      delta, depois, linhas, mes, cartaCusto, deAntes: antes, protecaoEvitou, protecaoItens: efeitos.protecaoItens,
      ...(protecaoEvitouMesa > 0 ? { protecaoEvitouMesa } : {}),
    };
  }

  // Outra renda, básico, juros e o empréstimo entram no delta da renda e nas
  // linhas. Linha de valor 0 não entra: "juros R$ 0" em todo mês sem dívida
  // seria só ruído.
  // O empréstimo (esquema v2.2) é dívida, e não renda:
  // - o que entra vai para o caixa (alivia o cheque especial do mês) e sobe o
  //   saldo devedor o mesmo valor. Fica fora do "entrou" e do saldoMes: o
  //   Jonas do teste de 30/09 aparecia com "entrou R$ 4.797" e "sobrou R$ 466"
  //   num mês que, sem os R$ 1.500 emprestados, faltou R$ 1.034;
  // - a parcela sai inteira do caixa. Os juros dela entram em "juros" (é o
  //   preço da dívida, como os do cheque especial); a amortização abate o
  //   saldo devedor e fica fora do saldoMes, porque só troca uma dívida por
  //   outra (sai do caixa, sai da dívida).
  // Assim o saldoMes é a variação do patrimônio (caixa − saldo devedor), a
  // conta lida na tela continua fechando (entrou + proteção − gastos − básico
  // − juros = saldoMes), e "dívida antes + faltou = dívida depois", somando o
  // cheque especial e o empréstimo. O caixa anda saldoMes + emprestimo −
  // amortizacao.
  // Esquema v3: numa rodada de m meses, a outra renda e o básico da casa contam
  // m vezes, e os juros do cheque especial compõem m meses sobre a dívida de
  // antes da rodada ((1 + j)^m − 1): no bimestre, R$ 1.000 de dívida a 7,43%
  // custam R$ 154, e não R$ 149 (juros simples) nem R$ 74 (um mês só). Com m = 1
  // a taxa é a própria jurosDividaMes, sem passar pela potência: (1 + j) − 1 em
  // ponto flutuante não é exatamente j, e o arredondamento de um caso de meio
  // real mudaria o placar de um config que não mudou.
  function contasDoMes(config, persona, estado, delta, linhas, { trabalho, custosFixos, gastos, protecao }, emp = SEM_EMPRESTIMO, meses = 1, comLimite = true) {
    const ind = INDICADOR_PLACAR;
    for (const e of emp.entradas) {
      delta[ind] += e.valor;
      linhas.push({ origem: 'emprestimo', rotulo: e.rotulo, indicador: ind, valor: e.valor });
      if (Object.hasOwn(delta, INDICADOR_EMPRESTIMO)) {
        delta[INDICADOR_EMPRESTIMO] += e.valor;
        linhas.push({ origem: 'emprestimo', rotulo: e.rotulo, indicador: INDICADOR_EMPRESTIMO, valor: e.valor });
      }
    }
    const outra = persona.outraRenda && Number(persona.outraRenda.valor) > 0 ? persona.outraRenda.valor * meses : 0;
    if (outra > 0) {
      delta[ind] += outra;
      linhas.push({ origem: 'outraRenda', rotulo: persona.outraRenda.rotulo, indicador: ind, valor: outra });
    }
    for (const item of lista(persona.basico && persona.basico.itens)) {
      if (!item || !(item.valor > 0)) continue;
      delta[ind] -= item.valor * meses;
      linhas.push({ origem: 'basico', rotulo: item.rotulo, indicador: ind, valor: -item.valor * meses });
    }
    // Juros sobre a dívida que vinha do mês anterior (D-046), e não sobre a do
    // fim deste mês: é o cheque especial que já estava em uso.
    const antes = estado && Object.hasOwn(estado, ind) ? estado[ind] : config.indicadores[ind].inicial;
    // Com o limite (D-066), os juros só incidem até ele: o caixa nunca fica
    // abaixo de −limite, e o min é só a trava de um estado que viesse de fora.
    const limite = comLimite ? limiteDe(config) : null;
    const dividaAntes = antes < 0 ? (limite === null ? -antes : Math.min(-antes, limite)) : 0;
    const taxaMes = Number(config.regras && config.regras.jurosDividaMes) || 0;
    const taxa = meses === 1 ? taxaMes : (1 + taxaMes) ** meses - 1;
    const jurosCheque = Math.round(dividaAntes * taxa);
    if (jurosCheque > 0) {
      delta[ind] -= jurosCheque;
      linhas.push({ origem: 'juros', rotulo: 'juros da dívida', indicador: ind, valor: -jurosCheque });
    }
    for (const p of emp.parcelas) {
      const nome = `parcela ${p.numero} de ${p.de} do ${p.rotulo}`;
      if (p.juros > 0) {
        delta[ind] -= p.juros;
        linhas.push({ origem: 'juros', rotulo: `juros da ${nome}`, indicador: ind, valor: -p.juros });
      }
      if (p.amortizacao > 0) {
        delta[ind] -= p.amortizacao;
        linhas.push({ origem: 'amortizacao', rotulo: `${nome}, a parte que abate a dívida`, indicador: ind, valor: -p.amortizacao });
        if (Object.hasOwn(delta, INDICADOR_EMPRESTIMO)) {
          delta[INDICADOR_EMPRESTIMO] -= p.amortizacao;
          linhas.push({ origem: 'amortizacao', rotulo: `${nome}, a parte que abate a dívida`, indicador: INDICADOR_EMPRESTIMO, valor: -p.amortizacao });
        }
      }
    }
    const juros = jurosCheque + emp.juros;
    const devedorAntes = estado && Object.hasOwn(estado, INDICADOR_EMPRESTIMO) ? Number(estado[INDICADOR_EMPRESTIMO]) || 0 : 0;
    const basico = totalBasico(persona) * meses;
    // O "entrou" é o que o trabalho deixou (já sem os custos fixos) mais a outra
    // renda da casa; os gastos do problema e o que a proteção pagou (D-059)
    // ficam cada um numa linha própria.
    const entrou = trabalho - custosFixos + outra;
    // D-066: o limite do cheque especial, depois de tudo (é o fim do mês que
    // passaria dele). Sem o limite, nada muda.
    const corte = limite === null ? null : cortarNoLimite(config, persona, estado, antes, delta, linhas, limite, meses);
    // juros é o total (cheque especial + os juros da parcela); jurosEmprestimo,
    // a parte do empréstimo. dividaAntes continua sendo o cheque especial de
    // antes (a base dos juros dele); saldoDevedor é o do empréstimo no fim do
    // mês, e dividaTotal (cheque especial + empréstimo) é o que a tela chama de
    // "dívida" (historia.dividaTotal, a partir do "depois").
    const saldoSemLimite = entrou + protecao - gastos - basico - juros;
    return {
      trabalho, custosFixos, gastos, protecao, outraRenda: outra, entrou, basico, juros,
      // Com o limite, a comida que não foi comprada e o que a casa ficou sem
      // (os itens semAtraso) não saíram do caixa (somam), e a multa e a mora
      // entram na dívida (subtraem): saldoMes continua sendo a variação do
      // patrimônio.
      saldoMes: corte === null ? saldoSemLimite : saldoSemLimite + corte.faltouNaMesa + (corte.ficouSem || 0) - corte.multa - corte.mora, dividaAntes,
      emprestimo: emp.entrada, parcela: emp.parcela, jurosEmprestimo: emp.juros, amortizacao: emp.amortizacao,
      saldoDevedor: devedorAntes + emp.entrada - emp.amortizacao, parcelasRestantes: emp.restantes,
      proximaParcela: emp.proxima, aPagar: emp.aPagar,
      // Só com empréstimo em aberto: o RTDB apaga o campo null, e o mês lido do
      // banco tem de ser igual ao do motor.
      ...(emp.taxaMes === null ? {} : { taxaEmprestimo: emp.taxaMes }),
      // Só com o limite (esquema v3.1): num config sem ele, o mês fica igual
      // ao de antes, campo a campo (o simulador compara o gravado com o motor).
      ...(corte === null ? {} : corte),
    };
  }

  // A soma dos itens do básico marcados como comida (D-066): o único gasto da
  // casa que se pode deixar de fazer sem virar dívida.
  function comidaDoBasico(persona) {
    return lista(persona && persona.basico && persona.basico.itens)
      .reduce((s, item) => s + (item && item.comida === true ? Number(item.valor) || 0 : 0), 0);
  }

  // A soma dos itens do básico que não atrasam (revisão da F6c): gás, ônibus e
  // remédio não têm multa nem mora, "quem não paga fica sem" (a fonte do
  // atraso no config). Antes, entravam nas contas atrasadas, pagavam a multa e
  // a mora, e um dia eram "pagos": ninguém fica devendo passagem de ônibus.
  function semAtrasoDoBasico(persona) {
    return lista(persona && persona.basico && persona.basico.itens)
      .reduce((s, item) => s + (item && item.semAtraso === true ? Number(item.valor) || 0 : 0), 0);
  }

  // Esquema v3.1 (D-066), no fim do mês, depois do empréstimo:
  // (8) mora: o principal atrasado de antes da rodada (o que atrasou, sem a
  //     multa e a mora já lançadas) paga moraMes ao mês, juros simples
  //     (round(principal × moraMes × m)): é como a lei e as concessionárias
  //     cobram (1% ao mês sobre o débito), e não compõe como o banco. Antes
  //     (revisão da F6c), a base era o atrasado inteiro, e a mora incidia
  //     sobre a multa e sobre a mora de antes, contra a própria fonte;
  // (9) quitar o atrasado: se o caixa do fim do mês está acima de −limite, a
  //     folga até o limite paga as contas atrasadas (com a mora). A casa usa o
  //     cheque especial para não ter a luz cortada nem ser despejada: é para
  //     isso que ele existe, e é o que deixa o atrasado diminuir num mês bom.
  //     O pagamento abate primeiro a multa e a mora, depois o principal
  //     (Código Civil, art. 354: havendo capital e juros, o pagamento
  //     imputa-se primeiro nos juros);
  // (10) o corte: se o caixa ficaria abaixo de −limite, o excedente não vira
  //     dívida no banco (o banco corta o crédito). Ele se divide entre:
  //     - contas atrasadas: as contas do período que podem atrasar (o básico
  //       menos a comida e menos os itens semAtraso: aluguel, luz, água) e o
  //       que passar do básico (um conserto que não se pagou);
  //     - "ficou sem" (revisão da F6c): os itens semAtraso do período (gás,
  //       ônibus, remédio), que não se pagam depois: quem não paga fica sem.
  //       Não viram dívida nem pagam multa. Só faltam quando já não há o que
  //       atrasar: a casa atrasa o que pode atrasar antes de ficar sem o
  //       ônibus do trabalho (a validar, como o cortarPrimeiro);
  //     - "faltou na mesa": a comida do básico do período que não foi
  //       comprada, no máximo o item de comida × m.
  //     regras.cortarPrimeiro decide a ordem: "contas" atrasa primeiro as
  //     contas, depois fica sem os itens semAtraso, e só corta a comida do que
  //     passar deles; "comida" corta primeiro a comida, depois atrasa as
  //     contas e depois fica sem os itens semAtraso;
  // (11) multa: o que atrasou neste período paga multaAtraso uma vez só.
  // A multa e a mora entram nas contas atrasadas, e não no caixa: no caixa,
  // elas poderiam passar do limite de novo, e a conta não fecharia.
  // Linhas (as de cada indicador somam o delta dele): "mora" e "multa" (só nas
  // contas atrasadas), "contasPagas" (− caixa, − atrasadas), "atraso" (+ caixa,
  // + atrasadas: o básico já tinha saído inteiro do caixa), "ficouSem" (+
  // caixa) e "faltouNaMesa" (+ caixa, + faltou na mesa).
  // O mês leva contasAtrasadasPrincipal (o principal no fim), que o aplicar
  // guarda no "depois"; ficouSem, só quando a persona tem item semAtraso (o
  // mês de um config sem a marca fica igual ao de antes, campo a campo).
  function cortarNoLimite(config, persona, estado, antes, delta, linhas, limite, meses) {
    const ind = INDICADOR_PLACAR;
    const g = config.regras;
    const ler = (id) => (estado && Object.hasOwn(estado, id) ? Number(estado[id]) || 0 : 0);
    const mexer = (id, valor, origem, rotulo) => {
      if (valor === 0) return;
      if (Object.hasOwn(delta, id)) delta[id] += valor;
      linhas.push({ origem, rotulo, indicador: id, valor });
    };
    const atrasadasAntes = ler(INDICADOR_ATRASADAS);
    const mesaAntes = ler(INDICADOR_MESA);
    const principalAntes = estado && Object.hasOwn(estado, PRINCIPAL_ATRASADO)
      ? Math.min(atrasadasAntes, Math.max(0, Number(estado[PRINCIPAL_ATRASADO]) || 0))
      : atrasadasAntes;
    const mora = Math.round(principalAntes * (Number(g.moraMes) || 0) * meses);
    mexer(INDICADOR_ATRASADAS, mora, 'mora', 'juros de mora das contas atrasadas');
    let caixa = antes + delta[ind];
    const contasPagas = Math.max(0, Math.min(atrasadasAntes + mora, caixa + limite));
    caixa -= contasPagas;
    mexer(ind, -contasPagas, 'contasPagas', 'contas atrasadas pagas');
    mexer(INDICADOR_ATRASADAS, -contasPagas, 'contasPagas', 'contas atrasadas pagas');
    const encargosAntes = atrasadasAntes - principalAntes + mora;
    const principalPago = Math.max(0, contasPagas - encargosAntes);
    const excedente = caixa < -limite ? -limite - caixa : 0;
    const comida = comidaDoBasico(persona) * meses;
    const naoAtrasa = semAtrasoDoBasico(persona) * meses;
    const contasDoPeriodo = Math.max(0, totalBasico(persona) * meses - comida - naoAtrasa);
    let resto = excedente;
    const tirar = (teto) => {
      const v = Math.min(resto, teto);
      resto -= v;
      return v;
    };
    let faltouNaMesa = 0;
    let ficouSem = 0;
    if (g.cortarPrimeiro === 'comida') {
      faltouNaMesa = tirar(comida);
      tirar(contasDoPeriodo);
      ficouSem = tirar(naoAtrasa);
    } else {
      tirar(contasDoPeriodo);
      ficouSem = tirar(naoAtrasa);
      faltouNaMesa = tirar(comida);
    }
    const atrasou = excedente - faltouNaMesa - ficouSem;
    mexer(ind, faltouNaMesa, 'faltouNaMesa', 'comida que não deu para comprar');
    mexer(INDICADOR_MESA, faltouNaMesa, 'faltouNaMesa', 'comida que não deu para comprar');
    mexer(ind, ficouSem, 'ficouSem', 'o que não se paga depois e a casa ficou sem');
    mexer(ind, atrasou, 'atraso', 'contas que ficaram sem pagar');
    mexer(INDICADOR_ATRASADAS, atrasou, 'atraso', 'contas que ficaram sem pagar');
    const multa = Math.round(atrasou * (Number(g.multaAtraso) || 0));
    mexer(INDICADOR_ATRASADAS, multa, 'multa', 'multa das contas atrasadas');
    const contasAtrasadas = atrasadasAntes + mora - contasPagas + atrasou + multa;
    // −limite exato quando cortou (o mesmo piso do "depois", em aplicar).
    const caixaFinal = excedente > 0 ? -limite : caixa;
    return {
      dividaBanco: caixaFinal < 0 ? -caixaFinal : 0,
      contasAtrasadasAntes: atrasadasAntes, mora, contasPagas, atrasou, multa, contasAtrasadas,
      contasAtrasadasPrincipal: principalAntes - principalPago + atrasou,
      faltouNaMesa, faltouNaMesaAcumulado: mesaAntes + faltouNaMesa,
      ...(naoAtrasa > 0 ? { ficouSem } : {}),
    };
  }

  // O furo de um mês comum (tela de personas do telão; revisão de 29/09): só o
  // todoMes da persona, a outra renda e o básico, sem rodada, sem carta e sem
  // dívida. É a coluna "Falta num mês comum" do rascunho do conteúdo. Efeito do
  // todoMes com condição de rodada, opção ou histórico não vale aqui (não há
  // rodada); condição de indicador lê o estado inicial da equipe.
  // É sempre UM mês, mesmo com rodadas bimestrais (esquema v3): a tela de
  // personas diz "a conta do mês não fecha", que é o que a turma compara com
  // o próprio salário; o bimestre aparece nas contas de cada rodada.
  function mesComum(config, equipeId) {
    const estado = estadoInicial(config, equipeId);
    const ctx = contexto(config, equipeId, null, null, estado, {});
    const persona = exigir(config.personas, ctx.personaId, 'Persona');
    const delta = {};
    for (const ind of ids(config, 'indicadores')) delta[ind] = 0;
    // A mesma ordem do mês de verdade: o custo fixo do todoMes (a parcela da
    // moto) entra num mês comum, e o multiplica não o atinge.
    const efeitos = efeitosDoMes(config, ctx, [['persona', persona.todoMes, persona.nome]], delta, []);
    // Sem o limite do cheque especial (D-066): é o furo de um mês, sem dívida,
    // e a coluna "Falta num mês comum" mostra quanto falta, e não o corte.
    return contasDoMes(config, persona, estado, delta, [], efeitos, SEM_EMPRESTIMO, 1, false);
  }

  // D-067: o trabalho de um período comum da persona (a rodada inteira, com
  // mesesPorRodada), o que o trabalho deixa depois dos custos fixos, sem a
  // outra renda da casa: (trabalho − custos fixos) do mesComum × m.
  function trabalhoComum(config, equipeId) {
    const m = mesComum(config, equipeId);
    return (m.trabalho - m.custosFixos) * mesesPorRodada(config);
  }

  // D-067 (revisão de 01/10, achado 2): o auxílio do INSS do MEI é de um
  // salário mínimo, fixo pela lei, e a perda da fratura é proporcional à
  // renda. Para a Bruna e a Daiane, o que a proteção paga num período passa do
  // que elas ganhavam trabalhando num período comum, e a sala pode ler "o
  // acidente compensa". A tela tem de dizer por quê (historia.fraseAcimaDoTrabalho).
  // Devolve { pagou, trabalhoComum } quando a proteção do mês (mes.protecao)
  // passa do trabalho de um período comum; null quando não passa ou quando
  // ela não pagou nada.
  function protecaoAcimaDoTrabalho(config, equipeId, mes) {
    const pagou = Number(mes && mes.protecao) || 0;
    if (!(pagou > 0)) return null;
    const trabalho = trabalhoComum(config, equipeId);
    return pagou > trabalho ? { pagou, trabalhoComum: trabalho } : null;
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
    // D-067: só aqui, e não no aplicar: a enumeração do placar chama o aplicar
    // centenas de milhares de vezes, e a tela só precisa disto da carta que
    // saiu. Só quando acontece (o anfitrião grava só então).
    const acima = protecaoAcimaDoTrabalho(config, equipeId, a.mes);
    return {
      carta, chances: baralho, delta: a.delta, depois: a.depois, linhas: a.linhas, mes: a.mes, cartaCusto: a.cartaCusto,
      deAntes: a.deAntes, protecaoEvitou: a.protecaoEvitou, protecaoItens: a.protecaoItens,
      ...(a.protecaoEvitouMesa > 0 ? { protecaoEvitouMesa: a.protecaoEvitouMesa } : {}),
      ...(acima ? { protecaoAcimaDoTrabalho: acima } : {}),
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

  // Esperado e pior caso do patrimônio final (caixa − saldo devedor do
  // empréstimo), enumerando a árvore inteira de cartas.
  // Árvore, e não produto de chances independentes: a chance da carta do mês 2
  // depende do estado depois do mês 1 (condições de indicador), e o clamp faz o
  // resultado depender do caminho.
  // O histórico vai junto no caminho: a recaída do mês 3 só existe no ramo em
  // que o mês 2 tirou o acidente.
  function explorar(config, equipeId, plano, estado, k, historico) {
    if (k === plano.length) {
      const final = patrimonio(estado);
      return { esperado: final, pior: final };
    }
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

  // O placar decomposto (D-009): realizado = piloto + efeitoDecisoes + sorte,
  // todos no patrimônio (esquema v2.2): o empréstimo que ainda não foi pago
  // conta contra, mesmo que a sessão acabe antes da 1ª parcela.
  // piorCasoSemProtecao (D-059): a proteção funciona como seguro, que perde em
  // valor esperado e ganha no pior caso. O esperado nunca mostraria o que ela
  // vale; o pior caso com e sem ela mostra.
  // Uma condição "fixa" só lê o que não muda com o jogo (a equipe, a persona,
  // a rodada, a opção): vale igual em qualquer estado e com qualquer histórico.
  const CHAVES_FIXAS = new Set(['opcao', 'persona', 'equipe', 'rodada']);
  function condicaoFixa(cond) {
    return !cond || Object.keys(cond).every((k) => CHAVES_FIXAS.has(k));
  }

  // Quantas cartas PODEM sair para a equipe na rodada, sem olhar o estado: a
  // carta fica de fora só quando as rodadas dela não incluem esta, quando a
  // parte fixa do somenteSe (persona, equipe, rodada) não vale, ou quando o
  // peso é 0 sem nenhum ajuste que o suba. É um teto (a parte que lê o estado
  // e o histórico conta como "pode"), e não depende da opção: assim o exato ou
  // o estimado é o mesmo para as três contas do decompor.
  function cartasPossiveisNaRodada(config, equipeId, rodadaId) {
    const personaId = exigir(config.equipes, equipeId, 'Equipe').persona;
    let n = 0;
    for (const id of ids(config, 'cartas')) {
      const carta = config.cartas[id];
      if (carta.rodadas !== undefined && !contem(carta.rodadas, rodadaId)) continue;
      const se = carta.somenteSe;
      if (se) {
        const fixa = {};
        for (const k of ['persona', 'equipe', 'rodada']) if (se[k] !== undefined) fixa[k] = se[k];
        if (!condicaoVale(config, fixa, { equipeId, personaId, rodadaId, estado: {}, historico: {} })) continue;
      }
      if (!(carta.peso > 0) && !lista(carta.ajustesDePeso).some((a) => a.soma > 0)) continue;
      n += 1;
    }
    return n;
  }

  // O número de caminhos de cartas das rodadas (o produto do teto de cada uma).
  // Para em Infinity quando passa do inteiro seguro: só importa se passa do
  // limite.
  function caminhosDeCartas(config, equipeId, rodadaIds) {
    let total = 1;
    for (const rodadaId of lista(rodadaIds)) {
      total *= cartasPossiveisNaRodada(config, equipeId, rodadaId);
      if (total > Number.MAX_SAFE_INTEGER) return Infinity;
    }
    return total;
  }

  // A semente da simulação: do hash do config (o mesmo do telão e do pendrive,
  // validarConfig.hash), da equipe e das rodadas jogadas. O telão, o simulador
  // e os testes chegam ao MESMO número: é isso que deixa o simulador conferir o
  // placar gravado e o teste repetir a conta. As três contas do decompor (com
  // as decisões, o piloto e o sem proteção) usam a mesma semente de propósito
  // (números aleatórios comuns): a diferença entre elas, o "efeito das
  // decisões", sai com bem menos ruído do que com sorteios independentes.
  function sementeDoDecompor(config, equipeId, rodadaIds) {
    const VC = raiz.Viracao.validarConfig;
    if (!VC) throw new Error('decompor estimado precisa do validar-config.js carregado (o hash do config é a semente).');
    const base = parseInt(VC.hash(config), 16) >>> 0;
    return raiz.Viracao.sorte.derivar(base, `decompor:${equipeId}:${lista(rodadaIds).join(',')}`);
  }

  // A simulação determinística (esquema v3): AMOSTRAS caminhos sorteados pelas
  // chances, rodada a rodada, todos do mesmo gerador, na mesma ordem. Os
  // caminhos que coincidem até uma rodada compartilham o nó da árvore (o
  // estado e o baralho ficam guardados nele): as três primeiras rodadas têm
  // no máximo algumas milhares de variações, e o motor só refaz o mês de um nó
  // novo. Devolve o esperado (a média) e o menor patrimônio achado.
  function simular(config, equipeId, plano, inicial, semente) {
    const S = raiz.Viracao.sorte;
    const aleatorio = S.gerador(semente);
    const raizDaArvore = { estado: inicial, historico: {}, itens: null, filhos: null };
    let nivel = new Array(AMOSTRAS).fill(raizDaArvore);
    for (const { rodadaId, opcaoId } of plano) {
      const seguinte = new Array(nivel.length);
      for (let i = 0; i < nivel.length; i += 1) {
        const no = nivel[i];
        if (!no.itens) {
          const baralho = chances(config, { equipeId, rodadaId, opcaoId, estado: no.estado, historico: no.historico });
          if (baralho.length === 0) throw new Error(`Nenhuma carta possível para a equipe "${equipeId}" na rodada "${rodadaId}".`);
          no.itens = baralho.map((c) => ({ id: c.carta, peso: c.peso }));
          no.filhos = new Map();
        }
        const carta = S.sortearPonderado(no.itens, aleatorio);
        let filho = no.filhos.get(carta);
        if (!filho) {
          const depois = aplicar(config, { equipeId, rodadaId, opcaoId, cartaId: carta, estado: no.estado, historico: no.historico }).depois;
          filho = { estado: depois, historico: { ...no.historico, [rodadaId]: { decisao: opcaoId, carta } }, itens: null, filhos: null };
          no.filhos.set(carta, filho);
        }
        seguinte[i] = filho;
      }
      nivel = seguinte;
    }
    let soma = 0;
    let pior = Infinity;
    for (const no of nivel) {
      const v = patrimonio(no.estado);
      soma += v;
      if (v < pior) pior = v;
    }
    return { esperado: soma / nivel.length, pior };
  }

  // A busca dirigida do pior caso estimado: em cada rodada, a carta que deixa
  // o menor patrimônio logo depois dela (o efeito imediato; empate fica com a
  // primeira na ordem do config). A simulação sozinha quase nunca acha o pior
  // de verdade (dois acidentes seguidos saem em 1 de 10 mil partidas), e o
  // pior caso é justamente o que mostra o valor da proteção (D-059).
  function piorDirigido(config, equipeId, plano, inicial) {
    let estado = inicial;
    let historico = {};
    for (const { rodadaId, opcaoId } of plano) {
      let escolhido = null;
      for (const c of chances(config, { equipeId, rodadaId, opcaoId, estado, historico })) {
        const depois = aplicar(config, { equipeId, rodadaId, opcaoId, cartaId: c.carta, estado, historico }).depois;
        const v = patrimonio(depois);
        if (!escolhido || v < escolhido.v) escolhido = { v, depois, carta: c.carta };
      }
      if (!escolhido) throw new Error(`Nenhuma carta possível para a equipe "${equipeId}" na rodada "${rodadaId}".`);
      estado = escolhido.depois;
      historico = { ...historico, [rodadaId]: { decisao: opcaoId, carta: escolhido.carta } };
    }
    return patrimonio(estado);
  }

  function estimar(config, equipeId, plano, inicial, semente) {
    const s = simular(config, equipeId, plano, inicial, semente);
    return { esperado: s.esperado, pior: Math.min(s.pior, piorDirigido(config, equipeId, plano, inicial)) };
  }

  // estimado (esquema v3): false quando a conta é a enumeração exata; true
  // quando os caminhos de cartas passam de LIMITE_CAMINHOS e a conta é a
  // simulação determinística. A tela diz então "pior caso estimado".
  // modo ('exato' | 'estimado', opcional) força uma das duas contas: é só para
  // os testes compararem a simulação com a enumeração num config pequeno. O
  // anfitrião e o simulador nunca o passam (o limite decide).
  function decompor(config, { equipeId, rodadas, modo }) {
    const inicial = estadoInicial(config, equipeId);
    let estado = inicial;
    const historico = {};
    for (const r of rodadas) {
      estado = aplicar(config, { equipeId, rodadaId: r.rodadaId, opcaoId: r.opcaoId, cartaId: r.cartaId, estado, historico }).depois;
      historico[r.rodadaId] = { decisao: r.opcaoId, carta: r.cartaId };
    }
    const realizado = patrimonio(estado);
    const planoDecidido = rodadas.map((r) => ({ rodadaId: r.rodadaId, opcaoId: r.opcaoId }));
    const planoPiloto = rodadas.map((r) => ({
      rodadaId: r.rodadaId,
      opcaoId: exigir(config.rodadas, r.rodadaId, 'Rodada').padrao,
    }));
    const rodadaIds = rodadas.map((r) => r.rodadaId);
    const estimado = modo === 'estimado' || (modo !== 'exato' && caminhosDeCartas(config, equipeId, rodadaIds) > LIMITE_CAMINHOS);
    const semente = estimado ? sementeDoDecompor(config, equipeId, rodadaIds) : 0;
    const avaliar = estimado
      ? (plano) => estimar(config, equipeId, plano, inicial, semente)
      : (plano) => explorar(config, equipeId, plano, inicial, 0, {});
    const comDecisoes = avaliar(planoDecidido);
    const piloto = avaliar(planoPiloto);
    const semProtecao = planoSemProtecao(config, planoDecidido);
    return {
      realizado,
      esperadoComDecisoes: comDecisoes.esperado,
      esperadoPiloto: piloto.esperado,
      efeitoDecisoes: comDecisoes.esperado - piloto.esperado,
      sorte: realizado - comDecisoes.esperado,
      piorCaso: comDecisoes.pior,
      piorCasoSemProtecao: semProtecao ? avaliar(semProtecao).pior : comDecisoes.pior,
      estimado,
    };
  }

  // O formato simples (regras.formatoSimples; decisão do Kleber de 05/10 à
  // noite): sem sorteio, o patrimônio do fim depende só das escolhas, e dá para
  // contar TODAS as combinações de opções das rodadas jogadas (5^6 = 15.625 com
  // 6 bimestres de 5 opções). É a página "Das N combinações possíveis, X fecham
  // o ano" do placar final: mostra que, mesmo escolhendo, faltou dinheiro.
  // A árvore é percorrida em profundidade, na ordem das opções do config: as
  // combinações que coincidem até uma rodada dividem o período já calculado
  // (19.530 chamadas do aplicar para 15.625 caminhos de 6 rodadas, em vez de
  // 93.750). Determinística: a mesma ordem dá o mesmo resultado em qualquer
  // tela, e no empate a primeira combinação na ordem fica com o melhor e o pior.
  // rodadas: os ids, na ordem em que o anfitrião as aplica (as do roteiro que
  // foram jogadas: uma rodada pulada no dia não entra, como no estadoAntes).
  // Só com UMA carta possível em cada rodada (o validador garante no formato
  // simples). Com mais, lança: com sorteio, uma combinação não tem um valor só.
  // Devolve { total, fecham (patrimônio do fim ≥ 0), melhor e pior ({ opcoes:
  // [ids], valor }), valores (Float64Array, do maior para o menor) }.
  function enumerarCombinacoes(config, { equipeId, rodadas }) {
    const ordem = lista(rodadas);
    const valores = [];
    let fecham = 0;
    let melhor = null;
    let pior = null;
    const caminho = [];
    function descer(k, estado, historico) {
      if (k === ordem.length) {
        const v = patrimonio(estado);
        valores.push(v);
        if (v >= 0) fecham += 1;
        if (!melhor || v > melhor.valor) melhor = { opcoes: caminho.slice(), valor: v };
        if (!pior || v < pior.valor) pior = { opcoes: caminho.slice(), valor: v };
        return;
      }
      const rodadaId = ordem[k];
      const rodada = exigir(config.rodadas, rodadaId, 'Rodada');
      const opcoes = lista(rodada.ordemOpcoes).length > 0 ? lista(rodada.ordemOpcoes) : Object.keys(rodada.opcoes || {});
      for (const opcaoId of opcoes) {
        const baralho = chances(config, { equipeId, rodadaId, opcaoId, estado, historico });
        if (baralho.length !== 1) {
          throw new Error(`Para contar as combinações, cada rodada precisa de uma carta só (o formato simples); a rodada "${rodadaId}" tem ${baralho.length} para a equipe "${equipeId}".`);
        }
        const carta = baralho[0].carta;
        const depois = aplicar(config, { equipeId, rodadaId, opcaoId, cartaId: carta, estado, historico }).depois;
        caminho.push(opcaoId);
        descer(k + 1, depois, { ...historico, [rodadaId]: { decisao: opcaoId, carta } });
        caminho.pop();
      }
    }
    descer(0, estadoInicial(config, equipeId), {});
    // Crescente pelo sort numérico do Float64Array, e depois invertida.
    const ordenados = Float64Array.from(valores).sort().reverse();
    return { total: valores.length, fecham, melhor, pior, valores: ordenados };
  }

  // O lugar de um patrimônio entre os da enumeração (valores do maior para o
  // menor): 1 + quantos são maiores. Empate divide o lugar ("12º" para todas as
  // combinações de mesmo valor). Busca binária: são 15.625 valores.
  function lugarEntre(valores, valor) {
    let baixo = 0;
    let alto = valores.length;
    while (baixo < alto) {
      const meio = (baixo + alto) >> 1;
      if (valores[meio] > valor) baixo = meio + 1;
      else alto = meio;
    }
    return baixo + 1;
  }

  V.motor = {
    estadoInicial, condicaoVale, chances, resolverRodada, aplicar, consolidarDecisao, decompor, historicoDe, totalBasico, mesComum,
    patrimonio, mesesPorRodada, caminhosDeCartas, cartasPossiveisNaRodada, condicaoFixa, LIMITE_CAMINHOS, AMOSTRAS,
    enumerarCombinacoes, lugarEntre,
    trabalhoComum, protecaoAcimaDoTrabalho, limiteDe, comidaDoBasico, semAtrasoDoBasico,
    // Cópia: a tabela do cache não pode ser alterada por quem chama.
    cronograma: (valor, parcelas, taxaMes) => cronograma(valor, parcelas, taxaMes).map((p) => ({ ...p })),
  };
})(globalThis);
