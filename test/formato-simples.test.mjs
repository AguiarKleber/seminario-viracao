// O formato simples (regras.formatoSimples; decisão do Kleber de 05/10 à noite):
// um personagem só para todas as equipes, 5 opções por bimestre, o evento do
// mês igual para todos (sem sorteio), o dinheiro na própria opção e o placar
// pelo caminho de cada equipe, comparado com todas as combinações possíveis.
// A fixture é test/fixtures/config-simples.json: 1 persona, 6 equipes, 3
// rodadas × 5 opções, 1 carta por rodada e uma consequência encadeada (quem
// puxou 12 horas no calor em jan–fev trava as costas em mar–abr).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';
import { PASTA_FIXTURES, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
await import(new URL('../js/ui/formatar.js', import.meta.url).href);
const F = globalThis.Viracao.formatar;
const s = (...partes) => ['salas', SALA, ...partes].join('/');

const lerSimples = () => JSON.parse(readFileSync(join(PASTA_FIXTURES, 'config-simples.json'), 'utf8'));
const rodadaDe = (bruto, id) => bruto.rodadas.find((r) => r.id === id);
const opcaoDe = (bruto, r, o) => rodadaDe(bruto, r).opcoes.find((x) => x.id === o);
const errosDe = (bruto) => V.validarConfig.validar(bruto).erros;
// O Intl separa "R$" do número com espaço fixo (U+00A0); a comparação é pelo texto lido.
const lido = (texto) => String(texto).replace(/\u00a0/g, ' ');

// ---------- Validador ----------

test('validador: a fixture do formato simples é válida, com 5 opções por rodada e a chave no normalizado', () => {
  // Arrange
  const bruto = lerSimples();

  // Act
  const r = V.validarConfig.validar(bruto);

  // Assert
  assert.deepEqual(r.erros, []);
  assert.equal(r.config.regras.formatoSimples, true);
  for (const id of r.config.ordem.rodadas) assert.equal(r.config.rodadas[id].ordemOpcoes.length, 5, `${id}: 5 opções`);
});

test('validador: formatoSimples false ou ausente não entra no normalizado (o hash não muda)', () => {
  // Arrange
  const semChave = lerSimples();
  delete semChave.regras.formatoSimples;
  const falso = lerSimples();
  falso.regras.formatoSimples = false;
  // Sem a chave, o config tem de ser válido como jogo comum (com sorteio).

  // Act
  const a = V.validarConfig.validar(semChave);
  const b = V.validarConfig.validar(falso);

  // Assert
  assert.deepEqual(a.erros, []);
  assert.deepEqual(b.erros, []);
  assert.equal(Object.hasOwn(a.config.regras, 'formatoSimples'), false);
  assert.equal(V.validarConfig.hash(a.config), V.validarConfig.hash(b.config));
});

test('validador: formatoSimples que não é booleano é erro', () => {
  const bruto = lerSimples();
  bruto.regras.formatoSimples = 'sim';
  assert.ok(errosDe(bruto).some((e) => e.caminho === 'regras.formatoSimples' && /true ou false/.test(e.mensagem)));
});

test('validador: 6 opções numa rodada é erro também no formato simples', () => {
  const bruto = lerSimples();
  rodadaDe(bruto, 'r1').opcoes.push({ id: 'f', rotulo: 'F', efeitos: [] });
  assert.ok(errosDe(bruto).some((e) => e.caminho === 'rodadas.r1.opcoes' && /6 opções.*no máximo 5/.test(e.mensagem)));
});

test('validador: no formato simples, mais de uma carta possível numa rodada é recusado', () => {
  // Arrange: uma segunda carta em r2 (peso 1) e uma carta sem "rodadas" (vale
  // em todas), cada uma num config.
  const comSegunda = lerSimples();
  comSegunda.cartas.push({ id: 'outra', titulo: 'Outra', narrativa: 'Outra coisa.', peso: 1, rodadas: ['r2'], efeitos: [] });
  const emTodas = lerSimples();
  emTodas.cartas.push({ id: 'sempre', titulo: 'Sempre', peso: 3, efeitos: [] });
  // Uma carta de peso 0 que um ajuste pode subir também conta: num caminho
  // raro, ela viraria sorteio na frente da turma.
  const comAjuste = lerSimples();
  comAjuste.cartas.push({
    id: 'rara', titulo: 'Rara', peso: 0, rodadas: ['r3'], efeitos: [],
    ajustesDePeso: [{ se: { indicador: { renda: { abaixoDe: -1000 } } }, soma: 1 }],
  });
  // Sem o formato simples, as mesmas cartas são o sorteio de sempre.
  const comum = lerSimples();
  comum.cartas.push({ id: 'outra', titulo: 'Outra', peso: 1, rodadas: ['r2'], efeitos: [] });
  delete comum.regras.formatoSimples;

  // Act
  const erros = [comSegunda, emTodas, comAjuste].map(errosDe);

  // Assert
  assert.ok(erros[0].some((e) => e.caminho === 'rodadas.r2' && /só uma carta.*podem sair 2/.test(e.mensagem)), JSON.stringify(erros[0]));
  assert.ok(erros[1].some((e) => e.caminho === 'rodadas.r1' && /só uma carta/.test(e.mensagem)), JSON.stringify(erros[1]));
  assert.ok(erros[2].some((e) => e.caminho === 'rodadas.r3' && /só uma carta/.test(e.mensagem)), JSON.stringify(erros[2]));
  assert.deepEqual(errosDe(comum), []);
});

test('validador: no formato simples, todas as equipes com a mesma persona', () => {
  // Arrange
  const bruto = lerSimples();
  const outra = structuredClone(bruto.personas[0]);
  outra.id = 'manicure';
  outra.nome = 'Rose';
  bruto.personas.push(outra);
  bruto.equipes[2].persona = 'manicure';

  // Act
  const erros = errosDe(bruto);

  // Assert
  assert.ok(erros.some((e) => e.caminho === 'equipes' && /mesma persona.*há 2/.test(e.mensagem)), JSON.stringify(erros));
});

test('validador: no formato simples, a opção não multiplica a renda direto; com condição de histórico, pode', () => {
  // Arrange
  const direto = lerSimples();
  opcaoDe(direto, 'r1', 'd').efeitos.push({ multiplica: { renda: 0.9 }, rotulo: 'menos horas' });
  const comPersona = lerSimples();
  opcaoDe(comPersona, 'r1', 'd').efeitos.push({ se: { persona: 'motoboy' }, multiplica: { renda: 0.9 }, rotulo: 'menos horas' });
  const encadeado = lerSimples();
  opcaoDe(encadeado, 'r2', 'd').efeitos.push({ se: { decidiu: { r1: 'a' } }, multiplica: { renda: 0.9 }, rotulo: 'as costas' });

  // Act + Assert
  assert.ok(errosDe(direto).some((e) => e.caminho === 'rodadas.r1.opcoes.d.efeitos[1]' && /não multiplica a renda/.test(e.mensagem)));
  assert.ok(errosDe(comPersona).some((e) => /não multiplica a renda/.test(e.mensagem)));
  assert.deepEqual(errosDe(encadeado), []);
});

// ---------- O dinheiro da opção ----------

test('dinheiroDaOpcao: a soma dos efeitos diretos; o empréstimo à parte; o encadeado fica de fora', () => {
  // Arrange
  const config = normalizar(V, lerSimples());
  const H = V.historia;
  const per = H.periodo(config);
  const d = (r, o) => H.dinheiroDaOpcao(config, r, o, 'motoboy');

  // Act + Assert
  assert.deepEqual(d('r1', 'a'), { valor: 1040, emprestimo: 0 });
  assert.deepEqual(d('r1', 'b'), { valor: -170, emprestimo: 0 }, 'o custo fixo do MEI conta');
  assert.deepEqual(d('r1', 'c'), { valor: 0, emprestimo: 0 });
  assert.deepEqual(d('r1', 'e'), { valor: -330, emprestimo: 0 }, 'o gasto conta');
  assert.deepEqual(d('r2', 'c'), { valor: 0, emprestimo: 1500 });
  assert.deepEqual(d('r2', 'x'), { valor: 0, emprestimo: 0 }, 'opção que não existe');
  assert.equal(lido(H.textoDoDinheiro(d('r1', 'a'), F.moeda, per)), '+R$ 1.040 no bimestre');
  assert.equal(lido(H.textoDoDinheiro(d('r1', 'e'), F.moeda, per)), `${F.MENOS}R$ 330 no bimestre`);
  assert.equal(lido(H.textoDoDinheiro(d('r1', 'c'), F.moeda, per)), 'R$ 0 no bimestre');
  assert.equal(lido(H.textoDoDinheiro(d('r2', 'c'), F.moeda, per)), '+R$ 1.500 emprestado');
  assert.equal(lido(H.textoDoDinheiro({ valor: -90, emprestimo: 1500 }, F.moeda, per)), `+R$ 1.500 emprestado · ${F.MENOS}R$ 90 no bimestre`);
  // Condição de persona que vale conta; de outra persona, de equipe ou de
  // histórico, não.
  const bruto = lerSimples();
  opcaoDe(bruto, 'r1', 'c').efeitos = [
    { se: { persona: 'motoboy' }, soma: { renda: 50 }, rotulo: 'x' },
    { se: { equipe: 'e1' }, soma: { renda: 7 }, rotulo: 'y' },
    { se: { indicador: { renda: { abaixoDe: 0 } } }, soma: { renda: 11 }, rotulo: 'z' },
  ];
  const outro = normalizar(V, bruto);
  assert.deepEqual(H.dinheiroDaOpcao(outro, 'r1', 'c', 'motoboy'), { valor: 50, emprestimo: 0 });
});

test('dinheiroDaOpcao: no 1º bimestre, a linha da opção é a diferença real do saldo para a jornada de sempre', () => {
  // Arrange: sem dívida de antes, o saldo do bimestre de cada opção menos o da
  // "jornada de sempre" (sem efeitos) é exatamente o dinheiro da linha.
  const config = normalizar(V, lerSimples());
  const M = V.motor;
  const estado = M.estadoInicial(config, 'e1');
  const saldo = (o) => M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: o, cartaId: 'calor', estado, historico: {} }).mes.saldoMes;

  // Act + Assert
  for (const o of config.rodadas.r1.ordemOpcoes) {
    assert.equal(saldo(o) - saldo('c'), V.historia.dinheiroDaOpcao(config, 'r1', o, 'motoboy').valor, `r1/${o}`);
  }
});

