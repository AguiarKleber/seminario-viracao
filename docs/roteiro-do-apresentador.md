# Roteiro do apresentador

Tudo o que é preciso para conduzir o seminário sozinho, pelo teclado do notebook.
Como publicar o site está no [README](../README.md). Como mudar o conteúdo está em
[como-editar-config.md](como-editar-config.md).

**Datas (D-036):** o teste com celulares no eduroam é em **30/09** (quarta), e o
seminário, em **07/10** (quarta). O conteúdo e o código ficam congelados até
06/10.

**Redesenho de 29/09 (D-041 a D-048).** O teste de 30/09 já usa a versão nova
(D-048). O que mudou para quem conduz:
- a família de cada persona e o **básico da casa** entram no jogo, e todo mês a
  tela mostra "entrou · básico · faltou", mais a dívida e os juros (D-044,
  D-046);
- cada mês tem **4 opções**, todas com um preço, sem setas, e a decisão dura
  **120 s** (D-043);
- o **placar final é em páginas**, passadas com o Espaço: o saldo contra o
  básico, "Escolha ou sorte?" e a história de cada equipe (D-041, D-045). As
  teclas C e V saíram;
- todo bloco mostra a **linha do tempo** do seminário inteiro, até o fim
  (D-042);
- o termo "piloto automático" saiu de todas as telas: a equipe sem voto aparece
  como "ninguém votou" (D-041);
- tudo o que só você usa (exportar, apagar, dicas de tecla, avisos) fica na
  **barra oculta** (D-047).

Os pontos marcados "vamos testar" (D-041, D-042, D-043) são para observar no
teste (seção 13). As perguntas de conteúdo ainda em aberto estão no
[rascunho-conteudo.md](rascunho-conteudo.md), seções 6 e 7.

