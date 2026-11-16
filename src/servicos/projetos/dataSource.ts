import { DataSource } from "typeorm";
import { criarDataSourceDoServico } from "../comum/dataSource";
import { RegistroProjeto } from "./RegistroProjeto";

/** Banco proprio do cinebridge-projetos (PROJETOS_DB_*; padrao: projetos-db do compose em localhost:5433). */
export function criarDataSourceProjetos(env: NodeJS.ProcessEnv = process.env, database?: string): DataSource {
  return criarDataSourceDoServico({ prefixo: "PROJETOS", portaPadrao: 5433, bancoPadrao: "projetos", entities: [RegistroProjeto] }, env, database);
}
