#!/usr/bin/env node
// Validador do config.json para quem edita o conteúdo: os erros e avisos do
// núcleo (os mesmos que o telão mostra) e, se o config for válido, as
// conferências de equilíbrio do jogo (arquitetura, seção 7).
//
// Uso: node bin/validar-config.mjs [caminho]    (padrão: config.json na raiz)
// Sai com código 1 se houver erro, para o `npm run check` barrar o commit.
//
// Tudo é calculado por ENUMERAÇÃO exata (estados alcançáveis × cartas), e não por
// simulação: o número é o mesmo a cada execução, e uma mudança de 1 no peso de
// uma carta aparece aqui sem ruído de amostragem.
//
// Esquema v3 (D-060: 12 meses em 6 rodadas): quando os caminhos de cartas de
// alguma equipe passam de motor.LIMITE_CAMINHOS (200 mil), a enumeração levaria
// horas (4 opções × ~15 cartas por rodada, 6 rodadas), e as conferências que
// enumeram (a a i) passam a uma SIMULAÇÃO determinística: os estados antes de
// cada rodada são amostras (sorteadas pelas chances, com a semente derivada do
// hash do config, e por isso iguais a cada execução), os planos de (e), (g) e
// (h) são uma amostra dos planos possíveis (mais o padrão e as trocas da
// proteção), e o pior e o melhor caso juntam o que a simulação achou com uma
// busca dirigida (a pior ou a melhor carta de cada rodada pelo efeito
// imediato), como o pior caso estimado do placar (motor.decompor). A saída diz
// "estimado". Abaixo do limite, tudo continua exato e a saída não muda.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';

// Faixa sugerida na arquitetura (seção 7, "por exemplo"): abaixo, o jogo vira
// loteria e a decisão não pesa; acima, a sorte some e a mensagem do seminário
// (a vida real depende de sorte) também.
const FAIXA_DECISOES = [0.3, 0.6];
const LIMIAR_DOMINANCIA_RENDA = 0.7;
const LIMIAR_MINIMO = 0.3;
// D-058 (detalha a D-050): de 5% a 10% das partidas de pelo menos duas
// personas fecham o básico, com as decisões ao acaso. Antes da D-058 a faixa
// era a sugestão do rascunho (5% a 15%).
const FAIXA_FECHAR = [0.05, 0.10];
const MIN_PERSONAS_NA_FAIXA = 2;
// D-059: o esgotamento deixa de ser o melhor plano "para a maioria das
// personas". Com 5 personas, a maioria é 3: se a opção de maior renda no mês é
// também a de maior saldo esperado no fim para 3 ou mais, o placar ainda premia
// o esgotamento naquele mês.
const MIN_PERSONAS_ESGOTAMENTO = 3;
const LETRAS = 'ABCDEFGH';
// O tamanho das amostras da simulação (esquema v3), escolhido pelo tempo: com a
// fixture de 6 rodadas × 20 cartas e 5 personas, o validador inteiro fica bem
// abaixo de 2 minutos. Os estados antes de cada rodada levam 2.000 caminhos (a
// conta do mês de (b) e (i) passa por todas as opções × cartas de cada um); o
// fim do jogo em (c), 4.000; cada plano sorteado de (e), (g) e (h), 400; o
// plano só do padrão, que decide o "nunca fecha" da D-058, 4.000.
const AMOSTRA_ESTADOS = 2000;
const AMOSTRA_FIM = 4000;
const AMOSTRA_PLANO = 400;
const AMOSTRA_PADRAO = 4000;
const PLANOS_SORTEADOS = 200;

const V = await carregarNucleo();
const M = V.motor;
// O saldo de fim de jogo é o patrimônio (esquema v2.2): o saldo acumulado
// menos o empréstimo a pagar, o mesmo do placar (motor.decompor). Pelo saldo
// acumulado, o empréstimo do mês 2 aparecia aqui como a melhor opção de todas
// as personas (R$ 1.500 que ainda não tinham sido pagos). "patrimonio" é um
// indicador virtual: vale em qualquer lugar que lê um indicador do estado.
const PATRIMONIO = 'patrimonio';
// Esquema v3.1 (D-066): os dois acumulados que o motor calcula quando o limite
// do cheque especial acaba.
const IND_ATRASADAS = 'contas_atrasadas';
const IND_MESA = 'faltou_na_mesa';
const valorDe = (estado, ind) => (ind === PATRIMONIO ? M.patrimonio(estado) : estado[ind]);
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const reais = (x) => (x < 0 ? '−R$ ' : 'R$ ') + numero.format(Math.abs(Math.round(x)));
const pct = (x) => numero.format(x * 100) + '%';
// Chance pequena com dois algarismos significativos: "0,0064%", e não "0%".
// Na D-050 a diferença entre "ninguém" e "quase ninguém" é o próprio critério,
// e o validador arredondava o 0,01% do Jonas para "0%" (revisão de 29/09, 2ª
// rodada, achado 7). Zero continua "0%".
const pctFino = (x) => {
  const p = x * 100;
  if (p === 0 || p >= 1) return pct(x);
  return new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 2 }).format(p) + '%';
};
// Arredonda antes de decidir o sinal: senão 0,02 sai como "+0" e -0,02 como "-0".
const sinal = (x) => {
  const r = Math.round(x * 10) / 10 + 0;
  return (r > 0 ? '+' : '') + numero.format(r);
};

function principal() {
  const caminho = process.argv[2] ? resolve(process.argv[2]) : join(RAIZ, 'config.json');
  if (!existsSync(caminho)) {
    console.error(`Arquivo não encontrado: ${caminho}`);
    return 1;
  }
  const r = V.validarConfig.validarTexto(readFileSync(caminho, 'utf8'));
  console.log(`Config: ${caminho}`);
  imprimirProblemas('Erros', r.erros);
  imprimirProblemas('Avisos', r.avisos);
  if (!r.ok) {
    console.log(`\n${r.erros.length} erro(s): o telão recusa criar a sala com este config.`);
    return 1;
  }
  const hash = V.validarConfig.hash(r.config);
  console.log(`Sem erros. Hash do config: ${hash}`);
  const { avisos, falhas } = analisar(r.config, hash);
  console.log(`\n${avisos} aviso(s) de equilíbrio. Avisos não bloqueiam a sala; são para calibrar o jogo.`);
  if (falhas > 0) {
    console.log(`${falhas} falha(s) na conta do mês (conferência i): o motor deixou o trabalho negativo com o piso ligado.`);
    return 1;
  }
  return 0;
}

function imprimirProblemas(titulo, lista) {
  if (lista.length === 0) return;
  console.log(`\n${titulo} (${lista.length}):`);
  for (const p of lista) console.log(`  - ${p.caminho || '(raiz)'}: ${p.mensagem}`);
}

// ------------------------------------------------------------------ análise

