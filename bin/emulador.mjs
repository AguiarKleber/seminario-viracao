#!/usr/bin/env node
// Sobe o emulador do Firebase (auth + database, projeto demo-seminario) e roda um
// comando dentro dele, com "firebase emulators:exec". Quando o comando termina,
// o emulador cai junto, e o código de saída é o do comando.
//
// Uso: node bin/emulador.mjs "node --test test/emulador/*.test.mjs"
//
// Por que um script, e não o "firebase emulators:exec" direto no package.json:
// - o emulador do database é um .jar e precisa do JDK 21 (D-021), que o winget
//   instalou sem pôr no PATH desta máquina. Sem JAVA_HOME resolvido aqui, o
//   firebase-tools falha com "java não encontrado", e a mensagem não diz onde
//   procurar;
// - o projeto "demo-" dispensa login e nunca fala com um projeto real
//   (arquitetura, seção A, item 9): as regras e o simulador são testados sem
//   gastar a cota de 100 contas anônimas por hora do projeto de verdade.
//
// Se o emulador já está no ar (por exemplo, "npx firebase emulators:start" em
// outro terminal, para iterar mais rápido), o comando roda direto contra ele.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PROJETO = 'demo-seminario';
export const HOST_EMULADOR = '127.0.0.1';
export const PORTA_AUTH = 9099;
export const PORTA_BANCO = 9000;
// Glob, e não a pasta: o node --test do Node 24 não expande um diretório.
const COMANDO_PADRAO = 'node --test test/emulador/*.test.mjs';

