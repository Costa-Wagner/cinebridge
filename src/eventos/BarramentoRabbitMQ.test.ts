import { BarramentoRabbitMQ } from "./BarramentoRabbitMQ";
import { CanalEmMemoria } from "../mensageria/CanalEmMemoria";
import { montarUrlMQ, criarBarramento } from "./criarBarramento";
import { BarramentoEmMemoria } from "./BarramentoEventos";

describe("BarramentoRabbitMQ", () => {
  it("entrega ao assinante o payload publicado no topico", async () => {
    const barramento = new BarramentoRabbitMQ(new CanalEmMemoria());
    const recebidos: unknown[] = [];
    await barramento.assinar("equipe.formada", (p) => void recebidos.push(p));
    await barramento.publicar("equipe.formada", { projetoId: "p1" });
    expect(recebidos).toEqual([{ projetoId: "p1" }]);
  });

  it("mensagens publicadas antes da assinatura ficam na fila", async () => {
    const barramento = new BarramentoRabbitMQ(new CanalEmMemoria());
    await barramento.publicar("t", 1);
    const recebidos: unknown[] = [];
    await barramento.assinar("t", (p) => void recebidos.push(p));
    expect(recebidos).toEqual([1]);
  });

  it("declara cada fila uma unica vez", async () => {
    const canal = new CanalEmMemoria();
    const declarar = jest.spyOn(canal, "declararFila");
    const barramento = new BarramentoRabbitMQ(canal);
    await barramento.publicar("t", 1);
    await barramento.publicar("t", 2);
    await barramento.assinar("t", () => undefined);
    expect(declarar).toHaveBeenCalledTimes(1);
  });

  it("verificar usa a conexao e falha quando o canal caiu", async () => {
    const canal = new CanalEmMemoria();
    const barramento = new BarramentoRabbitMQ(canal);
    await expect(barramento.verificar("equipe.formada")).resolves.toBeUndefined();
    jest.spyOn(canal, "declararFila").mockRejectedValue(new Error("Channel closed"));
    await expect(barramento.verificar("equipe.formada")).rejects.toThrow("Channel closed");
  });

  it("falha do publicador chega ao chamador", async () => {
    const canal = new CanalEmMemoria();
    jest.spyOn(canal, "publicar").mockRejectedValue(new Error("fora"));
    await expect(new BarramentoRabbitMQ(canal).publicar("t", 1)).rejects.toThrow("fora");
  });
});

describe("criarBarramento", () => {
  it("usa o barramento em memoria por padrao", async () => {
    expect(await criarBarramento({})).toBeInstanceOf(BarramentoEmMemoria);
    expect(await criarBarramento({ BARRAMENTO: "MEMORIA" })).toBeInstanceOf(BarramentoEmMemoria);
  });

  it("conecta ao broker quando BARRAMENTO=rabbitmq", async () => {
    const conectar = jest.fn().mockResolvedValue(new CanalEmMemoria());
    const barramento = await criarBarramento({ BARRAMENTO: "rabbitmq", MQ_HOST: "cinebridge-mq" }, conectar);
    expect(barramento).toBeInstanceOf(BarramentoRabbitMQ);
    expect(conectar).toHaveBeenCalledWith("amqp://guest:guest@cinebridge-mq:5672");
  });

  it("recusa valor desconhecido", async () => {
    await expect(criarBarramento({ BARRAMENTO: "kafka" })).rejects.toThrow('BARRAMENTO invalido: "kafka"');
  });

  it("monta a URL com padroes e escapa credenciais", () => {
    expect(montarUrlMQ({})).toBe("amqp://guest:guest@localhost:5672");
    expect(montarUrlMQ({ MQ_USER: "u@x", MQ_PASSWORD: "p/w", MQ_HOST: "h", MQ_PORT: "1" })).toBe("amqp://u%40x:p%2Fw@h:1");
  });
});
