// O validador no esquema v2 (D-041 a D-048): família e básico da casa, outra
// renda, juros da dívida, contexto no celular, de 2 a 4 opções e as condições
// decidiu/sorteou. Validação por mutação: parte do config-teste-v2.json, que é
// válido, e quebra uma coisa por vez.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { CAMINHO_CONFIG_TESTE_V2, configMinimo, lerConfigTesteV2 } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { validar } = V.validarConfig;

const persona = (b, id) => b.personas.find((p) => p.id === id);
const rodada = (b, id) => b.rodadas.find((r) => r.id === id);
const carta = (b, id) => b.cartas.find((c) => c.id === id);
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));
const listar = (lista) => lista.map((p) => `  ${p.caminho}: ${p.mensagem}`).join('\n') || '  (nada)';

test('o config de teste v2 é válido, sem nenhum aviso', () => {
  // Act
  const r = validar(lerConfigTesteV2());

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
});

test('v2 normalizado: família, básico, outra renda, juros, contexto e as condições de histórico', () => {
  // Act
  const { config } = validar(lerConfigTesteV2());

  // Assert
  assert.deepEqual(config.personas.costureira.familia, { descricao: 'Lia sustenta sozinha a casa com dois filhos que não trabalham.', pessoas: 3 });
  assert.deepEqual(config.personas.motoboy.basico.itens.map((i) => [i.rotulo, i.valor]), [['aluguel', 900], ['comida', 800], ['contas', 300]]);
  assert.equal(config.personas.motoboy.basico.itens[0].fonte, 'valor de teste');
  assert.deepEqual(config.personas.ciclista.outraRenda, { rotulo: 'aposentadoria da mãe', valor: 600, fonte: 'valor de teste' });
  assert.equal(config.personas.motoboy.outraRenda, undefined);
  assert.equal(config.regras.jurosDividaMes, 0.08);
  assert.equal(config.regras.jurosFonte, 'taxa ilustrativa de teste');
  assert.deepEqual(config.rodadas.r1.contexto, { costureira: 'O aluguel vence dia 10 e a geladeira está vazia.', motoboy: 'A revisão da moto está atrasada.' });
  assert.equal(config.rodadas.r2.contexto, undefined);
  assert.deepEqual(config.rodadas.r2.efeitosGerais[1].se, { decidiu: { r1: 'd' } });
  assert.deepEqual(config.cartas.recaida.ajustesDePeso[0].se, { sorteou: { r2: 'acidente' } });
  assert.equal(config.rodadas.r1.opcoes.a.tendencia, 'mais dinheiro; menos energia', 'a tendência continua aceita (compatibilidade)');
  assert.equal(config.tempos.decisaoSeg, 120);
});

test('contexto com exatamente 160 caracteres passa; e as listas de decidiu/sorteou também', () => {
  // Arrange
  const b = lerConfigTesteV2();
  rodada(b, 'r1').contexto.costureira = 'x'.repeat(160);
  rodada(b, 'r3').efeitosGerais[0].se = { decidiu: { r1: ['b', 'd'] } };
  carta(b, 'recaida').ajustesDePeso[0].se = { sorteou: { r2: ['acidente', 'bloqueio'] } };

  // Act
  const r = validar(b);

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
});

