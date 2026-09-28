// O validador do config.json: lista TODOS os problemas de uma vez e devolve o
// config normalizado (listas viram mapas por id + a ordem num array), que é o que
// vai para o nó "conteudo" da sala e o que todo o resto do código lê.
//
// Script clássico (IIFE), e não módulo ES: o telão offline abre por file://, e ali
// o Chrome e o Edge bloqueiam módulos. É uma função pura: o telão se recusa a
// criar a sala e mostra a lista inteira. Parar no primeiro erro obrigaria a editar
// o arquivo uma vez por problema, na véspera da aula (risco R10 da arquitetura).
(function (raiz) {
  'use strict';
  const V = (raiz.Viracao ||= {});

  // Pelo menos uma letra ou _: o RTDB devolve um mapa de chaves só numéricas
  // ("1", "2", "3") como lista, e o conteúdo lido da sala deixaria de ter o hash
  // do config normalizado (o mesmo vale para resultados/{r} e sementes/{r}).
  const RE_ID = /^(?=[a-z0-9_]*[a-z_])[a-z0-9_]{1,24}$/;
  const DESCRICAO_ID = '[a-z0-9_]{1,24}, com pelo menos uma letra ou _';
  const RE_EQUIPE = /^e[0-9]{1,2}$/;
  const RE_COR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  // O nome do roteiro vira chave do RTDB, que recusa . # $ [ ] /.
  // Também com uma letra, _ ou - (vira chave de conteudo/roteiros, como os ids).
  const RE_ROTEIRO = /^(?=[A-Za-z0-9_-]*[A-Za-z_-])[A-Za-z0-9_-]{1,24}$/;
  const MAX_EQUIPES = 6;
  const MAX_AFIRMACAO = 110;
  // Acima disto a conferência de "carta possível" desiste com ERRO, em vez de
  // travar o telão enumerando estados (sem a conferência, não há a garantia).
  const MAX_ESTADOS = 20000;

  const TIPOS_PASSO = new Set([
    'lobby', 'enquete', 'bloco', 'formarEquipes', 'personas', 'rodada', 'placarFinal', 'comparativo', 'fim',
  ]);
  const MOMENTOS = new Set(['antes', 'depois', 'unico']);
  const FORMATOS = new Set(['moeda', 'inteiro']);
  const REVELAR = new Set(['ao_vivo', 'ao_encerrar', 'so_no_comparativo']);
  const MODOS = new Set(['todas', 'uma_por_vez']);
  // Os três só têm um valor porque só um foi decidido (D-022, D-012, D-013). O
  // motor não implementa outro: aceitar um valor diferente seria prometer uma
  // regra que a aula não segue.
  const VALORES_REGRAS = {
    desempate: new Set(['prorrogacao-depois-moeda']),
    cartaPor: new Set(['equipe']),
    mostrarChances: new Set(['no_sorteio']),
  };
  const PLACAR_DERIVADO = new Set(['piloto', 'efeitoDecisoes', 'sorte', 'piorCaso']);

  // Conjuntos fechados. Na linguagem de efeitos (efeito, condição, limite, ajuste)
  // uma chave de fora é ERRO: "soma " com espaço seria ignorada em silêncio e a
  // carta não faria nada na aula. Nas outras entidades é aviso, porque o campo
  // estranho só é descartado e não muda o jogo.
  const CHAVES = {
    raiz: ['versao', 'titulo', 'tempos', 'regras', 'escala', 'indicadores', 'personas', 'equipes', 'rodadas',
      'cartas', 'enquetes', 'referencias', 'roteiros'],
    tempos: ['enqueteSeg', 'decisaoSeg', 'decisaoMinSeg', 'prorrogacaoSeg', 'gracaSeg', 'pulsoSeg'],
    regras: ['desempate', 'cartaPor', 'mostrarChances', 'placarPadrao', 'alvoPorEquipe', 'minPareados', 'destacarCartas'],
    escala: ['curtos', 'longos'],
    indicador: ['id', 'nome', 'formato', 'inicial', 'min', 'max', 'fonte'],
    persona: ['id', 'nome', 'descricao', 'inicial', 'todoMes', 'fonte'],
    equipe: ['id', 'nome', 'cor', 'forma', 'persona', 'obrigatoria', 'lugar'],
    rodada: ['id', 'titulo', 'texto', 'padrao', 'efeitosGerais', 'opcoes', 'fonte'],
    opcao: ['id', 'rotulo', 'narrativa', 'tendencia', 'efeitos', 'fonte'],
    carta: ['id', 'titulo', 'narrativa', 'peso', 'rodadas', 'somenteSe', 'ajustesDePeso', 'efeitos', 'tom', 'fonte'],
    enquete: ['id', 'titulo', 'pareada', 'revelar', 'modo', 'afirmacoes'],
    afirmacao: ['id', 'texto'],
    referencia: ['id', 'nome', 'renda', 'fonte'],
    passo: ['tipo', 'alvoSeg', 'opcional', 'titulo', 'enquete', 'momento', 'rodada'],
    efeito: ['se', 'soma', 'multiplica', 'rotulo', 'fonte'],
    condicao: ['opcao', 'persona', 'equipe', 'rodada', 'indicador'],
    limite: ['abaixoDe', 'acimaDe'],
    ajuste: ['se', 'soma', 'multiplica'],
  };
  for (const nome of Object.keys(CHAVES)) CHAVES[nome] = new Set(CHAVES[nome]);

  // ---------------------------------------------------------------- utilidades

  const ehObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const junta = (caminho, chave) => (caminho ? caminho + '.' + chave : chave);
  const tem = (obj, chave) => Object.hasOwn(obj, chave) && obj[chave] !== undefined;

  // O regex vem antes de qualquer consulta a mapa: um id "__proto__" passaria no
  // [a-z0-9_] e, atribuído a um objeto comum, trocaria o protótipo dele.
  function idValido(id, re) {
    return typeof id === 'string' && re.test(id) && id !== '__proto__';
  }

  function novoRelatorio() {
    const erros = [];
    const avisos = [];
    const pendentes = [];
    return {
      erros,
      avisos,
      pendentes,
      erro: (caminho, mensagem) => erros.push({ caminho, mensagem }),
      aviso: (caminho, mensagem) => avisos.push({ caminho, mensagem }),
      // Conferências que precisam de todos os ids já conhecidos (referências
      // cruzadas) rodam depois da primeira passada.
      depois: (fn) => pendentes.push(fn),
    };
  }

  function conferirChaves(r, obj, conjunto, caminho, grave) {
    for (const chave of Object.keys(obj)) {
      if (conjunto.has(chave)) continue;
      const mensagem = `chave desconhecida ${JSON.stringify(chave)}`;
      if (grave) r.erro(junta(caminho, chave), mensagem + ' (a linguagem de efeitos é fechada)');
      else r.aviso(junta(caminho, chave), mensagem + ' (será descartada)');
    }
  }

  function texto(r, obj, chave, caminho, opcional) {
    const c = junta(caminho, chave);
    if (!tem(obj, chave)) {
      if (!opcional) r.erro(c, 'campo obrigatório ausente');
      return undefined;
    }
    const valor = obj[chave];
    if (typeof valor !== 'string') r.erro(c, 'precisa ser texto');
    else if (valor.trim() === '') r.erro(c, 'texto vazio');
    else return valor;
    return undefined;
  }

  // Número finito, e só número: "10" como texto passaria numa soma como
  // concatenação ("0" + "10" = "010") e o placar sairia lixo.
  function numero(r, obj, chave, caminho, { opcional, inteiro, naoNegativo, positivo } = {}) {
    const c = junta(caminho, chave);
    if (!tem(obj, chave)) {
      if (!opcional) r.erro(c, 'campo obrigatório ausente');
      return undefined;
    }
    const valor = obj[chave];
    if (typeof valor !== 'number' || !Number.isFinite(valor)) r.erro(c, 'precisa ser um número finito');
    else if (inteiro && !Number.isInteger(valor)) r.erro(c, 'precisa ser um número inteiro');
    else if (positivo && valor <= 0) r.erro(c, 'precisa ser maior que 0');
    else if (naoNegativo && valor < 0) r.erro(c, 'precisa ser maior ou igual a 0');
    else return valor;
    return undefined;
  }

  function booleano(r, obj, chave, caminho, padrao) {
    if (!tem(obj, chave)) {
      if (padrao === undefined) r.erro(junta(caminho, chave), 'campo obrigatório ausente');
      return padrao;
    }
    if (typeof obj[chave] !== 'boolean') {
      r.erro(junta(caminho, chave), 'precisa ser true ou false');
      return padrao;
    }
    return obj[chave];
  }

  function escolha(r, obj, chave, caminho, conjunto, padrao) {
    if (!tem(obj, chave)) {
      if (padrao === undefined) r.erro(junta(caminho, chave), 'campo obrigatório ausente');
      return padrao;
    }
    if (!conjunto.has(obj[chave])) {
      r.erro(junta(caminho, chave), `valor ${JSON.stringify(obj[chave])} inválido; use ${[...conjunto].join(' | ')}`);
      return padrao;
    }
    return obj[chave];
  }

  function objeto(r, obj, chave, caminho) {
    if (!tem(obj, chave)) {
      r.erro(junta(caminho, chave), 'campo obrigatório ausente');
      return null;
    }
    if (!ehObjeto(obj[chave])) {
      r.erro(junta(caminho, chave), 'precisa ser um objeto');
      return null;
    }
    return obj[chave];
  }

  // Uma coleção aceita lista de objetos com "id" (o formato do config.json) ou
  // mapa por id (o formato das opções da rodada). Devolve o mapa normalizado e a
  // ordem de exibição, porque o RTDB devolve os filhos ordenados pela chave e a
  // ordem do arquivo se perderia.
  function colecao(r, obj, chave, caminho, normalizar, { re = RE_ID, descricaoId = DESCRICAO_ID, opcional } = {}) {
    const c = junta(caminho, chave);
    const mapa = {};
    const ordem = [];
    if (!tem(obj, chave)) {
      if (!opcional) r.erro(c, 'campo obrigatório ausente');
      return { mapa, ordem };
    }
    const bruto = obj[chave];
    let entradas;
    if (Array.isArray(bruto)) entradas = bruto.map((item, i) => ({ c: `${c}[${i}]`, item, id: item?.id, daChave: false }));
    else if (ehObjeto(bruto)) entradas = Object.keys(bruto).map((k) => ({ c: junta(c, k), item: bruto[k], id: k, daChave: true }));
    else {
      r.erro(c, 'precisa ser uma lista');
      return { mapa, ordem };
    }
    for (const { c: ce, item, id, daChave } of entradas) {
      if (!ehObjeto(item)) {
        r.erro(ce, 'precisa ser um objeto');
        continue;
      }
      if (daChave && tem(item, 'id') && item.id !== id) {
        r.erro(junta(ce, 'id'), `id ${JSON.stringify(item.id)} diferente da chave ${JSON.stringify(id)}`);
        continue;
      }
      if (!idValido(id, re)) {
        const cid = daChave ? ce : junta(ce, 'id');
        if (id === undefined) r.erro(cid, 'campo obrigatório ausente');
        else r.erro(cid, `id inválido ${JSON.stringify(id)}: use ${descricaoId}${id === '__proto__' ? ' (nome reservado)' : ''}`);
        continue;
      }
      const cItem = junta(c, id);
      if (Object.hasOwn(mapa, id)) {
        r.erro(cItem, `id repetido ${JSON.stringify(id)}`);
        continue;
      }
      mapa[id] = normalizar(item, cItem, id);
      ordem.push(id);
    }
    return { mapa, ordem };
  }

  // Uma referência: id com formato válido E existente. hasOwn, nunca mapa[id]:
  // "constructor" passaria no regex e acharia o construtor de Object.
  function referencia(r, valor, caminho, existe, oque) {
    if (!idValido(valor, RE_ID)) {
      r.erro(caminho, `${oque} inválida: ${JSON.stringify(valor)}`);
      return false;
    }
    if (!existe(valor)) {
      r.erro(caminho, `${oque} ${JSON.stringify(valor)} não existe`);
      return false;
    }
    return true;
  }

  // ---------------------------------------------------- linguagem de efeitos

  // Um id ou uma lista de ids. Lista vazia é erro: o RTDB some com ela, e
  // "nenhuma opção" voltaria da sala como "qualquer opção".
  function idsOuLista(r, valor, caminho, existe, oque) {
    if (typeof valor === 'string') {
      referencia(r, valor, caminho, existe, oque);
      return valor;
    }
    if (!Array.isArray(valor) || valor.length === 0) {
      r.erro(caminho, `precisa ser um id de ${oque} ou uma lista não vazia de ids`);
      return valor;
    }
    valor.forEach((id, i) => referencia(r, id, `${caminho}[${i}]`, existe, oque));
    return valor.slice();
  }

  function condicao(r, bruto, caminho, idx) {
    if (!ehObjeto(bruto)) {
      r.erro(caminho, 'condição precisa ser um objeto');
      return {};
    }
    conferirChaves(r, bruto, CHAVES.condicao, caminho, true);
    const n = {};
    if (tem(bruto, 'opcao')) n.opcao = idsOuLista(r, bruto.opcao, junta(caminho, 'opcao'), (id) => idx.opcoes.has(id), 'opção');
    if (tem(bruto, 'persona')) n.persona = idsOuLista(r, bruto.persona, junta(caminho, 'persona'), (id) => Object.hasOwn(idx.personas, id), 'persona');
    if (tem(bruto, 'equipe')) n.equipe = idsOuLista(r, bruto.equipe, junta(caminho, 'equipe'), (id) => Object.hasOwn(idx.equipes, id), 'equipe');
    if (tem(bruto, 'rodada')) n.rodada = idsOuLista(r, bruto.rodada, junta(caminho, 'rodada'), (id) => Object.hasOwn(idx.rodadas, id), 'rodada');
    if (tem(bruto, 'indicador')) {
      const ci = junta(caminho, 'indicador');
      if (!ehObjeto(bruto.indicador)) r.erro(ci, 'precisa ser um objeto { indicador: { abaixoDe | acimaDe } }');
      else {
        n.indicador = {};
        for (const [ind, limite] of Object.entries(bruto.indicador)) {
          const cl = junta(ci, ind);
          if (!referencia(r, ind, cl, (id) => Object.hasOwn(idx.indicadores, id), 'indicador')) continue;
          if (!ehObjeto(limite)) {
            r.erro(cl, 'precisa ser um objeto { abaixoDe | acimaDe }');
            continue;
          }
          conferirChaves(r, limite, CHAVES.limite, cl, true);
          const abaixoDe = numero(r, limite, 'abaixoDe', cl, { opcional: true });
          const acimaDe = numero(r, limite, 'acimaDe', cl, { opcional: true });
          if (!tem(limite, 'abaixoDe') && !tem(limite, 'acimaDe')) r.erro(cl, 'falta "abaixoDe" ou "acimaDe"');
          if (abaixoDe !== undefined && acimaDe !== undefined && abaixoDe <= acimaDe) {
            r.aviso(cl, `nunca vale: nada fica abaixo de ${abaixoDe} e acima de ${acimaDe} ao mesmo tempo`);
          }
          n.indicador[ind] = {};
          if (abaixoDe !== undefined) n.indicador[ind].abaixoDe = abaixoDe;
          if (acimaDe !== undefined) n.indicador[ind].acimaDe = acimaDe;
        }
      }
    }
    return n;
  }

  function valoresPorIndicador(r, bruto, caminho, idx, ehFator) {
    if (!ehObjeto(bruto) || Object.keys(bruto).length === 0) {
      r.erro(caminho, 'precisa ser um objeto { indicador: número } com pelo menos um indicador');
      return {};
    }
    const n = {};
    for (const ind of Object.keys(bruto)) {
      const c = junta(caminho, ind);
      if (!referencia(r, ind, c, (id) => Object.hasOwn(idx.indicadores, id), 'indicador')) continue;
      const valor = numero(r, bruto, ind, caminho);
      if (valor === undefined) continue;
      if (ehFator && valor < 0) r.aviso(c, 'fator negativo inverte o sinal do delta do mês');
      n[ind] = valor;
    }
    return n;
  }

  function efeito(r, bruto, caminho, idx) {
    if (!ehObjeto(bruto)) {
      r.erro(caminho, 'efeito precisa ser um objeto');
      return null;
    }
    conferirChaves(r, bruto, CHAVES.efeito, caminho, true);
    const temSoma = tem(bruto, 'soma');
    const temFator = tem(bruto, 'multiplica');
    // Juntos, a ordem entre os dois dentro do mesmo efeito ficaria implícita, e
    // (d + 100) × 2 não é d × 2 + 100. Dois efeitos deixam a ordem explícita.
    if (temSoma && temFator) r.erro(caminho, '"soma" e "multiplica" no mesmo efeito: separe em dois efeitos (a ordem importa)');
    else if (!temSoma && !temFator) r.erro(caminho, 'efeito sem "soma" nem "multiplica"');
    const n = {};
    if (tem(bruto, 'se')) n.se = condicao(r, bruto.se, junta(caminho, 'se'), idx);
    if (temSoma) n.soma = valoresPorIndicador(r, bruto.soma, junta(caminho, 'soma'), idx, false);
    if (temFator) n.multiplica = valoresPorIndicador(r, bruto.multiplica, junta(caminho, 'multiplica'), idx, true);
    const rotulo = texto(r, bruto, 'rotulo', caminho, true);
    if (rotulo !== undefined) n.rotulo = rotulo;
    const fonte = texto(r, bruto, 'fonte', caminho, true);
    if (fonte !== undefined) n.fonte = fonte;
    return n;
  }

  function efeitos(r, obj, chave, caminho, idx, obrigatorio) {
    const c = junta(caminho, chave);
    if (!tem(obj, chave)) {
      if (obrigatorio) r.erro(c, 'campo obrigatório ausente (use [] para nenhum efeito)');
      return [];
    }
    if (!Array.isArray(obj[chave])) {
      r.erro(c, 'precisa ser uma lista de efeitos');
      return [];
    }
    return obj[chave].map((e, i) => efeito(r, e, `${c}[${i}]`, idx)).filter(Boolean);
  }

  // Texto opcional: ausente é ok, presente e vazio é erro.
  function copiarTextos(r, bruto, n, caminho, chaves) {
    for (const chave of chaves) {
      const valor = texto(r, bruto, chave, caminho, true);
      if (valor !== undefined) n[chave] = valor;
    }
  }

  // -------------------------------------------------------------- entidades

  function tempos(r, bruto) {
    const t = objeto(r, bruto, 'tempos', '');
    if (!t) return {};
    conferirChaves(r, t, CHAVES.tempos, 'tempos', false);
    const inteiroPositivo = { inteiro: true, positivo: true };
    const n = {
      enqueteSeg: numero(r, t, 'enqueteSeg', 'tempos', inteiroPositivo),
      decisaoSeg: numero(r, t, 'decisaoSeg', 'tempos', inteiroPositivo),
      decisaoMinSeg: numero(r, t, 'decisaoMinSeg', 'tempos', inteiroPositivo),
      prorrogacaoSeg: numero(r, t, 'prorrogacaoSeg', 'tempos', inteiroPositivo),
      gracaSeg: tem(t, 'gracaSeg') ? numero(r, t, 'gracaSeg', 'tempos', inteiroPositivo) : 5,
      pulsoSeg: tem(t, 'pulsoSeg') ? numero(r, t, 'pulsoSeg', 'tempos', inteiroPositivo) : 10,
    };
    if (n.decisaoMinSeg > n.decisaoSeg) {
      r.aviso('tempos.decisaoMinSeg', 'o tempo mínimo de conversa passa do tempo da decisão');
    }
    return n;
  }

  function regras(r, bruto) {
    const g = objeto(r, bruto, 'regras', '');
    if (!g) return {};
    conferirChaves(r, g, CHAVES.regras, 'regras', false);
    const n = {
      desempate: escolha(r, g, 'desempate', 'regras', VALORES_REGRAS.desempate),
      cartaPor: escolha(r, g, 'cartaPor', 'regras', VALORES_REGRAS.cartaPor),
      mostrarChances: escolha(r, g, 'mostrarChances', 'regras', VALORES_REGRAS.mostrarChances),
      placarPadrao: texto(r, g, 'placarPadrao', 'regras'),
      alvoPorEquipe: numero(r, g, 'alvoPorEquipe', 'regras', { inteiro: true, positivo: true }),
      minPareados: numero(r, g, 'minPareados', 'regras', { inteiro: true, positivo: true }),
      destacarCartas: numero(r, g, 'destacarCartas', 'regras', { inteiro: true, naoNegativo: true }),
    };
    return n;
  }

  function escala(r, bruto) {
    const e = objeto(r, bruto, 'escala', '');
    if (!e) return {};
    conferirChaves(r, e, CHAVES.escala, 'escala', false);
    const n = {};
    for (const chave of ['curtos', 'longos']) {
      const c = junta('escala', chave);
      const lista = e[chave];
      if (!Array.isArray(lista) || lista.length !== 5) {
        r.erro(c, 'precisa ter exatamente 5 rótulos, um para cada ponto de 1 a 5');
        continue;
      }
      lista.forEach((rotulo, i) => {
        if (typeof rotulo !== 'string') r.erro(`${c}[${i}]`, 'precisa ser texto');
        else if (rotulo.trim() === '') r.erro(`${c}[${i}]`, 'texto vazio');
      });
      n[chave] = lista.slice();
    }
    return n;
  }

  function indicador(r, b, c, id) {
    conferirChaves(r, b, CHAVES.indicador, c, false);
    const n = {
      id,
      nome: texto(r, b, 'nome', c),
      formato: escolha(r, b, 'formato', c, FORMATOS),
      inicial: numero(r, b, 'inicial', c),
      min: numero(r, b, 'min', c),
      max: numero(r, b, 'max', c),
    };
    copiarTextos(r, b, n, c, ['fonte']);
    if (n.min !== undefined && n.max !== undefined) {
      if (n.min >= n.max) r.erro(c, `"min" (${n.min}) precisa ser menor que "max" (${n.max})`);
      else if (n.inicial !== undefined && (n.inicial < n.min || n.inicial > n.max)) {
        r.erro(junta(c, 'inicial'), `${n.inicial} fora dos limites [${n.min}, ${n.max}]`);
      }
    }
    return n;
  }

  function persona(r, b, c, id, idx) {
    conferirChaves(r, b, CHAVES.persona, c, false);
    const n = { id, nome: texto(r, b, 'nome', c), descricao: texto(r, b, 'descricao', c), inicial: {}, todoMes: [] };
    copiarTextos(r, b, n, c, ['fonte']);
    if (tem(b, 'inicial')) {
      const ci = junta(c, 'inicial');
      if (!ehObjeto(b.inicial)) r.erro(ci, 'precisa ser um objeto { indicador: número }');
      else {
        for (const ind of Object.keys(b.inicial)) {
          const cind = junta(ci, ind);
          if (!referencia(r, ind, cind, (x) => Object.hasOwn(idx.indicadores, x), 'indicador')) continue;
          const valor = numero(r, b.inicial, ind, ci);
          if (valor === undefined) continue;
          const { min, max } = idx.indicadores[ind];
          if (valor < min || valor > max) r.erro(cind, `${valor} fora dos limites [${min}, ${max}]`);
          n.inicial[ind] = valor;
        }
      }
    }
    r.depois(() => { n.todoMes = efeitos(r, b, 'todoMes', c, idx, false); });
    return n;
  }

  function equipe(r, b, c, id, idx) {
    conferirChaves(r, b, CHAVES.equipe, c, false);
    const n = {
      id,
      nome: texto(r, b, 'nome', c),
      cor: texto(r, b, 'cor', c),
      forma: texto(r, b, 'forma', c),
      persona: undefined,
      obrigatoria: booleano(r, b, 'obrigatoria', c, false),
    };
    copiarTextos(r, b, n, c, ['lugar']);
    if (n.cor !== undefined && !RE_COR.test(n.cor)) {
      r.erro(junta(c, 'cor'), `cor ${JSON.stringify(n.cor)} inválida: use hexadecimal, como "#E69F00"`);
    }
    if (tem(b, 'persona')) {
      if (referencia(r, b.persona, junta(c, 'persona'), (x) => Object.hasOwn(idx.personas, x), 'persona')) n.persona = b.persona;
    } else r.erro(junta(c, 'persona'), 'campo obrigatório ausente');
    return n;
  }

  function opcao(r, b, c, id, idx) {
    conferirChaves(r, b, CHAVES.opcao, c, false);
    const n = { id, rotulo: texto(r, b, 'rotulo', c) };
    copiarTextos(r, b, n, c, ['narrativa', 'tendencia', 'fonte']);
    n.efeitos = [];
    r.depois(() => { n.efeitos = efeitos(r, b, 'efeitos', c, idx, true); });
    return n;
  }

  function rodada(r, b, c, id, idx) {
    conferirChaves(r, b, CHAVES.rodada, c, false);
    const n = { id, titulo: texto(r, b, 'titulo', c), texto: texto(r, b, 'texto', c), padrao: undefined, efeitosGerais: [] };
    copiarTextos(r, b, n, c, ['fonte']);
    const { mapa, ordem } = colecao(r, b, 'opcoes', c, (item, ci, oid) => opcao(r, item, ci, oid, idx));
    n.opcoes = mapa;
    n.ordemOpcoes = ordem;
    for (const oid of ordem) idx.opcoes.add(oid);
    if (tem(b, 'opcoes')) {
      if (ordem.length === 0) r.erro(junta(c, 'opcoes'), 'a rodada precisa de opções');
      else if (ordem.length === 1) r.aviso(junta(c, 'opcoes'), 'uma opção só: não há o que decidir');
    }
    // O padrão é o "piloto automático": vale quando ninguém da equipe vota.
    if (tem(b, 'padrao')) {
      if (referencia(r, b.padrao, junta(c, 'padrao'), (x) => Object.hasOwn(mapa, x), 'opção padrão')) n.padrao = b.padrao;
    } else r.erro(junta(c, 'padrao'), 'campo obrigatório ausente');
    r.depois(() => { n.efeitosGerais = efeitos(r, b, 'efeitosGerais', c, idx, false); });
    return n;
  }

  function carta(r, b, c, id, idx) {
    conferirChaves(r, b, CHAVES.carta, c, false);
    const n = { id, titulo: texto(r, b, 'titulo', c) };
    copiarTextos(r, b, n, c, ['narrativa']);
    n.peso = numero(r, b, 'peso', c, { inteiro: true, naoNegativo: true });
    if (tem(b, 'tom')) {
      if (b.tom === 'grave') n.tom = 'grave';
      else r.erro(junta(c, 'tom'), `valor ${JSON.stringify(b.tom)} inválido; o único tom é "grave"`);
    }
    copiarTextos(r, b, n, c, ['fonte']);
    n.ajustesDePeso = [];
    n.efeitos = [];
    r.depois(() => {
      if (tem(b, 'rodadas')) {
        // Lista vazia volta do RTDB como "sem restrição" (todas as rodadas): o
        // contrário do que estava escrito. Por isso é erro, e não aviso.
        if (Array.isArray(b.rodadas) && b.rodadas.length === 0) {
          r.erro(junta(c, 'rodadas'), 'lista vazia: a carta nunca sairia. Tire a chave para valer em todas as rodadas');
        } else {
          n.rodadas = idsOuLista(r, b.rodadas, junta(c, 'rodadas'), (x) => Object.hasOwn(idx.rodadas, x), 'rodada');
          if (typeof n.rodadas === 'string') n.rodadas = [n.rodadas];
        }
      }
      if (tem(b, 'somenteSe')) n.somenteSe = condicao(r, b.somenteSe, junta(c, 'somenteSe'), idx);
      if (tem(b, 'ajustesDePeso')) {
        const ca = junta(c, 'ajustesDePeso');
        if (!Array.isArray(b.ajustesDePeso)) r.erro(ca, 'precisa ser uma lista');
        else n.ajustesDePeso = b.ajustesDePeso.map((a, i) => ajuste(r, a, `${ca}[${i}]`, idx)).filter(Boolean);
      }
      n.efeitos = efeitos(r, b, 'efeitos', c, idx, true);
    });
    return n;
  }

  function ajuste(r, b, c, idx) {
    if (!ehObjeto(b)) {
      r.erro(c, 'ajuste precisa ser um objeto { se, soma | multiplica }');
      return null;
    }
    conferirChaves(r, b, CHAVES.ajuste, c, true);
    const n = {};
    if (tem(b, 'se')) n.se = condicao(r, b.se, junta(c, 'se'), idx);
    else r.erro(junta(c, 'se'), 'campo obrigatório ausente (o ajuste precisa de uma condição)');
    const temSoma = tem(b, 'soma');
    const temFator = tem(b, 'multiplica');
    if (temSoma && temFator) r.erro(c, '"soma" e "multiplica" no mesmo ajuste: separe em dois (a ordem importa)');
    else if (!temSoma && !temFator) r.erro(c, 'ajuste sem "soma" nem "multiplica"');
    if (temSoma) n.soma = numero(r, b, 'soma', c);
    if (temFator) n.multiplica = numero(r, b, 'multiplica', c, { naoNegativo: true });
    return n;
  }

  function afirmacao(r, b, c, id) {
    conferirChaves(r, b, CHAVES.afirmacao, c, false);
    const n = { id, texto: texto(r, b, 'texto', c) };
    if (n.texto !== undefined && n.texto.length > MAX_AFIRMACAO) {
      r.aviso(junta(c, 'texto'), `afirmação com ${n.texto.length} caracteres (mais de ${MAX_AFIRMACAO}): pode não caber no celular sem rolagem`);
    }
    return n;
  }

  function enquete(r, b, c, id) {
    conferirChaves(r, b, CHAVES.enquete, c, false);
    const n = {
      id,
      titulo: texto(r, b, 'titulo', c),
      pareada: booleano(r, b, 'pareada', c),
      revelar: escolha(r, b, 'revelar', c, REVELAR, 'ao_encerrar'),
      modo: escolha(r, b, 'modo', c, MODOS, 'todas'),
    };
    const { mapa, ordem } = colecao(r, b, 'afirmacoes', c, (item, ca, aid) => afirmacao(r, item, ca, aid));
    if (tem(b, 'afirmacoes') && ordem.length === 0) r.erro(junta(c, 'afirmacoes'), 'a enquete precisa de afirmações');
    n.afirmacoes = mapa;
    n.ordemAfirmacoes = ordem;
    return n;
  }

  function referenciaPlacar(r, b, c, id) {
    conferirChaves(r, b, CHAVES.referencia, c, false);
    const n = { id, nome: texto(r, b, 'nome', c), renda: numero(r, b, 'renda', c) };
    copiarTextos(r, b, n, c, ['fonte']);
    return n;
  }

  function passo(r, b, c, idx) {
    if (!ehObjeto(b)) {
      r.erro(c, 'passo precisa ser um objeto');
      return null;
    }
    conferirChaves(r, b, CHAVES.passo, c, false);
    const n = {};
    if (!tem(b, 'tipo')) r.erro(junta(c, 'tipo'), 'campo obrigatório ausente');
    else if (!TIPOS_PASSO.has(b.tipo)) {
      r.erro(junta(c, 'tipo'), `tipo de passo ${JSON.stringify(b.tipo)} inválido; use ${[...TIPOS_PASSO].join(' | ')}`);
    } else n.tipo = b.tipo;
    const alvo = numero(r, b, 'alvoSeg', c, { opcional: true, inteiro: true, positivo: true });
    if (alvo !== undefined) n.alvoSeg = alvo;
    if (tem(b, 'opcional')) n.opcional = booleano(r, b, 'opcional', c, false);
    copiarTextos(r, b, n, c, ['titulo']);
    if (n.tipo === 'bloco' && n.titulo === undefined && !tem(b, 'titulo')) {
      r.aviso(c, 'bloco sem "titulo": a tela de espera do telão fica sem o nome do trecho');
    }
    const precisaEnquete = n.tipo === 'enquete' || n.tipo === 'comparativo';
    if (tem(b, 'enquete') || precisaEnquete) {
      if (!tem(b, 'enquete')) r.erro(junta(c, 'enquete'), 'campo obrigatório ausente');
      else if (referencia(r, b.enquete, junta(c, 'enquete'), (x) => Object.hasOwn(idx.enquetes, x), 'enquete')) n.enquete = b.enquete;
    }
    if (tem(b, 'momento') || n.tipo === 'enquete') {
      if (!tem(b, 'momento')) r.erro(junta(c, 'momento'), 'campo obrigatório ausente');
      else if (!MOMENTOS.has(b.momento)) {
        r.erro(junta(c, 'momento'), `momento ${JSON.stringify(b.momento)} inválido; use antes | depois | unico`);
      } else n.momento = b.momento;
    }
    if (tem(b, 'rodada') || n.tipo === 'rodada') {
      if (!tem(b, 'rodada')) r.erro(junta(c, 'rodada'), 'campo obrigatório ausente');
      else if (referencia(r, b.rodada, junta(c, 'rodada'), (x) => Object.hasOwn(idx.rodadas, x), 'rodada')) n.rodada = b.rodada;
    }
    // Coerência entre a enquete e o momento: o comparativo antes × depois só
    // existe na enquete pareada (arquitetura, seção 9).
    const enq = n.enquete !== undefined ? idx.enquetes[n.enquete] : undefined;
    if (enq && n.tipo === 'enquete' && n.momento) {
      if (enq.pareada && n.momento === 'unico') r.aviso(c, `a enquete "${n.enquete}" é pareada: use o momento "antes" ou "depois"`);
      if (enq.pareada === false && n.momento !== 'unico') r.aviso(c, `a enquete "${n.enquete}" não é pareada: use o momento "unico"`);
    }
    if (enq && n.tipo === 'comparativo' && enq.pareada === false) {
      r.aviso(c, `comparativo de uma enquete não pareada ("${n.enquete}"): não há antes e depois`);
    }
    return n;
  }

  function roteiros(r, bruto, idx) {
    const obj = objeto(r, bruto, 'roteiros', '');
    const n = {};
    if (!obj) return n;
    const nomes = Object.keys(obj);
    if (nomes.length === 0) r.erro('roteiros', 'é preciso pelo menos um roteiro');
    for (const nome of nomes) {
      const c = junta('roteiros', nome);
      if (!RE_ROTEIRO.test(nome) || nome === '__proto__') {
        r.erro(c, `nome de roteiro inválido ${JSON.stringify(nome)}: use letras, números, _ ou -, até 24 caracteres e pelo menos uma letra`);
        continue;
      }
      if (!Array.isArray(obj[nome]) || obj[nome].length === 0) {
        r.erro(c, 'precisa ser uma lista não vazia de passos');
        continue;
      }
      const passos = obj[nome].map((p, i) => passo(r, p, `${c}[${i}]`, idx)).filter(Boolean);
      // sementes/{r}, resultados/{r} e enquetes/{e}/{m} são gravados uma vez só
      // (contratos seção 6): uma rodada ou enquete repetida travaria a aula no
      // segundo fechamento.
      const vistos = new Set();
      passos.forEach((p, i) => {
        let chave = null;
        if (p.tipo === 'rodada' && p.rodada) chave = `a rodada "${p.rodada}"`;
        if (p.tipo === 'enquete' && p.enquete && p.momento) chave = `a enquete "${p.enquete}" no momento "${p.momento}"`;
        if (chave === null) return;
        if (vistos.has(chave)) r.erro(`${c}[${i}]`, `${chave} aparece duas vezes no roteiro (o resultado é gravado uma vez só)`);
        vistos.add(chave);
      });
      conferirOrdem(r, c, passos);
      // "60min", "120min": o nome já diz o teto (arquitetura, seção 5).
      const teto = /^(\d+)min$/.exec(nome);
      const soma = passos.reduce((s, p) => s + (p.alvoSeg || 0), 0);
      if (teto && soma > Number(teto[1]) * 60) {
        r.aviso(c, `a soma dos tempos-alvo (${Math.round(soma / 60)} min) passa de ${teto[1]} min`);
      }
      n[nome] = passos;
    }
    return n;
  }

  // A ordem que a sessão exige (arquitetura seção 5). Fora dela a sala nasce e
  // quebra na aula: rodada antes das equipes joga sem equipe nenhuma (vai ao
  // sorteio sem resultado), personas antes delas deixam todo celular em "sem
  // equipe", e o "depois" antes do "antes" calcula a transição sem o "antes".
  function conferirOrdem(r, c, passos) {
    const formar = [];
    passos.forEach((p, i) => { if (p.tipo === 'formarEquipes') formar.push(i); });
    for (const i of formar.slice(1)) r.erro(`${c}[${i}]`, 'mais de um "formarEquipes": as equipes travam ao sair do primeiro');
    const primeiro = (enquete, momento) => passos.findIndex((p) => p.tipo === 'enquete' && p.enquete === enquete && p.momento === momento);
    passos.forEach((p, i) => {
      if (formar.length > 0 && i < formar[0] && (p.tipo === 'rodada' || p.tipo === 'personas')) {
        r.erro(`${c}[${i}]`, `passo "${p.tipo}" antes do "formarEquipes": ainda não há equipe para jogar`);
      }
      if (p.tipo === 'enquete' && p.momento === 'depois' && primeiro(p.enquete, 'antes') > i) {
        r.erro(`${c}[${i}]`, `o "depois" da enquete "${p.enquete}" vem antes do "antes": a transição seria calculada sem ele`);
      }
      if (p.tipo === 'comparativo' && primeiro(p.enquete, 'depois') > i) {
        r.aviso(`${c}[${i}]`, `comparativo da enquete "${p.enquete}" antes do "depois": ainda não há o que comparar`);
      }
    });
  }

  // ----------------------------------------------- conferências cruzadas

  function conferirEquipes(r, cfg) {
    const { equipes, personas, ordem } = cfg;
    if (ordem.equipes.length > MAX_EQUIPES) {
      r.erro('equipes', `${ordem.equipes.length} equipes: o máximo é ${MAX_EQUIPES}`);
    }
    // Cor e forma distintas: a paleta Okabe-Ito vem com forma porque parte da
    // turma pode ser daltônica, e duas equipes iguais seriam indistinguíveis no
    // projetor (D-016, risco R21).
    const porCor = new Map();
    const porForma = new Map();
    for (const id of ordem.equipes) {
      const e = equipes[id];
      if (e.cor) {
        const cor = normalizarCor(e.cor);
        if (porCor.has(cor)) r.erro(`equipes.${id}.cor`, `cor repetida com a equipe "${porCor.get(cor)}"`);
        else porCor.set(cor, id);
      }
      if (e.forma) {
        const forma = e.forma.trim().toLowerCase();
        if (porForma.has(forma)) r.erro(`equipes.${id}.forma`, `forma repetida com a equipe "${porForma.get(forma)}"`);
        else porForma.set(forma, id);
      }
    }
    // Persona compartilhada por duas equipes é de propósito (D-004): mostra ao
    // vivo que a diferença entre elas é sorte. Persona sem equipe só não joga.
    const usadas = new Set(ordem.equipes.map((id) => equipes[id].persona));
    for (const id of ordem.personas) {
      if (!usadas.has(id)) r.aviso(`personas.${id}`, `a persona "${personas[id].nome || id}" não tem equipe`);
    }
  }

  function normalizarCor(cor) {
    const h = cor.toLowerCase();
    return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
  }

  function conferirPlacar(r, cfg) {
    // O placar decomposto é sempre da renda (contratos seção 3).
    if (!Object.hasOwn(cfg.indicadores, 'renda')) r.erro('indicadores', 'falta o indicador "renda": o placar é decomposto nele');
    const p = cfg.regras.placarPadrao;
    if (p !== undefined && !PLACAR_DERIVADO.has(p) && !(idValido(p, RE_ID) && Object.hasOwn(cfg.indicadores, p))) {
      r.erro('regras.placarPadrao', `critério ${JSON.stringify(p)} inválido; use um indicador ou ${[...PLACAR_DERIVADO].join(' | ')}`);
    }
  }

  // Pelo menos uma carta possível em cada persona × opção × rodada, em TODO estado
  // alcançável: somenteSe e ajustesDePeso leem indicadores, então um baralho pode
  // ficar vazio só depois de um mês ruim. As rodadas seguem a ordem de CADA
  // roteiro, que é a ordem em que o anfitrião as aplica (e não a do config). O
  // estado de antes de cada rodada também vale depois dela, porque o
  // apresentador pode pular uma rodada no dia.
  function conferirCartasPossiveis(r, cfg) {
    const M = raiz.Viracao.motor;
    if (!M) {
      r.aviso('cartas', 'motor não carregado: a conferência de carta possível foi pulada');
      return;
    }
    const sequencias = new Map();
    for (const passos of Object.values(cfg.roteiros)) {
      const seq = passos.filter((p) => p.tipo === 'rodada').map((p) => p.rodada);
      sequencias.set(seq.join('|'), seq);
    }
    const jaAvisado = new Set();
    for (const equipeId of cfg.ordem.equipes) {
      for (const seq of sequencias.values()) {
        if (!explorarSequencia(r, cfg, M, equipeId, seq, jaAvisado)) return;
      }
    }
  }

  // Devolve false quando passa de MAX_ESTADOS. Isso é erro, e não aviso: sem a
  // conferência não há a garantia, e uma carta impossível trava o encerrar da
  // rodada na aula.
  function explorarSequencia(r, cfg, M, equipeId, seq, jaAvisado) {
    const chaveEstado = (e) => cfg.ordem.indicadores.map((i) => e[i]).join('|');
    const personaId = cfg.equipes[equipeId].persona;
    const estados = [M.estadoInicial(cfg, equipeId)];
    const vistos = new Set(estados.map(chaveEstado));
    for (const [k, rodadaId] of seq.entries()) {
      const rodada = cfg.rodadas[rodadaId];
      // Depois da última rodada não há baralho a conferir: gerar esses estados
      // só gastaria tempo e contaria para o limite.
      const ultima = k === seq.length - 1;
      const novos = [];
      for (const opcaoId of rodada.ordemOpcoes) {
        for (const estado of estados) {
          const baralho = M.chances(cfg, { equipeId, rodadaId, opcaoId, estado });
          if (baralho.length === 0) {
            const chave = `${personaId}|${rodadaId}|${opcaoId}`;
            if (!jaAvisado.has(chave)) {
              jaAvisado.add(chave);
              const quando = estado === estados[0] ? 'desde o início' : `no estado ${chaveEstado(estado)} (${cfg.ordem.indicadores.join('|')})`;
              r.erro(`rodadas.${rodadaId}.opcoes.${opcaoId}`,
                `nenhuma carta possível para a persona "${personaId}" (equipe ${equipeId}) nesta opção, ${quando}: a soma dos pesos dá 0`);
            }
            break;
          }
          if (ultima) continue;
          for (const c of baralho) {
            novos.push(M.aplicar(cfg, { equipeId, rodadaId, opcaoId, cartaId: c.carta, estado }).depois);
          }
        }
      }
      for (const e of novos) {
        const chave = chaveEstado(e);
        if (!vistos.has(chave)) {
          vistos.add(chave);
          estados.push(e);
        }
      }
      if (estados.length > MAX_ESTADOS) {
        r.erro('cartas', `mais de ${MAX_ESTADOS} estados alcançáveis depois da rodada "${rodadaId}" (equipe ${equipeId}): não dá para garantir carta possível; reduza as combinações de efeitos`);
        return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------- entrada

  function validar(bruto) {
    const r = novoRelatorio();
    if (!ehObjeto(bruto)) {
      r.erro('', 'o config precisa ser um objeto JSON');
      return { ok: false, erros: r.erros, avisos: r.avisos, config: null };
    }
    conferirChaves(r, bruto, CHAVES.raiz, '', false);
    // idx: o que as referências cruzadas consultam. As opções de todas as rodadas
    // entram num conjunto só, porque carta e persona valem em qualquer rodada.
    const idx = { indicadores: {}, personas: {}, equipes: {}, rodadas: {}, enquetes: {}, opcoes: new Set() };
    const cfg = {
      versao: texto(r, bruto, 'versao', ''),
      titulo: texto(r, bruto, 'titulo', ''),
      tempos: tempos(r, bruto),
      regras: regras(r, bruto),
      escala: escala(r, bruto),
    };
    const ordem = {};
    const montar = (chave, normalizar, opcoes) => {
      const { mapa, ordem: o } = colecao(r, bruto, chave, '', normalizar, opcoes);
      if (tem(bruto, chave) && o.length === 0 && !(opcoes && opcoes.podeVazia)) r.erro(chave, 'lista vazia');
      cfg[chave] = mapa;
      ordem[chave] = o;
      if (Object.hasOwn(idx, chave)) idx[chave] = mapa;
    };
    montar('indicadores', (b, c, id) => indicador(r, b, c, id));
    montar('personas', (b, c, id) => persona(r, b, c, id, idx));
    montar('equipes', (b, c, id) => equipe(r, b, c, id, idx), { re: RE_EQUIPE, descricaoId: 'e seguido de 1 ou 2 algarismos (e1 … e6)' });
    montar('rodadas', (b, c, id) => rodada(r, b, c, id, idx));
    montar('cartas', (b, c, id) => carta(r, b, c, id, idx));
    montar('enquetes', (b, c, id) => enquete(r, b, c, id), { podeVazia: true });
    montar('referencias', (b, c, id) => referenciaPlacar(r, b, c, id), { opcional: true, podeVazia: true });
    // Referências cruzadas (efeitos, condições, rodadas das cartas) só agora,
    // com todos os ids conhecidos: a ordem das seções no arquivo não importa.
    for (const fn of r.pendentes) fn();
    cfg.roteiros = roteiros(r, bruto, idx);
    cfg.ordem = ordem;
    conferirEquipes(r, cfg);
    conferirPlacar(r, cfg);
    // Só com o config sem erro: o motor confia no formato normalizado.
    if (r.erros.length === 0) conferirCartasPossiveis(r, cfg);
    const ok = r.erros.length === 0;
    return { ok, erros: r.erros, avisos: r.avisos, config: ok ? cfg : null };
  }

  // Do texto do arquivo: BOM, acento corrompido e JSON quebrado, com linha e
  // coluna. É por aqui que o telão lê o config.json (fetch ou seletor de arquivo).
  function validarTexto(textoBruto) {
    const erros = [];
    const avisos = [];
    if (typeof textoBruto !== 'string') {
      erros.push({ caminho: '(arquivo)', mensagem: 'o conteúdo do arquivo precisa ser texto' });
      return { ok: false, erros, avisos, config: null };
    }
    let conteudo = textoBruto;
    if (conteudo.charCodeAt(0) === 0xFEFF) {
      conteudo = conteudo.slice(1);
      avisos.push({ caminho: '(arquivo)', mensagem: 'BOM no início do arquivo removido; salve como "UTF-8" sem BOM' });
    }
    // "Ã©" e "â€" são UTF-8 lido como Windows-1252 e salvo de novo: é o que o
    // Set-Content do PowerShell 5.1 faz. "NÃO" não casa (O fica fora de 0x80-0xBF).
    const linhas = conteudo.split('\n');
    const corrompidas = [];
    linhas.forEach((linha, i) => { if (/Ã[\u0080-¿]|â€/.test(linha)) corrompidas.push(i + 1); });
    if (corrompidas.length > 0) {
      const mostradas = corrompidas.slice(0, 10).join(', ') + (corrompidas.length > 10 ? ` e mais ${corrompidas.length - 10}` : '');
      erros.push({
        caminho: `(arquivo) linha ${mostradas}`,
        mensagem: 'acento corrompido ("Ã©", "â€"): o arquivo foi regravado com a codificação errada, como faz o PowerShell 5.1. Volte à versão anterior ou corrija num editor em UTF-8',
      });
    }
    let bruto;
    try {
      bruto = JSON.parse(conteudo);
    } catch (e) {
      erros.push({ caminho: '(arquivo)' + localDoErro(e.message, conteudo), mensagem: 'JSON inválido: ' + e.message });
      return { ok: false, erros, avisos, config: null };
    }
    const r = validar(bruto);
    const ok = erros.length === 0 && r.ok;
    return { ok, erros: erros.concat(r.erros), avisos: avisos.concat(r.avisos), config: ok ? r.config : null };
  }

  // O V8 (Chrome, Edge, Node) diz "position N (line L column C)"; o Firefox diz
  // "at line L column C". Quem não disser nada fica sem local.
  function localDoErro(mensagem, conteudo) {
    const lc = /line (\d+) column (\d+)/.exec(mensagem);
    if (lc) return ` linha ${lc[1]}, coluna ${lc[2]}`;
    const pos = /position (\d+)/.exec(mensagem);
    if (!pos) return '';
    const antes = conteudo.slice(0, Number(pos[1])).split('\n');
    return ` linha ${antes.length}, coluna ${antes[antes.length - 1].length + 1}`;
  }

  // JSON com chaves ordenadas. Sem nulos, sem listas nem objetos vazios, porque o
  // RTDB some com eles: o hash do conteúdo que volta da sala bate com o do
  // pendrive, e é essa comparação que o telão mostra (arquitetura, seção 11).
  function canonico(x) {
    if (Array.isArray(x)) return '[' + x.map(canonico).join(',') + ']';
    if (ehObjeto(x)) {
      const partes = [];
      for (const k of Object.keys(x).sort()) {
        const v = x[k];
        if (v === undefined || v === null) continue;
        if (Array.isArray(v) && v.length === 0) continue;
        if (ehObjeto(v) && Object.keys(v).length === 0) continue;
        partes.push(JSON.stringify(k) + ':' + canonico(v));
      }
      return '{' + partes.join(',') + '}';
    }
    return JSON.stringify(x);
  }

  // FNV-1a de 32 bits sobre as unidades UTF-16: basta para detectar "o pendrive
  // não é a mesma versão da sala"; não é assinatura.
  function hash(config) {
    const s = canonico(config);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  V.validarConfig = { validar, validarTexto, hash };
})(globalThis);
