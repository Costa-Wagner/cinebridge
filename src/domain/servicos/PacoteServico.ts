import { DadoPacoteServico, ModoPrazo, ServicoProjeto } from "./ServicoProjeto";

/** Composite: contem servicos atomicos e/ou outros pacotes, em qualquer profundidade. */
export class PacoteServico implements ServicoProjeto {
  private readonly filhos: ServicoProjeto[];

  constructor(
    readonly nome: string,
    filhos: ServicoProjeto[] = [],
    readonly modo: ModoPrazo = "SEQUENCIAL"
  ) {
    this.filhos = [...filhos];
  }

  adicionar(servico: ServicoProjeto): this {
    this.filhos.push(servico);
    return this;
  }

  remover(servico: ServicoProjeto): boolean {
    const indice = this.filhos.indexOf(servico);
    if (indice < 0) return false;
    this.filhos.splice(indice, 1);
    return true;
  }

  calcularCusto(): number {
    return this.filhos.reduce((total, filho) => total + filho.calcularCusto(), 0);
  }

  listarSubservicos(): ServicoProjeto[] {
    return [...this.filhos];
  }

  obterPrazo(): number {
    const prazos = this.filhos.map((filho) => filho.obterPrazo());
    if (prazos.length === 0) return 0;
    return this.modo === "SEQUENCIAL" ? prazos.reduce((a, b) => a + b, 0) : Math.max(...prazos);
  }

  validar(): string[] {
    const problemas: string[] = [];
    if (!this.nome) problemas.push("Pacote sem nome");
    if (this.filhos.length === 0) problemas.push(`Pacote "${this.nome}": nenhum servico`);
    for (const filho of this.filhos) problemas.push(...filho.validar());
    return problemas;
  }

  paraJSON(): DadoPacoteServico {
    return { tipo: "PACOTE", nome: this.nome, modo: this.modo, servicos: this.filhos.map((f) => f.paraJSON()) };
  }

  toJSON(): DadoPacoteServico {
    return this.paraJSON();
  }
}
