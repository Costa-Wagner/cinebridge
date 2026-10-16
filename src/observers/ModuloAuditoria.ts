import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

export class ModuloAuditoria implements Observador {
  atualizar(evento: EventoRecomendacao): void {
    console.log(
      `[AUDITORIA] ${new Date().toISOString()} recomendacao gerada — ` +
        `projeto=${evento.projeto.id} papel=${evento.papel} qtd=${evento.recomendacoes.length}`
    );
  }
}