1. [O que levar](#1-o-que-levar)
2. [Véspera](#2-véspera)
3. [No dia: montagem](#3-no-dia-montagem)
4. [Teclas e barra do apresentador](#4-teclas-e-barra-do-apresentador)
5. [Como conduzir cada passo](#5-como-conduzir-cada-passo)
6. [Minuto a minuto: 60 min](#6-minuto-a-minuto-60-min)
7. [Minuto a minuto: 120 min](#7-minuto-a-minuto-120-min)
8. [Se a rede cair](#8-se-a-rede-cair)
9. [Se o telão travar](#9-se-o-telão-travar)
10. [Problemas comuns](#10-problemas-comuns)
11. [Cuidados com o tema](#11-cuidados-com-o-tema)
12. [Depois da aula](#12-depois-da-aula)
13. [Teste no eduroam (30/09)](#13-teste-no-eduroam-3009)

---

## 1. O que levar

- O notebook, com o Chrome ou o Edge atualizado, e o carregador.
- O cabo ou adaptador para o projetor.
- O pendrive com a pasta do ZIP (README, passo 11).
- O PIN do apresentador, de memória ou num papel que fica com você. Nunca na tela.
- Papel e caneta, para anotar o código da sala.
- Os slides, prontos para abrir numa janela própria. Eles são o material
  complementar: o telão mostra a linha do tempo, e o conteúdo de cada trecho
  está nos slides (D-042).
- O plano B em papel da trilha: cartões coloridos ou mão levantada.

## 2. Véspera

### Site e serviço

- [ ] Nenhuma mudança no site depois do congelamento (06/10).
- [ ] O telão publicado abre com "✓ Válido". Hash anotado: `________`.
- [ ] O bloco 3 diz `Serviço conectado · regras v3 conferidas.`, sem `REGRAS
      ABERTAS`. Se o `firebase/regras.json` mudou depois do teste, a versão
      subiu junto (v4, v5…), e as regras novas já foram publicadas (README,
      passo 6).
- [ ] Uma sala de teste foi criada com o PIN e apagada (README, passo 8).
- [ ] A cota de contas anônimas está agendada para a aula, se o console oferecer
      (README, passo 9).
- [ ] No pendrive, `telao/index.html` abre por duplo clique e mostra o mesmo hash.
- [ ] Ninguém vai rodar o simulador contra o projeto real no campus nem no dia da
      aula (AGENTS.md, regra 6).
- [ ] Opcional, **em casa** e nunca no campus: um ensaio com 20 alunos simulados
      contra o projeto real (arquitetura, seção 13). Crie uma sala no telão
      publicado e rode `node bin/simular-alunos.mjs --sala CODIGO
      --sim-tenho-certeza --atacar`. Os robôs entram, tentam os ataques e esperam
      você conduzir o telão até o Fim. O relatório final não pode ter nenhuma
      violação. Cada execução cria de 20 a 25 contas anônimas: no máximo 3
      execuções por hora. Depois, apague a sala.

### Navegador do notebook

Use no dia o mesmo navegador (Chrome ou Edge) que for configurado aqui. Os nomes
dos menus mudam um pouco entre versões.

- [ ] **Economia de memória desligada para o site.**
  - Chrome: Configurações → Desempenho → Economia de memória → "Sempre manter
    estes sites ativos" → Adicionar → `aguiarkleber.github.io`.
  - Edge: Configurações → Sistema e desempenho → guias em suspensão → "Nunca
    colocar estes sites em suspensão" → Adicionar → `aguiarkleber.github.io`.
  - Por quê: o telão passa minutos escondido atrás dos slides (D-007), e uma aba
    suspensa pode ser descartada.
- [ ] **Downloads automáticos permitidos para o site.**
  - Chrome: Configurações → Privacidade e segurança → Configurações do site →
    Permissões adicionais → Downloads automáticos → permitir
    `https://aguiarkleber.github.io`.
  - Edge: Configurações → Cookies e permissões de site → Downloads automáticos.
  - Por quê: ao fim de cada rodada, o telão baixa sozinho um JSON com o estado da
    sala, o seguro para o caso "travou e caiu a internet" (D-015). Sem a
    permissão, a partir do segundo arquivo o navegador pergunta na frente da
    turma, ou bloqueia.
- [ ] **"Perguntar onde salvar cada arquivo" desligado** (Configurações →
      Downloads). No Edge, desligue também "Mostrar o menu de downloads quando um
      download começar": ele cobre o canto do telão.
- [ ] **Janela normal**, e não anônima nem InPrivate. Ao fechar uma janela
      anônima, o telão perde o login, e retomar a sala passa a pedir o PIN.
- [ ] **Zoom em 100%** (Ctrl+0). O telão foi desenhado para caber sem rolagem em
      1024×768 e em 1920×1080.

### Notebook

- [ ] Windows Update pausado por uma semana.
- [ ] Notificações desligadas durante a aula (Não perturbe).
- [ ] Energia: com o carregador ligado, nunca suspender nem desligar a tela.
- [ ] Os slides abrem sem susto.

## 3. No dia: montagem

Chegue 30 minutos antes.

1. Ligue o carregador na tomada e o projetor no notebook.
2. Escolha o modo de tela com **Win+P**:
   - **Duplicar** (o mais simples): o projetor mostra o mesmo que o notebook, e o
     Alt+Tab troca o que a turma vê;
   - **Estender**: o notebook fica livre, mas as **duas** janelas (telão e slides)
     têm de ficar na tela do projetor. Leve cada janela para lá com
     Win+Shift+→ antes de pôr em tela cheia.
3. **Antes de a turma ver a tela** (projetor ainda desligado, ou com a imagem em
   branco pelo botão do projetor), abra
   `https://aguiarkleber.github.io/seminario-viracao/telao/` numa janela própria
   do Chrome ou do Edge, o mesmo navegador configurado na véspera: economia de
   memória desligada para o site e downloads automáticos permitidos (seção 2).
   Se o notebook do dia não for o da véspera, faça essa configuração agora.
4. Confira o bloco 1 (config válido e o mesmo hash da véspera) e o bloco 3
   (`regras v3 conferidas`). No bloco 2, escolha o roteiro: **60min** ou
   **120min** (D-019).
5. Digite o PIN e clique em **Criar sala com celulares**. **Anote o código da
   sala no papel.** Se o notebook travar, é com ele que a sala é retomada.
6. Aperte **F11** para a janela do telão ficar em tela cheia (D-007). Abra os
   slides em **outra janela**, também em tela cheia. Teste o Alt+Tab duas vezes e
   termine no telão.
7. Se o teste no eduroam mostrou que só a "rede restrita" funciona, abra o telão
   com `/telao/?lp=1` no fim do endereço, já no passo 3. O próprio telão passa a
   usar a conexão compatível, e o QR já sai com a **Rede restrita** ligada (o
   botão aparece marcado na barra). Veja a seção 13.
8. Deixe o telão no lobby, com o QR grande, enquanto a turma chega.

## 4. Teclas e barra do apresentador

As teclas só valem com o telão na frente. Enquanto a janela dos slides está
ativa, o Espaço e as setas vão para os slides.

| Tecla | O que faz | Quando |
| --- | --- | --- |
| Espaço, → ou PageDown | Avança. Duas vezes seguidas em menos de 1,5 s contam como uma. No placar final e no comparativo, passa para a próxima página, e da última segue o roteiro. Na enquete sem celulares com as afirmações juntas, passa para a próxima afirmação | Quase sempre. **Nunca fecha votação** |
| Enter | Encerra a votação, a decisão ou a prorrogação | Com votação aberta. Pede confirmação antes do tempo mínimo de conversa e, sem celulares, quando alguma afirmação ficou sem contagem |
| P | Pausa ou retoma. Pausado, **ninguém consegue votar** | Com votação aberta |
| Ctrl+Z | Desfaz, com confirmação. Com a votação recém-aberta por um Espaço a mais, desfaz a abertura e volta à tela de antes, **se nenhum voto chegou** e, na rodada, se você não decidiu por nenhuma equipe (senão avisa "Já chegaram N votos" e a votação segue aberta). Uma rodada que já foi apurada e reaberta pelo Ctrl+Z não volta mais para trás. Se a rede falhar no meio, a tela mostra "Desfazendo a abertura…": dê Ctrl+Z de novo (o Enter pergunta antes de apurar) | Depois de encerrar uma rodada ou uma enquete; com enquete ou decisão aberta (não na prorrogação) |
| F | Tela cheia da página (alternativa ao F11) | Qualquer hora |
| H | Mostra ou esconde a barra. Mostrada pela tecla, ela também some sozinha em 3 s (fica enquanto você navega nela com Tab) | Qualquer hora |
| 1 a 6 | Abre ou fecha a equipe daquele número | Formação das equipes |
| 1 a 5 | Soma 1 na coluna da escala; Shift + tecla desconta | Enquete sem celulares (mão levantada) |
| ↑ e ↓ | Voltam ou avançam a afirmação que está sendo contada | Enquete sem celulares, com as afirmações juntas |
| ← e PageUp | Nada, de propósito | — |
| F11 | Tela cheia da janela do navegador | Montagem |
| Alt+Tab | Alterna entre o telão e os slides | Nos blocos |
| Esc | Fecha a janela de confirmação ou de escolha | Com uma dessas janelas aberta |

As teclas C (critério do placar) e V ("sem vencedor") saíram junto com o placar
decomposto (D-041): o placar novo não tem critério a trocar nem vencedor a
esconder.

**A barra do apresentador** fica escondida. Ela aparece com H ou com o mouse
encostado na borda de baixo da tela, e some 3 s depois do último movimento do
mouse na borda ou sobre ela, mesmo com o mouse parado ali (mexer o mouse no meio
da tela não a mostra). Aberta pelo H, ela também some em 3 s. Só a seguram uma
janela de escolha aberta ou o foco do teclado dentro dela. As teclas funcionam
com ela escondida. À esquerda, ela mostra:
- o passo e o atraso, por exemplo "passo 8 de 19 · +3 min de atraso";
- o nome do passo;
- "estado salvo às 14:05 (r1)", depois do primeiro salvamento. O salvamento
  automático do fim de rodada aparece **só aqui**, sem aviso na tela projetada;
- com celulares, "18 ativos / 21 membros". Membro é quem já entrou na sala;
  ativo é o celular com sinal no último minuto. Esse número fica **só aqui**: o
  lobby projeta apenas os conectados;
- a **dica do passo**, o que antes ficava projetado: as teclas da formação das
  equipes e da contagem à mão, quanto falta do tempo mínimo de conversa, "Todas
  as equipes decidiram. Enter encerra.", a página do placar final e do
  comparativo ("Espaço: próxima página (2 de 8)") e, no Fim, o que a exportação
  leva;
- o selo de conexão: **Conectado**, **Reconectando…**, **Sem celulares** ou
  **Outra máquina assumiu** (seção 9).

**Os avisos também ficam com a barra** (D-047). Durante a sessão, um aviso
("Totais exportados…", "Laranja sempre joga…") só aparece com a barra aberta,
logo acima dela, e dura 15 s: se ele surgiu com a barra escondida, aperte H para
lê-lo. Um aviso de **erro** (comando recusado, sem conexão) abre a barra sozinho,
para não passar calado. Na abertura, antes de projetar, os avisos continuam no
topo da tela.

| Botão | O que faz |
| --- | --- |
| Avançar (Espaço) | O mesmo que a tecla |
| Encerrar (Enter) | O mesmo que a tecla |
| +30 s | Soma 30 s ao prazo da votação. Com o tempo já esgotado, reabre a votação |
| Pausar / Retomar (P) | O mesmo que a tecla |
| Desfazer (Ctrl+Z) | O mesmo que a tecla |
| Pular para… | Vai para um passo à frente. Só para a frente, e os passos do meio não acontecem |
| Decidir por esta equipe | Registra a opção de uma equipe sem celular, ou que anunciou em voz alta |
| Mover aluno | Troca um aluno de equipe pelas 3 letras do crachá (só com celulares) |
| Remover inativos (segure) | Apaga o registro de quem está sem sinal há mais de 2 min. Segure 2 s. O aviso diz só quantos saíram. Não tem tecla de atalho (só com celulares; veja a seção 10) |
| Entrada aberta / fechada | Abre ou fecha a entrada de novos celulares (só com celulares) |
| Rede restrita | Troca o QR por um que força a conexão mais lenta e mais compatível (`?lp=1`) (só com celulares) |
| Salvar estado | Baixa o JSON com o estado da sala, sem nenhum voto individual |
| Tela cheia (F) | O mesmo que a tecla |
| Encerrar jogo (segure) | Vai direto para o Fim. Segure 2 s |
| Continuar sem celulares (segure) | Segue sem celulares a partir do passo atual. Segure 2 s. **Não tem volta** (só com celulares) |
| Exportar totais | Baixa o JSON só com os totais (seção 12). Era um botão da tela do Fim |
| Apagar a sala (segure 2 s) | Apaga a sala e os votos (D-015). Só funciona no passo Fim: no meio da aula, um engano apagaria o jogo inteiro |

**Fora da projeção (D-047).** Nenhum controle que só você usa aparece na tela que
a turma vê: exportar, apagar, "N ativos / M membros", as dicas de tecla e os
avisos ficam na barra. Na projeção ficam só os controles que também são
informação para a turma: os cartões da formação das equipes (quais jogam) e, sem
celulares, as letras da decisão de cada equipe (o que ela anunciou). A abertura
(config, roteiro, PIN) é a exceção, porque acontece antes de projetar.

**Proteções:**
- o Espaço nunca fecha votação;
- o que não tem volta pede para segurar o botão por 2 s;
- depois de cada clique, o botão perde o foco, para o Espaço seguinte não
  apertá-lo de novo;
- as confirmações abrem com o foco em **Cancelar**: Enter ou Espaço cancelam, e
  confirmar é **Tab e Enter**, ou um clique no botão. Valem para: encerrar antes
  do tempo mínimo de conversa, desfazer, encerrar a enquete sem celulares com
  afirmação sem contagem e a primeira contagem à mão por cima de votos de
  celular;
- sem conexão (selo em **Reconectando…**), os comandos são recusados na hora,
  com aviso, e não ficam numa fila: repita quando o selo voltar a
  **Conectado** (seção 8).

**O cronômetro é só visual.** Nada fecha sozinho: quem encerra é você (D-010).
Mas o servidor recusa o voto que chega depois do prazo, com 5 s de tolerância. Se
uma equipe ainda está conversando quando o tempo acaba, aperte **+30 s**.

## 5. Como conduzir cada passo

As falas são **sugestões**. O conteúdo de cada trecho da apresentação está nos
slides.

### 5.1 Lobby

- **Telão:** QR grande, o endereço, o código da sala e "N conectados": celular
  com sinal no último minuto. O "N ativos / M membros" (membro é quem já entrou,
  inclusive quem fechou a aba) fica só na barra (D-047). Só números: nem crachá
  nem nome aparecem na tela projetada.
- **Celular:** "Você está na sala". Ainda sem equipe e sem persona.
- **Faça:** espere o número de conectados chegar perto do tamanho da turma.
  Espaço abre a enquete de entrada.
- **Diga:** "Apontem a câmera do celular para o QR. Se não abrir, digitem o
  endereço que está ao lado dele; se pedir, o código é este aqui, em letras
  grandes. Não tem nome nem cadastro: o celular
  recebe só um crachá. Abram no navegador do celular; se abriu dentro do
  Instagram, toquem em ⋯ e em 'Abrir no navegador'. Se o Wi-Fi não pegar, usem o
  4G. Deixem a página aberta."

### 5.2 Enquete de entrada ("antes"), opcional

- **Telão:** as afirmações, "14 de 18 votaram" e o cronômetro. **Sem gráfico**: o
  resultado fica escondido até o comparativo (D-011). O telão e a barra chamam
  este passo de "Termômetro de entrada · antes". O 18 são os ativos, e não
  todos os membros: quem sumiu não trava o "todos votaram".
- **Celular:** uma afirmação por vez, com 5 botões, e avança sozinho.
- **Faça:** Enter quando quase todos tiverem votado. Se o tempo acabar com gente
  votando, **+30 s**. Depois de encerrar, o telão mostra só quantos responderam.
  Espaço segue.
- **Para pular** (D-008): ainda no lobby, **Pular para…** → o primeiro bloco. No
  fim, o comparativo mostra só o "depois", com o aviso "sem medição de entrada".
- **Diga:** "São três frases, de 1 (discordo totalmente) a 5 (concordo
  totalmente). Respondam o que pensam hoje: não há resposta certa. Ninguém, nem
  eu, vê o voto de ninguém, só os totais. O resultado fica guardado e só aparece
  no fim."

### 5.3 Bloco (trecho da apresentação)

- **Telão:** tela de espera discreta, com o título do trecho, a **linha do tempo
  do seminário** (D-042) e, depois que as equipes travam, o placar resumido. Se a
  entrada estiver aberta, aparece também a faixa com o QR pequeno.
  - A linha do tempo tem o **seminário inteiro**, na ordem do roteiro: todo
    passo depois da entrada na sala (a enquete de entrada, os trechos, a
    formação das equipes, as personas, os meses) até o último. O atual fica
    marcado, os meses aparecem como "mês 1", "mês 2", "mês 3", e embaixo vem uma
    linha como, no roteiro de 60 min, "Você está aqui (6 de 13) · a seguir: Mês
    1: quanto trabalhar?". O "a seguir" é sempre o item seguinte da própria
    linha, marcado nela com um contorno tracejado.
  - Quando o seminário não cabe inteiro no mapa (mais de 16 passos, o que vale
    para os dois roteiros de hoje), os passos depois do mês 3 viram um item só,
    com o nome do que ele junta: "Debrief, termômetro, medição, fechamento" no
    roteiro de 60 min ("Debrief, caminhos, termômetro, medição, fechamento" no
    de 120). Nada some da linha. Num bloco que fica dentro desse item (o "Fim:
    quem é o patrão?", por exemplo), a linha diz "é o último trecho".
  - No bloco **"Mapa do seminário"**, a linha do tempo é o próprio conteúdo:
    todos os trechos por extenso (em duas colunas quando passam de seis), sem o
    placar resumido. É o mapa que você apresenta.
- **Celular:** antes das equipes, "Acompanhe a apresentação". Depois, a situação
  da persona: a família, a conta do último mês ("Entrou R$ X · o básico da
  família custa R$ Y" e, em destaque, "Faltou R$ Z" ou "Sobrou R$ Z"), a dívida
  com os juros ao mês, a decisão, a carta e o que aconteceu, em primeira pessoa.
  Antes do primeiro mês, a família e o básico.
- **Faça:** Espaço entra no bloco; Alt+Tab para os slides; apresente; Alt+Tab de
  volta; Espaço vai ao próximo passo. Entre dois blocos seguidos, volte ao telão e
  aperte Espaço, para o celular, a barra e a linha do tempo acompanharem o título
  do trecho. Se quiser mostrar onde a turma está antes de ir aos slides, deixe o
  telão alguns segundos na linha do tempo.
- **Diga:** o conteúdo dos slides. No Mapa, percorra a linha do tempo: "Vamos
  intercalar a apresentação com três meses de jogo."

### 5.4 Formação das equipes

- **Telão:** os cartões das equipes (forma, número, nome e persona), quantos há
  em cada uma e "N pessoas sem equipe".
- **Celular:** **Me coloque numa equipe**, ou a escolha de uma equipe.
- **Faça:** todas as equipes começam abertas. Deixe de 3 a 6, fechando as que
  sobram com as teclas 1 a 6, a partir da última (6, 5, 4…): é a ordem em que as
  equipes somem quando a turma é menor (D-027). As teclas também estão na dica
  da barra. No conteúdo atual, as equipes
  são 1 e 2 Jonas (as duas "sempre joga"), 3 Daiane, 4 Marcos, 5 Kauã e 6 Rose:
  com 3 equipes, jogam as duas do Jonas e a da Daiane. Conte cerca de 3 pessoas por
  equipe: é o número que o "Me coloque" completa antes de passar para a próxima
  (`alvoPorEquipe`). As equipes marcadas "sempre joga" não fecham. Quando o telão
  mostrar "0 pessoas sem equipe", Espaço **trava as equipes**. Quem chegar depois
  é posto numa equipe pelo próprio telão.
- **Diga:** "Toquem em 'Me coloque numa equipe', ou escolham uma. Sentem junto
  com a sua equipe (D-018). Dá para trocar até eu travar."

### 5.5 Personas

- **Telão:** uma linha por persona em jogo (D-044): as equipes dela, o nome, o
  ofício e "N pessoas em casa" e, embaixo, a casa: "básico R$ Y · salário da
  companheira R$ Z" (ou "sem outra renda na casa") e "falta R$ W por mês". Esse
  "falta" é o de um mês comum, sem carta e sem decisão: o trabalho, a outra renda
  e o básico. No config atual, todas as casas começam faltando, de R$ 773
  (Marcos) a R$ 2.412 (Rose) por mês.
- **Celular:** a persona da equipe em detalhe: a descrição inteira, a família
  ("Em casa: …"), o básico da casa item a item com a fonte de cada valor, o total
  ("O básico da família custa R$ Y por mês") e a outra renda, quando houver.
- **Faça:** apresente cada persona e siga com Espaço. Peça a cada equipe para
  ler no celular quem mora na casa dela.
- **Diga:**
  - "Cada equipe vai viver três meses de uma dessas famílias. A equipe decide
    junto; o resto é o que a vida traz. Duas equipes têm a mesma persona: fiquem
    de olho em como cada uma termina (D-004)."
  - "O básico é o que a casa precisa para comer, morar e pagar as contas em Porto
    Alegre, e cada valor tem fonte: a cesta básica do DIEESE, o aluguel, a luz, a
    água, o gás, o transporte. Ele é cobrado no fim de todo mês, aconteça o que
    acontecer."
  - "A Rose e a Daiane sustentam a casa sozinhas. Nas outras casas, alguém ganha
    um salário mínimo, e mesmo assim falta."
  - Diga que as rendas da Rose, da Daiane e do Kauã são estimativas (D-028).

### 5.6 Rodada: decisão, sorteio e resultado

**Decisão** (D-043)
- **Telão:** a situação do mês, as **4 opções** (A a D), o cronômetro de **120 s**
  e, por equipe, "2 de 3 decidiram", sem revelar a escolha. Nenhuma opção tem
  seta de tendência: cada uma é um dilema, e nenhuma é a resposta certa.
- **Celular**, de cima para baixo: o cronômetro; o **contexto da família** naquele
  mês ("Na casa de Jonas: a parcela da moto vence dia 5…"), diferente para cada
  persona; o básico e a dívida; as 4 opções, cada uma com a contagem ao vivo da
  equipe. Só a opção escolhida mostra a narrativa do que ela significa. Se as
  opções não couberem na tela, o botão "Mais opções abaixo ↓" leva até elas.
- **Faça:** Espaço abre a decisão. Leia a situação e as opções em voz alta. A
  dica da barra mostra quanto falta do **tempo mínimo de conversa** (45 s). Quando
  ela disser "Todas as equipes decidiram. Enter encerra.", ou quando o tempo
  acabar, aperte Enter. Equipe sem celular: **Decidir por esta equipe**.
- **Diga:**
  - "Conversem na equipe. Alguém leia em voz alta o que está acontecendo na casa
    de vocês este mês: está no celular."
  - "Não tem resposta certa. Cada opção tem um preço, e ele pode aparecer só no
    mês que vem."
  - "Cada um vota no próprio celular e vê a contagem da equipe. Vale a opção mais
    votada, e dá para mudar até eu encerrar. Se ninguém votar, fica o de
    sempre."
- **O que atravessa os meses** (para você saber, não para anunciar antes):
  - quem abre o **MEI** no mês 1 paga o DAS nos três meses, e só quem pagava o
    MEI recebe o auxílio do INSS depois de um acidente, um mês depois. Mesmo
    assim, a perícia pode negar (carta "A perícia do INSS negou o auxílio");
  - a **fratura** do mês 2 continua no mês 3 (mais 25 dias parado), e a lesão pode
    voltar (carta "A lesão voltou");
  - a **conta bloqueada** no mês 2 continua bloqueada o mês 3 inteiro. Quem rodava
    em dois apps no mês 2 segura metade da renda no outro app;
  - o **empréstimo** do mês 3 cobra juros, e a dívida que sobra paga juros de
    7,43% ao mês;
  - a **associação** do mês 3 custa a mensalidade e um dia de assembleia.

**Empate**
- A equipe empatada tem uma prorrogação curta, só entre as opções empatadas:
  "Empate: conversem". Enter encerra. Se continuar empatado, decide a moeda. Há
  uma prorrogação só por rodada: um empate no segundo fechamento vai direto para
  a moeda. Vale também depois do Ctrl+Z: refazer uma rodada que já teve
  prorrogação não abre outra (D-035).

**Sorteio**
- **Telão:** uma barra de fatias por equipe, com as chances de cada carta; os
  ponteiros param juntos. As chances só aparecem aqui (D-012). As cartas graves
  aparecem hachuradas.
- **Faça:** deixe a animação terminar. O telão baixa sozinho o JSON do estado
  (D-015), sem aviso na tela: só a barra registra "estado salvo às …". Espaço
  mostra o resultado.
- **Diga:** "A decisão de vocês mudou o tamanho das fatias. A sorte escolhe a
  fatia. Decide-se antes de saber, como na vida."

**Resultado** (D-044, D-046)
- **Telão:** uma frase por equipe: a equipe, a letra da decisão, o título da
  carta, a origem da decisão quando não foi a maioria ("ninguém votou",
  "empate na moeda", "na prorrogação" ou "pelo apresentador") e as **contas do
  mês**: "entrou R$ X · básico R$ Y · faltou R$ Z" (ou
  "sobrou"), com "juros R$ J" no meio quando a equipe já vinha devendo, e
  "dívida R$ D" no fim quando o saldo ficou negativo. Com alguma dívida na tela,
  o cabeçalho diz uma vez só "a dívida paga juros de 7,43% ao mês". Só as cartas
  de efeito mais forte ganham destaque (quantas, diz o `destacarCartas` do
  config). Carta grave nunca anima.
- **Celular:** a carta da equipe, com a narrativa em primeira pessoa, e a conta
  do mês: "Entrou R$ X · o básico da família custa R$ Y" e, em destaque, "Faltou
  R$ Z". Com outra renda na casa, uma linha separa o que veio do trabalho e o que
  veio da outra renda. Embaixo, "Dívida R$ D · juros de 7,43% ao mês".
- **Como ler a conta:** "entrou" é o que o trabalho deu no mês (já com a carta,
  a decisão e os custos do trabalho), mais a outra renda da casa. O básico é
  cobrado **no fim do mês, depois de tudo**: a carta corta o que se ganha, e
  nunca a conta da casa. O que falta vira dívida no cheque especial, e o mês
  seguinte começa pagando juros sobre ela.
  - O telão mostra o título da carta, e não o custo dela em dias e em reais: o
    detalhe está na narrativa, no celular da equipe. Mostrar o custo no telão é
    uma pergunta em aberto (rascunho, seção 7, pergunta 7).
  - Com acidente, o "entrou" pode ficar negativo: o conserto e o remédio saem do
    que o trabalho deu (rascunho, seção 7, pergunta 2).
- **Faça:** comente as cartas destacadas e as equipes com a maior falta, e siga
  com Espaço para o próximo bloco.
- **Diga**, ao mostrar quanto faltou para o básico:
  - "Faltou R$ 1.170 quer dizer: esta família chegou ao fim do mês sem pagar
    tudo o que precisa para viver. Não é luxo: é comida, aluguel, luz e ônibus."
  - "Essa falta não some. Vira dívida no cheque especial, a 7,43% ao mês, e o
    mês que vem já começa pagando juros."
  - Depois de uma carta de parada: "Cada dia parado é um dia sem renda. O app não
    paga nenhum. O INSS, só para quem já pagava o MEI, e só depois."
  - Sem tom de consolo nem de piada, e sem apontar "quem jogou mal": o objetivo é
    a turma sentir a dúvida de quem decide sem saber o que vem (D-044).
  - Leia a consequência de cada carta grave com o tom de quem conta um fato, sem
    comemoração. Na primeira carta grave, avise: "As cartas graves foram
    exageradas para caber em três meses de jogo" (D-030).

Encerrou cedo demais? **Ctrl+Z** volta à decisão (confirmar: Tab e Enter). Os
votos e o sorteio continuam guardados: com as mesmas decisões, encerrar de novo
tira as mesmas cartas.

### 5.7 Placar final (D-041, D-045)

O placar é uma sequência de páginas. **Espaço passa de uma para a outra**, e na
última segue o roteiro. A dica da barra diz em que página você está ("Espaço:
próxima página (2 de 8)"). Não há critério a trocar nem vencedor: as teclas C e V
saíram. Com 6 equipes são 8 páginas, e o tempo-alvo do passo é de 4 min: conte
uns 30 s por página.

**Página 1: "Quanto sobrou, e quanto faltou para o básico"**
- **Telão:** uma barra por equipe que jogou, do maior saldo para o menor, com
  "faltou R$ X" ou "sobrou R$ X" ao lado. O título é calculado, por exemplo "5 de
  6 equipes não fecharam as contas" ("As 6 equipes fecharam as contas" se
  nenhuma faltou). A linha da referência do config (hoje, "Jonas com carteira
  assinada", −R$ 2.957: na mesma casa, com o mesmo básico) atravessa só as barras
  das equipes do Jonas, e o valor fica escrito embaixo do gráfico.
- **Diga:**
  - "A ordem não é de quem ganhou. É a fila de quanto faltou para o básico da
    família nos três meses."
  - "Comparem as duas equipes do Jonas: a mesma casa, decisões e sorte
    diferentes."
  - Na linha de carteira assinada: "Com carteira, na mesma casa, também faltaria,
    mas bem menos." O FGTS fica para o slide (D-030). O valor da linha ainda é uma
    pergunta em aberto (rascunho, seção 6, pergunta 13).
  - No config atual, é provável que nenhuma equipe feche as contas: nas contas do
    rascunho, nenhum caminho termina com saldo positivo (seção 7, pergunta 5, em
    aberto). Se acontecer: "Nenhuma família fechou. Não foi falta de esforço: o
    básico custa mais do que o trabalho paga."

**Página 2: "Escolha ou sorte?"**
- **Telão:** uma linha por equipe, na mesma ordem, contada como história, sem
  legenda: "se não mudassem nada: R$ a → as escolhas: +R$ b → a sorte: −R$ c =
  terminaram com R$ d". Os dois totais (o primeiro e o último) vão sem sinal de
  variação; as duas variações vão sempre com + ou −, até quando são zero
  ("+R$ 0"). O total do fim entra com "=" e em negrito. Os termos "piloto
  automático", "efeito das decisões" e "sorte" como legenda saíram da tela,
  porque confundiam no ensaio.
- **Como ler:** "se não mudassem nada" é quanto a equipe terminaria, em média,
  se ninguém tivesse votado; "as escolhas" é quanto as decisões mudaram essa
  média; "a sorte" é o que as cartas fizeram além do esperado. As três somam o
  total, ao real.
- **Diga:**
  - "A primeira conta é quanto vocês terminariam, em média, sem decidir nada. A
    segunda, quanto as escolhas mudaram isso. A terceira, o que a sorte fez."
  - "Nestas contas, a sorte pesou mais que as decisões. É de propósito: a escolha
    individual não tira ninguém da precariedade" (D-009, D-024).
  - Se uma equipe se organizou no mês 3 e perdeu saldo: "O placar só mede três
    meses da própria equipe. A conquista coletiva não cabe nele" (D-029).
  - Se alguém notar que trabalhar até a exaustão "deu mais dinheiro": "O placar
    só conta o dinheiro. O corpo, o sono e a família não entram nele." (A
    energia e a proteção fora do placar são uma pergunta em aberto: rascunho,
    seção 7, pergunta 6.)

**Páginas 3 em diante: a história de cada equipe**
- **Telão:** uma página por equipe que jogou, na ordem das equipes. Cada mês
  tem o título, uma linha curta em primeira pessoa (a primeira frase da
  narrativa da opção escolhida e a primeira da carta, por exemplo "Fiquei online
  da manhã até a madrugada, sete dias. Levaram o celular e o dinheiro do dia.")
  e as contas do mês; no fim, "No fim dos 3 meses: faltou R$ X". A linha curta
  ocupa no máximo duas linhas e, se não couber, termina em reticências, sem
  baixar dos 28 px.
- **Celular:** a mesma história, com as narrativas inteiras da opção e da carta,
  e "Escolha ou sorte?" da própria equipe, no mesmo formato do telão (os totais
  sem sinal, as variações com + ou −, "= Terminaram com" em destaque).
- **Faça:** em cada página, leia a linha curta de cada mês, ou peça a alguém da
  equipe para ler no celular a narrativa inteira.
- **Diga:** "Três meses da vida do Jonas. O que vocês decidiriam diferente, e o
  que não dependia de vocês?"

### 5.8 Termômetro

- **Afirmações (D-032):** no roteiro de 60 min, duas: t1 ("O aplicativo é o
  patrão.") e t3 ("Quem não prospera por conta própria é porque não se esforçou
  o suficiente."). No de 120 min, três: t1, t2 ("Carteira assinada é coisa do
  passado.") e t3.
- **Telão:** uma afirmação por vez, com o gráfico **ao vivo**.
- **Celular:** vota na afirmação da vez.
- **Faça:** Espaço abre a primeira afirmação e, com a votação aberta, passa para a
  próxima (cada uma com o seu cronômetro). Na última, Enter encerra e mostra o
  resumo de todas: mediana, e quanto discorda, fica neutro e concorda. Espaço
  segue.
- **Diga:** "Agora é ao vivo: uma frase por vez. O gráfico mostra a turma, nunca
  quem votou em quê."

### 5.9 Enquete de entrada ("depois")

- Igual à do começo, com as mesmas frases. Enter encerra, e o resultado continua
  escondido até o comparativo.
- **Diga:** "As mesmas três frases do começo. Respondam o que pensam agora."

### 5.10 Comparativo

- **Telão:** uma afirmação por tela. Com pares suficientes, só quem respondeu as
  duas vezes, com a frase "Dos 16 que responderam as duas vezes: 7 foram para mais
  concordância, 6 ficaram, 3 foram para menos." Com poucos pares, as duas
  distribuições lado a lado, como turmas diferentes. Sem o "antes", só o "depois".
- **Celular:** "Você antes: 4, agora: 2", visível só para o aluno.
- **Faça:** Espaço passa de uma afirmação para a outra e, na última, segue.
- **Diga:** leia a frase. "É um retrato desta turma, hoje, e não uma pesquisa." Não
  diga que a aula causou a mudança, nem tire conclusão de diferença de um ou dois
  votos.

### 5.11 Bloco final e Fim

- **"Fim: quem é o patrão?"** é conversa (D-014): o app não faz nada nesse
  momento, e texto livre nunca aparece no telão.
- **Fim:** o telão mostra o título e o placar resumido; o celular de cada equipe
  mostra a história dela, mês a mês. Os dois botões ficam **na barra** (D-047):
  aperte H (ou encoste o mouse na borda de baixo), clique em **Exportar totais**
  (um JSON só com totais) e depois segure **Apagar a sala (segure 2 s)** (D-015),
  que só funciona neste passo. O celular mostra "Esta sala foi encerrada".

## 6. Minuto a minuto: 60 min

Os tempos são os tempos-alvo do `config.json` do redesenho (versão
`2026-09-29-v2-rascunho`): cada rodada ganhou 1 minuto (a decisão passou a 120 s),
o placar final também, e as personas, 30 s; o tempo saiu do Gancho, do Mapa, da
Gestão por algoritmo, do Contraponto e do Termômetro. Os cortes
ainda são uma pergunta em aberto (rascunho, seção 6, pergunta 15). A barra mostra
o atraso ao vivo. Se atrasar, decida no dia o que encurtar: um bloco de slides
pode ser mais curto sem mexer no jogo, e a enquete "antes" é o único passo
marcado como opcional.

| # | Início | Passo (alvo) | Faça e diga |
| --- | --- | --- | --- |
| 1 | 0:00 | Lobby (2:00) | QR na tela. "Apontem a câmera… sem nome, sem cadastro." (5.1) |
| 2 | 2:00 | Enquete de entrada · antes (1:30), opcional | Espaço abre, Enter encerra. "Respondam o que pensam hoje; ninguém vê o voto." (5.2) |
| 3 | 3:30 | Bloco: Gancho: o lançamento (3:00) | Espaço, Alt+Tab. O lançamento encenado da trilha |
| 4 | 6:30 | Bloco: Mapa do seminário (3:00) | Espaço. A linha do tempo no telão é o mapa; depois, Alt+Tab para os slides, se houver (5.3) |
| 5 | 9:30 | Formação das equipes (2:00) | Teclas 1 a 6; Espaço trava. "Me coloque numa equipe; sentem juntos." (5.4) |
| 6 | 11:30 | Personas (2:30) | "Três meses de uma dessas famílias; o básico é cobrado todo mês." (5.5) |
| 7 | 14:00 | Bloco: Debrief e teoria: a conta do entregador (4:00) | Slides |
| 8 | 18:00 | Rodada 1 · Mês 1: quanto trabalhar? (5:00) | Leia as 4 opções; 120 s; Enter depois do tempo mínimo; sorteio; resultado. "A decisão muda as fatias, a sorte escolhe." Mostre quanto faltou (5.6) |
| 9 | 23:00 | Bloco: Debrief e teoria: gestão por algoritmo (4:00) | Slides |
| 10 | 27:00 | Rodada 2 · Mês 2: o app muda a regra (5:00) | Como a rodada 1. Na primeira carta grave da aula: "exageradas para caber em três meses." (5.6) |
| 11 | 32:00 | Bloco: Contraponto: a Viração e os dados sobre CLT (4:00) | Slides |
| 12 | 36:00 | Bloco: Caminhos: regulação, proteção, organização e educação (4:00) | Slides |
| 13 | 40:00 | Rodada 3 · Mês 3: e agora? (5:00) | Como a rodada 1 (5.6) |
| 14 | 45:00 | Placar final (4:00) | Espaço pagina: quanto faltou, escolha ou sorte, a história de cada equipe (5.7) |
| 15 | 49:00 | Termômetro (5:00), 2 afirmações: t1 e t3 | Espaço passa a afirmação; na última, Enter. "Ao vivo, uma frase por vez." (5.8) |
| 16 | 54:00 | Enquete de entrada · depois (1:30) | Enter encerra. "As mesmas frases do começo." (5.9) |
| 17 | 55:30 | Comparativo (2:30) | Espaço pagina. "Retrato desta turma, não pesquisa." (5.10) |
| 18 | 58:00 | Bloco: Fim: quem é o patrão? (2:00) | Conversa; o app não faz nada (5.11) |
| 19 | 60:00 | Fim | Na barra: Exportar totais; segurar Apagar a sala (5.11) |

## 7. Minuto a minuto: 120 min

Os mesmos passos do roteiro de 60 min, com mais tempo nos blocos e quatro blocos
a mais. Tempos-alvo do `config.json` do redesenho; aqui o tempo a mais das
rodadas, do placar e das personas saiu das entrevistas, do mapa do patrão e do
convidado.

| # | Início | Passo (alvo) | Faça e diga |
| --- | --- | --- | --- |
| 1 | 0:00 | Lobby (2:30) | QR na tela (5.1) |
| 2 | 2:30 | Enquete de entrada · antes (1:30), opcional | Espaço abre, Enter encerra (5.2) |
| 3 | 4:00 | Bloco: Gancho: o lançamento (4:30) | O lançamento encenado da trilha |
| 4 | 8:30 | Bloco: Mapa do seminário (4:30) | A linha do tempo no telão é o mapa (5.3) |
| 5 | 13:00 | Formação das equipes (2:00) | Teclas 1 a 6; Espaço trava (5.4) |
| 6 | 15:00 | Personas (2:30) | (5.5) |
| 7 | 17:30 | Bloco: Debrief e teoria: a conta do entregador (5:00) | Slides |
| 8 | 22:30 | Rodada 1 · Mês 1: quanto trabalhar? (5:00) | (5.6) |
| 9 | 27:30 | Bloco: Debrief e teoria: gestão por algoritmo (6:00) | Slides |
| 10 | 33:30 | Rodada 2 · Mês 2: o app muda a regra (5:00) | (5.6) |
| 11 | 38:30 | Bloco: Debrief e teoria: quiz anúncio ou conteúdo (8:00) | Slides |
| 12 | 46:30 | Bloco: Contraponto: a Viração e os dados sobre CLT (5:00) | Slides |
| 13 | 51:30 | Bloco: Contraponto: entrevistas em Porto Alegre (9:00) | Slides |
| 14 | 60:30 | Bloco: Caminhos: regulação, proteção, organização e educação (4:00) | Slides |
| 15 | 64:30 | Rodada 3 · Mês 3: e agora? (5:00) | (5.6) |
| 16 | 69:30 | Placar final (4:00) | Espaço pagina (5.7) |
| 17 | 73:30 | Bloco: Debrief e teoria: mapa do patrão em grupos (14:00) | Atividade em grupos. O telão fica na espera |
| 18 | 87:30 | Bloco: Caminhos: convidado com perguntas (17:30) | Convidado. O telão fica na espera |
| 19 | 105:00 | Termômetro (9:00), 3 afirmações | (5.8) |
| 20 | 114:00 | Enquete de entrada · depois (1:30) | (5.9) |
| 21 | 115:30 | Comparativo (2:30) | (5.10) |
| 22 | 118:00 | Bloco: Fim: quem é o patrão? (2:00) | Conversa (5.11) |
| 23 | 120:00 | Fim | Na barra: Exportar totais; segurar Apagar a sala (5.11) |

## 8. Se a rede cair

**Queda curta.** O selo da barra passa a **Reconectando…**, e os celulares também
avisam. Espere: a conexão volta sozinha, e o voto feito durante a queda fica
guardado no celular e é reenviado. Não feche o telão.
- Enquanto o selo mostra **Reconectando…**, os comandos do telão (Espaço, Enter,
  +30 s…) são **recusados na hora**, com o aviso `Sem conexão com o serviço: o
  comando não foi enviado`. O aviso aparece logo acima da barra, que se abre
  sozinha (D-047): a turma não vê o aviso solto no meio da tela. Nada fica numa
  fila para sair depois: quando o selo voltar a **Conectado**, confira a tela e
  aperte de novo.
- Se aparecer `O serviço não respondeu em 10 s`, o comando saiu, mas a
  confirmação não chegou: ele pode ser aplicado quando a rede voltar. Confira a
  tela antes de repetir.
- **Continuar sem celulares** e **Salvar estado** funcionam mesmo sem rede: saem
  da cópia local da sala.

**Só os celulares não entram** (o Wi-Fi da universidade bloqueia):
1. Peça para usarem o 4G.
2. Ligue **Rede restrita** na barra: o QR muda para um que usa uma conexão mais
   lenta e mais compatível. Quem não conseguiu entrar lê o QR novo.

**A rede não volta e a aula precisa seguir:**
1. Segure **Continuar sem celulares** por 2 s. O telão segue do mesmo passo, a
   partir da cópia local da sala. **Não tem volta**: os celulares deixam de ser
   usados nesta aula.
2. Enquetes: mão levantada ou os cartões coloridos da trilha. As teclas 1 a 5
   somam na coluna da escala, e Shift + tecla desconta.
   - Com as afirmações juntas (a enquete de entrada), o telão mostra uma por
     vez: conte a mão levantada, e o **Espaço** passa para a próxima (↑ volta).
     Na última, o **Enter** encerra a enquete inteira.
   - Uma afirmação sem contagem entra no resultado como "sem votos". Por isso,
     se alguma ficou zerada, o Enter pede confirmação, com o foco em
     **Cancelar**: Enter cancela, e Tab e Enter confirmam.
   - Se a rede caiu no meio da enquete, a tela diz quantas pessoas já tinham
     votado pelo celular. O Enter apura esses votos. A contagem à mão os
     substitui: a primeira tecla de contagem pede confirmação. A dica da barra
     repete isso e as teclas da contagem.
3. Decisões: cada equipe anuncia a sua, e você clica na letra de cada equipe (A a
   D). Sem celular, o contexto da família não chega às equipes: leia em voz alta
   o de cada persona, se der tempo, ou siga só com a situação do mês.
4. Clique em **Salvar estado** de vez em quando. Ele também é salvo sozinho a
   cada sorteio.
5. Se o "depois" for por mão levantada e o "antes" foi pelo celular, o
   comparativo mostra as duas distribuições lado a lado, sem misturar os métodos.

**O notebook reiniciou, e sem internet:**
1. No pendrive, dê duplo clique em `telao/index.html` e clique em **Carregar
   config.json**.
2. Clique em **Carregar estado (JSON)** e escolha o `viracao-estado-….json` mais
   recente da pasta Downloads.
3. O telão segue sem celulares, do ponto salvo.

**Sem internet desde o começo:** pendrive → **Carregar config.json** →
**Começar sem celulares**.

## 9. Se o telão travar

O estado da sala fica no banco, e os celulares guardam os votos. Nada se perde.

1. **Recarregue a página** (F5). No bloco 3, o código da última sala já vem
   preenchido: clique em **Retomar sala**. No mesmo navegador, não pede PIN.
2. **O navegador ou o notebook morreu:** em outro navegador ou outro notebook,
   abra o telão, digite o PIN, digite o código da sala (o do papel) e clique em
   **Retomar sala**.
3. Se aparecer `A sala … já está aberta em outra aba deste navegador`, feche a aba
   repetida e use a outra.
4. Se o telão ficou parado em "Apurando…", aperte **Enter** para concluir. Se não
   concluir, **Ctrl+Z** volta à votação sem apagar nada.
5. Se o telão antigo voltar a funcionar, ele fica **passivo**: o selo diz
   **Outra máquina assumiu**, aparece o aviso `Outra máquina assumiu esta sala
   com o PIN: este telão só acompanha`, e a barra fica desabilitada (menos a
   tela cheia). Ele não manda mais nenhum comando, nem **Continuar sem
   celulares**, nem **Salvar estado**. Feche-o. Para voltar a comandar por ele,
   recarregue e retome com o PIN; aí quem fica passiva é a outra máquina.

## 10. Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| O celular abriu dentro do Instagram ou do Facebook, e o "Entrar" está bloqueado | Tocar em ⋯ → "Abrir no navegador", ou copiar o endereço que aparece |
| O celular diz "Entrada fechada" | Clique em **Entrada fechada** na barra para reabrir. O aluno entra sozinho |
| O celular diz "Muitas entradas nesta rede" | Cota de contas anônimas daquele IP. O aluno usa o 4G (README, passo 9) |
| O celular diz "Não foi possível baixar o app do servidor" | A rede bloqueou a CDN do Firebase. O celular recarrega a página sozinho, no máximo a cada 15 s, e volta à sala sem o aluno tocar em nada. Se não voltar, o aluno usa o 4G |
| O bloco 3 do telão diz `Sem acesso ao serviço (…)` | Clique em **Tentar de novo**: ele recarrega a página, e o PIN tem de ser digitado de novo. Se não voltar, siga sem celulares (seção 8) |
| "18 ativos / 21 membros": há membros que sumiram | Não atrapalha: o "n de m votaram" e o "n de m decidiram" contam só os ativos. Para limpar a conta, segure **Remover inativos**: só sai quem está sem sinal há mais de 2 min. Quem voltar depois entra de novo sozinho (com a entrada aberta), como quem chegou atrasado: não vota na decisão já aberta e pode cair noutra equipe (**Mover aluno** corrige) |
| `Sem conexão com o serviço: o comando não foi enviado` | Espere o selo voltar a **Conectado** e aperte de novo (seção 8) |
| O celular diz "Há uma versão nova do app: atualize a página" | O aluno recarrega a página. O voto guardado não se perde |
| O celular mostra "Aguardando o telão…" | O telão está escondido ou sem rede. Volte ao telão (Alt+Tab); a faixa some sozinha |
| O celular diz "Você entrou depois de esta decisão abrir" | É a regra: ele vota na próxima decisão |
| Aluno na equipe errada | **Mover aluno** → as 3 letras depois do "·" no crachá do celular → a equipe |
| Equipe sem celular, ou que anunciou em voz alta | **Decidir por esta equipe**. "Tirar a decisão do apresentador" desfaz |
| O tempo acabou e a equipe ainda conversa | **+30 s** reabre o prazo. Até lá, o voto que chega é recusado |
| Espaço não avança, e aparece `Votação aberta: quem fecha é o apresentador (Enter)` | Enter primeiro, depois Espaço. O aviso aparece junto da barra, que se abre sozinha |
| `Encerre a votação (Enter) antes de pular.` | Enter, depois **Pular para…** |
| Um aviso sumiu antes de você ler, ou apertou uma tecla e nada parece ter acontecido | Aperte H: o aviso fica 15 s junto da barra (seção 4) |
| Não acho **Exportar totais** nem **Apagar a sala** | Estão na barra (H), e não na tela do Fim. **Apagar a sala** só funciona no passo Fim |
| O placar final "não avança" | Ele tem várias páginas: cada Espaço passa uma, e só a última segue o roteiro. A dica da barra diz em que página você está |

## 11. Cuidados com o tema

O objetivo é o impacto: mostrar como essa realidade é dura e abrir a reflexão
(D-009). Algumas pessoas da turma podem trabalhar, ou ter alguém da família
trabalhando, em plataformas.

- **Convide, nunca obrigue.** Quem trabalha em plataforma fala se quiser. Não
  peça a ninguém para contar a própria situação, e não aponte ninguém.
- **Carta grave** (no config atual: a fratura, a conta bloqueada, o assalto, a
  perícia do INSS que negou o auxílio e a lesão que voltou): o telão a mostra sem
  animação, sem som e sem cor de vitória. Leia a consequência com o tom de quem
  conta um fato, sem piada. Avise uma vez que as cartas graves foram exageradas
  para caber em três rodadas (D-030).
- **Sem suavizar, e sem expor ninguém** (D-044). O jogo mostra o custo real, em
  dinheiro e em dias parados, com fonte, para a turma sentir a dúvida de quem
  vive isso. Não amenize o número ("é só um jogo"), mas também não o dirija a
  ninguém da sala.
- **Ninguém ganha a vida no jogo.** O placar não aponta vencedor: a página 1 é a
  fila de quanto faltou para o básico, e não um ranking. Se o clima virar
  competição, lembre isso.
- **As personas não são pessoas reais.** Foram montadas a partir de pesquisas (a
  base é o artigo de Ludmila Abílio) e de dados públicos, com a fonte de cada
  valor ao lado (D-005). Diga que as rendas da Rose, da Daiane e do Kauã são
  estimativas; a do Kauã vem de um dado de São Paulo de 2019, corrigido pela
  inflação, e a ressalva está no slide (D-028).
- **Raça e gênero** ficam fora das personas; o dado vai para o slide (D-033).
- **O voto é secreto.** Ninguém, nem o apresentador, vê o voto de ninguém; a
  enquete nunca é mostrada por equipe; o celular só mostra ao próprio aluno o que
  ele respondeu antes e depois.
- **O comparativo é um retrato desta turma.** Nada de "a aula mudou a opinião de
  vocês": sem causalidade, sem conclusão de diferença de um ou dois votos.
- **"Quem é o patrão", no fechamento, é conversa** (D-014). Texto livre nunca
  aparece no telão.

## 12. Depois da aula

- A sala foi apagada no Fim, e com ela os votos individuais (D-015). Se não foi,
  abra o telão, retome a sala, vá ao Fim e segure **Apagar a sala**, na barra.
- O `viracao-totais-….json` baixado no Fim tem só os totais: o número de
  participantes, os histogramas das enquetes, a decisão e a carta de cada equipe
  e o placar. Nenhum voto individual.
- Os `viracao-estado-….json` da pasta Downloads foram o seguro da aula. Não têm
  voto individual e podem ser apagados.

## 13. Teste no eduroam (30/09)

O objetivo é descobrir, antes do seminário, como a rede da universidade se
comporta. O que o teste revelar é corrigido entre 01/10 e 05/10 (D-036).

**Leve:** o notebook com o carregador, o site já publicado, o PIN e 3 celulares.
Se der, um iPhone e um Android, porque o iPhone é o que mais derruba a conexão ao
bloquear a tela. Um dos celulares no 4G, para comparar.

**Nunca rode o simulador lá** (AGENTS.md, regra 6).

### O que observar

1. **O notebook e os celulares entram na eduroam?** Anote se aparece alguma página
   de login da rede.
2. **O telão conecta?** Abra o telão publicado e cronometre até `Serviço conectado
   · regras v3 conferidas.` Se ele disser que a primeira conexão passou de 8 s,
   anote.
3. **WebSocket ou long-polling?** No telão, abra as ferramentas do desenvolvedor
   (F12) → aba **Rede** (Network) → filtro **WS**. Uma linha para
   `…firebaseio.com/.ws?…` com status 101 quer dizer que o WebSocket funciona.
   Se não houver linha em WS e, com `.lp` digitado no campo de filtro, aparecerem
   muitas chamadas para `…/.lp?…`, a rede bloqueou o WebSocket e a conexão caiu
   para o long-polling, que funciona, mas é mais lento. Faça este teste com o
   telão aberto sem `?lp=1`.
4. **Tempo de entrada:** crie uma sala e cronometre, em cada celular, da leitura
   do QR até "Você está na sala". Compare eduroam e 4G.
5. **Rede restrita:** ligue **Rede restrita** na barra; um celular que ainda não
   entrou lê o QR novo. Cronometre de novo. Para esse celular voltar ao normal
   depois, abra nele o endereço do aluno com `?lp=0` no fim.
6. **Voto:** na enquete, quanto tempo cada celular leva para mostrar "Registrado"?
7. **Reconexão ao bloquear a tela:** com uma decisão aberta, bloqueie a tela de um
   celular por 1 minuto e desbloqueie. Ele volta à tela certa? Em quanto tempo?
   Vote logo depois de desbloquear. Repita votando e bloqueando em seguida: ao
   voltar, o voto tem de aparecer como registrado.
8. **Recarregar o celular:** o crachá e a equipe continuam os mesmos?
9. **Alt+Tab:** telão em tela cheia (F11) e os slides em outra janela. Alterne
   algumas vezes. Deixe o telão escondido por mais de 5 minutos (é quando o
   navegador começa a atrasar a aba) e volte: em poucos segundos ele tem de
   mostrar a contagem atual.
10. **Legibilidade no projetor:** do fundo da sala, dá para ler o texto, o
    cronômetro e o placar? O QR funciona do meio e do fundo? As equipes se
    distinguem pela forma, e não só pela cor? Anote a resolução do projetor, que
    pode ser 4:3 (1024×768) ou 16:9.
11. **Download automático:** no sorteio, o JSON foi baixado sem pergunta? Com o
    telão em tela cheia (F11), nada pode aparecer por cima da tela projetada:
    olhe o painel de downloads do Edge e o pedido do Chrome para "baixar vários
    arquivos", que costuma vir a partir do segundo arquivo (rodada 2). Se
    apareceu, refaça os ajustes de download da seção 2.
12. **Retomar:** recarregue o telão (F5) → **Retomar sala**. Volta sem pedir PIN?
13. **Continuar sem celulares:** no fim, com a sala de teste, segure o botão e veja
    o telão seguir sozinho. Depois, apague a sala (pela barra, no passo Fim).
14. **O redesenho no celular (D-043, "vamos testar"):** na decisão, cada celular
    mostra o contexto da família e as 4 letras sem rolar? O "Mais opções abaixo ↓"
    aparece quando falta espaço? 120 s bastam para a equipe ler e conversar?
    Anote o modelo e o tamanho de tela de quem precisou rolar.
15. **O redesenho no projetor (D-041, D-042, D-047, "vamos testar"):** do fundo
    da sala, dá para ler a linha do tempo, a frase do resultado ("entrou · básico
    · faltou") e as páginas do placar? O placar em páginas ficou claro, ou alguma
    página confundiu? Com a barra escondida, **nada** de operação aparece na tela
    projetada (dica de tecla, aviso, exportar, apagar, "ativos / membros")?

### Resultado

| Item | Eduroam | 4G | Observação |
| --- | --- | --- | --- |
| 1. Entrada na rede | | | |
| 2. Tempo até "regras v3 conferidas" | | | |
| 3. WebSocket ou long-polling | | | |
| 4. Tempo de entrada (celular 1 / 2 / 3) | | | |
| 5. Tempo com Rede restrita | | | |
| 6. Tempo até "Registrado" | | | |
| 7. Reconexão ao bloquear a tela | | | |
| 8. Recarregar o celular | | | |
| 9. Alt+Tab e volta depois de 5 min | | | |
| 10. Legibilidade e resolução do projetor | | | |
| 11. Download automático | | | |
| 12. Retomar sem PIN | | | |
| 13. Continuar sem celulares | | | |
| 14. Decisão no celular (contexto, 4 opções, 120 s) | | | |
| 15. Linha do tempo, resultado, placar em páginas e barra oculta | | | |

### O que fazer com o resultado

- **WebSocket bloqueado, long-polling funcionando:** no dia, abra o telão com
  `/telao/?lp=1`. O QR já sai com a **Rede restrita** ligada (seção 3, item 7).
- **Nada funciona na eduroam:** os celulares vão pelo 4G, e o notebook, pelo
  roteador do celular (hotspot). Se nem isso der, a aula segue sem celulares
  (seção 8).
- **Texto pequeno ou QR que não lê do fundo:** anote a distância e a resolução, e
  leve para a correção entre 01/10 e 05/10.
- **Algo do redesenho confundiu (itens 14 e 15):** anote o quê e em que tela. As
  decisões marcadas "vamos testar" (D-041, D-042, D-043) são revistas com o
  Kleberson antes da correção.
- **Depois de cada correção (01 a 05/10):** se o `firebase/regras.json` mudou,
  publique as regras de novo (README, passo 6). A versão sobe junto (v4, v5…), e
  é ela que o bloco 3 passa a mostrar em `regras vN conferidas`. Em toda máquina
  com o telão aberto, recarregue a página: o telão aberto continua com o código
  antigo.
  Veja "Depois de publicado: mudar alguma coisa", no README.
