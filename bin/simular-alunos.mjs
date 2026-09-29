#!/usr/bin/env node
// Simulador de alunos (arquitetura, seção 12).
//
// Cada robô é um celular: usa o MESMO canal (canal-firebase.js com o SDK do npm,
// ou o canal-local no --memoria) e o MESMO aluno-logica.js do celular para
// decidir o que a tela mostra e o que tocar. Com --com-anfitriao, o simulador
// também é o telão, com o anfitriao.js real.
//
// Uso:
//   node bin/simular-alunos.mjs --memoria                 20 robôs sobre o canal-local, sem rede
//   node bin/simular-alunos.mjs --emulador --com-anfitriao --rapido [perturbações]
//   node bin/simular-alunos.mjs --sala K7Q2 --emulador     só alunos, numa sala aberta por um telão de verdade
//   node bin/simular-alunos.mjs --sala K7Q2 --sim-tenho-certeza   contra o projeto REAL (conexao.json)
//
// Opções: --alunos N (20) · --rapido · --roteiro 60min|120min · --semente N · --config caminho (config.json)
// Perturbações: --rajada · --quedas · --recargas · --derrubar-telao · --atacar
//
// O relatório confere, passo a passo, que os votos confirmados pelo servidor são
// exatamente os contados na apuração, que 100% dos ataques e 0% das escritas
// legítimas foram recusados, e que o placar recalculado pelo motor é o gravado.
// Qualquer violação encerra com código diferente de zero.
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { carregarNucleo, RAIZ } from '../test/carregar-nucleo.mjs';
import {
  PIN_EMULADOR, administrador, carregarCanalFirebase, carregarSdkNode, emuladorNoAr, novoCanalNoEmulador, rodarNoEmulador,
} from './emulador.mjs';

const V = await carregarNucleo();
const esperar = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const NEGADO = /PERMISSION_DENIED/;
// PIN só do simulador. No --memoria e no emulador ele é semeado aqui mesmo; no
// projeto real o PIN nunca sai do console, e por isso lá não há --com-anfitriao.
const PIN_SIMULADOR = PIN_EMULADOR;
// A versão que as regras aceitam em regrasVersao: o ataque de prioridade usa o
// valor certo, para a recusa vir só da prioridade.
const REGRAS_VERSAO = JSON.parse(readFileSync(join(RAIZ, 'firebase', 'regras.json'), 'utf8')).rules.regrasVersao.$uid['.validate'].match(/=== '([^']+)'/)[1];

// ---------- Opções ----------

function lerOpcoes(argv) {
  const o = {
    memoria: false, emulador: false, sala: null, comAnfitriao: false, rapido: false, alunos: 20, roteiro: '60min',
    rajada: false, quedas: false, recargas: false, derrubarTelao: false, atacar: false, simTenhoCerteza: false,
    semente: null, ajuda: false, config: null,
  };
  const flags = {
    '--memoria': 'memoria', '--emulador': 'emulador', '--com-anfitriao': 'comAnfitriao', '--rapido': 'rapido',
    '--rajada': 'rajada', '--quedas': 'quedas', '--recargas': 'recargas', '--derrubar-telao': 'derrubarTelao',
    '--atacar': 'atacar', '--sim-tenho-certeza': 'simTenhoCerteza', '--ajuda': 'ajuda', '-h': 'ajuda', '--help': 'ajuda',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (flags[a]) o[flags[a]] = true;
    else if (a === '--sala') o.sala = String(argv[++i] || '').toUpperCase();
    else if (a === '--alunos') o.alunos = Number(argv[++i]);
    else if (a === '--roteiro') o.roteiro = String(argv[++i]);
    else if (a === '--semente') o.semente = Number(argv[++i]);
    else if (a === '--config') o.config = String(argv[++i] || '');
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  if (!Number.isInteger(o.alunos) || o.alunos < 1 || o.alunos > 60) throw new Error('--alunos precisa ser inteiro de 1 a 60.');
  if (o.sala !== null && !/^[A-HJ-NP-Z2-9]{4}$/.test(o.sala)) throw new Error(`Código de sala inválido: "${o.sala}".`);
  if (o.memoria && (o.emulador || o.sala)) throw new Error('--memoria não combina com --emulador nem --sala.');
  // Sem sala dada, alguém precisa ser o telão: o próprio simulador.
  if (o.memoria || (o.emulador && !o.sala)) o.comAnfitriao = true;
  if (o.sala && o.comAnfitriao) throw new Error('--sala é só alunos (o telão é o de verdade); para o simulador ser o telão, omita --sala.');
  if (o.derrubarTelao && !o.comAnfitriao) throw new Error('--derrubar-telao precisa do --com-anfitriao.');
  // O --memoria é para rodar em segundos: tempos curtos sempre.
  if (o.memoria) o.rapido = true;
  return o;
}

const AJUDA = `Uso: node bin/simular-alunos.mjs (--memoria | --emulador [--sala CODIGO] | --sala CODIGO --sim-tenho-certeza)
  [--com-anfitriao] [--rapido] [--alunos N] [--roteiro 60min] [--semente N] [--config caminho]
  [--rajada] [--quedas] [--recargas] [--derrubar-telao] [--atacar]`;

// ---------- Aleatoriedade reproduzível ----------

function sorteador(semente) {
  const g = V.sorte.gerador(semente >>> 0);
  return {
    numero: g,
    entre: (a, b) => a + g() * (b - a),
    inteiro: (a, b) => a + Math.floor(g() * (b - a + 1)),
    um: (lista) => lista[Math.floor(g() * lista.length)],
    embaralhar(lista) {
      const c = [...lista];
      for (let i = c.length - 1; i > 0; i -= 1) {
        const j = Math.floor(g() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    },
  };
}

// ---------- Config ----------

// O config real, ou outro com --config (o teste do emulador usa a fixture v2,
// para não depender do config.json que está sendo reescrito). No --rapido, só
// os tempos encolhem (o conteúdo é o mesmo): a rajada vota "no último segundo" e
// o ataque fora do prazo espera o prazo passar, e com os 90 s reais o ensaio
// rápido levaria meia hora.
function carregarConfig(rapido, caminho) {
  const arquivo = caminho ? resolve(RAIZ, caminho) : join(RAIZ, 'config.json');
  const bruto = JSON.parse(readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''));
  if (rapido) bruto.tempos = { ...bruto.tempos, enqueteSeg: 5, decisaoSeg: 6, decisaoMinSeg: 1, prorrogacaoSeg: 4 };
  const r = V.validarConfig.validar(bruto);
  if (!r.ok) throw new Error(`${arquivo} inválido:\n` + r.erros.map((e) => `${e.caminho}: ${e.mensagem}`).join('\n'));
  return r.config;
}

// ---------- Ambientes: memória, emulador, projeto real ----------

function ambienteMemoria() {
  // No canal-local, marcadorDeHora() já é o número, e a trava confere
  // "entrouEm === agora" quando a escrita chega, um instante depois. Com o
  // Date.now puro, virar o milissegundo entre os dois recusava a entrada de um
  // robô de vez em quando. Aqui a hora fica parada até a próxima escrita (ou a
  // próxima volta do laço de eventos), como o "now" único de uma escrita no
  // servidor, e sempre anda pelo menos 1 ms: sem isso, tudo o que roda só em
  // microtarefas cairia no mesmo milissegundo, e quem entra depois de a decisão
  // abrir teria entrouEm === abertoEm (e votaria).
  let congelada = null;
  let ultima = 0;
  const relogio = () => {
    if (congelada === null) {
      congelada = Math.max(Date.now(), ultima + 1);
      ultima = congelada;
      setImmediate(() => { congelada = null; });
    }
    return congelada;
  };
  const base = V.canalLocal.criar({ relogio });
  base.importar({ privado: { pinApresentador: PIN_SIMULADOR } });
  const andarDepois = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } finally {
      congelada = null;
    }
  };
  let n = 0;
  return {
    nome: 'memória (canal-local com travas)',
    rede: 'memoria',
    soOnline: false,
    async novoCanal(rotulo) {
      n += 1;
      const c = base.comoUsuario(`${rotulo}-${n}`);
      return { ...c, gravar: andarDepois(c.gravar), transacao: andarDepois(c.transacao) };
    },
    async fechar() {},
  };
}

