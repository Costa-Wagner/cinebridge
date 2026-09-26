import { GeradorRelatorio } from "./GeradorRelatorio";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";

function criarProjeto(overrides: Partial<Projeto> = {}): Projeto {
  return {
    genero: "Ficção Científica",
    tipoCaptacao: "FICCAO",
    orcamentoTotal: 50000,
    dataEntrega: "2026-12-01",
    papeisObrigatorios: [{ papel: "DIRETOR", peso: 10 }],
    ...overrides
  } as unknown as Projeto;
}

function criarProfissional(overrides: Partial<Profissional> = {}): Profissional {
  return {
    nome: "Ana Beatriz Duarte",
    especialidades: ["Direção", "Liderança de equipe"],
    precoBaseDiaria: 1500,
    ...overrides
  } as unknown as Profissional;
}

describe("GeradorRelatorio", () => {
  it("inclui gênero e tipo de captação do projeto no texto gerado", () => {
    const gerador = new GeradorRelatorio();

    gerador.visitarProjeto(criarProjeto());

    expect(gerador.gerarTexto()).toContain("Ficção Científica");
    expect(gerador.gerarTexto()).toContain("FICCAO");
  });

  it("formata o orçamento como moeda em pt-BR", () => {
    const gerador = new GeradorRelatorio();

    gerador.visitarProjeto(criarProjeto({ orcamentoTotal: 50000 } as any));

    expect(gerador.gerarTexto()).toContain("50.000");
  });

  it("inclui a quantidade de papéis obrigatórios", () => {
    const gerador = new GeradorRelatorio();
    const projeto = criarProjeto({
      papeisObrigatorios: [
        { papel: "DIRETOR", peso: 10 },
        { papel: "EDITOR", peso: 7 }
      ]
    } as any);

    gerador.visitarProjeto(projeto);

    expect(gerador.gerarTexto()).toContain("Papeis obrigatorios: 2");
  });

  it("inclui nome, especialidades e preço do profissional", () => {
    const gerador = new GeradorRelatorio();

    gerador.visitarProfissional(criarProfissional());

    const texto = gerador.gerarTexto();
    expect(texto).toContain("Ana Beatriz Duarte");
    expect(texto).toContain("Direção, Liderança de equipe");
    expect(texto).toContain("1.500");
  });

  it("acumula projeto e múltiplos profissionais na mesma ordem de visita", () => {
    const gerador = new GeradorRelatorio();

    gerador.visitarProjeto(criarProjeto());
    gerador.visitarProfissional(criarProfissional({ nome: "Bruno Salgado" } as any));
    gerador.visitarProfissional(criarProfissional({ nome: "Carla Nascimento" } as any));

    const linhas = gerador.gerarTexto().split("\n");
    const indiceBruno = linhas.findIndex((l) => l.includes("Bruno Salgado"));
    const indiceCarla = linhas.findIndex((l) => l.includes("Carla Nascimento"));

    expect(indiceBruno).toBeGreaterThan(-1);
    expect(indiceCarla).toBeGreaterThan(indiceBruno);
  });

  it("retorna string vazia quando nada foi visitado", () => {
    const gerador = new GeradorRelatorio();

    expect(gerador.gerarTexto()).toBe("");
  });
});