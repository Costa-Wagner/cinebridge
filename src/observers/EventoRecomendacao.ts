import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { TipoEvento } from "./TipoEvento";

export interface EventoRecomendacao {
  tipo: TipoEvento;
  projeto: Projeto;
  /** Papel afetado; nulo nos eventos da equipe inteira (EQUIPE_FORMADA). */
  papel: Papel | null;
  /**
   * RECOMENDACAO_GERADA: candidatos ja ranqueados, melhor primeiro.
   * Convites e substituicao: o profissional envolvido.
   * EQUIPE_FORMADA: os membros confirmados.
   */
  candidatos: Profissional[];
}
