// O relógio do canal-local nos testes contra o emulador: a hora fica parada
// até a próxima volta do laço de eventos, como o "now" único de uma escrita no
// servidor, e anda pelo menos 1 ms a cada volta.
//
// Por quê: o canal-local lê o relógio duas vezes numa escrita, uma no
// marcadorDeHora() de quem escreve e outra na trava que confere "valor ===
// agora" (entrouEm, presença). Com o Date.now puro, virar o milissegundo entre
// as duas leituras recusava a escrita de vez em quando: o regras-paridade
// falhou em 2 de 6 rodadas, e o sessao, com "presença precisa ser a hora do
// servidor". É o mesmo relógio do bin/simular-alunos.mjs.
export function relogioParado() {
  let congelada = null;
  let ultima = 0;
  return () => {
    if (congelada === null) {
      congelada = Math.max(Date.now(), ultima + 1);
      ultima = congelada;
      setImmediate(() => { congelada = null; });
    }
    return congelada;
  };
}
