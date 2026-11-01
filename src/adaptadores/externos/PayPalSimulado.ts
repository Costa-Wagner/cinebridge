export interface PedidoPayPal {
  orderId: string;
  status: "COMPLETED" | "REFUNDED";
}

/** API simulada no estilo PayPal: valor como string decimal, orders. */
export class PayPalSimulado {
  private readonly pedidos = new Map<string, PedidoPayPal>();
  private sequencia = 0;

  createOrder(amount: string, payer: string, payee: string): PedidoPayPal {
    if (Number.isNaN(Number(amount)) || !payer || !payee) throw new Error("INVALID_REQUEST");
    const pedido: PedidoPayPal = { orderId: `PP-${++this.sequencia}`, status: "COMPLETED" };
    this.pedidos.set(pedido.orderId, pedido);
    return pedido;
  }

  refundOrder(orderId: string): boolean {
    const pedido = this.pedidos.get(orderId);
    if (!pedido || pedido.status === "REFUNDED") return false;
    pedido.status = "REFUNDED";
    return true;
  }

  getOrder(orderId: string): PedidoPayPal | null {
    return this.pedidos.get(orderId) ?? null;
  }
}
