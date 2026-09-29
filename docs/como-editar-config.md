# Como editar o `config.json`

Todo o conteúdo do seminário mora no `config.json`: personas, equipes, rodadas,
cartas, afirmações, tempos e roteiros. O código é genérico, e nada disso fica
escrito nele (AGENTS.md, regra 1). Esta página explica cada campo, a linguagem
de efeitos das cartas e como conferir o equilíbrio do jogo com o validador.

Os valores do jogo, com a fonte de cada um, estão em
[rascunho-conteudo.md](rascunho-conteudo.md). As decisões de conteúdo estão em
[decisoes.md](decisoes.md) (D-024 em diante).

**Esquema v2 (redesenho de 29/09, D-041 a D-048).** O que mudou em relação ao
config de 28/09:

| Campo | Onde | Resumo |
| --- | --- | --- |
| `familia` | persona, obrigatório | Quem mora na casa e quantas pessoas são (D-044) |
| `basico` | persona, obrigatório | O custo do básico da casa, item a item, cada um com fonte (D-044) |
| `outraRenda` | persona, opcional | A renda de outra pessoa da casa, com fonte (D-044) |
| `todoMes` | persona | Fica só com a renda e os custos **do trabalho**: o custo de vida saiu para o `basico` |
| `jurosDividaMes`, `jurosFonte` | regras, obrigatórios | Os juros mensais da dívida, com fonte (D-046) |
| `contexto` | rodada, opcional | Uma frase por persona, mostrada no celular durante a decisão (D-043) |
| `opcoes` | rodada | De 2 a 4 (menos ou mais é erro). A `tendencia` não aparece mais em tela nenhuma (D-043) |
| `decidiu`, `sorteou` | condição | As consequências que atravessam os meses (D-043) |

