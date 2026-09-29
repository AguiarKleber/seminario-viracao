// A lógica do celular: a tela certa para cada estado, o voto pendente, a
// sugestão de equipe e o crachá. O conteúdo é o config de teste normalizado; os
// estados são montados à mão, no formato que o anfitrião grava.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { configDaSessao } from './fixtures/sessao.mjs';

const V = await carregarNucleo();
const { telaDoAluno, sugerirEquipe, pendenteAindaVale, cracha, codigoCracha } = V.alunoLogica;
const conteudo = configDaSessao(V);
const TODAS = { e1: true, e2: true, e3: true, e4: true, e5: true, e6: true };
const meta = { roteiro: '60min', entradaAberta: true };
const membro = { entrouEm: 100, equipe: 'e1' };

// Uma entrada completa de telaDoAluno, com o que cada teste mudar por cima.
function entrada(estado, extra = {}) {
  return { conteudo, estado, membro, meusVotos: {}, decisoesDaEquipe: null, resultados: null, placar: null, uid: 'eu', agora: 0, meta, ...extra };
}

const rodada = (subfase, extra = {}) => ({
  geracao: 9, indice: 5, tipo: 'rodada', rodada: 'r1', subfase, abertoEm: 200, prazo: 90_200,
  equipesTravadas: true, equipesAbertas: TODAS, ...extra,
});
const enquete = (subfase, extra = {}) => ({
  geracao: 3, indice: 1, tipo: 'enquete', enquete: 'entrada', momento: 'antes', afirmacao: 'a1', subfase, abertoEm: 0, prazo: 60_000, ...extra,
});

test('sem registro de membro: "entrando" com a entrada aberta, "entradaFechada" com ela fechada', () => {
  // Arrange + Act
  const aberta = telaDoAluno(entrada({ tipo: 'lobby' }, { membro: null }));
  const fechada = telaDoAluno(entrada({ tipo: 'lobby' }, { membro: null, meta: { entradaAberta: false } }));
  // Assert
  assert.deepEqual(aberta, { tipo: 'aguardando', dados: { motivo: 'entrando' } });
  assert.deepEqual(fechada, { tipo: 'entradaFechada', dados: {} });
});

test('sem estado, no lobby e em tipo desconhecido: aguardando', () => {
  // Arrange + Act + Assert
  assert.equal(telaDoAluno(entrada(null)).dados.motivo, 'telao');
  assert.deepEqual(telaDoAluno(entrada({ tipo: 'lobby', subfase: 'ativo' })), { tipo: 'aguardando', dados: { motivo: 'lobby' } });
  assert.equal(telaDoAluno(entrada({ tipo: 'jogo' })).tipo, 'aguardando');
});

test('enquete "uma_por_vez": só a afirmação da vez, e "registrada" depois do voto', () => {
  // Arrange
  const estado = enquete('votando', { afirmacao: 'a2' });
  // Act
  const antes = telaDoAluno(entrada(estado));
  const depois = telaDoAluno(entrada(estado, { meusVotos: { entrada: { antes: { a2: 4 } } } }));
  // Assert
  assert.equal(antes.tipo, 'enquete');
  assert.deepEqual(antes.dados.afirmacao, { id: 'a2', texto: conteudo.enquetes.entrada.afirmacoes.a2.texto, voto: null });
  // "2 de 3", e não "1 de 1": a posição é a da afirmação na enquete (arquitetura seção 9).
  assert.deepEqual([antes.dados.posicao, antes.dados.total], [2, 3]);
  assert.deepEqual(antes.dados.afirmacoes.map((a) => a.id), ['a2']);
  assert.deepEqual(antes.dados.escala, conteudo.escala.curtos);
  assert.equal(antes.dados.prazo, 60_000);
  assert.equal(depois.tipo, 'enqueteRegistrada');
  assert.equal(depois.dados.encerrada, false);
});

test('enquete com todas abertas ("*"): mostra a primeira sem voto, com "2 de 2"; voto inválido não conta', () => {
  // Arrange
  const estado = enquete('votando', { enquete: 'termometro', momento: 'unico', afirmacao: '*' });
  // Act
  const r = telaDoAluno(entrada(estado, { meusVotos: { termometro: { unico: { t1: 5, t2: 9 } } } }));
  // Assert
  assert.equal(r.tipo, 'enquete');
  assert.deepEqual([r.dados.afirmacao.id, r.dados.posicao, r.dados.total], ['t2', 2, 2]);
  assert.deepEqual(r.dados.afirmacoes.map((a) => a.voto), [5, null]);
});

