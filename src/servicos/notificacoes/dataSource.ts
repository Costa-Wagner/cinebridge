import { DataSource } from "typeorm";
import { criarDataSourceDoServico } from "../comum/dataSource";
import { Notificacao } from "./Notificacao";

/** Banco proprio do cinebridge-notificacoes (NOTIFICACOES_DB_*; padrao: notificacoes-db do compose em localhost:5435). */
export function criarDataSourceNotificacoes(env: NodeJS.ProcessEnv = process.env, database?: string): DataSource {
  return criarDataSourceDoServico({ prefixo: "NOTIFICACOES", portaPadrao: 5435, bancoPadrao: "notificacoes", entities: [Notificacao] }, env, database);
}