async function ambienteEmulador() {
  await administrador('PUT', 'privado/pinApresentador', PIN_SIMULADOR);
  const abertos = [];
  return {
    nome: 'emulador local (regras reais, demo-seminario)',
    rede: 'firebase',
    soOnline: true,
    async novoCanal(rotulo) {
      const c = await novoCanalNoEmulador(`sim-${rotulo}`);
      abertos.push(c);
      return c;
    },
    async fechar() {
      await Promise.all(abertos.map((c) => c.fechar().catch(() => {})));
    },
  };
}

function lerConexaoReal() {
  const caminho = join(RAIZ, 'conexao.json');
  if (!existsSync(caminho)) throw new Error('conexao.json não encontrado na raiz: é nele que ficam as chaves públicas do projeto real.');
  const dado = JSON.parse(readFileSync(caminho, 'utf8').replace(/^\uFEFF/, ''));
  const conexao = dado.firebase || dado;
  if (!conexao.apiKey || !conexao.databaseURL) throw new Error('conexao.json sem apiKey/databaseURL.');
  return conexao;
}

async function ambienteReal() {
  const [sdk, fabrica] = await Promise.all([carregarSdkNode(), carregarCanalFirebase()]);
  const conexao = lerConexaoReal();
  const abertos = [];
  let n = 0;
  return {
    nome: `projeto REAL (${conexao.projectId || conexao.databaseURL})`,
    rede: 'firebase',
    soOnline: true,
    async novoCanal(rotulo) {
      n += 1;
      const c = fabrica.criar({ sdk, conexao, nome: `sim-${rotulo}-${process.pid}-${n}` });
      abertos.push(c);
      return c;
    },
    async fechar() {
      await Promise.all(abertos.map((c) => c.fechar().catch(() => {})));
    },
  };
}

function avisoProjetoReal() {
  const linha = '!'.repeat(78);
  console.error([
    linha,
    '!!  ATENÇÃO: o simulador vai rodar contra o PROJETO REAL do Firebase.',
    '!!',
    '!!  O login anônimo tem limite de 100 contas novas por HORA por IP. Cada',
    '!!  execução cria de 20 a 25 contas; com 4 execuções a cota do IP acaba, e',
    '!!  NINGUÉM mais daquela rede entra na sala até a hora virar.',
    '!!',
    '!!  NUNCA rode na rede da aula nem no dia da aula (AGENTS.md, regra 6).',
    '!!  Para testar, use --emulador.',
    '!!',
    '!!  Para seguir mesmo assim, acrescente --sim-tenho-certeza.',
    linha,
  ].join('\n'));
}

// ---------- Métricas ----------

function percentil(lista, p) {
  if (lista.length === 0) return null;
  const o = [...lista].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)];
}

function criarMetricas() {
  return {
    // chave do passo ("enquete entrada/antes", "rodada r1") → contagens
    passos: new Map(),
    confirmacaoMs: [],
    reconexaoMs: [],
    legitimasRecusadas: [],
    tardias: [],
    legitimasEnviadas: 0,
    ataques: [],
    violacoes: [],
    passo(chave) {
      if (!this.passos.has(chave)) this.passos.set(chave, { enviados: 0, confirmados: new Map(), contados: null });
      return this.passos.get(chave);
    },
  };
}

// ---------- A rede de cada robô ----------

// Queda do celular: no Firebase, goOffline de verdade (o SDK guarda a escrita
// na fila, só em memória, e reenvia ao voltar); no canal-local, uma porteira
// que segura a escrita até a volta.
function criarRede(tipo, canal) {
  let porteira = null;
  let abrir = null;
  return {
    get fora() {
      return porteira !== null;
    },
    cair() {
      if (porteira) return;
      porteira = new Promise((r) => { abrir = r; });
      if (tipo === 'firebase') canal.desconectar();
    },
    async voltar() {
      if (!porteira) return 0;
      const t0 = performance.now();
      if (tipo === 'firebase') {
        const conectou = new Promise((r) => {
          const desligar = canal.aoMudarConexao((ok) => {
            if (ok) {
              desligar();
              r();
            }
          });
        });
        canal.reconectar();
        await conectou;
      }
      abrir();
      porteira = null;
      return performance.now() - t0;
    },
    async gravar(mapa) {
      if (tipo === 'memoria' && porteira) await porteira;
      return canal.gravar(mapa);
    },
  };
}

// ---------- O robô (um celular) ----------

