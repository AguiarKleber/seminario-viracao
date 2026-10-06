# O jogo simples: só o Jonas, 5 opções, sem sorteio

O conteúdo do Jogo da Viração para o seminário de 07/10/2026, como o Kleber
decidiu em 05/10 à noite (D-078): **um personagem só**, o Jonas, para as 6
equipes; **6 bimestres com 5 opções** cada; **sem sorteio**; **o dinheiro na
própria opção**. Arquivo: [`config.json`](../config.json), versão
`2026-10-06-v4-simples` (o hash é o que `npm run validar` imprimir; em 06/10,
`0b49ddc3`). O conteúdo anterior (6 personagens, cartas sorteadas) ficou no git
e congelado em `test/fixtures/config-real-v31.json`.

> **Princípio do Kleber:** "quanto menos explicação do que colocamos, mais
> entendível é o game; é pra ser prático." Cada opção se entende sozinha, pelo
> rótulo, pelo valor e pela linha do custo humano.

## Como se lê o jogo

- **As equipes** aparecem pela cor ("Equipe Laranja"). Todas jogam o mesmo
  Jonas; o que muda entre elas é a combinação de escolhas.
- **Cada opção** mostra a letra, o rótulo, o dinheiro do bimestre ("+R$ 900 no
  bimestre") e, no celular, o custo humano numa linha curta (D-073). Os valores
  são **em relação à jornada de sempre** e arredondados a R$ 10; o valor da tela
  é exatamente o que o jogo cobra.
- **O evento do mês** é igual para todas as equipes (gasolina, IPVA,
  licenciamento, dezembro). Aparece uma vez, no alto do resultado.
- **O que vem depois** de uma escolha (as costas, a moto que quebra, o IPVA já
  pago, a parcela atrasada) aparece no resultado do bimestre em que acontece,
  com o motivo: no telão, uma linha por motivo embaixo das faixas; no celular,
  à vista ("Por causa de antes: …").
- **O número do placar** é o **dinheiro da família**: o que tem na conta menos o
  cheque especial, o empréstimo que falta pagar e as contas atrasadas. Por
  dentro, continuam o cheque especial a 7,43% ao mês até o limite de R$ 2.000, e,
  passado o limite, o aluguel, a luz, a água e o celular atrasam, com multa de
  8% uma vez e mora de 1% ao mês (D-066, D-069, D-070). Em nenhuma das 15.625
  combinações o Jonas chega a cortar comida: o que passa do limite cabe nas
  contas que atrasam.

## O Jonas e a casa (um mês comum)

Motoboy, 34 anos, iFood, moto financiada, Sarandi (Porto Alegre). Mora com a
companheira, que faz faxinas e revende cosméticos, e a filha de 6 anos.
Ninguém com carteira (D-062). As fontes são as do config de 05/10, sem mudança.

| Por mês | R$ | Fonte |
| --- | --- | --- |
| Entregas, já sem a gasolina | +2.680 | IBGE, PNAD Contínua, plataformas digitais 2025 (publ. set/2026), p. 10: motociclista de app, R$ 2.221/mês, 44,9 h/semana, já sem combustível; a parcela da moto foi somada aqui e sai como custo fixo |
| Parcela da moto | −480 | Fipe set/2026 (CG 160 Start, R$ 18.598), 80% em 48× a 1,97% a.m. (BCB, SGS 25471) = R$ 482 |
| Faxinas e revenda da companheira | +1.500 | 8 faxinas × R$ 150 (GetNinjas; Famyle) + R$ 300 de revenda (ABEVD, jan/2026, conta nossa) |
| Básico da casa | −4.092 | comida R$ 2.098 (DIEESE/Conab, cesta de POA ago/2026 × 2,5); aluguel R$ 1.300 (QuintoAndar, Sarandi); luz R$ 162 (CEEE, ANEEL 3.547/2025); água R$ 119 (DMAE); gás R$ 89 (ANP); ônibus da companheira R$ 159 (Prefeitura); celular R$ 75 (estimativa); remédios R$ 90 (estimativa, POF) |
| **Falta num mês comum** | **−392** | **−R$ 784 por bimestre**, antes de qualquer escolha |

## Os seis bimestres

As opções puxadas (mais horas ou noites na rua) estão marcadas com ⚑: duas
seguidas travam as costas (veja "As consequências"). A opção padrão (ninguém
votou) está marcada com *.

### Jan–fev: quanto trabalhar no calor?

**O evento:** 39 °C às 14h, a filha de férias, e o IPVA só tem desconto até
30/01. Gasolina mais cara: **−R$ 30** (ANP, POA: R$ 6,30 e 6,18 contra R$ 6,08 em
2025; 84,5 L por mês, AutoPapo; conta: R$ 28).

| | Opção | Dinheiro | Custo humano | Fonte |
| --- | --- | --- | --- | --- |
| A ⚑ | 12 horas por dia no sol | +R$ 1.040 | 12 h por dia no sol: chega em casa e a filha de férias já dormiu | +20 h por semana a ~53% do ganho-hora (D-024, estimativa da calibragem): R$ 520 × 2 |
| B | Atrasar a parcela da moto | +R$ 480 | O banco liga todo dia, e em março a parcela volta com multa e juros | A parcela de R$ 480 (Fipe e BCB, acima); volta em mar–abr (−R$ 500, abaixo) |
| C * | Jornada de sempre | R$ 0 | Roda no sol como sempre: chega exausto, e a conta segue sem fechar | — |
| D | Parar das 10h às 16h | −R$ 110 | Volta inteiro para a filha, e o pico do almoço fica para quem aguentou o sol | Defesa Civil de POA (08/02/2025); OIT, "Trabalhar num planeta mais quente": 6 dias × 40% do dia × 50% (R$ 107) |
| E | Pagar o IPVA em janeiro | −R$ 330 | Paga a moto adiantado no cheque especial: o ano já começa no vermelho | Sefaz-RS: pagar até 30/01 dá 3% de antecipação (os 22,4% do anúncio somam descontos que valem também no vencimento): R$ 340 × 0,97 = R$ 329,80 |

### Mar–abr: a lei que saiu de pauta

**O evento:** o 99Food chega (17/03/2026), a greve nacional de 14/04 e o PLP 152
sai de pauta (Diário do Transporte e Mobile Time, 14/04/2026). IPVA da moto
**−R$ 340** (Sefaz-RS, vencimento 30/04; 2% de ~R$ 17 mil, valor venal sem fonte)
e gasolina **−R$ 60** (ANP, R$ 6,38 e 6,52; conta: R$ 63).

| | Opção | Dinheiro | Custo humano | Fonte |
| --- | --- | --- | --- | --- |
| A | Parar no dia da greve | −R$ 720 | Uma semana bloqueado depois da greve: em casa, olhando o celular que não toca | 1 dia (−R$ 90) e 1 semana de bloqueio branco (−R$ 630): Abílio (2021), p. 941 e 950; R$ 2.680 × 2 × 7 ÷ 60 (D-072) |
| B ⚑ | Rodar também no 99Food | +R$ 900 | Dois apps apitando ao mesmo tempo: atenção dividida no trânsito o dia todo | +15% do bimestre (estimativa, R$ 804) + bônus de entrada do 99Food (R$ 100, Jornal do Brás); PNAD 2025: 37,5% usam 2 apps ou mais |
| C | Empréstimo de R$ 1.500 | +R$ 1.500 emprestado | 12 parcelas de R$ 183: duas dívidas pagas com a mesma entrega | BCB, SGS 25464: 6,39% a.m.; Price, 12 × R$ 182,76 |
| D * | Aceitar até entrega ruim | +R$ 160 | Aceita até a entrega ruim: mais horas longe da filha para ganhar quase o mesmo | +3% do bimestre (estimativa, R$ 161); regras de recusa do iFood (31/08/2026) e da 99 |
| E | Trocar iFood pelo 99Food | +R$ 100 | Troca de app pelo bônus: começa do zero, sem saber se o pedido vem | 99Food em POA: R$ 250 por 20 corridas, R$ 5 acima do mínimo do iFood (Jornal do Brás, 23/03/2026). **Estimativa sem fonte:** que o volume no 99Food seja o mesmo |

**O empréstimo é dívida, e não renda (D-065).** A opção mostra "+R$ 1.500
emprestado": o dinheiro entra na conta e a dívida também, e por isso nem o saldo
do bimestre nem o dinheiro da família mudam no dia. Daí em diante, duas parcelas
por bimestre (R$ 366); os juros delas pesam no saldo, e a parte que abate a dívida
não. No fim do ano ainda faltam 4 parcelas (o placar conta o que falta pagar).

### Mai–jun: chuva, frio e o Guaíba

**O evento:** chove forte, o Guaíba sobe e o frio chega; na enchente de 2024, só
66% dos entregadores trabalharam. Gasolina **−R$ 30** (ANP, R$ 6,25 e 6,21; conta:
R$ 26).

| | Opção | Dinheiro | Custo humano | Fonte |
| --- | --- | --- | --- | --- |
| A | Pneu novo antes da chuva | −R$ 230 | Pneu novo na chuva: freia sem medo, e o dinheiro sai do mercado | Pneu traseiro R$ 228 (lojas, B); dura de 15 a 20 mil km, e a moto roda 6.760 km por bimestre (Sindimoto-SP via AutoPapo): 13.520 km no fim de abril; pneu careca é infração grave (CTB, art. 230, XVIII) |
| B | Parar nos dias de alerta | −R$ 180 | Fica em casa no alerta laranja: a filha dorme sabendo que o pai está seco | 2 dias de alerta de temporal (INMET; a carta "Temporal" do config de 05/10): 2 × R$ 89,33 |
| C ⚑ | Rodar de madrugada | +R$ 800 | Rodando de madrugada na chuva: a companheira acordada esperando a moto | +15% do bimestre (estimativa, R$ 804); promoção de chuva de R$ 3 a R$ 12 por entrega (Metrópoles, 01/08/2025) |
| D * | Jornada de sempre | R$ 0 | Roda molhado do almoço ao jantar e chega em casa gelado, como todo inverno | — |
| E | Comprar capa, bota e luva | −R$ 280 | O dinheiro da roupa sai do mercado, e ele chega seco em casa pela primeira vez | Kit de R$ 262,99 a R$ 278,90 (Mercado Livre, set/2026, B) |

### Jul–ago: a regra nova do app

**O evento:** o iFood lança o +Entregas; protesto em 27/07 (CUT-RS); o
licenciamento vence em 31/07: **−R$ 110** (Detran-RS via AutoPapo, R$ 114,09).

| | Opção | Dinheiro | Custo humano | Fonte |
| --- | --- | --- | --- | --- |
| A ⚑ | Entrar no +Entregas | +R$ 540 | +Entregas: 12 horas na rua, sete dias, e a filha só o vê de capacete | O iFood diz +10% a +30%; usado +10% (CUT-RS, 27/07/2026): R$ 536 |
| B | Ir ao protesto de 27/07 | −R$ 670 | Do protesto para uma semana bloqueado: a filha estranha o pai em casa de dia | Meio dia (−R$ 40) e 1 semana de bloqueio branco (−R$ 630, D-072) |
| C * | Adiar a revisão da moto | +R$ 100 | Adia a revisão e roda com a moto pedindo socorro, atento a cada barulho | Metade de um mês da manutenção de R$ 200 (Sindimoto-SP via AutoPapo); a moto quebra em set–out (abaixo) |
| D | Tirar uma semana de folga | −R$ 630 | Uma semana inteira com a filha, paga com o dinheiro que não entra | 7 dias do bimestre: R$ 625,33 |
| E | Pegar promoções da noite | +R$ 310 | Noites de inverno na rua atrás do bônus, e o jantar em casa sem ele | iFood, "Entenda as mecânicas… de cada tipo de promoção" (2026): R$ 30 por ficar ativo das 18h às 21h59; 4 noites por mês × R$ 30 a 48 |

### Set–out: breque geral

**O evento:** breque nacional em 1º/09 (R$ 10 por corrida curta e fim do
+Entregas; Metrópoles, 01/09/2026); o concorrente paga até R$ 9 a mais a quem
furar; a Farroupilha lota o Harmonia. Sem efeito em dinheiro igual para todos.

| | Opção | Dinheiro | Custo humano | Fonte |
| --- | --- | --- | --- | --- |
| A * | Jornada de sempre | R$ 0 | Nem para nem fura: segue cansado, longe da filha, como em todo bimestre | — |
| B | Recusar o que não paga | −R$ 270 | Recusa o que não paga, e o celular passa horas em silêncio na esquina | −5% do bimestre (estimativa, R$ 268); 99: <70% de corridas = 5, 10, 15 dias fora; iFood: 7 recusas = 15 min fora |
| C | Parar no dia do breque | −R$ 720 | Para no breque com o país, e o app responde com uma semana de bloqueio | 1 dia (−R$ 90) e 1 semana de bloqueio branco (−R$ 630, D-072) |
| D ⚑ | Furar o breque pelo bônus | +R$ 820 | Fura o breque e roda toda noite da Farroupilha: vira o fura-greve da quadra | Bônus de até R$ 9 × ~17 entregas (Metrópoles e Correio Braziliense) = R$ 150 + Farroupilha, +25% de um mês (estimativa) = R$ 670 |
| E | Folgar no 20 de Setembro | −R$ 90 | Um dia no Acampamento com a filha, e o feriado cheio de pedidos fica para outro | Feriado estadual (Lei RS 4.850/1964); 1 dia do bimestre |

### Nov–dez: Natal e nenhum 13º

**O evento:** dezembro tem 16% mais pedidos: **+R$ 430** (iFood, release de
30/10/2023; renda proporcional, conta nossa); a luz pode subir 24%: **−R$ 40**
(Sul21, CEEE, em consulta pública). Quem tem carteira recebe o 13º até 20/12;
nesta casa, ninguém.

| | Opção | Dinheiro | Custo humano | Fonte |
| --- | --- | --- | --- | --- |
| A | Cortar comida e remédio | +R$ 170 | Corta carne e fruta: a filha de 6 anos come pior no fim do ano | ~4% da comida da casa nos 2 meses (estimativa, R$ 168); Ação da Cidadania/UFRJ 2024: 32% dos entregadores em insegurança alimentar |
| B ⚑ | Sem folga até o Natal | +R$ 1.040 | Trabalha até a véspera do Natal: a filha passa as férias sem o pai acordado | O mesmo +20 h por semana de jan–fev (D-024) |
| C | Folgar na semana do Natal | −R$ 630 | Uma semana de Natal com a filha, e a semana mais cheia do ano vai para outro | 7 dias do bimestre |
| D * | Jornada de sempre | R$ 0 | Rotina de sempre até o fim do ano, sem 13º e sem um dia a mais com a filha | — |
| E | Temporário com carteira | −R$ 1.230 | Carteira por dois meses: horário fixo, 13º e férias, e menos dinheiro no fim | A conta abaixo |

**A conta do temporário** (a mesma base da linha "Jonas com carteira assinada"):
CAGED ago/2025–jul/2026, salário-base médio de motoboy R$ 1.763,45 + 30% de
periculosidade (Lei 12.997/2014) = R$ 2.292,49; líquido R$ 2.110,48 (INSS 2026,
IR isento). Dois meses: R$ 4.220,96. Na saída: 13º proporcional de 2/12
(Constituição, art. 7º, VIII; Lei 4.090/1962), líquido R$ 351,74, e férias
proporcionais com 1/3 (Lei 6.019/1974, art. 12, c), R$ 509,44. Menos a manutenção
da moto, que com carteira sai do salário (R$ 261 por mês): R$ 4.560,14. O app no
mesmo bimestre: R$ 5.360 + R$ 430 de dezembro = R$ 5.790. Diferença: −R$ 1.229,86.
O FGTS (R$ 367 nos 2 meses) vai para a conta vinculada, não para o caixa. **Que a
vaga exista:** Asserttem (via Fetracom, 2025), 535 mil temporários no fim de 2025;
não achei o número de vagas de motoboy temporário (estimativa sem fonte).

## As consequências (sempre, sem sorteio)

No jogo, **elas sempre acontecem**. É simplificação, e o apresentador diz isso:
na vida, são risco. Contando o bloqueio, são 5 no ano.

| | Gatilho | Quando | Efeito | Fonte |
| --- | --- | --- | --- | --- |
| K1 | Parar na greve, ir ao protesto ou parar no breque | No mesmo bimestre | 1 semana sem pedidos: −R$ 630 (já está no valor da opção) | D-072; Abílio (2021), p. 941 e 950; a semana é estimativa (a fonte diz que o prazo não é claro) |
| K2 | **Duas opções puxadas seguidas** (⚑ num bimestre e ⚑ no seguinte) | No bimestre da segunda | **As costas travam:** 7 dias parado (−R$ 630) e 4 sessões de fisioterapia (−R$ 600) = **−R$ 1.230** | Carta "Dor" do config de 05/10: Souza et al. (Physis, 2024); Doctoralia POA, R$ 120 a R$ 320 a sessão (4 × R$ 150). O "sempre, na segunda seguida" é estimativa sem fonte (regra decidida pelo Kleber) |
| K3 | Pagar o IPVA em janeiro (jan–fev E) | Mar–abr | O IPVA não vence de novo: +R$ 340 | Sefaz-RS (um IPVA por ano) |
| K4 | Atrasar a parcela da moto (jan–fev B) | Mar–abr | A parcela volta com multa de 2%, mora de 1% e um mês dos juros do contrato (1,97%): −R$ 500 | CDC, art. 52, § 1º; BCB SGS 25471; R$ 480 × 1,0497 = R$ 503,86. Com parcela atrasada, o banco pode pedir a moto (Decreto-Lei 911/1969) |
| K5 | Adiar a revisão (jul–ago C, o padrão) | Set–out | **A moto quebra:** 3 dias parado (−R$ 270) e relação e pneu (−R$ 520) = −R$ 790; com o pneu trocado em mai–jun (A), só a relação (−R$ 290) = −R$ 560 | Carta "A moto quebrou" do config de 05/10: relação R$ 294 + pneu R$ 228 (lojas, B); a moto roda 6.760 km por bimestre (Sindimoto-SP via AutoPapo) |

O crédito pessoal (mar–abr C) não é consequência: é a dívida da tabela Price,
que o motor cobra nos bimestres seguintes (D-065).

## Os números (as 15.625 combinações, no motor do jogo)

Sem sorteio, cada combinação de escolhas tem um resultado só, e o motor joga
todas: `npm run combinacoes` (cerca de 0,1 s; o validador, seção l, dá o total,
as que fecham, a melhor e a pior; o telão conta no navegador em ~0,15 s).

| Medida | Resultado |
| --- | --- |
| Fecham o ano (dinheiro da família ≥ R$ 0) | **Nenhuma** das 15.625 |
| Melhor combinação | **A-D-C-E-D-A: devendo R$ 2.429** (12 h no sol, aceitar até entrega ruim, madrugada na chuva, promoções da noite, furar o breque, cortar comida e remédio) |
| Pior combinação | **D-A-E-C-C-E: devendo R$ 10.906** (R$ 2.000 de cheque especial e R$ 8.906 de contas atrasadas) |
| Mediana / média | −R$ 7.084 / −R$ 7.074 |
| Percentis | 10%: −R$ 8.793 · 25%: −R$ 7.990 · 75%: −R$ 6.196 · 90%: −R$ 5.372 |
| Jornada de sempre o ano todo (os padrões, C-D-D-C-A-D) | −R$ 7.294, 8.751º de 15.625 |
| Acima de −R$ 3.000 / −R$ 4.000 / −R$ 5.000 | 16 / 161 / 876 combinações |
| Comida cortada | Nenhuma combinação (o que passa do limite cabe nas contas que atrasam) |
| "Jonas com carteira assinada" (a linha do placar) | −R$ 15.498: abaixo das 15.625 combinações (veja "Para o Kleber") |

**A média de cada opção** (o fim do ano de quem a escolheu, nas 3.125
combinações que a contêm) e **em quantas das 3.125 combinações das outras
rodadas ela é a melhor do bimestre**:

| Bimestre | A | B | C | D | E | Melhor em |
| --- | --- | --- | --- | --- | --- | --- |
| Jan–fev | −6.069 | −7.220 | −7.290 | −7.448 | −7.342 | A 2.500 · B 625 |
| Mar–abr | −7.890 | −6.472 | −7.273 | −6.829 | −6.905 | B 2.000 · D 1.125 |
| Mai–jun | −7.219 | −7.212 | −6.608 | −7.001 | −7.327 | C 2.000 · D 1.125 |
| Jul–ago | −6.663 | −7.474 | −7.428 | −7.429 | −6.373 | A 2.000 · E 1.125 |
| Set–out | −6.910 | −7.207 | −7.702 | −6.540 | −7.009 | D 2.000 · A 1.125 |
| Nov–dez | −6.693 | −6.036 | −7.557 | −6.876 | −8.205 | B 2.500 · A 625 |

**Nenhuma opção domina em dinheiro**: a melhor de cada bimestre depende do resto
do caminho. Sem a regra das costas, a opção puxada era a melhor em todas as
combinações, em todos os bimestres (no rascunho de 05/10, seção 5, ainda com o MEI
e a associação); com ela, o melhor plano alterna esforço e respiro. Na média, a puxada ainda é a melhor em 5
dos 6 bimestres (em jul–ago, são as promoções da noite): o validador avisa isso
como "dominante" (seção c), porque o critério dele é a média. Também: o crédito
(mar–abr C) termina, em média, R$ 444 abaixo do padrão (o empréstimo é dívida, e
os juros pesam); adiar a revisão (jul–ago C, o padrão) é das piores de jul–ago
(R$ 790 de quebra por R$ 100 de alívio).

**As consequências nas combinações:** as costas travam em 625 combinações por
bimestre (de mar–abr a nov–dez); a moto quebra em 3.125 (2.500 com o pneu velho,
625 com o novo); o IPVA já pago e a parcela atrasada, em 3.125 cada.

**Avisos do validador** (9, nenhum erro): (c) a opção de maior média é
"dominante" pelo critério da média em cada bimestre (A, B, C, E, D, B; nenhuma é a
melhor em todas as combinações, acima); (e) as decisões explicam 100% da variância
(não há sorteio: era o esperado); (g) nenhum caminho fecha o básico (a D-050
pedia "quase ninguém", e não "ninguém") e nenhuma persona fecha entre 5% e 10% (a
meta da D-058). Os dois de (g) vêm da regra das costas, que o Kleber decidiu
manter sabendo disso (D-078).

## Para o Kleber

1. **Nenhuma combinação fecha o ano.** Com a regra das costas, a melhor termina
   devendo R$ 2.429. É o que o rascunho de 05/10 (seção 5) já dizia ao propor a
   regra, e a placa do placar fica "Das 15.625 combinações possíveis, nenhuma
   fecha o ano". Fica registrado na D-078 que a D-050 e a D-058 deixam de valer no
   jogo simples. Se preferir que uma ou outra feche, a mudança tem de ter fonte
   (não dá para subir um valor só para fechar).
2. **A linha "Jonas com carteira assinada" (−R$ 15.498) fica abaixo de todas as
   15.625 combinações do Jonas de app**, até da pior (−R$ 10.906). Com carteira,
   ele leva R$ 2.110 líquidos e paga a manutenção da moto; no app, R$ 2.680 já
   sem a manutenção. A D-070 manteve a linha, com a fala do que ela não mede
   (INSS, FGTS, férias, auxílio-doença, horas). Agora a comparação inverte de
   vez a leitura; fica, ou sai do placar?
3. **As duas opções novas**, no lugar do MEI e da associação: "Atrasar a parcela
   da moto" (jan–fev B) e "Pneu novo antes da chuva" (mai–jun A). As sugestões
   de "noites num restaurante" não entraram: o único valor achado (diária de
   ~R$ 50 por noite mais a taxa da entrega) vem de blogs de sistemas para
   restaurante, e a conta dependia de quantas entregas por noite (sem fonte).
4. **O empréstimo aparece como "+R$ 1.500 emprestado"** e não muda o dinheiro da
   família no dia (é dívida, D-065). Na sala, vale dizer: "o dinheiro entrou, e
   a dívida também".
5. **O 13º do temporário** (nov–dez E) usa a Constituição, art. 7º, VIII, e a
   Lei 4.090/1962 (o temporário é empregado da empresa de trabalho temporário); a
   Lei 6.019 lista as férias, e não o 13º.

## Onde mexer

- **Os valores e os textos:** `config.json` (como-editar-config.md, seção
  `regras.formatoSimples`). O valor da opção é a soma dos efeitos diretos dela;
  o que vem depois vai nos `efeitosGerais` do bimestre seguinte, com
  `decidiu`, e o rótulo até os dois-pontos é o motivo que a tela mostra ("as
  costas travaram (2 puxadas seguidas): 7 dias parado").
- **Conferir:** `npm run validar` (sem erros), `npm run combinacoes` (os números
  acima), `npm test` (o `test/jogo-simples.test.mjs` confere o config do dia com
  o motor) e `npm run e2e` (o telão, inclusive com o config do dia);
  `npm run e2e:online:dia` (com celulares, no emulador).
