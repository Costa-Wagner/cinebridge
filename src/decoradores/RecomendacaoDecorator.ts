import type { Papel } from "../domain/enums/Papel";
import type { Profissional } from "../domain/entities/Profissional";
import type { Projeto } from "../domain/entities/Projeto";
import type { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";

/** Decorator base: implementa o mesmo contrato do componente que envolve e delega por padrao. */
export abstract class RecomendacaoDecorator implements RecomendacaoStrategy {
  constructor(readonly interno: RecomendacaoStrategy) {}

  recomendar(projeto: Projeto, profissionais: Profissional[]): Map<Papel, Profissional[]> {
    return this.interno.recomendar(projeto, profissionais);
  }
}

/** Desembrulha a pilha ate' o recomendador de verdade (o que importa para registrar "estrategia utilizada"). */
export function estrategiaBase(estrategia: RecomendacaoStrategy): RecomendacaoStrategy {
  let atual = estrategia;
  while (atual instanceof RecomendacaoDecorator) atual = atual.interno;
  return atual;
}

export function nomeDaEstrategia(estrategia: RecomendacaoStrategy): string {
  return estrategiaBase(estrategia).constructor.name;
}
