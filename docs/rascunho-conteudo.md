# Rascunho do conteúdo do jogo (esquema v2.1)

> **RASCUNHO v2.1 — a validar.** Nada daqui entra no seminário sem a validação do
> Kleberson (D-005). Cada número tem a fonte ao lado. Onde não há dado, está
> escrito **"estimativa sem fonte"**, e a confiança é baixa (como na D-034). O que
> ainda depende de decisão está junto na seção 8.

- **Data:** 29/09/2026.
- **Arquivo do conteúdo:** [`config.json`](../config.json), `versao`
  `2026-09-29-v2.1-rascunho`, hash `42bfc0d8` (2ª rodada da revisão de 29/09). Os textos de `fonte` do config
  resumem as tabelas da seção 2 e nunca aparecem no telão.
- **Esquema:** v2.1 (contratos, seção 1). Por cima do v2 (básico da casa no fim do
  mês, juros sobre a dívida de antes), o mês agora separa:
  - o **trabalho variável** (o único que uma carta pode multiplicar);
  - os **custos fixos** do trabalho (`fixo: true`: parcela da moto, DAS do MEI,
    curso da Daiane, mensalidade da associação, parcela do empréstimo);
  - os **gastos** de um evento (`categoria: "gasto"`: conserto, remédio,
    fisioterapia, celular roubado, multa do aluguel, o que ainda se deve do
    empréstimo), que ficam fora do "entrou".
  - Na tela: "entrou = trabalho − custos fixos + outra renda" e
    "saldo do mês = entrou − gastos − básico − juros".
  - **Piso do trabalho** (`regras.pisoTrabalho`, 2ª rodada): o trabalho variável
    nunca fica abaixo de R$ 0. Os dias parados são descontados a preço cheio, e
    depois do "exausto" (× 0,9) ou do bloqueio (× 0) chegavam a tirar mais renda
    do que havia (trabalho de −R$ 96; "renda perdida R$ 268" de uma renda de
    R$ 179).
- **Como conferir:** `npm run validar`. As contas da seção 5 são de enumeração
  exata (todas as cartas, com as chances de cada estado), feitas com o mesmo motor
  do telão.
- **O que substitui:** o rascunho v2 (29/09).
  - Continuam valendo: D-024 (horas extras do mês 1), D-026 e D-027 (Jonas em duas
    equipes e a ordem das equipes), D-028 (rendas de menor confiança), D-029 (a
    associação perde em saldo no mês 3), D-030 (o corte de 15%), D-031 e D-032
    (afirmações e termômetro curto), D-040 (rótulos curtos), D-043 (4 opções,
    120 s, sem tendência), D-044 a D-046 (básico com fonte, juros de 7,43%).
  - Entram as decisões D-050 a D-057 e as correções de conta de 29/09.

---

## 1. Resumo

1. **Correções de conta** (seção 7, itens 1 a 4, 8 e 9):
   - **A renda da PNAD já é líquida.** A manutenção saiu do mês do Jonas (−R$ 261)
     e do Marcos (−R$ 400). Pelo conceito do IBGE, a "retirada" também já desconta
     "equipamentos e outros investimentos", então a parcela da moto (R$ 480) deixou
     de sair duas vezes: o Jonas passa a ter R$ 2.680 de trabalho variável menos
     R$ 480 de parcela, e o líquido fica nos R$ 2.200 da PNAD (seção 8, item 3).
   - **Nenhum mês passa de 30 dias parado.** Conferido em todos os caminhos: o
     máximo é 30.
   - **O empréstimo entra quando é tomado** (mês 2), e a dívida aparece: a 1ª
     parcela no mês 3 e o saldo devedor contado no placar.
   - **Os valores da fratura têm fonte:** peças da moto, fisioterapia, remédio,
     tala e os 45 dias (diretriz do INSS). Na 2ª rodada, o conserto do carro foi
     corrigido para R$ 1.840 (a fonte citada não trazia a faixa usada).
   - **O trabalho do mês não fica negativo** (2ª rodada): piso em R$ 0. **O
     "entrou" ainda fica**, em caminhos raros da Daiane (até −R$ 406) e da Rose
     (até −R$ 269): num mês parado, a parcela do curso, a do empréstimo e o DAS
     continuam saindo (seção 8, item 11).
2. **Quanto falta num mês comum** (sem carta, sem decisão): Marcos −R$ 373, Jonas
   −R$ 467, Kauã −R$ 1.017, Daiane −R$ 1.396, Rose −R$ 2.412.
3. **D-050, "quase ninguém" fecha:**
   - no piloto automático, **ninguém** fecha, em nenhum caso;
   - **Jonas e Marcos têm um caminho estreito** que fecha: o melhor termina com
     +R$ 325 (Jonas) e +R$ 685 (Marcos). Jogando o melhor plano, o Marcos fecha em
     5,2% das partidas, e o Jonas em 0,5%;
   - **Kauã, Daiane e Rose não fecham em nenhum caminho.** O melhor fica em −R$ 2.722,
     −R$ 3.995 e −R$ 6.716. Fechar para eles depende de mudar a renda da casa, e isso
     é decisão sua (seção 8, item 1).
4. **D-051, energia e proteção:**
   - **energia baixa custa:** abaixo de 3, o mês seguinte rende 10% menos; abaixo de
     6, de 4 e de 2, a chance de queda e de fratura sobe 1,3, 1,9 e 4,3 vezes (pouco
     sono, AAA Foundation); abaixo de 4, a doença fica mais provável;
   - **a proteção tem efeito real:** com o MEI, a fratura do mês 2 rende R$ 2.431 do
     INSS no mês 3 (metade das vezes a perícia nega); a associação traz a conta
     bloqueada de volta no 21º dia;
   - **a melhor opção muda com a persona** em todos os meses (seção 5.2), e a opção
     de maior renda no mês cai em letras diferentes: A, D e C. Ressalva da 2ª
     rodada: o D do mês 2 é o empréstimo, cujos R$ 1.500 contam como "renda"; sem
     ele, a maior renda do mês 2 é o C, e o esforço fica em A, C e C (seção 8,
     item 14).
5. **D-052:** toda carta de parada tem `diasParado` (3, 5, 7, 10, 15 ou 20).
6. **D-053:** os contextos foram reescritos, e o aluguel atrasado virou efeito: quem
   termina um mês no vermelho paga 10% de multa do aluguel no mês seguinte.
7. **D-054:** a mesma escolha dita do jeito de cada ofício, em 8 opções (Daiane,
   Rose, Marcos e Kauã).
8. **D-056:** a referência "com carteira assinada" continua em −R$ 2.957, com a
   mesma casa e os mesmos juros, **a validar** (seção 8, item 2).
9. **D-057:** o breque continua no mês 2, e a narrativa da Daiane, do Marcos e da
   Rose diz que o reajuste é só de entregador.
10. **Validador:** 0 erros; nenhuma opção dominante; o padrão nunca é a de maior
    saldo esperado. Os 11 avisos que sobram estão explicados na seção 5.4.
