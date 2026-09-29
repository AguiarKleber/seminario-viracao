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
  regras:  { desempate, cartaPor, mostrarChances, placarPadrao, alvoPorEquipe, minPareados, destacarCartas,
             jurosDividaMes, jurosFonte, pisoTrabalho? },
  escala:  { curtos: [5 strings], longos: [5 strings] },
  indicadores: { [id]: { id, nome, formato: "moeda"|"inteiro", inicial, min, max } },
  personas:    { [id]: { id, nome, descricao, familia: { descricao, pessoas },
                         basico: { itens: [{ rotulo, valor, fonte }] }, outraRenda?: { rotulo, valor, fonte },
                         inicial: { [ind]: n }, todoMes: [Efeito], fonte? } },
  equipes:     { [id]: { id, nome, cor, forma, persona, obrigatoria: boolean, lugar? } },
  rodadas:     { [id]: { id, titulo, texto, padrao, contexto?: { [persona]: texto }, efeitosGerais: [Efeito],
                         opcoes: { [id]: { id, rotulo, narrativa?, tendencia?, efeitos: [Efeito],
                                           rotuloPor?: { [persona]: texto }, narrativaPor?: { [persona]: texto } } },
                         ordemOpcoes: [ids] } },
  cartas:      { [id]: { id, titulo, curto?, narrativa?, peso, diasParado?, rodadas?: [ids], somenteSe?: Condicao,
                         ajustesDePeso: [{ se: Condicao, soma?: n, multiplica?: n }],
                         efeitos: [Efeito], tom?: "grave", fonte? } },
  enquetes:    { [id]: { id, titulo, pareada: boolean, revelar: "ao_vivo"|"ao_encerrar"|"so_no_comparativo",
                         modo: "todas"|"uma_por_vez",
                         afirmacoes: { [id]: { id, texto } }, ordemAfirmacoes: [ids] } },
  referencias: { [id]: { id, nome, renda, persona?, fonte? } },
  roteiros:    { [nome]: [Passo] },
  ordem: { indicadores: [], personas: [], equipes: [], rodadas: [], cartas: [], enquetes: [], referencias: [] }
}
```

**Tipos:**
- `Condicao = { opcao?, persona?, equipe?, rodada?, indicador?: { [ind]: { abaixoDe?: n, acimaDe?: n } }, decidiu?, sorteou? }`
  - `opcao`, `persona`, `equipe` e `rodada` aceitam um id ou uma lista de ids;
  - `decidiu = { [rodada]: opção | [opções] }` (a equipe decidiu isso naquela rodada anterior) e
    `sorteou = { [rodada]: carta | [cartas] }` (a equipe tirou essa carta naquela rodada anterior), D-043:
    as consequências que atravessam os meses. Rodada não jogada (pulada no dia) vale **falso**. Valem
    em efeitos, `ajustesDePeso` e `somenteSe`;
  - todas as chaves presentes precisam valer ao mesmo tempo;
  - qualquer chave fora dessas é erro.
- `Efeito = { se?: Condicao, soma?: { [ind]: n }, multiplica?: { [ind]: n }, rotulo?, fonte?, fixo?: true, categoria?: "gasto" }`, com
  `soma` **ou** `multiplica`, nunca os dois (`fixo` e `categoria`: esquema v2.1, abaixo).
- `Passo = { tipo, alvoSeg?, opcional?, titulo?, enquete?, momento?, rodada? }`
  - `tipo` ∈ `lobby | enquete | bloco | formarEquipes | personas | rodada | placarFinal | comparativo | fim`;
  - `momento` ∈ `antes | depois | unico`.

**Esquema v2 (D-041 a D-048)**, conferido pelo validador:
- `persona.familia = { descricao, pessoas }` (obrigatória): texto não vazio e inteiro ≥ 1. Chave a mais
  é aviso (é só texto de tela);
- `persona.basico = { itens: [{ rotulo, valor, fonte }] }` (obrigatório): o custo do básico **da casa**,
  lista não vazia, `valor` inteiro ≥ 0 em R$/mês, `fonte` obrigatória. O total é a soma dos itens,
  calculada pelo motor (`motor.totalBasico`), nunca escrita no config. Chave a mais é **erro** (mexe na conta);
- `persona.outraRenda = { rotulo, valor, fonte }` (opcional): renda de outra pessoa da casa ou benefício,
  explícita; mesmas regras de um item do básico;
- `persona.todoMes` fica só com a renda e os custos **do trabalho** (renda-base, combustível, parcela da
  moto, taxa do app); o custo de vida da casa vai para `basico`;
- `regras.jurosDividaMes` (obrigatório): fração ao mês, `0 < x < 1` (0,08 = 8%); `regras.jurosFonte`
  (obrigatório): texto. Substitui os juros escritos como efeito (D-046);
- `rodada.contexto` (opcional): `{ [persona]: texto }`, persona existente, até 160 caracteres
  (contados por letra), mostrado no celular durante a decisão;
- `rodada.opcoes`: de 2 a 4 (menos ou mais é erro). `tendencia` continua aceita e normalizada
  (compatibilidade), mas nenhuma tela a mostra (D-043);
- `decidiu`/`sorteou`: a rodada citada precisa existir; a opção do `decidiu` precisa ser **daquela**
  rodada; a carta do `sorteou` precisa existir e poder sair naquela rodada (`carta.rodadas`). Em cada
  roteiro, a rodada citada precisa vir **antes** de pelo menos uma rodada em que a condição é avaliada
  (a rodada do efeito; as rodadas da carta; qualquer rodada no `todoMes` e na carta sem `rodadas`,
  estreitadas pela chave `rodada` da própria condição). Fora disso a condição nunca valeria, e é erro.
  Rodada citada que falta num roteiro também é erro.

**Esquema v2.1** (D-050 a D-057 e as correções de conta de 29/09), conferido pelo validador. Tudo é
**opcional**: um config v2 continua válido e dá as mesmas contas (`custosFixos` e `gastos` em 0).
- `efeito.fixo = true`: custo fixo do trabalho (parcela, aluguel do veículo, DAS do MEI). Fica **fora de
  qualquer `multiplica`**, e a linha sai com `origem: "custoFixo"`. `fixo: false` é aceito e some na
  normalização; outro valor é erro;
- `efeito.categoria = "gasto"` (o único valor aceito): dinheiro gasto por causa de um evento (conserto,
  remédio, fisioterapia, multa). Fica **fora de qualquer `multiplica` e fora do "entrou"**, e a linha sai
  com `origem: "gasto"`;
- efeito com `fixo` ou `categoria`: só `soma` (com `multiplica` é erro), só na `renda` (outro indicador é
  erro: é dinheiro) e nunca os dois juntos (erro). O sinal é o da soma: negativo tira dinheiro; positivo
  (reembolso) abate;
- `regras.pisoTrabalho = true` (revisão de 29/09, 2ª rodada): o trabalho variável do mês não fica abaixo de 0
  (ver a ordem do mês, na seção 3). Opcional; `false` ou ausente mantém a conta do v2, em que o "trabalho"
  ainda leva custos e perdas e pode ficar negativo de propósito. Outro valor é erro. Ausente, não entra no
  normalizado (o hash de um config v2 não muda);
- `carta.diasParado`: inteiro de 0 a 30 (fora disso é erro). É informativo, para a tela ("20 dias
  parado"); o motor não o usa na conta;
- `opcao.rotuloPor = { [persona]: texto ≤ 60 }` e `opcao.narrativaPor = { [persona]: texto ≤ 160 }`
  (D-054; contados por letra): a mesma escolha dita do jeito de cada ofício. Persona inexistente, texto
  vazio ou acima do limite é erro; mapa vazio é aviso. Sem entrada para a persona, vale
  `rotulo`/`narrativa`. As chaves de efeito continuam fechadas (`fixa` em vez de `fixo` é erro); nas
  opções e cartas, chave desconhecida continua aviso.

**Valores padrão aplicados pela normalização** (o JSON pode omitir):
- `obrigatoria: false`, `efeitosGerais: []`, `ajustesDePeso: []`, `todoMes: []`, `inicial: {}`;
- `cartas[].curto` é opcional (D-040): texto não vazio de até 12 caracteres (contados por letra),
  com aviso acima de 10; é o rótulo escrito dentro da fatia do sorteio;
- `referencias[].persona` é opcional e precisa ser uma persona do config: com ela, a linha da
  referência no placar final atravessa só as equipes dessa persona (sem ela, todas);
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
  anfitrião aplica), acumulando o estado de antes de cada rodada (rodada pulada). Cada nó é o estado
  **mais o histórico** da equipe (só as rodadas citadas por algum `decidiu`/`sorteou` entram na
  chave). Passar de 20.000 nós alcançáveis é **erro**: sem a conferência não há a garantia.

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
| `condicaoVale(config, cond, ctx) → boolean` | `ctx = { equipeId, personaId, rodadaId, opcaoId, estado, historico? }` |
| `chances(config, { equipeId, rodadaId, opcaoId, estado, historico? }) → [{ carta, peso, chance }]` | cartas elegíveis (`rodadas`, `somenteSe`), com `ajustesDePeso` aplicados na ordem do config; só entram as de peso ajustado > 0 (lista vazia = nenhuma carta possível); as chances somam 1 |
| `resolverRodada(config, { equipeId, rodadaId, opcaoId, estado, semente, historico? }) → Resultado` | usa `sorte.gerador(sorte.derivar(semente, 'carta:'+equipeId))` |
| `aplicar(config, { equipeId, rodadaId, opcaoId, cartaId, estado, historico? }) → { delta, depois, linhas, mes, cartaCusto, deAntes }` | a parte determinística, usada pela enumeração; `delta` é o de antes do clamp; `cartaId` nulo aplica o mês sem carta (`cartaCusto` em 0) |
| `historicoDe(resultados, equipeId, rodadas: [ids]) → Historico` | monta o histórico a partir de `resultados/{r}/{eq}`, só com as rodadas pedidas que têm resultado (quem chama passa as anteriores à atual, na ordem do roteiro) |
| `totalBasico(persona) → n` | a soma dos itens do básico da casa |
| `mesComum(config, equipeId) → mes` | o furo de um mês comum (tela de personas do telão): só o `todoMes` da persona (efeito com condição de rodada, opção ou histórico não entra; condição de indicador lê o estado inicial), na mesma ordem do mês (o custo fixo do `todoMes` entra, fora do `multiplica`), mais a outra renda, menos o básico, sem dívida; mesmo formato de `Resultado.mes` |
| `consolidarDecisao(config, { rodadaId, votos, forcada, aposProrrogacao, semente, equipeId, candidatas? }) → Consolidacao` | ver abaixo |
| `decompor(config, { equipeId, rodadas: [{ rodadaId, opcaoId, cartaId }] }) → Decomposicao` | enumeração exata dos caminhos de cartas, levando o histórico no caminho (a lista `rodadas`, na ordem do roteiro, é o histórico) |

- `Historico = { [rodadaId]: { decisao, carta } }`: o que a equipe decidiu e tirou nas rodadas anteriores (o
  mesmo formato de `resultados/{r}/{eq}`). É o que `decidiu`/`sorteou` leem. Omitido, vale `{}`: toda
  condição de histórico dá falso. **Quem chama o motor com um config que usa `decidiu`/`sorteou` precisa
  passar o histórico**, senão calcula outro número.
- `Resultado = { carta, chances, delta, depois, linhas: [{ origem: "persona"|"geral"|"opcao"|"carta"|"piso"|"custoFixo"|"gasto"|"outraRenda"|"basico"|"juros", rotulo, indicador, valor, deAntes? }], mes, cartaCusto, deAntes }`
  - com `regras.pisoTrabalho`, uma linha `piso` (rótulo "o trabalho do mês não fica abaixo de zero") devolve
    a diferença quando o trabalho variável ficaria negativo; as linhas continuam somando o delta;
  - `linha.deAntes = true` marca, na renda, os efeitos **gerais** (`rodada.efeitosGerais`) cuja condição lê
    `decidiu`, `sorteou` ou `indicador` (consequência de um mês anterior), fora os custos fixos;
  - `deAntes = [{ rotulo, valor, gasto? }]`: essas linhas, na ordem do mês, com `gasto: true` nas de
    categoria "gasto" (a multa, o saldo do empréstimo: estão nos gastos, e não no "entrou"). Lista vazia
    quando não há. É o que a tela nomeia ("+25 dias da fratura −R$ 2.233 · INSS (45 dias) +R$ 2.431").
    Gravado pelo anfitrião em `resultados/{r}/{eq}.deAntes` **só quando não é vazio** (o RTDB apaga lista
    vazia); ausente vale `[]`;
  - as linhas saem na ordem do mês: as do trabalho variável (com a origem do grupo), depois as de
    `custoFixo` e as de `gasto` (o rótulo é o do efeito, ou o do grupo de onde ele veio), depois
    `outraRenda`, `basico` (uma por item, com valor negativo) e `juros` (rótulo "juros da dívida"); estas três
    só entram com valor diferente de 0;
  - `mes = { trabalho, custosFixos, gastos, outraRenda, entrou, basico, juros, saldoMes, dividaAntes }`, na
    renda: `trabalho` é o trabalho **variável** (todoMes → gerais → opção → carta, sem os efeitos `fixo` e
    `gasto`); `custosFixos` e `gastos` são positivos quando tiram dinheiro (a soma dos efeitos `fixo` e
    `gasto`, com o sinal trocado); `entrou = trabalho − custosFixos + outraRenda`;
    `saldoMes = entrou − gastos − basico − juros` (é o `delta.renda`); com `regras.pisoTrabalho`, `trabalho` ≥ 0,
    mas o `entrou` ainda pode ficar negativo (custos fixos maiores que o trabalho, num mês parado);
    `dividaAntes` ≥ 0 é a dívida de antes
    do mês. É gravado pelo anfitrião em `resultados/{r}/{eq}.mes`;
  - `cartaCusto = { diasParado, rendaPerdida, gastos }` (D-052), gravado pelo anfitrião em
    `resultados/{r}/{eq}.cartaCusto`: `diasParado` é o da carta (0 sem ele); `rendaPerdida` = trabalho
    variável sem a carta − com a carta, nunca abaixo de 0 (carta que ajuda dá 0); com o piso, o trabalho sem
    a carta também conta a partir de 0, e a renda perdida nunca passa da renda que havia; `gastos` = os efeitos
    `gasto` da carta, positivos. Nenhuma condição lê a carta do próprio mês, então isto é o mesmo que refazer
    o mês sem a carta. É o que a tela mostra como "20 dias parado · renda perdida R$ X · gastos R$ Y".
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

**Semântica dos efeitos e ordem do mês** (arquitetura, seção 7; D-044, D-046 e o esquema v2.1):
- o delta de cada indicador começa em 0;
- (1) **trabalho variável**: `persona.todoMes` → `rodada.efeitosGerais` → opção → carta, só com os efeitos
  **sem** `fixo` e **sem** `categoria: "gasto"`. `soma` adiciona ao delta, e `multiplica` multiplica o delta
  daquele indicador. É o único passo em que `multiplica` vale: a carta que zera a renda zera o que se
  ganha, e não a parcela da moto nem o conserto. Com `regras.pisoTrabalho`, no fim deste passo o trabalho
  variável negativo vira 0 (linha `piso`): os dias parados são somas a preço cheio, e depois de um
  `multiplica` (o exausto, o bloqueio) chegavam a tirar mais renda do que havia;
- (2) `− custos fixos`: os efeitos com `fixo`, de qualquer origem, na ordem dos grupos;
- (3) `− gastos`: os efeitos com `categoria: "gasto"`, de qualquer origem, na ordem dos grupos;
- depois, na renda: (4) `+ outraRenda` → (5) `− básico` (a soma dos itens) → (6) `− juros`, com
  `juros = round(|saldo| × jurosDividaMes)` quando a renda do estado **antes** da rodada é negativa (a
  dívida que vinha do mês anterior), e 0 senão. A carta que corta a renda corta o que se ganha, e não
  a conta da casa;
- toda condição lê o estado **antes** da rodada e o histórico da equipe;
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
| `linhaDoTempo(config, passos, { maxItens }) → { itens: [{ tipo, indices, palavras? }], agrupado }` | os itens da linha do tempo do telão (D-042): um por passo, menos `lobby` e `fim`. Com mais de `maxItens` e pelo menos dois passos depois da última rodada, esses passos viram um item `{ tipo: 'final', indices, palavras }`: `placarFinal` = "debrief", enquete `depois` e `comparativo` = "medição", outra enquete = o título com inicial minúscula, o último bloco = "fechamento", outro bloco = a primeira palavra do título; sem repetir |
| `proximoIndice(passos, indice) → índice \| null` / `indiceValido(passos, indice) → boolean` | `null` depois do último passo. Índice inválido em `proximoIndice` e `atrasoSeg` lança `RangeError`, em vez de parecer fim de roteiro |

---

## 6. Canal (a mesma interface em `canal-local.js` e `canal-firebase.js`)

Criação:
- `Viracao.canalLocal.criar({ persistirEm?: chaveLocalStorage, travas?: true, relogio?: () => ms, uid?: 'apresentador-local' })`
  (`uid` é o que o `entrar()` do canal-base devolve; o `relogio` padrão é `Date.now`, porque o canal fica fora do núcleo)
  - **Online → offline** ("Continuar sem celulares", ou "Carregar estado" de um JSON salvo online): o
    canal-local nasce com `uid` = `meta.hostUid` do espelho importado. Offline não há PIN, e com o uid
    padrão o `carregarSala` é recusado (`PERMISSION_DENIED`), porque o anfitrião não é o host da sala.
- `Viracao.canalFirebase.criar({ sdk, conexao, longPolling?, emulador?, ambienteLocal?, nome?, esperaConexaoMs? })`
  - `sdk = { app, auth, database }`: os três módulos do Firebase 12.19.0, **injetados**. No navegador,
    quem chama carrega por `import()` (só online, tempo-limite de 4 s) `firebase-app.js`,
    `firebase-auth.js` e `firebase-database.js` da CDN gstatic; no Node, `firebase/app`,
    `firebase/auth` e `firebase/database` do npm. O mesmo arquivo serve aos dois.
  - `conexao`: as chaves públicas (`conexao.json`). `longPolling: true` chama `forceLongPolling()`
    (o `?lp=1`), que vale para o contexto inteiro e precisa vir antes da primeira conexão.
  - `emulador: true | { host?, portaAuth?, portaBanco? }` (padrão `127.0.0.1`, 9099 e 9000) liga
    `connectAuthEmulator`/`connectDatabaseEmulator`, e **só** com `ambienteLocal: true` (o chamador
    afirma que está na máquina de desenvolvimento) e host `127.0.0.1`/`localhost`; senão lança erro.
    Sem `databaseURL`, usa `https://{projectId}-default-rtdb.firebaseio.com` (o namespace do emulador).
  - `nome`: o nome do app (`initializeApp(conexao, nome)`), padrão `"viracao"`. Fixo de propósito: no
    navegador o login anônimo fica guardado por nome de app, e um nome novo a cada carga daria um uid
    novo a cada recarregar (I6). O simulador passa um nome por robô; dois canais vivos com o mesmo
    nome no mesmo contexto lançam erro.
  - `esperaConexaoMs` (10000): quanto o `ler()` espera a conexão antes de desistir.

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

