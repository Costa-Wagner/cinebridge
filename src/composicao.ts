import { SistemaRecomendacao } from "./observers/SistemaRecomendacao";
import { ServicoEmail } from "./observers/ServicoEmail";
import { ServicoMensagensInternas } from "./observers/ServicoMensagensInternas";
import { ModuloAuditoria } from "./observers/ModuloAuditoria";
import { FabricaDocumentario } from "./fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "./fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "./fabricas/publicitario/FabricaPublicitario";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";

/** Raiz de composicao: registra as fabricas e os observadores da aplicacao. */
export function montarSistema(): SistemaRecomendacao {
  const sistema = new SistemaRecomendacao();
  sistema.registrarFabrica(TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario());
  sistema.registrarFabrica(TipoCaptacao.ANIMACAO, new FabricaAnimacao());
  sistema.registrarFabrica(TipoCaptacao.PUBLICITARIO, new FabricaPublicitario());
  sistema.adicionarObservador(new ServicoEmail());
  sistema.adicionarObservador(new ServicoMensagensInternas());
  sistema.adicionarObservador(new ModuloAuditoria());
  return sistema;
}
