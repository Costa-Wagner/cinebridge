import { DataSource } from "typeorm";
import { FastifyInstance } from "fastify";
import { prepararBancoDeTestes } from "./bancoDeTestes";
import { criarApp } from "../app";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { BarramentoEmMemoria, TOPICO_EQUIPE_FORMADA } from "../eventos/BarramentoEventos";
import { Projeto } from "../domain/entities/Projeto";
import { Convite } from "../domain/entities/Convite";
import { Equipe } from "../domain/entities/Equipe";
import { Competencia } from "../domain/entities/Competencia";
import { Profissional } from "../domain/entities/Profissional";
import { ProfissionalCompetencia } from "../domain/entities/ProfissionalCompetencia";
import { Avaliacao } from "../domain/entities/Avaliacao";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { StatusEquipe } from "../domain/enums/StatusEquipe";

const documentario = {
  tipoCaptacao: "DOCUMENTARIO",
  duracaoEstimadaMinutos: 80,
  orcamentoTotal: 60000,
  dataEntrega: "2026-12-10",
  localizacaoFilmagem: "Santos",
  tema: "Mares",
  entrevistados: ["Ana", "Beto"]
};

type MembroJson = { papel: string; situacao: string; conviteId: string | null; profissional: { id: string; nome: string } };

let ds: DataSource;
let app: FastifyInstance;
let linhas: string[];
let formadas: any[];
let reservaId: string;

/** Um segundo profissional apto a dirigir, para haver substituto no papel de diretor. */
async function criarDiretorReserva(): Promise<string> {
  const profissional = await ds.getRepository(Profissional).save(
    ds.getRepository(Profissional).create({
      nome: "Rui Reserva",
      email: "rui.reserva@example.com",
      especialidades: ["Direção"],
      precoBaseDiaria: 1200,
      localizacao: "São Paulo",
      disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }]
    })
  );
  for (const [nome, nivel] of [["Liderança", 8], ["Direção", 8]] as const) {
    const competencia = await ds.getRepository(Competencia).findOneByOrFail({ nome });
    await ds.getRepository(ProfissionalCompetencia).save({ profissional, competencia, nivel });
  }
  for (const nota of [8, 8, 9]) await ds.getRepository(Avaliacao).save({ profissional, nota });
  return profissional.id;
}

async function post(url: string, payload: object = {}) {
  return app.inject({ method: "POST", url, payload });
}

/** Cria um documentario e pede a primeira recomendacao. */
async function novaEquipe(): Promise<{ id: string; membros: MembroJson[] }> {
  const criado = await post("/projetos", documentario);
  const id = criado.json().id as string;
  const equipe = await post(`/projetos/${id}/recomendar`);
  expect(equipe.statusCode).toBe(200);
  return { id, membros: equipe.json().membros };
}

const membroDe = (membros: MembroJson[], papel: string) => membros.find((m) => m.papel === papel);

async function equipeAtual(id: string) {
  const resposta = await app.inject({ method: "GET", url: `/projetos/${id}/equipe` });
  expect(resposta.statusCode).toBe(200);
  return resposta.json() as { status: string; membros: MembroJson[] };
}

async function convidar(id: string, membro: MembroJson): Promise<string> {
  const resposta = await post(`/projetos/${id}/equipe/aceitar`, { papel: membro.papel, profissionalId: membro.profissional.id });
  expect(resposta.statusCode).toBe(201);
  return resposta.json().conviteId;
}

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation((mensagem: unknown) => {
    linhas.push(String(mensagem));
  });
  linhas = [];
  formadas = [];
  ds = (await prepararBancoDeTestes()).ds;
  reservaId = await criarDiretorReserva();
  const barramento = new BarramentoEmMemoria();
  barramento.assinar(TOPICO_EQUIPE_FORMADA, (payload) => formadas.push(payload));
  app = criarApp(new ServicoProjetos(ds, montarSistema(barramento)));
});

beforeEach(() => {
  linhas = [];
  formadas = [];
});

afterAll(async () => {
  await app.close();
  await ds.destroy();
  jest.restoreAllMocks();
});