test('enquete pausada avisa; fechando ou apurada: "registrada" para quem votou, "encerrada" para quem não votou', () => {
  // Arrange + Act
  const pausada = telaDoAluno(entrada(enquete('votando', { prazo: undefined, restanteMs: 30_000 })));
  const semVoto = telaDoAluno(entrada(enquete('fechando')));
  const comVoto = telaDoAluno(entrada(enquete('apurada'), { meusVotos: { entrada: { antes: { a1: 2 } } } }));
  // Assert
  assert.deepEqual([pausada.dados.pausado, pausada.dados.restanteMs], [true, 30_000]);
  assert.deepEqual(semVoto, { tipo: 'aguardando', dados: { motivo: 'votacaoEncerrada' } });
  assert.deepEqual([comVoto.tipo, comVoto.dados.encerrada], ['enqueteRegistrada', true]);
});

test('bloco antes das equipes: "acompanhe a apresentação" com o título do trecho (D-006)', () => {
  // Arrange + Act
  const r = telaDoAluno(entrada({ tipo: 'bloco', subfase: 'ativo', indice: 2 }, { membro: { entrouEm: 1 } }));
  // Assert
  assert.deepEqual(r, { tipo: 'aguardando', dados: { motivo: 'apresentacao', titulo: 'Abertura' } });
});

test('bloco depois das equipes: situação da persona, com indicadores e a narrativa do último mês', () => {
  // Arrange
  const estado = { tipo: 'bloco', subfase: 'ativo', indice: 8, equipesTravadas: true, equipesAbertas: TODAS };
  const resultados = {
    r1: { e1: { decisao: 'a', origem: 'maioria', carta: 'normal', depois: { renda: 3450, energia: 3, protecao: 0 } } },
    r2: { e1: { decisao: 'b', origem: 'piloto', carta: 'chuva', depois: { renda: 2650, energia: 5, protecao: 0 } } },
  };
  // Act
  const inicio = telaDoAluno(entrada(estado));
  const r = telaDoAluno(entrada(estado, { resultados }));
  // Assert
  assert.equal(inicio.tipo, 'situacao');
  assert.deepEqual(inicio.dados.narrativa, []);
  assert.equal(inicio.dados.mes, null);
  assert.deepEqual(inicio.dados.indicadores.map((i) => i.valor), [0, 8, 0]);
  assert.equal(r.tipo, 'situacao');
  assert.equal(r.dados.titulo, 'Trecho 3');
  assert.deepEqual(r.dados.indicadores.map((i) => [i.id, i.valor]), [['renda', 2650], ['energia', 5], ['protecao', 0]]);
  assert.deepEqual(r.dados.narrativa, ['Escolhi: Recusar corridas ruins.', 'Aconteceu: Semana de chuva.']);
  assert.deepEqual(r.dados.mes.decisao, { id: 'b', rotulo: 'Recusar corridas ruins' });
  assert.equal(r.dados.persona.id, 'motoboy');
});

test('formar equipes: só as equipes abertas, e a atual marcada', () => {
  // Arrange
  const estado = { tipo: 'formarEquipes', subfase: 'ativo', equipesAbertas: { e1: true, e3: true } };
  // Act
  const r = telaDoAluno(entrada(estado, { membro: { entrouEm: 1, equipe: 'e3' } }));
  // Assert
  assert.equal(r.tipo, 'escolherEquipe');
  assert.deepEqual(r.dados.equipes.map((e) => e.id), ['e1', 'e3']);
  assert.equal(r.dados.minha, 'e3');
});

test('personas: a persona da equipe com os indicadores iniciais; sem equipe, espera o telão distribuir', () => {
  // Arrange
  const estado = { tipo: 'personas', subfase: 'ativo', equipesTravadas: true, equipesAbertas: TODAS };
  // Act
  const r = telaDoAluno(entrada(estado, { membro: { entrouEm: 1, equipe: 'e2' } }));
  const semEquipe = telaDoAluno(entrada(estado, { membro: { entrouEm: 1 } }));
  // Assert
  assert.equal(r.tipo, 'persona');
  assert.deepEqual(r.dados.persona, {
    id: 'ciclista', nome: 'Dani', descricao: 'Ciclista de teste',
    familia: { descricao: 'Mora sozinha.', pessoas: 1 },
    basico: { total: 0, itens: [{ rotulo: 'básico de teste', valor: 0, fonte: 'valor de teste' }] },
    outraRenda: null,
  });
  assert.equal(r.dados.indicadores.find((i) => i.id === 'energia').valor, 9, 'persona.inicial sobrescreve o indicador');
  assert.deepEqual(semEquipe, { tipo: 'aguardando', dados: { motivo: 'semEquipe' } });
});

