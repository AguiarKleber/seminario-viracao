// D-079 (teste do Kleber de 06/10): o bloco de dados depois de cada bimestre,
// com o contexto do tópico, até 3 números (itens) e a fonte, e a mini-história
// de cada opção na decisão do telão. O validador conhece os três campos novos
// do passo "bloco"; o config.json do dia os usa em todos os blocos de dados e
// no Fim, e não tem mais a etapa "Entrevistas". D-080 (06/10 à tarde): o teto
// de itens passa a 4, para os quatro caminhos; "Caminhos" e a "Conversa em
// grupos" ganham itens, e um bloco de dados das outras plataformas entra
// antes do Fim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { lerConfigTeste } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const { validar, validarTexto, hash } = V.validarConfig;

const listar = (lista) => lista.map((p) => `  ${p.caminho}: ${p.mensagem}`).join('\n') || '  (nada)';
const achou = (lista, caminho, re) => lista.some((p) => p.caminho === caminho && re.test(p.mensagem));

// O config de teste com um bloco no roteiro de 60 min (o primeiro passo "bloco"
// que houver; senão, um acrescentado no começo).
function comBloco(campos) {
  const b = lerConfigTeste();
  const passos = b.roteiros['60min'];
  let i = passos.findIndex((p) => p.tipo === 'bloco');
  if (i < 0) {
    passos.splice(1, 0, { tipo: 'bloco', titulo: 'Dados: teste' });
    i = 1;
  }
  Object.assign(passos[i], campos);
  return { bruto: b, i };
}

test('bloco: contexto, itens e fonte entram no normalizado, sem aviso', () => {
  // Arrange
  const campos = { contexto: 'O que é o breque, em uma frase.', itens: ['Primeiro número.', 'Segundo número.'], fonte: 'IBGE (2025)' };
  const { bruto, i } = comBloco(campos);

  // Act
  const r = validar(bruto);

  // Assert
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
  const passo = r.config.roteiros['60min'][i];
  assert.equal(passo.contexto, campos.contexto);
  assert.deepEqual(passo.itens, campos.itens);
  assert.equal(passo.fonte, campos.fonte);
});

test('bloco sem os campos novos: o normalizado e o hash ficam como antes', () => {
  // Arrange
  const { bruto, i } = comBloco({});

  // Act
  const r = validar(bruto);
  const vazio = validar(comBloco({ contexto: undefined }).bruto);

  // Assert
  assert.equal(r.ok, true, listar(r.erros));
  for (const k of ['contexto', 'itens', 'fonte']) assert.ok(!Object.hasOwn(r.config.roteiros['60min'][i], k), `sem "${k}"`);
  assert.equal(hash(r.config), hash(vazio.config));
});

test('bloco: itens que não são lista de textos é erro; vazio é erro; mais de 4 é aviso (D-080)', () => {
  // Arrange
  const casos = [
    [{ itens: 'um texto só' }, '.itens', /lista de 1 a 4 textos/, 'erros'],
    [{ itens: [] }, '.itens', /lista de 1 a 4 textos/, 'erros'],
    [{ itens: ['ok', 42] }, '.itens[1]', /precisa ser texto/, 'erros'],
    [{ itens: ['ok', '  '] }, '.itens[1]', /texto vazio/, 'erros'],
    [{ itens: ['1', '2', '3', '4', '5'] }, '.itens', /5 itens \(mais de 4\)/, 'avisos'],
  ];

  for (const [campos, sufixo, re, onde] of casos) {
    // Act
    const { bruto, i } = comBloco(campos);
    const r = validar(bruto);

    // Assert
    const caminho = `roteiros.60min[${i}]${sufixo}`;
    assert.ok(achou(r[onde], caminho, re), `${JSON.stringify(campos)}: esperado em ${onde} ${caminho} ${re}\n${listar(r[onde])}`);
    if (onde === 'avisos') assert.equal(r.ok, true, 'aviso não bloqueia a sala');
  }
});

test('bloco: texto longo demais é aviso (pode não caber no telão), e não erro', () => {
  // Arrange
  const { bruto, i } = comBloco({ contexto: 'x'.repeat(221), itens: ['y'.repeat(141)], fonte: 'z'.repeat(201) });

  // Act
  const r = validar(bruto);

  // Assert
  assert.equal(r.ok, true, listar(r.erros));
  assert.ok(achou(r.avisos, `roteiros.60min[${i}].contexto`, /221 caracteres \(mais de 220\)/), listar(r.avisos));
  assert.ok(achou(r.avisos, `roteiros.60min[${i}].itens[0]`, /141 caracteres \(mais de 140\)/), listar(r.avisos));
  assert.ok(achou(r.avisos, `roteiros.60min[${i}].fonte`, /201 caracteres \(mais de 200\)/), listar(r.avisos));
});

test('os campos do bloco num passo de outro tipo: aviso, e são descartados', () => {
  // Arrange
  const b = lerConfigTeste();
  const i = b.roteiros['60min'].findIndex((p) => p.tipo === 'rodada');
  b.roteiros['60min'][i].contexto = 'não vale aqui';

  // Act
  const r = validar(b);

  // Assert
  assert.equal(r.ok, true, listar(r.erros));
  assert.ok(achou(r.avisos, `roteiros.60min[${i}].contexto`, /só o passo "bloco"/), listar(r.avisos));
  assert.ok(!Object.hasOwn(r.config.roteiros['60min'][i], 'contexto'));
});

