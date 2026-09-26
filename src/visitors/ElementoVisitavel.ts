import type { IVisitanteProjeto } from "./IVisitanteProjeto";

export interface ElementoVisitavel {
  aceitar(visitante: IVisitanteProjeto): void;
}