import { BarramentoEmMemoria, BarramentoEventos } from "./BarramentoEventos";
import { BarramentoRabbitMQ } from "./BarramentoRabbitMQ";
import { conectarAmqp } from "../mensageria/CanalAmqp";
import { CanalMensageria } from "../mensageria/CanalMensageria";

export function montarUrlMQ(env: NodeJS.ProcessEnv = process.env): string {
  const usuario = encodeURIComponent(env.MQ_USER ?? "guest");
  const senha = encodeURIComponent(env.MQ_PASSWORD ?? "guest");
  return `amqp://${usuario}:${senha}@${env.MQ_HOST ?? "localhost"}:${env.MQ_PORT ?? "5672"}`;
}

/** BARRAMENTO=memoria (padrao) usa o EventEmitter; BARRAMENTO=rabbitmq conecta ao broker. */
export async function criarBarramento(
  env: NodeJS.ProcessEnv = process.env,
  conectar: (url: string) => Promise<CanalMensageria> = conectarAmqp
): Promise<BarramentoEventos> {
  const tipo = (env.BARRAMENTO ?? "memoria").toLowerCase();
  if (tipo === "memoria") return new BarramentoEmMemoria();
  if (tipo === "rabbitmq") return new BarramentoRabbitMQ(await conectar(montarUrlMQ(env)));
  throw new Error(`BARRAMENTO invalido: "${env.BARRAMENTO}" (use "memoria" ou "rabbitmq")`);
}
