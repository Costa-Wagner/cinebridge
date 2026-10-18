export class ProjetoInvalidoError extends Error {
  constructor(readonly problemas: string[] = []) {
    super("Projeto nao atende as restricoes de orcamento, duracao, prazo e papeis obrigatorios");
    this.name = "ProjetoInvalidoError";
  }
}
