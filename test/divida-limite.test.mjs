// D-066 (o cheque especial tem limite) e D-067 (a proteção que rende mais que
// o trabalho), no núcleo: validador, motor, história, celular e anfitrião.
//
// Por quê: na revisão de 01/10, com 12 meses, os juros de 7,43% ao mês
// compunham sobre a dívida inteira, e no piloto automático com a carta
// "Normal" a Daiane terminava devendo R$ 38.782 ao banco (a Rose, R$ 35.112).
// Com o limite, o banco para em −limite; o que passaria vira conta atrasada
// (com multa uma vez e mora ao mês) e comida que não foi comprada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { configMinimo, lerConfigTesteV3, lerConfigTesteV31, normalizar } from './fixtures/configs.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';

const V = await carregarNucleo();
const M = V.motor;
const H = V.historia;

const IND_ATRASADAS = { id: 'contas_atrasadas', nome: 'Contas atrasadas', formato: 'moeda', inicial: 0, min: 0, max: 1000000 };
const IND_MESA = { id: 'faltou_na_mesa', nome: 'Faltou na mesa', formato: 'moeda', inicial: 0, min: 0, max: 1000000 };
const REGRAS_LIMITE = { limiteChequeEspecial: 1000, limiteFonte: 'teste', multaAtraso: 0.1, moraMes: 0.01, atrasoFonte: 'teste' };

// O mínimo com o limite de R$ 1.000: básico de 700 (aluguel) + 300 (comida),
// juros de 10% ao mês (o do configMinimo), trabalho por mês na opção "a".
function minimoComLimite({ trabalho = 0, regras = {}, rodadas = 1, meses } = {}) {
  const b = configMinimo();
  Object.assign(b.regras, REGRAS_LIMITE, regras);
  if (meses !== undefined) b.regras.mesesPorRodada = meses;
  b.indicadores.push({ ...IND_ATRASADAS }, { ...IND_MESA });
  b.personas[0].basico = { itens: [{ rotulo: 'aluguel', valor: 700, fonte: 't' }, { rotulo: 'comida', valor: 300, fonte: 't', comida: true }] };
  if (trabalho) b.personas[0].todoMes = [{ soma: { renda: trabalho }, rotulo: 'trabalho' }];
  b.rodadas = [];
  for (let k = 1; k <= rodadas; k += 1) {
    b.rodadas.push({ id: `r${k}`, titulo: `Rodada ${k}`, texto: 'Texto', padrao: 'b', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } });
  }
  b.roteiros['60min'] = [{ tipo: 'lobby' }, ...b.rodadas.map((r) => ({ tipo: 'rodada', rodada: r.id })), { tipo: 'fim' }];
  return b;
}

const aplicar = (config, estado, rodadaId = 'r1') => M.aplicar(config, { equipeId: 'e1', rodadaId, opcaoId: 'a', cartaId: 'normal', estado });
// As linhas de cada indicador somam o delta dele (contratos, seção 3).
function linhasFecham(a) {
  for (const ind of Object.keys(a.delta)) {
    const soma = a.linhas.filter((l) => l.indicador === ind).reduce((s, l) => s + l.valor, 0);
    assert.ok(Math.abs(soma - a.delta[ind]) < 1e-9, `as linhas de ${ind} somam ${soma}, e o delta é ${a.delta[ind]}`);
  }
}

// O config.json real com o limite (D-066), se ainda não tiver: o caso que
// estourava é da conta do motor, e não do conteúdo do dia.
function realComLimite() {
  const bruto = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  if (bruto.regras.limiteChequeEspecial === undefined) {
    Object.assign(bruto.regras, { limiteChequeEspecial: 1500, limiteFonte: 'teste', multaAtraso: 0.1, moraMes: 0.01, atrasoFonte: 'teste' });
    bruto.indicadores.push({ ...IND_ATRASADAS }, { ...IND_MESA });
    for (const p of bruto.personas) {
      if (!p.basico.itens.some((i) => i.comida === true)) p.basico.itens.find((i) => /comida/.test(i.rotulo)).comida = true;
    }
  }
  return normalizar(V, bruto);
}

