import { DataSource } from "typeorm";
import { FastifyInstance } from "fastify";
import { prepararBancoDeTestes } from "./bancoDeTestes";
import { criarApp } from "../app";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { Projeto } from "../domain/entities/Projeto";
import { ProjetoDocumentario } from "../domain/entities/ProjetoDocumentario";
import { ProjetoAnimacao } from "../domain/entities/ProjetoAnimacao";
import { ProjetoPublicitario } from "../domain/entities/ProjetoPublicitario";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";
import { MembroEquipe } from "../domain/entities/MembroEquipe";
import { Papel } from "../domain/enums/Papel";
import { RecomendadorPorPontuacao } from "../strategies/RecomendadorPorPontuacao";
import { SimilaridadeCosseno } from "../strategies/SimilaridadeCosseno";
import { FiltragemColaborativa } from "../strategies/FiltragemColaborativa";
import { RegrasOrcamento } from "../strategies/RegrasOrcamento";
import { ValidadorConsistencia } from "../visitors/ValidadorConsistencia";
import { CalculadorCompatibilidade } from "../visitors/CalculadorCompatibilidade";
import { GeradorRelatorio } from "../visitors/GeradorRelatorio";

const base = { duracaoEstimadaMinutos: 80, orcamentoTotal: 60000, dataEntrega: "2026-12-10", localizacaoFilmagem: "Santos" };
const documentario = { ...base, tipoCaptacao: "DOCUMENTARIO", tema: "Mares", entrevistados: ["Ana", "Beto"] };
const publicitario = { ...base, tipoCaptacao: "PUBLICITARIO", cliente: "Acme", canal: "TV" };

let ds: DataSource;
let app: FastifyInstance;
let sistema: SistemaRecomendacao;
let projetoAnimacaoId: string;
let linhas: string[];

const papeis = (membros: { papel: string }[]) => membros.map((m) => m.papel).sort();

async function criar(payload: object): Promise<string> {
  const resposta = await app.inject({ method: "POST", url: "/projetos", payload });
  expect(resposta.statusCode).toBe(201);
  return resposta.json().id;
}

async function recomendar(id: string) {
  const resposta = await app.inject({ method: "POST", url: `/projetos/${id}/recomendar`, payload: {} });
  expect(resposta.statusCode).toBe(200);
  return resposta.json();
}

async function carregarProfissionais(): Promise<Profissional[]> {
  return ds.getRepository(Profissional).find({
    relations: ["competencias", "competencias.competencia", "avaliacoes", "convites", "convites.projeto"]
  });
}

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation((mensagem: unknown) => {
    linhas.push(String(mensagem));
  });
  linhas = [];
  const banco = await prepararBancoDeTestes();
  ds = banco.ds;
  projetoAnimacaoId = banco.projetoSeedId;
  sistema = montarSistema();
  app = criarApp(new ServicoProjetos(ds, sistema));
});

beforeEach(() => {
  linhas = [];
});

afterAll(async () => {
  await app.close();
  await ds.destroy();
  jest.restoreAllMocks();
});

describe("criacao de projetos por tipo (Prototype + Abstract Factory)", () => {
  it.each([
    ["DOCUMENTARIO", documentario, ProjetoDocumentario, { tema: "Mares", entrevistados: ["Ana", "Beto"] }],
    ["PUBLICITARIO", publicitario, ProjetoPublicitario, { cliente: "Acme", canal: "TV" }],
    [
      "ANIMACAO",
      { ...base, tipoCaptacao: "ANIMACAO", softwareModelagem: "Maya", metricasRenderizacao: ["tempo por quadro"] },
      ProjetoAnimacao,
      { softwareModelagem: "Maya", metricasRenderizacao: ["tempo por quadro"] }
    ]
  ])("%s: grava a subclasse certa, com os campos do tipo", async (_tipo, payload, classe, esperado) => {
    const id = await criar(payload);

    const gravado = await ds.getRepository(Projeto).findOneByOrFail({ id });

    expect(gravado).toBeInstanceOf(classe);
    expect(gravado).toMatchObject(esperado);
  });

  it("cada tipo nasce com os papeis padrao da sua fabrica", async () => {
    const doc = await ds.getRepository(Projeto).findOneByOrFail({ id: await criar(documentario) });
    const pub = await ds.getRepository(Projeto).findOneByOrFail({ id: await criar(publicitario) });

    expect(papeis(doc.papeisObrigatorios)).toEqual(
      [Papel.DIRETOR, Papel.ROTEIRISTA, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR, Papel.SONOPLASTA].sort()
    );
    expect(papeis(pub.papeisObrigatorios)).toEqual([Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR].sort());
  });

  it("recusa com 422 o projeto que viola as regras do tipo e nao grava nada", async () => {
    const antes = await ds.getRepository(Projeto).count();

    const resposta = await app.inject({
      method: "POST",
      url: "/projetos",
      payload: { ...documentario, tema: "", entrevistados: [] }
    });

    expect(resposta.statusCode).toBe(422);
    expect(resposta.json().problemas).toHaveLength(2);
    expect(await ds.getRepository(Projeto).count()).toBe(antes);
  });
});