test('dinheiroDaFamilia: "tem" ou "devendo", pelo patrimônio (a dívida total conta)', () => {
  const H = V.historia;
  assert.deepEqual(H.dinheiroDaFamilia({ renda: 800, emprestimo: 1500 }), { situacao: 'devendo', valor: 700 });
  assert.deepEqual(H.dinheiroDaFamilia({ renda: -2000, emprestimo: 0, contas_atrasadas: 950 }), { situacao: 'devendo', valor: 2950 });
  assert.deepEqual(H.dinheiroDaFamilia({ renda: 320.4 }), { situacao: 'tem', valor: 320 });
  assert.deepEqual(H.dinheiroDaFamilia({ renda: 0 }), { situacao: 'tem', valor: 0 });
  assert.equal(H.dinheiroDaFamilia({}), null);
  assert.equal(lido(H.textoDaFamilia({ renda: -2000, contas_atrasadas: 950 }, F.moeda)), 'devendo R$ 2.950');
  assert.equal(lido(H.textoDaFamilia({ renda: 1234 }, F.moeda)), 'tem R$ 1.234');
});

// ---------- Anfitrião: fecha sem sorteio ----------

async function jogar(config, plano) {
  const sessao = montarSessao(V, { config, sementes: [11, 22, 33] });
  const { anf, host, relogio, indiceDe } = sessao;
  const ativas = Object.keys(plano.r1);
  await anf.criarSala();
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(ativas);
  await anf.avancar();
  relogio.passar(1000);
  await anf.avancar();
  const subfases = {};
  for (const r of config.ordem.rodadas) {
    if (anf.estado().rodada !== r) await anf.pularPara(indiceDe('rodada', { rodada: r }));
    for (const eq of ativas) await anf.decidirPorEquipe(eq, plano[r][eq]);
    await anf.encerrar();
    subfases[r] = anf.estado().subfase;
  }
  return { subfases, resultados: await host.ler(s('resultados')), placar: await host.ler(s('placar')), sementes: await host.ler(s('sementes')), anf, host };
}

