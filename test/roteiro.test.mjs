// Roteiro da aula: passos, subfases, soma dos tempos-alvo e atraso acumulado.
// O config é montado à mão, já normalizado (contratos, seção 1), para o teste não
// depender do validador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';

const { passos, subfasesDe, somaAlvos, atrasoSeg, proximoIndice, indiceValido, linhaDoTempo } = (await carregarNucleo()).roteiro;

const TODOS_OS_TIPOS = ['lobby', 'enquete', 'bloco', 'formarEquipes', 'personas', 'rodada', 'placarFinal', 'comparativo', 'fim'];

// Um config normalizado mínimo. Só `roteiros` importa aqui, mas o formato é o
// completo, para o teste exercitar o mesmo objeto que o anfitrião recebe.
function configNormalizado() {
  return {
    versao: 'teste',
    titulo: 'Seminário de teste',
    tempos: { enqueteSeg: 60, decisaoSeg: 90, decisaoMinSeg: 45, prorrogacaoSeg: 20, gracaSeg: 5, pulsoSeg: 10 },
    regras: {
      desempate: 'prorrogacao-depois-moeda', cartaPor: 'equipe', mostrarChances: 'no_sorteio',
      placarPadrao: 'efeitoDecisoes', alvoPorEquipe: 3, minPareados: 5, destacarCartas: 2,
    },
    escala: {
      curtos: ['Discordo muito', 'Discordo', 'Neutro', 'Concordo', 'Concordo muito'],
      longos: ['Discordo totalmente', 'Discordo', 'Nem concordo nem discordo', 'Concordo', 'Concordo totalmente'],
    },
    indicadores: { renda: { id: 'renda', nome: 'Renda', formato: 'moeda', inicial: 0, min: -1000, max: 1000 } },
    personas: { p1: { id: 'p1', nome: 'Pessoa', descricao: 'Persona de teste', inicial: {}, todoMes: [] } },
    equipes: { e1: { id: 'e1', nome: 'Laranja', cor: '#E69F00', forma: 'circulo', persona: 'p1', obrigatoria: false } },
    rodadas: {
      r1: {
        id: 'r1', titulo: 'Mês 1', texto: 'Situação', padrao: 'a', efeitosGerais: [],
        opcoes: { a: { id: 'a', rotulo: 'Opção A', efeitos: [] } }, ordemOpcoes: ['a'],
      },
    },
    cartas: { normal: { id: 'normal', titulo: 'Mês sem surpresas', peso: 1, ajustesDePeso: [], efeitos: [] } },
    enquetes: {
      entrada: {
        id: 'entrada', titulo: 'Entrada', pareada: true, revelar: 'so_no_comparativo', modo: 'todas',
        afirmacoes: { a1: { id: 'a1', texto: 'Afirmação' } }, ordemAfirmacoes: ['a1'],
      },
    },
    referencias: {},
    roteiros: {
      curto: [
        { tipo: 'lobby', alvoSeg: 180 },
        { tipo: 'enquete', enquete: 'entrada', momento: 'antes', alvoSeg: 120, opcional: true },
        { tipo: 'bloco', titulo: 'Gancho', alvoSeg: 300 },
        { tipo: 'rodada', rodada: 'r1', alvoSeg: 240 },
        { tipo: 'fim' },
      ],
    },
    ordem: {
      indicadores: ['renda'], personas: ['p1'], equipes: ['e1'], rodadas: ['r1'],
      cartas: ['normal'], enquetes: ['entrada'], referencias: [],
    },
  };
}

// ---------- passos ----------

test('passos expande o roteiro com o índice e preserva os campos de cada passo', () => {
  // prepara
  const config = configNormalizado();

  // age
  const lista = passos(config, 'curto');

  // confere
  assert.equal(lista.length, 5);
  assert.deepEqual(lista.map((p) => p.indice), [0, 1, 2, 3, 4]);
  assert.deepEqual(lista[1], { tipo: 'enquete', enquete: 'entrada', momento: 'antes', alvoSeg: 120, opcional: true, indice: 1 });
  assert.deepEqual(lista[3], { tipo: 'rodada', rodada: 'r1', alvoSeg: 240, indice: 3 });
});

