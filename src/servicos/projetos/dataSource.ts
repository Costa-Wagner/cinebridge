import "reflect-metadata";
import { DataSource } from "typeorm";
import { RegistroProjeto } from "./RegistroProjeto";

/**
 * Banco proprio do cinebridge-projetos (so' a sua entidade). Variaveis PROJETOS_DB_*
 * para nao colidir com o banco da api quando os dois rodam na mesma maquina.
 */
export function criarDataSourceProjetos(env: NodeJS.ProcessEnv = process.env, database?: string): DataSource {
  return new DataSource({
    type: "postgres",
    host: env.PROJETOS_DB_HOST ?? "localhost",
    port: Number(env.PROJETOS_DB_PORT ?? 5433),
    username: env.DB_USER ?? "postgres",
    password: env.DB_PASSWORD ?? "postgres",
    database: database ?? env.PROJETOS_DB_NAME ?? "projetos",
    synchronize: true,
    entities: [RegistroProjeto]
  });
}
