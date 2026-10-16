import { OrquestradorPadrao } from "./OrquestradorPadrao";
import { ProjetoInvalidoError } from "./ProjetoInvalidoError";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";
import { Publicador } from "../observers/Publicador";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";

function criarProfissional(id: string, nome: string): Profissional {
  return { id, nome } as Profissional;
}

function criarProjeto(
  papeisObrigatorios: { papel: Papel; peso: number }[],
  extras: Partial<Projeto> = {}
): Projeto {
  return {
    orcamentoTotal: 50000,
    duracaoEstimadaMinutos: 90,
    dataEntrega: "2026-12-01",
    papeisObrigatorios,
    ...extras
  } as Projeto;
}

/** Strategy fake: devolve rankings fixos, controlados pelo teste. */
function strategyFake(ranking: Map<Papel, Profissional[]>): RecomendacaoStrategy {
  return { recomendar: jest.fn().mockReturnValue(ranking) };
}

function criarPublicadorMock(): Publicador {
  return {
    adicionarObservador: jest.fn(),
    removerObservador: jest.fn(),
    notificarObservadores: jest.fn()
  };
}

describe("OrquestradorPadrao", () => {
  const alice = criarProfissional("1", "Alice");
  const bruno = criarProfissional("2", "Bruno");
  const carla = criarProfissional("3", "Carla");

  it("propoe o melhor candidato de cada papel como membro da equipe", () => {
    const estrategia = strategyFake(
      new Map([
        [Papel.DIRETOR, [alice, bruno]],
        [Papel.EDITOR, [carla]]
      ])
    );
    const projeto = criarProjeto([
      { papel: Papel.DIRETOR, peso: 10 },
      { papel: Papel.EDITOR, peso: 7 }
    ]);

    const equipe = new OrquestradorPadrao().orquestrar(projeto, estrategia, [alice, bruno, carla]);

    expect(equipe.projeto).toBe(projeto);
    expect(equipe.membros.map((m) => [m.papel, m.profissional])).toEqual([
      [Papel.DIRETOR, alice],
      [Papel.EDITOR, carla]
    ]);
    expect(equipe.membros.every((m) => m.aceitouConvite === false)).toBe(true);
  });

  it("nao reutiliza o mesmo profissional como primeira opcao de dois papeis", () => {
    const estrategia = strategyFake(
      new Map([
        [Papel.DIRETOR, [alice]],
        [Papel.EDITOR, [alice, bruno]]
      ])
    );
    const projeto = criarProjeto([
      { papel: Papel.DIRETOR, peso: 10 },
      { papel: Papel.EDITOR, peso: 7 }
    ]);

    const equipe = new OrquestradorPadrao().orquestrar(projeto, estrategia, [alice, bruno]);

    expect(equipe.membros.find((m) => m.papel === Papel.EDITOR)?.profissional).toBe(bruno);
    expect(equipe.ranking.get(Papel.EDITOR)).toEqual([bruno]);
  });

  it("limita o ranking de cada papel ao limite configurado", () => {
    const estrategia = strategyFake(new Map([[Papel.DIRETOR, [alice, bruno, carla]]]));
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    const equipe = new OrquestradorPadrao(undefined, 2).orquestrar(projeto, estrategia, [alice, bruno, carla]);

    expect(equipe.ranking.get(Papel.DIRETOR)).toEqual([alice, bruno]);
  });

  it("papel sem candidatos fica sem membro e sem notificacao", () => {
    const estrategia = strategyFake(
      new Map([
        [Papel.DIRETOR, [alice]],
        [Papel.SONOPLASTA, []]
      ])
    );
    const publicador = criarPublicadorMock();
    const projeto = criarProjeto([
      { papel: Papel.DIRETOR, peso: 10 },
      { papel: Papel.SONOPLASTA, peso: 6 }
    ]);

    const equipe = new OrquestradorPadrao(publicador).orquestrar(projeto, estrategia, [alice]);

    expect(equipe.membros.map((m) => m.papel)).toEqual([Papel.DIRETOR]);
    expect(publicador.notificarObservadores).toHaveBeenCalledTimes(1);
    expect(publicador.notificarObservadores).toHaveBeenCalledWith({
      projeto,
      papel: Papel.DIRETOR,
      candidatos: [alice]
    });
  });

  it("remove profissionais duplicados antes de chamar a strategy", () => {
    const estrategia = strategyFake(new Map());
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    new OrquestradorPadrao().orquestrar(projeto, estrategia, [alice, alice, bruno]);

    expect(estrategia.recomendar).toHaveBeenCalledWith(projeto, [alice, bruno]);
  });

  it.each([
    ["orcamento zerado", { orcamentoTotal: 0 }],
    ["duracao zerada", { duracaoEstimadaMinutos: 0 }],
    ["data de entrega invalida", { dataEntrega: "nao-e-data" }],
    ["nenhum papel obrigatorio", { papeisObrigatorios: [] }],
    ["papel com peso zero", { papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 0 }] }]
  ])("rejeita projeto invalido (%s) sem chamar a strategy", (_motivo, extras) => {
    const estrategia = strategyFake(new Map());
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }], extras as Partial<Projeto>);

    expect(() => new OrquestradorPadrao().orquestrar(projeto, estrategia, [alice])).toThrow(
      ProjetoInvalidoError
    );
    expect(estrategia.recomendar).not.toHaveBeenCalled();
  });
});
