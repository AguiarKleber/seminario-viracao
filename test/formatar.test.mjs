// Viracao.formatar (js/ui/formatar.js): o mesmo texto no telão, no celular e no
// e2e. Não é do núcleo, mas também não toca DOM, e roda aqui igual ao navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from './carregar-nucleo.mjs';

await import(pathToFileURL(join(RAIZ, 'js/ui/formatar.js')).href);
const F = globalThis.Viracao.formatar;

// Revisão de 29/09: a taxa saía com uma casa ("7,4%") pelo decimal(), enquanto
// o contexto do celular e a fonte dizem 7,43%. Quem fazia 7,4% da dívida não
// chegava aos juros que o motor cobra.
test('taxa: a taxa ao mês com até duas casas, como na fonte', () => {
  assert.equal(F.taxa(0.0743), '7,43%');
  assert.equal(F.taxa(0.1), '10%');
  assert.equal(F.taxa(0.075), '7,5%');
  assert.equal(F.taxa(0.15183), '15,18%');
  assert.equal(F.taxa(undefined), '—');
});

test('taxa: o texto exibido volta a regras.jurosDividaMes do config.json real e bate com a jurosFonte', () => {
  // Arrange
  const { regras } = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));

  // Act
  const texto = F.taxa(regras.jurosDividaMes);

  // Assert
  assert.ok(Math.abs(Number(texto.replace('%', '').replace(',', '.')) / 100 - regras.jurosDividaMes) < 1e-12, `${texto} × ${regras.jurosDividaMes}`);
  assert.ok(regras.jurosFonte.includes(texto), `a fonte cita ${texto}`);
});
