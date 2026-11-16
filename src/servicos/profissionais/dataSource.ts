import { DataSource, DataSourceOptions } from "typeorm";
import { AppDataSource } from "../../config/data-source";

/**
 * Banco do cinebridge-profissionais (PROFISSIONAIS_DB_*; padrao: profissionais-db do compose em localhost:5432).
 * Reaproveita as entidades da api, que sao compartilhadas: as tabelas fora do dominio ficam vazias.
 */
export function criarDataSourceProfissionais(env: NodeJS.ProcessEnv = process.env): DataSource {
  return new DataSource({
    ...AppDataSource.options,
    host: env.PROFISSIONAIS_DB_HOST ?? "localhost",
    port: Number(env.PROFISSIONAIS_DB_PORT ?? 5432),
    database: env.PROFISSIONAIS_DB_NAME ?? "profissionais"
  } as DataSourceOptions);
}
