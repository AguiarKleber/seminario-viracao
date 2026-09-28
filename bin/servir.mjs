#!/usr/bin/env node
// Servidor estático mínimo, só com node:http, para abrir o site na própria
// máquina (telão e celular com o emulador) e para o e2e online.
//
// Uso: node bin/servir.mjs [porta] [--host 0.0.0.0]
//      e abra http://127.0.0.1:8080/telao/?emulador=1
//
// Por que um servidor, e não abrir por file://: o modo com celulares precisa de
// import() e fetch, que o Chrome e o Edge bloqueiam por file:// (arquitetura,
// seção 3). E por que sem dependência: é uma ferramenta de ensaio, e o site
// publicado é só arquivo estático (GitHub Pages).
//
// Imita o que importa do GitHub Pages: /telao vira /telao/ (redireciona, como lá,
// para os caminhos relativos funcionarem) e a pasta serve o index.html. Nada de
// cache (no-store): num ensaio, um arquivo velho no cache faria o teste mentir.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function responder(res, codigo, texto, extras = {}) {
  res.writeHead(codigo, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extras });
  res.end(texto);
}

// Um caminho pedido vira um arquivo DENTRO da raiz, ou nada. Pastas e arquivos
// que começam com ponto (.git, .env) nunca saem, nem node_modules: um servidor
// de ensaio aberto na rede não pode entregar o histórico do repositório.
function resolverCaminho(raiz, pathname) {
  let decodificado;
  try {
    decodificado = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decodificado.includes('\0')) return null;
  const alvo = resolve(raiz, '.' + decodificado);
  const rel = relative(raiz, alvo);
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  if (rel.split(sep).some((s) => s.startsWith('.') || s === 'node_modules')) return null;
  return alvo;
}

function tratar(raiz, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Só GET e HEAD.', { Allow: 'GET, HEAD' });
  const url = new URL(req.url, 'http://localhost');
  // O site não tem ícone: sem isto, cada página deixa um 404 no console, e o e2e
  // (que reprova qualquer erro de console) teria de ignorar erro de verdade junto.
  if (url.pathname === '/favicon.ico') return responder(res, 204, '');
  const alvo = resolverCaminho(raiz, url.pathname);
  if (!alvo) return responder(res, 404, 'Não encontrado.');
  let info;
  try {
    info = statSync(alvo);
  } catch {
    return responder(res, 404, 'Não encontrado.');
  }
  let arquivo = alvo;
  if (info.isDirectory()) {
    if (!url.pathname.endsWith('/')) return responder(res, 301, '', { Location: `${url.pathname}/${url.search}` });
    arquivo = join(alvo, 'index.html');
    try {
      info = statSync(arquivo);
    } catch {
      return responder(res, 404, 'Não encontrado.');
    }
  }
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(arquivo).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(arquivo).pipe(res);
}

// servir({ porta = 8080, host = '127.0.0.1', raiz }) → Promise<{ url, servidor, fechar() }>
// porta 0 = uma porta livre qualquer (o e2e usa assim).
export function servir({ porta = 8080, host = '127.0.0.1', raiz = RAIZ } = {}) {
  const servidor = createServer((req, res) => tratar(raiz, req, res));
  return new Promise((resolver, rejeitar) => {
    servidor.once('error', rejeitar);
    servidor.listen(porta, host, () => {
      const { port } = servidor.address();
      const nome = host === '0.0.0.0' ? '127.0.0.1' : host;
      resolver({
        url: `http://${nome}:${port}/`,
        servidor,
        fechar: () => new Promise((r) => {
          servidor.closeAllConnections?.();
          servidor.close(() => r());
        }),
      });
    });
  });
}

const principal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (principal) {
  const args = process.argv.slice(2);
  const iHost = args.indexOf('--host');
  const host = iHost >= 0 ? args[iHost + 1] : '127.0.0.1';
  const porta = Number(args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--host') || process.env.PORTA || 8080);
  const { url } = await servir({ porta, host });
  console.log(`Servindo ${RAIZ} em ${url}`);
  console.log(`  telão:   ${url}telao/        (com o emulador: ${url}telao/?emulador=1)`);
  console.log(`  celular: ${url}aluno/`);
  console.log('Ctrl+C para parar.');
}
