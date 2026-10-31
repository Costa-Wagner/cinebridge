import {
  PontuacaoStrategy,
  ParametrosRecomendacao,
  ResultadoRecomendacao
} from "./PontuacaoStrategy";
import { PERFIL_IDEAL_PAPEL } from "../config/perfilPapel";
import { Papel } from "../domain/enums/Papel";
import { criarMemo } from "./memoPorProfissional";

interface VetorProfissional {
  competencias: Map<string, number>;
  norma: number;
}

const vetorDe = criarMemo<VetorProfissional>((profissional) => {
  const competencias = new Map<string, number>();
  for (const vinculo of profissional.competencias ?? []) {
    competencias.set(vinculo.competencia.nome, Number(vinculo.nivel));
  }
  let soma = 0;
  for (const nivel of competencias.values()) soma += nivel * nivel;
  return { competencias, norma: Math.sqrt(soma) };
});

interface PerfilPreparado {
  pesos: [string, number][];
  norma: number;
}

const perfisPreparados = new Map<Papel, PerfilPreparado>();

function perfilDe(papel: Papel): PerfilPreparado {
  let perfil = perfisPreparados.get(papel);
  if (!perfil) {
    const pesos = Object.entries(PERFIL_IDEAL_PAPEL[papel]);
    perfil = { pesos, norma: Math.sqrt(pesos.reduce((soma, [, peso]) => soma + peso * peso, 0)) };
    perfisPreparados.set(papel, perfil);
  }
  return perfil;
}

/** Cosseno so' percorre as competencias do perfil: as demais nao entram no produto interno. */
function similaridadeCosseno(vetor: VetorProfissional, perfil: PerfilPreparado): number {
  if (vetor.norma === 0 || perfil.norma === 0) return 0;
  let produtoInterno = 0;
  for (const [competencia, peso] of perfil.pesos) {
    produtoInterno += (vetor.competencias.get(competencia) ?? 0) * peso;
  }
  return produtoInterno / (vetor.norma * perfil.norma);
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
    const perfil = perfilDe(params.papel);

    return params.candidatos
      .map((profissional) => {
        const similaridade = similaridadeCosseno(vetorDe(profissional), perfil);
        return { profissional, pontuacao: Number((similaridade * 10).toFixed(2)) };
      })
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
