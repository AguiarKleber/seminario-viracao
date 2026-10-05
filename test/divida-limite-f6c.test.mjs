// Revisão da F6c, frente do código: o que a D-066 (o cheque especial tem
// limite) ainda contava errado depois da primeira versão.
//
// Por quê:
// - com o limite, o que a proteção paga não é o que ela evita: parte dela
//   compra a comida que seria cortada, e a multa sai do saldo. A frase "sem
//   ela, teria faltado R$ 2.431 a mais" valia o pago, e na Daiane a diferença
//   real no saldo era de R$ 826 (com R$ 1.659 de comida a menos na mesa);
// - gás, ônibus e remédio viravam "contas atrasadas" com multa, contra a
//   própria fonte do config ("quem não paga fica sem");
// - a mora incidia sobre a multa e a mora antigas, e a fonte diz "simples,
//   sobre o que já estava atrasado";
// - o telão escrevia "dívida R$ 3.000" (banco e empréstimo) e o celular da
//   mesma equipe, "Dívida hoje R$ 7.811" (com as contas atrasadas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { configMinimo, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;
const H = V.historia;

const IND_ATRASADAS = { id: 'contas_atrasadas', nome: 'Contas atrasadas', formato: 'moeda', inicial: 0, min: 0, max: 1000000 };
const IND_MESA = { id: 'faltou_na_mesa', nome: 'Faltou na mesa', formato: 'moeda', inicial: 0, min: 0, max: 1000000 };
const REGRAS_LIMITE = { limiteChequeEspecial: 1000, limiteFonte: 'teste', multaAtraso: 0.1, moraMes: 0.01, atrasoFonte: 'teste' };

// O mínimo com o limite de R$ 1.000 e juros de 10% ao mês (o do configMinimo).
// Básico de 1.000: aluguel 700 e comida 300, ou, com onibus, aluguel 600,
// ônibus 100 (não atrasa: semAtraso) e comida 300.
function minimo({ trabalho = 0, inss = 0, onibus = false } = {}) {
  const b = configMinimo();
  Object.assign(b.regras, REGRAS_LIMITE);
  b.indicadores.push({ ...IND_ATRASADAS }, { ...IND_MESA });
  b.personas[0].basico = {
    itens: onibus
      ? [{ rotulo: 'aluguel', valor: 600, fonte: 't' }, { rotulo: 'ônibus', valor: 100, fonte: 't', semAtraso: true }, { rotulo: 'comida', valor: 300, fonte: 't', comida: true }]
      : [{ rotulo: 'aluguel', valor: 700, fonte: 't' }, { rotulo: 'comida', valor: 300, fonte: 't', comida: true }],
  };
  if (trabalho) b.personas[0].todoMes = [{ soma: { renda: trabalho }, rotulo: 'trabalho' }];
  if (inss) b.cartas[0].efeitos = [{ soma: { renda: inss }, categoria: 'protecao', rotulo: 'auxílio do INSS' }];
  b.rodadas = [{ id: 'r1', titulo: 'Rodada 1', texto: 'Texto', padrao: 'b', opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } } }];
  b.roteiros['60min'] = [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'fim' }];
  return normalizar(V, b);
}

const aplicar = (config, estado) => M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal', estado });
function linhasFecham(a) {
  for (const ind of Object.keys(a.delta)) {
    const soma = a.linhas.filter((l) => l.indicador === ind).reduce((s, l) => s + l.valor, 0);
    assert.ok(Math.abs(soma - a.delta[ind]) < 1e-9, `as linhas de ${ind} somam ${soma}, e o delta é ${a.delta[ind]}`);
  }
}
const moeda = (x) => `R$ ${x}`;

// ------------------------------------------------- o que a proteção evitou