describe("aceitar a recomendacao (o produtor convida)", () => {
  it("cria o convite PENDENTE, persiste e avisa o profissional", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    expect(diretor.situacao).toBe("PROPOSTO");

    const conviteId = await convidar(id, diretor);

    const convite = await ds.getRepository(Convite).findOneByOrFail({ id: conviteId });
    expect(convite.status).toBe(StatusConvite.PENDENTE);
    expect(membroDe((await equipeAtual(id)).membros, "DIRETOR")).toMatchObject({ situacao: "PENDENTE", conviteId });
    expect(linhas.some((l) => l.startsWith(`[EMAIL] Para ${diretor.profissional.nome}`) && l.includes("convite"))).toBe(true);
  });

  it("recusa convidar duas vezes, convidar quem nao foi proposto e projeto sem equipe", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    const editor = membroDe(membros, "EDITOR")!;
    await convidar(id, diretor);

    const repetido = await post(`/projetos/${id}/equipe/aceitar`, { papel: "DIRETOR", profissionalId: diretor.profissional.id });
    const errado = await post(`/projetos/${id}/equipe/aceitar`, { papel: "DIRETOR", profissionalId: editor.profissional.id });
    const semEquipe = await post(`/projetos/${(await post("/projetos", documentario)).json().id}/equipe/aceitar`, {
      papel: "DIRETOR",
      profissionalId: diretor.profissional.id
    });
    const inexistente = await post("/projetos/11111111-1111-4111-8111-111111111111/equipe/aceitar", {
      papel: "DIRETOR",
      profissionalId: diretor.profissional.id
    });

    expect(repetido.statusCode).toBe(409);
    expect(errado.statusCode).toBe(409);
    expect(semEquipe.statusCode).toBe(409);
    expect(inexistente.statusCode).toBe(404);
  });

  it("nao permite recomendar de novo depois que ha convites em andamento", async () => {
    const { id, membros } = await novaEquipe();
    await convidar(id, membroDe(membros, "DIRETOR")!);

    expect((await post(`/projetos/${id}/recomendar`)).statusCode).toBe(409);
  });
});

describe("resposta do profissional ao convite", () => {
  it("aceitar confirma o membro e avisa o produtor; responder de novo da 409", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    const conviteId = await convidar(id, diretor);
    linhas.length = 0;

    const resposta = await post(`/convites/${conviteId}/responder`, { aceito: true });

    expect(resposta.json()).toEqual({ conviteId, status: "ACEITO", equipeFormada: false });
    expect(membroDe((await equipeAtual(id)).membros, "DIRETOR")).toMatchObject({ situacao: "CONFIRMADO" });
    expect(linhas.some((l) => l.startsWith("[EMAIL] Para o produtor") && l.includes("aceitou"))).toBe(true);
    expect((await post(`/convites/${conviteId}/responder`, { aceito: true })).statusCode).toBe(409);
    expect((await post("/convites/11111111-1111-4111-8111-111111111111/responder", { aceito: true })).statusCode).toBe(404);
  });

  it("recusar avisa o produtor e deixa o membro sem confirmacao", async () => {
    const { id, membros } = await novaEquipe();
    const conviteId = await convidar(id, membroDe(membros, "EDITOR")!);
    linhas.length = 0;

    const resposta = await post(`/convites/${conviteId}/responder`, { aceito: false });

    expect(resposta.json().status).toBe("RECUSADO");
    expect(membroDe((await equipeAtual(id)).membros, "EDITOR")).toMatchObject({ situacao: "RECUSADO" });
    expect(linhas.some((l) => l.startsWith("[EMAIL] Para o produtor") && l.includes("recusou"))).toBe(true);
  });

  it("quando todos os papeis confirmam, a equipe e' formada e os outros microsservicos sao avisados", async () => {
    const { id, membros } = await novaEquipe();
    const respostas: boolean[] = [];

    for (const membro of membros) {
      const conviteId = await convidar(id, membro);
      respostas.push((await post(`/convites/${conviteId}/responder`, { aceito: true })).json().equipeFormada);
    }

    expect(membros).toHaveLength(5);
    expect(respostas).toEqual([false, false, false, false, true]);
    const equipe = await equipeAtual(id);
    expect(equipe.status).toBe("FORMADA");
    expect(equipe.membros.every((m) => m.situacao === "CONFIRMADO")).toBe(true);
    const gravada = await ds.getRepository(Equipe).findOneByOrFail({ projeto: { id } });
    expect(gravada.status).toBe(StatusEquipe.FORMADA);
    expect(gravada.formadaEm).not.toBeNull();
    expect(formadas).toHaveLength(1);
    expect(formadas[0]).toMatchObject({ projetoId: id, tipoCaptacao: "DOCUMENTARIO", orcamentoTotal: 60000 });
    expect(formadas[0].membros).toHaveLength(5);
    expect(linhas.some((l) => l.startsWith("[GERENCIAMENTO_PROJETOS]"))).toBe(true);
    expect(linhas.some((l) => l.startsWith("[FINANCEIRO]"))).toBe(true);
    expect(linhas.some((l) => l.startsWith("[AUDITORIA]") && l.includes("equipe_formada"))).toBe(true);
  });
});

