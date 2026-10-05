// Conferência estática do firebase/regras.json, sem rede (entra no npm test).
// O emulador prova o comportamento (test/emulador/); aqui ficam as garantias de
// forma que um descuido na edição quebraria sem nenhum teste de caso notar:
// uma permissão aberta, um $outro esquecido, um prazo sem a graça.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { RAIZ } from './carregar-nucleo.mjs';

const texto = readFileSync(join(RAIZ, 'firebase', 'regras.json'), 'utf8');
const regras = JSON.parse(texto).rules;
const sala = regras.salas.$s;

const HOST = "auth != null && root.child('salas/'+$s+'/meta/hostUid').val() === auth.uid";

// Todo nó com regra, com o caminho: [['salas/$s/meta', { '.write': … }], …]
function nos(no, caminho = '', saida = []) {
  saida.push([caminho, no]);
  for (const [k, v] of Object.entries(no)) {
    if (!k.startsWith('.') && v && typeof v === 'object') nos(v, caminho ? `${caminho}/${k}` : k, saida);
  }
  return saida;
}
const todos = nos(regras);
const expressoes = todos.flatMap(([c, no]) => Object.entries(no).filter(([k]) => k.startsWith('.')).map(([k, v]) => [`${c}/${k}`, v]));

// As chaves que o canal-local aceita, lidas do próprio arquivo: se alguém
// acrescentar um campo lá e esquecer aqui (ou o contrário), um dos modos quebra.
function conjuntoDoCanalLocal(nome) {
  const fonte = readFileSync(join(RAIZ, 'js', 'canal', 'canal-local.js'), 'utf8');
  const m = fonte.match(new RegExp(`${nome} = new Set\\(\\[([\\s\\S]*?)\\]\\)`));
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
}

test('o arquivo é JSON válido, sem comentário, com a raiz fechada', () => {
  assert.equal(regras['.read'], false);
  assert.equal(regras['.write'], false);
  assert.doesNotMatch(texto, /\/\/|\/\*/, 'o console aceita comentário, mas o teste e o emulador leem JSON puro');
});

test('nenhuma permissão aberta: nenhum .read/.write true, e toda escrita não-false exige auth', () => {
  for (const [c, v] of expressoes) {
    assert.notEqual(v, true, `${c} está aberto`);
    if (/\.(read|write)$/.test(c) && v !== false) assert.match(v, /auth/, `${c} não exige login`);
  }
});

test('em salas/$s, só o anfitrião, e só para apagar a sala inteira; leitura inteira só do anfitrião', () => {
  assert.equal(sala['.write'], `${HOST} && !newData.exists()`);
  assert.equal(sala['.read'], HOST);
  assert.deepEqual(sala.$outro, { '.validate': false });
});

test('os nós do anfitrião só aceitam escrita que começa pela conferência do anfitrião', () => {
  for (const c of ['conteudo', 'estado', 'pulso', 'placar']) assert.equal(sala[c]['.write'], HOST, c);
  assert.equal(sala.resultados.$r['.write'], `${HOST} && (!data.exists() || !newData.exists())`);
  assert.equal(sala.enquetes.$e.$m['.write'], `${HOST} && (!data.exists() || !newData.exists())`);
  // Semente: gravada uma vez e nunca apagada (nem pelo desfazer).
  assert.equal(sala.sementes.$r['.write'], `${HOST} && !data.exists()`);
  assert.equal(sala.sementes.$r['.validate'], 'newData.isNumber()');
  // Marca de prorrogação (D-035): o mesmo espírito da semente, só com true.
  assert.equal(sala.prorrogacoes.$r['.write'], `${HOST} && !data.exists()`);
  assert.equal(sala.prorrogacoes.$r['.validate'], 'newData.val() === true');
});

test('a escrita de aluno existe só nos nós previstos (arquitetura, seção 6)', () => {
  const comEscrita = todos.filter(([, no]) => typeof no['.write'] === 'string').map(([c]) => c).sort();
  assert.deepEqual(comEscrita, [
    'pedidosAnfitriao/$uid', 'regrasVersao/$uid',
    'salas/$s', 'salas/$s/conteudo', 'salas/$s/decisoes/$r/$eq/$uid', 'salas/$s/enquetes/$e/$m', 'salas/$s/estado',
    'salas/$s/membros/$uid', 'salas/$s/membros/$uid/equipe', 'salas/$s/meta', 'salas/$s/meta/hostUid', 'salas/$s/placar',
    'salas/$s/presenca/$uid', 'salas/$s/prorrogacoes/$r', 'salas/$s/pulso', 'salas/$s/resultados/$r', 'salas/$s/sementes/$r',
    'salas/$s/votosEnquete/$e/$m/$a/$uid',
  ].sort());
  // As escritas de aluno são sempre na chave do próprio uid.
  for (const c of ['salas/$s/presenca/$uid', 'salas/$s/votosEnquete/$e/$m/$a/$uid', 'salas/$s/decisoes/$r/$eq/$uid', 'pedidosAnfitriao/$uid', 'regrasVersao/$uid']) {
    const no = todos.find(([x]) => x === c)[1];
    assert.match(no['.write'], /^auth != null && auth\.uid === \$uid/, c);
  }
});

