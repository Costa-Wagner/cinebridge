import { criarApp } from "./app";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { ProjetoInvalidoError } from "./orquestrador/ProjetoInvalidoError";
import { TipoSemFabricaError } from "./fabricas/TipoSemFabricaError";
import { Equipe } from "./domain/entities/Equipe";
import { MembroEquipe } from "./domain/entities/MembroEquipe";
import { Profissional } from "./domain/entities/Profissional";
import { Papel } from "./domain/enums/Papel";

const ID = "0350ed4b-6747-4d61-946f-32a935d8f85d";
const ana = { id: "p1", nome: "Ana" } as Profissional;
const bruno = { id: "p2", nome: "Bruno" } as Profissional;

const corpoValido = {
  tipoCaptacao: "DOCUMENTARIO",
  duracaoEstimadaMinutos: 80,
  orcamentoTotal: 60000,
  dataEntrega: "2026-12-10",
  localizacaoFilmagem: "Santos",
  tema: "Mares"
};

function criarEquipe(): Equipe {
  const membro = new MembroEquipe();
  membro.papel = Papel.DIRETOR;
  membro.profissional = ana;
  membro.aceitouConvite = false;
  const equipe = new Equipe();
  equipe.id = "e1";
  equipe.projeto = { id: ID } as never;
  equipe.membros = [membro];
  equipe.ranking = new Map([[Papel.DIRETOR, [ana, bruno]]]);
  return equipe;
}

function montar() {
  const servico = { criar: jest.fn(), recomendar: jest.fn(), buscarEquipe: jest.fn() };
  const app = criarApp(servico as unknown as ServicoProjetos);
  return { app, servico };
}

describe("API", () => {
  it("GET /health responde ok", async () => {
    const { app } = montar();

    const resposta = await app.inject({ method: "GET", url: "/health" });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: "ok" });
  });

  describe("POST /projetos", () => {
    it("cria o projeto: separa o tipo dos demais dados e responde 201", async () => {
      const { app, servico } = montar();
      servico.criar.mockResolvedValue({ id: ID, tema: "Mares" });

      const resposta = await app.inject({ method: "POST", url: "/projetos", payload: corpoValido });

      expect(resposta.statusCode).toBe(201);
      expect(resposta.json()).toEqual({ id: ID, tema: "Mares" });
      const { tipoCaptacao, ...dados } = corpoValido;
      expect(servico.criar).toHaveBeenCalledWith(tipoCaptacao, dados);
    });

    it.each([
      ["campo obrigatorio ausente", { tipoCaptacao: "ANIMACAO" }],
      ["tipo desconhecido", { ...corpoValido, tipoCaptacao: "FICCAO" }],
      ["data fora do formato", { ...corpoValido, dataEntrega: "10/12/2026" }],
      ["papel desconhecido", { ...corpoValido, papeisObrigatorios: [{ papel: "CAMERA", peso: 5 }] }]
    ])("responde 400 para %s", async (_motivo, payload) => {
      const { app, servico } = montar();

      const resposta = await app.inject({ method: "POST", url: "/projetos", payload });

      expect(resposta.statusCode).toBe(400);
      expect(servico.criar).not.toHaveBeenCalled();
    });

    it("responde 422 com os problemas quando o projeto e' invalido", async () => {
      const { app, servico } = montar();
      servico.criar.mockRejectedValue(new ProjetoInvalidoError(["documentario exige tema"]));

      const resposta = await app.inject({ method: "POST", url: "/projetos", payload: corpoValido });

      expect(resposta.statusCode).toBe(422);
      expect(resposta.json().problemas).toEqual(["documentario exige tema"]);
    });

    it("responde 422 quando o tipo nao tem fabrica", async () => {
      const { app, servico } = montar();
      servico.criar.mockRejectedValue(new TipoSemFabricaError("PUBLICITARIO"));

      const resposta = await app.inject({ method: "POST", url: "/projetos", payload: corpoValido });

      expect(resposta.statusCode).toBe(422);
      expect(resposta.json().erro).toContain("PUBLICITARIO");
    });

    it("responde 500 sem vazar detalhes de erros inesperados", async () => {
      const { app, servico } = montar();
      servico.criar.mockRejectedValue(new Error("falha interna secreta"));

      const resposta = await app.inject({ method: "POST", url: "/projetos", payload: corpoValido });

      expect(resposta.statusCode).toBe(500);
      expect(resposta.json()).toEqual({ erro: "Erro interno" });
    });
  });

  describe("POST /projetos/:id/recomendar", () => {
    it("devolve a equipe proposta e as alternativas por papel", async () => {
      const { app, servico } = montar();
      servico.recomendar.mockResolvedValue(criarEquipe());

      const resposta = await app.inject({ method: "POST", url: `/projetos/${ID}/recomendar`, payload: {} });

      expect(resposta.statusCode).toBe(200);
      expect(resposta.json()).toEqual({
        equipeId: "e1",
        projetoId: ID,
        membros: [{ papel: "DIRETOR", profissional: { id: "p1", nome: "Ana" }, aceitouConvite: false }],
        alternativas: { DIRETOR: [{ id: "p2", nome: "Bruno" }] }
      });
    });

    it("responde 404 quando o projeto nao existe", async () => {
      const { app, servico } = montar();
      servico.recomendar.mockResolvedValue(null);

      const resposta = await app.inject({ method: "POST", url: `/projetos/${ID}/recomendar`, payload: {} });

      expect(resposta.statusCode).toBe(404);
    });

    it("responde 400 quando o id nao e' um uuid", async () => {
      const { app, servico } = montar();

      const resposta = await app.inject({ method: "POST", url: "/projetos/abc/recomendar", payload: {} });

      expect(resposta.statusCode).toBe(400);
      expect(servico.recomendar).not.toHaveBeenCalled();
    });
  });

  describe("GET /projetos/:id/equipe", () => {
    it("devolve a equipe persistida", async () => {
      const { app, servico } = montar();
      servico.buscarEquipe.mockResolvedValue(criarEquipe());

      const resposta = await app.inject({ method: "GET", url: `/projetos/${ID}/equipe` });

      expect(resposta.statusCode).toBe(200);
      expect(resposta.json().membros).toHaveLength(1);
    });

    it("responde 404 quando nao ha equipe", async () => {
      const { app, servico } = montar();
      servico.buscarEquipe.mockResolvedValue(null);

      const resposta = await app.inject({ method: "GET", url: `/projetos/${ID}/equipe` });

      expect(resposta.statusCode).toBe(404);
    });
  });
});
