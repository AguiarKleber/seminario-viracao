# Como editar o `config.json`

Todo o conteúdo do seminário mora no `config.json`: personas, equipes, rodadas,
cartas, afirmações, tempos e roteiros. O código é genérico, e nada disso fica
escrito nele (AGENTS.md, regra 1). Esta página explica cada campo, a linguagem
de efeitos das cartas e como conferir o equilíbrio do jogo com o validador.

Os valores do jogo, com a fonte de cada um, estão em
[rascunho-conteudo.md](rascunho-conteudo.md). As decisões de conteúdo estão em
[decisoes.md](decisoes.md) (D-024 em diante).

---

## Antes de mexer

1. **Nunca edite no dia da aula.** O conteúdo fica congelado até 06/10 (D-036).
   Um `config.json` novo muda o hash, e com ele:
   - o telão não retoma uma sala criada com o config anterior;
   - o pendrive deixa de carregar o estado salvo pelo telão online;
   - um navegador pode passar até 10 minutos com a versão anterior do site.
2. **Todo valor em R$ precisa de fonte e de validação (D-005).** A fonte vai no
   campo `fonte`, que nunca aparece no telão.
3. **Edite num editor que salve em UTF-8 sem BOM**, como o VS Code ou o Bloco de
   Notas do Windows 11. **Nunca** regrave o arquivo com comandos do PowerShell
   5.1 (`Set-Content`, `Out-File`, `>`): eles corrompem os acentos, e "é" vira
   "Ã©". O validador recusa o arquivo corrompido e diz as linhas. Para voltar à
   última versão salva no git: `git restore config.json`.
4. **Depois de cada edição, rode o validador** (`npm run validar`). Ele tem de
   dizer "Sem erros".

## O ciclo de uma edição

1. Edite numa branch, nunca direto na `main`. Pelo GitHub, use o lápis e escolha
   "Create a new branch for this commit and start a pull request".
2. Rode `npm run validar` e leia os avisos (veja adiante).
3. Olhe as telas afetadas no telão local (`npm run servir`, ou duplo clique em
   `telao/index.html`): o texto novo cabe? O `npm run e2e` confere sozinho que
   nenhuma tela do telão rola e que nenhum texto fica abaixo de 28 px.
4. Rode `npm run check`.
5. Abra o PR e faça o merge. Espere até 10 minutos, abra o telão publicado e
   confira no bloco 1 a versão e o hash novos. O telão lê o config só ao abrir:
   se ele já estava aberto, recarregue a página.
6. Baixe o ZIP de novo para o pendrive (README, passo 11).

**Sem Node na máquina?** O telão também valida. Baixe o `config.json` editado,
abra `telao/index.html` por duplo clique e clique em **Carregar config.json**. O
telão lista **todos** os erros e se recusa a criar a sala até que sejam
corrigidos. As conferências de equilíbrio, porém, só saem no `npm run validar`.

---

## Mapa do arquivo

| Chave | O que guarda | Onde aparece |
| --- | --- | --- |
| `versao` | Nome da versão do conteúdo | Abertura do telão |
| `titulo` | Título do seminário | Telão e celular |
| `tempos` | Duração das votações | Cronômetros |
| `regras` | Regras do jogo e do placar | — |
| `escala` | Os 5 rótulos da escala de 1 a 5 | Botões do celular, legendas do telão |
| `indicadores` | Saldo, energia, proteção | Placar, persona, resultado |
| `personas` | As pessoas do jogo | Telão (personas) e celular |
| `equipes` | Nome, cor, forma e persona de cada equipe | Todas as telas do jogo |
| `rodadas` | Os meses do jogo, com as opções | Decisão, resultado, celular |
| `cartas` | Os eventos sorteados | Sorteio, resultado, celular |
| `enquetes` | As afirmações de 1 a 5 | Enquetes, termômetro, comparativo |
| `referencias` | Linhas de comparação no placar final | Placar final |
| `roteiros` | A sequência de passos de cada duração | O telão inteiro |

**Ids.** Todo `id` usa só letras minúsculas sem acento, algarismos e `_`, até 24
caracteres e com pelo menos uma letra (por exemplo `motoboy`, `r1`,
`semana_boa`). Os ids de equipe são `e1` a `e6`. Cada id é único na sua lista.
Maiúscula, hífen, espaço ou acento num id é erro.

