import { DadosProjeto, FabricaProjeto } from "../FabricaProjeto";
import { ProjetoDocumentario } from "../../domain/entities/ProjetoDocumentario";
import { Papel } from "../../domain/enums/Papel";
import { ValidadorDocumentario } from "./ValidadorDocumentario";
import { RecomendadorDocumentario } from "./RecomendadorDocumentario";
import { NotificadorDocumentario } from "./NotificadorDocumentario";

function modeloDocumentario(): ProjetoDocumentario {
  const modelo = new ProjetoDocumentario();
  modelo.genero = "Documentário";
  modelo.duracaoEstimadaMinutos = 0;
  modelo.orcamentoTotal = 0;
  modelo.dataEntrega = "";
  modelo.tema = "";
  modelo.entrevistados = [];
  modelo.papeisObrigatorios = [
    { papel: Papel.DIRETOR, peso: 10 },
    { papel: Papel.ROTEIRISTA, peso: 9 },
    { papel: Papel.DIRETOR_FOTOGRAFIA, peso: 8 },
    { papel: Papel.EDITOR, peso: 8 },
    { papel: Papel.SONOPLASTA, peso: 6 }
  ];
  return modelo;
}

export class FabricaDocumentario extends FabricaProjeto {
  private readonly modelo = modeloDocumentario();

  criarProjeto(dados: DadosProjeto): ProjetoDocumentario {
    return this.instanciar(this.modelo, dados, ["tema", "entrevistados"]);
  }

  criarValidador(): ValidadorDocumentario {
    return new ValidadorDocumentario();
  }

  criarRecomendador(): RecomendadorDocumentario {
    return new RecomendadorDocumentario();
  }

  criarNotificador(): NotificadorDocumentario {
    return new NotificadorDocumentario();
  }
}
