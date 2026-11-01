export interface CandidatoPortal {
  candidateId: string;
  fullName: string;
  mail: string;
  roles: string[];
  skills: string[];
  dailyRate: number;
  city: string;
}

/** API simulada de portal de emprego (estilo Indeed): vocabulario e formato proprios. */
export class PortalEmpregoSimulado {
  readonly estrelas = new Map<string, number[]>();

  constructor(private readonly candidatos: CandidatoPortal[] = []) {}

  searchCandidates(consulta: { roles: string[]; maxResults?: number }): CandidatoPortal[] {
    const achados = this.candidatos.filter(
      (c) => consulta.roles.length === 0 || c.roles.some((r) => consulta.roles.includes(r))
    );
    return consulta.maxResults === undefined ? achados : achados.slice(0, consulta.maxResults);
  }

  getCandidate(candidateId: string): CandidatoPortal | undefined {
    return this.candidatos.find((c) => c.candidateId === candidateId);
  }

  rate(candidateId: string, stars: number): void {
    this.estrelas.set(candidateId, [...(this.estrelas.get(candidateId) ?? []), stars]);
  }
}
