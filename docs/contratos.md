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
             jurosDividaMes, jurosFonte, pisoTrabalho?, mesesPorRodada?,
             limiteChequeEspecial?, limiteFonte?, multaAtraso?, moraMes?, atrasoFonte?, cortarPrimeiro? },
  escala:  { curtos: [5 strings], longos: [5 strings] },
  indicadores: { [id]: { id, nome, formato: "moeda"|"inteiro", inicial, min, max } },
  personas:    { [id]: { id, nome, descricao, familia: { descricao, pessoas },
                         basico: { itens: [{ rotulo, valor, fonte, comida?: true }] }, outraRenda?: { rotulo, valor, fonte },
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
- `Efeito = { se?: Condicao, soma?: { [ind]: n }, multiplica?: { [ind]: n }, rotulo?, fonte?, fixo?: true, categoria?: "gasto"|"protecao", emprestimo?: { valor, parcelas, taxaMes, fonte } }`, com
  `soma` **ou** `multiplica` **ou** `emprestimo`, só um deles (`fixo` e `categoria`: esquema v2.1; `emprestimo`: esquema v2.2, abaixo).
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
- `efeito.categoria = "gasto"`: dinheiro gasto por causa de um evento (conserto,
  remédio, fisioterapia, multa). Fica **fora de qualquer `multiplica` e fora do "entrou"**, e a linha sai
  com `origem: "gasto"`;
- `efeito.categoria = "protecao"` (D-059): dinheiro que chega **por causa de uma proteção** (o INSS pago
  ao MEI, a ajuda ou o fundo da associação). A renda do próprio trabalho que uma proteção devolve (a
  liminar que desbloqueia a conta) é trabalho, e não proteção: a proteção não a "pagou" (revisão da F5).
  Como o gasto, fica fora de qualquer `multiplica`,
  fora do "entrou" e fora do piso do trabalho; a linha sai com `origem: "protecao"`, e o mês a mostra à
  parte (`mes.protecao`, seção 3). Valor negativo é **erro**: o que a proteção custa (DAS, mensalidade) é
  custo fixo, noutro efeito. `categoria` aceita só `"gasto"` e `"protecao"`;
- efeito com `fixo` ou `categoria`: só `soma` (com `multiplica` é erro), só na `renda` (outro indicador é
  erro: é dinheiro) e nunca os dois juntos (erro). O sinal é o da soma: negativo tira dinheiro; positivo
  (reembolso) abate;
- `opcao.protege = true` (D-059, opcional): a opção é uma proteção (pagar o MEI, entrar na associação). O
  placar refaz o pior caso trocando-a pelo padrão do mês (`piorCasoSemProtecao`, seção 3). `false` é
  aceito e some na normalização (o hash de um config sem proteção não muda); outro valor é erro. Padrão
  que protege é **aviso**: o "sem a proteção" não teria pelo que trocá-lo;
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

**Esquema v2.2** (teste real de 30/09: o empréstimo é dívida, e não renda), conferido pelo validador. Opcional:
um config sem empréstimo continua válido e dá as mesmas contas.
- `efeito.emprestimo = { valor, parcelas, taxaMes, fonte }`: a equipe pega um empréstimo. `valor` inteiro > 0 (R$),
  `parcelas` inteiro de 1 a 60, `taxaMes` fração ao mês `0 < x < 1` (0,0639 = 6,39%), `fonte` texto obrigatório.
  Chave a mais no objeto é **erro**. O efeito leva também `rotulo` (o nome do empréstimo nas linhas) e `se`;
- só nos efeitos de uma **opção** (em `todoMes`, `efeitosGerais` ou carta é erro: é a equipe que decide pegar);
- junto de `soma`, `multiplica`, `fixo` ou `categoria` é erro: a entrada e as parcelas são calculadas pelo motor;
- o `se` só pode usar `opcao`, `persona`, `equipe` e `rodada` (`indicador`, `decidiu` e `sorteou` são erro): o
  motor refaz, nos meses seguintes, o empréstimo tomado lá atrás só com o histórico, sem o estado daquele mês;
- com algum empréstimo no config: o indicador `emprestimo` (o saldo devedor) é obrigatório, em `moeda`, com
  `min` 0 e `inicial` 0 (e `persona.inicial.emprestimo`, se houver, 0); o `max` precisa caber a soma, por rodada,
  da opção com mais empréstimo; nenhum `soma`/`multiplica` pode mexer no indicador `emprestimo` (só o motor); e todo
  roteiro precisa ter as rodadas na ordem do config (o motor conta as parcelas pagas nessa ordem). Tudo isso é erro;
- a conferência de "carta possível" leva também as rodadas com empréstimo na chave do nó (a parcela de um mês depende
  de quando o empréstimo foi tomado).

**Esquema v3** (D-060: 12 meses em 6 rodadas bimestrais), conferido pelo validador. Opcional: um config sem a
chave continua válido, com o mesmo hash e as mesmas contas.
- `regras.mesesPorRodada`: inteiro ≥ 1 (0, fração, texto ou `null` é erro). Ausente vale 1 e **não entra** no
  normalizado (o hash do config de 3 rodadas mensais não muda); escrito, entra como está (`1` também). Com 2, cada
  rodada é um bimestre: o motor conta o `persona.todoMes`, o `persona.basico`, a `persona.outraRenda` e as parcelas
  do empréstimo `mesesPorRodada` vezes e compõe os juros do cheque especial (seção 3). Efeitos gerais, de opção e de
  carta são por evento (não multiplicam);
- `carta.diasParado`: de 0 a `30 × mesesPorRodada` (60 no bimestre). Acima é erro ("61 dias parado: uma rodada de 2
  meses tem 60"; com rodadas mensais, a mensagem de antes, "um mês tem 30");
- roteiros com 6 rodadas ou mais: a conferência de "carta possível" (abaixo) deixa de enumerar quando há, em cada equipe
  × rodada de algum roteiro × opção, uma carta que sai em qualquer estado (`somenteSe` só com `persona`, `equipe`,
  `rodada` ou `opcao`, e que vale; peso ajustado com piso acima de 0: os ajustes fixos pelo valor exato, e um ajuste
  que lê o estado só se não pode baixar o peso, `soma ≥ 0` ou `multiplica ≥ 1`). Sem essa carta, a enumeração roda
  como antes, e passar de 20.000 estados continua **erro** (6 rodadas passam já na 3ª);
- nada mais muda de formato.

**Esquema v3.1** (D-066: o cheque especial tem limite; revisão de 01/10), conferido pelo validador. Opcional: um config
sem `regras.limiteChequeEspecial` continua válido, com o mesmo hash e as mesmas contas (nada da D-066 entra no
normalizado, e o `mes` não ganha campos).
- `regras.limiteChequeEspecial`: inteiro > 0, em R$. Com ele são **obrigatórios** `regras.limiteFonte` (texto),
  `regras.multaAtraso` e `regras.moraMes` (frações de 0 a 1, sem o 1: 0,10 = 10% de multa uma vez, 0,01 = 1% de mora
  ao mês) e `regras.atrasoFonte` (texto, a fonte da multa e da mora). `regras.cortarPrimeiro` ∈ `"contas" | "comida"`,
  opcional; ausente, a normalização escreve **`"contas"`** (o padrão, **a validar** com o Kleber, abaixo). Qualquer uma
  dessas chaves sem o limite é erro (não teria efeito);
- `basico.itens[].comida = true` marca o item da comida (o único que a casa pode deixar de comprar). `false` é aceito e
  some (o hash não muda); outro valor é erro. Com o limite, toda persona precisa de pelo menos um item com `comida: true`;
- `basico.itens[].semAtraso = true` (revisão da F6c) marca o item que não atrasa: gás, ônibus, remédio ("quem não paga
  fica sem", na fonte do atraso). Quando o limite acaba, ele fica sem comprar (`mes.ficouSem`), e não vira conta atrasada
  com multa e mora. `false` é aceito e some; outro valor é erro, e `comida` com `semAtraso` também (a comida já fica de
  fora das contas atrasadas). Sem item marcado, o motor e o `mes` ficam como antes. **O `config.json` ainda não marca
  nenhum item** (frente do conteúdo). O id `contas_atrasadas_principal` é reservado (erro como indicador);
- com o limite, os indicadores `contas_atrasadas` e `faltou_na_mesa` são obrigatórios: `moeda`, `min` 0, `inicial` 0
  (e `persona.inicial` 0, se houver) e `max` ≥ a faixa da renda (`max − min` da renda: o limite do indicador cortaria a
  dívida). O mínimo da renda precisa ser ≤ −limite. Nenhum `soma`/`multiplica` pode mexer nos dois (só o motor), com ou
  sem limite; sem o limite, os dois ids são reservados (erro). Condições podem lê-los (`se.indicador`, em
  `ajustesDePeso`: o corte de luz, o aviso de despejo). Os ids levam `_` porque um id de indicador é `[a-z0-9_]`; no
  `mes` e nas telas os nomes são `contasAtrasadas` e `faltouNaMesa`;
- **por que `"contas"` é o padrão (a validar):** as duas coisas acontecem de fato. Ipec para o iCS (nov/2021, 2.002
  entrevistas): 22% dos brasileiros trocaram o pagamento da conta de luz pela compra de comida. Instituto Pólis/Ipec
  (publ. 31/05/2024, 2.000 entrevistas): 30% dos que ganham até 1 salário mínimo deixam de comprar arroz, feijão, café e
  açúcar para pagar a luz. Serasa (Mapa da Inadimplência, mar/2026): 21% das dívidas atrasadas do país são contas
  básicas (água, luz, gás). Com a falta das personas (até R$ 4,3 mil por bimestre), "comida primeiro" zeraria a comida da
  casa em todo bimestre antes de atrasar um real de conta, o que nenhuma das fontes descreve; "contas primeiro" atrasa as
  contas do período (que têm o custo delas: multa, mora e o risco de corte e despejo pelas cartas) e corta a comida do que
  passar delas. A alternativa fica a uma chave de distância (`"cortarPrimeiro": "comida"`).

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
  chave). Passar de 20.000 nós alcançáveis é **erro**: sem a conferência não há a garantia. Esquema v3: com uma carta
  que sai em qualquer estado em toda equipe × rodada × opção, a garantia vem sem enumerar (acima).

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
| `patrimonio(estado) → n` | esquema v2.2: `renda − emprestimo` (o caixa menos o saldo devedor); sem o indicador `emprestimo`, a própria renda. Esquema v3.1 (D-066): menos `contas_atrasadas` também (o `faltou_na_mesa` não entra: não é dívida). É o número do placar |
| `limiteDe(config) → n \| null` | esquema v3.1: `regras.limiteChequeEspecial` (inteiro > 0), ou `null` |
| `comidaDoBasico(persona) → n` | esquema v3.1: a soma dos itens do básico com `comida: true` (por mês) |
| `semAtrasoDoBasico(persona) → n` | revisão da F6c: a soma dos itens do básico com `semAtraso: true` (por mês) |
| `trabalhoComum(config, equipeId) → n` | D-067: o que o trabalho deixa num período comum, `(mesComum.trabalho − mesComum.custosFixos) × mesesPorRodada` (sem a outra renda da casa) |
| `protecaoAcimaDoTrabalho(config, equipeId, mes) → { pagou, trabalhoComum } \| null` | D-067: a proteção do mês (`mes.protecao`) passou do `trabalhoComum`? `null` quando não passou ou não pagou nada. O `resolverRodada` a chama (o `aplicar` não, pelo custo da enumeração) |
| `cronograma(valor, parcelas, taxaMes) → [{ parcela, juros, amortizacao, saldo }]` | a tabela Price em reais inteiros (uma cópia): parcela fixa = PMT arredondado; `juros = round(saldo × taxa)`; `amortizacao = parcela − juros`; a última parcela fecha o saldo em 0 |
| `mesComum(config, equipeId) → mes` | sempre **um** mês, mesmo com `mesesPorRodada` 2 (esquema v3: a tela de personas diz "a conta do mês"). O furo de um mês comum (tela de personas do telão): só o `todoMes` da persona (efeito com condição de rodada, opção ou histórico não entra; condição de indicador lê o estado inicial), na mesma ordem do mês (o custo fixo do `todoMes` entra, fora do `multiplica`), mais a outra renda, menos o básico, sem dívida; mesmo formato de `Resultado.mes` |
| `consolidarDecisao(config, { rodadaId, votos, forcada, aposProrrogacao, semente, equipeId, candidatas? }) → Consolidacao` | ver abaixo |
| `decompor(config, { equipeId, rodadas: [{ rodadaId, opcaoId, cartaId }], modo? }) → Decomposicao` | enumeração exata dos caminhos de cartas, levando o histórico no caminho (a lista `rodadas`, na ordem do roteiro, é o histórico); esquema v3: com mais de `LIMITE_CAMINHOS` caminhos (`caminhosDeCartas` das rodadas jogadas), simulação determinística (abaixo). `modo: 'exato' \| 'estimado'` força uma das contas, só para os testes |
| `mesesPorRodada(config) → m` | esquema v3: `regras.mesesPorRodada` quando é inteiro ≥ 1, senão 1 |
| `caminhosDeCartas(config, equipeId, rodadaIds) → n` | esquema v3: o produto, rodada a rodada, do teto de cartas que podem sair para a equipe (as `rodadas` da carta, a parte fixa do `somenteSe` — `persona`, `equipe`, `rodada` — e peso > 0 ou algum ajuste com `soma > 0`; a parte que lê o estado conta como "pode"). Não depende da opção. `Infinity` acima do inteiro seguro |
| `condicaoFixa(cond) → boolean` | a condição só lê `opcao`, `persona`, `equipe` e `rodada` (ou não existe): vale igual em qualquer estado. Usada pelo validador na garantia de carta possível |
| `LIMITE_CAMINHOS` / `AMOSTRAS` | 200.000 caminhos (acima, o `decompor` simula) e 20.000 sorteios da simulação |

- `Historico = { [rodadaId]: { decisao, carta } }`: o que a equipe decidiu e tirou nas rodadas anteriores (o
  mesmo formato de `resultados/{r}/{eq}`). É o que `decidiu`/`sorteou` leem. Omitido, vale `{}`: toda
  condição de histórico dá falso. **Quem chama o motor com um config que usa `decidiu`/`sorteou` ou empréstimo
  precisa passar o histórico**, senão calcula outro número (sem ele, a parcela do empréstimo não é cobrada).
- `Resultado = { carta, chances, delta, depois, linhas: [{ origem: "persona"|"geral"|"opcao"|"carta"|"piso"|"custoFixo"|"gasto"|"protecao"|"emprestimo"|"outraRenda"|"basico"|"juros"|"amortizacao"|"mora"|"contasPagas"|"faltouNaMesa"|"ficouSem"|"atraso"|"multa", rotulo, indicador, valor, deAntes? }], mes, cartaCusto, deAntes, protecaoEvitou, protecaoEvitouMesa?, protecaoItens, protecaoAcimaDoTrabalho? }`
  (o `aplicar` devolve os mesmos `mes`, `cartaCusto`, `deAntes`, `protecaoEvitou`, `protecaoEvitouMesa?` e `protecaoItens`)
  - `protecaoAcimaDoTrabalho = { pagou, trabalhoComum }` (D-067), **só** quando a proteção do mês passou do trabalho de um
    período comum (`motor.protecaoAcimaDoTrabalho`). Só no `resolverRodada`. Gravado pelo anfitrião só quando existe;
  - `protecaoEvitou` (D-059) ≥ 0: quanto o saldo do mês seria menor sem os efeitos `protecao` daquele mês.
    Sem o limite, é igual a `mes.protecao`: os juros do mês são cobrados sobre a dívida de **antes**, e a proteção do mês
    não os muda; o que ela evita de juros nos meses seguintes aparece nas contas deles e no
    `piorCasoSemProtecao`. É a frase "sem o MEI, teria faltado R$ X a mais". **Com o limite** (revisão da F6c), o motor
    refaz as contas da casa sem os efeitos `protecao` (o mesmo estado, o mesmo empréstimo), e `protecaoEvitou =
    round(mes.saldoMes − saldoMes sem ela)`: sem ela, parte da falta vira comida cortada (que não sai do saldo) e a multa
    entra nele, então o pago e o evitado diferem (a Daiane depois de fratura com MEI: pagou R$ 2.431, evitou R$ 826 no
    saldo e R$ 1.659 de comida cortada);
  - `protecaoEvitouMesa` > 0 (revisão da F6c), só com o limite e só quando há: a comida que a proteção evitou cortar
    (`faltouNaMesa` sem ela − com ela). Gravado pelo anfitrião só quando existe;
  - `protecaoItens = [{ rotulo, valor }]`: os efeitos `protecao` do mês, na ordem dos grupos (o rótulo é o
    do efeito, ou o do grupo). Lista vazia quando não há. Gravados pelo anfitrião **só quando há** (seção 7);
  - a proteção **não** entra no `deAntes`, mesmo num efeito geral que lê o histórico: a tela a diz à parte;
  - com `regras.pisoTrabalho`, uma linha `piso` (rótulo "o trabalho do mês não fica abaixo de zero") devolve
    a diferença quando o trabalho variável ficaria negativo; as linhas continuam somando o delta;
  - `linha.deAntes = true` marca, na renda, os efeitos **gerais** (`rodada.efeitosGerais`) cuja condição lê
    `decidiu`, `sorteou` ou `indicador` (consequência de um mês anterior), fora os custos fixos;
  - `deAntes = [{ rotulo, valor, gasto? }]`: essas linhas, na ordem do mês, com `gasto: true` nas de
    categoria "gasto" (a multa do aluguel atrasado: está nos gastos, e não no "entrou"). Lista vazia
    quando não há. É o que a tela nomeia ("+25 dias da fratura −R$ 2.233 · INSS (45 dias) +R$ 2.431").
    Gravado pelo anfitrião em `resultados/{r}/{eq}.deAntes` **só quando não é vazio** (o RTDB apaga lista
    vazia); ausente vale `[]`;
  - as linhas saem na ordem do mês: as do trabalho variável (com a origem do grupo), depois as de
    `custoFixo` e as de `gasto` (o rótulo é o do efeito, ou o do grupo de onde ele veio), depois
    `emprestimo` (a entrada, na renda e no indicador `emprestimo`, com o rótulo do efeito), `outraRenda`,
    `basico` (uma por item, com valor negativo), `juros` (rótulo "juros da dívida", o cheque especial; e uma por
    parcela, "juros da parcela k de n do <rótulo>") e `amortizacao` (a parte da parcela que abate a dívida, na renda e,
    negativa, no indicador `emprestimo`); outraRenda, básico e juros só entram com valor diferente de 0. As linhas
    de cada indicador somam o `delta` dele;
  - `mes = { trabalho, custosFixos, gastos, protecao, outraRenda, entrou, basico, juros, saldoMes, dividaAntes, emprestimo, parcela, jurosEmprestimo, amortizacao, saldoDevedor, parcelasRestantes, proximaParcela, aPagar, taxaEmprestimo? }`, na
    renda: `trabalho` é o trabalho **variável** (todoMes → gerais → opção → carta, sem os efeitos `fixo`,
    `gasto` e `protecao`); `custosFixos` e `gastos` são positivos quando tiram dinheiro (a soma dos efeitos `fixo` e
    `gasto`, com o sinal trocado); `protecao` ≥ 0 é a soma dos efeitos `protecao` (D-059), e fica **fora** do
    "entrou" (a tela diz "a proteção pagou R$ X"); `entrou = trabalho − custosFixos + outraRenda`;
    `saldoMes = entrou + protecao − gastos − basico − juros`; com `regras.pisoTrabalho`, `trabalho` ≥ 0,
    mas o `entrou` ainda pode ficar negativo (custos fixos maiores que o trabalho, num mês parado);
    `dividaAntes` ≥ 0 é o cheque especial de antes do mês (a base dos juros dele). É gravado pelo anfitrião em
    `resultados/{r}/{eq}.mes` (todos os campos, 0 quando não há empréstimo);
  - empréstimo (esquema v2.2; tudo em 0 sem empréstimo): `emprestimo` é o que entrou de empréstimo no mês (fora do
    "entrou" e do `saldoMes`); `parcela` é a soma das parcelas que venceram no mês (a de um empréstimo tomado num mês
    anterior; esquema v3: as m parcelas da rodada), que saem inteiras do caixa: `parcela = jurosEmprestimo + amortizacao`; `juros` é o **total** (cheque
    especial + `jurosEmprestimo`), e a `amortizacao` fica fora do `saldoMes` (só troca uma dívida por outra);
    `saldoDevedor` é o do empréstimo no fim do mês (o `emprestimo` do estado + a entrada − a amortização, antes do
    limite); `parcelasRestantes` é quantas parcelas (mensais) ainda faltam depois da rodada (a maior, entre os empréstimos),
    `proximaParcela` a soma, entre os empréstimos, da próxima parcela mensal de cada um e `aPagar` a soma de todas as que faltam, com juros. As
    parcelas continuam depois do fim do jogo: "fica devendo R$ `saldoDevedor` em `parcelasRestantes` parcelas".
    `taxaEmprestimo` é a taxa ao mês dos empréstimos em aberto (do mês em que entram até a última parcela), só
    quando existe e é uma só (dois empréstimos de taxas diferentes: sem o campo); sem empréstimo, o campo não
    existe (o RTDB apagaria o null, e o mês lido do banco tem de ser igual ao do motor). Revisão de 30/09,
    achado 17: o celular mostrava só a taxa do cheque especial;
  - limite do cheque especial (esquema v3.1, D-066; os campos **só existem** com `regras.limiteChequeEspecial`):
    `dividaBanco` (o cheque especial no fim, ≤ limite), `contasAtrasadasAntes`, `mora`, `contasPagas`, `atrasou` (o que
    atrasou nesta rodada), `multa`, `contasAtrasadas` (acumulado no fim = antes + mora − pagas + atrasou + multa),
    `faltouNaMesa` (a comida não comprada nesta rodada), `faltouNaMesaAcumulado`, `contasAtrasadasPrincipal` (revisão da
    F6c: o principal no fim, sem a multa e a mora; a base da mora) e `ficouSem` (só com item `semAtraso` no básico da
    persona: o que a casa ficou sem comprar). Com o limite, `saldoMes = entrou +
    protecao − gastos − basico − juros + faltouNaMesa + ficouSem − multa − mora` (a comida não comprada não saiu do caixa; a multa e a
    mora são dívida nova), e continua sendo a variação do patrimônio. `dividaAntes` (a base dos juros) nunca passa do limite;
  - por isso: `delta.renda = saldoMes + emprestimo − amortizacao` (o caixa), `delta.emprestimo = emprestimo −
    amortizacao`, e `saldoMes` é a variação do patrimônio. A "dívida" da tela é o cheque especial mais o saldo
    devedor (`historia.dividaTotal(depois)`), e dívida antes + o que faltou = dívida depois;
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
- `Decomposicao = { realizado, esperadoComDecisoes, esperadoPiloto, efeitoDecisoes, sorte, piorCaso, piorCasoSemProtecao, estimado }`, sempre no
  patrimônio (`motor.patrimonio`: renda − saldo devedor do empréstimo − contas atrasadas, esquema v3.1; sem os indicadores, a renda). Esquema v2.2:
  pela renda, quem pegou o empréstimo no mês 2 ficava R$ 1.500 mais rico, e se o mês 3 fosse pulado a dívida nunca
  aparecia no placar. O anfitrião grava no `placar/{eq}` o `depois` da última rodada (renda **e** `emprestimo`) junto
  destes números; o total que a tela mostra é `renda − emprestimo` (`historia.patrimonioDe`, `historia.escolhaOuSorte`):
  - `esperadoPiloto`: o esperado se todas as rodadas jogadas tivessem ficado no `padrao`;
  - `efeitoDecisoes = esperadoComDecisoes - esperadoPiloto`;
  - `sorte = realizado - esperadoComDecisoes`;
  - `piorCaso`: o menor patrimônio possível com as decisões tomadas;
  - `piorCasoSemProtecao` (D-059): a menor renda possível com as **mesmas** decisões, exceto as opções com
    `protege: true`, trocadas pelo `padrao` do mês; enumeração exata, como o `piorCaso`. Sem nenhuma opção que
    protege nas decisões (ou com o padrão protegendo), é igual ao `piorCaso` e não refaz a enumeração. A
    proteção é seguro: perde em valor esperado e ganha no pior caso, e só o pior caso mostra o que ela vale;
  - `estimado` (esquema v3): `false` na enumeração exata; `true` quando `caminhosDeCartas` das rodadas jogadas passa de
    `LIMITE_CAMINHOS` (200.000; com a fixture de 6 rodadas × 20 cartas, na 5ª rodada). Aí as três contas (com as
    decisões, o piloto e o sem proteção) são uma **simulação determinística**: `AMOSTRAS` (20.000) caminhos sorteados
    pelas chances, rodada a rodada, com `sorte.gerador(semente)` e `semente = sorte.derivar(uint32 do
    validarConfig.hash(config), 'decompor:' + equipeId + ':' + ids das rodadas jogadas separados por vírgula)`, a
    mesma nas três contas (números aleatórios comuns: o efeito das decisões sai sem o ruído de duas amostras). O telão,
    o simulador e os testes chegam ao mesmo número (exige o `validar-config.js` carregado). Os caminhos que coincidem
    até uma rodada dividem o nó (o motor refaz só o mês de um nó novo). `esperado*` é a média da amostra;
    `piorCaso`/`piorCasoSemProtecao` é o **menor** entre o achado na simulação e a busca dirigida (em cada rodada, a
    carta que deixa o menor patrimônio logo depois dela; empate, a primeira na ordem do config) — um caminho de
    verdade, então nunca abaixo do pior exato. `realizado` é sempre exato. A tela diz "pior caso estimado".
    Desempenho medido (Node 24, fixture v3): 6 rodadas, uma equipe, ~0,3 a 0,45 s; o placar de 6 equipes, ~1,5 s.

**Semântica dos efeitos e ordem do mês** (arquitetura, seção 7; D-044, D-046 e o esquema v2.1):
- esquema v3: com `m = mesesPorRodada`, a "rodada" é um período de m meses. O `soma` do `persona.todoMes` (inclusive
  os de `fixo`, `gasto` e `protecao`) conta m vezes; o `multiplica` do `todoMes` age uma vez sobre o delta já
  acumulado (o "exausto" tira 10% do bimestre, e não 19%); os efeitos gerais, da opção e da carta são por evento. As
  linhas saem com o valor já multiplicado. Com m = 1, tudo como antes;
- o delta de cada indicador começa em 0;
- (1) **trabalho variável**: `persona.todoMes` → `rodada.efeitosGerais` → opção → carta, só com os efeitos
  **sem** `fixo` e **sem** `categoria: "gasto"`. `soma` adiciona ao delta, e `multiplica` multiplica o delta
  daquele indicador. É o único passo em que `multiplica` vale: a carta que zera a renda zera o que se
  ganha, e não a parcela da moto nem o conserto. Com `regras.pisoTrabalho`, no fim deste passo o trabalho
  variável negativo vira 0 (linha `piso`): os dias parados são somas a preço cheio, e depois de um
  `multiplica` (o exausto, o bloqueio) chegavam a tirar mais renda do que havia;
- (2) `− custos fixos`: os efeitos com `fixo`, de qualquer origem, na ordem dos grupos;
- (3) `− gastos`: os efeitos com `categoria: "gasto"`, de qualquer origem, na ordem dos grupos;
- (3b) `+ proteção` (D-059): os efeitos com `categoria: "protecao"`, de qualquer origem, na ordem dos grupos;
- depois, na renda: (4) `+ outraRenda` (× m) → (5) `− básico` (a soma dos itens, × m; uma linha por item, com o valor × m) → (6) `− juros`, com
  `juros = round(|saldo| × taxa)`, `taxa = jurosDividaMes` com m = 1 e `(1 + jurosDividaMes)^m − 1` com m > 1 (juros
  compostos no período; com m = 1 a taxa não passa pela potência, que em ponto flutuante não devolve exatamente j), quando a renda do estado **antes** da rodada é negativa (a
  dívida que vinha do mês anterior), e 0 senão. A carta que corta a renda corta o que se ganha, e não
  a conta da casa;
- (7) empréstimo (esquema v2.2), fora do trabalho, do piso e de qualquer `multiplica`: a entrada do empréstimo
  tomado pela opção do mês (+ renda, + `emprestimo`); a parcela de cada empréstimo tomado num mês anterior, lida do
  histórico (esquema v3: a rodada jogada k depois do empréstimo paga as parcelas `(k − 1)·m + 1` até `k·m`, mês a mês, uma
  linha de juros por parcela; com m = 1, a k-ésima parcela no k-ésimo mês **jogado** depois dele, na ordem das rodadas do config: mês pulado no
  dia não cobra parcela), com os juros dela em `juros` e a amortização saindo da renda e do `emprestimo`. Sem o
  histórico, não há parcela;
- (8) a (11), só com `regras.limiteChequeEspecial` (esquema v3.1, D-066), depois de tudo:
  - (8) **mora**: `round(principal atrasado de antes × moraMes × m)`, juros simples (é como a lei e as concessionárias
    cobram), somada às contas atrasadas. O principal (o que atrasou, sem a multa e a mora já lançadas; revisão da F6c:
    antes, a base era o atrasado inteiro, e a mora incidia sobre a multa e a mora de antes, contra a fonte) vai no
    `depois` como `contas_atrasadas_principal`, fora dos indicadores do config (≤ `contas_atrasadas`; só com o limite).
    Estado sem ele (sala de antes, estado inicial) conta todo o atrasado como principal;
  - (9) **quitar o atrasado**: se o caixa do fim (estado + delta) está acima de −limite, a folga até o limite paga as contas
    atrasadas com a mora (`contasPagas = min(atrasadas + mora, caixa + limite)`): a casa usa o cheque especial para não ter
    a luz cortada, e o atrasado diminui num mês bom. O pagamento abate primeiro a multa e a mora, depois o principal
    (Código Civil, art. 354);
  - (10) **o corte**: se o caixa ficaria abaixo de −limite, o excedente não vira dívida no banco. Com `cortarPrimeiro:
    "contas"`, atrasam primeiro as contas do período (o básico menos a comida e menos os itens `semAtraso`, × m); depois a
    casa fica sem os itens `semAtraso` do período (`ficouSem`, revisão da F6c: não viram dívida nem pagam multa; só faltam
    quando já não há o que atrasar, **a validar**); a comida corta o que passar deles, no máximo a comida do período
    (`comidaDoBasico × m`); o resto (o que passa do básico, como um conserto) também atrasa. Com `"comida"`, a comida corta
    primeiro, depois atrasam as contas e depois a casa fica sem os itens `semAtraso`. O caixa fica em −limite exato (o `depois` da renda tem piso `max(min, −limite)`);
  - (11) **multa**: `round(atrasou × multaAtraso)`, uma vez, sobre o que atrasou nesta rodada, somada às contas atrasadas;
  - a multa e a mora vão para as contas atrasadas, e não para o caixa (no caixa poderiam passar do limite de novo). A dívida
    total fica limitada a limite + empréstimo + contas atrasadas, e as contas atrasadas crescem só pelo que atrasa, pela
    multa e pela mora: acabam os juros compostos sem fim (a Daiane do piloto automático com a carta "Normal": de −R$ 38.782
    no banco para −R$ 1.500 no banco, R$ 20.517 em contas atrasadas e R$ 8.276 de comida não comprada, com limite de
    R$ 1.500, multa de 10% e mora de 1% de teste);
  - linhas: `mora` e `multa` (só em `contas_atrasadas`), `contasPagas` (− renda, − `contas_atrasadas`), `faltouNaMesa`
    (+ renda, + `faltou_na_mesa`), `ficouSem` (+ renda) e `atraso` (+ renda, + `contas_atrasadas`: o básico já tinha saído inteiro do caixa);
  - o `mesComum` ignora o limite (é o furo de um mês, sem dívida);
- toda condição lê o estado **antes** da rodada e o histórico da equipe;
- no fim, `depois = clamp(estado + delta, min, max)` (com o limite, o mínimo da renda é `max(min, −limite)`).

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
- o `prazo` que o anfitrião grava é o **da regra**: o fim do cronômetro mais a folga de 12 h
  (`alunoLogica.FOLGA_DA_REGRA_MS`, seção 7). As regras não mudaram com isso (eram `v3`): na prática, o voto
  vale enquanto a votação estiver aberta, e quem corta é o `fechando` do apresentador (D-010). No teste de
  30/09, com o prazo igual ao fim do cronômetro, a decisão do mês 3 ficou aberta 7 min 35 s e todo voto
  depois de 2 min 5 s foi recusado;
- leitura: o aluno lê `meta`, `conteudo`, `estado`, `pulso`, `resultados`, `placar`, `enquetes` e `membros`; em `decisoes/{r}/{equipe}`, só a da própria equipe; em `votosEnquete`, só a própria folha; nunca `sementes`, `prorrogacoes`, `presenca` nem a sala inteira;
- **regras v4 (D-064, o modo espectador):** quem tem PIN_OK (o mesmo da retomada: `privado/pinApresentador` existe e `pedidosAnfitriao/{uid}` é igual a ele, no dado atual) lê `decisoes/{r}/{equipe}` de **qualquer** equipe, uma por vez; nunca `decisoes/{r}` inteiro, a sala inteira, `sementes` nem o voto de enquete de outro. É só leitura: votar continua exigindo ser membro da equipe. Nas regras v3, o PIN não dava leitura nenhuma, e o celular do apresentador não via a contagem da equipe nem tinha como conferir o PIN (`pedidosAnfitriao` aceita qualquer texto de 8 a 32 caracteres);
- `regrasVersao/{uid}` só aceita a versão das regras (`REGRAS_VERSAO`, hoje `"v4"`); `pedidosAnfitriao/{uid}`, só texto de 8 a 32 caracteres; `autoteste` e `privado`, nunca.
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

`Viracao.anfitriao.criar({ canal, config, sala, nomeRoteiro, agora?, gerarSemente, uid?, aoMudar?, versaoApp?, folgaDaRegraMs? })` devolve os métodos abaixo.
- `agora` padrão é `canal.agora`; sem `uid`, usa `canal.entrar()`;
- `sala` segue `[A-HJ-NP-Z2-9]{4}`;
- `aoMudar(estado)` é chamado a cada estado novo conhecido, inclusive o que chega por conflito;
- `folgaDaRegraMs` (padrão `alunoLogica.FOLGA_DA_REGRA_MS`, 12 h): número ≥ 0, senão `TypeError`. Só o
  simulador e os testes passam outra, curta, para provar o corte da regra sem esperar 12 h.

**O prazo gravado é o da regra (teste de 30/09).** Todo `prazo` que o anfitrião grava é
`fim do cronômetro + folga`, e o fim do cronômetro é `prazo − folga` (`alunoLogica.fimDoCronometro`, que o
telão e o celular usam para desenhar). O fim do cronômetro é o de antes: `abertoEm` + o tempo configurado da
etapa (`enqueteSeg`, `decisaoSeg`, `prorrogacaoSeg`) + os "+30 s". O `restanteMs` da pausa é tempo de
cronômetro, sem a folga. Por quê: com o prazo igual ao fim do cronômetro, a regra recusava todo voto depois de
prazo + graça (125 s na decisão), com a votação ainda aberta no telão (quem encerra é o apresentador, D-010);
no teste de 30/09 a decisão do mês 3 ficou aberta 7 min 35 s, e o "Votar nesta" não contava. Com a folga do
tempo de vida da sala, o voto vale até o `fechando`; a regra continua cortando depois de prazo + graça, como
rede de segurança. Nos métodos abaixo, "prazo novo" é `agora + tempo da etapa + folga`.

| Método | O que faz |
|---|---|
| `criarSala() → Promise<estado>` | recusa se a sala já existe; grava a `meta` (sozinha) e depois `conteudo` + `estado` inicial (`geracao` 1, índice 0); a sala expira em 12 h |
| `carregarSala() → Promise<estado>` | lê `meta` e `estado` do banco: recarregar o telão, ou assumir em outra máquina. Recusa (com erro claro, antes de assumir) se `meta.roteiro` não é o `nomeRoteiro`, se `meta.hashConfig` não é o `validarConfig.hash(config)` local, ou se `estado.tipo` não bate com o passo `estado.indice`. Se `meta.hostUid` não é o `uid`, grava `meta/hostUid` = `uid` sozinho, antes de qualquer transição: a regra só aceita com o PIN (PIN_OK), e sem ele a recusa vem aqui |
| `avancar()` | próximo passo. Na enquete `uma_por_vez` em votação, vai para a próxima afirmação (prazo novo); se estava pausada, continua pausada, com `restanteMs = enqueteSeg` inteiro e sem `prazo`. No `sorteio`, vai para o `resultado`. **Nunca fecha votação**: com `votando`, `decidindo`, `prorrogacao` ou `fechando`, lança erro |
| `encerrar()` | fechamento em duas fases (abaixo). Também conclui um `fechando` interrompido (telão que caiu no meio) |
| `desfazer()` | só no passo atual: rodada em `sorteio` ou `resultado` volta a `decidindo` (prazo novo, mesmo `abertoEm`, `forcadas` mantidas); enquete `apurada` volta a `votando`. Em `fechando` (a apuração lançou erro e o `encerrar` não conclui), volta à votação com prazo novo, sem apagar nada: enquete a `votando`, rodada a `prorrogacao` se há `empatadas`, senão a `decidindo`. Com a enquete em `votando` ou a rodada em `decidindo`, **desfaz a abertura** (D-037, abaixo); a `prorrogacao` não. Nos outros casos, lança erro |
| `pularPara(indice)` | só para a frente, e nunca com votação aberta ou em `fechando` |
| `maisTempo(seg)` | só com votação aberta; o fim do cronômetro vira `max(fim, agora) + seg` (`prazo = max(prazo − folga, agora) + seg + folga`); pausado, soma no `restanteMs` |
| `pausar()` / `retomar()` | pausar grava `restanteMs` = o que faltava no cronômetro (`max(0, prazo − folga − agora)`) e tira o `prazo` (a votação fica congelada); retomar faz `prazo = agora + restanteMs + folga` |
| `decidirPorEquipe(equipeId, opcaoId|null)` | grava `estado.forcadas` (com `decidindo` ou `prorrogacao`, só equipe ativa); `null` desfaz |
| `definirEquipesAbertas(ids)` | antes da trava; grava `estado.equipesAbertas` como `{ e1: true, … }`, sempre com as obrigatórias; lista vazia lança erro. O "de 3 a 6" (arquitetura seção 8) fica na tela |
| `moverMembro(uid, equipeId)` | grava `membros/{uid}/equipe`; recusa membro inexistente e equipe fechada |
| `distribuirAtrasados() → Promise<n>` | depois da trava, põe numa equipe aberta quem não tem uma (ou está numa fechada), com `alunoLogica.sugerirEquipe`. Roda sozinho quando as equipes travam; o telão chama de novo quando entra alguém |
| `removerInativos(limiteMs = 60000) → Promise<n>` | apaga `membros/{uid}` de quem não tem presença nos últimos `limiteMs`, **menos quem já votou na votação da etapa** (revisão da F6a: o voto confirmado nunca some). A etapa é lida do `estado` do banco: rodada em qualquer subfase (`decisoes/{r}`: o `sorteio` e o `resultado` também, porque o `desfazer()` reabre e apura de novo, e a apuração conta só quem ainda é membro) e enquete em `votando` ou `fechando` (`votosEnquete/{e}/{m}`). Fora disso, sai quem está sem sinal, como antes. Devolve quantos saíram |
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
- Empate: o passo 5 grava o `estado`, com `subfase: "prorrogacao"`, `empatadas` e `prazo = agora + prorrogacaoSeg + folga` (o `abertoEm` não muda), e, no mesmo `gravar()`, a marca `prorrogacoes/{r} = true`. Nenhum resultado é gravado. Ao encerrar a prorrogação, o fechamento roda de novo, com `aposProrrogacao: true` e `candidatas` = as opções de `empatadas[equipe]` para as equipes de `empatadas` (a moeda e a maioria ficam entre as empatadas). **Uma prorrogação só por rodada (D-035):** se outra equipe empatar no segundo fechamento, vai direto para a moeda. O mesmo vale depois do `desfazer()`: o passo 4 também lê `prorrogacoes/{r}` e, se a marca existe, todo empate vai direto para a moeda (`aposProrrogacao: true`, sem `candidatas`: a moeda fica entre as opções empatadas agora).
- Resultado por equipe: `{ decisao, origem, contagem, chances, carta, delta, depois, mes, cartaCusto, deAntes?, protecaoEvitou?, protecaoItens?, protecaoAcimaDoTrabalho? }` (`protecaoAcimaDoTrabalho`, D-067, só quando o `resolverRodada` o devolve; os campos da D-066 vão dentro do `mes` e do `depois`, e o placar leva `contas_atrasadas` e `faltou_na_mesa` pelo `...ultima`; as regras v4 aceitam, sem mudança) (`cartaCusto` desde o esquema v2.1; `deAntes` e `protecaoItens` só quando não são vazios; `protecaoEvitou` só quando é maior que 0, D-059; as regras v3 aceitam qualquer filho de `resultados/{r}`, sem mudança). O anfitrião passa ao
  motor o histórico da equipe (`motor.historicoDe` com as rodadas anteriores do roteiro que têm resultado). Placar de **todas** as equipes do config: `{ ...indicadores, piloto, efeitoDecisoes, sorte, piorCaso, piorCasoSemProtecao, ativa, estimado? }`, com `piloto` = `esperadoPiloto` do `motor.decompor` (`piorCasoSemProtecao` desde a D-059; as regras v3 aceitam qualquer filho de `placar`, sem mudança). `estimado: true` (esquema v3) só quando o `decompor` da equipe simulou (6 rodadas: a partir da 5ª); o placar exato não leva o campo, e o de 3 rodadas fica igual ao de antes. O anfitrião é o mesmo com N rodadas: o estado e o histórico de antes de cada rodada seguem a ordem do roteiro, e o fluxo do voto não mudou. Custo do fechamento com 6 rodadas: o `decompor` das equipes que jogaram, ~1,5 s no Node para 6 equipes.

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
6. houve voto: reabre a mesma votação (`votando`/`decidindo`, mesmo `prazo` e `abertoEm`; se o
   cronômetro acabou durante a espera, `prazo = agora + o que faltava no Ctrl+Z + folga`; pausada, o
   mesmo `restanteMs`) e lança o erro "Já chegaram N votos; …". O voto que chegou antes do "fechando"
   fica e conta no `encerrar`.

Se a rede cai entre as fases, a sala fica em `fechando`. O anfitrião guarda na memória a marca desse
`fechando` (`desfazendoAbertura(estado?) → boolean`; não vai ao banco, porque o estado tem
`$outro: false`): com ela, o telão mostra "Desfazendo a abertura…" e não "Apurando…", o
`desfazer()` seguinte retoma o desfazer (passos 4 a 6) e o Enter pede confirmação antes de apurar.
Depois de recarregar o telão (ou em outra máquina), a marca se perdeu e vale o fechamento
interrompido comum: o `desfazer()` seguinte reabre a votação e o outro tenta de novo.

`desfazer()` apaga `resultados/{r}` e recalcula o `placar` sem esta rodada (`null` se não sobrar nenhuma), e **nunca** apaga `sementes/{r}` nem `prorrogacoes/{r}`. Votos, semente e marca continuam lá: encerrar de novo tira a mesma carta e não abre outra prorrogação.

Nada fecha por timer: o prazo serve só à regra do banco (com a folga, uma rede de segurança de 12 h) e,
descontada a folga, ao cronômetro visual (D-010; arquitetura, seção A, item 3). Chegar a "tempo esgotado"
não fecha nada nem recusa voto: quem fecha é o `encerrar()` do apresentador.

---

## 8. `Viracao.alunoLogica`

| Função | O que faz |
|---|---|
| `telaDoAluno({ conteudo, estado, membro, membros?, meusVotos, decisoesDaEquipe, resultados, placar, uid, agora, meta? }) → { tipo, dados }` | ver os tipos abaixo |
| `sugerirEquipe(conteudo, { membros, ativos?, equipesAbertas? }) → equipeId|null` | completa até `alvoPorEquipe`, na ordem do config; com todas cheias, vai para a de menos membros ativos (empate: a primeira na ordem); sem nenhuma aberta, `null`. `ativos` e `equipesAbertas` aceitam `Set`, lista ou mapa |
| `pendenteAindaVale(pendente, estado) → boolean` | o voto guardado ainda pode ser reenviado? |
| `motivoDaRecusa(pendente, { estado, membro, anterior?, entradaAberta? }) → 'fechou'|'trocaTarde'|'soEmpatadas'|'outraAfirmacao'|'pausado'|'foraDaSala'|'foraDaSalaFechada'|'outraEquipe'|'entrouDepois'|'semMotivo'` | por que a regra recusou um voto, pelo estado e pelo registro de membro de agora (teste de 30/09: o celular nunca fica calado). Com `pendenteAindaVale` falso: `outraAfirmacao` (a mesma enquete e momento, uma afirmação por vez, e o apresentador já passou para outra); `soEmpatadas` (a própria equipe está na prorrogação, e a opção não empatou); `trocaTarde` (a mesma etapa e janela, e havia um voto anterior confirmado, diferente do recusado, que contou: na decisão, com o membro ainda na equipe e `entrouEm ≤ abertoEm`); senão `fechou` (outra etapa, outra janela, `fechando` sem voto anterior). Com ele verdadeiro: `pausado` (com `restanteMs`); `foraDaSala` (sem registro de membro), ou `foraDaSalaFechada` com `entradaAberta === false` (o aparelho não volta sozinho); na decisão, `outraEquipe` e `entrouDepois` (`entrouEm > abertoEm`); senão, `semMotivo` (tentar de novo). Revisão de 30/09, achados P2, P3 e 7 |
| `fimDoCronometro(estado) → ms|null` | `estado.prazo − FOLGA_DA_REGRA_MS`: o fim do cronômetro que o telão e o celular desenham; `null` sem prazo (pausado) |
| `FOLGA_DA_REGRA_MS` | 12 h (o tempo de vida da sala): a folga entre o fim do cronômetro e o prazo que o anfitrião grava para a regra (seção 7). Fica aqui porque o celular não carrega o anfitrião |
| `cracha(uid, equipe|nome|null) → "Laranja · K7Q"` | derivado do uid, não pessoal; sem equipe, só o código |
| `codigoCracha(uid) → "K7Q"` | 3 caracteres do alfabeto da sala (FNV-1a do uid); o telão usa para achar o aparelho no "Mover aluno" |

Entradas de `telaDoAluno`:
- `conteudo`, `estado`, `membro` (`membros/{uid}`), `resultados`, `placar` e `meta`, como lidos do banco. `meta` é opcional e serve à tela `entradaFechada` e ao título do bloco;
- `meusVotos = { [enquete]: { [momento]: { [afirmacao]: 1..5 } } }`, só os do próprio aparelho;
- `decisoesDaEquipe = decisoes/{rodada}/{minhaEquipe}`;
- `membros` (opcional, o nó `membros` inteiro, que o aluno lê): com ele, a contagem ao vivo da decisão conta só o voto de quem ainda é da equipe e tem `entrouEm <= abertoEm`, o mesmo filtro da apuração. Sem ele, conta todos os votos do nó;
- a tela não olha o relógio (invariante I5): o `prazo` vai em `dados` só para o cronômetro, e é o **fim do
  cronômetro** (`fimDoCronometro(estado)`), e não o `estado.prazo` da regra, que leva a folga de 12 h.

| `tipo` | Quando | `dados` |
|---|---|---|
| `entradaFechada` | sem registro de membro e `meta.entradaAberta === false` | `{}` |
| `aguardando` | sem membro (`motivo: "entrando"`), sem estado (`telao`), `lobby`, bloco antes das equipes (`apresentacao`, com `titulo`), sem equipe válida (`semEquipe`), votação fechando (`votacaoEncerrada`), prorrogação de outra equipe (`desempateDeOutrasEquipes`) | `{ motivo, titulo? }` |
| `enquete` | `votando` e falta voto numa afirmação aberta | `{ enquete, momento, afirmacao, posicao, total, afirmacoes, escala, prazo, pausado, restanteMs }`; `posicao` e `total` contam na enquete inteira ("2 de 3" no `uma_por_vez`), e `afirmacoes` traz só as abertas |
| `enqueteRegistrada` | votou em todas as abertas, ou etapa fechada e votou em alguma | `{ enquete, momento, afirmacoes, encerrada }` |
| `escolherEquipe` | `formarEquipes` antes da trava | `{ equipes: [abertas], minha }` |
| `persona` | `personas` (ou `formarEquipes` já travado) com equipe | `{ equipe, persona, indicadores }` |
| `situacao` | `bloco` com equipe e equipes travadas (D-006); `placarFinal` (com `final: true`, `placar` e `historia`) | `{ equipe, persona, indicadores, mes, divida, narrativa: [opção, carta], periodo, resumo, titulo?, final, placar?, historia? }` |
| `decisao` | `decidindo` | `{ rodada, contexto, opcoes: [{ id, rotulo, votos }], meuVoto, podeVotar, motivo: null|"entrouDepois"|"pausado", forcada, prazo, pausado, restanteMs, periodo, situacao }` |
| `prorrogacao` | `prorrogacao` com a própria equipe empatada | igual a `decisao`, só com as opções empatadas |
| `sorteando` | `sorteio` (não revela a carta), ou `resultado` ainda sem o nó | `{ equipe, rodada }` |
| `resultado` | `resultado` | `{ equipe, rodada, origem, decisao, carta, delta, indicadores, mes, divida, cartaCusto, deAntes, protecaoDoMes, periodo }` |
| `comparativo` | `comparativo` | `{ enquete, afirmacoes: [{ id, texto, antes, depois }] }`, só os votos do próprio aparelho |
| `fim` | `fim` | `{ equipe, placar, historia, resumo, periodo }` |

Equipe válida = existe no conteúdo e está em `estado.equipesAbertas` (quando definidas). Membro numa equipe fechada aguarda a redistribuição.

Campos do esquema v3 (D-060, D-065), com N rodadas:
- `periodo` (situação, decisão, prorrogação, resultado e fim) = `historia.periodo(conteudo)`: `{ meses, nome, noPeriodo,
  doPeriodo }` (`{ 2, "bimestre", "no bimestre", "do bimestre" }` com `regras.mesesPorRodada` 2; `{ 1, "mês", "no mês",
  "do mês" }` sem a chave). É o que a tela usa para dizer "o saldo do bimestre" no lugar de "o saldo do mês". Sem o
  `historia.js` carregado, o do mês;
- `resumo` (situação e fim) = `historia.resumoPorRodada(conteudo, equipe, resultados)`: uma linha por rodada jogada
  (D-065, o resumo mês a mês do celular), com qualquer número de rodadas; lista vazia antes da primeira;
- o `mes` da situação e do resultado é o da **rodada** inteira (com o bimestre, o básico e a outra renda já contam 2
  vezes, e `saldoMes` é o saldo do bimestre); os nomes dos campos não mudaram.

Campos do esquema v2 (D-043 a D-046):
- `persona` (em todas as telas que a trazem) = `{ id, nome, descricao, familia: { descricao, pessoas }|null, basico: { total, itens: [{ rotulo, valor, fonte }] }, outraRenda: { rotulo, valor, fonte }|null }`;
  o `total` é a soma dos itens, a mesma conta do motor (que o celular não carrega);
- `contexto` (decisão e prorrogação): o texto de `rodada.contexto[persona da equipe]`, ou `null`. As opções
  nunca trazem a `tendencia`;
- `mes`: no `resultado`, é o `resultados/{r}/{eq}.mes` gravado (ou `null`); na `situacao`, é o objeto do
  último mês de antes (`rodada, titulo, origem, decisao, carta, cartaCusto, deAntes, protecaoDoMes`) **mais** os campos do `mes`
  gravado (`trabalho, custosFixos, gastos, protecao, outraRenda, entrou, basico, juros, saldoMes, dividaAntes`; sala
  de antes do v2.1 não traz `custosFixos` nem `gastos`, e sala de antes da D-059 não traz `protecao`); `null` antes do primeiro mês;
- `protecaoDoMes` (D-059): no `resultado`, e na `situacao` em `mes.protecaoDoMes`, é
  `historia.protecaoDoResultado(resultado gravado)`: `{ pagou, evitou, itens, saldoMes }` quando a proteção
  pagou algo no mês, ou `null`;
- `cartaCusto` (esquema v2.1, D-052): no `resultado`, é o `resultados/{r}/{eq}.cartaCusto` gravado; na
  `situacao`, vai em `mes.cartaCusto`; `{ diasParado, rendaPerdida, gastos }`, ou `null` em sala de antes do
  v2.1;
- **texto da opção por persona** (D-054): nas telas `decisao` e `prorrogacao` (`opcoes[].rotulo`), no
  `resultado` (`decisao.rotulo` e `decisao.narrativa`), na `situacao` (`mes.decisao.rotulo` e a narrativa
  da opção em `narrativa`) e na `historia`, vale `rotuloPor`/`narrativaPor` da persona da equipe, e o
  `rotulo`/`narrativa` da opção quando ela não tem entrada;
- `divida = { valor, jurosMes }` (situação e resultado): `valor` é o saldo negativo da renda (0 sem dívida), e
  `jurosMes`, o `regras.jurosDividaMes` (D-046). Esquema v3.1 (D-066), só com o limite: mais `limite`
  (`regras.limiteChequeEspecial`), `contasAtrasadas` (o indicador `contas_atrasadas`) e `faltouNaMesa` (o acumulado de
  `faltou_na_mesa`, custo humano, fora da dívida). O `mes` do resultado e da situação traz os campos da D-066 (seção 3);
- `persona.basico.itens[]` leva `comida: true` no item da comida (D-066), só quando marcado;
- `protecaoDoMes.acimaDoTrabalho = { trabalhoComum }` (D-067), só quando o resultado gravado tem
  `protecaoAcimaDoTrabalho`: a tela diz a frase de `historia.fraseAcimaDoTrabalho`;
- `historia` (fim e placar final): `historia.historiaDaEquipe(conteudo, equipe, resultados)`.

### `Viracao.historia` (`js/nucleo/historia.js`)

Arquivo à parte porque o celular não carrega o motor. Carregado antes do `aluno-logica.js` no telão, no
celular e no `test/carregar-nucleo.mjs`.

| Função | O que faz |
|---|---|
| `historiaDaEquipe(conteudo, equipeId, resultados) → [{ rodadaId, titulo, rotulo, opcao: { rotulo, narrativa }, carta: { titulo, narrativa, tom }, mes, cartaCusto, deAntes, protecaoDoMes, saldoAcumulado, divida }]` | um item por rodada com resultado da equipe, na ordem das rodadas do config (D-045), com qualquer número de rodadas; `rotulo` (esquema v3) é o nome curto, `rotuloDaRodada(titulo, posição no config)`; a `opcao` vem com o texto da persona da equipe (`textoDaOpcao`, D-054); `narrativa`, `tom`, `mes` e `cartaCusto` ausentes viram `null`; `deAntes` ausente vira `[]`; `protecaoDoMes` é o de `protecaoDoResultado` (D-059); `saldoAcumulado` é `patrimonioDe(depois)` e `divida` é `dividaTotal(depois)` (esquema v2.2: o resumo mês a mês), `null` sem o `depois` |
| `dividaTotal(valores) → { chequeEspecial, emprestimo, contasAtrasadas?, total } \| null` | esquema v2.2, a partir dos indicadores (o `depois` ou o placar): `chequeEspecial` = renda negativa com o sinal trocado (0 se não é negativa), `emprestimo` = o saldo devedor (0 sem o indicador), `total` = a soma. É a "dívida" da tela. `null` sem a renda. Esquema v3.1 (D-066): com o indicador `contas_atrasadas` nos valores, `contasAtrasadas` entra no objeto, **fora** do `total` (revisão da F6c: o telão escrevia "dívida R$ 3.000" e o celular, "Dívida hoje R$ 7.811", para a mesma equipe; agora as duas telas escrevem o `total`, o banco e o empréstimo, e as contas atrasadas à parte). O patrimônio (`patrimonioDe`) desconta os três |
| `faltouNaMesaDe(valores) → n \| null` | D-066: o acumulado de `faltou_na_mesa`, ou `null` sem o indicador. Não é dívida |
| `fraseAcimaDoTrabalho(protecao, nome, moeda, periodo?) → string \| null` | D-067, de `protecaoDoResultado`: "Auxílio do INSS (45 dias): R$ 2.431, mais do que Bruna ganhava trabalhando num bimestre comum (R$ 1.400)." O nome do que pagou vem dos itens da proteção (o config); o "1 salário mínimo" fica no rótulo do efeito ou na fala do apresentador (o núcleo não escreve conteúdo). `null` sem `acimaDoTrabalho` |
| `fraseDoLimite(mes, moeda) → string \| null` | D-066: "O limite do cheque especial acabou: R$ X de contas ficaram atrasadas (multa de R$ M), a casa ficou sem R$ S do que não se paga depois e R$ Y de comida não deu para comprar." (o "ficou sem" só com `mes.ficouSem` > 0) e/ou "Pagou R$ Z de contas atrasadas."; `null` sem nada disso ou em sala sem o limite |
| `periodo(conteudo) → { meses, nome, noPeriodo, doPeriodo }` | esquema v3: `regras.mesesPorRodada` (inteiro ≥ 1, senão 1) e o nome do período: 1 "mês", 2 "bimestre", 3 "trimestre", 6 "semestre", outro "período de N meses"; `noPeriodo` = "no " + nome, `doPeriodo` = "do " + nome |
| `rotuloDaRodada(titulo, i) → string` | esquema v3: o título até os dois-pontos ("Jan–fev: quanto trabalhar?" → "Jan–fev"); sem os dois-pontos, o título inteiro; sem título, "Rodada i+1" |
| `mesesJogados(conteudo, historia) → n` | esquema v3: rodadas jogadas × `mesesPorRodada` ("No fim dos 12 meses"; com 3 rodadas mensais, 3) |
| `resumoPorRodada(conteudo, equipeId, resultados) → [{ rodadaId, rotulo, titulo, saldo, ficouCom, divida, faltouNaMesa?, faltouNaMesaAcumulado? }]` (os dois últimos só com o limite, D-066: o da rodada e o acumulado) | esquema v3 (D-065): o resumo por rodada, de `historiaDaEquipe`: `saldo` = `mes.saldoMes` (o saldo da rodada inteira), `ficouCom` = `saldoAcumulado` (o patrimônio no fim dela), `divida` = `dividaTotal(depois)`; `null` em sala sem o `mes` ou o `depois` |
| `nomesDosGastos(conteudo, { equipeId, rodadaId, decisao }, custo, mes, deAntes) → { antes, gastos, cartaNosGastos }` | o que a linha de um mês da história do telão nomeia nos gastos (revisão da F7, achado 9 da revisão de conteúdo e legibilidade). `antes`: os itens do `deAntes` sem `gasto` (o que mexeu no trabalho, com sinal); os de `gasto` (a multa) nunca entram aqui. `gastos`: as parcelas de `mes.gastos`, positivas e somando o total, na ordem: a da carta (`custo.gastos`, sem nome, "gastos"), as do config que valem sem o estado da equipe (efeitos de categoria "gasto" da opção decidida e os gerais da rodada, sem `se` ou só com `se.persona` da equipe: o curso de gel, os pneus), as de antes (a multa, pelo rótulo) e, se faltar, "outros gastos"; a primeira com nome sai "gastos: nome" quando há mais de uma, e só "nome" sozinha. Se as do config passam do total, sem elas; se ainda passam (dado incoerente), `gastos: null` (a tela escreve "gastos R$ G"). `cartaNosGastos`: a parcela da carta está nas contas. Antes (`nomesDoMes` do telão), com um gasto de opção a multa saía "−R$ 130" entre o que veio de antes e de novo dentro dos gastos |
| `patrimonioDe(valores) → n \| null` | esquema v2.2: `renda − emprestimo` (esquema v3.1: `− contas_atrasadas` também), o mesmo `motor.patrimonio` (o celular não carrega o motor). `null` sem a renda |
| `protecaoDoResultado(res) → { pagou, evitou, evitouMesa?, itens: [{ rotulo, valor }], saldoMes, acimaDoTrabalho? } \| null` (`evitouMesa`, revisão da F6c, só quando `res.protecaoEvitouMesa` > 0; com ele gravado, `protecaoEvitou` ausente vale 0) (`acimaDoTrabalho = { trabalhoComum }`, D-067, só quando `res.protecaoAcimaDoTrabalho` existe e o pago passa dele) | D-059, a partir do resultado gravado: `pagou = mes.protecao`, `evitou = protecaoEvitou` (ausente vale o `pagou`), `itens = protecaoItens` (lista que volta do RTDB como objeto é lida igual). `null` quando a proteção não pagou nada no mês, ou em sala de antes da D-059 |
| `fraseDaProtecao(protecao, moeda) → string \| null` | a frase do celular: "A proteção pagou R$ X: <rótulos>." e, com o saldo do mês, "Sem ela, teria faltado R$ Y a mais." (fechou no vermelho), "Sem ela, teria faltado R$ Y." (fechou por causa dela) ou "Sem ela, teria sobrado R$ Y a menos." (sobrou de todo jeito). Com `evitouMesa` (revisão da F6c), acrescenta ", e R$ Z de comida não teria dado para comprar" (ou "Sem ela, R$ Z de comida não teria dado para comprar." quando ela não mudou o saldo). A `moeda` vem da tela (`formatar.moeda`): o núcleo não formata dinheiro |
| `piorCasoDoPlacar(placar, protegeu) → { comEscolhas, semProtecao, evitou, situacao } \| null` | D-059: `piorCaso` e `piorCasoSemProtecao` do placar em reais inteiros para a tela. `situacao`: `"semEscolha"` (`protegeu` não é `true`), `"evitou"` (o "sem" é pior que o "com": `semProtecao` e `evitou = comEscolhas − semProtecao`), `"naoMelhorou"` (o "sem" é igual ou melhor: `semProtecao` `null`, `evitou` 0; o MEI com a sessão acabando antes do mês 3, a associação) ou `"semDado"` (sala de antes da D-059). O "sem" nunca sai melhor que o "com" (revisão da F5). `null` sem `piorCaso`. Esquema v3: com `placar.estimado === true`, o resultado leva `estimado: true` (a tela diz "pior caso estimado"); placar exato, sem o campo |
| `temProtecao(conteudo) → boolean` | alguma opção do config tem `protege: true` |
| `escolheuProtecao(conteudo, resultados, equipeId) → boolean` | a equipe decidiu, em algum mês com resultado, uma opção com `protege: true`. O telão e o celular usam a mesma |
| `textoDaOpcao(conteudo, rodadaId, opcaoId, personaId) → { rotulo, narrativa }` | D-054: `rotuloPor[persona]` e `narrativaPor[persona]`, e o `rotulo`/`narrativa` da opção quando a persona não tem entrada; opção inexistente dá os dois `null`. É o que o telão usa para falar do jeito de cada equipe |
| `linhaDoMes(mes) → string \| null` | a linha curta de um mês da história no telão (D-045): a primeira frase da `opcao.narrativa` e a da `carta.narrativa`, separadas por espaço (o corte é sempre no fim de uma frase: ".", "!" ou "?" seguido de espaço); `null` sem nenhuma das duas |
| `escolhaOuSorte(placar) → { piloto, escolhas, sorte, total } \| null` | "Escolha ou sorte?" em reais inteiros para a tela (telão e celular): `total = round(renda − emprestimo)` (o patrimônio, esquema v2.2), `piloto = round(piloto)`, `escolhas = round(efeitoDecisoes)` e `sorte = total − piloto − escolhas`, para as três parcelas sempre somarem o total mostrado (arredondadas uma a uma, erravam por R$ 1). `null` sem `piloto`, `efeitoDecisoes` e `renda` finitos. Esquema v3: `estimado: true` quando o placar é estimado |

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
  de cada equipe vai escrita sob o nome dela, no telão (`.linha-graves`), depois da letra da decisão
  (`.linha-decisao`: "decisão B · cartas graves 12%"; revisão de 30/09, achado 9: é a decisão que mudou as fatias).
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

**Medidas depois do desenho:** a faixa de entrada é desenhada **antes** da tela (`desenhar`): o aperto do resultado,
das personas e do mapa mede a altura que sobra com ela. Desenhada depois, a primeira tela depois do lobby, e toda
troca de tamanho (a altura do QR é 12% da tela), era medida sem a faixa.

**A equipe pelo personagem (teste do Kleber de 05/10, prints 12 a 14):** em toda tela do telão, a equipe aparece
pelo personagem, e não pelo nome da cor: `rotuloEquipe(id)` monta o `graficos.rotuloEquipe` (a forma na cor da
equipe e o número, que ligam a equipe do telão à do celular e às teclas) e troca o texto de `.equipe-nome` por
`.equipe-quem` ("Jonas,") e `.equipe-oficio` ("motoboy"), com o nome da cor na dica (`title`). Os dois pedaços
são inteiros (CSS): numa coluna estreita, o rótulo quebra só entre eles. O ofício (`oficioDe`) é o começo da
`descricao` da persona até a primeira vírgula ou ponto, cortado antes da primeira preposição ou "e" (de, do, da,
em, no, na, por, pelo, pela, com, e…), com a primeira letra minúscula quando a segunda já é minúscula. Com o config
de 05/10: motoboy, manicure, motorista, influenciadora, entregador, vende doces. O trecho inteiro ("Bruna,
influenciadora de beleza") não cabia na coluna da equipe do sorteio e do resultado em 1024×768. Para mudar o
ofício na tela, muda-se o começo da descrição no config. Exceção: a **formação das equipes** mostra a cor
(`rotuloEquipe(id, null, { cor: true })`, é por ela que o aluno escolhe a equipe no celular) e, ao lado, o
personagem por extenso (`.equipe-persona`, `nomeDoPersonagem`: "Jonas, motoboy"). As linhas que repetiam o nome
do personagem ao lado do rótulo saíram: `.resumido-persona` (placar resumido), `.linha-persona` (placar, página do
saldo), `.persona-nome` (personas), o "Jonas ·" do resultado e o " · Jonas" do título da história. Os modais do
apresentador ("Decidir por esta equipe", "Mover aluno") continuam com "1 Laranja": o e2e:online procura o botão
por esse nome exato. O e2e confere o rótulo de toda equipe em toda tela (`conferirRotulosDasEquipes`).

**Personas (D-044, D-065):** uma entrada por persona com equipe aberta, na ordem das equipes (a persona da
equipe 1 primeiro; revisão de 30/09, achado 12: pela ordem das personas do config, a tela saía "1 e 2, 5,
3, 4, 6") (`.persona-linha`, `data-persona`,
`data-equipes` = as equipes, separadas por vírgula), sempre em três linhas (teste de 30/09: a tela
parecia sobreposta, com a equipe e o nome em linhas de base diferentes e o "· 3 pessoas em casa" caindo
sozinho na linha de baixo):
- `.persona-quem`: `.persona-equipes` (as equipes da persona, ligadas por `.persona-e` "e" quando são
  duas), cada uma pelo rótulo do personagem ("◯ 1 Jonas, motoboy", abaixo). O `.persona-nome` ao lado
  saiu (teste do Kleber de 05/10): repetiria o nome e o ofício do rótulo;
- `.persona-casa`: "N pessoas em casa · básico da casa R$ Y · outra renda R$ Z" (ou "sem outra renda"); o
  rótulo da outra renda vai na dica (`title`);
- `.persona-mes` (`data-saldo-mes-comum`, `data-sinal` = `negativo`|`positivo`|`zero`, `motor.mesComum`): "a conta
  do mês não fecha: faltam R$ W" em `--negativo`, ou "a conta do mês fecha: sobram R$ W" em `--positivo`.
A frase inteira da família e o básico item a item ficam no celular. "A conta do mês" continua sendo de **um**
mês mesmo com rodadas bimestrais (`motor.mesComum`, seção 3). O e2e confere as três linhas, uma linha
cada, e nenhum texto sobreposto (as caixas das linhas de texto e das formas), com seis equipes e a faixa
de entrada; e, na parte 7, com seis personas, uma por equipe (D-061). **Aperto** (`.personas[data-aperto="1"]`):
medido depois do desenho, só quando a lista transborda (seis personas com a faixa de entrada, em 1024×768,
passavam 84 px da borda): entrelinha 1,04 e vãos de 2 a 3 px, com a letra nos 28 px e o fio entre as personas.

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
marcas, com "mês N" dentro das rodadas; esquema v3, com `mesesPorRodada` > 1, o nome curto do período,
`historia.rotuloDaRodada`, "Jan–fev", e `data-numero` = a posição da rodada; medida depois do desenho, se a
trilha transborda (seis nomes de bimestre em 1024×768), ela ganha `data-compacta="curto"` e as marcas das
rodadas ficam com o começo do período (`data-curto`: "Jan", "Mar", "Mai", o nome curto até o traço) e, só se
ainda transborda (ou o título não tem o traço de um período), `data-compacta="numero"` e o número; o nome
inteiro fica na dica. Revisão da F7, achado 13 da revisão de conteúdo e legibilidade: ia direto para o número,
e em 1024×768 as marcas saíam "1"…"6", sem o vínculo com o calendário da D-060); no bloco cujo título começa por "Mapa do seminário"
(`ehMapa`: o passo não tem campo próprio, e o validador descarta chave nova no roteiro), ela é o
conteúdo (`.linha-tempo-mapa`, todos os trechos por extenso, em duas colunas acima de seis; esquema v3, colunas
de texto corrido, CSS `columns`, e não linhas de grade: com 6 rodadas o roteiro de 60 min dá 19 itens, e a grade,
com cada linha na altura do item mais alto do par, passava da faixa de entrada em 1024×768; se ainda transborda,
medido depois do desenho, `data-aperto="1"` aproxima os itens), e o
placar resumido não aparece. O placar resumido (`.placar-resumido`, nos blocos depois da formação das equipes e no Fim)
mostra o patrimônio de cada equipe (esquema v2.2: `historia.patrimonioDe`, o saldo acumulado menos o
empréstimo a pagar; antes do placar, o do estado inicial).

**Resultado da rodada (D-065, teste de 30/09; D-052, D-059):** só o essencial, uma faixa por equipe
(`.cartao-resultado`, com `data-equipe`, `data-carta`, `data-origem`, `data-saldo-mes`, `data-divida` e `data-caixa`; em sala com o
limite do cheque especial, também `data-contas-atrasadas` e, quando houve, `data-faltou-na-mesa`), em três
colunas alinhadas entre as faixas (`.grade-resultados` em grid, a faixa em `subgrid`), com um vão entre elas.
Antes, cada equipe era uma frase corrida de três linhas com todas as contas, e a tela era difícil de explicar
em aula. O detalhamento das contas (entrou, gastos, multa, básico, juros, empréstimo, o que veio de antes)
saiu do telão: fica no celular de cada equipe e na história do placar final.
- `.resultado-quem`: a equipe pelo personagem ("◯ 1 Jonas, motoboy") e, embaixo, a letra da decisão
  (`.resultado-escolha`: "decisão B", com `data-decisao` e o rótulo da opção na dica). Revisão de 30/09, achado
  9: sem a decisão, duas equipes do Jonas com a mesma carta mostravam saldos diferentes sem explicação. Na linha
  de detalhe, a letra empurrava a parada para uma terceira linha. A coluna é `fit-content(9em)` e ocupa a faixa de
  cima a baixo (`grid-row: 1 / span 2`): o rótulo mais comprido quebra entre o nome e o ofício, ao lado da carta,
  do dinheiro e da linha de baixo (em `max-content`, o personagem tirava ~70 px da carta em 1024×768);
- `.resultado-meio`: a carta (`.resultado-carta`, 1,15× o corpo), pelo título inteiro; quando ele não cabe numa
  linha, o `encurtarCartas` troca pelo `curto` (D-040; `data-curto`, `data-encurtada="1"`), e o título fica na
  dica. Embaixo, `.resultado-detalhe`, só quando há o que dizer, juntando por " · " (cada pedaço sem
  quebra; a linha só quebra entre eles):
  - o empréstimo tomado no mês (`.resultado-emprestimo`, `data-emprestimo`, de `mes.emprestimo`): "empréstimo
    R$ 1.500" (a dívida total fica igual com ou sem ele, e nada mostrava que a equipe o tinha pegado);
  - a parada (`span.custo-carta.resultado-custo`, de `resultados/{r}/{eq}.cartaCusto`): "N dias parado · perdeu
    R$ X" (`data-custo="perdeu"`), só com `diasParado > 0` (o custo em dinheiro das outras cartas está no
    saldo do mês). X = `rendaPerdida + gastos`, o prejuízo inteiro da carta (revisão da F7, achado 8 da revisão
    de conteúdo e legibilidade): só com a renda, o Marcos "perdeu R$ 287" numa quebra que custou R$ 1.887 com a
    embreagem, e o telão suavizava justo as cartas de desgaste (D-063);
  - o que a proteção pagou (D-059, `.conta-protecao`, `data-protecao`): "a proteção pagou R$ P", com espaço fixo
    entre "a" e "proteção". Com a frase da D-067 na faixa (abaixo), este pedaço sai: a frase já diz o valor;
  - a origem (`.resultado-origem` > `.resultado-decisao`), curta, quando não é a maioria: "ninguém votou",
    "empate na moeda", "na prorrogação", "pelo apresentador" (este só online);
- `.resultado-dinheiro`, alinhada à direita: o saldo do mês (`.resultado-saldo`, 1,3× o corpo, `mes.saldoMes`
  arredondado) com + ou − (`formatar.moeda` com sinal), em `--positivo` (`data-sinal="positivo"`) ou
  `--negativo`; o zero fica neutro, "R$ 0", `data-sinal="zero"`, como no celular (achado 16). Embaixo, a
  dívida total de depois do mês, discreta (`.resultado-divida`): "dívida R$ D" (cheque especial
  + empréstimo, `historia.dividaTotal(r.depois).total`) ou "sem dívida"; e o caixa, quando positivo
  (`.resultado-caixa`, revisão da F6a: a dívida é sempre a total, e o caixa positivo aparece como "caixa R$ X"):
  com dívida, numa linha própria embaixo dela (na mesma, a coluna do dinheiro apertava a carta); sem dívida, no
  lugar do "sem dívida". Valores em reais inteiros. O cabeçalho diz "saldo " + `historia.periodo(config).doPeriodo`
  ("saldo do mês"; esquema v3, "saldo do bimestre") (`.resultado-legenda`) sobre a coluna: o sinal e o
  cabeçalho dizem o mesmo que a cor, que nunca é o único canal.
  Esquema v3.1 (D-066, sala com `regras.limiteChequeEspecial`): a "dívida" passa a ser a do banco mais o empréstimo
  (`historia.dividaTotal(r.depois).total`, que já não leva as contas atrasadas; o banco nunca passa do limite), e as contas atrasadas
  ganham número próprio. Sem o limite, tudo como antes;
- `.resultado-limite` (D-066), só quando há o que dizer: uma linha própria embaixo do dinheiro, alinhada à direita
  como ele, da coluna da carta até a borda, juntando por " · " "contas atrasadas R$ Y" (`.resultado-atrasadas`, o
  indicador `contas_atrasadas` do `depois`: o que a casa deve de aluguel, luz e água no fim do período) e "faltou na
  mesa R$ Z" (`.resultado-mesa`, `mes.faltouNaMesa`: a comida que não deu para comprar NESTE período; não é dívida
  nem entra no saldo). Na coluna do dinheiro, "contas atrasadas R$ 8.635" alargava a coluna em ~120 px, a parada
  quebrava em duas linhas, e seis equipes passavam de 1024×768. Com contas atrasadas, o caixa está no limite (o banco
  cortou o crédito): a linha do caixa nunca aparece junto, e a faixa fica com três linhas;
- `.resultado-acima` (D-067), só quando o resultado traz `protecaoAcimaDoTrabalho`: a frase de
  `historia.fraseAcimaDoTrabalho(historia.protecaoDoResultado(r), persona.nome, formatar.moeda, historia.periodo(config))`
  ("Auxílio do INSS (MEI): R$ 4.000, mais do que Dani ganhava trabalhando num bimestre comum (R$ 3.800).") na largura da
  faixa inteira, embaixo das três colunas, no tom do texto. O "1 salário mínimo" fica no rótulo do efeito no config ou
  na fala do apresentador (o núcleo não escreve conteúdo).
As cores ficam no `base.css` (`--positivo` #6ee787, `--negativo` #ff7b72; 11:1 e 6,9:1 sobre a superfície). Os
juros ao mês saíram do cabeçalho (ficam no celular). **Aperto** (`.grade-resultados[data-aperto="1"]`): medido
depois do desenho, quando a lista transborda (seis equipes com a faixa de entrada embaixo) ou quando a linha de
detalhe de alguma faixa quebra em duas (revisão de 30/09, achado 15): as faixas se
aproximam, sem encostar, e a origem some (o texto continua no DOM; o celular a mostra). O título do mês é de
1,4× o corpo. D-066: no aperto, a entrelinha da faixa fecha em 1 e o respiro de dentro dela diminui (seis faixas de
três linhas passavam ~60 px de 1024×768). **Segundo aperto** (`.grade-resultados[data-aperto="2"]`, e a seção com
`data-aperto="2"`), medido logo depois, só se o primeiro não bastou (seis faixas no limite, uma com o empréstimo e a
parada quebrando o detalhe, mais a frase da D-067, ou a faixa de entrada embaixo): o saldo a 1,15× e a carta a 1,05× o
corpo, o título do mês a 1,15×, o vão entre as faixas em 8 px e a faixa sem respiro por dentro; a letra do corpo fica
nos 28 px. A parada pode quebrar entre "N dias parado" e "perdeu R$ X" (cada um inteiro): inteira, numa coluna da
carta mais estreita, passava por cima do dinheiro. O e2e (`conferirVisualDoResultado`) confere, em 1024×768 e 1920×1080: nada abaixo de 28 px, sem
rolagem, vão ≥ 8 px entre as faixas, colunas alinhadas, nenhum texto sobreposto, o saldo com sinal, na cor do
token e com contraste ≥ 4,5:1 sobre a faixa, e nenhum "entrou", "básico", "juros" ou "multa" seguido de valor na tela
(seguido de valor: o título de uma carta pode ter a palavra, "O dono entrou com o despejo"). A parte 8 do e2e (fixture
v3.1) prova o limite e a D-067 com seis equipes, quase todas estourando o limite em todo bimestre.
Resultado sem `mes` ou sem `cartaCusto` (sala de antes do esquema v2 ou do v2.1) é refeito com
`motor.aplicar`, com o histórico. A animação das cartas mais extremas (`regras.destacarCartas`, `.animada`) usa o
efeito da carta no saldo do mês (o mês com a carta menos o mesmo mês sem carta). **Sem contorno de destaque**
(revisão da F6a): um contorno mais grosso em duas faixas, sem legenda, a turma lia como "as equipes que
ganharam"; as faixas destacadas só entram animadas, e o e2e confere que toda faixa não grave tem a mesma borda e
nenhuma sombra.

**Placar final em páginas (D-041, D-045):** paginação local do passo `placarFinal`
(`app.ui.pagina`, como no comparativo; a seção leva `data-pagina` e, na história, `data-equipe`):
1. `saldo`, "Quanto sobrou, e quanto faltou para o básico" (com `regras.limiteChequeEspecial`, "Quanto sobrou, e quanto
   ficou devendo": a barra é o patrimônio, e a comida que faltou fica fora dela, na linha "Faltou na mesa"; revisão da
   F6c): uma barra por equipe que jogou, pelo patrimônio
   (esquema v2.2: `historia.patrimonioDe(placar[eq])`, o saldo acumulado menos o empréstimo a pagar; a ordem,
   o título e o "faltou/sobrou" também)
   (`placar[eq].ativa`), do maior saldo para o menor, com "faltou R$ X" ou "sobrou R$ X"
   (`.valor-saldo`) ao lado; o título conta quantas terminaram com saldo negativo ("5 de 6 equipes
   não fecharam as contas"; "As 6 equipes fecharam as contas" quando nenhuma); a referência com
   `persona` só nas linhas das equipes dela. Esquema v3.1 (D-066): o patrimônio já desconta as contas atrasadas, e,
   embaixo do gráfico (e das referências), a lista `ul.mesa-no-ano`: "**Faltou na mesa no ano** (fora do saldo):"
   (`.mesa-titulo`; "no ano" com 12 meses jogados, senão "em N meses") e, na ordem do gráfico, uma entrada por
   equipe que jogou (`.mesa-equipe`, `data-equipe`, `data-faltou-na-mesa`): a equipe e o acumulado de
   `faltou_na_mesa` do placar (`historia.faltouNaMesaDe`), inclusive R$ 0. É o custo humano, à parte do dinheiro: não
   vira barra nem segundo número ao lado do "faltou R$ X", onde se leria como parte dele. Só quando o placar tem o
   indicador (sala com o limite);
2. `escolhas`, "Escolha ou sorte?": uma linha por equipe, na mesma ordem, sem legenda
   (`.historia-conta`): "se não mudassem nada: R$ a → as escolhas: ±R$ b → a sorte: ±R$ c =
   terminaram com R$ d", com os totais a e d em `formatar.moeda` (nunca "+") e as variações b e c
   em `formatar.variacao` (sempre + ou −, "+R$ 0" no zero); o último passo (`.passo-final`) em
   negrito; a, b, c e d de `historia.escolhaOuSorte(placar[eq])` (o
   `motor.decompor` gravado pelo anfitrião, em reais inteiros que fecham a conta). **Em grade fixa**
   (`.historias-escolha.escolhas-em-grade`; revisão da F7, achado 13 da revisão de conteúdo e legibilidade):
   três linhas por equipe, as mesmas em todas, em duas colunas alinhadas entre as equipes (subgrid): a equipe e
   "se não mudassem nada"; "→ as escolhas" e "→ a sorte"; "= terminaram com". Em cada passo, o rótulo à
   esquerda e o valor à direita da coluna (os valores ficam em coluna). Corrida como texto, cada equipe quebrava
   num ponto diferente, e na projeção não dava para comparar; duas linhas não cabem com valores de cinco dígitos
   em 1024×768. O e2e (`conferirGradeDasEscolhas`) confere as mesmas linhas em toda equipe, cada passo numa
   linha só e começando no mesmo x. A página do pior caso continua corrida. Esquema v3: com algum placar `estimado`
   (a simulação do `motor.decompor`, 6 rodadas), o kicker diz "Placar final · valores estimados por simulação",
   e a linha leva `data-estimado="1"`;
   - `pior` (D-059), **só quando o config tem alguma opção com `protege`**, logo depois de `escolhas`:
   "O pior que podia acontecer", com a nota "Na média, a proteção custa dinheiro. O que ela pode fazer é evitar
   o pior." (revisão da F6a, textos da proteção coerentes: a nota antiga, "ela evita o pior", dizia como regra o
   que a linha "a proteção não melhorou o pior caso", logo abaixo, desmentia; as palavras de cada linha são as
   mesmas do celular) e, com o placar estimado, o kicker "Placar final · pior caso estimado" e `data-estimado="1"`
   na linha; e
   uma linha por equipe, na mesma ordem (`.piores-casos .historia-escolha`, `data-pior`,
   `data-pior-sem`, `data-evitou`, `data-situacao`), pelo `situacao` de
   `historia.piorCasoDoPlacar(placar[eq], historia.escolheuProtecao(…))` (`piorCaso` e
   `piorCasoSemProtecao` do anfitrião): "com as escolhas de vocês: R$ A · sem a proteção: R$ B · a
   proteção evitou R$ X" (`evitou`), "com as escolhas de vocês: R$ A · a proteção não melhorou o pior
   caso" (`naoMelhorou`), "com as escolhas de vocês: R$ A · não escolheram proteção" (`semEscolha`) ou
   só o primeiro número (`semDado`). O celular mostra o mesmo no placar final e no Fim ("O pior que
   podia acontecer", `.pior-caso`, com o `piorCaso` de `alunoLogica`, `null` em config sem proteção). É
   uma página à parte porque não cabia: com seis equipes, a conta do "Escolha ou sorte?" já ocupa até
   três linhas por equipe em 1024×768, e a página 1 é o gráfico. Config sem proteção fica com as
   páginas de antes;
3. `historia`, uma página por equipe que jogou, na ordem do config; esquema v3, **em páginas de até 3 rodadas**
   (`RODADAS_POR_PAGINA_HISTORIA`; 6 bimestres, duas páginas por equipe, `data-parte` e `data-partes` na seção):
   três rodadas é o que já cabia em 1024×768, e seis numa página passavam da altura. Com mais de uma página, o
   kicker diz o trecho do ano ("A história da equipe · Jan–fev a Mai–jun", de `historia.rotuloDaRodada`). `historia.historiaDaEquipe`,
   com um `.historia-mes` por rodada (o título da rodada, a linha curta `.historia-narrativa` =
   `historia.linhaDoMes(h)`, em até duas linhas com reticências no fim e sem baixar dos 28 px; sem
   narrativa no conteúdo, `.historia-fatos` "escolheram: {rótulo} · aconteceu: {carta}") e a linha
   do dinheiro (`.historia-dinheiro`), na mesma frase (numa linha própria, três meses de narrativa de duas
   linhas, custo e contas passavam da altura de 1024×768). É aqui, e no celular, que o detalhamento que
   saiu do resultado da rodada (D-065) continua:
   - o custo real da carta (`.historia-custo`, `span.custo-carta`, de `h.cartaCusto`, D-052): "N dias parado
     · renda perdida R$ X", só com o que for maior que zero; os gastos da carta vão nas contas, e só quando
     `historia.nomesDosGastos` não consegue partir os gastos do mês (dado incoerente) saem aqui, como "gastos
     da carta R$ Y";
   - o que veio de antes (`.historia-de-antes`, cada item `.de-antes` com `data-de-antes` = rótulo, de
     `h.deAntes`): os itens sem `gasto`, "rótulo ±R$ V" com sinal ("+25 dias da fratura −R$ 2.233 · INSS
     (45 dias) +R$ 2.431");
   - as contas do mês (`.historia-contas`): "entrou R$ X[ · a proteção pagou R$ P][ · gastos R$ G] · básico
     R$ Y[ · juros R$ J] · faltou R$ Z" ou "sobrou R$ Z", de `h.mes`; entrou + proteção − gastos − básico −
     juros = o `saldoMes` do motor (os juros são o total: cheque especial e juros da parcela). Os gastos saem
     por origem (`historia.nomesDosGastos`, achado 13 e revisão da F7, achado 9): a da carta sem nome, os da
     opção e da rodada e os de antes com o rótulo, e o que faltar como "outros gastos", juntas por " + " e
     sempre positivas ("gastos R$ 1.079 + curso de alongamento em gel, com kit R$ 1.500 + multa do aluguel
     atrasado R$ 130"); com uma origem só, só ela; a multa nunca sai também, com sinal, entre o que veio de
     antes. Cada rótulo quebra como texto, e só a última palavra fica colada
     ao valor (`.conta-quebra`, `.conta-fim`). Esquema v3.1 (D-066), com o limite: o básico é o que a casa consumiu,
     e a comida que não deu para comprar vem entre parênteses ("básico R$ 2.400 (faltou na mesa R$ 800)",
     `.historia-mesa`, `data-faltou-na-mesa`); depois dos juros, "multa e juros do atraso R$ M" (`.conta-atraso`,
     `mes.multa + mes.mora`; "multa do atraso" ou "juros do atraso" quando só um dos dois). Assim entrou + proteção −
     gastos − (básico − faltou na mesa) − juros − multa − mora = o `saldoMes` do motor. As contas que atrasaram ou
     foram pagas não entram: trocam dinheiro por dívida, e o saldo não muda;
   - o empréstimo do mês, depois das contas e como dívida (esquema v2.2; `.historia-emprestimo`,
     `data-emprestimo`): "pegou empréstimo de R$ E", com `mes.emprestimo > 0`. Nunca no "entrou";
   - a frase da D-067 (`p.historia-acima`), a mesma do resultado da rodada, no mês em que aconteceu.
   O texto da opção é o do ofício da persona da equipe (`historiaDaEquipe` já traz
   `rotuloPor`/`narrativaPor`, D-054). No fim da última página, `.historia-final`: "No fim dos N meses: faltou
   R$ X" (ou "sobrou"; N = `historia.mesesJogados`, as rodadas jogadas × `mesesPorRodada`: "dos 12 meses" com 6
   bimestres), pelo patrimônio do placar, e, com dívida, "· dívida R$ D" (`.historia-divida`, `data-divida`, a
   total: `historia.dividaTotal(placar[eq])`) e, com a dívida e o caixa positivo (o empréstimo), "· caixa R$ C"
   (`.historia-caixa`, `data-caixa`; sem dívida, o "sobrou" já é o caixa, e o número não se repete). Esquema v3.1
   (D-066): a dívida é a do banco mais o empréstimo, e depois vêm "· contas atrasadas R$ A" (`.historia-atrasadas`,
   `data-contas-atrasadas`) e "· faltou na mesa R$ F" (`.historia-mesa-total`, o acumulado). Nas páginas do meio, `.historia-final.historia-parcial`: "Depois de 6 meses: faltou R$ X[ ·
   dívida R$ D][ · caixa R$ C][ · contas atrasadas R$ A][ · faltou na mesa R$ F]", pelo `depois` gravado da última rodada da página. A parcela do empréstimo
   ("R$ S do empréstimo, em N parcelas") saiu do telão (revisão da F6a): a parcela detalhada fica só no celular.
   A tela de decisão (`decidindo`) continua com o rótulo comum da opção: é a mesma para todas as
   equipes, e não mostra narrativa por persona.
A última página avança o roteiro. Sem nenhuma equipe no placar, uma página só ("Nenhuma rodada foi
jogada nesta sessão."). **Aperto** (`.historias-escolha[data-aperto]`, `.historia-meses[data-aperto]`): medido depois do
desenho, só quando a lista transborda (esquema v3: 12 meses, valores de cinco dígitos e seis equipes de nome
comprido passavam 6 px de 1024×768 no "Escolha ou sorte?"), as linhas se aproximam, com a letra nos 28 px; as
listas centralizam com `safe center`, para nunca subir por cima do título. D-066: na história, se ainda transborda
(com o limite, três bimestres com o que veio de antes, a comida que faltou e a multa do atraso passavam ~60 px),
`.historia-meses[data-aperto="2"]`: a linha curta de cada bimestre fica em uma linha, com reticências no fim; as
contas fecham no saldo e não podem ser cortadas. No e2e, a grade do "Escolha ou sorte?" prova que cada coluna tem a
largura do passo mais largo dela (e não mais); o teto antigo de 8 letras de vão falhava com a sorte ao acaso e valores
de cinco dígitos, sem a coluna esticar. O `regras.placarPadrao` não é mais lido pelo telão.

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
4. Autoteste: `autoteste/{uid}` tem de ser recusado e `regrasVersao/{uid} = REGRAS_VERSAO` (hoje `"v4"`)
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
  `anfitriao.removerInativos(120000)`, que não tira quem já votou na votação da etapa (seção 7; o aviso acrescenta
  "Quem já votou nesta votação continua na sala." quando há uma): 2 min, o dobro da janela de ativo, para quem só
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
- **Modo espectador (D-064; regras v4):** o celular do apresentador vê a tela de qualquer equipe,
  exatamente como o aluno daquela equipe vê, e não é aluno.
  - Entrada: o link discreto "Sou apresentador" (`[data-acao="sou-apresentador"]`, depois de tudo na tela de
    entrada) abre o código da sala, o PIN (`#pin-espectador`, campo de senha, só em memória: o campo é
    esvaziado no envio e o valor nunca vai para o aparelho) e "Ver as equipes" (`[data-acao="entrar-espectador"]`).
  - Enter (o "Ir" do teclado) no campo do código, nessa tela, leva o foco ao PIN, e nunca entra como aluno;
    `entrarNaSala` retorna com o campo do PIN aberto ou no modo espectador (revisão da F7, achado 1; F6b,
    achado 14).
  - `entrar()`, lê `meta` (sem meta: "não há sala") e `membros/{uid}`. **Aparelho que já é membro da sala**
    (entrou como aluno e voltou à entrada) não vira espectador: fica na tela do PIN com "Este aparelho já entrou
    como aluno nesta sala e conta na equipe dele. Use outro aparelho para espiar as equipes.", sem gravar o
    pedido e sem apagar o próprio membro (depois da trava a regra nem deixaria; quem tira o aluno é o
    apresentador, pelo telão). Antes, ele virava um membro fantasma no "N de M" (F6b, achado 16).
  - Depois, nesta ordem: `apagarAoDesconectar(pedidosAnfitriao/{uid})`, **esperando a confirmação**; grava
    `pedidosAnfitriao/{uid} = PIN` (`pedidoGravado`, marcado antes da gravação); e **prova o PIN** lendo
    `decisoes/_pin/_pin`: só o PIN_OK passa (nenhum aparelho é da equipe `_pin`), porque a gravação do pedido
    aceita qualquer texto de 8 a 32 caracteres. O "apague ao cair" vem antes porque o servidor trata os pedidos
    de uma conexão em ordem: não há instante com o pedido no banco sem ele (registrado depois da prova, uma prova
    sem resposta deixava um PIN_OK permanente; F7, achado 2; F6b, achado 15). Recusada: o pedido é apagado e a
    tela volta ao PIN com "O PIN não confere com o cadastrado no console…". Falha que não é recusa (rede, o
    tempo-limite de 15 s expirado): o pedido é apagado na hora, antes da tela de erro.
  - O pedido sai do banco (`apagarPedido`, só com `pedidoGravado`): ao sair do modo e no "Entrar em outra sala"
    (mesmo de quem nem chegou a espectador), quando a prova falha, quando a sala é encerrada (a meta sumiu; aí
    ele não é mais regravado) e no `pagehide` (a aba que fecha ou navega; melhor esforço, porque o navegador
    não espera a escrita; o `beforeunload` fica de fora, porque tira a página do cache e dispara nos mesmos
    casos). A página que volta do cache do navegador (`pageshow`) grava o pedido de novo.
  - **Risco que sobra: o aparelho que perde a rede antes de apagar.** O apagamento fica na fila do SDK e só
    sai quando a conexão volta. Se a aba fechar antes, o pedido continua no banco até o servidor notar a queda e
    executar o "apague ao cair", o que demora mais quando a conexão morreu sem se fechar (o celular que sai da
    área do Wi-Fi). Nessa janela, o uid anônimo desse navegador tem o PIN_OK, como o telão na mesma situação.
    O pedido não fica para sempre: sem o "apague ao cair" confirmado pelo servidor, ele nem é gravado.
  - Regravado a cada reconexão, a cada recusa do ouvinte da decisão (`reafirmarPedido`: um apagamento atrasado
    da página anterior) e na volta do cache, sempre com o "apague ao cair" antes da gravação, e nunca com a sala encerrada: na reconexão, o SDK reenvia as
    escutas antes de avisar `.info/connected`, a meta nula pode chegar antes da confirmação do "apague ao cair", e
    a gravação que vinha depois dela não acontece (revisão do voto da F6b, achado 2). A reconexão no
    meio da entrada (pedido gravado, prova ainda sem resposta) registra de novo só o "apague ao cair": o servidor
    executou o anterior na queda, e o SDK reenvia a gravação na conexão nova. Ouve os mesmos nós
    do aluno, mais `decisoes/{r}/{equipe vista}`. `sala` sai do localStorage (uma sala de aluno guardada faria a
    recarga entrar como aluno) e a aba guarda só `sessionStorage espectador = S`: recarregar volta ao campo do
    PIN dessa sala, sem o PIN e sem entrar como aluno. O "Voltar" da tela do PIN e a entrada como aluno
    (`entrarNaSala`) apagam a marca: deixada ali, toda recarga do aparelho que tinha virado aluno caía no campo
    do PIN, sem voltar à sala (I6) nem reenviar o voto guardado (revisão do voto da F6b, achado 1). A falha do SDK recarrega sem o "entrar direto", e com a
    marca `espectador`, também quando ela acontece antes de o modo começar (a recarga volta ao PIN, e não à sala
    de aluno guardada).
  - A tela é `alunoLogica.telaDoAluno` com um **membro virtual** `{ equipe, entrouEm: 0 }` da equipe vista e
    `espectador: true` (na decisão, `motivo: 'espectador'`, antes dos outros motivos, e `podeVotar: false`);
    a contagem ao vivo usa o mesmo filtro dos membros de verdade. Começa na primeira equipe aberta e, quando o
    apresentador fecha a equipe vista, passa sozinho para a primeira aberta (sem nenhuma aberta, fica onde está):
    antes, o espectador que entrou no lobby ficava na e1 fechada, com "Aguardando uma equipe" (revisão do voto da
    F6b, achado 3).
  - Nunca: `membros/{uid}` (`garantirMembro` não roda), presença, voto (`votar` retorna; "Votar nesta"
    apagado, com "Modo espectador: não vota." junto dele; os números da enquete e a escolha de equipe,
    apagados), reenvio de pendentes, `meta/hostUid`. Não aparece no "N de M" nem nos ativos do telão, nem no
    "Mover aluno" (não tem crachá).
  - Topo: o selo "modo espectador" (`#cracha .selo-espectador`) no lugar do crachá e, numa segunda linha,
    o seletor sempre visível (`#barra-espectador`, um `[data-ver-equipe]` por equipe, com a forma e o
    número, `aria-pressed` na vista; equipe fechada pelo apresentador, apagada). "Sair do modo espectador"
    (`[data-acao="sair-espectador"]`) no fim de toda tela: desliga os ouvintes, apaga o próprio pedido e volta
    à entrada.
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
  - estágios do envio: `enviando`, `lento`, `guardado`, `esperaRetomar`, `falhou`, `recusado` e
    `registrado`. `guardado` e `esperaRetomar` marcam a opção ("guardado no aparelho", "guardado até
    retomar"), mas a contagem da equipe fica com o que o servidor confirmou;
  - `PERMISSION_DENIED` (teste de 30/09: o celular **nunca** fica calado): o motivo vem de
    `alunoLogica.motivoDaRecusa`, com o estado de agora, e diz o que fazer ("A votação fechou antes do seu
    voto chegar: ele não foi contado.", "…foi pausada…: quando o apresentador retomar, toque em “Votar nesta”
    de novo.", "…saiu da sala…", "…mudou de equipe…", "…entrou de novo na sala depois de a decisão abrir…", ou "O voto não foi
    aceito: toque em “Votar nesta” de novo…"). Aparece logo abaixo do botão tocado (`.opcao-aviso`, dentro da
    opção aberta, que rola para a vista), na nota depois das opções e nas telas seguintes da mesma etapa
    ("votação encerrada", "sorteando", "registrado" e o resultado). Antes, a única pista era essa nota, fora da
    tela em 360×740, e o "Votar nesta" ficava igual;
  - revisão de 30/09: a troca que chegou depois do fechamento com o voto anterior contado (`trocaTarde`) diz
    "A troca para B chegou depois do fechamento: valeu o seu voto anterior, A." (nota `info`, e não erro); na
    prorrogação, "…Agora só valem as opções empatadas: vote numa delas."; no termômetro de uma por vez, "A
    resposta da afirmação N chegou depois de o apresentador avançar e não foi contada.", já na tela da
    afirmação seguinte; fora da sala com a entrada fechada, "peça ao apresentador para abrir a entrada". As
    telas seguintes (`recusaDaEtapa`) mostram só a recusa da própria equipe (o aparelho movido não carrega a
    recusa da anterior), e a de uma afirmação anterior some depois que o aluno responde outra (`vista`);
  - recusa com a votação pausada no servidor (lida de novo na hora: a recusa e o estado novo chegam em
    qualquer ordem ao celular que volta da rede): `esperaRetomar`, o pendente fica no aparelho e vai sozinho
    quando o apresentador retomar ("…fica guardado no aparelho e vai sozinho quando ele retomar."); se a
    votação fechar antes, vira recusa. Antes, o pendente era apagado (revisão de 30/09, achado 6);
  - falha de escrita que não é recusa da regra: "guardado", e o celular tenta de novo a cada 3 s (até 5
    vezes) enquanto a etapa estiver aberta (o SDK não repete a escrita que falhou); se ela fechou, vale a
    recusa acima. Depois da quinta falha, `falhou`: o botão volta a valer, e a tela diz "Não foi possível
    enviar o voto: toque de novo em “Votar nesta”." (o pendente fica no aparelho: recarregar reenvia), e a
    opção aberta rola para a vista, como na recusa (o aviso podia passar da borda de baixo; matriz de 01/10).
    Antes, o "será reenviado" ficava para sempre (revisão de 30/09, achado 5);
  - movido de equipe com a decisão aberta depois de votar (confirmado, em voo ou guardado): o voto da equipe
    anterior deixa de valer, e o celular diz, acima das opções (`[data-movido]`) e dentro da opção aberta, "Você
    foi movido para a equipe N Nome: o voto na equipe anterior não vale aqui. Vote de novo.", até votar pela
    equipe nova ou a rodada acabar. No telão, "Mover aluno" com a decisão aberta e o voto do aparelho na
    equipe de agora pede confirmação ("…esse voto é descartado…", botão "Mover e descartar o voto", foco no
    Cancelar). Revisão de 30/09, achado P1;
  - botões desabilitados enquanto envia;
  - enquanto não confirma (e no guardado), a tela e a contagem usam o valor já
    confirmado: o SDK aplica a escrita no cache antes da confirmação. O guardado
    conta como respondido só para a navegação da enquete;
  - ao carregar, reenvia os pendentes com `pendenteAindaVale`; os que não valem
    são descartados, com aviso. Com a etapa pausada, o pendente espera no aparelho (a regra recusaria, sem
    prazo) e vai quando o apresentador retomar.
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
    sem `podeVotar` ou com um voto em voo). Sem `podeVotar`, o motivo ("Você entrou
    depois de esta decisão abrir…", "Pausado pelo apresentador…") fica logo abaixo do
    botão apagado (`.opcao-aviso`). Na opção que já tem o voto do aparelho,
    uma frase (`.opcao-votada`: "Seu voto está nesta.", "Enviando o seu voto nesta…"
    ou "Seu voto nesta está guardado no aparelho.") no lugar do botão. A opção votada
    fica marcada (`.meu-voto`, `data-meu-voto="1"`, fundo claro) e o texto diz o
    estado: "✓ seu voto" **só** com a confirmação do servidor; antes, "enviando…" ou
    "guardado no aparelho" (sem rede, o "✓" dizia que tinha contado). Dá para
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
    `custosFixos`) mostra a linha como antes. **Proteção (D-059):** com
    `mes.protecao > 0`, "· a proteção pagou R$ P" logo depois do "Entrou"
    (`data-protecao` = P, 0 sem ela), e uma linha `.conta-protecao`
    (`data-evitou`) com `historia.fraseDaProtecao(protecaoDoMes, formatar.moeda)`:
    "A proteção pagou R$ 900: auxílio do INSS (MEI). Sem ela, teria faltado
    R$ 900 a mais." Sem proteção no mês, nem o pedaço nem a linha.
  - **Custo da carta** (`.carta-custo`, D-052; no resultado, depois da narrativa
    da carta, e no "último mês" da situação): "O que a carta custou: 20 dias parado
    · renda perdida R$ X · gastos R$ Y", com o `cartaCusto` gravado; cada parte só
    quando é maior que 0, e nenhuma linha se as três forem 0 ou sem `cartaCusto`.
    `data-dias-parado`, `data-renda-perdida` e `data-gastos` repetem os valores.
    Mesma forma para toda carta: a grave não ganha destaque.
  - **Dívida (esquema v2.2):** é o cheque especial (o saldo acumulado negativo)
    **mais** o empréstimo a pagar, por `historia.dividaTotal` a partir dos
    indicadores do fim do mês. No teste de 30/09, o Jonas pegou R$ 1.500 e a tela
    disse "Dívida R$ 1". Sem dívida, sem a linha nem o bloco.
    - Na decisão (`.pressao .divida`, uma linha): "Dívida R$ D · juros de J% ao
      mês" só com cheque especial; com empréstimo, "Dívida R$ D, com R$ E de
      empréstimo".
    - Nas telas de situação, resultado e fim (`div.divida`, com `data-divida`,
      `data-cheque` e `data-emprestimo`): "Dívida hoje R$ D", "Cheque especial R$ C ·
      juros de J% ao mês", "Empréstimo a T% ao mês: fica devendo R$ E em N parcelas" (T de
      `mes.taxaEmprestimo`; sem ela, "Empréstimo: fica devendo…") e "a
      próxima: R$ P · R$ T no total, com os juros" (do `mes` gravado:
      `parcelasRestantes`, `proximaParcela`, `aPagar`); com empréstimo e caixa
      positivo, "Dinheiro em caixa: R$ X".
  - **Empréstimo na conta do mês** (`.conta-emprestimo`, `data-emprestimo`,
    `data-parcela`): "Empréstimo de R$ 1.500: o dinheiro entrou no caixa, mas é
    dívida, e não conta como sobra do mês." e "Parcela do empréstimo R$ 183: R$ 96
    de juros (já na conta) e R$ 87 que abatem a dívida." Também na história.
  - **Telas enxutas (D-065).** Toda tela do jogo no celular começa pelo que se
    explica em aula, e o detalhe fica recolhido (`details.recolhido`, com
    `data-recolhido`, fechado ao chegar e com o marcador "▸ ver / ▾ fechar"; o
    aberto fica lembrado em `app.ui.recolhidos` até o próximo passo, para a
    contagem das equipes não fechá-lo na mão do aluno).
    - **Resumo mês a mês** (`.resumo-meses`, `table.tabela-meses`): colunas "Mês ·
      Saldo do mês · Ficou com", uma linha por mês jogado (`tr[data-rodada]`, o
      rótulo é o título da rodada até os dois-pontos, "Mês 1", por `historia.rotuloDaRodada`).
      **Esquema v3 (D-060):** com `regras.mesesPorRodada` = 2, "Bimestre · Saldo do bimestre · Ficou com",
      uma linha por bimestre ("Jan–fev" … "Nov–dez", 6 no jogo de 12 meses), `aria-label` "Resumo por
      bimestre", inteiro em 360×740 no placar final. O período sai de `historia.periodo` (a regra do telão),
      e as outras telas dizem o mesmo: "Saldo do bimestre" e "A conta do bimestre em detalhe" no resultado,
      "o básico da família custa R$ X no bimestre" na conta (o `mes.basico` já é o do bimestre), "(… no
      bimestre)" na variação dos indicadores, "A história bimestre a bimestre" e, na persona e na situação
      sem rodada, "R$ Y por mês, R$ 2Y no bimestre". Na decisão, só "o básico da família custa R$ 2Y no
      bimestre" (uma linha, pela dobra). Com o placar estimado (`estimado: true`), "Escolha ou sorte?
      (estimado)", "O pior que podia acontecer (pior caso estimado)" (`.pior-caso[data-estimado="1"]`) e a
      nota `.nota-estimado`. "Ficou com" é o
      patrimônio (`historia.patrimonioDe`: saldo acumulado menos empréstimo) e é o
      anterior mais o saldo do mês. Os valores (`.valor-saldo`, `data-sinal` =
      `positivo`|`negativo`|`zero`, os mesmos nomes do telão) vão sempre com o
      sinal, verdes (`--positivo`) se positivos e vermelhos (`--negativo`) se
      negativos, com os tokens do `base.css`, iguais aos do telão (revisão de
      30/09, achado 16: o celular tinha tokens próprios); o zero fica neutro,
      "R$ 0", na cor da letra (o sinal diz o mesmo que a cor, D-016). A dívida de hoje fica no mesmo
      cartão, embaixo. Nos blocos, a história sai de `historia.historiaDaEquipe`
      com os `resultados` do banco (a `telaDoAluno` manda só o último mês).
    - **Situação (blocos):** o resumo e a dívida, inteiros em 360×740 sem rolar (o
      e2e:online confere); o último mês recolhido ("Mês N: a conta em detalhe":
      a conta, `.mes` com a decisão, a carta, o custo e as narrativas); a família
      em uma linha; e os indicadores sem os que são em reais (o saldo acumulado é
      o caixa, que com empréstimo não é o que a família tem). O empréstimo em R$ 0
      nunca aparece na lista de indicadores.
    - **Resultado:** a carta e a narrativa, a decisão em uma linha, o saldo do mês
      em destaque (`.saldo-destaque`, com `data-saldo-mes` e `data-sinal`; no
      vermelho, também a borda grossa), a dívida, a conta recolhida ("A conta do
      mês em detalhe": custo da carta, narrativa da decisão, `.conta-mes`) e
      "Como ficou" (energia e proteção, com a variação do mês).
  - **Limite do cheque especial (D-066, esquema v3.1).** Tudo isto só aparece com `regras.limiteChequeEspecial`
    no config (o `mes` gravado tem `contasAtrasadas`); sem ele, as telas ficam iguais, atributo por atributo.
    - **Dívida** (`div.divida`, nas telas de situação, resultado e fim): o total de `historia.dividaTotal` é o banco e
      o empréstimo, escrito "Dívida no banco R$ D" (revisão da F6c: o mesmo número que o telão chama de dívida; antes,
      "Dívida hoje" somava as contas atrasadas). Na decisão, a linha curta "Dívida R$ D" usa o mesmo D, e as contas atrasadas ficam na situação (numa linha só, elas quebravam em 360 px e empurravam a confirmação do voto para baixo da dobra). "Cheque especial R$ C de R$ L do limite · juros de J% ao mês" (L de
      `regras.limiteChequeEspecial`) e uma parte nova, `.divida-parte[data-parte="atrasadas"]`: "Contas
      atrasadas R$ A · multa de M% e mora de R% ao mês" (`regras.multaAtraso` e `regras.moraMes`), só com A > 0.
      `data-atrasadas` e `data-limite` repetem os valores (só com o limite). Com empréstimo, o "Dinheiro em
      caixa" do resumo é o patrimônio mais o empréstimo **e** as contas atrasadas.
    - **O que faltou na mesa** (`p.faltou-mesa`, `data-faltou-na-mesa` = o acumulado): à parte da dívida (não
      é dívida e não entra no "ficou com"). No resumo (situação, placar final e fim), dentro do cartão, embaixo
      da dívida: "Faltou na mesa: R$ X de comida que não deu para comprar, até agora." (o acumulado da última
      linha); no resultado, à vista depois da dívida, com `data-no-periodo` = o do bimestre: "Faltou na mesa:
      R$ Y de comida que não deu para comprar neste bimestre (R$ X até agora)." (sem o parêntese quando Y = X;
      só o "até agora" quando Y = 0). Nada faltou: sem a linha. A linha do resumo tem `data-faltou-na-mesa` o
      acumulado de cada bimestre.
    - **Conta do bimestre** (`.conta-mes`, recolhida no resultado e na situação): depois do básico, "(R$ F de
      comida não foi comprada)", e depois dos juros, "· multa e mora das contas atrasadas R$ M" (cada pedaço só
      quando é maior que 0), para a linha fechar com o "faltou" (`saldoMes = entrou + protecao − gastos − basico
      + faltouNaMesa − juros − multa − mora`); `data-faltou-na-mesa`, `data-multa` e `data-mora`. Embaixo do
      empréstimo, `.conta-limite` (`data-atrasou`, `data-multa`, `data-mora`, `data-contas-pagas`,
      `data-contas-atrasadas`, `data-divida-banco`) com `historia.fraseDoLimite` ("O limite do cheque especial
      acabou: R$ X de contas ficaram atrasadas (multa de R$ M) e R$ Y de comida não deu para comprar." e/ou
      "Pagou R$ Z de contas atrasadas.") e, com mora, "Mora de R$ R sobre as contas que já estavam atrasadas."
      (a frase do núcleo não diz a mora). Nada disso no bimestre: sem a linha.
    - **História** (placar final e fim): a mesma comida não comprada e a mesma multa e mora na linha de cada
      bimestre, e o `.conta-limite`.
  - **Proteção acima do trabalho (D-067).** No bimestre em que o resultado gravado tem `protecaoAcimaDoTrabalho`
    (`protecaoDoMes.acimaDoTrabalho`), a frase de `historia.fraseAcimaDoTrabalho(protecao, nome da persona, moeda,
    período)`: "Auxílio do INSS (MEI): R$ 6.000, mais do que Rafa ganhava trabalhando num bimestre comum (R$ 5.200)."
    (`data-trabalho-comum`). No resultado, **à vista**, logo abaixo do saldo em destaque (`p.acima-trabalho`), e a
    conta recolhida não a repete; na conta da situação e na história, `p.conta-acima-trabalho`, depois da frase da
    proteção. O "1 salário mínimo" não é escrito pela tela: vem do rótulo do efeito no config ou da fala do
    apresentador.
  - **Antes do primeiro mês**, a situação mostra o básico, a família e os
    indicadores, sem resumo nem conta do mês.
  - **Placar final:** o resumo mês a mês e a dívida no topo; "Escolha ou
    sorte?" contado como história ("Se não mudassem nada · As escolhas · A sorte ·
    = Terminaram com", as variações sempre com + ou −, o total do fim em
    `.placar-total`, igual ao último "Ficou com"), sem "piloto automático" nem
    "efeito das decisões" (D-041); o pior caso; e a história recolhida ("A
    história mês a mês", `data-recolhido="historia"`). A decisão sem voto aparece
    como "ninguém votou: ficou o de sempre".
  - **Fim:** o resumo mês a mês e a dívida (no lugar do "Saldo acumulado" do
    placar, que era o caixa), o pior caso e a história da própria equipe,
    recolhida, mês a mês (`.historia-mes`, com
    `data-rodada`): opção e narrativa (do jeito da persona, D-054), carta e
    narrativa, o custo da carta e a conta do mês ("Entrou · a proteção pagou ·
    gastos · básico · juros · faltou", a proteção só quando pagou) e, no mês em que
    a proteção pagou, a linha `.conta-protecao` (D-059). Carta grave aparece como
    as outras, sem destaque.
- **Wake Lock** só nas telas `enquete`, `decisao` e `prorrogacao`.
- **Faixa "atualize a página"** quando `meta.versaoApp` ≠ `VERSAO_APP`.
- **localStorage** (prefixo `viracao:aluno:`, sem a versão, de propósito: o voto
  guardado pela versão velha é reenviado pela nova): `sala`, `lp` (`?lp=1` é
  lembrado; `?lp=0` esquece) e `pendentes:{S}:{uid}` = `{ [caminho]: pendente }`.
  No sessionStorage, além das marcas da recarga do SDK, `espectador` (a sala do modo espectador, sem o PIN).
- `Viracao.aluno` (só leitura, para o e2e): `versaoApp`, `uid()`, `sala()`,
  `tela()`, `pendentes()`, `envios()` e `espectador()` (`{ equipe }` no modo espectador, ou `null`).

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
  apagadas no começo; o `npm run e2e` (offline) apaga só as dele (`nome-LxA.png` e `estado-salvo.json`), e não
  as do celular (revisão da F7, achado 12 da revisão de conteúdo e legibilidade: apagava a pasta inteira). Além
  da sala de 6 bimestres da fixture v3, uma sala montada pelo núcleo com o **`config.json` real** (6 equipes, 6
  rodadas; pulada se o config não tiver 6 rodadas de 2 meses) põe o celular na equipe que termina mais no
  vermelho e confere o resumo de 6 bimestres com valores de cinco dígitos: os nomes curtos, os valores contra
  `historia.historiaDaEquipe`, nenhum valor quebrado ou cortado, tudo dentro de 360 px e acima de 740 px
  (captura `celular-NN-bimestres-real-placar-final.png`; achado 12: com o config real só se via o resumo de 2
  bimestres). O
  bloco "sem serviço" recebe um `conexao.json` com
  `COLE_AQUI` servido pelo Playwright: o do repositório tem as chaves do projeto real, e
  nenhum passo do e2e pode falar com ele (AGENTS.md, regra 6).
  **Espectador (D-064):** no mês 1, um celular entra por "Sou apresentador": PIN errado recusado (e o pedido fora
  do banco); com o PIN, a tela da equipe 1 com as opções, os rótulos e a contagem iguais às da Ana; o "Votar
  nesta" apagado com o motivo, e nada gravado nem forçando o toque; nem membro nem presença, "3 ativos / 3
  membros" e o "2 de 2" do telão iguais, o `hostUid` intacto e o pedido no banco; troca para a equipe 2 e vê o
  voto da Bia chegar; o resultado da equipe 2; recarregar volta ao campo do PIN, sem virar aluno, e o servidor
  apaga o pedido da página velha; sair apaga o pedido e não guarda a sala. **Esquema v3:** no fim, uma sala de 6
  bimestres montada pelo núcleo (anfitrião no canal-local com a fixture v3, decisões pelo apresentador) e copiada
  para o emulador pelo administrador: o resumo por bimestre (6 linhas, nomes curtos, valor com o sinal e a cor,
  inteiro em 360×740), o placar estimado, a história bimestre a bimestre, o espectador com a tela letra por letra
  igual à do aluno (e as equipes fechadas apagadas no seletor; fechada a equipe vista, ele passa à primeira
  aberta), a decisão com o básico do bimestre e o resultado
  com "Saldo do bimestre" e "no bimestre". Por fim, um espectador reconecta com a confirmação do "apague ao cair"
  segurada pelo teste, a sala é apagada nesse meio-tempo, e o pedido apagado não volta ao banco quando a
  confirmação chega (achado 2).
  **D-066 e D-067:** escrita quando o `config.json` ainda não tinha o limite (hoje tem, desde 01/10); a fixture continua
  porque garante a passagem por todos os casos abaixo sem depender das cartas sorteadas: uma terceira sala de 6 bimestres é montada
  pelo núcleo com a fixture v3.1 (limite de R$ 1.500, multa de 10%, mora de 1% ao mês, valores de teste) e as
  decisões e sementes da sala da fixture v3. Só no e2e, o auxílio do INSS do bimestre 2 sobe para R$ 6.000, acima
  dos R$ 5.200 que o trabalho do Rafa deixa num bimestre comum (o caso da D-067). O teste reprova se a sala deixar
  de passar pelos casos (proteção acima do trabalho e contas pagas, limite estourado com multa e comida cortada,
  mora, o banco parado no limite) e confere: no placar final, o "ficou com" descontando as contas atrasadas, a
  dívida com "de R$ 1.500 do limite" e as contas atrasadas com a multa e a mora, o que faltou na mesa fora da
  dívida, tudo inteiro em 360×740; na história, a conta de cada bimestre (comida não comprada, multa e mora), a
  frase do limite e a da D-067 contra `historia.*`; no resultado de Mar–abr, a frase da D-067 à vista e não
  repetida na conta; no de Jul–ago, a dívida e o que faltou na mesa (do bimestre e até agora) à vista, e a conta
  recolhida com os `data-*`; o espectador com o mesmo resultado, letra por letra; no de Set–out, a mora; e, num
  bloco depois do último bimestre, a situação com o último bimestre recolhido. Capturas `celular-NN-limite-*.png`.
- `e2e/matriz-votos.e2e.mjs` (`npm run e2e:votos`, fora do `check`; teste de 30/09): a sessão inteira do
  roteiro `60min` com o `config.json` real (lido uma vez e servido ao telão; reprova se ele não passa no
  validador), no emulador, com 6 equipes e um celular de 360×740 em cada, mais um na segunda equipe do
  Jonas (o empate). Todo voto é pela tela, com toques (`tap`): tocar na opção e em "Votar nesta", tocar no
  número da enquete. A cada voto confere o retorno à vista no celular (a opção com "✓ seu voto" e "Seu voto
  está nesta." inteiros na tela), o servidor (`decisoes`/`votosEnquete`) e o "k de m decidiram" (ou "n de m
  votaram") do telão; no fim de cada etapa, a apuração (`resultados/{r}` com decisão, origem e contagem;
  `enquetes/{e}/{m}` com histogramas e `n`). Cobre: as 3 rodadas e as 3 enquetes; o voto depois do
  cronômetro em tempo real: a espera vai, pelo relógio do próprio servidor (`{".sv": "timestamp"}` pelo
  administrador do emulador; o do telão e o do celular são estimativas, e o de um celular chegou a errar 22 s
  numa execução com 8 páginas), até 5 s depois do corte que a regra fazia com o prazo antigo (fim do cronômetro
  + graça: 125 s no mês 3, 25 s na prorrogação, 65 s na enquete de entrada), com o cronômetro em "tempo
  esgotado" no celular e no telão; celular recarregado na enquete e nas rodadas, e o que volta da tela
  bloqueada (`visibilitychange`, o ciclo de reconexão) e vota logo em seguida; a pausa (P), com o "Votar
  nesta" apagado e o motivo à vista, e o voto de volta ao retomar; o Ctrl+Z que desfaz a
  abertura do mês 1 e a reabertura (outro `abertoEm`); o Ctrl+Z que desfaz a apuração e o voto mudado depois;
  a prorrogação com só as empatadas; a ordem das opções de cada mês, no celular e no telão; o voto sem rede
  ("enviando" à vista na hora, sem "✓", e contado quando a rede volta) e o voto sem rede que só chega
  depois do fechamento ("guardado no aparelho", depois recusado, com o aviso à vista e fora da apuração);
  o membro regravado no meio do mês 3 (`entrouEm > abertoEm`), com o motivo do botão apagado à vista.
  Revisão de 30/09: o número de rodadas e a equipe do empate vêm do config (pelo menos 3 rodadas; as do meio
  são votadas por todos, e a última é o caso do teste de 30/09); o aluno movido de equipe depois de votar
  (confirmação no telão, aviso no celular, o voto pela equipe nova contado e o da anterior fora da apuração);
  a troca de voto que chega depois do fechamento (o aviso de que valeu o anterior, e o anterior na apuração);
  no termômetro de uma por vez, a resposta sem rede que chega depois do avanço (o aviso nomeando a afirmação,
  que some depois de responder a seguinte, e a resposta fora da apuração); a escrita que falha 5 vezes sem ser
  recusa (falha simulada por um `addInitScript` que embrulha o `canalFirebase.criar`: o aviso e o botão de
  volta); e o voto em trânsito na hora da pausa (guardado e enviado sozinho na retomada). Com o emulador já no
  ar, aberto por outro processo, a matriz avisa que uma queda dele no meio não é defeito do app.
  **Espectador (D-064):** um oitavo celular entra com o PIN no lobby e fica ligado a matriz inteira, nas duas
  sessões (3 e 6 rodadas), sem mudar a contagem do lobby nem o "n de m votaram"; na enquete de entrada, os
  números apagados; em cada rodada (mês 1, mês 2, a prorrogação, as do meio e a última), troca para uma equipe e
  confere a mesma tela e a mesma contagem ao vivo do aluno dela, o "Votar nesta" apagado com o motivo, e que não é
  membro nem manda presença; no fim, sai e o pedido some do banco. O sétimo celular, antes de entrar, passa pelo
  modo espectador, recarrega (volta ao PIN), toca em "Voltar" e entra como aluno; na primeira rodada do meio, o voto
  dele falha sem ser recusa e fica guardado no aparelho, e a recarga tem de voltar à sala e reenviar o voto
  (revisão do voto da F6b, achado 1). Todo o resto da matriz (servidor, telão,
  apuração) continua conferido igual: o voto dos alunos não sente o espectador.
  Capturas `e2e/capturas/votos-*.png`. `--sem-espera` encolhe as esperas longas para depurar o próprio
  teste, e não vale como verificação.