describe("substituir um membro (nova rodada so' para o papel afetado)", () => {
  it("cancela o convite, tira o dispensado e propoe outro apenas para esse papel", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    const conviteId = await convidar(id, diretor);
    linhas.length = 0;

    const resposta = await post(`/projetos/${id}/equipe/substituir`, { papel: "DIRETOR", profissionalId: diretor.profissional.id });

    expect(resposta.statusCode).toBe(200);
    const novos = resposta.json().membros as MembroJson[];
    expect(membroDe(novos, "DIRETOR")!.profissional.id).toBe(reservaId);
    expect(membroDe(novos, "DIRETOR")!.situacao).toBe("PROPOSTO");
    for (const m of membros.filter((x) => x.papel !== "DIRETOR")) {
      expect(membroDe(novos, m.papel)!.profissional.id).toBe(m.profissional.id);
    }
    expect((await ds.getRepository(Convite).findOneByOrFail({ id: conviteId })).status).toBe(StatusConvite.CANCELADO);
    expect((await post(`/convites/${conviteId}/responder`, { aceito: true })).statusCode).toBe(409);
    const recomendacoes = linhas.filter((l) => l.startsWith("[EMAIL] Nova recomendacao"));
    expect(recomendacoes).toHaveLength(1);
    expect(recomendacoes[0]).toContain("DIRETOR");
    expect(linhas.some((l) => l.startsWith(`[EMAIL] Para ${diretor.profissional.nome}`) && l.includes("optou por outro"))).toBe(true);
    const projeto = await ds.getRepository(Projeto).findOneByOrFail({ id });
    expect(projeto.rejeitados).toEqual([{ papel: "DIRETOR", profissionalId: diretor.profissional.id }]);
  });

  it("quem foi dispensado num papel nao volta a ser sugerido para ele", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    await post(`/projetos/${id}/equipe/substituir`, { papel: "DIRETOR", profissionalId: diretor.profissional.id });

    const segunda = await post(`/projetos/${id}/equipe/substituir`, { papel: "DIRETOR", profissionalId: reservaId });

    const aindaDiretor = membroDe(segunda.json().membros, "DIRETOR");
    expect(aindaDiretor?.profissional.id ?? null).not.toBe(diretor.profissional.id);
    expect(aindaDiretor?.profissional.id ?? null).not.toBe(reservaId);
  });

  it("nao substitui membro que ja confirmou, nem quem nao e' o proposto", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    await post(`/convites/${await convidar(id, diretor)}/responder`, { aceito: true });

    const confirmado = await post(`/projetos/${id}/equipe/substituir`, { papel: "DIRETOR", profissionalId: diretor.profissional.id });
    const errado = await post(`/projetos/${id}/equipe/substituir`, { papel: "EDITOR", profissionalId: diretor.profissional.id });

    expect(confirmado.statusCode).toBe(409);
    expect(errado.statusCode).toBe(409);
  });
});

describe("reavaliacao", () => {
  it("mantem quem confirmou, cancela convites pendentes e refaz o resto com o orcamento novo", async () => {
    const { id, membros } = await novaEquipe();
    const diretor = membroDe(membros, "DIRETOR")!;
    const editor = membroDe(membros, "EDITOR")!;
    await post(`/convites/${await convidar(id, diretor)}/responder`, { aceito: true });
    const conviteEditor = await convidar(id, editor);

    const resposta = await post(`/projetos/${id}/reavaliar`, { orcamentoTotal: 75000 });

    expect(resposta.statusCode).toBe(200);
    const novos = resposta.json().membros as MembroJson[];
    expect(membroDe(novos, "DIRETOR")).toMatchObject({ situacao: "CONFIRMADO" });
    expect(membroDe(novos, "EDITOR")).toMatchObject({ situacao: "PROPOSTO", conviteId: null });
    expect(novos).toHaveLength(membros.length);
    expect((await ds.getRepository(Convite).findOneByOrFail({ id: conviteEditor })).status).toBe(StatusConvite.CANCELADO);
    expect(Number((await ds.getRepository(Projeto).findOneByOrFail({ id })).orcamentoTotal)).toBe(75000);
  });

  it("responde 404 para projeto inexistente e 409 sem equipe", async () => {
    const semEquipe = (await post("/projetos", documentario)).json().id;

    expect((await post("/projetos/11111111-1111-4111-8111-111111111111/reavaliar")).statusCode).toBe(404);
    expect((await post(`/projetos/${semEquipe}/reavaliar`)).statusCode).toBe(409);
  });

  it("projeto invalido apos o ajuste de orcamento e' recusado e nada e' gravado", async () => {
    const { id } = await novaEquipe();

    const resposta = await post(`/projetos/${id}/reavaliar`, { orcamentoTotal: 0 });

    expect(resposta.statusCode).toBe(422);
    expect(Number((await ds.getRepository(Projeto).findOneByOrFail({ id })).orcamentoTotal)).toBe(60000);
  });
});
