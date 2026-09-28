# Roteiro do apresentador

Tudo o que é preciso para conduzir o seminário sozinho, pelo teclado do notebook.
Como publicar o site está no [README](../README.md). Como mudar o conteúdo está em
[como-editar-config.md](como-editar-config.md).

**Datas (D-036):** o teste com celulares no eduroam é em **30/09** (quarta), e o
seminário, em **07/10** (quarta). O conteúdo e o código ficam congelados até
06/10.

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
- Os slides, prontos para abrir numa janela própria.
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
| Espaço, → ou PageDown | Avança. Duas vezes seguidas em menos de 1,5 s contam como uma. Na enquete sem celulares com as afirmações juntas, passa para a próxima afirmação | Quase sempre. **Nunca fecha votação** |
| Enter | Encerra a votação, a decisão ou a prorrogação | Com votação aberta. Pede confirmação antes do tempo mínimo de conversa e, sem celulares, quando alguma afirmação ficou sem contagem |
| P | Pausa ou retoma. Pausado, **ninguém consegue votar** | Com votação aberta |
| Ctrl+Z | Desfaz, com confirmação | Depois de encerrar uma rodada ou uma enquete |
| C | Troca o critério do placar | Placar final |
| V | Liga ou desliga o "Sem vencedor" | Placar final |
| F | Tela cheia da página (alternativa ao F11) | Qualquer hora |
| H | Mostra ou esconde a barra. Mostrada pela tecla, ela também some sozinha depois de 3 s | Qualquer hora |
| 1 a 6 | Abre ou fecha a equipe daquele número | Formação das equipes |
| 1 a 5 | Soma 1 na coluna da escala; Shift + tecla desconta | Enquete sem celulares (mão levantada) |
| ↑ e ↓ | Voltam ou avançam a afirmação que está sendo contada | Enquete sem celulares, com as afirmações juntas |
| ← e PageUp | Nada, de propósito | — |
| F11 | Tela cheia da janela do navegador | Montagem |
| Alt+Tab | Alterna entre o telão e os slides | Nos blocos |
| Esc | Fecha a janela de confirmação ou de escolha | Com uma dessas janelas aberta |

**A barra do apresentador** aparece embaixo quando o mouse se mexe e some depois
de 3 s. Ela não some com o mouse em cima dela nem com uma janela de escolha
aberta. À esquerda, ela mostra:
- o passo e o atraso, por exemplo "passo 8 de 19 · +3 min de atraso";
- o nome do passo;
- "estado salvo às 14:05 (r1)", depois do primeiro salvamento. O salvamento
  automático do fim de rodada aparece **só aqui**, sem aviso na tela projetada;
- com celulares, "18 ativos / 21 membros". Membro é quem já entrou na sala;
  ativo é o celular com sinal no último minuto;
- o selo de conexão: **Conectado**, **Reconectando…**, **Sem celulares** ou
  **Outra máquina assumiu** (seção 9).

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
| Sem vencedor (V) | O mesmo que a tecla |
| Tela cheia (F) | O mesmo que a tecla |
| Encerrar jogo (segure) | Vai direto para o Fim. Segure 2 s |
| Continuar sem celulares (segure) | Segue sem celulares a partir do passo atual. Segure 2 s. **Não tem volta** (só com celulares) |

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

- **Telão:** QR grande, o endereço, o código da sala, "N conectados" e, em letra
  menor, "N ativos / M membros". Conectado é o mesmo que ativo: celular com
  sinal no último minuto. Membro é quem já entrou, inclusive quem fechou a aba.
  Só números: nem crachá nem nome aparecem na tela projetada.
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

- **Telão:** tela de espera discreta, com o título do trecho e, depois que as
  equipes travam, o placar resumido. Se a entrada estiver aberta, aparece também
  a faixa com o QR pequeno.
- **Celular:** antes das equipes, "Acompanhe a apresentação". Depois, a situação
  da persona: os indicadores e o que aconteceu no último mês, em primeira pessoa.
- **Faça:** Espaço entra no bloco; Alt+Tab para os slides; apresente; Alt+Tab de
  volta; Espaço vai ao próximo passo. Entre dois blocos seguidos, volte ao telão e
  aperte Espaço, para o celular e a barra acompanharem o título do trecho.
- **Diga:** o conteúdo dos slides.

### 5.4 Formação das equipes

- **Telão:** os cartões das equipes (forma, número, nome e persona), quantos há
  em cada uma e "N pessoas sem equipe".
