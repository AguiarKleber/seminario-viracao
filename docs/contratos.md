# Contratos entre os módulos

A especificação está em [arquitetura.md](arquitetura.md). Este arquivo fixa as
**assinaturas** que um módulo espera do outro, para que partes escritas em
paralelo se encaixem. Mudou uma assinatura? Mude aqui primeiro, no mesmo commit.

Convenções:
- Todo módulo do site é um script clássico, uma IIFE que registra o que exporta
  em `globalThis.Viracao.<nome>`.
- Nenhuma função do núcleo lê `Date.now()`, `Math.random()`, DOM ou rede.
- Um id é uma string curta `[a-z0-9_]{1,24}` com pelo menos uma letra ou `_` (o RTDB devolve
  um mapa de chaves só numéricas como lista). Os ids de equipe seguem `e[0-9]{1,2}`.

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
chaves ordenadas), usado para comparar a versão do telão com a do pendrive. O hash ignora
`null`, listas vazias e objetos vazios, porque o RTDB some com eles: o conteúdo lido da sala
tem o mesmo hash do config normalizado.

**Conferências do roteiro e das cartas** (erro bloqueia a sala):
- ordem: `rodada` ou `personas` antes do `formarEquipes` (quando ele existe) é erro; mais de um
  `formarEquipes` é erro; o `depois` de uma enquete antes do `antes` dela é erro; o `comparativo`
  antes do `depois` da mesma enquete é aviso;
- nome de roteiro: `[A-Za-z0-9_-]{1,24}` com pelo menos uma letra, `_` ou `-`;
- "carta possível" é conferida na ordem das rodadas de **cada roteiro** (a ordem em que o
  anfitrião aplica), acumulando o estado de antes de cada rodada (rodada pulada). Passar de
  20.000 estados alcançáveis é **erro**: sem a conferência não há a garantia.

`Viracao.validarConfig.validarTexto(texto)` devolve o mesmo formato de `validar`, a partir do
texto do arquivo: remove o BOM (aviso), recusa acento corrompido ("Ã©", "â€") com as linhas, e
dá linha e coluna do JSON quebrado. `config` é `null` sempre que houver erro. As opções da
rodada e as demais coleções aceitam lista de objetos com `id` ou mapa por id.

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
| `chances(config, { equipeId, rodadaId, opcaoId, estado }) → [{ carta, peso, chance }]` | cartas elegíveis (`rodadas`, `somenteSe`), com `ajustesDePeso` aplicados na ordem do config; só entram as de peso ajustado > 0 (lista vazia = nenhuma carta possível); as chances somam 1 |
| `resolverRodada(config, { equipeId, rodadaId, opcaoId, estado, semente }) → Resultado` | usa `sorte.gerador(sorte.derivar(semente, 'carta:'+equipeId))` |
| `aplicar(config, { equipeId, rodadaId, opcaoId, cartaId, estado }) → { delta, depois, linhas }` | a parte determinística, usada pela enumeração; `delta` é o de antes do clamp |
| `consolidarDecisao(config, { rodadaId, votos, forcada, aposProrrogacao, semente, equipeId, candidatas? }) → Consolidacao` | ver abaixo |
| `decompor(config, { equipeId, rodadas: [{ rodadaId, opcaoId, cartaId }] }) → Decomposicao` | enumeração exata dos caminhos de cartas |

