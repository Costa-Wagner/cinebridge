import "dotenv/config";
import { randomUUID } from "crypto";
import * as amqp from "amqplib";
import { conectarAmqp } from "../mensageria/CanalAmqp";
import { CanalMensageria } from "../mensageria/CanalMensageria";
import { ClienteRPC, ErroRPC, TimeoutRPCError } from "../mensageria/ClienteRPC";
import { registrarRespondedor } from "../mensageria/ResponderRPC";
import { BarramentoRabbitMQ } from "../eventos/BarramentoRabbitMQ";
import { montarUrlMQ } from "../eventos/criarBarramento";

/** Exige o RabbitMQ do docker-compose (cinebridge-mq). Duas conexoes simulam dois servicos distintos. */
describe("Mensageria com RabbitMQ real", () => {
  const url = montarUrlMQ();
  const filasCriadas: string[] = [];
  let servidor: CanalMensageria;
  let cliente: CanalMensageria;

  const nomeFila = (prefixo: string) => {
    const nome = `teste.${prefixo}.${randomUUID()}`;
    filasCriadas.push(nome);
    return nome;
  };

  beforeAll(async () => {
    servidor = await conectarAmqp(url, { tentativas: 3, intervaloMs: 500 });
    cliente = await conectarAmqp(url, { tentativas: 3, intervaloMs: 500 });
  });

  afterAll(async () => {
    await servidor.fechar();
    await cliente.fechar();
    const conexao = await amqp.connect(url);
    const canal = await conexao.createChannel();
    for (const fila of filasCriadas) await canal.deleteQueue(fila);
    await conexao.close();
  });

  it("RPC entre duas conexoes devolve o resultado do respondedor", async () => {
    const fila = nomeFila("rpc");
    await registrarRespondedor(servidor, fila, (c: { n: number }) => ({ dobro: c.n * 2 }));
    const rpc = new ClienteRPC(cliente, { timeoutMs: 5000 });
    await rpc.iniciar();

    await expect(rpc.chamar(fila, { n: 21 })).resolves.toEqual({ dobro: 42 });
    const varias = await Promise.all([1, 2, 3].map((n) => rpc.chamar<{ dobro: number }>(fila, { n })));
    expect(varias.map((r) => r.dobro)).toEqual([2, 4, 6]);
    rpc.encerrar();
  });

  it("erro do respondedor chega ao cliente como ErroRPC", async () => {
    const fila = nomeFila("rpc-erro");
    await registrarRespondedor(servidor, fila, () => {
      throw new Error("sem profissionais");
    });
    const rpc = new ClienteRPC(cliente, { timeoutMs: 5000 });
    await rpc.iniciar();

    await expect(rpc.chamar(fila, {})).rejects.toThrow(new ErroRPC("sem profissionais"));
    rpc.encerrar();
  });

  it("sem respondedor a chamada estoura o timeout", async () => {
    const fila = nomeFila("rpc-mudo");
    await servidor.declararFila(fila);
    const rpc = new ClienteRPC(cliente, { timeoutMs: 300 });
    await rpc.iniciar();

    await expect(rpc.chamar(fila, {})).rejects.toBeInstanceOf(TimeoutRPCError);
    rpc.encerrar();
  });

  it("BarramentoRabbitMQ entrega o evento publicado por outra conexao", async () => {
    const topico = nomeFila("evento");
    const recebido = new Promise<unknown>(async (resolve) => {
      await new BarramentoRabbitMQ(servidor).assinar(topico, resolve);
    });

    await new BarramentoRabbitMQ(cliente).publicar(topico, { projetoId: "p1", membros: [] });

    await expect(recebido).resolves.toEqual({ projetoId: "p1", membros: [] });
  });

  it("mensagem publicada antes de haver consumidor e' entregue depois (fila duravel)", async () => {
    const topico = nomeFila("pendente");
    await new BarramentoRabbitMQ(cliente).publicar(topico, { n: 1 });

    const recebido = new Promise<unknown>(async (resolve) => {
      await new BarramentoRabbitMQ(servidor).assinar(topico, resolve);
    });

    await expect(recebido).resolves.toEqual({ n: 1 });
  });
});
