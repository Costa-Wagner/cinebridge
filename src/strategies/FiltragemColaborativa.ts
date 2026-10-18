import {
  PontuacaoStrategy,
  ParametrosRecomendacao,
  ResultadoRecomendacao
} from "./PontuacaoStrategy";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Profissional } from "../domain/entities/Profissional";

function mediaAvaliacoes(profissional: Profissional): number {
  const avaliacoes = profissional.avaliacoes ?? [];
  if (avaliacoes.length === 0) return 5; // neutro, sem historico
  const soma = avaliacoes.reduce((acc, av) => acc + Number(av.nota), 0);
  return soma / avaliacoes.length;
}

function confiabilidade(profissional: Profissional): number {
  const quantidade = (profissional.avaliacoes ?? []).length;
  return Math.min(1, quantidade / 5); // satura a confianca com 5+ avaliacoes
}

function afinidadeGenero(profissional: Profissional, genero: string): number {
  const convitesAceitos = (profissional.convites ?? []).filter(
    (c) => c.status === StatusConvite.ACEITO && c.projeto?.genero === genero
  );
  return Math.min(1, convitesAceitos.length / 3); // ate 1 ponto de bonus
}

/**
 * Pontua candidatos combinando a media das avaliacoes historicas
 * (ponderada pela quantidade de avaliacoes, pra evitar que uma unica
 * nota alta domine) com um bonus de afinidade: profissionais que ja
 * atuaram com sucesso em projetos do mesmo genero recebem reforco,
 * simulando o comportamento colaborativo ("gente parecida com voce
 * recomendou bem esse profissional pra esse tipo de projeto").
 * responde: "esse profissional entrega um trabalho bom, historicamente?"
 */
export class FiltragemColaborativa implements PontuacaoStrategy {
  readonly nome = "FILTRAGEM_COLABORATIVA";

  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[] {
    const { projeto, candidatos } = params;

    return candidatos
      .map((profissional) => {
        const base = mediaAvaliacoes(profissional) * (0.7 + 0.3 * confiabilidade(profissional));
        const bonus = afinidadeGenero(profissional, projeto.genero);
        const pontuacao = Math.min(10, base + bonus);
        return { profissional, pontuacao: Number(pontuacao.toFixed(2)) };
      })
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
