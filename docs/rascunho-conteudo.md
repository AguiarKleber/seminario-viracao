# Rascunho do conteúdo do jogo (esquema v2.1, com a proteção da D-059)

> **RASCUNHO v2.2 — a validar.** Nada daqui entra no seminário sem a validação do
> Kleberson (D-005). Cada número tem a fonte ao lado. Onde não há dado, está
> escrito **"estimativa sem fonte"**, e a confiança é baixa (como na D-034). O que
> mudou no v2.2 (D-058 e D-059) está na **seção 0**; o que ainda depende de decisão
> está na seção 0.8 e na seção 8.
>
> **Em destaque (revisão da F5, 29/09 à noite): o config que vai para o teste de
> 30/09 NÃO cumpre a D-058.** Você escolheu a opção (a), picos reais com fonte, e
> com eles 0 personas chegam à faixa de 5% a 10% (Jonas 0,01% e Marcos 0,1% ao
> acaso). As saídas com número mudam a própria D-058: seção 0.8, item 1.

- **Data:** 29/09/2026 (noite).
- **Arquivo do conteúdo:** [`config.json`](../config.json), `versao`
  `2026-09-29-v2.2-rascunho`, hash `71e61ab8` (depois da revisão da F5; antes dela, `cdea3d43`). O v2.1 era o hash `42bfc0d8`. Os
  textos de `fonte` do config resumem as tabelas da seção 2 e nunca aparecem no telão.
- **Esquema:** v2.1 (contratos, seção 1), mais o que a D-059 acrescentou:
  `categoria: "protecao"` (o dinheiro que chega por causa de uma proteção, mostrado
  à parte: "a proteção pagou R$ X") e `opcao.protege` (o placar refaz o pior caso
  sem ela). Por cima do v2 (básico da casa no fim do mês, juros sobre a dívida de
  antes), o mês separa:
  - o **trabalho variável** (o único que uma carta pode multiplicar);
  - os **custos fixos** do trabalho (`fixo: true`: parcela da moto, DAS do MEI,
    curso da Daiane, mensalidade da associação, parcela do empréstimo);
  - os **gastos** de um evento (`categoria: "gasto"`: conserto, remédio,
    fisioterapia, celular roubado, multa do aluguel, o que ainda se deve do
    empréstimo), que ficam fora do "entrou".
  - a **proteção** (`categoria: "protecao"`, v2.2: o auxílio do INSS pago ao MEI),
    também fora do "entrou". A liminar da associação voltou a ser trabalho na
    revisão da F5 (seção 0.6b).
  - Na tela: "entrou = trabalho − custos fixos + outra renda" e
    "saldo do mês = entrou + proteção − gastos − básico − juros".
  - **Piso do trabalho** (`regras.pisoTrabalho`, 2ª rodada): o trabalho variável
    nunca fica abaixo de R$ 0. Os dias parados são descontados a preço cheio, e
    depois do "exausto" (× 0,9) ou do bloqueio (× 0) chegavam a tirar mais renda
    do que havia (trabalho de −R$ 96; "renda perdida R$ 268" de uma renda de
    R$ 179).
- **Como conferir:** `npm run validar`. As contas da seção 5 são de enumeração
  exata (todas as cartas, com as chances de cada estado), feitas com o mesmo motor
  do telão.
- **O que substitui:** o rascunho v2.1 (29/09), que substituiu o v2.
  - Continuam valendo: D-024 (horas extras do mês 1), D-026 e D-027 (Jonas em duas
    equipes e a ordem das equipes), D-028 (rendas de menor confiança), D-029 (a
    associação perde em saldo no mês 3), D-030 (o corte de 15%), D-031 e D-032
    (afirmações e termômetro curto), D-040 (rótulos curtos), D-043 (4 opções,
    120 s, sem tendência), D-044 a D-046 (básico com fonte, juros de 7,43%).
  - Entram as decisões D-050 a D-057 e as correções de conta de 29/09 (v2.1) e a
    D-058 e a D-059 (v2.2, seção 0). As seções 1 a 7 são as do v2.1, com os números
    que o v2.2 mudou já trocados e marcados com "(v2.2)".

---

## 0. v2.2: como a D-058 e a D-059 foram cumpridas

### 0.1 Em uma tabela

| Meta | Resultado no v2.2 | Cumprida? |
|---|---|---|
| D-058: entram picos reais, com fonte | 2 cartas novas ("Uma data forte puxou a procura" e "Bati a meta do desafio do app") e a "Uma semana boa" refeita com os valores da pesquisa (seção 0.2) | **Sim** |
| D-058: de 5% a 10% das partidas de pelo menos 2 personas fecham | **Não.** Ao acaso: Jonas 0,01%, Marcos 0,1%, os outros 0% (eram 0,030% e 0,13% antes da revisão da F5, que tirou a amarração da carta "meta" com o esforço). No melhor plano: Marcos 2,8% e Jonas 0,4%. Os dados não chegam lá sem uma renda que não depende de escolha, e com ela quem fica só no padrão também fecha (seção 0.3) | **Não: precisa de decisão** (0.8, item 1) |
| D-058: quem fica só no padrão nunca fecha | 0% nas 5 personas, em todos os caminhos de cartas | **Sim** |
| D-058: nenhuma opção dominante, e o padrão nunca é a de maior saldo | Nenhum aviso em (c) e (d). A menor folga do padrão: Daiane, mês 2, R$ 42 | **Sim** |
| D-059: a proteção aparece na tela | O INSS do MEI sai como "a proteção pagou R$ X" (`categoria: "protecao"`) no resultado, na história e no celular; o pior caso com e sem a proteção, e quanto ela evitou, no placar do telão e no fim do celular. O MEI e a associação têm `protege: true`. A liminar da associação voltou a ser trabalho (0.6b) | **Sim para o MEI** |
| D-059: a proteção perde no valor esperado e ganha no pior caso | O MEI perde de R$ 210 a R$ 267 no esperado e melhora o pior caso em R$ 333 a R$ 1.226, nas 5 personas. A associação perde nos dois (seção 0.4) | **Sim para o MEI; não para a associação** (0.8, item 2) |
| D-059: o esgotamento deixa de ser o melhor plano para a maioria | Medido pela energia (revisão da F5: antes era pela renda do mês, e o empréstimo contava como "esforço"). Mês 1: as 12 horas são as melhores só para Daiane e Rose. **Mês 2: dois apps, a opção mais cansativa, é a melhor para 4 das 5.** Mês 3: a madrugada, a mais cansativa, é a melhor só para a Rose; mas a melhor dos outros é "não parar", a segunda mais cansativa (seção 0.5) | **Só no mês 1, de fato** (0.8, item 3) |
| Mantidas: D-024, D-027, D-031, D-032, D-040, 4 opções, 120 s, juros de 7,43% | Sem mudança | **Sim** |

### 0.2 D-058: as cartas de pico

**Confiança:** A = órgão oficial, lei ou empresa sobre as próprias regras; M = imprensa
séria ou dado oficial com conta nossa; B = relato isolado, loja ou outra cidade. As
fontes completas estão no campo `fonte` de cada carta e na pesquisa de 29/09.

| Carta (curto) | Peso e quando sai | Quem, quanto no mês | Fonte | Conf. |
|---|---|---|---|---|
| **Uma data forte puxou a procura** (Data forte), nova | 16 (Daiane 60), **só nos meses 2 e 3 e no máximo uma vez por partida**; some depois de fratura ou bloqueio no mês 2 | Jonas **+429** e Kauã **+219** (16% da renda); Marcos **+290**; Daiane **+525** (35%, energia −2); Rose **+420** (20%); energia −1 | Jonas e Kauã: iFood, release de 30/10/2023 (pedidos da plataforma 16% acima da média em dezembro; o release não fala de ganho nem de quantos entregadores estavam ativos). Marcos: IBGE, IPCA, "transporte por aplicativo" em Porto Alegre, +19,88% (dez/2024) e +17,75% (dez/2025), que é o preço pago pelo passageiro, e não a renda do motorista; usada metade. Daiane: Agência Sebrae MA, 26/03/2024 (Páscoa, "até 35% a mais"). Rose: Folha Vitória, 13/12/2024 (**expectativa** de faturamento dos salões de +20% a 70% no fim de ano, no ES; não é aumento medido) | Jonas, Kauã e Marcos: A (demanda ou preço) / **B (renda: proxy, estimativa)**; Daiane M-B; Rose B (expectativa, outra UF). Revisão da F5: a renda estava com confiança M |
| **Bati a meta do desafio do app** (Meta), nova; **refeita na revisão da F5** | 6, **só nos meses 2 e 3 e no máximo uma vez por partida**; +6 no mês 2 para quem trabalhou menos no mês 1. Antes: peso 0 e só com jornada longa (12 horas +8, aceitar tudo +4, dois apps +4, madrugada +6, não parar +6), podendo sair três vezes | Jonas **+600**; Marcos **+480**; energia −1. Não sai para Kauã, Daiane e Rose | Jonas: Metrópoles, 01/08/2025 (casal de São Paulo, "bônus de R$ 600"; a meta é de 20 entregas numa semana, e "normalmente, o app oferece essa possibilidade para quem está começando ou anda meio fora das entregas, pouco engajado"); o regulamento do "Destravou, Ganhou" não diz valor nem cidade. Marcos: blog da 99, 31/03/2022 ("5 corridas para ganhar R$ 120"), 4 desafios no mês | M (valor, SP) / B (Porto Alegre); pesos: estimativa ("rara", na pesquisa) |
| **Uma semana boa** (Semana boa), refeita | 12 (sem mudança; +6 com 12 horas, +3 com dois apps) | Jonas e Kauã **+155** (eram +268 e +137); Marcos **+240** (era +287); Daiane **+165** (era +150); Rose **+320** (era +210) | Entregadores: iFood, página das mecânicas de promoção (2026), R$ 30 por ficar ativo das 18h às 21h59, 4 noites × R$ 30 a 48. Marcos: blog da 99 (desafios). Daiane: 3 centos de doce, Confeitaria Armelin (Porto Alegre). Rose: noiva e madrinhas, 5 combos de R$ 80 − 20% (NailNow, 2026) | A (mecânica) / B (quantas noites e os valores do Marcos) |

