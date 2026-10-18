import { DataSource } from "typeorm";
import { ServicoProjetos } from "./ServicoProjetos";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { TipoEvento } from "../observers/TipoEvento";
import { FabricaDocumentario } from "../fabricas/documentario/FabricaDocumentario";
import { OperacaoInvalidaError } from "../domain/erros";
import { Projeto } from "../domain/entities/Projeto";
import { ProjetoDocumentario } from "../domain/entities/ProjetoDocumentario";
import { Profissional } from "../domain/entities/Profissional";
import { Convite } from "../domain/entities/Convite";
import { Equipe } from "../domain/entities/Equipe";
import { MembroEquipe } from "../domain/entities/MembroEquipe";
import { Papel } from "../domain/enums/Papel";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { StatusEquipe } from "../domain/enums/StatusEquipe";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";

/**
 * Testes unitarios do servico com um DataSource de mentira (em memoria):
 * exercitam as regras do fluxo; o comportamento com banco real fica nos
 * testes de integracao.
 */
const ana = { id: "1", nome: "Ana" } as Profissional;
const bruno = { id: "2", nome: "Bruno" } as Profissional;
const carla = { id: "3", nome: "Carla" } as Profissional;
const dani = { id: "4", nome: "Dani" } as Profissional;

function membro(papel: Papel, profissional: Profissional, extras: Partial<MembroEquipe> = {}): MembroEquipe {
  return Object.assign(new MembroEquipe(), { papel, profissional, aceitouConvite: false, ...extras });
}

function convite(id: string, status: StatusConvite, papel = Papel.DIRETOR, profissional = ana): Convite {
  return Object.assign(new Convite(), { id, status, papel, profissional });
}

/** Documentario com os papeis DIRETOR e EDITOR e, opcionalmente, uma equipe ja proposta. */
function criarProjeto(membros?: MembroEquipe[]): Projeto {
  const projeto = new FabricaDocumentario().criarProjeto({
    duracaoEstimadaMinutos: 60,
    orcamentoTotal: 1000,
    dataEntrega: "2026-12-01",
    tema: "Rios",
    entrevistados: ["Ana"],
    papeisObrigatorios: [
      { papel: Papel.DIRETOR, peso: 10 },
      { papel: Papel.EDITOR, peso: 8 }
    ]
  });
  projeto.id = "proj-1";
  if (membros) {
    const equipe = new Equipe();
    equipe.id = "eq-1";
    equipe.status = StatusEquipe.EM_FORMACAO;
    equipe.formadaEm = null;
    equipe.membros = membros;
    projeto.equipe = equipe;
  }
  return projeto;
}

function parcial(...membros: MembroEquipe[]): Equipe {
  return Object.assign(new Equipe(), { membros, ranking: new Map() });
}

function montar(dados: { projeto?: Projeto | null; profissionais?: Profissional[]; convite?: Convite | null } = {}) {
  const manager = {
    save: jest.fn(async (entidade: unknown) => entidade),
    createQueryBuilder: jest.fn(() => ({
      delete: () => ({ from: () => ({ where: () => ({ execute: jest.fn(async () => undefined) }) }) })
    }))
  };
  const dataSource = {
    manager,
    transaction: async (fn: (m: typeof manager) => Promise<void>) => fn(manager),
    getRepository: (alvo: unknown) => {
      if (alvo === Projeto) return { findOne: async () => dados.projeto ?? null };
      if (alvo === Profissional) return { find: async () => dados.profissionais ?? [] };
      return { findOne: async () => dados.convite ?? null };
    }
  } as unknown as DataSource;

  const sistema = new SistemaRecomendacao();
  sistema.registrarFabrica(TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario());
  const notificar = jest.spyOn(sistema, "notificarObservadores").mockImplementation(() => {});
  const recomendar = jest.spyOn(sistema, "recomendar");
  return { servico: new ServicoProjetos(dataSource, sistema), manager, sistema, notificar, recomendar };
}