- `Resultado = { carta, chances, delta, depois, linhas: [{ origem: "persona"|"geral"|"opcao"|"carta", rotulo, indicador, valor }] }`
- `Consolidacao = { decisao: id|null, origem: "maioria"|"prorrogacao"|"moeda"|"piloto"|"apresentador"|null, contagem: { [opcao]: n }, empate: [ids]|null }`
  - `votos = { [uid]: opcaoId }`: votos já filtrados para membros da equipe e para opções válidas.
  - `contagem` traz todas as opções da rodada, com 0 nas que não tiveram voto.
  - `forcada`, se presente, vence tudo, com `origem: "apresentador"`; opção inexistente lança erro.
  - Sem votos, vale `rodada.padrao`, com `origem: "piloto"`.
  - Com empate e `aposProrrogacao` falso, a função devolve `decisao: null`, `origem: null` e `empate` com as opções empatadas, na ordem do config; o anfitrião abre então a prorrogação.
  - Com empate depois da prorrogação, a moeda sorteia entre os empatados com `derivar(semente, 'moeda:'+equipeId)`, com `origem: "moeda"`.
  - Maioria depois da prorrogação tem `origem: "prorrogacao"`.
  - `candidatas` (lista de opções, opcional): maioria, empate e moeda consideram só essas opções.
    O anfitrião passa as opções de `estado.empatadas[equipe]` no fechamento da prorrogação, para
    que o voto antigo de quem saiu da equipe não faça uma opção de fora vencer. `contagem` continua
    com todas as opções, e sem nenhum voto vale o `padrao` (piloto). Lista sem nenhuma opção da
    rodada é ignorada.
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
| `histograma(votos: { [uid]: 1..5 }) → [c1, c2, c3, c4, c5]` | ignora o que não for inteiro de 1 a 5 (`0`, `6`, `2.5`, `"5"`); `null` dá tudo zero |
| `resumo(hist) → { n, mediana, media, discorda, neutro, concorda }` | frações de 0 a 1; com n = 0, `mediana`, `media` **e as três frações** valem `null` ("sem votos", nunca zero); histograma que não seja 5 inteiros ≥ 0 lança `TypeError` |
| `apurar(enquete, votosPorAfirmacao: { [afirm]: { [uid]: v } }) → { histogramas: { [afirm]: hist }, n: { [afirm]: n } }` | o que se grava em `enquetes/{e}/{m}`; traz toda afirmação do config, mesmo sem voto, e ignora afirmação que não está nele |
| `transicao(votosAntes, votosDepois) → { matriz: 5×5, pares, mais, igual, menos, soAntes, soDepois }` | pareamento por uid, só de quem votou nas duas vezes, para **uma** afirmação |
| `podeComparar(enqAntes, enqDepois, minPareados) → { comparar: boolean, caso, motivo }` | recusa se o `metodo` difere, se falta um dos lados ou se há menos de `minPareados` pares |

- **Mediana com n par:** a média dos dois votos centrais, que pode dar x,5 (votos 2, 3, 4, 5 → 3,5). É a única convenção simétrica: pegar sempre o central de baixo puxaria toda turma par para a discordância.
- **`transicao`:** `matriz[antes - 1][depois - 1]`. `mais` é quem subiu na escala (foi para mais concordância). Voto inválido conta como ausente, então quem tem só um voto válido entra em `soAntes` ou `soDepois`.
- **Onde a transição fica gravada:** na apuração do `depois`, uma por afirmação: `enquetes/{e}/depois/transicao = { [afirm]: resultado de transicao() }`. É o anfitrião que grava, porque só no fechamento do `depois` os dois lados existem.
- **`podeComparar`:** `enqAntes` e `enqDepois` são as apurações gravadas em `enquetes/{e}/{m}` (`{ histogramas, n, metodo, transicao? }`) ou `null`. `motivo` é uma frase pronta para o telão. `caso` diz qual tela desenhar, sem depender do texto:

  | `caso` | `comparar` | Quando |
  |---|---|---|
  | `pareado` | `true` | mesmo método (`celular`) e pares suficientes |
  | `sem_antes` | `false` | o "antes" foi pulado ou não teve voto (D-008): só o "depois", com "Sem medição de entrada." |
  | `sem_depois` | `false` | o "depois" falta ou não teve voto |
  | `sem_dados` | `false` | faltam os dois |
  | `metodos_diferentes` | `false` | celular de um lado e mão levantada do outro: só as duas distribuições |
  | `sem_pareamento` | `false` | mão levantada nos dois lados: não há como saber quem respondeu as duas vezes |
  | `poucos_pares` | `false` | menos de `minPareados` pares: "turmas diferentes" |

  - Apuração sem nenhum voto (todo `n` igual a 0) conta como lado faltando.
  - Os pares valem pela afirmação com **menos** pares, para o comparativo não trocar de "pareado" para "turmas diferentes" no meio da sequência. Transição ausente conta como zero par.
  - Com `minPareados` 0, ainda é preciso pelo menos 1 par. `minPareados` que não seja inteiro ≥ 0 lança `TypeError`.

---

## 5. `Viracao.roteiro`

