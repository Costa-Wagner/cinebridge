import { PontuacaoHibrida } from "./PontuacaoHibrida";
import { PontuacaoStrategy } from "./PontuacaoStrategy";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";

const ana = { id: "1", nome: "Ana" } as Profissional;
const bruno = { id: "2", nome: "Bruno" } as Profissional;

function fake(nome: string, notas: [Profissional, number][]): PontuacaoStrategy {
  return {
    nome,
    recomendar: () => notas.map(([profissional, pontuacao]) => ({ profissional, pontuacao }))
  };
}

const params = { projeto: {} as Projeto, papel: Papel.DIRETOR, candidatos: [ana, bruno] };

describe("PontuacaoHibrida", () => {
  it("faz a media ponderada das strategies e ordena do maior para o menor", () => {
    const hibrida = new PontuacaoHibrida([
      { estrategia: fake("A", [[ana, 10], [bruno, 2]]), peso: 0.5 },
      { estrategia: fake("B", [[ana, 4], [bruno, 10]]), peso: 0.5 }
    ]);

    const resultado = hibrida.recomendar(params);

    expect(resultado.map((r) => [r.profissional.nome, r.pontuacao])).toEqual([
      ["Ana", 7],
      ["Bruno", 6]
    ]);
  });

  it("respeita pesos diferentes", () => {
    const hibrida = new PontuacaoHibrida([
      { estrategia: fake("A", [[ana, 10], [bruno, 0]]), peso: 0.8 },
      { estrategia: fake("B", [[ana, 0], [bruno, 10]]), peso: 0.2 }
    ]);

    expect(hibrida.recomendar(params).map((r) => r.profissional.nome)).toEqual(["Ana", "Bruno"]);
  });

  it("compoe o nome a partir dos componentes", () => {
    const hibrida = new PontuacaoHibrida([
      { estrategia: fake("A", []), peso: 0.6 },
      { estrategia: fake("B", []), peso: 0.4 }
    ]);

    expect(hibrida.nome).toBe("Ax0.6+Bx0.4");
    expect(hibrida.recomendar(params)).toEqual([]);
  });
});
