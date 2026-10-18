import { OrquestradorEquipe } from "./OrquestradorEquipe";
import { OrquestradorPadrao } from "./OrquestradorPadrao";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { FabricaProjeto } from "../fabricas/FabricaProjeto";
import { FabricaDocumentario } from "../fabricas/documentario/FabricaDocumentario";

const projeto = {
  orcamentoTotal: 1000,
  duracaoEstimadaMinutos: 60,
  dataEntrega: "2026-12-01",
  papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }]
} as Projeto;

const ana = { id: "1", nome: "Ana" } as Profissional;
const fabricaFake = { criarNotificador: () => ({ atualizar: () => {} }) } as unknown as FabricaProjeto;

/** Subclasse que registra a ordem em que o template chama cada etapa. */
class OrquestradorEspiao extends OrquestradorEquipe {
  constructor(public readonly chamadas: string[], private readonly valido = true) {
    super(fabricaFake);
  }
  protected validarRestricoes(): boolean {
    this.chamadas.push("validarRestricoes");
    return this.valido;
  }
  protected normalizarDados(_p: Projeto, profissionais: Profissional[]): Profissional[] {
    this.chamadas.push("normalizarDados");
    return profissionais;
  }
  protected posProcessar(r: Map<Papel, Profissional[]>): Map<Papel, Profissional[]> {
    this.chamadas.push("posProcessar");
    return r;
  }
}

describe("OrquestradorEquipe (Template Method)", () => {
  it("executa as etapas sempre na mesma ordem", () => {
    const chamadas: string[] = [];
    const estrategia: RecomendacaoStrategy = {
      recomendar: () => {
        chamadas.push("recomendar");
        return new Map([[Papel.DIRETOR, [ana]]]);
      }
    };

    new OrquestradorEspiao(chamadas).orquestrar(projeto, [ana], estrategia);

    expect(chamadas).toEqual(["validarRestricoes", "normalizarDados", "recomendar", "posProcessar"]);
  });

  it("interrompe o fluxo na validacao, sem executar as etapas seguintes", () => {
    const chamadas: string[] = [];
    const estrategia: RecomendacaoStrategy = { recomendar: jest.fn() };

    expect(() => new OrquestradorEspiao(chamadas, false).orquestrar(projeto, [ana], estrategia)).toThrow();

    expect(chamadas).toEqual(["validarRestricoes"]);
  });

  it("subclasses diferentes mudam o resultado, nao o fluxo", () => {
    const estrategia: RecomendacaoStrategy = {
      recomendar: () => new Map([[Papel.DIRETOR, [ana]]])
    };
    class SemRanking extends OrquestradorPadrao {
      protected posProcessar(r: Map<Papel, Profissional[]>): Map<Papel, Profissional[]> {
        return new Map([...r].map(([papel]) => [papel, []]));
      }
    }

    const fabrica = new FabricaDocumentario();
    const valido = fabrica.criarProjeto({
      duracaoEstimadaMinutos: 60,
      orcamentoTotal: 1000,
      dataEntrega: "2026-12-01",
      tema: "Rios",
      entrevistados: ["Ana"]
    });

    const padrao = new OrquestradorPadrao(fabrica).orquestrar(valido, [ana], estrategia);
    const vazio = new SemRanking(fabrica).orquestrar(valido, [ana], estrategia);

    expect(padrao.membros).toHaveLength(1);
    expect(vazio.membros).toHaveLength(0);
  });

  it("recusa subclasse que tente sobrescrever o template orquestrar()", () => {
    class Violador extends OrquestradorPadrao {
      orquestrar(): never {
        throw new Error("fluxo alterado");
      }
    }

    expect(() => new Violador(new FabricaDocumentario())).toThrow("nao pode ser sobrescrito");
  });
});
