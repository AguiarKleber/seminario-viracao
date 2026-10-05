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

**Esquema v2.1 (revisão de 29/09, D-050 a D-057).** Tudo opcional: um config v2
continua passando, com as mesmas contas. O que entrou:

| Campo | Onde | Resumo |
| --- | --- | --- |
| `fixo: true` | efeito | Custo fixo do trabalho (parcela da moto, DAS, curso): sai antes do "entrou", e nenhum `multiplica` o atinge. Veja "Efeito" |
| `categoria: "gasto"` | efeito | Dinheiro gasto por causa de um evento (conserto, remédio, multa): fica fora do "entrou", numa linha própria, "gastos" (D-052) |
| `diasParado` | carta | Os dias parados que a carta custa, de 0 a 30. Só informativo: a tela mostra "20 dias parado" (D-052) |
| `rotuloPor`, `narrativaPor` | opção | A mesma escolha dita do jeito de cada ofício, por persona (D-054) |
| `pisoTrabalho` | regras | O trabalho variável do mês nunca fica abaixo de R$ 0 |
| `categoria: "protecao"` | efeito | D-059: dinheiro que chega por causa de uma proteção (o INSS do MEI, a ajuda da associação; a liminar que devolve dias de trabalho é trabalho): fica fora do "entrou", e a tela diz "a proteção pagou R$ X" |
| `protege: true` | opção | D-059: a opção é uma proteção (pagar o MEI, entrar na associação). O placar mostra o pior caso com ela e sem ela |

A ordem do mês mudou junto: trabalho variável → custos fixos → gastos → outra
renda → básico → juros (veja "Ordem fixa de aplicação").

**Esquema v2.2 (teste de 30/09, D-065): o empréstimo é dívida, e não renda.**
Também opcional: um config sem empréstimo continua passando, com as mesmas
contas. No teste, o Jonas pegou R$ 1.500 no mês 2 e a tela disse "dívida R$ 1":
o empréstimo era uma `soma` na renda, e a parcela e o saldo devedor eram efeitos
do mês 3 escritos à mão (se o mês 3 fosse pulado, a dívida nunca aparecia).

| Campo | Onde | Resumo |
| --- | --- | --- |
| `emprestimo: { valor, parcelas, taxaMes, fonte }` | efeito de uma opção | A equipe pega um empréstimo. O motor calcula a entrada, a tabela Price e cada parcela nos meses seguintes. Veja "Efeito" |
| indicador `emprestimo` | `indicadores`, obrigatório quando há empréstimo | O saldo devedor. O placar e as telas mostram o saldo acumulado **menos** ele. Veja `indicadores` |

**Esquema v3 (30/09, D-060): 12 meses em 6 rodadas bimestrais.** Uma chave só,
opcional: um config sem ela continua passando, com o mesmo hash e as mesmas
contas (o de 3 rodadas mensais, congelado em `test/fixtures/config-real-v22.json`).

| Campo | Onde | Resumo |
| --- | --- | --- |
| `mesesPorRodada` | regras, opcional | Quantos meses cada rodada vale. Com `2`, cada rodada é um bimestre: o trabalho do mês, o básico, a outra renda e as parcelas do empréstimo contam duas vezes, e os juros compõem dois meses. Veja `regras` |
| `diasParado` | carta | Passa a ir de 0 a `30 × mesesPorRodada` (60 no bimestre) |

Com 6 rodadas, as conferências e o placar final deixam de caber na conta exata
e passam a uma **simulação determinística** (veja "Exato ou estimado", em "O
validador"). O código já trata qualquer número de rodadas; as telas dizem "no
bimestre", "saldo do bimestre" e usam o nome curto de cada rodada (o título até
os dois-pontos, veja `rodadas`).

**Esquema v3.1 (01/10, D-066): o cheque especial tem limite.** Opcional: um
config sem `limiteChequeEspecial` continua passando, com o mesmo hash e as
mesmas contas (o de 12 meses sem o limite está congelado em
`test/fixtures/config-real-v3.json`). Com o limite, as outras chaves passam a
ser obrigatórias:

| Campo | Onde | Resumo |
| --- | --- | --- |
| `limiteChequeEspecial`, `limiteFonte` | regras | Até quanto o banco empresta no cheque especial, em R$, com fonte. Passado ele, o banco corta o crédito. Veja `regras` |
| `multaAtraso`, `moraMes`, `atrasoFonte` | regras, obrigatórios com o limite | A multa (uma vez) e a mora (ao mês, simples) das contas atrasadas, com fonte |
| `cortarPrimeiro` | regras, opcional | `"contas"` (o padrão, **a validar**) ou `"comida"`: o que a casa deixa de pagar primeiro quando o limite acaba |
| `comida: true` | item do `basico` | Marca o item da comida, o único que a casa pode deixar de comprar. Com o limite, toda persona precisa de um |
| `semAtraso: true` | item do `basico`, opcional | Marca o item que não atrasa (gás, ônibus, remédio: quem não paga fica sem). O config atual marca o gás, o ônibus e o remédio das 6 casas |
| indicadores `contas_atrasadas` e `faltou_na_mesa` | `indicadores`, obrigatórios com o limite | O que a casa deve de contas, com multa e mora, e a comida que não deu para comprar. Só o motor mexe nos dois. Veja `indicadores` |