| Função | O que faz |
|---|---|
| `passos(config, nomeRoteiro) → [Passo & { indice }]` | lista pronta para o anfitrião (cópia; o config não muda). Lança `Error` se o roteiro não existe, está vazio ou tem `tipo` desconhecido. Passo `opcional` continua na lista: quem pula é o anfitrião |
| `subfasesDe(tipo) → [string]` | `enquete`: `votando, fechando, apurada`. `rodada`: `decidindo, fechando, prorrogacao, sorteio, resultado`. Os outros tipos: `ativo`. A lista é congelada; tipo desconhecido lança `Error` |
| `somaAlvos(passos) → segundos` | passo sem `alvoSeg` (o `fim`) conta 0; o opcional conta |
| `atrasoSeg(passos, indiceAtual, inicioSessaoMs, agoraMs) → número` | tempo decorrido menos a soma dos `alvoSeg` dos passos anteriores; positivo significa atraso. O tempo já gasto no passo atual entra como atraso; para o número fixo de quando o passo abriu, passe a hora de abertura como `agoraMs` |
| `proximoIndice(passos, indice) → índice \| null` / `indiceValido(passos, indice) → boolean` | `null` depois do último passo. Índice inválido em `proximoIndice` e `atrasoSeg` lança `RangeError`, em vez de parecer fim de roteiro |

---

## 6. Canal (a mesma interface em `canal-local.js` e `canal-firebase.js`)

Criação:
- `Viracao.canalLocal.criar({ persistirEm?: chaveLocalStorage, travas?: true, relogio?: () => ms, uid?: 'apresentador-local' })`
  (`uid` é o que o `entrar()` do canal-base devolve; o `relogio` padrão é `Date.now`, porque o canal fica fora do núcleo)
  - **Online → offline** ("Continuar sem celulares", ou "Carregar estado" de um JSON salvo online): o
    canal-local nasce com `uid` = `meta.hostUid` do espelho importado. Offline não há PIN, e com o uid
    padrão o `carregarSala` é recusado (`PERMISSION_DENIED`), porque o anfitrião não é o host da sala.
- `Viracao.canalFirebase.criar({ sdk, conexao, longPolling? })`

| Método | O que faz |
|---|---|
| `entrar() → Promise<uid>` | login anônimo |
| `ler(caminho) → Promise<valor|null>` | vem do servidor, nunca do cache |
| `ouvir(caminho, cb(valor), aoErro?(erro)) → desligar()` | o primeiro aviso e os seguintes chegam sempre de forma assíncrona (no local, por microtarefa), e só quando o valor muda. `aoErro` é chamado se a leitura for negada ou a permissão cair (aluno movido de equipe); o ouvinte é então cancelado |
| `gravar({ caminho: valor|null, … }) → Promise` | update atômico de vários caminhos; `null` apaga; dois caminhos em que um está dentro do outro são recusados |
| `transacao(caminho, fn(atual) → novo|undefined) → Promise<{ confirmado, valor }>` | `undefined` aborta; `valor` é o que ficou gravado (ou o atual, se abortou) |
| `agora() → ms` | hora do servidor online; `relogio()` no local |
| `aoMudarConexao(cb(conectado)) → desligar()` | o local avisa `true` uma vez |
| `marcadorDeHora()` | o valor que o servidor troca pela hora dele (`serverTimestamp()` online; `agora()` no local) |

Formato do banco (vale para os dois canais): `null`, `{}` e `[]` somem ao gravar; número não finito e chave com `. # $ [ ] /` são recusados.

Só no local:
- `comoUsuario(uid) → canal`: uma visão do mesmo armazenamento, autenticada como outro uid. Permite simular 20 celulares num processo só. O canal-base só tem uid depois de `entrar()`.
- `exportar() → objeto` (cópia da árvore inteira) e `importar(json | objeto)`, que substitui a árvore e avisa todos os ouvintes.
- A escrita local é síncrona do começo ao fim, dentro da Promise: duas chamadas no mesmo instante são aplicadas em ordem, e a segunda já enxerga a primeira.