No `canal-firebase`:
- `ler()` usa o `get()` do SDK, que responde com o cache de um ouvinte ativo; esse cache só vale com
  a conexão de pé (o servidor o mantém em dia, em ordem). Sem conexão, o `ler()` espera voltar e,
  depois de `esperaConexaoMs`, rejeita com `Error('SEM_CONEXAO: …')`: nunca responde do cache velho.
- `transacao()` liga, na primeira vez em cada caminho, um ouvinte fixo e espera o primeiro valor dele
  (contratos, seção 7: sem cache, a função do anfitrião receberia `null` e abortaria à toa). Roda com
  `applyLocally: false`, para o telão nunca desenhar um estado que o servidor ainda não aceitou.
- Toda recusa das regras chega como `Error('PERMISSION_DENIED: …')` (com `code: 'PERMISSION_DENIED'`),
  na escrita, na transação, no `ler()` e no `aoErro` do ouvinte cancelado, igual ao canal-local.
- `ouvir()` entrega por microtarefa e só quando o valor muda (o SDK chamaria dentro do próprio
  `onValue` quando o valor já está em cache). `aoMudarConexao()` repassa o `/.info/connected` (o SDK
  avisa `false` ao ligar e `true` ao conectar) sem repetir o mesmo valor.
- `agora()` = `Date.now()` + `/.info/serverTimeOffset`.

Só no Firebase:
- `reconectar()`: `goOffline()` + `goOnline()`, o ciclo de reconexão (arquitetura, seção 10). **Quando**
  chamar é política da tela.
