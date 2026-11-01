import { DataSource } from "typeorm";
import { CatalogoProfissionais, LIMITE_PRESELECAO } from "./CatalogoProfissionais";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Papel } from "../domain/enums/Papel";

/** Linhas "cruas" como o banco as devolve (colunas simple-array e jsonb podem vir em formatos diferentes). */
const PROFISSIONAIS = [
  {
    id: "1", nome: "Ana", email: "ana@x.com", especialidades: "Direção,Roteiro", precoBaseDiaria: "1500.00",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }], localizacao: "SP"
  },
  {
    id: "2", nome: "Bruno", email: "bruno@x.com", especialidades: ["Edição"], precoBaseDiaria: "900.00",
    disponibilidade: '[{"inicio":"2026-03-01","fim":"2026-06-30"}]', localizacao: "RJ"
  },
  { id: "3", nome: "Carla", email: "carla@x.com", especialidades: "", precoBaseDiaria: "700.00", disponibilidade: "nao-e-json", localizacao: "MG" },
  { id: "4", nome: "Dani", email: "dani@x.com", especialidades: null, precoBaseDiaria: "800.00", disponibilidade: null, localizacao: "BA" },
  { id: "5", nome: "Edu", email: "edu@x.com", especialidades: ["Som"], precoBaseDiaria: "600.00", disponibilidade: 42, localizacao: "PR" }
];
const VINCULOS = [
  { id: "v1", profissional_id: "1", competencia_id: "c1", nivel: "9.00", competencia_nome: "Direção" },
  { id: "v2", profissional_id: "1", competencia_id: "c2", nivel: "8.50", competencia_nome: "Liderança" },
  { id: "v3", profissional_id: "2", competencia_id: "c1", nivel: "6.00", competencia_nome: "Direção" },
  { id: "v9", profissional_id: "fantasma", competencia_id: "c1", nivel: "1.00", competencia_nome: "Direção" }
];
const AVALIACOES = [
  { id: "a1", profissional_id: "1", nota: "9.50", comentario: "ótima", criadoEm: "2026-05-01T10:00:00Z" },
  { id: "a2", profissional_id: "1", nota: "8.00", comentario: null, criadoEm: null },
  { id: "a9", profissional_id: "fantasma", nota: "1.00", comentario: null, criadoEm: null }
];
const CONVITES = [
  { id: "cv1", profissional_id: "2", projeto_id: "p1", papel: "EDITOR", status: "ACEITO", enviadoEm: "2026-04-01T09:00:00Z", projeto_genero: "Drama" },
  { id: "cv2", profissional_id: "2", projeto_id: "p2", papel: "EDITOR", status: "PENDENTE", enviadoEm: null, projeto_genero: null },
  { id: "cv9", profissional_id: "fantasma", projeto_id: "p3", papel: "EDITOR", status: "ACEITO", enviadoEm: null, projeto_genero: "Drama" }
];

function montar(opcoes: { falhar?: boolean } = {}) {
  const query = jest.fn(async (sql: string) => {
    if (opcoes.falhar) throw new Error("banco fora do ar");
    if (sql.includes("profissional_competencias")) return VINCULOS;
    if (sql.includes("FROM avaliacoes")) return AVALIACOES;
    if (sql.includes("FROM convites")) return CONVITES;
    return PROFISSIONAIS;
  });
  const dataSource = { query } as unknown as DataSource;
  let agora = 1_000;
  const catalogo = new CatalogoProfissionais(dataSource, 60_000, () => agora);
  return { catalogo, query, avancar: (ms: number) => (agora += ms) };
}

const cargas = (query: jest.Mock) => query.mock.calls.filter(([sql]) => String(sql).includes("FROM profissionais")).length;

describe("CatalogoProfissionais: carga", () => {
  it("monta cada profissional com competencias, avaliacoes e convites, convertendo os tipos", async () => {
    const [ana, bruno] = await montar().catalogo.listar();

    expect(ana.precoBaseDiaria).toBe(1500);
    expect(ana.especialidades).toEqual(["Direção", "Roteiro"]);
    expect(ana.competencias.map((c) => [c.competencia.nome, c.nivel])).toEqual([["Direção", 9], ["Liderança", 8.5]]);
    expect(ana.avaliacoes.map((a) => [a.nota, a.comentario])).toEqual([[9.5, "ótima"], [8, undefined]]);
    expect(ana.avaliacoes[0].criadoEm).toEqual(new Date("2026-05-01T10:00:00Z"));
    expect(ana.avaliacoes[1].criadoEm).toBeInstanceOf(Date);
    expect(bruno.convites.map((c) => [c.status, c.projeto.genero])).toEqual([[StatusConvite.ACEITO, "Drama"], [StatusConvite.PENDENTE, ""]]);
    expect(bruno.convites[0].enviadoEm).toEqual(new Date("2026-04-01T09:00:00Z"));
    expect(bruno.convites[1].enviadoEm).toBeInstanceOf(Date);
  });

  it("aceita os formatos de simple-array e jsonb que o driver pode devolver", async () => {
    const todos = await montar().catalogo.listar();
    const [ana, bruno, carla, dani, edu] = todos;

    expect(bruno.especialidades).toEqual(["Edição"]);
    expect(carla.especialidades).toEqual([]);
    expect(dani.especialidades).toEqual([]);
    expect(ana.disponibilidade).toEqual([{ inicio: "2026-01-01", fim: "2026-12-31" }]);
    expect(bruno.disponibilidade).toEqual([{ inicio: "2026-03-01", fim: "2026-06-30" }]);
    expect([carla, dani, edu].map((p) => p.disponibilidade)).toEqual([[], [], []]);
  });

  it("ignora linhas de competencia, avaliacao e convite de profissional inexistente", async () => {
    const todos = await montar().catalogo.listar();

    expect(todos).toHaveLength(5);
    expect(todos.flatMap((p) => p.competencias)).toHaveLength(3);
    expect(todos.flatMap((p) => p.avaliacoes)).toHaveLength(2);
    expect(todos.flatMap((p) => p.convites)).toHaveLength(2);
  });
});

