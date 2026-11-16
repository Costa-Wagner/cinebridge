import { IntegradorMicrosservicos } from "./IntegradorMicrosservicos";
import { TipoEvento } from "./TipoEvento";
import { BarramentoEventos } from "../eventos/BarramentoEventos";

const evento = {
  tipo: TipoEvento.EQUIPE_FORMADA,
  papel: null,
  candidatos: [],
  projeto: { id: "p1", tipoCaptacao: "DOCUMENTARIO", orcamentoTotal: "1000", equipe: { membros: [] } }
} as never;

describe("IntegradorMicrosservicos com barramento assincrono", () => {
  it("falha ao publicar e' registrada e nao interrompe o fluxo", async () => {
    const erro = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const barramento: BarramentoEventos = {
      publicar: jest.fn().mockRejectedValue(new Error("broker fora")),
      assinar: jest.fn()
    };

    expect(() => new IntegradorMicrosservicos(barramento).atualizar(evento)).not.toThrow();
    await new Promise((r) => setImmediate(r));

    expect(erro).toHaveBeenCalledWith(expect.stringContaining("equipe.formada"), expect.any(Error));
    erro.mockRestore();
  });
});
