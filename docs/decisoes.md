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
