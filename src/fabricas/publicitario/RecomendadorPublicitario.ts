import { RecomendadorPorPontuacao } from "../../strategies/RecomendadorPorPontuacao";
import { PontuacaoHibrida } from "../../strategies/PontuacaoHibrida";
import { SimilaridadeCosseno } from "../../strategies/SimilaridadeCosseno";
import { RegrasOrcamento } from "../../strategies/RegrasOrcamento";

/** Publicitario: viabilidade financeira e disponibilidade (50%) alem da aderencia ao papel (50%). */
export class RecomendadorPublicitario extends RecomendadorPorPontuacao {
  constructor() {
    super(
      new PontuacaoHibrida([
        { estrategia: new SimilaridadeCosseno(), peso: 0.5 },
        { estrategia: new RegrasOrcamento(), peso: 0.5 }
      ]),
      5
    );
  }
}