// ------------------------------------------------------------- validador

test('validador: o config v3.1 passa, o cortarPrimeiro ausente vira "contas" e o v3 continua com o mesmo hash', () => {
  // Arrange
  const v31 = lerConfigTesteV31();
  delete v31.regras.cortarPrimeiro;
  const v3 = lerConfigTesteV3();
  const v3ComFalse = lerConfigTesteV3();
  v3ComFalse.personas[0].basico.itens[1].comida = false;

  // Act
  const r = V.validarConfig.validar(v31);
  const h3 = V.validarConfig.hash(normalizar(V, v3));
  const h3f = V.validarConfig.hash(normalizar(V, v3ComFalse));

  // Assert
  assert.equal(r.ok, true, JSON.stringify(r.erros));
  assert.equal(r.config.regras.cortarPrimeiro, 'contas', 'o padrão vai escrito no normalizado (o celular o lê da sala)');
  assert.equal(r.config.regras.limiteChequeEspecial, 1500);
  assert.equal(r.config.personas.motoboy.basico.itens[1].comida, true);
  assert.equal(h3, h3f, '"comida": false some na normalização');
  assert.equal(Object.hasOwn(normalizar(V, v3).regras, 'cortarPrimeiro'), false, 'sem o limite, nada da D-066 entra no normalizado');
});

test('validador: o que a D-066 recusa', () => {
  const erros = (mudar) => {
    const b = lerConfigTesteV31();
    mudar(b);
    return V.validarConfig.validar(b).erros.map((e) => e.caminho);
  };
  const ind = (b, id) => b.indicadores.find((i) => i.id === id);
  assert.ok(erros((b) => { delete b.regras.limiteFonte; }).includes('regras.limiteFonte'), 'limite sem fonte');
  assert.ok(erros((b) => { delete b.regras.multaAtraso; }).includes('regras.multaAtraso'), 'limite sem multa');
  assert.ok(erros((b) => { delete b.regras.atrasoFonte; }).includes('regras.atrasoFonte'), 'multa sem fonte');
  assert.ok(erros((b) => { b.regras.moraMes = 1; }).includes('regras.moraMes'), '"1" no lugar de 0,01');
  assert.ok(erros((b) => { b.regras.multaAtraso = -0.1; }).includes('regras.multaAtraso'));
  assert.ok(erros((b) => { b.regras.limiteChequeEspecial = 1500.5; }).includes('regras.limiteChequeEspecial'));
  assert.ok(erros((b) => { b.regras.cortarPrimeiro = 'aluguel'; }).includes('regras.cortarPrimeiro'));
  assert.ok(erros((b) => { delete b.regras.limiteChequeEspecial; delete b.regras.limiteFonte; }).includes('regras.multaAtraso'), 'multa sem limite não tem efeito');
  assert.ok(erros((b) => { b.indicadores = b.indicadores.filter((i) => i.id !== 'faltou_na_mesa'); }).includes('indicadores'), 'falta o indicador');
  assert.ok(erros((b) => { ind(b, 'contas_atrasadas').min = -10; }).includes('indicadores.contas_atrasadas.min'));
  assert.ok(erros((b) => { ind(b, 'contas_atrasadas').inicial = 10; }).includes('indicadores.contas_atrasadas.inicial'));
  assert.ok(erros((b) => { ind(b, 'faltou_na_mesa').max = 5000; }).includes('indicadores.faltou_na_mesa.max'), 'o máximo cortaria o acumulado');
  assert.ok(erros((b) => { ind(b, 'renda').min = -1000; }).includes('regras.limiteChequeEspecial'), 'o mínimo da renda cortaria antes do limite');
  assert.ok(erros((b) => { delete b.personas[0].basico.itens[1].comida; }).includes('personas.motoboy.basico.itens'), 'sem o item da comida');
  assert.ok(erros((b) => { b.personas[0].basico.itens[1].comida = 'sim'; }).includes('personas.motoboy.basico.itens[1].comida'));
  assert.ok(erros((b) => { b.cartas[0].efeitos.push({ soma: { contas_atrasadas: 100 } }); }).some((c) => c.endsWith('soma.contas_atrasadas')), 'só o motor mexe');
  // Sem o limite, os dois ids ficam reservados.
  const v3 = lerConfigTesteV3();
  v3.indicadores.push({ ...IND_ATRASADAS });
  assert.ok(V.validarConfig.validar(v3).erros.some((e) => e.caminho === 'indicadores.contas_atrasadas'));
});