- `desconectar()`: `goOffline()` sem volta ("Continuar sem celulares").
- `apagarAoDesconectar(caminho) → Promise`: `onDisconnect().remove()`, para a `presenca`.
- `uid() → uid|null` e `fechar() → Promise`: solta o app (`deleteApp`). O `fechar()` também encerra a
  sessão anônima, porque o `deleteApp` do SDK 12.19.0 deixa vivo o timer de renovação do token que o
  database liga no auth, e o Node não termina: é só para o simulador e os testes (o celular nunca
  chama, ou perderia o uid).

**Travas do `canal-local`** (espelham `firebase/regras.json`, para os testes pegarem erro do anfitrião sem rede). Violar uma delas rejeita a gravação inteira com `Error('PERMISSION_DENIED: <motivo>')`, sem gravar nenhum caminho:
- a regra é conferida folha a folha (cada valor que muda); gravar o mesmo valor de novo também passa pela regra. As travas de nó (a `geracao` do `estado` e a gravação única de `sementes/{r}`, `prorrogacoes/{r}`, `resultados/{r}` e `enquetes/{e}/{m}`) valem sempre que a escrita toca o nó, mesmo sem mudar nada: regravar o estado, uma semente ou uma marca de prorrogação idênticos é recusado, como no Firebase;
- **cascata do Firebase:** lá, um `.write` concedido num ancestral vale para os descendentes e o filho não revoga. O canal-local confere folha a folha, por isso toda restrição que ele faz num filho precisa ficar, no `regras.json`, em `.validate` (ou no `.write` do ancestral). Caso conhecido: a trava de `membros/{uid}/equipe` depois de `equipesTravadas` vai no `.validate` de `equipe` (`auth.uid !== $uid || (E.equipesTravadas !== true && E.equipesAbertas[newData.val()] === true)`), e o `.write` de `membros/$uid` exige a equipe inalterada depois da trava (o `.validate` não roda no apagamento). O `--atacar` confere no emulador;
- a permissão vem do caminho gravado ou de um ancestral, nunca de um filho: `salas/{S}` só aceita ser apagada (pelo anfitrião); `resultados` só por `resultados/{r}`, `enquetes` só por `enquetes/{e}/{m}`, e assim por diante;
- anfitrião = `meta.hostUid` do dado **anterior** à escrita. Por isso o `criarSala` grava a `meta` sozinha antes do resto;
- retomada (PIN_OK): com `privado/pinApresentador` existente e `pedidosAnfitriao/{uid}` igual a ele (no dado anterior), a conta grava `meta/hostUid` = o próprio uid, e só por esse caminho exato (a meta inteira continua recusada);
- `estado` exige `geracao = anterior + 1` (ou 1 na criação); `meta` e `estado` só aceitam as chaves de `CHAVES_META` e `CHAVES_ESTADO`;
- `resultados/{r}`, `enquetes/{e}/{m}`, `sementes/{r}` e `prorrogacoes/{r}` são gravados uma vez só; apagar é permitido, menos em `sementes` e `prorrogacoes`; semente precisa ser número, e a marca de prorrogação, `true` (D-035: a rodada que já teve prorrogação não abre outra, nem depois do desfazer);
- o aluno não escreve `meta`, `conteudo`, `estado`, `pulso`, `resultados`, `placar`, `sementes` nem `prorrogacoes`;
- `membros/{uid}`: só o próprio, com a entrada aberta e a sala não expirada; `entrouEm` igual à hora do servidor (ou igual à já gravada: regravar a mesma `entrouEm`, pelo nó ou pela folha, passa nos dois); nenhum outro campo além de `entrouEm` e `equipe`;
- o nó `membros/{uid}`, depois de qualquer escrita (do aluno ou do anfitrião), é um objeto com `entrouEm` numérico, ou não existe (`.validate` de `membros/$uid`: `newData.hasChildren(['entrouEm'])`). Valor solto no lugar do nó (texto, número, booleano) é recusado; gravar só a `equipe` de quem não tem registro de membro é recusado (não há como virar membro sem passar pela entrada aberta e pelo prazo da sala); apagar só a `entrouEm` e deixar a equipe é recusado; apagar o nó inteiro, não;
- `membros/{uid}/equipe` (aluno): só antes de `estado.equipesTravadas` e só numa equipe de `estado.equipesAbertas`, **mesmo quando gravada junto com o nó inteiro do membro**; qualquer escritor: só equipe que existe no conteúdo. Regravar o nó inteiro do membro **com a mesma equipe** também passa por essa regra (no Firebase o `.validate` roda em todo filho do dado gravado, mudado ou não): depois da trava, ou com a equipe fechada, é recusado. Regravar o nó com a mesma `entrouEm` (e sem equipe) passa nos dois;
- `presenca/{uid}`: só o próprio, já membro, com a hora do servidor;
- voto de enquete: só na chave do próprio uid, já membro, com `tipo enquete`, a mesma enquete e o mesmo momento, `subfase votando`, `estado.afirmacao` igual a `*` ou à afirmação votada, dentro de `prazo + gracaSeg`, inteiro de 1 a 5 e afirmação existente;
- decisão: só na chave do próprio uid, na própria equipe, com a mesma rodada, `subfase decidindo` (ou `prorrogacao` com a equipe em `estado.empatadas`, e então só opção empatada), `entrouEm <= estado.abertoEm`, dentro de `prazo + gracaSeg` e opção existente;
- sem `prazo` (etapa pausada), nenhum voto passa, como na regra do Firebase (`null + graça` não vale);
- leitura: o aluno lê `meta`, `conteudo`, `estado`, `pulso`, `resultados`, `placar`, `enquetes` e `membros`; em `decisoes/{r}/{equipe}`, só a da própria equipe; em `votosEnquete`, só a própria folha; nunca `sementes`, `prorrogacoes`, `presenca` nem a sala inteira;
- `regrasVersao/{uid}` só aceita a versão das regras (`REGRAS_VERSAO`, hoje `"v3"`); `pedidosAnfitriao/{uid}`, só texto de 8 a 32 caracteres; `autoteste` e `privado`, nunca.
  A versão fica em três lugares (`firebase/regras.json`, `REGRAS_VERSAO` em `js/telao.js` e em
  `js/canal/canal-local.js`) e presa ao conteúdo das regras: `test/regras.test.mjs` guarda o hash
  (sha256, 12 caracteres, do regras.json com a versão trocada por um marcador) de cada versão, e
  falha quando o regras.json muda sem a versão subir. Mudou a regra: suba a versão nos três lugares,
  registre o hash novo no teste, publique as regras no console e recarregue o telão.

`travas: false` desliga tudo (uso do simulador e dos testes que provam o filtro da apuração).

**Paridade com o `firebase/regras.json`**, conferida caso a caso no emulador por
`test/emulador/regras-paridade.test.mjs` (`npm run emulador`): cada cenário dos testes do canal-local
roda igual nos dois, e cada passo é aceito ou recusado do mesmo jeito. Conferido no emulador: a
permissão vem do caminho gravado ou de um ancestral, nunca de um filho (gravar `resultados` inteiro,
ou a `meta` inteira mudando só o `hostUid` com o PIN, é recusado), e o `.validate` de um ancestral roda
numa escrita mais funda (gravar só `estado/geracao` é recusado).

Diferenças **de propósito**, todas no lado do anfitrião ou do PIN (as regras online são mais estritas):
- **Criar sala exige o PIN online** (`PIN_OK` no `.write` da `meta`, com `privado/pinApresentador`
  existente, e código de sala `[A-HJ-NP-Z2-9]{4}`). Offline não há PIN, e o canal-local cria sala sem
  ele. Por isso o telão online grava `pedidosAnfitriao/{uid}` antes do `criarSala()`.
- `pulso === now` (use `marcadorDeHora()`, nunca `agora()`); tipos da `meta` (`hostUid`, `hashConfig` e
  `roteiro` texto, `criadaEm` número, `entradaAberta` booleano, `versaoApp` texto ou número) e
  `expiraEm <= now + 12 h + 1 min` (o minuto cobre a diferença entre o `agora()` do telão e o `now`
  do servidor); tipos do `estado` (`geracao`, `indice`, `abertoEm`, `prazo`, `restanteMs` números;
  `tipo`, `subfase`, `rodada`, `enquete`, `momento`, `afirmacao` textos; `equipesTravadas` booleano;
  `equipesAbertas/{eq}` e `empatadas/{eq}/{op}` iguais a `true`; `forcadas/{eq}` texto;
  `manual/{afirm}` lista de números). O canal-local só confere as chaves.
- Sem `conteudo/tempos/gracaSeg` numérico, o voto é recusado online (o canal-local usa 0). O config
  normalizado sempre traz `gracaSeg`.
