import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Recomendacao } from "../domain/entities/Recomendacao";

export interface EventoRecomendacao {
  projeto: Projeto;
  papel: Papel;
  recomendacoes: Recomendacao[];
}