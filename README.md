# Seminário da Viração

App em tempo real para um seminário universitário sobre empreendedorismo e
trabalho em plataformas. Até 20 alunos usam o próprio celular, e um telão
acompanha. Quem opera o telão é o apresentador, pelo teclado do notebook.

- **Enquetes de 1 a 5**, com comparação antes e depois.
- **Jogo da Viração**: 6 equipes jogam o mesmo personagem, o Jonas, motoboy do
  iFood, durante 12 meses em 6 rodadas bimestrais intercaladas com a
  apresentação. Cada bimestre tem 5 opções, com o dinheiro na própria opção, e
  o evento do mês é igual para todos, sem sorteio: no fim, compara-se o que cada
  combinação de escolhas fez com o dinheiro da família (D-078).

| Documento | Para quê |
| --- | --- |
| [docs/jogo-simples.md](docs/jogo-simples.md) | O jogo de 07/10: o Jonas, os 6 bimestres, as 30 opções com valor e fonte, as consequências e os números das 15.625 combinações |
| [docs/roteiro-do-apresentador.md](docs/roteiro-do-apresentador.md) | Véspera, dia da aula minuto a minuto, teclas, rede caída, teste no eduroam |
| [docs/como-editar-config.md](docs/como-editar-config.md) | Cada campo do `config.json`, a linguagem de efeitos e o validador |
| [docs/decisoes.md](docs/decisoes.md) | O que foi decidido e por quê (D-001 em diante) |
| [docs/arquitetura.md](docs/arquitetura.md) | Como o sistema funciona |
| [docs/contratos.md](docs/contratos.md) | O que cada módulo do código espera do outro |
| [docs/rascunho-conteudo.md](docs/rascunho-conteudo.md) | Os valores do jogo de 6 personagens (até 05/10), cada um com a fonte; as fontes do Jonas vêm dele |
| [AGENTS.md](AGENTS.md) | Regras para quem mexe no código |

## Onde estamos (06/10)