function criarRobo({ indice, amb, sala, conteudoPrevisto, opcoes, metricas, rng, papel }) {
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const robo = {
    nome: `robô ${String(indice).padStart(2, '0')}`,
    uid: null, canal: null, rede: null,
    papel, // { nuncaVota, quedaEm, recargaEm, abandonaEm }
    ativo: false, encerrado: false,
    estado: null, conteudo: conteudoPrevisto,
    meusVotos: {}, pendentes: 0, reagindo: false, agendado: false, esperandoAtraso: false,
    feitos: new Set(), acoesVoto: 0, desligarEstado: null, pulsoPresenca: null,
    geracaoTratada: 0,
  };

  const agoraServidor = () => robo.canal.agora();

  function atrasoVoto(prazo) {
    if (opcoes.rajada && typeof prazo === 'number') {
      // "20 votos no último segundo" (seção 12): antes do prazo, pela hora do servidor.
      return prazo - rng.entre(150, 900) - agoraServidor();
    }
    // Esperas de 1 a 40 s (seção 12); no --rapido, 40 vezes mais curtas.
    const fator = opcoes.memoria ? 1 / 400 : opcoes.rapido ? 1 / 40 : 1;
    return rng.entre(1000, 40000) * fator;
  }

  async function presenca() {
    try {
      await robo.rede.gravar({ [s('presenca', robo.uid)]: robo.canal.marcadorDeHora() });
    } catch {
      // Presença é sinal de vida, não voto: uma recusa aqui (membro removido)
      // não é conferida no relatório.
    }
  }

  async function entrar() {
    robo.canal = await amb.novoCanal(`robo${indice}`);
    robo.rede = criarRede(amb.rede, robo.canal);
    robo.uid = await robo.canal.entrar();
    try {
      await robo.rede.gravar({ [s('membros', robo.uid)]: { entrouEm: robo.canal.marcadorDeHora() } });
    } catch (erro) {
      metricas.legitimasRecusadas.push({ quem: robo.nome, oque: 'entrar na sala', motivo: erro.message });
      robo.encerrado = true;
      return;
    }
    metricas.legitimasEnviadas += 1;
    await presenca();
    // A presença a cada 20 s: o telão conta como ativo quem apareceu no último minuto.
    robo.pulsoPresenca = setInterval(presenca, 20000);
    robo.pulsoPresenca.unref?.();
    ligarOuvinte();
    robo.ativo = true;
  }

  function ligarOuvinte() {
    robo.desligarEstado = robo.canal.ouvir(s('estado'), (estado) => {
      robo.estado = estado;
      agendar();
    }, () => {});
  }

  function agendar(ms = 0) {
    if (robo.agendado || robo.encerrado) return;
    robo.agendado = true;
    setTimeout(() => {
      robo.agendado = false;
      reagir();
    }, ms);
  }

  // Recarregar a página: a tela some, os ouvintes caem, o SDK reconecta e tudo
  // é lido de novo. O uid continua (no navegador, o SDK o guarda no IndexedDB),
  // e os votos do aparelho também (o voto pendente fica no localStorage).
  async function recarregar() {
    robo.desligarEstado?.();
    if (amb.rede === 'firebase') {
      const t0 = performance.now();
      const conectou = new Promise((r) => {
        const d = robo.canal.aoMudarConexao((ok) => {
          if (ok) {
            d();
            r();
          }
        });
      });
      robo.canal.reconectar();
      await conectou;
      metricas.reconexaoMs.push(performance.now() - t0);
    }
    robo.estado = null;
    ligarOuvinte();
  }

  // O robô que "abandona o uid e volta com outro" (aba anônima, troca de
  // navegador): uma conta nova, que entra depois de a decisão abrir e por isso
  // não vota nela (red team, falha 5). O uid antigo continua membro.
  async function abandonarUid() {
    robo.desligarEstado?.();
    clearInterval(robo.pulsoPresenca);
    robo.feitos.clear();
    robo.meusVotos = {};
    robo.papel.abandonaEm = null;
    await entrar();
  }

  async function votar(chavePasso, caminho, valor, aoConfirmar) {
    const passo = metricas.passo(chavePasso);
    passo.enviados += 1;
    metricas.legitimasEnviadas += 1;
    robo.pendentes += 1;
    const t0 = performance.now();
    const geracao = robo.estado?.geracao;
    try {
      await robo.rede.gravar({ [caminho]: valor });
      metricas.confirmacaoMs.push(performance.now() - t0);
      // Um por aparelho e por folha: reenviar (recarga, prorrogação) não conta duas vezes.
      passo.confirmados.set(caminho, robo.uid);
      aoConfirmar();
    } catch (erro) {
      const registroRecusa = { quem: robo.nome, oque: caminho.replace(robo.uid, '{uid}'), motivo: String(erro.message) };
      // O telão fechou a etapa enquanto o voto viajava: é a recusa que o celular
      // explica ("a votação fechou antes do seu voto chegar"), não um defeito. O
      // aviso do estado novo chega antes da recusa (o servidor manda em ordem).
      if (NEGADO.test(registroRecusa.motivo) && robo.estado?.geracao !== geracao) metricas.tardias.push(registroRecusa);
      else metricas.legitimasRecusadas.push(registroRecusa);
    } finally {
      robo.pendentes -= 1;
      agendar();
    }
  }

  async function perturbar(momento) {
    if (robo.papel.recargaEm === momento) {
      robo.papel.recargaEm = null;
      await recarregar();
      return true;
    }
    if (robo.papel.quedaEm === momento) {
      robo.papel.quedaEm = null;
      robo.rede.cair();
      const dur = opcoes.memoria ? rng.entre(50, 300) : opcoes.rapido ? rng.entre(500, 3000) : rng.entre(5000, 40000);
      setTimeout(async () => {
        const ms = await robo.rede.voltar();
        if (amb.rede === 'firebase') metricas.reconexaoMs.push(ms);
        agendar();
      }, dur);
    }
    return false;
  }

  async function reagir() {
    if (robo.reagindo) {
      agendar(20);
      return;
    }
    const estado = robo.estado;
    if (!estado || robo.encerrado) return;
    robo.reagindo = true;
    try {
      if (!robo.conteudo) robo.conteudo = await robo.canal.ler(s('conteudo'));
      const membros = (await robo.canal.ler(s('membros'))) || {};
      const membro = membros[robo.uid] ?? null;
      let decisoesDaEquipe = null;
      if (estado.tipo === 'rodada' && membro?.equipe) decisoesDaEquipe = await robo.canal.ler(s('decisoes', estado.rodada, membro.equipe));
      const tela = V.alunoLogica.telaDoAluno({
        conteudo: robo.conteudo, estado, membro, membros, meusVotos: robo.meusVotos, decisoesDaEquipe,
        resultados: null, placar: null, uid: robo.uid, agora: agoraServidor(),
      });
      await agir(tela, estado, membros, membro);
      robo.geracaoTratada = Math.max(robo.geracaoTratada, estado.geracao);
    } catch (erro) {
      // Sem conexão (queda maior que a espera do ler) ou ouvinte cancelado:
      // tenta de novo, como o celular faz ao voltar a conexão.
      if (!robo.encerrado) agendar(300);
      if (!/SEM_CONEXAO/.test(String(erro?.message))) console.error(`${robo.nome}: ${erro?.message}`);
    } finally {
      robo.reagindo = false;
    }
  }

  async function agir(tela, estado, membros) {
    const d = tela.dados;
    if (tela.tipo === 'escolherEquipe' && !d.minha && !robo.papel.nuncaVota) {
      const chave = `equipe|${estado.geracao}`;
      if (robo.feitos.has(chave)) return;
      robo.feitos.add(chave);
      // De propósito, a última equipe aberta não é escolhida por ninguém: só o
      // telão põe alguém lá (o robô que nunca vota), e ela joga no piloto.
      const abertas = Object.keys(estado.equipesAbertas || {});
      const semAUltima = abertas.length > 1 ? Object.fromEntries(abertas.slice(0, -1).map((e) => [e, true])) : estado.equipesAbertas;
      const eq = V.alunoLogica.sugerirEquipe(robo.conteudo, { membros, equipesAbertas: semAUltima });
      if (!eq) return;
      try {
        await robo.rede.gravar({ [s('membros', robo.uid, 'equipe')]: eq });
        metricas.legitimasEnviadas += 1;
      } catch (erro) {
        metricas.legitimasRecusadas.push({ quem: robo.nome, oque: 'escolher equipe', motivo: erro.message });
      }
      return;
    }
    if (tela.tipo === 'enquete' && !robo.papel.nuncaVota) {
      const a = d.afirmacao.id;
      const chave = `enq|${d.enquete.id}|${d.momento}|${a}`;
      if (robo.feitos.has(chave)) return;
      robo.feitos.add(chave);
      robo.acoesVoto += 1;
      if (await perturbar(robo.acoesVoto)) {
        robo.feitos.delete(chave);
        return;
      }
      // Perfis: "antes" puxando para 4, "depois" para 2 (seção 12).
      const centro = d.momento === 'antes' ? 4 : d.momento === 'depois' ? 2 : rng.inteiro(1, 5);
      const valor = Math.min(5, Math.max(1, centro + rng.um([-1, 0, 0, 0, 1])));
      robo.esperandoAtraso = true;
      await esperar(atrasoVoto(d.prazo));
      robo.esperandoAtraso = false;
      // A pessoa demorou e a tela mudou (o telão encerrou ou foi para a próxima
      // afirmação): o botão sumiu, e o toque não acontece.
      if (robo.estado?.geracao !== estado.geracao) {
        robo.feitos.delete(chave);
        return;
      }
      const caminho = s('votosEnquete', d.enquete.id, d.momento, a, robo.uid);
      votar(`enquete ${d.enquete.id}/${d.momento}`, caminho, valor, () => {
        ((robo.meusVotos[d.enquete.id] ||= {})[d.momento] ||= {})[a] = valor;
      });
      return;
    }
    if ((tela.tipo === 'decisao' || tela.tipo === 'prorrogacao') && d.podeVotar && !robo.papel.nuncaVota) {
      const equipe = (membros[robo.uid] || {}).equipe;
      const chave = `${tela.tipo}|${d.rodada.id}`;
      if (robo.feitos.has(chave)) return;
      if (tela.tipo === 'decisao' && d.meuVoto) return;
      robo.feitos.add(chave);
      robo.acoesVoto += 1;
      if (robo.papel.abandonaEm === d.rodada.id && tela.tipo === 'decisao') {
        // Vota com o uid antigo (esse voto conta) e depois abandona o aparelho.
        const opcao = rng.um(d.opcoes).id;
        const caminho = s('decisoes', d.rodada.id, equipe, robo.uid);
        await votar(`rodada ${d.rodada.id}`, caminho, opcao, () => {});
        await abandonarUid();
        return;
      }
      if (await perturbar(robo.acoesVoto)) {
        robo.feitos.delete(chave);
        return;
      }
      robo.esperandoAtraso = true;
      await esperar(atrasoVoto(d.prazo));
      robo.esperandoAtraso = false;
      // A pessoa demorou e a tela mudou (o telão encerrou ou foi para a próxima
      // afirmação): o botão sumiu, e o toque não acontece.
      if (robo.estado?.geracao !== estado.geracao) {
        robo.feitos.delete(chave);
        return;
      }
      const opcao = rng.um(d.opcoes).id;
      votar(`rodada ${d.rodada.id}`, s('decisoes', d.rodada.id, equipe, robo.uid), opcao, () => {});
    }
  }

  robo.entrar = entrar;
  robo.agendar = agendar;
  // Parado = não tem nada a fazer para o estado atual: já leu, já votou, a
  // escrita foi confirmada ou recusada e a rede está de pé.
  robo.parado = (geracao) => robo.encerrado || !robo.ativo
    || (!robo.reagindo && !robo.agendado && !robo.esperandoAtraso && robo.pendentes === 0 && !robo.rede.fora && robo.geracaoTratada >= geracao);
  robo.encerrar = () => {
    robo.encerrado = true;
    robo.desligarEstado?.();
    clearInterval(robo.pulsoPresenca);
  };
  return robo;
}

// ---------- Os ataques (seção 12, e os achados de 28/09) ----------

