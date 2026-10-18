import { SistemaRecomendacao } from "./SistemaRecomendacao";
import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

function criarObservadorMock(): Observador {
  return { atualizar: jest.fn() };
}

function criarEventoFake(): EventoRecomendacao {
  return {} as EventoRecomendacao;
}

describe("SistemaRecomendacao", () => {
  it("notifica todos os observadores cadastrados ao disparar um evento", () => {
    const publicador = new SistemaRecomendacao();
    const observador1 = criarObservadorMock();
    const observador2 = criarObservadorMock();
    publicador.adicionarObservador(observador1);
    publicador.adicionarObservador(observador2);

    const evento = criarEventoFake();
    publicador.notificarObservadores(evento);

    expect(observador1.atualizar).toHaveBeenCalledWith(evento);
    expect(observador2.atualizar).toHaveBeenCalledWith(evento);
  });

  it("não notifica um observador removido", () => {
    const publicador = new SistemaRecomendacao();
    const observador = criarObservadorMock();
    publicador.adicionarObservador(observador);
    publicador.removerObservador(observador);

    publicador.notificarObservadores(criarEventoFake());

    expect(observador.atualizar).not.toHaveBeenCalled();
  });

  it("não quebra ao notificar sem nenhum observador cadastrado", () => {
    const publicador = new SistemaRecomendacao();

    expect(() => publicador.notificarObservadores(criarEventoFake())).not.toThrow();
  });

  it("cada observador reage de forma independente (falha de um não afeta os outros)", () => {
    const publicador = new SistemaRecomendacao();
    const observadorComErro: Observador = {
      atualizar: jest.fn(() => {
        throw new Error("falha simulada");
      })
    };
    const observadorNormal = criarObservadorMock();
    publicador.adicionarObservador(observadorComErro);
    publicador.adicionarObservador(observadorNormal);
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => publicador.notificarObservadores(criarEventoFake())).not.toThrow();

    expect(observadorNormal.atualizar).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalledWith(expect.stringContaining("falhou"), expect.any(Error));
    erro.mockRestore();
  });

  it("o observador que falha nao impede os seguintes, mesmo quando e' o primeiro", () => {
    const publicador = new SistemaRecomendacao();
    const ordem: string[] = [];
    publicador.adicionarObservador({ atualizar: () => { ordem.push("a"); throw new Error("x"); } });
    publicador.adicionarObservador({ atualizar: () => { ordem.push("b"); } });
    publicador.adicionarObservador({ atualizar: () => { ordem.push("c"); } });
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});

    publicador.notificarObservadores(criarEventoFake());

    expect(ordem).toEqual(["a", "b", "c"]);
    erro.mockRestore();
  });
}); 