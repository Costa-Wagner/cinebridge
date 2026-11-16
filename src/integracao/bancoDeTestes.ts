import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { executarSeed } from "../seed";

const NOME_BANCO_TESTES = process.env.DB_NAME_TEST ?? "cinebridge_test";
export const NOME_BANCO_CARGA = process.env.DB_NAME_CARGA ?? "cinebridge_carga";

export async function garantirBanco(nomeBanco: string): Promise<void> {
  const admin = new DataSource({ ...(AppDataSource.options as object), database: "postgres", entities: [], synchronize: false } as never);
  await admin.initialize();
  const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [nomeBanco]);
  if (existe.length === 0) {
    await admin.query(`CREATE DATABASE "${nomeBanco}"`);
  }
  await admin.destroy();
}

/**
 * Cria (se preciso) um banco proprio para os testes de integracao, recria o
 * schema e popula os dados de exemplo. Nunca toca no banco de desenvolvimento.
 */
export async function prepararBancoDeTestes(nomeBanco: string = NOME_BANCO_TESTES) {
  await garantirBanco(nomeBanco);
  const ds = new DataSource({ ...(AppDataSource.options as object), database: nomeBanco } as never);
  await ds.initialize();
  await ds.synchronize(true);
  const { projeto } = await executarSeed(ds);
  return { ds, projetoSeedId: projeto.id };
}

/** Insere `quantidade` profissionais ficticios (4 competencias e 5 avaliacoes cada) direto no banco, em poucas consultas. */
export async function gerarProfissionaisEmMassa(ds: DataSource, quantidade: number): Promise<void> {
  await ds.query(
    `INSERT INTO profissionais (nome, email, especialidades, "precoBaseDiaria", disponibilidade, localizacao)
       SELECT 'Prof ' || g, 'carga' || g || '@exemplo.com', 'Direção', 800 + (g % 20) * 50,
              '[{"inicio":"2026-01-01","fim":"2026-12-31"}]'::jsonb, 'São Paulo'
         FROM generate_series(1, $1) g`,
    [quantidade]
  );
  await ds.query(
    `INSERT INTO profissional_competencias (nivel, profissional_id, competencia_id)
       SELECT round((3 + random() * 7)::numeric, 2), p.id, c.id
         FROM profissionais p
         CROSS JOIN LATERAL (SELECT id FROM competencias ORDER BY random() * length(p.email) LIMIT 4) c
        WHERE p.email LIKE 'carga%@exemplo.com'`
  );
  await ds.query(
    `INSERT INTO avaliacoes (nota, profissional_id)
       SELECT round((5 + random() * 4.9)::numeric, 2), p.id
         FROM profissionais p CROSS JOIN generate_series(1, 5)
        WHERE p.email LIKE 'carga%@exemplo.com'`
  );
}
