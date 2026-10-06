#!/usr/bin/env node
// As combinações do jogo simples (regras.formatoSimples, D-078), com o MOTOR do
// jogo: sem sorteio, cada combinação de escolhas tem um resultado só, e dá para
// jogar todas (5^6 = 15.625 com 6 bimestres de 5 opções). É de onde saem os
// números de docs/jogo-simples.md, para quem quiser conferir sem acreditar:
// quantas fecham o ano, a melhor, a pior, a mediana, a média, o padrão (ninguém
// votou), a média de cada opção, em quantas combinações cada opção é a melhor
// do bimestre (uma opção que fosse a melhor em todas "dominaria" e mataria a
// conversa) e quantas vezes cada consequência encadeada aparece.
//
// Uso: node bin/combinacoes.mjs [caminho]   (padrão: config.json na raiz; npm run combinacoes)
// O validador (npm run validar, seção l) já dá o total, as que fecham, a melhor
// e a pior; aqui vem o resto. Leva menos de 1 s.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';

const V = await carregarNucleo();
const M = V.motor;
const H = V.historia;
const LETRAS = 'ABCDEFGHIJ';
const reais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const moeda = (v) => `${v < 0 ? '−' : ''}R$ ${reais.format(Math.abs(Math.round(v)))}`;

function principal() {
  const caminho = process.argv[2] ? resolve(process.argv[2]) : join(RAIZ, 'config.json');
  if (!existsSync(caminho)) {
    console.error(`Arquivo não encontrado: ${caminho}`);
    return 1;
  }
  const r = V.validarConfig.validarTexto(readFileSync(caminho, 'utf8'));
  if (!r.ok) {
    console.error(`O config tem erros (rode npm run validar):\n- ${r.erros.join('\n- ')}`);
    return 1;
  }
  const cfg = r.config;
  if (!H.formatoSimples(cfg)) {
    console.error('Este config não é do formato simples (regras.formatoSimples): com sorteio, as combinações não têm um resultado só.');
    return 1;
  }
  const eq = cfg.ordem.equipes[0];
  const rodadas = cfg.ordem.rodadas;
  const opcoesDe = (rid) => cfg.rodadas[rid].ordemOpcoes;
  const letraDe = (k, o) => LETRAS[opcoesDe(rodadas[k]).indexOf(o)];

  // Todas as combinações, em profundidade (cada prefixo é calculado uma vez),
  // guardando as letras, o patrimônio do fim (o "dinheiro da família") e o
  // nome das consequências (o deAntes do motor, agrupado como na tela).
  const todas = [];
  const inicio = performance.now();
  (function descer(k, estado, historico, letras, motivos) {
    if (k === rodadas.length) {
      todas.push({ letras, valor: M.patrimonio(estado), motivos });
      return;
    }
    const rid = rodadas[k];
    for (const o of opcoesDe(rid)) {
      const baralho = M.chances(cfg, { equipeId: eq, rodadaId: rid, opcaoId: o, estado, historico });
      if (baralho.length !== 1) throw new Error(`${rid}: mais de uma carta possível (o formato simples pede uma)`);
      const a = M.aplicar(cfg, { equipeId: eq, rodadaId: rid, opcaoId: o, cartaId: baralho[0].carta, estado, historico });
      const daqui = H.consequenciasDaRodada([{ equipeId: eq, deAntes: a.deAntes }]).map((g) => `${H.rotuloDaRodada(cfg.rodadas[rid].titulo, k)}: ${g.motivo} ${g.valor > 0 ? '+' : ''}${moeda(g.valor)}`);
      descer(k + 1, a.depois, { ...historico, [rid]: { decisao: o, carta: baralho[0].carta } }, letras + letraDe(k, o), [...motivos, ...daqui]);
    }
  })(0, M.estadoInicial(cfg, eq), {}, '', []);
  const ms = performance.now() - inicio;

  const valores = todas.map((x) => x.valor).sort((a, b) => a - b);
  const n = valores.length;
  const quantil = (q) => valores[Math.floor(q * (n - 1))];
  const porLetras = new Map(todas.map((x) => [x.letras, x.valor]));
  const melhor = todas.reduce((a, b) => (b.valor > a.valor ? b : a));
  const pior = todas.reduce((a, b) => (b.valor < a.valor ? b : a));
  const padrao = rodadas.map((rid, k) => letraDe(k, cfg.rodadas[rid].padrao)).join('');

  console.log(`Config: ${caminho} (versão ${cfg.versao}, hash ${V.validarConfig.hash(cfg)})`);
  console.log(`${reais.format(n)} combinações, jogadas no motor em ${Math.round(ms)} ms.`);
  console.log('O número é o dinheiro da família no fim: o caixa menos o cheque especial, o empréstimo e as contas atrasadas.\n');
  console.log(`Fecham o ano (≥ R$ 0): ${reais.format(todas.filter((x) => x.valor >= 0).length)}`);
  console.log(`Melhor: ${melhor.letras} ${moeda(melhor.valor)} · pior: ${pior.letras} ${moeda(pior.valor)}`);
  console.log(`Mediana: ${moeda((valores[(n - 1) >> 1] + valores[n >> 1]) / 2)} · média: ${moeda(valores.reduce((a, b) => a + b, 0) / n)}`);
  console.log(`Percentis: 10% ${moeda(quantil(0.1))} · 25% ${moeda(quantil(0.25))} · 75% ${moeda(quantil(0.75))} · 90% ${moeda(quantil(0.9))}`);
  console.log(`Padrão (ninguém votou, ${padrao}): ${moeda(porLetras.get(padrao))}, ${reais.format(M.lugarEntre(Float64Array.from(valores).reverse(), porLetras.get(padrao)))}º de ${reais.format(n)}`);
  console.log(`As 10 melhores: ${[...todas].sort((a, b) => b.valor - a.valor).slice(0, 10).map((x) => `${x.letras} ${moeda(x.valor)}`).join(' · ')}\n`);

  // Por bimestre: a média do fim de quem escolheu cada opção e em quantas das
  // combinações das outras rodadas ela é a melhor (empate conta para as duas).
  console.log('Por bimestre: a média do fim com cada opção | em quantas combinações das outras rodadas a opção é a melhor');
  let algumaDomina = false;
  rodadas.forEach((rid, k) => {
    const letras = opcoesDe(rid).map((o) => letraDe(k, o));
    const medias = letras.map((L) => {
      const xs = todas.filter((x) => x.letras[k] === L).map((x) => x.valor);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    });
    const vezes = Object.fromEntries(letras.map((L) => [L, 0]));
    let restos = 0;
    for (const x of todas) {
      if (x.letras[k] !== letras[0]) continue;
      restos += 1;
      const vals = letras.map((L) => porLetras.get(x.letras.slice(0, k) + L + x.letras.slice(k + 1)));
      const max = Math.max(...vals);
      vals.forEach((v, i) => { if (v === max) vezes[letras[i]] += 1; });
    }
    const domina = letras.find((L) => vezes[L] === restos);
    if (domina) algumaDomina = true;
    console.log(`  ${H.rotuloDaRodada(cfg.rodadas[rid].titulo, k)}: ${letras.map((L, i) => `${L} ${moeda(medias[i])}`).join(' · ')} | ${letras.map((L) => `${L} ${reais.format(vezes[L])}`).join(' · ')} de ${reais.format(restos)}${domina ? ` | DOMINA: ${domina}` : ''}`);
  });
  console.log(algumaDomina ? 'Há opção que domina em dinheiro (é a melhor em todas as combinações das outras rodadas).' : 'Nenhuma opção domina em dinheiro: a melhor de cada bimestre depende do resto do caminho.');

  const contagem = new Map();
  for (const x of todas) for (const m of new Set(x.motivos)) contagem.set(m, (contagem.get(m) || 0) + 1);
  console.log('\nConsequências encadeadas (em quantas combinações aparecem):');
  for (const [m, c] of contagem) console.log(`  ${m}: ${reais.format(c)}`);
  return 0;
}

process.exitCode = principal();