// ------------------------------------------------------------------ motor

test('motor: dentro do limite nada muda; passou, o excedente vira contas atrasadas (com multa uma vez) e comida cortada', () => {
  // Arrange: sem trabalho, cada mês custa 1.000 (700 de aluguel + 300 de comida).
  //   Mês 1, de 0: caixa −1.000, ainda no limite. Nada atrasa.
  //   Mês 2, de −1.000: juros 100; caixa −2.100; excedente 1.100. "contas":
  //   atrasam os 700 das contas do mês, a comida corta 300, e o resto (100)
  //   também atrasa: atrasou 800, faltou na mesa 300, multa 80.
  //   saldoMes = −1.000 − 100 + 300 − 80 = −880; patrimônio −1.000 − 880 = −1.880.
  const config = normalizar(V, minimoComLimite());

  // Act
  const m1 = aplicar(config, M.estadoInicial(config, 'e1'));
  const m2 = aplicar(config, m1.depois);

  // Assert
  assert.equal(m1.depois.renda, -1000);
  assert.deepEqual([m1.mes.dividaBanco, m1.mes.contasAtrasadas, m1.mes.faltouNaMesa, m1.mes.multa, m1.mes.atrasou], [1000, 0, 0, 0, 0]);
  assert.equal(m2.mes.juros, 100, 'os juros incidem só até o limite');
  assert.equal(m2.depois.renda, -1000, 'o banco não passa do limite');
  assert.equal(m2.mes.dividaBanco, 1000);
  assert.equal(m2.mes.atrasou, 800);
  assert.equal(m2.mes.faltouNaMesa, 300);
  assert.equal(m2.mes.multa, 80);
  assert.equal(m2.mes.contasAtrasadas, 880);
  assert.equal(m2.depois.contas_atrasadas, 880);
  assert.equal(m2.depois.faltou_na_mesa, 300);
  assert.equal(m2.mes.saldoMes, -880);
  assert.equal(M.patrimonio(m2.depois), -1880, 'o patrimônio desconta as contas atrasadas, e não a comida');
  assert.equal(M.patrimonio(m2.depois) - M.patrimonio(m1.depois), m2.mes.saldoMes, 'saldoMes continua sendo a variação do patrimônio');
  linhasFecham(m1);
  linhasFecham(m2);
  assert.deepEqual(m2.linhas.filter((l) => ['atraso', 'faltouNaMesa', 'multa', 'mora', 'contasPagas'].includes(l.origem)).map((l) => [l.origem, l.indicador, l.valor]), [
    ['faltouNaMesa', 'renda', 300], ['faltouNaMesa', 'faltou_na_mesa', 300],
    ['atraso', 'renda', 800], ['atraso', 'contas_atrasadas', 800],
    ['multa', 'contas_atrasadas', 80],
  ]);
});

test('motor: a mora é mensal e simples; a multa só sobre o que atrasou de novo', () => {
  // Arrange: de −1.000 no banco e 880 atrasados, o mês 3 igual ao 2.
  //   mora = round(880 × 1%) = 9; atrasou 800 de novo, multa 80; 880 + 9 + 800 + 80 = 1.769.
  //   No bimestre (m = 2): mora = round(880 × 1% × 2) = 18 (simples, e não 17,69 composta).
  const mes = normalizar(V, minimoComLimite());
  const bimestre = normalizar(V, minimoComLimite({ meses: 2 }));
  const estado = { renda: -1000, energia: 8, contas_atrasadas: 880, faltou_na_mesa: 300 };

  // Act
  const m3 = aplicar(mes, estado);
  const b = aplicar(bimestre, estado);

  // Assert
  assert.equal(m3.mes.mora, 9);
  assert.equal(m3.mes.multa, 80);
  assert.equal(m3.mes.contasAtrasadas, 1769);
  assert.equal(m3.mes.faltouNaMesaAcumulado, 600);
  assert.equal(m3.mes.contasAtrasadasAntes, 880);
  assert.equal(b.mes.mora, 18);
  linhasFecham(m3);
  linhasFecham(b);
});

