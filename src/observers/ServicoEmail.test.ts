import { ServicoEmail } from "./ServicoEmail";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";
import { Publicador } from "./Publicador";

function criarEvento(): EventoRecomendacaoGerada {
  return {
    projeto: { genero: "Ficção Científica" },
    papel: "DIRETOR",
    recomendacoes: [{ profissional: { nome: "Ana" }, pontuacao: 9.5 }]
  } as unknown as EventoRecomendacaoGerada;
}

describe("ServicoEmail", () => {
  it("registra o melhor candidato ao ser notificado", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ServicoEmail();

    servico.atualizar({} as Publicador, criarEvento());

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Ana"));
    spy.mockRestore();
  });

  it("não quebra quando não há nenhuma recomendação", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const servico = new ServicoEmail();
    const evento = { ...criarEvento(), recomendacoes: [] } as unknown as EventoRecomendacaoGerada;

    expect(() => servico.atualizar({} as Publicador, evento)).not.toThrow();
    spy.mockRestore();
  });
});