// O anfitrião no esquema v2: passa ao motor o histórico da equipe (decidiu /
// sorteou das rodadas anteriores, na ordem do roteiro) e grava as contas do mês
// (mes) em resultados/{r}/{eq}, que é de onde o celular lê (ele não carrega o motor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarNucleo } from './carregar-nucleo.mjs';
import { montarSessao, SALA } from './fixtures/sessao.mjs';
import { lerConfigTesteV2, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const s = (...partes) => ['salas', SALA, ...partes].join('/');

test('rodadas com consequência entre meses: o anfitrião passa o histórico e grava o mes', async () => {
  // Arrange: a e5 pega o empréstimo no mês 1; a e2 fica no padrão. Todas as
  // decisões pelo apresentador, para o teste não depender de votos.
  const config = normalizar(V, lerConfigTesteV2());
  const sessao = montarSessao(V, { config, sementes: [111, 222, 333] });
  const { anf, host, relogio, indiceDe } = sessao;
  await anf.criarSala();
  await anf.pularPara(indiceDe('formarEquipes'));
  await anf.definirEquipesAbertas(['e2', 'e5']);
  await anf.avancar();
  relogio.passar(1000);
  await anf.avancar();
  const plano = { r1: { e2: 'c', e5: 'd' }, r2: { e2: 'a', e5: 'c' }, r3: { e2: 'b', e5: 'b' } };

  // Act
  for (const r of ['r1', 'r2', 'r3']) {
    if (r !== 'r1') {
      await anf.pularPara(indiceDe('rodada', { rodada: r }));
    }
    for (const [eq, op] of Object.entries(plano[r])) await anf.decidirPorEquipe(eq, op);
    await anf.encerrar();
  }

  // Assert: cada resultado gravado é o do motor com o histórico da equipe.
  const resultados = await host.ler(s('resultados'));
  const sementes = await host.ler(s('sementes'));
  for (const eq of ['e2', 'e5']) {
    let estado = V.motor.estadoInicial(config, eq);
    const historico = {};
    const jogadas = [];
    for (const r of ['r1', 'r2', 'r3']) {
      const esperado = V.motor.resolverRodada(config, { equipeId: eq, rodadaId: r, opcaoId: plano[r][eq], estado, semente: sementes[r], historico });
      const gravado = resultados[r][eq];
      assert.equal(gravado.carta, esperado.carta, `${r}/${eq}: carta`);
      assert.deepEqual(gravado.depois, esperado.depois, `${r}/${eq}: depois`);
      assert.deepEqual(gravado.mes, esperado.mes, `${r}/${eq}: mes`);
      // O que veio dos meses anteriores vai gravado para o celular (que não
      // carrega o motor); lista vazia não é gravada (o RTDB a apagaria).
      assert.deepEqual(gravado.deAntes ?? [], esperado.deAntes, `${r}/${eq}: deAntes`);
      if (esperado.deAntes.length === 0) assert.equal(Object.hasOwn(gravado, 'deAntes'), false, `${r}/${eq}: deAntes vazio fica de fora`);
      historico[r] = { decisao: plano[r][eq], carta: esperado.carta };
      jogadas.push({ rodadaId: r, opcaoId: plano[r][eq], cartaId: esperado.carta });
      estado = esperado.depois;
    }
    const placar = await host.ler(s('placar', eq));
    const d = V.motor.decompor(config, { equipeId: eq, rodadas: jogadas });
    assert.equal(placar.renda, estado.renda);
    assert.ok(Math.abs(placar.sorte - d.sorte) < 1e-9);
  }
  // A parcela do empréstimo chegou no mês 2 da e5: o trabalho dela no mês 2 é
  // 600 menor do que seria sem o empréstimo, com a mesma carta.
  const semEmprestimo = V.motor.aplicar(config, {
    equipeId: 'e5', rodadaId: 'r2', opcaoId: 'c', cartaId: resultados.r2.e5.carta,
    estado: resultados.r1.e5.depois, historico: { r1: { decisao: 'c', carta: resultados.r1.e5.carta } },
  });
  assert.ok(resultados.r2.e5.mes.trabalho < semEmprestimo.mes.trabalho, 'a parcela pesou no mês 2');
  assert.equal(resultados.r1.e5.mes.basico, 1800);
  assert.deepEqual(resultados.r2.e5.deAntes, [{ rotulo: 'parcela do empréstimo', valor: -600 }], 'a parcela é consequência do mês 1');
});