function analisar(cfg, hash) {
  const inds = cfg.ordem.indicadores;
  const rodadas = cfg.ordem.rodadas;
  // Esquema v3: a mesma regra do placar (motor.decompor) decide se as contas
  // são exatas ou estimadas, pela equipe com mais caminhos.
  const caminhos = Math.max(...cfg.ordem.equipes.map((eq) => M.caminhosDeCartas(cfg, eq, rodadas)));
  const estimado = caminhos > M.LIMITE_CAMINHOS;
  const aleatorio = estimado ? V.sorte.gerador(V.sorte.derivar(parseInt(hash, 16) >>> 0, 'validador')) : null;
  if (estimado) {
    console.log(`\nModo: SIMULAÇÃO determinística. Até ${Number.isFinite(caminhos) ? numero.format(caminhos) : 'mais de 9 quatrilhões de'} caminhos de cartas por equipe,`);
    console.log(`acima do limite de ${numero.format(M.LIMITE_CAMINHOS)} da enumeração exata. Os números de (a) a (i) são ESTIMADOS: ${AMOSTRA_ESTADOS} estados antes de cada rodada,`);
    console.log(`${AMOSTRA_FIM} caminhos até o fim, ${PLANOS_SORTEADOS} planos sorteados com ${AMOSTRA_PLANO} caminhos cada (o plano do padrão com ${AMOSTRA_PADRAO}),`);
    console.log('semente derivada do hash do config (a mesma saída a cada execução). Pior e melhor caso: o achado na simulação mais uma busca dirigida.');
  }
  let totalAvisos = 0;
  const avisar = (texto) => {
    totalAvisos += 1;
    console.log(`  AVISO: ${texto}`);
  };

  // Uma distribuição é uma lista de { estado, historico, p, bateu }: "bateu"
  // marca, bit a bit, os indicadores que já caíram até o mínimo nesta partida
  // (conferência f); o histórico é o que decidiu/sorteou leem (D-043), e só as
  // rodadas citadas por alguma condição entram na chave (as outras não mudam nada).
  const citadas = rodadasCitadas(cfg);
  const chaveDe = (x) => inds.map((i) => x.estado[i]).join('|') + '#' + x.bateu
    + citadas.map((r) => (x.historico[r] ? `#${x.historico[r].decisao}:${x.historico[r].carta}` : '#-')).join('');
  const juntar = (lista) => {
    const mapa = new Map();
    for (const x of lista) {
      const k = chaveDe(x);
      const achado = mapa.get(k);
      if (achado) achado.p += x.p;
      // Juntados têm o mesmo estado, então qualquer um dos caminhos chega à
      // mesma renda: fica o primeiro (conferência g, o melhor caminho).
      else mapa.set(k, { estado: x.estado, historico: x.historico, p: x.p, bateu: x.bateu, caminho: x.caminho });
    }
    return [...mapa.values()];
  };
  const ctx = (x, equipeId, rodadaId, opcaoId) => ({ equipeId, rodadaId, opcaoId, estado: x.estado, historico: x.historico });
  const uniforme = (rodadaId) => {
    const ids = cfg.rodadas[rodadaId].ordemOpcoes;
    return ids.map((id) => [id, 1 / ids.length]);
  };
  // O passo de um mês a partir de um estado, com a carta: o estado depois, o
  // "bateu" de (f), o histórico e o caminho (quando a distribuição leva um).
  const passo = (x, equipeId, rodadaId, opcaoId, carta, p) => {
    const depois = M.aplicar(cfg, { ...ctx(x, equipeId, rodadaId, opcaoId), cartaId: carta }).depois;
    let bateu = x.bateu;
    inds.forEach((ind, k) => {
      const { min } = cfg.indicadores[ind];
      if (x.estado[ind] > min && depois[ind] === min) bateu |= 1 << k;
    });
    const historico = { ...x.historico, [rodadaId]: { decisao: opcaoId, carta } };
    const caminho = x.caminho && [...x.caminho, `${rodadaId} ${opcaoId}/${carta}`];
    return { estado: depois, historico, p, bateu, caminho };
  };
  // Um mês: cada estado × cada opção (com o peso dela) × cada carta possível.
  // O caminho (opção e carta de cada mês) só é levado quando a distribuição
  // começa com caminho: [], porque só a conferência (g) precisa dele.
  const avancarExato = (dist, equipeId, rodadaId, opcoes) => {
    const saida = [];
    for (const x of dist) {
      for (const [opcaoId, pOpcao] of opcoes) {
        for (const c of M.chances(cfg, ctx(x, equipeId, rodadaId, opcaoId))) {
          saida.push(passo(x, equipeId, rodadaId, opcaoId, c.carta, x.p * pOpcao * c.chance));
        }
      }
    }
    return juntar(saida);
  };
  // Esquema v3: n caminhos sorteados, cada um de um estado da distribuição
  // (pela probabilidade dele), com a opção (pelo peso) e a carta (pelas
  // chances). O baralho e o estado depois de cada opção × carta ficam
  // guardados no estado de origem: o (c) parte quatro vezes (uma por opção) da
  // mesma distribuição, e o motor não refaz o que já fez.
  const amostrar = (dist, equipeId, rodadaId, opcoes, n) => {
    const acumulada = [];
    let total = 0;
    for (const x of dist) acumulada.push((total += x.p));
    const itensOpcao = opcoes.map(([id, peso]) => ({ id, peso }));
    const saida = [];
    for (let i = 0; i < n; i += 1) {
      const alvo = aleatorio() * total;
      let lo = 0;
      let hi = acumulada.length - 1;
      while (lo < hi) {
        const meio = (lo + hi) >> 1;
        if (acumulada[meio] > alvo) hi = meio;
        else lo = meio + 1;
      }
      const x = dist[lo];
      const opcaoId = itensOpcao.length === 1 ? itensOpcao[0].id : V.sorte.sortearPonderado(itensOpcao, aleatorio);
      x.guardado ||= new Map();
      let daOpcao = x.guardado.get(`${rodadaId}|${opcaoId}`);
      if (!daOpcao) {
        const baralho = M.chances(cfg, ctx(x, equipeId, rodadaId, opcaoId));
        if (baralho.length === 0) throw new Error(`Nenhuma carta possível para ${equipeId} em ${rodadaId}/${opcaoId}.`);
        daOpcao = { itens: baralho.map((c) => ({ id: c.carta, peso: c.peso })), filhos: new Map() };
        x.guardado.set(`${rodadaId}|${opcaoId}`, daOpcao);
      }
      const carta = V.sorte.sortearPonderado(daOpcao.itens, aleatorio);
      let filho = daOpcao.filhos.get(carta);
      if (!filho) {
        filho = passo(x, equipeId, rodadaId, opcaoId, carta, 0);
        daOpcao.filhos.set(carta, filho);
      }
      saida.push({ ...filho, p: 1 / n });
    }
    return juntar(saida);
  };
  // Um mês de uma distribuição: exato abaixo do limite, amostrado acima (n
  // caminhos; ignorado no exato).
  const avancar = (dist, equipeId, rodadaId, opcoes, n = AMOSTRA_ESTADOS) => (estimado
    ? amostrar(dist, equipeId, rodadaId, opcoes, n)
    : avancarExato(dist, equipeId, rodadaId, opcoes));
  // Antes da rodada k, com as rodadas anteriores decididas ao acaso. Guardado
  // por equipe: (f) passa de novo pelas equipes, e na simulação a segunda
  // passada daria outra amostra (e gastaria o dobro).
  const antesGuardado = new Map();
  const distribuicoesAntes = (equipeId) => {
    if (antesGuardado.has(equipeId)) return antesGuardado.get(equipeId);
    const lista = [[{ estado: M.estadoInicial(cfg, equipeId), historico: {}, p: 1, bateu: 0 }]];
    for (const rodadaId of rodadas) lista.push(avancar(lista[lista.length - 1], equipeId, rodadaId, uniforme(rodadaId)));
    antesGuardado.set(equipeId, lista);
    return lista;
  };
  // A busca dirigida (esquema v3, só na simulação): o caminho de um plano com a
  // pior (sentido −1) ou a melhor (+1) carta de cada rodada pelo patrimônio
  // logo depois dela. Tem chance acima de 0, e por isso conta como caminho
  // possível no pior e no melhor caso estimados.
  const dirigido = (equipeId, combo, sentido) => {
    let x = { estado: M.estadoInicial(cfg, equipeId), historico: {}, p: 1, bateu: 0, caminho: [] };
    rodadas.forEach((rodadaId, k) => {
      let escolhido = null;
      for (const c of M.chances(cfg, ctx(x, equipeId, rodadaId, combo[k]))) {
        const y = passo(x, equipeId, rodadaId, combo[k], c.carta, 1);
        if (!escolhido || sentido * (M.patrimonio(y.estado) - M.patrimonio(escolhido.estado)) > 0) escolhido = y;
      }
      x = escolhido;
    });
    return { renda: M.patrimonio(x.estado), caminho: x.caminho };
  };
  const esperado = (dist, ind) => dist.reduce((s, x) => s + x.p * valorDe(x.estado, ind), 0);
  // Com o empréstimo, a renda (o caixa) e o saldo devedor andam juntos; o que
  // se compara entre as opções é o patrimônio. Os outros indicadores seguem
  // como são (mais é melhor).
  const temEmprestimo = inds.includes('emprestimo');
  // D-066: as contas atrasadas já estão no patrimônio, e o que faltou na mesa
  // é "menos é melhor"; comparados como os outros ("mais é melhor"), a opção
  // que mais atrasa conta e mais corta comida pareceria a dominante.
  const indsComparados = [PATRIMONIO, ...inds.filter((i) => !['renda', 'emprestimo', IND_ATRASADAS, IND_MESA].includes(i))];

  const perfis = montarPerfis(cfg);
  const antesPorPerfil = new Map(perfis.map((pf) => [pf, distribuicoesAntes(pf.equipeId)]));

  // (a) chances efetivas
  console.log('\n== (a) Chances efetivas das cartas, por persona × rodada × opção ==');
  console.log('Critério: média sobre os estados alcançáveis, com as rodadas anteriores decididas ao acaso');
  console.log('(cada opção igualmente provável). Entre parênteses, mínimo–máximo quando a chance muda com o estado.');
  for (const pf of perfis) {
    console.log(`\n${pf.rotulo}`);
    rodadas.forEach((rodadaId, k) => {
      for (const opcaoId of cfg.rodadas[rodadaId].ordemOpcoes) {
        const media = {};
        const minimo = {};
        const maximo = {};
        const vistas = antesPorPerfil.get(pf)[k];
        for (const x of vistas) {
          const mapa = Object.fromEntries(M.chances(cfg, ctx(x, pf.equipeId, rodadaId, opcaoId)).map((c) => [c.carta, c.chance]));
          for (const carta of cfg.ordem.cartas) {
            const ch = mapa[carta] || 0;
            media[carta] = (media[carta] || 0) + x.p * ch;
            minimo[carta] = Math.min(minimo[carta] ?? 1, ch);
            maximo[carta] = Math.max(maximo[carta] ?? 0, ch);
          }
        }
        const partes = cfg.ordem.cartas.filter((c) => maximo[c] > 0).map((c) => {
          const faixa = maximo[c] - minimo[c] > 1e-9 ? ` (${pct(minimo[c])}–${pct(maximo[c])})` : '';
          return `${c} ${pct(media[c])}${faixa}`;
        });
        console.log(`  ${rodadaId} ${opcaoId}  ${partes.join(' · ')}`);
      }
    });
  }

  // (b) valor esperado e pior caso do mês, com as contas da casa (D-044, D-046)
  console.log('\n== (b) Efeito do mês: valor esperado (E) e pior caso, por persona × rodada × opção ==');
  console.log('Critério: variação do indicador naquele mês (depois do limite min/max), sobre os mesmos estados de (a).');
  console.log('Contas da casa: "entrou" = trabalho − custos fixos + outra renda; "saldo do mês" = entrou − gastos − básico − juros.');
  console.log('"gastos" = o que um evento custou (conserto, remédio, multa), fora do "entrou" (esquema v2.1).');
  console.log(`Dívida: juros de ${pct(cfg.regras.jurosDividaMes)} ao mês sobre a dívida que vinha de antes do mês (fonte: ${cfg.regras.jurosFonte}).`);
  // Esquema v3: com rodadas de mais de um mês, "o mês" de (b) e (i) é a rodada
  // inteira (o todoMes, o básico e a outra renda contam m vezes; os juros compõem).
  const meses = M.mesesPorRodada(cfg);
  if (meses > 1) console.log(`Cada rodada vale ${meses} meses (regras.mesesPorRodada): aqui, "mês" é a rodada inteira, e os juros compõem ${meses} meses.`);
  // A renda esperada do próprio mês, por perfil × rodada × opção: é o que a
  // conferência (h) usa para achar a opção "de maior esforço/renda" do mês.
  const rendaDoMes = new Map(perfis.map((pf) => [pf, {}]));
  // O desgaste do próprio mês (a variação esperada da energia), para o
  // esgotamento da D-059 em (h): medir o esforço pela renda contava o
  // empréstimo do mês 2 (o principal entra como renda) como "a opção de mais
  // esforço" e escondia que a mais cansativa, rodar em dois apps, era a melhor
  // para 4 de 5 personas (revisão da F5, achado 7).
  const energiaDoMes = new Map(perfis.map((pf) => [pf, {}]));
  for (const pf of perfis) {
    const persona = cfg.personas[pf.personaId];
    const itens = persona.basico.itens.map((i) => `${i.rotulo} ${reais(i.valor)}`).join(' + ');
    const outra = persona.outraRenda ? ` · outra renda da casa: ${persona.outraRenda.rotulo} ${reais(persona.outraRenda.valor)}` : '';
    console.log(`\n${pf.rotulo}`);
    console.log(`  básico da casa ${reais(M.totalBasico(persona))}/mês (${itens})${outra}`);
    rodadas.forEach((rodadaId, k) => {
      for (const opcaoId of cfg.rodadas[rodadaId].ordemOpcoes) {
        const soma = Object.fromEntries([...inds, PATRIMONIO].map((i) => [i, 0]));
        const pior = Object.fromEntries([...inds, PATRIMONIO].map((i) => [i, Infinity]));
        const contas = { entrou: 0, gastos: 0, saldoMes: 0, juros: 0, piorEntrou: Infinity, piorGastos: 0, piorSaldo: Infinity, faltou: 0 };
        for (const x of antesPorPerfil.get(pf)[k]) {
          for (const c of M.chances(cfg, ctx(x, pf.equipeId, rodadaId, opcaoId))) {
            const { depois, mes } = M.aplicar(cfg, { ...ctx(x, pf.equipeId, rodadaId, opcaoId), cartaId: c.carta });
            const p = x.p * c.chance;
            for (const i of [...inds, PATRIMONIO]) {
              const variacao = valorDe(depois, i) - valorDe(x.estado, i);
              soma[i] += p * variacao;
              pior[i] = Math.min(pior[i], variacao);
            }
            contas.entrou += p * mes.entrou;
            contas.gastos += p * mes.gastos;
            contas.piorGastos = Math.max(contas.piorGastos, mes.gastos);
            contas.saldoMes += p * mes.saldoMes;
            contas.juros += p * mes.juros;
            contas.piorEntrou = Math.min(contas.piorEntrou, mes.entrou);
            contas.piorSaldo = Math.min(contas.piorSaldo, mes.saldoMes);
            if (mes.saldoMes < 0) contas.faltou += p;
          }
        }
        // A variação do patrimônio, e não do caixa: o empréstimo não é renda do mês.
        (rendaDoMes.get(pf)[rodadaId] ||= {})[opcaoId] = soma[PATRIMONIO];
        if (Object.hasOwn(soma, 'energia')) (energiaDoMes.get(pf)[rodadaId] ||= {})[opcaoId] = soma.energia;
        console.log(`  ${rodadaId} ${opcaoId}  ` + (temEmprestimo ? [...inds, PATRIMONIO] : inds).map((i) => `${i} E ${sinal(soma[i])} pior ${sinal(pior[i])}`).join(' | '));
        console.log(`         entrou E ${reais(contas.entrou)} (pior ${reais(contas.piorEntrou)})`
          + ` · gastos E ${reais(contas.gastos)} (pior ${reais(contas.piorGastos)}) · básico ${reais(M.totalBasico(persona))}`
          + ` · juros E ${reais(contas.juros)} · saldo do mês E ${reais(contas.saldoMes)} (pior ${reais(contas.piorSaldo)})`
          + ` · faltou para o básico em ${pct(contas.faltou)} dos casos`);
      }
    });
  }

  // (c) opção dominante e (d) padrão que premia quem não votou
  console.log('\n== (c) e (d) Opção dominante e piloto automático ==');
  console.log('Critério: indicadores no FIM do jogo, escolhendo a opção naquela rodada e as outras ao acaso.');
  if (temEmprestimo) console.log('"renda" aqui e daqui em diante é o patrimônio: o saldo acumulado menos o empréstimo a pagar (o placar).');
  console.log(`Dominante: vence as outras em todos os indicadores (esperado), ou vence em renda com mais de ${pct(LIMIAR_DOMINANCIA_RENDA)} de probabilidade.`);
  // A melhor opção de cada mês por perfil (a de maior renda final esperada),
  // para a conferência (h).
  const melhorOpcao = new Map(perfis.map((pf) => [pf, {}]));
  for (const pf of perfis) {
    console.log(`\n${pf.rotulo}`);
    rodadas.forEach((rodadaId, k) => {
      const rodada = cfg.rodadas[rodadaId];
      const fim = {};
      for (const opcaoId of rodada.ordemOpcoes) {
        let dist = avancar(antesPorPerfil.get(pf)[k], pf.equipeId, rodadaId, [[opcaoId, 1]], AMOSTRA_FIM);
        for (const seguinte of rodadas.slice(k + 1)) dist = avancar(dist, pf.equipeId, seguinte, uniforme(seguinte), AMOSTRA_FIM);
        fim[opcaoId] = { dist, e: Object.fromEntries([...inds, PATRIMONIO].map((i) => [i, esperado(dist, i)])) };
      }
      console.log(`  ${rodadaId}  ` + rodada.ordemOpcoes.map((o) => `${o}${o === rodada.padrao ? '*' : ''} renda E ${numero.format(fim[o].e[PATRIMONIO])}`).join(' · ') + '   (* = padrão)');
      for (const x of rodada.ordemOpcoes) {
        const outras = rodada.ordemOpcoes.filter((y) => y !== x);
        if (outras.length === 0) continue;
        const venceTudo = outras.every((y) => indsComparados.every((i) => fim[x].e[i] > fim[y].e[i]));
        const probs = outras.map((y) => probabilidadeMaior(fim[x].dist, fim[y].dist, PATRIMONIO));
        const venceRenda = probs.every((p) => p > LIMIAR_DOMINANCIA_RENDA);
        if (venceTudo) avisar(`${pf.nome}, ${rodadaId}: a opção "${x}" é dominante (vence as outras em todos os indicadores).`);
        else if (venceRenda) {
          avisar(`${pf.nome}, ${rodadaId}: a opção "${x}" vence em renda com probabilidade ${probs.map(pct).join(' / ')} contra ${outras.join(' / ')}.`);
        }
      }
      const maiorRenda = Math.max(...rodada.ordemOpcoes.map((o) => fim[o].e[PATRIMONIO]));
      melhorOpcao.get(pf)[rodadaId] = rodada.ordemOpcoes.find((o) => fim[o].e[PATRIMONIO] === maiorRenda);
      if (rodada.ordemOpcoes.length > 1 && fim[rodada.padrao].e[PATRIMONIO] >= maiorRenda - 1e-9) {
        avisar(`${pf.nome}, ${rodadaId}: o padrão "${rodada.padrao}" é a opção de maior renda esperada; o piloto automático premia quem não votou.`);
      }
    });
  }

  // (e) variância explicada
  console.log('\n== (e) Variância da renda final: decisões × cartas ==');
  console.log('Critério: todas as combinações de decisões, igualmente prováveis; cartas pelas chances.');
  console.log('Var total = Var(esperado dado as decisões) + E(Var dado as decisões).');
  console.log(`Faixa sugerida para as decisões: ${pct(FAIXA_DECISOES[0])} a ${pct(FAIXA_DECISOES[1])}.`);
  const todasCombinacoes = rodadas.reduce((n, r) => n * cfg.rodadas[r].ordemOpcoes.length, 1);
  const amostraDePlanos = estimado ? sortearPlanos(cfg, aleatorio) : null;
  const combinacoes = estimado ? amostraDePlanos.planos : produto(rodadas.map((r) => cfg.rodadas[r].ordemOpcoes));
  // No exato, todo plano conta nas médias "ao acaso"; na simulação, só os sorteados.
  const aoAcaso = (combo) => !estimado || amostraDePlanos.sorteados.has(JSON.stringify(combo));
  const padraoCombo = JSON.stringify(rodadas.map((r) => cfg.rodadas[r].padrao));
  if (estimado) console.log(`Estimado: ${combinacoes.length} planos (${PLANOS_SORTEADOS} sorteados de ${numero.format(todasCombinacoes)}, mais o padrão e as trocas da proteção), ${AMOSTRA_PLANO} caminhos cada; a parte das decisões desconta o ruído da amostra.`);
  // A distribuição final de cada combinação fica guardada para a conferência
  // (g): é a conta mais cara do validador, e a (g) usa exatamente a mesma.
  const finaisPorPerfil = new Map();
  for (const pf of perfis) {
    const medias = [];
    const variancias = [];
    const finais = [];
    finaisPorPerfil.set(pf, finais);
    let ruido = 0;
    for (const combo of combinacoes) {
      const n = JSON.stringify(combo) === padraoCombo ? AMOSTRA_PADRAO : AMOSTRA_PLANO;
      let dist = [{ estado: M.estadoInicial(cfg, pf.equipeId), historico: {}, p: 1, bateu: 0, caminho: [] }];
      rodadas.forEach((rodadaId, k) => { dist = avancar(dist, pf.equipeId, rodadaId, [[combo[k], 1]], n); });
      // Na simulação, o pior e o melhor caminho de cada plano também pela
      // busca dirigida: a amostra quase nunca acha os extremos.
      const extremos = estimado ? { pior: dirigido(pf.equipeId, combo, -1), melhor: dirigido(pf.equipeId, combo, 1) } : null;
      finais.push({ combo, dist, extremos, aoAcaso: aoAcaso(combo) });
      if (!aoAcaso(combo)) continue;
      const m = esperado(dist, PATRIMONIO);
      medias.push(m);
      const v = dist.reduce((s, x) => s + x.p * (M.patrimonio(x.estado) - m) ** 2, 0);
      variancias.push(v);
      // A média de n caminhos erra, em variância, v/n: somado entre os planos,
      // esse ruído inflaria a parte das decisões.
      if (estimado) ruido += v / n;
    }
    const mediaGeral = medias.reduce((s, x) => s + x, 0) / medias.length;
    const entre = Math.max(0, medias.reduce((s, x) => s + (x - mediaGeral) ** 2, 0) / medias.length - ruido / medias.length);
    const dentro = variancias.reduce((s, x) => s + x, 0) / variancias.length;
    const total = entre + dentro;
    if (total === 0) {
      console.log(`  ${pf.nome}: a renda final não varia.`);
      continue;
    }
    const fracao = entre / total;
    console.log(`  ${pf.nome}: decisões ${pct(fracao)} · cartas ${pct(dentro / total)}  (${medias.length} combinações${estimado ? ' sorteadas, estimado' : ''})`);
    if (fracao < FAIXA_DECISOES[0] || fracao > FAIXA_DECISOES[1]) {
      avisar(`${pf.nome}: as decisões explicam ${pct(fracao)} da variância da renda, fora da faixa sugerida.`);
    }
  }

  // (f) indicador que chega ao mínimo sem consequência
  console.log('\n== (f) Indicadores que caem até o mínimo ==');
  console.log('Critério: fração das partidas (cada equipe, decisões ao acaso) em que o indicador estava acima do');
  console.log('mínimo e caiu até ele em algum mês. "Com consequência": alguma condição do config lê o indicador.');
  const lidos = indicadoresLidos(cfg);
  inds.forEach((ind, k) => {
    let soma = 0;
    for (const equipeId of cfg.ordem.equipes) {
      const fim = distribuicoesAntes(equipeId)[rodadas.length];
      soma += fim.reduce((s, x) => s + (x.bateu & (1 << k) ? x.p : 0), 0);
    }
    const fracao = soma / cfg.ordem.equipes.length;
    const consequencia = lidos.has(ind) ? 'com consequência' : 'SEM consequência';
    console.log(`  ${ind}: ${pct(fracao)} das partidas (${consequencia})`);
    if (fracao > LIMIAR_MINIMO && !lidos.has(ind)) {
      avisar(`"${ind}" cai até o mínimo em ${pct(fracao)} das partidas, e nenhum efeito ou carta depende dele.`);
    }
  });

  conferirQuemFecha(cfg, perfis, finaisPorPerfil, avisar, estimado);
  conferirMelhorOpcao(cfg, perfis, melhorOpcao, rendaDoMes, energiaDoMes, avisar);
  conferirProtecao(cfg, perfis, finaisPorPerfil, avisar, estimado);
  conferirDivida(cfg, perfis, finaisPorPerfil, avisar, estimado);
  const falhas = conferirContaDoMes(cfg, perfis, antesPorPerfil, ctx, avisar);
  conferirTextosPorPersona(cfg, avisar);
  conferirFormatoSimples(cfg);
  return { avisos: totalAvisos, falhas };
}

