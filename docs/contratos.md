# Contratos entre os módulos

A especificação está em [arquitetura.md](arquitetura.md). Este arquivo fixa as
**assinaturas** que um módulo espera do outro, para que partes escritas em
paralelo se encaixem. Mudou uma assinatura? Mude aqui primeiro, no mesmo commit.

Convenções:
- Todo módulo do site é um script clássico, uma IIFE que registra o que exporta
  em `globalThis.Viracao.<nome>`.
- Nenhuma função do núcleo lê `Date.now()`, `Math.random()`, DOM ou rede.
- Um id é uma string curta `[a-z0-9_]{1,24}`. Os ids de equipe seguem `e[0-9]{1,2}`.

---

## 1. Config normalizado

`Viracao.validarConfig.validar(bruto)` devolve:

```
{ ok: boolean, erros: [{ caminho, mensagem }], avisos: [{ caminho, mensagem }], config }
```

O `config` normalizado é o que vai para o nó `conteudo` do banco, e é o que
**todo** o resto do código lê. O RTDB devolve os filhos ordenados pela chave e
guarda arrays como objetos, por isso as listas viram mapas por id, e a ordem de
exibição fica num array de strings.

```
{
  versao, titulo,
  tempos:  { enqueteSeg, decisaoSeg, decisaoMinSeg, prorrogacaoSeg, gracaSeg, pulsoSeg? },
  regras:  { desempate, cartaPor, mostrarChances, placarPadrao, alvoPorEquipe, minPareados, destacarCartas },
  escala:  { curtos: [5 strings], longos: [5 strings] },
  indicadores: { [id]: { id, nome, formato: "moeda"|"inteiro", inicial, min, max } },
  personas:    { [id]: { id, nome, descricao, inicial: { [ind]: n }, todoMes: [Efeito], fonte? } },
  equipes:     { [id]: { id, nome, cor, forma, persona, obrigatoria: boolean, lugar? } },
  rodadas:     { [id]: { id, titulo, texto, padrao, efeitosGerais: [Efeito],
                         opcoes: { [id]: { id, rotulo, narrativa?, tendencia?, efeitos: [Efeito] } },
                         ordemOpcoes: [ids] } },
  cartas:      { [id]: { id, titulo, narrativa?, peso, rodadas?: [ids], somenteSe?: Condicao,
                         ajustesDePeso: [{ se: Condicao, soma?: n, multiplica?: n }],
                         efeitos: [Efeito], tom?: "grave", fonte? } },
  enquetes:    { [id]: { id, titulo, pareada: boolean, revelar: "ao_vivo"|"ao_encerrar"|"so_no_comparativo",
                         modo: "todas"|"uma_por_vez",
                         afirmacoes: { [id]: { id, texto } }, ordemAfirmacoes: [ids] } },
  referencias: { [id]: { id, nome, renda, fonte? } },
  roteiros:    { [nome]: [Passo] },
  ordem: { indicadores: [], personas: [], equipes: [], rodadas: [], cartas: [], enquetes: [], referencias: [] }
}
```

**Tipos:**
- `Condicao = { opcao?, persona?, equipe?, rodada?, indicador?: { [ind]: { abaixoDe?: n, acimaDe?: n } } }`
  - `opcao`, `persona`, `equipe` e `rodada` aceitam um id ou uma lista de ids;
  - todas as chaves presentes precisam valer ao mesmo tempo;
  - qualquer chave fora dessas é erro.
- `Efeito = { se?: Condicao, soma?: { [ind]: n }, multiplica?: { [ind]: n }, rotulo?, fonte? }`, com
  `soma` **ou** `multiplica`, nunca os dois.
- `Passo = { tipo, alvoSeg?, opcional?, titulo?, enquete?, momento?, rodada? }`
  - `tipo` ∈ `lobby | enquete | bloco | formarEquipes | personas | rodada | placarFinal | comparativo | fim`;
  - `momento` ∈ `antes | depois | unico`.

**Valores padrão aplicados pela normalização** (o JSON pode omitir):
- `obrigatoria: false`, `efeitosGerais: []`, `ajustesDePeso: []`, `todoMes: []`, `inicial: {}`;
- `modo: "todas"`, `revelar: "ao_encerrar"`, `referencias: {}`;
- `tempos.gracaSeg: 5`, `tempos.pulsoSeg: 10`.

`Viracao.validarConfig.hash(config)` devolve um hash estável (FNV-1a de um JSON com
chaves ordenadas), usado para comparar a versão do telão com a do pendrive.

---

## 2. `Viracao.sorte`

| Função | O que faz |
|---|---|
| `gerador(semente: uint32) → () => número em [0,1)` | mulberry32 |
| `derivar(semente: uint32, rotulo: string) → uint32` | semente independente por uso, por exemplo `derivar(s, 'carta:e3')` e `derivar(s, 'moeda:e3')` |
| `sortearPonderado(itens: [{ id, peso }], aleatorio) → id` | peso 0 nunca sai; soma 0 é erro |

