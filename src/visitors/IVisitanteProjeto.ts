import type { Projeto } from "../domain/entities/Projeto";
import type { Profissional } from "../domain/entities/Profissional";

/**
 * Visitor: cada operacao transversal sobre a arvore Projeto/Profissional
 * (validacao, calculo, geracao de relatorio) vira uma implementacao
 * concreta dessa interface, sem precisar alterar as entidades a cada
 * nova operacao.
 */
export interface IVisitanteProjeto {
  visitarProjeto(projeto: Projeto): void;
  visitarProfissional(profissional: Profissional): void;
}