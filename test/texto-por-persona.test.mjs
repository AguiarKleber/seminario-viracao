// A D-073 e a D-075 (teste do Kleber de 05/10), no núcleo:
// - D-073: embaixo de cada opção, uma linha curta só com o custo humano, do
//   jeito do personagem (opcao.impacto e opcao.impactoPor), no celular e no
//   telão;
// - D-075: a carta com o título do jeito do personagem ("A moto quebrou", "A bike
//   quebrou"), com a mesma chance (carta.tituloPor e carta.curtoPor).
// O validador (por mutação, a partir do config-teste-v21.json), a regra de
// cada texto (historia.textoDaOpcao, historia.textoDaCarta), a história e as
// telas do celular, e a prova de que nada disso mexe na conta nem no hash de
// um config que não usa os campos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { CAMINHO_CONFIG_TESTE_V21, configMinimo, lerConfigTesteV21, normalizar, PASTA_FIXTURES } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { validar, validarTexto, hash } = V.validarConfig;
const H = V.historia;

const rodada = (b, id) => b.rodadas.find((r) => r.id === id);
const carta = (b, id) => b.cartas.find((c) => c.id === id);
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));
const listar = (lista) => lista.map((p) => `  ${p.caminho}: ${p.mensagem}`).join('\n') || '  (nada)';

const IMPACTO_GERAL = '12 h por dia no sol: chega em casa e os filhos já dormiram';
const IMPACTO_MANICURE = 'Atende até tarde: o punho dói e a filha janta sozinha';
const IMPACTO_COSTUREIRA = 'Recusa encomenda e passa a semana com medo do aluguel';

// O config-teste-v21 com os campos novos: o impacto geral e o da manicure na
// opção r2/a, só o da costureira na r2/b; o acidente com curto geral, título
// da ciclista e da manicure, e curto só da ciclista. Textos ilustrativos.
function comTextos() {
  const b = lerConfigTesteV21();
  const a = rodada(b, 'r2').opcoes.a;
  a.impacto = IMPACTO_GERAL;
  a.impactoPor = { manicure: IMPACTO_MANICURE };
  rodada(b, 'r2').opcoes.b.impactoPor = { costureira: IMPACTO_COSTUREIRA };
  const ac = carta(b, 'acidente');
  ac.curto = 'Acidente';
  ac.tituloPor = { ciclista: 'A bike quebrou', manicure: 'O punho travou de tanto lixar' };
  ac.curtoPor = { ciclista: 'Bike' };
  return b;
}

// ------------------------------------------------------------------ validador

test('validador: impacto, impactoPor, tituloPor e curtoPor entram no normalizado, sem aviso', () => {
  // Act
  const r = validar(comTextos());

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
  const { a, b, c } = r.config.rodadas.r2.opcoes;
  assert.equal(a.impacto, IMPACTO_GERAL);
  assert.deepEqual(a.impactoPor, { manicure: IMPACTO_MANICURE });
  assert.deepEqual(b.impactoPor, { costureira: IMPACTO_COSTUREIRA });
  assert.equal(Object.hasOwn(b, 'impacto'), false);
  assert.equal(Object.hasOwn(c, 'impacto') || Object.hasOwn(c, 'impactoPor'), false, 'opção sem os campos fica como era');
  const ac = r.config.cartas.acidente;
  assert.deepEqual(ac.tituloPor, { ciclista: 'A bike quebrou', manicure: 'O punho travou de tanto lixar' });
  assert.deepEqual(ac.curtoPor, { ciclista: 'Bike' });
  assert.equal(Object.hasOwn(r.config.cartas.normal, 'tituloPor'), false);
});

