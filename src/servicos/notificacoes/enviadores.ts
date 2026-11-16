import { CanalNotificacao } from "./Notificacao";
import { MensagemNotificacao } from "./mensagens";

/** Strategy de envio por canal: trocar o simulado por SMTP/push nao muda o resto do servico. */
export interface EnviadorNotificacao {
  readonly canal: CanalNotificacao;
  enviar(mensagem: MensagemNotificacao): Promise<void>;
}

type Escritor = (linha: string) => void;

export class EnviadorEmailSimulado implements EnviadorNotificacao {
  readonly canal = "EMAIL" as const;
  constructor(private readonly escrever: Escritor = console.log) {}
  async enviar(m: MensagemNotificacao): Promise<void> {
    this.escrever(`[EMAIL] Para ${m.destinatario}: ${m.assunto} - ${m.corpo}`);
  }
}

export class EnviadorMensagemInternaSimulado implements EnviadorNotificacao {
  readonly canal = "MENSAGEM_INTERNA" as const;
  constructor(private readonly escrever: Escritor = console.log) {}
  async enviar(m: MensagemNotificacao): Promise<void> {
    this.escrever(`[MENSAGEM_INTERNA] Para ${m.destinatario}: ${m.corpo}`);
  }
}