test('PIN_OK sempre com exists(): null === null nunca passa (red team, falha 2)', () => {
  const comPin = expressoes.filter(([, v]) => typeof v === 'string' && v.includes('pinApresentador'));
  assert.ok(comPin.length >= 2);
  for (const [c, v] of comPin) assert.match(v, /root\.child\('privado\/pinApresentador'\)\.exists\(\) && /, c);
  assert.match(sala.meta['.write'], /^\(!data\.exists\(\) && auth != null && root\.child\('privado\/pinApresentador'\)\.exists\(\)/);
  assert.match(sala.meta.hostUid['.write'], /newData\.val\(\) === auth\.uid$/);
});

test('$outro: false nos objetos fechados; estado e meta aceitam exatamente as chaves do canal-local', () => {
  for (const no of [sala, sala.meta, sala.estado, sala.membros.$uid]) assert.deepEqual(no.$outro, { '.validate': false });
  const chaves = (no) => Object.keys(no).filter((k) => !k.startsWith('.') && k !== '$outro').sort();
  assert.deepEqual(chaves(sala.estado), conjuntoDoCanalLocal('CHAVES_ESTADO'));
  assert.deepEqual(chaves(sala.meta), conjuntoDoCanalLocal('CHAVES_META'));
  assert.deepEqual(chaves(sala.membros.$uid), ['entrouEm', 'equipe']);
  assert.match(sala.estado['.validate'], /geracao'\)\.val\(\) \+ 1/);
});

test('achado 15: a trava da equipe está no .write do membro e no .validate da equipe, e não só no .write da equipe', () => {
  assert.match(sala.membros.$uid['.write'], /equipesTravadas'\)\.val\(\) === true\) \|\| newData\.child\('equipe'\)\.val\(\) === data\.child\('equipe'\)\.val\(\)/);
  assert.match(sala.membros.$uid.equipe['.validate'], /auth\.uid !== \$uid \|\| \(!\(.*equipesTravadas.*\) && .*equipesAbertas/);
  assert.match(sala.membros.$uid.entrouEm['.validate'], /newData\.val\(\) === now/);
  assert.equal(sala.presenca.$uid['.validate'], 'newData.val() === now && newData.getPriority() === null');
});

// Revisão da F2, achados 1 e 3: o nó do membro precisa do próprio .validate. Um
// texto solto não tem filhos, e as regras de entrouEm, equipe e $outro não o
// viam; gravar só a equipe criava um membro sem passar pela entrada.
test('o nó do membro é sempre um objeto com entrouEm', () => {
  assert.match(sala.membros.$uid['.validate'], /^newData\.hasChildren\(\['entrouEm'\]\)/);
});

// Achado 2: a prioridade (.priority) é um valor de tamanho livre ao lado de cada
// nó. Toda escrita de aluno (e toda escrita fora de sala) exige prioridade nula,
// no próprio nó e em cada filho: o SDK aceita a prioridade dentro do valor.
test('toda escrita de aluno exige prioridade nula, nó a nó', () => {
  const doAluno = [
    regras.pedidosAnfitriao.$uid, regras.regrasVersao.$uid, sala.membros.$uid, sala.membros.$uid.entrouEm, sala.membros.$uid.equipe,
    sala.presenca.$uid, sala.votosEnquete.$e.$m.$a.$uid, sala.decisoes.$r.$eq.$uid,
  ];
  for (const no of doAluno) assert.match(no['.validate'], / && newData\.getPriority\(\) === null$/, no['.validate'].slice(0, 60));
});

// Achado 5: o autoteste do telão só prova que as regras publicadas aceitam a
// versão, e a versão era um literal solto em três arquivos. Mudar uma regra sem
// subir a versão deixava o telão dizer "regras conferidas" com as regras velhas
// publicadas. Agora cada versão fica presa ao conteúdo: mudou o regras.json, o
// hash não bate com o da versão, e este teste manda subir a versão nos três
// lugares (regras.json, js/telao.js e js/canal/canal-local.js) e registrar o
// hash novo aqui. Uma versão já usada nunca volta com outro conteúdo.
const HASH_POR_VERSAO = {
  v2: '962556dea5c3',
  v3: '7066bfc58f46', // D-035: salas/$s/prorrogacoes/$r
  v4: '56db60124643', // D-064: o apresentador com o PIN lê salas/$s/decisoes/$r/$eq (modo espectador)
};

function versaoEHash() {
  const copia = structuredClone(JSON.parse(texto));
  const regra = copia.rules.regrasVersao.$uid['.validate'];
  const versao = regra.match(/newData\.val\(\) === '([^']+)'/)[1];
  copia.rules.regrasVersao.$uid['.validate'] = regra.replace(`'${versao}'`, "'VERSAO'");
  return { versao, hash: createHash('sha256').update(JSON.stringify(copia)).digest('hex').slice(0, 12) };
}

test('regrasVersao presa ao conteúdo: mudou o regras.json, suba a versão nos três lugares', () => {
  const { versao, hash } = versaoEHash();
  assert.equal(HASH_POR_VERSAO[versao], hash,
    `firebase/regras.json mudou e regrasVersao continua "${versao}" (hash ${hash}): suba a versão em firebase/regras.json, `
    + `js/telao.js (REGRAS_VERSAO) e js/canal/canal-local.js, e registre { novaVersao: '${hash}' } em HASH_POR_VERSAO. `
    + 'Depois, publique as regras no console e recarregue o telão.');
  const telao = readFileSync(join(RAIZ, 'js', 'telao.js'), 'utf8');
  assert.match(telao, new RegExp(`const REGRAS_VERSAO = '${versao}';`), 'js/telao.js: REGRAS_VERSAO diferente da do regras.json');
  const local = readFileSync(join(RAIZ, 'js', 'canal', 'canal-local.js'), 'utf8');
  assert.match(local, new RegExp(`const REGRAS_VERSAO = '${versao}';`), 'js/canal/canal-local.js: versão diferente da do regras.json');
});

test('regrasVersao só aceita a própria versão; autoteste nunca; privado fechado; pedido de 8 a 32 caracteres', () => {
  assert.match(regras.regrasVersao.$uid['.validate'], /^newData\.isString\(\) && newData\.val\(\) === '[^']+'/);
  assert.deepEqual(regras.autoteste, { $uid: { '.write': false } });
  assert.deepEqual(regras.privado, { '.read': false, '.write': false });
  assert.match(regras.pedidosAnfitriao.$uid['.validate'], /isString\(\) && newData\.val\(\)\.length >= 8 && newData\.val\(\)\.length <= 32/);
});

test('toda expressão de prazo soma a graça (gracaSeg) e exige número', () => {
  const comPrazo = expressoes.filter(([, v]) => typeof v === 'string' && v.includes("/estado/prazo')"));
  assert.ok(comPrazo.length >= 2, 'voto de enquete e decisão');
  for (const [c, v] of comPrazo) {
    assert.match(v, /gracaSeg'\)\.val\(\) \* 1000/, c);
    assert.match(v, /estado\/prazo'\)\.isNumber\(\)/, `${c}: sem prazo (pausado) nada passa`);
  }
});

test('leitura nó a nó: sementes, prorrogações e presença sem leitura de aluno; votos e decisões só do próprio (e o espectador com o PIN)', () => {
  for (const c of ['meta', 'conteudo', 'estado', 'pulso', 'resultados', 'placar', 'enquetes', 'membros']) assert.equal(sala[c]['.read'], 'auth != null', c);
  assert.equal(sala.sementes['.read'], undefined);
  assert.equal(sala.prorrogacoes['.read'], undefined);
  assert.equal(sala.prorrogacoes.$r['.read'], undefined);
  assert.equal(sala.presenca['.read'], undefined);
  assert.equal(sala.votosEnquete.$e.$m.$a.$uid['.read'], 'auth != null && auth.uid === $uid');
  // Regras v4 (D-064): além de quem é da equipe, o celular do apresentador com
  // o PIN (o modo espectador) lê a decisão de uma equipe; nunca a rodada inteira.
  assert.equal(sala.decisoes.$r.$eq['.read'], "auth != null && (root.child('salas/'+$s+'/membros/'+auth.uid+'/equipe').val() === $eq || (root.child('privado/pinApresentador').exists() && root.child('pedidosAnfitriao/'+auth.uid).val() === root.child('privado/pinApresentador').val()))");
  assert.equal(sala.decisoes['.read'], undefined);
  assert.equal(sala.decisoes.$r['.read'], undefined);
  const leituras = expressoes.filter(([c]) => c.endsWith('/.read') && c.startsWith('salas/')).map(([c]) => c);
  assert.equal(leituras.length, 11);
});