E a D-067: quando o dinheiro de uma proteção passa do que o trabalho daria num
período comum, o motor marca o resultado, e as telas dizem "…, mais do que Bruna
ganhava trabalhando num bimestre comum (R$ 1.400)". Não há chave nova: o "1
salário mínimo" está no `rotulo` do efeito do auxílio, porque a tela usa o
rótulo e o núcleo não escreve conteúdo.

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
| `regras` | Regras do jogo e do placar, os juros da dívida, o período da rodada e o limite do cheque especial com a multa e a mora (esquema v3.1) | Resultado, placar e celular |
| `escala` | Os 5 rótulos da escala de 1 a 5 | Botões do celular, legendas do telão |
| `indicadores` | Saldo, energia, proteção, o empréstimo a pagar (esquema v2.2), as contas atrasadas e o que faltou na mesa (esquema v3.1) | Placar, persona, resultado |
| `personas` | As pessoas do jogo, com a família, o básico e a outra renda da casa | Telão (personas, resultado, placar) e celular |
| `equipes` | Nome, cor, forma e persona de cada equipe | Todas as telas do jogo |
| `rodadas` | Os meses do jogo (bimestres, com `mesesPorRodada` 2), com as opções e o contexto de cada família | Decisão, resultado, celular |
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
| `decisaoSeg` | Tempo da decisão da rodada. Foi 120 s no redesenho (D-043: são 4 opções e o contexto da família para ler) e é 90 s no conteúdo de 12 meses, para as 6 rodadas caberem no roteiro de 60 min (D-060; a validar: rascunho, seção 8, item 12) |
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
  "jurosFonte": "Banco Central, SGS 25463: cheque especial, 7,43% ao mês em ago/2026 (…)",
  "pisoTrabalho": true, "mesesPorRodada": 2,
  "limiteChequeEspecial": 2000,
  "limiteFonte": "Banco Central, Estudo Especial nº 84/2020 (…)",
  "multaAtraso": 0.07, "moraMes": 0.008,
  "atrasoFonte": "Aluguel: … Luz: … Água: … Conta nossa: a média ponderada (…)",
  "cortarPrimeiro": "contas"
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
| `pisoTrabalho` | opcional; `true` ou `false` | Com `true` (esquema v2.1), o trabalho variável do mês nunca fica abaixo de R$ 0: os dias parados (somas a preço cheio) não tiram mais renda do que havia depois do "exausto" ou do bloqueio. Custos fixos e gastos continuam saindo. Deixe ausente num config v2 |
| `mesesPorRodada` | opcional; inteiro ≥ 1 | Esquema v3 (D-060): quantos meses cada rodada vale. Ausente vale 1, e o config fica igual ao de antes, com o mesmo hash. `0`, fração, texto ou `null` é erro. Veja "Rodadas de mais de um mês", logo abaixo |
| `limiteChequeEspecial` | opcional; inteiro > 0, em R$ | Esquema v3.1 (D-066): até quanto o banco empresta. O caixa nunca fica abaixo de −limite; o que passaria dele vira conta atrasada ou comida não comprada. Ausente, o cheque especial não tem teto, como antes. Veja "O limite do cheque especial", logo abaixo |
| `limiteFonte` | obrigatório com o limite; texto | De onde vem o limite. Nunca aparece no telão; o validador a imprime na conferência (j) |
| `multaAtraso` | obrigatório com o limite; número de 0 a 1, sem o 1 | A multa, como fração, cobrada **uma vez** sobre o que atrasou no período: `0.07` é 7%. Escrever `7` é erro |
| `moraMes` | obrigatório com o limite; número de 0 a 1, sem o 1 | A mora **ao mês**, simples, sobre o principal que já estava atrasado: `0.01` é 1% ao mês. No bimestre, conta duas vezes (× `mesesPorRodada`) |
| `atrasoFonte` | obrigatório com o limite; texto | De onde vêm a multa e a mora |
| `cortarPrimeiro` | opcional, só com o limite; `"contas"` ou `"comida"` | O que a casa deixa de pagar primeiro quando o limite acaba. Ausente vale `"contas"` (**a validar**, D-066). Qualquer dessas cinco chaves sem o limite é erro: não teria efeito |

Os três primeiros só têm um valor porque só um foi decidido, e o motor não
implementa outro.

**Rodadas de mais de um mês (`mesesPorRodada`, esquema v3).** Com `2`, cada
rodada é um bimestre, e o jogo de 6 rodadas dura 12 meses. O que muda na conta
(contratos, seção 3):
- **conta `mesesPorRodada` vezes:** o `soma` do `persona.todoMes` (o
  trabalho, os custos fixos, o DAS), o `persona.basico`, a
  `persona.outraRenda` e as parcelas do empréstimo (a rodada jogada k depois do
  empréstimo paga as parcelas 2k − 1 e 2k). Por isso o `todoMes`, o básico e a
  outra renda continuam escritos **por mês**: nunca escreva o valor do bimestre
  no config;
- **conta uma vez:** os efeitos gerais da rodada, os da opção e os da carta.
  São acontecimentos, e o valor que se escreve neles é o do bimestre inteiro
  (a promoção do bimestre, o IPVA, os 45 dias da fratura);
- **o `multiplica` do `todoMes`** age uma vez sobre o bimestre já somado: o
  "exausto" tira 10% do bimestre, e não 19%;
- **os juros** compõem os meses: a taxa do bimestre é (1 + `jurosDividaMes`)² − 1,
  15,41% com 7,43% ao mês, sobre a dívida de antes da rodada;
