import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { criarApp } from "./app";
import { montarSistema } from "./composicao";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { ConfiguracaoDecoradores } from "./decoradores/PilhaDecoradores";
import { criarBarramento } from "./eventos/criarBarramento";

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  const barramento = await criarBarramento();
  console.log(`[BARRAMENTO] ${process.env.BARRAMENTO ?? "memoria"}`);
  const servico = new ServicoProjetos(
    AppDataSource,
    montarSistema(barramento),
    undefined,
    new ConfiguracaoDecoradores(process.env.DECORADORES ?? "CACHE")
  );
  await servico.aquecerCadastro(); // a primeira requisicao nao paga a leitura do cadastro
  const app = criarApp(servico, { logger: true });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