| Já feito | Situação |
| --- | --- |
| 1 a 5. Firebase, banco, login anônimo, `conexao.json`, PIN | Prontos (projeto `seminario-viracao`, plano Spark; o PIN fica só no console, em `privado/pinApresentador`) |
| 6 a 8. Regras, GitHub Pages e telão | **Regras v4** e a `main` com a versão 7 do site (12 meses, 6 personagens, cartas sorteadas: PR #7), testada pelo Kleber em 05/10 |
| Jogo simples | Branch `claude/jogo-simples`, **ainda não fundida nem publicada**: versão 8 do site, com o formato simples (D-078: só o Jonas, 5 opções por bimestre, sem sorteio, o dinheiro na opção), a consequência de antes à vista no resultado, o fim da rodada sem o JSON automático e os ajustes de tela de 05/10 (D-072 a D-077: rever a tela anterior, a barra oculta fina, o mapa sem o gancho, o saldo do bimestre, as escolhas da equipe no celular). **As regras não mudam** (continuam v4) |
| Conteúdo | `config.json` versão `2026-10-06-v4-simples` (o hash é o que `npm run validar` imprimir; em 06/10, `3283181b`). Tudo em [docs/jogo-simples.md](docs/jogo-simples.md), com o que falta o Kleber confirmar no fim. O de 6 personagens ficou no git e em `test/fixtures/config-real-v31.json` |

**Para publicar (06/10, até as 12h):** só o site muda, e as regras ficam como
estão (v4), sem nenhum passo no console do Firebase.
1. Sem nenhuma sala aberta, funda o PR da `claude/jogo-simples` na `main` (o
   GitHub Pages leva de 1 a 3 minutos; espere a aba Actions mostrar "pages build
   and deployment" em verde).
2. Recarregue o telão com Ctrl+F5 em toda máquina onde ele estiver aberto e
   repita o passo 8: o bloco 3 tem de dizer `regras v4 conferidas`, o bloco 1, a
   versão `2026-10-06-v4-simples` e o mesmo hash que `npm run validar` imprime
   na `main` publicada. Os celulares com a versão 7 em cache veem a faixa "Há
   uma versão nova do app: atualize a página".
3. Ensaie uma sala de teste até o resultado de Jan–fev (roteiro, seção 0) e
   apague a sala no fim.
4. Baixe o ZIP de novo para o pendrive (passo 11).

Uma sala criada com o config de 6 personagens não se retoma com o novo (o hash
muda): crie a sala da aula só depois da publicação.

## Como funciona

- **O telão é o juiz.** Só ele muda o estado da sessão. O celular grava apenas o
  próprio voto.
- **O serviço é o Firebase Realtime Database**, no plano grátis (Spark), com login
  anônimo: o aluno não vê cadastro nenhum. As regras em `firebase/regras.json`
  recusam tudo o que não for permitido.
- **O site é estático**, publicado no GitHub Pages. Custo: R$ 0.
- **Sem internet, o telão segue sozinho** ("sem celulares"): as enquetes viram mão
  levantada e as decisões são registradas pelo apresentador. A pasta do projeto
  abre por duplo clique num pendrive.

Depois de publicado, os endereços são:

| Quem | Endereço |
| --- | --- |
| Entrada | `https://aguiarkleber.github.io/seminario-viracao/` |
| Telão | `https://aguiarkleber.github.io/seminario-viracao/telao/` |
| Celular | `https://aguiarkleber.github.io/seminario-viracao/aluno/` (o QR do telão já leva para lá com o código da sala) |

---

## Rodar na própria máquina

**Precisa de:** Node.js 20 ou mais novo, Git, e o Chrome ou o Edge. Para o
emulador, também o JDK 21 (`winget install Microsoft.OpenJDK.21`). O
`bin/emulador.mjs` acha o JDK sozinho nas pastas padrão do Windows. Se não achar,
defina `JAVA_HOME` com a pasta do JDK.

### Primeira vez

```
npm install
npm run check
```

O `npm run check` tem de terminar sem erro. Ele roda o validador do
`config.json`, o ESLint e os testes que não usam rede.

### Ver o telão sem celulares

Há dois jeitos:
1. **Pelo arquivo**, como no pendrive. Dê duplo clique em `telao/index.html`,
   clique em **Carregar config.json**, escolha o `config.json` da pasta do projeto
   e depois **Começar sem celulares**.
2. **Por um servidor local.** Rode `npm run servir` e abra
   `http://127.0.0.1:8080/telao/`. Assim o `config.json` é lido sozinho.

> O `conexao.json` já está preenchido: o telão aberto pelo servidor local
> conversa com o projeto **real** do Firebase (faz o login anônimo e o autoteste
> das regras). Para ensaiar com celulares sem tocar nele, use o emulador.

### Ensaiar com celulares, tudo local (emulador)

O emulador é uma cópia local do Firebase (projeto `demo-seminario`). Ele usa as
regras de verdade e não gasta a cota de contas anônimas do projeto real. Os dois
terminais abaixo ficam na pasta do projeto.

1. **Terminal 1** (fica aberto):
   ```
   node bin/emulador.mjs "node bin/servir.mjs"
   ```
   Espere a linha `Servindo … em http://127.0.0.1:8080/`. Na primeira vez, o
   firebase-tools baixa o emulador, e para isso precisa de internet.
2. **Terminal 2**, uma vez cada vez que o emulador sobe (ele começa vazio): grave
   o PIN do emulador.
   ```
   node -e "import('./bin/emulador.mjs').then(m => m.administrador('PUT', 'privado/pinApresentador', m.PIN_EMULADOR)).then(() => console.log('PIN do emulador semeado'))"
   ```
   Tem de aparecer `PIN do emulador semeado`.
3. Abra `http://127.0.0.1:8080/telao/?emulador=1`. O bloco **3. Com celulares**
   tem de dizer `Emulador local · regras v4 conferidas.`
4. No campo do PIN, digite o valor de `PIN_EMULADOR`, que está em
   `bin/emulador.mjs` e só vale no emulador. Clique em **Criar sala com
   celulares**.
5. Os "celulares" são janelas do mesmo computador: o emulador só aceita conexões
   da própria máquina. Copie o endereço que aparece ao lado do QR (ele já traz
   `&emulador=1`). Cada celular precisa de um navegador ou de um modo diferente,
   porque o login anônimo fica guardado por perfil. Por exemplo: o telão numa
   janela normal do Chrome e os celulares numa janela anônima do Chrome, numa
   janela normal do Edge e numa InPrivate do Edge. Com Ctrl+Shift+M, as
   ferramentas do desenvolvedor (F12) mostram a página no tamanho de um celular.
6. Para parar, aperte Ctrl+C no terminal 1. O site e o emulador caem juntos.

O `npm run e2e:online` faz esse mesmo ensaio sozinho, com 3 celulares simulados,
um quarto que entra e some, para conferir os inativos, e o celular do
apresentador no modo espectador. Ele nunca fala com o projeto real.

---

## Publicar: passo a passo

Este passo a passo é para quem não é desenvolvedor. Cada passo termina com um
**Confira**. Se o que está escrito ali não aparecer, pare e resolva antes de
seguir.

**Os passos 1 a 5 já foram feitos** (veja [Onde estamos](#onde-estamos-0510)).
Eles ficam aqui como referência, para conferir ou refazer um dia. O que falta
começa no passo 6.

**Prazos (D-036):** site e regras publicados até **29/09**; teste no eduroam em
**30/09**; seminário em **07/10**. Conteúdo e código ficam congelados até
**06/10**.

**Antes de começar:**
- uma conta Google pessoal, a mesma que vai ser dona do Firebase (D-002);
- o PR do código fundido na `main`. O merge é seu: nenhum agente funde o
  próprio PR;
- o repositório `AguiarKleber/seminario-viracao` público, porque o GitHub Pages
  grátis exige isso (D-002). Para conferir: Settings → General → Danger Zone;
- um lugar seguro para guardar o PIN, como um gerenciador de senhas ou um papel
  em casa. **Nunca** no repositório, no chat, num print ou num e-mail.

Os nomes das telas do Firebase e do GitHub aparecem em português, com o nome em
inglês entre parênteses para quando o console estiver em inglês.

### 1. Criar o projeto no Firebase

1. Entre em `https://console.firebase.google.com` com a conta Google pessoal.
2. Clique em **Criar um projeto** (Create a project).
3. Nome: `seminario-viracao`. Aceite os termos e continue.
4. Deixe o **Google Analytics desligado**. Se o console oferecer um assistente de
   IA, pode recusar.
5. Clique em **Criar projeto**, espere e clique em **Continuar**.
6. Não mude de plano. O projeto nasce no **Spark**, que é grátis, e nenhum passo
   pede cartão.

**Confira:** o nome `seminario-viracao` aparece no alto, à esquerda, e o plano é
o Spark. Anote o **ID do projeto**, que fica em Configurações do projeto → Geral.
Ele pode ser `seminario-viracao` ou vir com um sufixo, se o nome já existia.

### 2. Criar o Realtime Database

1. No menu da esquerda, abra **Realtime Database**, que fica em Criação (Build).
   Se não achar, use a busca do console. Atenção: é o Realtime Database, e **não**
   o Firestore.
2. Clique em **Criar banco de dados** (Create Database).
3. Local: **Estados Unidos (us-central1)**. Não há região na América do Sul, e a
   distância (cerca de 160 ms) não atrapalha a votação.
4. Regras de segurança: **Iniciar no modo bloqueado** (Start in locked mode).
   **Nunca** o modo de teste.
5. Clique em **Ativar** (Enable).

**Confira:** a aba **Dados** (Data) mostra um endereço como
`https://seminario-viracao-default-rtdb.firebaseio.com/`, com `null` embaixo.
Esse endereço é o `databaseURL` do passo 4.

### 3. Ligar o login anônimo

1. No menu da esquerda, abra **Authentication** e clique em **Vamos começar**
   (Get started).
2. Na aba **Método de login** (Sign-in method), escolha **Anônimo** (Anonymous),
   ative e clique em **Salvar**.

**Confira:** na lista de provedores, Anônimo aparece como **Ativado** (Enabled). É
assim que cada celular ganha uma identidade própria, sem nenhum cadastro.

### 4. Registrar o app Web e preencher o `conexao.json`

Estes valores são **públicos por natureza**: vão para o navegador de qualquer
aluno. Quem protege os dados é o `firebase/regras.json` (passo 6), e não o
segredo da chave.

1. Clique na engrenagem ao lado de **Visão geral do projeto** e abra
   **Configurações do projeto** (Project settings). Na aba **Geral**, em **Seus
   apps** (Your apps), clique no ícone **Web** (`</>`).
2. Apelido do app: `seminario-viracao`. **Não** marque "Configurar também o
   Firebase Hosting". Clique em **Registrar app**.
3. Aparece um trecho `const firebaseConfig = { … }`. Copie para um bloco de notas
   os cinco valores usados: `apiKey`, `authDomain`, `databaseURL`, `projectId` e
   `appId`. `storageBucket` e `messagingSenderId` não são usados. Se o
   `databaseURL` não aparecer, use o endereço do alto da aba Dados (passo 2).
4. No GitHub, abra o `conexao.json` na `main` e clique no lápis (Edit this file).
5. Troque cada `COLE_AQUI` pelo valor correspondente, mantendo as aspas. O
   arquivo fica assim (valores inventados):
   ```json
   {
     "apiKey": "AIzaSy…",
     "authDomain": "seminario-viracao.firebaseapp.com",
     "databaseURL": "https://seminario-viracao-default-rtdb.firebaseio.com",
     "projectId": "seminario-viracao",
     "appId": "1:123456789012:web:0a1b2c3d4e5f"
   }
   ```
   O trecho do console é JavaScript, mas o arquivo é JSON: os nomes vão **entre
   aspas**, há vírgula entre as linhas e nenhuma vírgula depois da última.
6. Clique em **Commit changes…**, escolha **Create a new branch for this commit
   and start a pull request** e depois **Propose changes** → **Create pull
   request** → **Merge pull request** → **Confirm merge**. Assim nada entra na
   `main` sem PR.
7. Se o GitHub avisar que encontrou um segredo ("Google API Key"), é esta chave. A
   chave Web do Firebase é pública de propósito: escolha a opção que libera o
   envio como falso positivo. Um e-mail do GitHub ou do Google Cloud sobre "chave
   exposta" também se refere a ela. **Não** apague nem troque a chave, senão o
   site para de funcionar.

**Confira:** na `main`, o `conexao.json` não tem mais nenhum `COLE_AQUI`.

### 5. Cadastrar o PIN do apresentador

O PIN deixa criar a sala e retomar o telão em outra máquina. Ele fica **só** no
console do Firebase (AGENTS.md, regra 7).

Escolha um PIN:
- de **10 a 32 caracteres**. Acima de 32, o telão não consegue enviá-lo;
- com **pelo menos uma letra**. Só com algarismos, o console grava um número, e
  ele nunca confere;
- sem espaço no começo nem no fim, e sem aspas;
- que você não usa em nenhum outro lugar.

1. Abra Realtime Database → aba **Dados**.
2. Passe o mouse sobre o endereço do banco, que é a raiz, e clique no **+**
   (Adicionar filho).
3. Nome: `privado`. Não preencha o valor: clique no **+** ao lado desse nome novo,
   para criar um filho dentro dele.
4. Nome do filho: `pinApresentador`. Valor: o seu PIN.
5. Clique em **Adicionar** (Add).

**Confira:** a árvore mostra `privado` → `pinApresentador` com o valor **entre
aspas**. Aspas querem dizer texto. Se o valor aparecer sem aspas, apague e refaça
com uma letra no PIN. A grafia tem de ser exata: `privado` e `pinApresentador`,
com o P maiúsculo no meio.

### 6. Publicar as regras

1. No GitHub, abra o `firebase/regras.json` na `main` e clique em **Copy raw
   file** (o ícone de dois quadradinhos no alto do arquivo). Se o PR ainda não
   foi fundido, abra o arquivo pela branch do PR: no PR, aba **Files changed**,
   no arquivo, **⋯** → **View file**.
2. Abra Realtime Database → aba **Regras** (Rules). Apague tudo o que está lá,
   cole e clique em **Publicar** (Publish).

**Confira:** o editor começa com `{ "rules": {`, a publicação não mostra erro, e
perto do topo há uma linha com `'v4'` (é o `regrasVersao`). Toda vez que o
`regras.json` mudar, repita este passo: a versão sobe junto (v5, v6…). Se as
regras publicadas forem de outra versão, o telão avisa e não cria a sala. Na
passagem do site v6 para o v7, este passo vai junto com o merge (veja "Publicar
o site v7 e as regras v4 juntos", em [Onde estamos](#onde-estamos-0510)).

### 7. Ligar o GitHub Pages

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em **Build and deployment**, Source: **Deploy from a branch**.
3. Branch: **main**; pasta: **/ (root)**. Clique em **Save**.
4. Espere de 1 a 3 minutos e recarregue a página.

**Confira:** aparece "Your site is live at
`https://aguiarkleber.github.io/seminario-viracao/`". Abra o endereço: a página
mostra "Seminário da Viração", com **Sou aluno** e **Sou apresentador**. Depois
de cada merge na `main`, o site se atualiza sozinho em poucos minutos; a aba
Actions mostra "pages build and deployment" em verde.

### 8. Abrir o telão e conferir as regras

1. Abra `https://aguiarkleber.github.io/seminario-viracao/telao/` no Chrome ou no
   Edge.
2. O bloco **1. config.json** mostra "✓ Válido", a versão e o hash. Anote o hash.
3. No bloco **3. Com celulares**, espere `Serviço conectado · regras v4
   conferidas.`
4. Digite o PIN no campo **PIN do apresentador** e clique em **Criar sala com
   celulares**.
5. Aparecem o QR, o código da sala e "0 conectados".
6. Apague a sala de teste. Aperte H (ou encoste o mouse na borda de baixo) para
   a barra aparecer, segure **Encerrar jogo (segure)** por 2 s e, já no Fim,
   segure **Apagar a sala (segure 2 s)**, também na barra (D-047). O telão volta
   à abertura.

**Confira:** em nenhum momento aparece `REGRAS ABERTAS ou DESATUALIZADAS: não
use`. Se aparecer, o telão não cria a sala: refaça o passo 6 e recarregue. Outras
mensagens:

| Mensagem no telão | O que fazer |
| --- | --- |
| `O conexao.json ainda não foi preenchido (…)` | Passo 4. Se já foi feito, espere 10 min (o cache do GitHub Pages) e recarregue com Ctrl+F5 |
| `O servidor recusou: o PIN não confere…` | Passo 5: grafia do nó, aspas, espaço sobrando |
| `Sem acesso ao serviço (…)` | Rede. Clique em **Tentar de novo**: ele recarrega a página, e o PIN precisa ser digitado de novo. Se o texto falar em domínio não autorizado (`auth/unauthorized-domain`), abra Authentication → Configurações → Domínios autorizados e adicione `aguiarkleber.github.io` |
| `Muitas contas novas nesta rede na última hora` | Cota de contas anônimas (passo 9): espere a hora virar |

### 9. Cota de contas anônimas e o simulador

O login anônimo aceita **100 contas novas por hora por endereço de IP**, e na
aula a turma inteira sai pelo mesmo IP da universidade.

1. Se o console oferecer (Authentication → Configurações → **Cota de inscrição**,
   ou Sign-up quota), agende um aumento temporário para a janela da aula de
   07/10, começando uma hora antes. Se a opção não existir, siga em frente: 20
   alunos e o telão usam cerca de 25 contas.
2. **Nunca** rode o simulador (`bin/simular-alunos.mjs`) contra o projeto real
   na rede da universidade nem no dia da aula (AGENTS.md, regra 6). Cada execução
   cria de 20 a 25 contas; quatro execuções esgotam a hora daquele IP, e ninguém
   mais daquela rede entra na sala. Para testar, use o emulador. O simulador se
   recusa a rodar contra o projeto real sem `--sim-tenho-certeza`.

**Confira:** a cota está agendada, ou você anotou que o console não oferece a
opção. E ninguém vai rodar o simulador no campus.

### 10. Ensaio com 3 celulares

Faça em casa, antes do teste no eduroam. Um dos celulares pode ficar no 4G.

1. Abra o telão (passo 8) e crie uma sala com o roteiro **60min**.
2. Os 3 celulares leem o QR. Cada um mostra "Você está na sala" e um crachá
   curto, como "Crachá K7Q". O telão conta "3 conectados".
3. Espaço abre a enquete "antes". Vote nos celulares: cada um mostra
   "Registrado". Enter encerra. O telão mostra só quantos responderam, porque o
   gráfico fica escondido até o comparativo (D-011).
4. Espaço até **Formação das equipes**. Com as teclas de número, deixe 3 equipes
   abertas. Nos celulares, toque em **Me coloque numa equipe**. Espaço trava as
   equipes.
5. Espaço até a rodada 1. Nos celulares aparecem o contexto da família e as 4
   opções; a decisão tem 90 s. Vote e veja a contagem da equipe mudar ao
   vivo. No meio, bloqueie a tela de um celular por 1 minuto e desbloqueie. Enter
   encerra. Antes do tempo mínimo de conversa, ele pede confirmação com o foco em
   **Cancelar**: para confirmar, Tab e Enter, ou clique. Confira o sorteio, o
   resultado e que o navegador baixou um arquivo `viracao-estado-….json`. O telão
   não avisa na tela; só a barra registra "estado salvo às …".
   - Com o telão em tela cheia (F11), olhe se algo apareceu por cima da tela
     projetada no sorteio: o painel de downloads do Edge, ou o pedido do Chrome
     para "baixar vários arquivos". Se apareceu, refaça os ajustes de download do
     [roteiro do apresentador](docs/roteiro-do-apresentador.md#navegador-do-notebook)
     (seção 2) e repita na rodada 2.
6. Recarregue o telão (F5) e clique em **Retomar sala**: ele volta ao mesmo passo
   sem pedir o PIN.
7. **Pular para…** → Placar final. O Espaço passa as páginas (quanto sobrou e
   quanto ficou devendo, com o que faltou na mesa embaixo, "Escolha ou sorte?", "O pior que podia acontecer" e a história de
   cada equipe) e, da última, segue
   o roteiro. No Fim, na barra, clique em **Exportar totais** e segure **Apagar a
   sala**.
8. Antes de apagar, num quarto celular (ou numa janela anônima), abra o
   endereço do aluno, toque em **Sou apresentador**, digite o código e o PIN:
   ele mostra a tela de cada equipe, sem votar e sem entrar no "N conectados"
   (modo espectador, roteiro, seção 4).

**Confira:** nada travou. O roteiro completo do dia está em
[docs/roteiro-do-apresentador.md](docs/roteiro-do-apresentador.md), e o checklist
do teste no eduroam (30/09) fica no fim dele.

### 11. Pendrive (plano B sem internet)

Faça depois do último merge, com o conteúdo e o código já congelados (06/10).

1. No GitHub, abra o repositório → botão verde **Code** → **Download ZIP**.
2. Extraia o ZIP para o pendrive (botão direito → Extrair tudo).
3. No pendrive, dê duplo clique em `telao/index.html`, clique em **Carregar
   config.json** e escolha o `config.json` da raiz da pasta extraída.
4. Clique em **Começar sem celulares**, aperte Espaço algumas vezes e feche.

**Confira:** o hash do `config.json` no pendrive é igual ao anotado no passo 8.
Se for diferente, o ZIP é de outra versão: baixe de novo. É esse mesmo hash que
deixa o pendrive carregar o estado salvo pelo telão online.

---

## Depois de publicado: mudar alguma coisa

- Toda mudança entra por PR na `main`. O site se atualiza em minutos, mas um
  navegador pode guardar a versão anterior por até 10 min.
- **Mudou JS ou CSS:** rode `npm run versao` antes do commit. Ele sobe juntos o
  `?v=` das páginas e a versão do app, e o celular com a versão anterior vê
  "atualize a página". Se mudou só o `config.json` ou o `conexao.json`, não
  precisa: os dois são lidos sem cache.
- **Mudou o `firebase/regras.json`:** repita o passo 6. A mudança sobe o
  `regrasVersao` junto (AGENTS.md, regra 5).
- **Correções depois do teste no eduroam (01 a 05/10, D-036):** se o
  `regras.json` mudou, publique as regras de novo (passo 6) logo depois do
  merge. Depois, recarregue o telão (F5) em toda máquina onde ele estiver
  aberto: um telão aberto continua com o código antigo e conferiu as regras só
  ao abrir. Sem as regras novas publicadas, o telão novo mostra `REGRAS ABERTAS
  ou DESATUALIZADAS` e não cria a sala.
- **Depois de qualquer mudança:** repita o passo 8 e baixe o ZIP de novo
  (passo 11).
- **Nunca no dia da aula, nem com uma sala aberta.** O telão só retoma uma sala
  criada com o mesmo `config.json` (o mesmo hash), e subir a versão do app faz o
  telão offline esquecer a sessão guardada no navegador.

## O que é público e o que é segredo

| O quê | Onde fica | É público? |
| --- | --- | --- |
| Chaves do Firebase (`conexao.json`) | Repositório | Sim, por natureza. Quem protege os dados é o `firebase/regras.json` |
| Conteúdo do jogo, cartas e pesos (`config.json`) | Repositório | Sim, e isso foi aceito (D-002) |
| PIN do apresentador | Só no console, em `privado/pinApresentador` | **Não.** Nunca no repositório, nunca impresso |
| Voto de cada aluno | No banco, dentro da sala | Não. Ninguém lê o voto alheio, a exportação leva só totais, e apagar a sala apaga os votos |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm install` | Instala as ferramentas (uma vez por cópia do repositório) |
| `npm run check` | Validador do config + ESLint + testes sem rede. Rode antes de cada commit |
| `npm test` | Só os testes sem rede |
| `npm run lint` | Só o ESLint |
| `npm run validar` | Validador do `config.json` e as conferências de equilíbrio do jogo, de (a) a (l). No jogo simples, leva uns 2 segundos; a seção (l) dá o dinheiro de cada opção e as combinações (quantas fecham, a melhor e a pior) |
| `npm run combinacoes` | O jogo simples no motor, todas as 15.625 combinações: a mediana, a média, o padrão, a média de cada opção, se alguma domina e quantas vezes cada consequência aparece (os números de docs/jogo-simples.md) |
| `npm run servir` | Site em `http://127.0.0.1:8080/` (outra porta: `npm run servir -- 8181`) |
| `node bin/emulador.mjs "node bin/servir.mjs"` | Emulador + site, para ensaiar à mão (JDK 21) |
| `npm run emulador` | Testes contra o emulador: regras reais, `canal-firebase` e simulador (JDK 21) |
| `npm run e2e` | Telão por `file://` no Playwright, com o Chrome ou o Edge instalados: o jogo com sorteio (o config de 05/10, congelado), o formato simples com a fixture e com o `config.json` do dia |
| `npm run e2e:online` | Telão e 3 celulares (mais um que entra e some, para os inativos) contra o emulador, com o jogo de sorteio (o config de 05/10, congelado), e depois o jogo simples do `config.json` do dia (o mesmo que o `e2e:online:dia`); nunca fala com o projeto real |
| `npm run e2e:online:dia` | O jogo simples do `config.json` do dia com o telão (com a faixa de entrada) e 3 celulares, contra o emulador (`npm run e2e:online:simples`: o mesmo com a fixture) |
| `npm run e2e:online:fixture` | O mesmo, com a fixture de teste no lugar do `config.json`: é o que passa sempre por "a proteção pagou" no celular (D-059). Rode junto com o anterior |
| `npm run e2e:votos` | A matriz de votos: a sessão inteira, primeiro com o `config.json` do dia (o jogo simples: 5 opções por bimestre, todas votadas pela tela e contadas, e nenhum celular no "Sorteando…"), depois com as 6 rodadas do config de 05/10 (sorteio; congelado em `test/fixtures/config-real-v31.json`) e com a fixture de 6 bimestres, com um celular em cada equipe, votando pela tela, inclusive depois do fim do cronômetro, e um celular no modo espectador, contra o emulador. Demora bastante (espera o relógio real). Veio do voto que não contou no teste de 30/09 |
| `npm run simular -- --memoria` | 20 alunos simulados, sem rede |
| `npm run simular -- --emulador --com-anfitriao --rapido --atacar` | Sessão inteira com 20 robôs e ataques, no emulador (acrescente `--rajada --quedas --recargas` para as perturbações) |
| `npm run versao` | Sobe o `?v=` e a versão do app juntos |
| `npm run versao -- --conferir` | Só confere se o `?v=` e a versão do app estão iguais |

## Terceiros

- `vendor/qrcode.js`: qrcode-generator 2.0.4, licença MIT, com o cabeçalho
  preservado no arquivo.
- SDK do Firebase 12.19.0, carregado da CDN do Google só no modo com celulares.
