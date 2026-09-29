// D-059: a proteção vale pelo pior caso que ela evita. O efeito de categoria
// "protecao" (o dinheiro que chega por causa dela, como o INSS pago ao MEI),
// fora do "entrou" e de qualquer multiplica; o que ela pagou e evitou em cada
// mês (resultado, história, celular); e o pior caso do placar com e sem as
// opções marcadas com protege. Contratos seções 1, 3, 7 e 8.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';
import { configMinimo, lerConfigTesteV2, lerConfigTesteV21, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;
const H = V.historia;
const { validar, hash } = V.validarConfig;
const s = (...partes) => ['salas', SALA, ...partes].join('/');
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));
// A moeda do teste: a da tela é a do Viracao.formatar, que o núcleo não carrega.
const moeda = (v) => `R$ ${v}`;

// Um mês com trabalho de 1.000, uma carta "acidente" que zera o trabalho e
// custa 400 de conserto, e o INSS de 600 que só chega para quem pagou o MEI
// (opção "a", que protege e custa 100 de DAS como custo fixo). Básico de 800.
function configComProtecao() {
  const b = configMinimo();
  b.personas[0].todoMes = [{ soma: { renda: 1000 }, rotulo: 'corridas' }];
  b.personas[0].basico = { itens: [{ rotulo: 'casa', valor: 800, fonte: 'teste' }] };
  b.rodadas[0].opcoes.a = {
    rotulo: 'Pagar o MEI', protege: true,
    efeitos: [{ soma: { renda: -100 }, fixo: true, rotulo: 'DAS do MEI' }],
  };
  b.cartas = [
    { id: 'normal', titulo: 'Normal', peso: 1, efeitos: [] },
    {
      id: 'acidente', titulo: 'Acidente', peso: 1, diasParado: 20,
      efeitos: [
        { multiplica: { renda: 0 } },
        { soma: { renda: -400 }, categoria: 'gasto', rotulo: 'conserto' },
        { se: { opcao: 'a' }, soma: { renda: 600 }, categoria: 'protecao', rotulo: 'auxílio do INSS' },
      ],
    },
  ];
  return b;
}

// ---------- Motor ----------

test('motor: a proteção entra fora do "entrou", do multiplica e do piso, e o saldo a soma', () => {
  // Arrange: trabalho 1.000 × 0 = 0 (a carta zera; o INSS não é zerado);
  //   entrou = 0 − 100 = −100; proteção 600; gastos 400; básico 800;
  //   saldo = −100 + 600 − 400 − 800 = −700.
  const b = configComProtecao();
  b.regras.pisoTrabalho = true;
  const config = normalizar(V, b);

  // Act
  const r = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'a', cartaId: 'acidente', estado: { renda: 0, energia: 8 } });

  // Assert
  assert.deepEqual(r.mes, { trabalho: 0, custosFixos: 100, gastos: 400, protecao: 600, outraRenda: 0, entrou: -100, basico: 800, juros: 0, saldoMes: -700, dividaAntes: 0 });
  assert.equal(r.delta.renda, r.mes.saldoMes, 'o saldo do mês continua sendo o delta da renda');
  assert.deepEqual(r.linhas.filter((l) => l.origem === 'protecao').map((l) => [l.rotulo, l.valor]), [['auxílio do INSS', 600]]);
  assert.equal(r.protecaoEvitou, 600, 'sem a proteção, o saldo do mês seria 600 menor');
  assert.deepEqual(r.protecaoItens, [{ rotulo: 'auxílio do INSS', valor: 600 }]);
  assert.equal(r.cartaCusto.rendaPerdida, 1000, 'a renda perdida é a do trabalho, sem contar a proteção');
});

test('motor: sem proteção no mês, protecao 0, protecaoEvitou 0 e lista vazia', () => {
  // Arrange
  const config = normalizar(V, configComProtecao());

  // Act
  const r = M.aplicar(config, { equipeId: 'e1', rodadaId: 'r1', opcaoId: 'b', cartaId: 'acidente', estado: { renda: 0, energia: 8 } });

  // Assert
  assert.equal(r.mes.protecao, 0);
  assert.equal(r.protecaoEvitou, 0);
  assert.deepEqual(r.protecaoItens, []);
  assert.equal(r.mes.saldoMes, 0 - 400 - 800);
});

