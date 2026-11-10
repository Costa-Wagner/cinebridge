import * as amqp from "amqplib";
import type { ConfirmChannel } from "amqplib";
import { CanalMensageria, MetadadosMQ, OpcoesFila, TratadorMQ } from "./CanalMensageria";

/** Canal RabbitMQ: filas duraveis, mensagens persistentes, confirmacao de publicacao e ack manual. */
export class CanalAmqp implements CanalMensageria {
  constructor(
    private readonly conexao: amqp.ChannelModel,
    private readonly canal: ConfirmChannel,
    private readonly prefetch: number = 10
  ) {}

  async declararFila(fila: string, opcoes: OpcoesFila = {}): Promise<void> {
    const exclusiva = opcoes.exclusiva ?? false;
    await this.canal.assertQueue(fila, { durable: !exclusiva, exclusive: exclusiva, autoDelete: exclusiva });
  }

  publicar(fila: string, corpo: unknown, meta: MetadadosMQ = {}): Promise<void> {
    const conteudo = Buffer.from(JSON.stringify(corpo ?? null));
    return new Promise<void>((resolve, reject) => {
      this.canal.sendToQueue(
        fila,
        conteudo,
        { persistent: true, contentType: "application/json", correlationId: meta.correlationId, replyTo: meta.replyTo },
        (erro) => (erro ? reject(erro) : resolve())
      );
    });
  }

  async consumir(fila: string, tratador: TratadorMQ): Promise<void> {
    await this.canal.prefetch(this.prefetch);
    await this.canal.consume(
      fila,
      async (mensagem) => {
        if (!mensagem) return; // consumidor cancelado pelo broker
        try {
          await tratador({
            corpo: JSON.parse(mensagem.content.toString()),
            correlationId: mensagem.properties.correlationId,
            replyTo: mensagem.properties.replyTo
          });
          this.canal.ack(mensagem);
        } catch (erro) {
          console.error(`[RABBITMQ] tratador de ${fila} falhou; mensagem descartada:`, erro);
          this.canal.nack(mensagem, false, false);
        }
      },
      { noAck: false }
    );
  }

  async fechar(): Promise<void> {
    await this.canal.close();
    await this.conexao.close();
  }
}

export interface OpcoesConexao {
  tentativas?: number;
  intervaloMs?: number;
  esperar?: (ms: number) => Promise<void>;
}

/** O broker pode demorar a aceitar conexoes quando os contêineres sobem juntos; tenta de novo antes de desistir. */
export async function conectarAmqp(url: string, opcoes: OpcoesConexao = {}): Promise<CanalMensageria> {
  const { tentativas = 30, intervaloMs = 2000, esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = opcoes;
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const conexao = await amqp.connect(url);
      conexao.on("error", (erro: Error) => console.error("[RABBITMQ] erro de conexao:", erro.message));
      const canal = await conexao.createConfirmChannel();
      return new CanalAmqp(conexao, canal);
    } catch (erro) {
      ultimoErro = erro;
      console.warn(`[RABBITMQ] tentativa ${tentativa}/${tentativas} de conexao falhou`);
      if (tentativa < tentativas) await esperar(intervaloMs);
    }
  }
  const motivo = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro);
  throw new Error(`Nao foi possivel conectar ao RabbitMQ apos ${tentativas} tentativa(s): ${motivo}`);
}
