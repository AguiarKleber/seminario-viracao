# O jogo simples: só o Jonas, 5 opções às cegas, sem sorteio

O conteúdo do Jogo da Viração para o seminário de 07/10/2026. O formato é o que
o Kleber decidiu em 05/10 à noite (D-078): **um personagem só**, o Jonas, para
as 6 equipes; **6 bimestres com 5 opções** cada; **sem sorteio**. Com os
pedidos de 06/10 de manhã (D-079), **as opções ficam às cegas** (sem o dinheiro
ao lado), cada uma com uma **mini-história**, e depois do resultado de cada
bimestre vem **uma tela de dados reais** do tema dele. Arquivo:
[`config.json`](../config.json), versão `2026-10-06-v4.1-simples` (o hash é o
que `npm run validar` imprimir; em 06/10, depois dos ajustes de tela,
`c4f99ae7`). O conteúdo de 6
personagens, com cartas sorteadas, ficou no git e congelado em
`test/fixtures/config-real-v31.json`.

> **Princípio do Kleber:** "quanto menos explicação do que colocamos, mais
> entendível é o game; é pra ser prático." Cada opção se entende sozinha, pelo
> rótulo e pela mini-história.

## Como se lê o jogo

- **As equipes** aparecem pela cor ("Equipe Laranja"). Todas jogam o mesmo
  Jonas; o que muda entre elas é a combinação de escolhas.
- **Cada opção** mostra a letra, o rótulo e a **mini-história** (o campo
  `narrativa`): o que é, por quê e o que impacta, numa frase de até 111
  caracteres. No telão, ela corre na mesma linha do rótulo, depois de um
  travessão, e cada opção cabe em duas linhas em 1024×768 (cinco mini-histórias
  e a situação de quatro bimestres foram encurtadas em 06/10 para caber, sem
  tirar fato nem fonte). **O dinheiro não aparece na opção** (às cegas, D-079): ele aparece
  no resultado, no saldo do bimestre. No celular, a opção traz também a linha do
  custo humano (D-073). Os valores das tabelas abaixo são para o apresentador:
  em relação à jornada de sempre, arredondados a R$ 10.
- **O evento do mês** é igual para todas as equipes (gasolina, IPVA,
  licenciamento, dezembro) e aparece uma vez, no alto do resultado.
- **O que vem depois** de uma escolha (as costas, a moto que quebra, o IPVA já
  pago, a parcela atrasada) aparece no resultado do bimestre em que acontece,
  com o motivo.
