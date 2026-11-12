import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { criarApp } from "./app";
import { montarSistema } from "./composicao";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { ConfiguracaoDecoradores } from "./decoradores/PilhaDecoradores";
import { criarBarramento } from "./eventos/criarBarramento";
import { BarramentoRabbitMQ } from "./eventos/BarramentoRabbitMQ";
import { TOPICO_EQUIPE_FORMADA } from "./eventos/BarramentoEventos";
import { selecionarAdaptadorProfissional } from "./adaptadores/profissional/selecionarAdaptadorProfissional";

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  const barramento = await criarBarramento();
  console.log(`[BARRAMENTO] ${process.env.BARRAMENTO ?? "memoria"}`);
  const sistema = montarSistema(barramento);
  const profissional = await selecionarAdaptadorProfissional(AppDataSource);
  if (profissional) sistema.configurarAdaptadores({ profissional });
  console.log(`[PROFISSIONAIS] via ${process.env.PROFISSIONAIS_VIA ?? "local"}`);
  const servico = new ServicoProjetos(
    AppDataSource,
    sistema,
    undefined,
    new ConfiguracaoDecoradores(process.env.DECORADORES ?? "CACHE"),
    barramento
  );
  await servico.aquecerCadastro(); // a primeira requisicao nao paga a leitura do cadastro
  const verificacoes: Record<string, () => Promise<unknown>> = { banco: () => AppDataSource.query("SELECT 1") };
  if (barramento instanceof BarramentoRabbitMQ) verificacoes.rabbitmq = () => barramento.verificar(TOPICO_EQUIPE_FORMADA);
  const app = criarApp(servico, { logger: true, verificacoes });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