test('motor: cortarPrimeiro decide quem paga um excedente pequeno', () => {
  // Arrange: de −1.000 no banco, um mês que custa 1.000 com trabalho de 600:
  //   juros 100, caixa −1.000 + 600 − 1.000 − 100 = −1.500; excedente 500.
  //   "contas": atrasam 500 das contas (700), a comida fica inteira; multa 50.
  //   "comida": a comida corta 300, atrasam 200; multa 20.
  const contas = normalizar(V, minimoComLimite({ trabalho: 600 }));
  const comida = normalizar(V, minimoComLimite({ trabalho: 600, regras: { cortarPrimeiro: 'comida' } }));
  const estado = { renda: -1000, energia: 8, contas_atrasadas: 0, faltou_na_mesa: 0 };

  // Act
  const a = aplicar(contas, estado);
  const b = aplicar(comida, estado);

  // Assert
  assert.deepEqual([a.mes.atrasou, a.mes.faltouNaMesa, a.mes.multa], [500, 0, 50]);
  assert.deepEqual([b.mes.atrasou, b.mes.faltouNaMesa, b.mes.multa], [200, 300, 20]);
  assert.equal(a.depois.renda, -1000);
  assert.equal(b.depois.renda, -1000);
});

test('motor: num mês bom, a folga até o limite paga as contas atrasadas (com a mora)', () => {
  // Arrange: 500 atrasados. Trabalho de 2.500: do zero, caixa +1.500; mora 5;
  //   paga 505 e fica com 995. Trabalho de 1.200 a partir de −1.000: juros
  //   100, caixa −900; a folga até o limite é 100: paga 100, fica 405.
  const bom = normalizar(V, minimoComLimite({ trabalho: 2500 }));
  const apertado = normalizar(V, minimoComLimite({ trabalho: 1200 }));

  // Act
  const a = aplicar(bom, { renda: 0, energia: 8, contas_atrasadas: 500, faltou_na_mesa: 0 });
  const b = aplicar(apertado, { renda: -1000, energia: 8, contas_atrasadas: 500, faltou_na_mesa: 0 });

  // Assert
  assert.deepEqual([a.mes.mora, a.mes.contasPagas, a.mes.contasAtrasadas, a.depois.renda], [5, 505, 0, 995]);
  assert.deepEqual([b.mes.contasPagas, b.mes.contasAtrasadas, b.depois.renda, b.mes.dividaBanco], [100, 405, -1000, 1000]);
  assert.equal(a.mes.saldoMes, M.patrimonio(a.depois) - M.patrimonio({ renda: 0, contas_atrasadas: 500 }));
  linhasFecham(a);
  linhasFecham(b);
});

test('motor: sem o limite o mês fica igual ao de antes, campo a campo; o mesComum ignora o limite', () => {
  // Arrange
  const v3 = normalizar(V, lerConfigTesteV3());
  const v31 = normalizar(V, lerConfigTesteV31());
  const estado = M.estadoInicial(v3, 'e1');

  // Act
  const a = M.aplicar(v3, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'c', cartaId: 'normal', estado });
  const comum = M.mesComum(v31, 'e1');

  // Assert
  assert.equal(Object.hasOwn(a.mes, 'dividaBanco'), false);
  assert.equal(Object.hasOwn(a.mes, 'contasAtrasadas'), false);
  assert.equal(Object.hasOwn(comum, 'dividaBanco'), false, 'o furo de um mês comum é sem dívida');
  assert.deepEqual(comum, M.mesComum(normalizar(V, lerConfigTesteV3()), 'e1'));
});

