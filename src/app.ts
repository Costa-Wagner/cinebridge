import Fastify, { FastifyInstance } from "fastify";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { ProjetoInvalidoError } from "./orquestrador/ProjetoInvalidoError";
import { TipoSemFabricaError } from "./fabricas/TipoSemFabricaError";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";
import { Papel } from "./domain/enums/Papel";
import { Equipe } from "./domain/entities/Equipe";
import { Profissional } from "./domain/entities/Profissional";

const resumo = (p: Profissional) => ({ id: p.id, nome: p.nome });

function resumoEquipe(equipe: Equipe) {
  return {
    equipeId: equipe.id,
    projetoId: equipe.projeto?.id,
    membros: equipe.membros.map((m) => ({
      papel: m.papel,
      profissional: resumo(m.profissional),
      aceitouConvite: m.aceitouConvite
    }))
  };
}

const schemaCriarProjeto = {
  body: {
    type: "object",
    required: ["tipoCaptacao", "duracaoEstimadaMinutos", "orcamentoTotal", "dataEntrega", "localizacaoFilmagem"],
    properties: {
      tipoCaptacao: { type: "string", enum: Object.values(TipoCaptacao) },
      genero: { type: "string" },
      duracaoEstimadaMinutos: { type: "integer" },
      orcamentoTotal: { type: "number" },
      dataEntrega: { type: "string", format: "date" },
      localizacaoFilmagem: { type: "string" },
      papeisObrigatorios: {
        type: "array",
        items: {
          type: "object",
          required: ["papel", "peso"],
          properties: { papel: { type: "string", enum: Object.values(Papel) }, peso: { type: "number" } }
        }
      }
    }
  }
};

const schemaId = { params: { type: "object", properties: { id: { type: "string", format: "uuid" } } } };

export function criarApp(servico: ServicoProjetos, opcoes: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: opcoes.logger ?? false });

  app.setErrorHandler((erro, request, reply) => {
    if (erro instanceof ProjetoInvalidoError) {
      return reply.status(422).send({ erro: erro.message, problemas: erro.problemas });
    }
    if (erro instanceof TipoSemFabricaError) {
      return reply.status(422).send({ erro: erro.message });
    }
    if (erro.validation) {
      return reply.status(400).send({ erro: erro.message });
    }
    request.log.error(erro);
    return reply.status(500).send({ erro: "Erro interno" });
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.post<{ Body: Record<string, any> }>("/projetos", { schema: schemaCriarProjeto }, async (request, reply) => {
    const { tipoCaptacao, ...dados } = request.body;
    const projeto = await servico.criar(tipoCaptacao as TipoCaptacao, dados);
    return reply.status(201).send(projeto);
  });

  app.post<{ Params: { id: string } }>("/projetos/:id/recomendar", { schema: schemaId }, async (request, reply) => {
    const equipe = await servico.recomendar(request.params.id);
    if (!equipe) return reply.status(404).send({ erro: "Projeto não encontrado" });
    return reply.send({
      ...resumoEquipe(equipe),
      alternativas: Object.fromEntries(
        [...equipe.ranking].map(([papel, candidatos]) => [papel, candidatos.slice(1).map(resumo)])
      )
    });
  });

  app.get<{ Params: { id: string } }>("/projetos/:id/equipe", { schema: schemaId }, async (request, reply) => {
    const equipe = await servico.buscarEquipe(request.params.id);
    if (!equipe) return reply.status(404).send({ erro: "Equipe não encontrada" });
    return reply.send(resumoEquipe(equipe));
  });

  return app;
}
