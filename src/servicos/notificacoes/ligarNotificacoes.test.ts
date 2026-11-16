import { Repository } from "typeorm";
import { ligarNotificacoes } from "./ligarNotificacoes";
import { ServicoNotificacoes } from "./ServicoNotificacoes";
import { Notificacao } from "./Notificacao";
import { BarramentoRabbitMQ } from "../../eventos/BarramentoRabbitMQ";
import { CanalEmMemoria } from "../../mensageria/CanalEmMemoria";
import { FILA_EVENTOS_NOTIFICACOES } from "../../eventos/eventosNotificacao";
import { FILA_EVENTOS_PROJETOS } from "../../eventos/eventosProjeto";

describe("ligarNotificacoes", () => {
  it("consome eventos-notificacoes (api) e eventos-projetos (projetos) e registra as notificacoes", async () => {
    const barramento = new BarramentoRabbitMQ(new CanalEmMemoria());
    const salvas: Notificacao[] = [];
    const repositorio = { save: async (n: Notificacao) => (salvas.push(n), n) };
    const enviar = jest.fn().mockResolvedValue(undefined);
    const servico = new ServicoNotificacoes(repositorio as unknown as Repository<Notificacao>, [
      { canal: "EMAIL", enviar },
      { canal: "MENSAGEM_INTERNA", enviar }
    ]);
    await ligarNotificacoes(barramento, servico);

    await barramento.publicar(FILA_EVENTOS_NOTIFICACOES, {
      tipo: "EQUIPE_FORMADA", projetoId: "p1", genero: "X", papel: null, totalCandidatos: 1, profissionais: [], ocorridoEm: "2026-11-10T12:00:00Z"
    });
    await barramento.publicar(FILA_EVENTOS_PROJETOS, { tipo: "PROJETO_FINALIZADO", projetoId: "p1", tipoCaptacao: "ANIMACAO", ocorridoEm: "2026-11-10T12:00:00Z", detalhes: { quantidadeMembros: 2 } });

    expect(salvas.map((n) => [n.origem, n.tipoEvento, n.canal])).toEqual([
      ["api", "EQUIPE_FORMADA", "EMAIL"],
      ["api", "EQUIPE_FORMADA", "MENSAGEM_INTERNA"],
      ["projetos", "PROJETO_FINALIZADO", "EMAIL"],
      ["projetos", "PROJETO_FINALIZADO", "MENSAGEM_INTERNA"]
    ]);
    expect(enviar).toHaveBeenCalledTimes(4);
  });
});
