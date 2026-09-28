# Rascunho do conteúdo do jogo e das enquetes

> **RASCUNHO — a validar.** Nada daqui entra no seminário sem a validação do
> Kleberson (D-005). Cada número tem a fonte ao lado; onde não achei dado, está
> escrito "estimativa" e o grau de confiança é baixo.

- **Data:** 28/09/2026.
- **Arquivo do conteúdo:** [`config.json`](../config.json), com `versao`
  `2026-09-28-rascunho`. Os textos de `fonte` do config resumem esta tabela e
  nunca aparecem no telão.
- **Como conferir as contas:** `npm run validar` roda as conferências de
  equilíbrio sobre o config. As tabelas da seção 4 foram calculadas por
  enumeração exata, com a mesma semântica de efeitos de `docs/contratos.md`
  (seção 3), e batem com a saída do validador.
- **Fontes locais** (na pasta Downloads, fora do repositório): a trilha do
  seminário, o artigo de Ludmila Abílio (Contemporânea, 2021), o artigo de Carmo
  et al. (Cad. EBAPE.BR, 2021) e a transcrição do Café da Manhã com Rosana
  Pinheiro-Machado (04/11/2024).

---

## 1. Resumo das escolhas

1. **Cenário: Porto Alegre, setembro de 2026.** Todos os preços são locais e
   atuais quando existe dado local. Renda e jornada vêm da PNAD Contínua 2025
   (IBGE, publicada em setembro de 2026), que é nacional.
2. **Cinco personas**, tiradas do artigo da Abílio e das outras fontes:
   - **Jonas**, motoboy de aplicativo com moto financiada (a trajetória dos
     motoboys, em Abílio);
   - **Kauã**, entregador de bicicleta de 20 anos (o caso de Carlos, em Abílio,
     e a pesquisa da Aliança Bike);
   - **Daiane**, que vende doces e marmitas pelo Instagram (a pesquisa de
     Pinheiro-Machado e o artigo do Cad. EBAPE.BR);
   - **Marcos**, motorista de aplicativo e ex-metalúrgico (a trajetória de
     Mário e a figura do motorista "amador", em Abílio);
   - **Rose**, manicure por aplicativo (o caso de Clara, em Abílio).
   Os nomes são inventados e diferentes dos nomes dos entrevistados do artigo,
   para ninguém confundir persona com pessoa real.
3. **Duas equipes no Jonas (motoboy)**, Laranja e Azul-céu, ambas obrigatórias.
   Motivos: é a ocupação que a Abílio mais acompanha; é a que tem mais risco
   físico, então a diferença que a sorte faz entre duas equipes iguais aparece
   com mais força; e é o caso da "conta do entregador", do bloco Debrief e
   teoria da trilha. A alternativa é o Kauã (bike), que a Abílio chama de
   "grande símbolo da uberização" (pergunta 2).
4. **O indicador `renda` virou "Saldo acumulado"**: a persona recebe a renda do
   mês e paga o custo de vida do mês. O saldo é o que sobra, ou falta, no fim de
   cada mês, somado ao longo dos 3 meses.
5. **Custo de vida pela régua do mínimo:** aluguel, comida (a cesta básica do
   DIEESE para Porto Alegre, por adulto-equivalente) e contas da casa. Não entram
   saúde, roupa, escola, transporte da família, lazer nem previdência. A régua do
   DIEESE (salário mínimo necessário) põe todas as personas entre R$ 980 e
   R$ 2.230 negativos por mês (pergunta 1).
6. **Só `soma` nos efeitos de dinheiro.** Um `multiplica` sobre a renda
   multiplicaria também o custo de vida, porque o `todoMes` entra primeiro no
   delta: "renda × 0,3" num mês de saldo negativo diminuiria o prejuízo. Por isso
   cada valor é escrito por persona, com `se: { persona }`.
7. **Duas regras que valem sozinhas nos meses 2 e 3** (`efeitosGerais`): quem
   abriu o MEI continua pagando o DAS, e quem está com saldo abaixo de −R$ 500
   paga juros do cheque especial.
8. **Resultado da calibragem** (seção 4):
   - no piloto automático, as 5 personas terminam os 3 meses no vermelho
     (valor esperado, de −R$ 56 a −R$ 1.656);
   - o melhor caminho de cada uma vai de −R$ 315 a +R$ 862 em 3 meses, e só
     com a energia em 0;
   - o MEI custa de R$ 70 a R$ 150 no valor esperado e melhora o pior caso em
     R$ 550 a R$ 1.900;
   - nenhuma opção vence em todos os indicadores, e o padrão de cada rodada nunca
     é a opção de maior saldo esperado;
   - **a sorte pesa mais do que a faixa sugerida pela arquitetura**: as cartas
     explicam de 71% a 92% da variância do saldo (perguntas 6 e 7).

---

## 2. Cada número, com fonte

Confiança: **alta** = dado oficial usado como está; **média** = dado oficial com
uma conta ou uma hipótese simples; **baixa** = estimativa minha ou dado antigo,
de outra cidade, ou de fonte com conflito de interesse.

### 2.1 Referências gerais

| # | Valor | Onde entra | Fonte | Como foi derivado | Confiança |
|---|---|---|---|---|---|
| 1 | Salário mínimo de 2026: **R$ 1.621,00** | DAS, INSS, auxílio | Presidência da República, Decreto 12.797/2025. https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm | Direto | Alta |
| 2 | DAS-MEI 2026: **R$ 86,05** (serviços) e **R$ 82,05** (comércio) | Mês 1, opção b; meses 2 e 3 | LC 123/2006, art. 18-A (5% do mínimo de INSS + R$ 5 de ISS ou R$ 1 de ICMS). Conferido em https://blog.nubank.com.br/valor-das-mei/ | 5% × 1.621 = 81,05; + 5 ou + 1. No config: R$ 86 e R$ 82 | Alta |
| 3 | Todas as 5 ocupações cabem no MEI | Mês 1, opção b | Resolução CGSN 140/2018, Anexo XI (ocupações "motoboy", "bikeboy (ciclista mensageiro)", "motorista de aplicativo", "manicure e pedicure" independentes; comércio). https://www8.receita.fazenda.gov.br/simplesnacional/arquivos/manual/anexo_xi.pdf | Conferi "bikeboy" numa fonte secundária (qipu.com.br); as outras não reconferi no anexo | Média |
| 4 | Auxílio por acidente: **acidente de qualquer natureza dispensa carência**; MEI recebe 1 salário mínimo; o benefício conta desde o início da incapacidade, se passar de 15 dias | Carta "Acidente" | Lei 8.213/1991, arts. 26, II, e 60. https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm ; gov.br, perguntas frequentes do MEI sobre previdência | 20 dias / 30 × R$ 1.621 = R$ 1.080,67 → **R$ 1.080** | Alta (a regra); média (o INSS atrasa: no jogo o valor chega no mesmo mês) |
| 5 | Doença comum exige **12 contribuições** | Carta "Adoeci" | Lei 8.213/1991, art. 25, I | MEI aberto no jogo não cobre doença | Alta |
| 6 | IPCA, número-índice: jun/2019 = 5.214,27; dez/2018 = 5.100,61; ago/2026 = 7.633,23 | Correção de valores antigos | IBGE, SIDRA, tabela 1737. https://sidra.ibge.gov.br/tabela/1737 | Fatores: 1,4639 (jun/2019→ago/2026) e 1,4965 (dez/2018→ago/2026) | Alta |

### 2.2 Custo de vida em Porto Alegre

