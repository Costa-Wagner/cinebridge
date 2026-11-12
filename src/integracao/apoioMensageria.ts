import { BarramentoEventos } from "../eventos/BarramentoEventos";

/** Prefixa os topicos para o teste nao competir com servicos de verdade ligados ao mesmo RabbitMQ. */
export class BarramentoComPrefixo implements BarramentoEventos {
  constructor(private readonly interno: BarramentoEventos, private readonly prefixo: string) {}
  publicar(topico: string, payload: unknown) {
    return this.interno.publicar(`${this.prefixo}${topico}`, payload);
  }
  assinar(topico: string, tratador: (payload: any) => void | Promise<void>) {
    return this.interno.assinar(`${this.prefixo}${topico}`, tratador);
  }
}

/** Repete a consulta ate ela devolver algo (a entrega pelas filas e' assincrona) ou estourar o prazo. */
export async function esperarPor<T>(consulta: () => Promise<T | null | undefined | false>, limiteMs = 5000): Promise<T> {
  const fim = Date.now() + limiteMs;
  for (;;) {
    const resultado = await consulta();
    if (resultado) return resultado;
    if (Date.now() > fim) throw new Error("Condicao nao atendida no prazo");
    await new Promise((r) => setTimeout(r, 50));
  }
}