function criarAtacante({ amb, sala, metricas, pedirDistribuicao, opcoes }) {
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const at = { canal: null, uid: null, intruso: null, tardio: null, fases: new Set(), ocupado: false, estado: null, desligar: null, vitima: null };

  async function tentar(grupo, nome, fn, { soOnline = false, porque = 'offline não tem PIN: o canal-local cria sala sem ele' } = {}) {
    if (soOnline && !amb.soOnline) {
      metricas.ataques.push({ grupo, nome, resultado: 'n/a', detalhe: porque });
      return;
    }
    try {
      await fn();
      metricas.ataques.push({ grupo, nome, resultado: 'aceito' });
      metricas.violacoes.push(`ataque ACEITO: ${nome}`);
    } catch (erro) {
      const recusado = NEGADO.test(String(erro?.message));
      metricas.ataques.push({ grupo, nome, resultado: recusado ? 'recusado' : 'erro', detalhe: String(erro?.message).slice(0, 90) });
      if (!recusado) metricas.violacoes.push(`ataque com erro inesperado (não provou a recusa): ${nome}: ${erro?.message}`);
    }
  }

  const blob = 'x'.repeat(100_000);
  const SEM_PRIORIDADE = 'offline não há prioridade: o canal-local recusa a chave ao gravar';

  async function faseLobby() {
    const c = at.canal;
    const i = at.intruso;
    const outraSala = `salas/${'Z'}${String.fromCharCode(65 + (Date.now() % 8))}${'KMNP'[Date.now() % 4]}${'2345'[Date.now() % 4]}`;
    await tentar('anfitrião e PIN', 'criar sala sem PIN', () => i.canal.gravar({ [`${outraSala}/meta`]: { hostUid: i.uid } }), { soOnline: true });
    await tentar('anfitrião e PIN', 'tomar o anfitrião sem PIN', () => i.canal.gravar({ [s('meta', 'hostUid')]: i.uid }));
    await i.canal.gravar({ [`pedidosAnfitriao/${i.uid}`]: 'pin-errado-00000' });
    await tentar('anfitrião e PIN', 'tomar o anfitrião com PIN errado', () => i.canal.gravar({ [s('meta', 'hostUid')]: i.uid }));
    await i.canal.gravar({ [`pedidosAnfitriao/${i.uid}`]: null });
    await tentar('lixo grande', 'blob em pedidosAnfitriao (100 KB)', () => i.canal.gravar({ [`pedidosAnfitriao/${i.uid}`]: blob }));
    await tentar('lixo grande', 'objeto em pedidosAnfitriao', () => i.canal.gravar({ [`pedidosAnfitriao/${i.uid}`]: { a: blob } }));
    await tentar('lixo grande', 'blob em presenca (100 KB)', () => c.gravar({ [s('presenca', at.uid)]: blob }));
    await tentar('lixo grande', 'presença de quem não é membro', () => i.canal.gravar({ [s('presenca', i.uid)]: i.canal.marcadorDeHora() }));
    // Revisão da F2, achado 1: um valor solto no lugar do nó do membro não tem
    // filhos, e só o .validate do próprio nó o barra.
    await tentar('lixo grande', 'texto de 100 KB no lugar do nó do membro', () => c.gravar({ [s('membros', at.uid)]: blob }));
    await tentar('lixo grande', 'número no lugar do nó do membro', () => c.gravar({ [s('membros', at.uid)]: 42 }));
    await tentar('lixo grande', 'true no lugar do nó do membro', () => i.canal.gravar({ [s('membros', i.uid)]: true }));
    // Achado 2: a prioridade é um valor de tamanho livre ao lado do nó. O
    // canal-local não representa prioridade (recusa a chave), por isso é só online.
    const comPrioridade = (valor) => ({ '.value': valor, '.priority': blob });
    await tentar('lixo grande', 'prioridade de 100 KB em pedidosAnfitriao', () => i.canal.gravar({ [`pedidosAnfitriao/${i.uid}`]: comPrioridade('um pin qualquer') }), { soOnline: true, porque: SEM_PRIORIDADE });
    await tentar('lixo grande', 'prioridade de 100 KB em regrasVersao', () => i.canal.gravar({ [`regrasVersao/${i.uid}`]: comPrioridade(REGRAS_VERSAO) }), { soOnline: true, porque: SEM_PRIORIDADE });
    await tentar('lixo grande', 'prioridade de 100 KB na presença', () => c.gravar({ [s('presenca', at.uid)]: comPrioridade(c.marcadorDeHora()) }), { soOnline: true, porque: SEM_PRIORIDADE });
    await tentar('lixo grande', 'prioridade de 100 KB no nó do membro', () => c.gravar({ [s('membros', at.uid)]: { entrouEm: c.marcadorDeHora(), '.priority': blob } }), { soOnline: true, porque: SEM_PRIORIDADE });
    await tentar('lixo grande', 'prioridade de 100 KB na entrouEm', () => c.gravar({ [s('membros', at.uid)]: { entrouEm: comPrioridade(c.marcadorDeHora()) } }), { soOnline: true, porque: SEM_PRIORIDADE });
    await tentar('entrouEm e membro', 'forjar entrouEm (10 min atrás)', () => c.gravar({ [s('membros', at.uid, 'entrouEm')]: c.agora() - 600_000 }));
    await tentar('entrouEm e membro', 'entrar com entrouEm forjado', () => i.canal.gravar({ [s('membros', i.uid)]: { entrouEm: 1 } }));
    await tentar('entrouEm e membro', 'dado pessoal no membro', () => c.gravar({ [s('membros', at.uid, 'nome')]: 'Ana' }));
    await tentar('entrouEm e membro', 'membro em nome de outro uid', () => i.canal.gravar({ [s('membros', at.uid)]: { entrouEm: i.canal.marcadorDeHora() } }));
    const est = await c.ler(s('estado'));
    await tentar('nós do telão', 'escrever no estado', () => c.gravar({ [s('estado')]: { ...est, geracao: est.geracao + 1, tipo: 'fim' } }));
    await tentar('nós do telão', 'escrever nos resultados', () => c.gravar({ [s('resultados', 'r1')]: { e1: { carta: 'x' } } }));
    await tentar('nós do telão', 'escrever a semente', () => c.gravar({ [s('sementes', 'r1')]: 1 }));
    // D-035: marcar a rodada como já prorrogada tiraria dela a prorrogação.
    await tentar('nós do telão', 'marcar a prorrogação de uma rodada', () => c.gravar({ [s('prorrogacoes', 'r1')]: true }));
    await tentar('nós do telão', 'escrever o placar', () => c.gravar({ [s('placar', 'e1', 'renda')]: 999999 }));
    await tentar('nós do telão', 'escrever no conteúdo', () => c.gravar({ [s('conteudo', 'titulo')]: 'x' }));
    await tentar('nós do telão', 'fechar a entrada (meta)', () => c.gravar({ [s('meta', 'entradaAberta')]: false }));
    await tentar('nós do telão', 'escrever o pulso', () => c.gravar({ [s('pulso')]: c.marcadorDeHora() }));
    await tentar('nós do telão', 'apagar a sala', () => c.gravar({ [`salas/${sala}`]: null }));
    await tentar('nós do telão', 'nó desconhecido na sala', () => c.gravar({ [s('lixo')]: 1 }));
    await tentar('regras', 'escrever no autoteste', () => c.gravar({ [`autoteste/${at.uid}`]: true }));
    await tentar('regras', 'regrasVersao de outra versão', () => c.gravar({ [`regrasVersao/${at.uid}`]: 'v0-velha' }));
    await tentar('regras', 'escrever o PIN', () => c.gravar({ 'privado/pinApresentador': 'meu-pin-novo-123' }));
    await tentar('leitura', 'ler o PIN', () => c.ler('privado/pinApresentador'));
    await tentar('leitura', 'ler os pedidos de anfitrião', () => c.ler('pedidosAnfitriao'));
    await tentar('leitura', 'ler a sala inteira', () => c.ler(`salas/${sala}`));
    await tentar('leitura', 'ler a presença', () => c.ler(s('presenca')));
    await tentar('leitura', 'ler as sementes', () => c.ler(s('sementes')));
    await tentar('leitura', 'ler as marcas de prorrogação', () => c.ler(s('prorrogacoes')));
  }

  async function faseEnquete(e) {
    const c = at.canal;
    const afirm = e.afirmacao !== '*' ? e.afirmacao : Object.keys((await c.ler(s('conteudo', 'enquetes', e.enquete, 'afirmacoes'))) || {})[0];
    const voto = (v, dono = at.uid, a = afirm) => () => c.gravar({ [s('votosEnquete', e.enquete, e.momento, a, dono)]: v });
    for (const v of [0, 6, 2.5, '5']) await tentar('valor inválido', `voto ${JSON.stringify(v)}`, voto(v));
    if (at.vitima) await tentar('identidade', 'voto de enquete em nome de outro uid', voto(3, at.vitima));
    await tentar('valor inválido', 'afirmação inexistente', voto(3, at.uid, 'nao_existe'));
    await tentar('identidade', 'voto de quem não é membro', () => at.intruso.canal.gravar({ [s('votosEnquete', e.enquete, e.momento, afirm, at.intruso.uid)]: 3 }));
    if (at.vitima) await tentar('leitura', 'ler o voto de outro aluno', () => c.ler(s('votosEnquete', e.enquete, e.momento, afirm, at.vitima)));
    await tentar('leitura', 'ler os votos da afirmação', () => c.ler(s('votosEnquete', e.enquete, e.momento, afirm)));
    at.ultimaEnquete = { enquete: e.enquete, momento: e.momento, afirm };
  }

  async function faseEnqueteFechada() {
    const u = at.ultimaEnquete;
    await tentar('fora da janela', 'votar com a enquete já fechada', () => at.canal.gravar({ [s('votosEnquete', u.enquete, u.momento, u.afirm, at.uid)]: 3 }));
  }

  // Achado 3: gravar só a equipe, sem registro de membro, criava um membro sem
  // entrouEm (e sem passar pela entrada), que depois registrava presença e votava.
  async function faseFormar(e) {
    const eq = Object.keys(e.equipesAbertas || {})[0];
    if (!eq) return;
    const i = at.intruso;
    await tentar('entrouEm e membro', 'virar membro gravando só a equipe', () => i.canal.gravar({ [s('membros', i.uid, 'equipe')]: eq }));
    await tentar('entrouEm e membro', 'equipe com prioridade de 100 KB', () => at.canal.gravar({ [s('membros', at.uid, 'equipe')]: { '.value': eq, '.priority': blob } }), { soOnline: true, porque: SEM_PRIORIDADE });
  }

  async function faseTrava() {
    const c = at.canal;
    const m = await c.ler(s('membros', at.uid));
    if (!m?.equipe) {
      metricas.ataques.push({ grupo: 'equipe', nome: 'troca de equipe depois da trava', resultado: 'n/a', detalhe: 'o atacante ficou sem equipe' });
      return;
    }
    const conteudo = await c.ler(s('conteudo', 'ordem', 'equipes'));
    const outra = Object.values(conteudo || {}).find((x) => x !== m.equipe);
    at.equipe = m.equipe;
    at.outraEquipe = outra;
    await tentar('equipe', 'trocar de equipe depois da trava', () => c.gravar({ [s('membros', at.uid, 'equipe')]: outra }));
    await tentar('equipe', 'trocar de equipe gravando o nó inteiro (achado 15)', () => c.gravar({ [s('membros', at.uid)]: { entrouEm: m.entrouEm, equipe: outra } }));
    await tentar('equipe', 'nó inteiro com entrouEm nova e outra equipe', () => c.gravar({ [s('membros', at.uid)]: { entrouEm: c.marcadorDeHora(), equipe: outra } }));
    await tentar('equipe', 'sair da equipe depois da trava', () => c.gravar({ [s('membros', at.uid, 'equipe')]: null }));
  }

  async function faseRodada(e) {
    const c = at.canal;
    if (!at.equipe) return;
    const r = e.rodada;
    const opcoes0 = lista(await c.ler(s('conteudo', 'rodadas', r, 'ordemOpcoes')));
    at.opcaoValida = opcoes0[0];
    const decidir = (quem, eq, op, dono = quem.uid) => () => quem.canal.gravar({ [s('decisoes', r, eq, dono)]: op });
    const eu = { canal: c, uid: at.uid };
    await tentar('identidade', 'decidir por outra equipe', decidir(eu, at.outraEquipe, at.opcaoValida));
    if (at.vitima) {
      const eqVitima = (await c.ler(s('membros', at.vitima, 'equipe'))) || at.equipe;
      await tentar('identidade', 'decidir em nome de outro uid', decidir(eu, eqVitima, at.opcaoValida, at.vitima));
    }
    await tentar('valor inválido', 'opção inexistente', decidir(eu, at.equipe, 'zz'));
    await tentar('valor inválido', 'opção fora do formato', decidir(eu, at.equipe, 'A B'));
    // Uid novo (aba anônima): entra agora, sem equipe, e tenta votar na equipe dos outros.
    const t = at.tardio;
    await t.canal.gravar({ [s('membros', t.uid)]: { entrouEm: t.canal.marcadorDeHora() } });
    await tentar('identidade', 'uid novo vota em outra equipe', decidir(t, at.equipe, at.opcaoValida));
    await tentar('equipe', 'uid novo escolhe equipe depois da trava', () => t.canal.gravar({ [s('membros', t.uid, 'equipe')]: at.equipe }));
    // O telão distribui quem chega; com equipe, o tardio ainda não vota nesta decisão.
    await pedirDistribuicao();
    let eqTardio = null;
    for (let k = 0; k < 50 && !eqTardio; k += 1) {
      eqTardio = await t.canal.ler(s('membros', t.uid, 'equipe'));
      if (!eqTardio) await esperar(100);
    }
    if (eqTardio) await tentar('fora da janela', 'entrar numa decisão já aberta e votar', decidir(t, eqTardio, at.opcaoValida));
    else metricas.ataques.push({ grupo: 'fora da janela', nome: 'entrar numa decisão já aberta e votar', resultado: 'n/a', detalhe: 'o telão não distribuiu o atrasado a tempo' });
    await tentar('leitura', 'ler a decisão de outra equipe', () => c.ler(s('decisoes', r, at.outraEquipe)));
    await tentar('leitura', 'ler as decisões da rodada inteira', () => c.ler(s('decisoes', r)));
    await tentar('leitura', 'ler a semente', () => c.ler(s('sementes', r)));
    await tentar('nós do telão', 'apagar a marca de prorrogação da rodada', () => c.gravar({ [s('prorrogacoes', r)]: null }));
    await tentar('leitura', 'ler a marca de prorrogação da rodada', () => c.ler(s('prorrogacoes', r)));
  }

  // Com a prorrogação aberta, a marca já existe (vai no mesmo update do estado).
  // Apagada, o desfazer seguido de novo empate abriria outra prorrogação (D-035).
  async function faseProrrogacao(e) {
    const c = at.canal;
    await tentar('nós do telão', 'apagar a marca da prorrogação aberta', () => c.gravar({ [s('prorrogacoes', e.rodada)]: null }));
    await tentar('nós do telão', 'regravar a marca da prorrogação aberta', () => c.gravar({ [s('prorrogacoes', e.rodada)]: true }));
  }

  async function faseForaDoPrazo(e) {
    if (!at.equipe || typeof e.prazo !== 'number') return;
    const graca = ((await at.canal.ler(s('conteudo', 'tempos', 'gracaSeg'))) || 0) * 1000;
    const espera = e.prazo + graca + 800 - at.canal.agora();
    await esperar(espera);
    const agora = await at.canal.ler(s('estado'));
    if (agora?.geracao !== e.geracao) {
      metricas.ataques.push({ grupo: 'fora da janela', nome: 'decidir depois do prazo + graça', resultado: 'n/a', detalhe: 'a decisão fechou antes do prazo' });
      return;
    }
    await tentar('fora da janela', 'decidir depois do prazo + graça', () => at.canal.gravar({ [s('decisoes', e.rodada, at.equipe, at.uid)]: at.opcaoValida }));
  }

  // As fases disparam pelo estado que o atacante vê, como um aluno mal
  // intencionado faria. Com --com-anfitriao, o telão espera o atacante parar.
  async function rodarFases(e) {
    if (at.ocupado || !e) return;
    at.ocupado = true;
    try {
      if (!at.fases.has('lobby')) {
        at.fases.add('lobby');
        await faseLobby();
      }
      if (e.tipo === 'enquete' && e.subfase === 'votando' && !at.fases.has('enquete')) {
        at.fases.add('enquete');
        await faseEnquete(e);
      }
      if (at.fases.has('enquete') && !at.fases.has('enqueteFechada') && !(e.tipo === 'enquete' && e.subfase === 'votando')) {
        at.fases.add('enqueteFechada');
        await faseEnqueteFechada();
      }
      if (e.tipo === 'formarEquipes' && !e.equipesTravadas && !at.fases.has('formar')) {
        at.fases.add('formar');
        await faseFormar(e);
      }
      if (e.equipesTravadas && !at.fases.has('trava')) {
        at.fases.add('trava');
        await faseTrava();
      }
      if (e.tipo === 'rodada' && e.subfase === 'decidindo' && at.fases.has('trava') && !at.fases.has('rodada')) {
        at.fases.add('rodada');
        await faseRodada(e);
        at.fases.add('foraDoPrazo');
        await faseForaDoPrazo(e);
      }
      if (e.tipo === 'rodada' && e.subfase === 'prorrogacao' && !at.fases.has('prorrogacao')) {
        at.fases.add('prorrogacao');
        await faseProrrogacao(e);
      }
    } finally {
      at.ocupado = false;
      if (at.estado && at.estado !== e) rodarFases(at.estado);
    }
  }

  at.entrar = async (vitima) => {
    at.vitima = vitima;
    at.canal = await amb.novoCanal('atacante');
    at.uid = await at.canal.entrar();
    const intruso = await amb.novoCanal('intruso');
    at.intruso = { canal: intruso, uid: await intruso.entrar() };
    const tardio = await amb.novoCanal('tardio');
    at.tardio = { canal: tardio, uid: await tardio.entrar() };
    await at.canal.gravar({ [s('membros', at.uid)]: { entrouEm: at.canal.marcadorDeHora() } });
    await at.canal.gravar({ [s('presenca', at.uid)]: at.canal.marcadorDeHora() });
    at.desligar = at.canal.ouvir(s('estado'), (e) => {
      at.estado = e;
      // No formar equipes, o atacante escolhe uma equipe como qualquer aluno (é o
      // que dá a ele os ataques de equipe e de decisão depois).
      if (e?.tipo === 'formarEquipes' && !e.equipesTravadas && !at.escolheu) {
        at.escolheu = true;
        const eq = Object.keys(e.equipesAbertas || {})[0];
        if (eq) at.canal.gravar({ [s('membros', at.uid, 'equipe')]: eq }).catch(() => {});
      }
      rodarFases(e);
    }, () => {});
  };
  at.parado = () => !at.ocupado;
  at.encerrar = () => at.desligar?.();
  at.opcoes = opcoes;
  return at;
}

