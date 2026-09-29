# Registro de decisões

Numerado e **nunca reescrito**. Uma decisão nova que substitui outra ganha número
novo e cita a antiga. Tudo o que está aqui foi alinhado com o Kleberson. Mudar
qualquer item exige perguntar antes.

A arquitetura detalhada está em [arquitetura.md](arquitetura.md).

---

## 25/09/2026: proposta

A proposta de arquitetura, modelo de dados e riscos foi feita em quatro etapas:
- pesquisa em três frentes, com fatos conferidos na documentação oficial e testes
  na máquina;
- três propostas independentes;
- uma síntese;
- dois revisores adversariais, que acharam 21 falhas, todas corrigidas antes da
  aprovação.

## 28/09/2026: respostas do Kleberson

**D-001. Pilha: Firebase Realtime Database (plano Spark) + login anônimo + GitHub Pages.**
- HTML, CSS e JavaScript em scripts clássicos, sem framework e sem build.
- **Supabase foi descartado:** o projeto grátis pausa depois de 7 dias; o tempo
  real só usa WebSocket; acima de 100 mensagens por segundo, todos são
  desconectados; e eventos ocorridos durante a queda se perdem.

**D-002. Projeto pessoal, sem vínculo com nenhum empregador.**
- Mora na pasta de projetos pessoais (`Pessoal-Dev/seminario-viracao`).
- Repositório **público** `AguiarKleber/seminario-viracao`. O GitHub Pages grátis
  exige repositório público; cartas e pesos ficam visíveis, e isso foi aceito.
- O Firebase fica na conta Google **pessoal** do Kleberson.

**D-003. Vale o protocolo de dois agentes (Claude Code e Codex).** Ver o
`AGENTS.md` do Pessoal-Dev.

**D-004. Personas e equipes.** 5 personas e 6 equipes, com duas equipes na
**mesma** persona: mostra ao vivo que a diferença entre elas é sorte. Fica marcado
como "vamos testar".

**D-005. Conteúdo.** O Claude rascunha personas, cartas, valores em R$ e
afirmações, com a **fonte ao lado de cada valor**, e os dois validam juntos. Nenhum
valor entra no seminário sem essa validação.

**D-006. O jogo corre em paralelo ao seminário inteiro.**
- Ele abre no início, e as 3 rodadas ficam **intercaladas** com os trechos da
  apresentação. Cada mês do jogo vem logo depois do trecho que ele ilustra.
- Entre uma rodada e outra, o celular mostra a situação da persona e "acompanhe a
  apresentação".
- Isso substitui o bloco único de 15 min da trilha.

**D-007. Telão e slides na mesma tela, alternando com Alt+Tab.**
- O telão fica numa janela própria do navegador, em tela cheia. Os slides (Canva
  ou PowerPoint, ainda não feitos) ficam em outra janela.
- **Nada no telão pode depender de cronômetro enquanto ele está escondido.**
- Os slides dentro do telão (exportados como imagens) ficam como plano B, **não**
  como padrão.

**D-008. Enquete de entrada no início da aula.**
- Não haverá questionário antes da aula, por falta de tempo.
- O "antes" é o **primeiro passo dentro da sala**: vem antes do lançamento
  encenado e antes de o aluno receber equipe ou persona.
- É um passo **opcional**, que pode ser pulado no dia. Se for pulado, o final
  mostra só a distribuição do "depois", com o aviso "sem medição de entrada".

**D-009. O placar é decomposto em três parcelas:** piloto automático, efeito das
decisões e sorte.
- O objetivo principal, porém, é o **impacto**: mostrar como essa realidade é dura
  e gerar reflexão. Conteúdo e calibragem servem a isso.

**D-010. Os apresentadores encerram cada decisão.** Nada fecha sozinho quando
todos já tocaram.

**D-011. O gráfico do "antes" fica escondido até o comparativo final.**

**D-012. As chances das cartas aparecem só no sorteio.**

**D-013. Uma carta por equipe.**

**D-014. "Quem é o patrão", no fechamento, é conversa.** O app não faz nada nesse
momento, e texto livre nunca aparece no telão.

