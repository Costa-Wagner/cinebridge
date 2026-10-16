import type { Papel } from "../domain/enums/Papel";
import type { Profissional } from "../domain/entities/Profissional";
import type { Projeto } from "../domain/entities/Projeto";

/**
 * Contrato do Strategy no diagrama da AV2: recebe o projeto e os
 * profissionais disponiveis e devolve, por papel, os candidatos ja
 * ranqueados (melhor primeiro).
 */
export interface RecomendacaoStrategy {
  recomendar(projeto: Projeto, profissionais: Profissional[]): Map<Papel, Profissional[]>;
}
