import { Observador } from "../../observers/Observador";
import { EventoRecomendacao } from "../../observers/EventoRecomendacao";
import { ProjetoDocumentario } from "../../domain/entities/ProjetoDocumentario";

export class NotificadorDocumentario implements Observador {
  constructor(private readonly saida: (mensagem: string) => void = console.log) {}

  atualizar(evento: EventoRecomendacao): void {
    const projeto = evento.projeto as ProjetoDocumentario;
    this.saida(
      `[DOCUMENTARIO] ${evento.papel}: ${evento.candidatos.length} candidato(s) para o tema "${projeto.tema}" ` +
        `(${projeto.entrevistados?.length ?? 0} entrevistado(s))`
    );
  }
}