| # | Valor | Onde entra | Fonte | Como foi derivado | Confiança |
|---|---|---|---|---|---|
| 7 | Cesta básica de Porto Alegre, ago/2026: **R$ 839,34** por adulto | Custo de vida de todas as personas | DIEESE/Conab, Pesquisa Nacional da Cesta Básica, via Jornal do Comércio (09/2026). https://www.jornaldocomercio.com/economia/2026/09/1262893-cesta-basica-em-porto-alegre-tem-queda-de-031-em-agosto.html | Direto. A cesta é a ração mensal de um adulto | Alta |
| 8 | Criança = **0,5 adulto** | Custo de vida | Convenção do DIEESE para o salário mínimo necessário (2 adultos + 2 crianças = 3 adultos). https://www.dieese.org.br/analisecestabasica/salarioMinimo.html | Direto | Alta |
| 9 | Aluguel de uma casa pequena na periferia: **R$ 1.000** | Custo de vida | FipeZAP, locação residencial, ago/2026: média de Porto Alegre R$ 46,46/m²; Nonoai, o bairro mais barato da lista de destaques, R$ 29,9/m². https://downloads.fipe.org.br/indices/fipezap/fipezap-202608-residencial-locacao-publico.pdf | 35 m² × R$ 29,9 = R$ 1.046 → R$ 1.000 (o FipeZAP mede anúncios de apartamento; casa na periferia tende a sair mais barata) | Média-baixa |
| 10 | Luz: **~R$ 160** por mês | Contas da casa | CEEE Equatorial, tarifa residencial B1 de 2026: R$ 0,822/kWh sem tributos. https://ceee.equatorialenergia.com.br/valor-de-tarifas-e-servicos/ | 150 kWh × 0,822 = R$ 123; + ~30% de tributos e bandeira (estimativa). Há reajuste previsto de 24,24% para 22/11/2026, depois do seminário | Média-baixa |
| 11 | Gás: **R$ 117,89** o botijão de 13 kg | Contas da casa | ANP, levantamento semanal de 20 a 26/09/2026, média do RS. https://clickpetroleoegas.com.br/botijao-gas-13-kg-preco-medio-estado-anp-roraima-rio-btl96 | 1 botijão por mês por casa (estimativa) | Média |
| 12 | Água e esgoto: **~R$ 80** | Contas da casa | Estimativa (não conferi a tarifa do DMAE) | — | Baixa |
| 13 | Celular com dados: **~R$ 60** | Contas da casa | Estimativa (plano pré-pago; é ferramenta de trabalho) | — | Baixa |
| 14 | **Contas da casa: R$ 420** | Custo de vida | Soma de 10 a 13 | 160 + 118 + 80 + 60 = 418 → 420 | Média-baixa |
| 15 | Régua alternativa: **R$ 2.350,43** por adulto-equivalente | Pergunta 1 | Metodologia do salário mínimo necessário do DIEESE (ago/2026: R$ 7.565,86 = 3 × cesta de São Paulo ÷ 0,3571). https://www.dieese.org.br/analisecestabasica/salarioMinimo.html | 839,34 ÷ 0,3571. Conferi a fórmula: 3 × 900,59 ÷ 0,3571 = 7.565,8 | Alta (o método) |

### 2.3 Renda e custo de cada persona (por mês)

A conta do custo é sempre: **parte do aluguel + parte das contas + cesta × adultos-equivalentes que a pessoa sustenta**.

