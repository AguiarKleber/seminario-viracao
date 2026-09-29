# Rascunho do conteúdo do jogo (esquema v2)

> **RASCUNHO v2 — a validar.** Nada daqui entra no seminário sem a validação do
> Kleberson (D-005). Cada número tem a fonte ao lado. Onde não há dado, está
> escrito **"estimativa sem fonte"**, e a confiança é baixa (como na D-034).

- **Data:** 29/09/2026.
- **Arquivo do conteúdo:** [`config.json`](../config.json), `versao`
  `2026-09-29-v2-rascunho`, hash `45f91525`. Os textos de `fonte` do config
  resumem as tabelas da seção 2 e nunca aparecem no telão.
- **Esquema:** v2, das decisões D-041 a D-048 (contratos, seção 1). O motor cobra
  o básico da casa no fim do mês, depois de tudo, e os juros sobre a dívida que
  vinha do mês anterior.
- **Como conferir:** `npm run validar`. Todas as contas da seção 5 são de
  enumeração exata (todas as cartas, com as chances de cada estado), feita com o
  mesmo motor do telão.
- **O que substitui:** o rascunho de 28/09.
  - Continuam valendo: D-024 (horas extras do mês 1), D-026 e D-027 (Jonas em
    duas equipes e a ordem das equipes), D-028 (as rendas de menor confiança),
    D-029 (a associação perde em saldo no mês 3), D-030 (o corte de 15% e o nome
    "Saldo acumulado"), D-031 e D-032 (as afirmações e o termômetro curto), D-033
    e D-040 (os rótulos curtos).
  - A D-025 foi substituída pela D-044.

---

## 1. Resumo

1. **Cada persona responde pelo básico da casa inteira** (D-044). Todo mês,
   entra o que o trabalho rendeu mais a outra renda da casa, e sai o básico:
   comida (cesta básica do DIEESE de Porto Alegre para o tamanho da família),
   aluguel, luz, água, gás, ônibus, celular e remédios.
2. **As famílias:**
   - **Rose e Daiane sustentam a casa sozinhas.** A Rose tem a filha de 15 e o
     filho de 23, que está sem emprego. A Daiane tem o filho de 4, e o pai não
     paga pensão.
   - **Jonas, Kauã e Marcos têm uma segunda renda na casa, de um salário
     mínimo:** a companheira, a mãe e a esposa, respectivamente.
3. **Ninguém fecha as contas.** Em todos os caminhos possíveis, nas 5 personas,
   o saldo termina negativo depois de 3 meses. No piloto automático, o valor
   esperado vai de −R$ 3.850 (Kauã) a −R$ 8.446 (Rose).
   - Só o Marcos fecha algum mês com alguma frequência: 6,3% das partidas, com
     as decisões ao acaso. O Kauã fecha em 0,1%.
   - Cada mês comum já começa com o básico descoberto, de −R$ 773 (Marcos) a
     −R$ 2.412 (Rose).
4. **A dívida cobra juros de 7,43% ao mês**, a taxa do cheque especial em
   agosto de 2026 (Banco Central). É a modalidade que rola a dívida de um mês
   para o outro sem pedir nada ao banco (seção 2.5).
5. **Três meses com 4 dilemas cada**, sem resposta certa (D-043). O campo
   `tendencia` saiu de todas as opções.
   - **Mês 1: quanto trabalhar?** 12 horas; MEI; o de sempre (padrão); ou
     trabalhar menos para estudar ou cuidar da família.
   - **Mês 2: o app muda a regra.** Aceitar tudo (padrão); recusar o que não
     paga; dois apps; ou parar um dia no breque.
   - **Mês 3: e agora?** Empréstimo e madrugada; apertar o cinto (padrão);
     entrar na associação; ou não parar nem machucado.
6. **14 cartas**, com o dinheiro e os dias parados de verdade: queda leve,
   fratura de 45 dias, bloqueio, assalto, doença, conserto, calote, taxa, temporal
   e reajuste. Há também boas semanas, e duas cartas que só existem depois de uma
   fratura: "INSS negou" e "recaída".
7. **Consequências que atravessam os meses** (com `decidiu` e `sorteou`):
   - **MEI:** quem abre no mês 1 paga o DAS nos três meses. Se tirar a fratura no
     mês 2, recebe o INSS no mês 3, e metade das vezes a perícia nega.
   - **Fratura no mês 2:** continua no mês 3, com mais 25 dias parado. Quem
     "volta antes da alta" recupera 15 desses dias, e a chance de recaída
     triplica.
   - **Bloqueio no mês 2:** dura o mês 3 inteiro. Encurta com a associação
     (liminar no 36º dia) e cai pela metade para quem rodava em dois apps.
   - **Breque no mês 2:** aumenta a chance do reajuste no mês 3, que só vale para
     entregador.
8. **Calibragem** (`npm run validar`): 0 erros; nenhuma opção dominante; nenhum
   padrão é a opção de maior saldo esperado.
   - Os 5 avisos são todos de variância: as decisões explicam de 5,6% a 17% do
     saldo final.
   - Esses avisos estavam aceitos pela D-024. Aqui eles pesam ainda mais, porque
     o básico descoberto é igual em todas as decisões e as cartas graves
     atravessam o mês.

### Correções ao rascunho de 28/09 que a pesquisa trouxe

1. **Estufa da Rose:** no RS, a estufa é **proibida** para manicure, inclusive a
   domicílio. A Portaria SES-RS 500/2010 exige autoclave. A carta "Quebrou" passou
   a ser a autoclave.
2. **INSS do acidente:** o valor diário (R$ 54,03) estava certo, mas o momento
   em que o dinheiro chega, não. A decisão leva 34 dias em média, então o
   dinheiro cai no mês seguinte. E ele só existe acima de 15 dias parado.
3. **Contribuição ao INSS:** entre os plataformizados, é 34,0% (não 35,9%). Entre
   motociclistas, 19,4%; entre motoristas, 25,5%.
4. **"Vaquinha +400" da associação:** não achei fonte. Saiu. A mensalidade
   (R$ 30) continua como estimativa sem fonte.
5. **DPVAT:** não existe mais. A LC 211/2024 barrou o SPVAT, e um acidente de
   2024 a 2026 não tem indenização obrigatória.
6. **Gás:** o valor de Porto Alegre é R$ 119,00 (a média do RS era R$ 117,89).
7. **Água:** passou a ter a tarifa do DMAE.

---

## 2. Cada número, com fonte

**Confiança:**
- **alta:** dado oficial, usado como está;
- **média:** dado oficial com uma conta, ou imprensa séria;
- **baixa:** estimativa, dado antigo ou de outra cidade, ou fonte com conflito de
  interesse (marcado).

### 2.1 Referências gerais

| # | Valor | Fonte | Derivação | Confiança |
|---|---|---|---|---|
| 1 | Salário mínimo 2026: **R$ 1.621**; líquido de INSS (7,5%) **R$ 1.499,43** | Presidência, Decreto 12.797/2025. https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm | 1.621 × 0,925. No config: R$ 1.499 | Alta |
| 2 | DAS-MEI 2026: **R$ 86,05** (serviços) e **R$ 82,05** (comércio e indústria) | Receita Federal, Simples Nacional. https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3 ; https://blog.nubank.com.br/valor-das-mei/ | 5% de 1.621 = 81,05; + R$ 5 de ISS ou + R$ 1 de ICMS. No config: 86 e 82 | Alta |
| 3 | INSS por incapacidade: **só acima de 15 dias** (art. 59); o autônomo recebe **desde o 1º dia** se pedir em 30 dias (art. 60); acidente dispensa carência (art. 26 II); só vale o DAS pago em dia antes (art. 27 II); doença comum exige 12 contribuições (art. 25 I) | Lei 8.213/1991. https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm | 1 salário mínimo ÷ 30 = **R$ 54,03 por dia** | Alta |
| 4 | Decisão do INSS: **34 dias** em média (ago/2026; eram 59 em fev/2026) | Agência Brasil, 03/09/2026. https://agenciabrasil.ebc.com.br/geral/noticia/2026-09/fila-de-espera-por-atendimento-do-INSS-e-zerada-em-agosto | O dinheiro de um acidente chega no mês seguinte. O RS não tem número divulgado | Alta |
| 5 | **53%** das decisões de benefício por incapacidade foram negativas no 1º semestre de 2026 | Previdenciarista, 09/09/2026, leitura do BEPS de jul/2026. https://previdenciarista.com/blog/inss-nega-51-dos-pedidos-no-1o-semestre-de-2026/ | No jogo: ~50% (carta "INSS negou") | Média |
| 6 | Cesta básica de Porto Alegre, ago/2026: **R$ 839,34** por adulto | DIEESE/Conab, 10/09/2026. https://www.dieese.org.br/analisecestabasica/2026/202608cestabasica.pdf | É o último mês publicado; a de setembro sai perto de 08/10 | Alta |
| 7 | Criança conta **meia cesta**; a regra do DIEESE é 2 adultos e 2 crianças = 3 cestas | DIEESE, metodologia. https://www.dieese.org.br/metodologia/metodologiaCestaBasica/12.html | Para 2, 3 e 5 pessoas, extrapolei. **Quem tem 12 anos ou mais conta inteira** (escolha nossa: a filha de 15 da Rose) | Alta (a regra); média (a extrapolação) |
| 8 | IPCA, número-índice: jun/2019 = 5.214,27; dez/2018 = 5.100,61; ago/2026 = 7.633,23 | IBGE, SIDRA, tabela 1737. https://sidra.ibge.gov.br/tabela/1737 | Fatores de correção de 1,4639 e de 1,4965 | Alta |

### 2.2 Básico da casa, item por item (Porto Alegre)

