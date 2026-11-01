import { ServicoAtomico } from "./ServicoAtomico";
import { PacoteServico } from "./PacoteServico";
import { ServicoInvalidoError } from "./ServicoProjeto";
import { servicoDeJSON, pacoteDePapeis, coletarAtomicos, papeisDaArvore } from "./arvore";
import { Papel } from "../enums/Papel";
import { Projeto } from "../entities/Projeto";
import { FabricaDocumentario } from "../../fabricas/documentario/FabricaDocumentario";
import { ProjetoInvalidoError } from "../../orquestrador/ProjetoInvalidoError";
import { ValidadorConsistencia } from "../../visitors/ValidadorConsistencia";

const edicao = () => new ServicoAtomico("Edicao", Papel.EDITOR, 8, 1000, 5);
const cor = () => new ServicoAtomico("Coloracao", Papel.DIRETOR_FOTOGRAFIA, 6, 500, 3);
const mixagem = () => new ServicoAtomico("Mixagem", Papel.SONOPLASTA, 6, 700, 4);

/** posProducao(edicao, cor, subpacote(mixagem, vfx)) com 3 niveis. */
function arvore(modo: "SEQUENCIAL" | "PARALELO" = "SEQUENCIAL") {
  const vfx = new ServicoAtomico("VFX", Papel.ESPECIALISTA_EFEITOS_VISUAIS, 5, 2000, 10);
  const audio = new PacoteServico("Audio", [mixagem(), vfx], modo);
  return new PacoteServico("Pos-producao", [edicao(), cor(), audio], modo);
}

describe("Composite: ServicoAtomico", () => {
  it("responde pela mesma interface, sem filhos", () => {
    const s = edicao();
    expect(s.calcularCusto()).toBe(1000);
    expect(s.obterPrazo()).toBe(5);
    expect(s.listarSubservicos()).toEqual([]);
    expect(s.validar()).toEqual([]);
  });

  it("validar acusa papel, peso, custo e prazo invalidos", () => {
    const ruim = new ServicoAtomico("", "CAMERA" as Papel, 11, -1, 0);
    expect(ruim.validar()).toEqual([
      "Servico sem nome",
      'Servico "": papel invalido (CAMERA)',
      'Servico "": peso invalido (11)',
      'Servico "": custo invalido (-1)',
      'Servico "": prazo invalido (0)'
    ]);
  });
});

describe("Composite: PacoteServico", () => {
  it("custo e' somado recursivamente em varios niveis", () => {
    expect(arvore().calcularCusto()).toBe(1000 + 500 + 700 + 2000);
  });

  it("prazo: sequencial soma, paralelo usa o maior", () => {
    expect(arvore("SEQUENCIAL").obterPrazo()).toBe(5 + 3 + (4 + 10));
    expect(arvore("PARALELO").obterPrazo()).toBe(10);
    expect(new PacoteServico("vazio").obterPrazo()).toBe(0);
  });

  it("listarSubservicos devolve copia dos filhos diretos; adicionar/remover", () => {
    const pacote = new PacoteServico("p", [edicao()]);
    const extra = cor();
    pacote.adicionar(extra).adicionar(mixagem());
    expect(pacote.listarSubservicos()).toHaveLength(3);
    pacote.listarSubservicos().pop();
    expect(pacote.listarSubservicos()).toHaveLength(3);
    expect(pacote.remover(extra)).toBe(true);
    expect(pacote.remover(extra)).toBe(false);
    expect(pacote.calcularCusto()).toBe(1700);
  });

  it("validar e' recursivo e acusa pacote vazio e folha invalida em qualquer nivel", () => {
    const raiz = new PacoteServico("raiz", [
      new PacoteServico("interno", [new ServicoAtomico("X", Papel.EDITOR, 5, -2, 1)]),
      new PacoteServico("vazio")
    ]);
    expect(raiz.validar()).toEqual(['Servico "X": custo invalido (-2)', 'Pacote "vazio": nenhum servico']);
    expect(new PacoteServico("", [edicao()]).validar()).toEqual(["Pacote sem nome"]);
    expect(arvore().validar()).toEqual([]);
  });
});