- **a tela de personas** continua mostrando **um** mês comum ("a conta do mês
  não fecha: faltam R$ W"), e o resto das telas fala do período: "no bimestre",
  "saldo do bimestre", "Bimestre · Saldo do bimestre · Ficou com", "No fim dos 12
  meses". O nome do período sai do número: 1 "mês", 2 "bimestre", 3
  "trimestre", 6 "semestre".
- **`diasParado`** vai até `30 × mesesPorRodada` (60 no bimestre). A
  `referencias[].renda` é escrita à mão e tem de seguir a mesma conta (veja
  `referencias`).

**Os juros da dívida (D-046)** substituem os juros que o config de 28/09 escrevia
como efeito. A taxa aparece nas telas com até duas casas ("7,43% ao mês"), no
celular, junto da dívida.

**O limite do cheque especial (`limiteChequeEspecial`, esquema v3.1, D-066).**
Sem limite, a dívida de um bimestre virava juros compostos no seguinte, e as
casas mais pobres terminavam o ano devendo dezenas de milhares de reais ao banco
(a Rose, R$ 35.112 no plano padrão sem nenhuma carta ruim), o que nenhum banco
empresta a quem ganha isso. Com o limite, no fim de cada período (contratos,
seção 3, passos 8 a 11):
1. **a mora:** `moraMes × meses` sobre o principal das contas que já estavam
   atrasadas (juros simples, como cobram a lei e as concessionárias), somada a
   elas;
2. **o mês bom paga o atrasado:** se o caixa ficou acima de −limite, a folga
   até o limite paga primeiro as contas atrasadas (a multa e a mora antes do
   principal, Código Civil, art. 354);
3. **o corte:** se o caixa ficaria abaixo de −limite, o banco para no limite, e
   o que passaria dele vira, com `"contas"`: conta atrasada (o básico do período
   menos a comida e menos os itens `semAtraso`); depois, os itens `semAtraso`
   ficam sem comprar; depois, a comida não comprada (no máximo a comida do
   período); e o que ainda passar (um conserto, por exemplo) atrasa também. Com
   `"comida"`, a comida corta primeiro;
4. **a multa:** `multaAtraso` sobre o que atrasou neste período, uma vez.
A multa e a mora vão para as contas atrasadas, e nunca para o caixa (lá,
passariam do limite de novo). O patrimônio, que o placar mostra, é o caixa menos
o empréstimo a pagar **menos as contas atrasadas**; a comida não comprada fica
fora dele, porque não é dívida, e aparece à parte, como "faltou na mesa".

**Por que `"contas"` é o padrão (a validar):** as duas coisas acontecem.
22% dos brasileiros trocaram a conta de luz pela comida (Ipec para o iCS,
nov/2021); 30% dos que ganham até 1 salário mínimo deixam de comprar comida para
pagar a luz (Instituto Pólis/Ipec, mai/2024); 21% das dívidas atrasadas do país
são contas básicas (Serasa, mar/2026). Com a falta das personas, `"comida"`
zeraria a comida das casas mais pobres em todo bimestre antes de atrasar um real
de conta, o que nenhuma das fontes descreve. **Atenção:** a escolha foi feita
pelo efeito no jogo, e a pesquisa citada não diz qual das duas é a mais comum.
Trocar é uma chave: `"cortarPrimeiro": "comida"`, e depois `npm run validar`.

**As cartas que leem o atraso.** Uma condição pode ler os dois indicadores
novos (`se.indicador` em `ajustesDePeso`): é assim que "Cortaram a luz" e "O
dono entrou com o despejo" só saem com contas atrasadas. Nenhum `soma` ou
`multiplica` pode mexer neles: só o motor.

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
- O indicador `emprestimo` (esquema v2.2) é obrigatório quando algum efeito tem
  `emprestimo`: é o **saldo devedor**, que só o motor mexe (a entrada do
  empréstimo e a parte de cada parcela que abate a dívida). O que o placar, o
  resumo mês a mês e "Escolha ou sorte?" mostram é o saldo acumulado menos ele,
  e a "dívida" da tela é o cheque especial (a renda negativa) mais ele.

  ```json
  { "id": "emprestimo", "nome": "Empréstimo a pagar", "formato": "moeda", "inicial": 0, "min": 0, "max": 100000 }
  ```

  É **erro**: faltar com algum empréstimo no config; `formato` diferente de
  `moeda`; `min` ou `inicial` diferente de 0 (também o
  `persona.inicial.emprestimo`); `max` menor que a soma, por rodada, da opção
  com mais empréstimo; e qualquer `soma` ou `multiplica` no `emprestimo`. O
  celular nunca mostra o empréstimo em R$ 0 na lista de indicadores.
- Os indicadores `contas_atrasadas` e `faltou_na_mesa` (esquema v3.1, D-066)
  são obrigatórios com `regras.limiteChequeEspecial`, e só o motor mexe neles:
  o primeiro é o que a casa deve de contas (com a multa e a mora) e entra no
  patrimônio do placar; o segundo é a comida que não deu para comprar,
  acumulada, e fica **fora** do patrimônio (é custo humano, não dívida).

  ```json
  { "id": "contas_atrasadas", "nome": "Contas atrasadas", "formato": "moeda", "inicial": 0, "min": 0, "max": 200000 },
  { "id": "faltou_na_mesa", "nome": "Faltou na mesa", "formato": "moeda", "inicial": 0, "min": 0, "max": 200000 }
  ```

  É **erro**: `formato` diferente de `moeda`; `min` ou `inicial` diferente de
  0 (também na persona); `max` menor que a faixa inteira da renda (`max − min`
  da renda: o teto do indicador cortaria a dívida); o mínimo da renda acima de
  −limite; qualquer `soma` ou `multiplica` nos dois; e usar os dois ids sem o
  limite. O id `contas_atrasadas_principal` é reservado (o motor guarda nele o
  principal, a base da mora).
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
  - Uma chave fora de `rotulo`, `valor`, `fonte`, `comida` e `semAtraso` é
    **erro**, e não aviso: o básico entra na conta, e um `"valor "` com espaço
    deixaria o item sem valor.
  - `comida: true` (esquema v3.1, D-066) marca o item da comida: é o único que
    a casa pode deixar de comprar quando o limite do cheque especial acaba, e
    o que deixou de comprar vira "faltou na mesa". Com o limite, toda persona
    precisa de pelo menos um item marcado. `false` é aceito e some (o hash não
    muda); outro valor é erro.
  - `semAtraso: true` (opcional) marca o item que não atrasa, porque quem não
    paga fica sem: gás, ônibus, remédio. Quando o limite acaba, ele não vira
    conta atrasada com multa e mora; a casa fica sem ele. Não pode estar junto
    com `comida`. O config atual não marca nenhum item, e por isso todo o
    básico menos a comida atrasa (conteúdo a decidir).
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
  cor e a forma a cada uma (D-027). No conteúdo de 12 meses (D-061), uma persona
  por equipe: Jonas, Rose, Marcos, Bruna, Kauã e Daiane, com as do Jonas e da
  Rose `obrigatoria` (proposta a validar: rascunho, seção 8, item 5). Até 30/09
  eram Jonas, Jonas, Daiane, Marcos, Kauã e Rose.
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
- `persona`: o id de uma persona. Duas equipes podem ter a mesma (D-004), mas
  desde a D-061 o config usa uma persona por equipe.
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

(Encurtado, do config de 3 meses: no config real, as opções têm efeitos, e o
contexto tem as 6 personas. As rodadas e as opções também podem vir como lista, cada item com o
seu `id`, como no `config.json` atual.)

- `titulo` e `texto`: a situação do mês (ou do bimestre). O telão mostra os
  dois na decisão; o celular mostra o título (o texto fica no telão, para as
  opções caberem na tela do celular).
  - **O nome curto** da rodada é o título até os dois-pontos: "Jan–fev: quanto
    trabalhar no calor?" vira "Jan–fev". Com `mesesPorRodada` maior que 1, é ele
    que aparece na linha do tempo, no resumo por bimestre do celular e na
    história da equipe. Título sem dois-pontos aparece inteiro nesses lugares:
    mantenha o "Período: pergunta".
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
    é aberta na decisão (tocar abre a explicação sem votar, e só o botão
    "Votar nesta" vota: D-055), na situação da persona e na história da equipe.
    O telão mostra a primeira frase na história da equipe (placar final): ela
    precisa ficar de pé sozinha.
  - `rotuloPor` e `narrativaPor` (opcionais, esquema v2.1, D-054):
    `{ persona: texto }`, a mesma escolha dita do jeito do ofício daquela
    persona. A Daiane não some "da fila", some do feed. Do config atual (mês 2,
    opção A, encurtado):

    ```json
    "a": {
      "rotulo": "Aceitar tudo o que vier, para não sumir da fila",
      "rotuloPor": { "vendedora": "Aceitar toda encomenda, até a sem margem" },
      "narrativaPor": { "vendedora": "Aceitei até encomenda sem margem, para não sumir do feed. Trabalhei mais para ganhar quase o mesmo." },
      "efeitos": [ … ]
    }
    ```
  - `protege` (opcional, D-059): `true` marca a opção como uma proteção (pagar o
    MEI, entrar na associação). O placar final ganha a página "O pior que podia
    acontecer", com o pior caso de cada equipe com as escolhas dela e, para quem
    escolheu uma proteção, o pior caso com as mesmas escolhas e o padrão do mês
    no lugar dela. A proteção é seguro: perde na média e ganha no pior caso, e é
    isso que a página mostra. `false` vale o mesmo que não ter a chave; a opção
    padrão com `protege` é aviso (o "sem a proteção" não teria pelo que
    trocá-la). O dinheiro que a proteção paga vai em efeitos com
    `"categoria": "protecao"` (veja "Efeito"), normalmente com uma condição que
    lê a decisão (`decidiu` ou `opcao`).

    - Valem no botão do celular, na explicação da opção aberta, na dica da letra
      no resultado do telão e na história da equipe (telão e celular). A letra
      (A a D) e os efeitos são os mesmos para todas as personas: só o texto
      muda.
    - Persona sem entrada usa o `rotulo` e a `narrativa` da opção.
    - A persona precisa existir. O rótulo vai até **60** caracteres e a
      narrativa até **160** (contados por letra, com acento contando 1). Acima
      disso é erro.
    - `{}` vazio é aviso: não muda nada, tire a chave.
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
  "diasParado": 20,
  "rodadas": ["r2", "r3"],
  "tom": "grave",
  "ajustesDePeso": [ { "se": { "persona": ["motoboy", "bike"] }, "soma": 3 } ],
  "efeitos": [
    { "se": { "persona": "motoboy" }, "soma": { "renda": -1787 }, "rotulo": "20 dias sem trabalhar" },
    { "se": { "persona": "motoboy" }, "soma": { "renda": -1500 }, "categoria": "gasto", "rotulo": "conserto da moto", "fonte": "…" },
    { "soma": { "renda": -150 }, "categoria": "gasto", "rotulo": "remédio, tala e ônibus até o posto", "fonte": "…" }
  ],
  "fonte": "Cebrap/Amobitec (2025)…"
}
```

- **Quantas:** o config de 12 meses tem 19 cartas (o de 3 meses tinha 17; a
  D-043 pedia de 12 a 14, e a D-058 acrescentou as cartas de pico). "A perícia do
  INSS negou" só existe depois de outra carta. O validador não impõe o número.
  O exemplo acima é do config de 3 meses: no de 12, a fratura tira os 45 dias
  num bimestre só (`diasParado: 45`).
- **Realismo (D-044):** o efeito de uma carta de parada diz o custo real, com
  fonte: os dias sem renda, o conserto, o remédio. O que continua na rodada
  seguinte vai num efeito geral dela, com `sorteou` (veja "Condição"). No config
  de 3 meses, a fratura de 45 dias se dividia em 20 + 25; no de 12, cabe inteira
  num bimestre.
- **Carta de pico (D-058):** dinheiro a mais que existe de verdade (no config de
  12 meses, "Promoções e desafios do bimestre", "Temporal em Porto Alegre", "Um
  vídeo viralizou" e "A mobilização arrancou um reajuste"; as datas fortes do
  calendário viraram efeitos gerais das rodadas). Cada valor leva `fonte`, e a
  chance segue o calendário ou a regra da plataforma, e não a vontade de fazer
  alguém fechar as contas. Para uma carta sair **no máximo uma vez por partida**
  (no config de 12 meses, a fratura e o bloqueio), limite as rodadas e zere o
  peso nas rodadas seguintes se ela já saiu. Do config de 3 meses:

  ```json
  { "id": "data_forte", "rodadas": ["r2", "r3"], "peso": 16,
    "ajustesDePeso": [ { "se": { "rodada": "r3", "sorteou": { "r2": "data_forte" } }, "multiplica": 0 } ], … }
  ```

  O motor só lembra que uma carta saiu pelo `sorteou`: com 6 rodadas, a trava
  leva um ajuste por rodada anterior (é o que a fratura e o bloqueio fazem, com
  cinco `multiplica: 0` cada). Depois de mexer num pico, confira as metas da
  conferência (g) do validador.
- **O dinheiro da proteção numa rodada que tem uma carta que o nega:** o auxílio
  do INSS do MEI (`categoria: "protecao"`) vai **em cada carta** que pode sair
  na rodada seguinte à fratura, menos em "A perícia do INSS negou", e não nos
  efeitos gerais. Nenhuma condição lê a carta da própria rodada: num efeito
  geral, o INSS entraria também para quem teve o auxílio negado, e a tela diria
  "a proteção pagou". Carta nova que pode sair nesse ramo precisa dos mesmos
  efeitos do INSS (copie de uma carta que já os tem, como "Um bimestre como os
  outros"; rascunho, seção 4).
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
- `diasParado` (opcional, esquema v2.1, D-052): inteiro de 0 a 30 (de 0 a
  `30 × mesesPorRodada` no esquema v3: 60 no bimestre), os dias sem
  trabalhar **nesta rodada** (a fratura tem 45 dias no total: 20 aqui, e os outros
  25 vão num efeito geral do mês seguinte). É **só informativo**: o dinheiro sai
  pelos efeitos. O resultado do telão, o celular e a história da equipe mostram
  "O que a carta custou: 20 dias parado · renda perdida R$ 1.787 · gastos
  R$ 1.650". A renda perdida e os gastos são calculados pelo motor (o trabalho
  sem a carta menos o trabalho com ela; a soma dos efeitos `categoria: "gasto"`
  da carta), e não escritos no config. Mais de 30 é erro: um mês tem 30 dias
  (no bimestre, mais de 60: "61 dias parado: uma rodada de 2 meses tem 60").
  Carta sem a chave, e sem renda perdida nem gasto, não escreve a linha.
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
{ "id": "clt", "nome": "Jonas com carteira assinada", "renda": -14750, "persona": "motoboy", "fonte": "CAGED…" }
```

