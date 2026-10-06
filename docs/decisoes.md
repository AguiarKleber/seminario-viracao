# Registro de decisões

Numerado e **nunca reescrito**. Uma decisão nova que substitui outra ganha número
novo e cita a antiga. Tudo o que está aqui foi alinhado com o Kleber. Mudar
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

## 28/09/2026: respostas do Kleber

**D-001. Pilha: Firebase Realtime Database (plano Spark) + login anônimo + GitHub Pages.**
- HTML, CSS e JavaScript em scripts clássicos, sem framework e sem build.
- **Supabase foi descartado:** o projeto grátis pausa depois de 7 dias; o tempo
  real só usa WebSocket; acima de 100 mensagens por segundo, todos são
  desconectados; e eventos ocorridos durante a queda se perdem.

**D-002. Projeto pessoal, sem vínculo com nenhum empregador.**
- Mora na pasta de projetos pessoais (`Pessoal-Dev/seminario-viracao`).
- Repositório **público** `AguiarKleber/seminario-viracao`. O GitHub Pages grátis
  exige repositório público; cartas e pesos ficam visíveis, e isso foi aceito.
- O Firebase fica na conta Google **pessoal** do Kleber.

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

**D-017. Quem opera o notebook é o Kleber, e as telas dizem "apresentador".**
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

O Kleber escolheu o pacote B de calibragem e aceitou em bloco as recomendações
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
seminário e t3 mede a crença meritocrática. O Kleber pode trocar.

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
- Os rótulos são rascunhados pelo Claude e validados junto com o Kleber.
- Fica marcado como "vamos testar".

## 29/09/2026: redesenho depois do primeiro ensaio do Kleber no telão

Com base nos prints do ensaio, o Kleber aprovou as propostas abaixo e pediu
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
usa a versão nova. A decisão foi do Kleber; o Claude tinha recomendado não
mudar nada antes do teste.

**D-049. Autonomia operacional do Claude neste projeto** (29/09).
- O Kleber deu autonomia total nas ações operacionais: fundir PR, publicar no
  GitHub Pages, operar o Firebase, apagar salas de teste e rodar ensaios.
- Decisão de **produto e conteúdo** continua sendo alinhada antes.
- Três limites que o Claude mantém por conta própria:
  - o PIN do apresentador nunca passa pelo Claude;
  - o simulador nunca roda na rede do campus nem no dia da aula;
  - toda ação operacional é relatada logo depois.

## 29/09/2026: perguntas da revisão do conteúdo v2 (seção 7 do rascunho)

O Kleber aprovou as 8 recomendações. O item 7 fica marcado como "vamos
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
que perde em valor esperado e ganha no pior caso. O Kleber decidiu:

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
até o Kleber decidir o item 2 da seção 0.8 do rascunho. Com a calibragem
atual, ela não melhora o pior caso. Marcada como proteção, a página "O pior que
podia acontecer" diria "ela evita o pior" ao lado de "a proteção não melhorou o
pior caso". Só o MEI aparece como proteção nessa página. Desfazer é pôr
`"protege": true` de volta na opção r3/0.

## 30/09/2026: depois do teste do Kleber no site publicado

**D-060. O jogo dura 12 meses, em 6 rodadas bimestrais** (substitui as 3 rodadas
da D-006). A sessão gira em torno do jogo: a apresentação acontece em cima dele,
com dados da realidade brasileira. Duas ou três entrevistas cabem em blocos que
somam no máximo 20 minutos. Continua havendo os roteiros de 60 e de 120 minutos.
Marcado como "vamos testar".

**D-061. Seis personagens, um por equipe, cada um num trabalho diferente**
(substitui a D-004 e a D-026):
- motorista de app (Marcos);
- motoboy do iFood (Jonas);
- entregador de bicicleta (Kauã);
- manicure por app (Rose);
- vendedora de doces no Instagram (Daiane);
- influenciadora digital (personagem nova).

**D-062. Ninguém tem carteira assinada na casa.** Todos são "empreendedores" em
trabalho subordinado a plataformas. Quando a casa tem outra renda, ela também é
informal (diária, bico). O 13º e o abono deixam de ser picos.

