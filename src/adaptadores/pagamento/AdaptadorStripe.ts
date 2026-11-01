import { AdaptadorPagamento, StatusPagamento, validarValor } from "./AdaptadorPagamento";
import { GatewayPagamento } from "../externos/GatewayPagamento";

export class AdaptadorStripe implements AdaptadorPagamento {
  constructor(private readonly gateway: GatewayPagamento = new GatewayPagamento()) {}

  efetuarPagamento(valor: number, origem: string, destino: string): string {
    validarValor(valor);
    return this.gateway.processarPagamento(valor, { origem, destino }).id;
  }

  cancelarPagamento(id: string): boolean {
    return this.gateway.estornarPagamento(id);
  }

  verificarPagamento(id: string): StatusPagamento {
    const status = this.gateway.consultarStatus(id);
    if (status === "approved") return "CONFIRMADO";
    if (status === "refunded") return "CANCELADO";
    return "DESCONHECIDO";
  }
}