describe("CatalogoProfissionais: cache", () => {
  it("le o banco uma vez enquanto o cadastro vale e recarrega depois que expira", async () => {
    const { catalogo, query, avancar } = montar();

    await catalogo.listar();
    avancar(59_000);
    await catalogo.listar();
    expect(cargas(query)).toBe(1);

    avancar(1_000);
    await catalogo.listar();
    expect(cargas(query)).toBe(2);
  });

  it("requisicoes simultaneas compartilham uma unica carga", async () => {
    const { catalogo, query } = montar();

    const [a, b, c] = await Promise.all([catalogo.listar(), catalogo.listar(), catalogo.preSelecionar([Papel.DIRETOR]).then(() => catalogo.listar())]);

    expect(cargas(query)).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("invalidar forca nova leitura, e recarregar o faz na hora", async () => {
    const { catalogo, query } = montar();
    await catalogo.listar();

    catalogo.invalidar();
    await catalogo.listar();
    expect(cargas(query)).toBe(2);

    await catalogo.recarregar();
    expect(cargas(query)).toBe(3);
  });

  it("uma carga que estava em andamento durante invalidar nao repovoa o cache com dados antigos", async () => {
    const { catalogo, query } = montar();

    const antiga = catalogo.listar(); // carga em andamento
    catalogo.invalidar(); // convites mudaram antes de ela terminar
    await antiga;
    await catalogo.listar(); // quem chega depois nao pode receber o resultado da carga antiga

    expect(cargas(query)).toBe(2);
  });

  it("falha na carga chega a quem esperava e a proxima consulta tenta de novo", async () => {
    const { catalogo, query } = montar({ falhar: true });

    await expect(Promise.all([catalogo.listar(), catalogo.listar()])).rejects.toThrow("banco fora do ar");
    await expect(catalogo.listar()).rejects.toThrow("banco fora do ar");

    expect(query.mock.calls.filter(([sql]) => String(sql).includes("FROM profissionais")).length).toBe(2);
  });

  it("usa o relogio e o prazo padrao quando nao informados", async () => {
    const dataSource = { query: async () => [] } as unknown as DataSource;
    const catalogo = new CatalogoProfissionais(dataSource);

    expect(await catalogo.listar()).toEqual([]);
    expect(await catalogo.listar()).toEqual([]);
  });
});

describe("CatalogoProfissionais.preSelecionar (geracao de candidatos por aderencia ao papel)", () => {
  it("ordena os elegiveis pelo cosseno com o perfil do papel", async () => {
    const lista = await montar().catalogo.preSelecionar([Papel.DIRETOR]);

    expect(lista.map((p) => p.nome)).toEqual(["Ana", "Bruno"]);
  });

  it("limita a quantidade por papel e entrega so' os mais aderentes", async () => {
    const lista = await montar().catalogo.preSelecionar([Papel.DIRETOR], 1);

    expect(lista.map((p) => p.nome)).toEqual(["Ana"]);
  });

  it("junta varios papeis sem repetir profissional e ignora papel sem elegiveis", async () => {
    const { catalogo } = montar();

    expect((await catalogo.preSelecionar([Papel.DIRETOR, Papel.DIRETOR, Papel.SONOPLASTA])).map((p) => p.nome)).toEqual(["Ana", "Bruno"]);
    expect(await catalogo.preSelecionar([Papel.SONOPLASTA])).toEqual([]);
  });

  it("monta o indice uma vez por carga e o refaz depois de invalidar", async () => {
    const { catalogo, query } = montar();

    await catalogo.preSelecionar([Papel.DIRETOR]);
    await catalogo.preSelecionar([Papel.EDITOR]);
    expect(cargas(query)).toBe(1);

    catalogo.invalidar();
    await catalogo.preSelecionar([Papel.DIRETOR]);
    expect(cargas(query)).toBe(2);
  });

  it("o limite padrao por papel e' o configurado", () => {
    expect(LIMITE_PRESELECAO).toBe(30);
  });
});
