import { OrquestradorPadrao } from "./OrquestradorPadrao";
import { ProjetoInvalidoError } from "./ProjetoInvalidoError";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Publicador } from "../observers/Publicador";
import { Observador } from "../observers/Observador";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { FabricaDocumentario } from "../fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "../fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "../fabricas/publicitario/FabricaPublicitario";
import { DadosProjeto } from "../fabricas/FabricaProjeto";
import { TipoEvento } from "../observers/TipoEvento";

const fabrica = new FabricaDocumentario();

// os notificadores das fabricas escrevem no console; silencia durante os testes
beforeAll(() => jest.spyOn(console, "log").mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

function criarProfissional(id: string, nome: string): Profissional {
  return { id, nome } as Profissional;
}

function criarProjeto(papeisObrigatorios: { papel: Papel; peso: number }[], extras: DadosProjeto = {}) {
  return fabrica.criarProjeto({
    duracaoEstimadaMinutos: 90,
    orcamentoTotal: 50000,
    dataEntrega: "2026-12-01",
    tema: "Meio ambiente",
    entrevistados: ["Ana"],
    papeisObrigatorios,
    ...extras
  });
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

    const equipe = new OrquestradorPadrao(fabrica).orquestrar(projeto, [alice, bruno, carla], estrategia);

    expect(equipe.projeto).toBe(projeto);
    expect(equipe.membros.map((m) => [m.papel, m.profissional])).toEqual([
      [Papel.DIRETOR, alice],
      [Papel.EDITOR, carla]
    ]);
    expect(equipe.membros.every((m) => m.aceitouConvite === false)).toBe(true);
  });

  it("usa o recomendador da fabrica quando nenhuma estrategia e' informada", () => {
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    const equipe = new OrquestradorPadrao(fabrica).orquestrar(projeto, []);

    expect(equipe.ranking.get(Papel.DIRETOR)).toEqual([]);
    expect(equipe.membros).toHaveLength(0);
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

    const equipe = new OrquestradorPadrao(fabrica).orquestrar(projeto, [alice, bruno], estrategia);

    expect(equipe.membros.find((m) => m.papel === Papel.EDITOR)?.profissional).toBe(bruno);
    expect(equipe.ranking.get(Papel.EDITOR)).toEqual([bruno]);
  });

  it("limita o ranking de cada papel ao limite configurado", () => {
    const estrategia = strategyFake(new Map([[Papel.DIRETOR, [alice, bruno, carla]]]));
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    const equipe = new OrquestradorPadrao(fabrica, undefined, 2).orquestrar(
      projeto,
      [alice, bruno, carla],
      estrategia
    );

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

    const equipe = new OrquestradorPadrao(fabrica, publicador).orquestrar(projeto, [alice], estrategia);

    expect(equipe.membros.map((m) => m.papel)).toEqual([Papel.DIRETOR]);
    expect(publicador.notificarObservadores).toHaveBeenCalledTimes(1);
    expect(publicador.notificarObservadores).toHaveBeenCalledWith({
      tipo: TipoEvento.RECOMENDACAO_GERADA,
      projeto,
      papel: Papel.DIRETOR,
      candidatos: [alice]
    });
  });

  it("remove profissionais duplicados antes de chamar a strategy", () => {
    const estrategia = strategyFake(new Map());
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    new OrquestradorPadrao(fabrica).orquestrar(projeto, [alice, alice, bruno], estrategia);

    expect(estrategia.recomendar).toHaveBeenCalledWith(projeto, [alice, bruno]);
  });

  it.each([
    ["orcamento zerado", { orcamentoTotal: 0 }],
    ["duracao zerada", { duracaoEstimadaMinutos: 0 }],
    ["data de entrega invalida", { dataEntrega: "nao-e-data" }],
    ["nenhum papel obrigatorio", { papeisObrigatorios: [] }],
    ["peso fora da faixa", { papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 11 }] }],
    ["regra do tipo violada (sem tema)", { tema: "" }]
  ])("rejeita projeto invalido (%s) sem chamar a strategy", (_motivo, extras) => {
    const estrategia = strategyFake(new Map());
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }], extras as DadosProjeto);

    expect(() => new OrquestradorPadrao(fabrica).orquestrar(projeto, [alice], estrategia)).toThrow(
      ProjetoInvalidoError
    );
    expect(estrategia.recomendar).not.toHaveBeenCalled();
  });
});