// (l) O formato simples (regras.formatoSimples; decisão do Kleber de 05/10 à
// noite): o dinheiro que cada opção mostra (historia.dinheiroDaOpcao, a mesma
// linha do telão e do celular) e as combinações possíveis de cada roteiro
// (motor.enumerarCombinacoes, a mesma conta da última página do placar):
// quantas fecham, a melhor e a pior. Sem sorteio, é tudo exato. Config sem a
// chave: nada.
function conferirFormatoSimples(cfg) {
  if (cfg.regras.formatoSimples !== true) return;
  const H = V.historia;
  const equipeId = cfg.ordem.equipes[0];
  const persona = cfg.equipes[equipeId].persona;
  const per = H.periodo(cfg);
  // A mesma forma do formatar.moeda das telas: o "+" só com { sinal: true }.
  const reais = (v, { sinal = false } = {}) => `${Math.round(v) < 0 ? '−' : sinal && Math.round(v) > 0 ? '+' : ''}R$ ${Math.abs(Math.round(v)).toLocaleString('pt-BR')}`;
  console.log('\n== (l) Formato simples: o dinheiro de cada opção e as combinações possíveis (decisão do Kleber de 05/10) ==');
  for (const r of cfg.ordem.rodadas) {
    const linhas = cfg.rodadas[r].ordemOpcoes.map((o, i) => `${LETRAS[i]} ${H.textoDoDinheiro(H.dinheiroDaOpcao(cfg, r, o, persona), reais, per)}`);
    console.log(`  ${r}: ${linhas.join(' · ')}`);
  }
  const vistos = new Set();
  for (const [nome, passos] of Object.entries(cfg.roteiros)) {
    const rodadas = passos.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
    if (rodadas.length === 0 || vistos.has(rodadas.join())) continue;
    vistos.add(rodadas.join());
    const t0 = performance.now();
    const e = M.enumerarCombinacoes(cfg, { equipeId, rodadas });
    const ms = performance.now() - t0;
    const letras = (c) => c.opcoes.map((o, i) => LETRAS[cfg.rodadas[rodadas[i]].ordemOpcoes.indexOf(o)]).join('');
    console.log(`  roteiro ${nome}: ${e.total.toLocaleString('pt-BR')} combinações, ${e.fecham.toLocaleString('pt-BR')} fecham (patrimônio ≥ 0) · melhor ${letras(e.melhor)} ${reais(e.melhor.valor, { sinal: true })} · pior ${letras(e.pior)} ${reais(e.pior.valor, { sinal: true })} · ${ms.toFixed(0)} ms`);
  }
}

