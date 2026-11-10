export interface MetadadosMQ {
  correlationId?: string;
  replyTo?: string;
}

export interface MensagemMQ extends MetadadosMQ {
  corpo: any;
}

export interface OpcoesFila {
  /** Fila privada da conexao, removida ao desconectar (usada para respostas de RPC). Padrao: duravel. */
  exclusiva?: boolean;
}

export type TratadorMQ = (mensagem: MensagemMQ) => Promise<void> | void;

/**
 * Contrato minimo de mensageria usado pela aplicacao. Esconde o amqplib:
 * o resto do codigo (e os testes unitarios) nao depende do broker.
 * Mensagens trafegam como JSON; a confirmacao (ack) e' feita pela implementacao
 * apos o tratador concluir sem erro.
 */
export interface CanalMensageria {
  declararFila(fila: string, opcoes?: OpcoesFila): Promise<void>;
  publicar(fila: string, corpo: unknown, meta?: MetadadosMQ): Promise<void>;
  consumir(fila: string, tratador: TratadorMQ): Promise<void>;
  fechar(): Promise<void>;
}