Um config de 28/09 **não passa** no validador novo: falta a família, o básico e
os juros. As seções abaixo trazem cada campo com exemplo.

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
| `regras` | Regras do jogo, do placar e os juros da dívida | Resultado e celular (os juros) |
| `escala` | Os 5 rótulos da escala de 1 a 5 | Botões do celular, legendas do telão |
| `indicadores` | Saldo, energia, proteção | Placar, persona, resultado |
| `personas` | As pessoas do jogo, com a família, o básico e a outra renda da casa | Telão (personas, resultado, placar) e celular |
| `equipes` | Nome, cor, forma e persona de cada equipe | Todas as telas do jogo |
| `rodadas` | Os meses do jogo, com as opções e o contexto de cada família | Decisão, resultado, celular |
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
"tempos": { "enqueteSeg": 60, "decisaoSeg": 120, "decisaoMinSeg": 45, "prorrogacaoSeg": 20, "gracaSeg": 5 }
```

Todos em segundos, inteiros e maiores que 0. **Nenhum tempo fecha nada sozinho**:
quem encerra é o apresentador (D-010). O prazo serve ao cronômetro e à regra do
servidor, que recusa o voto atrasado.

| Campo | O que é |
| --- | --- |
| `enqueteSeg` | Tempo de cada votação de enquete. Na enquete `uma_por_vez`, vale para cada afirmação; na `todas`, para todas juntas |
| `decisaoSeg` | Tempo da decisão da rodada. 120 s desde o redesenho (D-043): são 4 opções e o contexto da família para ler |
| `decisaoMinSeg` | Tempo mínimo de conversa. Antes dele, o Enter pede confirmação. Maior que `decisaoSeg` gera aviso |
| `prorrogacaoSeg` | Tempo da prorrogação de empate |
| `gracaSeg` | Opcional (padrão 5). Segundos depois do prazo em que o voto ainda é aceito |
| `pulsoSeg` | Opcional (padrão 10). De quanto em quanto tempo o telão manda sinal de vida. O celular mostra "Aguardando o telão" depois de 3 vezes esse tempo sem sinal |

### `regras`

```json
"regras": {
  "desempate": "prorrogacao-depois-moeda", "cartaPor": "equipe", "mostrarChances": "no_sorteio",
  "placarPadrao": "efeitoDecisoes", "alvoPorEquipe": 3, "minPareados": 5, "destacarCartas": 2,
  "jurosDividaMes": 0.0743,
  "jurosFonte": "Banco Central, SGS 25463: cheque especial, 7,43% ao mês em ago/2026 (…)"
}
```

| Campo | Aceita | O que faz |
| --- | --- | --- |
| `desempate` | só `"prorrogacao-depois-moeda"` | Empate: prorrogação e, se continuar, moeda (D-022) |
| `cartaPor` | só `"equipe"` | Uma carta por equipe (D-013) |
| `mostrarChances` | só `"no_sorteio"` | As chances aparecem só no sorteio (D-012) |
| `placarPadrao` | `efeitoDecisoes`, `renda` (ou o id de outro indicador), `sorte`, `piorCaso` | Continua aceito, mas o telão **não lê mais**: o placar em páginas não tem critério a escolher (D-041) |
| `alvoPorEquipe` | inteiro ≥ 1 | O "Me coloque numa equipe" completa cada equipe até este número, na ordem das equipes, antes de abrir a próxima |
| `minPareados` | inteiro ≥ 1 | Com menos pessoas que responderam as duas vezes, o comparativo mostra "turmas diferentes" |
| `destacarCartas` | inteiro ≥ 0 | Quantas cartas, as de efeito mais forte, ganham destaque no resultado. Carta grave nunca anima |
| `jurosDividaMes` | obrigatório; número entre 0 e 1, sem incluir os dois | Os juros **ao mês** sobre a dívida, como fração: `0.0743` é 7,43%. Escrever `7.43` é erro: seriam 743% ao mês. Ver "Ordem fixa de aplicação" |
| `jurosFonte` | obrigatório; texto | De onde vem a taxa. Nunca aparece no telão; o validador a imprime nas conferências |

Os três primeiros só têm um valor porque só um foi decidido, e o motor não
implementa outro.

**Os juros da dívida (D-046)** substituem os juros que o config de 28/09 escrevia
como efeito. A taxa aparece nas telas com até duas casas ("7,43% ao mês"): no
cabeçalho do resultado, quando alguma equipe está devendo, e no celular, junto
da dívida.

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

- O indicador `renda` é obrigatório: é o saldo que o básico, a outra renda e os
  juros movem, o que a página 1 do placar final compara ("quanto faltou") e o
  que a página 2 conta como "se não mudassem nada → as escolhas → a sorte".
- `formato`: `moeda` (R$ sem centavos) ou `inteiro`.
- `min` menor que `max`, e `inicial` entre os dois. Depois de cada mês, o valor é
  preso entre `min` e `max`.
- `fonte` é opcional.

### `personas`

```json
{
  "id": "motoboy",
  "nome": "Jonas",
  "descricao": "Motoboy, 34 anos, entrega por aplicativo com moto financiada. Mora no Sarandi, em Porto Alegre.",
  "familia": {
    "descricao": "Jonas, a companheira, caixa de supermercado com um salário mínimo, e a filha de 6 anos.",
    "pessoas": 3
  },
  "basico": {
    "itens": [
      { "rotulo": "comida (cesta básica × 2,5)", "valor": 2098, "fonte": "DIEESE/Conab, cesta básica de Porto Alegre, ago/2026…" },
      { "rotulo": "aluguel (2 quartos)", "valor": 1300, "fonte": "QuintoAndar, lido em 29/09/2026…" },
      { "rotulo": "luz", "valor": 162, "fonte": "CEEE Equatorial, tarifa B1…" }
    ]
  },
  "outraRenda": { "rotulo": "salário da companheira", "valor": 1499, "fonte": "Decreto 12.797/2025: salário mínimo de R$ 1.621, menos 7,5% de INSS…" },
  "inicial": { "energia": 7 },
  "todoMes": [
    { "soma": { "renda": 2200 }, "rotulo": "entregas do mês, já sem a gasolina", "fonte": "IBGE, PNAD Contínua…" },
    { "soma": { "renda": -480 }, "rotulo": "parcela da moto", "fonte": "Tabela Fipe…" }
  ]
}
```

(Encurtado: o básico real do Jonas tem 8 itens, e cada fonte é mais longa.)

- `descricao`: o telão mostra só o ofício, até a primeira vírgula ou ponto
  ("Motoboy"); o celular mostra a descrição inteira.
- `familia` (obrigatório, D-044): `{ descricao, pessoas }`.
  - `descricao`: quem mora na casa e quem trabalha, em uma frase. O celular
    mostra como "Em casa: …" na persona, na situação e no placar final.
  - `pessoas`: inteiro, 1 ou mais. O telão mostra "3 pessoas em casa" na tela
    das personas.
  - Uma chave a mais aqui é só descartada, com aviso: é texto de tela.
- `basico` (obrigatório, D-044): `{ itens: [{ rotulo, valor, fonte }] }`, o custo
  do básico **da casa inteira** por mês.
  - Pelo menos um item. `valor` é inteiro, 0 ou mais, em R$ por mês; `fonte` é
    obrigatória em cada item (D-005).
  - O total é a soma dos itens, calculada pelo código. **Nunca escreva o total no
    config**: não há campo para ele.
  - Uma chave fora de `rotulo`, `valor` e `fonte` é **erro**, e não aviso: o
    básico entra na conta, e um `"valor "` com espaço deixaria o item sem valor.
  - O telão mostra o total ("básico R$ 4.166") na tela das personas e em cada
    resultado; o celular mostra o básico item a item, com a fonte de cada um.
  - O básico é cobrado **no fim de todo mês, depois de tudo** (veja "Ordem fixa
    de aplicação"). Por isso uma carta que corta a renda nunca corta a conta da
    casa.
- `outraRenda` (opcional, D-044): `{ rotulo, valor, fonte }`, a renda de outra
  pessoa da casa ou um benefício, com as mesmas regras de um item do básico. O
  telão mostra "salário da companheira R$ 1.499" ao lado do básico, e o celular
  separa o que veio do trabalho e o que veio da outra renda. Sem outra renda
  na casa (a Rose e a Daiane, no config atual), tire a chave: o telão escreve
  "sem outra renda na casa".
- `inicial` (opcional): troca, só para esta persona, o `inicial` do indicador.
- `todoMes` (opcional): efeitos aplicados em toda rodada, antes de todos os
  outros. Desde o esquema v2, é **só o trabalho**: a renda-base e os custos de
  trabalhar (parcela e manutenção da moto, combustível, taxa do app). O custo de
  vida da casa (aluguel, comida, contas) vai para o `basico`: deixar os dois
  seria cobrar a casa duas vezes.
- **O furo de um mês comum**, que o telão mostra na tela das personas ("falta
  R$ 1.208 por mês"), é calculado: o `todoMes` (sem os efeitos que dependem de
  rodada, opção ou histórico), mais a outra renda, menos o básico.
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
  "texto": "Quem fica mais tempo online recebe mais pedidos. Ninguém paga o seu INSS, e o básico da casa vence no fim do mês, com acidente ou sem.",
  "padrao": "c",
  "contexto": {
    "motoboy": "A parcela da moto vence dia 5. A filha precisa de tênis para a escola, e o salário da companheira já está todo no aluguel.",
    "vendedora": "O aluguel vence dia 10 e o pai do menino não paga pensão. O menino está com tosse há uma semana."
  },
  "efeitosGerais": [],
  "opcoes": {
    "a": { "rotulo": "12 horas por dia, 7 dias por semana", "narrativa": "Fiquei online da manhã até a madrugada, sete dias.", "efeitos": [] },
    "b": { "rotulo": "Jornada de sempre e abrir o MEI", "narrativa": "Mantive a rotina, abri o MEI e pago o DAS todo mês.", "efeitos": [] },
    "c": { "rotulo": "Jornada de sempre, sem pagar nada", "narrativa": "Mantive a rotina e não paguei nada.", "efeitos": [] },
    "d": { "rotulo": "Trabalhar menos para estudar ou cuidar da família", "narrativa": "Tirei um dia por semana para estudar e ficar com os meus.", "efeitos": [] }
  }
}
```

