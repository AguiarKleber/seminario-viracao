// O validador no esquema v2.1: efeito.fixo, efeito.categoria ("gasto"),
// carta.diasParado e o texto da opção por persona (rotuloPor/narrativaPor,
// D-054). Validação por mutação: parte do config-teste-v21.json, que é válido,
// e quebra uma coisa por vez. E as conferências novas do bin (D-050, D-051).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { CAMINHO_CONFIG_TESTE_V21, configMinimo, lerConfigTesteV21 } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { validar } = V.validarConfig;

const persona = (b, id) => b.personas.find((p) => p.id === id);
const rodada = (b, id) => b.rodadas.find((r) => r.id === id);
const carta = (b, id) => b.cartas.find((c) => c.id === id);
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));
const listar = (lista) => lista.map((p) => `  ${p.caminho}: ${p.mensagem}`).join('\n') || '  (nada)';

test('o config de teste v2.1 é válido, sem nenhum aviso', () => {
  // Act
  const r = validar(lerConfigTesteV21());

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
});

test('v2.1 normalizado: fixo, categoria, diasParado, rotuloPor e narrativaPor', () => {
  // Act
  const { config } = validar(lerConfigTesteV21());

  // Assert
  assert.deepEqual(config.personas.motoboy.todoMes[2], { soma: { renda: -480 }, fixo: true, rotulo: 'parcela da moto' });
  assert.deepEqual(config.cartas.acidente.efeitos[1], { soma: { renda: -300 }, categoria: 'gasto', rotulo: 'conserto' });
  assert.equal(config.cartas.acidente.diasParado, 20);
  assert.equal(config.cartas.normal.diasParado, 0);
  assert.equal(config.cartas.chuva.diasParado, undefined, 'opcional');
  assert.deepEqual(config.rodadas.r2.opcoes.a.rotuloPor, { manicure: 'Aceitar todos os atendimentos', costureira: 'Aceitar todas as encomendas' });
  assert.deepEqual(config.rodadas.r2.opcoes.a.narrativaPor, { manicure: 'Atendi até cliente longe e barata.' });
  assert.equal(config.rodadas.r2.opcoes.b.rotuloPor, undefined);
});

test('fixo: false é o mesmo que não ter (some na normalização); limites exatos passam', () => {
  // Arrange
  const b = lerConfigTesteV21();
  persona(b, 'motoboy').todoMes[1].fixo = false;
  carta(b, 'bloqueio').diasParado = 30;
  rodada(b, 'r2').opcoes.a.rotuloPor.manicure = 'x'.repeat(60);
  rodada(b, 'r2').opcoes.a.narrativaPor.manicure = 'é'.repeat(160);

  // Act
  const r = validar(b);

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.equal(Object.hasOwn(r.config.personas.motoboy.todoMes[1], 'fixo'), false);
});

test('o config v2 (sem nenhum campo v2.1) continua válido: tudo o que é v2.1 é opcional', () => {
  // Arrange: o config.json real ainda é v2 e vai ser reescrito por outro agente.
  const texto = readFileSync(join(RAIZ, 'config.json'), 'utf8');

  // Act
  const r = V.validarConfig.validarTexto(texto);

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
});

