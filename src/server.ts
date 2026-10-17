import "dotenv/config";
import "reflect-metadata";
import Fastify from "fastify";
import { AppDataSource } from "./config/data-source";
import { Projeto } from "./domain/entities/Projeto";
import { Profissional } from "./domain/entities/Profissional";
import { OrquestradorPadrao } from "./orquestrador/OrquestradorPadrao";
import { FabricaProjeto } from "./fabricas/FabricaProjeto";
import { FabricaDocumentario } from "./fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "./fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "./fabricas/publicitario/FabricaPublicitario";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";
import { ProjetoInvalidoError } from "./orquestrador/ProjetoInvalidoError";
import { SistemaRecomendacao } from "./observers/SistemaRecomendacao";
import { ServicoEmail } from "./observers/ServicoEmail";
import { ServicoMensagensInternas } from "./observers/ServicoMensagensInternas";
import { ModuloAuditoria } from "./observers/ModuloAuditoria";

const app = Fastify({ logger: true });

// Provisorio: a selecao da fabrica por tipo passa para o SistemaRecomendacao no passo 5.
const FABRICAS = new Map<TipoCaptacao, FabricaProjeto>([
  [TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario()],
  [TipoCaptacao.ANIMACAO, new FabricaAnimacao()],
  [TipoCaptacao.PUBLICITARIO, new FabricaPublicitario()]
]);

app.get("/health", async () => ({ status: "ok" }));

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

  const publicador = new SistemaRecomendacao();
  publicador.adicionarObservador(new ServicoEmail());
  publicador.adicionarObservador(new ServicoMensagensInternas());
  publicador.adicionarObservador(new ModuloAuditoria());

  const fabrica = FABRICAS.get(projeto.tipoCaptacao);
  if (!fabrica) {
    return reply.status(422).send({ erro: `Tipo de projeto sem fabrica: ${projeto.tipoCaptacao}` });
  }
  const orquestrador = new OrquestradorPadrao(fabrica, publicador);

  try {
    const equipe = orquestrador.orquestrar(projeto, profissionais);
    const resumo = (p: Profissional) => ({ id: p.id, nome: p.nome });
    return reply.send({
      projetoId: projeto.id,
      equipe: equipe.membros.map((m) => ({ papel: m.papel, profissional: resumo(m.profissional) })),
      alternativas: Object.fromEntries(
        [...equipe.ranking].map(([papel, candidatos]) => [papel, candidatos.slice(1).map(resumo)])
      )
    });
  } catch (erro) {
    if (erro instanceof ProjetoInvalidoError) {
      return reply.status(422).send({ erro: erro.message });
    }
    throw erro;
  }
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