**Por que a meta mudou (revisão da F5):** a amarração com as opções de esforço
contrariava a própria fonte, que diz que o desafio vem sobretudo para quem anda
pouco engajado, e a meta de 20 entregas numa semana não pede jornada longa. Sem
trava, o melhor caminho do Jonas e do Marcos era "três metas seguidas", e daí vinha
a leitura "fechar é o bilhete de loteria de quem se esgota" (0.3), que era efeito
do peso que nós escolhemos, e não do dado.

**A frequência da "data forte" segue o calendário.** Dezembro é 1 mês em 12, e cai
em 25% das janelas de 3 meses; as 3 datas da Daiane (Páscoa, Dia das Mães, Natal)
caem em 58% delas. No jogo, a carta sai em ~20% das partidas (Rose 25%, Daiane 59%).
- **Uma vez só:** sem essa trava, quem fica só no padrão fechava em 0,0011% das
  partidas (Jonas: data forte, a meta no "aceitar tudo" e outra data forte).
- **Só nos meses 2 e 3, por uma razão técnica:** para sair uma vez, a carta precisa
  "lembrar" se já saiu, e o motor só lembra pelo `sorteou`. Uma condição sobre o mês
  1 quebra o e2e online, que tira do mês 1 as cartas sem dias parados (o validador
  recusa uma condição que nunca vale). Para ela sair também no mês 1, o ajuste é no
  teste (`e2e/sessao-online.e2e.mjs`), fora do escopo desta calibragem.

**O que a pesquisa descartou**, e por quê:
- **Gorjeta:** R$ 43 milhões em 12 meses para 760 mil entregadores do iFood, cerca
  de R$ 5 a R$ 10 por mês por entregador (IstoÉ Dinheiro, 16/12/2024). Saiu do texto
  da "semana boa" ("veio gorjeta"). Vai para o slide.
- **Corrida longa:** cerca de R$ 15 a mais por corrida (iFood, R$ 1,50 por km). Não
  mexe no mês.
- **Prêmio de fim de ano do Super** (R$ 900 a R$ 3.000): **não existe em Porto
  Alegre**. Vai para o slide, como contraste.
- **13º e abono do PIS da casa:** são renda certa, não sorte nem escolha. Ver 0.3.

### 0.3 D-058: por que a meta de 5% a 10% não fecha

Com os picos de trabalho que têm fonte, a chance de fechar mal se mexe:

| Persona | Ao acaso: v2.1 → v2.2 | Melhor plano: v2.1 → v2.2 | Melhor caminho: v2.1 → v2.2 |
|---|---|---|---|
| Jonas | 0,014% → **0,01%** | 0,53% (A-C-B) → **0,4%** (A-C-B) | +R$ 325 → **+R$ 437** (semana boa, data forte, meta) |
| Marcos | 0,19% → **0,1%** | 5,2% (A-C-C) → **2,8%** (A-C-B) | +R$ 685 → **+R$ 684** (semana boa, data forte, meta) |

(Números depois da revisão da F5. Antes dela, com a meta amarrada ao esforço e sem
trava: Jonas 0,030% · 0,80% · +R$ 1.053 e Marcos 0,13% · 3,3% · +R$ 1.114, os dois
com três metas.)
| Kauã, Daiane, Rose | 0% → 0% | nenhum plano fecha | −R$ 2.722 → −R$ 2.716; −R$ 3.995 → −R$ 3.628; −R$ 6.716 → −R$ 6.253 |

**Por que não chega lá**, em três contas feitas com o mesmo motor:

1. **Os planos que fecham ainda começam com 12 horas** (o melhor é A-C-B para os
   dois), mas isso **não é achado dos dados**: vem de pesos estimados. A "semana
   boa" tem +6 de peso com as 12 horas e +3 com dois apps (estimativa), e as horas a
   mais rendem pela conta da D-024. A versão anterior deste rascunho dizia "fechar é
   o bilhete de loteria de quem se esgota"; a revisão da F5 mostrou que isso vinha
   sobretudo da carta "meta" amarrada ao esforço, contra a fonte (0.2). Não diga
   isso em sala como conclusão.
2. **Pico de trabalho com fonte é pequeno:** de R$ 155 a R$ 600 por mês. Mesmo
   **dobrando a chance da meta** no desenho anterior (pesos 16, 8, 8, 12 e 12), o
   Jonas fechava em 0,07% ao acaso e o Marcos em 0,22% (melhor plano: 1,7% e 4,7%).
3. **Só renda que não depende de escolha põe alguém na faixa, e ela fura o "só o
   padrão nunca fecha".** Testei as duas que a pesquisa achou (fonte A), nas casas
   com carteira assinada (Jonas, Kauã e Marcos). **Não entraram no config.**

| Teste (não está no config) | Jonas: ao acaso · só o padrão | Marcos: ao acaso · só o padrão | Kauã |
|---|---|---|---|
| **Abono do PIS da companheira**, R$ 1.621, carta de peso 8, uma vez por partida (sai em ~17% delas). Medido antes da revisão da F5: a remedir se for escolhido | 3,6% · **4,7%** | 5,3% · **6,0%** | 0% |
| **13º da companheira**, R$ 811 no mês 2 e R$ 689 no mês 3 (o jogo lido como outubro a dezembro) | 9,9% · **8,4%** | 15,8% · **13,7%** | 0% |

Nos dois testes, quem nunca vota fecha tanto quanto quem joga, ou mais (o padrão não
se esgota): a diferença vira calendário, e não escolha. Por isso a D-058, do jeito
que está escrita, não se cumpre com dados reais. As saídas estão na seção 0.8, item 1.

**O que muda na sala:** o "caminho estreito" existe para o Jonas e o Marcos (o melhor
caminho termina com +R$ 437 e +R$ 684), mas é raro. Numa sala com 6 equipes jogando
ao acaso, a chance de alguma fechar é de cerca de 0,1%. **Kauã, Daiane e Rose não fecham em nenhum caminho: é o dado real**
da casa deles (seção 3), e dizer isso em sala é parte da aula.

### 0.4 D-059: a proteção vale pelo pior caso que ela evita

**O que mudou no conteúdo:**
- **MEI (mês 1, B) e associação (mês 3, A):** `protege: true`.
- **O auxílio do INSS pelo MEI** (R$ 2.431 por 45 dias; R$ 1.621 para quem voltou
  antes da alta) passou a `categoria: "protecao"`. Saiu dos efeitos gerais do mês 3 e
  foi para **cada carta que pode sair nesse ramo, menos a "A perícia do INSS negou"**,
  que ficou sem efeito em dinheiro. Motivo: a perícia é uma carta do mesmo mês, e
  nenhuma condição do motor lê a carta do próprio mês. Do jeito antigo (o INSS entrava
  e a carta tirava de volta), a tela diria "a proteção pagou R$ 2.431" para quem teve
  o auxílio negado. A conta em dinheiro é a mesma do v2.1, e a chance de negar
  continua em ~50%.
