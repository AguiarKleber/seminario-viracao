# Arquitetura: app do Seminário da Viração

**Situação:** aprovada em 28/09/2026. Esta é a especificação que o código segue.
**Precedência:** a seção **A. Mudanças de 28/09** vale sobre o resto do documento.
Em caso de conflito com [decisoes.md](decisoes.md), vale o registro de decisões.

**Como foi feita:** pesquisa em três frentes (tempo real, plataforma/navegador e
contexto local), com fatos conferidos na documentação oficial e alguns testados na
máquina. Depois vieram três propostas independentes, uma síntese e dois revisores
adversariais. A seção 15 lista o que os revisores mudaram.

---

## A. Mudanças de 28/09 (valem sobre o resto)

1. **"Apresentador", e não "professor".** Quem opera o telão é um dos
   apresentadores do seminário. O nó do PIN chama-se `privado/pinApresentador`.
2. **O jogo corre em paralelo ao seminário inteiro** (D-006).
   - O roteiro deixa de ter um passo `jogo` com todas as rodadas. Cada rodada vira
     um passo próprio, `{ "tipo": "rodada", "rodada": "r1" }`, intercalado com
     passos `bloco`, os trechos da apresentação.
   - O passo que mostra as personas passa a se chamar `personas`, para não
     confundir com a apresentação.
   - **Passo `bloco`:**
     - o telão mostra uma tela de espera discreta: título do trecho, faixa de
       entrada se a entrada estiver aberta, e o placar resumido;
     - o apresentador troca para os slides com Alt+Tab;
     - o celular mostra a **situação da persona** (indicadores e a narrativa do
       último mês, em primeira pessoa) e "acompanhe a apresentação";
     - o celular não liga o Wake Lock e **não** mostra "aguardando o telão" por
       pulso velho.
3. **Alt+Tab entre slides e telão** (D-007).
   - O telão fica numa janela própria, em tela cheia (F11).
   - **Nenhuma transição do telão depende de timer enquanto ele está escondido.**
     O cronômetro é só visual; quem fecha é o apresentador (D-010), e a regra do
     banco corta o voto atrasado pelo prazo.
   - Ao voltar a ficar visível, o telão faz o mesmo ciclo de reconexão do celular
     e relê o estado.
   - O roteiro do apresentador manda desligar a economia de memória do navegador
     para o site.
4. **Enquete de entrada no início da aula, e opcional** (D-008).
   - É o primeiro passo depois do lobby.
   - Pode ser pulada pelo "Pular para…".
   - Sem "antes", o comparativo mostra só o "depois", com o aviso "sem medição de
     entrada".
5. **5 personas e 6 equipes, com duas equipes na mesma persona** (D-004). O
   validador aceita persona compartilhada e avisa se houver persona sem equipe.
6. **Wake Lock no celular só durante votação e decisão.** Nos outros momentos, é
   liberado para poupar bateria.
7. **Referência opcional no placar final:** `referencias` no config, por exemplo
   "a mesma pessoa com carteira assinada". Aparece como linha de comparação, não
   como equipe. O valor precisa de fonte e é validado junto com o Kleberson
   (D-005). Com `persona`, a linha atravessa só as equipes dessa persona (no
   config de 28/09, "Jonas com carteira assinada" só nas equipes do Jonas).
8. **Playwright como `devDependency` do projeto**, usando o Chrome ou o Edge
   instalados (`channel`), sem baixar navegador.
9. **O emulador do Firebase roda com um projeto `demo-seminario`**, sem login.
   Assim o `canal-firebase`, as regras e o simulador são testados localmente. O
   JDK 21 está instalado (D-021).
10. **Dois roteiros no config, `60min` e `120min`.** O apresentador escolhe um ao
    criar a sala (D-019).

---

## 0. Resumo

- **Pilha:** Firebase Realtime Database (plano grátis Spark) com login anônimo invisível, hospedado no GitHub Pages. HTML, CSS e JavaScript em scripts clássicos, sem framework e sem build.
- **Quem manda no estado:** só o telão escreve o estado da sessão. Os celulares escrevem apenas o próprio voto. As regras do banco fazem o papel de servidor e recusam o resto.
- **Uma lógica só:** o motor do jogo é JavaScript puro, sem tela e sem rede. Os mesmos arquivos rodam no telão online, no telão offline, no simulador (Node) e nos testes. Online e offline diferem só no "canal", que tem duas implementações com a mesma interface.
- **Offline:**
  - se a rede cair no meio da aula, o botão "Continuar sem celulares" segue dali;
  - se não houver internet desde o início, abre-se a pasta do pendrive com duplo clique.
- **Reconexão:** o celular percebe a queda sozinho e reconecta. O voto fica guardado no aparelho até o servidor confirmar, e recarregar a página não perde nada.
- **Custo:** R$ 0. O pico previsto é de 41 conexões, contra 100 permitidas.

---

## 1. Fontes do conteúdo

Estes arquivos ficam na pasta Downloads do Kleberson e **não** entram no repositório:
- **`trilha_seminario_viracao.html`:** a trilha do seminário. Traz o Termômetro
  (afirmações de 1 a 5), a Medição (a mesma enquete do início), o Gancho com
  lançamento encenado e os planos B em papel e cartões coloridos.
- **Artigo de Ludmila Abílio**, "Empreendedorismo, autogerenciamento subordinado ou
  viração?": motoboys, bike boys e manicures. É a base das personas.
- **Artigo do Cad. EBAPE.BR (2021)** sobre o empreendedorismo como ideologia
  neoliberal.
- **Transcrição do Café da Manhã de 04/11/2024**, com Rosana Pinheiro-Machado.

Na trilha, o jogo era um bloco de 15 min, com 5 personas. As decisões D-004 e
D-006 substituíram isso: agora são 6 equipes sobre 5 personas, e as 3 rodadas se
espalham pelo seminário.

---

## 2. Camada de tempo real e hospedagem

### Firebase Realtime Database + login anônimo (escolhido)

| Fato que decidiu | Fonte |
|---|---|
| Se o proxy do campus bloquear WebSocket, o SDK cai sozinho para long-polling | código-fonte do SDK (`TransportManager.ts`) |
| Não há pausa por inatividade documentada | página de preços (a pausa não é mencionada) |
| Ao reconectar, o SDK entrega o estado atual, sem código de "buscar de novo" | documentação e código do SDK |
| `now` nas regras, `serverTimestamp()`, `/.info/serverTimeOffset` e `onDisconnect` cobrem prazo, cronômetro e presença | firebase.google.com/docs/database/web/offline-capabilities |
| O plano Spark dá 100 conexões simultâneas, 10 GB/mês e 1 GB de armazenamento, sem limite por mensagem | firebase.google.com/pricing |
| O SDK vem por CDN como módulo, com versão fixa (12.19.0, de 09/09/2026, cerca de 115 KB em gzip) | firebase.google.com/docs/web/alt-setup |

**Custos aceitos:**
- O RTDB **não tem região na América do Sul** (us-central1). Medi cerca de 160 ms, o que não faz diferença para votação.
- A fila de escrita offline do SDK na web fica **só em memória**. Resolvemos guardando o voto no aparelho (seção 10).
- **Limite de 100 contas anônimas por hora por IP.** Os 20 alunos estão atrás do mesmo NAT do campus, e cada rodada do simulador cria de 20 a 22 contas. Por isso o simulador **nunca roda na rede da aula**, e o console permite agendar um aumento temporário da cota.

### Supabase Realtime (descartado)

- O projeto grátis **pausa depois de 7 dias** de pouca atividade. Um seminário marcado com semanas de antecedência pede ping agendado ou restauração antes da aula.
- O cliente de tempo real **só usa WebSocket**, sem long-polling.
- O limite de **100 mensagens por segundo** conta cada entrega a cada cliente. Com 20 votos no mesmo segundo e 21 ouvintes, são 420 entregas, e passar do limite desconecta todos.
- Eventos ocorridos durante a queda **se perdem**.
- O Supabase só venceria se um relatório em SQL depois do seminário fosse requisito.

