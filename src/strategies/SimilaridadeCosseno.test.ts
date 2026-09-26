import { SimilaridadeCosseno } from "./SimilaridadeCosseno";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";

function criarProfissional(nome: string, competencias: Record<string, number>): Profissional {
  return {
    nome,
    competencias: Object.entries(competencias).map(([nomeCompetencia, nivel]) => ({
      nivel,
      competencia: { nome: nomeCompetencia }
    }))
  } as unknown as Profissional;
}

describe("SimilaridadeCosseno", () => {
  const strategy = new SimilaridadeCosseno();
  const projetoFake = {} as Projeto;

  it("dá pontuação máxima (10) pra vetor idêntico ao perfil ideal do DIRETOR", () => {
    const candidato = criarProfissional("Perfeito", {
      Liderança: 9,
      Roteiro: 6,
      Direção: 10,
      Edição: 4
    });

    const [resultado] = strategy.recomendar({
      projeto: projetoFake,
      papel: Papel.DIRETOR,
      candidatos: [candidato]
    });

    expect(resultado.pontuacao).toBe(10);
  });

  it("ranqueia candidato mais alinhado ao perfil de DIRETOR acima do menos alinhado", () => {
    const bomFit = criarProfissional("Bom Fit", { Direção: 9, Liderança: 8 });
    const fracoFit = criarProfissional("Fraco Fit", { Fotografia: 9, Câmera: 8 });

    const resultados = strategy.recomendar({
      projeto: projetoFake,
      papel: Papel.DIRETOR,
      candidatos: [fracoFit, bomFit]
    });

    expect(resultados[0].profissional.nome).toBe("Bom Fit");
    expect(resultados[0].pontuacao).toBeGreaterThan(resultados[1].pontuacao);
  });

  it("retorna 0 pra candidato sem nenhuma competência em comum com o perfil", () => {
    const semRelacao = criarProfissional("Sem Relação", { Culinária: 10 });

    const [resultado] = strategy.recomendar({
      projeto: projetoFake,
      papel: Papel.DIRETOR,
      candidatos: [semRelacao]
    });

    expect(resultado.pontuacao).toBe(0);
  });

  it("retorna 0 pra candidato sem nenhuma competência cadastrada", () => {
    const vazio = criarProfissional("Vazio", {});

    const [resultado] = strategy.recomendar({
      projeto: projetoFake,
      papel: Papel.DIRETOR,
      candidatos: [vazio]
    });

    expect(resultado.pontuacao).toBe(0);
  });

  it("ordena a lista de forma decrescente por pontuação", () => {
    const baixo = criarProfissional("Baixo", { Direção: 2 });
    const alto = criarProfissional("Alto", { Direção: 9, Liderança: 8 });
    const medio = criarProfissional("Médio", { Direção: 5, Liderança: 3 });

    const resultados = strategy.recomendar({
      projeto: projetoFake,
      papel: Papel.DIRETOR,
      candidatos: [baixo, alto, medio]
    });

    const pontuacoes = resultados.map((r) => r.pontuacao);
    expect(pontuacoes).toEqual([...pontuacoes].sort((a, b) => b - a));
  });

  it("aplica corretamente o perfil de outro papel (EDITOR)", () => {
    const candidato = criarProfissional("Editor Perfeito", {
      Edição: 10,
      "Color Grading": 6,
      Roteiro: 3
    });

    const [resultado] = strategy.recomendar({
      projeto: projetoFake,
      papel: Papel.EDITOR,
      candidatos: [candidato]
    });

    expect(resultado.pontuacao).toBe(10);
  });
});