const tipos = (notificar: jest.SpyInstance) => notificar.mock.calls.map((c) => (c[0] as { tipo: TipoEvento }).tipo);

describe("ServicoProjetos.criar", () => {
  it("cria pela fabrica do tipo e grava o projeto", async () => {
    const { servico, manager } = montar();

    const projeto = await servico.criar(TipoCaptacao.DOCUMENTARIO, {
      duracaoEstimadaMinutos: 60,
      orcamentoTotal: 1000,
      dataEntrega: "2026-12-01",
      tema: "Rios",
      entrevistados: ["Ana"]
    });

    expect(projeto).toBeInstanceOf(ProjetoDocumentario);
    expect(manager.save).toHaveBeenCalledWith(projeto);
  });
});

describe("ServicoProjetos.recomendar e buscarEquipe", () => {
  it("devolve null quando o projeto nao existe", async () => {
    expect(await montar({ projeto: null }).servico.recomendar("x")).toBeNull();
  });

  it("recusa recomendar de novo quando ha convites em andamento", async () => {
    const projeto = criarProjeto([membro(Papel.DIRETOR, ana, { convite: convite("c1", StatusConvite.PENDENTE) })]);

    await expect(montar({ projeto }).servico.recomendar("proj-1")).rejects.toThrow(OperacaoInvalidaError);
  });

  it("substitui a equipe anterior (sem convites) pela nova", async () => {
    const projeto = criarProjeto([membro(Papel.DIRETOR, ana)]);
    const { servico, manager, recomendar } = montar({ projeto, profissionais: [ana, bruno] });
    const nova = parcial(membro(Papel.DIRETOR, bruno));
    recomendar.mockReturnValue(nova);

    const equipe = await servico.recomendar("proj-1");

    expect(equipe).toBe(nova);
    expect(recomendar).toHaveBeenCalledWith(projeto, [ana, bruno]);
    expect(manager.save).toHaveBeenCalledWith(nova);
  });

  it("buscarEquipe: null sem projeto ou sem equipe; membros na ordem dos papeis do projeto", async () => {
    expect(await montar({ projeto: null }).servico.buscarEquipe("x")).toBeNull();
    expect(await montar({ projeto: criarProjeto() }).servico.buscarEquipe("proj-1")).toBeNull();

    const projeto = criarProjeto([membro(Papel.EDITOR, bruno), membro(Papel.DIRETOR, ana)]);
    const equipe = await montar({ projeto }).servico.buscarEquipe("proj-1");

    expect(equipe!.membros.map((m) => m.papel)).toEqual([Papel.DIRETOR, Papel.EDITOR]);
    expect(equipe!.projeto).toBe(projeto);
  });
});

describe("ServicoProjetos.aceitarRecomendacao", () => {
  it("cria o convite, grava e avisa o profissional", async () => {
    const projeto = criarProjeto([membro(Papel.DIRETOR, ana)]);
    const { servico, manager, notificar } = montar({ projeto });

    const criado = await servico.aceitarRecomendacao("proj-1", Papel.DIRETOR, "1");

    expect(criado).toMatchObject({ status: StatusConvite.PENDENTE, papel: Papel.DIRETOR });
    expect(manager.save).toHaveBeenCalledWith(projeto.equipe);
    expect(notificar).toHaveBeenCalledWith({ tipo: TipoEvento.CONVITE_ENVIADO, projeto, papel: Papel.DIRETOR, candidatos: [ana] });
  });

  it("null para projeto inexistente; erro sem equipe ou para profissional que nao e' o proposto", async () => {
    expect(await montar({ projeto: null }).servico.aceitarRecomendacao("x", Papel.DIRETOR, "1")).toBeNull();
    await expect(montar({ projeto: criarProjeto() }).servico.aceitarRecomendacao("p", Papel.DIRETOR, "1")).rejects.toThrow(
      "ainda nao tem equipe"
    );
    const comEquipe = criarProjeto([membro(Papel.DIRETOR, ana)]);
    await expect(montar({ projeto: comEquipe }).servico.aceitarRecomendacao("p", Papel.DIRETOR, "2")).rejects.toThrow(
      "nao e' o membro proposto"
    );
  });
});

