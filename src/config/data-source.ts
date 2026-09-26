import "reflect-metadata";
import { DataSource } from "typeorm";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Competencia } from "../domain/entities/Competencia";
import { ProfissionalCompetencia } from "../domain/entities/ProfissionalCompetencia";
import { Avaliacao } from "../domain/entities/Avaliacao";
import { Recomendacao } from "../domain/entities/Recomendacao";
import { Convite } from "../domain/entities/Convite";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "cinebridge",
  synchronize: true,
  logging: false,
  entities: [
    Projeto,
    Profissional,
    Competencia,
    ProfissionalCompetencia,
    Avaliacao,
    Recomendacao,
    Convite
  ],
  migrations: ["src/config/migrations/**/*.ts"]
});
