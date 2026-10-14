// Conferências estáticas dos textos das telas, sem navegador (entram no npm test).
//
// D-041 e rascunho, seção 7, item 14: "piloto automático" saiu do placar final
// no redesenho, mas continuou no resultado do mês (telão), na história da
// equipe e na decisão do celular. O e2e só vê as telas por onde o roteiro dele
// passa; aqui, o termo é procurado no código inteiro das duas telas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './carregar-nucleo.mjs';

const TELAS = ['js/telao.js', 'js/aluno.js', 'telao/index.html', 'aluno/index.html', 'index.html'];

// Só o que pode virar texto na tela: os comentários de JS e de HTML podem citar
// o termo, porque é assim que o porquê fica registrado.
function semComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('"piloto automático" não aparece em nenhum texto das telas (telão e celular)', () => {
  for (const arquivo of TELAS) {
    const achados = semComentarios(readFileSync(join(RAIZ, arquivo), 'utf8')).split('\n').filter((l) => /piloto autom/i.test(l));
    assert.deepEqual(achados, [], `${arquivo}: "piloto automático" num texto de tela`);
  }
});

// Revisão final de 14/10 (itens C4 e C6 da triagem): os avisos que vão ao
// projetor e ao celular quando a rede cai. Antes, o telão dizia que o comando
// "pode chegar quando a rede voltar" (e isso levava ao 2º Enter, que deixava o
// telão preso em "Apurando…"), projetava "PERMISSION_DENIED: Permission denied"
// e "CONFLITO: …" em inglês ou sem contexto, mandava "use aquela aba" sem haver
// outra aba e falava em "tempo mínimo de conversa" no jogo individual; o
// celular mostrava a mensagem crua do erro entre parênteses e se contradizia
// ("por uma hora" e "espere alguns minutos").
const codigo = (arquivo) => semComentarios(readFileSync(join(RAIZ, arquivo), 'utf8'));

test('telão: os avisos de queda de rede dizem o passo certo, em português', () => {
  const t = codigo('js/telao.js');
  assert.doesNotMatch(t, /pode chegar quando a rede voltar/, 'o SEM_RESPOSTA não promete que o comando chega');
  assert.match(t, /a rede pode estar fora\. Não repita agora/);
  assert.match(t, /\/\^CONFLITO\/\.test\(m\)\) return 'O estado da sala mudou enquanto o comando ia/);
  assert.match(t, /\/PERMISSION_DENIED\/\.test\(m\)\) return 'O servidor recusou o comando/);
  assert.match(t, /use aquela aba\. Se você acabou de fechar a aba do telão, espere 30 s e clique de novo em Retomar sala\./);
  assert.match(t, /depois de criar a sala, se os celulares não entrarem, ligue "Rede restrita" na barra/);
  assert.doesNotMatch(t, /Ainda no tempo mínimo de conversa \(faltam/, 'o modal do Enter cedo não fala em conversa');
  assert.match(t, /para o tempo mínimo\. Encerrar a decisão agora\?/);
});

test('celular: as telas de falha sem a mensagem crua do erro e sem contradição', () => {
  const a = codigo('js/aluno.js');
  assert.doesNotMatch(a, /Não foi possível falar com o servidor \(\$\{/, 'sem a mensagem do erro entre parênteses');
  assert.doesNotMatch(a, /Não foi possível baixar o app do servidor \(\$\{/, 'sem a mensagem do navegador entre parênteses');
  assert.doesNotMatch(a, /por uma hora\. Tente pelo 4G, ou espere alguns minutos/, 'sem "uma hora" e "alguns minutos" juntos');
  assert.match(a, /se não entrar em 1 minuto, use os dados móveis \(4G\)/);
  assert.match(a, /Desligue o Wi-Fi e entre pelos dados móveis \(4G\)/);
});

// Item C5: "Aguardando o telão… (o seu celular está conectado)" só com o
// próprio celular conectado. Sem rede, quem fala é o selo "Reconectando…".
test('celular: a faixa "Aguardando o telão" só aparece com o próprio celular conectado', () => {
  assert.match(codigo('js/aluno.js'), /const velho = app\.conectado === true && pulsoVelho\(\);/);
});