describe("serializacao e derivacao dos papeis", () => {
  it("JSON ida e volta preserva a arvore (toJSON == paraJSON)", () => {
    const original = arvore("PARALELO");
    const copia = servicoDeJSON(JSON.parse(JSON.stringify(original)));
    expect(copia.paraJSON()).toEqual(original.paraJSON());
    expect(copia).not.toBe(original);
    expect(copia.calcularCusto()).toBe(original.calcularCusto());
  });

  it("formato desconhecido ou pacote sem lista = ServicoInvalidoError", () => {
    expect(() => servicoDeJSON({ tipo: "X" } as never)).toThrow(ServicoInvalidoError);
    expect(() => servicoDeJSON(undefined as never)).toThrow(ServicoInvalidoError);
    expect(() => servicoDeJSON({ tipo: "PACOTE", nome: "p" } as never)).toThrow("lista de servicos ausente");
  });

  it("papeis derivados das folhas, em ordem; pacoteDePapeis cria um atomico por papel", () => {
    expect(coletarAtomicos(arvore()).map((a) => a.nome)).toEqual(["Edicao", "Coloracao", "Mixagem", "VFX"]);
    expect(papeisDaArvore(arvore())).toEqual([
      { papel: Papel.EDITOR, peso: 8 },
      { papel: Papel.DIRETOR_FOTOGRAFIA, peso: 6 },
      { papel: Papel.SONOPLASTA, peso: 6 },
      { papel: Papel.ESPECIALISTA_EFEITOS_VISUAIS, peso: 5 }
    ]);
    const plano = pacoteDePapeis([{ papel: Papel.DIRETOR, peso: 10 }]);
    expect(plano.listarSubservicos()).toHaveLength(1);
    expect(plano.calcularCusto()).toBe(0);
  });
});

describe("Projeto com servicoPrincipal", () => {
  const dados = { duracaoEstimadaMinutos: 60, orcamentoTotal: 9000, dataEntrega: "2026-12-01", tema: "Rios", entrevistados: ["Ana"] };

  it("custo, prazo e papeis delegam a raiz da arvore", () => {
    const projeto = new FabricaDocumentario().criarProjeto({ ...dados, servicoPrincipal: arvore().paraJSON() });
    expect(projeto.calcularCustoTotal()).toBe(4200);
    expect(projeto.obterPrazoTotal()).toBe(22);
    expect(projeto.papeisObrigatorios.map((p) => p.papel)).toEqual([
      Papel.EDITOR, Papel.DIRETOR_FOTOGRAFIA, Papel.SONOPLASTA, Papel.ESPECIALISTA_EFEITOS_VISUAIS
    ]);
    expect(projeto.validarServicos()).toEqual([]);
  });

  it("sem servicoPrincipal informado, usa os papeis (plano) e continua valido", () => {
    const projeto = new FabricaDocumentario().criarProjeto({
      ...dados,
      papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }]
    });
    expect(projeto.papeisObrigatorios).toEqual([{ papel: Papel.DIRETOR, peso: 10 }]);
    expect(projeto.servicoPrincipal.listarSubservicos()).toHaveLength(1);
  });

  it("servicoPrincipal tem precedencia sobre papeisObrigatorios", () => {
    const projeto = new FabricaDocumentario().criarProjeto({
      ...dados,
      papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }],
      servicoPrincipal: edicao().paraJSON()
    });
    expect(projeto.papeisObrigatorios).toEqual([{ papel: Papel.EDITOR, peso: 8 }]);
  });

  it("arvore malformada vira ProjetoInvalidoError; arvore invalida e' barrada pelo validador", () => {
    const fabrica = new FabricaDocumentario();
    expect(() => fabrica.criarProjeto({ ...dados, servicoPrincipal: { tipo: "X" } as never })).toThrow(ProjetoInvalidoError);

    const projeto = fabrica.criarProjeto({ ...dados, servicoPrincipal: new PacoteServico("vazio").paraJSON() });
    const validador = new ValidadorConsistencia();
    expect(projeto.aceitar(validador)).toBe(false);
    expect(validador.problemas.join("\n")).toContain('Pacote "vazio": nenhum servico');
  });

  it("clonar copia a arvore em profundidade", () => {
    const projeto = new FabricaDocumentario().criarProjeto({ ...dados, servicoPrincipal: arvore().paraJSON() });
    const copia = projeto.clonar();
    expect(copia.servicoPrincipal).not.toBe(projeto.servicoPrincipal);
    expect(copia.servicoPrincipal.paraJSON()).toEqual(projeto.servicoPrincipal.paraJSON());
    (projeto.servicoPrincipal as PacoteServico).adicionar(edicao());
    expect(copia.calcularCustoTotal()).toBe(4200);
  });

  it("toJSON expoe papeisObrigatorios derivado e a arvore", () => {
    const projeto = new FabricaDocumentario().criarProjeto({ ...dados, servicoPrincipal: edicao().paraJSON() });
    const json = JSON.parse(JSON.stringify(projeto));
    expect(json.papeisObrigatorios).toEqual([{ papel: Papel.EDITOR, peso: 8 }]);
    expect(json.servicoPrincipal).toEqual(edicao().paraJSON());
  });

  it("projeto sem arvore: papeis vazios e validarServicos informa", () => {
    const vazio = new Projeto();
    expect(vazio.papeisObrigatorios).toEqual([]);
    expect(vazio.validarServicos()).toEqual(["Projeto sem servico principal"]);
  });
});