describe("ServicoProjetos.responderConvite", () => {
  function cenario(aceitouOutro = false) {
    const pendente = convite("c1", StatusConvite.PENDENTE);
    const outro = membro(Papel.EDITOR, bruno, { aceitouConvite: aceitouOutro });
    const projeto = criarProjeto([membro(Papel.DIRETOR, ana, { convite: pendente }), outro]);
    const existente = Object.assign(new Convite(), { id: "c1", status: StatusConvite.PENDENTE, projeto });
    return { projeto, pendente, ...montar({ projeto, convite: existente }) };
  }

  it("null quando o convite nao existe", async () => {
    expect(await montar({ convite: null }).servico.responderConvite("x", true)).toBeNull();
  });

  it("erro quando o convite ja foi respondido ou nao pertence a equipe atual", async () => {
    const respondido = Object.assign(new Convite(), { id: "c1", status: StatusConvite.ACEITO });
    await expect(montar({ convite: respondido }).servico.responderConvite("c1", true)).rejects.toThrow("ja esta ACEITO");

    const projeto = criarProjeto([membro(Papel.DIRETOR, ana)]);
    const orfao = Object.assign(new Convite(), { id: "c9", status: StatusConvite.PENDENTE, projeto });
    await expect(montar({ projeto, convite: orfao }).servico.responderConvite("c9", true)).rejects.toThrow(
      "nao pertence a equipe atual"
    );
  });

  it("aceitar confirma o membro e avisa o produtor, sem formar a equipe enquanto falta alguem", async () => {
    const { servico, pendente, notificar, projeto } = cenario(false);

    const resultado = await servico.responderConvite("c1", true);

    expect(resultado).toEqual({ convite: pendente, equipeFormada: false });
    expect(pendente.status).toBe(StatusConvite.ACEITO);
    expect(projeto.equipe!.membros[0].aceitouConvite).toBe(true);
    expect(projeto.equipe!.status).toBe(StatusEquipe.EM_FORMACAO);
    expect(tipos(notificar)).toEqual([TipoEvento.CONVITE_ACEITO]);
  });

  it("o ultimo aceite forma a equipe, registra a composicao final e dispara o evento da equipe", async () => {
    const { servico, notificar, projeto } = cenario(true);

    const resultado = await servico.responderConvite("c1", true);

    expect(resultado!.equipeFormada).toBe(true);
    expect(projeto.equipe!.status).toBe(StatusEquipe.FORMADA);
    expect(projeto.equipe!.formadaEm).toBeInstanceOf(Date);
    expect(tipos(notificar)).toEqual([TipoEvento.CONVITE_ACEITO, TipoEvento.EQUIPE_FORMADA]);
    expect(notificar.mock.calls[1][0]).toMatchObject({ papel: null, candidatos: [ana, bruno] });
  });

  it("recusar avisa o produtor e mantem o membro sem confirmacao", async () => {
    const { servico, pendente, notificar, projeto } = cenario(true);

    const resultado = await servico.responderConvite("c1", false);

    expect(resultado!.equipeFormada).toBe(false);
    expect(pendente.status).toBe(StatusConvite.RECUSADO);
    expect(projeto.equipe!.membros[0].aceitouConvite).toBe(false);
    expect(tipos(notificar)).toEqual([TipoEvento.CONVITE_RECUSADO]);
  });
});