test('com o limite, protecaoEvitou é a diferença real no saldo, e a comida que ela comprou vai à parte', () => {
  // Arrange: de −1.000 no banco, sem trabalho; o mês custa 1.000 e os juros, 100.
  //   Sem o INSS: caixa −2.100, excedente 1.100: atrasam 700 + 100, a comida
  //   corta 300, multa 80. saldoMes = −1.000 − 100 + 300 − 80 = −880.
  //   Com o INSS de 1.000: caixa −1.100, excedente 100: atrasam 100, multa 10.
  //   saldoMes = 1.000 − 1.000 − 100 − 10 = −110.
  //   Evitou 770 no saldo (1.000 pagos − 300 de comida + 70 de multa) e 300
  //   de comida cortada.
  const estado = { renda: -1000, energia: 8, contas_atrasadas: 0, faltou_na_mesa: 0 };

  // Act
  const com = aplicar(minimo({ inss: 1000 }), estado);
  const sem = aplicar(minimo(), estado);

  // Assert
  assert.deepEqual([sem.mes.saldoMes, sem.mes.faltouNaMesa], [-880, 300], 'o caso sem a proteção (a conta do teste)');
  assert.deepEqual([com.mes.protecao, com.mes.saldoMes, com.mes.faltouNaMesa], [1000, -110, 0]);
  assert.equal(com.protecaoEvitou, com.mes.saldoMes - sem.mes.saldoMes, 'a diferença real no saldo');
  assert.equal(com.protecaoEvitou, 770);
  assert.equal(com.protecaoEvitouMesa, 300, 'a comida que ela evitou cortar');
  assert.equal(Object.hasOwn(sem, 'protecaoEvitouMesa'), false, 'sem proteção, sem o campo');
  linhasFecham(com);
});

test('a frase da proteção, com o limite: o saldo evitado e a comida que ela comprou', () => {
  // Arrange
  const itens = [{ rotulo: 'auxílio do INSS', valor: 1000 }];
  const res = { mes: { protecao: 1000, saldoMes: -110 }, protecaoEvitou: 770, protecaoEvitouMesa: 300, protecaoItens: itens };
  const soComida = { mes: { protecao: 300, saldoMes: -110 }, protecaoEvitouMesa: 300, protecaoItens: itens };

  // Act
  const p = H.protecaoDoResultado(res);
  const q = H.protecaoDoResultado(soComida);

  // Assert
  assert.equal(p.evitouMesa, 300);
  assert.equal(H.fraseDaProtecao(p, moeda), 'A proteção pagou R$ 1000: auxílio do INSS. Sem ela, teria faltado R$ 770 a mais, e R$ 300 de comida não teria dado para comprar.');
  assert.equal(q.evitou, 0, 'gravado sem protecaoEvitou e com a mesa: não evitou nada no saldo');
  assert.equal(H.fraseDaProtecao(q, moeda), 'A proteção pagou R$ 300: auxílio do INSS. Sem ela, R$ 300 de comida não teria dado para comprar.');
  assert.equal(Object.hasOwn(H.protecaoDoResultado({ mes: { protecao: 600, saldoMes: -1 } }), 'evitouMesa'), false, 'sala de antes: como era');
});

// O config.json real, sem os efeitos de proteção: o mesmo caminho sem o INSS.
function semProtecao(bruto) {
  const copia = structuredClone(bruto);
  const tirar = (o) => {
    if (Array.isArray(o)) {
      for (let i = o.length - 1; i >= 0; i -= 1) {
        if (o[i] && o[i].categoria === 'protecao') o.splice(i, 1);
        else tirar(o[i]);
      }
    } else if (o && typeof o === 'object') for (const v of Object.values(o)) tirar(v);
  };
  tirar(copia);
  return copia;
}

