// O jogo simples de 06/10 (D-078): a consequência de antes na tela
// (historia.consequenciasDaRodada) e o config.json do dia, conferido com o
// motor: o Jonas para todas as vagas, 5 opções por bimestre, o valor da opção
// igual ao que o jogo cobra no 1º bimestre, a regra das costas e as outras consequências
// encadeadas, e as 15.625 combinações (281 fecham o ano, todas com ao menos uma opção puxada; D-079 e D-080).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';

const V = await carregarNucleo();
const H = V.historia;
const M = V.motor;

// ---------- historia.consequenciasDaRodada ----------

test('consequenciasDaRodada: o motivo é o rótulo até os dois-pontos, com a soma, e as equipes de mesmo motivo e valor ficam juntas', () => {
  // Arrange: duas equipes com as costas (dois efeitos cada), uma com a moto e uma sem nada.
  const costas = [{ rotulo: 'as costas travaram (2 puxadas seguidas): 7 dias parado', valor: -630 }, { rotulo: 'as costas travaram (2 puxadas seguidas): fisioterapia, 4 sessões', valor: -600, gasto: true }];
  const itens = [
    { equipeId: 'e1', deAntes: costas },
    { equipeId: 'e2', deAntes: [{ rotulo: 'IPVA já pago em janeiro', valor: 340 }] },
    { equipeId: 'e3', deAntes: [] },
    { equipeId: 'e4', deAntes: costas },
  ];

  // Act
  const grupos = H.consequenciasDaRodada(itens);

  // Assert
  assert.deepEqual(grupos, [
    { motivo: 'as costas travaram (2 puxadas seguidas)', valor: -1230, equipes: ['e1', 'e4'] },
    { motivo: 'IPVA já pago em janeiro', valor: 340, equipes: ['e2'] },
  ]);
});

test('consequenciasDaRodada: mesmo motivo com valor diferente vira outra linha; item inválido, soma zero e entrada vazia ficam de fora', () => {
  const moto = (relacao) => [{ rotulo: 'a moto quebrou (revisão adiada): 3 dias parado', valor: -270 }, { rotulo: 'a moto quebrou (revisão adiada): relação', valor: relacao }];
  const grupos = H.consequenciasDaRodada([
    { equipeId: 'e1', deAntes: moto(-520) },
    { equipeId: 'e2', deAntes: moto(-290) },
    { equipeId: 'e3', deAntes: [null, { rotulo: 'sem valor' }, { valor: 10 }, { rotulo: 'zera: a', valor: 50 }, { rotulo: 'zera: b', valor: -50 }] },
  ]);
  assert.deepEqual(grupos, [
    { motivo: 'a moto quebrou (revisão adiada)', valor: -790, equipes: ['e1'] },
    { motivo: 'a moto quebrou (revisão adiada)', valor: -560, equipes: ['e2'] },
  ]);
  assert.deepEqual(H.consequenciasDaRodada([]), []);
  assert.deepEqual(H.consequenciasDaRodada(undefined), []);
});

// ---------- O config.json do dia ----------

const configDoDia = () => V.validarConfig.validarTexto(readFileSync(join(RAIZ, 'config.json'), 'utf8'));

// Joga um caminho de letras ("ADCEDA") com o motor e devolve o resultado de cada rodada.
function jogar(cfg, letras) {
  let estado = M.estadoInicial(cfg, 'e1');
  let historico = {};
  const resultados = [];
  cfg.ordem.rodadas.forEach((r, k) => {
    const opcaoId = cfg.rodadas[r].ordemOpcoes['ABCDE'.indexOf(letras[k])];
    const baralho = M.chances(cfg, { equipeId: 'e1', rodadaId: r, opcaoId, estado, historico });
    const a = M.aplicar(cfg, { equipeId: 'e1', rodadaId: r, opcaoId, cartaId: baralho[0].carta, estado, historico });
    resultados.push(a);
    historico = { ...historico, [r]: { decisao: opcaoId, carta: baralho[0].carta } };
    estado = a.depois;
  });
  return { resultados, final: Math.round(M.patrimonio(estado)) };
}