// (k) D-073 e D-075 (teste do Kleber de 05/10): a linha do custo humano embaixo de
// cada opção (impacto/impactoPor) e o título da carta do jeito do personagem
// (tituloPor/curtoPor). É só texto, e não mexe em conta nenhuma: a seção
// mostra, pela mesma regra das telas (historia.textoDaOpcao e textoDaCarta),
// o que cada persona lê, para a revisão do conteúdo. Com o custo humano em
// uso, a opção que deixa alguma persona sem a linha é aviso: a D-073 pede a
// linha embaixo de CADA opção. Config sem nenhum dos campos: duas linhas, e
// nenhum aviso.
function conferirTextosPorPersona(cfg, avisar) {
  const H = V.historia;
  console.log('\n== (k) Custo humano das opções e título das cartas por persona (D-073 e D-075, teste do Kleber de 05/10) ==');
  const personas = [...new Set(cfg.ordem.equipes.map((eq) => cfg.equipes[eq].persona))];
  const nome = (p) => cfg.personas[p].nome;
  const opcoes = cfg.ordem.rodadas.flatMap((r) => cfg.rodadas[r].ordemOpcoes.map((o) => [r, o, cfg.rodadas[r].opcoes[o]]));
  if (!opcoes.some(([, , op]) => op.impacto !== undefined || op.impactoPor !== undefined)) {
    console.log('  Nenhuma opção tem impacto nem impactoPor: as telas não mostram a linha do custo humano.');
  } else {
    let com = 0;
    for (const [r, o, op] of opcoes) {
      console.log(`  ${r} ${o}  geral: ${op.impacto === undefined ? '(nenhum)' : `"${op.impacto}"`}`);
      for (const p of personas) if (Object.hasOwn(op.impactoPor || {}, p)) console.log(`        ${nome(p)}: "${op.impactoPor[p]}"`);
      const sem = personas.filter((p) => H.textoDaOpcao(cfg, r, o, p).impacto === null);
      com += personas.length - sem.length;
      if (sem.length > 0) avisar(`${r} ${o}: sem a linha do custo humano (D-073) para ${sem.map(nome).join(', ')}.`);
    }
    console.log(`  Com a linha do custo humano: ${com} de ${opcoes.length * personas.length} (opção × persona).`);
  }
  const comTitulo = cfg.ordem.cartas.filter((c) => cfg.cartas[c].tituloPor || cfg.cartas[c].curtoPor);
  if (comTitulo.length === 0) console.log('  Nenhuma carta tem tituloPor nem curtoPor: todas as equipes leem o título geral.');
  for (const c of comTitulo) {
    const partes = personas.map((p) => {
      const t = H.textoDaCarta(cfg, c, p);
      return `${nome(p)} "${t.titulo}"${t.curto ? ` (fatia: ${t.curto})` : ''}`;
    });
    console.log(`  ${c}: ${partes.join(' · ')}`);
  }
}

