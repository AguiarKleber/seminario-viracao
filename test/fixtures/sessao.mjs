// Uma sala de teste sobre o canal-local: anfitrião, relógio controlado e alunos
// simulados, cada um com a própria visão do banco (comoUsuario). É o mesmo
// arranjo do simulador --memoria, só que dirigido passo a passo pelo teste.
import { lerConfigTeste, normalizar } from './configs.mjs';

export const SALA = 'K7Q2';
export const HOST = 'host-uid';
export const T0 = 1_000_000;

// O config-teste.json normalizado, mais as narrativas em primeira pessoa que o
// celular mostra nos blocos (o arquivo de teste não as tem).
export function configDaSessao(V) {
  const bruto = lerConfigTeste();
  for (const r of bruto.rodadas) {
    for (const op of Array.isArray(r.opcoes) ? r.opcoes : Object.values(r.opcoes)) op.narrativa = `Escolhi: ${op.rotulo}.`;
  }
  for (const c of bruto.cartas) c.narrativa = `Aconteceu: ${c.titulo}.`;
  return normalizar(V, bruto);
}

export function montarSessao(V, { travas = true, roteiro = '60min', config = configDaSessao(V), sementes = [123456789] } = {}) {
  let t = T0;
  const relogio = { agora: () => t, passar: (ms) => { t += ms; } };
  const canal = V.canalLocal.criar({ travas, relogio: relogio.agora });
  const host = canal.comoUsuario(HOST);
  const fila = [...sementes];
  const geradas = [];
  const anf = V.anfitriao.criar({
    canal: host, config, sala: SALA, nomeRoteiro: roteiro, agora: relogio.agora, uid: HOST,
    gerarSemente: () => {
      const s = fila.length > 0 ? fila.shift() : 42;
      geradas.push(s);
      return s;
    },
  });
  const passos = V.roteiro.passos(config, roteiro);
  const indiceDe = (tipo, extra = {}) => passos.findIndex((p) => p.tipo === tipo && Object.entries(extra).every(([k, v]) => p[k] === v));
  return { canal, host, anf, relogio, config, geradas, passos, indiceDe, novoAluno: (uid) => novoAluno(canal, relogio, uid) };
}

export function novoAluno(canal, relogio, uid) {
  const c = canal.comoUsuario(uid);
  const s = (...partes) => ['salas', SALA, ...partes].join('/');
  return {
    uid,
    canal: c,
    entrar: () => c.gravar({ [s('membros', uid)]: { entrouEm: c.marcadorDeHora() } }),
    presenca: () => c.gravar({ [s('presenca', uid)]: c.marcadorDeHora() }),
    escolher: (equipe) => c.gravar({ [s('membros', uid, 'equipe')]: equipe }),
    votar: (enquete, momento, afirmacao, valor) => c.gravar({ [s('votosEnquete', enquete, momento, afirmacao, uid)]: valor }),
    decidir: (rodada, equipe, opcao) => c.gravar({ [s('decisoes', rodada, equipe, uid)]: opcao }),
    membro: () => c.ler(s('membros', uid)),
    // Tudo o que o celular leria para desenhar a tela, pelas próprias permissões.
    async entradaDaTela(enquetesVotadas = []) {
      const [conteudo, estado, membros, resultados, placar, meta] = await Promise.all(
        ['conteudo', 'estado', 'membros', 'resultados', 'placar', 'meta'].map((p) => c.ler(s(p))),
      );
      const membro = membros?.[uid] ?? null;
      const meusVotos = {};
      for (const [e, m] of enquetesVotadas) {
        const enq = conteudo.enquetes[e];
        for (const a of Object.keys(enq.afirmacoes)) {
          const v = await c.ler(s('votosEnquete', e, m, a, uid));
          if (v !== null) ((meusVotos[e] ||= {})[m] ||= {})[a] = v;
        }
      }
      const decisoesDaEquipe = estado?.rodada && membro?.equipe ? await c.ler(s('decisoes', estado.rodada, membro.equipe)) : null;
      return { conteudo, estado, membro, membros, meusVotos, decisoesDaEquipe, resultados, placar, meta, uid, agora: relogio.agora() };
    },
  };
}

// Espera todas as microtarefas pendentes (os avisos do ouvir).
export const esperarAvisos = () => new Promise((resolver) => setImmediate(resolver));
