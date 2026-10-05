# Rascunho do conteúdo do jogo (esquema v3.1, 12 meses)

> **RASCUNHO v3.1 — 12 meses — a validar.** Nada daqui entra no seminário sem a validação do
> Kleber (D-005). Cada número tem a fonte ao lado. Onde não há dado, está escrito
> **"estimativa sem fonte"**, e a confiança é baixa (como na D-034). O que depende de decisão
> está na **seção 8, "Para validar com o Kleber"**.
>
> **Em destaque, sem suavizar:**
> 1. **Em 12 meses, ninguém fecha o básico.** Nenhuma das 6 personas termina com saldo ≥ R$ 0 em nenhum caminho que a simulação achou: nem ao acaso, nem no melhor plano, nem com a melhor sorte. O mais perto é o Jonas, com −R$ 770 no fim, e só tirando a carta de promoção nos 6 bimestres seguidos. A D-050 ("quase ninguém") e a meta da D-058 (5% a 10% em 2 personas) **não** estão cumpridas (seção 8, item 1).
> 2. **Com o limite do cheque especial (D-066), o placar da Daiane e o da Rose quase não separam as escolhas.** Passado o limite, o que falta vira comida não comprada ("faltou na mesa"), e ela fica fora do placar porque não é dívida (D-066). Na Daiane, em 4 dos 6 bimestres, as 4 opções terminam a menos de R$ 40 umas das outras no placar, e ela deixa de comprar, em média, R$ 8.953 de comida no ano. Por isso o validador voltou a avisar que o padrão é a opção de maior saldo (Rose em mai–jun; Daiane de mar–abr a jul–ago) e que há opção dominante ou que vence em renda em mais de 70% das partidas (Rose em jan–fev ("A" termina com mais saldo que cada uma das outras em 72% a 88% das partidas) e Daiane em jan–fev ("A" termina com mais saldo que cada uma das outras em 75% a 82% das partidas)). Contados com o que faltou na mesa (refiz a conta), o padrão nunca é a melhor opção, e a opção A de jan–fev só continua na frente na Daiane, por menos de R$ 100 (seção 8, item 18). **Precisa de decisão sua.**
> 3. **A referência "com carteira assinada" fica abaixo do Jonas de app em 87% das partidas no piloto automático** (−R$ 14.750 contra a mediana de −R$ 12.123). Refiz a linha com o limite (D-066; antes, −R$ 18.846), e ela continua abaixo: a comparação inverte a leitura do placar (seção 8, item 2).
> 4. **O esgotamento ainda é o melhor plano em 4 dos 6 bimestres** para 3 ou mais personas (a D-059 pede o contrário), e em set–out a melhor opção é a mesma para 5 das 6 (a D-051 pede que mude com a persona). Seção 8, itens 3 e 4.

- **Data:** 30/09/2026; revisto duas vezes em 01/10/2026: de manhã, os achados de conteúdo da revisão da F6b; à tarde, a D-066 (o cheque especial com limite), a D-067 (o auxílio acima do trabalho) e a D-063 (o risco que cresce, agora na chance). O que mudou está logo abaixo.
- **Arquivo do conteúdo:** [`config.json`](../config.json), `versao` `2026-09-30-v3-rascunho` (não mudei a `versao`, que o README e o roteiro citam; o hash é o que diferencia), hash `fccc2a93` (era `886da7f5` até 05/10: só mudaram textos de fonte). Os conteúdos anteriores ficaram congelados para os testes: o v2.2 (3 rodadas mensais, hash `fc0c3c35`, o do teste de 30/09) em `test/fixtures/config-real-v22.json`, e o v3 sem o limite (hash `19b12a5d`, o desta manhã) em `test/fixtures/config-real-v3.json`. Os textos de `fonte` do config resumem as tabelas deste rascunho e nunca aparecem no telão.
- **Esquema:** v3.1 (contratos, seções 1, 3, 7 e 8). Por cima do v2.2:
  - `regras.mesesPorRodada: 2`: cada rodada é um **bimestre**. O trabalho do mês (`todoMes`), o básico, a outra renda e a parcela do empréstimo contam 2 vezes por rodada; os juros do cheque especial compõem 2 meses sobre a dívida de antes ((1 + 7,43%)² − 1 = 15,41% no bimestre); efeitos de opção e de carta contam uma vez (são eventos). As telas dizem "no bimestre" e usam o título da rodada ("Jan–fev: …").
  - **v3.1 (D-066):** `regras.limiteChequeEspecial` (R$ 2.000), `multaAtraso` (7%), `moraMes` (0,8% ao mês), `cortarPrimeiro` (`"contas"`), o item da comida marcado no básico e os indicadores `contas_atrasadas` e `faltou_na_mesa`, que só o motor mexe (seção 5.1).
  - Com 6 rodadas, as equipes passam de 200 mil caminhos de cartas, e o placar e o validador passam à **simulação determinística** (20 mil sorteios, semente do hash do config): os números do fim são **estimados** e as telas dizem "pior caso estimado". Até a 4ª rodada, continua exato.
- **Como conferir:** `npm run validar` (cerca de 2 minutos e meio; a saída começa com "Modo: SIMULAÇÃO" e é a mesma a cada execução). As contas da seção 6 saem do mesmo motor do telão, com 20 mil partidas simuladas por persona e plano (semente fixa).
- **Continuam valendo, sem mudança:** o básico com fonte (D-044), os juros de 7,43% ao mês até o limite (D-046), o empréstimo como dívida (D-065, campo `emprestimo`), a proteção com `categoria: "protecao"` e `protege` (D-059: só o MEI; a associação sem `protege`, como no provisório de 29/09), os picos reais com fonte (D-058), o esgotamento que custa (D-059), os rótulos curtos (D-040), o tom "grave" nas cartas graves, sem setas de tendência (D-043), as afirmações (D-031) e o termômetro curto (D-032).

### O que mudou em 05/10/2026 (dois achados de conteúdo da revisão)

Só textos de `fonte`: nenhum peso, valor ou regra mudou. Mesmo assim, os números estimados pelo validador mudaram um pouco (item 3).

1. **O "nunca cai" da D-063 vale só no caminho da carta "Normal".** Nas partidas sorteadas, a média de algumas cartas recua um pouco num bimestre (até 1 ponto) e a do "Bloqueio" chega em nov–dez a só 1,13 a 1,15 vez a de jan–fev. As fontes de "Quebrou", "Dor", "Bloqueio" e "Alcance" dizem isso agora, com os números; a conta está na seção 4, abaixo da tabela. Não mexi nos pesos (o porquê está lá).
2. **A multa de celular e internet não é da Anatel.** A Resolução Anatel 765/2023 não fixa percentual, só manda informar a multa e os juros na fatura. A fonte passou a citar o teto de 2% do Código de Defesa do Consumidor (art. 52, § 1º) e o 1% de juros ao mês que a operadora cobra pelo contrato (Vivo, via Selectra, 02/03/2023). Os valores (2% e 1%) e a média de 7% e 0,8% não mudam.
3. **Efeito colateral: o hash mudou (`886da7f5` → `fccc2a93`), e com ele a semente da simulação do validador.** Nenhum peso ou valor mudou, mas o validador sorteia com a semente do hash do config, e os textos de fonte entram no hash. Rodei `npm run validar` de novo e troquei as seções 6.3 e 6.4 pela saída nova. As tabelas 6.1 e 6.2 e a seção 5 não dependem do hash (caminho fixo ou semente fixa) e não mudaram. O que virou com a semente nova, e foi corrigido no texto: o melhor caminho do Jonas (−R$ 591 → −R$ 770); o padrão de maior saldo (era Rose em mai–jun e Daiane em jul–ago, agora Rose em mai–jun e Daiane de mar–abr a jul–ago); o esgotamento como melhor plano (5 → 4 dos 6 bimestres, sai mai–jun); a melhor opção de set–out (era D para as 6, agora para 5: a Daiane fica com B por R$ 39); o MEI no padrão (pior caso de −R$ 423 a +R$ 635, esperado de −R$ 183 a −R$ 868); as decisões explicam de 20,6% a 44% da variância. **Isso quer dizer que esses avisos estão dentro do ruído da simulação** (diferenças de dezenas de reais entre opções): trocar um texto de fonte basta para mudá-los. Para quem mexe no código: a semente do validador e do placar estimado poderia sair de um hash sem os textos de `fonte`, para a conferência não mudar quando só a documentação muda.

### O que mudou na revisão de 01/10/2026, à tarde (D-066, D-067 e D-063)

Os números de todas as seções já são os do config novo (hash `886da7f5`; em 05/10, `fccc2a93`, só com a troca de dois textos de fonte: ver logo acima). O desta manhã era o `19b12a5d`.

1. **O limite do cheque especial: R$ 2.000 (D-066).** Fonte: Banco Central, Estudo Especial nº 84/2020 (microdados do SCR, dez/2019): limite médio de cheque especial de R$ 1.693 na faixa de renda abaixo de R$ 1,5 mil (R$ 21.422 acima de R$ 10 mil). Corrigido pelo IPCA de jan/2020 a ago/2026 (× 1,4347, BCB SGS 433): R$ 2.429. O próprio estudo avisa que o método superestima o limite (o do cheque especial é achado por resíduo) e que só entra quem teve carteira em 24 dos 36 meses; as personas não têm carteira (D-062). Usado R$ 2.000, o teto da faixa da D-066 (R$ 1.000 a R$ 2.000), abaixo dos R$ 2.429. Passado o limite, o banco não empresta mais. Escolhi o teto da faixa da D-066 porque é o número mais perto do único dado oficial que achei, e o dado é para cima (seção 8, item 15).
2. **Multa de 7%, uma vez, e mora de 0,8% ao mês.** Aluguel: a lei não fixa a multa, vale o contrato; o costume é 10% de multa e 1% de juros ao mês (Procon-SP, "Multas por atraso", jul/2019; Lei 8.245/1991). Luz: multa de até 2% e juros de 1% ao mês (ANEEL, REN 1.000/2021). Água: 2% e 1% ao mês (o teto do Código de Defesa do Consumidor para contas de consumo; DMAE). Celular e internet: 2% de multa (o teto do Código de Defesa do Consumidor, art. 52, § 1º) e 1% de juros ao mês (o que a operadora cobra pelo contrato: Vivo, via Selectra, 02/03/2023); a Resolução Anatel 765/2023 não fixa percentual, só manda informar a multa e os juros na fatura. Gás, ônibus e remédio não têm multa: quem não paga fica sem. Conta nossa: a média ponderada pelo peso de cada conta no que não é comida no básico das 6 casas (o aluguel é de 58% a 67%) dá multa de 6,7% e mora de 0,82% ao mês; usados 7% e 0,8%. A multa é cobrada uma vez, sobre o que atrasou no bimestre; a mora é simples, sobre o que já estava atrasado.
3. **A ordem do corte: as contas primeiro (`cortarPrimeiro: "contas"`, a validar).** Quando o limite acaba, atrasam as contas do bimestre (o básico menos a comida) e a comida é cortada só no que passar delas. As duas coisas acontecem de fato: 22% dos brasileiros trocaram a conta de luz pela comida (Ipec para o iCS, nov/2021), 30% dos que ganham até 1 salário mínimo deixam de comprar comida para pagar a luz (Instituto Pólis/Ipec, mai/2024), e 21% das dívidas atrasadas do país são contas de água, luz e gás (Serasa, mar/2026). "Comida primeiro" zeraria a comida das casas mais pobres em todo bimestre antes de atrasar um real de conta, o que nenhuma fonte descreve. É uma chave no config (seção 8, item 15).
4. **O item da comida marcado** (`comida: true`) no básico das 6 casas, e os dois indicadores novos, **Contas atrasadas** e **Faltou na mesa**, em R$, de 0 a 200 mil (o validador pede pelo menos a faixa inteira da renda).
5. **Duas cartas novas, graves, que só saem com contas atrasadas:** "Cortaram a luz" (de R$ 1.000 de contas atrasadas em diante, e mais acima de R$ 5.000 e de R$ 10.000) e "O dono entrou com o despejo" (acima de R$ 3.000 e de R$ 8.000, no máximo uma vez por partida). A regra e o custo têm fonte (ANEEL, REN 1.000/2021; CEEE, religação de R$ 11,36; Lei 8.245/1991, arts. 9º, 59 e 62); a chance é estimativa (seção 4 e seção 8, item 20). Como toda carta, as duas trazem o auxílio do INSS no bimestre seguinte à fratura.
6. **Saiu a "multa do aluguel atrasado" de cada bimestre começado no vermelho** (−R$ 130, −R$ 100 ou −R$ 102, de mar–abr em diante; eram 15 efeitos). Era o jeito de cobrar o atraso enquanto o cheque especial não tinha teto (D-053). Com o limite, ficar no vermelho é usar o cheque especial, que paga o aluguel; o atraso de verdade, com multa e mora, agora é do motor, quando o limite acaba. Manter as duas cobraria a multa duas vezes. A D-053 continua cumprida: o contexto de mar–abr ("aluguel atrasado paga 10% de multa") vira efeito real quando falta dinheiro.
7. **A clientela do curso de gel da Rose leva um bimestre para aparecer:** +R$ 320 em jul–ago (metade) e +R$ 640 de set–out em diante (estimativa, como a clientela). Com o limite, o custo do curso deixou de render 7,43% de juros ao mês, e o padrão de mai–jun virou a opção de maior saldo da Rose; a rampa diminui isso, mas não resolve sozinha (seção 8, item 18).
8. **D-067: o auxílio diz que é de 1 salário mínimo.** O rótulo do efeito passou a "auxílio do INSS pelo MEI (45 dias de 1 salário mínimo)", e a conta cita o decreto (antes dizia "R$ 54,03 por dia"; o valor diário oficial é R$ 54,04, Decreto 12.797/2025). O valor do jogo continua R$ 2.431 (1,5 × R$ 1.621 = R$ 2.431,50). O motor detecta o caso em Bruna e Daiane (seção 5.2), e a frase pronta sai assim: "Auxílio do INSS pelo MEI (45 dias de 1 salário mínimo): R$ 2.431, mais do que Bruna ganhava trabalhando num bimestre comum (R$ 1.400)." A tela já chama a frase: no resultado do telão e do celular e na história (revisão da F6c; seção 8, item 16).
9. **D-063: o risco de desgaste agora cresce na chance, e não só no peso.** A revisão da F6c achou que a chance de "Alcance", "Bloqueio" e "Quebrou" da Rose, da Bruna e da Daiane caía ao longo do ano, porque a doença (com a energia baixa e o remédio adiado), o temporal e agora as cartas de atraso entram no sorteio e diluem as outras. Os pesos de "Quebrou", "Dor", "Bloqueio", "Alcance" e "Burnout" passaram a subir bimestre a bimestre, por persona, o bastante para que a chance no plano padrão, com a carta "Normal" em todos os bimestres, nunca caia de um bimestre para o seguinte e chegue em nov–dez a pelo menos 1,25 vez a de jan–fev (o "Alcance", 1,33 vez, a queda de 24% do engajamento em 12 meses; a "Dor", 1,5 vez, a da Rose, 2 vezes). *Em 05/10: nas partidas sorteadas, a média recua um pouco em alguns bimestres (seção 4, logo abaixo da tabela).* As exceções são as quedas que a própria escolha do padrão causa: "Bloqueio" em mar–abr (aceitar tudo multiplica por 0,4) e "Quebrou" do Jonas e do Marcos em mai–jun (a revisão corta pela metade). A tabela está na seção 4. Com isso, a chance de ser bloqueado em algum bimestre do ano, no padrão, fica de 11% (Jonas) a 15% (Daiane), perto dos 15,5% da GigU (quem já foi bloqueado alguma vez).
10. **Fora destes dois arquivos (precisei mexer para os testes passarem, sem mudar o que eles conferem):** `test/propriedades.test.mjs` (a conta do mês com o limite: o saldo do mês é a variação do patrimônio, como a seção 3 dos contratos já diz), `test/protecao.test.mjs` e `test/historia.test.mjs` (os três casos dependiam do config sem o limite; passaram a usar os configs congelados) e o novo `test/fixtures/config-real-v3.json`. **Pendências para quem mexe no código:** a frase "`delta.renda = saldoMes + emprestimo − amortizacao`" dos contratos (seção 3) não vale com o limite (falta somar a variação das contas atrasadas); e a conferência (c) do validador não conta o que faltou na mesa (seção 8, item 18).

### O que mudou na revisão de 01/10/2026, de manhã (achados de conteúdo da revisão da F6b)

Cada troca tem a fonte no `config.json` e, aqui, na seção indicada. O config de antes era o `c17c901d`.

1. **IPVA no vencimento (achado 3).** O jogo dizia "o IPVA vence em janeiro" e cobrava o imposto inteiro em jan–fev, mas a própria fonte diz "o vencimento ocorrerá no dia 30 de abril de 2026" (Sefaz-RS). O IPVA passou para **mar–abr** (Jonas −R$ 340, Marcos −R$ 1.500). Jan–fev agora diz o que é verdade: pagar antes dá desconto (até 22,4% até 30/01) e o parcelamento só pôde ser pedido em janeiro, mas a casa não tem como adiantar. O desconto de até 20% que ainda vale no vencimento (Bom Motorista e Bom Cidadão) depende de não ter multa e não entrou: seção 8, item 9.
2. **A greve e o PLP 152 (achado 4).** Abri as duas matérias citadas. O Mobile Time diz que a votação caiu por "um impasse entre o relator e o governo federal, que retirou o apoio à proposta", sem falar em greve, e que "não tem nova data"; o Diário do Transporte fala de greve com "protestos em Brasília e diferentes capitais" e diz que o governo também retirou o apoio. **Nenhuma das duas traz "23 capitais" nem "o projeto morreu".** Saíram as duas afirmações, e o texto agora diz que, no dia da greve, a lei saiu de pauta sem o apoio do governo. O título do bimestre e o do bloco de dados passaram de "a lei que morreu" para **"a lei que saiu de pauta"**. *Pendência fora destes dois arquivos:* `docs/roteiro-do-apresentador.md` ainda usa o título antigo.
3. **O cursinho do Kauã até o Enem (achado 5).** Quem mantém o cursinho em mai–jun passa a pagar o dia de trabalho por semana também em jul–ago e set–out (−R$ 365 e energia −1 em cada) e nas duas primeiras semanas de novembro (−R$ 91), além dos dois domingos da prova. Antes, ele custava 8 semanas das ~26.
4. **"Por mês" vale duas vezes no bimestre (achado 6).** Os clientes de gel da Rose passaram de R$ 500 para **R$ 640 por bimestre** (4 × R$ 100 × 0,8 = R$ 320 por mês, a conta da própria fonte; à tarde, o primeiro bimestre ficou com a metade, item 7 acima), e o remédio adiado em jul–ago, de um para **dois meses** do item do básico (Rose R$ 180, Bruna e Daiane R$ 120). Conferi os outros efeitos de evento: os demais já dizem "nos 2 meses" ou "um mês" de propósito (a luz de dezembro, os picos de data).
5. **A renda da Daiane, líquida (achado 7).** Era faturamento com o rótulo "já sem os ingredientes". Passou a ser **R$ 750 por mês**: R$ 1.500 vendidos (GEM, corrigido pelo IPCA) × **50% de margem**, a ponta de baixo das duas contas da pesquisa (doce de festa, 50% a 60%, Confeitaria Armelin via Pricelisto; ovo de Páscoa, 55%, Revista Oeste). Tudo o que era proporcional à renda dela caiu pela mesma metade (dias parados, % do bimestre, as encomendas de Páscoa, Dia das Mães e Natal); o que já era lucro ficou (as encomendas grandes da carta "Promoção", R$ 165 cada) e os custos também (anúncio, DAS, curso, chocolate mais caro). **Ela passa a ter a maior falta do jogo:** −R$ 2.146 por mês, antes −R$ 1.396. Seção 8, item 17.
6. **Outras rendas diferentes (achado 10).** Eram três casas com "faxina, R$ 1.500". Agora: a companheira do Jonas faz faxina e revende cosméticos (R$ 1.500, sem mudança); a **mãe da Bruna** ganha a renda média das trabalhadoras domésticas, **R$ 1.335** (DIEESE, PNAD 4º tri/2025, ~9 faxinas); a **mãe do Kauã** faz **diárias de cozinha** em restaurantes e festas, 12 × R$ 110 = **R$ 1.320** (faixa de R$ 80 a 150, Goomer: B; piso do SINDHA de Porto Alegre, A). Com o bico de obra do filho da Rose e a cuidadora do Marcos, são cinco ofícios diferentes. Seção 8, item 7.
7. **O risco que cresce, com a conta escrita (achado 11).** Nenhum número cita mais a D-063 como fonte. Em cada carta, o *quando* tem fonte (a quilometragem e a vida das peças da pesquisa de desgaste) e o *quanto* está marcado como estimativa, com a conta. *À tarde, os pesos mudaram (item 9 acima).*
8. **De manhã, não mexi** no modelo da dívida do cheque especial (achado 1) nem na fratura com MEI (achado 2). *À tarde, viraram a D-066 e a D-067 (itens 1 a 8 acima).*

---

## 0. Em uma tabela

| Meta | Resultado no v3.1 | Cumprida? |
|---|---|---|
| D-060: 6 rodadas bimestrais, com título, texto, contexto por persona e 4 dilemas ligados ao calendário | "Jan–fev: quanto trabalhar no calor?"; "Mar–abr: a lei que saiu de pauta"; "Mai–jun: água, frio e Dia das Mães"; "Jul–ago: a regra nova do app"; "Set–out: breque geral"; "Nov–dez: Black Friday, Natal e nenhum 13º" (seção 3) | **Sim** |
| D-061: 6 personagens, um por equipe, cada um num trabalho | e1 Jonas, e2 Rose, e3 Marcos, e4 Bruna, e5 Kauã, e6 Daiane; a influenciadora nova é a **Bruna** (seção 1) | **Sim** (a ordem e as obrigatórias, **a validar**) |
| D-062: ninguém com carteira na casa; outra renda informal com fonte; 13º e abono fora dos picos | Outras rendas: faxinas e revenda da companheira do Jonas (R$ 1.500), bicos de obra do filho da Rose (R$ 480), cuidados da esposa do Marcos com uma idosa (R$ 1.482), faxinas da mãe da Bruna (R$ 1.335, a média do DIEESE) e diárias de cozinha da mãe do Kauã (R$ 1.320); a Daiane não tem outra renda. O 13º só aparece como contexto ("ninguém destas casas tem") | **Sim** (a referência com carteira, **a validar**: seção 8, item 2) |
| D-063: o risco cresce com os meses | No plano padrão com a carta "Normal" em todos os bimestres, a chance de "Quebrou", "Dor", "Bloqueio", "Alcance" e "Burnout" nunca cai de um bimestre para o seguinte (fora as duas quedas que a própria escolha do padrão causa) e chega em nov–dez a 1,25 vez a de jan–fev ou mais; nas partidas sorteadas, a tendência é a mesma, mas a média recua um pouco em alguns bimestres (até 1 ponto), e a do "Bloqueio" chega a só 1,13 a 1,15 vez (seção 4); a carta "Normal" perde 8 pontos de peso de jul–ago em diante; adiar a manutenção multiplica "Quebrou" por 4 e a queda por 1,5; adiar o remédio dobra a doença. Bloqueio em algum bimestre do ano: 11% a 15% (seção 4) | **Sim** na tendência do ano; **em parte** no "nunca cai", que só vale no caminho da carta "Normal" (o quando tem fonte na quilometragem; o tamanho dos aumentos é estimativa, com a conta na seção 4) |
| D-066: o cheque especial com limite; passado ele, contas atrasadas (com multa e mora) e comida cortada; sem juros compostos sem fim | Limite de R$ 2.000 (Banco Central, EE 84/2020, corrigido); multa de 7% e mora de 0,8% ao mês (média ponderada de aluguel, luz, água e celular); as contas atrasam primeiro (a validar); cartas "Cortaram a luz" e "O dono entrou com o despejo". No fim, no padrão, de R$ 10.376 a R$ 24.040 de contas atrasadas, e o banco nunca passa de R$ 2.000 (seção 5.1) | **Sim**, com um efeito colateral no placar (8, item 18) |
| D-067: a tela diz quando o auxílio passa do que a pessoa ganhava trabalhando | O rótulo diz "1 salário mínimo"; o motor detecta Bruna e Daiane (seção 5.2), e a frase aparece no resultado do telão e do celular e na história | **Sim** (o texto da frase, a confirmar: 8, item 16) |
| Básico com fonte, juros de 7,43% a.m. até o limite, empréstimo como dívida, a conta que vence vira efeito (D-053) | Sem mudança de fonte; o empréstimo de mar–abr (R$ 1.500 em 12 parcelas) entra como dívida, 2 parcelas por bimestre de mai–jun em diante (8 no jogo, 4 depois, que o placar conta). A multa do aluguel por bimestre no vermelho saiu: o atraso, com multa e mora, é do motor (D-066) | **Sim** |
| D-059: a proteção vale pelo pior caso | O MEI (jan–fev, B), no plano padrão, melhora o pior caso estimado de −R$ 423 (Daiane) a R$ 635 (Marcos) e perde de R$ 183 (Daiane) a R$ 868 (Marcos) no esperado; o auxílio do INSS (R$ 2.431) chega no bimestre seguinte à fratura, e a perícia nega em ~50% (seção 6.4) | **Em parte:** no pior caso, o MEI não melhora Rose e Daiane (a perda da fratura vira comida cortada, fora do placar; 8, item 18); a associação continua sem `protege` |
| D-058: picos reais com fonte | Páscoa (Daiane), Dia das Mães (Rose, Daiane), dezembro (todos menos a Bruna), a publi da Black Friday que só paga em mar–abr (Bruna), as cartas "Promoções e desafios" (as 6), "Temporal" (promoção de chuva), "Viralizou" (Bruna) e "Reajuste" (Jonas, Kauã), e a Farroupilha como opção | **Sim** |
| D-058: de 5% a 10% das partidas de 2 personas fecham; D-050: "quase ninguém", e não "ninguém" | **0% nas 6 personas**, ao acaso e no melhor plano; nenhum caminho fecha (o melhor: Jonas, −R$ 770). Até **um bimestre** no azul é raro: partidas ao acaso com pelo menos um, Jonas 17,86%, Rose 0,00%, Marcos 15,89%, Bruna 0,03%, Kauã 0,04% e Daiane 0,00% (seção 6.2) | **Não: precisa de decisão** (8, item 1) |
| D-058: quem fica só no padrão nunca fecha | 0% nas 6 personas | **Sim** |
| Nenhuma opção dominante; o padrão nunca é a de maior saldo | Avisos do validador: opção que domina ou ganha em renda: Rose em jan–fev ("A" termina com mais saldo que cada uma das outras em 72% a 88% das partidas) e Daiane em jan–fev ("A" termina com mais saldo que cada uma das outras em 75% a 82% das partidas); o padrão é a de maior saldo: Rose em mai–jun e Daiane de mar–abr a jul–ago. São diferenças de dezenas de reais nas casas que passam do limite; com o que faltou na mesa na conta, o padrão nunca é o melhor (seção 8, item 18) | **Não, pelo placar** (8, item 18) |
| D-051: a melhor opção muda com a persona; a letra do esforço muda com o bimestre | A melhor muda com a persona nos 6 bimestres, mas em set–out é D para 5 das 6 (a Daiane fica com B, por R$ 39); a letra do esforço é A, B, C, A, D, B | **Em parte** (8, item 4) |
| D-059: o esgotamento deixa de ser o melhor plano para a maioria | A opção mais cansativa é a de maior saldo esperado para 3 ou mais personas em jan–fev (3), mar–abr (3), set–out (5) e nov–dez (5) | **Não: precisa de decisão** (8, item 3) |
| Rótulos curtos (≤ 10 letras), tom "grave", sem setas, D-031, D-032 | Todas as 21 cartas com `curto`; graves: enchente, fratura, INSS negou, bloqueio, assalto, sem luz e despejo; afirmações e termômetros sem mudança | **Sim** |
| Roteiros de 60 e 120 min centrados no jogo, com entrevistas opcionais de até 20 min e decisão de 90 a 120 s | Somas de 3.600 s e 7.200 s; 6 rodadas intercaladas com blocos curtos de dados; "Entrevistas" opcional de 4 min (60) e 20 min (120); decisão de 90 s, mínimo de 45 (seção 7) | **Sim** |
| (i) o "entrou" nunca negativo | Só a Daiane: pior −R$ 456 em jul–ago (opção D com a fratura); ao acaso, até 2,7% dos casos (set–out) | **Quase** (8, item 13) |

---

## 1. Os seis personagens e as equipes (D-061)

