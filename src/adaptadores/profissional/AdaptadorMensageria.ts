import { AdaptadorProfissional, AvaliacaoProfissional, CriteriosProfissional, validarNota } from "./AdaptadorProfissional";
import { Profissional } from "../../domain/entities/Profissional";
import { ClienteRPC } from "../../mensageria/ClienteRPC";
import { ProfissionalDto, deDto } from "./ProfissionalDto";
import { ConsultaProfissionais, FILA_CONSULTA_PROFISSIONAIS } from "./protocoloProfissionais";

/** Cadastro de profissionais que vive no servico cinebridge-profissionais, acessado por fila (RPC). */
export class AdaptadorMensageria implements AdaptadorProfissional {
  constructor(
    private readonly rpc: ClienteRPC,
    private readonly fila: string = FILA_CONSULTA_PROFISSIONAIS
  ) {}

  async listarProfissionais(criterios: CriteriosProfissional): Promise<Profissional[]> {
    const dtos = await this.consultar<ProfissionalDto[]>({ operacao: "listar", criterios });
    return dtos.map(deDto);
  }

  async detalharProfissional(id: string): Promise<Profissional | null> {
    const dto = await this.consultar<ProfissionalDto | null>({ operacao: "detalhar", id });
    return dto ? deDto(dto) : null;
  }

  async registrarAvaliacao(id: string, avaliacao: AvaliacaoProfissional): Promise<void> {
    validarNota(avaliacao.nota); // falha cedo, sem ida a rede
    await this.consultar<null>({ operacao: "avaliar", id, avaliacao });
  }

  private consultar<T>(consulta: ConsultaProfissionais): Promise<T> {
    return this.rpc.chamar<T>(this.fila, consulta);
  }
}
