import { Repository } from "typeorm";
import { ligarGestao, publicadorEventosProjetos } from "./ligarGestao";
import { GestaoProjetos } from "./GestaoProjetos";
import { RegistroProjeto } from "./RegistroProjeto";
import { BarramentoRabbitMQ } from "../../eventos/BarramentoRabbitMQ";
import { TOPICO_EQUIPE_FORMADA } from "../../eventos/BarramentoEventos";
import { CanalEmMemoria } from "../../mensageria/CanalEmMemoria";
import { EventoProjeto, FILA_EVENTOS_PROJETOS, TOPICO_PROJETO_ATUALIZADO, TOPICO_PROJETO_CRIADO } from "../../eventos/eventosProjeto";

describe("ligarGestao: api -> cinebridge-projetos -> eventos-projetos", () => {
  async function montar() {
    const barramento = new BarramentoRabbitMQ(new CanalEmMemoria());
    const dados = new Map<string, RegistroProjeto>();
    const repositorio = {
      findOneBy: async ({ id }: { id: string }) => dados.get(id) ?? null,
      save: async (r: RegistroProjeto) => dados.set(r.id, r)
    };
    const gestao = new GestaoProjetos(repositorio as unknown as Repository<RegistroProjeto>, publicadorEventosProjetos(barramento));
    const emitidos: EventoProjeto[] = [];
    await barramento.assinar(FILA_EVENTOS_PROJETOS, (e) => void emitidos.push(e));
    await ligarGestao(barramento, gestao);
    return { barramento, dados, emitidos };
  }

  const payload = { projetoId: "p1", tipoCaptacao: "ANIMACAO", genero: "Ficção", orcamentoTotal: 500, dataEntrega: "2026-12-01", custoTotal: 400, prazoTotal: 30 };

  it("os tres eventos da api viram registros e eventos de projeto", async () => {
    const { barramento, dados, emitidos } = await montar();

    await barramento.publicar(TOPICO_PROJETO_CRIADO, payload);
    await barramento.publicar(TOPICO_PROJETO_ATUALIZADO, { ...payload, orcamentoTotal: 700 });
    await barramento.publicar(TOPICO_EQUIPE_FORMADA, { projetoId: "p1", tipoCaptacao: "ANIMACAO", orcamentoTotal: 700, membros: [] });

    expect(dados.get("p1")).toMatchObject({ status: "FINALIZADO", orcamentoTotal: 700 });
    expect(emitidos.map((e) => e.tipo)).toEqual(["PROJETO_CRIADO", "PROJETO_ATUALIZADO", "PROJETO_FINALIZADO"]);
  });
});
