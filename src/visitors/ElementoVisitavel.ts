import type { VisitanteProjeto } from "./VisitanteProjeto";

export interface ElementoVisitavel {
  aceitar(visitante: VisitanteProjeto): void;
}