**Ordem.** A ordem em que as coisas aparecem no arquivo é a ordem em que
aparecem na tela.

**Texto vazio** (`""`) é erro. Campo opcional que não se quer usar: tire a chave.

---

## Campo a campo

### `versao` e `titulo`

```json
"versao": "2026-10-06a",
"titulo": "Viração: quem é o patrão?"
```

- `versao`: texto livre. O telão mostra na abertura ("Válido · versão …"). Mude a
  cada edição, para saber qual está carregada.
- `titulo`: aparece no telão (abertura, lobby, Fim) e no celular.

### `tempos`

```json
"tempos": { "enqueteSeg": 60, "decisaoSeg": 90, "decisaoMinSeg": 45, "prorrogacaoSeg": 20, "gracaSeg": 5 }
```

Todos em segundos, inteiros e maiores que 0. **Nenhum tempo fecha nada sozinho**:
quem encerra é o apresentador (D-010). O prazo serve ao cronômetro e à regra do
servidor, que recusa o voto atrasado.

| Campo | O que é |
| --- | --- |
| `enqueteSeg` | Tempo de cada votação de enquete. Na enquete `uma_por_vez`, vale para cada afirmação; na `todas`, para todas juntas |
| `decisaoSeg` | Tempo da decisão da rodada |
| `decisaoMinSeg` | Tempo mínimo de conversa. Antes dele, o Enter pede confirmação. Maior que `decisaoSeg` gera aviso |
| `prorrogacaoSeg` | Tempo da prorrogação de empate |
| `gracaSeg` | Opcional (padrão 5). Segundos depois do prazo em que o voto ainda é aceito |
| `pulsoSeg` | Opcional (padrão 10). De quanto em quanto tempo o telão manda sinal de vida. O celular mostra "Aguardando o telão" depois de 3 vezes esse tempo sem sinal |

### `regras`

```json
"regras": {
  "desempate": "prorrogacao-depois-moeda", "cartaPor": "equipe", "mostrarChances": "no_sorteio",
  "placarPadrao": "efeitoDecisoes", "alvoPorEquipe": 3, "minPareados": 5, "destacarCartas": 2
}
```

| Campo | Aceita | O que faz |
| --- | --- | --- |
| `desempate` | só `"prorrogacao-depois-moeda"` | Empate: prorrogação e, se continuar, moeda (D-022) |
| `cartaPor` | só `"equipe"` | Uma carta por equipe (D-013) |
| `mostrarChances` | só `"no_sorteio"` | As chances aparecem só no sorteio (D-012) |
| `placarPadrao` | `efeitoDecisoes`, `renda` (ou o id de outro indicador), `sorte`, `piorCaso` | O critério com que o placar final começa. A tecla C troca |
| `alvoPorEquipe` | inteiro ≥ 1 | O "Me coloque numa equipe" completa cada equipe até este número, na ordem das equipes, antes de abrir a próxima |
| `minPareados` | inteiro ≥ 1 | Com menos pessoas que responderam as duas vezes, o comparativo mostra "turmas diferentes" |
| `destacarCartas` | inteiro ≥ 0 | Quantas cartas, as de efeito mais forte, ganham destaque no resultado. Carta grave nunca anima |

Os três primeiros só têm um valor porque só um foi decidido, e o motor não
implementa outro.

### `escala`

```json
"escala": {
  "curtos": ["Discordo muito", "Discordo", "Neutro", "Concordo", "Concordo muito"],
  "longos": ["Discordo totalmente", "Discordo", "Nem concordo nem discordo", "Concordo", "Concordo totalmente"]
}
```

Exatamente 5 rótulos em cada lista, do 1 ao 5. Os `curtos` vão nos botões do
celular; os `longos`, nas legendas do telão.

### `indicadores`

```json
{ "id": "renda", "nome": "Saldo acumulado", "formato": "moeda", "inicial": 0, "min": -10000, "max": 100000 }
```

- O indicador `renda` é obrigatório: é nele que o placar é decomposto em piloto
  automático, efeito das decisões e sorte.
- `formato`: `moeda` (R$ sem centavos) ou `inteiro`.
- `min` menor que `max`, e `inicial` entre os dois. Depois de cada mês, o valor é
  preso entre `min` e `max`.
- `fonte` é opcional.

### `personas`

