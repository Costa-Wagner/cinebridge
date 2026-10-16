import { ServicoEmail } from "./ServicoEmail";
import { EventoRecomendacao } from "./EventoRecomendacao";

function criarEvento(): EventoRecomendacao {
  return {
    projeto: { genero: "Ficção Científica" },
    papel: "DIRETOR",
    recomendacoes: [{ profissional: { nome: "Ana" }, pontuacao: 9.5 }]
  } as unknown as EventoRecomendacao;
}

describe("ServicoEmail", () => {
  it("registra o melhor candidato ao ser notificado", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ServicoEmail();

    servico.atualizar(criarEvento());

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Ana"));
    spy.mockRestore();
  });

  it("não quebra quando não há nenhuma recomendação", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ServicoEmail();
    const evento = { ...criarEvento(), recomendacoes: [] } as unknown as EventoRecomendacao;

    expect(() => servico.atualizar(evento)).not.toThrow();
    spy.mockRestore();
  });
});