import { DadosProjeto, FabricaProjeto } from "../FabricaProjeto";
import { ProjetoPublicitario } from "../../domain/entities/ProjetoPublicitario";
import { Papel } from "../../domain/enums/Papel";
import { ValidadorPublicitario } from "./ValidadorPublicitario";
import { RecomendadorPublicitario } from "./RecomendadorPublicitario";
import { NotificadorPublicitario } from "./NotificadorPublicitario";

function modeloPublicitario(): ProjetoPublicitario {
  const modelo = new ProjetoPublicitario();
  modelo.genero = "Publicidade";
  modelo.duracaoEstimadaMinutos = 0;
  modelo.orcamentoTotal = 0;
  modelo.dataEntrega = "";
  modelo.cliente = "";
  modelo.canal = "";
  modelo.papeisObrigatorios = [
    { papel: Papel.DIRETOR, peso: 9 },
    { papel: Papel.DIRETOR_FOTOGRAFIA, peso: 9 },
    { papel: Papel.EDITOR, peso: 8 }
  ];
  return modelo;
}

export class FabricaPublicitario extends FabricaProjeto {
  private readonly modelo = modeloPublicitario();

  criarProjeto(dados: DadosProjeto): ProjetoPublicitario {
    return this.instanciar(this.modelo, dados, ["cliente", "canal"]);
  }

  criarValidador(): ValidadorPublicitario {
    return new ValidadorPublicitario();
  }

  criarRecomendador(): RecomendadorPublicitario {
    return new RecomendadorPublicitario();
  }

  criarNotificador(): NotificadorPublicitario {
    return new NotificadorPublicitario();
  }
}
