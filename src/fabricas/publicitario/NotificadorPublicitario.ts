import { Observador } from "../../observers/Observador";
import { EventoRecomendacao } from "../../observers/EventoRecomendacao";
import { ProjetoPublicitario } from "../../domain/entities/ProjetoPublicitario";

export class NotificadorPublicitario implements Observador {
  constructor(private readonly saida: (mensagem: string) => void = console.log) {}

  atualizar(evento: EventoRecomendacao): void {
    const projeto = evento.projeto as ProjetoPublicitario;
    this.saida(
      `[PUBLICITARIO] ${evento.papel}: ${evento.candidatos.length} candidato(s) para o cliente ` +
        `${projeto.cliente} (canal: ${projeto.canal})`
    );
  }
}
