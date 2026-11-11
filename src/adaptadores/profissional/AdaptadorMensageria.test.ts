import { AdaptadorMensageria } from "./AdaptadorMensageria";
import { AdaptadorProfissional, AvaliacaoInvalidaError } from "./AdaptadorProfissional";
import { criarProfissionalExterno } from "./profissionalExterno";
import { FILA_CONSULTA_PROFISSIONAIS } from "./protocoloProfissionais";
import { CanalEmMemoria } from "../../mensageria/CanalEmMemoria";
import { ClienteRPC, ErroRPC } from "../../mensageria/ClienteRPC";
import { registrarRespondedor } from "../../mensageria/ResponderRPC";
import { criarTratadorConsultas } from "../../servicos/profissionais/tratadorConsultas";

const ana = criarProfissionalExterno({ id: "p1", nome: "Ana", email: "a@x.com", especialidades: ["Direção"], precoBaseDiaria: 1500, localizacao: "SP" });

function remotoFalso(): jest.Mocked<AdaptadorProfissional> {
  return {
    listarProfissionais: jest.fn().mockResolvedValue([ana]),
    detalharProfissional: jest.fn().mockImplementation(async (id: string) => (id === "p1" ? ana : null)),
    registrarAvaliacao: jest.fn().mockResolvedValue(undefined)
  };
}

async function montar(remoto = remotoFalso()) {
  const canal = new CanalEmMemoria();
  await registrarRespondedor(canal, FILA_CONSULTA_PROFISSIONAIS, criarTratadorConsultas(remoto));
  const rpc = new ClienteRPC(canal, { timeoutMs: 500 });
  await rpc.iniciar();
  return { remoto, rpc, canal, adaptador: new AdaptadorMensageria(rpc) };
}

describe("AdaptadorMensageria (cliente) + tratador de consultas (servidor)", () => {
  it("lista profissionais com os criterios e devolve entidades do dominio", async () => {
    const { remoto, adaptador } = await montar();
    const lista = await adaptador.listarProfissionais({ papeis: [], limitePorPapel: 5 });
    expect(remoto.listarProfissionais).toHaveBeenCalledWith({ papeis: [], limitePorPapel: 5 });
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: "p1", nome: "Ana" });
    expect(lista[0].competencias[0].competencia.nome).toBe("Direção");
    expect(lista[0].convites).toEqual([]);
  });

  it("consulta sem criterios usa objeto vazio no servidor", async () => {
    const { remoto, rpc } = await montar();
    await rpc.chamar(FILA_CONSULTA_PROFISSIONAIS, { operacao: "listar" });
    expect(remoto.listarProfissionais).toHaveBeenCalledWith({});
  });

  it("detalha um profissional ou devolve null", async () => {
    const { adaptador } = await montar();
    expect((await adaptador.detalharProfissional("p1"))?.nome).toBe("Ana");
    expect(await adaptador.detalharProfissional("nao-existe")).toBeNull();
  });

  it("registra avaliacao no servidor", async () => {
    const { remoto, adaptador } = await montar();
    await adaptador.registrarAvaliacao("p1", { nota: 8, comentario: "ok" });
    expect(remoto.registrarAvaliacao).toHaveBeenCalledWith("p1", { nota: 8, comentario: "ok" });
  });

  it("nota invalida falha localmente, sem consultar o servico", async () => {
    const { remoto, adaptador } = await montar();
    await expect(adaptador.registrarAvaliacao("p1", { nota: 10 })).rejects.toBeInstanceOf(AvaliacaoInvalidaError);
    expect(remoto.registrarAvaliacao).not.toHaveBeenCalled();
  });

  it("erro do servico chega como ErroRPC", async () => {
    const remoto = remotoFalso();
    remoto.listarProfissionais.mockRejectedValue(new Error("banco fora do ar"));
    const { adaptador } = await montar(remoto);
    await expect(adaptador.listarProfissionais({})).rejects.toThrow(new ErroRPC("banco fora do ar"));
  });

  it("operacao desconhecida e' recusada", async () => {
    const { rpc } = await montar();
    await expect(rpc.chamar(FILA_CONSULTA_PROFISSIONAIS, { operacao: "apagar" })).rejects.toThrow("Operacao desconhecida: apagar");
  });

  it("usa a fila informada", async () => {
    const canal = new CanalEmMemoria();
    await registrarRespondedor(canal, "outra-fila", criarTratadorConsultas(remotoFalso()));
    const rpc = new ClienteRPC(canal, { timeoutMs: 500 });
    await rpc.iniciar();
    expect(await new AdaptadorMensageria(rpc, "outra-fila").listarProfissionais({})).toHaveLength(1);
  });
});
