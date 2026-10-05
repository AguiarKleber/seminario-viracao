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

  // D-054: a mesma escolha dita do jeito de cada ofício. rotuloPor/narrativaPor
  // da persona, e o rotulo/narrativa da opção quando ela não tem entrada. O
  // telão também usa isto (o resultado de cada equipe fala do jeito dela);
  // opção que não existe dá os dois null.
  function textoDaOpcao(conteudo, rodadaId, opcaoId, personaId) {
    const opcao = em(conteudo, 'rodadas', rodadaId, 'opcoes', opcaoId) || {};
    return {
      rotulo: em(opcao, 'rotuloPor', personaId) ?? opcao.rotulo ?? null,
      narrativa: em(opcao, 'narrativaPor', personaId) ?? opcao.narrativa ?? null,
    };
  }

  // Esquema v2.2: as duas dívidas da família, a partir dos indicadores (o
  // "depois" gravado ou o placar). O cheque especial é o saldo acumulado
  // negativo; o empréstimo é o saldo devedor. A "dívida" da tela é a soma:
  // no teste de 30/09, o Jonas pegou R$ 1.500 no mês 2 e a tela disse
  // "dívida R$ 1", porque olhava só o cheque especial. null quando os
  // indicadores não têm a renda (sala sem resultado).
  // Esquema v3.1 (D-066): com o limite do cheque especial, a terceira dívida
  // são as contas atrasadas (indicador "contas_atrasadas"), que entram no
  // total. O campo só existe quando os valores têm o indicador: a dívida de
  // uma sala sem o limite fica igual à de antes, campo a campo.
  const IND_ATRASADAS = 'contas_atrasadas';
  const IND_MESA = 'faltou_na_mesa';
  function dividaTotal(valores) {
    const renda = em(valores, 'renda');
    if (!Number.isFinite(renda)) return null;
    const emprestimo = Math.max(0, Number(em(valores, 'emprestimo')) || 0);
    const chequeEspecial = renda < 0 ? -renda : 0;
    const atrasadas = em(valores, IND_ATRASADAS);
    if (atrasadas === null) return { chequeEspecial, emprestimo, total: chequeEspecial + emprestimo };
    // Com o limite, o total continua sendo o banco e o empréstimo, e as contas
    // atrasadas vão num campo à parte (revisão da F6c): o telão escrevia
    // "dívida R$ 3.000" e as contas atrasadas ao lado, e o celular da mesma
    // equipe, "Dívida hoje R$ 7.811", somando tudo. Uma definição só, para as
    // duas telas: a dívida é com o banco; as contas atrasadas (aluguel, luz)
    // são outra coisa, com multa e risco de despejo. O patrimônio desconta as
    // duas (patrimonioDe).
    const contasAtrasadas = Math.max(0, Number(atrasadas) || 0);
    return { chequeEspecial, emprestimo, contasAtrasadas, total: chequeEspecial + emprestimo };
  }

  // D-066: o que faltou na mesa, acumulado (indicador "faltou_na_mesa"), ou
  // null quando os valores não o têm (sala sem o limite). Não é dívida: é a
  // comida que a casa deixou de comprar, e a tela a mostra à parte.
  function faltouNaMesaDe(valores) {
    const v = em(valores, IND_MESA);
    return v === null ? null : Math.max(0, Number(v) || 0);
  }

  // O patrimônio (esquema v2.2): o saldo acumulado menos o empréstimo a pagar.
  // É o número do placar (motor.patrimonio, que o celular não carrega) e o
  // "ficou com" do resumo mês a mês: pelo saldo acumulado, quem pegou R$ 1.500
  // e ainda não pagou nada parecia R$ 1.500 mais rico. null sem a renda.
  // Esquema v3.1 (D-066): menos as contas atrasadas, como o motor.patrimonio.
  function patrimonioDe(valores) {
    const d = dividaTotal(valores);
    return d ? em(valores, 'renda') - d.emprestimo - (d.contasAtrasadas || 0) + 0 : null;
  }

  // Esquema v3 (D-060): quantos meses cada rodada representa, e como a tela
  // chama esse período. Com 6 rodadas bimestrais, "o saldo do mês" passa a ser
  // "o saldo do bimestre", e "no fim dos 3 meses", "no fim dos 12 meses".
  // Ausente (config de rodadas mensais) vale 1 e "mês": as telas continuam
  // dizendo o que diziam. O celular não carrega o motor: por isso a regra
  // mora aqui também (a mesma de motor.mesesPorRodada).
  const NOMES_DO_PERIODO = { 1: 'mês', 2: 'bimestre', 3: 'trimestre', 6: 'semestre' };
  function periodo(conteudo) {
    const m = em(conteudo, 'regras', 'mesesPorRodada');
    const meses = Number.isInteger(m) && m >= 1 ? m : 1;
    const nome = NOMES_DO_PERIODO[meses] || `período de ${meses} meses`;
    return { meses, nome, noPeriodo: `no ${nome}`, doPeriodo: `do ${nome}` };
  }

  // O nome curto de uma rodada, para a tabela do resumo e a linha do tempo:
  // "Jan–fev: quanto trabalhar?" vira "Jan–fev"; "Mês 1: …", "Mês 1". O título
  // inteiro não cabe na coluna do celular em 360 px. Sem os dois-pontos, o
  // título inteiro; sem título, "Rodada N" (i é a posição, a partir de 0).
  function rotuloDaRodada(titulo, i) {
    const t = typeof titulo === 'string' ? titulo.split(':')[0].trim() : '';
    return t || `Rodada ${i + 1}`;
  }

  // Quantos meses a partida já cobriu: as rodadas jogadas × os meses de cada
  // uma. É o "No fim dos 12 meses" do placar final (com 3 rodadas mensais, 3).
  function mesesJogados(conteudo, historia) {
    return lista(historia).length * periodo(conteudo).meses;
  }

  // O resumo por rodada (D-065: a tabela "saldo do período · ficou com" do
  // celular, e a mesma conta no telão): uma linha por rodada jogada, na ordem
  // do config, com o nome curto, o saldo da rodada, o patrimônio no fim dela e
  // as duas dívidas. Sala antiga sem o "mes" ou o "depois" fica com null.
  // Esquema v3.1 (D-066): com o limite, cada linha leva também faltouNaMesa
  // (o da rodada, mes.faltouNaMesa) e faltouNaMesaAcumulado; sem ele, a linha
  // fica igual à de antes.
  function resumoPorRodada(conteudo, equipeId, resultados) {
    return historiaDaEquipe(conteudo, equipeId, resultados).map((h) => {
      const linha = {
        rodadaId: h.rodadaId, rotulo: h.rotulo, titulo: h.titulo,
        saldo: Number.isFinite(h.mes?.saldoMes) ? h.mes.saldoMes : null,
        ficouCom: h.saldoAcumulado, divida: h.divida,
      };
      if (h.faltouNaMesa !== undefined) {
        linha.faltouNaMesa = Number.isFinite(h.mes?.faltouNaMesa) ? h.mes.faltouNaMesa : null;
        linha.faltouNaMesaAcumulado = h.faltouNaMesa;
      }
      return linha;
    });
  }

  // Os gastos de uma rodada que o config explica sem o estado da equipe: os
  // efeitos de categoria "gasto" da opção decidida e os gerais da rodada, sem
  // condição ou só com a da persona (o curso de gel da Rose, os pneus do
  // Marcos, a luz mais cara de dezembro). Os de condição que lê o passado (a
  // multa do aluguel) chegam nomeados no deAntes; os de outra condição o núcleo
  // do celular não sabe avaliar (não carrega o motor), e ficam de fora: a conta
  // os chama de "outros gastos". Valores positivos, como a tela os escreve.
  function gastosDoConfig(conteudo, { equipeId, rodadaId, decisao }) {
    const personaId = em(conteudo, 'equipes', equipeId, 'persona');
    const rodada = em(conteudo, 'rodadas', rodadaId) || {};
    const vale = (se) => {
      if (se == null) return true;
      if (typeof se !== 'object' || Object.keys(se).some((k) => k !== 'persona')) return false;
      return Array.isArray(se.persona) ? se.persona.includes(personaId) : se.persona === personaId;
    };
    const efeitos = [...lista(em(rodada, 'opcoes', decisao, 'efeitos')), ...lista(rodada.efeitosGerais)];
    return efeitos
      .filter((e) => e && e.categoria === 'gasto' && Number(em(e, 'soma', 'renda')) < 0 && vale(e.se))
      .map((e) => ({ rotulo: typeof e.rotulo === 'string' ? e.rotulo : 'gastos', valor: -e.soma.renda }));
  }

  // O que a linha de um mês nomeia nos gastos (a história do telão; revisão de
  // 29/09, 2ª rodada, achados 10 e 13, e revisão da F7, achado 9 da revisão de
  // conteúdo e legibilidade):
  // - antes: o que veio de antes e mexeu no trabalho (a fratura que continua, o
  //   INSS, o bloqueio), com sinal. Os gastos de antes (a multa) não entram
  //   aqui: estão nos gastos do mês;
  // - gastos: as parcelas dos gastos do mês, positivas e somando o total, para a
  //   tela juntar por " + ": a da carta primeiro e sem nome ("gastos R$ 1.079",
  //   logo atrás do custo da carta na frase), depois as do config (o curso de
  //   gel), as de antes (a multa) e, se ainda faltar, "outros gastos". A
  //   primeira, quando tem nome, sai como "gastos: nome"; sozinha, só o nome.
  //   Antes, com um gasto de opção as parcelas conhecidas não fechavam, e a
  //   tela caía no jeito antigo: "multa do aluguel atrasado −R$ 130" entre o
  //   que veio de antes, com o sinal trocado, e de novo dentro do "gastos
  //   R$ 2.709", com o curso de R$ 1.500 sem nome. Se as parcelas passam do
  //   total (dado incoerente), gastos: null ("gastos R$ G" inteiro), e a multa
  //   continua fora do que veio de antes: contada uma vez só;
  // - cartaNosGastos: a parcela da carta já está nas contas (a tela não repete
  //   "gastos da carta" no custo).
  // quem = { equipeId, rodadaId, decisao }. Sem gastos no mês, gastos: null.
  function nomesDosGastos(conteudo, quem, custo, mes, deAntes) {
    const itens = lista(deAntes).filter((x) => x && typeof x.rotulo === 'string' && Number.isFinite(x.valor));
    const antes = itens.filter((x) => !x.gasto);
    const total = Number(mes?.gastos) || 0;
    const daCarta = Number(custo?.gastos) > 0 ? [{ rotulo: null, valor: custo.gastos }] : [];
    const deAntesGastos = itens.filter((x) => x.gasto).map((x) => ({ rotulo: x.rotulo, valor: -x.valor }));
    // Primeiro com os do config; se passam do total (o config mudou depois da
    // rodada, por exemplo), sem eles, e o que faltar fica "outros gastos".
    for (const doConfig of [gastosDoConfig(conteudo, quem || {}), []]) {
      const partes = [...daCarta, ...doConfig, ...deAntesGastos];
      const resto = total - partes.reduce((t, p) => t + p.valor, 0);
      if (resto < -0.5) continue;
      if (resto > 0.5) partes.push({ rotulo: 'outros gastos', valor: resto });
      if (partes.length === 0) break;
      const gastos = partes.map((p, i) => {
        if (i > 0) return p;
        if (!p.rotulo) return { rotulo: 'gastos', valor: p.valor };
        return { rotulo: partes.length > 1 ? `gastos: ${p.rotulo}` : p.rotulo, valor: p.valor };
      });
      return { antes, gastos, cartaNosGastos: daCarta.length > 0 };
    }
    return { antes, gastos: null, cartaNosGastos: false };
  }

  // Na ordem das rodadas do config; rodada sem resultado da equipe (pulada no
  // dia, ou equipe fechada naquele mês) não entra. cartaCusto é o gravado pelo
  // telão (D-052); resultado de sala anterior ao v2.1 não o tem, e fica null.
  function historiaDaEquipe(conteudo, equipeId, resultados) {
    const ordem = lista(em(conteudo, 'ordem', 'rodadas'));
    const rodadas = ordem.length > 0 ? ordem : Object.keys(em(conteudo, 'rodadas') || {});
    const personaId = em(conteudo, 'equipes', equipeId, 'persona');
    const historia = [];
    rodadas.forEach((rodadaId, i) => {
      const res = em(resultados, rodadaId, equipeId);
      if (!res) return;
      const rodada = em(conteudo, 'rodadas', rodadaId) || {};
      const carta = em(conteudo, 'cartas', res.carta) || {};
      historia.push({
        rodadaId,
        titulo: rodada.titulo ?? null,
        // O nome curto ("Jan–fev"), pela posição da rodada no config.
        rotulo: rotuloDaRodada(rodada.titulo, i),
        opcao: textoDaOpcao(conteudo, rodadaId, res.decisao, personaId),
        carta: { titulo: carta.titulo ?? null, narrativa: carta.narrativa ?? null, tom: carta.tom ?? null },
        mes: res.mes ?? null,
        cartaCusto: res.cartaCusto ?? null,
        // O que veio dos meses anteriores (motor, deAntes), gravado pelo
        // anfitrião; lista vazia quando não há, ou em sala antiga.
        deAntes: lista(res.deAntes),
        // O que a proteção pagou no mês (D-059), ou null.
        protecaoDoMes: protecaoDoResultado(res),
        // Esquema v2.2: como a família ficou no fim do mês (o resumo mês a
        // mês: vermelho se negativo, verde se positivo) e as duas dívidas.
        // null em sala sem o "depois".
        saldoAcumulado: patrimonioDe(res.depois),
        divida: dividaTotal(res.depois),
        // D-066: o que faltou na mesa até aqui (acumulado), só com o limite.
        ...(faltouNaMesaDe(res.depois) === null ? {} : { faltouNaMesa: faltouNaMesaDe(res.depois) }),
      });
    });
    return historia;
  }

  // D-059: o que a proteção pagou num mês, a partir do resultado gravado pelo
  // anfitrião (mes.protecao, protecaoEvitou e protecaoItens). null quando ela
  // não pagou nada, e em sala anterior à D-059 (sem mes.protecao). evitou
  // ausente vale o pago: é o que o motor calcula (a proteção do mês não muda
  // os juros do mês).
  function protecaoDoResultado(res) {
    const pagou = Number(res?.mes?.protecao) || 0;
    // Com o limite (revisão da F6c), o anfitrião grava também a comida que a
    // proteção evitou cortar (protecaoEvitouMesa), e o protecaoEvitou ausente
    // quer dizer 0: ela não mudou o saldo, só comprou comida. Sem a mesa
    // gravada, ausente vale o pago, como antes.
    const evitouMesa = Number.isFinite(res?.protecaoEvitouMesa) && res.protecaoEvitouMesa > 0 ? res.protecaoEvitouMesa : 0;
    const evitou = Number.isFinite(res?.protecaoEvitou) ? res.protecaoEvitou : evitouMesa > 0 ? 0 : pagou;
    if (!(pagou > 0) && !(evitou > 0)) return null;
    const itens = lista(res.protecaoItens).filter((x) => x && typeof x.rotulo === 'string' && Number.isFinite(x.valor));
    const saldoMes = Number.isFinite(res.mes?.saldoMes) ? res.mes.saldoMes : null;
    // D-067: gravado pelo anfitrião só quando a proteção passou do trabalho de
    // um período comum (motor.protecaoAcimaDoTrabalho); o campo só existe então.
    const acima = res.protecaoAcimaDoTrabalho;
    const mesa = evitouMesa > 0 ? { evitouMesa } : {};
    if (acima && Number.isFinite(acima.trabalhoComum) && pagou > acima.trabalhoComum) {
      return { pagou, evitou, ...mesa, itens, saldoMes, acimaDoTrabalho: { trabalhoComum: acima.trabalhoComum } };
    }
    return { pagou, evitou, ...mesa, itens, saldoMes };
  }

  // D-067: a frase que explica por que a proteção rendeu mais que o trabalho.
  // "Auxílio do INSS (45 dias): R$ 2.431, mais do que Bruna ganhava trabalhando
  // num bimestre comum (R$ 1.400)." O valor do auxílio é fixo pela lei (o piso
  // de um salário mínimo), e a renda do app fica abaixo dele: é o dado real que
  // vira debate, e sem a frase a sala lia "o acidente compensa". O nome do que
  // pagou vem dos itens da proteção (o config), porque o núcleo não escreve
  // conteúdo; o "1 salário mínimo" fica no rótulo do efeito ou na fala do
  // apresentador. null quando não é o caso. A moeda vem da tela.
  function fraseAcimaDoTrabalho(protecao, nome, moeda, per) {
    if (!protecao || !protecao.acimaDoTrabalho) return null;
    const nomes = lista(protecao.itens).map((x) => x.rotulo).filter((x) => typeof x === 'string');
    const oQue = nomes.length > 0 ? nomes.join(' e ') : 'a proteção';
    const quem = typeof nome === 'string' && nome.trim() ? nome : 'a família';
    const periodoComum = per && typeof per.nome === 'string' ? per.nome : 'mês';
    const inicio = oQue.charAt(0).toUpperCase() + oQue.slice(1);
    return `${inicio}: ${moeda(protecao.pagou)}, mais do que ${quem} ganhava trabalhando num ${periodoComum} comum (${moeda(protecao.acimaDoTrabalho.trabalhoComum)}).`;
  }

  // D-066: a frase do mês em que o dinheiro e o limite do cheque especial
  // acabaram, a partir do mes gravado. "O limite do cheque especial acabou: R$ X
  // de contas ficaram atrasadas (multa de R$ M) e R$ Y de comida não deu para
  // comprar." e, se pagou atrasado, "Pagou R$ Z de contas atrasadas." null
  // quando nada disso aconteceu, ou em sala sem o limite (mes sem os campos).
  function fraseDoLimite(mes, moeda) {
    if (!mes || !Number.isFinite(mes.contasAtrasadas)) return null;
    const partes = [];
    if (mes.atrasou > 0 || mes.faltouNaMesa > 0 || mes.ficouSem > 0) {
      const corte = [];
      if (mes.atrasou > 0) corte.push(`${moeda(mes.atrasou)} de contas ficaram atrasadas${mes.multa > 0 ? ` (multa de ${moeda(mes.multa)})` : ''}`);
      // Revisão da F6c: o que não atrasa (gás, ônibus, remédio), que a casa
      // ficou sem. Os nomes estão no config; a frase diz o que eles têm em comum.
      if (mes.ficouSem > 0) corte.push(`a casa ficou sem ${moeda(mes.ficouSem)} do que não se paga depois`);
      if (mes.faltouNaMesa > 0) corte.push(`${moeda(mes.faltouNaMesa)} de comida não deu para comprar`);
      const juntos = corte.length > 1 ? `${corte.slice(0, -1).join(', ')} e ${corte.at(-1)}` : corte[0];
      partes.push(`O limite do cheque especial acabou: ${juntos}.`);
    }
    if (mes.contasPagas > 0) partes.push(`Pagou ${moeda(mes.contasPagas)} de contas atrasadas.`);
    return partes.length > 0 ? partes.join(' ') : null;
  }

  // A frase do celular (D-059): "A proteção pagou R$ 900: auxílio do INSS
  // (MEI). Sem ela, teria faltado R$ 900 a mais." O "sem ela" muda com o mês:
  // quem fechou no vermelho teria faltado mais; quem fechou por causa dela
  // teria faltado a diferença; quem sobrou teria sobrado menos. A proteção
  // não "rende" na média (é seguro); o que ela vale é isto. A moeda vem da
  // tela (Viracao.formatar): o núcleo não formata dinheiro.
  function fraseDaProtecao(protecao, moeda) {
    if (!protecao) return null;
    const nomes = protecao.itens.map((x) => x.rotulo);
    const pagou = `A proteção pagou ${moeda(protecao.pagou)}${nomes.length > 0 ? `: ${nomes.join(' e ')}` : ''}.`;
    // Com o limite (revisão da F6c), parte do que ela pagou comprou a comida
    // que seria cortada: "e R$ Y de comida não teria dado para comprar".
    const mesa = protecao.evitouMesa > 0 ? `${moeda(protecao.evitouMesa)} de comida não teria dado para comprar` : null;
    if (protecao.saldoMes === null) return pagou;
    if (!(protecao.evitou > 0)) return mesa ? `${pagou} Sem ela, ${mesa}.` : pagou;
    const semEla = protecao.saldoMes - protecao.evitou;
    let depois;
    if (protecao.saldoMes < 0) depois = `Sem ela, teria faltado ${moeda(protecao.evitou)} a mais`;
    else if (semEla < 0) depois = `Sem ela, teria faltado ${moeda(-semEla)}`;
    else depois = `Sem ela, teria sobrado ${moeda(protecao.evitou)} a menos`;
    return `${pagou} ${depois}${mesa ? `, e ${mesa}` : ''}.`;
  }

  // O pior caso do placar (D-059), em reais inteiros para a tela: com as
  // escolhas da equipe e, se ela escolheu alguma opção que protege, sem ela.
  // situacao diz o que a tela escreve depois do primeiro número:
  // - "semEscolha": a equipe não escolheu proteção;
  // - "evitou": sem a proteção, o pior caso seria mais fundo (semProtecao e
  //   evitou = a diferença, que a sala não precisa calcular de cabeça);
  // - "naoMelhorou": com as escolhas jogadas, a proteção não melhorou o pior
  //   caso. Acontece com o MEI quando a sessão acaba antes do mês 3 (o INSS
  //   só chega no mês seguinte à fratura, e até lá só pesa o DAS) e com a
  //   associação, que não cobre o acidente (rascunho, seção 0.4). Antes desta
  //   trava, o telão escrevia "sem a proteção: −R$ 6.032" embaixo de
  //   "com as escolhas de vocês: −R$ 6.210" e da nota "ela evita o pior": o
  //   "sem" nunca pode aparecer melhor que o "com" (revisão da F5, achado 1);
  // - "semDado": sala anterior à D-059, sem piorCasoSemProtecao (a tela não
  //   inventa).
  // Placar sem piorCaso (sala antiga) devolve null.
  // Esquema v3: com o placar estimado (a simulação de 6 rodadas), o resultado
  // leva estimado: true, e a tela diz "pior caso estimado". Só quando é: o
  // placar exato continua com os mesmos campos de antes.
  function piorCasoDoPlacar(placar, protegeu) {
    if (!placar || !Number.isFinite(placar.piorCaso)) return null;
    const marca = placar.estimado === true ? { estimado: true } : {};
    const com = Math.round(placar.piorCaso) + 0;
    const base = { comEscolhas: com, semProtecao: null, evitou: 0 };
    if (protegeu !== true) return { ...base, situacao: 'semEscolha', ...marca };
    if (!Number.isFinite(placar.piorCasoSemProtecao)) return { ...base, situacao: 'semDado', ...marca };
    const sem = Math.round(placar.piorCasoSemProtecao) + 0;
    if (sem < com) return { comEscolhas: com, semProtecao: sem, evitou: com - sem, situacao: 'evitou', ...marca };
    return { ...base, situacao: 'naoMelhorou', ...marca };
  }

  // D-059: o config tem alguma opção que protege? Sem ela, o placar não tem o
  // pior caso "sem a proteção" para mostrar.
  function temProtecao(conteudo) {
    return Object.values(em(conteudo, 'rodadas') || {})
      .some((r) => Object.values((r && r.opcoes) || {}).some((o) => o && o.protege === true));
  }

  // A equipe escolheu, em algum mês jogado, uma opção que protege. O telão e o
  // celular leem a mesma coisa daqui.
  function escolheuProtecao(conteudo, resultados, equipeId) {
    return Object.keys(resultados || {}).some((rodadaId) => {
      const decisao = em(resultados, rodadaId, equipeId, 'decisao');
      return typeof decisao === 'string' && em(conteudo, 'rodadas', rodadaId, 'opcoes', decisao, 'protege') === true;
    });
  }

  // "Escolha ou sorte?" em reais inteiros, para a tela (D-041): o motor devolve
  // piloto, efeitoDecisoes e sorte fracionários, e arredondar cada um sozinho
  // fazia a conta lida em voz alta ("se não mudassem nada → as escolhas → a
  // sorte → terminaram com") errar por R$ 1 em ~15% das equipes (revisão de
  // 29/09). A sorte exibida é o que falta para fechar com o total arredondado:
  // a diferença para a do motor fica abaixo de R$ 1,50, e a conta sempre fecha.
  // Placar sem os quatro números (sala antiga) devolve null: a tela não inventa.
  // O total é o patrimônio (esquema v2.2): piloto e efeitoDecisoes vêm do
  // motor.decompor, que já é no patrimônio; com a renda crua, a conta da
  // equipe que pegou o empréstimo não fecharia por R$ 1.500.
  function escolhaOuSorte(placar) {
    if (!placar) return null;
    const { piloto, efeitoDecisoes, renda } = placar;
    if (![piloto, efeitoDecisoes, renda].every(Number.isFinite)) return null;
    const total = Math.round(patrimonioDe(placar));
    const p = Math.round(piloto);
    const escolhas = Math.round(efeitoDecisoes);
    // "+ 0" troca -0 por 0: "−R$ 0" na tela seria um sinal sem valor.
    const conta = { piloto: p + 0, escolhas: escolhas + 0, sorte: total - p - escolhas + 0, total: total + 0 };
    // Esquema v3: o piloto e as escolhas vêm da simulação (a tela diz "estimado").
    if (placar.estimado === true) conta.estimado = true;
    return conta;
  }

  // A primeira frase de um texto: até o primeiro ".", "!" ou "?" seguido de
  // espaço (ou do fim). O ponto de "R$ 1.500" vem colado no número e não conta.
  function primeiraFrase(texto) {
    if (typeof texto !== 'string' || !texto.trim()) return null;
    const limpo = texto.trim();
    return /^.*?[.!?](?=\s|$)/s.exec(limpo)?.[0] ?? limpo;
  }

  // A linha curta de um mês na história do telão (D-045; rascunho, seção 7,
  // item 12): a primeira frase da narrativa da opção e a da carta, em primeira
  // pessoa. As narrativas inteiras (de 90 a 150 letras cada) davam quatro
  // linhas por mês, e três meses não cabiam em 1024×768 com o corpo em 28 px.
  // O corte é sempre no fim de uma frase; o celular mostra as duas inteiras.
  function linhaDoMes(mes) {
    const frases = [primeiraFrase(mes?.opcao?.narrativa), primeiraFrase(mes?.carta?.narrativa)].filter(Boolean);
    return frases.length > 0 ? frases.join(' ') : null;
  }

  V.historia = {
    historiaDaEquipe, escolhaOuSorte, linhaDoMes, textoDaOpcao, protecaoDoResultado, fraseDaProtecao, piorCasoDoPlacar,
    temProtecao, escolheuProtecao, dividaTotal, patrimonioDe, periodo, rotuloDaRodada, mesesJogados, resumoPorRodada,
    nomesDosGastos, faltouNaMesaDe, fraseAcimaDoTrabalho, fraseDoLimite,
  };
})(globalThis);
