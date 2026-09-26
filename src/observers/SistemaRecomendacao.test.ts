import { SistemaRecomendacao } from "./SistemaRecomendacao";
import { Assinante } from "./Assinante";
import { EventoRecomendacaoGerada } from "./EventoRecomendacaoGerada";

function criarAssinanteMock(): Assinante {
  return { atualizar: jest.fn() };
}

function criarEventoFake(): EventoRecomendacaoGerada {
  return {} as EventoRecomendacaoGerada;
}

describe("SistemaRecomendacao", () => {
  it("notifica todos os assinantes cadastrados ao disparar um evento", () => {
    const publicador = new SistemaRecomendacao();
    const assinante1 = criarAssinanteMock();
    const assinante2 = criarAssinanteMock();
    publicador.adicionarAssinante(assinante1);
    publicador.adicionarAssinante(assinante2);

    const evento = criarEventoFake();
    publicador.notificarAssinantes(evento);

    expect(assinante1.atualizar).toHaveBeenCalledWith(publicador, evento);
    expect(assinante2.atualizar).toHaveBeenCalledWith(publicador, evento);
  });

  it("não notifica um assinante removido", () => {
    const publicador = new SistemaRecomendacao();
    const assinante = criarAssinanteMock();
    publicador.adicionarAssinante(assinante);
    publicador.removerAssinante(assinante);

    publicador.notificarAssinantes(criarEventoFake());

    expect(assinante.atualizar).not.toHaveBeenCalled();
  });

  it("não quebra ao notificar sem nenhum assinante cadastrado", () => {
    const publicador = new SistemaRecomendacao();

    expect(() => publicador.notificarAssinantes(criarEventoFake())).not.toThrow();
  });

  it("cada assinante reage de forma independente (falha de um não afeta os outros)", () => {
    const publicador = new SistemaRecomendacao();
    const assinanteComErro: Assinante = {
      atualizar: jest.fn(() => {
        throw new Error("falha simulada");
      })
    };
    const assinanteNormal = criarAssinanteMock();
    publicador.adicionarAssinante(assinanteComErro);
    publicador.adicionarAssinante(assinanteNormal);

    expect(() => publicador.notificarAssinantes(criarEventoFake())).toThrow("falha simulada");
  });
}); 