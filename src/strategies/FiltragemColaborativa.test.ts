import { FiltragemColaborativa } from "./FiltragemColaborativa";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";

function criarProjeto(genero = "Ficção Científica"): Projeto {
  return { genero } as unknown as Projeto;
}

function criarProfissional(overrides: {
  avaliacoes?: number[];
  convitesAceitosMesmoGenero?: number;
} = {}): Profissional {
  const avaliacoes = (overrides.avaliacoes ?? []).map((nota) => ({ nota }));
  const convites = Array.from({ length: overrides.convitesAceitosMesmoGenero ?? 0 }, () => ({
    status: StatusConvite.ACEITO,
    projeto: { genero: "Ficção Científica" }
  }));
  return { avaliacoes, convites } as unknown as Profissional;
}

describe("FiltragemColaborativa", () => {
  const strategy = new FiltragemColaborativa();

  it("dá pontuação neutra atenuada (3.5) pra profissional sem nenhuma avaliação", () => {
    const [resultado] = strategy.recomendar({
      projeto: criarProjeto(),
      papel: "DIRETOR" as any,
      candidatos: [criarProfissional()]
    });

    expect(resultado.pontuacao).toBe(3.5);
  });

  it("usa a média das avaliações, atenuada pela confiabilidade quando há poucas notas", () => {
    const [resultado] = strategy.recomendar({
      projeto: criarProjeto(),
      papel: "DIRETOR" as any,
      candidatos: [criarProfissional({ avaliacoes: [10] })]
    });

    // media 10, confiabilidade = 1/5 => base = 10 * (0.7 + 0.3*0.2) = 7.6
    expect(resultado.pontuacao).toBe(7.6);
  });

  it("aproxima-se da média plena quando há 5+ avaliações (confiabilidade saturada)", () => {
    const [resultado] = strategy.recomendar({
      projeto: criarProjeto(),
      papel: "DIRETOR" as any,
      candidatos: [criarProfissional({ avaliacoes: [8, 8, 8, 8, 8] })]
    });

    expect(resultado.pontuacao).toBe(8);
  });

  it("aplica bônus de afinidade por convites aceitos no mesmo gênero, sem passar de 10", () => {
    const semAfinidade = criarProfissional({ avaliacoes: [9, 9, 9, 9, 9] });
    const comAfinidade = criarProfissional({
      avaliacoes: [9, 9, 9, 9, 9],
      convitesAceitosMesmoGenero: 3
    });

    const [semBonus] = strategy.recomendar({
      projeto: criarProjeto(),
      papel: "DIRETOR" as any,
      candidatos: [semAfinidade]
    });
    const [comBonus] = strategy.recomendar({
      projeto: criarProjeto(),
      papel: "DIRETOR" as any,
      candidatos: [comAfinidade]
    });

    expect(comBonus.pontuacao).toBeGreaterThan(semBonus.pontuacao);
    expect(comBonus.pontuacao).toBeLessThanOrEqual(10);
  });

  it("ordena candidatos de forma decrescente por pontuação", () => {
    const baixo = criarProfissional({ avaliacoes: [3, 3] });
    const alto = criarProfissional({ avaliacoes: [9, 9, 9, 9, 9] });

    const resultados = strategy.recomendar({
      projeto: criarProjeto(),
      papel: "DIRETOR" as any,
      candidatos: [baixo, alto]
    });

    expect(resultados[0].pontuacao).toBeGreaterThan(resultados[1].pontuacao);
  });
});