import { AdaptadorProfissional, AvaliacaoProfissional, CriteriosProfissional, validarNota } from "./AdaptadorProfissional";
import { criarProfissionalExterno } from "./profissionalExterno";
import { CandidatoPortal, PortalEmpregoSimulado } from "../externos/PortalEmpregoSimulado";
import { Profissional } from "../../domain/entities/Profissional";

const PREFIXO = "indeed:";
const semPrefixo = (id: string): string => (id.startsWith(PREFIXO) ? id.slice(PREFIXO.length) : id);

export class AdaptadorIndeed implements AdaptadorProfissional {
  constructor(private readonly portal: PortalEmpregoSimulado = new PortalEmpregoSimulado()) {}

  async listarProfissionais(criterios: CriteriosProfissional): Promise<Profissional[]> {
    return this.portal
      .searchCandidates({ roles: criterios.papeis ?? [], maxResults: criterios.limitePorPapel })
      .map((c) => this.traduzir(c));
  }

  async detalharProfissional(id: string): Promise<Profissional | null> {
    const candidato = this.portal.getCandidate(semPrefixo(id));
    return candidato ? this.traduzir(candidato) : null;
  }

  /** O portal avalia em estrelas inteiras (0 a 5); a nota 0-10 da plataforma e' convertida. */
  async registrarAvaliacao(id: string, avaliacao: AvaliacaoProfissional): Promise<void> {
    validarNota(avaliacao.nota);
    this.portal.rate(semPrefixo(id), Math.round(avaliacao.nota / 2));
  }

  private traduzir(c: CandidatoPortal): Profissional {
    return criarProfissionalExterno({
      id: PREFIXO + c.candidateId,
      nome: c.fullName,
      email: c.mail,
      especialidades: c.skills,
      precoBaseDiaria: c.dailyRate,
      localizacao: c.city
    });
  }
}