### Hospedagem: GitHub Pages (escolhida)

- É grátis, sem créditos e sem pausa, com HTTPS automático, e publica arrastando arquivos no navegador.
- Redireciona `/telao` para `/telao/`, o que protege os caminhos relativos (testado).
- **Exige repositório público** no plano grátis (aceito em D-002).
- **O cache é de 10 min.** O contorno:
  - `?v=N` em todo script e estilo;
  - `config.json` buscado com `no-store`;
  - faixa "atualize a página" quando a versão do celular não bate com a da sala;
  - publicar até a véspera.
- **Plano B:** Cloudflare Pages, arrastando a pasta, com cache 0 e repositório privado possível.
- **Descartadas:** Netlify (20 publicações por mês e pausa total quando os créditos acabam), Vercel Hobby (cláusula de uso não comercial e `/telao` sem a barra final) e Firebase Hosting (exige CLI e cache de 1 h).

**Por que sem framework, mesmo sendo tempo real:**
- quem faz a sincronização é o SDK do Firebase;
- são só duas telas, cada uma desenhada por uma função `desenhar(estado)`;
- um framework traria etapa de build, que quebra o offline por `file://`, e o pedido proíbe build.

---

## 3. Arquitetura

```
 CELULAR  /aluno/                                   TELÃO  /telao/   (o juiz; o apresentador controla daqui)
 aluno.js + aluno-logica.js                         telao.js + anfitriao.js + motor.js + roteiro.js + sorte.js
   escreve SÓ: membros/{uid}, presenca/{uid},         escreve: meta, conteudo, estado, pulso, sementes,
               votosEnquete/…/{uid}, decisoes/…/{uid}          resultados, enquetes, placar
        │                                                   │
        └──── canal-firebase.js ──►  Firebase RTDB  ◄── canal-firebase.js
                                     + firebase/regras.json  (as regras SÃO o servidor)

 OFFLINE e TESTES:     anfitriao.js ─► canal-local.js  (memória + localStorage; imita as travas das regras)
 SIMULADOR (Node):     20 × canal-firebase.js (SDK do npm) + aluno-logica.js  [+ anfitriao.js]
```

### Invariantes: as garantias que o desenho dá

- **I1. Um aparelho, um voto.** Um aparelho é um `uid`. O voto é gravado na chave do próprio `uid`, então reenviar sobrescreve e nunca duplica.
- **I2. Voto só com a etapa aberta.** Vale só se a etapa estiver em `votando` e dentro do prazo mais a graça, pelo relógio do servidor. Quem decide é a regra do banco, não o celular.
- **I3. Um só escritor do estado.** Só o anfitrião escreve o estado. Cada transição é uma transação que confere a `geracao` esperada (compare-and-swap), e a regra ainda exige `geracao + 1`. Uma trava do navegador (`navigator.locks`) garante uma única aba escritora por máquina.
- **I4. Apuração reproduzível.** O resultado é uma função pura do conteúdo, dos votos congelados e da semente gravada. O fechamento acontece em duas fases (seção 5), e nenhum voto que o servidor aceitou fica de fora.
- **I5. Relógio local só desenha.** Nenhum aparelho decide nada pelo próprio relógio; ele serve apenas para desenhar a contagem regressiva.
- **I6. Recarregar não perde nada.** A tela é função dos dados.
- **I7. Online e offline iguais.** Os dois passam pelo mesmo `anfitriao.js` e pelo mesmo `motor.js`, com o estado no mesmo formato.

### Interface do canal (a mesma nas duas implementações)

| Função | O que faz |
|---|---|
| `ler(caminho)` | lê do servidor uma vez |
| `ouvir(caminho, cb)` | acompanha um caminho e devolve a função que desliga |
| `gravar(mapa)` | update atômico de vários caminhos |
| `transacao(caminho, fn)` | compare-and-swap |
| `agora()` | hora do servidor, ou `Date.now()` no offline |
| `aoMudarConexao(cb)` | avisa quando a conexão cai ou volta |
| `entrar()` | login anônimo; devolve o `uid` |

### Por que scripts clássicos, e não módulos ES

Testei nesta máquina: no Chrome e no Edge, `type="module"`, `import()` e `fetch` falham quando a página é aberta por `file://`. Só scripts clássicos funcionam ali, e o offline por pendrive depende disso.

Por isso cada arquivo do núcleo é um script clássico embrulhado numa IIFE que termina em `globalThis.X = …`. O mesmo arquivo roda no navegador, por `file://` e no Node.

O SDK do Firebase é o único módulo. É carregado com `import()` dinâmico, apenas online, e com tempo-limite de 4 s.

---

## 4. Estrutura de arquivos

Cerca de 3.000 linhas de site e 700 de testes.

```
seminario-viracao/
├── index.html                 "Sou apresentador" → telao/   ·   "Sou aluno" → aluno/ (repassa ?sala=)
├── config.json                TODO o conteúdo: personas, equipes, rodadas, cartas, afirmações, tempos, roteiros
├── conexao.json               só as chaves públicas do Firebase (infraestrutura; ninguém edita no dia)
├── .nojekyll
├── css/  base.css · telao.css · aluno.css
├── telao/index.html           só <script src> clássicos, com ?v=N
├── aluno/index.html
├── js/
│   ├── nucleo/                sem DOM, sem rede, sem Date.now/Math.random direto (tudo injetado)
│   │   ├── validar-config.js  lista TODOS os problemas do config; normaliza listas em mapas por id
│   │   ├── sorte.js           gerador com semente (mulberry32), sorteio ponderado, chances efetivas
│   │   ├── motor.js           condições, efeitos, resolução da rodada, placar decomposto (enumeração exata)
│   │   ├── enquete.js         histograma, mediana, % discorda/neutro/concorda, matriz antes→depois
│   │   ├── roteiro.js         roteiro → passos; transições válidas; atraso acumulado
│   │   ├── anfitriao.js       o juiz: abrir, fechar em 2 fases, apurar, avançar, desfazer
│   │   └── aluno-logica.js    telaDoAluno(estado, membro, meusVotos…); voto pendente; sugerir equipe
│   ├── canal/
│   │   ├── canal-firebase.js  ÚNICO arquivo que conhece o Firebase; SDK injetado (CDN ou npm)
│   │   └── canal-local.js     mesma interface, em memória, com as travas das regras
│   ├── ui/  dom.js (nenhum innerHTML) · graficos.js (SVG à mão) · conexao.js · formatar.js (Intl, America/Sao_Paulo)
│   ├── telao.js               carrega config, escolhe o canal, desenha os estados, barra do apresentador, QR
│   └── aluno.js               entrar, votar, reenviar pendentes
├── vendor/qrcode.js           qrcode-generator 2.0.4 (MIT), cabeçalho preservado
├── firebase/regras.json       regras versionadas (colar no console)
├── bin/  simular-alunos.mjs · validar-config.mjs · versao.mjs · emulador.mjs · servir.mjs
├── test/*.test.mjs · test/fixtures/ · test/emulador/ · e2e/telao-offline.e2e.mjs · e2e/sessao-online.e2e.mjs
├── docs/  decisoes.md · arquitetura.md · contratos.md · roteiro-do-apresentador.md · como-editar-config.md · rascunho-conteudo.md
├── README.md                  publicação passo a passo, ensaio, pendrive
├── AGENTS.md · CLAUDE.md (só ponteiro)
├── package.json               type:module; check · test · e2e · simular · validar
├── eslint.config.mjs · .gitattributes (eol=lf) · .gitignore
```

---

## 5. Fluxo da sessão

