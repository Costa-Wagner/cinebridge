import { CanalMensageria } from "./CanalMensageria";

/** Lado servidor do RPC: consome `fila`, executa o tratador e devolve resultado ou erro em `replyTo`. */
export async function registrarRespondedor(
  canal: CanalMensageria,
  fila: string,
  tratador: (corpo: any) => Promise<unknown> | unknown
): Promise<void> {
  await canal.declararFila(fila);
  await canal.consumir(fila, async (mensagem) => {
    let resposta: { resultado?: unknown; erro?: string };
    try {
      resposta = { resultado: await tratador(mensagem.corpo) };
    } catch (erro) {
      resposta = { erro: erro instanceof Error ? erro.message : String(erro) };
    }
    if (mensagem.replyTo) await canal.publicar(mensagem.replyTo, resposta, { correlationId: mensagem.correlationId });
  });
}
