import type { Projeto } from "../domain/entities/Projeto";

/** Eventos de ciclo de vida do projeto publicados pela api (equipe.formada ja existe em BarramentoEventos). */
export const TOPICO_PROJETO_CRIADO = "projeto.criado";
export const TOPICO_PROJETO_ATUALIZADO = "projeto.atualizado";

/** Fila em que o cinebridge-projetos publica os eventos do projeto para quem quiser reagir (notificacoes). */
export const FILA_EVENTOS_PROJETOS = "eventos-projetos";

export interface ProjetoPayload {
  projetoId: string;
  tipoCaptacao: string;
  genero: string;
  orcamentoTotal: number;
  dataEntrega: string;
  custoTotal: number;
  prazoTotal: number;
}

export type TipoEventoProjeto = "PROJETO_CRIADO" | "PROJETO_ATUALIZADO" | "PROJETO_FINALIZADO";

export interface EventoProjeto {
  tipo: TipoEventoProjeto;
  projetoId: string;
  tipoCaptacao: string;
  ocorridoEm: string;
  detalhes: Record<string, unknown>;
}

export function resumirProjeto(projeto: Projeto): ProjetoPayload {
  const arvore = projeto.servicoPrincipal;
  return {
    projetoId: projeto.id,
    tipoCaptacao: projeto.tipoCaptacao,
    genero: projeto.genero,
    orcamentoTotal: Number(projeto.orcamentoTotal),
    dataEntrega: projeto.dataEntrega,
    custoTotal: arvore ? projeto.calcularCustoTotal() : 0,
    prazoTotal: arvore ? projeto.obterPrazoTotal() : 0
  };
}
