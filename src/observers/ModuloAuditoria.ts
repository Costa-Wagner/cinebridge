import { Observador } from "./Observador";
import { EventoRecomendacao } from "./EventoRecomendacao";

/**
 * Trilha de auditoria: um registro JSON por evento, uma linha por registro
 * (formato facil de filtrar e de enviar a qualquer agregador de logs).
 */
export interface RegistroAuditoria {
  origem: "AUDITORIA";
  em: string;
  evento: string;
  projetoId: string;
  tipoProjeto: string;
  papel: string | null;
  profissionais: string[];
  quantidade: number;
}

export class ModuloAuditoria implements Observador {
  constructor(
    private readonly saida: (linha: string) => void = console.log,
    private readonly agora: () => Date = () => new Date()
  ) {}

  atualizar(evento: EventoRecomendacao): void {
    const registro: RegistroAuditoria = {
      origem: "AUDITORIA",
      em: this.agora().toISOString(),
      evento: evento.tipo,
      projetoId: evento.projeto.id,
      tipoProjeto: evento.projeto.tipoCaptacao,
      papel: evento.papel,
      profissionais: evento.candidatos.map((c) => c.id),
      quantidade: evento.candidatos.length
    };
    this.saida(JSON.stringify(registro));
  }
}