O roteiro vem do config (`"60min"` e `"120min"`), e cada passo tem um **tempo-alvo**. A barra do apresentador mostra "passo 7 de 14 · +3 min de atraso", e o validador avisa se a soma dos tempos-alvo passar de 60 ou de 120 min.

**Ordem típica, com o jogo em paralelo (D-006):**

`lobby → enquete "antes" (opcional) → bloco → formarEquipes → personas → bloco → rodada r1 → bloco → rodada r2 → bloco → rodada r3 → placarFinal → bloco (debrief) → termômetro → enquete "depois" → comparativo → fim`

Os passos `bloco` são os trechos da apresentação. Durante eles, o apresentador
está nos slides (Alt+Tab) e o telão fica escondido.

| Passo | Telão | Celular | Sai por |
|---|---|---|---|
| **lobby** | QR grande, URL curta, código da sala e "17 conectados". Nada de jogo nem persona | Entra na sala. **Ainda sem equipe e sem persona** | Avançar |
| **enquete "antes"** (opcional) | "14 de 18 votaram" e cronômetro visual. **Sem gráfico** | Uma afirmação por vez, 5 botões rotulados, avança sozinho | Encerrar (o apresentador) |
| **bloco** (trecho da apresentação) | Tela de espera discreta: título do trecho, faixa de entrada se aberta, placar resumido | Antes das equipes: "acompanhe a apresentação". Depois: **situação da persona** (indicadores e a narrativa do último mês) | Avançar |
| **formar equipes** | O apresentador escolhe quantas equipes abrir (3 a 6). Mapa "equipe → canto da sala" | "Me coloque numa equipe" ou escolha manual; troca livre | Avançar (as equipes travam) |
| personas | As personas e os indicadores iniciais | A persona da equipe em detalhe | Avançar |
| **rodada · decidindo** | Situação e opções; por equipe, "2 de 3 decidiram" (sem revelar qual) | Situação, opções e a **contagem ao vivo da própria equipe** | O apresentador encerra, depois do **tempo mínimo de conversa** |
| rodada · fechando | "Apurando…" | "Votação encerrada" | Automático |
| rodada · sorteio | Barra de fatias por equipe; os ponteiros param **ao mesmo tempo** | "Sorteando…" | Avançar |
| rodada · resultado | Grade com as cartas das equipes; **só as 2 mais extremas animadas** | A carta da equipe explicada em 2 linhas | Avançar |
| placar final | Decomposição: piloto automático, efeito das decisões e sorte; a tecla C troca o critério | Resumo da equipe | Avançar |
| termômetro | Uma afirmação por vez, gráfico **ao vivo** | Vota | Avançar |
| **enquete "depois"** | "14 de 18 votaram" | Igual ao "antes" | Encerrar |
| **comparativo** | **Uma afirmação por tela**, só com os pareados, e "mais 3 responderam só uma vez" | "Você antes: 4, agora: 2", visível só para o aluno | Avançar |
| fim | Placar e comparativo; "Exportar agregados e apagar a sala" | "Obrigado" | — |

**Fechamento em duas fases** (o red team mostrou que o fechamento direto perdia votos):
1. O telão grava `subfase: "fechando"`, e a regra passa a recusar votos novos.
2. Espera a confirmação dessa escrita.
3. Grava a semente da rodada em `sementes/{r}`, uma vez só.
4. Lê os votos **do servidor** com `ler()`.
5. Apura e grava `apurada` ou `sorteio` com resultados e placar, num único update.

O simulador confere que o número de votos confirmados é igual ao de votos contados.

**Barra do apresentador:**
- **Avançar:** Espaço, → e PageDown do passador.
- **Encerrar votação:** Enter. **+30 s. Pausar/retomar:** P.
- **Pular para…, Decidir por esta equipe e Mover aluno** (pelo crachá do celular, por exemplo "Laranja · K7Q").
- **Remover inativos** (seção 10), sem tecla de atalho.
- **Abrir/fechar entrada. Rede restrita:** gera um QR com `?lp=1`, que força long-polling.
- **Salvar estado (JSON). Tela cheia:** F.
- **Linhas de informação:** passo e atraso, nome do passo, "estado salvo às 14:05 (r1)", "18 ativos / 21 membros" (só com celulares) e o selo de conexão. O salvamento automático do fim de rodada fica só aqui: um aviso na tela cobriria o sorteio projetado.

**Proteções da barra:**
- ← e PageUp não fazem nada, porque o passador de slides manda essas teclas no "voltar".
- **Desfazer:** Ctrl+Z, com confirmação.
- **Ações sem volta** ("Continuar sem celulares", "Encerrar", "Apagar a sala", "Remover inativos"): segurar o botão por 2 s.
- **Confirmações** (encerrar antes do tempo mínimo de conversa, desfazer, encerrar a enquete offline com afirmação sem contagem, a primeira contagem à mão por cima de votos de celular): abrem com o foco em "Cancelar". Confirmar pede Tab e Enter, ou um clique: a tecla repetida, ou o Enter impaciente, só cancela.
- **Foco:** todo botão perde o foco depois do clique, para o Espaço não acionar o botão errado.
- **Trava:** Avançar fica travado por 1,5 s depois de cada uso.
- **Enquete offline no modo `todas`:** o Espaço passa para a próxima afirmação da contagem à mão (na última, avisa que o Enter encerra a enquete inteira).

---

## 6. Modelo de dados e regras

```
privado/pinApresentador               PIN (≥ 10 caracteres) gravado à mão no console, uma vez. Ninguém lê.
pedidosAnfitriao/{uid}             PIN digitado no telão (string de 8 a 32 caracteres); ninguém lê
regrasVersao/{uid}                 só aceita "v3" → prova que as regras publicadas são as desta versão
autoteste/{uid}                    .write false → se a escrita PASSAR, as regras estão abertas: o telão bloqueia

salas/{SALA}                       SALA = 4 caracteres de A-H J-N P-Z 2-9 (sem 0/O/1/I)
  meta:      { hostUid, criadaEm, expiraEm (≤ 12 h), versaoApp, hashConfig, roteiro, entradaAberta }
  conteudo:  config normalizado e congelado na criação (celular e telão nunca divergem por cache)
  estado:    { geracao, tipo, subfase, indice, rodada, enquete, momento, afirmacao,
               abertoEm, prazo, restanteMs, equipesTravadas, forcadas: {e3:"b"} }
  pulso:     hora do servidor, gravada pelo telão a cada 10 s (nó próprio)
  membros/{uid}:    { entrouEm (= now), equipe? }           a equipe só aparece no passo "formar equipes"
  presenca/{uid}:   hora do servidor (= now), a cada 20 s; onDisconnect apaga
  votosEnquete/{enquete}/{momento}/{afirmacao}/{uid}: 1..5
  decisoes/{rodada}/{equipe}/{uid}: "b"
  sementes/{rodada}:  número; gravada 1 vez e NUNCA apagada (nem pelo desfazer)
  prorrogacoes/{rodada}: true; gravada junto com a prorrogação, 1 vez, e NUNCA apagada:
                      refazer a rodada não abre outra prorrogação (D-035)
  enquetes/{enquete}/{momento}: { histogramas, n, metodo: "celular"|"manual", transicao (matriz 5×5), apuradaEm }
  resultados/{rodada}/{equipe}: { decisao, origem: maioria|prorrogacao|moeda|piloto|apresentador,
                                  contagem, chances, carta, delta, depois }
  placar/{equipe}:  { renda, energia, protecao, piloto, efeitoDecisoes, sorte, piorCaso, ativa }
```

### Quem lê e quem escreve