// [nome, mutação, caminho esperado, mensagem esperada, 'erro' | 'aviso']
const MUTACOES = [
  // efeito.fixo
  ['fixo que não é booleano', (b) => { persona(b, 'motoboy').todoMes[2].fixo = 'sim'; }, 'personas.motoboy.todoMes[2].fixo', /true ou false/, 'erro'],
  ['fixo com multiplica', (b) => { persona(b, 'motoboy').todoMes[2] = { multiplica: { renda: 0.5 }, fixo: true }; },
    'personas.motoboy.todoMes[2]', /custo fixo.*"multiplica"/, 'erro'],
  ['fixo em outro indicador', (b) => { persona(b, 'motoboy').todoMes[2].soma.energia = -1; },
    'personas.motoboy.todoMes[2].soma.energia', /só pode somar na renda/, 'erro'],
  ['fixo e gasto no mesmo efeito', (b) => { persona(b, 'motoboy').todoMes[2].categoria = 'gasto'; },
    'personas.motoboy.todoMes[2]', /"fixo" e "categoria" no mesmo efeito/, 'erro'],
  // efeito.categoria
  ['categoria desconhecida', (b) => { carta(b, 'acidente').efeitos[1].categoria = 'custo'; }, 'cartas.acidente.efeitos[1].categoria', /inválido; use gasto/, 'erro'],
  ['categoria em maiúsculas', (b) => { carta(b, 'acidente').efeitos[1].categoria = 'Gasto'; }, 'cartas.acidente.efeitos[1].categoria', /inválido; use gasto/, 'erro'],
  ['gasto com multiplica', (b) => { carta(b, 'acidente').efeitos[0].categoria = 'gasto'; },
    'cartas.acidente.efeitos[0]', /gasto.*"multiplica"/, 'erro'],
  ['gasto em outro indicador', (b) => { carta(b, 'acidente').efeitos[1].soma = { renda: -300, protecao: -1 }; },
    'cartas.acidente.efeitos[1].soma.protecao', /só pode somar na renda/, 'erro'],
  ['chave desconhecida no efeito (fixa em vez de fixo)', (b) => { persona(b, 'motoboy').todoMes[2].fixa = true; },
    'personas.motoboy.todoMes[2].fixa', /chave desconhecida.*fechada/, 'erro'],
  // carta.diasParado
  ['diasParado acima de 30', (b) => { carta(b, 'acidente').diasParado = 31; }, 'cartas.acidente.diasParado', /31 dias parado.*30/, 'erro'],
  ['diasParado negativo', (b) => { carta(b, 'acidente').diasParado = -1; }, 'cartas.acidente.diasParado', /maior ou igual a 0/, 'erro'],
  ['diasParado fracionário', (b) => { carta(b, 'acidente').diasParado = 2.5; }, 'cartas.acidente.diasParado', /inteiro/, 'erro'],
  ['diasParado como texto', (b) => { carta(b, 'acidente').diasParado = '20'; }, 'cartas.acidente.diasParado', /número finito/, 'erro'],
  // opcao.rotuloPor / narrativaPor (D-054)
  ['rotuloPor que não é objeto', (b) => { rodada(b, 'r2').opcoes.a.rotuloPor = 'Aceitar'; }, 'rodadas.r2.opcoes.a.rotuloPor', /objeto/, 'erro'],
  ['rotuloPor de persona inexistente', (b) => { rodada(b, 'r2').opcoes.a.rotuloPor.astronauta = 'Aceitar'; },
    'rodadas.r2.opcoes.a.rotuloPor.astronauta', /persona "astronauta" não existe/, 'erro'],
  ['rotuloPor com mais de 60 caracteres', (b) => { rodada(b, 'r2').opcoes.a.rotuloPor.manicure = 'x'.repeat(61); },
    'rodadas.r2.opcoes.a.rotuloPor.manicure', /61 caracteres.*60/, 'erro'],
  ['rotuloPor vazio', (b) => { rodada(b, 'r2').opcoes.a.rotuloPor.manicure = ' '; }, 'rodadas.r2.opcoes.a.rotuloPor.manicure', /texto vazio/, 'erro'],
  ['rotuloPor com número', (b) => { rodada(b, 'r2').opcoes.a.rotuloPor.manicure = 7; }, 'rodadas.r2.opcoes.a.rotuloPor.manicure', /texto/, 'erro'],
  ['rotuloPor sem nenhuma persona', (b) => { rodada(b, 'r2').opcoes.d.rotuloPor = {}; }, 'rodadas.r2.opcoes.d.rotuloPor', /vazio/, 'aviso'],
  ['narrativaPor que não é objeto', (b) => { rodada(b, 'r2').opcoes.a.narrativaPor = ['x']; }, 'rodadas.r2.opcoes.a.narrativaPor', /objeto/, 'erro'],
  ['narrativaPor de persona inexistente', (b) => { rodada(b, 'r2').opcoes.a.narrativaPor.constructor = 'x'; },
    'rodadas.r2.opcoes.a.narrativaPor.constructor', /persona "constructor" não existe/, 'erro'],
  ['narrativaPor com mais de 160 caracteres', (b) => { rodada(b, 'r2').opcoes.a.narrativaPor.manicure = 'x'.repeat(161); },
    'rodadas.r2.opcoes.a.narrativaPor.manicure', /161 caracteres.*160/, 'erro'],
  ['chave desconhecida na opção (rotulosPor)', (b) => { rodada(b, 'r2').opcoes.a.rotulosPor = {}; }, 'rodadas.r2.opcoes.a.rotulosPor', /chave desconhecida/, 'aviso'],
];