- **Prioridade (`.priority`)**: as regras exigem `newData.getPriority() === null` em todo nó que o
  aluno grava (`pedidosAnfitriao/$uid`, `regrasVersao/$uid`, `membros/$uid` e os filhos `entrouEm` e
  `equipe`, `presenca/$uid`, `votosEnquete/…/$uid`, `decisoes/…/$uid`), no próprio nó e em cada filho:
  a prioridade é um valor de tamanho livre ao lado do nó, que o SDK aceita dentro do valor
  (`{ '.value': v, '.priority': … }`), e sem a conferência um blob de MB passava e enchia a cota do
  plano grátis. O canal-local não representa prioridade: a chave com `.` é recusada ao gravar, com um
  erro que não é `PERMISSION_DENIED`. Conferido só no emulador (`regras-paridade.test.mjs`, "só
  online") e no `--atacar`.

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
| `desfazer()` | só no passo atual: rodada em `sorteio` ou `resultado` volta a `decidindo` (prazo novo, mesmo `abertoEm`, `forcadas` mantidas); enquete `apurada` volta a `votando`. Em `fechando` (a apuração lançou erro e o `encerrar` não conclui), volta à votação com prazo novo, sem apagar nada: enquete a `votando`, rodada a `prorrogacao` se há `empatadas`, senão a `decidindo`. Com a enquete em `votando` ou a rodada em `decidindo`, **desfaz a abertura** (D-037, abaixo); a `prorrogacao` não. Nos outros casos, lança erro |
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
4. `ler()` dos votos (na rodada, também `membros`, `resultados` e `prorrogacoes/{r}`);
5. apura;
6. um único `gravar()` com `estado` (`geracao + 1`) mais `resultados`, `placar` ou `enquetes`.

Rodada:
- Conta só o voto de quem **ainda** é da equipe e tem `entrouEm <= abertoEm` (a regra já barra, e a apuração confere de novo).
- Equipes ativas = `estado.equipesAbertas`, na ordem do config. Estado antes da rodada = `depois` da última rodada apurada, na ordem do roteiro.
- Empate: o passo 5 grava o `estado`, com `subfase: "prorrogacao"`, `empatadas` e `prazo = agora + prorrogacaoSeg` (o `abertoEm` não muda), e, no mesmo `gravar()`, a marca `prorrogacoes/{r} = true`. Nenhum resultado é gravado. Ao encerrar a prorrogação, o fechamento roda de novo, com `aposProrrogacao: true` e `candidatas` = as opções de `empatadas[equipe]` para as equipes de `empatadas` (a moeda e a maioria ficam entre as empatadas). **Uma prorrogação só por rodada (D-035):** se outra equipe empatar no segundo fechamento, vai direto para a moeda. O mesmo vale depois do `desfazer()`: o passo 4 também lê `prorrogacoes/{r}` e, se a marca existe, todo empate vai direto para a moeda (`aposProrrogacao: true`, sem `candidatas`: a moeda fica entre as opções empatadas agora).
- Resultado por equipe: `{ decisao, origem, contagem, chances, carta, delta, depois, mes, cartaCusto, deAntes? }` (`cartaCusto` desde o esquema v2.1; `deAntes` só quando não é vazio; as regras v3 aceitam qualquer filho de `resultados/{r}`, sem mudança). O anfitrião passa ao
  motor o histórico da equipe (`motor.historicoDe` com as rodadas anteriores do roteiro que têm resultado). Placar de **todas** as equipes do config: `{ ...indicadores, piloto, efeitoDecisoes, sorte, piorCaso, ativa }`, com `piloto` = `esperadoPiloto` do `motor.decompor`.

Enquete: apuração `{ histogramas, n, metodo: "celular", apuradaEm }`; no momento `depois`, mais `transicao: { [afirm]: enquete.transicao(antes, depois) }`, mesmo que o "antes" tenha sido pulado (fica com 0 par).

**Desfazer a abertura (D-037)**: um Espaço a mais abre a próxima votação, e o `desfazer()` com a
enquete em `votando` (cada afirmação da `uma_por_vez` também) ou a rodada em `decidindo` a desfaz
enquanto nenhum voto chegou. Também em duas fases, para não perder voto nem contar voto da janela
aberta por engano:

1. antes de tudo, calcula para onde volta e confere os votos já registrados. O que não dá para
   desfazer é recusado **sem transição** (o celular nem pisca): voto já registrado
   (`Error('Já chegou 1 voto; não dá para desfazer a abertura. …')` / `'Já chegaram N votos; …'`),
   passo anterior que é uma rodada, ou enquete anterior sem apuração (foi pulada). Na rodada, as
   decisões do apresentador (`estado.forcadas`) também contam como voto (a mensagem acrescenta
   "(contando as decisões do apresentador)"), e a rodada que já tem `sementes/{r}` recusa
   (`'Esta rodada já foi apurada uma vez …'`): o `decidindo` veio do desfazer da apuração, e não de
   um Espaço por engano;
2. `subfase = "fechando"` (`geracao + 1`): a regra passa a recusar voto novo;
3. espera a confirmação;
4. `ler()` dos votos desta etapa: na rodada, as folhas de `decisoes/{r}` mais as `forcadas`; na enquete, os aparelhos
   em `votosEnquete/{e}/{m}` (no modo `todas`) ou só na afirmação aberta (na `uma_por_vez`). A
   contagem à mão do offline (`estado.manual` das afirmações abertas) também conta como voto;
5. nenhum voto: volta, com `geracao + 1`, ao estado de antes da abertura:
   - `uma_por_vez` depois da primeira afirmação: a afirmação anterior em `votando`, com prazo novo
     (`abertoEm` = agora); pausada, continua pausada com `restanteMs = enqueteSeg`;
   - senão, o passo `indice - 1`, montado do zero (sem `rodada`, `prazo`, `forcadas`, `manual`),
     com `equipesTravadas` e `equipesAbertas` como estavam: `ativo` num passo sem votação, e
     `apurada` numa enquete (a última afirmação da `uma_por_vez`, ou `*`). Se a apuração dessa
     enquete é `manual`, o `manual` é refeito dos histogramas dela: o `desfazer()` seguinte a reabre
     com as contagens digitadas, e não zeradas;
6. houve voto: reabre a mesma votação (`votando`/`decidindo`, mesmo `prazo` e `abertoEm`; se o prazo
   venceu durante a espera, `prazo = agora + o que faltava no Ctrl+Z`; pausada, o mesmo
   `restanteMs`) e lança o erro "Já chegaram N votos; …". O voto que chegou antes do "fechando" fica
   e conta no `encerrar`.

Se a rede cai entre as fases, a sala fica em `fechando`. O anfitrião guarda na memória a marca desse
`fechando` (`desfazendoAbertura(estado?) → boolean`; não vai ao banco, porque o estado tem
`$outro: false`): com ela, o telão mostra "Desfazendo a abertura…" e não "Apurando…", o
`desfazer()` seguinte retoma o desfazer (passos 4 a 6) e o Enter pede confirmação antes de apurar.
Depois de recarregar o telão (ou em outra máquina), a marca se perdeu e vale o fechamento
interrompido comum: o `desfazer()` seguinte reabre a votação e o outro tenta de novo.

`desfazer()` apaga `resultados/{r}` e recalcula o `placar` sem esta rodada (`null` se não sobrar nenhuma), e **nunca** apaga `sementes/{r}` nem `prorrogacoes/{r}`. Votos, semente e marca continuam lá: encerrar de novo tira a mesma carta e não abre outra prorrogação.

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
| `situacao` | `bloco` com equipe e equipes travadas (D-006); `placarFinal` (com `final: true`, `placar` e `historia`) | `{ equipe, persona, indicadores, mes, divida, narrativa: [opção, carta], titulo?, final, placar?, historia? }` |
| `decisao` | `decidindo` | `{ rodada, contexto, opcoes: [{ id, rotulo, votos }], meuVoto, podeVotar, motivo: null|"entrouDepois"|"pausado", forcada, prazo, pausado, restanteMs, situacao }` |
| `prorrogacao` | `prorrogacao` com a própria equipe empatada | igual a `decisao`, só com as opções empatadas |
| `sorteando` | `sorteio` (não revela a carta), ou `resultado` ainda sem o nó | `{ equipe, rodada }` |
| `resultado` | `resultado` | `{ equipe, rodada, origem, decisao, carta, delta, indicadores, mes, divida, cartaCusto, deAntes }` |
| `comparativo` | `comparativo` | `{ enquete, afirmacoes: [{ id, texto, antes, depois }] }`, só os votos do próprio aparelho |
| `fim` | `fim` | `{ equipe, placar, historia }` |

Equipe válida = existe no conteúdo e está em `estado.equipesAbertas` (quando definidas). Membro numa equipe fechada aguarda a redistribuição.

Campos do esquema v2 (D-043 a D-046):
- `persona` (em todas as telas que a trazem) = `{ id, nome, descricao, familia: { descricao, pessoas }|null, basico: { total, itens: [{ rotulo, valor, fonte }] }, outraRenda: { rotulo, valor, fonte }|null }`;
  o `total` é a soma dos itens, a mesma conta do motor (que o celular não carrega);
- `contexto` (decisão e prorrogação): o texto de `rodada.contexto[persona da equipe]`, ou `null`. As opções
  nunca trazem a `tendencia`;
- `mes`: no `resultado`, é o `resultados/{r}/{eq}.mes` gravado (ou `null`); na `situacao`, é o objeto do
  último mês de antes (`rodada, titulo, origem, decisao, carta, cartaCusto, deAntes`) **mais** os campos do `mes`
  gravado (`trabalho, custosFixos, gastos, outraRenda, entrou, basico, juros, saldoMes, dividaAntes`; sala
  de antes do v2.1 não traz `custosFixos` nem `gastos`); `null` antes do primeiro mês;
- `cartaCusto` (esquema v2.1, D-052): no `resultado`, é o `resultados/{r}/{eq}.cartaCusto` gravado; na
  `situacao`, vai em `mes.cartaCusto`; `{ diasParado, rendaPerdida, gastos }`, ou `null` em sala de antes do
  v2.1;
- **texto da opção por persona** (D-054): nas telas `decisao` e `prorrogacao` (`opcoes[].rotulo`), no
  `resultado` (`decisao.rotulo` e `decisao.narrativa`), na `situacao` (`mes.decisao.rotulo` e a narrativa
  da opção em `narrativa`) e na `historia`, vale `rotuloPor`/`narrativaPor` da persona da equipe, e o
  `rotulo`/`narrativa` da opção quando ela não tem entrada;
- `divida = { valor, jurosMes }` (situação e resultado): `valor` é o saldo negativo da renda (0 sem dívida), e
  `jurosMes`, o `regras.jurosDividaMes` (D-046);
- `historia` (fim e placar final): `historia.historiaDaEquipe(conteudo, equipe, resultados)`.

### `Viracao.historia` (`js/nucleo/historia.js`)

Arquivo à parte porque o celular não carrega o motor. Carregado antes do `aluno-logica.js` no telão, no
celular e no `test/carregar-nucleo.mjs`.

| Função | O que faz |
|---|---|
| `historiaDaEquipe(conteudo, equipeId, resultados) → [{ rodadaId, titulo, opcao: { rotulo, narrativa }, carta: { titulo, narrativa, tom }, mes, cartaCusto, deAntes }]` | um item por rodada com resultado da equipe, na ordem das rodadas do config (D-045); a `opcao` vem com o texto da persona da equipe (`textoDaOpcao`, D-054); `narrativa`, `tom`, `mes` e `cartaCusto` ausentes viram `null`; `deAntes` ausente vira `[]` |
| `textoDaOpcao(conteudo, rodadaId, opcaoId, personaId) → { rotulo, narrativa }` | D-054: `rotuloPor[persona]` e `narrativaPor[persona]`, e o `rotulo`/`narrativa` da opção quando a persona não tem entrada; opção inexistente dá os dois `null`. É o que o telão usa para falar do jeito de cada equipe |
| `linhaDoMes(mes) → string \| null` | a linha curta de um mês da história no telão (D-045): a primeira frase da `opcao.narrativa` e a da `carta.narrativa`, separadas por espaço (o corte é sempre no fim de uma frase: ".", "!" ou "?" seguido de espaço); `null` sem nenhuma das duas |
| `escolhaOuSorte(placar) → { piloto, escolhas, sorte, total } \| null` | "Escolha ou sorte?" em reais inteiros para a tela (telão e celular): `total = round(renda)`, `piloto = round(piloto)`, `escolhas = round(efeitoDecisoes)` e `sorte = total − piloto − escolhas`, para as três parcelas sempre somarem o total mostrado (arredondadas uma a uma, erravam por R$ 1). `null` sem `piloto`, `efeitoDecisoes` e `renda` finitos |

`pendente = { tipo: "enquete", enquete, momento, afirmacao, valor, abertoEm } | { tipo: "decisao", rodada, equipe, opcao, abertoEm }`. Com `abertoEm`, só vale na mesma janela (`estado.abertoEm` igual): o voto guardado na janela desfeita pelo Ctrl+Z (D-037) não entra na reabertura. Vale se a mesma etapa continua em `votando` (com a afirmação `*` ou a mesma) ou em `decidindo`; na `prorrogacao`, só com a equipe e a opção em `empatadas`. Pausado ainda vale: o reenvio passa ao retomar.

---

## 9. Interface: `js/ui/*` e o telão (`js/telao.js`)

Scripts clássicos, carregados depois do núcleo e do canal, nesta ordem:
`formatar.js`, `dom.js`, `graficos.js`, `conexao.js`, `telao.js` (e antes deles
`vendor/qrcode.js`, qrcode-generator 2.0.4, MIT, que expõe o global `qrcode`).
O celular reusa os quatro de `js/ui/`.

### `Viracao.formatar` (pt-BR, fuso America/Sao_Paulo)

| Função | Exemplo |
|---|---|
| `moeda(n, { sinal? })` | `R$ 1.234`, `−R$ 80`, `+R$ 300` (sem centavos; sinal de menos tipográfico) |
| `inteiro(n, { sinal? })` / `decimal(n)` / `porcento(fração)` | `7`, `3,5`, `42%`; `null` em `porcento` dá `—` ("sem votos", nunca 0%) |
| `taxa(fração)` | `7,43%`: a taxa de juros ao mês com até duas casas, como a fonte escreve (telão e celular) |
| `indicador(ind, valor, opcoes?)` | `moeda` ou `inteiro`, conforme `ind.formato` |
| `dataHora(ms)` / `carimbo(ms)` | `28/09, 14:05` / `2026-09-28-1405` (nome de arquivo) |
| `relogio(ms)` / `atraso(seg)` / `pessoas(n)` | `1:05` / `+3 min de atraso`, `2 min adiantado`, `no horário` / `1 pessoa` |

### `Viracao.dom` (nenhum `innerHTML`)

- `el(tag, atributos?, filhos?)` e `svg(tag, atributos?, filhos?)`. Atributos
  especiais: `classe` (texto ou lista, aninhada ou não), `texto`, `ao`
  (`{ click: fn }`), `dados` (`data-*`), `estilo` (propriedades CSS, inclusive
  `--variavel`). Valor `false`/`null`/`undefined` não é gravado.
- `botao(rotulo, acao, { classe, dica, titulo, desabilitado, pressionado, dados, segurarMs })`:
  sempre faz `blur()` depois do clique; com `segurarMs`, só aciona segurando
  (progresso em `--progresso`, de 0 a 1).
- `limpar(no)`, `baixar(nome, texto, tipo?)` (funciona por `file://`),
  `lerArquivo(file) → Promise<texto>`.

### `Viracao.graficos` (SVG à mão)

Quem chama mede o espaço e passa `largura`, `altura` e `fonte` em px; o SVG sai
com `viewBox` igual ao tamanho real, para o texto ter o tamanho do corpo.

- `forma(nome, cor, tamanho)` (`circulo`, `triangulo`, `quadrado`, `losango`,
  `estrela`, `cruz`, `hexagono`; outra forma vira círculo com miolo) e
  `rotuloEquipe(equipe, numero)`: forma, número e nome sempre juntos.
- `histograma({ series: [{ hist, estilo: 'antes'|'depois'|'cheio' }] })`,
  `rotulosEscala(rotulos, { soNumeros? })`, `legendaEscala(rotulos)`,
  `tresPartes({ resumo })`, `amostra(estilo)` (legenda).
- `fatias({ linhas: [{ chances, sorteada, graves: Set }], curtos?: { [carta]: texto }, animar })`: os
  ponteiros usam a mesma animação CSS e param juntos. Dentro de cada fatia vai
  "curto NN%" (D-040) quando cabe na largura (`larguraTexto` + meia fonte de folga), senão só
  "NN%", senão nada; nunca reticências. O texto (`text.rotulo-fatia`, com `data-carta`,
  `data-linha` e, quando leva o nome, `data-curto`) tem o tamanho do corpo e é claro ou escuro
  conforme a cor da fatia (`contraste(a, b)`, WCAG, exportada; ≥ 4,5:1), com halo da cor oposta;
  a fatia grave (hachurada) usa o mesmo estilo, e o halo escuro dá o contraste. A cor das fatias
  (`COR_FATIA`) fica no `graficos.js`, e não no CSS, porque é dela que sai essa escolha. Com `animar`, o SVG leva a
  classe `fatias-animadas`, e o contorno da fatia sorteada só aparece quando os
  ponteiros param (2,6 s; o mesmo atraso do `.revelar-apos`). A chance de carta grave
  de cada equipe vai escrita sob o nome dela, no telão (`.linha-graves`).
- `barras({ dominio, linhas: [{ valor, rotulo? }], referencias?: [{ id, valor, linhas? }] })`: uma
  barra por linha a partir do zero (negativo anda para a esquerda). Cada referência vira uma
  linha tracejada (`line.referencia`, com `data-referencia` e `data-linha`); com `linhas`
  (índices), só nessas linhas: a referência de uma persona atravessa só as equipes dela. É o
  gráfico da página 1 do placar final (D-041). A `cascata` (piloto, decisões e sorte em
  faixas) saiu com a tela decomposta que ela desenhava.
- `qr(texto, { lado })`: QR escuro sobre claro, com zona de silêncio.

### `Viracao.conexao`

- `criarSelo() → { elemento, definir(estado, texto?), estado() }`, com `estado` ∈
  `conectado | reconectando | offline` (texto e ícone próprios; a cor nunca é o
  único canal).
- `criarWakeLock() → { suportado, ligar(), desligar(), ativo() }`: refaz o pedido
  ao voltar à vista enquanto estiver ligado. **Quando** ligar é de quem chama.
- `aoVoltarAVista(cb(motivo)) → desligar()`: `visibilitychange` (visível),
  `pageshow` (persistida) e `online`.

### `Viracao.telao` (o que outro agente usa)

| Membro | O que faz |
|---|---|
| `abrirCanal(modo, { sala, uid? }) → Promise<canal>` | **o ponto de encaixe do online**. `offline`: `canalLocal.criar({ persistirEm: chaveSessao(sala), uid })`. `online`: o canal-firebase da página, já com login e autoteste das regras (seção 10); lança erro com a explicação se o serviço não está pronto |
| `ligarSessao({ modo, sala, nomeRoteiro, criar, canal? }) → Promise<estado>` | cria (`criar: true`) ou carrega a sala com o `anfitriao`, liga os ouvintes, a barra e o desenho. Com `canal`, não chama `abrirCanal` |
| `salvarEstado(motivo?)` | baixa o estado da sala (formato abaixo). O `'manual'` avisa na tela; o automático (fim de rodada) só registra "estado salvo às HH:MM (r2)" na barra do apresentador (`[data-barra-salvo]`), para o aviso não cobrir o sorteio projetado |
| `estado()`, `sala()`, `modo()`, `chaveSessao(sala)`, `versaoApp` | leitura (e2e). Os dois e2e leem a versão daqui (e não de um `?v=1` escrito no teste), para não reprovar quando o `bin/versao.mjs` subir a versão |

**Barra do apresentador (D-038):** escondida por padrão, e começar a sessão não a mostra. Aparece
com H (liga e desliga; aberta pelo H, não some sozinha) ou com o mouse na faixa de 48 px da borda de
baixo (`BORDA_BARRA_PX`); aberta pela borda, some 3 s depois do último movimento do mouse na faixa
ou sobre ela, também com o mouse parado ali (só um modal aberto a segura). Movimento do mouse fora da faixa não a mostra. Os atalhos
de teclado valem com ela escondida, e os registros discretos (salvamento automático, ativos/membros)
continuam só nela.

**Controle de operador fora da projeção (D-047):** tudo o que só o apresentador usa fica na barra, e
nunca no `#palco` nem na faixa de entrada (a abertura, antes de projetar, é a exceção):
- botões "Exportar totais" (`[data-acao="exportar"]`) e "Apagar a sala (segure 2 s)"
  (`[data-acao="apagar"]`, habilitado só no passo `fim`), que eram da tela do fim;
- "N ativos / M membros" (`[data-contagem-ativos]`), que era do lobby;
- a dica do passo (`[data-barra-dica]`, atualizada pelo tique): as teclas da contagem à mão, o que
  fazer com os votos de celular de antes da queda, as teclas da formação das equipes, o tempo mínimo
  de conversa e o "Enter encerra" da rodada, a página do placar final e do comparativo, e o texto da
  exportação no fim.
Ficam na projeção só os controles que também são informação para a turma: os cartões da formação
das equipes (`.cartao-equipe`, quais equipes jogam) e, no offline, as letras da decisão de cada
equipe (`.botao-letra`, o que a equipe anunciou). O e2e (`e2e/telao-offline.e2e.mjs`,
`controlesNaProjecao`) confere isso em toda tela projetada.

**Aviso de operação junto da barra (revisão de 29/09):** em sessão (`body.em-sessao`), o `#aviso`
só aparece com a barra aberta (`body.barra-visivel`), logo acima dela (`--altura-barra`, medida no
`mostrarBarra`), e dura 15 s; o aviso de erro abre a barra, para o comando recusado não passar
calado. Na abertura, continua no topo. O `controlesNaProjecao` também reprova o `#aviso` à vista com
a barra escondida e o `#modal` aberto.

**Personas:** uma entrada por persona com equipe aberta (`.persona-linha`, `data-persona`), em duas
linhas: `.persona-quem` (as equipes, o nome, o ofício, que é a descrição até a primeira vírgula ou
ponto, e "N pessoas em casa") e `.persona-casa` ("básico R$ Y · {rótulo da outra renda} R$ Z" ou
"sem outra renda na casa", "· falta R$ W por mês" ou "sobra", com `motor.mesComum`;
`data-saldo-mes-comum`). A frase inteira da família e o básico item a item ficam no celular.

**Teclas:** Espaço (→, PageDown) avança, e no comparativo e no placar final pagina dentro do passo;
Enter encerra; P pausa; F tela cheia; H mostra ou esconde a barra; Ctrl+Z desfaz; 1 a 5 contam
(offline) e 1 a N abrem e fecham equipes; ↑ e ↓ trocam a afirmação da contagem (offline). As teclas C
(critério do placar) e V ("sem vencedor") saíram com a tela decomposta (D-041).

**Linha do tempo (D-042; rascunho, seção 7, item 15):** todo passo `bloco` mostra
`nav.linha-tempo` com os itens de `roteiro.linhaDoTempo(config, passos, { maxItens: 16 })`: um
item por passo do roteiro, menos `lobby` e `fim`; com mais de 16, os passos depois da última
rodada viram um item `final` só, com o nome do que ele junta ("Debrief, termômetro, medição,
fechamento"). Cada item leva `[data-trecho]` = índice do primeiro passo e `[data-passos]` = os
índices, separados por vírgula; o do passo atual, `aria-current="step"`; o seguinte,
`[data-seguinte="1"]` e `.trecho-seguinte`. A linha `.linha-tempo-seguir` diz "Você está aqui
(k de n) · a seguir: {nome do item seguinte}", ou "· é o último trecho" no último item: o "a
seguir" nunca aponta para fora da linha. Nos outros blocos, discreta (uma trilha de
marcas, com "mês N" dentro das rodadas); no bloco cujo título começa por "Mapa do seminário"
(`ehMapa`: o passo não tem campo próprio, e o validador descarta chave nova no roteiro), ela é o
conteúdo (`.linha-tempo-mapa`, todos os trechos por extenso, em duas colunas acima de seis), e o
placar resumido não aparece.

**Resultado da rodada (D-044, D-046, D-052; esquema v2.1):** uma frase por equipe: a equipe, a
letra da decisão (a dica, `title`, é o rótulo da opção do jeito do ofício da persona,
`historia.textoDaOpcao`, D-054), a carta, o custo real dela, a origem (curta, quando não é a maioria:
"ninguém votou", "empate na moeda", "na prorrogação", "pelo apresentador", este só online), as
contas do mês e, com saldo negativo, "dívida R$ D" (`.resultado-divida`, o saldo de depois do mês).
- **custo da carta** (`.resultado-custo`, `span.custo-carta`, de `resultados/{r}/{eq}.cartaCusto`):
  "N dias parado · renda perdida R$ X", só com o que for maior que zero; carta sem custo não escreve
  nada. Os gastos da carta vão nas contas (abaixo); só quando as parcelas conhecidas não somam os
  gastos do mês eles saem aqui, como "gastos da carta R$ Y";
- **o que veio de antes** (`.resultado-antes` > `.resultado-de-antes`, cada item `.de-antes` com
  `data-de-antes` = rótulo; de `resultados/{r}/{eq}.deAntes`, ou refeito pelo motor em sala antiga):
  os itens sem `gasto`, "rótulo ±R$ V" com sinal ("+25 dias da fratura −R$ 2.233 · INSS (45 dias)
  +R$ 2.431"); o rótulo é o do efeito no config, por isso curto. Revisão de 29/09, 2ª rodada, achado 10;
- **nome da carta** (`.resultado-carta`): o `curto` (D-040) quando a carta tem custo e o config o
  traz, e o título inteiro senão (fica na dica). O custo diz o resto, e o título repetia ("Queda
  leve: 5 dias parado · 5 dias parado"); o título inteiro acabou de aparecer no sorteio;
- **contas do mês** (`.resultado-contas`): "entrou R$ X[ · gastos R$ G] · básico R$ Y[ · juros R$ J]
  · faltou R$ Z" ou "sobrou R$ Z", de `resultados/{r}/{eq}.mes`. Os gastos só com `mes.gastos > 0`;
  entrou − gastos − básico − juros = o `saldoMes` do motor, e a conta lida na tela fecha. Os gastos
  saem por origem (`nomesDoMes`, achado 13): a da carta sem nome, e cada gasto de antes com o rótulo,
  juntas por " + " ("gastos R$ 1.650 + multa R$ 130"); com uma origem só, de antes, só ela ("multa
  R$ 130"); se as parcelas não somam `mes.gastos` (um gasto de opção), "gastos R$ G", com os gastos de
  antes nomeados como pedaços e os da carta no custo;
- **aperto** (`.grade-resultados[data-aperto]`): medido depois do desenho, só quando a lista
  transborda (seis equipes no pior caso: carta cara, origem, gastos por origem, dívida e o que veio de
  antes). Nível 1 esconde a origem (`.resultado-origem`); nível 2 também o que veio de antes
  (`.resultado-antes`). Os dois ficam no celular de cada equipe, e o texto continua no DOM.
Cada rótulo quebra como texto, e só a última palavra fica colada ao valor (`.conta-quebra`,
`.conta-fim`): com o pedaço inteiro sem quebra, a linha deixava meia linha vazia. O resultado usa
parte da margem lateral do palco, e o cartão tem padding lateral de .3em.
Os juros ao mês (`regras.jurosDividaMes`) vão uma vez no cabeçalho ("a dívida paga juros de J% ao
mês", numa linha só, até 17em), e não em cada equipe. O título do mês dessa tela é menor que o das
outras (1,3× o corpo): com o custo da carta, seis equipes de cartas caras dão três linhas cada, e o
cabeçalho em duas linhas não deixava a sexta caber. O cartão tem entrelinha 1,08 e quase nenhum
padding pelo mesmo motivo; a fonte continua nos 28 px (o e2e, parte 4, prova o pior caso).
Resultado sem `mes` ou sem `cartaCusto` (sala de antes do esquema v2 ou do v2.1) é refeito com
`motor.aplicar`, com o histórico. A animação das cartas mais extremas (`regras.destacarCartas`) usa
o efeito da carta no saldo do mês (o mês com a carta menos o mesmo mês sem carta): somar só as
linhas de origem `carta` deixava de fora os gastos, que no v2.1 saem com a origem `gasto`.

**Placar final em páginas (D-041, D-045):** paginação local do passo `placarFinal`
(`app.ui.pagina`, como no comparativo; a seção leva `data-pagina` e, na história, `data-equipe`):
1. `saldo`, "Quanto sobrou, e quanto faltou para o básico": uma barra por equipe que jogou
   (`placar[eq].ativa`), do maior saldo para o menor, com "faltou R$ X" ou "sobrou R$ X"
   (`.valor-saldo`) ao lado; o título conta quantas terminaram com saldo negativo ("5 de 6 equipes
   não fecharam as contas"; "As 6 equipes fecharam as contas" quando nenhuma); a referência com
   `persona` só nas linhas das equipes dela;
2. `escolhas`, "Escolha ou sorte?": uma linha por equipe, na mesma ordem, sem legenda
   (`.historia-conta`): "se não mudassem nada: R$ a → as escolhas: ±R$ b → a sorte: ±R$ c =
   terminaram com R$ d", com os totais a e d em `formatar.moeda` (nunca "+") e as variações b e c
   em `formatar.variacao` (sempre + ou −, "+R$ 0" no zero); o último passo (`.passo-final`) em
   negrito; a, b, c e d de `historia.escolhaOuSorte(placar[eq])` (o
   `motor.decompor` gravado pelo anfitrião, em reais inteiros que fecham a conta); a conta corre na
   mesma linha da equipe, para seis equipes caberem em 1024×768;
3. `historia`, uma página por equipe que jogou, na ordem do config: `historia.historiaDaEquipe`,
   com um `.historia-mes` por rodada (o título da rodada, a linha curta `.historia-narrativa` =
   `historia.linhaDoMes(h)`, em até duas linhas com reticências no fim e sem baixar dos 28 px; sem
   narrativa no conteúdo, `.historia-fatos` "escolheram: {rótulo} · aconteceu: {carta}") e a linha
   do dinheiro (`.historia-dinheiro`): o custo real da carta (`.historia-custo`, com a mesma regra do
   resultado da rodada, de `h.cartaCusto`), o que veio de antes (`.historia-de-antes`, de `h.deAntes`)
   e as contas do mês (`.historia-contas`, com os gastos por origem, a regra do resultado), na mesma frase: numa linha própria, três meses de narrativa de duas linhas, custo e
   contas passavam da altura de 1024×768. O texto da opção é o do ofício da persona da equipe
   (`historiaDaEquipe` já traz `rotuloPor`/`narrativaPor`, D-054). No fim, `.historia-final` com o
   saldo dos meses ("faltou/sobrou R$ X").
   A tela de decisão (`decidindo`) continua com o rótulo comum da opção: é a mesma para todas as
   equipes, e não mostra narrativa por persona.
A última página avança o roteiro. Sem nenhuma equipe no placar, uma página só ("Nenhuma rodada foi
jogada nesta sessão."). O `regras.placarPadrao` não é mais lido pelo telão.

**Histórico nas contas do telão:** o efeito da carta (a animação das cartas mais extremas) e o mês
refeito passam ao motor o histórico da equipe (`motor.historicoDe` com as rodadas anteriores do
roteiro), a mesma conta do anfitrião.

Também no `telao.js`: `app.lerEspelho` (só online, ligado pela seção 10)
devolve uma cópia da árvore da sala mantida localmente; alimenta "Continuar sem
celulares" e "Salvar estado".

**Estado salvo** ("Salvar estado", download automático ao fim de cada rodada,
D-015, e "Carregar estado"):
`{ formato: "viracao-estado", versaoApp, sala, salvoEm, dados }`, com `dados` = o nó
`salas/{S}` **sem** `votosEnquete`, `decisoes`, `presenca` e `membros` (nenhum voto
individual sai do banco, AGENTS.md regra 8). Carregar recria o canal-local com
`uid = dados.meta.hostUid` (seção 6) e recusa estado de outro `hashConfig`.

**localStorage** (prefixo `viracao:telao:v{versaoApp}:`, hoje `v1`; o `npm run versao` muda junto): `sala:{S}` (a
árvore do canal-local), `passo:{S}` (`{ indice, em }`, para o atraso da barra),
`baixados:{S}` (apurações já baixadas) e `ultima` (`{ sala, roteiro, hashConfig,
criadaEm, hostUid }`, para o "Retomar a sessão de …?").

**Offline, uma aba escritora por sessão:** começar, retomar, carregar estado e seguir sem
celulares pegam a trava `viracao:telao:{S}` (a mesma do online) antes de o canal-local
tocar no localStorage; outra aba do mesmo navegador é recusada ("já está aberta em outra
aba"). A sessão guardada de outra aba que segura a trava não é apagada.

**Votos individuais na árvore local:** o canal-local grava a árvore inteira no
localStorage. Nela ficam só os votos que o offline ainda usa: `votosEnquete/{e}/{m}` da
enquete do passo atual (e o `antes` da mesma enquete quando o passo é o `depois`, para a
transição) e `decisoes/{r}` da rodada do passo atual. A `presenca` sai sempre. A poda
acontece ao seguir sem celulares e a cada troca de passo no offline, pelo
`exportar`/`importar` do canal-local (as travas não deixam nem o anfitrião gravar voto
alheio).

**Fila de comandos:** um comando de cada vez, e mais:
- online sem conexão (selo em "reconectando" por queda, e não pela reconexão que o próprio
  telão força ao voltar à vista), o comando é recusado na hora, com aviso;
- comando online que não termina em 10 s libera a fila (o aviso diz que ele pode chegar
  quando a rede voltar);
- os comandos que dependem do passo (avançar, encerrar, pausar/retomar, +30 s, desfazer,
  pular, encerrar o jogo, decidir por equipe, abrir e fechar equipes) levam a `geracao` que
  o apresentador via ao apertar a tecla; se o estado mudou até o comando rodar, ele é
  descartado ("o estado mudou; confira e repita"). O mesmo se a sessão trocou;
- "Continuar sem celulares" e "Salvar estado" não passam pela fila (socorro).

**Confirmações:** as que encurtam a conversa das equipes (encerrar no tempo mínimo),
desfazem uma apuração ou a abertura de uma votação (D-037), ou descartam dados (encerrar a enquete offline com afirmação sem
contagem; a primeira contagem à mão com votos de celular de antes da queda) abrem com o
foco no "Cancelar": confirmar pede Tab e Enter, ou um clique.

**Enquete offline no modo `todas`:** Espaço (→, PageDown) vai para a próxima afirmação;
na última, avisa que o Enter encerra a enquete inteira. Com votos de celular de antes da
queda e nenhuma contagem à mão, a tela diz quantas pessoas votaram, e o Enter apura esses
votos; a contagem à mão os substitui (métodos nunca se misturam, seção 7).

---

## 10. Modo online: o telão com celulares e o celular (`js/aluno.js`)

### Telão online (`js/telao.js`, seção "Modo online")

Só fora de `file://`. A abertura ganha o bloco "3. Com celulares" (o offline passa
a "4. Sem celulares"), que prepara o serviço uma vez por página:
1. `?emulador=1`, só em `localhost`/`127.0.0.1`: a conexão do emulador (projeto
   `demo-seminario`, sem `conexao.json`). Fora disso, `../conexao.json` com
   `no-store`; falta, erro ou `COLE_AQUI` em `apiKey`, `authDomain`, `databaseURL`,
   `projectId` ou `appId` = só o modo sem celulares, com a explicação.
2. SDK: `import()` de `https://www.gstatic.com/firebasejs/12.19.0/firebase-{app,auth,database}.js`,
   num `Promise.race` de 4 s. Falhou: "Tentar de novo", que **recarrega a página** (o
   navegador guarda a falha do `import()` de um endereço para o documento inteiro), e o
   offline continua ali.
3. `canalFirebase.criar({ sdk, conexao, longPolling: ?lp=1, emulador, ambienteLocal })` e `entrar()`.
4. Autoteste: `autoteste/{uid}` tem de ser recusado e `regrasVersao/{uid} = REGRAS_VERSAO` (hoje `"v3"`)
   tem de passar. Senão, "REGRAS ABERTAS ou DESATUALIZADAS: não use", e criar e
   retomar ficam desabilitados.
5. Primeira conexão acima de 8 s: sugere a "Rede restrita".

- **PIN:** campo de senha, só em memória (apagado depois de ligar). Vai para
  `pedidosAnfitriao/{uid}` antes do `criarSala()` (sempre) e antes do
  `carregarSala()` quando `meta.hostUid` não é o uid (outra máquina). Uma recusa
  `PERMISSION_DENIED` vira "o PIN não confere com o cadastrado no console".
  **O pedido vive só durante a operação:** depois de criar ou assumir (deu certo ou
  não), o telão grava `pedidosAnfitriao/{uid} = null`. Deixado no banco, ele dava ao uid
  anônimo daquele navegador um PIN_OK permanente (assumir qualquer sala viva sem saber o
  PIN) e fazia o telão antigo tomar a sala de volta só por voltar à vista.
- **Criar:** `gerarSala()`, com até 8 sorteios quando o código "já existe".
  **Retomar:** o código digitado (preenchido com a última sala online); o roteiro
  vem de `meta.roteiro`.
- **Uma aba por máquina (I3):** `navigator.locks.request('viracao:telao:{S}', { ifAvailable: true })`
  segura a sala enquanto a sessão dura; outra aba do mesmo navegador é recusada.
- **Depois de ligar** (tudo em `app.desligar`, desligado ao encerrar a sessão ou ao
  seguir sem celulares):
  - espelho = ouvinte em `salas/{S}` (o anfitrião lê a sala inteira), lido por `app.lerEspelho()`;
  - pulso: `salas/{S}/pulso = marcadorDeHora()` a cada `tempos.pulsoSeg`, só com
    a conexão de pé; recusado = outra máquina assumiu: o telão entra no **modo passivo**
    (para o pulso, a barra fica desabilitada, nenhum comando sai, nem "Continuar sem
    celulares" nem "Salvar estado", que sairiam de um espelho congelado; o aviso manda
    recarregar e retomar com o PIN);
  - selo pelo `aoMudarConexao`;
  - `distribuirAtrasados()` quando o espelho mostra, depois da trava, membro sem
    equipe aberta (uma vez por conjunto de uids).
- **Ativos e inativos** (arquitetura, seção 10): ativo = membro com `presenca` nos
  últimos 60 s. "N ativos / M membros" (`[data-contagem-ativos]`) fica só na barra (D-047;
  o lobby projeta os conectados; só números: nem uid nem crachá); o denominador do "n de m
  votaram" e do "n de m decidiram" são os ativos. A presença envelhece sem aviso do banco:
  o tique confere a contagem e redesenha quando ela muda. "Remover inativos (segure)" na
  barra, sem tecla de atalho (apaga membros), segura 2 s e chama
  `anfitriao.removerInativos(120000)`: 2 min, o dobro da janela de ativo, para quem só
  trocou de rede não perder a equipe. O aviso diz quantos saíram.
- **QR:** `../aluno/?sala=S`, com `&lp=1` na "Rede restrita" e `&emulador=1` no ensaio com o emulador.
- **Ao voltar a ficar visível:** `canal.reconectar()`, e relê meta e estado. Sem rede de
  verdade (selo em "reconectando"), só o `reconectar()`: a releitura fica para quando a
  conexão voltar (enfileirada, ela ocupava a fila por 10 s e terminava num erro técnico
  projetado). Online, confere `meta.hostUid` antes de reler: se outra máquina é a
  anfitriã, entra no modo passivo, e **nunca** chama o `carregarSala()` (que gravaria o
  hostUid de volta).
- **"Continuar sem celulares":** `canal.desconectar()` (só de ida: a abertura passa
  a pedir para recarregar), e o canal-local nasce com `uid = meta.hostUid` e o
  espelho inteiro, no formato do banco (com a poda dos votos, seção 9). Apaga
  `ultimaOnline`: depois de recarregar, a abertura não oferece religar a sala do banco,
  que ficou no passo de antes da queda. "Salvar estado" online também sai do espelho.
- **localStorage:** `viracao:telao:v{versaoApp}:ultimaOnline = { sala, roteiro, hashConfig, criadaEm }`.

### Celular (`aluno/index.html`, `js/aluno.js`)

Scripts, nesta ordem: `historia.js`, `aluno-logica.js`, `canal-firebase.js`, `formatar.js`,
`dom.js`, `graficos.js`, `conexao.js`, `aluno.js`. O celular não carrega motor nem
anfitrião: quem decide é o telão.

- **Entrada:** `?sala=` ou o código digitado (só o alfabeto da sala). Com a sala
  guardada no aparelho, recarregar entra direto.
- **Falha do SDK:** o `import()` da CDN que falha por rede (e não pelo tempo-limite de 4 s,
  em que ele ainda pode chegar) fica guardado pelo navegador para aquela página, e repetir
  o `import()` falha na hora. O celular então recarrega a página, com a sala na URL e a
  marca `entrarAposRecarga` no sessionStorage (entra direto na sala), no máximo uma vez a
  cada 15 s (`recarregouEm`, no sessionStorage). Navegador embutido
  (`/Instagram|FBAN|FBAV/` no user-agent): o "Entrar" fica bloqueado, com a URL copiável.
- **Entrar:** `entrar()`, lê `meta` (sem meta: "não há sala com o código") e ouve
  `meta`, `conteudo`, `estado`, `pulso`, `membros`, `resultados` e `placar`.
- **Membro:** `membros/{uid} = { entrouEm: marcadorDeHora() }` só quando não existe
  e `meta.entradaAberta`. Nunca regrava: um `entrouEm` novo tiraria o voto da
  decisão aberta. Membro que some (removido por inatividade) é registrado de novo,
  no máximo a cada 5 s; com a entrada reaberta, quem esperava entra sozinho.
- **Depois do membro confirmado:** presença (a cada 20 s, com a página visível;
  `apagarAoDesconectar`, refeito a cada reconexão); `decisoes/{r}/{minhaEquipe}`
  (religado quando a equipe ou a rodada muda); e as folhas do próprio voto,
  `votosEnquete/{e}/{m}/{a}/{uid}` (as do momento aberto; no comparativo, antes e
  depois). Ouvinte recusado religa com espera de 1, 2, 4… até 10 s.
- **Tela:** `alunoLogica.telaDoAluno`, com `membros` (a contagem ao vivo usa o
  filtro da apuração). Só do celular: `entrada`, `conectando`, `erro` e
  `salaEncerrada` (a meta sumiu).
- **Voto:**
  - o pendente vai para o `localStorage` antes do `gravar()`;
  - "registrado" só com a confirmação do servidor;
  - 5 s: "Enviando…" e `reconectar()`; 20 s: "Guardado no aparelho: será reenviado";
  - `PERMISSION_DENIED`: "A votação fechou antes do seu voto chegar";
  - botões desabilitados enquanto envia;
  - enquanto não confirma (e no guardado), a tela e a contagem usam o valor já
    confirmado: o SDK aplica a escrita no cache antes da confirmação. O guardado
    conta como respondido só para a navegação da enquete;
  - ao carregar, reenvia os pendentes com `pendenteAindaVale`; os que não valem
    são descartados, com aviso.
- **Queda própria:** `.info/connected` falso por mais de 5 s com a página visível
  = `reconectar()`, repetido a cada 10 s; presença sem confirmação em 5 s (sonda) =
  `reconectar()`; `visibilitychange`, `pageshow` e `online` = `reconectar()` e
  releitura. Pulso do telão com mais de 3 × `pulsoSeg`: faixa "Aguardando o telão",
  que nunca reconecta; durante `bloco`, nem a faixa.
- **Redesenho de 29/09 (D-041, D-043 a D-046; esquema v2.1: D-052, D-054, D-055).** O que cada tela do jogo mostra,
  com as classes que o e2e confere:
  - **Persona:** a família em uma linha (`.familia`, "Em casa: …"), o básico da casa
    item a item com a fonte de cada valor, o total ("O básico da família custa R$ Y
    por mês", `.basico-linha`) e a outra renda da casa, quando houver.
  - **Decisão e prorrogação**, de cima para baixo: cabeçalho com o cronômetro
    (`tempos.decisaoSeg`, 120 s); o contexto da família (`.contexto-familia`, só
    quando `rodada.contexto[persona]` existe); o básico e a dívida (`.pressao`); até
    4 opções (`.opcao-aluno`, com `data-opcao-bloco`), cada uma com a letra, o
    rótulo da persona da equipe (D-054) e a contagem ao vivo da equipe. O texto da
    rodada fica no telão: com ele, só a opção A cabia antes de rolar (revisão de
    29/09). **A tendência nunca aparece.** No lugar do "Decisão da equipe", o
    cabeçalho diz "Toque para ler; vote no botão" (achado 19 da 2ª rodada de 29/09:
    a frase inteira, depois das opções, ficava abaixo da dobra em 360×740, e uma
    linha a mais antes das opções empurrava a letra D para fora da primeira tela).
    Depois das opções, a dica inteira ("Toque numa opção para ler a explicação; o
    voto só vale no “Votar nesta”") e a situação completa (família, conta do
    último mês e indicadores), fechada.
  - **Tocar para ler, votar no botão (D-055):** tocar numa opção
    (`.botao-opcao-aluno[data-opcao]`, com `aria-expanded`) abre a explicação
    dela **sem votar**; tocar de novo fecha, e tocar noutra troca a aberta (uma por
    vez, em `app.ui.aberta`, que zera a cada passo). A explicação
    (`.opcao-detalhe[data-detalhe]`) traz a narrativa da persona
    (`.opcao-narrativa`, por `historia.textoDaOpcao`: a `telaDoAluno` manda só id,
    rótulo e votos) e o botão "Votar nesta" (`[data-votar]`, 48 px, desabilitado
    sem `podeVotar` ou com um voto em voo). Na opção que já tem o voto do aparelho,
    uma frase (`.opcao-votada`) no lugar do botão. A opção votada fica marcada
    (`.meu-voto`, `data-meu-voto="1"`, fundo claro e o texto "✓ seu voto"). Dá para
    abrir outra e mudar o voto até o fechamento.
  - **Dobra:** sem nenhuma aberta, a primeira opção cabe inteira em 360×740, e as
    letras de todas as opções aparecem sem rolar (o e2e:online confere). Enquanto a
    última estiver abaixo da tela, o botão fixo "Mais opções abaixo ↓"
    (`[data-aviso-rolagem]`) fica visível e rola até ela. Conferido a cada desenho,
    rolagem e mudança de tamanho. Com uma opção aberta, a tela pode passar da
    dobra: logo depois de abrir (e só aí: a contagem ao vivo redesenha a tela a cada
    voto), a opção rola para a vista (`scroll-margin` desconta o topo fixo e o
    aviso), e o aviso some enquanto cobriria o "Votar nesta".
  - **Conta do mês** (`.conta-mes`, no resultado e na situação dos blocos): "Entrou
    R$ X · gastos R$ G · o básico da família custa R$ Y · juros da dívida R$ J"
    (gastos e juros só quando existem) e, em destaque, "Faltou R$ Z" ou "Sobrou
    R$ Z" (D-052). Com custo fixo do trabalho ou outra renda na casa, uma linha diz
    de onde veio o "entrou": "Do trabalho e da decisão: R$ T · custos fixos do
    trabalho: −R$ F · {outra renda}: R$ O" (era "Do trabalho", e levava o
    empréstimo e o INSS dentro; achado 10). Com `deAntes`, uma linha
    `.conta-de-antes` "Veio dos meses anteriores (já na conta): rótulo ±R$ V · …". Os números saem de `mes` gravado; `data-entrou`,
    `data-gastos`, `data-basico`, `data-juros`, `data-saldo-mes` e `data-resultado`
    (`faltou`|`sobrou`) repetem os valores. Sala de antes do v2.1 (sem `gastos` nem
    `custosFixos`) mostra a linha como antes.
  - **Custo da carta** (`.carta-custo`, D-052; no resultado, depois da narrativa
    da carta, e no "último mês" da situação): "O que a carta custou: 20 dias parado
    · renda perdida R$ X · gastos R$ Y", com o `cartaCusto` gravado; cada parte só
    quando é maior que 0, e nenhuma linha se as três forem 0 ou sem `cartaCusto`.
    `data-dias-parado`, `data-renda-perdida` e `data-gastos` repetem os valores.
    Mesma forma para toda carta: a grave não ganha destaque.
  - **Dívida** (`.divida`): "Dívida R$ D · juros de J% ao mês", só com o saldo
    negativo.
  - **Antes do primeiro mês**, a situação mostra a família e o básico, sem conta do
    mês.
  - **Placar final:** a história da equipe no lugar do "último mês" e "Escolha ou
    sorte?" contado como história ("Se não mudassem nada · As escolhas · A sorte ·
    = Terminaram com", as variações sempre com + ou −, o total do fim em
    `.placar-total`), sem "piloto automático" nem "efeito das decisões" (D-041).
    A decisão sem voto aparece como "ninguém votou: ficou o de sempre".
  - **Fim:** a história da própria equipe, mês a mês (`.historia-mes`, com
    `data-rodada`): opção e narrativa (do jeito da persona, D-054), carta e
    narrativa, o custo da carta e a conta do mês ("Entrou · gastos · básico · juros
    · faltou"). Carta grave aparece como as outras, sem destaque.
- **Wake Lock** só nas telas `enquete`, `decisao` e `prorrogacao`.
- **Faixa "atualize a página"** quando `meta.versaoApp` ≠ `VERSAO_APP`.
- **localStorage** (prefixo `viracao:aluno:`, sem a versão, de propósito: o voto
  guardado pela versão velha é reenviado pela nova): `sala`, `lp` (`?lp=1` é
  lembrado; `?lp=0` esquece) e `pendentes:{S}:{uid}` = `{ [caminho]: pendente }`.
- `Viracao.aluno` (só leitura, para o e2e): `versaoApp`, `uid()`, `sala()`,
  `tela()`, `pendentes()`, `envios()`.

### Ferramentas

- `bin/servir.mjs`: `servir({ porta = 8080, host = '127.0.0.1', raiz }) → Promise<{ url, servidor, fechar() }>`
  (porta 0 = livre); na linha de comando, `node bin/servir.mjs [porta] [--host h]`.
  Sem cache, `/pasta` → 301 para `/pasta/` (como o GitHub Pages), nunca entrega
  dotfile nem `node_modules`, e `/favicon.ico` responde 204.
- `bin/versao.mjs`: `node bin/versao.mjs [N] [--conferir] [--raiz pasta]`. Troca
  `?v=A"` por `?v=B"` nas três páginas e `const VERSAO_APP = 'A';` em `js/telao.js`
  e `js/aluno.js`, por split/join. `--conferir` sai com 1 se algum `src`/`href`
  com `?v=` diverge da `versaoApp`.
- `e2e/sessao-online.e2e.mjs` (`npm run e2e:online`, fora do `check`): sobe o
  `servir` e o emulador (via `bin/emulador.mjs`), semeia o PIN e joga a sessão com
  o telão e 3 celulares de 360×740 (e um quarto, que entra e some, para os inativos). O
  SDK sai do `node_modules/firebase` no endereço da CDN (sem internet). O que ele precisa
  do conteúdo sai do `config.json`, servido pelo Playwright a todo telão do teste. Se o
  `config.json` não passa no validador (ou com `E2E_FIXTURE=1`), o conteúdo é o
  `test/fixtures/config-teste-v21.json` com ajustes só no e2e: a enquete de entrada
  em "todas", um bloco entre as personas e o primeiro mês, uma narrativa de cerca de
  110 letras em cada opção, e, para a persona da equipe 1, `rotuloPor` e `narrativaPor`
  (esta com cerca de 150 letras: o pior caso de uma opção aberta) em todas as opções.
  O básico do Rafa sobe para R$ 5.000, para o mês 1 da equipe 1 nunca fechar (passa
  sempre pelo "faltou", pela dívida e pelos juros), e no mês 1 só o acidente pode sair
  (20 dias parado, conserto e remédio), para o custo da carta aparecer sempre. O teste
  confere tocar sem votar, "Votar nesta", mudar o voto, o "Votar nesta" à vista com uma
  opção aberta (a primeira e a última), o texto por persona (decisão, resultado,
  situação e história, contra `historia.textoDaOpcao`) e o custo da carta; com o
  `config.json`, as mesmas conferências valem contra o que o config tiver (sem
  `rotuloPor`, o rótulo padrão). As capturas `e2e/capturas/celular-*.png` antigas são
  apagadas no começo. O
  bloco "sem serviço" recebe um `conexao.json` com
  `COLE_AQUI` servido pelo Playwright: o do repositório tem as chaves do projeto real, e
  nenhum passo do e2e pode falar com ele (AGENTS.md, regra 6).