test('decisão: opções com a contagem ao vivo da própria equipe, o meu voto e a situação junto', () => {
  // Arrange
  const decisoes = { eu: 'a', outro: 'a', terceiro: 'c' };
  // Act
  const r = telaDoAluno(entrada(rodada('decidindo'), { decisoesDaEquipe: decisoes }));
  // Assert
  assert.equal(r.tipo, 'decisao');
  assert.deepEqual(r.dados.opcoes.map((o) => [o.id, o.votos]), [['a', 2], ['b', 0], ['c', 1]]);
  assert.equal(r.dados.meuVoto, 'a');
  assert.deepEqual([r.dados.podeVotar, r.dados.motivo, r.dados.forcada], [true, null, null]);
  assert.equal(r.dados.situacao.persona.id, 'motoboy');
});

test('decisão: com os membros, a contagem ao vivo conta só quem ainda é da equipe e entrou a tempo, como a apuração', () => {
  // Arrange: "movido" foi para a e2, "removido" saiu por inatividade, "tardio" entrou depois da abertura
  const decisoes = { eu: 'a', outro: 'b', movido: 'a', removido: 'a', tardio: 'a' };
  const membros = {
    eu: { entrouEm: 100, equipe: 'e1' }, outro: { entrouEm: 100, equipe: 'e1' },
    movido: { entrouEm: 100, equipe: 'e2' }, tardio: { entrouEm: 201, equipe: 'e1' },
  };
  // Act
  const r = telaDoAluno(entrada(rodada('decidindo'), { decisoesDaEquipe: decisoes, membros }));
  // Assert
  assert.deepEqual(r.dados.opcoes.map((o) => [o.id, o.votos]), [['a', 1], ['b', 1], ['c', 0]]);
  assert.equal(r.dados.meuVoto, 'a');
});

test('decisão: quem entrou depois da abertura acompanha sem votar; decisão do apresentador aparece', () => {
  // Arrange + Act
  const tardio = telaDoAluno(entrada(rodada('decidindo'), { membro: { entrouEm: 201, equipe: 'e1' } }));
  const forcada = telaDoAluno(entrada(rodada('decidindo', { forcadas: { e1: 'b' } })));
  const pausada = telaDoAluno(entrada(rodada('decidindo', { prazo: undefined, restanteMs: 5000 })));
  // Assert
  assert.deepEqual([tardio.dados.podeVotar, tardio.dados.motivo], [false, 'entrouDepois']);
  assert.equal(forcada.dados.forcada, 'b');
  assert.deepEqual([pausada.dados.podeVotar, pausada.dados.motivo, pausada.dados.pausado], [false, 'pausado', true]);
});

test('prorrogação: a equipe empatada vê só as opções empatadas; as outras aguardam', () => {
  // Arrange
  const estado = rodada('prorrogacao', { empatadas: { e1: { a: true, c: true } } });
  // Act
  const empatada = telaDoAluno(entrada(estado, { decisoesDaEquipe: { eu: 'a', x: 'c' } }));
  const outra = telaDoAluno(entrada(estado, { membro: { entrouEm: 1, equipe: 'e2' } }));
  // Assert
  assert.equal(empatada.tipo, 'prorrogacao');
  assert.deepEqual(empatada.dados.opcoes.map((o) => [o.id, o.votos]), [['a', 1], ['c', 1]]);
  assert.deepEqual(outra, { tipo: 'aguardando', dados: { motivo: 'desempateDeOutrasEquipes' } });
});

test('fechando, sorteio e resultado: encerrada, "sorteando" sem revelar, e a carta explicada', () => {
  // Arrange
  const resultados = { r1: { e1: { decisao: 'a', origem: 'moeda', carta: 'bonus', delta: { renda: 4050 }, depois: { renda: 4050, energia: 3, protecao: 0 } } } };
  // Act
  const fechando = telaDoAluno(entrada(rodada('fechando'), { resultados }));
  const sorteio = telaDoAluno(entrada(rodada('sorteio'), { resultados }));
  const resultado = telaDoAluno(entrada(rodada('resultado'), { resultados }));
  const semResultado = telaDoAluno(entrada(rodada('resultado')));
  // Assert
  assert.deepEqual(fechando, { tipo: 'aguardando', dados: { motivo: 'votacaoEncerrada' } });
  assert.equal(sorteio.tipo, 'sorteando');
  assert.equal(JSON.stringify(sorteio).includes('bonus'), false, 'o sorteio não revela a carta');
  assert.equal(resultado.tipo, 'resultado');
  assert.deepEqual(resultado.dados.carta, { id: 'bonus', titulo: 'Bônus de fim de semana', narrativa: 'Aconteceu: Bônus de fim de semana.', tom: null });
  assert.deepEqual([resultado.dados.decisao.id, resultado.dados.origem], ['a', 'moeda']);
  assert.equal(resultado.dados.indicadores[0].valor, 4050);
  assert.equal(semResultado.tipo, 'sorteando');
});