| Nó | Aluno lê | Aluno escreve | Telão (anfitrião) |
|---|---|---|---|
| meta, conteudo, estado, pulso, resultados, placar, enquetes | sim | não | escreve |
| membros | sim (só entrada e equipe; nenhum dado pessoal) | o próprio; escolhe a equipe só antes de `equipesTravadas` | move, distribui atrasados, remove inativos |
| presenca | não | o próprio (valor = `now`) | lê |
| votosEnquete | só o próprio | o próprio, com a etapa aberta, inteiro de 1 a 5 | lê tudo |
| decisoes/{r}/{equipe} | **só a da própria equipe** | o próprio, com a etapa aberta, em opção existente, e só se entrou **antes** da abertura da etapa | lê tudo |
| sementes, prorrogacoes | não | não | grava uma vez; nunca apaga |
| salas/{SALA} inteira | não | não | lê tudo; **pode apagar a sala inteira** (e só apagar) |

### O PIN do apresentador substitui o código de retomada da síntese

O red team achou um furo na retomada da síntese: a comparação `null === null` deixava qualquer aluno tomar o telão. Com o PIN do apresentador, **um segredo só** resolve três coisas:
- **Criar sala:** qualquer conta anônima podia criar sala e encher o banco. Agora só quem tem o PIN cria.
- **Retomar a sala em outra máquina** se o notebook travar: basta digitar o PIN no telão novo.
- **Limpar salas antigas** pelo próprio telão.

O PIN é digitado uma vez, no notebook, **antes de projetar**, num campo de senha. A regra exige que o PIN exista, o que fecha o `null === null`.

**Telão que perdeu a sala fica passivo.** Quando outra máquina assume com o PIN, o telão antigo descobre pelo pulso recusado, ou ao voltar à vista, quando confere o `meta/hostUid`. A partir daí ele só acompanha: não manda pulso nem comando, e também não oferece "Continuar sem celulares" nem "Salvar estado", que sairiam de um espelho congelado. Sem isso, as duas máquinas tomariam a sala uma da outra a cada volta à vista (invariante I3). Para voltar a comandar por ele, é preciso recarregar e retomar com o PIN. O pedido em `pedidosAnfitriao/{uid}` é apagado logo depois de criar ou assumir: deixado lá, daria àquele navegador um PIN_OK permanente.

### Esboço das regras

Abreviações:
- `S = root.child('salas/'+$s)`, `E = S.child('estado')`
- `HOST = S.child('meta/hostUid').val() === auth.uid`
- `PIN_OK = root.child('privado/pinApresentador').exists() && root.child('pedidosAnfitriao/'+auth.uid).val() === root.child('privado/pinApresentador').val()`
- `ABERTO = now <= E.child('prazo').val() + S.child('conteudo/tempos/gracaSeg').val()*1000`

No arquivo real as expressões ficam por extenso, porque as regras não têm variáveis.

```
salas/$s          .read: HOST      .write: HOST && !newData.exists()     ← só apagar tudo (o PIN serve para assumir, e aí vale o HOST)
  meta            .read: auth != null
                  .write: (!data.exists() && PIN_OK && newData.child('hostUid').val() === auth.uid) || HOST
    hostUid       .write: PIN_OK && newData.val() === auth.uid                                   ← retomada
    $outro        .validate: false
  estado          .read: auth != null   .write: HOST
                  .validate: geracao nova === geracao antiga + 1  (ou === 1 na criação);  $outro: false
  pulso           .write: HOST   .validate: newData.val() === now
  membros         .read: auth != null
    $uid          .write: auth.uid === $uid && meta.entradaAberta && now < meta.expiraEm   (ou HOST)
      entrouEm    .validate: newData.val() === now
      equipe      .write: auth.uid === $uid && E.child('equipesTravadas').val() !== true   (ou HOST)
                  .validate: formato e[0-9]{1,2} && conteudo/equipes/{valor} existe
      $outro      .validate: false
  presenca/$uid   .read: HOST   .write: auth.uid === $uid && membros/$uid existe   .validate: newData.val() === now
  votosEnquete/$e/$m/$a/$uid
                  .read: auth.uid === $uid || HOST
                  .write: auth.uid === $uid && membros/$uid existe && E.tipo === 'enquete'
                          && E.enquete === $e && E.momento === $m && E.subfase === 'votando' && ABERTO
                  .validate: inteiro de 1 a 5 && a afirmação $a existe no conteudo
  decisoes/$r/$eq .read: membros/{auth.uid}/equipe === $eq || HOST
    $uid          .write: auth.uid === $uid && membros/$uid/equipe === $eq && E.rodada === $r
                          && (E.subfase === 'decidindo' || (E.subfase === 'prorrogacao' && a equipe está em E.empatadas))
                          && membros/$uid/entrouEm <= E.abertoEm && ABERTO
                  .validate: formato [a-z0-9_]{1,24} && a opção existe em conteudo/rodadas/$r/opcoes
                             && (na prorrogação, só opção de E.empatadas/$eq)
  sementes/$r     .read: HOST   .write: HOST && !data.exists()   .validate: newData.isNumber()
  prorrogacoes/$r .read: HOST   .write: HOST && !data.exists()   .validate: newData.val() === true
  resultados/$r, enquetes/$e/$m   .read: auth != null   .write: HOST && (!data.exists() || !newData.exists())
  placar          .read: auth != null   .write: HOST
pedidosAnfitriao/$uid  .write: auth.uid === $uid   .validate: string de 8 a 32 caracteres
regrasVersao/$uid      .write: auth.uid === $uid   .validate: newData.val() === 'v3'
autoteste/$uid         .write: false
privado                .read: false   .write: false
```

**Limites declarados das regras:**
- **Não existe `numChildren`.** O teto de membros por equipe fica no cliente, e o apresentador move quem precisar.
- **`.validate` não roda quando o dado é apagado.** A gravação única é tratada no `.write`.
- **O regex vem antes do `exists()`.** Um id com `.`, `#` ou `$` nunca chega a montar o caminho.

**Autoteste ao abrir o telão:**
- grava em `autoteste/{uid}` (**tem de falhar**);
- grava `"v3"` (a versão atual das regras) em `regrasVersao/{uid}` (**tem de passar**).

Se qualquer um dos dois der errado, o telão mostra "REGRAS ABERTAS ou DESATUALIZADAS: não use" e não cria a sala. O teste **nunca** escreve na sala real.

---

## 7. config.json

### Linguagem de efeitos fechada

Nenhuma carta ou persona exige código próprio.

- **Condição `se`:** as chaves possíveis são `opcao`, `persona`, `equipe` e `rodada` (um id ou uma lista), mais `indicador: { id: { abaixoDe | acimaDe: n } }`. Todas precisam valer ao mesmo tempo. **Qualquer outra chave é erro de validação.**
- **Efeito:** `{ se?, soma?: {indicador: n}, multiplica?: {indicador: f}, rotulo? }`, com `soma` **ou** `multiplica`, nunca os dois.
- **Ordem fixa de aplicação:**
  1. `persona.todoMes`
  2. `rodada.efeitosGerais`
  3. opção decidida
  4. carta
- **Semântica:**
  - `soma` adiciona ao delta do mês, e `multiplica` multiplica esse delta;
  - toda condição lê o estado **antes** da rodada;
  - no fim, o estado recebe o delta e é preso entre `min` e `max`.
- **Carta:**
  - `peso` inteiro, maior ou igual a 0;
  - `rodadas` e `somenteSe`, opcionais;
  - `ajustesDePeso: [{ se, soma | multiplica }]`, para a decisão mudar o tamanho das fatias;
  - `tom: "grave"`, que desliga a animação e o som;
  - a chance efetiva é o peso ajustado dividido pela soma das cartas elegíveis, **para aquela equipe naquela rodada**.

### Exemplo encurtado

O real terá 6 equipes sobre 5 personas, 3 rodadas, cerca de 8 cartas e os roteiros de 60 e 120 min. **Todos os valores em R$ são ilustrativos:** os reais saem do rascunho de conteúdo com fonte, validado com o Kleberson (D-005).

