import { FabricaDocumentario } from "./documentario/FabricaDocumentario";
import { ValidadorDocumentario } from "./documentario/ValidadorDocumentario";
import { RecomendadorDocumentario } from "./documentario/RecomendadorDocumentario";
import { NotificadorDocumentario } from "./documentario/NotificadorDocumentario";
import { FabricaAnimacao } from "./animacao/FabricaAnimacao";
import { ValidadorAnimacao } from "./animacao/ValidadorAnimacao";
import { RecomendadorAnimacao } from "./animacao/RecomendadorAnimacao";
import { NotificadorAnimacao } from "./animacao/NotificadorAnimacao";
import { PontuacaoAnimacao } from "./animacao/PontuacaoAnimacao";
import { FabricaPublicitario } from "./publicitario/FabricaPublicitario";
import { ValidadorPublicitario } from "./publicitario/ValidadorPublicitario";
import { RecomendadorPublicitario } from "./publicitario/RecomendadorPublicitario";
import { NotificadorPublicitario } from "./publicitario/NotificadorPublicitario";
import { ProjetoDocumentario } from "../domain/entities/ProjetoDocumentario";
import { ProjetoAnimacao } from "../domain/entities/ProjetoAnimacao";
import { ProjetoPublicitario } from "../domain/entities/ProjetoPublicitario";
import { Papel } from "../domain/enums/Papel";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { Profissional } from "../domain/entities/Profissional";
import { EventoRecomendacao } from "../observers/EventoRecomendacao";
import { PontuacaoStrategy } from "../strategies/PontuacaoStrategy";
import { TipoEvento } from "../observers/TipoEvento";

const base = { duracaoEstimadaMinutos: 90, orcamentoTotal: 50000, dataEntrega: "2026-12-01" };
const papeisDe = (p: { papeisObrigatorios: { papel: Papel }[] }) => p.papeisObrigatorios.map((x) => x.papel);

describe("FabricaProjeto (base): criacao por Prototype", () => {
  it("clona o modelo da fabrica: cada projeto e' independente e o modelo nao muda", () => {
    const fabrica = new FabricaDocumentario();

    const a = fabrica.criarProjeto({ ...base, tema: "A", entrevistados: ["X"] });
    a.papeisObrigatorios[0].peso = 1;
    a.entrevistados.push("Y");
    const b = fabrica.criarProjeto({ ...base, tema: "B", entrevistados: ["Z"] });

    expect(b.papeisObrigatorios[0].peso).toBe(10);
    expect(b.entrevistados).toEqual(["Z"]);
    expect(b.tema).toBe("B");
  });

  it("aplica so campos conhecidos: id, discriminador e relacoes nao entram", () => {
    const projeto = new FabricaDocumentario().criarProjeto({
      ...base,
      id: "injetado",
      tipoCaptacao: TipoCaptacao.ANIMACAO,
      convites: ["x"]
    });

    expect(projeto.id).toBeUndefined();
    expect(projeto.tipoCaptacao).toBe(TipoCaptacao.DOCUMENTARIO);
    expect(projeto.convites).toBeUndefined();
  });

  it("permite substituir os papeis padrao do modelo (copia profunda)", () => {
    const papeis = [{ papel: Papel.DIRETOR, peso: 5 }];

    const projeto = new FabricaDocumentario().criarProjeto({ ...base, papeisObrigatorios: papeis });
    papeis[0].peso = 99;

    expect(projeto.papeisObrigatorios).toEqual([{ papel: Papel.DIRETOR, peso: 5 }]);
  });
});

