import { AdaptadorProfissional, AvaliacaoProfissional, CriteriosProfissional, validarNota } from "./AdaptadorProfissional";
import { criarProfissionalExterno } from "./profissionalExterno";
import { ApiProfissionalExterna, RegistroExterno } from "../externos/ApiProfissionalExterna";
import { Profissional } from "../../domain/entities/Profissional";

const PREFIXO = "linkedin:";
const semPrefixo = (id: string): string => (id.startsWith(PREFIXO) ? id.slice(PREFIXO.length) : id);

export class AdaptadorLinkedIn implements AdaptadorProfissional {
  constructor(private readonly api: ApiProfissionalExterna = new ApiProfissionalExterna()) {}

  async listarProfissionais(criterios: CriteriosProfissional): Promise<Profissional[]> {
    return this.api
      .buscarProfissionais({ funcoes: criterios.papeis ?? [], limite: criterios.limitePorPapel })
      .map((r) => this.traduzir(r));
  }

  async detalharProfissional(id: string): Promise<Profissional | null> {
    const registro = this.api.obterPerfil(semPrefixo(id));
    return registro ? this.traduzir(registro) : null;
  }

  async registrarAvaliacao(id: string, avaliacao: AvaliacaoProfissional): Promise<void> {
    validarNota(avaliacao.nota);
    this.api.avaliarProfissional(semPrefixo(id), avaliacao.nota);
  }

  private traduzir(r: RegistroExterno): Profissional {
    return criarProfissionalExterno({
      id: PREFIXO + r.id,
      nome: r.nomeCompleto,
      email: r.emailContato,
      especialidades: r.habilidades,
      precoBaseDiaria: r.valorDiaria,
      localizacao: r.cidade
    });
  }
}