test('validador: sem os campos novos, o hash de cada fixture é o de antes (medido com o validador de 9c6a958)', () => {
  // Arrange: os hashes saíram do validador da versão 7 publicada (9c6a958),
  // rodado sobre estes mesmos arquivos em 05/10. Mudou um deles? Ou o fixture
  // mudou (e o número aqui muda junto, de propósito), ou o validador passou a
  // normalizar diferente um config que não usa os campos novos, e a sala
  // criada com ele deixaria de bater com o pendrive.
  const ANTES = {
    'config-teste.json': '0098074a',
    'config-teste-v2.json': 'be815838',
    'config-teste-v21.json': 'f030a635',
    'config-teste-v3.json': '0e8fc609',
    'config-teste-v31.json': '21c76b7c',
    'config-real-v22.json': 'fc0c3c35',
    'config-real-v3.json': '19b12a5d',
  };

  for (const [arquivo, esperado] of Object.entries(ANTES)) {
    // Act
    const r = validarTexto(readFileSync(join(PASTA_FIXTURES, arquivo), 'utf8'));

    // Assert
    assert.equal(r.ok, true, `${arquivo}:\n${listar(r.erros)}`);
    assert.equal(hash(r.config), esperado, `${arquivo}: o hash mudou sem os campos novos`);
  }
  // Com os campos, o hash muda: eles são conteúdo, e a sala tem de saber.
  assert.notEqual(hash(normalizar(V, comTextos())), hash(normalizar(V, lerConfigTesteV21())));
});

test('validador: mapa vazio é aviso e não entra no normalizado (o hash não muda)', () => {
  // Arrange
  const b = lerConfigTesteV21();
  rodada(b, 'r2').opcoes.a.impactoPor = {};
  carta(b, 'acidente').tituloPor = {};
  carta(b, 'acidente').curtoPor = {};

  // Act
  const r = validar(b);

  // Assert
  assert.equal(r.ok, true, listar(r.erros));
  for (const caminho of ['rodadas.r2.opcoes.a.impactoPor', 'cartas.acidente.tituloPor', 'cartas.acidente.curtoPor']) {
    assert.ok(achou(r.avisos, caminho, /vazio/), `aviso em ${caminho}\n${listar(r.avisos)}`);
  }
  assert.equal(hash(r.config), hash(normalizar(V, lerConfigTesteV21())));
});

test('validador: os limites exatos passam (impacto 90, título 40, curto 12 com aviso acima de 10)', () => {
  // Arrange: contados por letra, como os outros textos ("é" conta 1).
  const b = comTextos();
  rodada(b, 'r2').opcoes.a.impacto = 'é'.repeat(90);
  rodada(b, 'r2').opcoes.a.impactoPor.manicure = 'x'.repeat(90);
  carta(b, 'acidente').tituloPor.ciclista = 'ã'.repeat(40);
  carta(b, 'acidente').curtoPor.ciclista = 'x'.repeat(12);
  carta(b, 'acidente').curtoPor.manicure = 'y'.repeat(10);

  // Act
  const r = validar(b);

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.ok(achou(r.avisos, 'cartas.acidente.curtoPor.ciclista', /12 caracteres.*quase nunca cabe/), listar(r.avisos));
  assert.equal(achou(r.avisos, 'cartas.acidente.curtoPor.manicure', /caracteres/), false, '10 letras cabem sem aviso');
  assert.equal(r.config.cartas.acidente.curtoPor.ciclista, 'x'.repeat(12), 'com aviso, entra');
});