const PLANO = {
  r1: { e1: 'a', e2: 'b', e3: 'c', e4: 'd', e5: 'e' },
  r2: { e1: 'a', e2: 'b', e3: 'c', e4: 'd', e5: 'e' },
  r3: { e1: 'e', e2: 'd', e3: 'c', e4: 'b', e5: 'a' },
};

test('anfitrião: no formato simples, o fechamento vai direto ao resultado, com o mesmo resultado gravado', async () => {
  // Arrange: o mesmo config com e sem a chave.
  const simples = normalizar(V, lerSimples());
  const brutoComum = lerSimples();
  delete brutoComum.regras.formatoSimples;
  const comum = normalizar(V, brutoComum);

  // Act
  const a = await jogar(simples, PLANO);
  const b = await jogar(comum, PLANO);

  // Assert
  assert.deepEqual(a.subfases, { r1: 'resultado', r2: 'resultado', r3: 'resultado' });
  assert.deepEqual(b.subfases, { r1: 'sorteio', r2: 'sorteio', r3: 'sorteio' });
  assert.deepEqual(a.resultados, b.resultados, 'os resultados gravados são os mesmos');
  assert.deepEqual(a.placar, b.placar, 'o placar gravado é o mesmo');
  assert.deepEqual(a.sementes, b.sementes, 'a semente continua gravada');
  // A carta é o evento do mês: a mesma para todas as equipes.
  for (const r of simples.ordem.rodadas) assert.equal(new Set(Object.values(a.resultados[r]).map((x) => x.carta)).size, 1, `${r}: uma carta só`);
  // A consequência encadeada: a e1 puxou 12 horas em jan–fev e travou as costas em mar–abr.
  // O trabalho do bimestre: 2 × R$ 2.680, a opção de mar–abr e, só na e1, as costas.
  assert.equal(a.resultados.r2.e1.mes.trabalho, 2 * 2680 - 720 - 1230, 'a e1 (12 horas em jan–fev) paga as costas');
  assert.equal(a.resultados.r2.e2.mes.trabalho, 2 * 2680 + 2400, 'a e2 (o MEI em jan–fev), não');
});