// ---------- O telão simulado (--com-anfitriao) ----------

async function criarTelao(amb, config, sala, opcoes, uidsTelao) {
  const canal = await amb.novoCanal('telao');
  const uid = await canal.entrar();
  uidsTelao.push(uid);
  // O PIN digitado no telão antes de projetar (arquitetura, seção 6).
  await canal.gravar({ [`pedidosAnfitriao/${uid}`]: PIN_SIMULADOR });
  const anf = V.anfitriao.criar({
    canal, config, sala, nomeRoteiro: opcoes.roteiro,
    // Fora do núcleo, a semente vem do gerador do sistema, como no telão
    // (crypto.getRandomValues).
    gerarSemente: () => randomInt(0, 0xFFFFFFFF),
  });
  return { canal, anf };
}

async function conduzirSessao({ amb, config, sala, opcoes, robos, atacante, metricas, uidsTelao, registro, ref }) {
  let telao = await criarTelao(amb, config, sala, opcoes, uidsTelao);
  ref.telao = telao;
  await telao.anf.criarSala();
  const passos = V.roteiro.passos(config, opcoes.roteiro);
  const abertoEm = {};
  const pausa = (ms) => esperar(opcoes.memoria ? Math.min(ms, 20) : opcoes.rapido ? Math.min(ms, 150) : ms);

  // O telão espera os celulares terminarem o que têm a fazer para o estado atual
  // (voto confirmado ou recusado, rede de pé): assim o "enviados = confirmados =
  // contados" mede a regra, e não a pressa do simulador.
  async function esperarRobos(rotulo) {
    const g = telao.anf.estado()?.geracao ?? 0;
    const limite = performance.now() + (opcoes.rapido ? 90_000 : 180_000);
    while (performance.now() < limite) {
      if (robos.every((r) => r.parado(g)) && (!atacante || atacante.parado())) return;
      await esperar(opcoes.memoria ? 5 : 40);
    }
    metricas.violacoes.push(`tempo esgotado esperando os robôs em "${rotulo}"`);
  }

  await Promise.all(robos.map(async (r, i) => {
    await esperar(i * (opcoes.memoria ? 1 : 15));
    await r.entrar();
  }));
  if (atacante) await atacante.entrar(robos.find((r) => r.ativo)?.uid);
  await esperarRobos('lobby');
  registro(`sala ${sala} criada; ${robos.filter((r) => r.ativo).length} robôs entraram`);

  let derrubou = false;
  for (let volta = 0; volta < 400; volta += 1) {
    const e = telao.anf.estado();
    const passo = passos[e.indice];
    const rotulo = `${e.indice} ${e.tipo}${e.rodada ? ' ' + e.rodada : ''}${e.enquete ? ' ' + e.enquete + '/' + (e.momento || '') : ''} · ${e.subfase}`;
    if (e.tipo === 'fim') break;

    if (e.subfase === 'votando' || e.subfase === 'decidindo' || e.subfase === 'prorrogacao') {
      if (e.tipo === 'rodada' && e.subfase === 'decidindo') {
        abertoEm[e.rodada] = e.abertoEm;
        // Tempo mínimo de conversa (D-010): no --rapido, 1 s.
        await pausa(config.tempos.decisaoMinSeg * 1000);
      }
      await esperarRobos(rotulo);
      if (opcoes.derrubarTelao && !derrubou && e.tipo === 'rodada' && e.subfase === 'decidindo' && e.rodada === lista(config.ordem.rodadas)[1]) {
        // O notebook trava no meio da decisão: outro telão assume com o PIN.
        derrubou = true;
        if (amb.rede === 'firebase') await telao.canal.fechar();
        telao = await criarTelao(amb, config, sala, opcoes, uidsTelao);
        ref.telao = telao;
        const t0 = performance.now();
        await telao.anf.carregarSala();
        registro(`telão derrubado em "${rotulo}": outro assumiu com o PIN em ${Math.round(performance.now() - t0)} ms`);
      }
      const ordem = e.tipo === 'enquete' ? lista(config.enquetes[e.enquete].ordemAfirmacoes) : [];
      if (e.tipo === 'enquete' && e.afirmacao !== '*' && ordem.indexOf(e.afirmacao) + 1 < ordem.length) {
        await telao.anf.avancar(); // próxima afirmação (uma_por_vez)
        continue;
      }
      await telao.anf.encerrar();
      registro(`encerrado: ${rotulo} → ${telao.anf.estado().subfase}`);
      continue;
    }

    if (e.tipo === 'formarEquipes' && !e.equipesTravadas) {
      await telao.anf.definirEquipesAbertas(lista(config.ordem.equipes));
      await esperarRobos(rotulo);
    } else if (e.tipo === 'lobby') {
      await esperarRobos(rotulo);
    }
    // Quem entrou (ou voltou com outro uid) ganha equipe pelo telão.
    if (e.equipesTravadas) await telao.anf.distribuirAtrasados();
    await pausa(e.subfase === 'sorteio' || e.subfase === 'resultado' ? 10_000 : (passo.alvoSeg || 0) * 1000);
    await esperarRobos(rotulo);
    await telao.anf.avancar();
  }
  registro(`sessão chegou ao fim (${telao.anf.estado().tipo})`);
  return { telao, abertoEm };
}