**Travas do `canal-local`** (espelham `firebase/regras.json`, para os testes pegarem erro do anfitrião sem rede). Violar uma delas rejeita a gravação inteira com `Error('PERMISSION_DENIED: <motivo>')`, sem gravar nenhum caminho:
- a regra é conferida folha a folha (cada valor que muda); gravar o mesmo valor de novo também passa pela regra. As travas de nó (a `geracao` do `estado` e a gravação única de `sementes/{r}`, `resultados/{r}` e `enquetes/{e}/{m}`) valem sempre que a escrita toca o nó, mesmo sem mudar nada: regravar o estado ou uma semente idênticos é recusado, como no Firebase;
- **cascata do Firebase:** lá, um `.write` concedido num ancestral vale para os descendentes e o filho não revoga. O canal-local confere folha a folha, por isso toda restrição que ele faz num filho precisa ficar, no `regras.json`, em `.validate` (ou no `.write` do ancestral). Caso conhecido: a trava de `membros/{uid}/equipe` depois de `equipesTravadas` vai no `.validate` de `equipe` (`auth.uid !== $uid || (E.equipesTravadas !== true && E.equipesAbertas[newData.val()] === true)`), e o `.write` de `membros/$uid` exige a equipe inalterada depois da trava (o `.validate` não roda no apagamento). O `--atacar` confere no emulador;
- a permissão vem do caminho gravado ou de um ancestral, nunca de um filho: `salas/{S}` só aceita ser apagada (pelo anfitrião); `resultados` só por `resultados/{r}`, `enquetes` só por `enquetes/{e}/{m}`, e assim por diante;
- anfitrião = `meta.hostUid` do dado **anterior** à escrita. Por isso o `criarSala` grava a `meta` sozinha antes do resto;
- retomada (PIN_OK): com `privado/pinApresentador` existente e `pedidosAnfitriao/{uid}` igual a ele (no dado anterior), a conta grava `meta/hostUid` = o próprio uid, e só por esse caminho exato (a meta inteira continua recusada);
- `estado` exige `geracao = anterior + 1` (ou 1 na criação); `meta` e `estado` só aceitam as chaves de `CHAVES_META` e `CHAVES_ESTADO`;
- `resultados/{r}`, `enquetes/{e}/{m}` e `sementes/{r}` são gravados uma vez só; apagar é permitido, menos em `sementes`; semente precisa ser número;
- o aluno não escreve `meta`, `conteudo`, `estado`, `pulso`, `resultados`, `placar` nem `sementes`;
- `membros/{uid}`: só o próprio, com a entrada aberta e a sala não expirada; `entrouEm` igual à hora do servidor; nenhum outro campo além de `entrouEm` e `equipe`;
- `membros/{uid}/equipe` (aluno): só antes de `estado.equipesTravadas` e só numa equipe de `estado.equipesAbertas`, **mesmo quando gravada junto com o nó inteiro do membro**; qualquer escritor: só equipe que existe no conteúdo;
- `presenca/{uid}`: só o próprio, já membro, com a hora do servidor;
- voto de enquete: só na chave do próprio uid, já membro, com `tipo enquete`, a mesma enquete e o mesmo momento, `subfase votando`, `estado.afirmacao` igual a `*` ou à afirmação votada, dentro de `prazo + gracaSeg`, inteiro de 1 a 5 e afirmação existente;
- decisão: só na chave do próprio uid, na própria equipe, com a mesma rodada, `subfase decidindo` (ou `prorrogacao` com a equipe em `estado.empatadas`, e então só opção empatada), `entrouEm <= estado.abertoEm`, dentro de `prazo + gracaSeg` e opção existente;
- sem `prazo` (etapa pausada), nenhum voto passa, como na regra do Firebase (`null + graça` não vale);
- leitura: o aluno lê `meta`, `conteudo`, `estado`, `pulso`, `resultados`, `placar`, `enquetes` e `membros`; em `decisoes/{r}/{equipe}`, só a da própria equipe; em `votosEnquete`, só a própria folha; nunca `sementes`, `presenca` nem a sala inteira;
- `regrasVersao/{uid}` só aceita `"v1"`; `pedidosAnfitriao/{uid}`, só texto de 8 a 32 caracteres; `autoteste` e `privado`, nunca.

`travas: false` desliga tudo (uso do simulador e dos testes que provam o filtro da apuração).

---

## 7. `Viracao.anfitriao`

