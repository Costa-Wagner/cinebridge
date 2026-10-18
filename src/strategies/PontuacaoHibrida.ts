import {
  ParametrosRecomendacao,
  PontuacaoStrategy,
  ResultadoRecomendacao
} from "./PontuacaoStrategy";
import { Profissional } from "../domain/entities/Profissional";

export interface ComponenteHibrido {
  estrategia: PontuacaoStrategy;
  peso: number;
}

/**
 * Combina varias strategies numa media ponderada das pontuacoes. Permite,
 * por exemplo, unir aderencia ao papel (cosseno) com reputacao (filtragem
 * colaborativa) sem alterar nenhuma das duas.
 */
export class PontuacaoHibrida implements PontuacaoStrategy {
  readonly nome: string;

  constructor(private readonly componentes: ComponenteHibrido[]) {
    this.nome = componentes.map((c) => `${c.estrategia.nome}x${c.peso}`).join("+");
  }

  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[] {
    const somaPesos = this.componentes.reduce((soma, c) => soma + c.peso, 0);
    const acumulado = new Map<string, { profissional: Profissional; total: number }>();

    for (const { estrategia, peso } of this.componentes) {
      for (const { profissional, pontuacao } of estrategia.recomendar(params)) {
        const atual = acumulado.get(profissional.id) ?? { profissional, total: 0 };
        atual.total += pontuacao * peso;
        acumulado.set(profissional.id, atual);
      }
    }

    return [...acumulado.values()]
      .map(({ profissional, total }) => ({ profissional, pontuacao: total / somaPesos }))
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }
}