- **A liminar da associação** (a conta volta no 21º dia: Jonas +R$ 804) foi proteção
  no primeiro desenho do v2.2, e a tela dizia "a proteção pagou R$ 804". **Voltou a
  ser trabalho na revisão da F5:** a associação não paga nada; são 10 dias de
  trabalho do próprio entregador depois do desbloqueio. Como proteção, esse trabalho
  saía do "entrou" e do piso, e o "entrou" da Daiane e da Rose ficava negativo mais
  fundo. Agora a linha aparece como as outras do mês ("o advogado da associação
  conseguiu liminar: a conta voltou no 21º dia +R$ 804"), e o "pagou" fica só para
  o INSS.

**O pior caso com e sem a proteção** (conferência h do validador; "plano padrão" é
C-A-D com só a proteção trocada; "média" é sobre todas as combinações que usam a
proteção, com ela e com o padrão no lugar dela). Em R$.

| Persona | MEI: pior caso com · sem | MEI: esperado com · sem | MEI, média: pior · esperado | Associação: pior caso com · sem | Associação, média: pior · esperado |
|---|---|---|---|---|---|
| Jonas | **−9.771** · −10.757 | −3.345 · −3.147 | **+1.045** · −215 | −10.787 · −10.757 | −77 · −150 |
| Kauã | **−7.818** · −8.677 | −4.393 · −4.197 | **+731** · −210 | −8.745 · −8.677 | −96 · −131 |
| Daiane | **−8.441** · −8.727 | −5.347 · −5.090 | **+333** · −214 | −8.757 · −8.727 | −58 · −108 |
| Marcos | **−10.428** · −11.667 | −3.532 · −3.324 | **+1.226** · −227 | −11.702 · −11.667 | −86 · −191 |
| Rose | **−13.368** · −14.300 | −8.975 · −8.708 | **+777** · −267 | −14.361 · −14.300 | −92 · −165 |

- **O MEI é um seguro, e se comporta como um:** perde de R$ 210 a R$ 267 na média
  (os R$ 258 do DAS) e melhora o pior caso em R$ 333 a R$ 1.226. O pior caso com o
  MEI é a fratura com o INSS negado; sem o MEI, é a fratura seguida de mais um
  prejuízo no mês 3 (assalto; para o Marcos, a suspensão). Como cada equipe tira uma
  carta por mês, a negativa do INSS não vem junto com outro desastre.
- **A associação não melhora o pior caso.** O pior caso de todas as personas passa
  pela fratura, e a associação não cobre acidente: ela traz o advogado para o
  bloqueio. Com ela, o pior caso fica de R$ 30 a R$ 68 pior (a mensalidade e o dia da
  assembleia). A pesquisa não achou fundo nem ajuda em dinheiro de associação para
  acidentado em Porto Alegre (pesquisa f4, seção 5), e por isso nada foi inventado.
- **No placar,** uma equipe que entrou na associação teria "sem a proteção" com um
  pior caso **melhor** que o dela. O mesmo acontece com o MEI quando a sessão acaba
  antes do mês 3 (o INSS só paga no mês seguinte à fratura, e até lá só pesa o DAS):
  depois só do mês 1 com o MEI, Jonas −R$ 1.821 com e −R$ 1.735 sem. **Na revisão da
  F5, a tela ganhou uma trava:** o "sem a proteção" só aparece quando é pior que o
  "com", com a diferença pronta ("a proteção evitou R$ X"); nos outros casos, a linha
  diz "a proteção não melhorou o pior caso", sem número. O que fazer com a
  associação continua em 0.8, item 2.
- **Na tela, no caso da fratura com MEI** (Jonas, INSS aprovado): "a proteção pagou
  R$ 2.431" no mês 3, e o celular diz "Sem ela, teria faltado R$ 2.431 a mais".

### 0.5 D-059: o esgotamento custa mais

| O que mudou | v2.1 | v2.2 | Fonte | Conf. |
|---|---|---|---|---|
| Doença com energia baixa | +8 (abaixo de 4) e +16 (abaixo de 2) sobre peso 6: × 2,3 e × 3,7 | **× 4,24** (abaixo de 4) e **× 4,5** (abaixo de 2) | Prather et al., *Sleep* 38(9), 2015: resfriado depois de exposição ao rinovírus, 5 a 6 h de sono OR 4,24; 5 h ou menos, OR 4,50; acima de 6 h, sem aumento | A (EUA, experimental); o mapeamento energia → sono é nosso |
| Doença no mês das 12 horas | nada | **× 4,24** (5 a 6 h de sono) | Prather (acima) | A / mapeamento nosso |
| Doença de madrugada (mês 3, B) | nada | **× 4,5** (5 h ou menos), sem somar ao da energia: vale o pior dos dois. **Menos a Rose**, que atende "até tarde e aos domingos", e não de madrugada | Prather (acima) | A / mapeamento nosso |
| Queda no mês das 12 horas (quem está na rua) | +2 | **× 1,9** (5 a 6 h de sono) | AAA Foundation (Tefft, 2016). O +2 vinha da UFBA (49,1% contra 39,9%), que não foi significativo no modelo ajustado | A (EUA) |
| Energia das 12 horas | −3 | **−5**: quem fez 12 horas começa o mês seguinte exausto (energia abaixo de 3, −10% da renda) e no degrau de 5 a 6 h de sono | Estimativa (a energia é mecânica do jogo). Indício: Van Dongen et al., *Sleep* 26(2), 2003, 6 h por noite durante 14 dias = déficit de 2 noites sem dormir, e o déficit acumula | Baixa |

**O que ficou igual, e por quê:**
- **O "exausto" continua em −10%.** A pesquisa mediu uma queda **menor**: RAND
  (Hafner et al., 2016) dá −2,4 pontos de produtividade com menos de 6 h de sono, e
  os −7% por hora de Cook et al. (NBER, 2018) vêm das horas piores, e não do
  cansaço. Os −10% seguem como estimativa sem fonte direta (seção 8, item 9). O custo
  a mais do esgotamento no v2.2 veio do risco (doença, queda), que tem fonte, e não
  da renda.
- **Madrugada × 4,3 na queda e na fratura:** sem mudança.

**Resultado** (a melhor opção de cada persona, conferência h):

Revisão da F5: o esforço passou a ser medido pela **energia** (a opção de maior
perda de energia esperada no próprio mês), e não pela renda do mês, que contava o
empréstimo do mês 2 como "a opção de mais esforço".

| Mês | Opção mais cansativa (energia esperada no mês) | Melhor opção (maior saldo esperado no fim) | A mais cansativa é a melhor para |
|---|---|---|---|
| 1 | 12 horas (A), para as 5 (−5,2 a −6,3) | **Trabalhar menos (D)** para Jonas, Kauã e Marcos; 12 horas para Daiane e Rose | 2 de 5 |
| 2 | dois apps (C), para as 5 (−2,7 a −3,7) | **Dois apps (C)** para 4; o empréstimo para a Daiane | **4 de 5** |
| 3 | madrugada (B) para 4 (−2 a −2,4); não parar (C) para a Daiane (−1,9) | não parar (C) para Jonas, Kauã e Marcos; madrugada (B) para Daiane e Rose | 1 de 5 (Rose) |

- **A D-059 só está cumprida, de fato, no mês 1.** No mês 2, a opção mais cansativa
  é a melhor para 4 personas (a versão anterior desta tabela dizia o contrário,
  porque olhava a renda do mês e achava o empréstimo). No mês 3, a mais cansativa só
  ganha para a Rose, mas a melhor dos outros é "não parar", a segunda mais cansativa.
  O melhor plano esperado do Jonas, do Kauã e do Marcos (D-C-C) passa dois dos três
  meses numa opção de esforço. Ver 0.8, item 3.

- **O melhor plano esperado do Jonas, do Kauã e do Marcos agora começa descansando:**
  D-C-C (Jonas −R$ 2.428, Marcos −R$ 2.402, Kauã −R$ 3.819). No v2.1 começava com 12
  horas (A-D-C e A-C-C), menos o do Kauã. Os raros caminhos que fecham ainda começam
  com 12 horas, mas por causa de pesos estimados (seção 0.3, item 1).
- **Daiane e Rose ainda ganham com as 12 horas**, porque não estão na rua: para elas o
  risco a mais é só a doença, e a renda das horas a mais (D-024) é alta em relação à
  delas.
- **Mês 3:** no último mês, a opção de maior renda do mês é a de maior saldo no fim,
  porque não há mês seguinte para cobrar o cansaço. Com a associação obrigada a perder
  (D-029) e o padrão proibido de ser o melhor, sobram madrugada e não parar, que são as
  duas de esforço. Medido pela energia, o aviso do mês 3 sumiu (só a Rose), e o do mês
  2 apareceu. Ver 0.8, item 3.
- **A letra do esforço muda:** A, D e C (o D do mês 2 continua sendo o empréstimo,
  seção 8, item 14). **A melhor opção muda com a persona** nos 3 meses.
- A energia chega a 0 em 49,2% das partidas (eram 40%).

### 0.6 Outras mudanças que a calibragem exigiu

- **Daiane, "aceitar toda encomenda, até a sem margem": +R$ 60 → R$ 0** (o efeito
  saiu). Com o esgotamento mais caro, quem chega ao mês 2 com a energia no piso não
  paga mais nada pelo −2 do "aceitar tudo", e o padrão virava a melhor opção dela no
  mês 2 (−R$ 4.967 contra −R$ 4.989 do empréstimo). O +60 (~4%) era estimativa sem
  fonte, e encomenda sem margem não deixa lucro; a narrativa já dizia "para ganhar
  quase o mesmo". O "aceitar tudo" continua protegendo a Daiane do bloqueio (× 0,4),
  o que é a pergunta do item 18 da seção 8, não resolvida aqui.
- **"Uma semana boa"** ganhou fonte e valores da pesquisa (0.2): fica menor para o Jonas
  (−R$ 113) e o Marcos (−R$ 47), e maior para o Kauã (+R$ 18), a Daiane (+R$ 15) e a
  Rose (+R$ 110).

### 0.6b Revisão da F5 (29/09, noite): o que mudou

- **Carta "meta":** sem amarração com o esforço, só nos meses 2 e 3, no máximo uma vez
  por partida, +6 no mês 2 para quem trabalhou menos no mês 1 (0.2). Com isso o Jonas
  e o Marcos fecham ainda menos (0.3).
- **Liminar da associação:** voltou a ser trabalho (0.4).
- **"Data forte":** a confiança da renda caiu para B no Jonas, no Kauã e no Marcos (os
  dados são de demanda ou de preço, e não de renda), a fonte da Rose diz
  "expectativa", e a narrativa deixou de citar o Dia das Mães ("como o fim de ano"):
  as fontes de Jonas, Kauã, Marcos e Rose são só de dezembro. Os valores ficaram, como
  estimativa sobre proxy.
- **Placar e celular:** o "sem a proteção" só quando é pior que o "com", com "a
  proteção evitou R$ X"; o pior caso também no placar final e no fim do celular (0.4).
- **Validador, conferência (h):** o esgotamento medido pela energia (0.5).
- **Teste:** `npm run e2e:online:fixture` (o e2e online com a fixture, o único que
  passa sempre pela frase "a proteção pagou" no celular) entrou na lista do README, do
  AGENTS.md e do roteiro do apresentador.

### 0.7 Saída do validador, conferências (g) e (h)

`node bin/validar-config.mjs`, versão `2026-09-29-v2.2-rascunho`, hash `71e61ab8`
(depois da revisão da F5): 0 erros, 0 avisos de formato, 12 avisos de equilíbrio (5
de variância, aceitos pela D-024; 4 da conferência g; 1 da h, agora no mês 2; 2 da i).

```
== (g) Quem fecha o básico no fim dos 3 meses (D-050, D-058) ==
Critério: fecha quem termina com o saldo acumulado ≥ R$ 0. "Ao acaso": todas as combinações de decisões
igualmente prováveis, cartas pelas chances. "Melhor plano": a combinação com a maior chance de fechar.
"Melhor caminho": a maior renda final possível (decisões e cartas), com chance acima de 0.
"Só o padrão": o plano c-a-d, o de quem nunca vota.
Meta da D-058: de 5% a 10% ao acaso, em pelo menos 2 personas; só o padrão, nunca.
  Jonas (motoboy): fecha em 0,01% ao acaso · melhor plano a-c-b fecha em 0,4% · melhor caminho termina com R$ 437 (r1 a/semana_boa → r2 c/data_forte → r3 b/meta) · só o padrão fecha em 0%
  Daiane (vendedora): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 3.628 (r1 a/semana_boa → r2 d/data_forte → r3 b/semana_boa) · só o padrão fecha em 0%
  AVISO: Daiane (vendedora): nenhum caminho fecha o básico (o melhor termina com −R$ 3.628); a D-050 pede "quase ninguém", e não "ninguém".
  Marcos (motorista): fecha em 0,1% ao acaso · melhor plano a-c-b fecha em 2,8% · melhor caminho termina com R$ 684 (r1 a/semana_boa → r2 c/data_forte → r3 b/meta) · só o padrão fecha em 0%
  Kauã (bike): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 2.716 (r1 c/semana_boa → r2 c/data_forte → r3 b/semana_boa) · só o padrão fecha em 0%
  AVISO: Kauã (bike): nenhum caminho fecha o básico (o melhor termina com −R$ 2.716); a D-050 pede "quase ninguém", e não "ninguém".
  Rose (manicure): fecha em 0% ao acaso · nenhum plano fecha · melhor caminho termina com −R$ 6.253 (r1 a/semana_boa → r2 c/data_forte → r3 b/semana_boa) · só o padrão fecha em 0%
  AVISO: Rose (manicure): nenhum caminho fecha o básico (o melhor termina com −R$ 6.253); a D-050 pede "quase ninguém", e não "ninguém".
  AVISO: só 0 persona(s) fecham o básico entre 5% e 10% das partidas ao acaso; a D-058 pede pelo menos 2.
```

```
== (h) A melhor opção muda com a persona, e a letra do esforço muda com o mês (D-051) ==
Melhor opção: a de maior renda final esperada, escolhendo-a naquele mês e as outras ao acaso (a conta de (c)).
Maior esforço/renda: a opção de maior renda esperada no próprio mês (a variação de (b)), na média das personas;
a letra é a posição dela na rodada (A, B, C, D), como no telão.
  r1 melhor opção: Jonas (motoboy) d · Daiane (vendedora) a · Marcos (motorista) d · Kauã (bike) d · Rose (manicure) a
  r2 melhor opção: Jonas (motoboy) c · Daiane (vendedora) d · Marcos (motorista) c · Kauã (bike) c · Rose (manicure) c
  r3 melhor opção: Jonas (motoboy) c · Daiane (vendedora) b · Marcos (motorista) c · Kauã (bike) c · Rose (manicure) b
  r1 maior esforço/renda no mês: A ("a", renda E −R$ 950 no mês)
  r2 maior esforço/renda no mês: D ("d", renda E −R$ 393 no mês)
  r3 maior esforço/renda no mês: C ("c", renda E −R$ 2.030 no mês)
Esgotamento (D-059): a opção mais cansativa do mês (maior perda de energia esperada; empate pela renda do mês), por persona, contra a melhor opção dela; aviso com 3 ou mais personas no mesmo mês.
  r1 mais cansativa: Jonas (motoboy) a (energia E -5,3), a melhor é d · Daiane (vendedora) a (energia E -5,2) é a melhor · Marcos (motorista) a (energia E -5,3), a melhor é d · Kauã (bike) a (energia E -6,3), a melhor é d · Rose (manicure) a (energia E -5,2) é a melhor
  r2 mais cansativa: Jonas (motoboy) c (energia E -3,1) é a melhor · Daiane (vendedora) c (energia E -2,9), a melhor é d · Marcos (motorista) c (energia E -2,7) é a melhor · Kauã (bike) c (energia E -3,7) é a melhor · Rose (manicure) c (energia E -2,7) é a melhor
  AVISO: r2: a opção mais cansativa do mês é a de maior saldo esperado para 4 personas (Jonas (motoboy), Marcos (motorista), Kauã (bike), Rose (manicure)); a D-059 pede que o esgotamento deixe de ser o melhor plano para a maioria.
  r3 mais cansativa: Jonas (motoboy) b (energia E -2,4), a melhor é c · Daiane (vendedora) c (energia E -1,9), a melhor é b · Marcos (motorista) b (energia E -2), a melhor é c · Kauã (bike) b (energia E -2,3), a melhor é c · Rose (manicure) b (energia E -2) é a melhor

== (h) Proteção: o pior caso com e sem as opções que protegem (D-059) ==
Critério: renda final (cartas pelas chances). "Plano padrão": todas as rodadas no padrão, só a proteção trocada.
"Média": sobre todas as combinações que usam a proteção, com ela e com o padrão no lugar dela.
  Jonas (motoboy), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior −R$ 9.771 com, −R$ 10.757 sem · esperado −R$ 3.345 com, −R$ 3.147 sem · média: pior +1.044,9, esperado -214,6
  Jonas (motoboy), r3 a ("Entrar na associação dos trabalhadores"): plano padrão pior −R$ 10.787 com, −R$ 10.757 sem · esperado −R$ 3.309 com, −R$ 3.147 sem · média: pior -77,2, esperado -150,1
  Daiane (vendedora), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior −R$ 8.441 com, −R$ 8.727 sem · esperado −R$ 5.347 com, −R$ 5.090 sem · média: pior +333, esperado -214,3
  Daiane (vendedora), r3 a ("Entrar na associação dos trabalhadores"): plano padrão pior −R$ 8.757 com, −R$ 8.727 sem · esperado −R$ 5.205 com, −R$ 5.090 sem · média: pior -58,1, esperado -108,2
  Marcos (motorista), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior −R$ 10.428 com, −R$ 11.667 sem · esperado −R$ 3.532 com, −R$ 3.324 sem · média: pior +1.226,3, esperado -226,6
  Marcos (motorista), r3 a ("Entrar na associação dos trabalhadores"): plano padrão pior −R$ 11.702 com, −R$ 11.667 sem · esperado −R$ 3.530 com, −R$ 3.324 sem · média: pior -86,3, esperado -190,8
  Kauã (bike), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior −R$ 7.818 com, −R$ 8.677 sem · esperado −R$ 4.393 com, −R$ 4.197 sem · média: pior +731,1, esperado -209,7
  Kauã (bike), r3 a ("Entrar na associação dos trabalhadores"): plano padrão pior −R$ 8.745 com, −R$ 8.677 sem · esperado −R$ 4.335 com, −R$ 4.197 sem · média: pior -95,6, esperado -130,9
  Rose (manicure), r1 b ("Jornada de sempre e abrir o MEI"): plano padrão pior −R$ 13.368 com, −R$ 14.300 sem · esperado −R$ 8.975 com, −R$ 8.708 sem · média: pior +776,6, esperado -267,2
  Rose (manicure), r3 a ("Entrar na associação dos trabalhadores"): plano padrão pior −R$ 14.361 com, −R$ 14.300 sem · esperado −R$ 8.886 com, −R$ 8.708 sem · média: pior -91,6, esperado -165,2
```

### 0.8 Para decidir (só D-058 e D-059)

1. **A D-058 não foi alcançada com a opção que você escolheu.** *Precisa de decisão.*
   - *O que você escolheu (29/09):* "opção A", incluir picos reais com fonte para que
     de 5% a 10% das partidas de duas personas fechem.
   - *O que aconteceu:* os picos com fonte entraram (0.2), e **0 personas chegam à
     faixa**. Ao acaso: Jonas 0,01% e Marcos 0,1%; no melhor plano, 0,4% e 2,8%.
     Kauã, Daiane e Rose não fecham em nenhum caminho. Depois da revisão da F5, que
     tirou a amarração da carta "meta" com o esforço (a fonte diz o contrário), os
     números ficaram ainda menores (eram 0,030% e 0,13%).
   - *Por que:* pico de trabalho com fonte é pequeno (R$ 155 a R$ 600 no mês) e raro.
   - *As únicas saídas medidas que chegam à faixa* (seção 0.3, medidas antes da revisão
     da F5; a remedir se escolhidas):
     - (c) o abono do PIS como carta nas casas com carteira: Jonas 3,6% e Marcos 5,3%
       ao acaso, **mas quem fica só no padrão fecha em 4,7% e 6,0%**;
     - (d) o 13º, com o jogo lido como outubro a dezembro: Jonas 9,9% e Marcos 15,8%,
       **com o padrão fechando em 8,4% e 13,7%**.
     As duas ferem outra linha da própria D-058 ("quem fica só no padrão nunca
     fecha"): escolher uma delas é mudar a D-058, e isso é decisão sua.
   - *Outra saída, também mudando a D-058:* (e) medir a meta no melhor plano, e não ao
     acaso (Marcos 2,8%, Jonas 0,4%: nem assim duas personas chegam).
   - *A opção (b), "aceitar que ninguém fecha e dizer isso em sala", foi a que você
     recusou.* A versão anterior deste item a recomendava de novo, e rotulava como (a)
     outra coisa; isso foi corrigido. Não há recomendação aqui: as saídas com número
     mudam a regra que você escreveu.
   - **O config do teste de 30/09 fica como está, sem cumprir a D-058.** O teste mede
     rede, celulares e projetor, e não a calibragem.
2. **A associação não melhora o pior caso, e a nota fixa do placar diz que toda
   proteção "evita o pior".** *Precisa de decisão.*
   - *O que acontece:* nas 5 personas, a associação piora o pior caso em R$ 30 a R$ 68
     e o esperado em R$ 108 a R$ 191 (0.4). Dos 28 planos por persona que usam alguma
     proteção, os 12 com a associação e sem o MEI têm o pior caso "sem" melhor que o
     "com". A troca vai para o padrão do mês 3 (apertar o cinto), então o "sem" também
     muda a estratégia do mês, e não só a proteção.
   - *O que já foi feito (revisão da F5, sem decidir por você):* a tela nunca mostra um
     "sem" melhor que o "com"; nesses casos a linha diz "a proteção não melhorou o
     pior caso". Mas a nota fixa embaixo do título continua "A proteção não rende mais
     na média: ela evita o pior.", e fica em cima dessa linha no placar de quem entrou
     na associação (e2e, captura `placar-pior-6-equipes-1024x768.png`).
   - *Opções:* (a) aceitar, trocar a nota fixa por uma que não afirme "evita o pior"
     para toda proteção (por exemplo, "A proteção não rende mais na média: ela é
     seguro") e dizer em sala que a associação protege do bloqueio, e não do acidente;
     (b) tirar o `protege` da associação, e o placar só compara o MEI (muda o config,
     não o motor); (c) outra contrafactual, por exemplo refazer o plano tirando só os
     efeitos de categoria "protecao" (hoje isso daria diferença zero para a
     associação, porque a liminar voltou a ser trabalho); (d) nomear a proteção
     trocada na linha ("sem o MEI", "sem a associação").
   - *Recomendo:* (b) até você decidir o resto: com ela, a nota e as linhas deixam de se
     contradizer no teste e na aula, sem mexer em código.
3. **O esgotamento nos meses 2 e 3.** *Precisa de decisão.*
   - *O que acontece (revisão da F5, esforço medido pela energia):* no mês 2, dois apps
     (a opção mais cansativa) é a melhor para Jonas, Kauã, Marcos e Rose; a versão
     anterior dizia que o mês 2 estava cumprido porque achava o empréstimo como "o
     esforço". No mês 3, a madrugada (a mais cansativa) só ganha para a Rose, mas a
     melhor dos outros é "não parar", a segunda mais cansativa. A D-059 só está
     cumprida, de fato, no mês 1 (0.5).
   - *Opções:* (a) aceitar e registrar que a D-059 vale só para o mês 1; (b) cobrar mais
     de quem roda em dois apps (o risco a mais de acidente, com fonte, ou a energia);
     (c) mudar o padrão do mês 3 (hoje o cinto, que não pode ser o melhor).
   - *Recomendo:* (a) para o teste, e (b) só com fonte, na correção de 01 a 05/10.
4. **A energia das 12 horas (−5) e os pesos da meta são estimativa.** Vale conferir se a
   leitura "12 horas por um mês deixam a pessoa exausta no mês seguinte" é a que você
   quer em sala.
5. **A "data forte" só nos meses 2 e 3** (0.2). Se ela deve sair também no mês 1, o
   ajuste é no e2e online, e não no conteúdo.

---

## 1. Resumo (do v2.1, com os números do v2.2)

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
     "entrou" ainda fica**, em caminhos raros da Daiane (até −R$ 436, em 1,6% dos
     meses 3 ao acaso) e da Rose (até −R$ 299, em 0,99%): num mês parado, a parcela
     do curso, a do empréstimo e o DAS continuam saindo. Seção 8, item 11.
2. **Quanto falta num mês comum** (sem carta, sem decisão): Marcos −R$ 373, Jonas
   −R$ 467, Kauã −R$ 1.017, Daiane −R$ 1.396, Rose −R$ 2.412.
3. **D-050 e D-058, "quase ninguém" fecha** (v2.2, seção 0.3):
   - no piloto automático, **ninguém** fecha, em nenhum caso;
   - **Jonas e Marcos têm um caminho estreito** que fecha: o melhor termina com
     +R$ 437 (Jonas) e +R$ 684 (Marcos). Jogando o melhor plano, o Marcos fecha em
     2,8% das partidas, e o Jonas em 0,4%; ao acaso, 0,1% e 0,01%. A meta de 5% a 10%
     da D-058 não se cumpre (seção 0.8, item 1);
   - **Kauã, Daiane e Rose não fecham em nenhum caminho.** O melhor fica em −R$ 2.716,
     −R$ 3.628 e −R$ 6.253. Fechar para eles depende de mudar a renda da casa, e isso
     é decisão sua (seção 8, item 1).
4. **D-051 e D-059, energia e proteção:**
   - **energia baixa custa:** abaixo de 3, o mês seguinte rende 10% menos; abaixo de
     6, de 4 e de 2, a chance de queda e de fratura sobe 1,3, 1,9 e 4,3 vezes (pouco
     sono, AAA Foundation); abaixo de 4 e de 2, a doença fica 4,24 e 4,5 vezes mais
     provável (Prather, v2.2);
   - **a proteção tem efeito real, e agora aparece:** com o MEI, a fratura do mês 2
     rende R$ 2.431 do INSS no mês 3 (metade das vezes a perícia nega), e a tela diz
     "a proteção pagou R$ 2.431"; a associação traz a conta bloqueada de volta no 21º
     dia (+R$ 804 de trabalho, Jonas; desde a revisão da F5, não é mais "a proteção
     pagou");
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
    saldo esperado. Os 12 avisos que sobram (v2.2; eram 11) estão explicados na
    seção 5.4.
11. **Na tela (2ª rodada):** o que vem do mês anterior aparece nomeado no
    resultado, na história e no celular ("+25 dias da fratura −R$ 2.233"); os
    gastos saem por origem ("gastos R$ 1.650 + multa R$ 130"); no mês 3 depois de
    fratura ou bloqueio, a carta "Um mês como os outros" dá lugar a "O mês passado
    ainda pesa", com as mesmas chances. No v2.2, o INSS saiu de "veio dos meses
    anteriores" e aparece como "a proteção pagou R$ 2.431".

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

### 2.7 Energia, sono e acidente (D-051 e D-059)

| Energia no começo do mês | Queda e fratura (quem está na rua) | Doença (v2.2) | Renda variável | Fonte |
|---|---|---|---|---|
| 6 ou mais | × 1 | — | — | — |
| abaixo de 6 | × 1,3 | — | — | AAA Foundation (Tefft, 2016, dados da NHTSA): 6 a 7 h de sono = 1,3 vez o risco de acidente |
| abaixo de 4 | × 1,9 | **× 4,24** (era peso +8) | — | 5 a 6 h de sono = 1,9 vez (AAA); OR 4,24 de resfriado (Prather et al., *Sleep*, 2015) |
| abaixo de 3 | × 1,9 | × 4,24 | **−10%** | item 27 |
| abaixo de 2 | × 4,3 | **× 4,5** (era peso +16) | −10% | 4 a 5 h de sono = 4,3 vezes (AAA); 5 h ou menos, OR 4,50 (Prather) |

- **Pelas opções (v2.2):** as 12 horas (mês 1, A) contam como 5 a 6 h de sono no
  próprio mês: queda × 1,9 e doença × 4,24. A madrugada (mês 3, B) conta como 4 a 5 h:
  queda e fratura × 4,3 (como no v2.1) e doença × 4,5, sem somar ao da energia (vale o
  pior dos dois), menos para a Rose, que atende até tarde, e não de madrugada.

- **"Rodar até de madrugada" multiplica por 4,3** a queda e a fratura no mês (4 a 5 h
  de sono). A energia é mecânica de jogo; o mapeamento para horas de sono é nosso.
  https://aaafoundation.org/acute-sleep-deprivation-risk-motor-vehicle-crash-involvement/
- **Energia inicial** (sem fonte): Jonas 7, Kauã 8 (−1 por mês, porque pedalar 11
  horas cansa; não cai no mês em que ele pedala menos), Daiane, Marcos e Rose 6.
- **A jornada de sempre cansa:** −2 por mês (era −1). 12 horas: **−5** (era −3, v2.2:
  quem fez 12 horas começa o mês seguinte exausto; Van Dongen et al., *Sleep*, 2003,
  como indício). Aceitar tudo: −2. Dois apps, madrugada, não parar: −3. Trabalhar
  menos: +2. Breque e associação: +1. As cartas de pico: −1 (a "data forte" da
  Daiane, −2).
- A energia chega a 0 em 49,2% das partidas (40% no v2.1; 32% no v2).

### 2.8 Decisões

| # | Valor | Onde | Fonte | Confiança |
|---|---|---|---|---|
| 31 | 12 horas, 7 dias: Jonas **+520**, Kauã **+105**, Daiane **+350**, Marcos **+650**, Rose **+490**; energia **−5** (era −3); semana boa +6, meta +8, quebra +3, queda **× 1,9** (era +2), doença **× 4,24**, assalto +2 | Mês 1, A | D-024 (pacote B). Queda e doença: seção 2.7 (AAA; Prather). A UFBA (Siqueira et al., *Cad. Saúde Pública* 41(3), 2025: acidente em 1 ano 49,1% com mais de 10 h por dia contra 39,9% até 8 h) não foi significativa no modelo ajustado | Baixa (a energia); alta (os fatores de sono), com mapeamento nosso |
| 32 | MEI: **−86** (−82 Daiane) nos 3 meses, custo fixo; proteção +3; `protege: true` (v2.2) | Mês 1, B | itens 2 e 3 | Alta |
| 33 | Trabalhar menos: as horas mais fracas de um dia por semana, **53%** de 5 dias (Jonas −237, Kauã −121, Daiane −133, Marcos −253, Rose −186); energia +2; queda × 0,6 | Mês 1, D | A mesma conta da D-024, ao contrário: as horas que saem são as que rendem menos. Abílio (2021), p. 950 | Estimativa |
| 34 | Corte do mês 2: **−15% da renda-base** (Jonas −402, Kauã −206, Daiane −225, Marcos −431, Rose −315) | Mês 2, efeito geral | D-030. iFood: R$ 3,00 pela 2ª entrega agrupada, e não R$ 7,50 (jun/2025) | Baixa (ilustrativo) |
| 35 | Aceitar tudo: **+10%** (Daiane **R$ 0**, v2.2: era +60, ~4%; encomenda sem margem não deixa lucro, seção 0.6); energia −2; bloqueio × 0,4; quebra +3, queda +2, fratura +2, meta +4 | Mês 2, A | iFood (31/08/2026): o "Mais Entregas" exige 90% do tempo disponível e no máximo 2 recusas | Baixa (os percentuais) |
| 36 | Breque: **−1 dia** (Jonas −89, Kauã −46, Daiane −50, Marcos −96, Rose −70); energia +1, proteção +1; reajuste do mês 3 mais provável (só Jonas e Kauã) | Mês 2, B | Breque de 31/03/2025; o iFood subiu o mínimo de R$ 6,50 para R$ 7,50 em 01/06/2025, só para entregadores | Média |
| 37 | Dois apps: **+20%**; energia −3; bloqueio +4, e o outro app segura metade; quebra +3, queda +2, fratura +2, semana boa +3, meta +4. **Daiane:** app de delivery, +R$ 300 de vendas, −R$ 157 de comissão (26,2%) e, sem o MEI do mês 1, o DAS nos meses 2 e 3, porque o iFood exige CNPJ | Mês 2, C | PNAD 2025: 37,5% usam 2 ou mais apps. iFood, Portal do Parceiro: Plano Entrega 23% + 3,2% de pagamento; loja exige CNPJ com CNAE de alimentação, e o MEI serve. https://blog-parceiros.ifood.com.br/taxas-ifood/ ; https://blog-parceiros.ifood.com.br/mei-restaurante/ . A margem de 50% (R$ 600 de pedidos para R$ 300 líquidos) e a "metade" são estimativa | Alta (a comissão e o CNPJ); baixa (o +20% e a metade) |
| 38 | Empréstimo: **+R$ 1.500** no mês 2; no mês 3, **−R$ 183** de parcela (Marcos −213) e **−R$ 1.413** de saldo devedor (Marcos −1.427) | Mês 2, D | seção 2.5 | Alta |
| 39 | Associação: **−1 dia** (não conta quem já está parado) e **−R$ 30** de mensalidade (custo fixo); energia +1, proteção +2; bloqueio do mês 2: liminar, a conta volta no 21º dia (**+9 dias**; com dois apps, metade), como `categoria: "protecao"` (v2.2); `protege: true` | Mês 3, A | Mensalidade: R$ 29,90 (Asmopli-MG), R$ 15,90 (Sincaap-BA); não achei a de Porto Alegre. CUT, 23/07/2026: Simtrapli-RS e advogado, liminar em ~36 dias | Média (o prazo); média (a mensalidade, de outro estado) |
| 40 | Madrugada: **+20%** (zero se machucado ou bloqueado); energia −3; queda e fratura × 4,3; doença **× 4,5** (v2.2; menos a Rose); assalto +3, quebra +3, meta +6 | Mês 3, B | seção 2.7 | Baixa (o +20%); média (o fator de risco) |
| 41 | Não parar nem machucado: **as 4 folgas do mês** (Jonas +357, Kauã +183, Daiane +200, Marcos +383, Rose +280); energia −3; queda e fratura +2; meta +6; doença só 3 dias; fratura do mês 2: **+15 dias**, e só aqui a recaída pode sair | Mês 3, C | Cebrap/Amobitec (2025), p. 71: parte dos acidentados voltou antes de se recuperar | Estimativa |
| 42 | Apertar o cinto: ~4% da comida (Jonas e Kauã +84, Daiane +50, Marcos e Rose +101); energia −1; doença +4 | Mês 3, D | Ação da Cidadania/UFRJ (2024): 32% dos entregadores em insegurança alimentar | Estimativa |

### 2.9 Cartas

Um dia vale: Jonas R$ 89,33, Kauã R$ 45,67, Daiane R$ 50, Marcos R$ 95,67 e Rose
R$ 70. Os consertos, remédios e o celular são **gastos** (fora do "entrou").

| # | Carta (dias parado) | Renda perdida · gastos | Fonte | Confiança |
|---|---|---|---|---|
| 43 | Uma semana boa (v2.2: valores da pesquisa) | Jonas e Kauã +155, Marcos +240, Daiane +165, Rose +320 (eram +10% da renda-base); energia −1 | seção 0.2: iFood (mecânicas de promoção, 2026), 99 (blog, 2022), Confeitaria Armelin, NailNow (2026). Gorjeta fora: ~R$ 5 a 10 por mês (IstoÉ Dinheiro, 16/12/2024) | Alta (a mecânica); baixa (as quantidades) |
| 43a | **Uma data forte puxou a procura** (v2.2), meses 2 e 3, uma vez por partida | Jonas +429, Kauã +219, Marcos +290, Daiane +525, Rose +420; energia −1 (Daiane −2) | seção 0.2: iFood (30/10/2023), IBGE (IPCA, tabela 7060), Sebrae MA (26/03/2024), Folha Vitória (13/12/2024) | Alta (a demanda); média a baixa (a renda) |
| 43b | **Bati a meta do desafio do app** (v2.2), só com jornada longa; Jonas e Marcos | Jonas +600, Marcos +480; energia −1 | seção 0.2: Metrópoles (01/08/2025); 99 (blog, 31/03/2022) | Média (o valor, em SP); baixa (em Porto Alegre e a chance) |
| 44 | Temporal | Jonas +150, Kauã +110, Marcos +150 (promoção e dinâmica); Daiane −100; Rose −161 | INMET, via O Tempo (27/09/2026); Metrópoles (01/08/2025) | Média (o fato); estimativa (os valores) |
| 45 | Quebrou (3) | 3 dias (Jonas −268, Kauã −137, Daiane −150, Marcos −287, Rose −210) · conserto da moto −522, da bicicleta −200, tela −400, suspensão e freio −1.230, autoclave −350 | Cebrap/Amobitec (2025): conserto grande = 2 meses de manutenção (moto R$ 261, carro R$ 615). A manutenção do dia a dia já está na PNAD; o conserto grande é perda ocasional, que a PNAD não desconta (item 9). Autoclave: Portaria SES-RS 500/2010 | Média (moto, carro); estimativa (bicicleta, tela, autoclave) |
| 46 | Doença (7) | 7 dias (Jonas −625, Kauã −320, Daiane −350, Marcos −670, Rose −490) · remédio −60; com "não parar", só 3 dias. Chance com pouco sono: seção 2.7 (v2.2) | Lei 8.213, arts. 25 I e 59; Farmácia Popular sem antibiótico; Prather et al. (2015) | Alta (a regra); estimativa (o remédio) |
| 47 | Queda leve (5), Jonas, Kauã, Marcos | 5 dias (−447, −228, −478) · retrovisor, manete e guidão −594; bicicleta −150; funilaria −800 | Cebrap/Amobitec (2025); AutoPapo (04/03/2026): retrovisor 112,82 + manete 43,58 + guidão 437,11 = R$ 593,51. Seguro do iFood só a partir de 7 dias; INSS só acima de 15 | Média; estimativa (bicicleta e funilaria) |
| 48 | **Fratura (20)**, grave, meses 2 e 3 | 20 dias (Jonas −1.787, Kauã −913, Daiane −1.000, Marcos −1.913, Rose −1.400) · conserto da moto −1.500, da bicicleta −300, do carro −1.840; remédio, tala e ônibus −150. **Mais 25 dias no mês seguinte** (Jonas −2.233) | Dias: INSS, *Diretrizes de apoio à decisão médico-pericial em Ortopedia e Traumatologia* (consulta pública, abr/2008), p. 130–134: rádio distal, 45 dias para consolidar e 90 para recuperar. Moto: 7 peças originais da CG 160 = R$ 1.345,87 (AutoPapo) + ~R$ 150 de mão de obra. Carro: troca e pintura de para-choque R$ 1.020–1.840 em carro popular (Autocidade, "Quanto custa funilaria e pintura 2026", atualizada em 13/06/2026; https://autocidade.com/guia/quanto-custa-funilaria): usado o teto, **R$ 1.840** (era R$ 2.000, atribuído à Revista Oeste, que diz R$ 350–850 só para pintar o para-choque). Bicicleta: roda completa a partir de R$ 280 (Revista Oeste, 19/02/2026). Remédio: dipirona e ibuprofeno na Panvel, órtese de R$ 48,90 a R$ 134,99 (São João), 4 passagens: R$ 151 | Média-alta (os dias); média (moto); baixa (carro, bicicleta) |
| 49 | Auxílio do INSS da fratura (mês 3, só com o MEI), `categoria: "protecao"` (v2.2): vem em cada carta do ramo, menos a "INSS negou" (seção 0.4) | **+R$ 2.431** (45 × 54,03); voltando antes da alta, **+R$ 1.621** (30 dias) | itens 3 e 4 | Alta |
| 50 | **INSS negou**, grave, só depois de fratura com MEI | é a carta que não traz o auxílio (v2.2; antes tirava −2.431 ou −1.621) | item 5; peso 64 (+64 com "não parar"), que dá de 44% a 50% nesse ramo | Média |
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
| Uma semana boa (Semana boa) | 12 | — | sempre | Peguei as promoções e os desafios pequenos da semana, ou entrou uma encomenda maior. Não dá para contar com isso no mês que vem. (v2.2: saiu a gorjeta) | +6 com 12 h; +3 com dois apps |
| Uma data forte puxou a procura (Data forte), v2.2 | 16 | — | meses 2 e 3, no máximo uma vez | Veio uma data forte, como o fim de ano, e a procura subiu. Trabalhei no ritmo dela, e ela só vem uma vez. | +44 para a Daiane; × 0 no mês 3 se saiu no mês 2; × 0 depois de fratura (menos com "não parar") ou bloqueio no mês 2 |
| Bati a meta do desafio do app (Meta), v2.2 | 6 | — | Jonas e Marcos; meses 2 e 3, no máximo uma vez | O app me ofereceu o desafio da semana e eu bati a meta: veio o bônus. O desafio não aparece sempre, e costuma vir para quem anda meio sumido do app. | +6 no mês 2 para quem trabalhou menos no mês 1; × 0 no mês 3 se saiu no mês 2; × 0 como a "data forte" (revisão da F5; antes, peso 0 e só com as opções de esforço) |
| Temporal em Porto Alegre (Temporal) | 8 | — | sempre | Alerta laranja, vento e granizo. O app lançou promoção de chuva em letras grandes; o "cuidado na chuva" veio em letra miúda. | — |
| O instrumento de trabalho quebrou (Quebrou) | 8 | 3 | sempre | Quebrou o que eu uso para trabalhar: três dias sem ele, e o conserto sai do meu bolso. | +3 com 12 h, aceitar tudo, dois apps e madrugada |
| Adoeci: uma semana parado (Doença) | 6 | 7 | sempre | Parei uma semana. Nem o MEI cobre: doença exige 12 meses de contribuição e mais de 15 dias parado. | × 4,24 com energia < 4 e × 4,5 com < 2; × 4,24 com 12 h; × 4,5 de madrugada (menos a Rose), sem somar ao da energia; +4 apertando o cinto (v2.2; eram +8 e +8) |
| Queda leve: 5 dias parado (Queda) | 6 | 5 | Jonas, Kauã, Marcos | Um tombo no molhado, ou uma batida leve: cinco dias parado e o conserto. Menos de 7 dias, o seguro do app não paga; menos de 16, o INSS não paga. | × 1,9 com 12 h (v2.2; era +2); +2 com aceitar tudo, dois apps e não parar; × 0,6 trabalhando menos; sono (seção 2.7); × 4,3 de madrugada |
| **Acidente: fratura, 45 dias parado (Fratura)**, grave | 1 | 20 | meses 2 e 3 | Me acidentei e quebrei o punho: 45 dias parado, 20 neste mês e 25 no próximo. O seguro do app só paga se foi na entrega, e poucos recebem; o INSS, só com o MEI, e um mês depois. | +3 moto e bike; +2 carro; +2 com os esforços acima (quem está na rua); sono; × 4,3 de madrugada |
| **Conta bloqueada sem explicação (Bloqueio)**, grave | 4 | 15 | meses 2 e 3 | Bloquearam minha conta com uma mensagem genérica, sem prazo e sem jeito de me defender. Sem advogado, ninguém responde o recurso. | × 0,4 aceitando tudo; +4 com dois apps |
| **Fui assaltado (Assalto)**, grave | 2 | 3 | menos Daiane | Levaram o celular e o dinheiro do dia. Fiquei dois dias sem coragem de sair, e sem celular não tem app. | +2 com 12 h; +3 de madrugada |
| Trabalhei e não recebi (Não pagou) | 8 | — | sempre | Fiz o serviço, ou fui até lá, e o dinheiro não veio. Reclamar no app leva dias e quase nunca dá em nada. | — |
| O app apertou a taxa (Taxa) | 6 | — | meses 1 e 3; Jonas, Kauã, Daiane | Mais um corte, sem aviso: a segunda entrega da rota passou a pagar menos, ou o anúncio e o insumo subiram. | — |
| A mobilização arrancou um reajuste (Reajuste) | 2 | — | mês 3; Jonas e Kauã | Depois do breque, a plataforma subiu o valor mínimo por entrega. É pouco, e veio de quem parou. | +8 se parou no breque; +5 com a associação |
| **A perícia do INSS negou o auxílio (INSS negou)**, grave | 64 | — | mês 3; fratura no mês 2 com MEI | Paguei o MEI em dia, esperei a decisão e a perícia negou. O dinheiro que eu contava não veio. | +64 com "não parar" (fica em ~50% nos dois casos). v2.2: sem efeito em dinheiro; as outras cartas do ramo trazem o auxílio como proteção |
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

(v2.2; "Normal" soma a "O mês passado ainda pesa"; a "INSS negou" dá 0,6% no mês 3.)

| Mês e opção | Normal | Semana boa | Data forte | Meta | Temporal | Quebrou | Doença | Queda | Fratura | Bloqueio | Assalto | Não pagou | Taxa | Reajuste |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 C (de sempre) | 41,7% | 12,5% | — | — | 8,3% | 8,3% | 6,3% | 6,3% | — | — | 2,1% | 8,3% | 6,3% | — |
| 2 A (aceitar tudo) | 30,0% | 9,0% | 12,0% | 3,0% | 6,0% | 8,2% | 7,5% | 8,9% | 6,7% | 1,2% | 1,5% | 6,0% | — | — |
| 3 D (apertar o cinto) | 31,5% | 7,6% | 8,6% | — | 5,0% | 5,6% | 12,0% | 7,5% | 5,0% | 2,5% | 1,4% | 5,6% | 4,2% | 2,8% |
| 3 B (madrugada) | 22,2% | 4,8% | 5,5% | 2,4% | 3,2% | 5,2% | 10,9% | 19,6% | 13,1% | 1,6% | 2,4% | 3,8% | 2,8% | 1,9% |

- **Queda e fratura juntas** ficam entre 6% e 16% por mês no piloto; de madrugada,
  33%. A pesquisa do Cebrap dá 22% de acidente em 3 meses, e a da UFBA, 44% em um ano.
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
custou R$ 258. **Na tela (v2.2):** no mês 3 com o INSS aprovado aparece "a proteção
pagou R$ 2.431", fora do "entrou". A liminar da associação é trabalho do mês (revisão
da F5). As contas desta tabela não mudaram: o dinheiro é o mesmo, só a linha é outra.
O pior caso com e sem a proteção, por persona, está na seção 0.4.

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
| | 2 | 1.275 | 141 | — | 1.134 | 100 | 2.755 | 104 | **−1.825** | −3.221 | 2 |
| | 3 | 1.400 | 141 | — | 1.259 | 100 | 2.755 | 239 | **−1.835** | −5.056 | 1 |

(v2.2: só a Daiane mudou, porque o "aceitar toda encomenda" deixou de render +R$ 60, seção 0.6.)
| Marcos | 1 | 2.870 | 0 | 1.499 | 4.369 | 0 | 4.742 | 0 | **−373** | −373 | 4 |
| | 2 | 2.726 | 0 | 1.499 | 4.225 | 130 | 4.742 | 28 | **−675** | −1.048 | 2 |
| | 3 | 2.684 | 0 | 1.499 | 4.183 | 130 | 4.742 | 78 | **−767** | −1.815 | 1 |
| Rose | 1 | 2.100 | 0 | — | 2.100 | 0 | 4.512 | 0 | **−2.412** | −2.412 | 4 |
| | 2 | 1.995 | 0 | — | 1.995 | 130 | 4.512 | 179 | **−2.826** | −5.238 | 2 |
| | 3 | 1.991 | 0 | — | 1.991 | 130 | 4.512 | 389 | **−3.040** | −8.278 | 1 |

- No mês 3, a Daiane, o Marcos e a Rose começam com energia 2: rendem 10% menos
  (Marcos 2.870 → 2.583, mais os R$ 101 do cinto).
- **O "entrou" não fica negativo neste caminho**, mas fica em outros, raros: a
  conferência (i) do validador enumera todos. Daiane até −R$ 436 (r3, associação e
  quebrou, depois de bloqueio no mês 2), em 1,6% dos meses 3 ao acaso; Rose até
  −R$ 299, em 0,99% (revisão da F5; eram −R$ 406 e −R$ 269 no v2.1). Com o trabalho em 0 (piso), sobram os custos fixos (curso, mensalidade,
  parcela do empréstimo, DAS). Antes da 2ª rodada, este texto dizia "em nenhum
  outro", o que estava errado (seção 8, item 11).
- **O trabalho nunca fica negativo** (piso da 2ª rodada, conferido em (i)).

**Uma conta à mão (Jonas, mês 1, opção C):**
- **Sem carta:** 2.680 − 480 + 1.499 − 4.166 = **−R$ 467**.
- **Cartas** (pesos somam 96; a renda perdida e os gastos juntos; v2.2, a semana boa
  vale R$ 155): (12 × 155 + 8 × 150 − 8 × 790 − 6 × 685 − 6 × 1.041 − 2 × 1.268 −
  8 × 120 − 6 × 180) ÷ 96 = −18.192 ÷ 96 = **−R$ 189,5**.
- **Mês:** **−R$ 656,5**. É o que o validador imprime em (b): "r1 c renda E −656,5".

### 5.2 Uma decisão por vez (as outras ao acaso)

Saldo esperado no fim dos 3 meses; `*` é o padrão; em negrito, a melhor opção da
persona naquele mês (conferência h). Em R$.

| Persona | Mês | A | B | C | D |
|---|---|---|---|---|---|
| Jonas | 1 | −3.392 | −3.281 | −3.066* | **−2.951** |
| | 2 | −3.204* | −3.247 | **−3.033** | −3.206 |
| | 3 | −3.344 | −3.220 | **−2.933** | −3.194* |
| Kauã | 1 | −4.487 | −4.356 | −4.146* | **−4.090** |
| | 2 | −4.287* | −4.325 | **−4.163** | −4.305 |
| | 3 | −4.390 | −4.274 | **−4.157** | −4.259* |
| Daiane | 1 | **−4.908** | −5.191 | −4.977* | −5.014 |
| | 2 | −5.031* | −5.028 | −5.043 | **−4.989** |
| | 3 | −5.205 | **−4.878** | −4.910 | −5.097* |
| Marcos | 1 | −3.572 | −3.394 | −3.167* | **−2.941** |
| | 2 | −3.345* | −3.342 | **−3.093** | −3.292 |
| | 3 | −3.459 | −3.323 | **−3.023** | −3.268* |
| Rose | 1 | **−8.539** | −8.868 | −8.601* | −8.667 |
| | 2 | −8.625* | −8.845 | **−8.435** | −8.770 |
| | 3 | −8.919 | **−8.477** | −8.525 | −8.753* |

(v2.2, com a revisão da F5: só o Jonas e o Marcos mudaram, pela carta "meta".)

**O que a tabela mostra:**
- **Mês 1:** trabalhar menos para Jonas, Kauã e Marcos; as 12 horas só para Daiane e
  Rose, que não estão na rua (seção 0.5). Para quem está na rua, as 12 horas passaram
  a ser a **pior** opção do mês 1 (eram a melhor).
- **Mês 2:** dois apps para quatro personas; para a Daiane, o empréstimo, porque o
  app de delivery cobra 26,2% e exige CNPJ. O empréstimo é quase neutro e fica em
  segundo ou terceiro para os outros.
- **Mês 3:** "não parar" para quem está na rua (Jonas, Kauã, Marcos), porque de
  madrugada o risco de acidente sobe 4,3 vezes; madrugada para a Daiane e a Rose, que
  não estão na rua.
- **O padrão nunca é a melhor.** A folga menor: Daiane, mês 2, R$ 42 (A contra D);
  Kauã, mês 1, R$ 56 (C contra D). Uma edição pequena pode trazer o aviso de volta.
- **A associação é a pior do mês 3 nas 5 personas** (D-029).
- **O MEI perde no saldo esperado** (R$ 210 a R$ 267 na média, seção 0.4) e é a pior
  do mês 1 para Daiane e Rose; para quem está na rua, a pior agora são as 12 horas. O
  que ele protege está na seção 0.4 (pior caso) e na 4.5.

### 5.3 Caminhos inteiros

| Persona | Piloto (C-A-D): esperado · mediana | Melhor plano esperado | Pior plano esperado | Ao acaso: 10% piores / 10% melhores | Melhor caminho possível | Fecha: piloto · ao acaso · melhor plano | Pior caso |
|---|---|---|---|---|---|---|---|
| Jonas | −3.147 · −2.661 | D-C-C: −2.428 | A-D-A: −3.654 | −5.698 / −1.520 | **+437** (A → C → B: semana boa, data forte, meta) | 0% · 0,01% · 0,4% (A-C-B) | −11.708 |
| Kauã | −4.197 · −3.985 | D-C-C: −3.819 | A-B-A: −4.698 | −5.405 / −3.459 | −2.716 | 0% · 0% · 0% | −8.991 |
| Daiane | −5.090 · −5.017 | A-A-B: −4.715 | B-A-A: −5.462 | −5.800 / −4.327 | −3.628 | 0% · 0% · 0% | −8.863 |
| Marcos | −3.324 · −2.898 | D-C-C: −2.402 | A-B-A: −3.880 | −5.982 / −1.290 | **+684** (A → C → B: semana boa, data forte, meta) | 0% · 0,1% · 2,8% (A-C-B) | −12.753 |
| Rose | −8.708 · −8.563 | A-C-B: −8.054 | B-B-A: −9.215 | −9.705 / −7.709 | −6.253 | 0% · 0% · 0% | −14.737 |

(v2.2.)

- **O caminho estreito (D-050) existe para o Jonas e o Marcos:** 12 horas, dois apps e
  madrugada, com semana boa, data forte e meta. Numa sala com as 6 equipes, jogando ao
  acaso, a chance de alguma fechar é de ~0,1%; jogando o melhor plano, de ~3,6%.
- **O melhor plano esperado e o plano que fecha agora são diferentes** para Jonas,
  Kauã e Marcos: o melhor na média começa descansando (D-C-C), e o que fecha começa
  com 12 horas, por causa de pesos estimados (seção 0.3, item 1). Para Daiane e Rose, o melhor ainda começa com 12
  horas e termina com a energia perto de 0. A energia final não aparece no placar
  (seção 8, item 6).
- **Quem mora na casa pesa mais do que o que se decide.** O melhor caminho da Rose
  (−6.253) fica abaixo do piloto de qualquer outra persona.

### 5.4 O que o validador disse

- **O que rodei:** `node bin/validar-config.mjs`, versão `2026-09-29-v2.2-rascunho`,
  hash `71e61ab8` (D-058 e D-059 com a revisão da F5, seção 0). A saída inteira de (g) e (h) está na
  seção 0.7.
- **Formato:** 0 erros e 0 avisos de formato.
- **(c) Opção dominante:** nenhuma.
- **(d) Piloto automático:** o padrão nunca é a opção de maior saldo esperado.
- **(e) Variância, 5 avisos (aceitos pela D-024):** as decisões explicam Jonas 2,3%,
  Kauã 5,9%, Daiane 7,5%, Marcos 2,8% e Rose 9,5% (no v2.1: 3,2%, 3,3%, 15,7%, 2,7%
  e 15,5%). As cartas de pico somam sorte, e o esgotamento mais caro aproxima as
  opções na média.
- **(f):** a energia chega a 0 em 49,3% das partidas, com consequência.
- **(g) D-050 e D-058, 4 avisos:**
  - "nenhum caminho fecha" para Kauã, Daiane e Rose: sem mudar a renda da casa, não
    há conta honesta que os leve a 0 (seção 8, item 1);
  - "só 0 persona(s) entre 5% e 10% ao acaso": a meta da D-058 não se cumpre com os
    dados reais (seção 0.3 e 0.8, item 1). Jonas fecha em 0,01% ao acaso (0,4% no
    melhor plano), Marcos em 0,1% (2,8%). Só o padrão: 0% nas 5.
- **(h) D-051 e D-059, 1 aviso:** a melhor opção muda com a persona nos 3 meses, e a
  de maior renda no mês fica em A, D e C (o D do mês 2 é o empréstimo; seção 8,
  item 14). O aviso é o do esgotamento, agora medido pela energia: no mês 2, dois
  apps é a mais cansativa e a melhor para 4 personas (seção 0.5 e 0.8, item 3). A proteção: o MEI melhora o pior caso nas 5 personas; a
  associação, em nenhuma (seção 0.4).
- **(i) Conta do mês, 2 avisos:** trabalho ≥ R$ 0 e renda perdida nunca maior que a
  renda sem a carta, nas 5 personas; o "entrou" negativo da Daiane (pior −R$ 436;
  r2 0,074% e r3 1,6% dos casos ao acaso) e da Rose (pior −R$ 299; r3 0,99%).
- **Dias parados:** conferi por enumeração, em todos os caminhos das 5 personas: o
  máximo é 30 (fratura no mês 2, "não parar" e nova fratura no mês 3).
- **Testes:** `npm run check` 434 de 434; `npm run emulador` 32 de 32 (duas vezes; o
  simulador do emulador agora usa a fixture v2.1); `npm run e2e` e `npm run e2e:online`
  ok; simulador com `--atacar` no emulador com o config.json: 0 violações, 67 de 67
  ataques recusados.
- **Testes do v2.2** (29/09, noite, com este config): `npm run check` 451 de 451;
  `npm run e2e` ok (54 telas em 1024×768 e 1920×1080, com a página "O pior que podia
  acontecer", que aparece porque o config agora tem `protege`); `npm run e2e:online` ok
  com o config.json e com `E2E_FIXTURE=1`; `npm run emulador` 32 de 32, simulador com
  0 violações. Tudo no emulador; nada no projeto real.
- **Testes da revisão da F5** (29/09, noite, hash `71e61ab8`): `npm run check` 455 de
  455; `npm run emulador` 32 de 32, duas vezes; `npm run e2e` ok (54 telas);
  `npm run e2e:online` ok (26 capturas) e `npm run e2e:online:fixture` ok (27
  capturas); simulador com `--atacar` no emulador: 0 violações. Nada no projeto real.

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

**v2.2:** os itens estão como no v2.1. Os que a D-058 e a D-059 tocaram levam uma
nota "**v2.2:**" no fim, com os números novos; nenhum outro foi resolvido aqui. As
decisões novas, só da D-058 e da D-059, estão na seção 0.8.

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
   - **v2.2:** continua aberto. Com os picos da D-058, o melhor caminho fica em
     −R$ 2.716 (Kauã), −R$ 3.628 (Daiane) e −R$ 6.253 (Rose): os picos com fonte não
     bastam, e o 13º e o abono não servem a Daiane e Rose (seção 0.3).
2. **D-056: a referência com carteira ficou perto do app.** Com as correções, o Jonas
   de app termina com −R$ 3.388 esperado e −R$ 2.808 na mediana; a referência fica em
   −R$ 2.957.
   - *Por que importa:* a leitura "com carteira falta menos" enfraquece. A conta da
     carteira desconta a manutenção (que o salário não cobre) e não leva a multa do
     aluguel.
   - *Opções:* (a) manter −R$ 2.957; (b) incluir a multa do aluguel também na
     carteira (−R$ 260); (c) somar o FGTS (+R$ 657), que é patrimônio do trabalhador.
   - **v2.2:** o Jonas de app termina com −R$ 3.147 esperado e −R$ 2.661 na mediana
     (as cartas de pico, com a revisão da F5). A referência continua em −R$ 2.957.
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
   - **v2.2: resolvido em parte pela D-059.** O melhor plano esperado do Jonas, do
     Kauã e do Marcos começa descansando (D-C-C); o da Daiane e o da Rose ainda
     começa com 12 horas (seção 0.5). A energia final continua fora do placar.
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
   - **v2.2:** a "semana boa" ganhou fonte (seção 0.2). Entram como estimativa: os
     pesos da carta "meta", a energia −5 das 12 horas, o repasse de metade da tarifa
     de dezembro ao Marcos e o mapeamento de energia e opções para horas de sono. O
     −10% do exausto continua, e a pesquisa mediu menos (RAND, −2,4%; seção 0.5).
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
    - **v2.2:** Daiane até −R$ 436 (1,6% dos meses 3 ao acaso) e Rose até −R$ 299
      (0,99%), depois da revisão da F5 (a liminar da associação voltou ao "entrou").
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
    - **v2.2: resolvido para o INSS pela D-059.** O auxílio virou `categoria:
      "protecao"`: sai numa linha própria ("a proteção pagou R$ 2.431") e não entra no
      trabalho nem no "entrou". O empréstimo continua como renda do mês 2.
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
    - **v2.2: a D-058 tentou, e não chegou lá.** Jonas 0,01% e Marcos 0,1% ao acaso
      (0,4% e 2,8% no melhor plano), com a revisão da F5; ver a seção 0.3 e a decisão
      da seção 0.8, item 1.
17. **A D-051 é parcial.** *Precisa de decisão* (é o item 6). As 12 horas são a
    melhor opção do mês 1 para 4 personas (Jonas +R$ 419 sobre a segunda); "não
    parar nem machucado" é a melhor do mês 3 para Jonas, Kauã e Marcos; o MEI é a
    pior do mês 1 e a associação a pior do mês 3 nas 5 personas. As diferenças que
    fazem "a melhor muda com a persona" são de R$ 18 (Kauã) e R$ 20 (Daiane). *Opções:*
    mostrar a energia final e a proteção no placar, mudar pesos ou efeitos, ou
    registrar na D-051 que ela é parcial.
    - **v2.2: resolvido só no mês 1 pela D-059.** As 12 horas são as melhores só para
      Daiane e Rose. No mês 2, dois apps, a opção mais cansativa, é a melhor para 4
      personas (a revisão da F5 mediu o esforço pela energia; seção 0.8, item 3). O MEI perde no esperado e ganha no
      pior caso (seção 0.4); a associação continua a pior do mês 3 (D-029).
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
    - **v2.2:** mediana do app −R$ 2.661, esperado −R$ 3.147; a referência, −R$ 2.957.

### Da revisão da F5 (29/09, noite; todos precisam de decisão)

O que era erro de tela, de fonte ou de medida foi corrigido (seção 0.6b). Os itens
abaixo mudam decisão ou conteúdo, e ficaram como estão até você decidir. Os detalhes
estão na seção 0.8.

20. **A D-058 não foi alcançada com a opção (a) que você escolheu.** 0 personas na
    faixa de 5% a 10% (Jonas 0,01%, Marcos 0,1% ao acaso). As saídas com número, (c)
    abono do PIS e (d) 13º, fazem quem fica só no padrão fechar também, o que fere a
    própria D-058. A opção (b), "aceitar que ninguém fecha", foi a que você recusou, e
    não está recomendada. Seção 0.8, item 1.
21. **A associação e a nota fixa do placar.** A associação piora o pior caso nas 5
    personas; a tela já não mostra um "sem a proteção" melhor que o "com" (diz "a
    proteção não melhorou o pior caso"), mas a nota fixa "A proteção não rende mais
    na média: ela evita o pior." continua em cima dessa linha. Opções: trocar a nota,
    tirar o `protege` da associação (a recomendação, até decidir), outra
    contrafactual, ou nomear a proteção trocada. Seção 0.8, item 2.
22. **O esgotamento no mês 2.** Medido pela energia, dois apps é a opção mais
    cansativa e a melhor para 4 personas; a D-059 só está cumprida, de fato, no mês 1.
    Seção 0.8, item 3.
