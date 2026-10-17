import { RecomendadorPorPontuacao } from "../../strategies/RecomendadorPorPontuacao";
import { PontuacaoAnimacao } from "./PontuacaoAnimacao";

/** Animacao: prioriza habilidades no software de modelagem do projeto. */
export class RecomendadorAnimacao extends RecomendadorPorPontuacao {
  constructor() {
    super(new PontuacaoAnimacao(), 5);
  }
}
