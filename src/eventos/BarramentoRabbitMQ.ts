import { BarramentoEventos } from "./BarramentoEventos";
import { CanalMensageria } from "../mensageria/CanalMensageria";

/**
 * Barramento sobre RabbitMQ: cada topico e' uma fila duravel de mesmo nome
 * (ponto a ponto: um servico consome cada topico).
 */
export class BarramentoRabbitMQ implements BarramentoEventos {
  private readonly declaradas = new Set<string>();

  constructor(private readonly canal: CanalMensageria) {}

  async publicar(topico: string, payload: unknown): Promise<void> {
    await this.garantirFila(topico);
    await this.canal.publicar(topico, payload);
  }

  async assinar(topico: string, tratador: (payload: any) => void | Promise<void>): Promise<void> {
    await this.garantirFila(topico);
    await this.canal.consumir(topico, (mensagem) => tratador(mensagem.corpo));
  }

  private async garantirFila(topico: string): Promise<void> {
    if (this.declaradas.has(topico)) return;
    await this.canal.declararFila(topico);
    this.declaradas.add(topico);
  }
}