Opcional. Cada referência vira uma linha de comparação na página 1 do placar
final ("quanto faltou para o básico"), e não uma equipe. O valor precisa de fonte
e de validação (D-005).
- `renda`: o saldo do jogo inteiro (12 meses no config atual), na mesma conta
  das equipes: desde o esquema v2, com a mesma casa (outra renda, básico e
  juros); no esquema v3, com os juros compostos no bimestre, e o 13º e o terço de
  férias no último bimestre; no esquema v3.1, com o mesmo limite do cheque
  especial, a mesma multa e a mesma mora, e descontando as contas atrasadas. É
  por isso que o "Jonas com carteira assinada" do config atual é negativo
  (−R$ 14.939; era −R$ 18.846 antes do limite e −R$ 14.750 com a multa de 7% e a mora de 0,8%): com carteira, na mesma casa,
  também falta. Ela ficou **abaixo** do Jonas de app em 93% das partidas no
  plano padrão (rascunho, seção 8, item 2, a decidir). O código não recalcula
  esse número: ele vem pronto do config, e muda à mão quando o básico, os juros,
  o limite, a multa, a mora ou o `mesesPorRodada` mudam.
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
| `rodada` | `rodada` | Uma rodada do jogo (um mês, ou um bimestre com `mesesPorRodada` 2): decisão, sorteio e resultado |
| `placarFinal` | — | O placar em páginas: quanto faltou para o básico, "Escolha ou sorte?", o pior caso e a história de cada equipe, em páginas de até 3 rodadas (D-041, D-045, D-059) |
| `comparativo` | `enquete` | O antes e depois da enquete pareada |
| `fim` | — | O fim da sessão. Exportar totais e apagar a sala ficam na barra do apresentador (D-047) |

- `alvoSeg`: o tempo-alvo do passo, em segundos. Alimenta o atraso na barra do
  apresentador; nada fecha por tempo.
- `opcional`: marca o passo como opcional no "Pular para…". Serve também para um
  bloco (as "Entrevistas" do config de 12 meses): nada é pulado sozinho, só
  aparece "(opcional)" na lista do "Pular para…".

**A linha do tempo (D-042)** sai do roteiro, sem campo próprio: ela lista os
passos `bloco` e `rodada` na ordem do roteiro (as rodadas como "mês 1", "mês 2"…; com
`mesesPorRodada` maior que 1, pelo nome curto, "Jan–fev"), com o título de cada um.
Com mais de 16 passos, os que vêm depois da última rodada viram um item só. Por isso o `titulo` do bloco é o nome que a turma lê na
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
- **Um efeito tem `soma`, `multiplica` ou `emprestimo`, só um deles.** Para
  fazer duas coisas, use dois efeitos: a ordem entre eles importa.