// [nome, mutação, caminho esperado, mensagem esperada, 'erro' | 'aviso']
const MUTACOES = [
  // Família (D-044)
  ['família ausente', (b) => { delete persona(b, 'motoboy').familia; }, 'personas.motoboy.familia', /obrigatório/, 'erro'],
  ['família que não é objeto', (b) => { persona(b, 'motoboy').familia = 'três pessoas'; }, 'personas.motoboy.familia', /objeto/, 'erro'],
  ['família sem descrição', (b) => { delete persona(b, 'motoboy').familia.descricao; }, 'personas.motoboy.familia.descricao', /obrigatório/, 'erro'],
  ['família com zero pessoas', (b) => { persona(b, 'motoboy').familia.pessoas = 0; }, 'personas.motoboy.familia.pessoas', /maior que 0/, 'erro'],
  ['família com pessoas fracionárias', (b) => { persona(b, 'motoboy').familia.pessoas = 2.5; }, 'personas.motoboy.familia.pessoas', /inteiro/, 'erro'],
  ['família com chave desconhecida', (b) => { persona(b, 'motoboy').familia.idade = 34; }, 'personas.motoboy.familia.idade', /chave desconhecida/, 'aviso'],
  // Básico da casa (D-044): mexe no dinheiro, então chave estranha é erro
  ['básico ausente', (b) => { delete persona(b, 'motoboy').basico; }, 'personas.motoboy.basico', /obrigatório/, 'erro'],
  ['básico sem itens', (b) => { persona(b, 'motoboy').basico.itens = []; }, 'personas.motoboy.basico.itens', /pelo menos um item/, 'erro'],
  ['básico com itens que não são lista', (b) => { persona(b, 'motoboy').basico.itens = { aluguel: 900 }; }, 'personas.motoboy.basico.itens', /lista/, 'erro'],
  ['básico com chave desconhecida', (b) => { persona(b, 'motoboy').basico.total = 2000; }, 'personas.motoboy.basico.total', /chave desconhecida/, 'erro'],
  ['item do básico com valor negativo', (b) => { persona(b, 'motoboy').basico.itens[0].valor = -900; }, 'personas.motoboy.basico.itens[0].valor', /maior ou igual a 0/, 'erro'],
  ['item do básico com centavos', (b) => { persona(b, 'motoboy').basico.itens[0].valor = 900.5; }, 'personas.motoboy.basico.itens[0].valor', /inteiro/, 'erro'],
  ['item do básico como texto', (b) => { persona(b, 'motoboy').basico.itens[0].valor = '900'; }, 'personas.motoboy.basico.itens[0].valor', /número finito/, 'erro'],
  ['item do básico sem fonte', (b) => { delete persona(b, 'motoboy').basico.itens[1].fonte; }, 'personas.motoboy.basico.itens[1].fonte', /obrigatório/, 'erro'],
  ['item do básico sem rótulo', (b) => { delete persona(b, 'motoboy').basico.itens[1].rotulo; }, 'personas.motoboy.basico.itens[1].rotulo', /obrigatório/, 'erro'],
  ['item do básico com chave desconhecida', (b) => { persona(b, 'motoboy').basico.itens[0]['valor '] = 1; }, 'personas.motoboy.basico.itens[0].valor ', /chave desconhecida/, 'erro'],
  ['item do básico que não é objeto', (b) => { persona(b, 'motoboy').basico.itens[0] = 900; }, 'personas.motoboy.basico.itens[0]', /objeto/, 'erro'],
  // Outra renda da casa (opcional)
  ['outra renda que não é objeto', (b) => { persona(b, 'ciclista').outraRenda = 600; }, 'personas.ciclista.outraRenda', /objeto/, 'erro'],
  ['outra renda negativa', (b) => { persona(b, 'ciclista').outraRenda.valor = -1; }, 'personas.ciclista.outraRenda.valor', /maior ou igual a 0/, 'erro'],
  ['outra renda sem fonte', (b) => { delete persona(b, 'ciclista').outraRenda.fonte; }, 'personas.ciclista.outraRenda.fonte', /obrigatório/, 'erro'],
  ['outra renda com chave desconhecida', (b) => { persona(b, 'ciclista').outraRenda.mensal = true; }, 'personas.ciclista.outraRenda.mensal', /chave desconhecida/, 'erro'],
  // Juros da dívida (D-046)
  ['juros ausentes', (b) => { delete b.regras.jurosDividaMes; }, 'regras.jurosDividaMes', /obrigatório/, 'erro'],
  ['juros zero', (b) => { b.regras.jurosDividaMes = 0; }, 'regras.jurosDividaMes', /entre 0 e 1/, 'erro'],
  ['juros de 100%', (b) => { b.regras.jurosDividaMes = 1; }, 'regras.jurosDividaMes', /entre 0 e 1/, 'erro'],
  ['juros escritos em porcentagem', (b) => { b.regras.jurosDividaMes = 8; }, 'regras.jurosDividaMes', /entre 0 e 1/, 'erro'],
  ['juros como texto', (b) => { b.regras.jurosDividaMes = '0.08'; }, 'regras.jurosDividaMes', /número finito/, 'erro'],
  ['juros sem fonte', (b) => { delete b.regras.jurosFonte; }, 'regras.jurosFonte', /obrigatório/, 'erro'],
  // Contexto no celular (D-043)
  ['contexto que não é objeto', (b) => { rodada(b, 'r1').contexto = 'aluguel atrasado'; }, 'rodadas.r1.contexto', /objeto/, 'erro'],
  ['contexto de persona inexistente', (b) => { rodada(b, 'r1').contexto.astronauta = 'Sem oxigênio.'; }, 'rodadas.r1.contexto.astronauta', /persona "astronauta" não existe/, 'erro'],
  ['contexto com mais de 160 caracteres', (b) => { rodada(b, 'r1').contexto.costureira = 'x'.repeat(161); }, 'rodadas.r1.contexto.costureira', /161 caracteres.*160/, 'erro'],
  ['contexto vazio', (b) => { rodada(b, 'r1').contexto.costureira = ' '; }, 'rodadas.r1.contexto.costureira', /texto vazio/, 'erro'],
  // De 2 a 4 opções (D-043)
  // O teto subiu de 4 para 5 com o formato simples (decisão do Kleber de 05/10
  // à noite: 5 opções por bimestre); 6 continua erro.
  ['rodada com 6 opções', (b) => { Object.assign(rodada(b, 'r1').opcoes, { e: { rotulo: 'E', efeitos: [] }, f: { rotulo: 'F', efeitos: [] } }); }, 'rodadas.r1.opcoes', /6 opções.*no máximo 5/, 'erro'],
  ['rodada com uma opção só', (b) => { rodada(b, 'r1').opcoes = { c: rodada(b, 'r1').opcoes.c }; }, 'rodadas.r1.opcoes', /pelo menos 2/, 'erro'],
  // decidiu / sorteou
  ['decidiu que não é objeto', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = 'r1'; }, 'rodadas.r2.efeitosGerais[1].se.decidiu', /objeto/, 'erro'],
  ['decidiu vazio', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = {}; }, 'rodadas.r2.efeitosGerais[1].se.decidiu', /pelo menos uma rodada/, 'erro'],
  ['decidiu com rodada inexistente', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = { r9: 'd' }; },
    'rodadas.r2.efeitosGerais[1].se.decidiu.r9', /rodada "r9" não existe/, 'erro'],
  ['decidiu com opção que não é daquela rodada', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = { r1: 'z' }; },
    'rodadas.r2.efeitosGerais[1].se.decidiu.r1', /opção "z" não existe na rodada "r1"/, 'erro'],
  ['decidiu com lista vazia', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = { r1: [] }; },
    'rodadas.r2.efeitosGerais[1].se.decidiu.r1', /lista não vazia/, 'erro'],
  ['decidiu da própria rodada', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = { r2: 'a' }; },
    'rodadas.r2.efeitosGerais[1].se.decidiu.r2', /não vem antes/, 'erro'],
  ['decidiu de uma rodada que vem depois', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiu = { r3: 'a' }; },
    'rodadas.r2.efeitosGerais[1].se.decidiu.r3', /não vem antes/, 'erro'],
  ['decidiu da última rodada no todo mês', (b) => { persona(b, 'motoboy').todoMes[0].se = { decidiu: { r3: 'a' } }; },
    'personas.motoboy.todoMes[0].se.decidiu.r3', /não vem antes/, 'erro'],
  ['decidiu com a rodada da condição antes dela', (b) => { persona(b, 'motoboy').todoMes[0].se = { rodada: 'r1', decidiu: { r2: 'a' } }; },
    'personas.motoboy.todoMes[0].se.decidiu.r2', /não vem antes/, 'erro'],
  ['decidiu de rodada fora de um roteiro', (b) => { b.roteiros['120min'] = b.roteiros['120min'].filter((p) => p.rodada !== 'r1'); },
    'rodadas.r2.efeitosGerais[1].se.decidiu.r1', /não está no roteiro "120min"/, 'erro'],
  ['sorteou com carta inexistente', (b) => { carta(b, 'recaida').ajustesDePeso[0].se.sorteou = { r2: 'meteoro' }; },
    'cartas.recaida.ajustesDePeso[0].se.sorteou.r2', /carta "meteoro" não existe/, 'erro'],
  ['sorteou com carta que não sai naquela rodada', (b) => { carta(b, 'recaida').ajustesDePeso[0].se.sorteou = { r1: 'bloqueio' }; },
    'cartas.recaida.ajustesDePeso[0].se.sorteou.r1', /carta "bloqueio" não sai na rodada "r1"/, 'erro'],
  ['sorteou numa carta restrita a uma rodada que não vem depois', (b) => { carta(b, 'recaida').rodadas = ['r2']; },
    'cartas.recaida.ajustesDePeso[0].se.sorteou.r2', /não vem antes/, 'erro'],
  ['chave desconhecida ao lado de decidiu', (b) => { rodada(b, 'r2').efeitosGerais[1].se.decidiuEm = { r1: 'd' }; },
    'rodadas.r2.efeitosGerais[1].se.decidiuEm', /chave desconhecida/, 'erro'],
];

