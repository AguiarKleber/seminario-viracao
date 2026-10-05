# Como se trabalha neste repositório

Para qualquer agente, de qualquer modelo, e para qualquer pessoa. Leia antes de
mudar qualquer coisa.

## O que é isto

O app de um **seminário universitário** sobre empreendedorismo e trabalho em
plataformas, com até 20 alunos, cada um no próprio celular, e um telão. Tem dois
módulos:
- **enquetes de 1 a 5**, com comparação antes e depois;
- o **Jogo da Viração**: 6 equipes, cada uma com um personagem (D-061), 12 meses
  em 6 rodadas bimestrais intercaladas com a apresentação (D-060), e cartas de
  evento sorteadas por probabilidade.

É um projeto pessoal do Kleber, **sem vínculo com nenhum empregador**.

- **O que foi decidido e por quê:** [docs/decisoes.md](docs/decisoes.md). Decisão
  registrada não se muda sem perguntar.
- **Como o sistema funciona:** [docs/arquitetura.md](docs/arquitetura.md). A seção
  "A. Mudanças de 28/09" vale sobre o resto do documento.

## A ideia central

- **O telão é o juiz.** Só ele escreve o estado da sessão. O celular escreve
  apenas o próprio voto.
- **As regras do Firebase são o servidor.** É `firebase/regras.json` que recusa o
  resto.
- **Uma lógica só.** O núcleo (`js/nucleo/`) é JavaScript puro, sem DOM e sem
  rede. Os mesmos arquivos rodam no telão online, no telão offline, no simulador
  em Node e nos testes.
- **Online e offline diferem só no canal.** `js/canal/canal-firebase.js` e
  `js/canal/canal-local.js` têm a mesma interface.

| Onde | O que guarda |
| --- | --- |
| `config.json` | **Todo** o conteúdo: personas, equipes, rodadas, cartas, afirmações, tempos, roteiros |
| `conexao.json` | Só as chaves públicas do Firebase. Ninguém edita no dia |
| `js/nucleo/` | Validador, sorte, motor, enquete, roteiro, anfitrião, lógica do celular |
| `js/canal/` | `canal-firebase.js` (o único que conhece o Firebase) e `canal-local.js` |
| `js/ui/`, `js/telao.js`, `js/aluno.js`, `css/`, `telao/`, `aluno/` | As duas telas |
| `firebase/regras.json` | Regras de segurança versionadas (`regrasVersao`) |
| `bin/` | Simulador de 20 alunos, validador do config, versão |
| `test/`, `e2e/` | `node --test`, testes contra o emulador, Playwright |
| `docs/` | Decisões, arquitetura, roteiro do apresentador, como editar o config |

## Regras que não se negociam

1. **Todo conteúdo fica no `config.json`.** Nenhuma persona, carta, afirmação ou
   tempo fica escrito no código. O motor é genérico, e a linguagem de efeitos é
   fechada: uma chave fora do conjunto é erro de validação.
2. **O núcleo não toca DOM nem rede, e não chama `Date.now()` nem `Math.random()`
   direto.** Hora e aleatoriedade são injetadas; é isso que torna a apuração
   reproduzível e testável.
3. **Só scripts clássicos no site.** No Chrome e no Edge, `type="module"`,
   `import()` e `fetch` falham por `file://`, e o modo offline abre pelo pendrive.
   - Cada arquivo é uma IIFE que registra o que exporta em
     `globalThis.Viracao.<modulo>`, por exemplo
     `(function (raiz) { const V = (raiz.Viracao ||= {}); V.motor = { … }; })(globalThis);`.
   - Um módulo busca o outro em `globalThis.Viracao` na hora da chamada, e não na
     carga.
   - O SDK do Firebase é a única exceção: carregado por `import()` dinâmico,
     apenas online, com tempo-limite.
4. **Nenhum `innerHTML`.** Toda tela é montada com `textContent` e
   `createElement`/`createElementNS`.
5. **Toda mudança em `firebase/regras.json`** passa por `test/regras.test.mjs` e
   pelo emulador (`npm run emulador`), e sobe `regrasVersao`.
6. **O simulador nunca roda contra o projeto real na rede da aula nem no dia da
   aula.** O limite é de 100 contas anônimas por hora por IP, e o IP é o mesmo da
   turma inteira. Para testar, use o emulador.
7. **O PIN do apresentador fica só no console do Firebase**, em
   `privado/pinApresentador`. Nunca entra no repositório e nunca é impresso.
8. **Voto individual nunca sai do banco.** A exportação leva só totais. Nunca há
   quebra de enquete por equipe.
9. **Português do Brasil**, inclusive em nomes de variáveis, funções e
   comentários. O comentário explica o **porquê** e, de preferência, o que quebrou
   antes.
10. **Nada de empresa.** Nenhuma marca, padrão ou referência de empregador entra
    aqui. O visual é neutro e acadêmico (D-016).

## Comandos

```
npm install            # uma vez por clone
npm run check          # validador do config + ESLint + testes sem rede: antes de cada commit
npm test               # só os testes sem rede
npm run emulador       # regras reais + canal-firebase + simulador contra o emulador (JDK 21)
npm run e2e            # telão offline por file:// no Playwright (Chrome/Edge instalados)
npm run e2e:online     # telão e 3 celulares contra o emulador, com o config.json
npm run e2e:online:fixture   # o mesmo com a fixture: passa sempre pela frase da proteção (D-059)
npm run simular -- --memoria      # 20 alunos simulados, sem rede
```

## Dois agentes, uma árvore de arquivos

Vale o protocolo do `AGENTS.md` do Pessoal-Dev:
- um agente por pasta de cada vez;
- branch `claude/<assunto>` ou `codex/<assunto>`;
- nunca commit direto na `main`;
- commit assinado com o rodapé de coautoria;
- quem publica (GitHub Pages, regras do Firebase) é o Kleber.
