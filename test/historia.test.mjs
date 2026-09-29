// A história de cada equipe no fim (D-045): uma linha por mês jogado, com a
// opção, a carta e as contas do mês. Função pura, usada pelo telão e pelo celular.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { lerConfigTesteV2, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();

function conteudoComNarrativas() {
  const b = lerConfigTesteV2();
  for (const r of b.rodadas) {
    for (const op of Array.isArray(r.opcoes) ? r.opcoes : Object.values(r.opcoes)) op.narrativa = `Escolhi: ${op.rotulo}.`;
  }
  for (const c of b.cartas) if (c.id !== 'chuva') c.narrativa = `Aconteceu: ${c.titulo}.`;
  return normalizar(V, b);
}

test('historiaDaEquipe: um item por mês jogado, na ordem das rodadas, com opção, carta e contas', () => {
  // Arrange: a e5 jogou r1 e r3 (r2 foi pulada no dia).
  const conteudo = conteudoComNarrativas();
  const mes1 = { trabalho: 3200, outraRenda: 0, entrou: 3200, basico: 1800, juros: 0, saldoMes: 1400, dividaAntes: 0 };
  const resultados = {
    r3: { e5: { decisao: 'a', carta: 'chuva', depois: {} } },
    r1: { e5: { decisao: 'd', carta: 'acidente', mes: mes1, depois: {} }, e1: { decisao: 'c', carta: 'normal' } },
  };

  // Act
  const h = V.historia.historiaDaEquipe(conteudo, 'e5', resultados);

  // Assert
  assert.deepEqual(h, [
    {
      rodadaId: 'r1', titulo: 'Mês 1: quanto trabalhar?',
      opcao: { rotulo: 'Pegar R$ 1.500 emprestado', narrativa: 'Escolhi: Pegar R$ 1.500 emprestado.' },
      carta: { titulo: 'Acidente: 20 dias parado', narrativa: 'Aconteceu: Acidente: 20 dias parado.', tom: 'grave' },
      mes: mes1,
      cartaCusto: null,
      deAntes: [],
      protecaoDoMes: null,
    },
    {
      rodadaId: 'r3', titulo: 'Mês 3: e agora?',
      opcao: { rotulo: 'Guardar reserva', narrativa: 'Escolhi: Guardar reserva.' },
      carta: { titulo: 'Semana de chuva', narrativa: null, tom: null },
      mes: null,
      cartaCusto: null,
      deAntes: [],
      protecaoDoMes: null,
    },
  ]);
});

test('historiaDaEquipe: sem resultados, lista vazia; lê o conteúdo que volta do banco', () => {
  // Arrange
  const conteudo = conteudoComNarrativas();
  const doBanco = JSON.parse(JSON.stringify(conteudo));
  delete doBanco.ordem.rodadas;

  // Act / Assert
  assert.deepEqual(V.historia.historiaDaEquipe(conteudo, 'e1', null), []);
  assert.deepEqual(V.historia.historiaDaEquipe(conteudo, 'e1', { r1: { e2: { decisao: 'a', carta: 'normal' } } }), []);
  assert.equal(V.historia.historiaDaEquipe(doBanco, 'e1', { r2: { e1: { decisao: 'a', carta: 'normal' } } })[0].rodadaId, 'r2');
});

// Revisão de 29/09: o motor devolve piloto, efeitoDecisoes e sorte fracionários,
// e cada um arredondado sozinho podia somar R$ 1 a mais ou a menos que o
// "terminaram com" (em ~15% das equipes, com o config real). A D-041 lê essa
// conta em voz alta, então as parcelas exibidas precisam fechar com o total.
test('escolhaOuSorte: as parcelas exibidas (inteiras) sempre somam o total exibido', () => {
  // Arrange: o caso mínimo (0,4 + 0,4 + 0,4 = 1,2) e 2.000 placares sorteados
  // por um gerador fixo, com parcelas fracionárias dos dois sinais.
  let x = 12345;
  const aleatorio = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const placares = [{ piloto: 0.4, efeitoDecisoes: 0.4, sorte: 0.4, renda: 1.2 }];
  for (let i = 0; i < 2000; i += 1) {
    const piloto = (aleatorio() - 0.7) * 12000;
    const efeitoDecisoes = (aleatorio() - 0.5) * 3000;
    const sorte = (aleatorio() - 0.5) * 6000;
    placares.push({ piloto, efeitoDecisoes, sorte, renda: piloto + efeitoDecisoes + sorte });
  }

  for (const p of placares) {
    // Act
    const e = V.historia.escolhaOuSorte(p);

    // Assert
    for (const k of ['piloto', 'escolhas', 'sorte', 'total']) assert.ok(Number.isInteger(e[k]), `${k} inteiro (${e[k]})`);
    // "+ 0": Math.round(−0,3) é −0, e a tela nunca mostra "−R$ 0".
    assert.equal(e.total, Math.round(p.renda) + 0, 'o total é o saldo arredondado');
    assert.equal(e.piloto, Math.round(p.piloto) + 0);
    assert.equal(e.escolhas, Math.round(p.efeitoDecisoes) + 0);
    assert.equal(e.piloto + e.escolhas + e.sorte, e.total, `a conta fecha: ${JSON.stringify(p)}`);
    assert.ok(Math.abs(e.sorte - p.sorte) <= 1.5, 'a sorte exibida fica a menos de R$ 1,50 da do motor');
  }
});

