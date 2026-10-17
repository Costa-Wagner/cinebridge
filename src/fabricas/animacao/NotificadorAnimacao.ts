import { Observador } from "../../observers/Observador";
import { EventoRecomendacao } from "../../observers/EventoRecomendacao";
import { ProjetoAnimacao } from "../../domain/entities/ProjetoAnimacao";

export class NotificadorAnimacao implements Observador {
  constructor(private readonly saida: (mensagem: string) => void = console.log) {}

  atualizar(evento: EventoRecomendacao): void {
    const projeto = evento.projeto as ProjetoAnimacao;
    const metricas = (projeto.metricasRenderizacao ?? []).join(", ") || "nenhuma";
    this.saida(
      `[ANIMACAO] ${evento.papel}: ${evento.candidatos.length} candidato(s) (${projeto.softwareModelagem}); ` +
        `metricas de renderizacao: ${metricas}`
    );
  }
}
