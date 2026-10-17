import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { Projeto } from "./domain/entities/Projeto";
import { Profissional } from "./domain/entities/Profissional";
import { OrquestradorPadrao } from "./orquestrador/OrquestradorPadrao";
import { FabricaProjeto } from "./fabricas/FabricaProjeto";
import { FabricaDocumentario } from "./fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "./fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "./fabricas/publicitario/FabricaPublicitario";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";
import { SistemaRecomendacao } from "./observers/SistemaRecomendacao";
import { ServicoEmail } from "./observers/ServicoEmail";
import { ServicoMensagensInternas } from "./observers/ServicoMensagensInternas";
import { ModuloAuditoria } from "./observers/ModuloAuditoria";

async function main(): Promise<void> {
  await AppDataSource.initialize();

  const projeto = await AppDataSource.getRepository(Projeto).findOneOrFail({
    where: {},
    order: { criadoEm: "DESC" }
  });

  const profissionais = await AppDataSource.getRepository(Profissional).find({
    relations: ["competencias", "competencias.competencia", "avaliacoes", "convites", "convites.projeto"]
  });
  
  const publicador = new SistemaRecomendacao();
  publicador.adicionarObservador(new ServicoEmail());
  publicador.adicionarObservador(new ServicoMensagensInternas());
  publicador.adicionarObservador(new ModuloAuditoria());

  const fabricas = new Map<TipoCaptacao, FabricaProjeto>([
    [TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario()],
    [TipoCaptacao.ANIMACAO, new FabricaAnimacao()],
    [TipoCaptacao.PUBLICITARIO, new FabricaPublicitario()]
  ]);
  const orquestrador = new OrquestradorPadrao(fabricas.get(projeto.tipoCaptacao)!, publicador);

  console.log("\n=== NOTIFICACOES (Observer) ===");
  const equipe = orquestrador.orquestrar(projeto, profissionais) // 3o parametro opcional: troca a strategy;

  console.log("\n=== RANKING POR PAPEL ===");
  for (const [papel, candidatos] of equipe.ranking) {
    console.log(`\n${papel}`);
    candidatos.forEach((p, i) => console.log(`  #${i + 1} ${p.nome}`));
  }

  console.log("\n=== EQUIPE PROPOSTA ===");
  equipe.membros.forEach((m) => console.log(`  ${m.papel} -> ${m.profissional.nome}`));

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error("Erro no teste:", err);
  await AppDataSource.destroy();
  process.exit(1);
});