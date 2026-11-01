import { ModuloAuditoria, RegistroAuditoria } from "./ModuloAuditoria";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";

const evento = (extras: Partial<EventoRecomendacao> = {}) =>
  ({
    tipo: TipoEvento.RECOMENDACAO_GERADA,
    projeto: { id: "proj-1", tipoCaptacao: "DOCUMENTARIO" },
    papel: "SONOPLASTA",
    candidatos: [{ id: "a" }, { id: "b" }],
    ...extras
  }) as unknown as EventoRecomendacao;

describe("ModuloAuditoria", () => {
  const agora = () => new Date("2026-10-18T12:00:00.000Z");

  it("escreve um registro JSON por evento, com projeto, papel e profissionais envolvidos", () => {
    const saida = jest.fn();

    new ModuloAuditoria(saida, agora).atualizar(evento());

    expect(saida).toHaveBeenCalledTimes(1);
    const registro: RegistroAuditoria = JSON.parse(saida.mock.calls[0][0]);
    expect(registro).toEqual({
      origem: "AUDITORIA",
      em: "2026-10-18T12:00:00.000Z",
      evento: "RECOMENDACAO_GERADA",
      projetoId: "proj-1",
      tipoProjeto: "DOCUMENTARIO",
      papel: "SONOPLASTA",
      profissionais: ["a", "b"],
      quantidade: 2
    });
  });

  it("eventos da equipe inteira registram papel nulo", () => {
    const saida = jest.fn();

    new ModuloAuditoria(saida, agora).atualizar(evento({ tipo: TipoEvento.EQUIPE_FORMADA, papel: null } as never));

    expect(JSON.parse(saida.mock.calls[0][0])).toMatchObject({ evento: "EQUIPE_FORMADA", papel: null });
  });

  it("usa o console e o relogio do sistema por padrao", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    new ModuloAuditoria().atualizar(evento());

    const registro = JSON.parse(String(spy.mock.calls[0][0]));
    expect(registro.origem).toBe("AUDITORIA");
    expect(Number.isNaN(Date.parse(registro.em))).toBe(false);
    spy.mockRestore();
  });
});