for (const [nome, mutar, caminho, mensagem, tipo] of MUTACOES) {
  test(`mutação v2.1: ${nome} → ${tipo}`, () => {
    // Arrange
    const b = lerConfigTesteV21();
    mutar(b);

    // Act
    const r = validar(b);

    // Assert
    const lista = tipo === 'erro' ? r.erros : r.avisos;
    assert.ok(achou(lista, caminho, mensagem), `esperava ${tipo} em "${caminho}" com ${mensagem}\nerros:\n${listar(r.erros)}\navisos:\n${listar(r.avisos)}`);
    if (tipo === 'erro') {
      assert.equal(r.ok, false);
      assert.equal(r.config, null);
    } else {
      assert.equal(r.ok, true, listar(r.erros));
    }
  });
}

// ------------------------------------------------------------ o bin (D-050, D-051)

function rodarBin(caminho) {
  return spawnSync(process.execPath, [join(RAIZ, 'bin', 'validar-config.mjs'), caminho], { encoding: 'utf8' });
}

// Um config pequeno em arquivo temporário, para o bin ler. Duas personas, três
// meses, duas opções por mês e duas cartas (a boa e a ruim, meio a meio).
function comConfigTemporario(ajustar, fn) {
  const b = configMinimo();
  b.personas.push({ ...structuredClone(b.personas[0]), id: 'p2', nome: 'Outra' });
  b.equipes.push({ id: 'e2', nome: 'Azul', cor: '#0072B2', forma: 'quadrado', persona: 'p2' });
  for (const id of ['r2', 'r3']) {
    b.rodadas.push({ id, titulo: id, texto: 'Texto', padrao: 'b', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  }
  b.roteiros['60min'] = [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'rodada', rodada: 'r2' }, { tipo: 'rodada', rodada: 'r3' }, { tipo: 'fim' }];
  b.cartas = [
    { id: 'normal', titulo: 'Normal', peso: 1, efeitos: [] },
    { id: 'boa', titulo: 'Boa', peso: 1, efeitos: [{ soma: { renda: 100 } }] },
  ];
  ajustar(b);
  const pasta = mkdtempSync(join(tmpdir(), 'viracao-v21-'));
  try {
    const caminho = join(pasta, 'config.json');
    writeFileSync(caminho, JSON.stringify(b));
    return fn(rodarBin(caminho));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

test('bin: as tabelas mostram entrou, gastos, básico e saldo do mês', () => {
  // Act
  const saida = rodarBin(CAMINHO_CONFIG_TESTE_V21);

  // Assert
  assert.equal(saida.status, 0, saida.stderr + saida.stdout);
  assert.match(saida.stdout, /"entrou" = trabalho − custos fixos \+ outra renda; "saldo do mês" = entrou − gastos − básico − juros/);
  assert.match(saida.stdout, /entrou E R\$ [\d.]+ \(pior [^)]+\) · gastos E R\$ [\d.]+ \(pior R\$ [\d.]+\) · básico R\$ 2\.000 · juros E/);
  assert.match(saida.stdout, /gastos E R\$ [1-9][\d.]* \(pior R\$ 400\)/, 'o acidente (conserto + remédio) aparece nos gastos do Rafa');
});

test('bin (D-050): chance de fechar o básico, melhor plano e melhor caminho por persona', () => {
  // Act
  const saida = rodarBin(CAMINHO_CONFIG_TESTE_V21);

  // Assert
  assert.match(saida.stdout, /== \(g\) Quem fecha o básico no fim dos 3 meses \(D-050\) ==/);
  for (const nome of ['Rafa', 'Dani', 'Cida', 'Jorge', 'Lia']) {
    assert.match(saida.stdout, new RegExp(`  ${nome} \\([a-z]+\\): fecha em [\\d,]+% ao acaso · (melhor plano [a-d]-[a-d]-[a-d] fecha em [\\d,]+%|nenhum plano fecha) · melhor caminho termina com −?R\\$ [\\d.]+ \\(r1 [a-d]/\\w+ → r2 [a-d]/\\w+ → r3 [a-d]/\\w+\\)`), nome);
  }
});

test('bin (D-050): o caso feito à mão — quem fecha, com que chance, e o aviso de "ninguém fecha"', () => {
  // Arrange: básico de 150 por mês e renda de 50 por mês; a carta "boa" (½)
  // dá +100. Fecha (≥ 0 no fim) só quem tira a boa nos 3 meses: ½³ = 12,5%, em
  // qualquer plano. A persona p2 tem básico de 1.000: nenhum caminho fecha; o
  // melhor, com a boa nos 3 meses e os juros de 10% do config mínimo sobre a
  // dívida de antes, vai a −900 → −1.890 → −2.979.
  comConfigTemporario((b) => {
    b.personas[0].todoMes = [{ soma: { renda: 50 } }];
    b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 150, fonte: 'teste' }] };
    b.personas[1].basico = { itens: [{ rotulo: 'casa', valor: 1000, fonte: 'teste' }] };
  }, (saida) => {
    // Assert
    assert.equal(saida.status, 0, saida.stderr + saida.stdout);
    assert.match(saida.stdout, /Pessoa \(p1\): fecha em 12,5% ao acaso · melhor plano a-a-a fecha em 12,5% · melhor caminho termina com R\$ 0 \(r1 a\/boa → r2 a\/boa → r3 a\/boa\)/);
    assert.match(saida.stdout, /Outra \(p2\): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R\$ 2\.979/);
    assert.match(saida.stdout, /AVISO: Outra \(p2\): nenhum caminho fecha o básico/);
    assert.doesNotMatch(saida.stdout, /AVISO: Pessoa \(p1\): nenhum caminho/);
    assert.match(saida.stdout, /AVISO: só 1 persona\(s\) fecham o básico entre 5% e 15%/);
  });
});