// [nome, mutação, caminho esperado, mensagem esperada, 'erro' | 'aviso']
const MUTACOES = [
  // opcao.impacto (D-073)
  ['impacto com mais de 90 caracteres', (b) => { rodada(b, 'r2').opcoes.a.impacto = 'x'.repeat(91); }, 'rodadas.r2.opcoes.a.impacto', /91 caracteres.*90/, 'erro'],
  ['impacto vazio', (b) => { rodada(b, 'r2').opcoes.a.impacto = '  '; }, 'rodadas.r2.opcoes.a.impacto', /texto vazio/, 'erro'],
  ['impacto com número', (b) => { rodada(b, 'r2').opcoes.a.impacto = 3; }, 'rodadas.r2.opcoes.a.impacto', /texto/, 'erro'],
  // opcao.impactoPor (D-073)
  ['impactoPor que não é objeto', (b) => { rodada(b, 'r2').opcoes.a.impactoPor = 'cansa'; }, 'rodadas.r2.opcoes.a.impactoPor', /objeto/, 'erro'],
  ['impactoPor de persona inexistente', (b) => { rodada(b, 'r2').opcoes.a.impactoPor.astronauta = 'x'; },
    'rodadas.r2.opcoes.a.impactoPor.astronauta', /persona "astronauta" não existe/, 'erro'],
  ['impactoPor com mais de 90 caracteres', (b) => { rodada(b, 'r2').opcoes.a.impactoPor.manicure = 'x'.repeat(91); },
    'rodadas.r2.opcoes.a.impactoPor.manicure', /91 caracteres.*90/, 'erro'],
  ['impactoPor vazio', (b) => { rodada(b, 'r2').opcoes.a.impactoPor.manicure = ''; }, 'rodadas.r2.opcoes.a.impactoPor.manicure', /texto vazio/, 'erro'],
  // carta.tituloPor (D-075)
  ['tituloPor que não é objeto', (b) => { carta(b, 'acidente').tituloPor = ['A bike quebrou']; }, 'cartas.acidente.tituloPor', /objeto/, 'erro'],
  ['tituloPor de persona inexistente', (b) => { carta(b, 'acidente').tituloPor.constructor = 'x'; },
    'cartas.acidente.tituloPor.constructor', /persona "constructor" não existe/, 'erro'],
  ['tituloPor com mais de 40 caracteres', (b) => { carta(b, 'acidente').tituloPor.ciclista = 'x'.repeat(41); },
    'cartas.acidente.tituloPor.ciclista', /41 caracteres.*40/, 'erro'],
  ['tituloPor vazio', (b) => { carta(b, 'acidente').tituloPor.ciclista = ' '; }, 'cartas.acidente.tituloPor.ciclista', /texto vazio/, 'erro'],
  // carta.curtoPor (D-075): o mesmo teto do curto (D-040)
  ['curtoPor com mais de 12 caracteres', (b) => { carta(b, 'acidente').curtoPor.ciclista = 'x'.repeat(13); },
    'cartas.acidente.curtoPor.ciclista', /13 caracteres.*não cabe na fatia/, 'erro'],
  ['curtoPor com 11 caracteres', (b) => { carta(b, 'acidente').curtoPor.ciclista = 'x'.repeat(11); },
    'cartas.acidente.curtoPor.ciclista', /11 caracteres.*quase nunca cabe/, 'aviso'],
  ['curtoPor de persona inexistente', (b) => { carta(b, 'acidente').curtoPor.astronauta = 'x'; },
    'cartas.acidente.curtoPor.astronauta', /persona "astronauta" não existe/, 'erro'],
  ['curtoPor que não é objeto', (b) => { carta(b, 'acidente').curtoPor = 'Bike'; }, 'cartas.acidente.curtoPor', /objeto/, 'erro'],
  // O curto geral continua com a mesma regra depois da refatoração.
  ['curto geral com mais de 12 caracteres', (b) => { carta(b, 'acidente').curto = 'x'.repeat(13); }, 'cartas.acidente.curto', /13 caracteres.*não cabe na fatia/, 'erro'],
  ['curto geral com 11 caracteres', (b) => { carta(b, 'acidente').curto = 'x'.repeat(11); }, 'cartas.acidente.curto', /11 caracteres.*quase nunca cabe/, 'aviso'],
  // Grafia errada continua aviso de chave desconhecida, como nas outras entidades.
  ['chave desconhecida na carta (titulosPor)', (b) => { carta(b, 'acidente').titulosPor = {}; }, 'cartas.acidente.titulosPor', /chave desconhecida/, 'aviso'],
];

for (const [nome, mutar, caminho, mensagem, tipo] of MUTACOES) {
  test(`mutação 05/10: ${nome} → ${tipo}`, () => {
    // Arrange
    const b = comTextos();
    mutar(b);

    // Act
    const r = validar(b);

    // Assert
    const lista = tipo === 'erro' ? r.erros : r.avisos;
    assert.ok(achou(lista, caminho, mensagem), `esperava ${tipo} em "${caminho}" com ${mensagem}\nerros:\n${listar(r.erros)}\navisos:\n${listar(r.avisos)}`);
    if (tipo === 'erro') assert.equal(r.ok, false);
    else assert.equal(r.ok, true, listar(r.erros));
  });
}

// ------------------------------------------------------------ as regras do texto

const conteudo = normalizar(V, comTextos());