test('passos mantém o passo opcional na lista (quem pula é o anfitrião)', () => {
  // prepara
  const config = configNormalizado();

  // age
  const lista = passos(config, 'curto');

  // confere
  assert.equal(lista[1].opcional, true);
  assert.equal(lista[1].tipo, 'enquete');
});

test('passos não altera o config congelado na sala', () => {
  // prepara
  const config = configNormalizado();
  const copia = structuredClone(config);

  // age
  passos(config, 'curto');

  // confere
  assert.deepEqual(config, copia);
});

test('passos aceita cada um dos nove tipos de passo', () => {
  // prepara
  const config = configNormalizado();
  config.roteiros.todos = TODOS_OS_TIPOS.map((tipo) => ({ tipo }));

  // age
  const lista = passos(config, 'todos');

  // confere
  assert.deepEqual(lista.map((p) => p.tipo), TODOS_OS_TIPOS);
});

test('passos recusa tipo desconhecido, inclusive o antigo "jogo" (D-006)', () => {
  // prepara
  const comJogo = configNormalizado();
  comJogo.roteiros.curto[3] = { tipo: 'jogo', alvoSeg: 900 };
  const semTipo = configNormalizado();
  semTipo.roteiros.curto[2] = { alvoSeg: 60 };

  // age / confere
  assert.throws(() => passos(comJogo, 'curto'), /passo 4: tipo desconhecido "jogo"/);
  assert.throws(() => passos(semTipo, 'curto'), /passo 3: tipo desconhecido/);
});

test('passos recusa roteiro que não existe e roteiro vazio', () => {
  // prepara
  const config = configNormalizado();
  config.roteiros.vazio = [];

  // age / confere
  assert.throws(() => passos(config, '120min'), /"120min" não existe/);
  assert.throws(() => passos(config, 'toString'), /não existe/);
  assert.throws(() => passos(config, 'vazio'), /está vazio/);
});

// ---------- subfasesDe ----------

test('subfasesDe: enquete e rodada têm as subfases do fechamento em duas fases', () => {
  // prepara / age
  const daEnquete = subfasesDe('enquete');
  const daRodada = subfasesDe('rodada');

  // confere
  assert.deepEqual([...daEnquete], ['votando', 'fechando', 'apurada']);
  assert.deepEqual([...daRodada], ['decidindo', 'fechando', 'prorrogacao', 'sorteio', 'resultado']);
});

test('subfasesDe: os outros sete tipos têm só "ativo"', () => {
  // prepara
  const outros = TODOS_OS_TIPOS.filter((t) => t !== 'enquete' && t !== 'rodada');

  // age / confere
  assert.equal(outros.length, 7);
  for (const tipo of outros) assert.deepEqual([...subfasesDe(tipo)], ['ativo'], tipo);
});

test('subfasesDe devolve lista que o chamador não consegue alterar', () => {
  // prepara
  const lista = subfasesDe('rodada');

  // age / confere
  assert.throws(() => lista.push('extra'), TypeError);
  assert.equal(subfasesDe('rodada').length, 5);
});

test('subfasesDe recusa tipo desconhecido', () => {
  // age / confere
  assert.throws(() => subfasesDe('jogo'), /desconhecido/);
  assert.throws(() => subfasesDe(undefined), /desconhecido/);
});

// ---------- somaAlvos ----------

test('somaAlvos soma os tempos-alvo, e passo sem alvo conta zero', () => {
  // prepara
  const lista = passos(configNormalizado(), 'curto');

  // age
  const total = somaAlvos(lista);

  // confere: 180 + 120 + 300 + 240 + (fim, sem alvo)
  assert.equal(total, 840);
});

