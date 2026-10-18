import { ServicoMensagensInternas } from "./ServicoMensagensInternas";
import { EventoRecomendacao } from "./EventoRecomendacao";

describe("ServicoMensagensInternas", () => {
  it("registra a quantidade de profissionais ranqueados", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ServicoMensagensInternas();
    const evento = {
      papel: "EDITOR",
      candidatos: [{}, {}, {}]
    } as unknown as EventoRecomendacao;

    servico.atualizar(evento);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("3"));
    spy.mockRestore();
  });
});