function lista(x) {
  if (Array.isArray(x)) return x;
  return x && typeof x === 'object' ? Object.values(x) : [];
}

// ---------- Conferência final ----------

// O RTDB devolve as chaves em ordem alfabética; o motor, na ordem do config.
// Dentro de lista também: o deAntes é uma lista de objetos ({ rotulo, valor,
// gasto }), e sem isto a ordem das chaves do RTDB acusava divergência.
const canonico = (x) => {
  if (Array.isArray(x)) return x.map(canonico);
  return x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonico(x[k])])) : x;
};
const mesmoValor = (a, b) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

// O placar e os resultados recalculados pelo motor, do zero, a partir do que
// está no banco: decisões, membros e sementes. É a apuração reproduzível (I4)
// conferida por fora do anfitrião.
async function conferirApuracao({ canal, config, sala, opcoes, abertoEm, metricas }) {
  const M = V.motor;
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const [resultados, placar, sementes, decisoes, membros, prorrogacoes] = await Promise.all(['resultados', 'placar', 'sementes', 'decisoes', 'membros', 'prorrogacoes'].map((n) => canal.ler(s(n))));
  const passosRodada = V.roteiro.passos(config, opcoes.roteiro).filter((p) => p.tipo === 'rodada');
  const equipes = lista(config.ordem.equipes);
  const jogadas = Object.fromEntries(equipes.map((eq) => [eq, []]));
  const estado = Object.fromEntries(equipes.map((eq) => [eq, M.estadoInicial(config, eq)]));
  let conferidas = 0;
  for (const p of passosRodada) {
    const r = p.rodada;
    const doRodada = resultados?.[r];
    if (!doRodada) continue;
    for (const [eq, res] of Object.entries(doRodada)) {
      // Contagem refeita com o mesmo filtro da apuração: membro da equipe e
      // entrou antes de a decisão abrir.
      const contagem = Object.fromEntries(lista(config.rodadas[r].ordemOpcoes).map((o) => [o, 0]));
      for (const [u, op] of Object.entries(decisoes?.[r]?.[eq] || {})) {
        const m = membros?.[u];
        if (m && m.equipe === eq && typeof m.entrouEm === 'number' && m.entrouEm <= abertoEm[r] && Object.hasOwn(contagem, op)) contagem[op] += 1;
      }
      if (JSON.stringify(contagem) !== JSON.stringify(Object.fromEntries(Object.keys(contagem).map((o) => [o, res.contagem?.[o] ?? 0])))) {
        metricas.violacoes.push(`contagem de ${r}/${eq} difere: gravada ${JSON.stringify(res.contagem)}, recontada ${JSON.stringify(contagem)}`);
      }
      // Prorrogação e moeda só existem depois de uma prorrogação aberta, e ela
      // grava a marca no mesmo update (D-035). Sem a marca, um desfazer abriria outra.
      if ((res.origem === 'prorrogacao' || res.origem === 'moeda') && prorrogacoes?.[r] !== true) {
        metricas.violacoes.push(`${r}/${eq}: origem "${res.origem}" sem a marca prorrogacoes/${r}`);
      }
      const total = Object.values(contagem).reduce((a, b) => a + b, 0);
      if (res.origem === 'piloto' && (total !== 0 || res.decisao !== config.rodadas[r].padrao)) metricas.violacoes.push(`${r}/${eq}: piloto com votos ou fora do padrão`);
      if (res.origem === 'maioria') {
        const max = Math.max(...Object.values(contagem));
        if (contagem[res.decisao] !== max || Object.values(contagem).filter((v) => v === max).length !== 1) metricas.violacoes.push(`${r}/${eq}: "maioria" que não é maioria`);
      }
      // O histórico da equipe (decidiu/sorteou, D-043): as rodadas anteriores
      // do roteiro que têm resultado, como o anfitrião faz.
      const anteriores = passosRodada.slice(0, passosRodada.indexOf(p)).map((q) => q.rodada);
      const historico = M.historicoDe(resultados, eq, anteriores);
      const esperado = M.resolverRodada(config, { equipeId: eq, rodadaId: r, opcaoId: res.decisao, estado: estado[eq], semente: sementes?.[r], historico });
      // A mensagem diz qual campo divergiu: quando só o cartaCusto diferia, ela
      // dizia "o motor dá X, e está gravado X", com a mesma carta, e enganava o
      // diagnóstico (revisão de 29/09, 2ª rodada, achado 8). O deAntes só é
      // gravado quando há (o RTDB apaga lista vazia): ausente vale [].
      const divergentes = [
        esperado.carta !== res.carta ? `carta (motor ${esperado.carta}, gravado ${res.carta})` : null,
        !mesmoValor(esperado.depois, res.depois) ? 'depois' : null,
        !mesmoValor(esperado.mes, res.mes) ? 'mes' : null,
        !mesmoValor(esperado.cartaCusto, res.cartaCusto) ? 'cartaCusto' : null,
        !mesmoValor(esperado.deAntes, lista(res.deAntes)) ? 'deAntes' : null,
      ].filter(Boolean);
      if (divergentes.length > 0) {
        metricas.violacoes.push(`${r}/${eq}: o motor com a semente gravada difere do gravado em ${divergentes.join(', ')}`);
      }
      estado[eq] = esperado.depois;
      jogadas[eq].push({ rodadaId: r, opcaoId: res.decisao, cartaId: res.carta });
      conferidas += 1;
    }
  }
  let placarOk = true;
  for (const eq of equipes) {
    const d = M.decompor(config, { equipeId: eq, rodadas: jogadas[eq] });
    const g = placar?.[eq];
    const esperado = { ...estado[eq], piloto: d.esperadoPiloto, efeitoDecisoes: d.efeitoDecisoes, sorte: d.sorte, piorCaso: d.piorCaso };
    for (const [k, v] of Object.entries(esperado)) {
      if (Math.abs((g?.[k] ?? NaN) - v) > 1e-9) {
        placarOk = false;
        metricas.violacoes.push(`placar ${eq}.${k}: gravado ${g?.[k]}, recalculado ${v}`);
      }
    }
  }
  return { conferidas, placarOk };
}

