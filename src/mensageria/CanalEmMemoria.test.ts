import { CanalEmMemoria } from "./CanalEmMemoria";

describe("CanalEmMemoria", () => {
  it("entrega ao consumidor uma copia JSON da mensagem, com os metadados", async () => {
    const canal = new CanalEmMemoria();
    const recebidas: unknown[] = [];
    await canal.declararFila("f");
    await canal.consumir("f", (m) => void recebidas.push(m));

    const original = { a: 1 };
    await canal.publicar("f", original, { correlationId: "c1", replyTo: "r" });
    original.a = 2;

    expect(recebidas).toEqual([{ corpo: { a: 1 }, correlationId: "c1", replyTo: "r" }]);
  });

  it("guarda as mensagens ate haver consumidor e as entrega em ordem", async () => {
    const canal = new CanalEmMemoria();
    const recebidas: number[] = [];
    await canal.declararFila("f");
    await canal.publicar("f", 1);
    await canal.publicar("f", 2);

    await canal.consumir("f", (m) => void recebidas.push(m.corpo));

    expect(recebidas).toEqual([1, 2]);
  });

  it("corpo ausente vira null", async () => {
    const canal = new CanalEmMemoria();
    const recebidas: unknown[] = [];
    await canal.declararFila("f");
    await canal.consumir("f", (m) => void recebidas.push(m.corpo));
    await canal.publicar("f", undefined);
    expect(recebidas).toEqual([null]);
  });

  it("descarta mensagem para fila nao declarada e recusa consumir fila inexistente", async () => {
    const canal = new CanalEmMemoria();
    await expect(canal.publicar("nao-existe", 1)).resolves.toBeUndefined();
    await expect(canal.consumir("nao-existe", () => undefined)).rejects.toThrow("Fila inexistente: nao-existe");
  });

  it("falha do tratador nao chega ao publicador", async () => {
    const erro = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const canal = new CanalEmMemoria();
    await canal.declararFila("f");
    await canal.consumir("f", () => {
      throw new Error("boom");
    });

    await expect(canal.publicar("f", 1)).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it("declarar de novo preserva as pendentes e fechar remove os consumidores", async () => {
    const canal = new CanalEmMemoria();
    const recebidas: number[] = [];
    await canal.declararFila("f");
    await canal.publicar("f", 1);
    await canal.declararFila("f");
    await canal.consumir("f", (m) => void recebidas.push(m.corpo));
    await canal.fechar();
    await canal.publicar("f", 2); // sem consumidor: fica pendente

    expect(recebidas).toEqual([1]);
  });
});