**Campos de texto para o celular** (todos opcionais), que alimentam a narrativa em primeira pessoa mostrada nos `bloco`:
- `narrativa` na opção: "Rodei 12 horas por dia.";
- `narrativa` na carta: "Um carro me fechou na Ipiranga…";
- `fonte` em qualquer valor, persona, carta ou referência: um texto curto que aparece em `docs/como-editar-config.md` e **nunca** no telão.

**`referencias`** (opcional): as linhas de comparação do placar final, por exemplo `{ "id": "clt", "nome": "A mesma pessoa com carteira assinada", "renda": 0, "fonte": "…" }`.

```json
{
  "versao": "2026-09-25a",
  "titulo": "Viração: quem é o patrão?",
  "tempos": { "enqueteSeg": 60, "decisaoSeg": 90, "decisaoMinSeg": 45, "prorrogacaoSeg": 20, "gracaSeg": 5 },
  "regras": { "desempate": "prorrogacao-depois-moeda", "cartaPor": "equipe", "mostrarChances": "no_sorteio",
              "placarPadrao": "efeitoDecisoes", "alvoPorEquipe": 3, "minPareados": 5, "destacarCartas": 2 },
  "escala": { "curtos": ["Discordo muito","Discordo","Neutro","Concordo","Concordo muito"],
              "longos": ["Discordo totalmente","Discordo","Nem concordo nem discordo","Concordo","Concordo totalmente"] },
  "indicadores": [
    { "id": "renda",    "nome": "Renda acumulada", "formato": "moeda",   "inicial": 0, "min": -10000, "max": 100000 },
    { "id": "energia",  "nome": "Energia",         "formato": "inteiro", "inicial": 8, "min": 0, "max": 10 },
    { "id": "protecao", "nome": "Proteção",        "formato": "inteiro", "inicial": 0, "min": 0, "max": 10 }
  ],
  "personas": [
    { "id": "motoboy", "nome": "Rafa", "descricao": "Motoboy, moto financiada, dois apps",
      "todoMes": [ { "soma": { "renda": 2300 }, "rotulo": "entregas menos parcela e gasolina" } ] }
  ],
  "equipes": [
    { "id": "e1", "nome": "Laranja", "cor": "#E69F00", "forma": "circulo", "persona": "motoboy", "obrigatoria": true }
  ],
  "rodadas": [
    { "id": "r1", "titulo": "Mês 1: quanto trabalhar?", "texto": "Quem fica mais tempo online recebe pedidos melhores.",
      "padrao": "c",
      "opcoes": {
        "a": { "rotulo": "12 horas por dia", "efeitos": [ { "multiplica": { "renda": 1.5 } }, { "soma": { "energia": -4 } } ] },
        "b": { "rotulo": "8 horas e pagar o MEI", "efeitos": [ { "soma": { "renda": -80, "protecao": 3 }, "rotulo": "DAS do MEI" } ] },
        "c": { "rotulo": "8 horas, sem pagar nada", "efeitos": [] } } }
  ],
  "cartas": [
    { "id": "normal",   "titulo": "Mês sem surpresas", "peso": 50, "efeitos": [] },
    { "id": "acidente", "titulo": "Acidente: 20 dias parado", "peso": 6, "rodadas": ["r2","r3"], "tom": "grave",
      "ajustesDePeso": [ { "se": { "opcao": "a" }, "soma": 14 } ],
      "efeitos": [ { "multiplica": { "renda": 0.3 } },
                   { "se": { "indicador": { "protecao": { "acimaDe": 2 } } }, "soma": { "renda": 1500 }, "rotulo": "auxílio do INSS" } ] }
  ],
  "enquetes": [
    { "id": "entrada", "titulo": "Termômetro de entrada", "pareada": true, "revelar": "so_no_comparativo",
      "afirmacoes": [ { "id": "a1", "texto": "Quem trabalha por aplicativo é empreendedor." } ] },
    { "id": "termometro", "titulo": "Termômetro", "pareada": false, "revelar": "ao_vivo",
      "afirmacoes": [ { "id": "t1", "texto": "O aplicativo é o patrão." } ] }
  ],
  "referencias": [],
  "roteiros": {
    "60min": [
      { "tipo": "lobby", "alvoSeg": 180 },
      { "tipo": "enquete", "enquete": "entrada", "momento": "antes", "alvoSeg": 120, "opcional": true },
      { "tipo": "bloco", "titulo": "Gancho e mapa do seminário", "alvoSeg": 480 },
      { "tipo": "formarEquipes", "alvoSeg": 150 },
      { "tipo": "personas", "alvoSeg": 120 },
      { "tipo": "bloco", "titulo": "Quem é o trabalhador de plataforma", "alvoSeg": 360 },
      { "tipo": "rodada", "rodada": "r1", "alvoSeg": 240 },
      { "tipo": "bloco", "titulo": "Gestão por algoritmo", "alvoSeg": 480 },
      { "tipo": "rodada", "rodada": "r2", "alvoSeg": 240 },
      { "tipo": "bloco", "titulo": "Empreendedorismo ou viração?", "alvoSeg": 480 },
      { "tipo": "rodada", "rodada": "r3", "alvoSeg": 240 },
      { "tipo": "placarFinal", "alvoSeg": 120 },
      { "tipo": "bloco", "titulo": "Debrief e contraponto", "alvoSeg": 480 },
      { "tipo": "enquete", "enquete": "termometro", "momento": "unico", "alvoSeg": 300 },
      { "tipo": "enquete", "enquete": "entrada", "momento": "depois", "alvoSeg": 90 },
      { "tipo": "comparativo", "enquete": "entrada", "alvoSeg": 150 },
      { "tipo": "fim" } ]
  }
}
```

Os títulos dos `bloco` são provisórios: os slides ainda não existem. Os tipos de
passo possíveis são `lobby`, `enquete`, `bloco`, `formarEquipes`, `personas`,
`rodada`, `placarFinal`, `comparativo` e `fim`. Qualquer outro é erro de
validação.

### O validador

`validarConfig` é uma função pura. O telão se recusa a criar a sala e mostra a lista inteira de problemas. Ele confere:
- ids únicos e referências válidas;
- pesos inteiros maiores ou iguais a 0, e pelo menos uma carta possível para cada combinação de persona, opção e rodada;
- chaves fora do conjunto fechado (pega `"soma "` com espaço) e `soma` com `multiplica` no mesmo efeito;
- números finitos e `inicial` dentro de `min` e `max`;
- cores e formas distintas entre as equipes, no máximo 6 equipes, e 5 rótulos na escala;
- afirmação com mais de 110 caracteres (aviso);
- BOM, que é removido e avisado, e `Ã©` ou `â€`, sinais de acento corrompido pelo PowerShell 5.1.

**Conferências de equilíbrio do jogo** (`bin/validar-config.mjs`):
- tabela de chances por persona, decisão e rodada;
- valor esperado e pior caso de cada opção;
- aviso de **opção dominante** (vence em todos os indicadores);
- aviso de `padrao` que é a opção de maior renda, porque premiaria quem não votou;
- **fração da variância da renda explicada pelas decisões e pelas cartas**, com uma faixa-alvo (por exemplo, decisões entre 30% e 60%);
- aviso de indicador que chega ao mínimo sem consequência.

---

## 8. Mecânica mínima do Jogo da Viração

**Ideia central, que vira a imagem do sorteio:** a decisão muda o tamanho das fatias, e a sorte escolhe a fatia. Decide-se antes de saber, como na vida.

**Indicadores:** renda acumulada, energia (0 a 10) e proteção (0 a 10). Os valores iniciais vêm da persona.

**Três meses**, ligados ao bloco "Caminhos" da trilha:
1. **Quanto trabalhar:** renda × energia × proteção individual.
2. **O app muda a regra:** gestão algorítmica.
3. **E agora:** reserva, dívida ou organização coletiva.

