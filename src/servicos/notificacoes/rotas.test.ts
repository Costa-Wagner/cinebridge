import { criarAppSaude } from "../comum/health";
import { registrarRotasNotificacoes } from "./rotas";
import { ServicoNotificacoes } from "./ServicoNotificacoes";

const ID = "6d0b2c88-3b0a-4f43-9a52-2a1d6c7a9e10";

describe("rotas do cinebridge-notificacoes", () => {
  function montar() {
    const servico = { listar: jest.fn().mockResolvedValue([{ id: "n1", projetoId: ID }]) };
    const app = criarAppSaude("notificacoes");
    registrarRotasNotificacoes(app, servico as unknown as ServicoNotificacoes);
    return { app, servico };
  }

  it("GET /notificacoes lista tudo e aceita filtro por projeto", async () => {
    const { app, servico } = montar();
    const todas = await app.inject({ method: "GET", url: "/notificacoes" });
    expect(todas.statusCode).toBe(200);
    expect(todas.json()).toEqual([{ id: "n1", projetoId: ID }]);
    expect(servico.listar).toHaveBeenLastCalledWith(undefined);

    await app.inject({ method: "GET", url: `/notificacoes?projetoId=${ID}` });
    expect(servico.listar).toHaveBeenLastCalledWith(ID);
  });

  it("projetoId invalido e' recusado", async () => {
    expect((await montar().app.inject({ method: "GET", url: "/notificacoes?projetoId=abc" })).statusCode).toBe(400);
  });
});