```json
{
  "id": "motoboy",
  "nome": "Jonas",
  "descricao": "Motoboy, 34 anos, entrega por aplicativo com moto financiada. Divide as contas com a companheira.",
  "inicial": { "energia": 7 },
  "todoMes": [
    { "soma": { "renda": 2200 }, "rotulo": "entregas do mês, já sem a gasolina", "fonte": "IBGE, PNAD Contínua…" },
    { "soma": { "renda": -1760 }, "rotulo": "aluguel, comida e contas", "fonte": "DIEESE/Conab…" }
  ]
}
```

- `descricao`: o telão mostra só a primeira frase; o celular mostra inteira.
- `inicial` (opcional): troca, só para esta persona, o `inicial` do indicador.
- `todoMes` (opcional): efeitos aplicados em toda rodada, antes de todos os
  outros. É a renda e o custo de vida do mês.
- Persona sem nenhuma equipe gera aviso: ela não joga.

### `equipes`

```json
{ "id": "e1", "nome": "Laranja", "cor": "#E69F00", "forma": "circulo", "persona": "motoboy", "obrigatoria": true, "lugar": "perto da janela" }
```

- **No máximo 6.** A ordem da lista é a ordem em que o "Me coloque" preenche as
  equipes, a ordem em que elas somem quando há menos de 6, e a posição que dá a
  cor e a forma a cada uma (D-027). No conteúdo validado em 28/09: Jonas, Jonas,
  Daiane, Marcos, Kauã e Rose, com as duas do Jonas `obrigatoria`.
- `cor`: hexadecimal, diferente entre as equipes. A paleta é a Okabe-Ito, pensada
  para quem não distingue cores (D-016):

  | Posição | Cor | Nome |
  | --- | --- | --- |
  | e1 | `#E69F00` | Laranja |
  | e2 | `#56B4E9` | Azul-céu |
  | e3 | `#009E73` | Verde-azulado |
  | e4 | `#0072B2` | Azul |
  | e5 | `#D55E00` | Vermelhão |
  | e6 | `#CC79A7` | Roxo-rosado |

- `forma`: `circulo`, `triangulo`, `quadrado`, `losango`, `estrela`, `cruz` ou
  `hexagono`, diferente entre as equipes. Outro nome vira um círculo com miolo. Forma, número
  e nome aparecem sempre juntos: a cor nunca é o único jeito de reconhecer a
  equipe.
- `persona`: o id de uma persona. Duas equipes podem ter a mesma (D-004).
- `obrigatoria` (opcional, padrão `false`): com `true`, a equipe nunca fecha. Sem
  ninguém, ela joga no piloto automático ou com a decisão do apresentador.
- `lugar` (opcional): aparece na tela de formação das equipes, para cada uma
  saber onde sentar (D-018).

### `rodadas`

```json
{
  "id": "r1",
  "titulo": "Mês 1: quanto trabalhar?",
  "texto": "Quem fica mais tempo online recebe mais pedidos.",
  "padrao": "c",
  "efeitosGerais": [],
  "opcoes": {
    "a": { "rotulo": "Trabalhar o máximo: 12 horas, 7 dias", "narrativa": "Fiquei online da manhã até a noite.", "efeitos": [] },
    "b": { "rotulo": "Jornada de sempre e abrir o MEI", "narrativa": "Mantive a rotina e abri o MEI.", "efeitos": [] },
    "c": { "rotulo": "Jornada de sempre, sem pagar nada", "narrativa": "Mantive a rotina e não paguei nada.", "efeitos": [] }
  }
}
```

