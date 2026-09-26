import { Publicador } from "./Publicador";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";

/**
 * Observer: cada assinante concreto reage a novas recomendacoes de forma
 * independente (envio de email, mensageria interna, auditoria...), sem
 * que o publicador precise conhecer os detalhes de cada um.
 */
export interface Assinante {
  atualizar(publicador: Publicador, evento: EventoRecomendacaoGerada): void;
}