`Viracao.anfitriao.criar({ canal, config, sala, nomeRoteiro, agora?, gerarSemente, uid?, aoMudar?, versaoApp? })` devolve os métodos abaixo.
- `agora` padrão é `canal.agora`; sem `uid`, usa `canal.entrar()`;
- `sala` segue `[A-HJ-NP-Z2-9]{4}`;
- `aoMudar(estado)` é chamado a cada estado novo conhecido, inclusive o que chega por conflito.

| Método | O que faz |
|---|---|
| `criarSala() → Promise<estado>` | recusa se a sala já existe; grava a `meta` (sozinha) e depois `conteudo` + `estado` inicial (`geracao` 1, índice 0); a sala expira em 12 h |
| `carregarSala() → Promise<estado>` | lê `meta` e `estado` do banco: recarregar o telão, ou assumir em outra máquina. Recusa (com erro claro, antes de assumir) se `meta.roteiro` não é o `nomeRoteiro`, se `meta.hashConfig` não é o `validarConfig.hash(config)` local, ou se `estado.tipo` não bate com o passo `estado.indice`. Se `meta.hostUid` não é o `uid`, grava `meta/hostUid` = `uid` sozinho, antes de qualquer transição: a regra só aceita com o PIN (PIN_OK), e sem ele a recusa vem aqui |
| `avancar()` | próximo passo. Na enquete `uma_por_vez` em votação, vai para a próxima afirmação (prazo novo); se estava pausada, continua pausada, com `restanteMs = enqueteSeg` inteiro e sem `prazo`. No `sorteio`, vai para o `resultado`. **Nunca fecha votação**: com `votando`, `decidindo`, `prorrogacao` ou `fechando`, lança erro |
| `encerrar()` | fechamento em duas fases (abaixo). Também conclui um `fechando` interrompido (telão que caiu no meio) |
| `desfazer()` | só no passo atual: rodada em `sorteio` ou `resultado` volta a `decidindo` (prazo novo, mesmo `abertoEm`, `forcadas` mantidas); enquete `apurada` volta a `votando`. Em `fechando` (a apuração lançou erro e o `encerrar` não conclui), volta à votação com prazo novo, sem apagar nada: enquete a `votando`, rodada a `prorrogacao` se há `empatadas`, senão a `decidindo`. Nos outros casos, lança erro |
| `pularPara(indice)` | só para a frente, e nunca com votação aberta ou em `fechando` |
| `maisTempo(seg)` | só com votação aberta; `prazo = max(prazo, agora) + seg`; pausado, soma no `restanteMs` |
| `pausar()` / `retomar()` | pausar grava `restanteMs` e tira o `prazo` (a votação fica congelada); retomar faz `prazo = agora + restanteMs` |
| `decidirPorEquipe(equipeId, opcaoId|null)` | grava `estado.forcadas` (com `decidindo` ou `prorrogacao`, só equipe ativa); `null` desfaz |
| `definirEquipesAbertas(ids)` | antes da trava; grava `estado.equipesAbertas` como `{ e1: true, … }`, sempre com as obrigatórias; lista vazia lança erro. O "de 3 a 6" (arquitetura seção 8) fica na tela |
| `moverMembro(uid, equipeId)` | grava `membros/{uid}/equipe`; recusa membro inexistente e equipe fechada |
| `distribuirAtrasados() → Promise<n>` | depois da trava, põe numa equipe aberta quem não tem uma (ou está numa fechada), com `alunoLogica.sugerirEquipe`. Roda sozinho quando as equipes travam; o telão chama de novo quando entra alguém |
| `removerInativos(limiteMs = 60000) → Promise<n>` | apaga `membros/{uid}` de quem não tem presença nos últimos `limiteMs` |
| `abrirEntrada(bool)` | grava `meta/entradaAberta` |
| `contagemManual(afirmacaoId, histograma)` | com a enquete em `votando`; guarda em `estado.manual`. Havendo contagem manual, a apuração é só ela, com `metodo: "manual"` e sem transição, e os votos de celular ficam de fora |
| `exportarTotais() → Promise<objeto>` | só agregados, montados campo a campo: `{ titulo, versao, hashConfig, roteiro, exportadoEm, participantes, enquetes, resultados: { decisao, origem, contagem, carta, depois }, placar }`. **Nunca** uid |
| `apagarSala() → Promise` | |
| `estado() → estado atual` | |

