import { Assinante } from "./Assinante";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";

export interface Publicador {
  adicionarAssinante(assinante: Assinante): void;
  removerAssinante(assinante: Assinante): void;
  notificarAssinantes(evento: EventoRecomendacaoGerada): void;
}