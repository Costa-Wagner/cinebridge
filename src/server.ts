import "dotenv/config";
import "reflect-metadata";
import Fastify from "fastify";
import { AppDataSource } from "./config/data-source";
import { Projeto } from "./domain/entities/Projeto";
import { Profissional } from "./domain/entities/Profissional";
import { Papel } from "./domain/enums/Papel";
import { OrquestradorPadrao } from "./orquestrador/OrquestradorPadrao";
import { PERFIL_IDEAL_PAPEL } from "./config/perfilPapel";
import { SistemaRecomendacao } from "./observers/SistemaRecomendacao";
import { ServicoEmail } from "./observers/ServicoEmail";
import { ServicoMensagensInternas } from "./observers/ServicoMensagensInternas";
import { ModuloAuditoria } from "./observers/ModuloAuditoria";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

function ehCandidatoElegivel(profissional: Profissional, papel: Papel): boolean {
  const competenciasDoPapel = new Set(Object.keys(PERFIL_IDEAL_PAPEL[papel]));
  return (profissional.competencias ?? []).some((v) =>
    competenciasDoPapel.has(v.competencia.nome)
  );
}

app.post<{ Params: { id: string } }>("/projetos/:id/recomendar", async (request, reply) => {
  const projeto = await AppDataSource.getRepository(Projeto).findOneBy({
    id: request.params.id
  });
  if (!projeto) {
    return reply.status(404).send({ erro: "Projeto não encontrado" });
  }

  const profissionais = await AppDataSource.getRepository(Profissional).find({
    relations: ["competencias", "competencias.competencia", "avaliacoes", "convites", "convites.projeto"]
  });

  const candidatosPorPapel = new Map<Papel, Profissional[]>();
  for (const papelObrigatorio of projeto.papeisObrigatorios) {
    candidatosPorPapel.set(
      papelObrigatorio.papel,
      profissionais.filter((p) => ehCandidatoElegivel(p, papelObrigatorio.papel))
    );
  }

  const publicador = new SistemaRecomendacao();
  publicador.adicionarAssinante(new ServicoEmail());
  publicador.adicionarAssinante(new ServicoMensagensInternas());
  publicador.adicionarAssinante(new ModuloAuditoria());

  const orquestrador = new OrquestradorPadrao(undefined, 5, publicador);
  const resultado = orquestrador.orquestrar(projeto, candidatosPorPapel);

  return reply.send(resultado);
});

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  app.log.error(err);
  process.exit(1);
});