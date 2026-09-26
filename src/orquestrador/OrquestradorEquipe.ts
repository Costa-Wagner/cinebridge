import { Papel } from "../domain/enums/Papel";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Recomendacao } from "../domain/entities/Recomendacao";
import { Convite } from "../domain/entities/Convite";
import {
  IRecomendacaoStrategy,
  ResultadoRecomendacao
} from "../strategies/IRecomendacaoStrategy";
import { Publicador } from "../observers/Publicador";

export interface ResultadoOrquestracao {
  recomendacoes: Recomendacao[];
  convites: Convite[];
}

/**
 * Template Method: define o esqueleto fixo do algoritmo de formacao de
 * equipe (percorrer papeis obrigatorios -> gerar recomendacoes -> tentar
 * selecionar um candidato -> criar convite), mas delega pras subclasses
 * a escolha da strategy de recomendacao e o criterio de selecao do
 * candidato vencedor. O metodo `orquestrar` e' o template propriamente
 * dito e nao deve ser sobrescrito.
 */
export abstract class OrquestradorEquipe {
  protected constructor(private readonly publicador?: Publicador) {}

  public orquestrar(
    projeto: Projeto,
    candidatosPorPapel: Map<Papel, Profissional[]>
  ): ResultadoOrquestracao {
    const recomendacoes: Recomendacao[] = [];
    const convites: Convite[] = [];
    const jaConvidados = new Set<string>();

    for (const papelObrigatorio of projeto.papeisObrigatorios) {
      const candidatos = candidatosPorPapel.get(papelObrigatorio.papel) ?? [];
      if (candidatos.length === 0) continue;

      const estrategia = this.obterEstrategia(papelObrigatorio.papel);
      const resultados = estrategia.recomendar({
        projeto,
        papel: papelObrigatorio.papel,
        candidatos
      });

      const novasRecomendacoes = this.registrarRecomendacoes(
        projeto,
        papelObrigatorio.papel,
        resultados,
        estrategia.nome
      );
      recomendacoes.push(...novasRecomendacoes);

      this.publicador?.notificarAssinantes({
        projeto,
        papel: papelObrigatorio.papel,
        recomendacoes: novasRecomendacoes
      });

      const resultadosDisponiveis = resultados.filter(
        (r) => !jaConvidados.has(r.profissional.id)
      );
      const escolhido = this.selecionarCandidato(resultadosDisponiveis, papelObrigatorio.papel);
      if (escolhido) {
        convites.push(this.criarConvite(projeto, papelObrigatorio.papel, escolhido));
        jaConvidados.add(escolhido.id);
      }
    }

    return { recomendacoes, convites };
  }

  /** Passo variavel: qual strategy usar pra ranquear candidatos desse papel. */
  protected abstract obterEstrategia(papel: Papel): IRecomendacaoStrategy;

  /** Passo variavel: dado o ranking, qual candidato (se algum) sera convidado. */
  protected abstract selecionarCandidato(
    resultados: ResultadoRecomendacao[],
    papel: Papel
  ): Profissional | null;

  /** Passo fixo (hook sobrescrevivel): monta as entidades Recomendacao a partir do ranking. */
  protected registrarRecomendacoes(
    projeto: Projeto,
    papel: Papel,
    resultados: ResultadoRecomendacao[],
    estrategiaNome: string
  ): Recomendacao[] {
    return resultados.map((resultado, indice) => {
      const recomendacao = new Recomendacao();
      recomendacao.projeto = projeto;
      recomendacao.profissional = resultado.profissional;
      recomendacao.papel = papel;
      recomendacao.pontuacao = resultado.pontuacao;
      recomendacao.posicaoRanking = indice + 1;
      recomendacao.estrategiaUtilizada = estrategiaNome;
      return recomendacao;
    });
  }

  /** Passo fixo (hook sobrescrevivel): monta a entidade Convite pro candidato escolhido. */
  protected criarConvite(projeto: Projeto, papel: Papel, profissional: Profissional): Convite {
    const convite = new Convite();
    convite.projeto = projeto;
    convite.profissional = profissional;
    convite.papel = papel;
    convite.status = StatusConvite.PENDENTE;
    return convite;
  }
}