11. **Na tela (2ª rodada):** o que vem do mês anterior aparece nomeado no
    resultado, na história e no celular ("+25 dias da fratura −R$ 2.233 · INSS
    (45 dias) +R$ 2.431"); os gastos saem por origem ("gastos R$ 1.650 + multa
    R$ 130"); no mês 3 depois de fratura ou bloqueio, a carta "Um mês como os
    outros" dá lugar a "O mês passado ainda pesa", com as mesmas chances.

### O que mudou nas opções

- **Mês 2:** entrou "Pegar R$ 1.500 emprestado" e **saiu "Recusar o que não paga"**
  (seção 8, item 4). O mês 3 ficou com "Rodar até de madrugada" sem empréstimo.
- **As letras foram reordenadas** (D-051): o padrão fica em C, A e D, e a opção de
  maior renda no mês, em A, D e C.
- **"Não parar nenhum dia"** passou a valer as 4 folgas do mês (eram 2).
- **"Trabalhar menos"** custa as horas mais fracas: 53% do ganho-hora médio, a
  mesma conta das horas a mais da D-024.

### O que a pesquisa nova corrigiu

1. **"O app não paga nenhum", na fratura, estava errado.** O iFood paga diária de 7
   a 30 dias (mínimo R$ 50, teto R$ 3.000), se o acidente foi na entrega; a 99 paga
   até 15 diárias de R$ 80. O texto da carta foi corrigido. O dinheiro do seguro
   **não entrou** na conta (seção 8, item 5).
2. **Os dias da fratura** agora vêm da diretriz do INSS: 45 dias para consolidar o
   punho e 90 para a recuperação total.
3. **Despejo:** os 15 dias começam depois da liminar do juiz, e só sem garantia no
   contrato. O contexto do Jonas deixou de dizer "a lei permite despejo em 15 dias".
4. **Tarifa social do DMAE:** só Bolsa Família ou conjunto habitacional. Nenhuma
   persona tem direito.
5. **Mensalidade da associação:** passou a ter fonte (R$ 29,90 em Minas; R$ 15,90 na
   Bahia).
6. **Estudo da UFBA:** as prevalências (49,1% com mais de 10 h por dia) são brutas; no
   modelo ajustado, a jornada não foi significativa. Dá para dizer "acontece mais",
   e não "causa".

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
| 2 | DAS-MEI 2026: **R$ 86,05** (serviços) e **R$ 82,05** (comércio e indústria) | Receita Federal, Simples Nacional. https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3 ; https://blog.nubank.com.br/valor-das-mei/ | 5% de 1.621 = 81,05; + R$ 5 de ISS ou + R$ 1 de ICMS. No config: 86 e 82, como custo fixo | Alta |
| 3 | INSS por incapacidade: **só acima de 15 dias** (art. 59); o autônomo recebe **desde o 1º dia** se pedir em 30 dias (art. 60); acidente dispensa carência (art. 26 II); só vale o DAS pago em dia antes (art. 27 II); doença comum exige 12 contribuições (art. 25 I); **o MEI não tem auxílio-acidente** se ficar sequela (art. 18 §1º) | Lei 8.213/1991. https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm | 1 salário mínimo ÷ 30 = **R$ 54,03 por dia** | Alta |
| 4 | Decisão do INSS: **34 dias** em média (ago/2026); do agendamento à perícia, 30 dias no país; sem número do RS | Agência Brasil / Brasil de Fato, 03/09/2026. https://www.brasildefato.com.br/2026/09/03/fila-de-espera-por-pericia-do-inss-e-zerada-em-agosto/ | O dinheiro de um acidente chega no mês seguinte | Alta |
| 5 | **53%** das decisões de benefício por incapacidade foram negativas no 1º semestre de 2026 | Previdenciarista, 09/09/2026, leitura do BEPS de jul/2026. https://previdenciarista.com/blog/inss-nega-51-dos-pedidos-no-1o-semestre-de-2026/ | No jogo: ~50% (carta "INSS negou") | Média |
| 6 | Cesta básica de Porto Alegre, ago/2026: **R$ 839,34** por adulto | DIEESE/Conab, 10/09/2026. https://www.dieese.org.br/analisecestabasica/2026/202608cestabasica.pdf | É o último mês publicado; a de setembro sai perto de 08/10 | Alta |
| 7 | Criança conta **meia cesta**; a regra do DIEESE é 2 adultos e 2 crianças = 3 cestas | DIEESE, metodologia. https://www.dieese.org.br/metodologia/metodologiaCestaBasica/12.html | Para 2, 3 e 5 pessoas, extrapolei. **Quem tem 12 anos ou mais conta inteira** (escolha nossa: a filha de 15 da Rose) | Alta (a regra); média (a extrapolação) |
| 8 | IPCA, número-índice: jun/2019 = 5.214,27; dez/2018 = 5.100,61; ago/2026 = 7.633,23 | IBGE, SIDRA, tabela 1737. https://sidra.ibge.gov.br/tabela/1737 | Fatores de correção de 1,4639 e de 1,4965 | Alta |
| 9 | **A renda da PNAD é a "retirada":** receita menos as despesas do empreendimento, inclusive "equipamentos e outros investimentos"; não desconta as perdas ocasionais | IBGE, *PNAD Contínua: Notas técnicas* v1.5 (2018), p. 35-36. https://biblioteca.ibge.gov.br/visualizacao/livros/liv101548_notas_tecnicas.pdf ; IBGE, nota técnica de 29/11/2017, p. 3; IBGE via Agência Brasil, 04/09/2026 ("o cálculo desconta, por exemplo, o gasto com combustível") | Manutenção fora do mês; parcela somada à renda e tirada como custo fixo; conserto grande continua na carta "Quebrou" (é perda ocasional) | Alta (o conceito); média (quem declara pode não descontar a parcela) |

### 2.2 Básico da casa, item por item (Porto Alegre)

Sem mudança desde o rascunho v2.

| # | Item | Valor usado | Fonte | Derivação | Confiança |
|---|---|---|---|---|---|
| 10 | Comida | cesta × adultos-equivalentes: 1,5 = **R$ 1.259**; 2,5 = **R$ 2.098**; 3 = **R$ 2.518** | itens 6 e 7 | 839,34 × fator, arredondado | Alta |
| 11 | Aluguel de 2 quartos | **R$ 1.300** (Jonas, Marcos, Rose) | QuintoAndar, lido em 29/09/2026: 2 dormitórios com condomínio e taxas, Rubem Berta R$ 1.123–1.411, Sarandi R$ 1.192–1.525. https://www.quintoandar.com.br/alugar/imovel/rubem-berta-porto-alegre-rs-brasil | Meio da faixa. É mercado formal (exige fiador ou análise de crédito). FipeZAP ago/2026: Porto Alegre +11,04% em 12 meses | Média-baixa |
| 12 | Aluguel de casa pequena | **R$ 1.020** (Kauã) | QuintoAndar, 29/09/2026: média do Chapéu do Sol/Restinga, todos os tipos de imóvel | Direto | Média-baixa |
| 13 | Aluguel de 1 quarto | **R$ 1.000** (Daiane) | QuintoAndar, 29/09/2026: 1 dormitório com taxas, R$ 1.012–1.194 (Rubem Berta, Sarandi) | Abaixo da faixa (periferia) | Média-baixa |
| 14 | Luz | 120 kWh = **R$ 130**; 150 = **R$ 162**; 180 = **R$ 194** | CEEE Equatorial, tarifa B1: R$ 0,822/kWh sem tributos (ANEEL 3.547/2025); com ICMS e PIS/Cofins ≈ R$ 1,08/kWh | kWh × 1,08. O consumo é estimativa (a média do Sul é 208 kWh, EPE 2025) | Média-baixa |
| 15 | Água e esgoto | 8 m³ = **R$ 79**; 12 = **R$ 119**; 16 = **R$ 158** | DMAE: R$ 5,50/m³ (Decreto 23.639/2026). https://prefeitura.poa.br/dmae/entenda-conta | 5,50 × m³ × 1,8. 4 m³ por pessoa: estimativa. A tarifa social do DMAE é só para Bolsa Família e conjunto habitacional: nenhuma persona entra | Média-baixa |
| 16 | Gás de cozinha | 0,6 botijão = **R$ 71**; 0,75 = **R$ 89**; 1 = **R$ 119** | ANP, 20 a 26/09/2026, botijão de 13 kg em Porto Alegre, R$ 119,00 (15 revendas) | Botijões por mês: estimativa | Alta (o preço) |
| 17 | Ônibus | 20 passagens = **R$ 106**; 30 = **R$ 159**; 44 = **R$ 233** | Prefeitura de Porto Alegre: R$ 5,30 desde 19/02/2026 | Passagens por mês: estimativa | Alta (a tarifa) |
| 18 | Celular e internet | **R$ 50** (2 pessoas), **R$ 75** (3), **R$ 100** (4) | Pré-pago R$ 20–30 por 30 dias; internet fixa ≈ R$ 92 (Anatel, via Telesíntese, 03/07/2026) | Estimativa | Baixa |
| 19 | Remédios | **R$ 60 / 90 / 120** | IBGE, POF 2017-2018: famílias com até 2 salários mínimos gastam 4,2% com remédio. Farmácia Popular: 41 itens grátis, **sem** analgésico, anti-inflamatório e antibiótico | Estimativa | Baixa-média |

**Ficaram de fora:** higiene e limpeza (não achei fonte), roupa, escola, lazer e
previdência. O básico é o mínimo, não o necessário. A régua do DIEESE com a cesta de
Porto Alegre ("salário mínimo necessário") daria **R$ 7.051,30** para a família de 4.
Esse número vai para um slide.

### 2.3 Renda e custos do trabalho (o `todoMes`)

| # | Persona | Valor | Fonte | Derivação | Confiança |
|---|---|---|---|---|---|
| 20 | Jonas, entregas | **+R$ 2.680** de trabalho variável | IBGE, PNAD 2025 (publ. set/2026), p. 10: motociclistas de app, R$ 2.221/mês, 44,9 h/semana, já sem a gasolina. https://biblioteca.ibge.gov.br/visualizacao/livros/liv102309_informativo.pdf | 2.200 + a parcela de 480, que a retirada da PNAD já desconta (item 9). O dia do Jonas vale 2.680 ÷ 30 = **R$ 89,33** | Alta (média nacional); média (a parcela dentro da retirada) |
| 21 | Jonas, parcela da moto | **−R$ 480**, custo fixo | Tabela Fipe set/2026, CG 160 Start 2026, R$ 18.598; BCB, SGS 25471, 1,97% a.m. | 80% financiado em 48x = R$ 482. Custo fixo: nenhuma carta a multiplica, e ela vence parado ou não | Média |
| — | ~~Jonas, manutenção da moto −R$ 261~~ | **saiu** | — | Já descontada na retirada da PNAD (item 9) | — |
| 22 | Kauã, entregas | **+R$ 1.370** | Aliança Bike (2019, São Paulo): R$ 936/mês | 936 × 1,4639 (D-028). O dia vale R$ 45,67 | Média-baixa |
| 23 | Daiane, vendas | **+R$ 1.500** | GEM Brasil 2018, em Carmo et al., Cad. EBAPE.BR, 2021, p. 19 | R$ 1.000 × 1,4965. **É faturamento, bruto**, tratado como renda (D-028): o problema contrário ao da PNAD | Baixa |
| 24 | Daiane, curso de marketing | **−R$ 141**, custo fixo | CartaCapital, 07/11/2024 | O mais barato em 12x sem juros. O parcelamento é hipótese | Baixa |
| 25 | Marcos, corridas | **+R$ 2.870** | PNAD 2025, p. 9: motoristas de app, R$ 2.873/mês, 45,9 h/semana, já sem o combustível | Arredondado. O dia vale R$ 95,67 | Alta (média nacional) |
| — | ~~Marcos, manutenção do carro −R$ 400~~ | **saiu** | — | Já descontada na retirada da PNAD (item 9) | — |
| 26 | Rose, atendimentos | **+R$ 2.100** | CAGED ago/2025–jul/2026: manicure com carteira, R$ 1.802; Abílio (2021) | 1.802 × 1,15, já sem comissão, material e ônibus (D-028) | Baixa |
| 27 | Exausto: **−10% da renda variável** no mês que começa com energia abaixo de 3 | todas | Estimativa sem fonte direta. Indício: acima de ~50 h por semana a produção por hora cai, e acima de 60 h o ganho fica quase nulo (Pencavel, *Economic Journal*, 2015) | `multiplica` 0,9 logo depois da renda-base; não atinge a parcela | Baixa |

### 2.4 Outra renda da casa e benefícios

| # | Valor | Fonte | Onde entra | Confiança |
|---|---|---|---|---|
| 28 | Salário mínimo líquido: **R$ 1.499** | item 1 | A companheira do Jonas, a mãe do Kauã e a esposa do Marcos | Alta (o valor); a ocupação é escolha nossa |
| 29 | Bolsa Família: entra quem tem até **R$ 218 por pessoa** | MDS, set/2026 | **Nenhuma família entra** | Alta |
| 30 | Tarifa Social de luz (80 kWh grátis) e Gás do Povo (4 botijões por ano para 2 ou 3 pessoas): até **meio salário mínimo por pessoa**, com CadÚnico | Senado, 09/10/2025; Câmara, 02/02/2026 | **Daiane e Rose teriam direito.** No config, **não entram** (seção 8, item 1): baixariam o básico em ~R$ 126 (Daiane) e ~R$ 125 (Rose) | Alta-média |

### 2.5 Juros e empréstimo

| Modalidade (Banco Central, ago/2026) | Ao mês | Série | Onde entra |
|---|---|---|---|
| **Cheque especial** | **7,43%** | 25463 | A dívida que rola de um mês para o outro (`regras.jurosDividaMes`). Teto legal de 8% ao mês |
| **Crédito pessoal não consignado** | **6,39%** (110,22% ao ano) | 25464 | O empréstimo do mês 2: R$ 1.500 em 12 × **R$ 182,76** (Price, sem IOF) |
| **99Pay SCFI** (semana de 09 a 15/09/2026) | **9,36%** | taxas por instituição | O empréstimo do Marcos, pelo app da 99: 12 × **R$ 213,29** |
| Cartão, rotativo | 15,18% | 25477 | Não entra. Saiu do contexto do Marcos, que contradizia os 7,43% |
| Agiota | ~30% | Terra, 06/05/2025 | Slide |

- **Como o empréstimo entra** (seção 7, item 3): +R$ 1.500 no mês 2; no mês 3, a 1ª
  parcela (custo fixo) e o **saldo devedor**, contado como gasto:
  1.500 × 1,0639 − 182,76 = **R$ 1.413,09** (99Pay: R$ 1.427,11).
- **Por que o saldo devedor conta:** o saldo acumulado é a posição da família, e o
  cheque especial já conta como dívida. Sem isso, o empréstimo apareceria no placar
  como dinheiro de graça (+R$ 1.317 no jogo) e seria a melhor opção de todos.
- **O que sobra, no jogo:** o empréstimo custa os juros de um mês (R$ 96) e poupa os
  7,43% do cheque especial sobre R$ 1.500 (R$ 111). Quem fica no azul com ele escapa
  da multa do aluguel no mês 3. É quase neutro, como é na vida: não fecha a conta,
  empurra.
- As séries saem de `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{série}/dados/ultimos/3?formato=json`.

### 2.6 Aluguel atrasado (D-053)

| Valor | Fonte | Como entra | Confiança |
|---|---|---|---|
| Multa de **10%** do aluguel: Jonas, Marcos e Rose −R$ 130; Kauã −R$ 102; Daiane −R$ 100 | Procon-SP (jul/2019) e Exame (05/11/2024): a Lei do Inquilinato não fixa a multa, vale o contrato; o costume é 10% + 1% ao mês | Gasto nos meses 2 e 3, **quando o saldo acumulado está negativo** no começo do mês (é o que o config faz: `indicador.renda.abaixoDe 0`, e não o saldo do mês anterior). Só a multa: os juros já estão nos 7,43% da dívida. O rótulo, que aparece na tela, é "multa" (era "o mês passado fechou no vermelho…", que nem sempre era verdade). Qual das duas regras vale é a seção 8, item 12 | Alta (a regra); média (os 10%) |
| Despejo: liminar para sair em 15 dias **só sem garantia**, com ação e caução de 3 aluguéis; o inquilino evita pagando em até 15 dias depois de citado | Lei 8.245/1991, art. 59 §1º IX e art. 62 II | Só no texto do contexto; não é efeito | Alta |

Luz e água atrasadas custam pouco em dinheiro (multa de 2% + 1% ao mês: R$ 4,86 e
R$ 3,57) e não entraram. O peso delas é o corte, que o jogo não modela.

### 2.7 Energia, sono e acidente (D-051)

| Energia no começo do mês | Queda e fratura (quem está na rua) | Doença | Renda variável | Fonte |
|---|---|---|---|---|
| 6 ou mais | × 1 | — | — | — |
| abaixo de 6 | × 1,3 | — | — | AAA Foundation (Tefft, 2016, dados da NHTSA): 6 a 7 h de sono = 1,3 vez o risco de acidente |
| abaixo de 4 | × 1,9 | peso +8 | — | 5 a 6 h de sono = 1,9 vez |
| abaixo de 3 | × 1,9 | peso +8 | **−10%** | item 27 |
| abaixo de 2 | × 4,3 | peso +16 | −10% | 4 a 5 h de sono = 4,3 vezes |

- **"Rodar até de madrugada" multiplica por 4,3** a queda e a fratura no mês (4 a 5 h
  de sono). A energia é mecânica de jogo; o mapeamento para horas de sono é nosso.
  https://aaafoundation.org/acute-sleep-deprivation-risk-motor-vehicle-crash-involvement/
- **Energia inicial** (sem fonte): Jonas 7, Kauã 8 (−1 por mês, porque pedalar 11
  horas cansa; não cai no mês em que ele pedala menos), Daiane, Marcos e Rose 6.
- **A jornada de sempre cansa:** −2 por mês (era −1). 12 horas: −3. Aceitar tudo: −2.
  Dois apps, madrugada, não parar: −3. Trabalhar menos: +2. Breque e associação: +1.
- A energia chega a 0 em 40% das partidas (era 32%).

### 2.8 Decisões

| # | Valor | Onde | Fonte | Confiança |
|---|---|---|---|---|
| 31 | 12 horas, 7 dias: Jonas **+520**, Kauã **+105**, Daiane **+350**, Marcos **+650**, Rose **+490**; energia −3; semana boa +6, quebra +3, queda +2, assalto +2 | Mês 1, A | D-024 (pacote B). UFBA (Siqueira et al., *Cad. Saúde Pública* 41(3), 2025): acidente em 1 ano 49,1% com mais de 10 h por dia contra 39,9% até 8 h; no modelo ajustado, a jornada não foi significativa | Baixa (o fator) |
| 32 | MEI: **−86** (−82 Daiane) nos 3 meses, custo fixo; proteção +3 | Mês 1, B | itens 2 e 3 | Alta |
| 33 | Trabalhar menos: as horas mais fracas de um dia por semana, **53%** de 5 dias (Jonas −237, Kauã −121, Daiane −133, Marcos −253, Rose −186); energia +2; queda × 0,6 | Mês 1, D | A mesma conta da D-024, ao contrário: as horas que saem são as que rendem menos. Abílio (2021), p. 950 | Estimativa |
| 34 | Corte do mês 2: **−15% da renda-base** (Jonas −402, Kauã −206, Daiane −225, Marcos −431, Rose −315) | Mês 2, efeito geral | D-030. iFood: R$ 3,00 pela 2ª entrega agrupada, e não R$ 7,50 (jun/2025) | Baixa (ilustrativo) |
| 35 | Aceitar tudo: **+10%** (Daiane **+60**, ~4%, porque a encomenda sem margem quase não sobra); energia −2; bloqueio × 0,4; quebra +3, queda +2, fratura +2 | Mês 2, A | iFood (31/08/2026): o "Mais Entregas" exige 90% do tempo disponível e no máximo 2 recusas | Baixa (os percentuais) |
| 36 | Breque: **−1 dia** (Jonas −89, Kauã −46, Daiane −50, Marcos −96, Rose −70); energia +1, proteção +1; reajuste do mês 3 mais provável (só Jonas e Kauã) | Mês 2, B | Breque de 31/03/2025; o iFood subiu o mínimo de R$ 6,50 para R$ 7,50 em 01/06/2025, só para entregadores | Média |
| 37 | Dois apps: **+20%**; energia −3; bloqueio +4, e o outro app segura metade; quebra +3, queda +2, fratura +2, semana boa +3. **Daiane:** app de delivery, +R$ 300 de vendas, −R$ 157 de comissão (26,2%) e, sem o MEI do mês 1, o DAS nos meses 2 e 3, porque o iFood exige CNPJ | Mês 2, C | PNAD 2025: 37,5% usam 2 ou mais apps. iFood, Portal do Parceiro: Plano Entrega 23% + 3,2% de pagamento; loja exige CNPJ com CNAE de alimentação, e o MEI serve. https://blog-parceiros.ifood.com.br/taxas-ifood/ ; https://blog-parceiros.ifood.com.br/mei-restaurante/ . A margem de 50% (R$ 600 de pedidos para R$ 300 líquidos) e a "metade" são estimativa | Alta (a comissão e o CNPJ); baixa (o +20% e a metade) |
| 38 | Empréstimo: **+R$ 1.500** no mês 2; no mês 3, **−R$ 183** de parcela (Marcos −213) e **−R$ 1.413** de saldo devedor (Marcos −1.427) | Mês 2, D | seção 2.5 | Alta |
| 39 | Associação: **−1 dia** (não conta quem já está parado) e **−R$ 30** de mensalidade (custo fixo); energia +1, proteção +2; bloqueio do mês 2: liminar, a conta volta no 21º dia (**+9 dias**; com dois apps, metade) | Mês 3, A | Mensalidade: R$ 29,90 (Asmopli-MG), R$ 15,90 (Sincaap-BA); não achei a de Porto Alegre. CUT, 23/07/2026: Simtrapli-RS e advogado, liminar em ~36 dias | Média (o prazo); média (a mensalidade, de outro estado) |
| 40 | Madrugada: **+20%** (zero se machucado ou bloqueado); energia −3; queda e fratura × 4,3; assalto +3, quebra +3 | Mês 3, B | seção 2.7 | Baixa (o +20%); média (o fator de risco) |
| 41 | Não parar nem machucado: **as 4 folgas do mês** (Jonas +357, Kauã +183, Daiane +200, Marcos +383, Rose +280); energia −3; queda e fratura +2; doença só 3 dias; fratura do mês 2: **+15 dias**, e só aqui a recaída pode sair | Mês 3, C | Cebrap/Amobitec (2025), p. 71: parte dos acidentados voltou antes de se recuperar | Estimativa |
| 42 | Apertar o cinto: ~4% da comida (Jonas e Kauã +84, Daiane +50, Marcos e Rose +101); energia −1; doença +4 | Mês 3, D | Ação da Cidadania/UFRJ (2024): 32% dos entregadores em insegurança alimentar | Estimativa |

### 2.9 Cartas

Um dia vale: Jonas R$ 89,33, Kauã R$ 45,67, Daiane R$ 50, Marcos R$ 95,67 e Rose
R$ 70. Os consertos, remédios e o celular são **gastos** (fora do "entrou").

| # | Carta (dias parado) | Renda perdida · gastos | Fonte | Confiança |
|---|---|---|---|---|
| 43 | Uma semana boa | +10% da renda-base; energia −1 | Abílio (2021), p. 941 e 944 | Ilustrativo |
| 44 | Temporal | Jonas +150, Kauã +110, Marcos +150 (promoção e dinâmica); Daiane −100; Rose −161 | INMET, via O Tempo (27/09/2026); Metrópoles (01/08/2025) | Média (o fato); estimativa (os valores) |
| 45 | Quebrou (3) | 3 dias (Jonas −268, Kauã −137, Daiane −150, Marcos −287, Rose −210) · conserto da moto −522, da bicicleta −200, tela −400, suspensão e freio −1.230, autoclave −350 | Cebrap/Amobitec (2025): conserto grande = 2 meses de manutenção (moto R$ 261, carro R$ 615). A manutenção do dia a dia já está na PNAD; o conserto grande é perda ocasional, que a PNAD não desconta (item 9). Autoclave: Portaria SES-RS 500/2010 | Média (moto, carro); estimativa (bicicleta, tela, autoclave) |
| 46 | Doença (7) | 7 dias (Jonas −625, Kauã −320, Daiane −350, Marcos −670, Rose −490) · remédio −60; com "não parar", só 3 dias | Lei 8.213, arts. 25 I e 59; Farmácia Popular sem antibiótico | Alta (a regra); estimativa (o remédio) |
| 47 | Queda leve (5), Jonas, Kauã, Marcos | 5 dias (−447, −228, −478) · retrovisor, manete e guidão −594; bicicleta −150; funilaria −800 | Cebrap/Amobitec (2025); AutoPapo (04/03/2026): retrovisor 112,82 + manete 43,58 + guidão 437,11 = R$ 593,51. Seguro do iFood só a partir de 7 dias; INSS só acima de 15 | Média; estimativa (bicicleta e funilaria) |
| 48 | **Fratura (20)**, grave, meses 2 e 3 | 20 dias (Jonas −1.787, Kauã −913, Daiane −1.000, Marcos −1.913, Rose −1.400) · conserto da moto −1.500, da bicicleta −300, do carro −1.840; remédio, tala e ônibus −150. **Mais 25 dias no mês seguinte** (Jonas −2.233) | Dias: INSS, *Diretrizes de apoio à decisão médico-pericial em Ortopedia e Traumatologia* (consulta pública, abr/2008), p. 130–134: rádio distal, 45 dias para consolidar e 90 para recuperar. Moto: 7 peças originais da CG 160 = R$ 1.345,87 (AutoPapo) + ~R$ 150 de mão de obra. Carro: troca e pintura de para-choque R$ 1.020–1.840 em carro popular (Autocidade, "Quanto custa funilaria e pintura 2026", atualizada em 13/06/2026; https://autocidade.com/guia/quanto-custa-funilaria): usado o teto, **R$ 1.840** (era R$ 2.000, atribuído à Revista Oeste, que diz R$ 350–850 só para pintar o para-choque). Bicicleta: roda completa a partir de R$ 280 (Revista Oeste, 19/02/2026). Remédio: dipirona e ibuprofeno na Panvel, órtese de R$ 48,90 a R$ 134,99 (São João), 4 passagens: R$ 151 | Média-alta (os dias); média (moto); baixa (carro, bicicleta) |
| 49 | Auxílio do INSS da fratura (efeito do mês 3, só com o MEI) | **+R$ 2.431** (45 × 54,03); voltando antes da alta, **+R$ 1.621** (30 dias) | itens 3 e 4 | Alta |
| 50 | **INSS negou**, grave, só depois de fratura com MEI | −2.431 (ou −1.621) | item 5; peso 64 (+64 com "não parar"), que dá de 44% a 50% nesse ramo | Média |
| 51 | **Recaída (10)**, grave, só para quem voltou antes da alta | 10 dias (Jonas −893) · fisioterapia −600 (4 sessões de R$ 150) | Doctoralia, lista de fisioterapeutas de Porto Alegre lida em 29/09/2026 (1ª página): consulta presencial de R$ 120 a R$ 320; o tratamento inteiro tem de 10 a 12 sessões (Barbosa et al., *Acta Ortop. Bras.*, 2009). Fila do SUS no RS: 610.242 na fila regulada, sem tempo divulgado (Agora RS, 17/09/2026) | Baixa |
| 52 | **Bloqueio (15)**, grave, meses 2 e 3 | 15 dias (Jonas −1.340); com dois apps, metade volta. Se foi no mês 2: **o mês 3 inteiro** (`multiplica` 0), menos a liminar da associação e a metade do outro app | Abílio (2021); 99: menos de 70% = 5, 10 e 15 dias fora; CUT (23/07/2026); TJDFT (16/01/2026): 16 semanas; GigU (fintech do setor): 15,5% relatam bloqueio sem explicação | Média (os prazos); baixa (a chance) |
| 53 | **Assalto (3)**, grave, menos Daiane | 3 dias (Jonas −268) · celular −1.000 | Cebrap/Amobitec (2025): 7% dos entregadores e 6% dos motoristas assaltados em 3 meses; 93,4% sem seguro do celular | Média (a chance); estimativa (o celular) |
| 54 | Trabalhei e não recebi | Jonas −120, Kauã −80, Daiane −180, Marcos −150, Rose −175 | NailNow, 99, guias de Pix falso | Baixa (os valores) |
| 55 | O app apertou a taxa (meses 1 e 3; Jonas, Kauã, Daiane) | Jonas −180, Kauã −135, Daiane −150 | iFood (jun/2025); Meta +12,15%; chocolate +24,77% | Alta (as regras); estimativa (as quantidades) |
| 56 | A mobilização arrancou um reajuste (mês 3; Jonas e Kauã) | Jonas +150, Kauã +75 | Brasil de Fato, 29/04/2025 | Baixa (as 150 entregas) |

### 2.10 Referência "Jonas com carteira assinada" (D-056, a validar)

A conta é a do rascunho v2, mantida como a D-056 pede: a mesma casa e os mesmos
juros do Jonas de app.

- **Salário-base médio de motoboy:** R$ 1.763,45 (CAGED ago/2025–jul/2026). Mais 30%
  de periculosidade (Lei 12.997/2014): bruto R$ 2.292,49. Menos INSS de R$ 182,00; IR
  isento. Líquido: **R$ 2.110,48 por mês**.
- **A mesma casa:** + R$ 1.499 da companheira − R$ 4.166 do básico − R$ 480 da parcela
  − R$ 261 da manutenção = **−R$ 1.297,52 por mês**. Com carteira, a manutenção sai
  mesmo do salário: não há retirada líquida.
- **Com os mesmos juros de 7,43%:** −R$ 1.297,52 → −R$ 2.691,04 → −R$ 4.188,56. Mais
  13º e férias proporcionais (R$ 1.231,11): **−R$ 2.957 no config**.
- **Ficam de fora, a favor da carteira:** o FGTS (R$ 657), o aluguel de moto que
  muitas convenções pagam e o INSS desde o primeiro dia.
- **Ficou de fora, contra:** a multa do aluguel atrasado (D-053), que o Jonas de app
  paga.
- **Comparação, que mudou com as correções de conta:** o Jonas de app termina com
  **−R$ 3.388** no piloto automático (mediana −R$ 2.808). A referência com carteira
  (−R$ 2.957) fica **acima do valor esperado do app, mas abaixo da mediana**. Ver a
  seção 8, item 2.

### 2.11 Para os slides (não entram no config)

- **DIEESE:** salário mínimo necessário de R$ 7.565,86; com a cesta de Porto Alegre,
  R$ 7.051,30.
- **PNAD 2025:** 84,4% homens; 44,7 h por semana; 72,1% informais.
- **DetranRS:** 122 motociclistas morreram no 1º trimestre de 2026 (+8%).
- **SINAN:** 8.630 notificações de acidente de trabalho em 2023, 10.034 em 2024 e
  11.662 em 2025.
- **Seguro dos apps:** iFood, diária de 7 a 30 dias (mínimo R$ 50, teto R$ 3.000), só
  na rota; 99, até 15 diárias de R$ 80 com 30 corridas no mês anterior; Uber, só o
  Renda Protegida, que é pago (R$ 0,017 por km). A seguradora tem 30 dias para decidir
  e 30 para pagar (Lei 15.040/2024, arts. 86 e 87).
- **UFBA:** 56,1% dos acidentados pararam; só 20% dos que pararam 15 dias ou mais
  receberam do INSS; 38,3% viveram de ajuda da família.
- **OMS/OIT (2021):** 55 h ou mais por semana: +35% de risco de AVC e +17% de morte por
  cardiopatia isquêmica. O efeito aparece em anos, e não entra no jogo.
- **Enchente de 2024:** o iFood pagou R$ 1.500 a quem estava inscrito em assistência
  social, depois de mediação do MPT.

---

## 3. Famílias, básico e outra renda

| Equipe | Persona | Em casa | Básico da casa | Outra renda | Do trabalho (entrou sem a outra renda) | Falta num mês comum |
|---|---|---|---|---|---|---|
| e1, e2 | **Jonas**, motoboy do iFood, 34, moto financiada, Sarandi | Jonas, a companheira (caixa, um salário mínimo) e a filha de 6. 3 pessoas | **R$ 4.166** | R$ 1.499 | 2.680 − 480 = **R$ 2.200** (era 1.459) | **−R$ 467** (era −1.208) |
| e3 | **Daiane**, doces e marmitas pelo Instagram, 29 | Daiane e o filho de 4; o pai não paga pensão. 2 pessoas | **R$ 2.755** | — | 1.500 − 141 = **R$ 1.359** | **−R$ 1.396** |
| e4 | **Marcos**, motorista da 99, 41, carro de 2014 | Marcos, a esposa (auxiliar de cozinha, um salário mínimo) e os filhos de 10 e 7. 4 pessoas | **R$ 4.742** | R$ 1.499 | **R$ 2.870** (era 2.470) | **−R$ 373** (era −773) |
| e5 | **Kauã**, bike pelo iFood, 20, quer faculdade, Restinga | Kauã, a mãe (auxiliar de limpeza, um salário mínimo) e a irmã de 9. 3 pessoas | **R$ 3.886** | R$ 1.499 | **R$ 1.370** | **−R$ 1.017** |
| e6 | **Rose**, manicure por app, 47, atende de ônibus | Rose sustenta sozinha: a filha de 15 estuda, e o filho de 23 procura emprego. 3 pessoas | **R$ 4.512** | — | **R$ 2.100** | **−R$ 2.412** |

O básico item por item não mudou:

| Item | Jonas | Kauã | Daiane | Marcos | Rose |
|---|---|---|---|---|---|
| Comida (cesta × adultos) | 2.098 (× 2,5) | 2.098 (× 2,5) | 1.259 (× 1,5) | 2.518 (× 3) | 2.518 (× 3) |
| Aluguel | 1.300 | 1.020 | 1.000 | 1.300 | 1.300 |
| Luz | 162 | 162 | 130 | 194 | 162 |
| Água e esgoto | 119 | 119 | 79 | 158 | 119 |
| Gás | 89 | 89 | 71 | 119 | 89 |
| Ônibus | 233 | 233 | 106 | 233 | 159 |
| Celular e internet | 75 | 75 | 50 | 100 | 75 |
| Remédios | 90 | 90 | 60 | 120 | 90 |
| **Total** | **4.166** | **3.886** | **2.755** | **4.742** | **4.512** |

---

## 4. Opções, contextos e cartas

O contexto de cada persona aparece no celular durante a decisão e tem até 160
caracteres (os de agora vão de 96 a 141). O `*` marca o padrão (o piloto
automático). A letra é a posição no telão.

### 4.1 Mês 1: quanto trabalhar?

*"Quem fica mais tempo online recebe mais pedidos. Ninguém paga o seu INSS, e o
básico da casa vence no fim do mês, com acidente ou sem."*

**Contexto de cada casa** (o que a casa não compra fica dito como adiado, para não
sugerir um gasto que o jogo não cobra):
- **Jonas:** A parcela da moto vence dia 5. A filha precisa de tênis para a escola:
  com o básico descoberto, vai ficar para quando sobrar.
- **Kauã:** O cursinho noturno começa na segunda, na hora do pico do jantar. A mãe
  pediu ajuda com a conta de luz.
- **Daiane:** O aluguel vence dia 10, e o pai do menino não paga pensão. O menino está
  com tosse há uma semana.
- **Marcos:** A revisão do carro atrasou e vai esperar mais um mês. O material da
  escola dos meninos também vai esperar. (Era "o pneu careca aumenta o risco na
  chuva", sem efeito nenhum no jogo; 2ª rodada, D-053.)
- **Rose:** Tudo sai do seu bolso. O filho de 23 procura emprego há cinco meses, e a
  filha de 15 vai ficar sem a excursão da escola.

| | Opção | Narrativa | O que faz |
|---|---|---|---|
| A | 12 horas por dia, 7 dias por semana | Fiquei online da manhã até a madrugada, sete dias. Dormi pouco, comi na rua e não vi minha casa acordada. (Daiane e Rose com texto próprio) | item 31 |
| B | Jornada de sempre e abrir o MEI | Mantive a rotina, abri o MEI e pago o DAS todo mês. Acidente com mais de 15 dias parado, o INSS paga um mês depois; doença, só com 12 meses de contribuição. | item 32; energia −2 |
| C* | Jornada de sempre, sem pagar nada | Mantive a rotina e não paguei nada. Sobrou um pouco mais, e continuo sem rede se algo der errado. | energia −2 |
| D | Trabalhar menos para estudar ou cuidar da família (Kauã: "Pedalar menos para fazer o cursinho") | Cortei as horas mais fracas, um dia por semana somado, para estudar e ficar com os meus. Descansei, e o dinheiro dessas horas fez falta. | item 33 |

### 4.2 Mês 2: o app muda a regra

*"Sem aviso, a plataforma mudou o cálculo e passou a pagar menos. Quem recusa
demais some da fila, e ninguém explica a conta."* Efeitos gerais: corte de 15%
(item 34), o DAS de quem abriu o MEI e a multa do aluguel de quem fechou o mês 1 no
vermelho (seção 2.6).

**Contexto de cada casa:**
- **Jonas:** Se o mês passado fechou no vermelho, o aluguel atrasa, e o contrato cobra
  10% de multa. O cheque especial cobra 7,43% ao mês.
- **Kauã:** Um colega foi bloqueado na semana passada, e o app não respondeu. A mãe
  está com a pressão alta.
- **Daiane:** O anúncio no Instagram ficou 12% mais caro, e o chocolate subiu 25% em um
  ano. Aluguel atrasado paga 10% de multa.
- **Marcos:** Na 99, quem finaliza menos de 70% das corridas fica 5 dias fora. O mesmo
  app oferece empréstimo na tela, a 9,36% ao mês.
- **Rose:** O app de manicure fica com 20% de cada atendimento. O aluguel venceu ontem:
  atrasado, o contrato cobra 10% de multa.

| | Opção | Narrativa | O que faz |
|---|---|---|---|
| A* | Aceitar tudo o que vier, para não sumir da fila (Daiane: "Aceitar toda encomenda, até a sem margem"; Rose: "Aceitar todo atendimento, até o longe e barato") | Aceitei até o que não compensava, para o app não me esconder. Trabalhei mais para ganhar quase o mesmo. | item 35 |
| B | Parar um dia no breque (Daiane e Rose: "Parar um dia, em apoio ao breque"; Marcos: "Desligar o app um dia, no protesto") | Desliguei o app no dia do breque, junto com os outros. Perdi o dia. O reajuste, se vier, demora. Daiane, Marcos e Rose: "o reajuste é só dos entregadores" (D-057) | item 36 |
| C | Rodar em dois apps ao mesmo tempo (Daiane: "Vender também por um app de delivery"; Rose: "Atender por dois apps ao mesmo tempo") | Liguei dois apps e fiquei pulando de um para o outro. Rendeu mais, e o seguro de um não cobre a corrida do outro. | item 37 |
| D | Pegar R$ 1.500 emprestado no crédito pessoal (Marcos: "Pegar R$ 1.500 no empréstimo do app da 99") | Peguei R$ 1.500 em 12 parcelas de R$ 183, e a dívida continua depois do jogo. O mês fechou melhor, e o placar conta o que falta pagar. | item 38 |

A primeira frase de cada narrativa é a que o telão mostra na história da equipe: a
do empréstimo já diz que a dívida continua.

### 4.3 Mês 3: e agora?

*"O mês não fecha, e a dívida já cobra juros. Cada saída tem um preço, e nenhuma
resolve sozinha."*

**Efeitos gerais:** o DAS do MEI; a multa do aluguel; a 1ª parcela e o saldo devedor
de quem pegou o empréstimo; a fratura do mês 2 continua (25 dias), e o INSS chega a
quem pagava o MEI; o bloqueio do mês 2 toma o mês inteiro. Os rótulos deles
aparecem na tela (2ª rodada), por isso são curtos: "multa", "saldo do empréstimo",
"+25 dias da fratura", "INSS (45 dias)", "INSS (30 dias)", "bloqueio: o mês todo",
"o outro app: metade".

**Contexto de cada casa:**
- **Jonas:** O dono da casa avisou: se o aluguel atrasar de novo, ele entra na Justiça
  com o despejo. A parcela da moto também venceu.
- **Kauã:** Se o aluguel atrasar de novo, é mais 10% de multa. A irmã de 9 anos precisa
  de óculos, e a consulta do posto não tem data.
- **Daiane:** A distribuidora pediu 24% de aumento na luz para novembro. O menino precisa
  de consulta, e a fila do posto está longa.
- **Marcos:** O cheque especial cobra 7,43% ao mês sobre o que falta, e aluguel atrasado
  paga 10% de multa. Se apertar mais, a carne sai do prato dos filhos. (Era "os
  filhos perguntam por que não tem mais carne", lido antes da decisão de cortar.)
- **Rose:** O filho conseguiu uma entrevista de emprego, e a roupa para ir vai ficar
  para depois. Se o aluguel atrasar de novo, o dono fala em despejo. (Era "precisa
  do dinheiro do ônibus", um gasto que o jogo não cobra.)

| | Opção | Narrativa | O que faz |
|---|---|---|---|
| A | Entrar na associação dos trabalhadores | Entrei na associação: mensalidade e um dia na assembleia. Se o app me bloquear, agora tem advogado do meu lado. (Daiane: "se derrubarem meu perfil") | item 39 |
| B | Rodar até de madrugada (Daiane: "Cozinhar de madrugada para vender mais"; Rose: "Atender até tarde da noite e aos domingos") | Rodei até de madrugada e nos fins de semana. Rendeu mais, e a rua à noite é outra. | item 40 |
| C | Não parar nenhum dia, nem machucado | Trabalhei nas folgas e fui trabalhar doente. Se estava machucado, voltei antes da alta, e o punho pode não aguentar. | item 41 |
| D* | Apertar o cinto: cortar comida e remédio | Cortei a carne, a fruta e o remédio que não era urgente. Sobrou um pouco, e a casa passou a comer pior. | item 42 |

**Por que a associação perde (D-029):** ela é a de menor saldo esperado no mês 3 nas
5 personas, e o ganho dela (o advogado, o reajuste coletivo) quase não cabe em 3
meses.

### 4.4 Cartas

| Carta (curto) | Peso | Dias | Quando | Narrativa | O que muda a fatia |
|---|---|---|---|---|---|
| Um mês como os outros (Normal) | 40 | — | sempre | Nenhuma surpresa a mais neste mês. A conta da casa chegou igual. | × 0 no mês 3 depois de fratura ou bloqueio no mês 2 |
| O mês passado ainda pesa (Continua) | 40 | — | mês 3, só depois de fratura ou bloqueio no mês 2 | Nenhuma surpresa nova neste mês. O que veio do mês passado continua pesando, e a conta da casa chegou igual. | — (substitui a "Normal" nesse ramo, com o mesmo peso: as chances não mudam; 2ª rodada, achado 10: "nenhuma surpresa" com o mês inteiro bloqueado era contradição) |
| Uma semana boa (Semana boa) | 12 | — | sempre | Bati o desafio da semana, veio gorjeta, entrou uma encomenda grande. Não dá para contar com isso no mês que vem. | +6 com 12 h; +3 com dois apps |
| Temporal em Porto Alegre (Temporal) | 8 | — | sempre | Alerta laranja, vento e granizo. O app lançou promoção de chuva em letras grandes; o "cuidado na chuva" veio em letra miúda. | — |
| O instrumento de trabalho quebrou (Quebrou) | 8 | 3 | sempre | Quebrou o que eu uso para trabalhar: três dias sem ele, e o conserto sai do meu bolso. | +3 com 12 h, aceitar tudo, dois apps e madrugada |
| Adoeci: uma semana parado (Doença) | 6 | 7 | sempre | Parei uma semana. Nem o MEI cobre: doença exige 12 meses de contribuição e mais de 15 dias parado. | +8 com energia < 4; +8 com < 2; +4 apertando o cinto |
| Queda leve: 5 dias parado (Queda) | 6 | 5 | Jonas, Kauã, Marcos | Um tombo no molhado, ou uma batida leve: cinco dias parado e o conserto. Menos de 7 dias, o seguro do app não paga; menos de 16, o INSS não paga. | +2 com 12 h, aceitar tudo, dois apps e não parar; × 0,6 trabalhando menos; sono (seção 2.7); × 4,3 de madrugada |
| **Acidente: fratura, 45 dias parado (Fratura)**, grave | 1 | 20 | meses 2 e 3 | Me acidentei e quebrei o punho: 45 dias parado, 20 neste mês e 25 no próximo. O seguro do app só paga se foi na entrega, e poucos recebem; o INSS, só com o MEI, e um mês depois. | +3 moto e bike; +2 carro; +2 com os esforços acima (quem está na rua); sono; × 4,3 de madrugada |
| **Conta bloqueada sem explicação (Bloqueio)**, grave | 4 | 15 | meses 2 e 3 | Bloquearam minha conta com uma mensagem genérica, sem prazo e sem jeito de me defender. Sem advogado, ninguém responde o recurso. | × 0,4 aceitando tudo; +4 com dois apps |
| **Fui assaltado (Assalto)**, grave | 2 | 3 | menos Daiane | Levaram o celular e o dinheiro do dia. Fiquei dois dias sem coragem de sair, e sem celular não tem app. | +2 com 12 h; +3 de madrugada |
| Trabalhei e não recebi (Não pagou) | 8 | — | sempre | Fiz o serviço, ou fui até lá, e o dinheiro não veio. Reclamar no app leva dias e quase nunca dá em nada. | — |
| O app apertou a taxa (Taxa) | 6 | — | meses 1 e 3; Jonas, Kauã, Daiane | Mais um corte, sem aviso: a segunda entrega da rota passou a pagar menos, ou o anúncio e o insumo subiram. | — |
| A mobilização arrancou um reajuste (Reajuste) | 2 | — | mês 3; Jonas e Kauã | Depois do breque, a plataforma subiu o valor mínimo por entrega. É pouco, e veio de quem parou. | +8 se parou no breque; +5 com a associação |
| **A perícia do INSS negou o auxílio (INSS negou)**, grave | 64 | — | mês 3; fratura no mês 2 com MEI | Paguei o MEI em dia, esperei a decisão e a perícia negou. O dinheiro que eu contava não veio. | +64 com "não parar" (fica em ~50% nos dois casos) |
| **A lesão voltou (Recaída)**, grave | 28 | 10 | mês 3; fratura no mês 2 e "não parar" | Voltei antes da alta, e o punho não aguentou. Mais dez dias parado, e a fila do SUS para fisioterapia não tem data. | só existe para quem voltou antes da alta (~20%) |

**O teto de 30 dias parados** (seção 7, item 1) é feito com `ajustesDePeso`
(`multiplica` 0 com `sorteou` do mês 2):
- **bloqueio do mês 2** (o mês 3 inteiro): todas as cartas, menos a "O mês passado ainda pesa", zeram;
- **fratura do mês 2** (25 dias no mês 3): zeram fratura, bloqueio, doença, queda,
  recaída, semana boa e temporal. Sobram quebrou e assalto (3 dias) e as cartas sem
  parada;
- **fratura do mês 2 e "não parar"** (10 dias): tudo pode sair, e o máximo é 10 + 20 =
  30.

**Chances do Jonas no caminho do piloto automático** (média dos estados, com as
outras decisões ao acaso):

| Mês e opção | Normal | Semana boa | Temporal | Quebrou | Doença | Queda | Fratura | Bloqueio | Assalto | Não pagou | Taxa | Reajuste |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 C (de sempre) | 41,7% | 12,5% | 8,3% | 8,3% | 6,3% | 6,3% | — | — | 2,1% | 8,3% | 6,3% | — |
| 2 A (aceitar tudo) | 37,4% | 11,2% | 7,5% | 10,3% | 6,2% | 9,5% | 7,1% | 1,5% | 1,9% | 7,5% | — | — |
| 3 D (apertar o cinto) | 36,2% | 8,7% | 5,8% | 6,4% | 10,3% | 7,7% | 5,1% | 2,9% | 1,6% | 6,4% | 4,8% | 3,2% |
| 3 B (madrugada) | 27,1% | 6,1% | 4,0% | 6,3% | 4,8% | 21,4% | 14,3% | 2,0% | 2,9% | 4,6% | 3,5% | 2,4% |

- **Queda e fratura juntas** ficam entre 6% e 17% por mês no piloto; de madrugada,
  36%. A pesquisa do Cebrap dá 22% de acidente em 3 meses, e a da UFBA, 44% em um ano.
  Está dramatizado para caber em 3 rodadas (D-030), e de madrugada mais ainda, de
  propósito (D-051).

### 4.5 O que atravessa os meses, com os números do Jonas

Carta "Normal" nos meses sem o evento; saldo final depois dos 3 meses.

| Caminho | Mês 2 | Mês 3 | Saldo final |
|---|---|---|---|
| Piloto automático, sem nenhum evento | −766 | −605 | **−1.838** |
| Fratura no mês 2, **sem MEI** | −4.203 (20 dias −1.787 · gastos −1.780) | −3.361 (mais 25 dias) | **−8.031** |
| Fratura no mês 2, **com MEI e o INSS aprovado** | −4.295 | −1.029 (+2.431 do INSS) | **−5.877** |
| Fratura no mês 2, **com MEI e o INSS negado** (~50%) | −4.295 | −3.460 | **−8.308** |
| Fratura no mês 2, sem MEI, e "voltei antes da alta" | −4.203 | −1.748 | **−6.418**, com ~20% de recaída (dá −7.911) |
| Bloqueio no mês 2 | −2.106 | −3.384 (o mês inteiro) | **−5.957** |
| Bloqueio no mês 2 e associação no mês 3 | −2.106 | −2.694 (liminar no 21º dia) | **−5.267** |
| Bloqueio no mês 2 com dois apps | −1.168 | −1.974 (o outro app segura metade) | **−3.609** |
| Empréstimo no mês 2 | +466 | −2.109 (parcela −183 · saldo devedor −1.413 · multa −130) | **−2.110** |

**O que o MEI protege:** com a fratura no mês 2, o MEI com o INSS aprovado termina
R$ 2.154 acima de quem não tinha MEI. Metade das vezes a perícia nega, e o MEI
custou R$ 258.

---

## 5. Contas

### 5.1 Quanto falta para o básico: o piloto automático com carta "Normal"

Opções C, A e D; é a conta mínima: qualquer carta ruim piora. Em R$.

| Persona | Mês | Trabalho | Custos fixos | Outra renda | Entrou | Gastos | Básico | Juros | **Saldo do mês** | Acumulado | Energia |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Jonas | 1 | 2.680 | 480 | 1.499 | 3.699 | 0 | 4.166 | 0 | **−467** | −467 | 5 |
| | 2 | 2.546 | 480 | 1.499 | 3.565 | 130 | 4.166 | 35 | **−766** | −1.233 | 3 |
| | 3 | 2.764 | 480 | 1.499 | 3.783 | 130 | 4.166 | 92 | **−605** | −1.838 | 2 |
| Kauã | 1 | 1.370 | 0 | 1.499 | 2.869 | 0 | 3.886 | 0 | **−1.017** | −1.017 | 5 |
| | 2 | 1.301 | 0 | 1.499 | 2.800 | 102 | 3.886 | 76 | **−1.264** | −2.281 | 2 |
| | 3 | 1.317 | 0 | 1.499 | 2.816 | 102 | 3.886 | 169 | **−1.341** | −3.622 | 0 |
| Daiane | 1 | 1.500 | 141 | — | 1.359 | 0 | 2.755 | 0 | **−1.396** | −1.396 | 4 |
| | 2 | 1.335 | 141 | — | 1.194 | 100 | 2.755 | 104 | **−1.765** | −3.161 | 2 |
| | 3 | 1.400 | 141 | — | 1.259 | 100 | 2.755 | 235 | **−1.831** | −4.992 | 1 |
| Marcos | 1 | 2.870 | 0 | 1.499 | 4.369 | 0 | 4.742 | 0 | **−373** | −373 | 4 |
| | 2 | 2.726 | 0 | 1.499 | 4.225 | 130 | 4.742 | 28 | **−675** | −1.048 | 2 |
| | 3 | 2.684 | 0 | 1.499 | 4.183 | 130 | 4.742 | 78 | **−767** | −1.815 | 1 |
| Rose | 1 | 2.100 | 0 | — | 2.100 | 0 | 4.512 | 0 | **−2.412** | −2.412 | 4 |
| | 2 | 1.995 | 0 | — | 1.995 | 130 | 4.512 | 179 | **−2.826** | −5.238 | 2 |
| | 3 | 1.991 | 0 | — | 1.991 | 130 | 4.512 | 389 | **−3.040** | −8.278 | 1 |

- No mês 3, a Daiane, o Marcos e a Rose começam com energia 2: rendem 10% menos
  (Marcos 2.870 → 2.583, mais os R$ 101 do cinto).
- **O "entrou" não fica negativo neste caminho**, mas fica em outros, raros: a
  conferência (i) do validador enumera todos. Daiane até −R$ 406 (r3, madrugada,
  depois de bloqueio e empréstimo no mês 2), em 2,6% dos meses 3 ao acaso; Rose até
  −R$ 269, em 1,2%. Com o trabalho em 0 (piso), sobram os custos fixos (curso,
  parcela do empréstimo, DAS). Antes da 2ª rodada, este texto dizia "em nenhum
  outro", o que estava errado (seção 8, item 11).
- **O trabalho nunca fica negativo** (piso da 2ª rodada, conferido em (i)).

**Uma conta à mão (Jonas, mês 1, opção C):**
- **Sem carta:** 2.680 − 480 + 1.499 − 4.166 = **−R$ 467**.
- **Cartas** (pesos somam 96; a renda perdida e os gastos juntos): (12 × 268 +
  8 × 150 − 8 × 790 − 6 × 685 − 6 × 1.041 − 2 × 1.268 − 8 × 120 − 6 × 180) ÷ 96 =
  −16.836 ÷ 96 = **−R$ 175,4**.
- **Mês:** **−R$ 642,4**. É o que o validador imprime em (b): "r1 c renda E −642,4".

### 5.2 Uma decisão por vez (as outras ao acaso)

Saldo esperado no fim dos 3 meses; `*` é o padrão; em negrito, a melhor opção da
persona naquele mês (conferência h). Em R$.

| Persona | Mês | A | B | C | D |
|---|---|---|---|---|---|
| Jonas | 1 | **−2.847** | −3.529 | −3.330* | −3.266 |
| | 2 | −3.292* | −3.303 | **−3.133** | −3.244 |
| | 3 | −3.401 | −3.293 | **−3.016** | −3.263* |
| Kauã | 1 | −4.218 | −4.452 | −4.252* | **−4.200** |
| | 2 | −4.315* | −4.313 | **−4.190** | −4.304 |
| | 3 | −4.396 | −4.280 | **−4.175** | −4.270* |
| Daiane | 1 | **−5.033** | −5.582 | −5.373* | −5.438 |
| | 2 | −5.337* | −5.369 | −5.402 | **−5.317** |
| | 3 | −5.534 | **−5.202** | −5.256 | −5.433* |
| Marcos | 1 | **−2.963** | −3.668 | −3.453* | −3.277 |
| | 2 | −3.457* | −3.373 | **−3.197** | −3.335 |
| | 3 | −3.520 | −3.397 | **−3.110** | −3.335* |
| Rose | 1 | **−8.355** | −9.067 | −8.802* | −8.892 |
| | 2 | −8.748* | −8.936 | **−8.560** | −8.871 |
| | 3 | −9.022 | **−8.591** | −8.641 | −8.861* |

**O que a tabela mostra:**
- **Mês 1:** 12 horas para quatro personas; para o Kauã, a quem as 12 horas rendem
  só R$ 105 (D-024), a melhor é pedalar menos e fazer o cursinho, por R$ 18.
- **Mês 2:** dois apps para quatro personas; para a Daiane, o empréstimo, porque o
  app de delivery cobra 26,2% e exige CNPJ. O empréstimo é quase neutro e fica em
  segundo ou terceiro para os outros.
- **Mês 3:** "não parar" para quem está na rua (Jonas, Kauã, Marcos), porque de
  madrugada o risco de acidente sobe 4,3 vezes; madrugada para a Daiane e a Rose, que
  não estão na rua.
- **O padrão nunca é a melhor.** A folga menor: Kauã, mês 1, R$ 52 (C contra D);
  Daiane, mês 2, R$ 20 (A contra D). Uma edição pequena pode trazer o aviso de volta.
- **A associação é a pior do mês 3 nas 5 personas** (D-029).
- **O MEI é sempre a pior do mês 1** no saldo: a proteção custa R$ 258 e só paga se a
  fratura vier no mês 2 (o que ela protege está na seção 4.5).

### 5.3 Caminhos inteiros

| Persona | Piloto (C-A-D): esperado · mediana | Melhor plano esperado | Pior plano esperado | Ao acaso: 10% piores / 10% melhores | Melhor caminho possível | Fecha: piloto · ao acaso · melhor plano | Pior caso |
|---|---|---|---|---|---|---|---|
| Jonas | −3.388 · −2.808 | A-D-C: −2.533 | B-B-A: −3.731 | −5.854 / −1.545 | **+325** (A → C → B, com três semanas boas) | 0% · 0,014% · 0,53% (A-C-B) | −11.708 |
| Kauã | −4.299 · −4.011 | D-C-C: −3.929 | B-A-A: −4.615 | −5.424 / −3.489 | −2.722 | 0% · 0% · 0% | −8.991 |
| Daiane | −5.445 · −5.379 | A-D-B: −4.834 | B-A-A: −5.807 | −6.084 / −4.685 | −3.995 | 0% · 0% · 0% | −8.863 |
| Marcos | −3.595 · −3.129 | A-C-C: −2.577 | B-A-A: −3.992 | −6.106 / −1.306 | **+685** (A → C → B) | 0% · 0,19% · 5,2% (A-C-C) | −12.753 |
| Rose | −8.889 · −8.802 | A-C-B: −7.963 | B-B-A: −9.431 | −9.804 / −7.843 | −6.716 | 0% · 0% · 0% | −14.737 |

- **O caminho estreito (D-050) existe para o Jonas e o Marcos:** as melhores escolhas
  e três semanas boas. Numa sala com as 6 equipes, jogando ao acaso, a chance de
  alguma fechar é de ~0,2%; jogando o melhor plano, de ~6%.
- **O melhor plano ainda termina com a energia perto de 0** em quatro personas: a
  conta em dinheiro continua favorecendo o esgotamento, só que menos, e com o risco
  à vista no pior caso. A energia final não aparece no placar (seção 8, item 6).
- **Quem mora na casa pesa mais do que o que se decide.** O melhor caminho da Rose
  (−6.716) fica abaixo do piloto de qualquer outra persona.

### 5.4 O que o validador disse

- **O que rodei:** `node bin/validar-config.mjs`, versão `2026-09-29-v2.1-rascunho`,
  hash `42bfc0d8` (2ª rodada de 29/09: piso do trabalho, carro a R$ 1.840, carta
  "O mês passado ainda pesa", rótulos curtos). Só as linhas do Marcos mudaram nas
  seções 5.2 e 5.3.
- **Formato:** 0 erros e 0 avisos de formato.
- **(c) Opção dominante:** nenhuma.
- **(d) Piloto automático:** o padrão nunca é a opção de maior saldo esperado.
- **(e) Variância, 5 avisos (aceitos pela D-024):** as decisões explicam Jonas 3,2%,
  Kauã 3,3%, Daiane 15,7%, Marcos 2,7% e Rose 15,5%. Caiu em relação ao v2: as cartas
  graves ficaram mais caras (gastos com fonte, dias do Jonas a R$ 89,33) e mais
  prováveis com pouca energia.
- **(f):** a energia chega a 0 em 40% das partidas, com consequência.
- **(g) D-050, 4 avisos, explicados:**
  - "nenhum caminho fecha" para Kauã, Daiane e Rose: sem mudar a renda da casa, não
    há conta honesta que os leve a 0 (seção 8, item 1);
  - "menos de 2 personas entre 5% e 15% ao acaso": a faixa é a sugestão do
    validador (rascunho v2, item 7.5). Pôr o Jonas e o Marcos nela pediria ~R$ 1.500
    a mais em 3 meses, e o piloto passaria a fechar, o que a D-050 não quer.
- **(g), leitura fina:** as chances pequenas saem com dois algarismos: Jonas fecha em
  0,014% ao acaso (0,53% no melhor plano), Marcos em 0,19% (5,2%). Antes o
  validador arredondava o Jonas para "0%".
- **(h) D-051:** sem aviso. A melhor opção muda com a persona nos 3 meses, e a de
  maior renda no mês fica em A, D e C (o D do mês 2 é o empréstimo; seção 8, item 14).
- **(i) Conta do mês, 2 avisos:** trabalho ≥ R$ 0 e renda perdida nunca maior que a
  renda sem a carta, nas 5 personas; o "entrou" negativo da Daiane (pior −R$ 406;
  r2 0,012% e r3 2,6% dos casos ao acaso) e da Rose (pior −R$ 269; r3 1,2%).
- **Dias parados:** conferi por enumeração, em todos os caminhos das 5 personas: o
  máximo é 30 (fratura no mês 2, "não parar" e nova fratura no mês 3).
- **Testes:** `npm run check` 434 de 434; `npm run emulador` 32 de 32 (duas vezes; o
  simulador do emulador agora usa a fixture v2.1); `npm run e2e` e `npm run e2e:online`
  ok; simulador com `--atacar` no emulador com o config.json: 0 violações, 67 de 67
  ataques recusados.

### 5.5 Roteiros

Sem mudança desde o rascunho v2: decisão de 120 s, rodadas de 300 s, placar de 240 s.

| 60 min | seg | 120 min | seg |
|---|---|---|---|
| lobby | 120 | lobby | 150 |
| enquete de entrada, antes (opcional) | 90 | enquete de entrada, antes (opcional) | 90 |
| Gancho: o lançamento | 180 | Gancho: o lançamento | 270 |
| Mapa do seminário | 180 | Mapa do seminário | 270 |
| formar equipes | 120 | formar equipes | 120 |
| personas | 150 | personas | 150 |
| Debrief e teoria: a conta do entregador | 240 | Debrief e teoria: a conta do entregador | 300 |
| **Mês 1** | **300** | **Mês 1** | **300** |
| Debrief e teoria: gestão por algoritmo | 240 | Debrief e teoria: gestão por algoritmo | 360 |
| **Mês 2** | **300** | **Mês 2** | **300** |
| Contraponto: a Viração e os dados sobre CLT | 240 | Debrief e teoria: quiz anúncio ou conteúdo | 480 |
| Caminhos: regulação, proteção, organização e educação | 240 | Contraponto: a Viração e os dados sobre CLT | 300 |
| **Mês 3** | **300** | Contraponto: entrevistas em Porto Alegre | 540 |
| placar final | 240 | Caminhos: regulação, proteção, organização e educação | 240 |
| Termômetro (curto) | 300 | **Mês 3** | **300** |
| enquete de entrada, depois | 90 | placar final | 240 |
| comparativo | 150 | Debrief e teoria: mapa do patrão em grupos | 840 |
| Fim: quem é o patrão? | 120 | Caminhos: convidado com perguntas | 1.050 |
| fim | — | Termômetro | 540 |
| | | enquete de entrada, depois | 90 |
| | | comparativo | 150 |
| | | Fim: quem é o patrão? | 120 |
| | | fim | — |
| **Total** | **3.600** | **Total** | **7.200** |

---

## 6. Perguntas do rascunho v2 (seção 6): onde estão

| # | Pergunta | Situação |
|---|---|---|
| 1 | Segunda renda de um salário mínimo (Jonas, Kauã, Marcos) | **Aberta**, e agora ligada à D-050: seção 8, item 1 |
| 2 | A Rose muito abaixo | **Aberta**: seção 8, item 1 |
| 3 | Tarifa Social e Gás do Povo (Daiane e Rose) | **Aberta**: seção 8, item 1. A tarifa social do DMAE caiu: nenhuma persona tem direito |
| 4 | Juros da dívida | **Fechada:** cheque especial, 7,43% (confirmado no pedido de 29/09) |
| 5 | Ninguém fecha | **Substituída pela D-050** (seção 5.3) |
| 6 | "Trabalhar menos" no mês 1 | Mantida, agora mais barata (item 33) e a melhor para o Kauã. Seção 8, item 7 |
| 7 | Breque | **Fechada pela D-057** |
| 8 | INSS negado em ~50% | **Aberta**, mantida em ~50%: seção 8, item 8 |
| 9 | Bloqueio do mês 2 toma o mês 3 inteiro | Mantido; agora zera as outras cartas desse mês (teto de 30 dias). Seção 8, item 8 |
| 10 | Fratura atravessa, e "voltar antes da alta" | Mantido; a recaída agora só existe para quem voltou antes. Seção 8, item 8 |
| 11 | Seguro do iFood | **Aberta**, com dado novo: seção 8, item 5 |
| 12 | Estimativas sem fonte | Várias ganharam fonte (fratura, mensalidade, comissão); o que sobra está na seção 8, item 9 |
| 13 | Referência com carteira | **D-056**, a validar: seção 8, item 2 |
| 14 | Indicador Proteção só na tela | A proteção ganhou efeito real pelas decisões (MEI, associação); o indicador segue só na tela. Seção 8, item 6 |
| 15 | Roteiros com rodadas de 300 s | Sem mudança; seção 8, item 10 |
| 16 | Quem tem 12 anos ou mais come como adulto | **Aberta**: seção 8, item 10 |

---

## 7. Perguntas da revisão de 29/09: o que foi feito

1. **Mais de 30 dias parado no mesmo mês.** Feito com `ajustesDePeso` (`multiplica`
   0 com `sorteou` do mês 2 e, na fratura, com a opção), como a correção de conta
   pede. O bloqueio do mês 2 deixa só a carta "Normal" no mês 3; a fratura do mês 2
   zera as cartas que passariam de 30. A recaída passou a existir só para quem voltou
   antes da alta. Conferido: o máximo é 30 dias.
2. **"Entrou" negativo.** Feito com o esquema v2.1: conserto, remédio, fisioterapia,
   celular, multa e saldo devedor são `categoria: "gasto"`; parcela, DAS, curso,
   mensalidade e parcela do empréstimo são `fixo: true`. **Correção da 2ª rodada:** o
   "entrou" ainda fica negativo em caminhos raros da Daiane e da Rose (seção 5.1 e
   seção 8, item 11); o texto anterior dizia "em nenhum caminho". O trabalho, que
   também ficava negativo, ganhou piso em R$ 0.
3. **O empréstimo do mês 3 só custava.** Opção (b): o empréstimo foi para o mês 2
   (D). Os R$ 1.500 entram na hora; no mês 3 aparecem a 1ª parcela (R$ 183, ou R$ 213
   na 99Pay do Marcos) e o saldo devedor (R$ 1.413), contado no placar. A narrativa,
   que é a linha do mês 2 na história da equipe, diz "a dívida continua depois do
   jogo" e "o placar conta o que falta pagar". Para caber, saiu "Recusar o que não
   paga" (seção 8, item 4), e o mês 3 ficou com "Rodar até de madrugada" sem
   empréstimo.
4. **`multiplica` atingia parcela e manutenção.** Resolvido no motor v2.1 e no
   conteúdo: a parcela é custo fixo, e a manutenção saiu. Só dois efeitos multiplicam
   a renda: o "exausto" (× 0,9) e o bloqueio que toma o mês 3 (× 0). Na 2ª rodada, o
   piso do trabalho evita que os dias parados, a preço cheio, passem da renda que
   sobrou depois desses dois.
5. **Ninguém fechava.** D-050: o piloto nunca fecha; o Jonas e o Marcos têm caminho
   estreito (+R$ 325 e +R$ 685 no melhor caso; 0,5% e 5,2% no melhor plano). Kauã,
   Daiane e Rose seguem sem caminho, e isso depende de decisão sobre a renda da casa
   (seção 8, item 1).
6. **O placar premiava o esgotamento, e a Proteção não fazia nada.** D-051: energia
   baixa custa renda (−10%) e acidente (até 4,3 vezes, AAA), e a doença fica mais
   provável; a madrugada multiplica o risco por 4,3; a jornada de sempre cansa (−2).
   A proteção vale pelas decisões: MEI → INSS; associação → liminar. A melhor opção
   muda com a persona nos 3 meses, e as letras foram reordenadas. O melhor plano
   ainda termina cansado (seção 8, item 6).
7. **O custo real não aparecia.** D-052: `diasParado` em toda carta de parada (quebrou
   3, assalto 3, queda 5, doença 7, recaída 10, bloqueio 15, fratura 20), e os gastos
   separados. O motor já devolve `cartaCusto` ("20 dias parado · renda perdida
   R$ 1.787 · gastos R$ 1.650" na fratura do Jonas), e as telas o mostram. Na 2ª
   rodada, as telas passaram a mostrar também o que vem do mês anterior (a fratura
   que continua, o INSS, o bloqueio, o saldo do empréstimo, a multa).
8. **Os valores da fratura não tinham fonte.** Opção (a): peças da CG 160 (AutoPapo),
   para-choque (Revista Oeste), roda de bicicleta (Revista Oeste), remédio e tala
   (Panvel, São João), fisioterapia (Doctoralia), os 45 dias (diretriz do INSS). A
   "metade" do outro app continua estimativa, agora declarada na fonte.
9. **A manutenção contada duas vezes.** Opção (a), conferida na nota técnica do IBGE
   (v1.5, p. 35-36): a retirada já desconta despesas e investimentos. A manutenção
   saiu, e a parcela virou custo fixo dentro dos R$ 2.680 (seção 8, item 3).
10. **Contextos que contradiziam o jogo.** D-053: o rotativo do Marcos saiu (ele paga
    7,43%); o despejo "em 15 dias" do Jonas saiu (o aluguel exige garantia); tênis,
    excursão e material viraram "vai ficar para depois"; a multa do aluguel virou
    efeito real (seção 2.6).
11. **A cadeia de setas do "Escolha ou sorte?".** Resolvido na tela, na versão 3 do
    site. Nada no conteúdo.
12. **A história da equipe sem narrativas.** Resolvido na tela, na versão 3. No
    conteúdo, a primeira frase de cada narrativa foi escrita para ficar de pé
    sozinha, porque é ela que o telão mostra.
13. **Textos que não serviam à Daiane e à Rose.** D-054: `rotuloPor` e
    `narrativaPor` em 8 opções (Daiane em 6, Rose em 5, Marcos em 2, Kauã em 1), e
    rótulos de efeito do jeito de cada ofício.
14. **"Piloto automático" no placar.** Resolvido na tela, na versão 3.
15. **A linha do tempo.** Resolvido na tela, na versão 3.

---

## 8. Para validar com o Kleberson

1. **Kauã, Daiane e Rose não fecham em nenhum caminho** (D-050 pede "quase
   ninguém").
   - *Por que importa:* três das seis equipes sabem desde o mês 1 que não chegam lá.
     O melhor caminho fica em −R$ 2.722 (Kauã), −R$ 3.995 (Daiane) e −R$ 6.716 (Rose).
   - *Opções, com o efeito em 3 meses:*
     - (a) manter: a D-050 fica cumprida pelo Jonas e pelo Marcos, e as outras três
       mostram que a casa pesa mais que a decisão;
     - (b) Tarifa Social de luz e Gás do Povo para Daiane e Rose, que têm direito
       (fonte alta): cerca de +R$ 380 cada. Não basta sozinha;
     - (c) a segunda renda pelo piso regional do RS (R$ 1.739 líquidos, e não R$ 1.499)
       para Jonas, Kauã e Marcos: +R$ 720. Falta conferir se as ocupações entram no
       piso regional ou numa convenção;
     - (d) o filho de 23 da Rose faz bicos: outra renda sem fonte.
   - *Recomendo:* (a) com (b), porque (b) tem fonte e é um direito real.
2. **D-056: a referência com carteira ficou perto do app.** Com as correções, o Jonas
   de app termina com −R$ 3.388 esperado e −R$ 2.808 na mediana; a referência fica em
   −R$ 2.957.
   - *Por que importa:* a leitura "com carteira falta menos" enfraquece. A conta da
     carteira desconta a manutenção (que o salário não cobre) e não leva a multa do
     aluguel.
   - *Opções:* (a) manter −R$ 2.957; (b) incluir a multa do aluguel também na
     carteira (−R$ 260); (c) somar o FGTS (+R$ 657), que é patrimônio do trabalhador.
3. **A parcela da moto dentro da renda da PNAD.** O conceito do IBGE diz que a
   retirada já desconta investimentos, mas quem responde à PNAD pode não descontar a
   parcela.
   - *Por que importa:* vale R$ 480 por mês para o Jonas (R$ 1.440 em 3 meses) e é o
     que abre o caminho estreito dele.
   - *Opções:* (a) manter (renda de R$ 2.680, parcela de R$ 480 como custo fixo:
     líquido de R$ 2.200); (b) voltar a descontar a parcela dos R$ 2.200.
4. **"Recusar o que não paga" saiu do mês 2** para o empréstimo caber.
   - *Por que importa:* era a ilustração direta da gestão por algoritmo ("recusar dá
     bloqueio"), logo depois do debrief desse tema. O texto do mês ainda diz "quem
     recusa demais some da fila", e aceitar tudo segue protegendo do bloqueio.
   - *Opções:* (a) manter assim; (b) trocar o breque (mas a D-057 o manteve); (c) pôr o
     empréstimo no mês 1, no lugar de "trabalhar menos" (aí o Kauã perde a opção que
     é a melhor dele).
5. **O seguro dos apps não entrou no dinheiro.** O texto da fratura foi corrigido.
   - *Dado novo:* no mês seguinte à fratura, o seguro pagaria +R$ 2.700 ao Jonas
     (iFood, 30 diárias de R$ 90), +R$ 1.500 ao Kauã (mínimo de R$ 50) e +R$ 1.200 ao
     Marcos (99). Mas o Cebrap diz que "só uma pequena parte" recebeu, e não achei
     quantas indenizações o iFood paga.
   - *Por que ficou fora:* com o seguro e o INSS juntos, a fratura **dá lucro** ao
     Kauã e empata para a Daiane, porque o piso do INSS (R$ 54,03 por dia) e a diária
     mínima do iFood passam da renda deles. O "melhor caminho" do Kauã passaria a ser
     quebrar o punho.
   - *Opções:* (a) fora, citado no slide; (b) dentro, com uma carta "o seguro negou" de
     ~50%; (c) dentro só para Jonas e Marcos.
6. **O melhor plano ainda é o do esgotamento**, em quatro personas, e termina com
   energia perto de 0. A energia final e a proteção não aparecem no placar.
   - *Opções:* (a) mostrar a energia final nas páginas 2 e 3 do placar ("terminou com
     energia 0"), mudança de tela; (b) aceitar, e levar ao debate.
7. **"Trabalhar menos" mudou de preço:** custa as horas mais fracas (53%, a conta da
   D-024 ao contrário), e não o dia inteiro. É a melhor opção do Kauã no mês 1, por
   R$ 18.
8. **Regras mantidas que pesam:** INSS negado em ~50%; bloqueio do mês 2 toma o mês 3
   inteiro; recaída só para quem volta antes da alta (~20%); madrugada multiplica o
   risco de acidente por 4,3; a jornada de sempre cansa −2 por mês.
9. **Estimativas sem fonte que continuam:** celular de R$ 1.000; tela (R$ 400) e
   conserto da autoclave (R$ 350); bicicleta (R$ 150 e R$ 200); funilaria (R$ 800);
   remédio da doença (R$ 60); valores do calote e do temporal; o +10%, +20% e os 4% do
   aceitar, dos dois apps, da madrugada e do cinto; a margem de 50% da Daiane; a
   "metade" do outro app; o −10% do exausto; a energia inteira.
10. **Ainda da seção 6:** quem tem 12 anos ou mais come como adulto (a filha de 15 da
    Rose, R$ 420 a mais no básico); os roteiros com rodadas de 300 s.

### Da 2ª rodada da revisão de 29/09 (todos precisam de decisão)

O que era erro de conta, fonte errada ou contradição com a D-052 a D-054 foi
corrigido (seção 1, item 11; seções 2.9, 4 e 5). Os itens abaixo mudam regra ou
conteúdo, e ficaram como estão até você decidir.

11. **O "entrou" ainda fica negativo em caminhos raros.** *Precisa de decisão.*
    - *O que acontece:* Daiane até −R$ 406 (mês 3, depois de bloqueio e empréstimo
      no mês 2), em 2,6% dos meses 3 ao acaso; Rose até −R$ 269, em 1,2%. Com o
      trabalho em R$ 0 (piso), a parcela do curso, a do empréstimo e o DAS continuam
      saindo como custo fixo, e o celular mostra "Entrou −R$ 406".
    - *Opções:* (a) aceitar e explicar ("a parcela vence parado ou não"); (b) tratar
      a parcela do empréstimo e a mensalidade da associação como gasto, e não como
      custo fixo do trabalho (o "entrou" deixa de ficar negativo, e os "gastos"
      crescem); (c) mudar só o texto da tela quando o "entrou" é negativo.
    - *Junto:* os dias parados continuam a preço cheio sobre a renda já cortada pelo
      "exausto"; o piso só impede o número impossível. A alternativa é escrever os
      dias parados como fração do mês (`multiplica`), o que muda os valores de
      várias cartas.
    - *Recomendo:* (a), agora que o validador avisa toda vez (conferência i).
12. **A multa do aluguel lê o saldo acumulado, e não o mês anterior.**
    *Precisa de decisão.*
    - *O que acontece:* quem fechou o mês 2 no azul (+R$ 466), mas ficou com −R$ 1
      acumulado, paga R$ 130 de multa no mês 3. E o mesmo buraco paga os 7,43% do
      cheque especial e a multa do aluguel ao mesmo tempo.
    - *O que já mudou:* o rótulo na tela passou a ser "multa" (dizia "o mês passado
      fechou no vermelho", que nem sempre era verdade). O contexto do Jonas no mês 2
      ainda diz "se o mês passado fechou no vermelho".
    - *Opções:* (a) manter a regra e reescrever o contexto do Jonas ("se a conta
      estiver no vermelho"); (b) cobrar só quando o saldo do mês anterior foi
      negativo (precisa de uma condição nova no motor); (c) um piso, para uma dívida
      de R$ 1 não gerar multa cheia; (d) tirar dos juros a parte do aluguel quando a
      multa vale.
    - *Recomendo:* (a) com (c) (multa só com dívida acima de um aluguel, por exemplo).
13. **O empréstimo parece dinheiro de graça no fim do mês 2, e de graça de vez se o
    mês 3 for pulado.** *Precisa de decisão.*
    - *O que acontece:* a dívida (R$ 1.596) só entra no mês 3. No placar e no
      celular entre os meses 2 e 3, quem pegou o empréstimo aparece no azul, sem
      "dívida". Se o apresentador usar o "Pular para…" por cima do mês 3, a equipe
      termina com +R$ 1.500 sem dever nada.
    - *Opções:* (a) lançar o saldo devedor já no mês 2, como gasto, junto com a
      entrada (o mês 2 fica quase neutro, e o mês 3 só com a parcela); (b) mostrar
      "deve R$ 1.500" ao lado do saldo, sem mudar a conta; (c) avisar no "Pular
      para…" quando alguma equipe tem empréstimo.
    - *Recomendo:* (a), que resolve os dois.
14. **O empréstimo e o INSS contam como "renda" do mês.** *Precisa de decisão.*
    - *O que acontece:* os R$ 1.500 e o auxílio do INSS (+R$ 2.431) são soma sem
      `fixo` nem gasto, então entram no trabalho variável. O celular passou a dizer
      "Do trabalho e da decisão" (era "Do trabalho"), e o INSS aparece nomeado em
      "veio dos meses anteriores". Mas a conferência (h) da D-051 aponta o
      empréstimo (D) como a opção de maior renda do mês 2; sem ele, é o C, e o
      esforço fica em A, C e C.
    - *Opções:* (a) uma linha própria para o dinheiro que não é trabalho (categoria
      nova no esquema); (b) só tirar o empréstimo da conferência (h); (c) aceitar.
    - *Pergunta:* A, C e C atende à D-051 ("as letras não seguem o mesmo padrão")?
15. **Bloqueado o mês 3 inteiro, a equipe ainda perde energia pela madrugada e pelas
    folgas que não trabalhou.** *Precisa de decisão.* No r3, as opções B e C já
    devolvem a renda ("bloqueado, não teve hora extra"), mas não a energia: Jonas,
    Daiane, Marcos e Rose perdem 3, e Kauã 4. *Recomendo:* devolver a energia extra
    com o mesmo `sorteou: { r2: "bloqueio" }`.
16. **A D-050 ainda não se cumpre na prática.** *Precisa de decisão* (é o item 1,
    com os números da leitura fina). Kauã, Daiane e Rose não fecham em nenhum
    caminho; o Jonas fecha em 0,014% das partidas ao acaso, e o Marcos em 0,19%.
    Numa sala de 6 equipes jogando ao acaso, a chance de alguma fechar é de ~0,2%:
    o telão vai mostrar "6 de 6 equipes não fecharam" em quase toda aula.
    *Opções:* as do item 1, ou você aceitar por escrito que a D-050 vale só para o
    Jonas e o Marcos.
17. **A D-051 é parcial.** *Precisa de decisão* (é o item 6). As 12 horas são a
    melhor opção do mês 1 para 4 personas (Jonas +R$ 419 sobre a segunda); "não
    parar nem machucado" é a melhor do mês 3 para Jonas, Kauã e Marcos; o MEI é a
    pior do mês 1 e a associação a pior do mês 3 nas 5 personas. As diferenças que
    fazem "a melhor muda com a persona" são de R$ 18 (Kauã) e R$ 20 (Daiane). *Opções:*
    mostrar a energia final e a proteção no placar, mudar pesos ou efeitos, ou
    registrar na D-051 que ela é parcial.
18. **Textos que ainda não servem à Daiane e à Rose (D-054).** *Precisa de decisão.*
    - a fratura diz "o seguro do app só paga se foi na entrega" também para a Daiane
      (vende pelo Instagram) e a Rose (vai de ônibus): falta `narrativaPor`;
    - o corte do mês 2 ("a plataforma mudou o cálculo e pagou menos") vale para a
      Daiane, que não recebe de plataforma;
    - "aceitar toda encomenda" tira 60% da chance de bloqueio da conta da Daiane, e a
      liminar do advogado dos entregadores devolve o perfil de Instagram dela no 21º
      dia: valem para ela?
    - o mês 1 A da Daiane já diz "cozinhei de madrugada", e o mês 3 B repete
      "cozinhar de madrugada" como novidade.
19. **D-056: a referência com carteira fica abaixo da mediana do app, com as
    exclusões só contra a carteira.** *Precisa de decisão* (é o item 2). A conta da
    carteira desconta a manutenção (R$ 261) e deixa de fora o FGTS, o aluguel de
    moto das convenções e o INSS desde o 1º dia. Em metade das partidas, a linha
    tracejada do telão mostra o Jonas de app à direita da carteira. *Opções:* as do
    item 2, ou tirar a manutenção das duas contas; e, em qualquer caso, dizer no
    slide o que ficou de fora.