Com `derivar`, o sorteio de uma equipe **não depende** de quais outras equipes
estão ativas nem da ordem em que são processadas. Semente nova não sai daqui: ela é
injetada (`gerarSemente` no anfitrião, que no telão usa `crypto.getRandomValues`).

---

## 3. `Viracao.motor`

`EstadoEquipe = { [indicador]: número }`

| Função | O que faz |
|---|---|
| `estadoInicial(config, equipeId) → EstadoEquipe` | `indicadores.inicial`, sobrescrito por `persona.inicial` |
| `condicaoVale(config, cond, ctx) → boolean` | `ctx = { equipeId, personaId, rodadaId, opcaoId, estado }` |
| `chances(config, { equipeId, rodadaId, opcaoId, estado }) → [{ carta, peso, chance }]` | cartas elegíveis (`rodadas`, `somenteSe`), com `ajustesDePeso` aplicados; as chances somam 1 |
| `resolverRodada(config, { equipeId, rodadaId, opcaoId, estado, semente }) → Resultado` | usa `sorte.gerador(sorte.derivar(semente, 'carta:'+equipeId))` |
| `aplicar(config, { equipeId, rodadaId, opcaoId, cartaId, estado }) → { delta, depois, linhas }` | a parte determinística, usada pela enumeração |
| `consolidarDecisao(config, { rodadaId, votos, forcada, aposProrrogacao, semente, equipeId }) → Consolidacao` | ver abaixo |
| `decompor(config, { equipeId, rodadas: [{ rodadaId, opcaoId, cartaId }] }) → Decomposicao` | enumeração exata dos caminhos de cartas |

- `Resultado = { carta, chances, delta, depois, linhas: [{ origem: "persona"|"geral"|"opcao"|"carta", rotulo, indicador, valor }] }`
- `Consolidacao = { decisao: id|null, origem: "maioria"|"prorrogacao"|"moeda"|"piloto"|"apresentador", contagem: { [opcao]: n }, empate: [ids]|null }`
  - `votos = { [uid]: opcaoId }`: votos já filtrados para membros da equipe e para opções válidas.
  - `forcada`, se presente, vence tudo, com `origem: "apresentador"`.
  - Sem votos, vale `rodada.padrao`, com `origem: "piloto"`.
  - Com empate e `aposProrrogacao` falso, a função devolve `decisao: null` e `empate` com as opções empatadas; o anfitrião abre então a prorrogação.
  - Com empate depois da prorrogação, a moeda sorteia entre os empatados com `derivar(semente, 'moeda:'+equipeId)`, com `origem: "moeda"`.
  - Maioria depois da prorrogação tem `origem: "prorrogacao"`.
- `Decomposicao = { realizado, esperadoComDecisoes, esperadoPiloto, efeitoDecisoes, sorte, piorCaso }`, sempre para o indicador `renda`:
  - `esperadoPiloto`: o esperado se todas as rodadas jogadas tivessem ficado no `padrao`;
  - `efeitoDecisoes = esperadoComDecisoes - esperadoPiloto`;
  - `sorte = realizado - esperadoComDecisoes`;
  - `piorCaso`: a menor renda possível com as decisões tomadas.

**Semântica dos efeitos** (arquitetura, seção 7):
- o delta de cada indicador começa em 0;
- ordem de aplicação: `persona.todoMes` → `rodada.efeitosGerais` → opção → carta;
- `soma` adiciona ao delta, e `multiplica` multiplica o delta daquele indicador;
- toda condição lê o estado **antes** da rodada;
- no fim, `depois = clamp(estado + delta, min, max)`.

---

## 4. `Viracao.enquete`

| Função | O que faz |
|---|---|
| `histograma(votos: { [uid]: 1..5 }) → [c1, c2, c3, c4, c5]` | ignora valores fora de 1..5 |
| `resumo(hist) → { n, mediana, media, discorda, neutro, concorda }` | frações de 0 a 1; com n = 0, `mediana` e `media` valem `null` |
| `apurar(enquete, votosPorAfirmacao: { [afirm]: { [uid]: v } }) → { histogramas: { [afirm]: hist }, n: { [afirm]: n } }` | o que se grava em `enquetes/{e}/{m}` |
| `transicao(votosAntes, votosDepois) → { matriz: 5×5, pares, mais, igual, menos, soAntes, soDepois }` | pareamento por uid, só de quem votou nas duas vezes |
| `podeComparar(enqAntes, enqDepois, minPareados) → { comparar: boolean, motivo }` | recusa se o `metodo` difere, se falta um dos lados ou se há menos de `minPareados` pares |

---

## 5. `Viracao.roteiro`

| Função | O que faz |
|---|---|
| `passos(config, nomeRoteiro) → [Passo & { indice }]` | lista pronta para o anfitrião |
| `subfasesDe(tipo) → [string]` | `enquete`: `votando, fechando, apurada`. `rodada`: `decidindo, fechando, prorrogacao, sorteio, resultado`. Os outros tipos: `ativo` |
| `somaAlvos(passos) → segundos` | |
| `atrasoSeg(passos, indiceAtual, inicioSessaoMs, agoraMs) → número` | tempo decorrido menos a soma dos `alvoSeg` dos passos anteriores; positivo significa atraso |
| `proximoIndice(passos, indice)` / `indiceValido(passos, indice)` | |