test('motor: a proteção de um efeito geral de antes não entra no deAntes (a tela a diz à parte)', () => {
  // Arrange: dois meses; o INSS chega no mês 2 para quem pagou o MEI no mês 1
  // e tirou o acidente.
  const b = configComProtecao();
  b.cartas[1].efeitos = b.cartas[1].efeitos.slice(0, 2);
  b.rodadas.push({
    id: 'r2', titulo: 'Mês 2', texto: 'Texto', padrao: 'b',
    efeitosGerais: [
      { se: { decidiu: { r1: 'a' }, sorteou: { r1: 'acidente' } }, soma: { renda: 600 }, categoria: 'protecao', rotulo: 'auxílio do INSS' },
      { se: { sorteou: { r1: 'acidente' } }, soma: { renda: -300 }, rotulo: 'fratura: mais dias parado' },
    ],
    opcoes: { a: { rotulo: 'A', efeitos: [] }, b: { rotulo: 'B', efeitos: [] } },
  });
  b.roteiros['60min'] = [{ tipo: 'lobby' }, { tipo: 'rodada', rodada: 'r1' }, { tipo: 'rodada', rodada: 'r2' }, { tipo: 'fim' }];
  const config = normalizar(V, b);

  // Act
  const r = M.resolverRodada(config, {
    equipeId: 'e1', rodadaId: 'r2', opcaoId: 'b', estado: { renda: -500, energia: 8 }, semente: 7,
    historico: { r1: { decisao: 'a', carta: 'acidente' } },
  });

  // Assert
  assert.deepEqual(r.deAntes, [{ rotulo: 'fratura: mais dias parado', valor: -300 }]);
  assert.equal(r.mes.protecao, 600);
  assert.equal(r.protecaoEvitou, 600);
  assert.deepEqual(r.protecaoItens, [{ rotulo: 'auxílio do INSS', valor: 600 }]);
});

