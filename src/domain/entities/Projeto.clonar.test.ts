import { Projeto } from "./Projeto";
import { ProjetoDocumentario } from "./ProjetoDocumentario";
import { ProjetoAnimacao } from "./ProjetoAnimacao";
import { ProjetoPublicitario } from "./ProjetoPublicitario";
import { Papel } from "../enums/Papel";
import { TipoCaptacao } from "../enums/TipoCaptacao";

function preencherBase(p: Projeto): Projeto {
  p.id = "id-original";
  p.genero = "Drama";
  p.duracaoEstimadaMinutos = 90;
  p.orcamentoTotal = 50000;
  p.dataEntrega = "2026-12-01";
  p.localizacaoFilmagem = "Rio de Janeiro";
  p.papeisObrigatorios = [{ papel: Papel.DIRETOR, peso: 10 }];
  p.convites = [];
  p.recomendacoes = [];
  return p;
}

describe("Prototype: Projeto.clonar()", () => {
  it("ProjetoDocumentario: copia campos proprios e do pai, sem id nem relacoes", () => {
    const original = preencherBase(new ProjetoDocumentario()) as ProjetoDocumentario;
    original.tema = "Meio ambiente";
    original.entrevistados = ["Ana", "Bruno"];

    const copia = original.clonar();

    expect(copia).toBeInstanceOf(ProjetoDocumentario);
    expect(copia).not.toBe(original);
    expect(copia.tipoCaptacao).toBe(TipoCaptacao.DOCUMENTARIO);
    expect(copia.tema).toBe("Meio ambiente");
    expect(copia.entrevistados).toEqual(["Ana", "Bruno"]);
    expect(copia.genero).toBe("Drama");
    expect(copia.id).toBeUndefined();
    expect(copia.convites).toBeUndefined();
    expect(copia.recomendacoes).toBeUndefined();
  });

  it("e' copia profunda: alterar o clone nao altera o original", () => {
    const original = preencherBase(new ProjetoDocumentario()) as ProjetoDocumentario;
    original.entrevistados = ["Ana"];

    const copia = original.clonar();
    copia.entrevistados.push("Carla");
    copia.papeisObrigatorios[0].peso = 1;
    copia.genero = "Comedia";

    expect(original.entrevistados).toEqual(["Ana"]);
    expect(original.papeisObrigatorios[0].peso).toBe(10);
    expect(original.genero).toBe("Drama");
  });

  it("ProjetoDocumentario sem entrevistados clona com lista vazia", () => {
    const original = preencherBase(new ProjetoDocumentario()) as ProjetoDocumentario;

    expect(original.clonar().entrevistados).toEqual([]);
  });

  it("ProjetoAnimacao: copia software e metricas (com lista independente)", () => {
    const original = preencherBase(new ProjetoAnimacao()) as ProjetoAnimacao;
    original.softwareModelagem = "Blender";
    original.metricasRenderizacao = ["tempo por quadro"];

    const copia = original.clonar();
    copia.metricasRenderizacao.push("custo");

    expect(copia).toBeInstanceOf(ProjetoAnimacao);
    expect(copia.tipoCaptacao).toBe(TipoCaptacao.ANIMACAO);
    expect(copia.softwareModelagem).toBe("Blender");
    expect(original.metricasRenderizacao).toEqual(["tempo por quadro"]);
  });

  it("ProjetoAnimacao sem metricas clona com lista vazia", () => {
    const original = preencherBase(new ProjetoAnimacao()) as ProjetoAnimacao;

    expect(original.clonar().metricasRenderizacao).toEqual([]);
  });

  it("ProjetoPublicitario: copia cliente e canal", () => {
    const original = preencherBase(new ProjetoPublicitario()) as ProjetoPublicitario;
    original.cliente = "Acme";
    original.canal = "TV";

    const copia = original.clonar();

    expect(copia).toBeInstanceOf(ProjetoPublicitario);
    expect(copia.tipoCaptacao).toBe(TipoCaptacao.PUBLICITARIO);
    expect(copia.cliente).toBe("Acme");
    expect(copia.canal).toBe("TV");
  });
});
