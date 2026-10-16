import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";

export interface ResultadoRecomendacao {
  profissional: Profissional;
  pontuacao: number;
}

export interface ParametrosRecomendacao {
  projeto: Projeto;
  papel: Papel;
  candidatos: Profissional[];
}

/**
 * Contrato do Strategy. Cada algoritmo concreto encapsula uma forma
 * diferente de pontuar/ranquear profissionais candidatos a um papel,
 * mantendo a mesma assinatura pra ser trocado em tempo de execucao
 * (na criacao do projeto ou por escolha do produtor).
 */
export interface PontuacaoStrategy {
  readonly nome: string;
  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[];
}