Transição de um nó só: `canal.transacao('salas/{S}/estado')`, que aborta se a `geracao` do servidor não é a conhecida. Aí o estado conhecido é atualizado e o método lança `Error('CONFLITO: …')`. **Para o `canal-firebase`:** a função devolve `undefined` quando o valor atual é `null`, então o canal precisa rodar a transação com o cache já carregado (um ouvinte ligado no `estado`); senão a primeira chamada aborta à toa.

**Campos do estado** (`CHAVES_ESTADO` no canal-local; o `firebase/regras.json` precisa aceitar os mesmos): `geracao, indice, tipo, subfase, rodada, enquete, momento, afirmacao, abertoEm, prazo, restanteMs, equipesTravadas, equipesAbertas: { [eq]: true }, forcadas: { [eq]: opcao }, empatadas: { [eq]: { [opcao]: true } }, manual: { [afirm]: [5 contagens] }` (este último só offline).
- Sair do passo `formarEquipes` (avançando ou pulando por cima) grava `equipesTravadas: true`. Sem passo `formarEquipes` no roteiro, as equipes nascem travadas.
- Ao entrar em `formarEquipes`, ou já travado, sem `equipesAbertas` definidas, abrem todas as equipes do config.
- Enquete: `afirmacao` é a primeira de `ordemAfirmacoes` no modo `uma_por_vez`, e `*` no modo `todas`.

**Fechamento em duas fases** (enquete e rodada):
1. `subfase = "fechando"`, com `geracao + 1`;
2. espera a confirmação;
3. na rodada, grava `sementes/{r}` uma vez (se já existe, reusa);
4. `ler()` dos votos (na rodada, também `membros` e `resultados`);
5. apura;
6. um único `gravar()` com `estado` (`geracao + 1`) mais `resultados`, `placar` ou `enquetes`.

Rodada:
- Conta só o voto de quem **ainda** é da equipe e tem `entrouEm <= abertoEm` (a regra já barra, e a apuração confere de novo).
- Equipes ativas = `estado.equipesAbertas`, na ordem do config. Estado antes da rodada = `depois` da última rodada apurada, na ordem do roteiro.
- Empate: o passo 5 grava só o `estado`, com `subfase: "prorrogacao"`, `empatadas` e `prazo = agora + prorrogacaoSeg` (o `abertoEm` não muda). Nenhum resultado é gravado. Ao encerrar a prorrogação, o fechamento roda de novo, com `aposProrrogacao: true` e `candidatas` = as opções de `empatadas[equipe]` para as equipes de `empatadas` (a moeda e a maioria ficam entre as empatadas). **Uma prorrogação só por rodada:** se outra equipe empatar no segundo fechamento, vai direto para a moeda.
- Resultado por equipe: `{ decisao, origem, contagem, chances, carta, delta, depois }`. Placar de **todas** as equipes do config: `{ ...indicadores, piloto, efeitoDecisoes, sorte, piorCaso, ativa }`, com `piloto` = `esperadoPiloto` do `motor.decompor`.

Enquete: apuração `{ histogramas, n, metodo: "celular", apuradaEm }`; no momento `depois`, mais `transicao: { [afirm]: enquete.transicao(antes, depois) }`, mesmo que o "antes" tenha sido pulado (fica com 0 par).

`desfazer()` apaga `resultados/{r}` e recalcula o `placar` sem esta rodada (`null` se não sobrar nenhuma), e **nunca** apaga `sementes/{r}`. Votos e semente continuam lá: encerrar de novo tira a mesma carta.

Nada fecha por timer: o prazo serve só à regra do banco e ao cronômetro visual (D-010; arquitetura, seção A, item 3).

---

## 8. `Viracao.alunoLogica`

