// Configs de teste. O config-teste.json é o "jogo completo" (6 equipes, 5
// personas, 3 rodadas); o configMinimo() é o menor config válido, que cada teste
// do motor ajusta para isolar uma regra só. Valores ilustrativos, sem fonte:
// servem para provar a mecânica, não entram na aula.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const PASTA_FIXTURES = dirname(fileURLToPath(import.meta.url));
export const CAMINHO_CONFIG_TESTE = join(PASTA_FIXTURES, 'config-teste.json');

// Lido do disco a cada chamada: os testes de mutação alteram o objeto.
export function lerConfigTeste() {
  return JSON.parse(readFileSync(CAMINHO_CONFIG_TESTE, 'utf8'));
}

export function configMinimo() {
  return {
    versao: 'minimo',
    titulo: 'Mínimo',
    tempos: { enqueteSeg: 60, decisaoSeg: 90, decisaoMinSeg: 45, prorrogacaoSeg: 20 },
    regras: {
      desempate: 'prorrogacao-depois-moeda', cartaPor: 'equipe', mostrarChances: 'no_sorteio',
      placarPadrao: 'efeitoDecisoes', alvoPorEquipe: 3, minPareados: 5, destacarCartas: 2,
    },
    escala: { curtos: ['1', '2', '3', '4', '5'], longos: ['um', 'dois', 'três', 'quatro', 'cinco'] },
    indicadores: [
      { id: 'renda', nome: 'Renda', formato: 'moeda', inicial: 0, min: -10000, max: 100000 },
      { id: 'energia', nome: 'Energia', formato: 'inteiro', inicial: 8, min: 0, max: 10 },
    ],
    personas: [{ id: 'p1', nome: 'Pessoa', descricao: 'Persona de teste', todoMes: [] }],
    equipes: [{ id: 'e1', nome: 'Laranja', cor: '#E69F00', forma: 'circulo', persona: 'p1' }],
    rodadas: [{
      id: 'r1', titulo: 'Mês 1', texto: 'Texto', padrao: 'b',
      opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } },
    }],
    cartas: [{ id: 'normal', titulo: 'Normal', peso: 1, efeitos: [] }],
    enquetes: [],
    roteiros: { '60min': [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'fim' }] },
  };
}

// Valida e devolve o config normalizado; um config de teste inválido é defeito
// do próprio teste, e a mensagem mostra a lista inteira.
export function normalizar(V, bruto) {
  const r = V.validarConfig.validar(bruto);
  if (!r.ok) throw new Error('config de teste inválido:\n' + r.erros.map((e) => `${e.caminho}: ${e.mensagem}`).join('\n'));
  return r.config;
}
