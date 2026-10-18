import { RecomendadorPorPontuacao } from "../../strategies/RecomendadorPorPontuacao";
import { PontuacaoHibrida } from "../../strategies/PontuacaoHibrida";
import { SimilaridadeCosseno } from "../../strategies/SimilaridadeCosseno";
import { FiltragemColaborativa } from "../../strategies/FiltragemColaborativa";

/** Documentario: aderencia ao papel (60%) com peso extra para o historico de avaliacoes (40%). */
export class RecomendadorDocumentario extends RecomendadorPorPontuacao {
  constructor() {
    super(
      new PontuacaoHibrida([
        { estrategia: new SimilaridadeCosseno(), peso: 0.6 },
        { estrategia: new FiltragemColaborativa(), peso: 0.4 }
      ]),
      5
    );
  }
}