const javaDe = (pasta) => join(pasta, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');

// Onde o winget e o instalador da Adoptium põem o JDK 21. A versão mais nova
// vem primeiro: a ordenação é numérica por trecho ("jdk-21.0.12" > "jdk-21.0.9").
const PASTAS_JDK = ['C:\\Program Files\\Microsoft', 'C:\\Program Files\\Eclipse Adoptium'];

function compararVersoes(a, b) {
  const pa = a.match(/\d+/g).map(Number);
  const pb = b.match(/\d+/g).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function resolverJavaHome(env = process.env) {
  if (env.JAVA_HOME && existsSync(javaDe(env.JAVA_HOME))) return env.JAVA_HOME;
  if (process.platform !== 'win32') return null; // fora do Windows, vale o java do PATH
  for (const base of PASTAS_JDK) {
    if (!existsSync(base)) continue;
    const candidatas = readdirSync(base).filter((n) => /^jdk-21/.test(n)).sort(compararVersoes);
    for (const nome of candidatas) {
      const pasta = join(base, nome);
      if (existsSync(javaDe(pasta))) return pasta;
    }
  }
  return null;
}

// No Windows, process.env ignora maiúsculas, mas uma cópia dele não: a chave
// costuma ser "Path". Criar um "PATH" ao lado deixaria duas, e o processo filho
// pegaria uma qualquer.
function comJava(env, javaHome) {
  const saida = { ...env };
  if (!javaHome) return saida;
  const chave = Object.keys(saida).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  const separador = process.platform === 'win32' ? ';' : ':';
  saida[chave] = join(javaHome, 'bin') + separador + (saida[chave] || '');
  saida.JAVA_HOME = javaHome;
  return saida;
}

function portaAberta(porta, host = HOST_EMULADOR, esperaMs = 500) {
  return new Promise((resolver) => {
    const s = createConnection({ port: porta, host });
    const fim = (ok) => {
      s.destroy();
      resolver(ok);
    };
    s.setTimeout(esperaMs, () => fim(false));
    s.once('connect', () => fim(true));
    s.once('error', () => fim(false));
  });
}

export async function emuladorNoAr() {
  const [auth, banco] = await Promise.all([portaAberta(PORTA_AUTH), portaAberta(PORTA_BANCO)]);
  return auth && banco;
}

// As mesmas variáveis que o emulators:exec entrega ao comando: é por elas que os
// testes e o simulador acham o emulador.
function variaveisDoEmulador(env) {
  return {
    ...env,
    FIREBASE_AUTH_EMULATOR_HOST: `${HOST_EMULADOR}:${PORTA_AUTH}`,
    FIREBASE_DATABASE_EMULATOR_HOST: `${HOST_EMULADOR}:${PORTA_BANCO}`,
    GCLOUD_PROJECT: PROJETO,
  };
}

export function rodar(executavel, args, opcoes) {
  return new Promise((resolver) => {
    const filho = spawn(executavel, args, { stdio: 'inherit', ...opcoes });
    filho.once('error', (erro) => {
      console.error(`Não consegui iniciar "${executavel}": ${erro.message}`);
      resolver(1);
    });
    filho.once('exit', (codigo, sinal) => resolver(codigo ?? (sinal ? 1 : 0)));
  });
}

export async function rodarNoEmulador(comando = COMANDO_PADRAO) {
  if (await emuladorNoAr()) {
    console.log(`Emulador já está no ar em ${HOST_EMULADOR}: rodando "${comando}" direto nele.`);
    return rodar(comando, [], { cwd: RAIZ, shell: true, env: variaveisDoEmulador(process.env) });
  }
  const javaHome = resolverJavaHome();
  if (!javaHome && process.platform === 'win32') {
    console.error('JDK 21 não encontrado. Defina JAVA_HOME ou instale com: winget install Microsoft.OpenJDK.21');
    return 1;
  }
  const firebase = join(RAIZ, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
  if (!existsSync(firebase)) {
    console.error('firebase-tools não está no node_modules: rode "npm install".');
    return 1;
  }
  return rodar(process.execPath, [firebase, 'emulators:exec', '--only', 'auth,database', '--project', PROJETO, comando], {
    cwd: RAIZ,
    env: comJava(process.env, javaHome),
  });
}

// ---------- Apoio para quem fala com o emulador no Node (testes e simulador) ----------

// O mesmo namespace que o SDK deriva de https://demo-seminario-default-rtdb...:
// é nele que o emulador aplica o firebase/regras.json do firebase.json.
export const NAMESPACE = `${PROJETO}-default-rtdb`;
// O PIN só do emulador (e do --memoria). Um valor só para todos: os arquivos de
// test/emulador/ e o simulador rodam em paralelo no mesmo banco, e cada um semeia
// o PIN ao começar; com valores diferentes, um derrubaria o outro.
export const PIN_EMULADOR = 'pin-do-emulador-local';
export const CONEXAO_EMULADOR = Object.freeze({
  apiKey: 'chave-do-emulador',
  projectId: PROJETO,
  databaseURL: `https://${NAMESPACE}.firebaseio.com`,
});

// O emulators:exec avisa onde o emulador subiu; sem ele, as portas do firebase.json.
export function enderecoDoBanco(env = process.env) {
  const [host, porta] = (env.FIREBASE_DATABASE_EMULATOR_HOST || `${HOST_EMULADOR}:${PORTA_BANCO}`).split(':');
  return { host, porta: Number(porta) };
}

export function enderecoDoAuth(env = process.env) {
  const [host, porta] = (env.FIREBASE_AUTH_EMULATOR_HOST || `${HOST_EMULADOR}:${PORTA_AUTH}`).split(':');
  return { host, porta: Number(porta) };
}

// O pacote npm firebase@12.19.0: a mesma versão da CDN que o navegador carrega.
export async function carregarSdkNode() {
  const [app, auth, database] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]);
  // Cada recusa esperada (os ataques, as travas testadas) vira um "FIREBASE
  // WARNING" no console e enterra o relatório. O erro continua chegando pela
  // Promise, que é o que se confere.
  app.setLogLevel('error');
  return { app, auth, database };
}

// O canal-firebase é um script clássico: importá-lo só registra a fábrica em
// globalThis.Viracao, como a tag <script> faz no navegador.
export async function carregarCanalFirebase() {
  await import(pathToFileURL(join(RAIZ, 'js', 'canal', 'canal-firebase.js')).href);
  return globalThis.Viracao.canalFirebase;
}

let contadorDeApps = 0;
// Um canal por robô, cada um com o próprio app (conexão e login anônimo
// independentes), apontado para o emulador.
export async function novoCanalNoEmulador(prefixo = 'app', extras = {}) {
  const [sdk, fabrica] = await Promise.all([carregarSdkNode(), carregarCanalFirebase()]);
  const banco = enderecoDoBanco();
  const auth = enderecoDoAuth();
  contadorDeApps += 1;
  return fabrica.criar({
    sdk,
    conexao: CONEXAO_EMULADOR,
    nome: `${prefixo}-${process.pid}-${contadorDeApps}`,
    ambienteLocal: true,
    emulador: { host: banco.host, portaBanco: banco.porta, portaAuth: auth.porta },
    ...extras,
  });
}

// Acesso de administrador do emulador: "Authorization: Bearer owner" passa por
// cima das regras. É assim que o teste semeia privado/pinApresentador, que
// nenhuma conta consegue escrever (no projeto real, só o console).
// ns: outro namespace do mesmo emulador, para um teste que precisa de um banco só
// dele (por exemplo, sem o PIN) sem atrapalhar os arquivos que rodam em paralelo.
// Por isso o firebase.json desliga o singleProjectMode.
export async function administrador(metodo, caminho, corpo, ns = NAMESPACE) {
  const { host, porta } = enderecoDoBanco();
  const url = `http://${host}:${porta}/${caminho.replace(/^\/+/, '')}.json?ns=${ns}`;
  const resposta = await fetch(url, {
    method: metodo,
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : typeof corpo === 'string' && caminho === '.settings/rules' ? corpo : JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`Administrador do emulador: ${metodo} ${caminho} → ${resposta.status} ${await resposta.text()}`);
  return resposta.json();
}

// Um namespace novo com as MESMAS regras do firebase/regras.json (o emulador só
// aplica o firebase.json ao namespace padrão).
export async function namespaceComRegras(ns) {
  const regras = readFileSync(join(RAIZ, 'firebase', 'regras.json'), 'utf8');
  await administrador('PUT', '.settings/rules', regras, ns);
  return { apiKey: CONEXAO_EMULADOR.apiKey, projectId: PROJETO, databaseURL: `https://${ns}.firebaseio.com` };
}

const principal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (principal) process.exitCode = await rodarNoEmulador(process.argv[2] || COMANDO_PADRAO);
