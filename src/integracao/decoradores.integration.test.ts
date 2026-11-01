import { DataSource } from "typeorm";
import { FastifyInstance } from "fastify";
import { prepararBancoDeTestes } from "./bancoDeTestes";
import { criarApp } from "../app";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { ConfiguracaoDecoradores } from "../decoradores/PilhaDecoradores";
import { RecomendadorPorPontuacao } from "../strategies/RecomendadorPorPontuacao";

const documentario = {
  tipoCaptacao: "DOCUMENTARIO",
  duracaoEstimadaMinutos: 80,
  orcamentoTotal: 60000,
  dataEntrega: "2026-12-10",
  localizacaoFilmagem: "Santos",
  tema: "Mares",
  entrevistados: ["Ana"]
};

let ds: DataSource;
let app: FastifyInstance;
let auditoria: string[];
let calculos: jest.SpyInstance;

async function recomendar(payload: object = {}): Promise<{ id: string; corpo: { membros: unknown[] } }> {
  const criado = await app.inject({ method: "POST", url: "/projetos", payload: documentario });
  const id = criado.json().id;
  const resposta = await app.inject({ method: "POST", url: `/projetos/${id}/recomendar`, payload });
  expect(resposta.statusCode).toBe(200);
  return { id, corpo: resposta.json() };
}

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  ds = (await prepararBancoDeTestes()).ds;
  auditoria = [];
  const decoradores = new ConfiguracaoDecoradores([], (linha) => auditoria.push(linha));
  app = criarApp(new ServicoProjetos(ds, montarSistema(), undefined, decoradores));
});

beforeEach(() => {
  auditoria = [];
  calculos = jest.spyOn(RecomendadorPorPontuacao.prototype, "recomendar");
});

afterEach(() => calculos.mockRestore());

afterAll(async () => {
  await app.close();
  await ds.destroy();
  jest.restoreAllMocks();
});

const configurar = (pilha: string[]) =>
  app.inject({ method: "PUT", url: "/configuracao/decoradores", payload: { pilha } });

describe("Decorator: pilha configuravel em tempo de execucao (banco real)", () => {
  it("sem decoradores, cada recomendacao calcula e nada e' auditado", async () => {
    await configurar([]);
    await recomendar();
    await recomendar();
    expect(calculos).toHaveBeenCalledTimes(2);
    expect(auditoria.filter((l) => l.includes("AUDITORIA_RECOMENDACAO"))).toHaveLength(0);
  });

  it("CACHE: projetos equivalentes reaproveitam o ranking e o resultado final e' o mesmo", async () => {
    await configurar(["CACHE"]);
    const a = await recomendar();
    const b = await recomendar();
    expect(calculos).toHaveBeenCalledTimes(1);
    const ids = (r: { corpo: { membros: unknown[] } }) =>
      (r.corpo.membros as Array<{ papel: string; profissional: { id: string } }>).map((m) => `${m.papel}:${m.profissional.id}`);
    expect(ids(b)).toEqual(ids(a));
  });

  it("AUDITORIA por fora do CACHE registra todas as chamadas, inclusive as atendidas pelo cache", async () => {
    await configurar(["CACHE", "AUDITORIA"]);
    await recomendar();
    await recomendar();
    const registros = auditoria.filter((l) => l.includes("AUDITORIA_RECOMENDACAO")).map((l) => JSON.parse(l));
    expect(registros).toHaveLength(2);
    expect(registros[0]).toMatchObject({ estrategia: "RecomendadorDocumentario", tipoProjeto: "DOCUMENTARIO" });
    expect(Object.keys(registros[0].resultado).length).toBeGreaterThan(0);
  });

  it("a estrategia registrada continua sendo a do tipo, mesmo com a pilha completa", async () => {
    await configurar(["CACHE", "AUDITORIA", "COMPRESSAO"]);
    const { id } = await recomendar();
    const historico = await app.inject({ method: "GET", url: `/projetos/${id}/recomendacoes` });
    expect(new Set(historico.json().map((r: { estrategia: string }) => r.estrategia))).toEqual(new Set(["RecomendadorDocumentario"]));
  });

  it("a preferencia da chamada sobrepoe a pilha global", async () => {
    await configurar([]);
    await recomendar({ decoradores: ["AUDITORIA"] });
    expect(auditoria.filter((l) => l.includes("AUDITORIA_RECOMENDACAO"))).toHaveLength(1);
    const outra = await recomendar({ decoradores: ["AUDITORIA"] });
    expect(outra.corpo.membros.length).toBeGreaterThan(0);
  });

  it("decorador desconhecido na chamada: 400 e nada e' recomendado", async () => {
    const criado = await app.inject({ method: "POST", url: "/projetos", payload: documentario });
    const resposta = await app.inject({
      method: "POST",
      url: `/projetos/${criado.json().id}/recomendar`,
      payload: { decoradores: ["LOG"] }
    });
    expect(resposta.statusCode).toBe(400);
    expect(calculos).not.toHaveBeenCalled();
  });
});