// Confirmados × contados, passo a passo, lidos do que o aluno pode ler.
async function fecharPassos({ canal, sala, metricas }) {
  const s = (...partes) => ['salas', sala, ...partes].join('/');
  const [enquetes, resultados] = await Promise.all([canal.ler(s('enquetes')), canal.ler(s('resultados'))]);
  for (const [chave, p] of metricas.passos) {
    const [tipo, alvo] = chave.split(' ');
    if (tipo === 'enquete') {
      const [e, m] = alvo.split('/');
      const n = enquetes?.[e]?.[m]?.n;
      p.contados = n ? Object.values(n).reduce((a, b) => a + b, 0) : null;
    } else {
      const res = resultados?.[alvo];
      p.contados = res ? Object.values(res).reduce((t, r) => t + Object.values(r.contagem || {}).reduce((a, b) => a + b, 0), 0) : null;
    }
  }
}

// ---------- Relatório ----------

function imprimirRelatorio({ metricas, opcoes, amb, duracaoMs, conferencia, registroLinhas }) {
  const L = (...x) => console.log(...x);
  const tab = (linhas, larguras) => linhas.forEach((l) => L('  ' + l.map((c, i) => String(c).padEnd(larguras[i])).join(' │ ')));
  L('');
  L('═'.repeat(78));
  L(` Simulador de alunos · ${amb.nome}`);
  L(` ${opcoes.alunos} robôs · roteiro ${opcoes.roteiro} · ${opcoes.rapido ? 'tempos curtos (--rapido)' : 'tempos reais do config'} · ${Math.round(duracaoMs / 1000)} s`);
  const perturb = ['rajada', 'quedas', 'recargas', 'derrubarTelao', 'atacar'].filter((k) => opcoes[k]);
  L(` perturbações: ${perturb.length ? perturb.join(', ') : 'nenhuma'}`);
  L('═'.repeat(78));
  for (const linha of registroLinhas) L('  · ' + linha);
  L('');
  L(' Votos por passo');
  const linhas = [['passo', 'enviados', 'confirmados', 'contados', 'ok']];
  for (const [chave, p] of metricas.passos) {
    const confirmados = p.confirmados.size;
    const ok = p.contados === confirmados;
    if (!ok) metricas.violacoes.push(`${chave}: ${confirmados} confirmados, ${p.contados ?? 'sem apuração'} contados`);
    linhas.push([chave, p.enviados, confirmados, p.contados ?? '—', ok ? 'ok' : 'VIOLAÇÃO']);
  }
  tab(linhas, [26, 8, 11, 8, 8]);
  L('');
  L(' Escritas recusadas');
  L(`  legítimas: ${metricas.legitimasRecusadas.length} de ${metricas.legitimasEnviadas} (${metricas.legitimasEnviadas ? ((100 * metricas.legitimasRecusadas.length) / metricas.legitimasEnviadas).toFixed(1) : '0.0'}%; tem de ser 0%)`);
  if (metricas.tardias.length > 0) {
    L(`  tardias: ${metricas.tardias.length} (a etapa fechou antes de o voto chegar; o celular mostra "a votação fechou")`);
    // Com o simulador no papel do telão, ele espera todos os celulares antes de
    // encerrar: aí uma recusa tardia não tem explicação.
    if (opcoes.comAnfitriao) for (const r of metricas.tardias) metricas.violacoes.push(`recusa tardia com o telão esperando: ${r.quem} ${r.oque}`);
  }
  for (const r of metricas.legitimasRecusadas) {
    L(`    ${r.quem} · ${r.oque} · ${r.motivo}`);
    metricas.violacoes.push(`escrita legítima recusada: ${r.quem} ${r.oque}`);
  }
  if (metricas.ataques.length > 0) {
    const grupos = new Map();
    for (const a of metricas.ataques) {
      const g = grupos.get(a.grupo) || { total: 0, recusados: 0, na: 0 };
      g.total += 1;
      if (a.resultado === 'recusado') g.recusados += 1;
      if (a.resultado === 'n/a') g.na += 1;
      grupos.set(a.grupo, g);
    }
    const validos = metricas.ataques.filter((a) => a.resultado !== 'n/a');
    const recusados = validos.filter((a) => a.resultado === 'recusado').length;
    L(`  ataques: ${recusados} de ${validos.length} recusados (${validos.length ? ((100 * recusados) / validos.length).toFixed(1) : '—'}%; tem de ser 100%)`);
    const lg = [['motivo (grupo)', 'recusados', 'total', 'n/a']];
    for (const [g, v] of grupos) lg.push([g, v.recusados, v.total - v.na, v.na]);
    tab(lg, [22, 9, 5, 3]);
    for (const a of metricas.ataques.filter((x) => x.resultado !== 'recusado')) L(`    ${a.resultado.toUpperCase()} · ${a.nome}${a.detalhe ? ' · ' + a.detalhe : ''}`);
  } else if (opcoes.atacar) {
    metricas.violacoes.push('--atacar sem nenhum ataque executado');
  }
  L('');
  const ms = (x) => (x === null ? '—' : `${Math.round(x)} ms`);
  L(` Confirmação do voto: p50 ${ms(percentil(metricas.confirmacaoMs, 50))} · p95 ${ms(percentil(metricas.confirmacaoMs, 95))} (${metricas.confirmacaoMs.length} votos)`);
  L(` Reconexão:           p50 ${ms(percentil(metricas.reconexaoMs, 50))} · p95 ${ms(percentil(metricas.reconexaoMs, 95))} (${metricas.reconexaoMs.length} ciclos${amb.rede === 'memoria' ? '; sem rede no --memoria' : ''})`);
  if (conferencia) {
    L(` Conferência final: ${conferencia.conferidas} resultados refeitos pelo motor com as sementes gravadas; placar recalculado ${conferencia.placarOk ? '=== gravado' : 'DIFERENTE do gravado'}`);
  } else {
    L(' Conferência final: só com --com-anfitriao (o aluno não lê as sementes).');
  }
  L('');
  if (metricas.violacoes.length === 0) {
    L(' RESULTADO: 0 violações.');
  } else {
    L(` RESULTADO: ${metricas.violacoes.length} VIOLAÇÃO(ÕES):`);
    for (const v of [...new Set(metricas.violacoes)]) L('   - ' + v);
  }
  L('═'.repeat(78));
}

