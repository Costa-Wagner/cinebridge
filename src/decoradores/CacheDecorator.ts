import type { Papel } from "../domain/enums/Papel";
import type { Profissional } from "../domain/entities/Profissional";
import type { Projeto } from "../domain/entities/Projeto";
import type { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { ArmazemCache } from "./ArmazemCache";
import { RecomendacaoDecorator, nomeDaEstrategia } from "./RecomendacaoDecorator";

type Resultado = Map<Papel, Profissional[]>;

/**
 * Reaproveita o resultado de requisicoes equivalentes. A chave usa apenas o que as
 * strategies leem (tipo, genero, orcamento, entrega, papeis com peso) e os ids dos
 * candidatos; ids novos ou diferentes geram outra chave. Mudancas nos dados de um
 * mesmo candidato (ex.: nova avaliacao) so' aparecem apos a validade do cache.
 */
export class CacheDecorator extends RecomendacaoDecorator {
  acertos = 0;
  falhas = 0;

  constructor(interno: RecomendacaoStrategy, private readonly armazem: ArmazemCache<Resultado>) {
    super(interno);
  }

  static chave(estrategia: RecomendacaoStrategy, projeto: Projeto, profissionais: Profissional[]): string {
    return JSON.stringify([
      nomeDaEstrategia(estrategia),
      projeto.tipoCaptacao,
      projeto.genero,
      projeto.orcamentoTotal,
      projeto.dataEntrega,
      projeto.papeisObrigatorios.map((p) => [p.papel, p.peso]),
      profissionais.map((p) => p.id).sort()
    ]);
  }

  recomendar(projeto: Projeto, profissionais: Profissional[]): Resultado {
    const chave = CacheDecorator.chave(this.interno, projeto, profissionais);
    const guardado = this.armazem.obter(chave);
    if (guardado) {
      this.acertos++;
      return copiar(guardado);
    }
    this.falhas++;
    const resultado = this.interno.recomendar(projeto, profissionais);
    this.armazem.guardar(chave, copiar(resultado));
    return resultado;
  }
}

/** Copia o mapa e as listas (os profissionais continuam os mesmos objetos) para o chamador nao alterar o cache. */
function copiar(resultado: Resultado): Resultado {
  return new Map([...resultado].map(([papel, lista]) => [papel, [...lista]]));
}