test('o caso da revisão: a Daiane em mar–abr depois de fratura com MEI, no config real', () => {
  // Arrange
  const bruto = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  const config = normalizar(V, bruto);
  const configSem = normalizar(V, semProtecao(bruto));
  const [r1, r2] = config.ordem.rodadas;
  const mei = config.rodadas[r1].ordemOpcoes.find((o) => config.rodadas[r1].opcoes[o].protege === true);
  const eq = config.ordem.equipes.find((e) => config.personas[config.equipes[e].persona].nome === 'Daiane');
  const a1 = M.aplicar(config, { equipeId: eq, rodadaId: r1, opcaoId: mei, cartaId: 'fratura', estado: M.estadoInicial(config, eq), historico: {} });
  const historico = { [r1]: { decisao: mei, carta: 'fratura' } };
  const pedido = { equipeId: eq, rodadaId: r2, opcaoId: config.rodadas[r2].padrao, cartaId: 'normal', estado: a1.depois, historico };

  // Act
  const com = M.aplicar(config, pedido);
  const sem = M.aplicar(configSem, pedido);

  // Assert
  assert.ok(com.mes.protecao > 0, 'o INSS pagou em mar–abr');
  assert.ok(sem.mes.faltouNaMesa > com.mes.faltouNaMesa, 'sem o INSS, faltaria comida (senão o teste não prova nada)');
  assert.equal(com.protecaoEvitou, com.mes.saldoMes - sem.mes.saldoMes);
  assert.ok(com.protecaoEvitou < com.mes.protecao, `evitou ${com.protecaoEvitou} no saldo, menos que os ${com.mes.protecao} pagos`);
  assert.equal(com.protecaoEvitouMesa, sem.mes.faltouNaMesa - com.mes.faltouNaMesa);
  const frase = H.fraseDaProtecao(H.protecaoDoResultado({ mes: com.mes, protecaoEvitou: com.protecaoEvitou, protecaoEvitouMesa: com.protecaoEvitouMesa, protecaoItens: com.protecaoItens }), moeda);
  assert.ok(frase.includes(`teria faltado R$ ${com.protecaoEvitou} a mais, e R$ ${com.protecaoEvitouMesa} de comida`), frase);
});

// ---------------------------------------------- o que não atrasa: fica sem

test('semAtraso: o item que não atrasa fica sem comprar, fora das contas atrasadas e da multa', () => {
  // Arrange: de −1.000, sem trabalho; excedente 1.100 (como no caso de cima).
  //   "contas": atrasa primeiro o que atrasa (o aluguel, 600), depois fica sem
  //   o ônibus (100), depois corta a comida (300); o resto (100) atrasa.
  //   atrasou 700, multa 70, ficouSem 100, faltou na mesa 300.
  //   saldoMes = −1.000 − 100 + 300 + 100 − 70 = −770.
  //   Um excedente pequeno (trabalho 600: caixa −1.500, excedente 500): só
  //   atrasa o aluguel, e o ônibus é comprado.
  const estado = { renda: -1000, energia: 8, contas_atrasadas: 0, faltou_na_mesa: 0 };

  // Act
  const a = aplicar(minimo({ onibus: true }), estado);
  const pequeno = aplicar(minimo({ onibus: true, trabalho: 600 }), estado);
  const comidaPrimeiro = (() => {
    const c = minimo({ onibus: true });
    c.regras.cortarPrimeiro = 'comida';
    return aplicar(c, estado);
  })();

  // Assert
  assert.deepEqual([a.mes.atrasou, a.mes.multa, a.mes.ficouSem, a.mes.faltouNaMesa], [700, 70, 100, 300]);
  assert.equal(a.mes.saldoMes, -770);
  assert.equal(a.depois.contas_atrasadas, 770);
  assert.equal(a.depois.renda, -1000);
  assert.equal(M.patrimonio(a.depois) - M.patrimonio(estado), a.mes.saldoMes, 'saldoMes continua sendo a variação do patrimônio');
  assert.deepEqual([pequeno.mes.atrasou, pequeno.mes.ficouSem], [500, 0]);
  assert.deepEqual([comidaPrimeiro.mes.faltouNaMesa, comidaPrimeiro.mes.atrasou, comidaPrimeiro.mes.ficouSem], [300, 700, 100], '"comida": corta a comida, atrasa o que atrasa e só então fica sem o ônibus');
  linhasFecham(a);
  assert.deepEqual(a.linhas.filter((l) => l.origem === 'ficouSem').map((l) => [l.indicador, l.valor]), [['renda', 100]]);
  assert.equal(Object.hasOwn(aplicar(minimo(), estado).mes, 'ficouSem'), false, 'sem item marcado, o mês fica como antes');
  assert.equal(H.fraseDoLimite(a.mes, moeda), 'O limite do cheque especial acabou: R$ 700 de contas ficaram atrasadas (multa de R$ 70), a casa ficou sem R$ 100 do que não se paga depois e R$ 300 de comida não deu para comprar.');
});