**Como a equipe chega a uma decisão:**
- Cada membro vota e pode mudar até o fechamento, vendo ao vivo a contagem da própria equipe, sem nomes.
- Vale a opção mais votada.
- **Empate:** prorrogação de 20 s só para aquela equipe ("empate: conversem"). Se continuar empatado, moeda com a semente gravada. Há uma prorrogação só por rodada, mesmo depois do desfazer (D-035): a marca `prorrogacoes/{r}` (seção 6) manda todo empate seguinte direto para a moeda.
- **Ninguém votou:** vale o `padrao`, com o rótulo "piloto automático: o app decidiu por vocês".
- **O apresentador pode decidir por uma equipe** (quem está sem celular), com `origem: "apresentador"`.
- **Não fecha sozinho quando todos tocaram.** Depois do tempo mínimo de conversa, o telão avisa "todas as equipes decidiram. Enter encerra".

**Formação das equipes:**
- O apresentador escolhe quantas abrir, de 3 a 6.
- O "me coloque" completa cada equipe até `alvoPorEquipe`, na ordem de prioridade do config, antes de abrir a próxima.
- Uma equipe `obrigatoria` nunca some: sem membros, joga no piloto ou com a decisão do apresentador.
- Quem chega depois da trava é distribuído pelo telão na equipe com menos membros ativos.

**Carta:** uma por equipe por padrão, com reposição, sorteada a partir de uma semente de `crypto.getRandomValues` gravada em `sementes/{r}`.

**Placar:** sem nota única com pesos escondidos. A renda de cada equipe é decomposta em três parcelas exatas, calculadas por enumeração (8 cartas em 3 rodadas dão 512 caminhos por equipe):
- **piloto automático:** o esperado se a equipe tivesse ficado no `padrao`;
- **efeito das decisões:** o esperado com as decisões tomadas, menos o piloto;
- **sorte:** o realizado, menos o esperado com as decisões tomadas.

Aparece como barra empilhada por equipe, e a tecla C reordena pelo critério escolhido. Também são mostrados o pior caso, a energia e a proteção. "Quem ganhou depende do que se conta."

**Tema sensível:**
- nenhuma comemoração, som ou cor de vitória em carta negativa;
- carta `tom: "grave"` aparece só com o texto da consequência real;
- o interruptor "sem vencedor" pode ser acionado a qualquer momento.

---

## 9. Enquetes antes e depois

- **No celular, sempre uma afirmação por vez**, com "1 de 3" e avanço automático, e o aluno pode voltar para mudar. Os rótulos curtos vão nos botões e a legenda longa, no telão.
- **O "antes" vem antes de qualquer encenação**, e antes de o aluno ter equipe ou persona. Assim ele não chega ancorado na persona.
- **Revelação:**
  - na enquete pareada (antes e depois), **só no comparativo**, para não mostrar a norma do grupo antes do debate;
  - no Termômetro, **ao vivo**.
- **Agregação por afirmação:**
  - contagem de 1 a 5 e o n;
  - % que discorda (1–2), neutra (3) e concorda (4–5);
  - mediana em destaque e média em letra pequena, porque a escala é ordinal;
  - com n = 0, "sem votos", nunca zero.
- **Comparativo:**
  - por padrão, só os **pareados** (o mesmo aparelho nas duas vezes), com "mais N responderam só uma vez";
  - a frase "Dos 16 que responderam as duas vezes: 7 foram para mais concordância, 6 ficaram, 3 foram para menos";
  - com menos de `minPareados` pares, só as duas distribuições, com o título "turmas diferentes".
- **Métodos nunca se misturam.** Se o "depois" for por mão levantada (modo offline), o comparativo não desenha antes × depois, só as duas distribuições lado a lado, com um aviso.
- **O que se pode dizer com n ≤ 20:** retrato desta turma neste dia e a direção do movimento, contada em pessoas. O rodapé fixo "retrato desta turma, não pesquisa" lembra o que não se pode dizer: causalidade, representatividade, diferenças de 1 ou 2 votos e valor-p.
- **Privacidade:**
  - a tela de voto diz "ninguém, nem o apresentador, vê o seu voto; só os totais";
  - a exportação leva **só agregados**: histogramas, matriz de transição e placar;
  - apagar a sala remove os votos individuais;
  - nunca há quebra da enquete por equipe.

---

## 10. Reconexão automática

**Identidade do aparelho:** o `uid` do login anônimo, guardado pelo SDK no IndexedDB. O aluno não vê login nenhum. O celular mostra um **crachá** curto e não pessoal (por exemplo "Laranja · K7Q"), que o apresentador usa para mover alguém de equipe.

**Queda do próprio celular** (detector separado do pulso do telão, como pediu o red team):
- **Sinais:** `/.info/connected` falso por mais de 5 s com a página visível, ou uma escrita-sonda em `presenca` que não confirma em 5 s.
- **Reação:** `goOffline()` e depois `goOnline()`, o que reinicia o recuo do SDK. Repete a cada 10 s enquanto estiver fora.
- **Ao voltar a página** (`visibilitychange`, `pageshow`, `online`): repete o mesmo ciclo, relê o estado e pede o Wake Lock de novo. Isso derruba a conexão "zumbi" do iOS.
- **Pulso velho do telão** só mostra "aguardando o telão". Nunca força a reconexão do celular, senão um telão estrangulado viraria uma tempestade de reconexões.

**Voto em trânsito:**
1. Antes de enviar, o voto vai para o `localStorage` como pendente.
2. **"Registrado" só aparece quando o servidor confirma.**
3. **Sem confirmação em 5 s:** "enviando…" e um ciclo de reconexão.
4. **Em 20 s:** "guardado; será reenviado".
5. **Recusa da regra:** "a votação fechou antes do seu voto chegar". O app nunca finge que contou.

**Depois de recarregar:** o `uid` é o mesmo e a sala vem da URL ou do `localStorage`. Os ouvintes da equipe só são ligados **depois** de o registro de membro ser confirmado, e religados se o apresentador mover o aluno. Um pendente cuja etapa continua aberta é reenviado; como a chave é a mesma, não duplica.

**Navegador embutido** (Instagram/Facebook): detectado **na tela de entrada**, que bloqueia o "Entrar" até o aluno abrir no navegador padrão. Isso evita o membro fantasma.

**Membros ativos:** presença nos últimos 60 s. O "todos votaram" e o teto por equipe contam só os ativos. O telão mostra "18 ativos / 21 membros" e tem o botão "remover inativos".
- A linha fica discreta no lobby e na barra, só com números: nem uid nem crachá na tela projetada.
- A presença envelhece sem nenhum aviso do banco. O timer que redesenha o cronômetro também confere a contagem e redesenha quando ela muda; sem isso, a linha e o "n de m votaram" ficariam com o número velho.
- "Remover inativos" apaga o registro de quem está sem presença há **mais de 2 min**, o dobro da janela de ativo: quem só trocou de rede ou deixou a tela apagar por um minuto não perde a equipe. Pede para segurar 2 s e não tem tecla de atalho. O celular removido que volta é registrado de novo sozinho (com a entrada aberta), mas sem voto na decisão já aberta.

**Telão sem rede:** com o selo em "reconectando" por queda de verdade, os comandos do telão são recusados na hora, com aviso, e nunca enfileirados. Enfileirado, o comando ficava preso na escrita do SDK, que não termina sem rede, e travava a fila inteira; quando a rede voltava, os presos eram aplicados em rajada. Um comando que não termina em 10 s libera a fila, com um aviso de que ele ainda pode chegar. "Continuar sem celulares" e "Salvar estado" não passam pela fila.

**CDN do Firebase inacessível:** o navegador guarda a falha do `import()` de um endereço para a página inteira, e repetir o `import()` falha na hora, mesmo com a CDN de volta. Por isso o "Tentar de novo" do telão recarrega a página (o PIN é digitado de novo). O celular, quando o `import()` falha por rede (e não pelo tempo-limite de 4 s, em que ele ainda pode chegar), recarrega sozinho, com a sala na URL, no máximo uma vez a cada 15 s.