- **Celular:** **Me coloque numa equipe**, ou a escolha de uma equipe.
- **Faça:** todas as equipes começam abertas. Deixe de 3 a 6, fechando as que
  sobram com as teclas 1 a 6, a partir da última (6, 5, 4…): é a ordem em que as
  equipes somem quando a turma é menor (D-027). No conteúdo de 28/09, as equipes
  são 1 e 2 Jonas (as duas "sempre joga"), 3 Daiane, 4 Marcos, 5 Kauã e 6 Rose:
  com 3 equipes, jogam as duas do Jonas e a da Daiane. Conte cerca de 3 pessoas por
  equipe: é o número que o "Me coloque" completa antes de passar para a próxima
  (`alvoPorEquipe`). As equipes marcadas "sempre joga" não fecham. Quando o telão
  mostrar "0 pessoas sem equipe", Espaço **trava as equipes**. Quem chegar depois
  é posto numa equipe pelo próprio telão.
- **Diga:** "Toquem em 'Me coloque numa equipe', ou escolham uma. Sentem junto
  com a sua equipe (D-018). Dá para trocar até eu travar."

### 5.5 Personas

- **Telão:** as personas em jogo, com as equipes de cada uma e os indicadores
  iniciais.
- **Celular:** a persona da equipe em detalhe.
- **Faça:** apresente cada persona e siga com Espaço.
- **Diga:** "Cada equipe vai viver três meses de uma dessas pessoas. A equipe
  decide junto; o resto é o que a vida traz. Duas equipes têm a mesma persona:
  fiquem de olho em como cada uma termina (D-004)." Diga que as rendas da Rose, da
  Daiane e do Kauã são estimativas (D-028).

### 5.6 Rodada: decisão, sorteio e resultado

**Decisão**
- **Telão:** a situação do mês, as opções A, B e C, o cronômetro e, por equipe,
  "2 de 3 decidiram", sem revelar a escolha.
- **Celular:** a situação, as opções e a contagem ao vivo da própria equipe.
- **Faça:** Espaço abre a decisão. Leia a situação e as opções em voz alta. A
  linha de baixo mostra quanto falta do **tempo mínimo de conversa**. Quando ela
  disser "Todas as equipes decidiram. Enter encerra.", ou quando o tempo acabar,
  aperte Enter. Equipe sem celular: **Decidir por esta equipe**.
- **Diga:** "Conversem na equipe. Cada um vota no próprio celular e vê a contagem
  da equipe. Vale a opção mais votada, e dá para mudar até eu encerrar. Se
  ninguém votar, o app decide por vocês: é o piloto automático."

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

**Resultado**
- **Telão:** uma linha por equipe, com a carta, a decisão e o saldo do mês. Só as
  cartas de efeito mais forte ganham destaque (quantas, diz o `destacarCartas` do
  config). Carta grave nunca anima.
- **Celular:** a carta da equipe e o que ela fez com os indicadores.
- **Faça:** comente as cartas destacadas e siga com Espaço para o próximo bloco.
- **Diga:** leia a consequência de cada carta grave com o tom de quem conta um
  fato, sem comemoração. Na primeira carta grave, avise: "As cartas graves foram
  exageradas para caber em três meses de jogo" (D-030).

Encerrou cedo demais? **Ctrl+Z** volta à decisão (confirmar: Tab e Enter). Os
votos e o sorteio continuam guardados: com as mesmas decisões, encerrar de novo
tira as mesmas cartas.

### 5.7 Placar final

- **Telão:** "Quem ganhou depende do que se conta". Cada equipe tem uma barra em
  três partes: piloto automático, efeito das decisões e sorte. Começa ordenado
  pelo efeito das decisões.
