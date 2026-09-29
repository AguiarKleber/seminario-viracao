// Carrega no Node os mesmos scripts clássicos que o navegador carrega.
//
// Por quê: o site não usa módulos ES. Por file://, o Chrome e o Edge bloqueiam
// módulos, e o modo offline abre pelo pendrive. Cada arquivo do núcleo é uma
// IIFE que se registra em globalThis.Viracao. Aqui importamos os arquivos na
// MESMA ordem das tags <script> do telão, para o teste exercitar exatamente o
// código que roda na sala, e não uma cópia adaptada.
//
// Um arquivo que ainda não existe é pulado. Assim a construção pode ser
// incremental, sem quebrar os testes dos módulos que já estão prontos.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// A mesma ordem de carregamento do telao/index.html e do aluno/index.html.
export const ORDEM = [
  'js/nucleo/validar-config.js',
  'js/nucleo/sorte.js',
  'js/nucleo/motor.js',
  'js/nucleo/enquete.js',
  'js/nucleo/roteiro.js',
  'js/canal/canal-local.js',
  'js/nucleo/anfitriao.js',
  'js/nucleo/aluno-logica.js',
];

export async function carregarNucleo() {
  for (const relativo of ORDEM) {
    const caminho = join(raiz, relativo);
    // pathToFileURL, e nunca 'file://' + caminho: no Windows, a concatenação
    // gera uma URL inválida, e o import falha em silêncio.
    if (existsSync(caminho)) await import(pathToFileURL(caminho).href);
  }
  return globalThis.Viracao;
}

export const RAIZ = raiz;