**Rede restrita:** a tecla no telão gera um QR com `?lp=1`, que força o long-polling, e o celular guarda essa escolha. O telão também sugere o modo quando a própria primeira conexão passa de 8 s.

---

## 11. Modo offline do telão

**Como abre:**
1. **Queda no meio da aula:** "Continuar sem celulares" (segurar 2 s) segue a partir do espelho local, que o telão mantém o tempo todo no mesmo formato do banco. O telão chama `goOffline()` e não volta: o caminho é só de ida.
2. **Sem internet desde o início:** duplo clique em `telao/index.html` na pasta do pendrive. O botão "Começar sem celulares" aparece desde a primeira pintura. O modo offline é sempre **escolha explícita**, nunca dedução de falha. Como o `fetch` falha por `file://`, o telão pede "Carregar config.json" por seletor de arquivo ou arrastando o arquivo; os dois caminhos foram testados nesta máquina.

**Como os dados entram:**
- **Enquete:** 5 contadores, para mãos levantadas ou os cartões coloridos da trilha. As teclas 1 a 5 somam e Shift mais a tecla desconta.
- **Rodada:** o apresentador clica na opção de cada equipe.

**Seguro contra "travou e caiu a internet":**
- "Salvar estado (JSON)" fica sempre na barra, e um download automático acontece ao fim de cada rodada (aceito em D-015). O automático não avisa na tela, só na barra ("estado salvo às …"), porque acontece ao abrir o sorteio.
- O modo offline tem "Carregar estado", porque o pendrive por `file://` é outra origem e não enxerga o `localStorage` do site.
- O telão mostra o hash do config em uso, para comparar com o do pendrive.

**Sem service worker:** ele prenderia código velho no cache, falha em aba anônima e não cobre nenhum caso que os dois caminhos acima não cubram.

---

## 12. Simulador de 20 alunos

`node bin/simular-alunos.mjs [--sala K7Q2 | --com-anfitriao | --memoria] [--alunos 20] [--rajada] [--quedas] [--recargas] [--atacar] [--derrubar-telao]`

**Como cada robô funciona:**
- é um app Firebase separado, com a própria conexão e o próprio login anônimo;
- usa o **mesmo** `canal-firebase.js` e o **mesmo** `aluno-logica.js` do celular;
- votos com perfis diferentes (antes com tendência a 4, depois a 2) e esperas de 1 a 40 s;
- de propósito, um robô nunca vota, uma equipe fica vazia e um robô abandona o `uid` e volta com outro.

**Modos:**
- `--sala`: ensaio visual com o telão de verdade.
- `--com-anfitriao`: o simulador também faz o papel do telão; é o teste de ponta a ponta com os **tempos reais**, cronometrando a aula.
- `--memoria`: sem rede; entra no `npm test`.

**Perturbações:**
- `--rajada`: 20 votos no último segundo.
- `--quedas`: 15% dos robôs caem de 5 a 40 s.
- `--recargas`: 10% recriam o app do zero.
- `--derrubar-telao`: o anfitrião cai no meio da decisão, e outra instância assume com o PIN.

**`--atacar`:** cada ataque **tem de ser recusado**:
- votar 0, 6, 2,5 ou `"5"` como texto;
- votar em nome de outro `uid` ou de outra equipe;
- votar fora da janela;
- entrar numa decisão já aberta;
- trocar de equipe depois da trava;
- escrever no estado, nos resultados ou na semente;
- criar sala sem PIN;
- tomar o anfitrião sem PIN;
- gravar lixo grande em `presenca` ou `pedidosAnfitriao`;
- forjar `entrouEm`;
- ler votos alheios ou a decisão de outra equipe.

**Relatório:**
- tabela `passo | enviados | confirmados | contados | ok`;
- escritas recusadas por motivo: 100% nos ataques, 0% nas legítimas;
- p50 e p95 da confirmação e da reconexão;
- o placar recalculado pelo motor tem de ser igual ao gravado;
- qualquer violação encerra o script com código diferente de zero.

**O que o simulador não prova:** a suspensão de página do iOS, a rede do campus e a legibilidade no projetor. Isso fica para o ensaio com 3 celulares reais.

**Limite:** de 20 a 22 contas anônimas por execução. Com o limite de 100 por hora por IP, são **no máximo 4 execuções por hora**. **Nunca rodar na rede da aula nem no dia da aula.**

---

## 13. Testes

Todos com `node --test`, sem framework.

| Arquivo | O que prova |
|---|---|
| `motor.test.mjs` | ordem fixa dos efeitos; `soma` e `multiplica`; condições lendo o estado anterior; limites de min e max; teste de referência com config, decisões e semente fixos; decomposição exata do placar, conferida com 10.000 simulações |
| `sorte.test.mjs` | mesma semente, mesma carta; 100 mil sorteios a ±1 ponto percentual; peso 0 nunca sai; `rodadas`, `somenteSe`, `ajustesDePeso` |
| `anfitriao.test.mjs` | sessão inteira sobre `canal-local`; fechamento em 2 fases; empate com prorrogação e depois moeda; piloto; decisão do apresentador; o desfazer mantém a semente; troca de online para offline; igualdade entre os dois modos |
| `enquete.test.mjs` | histograma; mediana com n par e ímpar; n = 0; matriz de transição; recusa de misturar métodos |
| `roteiro.test.mjs` | transições válidas; `geracao + 1`; atraso acumulado; soma dos tempos-alvo |
| `aluno-logica.test.mjs` | a tela certa para cada estado; pendente reenviado só com a etapa aberta; sugestão de equipe |
| `validar-config.test.mjs` | o config real passa; cada fixture quebrada gera a mensagem certa (validação por mutação) |
| `propriedades.test.mjs` | 1.000 partidas com o config real: indicadores dentro dos limites, chances somando 1, nenhuma exceção |
| `regras.test.mjs` | conferência estática do `regras.json`: nenhum `.write` em `salas/$s` além de apagar tudo; `$outro: false`; toda folha exige `auth` |
| conferências por grep | nenhum `innerHTML`; `Date.now` e `Math.random` fora de `nucleo/`; toda classe do CSS escrita por algum JS; `?v=` igual a `versaoApp` |
| `e2e/telao-offline.e2e.mjs` | Playwright (`devDependency`, com o Chrome ou o Edge instalados via `channel`): sessão inteira pelo teclado, por `file://`; nada abaixo de 28 px e nenhuma rolagem em 1024×768 e 1920×1080 |
| `test/emulador/*.test.mjs` (`npm run emulador`) | Contra o emulador do Firebase (projeto `demo-seminario`, JDK 21): regras de verdade, `canal-firebase`, fechamento em duas fases e o simulador com 20 robôs mais `--atacar` |
| `e2e/sessao-online.e2e.mjs` (`npm run e2e:online`) | Telão e 3 celulares contra o emulador, mais um quarto que entra e some (ativos e inativos). Nunca fala com o projeto real: o bloco "sem serviço" recebe um `conexao.json` falso |

`npm run check` roda o validador, o ESLint, os greps e os testes sem rede, antes de cada commit. `npm run emulador` roda os testes contra as regras reais, localmente, sem gastar a cota de contas anônimas do projeto real. O `--atacar` contra o projeto real fica para a véspera. Autorizado em 28/09 (D-036): no dia 29/09, depois da publicação, um ensaio curto contra o projeto real, com 5 alunos simulados, numa sala de teste apagada no fim e fora da rede do campus.

---