test('o caso que estourava: 12 meses no padrão da Daiane, com a carta "Normal" — o banco para no limite', () => {
  // Arrange: sem o limite (o config da revisão de 01/10), a Daiane terminava
  // devendo R$ 38.782 ao banco. Com o limite: o banco nunca passa dele, o
  // excedente vira contas atrasadas e comida cortada, a multa é cobrada uma
  // vez sobre o que atrasou, a mora todo bimestre sobre o atrasado de antes.
  const config = realComLimite();
  const limite = config.regras.limiteChequeEspecial;
  const { moraMes, multaAtraso } = config.regras;
  const eq = config.ordem.equipes.find((e) => config.personas[config.equipes[e].persona].nome === 'Daiane');
  const persona = config.personas[config.equipes[eq].persona];
  const comida = M.comidaDoBasico(persona) * 2;
  let estado = M.estadoInicial(config, eq);
  const historico = {};
  const meses = [];

  // Act
  for (const r of config.ordem.rodadas) {
    const op = config.rodadas[r].padrao;
    const a = M.aplicar(config, { equipeId: eq, rodadaId: r, opcaoId: op, cartaId: 'normal', estado, historico });
    meses.push({ antes: estado, a });
    historico[r] = { decisao: op, carta: 'normal' };
    estado = a.depois;
  }

  // Assert
  let mesaAcumulada = 0;
  for (const { antes, a } of meses) {
    const m = a.mes;
    assert.ok(a.depois.renda >= -limite, `o banco nunca passa de −${limite} (${a.depois.renda})`);
    assert.ok(m.dividaBanco <= limite);
    assert.ok(m.juros <= Math.round(limite * ((1 + config.regras.jurosDividaMes) ** 2 - 1)), 'os juros só até o limite');
    assert.equal(m.multa, Math.round(m.atrasou * multaAtraso), 'a multa é sobre o que atrasou neste bimestre, uma vez');
    // Revisão da F6c: a base da mora é o principal (sem a multa e a mora de antes).
    const principal = antes.contas_atrasadas_principal ?? antes.contas_atrasadas ?? 0;
    assert.equal(m.mora, Math.round(principal * moraMes * 2), 'a mora é mensal (× 2 no bimestre), sobre o principal atrasado de antes');
    assert.ok((a.depois.contas_atrasadas_principal ?? 0) <= a.depois.contas_atrasadas, 'o principal nunca passa do atrasado');
    assert.ok(m.faltouNaMesa >= 0 && m.faltouNaMesa <= comida, 'no máximo a comida do bimestre');
    mesaAcumulada += m.faltouNaMesa;
    assert.equal(a.depois.faltou_na_mesa, mesaAcumulada);
    assert.equal(a.depois.contas_atrasadas, m.contasAtrasadas);
    assert.equal(M.patrimonio(a.depois), a.depois.renda - a.depois.emprestimo - a.depois.contas_atrasadas);
    assert.ok(Math.abs(M.patrimonio(a.depois) - M.patrimonio(antes) - m.saldoMes) < 1e-9, 'saldoMes = variação do patrimônio');
    linhasFecham(a);
  }
  assert.equal(estado.renda, -limite, 'termina no limite');
  assert.ok(estado.contas_atrasadas > 0, 'o excedente virou conta atrasada');
  assert.ok(estado.faltou_na_mesa > 0, 'e comida que não foi comprada');
  const dividaTotal = -estado.renda + estado.emprestimo + estado.contas_atrasadas;
  const teto = limite + M.totalBasico(persona) * 12;
  assert.ok(dividaTotal < teto, `sem juros compostos sem fim: dívida total ${dividaTotal} < ${teto}`);
  assert.ok(M.patrimonio(estado) > -38782, 'menos fundo que os R$ 38.782 de juros sobre juros');
});

