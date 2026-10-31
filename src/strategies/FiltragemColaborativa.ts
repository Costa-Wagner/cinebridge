import {
  PontuacaoStrategy,
  ParametrosRecomendacao,
  ResultadoRecomendacao
} from "./PontuacaoStrategy";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Profissional } from "../domain/entities/Profissional";
import { criarMemo } from "./memoPorProfissional";

/** Parte da pontuacao que depende so' do historico do profissional. */
const baseDe = criarMemo<number>((profissional) => {
  const avaliacoes = profissional.avaliacoes ?? [];
  const media =
    avaliacoes.length === 0
      ? 5 // neutro, sem historico
      : avaliacoes.reduce((acc, av) => acc + Number(av.nota), 0) / avaliacoes.length;
  const confiabilidade = Math.min(1, avaliacoes.length / 5); // satura a confianca com 5+ avaliacoes
  return media * (0.7 + 0.3 * confiabilidade);
});

/** Convites aceitos por genero de projeto, para o bonus de afinidade. */
const aceitosPorGenero = criarMemo<Map<string, number>>((profissional) => {
  const contagem = new Map<string, number>();
  for (const convite of profissional.convites ?? []) {
    const genero = convite.projeto?.genero;
    if (convite.status === StatusConvite.ACEITO && genero !== undefined) {
      contagem.set(genero, (contagem.get(genero) ?? 0) + 1);
    }
  }
  return contagem;
});

function afinidadeGenero(profissional: Profissional, genero: string): number {
  return Math.min(1, (aceitosPorGenero(profissional).get(genero) ?? 0) / 3); // ate 1 ponto de bonus
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
        const base = baseDe(profissional);
        const bonus = afinidadeGenero(profissional, projeto.genero);
        const pontuacao = Math.min(10, base + bonus);
        return { profissional, pontuacao: Number(pontuacao.toFixed(2)) };
      })
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
