import { ValidadorConsistencia } from "./ValidadorConsistencia";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Papel } from "../domain/enums/Papel";

function criarProjetoValido(): Projeto {
  return {
    id: "proj-1",
    orcamentoTotal: 50000,
    duracaoEstimadaMinutos: 90,
    papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }],
    dataEntrega: "2026-12-01"
  } as unknown as Projeto;
}

function criarProfissionalValido(): Profissional {
  return {
    id: "prof-1",
    precoBaseDiaria: 1000,
    email: "ana@example.com",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }]
  } as unknown as Profissional;
}

describe("ValidadorConsistencia", () => {
  it("não acumula problemas pra um projeto e profissional válidos", () => {
    const validador = new ValidadorConsistencia();

    validador.visitarProjeto(criarProjetoValido());
    validador.visitarProfissional(criarProfissionalValido());

    expect(validador.problemas).toHaveLength(0);
  });

  it("detecta orçamento total inválido", () => {
    const validador = new ValidadorConsistencia();
    const projeto = { ...criarProjetoValido(), orcamentoTotal: 0 } as unknown as Projeto;

    validador.visitarProjeto(projeto);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("orcamento total")])
    );
  });

  it("detecta duração estimada inválida", () => {
    const validador = new ValidadorConsistencia();
    const projeto = { ...criarProjetoValido(), duracaoEstimadaMinutos: -10 } as unknown as Projeto;

    validador.visitarProjeto(projeto);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("duracao estimada")])
    );
  });

  it("detecta ausência de papéis obrigatórios", () => {
    const validador = new ValidadorConsistencia();
    const projeto = { ...criarProjetoValido(), papeisObrigatorios: [] } as unknown as Projeto;

    validador.visitarProjeto(projeto);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("nenhum papel obrigatorio")])
    );
  });

  it("detecta peso de papel fora do intervalo 0-10", () => {
    const validador = new ValidadorConsistencia();
    const projeto = {
      ...criarProjetoValido(),
      papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 15 }]
    } as unknown as Projeto;

    validador.visitarProjeto(projeto);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("peso invalido")])
    );
  });

  it("detecta data de entrega inválida", () => {
    const validador = new ValidadorConsistencia();
    const projeto = { ...criarProjetoValido(), dataEntrega: "data-quebrada" } as unknown as Projeto;

    validador.visitarProjeto(projeto);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("data de entrega")])
    );
  });

  it("detecta preço base diária inválido", () => {
    const validador = new ValidadorConsistencia();
    const profissional = { ...criarProfissionalValido(), precoBaseDiaria: -50 } as unknown as Profissional;

    validador.visitarProfissional(profissional);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("preco base diaria")])
    );
  });

  it("detecta email inválido", () => {
    const validador = new ValidadorConsistencia();
    const profissional = { ...criarProfissionalValido(), email: "sem-arroba.com" } as unknown as Profissional;

    validador.visitarProfissional(profissional);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("email invalido")])
    );
  });

  it("detecta ausência de disponibilidade", () => {
    const validador = new ValidadorConsistencia();
    const profissional = { ...criarProfissionalValido(), disponibilidade: [] } as unknown as Profissional;

    validador.visitarProfissional(profissional);

    expect(validador.problemas).toEqual(
      expect.arrayContaining([expect.stringContaining("nenhuma janela")])
    );
  });

  it("acumula problemas de múltiplas visitas sem resetar entre elas", () => {
    const validador = new ValidadorConsistencia();
    const projetoInvalido = { ...criarProjetoValido(), orcamentoTotal: 0 } as unknown as Projeto;
    const profissionalInvalido = { ...criarProfissionalValido(), email: "invalido" } as unknown as Profissional;

    validador.visitarProjeto(projetoInvalido);
    validador.visitarProfissional(profissionalInvalido);

    expect(validador.problemas).toHaveLength(2);
  });
});