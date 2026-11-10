import { CanalMensageria, MensagemMQ, MetadadosMQ, TratadorMQ } from "./CanalMensageria";

/** Implementacao em memoria do canal, para testes e para rodar sem broker. Entrega dentro do proprio publicar. */
export class CanalEmMemoria implements CanalMensageria {
  private readonly pendentes = new Map<string, MensagemMQ[]>();
  private readonly consumidores = new Map<string, TratadorMQ>();

  async declararFila(fila: string): Promise<void> {
    if (!this.pendentes.has(fila)) this.pendentes.set(fila, []);
  }

  async publicar(fila: string, corpo: unknown, meta: MetadadosMQ = {}): Promise<void> {
    const pendentes = this.pendentes.get(fila);
    if (!pendentes) return; // como no AMQP: fila inexistente descarta a mensagem
    const mensagem: MensagemMQ = { corpo: JSON.parse(JSON.stringify(corpo ?? null)), ...meta };
    const consumidor = this.consumidores.get(fila);
    if (consumidor) await this.entregar(fila, consumidor, mensagem);
    else pendentes.push(mensagem);
  }

  async consumir(fila: string, tratador: TratadorMQ): Promise<void> {
    const pendentes = this.pendentes.get(fila);
    if (!pendentes) throw new Error(`Fila inexistente: ${fila}`);
    this.consumidores.set(fila, tratador);
    while (pendentes.length > 0) await this.entregar(fila, tratador, pendentes.shift() as MensagemMQ);
  }

  async fechar(): Promise<void> {
    this.consumidores.clear();
  }

  /** Falha no tratador nao chega ao publicador (equivale ao nack sem reenfileirar). */
  private async entregar(fila: string, tratador: TratadorMQ, mensagem: MensagemMQ): Promise<void> {
    try {
      await tratador(mensagem);
    } catch (erro) {
      console.error(`[CANAL_MEMORIA] tratador de ${fila} falhou:`, erro);
    }
  }
}
