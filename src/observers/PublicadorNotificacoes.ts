import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { BarramentoEventos } from "../eventos/BarramentoEventos";
import { EventoNotificacaoPayload, FILA_EVENTOS_NOTIFICACOES } from "../eventos/eventosNotificacao";

/**
 * Observador usado quando as notificacoes sao um servico a parte (cinebridge-notificacoes):
 * em vez de enviar e-mail/mensagem localmente, leva o evento para a fila.
 */
export class PublicadorNotificacoes implements Observador {
  constructor(private readonly barramento: BarramentoEventos, private readonly agora: () => Date = () => new Date()) {}

  atualizar(evento: EventoRecomendacao): void {
    const payload: EventoNotificacaoPayload = {
      tipo: evento.tipo,
      projetoId: evento.projeto.id,
      genero: evento.projeto.genero,
      papel: evento.papel,
      totalCandidatos: evento.candidatos.length,
      profissionais: evento.candidatos.slice(0, 10).map((c) => ({ id: c.id, nome: c.nome, email: c.email })),
      ocorridoEm: this.agora().toISOString()
    };
    Promise.resolve(this.barramento.publicar(FILA_EVENTOS_NOTIFICACOES, payload)).catch((erro) =>
      console.error(`[NOTIFICACOES] falha ao publicar ${evento.tipo}:`, erro)
    );
  }
}
