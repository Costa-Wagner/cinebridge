import { RecomendadorPorPontuacao } from "../../strategies/RecomendadorPorPontuacao";
import { FiltragemColaborativa } from "../../strategies/FiltragemColaborativa";

/** Documentario: pesa o historico de avaliacoes (filtragem colaborativa). */
export class RecomendadorDocumentario extends RecomendadorPorPontuacao {
  constructor() {
    super(new FiltragemColaborativa(), 5);
  }
}