test('rodada com a equipe fechada pelo apresentador: aguarda redistribuição', () => {
  // Arrange + Act
  const r = telaDoAluno(entrada(rodada('decidindo', { equipesAbertas: { e2: true } })));
  // Assert
  assert.deepEqual(r, { tipo: 'aguardando', dados: { motivo: 'semEquipe' } });
});

test('placar final, comparativo e fim', () => {
  // Arrange
  const placar = { e1: { renda: 5000, piloto: 4000, efeitoDecisoes: 500, sorte: 500, piorCaso: 1000, ativa: true } };
  const meusVotos = { entrada: { antes: { a1: 4, a2: 2 }, depois: { a1: 2 } } };
  // Act
  const final = telaDoAluno(entrada({ tipo: 'placarFinal', subfase: 'ativo', equipesTravadas: true, equipesAbertas: TODAS }, { placar }));
  const comparativo = telaDoAluno(entrada({ tipo: 'comparativo', subfase: 'ativo', enquete: 'entrada' }, { meusVotos }));
  const fim = telaDoAluno(entrada({ tipo: 'fim', subfase: 'ativo', equipesAbertas: TODAS }, { placar }));
  // Assert
  assert.deepEqual([final.tipo, final.dados.final, final.dados.placar.sorte], ['situacao', true, 500]);
  assert.equal(comparativo.tipo, 'comparativo');
  assert.deepEqual(comparativo.dados.afirmacoes.map((a) => [a.id, a.antes, a.depois]), [['a1', 4, 2], ['a2', 2, null], ['a3', null, null]]);
  assert.deepEqual([fim.tipo, fim.dados.equipe.nome, fim.dados.placar.renda], ['fim', 'Laranja', 5000]);
});

test('conteúdo como volta do banco (sem listas e objetos vazios) não quebra a tela', () => {
  // Arrange
  const canal = V.canalLocal.criar({ travas: false });
  canal.importar({ c: conteudo });
  const doBanco = canal.exportar().c;
  // Act
  const persona = telaDoAluno(entrada({ tipo: 'personas', equipesTravadas: true }, { conteudo: doBanco }));
  const decisao = telaDoAluno(entrada(rodada('decidindo'), { conteudo: doBanco }));
  // Assert
  assert.equal(doBanco.personas.motoboy.inicial, undefined, 'o banco sumiu com o inicial: {}');
  assert.equal(persona.tipo, 'persona');
  assert.equal(persona.dados.indicadores.find((i) => i.id === 'energia').valor, 8);
  assert.equal(decisao.dados.opcoes.length, 3);
});

test('pendenteAindaVale: só com a mesma etapa aberta; pausado ainda vale', () => {
  // Arrange
  const votoA1 = { tipo: 'enquete', enquete: 'entrada', momento: 'antes', afirmacao: 'a1', valor: 3 };
  const decisaoA = { tipo: 'decisao', rodada: 'r1', equipe: 'e1', opcao: 'a' };
  // Act + Assert
  assert.equal(pendenteAindaVale(votoA1, enquete('votando')), true);
  assert.equal(pendenteAindaVale(votoA1, enquete('votando', { afirmacao: 'a2' })), false);
  assert.equal(pendenteAindaVale(votoA1, enquete('votando', { afirmacao: '*' })), true);
  assert.equal(pendenteAindaVale(votoA1, enquete('votando', { momento: 'depois' })), false);
  assert.equal(pendenteAindaVale(votoA1, enquete('votando', { restanteMs: 1000, prazo: undefined })), true);
  assert.equal(pendenteAindaVale(votoA1, enquete('fechando')), false);
  assert.equal(pendenteAindaVale(decisaoA, rodada('decidindo')), true);
  assert.equal(pendenteAindaVale(decisaoA, rodada('decidindo', { rodada: 'r2' })), false);
  assert.equal(pendenteAindaVale(decisaoA, rodada('prorrogacao', { empatadas: { e1: { a: true, b: true } } })), true);
  assert.equal(pendenteAindaVale(decisaoA, rodada('prorrogacao', { empatadas: { e1: { b: true, c: true } } })), false);
  assert.equal(pendenteAindaVale(decisaoA, rodada('prorrogacao', { empatadas: { e2: { a: true, b: true } } })), false);
  assert.equal(pendenteAindaVale(decisaoA, rodada('sorteio')), false);
  assert.equal(pendenteAindaVale(null, rodada('decidindo')), false);
  assert.equal(pendenteAindaVale(decisaoA, null), false);
  assert.equal(pendenteAindaVale({ tipo: 'outro' }, rodada('decidindo')), false);
});