test('decompor: piorCasoSemProtecao troca a opção que protege pelo padrão do mês (caso feito à mão)', () => {
  // Arrange: com o MEI ("a"), o pior caso é o acidente: 0 − 100 + 600 − 400
  // − 800 = −700. Sem ele (o padrão "b"): 0 − 400 − 800 = −1.200.
  const config = normalizar(V, configComProtecao());

  // Act
  const comMei = M.decompor(config, { equipeId: 'e1', rodadas: [{ rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal' }] });
  const semMei = M.decompor(config, { equipeId: 'e1', rodadas: [{ rodadaId: 'r1', opcaoId: 'b', cartaId: 'normal' }] });

  // Assert
  assert.equal(comMei.piorCaso, -700);
  assert.equal(comMei.piorCasoSemProtecao, -1200);
  assert.equal(semMei.piorCasoSemProtecao, semMei.piorCaso, 'quem não escolheu proteção: o mesmo pior caso');
  assert.equal(semMei.piorCaso, -1200);
});

test('decompor: com o padrão protegendo, não há troca (e o validador avisa)', () => {
  // Arrange
  const b = configComProtecao();
  b.rodadas[0].padrao = 'a';
  const r = validar(b);
  const config = normalizar(V, b);

  // Act
  const d = M.decompor(config, { equipeId: 'e1', rodadas: [{ rodadaId: 'r1', opcaoId: 'a', cartaId: 'normal' }] });

  // Assert
  assert.equal(d.piorCasoSemProtecao, d.piorCaso);
  assert.ok(achou(r.avisos, 'rodadas.r1.padrao', /protege/), JSON.stringify(r.avisos));
});

test('decompor: a fixture v2.1 — o Rafa que pagou o MEI tem o pior caso melhor que sem ele', () => {
  // Arrange: no mês 1, o MEI (b, protege); o INSS (MEI) do mês 2 vem com o
  // acidente do mês 1, e o auxílio do mês 3 com o acidente do mês 2.
  const config = normalizar(V, lerConfigTesteV21());
  const rodadas = [
    { rodadaId: 'r1', opcaoId: 'b', cartaId: 'normal' },
    { rodadaId: 'r2', opcaoId: 'c', cartaId: 'normal' },
    { rodadaId: 'r3', opcaoId: 'b', cartaId: 'normal' },
  ];

  // Act
  const d = M.decompor(config, { equipeId: 'e1', rodadas });
  const piloto = M.decompor(config, { equipeId: 'e1', rodadas: rodadas.map((r) => ({ ...r, opcaoId: config.rodadas[r.rodadaId].padrao })) });

  // Assert
  assert.ok(d.piorCaso > d.piorCasoSemProtecao, `com o MEI ${d.piorCaso}, sem ${d.piorCasoSemProtecao}`);
  assert.equal(d.piorCasoSemProtecao, piloto.piorCaso, 'sem o MEI, o plano é o do padrão no mês 1');
});

// ---------- Validador ----------

test('validador: categoria "protecao" é aceita, só com soma positiva na renda', () => {
  // Arrange
  const ok = configComProtecao();
  const negativa = configComProtecao();
  negativa.cartas[1].efeitos[2].soma.renda = -600;
  const fator = configComProtecao();
  fator.cartas[1].efeitos[2] = { multiplica: { renda: 2 }, categoria: 'protecao' };
  const energia = configComProtecao();
  energia.cartas[1].efeitos[2] = { soma: { energia: 1 }, categoria: 'protecao' };
  const comFixo = configComProtecao();
  comFixo.cartas[1].efeitos[2].fixo = true;
  const outra = configComProtecao();
  outra.cartas[1].efeitos[2].categoria = 'seguro';

  // Act
  const r = [ok, negativa, fator, energia, comFixo, outra].map(validar);

  // Assert
  assert.deepEqual(r[0].erros, []);
  assert.equal(r[0].config.cartas.acidente.efeitos[2].categoria, 'protecao');
  assert.ok(achou(r[1].erros, 'cartas.acidente.efeitos[2].soma.renda', /valor negativo/), JSON.stringify(r[1].erros));
  assert.ok(achou(r[2].erros, 'cartas.acidente.efeitos[2]', /multiplica/));
  assert.ok(achou(r[3].erros, 'cartas.acidente.efeitos[2].soma.energia', /só pode somar na renda/));
  assert.ok(achou(r[4].erros, 'cartas.acidente.efeitos[2]', /"fixo" e "categoria"/));
  assert.ok(achou(r[5].erros, 'cartas.acidente.efeitos[2].categoria', /gasto \| protecao/));
});

test('validador: opcao.protege é boolean; false some na normalização e não muda o hash', () => {
  // Arrange
  const sem = configComProtecao();
  delete sem.rodadas[0].opcoes.a.protege;
  const falso = configComProtecao();
  falso.rodadas[0].opcoes.a.protege = false;
  const texto = configComProtecao();
  texto.rodadas[0].opcoes.a.protege = 'sim';

  // Act
  const [rSem, rFalso, rTexto, rVerdade] = [sem, falso, texto, configComProtecao()].map(validar);

  // Assert
  assert.equal(rVerdade.config.rodadas.r1.opcoes.a.protege, true);
  assert.equal(Object.hasOwn(rFalso.config.rodadas.r1.opcoes.a, 'protege'), false);
  assert.equal(hash(rFalso.config), hash(rSem.config));
  assert.ok(achou(rTexto.erros, 'rodadas.r1.opcoes.a.protege', /true ou false/));
  assert.deepEqual(rVerdade.avisos, [], 'protege é chave conhecida da opção');
});

// ---------- História, celular e frase ----------

test('protecaoDoResultado e fraseDaProtecao: o que pagou e o "sem ela" de cada caso', () => {
  // Arrange
  const itens = [{ rotulo: 'auxílio do INSS', valor: 600 }];
  const faltouMesmoAssim = { mes: { protecao: 600, saldoMes: -700 }, protecaoEvitou: 600, protecaoItens: itens };
  const fechouPorCausaDela = { mes: { protecao: 600, saldoMes: 200 }, protecaoEvitou: 600, protecaoItens: itens };
  const sobrouDeTodoJeito = { mes: { protecao: 600, saldoMes: 900 }, protecaoEvitou: 600 };

  // Act
  const p = H.protecaoDoResultado(faltouMesmoAssim);

  // Assert
  assert.deepEqual(p, { pagou: 600, evitou: 600, itens, saldoMes: -700 });
  assert.equal(H.fraseDaProtecao(p, moeda), 'A proteção pagou R$ 600: auxílio do INSS. Sem ela, teria faltado R$ 600 a mais.');
  assert.equal(H.fraseDaProtecao(H.protecaoDoResultado(fechouPorCausaDela), moeda), 'A proteção pagou R$ 600: auxílio do INSS. Sem ela, teria faltado R$ 400.');
  assert.equal(H.fraseDaProtecao(H.protecaoDoResultado(sobrouDeTodoJeito), moeda), 'A proteção pagou R$ 600. Sem ela, teria sobrado R$ 600 a menos.');
  assert.equal(H.protecaoDoResultado({ mes: { protecao: 0, saldoMes: -1 } }), null, 'sem proteção no mês, null');
  assert.equal(H.protecaoDoResultado({ mes: { saldoMes: -1 } }), null, 'sala anterior à D-059, null');
  assert.deepEqual(H.protecaoDoResultado({ mes: { protecao: 600, saldoMes: -1 } }).evitou, 600, 'sem protecaoEvitou gravado, vale o pago');
  assert.equal(H.fraseDaProtecao(null, moeda), null);
});

test('piorCasoDoPlacar: inteiros, a diferença pronta, e o "sem" só quando ele é pior que o "com"', () => {
  // Act / Assert
  assert.deepEqual(H.piorCasoDoPlacar({ piorCaso: -700.4, piorCasoSemProtecao: -1200.6 }, true),
    { comEscolhas: -700, semProtecao: -1201, evitou: 501, situacao: 'evitou' });
  assert.deepEqual(H.piorCasoDoPlacar({ piorCaso: -700.4, piorCasoSemProtecao: -1200.6 }, false),
    { comEscolhas: -700, semProtecao: null, evitou: 0, situacao: 'semEscolha' }, 'sem ter escolhido proteção, não há "sem"');
  assert.deepEqual(H.piorCasoDoPlacar({ piorCaso: -6210, piorCasoSemProtecao: -6032 }, true),
    { comEscolhas: -6210, semProtecao: null, evitou: 0, situacao: 'naoMelhorou' }, 'o "sem" melhor que o "com" não vai para a tela');
  assert.equal(H.piorCasoDoPlacar({ piorCaso: -700, piorCasoSemProtecao: -700 }, true).situacao, 'naoMelhorou', 'empate também não');
  assert.deepEqual(H.piorCasoDoPlacar({ piorCaso: -700 }, true), { comEscolhas: -700, semProtecao: null, evitou: 0, situacao: 'semDado' }, 'sala antiga');
  assert.equal(H.piorCasoDoPlacar({}, true), null);
  assert.equal(H.piorCasoDoPlacar(null), null);
});

test('temProtecao e escolheuProtecao: lidos do conteúdo e dos resultados gravados', () => {
  // Arrange
  const conteudo = normalizar(V, lerConfigTesteV21());
  const resultados = { r1: { e1: { decisao: 'b' }, e2: { decisao: 'c' } }, r2: { e2: { decisao: 'a' } } };

  // Act / Assert
  assert.equal(H.temProtecao(conteudo), true);
  assert.equal(H.temProtecao(normalizar(V, configMinimo())), false);
  assert.equal(H.escolheuProtecao(conteudo, resultados, 'e1'), true, 'e1 pagou o MEI no mês 1');
  assert.equal(H.escolheuProtecao(conteudo, resultados, 'e2'), false);
  assert.equal(H.escolheuProtecao(conteudo, null, 'e1'), false);
});

// Revisão da F5, achado 1: com o config.json real, a sessão que acaba depois
// do mês 2 (o mês 3 pulado) com o MEI no mês 1 dava um pior caso "sem a
// proteção" MELHOR que o "com" (e1: −R$ 6.210 com, −R$ 6.032 sem): o INSS só
// chega no mês 3. O dado do motor está certo; a trava é da tela.
test('config.json: sessão sem o mês 3 e com o MEI, o "sem a proteção" nunca aparece melhor que o "com"', () => {
  // Arrange
  const r = V.validarConfig.validarTexto(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
  assert.ok(r.ok, JSON.stringify(r.erros.slice(0, 3)));
  const config = r.config;
  const [r1, r2] = config.ordem.rodadas;
  const mei = config.rodadas[r1].ordemOpcoes.find((o) => config.rodadas[r1].opcoes[o].protege === true);
  assert.ok(mei, 'o mês 1 tem uma opção que protege');
  const cartaQualquer = (rodadaId) => M.chances(config, { equipeId: 'e1', rodadaId, opcaoId: config.rodadas[rodadaId].padrao, estado: M.estadoInicial(config, 'e1'), historico: {} })[0].carta;

  // Act
  const jogadas = [{ rodadaId: r1, opcaoId: mei, cartaId: cartaQualquer(r1) }, { rodadaId: r2, opcaoId: config.rodadas[r2].ordemOpcoes[0], cartaId: 'normal' }];
  const d = M.decompor(config, { equipeId: 'e1', rodadas: jogadas });
  const p = H.piorCasoDoPlacar(d, true);

  // Assert
  assert.ok(d.piorCasoSemProtecao > d.piorCaso, `reproduz: com ${d.piorCaso}, sem ${d.piorCasoSemProtecao}`);
  assert.equal(p.situacao, 'naoMelhorou');
  assert.equal(p.semProtecao, null, 'a tela não recebe o "sem"');
  assert.equal(p.evitou, 0);
});

test('história, resultado e situação do celular trazem o que a proteção pagou', () => {
  // Arrange: o mês 2 do Rafa (e1), com o INSS do MEI gravado pelo anfitrião.
  const conteudo = normalizar(V, lerConfigTesteV21());
  const mes = { trabalho: 2400, custosFixos: 560, gastos: 0, protecao: 900, outraRenda: 0, entrou: 1840, basico: 2000, juros: 0, saldoMes: 740, dividaAntes: 0 };
  const itens = [{ rotulo: 'auxílio do INSS (MEI)', valor: 900 }];
  const resultados = { r2: { e1: { decisao: 'c', origem: 'maioria', carta: 'normal', delta: {}, depois: { renda: -260, energia: 5, protecao: 3 }, mes, protecaoEvitou: 900, protecaoItens: { 0: itens[0] } } } };
  const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
  const entrada = (estado) => ({
    conteudo, estado, membro: { entrouEm: 100, equipe: 'e1' }, meusVotos: {}, decisoesDaEquipe: null,
    resultados, placar: null, uid: 'eu', agora: 0, meta: { roteiro: '60min', entradaAberta: true },
  });
  const esperado = { pagou: 900, evitou: 900, itens, saldoMes: 740 };

  // Act
  const historia = H.historiaDaEquipe(conteudo, 'e1', resultados);
  const resultado = V.alunoLogica.telaDoAluno(entrada({
    geracao: 9, indice: 7, tipo: 'rodada', rodada: 'r2', subfase: 'resultado', abertoEm: 200, equipesTravadas: true, equipesAbertas: TODAS,
  }));
  const situacao = V.alunoLogica.telaDoAluno(entrada({ geracao: 9, indice: 8, tipo: 'bloco', equipesTravadas: true, equipesAbertas: TODAS }));

  // Assert
  assert.deepEqual(historia[0].protecaoDoMes, esperado, 'a lista que volta do RTDB como objeto é lida igual');
  assert.equal(resultado.tipo, 'resultado');
  assert.deepEqual(resultado.dados.protecaoDoMes, esperado);
  assert.equal(situacao.tipo, 'situacao');
  assert.deepEqual(situacao.dados.mes.protecaoDoMes, esperado);
  assert.equal(situacao.dados.mes.protecao, 900, 'o número do mês continua em mes.protecao');
});

test('celular: o placar final e o fim trazem o pior caso da equipe, com a mesma trava do telão', () => {
  // Arrange: a e1 pagou o MEI (r1 "b", protege); a e2 ficou no padrão.
  const conteudo = normalizar(V, lerConfigTesteV21());
  const resultados = { r1: { e1: { decisao: 'b', carta: 'normal', mes: { saldoMes: -1 } }, e2: { decisao: 'c', carta: 'normal', mes: { saldoMes: -1 } } } };
  const placar = { e1: { renda: -1, piorCaso: -700, piorCasoSemProtecao: -1200 }, e2: { renda: -1, piorCaso: -900, piorCasoSemProtecao: -900 } };
  const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
  const entrada = (equipe, tipo, p = placar) => ({
    conteudo, estado: { geracao: 9, indice: 20, tipo, equipesTravadas: true, equipesAbertas: TODAS }, membro: { entrouEm: 100, equipe }, meusVotos: {}, decisoesDaEquipe: null,
    resultados, placar: p, uid: 'eu', agora: 0, meta: { roteiro: '60min', entradaAberta: true },
  });

  // Act
  const finalE1 = V.alunoLogica.telaDoAluno(entrada('e1', 'placarFinal'));
  const fimE2 = V.alunoLogica.telaDoAluno(entrada('e2', 'fim'));
  const semMelhora = V.alunoLogica.telaDoAluno(entrada('e1', 'fim', { e1: { renda: -1, piorCaso: -6210, piorCasoSemProtecao: -6032 } }));
  const semProtecaoNoConfig = V.alunoLogica.telaDoAluno({ ...entrada('e1', 'fim'), conteudo: normalizar(V, lerConfigTesteV2()) });

  // Assert
  assert.equal(finalE1.tipo, 'situacao');
  assert.deepEqual(finalE1.dados.piorCaso, { comEscolhas: -700, semProtecao: -1200, evitou: 500, situacao: 'evitou' });
  assert.equal(fimE2.tipo, 'fim');
  assert.equal(fimE2.dados.piorCaso.situacao, 'semEscolha');
  assert.equal(semMelhora.dados.piorCaso.situacao, 'naoMelhorou');
  assert.equal(semMelhora.dados.piorCaso.semProtecao, null);
  assert.equal(semProtecaoNoConfig.dados.piorCaso, null, 'config sem proteção: sem o bloco');
});

// ---------- Anfitrião ----------

test('anfitrião: grava protecaoEvitou e protecaoItens só quando houve, e o placar com o pior caso sem proteção', async () => {
  // Arrange: no mês 1 só sai o acidente; a e1 paga o MEI (b), a e6 (mesma
  // persona) fica no padrão. No mês 2, o INSS (MEI) chega só para a e1.
  const b = lerConfigTesteV21();
  for (const c of b.cartas) if (c.id !== 'acidente') c.rodadas = (c.rodadas ?? ['r1', 'r2', 'r3']).filter((r) => r !== 'r1');
  const config = normalizar(V, b);
  const { anf, host, relogio, indiceDe } = montarSessao(V, { config, sementes: [11, 22, 33] });
  await anf.criarSala();
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(['e1', 'e6']);
  await anf.avancar();
  relogio.passar(1000);
  const plano = { r1: { e1: 'b', e6: 'c' }, r2: { e1: 'c', e6: 'c' } };

  // Act
  for (const r of ['r1', 'r2']) {
    await anf.pularPara(indiceDe('rodada', { rodada: r }));
    for (const [eq, op] of Object.entries(plano[r])) await anf.decidirPorEquipe(eq, op);
    await anf.encerrar();
  }

  // Assert
  const resultados = await host.ler(s('resultados'));
  const placar = await host.ler(s('placar'));
  assert.equal(resultados.r1.e1.carta, 'acidente');
  assert.equal(resultados.r2.e1.mes.protecao, 900);
  assert.equal(resultados.r2.e1.protecaoEvitou, 900);
  assert.deepEqual(resultados.r2.e1.protecaoItens, [{ rotulo: 'auxílio do INSS (MEI)', valor: 900 }]);
  for (const [r, eq] of [['r1', 'e1'], ['r1', 'e6'], ['r2', 'e6']]) {
    assert.equal(Object.hasOwn(resultados[r][eq], 'protecaoEvitou'), false, `${r}/${eq}: sem proteção, sem o campo`);
    assert.equal(Object.hasOwn(resultados[r][eq], 'protecaoItens'), false, `${r}/${eq}: sem proteção, sem a lista`);
  }
  for (const eq of ['e1', 'e6']) {
    const jogadas = ['r1', 'r2'].map((r) => ({ rodadaId: r, opcaoId: resultados[r][eq].decisao, cartaId: resultados[r][eq].carta }));
    const d = M.decompor(config, { equipeId: eq, rodadas: jogadas });
    assert.equal(placar[eq].piorCaso, d.piorCaso, `${eq}: piorCaso`);
    assert.equal(placar[eq].piorCasoSemProtecao, d.piorCasoSemProtecao, `${eq}: piorCasoSemProtecao`);
  }
  assert.ok(placar.e1.piorCaso > placar.e1.piorCasoSemProtecao, 'a e1 pagou o MEI: sem ele, o pior caso é pior');
  assert.equal(placar.e6.piorCasoSemProtecao, placar.e6.piorCaso, 'a e6 não escolheu proteção');
});