| Função | O que faz |
|---|---|
| `telaDoAluno({ conteudo, estado, membro, membros?, meusVotos, decisoesDaEquipe, resultados, placar, uid, agora, meta? }) → { tipo, dados }` | ver os tipos abaixo |
| `sugerirEquipe(conteudo, { membros, ativos?, equipesAbertas? }) → equipeId|null` | completa até `alvoPorEquipe`, na ordem do config; com todas cheias, vai para a de menos membros ativos (empate: a primeira na ordem); sem nenhuma aberta, `null`. `ativos` e `equipesAbertas` aceitam `Set`, lista ou mapa |
| `pendenteAindaVale(pendente, estado) → boolean` | o voto guardado ainda pode ser reenviado? |
| `cracha(uid, equipe|nome|null) → "Laranja · K7Q"` | derivado do uid, não pessoal; sem equipe, só o código |
| `codigoCracha(uid) → "K7Q"` | 3 caracteres do alfabeto da sala (FNV-1a do uid); o telão usa para achar o aparelho no "Mover aluno" |

Entradas de `telaDoAluno`:
- `conteudo`, `estado`, `membro` (`membros/{uid}`), `resultados`, `placar` e `meta`, como lidos do banco. `meta` é opcional e serve à tela `entradaFechada` e ao título do bloco;
- `meusVotos = { [enquete]: { [momento]: { [afirmacao]: 1..5 } } }`, só os do próprio aparelho;
- `decisoesDaEquipe = decisoes/{rodada}/{minhaEquipe}`;
- `membros` (opcional, o nó `membros` inteiro, que o aluno lê): com ele, a contagem ao vivo da decisão conta só o voto de quem ainda é da equipe e tem `entrouEm <= abertoEm`, o mesmo filtro da apuração. Sem ele, conta todos os votos do nó;
- a tela não olha o relógio (invariante I5): o `prazo` vai em `dados` só para o cronômetro.

| `tipo` | Quando | `dados` |
|---|---|---|
| `entradaFechada` | sem registro de membro e `meta.entradaAberta === false` | `{}` |
| `aguardando` | sem membro (`motivo: "entrando"`), sem estado (`telao`), `lobby`, bloco antes das equipes (`apresentacao`, com `titulo`), sem equipe válida (`semEquipe`), votação fechando (`votacaoEncerrada`), prorrogação de outra equipe (`desempateDeOutrasEquipes`) | `{ motivo, titulo? }` |
| `enquete` | `votando` e falta voto numa afirmação aberta | `{ enquete, momento, afirmacao, posicao, total, afirmacoes, escala, prazo, pausado, restanteMs }`; `posicao` e `total` contam na enquete inteira ("2 de 3" no `uma_por_vez`), e `afirmacoes` traz só as abertas |
| `enqueteRegistrada` | votou em todas as abertas, ou etapa fechada e votou em alguma | `{ enquete, momento, afirmacoes, encerrada }` |
| `escolherEquipe` | `formarEquipes` antes da trava | `{ equipes: [abertas], minha }` |
| `persona` | `personas` (ou `formarEquipes` já travado) com equipe | `{ equipe, persona, indicadores }` |
| `situacao` | `bloco` com equipe e equipes travadas (D-006); `placarFinal` (com `final: true` e `placar`) | `{ equipe, persona, indicadores, mes, narrativa: [opção, carta], titulo?, final, placar? }` |
| `decisao` | `decidindo` | `{ rodada, opcoes: [{ id, rotulo, votos }], meuVoto, podeVotar, motivo: null|"entrouDepois"|"pausado", forcada, prazo, pausado, restanteMs, situacao }` |
| `prorrogacao` | `prorrogacao` com a própria equipe empatada | igual a `decisao`, só com as opções empatadas |
| `sorteando` | `sorteio` (não revela a carta), ou `resultado` ainda sem o nó | `{ equipe, rodada }` |
| `resultado` | `resultado` | `{ equipe, rodada, origem, decisao, carta, delta, indicadores }` |
| `comparativo` | `comparativo` | `{ enquete, afirmacoes: [{ id, texto, antes, depois }] }`, só os votos do próprio aparelho |
| `fim` | `fim` | `{ equipe, placar }` |

Equipe válida = existe no conteúdo e está em `estado.equipesAbertas` (quando definidas). Membro numa equipe fechada aguarda a redistribuição.

`pendente = { tipo: "enquete", enquete, momento, afirmacao, valor } | { tipo: "decisao", rodada, equipe, opcao }`. Vale se a mesma etapa continua em `votando` (com a afirmação `*` ou a mesma) ou em `decidindo`; na `prorrogacao`, só com a equipe e a opção em `empatadas`. Pausado ainda vale: o reenvio passa ao retomar.
