import { BarramentoEventos, EquipeFormadaPayload, TOPICO_EQUIPE_FORMADA } from "./BarramentoEventos";

/**
 * Representam os outros microsservicos que reagem a equipe formada
 * (gerenciamento de projetos e processamento financeiro). Aqui apenas
 * registram o efeito; em producao seriam servicos separados na fila.
 */
export function registrarConsumidoresExternos(
  barramento: BarramentoEventos,
  saida: (mensagem: string) => void = console.log
): void {
  barramento.assinar(TOPICO_EQUIPE_FORMADA, (evento: EquipeFormadaPayload) => {
    saida(`[GERENCIAMENTO_PROJETOS] iniciando fluxo de trabalho do projeto ${evento.projetoId} com ${evento.membros.length} membro(s)`);
  });
  barramento.assinar(TOPICO_EQUIPE_FORMADA, (evento: EquipeFormadaPayload) => {
    saida(`[FINANCEIRO] provisionando pagamentos do projeto ${evento.projetoId} (orcamento ${evento.orcamentoTotal})`);
  });
}