test('decompor com o limite: o realizado é o patrimônio com as contas atrasadas, exato e estimado batem', () => {
  // Arrange: 4 rodadas da fixture v3.1 (exato), no padrão, com a carta que
  // deixa o menor patrimônio em cada uma (a costureira, a mais apertada): é o
  // caminho que passa do limite e atrasa contas.
  const config = normalizar(V, lerConfigTesteV31());
  const rodadas = [];
  let estado = M.estadoInicial(config, 'e5');
  const historico = {};
  for (const rodadaId of config.ordem.rodadas.slice(0, 4)) {
    const opcaoId = config.rodadas[rodadaId].padrao;
    let pior = null;
    for (const c of M.chances(config, { equipeId: 'e5', rodadaId, opcaoId, estado, historico })) {
      const depois = M.aplicar(config, { equipeId: 'e5', rodadaId, opcaoId, cartaId: c.carta, estado, historico }).depois;
      if (!pior || M.patrimonio(depois) < M.patrimonio(pior.depois)) pior = { carta: c.carta, depois };
    }
    rodadas.push({ rodadaId, opcaoId, cartaId: pior.carta });
    historico[rodadaId] = { decisao: opcaoId, carta: pior.carta };
    estado = pior.depois;
  }

  // Act
  const exato = M.decompor(config, { equipeId: 'e5', rodadas, modo: 'exato' });
  const estimado = M.decompor(config, { equipeId: 'e5', rodadas, modo: 'estimado' });

  // Assert
  assert.equal(exato.realizado, M.patrimonio(estado));
  assert.ok(estado.contas_atrasadas > 0, 'o caminho atrasou contas (senão o teste não prova nada)');
  assert.equal(estimado.realizado, exato.realizado);
  assert.ok(estimado.piorCaso >= exato.piorCaso - 1e-9, 'o pior estimado é um caminho de verdade');
  const escala = Math.abs(exato.esperadoComDecisoes) + 1000;
  assert.ok(Math.abs(estimado.esperadoComDecisoes - exato.esperadoComDecisoes) / escala < 0.05, `${estimado.esperadoComDecisoes} perto de ${exato.esperadoComDecisoes}`);
});

// ------------------------------------------------------------------ D-067