(Encurtado: no config real, as opções têm efeitos, e o contexto tem as 5
personas. As rodadas e as opções também podem vir como lista, cada item com o
seu `id`, como no `config.json` atual.)

- `titulo` e `texto`: a situação do mês. O telão mostra os dois na decisão; o
  celular mostra o título (o texto fica no telão, para as opções caberem na
  tela do celular).
- `padrao`: a opção que vale quando ninguém da equipe vota ("ninguém votou: ficou o de sempre"). Não deve ser a de maior saldo: o validador avisa,
  porque premiaria quem não votou.
- `contexto` (opcional, D-043): `{ persona: texto }`, o que está acontecendo na
  casa de cada persona naquele mês ("o aluguel vence dia 10"). O celular mostra
  a frase da persona da equipe durante a decisão e a prorrogação, acima das
  opções, como "Na casa de Jonas: …". O telão não mostra.
  - A persona precisa existir. Persona sem frase fica sem o quadro.
  - Até **160 caracteres** (contados por letra, com acento contando 1). Acima
    disso é erro: a frase empurraria as opções para fora da tela do celular.
- `efeitosGerais` (opcional): efeitos para todas as equipes nesta rodada, logo
  depois do `todoMes`. Por exemplo, o corte da plataforma no mês 2, ou, com
  `decidiu`/`sorteou`, o DAS do MEI e a fratura que continua (veja "Condição").
