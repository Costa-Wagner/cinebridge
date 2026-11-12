import { mensagensDoEventoProjeto, mensagensDoEventoRecomendacao } from "./mensagens";
import { EventoNotificacaoPayload } from "../../eventos/eventosNotificacao";
import { EventoProjeto } from "../../eventos/eventosProjeto";

const ana = { id: "1", nome: "Ana", email: "ana@x.com" };
const bruno = { id: "2", nome: "Bruno", email: "bruno@x.com" };
const evento = (tipo: string, extras: Partial<EventoNotificacaoPayload> = {}): EventoNotificacaoPayload => ({
  tipo,
  projetoId: "6d0b2c88-3b0a-4f43-9a52-2a1d6c7a9e10",
  genero: "Documentário",
  papel: "DIRETOR",
  totalCandidatos: 2,
  profissionais: [ana, bruno],
  ocorridoEm: "2026-11-10T12:00:00Z",
  ...extras
});

describe("mensagensDoEventoRecomendacao", () => {
  it("RECOMENDACAO_GERADA: e-mail ao produtor com o melhor candidato e aviso interno com o total", () => {
    const [mail, interna] = mensagensDoEventoRecomendacao(evento("RECOMENDACAO_GERADA"));
    expect(mail).toMatchObject({ canal: "EMAIL", destinatario: "produtor" });
    expect(mail.corpo).toContain("DIRETOR");
    expect(mail.corpo).toContain("melhor candidato Ana");
    expect(interna).toEqual({ canal: "MENSAGEM_INTERNA", destinatario: "produtor", assunto: "RECOMENDACAO_GERADA", corpo: "2 profissionais ranqueados para DIRETOR" });
  });

  it("RECOMENDACAO_GERADA sem candidatos cita 'nenhum'", () => {
    const [mail] = mensagensDoEventoRecomendacao(evento("RECOMENDACAO_GERADA", { profissionais: [], totalCandidatos: 0 }));
    expect(mail.corpo).toContain("melhor candidato nenhum");
  });

  it("CONVITE_ENVIADO e MEMBRO_SUBSTITUIDO vao para o e-mail do profissional", () => {
    const enviado = mensagensDoEventoRecomendacao(evento("CONVITE_ENVIADO", { profissionais: [ana] }));
    expect(enviado[0]).toMatchObject({ canal: "EMAIL", destinatario: "ana@x.com" });
    expect(enviado[0].corpo).toContain("Convite para DIRETOR");
    const substituido = mensagensDoEventoRecomendacao(evento("MEMBRO_SUBSTITUIDO", { profissionais: [bruno] }));
    expect(substituido[0]).toMatchObject({ destinatario: "bruno@x.com" });
    expect(substituido[0].corpo).toContain("outro profissional");
  });

  it("sem profissional identificado o destinatario cai para o nome", () => {
    expect(mensagensDoEventoRecomendacao(evento("CONVITE_ENVIADO", { profissionais: [] }))[0].destinatario).toBe("nenhum");
    expect(mensagensDoEventoRecomendacao(evento("MEMBRO_SUBSTITUIDO", { profissionais: [] }))[0].destinatario).toBe("nenhum");
  });

  it("CONVITE_ACEITO e CONVITE_RECUSADO avisam o produtor", () => {
    expect(mensagensDoEventoRecomendacao(evento("CONVITE_ACEITO", { profissionais: [ana] }))[0].corpo).toContain("Ana aceitou o convite para DIRETOR");
    expect(mensagensDoEventoRecomendacao(evento("CONVITE_RECUSADO", { profissionais: [ana] }))[0].corpo).toContain("Ana recusou o convite para DIRETOR");
  });

  it("EQUIPE_FORMADA: papel nulo vira 'equipe completa' no aviso interno", () => {
    const [mail, interna] = mensagensDoEventoRecomendacao(evento("EQUIPE_FORMADA", { papel: null }));
    expect(mail).toMatchObject({ destinatario: "produtor" });
    expect(mail.corpo).toContain("formada com 2 membro(s)");
    expect(interna.corpo).toBe("EQUIPE_FORMADA (equipe completa): Ana, Bruno");
  });

  it("tipo desconhecido gera so' o aviso interno", () => {
    const mensagens = mensagensDoEventoRecomendacao(evento("OUTRO"));
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0].canal).toBe("MENSAGEM_INTERNA");
  });
});

describe("mensagensDoEventoProjeto", () => {
  const projeto = (tipo: EventoProjeto["tipo"], detalhes: Record<string, unknown>): EventoProjeto => ({
    tipo,
    projetoId: "6d0b2c88-3b0a-4f43-9a52-2a1d6c7a9e10",
    tipoCaptacao: "ANIMACAO",
    ocorridoEm: "2026-11-10T12:00:00Z",
    detalhes
  });

  it("criado e atualizado informam orcamento e data de entrega", () => {
    const criado = mensagensDoEventoProjeto(projeto("PROJETO_CRIADO", { orcamentoTotal: 20000, dataEntrega: "2026-12-01" }));
    expect(criado.map((m) => m.canal)).toEqual(["EMAIL", "MENSAGEM_INTERNA"]);
    expect(criado[0].corpo).toBe("Projeto ANIMACAO 6d0b2c88 criado: orçamento 20000, entrega em 2026-12-01");
    const atualizado = mensagensDoEventoProjeto(projeto("PROJETO_ATUALIZADO", { orcamentoTotal: 33000, dataEntrega: "2026-12-20" }));
    expect(atualizado[0].corpo).toContain("atualizado: orçamento 33000, entrega em 2026-12-20");
  });

  it("finalizado informa a quantidade de membros", () => {
    const [mail, interna] = mensagensDoEventoProjeto(projeto("PROJETO_FINALIZADO", { orcamentoTotal: 1200, quantidadeMembros: 3 }));
    expect(mail.corpo).toContain("finalizado com 3 membro(s)");
    expect(interna.assunto).toBe("PROJETO_FINALIZADO");
  });
});