test('textoDaOpcao: o impacto da persona, senão o geral, senão null', () => {
  // Act / Assert
  assert.equal(H.textoDaOpcao(conteudo, 'r2', 'a', 'manicure').impacto, IMPACTO_MANICURE);
  assert.equal(H.textoDaOpcao(conteudo, 'r2', 'a', 'motoboy').impacto, IMPACTO_GERAL, 'sem entrada da persona, o geral');
  assert.equal(H.textoDaOpcao(conteudo, 'r2', 'b', 'costureira').impacto, IMPACTO_COSTUREIRA);
  assert.equal(H.textoDaOpcao(conteudo, 'r2', 'b', 'motoboy').impacto, null, 'sem geral e sem a da persona, null');
  assert.equal(H.textoDaOpcao(conteudo, 'r2', 'z', 'manicure').impacto, null, 'opção que não existe');
  assert.equal(H.textoDaOpcao(conteudo, 'r2', 'a', 'constructor').impacto, IMPACTO_GERAL, 'id "constructor" não acha o construtor');
  // O rótulo e a narrativa continuam pela regra da D-054.
  assert.deepEqual(H.textoDaOpcao(conteudo, 'r2', 'a', 'manicure'),
    { rotulo: 'Aceitar todos os atendimentos', narrativa: 'Atendi até cliente longe e barata.', impacto: IMPACTO_MANICURE });
});

test('textoDaCarta: o título e o curto da persona, senão os da carta', () => {
  // Act / Assert
  assert.deepEqual(H.textoDaCarta(conteudo, 'acidente', 'ciclista'), { titulo: 'A bike quebrou', curto: 'Bike' });
  assert.deepEqual(H.textoDaCarta(conteudo, 'acidente', 'manicure'), { titulo: 'O punho travou de tanto lixar', curto: 'Acidente' }, 'sem curto da persona, o curto geral');
  assert.deepEqual(H.textoDaCarta(conteudo, 'acidente', 'motoboy'), { titulo: 'Acidente: 20 dias parado', curto: 'Acidente' });
  assert.deepEqual(H.textoDaCarta(conteudo, 'normal', 'ciclista'), { titulo: 'Mês sem surpresas', curto: null }, 'carta sem curto: null');
  assert.deepEqual(H.textoDaCarta(conteudo, 'nao_existe', 'ciclista'), { titulo: null, curto: null });
  assert.deepEqual(H.textoDaCarta(conteudo, 'acidente', 'constructor'), { titulo: 'Acidente: 20 dias parado', curto: 'Acidente' });
});

test('curtosDasCartas: o mapa da fatia do sorteio por persona, só com as cartas que têm curto', () => {
  // Act / Assert
  assert.deepEqual(H.curtosDasCartas(conteudo, 'ciclista'), { acidente: 'Bike' });
  assert.deepEqual(H.curtosDasCartas(conteudo, 'motoboy'), { acidente: 'Acidente' });
  assert.deepEqual(H.curtosDasCartas(normalizar(V, lerConfigTesteV21()), 'ciclista'), {}, 'sem curto nenhum, mapa vazio');
});

// ------------------------------------------------- a história e o celular

// O mês 2 gravado: a e2 (ciclista), a e3 (manicure) e a e1 (motoboy)
// escolheram "a" e tiraram o acidente.
const MES = { trabalho: 984, custosFixos: 560, gastos: 400, outraRenda: 0, entrou: 424, basico: 2000, juros: 0, saldoMes: -1976, dividaAntes: 0 };
const resultadoDe = () => ({ decisao: 'a', origem: 'maioria', carta: 'acidente', delta: {}, depois: { renda: -1976, energia: 6, protecao: 0 }, mes: MES });
const RESULTADOS = { r2: { e1: resultadoDe(), e2: resultadoDe(), e3: resultadoDe() } };
const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
const estadoRodada = (subfase) => ({
  geracao: 9, indice: 7, tipo: 'rodada', rodada: 'r2', subfase, abertoEm: 200, prazo: 120_200, equipesTravadas: true, equipesAbertas: TODAS,
});
const entrada = (estado, equipe, cfg = conteudo) => ({
  conteudo: cfg, estado, membro: { entrouEm: 100, equipe }, meusVotos: {}, decisoesDaEquipe: null,
  resultados: RESULTADOS, placar: null, uid: 'eu', agora: 0, meta: { roteiro: '60min', entradaAberta: true },
});