- **Celular:** o resumo da equipe e de onde veio o saldo.
- **Faça:** **C** troca o critério (efeito das decisões, saldo acumulado, sorte,
  pior caso, energia, proteção). **V** mostra as equipes na ordem do jogo, sem
  vencedor. A linha de referência do config (hoje, "Jonas com carteira
  assinada", R$ 840) aparece nas vistas de efeito das decisões, de saldo e de
  sorte. Ela atravessa só as barras das equipes do Jonas, e o valor fica escrito
  embaixo do gráfico.
- **Diga:**
  - "Cada barra tem três partes: o que viria sem decidir nada, o efeito das
    decisões e a sorte."
  - "Comparem as duas equipes da mesma persona: a mesma vida, decisões e sorte
    diferentes."
  - "Nestas contas, a sorte pesou mais que as decisões. É de propósito: a escolha
    individual não tira ninguém da precariedade" (D-009, D-024).
  - Se uma equipe se organizou no mês 3 e perdeu saldo: "O placar só mede três
    meses da própria equipe. A conquista coletiva não cabe nele" (D-029).
  - Na linha de carteira assinada, o FGTS fica para o slide (D-030).

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
- **Fim:** clique em **Exportar totais** (um JSON só com totais) e depois segure
  **Apagar a sala (segure 2 s)** (D-015). O celular mostra "Esta sala foi
  encerrada".

## 6. Minuto a minuto: 60 min

Os tempos são os tempos-alvo do `config.json` de 28/09. A barra mostra o atraso
ao vivo. Se atrasar, decida no dia o que encurtar: um bloco de slides pode ser
mais curto sem mexer no jogo, e a enquete "antes" é o único passo marcado como
opcional.

| # | Início | Passo (alvo) | Faça e diga |
| --- | --- | --- | --- |
| 1 | 0:00 | Lobby (2:00) | QR na tela. "Apontem a câmera… sem nome, sem cadastro." (5.1) |
| 2 | 2:00 | Enquete de entrada · antes (1:30), opcional | Espaço abre, Enter encerra. "Respondam o que pensam hoje; ninguém vê o voto." (5.2) |
| 3 | 3:30 | Bloco: Gancho: o lançamento (3:30) | Espaço, Alt+Tab. O lançamento encenado da trilha |
| 4 | 7:00 | Bloco: Mapa do seminário (4:00) | Alt+Tab, Espaço, Alt+Tab. Slides |
| 5 | 11:00 | Formação das equipes (2:00) | Teclas 1 a 6; Espaço trava. "Me coloque numa equipe; sentem juntos." (5.4) |
| 6 | 13:00 | Personas (2:00) | "Três meses de uma dessas pessoas; duas equipes têm a mesma." (5.5) |
| 7 | 15:00 | Bloco: Debrief e teoria: a conta do entregador (4:00) | Slides |
| 8 | 19:00 | Rodada 1 · Mês 1: quanto trabalhar? (4:00) | Leia as opções; Enter depois do tempo mínimo; sorteio; resultado. "A decisão muda as fatias, a sorte escolhe." (5.6) |
| 9 | 23:00 | Bloco: Debrief e teoria: gestão por algoritmo (5:00) | Slides |
| 10 | 28:00 | Rodada 2 · Mês 2: o app muda a regra (4:00) | Como a rodada 1. Na primeira carta grave da aula: "exageradas para caber em três meses." (5.6) |
| 11 | 32:00 | Bloco: Contraponto: a Viração e os dados sobre CLT (5:00) | Slides |
| 12 | 37:00 | Bloco: Caminhos: regulação, proteção, organização e educação (4:00) | Slides |
| 13 | 41:00 | Rodada 3 · Mês 3: e agora? (4:00) | Como a rodada 1 (5.6) |
| 14 | 45:00 | Placar final (3:00) | C troca o critério, V sem vencedor. "Quem ganhou depende do que se conta." (5.7) |
| 15 | 48:00 | Termômetro (6:00), 2 afirmações: t1 e t3 | Espaço passa a afirmação; na última, Enter. "Ao vivo, uma frase por vez." (5.8) |
| 16 | 54:00 | Enquete de entrada · depois (1:30) | Enter encerra. "As mesmas frases do começo." (5.9) |
| 17 | 55:30 | Comparativo (2:30) | Espaço pagina. "Retrato desta turma, não pesquisa." (5.10) |
| 18 | 58:00 | Bloco: Fim: quem é o patrão? (2:00) | Conversa; o app não faz nada (5.11) |
| 19 | 60:00 | Fim | Exportar totais; segurar Apagar a sala (5.11) |

## 7. Minuto a minuto: 120 min

Os mesmos passos do roteiro de 60 min, com mais tempo nos blocos e quatro blocos
a mais. Tempos-alvo do `config.json` de 28/09.

| # | Início | Passo (alvo) | Faça e diga |
| --- | --- | --- | --- |
| 1 | 0:00 | Lobby (2:30) | QR na tela (5.1) |
| 2 | 2:30 | Enquete de entrada · antes (1:30), opcional | Espaço abre, Enter encerra (5.2) |
| 3 | 4:00 | Bloco: Gancho: o lançamento (4:30) | O lançamento encenado da trilha |
| 4 | 8:30 | Bloco: Mapa do seminário (4:30) | Slides |
| 5 | 13:00 | Formação das equipes (2:00) | Teclas 1 a 6; Espaço trava (5.4) |
| 6 | 15:00 | Personas (2:00) | (5.5) |
| 7 | 17:00 | Bloco: Debrief e teoria: a conta do entregador (5:00) | Slides |
| 8 | 22:00 | Rodada 1 · Mês 1: quanto trabalhar? (4:00) | (5.6) |
| 9 | 26:00 | Bloco: Debrief e teoria: gestão por algoritmo (6:00) | Slides |
| 10 | 32:00 | Rodada 2 · Mês 2: o app muda a regra (4:00) | (5.6) |
| 11 | 36:00 | Bloco: Debrief e teoria: quiz anúncio ou conteúdo (8:00) | Slides |
| 12 | 44:00 | Bloco: Contraponto: a Viração e os dados sobre CLT (5:00) | Slides |
| 13 | 49:00 | Bloco: Contraponto: entrevistas em Porto Alegre (10:00) | Slides |
| 14 | 59:00 | Bloco: Caminhos: regulação, proteção, organização e educação (4:00) | Slides |
| 15 | 63:00 | Rodada 3 · Mês 3: e agora? (4:00) | (5.6) |
| 16 | 67:00 | Placar final (3:00) | (5.7) |
| 17 | 70:00 | Bloco: Debrief e teoria: mapa do patrão em grupos (15:00) | Atividade em grupos. O telão fica na espera |
| 18 | 85:00 | Bloco: Caminhos: convidado com perguntas (20:00) | Convidado. O telão fica na espera |
| 19 | 105:00 | Termômetro (9:00), 3 afirmações | (5.8) |
| 20 | 114:00 | Enquete de entrada · depois (1:30) | (5.9) |
| 21 | 115:30 | Comparativo (2:30) | (5.10) |
| 22 | 118:00 | Bloco: Fim: quem é o patrão? (2:00) | Conversa (5.11) |
| 23 | 120:00 | Fim | Exportar totais; segurar Apagar a sala (5.11) |

## 8. Se a rede cair

**Queda curta.** O selo da barra passa a **Reconectando…**, e os celulares também
avisam. Espere: a conexão volta sozinha, e o voto feito durante a queda fica
guardado no celular e é reenviado. Não feche o telão.
- Enquanto o selo mostra **Reconectando…**, os comandos do telão (Espaço, Enter,
  +30 s…) são **recusados na hora**, com o aviso `Sem conexão com o serviço: o
  comando não foi enviado`. Nada fica numa fila para sair depois: quando o selo
  voltar a **Conectado**, confira a tela e aperte de novo.
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
     substitui: a primeira tecla de contagem pede confirmação.
3. Decisões: cada equipe anuncia a sua, e você clica na letra de cada equipe.
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
| Espaço não avança, e aparece `Votação aberta: quem fecha é o apresentador (Enter)` | Enter primeiro, depois Espaço |
| `Encerre a votação (Enter) antes de pular.` | Enter, depois **Pular para…** |

## 11. Cuidados com o tema

O objetivo é o impacto: mostrar como essa realidade é dura e abrir a reflexão
(D-009). Algumas pessoas da turma podem trabalhar, ou ter alguém da família
trabalhando, em plataformas.

- **Convide, nunca obrigue.** Quem trabalha em plataforma fala se quiser. Não
  peça a ninguém para contar a própria situação, e não aponte ninguém.
- **Carta grave** (no config atual: acidente, conta bloqueada e assalto): o telão a mostra sem
  animação, sem som e sem cor de vitória. Leia a consequência com o tom de quem
  conta um fato, sem piada. Avise uma vez que as cartas graves foram exageradas
  para caber em três rodadas (D-030).
- **Ninguém ganha a vida no jogo.** Use "quem ganhou depende do que se conta" e,
  se o clima virar competição, o **Sem vencedor** (V).
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
  abra o telão, retome a sala, vá ao Fim e segure **Apagar a sala**.
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
    o telão seguir sozinho. Depois, apague a sala.

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

### O que fazer com o resultado

- **WebSocket bloqueado, long-polling funcionando:** no dia, abra o telão com
  `/telao/?lp=1`. O QR já sai com a **Rede restrita** ligada (seção 3, item 7).
- **Nada funciona na eduroam:** os celulares vão pelo 4G, e o notebook, pelo
  roteador do celular (hotspot). Se nem isso der, a aula segue sem celulares
  (seção 8).
- **Texto pequeno ou QR que não lê do fundo:** anote a distância e a resolução, e
  leve para a correção entre 01/10 e 05/10.
- **Depois de cada correção (01 a 05/10):** se o `firebase/regras.json` mudou,
  publique as regras de novo (README, passo 6). A versão sobe junto (v4, v5…), e
  é ela que o bloco 3 passa a mostrar em `regras vN conferidas`. Em toda máquina
  com o telão aberto, recarregue a página: o telão aberto continua com o código
  antigo.
  Veja "Depois de publicado: mudar alguma coisa", no README.
