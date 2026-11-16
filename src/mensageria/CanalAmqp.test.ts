jest.mock("amqplib", () => ({ connect: jest.fn() }));

import * as amqp from "amqplib";
import { CanalAmqp, conectarAmqp } from "./CanalAmqp";

const connect = amqp.connect as unknown as jest.Mock;
type Callback = (erro: unknown) => void;

function criarFakes() {
  const consumidores: Record<string, (m: unknown) => Promise<void>> = {};
  const canal = {
    assertQueue: jest.fn().mockResolvedValue({}),
    sendToQueue: jest.fn((_f: string, _b: Buffer, _o: unknown, cb: Callback) => {
      cb(null);
      return true;
    }),
    prefetch: jest.fn().mockResolvedValue({}),
    consume: jest.fn(async (fila: string, cb: (m: unknown) => Promise<void>) => {
      consumidores[fila] = cb;
      return { consumerTag: "t" };
    }),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  };
  const conexao = {
    createConfirmChannel: jest.fn().mockResolvedValue(canal),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  };
  const adaptador = new CanalAmqp(conexao as never, canal as never);
  const mensagem = (corpo: unknown, properties: object = {}) => ({ content: Buffer.from(JSON.stringify(corpo)), properties });
  return { canal, conexao, consumidores, adaptador, mensagem };
}

describe("CanalAmqp", () => {
  it("declara fila duravel por padrao e exclusiva (com autoDelete) quando pedido", async () => {
    const { canal, adaptador } = criarFakes();
    await adaptador.declararFila("f");
    await adaptador.declararFila("r", { exclusiva: true });
    expect(canal.assertQueue).toHaveBeenNthCalledWith(1, "f", { durable: true, exclusive: false, autoDelete: false });
    expect(canal.assertQueue).toHaveBeenNthCalledWith(2, "r", { durable: false, exclusive: true, autoDelete: true });
  });

  it("publica JSON persistente com confirmacao e metadados", async () => {
    const { canal, adaptador } = criarFakes();
    await adaptador.publicar("f", { a: 1 }, { correlationId: "c", replyTo: "r" });
    const [fila, conteudo, opcoes] = canal.sendToQueue.mock.calls[0];
    expect(fila).toBe("f");
    expect(JSON.parse(conteudo.toString())).toEqual({ a: 1 });
    expect(opcoes).toMatchObject({ persistent: true, contentType: "application/json", correlationId: "c", replyTo: "r" });
  });

  it("publicar sem corpo envia null; erro de confirmacao rejeita", async () => {
    const { canal, adaptador } = criarFakes();
    await adaptador.publicar("f", undefined);
    expect(canal.sendToQueue.mock.calls[0][1].toString()).toBe("null");

    canal.sendToQueue.mockImplementationOnce((_f: string, _b: Buffer, _o: unknown, cb: Callback) => {
      cb(new Error("nack do broker"));
      return false;
    });
    await expect(adaptador.publicar("f", 1)).rejects.toThrow("nack do broker");
  });

  it("confirma (ack) a mensagem depois que o tratador conclui", async () => {
    const { canal, consumidores, adaptador, mensagem } = criarFakes();
    const recebidas: unknown[] = [];
    await adaptador.consumir("f", (m) => void recebidas.push(m));
    expect(canal.prefetch).toHaveBeenCalledWith(10);
    expect(canal.consume).toHaveBeenCalledWith("f", expect.any(Function), { noAck: false });

    const msg = mensagem({ x: 1 }, { correlationId: "c", replyTo: "r" });
    await consumidores["f"](msg);

    expect(recebidas).toEqual([{ corpo: { x: 1 }, correlationId: "c", replyTo: "r" }]);
    expect(canal.ack).toHaveBeenCalledWith(msg);
    expect(canal.nack).not.toHaveBeenCalled();
  });

  it("descarta (nack sem reenfileirar) quando o tratador falha ou o JSON e' invalido", async () => {
    const erro = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { canal, consumidores, adaptador, mensagem } = criarFakes();
    await adaptador.consumir("f", () => {
      throw new Error("boom");
    });

    const m1 = mensagem({ x: 1 });
    await consumidores["f"](m1);
    const m2 = { content: Buffer.from("nao-e-json"), properties: {} };
    await consumidores["f"](m2);

    expect(canal.nack).toHaveBeenNthCalledWith(1, m1, false, false);
    expect(canal.nack).toHaveBeenNthCalledWith(2, m2, false, false);
    expect(canal.ack).not.toHaveBeenCalled();
    erro.mockRestore();
  });

  it("ignora o aviso de cancelamento do consumidor (mensagem nula)", async () => {
    const { canal, consumidores, adaptador } = criarFakes();
    const tratador = jest.fn();
    await adaptador.consumir("f", tratador);
    await consumidores["f"](null);
    expect(tratador).not.toHaveBeenCalled();
    expect(canal.ack).not.toHaveBeenCalled();
  });

  it("fechar encerra canal e conexao", async () => {
    const { canal, conexao, adaptador } = criarFakes();
    await adaptador.fechar();
    expect(canal.close).toHaveBeenCalled();
    expect(conexao.close).toHaveBeenCalled();
  });
});

describe("conectarAmqp", () => {
  beforeEach(() => {
    connect.mockReset();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("conecta, abre canal com confirmacao e registra o tratador de erro da conexao", async () => {
    const { conexao } = criarFakes();
    connect.mockResolvedValue(conexao);
    const canal = await conectarAmqp("amqp://x");
    expect(canal).toBeInstanceOf(CanalAmqp);
    expect(connect).toHaveBeenCalledWith("amqp://x");
    const [evento, ouvinte] = conexao.on.mock.calls[0];
    expect(evento).toBe("error");
    ouvinte(new Error("queda"));
    expect(console.error).toHaveBeenCalledWith("[RABBITMQ] erro de conexao:", "queda");
  });

  it("tenta de novo ate o broker aceitar a conexao", async () => {
    const { conexao } = criarFakes();
    connect.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValue(conexao);
    const esperar = jest.fn().mockResolvedValue(undefined);

    await conectarAmqp("amqp://x", { tentativas: 5, intervaloMs: 7, esperar });

    expect(connect).toHaveBeenCalledTimes(3);
    expect(esperar).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledWith(7);
  });

  it("desiste depois de esgotar as tentativas, sem expor a URL", async () => {
    connect.mockRejectedValue(new Error("ECONNREFUSED"));
    const esperar = jest.fn().mockResolvedValue(undefined);

    const resultado = conectarAmqp("amqp://usuario:segredo@host", { tentativas: 2, esperar });

    await expect(resultado).rejects.toThrow("Nao foi possivel conectar ao RabbitMQ apos 2 tentativa(s): ECONNREFUSED");
    await expect(resultado).rejects.not.toThrow(/segredo/);
    expect(esperar).toHaveBeenCalledTimes(1); // nao espera depois da ultima tentativa
  });

  it("aceita erro que nao e' Error e usa a espera real por padrao", async () => {
    connect.mockRejectedValue("falhou");
    await expect(conectarAmqp("amqp://x", { tentativas: 2, intervaloMs: 1 })).rejects.toThrow(": falhou");
  });
});
