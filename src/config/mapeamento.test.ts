import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "./data-source";

describe("mapeamento TypeORM (sem banco)", () => {
  it("projetos usam tabela unica com os campos de cada subclasse", async () => {
    const ds = new DataSource({ ...(AppDataSource.options as object), type: "postgres" } as any);
    await (ds as any).buildMetadatas();

    const colunas = (nome: string) =>
      ds.entityMetadatas.find((m) => m.name === nome)!.columns.map((c) => c.propertyName);

    expect(colunas("ProjetoDocumentario")).toEqual(expect.arrayContaining(["tema", "entrevistados", "genero", "tipoCaptacao"]));
    expect(colunas("ProjetoAnimacao")).toEqual(expect.arrayContaining(["softwareModelagem", "metricasRenderizacao"]));
    expect(colunas("ProjetoPublicitario")).toEqual(expect.arrayContaining(["cliente", "canal"]));
    const tabelas = new Set(
      ["ProjetoDocumentario", "ProjetoAnimacao", "ProjetoPublicitario", "Projeto"].map(
        (n) => ds.entityMetadatas.find((m) => m.name === n)!.tableName
      )
    );
    expect([...tabelas]).toEqual(["projetos"]);
  });
});
