import { criarAppSaude } from "./health";

describe("criarAppSaude", () => {
  it("200 quando todas as dependencias respondem", async () => {
    const app = criarAppSaude("svc", { banco: async () => 1, mq: async () => undefined });
    const resposta = await app.inject({ method: "GET", url: "/health" });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ servico: "svc", status: "ok" });
  });

  it("200 sem verificacoes", async () => {
    const resposta = await criarAppSaude("svc").inject({ method: "GET", url: "/health" });
    expect(resposta.statusCode).toBe(200);
  });

  it("503 listando as dependencias que falharam", async () => {
    const app = criarAppSaude("svc", {
      banco: async () => {
        throw new Error("connection refused");
      },
      mq: async () => {
        throw "canal fechado";
      },
      ok: async () => undefined
    });
    const resposta = await app.inject({ method: "GET", url: "/health" });
    expect(resposta.statusCode).toBe(503);
    expect(resposta.json()).toEqual({ servico: "svc", status: "indisponivel", falhas: { banco: "connection refused", mq: "canal fechado" } });
  });
});