describe("Familia Documentario", () => {
  const fabrica = new FabricaDocumentario();
  const valido = fabrica.criarProjeto({ ...base, tema: "Rios", entrevistados: ["Ana"] });

  it("cria projeto, validador, recomendador e notificador do tipo", () => {
    expect(valido).toBeInstanceOf(ProjetoDocumentario);
    expect(fabrica.criarValidador()).toBeInstanceOf(ValidadorDocumentario);
    expect(fabrica.criarRecomendador()).toBeInstanceOf(RecomendadorDocumentario);
    expect(fabrica.criarNotificador()).toBeInstanceOf(NotificadorDocumentario);
    expect(papeisDe(valido)).not.toContain(Papel.ESPECIALISTA_EFEITOS_VISUAIS);
  });

  it("validador aceita o projeto valido e aponta tema e entrevistados ausentes", () => {
    expect(valido.aceitar(fabrica.criarValidador())).toBe(true);

    const invalido = fabrica.criarProjeto({ ...base, tema: " ", entrevistados: [] });
    const validador = fabrica.criarValidador();
    expect(invalido.aceitar(validador)).toBe(false);
    expect(validador.problemas).toHaveLength(2);
  });

  it("validador recusa projeto de outro tipo", () => {
    const animacao = new FabricaAnimacao().criarProjeto({ ...base, softwareModelagem: "Blender" });
    const validador = fabrica.criarValidador();

    expect(animacao.aceitar(validador)).toBe(false);
    expect(validador.problemas[0]).toContain("esperado ProjetoDocumentario");
  });

  it("recomendador devolve um mapa com os papeis do projeto", () => {
    const mapa = fabrica.criarRecomendador().recomendar(valido, []);

    expect([...mapa.keys()]).toEqual(papeisDe(valido));
  });

  it("notificador descreve o tema e os entrevistados", () => {
    const saida = jest.fn();
    const evento = { tipo: TipoEvento.RECOMENDACAO_GERADA, projeto: valido, papel: Papel.DIRETOR, candidatos: [{}, {}] } as unknown as EventoRecomendacao;

    new NotificadorDocumentario(saida).atualizar(evento);

    expect(saida).toHaveBeenCalledWith(expect.stringContaining('tema "Rios"'));
    expect(saida).toHaveBeenCalledWith(expect.stringContaining("2 candidato(s)"));
  });

  it("notificador usa console.log por padrao e tolera entrevistados ausentes", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const projeto = { tema: "T" } as unknown as ProjetoDocumentario;

    new NotificadorDocumentario().atualizar({ tipo: TipoEvento.RECOMENDACAO_GERADA, projeto, papel: Papel.EDITOR, candidatos: [] });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("0 entrevistado(s)"));
    spy.mockRestore();
  });
});

describe("Familia Animacao", () => {
  const fabrica = new FabricaAnimacao();
  const valido = fabrica.criarProjeto({
    ...base,
    softwareModelagem: "Blender",
    metricasRenderizacao: ["tempo por quadro"]
  });

  it("cria projeto, validador, recomendador e notificador do tipo", () => {
    expect(valido).toBeInstanceOf(ProjetoAnimacao);
    expect(fabrica.criarValidador()).toBeInstanceOf(ValidadorAnimacao);
    expect(fabrica.criarRecomendador()).toBeInstanceOf(RecomendadorAnimacao);
    expect(fabrica.criarNotificador()).toBeInstanceOf(NotificadorAnimacao);
    expect(papeisDe(valido)).toContain(Papel.ESPECIALISTA_EFEITOS_VISUAIS);
  });

  it("validador exige software de modelagem e especialista em efeitos visuais", () => {
    expect(valido.aceitar(fabrica.criarValidador())).toBe(true);

    const invalido = fabrica.criarProjeto({
      ...base,
      softwareModelagem: "",
      papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }]
    });
    const validador = fabrica.criarValidador();
    expect(invalido.aceitar(validador)).toBe(false);
    expect(validador.problemas).toHaveLength(2);
  });

  it("recomendador devolve um mapa com os papeis do projeto", () => {
    expect([...fabrica.criarRecomendador().recomendar(valido, []).keys()]).toEqual(papeisDe(valido));
  });

  it("notificador inclui as metricas de renderizacao", () => {
    const saida = jest.fn();
    const evento = { tipo: TipoEvento.RECOMENDACAO_GERADA, projeto: valido, papel: Papel.EDITOR, candidatos: [{}] } as unknown as EventoRecomendacao;

    new NotificadorAnimacao(saida).atualizar(evento);

    expect(saida).toHaveBeenCalledWith(expect.stringContaining("tempo por quadro"));
  });

  it("notificador informa 'nenhuma' quando nao ha metricas e usa console.log por padrao", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const projeto = { softwareModelagem: "Blender" } as unknown as ProjetoAnimacao;

    new NotificadorAnimacao().atualizar({ tipo: TipoEvento.RECOMENDACAO_GERADA, projeto, papel: Papel.EDITOR, candidatos: [] });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("nenhuma"));
    spy.mockRestore();
  });
});

