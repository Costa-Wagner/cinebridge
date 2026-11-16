import { SistemaRecomendacao } from "./observers/SistemaRecomendacao";
import { ServicoEmail } from "./observers/ServicoEmail";
import { ServicoMensagensInternas } from "./observers/ServicoMensagensInternas";
import { ModuloAuditoria } from "./observers/ModuloAuditoria";
import { FabricaDocumentario } from "./fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "./fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "./fabricas/publicitario/FabricaPublicitario";
import { IntegradorMicrosservicos } from "./observers/IntegradorMicrosservicos";
import { PublicadorNotificacoes } from "./observers/PublicadorNotificacoes";
import { BarramentoEmMemoria, BarramentoEventos } from "./eventos/BarramentoEventos";
import { registrarConsumidoresExternos } from "./eventos/consumidoresExternos";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";
import { AdaptadorLocal } from "./adaptadores/armazenamento/AdaptadorLocal";
import { AdaptadorStripe } from "./adaptadores/pagamento/AdaptadorStripe";
import * as os from "os";
import * as path from "path";

/** Raiz de composicao: registra as fabricas e os observadores da aplicacao. */
export function montarSistema(
  barramento: BarramentoEventos = new BarramentoEmMemoria(),
  // Modo local (barramento em memoria): e-mail, mensagens e consumidores simulados rodam dentro da api.
  // Com RabbitMQ esses papeis sao dos outros servicos (cinebridge-notificacoes e cinebridge-projetos).
  modoLocal: boolean = barramento instanceof BarramentoEmMemoria
): SistemaRecomendacao {
  const sistema = new SistemaRecomendacao();
  sistema.registrarFabrica(TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario());
  sistema.registrarFabrica(TipoCaptacao.ANIMACAO, new FabricaAnimacao());
  sistema.registrarFabrica(TipoCaptacao.PUBLICITARIO, new FabricaPublicitario());
  // O adaptador de profissionais (AdaptadorInterno) e' injetado pelo ServicoProjetos, que tem o catalogo.
  sistema.configurarAdaptadores({
    armazenamento: new AdaptadorLocal(process.env.ARMAZENAMENTO_DIR ?? path.join(os.tmpdir(), "cinebridge-midia")),
    pagamento: new AdaptadorStripe()
  });
  if (modoLocal) {
    sistema.adicionarObservador(new ServicoEmail());
    sistema.adicionarObservador(new ServicoMensagensInternas());
  } else {
    sistema.adicionarObservador(new PublicadorNotificacoes(barramento));
  }
  sistema.adicionarObservador(new ModuloAuditoria());
  sistema.adicionarObservador(new IntegradorMicrosservicos(barramento));
  if (modoLocal) registrarConsumidoresExternos(barramento);
  return sistema;
}
