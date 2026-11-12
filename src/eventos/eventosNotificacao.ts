/** Fila em que a api publica os eventos da recomendacao (convites, equipe...) para o cinebridge-notificacoes. */
export const FILA_EVENTOS_NOTIFICACOES = "eventos-notificacoes";

export interface EventoNotificacaoPayload {
  tipo: string; // TipoEvento da api (RECOMENDACAO_GERADA, CONVITE_ACEITO...)
  projetoId: string;
  genero: string;
  papel: string | null;
  totalCandidatos: number;
  profissionais: { id: string; nome: string; email: string }[];
  ocorridoEm: string;
}
