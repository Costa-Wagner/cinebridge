import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";
import { PERFIL_IDEAL_PAPEL } from "../config/perfilPapel";
import { PontuacaoStrategy, ResultadoRecomendacao } from "./PontuacaoStrategy";
import { RecomendacaoStrategy } from "./RecomendacaoStrategy";

export function ehCandidatoElegivel(profissional: Profissional, papel: Papel): boolean {
  const competenciasDoPapel = new Set(Object.keys(PERFIL_IDEAL_PAPEL[papel]));
  return (profissional.competencias ?? []).some((v) =>
    competenciasDoPapel.has(v.competencia.nome)
  );
}

/**
 * Adaptador: encaixa um algoritmo de pontuacao (PontuacaoStrategy, da AV1)
 * no contrato RecomendacaoStrategy do diagrama da AV2.
 */
export class RecomendadorPorPontuacao implements RecomendacaoStrategy {
  constructor(private readonly pontuador: PontuacaoStrategy) {}

  rankingDetalhado(
    projeto: Projeto,
    profissionais: Profissional[]
  ): Map<Papel, ResultadoRecomendacao[]> {
    const ranking = new Map<Papel, ResultadoRecomendacao[]>();
    for (const { papel } of projeto.papeisObrigatorios) {
      const candidatos = profissionais.filter((p) => ehCandidatoElegivel(p, papel));
      ranking.set(papel, this.pontuador.recomendar({ projeto, papel, candidatos }));
    }
    return ranking;
  }

  recomendar(projeto: Projeto, profissionais: Profissional[]): Map<Papel, Profissional[]> {
    const resultado = new Map<Papel, Profissional[]>();
    for (const [papel, ranking] of this.rankingDetalhado(projeto, profissionais)) {
      resultado.set(papel, ranking.map((r) => r.profissional));
    }
    return resultado;
  }
}