## 14. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Rede do campus bloqueia WebSocket ou tem portal de login | M | A | Long-polling automático; QR com "rede restrita"; faixa "use o 4G"; ensaio no local; offline |
| R2 | Internet cai de vez no meio da aula | B | A | "Continuar sem celulares"; salvar estado; pendrive |
| R3 | Cota de 100 contas anônimas por hora por IP esgotada (pelo simulador, ou por abuso de um aluno na mesma rede) | M | A | Simulador fora do campus e nunca no dia; aumento temporário agendado no console; mensagem clara em `too-many-requests` |
| R4 | iOS deixa a conexão "zumbi" ao bloquear a tela | A | M | Ciclo de reconexão ao voltar a página; sonda; pendente guardado; Wake Lock |
| R5 | Aba do telão escondida atrás dos slides (o Chrome limita os timers a 1 por minuto depois de 5 min) | A | M | Prazo cortado pela regra; o celular não depende do pulso; telão em janela própria no projetor; "sempre manter ativo" no Chrome |
| R6 | Notebook do telão trava ou é trocado | B | A | Estado no banco; retomada com o PIN em outra máquina; estado salvo em JSON |
| R7 | Duas abas de telão, ou escrita atrasada depois de reconectar | M | M | Transação (CAS) na `geracao`; trava do navegador; gravação única |
| R8 | Regras não publicadas, em modo de teste ou desatualizadas | M | A | Autoteste com canário e `regrasVersao`; passo explícito no README; `--atacar` antes da aula |
| R9 | Código velho depois de publicar (cache de 10 min) | M | M | `?v=`; `no-store` no config; aviso de versão; publicar até a véspera |
| R10 | `config.json` inválido (BOM, acento corrompido, peso, id) | A na primeira edição | A | O validador bloqueia a sala; o celular não depende do config (conteúdo congelado no banco + `conexao.json` separado); nunca editar no dia |
| R11 | Jogo mal calibrado (óbvio, "roubado" ou com estratégia dominante) | M | A (didático) | Conferências de equilíbrio; fatias visíveis; placar decomposto |
| R12 | Mecânica lida como defesa da meritocracia, ou que banaliza quem vive isso | M | A (didático) | Decomposição do placar; `tom: "grave"`; "sem vencedor"; cartas revisadas por você |
| R13 | Aula estoura o tempo | A | M | Tempo-alvo por passo e atraso visível; situação junto com a decisão; 2 cartas destacadas; "Pular para…"; ensaio cronometrado |
| R14 | Leitura causal ou efeito manada no comparativo | A | M | "Antes" escondido até o comparativo; só pareados; n sempre visível; rodapé fixo; sem valor-p |
| R15 | Aba anônima ou troca de navegador gera `uid` novo | M | B | Navegador embutido barrado na entrada; ativos × membros; "remover inativos"; entrar no meio da decisão não vota |
| R16 | Turma menor que o previsto e equipes vazias | A | M | O apresentador escolhe de 3 a 6 equipes; preenchimento por `alvoPorEquipe`; equipes obrigatórias |
| R17 | apiKey pública usada por terceiros | B | M | Esquema fechado; nós pequenos validados; criar sala só com PIN; sala expira em 12 h |
| R18 | A varredura de segredos do GitHub barra o upload da chave do Firebase | B | B | Testar num repositório de teste antes do README; a chave fica só em `conexao.json` |
| R19 | Comportamento do Spark acima de 100 conexões não documentado | B | A | Pico previsto de 41; ensaio na véspera |
| R20 | CDN gstatic bloqueada no campus | B | A | Offline; o celular mostra "sem acesso ao serviço" e recarrega sozinho (no máximo a cada 15 s); o "Tentar de novo" do telão recarrega a página |
| R21 | Projetor 4:3 ou daltonismo | M | M | Paleta Okabe-Ito com forma em SVG, nome e número; comparativo paginado; teste em 1024×768 |

---

## 15. O que o red team mudou

| # | Falha encontrada | Correção incorporada |
|---|---|---|
| 1 | A apuração lia o cache do telão e perdia votos que o servidor já tinha aceitado | Fechamento em 2 fases, com leitura do servidor |
| 2 | A retomada aceitava `null === null`, e qualquer aluno virava anfitrião | PIN do apresentador, com `exists()` obrigatório |
| 3 | Qualquer conta anônima criava sala e gravava blobs sem limite | Criar sala exige o PIN; nós pequenos validados; `$outro: false` |
| 4 | Um config quebrado no dia derrubava todo celular que recarregasse | `conexao.json` separado; o celular lê o conteúdo congelado no banco |
| 5 | Uma aba anônima entrava em outra equipe no meio da decisão | Quem entra depois da abertura não vota naquela etapa; atrasados distribuídos pelo telão |
| 6 | Membros fantasmas travavam o "todos votaram" | Denominador passa a ser os ativos; botão "remover inativos" |
| 7 | O celular usava o pulso do telão para detectar a própria queda | Dois detectores separados; o pulso só avisa |
| 8 | `geracao + 1` não era compare-and-swap | Transação mais trava do navegador |
| 9 | Desfazer seguido de recarregar dava uma semente nova | Nó `sementes`, gravado uma vez e nunca apagado |
| 10 | O offline a frio travava esperando o SDK, e o estado se perdia se travasse sem internet | Botão desde a primeira pintura; tempo-limite de 4 s; salvar e carregar estado |
| 11 | "Fechar quando todos votaram" matava a conversa da equipe | Tempo mínimo de conversa; o apresentador fecha |
| 12 | O "antes" era medido depois da persona e do lançamento encenado | Entrar na sala ≠ escolher equipe; "antes" primeiro |
| 13 | O jogo não cabia em 15 min, e o apresentador não via o atraso | Tempo-alvo por passo; cortes de formato; depois, jogo em paralelo ao seminário (D-006) |
| 14 | Com poucos alunos, 6 equipes viravam empates na moeda | 3 a 6 equipes; prorrogação antes da moeda |
| 15 | O placar por renda premiava a persona mais bem paga | Decomposição piloto / decisões / sorte |
| 16 | Espaço ou o passador acionavam ações sem volta | Retirada do foco; segurar 2 s; desfazer no Ctrl+Z |
| 17 | Não havia como identificar um aluno para movê-lo | Crachá curto e não pessoal |
| 18 | O comparativo misturava populações e métodos | Só pareados; métodos nunca somados |
| 19 | Várias afirmações juntas exigiam rolagem no celular | Uma por vez no celular |
| 20 | Apagar a sala era impossível pelas regras | Regra que permite só apagar a sala inteira |
| 21 | Voto individual exportado reduz a franqueza | Exportação só de agregados |

---

## 16. Plano de execução

Branch `claude/fundacao`, commits assinados e cada entrega copiada para
`Downloads/seminario-viracao/`. Nada é publicado: **quem publica é o Kleberson**.
Decisões e padrões ficam em [decisoes.md](decisoes.md).

A ordem foi pensada para o **teste com celulares nesta semana** (D-020).

| Fase | O que sai | Como se prova |
|---|---|---|
| F0 | Pasta, repositório, `AGENTS.md`, `package.json`, `.gitattributes`, esta especificação | `npm run check` verde, ainda vazio |
| F1 | Núcleo puro (validador, sorte, motor, enquete, roteiro, anfitrião sobre `canal-local`, lógica do celular) + rascunho do conteúdo com fontes | `node --test`, incluindo 1.000 partidas e a sessão inteira sobre `canal-local` |
| F2 | Telão (online e offline), `canal-firebase`, regras, celular, simulador | e2e por `file://`; `npm run emulador` com 20 robôs e `--atacar`, sem nenhuma violação |
| F3 | README com o passo a passo de publicação, roteiro do apresentador, `como-editar-config.md` | O Kleberson segue o README do zero e publica |
| F4 | Teste no eduroam com celulares reais (Kleberson), ajustes | Checklist do teste |
| F5 | Conteúdo validado junto e calibrado; ZIP para o pendrive | Validador sem erro; tabela de chances aprovada |