| Equipe | Cor e forma | Personagem | Trabalho | Obrigatória |
|---|---|---|---|---|
| e1 | Laranja (#E69F00), círculo | **Jonas** | Motoboy, 34 anos, entrega pelo iFood com moto financiada. Mora no Sarandi, em Porto Alegre. | sim |
| e2 | Azul-céu (#56B4E9), triângulo | **Rose** | Manicure por aplicativo, 47 anos. Trabalhou dez anos sem registro num salão. Atende de ônibus. | sim |
| e3 | Verde-azulado (#009E73), quadrado | **Marcos** | Motorista de aplicativo na 99 e na Uber, 41 anos, carro próprio de 2016. Ex-metalúrgico, demitido há três anos. | não |
| e4 | Azul (#0072B2), losango | **Bruna** | Influenciadora de beleza, 24 anos, 6 mil seguidores. Grava no quarto, com anel de luz e celular parcelado. Mora no Rubem Berta. | não |
| e5 | Vermelhão (#D55E00), estrela | **Kauã** | Entregador de bicicleta pelo iFood, 20 anos. Quer fazer o Enem e a faculdade à noite. Mora na Restinga. | não |
| e6 | Roxo-rosado (#CC79A7), cruz | **Daiane** | Vende doces e marmitas pelo Instagram, 29 anos. Paga um curso de marketing digital em 12 vezes. | não |

**A ordem (a validar).** É a ordem em que o "me coloque" preenche as equipes e em que elas somem quando há menos de 6 (D-027). As cores e formas seguem a posição, na paleta Okabe-Ito (D-016). O critério que usei:
1. **e1 Jonas, motoboy do iFood.** É o caso com o dado mais firme (PNAD 2025, confiança A), o personagem dos breques e do +Entregas, e o único que chega perto de fechar (o melhor caminho termina em −R$ 770). Com poucas equipes, é ele que mostra o "quase".
2. **e2 Rose, manicure por app.** O outro extremo: mulher, sustenta a casa, trabalho sem veículo, e a segunda maior falta do jogo (−R$ 1.932 por mês no mês comum, atrás só da Daiane). Com só 2 equipes, a sala vê os dois extremos. Contra: a renda dela é de confiança baixa (D-028).
3. **e3 Marcos, motorista de app.** Dado firme (PNAD 2025, confiança A) e a história do ex-metalúrgico demitido.
4. **e4 Bruna, influenciadora.** A personagem nova, a mais perto da idade da turma e do discurso do empreendedorismo digital.
5. **e5 Kauã, bicicleta.** Repete a plataforma do Jonas (iFood), com dado de 2019 corrigido pelo IPCA.
6. **e6 Daiane, doces no Instagram.** Repete o canal da Bruna e a confiança baixa da Rose. Com a renda líquida dos ingredientes (01/10), tem a maior falta do jogo (−R$ 2.146 por mês), o que pode pedir para subir na ordem (seção 8, item 5).

**Obrigatórias: e1 e e2** (entram mesmo que ninguém escolha), para que qualquer sala tenha o contraste da ordem acima. Critério meu, a validar (seção 8, item 5).

---

## 2. Famílias, básico e outra renda (D-044, D-062)

Resumo por mês (o jogo cobra 2 meses por bimestre). "Falta por mês" é o mês comum do motor (`mesComum`): trabalho − custos fixos + outra renda − básico, sem carta, sem juros e sem os efeitos do calendário.

| Personagem | Pessoas | Básico | Trabalho | Custos fixos | Outra renda | Falta por mês | Por bimestre |
|---|---|---|---|---|---|---|---|
| Jonas | 3 | R$ 4.092 | R$ 2.680 | R$ 480 | R$ 1.500 | **−R$ 392** | −R$ 784 |
| Rose | 3 | R$ 4.512 | R$ 2.100 | R$ 0 | R$ 480 | **−R$ 1.932** | −R$ 3.864 |
| Marcos | 4 | R$ 4.742 | R$ 2.870 | R$ 0 | R$ 1.482 | **−R$ 390** | −R$ 780 |
| Bruna | 2 | R$ 3.267 | R$ 700 | R$ 0 | R$ 1.335 | **−R$ 1.232** | −R$ 2.464 |
| Kauã | 3 | R$ 3.812 | R$ 1.370 | R$ 0 | R$ 1.320 | **−R$ 1.122** | −R$ 2.244 |
| Daiane | 2 | R$ 2.755 | R$ 750 | R$ 141 | R$ 0 | **−R$ 2.146** | −R$ 4.292 |

Ninguém fecha o mês comum. A regra da comida: cesta básica do DIEESE de Porto Alegre por adulto; criança até 11 anos conta meia (regra do DIEESE), 12 anos ou mais conta inteira (escolha nossa). O item da comida está marcado no config (`comida: true`, D-066): é o único que a casa deixa de comprar quando o limite do cheque especial acaba (seção 5.1).

### 2.1 Jonas (e1)

- **Quem é:** Motoboy, 34 anos, entrega pelo iFood com moto financiada. Mora no Sarandi, em Porto Alegre.
- **A casa (3 pessoas):** Jonas, a companheira, que faz faxina duas vezes por semana e revende cosméticos, e a filha de 6 anos.
- **Energia inicial:** 7 de 10.
- **Fonte do perfil:** Abílio (2021): trajetória dos motoboys; PNAD 2025

| Básico, item | R$ por mês | Fonte |
|---|---|---|
| comida (cesta básica × 2,5) | 2.098 | DIEESE/Conab, cesta básica de Porto Alegre, ago/2026 (publ. 10/09/2026): R$ 839,34 por adulto x 2,5 (criança até 11 anos conta meia, regra do DIEESE; 12 anos ou mais conta inteira, escolha nossa) |
| aluguel (2 quartos) | 1.300 | QuintoAndar, lido em 29/09/2026: 2 dormitórios com condomínio e taxas, Rubem Berta R$ 1.123-1.411 e Sarandi R$ 1.192-1.525. Mercado formal (exige fiador ou análise de crédito) |
| luz | 162 | CEEE Equatorial, tarifa B1 R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ~R$ 1,08/kWh; 150 kWh/mês (estimativa; a média do Sul é 208 kWh, EPE 2025) |
| água e esgoto | 119 | DMAE: R$ 5,50/m³ (Decreto 23.639/2026) + esgoto de ~80% da água; 12 m³/mês, 4 m³ por pessoa (estimativa) |
| gás de cozinha | 89 | ANP, levantamento de 20 a 26/09/2026: botijão de 13 kg em Porto Alegre R$ 119,00; 0,75 botijão por mês (estimativa) |
| ônibus da companheira | 159 | Prefeitura de Porto Alegre: passagem de ônibus R$ 5,30 desde 19/02/2026; 30 passagens por mês (estimativa) |
| celular e internet | 75 | Estimativa: pré-pago R$ 20-30 por 30 dias (Claro, Vivo, TIM); internet fixa média ~R$ 92 (Anatel, 1º tri/2026) |
| remédios | 90 | Estimativa: famílias com até 2 salários mínimos gastam 4,2% com remédio (IBGE, POF 2017-2018). A Farmácia Popular dá 41 itens de graça, mas não analgésico nem antibiótico |
| **Total** | **4.092** | |

- **Outra renda da casa (informal, D-062):** faxinas e revenda da companheira, **R$ 1.500 por mês**. Fonte: Diária de faxina em Porto Alegre R$ 130 a 150 (GetNinjas; Famyle, R$ 150 a 250: B). 8 faxinas por mês × R$ 150, sem carteira e sem INSS. DIEESE (2026, PNAD 4º tri/2025): 76% das trabalhadoras domésticas sem carteira, renda média de R$ 1.335; diaristas trabalham ~24 h por semana (DIEESE, boletim de abr/2025). Três dias por semana na mesma casa gera vínculo (LC 150/2015), por isso a diarista fica em até 2 por cliente. Revenda de cosméticos: R$ 300 por mês, abaixo da média de ~R$ 417 brutos (ABEVD, jan/2026: R$ 50 bi ÷ 3 milhões de revendedoras ÷ 12, margem de 30%; conta nossa). 8 × 150 + 300 = R$ 1.500. D-062: ninguém com carteira na casa
- **Todo mês (`todoMes`):**
  - +R$ 2.680 · entregas do mês, já sem a gasolina. Fonte: IBGE, PNAD Contínua, Trabalho por meio de plataformas digitais 2025 (publ. set/2026), p. 10: motociclistas de app, R$ 2.221/mês, 44,9 h/semana, valor "retirado", já sem o combustível. IBGE, Notas técnicas da PNAD Contínua v1.5, p. 35-36: a retirada do conta-própria já desconta "equipamentos e outros investimentos". Por isso a parcela da moto (R$ 480) aparece aqui somada e sai como custo fixo: o líquido fica nos R$ 2.200
  - renda do trabalho × 0,9 (com energia abaixo de 3) · exausto: rendi 10% menos. Fonte: Estimativa sem fonte direta (não achei medição de queda de renda por cansaço em trabalho de app). Indício: acima de ~50 h por semana a produção por hora cai (Pencavel, Economic Journal, 2015)
  - −R$ 480, custo fixo · parcela da moto. Fonte: Tabela Fipe set/2026 (CG 160 Start 2026, R$ 18.598), 80% financiado em 48x a 1,97% a.m. (BCB, SGS 25471, jun/2026) = R$ 482
  - energia +1 · o descanso do fim de semana. Fonte: Mecânica do jogo (estimativa sem fonte): a energia volta um pouco a cada mês, com a folga que sobra. As opções de mais esforço tiram mais do que isso

### 2.2 Rose (e2)

- **Quem é:** Manicure por aplicativo, 47 anos. Trabalhou dez anos sem registro num salão. Atende de ônibus.
- **A casa (3 pessoas):** Rose sustenta a casa: a filha de 15 estuda, e o filho de 23 faz bico de ajudante de obra quando aparece.
- **Energia inicial:** 6 de 10.
- **Fonte do perfil:** Abílio (2021): caso de Clara, manicure por aplicativo; Kinote et al. (RBPS, 2013): 76,7% das manicures com dor

| Básico, item | R$ por mês | Fonte |
|---|---|---|
| comida (cesta básica × 3) | 2.518 | DIEESE/Conab, cesta básica de Porto Alegre, ago/2026 (publ. 10/09/2026): R$ 839,34 por adulto x 3 (criança até 11 anos conta meia, regra do DIEESE; 12 anos ou mais conta inteira, escolha nossa) |
| aluguel (2 quartos) | 1.300 | QuintoAndar, lido em 29/09/2026: 2 dormitórios com condomínio e taxas, Rubem Berta R$ 1.123-1.411 e Sarandi R$ 1.192-1.525. Mercado formal (exige fiador ou análise de crédito) |
| luz | 162 | CEEE Equatorial, tarifa B1 R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ~R$ 1,08/kWh; 150 kWh/mês (estimativa; a média do Sul é 208 kWh, EPE 2025) |
| água e esgoto | 119 | DMAE: R$ 5,50/m³ (Decreto 23.639/2026) + esgoto de ~80% da água; 12 m³/mês, 4 m³ por pessoa (estimativa) |
| gás de cozinha | 89 | ANP, levantamento de 20 a 26/09/2026: botijão de 13 kg em Porto Alegre R$ 119,00; 0,75 botijão por mês (estimativa) |
| ônibus dos filhos | 159 | Prefeitura de Porto Alegre: passagem de ônibus R$ 5,30 desde 19/02/2026; 30 passagens por mês (estimativa) |
| celular e internet | 75 | Estimativa: pré-pago R$ 20-30 por 30 dias (Claro, Vivo, TIM); internet fixa média ~R$ 92 (Anatel, 1º tri/2026) |
| remédios | 90 | Estimativa: famílias com até 2 salários mínimos gastam 4,2% com remédio (IBGE, POF 2017-2018). A Farmácia Popular dá 41 itens de graça, mas não analgésico nem antibiótico |
| **Total** | **4.512** | |

- **Outra renda da casa (informal, D-062):** bicos do filho na obra, **R$ 480 por mês**. Fonte: Sinduscon-RS, "Preços e custos da construção" (fev/2026, p. 3): servente com carteira R$ 8,86/h, R$ 70,88 em 8 h; sites de diária de ajudante de obra, R$ 150 a 250 (Tá Contratado, 11/11/2025: B). Usado R$ 120 por diária, entre os dois; 4 diárias por mês (frequência sem fonte, de 0 a 8). Sem carteira e sem INSS (D-062)
- **Todo mês (`todoMes`):**
  - +R$ 2.100 · atendimentos do mês, já sem comissão, material e ônibus. Fonte: Estimativa: salário médio de manicure com carteira R$ 1.802 (CAGED ago/2025-jul/2026) + 15%, como no caso de Clara em Abílio (2021). Não há dado de renda de manicure por app. Confiança baixa (D-028)
  - renda do trabalho × 0,9 (com energia abaixo de 3) · exausto: rendi 10% menos. Fonte: Estimativa sem fonte direta (não achei medição de queda de renda por cansaço em trabalho de app). Indício: acima de ~50 h por semana a produção por hora cai (Pencavel, Economic Journal, 2015)
  - energia +1 · o descanso do fim de semana. Fonte: Mecânica do jogo (estimativa sem fonte): a energia volta um pouco a cada mês, com a folga que sobra. As opções de mais esforço tiram mais do que isso

### 2.3 Marcos (e3)

- **Quem é:** Motorista de aplicativo na 99 e na Uber, 41 anos, carro próprio de 2016. Ex-metalúrgico, demitido há três anos.
- **A casa (4 pessoas):** Marcos, a esposa, cuidadora de uma idosa sem carteira, e os filhos de 10 e 7 anos.
- **Energia inicial:** 6 de 10.
- **Fonte do perfil:** Abílio (2021): Uber e o trabalhador amador; PNAD 2025. Carro de 2016, e não de 2014: a 99 aceita carro de até 10 anos fora das capitais listadas, e Porto Alegre não está na lista (blog da 99, 24/10/2024)

| Básico, item | R$ por mês | Fonte |
|---|---|---|
| comida (cesta básica × 3) | 2.518 | DIEESE/Conab, cesta básica de Porto Alegre, ago/2026 (publ. 10/09/2026): R$ 839,34 por adulto x 3 (criança até 11 anos conta meia, regra do DIEESE; 12 anos ou mais conta inteira, escolha nossa) |
| aluguel (2 quartos) | 1.300 | QuintoAndar, lido em 29/09/2026: 2 dormitórios com condomínio e taxas, Rubem Berta R$ 1.123-1.411 e Sarandi R$ 1.192-1.525. Mercado formal (exige fiador ou análise de crédito) |
| luz | 194 | CEEE Equatorial, tarifa B1 R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ~R$ 1,08/kWh; 180 kWh/mês (estimativa; a média do Sul é 208 kWh, EPE 2025) |
| água e esgoto | 158 | DMAE: R$ 5,50/m³ (Decreto 23.639/2026) + esgoto de ~80% da água; 16 m³/mês, 4 m³ por pessoa (estimativa) |
| gás de cozinha | 119 | ANP, levantamento de 20 a 26/09/2026: botijão de 13 kg em Porto Alegre R$ 119,00; 1 botijão por mês (estimativa) |
| ônibus da esposa | 233 | Prefeitura de Porto Alegre: passagem de ônibus R$ 5,30 desde 19/02/2026; 44 passagens por mês (estimativa) |
| celular e internet | 100 | Estimativa: pré-pago R$ 20-30 por 30 dias (Claro, Vivo, TIM); internet fixa média ~R$ 92 (Anatel, 1º tri/2026) |
| remédios | 120 | Estimativa: famílias com até 2 salários mínimos gastam 4,2% com remédio (IBGE, POF 2017-2018). A Farmácia Popular dá 41 itens de graça, mas não analgésico nem antibiótico |
| **Total** | **4.742** | |

- **Outra renda da casa (informal, D-062):** cuidados da esposa com uma idosa, **R$ 1.482 por mês**. Fonte: DIEESE, boletim especial do trabalho doméstico (abr/2025, p. 8-9, PNAD 4º tri/2024): cuidadora a domicílio, R$ 1.482 por mês, 79% sem carteira. Sem carteira e sem INSS (D-062). Se a idosa for internada, a renda some (não entrou como carta: frequência sem fonte)
- **Todo mês (`todoMes`):**
  - +R$ 2.870 · corridas do mês, já sem o combustível e a manutenção. Fonte: IBGE, PNAD Contínua, Trabalho por meio de plataformas digitais 2025 (publ. set/2026), p. 9: condutores de automóvel de app, R$ 2.873/mês, 45,9 h/semana, valor "retirado", já sem o combustível. A manutenção já está descontada (Notas técnicas da PNAD v1.5, p. 35-36), e por isso não entra de novo
  - renda do trabalho × 0,9 (com energia abaixo de 3) · exausto: rendi 10% menos. Fonte: Estimativa sem fonte direta (não achei medição de queda de renda por cansaço em trabalho de app). Indício: acima de ~50 h por semana a produção por hora cai (Pencavel, Economic Journal, 2015)
  - energia +1 · o descanso do fim de semana. Fonte: Mecânica do jogo (estimativa sem fonte): a energia volta um pouco a cada mês, com a folga que sobra. As opções de mais esforço tiram mais do que isso

### 2.4 Bruna (e4)

- **Quem é:** Influenciadora de beleza, 24 anos, 6 mil seguidores. Grava no quarto, com anel de luz e celular parcelado. Mora no Rubem Berta.
- **A casa (2 pessoas):** Bruna e a mãe, diarista, num apartamento de 1 quarto; a mãe paga quase tudo.
- **Energia inicial:** 7 de 10.
- **Fonte do perfil:** Silva, tese UFMG (2023); DeepLab/UCD (2024), trabalho de campo em comunidades de baixa renda de Porto Alegre; Pinheiro-Machado, Café da Manhã (04/11/2024)

| Básico, item | R$ por mês | Fonte |
|---|---|---|
| comida (cesta básica × 2) | 1.679 | DIEESE/Conab, cesta básica de Porto Alegre, ago/2026 (publ. 10/09/2026): R$ 839,34 por adulto × 2 (criança até 11 anos conta meia, regra do DIEESE; 12 anos ou mais conta inteira, escolha nossa) |
| aluguel (1 quarto) | 1.000 | QuintoAndar, lido em 29/09/2026: 1 dormitório com condomínio e taxas, R$ 1.012-1.194 (Rubem Berta, Sarandi) |
| luz | 130 | CEEE Equatorial, tarifa B1 R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ~R$ 1,08/kWh; 120 kWh/mês (estimativa; a média do Sul é 208 kWh, EPE 2025) |
| água e esgoto | 79 | DMAE: R$ 5,50/m³ (Decreto 23.639/2026) + esgoto de ~80% da água; 8 m³/mês, 4 m³ por pessoa (estimativa) |
| gás de cozinha | 71 | ANP, levantamento de 20 a 26/09/2026: botijão de 13 kg em Porto Alegre R$ 119,00; 0,6 botijão por mês (estimativa) |
| ônibus da mãe | 106 | Prefeitura de Porto Alegre: passagem de ônibus R$ 5,30 desde 19/02/2026; 20 passagens por mês (estimativa) |
| internet e celular (o trabalho dela) | 142 | Internet fixa ~R$ 92 por mês (Anatel, via Telesíntese, 03/07/2026) + plano de celular R$ 50 (estimativa). É também a ferramenta de trabalho: não entra de novo como custo do trabalho |
| remédios | 60 | Estimativa: famílias com até 2 salários mínimos gastam 4,2% com remédio (IBGE, POF 2017-2018). A Farmácia Popular dá 41 itens de graça, mas não analgésico nem antibiótico |
| **Total** | **3.267** | |

- **Outra renda da casa (informal, D-062):** faxinas da mãe, **R$ 1.335 por mês**. Fonte: DIEESE (2026, PNAD 4º tri/2025): renda média das trabalhadoras domésticas, R$ 1.335; 47% são diaristas, 76% sem carteira. É perto de 9 faxinas por mês a R$ 150 (diária em Porto Alegre de R$ 130 a 150, GetNinjas; R$ 150 a 250, Famyle: B). Diaristas trabalham ~24 h por semana (DIEESE, boletim de abr/2025); três dias por semana na mesma casa gera vínculo (LC 150/2015). Sem carteira e sem INSS (D-062)
- **Todo mês (`todoMes`):**
  - +R$ 700 · publis e vendas do mês. Fonte: Não há dado oficial: o IBGE não mede criadores de conteúdo (PNAD 2025, informativo, p. 14-15). Derivação nossa (confiança baixa): Censo Squid 2023 (4.537 criadores, em Silva, tese UFMG 2023, p. 129-131): 75,2% ganham até 1 salário mínimo, 25% nunca receberam; Censo Wake 2025: 26% sem renda mensal do conteúdo, 67% aceitam permuta; YouPix 2025: 28,17% não monetizam. Média de R$ 700 por mês, que varia muito de um bimestre para outro (cartas)
  - renda do trabalho × 0,9 (com energia abaixo de 3) · exausto: rendi 10% menos. Fonte: Estimativa sem fonte direta (não achei medição de queda de renda por cansaço em trabalho de app). Indício: acima de ~50 h por semana a produção por hora cai (Pencavel, Economic Journal, 2015)
  - energia +1 · o descanso do fim de semana. Fonte: Mecânica do jogo (estimativa sem fonte): a energia volta um pouco a cada mês, com a folga que sobra. As opções de mais esforço tiram mais do que isso

### 2.5 Kauã (e5)

- **Quem é:** Entregador de bicicleta pelo iFood, 20 anos. Quer fazer o Enem e a faculdade à noite. Mora na Restinga.
- **A casa (3 pessoas):** Kauã, a mãe, que faz diárias de cozinha em restaurantes e festas, e a irmã de 9 anos.
- **Energia inicial:** 7 de 10.
- **Fonte do perfil:** Abílio (2021): bike boys, caso de Carlos; Aliança Bike (2019)

| Básico, item | R$ por mês | Fonte |
|---|---|---|
| comida (cesta básica × 2,5) | 2.098 | DIEESE/Conab, cesta básica de Porto Alegre, ago/2026 (publ. 10/09/2026): R$ 839,34 por adulto x 2,5 (criança até 11 anos conta meia, regra do DIEESE; 12 anos ou mais conta inteira, escolha nossa) |
| aluguel (casa pequena) | 1.020 | QuintoAndar, lido em 29/09/2026: aluguel médio no Chapéu do Sol/Restinga R$ 1.020 (todos os tipos de imóvel) |
| luz | 162 | CEEE Equatorial, tarifa B1 R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ~R$ 1,08/kWh; 150 kWh/mês (estimativa; a média do Sul é 208 kWh, EPE 2025) |
| água e esgoto | 119 | DMAE: R$ 5,50/m³ (Decreto 23.639/2026) + esgoto de ~80% da água; 12 m³/mês, 4 m³ por pessoa (estimativa) |
| gás de cozinha | 89 | ANP, levantamento de 20 a 26/09/2026: botijão de 13 kg em Porto Alegre R$ 119,00; 0,75 botijão por mês (estimativa) |
| ônibus da mãe | 159 | Prefeitura de Porto Alegre: passagem de ônibus R$ 5,30 desde 19/02/2026; 30 passagens por mês (estimativa) |
| celular e internet | 75 | Estimativa: pré-pago R$ 20-30 por 30 dias (Claro, Vivo, TIM); internet fixa média ~R$ 92 (Anatel, 1º tri/2026) |
| remédios | 90 | Estimativa: famílias com até 2 salários mínimos gastam 4,2% com remédio (IBGE, POF 2017-2018). A Farmácia Popular dá 41 itens de graça, mas não analgésico nem antibiótico |
| **Total** | **3.812** | |

- **Outra renda da casa (informal, D-062):** diárias de cozinha da mãe, **R$ 1.320 por mês**. Fonte: Cozinha ou garçom avulso, R$ 80 a 150 por diária (Goomer, blog: B); o piso do SINDHA em Porto Alegre (2026, com carteira) é R$ 1.930 por mês, R$ 8,77/h, ou R$ 70,16 em 8 h (A). Usado R$ 110 por diária, no meio da faixa; 12 diárias por mês, sextas, sábados e um evento por semana (frequência sem fonte). Sem carteira e sem INSS (D-062)
- **Todo mês (`todoMes`):**
  - +R$ 1.370 · entregas do mês. Fonte: Aliança Bike (2019, São Paulo): R$ 936/mês, 9 a 12 h/dia; corrigido pelo IPCA jun/2019-ago/2026 (x1,4639). Confiança média-baixa (D-028)
  - renda do trabalho × 0,9 (com energia abaixo de 3) · exausto: rendi 10% menos. Fonte: Estimativa sem fonte direta (não achei medição de queda de renda por cansaço em trabalho de app). Indício: acima de ~50 h por semana a produção por hora cai (Pencavel, Economic Journal, 2015)
  - energia +1 · o descanso do fim de semana. Fonte: Mecânica do jogo (estimativa sem fonte): a energia volta um pouco a cada mês, com a folga que sobra. As opções de mais esforço tiram mais do que isso

### 2.6 Daiane (e6)

- **Quem é:** Vende doces e marmitas pelo Instagram, 29 anos. Paga um curso de marketing digital em 12 vezes.
- **A casa (2 pessoas):** Daiane e o filho de 4 anos, de aluguel; o pai não paga pensão, e só ela tem renda.
- **Energia inicial:** 6 de 10.
- **Fonte do perfil:** Pinheiro-Machado, Café da Manhã (04/11/2024); Carmo et al., Cad. EBAPE.BR (2021)

| Básico, item | R$ por mês | Fonte |
|---|---|---|
| comida (cesta básica × 1,5) | 1.259 | DIEESE/Conab, cesta básica de Porto Alegre, ago/2026 (publ. 10/09/2026): R$ 839,34 por adulto x 1,5 (criança até 11 anos conta meia, regra do DIEESE; 12 anos ou mais conta inteira, escolha nossa) |
| aluguel (1 quarto) | 1.000 | QuintoAndar, lido em 29/09/2026: 1 dormitório com condomínio e taxas, R$ 1.012-1.194 (Rubem Berta, Sarandi) |
| luz | 130 | CEEE Equatorial, tarifa B1 R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ~R$ 1,08/kWh; 120 kWh/mês (estimativa; a média do Sul é 208 kWh, EPE 2025) |
| água e esgoto | 79 | DMAE: R$ 5,50/m³ (Decreto 23.639/2026) + esgoto de ~80% da água; 8 m³/mês, 4 m³ por pessoa (estimativa) |
| gás de cozinha | 71 | ANP, levantamento de 20 a 26/09/2026: botijão de 13 kg em Porto Alegre R$ 119,00; 0,6 botijão por mês (estimativa) |
| ônibus | 106 | Prefeitura de Porto Alegre: passagem de ônibus R$ 5,30 desde 19/02/2026; 20 passagens por mês (estimativa) |
| celular e internet | 50 | Estimativa: pré-pago R$ 20-30 por 30 dias (Claro, Vivo, TIM); internet fixa média ~R$ 92 (Anatel, 1º tri/2026) |
| remédios | 60 | Estimativa: famílias com até 2 salários mínimos gastam 4,2% com remédio (IBGE, POF 2017-2018). A Farmácia Popular dá 41 itens de graça, mas não analgésico nem antibiótico |
| **Total** | **2.755** | |

- **Outra renda da casa:** nenhuma. A Daiane é a única renda.
- **Todo mês (`todoMes`):**
  - +R$ 750 · vendas do mês, já sem os ingredientes. Fonte: Vende R$ 1.500 por mês: GEM Brasil 2018, citado em Carmo et al. (2021), metade dos negócios fatura até R$ 12 mil/ano; IPCA dez/2018-ago/2026 (x1,4965). Fica com metade, já sem os ingredientes e a embalagem: margem de 50%, a ponta de baixo das duas contas da pesquisa, 3 centos de doce de festa a R$ 96,50-118 (~R$ 300) com lucro de R$ 150 a 180, 50% a 60% (Confeitaria Armelin, Porto Alegre, via Pricelisto: B), e o ovo de Páscoa de 250 g com custo de R$ 30,90 vendido a R$ 69, 55% (Revista Oeste, 31/03/2026). A marmita, a outra metade do que ela vende, não tem margem com fonte. R$ 1.500 × 50% = R$ 750. Confiança baixa (D-028)
  - renda do trabalho × 0,9 (com energia abaixo de 3) · exausto: rendi 10% menos. Fonte: Estimativa sem fonte direta (não achei medição de queda de renda por cansaço em trabalho de app). Indício: acima de ~50 h por semana a produção por hora cai (Pencavel, Economic Journal, 2015)
  - −R$ 141, custo fixo · parcela do curso de marketing. Fonte: CartaCapital (07/11/2024), sobre a pesquisa de Pinheiro-Machado: cursos de marketing digital de R$ 1.697 a R$ 6.997; o mais barato em 12x sem juros = R$ 141 (o parcelamento é hipótese)
  - energia +1 · o descanso do fim de semana. Fonte: Mecânica do jogo (estimativa sem fonte): a energia volta um pouco a cada mês, com a folga que sobra. As opções de mais esforço tiram mais do que isso

**O "exausto" (−10% com energia abaixo de 3)** continua como estimativa sem fonte direta, como no v2.2: vale uma vez sobre o trabalho do bimestre inteiro.

**A energia** começa entre 6 e 7, volta 1 ponto por mês (2 por bimestre, "o descanso do fim de semana") e cai com as opções: a jornada de sempre tira 3 por bimestre. Quem fica só no padrão perde 1 ponto por bimestre e chega a 0 em 100% das partidas (seção 8, item 8).

---

## 3. O calendário, bimestre a bimestre (D-060)

Cada bimestre traz: o que o calendário cobra ou paga para todo mundo (efeitos gerais, que valem com qualquer opção), o contexto que o celular mostra na decisão, e as 4 opções. O **padrão** (a opção de quem não vota) está marcado. Os valores são do bimestre inteiro; os números entre colchetes remetem à fonte, logo abaixo de cada lista.

Efeitos gerais que se repetem em todos os bimestres (não repetidos abaixo):
- **DAS do MEI** (−R$ 172 por bimestre nos serviços, −R$ 164 no comércio) para quem abriu o MEI em jan–fev (opção B), e para a Daiane que abriu o MEI para entrar no iFood em mar–abr;
- **mensalidade da associação** (−R$ 60 por bimestre) de jul–ago em diante, para quem entrou em mai–jun;
- **o atraso das contas** (D-066, do motor, e não um efeito do config): quando o limite de R$ 2.000 do cheque especial acaba, as contas do bimestre atrasam, com multa de 7% e mora de 0,8% ao mês, e a comida é cortada no que passar delas (seção 5.1). A antiga multa do aluguel por bimestre começado no vermelho saiu: cobraria duas vezes;
- **parcelas da mentoria** (Bruna, −R$ 333), **clientes de gel** (Rose, +R$ 320 em jul–ago e +R$ 640 depois) e **um dia por semana no cursinho** (Kauã, −R$ 365 e energia −1, em jul–ago e set–out; em nov–dez, −R$ 91 até a prova, mostrado abaixo), de jul–ago em diante, para quem manteve o investimento em mai–jun.

### 3.1 Jan–fev: quanto trabalhar no calor?

> Janeiro abre com material escolar e 39 °C na rua; o IPVA só tem desconto para quem paga antes. Ninguém paga o seu INSS, e o básico vence com calor ou sem.

**O que o calendário traz (para todo mundo, qualquer que seja a opção):**

- **Jonas**: −R$ 28, custo fixo · gasolina a R$ 6,24 (em 2025, R$ 6,08) [1]
- **Marcos**: −R$ 108, custo fixo · gasolina a R$ 6,24 (em 2025, R$ 6,08) [1]
- **Marcos**: −R$ 230 · janeiro: a corrida fica mais barata [2]
- **Bruna**: −R$ 400 · a publi da Black Friday só paga depois do Carnaval [3]
- *Fonte [1]:* ANP, série mensal de preços por município, Porto Alegre: gasolina a R$ 6,30 (jan) e 6,18 (fev) em jan–fev de 2026, contra R$ 6,08 na média de 2025 (o ano da renda da PNAD, que já vem sem o combustível: só a diferença de preço entra). Jonas: 130 km/dia ÷ 40 km/L × 26 dias = 84,5 L/mês (AutoPapo, 08/11/2025); Marcos: R$ 1.987 de combustível por mês ÷ R$ 6 = 330 L/mês (Cebrap/Amobitec 2025, financiado pelas plataformas). Conta nossa, nos 2 meses: Jonas R$ 28, Marcos R$ 108
- *Fonte [2]:* IBGE, IPCA (SIDRA, tabela 7060), "transporte por aplicativo" em Porto Alegre: jan/2024 −10,49%, jan/2025 −7,33%, jan/2026 −22,22% (o preço do passageiro). Quanto chega ao motorista ninguém mede: com metade, −5% a −11% de um mês, R$ 144 a R$ 319 (usado R$ 230). Hipótese nossa (confiança baixa)
- *Fonte [3]:* Jornal de Brasília (coluna, M-B): os contratos da Black Friday dos influenciadores pagam em 90 dias úteis, e as agências fecham no fim do ano; o dinheiro de novembro entra em fev–mar. Valor: 2 publis na faixa de nano (Estado de Minas, 17/06/2026: feed de R$ 200 a 2.500, B), estimativa. Volta em mar–abr

**Contexto no celular (D-043, D-053):**

- **Jonas:** O IPVA da moto vence em 30/04 e só tem desconto se pagar antes: não sobra. Às 14h faz 39 °C, a filha está de férias, e a parcela da moto vence dia 5.
- **Rose:** Comissão de 20% do app e ônibus no calor. O filho de 23 faz bico na obra quando aparece: quatro diárias no mês, se tanto.
- **Marcos:** Em janeiro a corrida fica mais barata, todo ano. O IPVA vence em 30/04, com desconto só se pagar antes. A 99 só aceita carro de até 10 anos: o seu é de 2016.
- **Bruna:** A publi da Black Friday só paga depois do Carnaval. A mãe faz faxina, e o aluguel vence dia 10. Seis mil seguidores não pagam conta.
- **Kauã:** Pedalar às 14h com 39 °C: a Defesa Civil manda evitar esforço das 10h às 16h. A irmã de 9 anos está de férias e fica em casa.
- **Daiane:** O chocolate derrete no calor, e o menino está de férias da creche: fica com você na cozinha. A parcela do curso vence dia 10.

#### A. 12 horas por dia, 7 dias, no calor

- **Como cada ofício diz (D-054):** Bruna: "Postar três vezes por dia, todo dia"; Daiane: "Cozinhar 12 horas por dia, 7 dias".
- **Narrativa:** Fiquei online da manhã até a madrugada, sete dias, no sol das 14h. Dormi pouco, bebi pouca água e quase não vi minha casa acordada.
  - Daiane: Cozinhei de madrugada, com o forno ligado no calor. Respondi cliente o dia todo, dormi pouco, e o menino me viu mais no fogão.
  - Rose: Aceitei atendimento de manhã à noite, sete dias, de ônibus no calor. Dormi pouco e quase não vi meus filhos.
  - Bruna: Postei três vezes por dia, sete dias, e aceitei toda permuta. Dormi pouco, e o celular não saiu da minha mão.
- **Efeitos:**

  - **Jonas**: +R$ 1.040 · horas a mais (as piores horas do dia) [1]
  - **Rose**: +R$ 980 · horas a mais (as piores horas do dia) [1]
  - **Marcos**: +R$ 1.300 · horas a mais (as piores horas do dia) [1]
  - **Bruna**: +R$ 600 · posts a mais: mais publis [1]
  - **Kauã**: +R$ 210 · horas a mais (as piores horas do dia) [1]
  - **Daiane**: +R$ 350 · horas a mais (as piores horas do dia) [1]
  - **Todos**: energia −7 · dois meses sem folga
  - *Fonte [1]:* Estimativa: +20 h/semana a ~53% do ganho-hora (pacote B de calibragem, D-024), nos 2 meses. Kauã: menos, porque já pedala de 9 a 12 h por dia (Aliança Bike, 2019). Bruna: mais posts, mais publis (estimativa sem fonte)

#### B. Jornada de sempre e abrir o MEI (protege)

- **Narrativa:** Mantive a rotina, abri o MEI e passei a pagar o DAS todo mês. Acidente com mais de 15 dias parado, o INSS paga no bimestre seguinte; doença, só com 12 meses de contribuição.
- **Efeitos:**

  - **Jonas, Rose, Marcos, Bruna e Kauã**: −R$ 172, custo fixo · DAS do MEI [1]
  - **Daiane**: −R$ 164, custo fixo · DAS do MEI [2]
  - **Todos**: proteção +3 · segurado do INSS
  - **Todos**: energia −3 · rotina puxada
  - *Fonte [1]:* Receita Federal, Simples Nacional: DAS-MEI 2026 de serviços R$ 86,05 (R$ 81,05 de INSS + R$ 5 de ISS), duas vezes por bimestre. Influenciadora: a conferir se a ocupação de criador de conteúdo cabe no MEI (se não couber, a saída é o contribuinte individual, 11% de R$ 1.621 = R$ 178,31 por mês)
  - *Fonte [2]:* Receita Federal, Simples Nacional: DAS-MEI 2026 de comércio e indústria R$ 82,05 (R$ 81,05 de INSS + R$ 1 de ICMS), duas vezes por bimestre

#### C. Jornada de sempre, sem pagar nada (padrão)

- **Narrativa:** Mantive a rotina e não paguei nada a mais. Sobrou um pouco mais, e continuo sem rede se algo der errado.
- **Efeitos:**

  - **Todos**: energia −3 · rotina puxada

#### D. Parar nas horas de sol forte

- **Como cada ofício diz (D-054):** Daiane: "Não cozinhar nas horas mais quentes"; Marcos: "Desligar o app nas horas de sol forte"; Bruna: "Gravar só de manhã cedo e à noite"; Rose: "Recusar atendimento longe no sol forte"; Kauã: "Não pedalar das 10h às 16h no calor".
- **Narrativa:** Nos dias de 39 °C, parei das 10h às 16h, como manda a Defesa Civil. Perdi o almoço, que é o pico, e voltei inteiro para casa.
  - Daiane: Nos dias de 39 °C, não liguei o forno das 10h às 16h. Perdi encomendas de chocolate e respirei um pouco.
  - Marcos: Nos dias de 39 °C, desliguei das 10h às 16h. Perdi corridas e voltei menos moído para casa.
  - Bruna: Gravei só cedo e à noite, fora do calor do quarto. Postei menos e descansei.
  - Rose: Nos dias de 39 °C, recusei atendimento longe das 10h às 16h. Perdi clientes e não passei mal no ônibus.
  - Kauã: Nos dias de 39 °C, não pedalei das 10h às 16h. Perdi o pico do almoço e voltei inteiro para casa.
- **Efeitos:**

  - **Jonas**: −R$ 107 · parei das 10h às 16h nos dias de calor forte [1]
  - **Rose**: −R$ 84 · parei das 10h às 16h nos dias de calor forte [1]
  - **Marcos**: −R$ 115 · parei das 10h às 16h nos dias de calor forte [1]
  - **Bruna**: −R$ 28 · parei das 10h às 16h nos dias de calor forte [1]
  - **Kauã**: −R$ 55 · parei das 10h às 16h nos dias de calor forte [1]
  - **Daiane**: −R$ 30 · parei das 10h às 16h nos dias de calor forte [1]
  - *Fonte [1]:* Defesa Civil de Porto Alegre (08/02/2025): evitar esforço das 10h às 16h; 39,5 °C em 11/02/2025 (Correio Braziliense). 6 dias de calor extremo no bimestre (estimativa: em fev/2025, três dias passaram de 37 °C numa semana) × 40% do dia × 50%: a OIT ("Trabalhar num planeta mais quente") estima que, entre 33 e 34 °C, quem faz trabalho moderado perde metade da capacidade, e a hora no sol rende menos; das 10h às 16h fica o pico do almoço

### 3.2 Mar–abr: a lei que saiu de pauta

> A gasolina bate R$ 6,52, o 99Food chega e o IPVA vence em 30/04. Em 14 de abril, dia de greve, a lei dos aplicativos sai de pauta, sem o apoio do governo.

**O que o calendário traz (para todo mundo, qualquer que seja a opção):**

- **Jonas**: −R$ 63, custo fixo · gasolina a R$ 6,45 (em 2025, R$ 6,08) [1]
- **Marcos**: −R$ 247, custo fixo · gasolina a R$ 6,45 (em 2025, R$ 6,08) [1]
- **Jonas**: −R$ 340, custo fixo · IPVA da moto [2]
- **Marcos**: −R$ 1.500, custo fixo · IPVA do carro [2]
- **Daiane**: +R$ 263 · Páscoa: encomendas de ovo (+35% num mês) [3]
- **Daiane**: energia −2 · Páscoa na cozinha
- **Bruna**: +R$ 400 · caiu a publi da Black Friday [4]
- *Fonte [1]:* ANP, série mensal de preços por município, Porto Alegre: gasolina a R$ 6,38 (mar) e 6,52 (abr, o maior preço de 2024 a 2026) em mar–abr de 2026, contra R$ 6,08 na média de 2025 (o ano da renda da PNAD, que já vem sem o combustível: só a diferença de preço entra). Jonas: 130 km/dia ÷ 40 km/L × 26 dias = 84,5 L/mês (AutoPapo, 08/11/2025); Marcos: R$ 1.987 de combustível por mês ÷ R$ 6 = 330 L/mês (Cebrap/Amobitec 2025, financiado pelas plataformas). Conta nossa, nos 2 meses: Jonas R$ 63, Marcos R$ 247
- *Fonte [2]:* Sefaz-RS, calendário do IPVA 2026 (ipva.rs.gov.br/lista/649): "o vencimento ocorrerá no dia 30 de abril de 2026" (30/04/2026); 2% para moto e 3% para carro. Pagar antes dá desconto (até 22,4% até 30/01, 21,6% até 27/02 e 20,8% até 31/03, já somados o Bom Motorista e o Bom Cidadão), e o parcelamento só pôde ser pedido de 02 a 30/01, com parcelas até junho; a casa está no vermelho desde janeiro e não tem como adiantar: o jogo cobra à vista no vencimento. No vencimento, o desconto chega a 20% (Bom Motorista e Bom Cidadão), mas depende de não ter multa e do cadastro na Nota Fiscal Gaúcha: não entrou (escolha nossa, a validar). Valor venal estimado (sem fonte): CG 160 de 2025 ~R$ 17 mil (a 2026 vale R$ 18.598 na Fipe de set/2026); carro popular de 2016 ~R$ 50 mil. Pode estar em parte dentro da retirada da PNAD (a validar)
- *Fonte [3]:* Agência Sebrae MA (26/03/2024): Páscoa com "até 35% a mais do que faturamos normalmente" (relato): 35% de R$ 1.500 vendidos = R$ 525, e fica a metade, já sem o chocolate (a margem do trabalho dela): R$ 263. Revista Oeste (31/03/2026): ovo de 250 g com custo de R$ 30,90, vendido a R$ 69. Chocolate em Porto Alegre +24,78% em 12 meses (IPCA, SIDRA 7060, mar/2026). A data é certa (05/04/2026): entra para todo mundo, e não como carta
- *Fonte [4]:* A mesma publi de jan–fev (Jornal de Brasília: 90 dias úteis), paga agora

**Contexto no celular (D-043, D-053):**

- **Jonas:** O 99Food chegou pagando R$ 250 por 20 corridas, e o IPVA vence em 30/04. A lei que saiu de pauta prometia R$ 8,50 por entrega: nem CLT, nem autônomo.
- **Rose:** O app fica com 20% de cada atendimento. Quando o limite do cheque especial acaba, o aluguel atrasa, e o contrato cobra 10% de multa.
- **Marcos:** Gasolina a R$ 6,52 em abril, o maior preço em três anos, e o IPVA do carro vence em 30/04. A 99 oferece empréstimo na tela, a 9,36% ao mês.
- **Bruna:** A publi da Black Friday finalmente caiu. Uma marca oferece produto em troca de post, e não dinheiro: 67% das criadoras aceitam.
- **Kauã:** O 99Food chegou, mas o bônus de entrada é para moto. Um colega foi bloqueado semana passada, e o app não respondeu.
- **Daiane:** Páscoa: o chocolate subiu 25% em um ano, e as encomendas de ovo dobram o trabalho. Aluguel atrasado paga 10% de multa.

#### A. Parar no dia da greve (14 de abril)

- **Como cada ofício diz (D-054):** Daiane: "Parar um dia, em apoio à greve"; Rose: "Parar um dia, em apoio à greve"; Bruna: "Parar um dia, em apoio à greve".
- **Narrativa:** Desliguei o app no dia da greve, junto com os outros. Perdi o dia, e a lei saiu de pauta: não passou, nem a parte boa nem a ruim.
  - Daiane: Fechei as encomendas no dia da greve, em apoio a quem entrega. Perdi o dia, e a lei saiu de pauta de um jeito ou de outro.
  - Rose: Não atendi no dia da greve, junto com os entregadores. Perdi o dia; para manicure, a lei nem falava nada.
  - Bruna: Não postei no dia da greve e divulguei a pauta dos entregadores. Perdi o dia, e alguns seguidores reclamaram.
- **Efeitos:**

  - **Jonas**: −R$ 89 · um dia parado na greve [1]
  - **Rose**: −R$ 70 · um dia parado na greve [1]
  - **Marcos**: −R$ 96 · um dia parado na greve [1]
  - **Bruna**: −R$ 23 · um dia parado na greve [1]
  - **Kauã**: −R$ 46 · um dia parado na greve [1]
  - **Daiane**: −R$ 25 · um dia parado na greve [1]
  - **Todos**: proteção +1, energia −3 · não estou mais sozinho: a rotina continua
  - *Fonte [1]:* Um dia sem ganho (1/60 do bimestre). PLP 152/2025: em 14/04/2026, dia da greve nacional de motoristas e entregadores de aplicativo, com "protestos em Brasília e diferentes capitais", o projeto saiu da pauta da Câmara; o governo federal também retirou o apoio (Diário do Transporte, 14/04/2026). A votação foi cancelada por "um impasse entre o relator e o governo federal, que retirou o apoio à proposta", e "não tem nova data" (Mobile Time, 14/04/2026). O projeto trazia R$ 8,50 por entrega e criava o trabalhador "plataformizado", que "não se enquadra na Consolidação das Leis do Trabalho (CLT), mas também deixa de ser considerado totalmente autônomo" (O Tempo, 08/04/2026)

#### B. Rodar num segundo app

- **Como cada ofício diz (D-054):** Jonas: "Rodar também no 99Food"; Daiane: "Vender também pelo iFood"; Rose: "Atender por dois apps ao mesmo tempo"; Bruna: "Virar afiliada da loja do TikTok".
- **Narrativa:** Liguei dois apps e fiquei pulando de um para o outro. Rendeu mais, e o seguro de um não cobre a corrida do outro.
  - Jonas: Entrei no 99Food, peguei o bônus de entrada e rodei nos dois. Rendeu mais, e o seguro de um não cobre a entrega do outro.
  - Daiane: Entrei no iFood com CNPJ de MEI e respondi os dois canais. Vendeu mais, o app levou 26% dos pedidos, e o dia não acabava.
  - Rose: Liguei dois apps e fui encaixando cliente dos dois. Rendeu mais, e passei o dia no ônibus.
  - Bruna: Virei afiliada e passei a vender produto nos vídeos, a 10% de comissão. Rendeu pouco, e todo vídeo virou anúncio.
- **Efeitos:**

  - **Jonas**: +R$ 904 · dois apps ao mesmo tempo (com o bônus de entrada do 99Food) [1]
  - **Kauã**: +R$ 411 · dois apps ao mesmo tempo [1]
  - **Marcos**: +R$ 861 · dois apps ao mesmo tempo [1]
  - **Rose**: +R$ 630 · dois apps ao mesmo tempo [1]
  - **Daiane**: +R$ 600 · vendas pelo iFood, já sem os ingredientes [2]
  - **Daiane**: −R$ 314 · comissão do iFood: 26,2% dos pedidos [3]
  - **Daiane** (quem escolheu A, C ou D em jan–fev): −R$ 164, custo fixo · abri o MEI para entrar no iFood (exige CNPJ): DAS [4]
  - **Bruna**: +R$ 300 · comissões de afiliada [5]
  - **Todos**: energia −5 · atenção dividida o dia todo
  - *Fonte [1]:* Estimativa: +15% da renda do bimestre. PNAD 2025: 37,5% dos plataformizados usam dois ou mais apps; Fairwork 2025: 62 de 88 dependem de mais de um app. 99 e iFood: o seguro de cada app só cobre a corrida ou a entrega dele. Jonas: o 99Food chegou a Porto Alegre em 17/03/2026 com R$ 250 garantidos por 20 corridas de moto (Jornal do Brás, 23/03/2026): R$ 12,50 por corrida, R$ 5 acima do mínimo de R$ 7,50 do iFood, R$ 100 a mais (conta nossa)
  - *Fonte [2]:* Estimativa sem fonte do volume: ~R$ 600 em pedidos por mês pelo iFood (40% a mais do que ela vende), e fica a metade, já sem os ingredientes (a margem de 50% do trabalho dela): R$ 300 por mês, nos 2 meses
  - *Fonte [3]:* iFood, Portal do Parceiro (Taxas do iFood para restaurante, 2026): Plano Entrega, 23% + 3,2% de pagamento online = 26,2%. Os R$ 300 por mês já sem ingrediente vêm de ~R$ 600 em pedidos (a margem de 50% do trabalho dela); 26,2% de R$ 600 = R$ 157 por mês
  - *Fonte [4]:* iFood, Portal do Parceiro: a loja precisa de CNPJ com CNAE de alimentação; o MEI serve. DAS-MEI de comércio 2026: R$ 82,05, duas vezes
  - *Fonte [5]:* TikTok Newsroom (04/06/2026): afiliados do TikTok Shop cresceram 46 vezes em um ano; comissão de 8% a 15% e mínimo de seguidores em teste (B). Estimativa sem fonte: R$ 3.000 vendidos no bimestre × 10%

#### C. Pegar R$ 1.500 no crédito pessoal

- **Como cada ofício diz (D-054):** Marcos: "Pegar R$ 1.500 no empréstimo do app da 99".
- **Narrativa:** Peguei R$ 1.500 em 12 parcelas de R$ 183. O bimestre fechou melhor, e a dívida continua depois do jogo: o placar conta o que falta pagar.
  - Marcos: Peguei R$ 1.500 no app da 99, em 12 parcelas de R$ 213. A dívida continua depois do jogo, e o placar conta o que falta pagar.
- **Efeitos:**

  - **Jonas, Rose, Bruna, Kauã e Daiane**: empréstimo de R$ 1.500 em 12 parcelas a 6,39% ao mês · empréstimo no crédito pessoal [1]
  - **Marcos**: empréstimo de R$ 1.500 em 12 parcelas a 9,36% ao mês · empréstimo do app da 99 [2]
  - **Todos**: energia −3 · rotina puxada
  - *Fonte [1]:* Banco Central, SGS 25464: crédito pessoal não consignado, 6,39% ao mês em ago/2026. Tabela Price, 12 parcelas: R$ 1.500 = 12 × R$ 182,76 (conta nossa, sem IOF). No bimestre, duas parcelas por rodada, a partir de mai–jun: 8 dentro do jogo e 4 depois
  - *Fonte [2]:* Banco Central, taxas por instituição (semana de 09 a 15/09/2026): 99Pay SCFI 9,36% ao mês. Tabela Price, 12 parcelas: R$ 1.500 = 12 × R$ 213,29 (conta nossa, sem IOF). iDinheiro: a 99Pay empresta de R$ 500 a R$ 10 mil, em 3 a 12 vezes

#### D. Aceitar tudo o que vier, para não sumir da fila (padrão)

- **Como cada ofício diz (D-054):** Daiane: "Aceitar toda encomenda de Páscoa, até a sem margem"; Rose: "Aceitar todo atendimento, até o longe e barato"; Bruna: "Aceitar toda permuta, sem cobrar".
- **Narrativa:** Aceitei até o que não compensava, para o app não me esconder. Trabalhei mais para ganhar quase o mesmo.
  - Daiane: Aceitei até encomenda de ovo sem margem, com o chocolate 25% mais caro. Trabalhei mais para ganhar o mesmo.
  - Rose: Aceitei até atendimento do outro lado da cidade. Era isso ou o app me esconder: mais ônibus para ganhar quase o mesmo.
  - Bruna: Aceitei produto no lugar de dinheiro, para a marca não sumir. Postei mais, e a conta não viu nada.
- **Efeitos:**

  - **Jonas**: +R$ 161 · aceitei até as entregas ruins [1]
  - **Marcos**: +R$ 172 · aceitei até as corridas ruins [1]
  - **Rose**: +R$ 126 · aceitei até os atendimentos longe e baratos [1]
  - **Daiane**: −R$ 150 · ovo vendido abaixo do custo [2]
  - **Todos**: energia −4 · mais horas para ganhar o mesmo
  - *Fonte [1]:* Estimativa: +3% da renda do bimestre (as corridas e entregas ruins rendem pouco; na bicicleta, a entrega longe não compensa: nada). iFood (31/08/2026): o "Mais Entregas" exige 90% do tempo disponível e no máximo 2 recusas; 99: finalizar menos de 70% das corridas = 5, 10 e 15 dias fora
  - *Fonte [2]:* Chocolate em Porto Alegre +24,78% em 12 meses (IPCA, SIDRA 7060, mar/2026); o ovo de 250 g custa R$ 30,90 (Revista Oeste, 31/03/2026). Encomenda sem margem, com o preço antigo, dá prejuízo: estimativa

### 3.3 Mai–jun: água, frio e Dia das Mães

> Chove forte, o Guaíba sobe e o frio chega. O Dia das Mães enche a agenda de quem faz unha e doce, e quem para não recebe.

**O que o calendário traz (para todo mundo, qualquer que seja a opção):**

- **Jonas**: −R$ 26, custo fixo · gasolina a R$ 6,23 (em 2025, R$ 6,08) [1]
- **Marcos**: −R$ 102, custo fixo · gasolina a R$ 6,23 (em 2025, R$ 6,08) [1]
- **Rose**: +R$ 420 · semana do Dia das Mães: agenda cheia [2]
- **Daiane**: +R$ 263 · Dia das Mães: encomendas (+35% num mês) [2]
- **Daiane**: energia −2 · Dia das Mães na cozinha
- *Fonte [1]:* ANP, série mensal de preços por município, Porto Alegre: gasolina a R$ 6,25 (mai) e 6,21 (jun) em mai–jun de 2026, contra R$ 6,08 na média de 2025 (o ano da renda da PNAD, que já vem sem o combustível: só a diferença de preço entra). Jonas: 130 km/dia ÷ 40 km/L × 26 dias = 84,5 L/mês (AutoPapo, 08/11/2025); Marcos: R$ 1.987 de combustível por mês ÷ R$ 6 = 330 L/mês (Cebrap/Amobitec 2025, financiado pelas plataformas). Conta nossa, nos 2 meses: Jonas R$ 26, Marcos R$ 102
- *Fonte [2]:* Rose: relato de até +70% de procura na semana antes do Dia das Mães em salões (Sebrae, via busca: B); usado +20% de um mês, o mesmo da carta de dezembro do rascunho v2. Daiane: Agência Sebrae MA (26/03/2024), datas fortes com até +35% do faturamento. A data é certa (10/05/2026): entra para todo mundo

**Contexto no celular (D-043, D-053):**

- **Jonas:** A revisão da moto está marcada na concessionária: relação e pneu no fim, 13 mil km no ano. Na enchente de 2024, só 66% dos entregadores trabalharam.
- **Rose:** Você se inscreveu no curso de alongamento em gel, R$ 1.500 com kit. Semana do Dia das Mães: a procura sobe, e a coluna dói.
- **Marcos:** Os 4 pneus estão encomendados na borracharia: careca é multa de R$ 195,23, 5 pontos e carro retido. Na chuva, a corrida fica mais cara.
- **Bruna:** Você reservou a vaga na mentoria: 12 vezes de R$ 166, e a promessa de crescer. Só 1,4% das aspirantes passam de 5 mil seguidores em 4 meses.
- **Kauã:** Você se matriculou no cursinho do Enem, que custa um dia de trabalho por semana. Pedalar de noite, na chuva e no frio, dá promoção.
- **Daiane:** Dia das Mães: o anúncio no Instagram já está programado, 12,15% mais caro desde janeiro. As encomendas de bolo e cesta sobem.

#### A. Entrar na associação dos trabalhadores

- **Narrativa:** Entrei na associação: mensalidade e um dia na assembleia. Se o app me bloquear, agora tem advogado do meu lado; se eu me acidentar, ela não paga nada.
  - Daiane: Entrei na associação de quem trabalha por plataforma. Mensalidade e um dia de reunião: se derrubarem meu perfil, tem advogado para recorrer.
  - Bruna: Entrei num coletivo de criadoras com advogado. Mensalidade e um dia de reunião: se derrubarem minha conta, tem quem recorra.
- **Efeitos:**

  - **Jonas**: −R$ 89 · um dia na assembleia [1]
  - **Rose**: −R$ 70 · um dia na assembleia [1]
  - **Marcos**: −R$ 96 · um dia na assembleia [1]
  - **Bruna**: −R$ 23 · um dia na assembleia [1]
  - **Kauã**: −R$ 46 · um dia na assembleia [1]
  - **Daiane**: −R$ 25 · um dia na assembleia [1]
  - **Todos**: −R$ 60, custo fixo · mensalidade da associação [2]
  - **Todos**: proteção +2, energia −3 · não estou mais sozinho: a rotina continua
  - *Fonte [1]:* Um dia de trabalho (1/60 do bimestre). CUT (23/07/2026): Simtrapli-RS e advogado, liminar contra bloqueio em ~36 dias. A associação não dá dinheiro em acidente: não achei fundo nem ajuda em nenhuma de Porto Alegre (pesquisa de 29/09)
  - *Fonte [2]:* R$ 29,90 por mês na Asmopli-MG (orientação jurídica, apoio em acidente) e R$ 15,90 no Sincaap-BA (jurídico, recurso de multa); não achei a de Porto Alegre. Duas no bimestre

#### B. Manter o combinado: investir no trabalho (padrão)

- **Como cada ofício diz (D-054):** Jonas: "Manter a revisão na concessionária"; Marcos: "Manter a troca dos quatro pneus"; Kauã: "Manter o cursinho do Enem à noite"; Rose: "Manter o curso de alongamento em gel"; Daiane: "Manter o anúncio do Dia das Mães"; Bruna: "Manter a mentoria em 12 vezes".
- **Narrativa:** Mantive o combinado e investi no trabalho. Tirei dinheiro de onde não tinha, e pode voltar depois, ou não voltar.
  - Jonas: Troquei relação e pneu com peça original, na garantia. Paguei R$ 522 agora para a moto não me deixar na mão.
  - Marcos: Troquei os quatro pneus por R$ 1.600. Pneu careca é multa e carro retido, e a chuva não perdoa.
  - Kauã: Fiz o cursinho do Enem à noite, um dia de trabalho por semana a menos. A prova é em novembro, e o resultado só sai no ano que vem.
  - Rose: Paguei R$ 1.500 no curso de alongamento em gel, com o kit. Gel cobra R$ 160 ou mais, se a clientela vier.
  - Daiane: Paguei R$ 449 de anúncio no Instagram para o Dia das Mães. Vendeu um pouco mais, e o alcance não parou de cair.
  - Bruna: Comprei a mentoria em 12 vezes de R$ 166. O mentor diz que quem não cresce não aplicou o método direito.
- **Efeitos:**

  - **Jonas**: −R$ 522, gasto · relação e pneu originais [1]
  - **Marcos**: −R$ 1.600, gasto · quatro pneus novos [1]
  - **Rose**: −R$ 1.500, gasto · curso de alongamento em gel, com kit [1]
  - **Kauã**: −R$ 365 · um dia por semana no cursinho [2]
  - **Kauã**: −R$ 85, gasto · inscrição do Enem [3]
  - **Daiane**: −R$ 449, custo fixo · anúncio no Instagram (12,15% mais caro) [4]
  - **Daiane**: +R$ 200 · vendas a mais pelo anúncio [5]
  - **Bruna**: −R$ 333, custo fixo · parcelas da mentoria (2 de 12) [6]
  - **Todos**: energia −3 · rotina puxada
  - **Kauã**: energia −1 · estudar e trabalhar cansa
  - *Fonte [1]:* Moto: kit de relação Honda R$ 294 + pneu traseiro R$ 228 (lojas, B); a CG 160 faz a revisão a cada 6.000 km, e o jogo roda 6.760 km por bimestre (Sindimoto-SP, via AutoPapo, 08/11/2025). Carro: pneu 175/65 R14 de R$ 196 a 540, média R$ 399, × 4 (lojas, B); pneu careca é infração grave, R$ 195,23 e 5 pontos (CTB, art. 230, XVIII). Rose: curso de alongamento em gel em Porto Alegre de R$ 497,90 a R$ 1.500 com kit (Sympla, B)
  - *Fonte [2]:* Um dia de trabalho por semana, 8 semanas no bimestre. Enem em 8 e 15/11/2026 (Querobolsa e Estratégia, M)
  - *Fonte [3]:* Enem 2026: inscrição de R$ 85 em junho (Querobolsa e Estratégia, M)
  - *Fonte [4]:* R$ 200 por mês de anúncio viram R$ 224,30 desde 01/01/2026: a Meta passou a repassar PIS/Cofins e ISS (E-commerce Brasil; Diário do Comércio, 01/2026). Dois meses
  - *Fonte [5]:* Estimativa sem fonte: o alcance orgânico caiu (engajamento no Instagram −24% em 2025, Socialinsider), e não achei quanto o anúncio devolve
  - *Fonte [6]:* CartaCapital (07/11/2024) e DeepLab/UCD (2024, p. 32): mentorias de R$ 400 a R$ 250.000, "geralmente vendidos em várias parcelas (normalmente 12)"; a de R$ 1.997 em 12 × R$ 166,42. As parcelas que passam do fim do jogo não entram no placar

#### C. Rodar até de madrugada, na chuva e no frio

- **Como cada ofício diz (D-054):** Daiane: "Cozinhar de madrugada para o Dia das Mães"; Rose: "Atender até tarde da noite e aos domingos"; Bruna: "Gravar de madrugada e postar todo dia"; Kauã: "Pedalar de madrugada, na chuva e no frio".
- **Narrativa:** Rodei até de madrugada, na chuva e no frio, atrás da promoção. Rendeu mais, e a rua à noite é outra.
  - Daiane: Cozinhei de madrugada e entreguei no fim de semana do Dia das Mães. Rendeu mais, e o corpo sentiu.
  - Rose: Atendi até tarde e aos domingos, voltando de ônibus de madrugada. Rendeu mais, e a volta para casa dá medo.
  - Bruna: Gravei de madrugada e postei todo dia, doente ou não. O alcance subiu um pouco, e eu desabei.
  - Kauã: Pedalei até de madrugada, na chuva e no frio, atrás da promoção. Rendeu mais, e a bicicleta não tem farol bom.
- **Efeitos:**

  - **Jonas**: +R$ 804 · rodei até de madrugada, na chuva [1]
  - **Rose**: +R$ 630 · atendi até tarde e aos domingos [1]
  - **Marcos**: +R$ 861 · rodei até de madrugada, na chuva [1]
  - **Bruna**: +R$ 210 · posts todo dia: um pouco mais de publi [1]
  - **Kauã**: +R$ 411 · pedalei até de madrugada, na chuva [1]
  - **Daiane**: +R$ 225 · cozinhei de madrugada [1]
  - **Todos**: energia −6 · sem descanso
  - *Fonte [1]:* Estimativa: +15% da renda do bimestre (o rascunho v2 usava +20% de um mês; no bimestre, as madrugadas não rendem o mesmo nos dois meses). Promoção de chuva de R$ 3 a R$ 12 por entrega (Metrópoles, 01/08/2025)

#### D. Desistir do combinado e manter a rotina

- **Como cada ofício diz (D-054):** Jonas: "Desmarcar a revisão e seguir rodando"; Marcos: "Cancelar os pneus e seguir rodando"; Kauã: "Largar o cursinho e seguir pedalando"; Rose: "Desistir do curso de gel"; Daiane: "Cancelar o anúncio"; Bruna: "Desistir da mentoria".
- **Narrativa:** Desisti do que estava combinado e guardei o dinheiro. Mantive a rotina, e o frio e a chuva vieram do mesmo jeito.
- **Efeitos:**

  - **Todos**: energia −3 · rotina puxada

### 3.4 Jul–ago: a regra nova do app

> O iFood lança o +Entregas: R$ 3 por entrega, com disponibilidade quase total. Em 27 de julho, entregadores protestam na Esquina Democrática, e o licenciamento vence no fim do mês.

**O que o calendário traz (para todo mundo, qualquer que seja a opção):**

- **Jonas**: −R$ 114, custo fixo · licenciamento [1]
- **Marcos**: −R$ 114, custo fixo · licenciamento [1]
- *Fonte [1]:* AutoPapo (Detran-RS, 2026): licenciamento de R$ 114,09 até 31/07, sem parcelar, e só com as multas quitadas

**Contexto no celular (D-043, D-053):**

- **Jonas:** No +Entregas, o iFood diz que se ganha de 10% a 30% a mais; os entregadores dizem que é R$ 3 por entrega e 12 horas na rua.
- **Rose:** O app propõe agenda fixa, em qualquer bairro. A dor nas costas voltou, e o anti-inflamatório não entra na Farmácia Popular.
- **Marcos:** Licenciamento de R$ 114,09 até 31/07, com as multas quitadas. A embreagem começou a patinar, e o carro roda 8.800 km por bimestre.
- **Bruna:** Uma casa de apostas oferece R$ 800 por um post. Desde 17/07 é proibido usar influenciador para induzir a apostar, e perfis estão caindo.
- **Kauã:** O +Entregas vale para bicicleta também: R$ 3 por entrega. A corrente e a pastilha de freio estão no fim.
- **Daiane:** Uma lanchonete quer 200 doces por semana, pagando pouco. O remédio do menino acabou, e a consulta do posto não tem data.

#### A. Entrar no +Entregas

- **Como cada ofício diz (D-054):** Marcos: "Aceitar toda corrida para não cair na taxa"; Rose: "Aceitar a agenda fixa em qualquer bairro"; Daiane: "Aceitar a encomenda fixa da lanchonete"; Bruna: "Aceitar a publi de aposta: R$ 800".
- **Narrativa:** Entrei na regra nova do app: R$ 3 por entrega e quase nenhuma recusa. Trabalhei mais para ganhar pouco mais.
  - Marcos: Aceitei toda corrida, até a que não pagava a gasolina. Era isso ou a 99 me tirar do ar, e trabalhei mais para ganhar o mesmo.
  - Rose: Aceitei agenda fixa em qualquer bairro. Mais ônibus, mais horas, e um pouco mais no fim do mês.
  - Daiane: Aceitei a encomenda fixa da lanchonete, a preço baixo. Cozinhei o dobro para ganhar pouco mais.
  - Bruna: Aceitei os R$ 800 da casa de apostas. A regra nova proíbe, e desde então vivo esperando a conta cair.
- **Efeitos:**

  - **Jonas**: +R$ 536 · no +Entregas: fixo por período e R$ 3 por entrega [1]
  - **Kauã**: +R$ 274 · no +Entregas: fixo por período e R$ 3 por entrega [1]
  - **Rose**: +R$ 420 · agenda fixa em qualquer bairro [2]
  - **Daiane**: +R$ 300 · encomenda fixa da lanchonete, a preço baixo [3]
  - **Bruna**: +R$ 800 · publi de aposta [4]
  - **Jonas e Kauã**: energia −6 · 12 horas na rua, sete dias
  - **Marcos, Rose e Daiane**: energia −5 · mais horas para ganhar pouco mais
  - **Bruna**: energia −2 · um post a mais
  - *Fonte [1]:* O iFood diz que se ganha de 10% a 30% a mais; os entregadores dizem que ganham menos (CUT-RS, 27/07/2026: "12 horas na rua, sete dias na semana, para ganhar três pila por entrega", Acergs). Usado +10% da renda do bimestre, a ponta de baixo do que o iFood diz
  - *Fonte [2]:* Estimativa: +10% da renda do bimestre (a agenda cheia). Marcos: nada a mais (a corrida que não paga a gasolina não deixa lucro; o que ele compra é não ficar fora da 99). 99: finalizar menos de 70% das corridas = 5, 10 e 15 dias fora; NailNow: a comissão de 20% continua
  - *Fonte [3]:* Estimativa sem fonte: 200 doces por semana com margem pequena
  - *Fonte [4]:* Valor sem fonte: dentro da faixa de nano (Estado de Minas, 17/06/2026: feed de R$ 200 a 2.500, B). Desde 17/07/2026 é proibido "utilizar... influenciadores para induzir o público a apostar"; cerca de 1.000 perfis de influenciadores já derrubados (Agência Brasil, 09/07/2026); PLs 3.613/2026 e 5.195/2026 em tramitação

#### B. Ir ao protesto de 27 de julho

- **Como cada ofício diz (D-054):** Daiane: "Ir ao protesto, em apoio"; Rose: "Ir ao protesto, em apoio"; Bruna: "Ir ao protesto e gravar tudo".
- **Narrativa:** Fui ao protesto da Esquina Democrática até o Praia de Belas. Perdi meio dia, e vi que não estava sozinho.
  - Bruna: Fui ao protesto e gravei tudo. Perdi meio dia de conteúdo pago, e o vídeo rodou entre os entregadores.
- **Efeitos:**

  - **Jonas**: −R$ 45 · meio dia no protesto [1]
  - **Rose**: −R$ 35 · meio dia no protesto [1]
  - **Marcos**: −R$ 48 · meio dia no protesto [1]
  - **Bruna**: −R$ 12 · meio dia no protesto [1]
  - **Kauã**: −R$ 23 · meio dia no protesto [1]
  - **Daiane**: −R$ 13 · meio dia no protesto [1]
  - **Todos**: proteção +1, energia −3 · não estou mais sozinho: a rotina continua
  - *Fonte [1]:* Meio dia sem ganho. CUT-RS (27/07/2026): entregadores protestam da Esquina Democrática até o Praia de Belas contra o "+Entregas", que paga R$ 3 por entrega

#### C. Adiar a manutenção e o remédio (padrão)

- **Como cada ofício diz (D-054):** Jonas: "Adiar a revisão da moto"; Kauã: "Adiar a corrente e o freio da bicicleta"; Marcos: "Adiar a revisão do carro"; Rose: "Adiar o remédio e a consulta"; Daiane: "Adiar o remédio e a consulta"; Bruna: "Adiar o remédio e a consulta".
- **Narrativa:** Deixei a revisão e o remédio para depois, e o dinheiro fechou o bimestre. A conta volta, e costuma voltar maior.
  - Jonas: Deixei a revisão da moto para depois, com 20 mil km rodados no ano. O dinheiro fechou o bimestre, e a moto cobra depois.
  - Marcos: Deixei a revisão do carro para depois, e a embreagem já patina. O caixa respirou.
  - Kauã: Adiei a corrente e a pastilha de freio. Sobrou um pouco, e a bicicleta range na descida.
  - Rose: Deixei o anti-inflamatório e a consulta para depois. Sobrou um pouco, e a coluna reclamou o bimestre inteiro.
  - Daiane: Adiei o remédio do menino e a minha consulta. Sobrou um pouco, e a tosse não passou.
  - Bruna: Adiei o remédio e a consulta. Sobrou um pouco, e a ansiedade piorou.
- **Efeitos:**

  - **Jonas**: +R$ 100 · revisão da moto adiada [1]
  - **Kauã**: +R$ 60 · corrente e freio adiados [1]
  - **Marcos**: +R$ 300 · revisão do carro adiada [1]
  - **Rose**: +R$ 180 · remédio adiado [2]
  - **Daiane**: +R$ 120 · remédio adiado [2]
  - **Bruna**: +R$ 120 · remédio adiado [2]
  - **Todos**: energia −3 · rotina puxada
  - *Fonte [1]:* A retirada da PNAD já desconta a manutenção média (Notas técnicas v1.5, p. 35-36): adiar a revisão devolve ao caixa parte de um mês dela (estimativa: o que dá para adiar, e não pneu e óleo). Moto: R$ 200 por mês (Sindimoto-SP, via AutoPapo, 08/11/2025); carro: R$ 615 por mês (Cebrap/Amobitec 2025, financiado pelas plataformas); bicicleta: corrente de R$ 60 a 120 e pastilha de R$ 50 a 150 (Velodrome, B). A conta volta na carta "Quebrou", mais provável daqui em diante
  - *Fonte [2]:* Dois meses do item "remédios" do básico da casa (estimativa, POF 2017-2018): o bimestre inteiro sem o remédio. O remédio cortado entra como mais chance de adoecer

#### D. Tirar uma semana de folga

- **Narrativa:** Tirei uma semana inteira de folga, a primeira do ano. O dinheiro dessa semana fez falta, e voltei com o corpo inteiro.
- **Efeitos:**

  - **Jonas**: −R$ 625 · uma semana sem trabalhar [1]
  - **Rose**: −R$ 490 · uma semana sem trabalhar [1]
  - **Marcos**: −R$ 670 · uma semana sem trabalhar [1]
  - **Bruna**: −R$ 163 · uma semana sem trabalhar [1]
  - **Kauã**: −R$ 320 · uma semana sem trabalhar [1]
  - **Daiane**: −R$ 175 · uma semana sem trabalhar [1]
  - **Todos**: energia +1 · uma semana de descanso
  - *Fonte [1]:* Uma semana (7 dias) sem ganho: 7/60 do trabalho do bimestre

### 3.5 Set–out: breque geral

> Em 1º de setembro, entregadores param o país: R$ 10 por corrida curta e fim do +Entregas. No mesmo dia, o concorrente paga até R$ 9 a mais por entrega para quem furar. A Farroupilha lota o Harmonia.

**O que o calendário traz (para todo mundo, qualquer que seja a opção):**

- nada além dos repetidos.

**Contexto no celular (D-043, D-053):**

- **Jonas:** Breque geral dia 1º: furar fica marcado entre os colegas, aderir custa o dia. O Acampamento Farroupilha recebe 1,1 milhão de visitantes.
- **Rose:** Recusar atendimento longe esvazia a agenda: o app mostra menos quem recusa. A Farroupilha lota a cidade no fim de semana.
- **Marcos:** Farroupilha lotado no Harmonia: mais corridas à noite. Na 99, recusar demais tira você do ar por 5, 10 e 15 dias.
- **Bruna:** O algoritmo mudou de novo, sem aviso: o alcance caiu. O engajamento no Instagram caiu 24% em um ano.
- **Kauã:** No breque, o concorrente paga até R$ 9 a mais por entrega para quem rodar. Recusar 7 pedidos seguidos dá 15 minutos fora.
- **Daiane:** Encomendas de Farroupilha e de Dia das Crianças. Cliente que pede desconto e some depois do sinal.

#### A. Jornada de sempre (padrão)

- **Narrativa:** Mantive a rotina no mês do breque, sem parar e sem furar. O bimestre passou, e a conta também.
- **Efeitos:**

  - **Todos**: energia −3 · rotina puxada

#### B. Recusar o que não paga

- **Como cada ofício diz (D-054):** Daiane: "Recusar encomenda sem margem"; Rose: "Recusar atendimento longe e barato"; Bruna: "Recusar permuta e cobrar em dinheiro".
- **Narrativa:** Recusei corrida e pedido que não pagavam o custo. Ganhei menos no total, e o app passou a me esconder.
  - Daiane: Recusei encomenda sem margem e cliente que pede desconto. Vendi menos, e dormi mais.
  - Rose: Recusei atendimento do outro lado da cidade. Ganhei menos, e o app passou a me mostrar menos.
  - Bruna: Recusei permuta e cobrei em dinheiro. Duas marcas sumiram, e descansei um pouco.
- **Efeitos:**

  - **Jonas**: −R$ 268 · recusei o que não pagava: ganhei 5% menos [1]
  - **Rose**: −R$ 210 · recusei o que não pagava: ganhei 5% menos [1]
  - **Marcos**: −R$ 287 · recusei o que não pagava: ganhei 5% menos [1]
  - **Bruna**: −R$ 70 · recusei o que não pagava: ganhei 5% menos [1]
  - **Kauã**: −R$ 137 · recusei o que não pagava: ganhei 5% menos [1]
  - **Daiane**: −R$ 75 · recusei o que não pagava: ganhei 5% menos [1]
  - **Todos**: energia −2 · menos horas para ganhar quase o mesmo
  - *Fonte [1]:* Estimativa: −5% da renda do bimestre. 99: finalizar menos de 70% das corridas = 5, 10 e 15 dias fora (página oficial); iFood: 7 recusas seguidas = 15 minutos fora (Metrópoles, 01/08/2025); YouPix/Brunch 2023: 70% das criadoras aceitaram valor abaixo do que pediram

#### C. Aderir ao breque geral

- **Como cada ofício diz (D-054):** Daiane: "Parar um dia, em apoio ao breque"; Rose: "Parar um dia, em apoio ao breque"; Bruna: "Parar um dia, em apoio ao breque".
- **Narrativa:** Parei no breque de 1º de setembro, junto com o país. Perdi o dia, e a pauta chegou ao jornal.
- **Efeitos:**

  - **Jonas**: −R$ 89 · um dia parado no breque [1]
  - **Rose**: −R$ 70 · um dia parado no breque [1]
  - **Marcos**: −R$ 96 · um dia parado no breque [1]
  - **Bruna**: −R$ 23 · um dia parado no breque [1]
  - **Kauã**: −R$ 46 · um dia parado no breque [1]
  - **Daiane**: −R$ 25 · um dia parado no breque [1]
  - **Todos**: proteção +1, energia −3 · não estou mais sozinho: a rotina continua
  - *Fonte [1]:* Um dia sem ganho (1/60 do bimestre). Breque geral de 01/09/2026: R$ 10 por corrida de até 4 km, R$ 2,50 por km, fim do +Entregas e transparência nos bloqueios (Metrópoles, 01/09/2026). Até agora, sem reajuste

#### D. Furar o breque e rodar a Farroupilha

- **Como cada ofício diz (D-054):** Marcos: "Rodar todas as noites da Farroupilha"; Rose: "Atender todo fim de semana da Farroupilha"; Daiane: "Fazer encomendas de Farroupilha toda noite"; Bruna: "Cobrir a Farroupilha e postar todo dia".
- **Narrativa:** Rodei no dia do breque pelo bônus e fiz toda noite da Farroupilha. Rendeu mais, e virei o fura-greve da quadra.
  - Marcos: Rodei todas as noites da Farroupilha, até tarde. Rendeu mais, e dormi cinco horas por noite.
  - Rose: Atendi todo fim de semana da Farroupilha. Rendeu mais, e voltei de ônibus tarde da noite.
  - Daiane: Cozinhei toda noite para a Farroupilha e para o Dia das Crianças. Vendeu mais, e o menino dormiu sem mim.
  - Bruna: Cobri a Farroupilha todo dia, com duas publis de lojas do Harmonia. Rendeu um pouco, e eu mal dormi.
- **Efeitos:**

  - **Jonas**: +R$ 150 · bônus do concorrente no dia do breque [1]
  - **Kauã**: +R$ 90 · bônus do concorrente no dia do breque [1]
  - **Jonas**: +R$ 670 · noites e fins de semana da Farroupilha [2]
  - **Kauã**: +R$ 343 · noites e fins de semana da Farroupilha [2]
  - **Marcos**: +R$ 718 · noites e fins de semana da Farroupilha [2]
  - **Rose**: +R$ 420 · fins de semana da Farroupilha [2]
  - **Daiane**: +R$ 150 · encomendas da Farroupilha [2]
  - **Bruna**: +R$ 400 · duas publis de lojas do Harmonia [2]
  - **Todos**: energia −6 · noites sem dormir
  - *Fonte [1]:* Metrópoles (01/09/2026) e Correio Braziliense (31/08/2026): durante o breque, 99Food e Keeta ofereceram até R$ 9 a mais por entrega (visto em São Paulo). Estimativa: Jonas ~17 entregas, Kauã ~10
  - *Fonte [2]:* Acampamento Farroupilha de 29/08 a 20/09/2026, mais de 1,1 milhão de visitantes no Parque Harmonia (Jornal do Comércio, 09/2026): sem número de ganho. Estimativa: +25% de um mês para quem roda (três semanas de acampamento, noites e fins de semana) e +20% para a Rose e a Daiane (a Bruna, 2 publis de R$ 200, na ponta de baixo da tabela de nano do Estado de Minas, B)

### 3.6 Nov–dez: Black Friday, Natal e nenhum 13º

> Novembro tem Black Friday e conta de luz mais cara; dezembro tem 16% mais pedidos. Quem tem carteira recebe o 13º até 20 de dezembro, e ninguém destas casas tem.

**O que o calendário traz (para todo mundo, qualquer que seja a opção):**

- **Jonas**: +R$ 429 · dezembro: 16% mais pedidos [1]
- **Kauã**: +R$ 219 · dezembro: 16% mais pedidos [1]
- **Marcos**: +R$ 290 · dezembro: a corrida fica mais cara [1]
- **Rose**: +R$ 420 · dezembro: agenda cheia [1]
- **Daiane**: +R$ 263 · Natal: encomendas (+35% num mês) [1]
- **Daiane**: energia −2 · Natal na cozinha
- **Jonas**: −R$ 39, gasto · luz 24,24% mais cara em dezembro [2]
- **Rose**: −R$ 39, gasto · luz 24,24% mais cara em dezembro [2]
- **Marcos**: −R$ 47, gasto · luz 24,24% mais cara em dezembro [2]
- **Bruna**: −R$ 31, gasto · luz 24,24% mais cara em dezembro [2]
- **Kauã**: −R$ 39, gasto · luz 24,24% mais cara em dezembro [2]
- **Daiane**: −R$ 31, gasto · luz 24,24% mais cara em dezembro [2]
- **Kauã** (quem escolheu B em mai–jun): −R$ 91 · as duas últimas semanas de cursinho, até a prova [3]
- **Kauã** (quem escolheu B em mai–jun): −R$ 91 · os dois domingos do Enem [4]
- *Fonte [1]:* Jonas e Kauã: iFood, release de 30/10/2023, dezembro de 2022 com pedidos 16% acima da média (é a demanda; a renda proporcional é conta nossa, confiança baixa). Marcos: IPCA (SIDRA 7060), "transporte por aplicativo" em Porto Alegre, +19,88% em dez/2024 e +17,75% em dez/2025 (preço do passageiro; usada metade de 20% de um mês). Rose: Folha Vitória (13/12/2024), expectativa de +20% a 70% no faturamento dos salões no fim de ano (outra UF, B). Daiane: Agência Sebrae MA (26/03/2024), até +35%. A data é certa: entra para todo mundo
- *Fonte [2]:* Sul21 (08/2026): a CEEE Equatorial propõe +24,24% na baixa tensão a partir de 22/11/2026, ainda em consulta pública (não é definitivo). Um mês, sobre a conta de luz do básico
- *Fonte [3]:* Um dia de trabalho por semana de 1 a 15/11, até a 2ª prova do Enem (15/11/2026): 2 dias × R$ 45,67 (Querobolsa e Estratégia, M)
- *Fonte [4]:* Enem em 8 e 15/11/2026: dois dias sem pedalar (2/30 da renda do mês)

**Contexto no celular (D-043, D-053):**

- **Jonas:** Dezembro tem 16% mais pedidos no iFood. Quem tem carteira recebe o 13º até dia 20; aqui, ninguém. A conta de luz pode subir 24%.
- **Rose:** Formatura e festa enchem a agenda. A manicure ficou 11,6% mais cara em um ano, e o app continua com 20%. Nenhum 13º na casa.
- **Marcos:** Em dezembro a corrida sobe quase 20% para o passageiro. Em janeiro, o carro de 2016 sai da 99, e sobra a Uber.
- **Bruna:** Na Black Friday, cinco publis. O pagamento só cai depois do Carnaval, já no ano que vem.
- **Kauã:** O Enem foi dias 8 e 15. Dezembro tem 16% mais pedidos, e a irmã quer um presente de Natal.
- **Daiane:** Natal: encomendas de panetone e doce sobem. Na Black Friday, promoção é vender mais barato. Nenhum 13º, nenhuma pensão.

#### A. Apertar o cinto: cortar comida e remédio

- **Narrativa:** Cortei a carne, a fruta e o remédio que não era urgente. Sobrou um pouco, e a casa passou a comer pior no fim do ano.
- **Efeitos:**

  - **Jonas**: +R$ 168 · cortei carne, fruta e remédio [1]
  - **Rose**: +R$ 201 · cortei carne, fruta e remédio [1]
  - **Marcos**: +R$ 201 · cortei carne, fruta e remédio [1]
  - **Bruna**: +R$ 134 · cortei carne, fruta e remédio [1]
  - **Kauã**: +R$ 168 · cortei carne, fruta e remédio [1]
  - **Daiane**: +R$ 100 · cortei carne, fruta e remédio [1]
  - **Todos**: energia −4 · jornada de sempre, comendo pior
  - *Fonte [1]:* Estimativa: ~4% da comida da casa (cesta × adultos), nos 2 meses; o remédio cortado entra como mais chance de adoecer. Ação da Cidadania/UFRJ (2024): 32% dos entregadores em insegurança alimentar

#### B. Trabalhar em dobro no fim de ano

- **Como cada ofício diz (D-054):** Bruna: "Fazer cinco publis na Black Friday".
- **Narrativa:** Trabalhei todo dia de novembro e dezembro, até a véspera do Natal. Rendeu mais, e fiquei um caco.
  - Bruna: Fiz cinco publis na Black Friday e postei todo dia. O dinheiro só cai depois do Carnaval, e o cansaço veio agora.
  - Daiane: Cozinhei todo dia de novembro e dezembro, panetone de madrugada. Vendeu mais, e fiquei um caco.
  - Rose: Atendi todo dia até a véspera do Natal, formatura e festa. Rendeu mais, e a coluna travou.
- **Efeitos:**

  - **Jonas**: +R$ 1.040 · horas a mais (as piores horas do dia) [1]
  - **Rose**: +R$ 980 · horas a mais (as piores horas do dia) [1]
  - **Marcos**: +R$ 1.300 · horas a mais (as piores horas do dia) [1]
  - **Kauã**: +R$ 210 · horas a mais (as piores horas do dia) [1]
  - **Daiane**: +R$ 350 · horas a mais (as piores horas do dia) [1]
  - **Todos**: energia −7 · dois meses sem folga
  - *Fonte [1]:* Estimativa: +20 h/semana a ~53% do ganho-hora (pacote B de calibragem, D-024), nos 2 meses. Kauã: menos, porque já pedala de 9 a 12 h por dia (Aliança Bike, 2019). Bruna: mais posts, mais publis (estimativa sem fonte)

#### C. Folga no Natal com a família

- **Narrativa:** Parei uma semana no Natal para ficar com os meus. Perdi a semana mais cheia do ano, e ninguém me devolve esse dinheiro.
- **Efeitos:**

  - **Jonas**: −R$ 625 · uma semana de folga no Natal [1]
  - **Rose**: −R$ 490 · uma semana de folga no Natal [1]
  - **Marcos**: −R$ 670 · uma semana de folga no Natal [1]
  - **Bruna**: −R$ 163 · uma semana de folga no Natal [1]
  - **Kauã**: −R$ 320 · uma semana de folga no Natal [1]
  - **Daiane**: −R$ 175 · uma semana de folga no Natal [1]
  - *Fonte [1]:* Uma semana (7 dias) sem ganho: 7/60 do trabalho do bimestre

#### D. Jornada de sempre (padrão)

- **Narrativa:** Mantive a rotina até o fim do ano. Sem 13º, o ano fechou do jeito que dava.
- **Efeitos:**

  - **Todos**: energia −3 · rotina puxada

---

## 4. Cartas

Uma carta por equipe e por bimestre (D-013). O peso é relativo: a chance é o peso dividido pela soma dos pesos das cartas possíveis naquele estado, e aparece só no sorteio (D-012). "Dias parados" é o que a tela mostra como custo real (D-052); a renda perdida já está no efeito.

| Carta | Curto | Peso base | Quando | Quem | Dias parados | Tom |
|---|---|---|---|---|---|---|
| Um bimestre como os outros | Normal | 40 | todo bimestre | todos | — | — |
| Promoções e desafios do bimestre | Promoção | 12 | todo bimestre | todos | — | — |
| Temporal em Porto Alegre | Temporal | 8 | Mai–jun, Jul–ago, Set–out | todos | — | — |
| A água subiu | Enchente | 3 | Mai–jun | todos | 10 | grave |
| 40 °C às 14h | Calor | 8 | Jan–fev | Jonas, Kauã e Rose | 2 | — |
| O instrumento de trabalho quebrou | Quebrou | 6 | todo bimestre | todos | 3 | — |
| Adoeci: uma semana parado | Doença | 8 | todo bimestre | todos | 7 | — |
| A dor nas costas travou | Dor | 2 | todo bimestre | todos | 7 | — |
| Queda leve: 5 dias parado | Queda | 0 | todo bimestre | Jonas, Kauã e Marcos | 5 | — |
| Acidente: fratura, 45 dias parado | Fratura | 1 | todo bimestre | todos | 45 | grave |
| A perícia do INSS negou o auxílio | INSS negou | 0 | Mar–abr, Mai–jun, Jul–ago, Set–out, Nov–dez | todos | — | grave |
| Conta bloqueada sem explicação | Bloqueio | 2 | todo bimestre | todos | 45 | grave |
| Fui assaltado | Assalto | 0 | todo bimestre | Jonas, Kauã, Marcos e Rose | 3 | grave |
| Trabalhei e não recebi | Não pagou | 8 | todo bimestre | todos | — | — |
| O app apertou a taxa | Taxa | 6 | Mar–abr, Set–out | Jonas, Kauã, Daiane e Marcos | — | — |
| A mobilização arrancou um reajuste | Reajuste | 1 | Mai–jun, Jul–ago, Set–out, Nov–dez | Jonas e Kauã | — | — |
| Um vídeo viralizou | Viralizou | 4 | todo bimestre | Bruna | — | — |
| Esgotei: burnout | Burnout | 2 | todo bimestre | Bruna | 15 | — |
| O algoritmo derrubou o alcance | Alcance | 6 | todo bimestre | Bruna e Daiane | — | — |
| Cortaram a luz | Sem luz | 0 | todo bimestre | todos | — | grave |
| O dono entrou com o despejo | Despejo | 0 | todo bimestre | todos | — | grave |

**O risco que cresce com os meses (D-063): a conta.** A regra (01/10, à tarde): no plano padrão, com a carta "Normal" em todos os bimestres, a **chance** de cada carta de desgaste ("Quebrou", "Dor", "Bloqueio", "Alcance" e "Burnout") nunca cai de um bimestre para o seguinte e chega em nov–dez a pelo menos 1,25 vez a de jan–fev ("Alcance", 1,33 vez, a queda de 24% do engajamento em 12 meses; "Dor", 1,5 vez, e a da Rose, 2 vezes, porque a manicure tem a maior prevalência de dor das fontes). Os pesos sobem por persona e por bimestre, o mínimo que cumpre a regra, porque o resto do baralho também sobe (a doença com a energia baixa e o remédio adiado, o temporal, as cartas de atraso). As duas quedas da tabela vêm da própria escolha do padrão, e ficam: "Bloqueio" em mar–abr (aceitar tudo multiplica por 0,4) e "Quebrou" do Jonas e do Marcos em mai–jun (a revisão corta pela metade dali em diante). O *quando* vem da pesquisa de desgaste (30/09): a moto roda 6.760 km por bimestre e passa dos 20 mil km no fim de mai–jun, onde acabam o pneu traseiro (15 a 20 mil km) e começa a acabar a relação (20 a 30 mil km); o 2º pneu acaba em set–dez; o carro roda 8.800 km e chega aos 40 a 60 mil km dos pneus só em set–dez. O *quanto* é estimativa nossa: as fontes dizem quando a peça chega ao fim, e não com que chance quebra antes da troca; a dor das fontes é a de quem tem anos de ofício, e não o aumento em 12 meses; o bloqueio das fontes cresce com a repetição (5, 10 e 15 dias na 99), e não com o calendário. A tabela traz também a carta "Normal" e as duas cartas de atraso:

| Personagem | Carta | Jan–fev | Mar–abr | Mai–jun | Jul–ago | Set–out | Nov–dez |
|---|---|---|---|---|---|---|---|
| Jonas | Um bimestre como os outros | 38,1% | 38,4% | 35,9% | 19,5% | 18,6% | 14,7% |
| Jonas | O instrumento de trabalho quebrou | 5,7% | 7,7% | 2,7% | 7,9% | 8,2% | 8,2% |
| Jonas | A dor nas costas travou | 1,9% | 2,2% | 2,5% | 2,6% | 2,8% | 2,9% |
| Jonas | Conta bloqueada sem explicação | 1,9% | 0,8% | 2,2% | 2,3% | 2,3% | 2,4% |
| Jonas | Cortaram a luz | 0,0% | 0,0% | 0,0% | 3,1% | 2,9% | 2,3% |
| Jonas | O dono entrou com o despejo | 0,0% | 0,0% | 0,0% | 0,0% | 0,0% | 1,8% |
| Rose | Um bimestre como os outros | 44,9% | 45,8% | 27,8% | 17,5% | 17,0% | 17,7% |
| Rose | O instrumento de trabalho quebrou | 6,7% | 9,2% | 9,2% | 9,3% | 9,4% | 9,8% |
| Rose | A dor nas costas travou | 2,2% | 2,9% | 3,3% | 3,7% | 4,1% | 4,6% |
| Rose | Conta bloqueada sem explicação | 2,2% | 0,9% | 2,6% | 2,7% | 2,8% | 2,9% |
| Rose | Cortaram a luz | 0,0% | 5,7% | 7,0% | 8,2% | 7,9% | 8,3% |
| Rose | O dono entrou com o despejo | 0,0% | 0,0% | 2,8% | 4,4% | 4,2% | 4,4% |
| Marcos | Um bimestre como os outros | 43,5% | 39,1% | 27,9% | 20,7% | 15,3% | 16,1% |
| Marcos | O instrumento de trabalho quebrou | 6,5% | 7,8% | 2,1% | 8,1% | 8,1% | 8,5% |
| Marcos | A dor nas costas travou | 2,2% | 2,4% | 2,6% | 2,9% | 3,1% | 3,3% |
| Marcos | Conta bloqueada sem explicação | 2,2% | 0,8% | 2,4% | 2,6% | 2,6% | 2,8% |
| Marcos | Cortaram a luz | 0,0% | 0,0% | 3,5% | 3,2% | 4,8% | 5,0% |
| Marcos | O dono entrou com o despejo | 0,0% | 0,0% | 0,0% | 2,6% | 1,9% | 4,0% |
| Bruna | Um bimestre como os outros | 44,0% | 42,2% | 32,8% | 15,9% | 14,8% | 15,0% |
| Bruna | O instrumento de trabalho quebrou | 6,6% | 8,4% | 8,6% | 8,7% | 8,7% | 8,8% |
| Bruna | A dor nas costas travou | 2,2% | 2,6% | 2,7% | 3,0% | 3,1% | 3,4% |
| Bruna | Conta bloqueada sem explicação | 2,2% | 2,4% | 2,5% | 2,6% | 2,7% | 2,8% |
| Bruna | O algoritmo derrubou o alcance | 6,6% | 7,1% | 7,6% | 7,9% | 8,3% | 8,8% |
| Bruna | Esgotei: burnout | 2,2% | 2,4% | 2,5% | 4,5% | 4,5% | 4,6% |
| Bruna | Cortaram a luz | 0,0% | 0,0% | 4,1% | 5,0% | 6,9% | 7,0% |
| Bruna | O dono entrou com o despejo | 0,0% | 0,0% | 3,3% | 2,0% | 3,7% | 3,7% |
| Kauã | Um bimestre como os outros | 39,6% | 40,0% | 33,8% | 17,0% | 12,8% | 13,3% |
| Kauã | O instrumento de trabalho quebrou | 5,9% | 8,0% | 8,0% | 20,2% | 20,4% | 21,1% |
| Kauã | A dor nas costas travou | 2,0% | 2,2% | 2,5% | 2,7% | 2,8% | 3,0% |
| Kauã | Conta bloqueada sem explicação | 2,0% | 0,8% | 2,3% | 2,4% | 2,4% | 2,5% |
| Kauã | Cortaram a luz | 0,0% | 0,0% | 4,2% | 5,3% | 4,0% | 6,2% |
| Kauã | O dono entrou com o despejo | 0,0% | 0,0% | 0,0% | 2,1% | 3,2% | 3,3% |
| Daiane | Um bimestre como os outros | 47,1% | 39,6% | 25,7% | 16,4% | 15,1% | 16,2% |
| Daiane | O instrumento de trabalho quebrou | 7,1% | 7,9% | 8,0% | 8,2% | 8,5% | 9,1% |
| Daiane | A dor nas costas travou | 2,4% | 2,7% | 2,9% | 3,1% | 3,3% | 3,5% |
| Daiane | Conta bloqueada sem explicação | 2,4% | 2,5% | 2,7% | 2,8% | 2,8% | 3,0% |
| Daiane | O algoritmo derrubou o alcance | 7,1% | 7,7% | 8,0% | 8,5% | 9,0% | 9,6% |
| Daiane | Cortaram a luz | 0,0% | 5,0% | 6,4% | 5,1% | 7,1% | 7,6% |
| Daiane | O dono entrou com o despejo | 0,0% | 0,0% | 2,6% | 4,1% | 3,8% | 4,0% |

O salto de jul–ago em diante no "Quebrou" de moto, carro e bicicleta vem também do padrão de jul–ago (adiar a manutenção multiplica a carta por 4 até dezembro). Com esses pesos, a chance de ser bloqueado em algum bimestre do ano, no padrão, fica de 11% (Jonas) a 15% (Daiane), perto dos 15,5% da GigU, que é de quem já foi bloqueado alguma vez, e não num ano. Os aumentos de cada persona estão em cada carta, abaixo ("+x no peso (persona), em bimestre"); a fonte de cada carta explica de onde vem o *quando*.

**A mesma conta nas partidas sorteadas (05/10, achado da revisão).** A tabela acima é o caminho em que sai a carta "Normal" em todos os bimestres, e o "nunca cai" vale só nele. Medi também a chance média em 20 mil partidas sorteadas por persona, no plano padrão (o mesmo motor, cartas pelas chances, semente fixa; outra semente dá as mesmas quedas, a menos de 0,01 ponto). A tendência do ano é a mesma (nov–dez acima de jan–fev em todas as cartas), mas a média recua um pouco em alguns bimestres, porque na casa que já atrasou contas ou se cansou a doença (com a energia baixa), o corte de luz e o despejo ganham espaço no sorteio e diluem o resto; o risco de alguma carta ruim, somado, sobe de 38% a 50% em jan–fev para 76% a 82% em nov–dez. Fora as duas quedas do próprio padrão (as da tabela), as que passam de 0,05 ponto:

| Personagem | Carta | De | Para | Bimestre |
|---|---|---|---|---|
| Jonas | O instrumento de trabalho quebrou | 7,2% | 6,4% | set–out |
| Kauã | O instrumento de trabalho quebrou | 7,9% | 6,9% | mai–jun |
| Bruna | O instrumento de trabalho quebrou | 8,3% | 7,9% | mai–jun |
| Jonas | A dor nas costas travou | 2,36% | 2,16% | set–out |
| Marcos | A dor nas costas travou | 2,54% | 2,48% | jul–ago |
| Bruna | A dor nas costas travou | 2,59% | 2,44% | mai–jun |
| Jonas | Conta bloqueada sem explicação | 1,98% | 1,71% | set–out |
| Marcos | Conta bloqueada sem explicação | 2,30% | 2,09% | jul–ago |
| Bruna | Conta bloqueada sem explicação | 2,28% | 2,14% | mai–jun |
| Daiane | Conta bloqueada sem explicação | 2,61% | 2,55% | set–out |
| Bruna | O algoritmo derrubou o alcance | 6,99% | 6,94% | mai–jun |

O "Bloqueio" sai no máximo uma vez por partida, e quem já foi bloqueado entra na média com chance zero: nas partidas sorteadas, nov–dez fica em 1,13 a 1,15 vez jan–fev (e não 1,25); para quem ainda não foi bloqueado, em 1,23 a 1,29 vez. A "Dor" da Rose e da Daiane, o "Alcance" e o "Quebrou" da Daiane e o "Burnout" da Bruna nunca caem também nas partidas sorteadas. Não subi os pesos para apagar essas quedas: elas vêm do resto do risco, que cresce mais depressa na casa que já se deu mal, e não do desgaste, e apagá-las mudaria o equilíbrio do jogo inteiro (a conferência do validador). As fontes das quatro cartas dizem agora que o "nunca cai" é do caminho da carta "Normal" e trazem as quedas das partidas sorteadas.

**Em quase todas as cartas, o auxílio do INSS pelo MEI:** quem abriu o MEI em jan–fev e tirou "Acidente: fratura" num bimestre recebe **+R$ 2.431** (categoria proteção, "a proteção pagou") no bimestre seguinte, com qualquer carta menos "A perícia do INSS negou o auxílio", que ganha +100 no peso nesse bimestre (~50% de chance, D-059). Fonte: Lei 8.213/1991: art. 59 (só acima de 15 dias parado), art. 60 (o autônomo recebe desde o 1º dia se pedir em até 30 dias), art. 26 II (acidente dispensa carência), art. 27 II (só vale o DAS pago em dia antes do acidente: quem abre o MEI em jan–fev paga o primeiro DAS na hora); 45 dias de 1 salário mínimo (R$ 1.621 por mês desde 01/01/2026, Decreto 12.797/2025, art. 1º; o auxílio por incapacidade nunca é menor que 1 salário mínimo, Lei 8.213/1991, art. 33): 1,5 × R$ 1.621 = R$ 2.431,50, R$ 2.431 no jogo. Decisão média de 34 dias (Agência Brasil, 03/09/2026): o dinheiro chega no bimestre seguinte. Vai em cada carta, e não nos efeitos gerais, porque a carta "A perícia do INSS negou" é do mesmo bimestre (D-059: a tela só diz "a proteção pagou" quando pagou).

### Um bimestre como os outros (`normal`, "Normal")

- **Narrativa:** Nenhuma surpresa a mais neste bimestre. A conta da casa chegou igual.
- **Peso base:** 40.
- **Ajustes de peso:**
  - −8 no peso, em jul–ago, set–out ou nov–dez
- **Efeitos:**

  - nenhum além do auxílio do INSS, quando vale.

- **Fonte da carta:** Estimativa sem fonte, a contrapartida do desgaste: de jul–ago em diante o peso cai de 40 para 32 (−20%), porque as cartas de desgaste ganham peso e um bimestre "sem nada" fica menos comum. Conta: a chance é o peso sobre a soma dos pesos possíveis; no plano padrão, "Normal" sai de 38% a 47% em jan–fev para 13% a 18% em nov–dez (o padrão de jul–ago adia a manutenção, que multiplica "Quebrou" por 4 nos veículos)

### Promoções e desafios do bimestre (`promocao`, "Promoção")

- **Narrativa:** Peguei as promoções e os desafios do app, ou entrou uma encomenda maior. Não dá para contar com isso no bimestre que vem.
- **Peso base:** 12.
- **Ajustes de peso:**
  - +6 no peso, em jan–fev, na opção A
  - +3 no peso, em mar–abr, na opção B
- **Efeitos:**

  - **Jonas**: +R$ 460 · promoções e a meta de um desafio
  - **Kauã**: +R$ 310 · promoções e desafios do bimestre
  - **Marcos**: +R$ 600 · desafios da 99 e da Uber
  - **Daiane**: +R$ 330 · duas encomendas grandes
  - **Rose**: +R$ 320 · noiva e madrinhas
  - **Bruna**: +R$ 400 · uma marca pagou em dinheiro
  - **Todos**: energia −1 · corri atrás do bônus

- **Fonte da carta:** Entregadores: iFood, "Entenda as mecânicas… de cada tipo de promoção" (2026): R$ 30 por ficar ativo das 18h às 21h59, +R$ 3 ou +30% por rota; 4 noites por mês × R$ 30 a 48, nos 2 meses (~R$ 310). Marcos: blog da 99 (31/03/2022), "5 corridas para ganhar R$ 120"; 2 desafios por mês (confiança baixa). A carta da meta (Jonas: "a cinco corridas de destravar um bônus de R$ 600", Metrópoles, 01/08/2025, casal de São Paulo; o regulamento do "Destravou, Ganhou" diz "em fase de testes… algumas regiões") entrou aqui pelo valor esperado (3% × R$ 600 e 3% × R$ 480, somados aos 12% da promoção): Jonas R$ 460 e Marcos R$ 600, para o validador de 12 meses caber em 2 minutos. Daiane: 2 encomendas de 3 centos de doce, lucro de ~R$ 165 cada (Confeitaria Armelin, Porto Alegre, via Pricelisto). Rose: noiva e madrinhas, 5 combos × R$ 80 − 20% (NailNow, 2026). Bruna: uma marca pagou em dinheiro, e não em permuta (Estado de Minas, 17/06/2026: feed de nano de R$ 200 a 2.500, B). Gorjeta não entra: ~R$ 5 a 10 por mês por entregador (IstoÉ Dinheiro, 16/12/2024)

### Temporal em Porto Alegre (`temporal`, "Temporal")

- **Narrativa:** Alerta laranja, vento e granizo. O app lançou promoção de chuva em letras grandes; o "cuidado na chuva" veio em letra miúda.
- **Peso base:** 8; só em Mai–jun, Jul–ago, Set–out.
- **Efeitos:**

  - **Jonas**: +R$ 150 · promoção de chuva: dois dias rodando no temporal
  - **Kauã**: +R$ 110 · promoção de chuva: dois dias pedalando no temporal
  - **Marcos**: +R$ 150 · tarifa dinâmica na chuva
  - **Daiane**: −R$ 50 · dois dias sem ninguém buscar encomenda [1]
  - **Rose**: −R$ 161 · clientes cancelaram: dois dias sem atender e ônibus perdido
  - **Bruna**: −R$ 47 · dois dias sem luz: não gravei
  - **Jonas e Kauã**: energia −1 · dois dias na chuva
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** Só de maio a outubro, a estação dos temporais e das cheias (cheia de jun/2025 com o Guaíba a 3,01 m, Agência Brasil; alerta de 22 e 23/09/2026 na Ilha da Pintada). INMET, via O Tempo (27/09/2026): alerta laranja, vento de 100 km/h e granizo em Porto Alegre. Metrópoles (01/08/2025): promoção de chuva de R$ 3 a R$ 12 por entrega. Valores: estimativa (2 dias × ~11 entregas × ~R$ 7)

### A água subiu (`enchente`, "Enchente")

- **Narrativa:** O Guaíba passou da cota, e a rua virou rio. Dez dias sem trabalhar como antes, e a pergunta que ninguém responde: quem chega com a sua casa?
- **Peso base:** 3; só em Mai–jun; 10 dias parados; tom grave.
- **Efeitos:**

  - **Jonas**: −R$ 893 · 10 dias sem trabalhar como antes
  - **Kauã**: −R$ 457 · 10 dias sem trabalhar como antes
  - **Rose**: −R$ 700 · 10 dias sem trabalhar como antes
  - **Daiane**: −R$ 250 · 10 dias sem trabalhar como antes [1]
  - **Bruna**: −R$ 233 · 10 dias sem trabalhar como antes
  - **Marcos**: −R$ 478 · 5 dias com as ruas alagadas
  - **Jonas**: +R$ 100 · repasse do iFood pela enchente
  - **Kauã**: +R$ 100 · repasse do iFood pela enchente
  - **Marcos**: +R$ 287 · sem ônibus, a corrida subiu 10%
  - **Todos**: energia −2 · a casa debaixo d'água
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** Enchente de maio de 2024: Guaíba a 5,37 m em 05/05/2024. 55content (04/07/2024): pedidos do iFood −12% no RS, só 66% dos entregadores ativos na 1ª semana de maio, 12% ainda fora em junho; o iFood repassou no mínimo R$ 100 por entregador (MPT-RS). IPCA (SIDRA 7060): corrida por app +10,22% em mai/2024. Aeroporto fechado de 03/05 a 21/10/2024 (Sul21). Dez dias: estimativa na faixa de 7 a 10 da pesquisa (Marcos, 5). Perdas da casa não entraram (sem fonte)

### 40 °C às 14h (`calor`, "Calor")

- **Narrativa:** Passei mal no sol das 14h e fiquei dois dias sem trabalhar. A água e o banheiro, na rua, dependem de favor.
- **Peso base:** 8; só em Jan–fev; só para Jonas, Kauã e Rose; 2 dias parados.
- **Ajustes de peso:**
  - peso × 2, em jan–fev, na opção A
  - peso × 0,3, em jan–fev, na opção D
- **Efeitos:**

  - **Jonas**: −R$ 179 · dois dias sem trabalhar
  - **Kauã**: −R$ 91 · dois dias sem trabalhar
  - **Rose**: −R$ 140 · dois dias sem trabalhar
  - **Todos**: energia −1 · o corpo sentiu

- **Fonte da carta:** Correio Braziliense (02/2025): 39,5 °C em Porto Alegre em 11/02/2025; Defesa Civil de Porto Alegre (08/02/2025): evitar esforço das 10h às 16h. OIT, "Trabalhar num planeta mais quente": entre 33 e 34 °C, quem faz trabalho moderado perde 50% da capacidade. Abílio (2021, p. 949): o acesso à água e aos banheiros "se torna parte das estratégias". Chance: estimativa; × 2 com as 12 horas e × 0,3 parando das 10h às 16h (estimativa)

### O instrumento de trabalho quebrou (`quebrou`, "Quebrou")

- **Narrativa:** Quebrou o que eu uso para trabalhar. Três dias sem ele, e o conserto sai do meu bolso.
- **Peso base:** 6; 3 dias parados.
- **Ajustes de peso:**
  - +0,5 no peso (Jonas), em jul–ago
  - +1 no peso (Jonas), em set–out
  - +3 no peso (Jonas), em nov–dez
  - +3,5 no peso (Kauã), em mai–jun ou jul–ago
  - +6,75 no peso (Kauã), em set–out ou nov–dez
  - +0,25 no peso (Marcos), em jul–ago
  - +2,5 no peso (Marcos), em set–out ou nov–dez
  - +7,25 no peso (Rose), em mai–jun
  - +11 no peso (Rose), em jul–ago
  - +11,75 no peso (Rose), em set–out ou nov–dez
  - +4,5 no peso (Bruna), em mai–jun
  - +11,5 no peso (Bruna), em jul–ago
  - +12,75 no peso (Bruna), em set–out ou nov–dez
  - +6,5 no peso (Daiane), em mai–jun
  - +10 no peso (Daiane), em jul–ago
  - +12 no peso (Daiane), em set–out ou nov–dez
  - +3 no peso, em jan–fev, na opção A
  - +2 no peso, em mar–abr, na opção B ou D
  - +3 no peso (Jonas e Kauã), em jul–ago, na opção A
  - peso × 0,5 (Jonas e Marcos), em mai–jun, na opção B
  - peso × 0,5 (Jonas e Marcos), quem escolheu B em mai–jun
  - peso × 4 (Jonas, Kauã e Marcos), em jul–ago, na opção C
  - peso × 4 (Jonas, Kauã e Marcos), quem escolheu C em jul–ago
- **Efeitos:**

  - **Jonas**: −R$ 268 · 3 dias sem o instrumento de trabalho
  - **Rose**: −R$ 210 · 3 dias sem o instrumento de trabalho
  - **Marcos**: −R$ 287 · 3 dias sem o instrumento de trabalho
  - **Bruna**: −R$ 70 · 3 dias sem o instrumento de trabalho
  - **Kauã**: −R$ 137 · 3 dias sem o instrumento de trabalho
  - **Daiane**: −R$ 75 · 3 dias sem o instrumento de trabalho [1]
  - **Jonas**: −R$ 522, gasto · relação e pneu da moto
  - **Kauã**: −R$ 280, gasto · roda e corrente da bicicleta
  - **Daiane**: −R$ 400, gasto · tela do celular
  - **Marcos**: −R$ 1.600, gasto · embreagem
  - **Rose**: −R$ 350, gasto · conserto da autoclave
  - **Bruna**: −R$ 400, gasto · tela do celular (a câmera dela)
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** Desgaste do veículo. O quando tem fonte, e o quanto é estimativa. A moto roda 6.760 km por bimestre (130 km/dia × 26 dias, Sindimoto-SP via AutoPapo, 08/11/2025), revisão a cada 6.000 km, relação de 20 a 30 mil km e pneu traseiro de 15 a 20 mil km; o carro, 8.800 km (TST, via Agência Brasil, 23/06/2026); a bicicleta, ~2.000 km (corrente a cada 1.500 a 2.500 km, Velodrome, B). A peça chega ao fim: na moto, o pneu traseiro (15 a 20 mil km) e a relação (20 a 30 mil km) do 3º ao 5º bimestre (20.280 km no fim de mai–jun) e o 2º pneu no 5º e 6º (lojas, B); no carro, os pneus de 40 a 60 mil km no 5º e 6º bimestre (44 a 53 mil km; lojas, B), e a embreagem não tem km com fonte ("trânsito intenso" gasta mais rápido, Karhub); na bicicleta, a corrente acaba todo bimestre, desde o começo. Conta (estimativa; D-063): no plano padrão, com a carta "Normal" em todos os bimestres, a chance nunca cai de um bimestre para o seguinte e chega em nov–dez a pelo menos 1,25 vez a de jan–fev. Nas partidas sorteadas (média de 20 mil, no padrão), a tendência é a mesma, mas a média recua um pouco em alguns bimestres (a moto de 7,2% para 6,4% em set–out; a bicicleta de 7,9% para 6,9% e o celular da Bruna de 8,3% para 7,9% em mai–jun), porque na casa que já atrasou contas ou se cansou, a doença, o corte de luz e o despejo ganham espaço no sorteio: o risco de alguma carta ruim, somado, sobe de 38% a 50% em jan–fev para 76% a 82% em nov–dez. Como a doença, o temporal e as cartas de atraso também entram no sorteio, o peso sobe por persona e por bimestre (os ajustes "+x no peso"): no padrão com a carta "Normal", a moto vai de 5,7% em jan–fev a 8,2% em nov–dez, o carro de 6,5% a 8,5%, a bicicleta de 5,9% a 21,1% (o salto de jul–ago nos veículos é a manutenção adiada), a autoclave da Rose de 6,7% a 9,8% e o celular da Bruna e da Daiane de 6,6% e 7,1% a 8,8% e 9,1%. A queda de mai–jun no Jonas e no Marcos é a revisão de mai–jun, que corta pela metade. A autoclave e o celular não têm desgaste com fonte; no carro de mai–ago e na bicicleta, o aumento não tem apoio na quilometragem. Moto: relação R$ 294 + pneu R$ 228 (lojas, B). Carro: embreagem de R$ 1.600 a 2.550 em carro popular (Karhub, 13/03/2026, B), usada a ponta de baixo; um motorista ficou com dívida de R$ 2,5 mil no mecânico (TST). Bicicleta: roda completa a partir de R$ 280 (Revista Oeste, 19/02/2026). Autoclave: exigida no RS (Portaria SES-RS 500/2010); tela e conserto da autoclave: estimativa

### Adoeci: uma semana parado (`doenca`, "Doença")

- **Narrativa:** Parei uma semana. Nem o MEI cobre: doença exige 12 meses de contribuição e mais de 15 dias parado.
- **Peso base:** 8; 7 dias parados.
- **Ajustes de peso:**
  - +4 no peso, em nov–dez, na opção A
  - peso × 4,24, com energia abaixo de 4
  - peso × 1,0613, com energia abaixo de 2
  - peso × 4,24, em jan–fev, na opção A, com energia acima de 3
  - peso × 4,24, em set–out, na opção D, com energia acima de 3
  - peso × 4,24, em nov–dez, na opção B, com energia acima de 3
  - peso × 4,5 (Jonas, Kauã, Marcos, Daiane e Bruna), em mai–jun, na opção C, com energia acima de 3
  - peso × 1,0613 (Jonas, Kauã, Marcos, Daiane e Bruna), em mai–jun, na opção C, com energia acima de 1 e abaixo de 4
  - peso × 2 (Rose, Bruna e Daiane), quem escolheu C em jul–ago
  - peso × 2 (Rose, Bruna e Daiane), em jul–ago, na opção C
- **Efeitos:**

  - **Jonas**: −R$ 625 · sete dias sem ganhar
  - **Rose**: −R$ 490 · sete dias sem ganhar
  - **Marcos**: −R$ 670 · sete dias sem ganhar
  - **Bruna**: −R$ 163 · sete dias sem ganhar
  - **Kauã**: −R$ 320 · sete dias sem ganhar
  - **Daiane**: −R$ 175 · sete dias sem ganhar [1]
  - **Todos**: −R$ 60, gasto · remédio (antibiótico não entra na Farmácia Popular)
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** Lei 8.213/1991, art. 25, I (carência de 12 meses para doença comum) e art. 59 (mais de 15 dias). Chance (D-059): Prather et al., Sleep 38(9), 2015, resfriado depois de exposição ao rinovírus: 5 a 6 h de sono, OR 4,24; 5 h ou menos, OR 4,50. No jogo: energia abaixo de 4 × 4,24; abaixo de 2 × 4,5; os bimestres de 12 horas, da Farroupilha e de trabalho em dobro × 4,24, e o de madrugada × 4,5 (menos a Rose), sem somar ao da energia. Remédio e consulta adiados em jul–ago: × 2 até o fim do ano (estimativa). Remédio: estimativa; a Farmácia Popular não dá antibiótico

### A dor nas costas travou (`dor`, "Dor")

- **Narrativa:** A dor nas costas travou de vez. Uma semana parado e fisioterapia paga, porque a fila do SUS não tem data.
- **Peso base:** 2; 7 dias parados.
- **Ajustes de peso:**
  - +0,25 no peso (Jonas), em mar–abr
  - +0,75 no peso (Jonas), em mai–jun
  - +2,25 no peso (Jonas), em jul–ago
  - +2,75 no peso (Jonas), em set–out
  - +4,25 no peso (Jonas), em nov–dez
  - +0,25 no peso (Kauã), em mar–abr
  - +1 no peso (Kauã), em mai–jun
  - +3 no peso (Kauã), em jul–ago
  - +5 no peso (Kauã), em set–out
  - +5,25 no peso (Kauã), em nov–dez
  - +0,5 no peso (Marcos), em mar–abr
  - +1,75 no peso (Marcos), em mai–jun
  - +2,5 no peso (Marcos), em jul–ago
  - +4,5 no peso (Marcos), em set–out ou nov–dez
  - +0,5 no peso (Rose), em mar–abr
  - +2,75 no peso (Rose), em mai–jun
  - +4,75 no peso (Rose), em jul–ago
  - +5,75 no peso (Rose), em set–out
  - +6,25 no peso (Rose), em nov–dez
  - +0,5 no peso (Bruna), em mar–abr
  - +1,25 no peso (Bruna), em mai–jun
  - +4 no peso (Bruna), em jul–ago
  - +4,75 no peso (Bruna), em set–out
  - +5,25 no peso (Bruna), em nov–dez
  - +0,75 no peso (Daiane), em mar–abr
  - +2,5 no peso (Daiane), em mai–jun
  - +4 no peso (Daiane), em jul–ago
  - +5 no peso (Daiane), em set–out ou nov–dez
  - peso × 2 (Rose), em nov–dez, na opção B
- **Efeitos:**

  - **Jonas**: −R$ 625 · sete dias sem trabalhar
  - **Rose**: −R$ 490 · sete dias sem trabalhar
  - **Marcos**: −R$ 670 · sete dias sem trabalhar
  - **Bruna**: −R$ 163 · sete dias sem trabalhar
  - **Kauã**: −R$ 320 · sete dias sem trabalhar
  - **Daiane**: −R$ 175 · sete dias sem trabalhar [1]
  - **Todos**: −R$ 600, gasto · fisioterapia particular: 4 sessões
  - **Todos**: energia −1 · dor
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** Desgaste do corpo. Kinote et al. (RBPS, 2013), manicures de Fortaleza: 76,7% com dor, 46,7% com dor crônica; Souza et al. (Physis, 2024), entregadores: "minha coluna é arrebentada"; Iwami et al. (RBMT, 2023): lombalgia crônica em 20,6% das domésticas, maior com a idade. As fontes medem a dor de quem tem anos de ofício (Kinote: 12,3 anos em média; dor crônica é a que passa de 6 meses) e que ela cresce com a idade (Iwami: razão de prevalência 1,74), e não quanto cresce dentro de um ano. Conta (estimativa; D-063): no plano padrão, com a carta "Normal" em todos os bimestres, a chance nunca cai de um bimestre para o seguinte e chega em nov–dez a pelo menos 1,5 vez a de jan–fev, e a da Rose a 2 vezes, porque a manicure tem a maior prevalência das fontes (76,7%, contra 20,6% das domésticas); o peso sobe por persona e por bimestre (os ajustes "+x no peso"). Nas partidas sorteadas (média de 20 mil, no padrão), a da Rose e a da Daiane também nunca caem; nas outras, a média recua até 0,2 ponto num bimestre (a do Jonas, de 2,4% para 2,2% em set–out), porque na casa que já atrasou contas ou se cansou, a doença, o corte de luz e o despejo ganham espaço no sorteio, e nov–dez fica de 1,46 a 2 vezes jan–fev. Com a carta "Normal", de ~2% em jan–fev a ~3% a 3,5% em nov–dez (a Rose, de 2,2% a 4,6%). Fisioterapia: Doctoralia, Porto Alegre, R$ 120 a R$ 320 a sessão (4 × R$ 150); fila do SUS no RS sem tempo divulgado (Agora RS, 17/09/2026)

### Queda leve: 5 dias parado (`queda`, "Queda")

- **Narrativa:** Um tombo no molhado, ou uma batida leve: cinco dias parado e o conserto. Menos de 7 dias, o seguro do app não paga; menos de 16, o INSS não paga.
- **Peso base:** 0; só para Jonas, Kauã e Marcos; 5 dias parados.
- **Ajustes de peso:**
  - +12 no peso (Jonas)
  - +8 no peso (Kauã e Marcos)
  - +2 no peso, em mar–abr, na opção B
  - +4 no peso (Jonas e Kauã), em jul–ago, na opção A
  - +2 no peso (Marcos), em jul–ago, na opção A
  - peso × 1,3 (Jonas, Kauã e Marcos), com energia abaixo de 6
  - peso × 1,46 (Jonas, Kauã e Marcos), com energia abaixo de 4
  - peso × 2,26 (Jonas, Kauã e Marcos), com energia abaixo de 2
  - peso × 0,6, em jan–fev, na opção D
  - peso × 1,5 (Jonas, Kauã e Marcos), em jul–ago, na opção C
  - peso × 1,5 (Jonas, Kauã e Marcos), quem escolheu C em jul–ago
  - peso × 1,9 (Jonas, Kauã e Marcos), em jan–fev, na opção A
  - peso × 4,3 (Jonas, Kauã e Marcos), em mai–jun, na opção C
  - peso × 1,9 (Jonas, Kauã e Marcos), em set–out, na opção D
  - peso × 1,9 (Jonas, Kauã e Marcos), em nov–dez, na opção B
- **Efeitos:**

  - **Jonas**: −R$ 447 · 5 dias parado
  - **Kauã**: −R$ 228 · 5 dias parado
  - **Marcos**: −R$ 478 · 5 dias parado
  - **Jonas**: −R$ 594, gasto · retrovisor, manete e guidão
  - **Kauã**: −R$ 150, gasto · conserto da bicicleta
  - **Marcos**: −R$ 800, gasto · funilaria da batida
  - **Todos**: energia −1 · dor e medo de voltar

- **Fonte da carta:** Cebrap/Amobitec (2025): 22% dos entregadores de moto e 15% dos motoristas sofreram acidente em 3 meses, 15,3% e 10,3% por bimestre (conta nossa); UFBA (Siqueira et al., 2025): 44,1% em 1 ano, ~9,2% por bimestre (a bicicleta). Os pesos 12 e 8 descontam a fratura. Peças de CG 160 em concessionária (AutoPapo, 04/03/2026): retrovisor R$ 112,82, manete R$ 43,58, guidão R$ 437,11. Seguro do iFood só a partir de 7 dias; INSS só acima de 15 (Lei 8.213, art. 59). Revisão adiada em jul–ago (pneu e freio gastos): × 1,5 até o fim do ano (estimativa). Energia baixa e opções de pouco sono: AAA Foundation (Tefft, 2016), 6 a 7 h de sono 1,3 vez, 5 a 6 h 1,9 vez (12 horas, Farroupilha, trabalho em dobro), 4 a 5 h 4,3 vezes o risco (madrugada). Bicicleta e funilaria: estimativa

### Acidente: fratura, 45 dias parado (`fratura`, "Fratura")

- **Narrativa:** Me acidentei e quebrei o punho: 45 dias parado. A mão só firma de verdade em 90; o seguro do app só paga se foi na entrega, e poucos recebem; o INSS, só com o MEI pago antes, e no bimestre seguinte.
- **Peso base:** 1; 45 dias parados; tom grave.
- **Ajustes de peso:**
  - +1 no peso (Jonas, Kauã e Marcos)
  - +1 no peso (Jonas, Kauã e Marcos), em mar–abr, na opção B
  - +2 no peso (Jonas e Kauã), em jul–ago, na opção A
  - peso × 1,3 (Jonas, Kauã e Marcos), com energia abaixo de 6
  - peso × 1,46 (Jonas, Kauã e Marcos), com energia abaixo de 4
  - peso × 2,26 (Jonas, Kauã e Marcos), com energia abaixo de 2
  - peso × 1,9 (Jonas, Kauã e Marcos), em jan–fev, na opção A
  - peso × 4,3 (Jonas, Kauã e Marcos), em mai–jun, na opção C
  - peso × 1,9 (Jonas, Kauã e Marcos), em set–out, na opção D
  - peso × 1,9 (Jonas, Kauã e Marcos), em nov–dez, na opção B
  - peso × 0, quem tirou “Acidente: fratura, 45 dias parado” em jan–fev
  - peso × 0, quem tirou “Acidente: fratura, 45 dias parado” em mar–abr
  - peso × 0, quem tirou “Acidente: fratura, 45 dias parado” em mai–jun
  - peso × 0, quem tirou “Acidente: fratura, 45 dias parado” em jul–ago
  - peso × 0, quem tirou “Acidente: fratura, 45 dias parado” em set–out
- **Efeitos:**

  - **Jonas**: −R$ 4.020 · 45 dias sem trabalhar
  - **Rose**: −R$ 3.150 · 45 dias sem trabalhar
  - **Marcos**: −R$ 4.305 · 45 dias sem trabalhar
  - **Bruna**: −R$ 1.050 · 45 dias sem trabalhar
  - **Kauã**: −R$ 2.055 · 45 dias sem trabalhar
  - **Daiane**: −R$ 1.125 · 45 dias sem trabalhar [1]
  - **Jonas**: −R$ 1.500, gasto · conserto da moto
  - **Kauã**: −R$ 300, gasto · conserto da bicicleta
  - **Marcos**: −R$ 1.840, gasto · conserto do carro
  - **Todos**: −R$ 150, gasto · remédio, tala e ônibus até o posto
  - **Todos**: energia −2 · dor e recuperação
  - **Jonas** (em jan–fev, na opção A): −R$ 780 · machucado, não deu para as horas a mais
  - **Rose** (em jan–fev, na opção A): −R$ 735 · machucado, não deu para as horas a mais
  - **Marcos** (em jan–fev, na opção A): −R$ 975 · machucado, não deu para as horas a mais
  - **Bruna** (em jan–fev, na opção A): −R$ 450 · machucado, não deu para as horas a mais
  - **Kauã** (em jan–fev, na opção A): −R$ 157 · machucado, não deu para as horas a mais
  - **Daiane** (em jan–fev, na opção A): −R$ 263 · machucado, não deu para as horas a mais
  - **Jonas** (em mar–abr, na opção B): −R$ 678 · machucado, não deu para as horas a mais
  - **Kauã** (em mar–abr, na opção B): −R$ 308 · machucado, não deu para as horas a mais
  - **Marcos** (em mar–abr, na opção B): −R$ 646 · machucado, não deu para as horas a mais
  - **Rose** (em mar–abr, na opção B): −R$ 472 · machucado, não deu para as horas a mais
  - **Jonas** (em mar–abr, na opção D): −R$ 121 · machucado, não deu para as horas a mais
  - **Marcos** (em mar–abr, na opção D): −R$ 129 · machucado, não deu para as horas a mais
  - **Rose** (em mar–abr, na opção D): −R$ 94 · machucado, não deu para as horas a mais
  - **Jonas** (em mai–jun, na opção C): −R$ 603 · machucado, não deu para as horas a mais
  - **Rose** (em mai–jun, na opção C): −R$ 472 · machucado, não deu para as horas a mais
  - **Marcos** (em mai–jun, na opção C): −R$ 646 · machucado, não deu para as horas a mais
  - **Bruna** (em mai–jun, na opção C): −R$ 157 · machucado, não deu para as horas a mais
  - **Kauã** (em mai–jun, na opção C): −R$ 308 · machucado, não deu para as horas a mais
  - **Daiane** (em mai–jun, na opção C): −R$ 169 · machucado, não deu para as horas a mais
  - **Jonas** (em jul–ago, na opção A): −R$ 402 · machucado, não deu para as horas a mais
  - **Kauã** (em jul–ago, na opção A): −R$ 205 · machucado, não deu para as horas a mais
  - **Rose** (em jul–ago, na opção A): −R$ 315 · machucado, não deu para as horas a mais
  - **Daiane** (em jul–ago, na opção A): −R$ 225 · machucado, não deu para as horas a mais
  - **Jonas** (em set–out, na opção D): −R$ 615 · machucado, não deu para as horas a mais
  - **Kauã** (em set–out, na opção D): −R$ 325 · machucado, não deu para as horas a mais
  - **Marcos** (em set–out, na opção D): −R$ 538 · machucado, não deu para as horas a mais
  - **Rose** (em set–out, na opção D): −R$ 315 · machucado, não deu para as horas a mais
  - **Daiane** (em set–out, na opção D): −R$ 113 · machucado, não deu para as horas a mais
  - **Bruna** (em set–out, na opção D): −R$ 300 · machucado, não deu para as horas a mais
  - **Jonas** (em nov–dez, na opção B): −R$ 780 · machucado, não deu para as horas a mais
  - **Rose** (em nov–dez, na opção B): −R$ 735 · machucado, não deu para as horas a mais
  - **Marcos** (em nov–dez, na opção B): −R$ 975 · machucado, não deu para as horas a mais
  - **Kauã** (em nov–dez, na opção B): −R$ 157 · machucado, não deu para as horas a mais
  - **Daiane** (em nov–dez, na opção B): −R$ 263 · machucado, não deu para as horas a mais
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** INSS, Diretrizes de apoio à decisão médico-pericial em Ortopedia e Traumatologia (consulta pública, abr/2008), Parte 3, p. 130-134: fratura do rádio distal (S52.5), 45 dias para consolidar e 90 para a recuperação total. Chance: UFBA (Siqueira et al., Cad. Saúde Pública 41(3), 2025, 563 entregadores): 44,1% com acidente em 1 ano, e 22,2% deles parados 15 dias ou mais, ~10% por ano: ~2% por bimestre na rua (peso 2); 1 para quem não está na rua (acidente doméstico, estimativa). Só 20% dos que pararam 15 dias ou mais receberam do INSS; 38,3% viveram de ajuda da família. Cebrap/Amobitec (2025): "só uma pequena parte" recebeu do seguro do app. Conserto da moto: 7 peças originais da CG 160 = R$ 1.345,87 (AutoPapo, 04/03/2026) + ~R$ 150 de mão de obra; carro: para-choque trocado e pintado, R$ 1.840 (Autocidade, 13/06/2026, teto do carro popular); bicicleta: roda completa a partir de R$ 280 (Revista Oeste, 19/02/2026); remédio, tala e ônibus: Panvel e São João (29/09/2026), ~R$ 151. Os 45 dias cabem no bimestre (60), e o trabalho do bimestre cai a 25%. No máximo uma vez por partida

### A perícia do INSS negou o auxílio (`inss_negou`, "INSS negou")

- **Narrativa:** Paguei o MEI em dia, esperei a decisão e a perícia negou. O dinheiro que eu contava não veio.
- **Peso base:** 0; só em Mar–abr, Mai–jun, Jul–ago, Set–out, Nov–dez; tom grave.
- **Ajustes de peso:**
  - +100 no peso, em mar–abr, quem escolheu B em jan–fev, quem tirou “Acidente: fratura, 45 dias parado” em jan–fev
  - +100 no peso, em mai–jun, quem escolheu B em jan–fev, quem tirou “Acidente: fratura, 45 dias parado” em mar–abr
  - +100 no peso, em jul–ago, quem escolheu B em jan–fev, quem tirou “Acidente: fratura, 45 dias parado” em mai–jun
  - +100 no peso, em set–out, quem escolheu B em jan–fev, quem tirou “Acidente: fratura, 45 dias parado” em jul–ago
  - +100 no peso, em nov–dez, quem escolheu B em jan–fev, quem tirou “Acidente: fratura, 45 dias parado” em set–out
- **Efeitos:**

  - nenhum além do auxílio do INSS, quando vale.

- **Fonte da carta:** Previdenciarista (09/09/2026), leitura do BEPS de jul/2026: 53% das decisões de benefício por incapacidade foram negativas no 1º semestre de 2026. Confiança média. Sem efeito em dinheiro: o auxílio do INSS vem nas outras cartas do bimestre seguinte à fratura (D-059), e esta é a que não o traz. Peso: ~50% nesse bimestre

### Conta bloqueada sem explicação (`bloqueio`, "Bloqueio")

- **Narrativa:** Bloquearam minha conta sem explicação. Veio uma mensagem genérica, sem prazo e sem jeito de me defender, e sem advogado ninguém responde o recurso.
- **Peso base:** 2; 45 dias parados; tom grave.
- **Ajustes de peso:**
  - +0,5 no peso (Jonas), em mai–jun
  - +1,75 no peso (Jonas), em jul–ago
  - +2 no peso (Jonas), em set–out
  - +3,25 no peso (Jonas), em nov–dez
  - +1,75 no peso (Rose), em mai–jun
  - +3 no peso (Rose), em jul–ago
  - +3,25 no peso (Rose), em set–out ou nov–dez
  - +1,5 no peso (Marcos), em mai–jun
  - +2 no peso (Marcos), em jul–ago
  - +3,5 no peso (Marcos), em set–out ou nov–dez
  - +0,25 no peso (Bruna), em mar–abr
  - +1 no peso (Bruna), em mai–jun
  - +3,25 no peso (Bruna), em jul–ago
  - +3,75 no peso (Bruna), em set–out
  - +4 no peso (Bruna), em nov–dez
  - +0,75 no peso (Kauã), em mai–jun
  - +2,5 no peso (Kauã), em jul–ago
  - +4 no peso (Kauã), em set–out ou nov–dez
  - +0,5 no peso (Daiane), em mar–abr
  - +2,25 no peso (Daiane), em mai–jun
  - +3,5 no peso (Daiane), em jul–ago
  - +4 no peso (Daiane), em set–out ou nov–dez
  - peso × 0, quem tirou “Conta bloqueada sem explicação” em jan–fev
  - peso × 0, quem tirou “Conta bloqueada sem explicação” em mar–abr
  - peso × 0, quem tirou “Conta bloqueada sem explicação” em mai–jun
  - peso × 0, quem tirou “Conta bloqueada sem explicação” em jul–ago
  - peso × 0, quem tirou “Conta bloqueada sem explicação” em set–out
  - +3 no peso, em mar–abr, na opção B
  - peso × 0,4 (Jonas, Kauã, Marcos e Rose), em mar–abr, na opção D
  - peso × 0,4 (Jonas, Kauã, Marcos e Rose), em jul–ago, na opção A
  - peso × 3 (Bruna), em jul–ago, na opção A
  - peso × 3 (Jonas, Kauã, Marcos e Rose), em set–out, na opção B
- **Efeitos:**

  - **Jonas**: −R$ 4.020 · 45 dias sem a conta
  - **Rose**: −R$ 3.150 · 45 dias sem a conta
  - **Marcos**: −R$ 4.305 · 45 dias sem a conta
  - **Bruna**: −R$ 1.050 · 45 dias sem a conta
  - **Kauã**: −R$ 2.055 · 45 dias sem a conta
  - **Daiane**: −R$ 1.125 · 45 dias sem a conta [1]
  - **Jonas** (quem escolheu A em mai–jun): +R$ 804 · o advogado da associação conseguiu liminar no 36º dia
  - **Rose** (quem escolheu A em mai–jun): +R$ 630 · o advogado da associação conseguiu liminar no 36º dia
  - **Marcos** (quem escolheu A em mai–jun): +R$ 861 · o advogado da associação conseguiu liminar no 36º dia
  - **Bruna** (quem escolheu A em mai–jun): +R$ 210 · o advogado da associação conseguiu liminar no 36º dia
  - **Kauã** (quem escolheu A em mai–jun): +R$ 411 · o advogado da associação conseguiu liminar no 36º dia
  - **Daiane** (quem escolheu A em mai–jun): +R$ 225 · o advogado da associação conseguiu liminar no 36º dia
  - **Jonas** (em mai–jun, na opção A): +R$ 804 · o advogado da associação conseguiu liminar no 36º dia
  - **Rose** (em mai–jun, na opção A): +R$ 630 · o advogado da associação conseguiu liminar no 36º dia
  - **Marcos** (em mai–jun, na opção A): +R$ 861 · o advogado da associação conseguiu liminar no 36º dia
  - **Bruna** (em mai–jun, na opção A): +R$ 210 · o advogado da associação conseguiu liminar no 36º dia
  - **Kauã** (em mai–jun, na opção A): +R$ 411 · o advogado da associação conseguiu liminar no 36º dia
  - **Daiane** (em mai–jun, na opção A): +R$ 225 · o advogado da associação conseguiu liminar no 36º dia
  - **Jonas** (em mar–abr, na opção B): +R$ 2.010 · o outro app segurou metade da perda [2]
  - **Rose** (em mar–abr, na opção B): +R$ 1.575 · o outro app segurou metade da perda [2]
  - **Marcos** (em mar–abr, na opção B): +R$ 2.153 · o outro app segurou metade da perda [2]
  - **Bruna** (em mar–abr, na opção B): +R$ 525 · o outro app segurou metade da perda [2]
  - **Kauã** (em mar–abr, na opção B): +R$ 1.028 · o outro app segurou metade da perda [2]
  - **Daiane** (em mar–abr, na opção B): +R$ 563 · o outro app segurou metade da perda [2]
  - **Jonas** (em jan–fev, na opção A): −R$ 780 · bloqueado, não teve hora a mais
  - **Rose** (em jan–fev, na opção A): −R$ 735 · bloqueado, não teve hora a mais
  - **Marcos** (em jan–fev, na opção A): −R$ 975 · bloqueado, não teve hora a mais
  - **Bruna** (em jan–fev, na opção A): −R$ 450 · bloqueado, não teve hora a mais
  - **Kauã** (em jan–fev, na opção A): −R$ 157 · bloqueado, não teve hora a mais
  - **Daiane** (em jan–fev, na opção A): −R$ 263 · bloqueado, não teve hora a mais
  - **Jonas** (em mar–abr, na opção B): −R$ 678 · bloqueado, não teve hora a mais
  - **Kauã** (em mar–abr, na opção B): −R$ 308 · bloqueado, não teve hora a mais
  - **Marcos** (em mar–abr, na opção B): −R$ 646 · bloqueado, não teve hora a mais
  - **Rose** (em mar–abr, na opção B): −R$ 472 · bloqueado, não teve hora a mais
  - **Jonas** (em mar–abr, na opção D): −R$ 121 · bloqueado, não teve hora a mais
  - **Marcos** (em mar–abr, na opção D): −R$ 129 · bloqueado, não teve hora a mais
  - **Rose** (em mar–abr, na opção D): −R$ 94 · bloqueado, não teve hora a mais
  - **Jonas** (em mai–jun, na opção C): −R$ 603 · bloqueado, não teve hora a mais
  - **Rose** (em mai–jun, na opção C): −R$ 472 · bloqueado, não teve hora a mais
  - **Marcos** (em mai–jun, na opção C): −R$ 646 · bloqueado, não teve hora a mais
  - **Bruna** (em mai–jun, na opção C): −R$ 157 · bloqueado, não teve hora a mais
  - **Kauã** (em mai–jun, na opção C): −R$ 308 · bloqueado, não teve hora a mais
  - **Daiane** (em mai–jun, na opção C): −R$ 169 · bloqueado, não teve hora a mais
  - **Jonas** (em jul–ago, na opção A): −R$ 402 · bloqueado, não teve hora a mais
  - **Kauã** (em jul–ago, na opção A): −R$ 205 · bloqueado, não teve hora a mais
  - **Rose** (em jul–ago, na opção A): −R$ 315 · bloqueado, não teve hora a mais
  - **Daiane** (em jul–ago, na opção A): −R$ 225 · bloqueado, não teve hora a mais
  - **Jonas** (em set–out, na opção D): −R$ 615 · bloqueado, não teve hora a mais
  - **Kauã** (em set–out, na opção D): −R$ 325 · bloqueado, não teve hora a mais
  - **Marcos** (em set–out, na opção D): −R$ 538 · bloqueado, não teve hora a mais
  - **Rose** (em set–out, na opção D): −R$ 315 · bloqueado, não teve hora a mais
  - **Daiane** (em set–out, na opção D): −R$ 113 · bloqueado, não teve hora a mais
  - **Bruna** (em set–out, na opção D): −R$ 300 · bloqueado, não teve hora a mais
  - **Jonas** (em nov–dez, na opção B): −R$ 780 · bloqueado, não teve hora a mais
  - **Rose** (em nov–dez, na opção B): −R$ 735 · bloqueado, não teve hora a mais
  - **Marcos** (em nov–dez, na opção B): −R$ 975 · bloqueado, não teve hora a mais
  - **Kauã** (em nov–dez, na opção B): −R$ 157 · bloqueado, não teve hora a mais
  - **Daiane** (em nov–dez, na opção B): −R$ 263 · bloqueado, não teve hora a mais
  - *Fonte [1]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)
  - *Fonte [2]:* Estimativa: com a renda dividida entre dois apps (ou dois canais de venda), o bloqueio num deles tira metade. Não achei dado da divisão

- **Fonte da carta:** Abílio (2021), p. 941 e 950: bloqueios sumários e o "bloqueio branco" por recusar. 99 (página oficial): finalizar menos de 70% das corridas = 5, 10 e 15 dias fora. O Povo (01/12/2025), pesquisa GigU (fintech do setor): 15,5% dos motoristas já foram bloqueados sem explicação. Uber (13/09/2026): 90 dias para pedir revisão, conta bloqueada enquanto isso. Perfil de Instagram: onda de banimentos em 2026 (TecMundo; O Antagonista). CUT (23/07/2026): com o Simtrapli-RS e advogado, liminar em ~36 dias; sem advogado, um caso passou de 8 meses. No jogo: 45 dias sem a conta no bimestre (estimativa: depois, a volta por outra conta); com a associação, 36; com dois apps, metade da perda. No máximo uma vez por partida. O peso sobe com os meses, por estimativa: as fontes mostram castigo que cresce com a repetição (99: 5, 10 e 15 dias fora; Uber: três avisos e a média das últimas 500 avaliações), e não com o calendário. Conta (D-063): no plano padrão, com a carta "Normal" em todos os bimestres, a chance nunca cai de um bimestre para o seguinte (fora mar–abr, em que aceitar tudo multiplica por 0,4) e chega em nov–dez a pelo menos 1,25 vez a de jan–fev; o peso sobe por persona e por bimestre (os ajustes "+x no peso"). Nas partidas sorteadas (média de 20 mil, no padrão), a média sobe menos e recua em alguns bimestres (a do Jonas, de 2,0% para 1,7% em set–out; a da Bruna, de 2,3% para 2,1% em mai–jun; a da Daiane, de 2,61% para 2,55% em set–out), e nov–dez fica em 1,13 a 1,15 vez jan–fev: quem já foi bloqueado não é de novo (uma vez por partida), e na casa que já atrasou contas ou se cansou, a doença, o corte de luz e o despejo ganham espaço no sorteio. Para quem ainda não foi bloqueado, nov–dez fica em 1,23 a 1,29 vez jan–fev. No padrão, a chance de ser bloqueado em algum bimestre do ano fica de 11% a 15%, perto dos 15,5% da GigU, que mede quem já foi bloqueado alguma vez, e não num ano

### Fui assaltado (`assalto`, "Assalto")

- **Narrativa:** Levaram o celular e o dinheiro do dia. Fiquei dois dias sem coragem de sair, e sem celular não tem app.
- **Peso base:** 0; só para Jonas, Kauã, Marcos e Rose; 3 dias parados; tom grave.
- **Ajustes de peso:**
  - +5 no peso (Jonas e Kauã)
  - +4 no peso (Marcos)
  - +2 no peso (Rose)
  - +2 no peso, em jan–fev, na opção A
  - +2 no peso, em nov–dez, na opção B
  - +3 no peso, em mai–jun, na opção C
  - +3 no peso, em set–out, na opção D
- **Efeitos:**

  - **Jonas**: −R$ 268 · o dinheiro do dia e 2 dias sem sair
  - **Kauã**: −R$ 137 · o dinheiro do dia e 2 dias sem sair
  - **Marcos**: −R$ 287 · o dinheiro do dia e 2 dias sem sair
  - **Rose**: −R$ 210 · o dinheiro do dia e 2 dias sem sair
  - **Todos**: −R$ 1.079, gasto · celular novo
  - **Todos**: energia −1 · medo de voltar para a rua

- **Fonte da carta:** Cebrap/Amobitec (2025), p. 45 e 70: 7% dos entregadores e 6% dos motoristas assaltados em 3 meses (~4,7% e 4% por bimestre, conta nossa). Ação da Cidadania/UFRJ (2024): 93,4% sem seguro do celular. Celular: Galaxy A16 5G a partir de R$ 1.079 (Zoom, 30/09/2026, B). Rose: estimativa (ônibus e rua)

### Trabalhei e não recebi (`calote`, "Não pagou")

- **Narrativa:** Fiz o serviço, ou fui até lá, e o dinheiro não veio. Reclamar leva dias e quase nunca dá em nada.
- **Peso base:** 8.
- **Efeitos:**

  - **Jonas**: −R$ 120 · pedidos cancelados depois da coleta
  - **Kauã**: −R$ 80 · pedidos cancelados depois da coleta
  - **Daiane**: −R$ 180 · comprovante de Pix falso: a encomenda foi embora
  - **Marcos**: −R$ 150 · passageiros cancelaram comigo a caminho
  - **Rose**: −R$ 175 · três clientes cancelaram em cima da hora
  - **Bruna**: −R$ 400 · a agência não pagou a publi

- **Fonte da carta:** NailNow (FAQ): cancelar é grátis até 1 h antes; depois, o suporte decide caso a caso. 99: taxa de cancelamento só entre 4 e 12 min. Pix falso: guias da Stone e do Mercado Pago. Bruna: TechTudo (01/2026), agência Hello Group, calote de mais de R$ 500 mil em criadoras; valor: 1 publi na faixa de nano (Estado de Minas, B). Valores: estimativa (Rose: 3 × (R$ 60 × 0,8 + R$ 10,60 de ônibus))

### O app apertou a taxa (`taxa`, "Taxa")

- **Narrativa:** Mais um corte, sem aviso. A segunda entrega da rota passou a pagar menos, a fatia do app subiu, ou o anúncio e o insumo ficaram mais caros.
- **Peso base:** 6; só em Mar–abr, Set–out; só para Jonas, Kauã, Daiane e Marcos.
- **Efeitos:**

  - **Jonas**: −R$ 360 · pedido agrupado: R$ 3,00 na 2ª entrega, e não R$ 7,50
  - **Kauã**: −R$ 270 · pedido agrupado: R$ 3,00 na 2ª entrega, e não R$ 7,50
  - **Daiane**: −R$ 300 · anúncio 12,15% e chocolate 24,77% mais caros
  - **Marcos**: −R$ 287 · a fatia da plataforma subiu

- **Fonte da carta:** Só em mar–abr (o chocolate da Páscoa, +24,78%) e set–out (depois do breque); em jul–ago, a regra nova é a própria rodada. iFood (jun/2025): a 2ª entrega agrupada paga R$ 3,00, e não R$ 7,50; 40 (Jonas) e 30 (Kauã) agrupadas por mês, nos 2 meses (estimativa). Meta repassa PIS/Cofins e ISS desde 01/01/2026 (+12,15%); chocolate +24,77% em 12 meses (IPCA, Poder360). Marcos: os sindicatos dizem que a fatia retida pelas plataformas subiu para 40% a 70% (33Giga, 30/12/2025, B); usado −5% do bimestre (estimativa)

### A mobilização arrancou um reajuste (`reajuste`, "Reajuste")

- **Narrativa:** Depois do breque, a plataforma subiu o valor mínimo por entrega. É pouco, e veio de quem parou.
- **Peso base:** 1; só em Mai–jun, Jul–ago, Set–out, Nov–dez; só para Jonas e Kauã.
- **Ajustes de peso:**
  - +4 no peso, quem escolheu A em mar–abr
  - +4 no peso, em set–out ou nov–dez, quem escolheu B em jul–ago
  - +4 no peso, em nov–dez, quem escolheu C em set–out
- **Efeitos:**

  - **Jonas**: +R$ 300 · reajuste: R$ 1 a mais por entrega
  - **Kauã**: +R$ 150 · reajuste: R$ 0,50 a mais por entrega

- **Fonte da carta:** Breque de 31/03/2025 em mais de 100 cidades; o iFood subiu o mínimo de R$ 6,50 para R$ 7,50 em 01/06/2025, dois meses depois (moto +R$ 1, bike +R$ 0,50; Brasil de Fato, 29/04/2025). ~150 entregas no mínimo por mês, nos 2 meses (estimativa). Depois do breque de 01/09/2026, sem reajuste até agora. Mais chance para quem parou (estimativa: a greve de 14/04, o protesto de 27/07 e o breque de 01/09)

### Um vídeo viralizou (`viralizou`, "Viralizou")

- **Narrativa:** Um vídeo meu viralizou, e duas marcas pagaram em dinheiro. Não sei fazer de novo, e o algoritmo também não conta.
- **Peso base:** 4; só para Bruna.
- **Ajustes de peso:**
  - +2 no peso, em jan–fev, na opção A
  - +2 no peso, em mai–jun, na opção C
  - +1 no peso, quem escolheu B em mai–jun
- **Efeitos:**

  - **Bruna**: +R$ 1.300 · duas marcas pagaram em dinheiro
  - **Todos**: energia −1 · responder todo mundo

- **Fonte da carta:** DeepLab/UCD (2024, p. 35-36): 1,4% de 40 mil aspirantes passaram de 5 mil seguidores em cerca de 4 meses. CreatorIQ (via ABC da Comunicação, 06/02/2026): 10% dos criadores ficaram com 62% dos pagamentos em 2025. Valor: 1 reels (R$ 300 a 2.000) + 3 stories (R$ 150 a 1.500) de nano (Estado de Minas, 17/06/2026, B). Chance: estimativa, um pouco maior com mais posts e com a mentoria

### Esgotei: burnout (`burnout`, "Burnout")

- **Narrativa:** Travei: não conseguia gravar nem abrir o app. Quinze dias sem postar, e o algoritmo não espera ninguém melhorar.
- **Peso base:** 2; só para Bruna; 15 dias parados.
- **Ajustes de peso:**
  - +0,25 no peso, em mar–abr
  - +1 no peso, em mai–jun ou jul–ago
  - +1,25 no peso, em set–out ou nov–dez
  - peso × 3, com energia abaixo de 4
  - peso × 3, em jan–fev, na opção A
  - peso × 3, em mai–jun, na opção C
  - peso × 3, em set–out, na opção D
  - peso × 3, em nov–dez, na opção B
- **Efeitos:**

  - **Bruna**: −R$ 350 · quinze dias sem postar
  - **Todos**: −R$ 150, gasto · consulta particular
  - **Todos**: energia −1 · o corpo cobrou

- **Fonte da carta:** YouPix, Creators & Negócios 2025 (via Jornal de Brasília, 19/11/2025): 53% dos criadores já tiveram burnout, mais ainda entre quem ganha até R$ 2 mil; 41% fazem tratamento. "Exaustão algorítmica" (Karhawi e Prazeres, 2022) e "o momento em que você está exausto é o ponto em que o algoritmo mais gosta de você" (Guardian, 2018), em Silva (tese UFMG, 2023, p. 159). Chance: estimativa (× 3 com a energia abaixo de 4 e nos bimestres de postar todo dia); pela D-063, o peso também sobe com os meses (os ajustes "+x no peso"), e no padrão a chance vai de 2,2% em jan–fev a 4,6% em nov–dez. Consulta: estimativa sem fonte

### O algoritmo derrubou o alcance (`alcance`, "Alcance")

- **Narrativa:** O alcance caiu pela metade, sem aviso e sem explicação. Postei igual e vendi menos.
- **Peso base:** 6; só para Bruna e Daiane.
- **Ajustes de peso:**
  - +0,75 no peso (Bruna), em mar–abr
  - +3,25 no peso (Bruna), em mai–jun
  - +10 no peso (Bruna), em jul–ago
  - +12 no peso (Bruna), em set–out
  - +12,75 no peso (Bruna), em nov–dez
  - +1,75 no peso (Daiane), em mar–abr
  - +6,5 no peso (Daiane), em mai–jun
  - +10,5 no peso (Daiane), em jul–ago
  - +13 no peso (Daiane), em set–out ou nov–dez
- **Efeitos:**

  - **Bruna**: −R$ 420 · o alcance caiu: vendi menos
  - **Daiane**: −R$ 225 · o alcance caiu: vendi menos

- **Fonte da carta:** Socialinsider (2025): engajamento no Instagram de 0,48%, 24% menor que no ano anterior. Silva (tese UFMG, 2023, p. 166): "um algoritmo que muda a todo o instante". O peso sobe com os meses porque a queda se acumula no ano (−24% em 12 meses); o tamanho é estimativa. Conta (D-063): no plano padrão, com a carta "Normal" em todos os bimestres, a chance nunca cai de um bimestre para o seguinte e chega em nov–dez a 1,33 vez a de jan–fev (a queda de 24% em 12 meses); o peso sobe por persona e por bimestre (os ajustes "+x no peso"): de 6,6% a 8,8% na Bruna e de 7,1% a 9,6% na Daiane. Nas partidas sorteadas (média de 20 mil, no padrão), as pontas são as mesmas e a da Daiane nunca cai; a da Bruna recua de 6,99% para 6,94% em mai–jun, porque na casa que já atrasou contas ou se cansou, a doença, o corte de luz, o despejo e o burnout ganham espaço no sorteio. Valores: −30% do bimestre da Bruna, −15% do da Daiane (estimativa)

### Cortaram a luz (`corte_luz`, "Sem luz")

- **Narrativa:** A conta de luz atrasada passou do aviso de 15 dias, e a CEEE cortou. Dois dias no escuro até juntar para religar, e a comida da geladeira não esperou.
- **Peso base:** 0; tom grave.
- **Ajustes de peso:**
  - +5 no peso, com mais de R$ 1.000 de contas atrasadas no começo do bimestre
  - +5 no peso, com mais de R$ 5.000 de contas atrasadas no começo do bimestre
  - +5 no peso, com mais de R$ 10.000 de contas atrasadas no começo do bimestre
- **Efeitos:**

  - **Todos**: −R$ 11, gasto · taxa de religação da luz [1]
  - **Todos**: −R$ 168, gasto · a comida da geladeira estragou [2]
  - **Bruna**: −R$ 47 · dois dias sem luz: não gravei [3]
  - **Daiane**: −R$ 50 · dois dias sem forno nem geladeira [4]
  - **Todos**: energia −1 · dois dias no escuro
  - *Fonte [1]:* CEEE Equatorial, valores de serviços desde 22/11/2025 (REH ANEEL 3.547/2025): religação normal monofásica R$ 11,36, em até 24 h na cidade
  - *Fonte [2]:* Estimativa sem fonte: um quinto da cesta básica de um adulto (DIEESE/Conab, Porto Alegre, ago/2026: R$ 839,34 ÷ 5 = R$ 168), a carne, o leite e o que estava na geladeira
  - *Fonte [3]:* Os dias parados × a renda dela (R$ 700 × 2 ÷ 60 × 2 dias), como na carta "Temporal"
  - *Fonte [4]:* Os dias parados × a renda líquida da Daiane (R$ 25 por dia: R$ 750 × 2 ÷ 60)

- **Fonte da carta:** ANEEL, REN 1.000/2021: a distribuidora pode cortar a luz por falta de pagamento com aviso de 15 dias, até 90 dias depois do vencimento, nunca de sexta a domingo nem em feriado; a religação na cidade sai em até 24 h depois do pagamento (ANEEL, "Como resolver"; Proteste). Instituto Pólis/Ipec (publ. 31/05/2024): 30% dos que ganham até 1 salário mínimo deixam de comprar comida para pagar a luz. Chance: estimativa sem fonte (não achei a fração de cortes entre os inadimplentes): a carta só sai com contas atrasadas, e mais quanto maior o atraso

### O dono entrou com o despejo (`despejo`, "Despejo")

- **Narrativa:** O dono entrou na Justiça pelo aluguel atrasado. Se a gente não pagar tudo em até 15 dias depois da citação, com multa, juros e o advogado dele, o juiz manda sair.
- **Peso base:** 0; tom grave.
- **Ajustes de peso:**
  - peso × 0, quem tirou “O dono entrou com o despejo” em jan–fev
  - peso × 0, quem tirou “O dono entrou com o despejo” em mar–abr
  - peso × 0, quem tirou “O dono entrou com o despejo” em mai–jun
  - peso × 0, quem tirou “O dono entrou com o despejo” em jul–ago
  - peso × 0, quem tirou “O dono entrou com o despejo” em set–out
  - +4 no peso, com mais de R$ 3.000 de contas atrasadas no começo do bimestre
  - +4 no peso, com mais de R$ 8.000 de contas atrasadas no começo do bimestre
- **Efeitos:**

  - **Todos**: energia −2 · noites sem dormir com medo de perder a casa

- **Fonte da carta:** Lei 8.245/1991 (Lei do Inquilinato): art. 9º III (a locação pode ser desfeita por falta de pagamento), art. 62 II (o inquilino evita o despejo pagando, em até 15 dias depois da citação, os aluguéis, as multas, os juros, as custas e os honorários do advogado do dono) e art. 59 § 1º IX (sem garantia, o juiz pode dar 15 dias para sair, com caução de 3 aluguéis). O aluguel das personas é do mercado formal, com fiador ou análise de crédito (QuintoAndar), e por isso a ação não é a liminar: a carta é o começo do processo, e o custo é o medo. Chance: estimativa sem fonte (não achei com quantos meses de atraso o dono entra na Justiça): a carta só sai com contas atrasadas grandes, no máximo uma vez por partida

---

## 5. O que atravessa os meses

- **MEI (jan–fev, B):** o DAS sai em todos os bimestres seguintes (−R$ 172 ou −R$ 164). Com a fratura, o auxílio do INSS de R$ 2.431 (45 dias de 1 salário mínimo) chega no bimestre seguinte, a não ser que a perícia negue (~50%). Doença comum não é coberta: exige 12 meses de contribuição (Lei 8.213/1991, art. 25, I), e o jogo termina antes.
- **Crédito pessoal (mar–abr, C):** R$ 1.500 em 12 parcelas (6,39% ao mês; o Marcos pelo app da 99, a 9,36%). Duas parcelas por bimestre de mai–jun a nov–dez: 8 dentro do jogo e 4 depois. O placar conta o que falta pagar (D-065), e o empréstimo nunca aparece como renda. Com o limite do cheque especial, o empréstimo deixou de "salvar" dos juros de 7,43% sem teto: agora ele só custa os 6,39% (seção 6.3, c).
- **iFood da Daiane (mar–abr, B):** entrar no iFood exige CNPJ; quem não tinha aberto o MEI em jan–fev passa a pagar o DAS dali em diante.
- **Investir no trabalho (mai–jun, B):** a revisão da moto e os pneus do carro cortam pela metade a chance de "Quebrou" até dezembro; o curso de gel da Rose traz clientes de jul–ago em diante, +R$ 320 no primeiro bimestre e +R$ 640 nos seguintes (estimativa sem fonte da clientela); a mentoria da Bruna cobra −R$ 333 por bimestre e aumenta um pouco a chance de viralizar; o cursinho do Kauã custa um dia por semana até a prova (−R$ 365 por bimestre de mai–jun a set–out e −R$ 91 em novembro) e, em nov–dez, os dois domingos do Enem.
- **Associação (mai–jun, A):** mensalidade de jul–ago em diante; com o bloqueio, o advogado consegue a liminar no 36º dia e devolve parte da renda. Não paga nada em acidente (não achei fundo de nenhuma em Porto Alegre). Sem `protege` (provisório de 29/09).
- **Adiar a manutenção e o remédio (jul–ago, C):** "Quebrou" × 4 e a queda × 1,5 para os veículos, e a doença × 2 para quem adiou o remédio, até dezembro (estimativas).
- **Mobilização (greve de 14/04, protesto de 27/07, breque de 01/09):** cada uma dá +1 de proteção (sem efeito em dinheiro) e, para o Jonas e o Kauã, aumenta a chance da carta "Reajuste" nos bimestres seguintes (+4 no peso; estimativa).
- **Fratura, bloqueio e despejo:** no máximo uma vez por partida cada.
- **Contas atrasadas (D-066):** o que atrasou num bimestre fica atrasado nos seguintes, com mora, até um bimestre bom pagar (a folga até o limite paga o atrasado primeiro); enquanto isso, puxa as cartas de corte de luz e de despejo (seção 5.1).
- **Energia:** o que uma opção tira hoje pesa nos bimestres seguintes (exausto −10% abaixo de 3; doença, queda e fratura mais prováveis com energia baixa).

### 5.1 O cheque especial com limite, as contas atrasadas e o que faltou na mesa (D-066)

- **O limite:** R$ 2.000. Banco Central, Estudo Especial nº 84/2020 (microdados do SCR, dez/2019): limite médio de cheque especial de R$ 1.693 na faixa de renda abaixo de R$ 1,5 mil (R$ 21.422 acima de R$ 10 mil). Corrigido pelo IPCA de jan/2020 a ago/2026 (× 1,4347, BCB SGS 433): R$ 2.429. O próprio estudo avisa que o método superestima o limite (o do cheque especial é achado por resíduo) e que só entra quem teve carteira em 24 dos 36 meses; as personas não têm carteira (D-062). Usado R$ 2.000, o teto da faixa da D-066 (R$ 1.000 a R$ 2.000), abaixo dos R$ 2.429. Passado o limite, o banco não empresta mais.
- **Multa e mora:** 7% uma vez, sobre o que atrasou no bimestre, e 0,8% ao mês, simples, sobre o que já estava atrasado. Aluguel: a lei não fixa a multa, vale o contrato; o costume é 10% de multa e 1% de juros ao mês (Procon-SP, "Multas por atraso", jul/2019; Lei 8.245/1991). Luz: multa de até 2% e juros de 1% ao mês (ANEEL, REN 1.000/2021). Água: 2% e 1% ao mês (o teto do Código de Defesa do Consumidor para contas de consumo; DMAE). Celular e internet: 2% de multa (o teto do Código de Defesa do Consumidor, art. 52, § 1º) e 1% de juros ao mês (o que a operadora cobra pelo contrato: Vivo, via Selectra, 02/03/2023); a Resolução Anatel 765/2023 não fixa percentual, só manda informar a multa e os juros na fatura. Gás, ônibus e remédio não têm multa: quem não paga fica sem. Conta nossa: a média ponderada pelo peso de cada conta no que não é comida no básico das 6 casas (o aluguel é de 58% a 67%) dá multa de 6,7% e mora de 0,82% ao mês; usados 7% e 0,8%. A multa é cobrada uma vez, sobre o que atrasou no bimestre; a mora é simples, sobre o que já estava atrasado.
- **A ordem do mês (contratos, seção 3, passos 8 a 11):** primeiro a mora; num bimestre bom, a folga até o limite paga as contas atrasadas; se o caixa passaria de −R$ 2.000, o banco para no limite e o que passaria vira, nesta ordem (`cortarPrimeiro: "contas"`), conta atrasada (até as contas do bimestre: o básico menos a comida), comida não comprada (até a comida do bimestre) e, o que passar disso, conta atrasada de novo; por último a multa. A multa e a mora vão para as contas atrasadas, e não para o caixa.
- **O placar:** o patrimônio é o caixa menos o empréstimo a pagar menos as contas atrasadas. O que faltou na mesa fica à parte, porque não é dívida (D-066). É esse "à parte" que achata o placar das casas mais pobres (seção 8, item 18).
- **As cartas que o atraso puxa** (seção 4): "Cortaram a luz" (peso 0; +5 com mais de R$ 1.000 de contas atrasadas no começo do bimestre, +5 com mais de R$ 5.000 e +5 com mais de R$ 10.000) e "O dono entrou com o despejo" (peso 0; +4 com mais de R$ 3.000 e +4 com mais de R$ 8.000; uma vez por partida). As regras e os custos têm fonte; a chance é estimativa.

**O piloto automático com a carta "Normal" em todos os bimestres** (no fim de cada bimestre: dívida no banco · contas atrasadas · comida que faltou no bimestre):

| Personagem | Jan–fev | Mar–abr | Mai–jun | Jul–ago | Set–out | Nov–dez |
|---|---|---|---|---|---|---|
| Jonas | R$ 812 · R$ 0 · R$ 0 | R$ 1.963 · R$ 0 · R$ 0 | R$ 2.000 · R$ 1.710 · R$ 0 | R$ 2.000 · R$ 2.920 · R$ 0 | R$ 2.000 · R$ 4.709 · R$ 0 | R$ 2.000 · R$ 6.109 · R$ 0 |
| Rose | R$ 2.000 · R$ 1.994 · R$ 0 | R$ 2.000 · R$ 6.293 · R$ 58 | R$ 2.000 · R$ 10.661 · R$ 1.264 | R$ 2.000 · R$ 15.099 · R$ 104 | R$ 2.000 · R$ 19.570 · R$ 0 | R$ 2.000 · R$ 23.704 · R$ 0 |
| Marcos | R$ 1.118 · R$ 0 · R$ 0 | R$ 2.000 · R$ 1.760 · R$ 0 | R$ 2.000 · R$ 4.773 · R$ 0 | R$ 2.000 · R$ 6.428 · R$ 0 | R$ 2.000 · R$ 8.309 · R$ 0 | R$ 2.000 · R$ 9.960 · R$ 0 |
| Bruna | R$ 2.000 · R$ 924 · R$ 0 | R$ 2.000 · R$ 3.477 · R$ 0 | R$ 2.000 · R$ 6.855 · R$ 0 | R$ 2.000 · R$ 10.159 · R$ 0 | R$ 2.000 · R$ 13.720 · R$ 69 | R$ 2.000 · R$ 17.338 · R$ 100 |
| Kauã | R$ 2.000 · R$ 261 · R$ 0 | R$ 2.000 · R$ 2.996 · R$ 0 | R$ 2.000 · R$ 6.256 · R$ 0 | R$ 2.000 · R$ 9.706 · R$ 0 | R$ 2.000 · R$ 13.275 · R$ 0 | R$ 2.000 · R$ 16.513 · R$ 0 |
| Daiane | R$ 2.000 · R$ 2.452 · R$ 0 | R$ 2.000 · R$ 5.692 · R$ 1.495 | R$ 2.000 · R$ 8.984 · R$ 1.744 | R$ 2.000 · R$ 12.329 · R$ 1.638 | R$ 2.000 · R$ 15.727 · R$ 1.758 | R$ 2.000 · R$ 19.180 · R$ 1.526 |

Antes do limite (o config desta manhã), no mesmo caminho, a Rose terminava devendo R$ 35.112 ao banco e a Daiane, R$ 38.782 (com R$ 4.603 de juros só em nov–dez). Agora o banco para em R$ 2.000 (juros de R$ 308 por bimestre, no máximo), e o resto é conta atrasada, que cresce só pelo que atrasa, pela multa e pela mora.

**No fim dos 12 meses, 20 mil partidas** (a saída (j) do validador):

```
== (j) Dívida no fim dos 12 meses (D-066), estimado ==
Limite do cheque especial: R$ 2.000 (Banco Central, Estudo Especial nº 84/2020 (microdados do SCR, dez/2019): limite médio de cheque especial de R$ 1.693 na faixa de renda abaixo de R$ 1,5 mil (R$ 21.422 acima de R$ 10 mil). Corrigido pelo IPCA de jan/2020 a ago/2026 (× 1,4347, BCB SGS 433): R$ 2.429. O próprio estudo avisa que o método superestima o limite (o do cheque especial é achado por resíduo) e que só entra quem teve carteira em 24 dos 36 meses; as personas não têm carteira (D-062). Usado R$ 2.000, o teto da faixa da D-066 (R$ 1.000 a R$ 2.000), abaixo dos R$ 2.429. Passado o limite, o banco não empresta mais). Corta primeiro: contas; multa 7%, mora 0,8% ao mês.
Critério: E = esperado; pior = o maior valor achado. "Ao acaso": todas as combinações de decisões igualmente prováveis;
"padrão": o plano c-d-b-c-a-d. "Faltou na mesa" é comida que não foi comprada (acumulada), e não entra na dívida.
  Jonas (motoboy): ao acaso banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 9.473 (pior R$ 22.088) · faltou na mesa E R$ 628 (pior R$ 6.288) · dívida total E R$ 11.592 (pior R$ 24.713)
                   padrão   banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 10.376 (pior R$ 21.057) · faltou na mesa E R$ 582 (pior R$ 5.128) · dívida total E R$ 12.376 (pior R$ 23.057)
  Rose (manicure): ao acaso banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 23.464 (pior R$ 26.559) · faltou na mesa E R$ 3.560 (pior R$ 11.448) · dívida total E R$ 25.583 (pior R$ 29.184)
                   padrão   banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 24.040 (pior R$ 26.559) · faltou na mesa E R$ 3.320 (pior R$ 10.153) · dívida total E R$ 26.040 (pior R$ 28.559)
  Marcos (motorista): ao acaso banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 12.869 (pior R$ 25.846) · faltou na mesa E R$ 877 (pior R$ 7.779) · dívida total E R$ 15.000 (pior R$ 27.846)
                      padrão   banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 14.394 (pior R$ 24.246) · faltou na mesa E R$ 765 (pior R$ 6.842) · dívida total E R$ 16.394 (pior R$ 26.246)
  Bruna (influenciadora): ao acaso banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 16.460 (pior R$ 19.840) · faltou na mesa E R$ 774 (pior R$ 4.931) · dívida total E R$ 18.579 (pior R$ 21.840)
                          padrão   banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 17.407 (pior R$ 19.379) · faltou na mesa E R$ 1.037 (pior R$ 2.717) · dívida total E R$ 19.407 (pior R$ 21.379)
  Kauã (bike): ao acaso banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 16.660 (pior R$ 21.790) · faltou na mesa E R$ 762 (pior R$ 6.340) · dívida total E R$ 18.779 (pior R$ 24.072)
               padrão   banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 17.771 (pior R$ 21.485) · faltou na mesa E R$ 685 (pior R$ 4.840) · dívida total E R$ 19.771 (pior R$ 23.485)
  Daiane (vendedora): ao acaso banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 19.228 (pior R$ 21.299) · faltou na mesa E R$ 8.953 (pior R$ 11.833) · dívida total E R$ 21.347 (pior R$ 23.907)
                      padrão   banco E R$ 2.000 (pior R$ 2.000) · contas atrasadas E R$ 19.246 (pior R$ 20.484) · faltou na mesa E R$ 9.107 (pior R$ 11.183) · dívida total E R$ 21.246 (pior R$ 22.484)
```

| Personagem | Plano | Contas atrasadas no fim (esperado) | Faltou na mesa no ano (esperado) | Partidas com comida cortada |
|---|---|---|---|---|
| Jonas | padrão | R$ 10.365 | R$ 548 | 23% |
| Jonas | ao acaso | R$ 9.500 | R$ 606 | 26% |
| Rose | padrão | R$ 24.136 | R$ 3.315 | 100% |
| Rose | ao acaso | R$ 23.517 | R$ 3.615 | 100% |
| Marcos | padrão | R$ 14.578 | R$ 818 | 36% |
| Marcos | ao acaso | R$ 12.956 | R$ 859 | 35% |
| Bruna | padrão | R$ 17.477 | R$ 1.041 | 100% |
| Bruna | ao acaso | R$ 16.498 | R$ 836 | 92% |
| Kauã | padrão | R$ 17.839 | R$ 739 | 92% |
| Kauã | ao acaso | R$ 16.703 | R$ 774 | 69% |
| Daiane | padrão | R$ 19.322 | R$ 9.088 | 100% |
| Daiane | ao acaso | R$ 19.304 | R$ 8.984 | 100% |

- **A Daiane corta comida em quase todo bimestre:** a falta dela (−R$ 4.292 por bimestre) passa das contas do bimestre (R$ 2.992), e o resto sai da comida (de R$ 2.518 no bimestre). A Rose fica na beira: as contas do bimestre dela (R$ 3.988) quase cobrem a falta (−R$ 3.864), e qualquer carta ruim vira comida cortada.
- **Nas outras casas, a comida cortada é pouca, mas aparece:** no padrão, de R$ 548 a R$ 1.041 no ano, em média, quase sempre no bimestre de uma carta ruim, quando o que falta passa das contas do bimestre. Bruna e Kauã cortam alguma comida na maioria das partidas.

### 5.2 O auxílio do INSS acima do trabalho (D-067)

O auxílio do INSS para quem paga o MEI é de 1 salário mínimo por mês (R$ 1.621, Decreto 12.797/2025; nunca menor que isso, Lei 8.213/1991, art. 33). No jogo, R$ 2.431 pelos 45 dias da fratura. O que o trabalho deixa num bimestre comum (`motor.trabalhoComum`: trabalho − custos fixos, × 2, sem a outra renda da casa):

| Personagem | Trabalho num bimestre comum | O auxílio passa dele? | A frase da tela |
|---|---|---|---|
| Jonas | R$ 4.400 | não | — |
| Rose | R$ 4.200 | não | — |
| Marcos | R$ 5.740 | não | — |
| Bruna | R$ 1.400 | **sim** | Auxílio do INSS pelo MEI (45 dias de 1 salário mínimo): R$ 2.431, mais do que Bruna ganhava trabalhando num bimestre comum (R$ 1.400). |
| Kauã | R$ 2.740 | não | — |
| Daiane | R$ 1.218 | **sim** | Auxílio do INSS pelo MEI (45 dias de 1 salário mínimo): R$ 2.431, mais do que Daiane ganhava trabalhando num bimestre comum (R$ 1.218). |

- **"1 salário mínimo" está no rótulo do efeito**, e não na frase, porque o núcleo não escreve conteúdo: a frase usa o rótulo. Se preferir a frase da D-067 como foi pedida ("mais do que [nome] ganhava trabalhando", sem "num bimestre comum"), é texto do núcleo (`historia.fraseAcimaDoTrabalho`), fora destes dois arquivos.
- **Quem fica abaixo:** Kauã (o trabalho passa o auxílio em R$ 309), Rose (o trabalho passa o auxílio em R$ 1.769), Jonas (o trabalho passa o auxílio em R$ 1.969) e Marcos (o trabalho passa o auxílio em R$ 3.309).

---

## 6. Contas

### 6.1 O piloto automático com a carta "Normal" em todos os bimestres

O plano padrão (quem nunca vota) é **C-D-B-C-A-D** (Jan–fev C, Mar–abr D, Mai–jun B, Jul–ago C, Set–out A, Nov–dez D). Com a carta "Normal" nos 6 bimestres (nenhuma surpresa, nem boa nem ruim):

| Personagem | Jan–fev | Mar–abr | Mai–jun | Jul–ago | Set–out | Nov–dez | Juros no ano |
|---|---|---|---|---|---|---|---|
| Jonas | −R$ 812 (e6) | −R$ 1.963 (e4) | −R$ 3.710 (e3) | −R$ 4.920 (e2) | −R$ 6.709 (e1) | −R$ 8.109 (e0) | R$ 1.352 |
| Rose | −R$ 3.994 (e5) | −R$ 8.293 (e3) | −R$ 12.661 (e2) | −R$ 17.099 (e1) | −R$ 21.570 (e0) | −R$ 25.704 (e0) | R$ 1.540 |
| Marcos | −R$ 1.118 (e5) | −R$ 3.760 (e3) | −R$ 6.773 (e2) | −R$ 8.428 (e1) | −R$ 10.309 (e0) | −R$ 11.960 (e0) | R$ 1.404 |
| Bruna | −R$ 2.924 (e6) | −R$ 5.477 (e4) | −R$ 8.855 (e3) | −R$ 12.159 (e2) | −R$ 15.720 (e1) | −R$ 19.338 (e0) | R$ 1.540 |
| Kauã | −R$ 2.261 (e6) | −R$ 4.996 (e4) | −R$ 8.256 (e2) | −R$ 11.706 (e0) | −R$ 15.275 (e0) | −R$ 18.513 (e0) | R$ 1.540 |
| Daiane | −R$ 4.452 (e5) | −R$ 7.692 (e1) | −R$ 10.984 (e0) | −R$ 14.329 (e0) | −R$ 17.727 (e0) | −R$ 21.180 (e0) | R$ 1.540 |

Patrimônio no fim de cada bimestre (o caixa menos o empréstimo e as contas atrasadas, o número do placar), com a energia entre parênteses. Os juros do ano são o que o cheque especial custou, até o limite de R$ 2.000. A dívida no banco, as contas atrasadas e a comida cortada do mesmo caminho estão na seção 5.1.

### 6.2 Distribuição do fim dos 12 meses (20 mil partidas por linha)

"Saldo" é o patrimônio do placar: o caixa menos o empréstimo a pagar e as contas atrasadas (o que faltou na mesa fica fora; seção 5.1). "Ao acaso": cada opção com a mesma chance em cada bimestre. "Bimestre no azul": o saldo do bimestre ≥ R$ 0.

| Personagem | Plano | Esperado | Mediana | 10% piores até | 10% melhores a partir de | Pior | Melhor | Fecha o básico | Partidas com um bimestre no azul | Energia chega a 0 | Tirou carta grave |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Jonas | padrão | −R$ 12.365 | −R$ 12.123 | −R$ 15.146 | −R$ 9.845 | −R$ 22.615 | −R$ 6.605 | 0,00% | 0,0% | 100% | 50% |
| Jonas | ao acaso | −R$ 11.656 | −R$ 11.489 | −R$ 14.885 | −R$ 8.610 | −R$ 22.435 | −R$ 4.138 | 0,00% | 17,9% | 86% | 54% |
| Rose | padrão | −R$ 26.136 | −R$ 26.133 | −R$ 26.824 | −R$ 25.443 | −R$ 28.648 | −R$ 24.105 | 0,00% | 0,0% | 100% | 60% |
| Rose | ao acaso | −R$ 25.674 | −R$ 25.680 | −R$ 26.651 | −R$ 24.653 | −R$ 29.273 | −R$ 22.427 | 0,00% | 0,0% | 88% | 64% |
| Marcos | padrão | −R$ 16.578 | −R$ 16.390 | −R$ 19.711 | −R$ 13.644 | −R$ 27.661 | −R$ 9.832 | 0,00% | 0,0% | 100% | 59% |
| Marcos | ao acaso | −R$ 15.128 | −R$ 15.004 | −R$ 18.828 | −R$ 11.584 | −R$ 26.611 | −R$ 5.112 | 0,00% | 15,9% | 89% | 62% |
| Bruna | padrão | −R$ 19.477 | −R$ 19.610 | −R$ 20.455 | −R$ 18.224 | −R$ 21.874 | −R$ 15.079 | 0,00% | 0,0% | 100% | 45% |
| Bruna | ao acaso | −R$ 18.652 | −R$ 18.739 | −R$ 19.958 | −R$ 17.221 | −R$ 21.902 | −R$ 12.833 | 0,00% | 0,0% | 77% | 49% |
| Kauã | padrão | −R$ 19.839 | −R$ 19.718 | −R$ 20.919 | −R$ 18.876 | −R$ 23.882 | −R$ 17.297 | 0,00% | 0,0% | 100% | 58% |
| Kauã | ao acaso | −R$ 18.859 | −R$ 18.839 | −R$ 20.371 | −R$ 17.315 | −R$ 24.631 | −R$ 15.059 | 0,00% | 0,0% | 88% | 64% |
| Daiane | padrão | −R$ 21.322 | −R$ 21.180 | −R$ 21.730 | −R$ 20.798 | −R$ 22.825 | −R$ 20.798 | 0,00% | 0,0% | 100% | 52% |
| Daiane | ao acaso | −R$ 21.460 | −R$ 21.388 | −R$ 22.088 | −R$ 20.798 | −R$ 24.133 | −R$ 19.831 | 0,00% | 0,0% | 99% | 55% |

- **Ninguém fecha.** O "melhor" de 20 mil partidas ao acaso vai de −R$ 4.138 (Jonas) a −R$ 22.427 (Rose). O validador, que procura também o melhor caminho de propósito, acha o Jonas em −R$ 770 (seção 6.3, g).
- **Até um bimestre no azul é raro:** Jonas 17,86%, Rose 0,00%, Marcos 15,89%, Bruna 0,03%, Kauã 0,04% e Daiane 0,00% das partidas ao acaso têm pelo menos um. O "quase" que a sala pode ver é o de Jonas e Marcos; nas outras casas, nem isso.
- **A distância entre as casas é maior que a distância entre as escolhas:** ao acaso, o esperado da Rose fica de R$ 4.213 a R$ 14.018 abaixo do das outras casas.

### 6.3 O que o validador disse (saída de `npm run validar`, trechos)

```

> seminario-viracao@0.1.0 validar
> node bin/validar-config.mjs

Config: config.json
Sem erros. Hash do config: fccc2a93

Modo: SIMULAÇÃO determinística. Até 9.784.320 caminhos de cartas por equipe,
acima do limite de 200.000 da enumeração exata. Os números de (a) a (i) são ESTIMADOS: 2000 estados antes de cada rodada,
4000 caminhos até o fim, 200 planos sorteados com 400 caminhos cada (o plano do padrão com 4000),
semente derivada do hash do config (a mesma saída a cada execução). Pior e melhor caso: o achado na simulação mais uma busca dirigida.
```

**(c) e (d) Opção dominante e piloto automático.** Os avisos (Rose em jan–fev ("A" termina com mais saldo que cada uma das outras em 72% a 88% das partidas) e Daiane em jan–fev ("A" termina com mais saldo que cada uma das outras em 75% a 82% das partidas); padrão de maior saldo: Rose em mai–jun e Daiane de mar–abr a jul–ago) são de diferenças de dezenas de reais nas casas que passam do limite: o que muda de uma opção para outra vira comida cortada, fora do placar (seção 8, item 18). Na Daiane, em 4 dos 6 bimestres, as 4 opções ficam a menos de R$ 40 umas das outras.

```
== (c) e (d) Opção dominante e piloto automático ==
Critério: indicadores no FIM do jogo, escolhendo a opção naquela rodada e as outras ao acaso.
"renda" aqui e daqui em diante é o patrimônio: o saldo acumulado menos o empréstimo a pagar (o placar).
Dominante: vence as outras em todos os indicadores (esperado), ou vence em renda com mais de 70% de probabilidade.

Jonas (motoboy) · equipe e1
  r1  a renda E -12.263,3 · b renda E -12.441,3 · c* renda E -11.417 · d renda E -10.568,1   (* = padrão)
  r2  a renda E -11.595,5 · b renda E -11.376,1 · c renda E -11.843 · d* renda E -11.711,5   (* = padrão)
  r3  a renda E -11.752,5 · b* renda E -11.973,9 · c renda E -11.396,8 · d renda E -11.364,8   (* = padrão)
  r4  a renda E -11.407,9 · b renda E -11.642,6 · c* renda E -11.821,1 · d renda E -11.679,1   (* = padrão)
  r5  a* renda E -11.808,7 · b renda E -12.089,2 · c renda E -11.893,8 · d renda E -11.229,4   (* = padrão)
  r6  a renda E -11.733,1 · b renda E -10.963,4 · c renda E -12.496,4 · d* renda E -11.918,6   (* = padrão)

Rose (manicure) · equipe e2
  r1  a renda E -25.045 · b renda E -26.083,9 · c* renda E -25.746,2 · d renda E -25.604,7   (* = padrão)
  AVISO: Rose (manicure), r1: a opção "a" vence em renda com probabilidade 87,6% / 76,2% / 72,1% contra b / c / d.
  r2  a renda E -25.692,8 · b renda E -25.560,9 · c renda E -25.558,2 · d* renda E -25.714,3   (* = padrão)
  r3  a renda E -25.750,1 · b* renda E -25.366,9 · c renda E -25.438,8 · d renda E -25.700,6   (* = padrão)
  AVISO: Rose (manicure), r3: o padrão "b" é a opção de maior renda esperada; o piloto automático premia quem não votou.
  r4  a renda E -25.603,5 · b renda E -25.641 · c* renda E -25.665,9 · d renda E -25.583,1   (* = padrão)
  r5  a* renda E -25.694,4 · b renda E -25.668,6 · c renda E -25.664,8 · d renda E -25.612,3   (* = padrão)
  r6  a renda E -25.734,7 · b renda E -25.306 · c renda E -25.842,7 · d* renda E -25.791   (* = padrão)

Marcos (motorista) · equipe e3
  r1  a renda E -15.447,9 · b renda E -15.878,8 · c* renda E -15.219 · d renda E -13.708,2   (* = padrão)
  r2  a renda E -14.956,9 · b renda E -14.548,7 · c renda E -15.674,4 · d* renda E -14.915,9   (* = padrão)
  r3  a renda E -15.076,3 · b* renda E -16.141,7 · c renda E -14.630,4 · d renda E -14.603,2   (* = padrão)
  r4  a renda E -15.035,2 · b renda E -15.117,1 · c* renda E -15.272,2 · d renda E -14.875,1   (* = padrão)
  r5  a* renda E -15.172 · b renda E -15.531,2 · c renda E -15.314,2 · d renda E -14.747   (* = padrão)
  r6  a renda E -15.074,2 · b renda E -14.176 · c renda E -15.997 · d* renda E -15.330,6   (* = padrão)

Bruna (influenciadora) · equipe e4
  r1  a renda E -18.267,1 · b renda E -19.154,7 · c* renda E -18.566,3 · d renda E -18.398,5   (* = padrão)
  r2  a renda E -18.756,8 · b renda E -18.498,2 · c renda E -18.245,7 · d* renda E -18.768,5   (* = padrão)
  r3  a renda E -18.592,6 · b* renda E -18.956,6 · c renda E -18.432,3 · d renda E -18.468   (* = padrão)
  r4  a renda E -18.131,8 · b renda E -18.742,2 · c* renda E -18.689,7 · d renda E -18.711,6   (* = padrão)
  r5  a* renda E -18.582,5 · b renda E -18.594,5 · c renda E -18.642,9 · d renda E -18.408,2   (* = padrão)
  r6  a renda E -18.468,7 · b renda E -18.563,4 · c renda E -18.570,6 · d* renda E -18.484,1   (* = padrão)

Kauã (bike) · equipe e5
  r1  a renda E -19.244,5 · b renda E -19.200,1 · c* renda E -18.629,9 · d renda E -18.330   (* = padrão)
  r2  a renda E -18.900,3 · b renda E -18.653,4 · c renda E -18.927,3 · d* renda E -18.865,9   (* = padrão)
  r3  a renda E -18.757 · b* renda E -19.674,6 · c renda E -18.348,4 · d renda E -18.512,4   (* = padrão)
  r4  a renda E -18.737,2 · b renda E -18.892,3 · c* renda E -18.921,9 · d renda E -18.821,5   (* = padrão)
  r5  a* renda E -18.893,9 · b renda E -18.931,2 · c renda E -18.910,7 · d renda E -18.588,6   (* = padrão)
  r6  a renda E -18.693,8 · b renda E -18.660,9 · c renda E -19.072,9 · d* renda E -18.827,7   (* = padrão)

Daiane (vendedora) · equipe e6
  r1  a renda E -21.050,2 · b renda E -21.659,1 · c* renda E -21.410,7 · d renda E -21.450,7   (* = padrão)
  AVISO: Daiane (vendedora), r1: a opção "a" vence em renda com probabilidade 82,2% / 75,2% / 76,3% contra b / c / d.
  r2  a renda E -21.249,2 · b renda E -21.256,6 · c renda E -21.900,8 · d* renda E -21.236,8   (* = padrão)
  AVISO: Daiane (vendedora), r2: o padrão "d" é a opção de maior renda esperada; o piloto automático premia quem não votou.
  r3  a renda E -21.417,4 · b* renda E -21.406 · c renda E -21.421,5 · d renda E -21.420,2   (* = padrão)
  AVISO: Daiane (vendedora), r3: o padrão "b" é a opção de maior renda esperada; o piloto automático premia quem não votou.
  r4  a renda E -21.422,2 · b renda E -21.422,6 · c* renda E -21.402,5 · d renda E -21.436,5   (* = padrão)
  AVISO: Daiane (vendedora), r4: o padrão "c" é a opção de maior renda esperada; o piloto automático premia quem não votou.
  r5  a* renda E -21.451 · b renda E -21.416,8 · c renda E -21.455,5 · d renda E -21.418,5   (* = padrão)
  r6  a renda E -21.406,7 · b renda E -21.435,2 · c renda E -21.437,8 · d* renda E -21.436,7   (* = padrão)
```

**(e) Quanto as decisões explicam.** De 20,6% (Jonas) a 44% (Daiane). Os avisos da faixa de 30% a 60% são esperados (D-024): a sorte pesa mais que a escolha, e em 12 meses pesa ainda mais.

```
== (e) Variância da renda final: decisões × cartas ==
Critério: todas as combinações de decisões, igualmente prováveis; cartas pelas chances.
Var total = Var(esperado dado as decisões) + E(Var dado as decisões).
Faixa sugerida para as decisões: 30% a 60%.
Estimado: 240 planos (200 sorteados de 4.096, mais o padrão e as trocas da proteção), 400 caminhos cada; a parte das decisões desconta o ruído da amostra.
  Jonas (motoboy): decisões 20,6% · cartas 79,4%  (200 combinações sorteadas, estimado)
  AVISO: Jonas (motoboy): as decisões explicam 20,6% da variância da renda, fora da faixa sugerida.
  Rose (manicure): decisões 40,5% · cartas 59,5%  (200 combinações sorteadas, estimado)
  Marcos (motorista): decisões 23% · cartas 77%  (200 combinações sorteadas, estimado)
  AVISO: Marcos (motorista): as decisões explicam 23% da variância da renda, fora da faixa sugerida.
  Bruna (influenciadora): decisões 29,2% · cartas 70,8%  (200 combinações sorteadas, estimado)
  AVISO: Bruna (influenciadora): as decisões explicam 29,2% da variância da renda, fora da faixa sugerida.
  Kauã (bike): decisões 34% · cartas 66%  (200 combinações sorteadas, estimado)
  Daiane (vendedora): decisões 44% · cartas 56%  (200 combinações sorteadas, estimado)
```

```
== (f) Indicadores que caem até o mínimo ==
Critério: fração das partidas (cada equipe, decisões ao acaso) em que o indicador estava acima do
mínimo e caiu até ele em algum mês. "Com consequência": alguma condição do config lê o indicador.
  renda: 0% das partidas (SEM consequência)
  energia: 88,4% das partidas (com consequência)
  protecao: 0% das partidas (SEM consequência)
  emprestimo: 0% das partidas (SEM consequência)
  contas_atrasadas: 0,1% das partidas (com consequência)
  faltou_na_mesa: 0% das partidas (SEM consequência)
```

**(g) Quem fecha o básico.**

```
== (g) Quem fecha o básico no fim dos 12 meses (D-050, D-058), estimado ==
Critério: fecha quem termina com o saldo acumulado menos o empréstimo a pagar ≥ R$ 0. "Ao acaso": todas as combinações de decisões
igualmente prováveis, cartas pelas chances. "Melhor plano": a combinação com a maior chance de fechar.
"Melhor caminho": a maior renda final possível (decisões e cartas), com chance acima de 0.
"Só o padrão": o plano c-d-b-c-a-d, o de quem nunca vota.
Meta da D-058: de 5% a 10% ao acaso, em pelo menos 2 personas; só o padrão, nunca.
  Jonas (motoboy): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 770 (r1 a/promocao → r2 b/promocao → r3 c/promocao → r4 a/promocao → r5 d/promocao → r6 d/promocao) · só o padrão fecha em 0%
  AVISO: Jonas (motoboy): nenhum caminho fecha o básico (o melhor termina com −R$ 770); a D-050 pede "quase ninguém", e não "ninguém".
  Rose (manicure): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 21.549 (r1 a/promocao → r2 b/promocao → r3 b/normal → r4 d/normal → r5 a/promocao → r6 b/promocao) · só o padrão fecha em 0%
  AVISO: Rose (manicure): nenhum caminho fecha o básico (o melhor termina com −R$ 21.549); a D-050 pede "quase ninguém", e não "ninguém".
  Marcos (motorista): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 2.663 (r1 a/promocao → r2 b/promocao → r3 d/promocao → r4 c/promocao → r5 d/promocao → r6 b/promocao) · só o padrão fecha em 0%
  AVISO: Marcos (motorista): nenhum caminho fecha o básico (o melhor termina com −R$ 2.663); a D-050 pede "quase ninguém", e não "ninguém".
  Bruna (influenciadora): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 7.172 (r1 a/viralizou → r2 b/viralizou → r3 c/viralizou → r4 a/viralizou → r5 d/viralizou → r6 d/viralizou) · só o padrão fecha em 0%
  AVISO: Bruna (influenciadora): nenhum caminho fecha o básico (o melhor termina com −R$ 7.172); a D-050 pede "quase ninguém", e não "ninguém".
  Kauã (bike): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 13.397 (r1 c/promocao → r2 b/promocao → r3 c/promocao → r4 a/promocao → r5 d/promocao → r6 a/promocao) · só o padrão fecha em 0%
  AVISO: Kauã (bike): nenhum caminho fecha o básico (o melhor termina com −R$ 13.397); a D-050 pede "quase ninguém", e não "ninguém".
  Daiane (vendedora): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 20.069 (r1 b/fratura → r2 c/doenca → r3 d/alcance → r4 a/normal → r5 b/promocao → r6 a/normal) · só o padrão fecha em 0%
  AVISO: Daiane (vendedora): nenhum caminho fecha o básico (o melhor termina com −R$ 20.069); a D-050 pede "quase ninguém", e não "ninguém".
  AVISO: só 0 persona(s) fecham o básico entre 5% e 10% das partidas ao acaso; a D-058 pede pelo menos 2.
```

**(h) A melhor opção, a letra do esforço e o esgotamento.**

```
== (h) A melhor opção muda com a persona, e a letra do esforço muda com o mês (D-051) ==
Melhor opção: a de maior renda final esperada, escolhendo-a naquele mês e as outras ao acaso (a conta de (c)).
Maior esforço/renda: a opção de maior renda esperada no próprio mês (a variação de (b)), na média das personas;
a letra é a posição dela na rodada (A, B, C, D), como no telão.
  r1 melhor opção: Jonas (motoboy) d · Rose (manicure) a · Marcos (motorista) d · Bruna (influenciadora) a · Kauã (bike) d · Daiane (vendedora) a
  r2 melhor opção: Jonas (motoboy) b · Rose (manicure) c · Marcos (motorista) b · Bruna (influenciadora) c · Kauã (bike) b · Daiane (vendedora) d
  r3 melhor opção: Jonas (motoboy) d · Rose (manicure) b · Marcos (motorista) d · Bruna (influenciadora) c · Kauã (bike) c · Daiane (vendedora) b
  r4 melhor opção: Jonas (motoboy) a · Rose (manicure) d · Marcos (motorista) d · Bruna (influenciadora) a · Kauã (bike) a · Daiane (vendedora) c
  r5 melhor opção: Jonas (motoboy) d · Rose (manicure) d · Marcos (motorista) d · Bruna (influenciadora) d · Kauã (bike) d · Daiane (vendedora) b
  r6 melhor opção: Jonas (motoboy) b · Rose (manicure) b · Marcos (motorista) b · Bruna (influenciadora) a · Kauã (bike) b · Daiane (vendedora) a
  r1 maior esforço/renda no mês: A ("a", renda E −R$ 2.180 no mês)
  r2 maior esforço/renda no mês: B ("b", renda E −R$ 2.726 no mês)
  r3 maior esforço/renda no mês: C ("c", renda E −R$ 2.727 no mês)
  r4 maior esforço/renda no mês: A ("a", renda E −R$ 3.004 no mês)
  r5 maior esforço/renda no mês: D ("d", renda E −R$ 2.930 no mês)
  r6 maior esforço/renda no mês: B ("b", renda E −R$ 2.752 no mês)
Esgotamento (D-059): a opção mais cansativa do mês (maior perda de energia esperada; empate pela renda do mês), por persona, contra a melhor opção dela; aviso com 3 ou mais personas no mesmo mês.
  r1 mais cansativa: Jonas (motoboy) a (energia E -5,5), a melhor é d · Rose (manicure) a (energia E -5,3) é a melhor · Marcos (motorista) a (energia E -5,3), a melhor é d · Bruna (influenciadora) a (energia E -5,3) é a melhor · Kauã (bike) a (energia E -5,4), a melhor é d · Daiane (vendedora) a (energia E -5,2) é a melhor
  AVISO: r1: a opção mais cansativa do mês é a de maior saldo esperado para 3 personas (Rose (manicure), Bruna (influenciadora), Daiane (vendedora)); a D-059 pede que o esgotamento deixe de ser o melhor plano para a maioria.
  r2 mais cansativa: Jonas (motoboy) b (energia E -2,9) é a melhor · Rose (manicure) b (energia E -2,6), a melhor é c · Marcos (motorista) b (energia E -2,7) é a melhor · Bruna (influenciadora) b (energia E -2,9), a melhor é c · Kauã (bike) b (energia E -2,9) é a melhor · Daiane (vendedora) b (energia E -3,9), a melhor é d
  AVISO: r2: a opção mais cansativa do mês é a de maior saldo esperado para 3 personas (Jonas (motoboy), Marcos (motorista), Kauã (bike)); a D-059 pede que o esgotamento deixe de ser o melhor plano para a maioria.
  r3 mais cansativa: Jonas (motoboy) c (energia E -2,9), a melhor é d · Rose (manicure) c (energia E -2,4), a melhor é b · Marcos (motorista) c (energia E -2,4), a melhor é d · Bruna (influenciadora) c (energia E -2,9) é a melhor · Kauã (bike) c (energia E -2,9) é a melhor · Daiane (vendedora) c (energia E -1,5), a melhor é b
  r4 mais cansativa: Jonas (motoboy) a (energia E -1,7) é a melhor · Rose (manicure) a (energia E -1,3), a melhor é d · Marcos (motorista) a (energia E -1,2), a melhor é d · Bruna (influenciadora) b (energia E -0,8), a melhor é a · Kauã (bike) a (energia E -1,6) é a melhor · Daiane (vendedora) a (energia E -0,2), a melhor é c
  r5 mais cansativa: Jonas (motoboy) d (energia E -1,4) é a melhor · Rose (manicure) d (energia E -1,3) é a melhor · Marcos (motorista) d (energia E -1,2) é a melhor · Bruna (influenciadora) d (energia E -2) é a melhor · Kauã (bike) d (energia E -1,2) é a melhor · Daiane (vendedora) d (energia E -0,7), a melhor é b
  AVISO: r5: a opção mais cansativa do mês é a de maior saldo esperado para 5 personas (Jonas (motoboy), Rose (manicure), Marcos (motorista), Bruna (influenciadora), Kauã (bike)); a D-059 pede que o esgotamento deixe de ser o melhor plano para a maioria.
  r6 mais cansativa: Jonas (motoboy) b (energia E -0,8) é a melhor · Rose (manicure) b (energia E -0,8) é a melhor · Marcos (motorista) b (energia E -0,7) é a melhor · Bruna (influenciadora) b (energia E -1,2), a melhor é a · Kauã (bike) b (energia E -0,7) é a melhor · Daiane (vendedora) a (energia E -0,4) é a melhor
  AVISO: r6: a opção mais cansativa do mês é a de maior saldo esperado para 5 personas (Jonas (motoboy), Rose (manicure), Marcos (motorista), Kauã (bike), Daiane (vendedora)); a D-059 pede que o esgotamento deixe de ser o melhor plano para a maioria.
```

**(i) Conta do mês.**

```
== (i) Conta do mês: trabalho e "entrou" ==
Critério: todos os estados alcançáveis (decisões anteriores ao acaso) × cada opção × cada carta possível.
Piso do trabalho variável (regras.pisoTrabalho): ligado.
  Jonas (motoboy): trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta
  Jonas (motoboy): "entrou" ≥ R$ 0 em todos os caminhos (pior R$ 1.873)
  Rose (manicure): trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta
  Rose (manicure): "entrou" ≥ R$ 0 em todos os caminhos (pior R$ 868)
  Marcos (motorista): trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta
  Marcos (motorista): "entrou" ≥ R$ 0 em todos os caminhos (pior R$ 1.982)
  Bruna (influenciadora): trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta
  Bruna (influenciadora): "entrou" ≥ R$ 0 em todos os caminhos (pior R$ 2.212)
  Kauã (bike): trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta
  Kauã (bike): "entrou" ≥ R$ 0 em todos os caminhos (pior R$ 2.468)
  Daiane (vendedora): trabalho ≥ R$ 0 em todos os caminhos; renda perdida nunca maior que a renda sem a carta
  AVISO: Daiane (vendedora): o "entrou" fica negativo (pior −R$ 456, r4 d/fratura); ao acaso, em r1 0,88% · r2 0% · r3 0,72% · r4 2,4% · r5 2,6% · r6 0,31% dos casos

21 aviso(s) de equilíbrio. Avisos não bloqueiam a sala; são para calibrar o jogo.
```

### 6.4 A proteção (D-059)

```
== (h) Proteção: o pior caso com e sem as opções que protegem (D-059) ==
Critério: renda final (cartas pelas chances). "Plano padrão": todas as rodadas no padrão, só a proteção trocada.
"Média": sobre todas as combinações que usam a proteção, com ela e com o padrão no lugar dela.
  Jonas (motoboy), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior estimado −R$ 24.214 com, −R$ 24.338 sem · esperado −R$ 12.920 com, −R$ 12.376 sem · média: pior +642,5, esperado -890
  Rose (manicure), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior estimado −R$ 28.559 com, −R$ 28.559 sem · esperado −R$ 26.364 com, −R$ 26.040 sem · média: pior +64,5, esperado -321,8
  Marcos (motorista), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior estimado −R$ 28.788 com, −R$ 29.423 sem · esperado −R$ 17.262 com, −R$ 16.394 sem · média: pior +670,4, esperado -792,4
  Bruna (influenciadora), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior estimado −R$ 21.327 com, −R$ 21.814 sem · esperado −R$ 19.613 com, −R$ 19.407 sem · média: pior +367,1, esperado -621,9
  Kauã (bike), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior estimado −R$ 23.449 com, −R$ 24.050 sem · esperado −R$ 20.311 com, −R$ 19.771 sem · média: pior +800,5, esperado -643,2
  Daiane (vendedora), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior estimado −R$ 23.042 com, −R$ 22.619 sem · esperado −R$ 21.429 com, −R$ 21.246 sem · média: pior -380,3, esperado -209,5
```

- **O MEI perde no esperado** em todas as personas (o DAS de 12 meses contra o auxílio que só vem com a fratura, ~2% por bimestre para quem está na rua, e que a perícia nega em ~50%) e **melhora o pior caso** de todas menos Rose e Daiane: nelas, a perda da fratura vira comida cortada, que fica fora do placar, e o DAS continua saindo (seção 8, item 18). Nas outras, é o comportamento de seguro que a D-059 pede.
- **Na Bruna, o ganho no pior caso é pequeno** (+R$ 487 no plano padrão): a fratura dela custa pouco (a renda é baixa), e o MEI de criador de conteúdo ainda está a conferir (seção 8, item 6). Na Rose, +R$ 0; na Daiane, −R$ 423.

### 6.5 A referência "com carteira assinada" (D-056, D-062)

- **A conta** (no config, em `referencias[0].fonte`): CAGED ago/2025-jul/2026: salário-base médio de motoboy R$ 1.763,45; +30% de periculosidade (Lei 12.997/2014); INSS 2026 (Portaria MPS/MF 13/2026): líquido R$ 2.110,48; IR isento (Lei 15.270/2025). A mesma casa do Jonas de app (D-056): + as faxinas e a revenda da companheira (R$ 1.500, informal, D-062), − básico de R$ 4.092, parcela da moto (R$ 480) e manutenção (R$ 261, que com carteira sai do salário) = −R$ 1.223 por mês; como no jogo (D-066): o cheque especial vai até o limite de R$ 2.000, com juros de 7,43% ao mês compostos no bimestre; o que passa dele vira conta atrasada, com multa de 7% uma vez e mora de 0,8% ao mês; + 13º (R$ 2.110) e o terço de férias (~R$ 672) de 12 meses no último bimestre, que pagam R$ 29 do atrasado. Patrimônio por bimestre (o caixa menos as contas atrasadas): −2.476 → −5.430 → −8.431 → −11.480 → −14.578 → −14.750 (no fim, R$ 2.000 no banco e R$ 12.750 de contas atrasadas; a comida não chega a ser cortada). Conta nossa; a validar (D-062). Não leva o FGTS (R$ 183 por mês) nem o INSS desde o 1º dia.
- **O placar mostra −R$ 14.750.** O Jonas de app no piloto automático termina com o esperado de −R$ 12.365 e a mediana de −R$ 12.123; só **13%** das partidas do padrão terminam abaixo da referência (ao acaso, 11%). Com a carta "Normal" em todos os bimestres, o Jonas de app termina com −R$ 8.109.
- **Por quê:** a renda de app da PNAD 2025 (R$ 2.221 já sem o combustível, 44,9 h por semana) passa do líquido do motoboy com carteira (R$ 2.110), e a conta da carteira ainda paga a parcela da moto e a manutenção. O que a carteira dá e o placar não mede (INSS desde o 1º dia, FGTS, férias, o auxílio-doença que a doença do jogo não paga) fica fora do número.
- Ver a seção 8, item 2.

---

## 7. Roteiros (D-019, D-060)

A decisão tem **90 s** no cronômetro (mínimo de 45 s), que é só visual: o apresentador encerra (D-010). A prorrogação é de 20 s. A rodada no roteiro inclui a decisão, o sorteio e o resultado.

### 60min

| # | Passo | Alvo | Acumulado |
|---|---|---|---|
| 1 | lobby | 120 s | 2:00 |
| 2 | enquete entrada (antes) (opcional) | 90 s | 3:30 |
| 3 | bloco: Gancho: o lançamento | 150 s | 6:00 |
| 4 | formarEquipes | 120 s | 8:00 |
| 5 | personas | 180 s | 11:00 |
| 6 | bloco: A conta de cada casa: 12 meses em 6 bimestres | 120 s | 13:00 |
| 7 | **rodada Jan–fev** | 210 s | 16:30 |
| 8 | bloco: Dados: quem trabalha por aplicativo (PNAD 2025) | 120 s | 18:30 |
| 9 | **rodada Mar–abr** | 210 s | 22:00 |
| 10 | bloco: Dados: a lei que saiu de pauta (nem CLT, nem autônomo) | 120 s | 24:00 |
| 11 | **rodada Mai–jun** | 210 s | 27:30 |
| 12 | bloco: Entrevistas (opcional) | 240 s | 31:30 |
| 13 | bloco: Dados: gestão por algoritmo | 120 s | 33:30 |
| 14 | **rodada Jul–ago** | 210 s | 37:00 |
| 15 | bloco: Dados: breque e organização | 120 s | 39:00 |
| 16 | **rodada Set–out** | 210 s | 42:30 |
| 17 | bloco: Dados: ninguém tem 13º | 120 s | 44:30 |
| 18 | **rodada Nov–dez** | 210 s | 48:00 |
| 19 | placarFinal | 240 s | 52:00 |
| 20 | enquete termometro_curto (unico) | 180 s | 55:00 |
| 21 | enquete entrada (depois) | 90 s | 56:30 |
| 22 | comparativo (entrada) | 120 s | 58:30 |
| 23 | bloco: Fim: quem é o patrão? | 90 s | 60:00 |
| 24 | fim | — | 60:00 |

Total: **3600 s**. As 6 rodadas somam 1260 s (21 min, 35% do tempo); com a formação das equipes, as personas e o placar, o jogo ocupa 1800 s (50%). O resto são blocos curtos de dados, as entrevistas e as enquetes.

### 120min

| # | Passo | Alvo | Acumulado |
|---|---|---|---|
| 1 | lobby | 150 s | 2:30 |
| 2 | enquete entrada (antes) (opcional) | 90 s | 4:00 |
| 3 | bloco: Gancho: o lançamento | 240 s | 8:00 |
| 4 | bloco: Mapa do seminário | 150 s | 10:30 |
| 5 | formarEquipes | 120 s | 12:30 |
| 6 | personas | 240 s | 16:30 |
| 7 | bloco: A conta de cada casa: 12 meses em 6 bimestres | 180 s | 19:30 |
| 8 | **rodada Jan–fev** | 270 s | 24:00 |
| 9 | bloco: Dados: quem trabalha por aplicativo (PNAD 2025) | 300 s | 29:00 |
| 10 | **rodada Mar–abr** | 270 s | 33:30 |
| 11 | bloco: Dados: a lei que saiu de pauta (nem CLT, nem autônomo) | 300 s | 38:30 |
| 12 | **rodada Mai–jun** | 270 s | 43:00 |
| 13 | bloco: Entrevistas (opcional) | 1200 s | 63:00 |
| 14 | **rodada Jul–ago** | 270 s | 67:30 |
| 15 | bloco: Dados: gestão por algoritmo e o quiz anúncio ou conteúdo | 360 s | 73:30 |
| 16 | **rodada Set–out** | 270 s | 78:00 |
| 17 | bloco: Contraponto: a Viração e os dados sobre CLT | 300 s | 83:00 |
| 18 | **rodada Nov–dez** | 270 s | 87:30 |
| 19 | placarFinal | 300 s | 92:30 |
| 20 | bloco: Debrief: mapa do patrão em grupos | 510 s | 101:00 |
| 21 | bloco: Caminhos: regulação, proteção, organização e educação | 420 s | 108:00 |
| 22 | enquete termometro (unico) | 360 s | 114:00 |
| 23 | enquete entrada (depois) | 90 s | 115:30 |
| 24 | comparativo (entrada) | 150 s | 118:00 |
| 25 | bloco: Fim: quem é o patrão? | 120 s | 120:00 |
| 26 | fim | — | 120:00 |

Total: **7200 s**. As 6 rodadas somam 1620 s (27 min, 23% do tempo); com a formação das equipes, as personas e o placar, o jogo ocupa 2280 s (32%). O resto são blocos curtos de dados, as entrevistas e as enquetes.

---

## 8. Para validar com o Kleber

Cada item traz a pergunta, por que importa e as opções. A recomendação é minha; a decisão é sua.

1. **Ninguém fecha o básico em 12 meses (D-050, D-058).**
   - *Por que importa:* A D-050 diz que o final não pode estar decidido antes de jogar. Com a renda real, o básico real de Porto Alegre e nenhuma carteira em casa, a falta é estrutural: de −R$ 390 (Marcos) a −R$ 2.146 (Daiane) **por mês** antes de qualquer carta, e, passado o limite de R$ 2.000 do cheque especial, o que falta vira conta atrasada, com multa e mora. O melhor caminho possível do Jonas termina em −R$ 770, e exige a carta de promoção nos 6 bimestres. Nem um bimestre no azul é comum: Jonas 17,86%, Rose 0,00%, Marcos 15,89%, Bruna 0,03%, Kauã 0,04% e Daiane 0,00% das partidas ao acaso têm pelo menos um.
   - *Opções:*
     - (a) **Aceitar e dizer em sala** que, em 12 meses, ninguém fechou, e mostrar o "quase" do Jonas (o melhor caminho a −R$ 770). Muda a D-050 (precisa de decisão nova). **Minha recomendação:** é o que os dados dizem.
     - (b) Medir "fechar" por bimestre no placar (quantos bimestres cada equipe fechou). É mudança de código, não de conteúdo.
     - (c) Pôr uma renda que não depende de escolha (por exemplo, um pico certo maior). Com ela, quem fica só no padrão também passa a chegar perto, o que a D-058 proíbe.
     - (d) Voltar a 3 rodadas mensais, onde o Jonas e o Marcos chegavam a 0,01% e 0,1%. Desfaz a D-060.

2. **A referência "com carteira assinada" ficou abaixo do Jonas de app (D-056, D-062).**
   - *Por que importa:* No placar, a linha da carteira (−R$ 14.750) fica abaixo de 87% das partidas do Jonas de app no padrão. A leitura da sala pode virar "o app paga melhor que a carteira", o contrário do que o seminário discute. A causa está nos dados: a PNAD dá ao motociclista de app mais caixa por mês que o salário médio de motoboy com carteira no CAGED, com mais horas e nenhum direito. Em 01/10, à tarde, refiz a linha com as regras da D-066 (o limite, as contas atrasadas, a multa e a mora): era −R$ 18.846, com os juros sem teto; agora é −R$ 14.750. *Pendência fora destes dois arquivos:* o `docs/roteiro-do-apresentador.md` ainda diz −R$ 18.846.
   - *Opções:*
     - (a) Manter e explicar em sala: o app dá mais caixa com mais horas e sem rede; a carteira dá INSS, FGTS, férias e auxílio-doença, que o placar não mede.
     - (b) Somar à carteira o FGTS (R$ 183 por mês, ~R$ 2.200 no ano) e, se a convenção do Sindimoto-RS previr, o aluguel da moto, que muitas convenções pagam (a pesquisar: não tenho a fonte). A linha sobe, mas não sei se passa o app.
     - (c) Tirar a linha do placar e levar a comparação para um slide, com as horas trabalhadas lado a lado. **Minha recomendação:** (c) ou (a), porque (b) depende de uma fonte que ainda não tenho.

3. **O esgotamento ainda é o melhor plano (D-059).**
   - *Por que importa:* A opção mais cansativa é a de maior saldo esperado para a maioria das personas em jan–fev (3), mar–abr (3), set–out (5) e nov–dez (5). As multiplicações de risco com fonte (doença × 4,24 e × 4,5 com pouco sono, Prather et al., 2015; acidente × 1,3 a × 4,3, AAA Foundation, 2016) não pagam a renda a mais. Testei deixar a energia voltar mais (+1 em todas as opções) para o cansaço não ficar "saturado" em 0: no estimador rápido que usei para calibrar, a mais cansativa continuou a melhor em 24 dos 36 casos (eram 25); com a jornada de sempre em −2, em 22 (teste do rascunho de 30/09, antes das correções de 01/10).
   - *Opções:*
     - (a) **Aceitar** e mostrar o custo onde ele aparece: no pior caso e nas cartas graves (50% a 64% das partidas do Jonas, do Marcos e do Kauã tiram pelo menos uma). **Minha recomendação.**
     - (b) Subir o custo além da fonte (por exemplo, o exausto de −10% para −20%): cumpre a D-059 com número inventado.
     - (c) Deixar a jornada de sempre tirar menos energia (−2 em vez de −3), para o cansaço separar as escolhas no fim do ano. Sozinha, não resolve (o teste acima).

4. **Em set–out, a melhor opção é a mesma para 5 das 6 personas (D-051).** (A da Daiane é B, por R$ 39 no esperado: dentro do ruído da simulação.)
   - *Por que importa:* Furar o breque e rodar a Farroupilha (D) é a única opção de set–out que traz dinheiro; aderir ao breque e recusar o que não paga só custam. É o que aconteceu no dia: o concorrente pagou até R$ 9 a mais por entrega a quem furou (Metrópoles, 01/09/2026).
   - *Opções:*
     - (a) **Aceitar:** o dilema é justamente esse, dinheiro agora contra a pauta coletiva. **Minha recomendação.**
     - (b) Dar ao breque um retorno com fonte: depois de 01/09/2026, ainda não houve reajuste; o de 2025 veio 2 meses depois do breque de 31/03 (R$ 6,50 → R$ 7,50). A carta "Reajuste" já ganha +4 no peso em nov–dez para quem parou.

5. **A ordem das equipes e as obrigatórias (D-061).**
   - *Por que importa:* Com menos de 6 equipes, somem as últimas. A proposta (seção 1) põe Jonas e Rose primeiro e obrigatórios, para qualquer sala ver os dois extremos.
   - *Opções:*
     - (a) Manter a proposta.
     - (b) Pôr a Bruna em 2º (a mais perto da turma).
     - (c) Só o Jonas obrigatório.

6. **A Bruna, influenciadora (personagem nova).**
   - *Por que importa:* A renda de R$ 700 por mês é derivação nossa, de confiança baixa: o IBGE não mede criadores (75,2% ganham até 1 salário mínimo, Censo Squid 2023; 26% sem renda, Censo Wake 2025). Não sei se "criador de conteúdo" cabe no MEI (se não couber, o contribuinte individual custa 11% do mínimo, R$ 178 por mês). A publi de aposta (jul–ago, A) é ilegal desde 17/07/2026, e a opção triplica o risco de bloqueio.
   - *Opções:*
     - (a) Manter os valores e dizer em sala que são estimativa.
     - (b) Trocar a casa para a opção B da pesquisa (ela, a mãe e um irmão de 9 anos: falta R$ 1.959 por mês).
     - (c) Tirar a publi de aposta.

7. **As outras rendas da casa, todas informais (D-062).**
   - *Por que importa:* Em 01/10, a revisão pediu para não repetir três casas de faxina a R$ 1.500 (achado 10, que pedia decisão sua; eu apliquei e deixo aqui para você confirmar). Ficaram cinco ofícios: faxina e revenda (companheira do Jonas, R$ 1.500), bico de obra (filho da Rose, R$ 480), cuidadora (esposa do Marcos, R$ 1.482, DIEESE), faxina pela média do DIEESE (mãe da Bruna, R$ 1.335) e diária de cozinha (mãe do Kauã, 12 × R$ 110 = R$ 1.320; Goomer: B). As diárias têm fonte; a **frequência** não (8 faxinas e R$ 300 de revenda, 12 diárias de cozinha, 4 diárias de obra). A Bruna e o Kauã ficaram com R$ 165 e R$ 180 a menos por mês.
   - *Opções:*
     - (a) Manter a troca de 01/10. **Minha recomendação.**
     - (b) Voltar às faxinas de R$ 1.500 na Bruna e no Kauã (a calibragem anterior).
     - (c) Pôr a frequência como carta (um bimestre sem faxina, a idosa internada). Deixa a casa mais instável, sem fonte para a chance.

8. **A energia chega a 0 em 100% das partidas do padrão.**
   - *Por que importa:* A jornada de sempre tira 3 por bimestre e o descanso devolve 2; quem começa com 6 ou 7 termina o ano exausto de qualquer jeito. É o desgaste da D-063, mas faz o cansaço deixar de separar as escolhas no fim do ano (ver o item 3).
   - *Opções:*
     - (a) Manter (o corpo cansa com os meses).
     - (b) Jornada de sempre −2: a energia só cai com as opções de esforço.

9. **IPVA e gasolina podem estar em parte dentro da renda da PNAD.**
   - *Por que importa:* A retirada da PNAD já desconta o combustível e a manutenção. O jogo cobra só a diferença de preço da gasolina contra a média de 2025 (ANP): Jonas R$ 26 a 63 e Marcos R$ 102 a 247 por bimestre de jan a jun; em jul–ago o preço voltou à média de 2025 (R$ 6,08), e set a dez ainda não têm dado fechado, então não há cobrança. Mas o IPVA (Jonas R$ 340, Marcos R$ 1.500) pode já estar descontado na retirada da PNAD. Desde 01/10 ele é cobrado em mar–abr, no vencimento de 30/04 (Sefaz-RS), à vista e sem desconto: o de até 20% que ainda vale no vencimento (Bom Motorista e Bom Cidadão) exige não ter multa e o cadastro na Nota Fiscal Gaúcha, e eu não tenho fonte de quantos motoboys e motoristas de app cumprem isso.
   - *Opções:*
     - (a) Manter (conservador contra o trabalhador).
     - (b) Tirar o IPVA.
     - (c) Aplicar o desconto de Bom Motorista (até 20%): Jonas R$ 272, Marcos R$ 1.200.

10. **A conta de luz de nov–dez (+24,24%) ainda é proposta.**
   - *Por que importa:* A CEEE Equatorial propôs +24,24% a partir de 22/11/2026, em consulta pública (Sul21, 08/2026). O jogo cobra como certo (R$ 31 a 47).
   - *Opções:*
     - (a) Manter e dizer "proposta" em sala.
     - (b) Tirar até a decisão da ANEEL.

11. **Janeiro: a corrida do Marcos fica mais barata (−R$ 230).**
   - *Por que importa:* O IPCA mede o preço do passageiro (jan/2026 −22,22% em Porto Alegre); quanto chega ao motorista, ninguém mede. Usei metade, hipótese de confiança baixa.
   - *Opções:*
     - (a) Manter.
     - (b) Tirar.

12. **Roteiros e tempo de decisão.**
   - *Por que importa:* No de 60 min, cada rodada tem 210 s (decisão de 90 s, sorteio e resultado), os blocos de dados têm 2 min e as entrevistas, 4 min. No de 120 min, 270 s por rodada e 20 min de entrevistas.
   - *Opções:*
     - (a) Manter 90 s.
     - (b) Subir para 120 s (a D-043 falava em 120): no de 60 min, custa 3 min, que sairiam dos blocos de dados.

13. **O "entrou" negativo da Daiane.**
   - *Por que importa:* Com a fratura, o trabalho quase zera e a parcela do curso e o DAS continuam saindo: pior "entrou −R$ 456" em jul–ago (opção D); ao acaso, em r1 0,88% · r2 0% · r3 0,72% · r4 2,4% · r5 2,6% · r6 0,31% dos casos. Já acontecia no v2.2 e ficou mais comum em 01/10, porque a renda dela passou a ser líquida (metade) e os custos fixos não mudaram.
   - *Opções:*
     - (a) Manter (é o custo fixo que não para).
     - (b) Suspender a parcela do curso no bimestre parado (sem fonte).

14. **As cartas graves continuam "dramatizadas"?**
   - *Por que importa:* Em 3 meses, a D-030 avisava que as cartas graves eram exageradas para caber no jogo. Em 12 meses, a fratura (~2% por bimestre na rua, UFBA 2025) e o bloqueio (de 11% a 15% de chance no ano, no padrão) estão perto da frequência real, e 50% a 64% das partidas de quem está na rua tiram pelo menos uma carta grave.
   - *Opções:*
     - (a) Tirar o aviso de exagero da fala do apresentador.
     - (b) Manter o aviso.

15. **O limite do cheque especial, a multa e a ordem do corte (D-066; apliquei, a confirmar).**
   - *Por que importa:* Usei R$ 2.000, o teto da faixa da D-066. O único dado oficial que achei é o do Banco Central: limite médio de R$ 1.693 na faixa de renda abaixo de R$ 1,5 mil em dez/2019 (Estudo Especial 84/2020), R$ 2.429 corrigido pelo IPCA; o próprio estudo diz que o método superestima o limite e só olha quem tem carteira. A multa (7%) e a mora (0,8% ao mês) são a média das contas da casa, pesada pelo valor de cada uma (aluguel 10% + 1%; luz, água e celular 2% + 1%; gás, ônibus e remédio sem multa). A ordem do corte ficou "as contas primeiro": as contas do bimestre atrasam e a comida só é cortada no que passar delas (22% trocaram a conta de luz por comida, Ipec/iCS 2021; 30% dos que ganham até 1 salário mínimo deixam de comprar comida para pagar a luz, Pólis/Ipec 2024). No fim, no padrão, as contas atrasadas vão de R$ 10.376 a R$ 24.040, e o banco nunca passa do limite.
   - *Opções:*
     - (a) **Manter R$ 2.000, 7% + 0,8% e "as contas primeiro".** **Minha recomendação:** é o que as fontes sustentam, e o limite mexe pouco no fim (só a parte que fica no banco, a 7,43%).
     - (b) Usar R$ 1.693, o valor de 2019 sem correção (as personas, sem carteira, devem ter limite menor que a média), ou R$ 1.000, o piso da D-066.
     - (c) Usar a multa do aluguel (10% + 1%) para tudo: mais simples de explicar em sala, e mais caro que a média das contas.
     - (d) "A comida primeiro" (`cortarPrimeiro: "comida"`): a casa corta a comida antes de atrasar conta. A Daiane e a Rose deixariam de comprar quase toda a comida em todo bimestre.

16. **A frase do auxílio acima do trabalho (D-067; pronta e na tela, o texto a confirmar).**
   - *Por que importa:* O auxílio do INSS pelo MEI é de 1 salário mínimo por mês (R$ 1.621, Decreto 12.797/2025), R$ 2.431 pelos 45 dias da fratura, e passa do que a Bruna e a Daiane ganhavam trabalhando num bimestre comum (seção 5.2). O rótulo do efeito agora diz "1 salário mínimo", e o motor já monta a frase: "Auxílio do INSS pelo MEI (45 dias de 1 salário mínimo): R$ 2.431, mais do que Bruna ganhava trabalhando num bimestre comum (R$ 1.400)." Desde a revisão da F6c, o telão (embaixo da faixa da equipe), o celular (logo abaixo do saldo) e a história mostram a frase.
   - *Opções:*
     - (a) **Mostrar a frase no telão e no celular no bimestre em que o auxílio chega, como está.** **Minha recomendação:** é a lei, e o contraste com a renda de app é o assunto do seminário. É o que está no ar na branch.
     - (b) Encurtar para "mais do que ela ganhava trabalhando", como na D-067 (texto do núcleo).
     - (c) Deixar só para a fala do apresentador.

17. **A renda da Daiane passou a ser líquida dos ingredientes (achado 7 da revisão de 01/10; apliquei, a confirmar).**
   - *Por que importa:* A renda era o faturamento do GEM (R$ 1.500) com o rótulo "já sem os ingredientes". Agora é R$ 750 (margem de 50%, a ponta de baixo das fontes da pesquisa: doce de festa de 50% a 60%, ovo de Páscoa 55%). A falta do mês comum dela passou de −R$ 1.396 para −R$ 2.146, a maior do jogo, e o esperado no fim, ao acaso, para −R$ 21.460. Com o limite do cheque especial, o MEI deixa de melhorar o pior caso dela (−R$ 423 no plano padrão; item 18), e com ele a fratura passa a render mais que um bimestre normal (item 16): a perda caiu à metade e o auxílio não.
   - *Opções:*
     - (a) Manter a renda líquida. **Minha recomendação:** a tela mostra o que ela leva para casa, que é o que o rótulo dizia.
     - (b) Voltar aos R$ 1.500 com o rótulo "faturamento do mês" e declarar a simplificação (a calibragem anterior).
     - (c) Usar a margem de 55% do ovo (R$ 825): a fonte é de um produto de Páscoa, mais caro que doce do dia a dia e que marmita.

18. **Com o limite, o placar da Daiane e o da Rose quase não separam as escolhas (efeito da D-066; precisa de decisão).**
   - *Por que importa:* Passado o limite, o que falta além das contas do bimestre vira comida não comprada, e a D-066 deixa o "faltou na mesa" fora do placar (não é dívida). Para quem vive passando do limite, o dinheiro a mais ou a menos de uma opção vira mais ou menos comida, e não mais ou menos patrimônio: na Daiane, em 4 dos 6 bimestres, as 4 opções terminam a menos de R$ 40 umas das outras no placar, enquanto ela deixa de comprar, em média, R$ 8.953 de comida no ano. Com diferenças desse tamanho, o validador acusa o padrão como a opção de maior saldo (Rose em mai–jun; Daiane de mar–abr a jul–ago) e opção que domina ou vence em renda em mais de 70% das partidas (Rose em jan–fev ("A" termina com mais saldo que cada uma das outras em 72% a 88% das partidas) e Daiane em jan–fev ("A" termina com mais saldo que cada uma das outras em 75% a 82% das partidas)). Refiz a conta (c) com o patrimônio menos o que faltou na mesa (3 mil partidas por opção, mesma regra: a opção naquele bimestre, as outras ao acaso): com essa medida, o padrão não é a melhor opção em nenhum bimestre da Rose, da Bruna e da Daiane, e a opção A da Rose em jan–fev (12 horas) deixa de ser a melhor (a da Daiane continua a melhor, por menos de R$ 100). A causa é do modelo, e não de um número: mexer no conteúdo para calar o aviso seria calibrar ruído. Também por isso, no pior caso, o MEI quase não melhora a Rose e a Daiane (a perda da fratura vira comida cortada).
   - *Opções:*
     - (a) **Mostrar o "faltou na mesa" ao lado do patrimônio no placar e contar, no validador, o patrimônio menos o que faltou na mesa** (a comida não comprada é dinheiro que faltou, mesmo não sendo dívida). **Minha recomendação:** mantém a D-066 ("não é dívida") e devolve ao placar a diferença entre as escolhas. É código (validador e placar), fora destes dois arquivos.
     - (b) Pôr o "faltou na mesa" dentro do patrimônio do placar: o mais simples, e muda a D-066.
     - (c) Aceitar: a sala vê que, para a Daiane, escolher quase não muda nada no saldo, e muda o que tem no prato. É um ponto de debate, mas o placar perde o sentido para essa equipe.

19. **Os pesos de desgaste agora sobem por persona e bimestre (D-063; apliquei, a confirmar).**
   - *Por que importa:* Para a chance crescer no plano padrão, o peso de cada carta de desgaste tem de subir mais que o resto do baralho, e o resto sobe muito: a doença com a energia baixa (× 4,24, Prather et al., 2015) e o remédio adiado (× 2), o temporal de mai–out e as cartas de atraso. Por isso os aumentos são por persona e por bimestre (o menor que faz a chance não cair, em passos de 0,25 no peso) e chegam a +12,75 no peso do "Quebrou" da Bruna e a +13 no "Alcance" da Daiane em nov–dez. A chance resultante continua modesta: o bloqueio em algum bimestre do ano fica de 11% a 15% (a GigU mede 15,5% de quem já foi bloqueado alguma vez), e o "Quebrou" do celular e da autoclave, de ~7% a ~9% por bimestre.
   - *Opções:*
     - (a) **Manter.** **Minha recomendação:** cumpre a D-063 na chance, que é o que a sala vê no sorteio, e os tamanhos estão escritos.
     - (b) Crescer só no peso, como antes (+2, +4…), e aceitar que a chance caia onde a doença dispara: mais simples, e contradiz a D-063 no que a sala vê.
     - (c) Diminuir a explosão da doença (o × 2 do remédio adiado, que é estimativa) para o baralho não inchar.

20. **As duas cartas de atraso: "Cortaram a luz" e "O dono entrou com o despejo" (D-066; a chance é estimativa).**
   - *Por que importa:* As regras têm fonte: a luz pode ser cortada com aviso de 15 dias, até 90 dias depois do vencimento, e a religação custa R$ 11,36 (ANEEL, REN 1.000/2021; CEEE, REH 3.547/2025); o despejo por falta de pagamento é uma ação na Justiça, e o inquilino evita a saída pagando tudo em 15 dias depois da citação, com multa, juros, custas e 10% de honorários (Lei 8.245/1991, arts. 9º e 62). A chance não tem fonte (não achei quantos inadimplentes têm a luz cortada, nem com quantos meses de atraso o dono entra na Justiça). No padrão, com a carta "Normal", a Rose tira o corte de luz com ~8% de chance por bimestre no fim do ano e o despejo com ~4%. O despejo só custa energia (−2): o dinheiro do processo e da mudança não entrou.
   - *Opções:*
     - (a) **Manter.** **Minha recomendação**, dizendo em sala que a chance é estimativa.
     - (b) Subir a chance do corte de luz para quem atrasa muito (com R$ 10 mil atrasados, na vida real o corte é quase certo).
     - (c) Dar ao despejo um custo (frete da mudança, caução do novo aluguel), sem fonte de valor.

