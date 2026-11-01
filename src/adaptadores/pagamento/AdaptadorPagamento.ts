export type StatusPagamento = "CONFIRMADO" | "CANCELADO" | "DESCONHECIDO";

/** Contrato padrao de pagamento entre produtor (origem) e profissional (destino). */
export interface AdaptadorPagamento {
  /** Efetua o pagamento (valor em reais) e devolve o identificador da transacao. */
  efetuarPagamento(valor: number, origem: string, destino: string): string;
  cancelarPagamento(id: string): boolean;
  verificarPagamento(id: string): StatusPagamento;
}

export class PagamentoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "PagamentoInvalidoError";
  }
}

export function validarValor(valor: number): void {
  if (!Number.isFinite(valor) || valor <= 0) throw new PagamentoInvalidoError("Valor do pagamento deve ser positivo");
}