| # | Persona | Valor | Fonte | Como foi derivado | Confiança |
|---|---|---|---|---|---|
| 16 | Jonas, renda | **R$ 2.200** | IBGE, PNAD Contínua, *Trabalho por meio de plataformas digitais 2025* (publ. set/2026), p. 10: motociclistas plataformizados, R$ 2.221/mês, 44,9 h/semana, R$ 11,4/h. https://biblioteca.ibge.gov.br/visualizacao/livros/liv102309_informativo.pdf . O IBGE explica que é o valor "retirado", já sem o combustível (Tribuna do Sertão, 07/09/2026) | Arredondado | Alta (média nacional) |
| 17 | Jonas, custo | **R$ 1.760** | 7, 8, 9, 14 | Divide aluguel e contas com a companheira (½ × 1.420 = 710) e paga metade da comida da casa, com uma filha (1,25 × 839,34 = 1.049) → 1.759 | Média |
| 18 | Jonas, parcela da moto | **R$ 480** | Tabela Fipe, set/2026: CG 160 Start 2026, R$ 18.598 (https://www.tabelafipebrasil.com/motos/HONDA/CG-160-START/2026); BCB, SGS 25471: aquisição de veículos, 1,97% a.m. (jun/2026) | 80% financiado (R$ 14.878) em 48 vezes a 1,97% a.m. = R$ 482 | Média |
| 19 | Kauã, renda | **R$ 1.370** | Aliança Bike, *Pesquisa de perfil dos entregadores ciclistas de aplicativo* (São Paulo, 2019): R$ 936/mês, 9 a 12 h/dia, 60% sete dias por semana. https://aliancabike.org.br/pesquisa-de-perfil-dos-entregadores-ciclistas-de-aplicativo/ (citada por Abílio) | 936 × 1,4639 (IPCA) = R$ 1.370 | Média-baixa (São Paulo, 2019, antes da pandemia) |
| 20 | Kauã, custo | **R$ 1.310** | 7, 9, 14 | Mora com a mãe e o irmão: ⅓ de aluguel e contas (473) + a própria comida (839) → 1.313 | Média |
| 21 | Daiane, renda | **R$ 1.500** | GEM Brasil 2018, citado em Carmo et al., Cad. EBAPE.BR, v. 19, n. 1, 2021, p. 19: metade dos negócios fatura até R$ 12 mil por ano, "cerca de um salário mínimo por mês". https://doi.org/10.1590/1679-395120200043 | R$ 1.000/mês × 1,4965 (IPCA) = R$ 1.496. **É faturamento, e o config trata como renda líquida**: a conta favorece a Daiane | Baixa |
| 22 | Daiane, custo | **R$ 1.470** | 7, 14 | Mora na casa da mãe, sem aluguel: ½ das contas (210) + a comida dela e do filho (1,5 × 839,34 = 1.259) → 1.469 | Média |
| 23 | Marcos, renda | **R$ 2.870** | PNAD 2025, p. 9: condutores de automóveis plataformizados, R$ 2.873/mês, 45,9 h/semana, R$ 14,4/h | Arredondado | Alta (média nacional) |
| 24 | Marcos, custo | **R$ 2.630** | 7, 8, 9, 14 | Casa com a esposa e dois filhos (1.420 + 3 × 839,34 = 3.938); ele paga ⅔, a esposa ⅓ → 2.625 | Média |
| 25 | Marcos, manutenção do carro | **R$ 400** | Cebrap/Amobitec, *Painel de acompanhamento dos motoristas e entregadores parceiros, 2ª onda* (2025), p. 47–48: manutenção de R$ 615/mês entre os 65% que declararam. https://static.congressoemfoco.com.br/attachment/2025/11/12/784c6a_Amobitec_CEBRAP_2025.pdf | 0,65 × 615 = R$ 400. **Atenção:** a pesquisa é financiada pela associação das plataformas | Média-baixa |
| 26 | Rose, renda | **R$ 2.100** | CAGED (ago/2025 a jul/2026), via salario.com.br: salário médio de manicure com carteira, R$ 1.802,49, 43 h/semana. https://www.salario.com.br/profissao/manicure-cbo-516120/ ; Abílio (2021), p. 951–952: Clara ganhava mais sem registro do que com o piso | 1.802 × 1,15 ≈ R$ 2.070 → R$ 2.100, já sem comissão do app, material e ônibus. **Não achei dado de renda de manicure por aplicativo** | Baixa |
| 27 | Rose, custo | **R$ 1.970** | 7, 9, 14 | Divide aluguel e contas com o filho adulto (710) + a comida dela e da filha de 15 (1,5 × 839,34 = 1.259) → 1.969 | Média |

**Saldo de um mês comum, sem carta:** Jonas −R$ 40; Kauã +R$ 60; Daiane +R$ 30;
Marcos −R$ 160; Rose +R$ 130.

### 2.4 Decisões

| # | Valor | Onde entra | Fonte | Como foi derivado | Confiança |
|---|---|---|---|---|---|
| 28 | Horas extras do "trabalhar o máximo": Jonas **+R$ 740**, Kauã **+R$ 150**, Daiane **+R$ 500**, Marcos **+R$ 930**, Rose **+R$ 700**; energia −3 | Mês 1, opção a | Ganho-hora da PNAD 2025 (moto R$ 11,4; carro R$ 14,4); para Daiane e Rose, a renda-base ÷ 193,5 h (45 h × 4,3 semanas) | +20 h/semana × 4,3 × 75% do ganho-hora médio. Kauã: só +10 h, porque já trabalha ~70 h. **O fator de 75%** (as horas a mais são as de menos pedido) **é hipótese minha** | Baixa |
| 29 | Corte do mês 2: **15% da renda-base** (Jonas −330, Kauã −205, Daiane −225, Marcos −430, Rose −315) | Mês 2, efeito geral | Ordem de grandeza: PNAD 2025, p. 7 (2022–2025: rendimento dos plataformizados +1,0%, dos demais +10,6%); REMIR (Abílio et al., 2020): 58,9% dos entregadores relataram queda de remuneração e 49,3% corte de bônus. https://pesquisa.ie.unicamp.br/wp-content/uploads/sites/62/2020/06/74-Texto-do-artigo-568-2-10-20200608.pdf | Um corte concentrado num mês, para caber no jogo | Baixa (ilustrativo) |
| 30 | "Aceitar tudo": **+10%** da renda-base, energia −2; "duas plataformas": **+20%**, energia −3; "recusar": 0, energia +1 | Mês 2 | PNAD 2025, p. 12: 37,5% usam dois ou mais apps; p. 13: 78,3% dos entregadores dizem que o app define totalmente o valor; p. 14: 23,1% têm a jornada moldada por ameaça de punição ou bloqueio | Percentuais ilustrativos | Baixa |
| 31 | "Empréstimo e trabalhar mais": **+20%** da renda-base, **−R$ 120** de juros, energia −3 | Mês 3, opção a | BCB: cheque especial ~8% a.m. (mai/2026); rotativo do cartão 440,5% a.a. (dez/2025, Agência Brasil). https://agenciabrasil.ebc.com.br/economia/noticia/2025-12/juros-do-credito-pessoal-e-cartao-rotativo-avancam-para-familias | 8% × R$ 1.500 = R$ 120 | Média-baixa (o 8% veio de resumo de busca; conferir no SGS do BCB) |
| 32 | "Apertar o cinto": **+6%** da parte da pessoa no custo (Jonas +105, Kauã +80, Daiane +90, Marcos +160, Rose +120), energia −1, proteção +1 | Mês 3, opção b | Estimativa | — | Baixa |
| 33 | "Protesto e associação": **um dia sem ganho** (renda ÷ 26) **+ R$ 30** de mensalidade, energia +1, proteção +2 | Mês 3, opção c | Estimativa (a mensalidade) | Jonas −115, Kauã −85, Daiane −90, Marcos −140, Rose −110 | Baixa |
| 34 | Juros quando o saldo passa de −R$ 500: **−R$ 100** por mês | Meses 2 e 3, efeito geral | Mesma fonte de 31 | ~8% a 10% sobre uma dívida de R$ 1.000 a R$ 1.250 | Média-baixa |

### 2.5 Cartas

| # | Carta | Valores | Fonte | Confiança |
|---|---|---|---|---|
| 35 | Acidente: 20 dias parado (grave, meses 2 e 3) | Perde 20/30 da renda (Jonas −1.465, Kauã −915, Daiane −1.000, Marcos −1.915, Rose −1.400); conserto do veículo (moto −300, bike −150, carro −800); remédios −200; energia −2; +1.080 de auxílio se tiver MEI; +400 de vaquinha se entrou na associação no mês 3 | Cebrap/Amobitec (2025), p. 70–71: 22% dos entregadores de moto e 15% dos motoristas tiveram ocorrência de trânsito em 3 meses; afastamentos de até 3 meses, sem previdência. PNAD 2025, p. 9–10: só 19,4% dos motociclistas e 25,5% dos motoristas de app contribuem. Abílio (2021): o irmão de Carlos atropelado | Média (a chance, dramatizada); baixa (conserto e remédios) |
| 36 | Conta bloqueada sem explicação (grave, meses 2 e 3) | Perde 10/30 da renda; +300 se a associação contestou | Abílio (2021), p. 941 ("bloqueio branco" por recusar corridas) e p. 950 (Carlos bloqueado após reclamação de cliente); PNAD 2025, p. 12 e 14. **Não achei a proporção de trabalhadores bloqueados** | Baixa (a chance) |
| 37 | Fui assaltado (grave) | Celular R$ 700 + o dinheiro do dia (renda ÷ 26); energia −1 | Cebrap/Amobitec (2025): 7% dos entregadores e 6% dos motoristas assaltados em 3 meses | Média (a chance); baixa (o valor do celular) |
| 38 | Adoeci: uma semana parado | Perde 7/30 da renda; o MEI novo não cobre | Lei 8.213/1991, art. 25, I | Mecânica (a chance sobe com a energia baixa) |
| 39 | O instrumento de trabalho quebrou | Moto −500, bike −200, celular da Daiane −800, carro −1.200, estufa da Rose −300 | Cebrap/Amobitec (2025): manutenção média de moto R$ 261/mês e de carro R$ 615/mês; um conserto grande ≈ dois meses disso. Bike, celular e estufa: estimativa | Baixa |
| 40 | Uma semana boa | +10% da renda-base; energia −1 | Abílio (2021), p. 941 e 944: bonificações que "nunca estão realmente garantidas"; 12 horas seguidas para ganhar uma bonificação | Ilustrativo |
| 41 | A mobilização arrancou um reajuste (mês 3) | +R$ 150 | Brasil de Fato, 29/04/2025: depois do breque, o iFood subiu R$ 1 por entrega de moto e R$ 0,50 de bike. https://www.brasildefato.com.br/2025/04/29/ifood-anuncia-aumento-entregadores-acham-valor-patetico-e-exigem-negociacao-ate-1o-de-maio/ | Baixa (o valor) |
| 42 | Um mês como os outros | Nada | — | — |

### 2.6 Referência "com carteira assinada" (Jonas)

| # | Valor | Fonte | Confiança |
|---|---|---|---|
| 43 | Salário-base médio de motoboy: **R$ 1.763,45** (43 h/semana, sem adicionais) | CAGED, ago/2025 a jul/2026, via https://www.salario.com.br/profissao/motoboy/ | Média (média nacional; não achei a convenção do Sindimoto-RS) |
| 44 | Periculosidade de **30%** para motociclista | Lei 12.997/2014. https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12997.htm | Alta |
| 45 | INSS 2026: 9% com parcela a deduzir de R$ 24,32 na faixa de R$ 1.621,01 a R$ 2.902,84 | Portaria Interministerial MPS/MF 13/2026, via https://www.contabilizei.com.br/contabilidade-online/tabela-inss/ | Alta |
| 46 | Imposto de renda: **isento** até R$ 5 mil | Lei 15.270/2025, em vigor desde 01/01/2026. https://www12.senado.leg.br/noticias/materias/2025/11/27/sancionada-isencao-do-imposto-de-renda-para-quem-ganha-ate-r-5-mil-por-mes | Alta |

**A conta:**

- Bruto: 1.763,45 × 1,30 = **R$ 2.292,49**. INSS: 2.292,49 × 9% − 24,32 = **R$ 182,00**. Líquido: **R$ 2.110,49** por mês.
- 3 meses de salário líquido: R$ 6.331,45.
- 13º proporcional (3/12 do bruto, com a mesma alíquota efetiva de 7,94%): R$ 527,62.
- Férias proporcionais com um terço (3/12 × bruto × 4/3, mesma alíquota): R$ 703,49.
- Total recebido ou adquirido em 3 meses: **R$ 7.562,56**.
- Menos o mesmo custo de vida do Jonas no app (R$ 1.760 + R$ 480 da moto, × 3 = R$ 6.720): **saldo de R$ 842,56 → R$ 840** no config.
- Ficam de fora, e a favor da carteira: FGTS (8% × R$ 8.214,75 = R$ 657), o aluguel de moto que muitas convenções pagam, e a cobertura do INSS desde o primeiro dia, inclusive para doença depois da carência.

Comparação: o Jonas de app termina com **−R$ 806** no piloto automático e
**+R$ 248** no melhor caminho, com a energia em 0.

### 2.7 Números para os slides (não entram no config)

- PNAD 2025: 2,0 milhões de plataformizados; 34,0% contribuem para a
  previdência, contra 63,0% dos demais; 72,1% informais; 44,7 h por semana
  contra 39,3 h; R$ 16,2 por hora contra R$ 18,4.
- PNAD 2025: motivo principal para trabalhar por app: flexibilidade (26,8%),
  não conseguiu outro trabalho (24,6%), renda maior (20,8%).
- DIEESE, ago/2026: salário mínimo necessário de **R$ 7.565,86**, 4,7 vezes o
  mínimo.
- Fairwork Brasil 2025 (UFRGS, UFRJ, UnB, UFPR): das 10 plataformas avaliadas,
  8 tiraram zero em trabalho decente.
  https://ufpr.br/trabalho-em-plataformas-digitais-no-brasil-segue-marcado-por-exploracao-e-precariedade-aponta-pesquisa/
- Aliança Bike (2019): 71% dos entregadores ciclistas se declaram negros; 59%
  começaram por causa do desemprego.
- Pinheiro-Machado (Café da Manhã, 2024): cerca de 1% dos pequenos perfis saiu
  dessa faixa em quatro meses de acompanhamento.

---

## 3. Personas, opções e cartas

### 3.1 Personas e equipes

| Equipe | Cor e forma | Persona | Descrição (como vai no config) | Energia inicial | Obrigatória |
|---|---|---|---|---|---|
| e1 Laranja | #E69F00, círculo | Jonas | Motoboy, 34 anos, entrega por aplicativo com moto financiada. Divide as contas com a companheira; têm uma filha de 6 anos. | 7 | sim |
| e2 Azul-céu | #56B4E9, triângulo | Jonas | (a mesma) | 7 | sim |
| e3 Verde-azulado | #009E73, quadrado | Kauã | Entregador de bicicleta, 20 anos. Mora com a mãe e o irmão e ajuda em casa. Quer fazer faculdade à noite. | 8 (e −1 por mês: pedalar 11 horas cansa) | não |
| e4 Azul | #0072B2, losango | Daiane | Vende doces e marmitas pelo Instagram, 29 anos. Mãe de um menino de 4 anos, mora na casa da mãe e divide as contas. Paga cursos de marketing digital. | 6 | não |
| e5 Vermelhão | #D55E00, estrela | Marcos | Motorista de aplicativo, 41 anos, carro próprio de 2014. Ex-metalúrgico. A esposa é diarista três dias por semana; têm dois filhos. | 6 | não |
| e6 Roxo-rosado | #CC79A7, cruz | Rose | Manicure por aplicativo, 47 anos. Trabalhou dez anos sem registro num salão. Mora com a filha de 15 e o filho de 23, que divide as contas. | 6 | não |

A ordem das equipes decide quem entra primeiro quando o apresentador abre menos
de 6: com 3 equipes, jogam as duas do Jonas e o Kauã (pergunta 3). A energia
inicial é mecânica de jogo, sem fonte.

### 3.2 Rodadas

**Mês 1: quanto trabalhar?** Quem fica mais tempo online recebe mais pedidos.
Ninguém paga o seu INSS, e a conta do mês não espera. Padrão: **c**.

| | Opção | Narrativa (primeira pessoa) | Tendência |
|---|---|---|---|
| a | Trabalhar o máximo: 12 horas, 7 dias | Fiquei online da manhã até a noite, sete dias. Dormi pouco, comi na rua e não vi minha casa acordada. | mais dinheiro agora; muito menos energia; mais risco |
| b | Jornada de sempre e abrir o MEI | Mantive a rotina e abri o MEI. É dinheiro que falta hoje, mas, se eu me acidentar, tenho o INSS. | um pouco menos agora; proteção se acontecer algo grave |
| c | Jornada de sempre, sem pagar nada | Mantive a rotina e não paguei nada. Sobrou um pouco mais, e continuo sem rede se algo der errado. | o de sempre; nenhuma proteção |

**Mês 2: o app muda a regra.** Sem aviso, a plataforma mudou as regras: paga
menos por pedido e esconde quem recusa demais. Ninguém explica o cálculo.
Efeito geral: corte de 15% (item 29), DAS de quem abriu o MEI e juros de quem
está no vermelho. Padrão: **a**.

| | Opção | Narrativa | Tendência |
|---|---|---|---|
| a | Aceitar tudo para não perder a nota | Aceitei até o que não compensava, para a plataforma não me esconder. Trabalhei mais para ganhar quase o mesmo. | recupera parte do corte; cansa; menos risco de bloqueio |
| b | Recusar o que não paga | Recusei o que não compensava. Descansei um pouco mais, e fiquei com medo de ser bloqueado sem aviso. | descansa; não recupera o corte; mais risco de bloqueio |
| c | Usar duas plataformas ao mesmo tempo | Passei a usar duas plataformas juntas, pulando de uma para a outra. Rendeu mais, e cada cancelamento vira punição. | mais dinheiro; mais estresse; mais risco de punição |

**Mês 3: e agora?** O mês não fecha. Dá para se endividar e rodar mais, apertar
o cinto para ter uma reserva, ou se juntar a quem vive o mesmo. Efeito geral: DAS
e juros. Padrão: **b**.

| | Opção | Narrativa | Tendência |
|---|---|---|---|
| a | Pegar um empréstimo e trabalhar ainda mais | Peguei dinheiro no cheque especial para fechar o mês e trabalhei até de madrugada. | mais dinheiro agora; juros; energia no fim; mais risco |
| b | Apertar o cinto e montar uma reserva | Cortei a carne, o lazer e a internet de casa. Guardei o que deu, para o próximo susto. | guarda um pouco; vida mais apertada |
| c | Parar no protesto e entrar na associação | Parei um dia para a mobilização e entrei na associação. Perdi um dia de ganho e ganhei gente do meu lado. | custa um dia agora; rede de apoio; mais risco de retaliação |

Por que esses padrões: o piloto automático é o que acontece quando ninguém
decide, e nunca é a opção de maior saldo esperado. No mês 1 é seguir sem
contribuir, como fazem 66% dos plataformizados (PNAD); no mês 2, aceitar tudo,
que é o que o algoritmo empurra; no mês 3, apertar o cinto, a saída individual
de sempre.

### 3.3 Cartas

| Carta | Peso-base | Quando | Narrativa | O que muda a fatia |
|---|---|---|---|---|
| Um mês como os outros | 50 | sempre | Nada fora do comum. Fechei o mês no mesmo aperto de sempre. | — |
| Uma semana boa | 12 | sempre | Bati o desafio da semana, veio gorjeta, entrou uma encomenda grande. Não dá para contar com isso no mês que vem. | +6 com "trabalhar o máximo" (mês 1); +3 com "duas plataformas" (mês 2) |
| O instrumento de trabalho quebrou | 10 | sempre | Quebrou o que eu uso para trabalhar. Sem ele, não ganho, e o conserto sai do meu bolso. | +3 com a opção a de cada mês (mais uso, mais desgaste) |
| Adoeci: uma semana parado | 6 | sempre | Tive que parar uma semana. MEI novo não cobre doença: o INSS exige 12 meses de contribuição. | +8 com energia abaixo de 4; mais +8 abaixo de 2 |
| **Acidente: 20 dias parado** (grave) | 2 | meses 2 e 3 | Sofri um acidente e fiquei 20 dias sem poder trabalhar. A plataforma não paga nenhum desses dias. | +3 para quem trabalha na rua (Jonas, Kauã, Marcos); +4 com energia abaixo de 4; +3 com "aceitar tudo" ou "duas plataformas"; +4 com "empréstimo e trabalhar mais" |
| **Conta bloqueada sem explicação** (grave) | 5 | meses 2 e 3 | A plataforma bloqueou minha conta por dez dias. Mandou uma mensagem genérica e nenhum jeito de me defender. | ×0,4 com "aceitar tudo"; +10 com "recusar" (o bloqueio branco); +4 com "duas plataformas"; +3 com "protesto" (retaliação) |
| **Fui assaltado** (grave) | 2 | sempre, menos Daiane | Levaram meu celular e o dinheiro do dia. Fiquei dois dias sem sair de casa. | +2 com "trabalhar o máximo"; +3 com "empréstimo e trabalhar mais" (madrugada) |
| A mobilização arrancou um reajuste | 3 | mês 3 | Depois do protesto, a plataforma subiu o valor mínimo. É pouco, mas veio de quem parou. | +9 com "protesto e associação" |

**Chances do Jonas no caminho do piloto automático** (o validador imprime as das
outras personas; Kauã e Marcos são iguais no começo, Daiane e Rose têm menos
acidente e a Daiane não tem assalto):

| Rodada e opção | Normal | Semana boa | Quebrou | Doença | Acidente | Bloqueio | Assalto | Reajuste |
|---|---|---|---|---|---|---|---|---|
| Mês 1, a | 54,9% | 19,8% | 14,3% | 6,6% | — | — | 4,4% | — |
| Mês 1, b ou c | 62,5% | 15,0% | 12,5% | 7,5% | — | — | 2,5% | — |
| Mês 2, a | 53,8% | 12,9% | 14,0% | 6,5% | 8,6% | 2,2% | 2,2% | — |
| Mês 2, b | 50,0% | 12,0% | 10,0% | 6,0% | 5,0% | 15,0% | 2,0% | — |
| Mês 2, c | 50,0% | 15,0% | 10,0% | 6,0% | 8,0% | 9,0% | 2,0% | — |
| Mês 3, a | 48,5% | 11,7% | 12,6% | 5,8% | 8,7% | 4,9% | 4,9% | 2,9% |
| Mês 3, b | 53,8% | 12,9% | 10,8% | 6,5% | 5,4% | 5,4% | 2,2% | 3,2% |
| Mês 3, c | 47,6% | 11,4% | 9,5% | 5,7% | 4,8% | 7,6% | 1,9% | 11,4% |

Com energia baixa, a doença chega a 20% e o acidente a 11% num mês.

### 3.4 Enquetes

**Entrada** (pareada, revelada só no comparativo, todas de uma vez no telão):

1. Quem trabalha por aplicativo é empreendedor.
2. Com esforço, dá para viver bem trabalhando por aplicativo.
3. A renda de quem trabalha por aplicativo depende mais de sorte do que de esforço.

As duas primeiras tendem a cair depois do seminário, e a terceira tende a subir.
A direção invertida da terceira reduz o efeito de quem concorda com tudo, e ela
mede exatamente o que o jogo mostra.

**Termômetro** (ao vivo, uma por vez). A trilha diz "três afirmações com voto
de 1 a 5", mas não traz o texto; estas são minhas:

1. O aplicativo é o patrão.
2. Carteira assinada é coisa do passado.
3. Quem não prospera por conta própria é porque não se esforçou o suficiente.

A 2 vem da fala de Pinheiro-Machado sobre a carteira vista como "sinônimo de ser
pobre"; a 3, da autorresponsabilização que ela e Carmo et al. descrevem. Todas
têm menos de 110 caracteres.

### 3.5 Roteiros

Os títulos dos blocos são os da trilha (Gancho, Mapa do seminário, Debrief e
teoria, Contraponto, Caminhos, Fim), com o subtítulo tirado da descrição de cada
etapa. Cada mês vem logo depois do trecho que ele ilustra (D-006).

| 60 min | seg | 120 min | seg |
|---|---|---|---|
| lobby | 120 | lobby | 150 |
| enquete de entrada, antes (opcional) | 90 | enquete de entrada, antes (opcional) | 90 |
| Gancho: o lançamento | 210 | Gancho: o lançamento | 270 |
| Mapa do seminário | 240 | Mapa do seminário | 270 |
| formar equipes | 120 | formar equipes | 120 |
| personas | 120 | personas | 120 |
| Debrief e teoria: a conta do entregador | 240 | Debrief e teoria: a conta do entregador | 300 |
| **Mês 1** | 240 | **Mês 1** | 240 |
| Debrief e teoria: gestão por algoritmo | 300 | Debrief e teoria: gestão por algoritmo | 360 |
| **Mês 2** | 240 | **Mês 2** | 240 |
| Contraponto: a Viração e os dados sobre CLT | 300 | Debrief e teoria: quiz anúncio ou conteúdo | 480 |
| Caminhos: regulação, proteção, organização e educação | 240 | Contraponto: a Viração e os dados sobre CLT | 300 |
| **Mês 3** | 240 | Contraponto: entrevistas em Porto Alegre | 600 |
| placar final | 180 | Caminhos: regulação, proteção, organização e educação | 240 |
| Termômetro | 360 | **Mês 3** | 240 |
| enquete de entrada, depois (Medição) | 90 | placar final | 180 |
| comparativo | 150 | Debrief e teoria: mapa do patrão em grupos | 900 |
| Fim: quem é o patrão? | 120 | Caminhos: convidado com perguntas | 1200 |
| fim | — | Termômetro | 540 |
| | | enquete de entrada, depois (Medição) | 90 |
| | | comparativo | 150 |
| | | Fim: quem é o patrão? | 120 |
| | | fim | — |
| **Total** | **3.600** | **Total** | **7.200** |

O roteiro de 120 min traz os quatro extras do "pacote de 2 horas" da trilha:
mapa do patrão, quiz, entrevistas e convidado.

---

## 4. Contas de valor esperado

**Método.** Para cada persona, enumerei todos os caminhos de cartas (até
8 × 8 × 8 por combinação de decisões) com as chances de cada carta naquele
estado, e apliquei os efeitos na ordem do contrato: persona, efeito geral,
opção, carta, com as condições lendo o estado de antes do mês. "Valor esperado"
é a média ponderada pelas chances. O validador (`npm run validar`) chega aos
mesmos números.

**Uma conta à mão (Jonas, mês 1, estado inicial).**

- Sem carta: 2.200 − 1.760 − 480 = **−R$ 40**.
- Opção c: cartas = 15% × 220 (semana boa) + 12,5% × (−500) (quebrou) + 7,5% ×
  (−515) (doença) + 2,5% × (−785) (assalto) = 33,0 − 62,5 − 38,6 − 19,6 =
  **−R$ 87,7**. Mês: −40 − 87,7 = **−R$ 127,7**.
- Opção a: −40 + 740 = 700; cartas = 19,8% × 220 + 14,3% × (−500) + 6,6% ×
  (−515) + 4,4% × (−785) = 43,5 − 71,4 − 34,0 − 34,5 = −96,4. Mês: **+R$ 603,6**,
  com a energia de 7 para 4.
- Opção b: −40 − 86 − 87,7 = **−R$ 213,7**, com a proteção em 3.
- **Acidente no mês 2, com e sem MEI:** −1.465 − 300 − 200 = −R$ 1.965 sem MEI;
  com MEI, +1.080 de auxílio: −R$ 885. O MEI custa R$ 258 nos 3 meses (3 × 86) e
  devolve R$ 1.080 se a carta sair.

### 4.1 Uma decisão por vez (as outras rodadas no piloto automático)

Saldo esperado ao fim dos 3 meses; entre parênteses, a energia e a proteção esperadas no fim. `*` = padrão da rodada.

**Mês 1: quanto trabalhar?**

| Persona | a: Trabalhar o máximo: 12 horas, 7 dias | b: Jornada de sempre e abrir o MEI | c*: Jornada de sempre, sem pagar nada |
|---|---|---|---|
| Jonas | −R$ 101 (0,5; 1,0) | −R$ 904 (2,2; 4,0) | −R$ 806 (2,2; 1,0) |
| Kauã | −R$ 110 (0,0; 1,0) | −R$ 299 (0,5; 4,0) | −R$ 228 (0,5; 1,0) |
| Daiane | R$ 11 (0,0; 1,0) | −R$ 577 (1,4; 4,0) | −R$ 453 (1,4; 1,0) |
| Marcos | −R$ 826 (0,0; 1,0) | −R$ 1.762 (1,3; 4,0) | −R$ 1.656 (1,3; 1,0) |
| Rose | R$ 546 (0,0; 1,0) | −R$ 201 (1,3; 4,0) | −R$ 56 (1,3; 1,0) |

**Mês 2: o app muda a regra**

| Persona | a*: Aceitar tudo para não perder a nota | b: Recusar o que não paga | c: Usar duas plataformas ao mesmo tempo |
|---|---|---|---|
| Jonas | −R$ 806 (2,2; 1,0) | −R$ 1.002 (5,3; 1,0) | −R$ 642 (1,3; 1,0) |
| Kauã | −R$ 228 (0,5; 1,0) | −R$ 317 (3,3; 1,0) | −R$ 99 (0,0; 1,0) |
| Daiane | −R$ 453 (1,4; 1,0) | −R$ 547 (4,5; 1,0) | −R$ 292 (0,5; 1,0) |
| Marcos | −R$ 1.656 (1,3; 1,0) | −R$ 1.822 (4,3; 1,0) | −R$ 1.360 (0,5; 1,0) |
| Rose | −R$ 56 (1,3; 1,0) | −R$ 220 (4,4; 1,0) | R$ 129 (0,5; 1,0) |

**Mês 3: e agora?**

| Persona | a: Pegar um empréstimo e trabalhar ainda mais | b*: Apertar o cinto e montar uma reserva | c: Parar no protesto e entrar na associação |
|---|---|---|---|
| Jonas | −R$ 677 (0,5; 0,0) | −R$ 806 (2,2; 1,0) | −R$ 961 (4,3; 2,0) |
| Kauã | −R$ 205 (0,0; 0,0) | −R$ 228 (0,5; 1,0) | −R$ 323 (2,2; 2,0) |
| Daiane | −R$ 416 (0,0; 0,0) | −R$ 453 (1,4; 1,0) | −R$ 569 (3,4; 2,0) |
| Marcos | −R$ 1.472 (0,0; 0,0) | −R$ 1.656 (1,3; 1,0) | −R$ 1.869 (3,2; 2,0) |
| Rose | R$ 57 (0,0; 0,0) | −R$ 56 (1,3; 1,0) | −R$ 229 (3,3; 2,0) |

### 4.2 Caminhos inteiros

| Persona | Piloto automático (cab) | Melhor saldo esperado | Pior saldo esperado | Com MEI (bab) | Pior caso sem MEI | Pior caso com MEI | P(saldo < 0) no piloto | Variância explicada pelas decisões |
|---|---|---|---|---|---|---|---|---|
| Jonas | −R$ 806 | aca: R$ 248 (energia 0,0) | bbc: −R$ 1.347 (energia 7,4) | −R$ 904 | −R$ 5.040 | −R$ 3.138 | 83% | 23% |
| Kauã | −R$ 228 | aca: R$ 50 (energia 0,0) | bbc: −R$ 585 (energia 5,4) | −R$ 299 | −R$ 3.295 | −R$ 2.533 | 57% | 8% |
| Daiane | −R$ 453 | aca: R$ 214 (energia 0,0) | bbc: −R$ 881 (energia 6,5) | −R$ 577 | −R$ 3.295 | −R$ 2.741 | 63% | 19% |
| Marcos | −R$ 1.656 | aca: −R$ 315 (energia 0,0) | bbc: −R$ 2.221 (energia 6,4) | −R$ 1.762 | −R$ 7.695 | −R$ 5.793 | 97% | 14% |
| Rose | −R$ 56 | aca: R$ 862 (energia 0,0) | bbc: −R$ 640 (energia 6,5) | −R$ 201 | −R$ 3.775 | −R$ 2.393 | 42% | 29% |

**O que as tabelas mostram:**

1. **Nenhuma boa decisão cobre com folga o custo de vida.** O melhor caminho de
   cada persona (sempre a-c-a: trabalhar o máximo, duas plataformas, empréstimo)
   termina entre −R$ 315 e +R$ 862 em 3 meses, **com a energia em 0**.
2. **Nenhuma opção vence em todos os indicadores.** Em cada rodada, quem ganha
   em saldo perde em energia ou em proteção (mas veja o item 5).
3. **A proteção custa no curto prazo e salva na carta grave.** O MEI tira de R$ 70
   a R$ 150 do saldo esperado e melhora o pior caso em R$ 550 (Daiane) a
   R$ 1.900 (Jonas e Marcos).
4. **A decisão muda as fatias:** o acidente vai de 5% para 8% a 11%, e o
   bloqueio vai de 2% ("aceitar tudo") para 15% ("recusar").
5. **Onde a calibragem ficou fora do sugerido** (avisos do validador, que não
   bloqueiam a sala):
   - as cartas explicam de 71% a 92% da variância do saldo; a arquitetura
     sugere que as decisões expliquem de 30% a 60%;
   - para Jonas e Rose, "trabalhar o máximo" vence as outras opções do mês 1 em
     saldo em cerca de 75% a 80% das partidas.

   Testei três ajustes: carta "normal" mais pesada, penalidade de cansaço e
   menos horas extras. O que melhora um aviso piora o outro: com a carta normal
   em 90, as decisões sobem para 12% a 36%, e "trabalhar o máximo" passa a
   vencer em até 86% das partidas. A escolha é de produto (perguntas 6 e 7).
6. **Kauã quase não decide**: as decisões explicam só 8% do saldo dele, porque
   um assalto ou um acidente levam meio mês do que ele ganha. É fiel ao dado (a
   bike é a base da pirâmide, em Abílio) e pode virar conversa no debrief.
7. **A organização coletiva sai com o menor saldo do mês 3** para todas as
   personas: custa um dia agora, e o ganho (o reajuste, a rede de apoio) é
   incerto e vale para todos, inclusive para quem não parou (pergunta 8).

---

## 5. Perguntas para o Kleberson validar

1. **Qual régua de custo de vida?**
   - *Por que importa:* define se as personas fecham o mês perto de zero ou
     sempre muito no vermelho.
   - *Opções:*
     - (a) a do mínimo, que está no config: aluguel, comida e contas;
     - (b) a do DIEESE, o salário mínimo necessário (R$ 2.350 por
       adulto-equivalente). Com ela, por mês: Jonas −R$ 1.218, Kauã −R$ 980,
       Daiane −R$ 2.026, Marcos −R$ 2.231, Rose −R$ 1.426. Nenhuma decisão chega
       perto de zero;
     - (c) a do mínimo no jogo, e a do DIEESE num slide do debrief.
   - *Recomendo:* (c).
2. **Qual persona tem duas equipes?**
   - *Por que importa:* é a comparação que mostra a sorte ao vivo (D-004).
   - *Opções:*
     - (a) Jonas, motoboy (proposto);
     - (b) Kauã, bike, o "grande símbolo" para a Abílio; mas nele as decisões
       quase não pesam, e a comparação vira só sorte;
     - (c) Marcos, motorista, o maior grupo da PNAD (58,9% dos plataformizados).
3. **Com menos de 6 equipes, quem fica?**
   - *Por que importa:* o preenchimento segue a ordem do config.
   - *Opções:*
     - (a) Jonas, Jonas, Kauã, Daiane, Marcos, Rose (proposto);
     - (b) pôr Daiane em terceiro, porque ela conversa com o Gancho (lançamento
       encenado) e com Pinheiro-Machado;
     - (c) marcar mais uma equipe como obrigatória.
4. **A renda da Rose e a da Daiane servem?**
   - *Por que importa:* são as de menor confiança. Não achei renda de manicure
     por app, e a da Daiane é faturamento tratado como renda.
   - *Opções:*
     - (a) manter e dizer em sala que é estimativa;
     - (b) você passa um valor de referência de Porto Alegre;
     - (c) trocar a Rose por uma diarista por aplicativo (serviços gerais, 16%
       dos plataformizados), também sem dado de renda.
5. **O Kauã usa um dado de 2019 de São Paulo corrigido pelo IPCA (R$ 1.370).**
   - *Por que importa:* é abaixo do salário mínimo. O caso do Carlos, em Abílio,
     sugere mais (R$ 100 por dia útil em 2020).
   - *Opções:*
     - (a) manter, com a ressalva no slide;
     - (b) usar o caso do Carlos (R$ 100 por dia útil e R$ 150 no fim de
       semana, em 2020): corrigido pelo IPCA, dá de R$ 4.300 a R$ 4.900 por mês,
       com 12 h por dia e 6 a 7 dias. É um caso só, e o Kauã passaria a ser a
       persona de maior renda.
6. **Quanto a sorte pode pesar?**
   - *Por que importa:* hoje as cartas explicam de 71% a 92% da variância; a
     faixa da arquitetura (decisões entre 30% e 60%) equivale a cartas entre 40%
     e 70%. Sorte demais faz a decisão parecer inútil.
   - *Opções:*
     - (a) manter: é a mensagem do seminário;
     - (b) carta "normal" com peso 90: as decisões sobem para 12% a 36%, com
       menos cartas marcantes em sala (cerca de 1 em 3 meses, em vez de 1 em 2);
     - (c) reduzir as perdas das cartas graves.
7. **"Trabalhar o máximo" sai na frente em dinheiro em 75% a 80% das partidas
   (Jonas e Rose).**
   - *Por que importa:* risco de a turma ler "quem se esforça ganha" (risco R12
     da arquitetura), embora a energia termine em 0.
   - *Opções:*
     - (a) manter e mostrar a energia no placar (a tecla C troca o critério);
     - (b) menos horas extras (fator de 50% em vez de 75%): o aviso some, as
       decisões passam a explicar de 7% a 20% do saldo, e o melhor caminho fica
       perto de zero (Marcos −R$ 657, Rose +R$ 625);
     - (c) penalidade de cansaço nos meses 2 e 3 (−10% da renda com energia
       abaixo de 4) e fator de 60%: o aviso some, as decisões explicam de 4% a
       12%, e o melhor caminho fica negativo para todos, menos a Rose.
8. **A organização coletiva perde em saldo no mês 3. Proposital?**
   - *Por que importa:* pode soar como "organizar-se não compensa", o contrário
     do bloco Caminhos.
   - *Opções:*
     - (a) manter e discutir no debrief: o jogo só tem 3 meses e só mede a sua
       equipe, e a conquista vale para todos;
     - (b) reajuste maior, R$ 400 em vez de R$ 150;
     - (c) a conquista valer para todas as equipes quando alguma parar. Isso
       exige mudança no motor, porque hoje uma carta só atinge quem a tirou.
9. **O corte do mês 2 de 15% está bom?**
   - *Por que importa:* é o número mais ilustrativo do jogo.
   - *Opções:* 10%, 15% ou 20%.
10. **As chances das cartas graves estão dramatizadas.**
    - *Por que importa:* o acidente de 20 dias sai em 5% a 11% dos meses, e a
      pesquisa Cebrap/Amobitec dá 22% de ocorrências em 3 meses, a maioria
      leves.
    - *Opções:*
      - (a) manter e avisar em sala que foi exagerado para caber em 3 rodadas;
      - (b) baixar para 3% a 6%.
11. **A referência com carteira assinada está boa?**
    - *Por que importa:* é a comparação mais forte do placar (R$ 840 contra
      −R$ 806 do Jonas de app).
    - *Opções:*
      - (a) manter o salário médio nacional do CAGED;
      - (b) você consegue a convenção do Sindimoto-RS (piso de Porto Alegre e
        aluguel de moto), e eu refaço a conta;
      - (c) incluir o FGTS (R$ 657).
12. **"Saldo acumulado" no lugar de "Renda acumulada"?**
    - *Por que importa:* o número é renda menos custo de vida; chamar de renda
      confunde.
    - *Opções:* (a) "Saldo acumulado"; (b) "Sobrou no fim do mês"; (c) manter
      "Renda acumulada".
13. **As 6 afirmações servem?**
    - *Por que importa:* são o antes e depois do seminário.
    - *Opções:*
      - (a) aprovar como estão;
      - (b) trocar a 3 da entrada ("sorte do que esforço"), se parecer que
        induz a resposta;
      - (c) você manda as que o grupo já tinha pensado.
14. **O roteiro de 60 min aperta o Termômetro para 6 min** (a trilha dava 12).
    - *Por que importa:* o jogo espalhado custa uns 22 min, e não 15.
    - *Opções:*
      - (a) manter;
      - (b) Termômetro com 2 afirmações (o corte que a trilha prevê);
      - (c) cortar o Contraponto para 3 min.
15. **Raça e gênero nas personas.**
    - *Por que importa:* os dados existem (71% dos ciclistas se declaram negros;
      a base do empreendedorismo digital é de mulheres negras), mas pôr isso na
      descrição de uma persona pode soar como estereótipo.
    - *Opções:*
      - (a) deixar fora das personas e levar o dado para o slide;
      - (b) pôr na descrição.
16. **As estimativas sem fonte servem?**
    - *Por que importa:* são as de confiança baixa.
    - *Quais são:* água (R$ 80), celular (R$ 60 por mês; R$ 700 para comprar),
      consertos (moto, bike, carro, estufa, celular), remédios (R$ 200),
      mensalidade da associação (R$ 30), o fator de 75% das horas extras e o
      "apertar o cinto" de 6%.
    - *Opções:* (a) aprovar; (b) você passa valores de Porto Alegre.

---

## 6. O que o validador disse (calibragem de 28/09)

> **Tudo desta seção é sugestão para validar com o Kleberson.** Nenhum valor,
> texto ou peso do `config.json` foi mudado.

- **O que rodei:** `node bin/validar-config.mjs config.json`, sobre a versão
  `2026-09-28-rascunho` (hash `185c595d`).
- **Formato:** 0 erros. Nada foi corrigido no `config.json`.
- **Equilíbrio:** 7 avisos, que não bloqueiam a sala.
- **Como medi as sugestões:** com o mesmo algoritmo do validador (enumeração
  exata), num script fora do repositório, sobre cópias do config. No config atual,
  o script dá os mesmos números do validador. O pacote C (seção 6.6) também foi
  conferido no validador oficial: hash `b5453314`, 0 erros e 3 avisos. Para
  reproduzir, basta aplicar os valores a uma cópia e rodar
  `node bin/validar-config.mjs copia.json`.

### 6.1 Os 7 avisos

| # | Conferência | O que o validador disse |
|---|---|---|
| 1 | (c) opção dominante | Jonas, mês 1: "trabalhar o máximo" vence em saldo com probabilidade de 80,1% contra b e de 75,3% contra c |
| 2 | (c) opção dominante | Rose, mês 1: "trabalhar o máximo" vence em saldo com 82% contra b e 75% contra c |
| 3 a 7 | (e) variância | As decisões explicam só isto da variância do saldo final: Jonas 23,2%, Kauã 7,9%, Daiane 18,7%, Marcos 14,1% e Rose 29,1%. A faixa sugerida é de 30% a 60% |

O que **não** deu aviso:
- **(c)** Daiane e Marcos ficam logo abaixo do limite de 70% no mês 1: o
  "trabalhar o máximo" vence em saldo com 69,6% e 68,5% contra a opção mais
  próxima;
- **(d)** o padrão nunca é a opção de maior saldo esperado, então o piloto
  automático não premia quem não votou;
- **(f)** a energia chega a 0 em 40,6% das partidas, mas tem consequência,
  porque doença e acidente ficam mais prováveis. O saldo e a proteção nunca
  batem no mínimo.

### 6.2 Tabela de chances, resumida

Resumo da seção (a) do validador. A coluna "chance média" traz a menor e a maior
entre todas as combinações de persona, mês e opção. A última coluna traz o
extremo quando a chance muda com o estado (a energia). A tabela completa, por
persona, sai em `npm run validar`. A do Jonas no piloto automático está na
seção 3.3.

| Carta | Meses | Chance média | Extremos por estado |
|---|---|---|---|
| Um mês como os outros | 1, 2 e 3 | 43,2% a 64,1% | 40% a 64,1% |
| Uma semana boa | 1, 2 e 3 | 10,4% a 20,7% | 9,6% a 20,7% |
| O instrumento quebrou | 1, 2 e 3 | 8,6% a 14,9% | 8% a 14,9% |
| Adoeci | 1, 2 e 3 | 6,5% a 13,9% | 5,7% a 20,4% |
| Fui assaltado | 1, 2 e 3 | 1,7% a 4,5% | 1,6% a 5% |
| Acidente (grave) | 2 e 3 | 3,2% a 10,3% | 2% a 11,4% |
| Conta bloqueada (grave) | 2 e 3 | 2,1% a 15,2% | 1,9% a 15,8% |
| Reajuste | 3 | 2,6% a 10,9% | 2,4% a 12% |

### 6.3 Saldo esperado no fim do jogo, por opção

É a conferência (c) do validador: a opção escolhida vale naquele mês, e os
outros meses são decididos ao acaso. Por isso os números diferem dos da seção
4.1, que põe os outros meses no piloto automático. `*` marca o padrão. Valores
em R$.

| Persona | Mês 1 a | Mês 1 b | Mês 1 c* | Mês 2 a* | Mês 2 b | Mês 2 c | Mês 3 a | Mês 3 b* | Mês 3 c |
|---|---|---|---|---|---|---|---|---|---|
| Jonas | **−83** | −939 | −824 | −607 | −815 | −424 | −468 | −611 | −767 |
| Kauã | −123 | −334 | −242 | −234 | −359 | −106 | −178 | −209 | −312 |
| Daiane | 7 | −600 | −460 | −363 | −487 | −203 | −278 | −325 | −449 |
| Marcos | −789 | −1.736 | −1.627 | −1.422 | −1.620 | −1.110 | −1.184 | −1.373 | −1.595 |
| Rose | **540** | −235 | −73 | 80 | −116 | 270 | 219 | 97 | −83 |

### 6.4 Por que os dois tipos de aviso brigam entre si

1. **De onde vem o peso das decisões.** No mês 1, "trabalhar o máximo" abre uma
   distância grande das outras duas opções: no Jonas, −R$ 83 contra −R$ 824 e
   −R$ 939. Essa distância é a maior parte da variância que as decisões
   explicam. Encolher a distância tira o aviso de dominância, mas também derruba
   o peso das decisões: com o fator de 50% da pergunta 7, elas passam a explicar
   de 7% a 20%.
2. **De onde vem o peso da sorte.** Quase todo vem da carta do acidente. Medi
   zerando só o efeito dela no saldo, com os pesos iguais, para as chances das
   outras cartas não mudarem. A parte das decisões sobe assim:

   | Persona | Hoje | Sem o efeito do acidente no saldo |
   |---|---|---|
   | Jonas | 23% | 48% |
   | Kauã | 8% | 29% |
   | Daiane | 19% | 30% |
   | Marcos | 14% | 34% |
   | Rose | 29% | 50% |

   Fazendo o mesmo com cada uma das outras cartas, a parte das decisões muda no
   máximo 4,5 pontos (a doença, na Rose), com uma exceção: sem o celular da
   Daiane (R$ 800, carta "O instrumento quebrou"), a parte dela vai de 19% para
   31%.
3. **Tirar sorte sozinho piora a dominância.** Com menos ruído, a vantagem do
   "trabalhar o máximo" aparece mais. Tanto a carta normal com peso 90 quanto o
   acidente mais raro levam o aviso de dominância de 2 para 4 personas.
4. **A saída sem briga:** em cada mês, duas opções perto uma da outra em saldo
   e uma bem abaixo, com a diferença paga em energia, proteção ou risco. Assim
   as decisões pesam, porque a opção de baixo puxa a variância, e nenhuma opção
   vence sozinha. O mês 2 já está quase assim: "aceitar tudo" e "duas
   plataformas" ficam perto, e "recusar" é a que pode ficar abaixo.

### 6.5 Sugestões, uma por uma (cada uma a validar com o Kleberson)

**S1. Acidente mais raro** (é a opção b da pergunta 10).
- **O que muda na carta `acidente`:**
  - peso de 2 para 1;
  - ajuste de quem trabalha na rua: de +3 para +1;
  - ajuste de energia abaixo de 4: de +4 para +2;
  - ajuste de "aceitar tudo" e "duas plataformas": de +3 para +2;
  - ajuste de "empréstimo e trabalhar mais": de +4 para +2.
- **Chance por mês:** passa de 2% a 11,4% para 1% a 6,1%. Fica mais perto da
  pesquisa Cebrap/Amobitec do item 35, que dá 22% de ocorrências em 3 meses, a
  maioria leves.
- **Efeito, sozinha:**
  - as decisões passam a explicar de 14% a 37% (Jonas 32% e Rose 37% entram na
    faixa);
  - a dominância do mês 1 passa a aparecer em 4 personas: Jonas 85%, Rose 86%,
    Daiane 79% e Marcos 77%;
  - o piloto automático da Rose vai de −R$ 56 para +R$ 20;
  - o MEI passa a custar de R$ 168 a R$ 202 no valor esperado (hoje, de R$ 72 a
    R$ 145). O pior caso que ele evita não muda: continua melhorando de R$ 554 a
    R$ 1.902.
- **Só funciona junto com a S2.**

**S2. Menos horas extras no mês 1** (é uma versão mais leve da opção b da
pergunta 7).
- **O que muda na opção a do mês 1:** o fator vai de 75% para 53%, ou seja, os
  valores de hoje × 0,7:
  - Jonas: de 740 para 520;
  - Kauã: de 150 para 105;
  - Daiane: de 500 para 350;
  - Marcos: de 930 para 650;
  - Rose: de 700 para 490.
- **Por que 53%:** com 60% (× 0,8), os dois avisos de dominância continuam.
  Com 56% (× 0,75), eles já somem, mas a folga fica em décimos: 69,7% na Rose
  com a S2 sozinha, e 69,7% no Jonas no pacote C. Com 53%, a maior chance que
  sobra no pacote C é 69,0% (Jonas, mês 1). A folga é pequena em qualquer corte
  (seção 6.4), e uma edição posterior pode trazer o aviso de volta.
- **Base:** o fator de 75% já é hipótese minha (item 28, confiança baixa).
- **Efeito, sozinha:**
  - 5 avisos continuam, e as decisões explicam de 7% a 21%;
  - o melhor caminho encolhe: Jonas de R$ 248 para R$ 27, Rose de R$ 862 para
    R$ 650 e Marcos de −R$ 315 para −R$ 622.

**S3. "Recusar o que não paga" também custa renda** (mês 2, opção b).
- **O que muda:** a opção passa de 0 para −20% da renda-base, com o rótulo
  "recusei o que não pagava: a plataforma passou a me oferecer menos pedidos":
  - Jonas: −440;
  - Kauã: −275;
  - Daiane: −300;
  - Marcos: −575;
  - Rose: −420.
- **Base:** o "bloqueio branco" descrito por Abílio (2021, p. 941): quem recusa
  passa a receber menos pedidos. Hoje o jogo só representa a chance de 15% de
  um bloqueio total de 10 dias.
- **Efeito, sozinha:**
  - as decisões passam a explicar de 22% a 41% (Jonas 33% e Rose 41% entram na
    faixa);
  - os 2 avisos de dominância continuam (Jonas 77% e 73%; Rose 79% e 72%);
  - com −15% em vez de −20%, as decisões ficam entre 17% e 38%.
- **Risco:** "recusar" vira a pior opção do mês 2, com folga. Isso pode soar
  como "resistir não compensa". É a tese do bloco "Gestão por algoritmo", mas é
  o mesmo tipo de dúvida da pergunta 8.
- **Se entrar:** considerar baixar o ajuste do bloqueio para "recusar" de +10
  para +5, para a punição não contar duas vezes. Medido no pacote C: muda a
  parte das decisões em no máximo 1 ponto.

**S4. Celular da Daiane mais barato** (opcional, só se quiser a Daiane dentro da
faixa).
- **O que muda:** na carta "O instrumento quebrou", o celular da Daiane vai de
  −800 para −400: conserto da tela, em vez de celular novo.
- **Base:** hoje é estimativa sem fonte (item 39).
- **Efeito, junto com o pacote C:**
  - a parte das decisões da Daiane vai de 26% para 41%;
  - o piloto automático dela vai de −R$ 397 para −R$ 210.

**O Marcos fica abaixo da faixa em qualquer pacote (24% no C).** As perdas dele
são grandes perto do que as decisões movem: R$ 1.200 no conserto do carro e
R$ 2.915 no acidente. Pôr o Marcos na faixa exigiria encolher valores do carro
que são estimativa, e sem fonte melhor não recomendo.

### 6.6 Pacotes medidos

| Pacote | O que muda | Avisos | As decisões explicam | Piloto automático (saldo esperado) | Melhor caminho (energia no fim) |
|---|---|---|---|---|---|
| **A. Manter** | nada | 7 | 8% a 29% | −R$ 1.656 a −R$ 56; todas as personas no vermelho | −R$ 315 a +R$ 862 (energia 0) |
| **B. Só tirar a vitória fácil** | S2 | 5, todos de variância | 7% a 21% | igual ao A | −R$ 622 a +R$ 650 (energia 0) |
| **C. A decisão pesa, sem vitória fácil** | S1 + S2 + S3 | 3: Kauã 29%, Daiane 26% e Marcos 24% | 24% a 42% | −R$ 1.421 a +R$ 20; a Rose sai do vermelho por R$ 20 | −R$ 345 a +R$ 761 (energia 0) |
| **C + S4** | S1 + S2 + S3 + S4 | 2: Kauã e Marcos | 24% a 42% | −R$ 1.421 a +R$ 20 | −R$ 345 a +R$ 761 (energia 0) |

**O pacote C, persona por persona** (A → C):

| Persona | As decisões explicam | Piloto automático | P(saldo < 0) no piloto | Melhor caminho (a-c-a) |
|---|---|---|---|---|
| Jonas | 23,2% → 36,7% | −R$ 806 → −R$ 658 | 83% → 82% | R$ 248 → R$ 201 |
| Kauã | 7,9% → 29,1% | −R$ 228 → −R$ 120 | 57% → 53% | R$ 50 → R$ 119 |
| Daiane | 18,7% → 26,2% | −R$ 453 → −R$ 397 | 63% → 61% | R$ 214 → R$ 145 |
| Marcos | 14,1% → 24,2% | −R$ 1.656 → −R$ 1.421 | 97% → 97% | −R$ 315 → −R$ 345 |
| Rose | 29,1% → 42,2% | −R$ 56 → +R$ 20 | 42% → 39% | R$ 862 → R$ 761 |

**O que o pacote C mantém:**
- o melhor caminho de cada persona continua sendo a-c-a, e termina com a energia
  em 0;
- nenhum padrão vira a opção de maior saldo;
- nenhuma opção vence em saldo com mais de 70% contra as outras duas, mas com
  folga pequena: a maior chance que sobra é 69,0% (Jonas, mês 1);
- o pior caso não muda, porque o acidente continua possível.

**O que o pacote C troca:**
- o acidente sai em 1% a 6,1% dos meses, em vez de 2% a 11,4%;
- o MEI fica mais caro no valor esperado (veja a S1);
- "recusar" passa a custar renda;
- a Rose fecha o piloto automático em +R$ 20, e com isso "todas no vermelho no
  piloto" deixa de valer para ela.

### 6.7 O que cada resposta em aberto faz com os avisos

Medido com a mesma conta, uma resposta por vez sobre o config atual.

| Pergunta e opção | Avisos | Efeito |
|---|---|---|
| 6 (b): carta normal com peso 90 | 7 | As decisões explicam de 13% a 37%, e a dominância passa para 4 personas, até 86%. O piloto da Rose vira +R$ 82 |
| 7 (b): fator de 50% nas horas extras | 5 | As decisões explicam de 7% a 20%. Melhor caminho: Marcos −R$ 657, Rose +R$ 625 |
| 7 (c): cansaço (−10% com energia abaixo de 4) e fator de 60% | 5 | As decisões explicam de 4% a 12%. O piloto piora para todos (Marcos −R$ 1.941, Rose −R$ 266) |
| 8 (b): reajuste de R$ 400 | 7 | Quase nada muda: quem para ganha uns R$ 27 a mais no valor esperado, e a organização continua com o menor saldo do mês 3. As decisões caem até 1 ponto |
| 9: corte de 10% no mês 2 | 7 | A variância não muda. O piloto da Rose vira +R$ 50 |
| 9: corte de 20% no mês 2 | 7 | A variância não muda. O melhor caminho do Kauã fica em −R$ 21 |
| 10 (b): acidente de 3% a 6% | 7 | É a S1 sozinha (veja acima) |

### 6.8 A decisão que fica para o Kleberson

- **Se a faixa de 30% a 60% continua sendo a meta:** sugiro o pacote C. Ele
  também aproxima a chance do acidente da pesquisa (pergunta 10).
- **Se a meta é só tirar o risco de "quem se esforça ganha"** (R12): basta o
  pacote B.
- **Se a mensagem "a sorte pesa mais que a decisão" é o objetivo** (D-009): o
  pacote A se sustenta. Nesse caso, vale decidir também se a faixa do validador
  (`FAIXA_DECISOES` em `bin/validar-config.mjs`) continua em 30% a 60%, para os
  avisos não virarem ruído a cada edição.
