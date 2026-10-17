import {
  ParametrosRecomendacao,
  PontuacaoStrategy,
  ResultadoRecomendacao
} from "../../strategies/PontuacaoStrategy";
import { SimilaridadeCosseno } from "../../strategies/SimilaridadeCosseno";
import { Profissional } from "../../domain/entities/Profissional";
import { ProjetoAnimacao } from "../../domain/entities/ProjetoAnimacao";

const BONUS_MAXIMO = 2;
const PONTUACAO_MAXIMA = 10;

function bonusDoSoftware(profissional: Profissional, software: string): number {
  const alvo = software.trim().toLowerCase();
  if (!alvo) return 0;
  const vinculo = (profissional.competencias ?? []).find((v) =>
    v.competencia.nome.toLowerCase().includes(alvo)
  );
  return vinculo ? Math.min(BONUS_MAXIMO, (Number(vinculo.nivel) / 10) * BONUS_MAXIMO) : 0;
}

/**
 * Animacao: parte da similaridade de cosseno e acrescenta um bonus (ate 2
 * pontos) a quem domina o software de modelagem do projeto.
 */
export class PontuacaoAnimacao implements PontuacaoStrategy {
  readonly nome = "COSSENO_MODELAGEM_3D";

  constructor(private readonly base: PontuacaoStrategy = new SimilaridadeCosseno()) {}

  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[] {
    const software = (params.projeto as ProjetoAnimacao).softwareModelagem ?? "";
    return this.base
      .recomendar(params)
      .map((r) => ({
        profissional: r.profissional,
        pontuacao: Math.min(PONTUACAO_MAXIMA, r.pontuacao + bonusDoSoftware(r.profissional, software))
      }))
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