- `se` (opcional): a condição para o efeito valer.
- `rotulo` (opcional): descrição curta. Quase sempre é só para quem lê o config;
  a exceção são os efeitos gerais "de antes" (veja "Ordem fixa de aplicação"),
  que a tela nomeia pelo rótulo.
- `fonte` (opcional).
- `fixo` (opcional, esquema v2.1): com `true`, é um **custo fixo do trabalho**,
  que vence parado ou não: a parcela da moto, o DAS do MEI, a parcela do curso,
  a mensalidade. (A parcela do empréstimo era um `fixo` até o esquema v2.2; hoje
  é o motor que a calcula, a partir do `emprestimo`.) Sai logo depois do trabalho variável,
  antes do "entrou", e nenhum `multiplica` o atinge (antes do v2.1, uma carta
  que zerava a renda zerava também a parcela, e o acidentado ficava R$ 741
  melhor). Pode estar no `todoMes`, nos `efeitosGerais`, na opção ou na carta.
- `categoria` (opcional, esquema v2.1): `"gasto"`, o dinheiro
  gasto **por causa de um evento**: o conserto, o remédio, a fisioterapia, a
  multa do aluguel. Fica fora do "entrou" (dentro dele, o
  "entrou" chegava a −R$ 2.541) e sai numa linha própria: "entrou R$ X · gastos
  R$ G · básico R$ Y · faltou R$ Z". Os gastos da carta entram no custo dela
  (D-052).
- `categoria: "protecao"` (opcional, D-059): o dinheiro que chega **por causa de
  uma proteção**: o INSS pago ao MEI, a ajuda ou o fundo da associação. A
  liminar que desbloqueia a conta devolve dias de **trabalho** do próprio
  entregador: fica sem `categoria` (até a revisão da F5, como proteção, a tela
  dizia "a proteção pagou R$ 804" e o trabalho saía do "entrou"). A proteção
  fica fora do "entrou" (e do piso do trabalho); a tela diz
  "entrou R$ X · a proteção pagou R$ P · …", e o celular, "A proteção pagou
  R$ P: auxílio do INSS. Sem ela, teria faltado R$ P a mais." Só com valor
  positivo (negativo é **erro**): o que a proteção custa (o DAS, a mensalidade)
  vai como `fixo`, noutro efeito. Antes, o INSS entrava como renda do trabalho
  e sumia dentro do "Do trabalho e da decisão".
- Regras de `fixo` e `categoria`, conferidas pelo validador (é **erro**):
  - só com `soma`, nunca com `multiplica` (eles ficam fora de qualquer
    `multiplica`);
  - só na `renda`: um "gasto" de energia sairia da conta sem aparecer em lugar
    nenhum. Para mexer na energia, use outro efeito;
  - nunca os dois no mesmo efeito;
  - `"fixo": false` é aceito e vale o mesmo que não ter a chave.

