import { Repository } from "typeorm";
import { ServicoNotificacoes } from "./ServicoNotificacoes";
import { Notificacao } from "./Notificacao";
import { EnviadorNotificacao } from "./enviadores";
import { EventoNotificacaoPayload } from "../../eventos/eventosNotificacao";
import { EventoProjeto } from "../../eventos/eventosProjeto";

const AGORA = new Date("2026-11-10T12:00:00Z");

function enviadorFalso(canal: "EMAIL" | "MENSAGEM_INTERNA"): jest.Mocked<EnviadorNotificacao> {
  return { canal, enviar: jest.fn().mockResolvedValue(undefined) };
}

function montar(enviadores: EnviadorNotificacao[]) {
  let seq = 0;
  const repositorio = {
    save: jest.fn(async (n: Notificacao) => Object.assign(n, { id: `n${++seq}` })),
    find: jest.fn().mockResolvedValue([])
  };
  return { repositorio, servico: new ServicoNotificacoes(repositorio as unknown as Repository<Notificacao>, enviadores, () => AGORA) };
}

const eventoApi: EventoNotificacaoPayload = {
  tipo: "CONVITE_ACEITO",
  projetoId: "proj-1",
  genero: "Documentário",
  papel: "DIRETOR",
  totalCandidatos: 1,
  profissionais: [{ id: "1", nome: "Ana", email: "ana@x.com" }],
  ocorridoEm: "2026-11-10T12:00:00Z"
};
const eventoProjeto: EventoProjeto = { tipo: "PROJETO_CRIADO", projetoId: "proj-1", tipoCaptacao: "ANIMACAO", ocorridoEm: "2026-11-10T12:00:00Z", detalhes: { orcamentoTotal: 1, dataEntrega: "2026-12-01" } };

describe("ServicoNotificacoes", () => {
  it("envia cada mensagem pelo canal certo e registra como ENVIADA", async () => {
    const email = enviadorFalso("EMAIL");
    const interna = enviadorFalso("MENSAGEM_INTERNA");
    const { servico, repositorio } = montar([email, interna]);

    const registradas = await servico.processarEventoRecomendacao(eventoApi);

    expect(email.enviar).toHaveBeenCalledTimes(1);
    expect(interna.enviar).toHaveBeenCalledTimes(1);
    expect(registradas).toHaveLength(2);
    expect(repositorio.save).toHaveBeenCalledTimes(2);
    expect(registradas[0]).toMatchObject({ id: "n1", projetoId: "proj-1", tipoEvento: "CONVITE_ACEITO", origem: "api", canal: "EMAIL", destinatario: "produtor", status: "ENVIADA", erro: null, enviadoEm: AGORA });
    expect(registradas[1]).toMatchObject({ canal: "MENSAGEM_INTERNA", status: "ENVIADA" });
  });

  it("eventos do projeto vem com origem 'projetos'", async () => {
    const { servico } = montar([enviadorFalso("EMAIL"), enviadorFalso("MENSAGEM_INTERNA")]);
    const registradas = await servico.processarEventoProjeto(eventoProjeto);
    expect(registradas.map((n) => [n.origem, n.tipoEvento])).toEqual([["projetos", "PROJETO_CRIADO"], ["projetos", "PROJETO_CRIADO"]]);
  });

  it("falha de envio e' registrada como FALHA e nao impede as demais mensagens", async () => {
    const email = enviadorFalso("EMAIL");
    email.enviar.mockRejectedValue(new Error("smtp fora"));
    const interna = enviadorFalso("MENSAGEM_INTERNA");
    const { servico } = montar([email, interna]);

    const [falha, ok] = await servico.processarEventoRecomendacao(eventoApi);

    expect(falha).toMatchObject({ status: "FALHA", erro: "smtp fora", enviadoEm: null });
    expect(ok.status).toBe("ENVIADA");
  });

  it("erro que nao e' Error e canal sem enviador tambem viram FALHA", async () => {
    const email = enviadorFalso("EMAIL");
    email.enviar.mockRejectedValue("texto");
    const { servico } = montar([email]); // sem enviador de mensagem interna

    const [e1, e2] = await servico.processarEventoRecomendacao(eventoApi);

    expect(e1).toMatchObject({ status: "FALHA", erro: "texto" });
    expect(e2).toMatchObject({ status: "FALHA", erro: "Canal sem enviador: MENSAGEM_INTERNA" });
  });

  it("listar filtra por projeto, ordena pelas mais recentes e limita", async () => {
    const { servico, repositorio } = montar([]);
    await servico.listar("proj-1", 10);
    expect(repositorio.find).toHaveBeenLastCalledWith({ where: { projetoId: "proj-1" }, order: { criadoEm: "DESC" }, take: 10 });
    await servico.listar();
    expect(repositorio.find).toHaveBeenLastCalledWith({ where: {}, order: { criadoEm: "DESC" }, take: 100 });
  });

  it("usa o relogio do sistema por padrao", async () => {
    const repositorio = { save: async (n: Notificacao) => n };
    const servico = new ServicoNotificacoes(repositorio as unknown as Repository<Notificacao>, [enviadorFalso("EMAIL"), enviadorFalso("MENSAGEM_INTERNA")]);
    const antes = Date.now();
    const [n] = await servico.processarEventoProjeto(eventoProjeto);
    expect(n.enviadoEm!.getTime()).toBeGreaterThanOrEqual(antes);
  });
});
