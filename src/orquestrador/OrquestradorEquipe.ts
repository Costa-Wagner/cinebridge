import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";
import { MembroEquipe } from "../domain/entities/MembroEquipe";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { Publicador } from "../observers/Publicador";
import { Observador } from "../observers/Observador";
import { FabricaProjeto } from "../fabricas/FabricaProjeto";
import { TipoEvento } from "../observers/TipoEvento";
import { EventoRecomendacao } from "../observers/EventoRecomendacao";
import { StatusEquipe } from "../domain/enums/StatusEquipe";
import { ProjetoInvalidoError } from "./ProjetoInvalidoError";

/**
 * Template Method: `orquestrar` fixa a ordem do fluxo (validar -> normalizar
 * -> recomendar -> pos-processar -> notificar -> montar equipe) e delega
 * as etapas variaveis as subclasses. O template nao pode ser sobrescrito:
 * o construtor recusa subclasses que tentem substitui-lo.
 *
 * A fabrica do tipo de projeto fornece validador, recomendador e notificador,
 * entao o orquestrador nunca decide nada com base no tipo do projeto.
 *
 * Premissas: o diagrama nao mostra a origem dos profissionais, entao a
 * lista de disponiveis e' entregue pelo chamador (rota/servico); a
 * `estrategia` e' opcional: por padrao vem da fabrica, mas pode ser trocada
 * sem trocar de fabrica; e `papeis` (opcional) limita a rodada de
 * recomendacao a alguns papeis, usado ao substituir um membro.
 */
export abstract class OrquestradorEquipe {
  private readonly notificador: Observador;

  protected constructor(
    protected readonly fabrica: FabricaProjeto,
    private readonly publicador?: Publicador
  ) {
    this.notificador = fabrica.criarNotificador();
    if (this.orquestrar !== OrquestradorEquipe.prototype.orquestrar) {
      throw new Error("orquestrar() e' o template method e nao pode ser sobrescrito");
    }
  }

  public orquestrar(
    projeto: Projeto,
    profissionais: Profissional[],
    estrategia: RecomendacaoStrategy = this.fabrica.criarRecomendador(),
    papeis?: Papel[]
  ): Equipe {
    if (!this.validarRestricoes(projeto)) {
      throw new ProjetoInvalidoError();
    }
    const disponiveis = this.normalizarDados(projeto, profissionais);
    const alvo = papeis ? this.restringirPapeis(projeto, papeis) : projeto;
    const recomendacoes = this.posProcessar(estrategia.recomendar(alvo, disponiveis));
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

  /**
   * Passo fixo: um evento por papel que tenha ao menos um candidato. O
   * notificador da fabrica e' sempre avisado, sem alterar a lista de
   * observadores do publicador (que pode ser compartilhado).
   */
  private notificar(projeto: Projeto, recomendacoes: Map<Papel, Profissional[]>): void {
    for (const [papel, candidatos] of recomendacoes) {
      if (candidatos.length > 0) {
        const evento: EventoRecomendacao = {
          tipo: TipoEvento.RECOMENDACAO_GERADA,
          projeto,
          papel,
          candidatos
        };
        try {
          this.notificador.atualizar(evento);
        } catch (erro) {
          console.error("[ORQUESTRADOR] notificador da fabrica falhou:", erro);
        }
        this.publicador?.notificarObservadores(evento);
      }
    }
  }

  /** Visao do projeto so' com os papeis pedidos; vale apenas para a strategy (validacao e eventos usam o projeto real). */
  private restringirPapeis(projeto: Projeto, papeis: Papel[]): Projeto {
    const visao = projeto.clonar();
    visao.id = projeto.id;
    visao.papeisObrigatorios = projeto.papeisObrigatorios.filter((p) => papeis.includes(p.papel as Papel));
    return visao;
  }

  /** Passo fixo: o primeiro de cada papel vira membro proposto; o ranking completo fica na equipe. */
  private montarEquipe(projeto: Projeto, recomendacoes: Map<Papel, Profissional[]>): Equipe {
    const equipe = new Equipe();
    equipe.projeto = projeto;
    equipe.ranking = recomendacoes;
    equipe.status = StatusEquipe.EM_FORMACAO;
    equipe.formadaEm = null;
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