- `opcoes`: **de 2 a 4** (D-043). Uma só, ou mais de 4, é erro: com mais, os
  botões não cabem no celular nem a conversa em 120 s. As letras A, B, C, D no
  telão seguem a ordem do arquivo. No config atual, todo mês tem 4, cada uma um
  dilema, sem uma resposta certa.
  - `rotulo`: o texto do botão no celular e da opção no telão. Curto.
  - `narrativa` (opcional): em primeira pessoa. O celular mostra quando a opção
    está escolhida na decisão, na situação da persona e na história da equipe.
  - `tendencia` (opcional): **ignorada**. Continua aceita, para um config antigo
    não dar erro, mas nenhuma tela a mostra, nem no telão nem no celular: as setas
    davam a resposta antes da conversa (D-043). Pode tirar.
  - `efeitos`: obrigatório. Use `[]` para nenhum.
  - `fonte` (opcional).

### `cartas`

```json
{
  "id": "fratura",
  "titulo": "Acidente: fratura, 45 dias parado",
  "curto": "Fratura",
  "narrativa": "Me acidentei e quebrei o punho. São 45 dias parado: 20 neste mês e 25 no próximo.",
  "peso": 1,
  "rodadas": ["r2", "r3"],
  "tom": "grave",
  "ajustesDePeso": [ { "se": { "persona": ["motoboy", "bike"] }, "soma": 3 } ],
  "efeitos": [
    { "se": { "persona": "motoboy" }, "soma": { "renda": -1467 }, "rotulo": "20 dias sem trabalhar" },
    { "se": { "persona": "motoboy" }, "soma": { "renda": -1500 }, "rotulo": "conserto da moto", "fonte": "…" },
    { "soma": { "renda": -150 }, "rotulo": "remédio e curativo", "fonte": "…" }
  ],
  "fonte": "Cebrap/Amobitec (2025)…"
}
```

