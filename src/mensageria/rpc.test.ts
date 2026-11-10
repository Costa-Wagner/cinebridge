import { CanalEmMemoria } from "./CanalEmMemoria";
import { ClienteRPC, ErroRPC, TimeoutRPCError } from "./ClienteRPC";
import { registrarRespondedor } from "./ResponderRPC";

async function montar(timeoutMs = 1000) {
  const canal = new CanalEmMemoria();
  const cliente = new ClienteRPC(canal, { timeoutMs });
  await cliente.iniciar();
  return { canal, cliente };
}

describe("RPC sobre filas", () => {
  it("devolve o resultado do respondedor", async () => {
    const { canal, cliente } = await montar();
    await registrarRespondedor(canal, "dobro", (c: { n: number }) => ({ dobro: c.n * 2 }));
    await expect(cliente.chamar("dobro", { n: 21 })).resolves.toEqual({ dobro: 42 });
  });

  it("chamadas simultaneas nao se misturam (correlationId)", async () => {
    const { canal, cliente } = await montar();
    await registrarRespondedor(canal, "eco", async (c: { v: string }) => c.v);
    const respostas = await Promise.all([cliente.chamar("eco", { v: "a" }), cliente.chamar("eco", { v: "b" }), cliente.chamar("eco", { v: "c" })]);
    expect(respostas).toEqual(["a", "b", "c"]);
  });

  it("erro do respondedor vira ErroRPC (Error ou valor simples)", async () => {
    const { canal, cliente } = await montar();
    await registrarRespondedor(canal, "falha", () => {
      throw new Error("sem profissionais");
    });
    await registrarRespondedor(canal, "falha-texto", () => {
      throw "texto";
    });
    await expect(cliente.chamar("falha", {})).rejects.toThrow(new ErroRPC("sem profissionais"));
    await expect(cliente.chamar("falha-texto", {})).rejects.toThrow("texto");
  });

  it("resultado vazio resolve como undefined", async () => {
    const { canal, cliente } = await montar();
    await registrarRespondedor(canal, "vazio", () => undefined);
    await expect(cliente.chamar("vazio", {})).resolves.toBeUndefined();
  });

  it("estoura TimeoutRPCError quando ninguem responde e ignora a resposta tardia", async () => {
    const { canal, cliente } = await montar(20);
    await canal.declararFila("mudo");
    await expect(cliente.chamar("mudo", {})).rejects.toBeInstanceOf(TimeoutRPCError);
    await expect(cliente.chamar("mudo", {})).rejects.toThrow("Sem resposta de mudo em 20 ms");
  });

  it("usa timeout de 5 s por padrao", async () => {
    jest.useFakeTimers();
    try {
      const canal = new CanalEmMemoria();
      const cliente = new ClienteRPC(canal);
      await cliente.iniciar();
      await canal.declararFila("mudo");
      const chamada = cliente.chamar("mudo", {});
      const resultado = expect(chamada).rejects.toThrow("em 5000 ms");
      await jest.advanceTimersByTimeAsync(5000);
      await resultado;
    } finally {
      jest.useRealTimers();
    }
  });

  it("respostas desconhecidas ou sem correlationId sao ignoradas", async () => {
    const { canal, cliente } = await montar(50);
    await canal.declararFila("mudo");
    const filaResposta = (cliente as unknown as { filaResposta: string }).filaResposta;
    await canal.publicar(filaResposta, { resultado: 1 }, { correlationId: "desconhecido" });
    await canal.publicar(filaResposta, { resultado: 1 });
    await expect(cliente.chamar("mudo", {})).rejects.toBeInstanceOf(TimeoutRPCError);
  });

  it("falha ao publicar rejeita a chamada e nao deixa pendencia", async () => {
    const { canal, cliente } = await montar();
    jest.spyOn(canal, "publicar").mockRejectedValue(new Error("broker fora"));
    await expect(cliente.chamar("f", {})).rejects.toThrow("broker fora");
    expect((cliente as unknown as { pendentes: Map<string, unknown> }).pendentes.size).toBe(0);
  });

  it("exige iniciar() antes de chamar", async () => {
    const cliente = new ClienteRPC(new CanalEmMemoria());
    await expect(cliente.chamar("f", {})).rejects.toThrow("ClienteRPC nao iniciado");
  });

  it("encerrar rejeita as chamadas em andamento", async () => {
    const { canal, cliente } = await montar();
    await canal.declararFila("mudo");
    const chamada = cliente.chamar("mudo", {});
    await Promise.resolve();
    cliente.encerrar();
    await expect(chamada).rejects.toThrow("ClienteRPC encerrado");
  });

  it("o respondedor executa o tratador mesmo sem replyTo (fire-and-forget)", async () => {
    const canal = new CanalEmMemoria();
    const tratador = jest.fn();
    await registrarRespondedor(canal, "f", tratador);
    await canal.publicar("f", { a: 1 });
    expect(tratador).toHaveBeenCalledWith({ a: 1 });
  });
});
