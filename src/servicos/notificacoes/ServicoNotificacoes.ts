import { Repository } from "typeorm";
import { Notificacao, OrigemNotificacao } from "./Notificacao";
import { EnviadorNotificacao } from "./enviadores";
import { MensagemNotificacao, mensagensDoEventoProjeto, mensagensDoEventoRecomendacao } from "./mensagens";
import { EventoNotificacaoPayload } from "../../eventos/eventosNotificacao";
import { EventoProjeto } from "../../eventos/eventosProjeto";

/** Transforma eventos em notificacoes: monta as mensagens, envia pelo canal e registra o resultado. */
export class ServicoNotificacoes {
  private readonly enviadores: Map<string, EnviadorNotificacao>;

  constructor(
    private readonly repositorio: Repository<Notificacao>,
    enviadores: EnviadorNotificacao[],
    private readonly agora: () => Date = () => new Date()
  ) {
    this.enviadores = new Map(enviadores.map((e) => [e.canal, e]));
  }

  processarEventoRecomendacao(evento: EventoNotificacaoPayload): Promise<Notificacao[]> {
    return this.despachar(evento.projetoId, evento.tipo, "api", mensagensDoEventoRecomendacao(evento));
  }

  processarEventoProjeto(evento: EventoProjeto): Promise<Notificacao[]> {
    return this.despachar(evento.projetoId, evento.tipo, "projetos", mensagensDoEventoProjeto(evento));
  }

  listar(projetoId?: string, limite = 100): Promise<Notificacao[]> {
    return this.repositorio.find({ where: projetoId ? { projetoId } : {}, order: { criadoEm: "DESC" }, take: limite });
  }

  private async despachar(projetoId: string, tipoEvento: string, origem: OrigemNotificacao, mensagens: MensagemNotificacao[]): Promise<Notificacao[]> {
    const registradas: Notificacao[] = [];
    for (const mensagem of mensagens) {
      const notificacao: Notificacao = Object.assign(new Notificacao(), { projetoId, tipoEvento, origem, ...mensagem, erro: null, enviadoEm: null });
      try {
        const enviador = this.enviadores.get(mensagem.canal);
        if (!enviador) throw new Error(`Canal sem enviador: ${mensagem.canal}`);
        await enviador.enviar(mensagem);
        notificacao.status = "ENVIADA";
        notificacao.enviadoEm = this.agora();
      } catch (erro) {
        notificacao.status = "FALHA";
        notificacao.erro = erro instanceof Error ? erro.message : String(erro);
      }
      registradas.push(await this.repositorio.save(notificacao));
    }
    return registradas;
  }
}
