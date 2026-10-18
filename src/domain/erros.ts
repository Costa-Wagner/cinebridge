/** Operacao do fluxo de equipe que o estado atual nao permite (HTTP 409). */
export class OperacaoInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "OperacaoInvalidaError";
  }
}
