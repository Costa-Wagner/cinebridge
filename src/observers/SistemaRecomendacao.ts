import { Publicador } from "./Publicador";
import { Assinante } from "./Assinante";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";

export class SistemaRecomendacao implements Publicador {
  private readonly assinantes: Assinante[] = [];

  adicionarAssinante(assinante: Assinante): void {
    this.assinantes.push(assinante);
  }

  removerAssinante(assinante: Assinante): void {
    const indice = this.assinantes.indexOf(assinante);
    if (indice >= 0) this.assinantes.splice(indice, 1);
  }

  notificarAssinantes(evento: EventoRecomendacaoGerada): void {
    for (const assinante of this.assinantes) {
      assinante.atualizar(this, evento);
    }
  }
}