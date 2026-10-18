import { criarApp } from "./app";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { ProjetoInvalidoError } from "./orquestrador/ProjetoInvalidoError";
import { TipoSemFabricaError } from "./fabricas/TipoSemFabricaError";
import { OperacaoInvalidaError } from "./domain/erros";
import { Equipe } from "./domain/entities/Equipe";
import { MembroEquipe } from "./domain/entities/MembroEquipe";
import { Profissional } from "./domain/entities/Profissional";
import { Papel } from "./domain/enums/Papel";
import { StatusEquipe } from "./domain/enums/StatusEquipe";

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
  equipe.status = StatusEquipe.EM_FORMACAO;
  equipe.projeto = { id: ID } as never;
  equipe.membros = [membro];
  equipe.ranking = new Map([[Papel.DIRETOR, [ana, bruno]]]);
  return equipe;
}

function montar() {
  const servico = {
    criar: jest.fn(),
    recomendar: jest.fn(),
    buscarEquipe: jest.fn(),
    aceitarRecomendacao: jest.fn(),
    substituirMembro: jest.fn(),
    reavaliar: jest.fn(),
    responderConvite: jest.fn()
  };
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
        status: "EM_FORMACAO",
        membros: [
          {
            papel: "DIRETOR",
            profissional: { id: "p1", nome: "Ana" },
            aceitouConvite: false,
            conviteId: null,
            situacao: "PROPOSTO"
          }
        ],
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

  describe("fluxo do produtor e dos profissionais", () => {
    const corpo = { papel: "DIRETOR", profissionalId: "0350ed4b-6747-4d61-946f-32a935d8f85d" };

    it("POST /equipe/aceitar devolve 201 com o convite", async () => {
      const { app, servico } = montar();
      servico.aceitarRecomendacao.mockResolvedValue({ id: "c1", status: "PENDENTE", papel: "DIRETOR" });

      const resposta = await app.inject({ method: "POST", url: `/projetos/${ID}/equipe/aceitar`, payload: corpo });

      expect(resposta.statusCode).toBe(201);
      expect(resposta.json()).toEqual({ conviteId: "c1", status: "PENDENTE", papel: "DIRETOR", profissionalId: corpo.profissionalId });
      expect(servico.aceitarRecomendacao).toHaveBeenCalledWith(ID, "DIRETOR", corpo.profissionalId);
    });

    it("POST /equipe/substituir devolve a equipe atualizada", async () => {
      const { app, servico } = montar();
      servico.substituirMembro.mockResolvedValue(criarEquipe());

      const resposta = await app.inject({ method: "POST", url: `/projetos/${ID}/equipe/substituir`, payload: corpo });

      expect(resposta.statusCode).toBe(200);
      expect(resposta.json().membros).toHaveLength(1);
    });

    it("POST /reavaliar aceita corpo vazio ou com ajustes", async () => {
      const { app, servico } = montar();
      servico.reavaliar.mockResolvedValue(criarEquipe());

      const vazio = await app.inject({ method: "POST", url: `/projetos/${ID}/reavaliar` });
      const ajustado = await app.inject({
        method: "POST",
        url: `/projetos/${ID}/reavaliar`,
        payload: { orcamentoTotal: 75000, dataEntrega: "2026-12-20" }
      });

      expect(vazio.statusCode).toBe(200);
      expect(ajustado.statusCode).toBe(200);
      expect(servico.reavaliar).toHaveBeenNthCalledWith(1, ID, {});
      expect(servico.reavaliar).toHaveBeenNthCalledWith(2, ID, { orcamentoTotal: 75000, dataEntrega: "2026-12-20" });
    });

    it("POST /convites/:id/responder informa o status e se a equipe foi formada", async () => {
      const { app, servico } = montar();
      servico.responderConvite.mockResolvedValue({ convite: { id: "c1", status: "ACEITO" }, equipeFormada: true });

      const resposta = await app.inject({ method: "POST", url: `/convites/${ID}/responder`, payload: { aceito: true } });

      expect(resposta.json()).toEqual({ conviteId: "c1", status: "ACEITO", equipeFormada: true });
      expect(servico.responderConvite).toHaveBeenCalledWith(ID, true);
    });

    it.each([
      ["aceitar", `/projetos/${ID}/equipe/aceitar`, "aceitarRecomendacao", corpo],
      ["substituir", `/projetos/${ID}/equipe/substituir`, "substituirMembro", corpo],
      ["reavaliar", `/projetos/${ID}/reavaliar`, "reavaliar", {}],
      ["responder", `/convites/${ID}/responder`, "responderConvite", { aceito: false }]
    ])("%s: 404 quando o servico nao encontra o recurso", async (_nome, url, metodo, payload) => {
      const { app, servico } = montar();
      (servico as Record<string, jest.Mock>)[metodo].mockResolvedValue(null);

      const resposta = await app.inject({ method: "POST", url, payload });

      expect(resposta.statusCode).toBe(404);
    });

    it("operacao incompativel com o estado vira 409", async () => {
      const { app, servico } = montar();
      servico.aceitarRecomendacao.mockRejectedValue(new OperacaoInvalidaError("ja foi convidado"));

      const resposta = await app.inject({ method: "POST", url: `/projetos/${ID}/equipe/aceitar`, payload: corpo });

      expect(resposta.statusCode).toBe(409);
      expect(resposta.json()).toEqual({ erro: "ja foi convidado" });
    });

    it.each([
      ["papel desconhecido", `/projetos/${ID}/equipe/aceitar`, { ...corpo, papel: "CAMERA" }],
      ["profissionalId que nao e' uuid", `/projetos/${ID}/equipe/substituir`, { ...corpo, profissionalId: "x" }],
      ["data de reavaliacao fora do formato", `/projetos/${ID}/reavaliar`, { dataEntrega: "20/12/2026" }],
      ["resposta sem o campo aceito", `/convites/${ID}/responder`, {}]
    ])("responde 400 para %s", async (_motivo, url, payload) => {
      const { app } = montar();

      const resposta = await app.inject({ method: "POST", url, payload });

      expect(resposta.statusCode).toBe(400);
    });

    it("situacao do membro: confirmado, status do convite ou proposto", async () => {
      const { app, servico } = montar();
      const equipe = criarEquipe();
      equipe.membros[0].aceitouConvite = true;
      const pendente = Object.assign(new MembroEquipe(), {
        papel: Papel.EDITOR,
        profissional: bruno,
        aceitouConvite: false,
        convite: { id: "c9", status: "PENDENTE" }
      });
      equipe.membros.push(pendente);
      servico.buscarEquipe.mockResolvedValue(equipe);

      const resposta = await app.inject({ method: "GET", url: `/projetos/${ID}/equipe` });

      expect(resposta.json().membros.map((m: { situacao: string }) => m.situacao)).toEqual(["CONFIRMADO", "PENDENTE"]);
      expect(resposta.json().membros[1].conviteId).toBe("c9");
    });
  });
});

