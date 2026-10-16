import { RecomendadorPorPontuacao, ehCandidatoElegivel } from "./RecomendadorPorPontuacao";
import { PontuacaoStrategy, ResultadoRecomendacao } from "./PontuacaoStrategy";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";
import { PERFIL_IDEAL_PAPEL } from "../config/perfilPapel";

const competenciaDoDiretor = Object.keys(PERFIL_IDEAL_PAPEL[Papel.DIRETOR])[0];

function profissional(id: string, competencias: string[]): Profissional {
  return {
    id,
    nome: id,
    competencias: competencias.map((nome) => ({ competencia: { nome } }))
  } as unknown as Profissional;
}

const projeto = {
  papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }]
} as Projeto;

describe("ehCandidatoElegivel", () => {
  it("aceita quem tem ao menos uma competencia do perfil do papel", () => {
    expect(ehCandidatoElegivel(profissional("a", [competenciaDoDiretor]), Papel.DIRETOR)).toBe(true);
  });

  it("rejeita quem nao tem competencia do papel ou nao tem competencias", () => {
    expect(ehCandidatoElegivel(profissional("b", ["inexistente"]), Papel.DIRETOR)).toBe(false);
    expect(ehCandidatoElegivel({ id: "c" } as Profissional, Papel.DIRETOR)).toBe(false);
  });
});

describe("RecomendadorPorPontuacao", () => {
  const elegivel = profissional("elegivel", [competenciaDoDiretor]);
  const inelegivel = profissional("inelegivel", ["inexistente"]);

  const pontuador: PontuacaoStrategy = {
    nome: "FAKE",
    recomendar: jest.fn(({ candidatos }): ResultadoRecomendacao[] =>
      candidatos.map((c, i) => ({ profissional: c, pontuacao: 10 - i }))
    )
  };

  it("envia ao pontuador so os candidatos elegiveis e devolve o mapa por papel", () => {
    const recomendador = new RecomendadorPorPontuacao(pontuador);

    const mapa = recomendador.recomendar(projeto, [elegivel, inelegivel]);

    expect(mapa.get(Papel.DIRETOR)).toEqual([elegivel]);
  });

  it("rankingDetalhado preserva as pontuacoes", () => {
    const recomendador = new RecomendadorPorPontuacao(pontuador);

    const ranking = recomendador.rankingDetalhado(projeto, [elegivel]);

    expect(ranking.get(Papel.DIRETOR)).toEqual([{ profissional: elegivel, pontuacao: 10 }]);
  });
});