test('validador: semAtraso é true ou false, e um item não é comida e semAtraso ao mesmo tempo', () => {
  const caminhos = (mudar) => {
    const b = configMinimo();
    Object.assign(b.regras, REGRAS_LIMITE);
    b.indicadores.push({ ...IND_ATRASADAS }, { ...IND_MESA });
    b.personas[0].basico = { itens: [{ rotulo: 'aluguel', valor: 700, fonte: 't' }, { rotulo: 'comida', valor: 300, fonte: 't', comida: true }] };
    mudar(b.personas[0].basico.itens);
    return V.validarConfig.validar(b).erros.map((e) => e.caminho);
  };
  assert.deepEqual(caminhos((i) => { i[0].semAtraso = true; }), []);
  assert.ok(caminhos((i) => { i[0].semAtraso = 'sim'; }).some((c) => c.endsWith('itens[0].semAtraso')));
  assert.ok(caminhos((i) => { i[1].semAtraso = true; }).some((c) => c.endsWith('itens[1].semAtraso')), 'comida e semAtraso');
});

// ------------------------------------------------- a mora, só sobre o principal

test('a mora é simples sobre o principal atrasado, e não sobre a multa e a mora de antes', () => {
  // Arrange: o mês 2 do mínimo atrasa 800 e cobra multa 80: 880 atrasados, 800
  //   de principal. No mês 3, a mora é round(800 × 1%) = 8 (e não 9, de 880).
  const config = minimo();
  const m1 = aplicar(config, M.estadoInicial(config, 'e1'));

  // Act
  const m2 = aplicar(config, m1.depois);
  const m3 = aplicar(config, m2.depois);

  // Assert
  assert.equal(m2.depois.contas_atrasadas, 880);
  assert.equal(m2.depois.contas_atrasadas_principal, 800, 'o principal fica guardado à parte');
  assert.equal(m3.mes.mora, 8);
  assert.equal(m3.depois.contas_atrasadas_principal, 1600);
  assert.equal(m3.depois.contas_atrasadas, 880 + 8 + 800 + 80);
  linhasFecham(m3);
  assert.equal(aplicar(config, { renda: -1000, energia: 8, contas_atrasadas: 880, faltou_na_mesa: 0 }).mes.mora, 9, 'estado sem o principal (sala de antes): tudo conta como principal');
});

test('o pagamento abate primeiro a multa e a mora, depois o principal (Código Civil, art. 354)', () => {
  // Arrange: 500 atrasados, 450 de principal (50 de multa). Trabalho de 1.200
  //   a partir de −1.000: juros 100, caixa −900; mora round(450 × 1%) = 5
  //   (4,5 arredonda para cima); a folga até o limite é 100: paga os 55 de
  //   encargos e 45 do principal. Fica 405, todo principal.
  const config = minimo({ trabalho: 1200 });

  // Act
  const a = aplicar(config, { renda: -1000, energia: 8, contas_atrasadas: 500, contas_atrasadas_principal: 450, faltou_na_mesa: 0 });

  // Assert
  assert.deepEqual([a.mes.mora, a.mes.contasPagas, a.mes.contasAtrasadas], [5, 100, 405]);
  assert.equal(a.depois.contas_atrasadas_principal, 405);
});

test('sem o limite, o depois não ganha o principal (a sala sem a D-066 fica igual)', () => {
  const b = configMinimo();
  const config = normalizar(V, b);
  const a = M.aplicar(config, { equipeId: 'e1', rodadaId: config.ordem.rodadas[0], opcaoId: config.rodadas[config.ordem.rodadas[0]].padrao, cartaId: 'normal', estado: M.estadoInicial(config, 'e1') });
  assert.equal(Object.hasOwn(a.depois, 'contas_atrasadas_principal'), false);
});

// ---------------------------------------------------------- a dívida das telas

test('a dívida das telas é uma só: o banco e o empréstimo; as contas atrasadas vão à parte', () => {
  const d = H.dividaTotal({ renda: -1500, emprestimo: 1500, contas_atrasadas: 4811 });
  assert.deepEqual(d, { chequeEspecial: 1500, emprestimo: 1500, contasAtrasadas: 4811, total: 3000 });
  assert.equal(H.patrimonioDe({ renda: -1500, emprestimo: 1500, contas_atrasadas: 4811 }), -7811, 'o patrimônio continua descontando as contas atrasadas');
});
