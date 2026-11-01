import { AdaptadorPagamento, StatusPagamento, validarValor } from "./AdaptadorPagamento";
import { PayPalSimulado } from "../externos/PayPalSimulado";

export class AdaptadorPayPal implements AdaptadorPagamento {
  constructor(private readonly api: PayPalSimulado = new PayPalSimulado()) {}

  efetuarPagamento(valor: number, origem: string, destino: string): string {
    validarValor(valor);
    return this.api.createOrder(valor.toFixed(2), origem, destino).orderId;
  }

  cancelarPagamento(id: string): boolean {
    return this.api.refundOrder(id);
  }

  verificarPagamento(id: string): StatusPagamento {
    const status = this.api.getOrder(id)?.status;
    if (status === "COMPLETED") return "CONFIRMADO";
    if (status === "REFUNDED") return "CANCELADO";
    return "DESCONHECIDO";
  }
}
