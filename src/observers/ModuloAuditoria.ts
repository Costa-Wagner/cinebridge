import { Assinante } from "./Assinante";
import { Publicador } from "./Publicador";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";

export class ModuloAuditoria implements Assinante {
  atualizar(_publicador: Publicador, evento: EventoRecomendacaoGerada): void {
    console.log(
      `[AUDITORIA] ${new Date().toISOString()} recomendacao gerada — ` +
        `projeto=${evento.projeto.id} papel=${evento.papel} qtd=${evento.recomendacoes.length}`
    );
  }
}