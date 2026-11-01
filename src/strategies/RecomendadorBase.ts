import { PontuacaoStrategy } from "./PontuacaoStrategy";
import { PontuacaoHibrida } from "./PontuacaoHibrida";
import { SimilaridadeCosseno } from "./SimilaridadeCosseno";
import { FiltragemColaborativa } from "./FiltragemColaborativa";
import { RecomendadorPorPontuacao } from "./RecomendadorPorPontuacao";

/**
 * Componente concreto do Decorator: a logica principal de recomendacao da AV1
 * (ranking por pontuacao, hibrido de cosseno e filtragem colaborativa por padrao).
 * Reaproveita RecomendadorPorPontuacao para nao duplicar o algoritmo; os
 * recomendadores de cada tipo de projeto seguem a mesma base.
 */
export class RecomendadorBase extends RecomendadorPorPontuacao {
  constructor(
    pontuador: PontuacaoStrategy = new PontuacaoHibrida([
      { estrategia: new SimilaridadeCosseno(), peso: 0.6 },
      { estrategia: new FiltragemColaborativa(), peso: 0.4 }
    ]),
    pontuacaoMinima: number = 0
  ) {
    super(pontuador, pontuacaoMinima);
  }
}