**D-063. O risco cresce com os meses:** desgaste do veículo, do corpo e do
algoritmo. Foi sugestão do Kleber.
- **Como se mede (05/10, achado da revisão):** no plano padrão com a carta
  "Normal" em todos os bimestres, a chance de cada carta de desgaste nunca cai de
  um bimestre para o seguinte (fora as quedas da própria escolha do padrão). Nas
  partidas sorteadas, a tendência do ano é a mesma, mas a média recua até 1 ponto
  em alguns bimestres: na casa que já atrasou contas ou se cansou, a doença, o
  corte de luz e o despejo ganham espaço no sorteio. As fontes das cartas dizem
  as duas coisas (rascunho, seção 4). Os pesos não subiram para apagar as quedas,
  porque isso mexeria no equilíbrio do jogo inteiro.

**D-064. Modo espectador do apresentador no celular.**
- Com o PIN, o celular do apresentador vê a tela de qualquer equipe, exatamente
  como o aluno vê.
- Ele não vira membro e não vota.

**D-065. Telas enxutas.**
- **No telão, o resultado da rodada mostra só o essencial:** a carta, o saldo do
  mês em verde (+) ou vermelho (−) e a dívida.
- **No celular, a situação traz o resumo mês a mês**, com o saldo colorido e o
  detalhe recolhido.
- **O empréstimo passa a ser dívida, e não renda.**

**Defeito crítico registrado:** no teste de 30/09, um toque em "Votar nesta" não
registrou o voto no mês 3. A correção é prioridade máxima e vem com uma matriz de
votos: todas as equipes, todas as rodadas e as situações difíceis.

## 01/10/2026: decisões da revisão da versão de 12 meses

**D-066. O cheque especial tem um limite realista** (de R$ 1.000 a R$ 2.000, com
fonte).
- Passado o limite, o banco corta o crédito.
- O que falta vira **conta atrasada** (aluguel, luz), com multa e risco de corte
  ou despejo, e **comida cortada** ("o que faltou na mesa").
- Acabam os juros compostos infinitos, que levavam a dívida a dezenas de milhares
  de reais em 12 meses.
- O jogo passa a mostrar a escolha entre comer e pagar.
- **No núcleo (01/10, esquema v3.1; contratos, seções 1 e 3):** `regras.limiteChequeEspecial`,
  multa uma vez e mora mensal simples (`multaAtraso`, `moraMes`, com fonte), indicadores
  `contas_atrasadas` (entra no patrimônio) e `faltou_na_mesa` (custo humano, fora dele), e o
  item da comida marcado no básico. Num mês bom, a folga até o limite paga as contas atrasadas.
  **A validar:** o padrão de `regras.cortarPrimeiro` é `"contas"` (atrasa as contas do período e
  só corta a comida do que passar delas). As duas coisas acontecem: 22% trocaram a conta de luz
  por comida (Ipec/iCS, nov/2021) e 30% dos que ganham até 1 salário mínimo deixam de comprar
  comida para pagar a luz (Pólis/Ipec, mai/2024); 21% das dívidas atrasadas são contas básicas
  (Serasa, mar/2026). "Comida primeiro" zeraria a comida das personas mais pobres em todo
  bimestre antes de atrasar uma conta. O valor do limite e da multa no `config.json` ainda
  falta (conteúdo).

**D-067. A fratura com MEI pode render mais que um bimestre de trabalho, e a tela
diz isso.**
- O auxílio do INSS para quem paga o MEI é de 1 salário mínimo, mais do que a
  Bruna (e quase o Kauã e a Daiane) ganha trabalhando.
- É um dado real e vira ponto de debate sobre renda abaixo do mínimo.
- A tela mostra algo como "o auxílio é de 1 salário mínimo, mais do que ela
  ganhava trabalhando".

## 05/10/2026: decisões antes de publicar a versão 7

