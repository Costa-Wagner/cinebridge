import { criarAppSaude } from "../comum/health";
import { registrarRotasProjetos } from "./rotas";
import { GestaoProjetos } from "./GestaoProjetos";

const ID = "6d0b2c88-3b0a-4f43-9a52-2a1d6c7a9e10";

function montar() {
  const gestao = {
    listar: jest.fn().mockResolvedValue([{ id: ID, status: "CRIADO" }]),
    obter: jest.fn(async (id: string) => (id === ID ? { id: ID, status: "CRIADO" } : null))
  };
  const app = criarAppSaude("projetos");
  registrarRotasProjetos(app, gestao as unknown as GestaoProjetos);
  return app;
}

describe("rotas do cinebridge-projetos", () => {
  it("GET /projetos lista os registros", async () => {
    const resposta = await montar().inject({ method: "GET", url: "/projetos" });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual([{ id: ID, status: "CRIADO" }]);
  });

  it("GET /projetos/:id devolve o registro, 404 se nao existe e 400 se o id e' invalido", async () => {
    const app = montar();
    expect((await app.inject({ method: "GET", url: `/projetos/${ID}` })).json()).toEqual({ id: ID, status: "CRIADO" });
    const ausente = await app.inject({ method: "GET", url: "/projetos/11111111-1111-1111-1111-111111111111" });
    expect(ausente.statusCode).toBe(404);
    expect(ausente.json()).toEqual({ erro: "Projeto nao encontrado" });
    expect((await app.inject({ method: "GET", url: "/projetos/abc" })).statusCode).toBe(400);
  });
});
