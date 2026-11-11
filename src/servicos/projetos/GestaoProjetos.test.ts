import { Repository } from "typeorm";
import { GestaoProjetos } from "./GestaoProjetos";
import { RegistroProjeto } from "./RegistroProjeto";
import { EventoProjeto, ProjetoPayload } from "../../eventos/eventosProjeto";

const AGORA = new Date("2026-11-10T12:00:00Z");

function montar() {
  const dados = new Map<string, RegistroProjeto>();
  const repositorio = {
    findOneBy: jest.fn(async ({ id }: { id: string }) => dados.get(id) ?? null),
    save: jest.fn(async (registro: RegistroProjeto) => {
      dados.set(registro.id, registro);
      return registro;
    }),
    find: jest.fn(async () => [...dados.values()])
  };
  const eventos: EventoProjeto[] = [];
  const gestao = new GestaoProjetos(
    repositorio as unknown as Repository<RegistroProjeto>,
    async (evento) => void eventos.push(evento),
    () => AGORA
  );
  return { gestao, repositorio, dados, eventos };
}

const projeto = (extras: Partial<ProjetoPayload> = {}): ProjetoPayload => ({
  projetoId: "p1",
  tipoCaptacao: "DOCUMENTARIO",
  genero: "Documentário",
  orcamentoTotal: 1000,
  dataEntrega: "2026-12-01",
  custoTotal: 800,
  prazoTotal: 45,
  ...extras
});
const equipe = { projetoId: "p1", tipoCaptacao: "DOCUMENTARIO", orcamentoTotal: 1200, membros: [{ papel: "DIRETOR", profissionalId: "a", nome: "Ana" }] };

describe("GestaoProjetos", () => {
  it("registra o projeto criado e publica PROJETO_CRIADO", async () => {
    const { gestao, dados, eventos } = montar();

    await gestao.registrarCriado(projeto());

    expect(dados.get("p1")).toMatchObject({ id: "p1", tipoCaptacao: "DOCUMENTARIO", genero: "Documentário", orcamentoTotal: 1000, dataEntrega: "2026-12-01", custoTotal: 800, prazoTotal: 45, status: "CRIADO" });
    expect(eventos).toEqual([
      {
        tipo: "PROJETO_CRIADO",
        projetoId: "p1",
        tipoCaptacao: "DOCUMENTARIO",
        ocorridoEm: AGORA.toISOString(),
        detalhes: { genero: "Documentário", orcamentoTotal: 1000, dataEntrega: "2026-12-01", custoTotal: 800, prazoTotal: 45 }
      }
    ]);
  });

  it("atualiza o registro existente e publica PROJETO_ATUALIZADO", async () => {
    const { gestao, dados, eventos, repositorio } = montar();
    await gestao.registrarCriado(projeto());

    await gestao.registrarAtualizado(projeto({ orcamentoTotal: 9000, dataEntrega: "2026-12-20" }));

    expect(repositorio.save).toHaveBeenCalledTimes(2);
    expect(dados.size).toBe(1);
    expect(dados.get("p1")).toMatchObject({ orcamentoTotal: 9000, dataEntrega: "2026-12-20", status: "ATUALIZADO" });
    expect(eventos.map((e) => e.tipo)).toEqual(["PROJETO_CRIADO", "PROJETO_ATUALIZADO"]);
    expect(eventos[1].detalhes).toMatchObject({ orcamentoTotal: 9000 });
  });

  it("equipe formada finaliza o projeto (mesmo sem registro anterior) e publica PROJETO_FINALIZADO", async () => {
    const { gestao, dados, eventos } = montar();

    await gestao.registrarFinalizado(equipe);

    expect(dados.get("p1")).toMatchObject({ status: "FINALIZADO", orcamentoTotal: 1200, equipe: equipe.membros, finalizadoEm: AGORA });
    expect(dados.get("p1")!.genero).toBeUndefined(); // so' a api sabe o genero; chega com projeto.criado
    expect(eventos).toEqual([
      {
        tipo: "PROJETO_FINALIZADO",
        projetoId: "p1",
        tipoCaptacao: "DOCUMENTARIO",
        ocorridoEm: AGORA.toISOString(),
        detalhes: { orcamentoTotal: 1200, quantidadeMembros: 1, membros: equipe.membros }
      }
    ]);
  });

  it("o status nunca regride com mensagens repetidas ou fora de ordem", async () => {
    const { gestao, dados } = montar();
    await gestao.registrarFinalizado(equipe);

    await gestao.registrarCriado(projeto());
    expect(dados.get("p1")!.status).toBe("FINALIZADO");
    await gestao.registrarAtualizado(projeto());
    expect(dados.get("p1")!.status).toBe("FINALIZADO");
    expect(dados.get("p1")!.genero).toBe("Documentário"); // os dados atrasados ainda completam o registro
  });

  it("obter e listar consultam o repositorio", async () => {
    const { gestao, repositorio } = montar();
    await gestao.registrarCriado(projeto());

    expect((await gestao.obter("p1"))?.id).toBe("p1");
    expect(await gestao.obter("nao-existe")).toBeNull();
    expect(await gestao.listar()).toHaveLength(1);
    expect(repositorio.find).toHaveBeenCalledWith({ order: { atualizadoEm: "DESC" } });
  });

  it("usa o relogio do sistema por padrao", async () => {
    const dados = new Map<string, RegistroProjeto>();
    const repositorio = {
      findOneBy: async () => null,
      save: async (r: RegistroProjeto) => dados.set(r.id, r)
    };
    const eventos: EventoProjeto[] = [];
    const gestao = new GestaoProjetos(repositorio as unknown as Repository<RegistroProjeto>, async (e) => void eventos.push(e));
    const antes = Date.now();
    await gestao.registrarCriado(projeto());
    expect(new Date(eventos[0].ocorridoEm).getTime()).toBeGreaterThanOrEqual(antes);
  });
});
