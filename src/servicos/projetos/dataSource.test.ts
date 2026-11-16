import { getMetadataArgsStorage } from "typeorm";
import { criarDataSourceProjetos } from "./dataSource";
import { RegistroProjeto } from "./RegistroProjeto";

describe("criarDataSourceProjetos", () => {
  it("usa o projetos-db local por padrao, com so' a entidade do servico", () => {
    const opcoes = criarDataSourceProjetos({}).options as unknown as Record<string, unknown>;
    expect(opcoes).toMatchObject({ host: "localhost", port: 5433, database: "projetos", username: "postgres", entities: [RegistroProjeto] });
  });

  it("le PROJETOS_DB_* e aceita um nome de banco explicito", () => {
    const env = { PROJETOS_DB_HOST: "projetos-db", PROJETOS_DB_PORT: "5432", PROJETOS_DB_NAME: "outro", DB_USER: "u", DB_PASSWORD: "s" };
    expect(criarDataSourceProjetos(env).options).toMatchObject({ host: "projetos-db", port: 5432, database: "outro", username: "u", password: "s" });
    expect(criarDataSourceProjetos(env, "teste").options).toMatchObject({ database: "teste" });
  });

  it("o transformador de decimal converte texto do banco em numero, preservando null", () => {
    const coluna = getMetadataArgsStorage().columns.find((c) => c.target === RegistroProjeto && c.propertyName === "orcamentoTotal");
    const transformador = (coluna!.options as { transformer: { to: (v: unknown) => unknown; from: (v: unknown) => unknown } }).transformer;
    expect(transformador.from("1500.50")).toBe(1500.5);
    expect(transformador.from(null)).toBeNull();
    expect(transformador.to(7)).toBe(7);
  });
});