test('config.json do dia: formato simples, o Jonas em todas as vagas, 6 bimestres × 5 opções, uma carta por bimestre e os padrões C, D, D, C, A, D', () => {
  const r = configDoDia();
  assert.deepEqual(r.erros, []);
  const cfg = r.config;
  assert.equal(cfg.regras.formatoSimples, true);
  assert.deepEqual(Object.keys(cfg.personas), ['motoboy']);
  assert.ok(cfg.ordem.equipes.every((eq) => cfg.equipes[eq].persona === 'motoboy'));
  assert.equal(cfg.ordem.rodadas.length, 6);
  for (const rid of cfg.ordem.rodadas) {
    assert.equal(cfg.rodadas[rid].ordemOpcoes.length, 5, `${rid}: 5 opções`);
    assert.equal(M.cartasPossiveisNaRodada(cfg, 'e1', rid), 1, `${rid}: uma carta, o evento do mês`);
    for (const o of cfg.rodadas[rid].ordemOpcoes) {
      const { impacto, rotulo } = H.textoDaOpcao(cfg, rid, o, 'motoboy');
      assert.ok(impacto && [...impacto].length <= 85, `${rid}/${o}: a linha do custo humano (D-073)`);
      assert.ok([...rotulo].length <= 25, `${rid}/${o}: o rótulo cabe numa linha da faixa do resultado em 1024×768 ("${rotulo}")`);
    }
  }
  assert.deepEqual(cfg.ordem.rodadas.map((rid) => cfg.rodadas[rid].padrao), ['c', 'd', 'd', 'c', 'a', 'd']);
});

// D-080 (pedido do Kleber de 06/10 à tarde): a linha "Jonas com carteira assinada" saiu do
// placar ("não agrega em nada"). Era a referência clt, −R$ 11.947 na conta de 06/10.
test('config.json do dia: o placar sem referência (sem a linha "Jonas com carteira assinada")', () => {
  const cfg = configDoDia().config;
  assert.deepEqual(cfg.ordem.referencias, []);
  assert.deepEqual(cfg.referencias, {});
});

// Decisão do Kleber de 13/10 à noite: o jogo passa a ser individual. Cada aluno
// ocupa uma vaga própria (uma "equipe de uma pessoa"), no máximo 20 conectados.
// As vagas não aparecem na tela (o telão mostra só o resumo da turma): o nome é
// neutro ("Vaga 1"), e a cor e a forma podem repetir. Até a versão 11, eram 6
// equipes com o nome da cor em uma palavra (Laranja, Celeste, Verde, Azul,
// Vermelho e Rosa; pedido de 06/10 à tarde, nota depois da D-079).
test('config.json do dia: modo individual, com 20 vagas neutras, nenhuma obrigatória, e o Jonas em todas', () => {
  const cfg = configDoDia().config;
  assert.equal(cfg.regras.individual, true);
  assert.equal(cfg.regras.formatoSimples, true, 'o modo individual exige o formato simples');
  assert.deepEqual(cfg.ordem.equipes, Array.from({ length: 20 }, (_, i) => `e${i + 1}`));
  for (const [i, eq] of cfg.ordem.equipes.entries()) {
    assert.equal(cfg.equipes[eq].nome, `Vaga ${i + 1}`);
    assert.equal(cfg.equipes[eq].persona, 'motoboy');
    assert.notEqual(cfg.equipes[eq].obrigatoria, true, `${eq}: no modo individual nenhuma vaga é obrigatória`);
  }
  assert.equal(cfg.versao, '2026-10-14-v5.3-individual');
});

// Sem a etapa de formar equipes (a vaga é dada pelo telão quando o aluno entra), e
// os tempos refeitos para o roteiro continuar fechando 60 minutos, com a decisão
// de 120 s. Desde a D-083 (pedido do Kleber de 13/10 à noite), o roteiro de 60
// min é o único: o de 120 saiu do config.
test('config.json do dia: só o roteiro de 60 min, sem "formarEquipes", com 60 minutos certos e a decisão de 120 s', () => {
  const cfg = configDoDia().config;
  assert.equal(cfg.tempos.decisaoSeg, 120);
  assert.deepEqual(Object.keys(cfg.roteiros), ['60min'], 'um roteiro só (D-083)');
  for (const [nome, minutos] of [['60min', 60]]) {
    const passos = V.roteiro.passos(cfg, nome);
    assert.equal(passos.some((p) => p.tipo === 'formarEquipes'), false, `${nome}: sem formar equipes`);
    assert.equal(passos.reduce((s, p) => s + (p.alvoSeg || 0), 0), minutos * 60, `${nome}: soma dos tempos-alvo`);
    for (const tipo of ['lobby', 'personas', 'placarFinal', 'fim']) assert.ok(passos.some((p) => p.tipo === tipo), `${nome}: ${tipo}`);
    assert.equal(passos.filter((p) => p.tipo === 'rodada').length, 6, `${nome}: os 6 bimestres`);
  }
});