| # | Item | Valor usado | Fonte | Derivação | Confiança |
|---|---|---|---|---|---|
| 9 | Comida | cesta × adultos-equivalentes: 1,5 = **R$ 1.259**; 2,5 = **R$ 2.098**; 3 = **R$ 2.518** | itens 6 e 7 | 839,34 × fator, arredondado | Alta |
| 10 | Aluguel de 2 quartos | **R$ 1.300** (Jonas, Marcos, Rose) | QuintoAndar, lido em 29/09/2026: 2 dormitórios com condomínio e taxas, Rubem Berta R$ 1.123–1.411, Sarandi R$ 1.192–1.525. https://www.quintoandar.com.br/alugar/imovel/rubem-berta-porto-alegre-rs-brasil | Meio da faixa. É mercado formal (exige fiador ou análise de crédito). FipeZAP ago/2026: Porto Alegre +11,04% em 12 meses. https://downloads.fipe.org.br/indices/fipezap/fipezap-202608-residencial-locacao.pdf | Média-baixa |
| 11 | Aluguel de casa pequena | **R$ 1.020** (Kauã) | QuintoAndar, 29/09/2026: média do Chapéu do Sol/Restinga, todos os tipos de imóvel | Direto | Média-baixa |
| 12 | Aluguel de 1 quarto | **R$ 1.000** (Daiane) | QuintoAndar, 29/09/2026: 1 dormitório com taxas, R$ 1.012–1.194 (Rubem Berta, Sarandi) | Abaixo da faixa (periferia) | Média-baixa |
| 13 | Luz | 120 kWh = **R$ 130**; 150 = **R$ 162**; 180 = **R$ 194** | CEEE Equatorial, tarifa B1: R$ 0,822/kWh sem tributos (ANEEL 3.547/2025). https://ceee.equatorialenergia.com.br/valor-de-tarifas-e-servicos/ ; com ICMS e PIS/Cofins ≈ R$ 1,08/kWh (https://calculadoraenergia.com.br/tarifa/ceee-equatorial) | kWh × 1,08. O consumo é estimativa (a média do Sul é 208 kWh, EPE 2025) | Média-baixa |
| 14 | Água e esgoto | 8 m³ = **R$ 79**; 12 = **R$ 119**; 16 = **R$ 158** | DMAE: R$ 5,50/m³ (Decreto 23.639/2026). https://prefeitura.poa.br/dmae/entenda-conta | 5,50 × m³ × 1,8 (esgoto ≈ 80% da água, deduzido da tarifa social). 4 m³ por pessoa: estimativa | Média-baixa |
| 15 | Gás de cozinha | 0,6 botijão = **R$ 71**; 0,75 = **R$ 89**; 1 = **R$ 119** | ANP, levantamento de 20 a 26/09/2026, botijão de 13 kg em Porto Alegre, R$ 119,00 (15 revendas). https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas | Botijões por mês: estimativa | Alta (o preço) |
| 16 | Ônibus | 20 passagens = **R$ 106**; 30 = **R$ 159**; 44 (quem vai trabalhar de ônibus) = **R$ 233** | Prefeitura de Porto Alegre: R$ 5,30 desde 19/02/2026. https://prefeitura.poa.br/smmu/noticias/onibus-e-taxi-passam-operar-com-novas-tarifas-partir-desta-quinta | Passagens por mês: estimativa. A Rose atende de ônibus, mas esse ônibus já sai da renda dela | Alta (a tarifa) |
| 17 | Celular e internet | **R$ 50** (2 pessoas), **R$ 75** (3), **R$ 100** (4) | Pré-pago R$ 20–30 por 30 dias (https://www.minhaconexao.com.br/planos/planos-de-celular/plano-pre-pago); internet fixa ≈ R$ 92 (Anatel, via Telesíntese, 03/07/2026) | Estimativa | Baixa |
| 18 | Remédios | **R$ 60 / 90 / 120** | IBGE, POF 2017-2018: famílias com até 2 salários mínimos gastam 4,2% com remédio. Farmácia Popular: 41 itens grátis desde 14/02/2025, **sem** analgésico, anti-inflamatório e antibiótico. https://agenciagov.ebc.com.br/noticias/202502/ministerio-da-saude-anuncia-100-de-gratuidade-no-farmacia-popular-e-abre-credenciamento-a-todos-os-municipios-do-pais | Estimativa | Baixa-média |

**Ficaram de fora:** higiene e limpeza (não achei fonte), roupa, escola, lazer
e previdência. O básico é o mínimo, não o necessário.

A régua do DIEESE com a cesta de Porto Alegre, o "salário mínimo necessário",
daria **R$ 7.051,30** para a família de 4 (3 × 839,34 ÷ 0,3571). O básico do
Marcos é R$ 4.742. Esse número vai para um slide.

### 2.3 Renda e custos do trabalho (o `todoMes`)

| # | Persona | Valor | Fonte | Derivação | Confiança |
|---|---|---|---|---|---|
| 19 | Jonas, entregas | **+R$ 2.200** | IBGE, PNAD Contínua, *Trabalho por meio de plataformas digitais 2025* (publ. set/2026), p. 10: motociclistas de app, R$ 2.221/mês, 44,9 h/semana. https://biblioteca.ibge.gov.br/visualizacao/livros/liv102309_informativo.pdf | Arredondado; é o valor "retirado", já sem a gasolina | Alta (média nacional) |
| 20 | Jonas, parcela da moto | **−R$ 480** | Tabela Fipe set/2026, CG 160 Start 2026, R$ 18.598 (https://www.tabelafipebrasil.com/motos/HONDA/CG-160-START/2026); BCB, SGS 25471, 1,97% a.m. (jun/2026) | 80% financiado em 48x = R$ 482 | Média |
| 21 | Jonas, manutenção da moto | **−R$ 261** | Cebrap/Amobitec (2025), p. 75. https://cebrap.org.br/wp-content/uploads/2025/10/Amobitec_CEBRAP_2025.pdf | Direto. **Pesquisa financiada pelas plataformas** | Média |
| 22 | Kauã, entregas | **+R$ 1.370** | Aliança Bike (2019, São Paulo): R$ 936/mês. https://aliancabike.org.br/pesquisa-de-perfil-dos-entregadores-ciclistas-de-aplicativo/ | 936 × 1,4639 (D-028) | Média-baixa |
| 23 | Daiane, vendas | **+R$ 1.500** | GEM Brasil 2018, em Carmo et al., Cad. EBAPE.BR, 2021, p. 19. https://doi.org/10.1590/1679-395120200043 | R$ 1.000 × 1,4965. É faturamento tratado como renda (D-028) | Baixa |
| 24 | Daiane, curso de marketing | **−R$ 141** | CartaCapital, 07/11/2024, sobre a pesquisa de Pinheiro-Machado: cursos de R$ 1.697 a R$ 6.997 | O mais barato em 12x sem juros. O parcelamento é hipótese | Baixa |
| 25 | Marcos, corridas | **+R$ 2.870** | PNAD 2025, p. 9: motoristas de app, R$ 2.873/mês, 45,9 h/semana | Arredondado; já sem o combustível | Alta (média nacional) |
| 26 | Marcos, manutenção do carro | **−R$ 400** | Cebrap/Amobitec (2025), p. 47: R$ 615/mês entre os 65% que declararam | 0,65 × 615. **Financiada pelas plataformas** | Média-baixa |
| 27 | Rose, atendimentos | **+R$ 2.100** | CAGED ago/2025–jul/2026, via salario.com.br: manicure com carteira, R$ 1.802 (https://www.salario.com.br/profissao/manicure-cbo-516120/); Abílio (2021), p. 951–952 | 1.802 × 1,15, já sem comissão, material e ônibus. Não há dado de manicure por app (D-028) | Baixa |

### 2.4 Outra renda da casa e benefícios

| # | Valor | Fonte | Onde entra | Confiança |
|---|---|---|---|---|
| 28 | Salário mínimo líquido: **R$ 1.499** | item 1 | A companheira do Jonas (caixa de supermercado), a mãe do Kauã (auxiliar de limpeza) e a esposa do Marcos (auxiliar de cozinha) | Alta (o valor); a ocupação é escolha nossa |
| 29 | Bolsa Família: entra quem tem até **R$ 218 por pessoa** | MDS, set/2026. https://www.gov.br/mds/pt-br/noticias/bolsa-familia-tera-valor-minimo-de-r-691-a-partir-de-outubro | **Nenhuma família entra.** A renda por pessoa vai de R$ 680 (Daiane) a R$ 992 (Marcos). Os valores mudam em 19/10/2026 (o mínimo vai de R$ 600 para R$ 691) | Alta |
| 30 | Tarifa Social de luz (80 kWh grátis) e Gás do Povo (4 botijões por ano para 2 ou 3 pessoas): até **meio salário mínimo por pessoa** (R$ 810,50), com CadÚnico | Senado, 09/10/2025 (https://www12.senado.leg.br/noticias/materias/2025/10/09/sancionada-conta-de-luz-gratuita-para-familias-de-baixa-renda); Câmara, 02/02/2026 (https://www.camara.leg.br/noticias/1241845-camara-aprova-mp-que-cria-o-programa-gas-do-povo-com-botijao-gratuito-para-familias-de-baixa-renda/) | **Daiane (R$ 750 por pessoa) e Rose (R$ 700) teriam direito.** No config, **não entram** (pergunta 3) | Alta-média |

### 2.5 Juros da dívida (`regras.jurosDividaMes`)

| Modalidade (Banco Central, SGS, ago/2026) | Ao mês | Série | Por que sim ou não |
|---|---|---|---|
| **Cheque especial (escolhida)** | **7,43%** | 25463 | É a que rola sozinha de um mês para o outro, sem pedir nada ao banco, e é o que o motor faz: cobra juros sobre o saldo negativo que vinha de antes. Tem teto legal de 8% ao mês (Resolução CMN 4.765/2019) |
| Cartão, rotativo | 15,18% | 25477 | Mais usada por quem tem pouca renda, mas só pode ficar um mês no rotativo; depois vira parcelamento (a regra de 2017 não foi reconferida). Aparece no contexto do Marcos no mês 3 |
| Crédito pessoal não consignado | 6,39% | 25464 | É o empréstimo da opção a do mês 3: 6,39% de R$ 1.500 = **R$ 96** |
| Agiota | ~30% | Terra, 06/05/2025 (Porto Alegre): "podem ultrapassar os 30% ao mês" | Reportagem; não entra no motor (pergunta 4) |

As séries saem de `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{série}/dados/ultimos/3?formato=json`.

### 2.6 Decisões

| # | Valor | Onde | Fonte | Confiança |
|---|---|---|---|---|
| 31 | 12 horas, 7 dias: Jonas **+520**, Kauã **+105**, Daiane **+350**, Marcos **+650**, Rose **+490**; energia −3 | Mês 1, a | D-024 (pacote B): +20 h/semana a ~53% do ganho-hora da PNAD. UFBA (563 entregadores, Salvador): o acidente em 1 ano sobe de 44,1% para 49,1% com mais de 10 h/dia e para 50% com 7 dias por semana (Correio, 12/05/2025) | Baixa (o fator); média (o risco) |
| 32 | MEI: **−86** (−82 Daiane) nos 3 meses; proteção +3 | Mês 1, b; meses 2 e 3 | itens 2 e 3 | Alta |
| 33 | Trabalhar menos: **−5 dias** (1/6 do mês: Jonas −367, Kauã −228, Daiane −250, Marcos −478, Rose −350); energia +1; queda ×0,6 | Mês 1, d | Abílio (2021), p. 950: Carlos, 12 h por dia, sem tempo para a faculdade | Estimativa |
| 34 | Corte do mês 2: **−15% da renda-base** (Jonas −330, Kauã −206, Daiane −225, Marcos −431, Rose −315) | Mês 2, efeito geral | D-030. Casos reais: iFood paga **R$ 3,00** pela 2ª entrega agrupada, e não R$ 7,50 (jun/2025, https://institucional.ifood.com.br/entregadores/ifood-amplia-ganhos-dos-entregadores-com-reajuste-da-tarifa-minima-e-km-rodado/); "Mais Entregas": "R$ 3,50 por cada uma, que antes você faturava R$ 7,50" (55content, 28/08/2026); Meta +12,15% no anúncio (jan/2026); PNAD 2022–2025: plataformizados +1,0% contra +10,6% dos demais | Baixa (ilustrativo) |
| 35 | Aceitar tudo: **+10%**, energia −2, bloqueio ×0,4. Dois apps: **+20%**, energia −3 | Mês 2, a e c | iFood (31/08/2026): o "Mais Entregas" exige 90% do tempo disponível e no máximo 2 recusas. PNAD 2025: 37,5% usam 2 ou mais apps; Fairwork 2025: 62 de 88 dependem de mais de um app | Baixa (os percentuais) |
| 36 | Recusar: renda 0, energia +1, bloqueio +10 | Mês 2, b | 99 (página oficial): finalizar menos de 70% das corridas = 5, 10 e 15 dias fora. https://motoristas.99app.com/tr-restricoes-70/ ; Metrópoles (01/08/2025): 7 recusas = 15 min fora. https://www.metropoles.com/materias-especiais/entregador-gamificacao-ifood | Alta (as regras) |
| 37 | Breque: **−1 dia** (Jonas −73, Kauã −46, Daiane −50, Marcos −96, Rose −70); energia +1, proteção +1; reajuste do mês 3 mais provável | Mês 2, d | Breque de 31/03/2025, em mais de 100 cidades; o iFood subiu o mínimo de R$ 6,50 para **R$ 7,50** em 01/06/2025, dois meses depois. Em set/2026, o iFood não puniu o score de quem desligou (TechTudo) | Média |
| 38 | Empréstimo e madrugada: **+20%**, **−R$ 96** de juros, energia −3, assalto +3 | Mês 3, a | item 2.5 | Média (os juros); baixa (o +20%) |
| 39 | Apertar o cinto: **~4% da comida da casa** (Jonas e Kauã +84, Daiane +50, Marcos e Rose +101); energia −1; doença +4 | Mês 3, b | Ação da Cidadania/UFRJ (2024): 32% dos entregadores em insegurança alimentar. https://agenciabrasil.ebc.com.br/direitos-humanos/noticia/2025-04/tres-em-dez-entregadores-de-comida-enfrentam-inseguranca-alimentar | Estimativa |
| 40 | Associação: **−1 dia** e **−R$ 30** de mensalidade; energia +1, proteção +2. Com bloqueio no mês 2, liminar no 36º dia: **+9 dias** | Mês 3, c | CUT, 23/07/2026: Simtrapli-RS e advogado conseguiram liminar em ~36 dias (bloqueio em 11/06, liminar em 17/07/2026). https://www.cut.org.br/noticias/motoristas-por-aplicativo-obtem-vitorias-contra-uber-na-justica-do-rs-9943 . Mensalidade: estimativa sem fonte (D-034) | Média (o prazo); baixa (a mensalidade) |
| 41 | Não parar nem machucado: **+2 folgas**; energia −3; queda e fratura +2; doença com só 3 dias parado; com fratura no mês 2, **+15 dias** e recaída +20 | Mês 3, d | Cebrap/Amobitec (2025), p. 71: parte dos acidentados voltou a trabalhar antes de se recuperar | Estimativa |

### 2.7 Cartas

Os dias parados são a fração do mês (5/30, 7/30, 15/30…), como no config de
28/09. Um dia vale: Jonas R$ 73, Kauã R$ 46, Daiane R$ 50, Marcos R$ 96 e Rose
R$ 70.

| # | Carta | Valores | Fonte | Confiança |
|---|---|---|---|---|
| 42 | Uma semana boa | +10% da renda-base; energia −1 | Abílio (2021), p. 941 e 944: bonificações que "nunca estão realmente garantidas" | Ilustrativo |
| 43 | Temporal | Jonas +150 e Kauã +110 (promoção de chuva); Marcos +150 (dinâmica); Daiane −100 (2 dias sem vender); Rose −161 (2 dias sem atender, mais ônibus) | INMET, via O Tempo (27/09/2026): alerta laranja, vento de 100 km/h e granizo. Metrópoles (01/08/2025): promoção de R$ 3 a R$ 12 por entrega | Média (o fato); estimativa (os valores: 2 dias × ~11 entregas × ~R$ 7) |
| 44 | Quebrou | Jonas −669 (2 meses de manutenção + 2 dias); Kauã −246; Daiane −550 (tela + 3 dias); Marcos −1.517 (2 × R$ 615 + 3 dias); Rose −560 (autoclave: conserto + 3 dias) | Cebrap/Amobitec (2025). Autoclave exigida pela Portaria SES-RS 500/2010 (CEVS-RS: https://www.cevs.rs.gov.br/upload/arquivos/201706/27140015-1358859248-apresentacao-portaria-eis-portaria-500.pdf), nova de R$ 1.480 a R$ 3.990 (https://www.casadodermato.com.br/autoclave-vitale-5-litros-cristofoli) | Média (moto e carro); estimativa (bicicleta, tela, conserto da autoclave) |
| 45 | Doença: 7 dias | −7 dias − R$ 60 de remédio; no mês 3, com "não parar", só 3 dias | Lei 8.213, arts. 25 I e 59; Farmácia Popular sem antibiótico | Alta (a regra); estimativa (o remédio) |
| 46 | Queda leve: 5 dias (moto, bike, carro) | Jonas −961 (5 dias + retrovisor, manete e guidão = R$ 594); Kauã −378; Marcos −1.278 (5 dias + funilaria de R$ 800) | Cebrap/Amobitec (2025): 22% dos entregadores de moto e 15% dos motoristas acidentados em 3 meses. Peças de CG 160 em concessionária (AutoPapo, 04/03/2026: https://autopapo.com.br/motos/valor-pecas-de-motos-populares/). Seguro do iFood só a partir de 7 dias; INSS só acima de 15. **Ninguém paga nada** | Média; estimativa (bicicleta e funilaria) |
| 47 | **Fratura: 45 dias** (grave, meses 2 e 3) | 20 dias no mês (Jonas −1.467, Kauã −913, Daiane −1.000, Marcos −1.913, Rose −1.400) + conserto (moto −1.500, bike −300, carro −2.000) + remédio −150. **Mais 25 dias no mês seguinte** (Jonas −1.833) | Fratura de punho: 6 a 8 semanas para consolidar (OrthoInfo/AAOS: https://www.orthoinfo.org/diseases--conditions/fraturas-distais-do-radio-fratura-do-punho-distal-radius-fractures/). Cebrap: afastamentos de até 3 meses, "nenhum relatou uso da previdência". UFBA: só 20% dos que pararam 15 dias ou mais receberam benefício | Média (dias); estimativa (consertos, entre R$ 594 e R$ 5.862,54, que é o lado inteiro da moto na concessionária) |
| 48 | Auxílio do INSS da fratura (efeito do mês 3) | **+R$ 2.431** (45 × 54,03); com "voltei antes da alta", **+R$ 1.621** (30 dias) | itens 3 e 4 | Alta |
| 49 | **INSS negou** (grave, só depois de fratura com MEI) | −2.431 (ou −1.621) | item 5; peso 105, que dá ~50% nesse ramo | Média |
| 50 | **Recaída** (grave, só depois de fratura) | −10 dias − R$ 600 (4 sessões de fisioterapia a R$ 150) | Doctoralia/Cronoshare: R$ 150 a R$ 320 por sessão em Porto Alegre. SUS no RS: 12.465 na fila de ortopedia em jan/2026, sem tempo médio divulgado (Agora RS, 28/05/2026) | Baixa |
| 51 | **Bloqueio** (grave, meses 2 e 3) | −15 dias. Se foi no mês 2: **o mês 3 inteiro** (Jonas −2.200), a menos que haja associação (+9 dias) ou dois apps (metade de volta) | Abílio (2021), p. 941 e 950; CUT, 23/07/2026 (item 40); TJDFT, 16/01/2026: 16 semanas; O Povo, 01/12/2025: 15,5% relatam bloqueio sem explicação (pesquisa GigU, **fintech do setor**). Instagram: onda de banimentos em 2026 (TecMundo; Correio da Manhã, 05/2026) | Média (os prazos); baixa (a chance) |
| 52 | **Assalto** (grave; menos Daiane) | −R$ 1.000 (celular) − 3 dias (o dia roubado e 2 sem sair) | Cebrap/Amobitec (2025), p. 45 e 70: 7% dos entregadores e 6% dos motoristas assaltados em 3 meses. Ação da Cidadania: 93,4% sem seguro do celular | Média (a chance); estimativa (o celular) |
| 53 | Trabalhei e não recebi | Jonas −120 e Kauã −80 (pedidos cancelados depois da coleta); Daiane −180 (Pix falso); Marcos −150 (cancelaram a caminho); Rose −175 (3 × (R$ 60 × 0,8 + R$ 10,60)) | NailNow (FAQ): cancelar é grátis até 1 h antes; 99: taxa só entre 4 e 12 min; Pix falso: guias da Stone e do Mercado Pago | Baixa (os valores) |
| 54 | O app apertou a taxa (meses 1 e 3; Jonas, Kauã, Daiane) | Jonas −180 (40 entregas agrupadas × R$ 4,50); Kauã −135 (30 × 4,50); Daiane −150 (anúncio +12,15% e chocolate +24,77%) | iFood (item 34); chocolate +24,77% em 12 meses (Poder360: https://www.poder360.com.br/poder-economia/chocolate-sobe-248-em-1-ano-e-pressiona-pascoa-de-2026/) | Alta (as regras); estimativa (as quantidades) |
| 55 | A mobilização arrancou um reajuste (mês 3; Jonas e Kauã) | Jonas +R$ 150 (R$ 1 × 150 entregas); Kauã +R$ 75 (R$ 0,50) | Brasil de Fato, 29/04/2025. https://www.brasildefato.com.br/2025/04/29/ifood-anuncia-aumento-entregadores-acham-valor-patetico-e-exigem-negociacao-ate-1o-de-maio/ | Baixa (as 150 entregas) |

### 2.8 Referência "Jonas com carteira assinada"

- **Salário-base médio de motoboy:** R$ 1.763,45 (CAGED ago/2025–jul/2026,
  https://www.salario.com.br/profissao/motoboy/). Confiança média: é média
  nacional, e não achei a convenção do Sindimoto-RS.
- **Mais 30% de periculosidade** (Lei 12.997/2014): bruto de R$ 2.292,49.
- **Menos INSS de R$ 182,00** (Portaria MPS/MF 13/2026). O IR é isento (Lei
  15.270/2025). Líquido: **R$ 2.110,48 por mês**.
- **A mesma casa do Jonas de app:** + R$ 1.499 da companheira − R$ 4.166 do
  básico − R$ 480 da parcela − R$ 261 da manutenção = **−R$ 1.297,52 por mês**.
- **Com os mesmos juros de 7,43%:** −R$ 1.297,52 → −R$ 2.691,04 → **−R$ 4.188,56**.
- **Mais 13º e férias proporcionais a 3 meses:** R$ 527,62 + R$ 703,49.
- **Total: −R$ 2.957 no config** (era +R$ 840, com o custo de vida de 28/09).
- **Ficam de fora, a favor da carteira:** o FGTS (8% sobre salário, 13º e
  férias = R$ 657), o aluguel de moto que muitas convenções pagam, e o INSS
  desde o primeiro dia (a empresa paga os 15 primeiros).
- **Comparação:** o Jonas de app termina com −R$ 5.029 no piloto automático e
  −R$ 4.204 no melhor caminho, com a energia no fim.

### 2.9 Para os slides (não entram no config)

- **DIEESE:** salário mínimo necessário de R$ 7.565,86 (4,67 salários mínimos);
  com a cesta de Porto Alegre, R$ 7.051,30.
- **PNAD 2025:** 84,4% homens; 44,7 h por semana; 72,1% informais; "não consegue
  outro trabalho" é o motivo de 24,6%.
- **DetranRS:** 122 motociclistas morreram no 1º trimestre de 2026 (+8%); pelo
  menos 40% dos habilitados trabalhavam com a moto.
- **Notificações de acidente de trabalho (SINAN):** 8.630 em 2023, 10.034 em
  2024 e 11.662 em 2025. A subnotificação é grande.
- **Enchente de 2024:** o iFood pagou R$ 1.500 (3 × R$ 500) a quem estava
  inscrito em assistência social, depois de mediação do MPT
  (https://www.prt4.mpt.mp.br/procuradorias/prt-porto-alegre/12358). A Mottu
  cobrou R$ 245 por semana pelas motos perdidas.
- **Seguro do iFood:** automático, diária de no mínimo R$ 50, de 7 a 30 dias,
  teto de **R$ 3.000**, só na rota do iFood
  (https://institucional.ifood.com.br/entregadores/seguro-contra-acidentes-pessoais-ifood/).
  Mesmo assim, "só uma pequena parte" dos entregadores do Cebrap recebeu algo
  (pergunta 11).

---

## 3. Famílias, básico e outra renda

| Equipe | Persona | Em casa (`familia`) | Básico da casa | Outra renda | Do trabalho | Falta num mês comum |
|---|---|---|---|---|---|---|
| e1 Laranja, e2 Azul-céu | **Jonas**, motoboy, 34, moto financiada, Sarandi | Jonas, a companheira (caixa de supermercado, um salário mínimo) e a filha de 6 anos. 3 pessoas | **R$ 4.166** | R$ 1.499 | 2.200 − 480 − 261 = **R$ 1.459** | **−R$ 1.208** |
| e3 Verde-azulado | **Daiane**, vende doces e marmitas pelo Instagram, 29 | Daiane e o filho de 4 anos, de aluguel; o pai não paga pensão. 2 pessoas | **R$ 2.755** | — | 1.500 − 141 = **R$ 1.359** | **−R$ 1.396** |
| e4 Azul | **Marcos**, motorista, 41, carro de 2014, ex-metalúrgico | Marcos, a esposa (auxiliar de cozinha, um salário mínimo) e os filhos de 10 e 7 anos. 4 pessoas | **R$ 4.742** | R$ 1.499 | 2.870 − 400 = **R$ 2.470** | **−R$ 773** |
| e5 Vermelhão | **Kauã**, bike, 20, quer fazer faculdade, Restinga | Kauã, a mãe (auxiliar de limpeza, um salário mínimo) e a irmã de 9 anos. 3 pessoas | **R$ 3.886** | R$ 1.499 | **R$ 1.370** | **−R$ 1.017** |
| e6 Roxo-rosado | **Rose**, manicure por app, 47, atende de ônibus | Rose sustenta sozinha a casa: a filha de 15 estuda, e o filho de 23 procura emprego há cinco meses. 3 pessoas | **R$ 4.512** | — | **R$ 2.100** | **−R$ 2.412** |

**O básico, item por item** (valores do config, em R$):

| Item | Jonas | Kauã | Daiane | Marcos | Rose |
|---|---|---|---|---|---|
| Comida (cesta × adultos) | 2.098 (× 2,5) | 2.098 (× 2,5) | 1.259 (× 1,5) | 2.518 (× 3) | 2.518 (× 3) |
| Aluguel | 1.300 | 1.020 | 1.000 | 1.300 | 1.300 |
| Luz | 162 | 162 | 130 | 194 | 162 |
| Água e esgoto | 119 | 119 | 79 | 158 | 119 |
| Gás | 89 | 89 | 71 | 119 | 89 |
| Ônibus | 233 (companheira) | 233 (mãe) | 106 | 233 (esposa) | 159 (filhos) |
| Celular e internet | 75 | 75 | 50 | 100 | 75 |
| Remédios | 90 | 90 | 60 | 120 | 90 |
| **Total** | **4.166** | **3.886** | **2.755** | **4.742** | **4.512** |

- **Energia inicial**, que é mecânica de jogo, sem fonte: Jonas 7, Kauã 8
  (−1 por mês, porque pedalar 11 horas cansa), Daiane, Marcos e Rose 6.
- **O indicador "Saldo acumulado"** passou a ter mínimo de −R$ 30.000. Era
  −R$ 10.000, e o pior caso agora chega a −R$ 15.672 (Marcos).

---

## 4. Opções, contextos e cartas

O contexto de cada persona aparece no celular durante a decisão e tem até 160
caracteres. As opções ficam sem `tendencia` (D-043). O `*` marca o padrão, ou
seja, o piloto automático.

### 4.1 Mês 1: quanto trabalhar?

*"Quem fica mais tempo online recebe mais pedidos. Ninguém paga o seu INSS, e o
básico da casa vence no fim do mês, com acidente ou sem."*

**Contexto de cada casa:**
- **Jonas:** A parcela da moto vence dia 5. A filha precisa de tênis para a
  escola, e o salário da companheira já está todo no aluguel.
- **Kauã:** O cursinho noturno começa na segunda, na hora do pico do jantar. A
  mãe pediu ajuda com a conta de luz.
- **Daiane:** O aluguel vence dia 10 e o pai do menino não paga pensão. O menino
  está com tosse há uma semana.
- **Marcos:** O pneu está careca e a revisão atrasou. A escola dos meninos pediu
  material e uniforme.
- **Rose:** Tudo sai do seu bolso. O filho de 23 procura emprego há cinco meses,
  e a filha de 15 pediu dinheiro para a excursão.

| | Opção | Narrativa (celular e história da equipe) | O que faz |
|---|---|---|---|
| a | 12 horas por dia, 7 dias por semana | Fiquei online da manhã até a madrugada, sete dias. Dormi pouco, comi na rua e não vi minha casa acordada. | +horas (item 31); energia −3; mais semana boa, quebra, queda e assalto |
| b | Jornada de sempre e abrir o MEI | Mantive a rotina, abri o MEI e pago o DAS todo mês. Se eu me acidentar e ficar mais de 15 dias parado, o INSS paga, um mês depois. | −DAS agora e nos meses 2 e 3; proteção +3; INSS se houver fratura no mês 2 |
| c* | Jornada de sempre, sem pagar nada | Mantive a rotina e não paguei nada. Sobrou um pouco mais, e continuo sem rede se algo der errado. | energia −1 |
| d | Trabalhar menos para estudar ou cuidar da família | Tirei um dia por semana para estudar e ficar com os meus. Descansei, e o dinheiro desse dia fez falta no fim do mês. | −5 dias; energia +1; queda ×0,6 |

**Por que o padrão é "c":** 66% dos plataformizados não contribuem (PNAD).

### 4.2 Mês 2: o app muda a regra

*"Sem aviso, a plataforma mudou o cálculo e passou a pagar menos. Quem recusa
demais some da fila, e ninguém explica a conta."* Efeito geral: corte de 15%
(item 34) e o DAS de quem abriu o MEI.

**Contexto de cada casa:**
- **Jonas:** O mês passado fechou no vermelho, e o cheque especial cobra 7,43% ao
  mês. A filha faz aniversário no sábado.
- **Kauã:** Um colega foi bloqueado na semana passada e o app não respondeu. A
  mãe está com a pressão alta.
- **Daiane:** O anúncio no Instagram ficou 12% mais caro e o chocolate subiu 25%
  em um ano. A escola do menino pediu material.
- **Marcos:** Na 99, quem finaliza menos de 70% das corridas fica 5 dias fora. O
  mais velho pediu chuteira para o time da escola.
- **Rose:** O app de manicure fica com 20% de cada atendimento. A geladeira está
  vazia, e o aluguel venceu ontem.

| | Opção | Narrativa | O que faz |
|---|---|---|---|
| a* | Aceitar tudo o que vier, para não sumir da fila | Aceitei até o que não compensava, para o app não me esconder. Trabalhei mais para ganhar quase o mesmo. | +10%; energia −2; bloqueio ×0,4; mais quebra, queda e fratura |
| b | Recusar o que não paga | Recusei o que não compensava. Descansei um pouco, e passei o mês com medo de ser bloqueado sem aviso. | energia +1; **bloqueio +10** (vai de 1,6% para 13%) |
| c | Rodar em dois apps ao mesmo tempo | Liguei dois apps e fiquei pulando de um para o outro. Rendeu mais, e o seguro de um não cobre a corrida do outro. | +20%; energia −3; bloqueio +4, mas o outro app segura metade; mais queda e fratura |
| d | Parar um dia no breque | Desliguei o app no dia do breque, junto com os outros. Perdi o dia. O reajuste, se vier, demora. | −1 dia; energia +1, proteção +1; **reajuste do mês 3 +8** (Jonas e Kauã) |

**Por que o padrão é "a":** é o que o algoritmo empurra.

### 4.3 Mês 3: e agora?

*"O mês não fecha, e a dívida já cobra juros. Cada saída tem um preço, e nenhuma
resolve sozinha."*

**Efeito geral:**
- o DAS de quem abriu o MEI;
- quem tirou fratura no mês 2: a fratura continua, e o INSS chega;
- quem tirou bloqueio no mês 2: o bloqueio continua (seção 4.5).

**Contexto de cada casa:**
- **Jonas:** O dono da casa avisou: sem garantia no contrato, a lei permite
  despejo em 15 dias. A parcela da moto também venceu. (Lei 8.245/1991, art. 59,
  https://www.planalto.gov.br/ccivil_03/leis/l8245.htm)
- **Kauã:** A luz atrasou, e a próxima conta vem com aviso de corte em 15 dias. A
  irmã de 9 anos precisa de óculos. (ANEEL, REN 1.000/2021)
- **Daiane:** A distribuidora pediu 24% de aumento na luz para novembro. O menino
  precisa de consulta, e a fila do posto está longa. (Sul21, 08/2026: +24,24%, em
  consulta pública)
- **Marcos:** O cartão fechou no rotativo, que cobra 15% ao mês. Os filhos
  perguntam por que não tem mais carne. (BCB, 15,18%)
- **Rose:** O filho conseguiu uma entrevista e precisa do dinheiro do ônibus. A
  luz atrasou, e vem aviso de corte.

| | Opção | Narrativa | O que faz |
|---|---|---|---|
| a | Pegar um empréstimo e rodar até de madrugada | Peguei R$ 1.500 no crédito pessoal para pôr as contas em dia e rodei até de madrugada. A dívida continua depois deste mês. | +20% (zero se machucado ou bloqueado); −R$ 96 de juros; energia −3; assalto +3 |
| b* | Apertar o cinto: cortar comida e remédio | Cortei a carne, a fruta e o remédio que não era urgente. Sobrou um pouco, e a casa passou a comer pior. | +~4% da comida; energia −1; doença +4 |
| c | Entrar na associação dos trabalhadores | Entrei na associação: mensalidade e um dia na assembleia. Se o app me bloquear, agora tem advogado do meu lado. | −1 dia − R$ 30; energia +1, proteção +2; bloqueio do mês 2: liminar (+9 dias); reajuste +5 |
| d | Não parar nenhum dia, nem machucado | Trabalhei nas folgas e fui trabalhar doente. Se estava machucado, voltei antes da alta. | +2 folgas; energia −3; queda e fratura +2; doença só 3 dias; fratura do mês 2: +15 dias, e a recaída vai de ~7% para ~22% |

**Por que o padrão é "b":** é a saída individual de sempre. A associação
continua com o menor saldo do mês 3 (D-029).

### 4.4 Cartas

| Carta (curto) | Peso | Quando | Narrativa | O que muda a fatia |
|---|---|---|---|---|
| Um mês como os outros (Normal) | 40 | sempre | Nada fora do comum. E mesmo assim o mês não fechou. | — |
| Uma semana boa (Semana boa) | 12 | sempre | Bati o desafio da semana, veio gorjeta, entrou uma encomenda grande. Não dá para contar com isso no mês que vem. | +6 com 12 h (mês 1); +3 com dois apps |
| Temporal em Porto Alegre (Temporal) | 8 | sempre | Alerta laranja, vento e granizo. O app lançou promoção de chuva em letras grandes; o "cuidado na chuva" veio em letra miúda. | — (ganha quem entrega; perde quem espera cliente) |
| O instrumento de trabalho quebrou (Quebrou) | 8 | sempre | Quebrou o que eu uso para trabalhar. Sem ele, não ganho, e o conserto sai do meu bolso. | +3 com a opção "a" de qualquer mês |
| Adoeci: uma semana parado (Doença) | 6 | sempre | Parei uma semana. Nem o MEI cobre: doença exige 12 meses de contribuição e mais de 15 dias parado. | +8 com energia < 4; +8 com energia < 2; +4 com "apertar o cinto" |
| Queda leve: 5 dias parado (Queda) | 6 | sempre; Jonas, Kauã, Marcos | Um tombo no molhado, ou uma batida leve: cinco dias parado e o conserto. Menos de 7 dias, o seguro do app não paga; menos de 16, o INSS não paga. | +2 com "a"; +2 com dois apps; +2 com "não parar"; +3 com energia < 4; ×0,6 com "trabalhar menos" |
| **Acidente: fratura, 45 dias parado (Fratura)**, grave | 1 | meses 2 e 3 | Me acidentei e quebrei o punho. São 45 dias parado: 20 neste mês e 25 no próximo. O app não paga nenhum; o INSS, só para quem já pagava o MEI. | +3 moto e bike; +2 carro; +3 com energia < 4; +2 com "a", dois apps e "não parar" (só quem está na rua) |
| **Conta bloqueada sem explicação (Bloqueio)**, grave | 4 | meses 2 e 3 | Bloquearam minha conta com uma mensagem genérica, sem prazo e sem jeito de me defender. Sem advogado, ninguém responde o recurso. | ×0,4 com "aceitar tudo"; +10 com "recusar"; +4 com dois apps |
| **Fui assaltado (Assalto)**, grave | 2 | sempre; menos Daiane | Levaram o celular e o dinheiro do dia. Fiquei dois dias sem coragem de sair, e sem celular não tem app. | +2 com 12 h; +3 com madrugada |
| Trabalhei e não recebi (Não pagou) | 8 | sempre | Fiz o serviço, ou fui até lá, e o dinheiro não veio. Reclamar no app leva dias e quase nunca dá em nada. | — |
| O app apertou a taxa (Taxa) | 6 | meses 1 e 3; Jonas, Kauã, Daiane | Mais um corte, sem aviso: a segunda entrega da rota passou a pagar menos, ou o anúncio e o insumo subiram. | — |
| A mobilização arrancou um reajuste (Reajuste) | 2 | mês 3; Jonas e Kauã | Depois do breque, a plataforma subiu o valor mínimo por entrega. É pouco, e veio de quem parou. | +8 se parou no breque (mês 2); +5 com a associação |
| **A perícia do INSS negou o auxílio (INSS negou)**, grave | 105 | mês 3; só depois de fratura no mês 2 com MEI | Paguei o MEI em dia, esperei a decisão e a perícia negou. O dinheiro que eu contava não veio. | — (dá ~50% nesse ramo) |
| **A lesão voltou (Recaída)**, grave | 8 | mês 3; só depois de fratura no mês 2 | O punho não aguentou. Mais dez dias parado, e a fila do SUS para fisioterapia não tem data. | +20 com "não parar nem machucado" |

**Chances do Jonas no caminho do piloto automático**, com carta "normal" nos
meses anteriores:

| Mês e opção | Normal | Semana boa | Temporal | Quebrou | Doença | Queda | Fratura | Bloqueio | Assalto | Não pagou | Taxa | Reajuste |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 a | 36,7% | 16,5% | 7,3% | 10,1% | 5,5% | 7,3% | — | — | 3,7% | 7,3% | 5,5% | — |
| 1 b ou c | 41,7% | 12,5% | 8,3% | 8,3% | 6,3% | 6,3% | — | — | 2,1% | 8,3% | 6,3% | — |
| 1 d | 42,7% | 12,8% | 8,5% | 8,5% | 6,4% | 3,8% | — | — | 2,1% | 8,5% | 6,4% | — |
| 2 a | 39,0% | 11,7% | 7,8% | 10,7% | 5,8% | 7,8% | 5,8% | 1,6% | 1,9% | 7,8% | — | — |
| 2 b | 37,0% | 11,1% | 7,4% | 7,4% | 5,6% | 5,6% | 3,7% | **13,0%** | 1,9% | 7,4% | — | — |
| 2 c | 36,7% | 13,8% | 7,3% | 7,3% | 5,5% | 7,3% | 5,5% | 7,3% | 1,8% | 7,3% | — | — |
| 2 d | 40,8% | 12,2% | 8,2% | 8,2% | 6,1% | 6,1% | 4,1% | 4,1% | 2,0% | 8,2% | — | — |
| 3 a | 34,5% | 10,3% | 6,9% | 9,5% | 5,2% | 6,9% | 5,2% | 3,4% | 4,3% | 6,9% | 5,2% | 1,7% |
| 3 b | 36,4% | 10,9% | 7,3% | 7,3% | 9,1% | 5,5% | 3,6% | 3,6% | 1,8% | 7,3% | 5,5% | 1,8% |
| 3 c | 36,0% | 10,8% | 7,2% | 7,2% | 5,4% | 5,4% | 3,6% | 3,6% | 1,8% | 7,2% | 5,4% | 6,3% |

- **Com energia baixa**, a doença chega a ~20% num mês.
- **Quem parou no breque** vê o reajuste chegar a 8,5% no mês 3, e a 12,6% se
  também entrar na associação.
- **Chance de acidente com afastamento:** somando queda e fratura, o Jonas fica
  entre 6% e 14% por mês no piloto. A pesquisa do Cebrap dá 22% em 3 meses, e a
  da UFBA, 44% em um ano. Está dramatizado para caber em 3 rodadas, como pede a
  D-030.

### 4.5 O que atravessa os meses (D-043), com os números do Jonas

| Caminho | Mês 2 | Mês 3 | Meses 2 e 3 |
|---|---|---|---|
| Fratura no mês 2, **sem MEI** | −1.467 − 1.500 − 150 = **−3.117** | −1.833 (mais 25 dias) | **−4.950** |
| Fratura no mês 2, **com MEI e o INSS aprovado** | −3.117 − 86 | −1.833 + 2.431 − 86 | **−2.691** (fora os R$ 86 do mês 1) |
| Fratura no mês 2, **com MEI e o INSS negado** (~50%) | −3.117 − 86 | −1.833 − 86 | **−5.122** |
| Fratura no mês 2, sem MEI, e "voltei antes da alta" | −3.117 | −1.833 + 1.100 | **−3.850**, com ~22% de recaída (mais −1.333) |
| Bloqueio no mês 2, sozinho | −1.100 | −2.200 (o mês inteiro) | **−3.300** |
| Bloqueio no mês 2 e associação no mês 3 | −1.100 | −2.200 + 660 − 103 | **−2.743** |
| Bloqueio no mês 2 com dois apps | −1.100 + 550 | −2.200 + 1.100 | **−1.650** |

---

## 5. Contas

### 5.1 Quanto falta para o básico: um mês comum no piloto automático

Carta "normal" nos três meses e as opções c, a e b. É a conta mínima: qualquer
carta ruim piora.

| Persona | Mês | Do trabalho | Outra renda | Entrou | Básico | Juros | **Faltou** | Saldo acumulado |
|---|---|---|---|---|---|---|---|---|
| Jonas | 1 | 1.459 | 1.499 | 2.958 | 4.166 | 0 | **−1.208** | −1.208 |
| | 2 | 1.349 | 1.499 | 2.848 | 4.166 | 90 | **−1.408** | −2.616 |
| | 3 | 1.543 | 1.499 | 3.042 | 4.166 | 194 | **−1.318** | −3.934 |
| Kauã | 1 | 1.370 | 1.499 | 2.869 | 3.886 | 0 | **−1.017** | −1.017 |
| | 2 | 1.301 | 1.499 | 2.800 | 3.886 | 76 | **−1.162** | −2.179 |
| | 3 | 1.454 | 1.499 | 2.953 | 3.886 | 162 | **−1.095** | −3.274 |
| Daiane | 1 | 1.359 | — | 1.359 | 2.755 | 0 | **−1.396** | −1.396 |
| | 2 | 1.284 | — | 1.284 | 2.755 | 104 | **−1.575** | −2.971 |
| | 3 | 1.409 | — | 1.409 | 2.755 | 221 | **−1.567** | −4.538 |
| Marcos | 1 | 2.470 | 1.499 | 3.969 | 4.742 | 0 | **−773** | −773 |
| | 2 | 2.326 | 1.499 | 3.825 | 4.742 | 57 | **−974** | −1.747 |
| | 3 | 2.571 | 1.499 | 4.070 | 4.742 | 130 | **−802** | −2.549 |
| Rose | 1 | 2.100 | — | 2.100 | 4.512 | 0 | **−2.412** | −2.412 |
| | 2 | 1.995 | — | 1.995 | 4.512 | 179 | **−2.696** | −5.108 |
| | 3 | 2.201 | — | 2.201 | 4.512 | 380 | **−2.691** | −7.799 |

**Uma conta à mão (Jonas, mês 1, opção c):**
- **Sem carta:** 2.200 − 480 − 261 + 1.499 − 4.166 = **−R$ 1.208**.
- **Cartas** (pesos somam 96): (12 × 220 + 8 × 150 − 8 × 669 − 6 × 573 −
  6 × 961 − 2 × 1.220 − 8 × 120 − 6 × 180) ÷ 96 = −15.196 ÷ 96 = **−R$ 158**.
- **Mês:** **−R$ 1.366**. É o que o validador imprime em (b): "r1 c renda E
  −1.366,3".

### 5.2 Uma decisão por vez (as outras no piloto automático)

Saldo esperado no fim dos 3 meses; entre parênteses, o pior caso. O `*` marca o
padrão, e o negrito, a melhor opção do mês em cada critério. Valores em R$.

| Persona | Mês | a | b | c | d |
|---|---|---|---|---|---|
| Jonas | 1 | **−4.560** (−13.041) | −5.215 (**−12.119**) | −5.029* (−13.640) | −5.376 (−14.065) |
| | 2 | −5.029* (−13.640) | −5.436 (−13.877) | **−4.856** (**−13.404**) | −5.217 (−13.955) |
| | 3 | **−4.877** (−13.820) | −5.029* (−13.640) | −5.177 (−13.827) | −4.935 (**−12.477**) |
| Kauã | 1 | **−3.784** (−8.433) | −4.039 (**−8.332**) | −3.850* (−8.555) | −4.061 (−8.818) |
| | 2 | −3.850* (−8.555) | −4.112 (−8.702) | **−3.726** (**−8.408**) | −3.975 (−8.751) |
| | 3 | −3.813 (−8.735) | −3.850* (−8.555) | −3.987 (−8.715) | **−3.804** (**−8.139**) |
| Daiane | 1 | **−4.721** (**−8.404**) | −5.266 (−8.893) | −5.019* (−8.808) | −5.260 (−9.096) |
| | 2 | −5.019* (−8.808) | −5.391 (−8.969) | **−4.884** (**−8.647**) | −5.230 (−9.023) |
| | 3 | **−4.875** (−8.954) | −5.019* (−8.808) | −5.132 (−8.938) | −4.928 (**−8.678**) |
| Marcos | 1 | **−3.642** (−14.370) | −4.347 (**−13.053**) | −4.150* (−15.120) | −4.545 (−15.672) |
| | 2 | −4.150* (−15.120) | −4.597 (−15.428) | **−3.846** (**−14.811**) | −4.349 (−15.531) |
| | 3 | **−3.914** (−15.317) | −4.150* (−15.120) | −4.358 (−15.347) | −4.017 (**−13.595**) |
| Rose | 1 | **−8.043** (**−13.595**) | −8.708 (−14.251) | −8.446* (−14.160) | −8.785 (−14.564) |
| | 2 | −8.446* (−14.160) | −8.968 (−14.386) | **−8.265** (**−13.935**) | −8.748 (−14.461) |
| | 3 | **−8.259** (−14.357) | −8.446* (−14.160) | −8.624 (−14.361) | −8.348 (**−14.074**) |

**O que a tabela mostra:**
- **Nenhuma opção ganha tudo.** A de maior saldo esperado paga com energia,
  com risco ou com o pior caso.
  - No mês 1, "12 horas" tem o maior saldo, e o MEI tem o melhor pior caso para
    quem está na rua.
  - No mês 3, "não parar nem machucado" tem o melhor pior caso.
- **O MEI custa em média de R$ 186 a R$ 262 e melhora o pior caso** do Jonas em
  R$ 1.521 e do Marcos em R$ 2.067. Na Daiane e na Rose, que não estão na rua, o
  pior caso fica R$ 85 a R$ 91 pior (é só o DAS).
- **"Trabalhar menos" é sempre a opção mais cara do mês 1.** Custa de R$ 211
  (Kauã) a R$ 395 (Marcos) no valor esperado, contra o piloto.
- **O breque (mês 2, d) e a associação (mês 3, c) custam dinheiro.** A
  associação continua com o menor saldo do mês 3 (D-029). O breque só volta como
  reajuste para Jonas e Kauã, e mesmo assim não se paga em 3 meses.

### 5.3 Caminhos inteiros e o saldo típico no fim

| Persona | Piloto (c-a-b): esperado | Mediana | Melhor caminho esperado | Pior caminho esperado | Decisões ao acaso: 10% piores / 10% melhores | Melhor resultado possível | Fecha algum mês? |
|---|---|---|---|---|---|---|---|
| Jonas | −5.029 | −4.603 | a-c-a: −4.204 | d-b-c: −5.907 | −7.490 / −3.633 | −2.128 | nunca |
| Kauã | −3.850 | −3.606 | a-c-d: −3.601 | d-b-c: −4.454 | −5.286 / −3.235 | −2.469 | 0,1% |
| Daiane | −5.019 | −4.946 | a-c-a: −4.457 | d-b-c: −5.733 | −6.027 / −4.349 | −3.335 | nunca |
| Marcos | −4.150 | −3.757 | a-c-a: −3.121 | d-b-c: −5.219 | −7.187 / −2.185 | −200 | 6,3% |
| Rose | −8.446 | −8.349 | a-c-a: −7.691 | d-b-c: −9.468 | −9.894 / −7.536 | −6.106 | nunca |

- **Nenhuma equipe termina com saldo positivo,** em nenhum caminho de nenhuma
  persona. O melhor resultado possível do Marcos (−R$ 200) exige 12 horas, dois
  apps, madrugada e três boas cartas seguidas.
- **O melhor caminho é sempre o do esgotamento** (12 horas, dois apps, madrugada
  ou "não parar"), e ele termina com a energia em 0. É o risco R12 ("quem se
  esforça ganha"), já aceito na D-024. Mesmo esse caminho fica a mais de
  R$ 3.000 do básico.
- **A diferença entre as personas é maior que a diferença entre as decisões.**
  A Rose no melhor caminho (−7.691) termina bem abaixo do pior caminho de
  qualquer outra persona (−5.907, o Jonas). Quem mora na casa pesa mais do que o
  que se decide.

### 5.4 O que o validador disse

- **O que rodei:** `node bin/validar-config.mjs`, sobre a versão
  `2026-09-29-v2-rascunho` (hash `45f91525`).
- **Formato:** 0 erros. Os contextos têm de 87 a 122 caracteres; o limite é 160.
- **(c) Opção dominante:** nenhuma. Nenhuma opção vence as outras com mais de
  70% de probabilidade.
- **(d) Piloto automático:** o padrão nunca é a opção de maior saldo esperado.
  - A folga menor está no Kauã, mês 3: "apertar o cinto" dá −R$ 4.011, contra
    −R$ 3.988 de "empréstimo e madrugada" (R$ 23 de diferença).
  - Uma edição pequena pode trazer o aviso de volta.
- **(e) Variância, 5 avisos:** as decisões explicam Jonas 6,9%, Kauã 6,2%,
  Daiane 17%, Marcos 5,6% e Rose 15,8%. A faixa sugerida é de 30% a 60%.
  - Pela D-024, esses avisos são esperados.
  - Quase toda a variância vem das cartas graves (a fratura e o bloqueio, que
    atravessam o mês). O básico descoberto é o mesmo em todas as decisões.
- **(f) Mínimo sem consequência:** nenhum. A energia chega a 0 em 32,1% das
  partidas, e isso tem consequência, porque doença, queda e fratura ficam mais
  prováveis.
- **Testes:** `npm test` dá 355 de 355, inclusive "o config.json da raiz passa
  no validador". O simulador (`--memoria --rapido`) fecha com 0 violações nos
  dois roteiros.

### 5.5 Roteiros

A decisão passou de 90 para 120 s (D-043), então cada rodada sobe de 240 para
300 s. O placar em páginas (D-041) sobe de 180 para 240 s, e as personas, agora
com família e básico, de 120 para 150 s.

| 60 min | seg | 120 min | seg |
|---|---|---|---|
| lobby | 120 | lobby | 150 |
| enquete de entrada, antes (opcional) | 90 | enquete de entrada, antes (opcional) | 90 |
| Gancho: o lançamento | **180** (era 210) | Gancho: o lançamento | 270 |
| Mapa do seminário | **180** (era 240) | Mapa do seminário | 270 |
| formar equipes | 120 | formar equipes | 120 |
| personas | **150** | personas | **150** |
| Debrief e teoria: a conta do entregador | 240 | Debrief e teoria: a conta do entregador | 300 |
| **Mês 1** | **300** | **Mês 1** | **300** |
| Debrief e teoria: gestão por algoritmo | **240** (era 300) | Debrief e teoria: gestão por algoritmo | 360 |
| **Mês 2** | **300** | **Mês 2** | **300** |
| Contraponto: a Viração e os dados sobre CLT | **240** (era 300) | Debrief e teoria: quiz anúncio ou conteúdo | 480 |
| Caminhos: regulação, proteção, organização e educação | 240 | Contraponto: a Viração e os dados sobre CLT | 300 |
| **Mês 3** | **300** | Contraponto: entrevistas em Porto Alegre | **540** (era 600) |
| placar final | **240** | Caminhos: regulação, proteção, organização e educação | 240 |
| Termômetro (curto) | **300** (era 360) | **Mês 3** | **300** |
| enquete de entrada, depois | 90 | placar final | **240** |
| comparativo | 150 | Debrief e teoria: mapa do patrão em grupos | **840** (era 900) |
| Fim: quem é o patrão? | 120 | Caminhos: convidado com perguntas | **1.050** (era 1.200) |
| fim | — | Termômetro | 540 |
| | | enquete de entrada, depois | 90 |
| | | comparativo | 150 |
| | | Fim: quem é o patrão? | 120 |
| | | fim | — |
| **Total** | **3.600** | **Total** | **7.200** |

---

## 6. Perguntas para o Kleberson validar

1. **Três das cinco casas têm uma segunda renda de um salário mínimo** (Jonas,
   Kauã e Marcos).
   - *Por que importa:* sem ela, o mês comum dessas casas faltaria de R$ 2.272 a
     R$ 2.707, e não de R$ 773 a R$ 1.208.
   - *Opções:*
     - (a) manter: é o retrato mais comum (Cebrap: renda familiar de até 3
       salários mínimos para 48% dos entregadores). Rose e Daiane ficam como as
       que sustentam a casa sozinhas;
     - (b) todas sustentam a casa sozinhas;
     - (c) a segunda renda pelo piso regional do RS (R$ 1.739 líquidos), e não
       pelo mínimo nacional.
2. **A Rose termina muito abaixo das outras** (−R$ 8.446 esperado; falta
   R$ 2.412 num mês comum).
   - *Por que importa:* a equipe dela vai estar sempre no fundo do placar, e
     pode achar que a decisão não serve para nada.
   - *Opções:*
     - (a) manter: é a mensagem (quem mora na casa pesa mais do que a decisão), e
       ela vira o centro do debrief;
     - (b) o filho de 23 faz bicos (outra renda estimada, sem fonte);
     - (c) incluir os benefícios da pergunta 3.
3. **Daiane e Rose teriam direito à Tarifa Social de luz e ao Gás do Povo**
   (renda de até meio salário mínimo por pessoa, com CadÚnico).
   - *Por que importa:* baixaria o básico de cada uma em ~R$ 126 (80 kWh de
     graça e 4 botijões por ano). Com a tarifa social do DMAE, que eu não
     conferi, seriam R$ 165 (Daiane) e R$ 205 (Rose).
   - *Opções:*
     - (a) não incluir e citar no debrief que quem tem direito nem sempre está no
       CadÚnico (é o que está no config);
     - (b) incluir no básico;
     - (c) virar carta: "consegui o CadÚnico".
4. **Qual taxa de juros para a dívida?**
   - *Por que importa:* a dívida da Rose chega a R$ 5.000 no mês 3; a diferença
     entre as taxas vira centenas de reais.
   - *Opções:*
     - (a) cheque especial, 7,43% ao mês (no config);
     - (b) rotativo do cartão, 15,18%;
     - (c) crédito pessoal, 6,39%;
     - (d) cheque especial no jogo, e o agiota (30% ao mês) num slide.
   - *Recomendo:* (a), porque é a modalidade que rola sozinha.
5. **Ninguém fecha as contas, em nenhum caminho.**
   - *Por que importa:* a D-043 pede dúvida. Sem esperança nenhuma, a equipe
     pode parar de pensar e escolher ao acaso.
   - *Opções:*
     - (a) manter: a dúvida fica em quanto falta e em quem aguenta o pior caso;
     - (b) semana boa maior (+20% em vez de +10%);
     - (c) básico sem internet e remédios (a régua mínima de 28/09), que baixa
       de R$ 110 a R$ 220 por mês.
6. **O mês 1 ganhou "trabalhar menos para estudar ou cuidar da família"**, no
   lugar de "alugar um instrumento" (e-bike ou moto), que a pesquisa sugeria.
   - *Por que importa:* aluguel de instrumento só serve a Kauã e Jonas, e a
     opção nova vale para todos. Mas ela sempre perde em saldo, e o ganho dela
     (descanso, estudo) fica fora do jogo.
   - *Opções:* (a) manter; (b) trocar por "alugar um instrumento", com efeito só
     para Jonas e Kauã.
7. **O breque é novo (mês 2, d)** e aumenta a chance de reajuste no mês 3.
   - *Por que importa:* o reajuste que tem fonte (iFood, de R$ 6,50 para
     R$ 7,50) é só de entregador. Para Daiane, Marcos e Rose, parar é só custo.
   - *Opções:*
     - (a) manter e levar ao debate ("vale parar se o ganho não vem para mim?");
     - (b) reajuste para todos, como no config de 28/09 (sem fonte para eles);
     - (c) outra opção d para o mês 2.
8. **INSS negado em ~50% das vezes.**
   - *Por que importa:* é o que faz o MEI parecer uma aposta. A fonte (53%) é
     sobre todo benefício por incapacidade, e não só sobre acidente.
   - *Opções:* (a) 50%; (b) 25%; (c) sem a carta, sempre aprovado.
9. **O bloqueio do mês 2 dura o mês 3 inteiro** (o Jonas perde R$ 3.300 nos dois
   meses).
   - *Por que importa:* é a resposta a "ser banido custa quanto?". A chance vai
     de 1,6% ("aceitar tudo") a 13% ("recusar").
   - *Opções:* (a) manter; (b) só metade do mês 3 (−15 dias).
10. **A fratura atravessa o mês, e "voltar antes da alta" é uma opção.**
    - *Por que importa:* para quem tirou fratura, "não parar" recupera R$ 1.100,
      com ~22% de recaída (−R$ 1.333). É o dilema real, e é pesado.
    - *Opções:* (a) manter; (b) recaída mais provável.
11. **O seguro do iFood não entrou.**
    - *Por que importa:* ele existe (diária mínima de R$ 50, até R$ 3.000), mas
      "só uma pequena parte" dos entregadores recebeu algo (Cebrap, financiado
      pelas plataformas). Sem ele, o Jonas acidentado sem MEI recebe zero.
    - *Opções:*
      - (a) manter fora e citar no slide;
      - (b) carta do mês 3 "o seguro do app pagou", para Jonas e Kauã, com ~20%
        de chance depois de uma fratura. Seria a 15ª carta, acima do limite de
        12 a 14 da D-043.
12. **As estimativas sem fonte novas servem?**
    - *Por que importa:* são as de confiança baixa.
    - *Quais são:*
      - conserto na fratura (moto R$ 1.500, carro R$ 2.000, bike R$ 300);
      - remédio (R$ 60 e R$ 150) e celular (R$ 1.000);
      - tela (R$ 400) e conserto da autoclave (R$ 350);
      - calote, número de entregas agrupadas e valores do temporal;
      - curso em 12x e fisioterapia com 4 sessões;
      - "apertar o cinto" de 4% e a mensalidade de R$ 30 (D-034).
    - *Opções:* (a) aprovar; (b) você passa valores de Porto Alegre.
13. **A referência com carteira assinada virou −R$ 2.957** (era +R$ 840).
    - *Por que importa:* a linha fica negativa, mas ainda ~R$ 2.000 acima do
      Jonas de app no piloto. A leitura muda de "com carteira sobra" para "com
      carteira falta menos".
    - *Opções:*
      - (a) manter;
      - (b) tirar o 13º e as férias proporcionais, que não chegam em 3 meses:
        −R$ 4.189;
      - (c) somar o FGTS: −R$ 2.300.
14. **O indicador Proteção só aparece na tela.** Quem decide o INSS é a decisão
    do MEI no mês 1, porque a lei exige o DAS pago antes do acidente.
    - *Por que importa:* a associação e o breque somam proteção, mas não dão
      INSS.
    - *Opções:* (a) manter como placar da rede de apoio; (b) tirar o indicador
      das telas (mudança de código, fora deste rascunho).
15. **Os roteiros ficaram com rodadas de 300 s**, com cortes em Gancho, Mapa,
    Gestão por algoritmo, Contraponto e Termômetro (60 min), e em Entrevistas,
    Mapa do patrão e Convidado (120 min).
    - *Por que importa:* a soma continua em 3.600 e 7.200 s, mas cada corte sai
      de um trecho da apresentação.
    - *Opções:* (a) aprovar; (b) você diz de onde tirar.
16. **Quem tem 12 anos ou mais come como adulto** (a filha de 15 da Rose).
    - *Por que importa:* a regra do DIEESE não fala de adolescente, e essa
      escolha põe R$ 420 a mais no básico da Rose.
    - *Opções:* (a) manter; (b) meia cesta até 17 anos.

---

## 7. Perguntas da revisão (29/09)

A revisão do redesenho levantou os pontos abaixo. Todos **precisam de decisão**:
mexem no conteúdo validável (valores, textos, famílias) ou numa regra do jogo, e
nada disso foi alterado. As correções de tela que não dependiam de decisão já
entraram: a conta do "Escolha ou sorte?" que fecha, a taxa com 7,43%, a casa das
personas no telão, os avisos junto da barra, o placar com 6 equipes e as opções
no celular.

1. **Mais de 30 dias parado no mesmo mês** (precisa de decisão).
   - *O que acontece:* no mês 3, o efeito geral "a conta continua bloqueada: o
     mês inteiro" (ou "a fratura continua", 25 dias) soma com uma nova carta de
     parada (fratura, doença, queda, quebrou, assalto). Caminho real: r1 b/normal,
     r2 a/bloqueio, r3 a/fratura dá 50 dias parados num mês, e a história da
     equipe escreve isso.
   - *Por que importa:* a chance por equipe fica entre 2,5% e 3,8%; com 6
     equipes, de 15% a 20% de aparecer numa sessão. A linguagem de condição não
     tem negação, então o config sozinho não barra.
   - *Opções:* (a) teto de dias (ou de perda de renda do trabalho) por mês, regra
     nova no motor; (b) negação na condição (`naoSorteou`/`naoDecidiu`), usada
     nas cartas de parada do mês 3 e conferida pelo validador; (c) aceitar e
     reescrever os rótulos sem falar em dias.

2. **"Entrou" negativo, e "Do trabalho" com conserto e remédio dentro** (precisa de decisão).
   - *O que acontece:* `mes.trabalho` é o delta inteiro (todoMes, gerais, opção,
     carta), e o custo do acidente vira renda que "não entrou". Pior caso: "entrou
     −R$ 2.541 · básico R$ 4.166 · faltou R$ 6.707"; cerca de 10% dos meses-ramo
     têm entrou < 0.
   - *Por que importa:* contradiz a frase da D-044 ("entrou R$ X · o básico
     custa R$ Y · faltou R$ Z").
   - *Opções:* (a) separar os gastos no motor (marca no efeito ou origem
     "gastos") e mostrar "entrou · gastos do mês · básico · faltou"; (b) só na
     tela: "o trabalho deu prejuízo de R$ X" quando entrou < 0.

3. **O empréstimo do mês 3 só custa** (precisa de decisão).
   - *O que acontece:* "Peguei R$ 1.500 no crédito pessoal para pôr as contas em
     dia" cobra −R$ 96 de juros e nunca soma os R$ 1.500, e os 7,43% do cheque
     especial continuam sobre a dívida inteira. Quem tirou fratura ou bloqueio no
     mês 2 perde as horas extras, mas a narrativa ainda diz "rodei até de
     madrugada". E, no último mês, não sobra mês seguinte para a parcela (D-043).
   - *Opções:* (a) tirar "para pôr as contas em dia", deixar claro que o dinheiro
     foi para as horas extras e usar uma narrativa neutra ("tentei rodar até de
     madrugada"); (b) modelar a troca: +1.500 na renda e a parcela nos meses
     seguintes via `decidiu`, com o empréstimo oferecido no mês 1 ou 2; (c) abater
     os juros do cheque especial no mês do empréstimo (regra nova no motor).

4. **`multiplica` na renda também atinge parcela e manutenção** (precisa de decisão).
   - *O que acontece:* hoje é latente (nenhum efeito do config usa `multiplica`
     em renda), mas uma carta "zera a renda" zeraria também a parcela da moto
     (−480) e a manutenção (−261): o acidentado ficaria R$ 741 melhor.
   - *Opções:* (a) custos fixos do trabalho num grupo aplicado depois do
     `multiplica`, como o básico; (b) o validador avisa quando houver `multiplica`
     em renda numa persona com custo fixo no `todoMes`.

5. **Ninguém fecha as contas em nenhum caminho** (precisa de decisão; retoma a pergunta 5 da seção 6).
   - *O que acontece:* na árvore inteira, com as 64 combinações de decisão, a
     chance de terminar com saldo ≥ 0 é 0% nas 5 personas. Melhor caso: Marcos
     −R$ 200, Jonas −R$ 2.128, Kauã −R$ 2.469, Daiane −R$ 3.335, Rose −R$ 6.106.
     O título da página 1 do placar é sempre o mesmo, e a Rose termina, no melhor
     caminho, abaixo do pior caminho das outras.
   - *Por que importa:* o objetivo era dúvida; do jeito que está, é certeza.
   - *Opções:* (a) calibrar para 5% a 15% de chance de fechar em pelo menos 2
     personas (aluguel informal com fonte, piso regional na outra renda, Tarifa
     Social para quem tem direito); (b) registrar numa decisão que "ninguém
     fecha" é a mensagem.

6. **"Escolha ou sorte?" premia o esgotamento, e a Proteção não faz nada** (precisa de decisão; ligada à pergunta 14 da seção 6).
   - *O que acontece:* a ordem das opções pelo saldo esperado é a mesma nas 5
     personas (mês 1 a > c > b > d; mês 2 c > a > d > b; mês 3 a > d > b > c), e o
     plano a-c-a é o melhor em 4 de 5. O placar mede só a renda: 12 h + dois apps
     + madrugada aparece com "as escolhas: +R$", e estudar, o breque e a
     associação aparecem sempre com valor negativo. A energia a 0 não aparece, e
     nenhuma condição do config lê a Proteção.
   - *Opções:* (a) mostrar a energia final e a proteção nas páginas 2 e 3
     ("terminou com energia 0: dormindo 5 h"); (b) dar consequência em dinheiro
     ou em dias à energia 0 e à proteção (a associação encurta o bloqueio e o
     calote; energia 0 força dias parados); (c) tirar a Proteção dos indicadores.
     Em qualquer caso, refazer a checagem de dominância por persona.

7. **O custo real do acidente e do bloqueio não aparece em nenhuma tela** (precisa de decisão).
   - *O que acontece:* a fratura soma −R$ 1.467 (20 dias sem trabalhar), −R$ 1.500
     (conserto) e −R$ 150 (remédio), cada um com rótulo em `aplicar().linhas`, mas
     o telão mostra só o título da carta e "entrou R$ X".
   - *Por que importa:* é o ponto que você chamou de crucial ("o tempo parado
     custa quanto?").
   - *Opções:* (a) no celular, as linhas da carta com rótulo e valor ("20 dias
     sem trabalhar −R$ 1.467 · conserto da moto −R$ 1.500"), e no telão pelo
     menos nas cartas graves; (b) também as linhas dos efeitos gerais com
     `sorteou` na continuação do mês 3; (c) só no celular.

8. **Os valores mais pesados da fratura não têm fonte** (precisa de decisão; completa a pergunta 12 da seção 6).
   - *O que acontece:* conserto da moto R$ 1.500, do carro R$ 2.000, da bicicleta
     R$ 300 e remédio R$ 150 estão sem fonte. "O outro app segurou metade da
     renda" (mês 3) também está sem fonte, e a metade, sem justificativa.
   - *Opções:* (a) fonte de preço de peças e funilaria (como a carta Queda cita a
     AutoPapo); (b) marcar "estimativa sem fonte" e baixar a confiança na seção 2.

9. **A renda da PNAD já é líquida dos gastos: a manutenção pode estar contada duas vezes** (precisa de decisão).
   - *O que acontece:* o IBGE diz que o rendimento dos plataformizados "considera
     as deduções de gastos relacionados à atividade, como combustível". O config
     desconta de novo a manutenção da moto (−R$ 261) e do carro (−R$ 400): R$ 783
     e R$ 1.200 em 3 meses.
   - *Opções:* (a) conferir a nota metodológica (p. 9-10) e, se a manutenção já
     entra, tirar a linha; (b) trocá-la por um choque na carta "Quebrou"; (c)
     manter, dizendo por que não é dupla.

10. **Os contextos do celular não mudam nada, e alguns contradizem o jogo** (precisa de decisão).
    - *O que acontece:* Marcos, mês 3: "rotativo, que cobra 15% ao mês", mas a
      dívida dele paga 7,43%. Jonas, mês 3: "sem garantia no contrato, a lei
      permite despejo em 15 dias", mas a fonte do aluguel diz "mercado formal
      (exige fiador ou análise de crédito)". Tênis, excursão, chuteira, óculos,
      material escolar, despejo e corte de luz nunca são cobrados.
    - *Opções:* (a) alinhar os juros e o fiador, e ligar pelo menos um contexto
      por mês a uma opção ou a um efeito pequeno com fonte; (b) texto de pressão
      sem valor implícito.

11. **A cadeia de setas do "Escolha ou sorte?" mistura variações e totais** (precisa de decisão; a D-041 pede a conta como história).
    - *O que acontece:* "se não mudassem nada: −R$ 4.150 → as escolhas: −R$ 395 →
      a sorte: +R$ 1.614 → terminaram com −R$ 2.931" parece uma sequência de
      saldos, mas o do meio é uma variação, e o primeiro, um valor esperado.
    - *Opções:* (a) manter; (b) colunas alinhadas (sem mudar nada · escolhas ·
      sorte · terminou), com as variações marcadas de outro jeito; (c) trocar "se
      não mudassem nada" por "num mês típico, sem mudar nada".

12. **A história da equipe no telão não usa as narrativas** (precisa de decisão; a D-045 fala nelas).
    - *Opções:* (a) incluir pelo menos a narrativa da carta grave, cabendo em
      1024×768; (b) registrar que o telão fica só com os rótulos (as narrativas
      estão no celular).

13. **Textos das opções que não servem para Daiane e Rose** (precisa de decisão).
    - *O que acontece:* mês 2 a, "aceitei até as corridas ruins"; mês 2 d, "parar
      um dia no breque"; a narrativa da c ("o seguro de um não cobre a corrida do
      outro"); e o texto do mês 1 ("quem fica mais tempo online recebe mais
      pedidos") valem também para quem vende pelo Instagram e para a manicure.
    - *Opções:* (a) rótulos por persona ("aceitei até as encomendas que não
      compensavam", "aceitei os atendimentos longe e baratos"); (b) textos
      neutros.

14. **"piloto automático" ainda aparece no placar final e no resultado do mês** (precisa de decisão; a D-041 tirou o termo do placar).
    - *Opções:* (a) no placar, "ninguém votou: ficou o de sempre", e o resultado
      do mês continua como está; (b) trocar nos dois; (c) tirar.

15. **A linha do tempo esconde os passos depois do mês 3** (precisa de decisão).
    - *O que acontece:* a linha tem só blocos e meses, mas o "a seguir" aponta
      para passos que não estão nela (formação das equipes, placar final,
      termômetro, enquete); no último trecho aparece "a seguir: Fim".
    - *Opções:* (a) incluir o placar final e o termômetro, pelo menos como um
      segmento "jogo: resultado"; (b) o "a seguir" nomeia só trechos da linha.