test('bin (D-050): acima de 15% ao acaso é mais que "quase ninguém"', () => {
  // Arrange: sem básico, todo mundo fecha em 100%.
  comConfigTemporario(() => {}, (saida) => {
    // Assert
    assert.match(saida.stdout, /Pessoa \(p1\): fecha em 100% ao acaso/);
    assert.match(saida.stdout, /AVISO: Pessoa \(p1\): fecha o básico em 100% das partidas ao acaso, mais que "quase ninguém"/);
  });
});

test('bin (D-051): avisa quando a melhor opção é a mesma para todas e a letra do esforço não muda', () => {
  // Arrange: "a" dá +300 no mês para as duas personas, nos três meses.
  comConfigTemporario((b) => {
    for (const r of b.rodadas) r.opcoes.a.efeitos = [{ soma: { renda: 300 } }];
  }, (saida) => {
    // Assert
    assert.match(saida.stdout, /== \(h\) A melhor opção muda com a persona, e a letra do esforço muda com o mês \(D-051\) ==/);
    for (const r of ['r1', 'r2', 'r3']) {
      assert.match(saida.stdout, new RegExp(`  ${r} melhor opção: Pessoa \\(p1\\) a · Outra \\(p2\\) a`));
      assert.match(saida.stdout, new RegExp(`AVISO: ${r}: a melhor opção é a mesma \\("a"\\) para todas as personas`));
      assert.match(saida.stdout, new RegExp(`  ${r} maior esforço/renda no mês: A \\("a", renda E R\\$ 350 no mês\\)`));
    }
    assert.match(saida.stdout, /AVISO: a opção de maior esforço\/renda está na letra A em todos os meses/);
  });
});

test('bin (D-051): sem aviso quando a melhor opção muda com a persona e a letra muda com o mês', () => {
  // Arrange: a opção de maior renda custa caro só para a p2, e no mês 2 ela
  // passa para a "b" (letra B). A p1 e a p2 preferem opções diferentes.
  comConfigTemporario((b) => {
    for (const r of b.rodadas) r.opcoes.a.efeitos = [{ soma: { renda: 300 } }, { se: { persona: 'p2' }, soma: { renda: -500 } }];
    b.rodadas[1].opcoes.a.efeitos = [];
    b.rodadas[1].opcoes.b.efeitos = [{ soma: { renda: 300 } }, { se: { persona: 'p2' }, soma: { renda: -500 } }];
  }, (saida) => {
    // Assert
    assert.match(saida.stdout, / {2}r1 melhor opção: Pessoa \(p1\) a · Outra \(p2\) b/);
    assert.match(saida.stdout, / {2}r2 maior esforço\/renda no mês: B/);
    assert.doesNotMatch(saida.stdout, /a melhor opção é a mesma/);
    assert.doesNotMatch(saida.stdout, /em todos os meses; a D-051/);
  });
});

