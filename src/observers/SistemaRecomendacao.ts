import { Publicador } from "./Publicador";
import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { FabricaProjeto, DadosProjeto } from "../fabricas/FabricaProjeto";
import { TipoSemFabricaError } from "../fabricas/TipoSemFabricaError";
import { OrquestradorPadrao } from "../orquestrador/OrquestradorPadrao";
import { ProjetoInvalidoError } from "../orquestrador/ProjetoInvalidoError";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { AdaptadorArmazenamento } from "../adaptadores/armazenamento/AdaptadorArmazenamento";
import { AdaptadorPagamento } from "../adaptadores/pagamento/AdaptadorPagamento";
import { AdaptadorProfissional } from "../adaptadores/profissional/AdaptadorProfissional";
import { AdaptadorNaoConfiguradoError } from "../adaptadores/AdaptadorNaoConfiguradoError";

export interface Adaptadores {
  armazenamento?: AdaptadorArmazenamento;
  pagamento?: AdaptadorPagamento;
  profissional?: AdaptadorProfissional;
}

export interface OpcoesRecomendacao {
  estrategia?: RecomendacaoStrategy;
  /** Papeis a recomendar; padrao: todos os papeis obrigatorios do projeto. */
  papeis?: Papel[];
  /** Ids de profissionais que nao podem ser candidatos (ja alocados ou dispensados). */
  excluir?: ReadonlySet<string>;
}

/**
 * Ponto de entrada das solicitacoes de recomendacao e, ao mesmo tempo, o
 * sujeito do Observer. Identifica o tipo do projeto, seleciona a fabrica
 * registrada para ele (sem condicionais por tipo) e usa a fabrica para
 * criar projetos e orquestrar equipes. Novo tipo de projeto = nova fabrica
 * registrada aqui; nada no orquestrador muda.
 */
export class SistemaRecomendacao implements Publicador {
  private readonly observadores: Observador[] = [];
  private readonly fabricas = new Map<TipoCaptacao, FabricaProjeto>();

  private adaptadorArmazenamento?: AdaptadorArmazenamento;
  private adaptadorPagamento?: AdaptadorPagamento;
  private adaptadorProfissional?: AdaptadorProfissional;

  constructor(private readonly limiteCandidatos: number = 5) {}

  /** Injeta (ou troca) os adaptadores; so' os informados sao alterados. */
  configurarAdaptadores(adaptadores: Adaptadores): void {
    if (adaptadores.armazenamento) this.adaptadorArmazenamento = adaptadores.armazenamento;
    if (adaptadores.pagamento) this.adaptadorPagamento = adaptadores.pagamento;
    if (adaptadores.profissional) this.adaptadorProfissional = adaptadores.profissional;
  }

  temAdaptadorProfissional(): boolean {
    return this.adaptadorProfissional !== undefined;
  }

  obterAdaptadorArmazenamento(): AdaptadorArmazenamento {
    if (!this.adaptadorArmazenamento) throw new AdaptadorNaoConfiguradoError("armazenamento");
    return this.adaptadorArmazenamento;
  }

  obterAdaptadorPagamento(): AdaptadorPagamento {
    if (!this.adaptadorPagamento) throw new AdaptadorNaoConfiguradoError("pagamento");
    return this.adaptadorPagamento;
  }

  obterAdaptadorProfissional(): AdaptadorProfissional {
    if (!this.adaptadorProfissional) throw new AdaptadorNaoConfiguradoError("profissional");
    return this.adaptadorProfissional;
  }

  /** Obtem os candidatos pelo AdaptadorProfissional (qualquer provedor) e orquestra a equipe. */
  async executarRecomendacao(projeto: Projeto, opcoes: OpcoesRecomendacao = {}): Promise<Equipe> {
    const papeis = opcoes.papeis ?? projeto.papeisObrigatorios.map((p) => p.papel as Papel);
    const todos = await this.obterAdaptadorProfissional().listarProfissionais({ papeis });
    const candidatos = opcoes.excluir ? todos.filter((p) => !opcoes.excluir!.has(p.id)) : todos;
    return this.recomendar(projeto, candidatos, opcoes.estrategia, opcoes.papeis);
  }

  registrarFabrica(tipo: TipoCaptacao, fabrica: FabricaProjeto): void {
    this.fabricas.set(tipo, fabrica);
  }

  obterFabrica(tipo: TipoCaptacao): FabricaProjeto {
    const fabrica = this.fabricas.get(tipo);
    if (!fabrica) throw new TipoSemFabricaError(tipo);
    return fabrica;
  }

  /** Cria o projeto pela fabrica do tipo e o valida com o validador da mesma fabrica. */
  criarProjeto(tipo: TipoCaptacao, dados: DadosProjeto): Projeto {
    const fabrica = this.obterFabrica(tipo);
    const projeto = fabrica.criarProjeto(dados);
    const validador = fabrica.criarValidador();
    if (!projeto.aceitar(validador)) {
      throw new ProjetoInvalidoError(validador.problemas);
    }
    return projeto;
  }

  /** Seleciona a fabrica pelo tipo do projeto e orquestra a equipe. */
  recomendar(
    projeto: Projeto,
    profissionais: Profissional[],
    estrategia?: RecomendacaoStrategy,
    papeis?: Papel[]
  ): Equipe {
    const fabrica = this.obterFabrica(projeto.tipoCaptacao);
    return new OrquestradorPadrao(fabrica, this, this.limiteCandidatos).orquestrar(
      projeto,
      profissionais,
      estrategia,
      papeis
    );
  }

  adicionarObservador(observador: Observador): void {
    this.observadores.push(observador);
  }

  removerObservador(observador: Observador): void {
    const indice = this.observadores.indexOf(observador);
    if (indice >= 0) this.observadores.splice(indice, 1);
  }

  notificarObservadores(evento: EventoRecomendacao): void {
    // Um observador com falha nao impede os demais de reagir.
    for (const observador of [...this.observadores]) {
      try {
        observador.atualizar(evento);
      } catch (erro) {
        console.error(`[OBSERVER] ${observador.constructor.name} falhou ao tratar ${evento.tipo}:`, erro);
      }
    }
  }
}