// (g) D-050 e D-058: quem fecha o básico no fim do jogo. "Fechar" é
// terminar com o patrimônio (o saldo acumulado menos o empréstimo a pagar,
// esquema v2.2) em 0 ou mais: o básico já foi cobrado mês a mês, e fechar com
// dinheiro emprestado não é fechar. A D-058 pede também que quem fica só no padrão nunca feche.
// Esquema v3: na simulação, "melhor plano" é o melhor entre os planos
// sorteados, o melhor caminho junta o achado com a busca dirigida de cada
// plano, e "só o padrão nunca fecha" falha também quando a busca dirigida do
// padrão acha um caminho que fecha (ele tem chance acima de 0, mesmo que a
// amostra não o tenha sorteado).
function conferirQuemFecha(cfg, perfis, finaisPorPerfil, avisar, estimado = false) {
  const padrao = cfg.ordem.rodadas.map((r) => cfg.rodadas[r].padrao).join('-');
  const meses = cfg.ordem.rodadas.length * M.mesesPorRodada(cfg);
  console.log(`\n== (g) Quem fecha o básico no fim dos ${meses} meses (D-050, D-058)${estimado ? ', estimado' : ''} ==`);
  console.log('Critério: fecha quem termina com o saldo acumulado menos o empréstimo a pagar ≥ R$ 0. "Ao acaso": todas as combinações de decisões');
  console.log('igualmente prováveis, cartas pelas chances. "Melhor plano": a combinação com a maior chance de fechar.');
  console.log('"Melhor caminho": a maior renda final possível (decisões e cartas), com chance acima de 0.');
  console.log(`"Só o padrão": o plano ${padrao}, o de quem nunca vota.`);
  console.log(`Meta da D-058: de ${pct(FAIXA_FECHAR[0])} a ${pct(FAIXA_FECHAR[1])} ao acaso, em pelo menos ${MIN_PERSONAS_NA_FAIXA} personas; só o padrão, nunca.`);
  let naFaixa = 0;
  for (const pf of perfis) {
    const finais = finaisPorPerfil.get(pf);
    let aoAcaso = 0;
    let melhorPlano = null;
    let melhorCaminho = null;
    let soPadrao = 0;
    let padraoPodeFechar = false;
    const nAoAcaso = finais.filter((f) => f.aoAcaso).length;
    for (const { combo, dist, extremos, aoAcaso: sorteado } of finais) {
      const fecha = dist.reduce((s, x) => s + (M.patrimonio(x.estado) >= 0 ? x.p : 0), 0);
      if (sorteado) aoAcaso += fecha / nAoAcaso;
      if (combo.join('-') === padrao) {
        soPadrao = fecha;
        padraoPodeFechar = Boolean(extremos) && extremos.melhor.renda >= 0;
      }
      if (!melhorPlano || fecha > melhorPlano.fecha) melhorPlano = { combo, fecha };
      for (const x of dist) {
        if (x.p > 0 && (!melhorCaminho || M.patrimonio(x.estado) > melhorCaminho.renda)) melhorCaminho = { renda: M.patrimonio(x.estado), caminho: x.caminho };
      }
      if (extremos && extremos.melhor.renda > melhorCaminho.renda) melhorCaminho = extremos.melhor;
    }
    // Sem nenhum plano que feche, o "melhor" seria só o primeiro da lista.
    const plano = melhorPlano.fecha > 0 ? `melhor plano ${melhorPlano.combo.join('-')} fecha em ${pctFino(melhorPlano.fecha)}` : 'nenhum plano fecha';
    console.log(`  ${pf.nome}: fecha em ${pctFino(aoAcaso)} ao acaso · ${plano}`
      + ` · melhor caminho termina com ${reais(melhorCaminho.renda)} (${melhorCaminho.caminho.join(' → ')})`
      + ` · só o padrão fecha em ${pctFino(soPadrao)}`);
    if (melhorCaminho.renda < 0) {
      avisar(`${pf.nome}: nenhum caminho fecha o básico (o melhor termina com ${reais(melhorCaminho.renda)}); a D-050 pede "quase ninguém", e não "ninguém".`);
    } else if (aoAcaso > FAIXA_FECHAR[1]) {
      avisar(`${pf.nome}: fecha o básico em ${pct(aoAcaso)} das partidas ao acaso, mais que "quase ninguém" (D-058: até ${pct(FAIXA_FECHAR[1])}).`);
    }
    if (soPadrao > 0) {
      avisar(`${pf.nome}: só com o padrão (${padrao}) fecha o básico em ${pctFino(soPadrao)} das partidas; a D-058 pede que quem fica só no padrão nunca feche.`);
    } else if (padraoPodeFechar) {
      avisar(`${pf.nome}: só com o padrão (${padrao}) a amostra não fechou, mas a busca dirigida achou um caminho que fecha; a D-058 pede que quem fica só no padrão nunca feche.`);
    }
    if (aoAcaso >= FAIXA_FECHAR[0] && aoAcaso <= FAIXA_FECHAR[1]) naFaixa += 1;
  }
  if (naFaixa < Math.min(MIN_PERSONAS_NA_FAIXA, perfis.length)) {
    avisar(`só ${naFaixa} persona(s) fecham o básico entre ${pct(FAIXA_FECHAR[0])} e ${pct(FAIXA_FECHAR[1])} das partidas ao acaso; a D-058 pede pelo menos ${MIN_PERSONAS_NA_FAIXA}.`);
  }
}

