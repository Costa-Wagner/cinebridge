import { paraDto, deDto } from "./ProfissionalDto";
import { criarProfissionalExterno } from "./profissionalExterno";
import { Avaliacao } from "../../domain/entities/Avaliacao";

function profissional() {
  const p = criarProfissionalExterno({
    id: "p1",
    nome: "Ana",
    email: "ana@x.com",
    especialidades: ["Direção"],
    precoBaseDiaria: 1500,
    localizacao: "São Paulo"
  });
  p.disponibilidade = [{ inicio: "2026-01-01", fim: "2026-12-31" }];
  p.avaliacoes = [Object.assign(new Avaliacao(), { id: "a1", nota: 8, comentario: "ótima", criadoEm: new Date("2026-03-01T10:00:00Z") })];
  return p;
}

describe("ProfissionalDto", () => {
  it("ida e volta preserva os campos usados no ranking", () => {
    const original = profissional();
    const copia = deDto(JSON.parse(JSON.stringify(paraDto(original))));

    expect(copia).toMatchObject({ id: "p1", nome: "Ana", email: "ana@x.com", especialidades: ["Direção"], precoBaseDiaria: 1500, localizacao: "São Paulo" });
    expect(copia.disponibilidade).toEqual(original.disponibilidade);
    expect(copia.competencias.map((c) => [c.competencia.nome, c.nivel])).toEqual([["Direção", 7]]);
    expect(copia.competencias[0].profissional).toBe(copia);
    expect(copia.avaliacoes).toHaveLength(1);
    expect(copia.avaliacoes[0]).toMatchObject({ nota: 8, comentario: "ótima" });
    expect(copia.avaliacoes[0].criadoEm).toEqual(new Date("2026-03-01T10:00:00Z"));
    expect(copia.avaliacoes[0].profissional).toBe(copia);
  });

  it("o DTO e' serializavel (sem referencias circulares) e nao leva convites nem recomendacoes", () => {
    const dto = paraDto(profissional());
    expect(() => JSON.stringify(dto)).not.toThrow();
    expect(Object.keys(dto)).not.toContain("convites");
    expect(deDto(dto).convites).toEqual([]);
    expect(deDto(dto).recomendacoes).toEqual([]);
  });

  it("converte valores numericos que o banco devolve como texto", () => {
    const p = profissional();
    (p as unknown as { precoBaseDiaria: string }).precoBaseDiaria = "900.50";
    (p.competencias[0] as unknown as { nivel: string }).nivel = "8.5";
    (p.avaliacoes[0] as unknown as { nota: string }).nota = "9.25";
    const dto = paraDto(p);
    expect(dto.precoBaseDiaria).toBe(900.5);
    expect(dto.competencias[0].nivel).toBe(8.5);
    expect(dto.avaliacoes[0].nota).toBe(9.25);
  });

  it("tolera relacoes ausentes e avaliacao sem data", () => {
    const p = profissional();
    (p as unknown as { competencias?: unknown }).competencias = undefined;
    (p as unknown as { avaliacoes?: unknown }).avaliacoes = undefined;
    const dto = paraDto(p);
    expect(dto.competencias).toEqual([]);
    expect(dto.avaliacoes).toEqual([]);

    dto.avaliacoes = [{ nota: 7 }];
    const antes = Date.now();
    expect(deDto(dto).avaliacoes[0].criadoEm.getTime()).toBeGreaterThanOrEqual(antes);
    const semData = profissional();
    semData.avaliacoes[0].criadoEm = undefined as never;
    expect(paraDto(semData).avaliacoes[0].criadoEm).toBeUndefined();
  });
});
