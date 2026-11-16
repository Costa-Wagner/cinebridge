import "dotenv/config";
import { criarDataSourceNotificacoes } from "./dataSource";
import { Notificacao } from "./Notificacao";
import { ServicoNotificacoes } from "./ServicoNotificacoes";
import { EnviadorEmailSimulado, EnviadorMensagemInternaSimulado } from "./enviadores";
import { ligarNotificacoes } from "./ligarNotificacoes";
import { registrarRotasNotificacoes } from "./rotas";
import { criarAppSaude } from "../comum/health";
import { conectarAmqp } from "../../mensageria/CanalAmqp";
import { BarramentoRabbitMQ } from "../../eventos/BarramentoRabbitMQ";
import { montarUrlMQ } from "../../eventos/criarBarramento";
import { FILA_EVENTOS_NOTIFICACOES } from "../../eventos/eventosNotificacao";

/** cinebridge-notificacoes: envia e registra e-mails e mensagens internas a partir dos eventos. */
async function bootstrap(): Promise<void> {
  const dataSource = criarDataSourceNotificacoes();
  await dataSource.initialize();

  const canal = await conectarAmqp(montarUrlMQ());
  const barramento = new BarramentoRabbitMQ(canal);
  const servico = new ServicoNotificacoes(dataSource.getRepository(Notificacao), [new EnviadorEmailSimulado(), new EnviadorMensagemInternaSimulado()]);
  await ligarNotificacoes(barramento, servico);

  const app = criarAppSaude("cinebridge-notificacoes", {
    banco: () => dataSource.query("SELECT 1"),
    rabbitmq: () => canal.declararFila(FILA_EVENTOS_NOTIFICACOES)
  });
  registrarRotasNotificacoes(app, servico);
  await app.listen({ port: Number(process.env.NOTIFICACOES_PORT ?? 3003), host: "0.0.0.0" });
  console.log(`[NOTIFICACOES] consumindo eventos; health e consulta na porta ${process.env.NOTIFICACOES_PORT ?? 3003}`);
}

bootstrap().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
