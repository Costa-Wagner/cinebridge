import { randomUUID } from "crypto";
import { CanalMensageria, MensagemMQ } from "./CanalMensageria";

export class TimeoutRPCError extends Error {
  constructor(fila: string, timeoutMs: number) {
    super(`Sem resposta de ${fila} em ${timeoutMs} ms`);
    this.name = "TimeoutRPCError";
  }
}

/** Erro devolvido pelo servico que atendeu a chamada. */
export class ErroRPC extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroRPC";
  }
}

interface Pendente {
  resolver: (valor: unknown) => void;
  rejeitar: (erro: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Pedido/resposta sobre filas: publica na fila do servico com `replyTo` e
 * `correlationId` e espera a resposta na fila de retorno exclusiva desta instancia.
 */
export class ClienteRPC {
  private readonly pendentes = new Map<string, Pendente>();
  private filaResposta?: string;

  constructor(private readonly canal: CanalMensageria, private readonly opcoes: { timeoutMs?: number } = {}) {}

  async iniciar(): Promise<void> {
    this.filaResposta = `rpc.resposta.${randomUUID()}`;
    await this.canal.declararFila(this.filaResposta, { exclusiva: true });
    await this.canal.consumir(this.filaResposta, (mensagem) => this.receber(mensagem));
  }

  async chamar<T = unknown>(fila: string, corpo: unknown): Promise<T> {
    if (!this.filaResposta) throw new Error("ClienteRPC nao iniciado: chame iniciar() antes");
    const id = randomUUID();
    const timeoutMs = this.opcoes.timeoutMs ?? 5000;
    const resposta = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendentes.delete(id);
        reject(new TimeoutRPCError(fila, timeoutMs));
      }, timeoutMs);
      this.pendentes.set(id, { resolver: resolve as (valor: unknown) => void, rejeitar: reject, timer });
    });
    try {
      await this.canal.publicar(fila, corpo, { correlationId: id, replyTo: this.filaResposta });
    } catch (erro) {
      clearTimeout(this.pendentes.get(id)?.timer);
      this.pendentes.delete(id);
      throw erro;
    }
    return resposta;
  }

  /** Rejeita as chamadas em andamento; o canal e' de quem o criou e nao e' fechado aqui. */
  encerrar(): void {
    for (const pendente of this.pendentes.values()) {
      clearTimeout(pendente.timer);
      pendente.rejeitar(new Error("ClienteRPC encerrado"));
    }
    this.pendentes.clear();
  }

  private receber(mensagem: MensagemMQ): void {
    const pendente = mensagem.correlationId ? this.pendentes.get(mensagem.correlationId) : undefined;
    if (!pendente) return; // resposta tardia (apos timeout) ou desconhecida
    clearTimeout(pendente.timer);
    this.pendentes.delete(mensagem.correlationId as string);
    if (mensagem.corpo?.erro !== undefined) pendente.rejeitar(new ErroRPC(String(mensagem.corpo.erro)));
    else pendente.resolver(mensagem.corpo?.resultado);
  }
}
