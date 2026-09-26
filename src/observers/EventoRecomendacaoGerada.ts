import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Recomendacao } from "../domain/entities/Recomendacao";

export interface EventoRecomendacaoGerada {
  projeto: Projeto;
  papel: Papel;
  recomendacoes: Recomendacao[];
}