describe("OrquestradorPadrao com fabricas diferentes (Abstract Factory)", () => {
  const alice = criarProfissional("1", "Alice");
  const dadosBase = { duracaoEstimadaMinutos: 90, orcamentoTotal: 50000, dataEntrega: "2026-12-01" };

  const documentario = new FabricaDocumentario().criarProjeto({ ...dadosBase, tema: "Rios", entrevistados: ["Ana"] });
  const animacao = new FabricaAnimacao().criarProjeto({ ...dadosBase, softwareModelagem: "Blender" });
  const publicitario = new FabricaPublicitario().criarProjeto({ ...dadosBase, cliente: "Acme", canal: "TV" });

  it.each([
    ["FabricaDocumentario", new FabricaDocumentario(), documentario],
    ["FabricaAnimacao", new FabricaAnimacao(), animacao],
    ["FabricaPublicitario", new FabricaPublicitario(), publicitario]
  ])("%s: o mesmo orquestrador aceita o proprio tipo de projeto", (_nome, fabricaDoTipo, projeto) => {
    const papel = projeto.papeisObrigatorios[0].papel;
    const estrategia = strategyFake(new Map([[papel, [alice]]]));

    const equipe = new OrquestradorPadrao(fabricaDoTipo).orquestrar(projeto, [alice], estrategia);

    expect(equipe.membros[0].profissional).toBe(alice);
  });

  it.each([
    ["FabricaDocumentario", new FabricaDocumentario(), animacao],
    ["FabricaAnimacao", new FabricaAnimacao(), publicitario],
    ["FabricaPublicitario", new FabricaPublicitario(), documentario]
  ])("%s: recusa projeto de outro tipo", (_nome, fabricaDoTipo, projetoDeOutroTipo) => {
    expect(() => new OrquestradorPadrao(fabricaDoTipo).orquestrar(projetoDeOutroTipo, [alice])).toThrow(
      ProjetoInvalidoError
    );
  });

  it("notifica o notificador da fabrica, mesmo sem publicador", () => {
    const notificador: Observador = { atualizar: jest.fn() };
    class FabricaComEspiao extends FabricaDocumentario {
      criarNotificador() {
        return notificador as never;
      }
    }
    const estrategia = strategyFake(new Map([[Papel.DIRETOR, [alice]]]));

    new OrquestradorPadrao(new FabricaComEspiao()).orquestrar(documentario, [alice], estrategia);

    expect(notificador.atualizar).toHaveBeenCalledWith({
      tipo: TipoEvento.RECOMENDACAO_GERADA,
      projeto: documentario,
      papel: Papel.DIRETOR,
      candidatos: [alice]
    });
  });

  it("falha no notificador da fabrica nao interrompe a orquestracao nem os observadores", () => {
    const publicador = criarPublicadorMock();
    class FabricaQueFalha extends FabricaDocumentario {
      criarNotificador() {
        return { atualizar: () => { throw new Error("notificador fora do ar"); } } as never;
      }
    }
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    const estrategia = strategyFake(new Map([[Papel.DIRETOR, [alice]]]));

    const equipe = new OrquestradorPadrao(new FabricaQueFalha(), publicador).orquestrar(
      documentario,
      [alice],
      estrategia
    );

    expect(equipe.membros).toHaveLength(1);
    expect(publicador.notificarObservadores).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it("papeis restringem a rodada: a strategy so' enxerga os papeis pedidos, o projeto real e' preservado", () => {
    const estrategia = strategyFake(new Map([[Papel.EDITOR, [alice]]]));

    const equipe = new OrquestradorPadrao(new FabricaDocumentario()).orquestrar(
      documentario,
      [alice],
      estrategia,
      [Papel.EDITOR]
    );

    const visao = (estrategia.recomendar as jest.Mock).mock.calls[0][0];
    expect(visao.papeisObrigatorios.map((p: { papel: Papel }) => p.papel)).toEqual([Papel.EDITOR]);
    expect(visao).not.toBe(documentario);
    expect(equipe.projeto).toBe(documentario);
    expect(documentario.papeisObrigatorios.length).toBeGreaterThan(1);
  });
});
