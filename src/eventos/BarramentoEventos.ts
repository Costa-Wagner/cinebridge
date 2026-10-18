import { EventEmitter } from "events";

export const TOPICO_EQUIPE_FORMADA = "equipe.formada";

export interface EquipeFormadaPayload {
  projetoId: string;
  tipoCaptacao: string;
  orcamentoTotal: number;
  membros: { papel: string; profissionalId: string; nome: string }[];
}

/**
 * Canal entre os servicos internos. Hoje em memoria (EventEmitter do Node);
 * depois pode ser trocado por RabbitMQ implementando esta interface, sem
 * mudar quem publica nem quem assina.
 */
export interface BarramentoEventos {
  publicar(topico: string, payload: unknown): void;
  assinar(topico: string, tratador: (payload: any) => void): void;
}

export class BarramentoEmMemoria implements BarramentoEventos {
  private readonly emissor = new EventEmitter();

  publicar(topico: string, payload: unknown): void {
    this.emissor.emit(topico, payload);
  }

  /** Um tratador com falha nao derruba o publicador nem os outros tratadores. */
  assinar(topico: string, tratador: (payload: any) => void): void {
    this.emissor.on(topico, (payload) => {
      try {
        tratador(payload);
      } catch (erro) {
        console.error(`[BARRAMENTO] tratador de ${topico} falhou:`, erro);
      }
    });
  }
}
