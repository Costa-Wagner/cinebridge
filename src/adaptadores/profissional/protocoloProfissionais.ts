import type { AvaliacaoProfissional, CriteriosProfissional } from "./AdaptadorProfissional";

/** Fila em que o cinebridge-profissionais recebe as consultas da api. */
export const FILA_CONSULTA_PROFISSIONAIS = "consulta-profissionais";

export type ConsultaProfissionais =
  | { operacao: "listar"; criterios: CriteriosProfissional }
  | { operacao: "detalhar"; id: string }
  | { operacao: "avaliar"; id: string; avaliacao: AvaliacaoProfissional };
