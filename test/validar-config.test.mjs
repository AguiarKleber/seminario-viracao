// O validador do config (contratos seção 1; arquitetura seção 7, "O validador").
// Validação por mutação: parte do config de teste, que é válido, e quebra uma
// coisa por vez. Cada quebra precisa gerar a mensagem certa, no caminho certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { PASTA_FIXTURES, configMinimo, lerConfigTeste } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { validar, validarTexto, hash } = V.validarConfig;

const lerTexto = (nome) => readFileSync(join(PASTA_FIXTURES, nome), 'utf8');
const carta = (b, id) => b.cartas.find((c) => c.id === id);
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));
const listar = (lista) => lista.map((p) => `  ${p.caminho}: ${p.mensagem}`).join('\n') || '  (nada)';

test('o config de teste é válido, sem nenhum aviso', () => {
  // Act
  const r = validar(lerConfigTeste());

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
  assert.equal(r.ok, true);
});

test('normaliza listas em mapas por id, com a ordem num array', () => {
  // Act
  const { config } = validar(lerConfigTeste());

  // Assert
  assert.deepEqual(config.ordem.equipes, ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
  assert.deepEqual(config.ordem.rodadas, ['r1', 'r2', 'r3']);
  assert.deepEqual(config.ordem.referencias, ['clt']);
  assert.equal(config.personas.ciclista.nome, 'Dani');
  // As opções aceitam mapa (r1) e lista (r3); nos dois casos a ordem é a do arquivo.
  assert.deepEqual(config.rodadas.r1.ordemOpcoes, ['a', 'b', 'c']);
  assert.deepEqual(config.rodadas.r3.ordemOpcoes, ['a', 'b', 'c']);
  assert.equal(config.rodadas.r3.opcoes.b.rotulo, 'Pegar empréstimo');
  assert.equal(config.rodadas.r1.opcoes.a.id, 'a');
  assert.deepEqual(config.enquetes.entrada.ordemAfirmacoes, ['a1', 'a2', 'a3']);
});

test('aplica os valores padrão que o JSON pode omitir', () => {
  // Act
  const { config } = validar(lerConfigTeste());

  // Assert
  assert.equal(config.tempos.gracaSeg, 5);
  assert.equal(config.tempos.pulsoSeg, 10);
  assert.equal(config.equipes.e2.obrigatoria, false);
  assert.equal(config.equipes.e1.obrigatoria, true);
  assert.deepEqual(config.rodadas.r1.efeitosGerais, []);
  assert.deepEqual(config.cartas.normal.ajustesDePeso, []);
  assert.deepEqual(config.personas.motoboy.inicial, {});
  assert.deepEqual(config.personas.costureira.todoMes, [{ soma: { renda: 1500 } }]);
  assert.equal(config.enquetes.termometro.modo, 'todas');
  assert.equal(config.enquetes.entrada.modo, 'uma_por_vez');
  const semRevelar = lerConfigTeste();
  delete semRevelar.enquetes[1].revelar;
  delete semRevelar.referencias;
  const r = validar(semRevelar);
  assert.equal(r.config.enquetes.termometro.revelar, 'ao_encerrar');
  assert.deepEqual(r.config.referencias, {});
});

test('persona compartilhada por duas equipes é permitida (D-004)', () => {
  // Arrange: no config de teste, e1 e e6 são a mesma persona.
  const b = lerConfigTeste();

  // Act
  const r = validar(b);

  // Assert
  assert.equal(b.equipes[0].persona, b.equipes[5].persona);
  assert.equal(r.ok, true);
  assert.ok(!r.avisos.some((a) => a.caminho.startsWith('personas.motoboy')));
});

// [nome, mutação, caminho esperado, mensagem esperada, 'erro' | 'aviso']
const MUTACOES = [
  ['campo obrigatório ausente', (b) => { delete b.titulo; }, 'titulo', /obrigatório/, 'erro'],
  ['id repetido', (b) => { b.personas.push({ ...b.personas[0] }); }, 'personas.motoboy', /id repetido/, 'erro'],
  ['id fora do formato', (b) => { b.personas[4].id = 'Costureira'; }, 'personas[4].id', /id inválido "Costureira"/, 'erro'],
  ['id de equipe fora do padrão', (b) => { b.equipes[1].id = 'time2'; }, 'equipes[1].id', /e seguido de 1 ou 2 algarismos/, 'erro'],
  ['id "__proto__"', (b) => { carta(b, 'normal').id = '__proto__'; }, 'cartas[0].id', /reservado/, 'erro'],
  ['persona inexistente na equipe', (b) => { b.equipes[0].persona = 'astronauta'; }, 'equipes.e1.persona', /persona "astronauta" não existe/, 'erro'],
  ['padrão inexistente', (b) => { b.rodadas[0].padrao = 'z'; }, 'rodadas.r1.padrao', /"z" não existe/, 'erro'],
  ['indicador inexistente no efeito', (b) => { b.rodadas[0].opcoes.a.efeitos[0].multiplica = { grana: 2 }; },
    'rodadas.r1.opcoes.a.efeitos[0].multiplica.grana', /indicador "grana" não existe/, 'erro'],
  ['opção inexistente na condição', (b) => { carta(b, 'acidente').ajustesDePeso[0].se.opcao = 'z'; },
    'cartas.acidente.ajustesDePeso[0].se.opcao', /opção "z" não existe/, 'erro'],
  ['persona inexistente na condição', (b) => { carta(b, 'multa').somenteSe.persona = ['motoboy', 'piloto']; },
    'cartas.multa.somenteSe.persona[1]', /persona "piloto" não existe/, 'erro'],
  ['indicador inexistente na condição', (b) => { carta(b, 'doenca').somenteSe = { indicador: { humor: { abaixoDe: 2 } } }; },
    'cartas.doenca.somenteSe.indicador.humor', /indicador "humor" não existe/, 'erro'],
  ['rodada inexistente na carta', (b) => { carta(b, 'acidente').rodadas = ['r2', 'r9']; }, 'cartas.acidente.rodadas[1]', /rodada "r9" não existe/, 'erro'],
  ['lista de rodadas vazia', (b) => { carta(b, 'acidente').rodadas = []; }, 'cartas.acidente.rodadas', /lista vazia/, 'erro'],
  ['lista vazia na condição', (b) => { carta(b, 'multa').somenteSe.persona = []; }, 'cartas.multa.somenteSe.persona', /lista não vazia/, 'erro'],
  ['enquete inexistente no roteiro', (b) => { b.roteiros['60min'][1].enquete = 'saida'; }, 'roteiros.60min[1].enquete', /enquete "saida" não existe/, 'erro'],
  ['rodada inexistente no roteiro', (b) => { b.roteiros['60min'][5].rodada = 'r7'; }, 'roteiros.60min[5].rodada', /rodada "r7" não existe/, 'erro'],
  ['rodada repetida no roteiro', (b) => { b.roteiros['60min'][9].rodada = 'r2'; }, 'roteiros.60min[9]', /aparece duas vezes/, 'erro'],
  ['nome de roteiro inválido', (b) => { b.roteiros['60 min.'] = b.roteiros['60min']; }, 'roteiros.60 min.', /nome de roteiro inválido/, 'erro'],
  ['peso negativo', (b) => { carta(b, 'chuva').peso = -1; }, 'cartas.chuva.peso', /maior ou igual a 0/, 'erro'],
  ['peso fracionário', (b) => { carta(b, 'chuva').peso = 2.5; }, 'cartas.chuva.peso', /inteiro/, 'erro'],
  ['nenhuma carta possível', (b) => {
    for (const id of ['normal', 'chuva', 'bonus']) carta(b, id).ajustesDePeso = [{ se: { opcao: 'b', rodada: 'r1' }, multiplica: 0 }];
  }, 'rodadas.r1.opcoes.b', /nenhuma carta possível para a persona "ciclista"/, 'erro'],
  ['chave com espaço ("soma ")', (b) => { carta(b, 'chuva').efeitos[0] = { 'soma ': { renda: -300 } }; },
    'cartas.chuva.efeitos[0].soma ', /chave desconhecida "soma "/, 'erro'],
  ['efeito sem soma nem multiplica', (b) => { carta(b, 'chuva').efeitos[0] = { rotulo: 'nada' }; },
    'cartas.chuva.efeitos[0]', /sem "soma" nem "multiplica"/, 'erro'],
  ['soma e multiplica no mesmo efeito', (b) => { carta(b, 'chuva').efeitos[0].multiplica = { renda: 2 }; },
    'cartas.chuva.efeitos[0]', /no mesmo efeito/, 'erro'],
  ['chave desconhecida na condição', (b) => { carta(b, 'doenca').somenteSe.quando = 'sempre'; },
    'cartas.doenca.somenteSe.quando', /chave desconhecida "quando"/, 'erro'],
  ['chave desconhecida no limite', (b) => { carta(b, 'doenca').somenteSe.indicador.energia = { menorQue: 5 }; },
    'cartas.doenca.somenteSe.indicador.energia.menorQue', /chave desconhecida/, 'erro'],
  ['ajuste sem condição', (b) => { carta(b, 'bonus').ajustesDePeso[0] = { soma: 5 }; },
    'cartas.bonus.ajustesDePeso[0].se', /obrigatório/, 'erro'],
  ['número como texto', (b) => { carta(b, 'chuva').efeitos[0].soma.renda = '-300'; },
    'cartas.chuva.efeitos[0].soma.renda', /número finito/, 'erro'],
  ['número não finito', (b) => { b.indicadores[0].max = Infinity; }, 'indicadores.renda.max', /número finito/, 'erro'],
  ['inicial fora dos limites', (b) => { b.indicadores[1].inicial = 11; }, 'indicadores.energia.inicial', /fora dos limites \[0, 10\]/, 'erro'],
  ['inicial da persona fora dos limites', (b) => { b.personas[1].inicial.energia = 12; },
    'personas.ciclista.inicial.energia', /fora dos limites/, 'erro'],
  ['min maior que max', (b) => { b.indicadores[2].min = 10; b.indicadores[2].max = 0; }, 'indicadores.protecao', /menor que "max"/, 'erro'],
  ['tempo fracionário', (b) => { b.tempos.decisaoSeg = 90.5; }, 'tempos.decisaoSeg', /inteiro/, 'erro'],
  ['tempo zero', (b) => { b.tempos.prorrogacaoSeg = 0; }, 'tempos.prorrogacaoSeg', /maior que 0/, 'erro'],
  ['escala com 4 rótulos', (b) => { b.escala.curtos.pop(); }, 'escala.curtos', /exatamente 5/, 'erro'],
  ['rótulo vazio na escala', (b) => { b.escala.longos[2] = ''; }, 'escala.longos[2]', /texto vazio/, 'erro'],
  ['cor inválida', (b) => { b.equipes[0].cor = 'laranja'; }, 'equipes.e1.cor', /hexadecimal/, 'erro'],
  ['cor repetida (maiúscula e minúscula)', (b) => { b.equipes[1].cor = '#e69f00'; }, 'equipes.e2.cor', /cor repetida com a equipe "e1"/, 'erro'],
  ['forma repetida', (b) => { b.equipes[2].forma = 'Circulo'; }, 'equipes.e3.forma', /forma repetida com a equipe "e1"/, 'erro'],
  ['sete equipes', (b) => { b.equipes.push({ id: 'e7', nome: 'Roxa', cor: '#CC79A7', forma: 'cruz', persona: 'costureira' }); },
    'equipes', /máximo é 6/, 'erro'],
  ['texto vazio', (b) => { b.rodadas[1].texto = '   '; }, 'rodadas.r2.texto', /texto vazio/, 'erro'],
  ['texto opcional vazio', (b) => { carta(b, 'normal').narrativa = ''; }, 'cartas.normal.narrativa', /texto vazio/, 'erro'],
  ['efeitos ausentes na carta', (b) => { delete carta(b, 'normal').efeitos; }, 'cartas.normal.efeitos', /obrigatório/, 'erro'],
  ['tipo de passo inválido', (b) => { b.roteiros['60min'][2].tipo = 'jogo'; }, 'roteiros.60min[2].tipo', /tipo de passo "jogo" inválido/, 'erro'],
  ['momento inválido', (b) => { b.roteiros['60min'][1].momento = 'durante'; }, 'roteiros.60min[1].momento', /momento "durante" inválido/, 'erro'],
  ['enquete sem momento', (b) => { delete b.roteiros['60min'][1].momento; }, 'roteiros.60min[1].momento', /obrigatório/, 'erro'],
  ['falta o indicador renda', (b) => {
    b.indicadores.shift();
    for (const p of b.personas) p.todoMes = [];
  }, 'indicadores', /falta o indicador "renda"/, 'erro'],
  ['regra que não foi decidida', (b) => { b.regras.cartaPor = 'jogador'; }, 'regras.cartaPor', /inválido/, 'erro'],
  ['critério de placar desconhecido', (b) => { b.regras.placarPadrao = 'felicidade'; }, 'regras.placarPadrao', /inválido/, 'erro'],
  ['tom desconhecido', (b) => { carta(b, 'acidente').tom = 'leve'; }, 'cartas.acidente.tom', /único tom é "grave"/, 'erro'],
  // Ordem do roteiro (arquitetura seção 5): rodada antes das equipes joga sem equipe nenhuma.
  ['rodada antes do formarEquipes', (b) => { const [r] = b.roteiros['60min'].splice(5, 1); b.roteiros['60min'].splice(2, 0, r); },
    'roteiros.60min[2]', /antes do "formarEquipes"/, 'erro'],
  ['personas antes do formarEquipes', (b) => { const p = b.roteiros['60min']; [p[3], p[4]] = [p[4], p[3]]; },
    'roteiros.60min[3]', /antes do "formarEquipes"/, 'erro'],
  ['dois formarEquipes', (b) => { b.roteiros['60min'].splice(6, 0, { tipo: 'formarEquipes', alvoSeg: 60 }); },
    'roteiros.60min[6]', /mais de um "formarEquipes"/, 'erro'],
  ['"depois" antes do "antes"', (b) => { const p = b.roteiros['60min']; [p[1], p[13]] = [p[13], p[1]]; },
    'roteiros.60min[1]', /"depois" da enquete "entrada" vem antes do "antes"/, 'erro'],
  ['comparativo antes do "depois"', (b) => { const [c] = b.roteiros['60min'].splice(14, 1); b.roteiros['60min'].splice(12, 0, c); },
    'roteiros.60min[12]', /comparativo.*antes do "depois"/, 'aviso'],
  // O RTDB devolve um mapa de chaves só numéricas como lista: o conteúdo lido
  // da sala deixaria de ter o hash do config normalizado.
  ['id só com algarismos', (b) => { b.enquetes[1].afirmacoes[0].id = '1'; },
    'enquetes.termometro.afirmacoes[0].id', /id inválido "1"/, 'erro'],
  ['nome de roteiro só com algarismos', (b) => { b.roteiros['60'] = b.roteiros['60min']; }, 'roteiros.60', /nome de roteiro inválido/, 'erro'],
  ['afirmação com mais de 110 caracteres', (b) => { b.enquetes[0].afirmacoes[0].texto = 'x'.repeat(111); },
    'enquetes.entrada.afirmacoes.a1.texto', /mais de 110/, 'aviso'],
  ['persona sem equipe', (b) => { b.equipes[4].persona = 'motorista'; }, 'personas.costureira', /não tem equipe/, 'aviso'],
  ['chave desconhecida fora dos efeitos', (b) => { b.comentario = 'rascunho'; }, 'comentario', /chave desconhecida/, 'aviso'],
  ['enquete não pareada com momento "antes"', (b) => { b.roteiros['60min'][12].momento = 'antes'; },
    'roteiros.60min[12]', /não é pareada/, 'aviso'],
  ['tempos-alvo acima do teto do roteiro', (b) => { b.roteiros['60min'][2].alvoSeg = 3000; }, 'roteiros.60min', /passa de 60 min/, 'aviso'],
  ['rodada com uma opção só', (b) => { b.rodadas[0].opcoes = { c: b.rodadas[0].opcoes.c }; }, 'rodadas.r1.opcoes', /uma opção só/, 'aviso'],
];

for (const [nome, mutar, caminho, mensagem, tipo] of MUTACOES) {
  test(`mutação: ${nome} → ${tipo}`, () => {
    // Arrange
    const b = lerConfigTeste();
    mutar(b);

    // Act
    const r = validar(b);

    // Assert
    const lista = tipo === 'erro' ? r.erros : r.avisos;
    assert.ok(achou(lista, caminho, mensagem), `esperava ${tipo} em "${caminho}" com ${mensagem}\nerros:\n${listar(r.erros)}\navisos:\n${listar(r.avisos)}`);
    if (tipo === 'erro') {
      assert.equal(r.ok, false);
      assert.equal(r.config, null, 'config com erro não sai normalizado');
    } else {
      assert.equal(r.ok, true, listar(r.erros));
    }
  });
}

test('o id "__proto__" não troca o protótipo de nada', () => {
  // Arrange: o JSON.parse cria "__proto__" como chave própria, como faria um
  // config.json com essa chave.
  const bruto = lerConfigTeste();
  bruto.rodadas[0].opcoes = JSON.parse('{"__proto__": {"rotulo": "x", "efeitos": []}, "a": {"rotulo": "A", "efeitos": []}}');

  // Act
  const r = validar(bruto);

  // Assert
  assert.equal({}.titulo, undefined);
  assert.equal({}.rotulo, undefined);
  assert.ok(achou(r.erros, 'rodadas.r1.opcoes.__proto__', /reservado/), listar(r.erros));
});

test('carta impossível só depois de um mês ruim também é pega', () => {
  // Arrange: no mês 1 a energia pode cair a 0; no mês 2 a única carta exige energia > 3.
  const b = configMinimo();
  b.rodadas.push({ id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'a', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  b.roteiros['60min'].splice(2, 0, { tipo: 'rodada', rodada: 'r2' });
  b.cartas = [
    { id: 'normal', titulo: 'Normal', peso: 1, efeitos: [] },
    { id: 'cansa', titulo: 'Cansa', peso: 1, rodadas: ['r1'], efeitos: [{ soma: { energia: -8 } }] },
  ];
  b.cartas[0].somenteSe = { indicador: { energia: { acimaDe: 3 } } };

  // Act
  const r = validar(b);

  // Assert
  assert.ok(achou(r.erros, 'rodadas.r2.opcoes.a', /nenhuma carta possível.*no estado/), listar(r.erros));
  assert.ok(!r.erros.some((e) => e.caminho.startsWith('rodadas.r1')), 'o mês 1 tem carta');
});

test('carta possível é conferida na ordem das rodadas de cada roteiro, e não na do config', () => {
  // Arrange: o roteiro joga r2 antes de r1; r2 tira 6 de energia e a única carta de r1 exige energia > 3.
  const b = configMinimo();
  b.rodadas.push({ id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'a', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  b.cartas = [
    { id: 'normal', titulo: 'Normal', peso: 1, rodadas: ['r1'], somenteSe: { indicador: { energia: { acimaDe: 3 } } }, efeitos: [] },
    { id: 'cansa', titulo: 'Cansa', peso: 1, rodadas: ['r2'], efeitos: [{ soma: { energia: -6 } }] },
  ];
  b.roteiros['60min'] = [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r2' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'fim' }];

  // Act
  const r = validar(b);

  // Assert
  assert.ok(achou(r.erros, 'rodadas.r1.opcoes.a', /nenhuma carta possível.*no estado/), listar(r.erros));
});

test('estados demais para conferir a carta possível é erro, e não aviso: a sala não pode nascer sem a garantia', () => {
  // Arrange: 150 caminhos distintos por rodada (10 opções × 15 cartas), 3 rodadas
  const b = configMinimo();
  Object.assign(b.indicadores[0], { min: -1e12, max: 1e12 });
  b.rodadas = [];
  b.cartas = [];
  for (const [k, id] of ['r1', 'r2', 'r3'].entries()) {
    const escala = 1000 ** k;
    const opcoes = {};
    for (let i = 0; i < 10; i++) opcoes[`o${i}`] = { rotulo: `O${i}`, efeitos: [{ soma: { renda: i * escala } }] };
    b.rodadas.push({ id, titulo: id, texto: 'Texto', padrao: 'o0', opcoes });
    for (let j = 0; j < 15; j++) b.cartas.push({ id: `c${k}_${j}`, titulo: 'C', peso: 1, rodadas: [id], efeitos: [{ soma: { renda: j * 10 * escala } }] });
  }
  b.roteiros['60min'] = [{ tipo: 'lobby' }, ...['r1', 'r2', 'r3'].map((rodada) => ({ tipo: 'rodada', rodada })), { tipo: 'fim' }];

  // Act
  const r = validar(b);

  // Assert
  assert.equal(r.ok, false);
  assert.ok(achou(r.erros, 'cartas', /estados alcançáveis/), listar(r.erros));
});

test('lista TODOS os problemas, sem parar no primeiro', () => {
  // Arrange
  const b = lerConfigTeste();
  carta(b, 'chuva').peso = -1;
  b.equipes[0].cor = 'laranja';
  b.roteiros['60min'][2].tipo = 'jogo';
  b.enquetes[0].afirmacoes[0].texto = 'x'.repeat(111);

  // Act
  const r = validar(b);

  // Assert
  assert.ok(r.erros.length >= 3, listar(r.erros));
  assert.ok(achou(r.erros, 'cartas.chuva.peso', /maior ou igual a 0/));
  assert.ok(achou(r.erros, 'equipes.e1.cor', /hexadecimal/));
  assert.ok(achou(r.erros, 'roteiros.60min[2].tipo', /inválido/));
  assert.ok(achou(r.avisos, 'enquetes.entrada.afirmacoes.a1.texto', /mais de 110/));
});

test('validar recusa o que não é objeto', () => {
  for (const ruim of [null, [], 'config', 42]) {
    const r = validar(ruim);
    assert.equal(r.ok, false);
    assert.equal(r.config, null);
  }
});

test('validarTexto: BOM é removido e avisado', () => {
  // Act
  const r = validarTexto(lerTexto('config-com-bom.json'));

  // Assert
  assert.equal(r.ok, true, listar(r.erros));
  assert.ok(achou(r.avisos, '(arquivo)', /BOM/));
});

test('validarTexto: acento corrompido ("Ã©", "â€") é erro, com as linhas', () => {
  // Act
  const r = validarTexto(lerTexto('config-acento-corrompido.json'));
  const aspas = validarTexto(JSON.stringify(lerConfigTeste()).replace('Mês sem surpresas', 'Mês â€œsemâ€ surpresas'));

  // Assert
  assert.equal(r.ok, false);
  assert.ok(achou(r.erros, '(arquivo) linha 21, 72', /acento corrompido/), listar(r.erros));
  assert.ok(aspas.erros.some((e) => /acento corrompido/.test(e.mensagem)));
  // "NÃO" é português legítimo, não corrupção.
  assert.equal(validarTexto(JSON.stringify(lerConfigTeste()).replace('Config de teste', 'NÃO é oficial')).ok, true);
});

test('validarTexto: JSON quebrado aponta linha e coluna', () => {
  // Act
  const r = validarTexto(lerTexto('config-json-quebrado.json'));

  // Assert: falta a vírgula no fim da linha 3, e o parser tropeça no começo da 4.
  assert.equal(r.ok, false);
  assert.equal(r.config, null);
  assert.ok(achou(r.erros, '(arquivo) linha 4, coluna 3', /JSON inválido/), listar(r.erros));
});

test('hash: estável, independe da ordem das chaves e muda com o conteúdo', () => {
  // Arrange
  const b = lerConfigTeste();
  // Inverte a ordem das chaves de todo objeto, menos a do mapa de opções: ali a
  // ordem é a de exibição (ordemOpcoes) e mudá-la muda o conteúdo de verdade.
  const invertido = JSON.parse(JSON.stringify(b, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && k !== 'opcoes'
    ? Object.fromEntries(Object.entries(v).reverse()) : v)));
  const outro = lerConfigTeste();
  carta(outro, 'chuva').peso = 13;

  // Act
  const h = hash(validar(b).config);

  // Assert
  assert.match(h, /^[0-9a-f]{8}$/);
  assert.equal(hash(validar(lerConfigTeste()).config), h);
  assert.equal(hash(validar(invertido).config), h);
  assert.notEqual(hash(validar(outro).config), h);
});

test('hash: o conteúdo que volta do RTDB (sem listas vazias) tem o mesmo hash', () => {
  // Arrange
  const config = validar(lerConfigTeste()).config;
  const doBanco = JSON.parse(JSON.stringify(config), (_k, v) => {
    if (Array.isArray(v) && v.length === 0) return undefined;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return undefined;
    return v;
  });

  // Act / Assert
  assert.equal(hash(doBanco), hash(config));
});

test('o config.json da raiz passa no validador', (t) => {
  const caminho = join(RAIZ, 'config.json');
  if (!existsSync(caminho)) {
    t.skip('config.json ainda não existe');
    return;
  }
  const r = validarTexto(readFileSync(caminho, 'utf8'));
  assert.deepEqual(r.erros, [], listar(r.erros));
});

test('bin/validar-config.mjs: sai 0 com config válido e 1 com erro', () => {
  // Arrange
  const rodar = (arquivo) => spawnSync(process.execPath, [join(RAIZ, 'bin', 'validar-config.mjs'), join(PASTA_FIXTURES, arquivo)], { encoding: 'utf8' });

  // Act
  const valido = rodar('config-teste.json');
  const quebrado = rodar('config-json-quebrado.json');

  // Assert
  assert.equal(valido.status, 0, valido.stderr + valido.stdout);
  assert.match(valido.stdout, /Chances efetivas/);
  assert.match(valido.stdout, /Variância da renda final/);
  assert.equal(quebrado.status, 1);
  assert.match(quebrado.stdout + quebrado.stderr, /JSON inválido/);
});
