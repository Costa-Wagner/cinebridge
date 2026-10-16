import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { Projeto } from "./domain/entities/Projeto";
import { Profissional } from "./domain/entities/Profissional";
import { OrquestradorPadrao } from "./orquestrador/OrquestradorPadrao";
import { RecomendadorPorPontuacao } from "./strategies/RecomendadorPorPontuacao";
import { SimilaridadeCosseno } from "./strategies/SimilaridadeCosseno";
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

  const orquestrador = new OrquestradorPadrao(publicador);
  const recomendador = new RecomendadorPorPontuacao(new SimilaridadeCosseno(), 5); // troque a strategy aqui

  console.log("\n=== NOTIFICACOES (Observer) ===");
  const equipe = orquestrador.orquestrar(projeto, recomendador, profissionais);

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