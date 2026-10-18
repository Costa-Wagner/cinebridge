import Fastify, { FastifyInstance } from "fastify";
import { ServicoProjetos } from "./aplicacao/ServicoProjetos";
import { ProjetoInvalidoError } from "./orquestrador/ProjetoInvalidoError";
import { TipoSemFabricaError } from "./fabricas/TipoSemFabricaError";
import { OperacaoInvalidaError } from "./domain/erros";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";
import { Papel } from "./domain/enums/Papel";
import { Equipe } from "./domain/entities/Equipe";
import { Profissional } from "./domain/entities/Profissional";
import { MembroEquipe } from "./domain/entities/MembroEquipe";

const resumo = (p: Profissional) => ({ id: p.id, nome: p.nome });

/** Estado do membro: PROPOSTO ate o produtor convidar; depois o status do convite (CONFIRMADO quando aceito). */
function situacao(membro: MembroEquipe): string {
  if (membro.aceitouConvite) return "CONFIRMADO";
  return membro.convite?.status ?? "PROPOSTO";
}

function resumoEquipe(equipe: Equipe) {
  return {
    equipeId: equipe.id,
    projetoId: equipe.projeto?.id,
    status: equipe.status,
    membros: equipe.membros.map((m) => ({
      papel: m.papel,
      profissional: resumo(m.profissional),
      aceitouConvite: m.aceitouConvite,
      conviteId: m.convite?.id ?? null,
      situacao: situacao(m)
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

const schemaMembro = {
  ...schemaId,
  body: {
    type: "object",
    required: ["papel", "profissionalId"],
    properties: {
      papel: { type: "string", enum: Object.values(Papel) },
      profissionalId: { type: "string", format: "uuid" }
    }
  }
};

const schemaReavaliar = {
  ...schemaId,
  body: {
    type: ["object", "null"],
    properties: { orcamentoTotal: { type: "number" }, dataEntrega: { type: "string", format: "date" } }
  }
};

const schemaResponderConvite = {
  ...schemaId,
  body: { type: "object", required: ["aceito"], properties: { aceito: { type: "boolean" } } }
};

export function criarApp(servico: ServicoProjetos, opcoes: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: opcoes.logger ?? false });

  app.setErrorHandler((erro, request, reply) => {
    if (erro instanceof ProjetoInvalidoError) {
      return reply.status(422).send({ erro: erro.message, problemas: erro.problemas });
    }
    if (erro instanceof TipoSemFabricaError) {
      return reply.status(422).send({ erro: erro.message });
    }
    if (erro instanceof OperacaoInvalidaError) {
      return reply.status(409).send({ erro: erro.message });
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

  // ---- fluxo do produtor e dos profissionais sobre a equipe ----

  app.post<{ Params: { id: string }; Body: { papel: Papel; profissionalId: string } }>(
    "/projetos/:id/equipe/aceitar",
    { schema: schemaMembro },
    async (request, reply) => {
      const convite = await servico.aceitarRecomendacao(request.params.id, request.body.papel, request.body.profissionalId);
      if (!convite) return reply.status(404).send({ erro: "Projeto não encontrado" });
      return reply.status(201).send({
        conviteId: convite.id,
        status: convite.status,
        papel: convite.papel,
        profissionalId: request.body.profissionalId
      });
    }
  );

  app.post<{ Params: { id: string }; Body: { papel: Papel; profissionalId: string } }>(
    "/projetos/:id/equipe/substituir",
    { schema: schemaMembro },
    async (request, reply) => {
      const equipe = await servico.substituirMembro(request.params.id, request.body.papel, request.body.profissionalId);
      if (!equipe) return reply.status(404).send({ erro: "Projeto não encontrado" });
      return reply.send(resumoEquipe(equipe));
    }
  );

  app.post<{ Params: { id: string }; Body: { orcamentoTotal?: number; dataEntrega?: string } | null }>(
    "/projetos/:id/reavaliar",
    { schema: schemaReavaliar },
    async (request, reply) => {
      const equipe = await servico.reavaliar(request.params.id, request.body ?? {});
      if (!equipe) return reply.status(404).send({ erro: "Projeto não encontrado" });
      return reply.send(resumoEquipe(equipe));
    }
  );

  app.post<{ Params: { id: string }; Body: { aceito: boolean } }>(
    "/convites/:id/responder",
    { schema: schemaResponderConvite },
    async (request, reply) => {
      const resultado = await servico.responderConvite(request.params.id, request.body.aceito);
      if (!resultado) return reply.status(404).send({ erro: "Convite não encontrado" });
      return reply.send({
        conviteId: resultado.convite.id,
        status: resultado.convite.status,
        equipeFormada: resultado.equipeFormada
      });
    }
  );

  return app;
}