Respostas do Kleber às perguntas do fechamento da F6d ("1. b / 2. a / seguir
demais recomendações") e ao plano de publicação ("de acordo").

**D-068. O despejo e o corte de luz ficam prováveis com o atraso.**
- Antes, a chance travava em ~4% (despejo) e ~8% (corte) por bimestre, e ~85% das
  Roses terminavam o ano com uns 10 aluguéis atrasados sem nunca receber o despejo.
- Agora a chance cresce com as contas atrasadas no começo do bimestre e chega a
  ~30% por bimestre quando elas passam do valor de 4 aluguéis da casa (uns 3 meses
  de aluguel atrasado, contando as outras contas, a multa e a mora: despejo) ou de
  2 bimestres das contas que atrasam (corte de luz). Depois que o despejo já saiu,
  o corte vai a ~40%. O despejo continua no máximo uma vez por partida (os "× 0"
  foram para o fim da lista: antes, ele podia sair de novo).
- Para a D-063 continuar valendo, o peso das cartas de desgaste é multiplicado nas
  mesmas faixas.
- As regras têm fonte (ANEEL, REN 1.000/2021; Lei 8.245/1991, arts. 9º e 62); a
  **chance é estimativa sem fonte**, e o apresentador diz isso em sala.
- Medido no plano padrão: de 37% (Jonas) a 76% (Daiane) das partidas tiram o
  despejo, e de 34% a 83% tiram o corte. Na casa muito atrasada, a carta "Normal"
  e a doença perdem espaço no sorteio (rascunho, seção 8, item 20).

**D-069. Gás, ônibus e remédio "ficam sem", sem multa.**
- `semAtraso: true` nos 18 itens (os três de cada casa): quem não paga fica sem,
  como já dizia a fonte da multa. Eles não viram conta atrasada e aparecem como
  "ficou sem".
- Consequência direta: a multa e a mora das contas que atrasam passam a 8% e 1%
  ao mês (a média só de aluguel, luz, água e celular; eram 7% e 0,8%), e a linha
  "com carteira assinada" vai a −R$ 14.939.
- Limitações conhecidas, ditas na fala do apresentador: o "ficou sem" não
  aparece no placar final; ficar sem não tem consequência no jogo (o ônibus de
  quem traz a outra renda, o remédio que não aumenta a doença); a frase da
  proteção não cita o "ficou sem" (rascunho, seção 8, item 21).

**D-070. Confirmadas como estão** (recomendações do fechamento da F6d):
- **A ordem do corte (D-066):** `cortarPrimeiro: "contas"`. A casa atrasa as
  contas e só corta a comida no que passar delas. As pesquisas mostram as duas
  coisas (22% e 30%), e o apresentador diz isso.
- **O limite (D-066):** R$ 2.000 de cheque especial (Banco Central, Estudo
  Especial 84/2020); a multa e a mora ficam como diz a D-069.
- **O placar da Rose e da Daiane:** fica como está. O "faltou na mesa" continua
  fora do saldo (não é dívida, D-066) e aparece ao lado do placar ("Faltou na
  mesa no ano").
- **A frase do auxílio (D-067):** como está, no telão, no celular e na história.
- **A ordem das equipes (D-061):** Jonas e Rose primeiro e obrigatórios; com
  menos de 6 equipes, saem as últimas.
- **A linha "com carteira assinada" (D-056, D-062):** fica no placar, e o
  apresentador explica o que ele não mede (o app dá mais caixa com mais horas e
  sem INSS, FGTS, férias e auxílio-doença).

**D-071. A versão 7 vai ao ar em 05/10 com o que foi testado, e dois ajustes
ficam para 06/10**, antes de congelar o conteúdo, só no `config.json` (sem mexer
nas regras do Firebase):
- **O despejo ganha um custo em dinheiro.** Sem ele, na casa muito atrasada o
  despejo toma o lugar de cartas caras e o bimestre esperado melhora: no ano, o
  Jonas termina R$ 304 melhor e o Marcos R$ 505. O custo é o que o processo soma
  à dívida pelo art. 62, II da Lei 8.245/1991: multa, juros, custas do TJRS
  (2,5% do valor da causa, Lei RS 14.634/2014) e os 10% de honorários que a lei
  fixa. Com 3 aluguéis atrasados, ~R$ 1.100 para aluguel de R$ 1.000 e ~R$ 1.400
  para R$ 1.300 (estimativa com a conta declarada; pesquisa de 05/10).
- **Os textos de fonte das cartas** ainda dizem "proposta de 05/10, aguardando o
  Kleber" no config (não aparecem em nenhuma tela); trocam para D-068 e D-069
  junto com o custo do despejo, que muda o config de qualquer jeito.
- **O "ficou sem"** fica fora do placar e é explicado na fala. Um total no placar
  final é código para depois do seminário.

## 05/10/2026 (noite): depois do teste do Kleber na versão 7

Pedidos do Kleber com os prints do teste da versão 7 publicada, e as respostas
dele às perguntas ("1. A / 2. A / 3. de acordo / 4. A, mas eles também enxergar
no telão de apresentador quando sair o resultado / 5. B").

**D-072. Greve, protesto e breque levam ao bloqueio da plataforma.**
- Quem depende de aplicativo e adere à greve (14/04), ao protesto (27/07) ou ao
  breque (01/09) é bloqueado por 1 semana e perde a renda desses 7 dias.
- O "bloqueio branco" é documentado (Abílio, 2021); a certeza é simplificação do
  jogo (nem todo grevista é bloqueado), e o apresentador diz isso.

**D-073. Cada opção mostra o custo humano, numa linha curta.**
- Embaixo de cada opção, do jeito do personagem, o que a escolha custa para ele e
  para a casa (ex.: "12 h por dia no sol: chega em casa e os filhos já dormiram").
  Sem chance nem porcentagem. No celular e no telão.

**D-074. O termômetro de entrada pergunta o que o jogo põe à prova.**
- As afirmações óbvias ("é difícil viver de aplicativo") davam a mesma resposta no
  começo e no fim. Passam a ser:
  - "Se eu estivesse no lugar desses trabalhadores, faria escolhas que fechariam
    as contas."
  - "Quem trabalha por aplicativo e não fecha as contas está administrando mal o
    dinheiro."
  - "Trabalhar mais horas resolve o problema de quem ganha pouco por aplicativo."

**D-075. As cartas contam a história de cada personagem.**
- Seis equipes tirando "o instrumento de trabalho quebrou" pareciam repetição.
  A carta ganha o título do jeito do personagem ("A moto quebrou", "O celular
  quebrou"...), com a mesma chance, no celular e no telão quando sai o resultado.
- O corte de luz volta a ~30% por bimestre na partida real (no teste, estava em
  37% a 43% para todas as equipes).

**D-076. "Escolha ou sorte?" mostra quanto a sorte podia pesar.**
- Para cada equipe, com as mesmas escolhas: o resultado com a melhor sorte, com a
  pior, e onde ela ficou. Os rótulos dizem o que é cada número ("no piloto
  automático", "o que as escolhas mudaram", "o que as cartas mudaram").

**D-077. Ajustes de tela pedidos no teste de 05/10.**
- Resultado no telão: o valor colorido é o "saldo do bimestre"; a dívida vira uma
  linha só, "dívida total" (banco, empréstimo e contas atrasadas); o "faltou na
  mesa" continua à parte. O celular mostra o mesmo total.
- No placar final, o celular mostra as escolhas da equipe em cada bimestre, para a
  turma ver que, mesmo escolhendo, faltou dinheiro.
- O telão pode rever a tela anterior sem afetar os celulares.
- A barra oculta só abre quando o mouse para numa faixa fina no pé da tela.
- Sai o slide "Gancho: o lançamento"; o mapa do seminário mostra só os meses e os
  blocos de dados.
- No telão, a equipe aparece pelo nome e ofício do personagem ("Jonas, motoboy"),
  com o ícone da cor.
- "O pior que podia acontecer" explica o que é proteção e o que cada equipe podia
  ter escolhido.

## 05/10/2026 (noite, depois do teste): o jogo simples

Depois de testar a versão no ar, o Kleber achou o formato de 6 personagens, com
cartas sorteadas e várias telas de placar, complexo demais para a turma: "não
precisamos tornar tão complexo, pode ser em um formato mais simplificado". As
respostas dele ("1. 5 alternativas por bimestre / 2. opção A / 3. opção A / 4.
preciso amanhã até as 12h") e os pedidos de 05/10 à noite, depois de ler o
rascunho do Jonas (docs/jogo-simples.md).

**D-078. O jogo simples: um personagem, cinco opções, sem sorteio, o dinheiro na
opção.** Publicado em 06/10 até as 12h (o Kleber funde o PR).
- **Um personagem só, o Jonas** (motoboy do iFood, a casa e as fontes de
  05/10). As 6 equipes jogam o mesmo Jonas e aparecem pela cor ("Equipe
  Laranja"); o que muda entre elas é a combinação de escolhas, e o fim compara o
  impacto financeiro de cada combinação.
- **6 bimestres, 5 opções cada (A a E)**, do dia a dia de um entregador. A
  decisão passa a 120 s (5 opções para ler).
- **Sem sorteio:** o evento do mês é igual para todas as equipes, e as
  consequências vêm das próprias escolhas, sempre (simplificação dita em sala).
- **O valor em dinheiro aparece na opção** ("+R$ 900 no bimestre"), junto da
  linha do custo humano (D-073). O valor da tela é o que a opção põe ou tira
  (corrigido em 06/10: em jan–fev, o saldo do bimestre muda exatamente esse valor;
  depois, passado o limite do cheque especial, o que falta atrasa conta com multa
  de 8%, e o saldo pesa um pouco mais).
- **Saem o MEI e a associação:** precisam de explicação e, sem sorteio, só
  custam. Entram "Atrasar a parcela da moto" (jan–fev) e "Pneu novo antes da
  chuva" (mai–jun). Os padrões (ninguém votou) ficam C, D, D, C, A, D.
- **A regra das costas** (decidida pelo Kleber): duas opções puxadas seguidas (mais
  horas ou noites na rua) travam as costas no bimestre da segunda: 7 dias parado e
  4 sessões de fisioterapia, −R$ 1.230. Sem ela, a opção puxada era a melhor em
  dinheiro em todos os bimestres. Com ela, **nenhuma das 15.625 combinações fecha
  o ano** (a melhor termina devendo R$ 2.429), o que o rascunho já dizia ao
  propor a regra.
- **A consequência aparece no resultado do bimestre em que acontece, com o
  motivo** (no telão, embaixo das faixas; no celular, à vista).
- **O placar final** tem três páginas: o caminho de cada equipe, "Quanto sobrou,
  ou ficou devendo" (com a linha "Jonas com carteira assinada") e "Das 15.625
  combinações possíveis, X fecham o ano".
- **Os roteiros** saem sem "A conta de cada casa" ("não temos necessidade da tela
  prévia à rodada de decisão"): de "Conheça o Jonas" direto para Jan–fev. O tempo
  dos passos removidos foi para as decisões e o placar, e os roteiros continuam
  fechando 60 e 120 min.
- **O telão não baixa mais o JSON a cada rodada** ("não baixar o JSON a cada
  rodada"). Muda a D-015: o seguro passa a ser manual, o "Salvar estado" da barra
  oculta (online e offline). Online, a sala continua no Firebase e se retoma com o
  PIN.
- **As regras do Firebase não mudam** (continuam v4).

**Deixam de valer no jogo do seminário** (o código continua sabendo jogá-las: é
o config sem `regras.formatoSimples`, guardado em
`test/fixtures/config-real-v31.json`):
- os 6 personagens, um por equipe (D-061; antes, D-004 e D-026), a ordem das
  equipes por personagem (D-070, "A ordem das equipes") e a equipe pelo nome e
  ofício do personagem no telão (D-077): agora, pela cor;
- as cartas sorteadas por equipe e as chances no sorteio (D-012, D-013), a
  parcela "sorte" do placar (D-009), "Escolha ou sorte?" e a faixa da sorte
  (D-076);
- a energia, a proteção que vale pelo pior caso e a página "O pior que podia
  acontecer" (D-051, D-059, e o item da D-077 que a explicava), o MEI e o auxílio
  do INSS acima do trabalho (D-067);
- o risco que cresce com os meses e as cartas de desgaste, de despejo e de corte
  de luz (D-063, D-068, D-071, D-075, inclusive os títulos das cartas por
  personagem);
- "quase ninguém fecha" e a meta de 5% a 10% (D-050, D-058): com a regra das
  costas, ninguém fecha;
- o JSON automático do fim da rodada (D-015, segundo item).

**Continuam valendo:** os 12 meses em 6 bimestres (D-060); ninguém com carteira
(D-062); o modo espectador (D-064); o empréstimo como dívida (D-065); o limite do
cheque especial, as contas atrasadas e o "ficou sem" por dentro, com a multa e a
mora (D-066, D-069, D-070); o bloqueio de 1 semana depois de greve, protesto ou
breque (D-072); a linha do custo humano (D-073); o termômetro de entrada (D-074);
e, da D-077, o modo de rever a tela anterior, a barra oculta fina, o mapa sem o
gancho, o "saldo do bimestre" e as escolhas da equipe no celular no placar final.

## 06/10/2026 (de manhã): depois do teste do Kleber na versão 8

Pedidos do Kleber com os prints do teste da versão 8 publicada (o jogo simples),
na manhã de 06/10. O princípio dele continua: prático, pouca explicação, fácil
de entender. O conteúdo, com as fontes, está em
[jogo-simples.md](jogo-simples.md).

**D-079. Contexto nas opções, dados depois de cada bimestre e o pior caso abaixo
de R$ 7.000** (detalha a D-078 e muda partes dela, da D-072 e da D-060).
- **As opções ficam às cegas.** Nem o telão nem o celular mostram o dinheiro ao
  lado da alternativa; o saldo continua aparecendo no resultado. Muda a D-078
  ("o valor em dinheiro aparece na opção").
- **Cada opção tem uma mini-história junto do título** ("que greve? por quê? o
  que impacta?"): o que é, por quê e o que impacta, numa frase de até ~110
  caracteres, sem o dinheiro do Jonas. É o campo `narrativa` da opção.
- **Depois do resultado de cada bimestre, uma tela com dados reais do tema
  dele**, com um contexto curto do que é o tópico (o que é gestão por algoritmo,
  o que é o breque) e até 3 números com fonte: calor e jornada, a greve de 14/04
  e a lei, chuva e acidentes, gestão por algoritmo, o que é o breque e fim de
  ano sem 13º. Substitui os blocos de dados genéricos (PNAD, lei, algoritmo,
  breque, 13º), o quiz e o contraponto do roteiro de 120 min. No config, o passo
  `bloco` ganha `contexto`, `itens` e `fonte`.
- **Sem a etapa "Entrevistas"** nos dois roteiros (muda a D-060, que reservava
  até 20 min a elas). O tempo foi para as rodadas (a leitura da mini-história),
  os blocos de dados, o placar, o debrief e o Fim; os roteiros continuam fechando
  60 e 120 min.
- **"Fim: quem é o patrão?" com dados do setor** sobre quem manda: quem define o
  preço e os clientes, a ameaça de bloqueio e a concentração do delivery.
- **"Cortar comida e remédio" sai** de nov–dez: o básico para sobreviver não é
  opção realista. Entra **"Pedir ajuda à família"** (+R$ 300 da mãe aposentada;
  o valor é estimativa sem fonte). Não é opção puxada.
- **As telas complementares** (as que não são de alternativas) ficam menos
  poluídas; o placar sai **sem a lista de posições de cada equipe** ("975º de
  15.625"), e o comparativo, **sem a linha "mediana · média · n"**.
- **A pior combinação deve menos de R$ 7.000** (devia R$ 10.906). Mudaram só
  estimativas e recontas, todas declaradas na fonte de cada valor:
  - o bloqueio depois da greve, do protesto e do breque passa de 7 para **5
    dias** (R$ 450), o menor afastamento da regra da 99 (5, 10 e 15 dias; é a
    regra dos motoristas, que conta aceitar e cancelar: para o entregador
    grevista, a duração é estimativa sem fonte). Muda a intensidade da D-072;
    o bloqueio continua existindo, sempre;
  - as faxinas da companheira: duas por semana são **8,67 por mês**, e não 8
    (R$ 1.600, eram R$ 1.500);
  - o ônibus da companheira: as idas e voltas das faxinas, **18 passagens**
    (R$ 95), e não 30 sem conta (R$ 159);
  - o aluguel: **o piso da faixa do Sarandi** no QuintoAndar, R$ 1.200 (era
    R$ 1.300, dentro da mesma faixa).
  - Não mudaram: a regra das costas (7 dias e 4 sessões), a moto que quebra, o
    temporário com carteira, os juros, a multa e o limite do cheque especial.
    Só com o bloqueio e as costas mais leves o pior caso não descia de R$ 9.800:
    o pior caminho é o das opções de descanso e de proteção, e o déficit da casa
    vem de todo mês. Por isso a casa foi recontada.
  - **Resultado (06/10, `npm run combinacoes`):** pior D-A-E-C-C-E, devendo
    R$ 6.783; melhor A-D-C-E-D-A, +R$ 1.714; **260 das 15.625 combinações fecham
    o ano** (eram 0), todas com ao menos uma opção puxada; mediana −R$ 2.904;
    padrão −R$ 3.291; nenhuma opção domina. A linha "Jonas com carteira
    assinada" vai a −R$ 11.947. Num mês comum, falta R$ 128 (faltavam R$ 392).
- **As regras do Firebase não mudam** (continuam v4). O config passa à versão
  `2026-10-06-v4.1-simples`.
- **Como ficou na tela (versão 9 do site, 06/10 à tarde).** Medido no telão
  em 1024×768 e 1920×1080, offline com as 6 equipes e online com a faixa de
  entrada, e no celular em 360×740:
  - a mini-história corre na mesma linha do rótulo, depois de um travessão.
    Numa linha própria, cada opção ia a três linhas e a decisão passava
    ~200 px de 1024×768. Para caber, a situação do bimestre ficou em uma linha
    (mar–abr, jul–ago, set–out e nov–dez encurtadas) e cada opção em duas
    (cinco mini-histórias encurtadas), sem tirar fato nem fonte;
  - na célula da equipe da decisão, só a cor ("Laranja", como na tabela do
    caminho do placar), sem o "Equipe": "Equipe Verde-azulado" quebrava em
    duas linhas. **A confirmar com o Kleber** (a regra de 05/10 é a equipe
    pela cor em toda tela; a cor continua lá);
  - o bloco de dados mostra só o contexto, os itens e a fonte: sem a trilha do
    seminário e sem o placar resumido. O "Mapa do seminário" mantém a linha;
  - no validador, `contexto` até 220 letras, cada item até 140, até 3 itens,
    `fonte` até 200 e, no formato simples, a mini-história até 120: acima
    disso, aviso (não bloqueia a sala).
- **Revisão de 06/10 à tarde (ainda na versão 9, antes de publicar).** Nada
  muda de número do jogo (260 fecham, melhor +R$ 1.714, pior −R$ 6.783):
  - **o conteúdo conferido com as fontes:** a greve de 14/04 foi convocada
    *contra* o texto da lei (R$ 8,50 por entrega, a categoria queria R$ 10);
    os 38,3% de ajuda da família valem para todos os acidentados que se
    afastaram; os 16% de dezembro são do começo do mês contra os meses
    anteriores; o seguro do iFood paga diária de 7 a 30 dias parado; 2 de
    cada 3 que trabalham por app não contribuem ao INSS; o breque de 31/03/2025
    foi em 60 cidades, segundo os entregadores; a regra dos 70% da 99 (dos
    motoristas) saiu dos blocos, e no lugar dela entrou a do iFood (7 recusas
    seguidas = 15 minutos fora); a semana do Natal deixou de ser "a com mais
    pedidos do ano" (sem fonte);
  - **às cegas de verdade:** "Empréstimo de R$ 1.500" passa a "Pegar um
    empréstimo", e o custo humano dele perde o "R$ 183"; a mini-história de
    "Furar o breque" perde o "até R$ 9". Ficam na mini-história valores do
    contexto que não são o dinheiro do Jonas (o piso da lei, a pauta do
    breque, os R$ 3 do +Entregas);
  - **1280×720** (projetor 16:9 de 720p, ou notebook com escala de 150%)
    entra nos tamanhos medidos. Online, com a faixa de entrada, a decisão
    passava 39 px: um segundo aperto põe o andamento na linha do nome
    ("Laranja 2 de 3"). O resultado tira a frase e o evento do mês (que estão
    no celular) sempre que não cabe, e não só com consequência;
  - **G1:** o Fim lista as equipes em uma coluna, com "Equipe Verde-azulado"
    numa linha (em duas colunas, ia a três); a cor nunca quebra no hífen.

**Deixam de valer:** da D-078, "o valor em dinheiro aparece na opção" e
"nenhuma das 15.625 combinações fecha o ano"; da D-072, a semana de bloqueio
(agora, 5 dias); da D-060, as entrevistas.
