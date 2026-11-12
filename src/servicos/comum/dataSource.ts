import "reflect-metadata";
import { DataSource } from "typeorm";

export interface OpcoesDataSourceServico {
  /** Prefixo das variaveis de ambiente: PROJETOS -> PROJETOS_DB_HOST, PROJETOS_DB_PORT, PROJETOS_DB_NAME. */
  prefixo: string;
  portaPadrao: number;
  bancoPadrao: string;
  entities: Function[];
}

/**
 * Banco proprio de um servico (so' as suas entidades). As variaveis <PREFIXO>_DB_* evitam colidir
 * com o banco da api quando os processos rodam na mesma maquina; usuario e senha vem de DB_USER/DB_PASSWORD.
 */
export function criarDataSourceDoServico(opcoes: OpcoesDataSourceServico, env: NodeJS.ProcessEnv = process.env, database?: string): DataSource {
  const { prefixo } = opcoes;
  return new DataSource({
    type: "postgres",
    host: env[`${prefixo}_DB_HOST`] ?? "localhost",
    port: Number(env[`${prefixo}_DB_PORT`] ?? opcoes.portaPadrao),
    username: env.DB_USER ?? "postgres",
    password: env.DB_PASSWORD ?? "postgres",
    database: database ?? env[`${prefixo}_DB_NAME`] ?? opcoes.bancoPadrao,
    synchronize: true,
    entities: opcoes.entities
  });
}
