import "dotenv/config";
import "reflect-metadata";
import { criarDataSourceProfissionais } from "./dataSource";
import { semearProfissionaisSeVazio } from "../../seed";
import { CatalogoProfissionais } from "../../aplicacao/CatalogoProfissionais";
import { AdaptadorInterno } from "../../adaptadores/profissional/AdaptadorInterno";
import { FILA_CONSULTA_PROFISSIONAIS } from "../../adaptadores/profissional/protocoloProfissionais";
import { conectarAmqp } from "../../mensageria/CanalAmqp";
import { registrarRespondedor } from "../../mensageria/ResponderRPC";
import { montarUrlMQ } from "../../eventos/criarBarramento";
import { criarAppSaude } from "../comum/health";
import { criarTratadorConsultas } from "./tratadorConsultas";

/** cinebridge-profissionais: dono do cadastro; responde as consultas da api na fila consulta-profissionais. */
async function bootstrap(): Promise<void> {
  const dataSource = criarDataSourceProfissionais();
  await dataSource.initialize();
  if (await semearProfissionaisSeVazio(dataSource)) console.log("[PROFISSIONAIS] cadastro inicial criado");

  const canal = await conectarAmqp(montarUrlMQ());
  const adaptador = new AdaptadorInterno(new CatalogoProfissionais(dataSource), dataSource);
  await registrarRespondedor(canal, FILA_CONSULTA_PROFISSIONAIS, criarTratadorConsultas(adaptador));

  const app = criarAppSaude("cinebridge-profissionais", {
    banco: () => dataSource.query("SELECT 1"),
    rabbitmq: () => canal.declararFila(FILA_CONSULTA_PROFISSIONAIS)
  });
  await app.listen({ port: Number(process.env.PROFISSIONAIS_PORT ?? 3001), host: "0.0.0.0" });
  console.log(`[PROFISSIONAIS] ouvindo ${FILA_CONSULTA_PROFISSIONAIS}; health na porta ${process.env.PROFISSIONAIS_PORT ?? 3001}`);
}

bootstrap().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
