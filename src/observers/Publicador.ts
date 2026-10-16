import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

export interface Publicador {
  adicionarObservador(observador: Observador): void;
  removerObservador(observador: Observador): void;
  notificarObservadores(evento: EventoRecomendacao): void;
}