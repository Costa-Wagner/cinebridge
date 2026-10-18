import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";

/**
 * Em producao dispararia um email real. Aqui, sem infra de email
 * configurada, o efeito e' logado - o ponto de extensao (substituir o corpo
 * de `atualizar`) e' o que importa pra demonstrar o desacoplamento do Observer.
 */
export class ServicoEmail implements Observador {
  atualizar(evento: EventoRecomendacao): void {
    const projeto = `"${evento.projeto.genero}"`;
    const nome = evento.candidatos[0]?.nome ?? "nenhum";
    switch (evento.tipo) {
      case TipoEvento.RECOMENDACAO_GERADA:
        console.log(
          `[EMAIL] Nova recomendacao para o papel ${evento.papel} do projeto ${projeto}: melhor candidato ${nome}`
        );
        break;
      case TipoEvento.CONVITE_ENVIADO:
        console.log(`[EMAIL] Para ${nome}: convite para ${evento.papel} no projeto ${projeto}`);
        break;
      case TipoEvento.CONVITE_ACEITO:
        console.log(`[EMAIL] Para o produtor: ${nome} aceitou o convite para ${evento.papel} (projeto ${projeto})`);
        break;
      case TipoEvento.CONVITE_RECUSADO:
        console.log(`[EMAIL] Para o produtor: ${nome} recusou o convite para ${evento.papel} (projeto ${projeto})`);
        break;
      case TipoEvento.MEMBRO_SUBSTITUIDO:
        console.log(`[EMAIL] Para ${nome}: o produtor optou por outro profissional para ${evento.papel} (projeto ${projeto})`);
        break;
      case TipoEvento.EQUIPE_FORMADA:
        console.log(`[EMAIL] Para o produtor: equipe do projeto ${projeto} formada com ${evento.candidatos.length} membro(s)`);
        break;
    }
  }
}
