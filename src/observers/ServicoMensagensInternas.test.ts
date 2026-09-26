import { ServicoMensagensInternas } from "./ServicoMensagensInternas";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";
import { Publicador } from "./Publicador";

describe("ServicoMensagensInternas", () => {
  it("registra a quantidade de profissionais ranqueados", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ServicoMensagensInternas();
    const evento = {
      papel: "EDITOR",
      recomendacoes: [{}, {}, {}]
    } as unknown as EventoRecomendacaoGerada;

    servico.atualizar({} as Publicador, evento);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("3"));
    spy.mockRestore();
  });
});