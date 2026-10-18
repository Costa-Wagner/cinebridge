import { ProjetoDocumentario } from "./ProjetoDocumentario";
import { Equipe } from "./Equipe";
import { MembroEquipe } from "./MembroEquipe";
import { Profissional } from "./Profissional";
import { Convite } from "./Convite";
import { Papel } from "../enums/Papel";
import { StatusConvite } from "../enums/StatusConvite";
import { OperacaoInvalidaError } from "../erros";

const ana = { id: "1", nome: "Ana" } as Profissional;
const bruno = { id: "2", nome: "Bruno" } as Profissional;

function membro(papel: Papel, profissional: Profissional, extras: Partial<MembroEquipe> = {}): MembroEquipe {
  return Object.assign(new MembroEquipe(), { papel, profissional, aceitouConvite: false, ...extras });
}

/** Projeto com dois papeis e uma equipe proposta: Ana (diretora) e Bruno (editor). */
function projetoComEquipe() {
  const projeto = new ProjetoDocumentario();
  projeto.papeisObrigatorios = [
    { papel: Papel.DIRETOR, peso: 10 },
    { papel: Papel.EDITOR, peso: 8 }
  ];
  projeto.rejeitados = [];
  const equipe = new Equipe();
  equipe.membros = [membro(Papel.DIRETOR, ana), membro(Papel.EDITOR, bruno)];
  projeto.equipe = equipe;
  return { projeto, equipe };
}

describe("Projeto.aceitarRecomendacao", () => {
  it("cria o convite PENDENTE e o associa ao membro", () => {
    const { projeto, equipe } = projetoComEquipe();

    const convite = projeto.aceitarRecomendacao(Papel.DIRETOR, ana);

    expect(convite).toBeInstanceOf(Convite);
    expect(convite).toMatchObject({ projeto, profissional: ana, papel: Papel.DIRETOR, status: StatusConvite.PENDENTE });
    expect(equipe.membros[0].convite).toBe(convite);
  });

  it.each([
    ["quem nao e' o proposto para o papel", Papel.DIRETOR, bruno],
    ["papel sem membro", Papel.ROTEIRISTA, ana]
  ])("recusa %s", (_motivo, papel, profissional) => {
    const { projeto } = projetoComEquipe();

    expect(() => projeto.aceitarRecomendacao(papel, profissional)).toThrow(OperacaoInvalidaError);
  });

  it("recusa convidar duas vezes o mesmo membro e projeto sem equipe", () => {
    const { projeto } = projetoComEquipe();
    projeto.aceitarRecomendacao(Papel.DIRETOR, ana);

    expect(() => projeto.aceitarRecomendacao(Papel.DIRETOR, ana)).toThrow("ja foi convidado");
    expect(() => new ProjetoDocumentario().aceitarRecomendacao(Papel.DIRETOR, ana)).toThrow(OperacaoInvalidaError);
  });
});

describe("Projeto.substituirMembro", () => {
  it("remove o membro, cancela o convite pendente e registra a dispensa", () => {
    const { projeto, equipe } = projetoComEquipe();
    const convite = projeto.aceitarRecomendacao(Papel.DIRETOR, ana);

    projeto.substituirMembro(Papel.DIRETOR, ana);

    expect(equipe.membros.map((m) => m.papel)).toEqual([Papel.EDITOR]);
    expect(convite.status).toBe(StatusConvite.CANCELADO);
    expect(projeto.rejeitados).toEqual([{ papel: Papel.DIRETOR, profissionalId: "1" }]);
  });

  it("nao altera convite que nao esta pendente (ex.: recusado)", () => {
    const { projeto, equipe } = projetoComEquipe();
    const convite = projeto.aceitarRecomendacao(Papel.DIRETOR, ana);
    convite.status = StatusConvite.RECUSADO;

    projeto.substituirMembro(Papel.DIRETOR, ana);

    expect(convite.status).toBe(StatusConvite.RECUSADO);
    expect(equipe.membros).toHaveLength(1);
  });

  it("recusa substituir quem ja confirmou ou quem nao e' o proposto", () => {
    const { projeto, equipe } = projetoComEquipe();
    equipe.membros[0].aceitouConvite = true;

    expect(() => projeto.substituirMembro(Papel.DIRETOR, ana)).toThrow("ja confirmou");
    expect(() => projeto.substituirMembro(Papel.EDITOR, ana)).toThrow(OperacaoInvalidaError);
  });

  it("acumula as dispensas mesmo quando a lista ainda nao existia", () => {
    const { projeto } = projetoComEquipe();
    (projeto as { rejeitados?: unknown }).rejeitados = undefined;

    projeto.substituirMembro(Papel.EDITOR, bruno);

    expect(projeto.rejeitados).toEqual([{ papel: Papel.EDITOR, profissionalId: "2" }]);
  });
});

describe("Projeto.solicitarReavaliacao e papeisPendentes", () => {
  it("descarta so' quem nao confirmou, cancela convites pendentes e devolve os papeis a refazer", () => {
    const { projeto, equipe } = projetoComEquipe();
    equipe.membros[0].aceitouConvite = true;
    const convite = projeto.aceitarRecomendacao(Papel.EDITOR, bruno);

    const refazer = projeto.solicitarReavaliacao();

    expect(refazer).toEqual([Papel.EDITOR]);
    expect(equipe.membros.map((m) => m.papel)).toEqual([Papel.DIRETOR]);
    expect(convite.status).toBe(StatusConvite.CANCELADO);
    expect(projeto.rejeitados).toEqual([]);
  });

  it("papeisPendentes lista os papeis sem membro confirmado, na ordem do projeto", () => {
    const { projeto, equipe } = projetoComEquipe();

    expect(projeto.papeisPendentes()).toEqual([Papel.DIRETOR, Papel.EDITOR]);
    equipe.membros[1].aceitouConvite = true;
    expect(projeto.papeisPendentes()).toEqual([Papel.DIRETOR]);
    equipe.membros[0].aceitouConvite = true;
    expect(projeto.papeisPendentes()).toEqual([]);
  });

  it("sem equipe, todos os papeis estao pendentes e nao ha o que reavaliar", () => {
    const projeto = new ProjetoDocumentario();
    projeto.papeisObrigatorios = [{ papel: Papel.DIRETOR, peso: 10 }];

    expect(projeto.solicitarReavaliacao()).toEqual([Papel.DIRETOR]);
  });

  it("clonar nao herda as dispensas do original", () => {
    const { projeto } = projetoComEquipe();
    projeto.substituirMembro(Papel.DIRETOR, ana);
    projeto.tipoCaptacao = undefined as never;
    projeto.localizacaoFilmagem = "x";
    projeto.entrevistados = [];

    expect(projeto.clonar().rejeitados).toEqual([]);
  });
});
