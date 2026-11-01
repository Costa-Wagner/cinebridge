import { DataSource } from "typeorm";
import { AdaptadorProfissional, AvaliacaoInvalidaError } from "./AdaptadorProfissional";
import { AdaptadorInterno } from "./AdaptadorInterno";
import { AdaptadorLinkedIn } from "./AdaptadorLinkedIn";
import { AdaptadorIndeed } from "./AdaptadorIndeed";
import { CatalogoProfissionais } from "../../aplicacao/CatalogoProfissionais";
import { ApiProfissionalExterna } from "../externos/ApiProfissionalExterna";
import { PortalEmpregoSimulado } from "../externos/PortalEmpregoSimulado";
import { Profissional } from "../../domain/entities/Profissional";
import { Avaliacao } from "../../domain/entities/Avaliacao";
import { Papel } from "../../domain/enums/Papel";

const ana = { id: "1", nome: "Ana" } as Profissional;

function interno() {
  const insert = jest.fn(async () => undefined);
  const catalogo = {
    listar: jest.fn(async () => [ana]),
    preSelecionar: jest.fn(async () => [ana]),
    invalidar: jest.fn()
  };
  const ds = { getRepository: jest.fn(() => ({ insert })) } as unknown as DataSource;
  return { adaptador: new AdaptadorInterno(catalogo as unknown as CatalogoProfissionais, ds), catalogo, insert, ds };
}

describe("AdaptadorInterno", () => {
  it("usa a pre-selecao do catalogo quando ha papeis (com ou sem limite)", async () => {
    const { adaptador, catalogo } = interno();
    await adaptador.listarProfissionais({ papeis: [Papel.DIRETOR] });
    await adaptador.listarProfissionais({ papeis: [Papel.EDITOR], limitePorPapel: 5 });
    expect(catalogo.preSelecionar).toHaveBeenNthCalledWith(1, [Papel.DIRETOR]);
    expect(catalogo.preSelecionar).toHaveBeenNthCalledWith(2, [Papel.EDITOR], 5);
  });

  it("lista o catalogo inteiro sem papeis e detalha por id", async () => {
    const { adaptador } = interno();
    expect(await adaptador.listarProfissionais({})).toEqual([ana]);
    expect(await adaptador.listarProfissionais({ papeis: [] })).toEqual([ana]);
    expect(await adaptador.detalharProfissional("1")).toBe(ana);
    expect(await adaptador.detalharProfissional("9")).toBeNull();
  });

  it("grava a avaliacao e invalida o cache; recusa nota invalida", async () => {
    const { adaptador, insert, catalogo, ds } = interno();
    await adaptador.registrarAvaliacao("1", { nota: 8.5, comentario: "otimo" });
    expect(ds.getRepository).toHaveBeenCalledWith(Avaliacao);
    expect(insert).toHaveBeenCalledWith({ nota: 8.5, comentario: "otimo", profissional: { id: "1" } });
    expect(catalogo.invalidar).toHaveBeenCalled();
    await expect(adaptador.registrarAvaliacao("1", { nota: 10 })).rejects.toThrow(AvaliacaoInvalidaError);
  });
});

const registro = (id: string, funcoes: string[]) => ({
  id, nomeCompleto: `Pessoa ${id}`, emailContato: `${id}@x.com`, funcoes, habilidades: ["Edicao"], valorDiaria: 500, cidade: "Santos"
});
const candidato = (id: string, roles: string[]) => ({
  candidateId: id, fullName: `Pessoa ${id}`, mail: `${id}@x.com`, roles, skills: ["Edicao"], dailyRate: 500, city: "Santos"
});

const externos: Array<[string, string, () => AdaptadorProfissional, () => number[] | undefined]> = (() => {
  const api = new ApiProfissionalExterna([registro("a", ["EDITOR"]), registro("b", ["DIRETOR"]), registro("c", ["EDITOR"])]);
  const portal = new PortalEmpregoSimulado([candidato("a", ["EDITOR"]), candidato("b", ["DIRETOR"]), candidato("c", ["EDITOR"])]);
  return [
    ["LinkedIn", "linkedin:", () => new AdaptadorLinkedIn(api), () => api.avaliacoes.get("a")],
    ["Indeed", "indeed:", () => new AdaptadorIndeed(portal), () => portal.estrelas.get("a")]
  ];
})();

describe.each(externos)("AdaptadorProfissional externo: %s", (_nome, prefixo, criar, avaliacoesDeA) => {
  it("traduz o formato do provedor para Profissional do dominio", async () => {
    const [p] = await criar().listarProfissionais({ papeis: [Papel.EDITOR] });
    expect(p).toBeInstanceOf(Profissional);
    expect(p).toMatchObject({ id: `${prefixo}a`, nome: "Pessoa a", email: "a@x.com", precoBaseDiaria: 500, localizacao: "Santos" });
    expect(p.especialidades).toEqual(["Edicao"]);
  });

  it("filtra por papel, aplica limite e lista tudo sem criterios", async () => {
    const a = criar();
    expect(await a.listarProfissionais({ papeis: [Papel.EDITOR] })).toHaveLength(2);
    expect(await a.listarProfissionais({ papeis: [Papel.EDITOR], limitePorPapel: 1 })).toHaveLength(1);
    expect(await a.listarProfissionais({})).toHaveLength(3);
  });

  it("detalha com ou sem prefixo e devolve null se nao existe", async () => {
    const a = criar();
    expect((await a.detalharProfissional(`${prefixo}b`))?.nome).toBe("Pessoa b");
    expect((await a.detalharProfissional("b"))?.nome).toBe("Pessoa b");
    expect(await a.detalharProfissional("zzz")).toBeNull();
  });

  it("registra avaliacao no provedor e recusa nota invalida", async () => {
    const a = criar();
    await a.registrarAvaliacao(`${prefixo}a`, { nota: 8 });
    expect(avaliacoesDeA()).toHaveLength(1);
    await expect(a.registrarAvaliacao("a", { nota: -1 })).rejects.toThrow(AvaliacaoInvalidaError);
  });
});
