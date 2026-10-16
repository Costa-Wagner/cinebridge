export class ProjetoInvalidoError extends Error {
  constructor() {
    super("Projeto nao atende as restricoes de orcamento, duracao, prazo e papeis obrigatorios");
    this.name = "ProjetoInvalidoError";
  }
}
