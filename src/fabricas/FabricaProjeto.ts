import { Projeto } from "../domain/entities/Projeto";
import { ValidadorConsistencia } from "../visitors/ValidadorConsistencia";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { Observador } from "../observers/Observador";

export interface DadosProjeto {
  genero?: string;
  duracaoEstimadaMinutos?: number;
  orcamentoTotal?: number;
  dataEntrega?: string;
  localizacaoFilmagem?: string;
  papeisObrigatorios?: { papel: string; peso: number }[];
  [campoEspecifico: string]: any;
}

const CAMPOS_BASE = [
  "genero",
  "duracaoEstimadaMinutos",
  "orcamentoTotal",
  "dataEntrega",
  "localizacaoFilmagem"
];

/**
 * Abstract Factory: cada fabrica concreta cria a familia completa de
 * objetos de um tipo de projeto (projeto, validador, recomendador e
 * notificador), garantindo que eles sempre cooperem entre si.
 *
 * O projeto nasce por Prototype: a fabrica guarda um modelo do tipo
 * (papeis padrao) e `criarProjeto` clona o modelo aplicando os ajustes
 * recebidos. Apenas campos conhecidos sao aplicados (id, relacoes e
 * discriminador nunca vem de fora).
 */
export abstract class FabricaProjeto {
  abstract criarProjeto(dados: DadosProjeto): Projeto;
  /** E' um VisitanteProjeto que acumula `problemas` para explicar a recusa. */
  abstract criarValidador(): ValidadorConsistencia;
  abstract criarRecomendador(): RecomendacaoStrategy;
  abstract criarNotificador(): Observador;

  protected instanciar<T extends Projeto>(
    prototipo: T,
    dados: DadosProjeto,
    camposEspecificos: string[]
  ): T {
    const projeto = prototipo.clonar() as T;
    const alvo = projeto as unknown as Record<string, unknown>;
    for (const campo of [...CAMPOS_BASE, ...camposEspecificos]) {
      const valor = dados[campo];
      if (valor !== undefined) {
        alvo[campo] = Array.isArray(valor) ? [...valor] : valor;
      }
    }
    if (dados.papeisObrigatorios) {
      projeto.papeisObrigatorios = dados.papeisObrigatorios.map((p) => ({ ...p })) as T["papeisObrigatorios"];
    }
    return projeto;
  }
}
