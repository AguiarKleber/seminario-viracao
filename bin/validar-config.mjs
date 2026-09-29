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
// D-050: "quase ninguém", e não "ninguém", fecha as contas. A faixa é a do
// rascunho do conteúdo (seção 7, item 5, opção a, aprovada na D-050): de 5% a
// 15% de chance de fechar, em pelo menos 2 personas, com as decisões ao acaso.
const FAIXA_FECHAR = [0.05, 0.15];
const MIN_PERSONAS_NA_FAIXA = 2;
const LETRAS = 'ABCDEFGH';

const V = await carregarNucleo();
const M = V.motor;
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
  console.log(`Sem erros. Hash do config: ${V.validarConfig.hash(r.config)}`);
  const { avisos, falhas } = analisar(r.config);
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
  // Um mês: cada estado × cada opção (com o peso dela) × cada carta possível.
  // O caminho (opção e carta de cada mês) só é levado quando a distribuição
  // começa com caminho: [], porque só a conferência (g) precisa dele.
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
          const caminho = x.caminho && [...x.caminho, `${rodadaId} ${opcaoId}/${c.carta}`];
          saida.push({ estado: depois, historico, p: x.p * pOpcao * c.chance, bateu, caminho });
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
  console.log('Contas da casa: "entrou" = trabalho − custos fixos + outra renda; "saldo do mês" = entrou − gastos − básico − juros.');
  console.log('"gastos" = o que um evento custou (conserto, remédio, multa), fora do "entrou" (esquema v2.1).');
  console.log(`Dívida: juros de ${pct(cfg.regras.jurosDividaMes)} ao mês sobre a dívida que vinha de antes do mês (fonte: ${cfg.regras.jurosFonte}).`);
  // A renda esperada do próprio mês, por perfil × rodada × opção: é o que a
  // conferência (h) usa para achar a opção "de maior esforço/renda" do mês.
  const rendaDoMes = new Map(perfis.map((pf) => [pf, {}]));
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
        const contas = { entrou: 0, gastos: 0, saldoMes: 0, juros: 0, piorEntrou: Infinity, piorGastos: 0, piorSaldo: Infinity, faltou: 0 };
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
            contas.gastos += p * mes.gastos;
            contas.piorGastos = Math.max(contas.piorGastos, mes.gastos);
            contas.saldoMes += p * mes.saldoMes;
            contas.juros += p * mes.juros;
            contas.piorEntrou = Math.min(contas.piorEntrou, mes.entrou);
            contas.piorSaldo = Math.min(contas.piorSaldo, mes.saldoMes);
            if (mes.saldoMes < 0) contas.faltou += p;
          }
        }
        (rendaDoMes.get(pf)[rodadaId] ||= {})[opcaoId] = soma.renda;
        console.log(`  ${rodadaId} ${opcaoId}  ` + inds.map((i) => `${i} E ${sinal(soma[i])} pior ${sinal(pior[i])}`).join(' | '));
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
      melhorOpcao.get(pf)[rodadaId] = rodada.ordemOpcoes.find((o) => fim[o].e.renda === maiorRenda);
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
  // A distribuição final de cada combinação fica guardada para a conferência
  // (g): é a conta mais cara do validador, e a (g) usa exatamente a mesma.
  const finaisPorPerfil = new Map();
  for (const pf of perfis) {
    const medias = [];
    const variancias = [];
    const finais = [];
    finaisPorPerfil.set(pf, finais);
    for (const combo of combinacoes) {
      let dist = [{ estado: M.estadoInicial(cfg, pf.equipeId), historico: {}, p: 1, bateu: 0, caminho: [] }];
      rodadas.forEach((rodadaId, k) => { dist = avancar(dist, pf.equipeId, rodadaId, [[combo[k], 1]]); });
      finais.push({ combo, dist });
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

  conferirQuemFecha(cfg, perfis, finaisPorPerfil, avisar);
  conferirMelhorOpcao(cfg, perfis, melhorOpcao, rendaDoMes, avisar);
  const falhas = conferirContaDoMes(cfg, perfis, antesPorPerfil, ctx, avisar);
  return { avisos: totalAvisos, falhas };
}

// (g) D-050: quem fecha o básico no fim dos 3 meses. "Fechar" é terminar com o
// saldo acumulado (a renda) em 0 ou mais: o básico já foi cobrado mês a mês.
function conferirQuemFecha(cfg, perfis, finaisPorPerfil, avisar) {
  console.log('\n== (g) Quem fecha o básico no fim dos 3 meses (D-050) ==');
  console.log('Critério: fecha quem termina com o saldo acumulado ≥ R$ 0. "Ao acaso": todas as combinações de decisões');
  console.log('igualmente prováveis, cartas pelas chances. "Melhor plano": a combinação com a maior chance de fechar.');
  console.log('"Melhor caminho": a maior renda final possível (decisões e cartas), com chance acima de 0.');
  console.log(`Faixa sugerida (rascunho, seção 7, item 5): de ${pct(FAIXA_FECHAR[0])} a ${pct(FAIXA_FECHAR[1])} ao acaso, em pelo menos ${MIN_PERSONAS_NA_FAIXA} personas.`);
  let naFaixa = 0;
  for (const pf of perfis) {
    const finais = finaisPorPerfil.get(pf);
    let aoAcaso = 0;
    let melhorPlano = null;
    let melhorCaminho = null;
    for (const { combo, dist } of finais) {
      const fecha = dist.reduce((s, x) => s + (x.estado.renda >= 0 ? x.p : 0), 0);
      aoAcaso += fecha / finais.length;
      if (!melhorPlano || fecha > melhorPlano.fecha) melhorPlano = { combo, fecha };
      for (const x of dist) {
        if (x.p > 0 && (!melhorCaminho || x.estado.renda > melhorCaminho.renda)) melhorCaminho = { renda: x.estado.renda, caminho: x.caminho };
      }
    }
    // Sem nenhum plano que feche, o "melhor" seria só o primeiro da lista.
    const plano = melhorPlano.fecha > 0 ? `melhor plano ${melhorPlano.combo.join('-')} fecha em ${pctFino(melhorPlano.fecha)}` : 'nenhum plano fecha';
    console.log(`  ${pf.nome}: fecha em ${pctFino(aoAcaso)} ao acaso · ${plano}`
      + ` · melhor caminho termina com ${reais(melhorCaminho.renda)} (${melhorCaminho.caminho.join(' → ')})`);
    if (melhorCaminho.renda < 0) {
      avisar(`${pf.nome}: nenhum caminho fecha o básico (o melhor termina com ${reais(melhorCaminho.renda)}); a D-050 pede "quase ninguém", e não "ninguém".`);
    } else if (aoAcaso > FAIXA_FECHAR[1]) {
      avisar(`${pf.nome}: fecha o básico em ${pct(aoAcaso)} das partidas ao acaso, mais que "quase ninguém" (D-050; faixa até ${pct(FAIXA_FECHAR[1])}).`);
    }
    if (aoAcaso >= FAIXA_FECHAR[0] && aoAcaso <= FAIXA_FECHAR[1]) naFaixa += 1;
  }
  if (naFaixa < Math.min(MIN_PERSONAS_NA_FAIXA, perfis.length)) {
    avisar(`só ${naFaixa} persona(s) fecham o básico entre ${pct(FAIXA_FECHAR[0])} e ${pct(FAIXA_FECHAR[1])} das partidas ao acaso; a faixa sugerida pede pelo menos ${MIN_PERSONAS_NA_FAIXA} (D-050).`);
  }
}

// (h) D-051: a melhor opção não pode ser a mesma para todas as personas, e a
// opção de maior esforço/renda não pode estar sempre na mesma letra (a turma
// aprenderia "é sempre a A" no mês 2).
function conferirMelhorOpcao(cfg, perfis, melhorOpcao, rendaDoMes, avisar) {
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
