export interface Cobranca {
  codigo: string;
  situacao: "PAGO" | "CANCELADO";
}

/** API simulada no estilo PagSeguro: valor em centavos, situacao em portugues. */
export class ApiPagSeguroSimulada {
  private readonly cobrancas = new Map<string, Cobranca>();
  private sequencia = 0;

  criarCobranca(dados: { valorCentavos: number; pagador: string; recebedor: string }): Cobranca {
    if (!Number.isInteger(dados.valorCentavos)) throw new Error("valorCentavos deve ser inteiro");
    const cobranca: Cobranca = { codigo: `PAG-${++this.sequencia}`, situacao: "PAGO" };
    this.cobrancas.set(cobranca.codigo, cobranca);
    return cobranca;
  }

  cancelarCobranca(codigo: string): boolean {
    const cobranca = this.cobrancas.get(codigo);
    if (!cobranca || cobranca.situacao === "CANCELADO") return false;
    cobranca.situacao = "CANCELADO";
    return true;
  }

  buscarCobranca(codigo: string): Cobranca | undefined {
    return this.cobrancas.get(codigo);
  }
}
