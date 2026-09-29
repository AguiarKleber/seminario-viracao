// O anfitrião: o juiz da sessão. Só ele escreve o estado, abre e fecha as
// etapas, apura enquetes e rodadas e grava resultados e placar (contratos seção 7).
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. Sem DOM e sem rede direta: tudo passa pelo
// canal injetado, e hora e semente também chegam de fora. Assim o mesmo código
// roda no telão online, no offline, no simulador e nos testes.
//
// Nada aqui usa timer. O telão fica escondido atrás dos slides (Alt+Tab, D-007),
// e o navegador estrangula os timers de aba escondida: um fechamento por timer
// dispararia minutos depois, ou nunca. O prazo é gravado só para a regra do banco
// cortar o voto atrasado e para o cronômetro visual; quem encerra é o
// apresentador (D-010).
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  const DOZE_HORAS_MS = 12 * 60 * 60 * 1000;
  // "Membros ativos: presença nos últimos 60 s" (arquitetura seção 10).
  const ATIVO_MS = 60 * 1000;
  const RE_SALA = /^[A-HJ-NP-Z2-9]{4}$/;
  // Etapas em que o celular ainda escreve: não se sai delas sem apurar.
  const ABERTAS = new Set(['votando', 'decidindo', 'prorrogacao']);

  const N = () => raiz.Viracao; // o outro módulo é buscado na hora da chamada

  function lista(x) {
    if (Array.isArray(x)) return x;
    return x && typeof x === 'object' ? Object.values(x) : [];
  }

  const tem = (mapa, id) => Boolean(mapa) && typeof id === 'string' && Object.hasOwn(mapa, id);

  function criar(opcoes) {
    const { canal, config, sala, nomeRoteiro, gerarSemente, aoMudar, versaoApp } = opcoes;
    if (!RE_SALA.test(String(sala))) throw new Error(`Código de sala inválido: "${sala}".`);
    if (typeof gerarSemente !== 'function') throw new TypeError('gerarSemente é obrigatório: a semente nunca sai do núcleo.');
    const agora = opcoes.agora || (() => canal.agora());
    const passos = N().roteiro.passos(config, nomeRoteiro);
    const indiceFormar = passos.findIndex((p) => p.tipo === 'formarEquipes');
    const passosRodada = passos.filter((p) => p.tipo === 'rodada');
    const ordemEquipes = lista(config.ordem.equipes);
    const base = 'salas/' + sala;
    let uid = opcoes.uid || null;
    let atual = null;
    // O "fechando" do desfazer da abertura (D-037), guardado só na memória desta
    // janela: { geracao, subfase, pausado, restante }. Se a rede cai depois dele,
    // o estado no banco é igual ao de um fechamento comum; com a marca, o telão
    // diz "Desfazendo a abertura…" (e não "Apurando…"), o Ctrl+Z seguinte retoma
    // o desfazer em vez de reabrir, e o Enter pede confirmação. Não vai ao banco
    // porque o estado tem $outro: false (seriam regras novas); depois de
    // recarregar, o "fechando" volta a ser tratado como um fechamento comum.
    let marcaDesfazer = null;

    const cam = (...partes) => [base, ...partes].join('/');

    function avisar() {
      if (aoMudar) aoMudar(atual);
    }

    function exigirEstado() {
      if (!atual) throw new Error('Sala não carregada: chame criarSala() ou carregarSala().');
      return atual;
    }

    // Toda transição de um nó só passa aqui: compare-and-swap na geracao. Se outra
    // janela (ou outra máquina) mudou o estado, a transação aborta, o estado
    // conhecido é atualizado e nada é gravado por cima.
    async function transicionar(montar) {
      const esperado = exigirEstado();
      const r = await canal.transacao(cam('estado'), (srv) => {
        if (!srv || srv.geracao !== esperado.geracao) return undefined;
        return { ...montar(srv), geracao: srv.geracao + 1 };
      });
      atual = r.valor;
      avisar();
      if (!r.confirmado) throw new Error('CONFLITO: o estado da sala mudou em outra janela. A tela foi atualizada; confira e repita.');
      return atual;
    }

    // Estado mais resultados/placar/enquetes num único update. A regra (e a trava
    // do canal-local) exige geracao + 1: se outro escritor passou na frente, a
    // gravação inteira é recusada, e nada fica pela metade.
    async function gravarComEstado(novo, extras) {
      const anterior = exigirEstado();
      const estado = { ...novo, geracao: anterior.geracao + 1 };
      try {
        await canal.gravar({ [cam('estado')]: estado, ...extras });
      } catch (erro) {
        atual = (await canal.ler(cam('estado'))) || atual;
        avisar();
        throw erro;
      }
      atual = estado;
      avisar();
      return atual;
    }

    function todasAsEquipes() {
      const mapa = {};
      for (const id of ordemEquipes) mapa[id] = true;
      return mapa;
    }

    function estadoDoPasso(indice, srv) {
      const passo = passos[indice];
      const t = agora();
      const e = {
        indice,
        tipo: passo.tipo,
        subfase: N().roteiro.subfasesDe(passo.tipo)[0],
        equipesTravadas: srv?.equipesTravadas === true,
        equipesAbertas: srv?.equipesAbertas ?? null,
      };
      // Sair do "formar equipes" trava as equipes, também quando o apresentador
      // pula por cima dele. Sem passo de formar equipes, travam desde o início, e
      // o telão distribui todo mundo.
      if (indice > indiceFormar) e.equipesTravadas = true;
      // Nenhuma equipe escolhida ainda: abrem todas, e o apresentador fecha as que
      // sobrarem. Uma rodada sem equipes abertas não teria quem jogar.
      if ((passo.tipo === 'formarEquipes' || e.equipesTravadas) && !e.equipesAbertas) e.equipesAbertas = todasAsEquipes();
      if (passo.tipo === 'enquete') {
        const enq = config.enquetes[passo.enquete];
        e.enquete = passo.enquete;
        e.momento = passo.momento;
        e.afirmacao = enq.modo === 'uma_por_vez' ? lista(enq.ordemAfirmacoes)[0] : '*';
        e.abertoEm = t;
        e.prazo = t + config.tempos.enqueteSeg * 1000;
      } else if (passo.tipo === 'rodada') {
        e.rodada = passo.rodada;
        e.abertoEm = t;
        e.prazo = t + config.tempos.decisaoSeg * 1000;
      } else if (passo.tipo === 'comparativo') {
        e.enquete = passo.enquete;
      }
      return e;
    }

    async function irPara(indice) {
      const travadasAntes = exigirEstado().equipesTravadas === true;
      const novo = await transicionar((srv) => estadoDoPasso(indice, srv));
      // Quem não escolheu equipe até a trava é distribuído pelo telão.
      if (novo.equipesTravadas && !travadasAntes) await distribuirAtrasados();
      return novo;
    }

    // ---------- Sala ----------

    async function criarSala() {
      if (!uid) uid = await canal.entrar();
      // Sem isto, recriar por cima regravaria a meta (a do próprio anfitrião
      // passa na regra) antes de o estado ser recusado, e reabriria a entrada.
      if (await canal.ler(cam('meta'))) throw new Error(`A sala ${sala} já existe: use carregarSala().`);
      const t = agora();
      const meta = {
        hostUid: uid, criadaEm: t, expiraEm: t + DOZE_HORAS_MS,
        hashConfig: N().validarConfig.hash(config), roteiro: nomeRoteiro, entradaAberta: true,
      };
      if (versaoApp !== undefined) meta.versaoApp = versaoApp;
      // Duas gravações, e não uma: a regra decide quem é o anfitrião pelo dado de
      // ANTES da escrita. Na mesma gravação, estado e conteudo seriam recusados
      // porque a meta com o hostUid ainda não existia.
      await canal.gravar({ [cam('meta')]: meta });
      const estado = { ...estadoDoPasso(0, null), geracao: 1 };
      await canal.gravar({ [cam('conteudo')]: config, [cam('estado')]: estado });
      atual = estado;
      avisar();
      return atual;
    }

    // Recarregar o telão, ou assumir em outra máquina: lê o estado do banco.
    async function carregarSala() {
      if (!uid) uid = await canal.entrar();
      const meta = await canal.ler(cam('meta'));
      if (!meta) throw new Error(`A sala ${sala} não existe.`);
      // O índice do estado aponta para um passo DESTE roteiro, e a apuração sai
      // do config local. Outro roteiro desalinharia os passos em silêncio (no
      // 120min, o índice 12 é um bloco), e outro config apuraria com conteúdo
      // diferente do congelado na sala, que é o que os celulares leem (I4).
      if (meta.roteiro !== nomeRoteiro) {
        throw new Error(`A sala ${sala} foi criada com o roteiro "${meta.roteiro}", e não "${nomeRoteiro}": escolha o mesmo roteiro.`);
      }
      const hashLocal = N().validarConfig.hash(config);
      if (meta.hashConfig !== hashLocal) {
        throw new Error(`O config.json deste telão (${hashLocal}) não é o da sala ${sala} (${meta.hashConfig}): use o mesmo arquivo da criação.`);
      }
      const lido = await canal.ler(cam('estado'));
      if (!lido) throw new Error(`A sala ${sala} não tem estado.`);
      if (!N().roteiro.indiceValido(passos, lido.indice) || passos[lido.indice].tipo !== lido.tipo) {
        throw new Error(`O estado da sala (passo ${lido.indice}, "${lido.tipo}") não bate com o roteiro "${nomeRoteiro}".`);
      }
      // Assumir em outra máquina (R6): o hostUid é gravado sozinho, antes de
      // qualquer transição, porque a regra decide quem é o anfitrião pelo dado
      // de antes da escrita. Sem o PIN (pedidosAnfitriao), a recusa vem aqui, e
      // não no primeiro encerrar da aula.
      if (meta.hostUid !== uid) await canal.gravar({ [cam('meta', 'hostUid')]: uid });
      atual = lido;
      avisar();
      return atual;
    }

    async function apagarSala() {
      await canal.gravar({ [base]: null });
      atual = null;
      avisar();
    }

    // ---------- Navegação ----------

    async function avancar() {
      const e = exigirEstado();
      if (e.subfase === 'fechando') throw new Error('Apuração em andamento: use encerrar() para concluí-la.');
      if (e.tipo === 'enquete' && e.subfase === 'votando') {
        const ordem = lista(config.enquetes[e.enquete].ordemAfirmacoes);
        const i = ordem.indexOf(e.afirmacao);
        if (e.afirmacao !== '*' && i >= 0 && i + 1 < ordem.length) {
          return transicionar((srv) => {
            const t = agora();
            const duracao = config.tempos.enqueteSeg * 1000;
            const proxima = { ...srv, afirmacao: ordem[i + 1], abertoEm: t };
            // Pausado continua pausado, com o tempo inteiro guardado: tirar a
            // pausa no avançar reabriria a votação sem o retomar(), e a barra
            // do apresentador perderia o "pausado".
            return typeof srv.restanteMs === 'number'
              ? { ...proxima, prazo: null, restanteMs: duracao }
              : { ...proxima, prazo: t + duracao, restanteMs: null };
          });
        }
      }
      // Avançar nunca fecha votação: um Espaço acidental (ou o passador de
      // slides) encerraria a conversa da equipe. Fechar é o encerrar() (D-010).
      if (ABERTAS.has(e.subfase)) throw new Error('Votação aberta: quem fecha é o apresentador, com encerrar().');
      if (e.tipo === 'rodada' && e.subfase === 'sorteio') return transicionar((srv) => ({ ...srv, subfase: 'resultado' }));
      const proximo = N().roteiro.proximoIndice(passos, e.indice);
      if (proximo === null) throw new Error('Fim do roteiro: não há passo depois deste.');
      return irPara(proximo);
    }

    // "Pular para…": só para a frente, e nunca com votação aberta ou apurando.
    // Voltar para uma rodada já apurada esbarraria na gravação única do
    // resultado; sair de uma votação aberta perderia os votos sem apurar.
    async function pularPara(indice) {
      const e = exigirEstado();
      if (!N().roteiro.indiceValido(passos, indice)) throw new RangeError(`Índice de passo inválido: ${indice}.`);
      if (indice <= e.indice) throw new Error('O "Pular para…" só vai para a frente; para refazer uma apuração, use desfazer().');
      if (ABERTAS.has(e.subfase) || e.subfase === 'fechando') throw new Error('Encerre a votação antes de pular.');
      return irPara(indice);
    }

    // ---------- Fechamento em duas fases (contratos seção 7) ----------

    async function encerrar() {
      const e = exigirEstado();
      if (e.tipo === 'enquete' && (e.subfase === 'votando' || e.subfase === 'fechando')) return fecharEnquete();
      if (e.tipo === 'rodada' && (ABERTAS.has(e.subfase) || e.subfase === 'fechando')) return fecharRodada();
      throw new Error('Nada para encerrar neste passo.');
    }

    // Fase 1: "fechando" com geracao + 1; a regra passa a recusar voto novo. Se
    // o estado já está em "fechando" (o telão caiu no meio da apuração), segue
    // direto para a leitura: é assim que outra máquina conclui o fechamento.
    async function fase1() {
      if (atual.subfase !== 'fechando') await transicionar((srv) => ({ ...srv, subfase: 'fechando' }));
      return atual;
    }

    function apuracaoManual(enq, manual) {
      const histogramas = {};
      const n = {};
      for (const a of Object.keys(enq.afirmacoes)) {
        histogramas[a] = tem(manual, a) ? lista(manual[a]).slice() : [0, 0, 0, 0, 0];
        n[a] = histogramas[a].reduce((s, x) => s + x, 0);
      }
      return { histogramas, n, metodo: 'manual' };
    }

    async function fecharEnquete() {
      const e = await fase1();
      const enq = config.enquetes[e.enquete];
      const E = N().enquete;
      let apuracao;
      // Métodos nunca se misturam: havendo contagem manual, ela é a apuração, e os
      // votos de celular que tenham chegado antes da queda ficam de fora.
      if (e.manual) {
        apuracao = apuracaoManual(enq, e.manual);
      } else {
        const votos = await canal.ler(cam('votosEnquete', e.enquete, e.momento));
        apuracao = { ...E.apurar(enq, votos), metodo: 'celular' };
        // A transição só pode ser calculada aqui, quando os dois lados existem.
        // Ela guarda só contagens: o voto individual nunca sai do banco.
        if (e.momento === 'depois') {
          const antes = await canal.ler(cam('votosEnquete', e.enquete, 'antes'));
          apuracao.transicao = {};
          for (const a of Object.keys(enq.afirmacoes)) apuracao.transicao[a] = E.transicao(antes?.[a], votos?.[a]);
        }
      }
      apuracao.apuradaEm = agora();
      return gravarComEstado({ ...e, subfase: 'apurada', restanteMs: null }, {
        [cam('enquetes', e.enquete, e.momento)]: apuracao,
      });
    }

    // O voto só conta se o aparelho ainda é da equipe e entrou antes de a
    // decisão abrir. A regra já barra isso na escrita; conferir de novo protege
    // quem foi movido de equipe depois de votar e o canal sem travas.
    function votosDaEquipe(decisoes, membros, equipe, abertoEm) {
      const votos = {};
      for (const [u, opcao] of Object.entries(decisoes?.[equipe] || {})) {
        const m = tem(membros, u) ? membros[u] : null;
        if (!m || m.equipe !== equipe || typeof m.entrouEm !== 'number' || m.entrouEm > abertoEm) continue;
        votos[u] = opcao;
      }
      return votos;
    }

    function equipesAtivas(e) {
      return ordemEquipes.filter((id) => tem(e.equipesAbertas, id) && e.equipesAbertas[id] === true);
    }

    // O estado da equipe antes desta rodada: o "depois" da última rodada já
    // apurada, na ordem do roteiro (uma rodada pulada no dia não conta).
    function estadoAntes(equipe, rodadaId, resultados) {
      let estado = N().motor.estadoInicial(config, equipe);
      for (const p of passosRodada) {
        if (p.rodada === rodadaId) break;
        const r = resultados?.[p.rodada]?.[equipe];
        if (r) estado = r.depois;
      }
      return estado;
    }

    // O histórico da equipe antes desta rodada (decidiu/sorteou, D-043): as
    // rodadas anteriores na ordem do roteiro, só as que foram apuradas.
    function historicoAntes(equipe, rodadaId, resultados) {
      const anteriores = [];
      for (const p of passosRodada) {
        if (p.rodada === rodadaId) break;
        anteriores.push(p.rodada);
      }
      return N().motor.historicoDe(resultados, equipe, anteriores);
    }

    function calcularPlacar(resultados, e) {
      const M = N().motor;
      const placar = {};
      for (const eq of ordemEquipes) {
        const jogadas = passosRodada
          .filter((p) => resultados?.[p.rodada]?.[eq])
          .map((p) => ({ rodadaId: p.rodada, opcaoId: resultados[p.rodada][eq].decisao, cartaId: resultados[p.rodada][eq].carta }));
        const d = M.decompor(config, { equipeId: eq, rodadas: jogadas });
        const ultima = jogadas.length > 0 ? resultados[jogadas[jogadas.length - 1].rodadaId][eq].depois : M.estadoInicial(config, eq);
        placar[eq] = {
          ...ultima,
          piloto: d.esperadoPiloto, efeitoDecisoes: d.efeitoDecisoes, sorte: d.sorte, piorCaso: d.piorCaso,
          // D-059: o pior caso com as mesmas decisões, sem as opções que
          // protegem. As regras v3 aceitam qualquer filho de placar.
          piorCasoSemProtecao: d.piorCasoSemProtecao,
          ativa: tem(e.equipesAbertas, eq) && e.equipesAbertas[eq] === true,
        };
      }
      return placar;
    }

    async function semente(rodadaId) {
      const gravada = await canal.ler(cam('sementes', rodadaId));
      if (typeof gravada === 'number') return gravada;
      const nova = gerarSemente();
      if (!Number.isInteger(nova) || nova < 0 || nova > 0xFFFFFFFF) throw new TypeError(`gerarSemente devolveu uma semente inválida: ${nova}.`);
      // Gravada antes de apurar e nunca apagada: refazer tira a mesma carta.
      await canal.gravar({ [cam('sementes', rodadaId)]: nova });
      return nova;
    }

    async function fecharRodada() {
      const e = await fase1();
      const M = N().motor;
      const r = e.rodada;
      const s = await semente(r);
      // Fase 2: lê do servidor, e não do cache: o voto aceito antes do "fechando"
      // tem de estar aqui.
      const [decisoes, membros, resultados, marca] = await Promise.all([
        canal.ler(cam('decisoes', r)), canal.ler(cam('membros')), canal.ler(cam('resultados')),
        canal.ler(cam('prorrogacoes', r)),
      ]);
      const ativas = equipesAtivas(e);
      // Uma prorrogação só por rodada, mesmo depois do desfazer (D-035). O
      // desfazer apaga as empatadas do estado; a marca prorrogacoes/{r}, gravada
      // junto com a prorrogação e nunca apagada, é o que ainda lembra dela.
      const jaProrrogou = Boolean(e.empatadas) || marca === true;
      const consolidacoes = {};
      const empatadas = {};
      for (const eq of ativas) {
        const prorrogada = Boolean(e.empatadas) && tem(e.empatadas, eq);
        const pedido = {
          rodadaId: r, votos: votosDaEquipe(decisoes, membros, eq, e.abertoEm), forcada: e.forcadas?.[eq],
          aposProrrogacao: prorrogada, semente: s, equipeId: eq,
          // A moeda e a maioria da prorrogação ficam entre as opções empatadas.
          candidatas: prorrogada ? Object.keys(e.empatadas[eq]) : undefined,
        };
        let c = M.consolidarDecisao(config, pedido);
        // Uma prorrogação só por rodada. Se uma equipe que não estava empatada
        // empatar agora (alguém foi movido durante a prorrogação), ou se a
        // rodada foi desfeita depois da prorrogação, vai direto para a moeda,
        // em vez de abrir outra rodada de conversa.
        if (c.decisao === null && jaProrrogou) c = M.consolidarDecisao(config, { ...pedido, aposProrrogacao: true });
        if (c.decisao === null) {
          empatadas[eq] = {};
          for (const op of c.empate) empatadas[eq][op] = true;
        }
        consolidacoes[eq] = c;
      }
      if (Object.keys(empatadas).length > 0) {
        const t = agora();
        // A marca vai no mesmo update do estado: ou os dois ficam, ou nenhum.
        // Gravada à parte, uma queda entre as duas escritas deixaria uma
        // prorrogação aberta sem a marca, e o refazer abriria outra.
        return gravarComEstado({ ...e, subfase: 'prorrogacao', empatadas, prazo: t + config.tempos.prorrogacaoSeg * 1000, restanteMs: null }, {
          [cam('prorrogacoes', r)]: true,
        });
      }
      const daRodada = {};
      for (const eq of ativas) {
        const c = consolidacoes[eq];
        const res = M.resolverRodada(config, {
          equipeId: eq, rodadaId: r, opcaoId: c.decisao, estado: estadoAntes(eq, r, resultados), semente: s,
          historico: historicoAntes(eq, r, resultados),
        });
        // mes (as contas do mês, D-044 e v2.1) e cartaCusto (o custo real da
        // carta, D-052) vão gravados: o celular não carrega o motor e mostra
        // "entrou · gastos · básico · faltou" e "20 dias parado · renda perdida"
        // a partir daqui. As regras v3 aceitam qualquer filho em resultados/{r}.
        daRodada[eq] = {
          decisao: c.decisao, origem: c.origem, contagem: c.contagem,
          chances: res.chances, carta: res.carta, delta: res.delta, depois: res.depois, mes: res.mes,
          cartaCusto: res.cartaCusto,
        };
        // O que veio dos meses anteriores ("a fratura continua −R$ 2.233 ·
        // auxílio do INSS +R$ 2.431"), só quando há: lista vazia o RTDB apaga,
        // e o resultado lido não bateria com o gravado.
        if (res.deAntes.length > 0) daRodada[eq].deAntes = res.deAntes;
        // D-059: o que a proteção pagou no mês, nomeado ("auxílio do INSS"), e
        // quanto ela evitou. Só quando houve: gravar 0 em toda equipe de todo
        // mês seria ruído, e lista vazia o RTDB apaga.
        if (res.protecaoEvitou > 0) daRodada[eq].protecaoEvitou = res.protecaoEvitou;
        if (res.protecaoItens.length > 0) daRodada[eq].protecaoItens = res.protecaoItens;
      }
      const placar = calcularPlacar({ ...(resultados || {}), [r]: daRodada }, e);
      return gravarComEstado({ ...e, subfase: 'sorteio', empatadas: null, restanteMs: null }, {
        [cam('resultados', r)]: daRodada,
        [cam('placar')]: placar,
      });
    }

    // ---------- Desfazer a abertura (D-037) ----------

    // Um Espaço a mais abre a próxima votação. O Ctrl+Z desfaz essa abertura
    // enquanto nenhum voto chegou, e o fluxo normal não ganha passo nenhum.

    // Quantos votos a etapa aberta já tem, lidos do servidor. Na enquete, conta
    // aparelhos (e não folhas: quem votou nas 3 afirmações do modo "todas" é um
    // voto); na uma_por_vez, só a afirmação aberta, porque a anterior tem os
    // votos dela e continua valendo. A contagem à mão do offline também é voto:
    // desfazer apagaria mãos que o apresentador já contou.
    // Na rodada, a decisão do apresentador também é voto: offline, toda decisão é
    // dele, e "nenhum voto chegou" era sempre verdade; o desfazer apagava as
    // decisões já registradas sem avisar.
    async function votosDaAbertura(e) {
      if (e.tipo === 'rodada') {
        const decisoes = await canal.ler(cam('decisoes', e.rodada));
        const doCelular = Object.values(decisoes || {}).reduce((s, porUid) => s + Object.keys(porUid || {}).length, 0);
        return doCelular + Object.keys(e.forcadas || {}).length;
      }
      const todas = e.afirmacao === '*';
      const abertas = todas ? Object.keys(config.enquetes[e.enquete].afirmacoes) : [e.afirmacao];
      const maos = abertas.reduce((s, a) => s + (tem(e.manual, a) ? lista(e.manual[a]).reduce((x, y) => x + y, 0) : 0), 0);
      if (maos > 0) return maos;
      const lidos = await canal.ler(todas ? cam('votosEnquete', e.enquete, e.momento) : cam('votosEnquete', e.enquete, e.momento, e.afirmacao));
      const uids = new Set();
      for (const porUid of todas ? Object.values(lidos || {}) : [lidos]) for (const u of Object.keys(porUid || {})) uids.add(u);
      return uids.size;
    }

    function recusaPorVotos(n, e) {
      const quantos = n === 1 ? 'Já chegou 1 voto' : `Já chegaram ${n} votos`;
      const doApresentador = e.tipo === 'rodada' && Object.keys(e.forcadas || {}).length > 0 ? ' (contando as decisões do apresentador)' : '';
      return new Error(`${quantos}${doApresentador}; não dá para desfazer a abertura. A votação continua aberta.`);
    }

    // Para onde o desfazer volta, calculado ANTES da fase 1: o que não dá para
    // desfazer é recusado sem tocar no estado. Devolve a função que monta o
    // estado de volta a partir do do servidor.
    async function voltaDaAbertura(e) {
      if (e.tipo === 'enquete') {
        const ordem = lista(config.enquetes[e.enquete].ordemAfirmacoes);
        const i = ordem.indexOf(e.afirmacao);
        // uma_por_vez depois da primeira: volta à afirmação anterior, em votação,
        // com prazo novo (o antigo não fica guardado), e pausada se estava.
        if (e.afirmacao !== '*' && i > 0) {
          return (srv) => {
            const t = agora();
            const duracao = config.tempos.enqueteSeg * 1000;
            const anterior = { ...srv, subfase: 'votando', afirmacao: ordem[i - 1], abertoEm: t };
            return typeof srv.restanteMs === 'number'
              ? { ...anterior, prazo: null, restanteMs: duracao }
              : { ...anterior, prazo: t + duracao, restanteMs: null };
          };
        }
      }
      if (e.indice === 0) throw new Error('Nada para desfazer: não há passo antes deste.');
      const p = passos[e.indice - 1];
      // O estado de volta é montado do zero, e não copiado: rodada, prazo,
      // forcadas e contagem à mão são desta votação e não podem sobrar no passo
      // anterior. As equipes ficam como estão: destravar deixaria o celular
      // trocar de equipe depois da distribuição dos atrasados.
      const comum = (srv) => ({ indice: p.indice, tipo: p.tipo, equipesTravadas: srv.equipesTravadas === true, equipesAbertas: srv.equipesAbertas ?? null });
      if (p.tipo === 'enquete') {
        // Só se chega à enquete seguinte com esta apurada. Sem apuração, ela foi
        // pulada, e voltar a ela a abriria (ou a mostraria "apurada" sem nada).
        const apuracao = await canal.ler(cam('enquetes', p.enquete, p.momento));
        if (!apuracao) {
          throw new Error('Não dá para desfazer a abertura: o passo anterior foi pulado e não tem apuração. Encerre esta votação.');
        }
        const enq = config.enquetes[p.enquete];
        const afirmacao = enq.modo === 'uma_por_vez' ? lista(enq.ordemAfirmacoes).at(-1) : '*';
        // Contada à mão, a contagem volta junto: os histogramas da apuração manual
        // são exatamente as contagens digitadas. Sem isto, o Ctrl+Z seguinte (o
        // desfazer da apuração) reabria a enquete com os contadores zerados, e
        // tudo o que o apresentador contou se perdia.
        const manual = apuracao.metodo === 'manual' ? {} : null;
        if (manual) for (const [a, h] of Object.entries(apuracao.histogramas || {})) manual[a] = lista(h).slice();
        return (srv) => ({ ...comum(srv), subfase: 'apurada', enquete: p.enquete, momento: p.momento, afirmacao, ...(manual ? { manual } : {}) });
      }
      // Nenhum roteiro põe uma rodada logo antes de outra votação; reconstruir o
      // "resultado" dela sem o abertoEm e as forcadas deixaria o desfazer dela
      // capenga. Melhor recusar do que voltar a um estado que não existiu.
      if (p.tipo === 'rodada') throw new Error('Não dá para desfazer a abertura: o passo anterior é uma rodada. Encerre esta votação.');
      const subfase = N().roteiro.subfasesDe(p.tipo)[0];
      return (srv) => ({ ...comum(srv), subfase, ...(p.tipo === 'comparativo' ? { enquete: p.enquete } : {}) });
    }

    // Em duas fases, como o fechamento, para não perder voto nem contar voto de
    // uma janela aberta por engano:
    // 1. "fechando" (geracao + 1): a regra passa a recusar voto novo;
    // 2. a transação confirma;
    // 3. lê do servidor os votos desta etapa;
    // 4a. nenhum: volta ao passo (ou à afirmação) de antes;
    // 4b. algum: reabre a mesma votação, com o mesmo prazo, e recusa.
    // Antes da fase 1, uma conferência dos votos já registrados recusa sem
    // transição nenhuma: no caso comum (Ctrl+Z tarde demais), o celular nem
    // pisca a tela de "votação encerrada".
    // Se a rede cai entre as fases, a sala fica em "fechando". Com a marca desta
    // janela, o Ctrl+Z seguinte retoma o desfazer. Se o telão recarregou (ou é
    // outra máquina), a marca se perdeu e vale o fechamento interrompido comum:
    // o Ctrl+Z reabre a votação e o outro Ctrl+Z tenta de novo.
    async function desfazerAbertura(e) {
      const t0 = agora();
      const pausado = typeof e.restanteMs === 'number';
      const restante = pausado ? e.restanteMs : Math.max(0, e.prazo - t0);
      const volta = await voltaDaAbertura(e);
      // A rodada com semente já foi apurada uma vez: este "decidindo" veio do
      // desfazer da apuração, e não de um Espaço por engano. Desfazer a abertura
      // aqui apagaria as decisões de uma rodada jogada de verdade.
      if (e.tipo === 'rodada' && typeof (await canal.ler(cam('sementes', e.rodada))) === 'number') {
        throw new Error('Esta rodada já foi apurada uma vez (o Ctrl+Z anterior desfez a apuração, e não a abertura); não dá para desfazer a abertura. A votação continua aberta.');
      }
      const previos = await votosDaAbertura(e);
      if (previos > 0) throw recusaPorVotos(previos, e);
      const marca = { geracao: e.geracao + 1, subfase: e.subfase, pausado, restante };
      // A marca vem antes da transição: o aviso do "fechando" já sai com ela, e o
      // telão não pisca "Apurando…" diante da turma.
      marcaDesfazer = marca;
      let fechando;
      try {
        fechando = await transicionar((srv) => ({ ...srv, subfase: 'fechando' }));
      } catch (erro) {
        // Conflito: o estado de geracao + 1 é de outra janela, e não deste
        // desfazer. Sem rede, a marca fica: se a escrita chegar depois, o
        // "fechando" continua reconhecido como o do desfazer.
        if (/^CONFLITO/.test(erro.message)) {
          marcaDesfazer = null;
          avisar();
        }
        throw erro;
      }
      return concluirDesfazer(fechando, volta, marca);
    }

    // Os passos 3 e 4 do desfazer, também para retomá-lo depois de uma queda.
    async function concluirDesfazer(fechando, volta, marca) {
      const n = await votosDaAbertura(fechando);
      if (n === 0) return transicionar(volta);
      await transicionar((srv) => {
        if (marca.pausado) return { ...srv, subfase: marca.subfase, prazo: null, restanteMs: marca.restante };
        // O mesmo prazo; se ele venceu durante a espera, os segundos que faltavam
        // no Ctrl+Z (a espera não pode comer o tempo da turma).
        const prazo = marca.restante > 0 && srv.prazo <= agora() ? agora() + marca.restante : srv.prazo;
        return { ...srv, subfase: marca.subfase, prazo, restanteMs: null };
      });
      throw recusaPorVotos(n, fechando);
    }

    // O "fechando" atual é o do desfazer da abertura feito por esta janela?
    function desfazendoAbertura(e = atual) {
      return Boolean(marcaDesfazer && e && e.subfase === 'fechando' && e.geracao === marcaDesfazer.geracao);
    }

    // Reabre a última apuração do passo atual. Apaga resultados/{r} e refaz o
    // placar sem esta rodada, mas nunca apaga sementes/{r}: votos e semente
    // continuam lá, e encerrar de novo tira a mesma carta. Também nunca apaga
    // prorrogacoes/{r}: a rodada refeita não abre uma segunda prorrogação (D-035).
    async function desfazer() {
      const e = exigirEstado();
      const t = agora();
      // O desfazer da abertura parou depois do "fechando" (a rede caiu): o Ctrl+Z
      // seguinte o retoma. Reabrir a votação aberta por engano não é o que o
      // apresentador pediu.
      if (desfazendoAbertura(e)) return concluirDesfazer(e, await voltaDaAbertura(e), marcaDesfazer);
      // Saída de um fechamento que não conclui: se a apuração lança erro depois
      // da fase 1, o encerrar refaz a mesma conta e lança de novo, e avançar,
      // pular e decidir por equipe recusam o "fechando". A sala parava ali.
      // Volta à votação sem apagar nada: nenhum resultado foi gravado (ele sai
      // no mesmo update do estado), e a semente, se já existe, fica.
      if (e.subfase === 'fechando') {
        let volta;
        if (e.tipo === 'enquete') volta = { subfase: 'votando', prazo: t + config.tempos.enqueteSeg * 1000 };
        else if (e.empatadas) volta = { subfase: 'prorrogacao', prazo: t + config.tempos.prorrogacaoSeg * 1000 };
        else volta = { subfase: 'decidindo', prazo: t + config.tempos.decisaoSeg * 1000 };
        return transicionar((srv) => ({ ...srv, ...volta, restanteMs: null }));
      }
      // Votação aberta: desfaz a abertura (D-037). A prorrogação fica de fora:
      // ela só abre depois de uma apuração, e voltar dela não é "abrir por engano".
      if ((e.tipo === 'enquete' && e.subfase === 'votando') || (e.tipo === 'rodada' && e.subfase === 'decidindo')) return desfazerAbertura(e);
      if (e.tipo === 'rodada' && (e.subfase === 'sorteio' || e.subfase === 'resultado')) {
        const resultados = { ...((await canal.ler(cam('resultados'))) || {}) };
        delete resultados[e.rodada];
        const placar = Object.keys(resultados).length > 0 ? calcularPlacar(resultados, e) : null;
        return gravarComEstado({ ...e, subfase: 'decidindo', prazo: t + config.tempos.decisaoSeg * 1000, restanteMs: null, empatadas: null }, {
          [cam('resultados', e.rodada)]: null,
          [cam('placar')]: placar,
        });
      }
      if (e.tipo === 'enquete' && e.subfase === 'apurada') {
        return gravarComEstado({ ...e, subfase: 'votando', prazo: t + config.tempos.enqueteSeg * 1000, restanteMs: null }, {
          [cam('enquetes', e.enquete, e.momento)]: null,
        });
      }
      throw new Error('Nada para desfazer: o desfazer só reabre a apuração do passo atual.');
    }

    // ---------- Tempo ----------

    function exigirAberta() {
      const e = exigirEstado();
      if (!ABERTAS.has(e.subfase)) throw new Error('Não há votação aberta.');
      return e;
    }

    async function maisTempo(seg) {
      exigirAberta();
      if (!(Number.isFinite(seg) && seg > 0)) throw new RangeError(`Tempo inválido: ${seg}.`);
      return transicionar((srv) => (typeof srv.restanteMs === 'number'
        ? { ...srv, restanteMs: srv.restanteMs + seg * 1000 }
        // Prazo já vencido: "+30 s" conta a partir de agora, e não do prazo velho.
        : { ...srv, prazo: Math.max(srv.prazo, agora()) + seg * 1000 }));
    }

    // Pausar tira o prazo e guarda o que faltava. Sem prazo, a regra do banco
    // recusa voto (null + graça não vale): a pausa congela a votação inteira, e
    // não só o cronômetro. Isso mantém o esboço das regras como está.
    async function pausar() {
      const e = exigirAberta();
      if (typeof e.restanteMs === 'number') throw new Error('Já está pausado.');
      return transicionar((srv) => ({ ...srv, restanteMs: Math.max(0, srv.prazo - agora()), prazo: null }));
    }

    async function retomar() {
      const e = exigirAberta();
      if (typeof e.restanteMs !== 'number') throw new Error('Não está pausado.');
      return transicionar((srv) => ({ ...srv, prazo: agora() + srv.restanteMs, restanteMs: null }));
    }

    // ---------- Equipes ----------

    async function decidirPorEquipe(equipeId, opcaoId) {
      const e = exigirEstado();
      if (e.tipo !== 'rodada' || !(e.subfase === 'decidindo' || e.subfase === 'prorrogacao')) {
        throw new Error('Só dá para decidir por uma equipe com a decisão aberta.');
      }
      if (!equipesAtivas(e).includes(equipeId)) throw new Error(`A equipe "${equipeId}" não está jogando.`);
      if (opcaoId !== null && !tem(config.rodadas[e.rodada].opcoes, opcaoId)) throw new Error(`Opção inexistente: "${opcaoId}".`);
      return transicionar((srv) => {
        const forcadas = { ...(srv.forcadas || {}) };
        if (opcaoId === null) delete forcadas[equipeId];
        else forcadas[equipeId] = opcaoId;
        return { ...srv, forcadas };
      });
    }

    async function definirEquipesAbertas(ids) {
      const e = exigirEstado();
      if (e.equipesTravadas) throw new Error('As equipes já estão travadas.');
      const escolhidas = new Set(ids);
      // Lista vazia sem equipe obrigatória gravaria {}, que o RTDB apaga, e o
      // passo seguinte reabriria todas. O "de 3 a 6" fica na tela.
      if (escolhidas.size === 0) throw new Error('Escolha pelo menos uma equipe para abrir.');
      for (const id of escolhidas) if (!tem(config.equipes, id)) throw new Error(`Equipe inexistente: "${id}".`);
      const mapa = {};
      // Uma equipe obrigatória nunca some: sem membros, joga no piloto.
      for (const id of ordemEquipes) if (escolhidas.has(id) || config.equipes[id].obrigatoria) mapa[id] = true;
      return transicionar((srv) => ({ ...srv, equipesAbertas: mapa }));
    }

    async function moverMembro(uidMembro, equipeId) {
      const e = exigirEstado();
      if (!tem(config.equipes, equipeId)) throw new Error(`Equipe inexistente: "${equipeId}".`);
      if (e.equipesAbertas && !tem(e.equipesAbertas, equipeId)) throw new Error(`A equipe "${equipeId}" não está aberta.`);
      // Gravar só a equipe de um uid que não existe criaria um membro sem entrouEm.
      if (!(await canal.ler(cam('membros', uidMembro)))) throw new Error('Membro não encontrado.');
      await canal.gravar({ [cam('membros', uidMembro, 'equipe')]: equipeId });
    }

    async function lerAtivos() {
      const [membros, presenca] = await Promise.all([canal.ler(cam('membros')), canal.ler(cam('presenca'))]);
      const t = agora();
      const ativos = new Set();
      for (const [u, p] of Object.entries(presenca || {})) if (typeof p === 'number' && t - p <= ATIVO_MS) ativos.add(u);
      return { membros: membros || {}, ativos };
    }

    // Quem chega depois da trava (ou não escolheu a tempo) vai para uma equipe
    // pelo telão, com a mesma regra do "me coloque numa equipe".
    async function distribuirAtrasados() {
      const e = exigirEstado();
      if (!e.equipesTravadas) return 0;
      const { membros, ativos } = await lerAtivos();
      const copia = structuredClone(membros);
      const escritas = {};
      const ordem = Object.keys(copia).sort((a, b) => (copia[a].entrouEm ?? 0) - (copia[b].entrouEm ?? 0) || (a < b ? -1 : 1));
      for (const u of ordem) {
        if (tem(e.equipesAbertas, copia[u].equipe)) continue;
        const eq = N().alunoLogica.sugerirEquipe(config, { membros: copia, ativos, equipesAbertas: e.equipesAbertas });
        if (!eq) break;
        copia[u] = { ...copia[u], equipe: eq };
        // Acabou de entrar: conta como ativo, senão os atrasados iriam todos
        // para a mesma equipe.
        ativos.add(u);
        escritas[cam('membros', u, 'equipe')] = eq;
      }
      if (Object.keys(escritas).length > 0) await canal.gravar(escritas);
      return Object.keys(escritas).length;
    }

    async function removerInativos(limiteMs = ATIVO_MS) {
      const [membros, presenca] = await Promise.all([canal.ler(cam('membros')), canal.ler(cam('presenca'))]);
      const t = agora();
      const escritas = {};
      for (const u of Object.keys(membros || {})) {
        const p = presenca?.[u];
        if (typeof p !== 'number' || t - p > limiteMs) escritas[cam('membros', u)] = null;
      }
      if (Object.keys(escritas).length > 0) await canal.gravar(escritas);
      return Object.keys(escritas).length;
    }

    async function abrirEntrada(aberta) {
      await canal.gravar({ [cam('meta', 'entradaAberta')]: aberta === true });
    }

    // Mão levantada ou cartões coloridos, no modo offline: 5 contagens digitadas
    // pelo apresentador para uma afirmação. Guardadas no estado, para sobreviver a
    // recarregar e a "Salvar estado (JSON)".
    async function contagemManual(afirmacaoId, histograma) {
      const e = exigirEstado();
      if (e.tipo !== 'enquete' || e.subfase !== 'votando') throw new Error('Contagem manual só com a enquete em votação.');
      if (!tem(config.enquetes[e.enquete].afirmacoes, afirmacaoId)) throw new Error(`Afirmação inexistente: "${afirmacaoId}".`);
      if (!Array.isArray(histograma) || histograma.length !== 5 || !histograma.every((c) => Number.isInteger(c) && c >= 0)) {
        throw new TypeError('Contagem manual: são esperadas 5 contagens inteiras e não negativas.');
      }
      return transicionar((srv) => ({ ...srv, manual: { ...(srv.manual || {}), [afirmacaoId]: histograma.slice() } }));
    }

    // Só agregados, montados campo a campo. Copiar os nós do banco inteiros
    // arriscaria levar um uid junto (D-015; AGENTS.md, regra 8).
    async function exportarTotais() {
      const [enquetes, resultados, placar, membros] = await Promise.all([
        canal.ler(cam('enquetes')), canal.ler(cam('resultados')), canal.ler(cam('placar')), canal.ler(cam('membros')),
      ]);
      const saida = {
        titulo: config.titulo, versao: config.versao, hashConfig: N().validarConfig.hash(config),
        roteiro: nomeRoteiro, exportadoEm: agora(), participantes: Object.keys(membros || {}).length,
        enquetes: {}, resultados: {}, placar: {},
      };
      for (const [e, momentos] of Object.entries(enquetes || {})) {
        saida.enquetes[e] = {};
        for (const [m, ap] of Object.entries(momentos)) {
          const item = { histogramas: {}, n: {}, metodo: ap.metodo, apuradaEm: ap.apuradaEm };
          for (const [a, h] of Object.entries(ap.histogramas || {})) item.histogramas[a] = lista(h).slice();
          for (const [a, n] of Object.entries(ap.n || {})) item.n[a] = n;
          if (ap.transicao) {
            item.transicao = {};
            for (const [a, tr] of Object.entries(ap.transicao)) {
              const { pares, mais, igual, menos, soAntes, soDepois } = tr;
              item.transicao[a] = { matriz: lista(tr.matriz).map((l) => lista(l).slice()), pares, mais, igual, menos, soAntes, soDepois };
            }
          }
          saida.enquetes[e][m] = item;
        }
      }
      for (const [r, equipes] of Object.entries(resultados || {})) {
        saida.resultados[r] = {};
        for (const [eq, res] of Object.entries(equipes)) {
          saida.resultados[r][eq] = { decisao: res.decisao, origem: res.origem, contagem: { ...res.contagem }, carta: res.carta, depois: { ...res.depois } };
        }
      }
      for (const [eq, p] of Object.entries(placar || {})) saida.placar[eq] = { ...p };
      return saida;
    }

    return {
      criarSala, carregarSala, apagarSala,
      avancar, encerrar, desfazer, pularPara,
      maisTempo, pausar, retomar,
      decidirPorEquipe, moverMembro, removerInativos, abrirEntrada, definirEquipesAbertas, distribuirAtrasados,
      contagemManual, exportarTotais, desfazendoAbertura,
      estado: () => atual,
    };
  }

  V.anfitriao = { criar };
})(globalThis);
