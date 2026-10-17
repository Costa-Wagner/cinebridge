import { RecomendadorPorPontuacao } from "../../strategies/RecomendadorPorPontuacao";
import { RegrasOrcamento } from "../../strategies/RegrasOrcamento";

/** Publicitario: prioriza viabilidade financeira e disponibilidade na entrega. */
export class RecomendadorPublicitario extends RecomendadorPorPontuacao {
  constructor() {
    super(new RegrasOrcamento(), 5);
  }
}
