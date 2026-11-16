import { Repository } from "typeorm";
import { RegistroProjeto, STATUS_REGISTRO, StatusRegistro } from "./RegistroProjeto";
import { EquipeFormadaPayload } from "../../eventos/BarramentoEventos";
import { EventoProjeto, ProjetoPayload, TipoEventoProjeto } from "../../eventos/eventosProjeto";

/**
 * Ciclo de vida do projeto: registra o que a api informa (criado, atualizado, equipe formada)
 * e publica o evento correspondente para os demais servicos. O status nunca regride,
 * porque as mensagens podem chegar repetidas ou fora de ordem.
 */
export class GestaoProjetos {
  constructor(
    private readonly repositorio: Repository<RegistroProjeto>,
    private readonly publicar: (evento: EventoProjeto) => Promise<void>,
    private readonly agora: () => Date = () => new Date()
  ) {}

  registrarCriado(payload: ProjetoPayload): Promise<RegistroProjeto> {
    return this.registrarProjeto(payload, "CRIADO", "PROJETO_CRIADO");
  }

  registrarAtualizado(payload: ProjetoPayload): Promise<RegistroProjeto> {
    return this.registrarProjeto(payload, "ATUALIZADO", "PROJETO_ATUALIZADO");
  }

  /** Equipe formada = todos confirmaram: o projeto esta finalizado para a fase de composicao. */
  async registrarFinalizado(payload: EquipeFormadaPayload): Promise<RegistroProjeto> {
    const registro = await this.carregar(payload.projetoId);
    registro.tipoCaptacao = payload.tipoCaptacao;
    registro.orcamentoTotal = payload.orcamentoTotal;
    registro.equipe = payload.membros;
    registro.finalizadoEm = this.agora();
    registro.status = this.avancar(registro.status, "FINALIZADO");
    await this.repositorio.save(registro);
    await this.emitir("PROJETO_FINALIZADO", registro, {
      orcamentoTotal: payload.orcamentoTotal,
      quantidadeMembros: payload.membros.length,
      membros: payload.membros
    });
    return registro;
  }

  obter(id: string): Promise<RegistroProjeto | null> {
    return this.repositorio.findOneBy({ id });
  }

  listar(): Promise<RegistroProjeto[]> {
    return this.repositorio.find({ order: { atualizadoEm: "DESC" } });
  }

  private async registrarProjeto(payload: ProjetoPayload, status: StatusRegistro, tipo: TipoEventoProjeto): Promise<RegistroProjeto> {
    const registro = await this.carregar(payload.projetoId);
    registro.tipoCaptacao = payload.tipoCaptacao;
    registro.genero = payload.genero;
    registro.orcamentoTotal = payload.orcamentoTotal;
    registro.dataEntrega = payload.dataEntrega;
    registro.custoTotal = payload.custoTotal;
    registro.prazoTotal = payload.prazoTotal;
    registro.status = this.avancar(registro.status, status);
    await this.repositorio.save(registro);
    await this.emitir(tipo, registro, {
      genero: payload.genero,
      orcamentoTotal: payload.orcamentoTotal,
      dataEntrega: payload.dataEntrega,
      custoTotal: payload.custoTotal,
      prazoTotal: payload.prazoTotal
    });
    return registro;
  }

  private async carregar(id: string): Promise<RegistroProjeto> {
    return (await this.repositorio.findOneBy({ id })) ?? Object.assign(new RegistroProjeto(), { id, status: "CRIADO" as StatusRegistro });
  }

  private avancar(atual: StatusRegistro, novo: StatusRegistro): StatusRegistro {
    return STATUS_REGISTRO.indexOf(novo) > STATUS_REGISTRO.indexOf(atual) ? novo : atual;
  }

  private emitir(tipo: TipoEventoProjeto, registro: RegistroProjeto, detalhes: Record<string, unknown>): Promise<void> {
    return this.publicar({
      tipo,
      projetoId: registro.id,
      tipoCaptacao: registro.tipoCaptacao,
      ocorridoEm: this.agora().toISOString(),
      detalhes
    });
  }
}
