import {
  PontuacaoStrategy,
  ParametrosRecomendacao,
  ResultadoRecomendacao
} from "./PontuacaoStrategy";
import { PERFIL_IDEAL_PAPEL } from "../config/perfilPapel";
import { Profissional } from "../domain/entities/Profissional";

function vetorDoProfissional(profissional: Profissional): Map<string, number> {
  const vetor = new Map<string, number>();
  for (const vinculo of profissional.competencias ?? []) {
    vetor.set(vinculo.competencia.nome, Number(vinculo.nivel));
  }
  return vetor;
}

function similaridadeCosseno(
  vetorA: Map<string, number>,
  vetorB: Record<string, number>
): number {
  const chaves = new Set([...vetorA.keys(), ...Object.keys(vetorB)]);
  let produtoInterno = 0;
  let normaA = 0;
  let normaB = 0;

  for (const chave of chaves) {
    const a = vetorA.get(chave) ?? 0;
    const b = vetorB[chave] ?? 0;
    produtoInterno += a * b;
    normaA += a * a;
    normaB += b * b;
  }

  if (normaA === 0 || normaB === 0) return 0;
  return produtoInterno / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

/**
 * Ranqueia candidatos pela similaridade de cosseno entre o vetor de
 * competencias do profissional e o perfil ideal do papel solicitado.
 * Pontuacao normalizada de 0 a 10.
 * responde: "o profissional tem as habilidades técnicas certas pra esse papel?"
 */
export class SimilaridadeCosseno implements PontuacaoStrategy {
  readonly nome = "SIMILARIDADE_COSSENO";

  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[] {
    const perfilIdeal = PERFIL_IDEAL_PAPEL[params.papel];

    return params.candidatos
      .map((profissional) => {
        const vetor = vetorDoProfissional(profissional);
        const similaridade = similaridadeCosseno(vetor, perfilIdeal);
        return { profissional, pontuacao: Number((similaridade * 10).toFixed(2)) };
      })
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
