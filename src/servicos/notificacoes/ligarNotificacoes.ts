import { BarramentoEventos } from "../../eventos/BarramentoEventos";
import { FILA_EVENTOS_NOTIFICACOES } from "../../eventos/eventosNotificacao";
import { FILA_EVENTOS_PROJETOS } from "../../eventos/eventosProjeto";
import { ServicoNotificacoes } from "./ServicoNotificacoes";

/** Consome os eventos da api (eventos-notificacoes) e do cinebridge-projetos (eventos-projetos). */
export async function ligarNotificacoes(barramento: BarramentoEventos, servico: ServicoNotificacoes): Promise<void> {
  await barramento.assinar(FILA_EVENTOS_NOTIFICACOES, async (e) => void (await servico.processarEventoRecomendacao(e)));
  await barramento.assinar(FILA_EVENTOS_PROJETOS, async (e) => void (await servico.processarEventoProjeto(e)));
}
