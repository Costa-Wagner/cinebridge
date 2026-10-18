import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";

export class ServicoMensagensInternas implements Observador {
  atualizar(evento: EventoRecomendacao): void {
    if (evento.tipo === TipoEvento.RECOMENDACAO_GERADA) {
      console.log(
        `[MENSAGEM_INTERNA] ${evento.candidatos.length} profissionais ranqueados para ${evento.papel}`
      );
      return;
    }
    const alvo = evento.papel ?? "equipe completa";
    console.log(`[MENSAGEM_INTERNA] ${evento.tipo} (${alvo}): ${evento.candidatos.map((c) => c.nome).join(", ")}`);
  }
}
