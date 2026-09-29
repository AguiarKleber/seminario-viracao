#!/usr/bin/env node
// Sobe a versão do app: o ?v=N de todo script e estilo das três páginas e a
// versaoApp do telão e do celular, juntos.
//
// Uso: node bin/versao.mjs            (N + 1)
//      node bin/versao.mjs 7          (fixa em 7)
//      node bin/versao.mjs --conferir (só confere; sai com 1 se algo diverge)
//      --raiz <pasta>                 (opera noutra cópia do projeto)
//
// Por que existe: o GitHub Pages guarda cache por 10 min (arquitetura, seção
// 2). Sem um ?v= novo, o celular pode abrir o aluno.js velho com o telão novo; a
// versaoApp gravada na meta da sala é o que faz o celular mostrar "atualize a
// página". As três coisas precisam andar juntas, e à mão uma sempre fica para trás.
//
// As trocas são por split/join de texto exato, nunca por regex com "$" na
// substituição: um "$1" ou "$&" dentro do texto viraria outra coisa sem aviso.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PAGINAS = ['index.html', 'telao/index.html', 'aluno/index.html'];
export const SCRIPTS_COM_VERSAO = ['js/telao.js', 'js/aluno.js'];
const MARCA_ANTES = "const VERSAO_APP = '";
const MARCA_DEPOIS = "';";

function lerVersaoDe(texto, arquivo) {
  const i = texto.indexOf(MARCA_ANTES);
  if (i < 0) throw new Error(`${arquivo}: não achei "${MARCA_ANTES}…${MARCA_DEPOIS}".`);
  const inicio = i + MARCA_ANTES.length;
  const fim = texto.indexOf(MARCA_DEPOIS, inicio);
  const versao = texto.slice(inicio, fim);
  if (!/^\d+$/.test(versao)) throw new Error(`${arquivo}: a versaoApp "${versao}" não é um inteiro.`);
  return versao;
}

// Os ?v= dos atributos src e href de uma página (os comentários do HTML também
// falam de "?v=", e não contam).
function versoesDaPagina(texto) {
  return [...texto.matchAll(/(?:src|href)="[^"]*\?v=([^"]*)"/g)].map((m) => m[1]);
}

export function conferir(raiz = RAIZ_PADRAO) {
  const problemas = [];
  const versoes = new Map();
  for (const s of SCRIPTS_COM_VERSAO) versoes.set(s, lerVersaoDe(readFileSync(join(raiz, s), 'utf8'), s));
  const referencia = versoes.get(SCRIPTS_COM_VERSAO[0]);
  for (const [s, v] of versoes) if (v !== referencia) problemas.push(`${s}: versaoApp ${v}, esperado ${referencia}`);
  for (const p of PAGINAS) {
    const vs = versoesDaPagina(readFileSync(join(raiz, p), 'utf8'));
    if (p !== 'index.html' && vs.length === 0) problemas.push(`${p}: nenhum ?v=`);
    for (const v of vs) if (v !== referencia) problemas.push(`${p}: ?v=${v}, esperado ${referencia}`);
  }
  return { versao: referencia, problemas };
}

export function subir(raiz = RAIZ_PADRAO, nova = null) {
  const { versao: atual, problemas } = conferir(raiz);
  if (problemas.length > 0) throw new Error(`As versões já divergem; acerte à mão antes:\n- ${problemas.join('\n- ')}`);
  const alvo = nova === null ? String(Number(atual) + 1) : String(nova);
  if (!/^\d+$/.test(alvo)) throw new Error(`Versão inválida: "${alvo}" (use um inteiro).`);
  if (alvo === atual) return { de: atual, para: alvo, arquivos: [] };
  const arquivos = [];
  for (const p of PAGINAS) {
    const caminho = join(raiz, p);
    const texto = readFileSync(caminho, 'utf8');
    // As aspas fecham o atributo: "?v=1" nunca casa com "?v=12".
    const novo = texto.split(`?v=${atual}"`).join(`?v=${alvo}"`);
    if (novo !== texto) {
      writeFileSync(caminho, novo);
      arquivos.push(p);
    }
  }
  for (const s of SCRIPTS_COM_VERSAO) {
    const caminho = join(raiz, s);
    const texto = readFileSync(caminho, 'utf8');
    writeFileSync(caminho, texto.split(`${MARCA_ANTES}${atual}${MARCA_DEPOIS}`).join(`${MARCA_ANTES}${alvo}${MARCA_DEPOIS}`));
    arquivos.push(s);
  }
  const depois = conferir(raiz);
  if (depois.problemas.length > 0 || depois.versao !== alvo) throw new Error(`Depois da troca, sobrou divergência:\n- ${depois.problemas.join('\n- ')}`);
  return { de: atual, para: alvo, arquivos };
}

const principal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (principal) {
  const args = process.argv.slice(2);
  const iRaiz = args.indexOf('--raiz');
  const raiz = iRaiz >= 0 ? args[iRaiz + 1] : RAIZ_PADRAO;
  try {
    if (args.includes('--conferir')) {
      const { versao, problemas } = conferir(raiz);
      if (problemas.length > 0) {
        console.error(`Versões divergentes (versaoApp ${versao}):\n- ${problemas.join('\n- ')}`);
        process.exitCode = 1;
      } else console.log(`ok: versão ${versao} em ${PAGINAS.length} páginas e ${SCRIPTS_COM_VERSAO.length} scripts.`);
    } else {
      const numero = args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--raiz') ?? null;
      const r = subir(raiz, numero);
      console.log(r.arquivos.length === 0 ? `Já está na versão ${r.para}.` : `Versão ${r.de} → ${r.para}: ${r.arquivos.join(', ')}.`);
    }
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  }
}
