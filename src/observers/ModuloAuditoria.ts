import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";

export class ModuloAuditoria implements Observador {
  atualizar(evento: EventoRecomendacao): void {
    const acao =
      evento.tipo === TipoEvento.RECOMENDACAO_GERADA ? "recomendacao gerada" : evento.tipo.toLowerCase();
    console.log(
      `[AUDITORIA] ${new Date().toISOString()} ${acao} — ` +
        `projeto=${evento.projeto.id} papel=${evento.papel ?? "-"} qtd=${evento.candidatos.length}`
    );
  }
}