// Só no 1º bimestre o saldo muda exatamente o valor da tela: dali em diante, com a
// família passada do limite do cheque especial, o que falta atrasa conta com multa
// de 8%, e a diferença vai de −R$ 99 a +R$ 83 (revisão de 06/10).
test('config.json do dia: no 1º bimestre (jan–fev), o dinheiro da opção é o que o jogo cobra (o saldo muda exatamente esse valor em relação à jornada de sempre)', () => {
  const cfg = configDoDia().config;
  // Jan–fev é o primeiro bimestre: sem dívida de antes, sem juros, sem consequência.
  const base = jogar(cfg, 'CDDCAD').resultados[0].mes.saldoMes;
  for (const [i, o] of cfg.rodadas.r1.ordemOpcoes.entries()) {
    const letra = 'ABCDE'[i];
    const saldo = jogar(cfg, `${letra}DDCAD`).resultados[0].mes.saldoMes;
    assert.equal(Math.round(saldo - base), H.dinheiroDaOpcao(cfg, 'r1', o, 'motoboy').valor, `r1/${o}`);
  }
});

test('config.json do dia: as costas travam na segunda puxada seguida (−R$ 1.230), e só nela', () => {
  const cfg = configDoDia().config;
  const motivo = (a) => H.consequenciasDaRodada([{ equipeId: 'e1', deAntes: a.deAntes }]);
  // A (12 h no sol) e B (dois apps) seguidas: as costas travam em mar–abr.
  const puxadas = jogar(cfg, 'ABDCAD').resultados;
  assert.deepEqual(motivo(puxadas[1]), [{ motivo: 'as costas travaram (2 bimestres puxados seguidos)', valor: -1230, equipes: ['e1'] }]);
  // A e depois D (aceitar até entrega ruim): nada.
  assert.deepEqual(motivo(jogar(cfg, 'ADDCAD').resultados[1]), []);
  // As seis puxadas (A, B, C, A, D, B): as costas travam em todo bimestre depois do primeiro.
  const todas = jogar(cfg, 'ABCADB').resultados;
  assert.deepEqual(todas.map((a) => motivo(a).length), [0, 1, 1, 1, 1, 1]);
});

test('config.json do dia: as consequências encadeadas (o IPVA já pago, a parcela atrasada, a moto que quebra e o pneu que já era novo)', () => {
  const cfg = configDoDia().config;
  const valoresDe = (a) => H.consequenciasDaRodada([{ equipeId: 'e1', deAntes: a.deAntes }]).map((g) => [g.motivo, g.valor]);
  assert.deepEqual(valoresDe(jogar(cfg, 'EDDCAD').resultados[1]), [['IPVA já pago em janeiro', 340]]);
  assert.deepEqual(valoresDe(jogar(cfg, 'BDDCAD').resultados[1]), [['parcela da moto atrasada, com multa e juros', -500]]);
  // Revisão adiada (jul–ago, C, o padrão): a moto quebra em set–out; com o pneu trocado em mai–jun, só a relação.
  assert.deepEqual(valoresDe(jogar(cfg, 'CDDCAD').resultados[4]), [['a moto quebrou (revisão adiada)', -790]]);
  assert.deepEqual(valoresDe(jogar(cfg, 'CDACAD').resultados[4]), [['a moto quebrou (revisão adiada)', -560]]);
  assert.deepEqual(valoresDe(jogar(cfg, 'CDDDAD').resultados[4]), [], 'sem a revisão adiada, a moto não quebra');
});

// D-079 (06/10, de manhã): o pior caso tinha de ficar abaixo de R$ 7.000 de dívida (era
// R$ 10.906). A casa foi recontada e o bloqueio passou a 5 dias; com isso, 260 combinações
// fechavam o ano, e nenhuma delas sem ao menos uma opção puxada. D-080 (06/10, à tarde):
// "Presente para a filha" (−R$ 170) entra no lugar de "Temporário com carteira"
// (−R$ 1.230) em nov–dez E; 281 fecham, e a pior passa de DAECCE (−R$ 6.783) a DAECCC.
test('config.json do dia: das 15.625 combinações, 281 fecham o ano; a melhor é ADCEDA (sem nenhum bimestre de descanso), a pior deve menos de R$ 7.000, e o padrão termina devendo R$ 3.291', () => {
  const cfg = configDoDia().config;
  const c = M.enumerarCombinacoes(cfg, { equipeId: 'e1', rodadas: cfg.ordem.rodadas });
  assert.equal(c.total, 15625);
  assert.equal(c.fecham, 281);
  assert.equal(c.melhor.opcoes.map((o, k) => 'ABCDE'[cfg.rodadas[cfg.ordem.rodadas[k]].ordemOpcoes.indexOf(o)]).join(''), 'ADCEDA');
  assert.equal(Math.round(c.melhor.valor), 1714);
  assert.equal(c.pior.opcoes.map((o, k) => 'ABCDE'[cfg.rodadas[cfg.ordem.rodadas[k]].ordemOpcoes.indexOf(o)]).join(''), 'DAECCC');
  assert.equal(Math.round(c.pior.valor), -6135);
  assert.ok(c.pior.valor > -7000, 'o pior caso deve menos de R$ 7.000 (pedido do Kleber, D-079)');
  assert.equal(jogar(cfg, 'CDDCAD').final, -3291);
});