**D-015. Dados depois da aula.**
- A exportação leva **só totais**, e a sala é apagada no fim.
- Ao fim de cada rodada, o telão baixa sozinho um JSON pequeno com o estado, como
  seguro para o caso "travou e caiu a internet".

**D-016. Visual neutro e acadêmico.** Fundo escuro, paleta Okabe-Ito, cada equipe
com forma, nome e número. Nenhuma marca de empresa.

**D-017. Quem opera o notebook é o Kleberson, e as telas dizem "apresentador".**
Onde a proposta dizia "professor", vale "apresentador". Não há passador: tudo é
feito pelo teclado do notebook.

**D-018. As equipes sentam juntas.**

**D-019. Duração de 60 a 120 min.** O config traz dois roteiros, `60min` e
`120min`. O apresentador escolhe um ao criar a sala.

**D-020. Calendário.** O teste com celulares reais no eduroam acontece **nesta
semana** (a do dia 28/09). O seminário é na **próxima semana**. As datas exatas
ainda faltam.

**D-021. JDK 21 instalado** (via winget), para rodar o emulador local do Firebase.
Com ele, as regras e o simulador são testados sem gastar a cota de contas anônimas.

**D-022. Padrões da proposta mantidos**, porque não houve pedido de mudança:
- `conexao.json` separado do `config.json`;
- sem service worker;
- um único projeto Firebase, com o simulador rodando numa sala de ensaio;
- empate decidido por prorrogação de 20 s e, se continuar, moeda;
- aluno totalmente anônimo, identificado por um crachá curto;
- sem controle remoto pelo celular do apresentador na v1;
- ESLint e Playwright (o e2e fica fora do `check`).

## 28/09/2026: validação do conteúdo (rascunho de 28/09)

O Kleberson escolheu o pacote B de calibragem e aceitou em bloco as recomendações
dos itens 1 a 17. Os números vêm de `docs/rascunho-conteudo.md`.

**D-024. Calibragem: pacote B.** As horas a mais do mês 1 ("trabalhar o máximo")
passam a render cerca de 53% do ganho-hora, e não mais 75%. Os valores são os de
antes multiplicados por 0,7:

| Persona | Antes | Agora |
|---|---|---|
| Jonas | 740 | 520 |
| Kauã | 150 | 105 |
| Daiane | 500 | 350 |
| Marcos | 930 | 650 |
| Rose | 700 | 490 |

- Com isso, "trabalhar o máximo" deixa de dominar o saldo e some a leitura "quem
  se esforça ganha" (risco R12).
- A sorte continua pesando mais que a decisão (as decisões explicam de 7% a 21%).
  Isso é **intencional** e serve ao objetivo da D-009: a escolha individual não
  tira ninguém da precariedade.
- Os avisos do validador sobre a faixa de 30% a 60% passam a ser esperados.

**D-025. Custo de vida:** no jogo, a régua mínima (aluguel, comida e contas). A
régua do DIEESE (salário mínimo necessário) vai para um slide do debrief.

**D-026. A persona com duas equipes é o Jonas (motoboy).**

**D-027. Ordem das equipes:** Jonas, Jonas, Daiane, Marcos, Kauã, Rose. É a ordem
em que o "me coloque" preenche e em que as equipes somem quando houver menos de 6.
As cores e formas seguem a posição (e1 a e6).

**D-028. Rendas de menor confiança mantidas, ditas como estimativa em sala:** Rose
e Daiane, e o Kauã (dado de São Paulo de 2019, corrigido pelo IPCA), este com
ressalva no slide.

**D-029. A organização coletiva segue perdendo em saldo no mês 3.** Vira ponto de
debate: o placar só mede 3 meses da própria equipe, e a conquista coletiva não
cabe nele. O motor não muda.

**D-030. Fica como está:**
- o corte de 15% no mês 2;
- as cartas graves dramatizadas, com aviso em sala de que foram exageradas para
  caber em 3 rodadas;
- a referência CLT pelo salário médio do CAGED, com o FGTS citado só no slide;
- o indicador `renda` com o nome "Saldo acumulado".

**D-031. As 6 afirmações foram aprovadas como estão.**

