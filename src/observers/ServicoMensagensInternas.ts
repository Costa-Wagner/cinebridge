import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

export class ServicoMensagensInternas implements Observador {
  atualizar(evento: EventoRecomendacao): void {
    console.log(
      `[MENSAGEM_INTERNA] ${evento.candidatos.length} profissionais ranqueados para ${evento.papel}`
    );
  }
}