- `emprestimo` (opcional, esquema v2.2, D-065): a equipe pega um empréstimo.

  ```json
  { "se": { "persona": "motorista" }, "emprestimo": { "valor": 1500, "parcelas": 12, "taxaMes": 0.0936, "fonte": "Banco Central, taxas por instituição…" }, "rotulo": "empréstimo do app da 99" }
  ```

  - `valor`: inteiro maior que 0, em reais; `parcelas`: inteiro de 1 a 60;
    `taxaMes`: fração ao mês, entre 0 e 1 sem incluir os dois (`0.0639` =
    6,39%, e não `6.39`); `fonte`: texto, obrigatório. Chave a mais dentro do
    objeto é **erro**;
  - o `rotulo` do efeito é o nome do empréstimo nas telas ("juros da parcela 1
    de 12 do empréstimo no crédito pessoal");
  - o motor faz o resto: a entrada no mês da opção (no caixa e no saldo devedor,
    **fora** do saldo do mês) e, a partir do mês seguinte, uma parcela por mês
    jogado, pela tabela Price em reais inteiros (parcela fixa arredondada; os
    juros são o saldo × a taxa, arredondados; a última parcela fecha o saldo em
    0). Os juros da parcela entram nos "juros" do mês; a parte que abate a dívida
    sai do caixa e do saldo devedor, sem mexer no saldo do mês. As parcelas
    continuam depois do fim do jogo, e o celular diz quanto falta;
  - é **erro**: fora dos efeitos de uma opção (no `todoMes`, nos
    `efeitosGerais` ou numa carta: é a equipe que decide pegar); junto de
    `soma`, `multiplica`, `fixo` ou `categoria` no mesmo efeito; um `se` com
    `indicador`, `decidiu` ou `sorteou` (só `opcao`, `persona`, `equipe` e
    `rodada`: o motor refaz, nos meses seguintes, o empréstimo tomado lá atrás
    só com o histórico, sem o estado daquele mês); e um roteiro com as rodadas
    fora da ordem do config (as parcelas são contadas nessa ordem);
  - não escreva a parcela nem o saldo devedor em efeitos do mês seguinte, como
    o config fazia até 29/09: o motor já os cobra, e a conta sairia em dobro.
    Mês pulado com "Pular para…" não cobra parcela (a k-ésima parcela vem no
    k-ésimo mês **jogado** depois do empréstimo).

```json
{ "soma": { "renda": -480 }, "fixo": true, "rotulo": "parcela da moto", "fonte": "…" }
{ "se": { "persona": "motoboy" }, "soma": { "renda": -1500 }, "categoria": "gasto", "rotulo": "conserto da moto", "fonte": "…" }
{ "se": { "decidiu": { "r1": "b" }, "sorteou": { "r1": "fratura" } }, "soma": { "renda": 2431 }, "categoria": "protecao", "rotulo": "auxílio do INSS (45 dias)", "fonte": "…" }
```

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
{ "se": { "decidiu": { "r1": "b" }, "persona": "vendedora" }, "soma": { "renda": -82 }, "fixo": true, "rotulo": "DAS do MEI" }
{ "se": { "sorteou": { "r2": "fratura" }, "persona": "motoboy" }, "soma": { "renda": -2233 }, "rotulo": "+25 dias da fratura" }
{ "se": { "sorteou": { "r2": "fratura" }, "decidiu": { "r1": "b" }, "opcao": ["a", "b", "d"] }, "soma": { "renda": 2431 }, "rotulo": "INSS (45 dias)" }
```

Os dois primeiros estão nos `efeitosGerais` do mês 2 e do mês 3: quem abriu o MEI
no mês 1 paga o DAS nos meses seguintes, e a fratura do mês 2 continua no mês 3.
O terceiro é o auxílio do INSS, que só chega para quem pagava o MEI (com a
opção C do mês 3, "não parar nenhum dia", outro efeito paga só 30 dias). O
DAS é custo fixo (`fixo`); a fratura e o INSS aparecem nomeados na tela (veja
"Ordem fixa de aplicação").

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

Esquema v2.1 (revisão de 29/09). O delta de cada indicador começa em 0, e o mês
corre sempre nesta ordem:

1. **O trabalho variável.** Os efeitos sem `fixo` e sem `categoria`, nesta
   ordem: o `todoMes` da persona → os `efeitosGerais` da rodada → a opção que a
   equipe decidiu → a carta sorteada. Cada `soma` acrescenta ao delta, e cada
   `multiplica` multiplica o delta acumulado até ali. É o **único** passo em que
   o `multiplica` vale. Com `regras.pisoTrabalho`, se a renda do trabalho
   terminar o passo abaixo de R$ 0, vira R$ 0 (veja abaixo).
2. **Menos os custos fixos** (`fixo: true`), de qualquer origem: a parcela da
   moto, o DAS, a parcela do curso.
3. **Menos os gastos** (`categoria: "gasto"`), de qualquer origem: o conserto, o
   remédio, a multa.
3b. **Mais a proteção** (`categoria: "protecao"`, D-059), de qualquer origem: o
   INSS do MEI, a ajuda da associação.

Depois, **as contas da casa**, só no saldo (`renda`) (D-044, D-046):

4. mais a `outraRenda` da persona;
5. menos o básico (a soma dos itens do `basico`);
6. menos os juros: `jurosDividaMes` × a dívida que **vinha do mês anterior** (o
   saldo de antes da rodada, se negativo), arredondado ao real. Sem dívida, 0.
7. **O empréstimo** (esquema v2.2), fora do trabalho, do piso e de qualquer
   `multiplica`: a entrada do empréstimo tomado pela opção do mês (mais no caixa
   e no saldo devedor) e a parcela de cada empréstimo tomado num mês anterior,
   lida do histórico: os juros dela somam aos juros do passo 6, e a amortização
   sai do caixa e do saldo devedor.
8. a 11. **Só com `regras.limiteChequeEspecial`** (esquema v3.1, D-066), depois de
   tudo: a mora das contas que já estavam atrasadas; o pagamento do atrasado com
   a folga até o limite; o corte (contas atrasadas, depois a comida, na ordem
   de `cortarPrimeiro`), com o caixa parado em −limite; e a multa sobre o que
   atrasou. O detalhe está em "O limite do cheque especial", na seção `regras`.
   Os juros do passo 6 nunca passam de `jurosDividaMes` sobre o limite.

No fim, o novo valor é o de antes mais o delta, preso entre `min` e `max`. Toda
condição lê o estado **de antes** da rodada e o histórico da equipe.

A tela mostra o mês assim:
- **"entrou"** = trabalho variável (passo 1) − custos fixos (2) + outra renda (4);
- **"gastos"** = o passo 3, numa linha própria, só quando há;
- **"a proteção pagou"** = o passo 3b, só quando há;
- **"faltou"** (ou "sobrou") = entrou + proteção − gastos − básico − juros
  (os juros do cheque especial mais os da parcela). É o saldo do mês que o
  telão mostra em verde ou vermelho. Com o limite, também − a multa e a mora
  das contas atrasadas (dívida nova) + a comida não comprada (ela não saiu do
  caixa); continua sendo a variação do patrimônio;
- **"contas atrasadas"** e **"faltou na mesa"** (D-066), só com o limite e só
  quando há: o telão mostra numa linha própria, embaixo da faixa da equipe, e o
  celular, com nome, ao lado da dívida;
- **o empréstimo fica fora do saldo do mês**: nem a entrada nem a amortização
  entram nele, e a dívida de depois é a de antes mais o que faltou.

É por isso que **uma carta que multiplica a renda corta o que se ganha, e não a
conta da casa nem a parcela da moto**: o `multiplica` roda no passo 1, a parcela
sai no 2 e o básico no 5. Hoje só dois efeitos multiplicam a renda: o "exausto"
(× 0,9, com energia abaixo de 3) e o bloqueio que toma o mês 3 inteiro (× 0).

**O piso do trabalho** (`regras.pisoTrabalho`). Os dias parados são somas a
preço cheio (a fratura que continua, os dias da carta), e o "exausto" ou o
bloqueio já podem ter cortado a renda antes deles: o trabalho chegava a −R$ 96,
e a tela dizia "renda perdida R$ 268" de uma renda de R$ 179. Com o piso, não se
perde mais renda do que havia. Os custos fixos e os gastos vêm depois, fora do
piso: a parcela vence parado ou não. Por isso o "entrou" ainda pode ficar
negativo num mês parado com parcela (a conferência (i) do validador mostra onde).

**O custo da carta** (D-052), que as telas mostram como "O que a carta custou":
os dias do `diasParado`, a **renda perdida** (o trabalho do passo 1 logo antes
da carta, menos o trabalho no fim do passo 1, com o piso) e os **gastos da
carta** (os efeitos `categoria: "gasto"` dela).

**Os rótulos dos efeitos gerais "de antes" aparecem na tela.** Um efeito de
`efeitosGerais` cuja condição lê `decidiu`, `sorteou` ou `indicador` (a fratura
que continua, o INSS, o bloqueio, a multa do aluguel), e
que não é custo fixo, sai nomeado no resultado da rodada, na história e no
celular: "+25 dias da fratura −R$ 2.233". Por isso esses rótulos são curtos
(até ~20 letras): seis equipes precisam caber em 1024×768. O corte que vale para
todos, o efeito da opção e a carta não saem assim: a rodada, a letra e o custo
da carta já os dizem.

Exemplo com o Jonas, calculado pelo motor num config de 3 meses de 29/09,
anterior ao de 12 meses e ao limite (o mecanismo é o mesmo; os valores de hoje
estão no rascunho, seções 2 e 6):
- **Num mês comum:** as entregas dão R$ 2.680, a parcela da moto (custo fixo)
  tira R$ 480, e a companheira traz R$ 1.499: entrou R$ 3.699. O básico é
  R$ 4.166: faltou R$ 467. No fim do mês seguinte, essa dívida cobra
  round(467 × 0,0743) = R$ 35 de juros, depois do básico.
- **No mês 2, com o breque (B) e a fratura:** R$ 2.680 − R$ 402 do corte da
  plataforma − R$ 89 do dia de breque − R$ 1.787 dos 20 dias parados = R$ 402 de
  trabalho; menos a parcela (R$ 480), mais a companheira: entrou R$ 1.421. Os
  gastos (conserto da moto, R$ 1.500, e remédio, R$ 150) somam R$ 1.650: faltou
  R$ 4.395. A carta aparece como "20 dias parado · renda perdida R$ 1.787 ·
  gastos R$ 1.650".

### Exemplo (valores ilustrativos)

- Persona: `todoMes` soma +2.000 de renda.
- Opção: multiplica a renda por 1,5 e soma −3 de energia.
- Carta: soma −500 de renda.

Delta da renda: 0 → +2.000 → × 1,5 = +3.000 → −500 = **+2.500**. Delta da energia:
**−3**. Se a carta fosse `multiplica 0.3` em vez da soma, a renda do mês seria
3.000 × 0,3 = **+900**.

**Cuidado:** o `multiplica` age sobre o delta inteiro do trabalho variável até
ali. Um custo do trabalho escrito **sem** `fixo` entra nesse delta e é
multiplicado junto: uma carta que multiplica a renda por 0 também o zeraria (era
o que acontecia com a parcela da moto antes do v2.1). Custo que vence parado ou
não leva `fixo: true`; gasto de um evento, `categoria: "gasto"`. Quando o efeito
é "perdi parte dos dias de trabalho", uma `soma` negativa por persona é mais
fiel, e é o que o config atual usa (rascunho, seção 7, item 4).

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
  equipe, rótulo `curto` com mais de 10 caracteres, `rotuloPor` ou
  `narrativaPor` vazio (`{}`), BOM no começo do arquivo,
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
| `"fixo" e "categoria" no mesmo efeito` | Escolha: custo que vence parado ou não (`fixo`) ou gasto por causa de um evento (`categoria: "gasto"`) |
| `custo fixo (…) com "multiplica"` ou `gasto (…) com "multiplica"` | Custo fixo e gasto ficam fora de qualquer `multiplica`: use `soma` |
| `… só pode somar na renda (é dinheiro), e não em "energia"` | Um custo fixo ou gasto que também mexe na energia: separe a energia em outro efeito, sem `fixo`/`categoria` |
| `N dias parado: um mês tem 30` | O `diasParado` da carta passou de 30. O que passa do mês vai num efeito geral do mês seguinte, com `sorteou` |
| `texto com N caracteres (mais de 60)` (ou `160`) em `rotuloPor`/`narrativaPor` | O texto da persona ficou longo: 60 para o rótulo (botão do celular), 160 para a narrativa |
| `precisa ser um objeto { persona: texto }` | `rotuloPor`/`narrativaPor` escrito como texto ou lista |
| `empréstimo só vale nos efeitos de uma opção` | O `emprestimo` foi posto numa carta, no `todoMes` ou nos `efeitosGerais` |
| `"soma" junto de "emprestimo"` (ou `multiplica`, `fixo`, `categoria`) | O empréstimo não soma na renda: tire a outra chave, ou separe em dois efeitos |
| `a condição de um empréstimo só pode usar opcao, persona, equipe, rodada` | O `se` do empréstimo lê `indicador`, `decidiu` ou `sorteou` |
| `taxaMes … precisa ser uma fração entre 0 e 1` | A taxa foi escrita em porcentagem (`6.39`) e não em fração (`0.0639`) |
| `há empréstimo (…) e falta o indicador "emprestimo"` | Acrescente o indicador do saldo devedor (veja `indicadores`) |
| `… é menor que os empréstimos somados` | O `max` do indicador `emprestimo` cortaria o saldo devedor: aumente |
| `o saldo devedor ("emprestimo") só muda pelo empréstimo e pelas parcelas` | Um `soma`/`multiplica` mexe no indicador `emprestimo`: tire (a parcela e o saldo devedor escritos à mão, como até 29/09) |
| `as rodadas (…) estão fora da ordem do config` | Com empréstimo, todo roteiro precisa das rodadas na ordem em que estão no config |

### As conferências de equilíbrio

Com o config sem erro, o validador calcula o jogo inteiro. São nove seções, de
(a) a (j), com (c) e (d) na mesma; (g), (h) e (i) chegaram com o esquema v2.1
(D-050, D-051 e a revisão de 29/09), e (j), com o limite do cheque especial
(esquema v3.1, D-066).

**Exato ou estimado.** Com poucas rodadas, a conta é a **enumeração exata** de
todos os caminhos de cartas: o número é o mesmo a cada execução, e mudar 1 no
peso de uma carta aparece sem ruído. Com 6 rodadas, cada equipe chega a milhões
de caminhos (até 9,8 milhões no config de 12 meses com as cartas de atraso), e o validador passa
a uma **simulação determinística**. A primeira linha diz qual das duas rodou:

```
Modo: SIMULAÇÃO determinística. Até 9.784.320 caminhos de cartas por equipe,
acima do limite de 200.000 da enumeração exata. Os números de (a) a (i) são ESTIMADOS: …
semente derivada do hash do config (a mesma saída a cada execução). …
```

- **Determinística** quer dizer que a semente dos sorteios sai do hash do
  config: rodar de novo o mesmo arquivo dá **exatamente** a mesma saída, e é
  isso que permite comparar duas execuções. Mudou qualquer coisa no config, o
  hash muda, e com ele a amostra: diferenças pequenas entre duas versões podem
  ser ruído da amostra, e não efeito da mudança. Para conferir uma mudança pequena
  num peso, olhe os números que mudam bastante, ou teste a mudança numa cópia com
  menos rodadas, que volta à conta exata.
- **Estimado** vale para tudo o que depende de somar caminhos: as chances médias
  de (a), os esperados, a variância de (e), a chance de fechar de (g) e os piores
  casos, que são o pior achado na simulação mais uma busca dirigida (a carta de
  menor saldo em cada rodada). O pior caso estimado é um caminho que existe, então
  nunca fica abaixo do pior de verdade das mesmas escolhas; mas pode ficar um
  pouco acima dele, se a busca não achou o pior de todos. O mesmo vale, ao
  contrário, para o melhor caminho de (g).
- **O tempo.** No config de 12 meses, `npm run validar` leva cerca de 2 minutos
  e meio (medido em 05/10; o `npm run check` começa por ele). A amostra do validador é menor que a do
  placar: 2.000 estados antes de cada rodada, 4.000 caminhos até o fim e 200
  planos sorteados com 400 caminhos cada.
- **O placar do telão** usa a mesma ideia com 20.000 sorteios, a partir da 5ª
  rodada (até a 4ª, o número de caminhos ainda cabe na conta exata). As páginas
  "Escolha ou sorte?" e "O pior que podia acontecer" dizem então "valores
  estimados por simulação" e "pior caso estimado"; o saldo e a história de cada
  equipe são sempre exatos.
- A conferência de que **sempre há uma carta possível** não é estimada: com 6
  rodadas, ela vale sem enumerar quando, em toda equipe × rodada × opção, há uma
  carta que sai em qualquer estado (no config atual, "Um bimestre como os
  outros"). Sem essa carta, a enumeração roda como antes, e passar de 20.000
  estados é erro.

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
fonte dela. Desde o esquema v2.1, também os gastos (E e pior): o que um evento
custou (conserto, remédio, multa), fora do "entrou"; e o "entrou" já vem sem os
custos fixos (`fixo`).

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

**(g) Quem fecha o básico no fim do jogo (D-050, D-058).** Por persona: a
chance de terminar com o saldo acumulado em R$ 0 ou mais, com as decisões ao
acaso; o plano (uma decisão por rodada) com a maior chance de fechar; o melhor caminho
possível (decisões e cartas) com a renda final; e a chance de fechar ficando só
no padrão. Avisa quando nenhum caminho fecha ("quase ninguém", e não
"ninguém"), quando uma persona fecha em mais de 10% das partidas, quando menos
de 2 personas ficam entre 5% e 10% (a meta da D-058; antes era a faixa de 5% a
15% do rascunho) e quando alguém fecha só com o padrão (a D-058 pede que nunca).

**(h) A melhor opção muda com a persona, e a letra do esforço muda com o mês
(D-051).** Por mês: a melhor opção de cada persona (a de maior saldo final
esperado, como em (c)), com aviso quando é a mesma para todas; e a letra (A a D)
da opção de maior renda no próprio mês, na média das personas, com aviso quando
é a mesma letra em todas as rodadas. Atenção: a "renda do mês" é a variação do
patrimônio (o saldo acumulado menos o empréstimo a pagar, esquema v2.2): o
empréstimo não conta como renda, e o INSS conta (rascunho, seção 8).

**Com empréstimo no config, todas as conferências usam o patrimônio**, e não o
caixa: o saldo final esperado, o pior caso, a dominância, a chance de fechar em
(g) e a proteção em (h). O validador avisa com a linha "\"renda\" aqui e daqui em
diante é o patrimônio…". Pelo caixa, o empréstimo do mês 2 aparecia como a
melhor opção de todas as personas: R$ 1.500 que ainda não tinham sido pagos.

Ainda em (h), duas conferências da D-059:
- **Esgotamento:** por persona e por mês, a opção mais cansativa (a de maior
  perda de energia esperada no próprio mês; empate pela renda do mês) contra a
  melhor opção dela (a de maior saldo esperado no fim). Avisa quando a mais
  cansativa é também a melhor opção para 3 ou mais personas no mesmo mês: o
  placar ainda premia o esgotamento para a maioria. Até a revisão da F5 o
  esforço era a opção de maior renda do mês, e o empréstimo passava por ele.
- **Proteção:** para cada opção com `protege: true` (fora o padrão), por
  persona: o pior caso e o esperado do fim com ela e sem ela, no plano do padrão
  (só ela trocada), e a média, sobre todas as combinações que a usam, do que
  muda no pior caso e no esperado quando ela vira o padrão do mês. É a mesma
  troca da página "O pior que podia acontecer". Avisa quando nenhuma opção que
  protege melhora o pior caso de alguma persona.

**O que (g), (h), (i) e (j) dizem do config de 12 meses** (`2026-09-30-v3-rascunho`,
hash `fccc2a93` de 05/10, com o limite, estimado; as decisões pendentes estão no
rascunho, seção 8). Os números abaixo são de uma execução: **compare com a saída
do `npm run validar` do dia**, e não com o hash escrito aqui. Uma troca só de
texto muda o hash e, com ele, a amostra: da `886da7f5` para a `fccc2a93` (só
dois textos de `fonte`), o melhor caminho do Jonas foi de −R$ 591 para −R$ 770,
e os avisos de padrão de maior saldo trocaram de bimestre. Diferenças de
dezenas de reais entre opções estão dentro do ruído da simulação:
- (g): **nenhuma persona fecha o básico**, em nenhum caminho que a simulação
  achou; o melhor caminho vai de −R$ 770 (Jonas, com a carta de promoção nos
  seis bimestres) a −R$ 21.549 (Rose). Só o padrão fecha em 0% nas 6. Avisos:
  os seis "nenhum caminho fecha" e "só 0 persona(s) entre 5% e 10%".
- (c) e (d): a opção A de Jan–fev vence em saldo com mais de 70% de
  probabilidade na Rose e na Daiane, e o padrão é a opção de maior saldo para a
  Rose em Mai–jun e para a Daiane de Mar–abr a Jul–ago. São diferenças de
  dezenas de reais nas casas que passam do limite: o que muda de uma opção para
  outra vira comida cortada, que fica fora do placar (rascunho, seção 8, item
  18).
- (h), esgotamento: a opção mais cansativa é a de maior saldo esperado para 3
  personas em Jan–fev e em Mar–abr, e para 5 em Set–out e em Nov–dez (quatro
  avisos).
- (h), proteção: no plano padrão, o MEI melhora o pior caso estimado de 4
  personas (de R$ 124, Jonas, a R$ 635, Marcos), não muda o da Rose e piora o da
  Daiane em R$ 423; no esperado, perde de R$ 183 (Daiane) a R$ 868 (Marcos).
- (i): o trabalho nunca fica negativo; o "entrou" só fica negativo na Daiane
  (pior −R$ 456, Jul–ago com a opção D e a fratura; ao acaso, até 2,6% dos casos,
  em Set–out), com aviso.
- (j): o banco termina em R$ 2.000 nas 6 personas; no plano padrão, as contas
  atrasadas no fim vão de R$ 10.376 (Jonas) a R$ 24.040 (Rose), em média, e o
  que faltou na mesa no ano, de R$ 582 (Jonas) a R$ 9.107 (Daiane).

**O que (g) e (h) diziam do config de 29/09 à noite** (conteúdo v2.2, 3 meses,
exato; hoje em `test/fixtures/config-real-v22.json`):
- (g): ao acaso, Jonas fecha em 0,01% e Marcos em 0,1% (no melhor plano, A-C-B,
  0,4% e 2,8%); Daiane, Kauã e Rose não fecham em caminho nenhum; só o padrão
  fecha em 0% nas 5. Avisos: os três "nenhum caminho fecha" e "só 0 persona(s)
  entre 5% e 10%". **A meta da D-058 não foi alcançada.**
- (h), esgotamento: no mês 1 as 12 horas são a melhor opção só para Daiane e
  Rose; no mês 3, a madrugada, só para a Rose; **no mês 2, os dois apps são a
  melhor opção para 4 das 5 personas**, e é o único aviso.
- (h), proteção: o MEI melhora o pior caso das 5 personas (na média das
  combinações, de R$ 333 a R$ 1.226) e perde de R$ 210 a R$ 267 no esperado; a
  associação perde nos dois. Sem aviso, porque o MEI basta.

**(j) Dívida no fim do jogo (D-066)**, só com `regras.limiteChequeEspecial`: o
limite e a fonte dele, a ordem do corte, a multa e a mora; e, por persona, ao
acaso e no plano padrão, o esperado e o pior de quatro números no fim: a dívida
no banco (nunca passa do limite), as contas atrasadas, o que faltou na mesa
(acumulado, fora da dívida) e a dívida total (o banco, o empréstimo e as contas
atrasadas). Avisa quando o banco passa do limite (seria defeito do motor) e
quando a dívida total passa do teto de uma casa que não pagou nada (o limite,
mais os empréstimos do config, mais o básico de todos os meses): é a volta dos
juros compostos sem fim. Sem o limite no config, a seção diz só isso. Leia-a
antes de mudar o limite, a multa, a mora ou o `cortarPrimeiro`.

**(i) Conta do mês: trabalho e "entrou".** Em todos os estados alcançáveis ×
opção × carta: com `regras.pisoTrabalho`, confere que o trabalho nunca fica
negativo e que a renda perdida de uma carta nunca passa da renda que havia sem
ela; se falhar, é defeito do motor, e o validador **sai com 1**. Sem o piso,
trabalho negativo é aviso. E avisa o "entrou" negativo (custos fixos maiores
que o trabalho num mês parado), com o pior caso e a chance por mês, ao acaso.

Chances pequenas em (g) e (i) saem com dois algarismos ("0,014%"), e não
arredondadas para "0%": na D-050, "ninguém" e "quase ninguém" são coisas
diferentes.

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