// Revisão final de 14/10 (pedido do Kleber, 11h): o "Conheça o Jonas" mais
// limpo. O celular mostra a conta do mês comum sem carregar o motor
// (alunoLogica.contaDoMesComum); ela tem de bater com o motor.mesComum do
// telão, número a número. E o config traz o nome curto de cada item do básico
// e as fontes em uma linha (persona.fontesCurtas), sem as notas internas das
// recontas (o histórico fica na D-079).
test('config.json do dia: a conta do mês do celular é a mesma do motor.mesComum do telão', () => {
  const cfg = configDoDia().config;
  const m = M.mesComum(cfg, 'e1');
  const c = V.alunoLogica.contaDoMesComum(cfg, 'e1');
  assert.equal(c.trabalho, m.trabalho);
  assert.equal(c.fixos.reduce((s, f) => s + f.valor, 0), m.custosFixos);
  assert.equal(c.outraRenda, m.outraRenda);
  assert.equal(c.basico, m.basico);
  assert.equal(c.saldo, m.saldoMes);
  assert.deepEqual([c.trabalho, c.fixos.map((f) => f.valor), c.outraRenda, c.basico, c.saldo], [2680, [480], 1600, 3928, -128]);
  assert.equal(c.fontes.length, cfg.personas.motoboy.todoMes.length, 'a fonte do trabalho e a da parcela');
});

test('contaDoMesComum: um todoMes que o celular não sabe somar (condição, multiplicador) fica sem a conta', () => {
  const cfg = structuredClone(configDoDia().config);
  cfg.personas.motoboy.todoMes[0].se = { rodada: 'r1' };
  assert.equal(V.alunoLogica.contaDoMesComum(cfg, 'e1'), null);
  const cfg2 = structuredClone(configDoDia().config);
  cfg2.personas.motoboy.todoMes[0].multiplica = { renda: 0.5 };
  assert.equal(V.alunoLogica.contaDoMesComum(cfg2, 'e1'), null);
});

test('config.json do dia: o nome curto de cada item do básico, as fontes curtas e nenhuma nota interna das recontas', () => {
  const cfg = configDoDia().config;
  const p = cfg.personas.motoboy;
  assert.deepEqual(p.basico.itens.map((i) => i.curto), ['comida', 'aluguel', 'luz', 'água', 'gás', 'ônibus', 'celular', 'remédios']);
  assert.equal(p.fontesCurtas, 'IBGE (PNAD 2025), DIEESE/Conab, QuintoAndar, CEEE, DMAE, Tabela Fipe');
  const fontes = [...p.basico.itens.map((i) => i.fonte), p.outraRenda.fonte];
  for (const f of fontes) {
    assert.doesNotMatch(f, /D-079|até 06\/10 de manhã|: B\)/, `sem nota interna: "${f.slice(0, 60)}…"`);
  }
  // Os números e a fonte de cada valor não mudaram.
  assert.deepEqual(p.basico.itens.map((i) => i.valor), [2098, 1200, 162, 119, 89, 95, 75, 90]);
  assert.equal(p.outraRenda.valor, 1600);
  assert.match(p.basico.itens[1].fonte, /^QuintoAndar, lido em 29\/09\/2026/);
});

test('validador: "curto" e "fontesCurtas" são opcionais e, ausentes, não mudam o hash', () => {
  const bruto = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  const com = V.validarConfig.validar(bruto);
  assert.deepEqual(com.erros, []);
  const sem = structuredClone(bruto);
  delete sem.personas[0].fontesCurtas;
  for (const i of sem.personas[0].basico.itens) delete i.curto;
  const r = V.validarConfig.validar(sem);
  assert.deepEqual(r.erros, []);
  assert.equal(r.config.personas.motoboy.fontesCurtas, undefined);
  assert.equal(r.config.personas.motoboy.basico.itens[0].curto, undefined);
  assert.notEqual(V.validarConfig.hash(r.config), V.validarConfig.hash(com.config));
  const errado = structuredClone(bruto);
  errado.personas[0].basico.itens[0].curtoo = 'x';
  assert.ok(V.validarConfig.validar(errado).erros.some((e) => /curtoo/.test(e.caminho + e.mensagem)), 'chave errada no item do básico é erro');
});
