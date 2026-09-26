import { Assinante } from "./Assinante";
import { Publicador } from "./Publicador";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";

export class ServicoMensagensInternas implements Assinante {
  atualizar(_publicador: Publicador, evento: EventoRecomendacaoGerada): void {
    console.log(
      `[MENSAGEM_INTERNA] ${evento.recomendacoes.length} profissionais ranqueados para ${evento.papel}`
    );
  }
}