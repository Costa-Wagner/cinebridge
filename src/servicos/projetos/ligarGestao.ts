import { BarramentoEventos, TOPICO_EQUIPE_FORMADA } from "../../eventos/BarramentoEventos";
import { FILA_EVENTOS_PROJETOS, TOPICO_PROJETO_ATUALIZADO, TOPICO_PROJETO_CRIADO } from "../../eventos/eventosProjeto";
import { GestaoProjetos } from "./GestaoProjetos";

/** Liga a gestao ao barramento: consome os eventos da api e publica em eventos-projetos. */
export async function ligarGestao(barramento: BarramentoEventos, gestao: GestaoProjetos): Promise<void> {
  await barramento.assinar(TOPICO_PROJETO_CRIADO, async (p) => void (await gestao.registrarCriado(p)));
  await barramento.assinar(TOPICO_PROJETO_ATUALIZADO, async (p) => void (await gestao.registrarAtualizado(p)));
  await barramento.assinar(TOPICO_EQUIPE_FORMADA, async (p) => void (await gestao.registrarFinalizado(p)));
}

export function publicadorEventosProjetos(barramento: BarramentoEventos) {
  return async (evento: unknown): Promise<void> => {
    await barramento.publicar(FILA_EVENTOS_PROJETOS, evento);
  };
}
