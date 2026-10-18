import { SistemaRecomendacao } from "./SistemaRecomendacao";
import { Observador } from "./Observador";
import { FabricaDocumentario } from "../fabricas/documentario/FabricaDocumentario";
import { FabricaAnimacao } from "../fabricas/animacao/FabricaAnimacao";
import { FabricaPublicitario } from "../fabricas/publicitario/FabricaPublicitario";
import { TipoSemFabricaError } from "../fabricas/TipoSemFabricaError";
import { ProjetoInvalidoError } from "../orquestrador/ProjetoInvalidoError";
import { ProjetoDocumentario } from "../domain/entities/ProjetoDocumentario";
import { ProjetoAnimacao } from "../domain/entities/ProjetoAnimacao";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { TipoEvento } from "./TipoEvento";

const base = { duracaoEstimadaMinutos: 90, orcamentoTotal: 50000, dataEntrega: "2026-12-01" };
const alice = { id: "1", nome: "Alice" } as Profissional;

beforeAll(() => jest.spyOn(console, "log").mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

function criarSistema() {
  const documentario = new FabricaDocumentario();
  const animacao = new FabricaAnimacao();
  const sistema = new SistemaRecomendacao();
  sistema.registrarFabrica(TipoCaptacao.DOCUMENTARIO, documentario);
  sistema.registrarFabrica(TipoCaptacao.ANIMACAO, animacao);
  return { sistema, documentario, animacao };
}

describe("SistemaRecomendacao: selecao de fabrica por tipo", () => {
  it("devolve a fabrica registrada e falha para tipo sem fabrica", () => {
    const { sistema, animacao } = criarSistema();

    expect(sistema.obterFabrica(TipoCaptacao.ANIMACAO)).toBe(animacao);
    expect(() => sistema.obterFabrica(TipoCaptacao.PUBLICITARIO)).toThrow(TipoSemFabricaError);
  });

  it("criarProjeto usa a fabrica do tipo informado", () => {
    const { sistema } = criarSistema();

    const projeto = sistema.criarProjeto(TipoCaptacao.DOCUMENTARIO, { ...base, tema: "Rios", entrevistados: ["Ana"] });

    expect(projeto).toBeInstanceOf(ProjetoDocumentario);
  });

  it("criarProjeto recusa dados invalidos com a lista de problemas", () => {
    const { sistema } = criarSistema();

    try {
      sistema.criarProjeto(TipoCaptacao.ANIMACAO, { ...base });
      fail("deveria lancar ProjetoInvalidoError");
    } catch (erro) {
      expect(erro).toBeInstanceOf(ProjetoInvalidoError);
      expect((erro as ProjetoInvalidoError).problemas.join(" ")).toContain("Projeto (novo): animacao exige software");
    }
  });

  it("criarProjeto falha para tipo sem fabrica", () => {
    expect(() => criarSistema().sistema.criarProjeto(TipoCaptacao.PUBLICITARIO, base)).toThrow(TipoSemFabricaError);
  });

  it("recomendar usa somente a fabrica do tipo do projeto", () => {
    const { sistema, documentario, animacao } = criarSistema();
    const espiaoAnimacao = jest.spyOn(animacao, "criarRecomendador");
    const espiaoDocumentario = jest.spyOn(documentario, "criarRecomendador");
    const projeto = sistema.criarProjeto(TipoCaptacao.ANIMACAO, { ...base, softwareModelagem: "Blender" });

    const equipe = sistema.recomendar(projeto, []);

    expect(equipe.projeto).toBeInstanceOf(ProjetoAnimacao);
    expect(espiaoAnimacao).toHaveBeenCalledTimes(1);
    expect(espiaoDocumentario).not.toHaveBeenCalled();
  });

  it("recomendar falha quando o tipo do projeto nao tem fabrica", () => {
    const { sistema } = criarSistema();
    const projeto = new FabricaPublicitario().criarProjeto({ ...base, cliente: "Acme", canal: "TV" });

    expect(() => sistema.recomendar(projeto, [])).toThrow(TipoSemFabricaError);
  });

  it("recomendar aceita estrategia explicita e avisa os observadores do sistema", () => {
    const { sistema } = criarSistema();
    const observador: Observador = { atualizar: jest.fn() };
    sistema.adicionarObservador(observador);
    const projeto = sistema.criarProjeto(TipoCaptacao.DOCUMENTARIO, { ...base, tema: "Rios", entrevistados: ["Ana"] });
    const estrategia: RecomendacaoStrategy = {
      recomendar: () => new Map([[Papel.DIRETOR, [alice]]])
    };

    const equipe = sistema.recomendar(projeto, [alice], estrategia);

    expect(equipe.membros.map((m) => m.profissional)).toEqual([alice]);
    expect(observador.atualizar).toHaveBeenCalledWith({ tipo: TipoEvento.RECOMENDACAO_GERADA, projeto, papel: Papel.DIRETOR, candidatos: [alice] });
  });

  it("aplica o limite de candidatos configurado no sistema", () => {
    const sistema = new SistemaRecomendacao(1);
    sistema.registrarFabrica(TipoCaptacao.DOCUMENTARIO, new FabricaDocumentario());
    const outra = { id: "2", nome: "Outra" } as Profissional;
    const projeto = sistema.criarProjeto(TipoCaptacao.DOCUMENTARIO, { ...base, tema: "Rios", entrevistados: ["Ana"] });

    const equipe = sistema.recomendar(projeto, [alice, outra], {
      recomendar: () => new Map([[Papel.DIRETOR, [alice, outra]]])
    });

    expect(equipe.ranking.get(Papel.DIRETOR)).toEqual([alice]);
  });
});