describe("PontuacaoAnimacao (bonus por software de modelagem)", () => {
  const comBlender = {
    id: "1",
    competencias: [{ competencia: { nome: "Blender" }, nivel: 10 }]
  } as unknown as Profissional;
  const semBlender = { id: "2", competencias: [] } as unknown as Profissional;
  const semCompetencias = { id: "3" } as unknown as Profissional;

  const base_: PontuacaoStrategy = {
    nome: "BASE",
    recomendar: () => [
      { profissional: semBlender, pontuacao: 8 },
      { profissional: comBlender, pontuacao: 7 },
      { profissional: semCompetencias, pontuacao: 1 }
    ]
  };
  const projeto = (software: string) => ({ softwareModelagem: software } as unknown as ProjetoAnimacao);

  it("sobe quem domina o software e reordena o ranking, respeitando o teto de 10", () => {
    const resultado = new PontuacaoAnimacao(base_).recomendar({
      projeto: projeto("blender"),
      papel: Papel.EDITOR,
      candidatos: []
    });

    expect(resultado[0].profissional).toBe(comBlender);
    expect(resultado[0].pontuacao).toBe(9);
  });

  it("nao altera pontuacoes quando o projeto nao informa software", () => {
    const resultado = new PontuacaoAnimacao(base_).recomendar({
      projeto: projeto(" "),
      papel: Papel.EDITOR,
      candidatos: []
    });

    expect(resultado.map((r) => r.pontuacao)).toEqual([8, 7, 1]);
  });

  it("usa a similaridade de cosseno como base por padrao", () => {
    expect(new PontuacaoAnimacao().nome).toBe("COSSENO_MODELAGEM_3D");
    expect(
      new PontuacaoAnimacao().recomendar({ projeto: {} as ProjetoAnimacao, papel: Papel.EDITOR, candidatos: [] })
    ).toEqual([]);
  });
});

describe("Familia Publicitario", () => {
  const fabrica = new FabricaPublicitario();
  const valido = fabrica.criarProjeto({ ...base, cliente: "Acme", canal: "TV" });

  it("cria projeto, validador, recomendador e notificador do tipo", () => {
    expect(valido).toBeInstanceOf(ProjetoPublicitario);
    expect(fabrica.criarValidador()).toBeInstanceOf(ValidadorPublicitario);
    expect(fabrica.criarRecomendador()).toBeInstanceOf(RecomendadorPublicitario);
    expect(fabrica.criarNotificador()).toBeInstanceOf(NotificadorPublicitario);
    expect(papeisDe(valido)).toEqual([Papel.DIRETOR, Papel.DIRETOR_FOTOGRAFIA, Papel.EDITOR]);
  });

  it("validador exige cliente e canal", () => {
    expect(valido.aceitar(fabrica.criarValidador())).toBe(true);

    const invalido = fabrica.criarProjeto({ ...base });
    const validador = fabrica.criarValidador();
    expect(invalido.aceitar(validador)).toBe(false);
    expect(validador.problemas).toHaveLength(2);
  });

  it("recomendador devolve um mapa com os papeis do projeto", () => {
    expect([...fabrica.criarRecomendador().recomendar(valido, []).keys()]).toEqual(papeisDe(valido));
  });

  it("notificador informa cliente e canal", () => {
    const saida = jest.fn();
    const evento = { tipo: TipoEvento.RECOMENDACAO_GERADA, projeto: valido, papel: Papel.DIRETOR, candidatos: [{}] } as unknown as EventoRecomendacao;

    new NotificadorPublicitario(saida).atualizar(evento);

    expect(saida).toHaveBeenCalledWith(expect.stringContaining("Acme"));
    expect(saida).toHaveBeenCalledWith(expect.stringContaining("TV"));
  });

  it("notificador usa console.log por padrao", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    new NotificadorPublicitario().atualizar({ tipo: TipoEvento.RECOMENDACAO_GERADA, projeto: valido, papel: Papel.EDITOR, candidatos: [] });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
