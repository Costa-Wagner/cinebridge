import { OrquestradorEquipe } from "./OrquestradorEquipe";
import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Publicador } from "../observers/Publicador";
import { FabricaProjeto } from "../fabricas/FabricaProjeto";

/**
 * Implementacao padrao das etapas variaveis:
 * - valida o projeto com o validador da fabrica (consistencia geral e
 *   regras do tipo, incluindo recusar projeto de outro tipo);
 * - remove profissionais duplicados;
 * - nao repete o mesmo profissional como primeira opcao de dois papeis
 *   e limita o ranking de cada papel a `limite` candidatos.
 */
export class OrquestradorPadrao extends OrquestradorEquipe {
  constructor(
    fabrica: FabricaProjeto,
    publicador?: Publicador,
    private readonly limite: number = 5
  ) {
    super(fabrica, publicador);
  }

  protected validarRestricoes(projeto: Projeto): boolean {
    return projeto.aceitar(this.fabrica.criarValidador()) === true;
  }

  protected normalizarDados(_projeto: Projeto, profissionais: Profissional[]): Profissional[] {
    const vistos = new Set<string>();
    return profissionais.filter((p) => {
      if (vistos.has(p.id)) return false;
      vistos.add(p.id);
      return true;
    });
  }

  protected posProcessar(
    recomendacoes: Map<Papel, Profissional[]>
  ): Map<Papel, Profissional[]> {
    const escolhidos = new Set<string>();
    const resultado = new Map<Papel, Profissional[]>();
    for (const [papel, candidatos] of recomendacoes) {
      const livres = candidatos.filter((c) => !escolhidos.has(c.id)).slice(0, this.limite);
      if (livres.length > 0) escolhidos.add(livres[0].id);
      resultado.set(papel, livres);
    }
    return resultado;
  }
}