- **Quantas:** o config atual tem 14 cartas; a D-043 pede de 12 a 14, várias
  ligadas a um mês e às decisões. O validador não impõe o número.
- **Realismo (D-044):** o efeito de uma carta de parada diz o custo real, com
  fonte: os dias sem renda, o conserto, o remédio. O que continua no mês seguinte
  (a fratura que dura 45 dias, a conta que segue bloqueada) vai num efeito geral
  da rodada seguinte, com `sorteou` (veja "Condição").
- `titulo`: no sorteio e no resultado do telão, e na história da equipe.
  `narrativa` (opcional): no celular, no resultado, na situação e na história.
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
  quando ela vale. Com `sorteou`/`decidiu`, faz a carta que só existe depois de
  outra, por exemplo a perícia do INSS que nega o auxílio, que só sai no mês 3
  para quem abriu o MEI no mês 1 e tirou a fratura no mês 2:

  ```json
  { "id": "inss_negou", "rodadas": ["r3"], "tom": "grave",
    "somenteSe": { "sorteou": { "r2": "fratura" }, "decidiu": { "r1": "b" } }, … }
  ```
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
{ "id": "clt", "nome": "Jonas com carteira assinada", "renda": -2957, "persona": "motoboy", "fonte": "CAGED…" }
```

Opcional. Cada referência vira uma linha de comparação na página 1 do placar
final ("quanto faltou para o básico"), e não uma equipe. O valor precisa de fonte
e de validação (D-005).
- `renda`: o saldo dos três meses, na mesma conta das equipes: desde o esquema
  v2, com a mesma casa (outra renda, básico e juros). É por isso que o "Jonas com
  carteira assinada" do config atual é negativo: com carteira, na mesma casa,
  também falta, mas menos. O código não recalcula esse número: ele vem pronto do
  config, e muda à mão quando o básico ou os juros mudam.
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
    { "tipo": "bloco", "titulo": "Gancho: o lançamento", "alvoSeg": 180 },
    { "tipo": "formarEquipes", "alvoSeg": 120 },
    { "tipo": "personas", "alvoSeg": 150 },
    { "tipo": "rodada", "rodada": "r1", "alvoSeg": 300 },
    { "tipo": "placarFinal", "alvoSeg": 240 },
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
| `bloco` | `titulo` | Um trecho da apresentação. O telão fica na espera, com o título e a linha do tempo do seminário; o título aparece também no celular |
| `formarEquipes` | — | Formação das equipes. Ao sair dele, as equipes travam |
| `personas` | — | As personas em jogo, com a casa de cada uma |
| `rodada` | `rodada` | Um mês do jogo: decisão, sorteio e resultado |
| `placarFinal` | — | O placar em páginas: quanto faltou para o básico, "Escolha ou sorte?" e a história de cada equipe (D-041, D-045) |
| `comparativo` | `enquete` | O antes e depois da enquete pareada |
| `fim` | — | O fim da sessão. Exportar totais e apagar a sala ficam na barra do apresentador (D-047) |

- `alvoSeg`: o tempo-alvo do passo, em segundos. Alimenta o atraso na barra do
  apresentador; nada fecha por tempo.
- `opcional`: marca o passo como opcional no "Pular para…".

**A linha do tempo (D-042)** sai do roteiro, sem campo próprio: ela lista os
passos `bloco` e `rodada` na ordem do roteiro (as rodadas como "mês 1", "mês 2"…),
com o título de cada um. Por isso o `titulo` do bloco é o nome que a turma lê na
linha, e vale a pena mantê-lo curto. O bloco cujo título **começa por "Mapa do
seminário"** é especial: nele, a linha do tempo vira o conteúdo da tela, com
todos os trechos por extenso. Mudou esse título? O mapa passa a ser um bloco
comum. Uma chave nova no passo, como `"mapa": true`, não funciona: o validador a
descarta com aviso.

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
| `decidiu` | `{ rodada: opção }` ou `{ rodada: [opções] }` | a equipe decidiu uma dessas opções **naquela rodada anterior** (D-043) |
| `sorteou` | `{ rodada: carta }` ou `{ rodada: [cartas] }` | a equipe tirou uma dessas cartas **naquela rodada anterior** (D-043) |

- Todas as chaves presentes precisam valer **ao mesmo tempo**.
- Uma lista vale se **qualquer** item dela valer. Lista vazia é erro.
- A condição lê o estado **de antes** da rodada, e nunca o que o mês está
  mudando.

**`decidiu` e `sorteou`: as consequências que atravessam os meses (D-043).** Elas
leem o que a equipe decidiu e tirou nas rodadas anteriores. Valem em efeitos
(`se`), em `somenteSe` e em `ajustesDePeso`. Exemplos do config atual:

```json
{ "se": { "decidiu": { "r1": "b" }, "persona": "vendedora" }, "soma": { "renda": -82 }, "rotulo": "DAS do MEI" }
{ "se": { "sorteou": { "r2": "fratura" }, "persona": "motoboy" }, "soma": { "renda": -1833 }, "rotulo": "a fratura continua: mais 25 dias sem trabalhar" }
{ "se": { "sorteou": { "r2": "fratura" }, "decidiu": { "r1": "b" }, "opcao": ["a", "b", "c"] }, "soma": { "renda": 2431 }, "rotulo": "auxílio do INSS, um mês depois" }
```

Os dois primeiros estão nos `efeitosGerais` do mês 2 e do mês 3: quem abriu o MEI
no mês 1 paga o DAS nos meses seguintes, e a fratura do mês 2 continua no mês 3.
O terceiro é o auxílio do INSS, que só chega para quem pagava o MEI.

- **Rodada que não foi jogada** (pulada no dia) vale **falso**: a condição não
  acontece, e está tudo bem.
- O validador confere, e é **erro**:
  - a rodada citada não existe; a opção do `decidiu` não é **daquela** rodada
    (`"d"` existe em várias, e um `decidiu: { "r1": "e" }` com a `"e"` só no mês 2
    nunca valeria); a carta do `sorteou` não existe, ou não pode sair naquela
    rodada (pelo `rodadas` da carta);
  - em algum roteiro, a rodada citada não vem **antes** de nenhuma rodada em que
    a condição é avaliada (a rodada do efeito, as rodadas da carta, ou qualquer
    rodada no `todoMes` e na carta sem `rodadas`, estreitadas pela chave `rodada`
    da própria condição), ou falta no roteiro. Nesses casos a consequência nunca
    aconteceria na aula, sem aviso nenhum;
  - `{}` sem rodada nenhuma.
- Cuidado com o tamanho: cada rodada citada multiplica os caminhos que o
  validador confere. Passar de 20.000 é erro (veja "O validador").
- A linguagem **não tem negação** ("não tirou a fratura"). Para excluir um caso,
  combine as chaves positivas.

### Ordem fixa de aplicação

Primeiro, o **mês do trabalho**:
1. `todoMes` da persona;
2. `efeitosGerais` da rodada;
3. a opção que a equipe decidiu;
4. a carta sorteada.

O delta de cada indicador começa em 0. Cada `soma` acrescenta ao delta, e cada
`multiplica` multiplica o delta acumulado até ali. Isso é o que o trabalho deu no
mês.

Depois, **as contas da casa**, só no saldo (`renda`), sempre nesta ordem (D-044,
D-046):
5. mais a `outraRenda` da persona;
6. menos o básico (a soma dos itens do `basico`);
7. menos os juros: `jurosDividaMes` × a dívida que **vinha do mês anterior** (o
   saldo de antes da rodada, se negativo), arredondado ao real. Sem dívida, 0.

No fim, o novo valor é o de antes mais o delta, preso entre `min` e `max`.

É por isso que **uma carta que multiplica a renda corta o que se ganha, e não a
conta da casa**: o `multiplica` roda no passo 4, e o básico só entra no 6. A
tela mostra o mês assim: "entrou" = passos 1 a 5; "faltou" (ou "sobrou") =
entrou − básico − juros.

Exemplo com o Jonas num mês comum (config atual): o trabalho dá R$ 1.459 (R$ 2.200
de entregas, menos a parcela e a manutenção da moto), a companheira traz R$ 1.499,
e entrou R$ 2.958. O básico é R$ 4.166: faltou R$ 1.208. No fim do mês seguinte,
essa dívida cobra round(1.208 × 0,0743) = R$ 90 de juros, depois do básico.

### Exemplo (valores ilustrativos)

- Persona: `todoMes` soma +2.000 de renda.
- Opção: multiplica a renda por 1,5 e soma −3 de energia.
- Carta: soma −500 de renda.

Delta da renda: 0 → +2.000 → × 1,5 = +3.000 → −500 = **+2.500**. Delta da energia:
**−3**. Se a carta fosse `multiplica 0.3` em vez da soma, a renda do mês seria
3.000 × 0,3 = **+900**.

**Cuidado:** o `multiplica` age sobre o delta inteiro do trabalho até ali, custos
do trabalho incluídos. O básico, a outra renda e os juros ficam de fora (entram
depois), mas a parcela e a manutenção da moto, que estão no `todoMes`, não: uma
carta que multiplica a renda por 0 também zeraria a parcela. Quando o efeito é
"perdi parte dos dias de trabalho", uma `soma` negativa por persona é mais fiel,
e é o que o config atual usa (rascunho, seção 7, pergunta 4).

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
  - rodadas.r1.padrao: opção padrão "e" não existe
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
  equipe, rótulo `curto` com mais de 10 caracteres, BOM no começo do arquivo,
  chave desconhecida fora da linguagem de efeitos e do `basico` (que é só
  descartada; na `familia`, por exemplo).

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
| `personas.X.familia: campo obrigatório ausente` (ou `basico`), `regras.jurosDividaMes: campo obrigatório ausente` | Config do esquema de 28/09: faltam os campos do esquema v2 (veja o começo desta página) |
| `o básico precisa de pelo menos um item` | `"itens": []` no `basico` |
| `jurosDividaMes … precisa ser uma fração entre 0 e 1` | A taxa foi escrita em porcentagem (`7.43`) e não em fração (`0.0743`) |
| `N opção: a rodada precisa de pelo menos 2` ou `N opções: no máximo 4 (D-043)` | Uma rodada com 1 opção, ou com 5 ou mais |
| `contexto com N caracteres (mais de 160)` | A frase da família ficou longa: encurte, porque empurra as opções para fora do celular |
| `opção "x" não existe na rodada "r1"` | O `decidiu` cita uma opção de outra rodada |
| `a carta "x" não sai na rodada "r1"` | O `sorteou` cita uma rodada fora do `rodadas` da carta |
| `a rodada "r3" não vem antes da rodada "r2" no roteiro "60min"` (ou `não está no roteiro`) | O `decidiu`/`sorteou` olha uma rodada que, naquele roteiro, não acontece antes de a condição ser lida |

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
decididas ao acaso, e leva o histórico (`decidiu`/`sorteou`) de cada caminho. É a tabela a aprovar antes da aula.

**(b) Efeito do mês**, por persona, rodada e opção: o valor esperado (E) e o pior
caso de cada indicador naquele mês. Desde o esquema v2, também as contas da casa:
o básico de cada persona (item a item) e a outra renda, e, em cada opção,
"entrou" (E e pior), os juros esperados, o saldo do mês (E e pior) e em quantos
por cento dos casos faltou para o básico. O cabeçalho lembra a taxa de juros e a
fonte dela.

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
