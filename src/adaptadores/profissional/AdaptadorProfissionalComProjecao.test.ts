import { AdaptadorProfissionalComProjecao } from "./AdaptadorProfissionalComProjecao";
import { AdaptadorProfissional } from "./AdaptadorProfissional";
import { criarProfissionalExterno } from "./profissionalExterno";
import { StatusConvite } from "../../domain/enums/StatusConvite";

const base = { email: "x@x.com", especialidades: ["Direção"], precoBaseDiaria: 1000, localizacao: "SP" };
const ana = () => criarProfissionalExterno({ id: "p1", nome: "Ana", ...base });
const bruno = () => criarProfissionalExterno({ id: "p2", nome: "Bruno", ...base });

function montar(linhasConvites: unknown[] = []) {
  const upsert = jest.fn().mockResolvedValue(undefined);
  const query = jest.fn().mockResolvedValue(linhasConvites);
  const dataSource = { getRepository: jest.fn(() => ({ upsert })), query };
  const remoto: jest.Mocked<AdaptadorProfissional> = {
    listarProfissionais: jest.fn(),
    detalharProfissional: jest.fn(),
    registrarAvaliacao: jest.fn().mockResolvedValue(undefined)
  };
  return { upsert, query, dataSource, remoto, adaptador: new AdaptadorProfissionalComProjecao(remoto, dataSource as never) };
}

describe("AdaptadorProfissionalComProjecao", () => {
  it("grava a projecao local (upsert por id) dos profissionais listados", async () => {
    const { upsert, remoto, adaptador } = montar();
    remoto.listarProfissionais.mockResolvedValue([ana(), bruno()]);

    const lista = await adaptador.listarProfissionais({ papeis: [] });

    expect(lista.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(upsert).toHaveBeenCalledTimes(1);
    const [linhas, chaves] = upsert.mock.calls[0];
    expect(chaves).toEqual(["id"]);
    expect(linhas.map((l: { id: string }) => l.id)).toEqual(["p1", "p2"]);
    expect(Object.keys(linhas[0]).sort()).toEqual(["disponibilidade", "email", "especialidades", "id", "localizacao", "nome", "precoBaseDiaria"]);
  });

  it("anexa aos profissionais os convites do historico (com o genero do projeto)", async () => {
    const { query, remoto, adaptador } = montar([
      { id: "c1", profissional_id: "p1", projeto_id: "pr1", papel: "DIRETOR", status: StatusConvite.ACEITO, enviadoEm: "2026-02-01T00:00:00Z", projeto_genero: "Documentário" },
      { id: "c2", profissional_id: "p1", projeto_id: "pr2", papel: "EDITOR", status: StatusConvite.RECUSADO, enviadoEm: null, projeto_genero: null },
      { id: "c3", profissional_id: "desconhecido", projeto_id: "pr3", papel: "EDITOR", status: StatusConvite.ACEITO, enviadoEm: null, projeto_genero: "X" }
    ]);
    remoto.listarProfissionais.mockResolvedValue([ana(), bruno()]);

    const [p1, p2] = await adaptador.listarProfissionais({});

    expect(query.mock.calls[0][1]).toEqual([["p1", "p2"]]);
    expect(p1.convites.map((c) => [c.id, c.status, c.projeto.genero])).toEqual([
      ["c1", StatusConvite.ACEITO, "Documentário"],
      ["c2", StatusConvite.RECUSADO, ""]
    ]);
    expect(p1.convites[0].enviadoEm).toEqual(new Date("2026-02-01T00:00:00Z"));
    expect(p1.convites[0].profissional).toBe(p1);
    expect(p2.convites).toEqual([]);
  });

  it("lista vazia nao toca no banco", async () => {
    const { upsert, query, remoto, adaptador } = montar();
    remoto.listarProfissionais.mockResolvedValue([]);
    expect(await adaptador.listarProfissionais({})).toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("detalhar projeta o profissional encontrado e ignora o nao encontrado", async () => {
    const { upsert, remoto, adaptador } = montar();
    remoto.detalharProfissional.mockResolvedValueOnce(ana()).mockResolvedValueOnce(null);

    expect((await adaptador.detalharProfissional("p1"))?.id).toBe("p1");
    expect(await adaptador.detalharProfissional("zz")).toBeNull();
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("avaliacao e' delegada ao cadastro remoto", async () => {
    const { remoto, adaptador } = montar();
    await adaptador.registrarAvaliacao("p1", { nota: 9 });
    expect(remoto.registrarAvaliacao).toHaveBeenCalledWith("p1", { nota: 9 });
  });
});