for (const [nome, mutar, caminho, mensagem, tipo] of MUTACOES) {
  test(`mutação v2: ${nome} → ${tipo}`, () => {
    // Arrange
    const b = lerConfigTesteV2();
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

test('carta impossível que depende do histórico também é pega (e a rodada pulada conta)', () => {
  // Arrange: a única carta do mês 2 exige ter tirado "boa" no mês 1.
  const b = configMinimo();
  b.rodadas.push({ id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'a', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  b.roteiros['60min'].splice(2, 0, { tipo: 'rodada', rodada: 'r2' });
  b.cartas = [
    { id: 'boa', titulo: 'Boa', peso: 1, rodadas: ['r1'], efeitos: [] },
    { id: 'ruim', titulo: 'Ruim', peso: 1, rodadas: ['r1'], efeitos: [] },
    { id: 'depois', titulo: 'Depois', peso: 1, rodadas: ['r2'], somenteSe: { sorteou: { r1: 'boa' } }, efeitos: [] },
  ];

  // Act
  const r = validar(b);

  // Assert
  assert.ok(achou(r.erros, 'rodadas.r2.opcoes.a', /nenhuma carta possível/), listar(r.erros));
});

test('bin/validar-config.mjs mostra entrou, básico e saldo por persona × opção', () => {
  // Act
  const saida = spawnSync(process.execPath, [join(RAIZ, 'bin', 'validar-config.mjs'), CAMINHO_CONFIG_TESTE_V2], { encoding: 'utf8' });

  // Assert
  assert.equal(saida.status, 0, saida.stderr + saida.stdout);
  assert.match(saida.stdout, /básico da casa R\$ 1\.800\/mês/);
  assert.match(saida.stdout, /entrou E/);
  assert.match(saida.stdout, /saldo do mês E/);
  assert.match(saida.stdout, /juros de 8% ao mês/);
  assert.match(saida.stdout, /Variância da renda final/);
});
