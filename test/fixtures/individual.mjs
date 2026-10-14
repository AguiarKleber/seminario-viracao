// A fixture do modo individual (regras.individual; decisão do Kleber de 13/10 à
// noite): a do formato simples (config-simples.json: o Jonas, 3 bimestres × 5
// opções) com a chave individual, 20 vagas e sem "formarEquipes". Usada pelos
// testes sem rede (test/individual.test.mjs) e pelos do emulador
// (test/emulador/individual.test.mjs). Valores ilustrativos, sem fonte.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PASTA_FIXTURES, normalizar } from './configs.mjs';

export const VAGAS = Array.from({ length: 20 }, (_, i) => `e${i + 1}`);

export const lerSimples = () => JSON.parse(readFileSync(join(PASTA_FIXTURES, 'config-simples.json'), 'utf8'));

// O formato simples com a chave individual: vagas de nome neutro (a cor e a
// forma repetem, porque não aparecem), nenhuma obrigatória, e o roteiro sem a
// etapa de formar equipes (o tempo dela vai para o lobby, e a soma não muda).
export function brutoIndividual({ vagas = 20 } = {}) {
  const bruto = lerSimples();
  const base = bruto.equipes;
  bruto.regras.individual = true;
  bruto.equipes = Array.from({ length: vagas }, (_, i) => {
    const molde = base[i % base.length];
    return { id: `e${i + 1}`, nome: `Vaga ${i + 1}`, cor: molde.cor, forma: molde.forma, persona: 'motoboy' };
  });
  for (const passos of Object.values(bruto.roteiros)) {
    const i = passos.findIndex((p) => p.tipo === 'formarEquipes');
    if (i >= 0) {
      passos[0].alvoSeg += passos[i].alvoSeg;
      passos.splice(i, 1);
    }
  }
  // As costas, como no config do dia: um efeito geral de mar–abr com a condição
  // "decidiu", que o motor nomeia no deAntes (na fixture, ele está na carta, e
  // a carta não vai para o deAntes).
  const pauta = bruto.cartas.find((c) => c.id === 'pauta');
  const costas = pauta.efeitos.find((e) => e.se?.decidiu);
  pauta.efeitos = pauta.efeitos.filter((e) => e !== costas);
  bruto.rodadas.find((r) => r.id === 'r2').efeitosGerais = [{ ...costas, rotulo: 'as costas travaram (2 bimestres puxados seguidos): 7 dias parado' }];
  // Um bloco com contexto, itens e fonte, como os blocos de dados do config do dia.
  const bloco = bruto.roteiros['60min'].find((p) => p.tipo === 'bloco');
  bloco.contexto = 'No app não há jornada fixa.';
  bloco.itens = ['44,9 horas por semana.', 'R$ 2.221 por mês.'];
  bloco.fonte = 'IBGE, PNAD 2025 (ilustrativo de teste).';
  return bruto;
}

export const configIndividual = (V) => normalizar(V, brutoIndividual());
