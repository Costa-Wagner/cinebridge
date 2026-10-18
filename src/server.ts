import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { criarApp } from "./app";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { SistemaRecomendacao } from "./observers/SistemaRecomendacao";
import { ServicoEmail } from "./observers/ServicoEmail";
import { ServicoMensagensInternas } from "./observers/ServicoMensagensInternas";
import { ModuloAuditoria } from "./observers/ModuloAuditoria";
import { FabricaDocumentario } from "./fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "./fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "./fabricas/publicitario/FabricaPublicitario";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";

/** Raiz de composicao: monta o sistema e injeta as dependencias. */
function montarSistema(): SistemaRecomendacao {
  const sistema = new SistemaRecomendacao();
  sistema.registrarFabrica(TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario());
  sistema.registrarFabrica(TipoCaptacao.ANIMACAO, new FabricaAnimacao());
  sistema.registrarFabrica(TipoCaptacao.PUBLICITARIO, new FabricaPublicitario());
  sistema.adicionarObservador(new ServicoEmail());
  sistema.adicionarObservador(new ServicoMensagensInternas());
  sistema.adicionarObservador(new ModuloAuditoria());
  return sistema;
}

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  const app = criarApp(new ServicoProjetos(AppDataSource, montarSistema()), { logger: true });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
