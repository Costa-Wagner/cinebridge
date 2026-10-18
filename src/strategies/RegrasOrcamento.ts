import {
  PontuacaoStrategy,
  ParametrosRecomendacao,
  ResultadoRecomendacao
} from "./PontuacaoStrategy";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";

function estaDisponivel(profissional: Profissional, projeto: Projeto): boolean {
  const entrega = new Date(projeto.dataEntrega).getTime();
  return (profissional.disponibilidade ?? []).some((janela) => {
    const inicio = new Date(janela.inicio).getTime();
    const fim = new Date(janela.fim).getTime();
    return entrega >= inicio && entrega <= fim;
  });
}

/**
 * Pontua candidatos com base em regras objetivas de orcamento:
 * penaliza profissionais cuja diaria comprometeria uma fatia alta do
 * orcamento total do projeto, e zera a pontuacao de quem nao esta
 * disponivel na janela de entrega. Diferente das outras strategies,
 * nao depende de historico nem de vetores de competencia - e' a
 * opcao pra quando o produtor quer priorizar viabilidade financeira.
 */
export class RegrasOrcamento implements PontuacaoStrategy {
  readonly nome = "REGRAS_ORCAMENTO";

  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[] {
    const { projeto, candidatos } = params;
    const limiteDiaria = Number(projeto.orcamentoTotal) * 0.05; // heuristica: 5% do orcamento por diaria e' saudavel

    return candidatos
      .map((profissional) => {
        if (!estaDisponivel(profissional, projeto)) {
          return { profissional, pontuacao: 0 };
        }

        const diaria = Number(profissional.precoBaseDiaria);
        const proporcao = diaria / limiteDiaria;
        // proporcao <= 1 => dentro do saudavel, pontuacao alta;
        // acima disso cai proporcionalmente, sem ficar negativa.
        const pontuacao = proporcao <= 1 ? 10 - proporcao * 2 : Math.max(0, 8 - proporcao * 4);

        return { profissional, pontuacao: Number(pontuacao.toFixed(2)) };
      })
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
