import Fastify, { FastifyInstance } from "fastify";

export type Verificacao = () => Promise<unknown>;

/** Roda as verificacoes em paralelo e devolve so' as que falharam (nome -> motivo). */
export async function executarVerificacoes(verificacoes: Record<string, Verificacao>): Promise<Record<string, string>> {
  const falhas: Record<string, string> = {};
  await Promise.all(
    Object.entries(verificacoes).map(async ([nome, verificar]) => {
      try {
        await verificar();
      } catch (erro) {
        falhas[nome] = erro instanceof Error ? erro.message : String(erro);
      }
    })
  );
  return falhas;
}

/** App minimo dos servicos de apoio: GET /health responde 200 so' se todas as dependencias respondem. */
export function criarAppSaude(servico: string, verificacoes: Record<string, Verificacao> = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get("/health", async (_request, reply) => {
    const falhas = await executarVerificacoes(verificacoes);
    if (Object.keys(falhas).length > 0) return reply.status(503).send({ servico, status: "indisponivel", falhas });
    return { servico, status: "ok" };
  });
  return app;
}
