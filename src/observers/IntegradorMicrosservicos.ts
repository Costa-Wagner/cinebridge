import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";
import { BarramentoEventos, EquipeFormadaPayload, TOPICO_EQUIPE_FORMADA } from "../eventos/BarramentoEventos";

/** Observador que leva a composicao final da equipe para os outros microsservicos. */
export class IntegradorMicrosservicos implements Observador {
  constructor(private readonly barramento: BarramentoEventos) {}

  atualizar(evento: EventoRecomendacao): void {
    if (evento.tipo !== TipoEvento.EQUIPE_FORMADA) return;
    const payload: EquipeFormadaPayload = {
      projetoId: evento.projeto.id,
      tipoCaptacao: evento.projeto.tipoCaptacao,
      orcamentoTotal: Number(evento.projeto.orcamentoTotal),
      membros: (evento.projeto.equipe?.membros ?? []).map((m) => ({
        papel: m.papel,
        profissionalId: m.profissional.id,
        nome: m.profissional.nome
      }))
    };
    this.barramento.publicar(TOPICO_EQUIPE_FORMADA, payload);
  }
}
