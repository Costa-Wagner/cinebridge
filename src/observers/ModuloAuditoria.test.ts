import { ModuloAuditoria } from "./ModuloAuditoria";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";

describe("ModuloAuditoria", () => {
  it("registra projeto, papel e quantidade de candidatos", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ModuloAuditoria();
    const evento = {
      tipo: TipoEvento.RECOMENDACAO_GERADA,
      projeto: { id: "proj-1" },
      papel: "SONOPLASTA",
      candidatos: [{}, {}]
    } as unknown as EventoRecomendacao;

    servico.atualizar(evento);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("proj-1"));
    spy.mockRestore();
  });
});