import { DadosProjeto, FabricaProjeto } from "../FabricaProjeto";
import { ProjetoAnimacao } from "../../domain/entities/ProjetoAnimacao";
import { Papel } from "../../domain/enums/Papel";
import { ValidadorAnimacao } from "./ValidadorAnimacao";
import { RecomendadorAnimacao } from "./RecomendadorAnimacao";
import { NotificadorAnimacao } from "./NotificadorAnimacao";

function modeloAnimacao(): ProjetoAnimacao {
  const modelo = new ProjetoAnimacao();
  modelo.genero = "Animação";
  modelo.duracaoEstimadaMinutos = 0;
  modelo.orcamentoTotal = 0;
  modelo.dataEntrega = "";
  modelo.softwareModelagem = "";
  modelo.metricasRenderizacao = [];
  modelo.papeisObrigatorios = [
    { papel: Papel.DIRETOR, peso: 10 },
    { papel: Papel.ESPECIALISTA_EFEITOS_VISUAIS, peso: 10 },
    { papel: Papel.ROTEIRISTA, peso: 8 },
    { papel: Papel.EDITOR, peso: 7 },
    { papel: Papel.SONOPLASTA, peso: 6 }
  ];
  return modelo;
}

export class FabricaAnimacao extends FabricaProjeto {
  private readonly modelo = modeloAnimacao();

  criarProjeto(dados: DadosProjeto): ProjetoAnimacao {
    return this.instanciar(this.modelo, dados, ["softwareModelagem", "metricasRenderizacao"]);
  }

  criarValidador(): ValidadorAnimacao {
    return new ValidadorAnimacao();
  }

  criarRecomendador(): RecomendadorAnimacao {
    return new RecomendadorAnimacao();
  }

  criarNotificador(): NotificadorAnimacao {
    return new NotificadorAnimacao();
  }
}