describe("ServicoProjetos.substituirMembro", () => {
  it("null para projeto inexistente", async () => {
    expect(await montar({ projeto: null }).servico.substituirMembro("x", Papel.DIRETOR, "1")).toBeNull();
  });

  it("dispensa o membro, cancela o convite e propoe outro so' para o papel, sem repetir ocupados nem dispensados", async () => {
    const pendente = convite("c1", StatusConvite.PENDENTE);
    const projeto = criarProjeto([membro(Papel.DIRETOR, ana, { convite: pendente }), membro(Papel.EDITOR, bruno)]);
    projeto.rejeitados = [
      { papel: Papel.DIRETOR, profissionalId: "3" },
      { papel: Papel.EDITOR, profissionalId: "4" }
    ];
    const { servico, manager, notificar, recomendar } = montar({ projeto, profissionais: [ana, bruno, carla, dani] });
    recomendar.mockReturnValue(parcial(membro(Papel.DIRETOR, dani)));

    const equipe = await servico.substituirMembro("proj-1", Papel.DIRETOR, "1");

    expect(recomendar).toHaveBeenCalledWith(projeto, [dani], undefined, [Papel.DIRETOR]);
    expect(equipe!.membros.map((m) => [m.papel, m.profissional.id])).toEqual([[Papel.DIRETOR, "4"], [Papel.EDITOR, "2"]]);
    expect(pendente.status).toBe(StatusConvite.CANCELADO);
    expect(manager.save).toHaveBeenCalledWith([pendente]);
    expect(projeto.rejeitados).toContainEqual({ papel: Papel.DIRETOR, profissionalId: "1" });
    expect(tipos(notificar)).toEqual([TipoEvento.MEMBRO_SUBSTITUIDO]);
  });

  it("se nao ha candidato disponivel, o papel fica sem membro", async () => {
    const projeto = criarProjeto([membro(Papel.DIRETOR, ana)]);
    const { servico, recomendar } = montar({ projeto, profissionais: [ana] });
    recomendar.mockReturnValue(parcial());

    const equipe = await servico.substituirMembro("proj-1", Papel.DIRETOR, "1");

    expect(equipe!.membros).toEqual([]);
    expect(recomendar).toHaveBeenCalledWith(projeto, [], undefined, [Papel.DIRETOR]);
  });
});

describe("ServicoProjetos.reavaliar", () => {
  it("null para projeto inexistente e erro quando ainda nao ha equipe", async () => {
    expect(await montar({ projeto: null }).servico.reavaliar("x")).toBeNull();
    await expect(montar({ projeto: criarProjeto() }).servico.reavaliar("p")).rejects.toThrow("recomende antes");
  });

  it("aplica os ajustes, refaz so' os papeis sem confirmacao e cancela os convites pendentes", async () => {
    const pendente = convite("c2", StatusConvite.PENDENTE, Papel.EDITOR, bruno);
    const projeto = criarProjeto([
      membro(Papel.DIRETOR, ana, { aceitouConvite: true }),
      membro(Papel.EDITOR, bruno, { convite: pendente })
    ]);
    const { servico, recomendar } = montar({ projeto, profissionais: [ana, bruno, carla] });
    recomendar.mockReturnValue(parcial(membro(Papel.EDITOR, carla)));

    const equipe = await servico.reavaliar("proj-1", { orcamentoTotal: 9000, dataEntrega: "2026-12-20" });

    expect(projeto.orcamentoTotal).toBe(9000);
    expect(projeto.dataEntrega).toBe("2026-12-20");
    expect(recomendar).toHaveBeenCalledWith(projeto, [bruno, carla], undefined, [Papel.EDITOR]);
    expect(pendente.status).toBe(StatusConvite.CANCELADO);
    expect(equipe!.membros.map((m) => [m.papel, m.profissional.id])).toEqual([[Papel.DIRETOR, "1"], [Papel.EDITOR, "3"]]);
  });

  it("sem ajustes e com todos confirmados, nao ha nada a refazer", async () => {
    const projeto = criarProjeto([
      membro(Papel.DIRETOR, ana, { aceitouConvite: true }),
      membro(Papel.EDITOR, bruno, { aceitouConvite: true })
    ]);
    const { servico, recomendar } = montar({ projeto, profissionais: [ana, bruno] });

    const equipe = await servico.reavaliar("proj-1");

    expect(recomendar).not.toHaveBeenCalled();
    expect(equipe!.membros).toHaveLength(2);
  });
});