// (j) D-066: a dívida no fim do jogo, por persona, separada em dívida no
// banco (o cheque especial, que com o limite nunca passa dele), empréstimo,
// contas atrasadas e o que faltou na mesa (custo humano, à parte da dívida).
// Antes do limite, a Rose terminava o ano devendo R$ 35.112 ao banco no piloto
// automático: o aviso pega a volta desse absurdo. O teto: o limite, mais todos
// os empréstimos que o config permite, mais o básico do ano inteiro sem pagar
// (já seria uma casa que não pagou nada em 12 meses). Passar dele só acontece
// com juros compostos sem fim.
function conferirDivida(cfg, perfis, finaisPorPerfil, avisar, estimado = false) {
  const limite = M.limiteDe(cfg);
  const meses = cfg.ordem.rodadas.length * M.mesesPorRodada(cfg);
  const padrao = cfg.ordem.rodadas.map((r) => cfg.rodadas[r].padrao).join('-');
  console.log(`\n== (j) Dívida no fim dos ${meses} meses (D-066)${estimado ? ', estimado' : ''} ==`);
  console.log(limite === null
    ? 'Sem regras.limiteChequeEspecial: o cheque especial não tem limite, e os juros compõem sobre a dívida inteira.'
    : `Limite do cheque especial: ${reais(limite)} (${cfg.regras.limiteFonte}). Corta primeiro: ${cfg.regras.cortarPrimeiro}; multa ${pct(cfg.regras.multaAtraso)}, mora ${pct(cfg.regras.moraMes)} ao mês.`);
  console.log('Critério: E = esperado; pior = o maior valor achado. "Ao acaso": todas as combinações de decisões igualmente prováveis;');
  console.log(`"padrão": o plano ${padrao}. "Faltou na mesa" é comida que não foi comprada (acumulada), e não entra na dívida.`);
  // O maior empréstimo que o config permite, somado por rodada.
  let emprestimos = 0;
  for (const r of cfg.ordem.rodadas) {
    const rodada = cfg.rodadas[r];
    emprestimos += Math.max(0, ...rodada.ordemOpcoes.map((o) => (rodada.opcoes[o].efeitos || [])
      .reduce((t, e) => t + (e && e.emprestimo ? e.emprestimo.valor : 0), 0)));
  }
  const banco = (e) => Math.max(0, -e.renda);
  const valor = (e, id) => Math.max(0, Number(e[id]) || 0);
  const total = (e) => banco(e) + valor(e, 'emprestimo') + valor(e, IND_ATRASADAS);
  const medir = (finais) => {
    const m = { banco: [0, 0], atrasadas: [0, 0], mesa: [0, 0], total: [0, 0] };
    const n = finais.length;
    for (const { dist } of finais) {
      for (const x of dist) {
        for (const [k, v] of [['banco', banco(x.estado)], ['atrasadas', valor(x.estado, IND_ATRASADAS)], ['mesa', valor(x.estado, IND_MESA)], ['total', total(x.estado)]]) {
          m[k][0] += (x.p * v) / n;
          if (x.p > 0 && v > m[k][1]) m[k][1] = v;
        }
      }
    }
    return m;
  };
  const texto = (m) => `banco E ${reais(m.banco[0])} (pior ${reais(m.banco[1])}) · contas atrasadas E ${reais(m.atrasadas[0])} (pior ${reais(m.atrasadas[1])})`
    + ` · faltou na mesa E ${reais(m.mesa[0])} (pior ${reais(m.mesa[1])}) · dívida total E ${reais(m.total[0])} (pior ${reais(m.total[1])})`;
  for (const pf of perfis) {
    const finais = finaisPorPerfil.get(pf);
    const persona = cfg.personas[cfg.equipes[pf.equipeId].persona];
    const teto = (limite || 0) + emprestimos + M.totalBasico(persona) * meses;
    const aoAcaso = medir(finais.filter((f) => f.aoAcaso));
    const doPadrao = medir(finais.filter((f) => f.combo.join('-') === padrao));
    console.log(`  ${pf.nome}: ao acaso ${texto(aoAcaso)}`);
    console.log(`  ${' '.repeat(pf.nome.length)}  padrão   ${texto(doPadrao)}`);
    if (limite !== null && Math.max(aoAcaso.banco[1], doPadrao.banco[1]) > limite) {
      avisar(`${pf.nome}: a dívida no banco passou do limite do cheque especial (${reais(Math.max(aoAcaso.banco[1], doPadrao.banco[1]))} > ${reais(limite)}).`);
    }
    const pior = Math.max(aoAcaso.total[1], doPadrao.total[1]);
    if (pior > teto) {
      avisar(`${pf.nome}: a dívida total chega a ${reais(pior)}, acima do teto de ${reais(teto)} (limite + empréstimos + o básico de ${meses} meses sem pagar): juros compostos sem fim, a D-066 pede o limite.`);
    }
  }
}