test('anfitrião: no formato simples, avançar sai do resultado para o passo seguinte, e o desfazer reabre a decisão', async () => {
  // Arrange
  const config = normalizar(V, lerSimples());
  const { anf, host, relogio, indiceDe } = montarSessao(V, { config, sementes: [5] });
  await anf.criarSala();
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(['e1', 'e2']);
  await anf.avancar();
  relogio.passar(1000);
  await anf.avancar();
  await anf.decidirPorEquipe('e1', 'a');
  await anf.encerrar();
  const gravado = await host.ler(s('resultados', 'r1'));

  // Act: desfazer e encerrar de novo (a mesma semente, o mesmo resultado).
  await anf.desfazer();
  const reaberto = anf.estado().subfase;
  await anf.decidirPorEquipe('e1', 'a');
  await anf.encerrar();
  const refeito = await host.ler(s('resultados', 'r1'));
  await anf.avancar();

  // Assert
  assert.equal(reaberto, 'decidindo');
  assert.deepEqual(refeito, gravado);
  assert.equal(anf.estado().tipo, 'bloco', 'do resultado, o avançar vai ao bloco seguinte');
});

// ---------- Celular ----------

// D-079 (teste do Kleber de 06/10): a escolha é às cegas. Até a versão 8, a
// decisão do formato simples levava o dinheiro de cada opção ({ valor,
// emprestimo }); agora nenhuma opção leva, em formato nenhum.
test('celular: a decisão não leva o dinheiro da opção (às cegas, D-079); o "sorteio" vira resultado', async () => {
  // Arrange
  const config = normalizar(V, lerSimples());
  const brutoComum = lerSimples();
  delete brutoComum.regras.formatoSimples;
  const comum = normalizar(V, brutoComum);
  const { resultados } = await jogar(config, PLANO);
  const membro = { entrouEm: 1, equipe: 'e1' };
  const base = { membro, meusVotos: {}, decisoesDaEquipe: {}, resultados: { r1: resultados.r1 }, placar: null, uid: 'u1', agora: 0 };
  const decidindo = { tipo: 'rodada', rodada: 'r2', subfase: 'decidindo', abertoEm: 10, prazo: 999999, equipesTravadas: true };
  const sorteio = { tipo: 'rodada', rodada: 'r1', subfase: 'sorteio', equipesTravadas: true };

  // Act
  const decisao = V.alunoLogica.telaDoAluno({ ...base, conteudo: config, estado: decidindo });
  const decisaoComum = V.alunoLogica.telaDoAluno({ ...base, conteudo: comum, estado: decidindo });
  const noSorteio = V.alunoLogica.telaDoAluno({ ...base, conteudo: config, estado: sorteio });
  const noSorteioComum = V.alunoLogica.telaDoAluno({ ...base, conteudo: comum, estado: sorteio });

  // Assert
  assert.equal(decisao.tipo, 'decisao');
  assert.equal(decisao.dados.opcoes.length, 5);
  assert.ok(decisao.dados.opcoes.every((o) => !Object.hasOwn(o, 'dinheiro')), 'formato simples: nenhum dinheiro na opção');
  assert.ok(decisao.dados.opcoes.every((o) => typeof o.impacto === 'string'), 'o custo humano vai junto');
  assert.ok(decisaoComum.dados.opcoes.every((o) => !Object.hasOwn(o, 'dinheiro')), 'sem a chave, também sem dinheiro');
  assert.equal(noSorteio.tipo, 'resultado');
  assert.equal(noSorteioComum.tipo, 'sorteando');
  // O estado "resultado" chega antes do resultado (dois ouvintes): no formato
  // simples, a "votação encerrada", e nunca o "Sorteando…" das fatias.
  const semResultado = V.alunoLogica.telaDoAluno({ ...base, resultados: {}, conteudo: config, estado: { ...sorteio, subfase: 'resultado' } });
  const semResultadoComum = V.alunoLogica.telaDoAluno({ ...base, resultados: {}, conteudo: comum, estado: { ...sorteio, subfase: 'resultado' } });
  assert.deepEqual([semResultado.tipo, semResultado.dados.motivo], ['aguardando', 'votacaoEncerrada']);
  assert.equal(semResultadoComum.tipo, 'sorteando', 'sem a chave, como antes');
});

