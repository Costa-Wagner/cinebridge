import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { criarApp } from "./app";
import { montarSistema } from "./composicao";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  const servico = new ServicoProjetos(AppDataSource, montarSistema());
  await servico.aquecerCadastro(); // a primeira requisicao nao paga a leitura do cadastro
  const app = criarApp(servico, { logger: true });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