test('somaAlvos de lista vazia é zero', () => {
  // age / confere
  assert.equal(somaAlvos([]), 0);
});

// ---------- atrasoSeg ----------

const INICIO = 1_700_000_000_000;

test('atrasoSeg positivo: a turma chegou ao passo depois do planejado', () => {
  // prepara: planejado chegar à rodada (índice 3) em 180 + 120 + 300 = 600 s
  const lista = passos(configNormalizado(), 'curto');
  const agora = INICIO + 780 * 1000;

  // age
  const atraso = atrasoSeg(lista, 3, INICIO, agora);

  // confere: 3 min de atraso
  assert.equal(atraso, 180);
});

test('atrasoSeg negativo: a turma está adiantada (por exemplo, pulou o "antes")', () => {
  // prepara: chegou ao bloco (índice 2) aos 200 s; o plano era 300 s
  const lista = passos(configNormalizado(), 'curto');

  // age
  const atraso = atrasoSeg(lista, 2, INICIO, INICIO + 200 * 1000);

  // confere
  assert.equal(atraso, -100);
});

test('atrasoSeg zero no horário e, no primeiro passo, é o tempo decorrido', () => {
  // prepara
  const lista = passos(configNormalizado(), 'curto');

  // age
  const noHorario = atrasoSeg(lista, 1, INICIO, INICIO + 180 * 1000);
  const noLobby = atrasoSeg(lista, 0, INICIO, INICIO + 42 * 1000);

  // confere
  assert.equal(noHorario, 0);
  assert.equal(noLobby, 42);
});

test('atrasoSeg recusa índice fora da lista e hora que não é número', () => {
  // prepara
  const lista = passos(configNormalizado(), 'curto');

  // age / confere
  assert.throws(() => atrasoSeg(lista, 5, INICIO, INICIO), RangeError);
  assert.throws(() => atrasoSeg(lista, -1, INICIO, INICIO), RangeError);
  assert.throws(() => atrasoSeg(lista, 1, undefined, INICIO), TypeError);
  assert.throws(() => atrasoSeg(lista, 1, INICIO, NaN), TypeError);
});

// ---------- proximoIndice e indiceValido ----------

test('proximoIndice anda um passo, sem pular o opcional, e dá null depois do último', () => {
  // prepara
  const lista = passos(configNormalizado(), 'curto');

  // age / confere
  assert.equal(proximoIndice(lista, 0), 1);
  assert.equal(proximoIndice(lista, 3), 4);
  assert.equal(proximoIndice(lista, 4), null);
});

test('proximoIndice recusa índice inválido em vez de fingir que o roteiro acabou', () => {
  // prepara
  const lista = passos(configNormalizado(), 'curto');

  // age / confere
  assert.throws(() => proximoIndice(lista, 5), RangeError);
  assert.throws(() => proximoIndice(lista, '1'), RangeError);
});

test('indiceValido aceita só inteiros dentro da lista', () => {
  // prepara
  const lista = passos(configNormalizado(), 'curto');

  // age / confere
  for (const i of [0, 2, 4]) assert.equal(indiceValido(lista, i), true, `índice ${i}`);
  for (const i of [-1, 5, 1.5, '1', NaN, null, undefined]) assert.equal(indiceValido(lista, i), false, `índice ${i}`);
});

// ---------- linhaDoTempo (D-042; rascunho, seção 7, item 15) ----------

