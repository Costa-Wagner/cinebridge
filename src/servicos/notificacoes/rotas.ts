import { FastifyInstance } from "fastify";
import { ServicoNotificacoes } from "./ServicoNotificacoes";

const schemaConsulta = { querystring: { type: "object", properties: { projetoId: { type: "string", pattern: "^[0-9a-fA-F-]{36}$" } } } };

/** Consulta (somente leitura) das notificacoes registradas, mais recentes primeiro. */
export function registrarRotasNotificacoes(app: FastifyInstance, servico: ServicoNotificacoes): void {
  app.get<{ Querystring: { projetoId?: string } }>("/notificacoes", { schema: schemaConsulta }, async (request) =>
    servico.listar(request.query.projetoId)
  );
}
