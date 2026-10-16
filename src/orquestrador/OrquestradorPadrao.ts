import { OrquestradorEquipe } from "./OrquestradorEquipe";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import {
  PontuacaoStrategy,
  ResultadoRecomendacao
} from "../strategies/PontuacaoStrategy";
import { SimilaridadeCosseno } from "../strategies/SimilaridadeCosseno";
import { Publicador } from "../observers/Publicador";

/**
 * Implementacao concreta do Template Method: usa a mesma strategy pra
 * todos os papeis (configuravel por injecao) e seleciona sempre o
 * candidato com maior pontuacao, desde que atinja uma pontuacao minima
 * (evita convidar alguem claramente incompativel so' porque foi o
 * "menos pior" da lista).
 */
export class OrquestradorPadrao extends OrquestradorEquipe {
  constructor(
    private readonly estrategia: PontuacaoStrategy = new SimilaridadeCosseno(),
    private readonly pontuacaoMinima: number = 5,
    publicador?: Publicador
  ) {
    super(publicador);
  }

  protected obterEstrategia(_papel: Papel): PontuacaoStrategy {
    return this.estrategia;
  }

  protected selecionarCandidato(
    resultados: ResultadoRecomendacao[],
    _papel: Papel
  ): Profissional | null {
    const melhor = resultados[0];
    if (!melhor || melhor.pontuacao < this.pontuacaoMinima) return null;
    return melhor.profissional;
  }
}