test('D-067: a proteção que passa do trabalho de um bimestre comum é detectada, e só ela', () => {
  // Arrange: trabalho de 500 por mês (1.000 no bimestre); o INSS na carta.
  const montar = (inss) => {
    const b = minimoComLimite({ trabalho: 500, meses: 2 });
    b.cartas[0].efeitos = [{ soma: { renda: inss }, categoria: 'protecao', rotulo: 'auxílio do INSS' }];
    return normalizar(V, b);
  };
  const estado = { renda: 0, energia: 8, contas_atrasadas: 0, faltou_na_mesa: 0 };
  const resolver = (config) => M.resolverRodada(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', estado, semente: 1 });

  // Act
  const acima = resolver(montar(1200));
  const abaixo = resolver(montar(900));

  // Assert
  assert.equal(M.trabalhoComum(montar(1200), 'e1'), 1000);
  assert.deepEqual(acima.protecaoAcimaDoTrabalho, { pagou: 1200, trabalhoComum: 1000 });
  assert.equal(Object.hasOwn(abaixo, 'protecaoAcimaDoTrabalho'), false);
  assert.equal(M.protecaoAcimaDoTrabalho(montar(0), 'e1', { protecao: 0 }), null, 'sem proteção, nada');
});

test('D-067 no config real: o auxílio do MEI passa do trabalho da Bruna e da Daiane, e não do Kauã', () => {
  // Arrange: MEI em jan–fev com a fratura, o INSS chega em mar–abr.
  const config = realComLimite();
  const [r1, r2] = config.ordem.rodadas;
  const mei = config.rodadas[r1].ordemOpcoes.find((o) => config.rodadas[r1].opcoes[o].protege === true);
  const caso = (nome) => {
    const eq = config.ordem.equipes.find((e) => config.personas[config.equipes[e].persona].nome === nome);
    const a1 = M.aplicar(config, { equipeId: eq, rodadaId: r1, opcaoId: mei, cartaId: 'fratura', estado: M.estadoInicial(config, eq), historico: {} });
    const a2 = M.aplicar(config, { equipeId: eq, rodadaId: r2, opcaoId: config.rodadas[r2].padrao, cartaId: 'normal', estado: a1.depois, historico: { [r1]: { decisao: mei, carta: 'fratura' } } });
    return M.protecaoAcimaDoTrabalho(config, eq, a2.mes);
  };

  // Act / Assert
  assert.ok(caso('Bruna'), 'Bruna');
  assert.ok(caso('Daiane'), 'Daiane');
  assert.equal(caso('Kauã'), null, 'o Kauã fica quase lá');
  assert.equal(caso('Jonas'), null);
});

test('história e celular: os campos da D-066 e a frase da D-067', () => {
  // Arrange
  const conteudo = normalizar(V, lerConfigTesteV31());
  const mes = {
    trabalho: 600, custosFixos: 0, gastos: 0, protecao: 2431, outraRenda: 0, entrou: 600, basico: 4000, juros: 231, saldoMes: -1300, dividaAntes: 1500,
    dividaBanco: 1500, contasAtrasadasAntes: 0, mora: 0, contasPagas: 0, atrasou: 1200, multa: 120, contasAtrasadas: 1320, faltouNaMesa: 400, faltouNaMesaAcumulado: 400,
  };
  const depois = { renda: -1500, energia: 5, protecao: 3, emprestimo: 0, contas_atrasadas: 1320, faltou_na_mesa: 400 };
  const res = {
    decisao: 'c', origem: 'maioria', carta: 'normal', delta: {}, depois, mes, protecaoEvitou: 2431,
    protecaoItens: [{ rotulo: 'auxílio do INSS (45 dias)', valor: 2431 }], protecaoAcimaDoTrabalho: { pagou: 2431, trabalhoComum: 1400 },
  };
  const resultados = { r2: { e4: res } };
  const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
  const tela = (estado) => V.alunoLogica.telaDoAluno({
    conteudo, estado, membro: { entrouEm: 100, equipe: 'e4' }, meusVotos: {}, decisoesDaEquipe: null,
    resultados, placar: null, uid: 'eu', agora: 0, meta: { roteiro: '60min', entradaAberta: true },
  });
  const moeda = (x) => `R$ ${x}`;

  // Act
  const historia = H.historiaDaEquipe(conteudo, 'e4', resultados);
  const resumo = H.resumoPorRodada(conteudo, 'e4', resultados);
  const resultado = tela({ geracao: 9, indice: 7, tipo: 'rodada', rodada: 'r2', subfase: 'resultado', abertoEm: 200, equipesTravadas: true, equipesAbertas: TODAS });
  const protecao = H.protecaoDoResultado(res);

  // Assert
  // Revisão da F6c: o total é o banco e o empréstimo; as contas atrasadas, à parte.
  assert.deepEqual(H.dividaTotal(depois), { chequeEspecial: 1500, emprestimo: 0, contasAtrasadas: 1320, total: 1500 });
  assert.deepEqual(H.dividaTotal({ renda: -10, emprestimo: 5 }), { chequeEspecial: 10, emprestimo: 5, total: 15 }, 'sem o indicador, como antes');
  assert.equal(H.patrimonioDe(depois), -2820);
  assert.equal(H.patrimonioDe(depois), M.patrimonio(depois), 'a mesma conta do motor');
  assert.equal(historia[0].faltouNaMesa, 400);
  assert.equal(resumo[0].faltouNaMesa, 400);
  assert.equal(resumo[0].faltouNaMesaAcumulado, 400);
  assert.equal(resultado.tipo, 'resultado');
  assert.deepEqual(resultado.dados.divida, { valor: 1500, jurosMes: 0.08, limite: 1500, contasAtrasadas: 1320, faltouNaMesa: 400 });
  assert.equal(resultado.dados.mes.contasAtrasadas, 1320);
  assert.deepEqual(protecao.acimaDoTrabalho, { trabalhoComum: 1400 });
  assert.deepEqual(resultado.dados.protecaoDoMes.acimaDoTrabalho, { trabalhoComum: 1400 });
  assert.equal(H.fraseAcimaDoTrabalho(protecao, 'Bruna', moeda, H.periodo(conteudo)),
    'Auxílio do INSS (45 dias): R$ 2431, mais do que Bruna ganhava trabalhando num bimestre comum (R$ 1400).');
  assert.equal(H.fraseAcimaDoTrabalho(H.protecaoDoResultado({ ...res, protecaoAcimaDoTrabalho: undefined }), 'Bruna', moeda), null);
  assert.equal(H.fraseDoLimite(mes, moeda), 'O limite do cheque especial acabou: R$ 1200 de contas ficaram atrasadas (multa de R$ 120) e R$ 400 de comida não deu para comprar.');
  assert.equal(H.fraseDoLimite({ ...mes, atrasou: 0, faltouNaMesa: 0, contasPagas: 300 }, moeda), 'Pagou R$ 300 de contas atrasadas.');
  assert.equal(H.fraseDoLimite({ saldoMes: 1 }, moeda), null, 'sala sem o limite');
  assert.equal(conteudo.personas.motoboy.basico.itens.find((i) => i.comida).rotulo, 'comida');
  assert.equal(V.alunoLogica.telaDoAluno({
    conteudo, estado: { geracao: 1, indice: 3, tipo: 'personas', equipesTravadas: true, equipesAbertas: TODAS }, membro: { entrouEm: 1, equipe: 'e1' },
    meusVotos: {}, decisoesDaEquipe: null, resultados: null, placar: null, uid: 'eu', agora: 0,
  }).dados.persona.basico.itens[1].comida, true, 'o celular sabe qual item é a comida');
});

test('anfitrião: grava o mês com a D-066 e a marca da D-067 no resultado; o placar leva as contas atrasadas', async () => {
  // Arrange: o mínimo com o limite, sem trabalho e com o INSS na carta (a
  // proteção sempre passa do trabalho comum, que é 0).
  const b = minimoComLimite({ rodadas: 2 });
  b.cartas[0].efeitos = [{ soma: { renda: 300 }, categoria: 'protecao', rotulo: 'auxílio do INSS' }];
  const config = normalizar(V, b);
  const sessao = montarSessao(V, { config, sementes: [11, 22] });
  const { anf, host, indiceDe } = sessao;
  const s = (...partes) => ['salas', SALA, ...partes].join('/');
  await anf.criarSala();

  // Act
  for (const r of ['r1', 'r2']) {
    await anf.pularPara(indiceDe('rodada', { rodada: r }));
    await anf.decidirPorEquipe('e1', 'a');
    await anf.encerrar();
  }
  const resultados = await host.ler(s('resultados'));
  const placar = await host.ler(s('placar'));

  // Assert: mês 1 −700 (1.000 − 300 do INSS), no limite; mês 2: juros 70,
  //   caixa −700 − 700 − 70 = −1.470, excedente 470: atrasa 470 (contas 700
  //   antes da comida), multa 47.
  assert.deepEqual(resultados.r1.e1.protecaoAcimaDoTrabalho, { pagou: 300, trabalhoComum: 0 });
  assert.equal(resultados.r2.e1.mes.atrasou, 470);
  assert.equal(resultados.r2.e1.mes.multa, 47);
  assert.equal(resultados.r2.e1.depois.renda, -1000);
  assert.equal(placar.e1.contas_atrasadas, 517);
  assert.equal(placar.e1.renda, -1000);
  assert.equal(H.patrimonioDe(placar.e1), -1517);
  const d = M.decompor(config, { equipeId: 'e1', rodadas: ['r1', 'r2'].map((r) => ({ rodadaId: r, opcaoId: 'a', cartaId: 'normal' })) });
  assert.equal(d.realizado, -1517, 'o placar decomposto é no mesmo patrimônio');
});