test('historiaDaEquipe: a carta pelo título da persona; a opção só com rótulo e narrativa', () => {
  // Act
  const kaua = H.historiaDaEquipe(conteudo, 'e2', RESULTADOS);
  const rose = H.historiaDaEquipe(conteudo, 'e3', RESULTADOS);
  const jonas = H.historiaDaEquipe(conteudo, 'e1', RESULTADOS);

  // Assert
  assert.equal(kaua[0].carta.titulo, 'A bike quebrou');
  assert.equal(rose[0].carta.titulo, 'O punho travou de tanto lixar');
  assert.equal(jonas[0].carta.titulo, 'Acidente: 20 dias parado');
  // A história conta o que aconteceu; o impacto é da hora de decidir. O
  // formato da opção fica o de antes (o e2e do telão o compara campo a campo).
  assert.deepEqual(rose[0].opcao, { rotulo: 'Aceitar todos os atendimentos', narrativa: 'Atendi até cliente longe e barata.' });
});

test('celular, decisão: o impacto vai junto do rótulo, só na opção que o tem', () => {
  // Act
  const rose = V.alunoLogica.telaDoAluno(entrada(estadoRodada('decidindo'), 'e3'));
  const jonas = V.alunoLogica.telaDoAluno(entrada(estadoRodada('decidindo'), 'e1'));
  const semCampos = V.alunoLogica.telaDoAluno(entrada(estadoRodada('decidindo'), 'e3', normalizar(V, lerConfigTesteV21())));

  // Assert
  assert.equal(rose.tipo, 'decisao');
  assert.deepEqual(rose.dados.opcoes.map((o) => [o.id, o.impacto ?? null]), [['a', IMPACTO_MANICURE], ['b', null], ['c', null], ['d', null]]);
  assert.deepEqual(jonas.dados.opcoes.map((o) => [o.id, o.impacto ?? null]), [['a', IMPACTO_GERAL], ['b', null], ['c', null], ['d', null]]);
  assert.equal(Object.hasOwn(rose.dados.opcoes[1], 'impacto'), false, 'sem impacto, a chave não vem');
  for (const o of semCampos.dados.opcoes) assert.deepEqual(Object.keys(o).sort(), ['id', 'rotulo', 'votos'], 'config sem impacto: as opções de antes');
});

test('celular, resultado e situação: a carta pelo título da persona', () => {
  // Arrange
  const bloco = { tipo: 'bloco', subfase: 'ativo', indice: 8, equipesTravadas: true, equipesAbertas: TODAS };

  // Act
  const kaua = V.alunoLogica.telaDoAluno(entrada(estadoRodada('resultado'), 'e2'));
  const jonas = V.alunoLogica.telaDoAluno(entrada(estadoRodada('resultado'), 'e1'));
  const situacao = V.alunoLogica.telaDoAluno(entrada(bloco, 'e3'));

  // Assert
  assert.equal(kaua.tipo, 'resultado');
  assert.equal(kaua.dados.carta.titulo, 'A bike quebrou');
  assert.equal(jonas.dados.carta.titulo, 'Acidente: 20 dias parado');
  assert.equal(situacao.dados.mes.carta.titulo, 'O punho travou de tanto lixar');
});

// ------------------------------------------- nada disso mexe na conta

test('os textos novos não mudam nenhuma conta: mesma carta, mesmo depois, mesmo placar', () => {
  // Arrange: as mesmas decisões e sementes nos dois configs (com e sem os textos).
  const sem = normalizar(V, lerConfigTesteV21());
  const com = conteudo;
  const decisoes = ['a', 'a', 'b'];

  for (const equipeId of sem.ordem.equipes) {
    let estadoSem = V.motor.estadoInicial(sem, equipeId);
    let estadoCom = V.motor.estadoInicial(com, equipeId);
    const historicoSem = {};
    const historicoCom = {};
    const jogadas = [];
    sem.ordem.rodadas.forEach((rodadaId, i) => {
      // Act
      const pedido = { equipeId, rodadaId, opcaoId: decisoes[i], semente: 20261005 + i };
      const rSem = V.motor.resolverRodada(sem, { ...pedido, estado: estadoSem, historico: historicoSem });
      const rCom = V.motor.resolverRodada(com, { ...pedido, estado: estadoCom, historico: historicoCom });

      // Assert
      assert.deepEqual(rCom.chances, rSem.chances, `${equipeId}/${rodadaId}: as mesmas chances`);
      assert.equal(rCom.carta, rSem.carta, `${equipeId}/${rodadaId}: a mesma carta`);
      assert.deepEqual(rCom.depois, rSem.depois, `${equipeId}/${rodadaId}: o mesmo depois`);
      assert.deepEqual(rCom.mes, rSem.mes, `${equipeId}/${rodadaId}: o mesmo mês`);
      historicoSem[rodadaId] = { decisao: decisoes[i], carta: rSem.carta };
      historicoCom[rodadaId] = { decisao: decisoes[i], carta: rCom.carta };
      jogadas.push({ rodadaId, opcaoId: decisoes[i], cartaId: rSem.carta });
      estadoSem = rSem.depois;
      estadoCom = rCom.depois;
    });
    assert.deepEqual(V.motor.decompor(com, { equipeId, rodadas: jogadas }), V.motor.decompor(sem, { equipeId, rodadas: jogadas }), `${equipeId}: o mesmo placar`);
  }
});