test('regras.pisoTrabalho: opcional, true ou false; outro valor é erro', () => {
  // Arrange
  const com = lerConfigTesteV21();
  com.regras.pisoTrabalho = true;
  const sem = lerConfigTesteV21();
  delete sem.regras.pisoTrabalho;
  const errado = lerConfigTesteV21();
  errado.regras.pisoTrabalho = 'sim';

  // Act
  const rCom = validar(com);
  const rSem = validar(sem);
  const rErrado = validar(errado);

  // Assert
  assert.equal(rCom.config.regras.pisoTrabalho, true);
  assert.equal(rSem.config.regras.pisoTrabalho, undefined, 'ausente não entra no normalizado (o hash do v2 não muda)');
  assert.ok(achou(rErrado.erros, 'regras.pisoTrabalho', /true ou false/), listar(rErrado.erros));
});

test('bin (D-050): chance pequena de fechar sai com dois algarismos, e não arredondada para "0%"', () => {
  // Arrange: fecha só com a boa nos 3 meses, e a boa tem chance de 1 em 25:
  // (1/25)³ = 0,0064%. Antes saía "fecha em 0% ao acaso", e na D-050 a
  // diferença entre "ninguém" e "quase ninguém" é o próprio critério
  // (revisão de 29/09, 2ª rodada, achado 7).
  comConfigTemporario((b) => {
    b.cartas[0].peso = 24;
    b.personas[0].todoMes = [{ soma: { renda: 50 } }];
    b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 150, fonte: 'teste' }] };
  }, (saida) => {
    // Assert
    assert.equal(saida.status, 0, saida.stderr + saida.stdout);
    assert.match(saida.stdout, /Pessoa \(p1\): fecha em 0,0064% ao acaso · melhor plano a-a-a fecha em 0,0064%/);
  });
});

test('bin (i): conta do mês — avisa "entrou" negativo e trabalho negativo sem o piso, com o pior caso', () => {
  // Arrange: renda de 50, carta ruim de −100 (dias parados) e custo fixo de 80.
  // Sem o piso, o trabalho vai a −50 (renda perdida de 100 sobre 50); o
  // "entrou" fica em −30 na carta normal e −130 na ruim.
  const ajustar = (piso) => (b) => {
    if (piso) b.regras.pisoTrabalho = true;
    b.cartas[1] = { id: 'ruim', titulo: 'Ruim', peso: 1, efeitos: [{ soma: { renda: -100 } }] };
    b.personas[0].todoMes = [{ soma: { renda: 50 } }, { soma: { renda: -80 }, fixo: true, rotulo: 'parcela' }];
  };
  comConfigTemporario(ajustar(false), (saida) => {
    // Assert
    assert.equal(saida.status, 0, saida.stderr + saida.stdout);
    assert.match(saida.stdout, /== \(i\) Conta do mês: trabalho e "entrou" ==/);
    assert.match(saida.stdout, /AVISO: Pessoa \(p1\): o trabalho do mês fica negativo \(pior −R\$ 50, r1 a\/ruim\)/);
    assert.match(saida.stdout, /AVISO: Pessoa \(p1\): o "entrou" fica negativo \(pior −R\$ 130, r1 a\/ruim\); ao acaso, em r1 100% · r2 100% · r3 100% dos casos/);
  });
  comConfigTemporario(ajustar(true), (saida) => {
    // Assert: com o piso, o trabalho para em 0 e o "entrou" em −80.
    assert.equal(saida.status, 0, saida.stderr + saida.stdout);
    assert.doesNotMatch(saida.stdout, /o trabalho do mês fica negativo/);
    assert.match(saida.stdout, /Pessoa \(p1\): trabalho ≥ R\$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta/);
    assert.match(saida.stdout, /AVISO: Pessoa \(p1\): o "entrou" fica negativo \(pior −R\$ 80, r1 a\/ruim\)/);
  });
});
