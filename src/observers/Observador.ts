import { EventoRecomendacao } from "./EventoRecomendacao";

/**
 * Observer: cada observador concreto reage a novas recomendacoes de forma
 * independente (envio de email, mensageria interna, auditoria...), sem
 * que o publicador precise conhecer os detalhes de cada um.
 */
export interface Observador {
  atualizar(evento: EventoRecomendacao): void;
}