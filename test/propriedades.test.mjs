// Propriedades que valem em QUALQUER partida (arquitetura, seção 13): 1.000
// partidas com equipes, votos, prorrogações, decisões do apresentador e sementes
// ao acaso. O acaso do teste também vem do gerador com semente, para uma falha
// ser reproduzível: a mensagem traz o número da partida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarNucleo, RAIZ } from './carregar-nucleo.mjs';
import { lerConfigTeste, lerConfigTesteV2, normalizar } from './fixtures/configs.mjs';

const V = await carregarNucleo();
const M = V.motor;
const S = V.sorte;

const PARTIDAS = 1000;

// Nos dois configs de teste: o v2 tem básico, juros e consequências entre meses
// (decidiu/sorteou), e o histórico da equipe vai para o motor como no anfitrião.
// E no config.json real, que desde o esquema v2.2 tem o empréstimo como dívida:
// menos partidas, porque o placar dele enumera uma árvore de cartas bem maior.
const lerConfigReal = () => JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
for (const [nomeConfig, ler, partidas] of [
  ['config-teste', lerConfigTeste, PARTIDAS], ['config-teste-v2', lerConfigTesteV2, PARTIDAS], ['config.json', lerConfigReal, 60],
]) test(`${nomeConfig}: ${partidas} partidas ao acaso: limites respeitados, chances somando 1, placar coerente, nenhuma exceção`, () => {
  // Arrange
  const config = normalizar(V, ler());
  const acaso = S.gerador(20260928);
  const inteiro = (n) => Math.floor(acaso() * n);
  const escolher = (lista) => lista[inteiro(lista.length)];
  const uint32 = () => Math.floor(acaso() * 4294967296);

  for (let partida = 0; partida < partidas; partida++) {
    const onde = `partida ${partida}`;
    // O apresentador abre de 3 a 6 equipes (arquitetura, seção 8).
    const equipes = config.ordem.equipes.slice(0, 3 + inteiro(4));
    const estados = Object.fromEntries(equipes.map((e) => [e, M.estadoInicial(config, e)]));
    const historico = Object.fromEntries(equipes.map((e) => [e, []]));

    for (const rodadaId of config.ordem.rodadas) {
      const rodada = config.rodadas[rodadaId];
      const semente = uint32();
      for (const equipeId of equipes) {
        // Act: votos de 0 a 4 membros; às vezes o apresentador decide.
        const votos = {};
        for (let m = 0, n = inteiro(5); m < n; m++) votos['u' + m] = escolher(rodada.ordemOpcoes);
        const forcada = acaso() < 0.1 ? escolher(rodada.ordemOpcoes) : undefined;
        let c = M.consolidarDecisao(config, { rodadaId, votos, forcada, semente, equipeId });
        if (c.decisao === null) {
          // Prorrogação: metade das vezes alguém muda o voto, metade continua empatado.
          if (acaso() < 0.5) votos.extra = escolher(c.empate);
          c = M.consolidarDecisao(config, { rodadaId, votos, forcada, aposProrrogacao: true, semente, equipeId });
        }
        const feito = Object.fromEntries(historico[equipeId].map((h) => [h.rodadaId, { decisao: h.opcaoId, carta: h.cartaId }]));
        const r = M.resolverRodada(config, { equipeId, rodadaId, opcaoId: c.decisao, estado: estados[equipeId], semente, historico: feito });

        // Assert
        assert.ok(Object.hasOwn(rodada.opcoes, c.decisao), `${onde}: decisão inválida ${c.decisao}`);
        const somaChances = r.chances.reduce((s, x) => s + x.chance, 0);
        assert.ok(Math.abs(somaChances - 1) < 1e-9, `${onde}: chances somam ${somaChances}`);
        assert.ok(r.chances.every((x) => x.chance > 0), `${onde}: fatia de 0% na lista`);
        assert.ok(r.chances.some((x) => x.carta === r.carta), `${onde}: saiu carta fora das chances`);
        for (const ind of config.ordem.indicadores) {
          const { min, max } = config.indicadores[ind];
          const v = r.depois[ind];
          assert.ok(Number.isFinite(v) && v >= min && v <= max, `${onde}: ${ind} = ${v} fora de [${min}, ${max}]`);
        }
        // As contas do mês são o delta inteiro da renda (antes do limite): o
        // saldo do mês mais o que entrou de empréstimo, menos o que a parcela
        // abateu dele (esquema v2.2; sem empréstimo, os dois são 0).
        assert.equal(r.mes.saldoMes + r.mes.emprestimo - r.mes.amortizacao, r.delta.renda, `${onde}: saldoMes difere do delta da renda`);
        assert.equal(r.mes.entrou + r.mes.protecao - r.mes.gastos - r.mes.basico - r.mes.juros, r.mes.saldoMes, `${onde}: contas do mês não fecham`);
        // O saldo devedor do mês é o indicador do empréstimo, e as linhas de
        // cada indicador somam o delta dele.
        if (Object.hasOwn(r.depois, 'emprestimo')) assert.equal(r.mes.saldoDevedor, r.depois.emprestimo, `${onde}: saldo devedor difere do indicador`);
        for (const ind of config.ordem.indicadores) {
          const soma = r.linhas.filter((l) => l.indicador === ind).reduce((t, l) => t + l.valor, 0);
          assert.ok(Math.abs(soma - r.delta[ind]) < 1e-9, `${onde}: as linhas de ${ind} somam ${soma}, e o delta é ${r.delta[ind]}`);
        }
        historico[equipeId].push({ rodadaId, opcaoId: c.decisao, cartaId: r.carta });
        estados[equipeId] = r.depois;
      }
    }

    for (const equipeId of equipes) {
      const d = M.decompor(config, { equipeId, rodadas: historico[equipeId] });
      // O placar é o patrimônio: o caixa menos o empréstimo a pagar (v2.2).
      assert.equal(d.realizado, M.patrimonio(estados[equipeId]), `${onde}: realizado difere do estado final`);
      assert.ok(Math.abs(d.esperadoPiloto + d.efeitoDecisoes + d.sorte - d.realizado) < 1e-6, `${onde}: parcelas não somam o realizado`);
      assert.ok(d.piorCaso <= d.realizado + 1e-9, `${onde}: realizado abaixo do pior caso`);
      assert.ok(d.piorCaso <= d.esperadoComDecisoes + 1e-9, `${onde}: esperado abaixo do pior caso`);
    }
  }
});
