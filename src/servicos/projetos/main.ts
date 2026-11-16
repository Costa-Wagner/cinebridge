import "dotenv/config";
import { criarDataSourceProjetos } from "./dataSource";
import { RegistroProjeto } from "./RegistroProjeto";
import { GestaoProjetos } from "./GestaoProjetos";
import { ligarGestao, publicadorEventosProjetos } from "./ligarGestao";
import { registrarRotasProjetos } from "./rotas";
import { criarAppSaude } from "../comum/health";
import { conectarAmqp } from "../../mensageria/CanalAmqp";
import { BarramentoRabbitMQ } from "../../eventos/BarramentoRabbitMQ";
import { montarUrlMQ } from "../../eventos/criarBarramento";
import { FILA_EVENTOS_PROJETOS } from "../../eventos/eventosProjeto";

/** cinebridge-projetos: registra o ciclo de vida dos projetos e publica eventos-projetos. */
async function bootstrap(): Promise<void> {
  const dataSource = criarDataSourceProjetos();
  await dataSource.initialize();

  const canal = await conectarAmqp(montarUrlMQ());
  const barramento = new BarramentoRabbitMQ(canal);
  const gestao = new GestaoProjetos(dataSource.getRepository(RegistroProjeto), publicadorEventosProjetos(barramento));
  await ligarGestao(barramento, gestao);

  const app = criarAppSaude("cinebridge-projetos", {
    banco: () => dataSource.query("SELECT 1"),
    rabbitmq: () => canal.declararFila(FILA_EVENTOS_PROJETOS)
  });
  registrarRotasProjetos(app, gestao);
  await app.listen({ port: Number(process.env.PROJETOS_PORT ?? 3002), host: "0.0.0.0" });
  console.log(`[PROJETOS] consumindo eventos da api; health e consulta na porta ${process.env.PROJETOS_PORT ?? 3002}`);
}

bootstrap().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
