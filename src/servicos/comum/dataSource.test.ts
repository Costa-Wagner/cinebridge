import { criarDataSourceDoServico } from "./dataSource";
import { criarDataSourceNotificacoes } from "../notificacoes/dataSource";
import { criarDataSourceProfissionais } from "../profissionais/dataSource";
import { Notificacao } from "../notificacoes/Notificacao";

describe("DataSources dos servicos", () => {
  const opcoes = { prefixo: "SVC", portaPadrao: 6000, bancoPadrao: "svc", entities: [Notificacao] };

  it("padroes: localhost, porta e banco do servico, credenciais padrao", () => {
    expect(criarDataSourceDoServico(opcoes, {}).options).toMatchObject({ host: "localhost", port: 6000, database: "svc", username: "postgres", password: "postgres", synchronize: true, entities: [Notificacao] });
  });

  it("le <PREFIXO>_DB_* e DB_USER/DB_PASSWORD; o banco pode ser informado explicitamente", () => {
    const env = { SVC_DB_HOST: "h", SVC_DB_PORT: "1", SVC_DB_NAME: "n", DB_USER: "u", DB_PASSWORD: "s" };
    expect(criarDataSourceDoServico(opcoes, env).options).toMatchObject({ host: "h", port: 1, database: "n", username: "u", password: "s" });
    expect(criarDataSourceDoServico(opcoes, env, "teste").options).toMatchObject({ database: "teste" });
  });

  it("notificacoes usa o notificacoes-db (5435) e so' a sua entidade", () => {
    expect(criarDataSourceNotificacoes({}).options).toMatchObject({ port: 5435, database: "notificacoes", entities: [Notificacao] });
    expect(criarDataSourceNotificacoes({ NOTIFICACOES_DB_HOST: "notificacoes-db", NOTIFICACOES_DB_PORT: "5432" }).options).toMatchObject({ host: "notificacoes-db", port: 5432 });
  });

  it("profissionais usa o profissionais-db (5432) com as entidades compartilhadas da api", () => {
    const padrao = criarDataSourceProfissionais({}).options as unknown as { entities: unknown[] };
    expect(padrao).toMatchObject({ host: "localhost", port: 5432, database: "profissionais" });
    expect(padrao.entities.length).toBeGreaterThan(5);
    expect(criarDataSourceProfissionais({ PROFISSIONAIS_DB_HOST: "profissionais-db", PROFISSIONAIS_DB_PORT: "5433", PROFISSIONAIS_DB_NAME: "x" }).options).toMatchObject({ host: "profissionais-db", port: 5433, database: "x" });
  });
});
