import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

/**
 * Em producao dispararia um email real (ex: pro produtor do projeto).
 * Aqui, sem infra de email configurada, o efeito e' logado - o ponto
 * de extensao (substituir o corpo de `atualizar`) e' o que importa
 * pra demonstrar o desacoplamento do Observer.
 */
export class ServicoEmail implements Observador {
  atualizar(evento: EventoRecomendacao): void {
    const top = evento.recomendacoes[0];
    console.log(
      `[EMAIL] Nova recomendacao para o papel ${evento.papel} do projeto "${evento.projeto.genero}": ` +
        `melhor candidato ${top?.profissional.nome ?? "nenhum"} (${top?.pontuacao ?? "-"})`
    );
  }
}
