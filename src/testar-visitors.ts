import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { Projeto } from "./domain/entities/Projeto";
import { Profissional } from "./domain/entities/Profissional";
import { ValidadorConsistencia } from "./visitors/ValidadorConsistencia";
import { CalculadorCompatibilidade } from "./visitors/CalculadorCompatibilidade";
import { GeradorRelatorio } from "./visitors/GeradorRelatorio";

async function main(): Promise<void> {
  await AppDataSource.initialize();

  const projeto = await AppDataSource.getRepository(Projeto).findOneOrFail({
    where: {},
    order: { criadoEm: "DESC" }
  });

  const profissionais = await AppDataSource.getRepository(Profissional).find({
    relations: ["competencias", "competencias.competencia", "avaliacoes"]
  });

  const validador = new ValidadorConsistencia();
  const calculador = new CalculadorCompatibilidade();
  const relatorio = new GeradorRelatorio();

  for (const visitante of [validador, calculador, relatorio]) {
    projeto.aceitar(visitante);
    for (const profissional of profissionais) {
      profissional.aceitar(visitante);
    }
  }

  console.log("\n=== VALIDADOR CONSISTENCIA ===");
  console.log(
    validador.problemas.length === 0
      ? "Nenhum problema encontrado."
      : validador.problemas.join("\n")
  );

  console.log("\n=== CALCULADOR COMPATIBILIDADE ===");
  console.log("Projeto:", [...calculador.indicadoresProjetos.entries()]);
  for (const profissional of profissionais) {
    console.log(
      ` ${profissional.nome}:`,
      calculador.indicadoresProfissionais.get(profissional.id)
    );
  }

  console.log("\n=== RELATORIO GERADO ===");
  console.log(relatorio.gerarTexto());

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error("Erro no teste:", err);
  await AppDataSource.destroy();
  process.exit(1);
});