- `titulo` e `texto`: a situação do mês, no telão e no celular.
- `padrao`: a opção que vale quando ninguém da equipe vota ("piloto automático:
  o app decidiu por vocês"). Não deve ser a de maior saldo: o validador avisa,
  porque premiaria quem não votou.
- `efeitosGerais` (opcional): efeitos para todas as equipes nesta rodada, logo
  depois do `todoMes`. Por exemplo, o corte da plataforma no mês 2.
- `opcoes`: um mapa por id. As letras A, B, C no telão seguem a ordem do arquivo.
  - `rotulo`: o texto do botão no celular e da opção no telão. Curto.
  - `narrativa` (opcional): em primeira pessoa. O celular mostra na situação da
    persona e no resultado.
  - `tendencia` (opcional): aceito pelo validador, mas hoje nenhuma tela mostra.
  - `efeitos`: obrigatório. Use `[]` para nenhum.
  - `fonte` (opcional).

### `cartas`

```json
{
  "id": "acidente",
  "titulo": "Acidente: 20 dias parado",
  "curto": "Acidente",
  "narrativa": "Sofri um acidente e fiquei 20 dias sem poder trabalhar.",
  "peso": 2,
  "rodadas": ["r2", "r3"],
  "tom": "grave",
  "ajustesDePeso": [ { "se": { "persona": ["motoboy", "bike", "motorista"] }, "soma": 3 } ],
  "efeitos": [ { "se": { "persona": "motoboy" }, "soma": { "renda": -1465 }, "rotulo": "20 dias sem trabalhar" } ]
}
```

- `titulo`: no sorteio e no resultado do telão. `narrativa` (opcional): no
  celular.
- `curto` (opcional, D-040): o nome da carta escrito **dentro da fatia** do
  sorteio, junto da chance ("Normal 55%"). Texto de até 12 caracteres; acima de
  10 o validador avisa, porque quase nunca cabe. O telão só escreve o rótulo
  quando ele cabe na largura da fatia; se não cabe, a fatia fica só com a
  porcentagem (ou sem nada, se nem ela cabe), sem reticências cortando a
  palavra. Na prática, só as fatias largas levam o nome: nas estreitas, o que
  identifica as graves é a chance escrita sob o nome da equipe ("cartas graves
  4%"). A carta grave usa o mesmo estilo das outras. Sem `curto`, a fatia leva
  só a porcentagem, como antes.
- `peso`: inteiro, 0 ou mais. Peso 0 nunca sai.
- `rodadas` (opcional): em que rodadas a carta pode sair. Sem a chave, em todas.
  Lista vazia é erro.
- `somenteSe` (opcional): uma condição. A carta só entra no baralho da equipe
  quando ela vale.
- `ajustesDePeso` (opcional): é aqui que **a decisão muda o tamanho das fatias**.
  Cada ajuste tem uma condição `se` e uma `soma` (acrescenta ao peso) ou um
  `multiplica` (multiplica o peso, 0 ou mais). Os ajustes valem na ordem do
  arquivo.
- `tom` (opcional): o único valor é `"grave"`. A carta grave aparece hachurada no
  sorteio e, no resultado, sem animação e sem cor de destaque.
- `efeitos`: obrigatório (`[]` para nenhum).
- `fonte` (opcional).

### `enquetes`

```json
{
  "id": "entrada",
  "titulo": "Termômetro de entrada",
  "pareada": true,
  "revelar": "so_no_comparativo",
  "modo": "todas",
  "afirmacoes": [ { "id": "a1", "texto": "Quem trabalha por aplicativo é empreendedor." } ]
}
```

- `pareada`: `true` na enquete do antes e depois, que usa os momentos `antes` e
  `depois` e tem comparativo. `false` na enquete de uma vez só, que usa o
  momento `unico`.
- `revelar`: quando o telão mostra o resultado.
  - `so_no_comparativo`: só no fim (D-011). É o da enquete pareada.
  - `ao_vivo`: o gráfico muda enquanto a turma vota. É o do Termômetro.
  - `ao_encerrar` (padrão): depois que o apresentador encerra.
- `modo`:
  - `todas` (padrão): o telão lista as afirmações, e um prazo só vale para todas.
    Sem celulares, o telão mostra uma por vez para a contagem à mão, e o Espaço
    passa para a próxima; o Enter encerra todas juntas e pede confirmação se
    alguma ficou sem contagem;
  - `uma_por_vez`: o telão mostra uma afirmação por vez, cada uma com o seu
    prazo, e o Espaço passa para a próxima.

  No celular, é sempre uma afirmação por vez.
- `afirmacoes[].texto`: até 110 caracteres. Acima disso, o validador avisa que
  pode não caber no celular sem rolagem.
- No conteúdo validado em 28/09 há três enquetes: `entrada` (a do antes e
  depois, com 3 afirmações, `todas`), `termometro` (t1, t2 e t3, no roteiro de
  120 min) e `termometro_curto` (só t1 e t3, no roteiro de 60 min, D-032). Os
  ids das afirmações valem dentro de cada enquete: o t1 das duas é o mesmo
  texto, repetido de propósito.

### `referencias`

```json
{ "id": "clt", "nome": "Jonas com carteira assinada", "renda": 840, "persona": "motoboy", "fonte": "CAGED…" }
```

Opcional. Cada referência vira uma linha de comparação no placar final, e não uma
equipe. O valor precisa de fonte e de validação (D-005).
- `persona` (opcional): o id de uma persona. Com ela, a linha atravessa só as
  barras das equipes dessa persona: "Jonas com carteira assinada" não serve de
  régua para a Rose nem para o Kauã. Sem ela, a linha atravessa todas as
  equipes. O nome e o valor ficam escritos embaixo do gráfico nos dois casos.

### `roteiros`

```json
"roteiros": {
  "60min": [
    { "tipo": "lobby", "alvoSeg": 120 },
    { "tipo": "enquete", "enquete": "entrada", "momento": "antes", "alvoSeg": 90, "opcional": true },
    { "tipo": "bloco", "titulo": "Gancho: o lançamento", "alvoSeg": 210 },
    { "tipo": "formarEquipes", "alvoSeg": 120 },
    { "tipo": "personas", "alvoSeg": 120 },
    { "tipo": "rodada", "rodada": "r1", "alvoSeg": 240 },
    { "tipo": "placarFinal", "alvoSeg": 180 },
    { "tipo": "enquete", "enquete": "entrada", "momento": "depois", "alvoSeg": 90 },
    { "tipo": "comparativo", "enquete": "entrada", "alvoSeg": 150 },
    { "tipo": "fim" }
  ]
}
```

O apresentador escolhe o roteiro na abertura do telão (D-019). O nome usa
letras, algarismos, `_` ou `-`. Num nome como `60min`, o número vira teto: o
validador avisa se a soma dos tempos-alvo passar de 60 minutos.

| `tipo` | Campos | O que é |
| --- | --- | --- |
| `lobby` | — | Entrada na sala, com o QR |
| `enquete` | `enquete`, `momento` (`antes`, `depois` ou `unico`) | Uma votação de enquete |
| `bloco` | `titulo` | Um trecho da apresentação. O telão fica na espera, e o título aparece nele e no celular |
| `formarEquipes` | — | Formação das equipes. Ao sair dele, as equipes travam |
| `personas` | — | As personas em jogo |
| `rodada` | `rodada` | Um mês do jogo: decisão, sorteio e resultado |
| `placarFinal` | — | O placar decomposto |
| `comparativo` | `enquete` | O antes e depois da enquete pareada |
| `fim` | — | Exportar totais e apagar a sala |

- `alvoSeg`: o tempo-alvo do passo, em segundos. Alimenta o atraso na barra do
  apresentador; nada fecha por tempo.
- `opcional`: marca o passo como opcional no "Pular para…".

**A ordem é conferida.** É erro:
- `rodada` ou `personas` antes do `formarEquipes`;
- mais de um `formarEquipes`;
- o `depois` de uma enquete antes do `antes` dela;
- a mesma rodada, ou a mesma enquete no mesmo momento, duas vezes no roteiro.

O `comparativo` antes do `depois` gera aviso.

---

## A linguagem de efeitos

É um conjunto fechado de chaves. Nenhuma carta ou persona precisa de código
próprio, e qualquer chave fora do conjunto é **erro**: um `"soma "` com espaço no
fim, por exemplo, seria ignorado em silêncio, e a carta não faria nada na aula.

### Efeito

```json
{ "se": { "persona": "motoboy" }, "soma": { "renda": -500, "energia": -1 }, "rotulo": "conserto da moto", "fonte": "…" }
```

- `soma`: soma ao delta do mês. Aceita vários indicadores de uma vez.
- `multiplica`: multiplica o delta do mês daquele indicador (por exemplo,
  `{ "renda": 0.3 }`).
- **Um efeito tem `soma` ou `multiplica`, nunca os dois.** Para fazer as duas
  coisas, use dois efeitos: a ordem entre eles importa.
- `se` (opcional): a condição para o efeito valer.
- `rotulo` (opcional): descrição curta para quem lê o config. Hoje nenhuma tela
  mostra.
- `fonte` (opcional).

### Condição

Usada em `se`, em `somenteSe` e nos `ajustesDePeso`.

```json
{ "rodada": "r2", "opcao": ["a", "c"], "indicador": { "energia": { "abaixoDe": 4 } } }
```

| Chave | Aceita | Vale quando |
| --- | --- | --- |
| `opcao` | um id ou uma lista | a equipe decidiu uma dessas opções |
| `persona` | um id ou uma lista | a persona da equipe é uma dessas |
| `equipe` | um id ou uma lista | a equipe é uma dessas |
| `rodada` | um id ou uma lista | a rodada é uma dessas |
| `indicador` | `{ id: { "abaixoDe": n } }` ou `{ id: { "acimaDe": n } }` | o indicador está abaixo ou acima de n, **sem incluir n**: `{ "protecao": { "acimaDe": 2 } }` quer dizer 3 ou mais |

- Todas as chaves presentes precisam valer **ao mesmo tempo**.
- Uma lista vale se **qualquer** item dela valer. Lista vazia é erro.
- A condição lê o estado **de antes** da rodada, e nunca o que o mês está
  mudando.

### Ordem fixa de aplicação

1. `todoMes` da persona;
2. `efeitosGerais` da rodada;
3. a opção que a equipe decidiu;
4. a carta sorteada.

O delta de cada indicador começa em 0. Cada `soma` acrescenta ao delta, e cada
`multiplica` multiplica o delta acumulado até ali. No fim, o novo valor é o de
antes mais o delta, preso entre `min` e `max`.

### Exemplo (valores ilustrativos)

- Persona: `todoMes` soma +2.000 de renda.
- Opção: multiplica a renda por 1,5 e soma −3 de energia.
- Carta: soma −500 de renda.

Delta da renda: 0 → +2.000 → × 1,5 = +3.000 → −500 = **+2.500**. Delta da energia:
**−3**. Se a carta fosse `multiplica 0.3` em vez da soma, a renda do mês seria
3.000 × 0,3 = **+900**.

**Cuidado:** o `multiplica` age sobre o delta inteiro do mês até ali, custos
incluídos. Se o `todoMes` soma a renda e desconta o aluguel, multiplicar por 0,3
também encolhe o aluguel. Quando o efeito é "perdi parte dos dias de trabalho",
uma `soma` negativa por persona é mais fiel.

### Chance de cada carta

Para cada equipe, em cada rodada:
1. entram as cartas elegíveis (`rodadas` e `somenteSe`);
2. cada peso passa pelos `ajustesDePeso`, na ordem do arquivo;
3. saem as cartas que ficaram com peso 0 ou menos;
4. chance = peso ajustado ÷ soma dos pesos ajustados.

Exemplo ilustrativo: "mês normal" com peso 50 e "semana boa" com peso 10, mais um
ajuste de +10 se a opção for `a`. Com a opção `a`: 50 e 20, ou seja, 71% e 29%.
Com outra opção: 50 e 10, ou seja, 83% e 17%.

Em cada combinação de persona, opção, rodada e estado possível, pelo menos uma
carta precisa ter peso acima de 0. Se não tiver, é erro: a rodada travaria na
aula.

---

## O validador

```
npm run validar
```

Ou, para outro arquivo: `node bin/validar-config.mjs caminho/do/arquivo.json`. O
comando sai com código 1 se houver erro, e por isso o `npm run check` também
falha enquanto o config tiver erro.

### Erros e avisos

Cada problema vem com o **caminho** até o campo. Por exemplo, com quatro defeitos
colocados de propósito numa cópia:

```
Erros (5):
  - rodadas.r1.padrao: opção padrão "d" não existe
  - cartas.equipamento.peso: precisa ser um número inteiro
  - cartas.semana_boa.efeitos[0].soma : chave desconhecida "soma " (a linguagem de efeitos é fechada)
  - cartas.semana_boa.efeitos[0]: efeito sem "soma" nem "multiplica"
  - equipes.e2.cor: cor repetida com a equipe "e1"

5 erro(s): o telão recusa criar a sala com este config.
```

Leia `cartas.semana_boa.efeitos[0]` como "na carta `semana_boa`, o primeiro efeito
(a contagem começa em 0)". Um defeito pode gerar mais de um erro: a chave `"soma "`
com espaço também deixa o efeito sem `soma`.

- **Erro** impede a sala. O validador lista todos de uma vez, e o telão mostra a
  mesma lista.
- **Aviso** não impede, mas merece atenção: afirmação longa, bloco sem título,
  tempo mínimo maior que o da decisão, roteiro acima do teto, persona sem
  equipe, rótulo `curto` com mais de 10 caracteres, BOM no começo do arquivo, chave desconhecida fora da linguagem de
  efeitos (que é só descartada).

Erros comuns:

| Erro | Causa provável |
| --- | --- |
| `JSON inválido: … linha L, coluna C` | Vírgula sobrando antes de `}` ou `]`, vírgula faltando entre dois itens, aspas faltando |
| `acento corrompido ("Ã©", "â€")` | O arquivo foi regravado pelo PowerShell 5.1. `git restore config.json` e edite de novo num editor |
| `chave desconhecida "…" (a linguagem de efeitos é fechada)` | Chave com erro de digitação, espaço, maiúscula ou acento |
| `"soma" e "multiplica" no mesmo efeito` | Separe em dois efeitos |
| `id inválido` | Maiúscula, hífen, espaço ou acento no id |
| `… não existe` | Referência a um id que não está no arquivo (opção, persona, rodada, enquete) |
| `nenhuma carta possível …` | Os pesos daquela combinação somam 0 |
| `lista vazia: a carta nunca sairia` | `"rodadas": []`: tire a chave para valer em todas |
| `rótulo curto com N caracteres (mais de 12)` | O `curto` da carta está longo: é o nome na fatia, não o título. Uma palavra basta |

### As conferências de equilíbrio

Com o config sem erro, o validador calcula o jogo inteiro por **enumeração
exata**, e não por simulação: o número é o mesmo a cada execução, e mudar 1 no
peso de uma carta aparece sem ruído. São seis seções:

**(a) Chances efetivas das cartas**, por persona, rodada e opção. Por exemplo:

```
Jonas (motoboy) · equipes e1, e2
  r2 b  normal 49,6% (44,6%–50%) · semana_boa 11,9% (10,7%–12%) · … · bloqueio 14,9% (13,4%–15%)
```

Quer dizer: com a opção `b` na rodada `r2`, a carta `normal` sai em média 49,6%
das vezes. Entre parênteses, a menor e a maior chance quando ela muda com o
estado (por exemplo, com a energia). A média supõe as rodadas anteriores
decididas ao acaso. É a tabela a aprovar antes da aula.

**(b) Efeito do mês**, por persona, rodada e opção: o valor esperado (E) e o pior
caso de cada indicador naquele mês.

**(c) Opção dominante.** Mostra o saldo esperado no fim do jogo para cada opção
de cada rodada (com `*` no padrão). Avisa se uma opção vence as outras em todos
os indicadores, ou se vence em saldo com mais de 70% de probabilidade. Opção
dominante tira a graça da decisão e passa a mensagem "quem se esforça ganha"
(risco R12 da arquitetura).

**(d) Piloto automático.** Avisa se o `padrao` de uma rodada é a opção de maior
saldo esperado: isso premiaria quem não votou.

**(e) Variância do saldo final: decisões × cartas.** Quanto do saldo final é
explicado pelas decisões e quanto pela sorte. A faixa sugerida para as decisões é
de 30% a 60%. **Com a calibragem escolhida (pacote B, D-024), os avisos desta
seção são esperados**: a sorte pesa mais que a decisão, de propósito, porque a
escolha individual não tira ninguém da precariedade (D-009).

**(f) Indicadores que caem até o mínimo.** Mostra em quantas partidas cada
indicador cai até o mínimo. Avisa quando isso passa de 30% das partidas e nenhuma
condição do config lê aquele indicador, ou seja, ele cai sem consequência.

A última linha diz quantos avisos de equilíbrio saíram. Eles não bloqueiam a
sala: servem para calibrar.

### Antes de mudar um peso ou um valor

- Mude um número de cada vez e rode o validador depois de cada mudança.
- O que melhora um aviso pode piorar outro: encolher a distância entre as opções
  tira a dominância, mas também tira peso das decisões. A seção 6 do
  [rascunho-conteudo.md](rascunho-conteudo.md) mostra essa briga com números.
- Valor novo em R$ entra com `fonte` e passa pela validação (D-005).
- Mudar a calibragem já escolhida (D-024) é decisão nova: registre em
  [decisoes.md](decisoes.md).
