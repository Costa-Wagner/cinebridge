import { ServicoEmail } from "./ServicoEmail";
import { ServicoMensagensInternas } from "./ServicoMensagensInternas";
import { ModuloAuditoria } from "./ModuloAuditoria";
import { IntegradorMicrosservicos } from "./IntegradorMicrosservicos";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";
import { BarramentoEmMemoria, EquipeFormadaPayload, TOPICO_EQUIPE_FORMADA } from "../eventos/BarramentoEventos";
import { registrarConsumidoresExternos } from "../eventos/consumidoresExternos";
import { Papel } from "../domain/enums/Papel";

const ana = { id: "1", nome: "Ana" };
const bruno = { id: "2", nome: "Bruno" };
const projeto = {
  id: "proj-1",
  genero: "Documentário",
  tipoCaptacao: "DOCUMENTARIO",
  orcamentoTotal: "60000.00",
  equipe: {
    membros: [
      { papel: Papel.DIRETOR, profissional: ana },
      { papel: Papel.EDITOR, profissional: bruno }
    ]
  }
};

const evento = (tipo: TipoEvento, extras: Partial<EventoRecomendacao> = {}) =>
  ({ tipo, projeto, papel: Papel.DIRETOR, candidatos: [ana], ...extras }) as unknown as EventoRecomendacao;

function capturar<T>(acao: () => T): string[] {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  acao();
  const linhas = spy.mock.calls.map((c) => String(c[0]));
  spy.mockRestore();
  return linhas;
}

describe("observers reagem a cada tipo de evento do fluxo", () => {
  it.each([
    [TipoEvento.CONVITE_ENVIADO, "[EMAIL] Para Ana: convite para DIRETOR"],
    [TipoEvento.CONVITE_ACEITO, "[EMAIL] Para o produtor: Ana aceitou o convite"],
    [TipoEvento.CONVITE_RECUSADO, "[EMAIL] Para o produtor: Ana recusou o convite"],
    [TipoEvento.MEMBRO_SUBSTITUIDO, "[EMAIL] Para Ana: o produtor optou por outro"],
    [TipoEvento.EQUIPE_FORMADA, "[EMAIL] Para o produtor: equipe do projeto"]
  ])("ServicoEmail: %s", (tipo, esperado) => {
    const linhas = capturar(() => new ServicoEmail().atualizar(evento(tipo)));

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain(esperado);
  });

  it("ServicoEmail sem candidatos nao quebra", () => {
    const linhas = capturar(() => new ServicoEmail().atualizar(evento(TipoEvento.CONVITE_ENVIADO, { candidatos: [] })));

    expect(linhas[0]).toContain("Para nenhum");
  });

  it("ServicoMensagensInternas lista os envolvidos e trata evento da equipe inteira", () => {
    const linhas = capturar(() => {
      new ServicoMensagensInternas().atualizar(evento(TipoEvento.CONVITE_ENVIADO));
      new ServicoMensagensInternas().atualizar(
        evento(TipoEvento.EQUIPE_FORMADA, { papel: null, candidatos: [ana, bruno] } as never)
      );
    });

    expect(linhas[0]).toContain("CONVITE_ENVIADO (DIRETOR): Ana");
    expect(linhas[1]).toContain("EQUIPE_FORMADA (equipe completa): Ana, Bruno");
  });

  it("ModuloAuditoria registra a acao de cada evento", () => {
    const linhas = capturar(() => {
      new ModuloAuditoria().atualizar(evento(TipoEvento.EQUIPE_FORMADA, { papel: null, candidatos: [ana, bruno] } as never));
    });

    expect(linhas[0]).toContain("equipe_formada");
    expect(linhas[0]).toContain("projeto=proj-1 papel=- qtd=2");
  });
});

describe("integracao com outros microsservicos pelo barramento", () => {
  it("a equipe formada vira um evento 'equipe.formada' com a composicao final", () => {
    const barramento = new BarramentoEmMemoria();
    const recebidos: EquipeFormadaPayload[] = [];
    barramento.assinar(TOPICO_EQUIPE_FORMADA, (p) => recebidos.push(p));

    new IntegradorMicrosservicos(barramento).atualizar(evento(TipoEvento.EQUIPE_FORMADA, { papel: null } as never));

    expect(recebidos).toEqual([
      {
        projetoId: "proj-1",
        tipoCaptacao: "DOCUMENTARIO",
        orcamentoTotal: 60000,
        membros: [
          { papel: "DIRETOR", profissionalId: "1", nome: "Ana" },
          { papel: "EDITOR", profissionalId: "2", nome: "Bruno" }
        ]
      }
    ]);
  });

  it("outros tipos de evento nao sao publicados", () => {
    const barramento = new BarramentoEmMemoria();
    const publicar = jest.spyOn(barramento, "publicar");
    const integrador = new IntegradorMicrosservicos(barramento);

    integrador.atualizar(evento(TipoEvento.CONVITE_ACEITO));
    integrador.atualizar(evento(TipoEvento.RECOMENDACAO_GERADA));

    expect(publicar).not.toHaveBeenCalled();
  });

  it("equipe sem membros carregados gera payload sem membros", () => {
    const barramento = new BarramentoEmMemoria();
    const recebidos: EquipeFormadaPayload[] = [];
    barramento.assinar(TOPICO_EQUIPE_FORMADA, (p) => recebidos.push(p));
    const semEquipe = { ...evento(TipoEvento.EQUIPE_FORMADA), projeto: { ...projeto, equipe: undefined } };

    new IntegradorMicrosservicos(barramento).atualizar(semEquipe as never);

    expect(recebidos[0].membros).toEqual([]);
  });

  it("um tratador com falha nao impede os outros nem o publicador", () => {
    const barramento = new BarramentoEmMemoria();
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    const seguinte = jest.fn();
    barramento.assinar("topico", () => {
      throw new Error("consumidor fora do ar");
    });
    barramento.assinar("topico", seguinte);

    expect(() => barramento.publicar("topico", { a: 1 })).not.toThrow();

    expect(seguinte).toHaveBeenCalledWith({ a: 1 });
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it("os consumidores externos (projetos e financeiro) reagem a equipe formada", () => {
    const barramento = new BarramentoEmMemoria();
    const saida = jest.fn();
    registrarConsumidoresExternos(barramento, saida);

    barramento.publicar(TOPICO_EQUIPE_FORMADA, { projetoId: "p1", orcamentoTotal: 5000, membros: [{}, {}] });

    expect(saida).toHaveBeenCalledWith(expect.stringContaining("[GERENCIAMENTO_PROJETOS] iniciando fluxo de trabalho do projeto p1 com 2"));
    expect(saida).toHaveBeenCalledWith(expect.stringContaining("[FINANCEIRO] provisionando pagamentos do projeto p1 (orcamento 5000)"));
  });

  it("os consumidores usam o console por padrao", () => {
    const barramento = new BarramentoEmMemoria();

    const linhas = capturar(() => {
      registrarConsumidoresExternos(barramento);
      barramento.publicar(TOPICO_EQUIPE_FORMADA, { projetoId: "p1", orcamentoTotal: 1, membros: [] });
    });

    expect(linhas).toHaveLength(2);
  });
});
