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
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';

// Faixa sugerida na arquitetura (seção 7, "por exemplo"): abaixo, o jogo vira
// loteria e a decisão não pesa; acima, a sorte some e a mensagem do seminário
// (a vida real depende de sorte) também.
const FAIXA_DECISOES = [0.3, 0.6];
const LIMIAR_DOMINANCIA_RENDA = 0.7;
const LIMIAR_MINIMO = 0.3;

const V = await carregarNucleo();
const M = V.motor;
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const reais = (x) => (x < 0 ? '−R$ ' : 'R$ ') + numero.format(Math.abs(Math.round(x)));
const pct = (x) => numero.format(x * 100) + '%';
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
  console.log(`Sem erros. Hash do config: ${V.validarConfig.hash(r.config)}`);
  const avisos = analisar(r.config);
  console.log(`\n${avisos} aviso(s) de equilíbrio. Avisos não bloqueiam a sala; são para calibrar o jogo.`);
  return 0;
}

function imprimirProblemas(titulo, lista) {
  if (lista.length === 0) return;
  console.log(`\n${titulo} (${lista.length}):`);
  for (const p of lista) console.log(`  - ${p.caminho || '(raiz)'}: ${p.mensagem}`);
}

// ------------------------------------------------------------------ análise

function analisar(cfg) {
  const inds = cfg.ordem.indicadores;
  const rodadas = cfg.ordem.rodadas;
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
      else mapa.set(k, { estado: x.estado, historico: x.historico, p: x.p, bateu: x.bateu });
    }
    return [...mapa.values()];
  };
  const ctx = (x, equipeId, rodadaId, opcaoId) => ({ equipeId, rodadaId, opcaoId, estado: x.estado, historico: x.historico });
  const uniforme = (rodadaId) => {
    const ids = cfg.rodadas[rodadaId].ordemOpcoes;
    return ids.map((id) => [id, 1 / ids.length]);
  };
  // Um mês: cada estado × cada opção (com o peso dela) × cada carta possível.
  const avancar = (dist, equipeId, rodadaId, opcoes) => {
    const saida = [];
    for (const x of dist) {
      for (const [opcaoId, pOpcao] of opcoes) {
        for (const c of M.chances(cfg, ctx(x, equipeId, rodadaId, opcaoId))) {
          const depois = M.aplicar(cfg, { ...ctx(x, equipeId, rodadaId, opcaoId), cartaId: c.carta }).depois;
          let bateu = x.bateu;
          inds.forEach((ind, k) => {
            const { min } = cfg.indicadores[ind];
            if (x.estado[ind] > min && depois[ind] === min) bateu |= 1 << k;
          });
          const historico = { ...x.historico, [rodadaId]: { decisao: opcaoId, carta: c.carta } };
          saida.push({ estado: depois, historico, p: x.p * pOpcao * c.chance, bateu });
        }
      }
    }
    return juntar(saida);
  };
  // Antes da rodada k, com as rodadas anteriores decididas ao acaso.
  const distribuicoesAntes = (equipeId) => {
    const lista = [[{ estado: M.estadoInicial(cfg, equipeId), historico: {}, p: 1, bateu: 0 }]];
    for (const rodadaId of rodadas) lista.push(avancar(lista[lista.length - 1], equipeId, rodadaId, uniforme(rodadaId)));
    return lista;
  };
  const esperado = (dist, ind) => dist.reduce((s, x) => s + x.p * x.estado[ind], 0);

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
  console.log('Contas da casa: "entrou" = trabalho + outra renda; "saldo do mês" = entrou − básico − juros.');
  console.log(`Dívida: juros de ${pct(cfg.regras.jurosDividaMes)} ao mês sobre a dívida que vinha de antes do mês (fonte: ${cfg.regras.jurosFonte}).`);
  for (const pf of perfis) {
    const persona = cfg.personas[pf.personaId];
    const itens = persona.basico.itens.map((i) => `${i.rotulo} ${reais(i.valor)}`).join(' + ');
    const outra = persona.outraRenda ? ` · outra renda da casa: ${persona.outraRenda.rotulo} ${reais(persona.outraRenda.valor)}` : '';
    console.log(`\n${pf.rotulo}`);
    console.log(`  básico da casa ${reais(M.totalBasico(persona))}/mês (${itens})${outra}`);
    rodadas.forEach((rodadaId, k) => {
      for (const opcaoId of cfg.rodadas[rodadaId].ordemOpcoes) {
        const soma = Object.fromEntries(inds.map((i) => [i, 0]));
        const pior = Object.fromEntries(inds.map((i) => [i, Infinity]));
        const contas = { entrou: 0, saldoMes: 0, juros: 0, piorEntrou: Infinity, piorSaldo: Infinity, faltou: 0 };
        for (const x of antesPorPerfil.get(pf)[k]) {
          for (const c of M.chances(cfg, ctx(x, pf.equipeId, rodadaId, opcaoId))) {
            const { depois, mes } = M.aplicar(cfg, { ...ctx(x, pf.equipeId, rodadaId, opcaoId), cartaId: c.carta });
            const p = x.p * c.chance;
            for (const i of inds) {
              const variacao = depois[i] - x.estado[i];
              soma[i] += p * variacao;
              pior[i] = Math.min(pior[i], variacao);
            }
            contas.entrou += p * mes.entrou;
            contas.saldoMes += p * mes.saldoMes;
            contas.juros += p * mes.juros;
            contas.piorEntrou = Math.min(contas.piorEntrou, mes.entrou);
            contas.piorSaldo = Math.min(contas.piorSaldo, mes.saldoMes);
            if (mes.saldoMes < 0) contas.faltou += p;
          }
        }
        console.log(`  ${rodadaId} ${opcaoId}  ` + inds.map((i) => `${i} E ${sinal(soma[i])} pior ${sinal(pior[i])}`).join(' | '));
        console.log(`         entrou E ${reais(contas.entrou)} (pior ${reais(contas.piorEntrou)}) · básico ${reais(M.totalBasico(persona))}`
          + ` · juros E ${reais(contas.juros)} · saldo do mês E ${reais(contas.saldoMes)} (pior ${reais(contas.piorSaldo)})`
          + ` · faltou para o básico em ${pct(contas.faltou)} dos casos`);
      }
    });
  }

  // (c) opção dominante e (d) padrão que premia quem não votou
  console.log('\n== (c) e (d) Opção dominante e piloto automático ==');
  console.log('Critério: indicadores no FIM do jogo, escolhendo a opção naquela rodada e as outras ao acaso.');
  console.log(`Dominante: vence as outras em todos os indicadores (esperado), ou vence em renda com mais de ${pct(LIMIAR_DOMINANCIA_RENDA)} de probabilidade.`);
  for (const pf of perfis) {
    console.log(`\n${pf.rotulo}`);
    rodadas.forEach((rodadaId, k) => {
      const rodada = cfg.rodadas[rodadaId];
      const fim = {};
      for (const opcaoId of rodada.ordemOpcoes) {
        let dist = avancar(antesPorPerfil.get(pf)[k], pf.equipeId, rodadaId, [[opcaoId, 1]]);
        for (const seguinte of rodadas.slice(k + 1)) dist = avancar(dist, pf.equipeId, seguinte, uniforme(seguinte));
        fim[opcaoId] = { dist, e: Object.fromEntries(inds.map((i) => [i, esperado(dist, i)])) };
      }
      console.log(`  ${rodadaId}  ` + rodada.ordemOpcoes.map((o) => `${o}${o === rodada.padrao ? '*' : ''} renda E ${numero.format(fim[o].e.renda)}`).join(' · ') + '   (* = padrão)');
      for (const x of rodada.ordemOpcoes) {
        const outras = rodada.ordemOpcoes.filter((y) => y !== x);
        if (outras.length === 0) continue;
        const venceTudo = outras.every((y) => inds.every((i) => fim[x].e[i] > fim[y].e[i]));
        const probs = outras.map((y) => probabilidadeMaior(fim[x].dist, fim[y].dist, 'renda'));
        const venceRenda = probs.every((p) => p > LIMIAR_DOMINANCIA_RENDA);
        if (venceTudo) avisar(`${pf.nome}, ${rodadaId}: a opção "${x}" é dominante (vence as outras em todos os indicadores).`);
        else if (venceRenda) {
          avisar(`${pf.nome}, ${rodadaId}: a opção "${x}" vence em renda com probabilidade ${probs.map(pct).join(' / ')} contra ${outras.join(' / ')}.`);
        }
      }
      const maiorRenda = Math.max(...rodada.ordemOpcoes.map((o) => fim[o].e.renda));
      if (rodada.ordemOpcoes.length > 1 && fim[rodada.padrao].e.renda >= maiorRenda - 1e-9) {
        avisar(`${pf.nome}, ${rodadaId}: o padrão "${rodada.padrao}" é a opção de maior renda esperada; o piloto automático premia quem não votou.`);
      }
    });
  }

  // (e) variância explicada
  console.log('\n== (e) Variância da renda final: decisões × cartas ==');
  console.log('Critério: todas as combinações de decisões, igualmente prováveis; cartas pelas chances.');
  console.log('Var total = Var(esperado dado as decisões) + E(Var dado as decisões).');
  console.log(`Faixa sugerida para as decisões: ${pct(FAIXA_DECISOES[0])} a ${pct(FAIXA_DECISOES[1])}.`);
  const combinacoes = produto(rodadas.map((r) => cfg.rodadas[r].ordemOpcoes));
  for (const pf of perfis) {
    const medias = [];
    const variancias = [];
    for (const combo of combinacoes) {
      let dist = [{ estado: M.estadoInicial(cfg, pf.equipeId), historico: {}, p: 1, bateu: 0 }];
      rodadas.forEach((rodadaId, k) => { dist = avancar(dist, pf.equipeId, rodadaId, [[combo[k], 1]]); });
      const m = esperado(dist, 'renda');
      medias.push(m);
      variancias.push(dist.reduce((s, x) => s + x.p * (x.estado.renda - m) ** 2, 0));
    }
    const mediaGeral = medias.reduce((s, x) => s + x, 0) / medias.length;
    const entre = medias.reduce((s, x) => s + (x - mediaGeral) ** 2, 0) / medias.length;
    const dentro = variancias.reduce((s, x) => s + x, 0) / variancias.length;
    const total = entre + dentro;
    if (total === 0) {
      console.log(`  ${pf.nome}: a renda final não varia.`);
      continue;
    }
    const fracao = entre / total;
    console.log(`  ${pf.nome}: decisões ${pct(fracao)} · cartas ${pct(dentro / total)}  (${combinacoes.length} combinações)`);
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

  return totalAvisos;
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
// efeito, e por isso só elas entram na chave da distribuição.
function rodadasCitadas(cfg) {
  const citadas = new Set();
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
  const ys = distY.map((y) => [y.estado[ind], y.p]).sort((a, b) => a[0] - b[0]);
  const acumulada = [];
  let soma = 0;
  for (const [, p] of ys) acumulada.push((soma += p));
  let resultado = 0;
  for (const x of distX) {
    const valor = x.estado[ind];
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

function produto(listas) {
  return listas.reduce((acc, opcoes) => acc.flatMap((prefixo) => opcoes.map((o) => [...prefixo, o])), [[]]);
}

process.exitCode = principal();
