import { resumirProjeto } from "./eventosProjeto";
import { FabricaDocumentario } from "../fabricas/documentario/FabricaDocumentario";
import { Papel } from "../domain/enums/Papel";
import { Projeto } from "../domain/entities/Projeto";

describe("resumirProjeto", () => {
  it("resume o projeto com valores numericos, custo e prazo da arvore de servicos", () => {
    const projeto = new FabricaDocumentario().criarProjeto({
      duracaoEstimadaMinutos: 60,
      orcamentoTotal: 1000,
      dataEntrega: "2026-12-01",
      tema: "Rios",
      entrevistados: ["Ana"],
      papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }]
    });
    projeto.id = "p1";
    (projeto as unknown as { orcamentoTotal: string }).orcamentoTotal = "1000.00"; // o banco devolve decimal como texto

    expect(resumirProjeto(projeto)).toEqual({
      projetoId: "p1",
      tipoCaptacao: "DOCUMENTARIO",
      genero: projeto.genero,
      orcamentoTotal: 1000,
      dataEntrega: "2026-12-01",
      custoTotal: projeto.calcularCustoTotal(),
      prazoTotal: projeto.obterPrazoTotal()
    });
  });

  it("projeto sem arvore de servicos tem custo e prazo zero", () => {
    const projeto = Object.assign(new Projeto(), { id: "p2", genero: "X", orcamentoTotal: 5, dataEntrega: "2026-01-01", tipoCaptacao: "ANIMACAO" });
    (projeto as unknown as { servicoPrincipal?: unknown }).servicoPrincipal = undefined;
    expect(resumirProjeto(projeto)).toMatchObject({ custoTotal: 0, prazoTotal: 0 });
  });
});
