import { DataSource } from "typeorm";
import { AdaptadorProfissional } from "./AdaptadorProfissional";
import { AdaptadorMensageria } from "./AdaptadorMensageria";
import { AdaptadorProfissionalComProjecao } from "./AdaptadorProfissionalComProjecao";
import { ClienteRPC } from "../../mensageria/ClienteRPC";
import { CanalMensageria } from "../../mensageria/CanalMensageria";
import { conectarAmqp } from "../../mensageria/CanalAmqp";
import { montarUrlMQ } from "../../eventos/criarBarramento";

/**
 * PROFISSIONAIS_VIA=local (padrao): undefined, e o ServicoProjetos usa o AdaptadorInterno.
 * PROFISSIONAIS_VIA=mq: cadastro remoto (cinebridge-profissionais) via RabbitMQ, com projecao local.
 */
export async function selecionarAdaptadorProfissional(
  dataSource: DataSource,
  env: NodeJS.ProcessEnv = process.env,
  conectar: (url: string) => Promise<CanalMensageria> = conectarAmqp
): Promise<AdaptadorProfissional | undefined> {
  const via = (env.PROFISSIONAIS_VIA ?? "local").toLowerCase();
  if (via === "local") return undefined;
  if (via !== "mq") throw new Error(`PROFISSIONAIS_VIA invalido: "${env.PROFISSIONAIS_VIA}" (use "local" ou "mq")`);
  const rpc = new ClienteRPC(await conectar(montarUrlMQ(env)), { timeoutMs: Number(env.RPC_TIMEOUT_MS ?? 5000) });
  await rpc.iniciar();
  return new AdaptadorProfissionalComProjecao(new AdaptadorMensageria(rpc), dataSource);
}
