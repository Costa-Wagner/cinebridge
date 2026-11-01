export interface Transacao {
  id: string;
  valor: number;
  status: "approved" | "refunded";
}

/** Gateway simulado no estilo Stripe: valor em reais, status em ingles. */
export class GatewayPagamento {
  private readonly transacoes = new Map<string, Transacao>();
  private sequencia = 0;

  processarPagamento(valor: number, dados: { origem: string; destino: string }): Transacao {
    if (!dados.origem || !dados.destino) throw new Error("card_declined: origem/destino ausentes");
    const transacao: Transacao = { id: `ch_${++this.sequencia}`, valor, status: "approved" };
    this.transacoes.set(transacao.id, transacao);
    return transacao;
  }

  estornarPagamento(id: string): boolean {
    const transacao = this.transacoes.get(id);
    if (!transacao || transacao.status === "refunded") return false;
    transacao.status = "refunded";
    return true;
  }

  consultarStatus(id: string): string {
    return this.transacoes.get(id)?.status ?? "not_found";
  }
}