describe("recomendacao consistente com o tipo do projeto", () => {
  it("o mesmo orquestrador monta equipes diferentes, cada uma com os papeis do seu tipo", async () => {
    const doc = await recomendar(await criar(documentario));
    const pub = await recomendar(await criar(publicitario));
    const ani = await recomendar(projetoAnimacaoId);

    expect(papeis(doc.membros)).toEqual(
      [Papel.DIRETOR, Papel.ROTEIRISTA, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR, Papel.SONOPLASTA].sort()
    );
    expect(papeis(pub.membros)).toEqual([Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR].sort());
    expect(papeis(ani.membros)).toContain(Papel.ESPECIALISTA_EFEITOS_VISUAIS);
    expect(papeis(doc.membros)).not.toContain(Papel.ESPECIALISTA_EFEITOS_VISUAIS);
  });

  it("as notificacoes seguem o tipo: cada familia usa o proprio notificador", async () => {
    await recomendar(await criar(documentario));
    const doc = [...linhas];
    linhas.length = 0;
    await recomendar(projetoAnimacaoId);
    const ani = [...linhas];

    expect(doc.some((l) => l.startsWith("[DOCUMENTARIO]") && l.includes('tema "Mares"'))).toBe(true);
    expect(doc.some((l) => l.startsWith("[ANIMACAO]") || l.startsWith("[PUBLICITARIO]"))).toBe(false);
    expect(ani.some((l) => l.startsWith("[ANIMACAO]") && l.includes("tempo por quadro"))).toBe(true);
    expect(ani.some((l) => l.startsWith("[DOCUMENTARIO]"))).toBe(false);
    // observadores compartilhados continuam reagindo, para qualquer tipo
    for (const linhasDoTipo of [doc, ani]) {
      expect(linhasDoTipo.some((l) => l.startsWith("[EMAIL]"))).toBe(true);
      expect(linhasDoTipo.some((l) => l.startsWith("[AUDITORIA]"))).toBe(true);
    }
  });

  it("persiste a equipe e a nova recomendacao substitui a anterior", async () => {
    const id = await criar(documentario);
    const primeira = await recomendar(id);
    const segunda = await recomendar(id);

    const equipes = await ds.getRepository(Equipe).find({ where: { projeto: { id } }, relations: ["membros"] });
    const consulta = await app.inject({ method: "GET", url: `/projetos/${id}/equipe` });

    expect(equipes).toHaveLength(1);
    expect(equipes[0].id).toBe(segunda.equipeId);
    expect(equipes[0].id).not.toBe(primeira.equipeId);
    expect(equipes[0].membros).toHaveLength(segunda.membros.length);
    expect(consulta.json().membros).toEqual(segunda.membros);
    expect(await ds.getRepository(MembroEquipe).count({ where: { equipe: { id: primeira.equipeId } } })).toBe(0);
  });

  it("responde 404 para projeto inexistente e para equipe ainda nao montada", async () => {
    const inexistente = "11111111-1111-4111-8111-111111111111";
    const semEquipe = await criar(publicitario);

    const recomendarInexistente = await app.inject({ method: "POST", url: `/projetos/${inexistente}/recomendar`, payload: {} });
    const equipeVazia = await app.inject({ method: "GET", url: `/projetos/${semEquipe}/equipe` });

    expect(recomendarInexistente.statusCode).toBe(404);
    expect(equipeVazia.statusCode).toBe(404);
  });
});

describe("troca de strategy altera a recomendacao (Strategy)", () => {
  it("o mesmo projeto e os mesmos profissionais geram equipes diferentes conforme o algoritmo", async () => {
    const projeto = await ds.getRepository(Projeto).findOneByOrFail({ id: await criar(documentario) });
    const profissionais = await carregarProfissionais();
    const equipeCom = (pontuador: ConstructorParameters<typeof RecomendadorPorPontuacao>[0]) =>
      sistema
        .recomendar(projeto, profissionais, new RecomendadorPorPontuacao(pontuador))
        .membros.map((m) => `${m.papel}=${m.profissional.nome}`)
        .join(" | ");

    const cosseno = equipeCom(new SimilaridadeCosseno());
    const orcamento = equipeCom(new RegrasOrcamento());
    const filtragem = equipeCom(new FiltragemColaborativa());

    expect(new Set([cosseno, orcamento, filtragem]).size).toBe(3);
  });
});

describe("Visitor: operacoes distintas sobre a mesma estrutura, sem alterar as classes", () => {
  it("validar, calcular indicadores e gerar relatorio percorrem o mesmo projeto e os mesmos profissionais", async () => {
    const projeto = await ds.getRepository(Projeto).findOneByOrFail({ id: projetoAnimacaoId });
    const profissionais = await carregarProfissionais();
    const validador = new ValidadorConsistencia();
    const calculador = new CalculadorCompatibilidade();
    const relatorio = new GeradorRelatorio();

    for (const visitante of [validador, calculador, relatorio]) {
      projeto.aceitar(visitante);
      profissionais.forEach((p) => p.aceitar(visitante));
    }

    expect(projeto.aceitar(new ValidadorConsistencia())).toBe(true);
    expect(calculador.indicadoresProjetos.size).toBe(1);
    expect(calculador.indicadoresProfissionais.size).toBe(profissionais.length);
    expect(relatorio.gerarTexto()).toContain(`Projeto: ${projeto.genero}`);
  });
});
