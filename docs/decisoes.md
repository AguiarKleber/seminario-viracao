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
