import type { Papel } from "../../domain/enums/Papel";
import type { Profissional } from "../../domain/entities/Profissional";

export interface CriteriosProfissional {
  /** Papeis a cobrir; vazio/ausente = sem filtro por papel. */
  papeis?: Papel[];
  limitePorPapel?: number;
}

export interface AvaliacaoProfissional {
  nota: number;
  comentario?: string;
}

/** Contrato padrao de cadastro de profissionais, venha de onde vier. */
export interface AdaptadorProfissional {
  listarProfissionais(criterios: CriteriosProfissional): Promise<Profissional[]>;
  detalharProfissional(id: string): Promise<Profissional | null>;
  registrarAvaliacao(id: string, avaliacao: AvaliacaoProfissional): Promise<void>;
}

export class AvaliacaoInvalidaError extends Error {
  constructor() {
    super("Nota deve estar entre 0 e 9,99");
    this.name = "AvaliacaoInvalidaError";
  }
}

export function validarNota(nota: number): void {
  if (!Number.isFinite(nota) || nota < 0 || nota >= 10) throw new AvaliacaoInvalidaError();
}
