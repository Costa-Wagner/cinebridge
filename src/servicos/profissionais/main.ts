import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "../../config/data-source";
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
  await AppDataSource.initialize();
  if (await semearProfissionaisSeVazio(AppDataSource)) console.log("[PROFISSIONAIS] cadastro inicial criado");

  const canal = await conectarAmqp(montarUrlMQ());
  const adaptador = new AdaptadorInterno(new CatalogoProfissionais(AppDataSource), AppDataSource);
  await registrarRespondedor(canal, FILA_CONSULTA_PROFISSIONAIS, criarTratadorConsultas(adaptador));

  const app = criarAppSaude("cinebridge-profissionais", {
    banco: () => AppDataSource.query("SELECT 1"),
    rabbitmq: () => canal.declararFila(FILA_CONSULTA_PROFISSIONAIS)
  });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
  console.log(`[PROFISSIONAIS] ouvindo ${FILA_CONSULTA_PROFISSIONAIS}; health na porta ${process.env.PORT ?? 3001}`);
}

bootstrap().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