test('sugerirEquipe: completa até o alvo na ordem do config, só entre as abertas', () => {
  // Arrange
  const membros = { a: { equipe: 'e1' }, b: { equipe: 'e1' }, c: { equipe: 'e1' }, d: { equipe: 'e3' }, e: {} };
  // Act + Assert
  assert.equal(sugerirEquipe(conteudo, { membros, equipesAbertas: TODAS }), 'e2');
  assert.equal(sugerirEquipe(conteudo, { membros, equipesAbertas: { e1: true, e3: true } }), 'e3');
  assert.equal(sugerirEquipe(conteudo, { membros, equipesAbertas: ['e1', 'e3'] }), 'e3');
  assert.equal(sugerirEquipe(conteudo, { membros }), 'e2', 'sem equipes definidas, todas contam como abertas');
  assert.equal(sugerirEquipe(conteudo, { membros, equipesAbertas: {} }), null);
});

test('sugerirEquipe: conta só os ativos; com todas cheias, a de menos ativos (empate: a primeira)', () => {
  // Arrange
  const membros = {};
  for (const [i, eq] of ['e1', 'e1', 'e1', 'e2', 'e2', 'e2', 'e2'].entries()) membros['u' + i] = { equipe: eq };
  const abertas = { e1: true, e2: true };
  // Act + Assert
  assert.equal(sugerirEquipe(conteudo, { membros, equipesAbertas: abertas }), 'e1');
  assert.equal(sugerirEquipe(conteudo, { membros, ativos: new Set(['u0', 'u3', 'u4', 'u5']), equipesAbertas: abertas }), 'e1');
  assert.equal(sugerirEquipe(conteudo, { membros, ativos: ['u0', 'u1', 'u2', 'u3'], equipesAbertas: abertas }), 'e2');
  assert.equal(sugerirEquipe(conteudo, { membros, ativos: { u0: true, u1: true, u2: true, u3: true, u4: true, u5: true }, equipesAbertas: abertas }), 'e1');
});

test('crachá: curto, estável, derivado do uid e com o nome da equipe', () => {
  // Arrange
  const uids = Array.from({ length: 20 }, (_, i) => `aluno${String(i).padStart(2, '0')}`);
  // Act
  const codigos = uids.map(codigoCracha);
  // Assert
  assert.match(cracha('x1', conteudo.equipes.e1), /^Laranja · [A-HJ-NP-Z2-9]{3}$/);
  assert.equal(cracha('x1', 'Laranja'), cracha('x1', conteudo.equipes.e1));
  assert.equal(cracha('x1', null), codigoCracha('x1'));
  assert.equal(codigoCracha('x1'), codigoCracha('x1'));
  assert.equal(new Set(codigos).size, 20, 'os 20 uids de teste dão crachás diferentes');
});

// Revisão da D-037, achado 5: o voto guardado no aparelho durante a janela
// aberta por engano (desfeita pelo Ctrl+Z) era reenviado depois de recarregar,
// na reabertura legítima da mesma etapa. A janela é o abertoEm.
test('pendenteAindaVale: voto guardado de outra janela da mesma etapa (outro abertoEm) não vale', () => {
  // Arrange
  const votoA1 = { tipo: 'enquete', enquete: 'entrada', momento: 'antes', afirmacao: 'a1', valor: 3, abertoEm: 0 };
  const decisaoA = { tipo: 'decisao', rodada: 'r1', equipe: 'e1', opcao: 'a', abertoEm: 200 };
  // Act + Assert
  assert.equal(pendenteAindaVale(votoA1, enquete('votando')), true, 'mesma janela');
  assert.equal(pendenteAindaVale(votoA1, enquete('votando', { abertoEm: 90_000 })), false, 'janela reaberta depois do desfazer');
  assert.equal(pendenteAindaVale(decisaoA, rodada('decidindo')), true);
  assert.equal(pendenteAindaVale(decisaoA, rodada('prorrogacao', { empatadas: { e1: { a: true, b: true } } })), true, 'a prorrogação é a mesma janela');
  assert.equal(pendenteAindaVale(decisaoA, rodada('decidindo', { abertoEm: 500_000 })), false);
});
