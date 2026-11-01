import { DataSource } from "typeorm";
import { FastifyInstance } from "fastify";
import { prepararBancoDeTestes } from "./bancoDeTestes";
import { criarApp } from "../app";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { Projeto } from "../domain/entities/Projeto";
import { PacoteServico } from "../domain/servicos/PacoteServico";
import { ServicoAtomico } from "../domain/servicos/ServicoAtomico";
import { Papel } from "../domain/enums/Papel";

const base = {
  tipoCaptacao: "DOCUMENTARIO",
  duracaoEstimadaMinutos: 80,
  orcamentoTotal: 60000,
  dataEntrega: "2026-12-10",
  localizacaoFilmagem: "Santos",
  tema: "Mares",
  entrevistados: ["Ana"]
};

const posProducao = {
  tipo: "PACOTE",
  nome: "Pos-producao",
  modo: "SEQUENCIAL",
  servicos: [
    { tipo: "ATOMICO", nome: "Edicao", papel: "EDITOR", peso: 8, custo: 4000, prazoDias: 10 },
    {
      tipo: "PACOTE",
      nome: "Audio",
      modo: "PARALELO",
      servicos: [
        { tipo: "ATOMICO", nome: "Mixagem", papel: "SONOPLASTA", peso: 6, custo: 2500, prazoDias: 6 },
        { tipo: "ATOMICO", nome: "VFX", papel: "ESPECIALISTA_EFEITOS_VISUAIS", peso: 5, custo: 3000, prazoDias: 12 }
      ]
    }
  ]
};

let ds: DataSource;
let app: FastifyInstance;

beforeAll(async () => {
  ds = (await prepararBancoDeTestes()).ds;
  app = criarApp(new ServicoProjetos(ds, montarSistema()));
});

afterAll(async () => {
  await app.close();
  await ds.destroy();
});

describe("Composite persistido no Postgres", () => {
  it("grava a arvore em servicoPrincipal (jsonb) e a reidrata com os mesmos custo, prazo e papeis", async () => {
    const resposta = await app.inject({
      method: "POST",
      url: "/projetos",
      payload: { ...base, servicoPrincipal: posProducao }
    });
    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().servicoPrincipal).toEqual(posProducao);
    expect(resposta.json().papeisObrigatorios.map((p: { papel: string }) => p.papel)).toEqual([
      "EDITOR", "SONOPLASTA", "ESPECIALISTA_EFEITOS_VISUAIS"
    ]);

    const gravado = await ds.getRepository(Projeto).findOneByOrFail({ id: resposta.json().id });
    expect(gravado.servicoPrincipal).toBeInstanceOf(PacoteServico);
    expect(gravado.servicoPrincipal.listarSubservicos()[0]).toBeInstanceOf(ServicoAtomico);
    expect(gravado.calcularCustoTotal()).toBe(9500);
    expect(gravado.obterPrazoTotal()).toBe(10 + 12);
    expect(gravado.papeisObrigatorios).toHaveLength(3);
    expect(gravado.validarServicos()).toEqual([]);
  });

  it("recomenda a equipe a partir dos papeis derivados da arvore", async () => {
    const criado = await app.inject({ method: "POST", url: "/projetos", payload: { ...base, servicoPrincipal: posProducao } });
    const resposta = await app.inject({ method: "POST", url: `/projetos/${criado.json().id}/recomendar`, payload: {} });
    expect(resposta.statusCode).toBe(200);
    const papeis = resposta.json().membros.map((m: { papel: string }) => m.papel).sort();
    expect(papeis).toEqual([Papel.EDITOR, Papel.ESPECIALISTA_EFEITOS_VISUAIS, Papel.SONOPLASTA].sort());
  });

  it("projeto criado so' com papeis vira pacote plano persistido", async () => {
    const criado = await app.inject({ method: "POST", url: "/projetos", payload: base });
    const gravado = await ds.getRepository(Projeto).findOneByOrFail({ id: criado.json().id });
    expect(gravado.servicoPrincipal.listarSubservicos().length).toBe(gravado.papeisObrigatorios.length);
    expect(gravado.calcularCustoTotal()).toBe(0);
  });

  it("arvore invalida na API: 4xx e nada gravado", async () => {
    const antes = await ds.getRepository(Projeto).count();
    const ruim = await app.inject({
      method: "POST",
      url: "/projetos",
      payload: { ...base, servicoPrincipal: { tipo: "PACOTE", nome: "vazio", servicos: [] } }
    });
    expect(ruim.statusCode).toBeGreaterThanOrEqual(400);
    expect(ruim.statusCode).toBeLessThan(500);
    const malformada = await app.inject({ method: "POST", url: "/projetos", payload: { ...base, servicoPrincipal: { tipo: "X" } } });
    expect(malformada.statusCode).toBeGreaterThanOrEqual(400);
    expect(malformada.statusCode).toBeLessThan(500);
    expect(await ds.getRepository(Projeto).count()).toBe(antes);
  });
});
