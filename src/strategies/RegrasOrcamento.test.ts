import { RegrasOrcamento } from "./RegrasOrcamento";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";

function criarProjeto(orcamentoTotal: number, dataEntrega = "2026-06-15"): Projeto {
  return { orcamentoTotal, dataEntrega } as unknown as Projeto;
}

function criarProfissional(
  precoBaseDiaria: number,
  disponibilidade: { inicio: string; fim: string }[]
): Profissional {
  return { precoBaseDiaria, disponibilidade } as unknown as Profissional;
}

describe("RegrasOrcamento", () => {
  const strategy = new RegrasOrcamento();

  it("dá pontuação 0 pra profissional indisponível na data de entrega", () => {
    const projeto = criarProjeto(100000, "2026-06-15");
    const indisponivel = criarProfissional(1000, [
      { inicio: "2026-01-01", fim: "2026-03-01" }
    ]);

    const [resultado] = strategy.recomendar({
      projeto,
      papel: "DIRETOR" as any,
      candidatos: [indisponivel]
    });

    expect(resultado.pontuacao).toBe(0);
  });

  it("dá pontuação alta pra diária dentro do limite saudável (5% do orçamento)", () => {
    const projeto = criarProjeto(100000); // limite = 5000
    const dentroDoLimite = criarProfissional(1000, [
      { inicio: "2026-01-01", fim: "2026-12-31" }
    ]);

    const [resultado] = strategy.recomendar({
      projeto,
      papel: "DIRETOR" as any,
      candidatos: [dentroDoLimite]
    });

    // proporcao = 1000/5000 = 0.2 => pontuacao = 10 - 0.2*2 = 9.6
    expect(resultado.pontuacao).toBe(9.6);
  });

  it("penaliza diária que excede o limite saudável, sem ficar negativa", () => {
    const projeto = criarProjeto(10000); // limite = 500
    const caro = criarProfissional(5000, [{ inicio: "2026-01-01", fim: "2026-12-31" }]);

    const [resultado] = strategy.recomendar({
      projeto,
      papel: "DIRETOR" as any,
      candidatos: [caro]
    });

    expect(resultado.pontuacao).toBeGreaterThanOrEqual(0);
    expect(resultado.pontuacao).toBeLessThan(9.6);
  });

  it("ranqueia disponível e dentro do orçamento acima de indisponível", () => {
    const projeto = criarProjeto(100000, "2026-06-15");
    const bom = criarProfissional(1000, [{ inicio: "2026-01-01", fim: "2026-12-31" }]);
    const indisponivel = criarProfissional(500, [{ inicio: "2027-01-01", fim: "2027-12-31" }]);

    const resultados = strategy.recomendar({
      projeto,
      papel: "DIRETOR" as any,
      candidatos: [indisponivel, bom]
    });

    expect(resultados[0].pontuacao).toBeGreaterThan(resultados[1].pontuacao);
  });
});