// ---------- O config.json do dia ----------

const TEXTO = readFileSync(join(RAIZ, 'config.json'), 'utf8');
const dia = validarTexto(TEXTO);

test('config.json do dia: válido, sem nenhum aviso sobre o roteiro ou sobre o tamanho dos textos', () => {
  assert.equal(dia.ok, true, listar(dia.erros));
  const doRoteiro = dia.avisos.filter((a) => a.caminho.startsWith('roteiros') || /caracteres/.test(a.mensagem));
  assert.deepEqual(doRoteiro, [], listar(doRoteiro));
});

test('config.json do dia: depois de cada bimestre, um bloco de dados com contexto, 1 a 3 itens e fonte; o das outras plataformas e o Fim, idem; sem "Entrevistas"', () => {
  for (const [nome, passos] of Object.entries(dia.config.roteiros)) {
    assert.ok(!passos.some((p) => /entrevista/i.test(p.titulo || '')), `${nome}: sem a etapa "Entrevistas"`);
    passos.forEach((p, k) => {
      if (p.tipo !== 'rodada') return;
      const seguinte = passos[k + 1];
      assert.equal(seguinte?.tipo, 'bloco', `${nome}: depois de ${p.rodada}, um bloco`);
      assert.match(seguinte.titulo, /^Dados: /, `${nome}: depois de ${p.rodada}, o bloco de dados`);
    });
    const comDados = passos.filter((p) => p.tipo === 'bloco' && /^(Dados|Fim):/.test(p.titulo || ''));
    assert.equal(comDados.length, 8, `${nome}: 6 blocos de dados, o das outras plataformas (D-080) e o Fim`);
    for (const p of comDados) {
      assert.ok(p.contexto, `${nome}/${p.titulo}: o contexto`);
      assert.ok(p.itens?.length >= 1 && p.itens.length <= 3, `${nome}/${p.titulo}: de 1 a 3 itens`);
      assert.ok(p.fonte, `${nome}/${p.titulo}: a fonte`);
    }
  }
});

// D-080 (prints 3 e 4 do Kleber, 06/10 à tarde): "Caminhos" e a "Conversa em
// grupos" eram só o título e uma frase; agora mostram os itens, como os blocos
// de dados. Caminhos: um item por caminho, com um dado e a fonte; a conversa:
// os passos da atividade.
test('bloco: 4 itens é o teto, sem aviso (D-080)', () => {
  const { bruto } = comBloco({ itens: ['1', '2', '3', '4'] });
  const r = validar(bruto);
  assert.deepEqual(r.erros, [], listar(r.erros));
  assert.deepEqual(r.avisos, [], listar(r.avisos));
});

test('config.json do dia: "Caminhos" com um item por caminho e a fonte, e a "Conversa em grupos" com os passos (120 min)', () => {
  const passos = dia.config.roteiros['120min'];
  const caminhos = passos.find((p) => /^Caminhos:/.test(p.titulo || ''));
  assert.deepEqual(caminhos.itens.map((i) => i.split(':')[0]), ['Regulação', 'Proteção', 'Organização', 'Educação']);
  assert.ok(caminhos.contexto && caminhos.fonte, 'Caminhos: o contexto e a fonte');
  const conversa = passos.find((p) => /^Conversa em grupos/.test(p.titulo || ''));
  assert.equal(conversa.itens.length, 3, 'a conversa: três passos');
  assert.ok(conversa.contexto, 'a conversa: o contexto');
});

// D-080 (print 1 do Kleber, 06/10 à tarde): o Fim enriquecido com outras
// modalidades de trabalho por app. Um bloco de dados próprio, logo antes do Fim,
// nos dois roteiros, com os dados do IBGE sobre os motoristas de app; e os dois
// roteiros continuam fechando 60 e 120 minutos.
test('config.json do dia: "Dados: e nos outros aplicativos?" logo antes do Fim, nos dois roteiros, e os tempos fecham 60 e 120 min', () => {
  for (const [nome, passos] of Object.entries(dia.config.roteiros)) {
    const iFim = passos.findIndex((p) => /^Fim:/.test(p.titulo || ''));
    const antes = passos[iFim - 1];
    assert.equal(antes.titulo, 'Dados: e nos outros aplicativos?', `${nome}: o bloco antes do Fim`);
    assert.equal(antes.itens.length, 3, `${nome}: três números`);
    assert.match(antes.fonte, /^IBGE, PNAD Contínua/, `${nome}: a fonte`);
    const soma = passos.reduce((s, p) => s + (p.alvoSeg || 0), 0);
    assert.equal(soma, Number(nome.replace('min', '')) * 60, `${nome}: os tempos-alvo somam o roteiro inteiro`);
  }
});

test('config.json do dia: cada opção tem a mini-história, de até 120 letras (cabe em duas linhas na decisão do telão)', () => {
  for (const rodadaId of dia.config.ordem.rodadas) {
    const rodada = dia.config.rodadas[rodadaId];
    for (const op of rodada.ordemOpcoes) {
      const narrativa = rodada.opcoes[op].narrativa;
      assert.ok(typeof narrativa === 'string' && [...narrativa].length <= 120, `${rodadaId}/${op}: a mini-história, até 120 letras`);
    }
  }
});
