import { FastifyInstance } from "fastify";
import { GestaoProjetos } from "./GestaoProjetos";

const schemaId = { params: { type: "object", properties: { id: { type: "string", pattern: "^[0-9a-fA-F-]{36}$" } } } };

/** Consulta (somente leitura) dos registros de projeto. */
export function registrarRotasProjetos(app: FastifyInstance, gestao: GestaoProjetos): void {
  app.get("/projetos", async () => gestao.listar());
  app.get<{ Params: { id: string } }>("/projetos/:id", { schema: schemaId }, async (request, reply) => {
    const registro = await gestao.obter(request.params.id);
    return registro ?? reply.status(404).send({ erro: "Projeto nao encontrado" });
  });
}