---

## 6. Canal (a mesma interface em `canal-local.js` e `canal-firebase.js`)

Criação:
- `Viracao.canalLocal.criar({ persistirEm?: chaveLocalStorage, travas?: true, relogio?: () => ms })`
- `Viracao.canalFirebase.criar({ sdk, conexao, longPolling? })`

| Método | O que faz |
|---|---|
| `entrar() → Promise<uid>` | login anônimo |
| `ler(caminho) → Promise<valor|null>` | vem do servidor, nunca do cache |
| `ouvir(caminho, cb(valor)) → desligar()` | |
| `gravar({ caminho: valor|null, … }) → Promise` | update atômico de vários caminhos; `null` apaga |
| `transacao(caminho, fn(atual) → novo|undefined) → Promise<{ confirmado, valor }>` | `undefined` aborta |
| `agora() → ms` | hora do servidor online; `relogio()` no local |
| `aoMudarConexao(cb(conectado)) → desligar()` | |
| `marcadorDeHora()` | o valor que o servidor troca pela hora dele (`serverTimestamp()` online; `agora()` no local) |

Só no local:
- `comoUsuario(uid) → canal`: uma visão do mesmo armazenamento, autenticada como outro uid. Permite simular 20 celulares num processo só.
- `exportar()` e `importar(json)`.

**Travas do `canal-local`** (espelham `firebase/regras.json`, para os testes pegarem erro do anfitrião sem rede). Violar uma delas rejeita a gravação com `Error('PERMISSION_DENIED: <motivo>')`:
- escrita em `estado` exige `geracao = anterior + 1`;
- `resultados/{r}`, `enquetes/{e}/{m}` e `sementes/{r}` são gravados uma vez só; apagar é permitido, menos em `sementes`;
- voto de enquete ou de decisão só vale com a subfase certa e dentro de `prazo + graça`;
- aluno só escreve em chaves do próprio uid.

---

## 7. `Viracao.anfitriao`

`Viracao.anfitriao.criar({ canal, config, sala, nomeRoteiro, agora, gerarSemente, uid, aoMudar? })` devolve:

| Método | O que faz |
|---|---|
| `criarSala() → Promise` | grava `meta`, `conteudo` e `estado` inicial (`geracao` 1, índice 0); sala expira em 12 h |
| `avancar()` / `encerrar()` / `desfazer()` / `pularPara(indice)` | transições com `transacao` sobre a `geracao` |
| `maisTempo(seg)` / `pausar()` / `retomar()` | |
| `decidirPorEquipe(equipeId, opcaoId)` | grava `estado.forcadas` |
| `moverMembro(uid, equipeId)` / `removerInativos(limiteMs)` / `abrirEntrada(bool)` / `definirEquipesAbertas(ids)` | |
| `contagemManual(afirmacaoId, histograma)` | só offline; a apuração grava `metodo: "manual"` |
| `exportarTotais() → objeto` | só agregados; **nunca** uid |
| `apagarSala() → Promise` | |
| `estado() → estado atual` | |

**Fechamento em duas fases** (enquete e rodada):
1. `subfase = "fechando"`, com `geracao + 1`;
2. espera a confirmação;
3. na rodada, grava `sementes/{r}` uma vez;
4. `ler()` dos votos;
5. apura;
6. um único `gravar()` com `estado` (`geracao + 1`) mais `resultados`, `placar` ou `enquetes`.

Na rodada, se houver empate, o passo 5 abre a `prorrogacao` (`prazo` novo, `prorrogacaoSeg`) **só** para as equipes empatadas. Ao encerrar a prorrogação, o fechamento em duas fases roda de novo, com `aposProrrogacao: true`.

`desfazer()` apaga `resultados/{r}` e `placar`, e **nunca** `sementes/{r}`. Refazer usa a mesma semente.

---

## 8. `Viracao.alunoLogica`

| Função | O que faz |
|---|---|
| `telaDoAluno({ conteudo, estado, membro, meusVotos, decisoesDaEquipe, resultados, placar, uid, agora }) → { tipo, dados }` | ver os tipos abaixo |
| `sugerirEquipe(conteudo, { membros, ativos, equipesAbertas }) → equipeId` | completa até `alvoPorEquipe`, na ordem do config |
| `pendenteAindaVale(pendente, estado) → boolean` | o voto guardado ainda pode ser reenviado? |
| `cracha(uid, equipe) → "Laranja · K7Q"` | derivado do uid, não pessoal |

Tipos de tela: `aguardando`, `enquete`, `enqueteRegistrada`, `escolherEquipe`, `persona`, `situacao`, `decisao`, `prorrogacao`, `sorteando`, `resultado`, `comparativo`, `fim`, `entradaFechada`.