**D-032. O Termômetro fica com 2 afirmações no roteiro de 60 min** e 3 no de 120
min. Implementação: uma enquete `termometro_curto` com t1 ("O aplicativo é o
patrão.") e t3 ("Quem não prospera por conta própria é porque não se esforçou o
suficiente."). **A escolha de t1 e t3 foi do Claude:** t1 fecha com o título do
seminário e t3 mede a crença meritocrática. O Kleberson pode trocar.

**D-033. Raça e gênero ficam fora das personas.** O dado vai para o slide.

**D-034. As estimativas sem fonte foram aprovadas:** água, celular, consertos,
remédios, mensalidade da associação e "apertar o cinto".

**D-035. Uma prorrogação só por rodada, mesmo depois do desfazer.** Refazer uma
rodada que já teve prorrogação não abre uma segunda.

**D-036. Calendário** (completa a D-020):
- **30/09/2026 (quarta):** teste com celulares reais no eduroam;
- **07/10/2026 (quarta):** seminário.

Daí sai o prazo de trabalho: o site e as regras precisam estar publicados até
29/09, e o conteúdo e o código ficam congelados até 06/10. O que o teste revelar
é corrigido entre 01/10 e 05/10.

**Autorização (28/09):** no dia 29/09, depois da publicação, o Claude roda um
ensaio curto contra o projeto real. São 5 alunos simulados, numa sala de teste
apagada no fim, rodando fora da rede do campus.

## 28/09/2026: escolhas de tela levantadas pela revisão da F2

**D-037. Espaço por engano.**
- Situação: um Espaço a mais abre a próxima votação e não havia volta.
- Decisão: o **Ctrl+Z desfaz a abertura da votação enquanto nenhum voto chegou**.
- O fluxo normal não ganha passo nenhum: Alt+Tab, Espaço, e a votação abre.

**D-038. Barra do apresentador.**
- Situação: ela aparecia a qualquer movimento do mouse e cobria o que estava
  projetado.
- Decisão: ela **só aparece com a tecla H ou com o mouse encostado na borda de
  baixo** da tela, e some sozinha depois de 3 s.

**D-039. Contadores do "antes" no modo sem celulares.** Continuam visíveis
enquanto o apresentador conta as mãos, como está hoje. Fica marcado como
"vamos testar".
- Sem celulares, o voto é mão levantada, que já é público.
- Com celulares, o "antes" continua escondido até o comparativo (D-011).

**D-040. Nome da carta nas fatias do sorteio.**
- Cada carta ganha no config um rótulo curto opcional, `curto`, com até cerca de
  10 letras, escrito dentro da fatia.
- Os rótulos são rascunhados pelo Claude e validados junto com o Kleberson.
- Fica marcado como "vamos testar".

## 29/09/2026: redesenho depois do primeiro ensaio do Kleberson no telão

Com base nos prints do ensaio, o Kleberson aprovou as propostas abaixo e pediu
que elas entrem **hoje**, para que o teste de 30/09 já use a versão nova.

**D-041. Placar final em páginas** (substitui a tela decomposta, que confundia).
Marcado como "vamos testar". As páginas:
1. **"Quanto sobrou, e quanto faltou para o básico":** uma barra por equipe,
   ordenada pelo saldo, com "faltou R$ X" ao lado. O título é calculado, por
   exemplo "5 de 6 equipes não fecharam as contas".
2. **"Escolha ou sorte?"**, contada como história, sem legenda: "se não mudassem
   nada → as escolhas → a sorte → terminaram com". Os termos "piloto automático",
   "efeito das decisões" e "sorte" saem da tela.
3. **As histórias das equipes** (D-045).

**D-042. Todo bloco mostra a linha do tempo do seminário**, com "você está aqui"
e "a seguir". No "Mapa do seminário", essa linha é o próprio mapa. Os slides
continuam existindo como material complementar. Marcado como "vamos testar".

**D-043. Mais dúvida na decisão.**
- **4 opções por mês**, cada uma um dilema, sem uma resposta certa.
- **Sem setas de tendência** nas opções.
- **De 12 a 14 cartas**, várias ligadas a um mês e às decisões.
- **Contexto da família no celular durante a decisão**, por exemplo "o aluguel
  vence dia 10".
- **Decisão de 120 s.**
- **Consequências que atravessam os meses:** empréstimo, MEI, associação, e a
  demora do INSS.

**D-044. Básico da família no jogo** (substitui a D-025).
- **Cada persona tem uma família no formato de maior impacto**, com dependentes.
  A Rose, por exemplo, sustenta a casa sozinha.
- **O custo do básico da casa tem fonte**: cesta do DIEESE de Porto Alegre,
  aluguel, contas e transporte.
- **Esse custo é cobrado no fim do mês, depois de tudo.** Uma carta que multiplica
  a renda corta o que se ganha, e não a conta.
- **Outra renda da casa**, quando houver, aparece explícita e com fonte.
- **Todo mês, a tela mostra:** "entrou R$ X · o básico custa R$ Y · faltou R$ Z".
- **Realismo, sem suavizar nada:** tudo com fonte e com o impacto real em
  dinheiro e em dias parados. Exemplos: o acidente (dias sem renda, conserto,
  remédio, INSS com carência e fila), o bloqueio de conta (dias sem renda e o
  recurso) e o cancelamento sem pagamento. O objetivo é replicar a angústia e a
  incerteza de quem vive essa realidade.

**D-045. A história de cada equipe no fim:** três linhas contando os três meses,
a partir das narrativas da opção e da carta. Aparece no placar (D-041) e no
celular de cada equipe.

**D-046. Dívida visível.**
- Juros mensais com fonte, cobrados no fim do mês sobre a dívida que vinha do mês
  anterior.
- A tela mostra "dívida: R$ X · juros de Y% ao mês".
- Substitui os juros escritos como efeito no config.

**D-047. Controle de operador fica fora da projeção.**
- "Exportar totais", "Apagar a sala" e os textos de operação vão para a barra
  oculta.
- Todas as telas foram varridas atrás de outros controles do mesmo tipo.
- A abertura (config, roteiro, PIN) é exceção: acontece antes de projetar.

**D-048. Calendário do redesenho:** os ajustes entram em 29/09, e o teste de 30/09
usa a versão nova. A decisão foi do Kleberson; o Claude tinha recomendado não
mudar nada antes do teste.

**D-049. Autonomia operacional do Claude neste projeto** (29/09).
- O Kleberson deu autonomia total nas ações operacionais: fundir PR, publicar no
  GitHub Pages, operar o Firebase, apagar salas de teste e rodar ensaios.
- Decisão de **produto e conteúdo** continua sendo alinhada antes.
- Três limites que o Claude mantém por conta própria:
  - o PIN do apresentador nunca passa pelo Claude;
  - o simulador nunca roda na rede do campus nem no dia da aula;
  - toda ação operacional é relatada logo depois.

## 29/09/2026: perguntas da revisão do conteúdo v2 (seção 7 do rascunho)

O Kleberson aprovou as 8 recomendações. O item 7 fica marcado como "vamos
validar".

**D-050. "Quase ninguém", e não "ninguém", fecha as contas.** Existe um caminho
estreito, de boas escolhas com sorte, que fecha ou quase fecha o básico. O final
não pode estar decidido antes de jogar, senão a dúvida morre.

**D-051. O placar não pode premiar o esgotamento, e a proteção tem de valer.**
- Energia baixa custa: aumenta a chance de adoecer ou se acidentar e reduz a renda
  do mês seguinte.
- A proteção (MEI/INSS, associação) passa a ter efeito real quando algo dá
  errado.
- A melhor opção não é a mesma para todas as personas.
- As letras A a D não seguem o mesmo padrão em todos os meses.

**D-052. O custo real das cartas aparece na tela:** dias parados, a renda perdida
e os gastos (conserto, remédio). Vale para o resultado da rodada, o celular e a
história da equipe.

**D-053. Contextos coerentes.** Os contextos do celular não podem contradizer o
jogo. Os de "conta que vence" viram efeito real (multa ou juros, com fonte) quando
falta dinheiro.

**D-054. A mesma escolha, dita do jeito de cada ofício.** O rótulo e a narrativa
da opção podem variar por persona.

**D-055. No celular, tocar numa opção abre a explicação sem votar,** e um botão
"votar nesta" confirma. A equipe lê o dilema antes de escolher.

**D-056. A referência "com carteira assinada" usa a mesma casa e os mesmos juros
do Jonas de app** (−R$ 2.957 no rascunho v2). Marcado como "vamos validar".

**D-057. Breque no mês 2 mantido.** O reajuste do mês 3 vale só para entregador;
para Daiane, Marcos e Rose, parar só custa. A narrativa diz isso.

**Correções de conta** (não são decisões de produto; ficam registradas por
transparência):
- a manutenção era descontada duas vezes (a renda da PNAD já é líquida);
- um "multiplica" de carta atingia custos fixos do trabalho, como a parcela da
  moto;
- era possível passar mais de 30 dias parado no mesmo mês;
- o empréstimo do mês 3 cobrava sem o dinheiro entrar;
- o "entrou" ficava negativo, porque misturava gastos com o problema (viram uma
  linha própria). **Ainda fica negativo em caminhos raros** (Daiane até
  −R$ 406, 2,6% dos meses 3 ao acaso; Rose até −R$ 269, 1,2%): num mês parado,
  a parcela do curso, a do empréstimo e o DAS continuam saindo como custo fixo.
  Resolver isso é decisão de conteúdo (rascunho, seção 8);
- os valores da fratura não tinham fonte.

Segunda rodada da revisão (29/09), também correções de conta:
- o trabalho do mês chegava a ficar negativo (−R$ 96), e a "renda perdida" da
  carta passava da renda que havia: os dias parados são descontados a preço
  cheio depois do "exausto" (× 0,9) ou do bloqueio (× 0). Agora o trabalho
  variável tem piso em R$ 0 (`regras.pisoTrabalho`), e a validação falha se ele
  voltar a ficar negativo;
- o conserto do carro na fratura citava uma faixa que a fonte não traz: passou a
  R$ 1.840, o teto da troca com pintura de para-choque em carro popular
  (Autocidade, 13/06/2026), e não R$ 2.000;
- a faixa da fisioterapia passou a ser a lida na Doctoralia (R$ 120 a R$ 320).

## 29/09/2026 (noite): como cumprir a D-050 e a D-051

A calibragem da F4 não conseguiu cumprir as duas decisões. A causa estava nos
próprios dados, não em falta de ajuste: com o básico real de Porto Alegre e as
rendas reais, ninguém fecha as contas; e a proteção se comporta como seguro,
que perde em valor esperado e ganha no pior caso. O Kleberson decidiu:

**D-058. Picos reais tornam o fechamento possível** (detalha a D-050).
- Entram cartas de pico que existem de verdade, cada uma com fonte: fim de ano,
  datas comemorativas, gorjeta, corrida longa, bônus de meta da plataforma.
- **Meta:** de 5% a 10% das partidas de pelo menos duas personas fecham o básico.
- Quem fica só no padrão nunca fecha.
- Nenhuma opção é dominante.

**D-059. A proteção vale pelo pior caso que ela evita** (detalha a D-051).
- A tela mostra o que a proteção pagou ou evitou, por exemplo "sem o MEI, a
  fratura teria custado R$ X". Aparece no resultado, na história da equipe e no
  placar, junto com o pior caso possível dado o que a equipe escolheu.
- O esgotamento custa mais, com base na pesquisa (energia baixa: mais chance de
  acidente e de adoecer, e renda menor), até deixar de ser o melhor plano para a
  maioria das personas.

**Provisório (29/09, noite): a associação deixa de ser marcada como proteção** (`protege`)
até o Kleberson decidir o item 2 da seção 0.8 do rascunho. Com a calibragem
atual, ela não melhora o pior caso. Marcada como proteção, a página "O pior que
podia acontecer" diria "ela evita o pior" ao lado de "a proteção não melhorou o
pior caso". Só o MEI aparece como proteção nessa página. Desfazer é pôr
`"protege": true` de volta na opção r3/0.