// ------------------------------------------------- o bin (seção k)

function rodarBin(caminho) {
  return spawnSync(process.execPath, [join(RAIZ, 'bin', 'validar-config.mjs'), caminho], { encoding: 'utf8' });
}

// O trecho literal na saída do bin. Literal, e não regex: os títulos têm
// parênteses e "05/10", e a regex sem as barras invertidas (como ficou na
// interrupção de 05/10) nem compilava.
function contem(saida, trecho) {
  assert.ok(saida.includes(trecho), `esperava na saída:\n${trecho}\n--- saída:\n${saida}`);
}

test('bin (k): sem os campos novos, a seção diz que não há, e não avisa', () => {
  // Act
  const saida = rodarBin(CAMINHO_CONFIG_TESTE_V21);

  // Assert
  assert.equal(saida.status, 0, saida.stderr + saida.stdout);
  contem(saida.stdout, '== (k) Custo humano das opções e título das cartas por persona (D-073 e D-075, teste do Kleber de 05/10) ==');
  assert.match(saida.stdout, /Nenhuma opção tem impacto nem impactoPor/);
  assert.match(saida.stdout, /Nenhuma carta tem tituloPor nem curtoPor/);
  assert.doesNotMatch(saida.stdout, /AVISO: .*custo humano/);
});

test('bin (k): o que cada persona lê, e o aviso da opção que deixa alguém sem a linha do custo humano', () => {
  // Arrange: duas personas; na r1, "a" tem o impacto geral e "b" só o da
  // Outra (p2). A carta "normal" tem o título e o curto da Outra.
  const b = configMinimo();
  b.personas.push({ ...structuredClone(b.personas[0]), id: 'p2', nome: 'Outra' });
  b.equipes.push({ id: 'e2', nome: 'Azul', cor: '#0072B2', forma: 'quadrado', persona: 'p2' });
  b.rodadas[0].opcoes.a.impacto = 'Chega em casa e os filhos já dormiram';
  b.rodadas[0].opcoes.b.impactoPor = { p2: 'Passa a semana com medo do aluguel' };
  b.cartas[0].curto = 'Normal';
  b.cartas[0].tituloPor = { p2: 'A bike quebrou' };
  b.cartas[0].curtoPor = { p2: 'Bike' };
  const pasta = mkdtempSync(join(tmpdir(), 'viracao-0510-'));
  try {
    const caminho = join(pasta, 'config.json');
    writeFileSync(caminho, JSON.stringify(b));

    // Act
    const saida = rodarBin(caminho);

    // Assert
    assert.equal(saida.status, 0, saida.stderr + saida.stdout);
    assert.match(saida.stdout, /r1 a {2}geral: "Chega em casa e os filhos já dormiram"/);
    contem(saida.stdout, '  r1 b  geral: (nenhum)\n        Outra: "Passa a semana com medo do aluguel"');
    contem(saida.stdout, 'AVISO: r1 b: sem a linha do custo humano (D-073) para Pessoa.');
    assert.doesNotMatch(saida.stdout, /AVISO: r1 a: sem a linha/);
    contem(saida.stdout, 'Com a linha do custo humano: 3 de 4 (opção × persona).');
    contem(saida.stdout, 'normal: Pessoa "Normal" (fatia: Normal) · Outra "A bike quebrou" (fatia: Bike)');
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
