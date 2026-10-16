import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { Projeto } from "./domain/entities/Projeto";
import { Profissional } from "./domain/entities/Profissional";
import { Papel } from "./domain/enums/Papel";
import { OrquestradorPadrao } from "./orquestrador/OrquestradorPadrao";
import { ehCandidatoElegivel } from "./strategies/RecomendadorPorPontuacao";
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
  
  // pra teste: todo profissional e candidato a todo papel obrigatorio,
  // deixando a strategy discriminar quem realmente encaixa
   const candidatosPorPapel = new Map<Papel, Profissional[]>();
  for (const papelObrigatorio of projeto.papeisObrigatorios) {
    const elegiveis = profissionais.filter((p) =>
      ehCandidatoElegivel(p, papelObrigatorio.papel)
    );
    candidatosPorPapel.set(papelObrigatorio.papel, elegiveis);
  }

  const publicador = new SistemaRecomendacao();
  publicador.adicionarObservador(new ServicoEmail());
  publicador.adicionarObservador(new ServicoMensagensInternas());
  publicador.adicionarObservador(new ModuloAuditoria());

  const orquestrador = new OrquestradorPadrao(undefined, 5, publicador);  //SimilaridadeCosseno
  // const orquestrador = new OrquestradorPadrao(new FiltragemColaborativa());  //FiltragemColaborativa

  console.log("\n=== NOTIFICACOES (Observer) ===");
  const resultado = orquestrador.orquestrar(projeto, candidatosPorPapel);

  console.log("\n=== RANKING POR PAPEL ===");
  for (const papelObrigatorio of projeto.papeisObrigatorios) {
    console.log(`\n${papelObrigatorio.papel} (peso ${papelObrigatorio.peso})`);
    resultado.recomendacoes
      .filter((r) => r.papel === papelObrigatorio.papel)
      .forEach((r) =>
        console.log(`  #${r.posicaoRanking} ${r.profissional.nome} — ${r.pontuacao} (${r.estrategiaUtilizada})`)
      );
  }

  console.log("\n=== CONVITES GERADOS ===");
  resultado.convites.forEach((c) =>
    console.log(`  ${c.papel} -> ${c.profissional.nome} [${c.status}]`)
  );

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error("Erro no teste:", err);
  await AppDataSource.destroy();
  process.exit(1);
});