// O roteiro de 60 min, com os mesmos tipos de passo, na mesma ordem.
function configComRoteiroLongo() {
  const config = configNormalizado();
  config.enquetes.termometro = { ...config.enquetes.entrada, id: 'termometro', titulo: 'Termômetro', pareada: false };
  config.roteiros.longo = [
    { tipo: 'lobby' },
    { tipo: 'enquete', enquete: 'entrada', momento: 'antes', opcional: true },
    { tipo: 'bloco', titulo: 'Gancho: o lançamento' },
    { tipo: 'bloco', titulo: 'Mapa do seminário' },
    { tipo: 'formarEquipes' },
    { tipo: 'personas' },
    { tipo: 'bloco', titulo: 'Debrief e teoria: a conta' },
    { tipo: 'rodada', rodada: 'r1' },
    { tipo: 'bloco', titulo: 'Contraponto: a Viração' },
    { tipo: 'rodada', rodada: 'r1' },
    { tipo: 'placarFinal' },
    { tipo: 'enquete', enquete: 'termometro', momento: 'unico' },
    { tipo: 'enquete', enquete: 'entrada', momento: 'depois' },
    { tipo: 'comparativo', enquete: 'entrada' },
    { tipo: 'bloco', titulo: 'Fim: quem é o patrão?' },
    { tipo: 'fim' },
  ];
  return config;
}

test('linhaDoTempo: o seminário inteiro, até o último trecho, um item por passo (sem a entrada na sala e a tela do fim)', () => {
  // prepara
  const config = configComRoteiroLongo();
  const lista = passos(config, 'longo');

  // age
  const { itens, agrupado } = linhaDoTempo(config, lista);

  // confere
  assert.equal(agrupado, false);
  assert.deepEqual(itens.map((x) => x.indices), [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14]]);
  assert.deepEqual(itens.map((x) => x.tipo).slice(-5), ['placarFinal', 'enquete', 'enquete', 'comparativo', 'bloco']);
});

test('linhaDoTempo: se não couber, os passos depois do último mês viram um item só, e nenhum some', () => {
  // prepara
  const config = configComRoteiroLongo();
  const lista = passos(config, 'longo');

  // age
  const { itens, agrupado } = linhaDoTempo(config, lista, { maxItens: 12 });

  // confere
  assert.equal(agrupado, true);
  assert.deepEqual(itens.at(-1), { tipo: 'final', indices: [10, 11, 12, 13, 14], palavras: ['debrief', 'termômetro', 'medição', 'fechamento'] });
  assert.deepEqual(itens.slice(0, -1).map((x) => x.indices), [[1], [2], [3], [4], [5], [6], [7], [8], [9]]);
});

test('linhaDoTempo: cabendo no limite, nada é agrupado', () => {
  // prepara
  const config = configComRoteiroLongo();

  // age
  const { agrupado, itens } = linhaDoTempo(config, passos(config, 'longo'), { maxItens: 14 });

  // confere
  assert.equal(agrupado, false);
  assert.equal(itens.length, 14);
});

test('linhaDoTempo: no grupo final, cada bloco entra pela primeira palavra do título, e o último é o fechamento', () => {
  // prepara: o roteiro de 120 min tem dois blocos entre o placar e o termômetro.
  const config = configComRoteiroLongo();
  config.roteiros.longo.splice(11, 0, { tipo: 'bloco', titulo: 'Debrief e teoria: mapa do patrão' }, { tipo: 'bloco', titulo: 'Caminhos: convidado' });
  const lista = passos(config, 'longo');

  // age
  const { itens } = linhaDoTempo(config, lista, { maxItens: 12 });

  // confere
  assert.deepEqual(itens.at(-1).palavras, ['debrief', 'caminhos', 'termômetro', 'medição', 'fechamento']);
});

test('linhaDoTempo: sem mês no roteiro, não há o que agrupar', () => {
  // prepara
  const config = configNormalizado();
  config.roteiros.curto = [{ tipo: 'lobby' }, { tipo: 'bloco', titulo: 'A' }, { tipo: 'bloco', titulo: 'B' }, { tipo: 'fim' }];

  // age
  const { itens, agrupado } = linhaDoTempo(config, passos(config, 'curto'), { maxItens: 1 });

  // confere
  assert.equal(agrupado, false);
  assert.deepEqual(itens.map((x) => x.indices), [[1], [2]]);
});