// (h) D-051: a melhor opção não pode ser a mesma para todas as personas, e a
// opção de maior esforço/renda não pode estar sempre na mesma letra (a turma
// aprenderia "é sempre a A" no mês 2).
function conferirMelhorOpcao(cfg, perfis, melhorOpcao, rendaDoMes, energiaDoMes, avisar) {
  const rodadas = cfg.ordem.rodadas;
  console.log('\n== (h) A melhor opção muda com a persona, e a letra do esforço muda com o mês (D-051) ==');
  console.log('Melhor opção: a de maior renda final esperada, escolhendo-a naquele mês e as outras ao acaso (a conta de (c)).');
  console.log('Maior esforço/renda: a opção de maior renda esperada no próprio mês (a variação de (b)), na média das personas;');
  console.log('a letra é a posição dela na rodada (A, B, C, D), como no telão.');
  for (const rodadaId of rodadas) {
    const melhores = perfis.map((pf) => melhorOpcao.get(pf)[rodadaId]);
    console.log(`  ${rodadaId} melhor opção: ` + perfis.map((pf, i) => `${pf.nome} ${melhores[i]}`).join(' · '));
    if (perfis.length > 1 && melhores.every((o) => o === melhores[0])) {
      avisar(`${rodadaId}: a melhor opção é a mesma ("${melhores[0]}") para todas as personas; a D-051 pede que ela mude com a persona.`);
    }
  }
  const letras = rodadas.map((rodadaId) => {
    const ordem = cfg.rodadas[rodadaId].ordemOpcoes;
    const media = (o) => perfis.reduce((s, pf) => s + rendaDoMes.get(pf)[rodadaId][o], 0) / perfis.length;
    let maior = ordem[0];
    for (const o of ordem) if (media(o) > media(maior)) maior = o;
    const letra = LETRAS[ordem.indexOf(maior)];
    console.log(`  ${rodadaId} maior esforço/renda no mês: ${letra} ("${maior}", renda E ${reais(media(maior))} no mês)`);
    return letra;
  });
  if (letras.length > 1 && letras.every((l) => l === letras[0])) {
    avisar(`a opção de maior esforço/renda está na letra ${letras[0]} em todos os meses; a D-051 pede que as letras não sigam o mesmo padrão.`);
  }
  // D-059: o esgotamento não pode ser o melhor plano para a maioria. Aqui, por
  // persona: a opção mais cansativa do mês (a de maior perda de energia
  // esperada no próprio mês, a variação de (b)) é também a de maior saldo
  // esperado no fim (a melhor opção, acima)? Empate na energia desempata pela
  // renda do mês. A média das personas, usada nas letras, esconderia a
  // persona para quem o esforço ainda compensa.
  // Até a revisão da F5, o esforço aqui era "a opção de maior renda no mês", e
  // o empréstimo do mês 2 (R$ 1.500 que entram como renda) passava por ele: a
  // conferência dizia que o esforço não era o melhor no mês 2, quando a opção
  // mais cansativa (dois apps) era a melhor para 4 de 5 (achado 7). Config
  // sem o indicador de energia volta à renda.
  const porEnergia = energiaDoMes && [...energiaDoMes.values()].some((m) => Object.keys(m).length > 0);
  console.log(porEnergia
    ? `Esgotamento (D-059): a opção mais cansativa do mês (maior perda de energia esperada; empate pela renda do mês), por persona, contra a melhor opção dela; aviso com ${MIN_PERSONAS_ESGOTAMENTO} ou mais personas no mesmo mês.`
    : `Esgotamento (D-059): a opção de maior renda no mês, por persona, contra a melhor opção dela; aviso com ${MIN_PERSONAS_ESGOTAMENTO} ou mais personas no mesmo mês.`);
  for (const rodadaId of rodadas) {
    const ordem = cfg.rodadas[rodadaId].ordemOpcoes;
    const premia = [];
    const partes = perfis.map((pf) => {
      const renda = rendaDoMes.get(pf)[rodadaId];
      const energia = porEnergia ? energiaDoMes.get(pf)[rodadaId] : null;
      // Mais cansativa: menor variação de energia; empate (1 centésimo) pela renda.
      const maisCansativa = (o, atual) => {
        if (!energia) return renda[o] > renda[atual];
        if (energia[o] < energia[atual] - 1e-2) return true;
        return Math.abs(energia[o] - energia[atual]) <= 1e-2 && renda[o] > renda[atual];
      };
      let esforco = ordem[0];
      for (const o of ordem) if (maisCansativa(o, esforco)) esforco = o;
      const melhor = melhorOpcao.get(pf)[rodadaId];
      if (esforco === melhor) premia.push(pf.nome);
      const quanto = energia ? ` (energia E ${sinal(energia[esforco])})` : '';
      return `${pf.nome} ${esforco}${quanto}${esforco === melhor ? ' é a melhor' : `, a melhor é ${melhor}`}`;
    });
    console.log(`  ${rodadaId} mais cansativa: ${partes.join(' · ')}`);
    if (premia.length >= MIN_PERSONAS_ESGOTAMENTO) {
      avisar(`${rodadaId}: a opção mais cansativa do mês é a de maior saldo esperado para ${premia.length} personas (${premia.join(', ')}); a D-059 pede que o esgotamento deixe de ser o melhor plano para a maioria.`);
    }
  }
}

// (h, continuação) D-059: a proteção vale pelo pior caso que ela evita. Para
// cada opção marcada com protege, por persona: o pior caso e o esperado do fim
// com ela (no plano do padrão, só ela trocada) e sem ela (o plano do padrão), e
// a média, sobre todas as combinações que a usam, do que muda no pior caso e no
// esperado quando ela vira o padrão do mês. É a mesma troca do
// piorCasoSemProtecao do placar. Aviso: nenhuma persona com o pior caso melhor.
// Esquema v3: na simulação, o pior de cada plano junta o achado com a busca
// dirigida, e a média é sobre os planos sorteados que usam a proteção (cada um
// vem com a troca pelo padrão, sortearPlanos).
function conferirProtecao(cfg, perfis, finaisPorPerfil, avisar, estimado = false) {
  const rodadas = cfg.ordem.rodadas;
  console.log('\n== (h) Proteção: o pior caso com e sem as opções que protegem (D-059) ==');
  const protegem = rodadas.flatMap((r) => cfg.rodadas[r].ordemOpcoes.filter((o) => cfg.rodadas[r].opcoes[o].protege === true && o !== cfg.rodadas[r].padrao).map((o) => [r, o]));
  if (protegem.length === 0) {
    console.log('  Nenhuma opção com "protege": true (fora o padrão); nada a comparar.');
    return;
  }
  console.log('Critério: renda final (cartas pelas chances). "Plano padrão": todas as rodadas no padrão, só a proteção trocada.');
  console.log('"Média": sobre todas as combinações que usam a proteção, com ela e com o padrão no lugar dela.');
  const padrao = rodadas.map((r) => cfg.rodadas[r].padrao);
  let algumaMelhora = false;
  for (const pf of perfis) {
    // Chave em JSON, e não com um separador: um id de opção pode ter hífen.
    const porCombo = new Map(finaisPorPerfil.get(pf).map(({ combo, dist, extremos }) => [JSON.stringify(combo), {
      pior: Math.min(dist.reduce((m, x) => Math.min(m, M.patrimonio(x.estado)), Infinity), extremos ? extremos.pior.renda : Infinity),
      esperado: dist.reduce((t, x) => t + x.p * M.patrimonio(x.estado), 0),
    }]));
    for (const [r, o] of protegem) {
      const k = rodadas.indexOf(r);
      const com = porCombo.get(JSON.stringify(padrao.map((p, i) => (i === k ? o : p))));
      const sem = porCombo.get(JSON.stringify(padrao));
      let n = 0;
      let difPior = 0;
      let difEsperado = 0;
      for (const [chave, v] of porCombo) {
        const combo = JSON.parse(chave);
        if (combo[k] !== o) continue;
        const semEla = porCombo.get(JSON.stringify(combo.map((x, i) => (i === k ? padrao[k] : x))));
        if (!semEla) continue;
        n += 1;
        difPior += v.pior - semEla.pior;
        difEsperado += v.esperado - semEla.esperado;
      }
      difPior /= Math.max(n, 1);
      difEsperado /= Math.max(n, 1);
      if (difPior > 1e-9) algumaMelhora = true;
      console.log(`  ${pf.nome}, ${r} ${o} ("${cfg.rodadas[r].opcoes[o].rotulo}"): plano padrão pior${estimado ? ' estimado' : ''} ${reais(com.pior)} com, ${reais(sem.pior)} sem`
        + ` · esperado ${reais(com.esperado)} com, ${reais(sem.esperado)} sem · média: pior ${sinal(difPior)}, esperado ${sinal(difEsperado)}`);
    }
  }
  if (!algumaMelhora) {
    avisar('nenhuma opção que protege melhora o pior caso de alguma persona; a D-059 pede que a proteção valha pelo pior caso que evita.');
  }
}

