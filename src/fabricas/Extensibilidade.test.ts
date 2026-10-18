import { readFileSync } from "fs";
import { join } from "path";
import { DadosProjeto, FabricaProjeto } from "./FabricaProjeto";
import { ValidadorPorTipo } from "./ValidadorPorTipo";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { Observador } from "../observers/Observador";
import { ProjetoInvalidoError } from "../orquestrador/ProjetoInvalidoError";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { Papel } from "../domain/enums/Papel";
import { TipoEvento } from "../observers/TipoEvento";

/**
 * Um tipo de projeto novo (realidade virtual), definido so aqui no teste:
 * entra no sistema registrando uma fabrica, sem tocar no orquestrador.
 */
const REALIDADE_VIRTUAL = "REALIDADE_VIRTUAL" as TipoCaptacao;

class ProjetoRealidadeVirtual extends Projeto {
  plataforma!: string;

  clonar(): ProjetoRealidadeVirtual {
    const copia = super.clonar() as ProjetoRealidadeVirtual;
    copia.plataforma = this.plataforma;
    return copia;
  }
}

class ValidadorRealidadeVirtual extends ValidadorPorTipo<ProjetoRealidadeVirtual> {
  protected readonly tipoEsperado = ProjetoRealidadeVirtual;

  protected validarEspecifico(projeto: ProjetoRealidadeVirtual): void {
    if (!projeto.plataforma) this.problemas.push(`${this.rotulo(projeto)}: realidade virtual exige plataforma`);
  }
}

const notificadorRV: Observador = { atualizar: jest.fn() };
const recomendadorRV: RecomendacaoStrategy = {
  recomendar: (projeto, profissionais) =>
    new Map(projeto.papeisObrigatorios.map(({ papel }) => [papel as Papel, profissionais])) as never
};

class FabricaRealidadeVirtual extends FabricaProjeto {
  private readonly modelo = (() => {
    const modelo = new ProjetoRealidadeVirtual();
    modelo.genero = "Realidade Virtual";
    modelo.tipoCaptacao = REALIDADE_VIRTUAL;
    modelo.plataforma = "";
    modelo.papeisObrigatorios = [{ papel: Papel.DIRETOR, peso: 10 }];
    return modelo;
  })();

  criarProjeto(dados: DadosProjeto): ProjetoRealidadeVirtual {
    return this.instanciar(this.modelo, dados, ["plataforma"]);
  }
  criarValidador(): ValidadorRealidadeVirtual {
    return new ValidadorRealidadeVirtual();
  }
  criarRecomendador(): RecomendacaoStrategy {
    return recomendadorRV;
  }
  criarNotificador(): Observador {
    return notificadorRV;
  }
}

describe("novo tipo de projeto sem alterar o orquestrador (Abstract Factory)", () => {
  const base = { duracaoEstimadaMinutos: 30, orcamentoTotal: 9000, dataEntrega: "2026-12-01" };
  const ana = { id: "1", nome: "Ana" } as Profissional;

  it("basta registrar a fabrica: criacao, validacao, recomendacao e notificacao funcionam", () => {
    const sistema = new SistemaRecomendacao();
    sistema.registrarFabrica(REALIDADE_VIRTUAL, new FabricaRealidadeVirtual());

    const projeto = sistema.criarProjeto(REALIDADE_VIRTUAL, { ...base, plataforma: "Quest" });
    const equipe = sistema.recomendar(projeto, [ana]);

    expect(projeto).toBeInstanceOf(ProjetoRealidadeVirtual);
    expect(equipe.membros.map((m) => [m.papel, m.profissional])).toEqual([[Papel.DIRETOR, ana]]);
    expect(notificadorRV.atualizar).toHaveBeenCalledWith({ tipo: TipoEvento.RECOMENDACAO_GERADA, projeto, papel: Papel.DIRETOR, candidatos: [ana] });
  });

  it("o validador do novo tipo aplica as proprias regras", () => {
    const sistema = new SistemaRecomendacao();
    sistema.registrarFabrica(REALIDADE_VIRTUAL, new FabricaRealidadeVirtual());

    expect(() => sistema.criarProjeto(REALIDADE_VIRTUAL, base)).toThrow(ProjetoInvalidoError);
  });

  it.each([
    "orquestrador/OrquestradorEquipe.ts",
    "orquestrador/OrquestradorPadrao.ts",
    "observers/SistemaRecomendacao.ts"
  ])("%s nao menciona nenhum tipo de projeto concreto", (arquivo) => {
    const codigo = readFileSync(join(__dirname, "..", arquivo), "utf8");

    expect(codigo).not.toMatch(/Documentario|Animacao|Publicitario|RealidadeVirtual/);
    expect(codigo).not.toMatch(/TipoCaptacao\.[A-Z]/);
  });
});
