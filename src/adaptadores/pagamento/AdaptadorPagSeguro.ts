import { AdaptadorPagamento, StatusPagamento, validarValor } from "./AdaptadorPagamento";
import { ApiPagSeguroSimulada } from "../externos/ApiPagSeguroSimulada";

export class AdaptadorPagSeguro implements AdaptadorPagamento {
  constructor(private readonly api: ApiPagSeguroSimulada = new ApiPagSeguroSimulada()) {}

  efetuarPagamento(valor: number, origem: string, destino: string): string {
    validarValor(valor);
    return this.api.criarCobranca({ valorCentavos: Math.round(valor * 100), pagador: origem, recebedor: destino }).codigo;
  }

  cancelarPagamento(id: string): boolean {
    return this.api.cancelarCobranca(id);
  }

  verificarPagamento(id: string): StatusPagamento {
    const situacao = this.api.buscarCobranca(id)?.situacao;
    if (situacao === "PAGO") return "CONFIRMADO";
    if (situacao === "CANCELADO") return "CANCELADO";
    return "DESCONHECIDO";
  }
}