// ---------- As combinações possíveis ----------

// A conta independente: cada combinação refeita do zero, rodada a rodada, com o
// aplicar do motor (sem a árvore da enumeração).
function forcaBruta(config, equipeId, rodadas) {
  const M = V.motor;
  const opcoesDe = (r) => config.rodadas[r].ordemOpcoes;
  const todas = [];
  const montar = (k, prefixo) => {
    if (k === rodadas.length) return todas.push(prefixo);
    for (const o of opcoesDe(rodadas[k])) montar(k + 1, [...prefixo, o]);
    return null;
  };
  montar(0, []);
  return todas.map((opcoes) => {
    let estado = M.estadoInicial(config, equipeId);
    const historico = {};
    rodadas.forEach((r, i) => {
      const [{ carta }] = M.chances(config, { equipeId, rodadaId: r, opcaoId: opcoes[i], estado, historico });
      estado = M.aplicar(config, { equipeId, rodadaId: r, opcaoId: opcoes[i], cartaId: carta, estado, historico }).depois;
      historico[r] = { decisao: opcoes[i], carta };
    });
    return { opcoes, valor: M.patrimonio(estado) };
  });
}

test('enumerarCombinacoes: todas as 125 combinações, quantas fecham, a melhor e a pior, iguais à força bruta', () => {
  // Arrange
  const config = normalizar(V, lerSimples());
  const rodadas = config.ordem.rodadas;
  const bruta = forcaBruta(config, 'e1', rodadas);
  const maior = bruta.reduce((m, x) => (x.valor > m.valor ? x : m));
  const menor = bruta.reduce((m, x) => (x.valor < m.valor ? x : m));

  // Act
  const e = V.motor.enumerarCombinacoes(config, { equipeId: 'e1', rodadas });
  const deNovo = V.motor.enumerarCombinacoes(config, { equipeId: 'e1', rodadas });

  // Assert
  assert.equal(e.total, 125);
  assert.equal(e.fecham, bruta.filter((x) => x.valor >= 0).length);
  assert.ok(e.fecham > 0 && e.fecham < 125, `a fixture tem combinações que fecham e que não fecham (${e.fecham})`);
  assert.deepEqual(e.melhor, { opcoes: maior.opcoes, valor: maior.valor });
  assert.deepEqual(e.pior, { opcoes: menor.opcoes, valor: menor.valor });
  assert.deepEqual([...e.valores], bruta.map((x) => x.valor).sort((a, b) => b - a), 'os valores, do maior para o menor');
  assert.deepEqual(deNovo, e, 'determinística');
  // A consequência encadeada pesa: puxar 12 horas em jan–fev (+R$ 1.040) não
  // está na melhor combinação, porque as costas travam em mar–abr (−R$ 1.230).
  assert.notEqual(e.melhor.opcoes[0], 'a');
});