- **Depois do resultado, os dados do tema** do bimestre (seção "Os blocos de
  dados"): um contexto de uma ou duas frases e até 3 números com fonte.
- **O número do placar** é o **dinheiro da família**: o que tem na conta menos o
  cheque especial, o empréstimo que falta pagar e as contas atrasadas. Por
  dentro, continuam o cheque especial a 7,43% ao mês até o limite de R$ 2.000,
  e, passado o limite, o aluguel, a luz, a água e o celular atrasam, com multa de
  8% uma vez e mora de 1% ao mês (D-066, D-069, D-070). Em nenhuma das 15.625
  combinações a comida é cortada (o "faltou na mesa" seria sempre R$ 0, e por
  isso não aparece).

## O Jonas e a casa (um mês comum)

Motoboy, 34 anos, iFood, moto financiada, Sarandi (Porto Alegre). Mora com a
companheira, que faz faxina duas vezes por semana e revende cosméticos, e a
filha de 6 anos. Ninguém com carteira (D-062). Três valores foram recontados em
06/10 (D-079), marcados com ✱.

| Por mês | R$ | Fonte |
| --- | --- | --- |
| Entregas, já sem a gasolina | +2.680 | IBGE, PNAD Contínua, plataformas digitais 2025 (publ. set/2026), p. 10: motociclista de app, R$ 2.221/mês, 44,9 h/semana, já sem combustível; a parcela da moto foi somada aqui e sai como custo fixo |
| Parcela da moto | −480 | Fipe set/2026 (CG 160 Start, R$ 18.598), 80% em 48× a 1,97% a.m. (BCB, SGS 25471) = R$ 482 |
| Faxinas e revenda da companheira ✱ | +1.600 | Duas faxinas por semana × R$ 150 (GetNinjas; Famyle): 2 × 52 ÷ 12 = 8,67 por mês, R$ 1.300 (eram 8, o mês arredondado para 4 semanas) + R$ 300 de revenda (ABEVD, jan/2026, conta nossa) |
| Básico da casa | −3.928 | comida R$ 2.098 (DIEESE/Conab, cesta de POA ago/2026 × 2,5); aluguel ✱ R$ 1.200 (QuintoAndar: o piso da faixa do Sarandi, R$ 1.192; era R$ 1.300 na mesma faixa); luz R$ 162 (CEEE, ANEEL 3.547/2025); água R$ 119 (DMAE); gás R$ 89 (ANP); ônibus da companheira ✱ R$ 95 (a ida e a volta das faxinas, 18 passagens de R$ 5,30; eram 30, sem conta); celular R$ 75 (estimativa); remédios R$ 90 (estimativa, POF) |
| **Falta num mês comum** | **−128** | **−R$ 256 por bimestre**, antes de qualquer escolha (antes da D-079, −R$ 392) |

## Os seis bimestres

As opções puxadas (mais horas ou noites na rua) estão marcadas com ⚑: duas
seguidas travam as costas (veja "As consequências"). A opção padrão (ninguém
votou) está marcada com *. A coluna "Dinheiro" não aparece na tela da decisão.

### Jan–fev: quanto trabalhar no calor?

**O evento:** 39 °C às 14h, a filha de férias, e o IPVA só tem desconto até
30/01. Gasolina mais cara: **−R$ 30** (ANP, POA: R$ 6,30 e 6,18 contra R$ 6,08 em
2025; 84,5 L por mês, AutoPapo; conta: R$ 28).

| | Opção | Mini-história (na tela) | Dinheiro | Custo humano (celular) | Fonte do valor |
| --- | --- | --- | --- | --- | --- |
| A ⚑ | 12 horas por dia no sol | Rodar 12 horas por dia, sete dias, no calor de 39 °C: mais entregas, menos sono e quase nada de casa. | +R$ 1.040 | 12 h por dia no sol: chega em casa e a filha de férias já dormiu | +20 h por semana a ~53% do ganho-hora (D-024, estimativa da calibragem): R$ 520 × 2 |
| B | Atrasar a parcela da moto | Empurrar a parcela da moto de fevereiro para março: alivia agora, volta com multa e juros e arrisca a moto. | +R$ 480 | O banco liga todo dia, e em março a parcela volta com multa e juros | A parcela de R$ 480; volta em mar–abr (−R$ 500, K4) |
| C * | Jornada de sempre | Manter as cerca de 45 horas por semana de sempre, no sol, sem esticar e sem parar nos dias mais quentes. | R$ 0 | Roda no sol como sempre: chega exausto, e a conta segue sem fechar | PNAD 2025: 44,9 h por semana |
| D | Parar das 10h às 16h | A Defesa Civil pede para evitar esforço das 10h às 16h no calor: parar poupa o corpo e perde o pico do almoço. | −R$ 110 | Volta inteiro para a filha, e o pico do almoço fica para quem aguentou o sol | Defesa Civil de POA (08/02/2025); OIT: 6 dias × 40% do dia × 50% (R$ 107) |
| E | Pagar o IPVA em janeiro | O IPVA da moto tem desconto se pago até 30/01: pagar agora sai do cheque especial, que cobra juros todo mês. | −R$ 330 | Paga a moto adiantado no cheque especial: o ano já começa no vermelho | Sefaz-RS: 3% de antecipação; R$ 340 × 0,97 (volta +R$ 340 em mar–abr, K3) |

### Mar–abr: a lei que saiu de pauta

**O evento:** o 99Food chega (17/03/2026), a greve nacional de 14/04 e o PLP 152
sai de pauta (Diário do Transporte e Mobile Time, 14/04/2026). IPVA da moto
**−R$ 340** (Sefaz-RS, vencimento 30/04; 2% de ~R$ 17 mil, valor venal sem fonte)
e gasolina **−R$ 60** (ANP, R$ 6,38 e 6,52; conta: R$ 63).

| | Opção | Mini-história (na tela) | Dinheiro | Custo humano (celular) | Fonte do valor |
| --- | --- | --- | --- | --- | --- |
| A | Parar no dia da greve | 14/04: greve nacional contra a lei dos apps, que fixava R$ 8,50 por entrega e não R$ 10; quem para arrisca bloqueio. | −R$ 540 | Cinco dias bloqueado depois da greve: em casa, olhando o celular que não toca | 1 dia (−R$ 90) e 5 dias de bloqueio branco (−R$ 450, K1) |
| B ⚑ | Rodar também no 99Food | O 99Food chegou com bônus de entrada: rodar nos dois apps rende mais e divide a atenção no trânsito. | +R$ 900 | Dois apps apitando ao mesmo tempo: atenção dividida no trânsito o dia todo | +15% do bimestre (estimativa, R$ 804) + bônus de entrada (R$ 100, Jornal do Brás) |
| C | Pegar um empréstimo | Crédito pessoal a 6,39% ao mês, em 12 parcelas: o dinheiro entra agora, e a dívida passa do fim do ano. | dívida (D-065): +R$ 1.500 | 12 parcelas: duas dívidas pagas com a mesma entrega | BCB, SGS 25464: 6,39% a.m.; Price, 12 × R$ 182,76 |
| D * | Aceitar até entrega ruim | O app manda menos pedidos para quem recusa: aceitar até a entrega longa e barata para não sumir da fila. | +R$ 160 | Aceita até a entrega ruim: mais horas longe da filha para ganhar quase o mesmo | +3% do bimestre (estimativa, R$ 161); regra de recusa do iFood (7 seguidas = 15 minutos fora) |
| E | Trocar iFood pelo 99Food | Largar o iFood pelo bônus do 99Food: paga mais por corrida, sem saber quantos pedidos virão. | +R$ 100 | Troca de app pelo bônus: começa do zero, sem saber se o pedido vem | R$ 5 acima do mínimo do iFood em 20 corridas (Jornal do Brás). **Estimativa sem fonte:** o mesmo volume |

**O empréstimo é dívida, e não renda (D-065).** O dinheiro entra na conta e a
dívida também; daí em diante, duas parcelas por bimestre (R$ 366), e no fim do
ano ainda faltam 4 (o placar conta o que falta pagar).

### Mai–jun: chuva, frio e o Guaíba

**O evento:** chove forte, o Guaíba sobe e o frio chega. Gasolina **−R$ 30** (ANP,
R$ 6,25 e 6,21; conta: R$ 26).

| | Opção | Mini-história (na tela) | Dinheiro | Custo humano (celular) | Fonte do valor |
| --- | --- | --- | --- | --- | --- |
| A | Pneu novo antes da chuva | O pneu traseiro está quase no fim, com 13 mil km: na chuva, pneu careca derrapa e é multa grave; trocar custa agora. | −R$ 230 | Pneu novo na chuva: freia sem medo, e o dinheiro sai do mercado | Pneu traseiro R$ 228 (lojas, B); 6.760 km por bimestre (Sindimoto-SP via AutoPapo); CTB, art. 230, XVIII |
| B | Parar nos dias de alerta | O INMET avisa alerta laranja de temporal, com vento de 100 km/h: ficar em casa é seguro e são dias sem ganho. | −R$ 180 | Fica em casa no alerta laranja: a filha dorme sabendo que o pai está seco | INMET via O Tempo (27/09/2026); 2 × R$ 89,33 |
| C ⚑ | Rodar de madrugada | Com chuva, o app paga promoção por entrega: rodar até de madrugada rende mais, no frio e no escuro. | +R$ 800 | Rodando de madrugada na chuva: a companheira acordada esperando a moto | +15% do bimestre (estimativa); promoção de chuva de R$ 3 a R$ 12 (Metrópoles, 01/08/2025) |
| D * | Jornada de sempre | Rodar do almoço ao jantar como sempre, molhado e com frio, com a capa velha e sem parar no temporal. | R$ 0 | Roda molhado do almoço ao jantar e chega em casa gelado, como todo inverno | — |
| E | Comprar capa, bota e luva | Kit de chuva para moto (capa, bota, luva e balaclava): chega seco e protegido, com dinheiro que sai do mercado. | −R$ 280 | O dinheiro da roupa sai do mercado, e ele chega seco em casa pela primeira vez | R$ 262,99 a R$ 278,90 (Mercado Livre, set/2026, B) |

### Jul–ago: a regra nova do app

**O evento:** o iFood lança o +Entregas; protesto em 27/07 (CUT-RS); o
licenciamento vence em 31/07: **−R$ 110** (Detran-RS via AutoPapo, R$ 114,09).

| | Opção | Mini-história (na tela) | Dinheiro | Custo humano (celular) | Fonte do valor |
| --- | --- | --- | --- | --- | --- |
| A ⚑ | Entrar no +Entregas | O iFood promete mais ganho e quase não aceita recusa; entregadores dizem que paga R$ 3 por entrega. | +R$ 540 | +Entregas: 12 horas na rua, sete dias, e a filha só o vê de capacete | O iFood diz +10% a +30%; usado +10% (CUT-RS, 27/07/2026) |
| B | Ir ao protesto de 27/07 | 27/07: entregadores marcham no Centro contra o +Entregas; quem vai perde meio dia e arrisca o bloqueio. | −R$ 490 | Do protesto para cinco dias bloqueado: a filha estranha o pai em casa de dia | Meio dia (−R$ 40) e 5 dias de bloqueio branco (−R$ 450, K1) |
| C * | Adiar a revisão da moto | A revisão da moto está vencida, com 20 mil km no ano: adiar alivia o mês e deixa a moto mais perto de quebrar. | +R$ 100 | Adia a revisão e roda com a moto pedindo socorro, atento a cada barulho | Metade de um mês da manutenção de R$ 200 (Sindimoto-SP); a moto quebra em set–out (K5) |
| D | Tirar uma semana de folga | A primeira semana de descanso do ano: no app não há férias pagas, e cada dia parado é um dia sem ganho. | −R$ 630 | Uma semana inteira com a filha, paga com o dinheiro que não entra | 7 dias do bimestre: R$ 625,33 |
| E | Pegar promoções da noite | O iFood paga bônus a quem fica online das 18h às 22h: a jornada gira em torno do horário que o app quer. | +R$ 310 | Noites de inverno na rua atrás do bônus, e o jantar em casa sem ele | iFood (2026): R$ 30 por ficar ativo das 18h às 21h59; 4 noites por mês |

### Set–out: breque geral

**O evento:** breque nacional em 1º/09 (R$ 10 por corrida curta e fim do
+Entregas; Metrópoles, 01/09/2026); o concorrente paga até R$ 9 a mais a quem
furar; a Farroupilha lota o Harmonia. Sem efeito em dinheiro igual para todos.

| | Opção | Mini-história (na tela) | Dinheiro | Custo humano (celular) | Fonte do valor |
| --- | --- | --- | --- | --- | --- |
| A * | Jornada de sempre | Nem parar nem furar: seguir a rotina no mês do breque geral e do Acampamento Farroupilha. | R$ 0 | Nem para nem fura: segue cansado, longe da filha, como em todo bimestre | — |
| B | Recusar o que não paga | Recusar o pedido que não cobre o custo da moto: o app passa a mandar menos chamadas para quem recusa. | −R$ 270 | Recusa o que não paga, e o celular passa horas em silêncio na esquina | −5% do bimestre (estimativa); regra de recusa do iFood (7 seguidas = 15 minutos fora) |
| C | Parar no dia do breque | 01/09: breque geral por R$ 10 por corrida curta e o fim do +Entregas; quem para perde o dia e arrisca bloqueio. | −R$ 540 | Para no breque com o país, e o app responde com cinco dias de bloqueio | 1 dia (−R$ 90) e 5 dias de bloqueio branco (−R$ 450, K1) |
| D ⚑ | Furar o breque pelo bônus | Furar o breque pelo bônus do concorrente e rodar as noites da Farroupilha: rende e queima com os colegas. | +R$ 820 | Fura o breque e roda toda noite da Farroupilha: vira o fura-greve da quadra | Bônus de até R$ 9 × ~17 entregas (Metrópoles; Correio Braziliense) + Farroupilha, +25% de um mês (estimativa) |
| E | Folgar no 20 de Setembro | Feriado com o Acampamento Farroupilha cheio: um dia com a filha, e os pedidos vão para outro. | −R$ 90 | Um dia no Acampamento com a filha, e o feriado cheio de pedidos fica para outro | Feriado estadual (Lei RS 4.850/1964); 1 dia do bimestre |

### Nov–dez: Natal e nenhum 13º

**O evento:** dezembro começa com 16% mais pedidos: **+R$ 430** (iFood, release
de 30/10/2023: os 12 primeiros dias de dezembro de 2022 contra a média dos meses
anteriores; estender os 16% ao mês inteiro e à renda é estimativa sem fonte); a luz pode subir 24%: **−R$ 40**
(Sul21, CEEE, em consulta pública). Quem tem carteira recebe o 13º até 20/12;
nesta casa, ninguém.

| | Opção | Mini-história (na tela) | Dinheiro | Custo humano (celular) | Fonte do valor |
| --- | --- | --- | --- | --- | --- |
| A | Pedir ajuda à família (nova, D-079) | Sem 13º no Natal, pedir à mãe aposentada uma ajuda para o mercado: sem INSS nem carteira, a rede é a família. | +R$ 300 | A mãe aposentada ajuda no Natal: a conta respira, e o orgulho pesa | **Estimativa sem fonte do valor:** a mãe, aposentada com 1 salário mínimo (R$ 1.621, Decreto 12.797/2025), dá R$ 300, menos de um quinto do que recebe. UFBA (Siqueira et al., 2025): entre os entregadores que se afastaram depois de um acidente, a ajuda da família foi o apoio mais citado (38,3%) |
| B ⚑ | Sem folga até o Natal | Dezembro começa com 16% mais pedidos: rodar todo dia até a véspera do Natal rende mais e não deixa descanso. | +R$ 1.040 | Trabalha até a véspera do Natal: a filha passa as férias sem o pai acordado | O mesmo +20 h por semana de jan–fev (D-024) |
| C | Folgar na semana do Natal | Uma semana com a família no Natal, sem férias pagas, justo em dezembro, quando os pedidos sobem. | −R$ 630 | Uma semana de Natal com a filha, e os pedidos de dezembro vão para outro | 7 dias do bimestre |
| D * | Jornada de sempre | Seguir a rotina até o fim do ano, sem 13º, sem férias e sem um dia a mais de folga. | R$ 0 | Rotina de sempre até o fim do ano, sem 13º e sem um dia a mais com a filha | — |
| E | Temporário com carteira | Vaga temporária de motoboy com carteira até o Natal: horário fixo, salário, 13º, férias e INSS no lugar do app. | −R$ 1.230 | Carteira por dois meses: horário fixo, 13º e férias, e menos dinheiro no fim | A conta abaixo |

**"Pedir ajuda à família" entrou no lugar de "Cortar comida e remédio"** (pedido
do Kleber de 06/10: o básico para sobreviver não é opção realista). Não é opção
puxada. Com ela, nenhuma combinação corta comida.

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
na vida, são risco.

| | Gatilho | Quando | Efeito | Fonte |
| --- | --- | --- | --- | --- |
| K1 | Parar na greve, ir ao protesto ou parar no breque | No mesmo bimestre | **5 dias sem pedidos: −R$ 450** (já está no valor da opção; era 1 semana, −R$ 630) | D-072; Abílio (2021), p. 941 e 950. A fonte diz que o prazo "não está claro": 5 dias é o menor afastamento da regra da 99 (5, 10 e 15 dias), estimativa sem fonte para o bloqueio branco (D-079) |
| K2 | **Duas opções puxadas seguidas** (⚑ num bimestre e ⚑ no seguinte) | No bimestre da segunda | **As costas travam:** 7 dias parado (−R$ 630) e 4 sessões de fisioterapia (−R$ 600) = **−R$ 1.230** | Carta "Dor" do config de 05/10: Souza et al. (Physis, 2024); Doctoralia POA (4 × R$ 150). O "sempre, na segunda seguida" é estimativa sem fonte (regra decidida pelo Kleber) |
| K3 | Pagar o IPVA em janeiro (jan–fev E) | Mar–abr | O IPVA não vence de novo: +R$ 340 | Sefaz-RS (um IPVA por ano) |
| K4 | Atrasar a parcela da moto (jan–fev B) | Mar–abr | A parcela volta com multa de 2%, mora de 1% e um mês dos juros do contrato: −R$ 500 | CDC, art. 52, § 1º; BCB SGS 25471; Decreto-Lei 911/1969 |
| K5 | Adiar a revisão (jul–ago C, o padrão) | Set–out | **A moto quebra:** 3 dias parado (−R$ 270) e relação e pneu (−R$ 520) = −R$ 790; com o pneu trocado em mai–jun (A), só a relação (−R$ 290) = −R$ 560 | Carta "A moto quebrou" do config de 05/10: relação R$ 294 + pneu R$ 228 (lojas, B) |

O crédito pessoal (mar–abr C) não é consequência: é a dívida da tabela Price,
que o motor cobra nos bimestres seguintes (D-065).

## Os blocos de dados (depois de cada bimestre) e o Fim

No roteiro, cada rodada é seguida de um bloco "Dados: …" do tema do bimestre
(P2 e P4 da D-079): **contexto** (o que é, em 1 ou 2 frases), até **3 itens**
com número real e **fonte**. Os números novos vêm do informativo do IBGE
"Trabalho por meio de plataformas digitais 2025" (PNAD Contínua, 3º tri/2025,
publ. set/2026), o mesmo da renda do Jonas; as páginas estão na fonte de cada
bloco. Todos ficam no `config.json` (`roteiros`, campos `contexto`, `itens` e
`fonte` do passo `bloco`).

**Dados: calor e jornada** (depois de jan–fev)
- *Contexto:* No app não há jornada fixa nem pausa garantida: no calor, é o
  entregador quem decide sozinho entre poupar o corpo e perder o pico do almoço.
- 44,9 horas por semana: a jornada média do motoboy de app, que tira R$ 2.221 por
  mês já sem a gasolina.
- Quem trabalha por app faz 5,4 horas a mais por semana que os demais e ganha 12%
  menos por hora.
- Entre 33 e 34 °C, quem faz trabalho moderado perde metade da capacidade; Porto
  Alegre chegou a 39,5 °C.
- *Fonte:* IBGE, PNAD 2025, p. 7 e 10; OIT, "Trabalhar num planeta mais quente"
  (2019); Correio Braziliense (02/2025).

**Dados: a greve de 14/04 e a lei** (depois de mar–abr)
- *Contexto:* O PLP 152/2025 criaria o "plataformizado" (nem CLT, nem autônomo)
  com piso de R$ 8,50 por entrega; a categoria queria R$ 10. Com a greve de
  14/04/2026 convocada contra o texto, saiu de pauta.
- R$ 8,50 era o piso do projeto (a categoria pedia R$ 10); hoje, o mínimo do
  iFood é R$ 7,50, que ele mesmo define.
- 1,8 milhão de pessoas trabalham por aplicativo no Brasil; 325 mil delas como
  entregadores.
- 72,1% de quem trabalha por app está na informalidade, contra 42,7% dos demais
  trabalhadores.
- *Fonte:* O Tempo (08/04/2026); Diário do Transporte e Mobile Time (14/04/2026);
  Brasil de Fato (29/04/2025); IBGE, PNAD 2025, p. 3, 4 e 8.

**Dados: chuva e acidentes** (depois de mai–jun)
- *Contexto:* Na chuva, a moto freia pior e a promoção paga mais: é quando o
  entregador mais se arrisca. Acidentado e sem INSS, ele depende do seguro do
  app (de 7 a 30 dias parado) e da família.
- 22% dos entregadores de moto sofreram acidente em 3 meses, numa pesquisa
  financiada pelas plataformas.
- Dos acidentados parados 15 dias ou mais, só 20% tiveram INSS; entre os que
  pararam, a ajuda da família foi o apoio mais citado (38,3%).
- Na enchente de maio de 2024, nas cidades atingidas, só 66% dos entregadores
  ficaram ativos na 1ª semana.
- *Fonte:* Cebrap/Amobitec (2025); Siqueira et al., Cad. Saúde Pública 41(3), 2025
  (UFBA, 563 entregadores); 55content (04/07/2024); iFood, seguro de acidentes
  (2026: diária a partir de 7 dias parado, por até 30 dias).

**Dados: gestão por algoritmo** (depois de jul–ago)
- *Contexto:* Gestão por algoritmo: é o app, e não um chefe, que distribui os
  pedidos, define o preço e pune quem recusa, com regras que mudam sem aviso,
  como o +Entregas.
- +Entregas: o iFood promete de 10% a 30% a mais; exige 90% do tempo online e no
  máximo 2 recusas.
- A 2ª entrega agrupada paga R$ 3, e não os R$ 7,50 do mínimo; no iFood, 7
  recusas seguidas tiram o entregador 15 minutos do app.
- 47,4% dos entregadores dizem que bônus e promoções que mudam o preço
  influenciam a jornada deles.
- *Fonte:* iFood (31/08/2026 e jun/2025); CUT-RS (27/07/2026); Metrópoles
  (01/08/2025); IBGE, PNAD 2025, p. 14. (A regra dos 70% da 99 saiu: é dos
  motoristas, e conta aceitar e cancelar, não recusar.)

**Dados: o que é o breque** (depois de set–out)
- *Contexto:* Breque é a greve dos entregadores de app: todos desligam o
  aplicativo no mesmo dia para pressionar a plataforma. Sem salário garantido,
  quem para perde o dia e arrisca o bloqueio.
- 01/07/2020: o primeiro Breque dos Apps, na pandemia, pediu mais por entrega e o
  fim dos bloqueios sem explicação.
- 31/03/2025: breque em 60 cidades, segundo os entregadores; dois meses depois,
  o iFood subiu o mínimo de R$ 6,50 para R$ 7,50.
- 01/09/2026: breque geral por R$ 10 por corrida de até 4 km e o fim do
  +Entregas; até agora, sem reajuste.
- *Fonte:* Agência Brasil (25/07/2020); Brasil de Fato (31/03 e 29/04/2025);
  Metrópoles (01/09/2026).

**Dados: fim de ano sem 13º** (depois de nov–dez)
- *Contexto:* O 13º é um salário a mais no fim do ano, direito de quem tem
  carteira (Lei 4.090/1962). Quem trabalha por app é "conta própria": sem 13º,
  sem férias pagas e, em 2 de cada 3 casos, sem INSS.
- 86,8% de quem trabalha por app é "conta própria"; só 4,5% têm carteira
  assinada.
- Só 19,4% dos motoboys de app contribuem para o INSS; entre os outros motoboys,
  37,1%.
- No começo de dezembro de 2022, o iFood teve 16% mais pedidos que a média dos
  meses anteriores.
- *Fonte:* Lei 4.090/1962; IBGE, PNAD 2025, p. 5, 8 e 10 (34,0% dos
  plataformizados contribuem); iFood, release de 30/10/2023.

**Fim: quem é o patrão?** (o último bloco, P7)
- *Contexto:* No papel, o entregador é autônomo. Patrão é quem decide o preço,
  quem trabalha e as regras, e no app quem decide é a plataforma.
- 78,3% dos entregadores dizem que o app define sozinho quanto recebem por
  entrega; 70,8%, quem atendem.
- 23,1% dos entregadores dizem que a jornada é moldada por ameaça de punição ou
  bloqueio do app.
- Cerca de 92% do delivery passou pelo iFood no 1º tri/2025 (amostra de Open
  Finance); de cada pedido com entrega, cobra 26,2% do restaurante.
- *Fonte:* IBGE, PNAD 2025, p. 13-14; Klavi, via Giro News (07/10/2025; a Klavi
  mede transações numa amostra de Open Finance); iFood, Portal do Parceiro (2026:
  Plano Entrega, 23% + 3,2% de pagamento online).

No roteiro de 120 minutos, o mapa do seminário, o debrief e os caminhos têm só o
contexto, sem itens.

## Os números (as 15.625 combinações, no motor do jogo)

Sem sorteio, cada combinação de escolhas tem um resultado só, e o motor joga
todas: `npm run combinacoes` (cerca de 0,1 s; o validador, seção l, dá o total,
as que fecham, a melhor e a pior; o telão conta no navegador).

| Medida | Agora (v4.1, D-079) | Antes (v4, 06/10 de madrugada) |
| --- | --- | --- |
| Fecham o ano (dinheiro da família ≥ R$ 0) | **260** (1,7%) | nenhuma |
| Melhor combinação | **A-D-C-E-D-A: +R$ 1.714** (12 h no sol, aceitar até entrega ruim, madrugada na chuva, promoções da noite, furar o breque, pedir ajuda à família: nenhum bimestre de descanso) | A-D-C-E-D-A: −R$ 2.429 |
| Pior combinação | **D-A-E-C-C-E: devendo R$ 6.783** (R$ 2.000 de cheque especial e R$ 4.783 de contas atrasadas) | D-A-E-C-C-E: devendo R$ 10.906 |
| Mediana / média | −R$ 2.904 / −R$ 2.903 | −R$ 7.084 / −R$ 7.074 |
| Percentis | 10%: −R$ 4.687 · 25%: −R$ 3.862 · 75%: −R$ 1.951 · 90%: −R$ 1.134 | 10%: −R$ 8.793 · 90%: −R$ 5.372 |
| Os padrões (ninguém votou), C-D-D-C-A-D | −R$ 3.291, 9.363º de 15.625 | −R$ 7.294 |
| Acima de −R$ 1.000 / −R$ 2.000 / −R$ 3.000 | 1.302 / 4.057 / 8.199 | — |
| Comida cortada | Nenhuma combinação | 3.125 (por escolha, nov–dez A) |
| "Jonas com carteira assinada" (a linha do placar) | −R$ 11.947 (refeita no motor com a casa nova) | −R$ 15.498 |

**Quem fecha o ano:** as 260 têm ao menos uma opção puxada (de 1 a 4), e
nenhuma combinação sem puxada fecha. A melhor não descansa nenhum bimestre e
termina pedindo ajuda à família.

**A média de cada opção** (o fim do ano de quem a escolheu, nas 3.125
combinações que a contêm) e **em quantas das 3.125 combinações das outras
rodadas ela é a melhor do bimestre**:

| Bimestre | A | B | C | D | E | Melhor em |
| --- | --- | --- | --- | --- | --- | --- |
| Jan–fev | −1.822 | −3.079 | −3.117 | −3.316 | −3.182 | A 2.500 · B 625 |
| Mar–abr | −3.769 | −2.210 | −3.050 | −2.695 | −2.791 | B 2.000 · D 1.125 |
| Mai–jun | −3.080 | −3.061 | −2.364 | −2.807 | −3.202 | C 2.000 · D 1.125 |
| Jul–ago | −2.486 | −3.189 | −3.294 | −3.360 | −2.185 | A 2.000 · E 1.125 |
| Set–out | −2.780 | −3.084 | −3.388 | −2.381 | −2.882 | D 2.000 · A 1.125 |
| Nov–dez | −2.419 | −1.926 | −3.399 | −2.730 | −4.041 | B 2.500 · A 625 |

**Nenhuma opção domina em dinheiro**: a melhor de cada bimestre depende do resto
do caminho (o mesmo desenho de antes da D-079). Na média, a puxada ainda é a
melhor em 5 dos 6 bimestres (em jul–ago, são as promoções da noite): o validador
avisa isso como "dominante" (seção c), porque o critério dele é a média.

**As consequências nas combinações:** as costas travam em 625 combinações por
bimestre (de mar–abr a nov–dez); a moto quebra em 3.125 (2.500 com o pneu velho,
625 com o novo); o IPVA já pago e a parcela atrasada, em 3.125 cada.

**O que o validador diz:** sem erros e sem chave desconhecida (o validador
conhece `contexto`, `itens` e `fonte` desde o commit 43507ba; acima dos limites,
só aviso); e 8 avisos de equilíbrio: (c)
a opção de maior média é "dominante" pelo critério da média em cada bimestre (A,
B, C, E, D, B); (e) as decisões explicam 100% da variância (não há sorteio); (g)
o Jonas fecha em 1,7% das combinações, abaixo da faixa de 5% a 10% da D-058, que
a D-078 já tinha tirado do jogo simples.

## Para o Kleber

**Da D-079 (06/10 de manhã)** — o que mudou para o pior caso ficar abaixo de
R$ 7.000, para você confirmar:

1. **Três valores da casa foram recontados**: as faxinas (duas por semana são
   8,67 por mês, e não 8: +R$ 100), o ônibus da companheira (as idas e voltas
   das faxinas, 18 passagens, e não 30: −R$ 64) e o aluguel (o piso da mesma
   faixa do QuintoAndar no Sarandi, R$ 1.200, e não R$ 1.300). Num mês comum,
   falta R$ 128, e não R$ 392.
2. **O bloqueio depois da greve, do protesto e do breque passou de 7 para 5
   dias** (D-072 continua: o bloqueio existe; muda a duração, que a fonte diz não
   ser clara).
3. **Com isso, 260 combinações fecham o ano** (1,7%), todas com ao menos uma
   opção puxada; a melhor termina com R$ 1.714. A placa do placar passa a "Das
   15.625 combinações possíveis, 260 fecham o ano". Só com o bloqueio e as
   costas mais leves o pior caso não descia de R$ 9.800 (as opções do pior
   caminho são as de descanso e proteção, e o déficit da casa vem de todo mês);
   por isso a casa precisou ser recontada.
4. **"Pedir ajuda à família"** (nov–dez A) tem o valor como estimativa sem fonte
   (R$ 300 da mãe aposentada).

**Ainda em aberto** (nada disto muda número de tela):

5. **A linha "Jonas com carteira assinada" (−R$ 11.947) continua abaixo de todas
   as 15.625 combinações.** Com carteira, ele leva R$ 2.110 líquidos e paga a
   manutenção da moto; no app, R$ 2.680 já sem a manutenção. Fica, ou sai do
   placar?
6. **A regra das costas tem duas brechas:** jul–ago E ("Pegar promoções da
   noite") e mar–abr D ("Aceitar até entrega ruim") são mais tempo na rua, e a
   regra não as marca como puxadas. A mini-história nova das duas já não fala em
   horas a mais; o custo humano ainda fala.
7. **"Folgar na semana do Natal" cobra a semana média** (−R$ 630); uma semana de
   dezembro valeria R$ 725,67. Fica como simplificação?
8. **"Pneu novo antes da chuva"** é cobrado à parte, embora a renda da PNAD já
   desconte a manutenção média. Está declarado na fonte.
9. **O padrão de jul–ago é "Adiar a revisão"**: a equipe que não votar vê a moto
   quebrar em set–out. O roteiro (seção 0) manda decidir por ela antes do Enter.

## Onde mexer

- **Os valores e os textos:** `config.json` (como-editar-config.md, seção
  `regras.formatoSimples`). O valor da opção é a soma dos efeitos diretos dela;
  o que vem depois vai nos `efeitosGerais` do bimestre seguinte, com `decidiu`,
  e o rótulo até os dois-pontos é o motivo que a tela mostra. A mini-história é
  a `narrativa` da opção: uma frase só, com ponto final (a história da equipe
  corta na primeira frase).
- **Os blocos de dados e o Fim:** os passos `bloco` dos dois roteiros, com
  `contexto` (até ~220 caracteres), `itens` (1 a 3, até ~140 cada) e `fonte`.
- **Conferir:** `npm run validar` (sem erros), `npm run combinacoes` (os números
  acima), `npm test` (o `test/jogo-simples.test.mjs` confere o config do dia com
  o motor, inclusive o pior caso abaixo de R$ 7.000) e `npm run e2e` (o telão,
  inclusive com o config do dia).
