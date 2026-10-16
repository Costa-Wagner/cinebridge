import { Publicador } from "./Publicador";
import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

export class SistemaRecomendacao implements Publicador {
  private readonly observadores: Observador[] = [];

  adicionarObservador(observador: Observador): void {
    this.observadores.push(observador);
  }

  removerObservador(observador: Observador): void {
    const indice = this.observadores.indexOf(observador);
    if (indice >= 0) this.observadores.splice(indice, 1);
  }

  notificarObservadores(evento: EventoRecomendacao): void {
    for (const observador of this.observadores) {
      observador.atualizar(evento);
    }
  }
}