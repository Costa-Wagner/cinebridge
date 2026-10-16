import { OrquestradorPadrao } from "./OrquestradorPadrao";
import { Papel } from "../domain/enums/Papel";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";
import { Publicador } from "../observers/Publicador";
import {
  PontuacaoStrategy,
  ParametrosRecomendacao,
  ResultadoRecomendacao
} from "../strategies/PontuacaoStrategy";

function criarProfissional(id: string, nome: string): Profissional {
  return { id, nome } as Profissional;
}

function criarProjeto(papeisObrigatorios: { papel: Papel; peso: number }[]): Projeto {
  return { papeisObrigatorios } as Projeto;
}

/** Strategy fake: retorna resultados fixos, controlados pelo teste. */
class StrategyFake implements PontuacaoStrategy {
  readonly nome = "FAKE";
  constructor(private readonly resultadosPorPapel: Map<Papel, ResultadoRecomendacao[]>) {}

  recomendar(params: ParametrosRecomendacao): ResultadoRecomendacao[] {
    return this.resultadosPorPapel.get(params.papel) ?? [];
  }
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

  it("convida o candidato de maior pontuação quando acima do mínimo", () => {
    const strategy = new StrategyFake(
      new Map([
        [Papel.DIRETOR, [
          { profissional: alice, pontuacao: 9 },
          { profissional: bruno, pontuacao: 6 }
        ]]
      ])
    );
    const orquestrador = new OrquestradorPadrao(strategy, 5);
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    const resultado = orquestrador.orquestrar(projeto, new Map([[Papel.DIRETOR, [alice, bruno]]]));

    expect(resultado.convites).toHaveLength(1);
    expect(resultado.convites[0].profissional).toBe(alice);
    expect(resultado.convites[0].papel).toBe(Papel.DIRETOR);
    expect(resultado.convites[0].status).toBe(StatusConvite.PENDENTE);
  });

  it("não convida ninguém quando a melhor pontuação fica abaixo do mínimo", () => {
    const strategy = new StrategyFake(
      new Map([[Papel.DIRETOR, [{ profissional: alice, pontuacao: 3 }]]])
    );
    const orquestrador = new OrquestradorPadrao(strategy, 5);
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    const resultado = orquestrador.orquestrar(projeto, new Map([[Papel.DIRETOR, [alice]]]));

    expect(resultado.convites).toHaveLength(0);
    expect(resultado.recomendacoes).toHaveLength(1);
  });

  it("não reutiliza o mesmo profissional em dois papéis diferentes", () => {
    const strategy = new StrategyFake(
      new Map([
        [Papel.DIRETOR, [{ profissional: alice, pontuacao: 9 }]],
        [Papel.EDITOR, [
          { profissional: alice, pontuacao: 8 },
          { profissional: bruno, pontuacao: 7 }
        ]]
      ])
    );
    const orquestrador = new OrquestradorPadrao(strategy, 5);
    const projeto = criarProjeto([
      { papel: Papel.DIRETOR, peso: 10 },
      { papel: Papel.EDITOR, peso: 7 }
    ]);

    const resultado = orquestrador.orquestrar(
      projeto,
      new Map([
        [Papel.DIRETOR, [alice]],
        [Papel.EDITOR, [alice, bruno]]
      ])
    );

    expect(resultado.convites).toHaveLength(2);
    const convitadoEditor = resultado.convites.find((c) => c.papel === Papel.EDITOR);
    expect(convitadoEditor?.profissional).toBe(bruno);
  });

  it("gera recomendações com posicaoRanking sequencial e nome da estratégia", () => {
    const strategy = new StrategyFake(
      new Map([[Papel.DIRETOR, [
        { profissional: alice, pontuacao: 9 },
        { profissional: bruno, pontuacao: 6 }
      ]]])
    );
    const orquestrador = new OrquestradorPadrao(strategy, 5);
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    const resultado = orquestrador.orquestrar(projeto, new Map([[Papel.DIRETOR, [alice, bruno]]]));

    expect(resultado.recomendacoes[0].posicaoRanking).toBe(1);
    expect(resultado.recomendacoes[1].posicaoRanking).toBe(2);
    expect(resultado.recomendacoes.every((r) => r.estrategiaUtilizada === "FAKE")).toBe(true);
  });

  it("notifica o publicador uma vez por papel processado", () => {
    const strategy = new StrategyFake(
      new Map([[Papel.DIRETOR, [{ profissional: alice, pontuacao: 9 }]]])
    );
    const publicador = criarPublicadorMock();
    const orquestrador = new OrquestradorPadrao(strategy, 5, publicador);
    const projeto = criarProjeto([{ papel: Papel.DIRETOR, peso: 10 }]);

    orquestrador.orquestrar(projeto, new Map([[Papel.DIRETOR, [alice]]]));

    expect(publicador.notificarObservadores).toHaveBeenCalledTimes(1);
  });

  it("ignora papel sem candidatos disponíveis, sem gerar recomendação ou convite", () => {
    const strategy = new StrategyFake(new Map());
    const orquestrador = new OrquestradorPadrao(strategy, 5);
    const projeto = criarProjeto([{ papel: Papel.SONOPLASTA, peso: 6 }]);

    const resultado = orquestrador.orquestrar(projeto, new Map());

    expect(resultado.recomendacoes).toHaveLength(0);
    expect(resultado.convites).toHaveLength(0);
  });
});