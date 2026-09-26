import { CalculadorCompatibilidade } from "./CalculadorCompatibilidade";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Papel } from "../domain/enums/Papel";

function criarProjeto(papeisObrigatorios: { papel: Papel; peso: number }[]): Projeto {
  return { id: "proj-1", papeisObrigatorios } as unknown as Projeto;
}

function criarProfissional(
  id: string,
  competencias: number[],
  quantidadeAvaliacoes = 0
): Profissional {
  return {
    id,
    competencias: competencias.map((nivel) => ({ nivel })),
    avaliacoes: Array.from({ length: quantidadeAvaliacoes }, () => ({}))
  } as unknown as Profissional;
}

describe("CalculadorCompatibilidade", () => {
  it("calcula a criticidade média corretamente a partir dos pesos dos papéis", () => {
    const calculador = new CalculadorCompatibilidade();
    const projeto = criarProjeto([
      { papel: Papel.DIRETOR, peso: 10 },
      { papel: Papel.EDITOR, peso: 6 }
    ]);

    calculador.visitarProjeto(projeto);

    expect(calculador.indicadoresProjetos.get("proj-1")).toEqual({
      criticidadeMedia: 8,
      quantidadePapeis: 2
    });
  });

  it("retorna criticidade 0 pra projeto sem papéis obrigatórios", () => {
    const calculador = new CalculadorCompatibilidade();

    calculador.visitarProjeto(criarProjeto([]));

    expect(calculador.indicadoresProjetos.get("proj-1")).toEqual({
      criticidadeMedia: 0,
      quantidadePapeis: 0
    });
  });

  it("calcula nível médio de competências do profissional", () => {
    const calculador = new CalculadorCompatibilidade();
    const profissional = criarProfissional("prof-1", [8, 6, 4]);

    calculador.visitarProfissional(profissional);

    const indicadores = calculador.indicadoresProfissionais.get("prof-1");
    expect(indicadores?.nivelMedioCompetencias).toBe(6);
    expect(indicadores?.quantidadeCompetencias).toBe(3);
  });

  it("retorna 0 pra profissional sem competências cadastradas", () => {
    const calculador = new CalculadorCompatibilidade();

    calculador.visitarProfissional(criarProfissional("prof-1", []));

    const indicadores = calculador.indicadoresProfissionais.get("prof-1");
    expect(indicadores?.nivelMedioCompetencias).toBe(0);
    expect(indicadores?.prontidao).toBe(0);
  });

  it("aumenta a prontidão conforme o histórico de avaliações cresce (até o teto de 5)", () => {
    const calculador = new CalculadorCompatibilidade();
    const semHistorico = criarProfissional("sem-historico", [10], 0);
    const comHistoricoParcial = criarProfissional("com-historico-parcial", [10], 3);
    const comHistoricoCompleto = criarProfissional("com-historico-completo", [10], 5);

    calculador.visitarProfissional(semHistorico);
    calculador.visitarProfissional(comHistoricoParcial);
    calculador.visitarProfissional(comHistoricoCompleto);

    const prontidaoSem = calculador.indicadoresProfissionais.get("sem-historico")!.prontidao;
    const prontidaoParcial = calculador.indicadoresProfissionais.get("com-historico-parcial")!.prontidao;
    const prontidaoCompleta = calculador.indicadoresProfissionais.get("com-historico-completo")!.prontidao;

    expect(prontidaoSem).toBe(6); // 10 * 0.6
    expect(prontidaoParcial).toBeGreaterThan(prontidaoSem);
    expect(prontidaoParcial).toBeLessThan(prontidaoCompleta);
    expect(prontidaoCompleta).toBe(10); // 10 * (0.6 + 0.4) = teto atingido em 5 avaliações
  });

  it("mantém o teto de prontidão mesmo com mais de 5 avaliações", () => {
    const calculador = new CalculadorCompatibilidade();
    const profissional = criarProfissional("prof-1", [10], 20);

    calculador.visitarProfissional(profissional);

    expect(calculador.indicadoresProfissionais.get("prof-1")!.prontidao).toBe(10);
  });

  it("indexa indicadores de múltiplos projetos e profissionais independentemente", () => {
    const calculador = new CalculadorCompatibilidade();

    calculador.visitarProjeto(criarProjeto([{ papel: Papel.DIRETOR, peso: 5 }]));
    calculador.visitarProfissional(criarProfissional("prof-1", [8]));
    calculador.visitarProfissional(criarProfissional("prof-2", [4]));

    expect(calculador.indicadoresProjetos.size).toBe(1);
    expect(calculador.indicadoresProfissionais.size).toBe(2);
  });
});