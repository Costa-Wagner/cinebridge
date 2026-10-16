import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";

export interface EventoRecomendacao {
  projeto: Projeto;
  papel: Papel;
  /** Candidatos ja ranqueados, melhor primeiro. */
  candidatos: Profissional[];
}
