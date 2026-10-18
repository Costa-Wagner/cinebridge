import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { executarSeed } from "../seed";

const NOME_BANCO_TESTES = process.env.DB_NAME_TEST ?? "cinebridge_test";

async function garantirBanco(): Promise<void> {
  const admin = new DataSource({ ...(AppDataSource.options as object), database: "postgres", entities: [], synchronize: false } as never);
  await admin.initialize();
  const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [NOME_BANCO_TESTES]);
  if (existe.length === 0) {
    await admin.query(`CREATE DATABASE "${NOME_BANCO_TESTES}"`);
  }
  await admin.destroy();
}

/**
 * Cria (se preciso) um banco proprio para os testes de integracao, recria o
 * schema e popula os dados de exemplo. Nunca toca no banco de desenvolvimento.
 */
export async function prepararBancoDeTestes() {
  await garantirBanco();
  const ds = new DataSource({ ...(AppDataSource.options as object), database: NOME_BANCO_TESTES } as never);
  await ds.initialize();
  await ds.synchronize(true);
  const { projeto } = await executarSeed(ds);
  return { ds, projetoSeedId: projeto.id };
}