test('escolhaOuSorte: placar incompleto (sala antiga) não inventa número', () => {
  assert.equal(V.historia.escolhaOuSorte(null), null);
  assert.equal(V.historia.escolhaOuSorte({ renda: 10 }), null);
});

// Rascunho, seção 7, item 12 (D-045): a história no telão usava só os rótulos.
// Agora cada mês ganha uma linha curta em primeira pessoa, da opção e da
// carta. A narrativa inteira (duas ou três frases de cada) não cabe em 1024×768
// com três meses por página, então vai a primeira frase de cada uma: o corte
// sempre no fim de uma frase, nunca no meio.
test('linhaDoMes: a primeira frase da narrativa da opção e a da carta', () => {
  // Arrange: o "R$ 1.500" tem ponto e não termina a frase.
  const mes = {
    opcao: { rotulo: 'Pegar emprestado', narrativa: 'Peguei R$ 1.500 no crédito pessoal e rodei até de madrugada. A dívida continua.' },
    carta: { titulo: 'Fratura', narrativa: 'Me acidentei e quebrei o punho. São 45 dias parado.' },
  };

  // Act / Assert
  assert.equal(V.historia.linhaDoMes(mes), 'Peguei R$ 1.500 no crédito pessoal e rodei até de madrugada. Me acidentei e quebrei o punho.');
});

test('linhaDoMes: sem narrativa de um dos lados, só a do outro; sem nenhuma, null', () => {
  assert.equal(V.historia.linhaDoMes({ opcao: { narrativa: 'Mantive a rotina' }, carta: { narrativa: null } }), 'Mantive a rotina');
  assert.equal(V.historia.linhaDoMes({ opcao: { narrativa: null }, carta: { narrativa: 'Nada fora do comum. E mesmo assim o mês não fechou.' } }), 'Nada fora do comum.');
  assert.equal(V.historia.linhaDoMes({ opcao: { narrativa: 'Parei! Perdi o dia.' }, carta: { narrativa: 'Choveu? Choveu.' } }), 'Parei! Choveu?');
  assert.equal(V.historia.linhaDoMes({ opcao: {}, carta: {} }), null);
  assert.equal(V.historia.linhaDoMes(null), null);
});

test('linhaDoMes: com as narrativas do config.json real, cada pedaço é uma frase inteira do começo da narrativa', () => {
  // Arrange: todas as combinações de opção e carta do conteúdo em validação.
  const r = V.validarConfig.validarTexto(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
  const opcoes = Object.values(r.config.rodadas).flatMap((rod) => Object.values(rod.opcoes));
  const cartas = Object.values(r.config.cartas);

  for (const opcao of opcoes) {
    for (const carta of cartas) {
      // Act
      const linha = V.historia.linhaDoMes({ opcao, carta });

      // Assert: um começo da narrativa da opção e um da carta, cada um
      // terminado em fim de frase.
      const cortes = [...linha.matchAll(/[.!?] /g)].map((m) => m.index + 1);
      const partido = cortes.some((k) => {
        const [daOpcao, daCarta] = [linha.slice(0, k), linha.slice(k + 1)];
        return opcao.narrativa.startsWith(daOpcao) && carta.narrativa.startsWith(daCarta) && /[.!?]$/.test(daCarta);
      });
      assert.ok(partido, `"${linha}"`);
    }
  }
});