test('enumerarCombinacoes: o lugar de cada caminho jogado, e o placar gravado é o valor da combinação', async () => {
  // Arrange
  const config = normalizar(V, lerSimples());
  const rodadas = config.ordem.rodadas;
  const e = V.motor.enumerarCombinacoes(config, { equipeId: 'e1', rodadas });
  const { placar } = await jogar(config, PLANO);
  const bruta = forcaBruta(config, 'e1', rodadas);

  // Act + Assert
  for (const eq of Object.keys(PLANO.r1)) {
    const opcoes = rodadas.map((r) => PLANO[r][eq]);
    const valor = bruta.find((x) => x.opcoes.join() === opcoes.join()).valor;
    assert.equal(V.motor.patrimonio(placar[eq]), valor, `${eq}: o placar é o valor da combinação`);
    assert.equal(V.motor.lugarEntre(e.valores, valor), 1 + bruta.filter((x) => x.valor > valor).length, `${eq}: o lugar`);
  }
  assert.equal(V.motor.lugarEntre(e.valores, e.melhor.valor), 1);
  assert.equal(V.motor.lugarEntre(e.valores, e.pior.valor), 125 - bruta.filter((x) => x.valor === e.pior.valor).length + 1);
});

test('enumerarCombinacoes: com mais de uma carta possível (com sorteio), recusa', () => {
  const bruto = lerSimples();
  delete bruto.regras.formatoSimples;
  bruto.cartas.push({ id: 'outra', titulo: 'Outra', peso: 1, rodadas: ['r2'], efeitos: [] });
  const config = normalizar(V, bruto);
  assert.throws(() => V.motor.enumerarCombinacoes(config, { equipeId: 'e1', rodadas: config.ordem.rodadas }), /uma carta só/);
});

test('enumerarCombinacoes: 6 rodadas de 5 opções são 15.625 combinações, em bem menos de 1 s', () => {
  // Arrange: a fixture com as 3 rodadas repetidas (r4 a r6), como o jogo de 12 meses.
  const bruto = lerSimples();
  const extra = bruto.rodadas.map((r, i) => ({ ...structuredClone(r), id: `r${i + 4}`, titulo: `${['Jul–ago', 'Set–out', 'Nov–dez'][i]}: de novo` }));
  bruto.rodadas.push(...extra);
  bruto.cartas.push(...bruto.cartas.map((c, i) => ({ ...structuredClone(c), id: `${c.id}2`, rodadas: [`r${i + 4}`] })));
  bruto.cartas[4].efeitos[1].se = { decidiu: { r4: 'a' } };
  const passos = bruto.roteiros['60min'];
  passos.splice(passos.findIndex((p) => p.tipo === 'placarFinal'), 0, ...['r4', 'r5', 'r6'].map((rodada) => ({ tipo: 'rodada', rodada })));
  const config = normalizar(V, bruto);

  // Act
  const t0 = performance.now();
  const e = V.motor.enumerarCombinacoes(config, { equipeId: 'e1', rodadas: config.ordem.rodadas });
  const ms = performance.now() - t0;

  // Assert
  assert.equal(e.total, 15625);
  assert.equal(e.valores.length, 15625);
  assert.ok(ms < 1000, `15.625 combinações em ${ms.toFixed(0)} ms`);
});