// (i) A conta do mês em todos os estados alcançáveis × opção × carta (revisão
// de 29/09, 2ª rodada, achados 1, 2 e 9). O rascunho chegou a afirmar que o
// "entrou" nunca ficava negativo, e a enumeração mostrou −R$ 434 na Daiane; o
// trabalho chegou a −R$ 96, com uma "renda perdida" maior que a renda que havia.
// - Com regras.pisoTrabalho, o motor garante trabalho ≥ 0 e renda perdida ≤ o
//   trabalho sem a carta: se falhar, é defeito do motor, e o bin sai com 1.
// - Sem o piso (config v2), trabalho negativo é aviso.
// - "entrou" negativo é aviso (é decisão de conteúdo: a parcela e a
//   mensalidade são custos fixos do trabalho e saem dele mesmo parado), com o
//   pior caso e a chance por mês, ao acaso, para a regressão não voltar calada.
function conferirContaDoMes(cfg, perfis, antesPorPerfil, ctx, avisar) {
  const rodadas = cfg.ordem.rodadas;
  const piso = cfg.regras.pisoTrabalho === true;
  console.log('\n== (i) Conta do mês: trabalho e "entrou" ==');
  console.log('Critério: todos os estados alcançáveis (decisões anteriores ao acaso) × cada opção × cada carta possível.');
  console.log(`Piso do trabalho variável (regras.pisoTrabalho): ${piso ? 'ligado' : 'desligado'}.`);
  let falhas = 0;
  for (const pf of perfis) {
    let piorTrabalho = null;
    let piorEntrou = null;
    let perdaImpossivel = null;
    const chanceEntrouNegativo = {};
    rodadas.forEach((rodadaId, k) => {
      chanceEntrouNegativo[rodadaId] = 0;
      const opcoes = cfg.rodadas[rodadaId].ordemOpcoes;
      for (const x of antesPorPerfil.get(pf)[k]) {
        for (const opcaoId of opcoes) {
          const base = ctx(x, pf.equipeId, rodadaId, opcaoId);
          const semCarta = M.aplicar(cfg, { ...base, cartaId: null }).mes.trabalho;
          for (const c of M.chances(cfg, base)) {
            const { mes, cartaCusto } = M.aplicar(cfg, { ...base, cartaId: c.carta });
            const onde = `${rodadaId} ${opcaoId}/${c.carta}`;
            if (!piorTrabalho || mes.trabalho < piorTrabalho.valor) piorTrabalho = { valor: mes.trabalho, onde };
            if (!piorEntrou || mes.entrou < piorEntrou.valor) piorEntrou = { valor: mes.entrou, onde };
            if (!perdaImpossivel && cartaCusto.rendaPerdida > Math.max(0, semCarta) + 1e-9) {
              perdaImpossivel = { onde, perdida: cartaCusto.rendaPerdida, havia: semCarta };
            }
            if (mes.entrou < 0) chanceEntrouNegativo[rodadaId] += (x.p * c.chance) / opcoes.length;
          }
        }
      }
    });
    if (piso && (piorTrabalho.valor < 0 || perdaImpossivel)) {
      falhas += 1;
      console.log(`  FALHA: ${pf.nome}: trabalho ${reais(piorTrabalho.valor)} (${piorTrabalho.onde})`
        + (perdaImpossivel ? `; renda perdida ${reais(perdaImpossivel.perdida)} com ${reais(perdaImpossivel.havia)} sem a carta (${perdaImpossivel.onde})` : ''));
    } else if (piorTrabalho.valor < 0) {
      avisar(`${pf.nome}: o trabalho do mês fica negativo (pior ${reais(piorTrabalho.valor)}, ${piorTrabalho.onde}); a renda perdida passa da renda que havia. Ligue regras.pisoTrabalho.`);
    } else {
      console.log(`  ${pf.nome}: trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta`);
    }
    if (piorEntrou.valor < 0) {
      const chances = rodadas.map((r) => `${r} ${pctFino(chanceEntrouNegativo[r])}`).join(' · ');
      avisar(`${pf.nome}: o "entrou" fica negativo (pior ${reais(piorEntrou.valor)}, ${piorEntrou.onde}); ao acaso, em ${chances} dos casos`);
    } else {
      console.log(`  ${pf.nome}: "entrou" ≥ R$ 0 em todos os caminhos (pior ${reais(piorEntrou.valor)})`);
    }
  }
  return falhas;
}

// Equipes da mesma persona dão o mesmo resultado, a menos que alguma condição
// cite a equipe: aí cada equipe é um perfil próprio.
function montarPerfis(cfg) {
  const citaEquipe = todasCondicoes(cfg).some((c) => c.equipe !== undefined);
  const grupos = new Map();
  for (const equipeId of cfg.ordem.equipes) {
    const personaId = cfg.equipes[equipeId].persona;
    const chave = citaEquipe ? equipeId : personaId;
    if (!grupos.has(chave)) grupos.set(chave, { equipeId, personaId, equipes: [] });
    grupos.get(chave).equipes.push(equipeId);
  }
  return [...grupos.values()].map((g) => {
    const nome = `${cfg.personas[g.personaId].nome} (${g.personaId})`;
    return { ...g, nome, rotulo: `${nome} · equipe${g.equipes.length > 1 ? 's' : ''} ${g.equipes.join(', ')}` };
  });
}

function todasCondicoes(cfg) {
  const lista = [];
  const deEfeitos = (efeitos) => { for (const e of efeitos || []) if (e.se) lista.push(e.se); };
  for (const id of cfg.ordem.personas) deEfeitos(cfg.personas[id].todoMes);
  for (const id of cfg.ordem.rodadas) {
    const r = cfg.rodadas[id];
    deEfeitos(r.efeitosGerais);
    for (const o of r.ordemOpcoes) deEfeitos(r.opcoes[o].efeitos);
  }
  for (const id of cfg.ordem.cartas) {
    const c = cfg.cartas[id];
    if (c.somenteSe) lista.push(c.somenteSe);
    for (const a of c.ajustesDePeso || []) if (a.se) lista.push(a.se);
    deEfeitos(c.efeitos);
  }
  return lista;
}

// As rodadas citadas por algum decidiu/sorteou: só elas mudam alguma chance ou
// efeito, e por isso só elas entram na chave da distribuição. As rodadas com
// empréstimo também: a parcela de um mês depende de quando ele foi tomado.
function rodadasCitadas(cfg) {
  const citadas = new Set();
  for (const id of cfg.ordem.rodadas) {
    const r = cfg.rodadas[id];
    if (r.ordemOpcoes.some((o) => (r.opcoes[o].efeitos || []).some((e) => e.emprestimo))) citadas.add(id);
  }
  for (const c of todasCondicoes(cfg)) {
    for (const r of Object.keys(c.decidiu || {})) citadas.add(r);
    for (const r of Object.keys(c.sorteou || {})) citadas.add(r);
  }
  return [...citadas];
}

function indicadoresLidos(cfg) {
  const lidos = new Set();
  for (const c of todasCondicoes(cfg)) for (const ind of Object.keys(c.indicador || {})) lidos.add(ind);
  return lidos;
}

// P(X > Y) com X e Y independentes, cada um com a sua distribuição discreta.
// Ordena Y e soma por busca binária: o produto direto passaria de milhões de pares.
function probabilidadeMaior(distX, distY, ind) {
  const ys = distY.map((y) => [valorDe(y.estado, ind), y.p]).sort((a, b) => a[0] - b[0]);
  const acumulada = [];
  let soma = 0;
  for (const [, p] of ys) acumulada.push((soma += p));
  let resultado = 0;
  for (const x of distX) {
    const valor = valorDe(x.estado, ind);
    let lo = 0;
    let hi = ys.length;
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      if (ys[meio][0] < valor) lo = meio + 1;
      else hi = meio;
    }
    if (lo > 0) resultado += x.p * acumulada[lo - 1];
  }
  return resultado;
}

// Esquema v3: os planos da simulação. PLANOS_SORTEADOS planos ao acaso (cada
// opção igualmente provável, como o "ao acaso" do exato), sem repetir; mais o
// plano só do padrão (o "nunca fecha" da D-058) e, para cada opção que protege,
// o padrão com ela e a troca pelo padrão de todo plano sorteado que a usa: a
// conferência da proteção compara cada plano com o mesmo plano sem ela.
function sortearPlanos(cfg, aleatorio) {
  const rodadas = cfg.ordem.rodadas;
  const opcoes = rodadas.map((r) => cfg.rodadas[r].ordemOpcoes);
  const padrao = rodadas.map((r) => cfg.rodadas[r].padrao);
  const total = opcoes.reduce((n, o) => n * o.length, 1);
  const vistos = new Map();
  // Só os sorteados entram nas médias "ao acaso" ((e) e (g)): o padrão e as
  // trocas da proteção não são uma amostra uniforme dos planos.
  const sorteados = new Set();
  const juntar = (combo) => { if (!vistos.has(JSON.stringify(combo))) vistos.set(JSON.stringify(combo), combo); };
  for (let tentativas = 0; sorteados.size < Math.min(PLANOS_SORTEADOS, total) && tentativas < PLANOS_SORTEADOS * 20; tentativas += 1) {
    const combo = opcoes.map((o) => o[Math.floor(aleatorio() * o.length)]);
    juntar(combo);
    sorteados.add(JSON.stringify(combo));
  }
  juntar(padrao);
  const protegem = rodadas.flatMap((r, k) => opcoes[k].filter((o) => cfg.rodadas[r].opcoes[o].protege === true && o !== padrao[k]).map((o) => [k, o]));
  for (const [k, o] of protegem) {
    juntar(padrao.map((p, i) => (i === k ? o : p)));
    for (const combo of [...vistos.values()]) if (combo[k] === o) juntar(combo.map((x, i) => (i === k ? padrao[k] : x)));
  }
  return { planos: [...vistos.values()], sorteados };
}

function produto(listas) {
  return listas.reduce((acc, opcoes) => acc.flatMap((prefixo) => opcoes.map((o) => [...prefixo, o])), [[]]);
}

process.exitCode = principal();
