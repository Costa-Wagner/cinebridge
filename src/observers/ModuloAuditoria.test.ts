import { ModuloAuditoria } from "./ModuloAuditoria";
import { EventoRecomendacao } from "./EventoRecomendacao";

describe("ModuloAuditoria", () => {
  it("registra projeto, papel e quantidade de recomendações", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ModuloAuditoria();
    const evento = {
      projeto: { id: "proj-1" },
      papel: "SONOPLASTA",
      recomendacoes: [{}, {}]
    } as unknown as EventoRecomendacao;

    servico.atualizar(evento);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("proj-1"));
    spy.mockRestore();
  });
});