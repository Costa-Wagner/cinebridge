import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";
import { MembroEquipe } from "../domain/entities/MembroEquipe";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { Publicador } from "../observers/Publicador";
import { ProjetoInvalidoError } from "./ProjetoInvalidoError";

/**
 * Template Method: `orquestrar` fixa a ordem do fluxo (validar -> normalizar
 * -> recomendar -> pos-processar -> notificar -> montar equipe) e delega
 * as etapas variaveis as subclasses. O template nao pode ser sobrescrito:
 * o construtor recusa subclasses que tentem substitui-lo.
 *
 * Premissa: o diagrama nao mostra a origem dos profissionais, entao a
 * lista de disponiveis e' entregue pelo chamador (rota/servico).
 */
export abstract class OrquestradorEquipe {
  protected constructor(private readonly publicador?: Publicador) {
    if (this.orquestrar !== OrquestradorEquipe.prototype.orquestrar) {
      throw new Error("orquestrar() e' o template method e nao pode ser sobrescrito");
    }
  }

  public orquestrar(
    projeto: Projeto,
    estrategia: RecomendacaoStrategy,
    profissionais: Profissional[]
  ): Equipe {
    if (!this.validarRestricoes(projeto)) {
      throw new ProjetoInvalidoError();
    }
    const disponiveis = this.normalizarDados(projeto, profissionais);
    const recomendacoes = this.posProcessar(estrategia.recomendar(projeto, disponiveis));
    this.notificar(projeto, recomendacoes);
    return this.montarEquipe(projeto, recomendacoes);
  }

  /** Passo variavel: o projeto pode ser orquestrado? */
  protected abstract validarRestricoes(projeto: Projeto): boolean;

  /** Passo variavel: prepara a lista de profissionais antes da recomendacao. */
  protected abstract normalizarDados(projeto: Projeto, profissionais: Profissional[]): Profissional[];

  /** Passo variavel: ajusta o ranking devolvido pela strategy. */
  protected abstract posProcessar(
    recomendacoes: Map<Papel, Profissional[]>
  ): Map<Papel, Profissional[]>;

  /** Passo fixo: um evento por papel que tenha ao menos um candidato. */
  private notificar(projeto: Projeto, recomendacoes: Map<Papel, Profissional[]>): void {
    for (const [papel, candidatos] of recomendacoes) {
      if (candidatos.length > 0) {
        this.publicador?.notificarObservadores({ projeto, papel, candidatos });
      }
    }
  }

  /** Passo fixo: o primeiro de cada papel vira membro proposto; o ranking completo fica na equipe. */
  private montarEquipe(projeto: Projeto, recomendacoes: Map<Papel, Profissional[]>): Equipe {
    const equipe = new Equipe();
    equipe.projeto = projeto;
    equipe.ranking = recomendacoes;
    equipe.membros = [];
    for (const [papel, candidatos] of recomendacoes) {
      if (candidatos.length === 0) continue;
      const membro = new MembroEquipe();
      membro.papel = papel;
      membro.profissional = candidatos[0];
      membro.aceitouConvite = false;
      equipe.membros.push(membro);
    }
    return equipe;
  }
}
