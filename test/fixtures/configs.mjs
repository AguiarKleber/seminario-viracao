// Configs de teste. O config-teste.json é o "jogo completo" (6 equipes, 5
// personas, 3 rodadas); o configMinimo() é o menor config válido, que cada teste
// do motor ajusta para isolar uma regra só. Valores ilustrativos, sem fonte:
// servem para provar a mecânica, não entram na aula.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const PASTA_FIXTURES = dirname(fileURLToPath(import.meta.url));
export const CAMINHO_CONFIG_TESTE = join(PASTA_FIXTURES, 'config-teste.json');
// O esquema v2 (D-041 a D-048) exercitado de verdade: básico da casa, outra renda,
// juros da dívida, contexto no celular, 4 opções e consequências entre os meses
// (decidiu/sorteou). O config-teste.json fica com básico zero e sem dívida, para
// os números de referência antigos continuarem valendo.
export const CAMINHO_CONFIG_TESTE_V2 = join(PASTA_FIXTURES, 'config-teste-v2.json');
// O esquema v2.1: custo fixo (fixo), gasto por causa de um evento (categoria
// "gasto"), dias parados da carta e o texto da opção por persona (D-052, D-054).
// É o v2 com esses campos acrescentados, para a diferença ficar só neles.
// Desde a D-059, também a proteção: o MEI (r1 "b") com protege, o INSS do MEI
// no mês 2 (para quem pagou e tirou o acidente no mês 1) e o auxílio do mês 3
// como efeitos de categoria "protecao".
export const CAMINHO_CONFIG_TESTE_V21 = join(PASTA_FIXTURES, 'config-teste-v21.json');
// O esquema v3 (D-060: 12 meses em 6 rodadas bimestrais): regras.mesesPorRodada
// 2, 6 rodadas, 20 cartas (o risco do acidente cresce do bimestre 4 em diante,
// D-063), o MEI que protege, o empréstimo de 6 parcelas no bimestre 2 (pago de
// duas em duas) e as enquetes no formato da matriz de votos (a de entrada no
// modo "todas", o termômetro uma afirmação por vez). Com 6 rodadas, os
// caminhos de cartas passam de 200 mil já na 5ª, e o placar vira estimado.
export const CAMINHO_CONFIG_TESTE_V3 = join(PASTA_FIXTURES, 'config-teste-v3.json');
// O config.json real do teste de 30/09 (v2.2: 3 rodadas mensais, hash fc0c3c35),
// congelado quando o conteúdo passou a 12 meses (D-060). Os testes do empréstimo
// refazem o caminho exato do Jonas naquele dia (faltou R$ 467 no mês 1, pegou
// R$ 1.500 no mês 2); com o config.json novo, esse caminho deixou de existir e
// os testes quebravam por mudança de conteúdo, e não de motor.
export const CAMINHO_CONFIG_REAL_V22 = join(PASTA_FIXTURES, 'config-real-v22.json');

// Lido do disco a cada chamada: os testes de mutação alteram o objeto.
export function lerConfigTeste() {
  return JSON.parse(readFileSync(CAMINHO_CONFIG_TESTE, 'utf8'));
}

export function lerConfigTesteV2() {
  return JSON.parse(readFileSync(CAMINHO_CONFIG_TESTE_V2, 'utf8'));
}

export function lerConfigTesteV21() {
  return JSON.parse(readFileSync(CAMINHO_CONFIG_TESTE_V21, 'utf8'));
}

export function lerConfigTesteV3() {
  return JSON.parse(readFileSync(CAMINHO_CONFIG_TESTE_V3, 'utf8'));
}

// Em texto, para passar por validarTexto do mesmo jeito que o config.json passa.
export function textoConfigRealV22() {
  return readFileSync(CAMINHO_CONFIG_REAL_V22, 'utf8');
}

export function configMinimo() {
  return {
    versao: 'minimo',
    titulo: 'Mínimo',
    tempos: { enqueteSeg: 60, decisaoSeg: 90, decisaoMinSeg: 45, prorrogacaoSeg: 20 },
    regras: {
      desempate: 'prorrogacao-depois-moeda', cartaPor: 'equipe', mostrarChances: 'no_sorteio',
      placarPadrao: 'efeitoDecisoes', alvoPorEquipe: 3, minPareados: 5, destacarCartas: 2,
      jurosDividaMes: 0.1, jurosFonte: 'teste',
    },
    escala: { curtos: ['1', '2', '3', '4', '5'], longos: ['um', 'dois', 'três', 'quatro', 'cinco'] },
    indicadores: [
      { id: 'renda', nome: 'Renda', formato: 'moeda', inicial: 0, min: -10000, max: 100000 },
      { id: 'energia', nome: 'Energia', formato: 'inteiro', inicial: 8, min: 0, max: 10 },
    ],
    // Básico zero: cada teste do motor liga o básico só quando é a regra em teste.
    personas: [{
      id: 'p1', nome: 'Pessoa', descricao: 'Persona de teste', todoMes: [],
      familia: { descricao: 'Mora sozinha.', pessoas: 1 },
      basico: { itens: [{ rotulo: 'nada', valor: 0, fonte: 'teste' }] },
    }],
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

// O esquema v3.1 (D-066: o cheque especial tem limite): a fixture v3 com
// regras.limiteChequeEspecial 1.500, multa de 10%, mora de 1% ao mês, os
// indicadores contas_atrasadas e faltou_na_mesa e o item da comida marcado no
// básico de cada persona (na Dani, o único item, "aluguel e comida": prova a
// borda em que não há conta do período para atrasar antes da comida). Valores
// ilustrativos, sem fonte.
export const CAMINHO_CONFIG_TESTE_V31 = join(PASTA_FIXTURES, 'config-teste-v31.json');

export function lerConfigTesteV31() {
  return JSON.parse(readFileSync(CAMINHO_CONFIG_TESTE_V31, 'utf8'));
}
