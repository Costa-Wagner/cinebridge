import { CanalNotificacao } from "./Notificacao";
import { EventoNotificacaoPayload } from "../../eventos/eventosNotificacao";
import { EventoProjeto } from "../../eventos/eventosProjeto";

export interface MensagemNotificacao {
  canal: CanalNotificacao;
  destinatario: string;
  assunto: string;
  corpo: string;
}

const PRODUTOR = "produtor";

const email = (destinatario: string, assunto: string, corpo: string): MensagemNotificacao => ({ canal: "EMAIL", destinatario, assunto, corpo });
const interna = (assunto: string, corpo: string): MensagemNotificacao => ({ canal: "MENSAGEM_INTERNA", destinatario: PRODUTOR, assunto, corpo });

/** Mensagens de um evento da recomendacao (publicado pela api): um e-mail e um aviso interno ao produtor. */
export function mensagensDoEventoRecomendacao(e: EventoNotificacaoPayload): MensagemNotificacao[] {
  const projeto = `"${e.genero}"`;
  const profissional = e.profissionais[0];
  const nome = profissional?.nome ?? "nenhum";
  const alvo = e.papel ?? "equipe completa";
  const resumo = interna(e.tipo, `${e.tipo} (${alvo}): ${e.profissionais.map((p) => p.nome).join(", ")}`);

  switch (e.tipo) {
    case "RECOMENDACAO_GERADA":
      return [
        email(PRODUTOR, "Nova recomendação", `Nova recomendação para o papel ${e.papel} do projeto ${projeto}: melhor candidato ${nome}`),
        interna(e.tipo, `${e.totalCandidatos} profissionais ranqueados para ${e.papel}`)
      ];
    case "CONVITE_ENVIADO":
      return [email(profissional?.email ?? nome, "Convite para projeto", `Convite para ${e.papel} no projeto ${projeto}`), resumo];
    case "CONVITE_ACEITO":
      return [email(PRODUTOR, "Convite aceito", `${nome} aceitou o convite para ${e.papel} (projeto ${projeto})`), resumo];
    case "CONVITE_RECUSADO":
      return [email(PRODUTOR, "Convite recusado", `${nome} recusou o convite para ${e.papel} (projeto ${projeto})`), resumo];
    case "MEMBRO_SUBSTITUIDO":
      return [
        email(profissional?.email ?? nome, "Atualização do convite", `O produtor optou por outro profissional para ${e.papel} (projeto ${projeto})`),
        resumo
      ];
    case "EQUIPE_FORMADA":
      return [email(PRODUTOR, "Equipe formada", `Equipe do projeto ${projeto} formada com ${e.profissionais.length} membro(s)`), resumo];
    default:
      return [resumo];
  }
}

/** Mensagens de um evento do ciclo de vida do projeto (publicado pelo cinebridge-projetos). */
export function mensagensDoEventoProjeto(e: EventoProjeto): MensagemNotificacao[] {
  const projeto = `${e.tipoCaptacao} ${e.projetoId.slice(0, 8)}`;
  const d = e.detalhes as { orcamentoTotal?: number; dataEntrega?: string; quantidadeMembros?: number };
  switch (e.tipo) {
    case "PROJETO_CRIADO":
      return [
        email(PRODUTOR, "Projeto criado", `Projeto ${projeto} criado: orçamento ${d.orcamentoTotal}, entrega em ${d.dataEntrega}`),
        interna(e.tipo, `Projeto ${projeto} registrado`)
      ];
    case "PROJETO_ATUALIZADO":
      return [
        email(PRODUTOR, "Projeto atualizado", `Projeto ${projeto} atualizado: orçamento ${d.orcamentoTotal}, entrega em ${d.dataEntrega}`),
        interna(e.tipo, `Projeto ${projeto} atualizado`)
      ];
    case "PROJETO_FINALIZADO":
      return [
        email(PRODUTOR, "Projeto finalizado", `Projeto ${projeto} finalizado com ${d.quantidadeMembros} membro(s); orçamento ${d.orcamentoTotal}`),
        interna(e.tipo, `Projeto ${projeto} finalizado`)
      ];
  }
}