// ---------- Principal ----------

function papeis(n, opcoes, rng, config) {
  const lista0 = Array.from({ length: n }, () => ({ nuncaVota: false, quedaEm: null, recargaEm: null, abandonaEm: null }));
  const ordem = rng.embaralhar([...Array(n).keys()]);
  // De propósito (seção 12): um robô nunca vota; um abandona o uid e volta com outro.
  if (n >= 3) lista0[ordem[0]].nuncaVota = true;
  const rodadas = lista(config.ordem.rodadas);
  if (n >= 3 && opcoes.recargas && rodadas.length > 0) lista0[ordem[1]].abandonaEm = rodadas[0];
  let k = 2;
  const pegar = (frac) => Math.max(1, Math.round(n * frac));
  // A n-ésima ação de voto do robô em que a perturbação acontece (1 a 6).
  if (opcoes.quedas) for (let i = 0; i < pegar(0.15) && k < n; i += 1, k += 1) lista0[ordem[k]].quedaEm = rng.inteiro(1, 6);
  if (opcoes.recargas) for (let i = 0; i < pegar(0.10) && k < n; i += 1, k += 1) lista0[ordem[k]].recargaEm = rng.inteiro(1, 6);
  return lista0;
}

async function principal(argv) {
  let opcoes;
  try {
    opcoes = lerOpcoes(argv);
  } catch (erro) {
    console.error(erro.message + '\n' + AJUDA);
    return 2;
  }
  if (opcoes.ajuda || (!opcoes.memoria && !opcoes.emulador && !opcoes.sala)) {
    console.log(AJUDA);
    return opcoes.ajuda ? 0 : 2;
  }
  const real = Boolean(opcoes.sala) && !opcoes.emulador;
  if (real && !opcoes.simTenhoCerteza) {
    avisoProjetoReal();
    return 2;
  }
  if (real) avisoProjetoReal();
  // Sem o emulador no ar, sobe um só para esta execução e roda dentro dele.
  if (opcoes.emulador && !(await emuladorNoAr())) {
    const args = argv.map((a) => (/^[\w.-]+$/.test(a) ? a : JSON.stringify(a))).join(' ');
    return rodarNoEmulador(`node bin/simular-alunos.mjs ${args}`);
  }

  const semente = Number.isInteger(opcoes.semente) ? opcoes.semente : randomInt(0, 2 ** 31);
  const rng = sorteador(semente);
  const config = carregarConfig(opcoes.rapido, opcoes.config);
  const amb = opcoes.memoria ? ambienteMemoria() : opcoes.emulador ? await ambienteEmulador() : await ambienteReal();
  const sala = opcoes.sala || rng.um(['T', 'U', 'V', 'X']) + Array.from({ length: 3 }, () => rng.um([...'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'])).join('');
  if (opcoes.emulador && !opcoes.sala) await administrador('DELETE', `salas/${sala}`);
  const metricas = criarMetricas();
  const registroLinhas = [`semente do simulador: ${semente} (repita com --semente ${semente})`];
  const registro = (t) => registroLinhas.push(t);
  const conteudoPrevisto = opcoes.comAnfitriao ? config : null;
  const roles = papeis(opcoes.alunos, opcoes, rng, config);
  const robos = roles.map((papel, i) => criarRobo({ indice: i, amb, sala, conteudoPrevisto, opcoes, metricas, rng, papel }));
  const uidsTelao = [];
  let atacante = null;
  let telao = null;
  let abertoEm = {};
  // O telão atual (muda no --derrubar-telao): o atacante pede a ele para
  // distribuir o aluno que chegou atrasado, como o telão real faz.
  const ref = { telao: null };
  const t0 = performance.now();
  let conferencia = null;
  try {
    if (opcoes.comAnfitriao) {
      atacante = opcoes.atacar ? criarAtacante({ amb, sala, metricas, opcoes, pedirDistribuicao: () => ref.telao?.anf.distribuirAtrasados() }) : null;
      const resultado = await conduzirSessao({ amb, config, sala, opcoes, robos, atacante, metricas, uidsTelao, registro, ref }).catch((erro) => {
        metricas.violacoes.push(`a sessão parou: ${erro.message}`);
        return null;
      });
      if (resultado) {
        telao = resultado.telao;
        abertoEm = resultado.abertoEm;
        await fecharPassos({ canal: telao.canal, sala, metricas });
        conferencia = await conferirApuracao({ canal: telao.canal, config, sala, opcoes, abertoEm, metricas });
        const totais = await telao.anf.exportarTotais();
        const texto = JSON.stringify(totais);
        const vazou = robos.filter((r) => r.uid && texto.includes(r.uid)).length;
        if (vazou > 0) metricas.violacoes.push(`${vazou} uid(s) na exportação de totais`);
        await telao.anf.apagarSala();
        registro('exportação só com totais; sala apagada no fim (D-015)');
      }
    } else {
      // Só alunos, numa sala aberta pelo telão de verdade: segue até o "fim".
      atacante = opcoes.atacar ? criarAtacante({ amb, sala, metricas, opcoes, pedirDistribuicao: async () => {} }) : null;
      await Promise.all(robos.map(async (r, i) => {
        await esperar(i * 30);
        await r.entrar();
      }));
      if (atacante) await atacante.entrar(robos.find((r) => r.ativo)?.uid);
      registro(`${robos.filter((r) => r.ativo).length} robôs entraram na sala ${sala}; esperando o telão chegar ao "fim"`);
      const qualquer = robos.find((r) => r.ativo);
      if (!qualquer) throw new Error('nenhum robô conseguiu entrar (sala inexistente ou entrada fechada)');
      while (!qualquer.estado || qualquer.estado.tipo !== 'fim') await esperar(500);
      await esperar(1500);
      await fecharPassos({ canal: qualquer.canal, sala, metricas });
    }
  } catch (erro) {
    metricas.violacoes.push(`erro: ${erro.message}`);
  } finally {
    for (const r of robos) r.encerrar();
    atacante?.encerrar();
  }
  imprimirRelatorio({ metricas, opcoes, amb, duracaoMs: performance.now() - t0, conferencia, registroLinhas });
  await amb.fechar();
  return metricas.violacoes.length === 0 ? 0 : 1;
}

const codigo = await principal(process.argv.slice(2));
// O SDK deixa timers vivos mesmo depois de fechar os apps: sai explicitamente.
process.exit(codigo);
