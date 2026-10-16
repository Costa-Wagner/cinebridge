import { OrquestradorEquipe } from "./OrquestradorEquipe";
import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Publicador } from "../observers/Publicador";

/**
 * Implementacao padrao das etapas variaveis:
 * - valida orcamento, duracao, prazo (data valida) e papeis com peso;
 * - remove profissionais duplicados;
 * - nao repete o mesmo profissional como primeira opcao de dois papeis
 *   e limita o ranking de cada papel a `limite` candidatos.
 */
export class OrquestradorPadrao extends OrquestradorEquipe {
  constructor(
    publicador?: Publicador,
    private readonly limite: number = 5
  ) {
    super(publicador);
  }

  protected validarRestricoes(projeto: Projeto): boolean {
    return (
      Number(projeto.orcamentoTotal) > 0 &&
      projeto.duracaoEstimadaMinutos > 0 &&
      !Number.isNaN(Date.parse(projeto.dataEntrega)) &&
      projeto.papeisObrigatorios.length > 0 &&
      projeto.papeisObrigatorios.every((p) => p.peso > 0)
    );
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
