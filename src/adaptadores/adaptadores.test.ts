import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { AdaptadorArmazenamento, ArquivoNaoEncontradoError } from "./armazenamento/AdaptadorArmazenamento";
import { AdaptadorS3 } from "./armazenamento/AdaptadorS3";
import { AdaptadorGoogleCloud } from "./armazenamento/AdaptadorGoogleCloud";
import { AdaptadorLocal } from "./armazenamento/AdaptadorLocal";
import { AdaptadorPagamento, PagamentoInvalidoError } from "./pagamento/AdaptadorPagamento";
import { AdaptadorStripe } from "./pagamento/AdaptadorStripe";
import { AdaptadorPagSeguro } from "./pagamento/AdaptadorPagSeguro";
import { AdaptadorPayPal } from "./pagamento/AdaptadorPayPal";
import { AdaptadorProfissional, AvaliacaoInvalidaError } from "./profissional/AdaptadorProfissional";
import { AdaptadorLinkedIn } from "./profissional/AdaptadorLinkedIn";
import { AdaptadorIndeed } from "./profissional/AdaptadorIndeed";
import { AdaptadorInterno } from "./profissional/AdaptadorInterno";
import { ApiProfissionalExterna } from "./externos/ApiProfissionalExterna";
import { PortalEmpregoSimulado } from "./externos/PortalEmpregoSimulado";
import { Papel } from "../domain/enums/Papel";

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "cb-arm-"));
afterAll(() => fs.rmSync(pasta, { recursive: true, force: true }));

const armazenamentos: Array<[string, () => AdaptadorArmazenamento]> = [
  ["S3", () => new AdaptadorS3()],
  ["GoogleCloud", () => new AdaptadorGoogleCloud()],
  ["Local", () => new AdaptadorLocal(fs.mkdtempSync(path.join(pasta, "a-")))]
];

describe.each(armazenamentos)("AdaptadorArmazenamento: %s (mesmo contrato)", (_nome, criar) => {
  it("salva, recupera e lista por prefixo", () => {
    const a = criar();
    const id = a.salvarArquivo(Buffer.from("roteiro"), { nome: "projetos/p1/roteiro.pdf", tipo: "application/pdf" });
    a.salvarArquivo(Buffer.from("x"), { nome: "projetos/p2/outro.txt" });
    expect(a.recuperarArquivo(id).toString()).toBe("roteiro");
    expect(a.listarArquivos("projetos/p1/")).toEqual([id]);
    expect(a.listarArquivos("projetos/")).toHaveLength(2);
  });

  it("arquivo inexistente gera ArquivoNaoEncontradoError", () => {
    const a = criar();
    const esquema = a.salvarArquivo(Buffer.from("x"), { nome: "a.txt" }).replace("a.txt", "");
    expect(() => a.recuperarArquivo(esquema + "nao-existe.txt")).toThrow(ArquivoNaoEncontradoError);
  });
});

describe("AdaptadorLocal", () => {
  it("lista vazio quando a raiz nao existe e rejeita caminho fora da raiz", () => {
    const a = new AdaptadorLocal(path.join(pasta, "inexistente"));
    expect(a.listarArquivos("")).toEqual([]);
    expect(() => a.salvarArquivo(Buffer.from("x"), { nome: "../fora.txt" })).toThrow("Caminho invalido");
  });
});

const pagamentos: Array<[string, () => AdaptadorPagamento]> = [
  ["Stripe", () => new AdaptadorStripe()],
  ["PagSeguro", () => new AdaptadorPagSeguro()],
  ["PayPal", () => new AdaptadorPayPal()]
];

describe.each(pagamentos)("AdaptadorPagamento: %s (mesmo contrato)", (_nome, criar) => {
  it("efetua, verifica e cancela", () => {
    const a = criar();
    const id = a.efetuarPagamento(150.5, "produtor", "profissional");
    expect(a.verificarPagamento(id)).toBe("CONFIRMADO");
    expect(a.cancelarPagamento(id)).toBe(true);
    expect(a.verificarPagamento(id)).toBe("CANCELADO");
    expect(a.cancelarPagamento(id)).toBe(false);
  });

  it("transacao desconhecida e valor invalido", () => {
    const a = criar();
    expect(a.verificarPagamento("inexistente")).toBe("DESCONHECIDO");
    expect(a.cancelarPagamento("inexistente")).toBe(false);
    expect(() => a.efetuarPagamento(0, "a", "b")).toThrow(PagamentoInvalidoError);
    expect(() => a.efetuarPagamento(Number.NaN, "a", "b")).toThrow(PagamentoInvalidoError);
  });
});

const registros = [
  { id: "1", nomeCompleto: "Ana", emailContato: "ana@x.com", funcoes: [Papel.DIRETOR], habilidades: ["direcao"], valorDiaria: 900, cidade: "SP" },
  { id: "2", nomeCompleto: "Bia", emailContato: "bia@x.com", funcoes: [Papel.EDITOR], habilidades: ["edicao"], valorDiaria: 700, cidade: "RJ" }
];
const candidatos = registros.map((r) => ({
  candidateId: r.id, fullName: r.nomeCompleto, mail: r.emailContato, roles: r.funcoes,
  skills: r.habilidades, dailyRate: r.valorDiaria, city: r.cidade
}));

const externos: Array<[string, string, () => AdaptadorProfissional]> = [
  ["LinkedIn", "linkedin:", () => new AdaptadorLinkedIn(new ApiProfissionalExterna(registros))],
  ["Indeed", "indeed:", () => new AdaptadorIndeed(new PortalEmpregoSimulado(candidatos))]
];

describe.each(externos)("AdaptadorProfissional: %s (mesmo contrato)", (_n, prefixo, criar) => {
  it("traduz o formato externo para Profissional e filtra por papel", async () => {
    const a = criar();
    const todos = await a.listarProfissionais({});
    expect(todos.map((p) => p.id)).toEqual([prefixo + "1", prefixo + "2"]);
    const diretores = await a.listarProfissionais({ papeis: [Papel.DIRETOR] });
    expect(diretores).toHaveLength(1);
    expect(diretores[0]).toMatchObject({ nome: "Ana", email: "ana@x.com", precoBaseDiaria: 900, localizacao: "SP" });
    expect(await a.listarProfissionais({ limitePorPapel: 1 })).toHaveLength(1);
  });

  it("detalha com ou sem prefixo; inexistente = null", async () => {
    const a = criar();
    expect((await a.detalharProfissional(prefixo + "2"))?.nome).toBe("Bia");
    expect((await a.detalharProfissional("2"))?.nome).toBe("Bia");
    expect(await a.detalharProfissional("99")).toBeNull();
  });

  it("avaliacao valida e invalida", async () => {
    const a = criar();
    await expect(a.registrarAvaliacao("1", { nota: 8 })).resolves.toBeUndefined();
    await expect(a.registrarAvaliacao("1", { nota: 10 })).rejects.toThrow(AvaliacaoInvalidaError);
    await expect(a.registrarAvaliacao("1", { nota: -1 })).rejects.toThrow(AvaliacaoInvalidaError);
  });

  it("avaliacao chega ao sistema externo no formato dele", async () => {
    const api = new ApiProfissionalExterna(registros);
    const portal = new PortalEmpregoSimulado(candidatos);
    await new AdaptadorLinkedIn(api).registrarAvaliacao("linkedin:1", { nota: 7.5 });
    await new AdaptadorIndeed(portal).registrarAvaliacao("indeed:1", { nota: 7.5 });
    expect(api.avaliacoes.get("1")).toEqual([7.5]);
    expect(portal.estrelas.get("1")).toEqual([4]);
  });
});

describe("AdaptadorInterno", () => {
  const ana = { id: "a" };
  const bia = { id: "b" };
  const catalogo = {
    listar: jest.fn(async () => [ana, bia]),
    preSelecionar: jest.fn(async () => [ana]),
    invalidar: jest.fn()
  };
  const insert = jest.fn(async () => undefined);
  const ds = { getRepository: () => ({ insert }) };
  const interno = new AdaptadorInterno(catalogo as never, ds as never);

  it("lista pelo catalogo: sem papel = todos; com papel = pre-selecao (limite opcional)", async () => {
    expect(await interno.listarProfissionais({})).toEqual([ana, bia]);
    await interno.listarProfissionais({ papeis: [Papel.DIRETOR] });
    expect(catalogo.preSelecionar).toHaveBeenLastCalledWith([Papel.DIRETOR]);
    await interno.listarProfissionais({ papeis: [Papel.DIRETOR], limitePorPapel: 3 });
    expect(catalogo.preSelecionar).toHaveBeenLastCalledWith([Papel.DIRETOR], 3);
  });

  it("detalha pelo id", async () => {
    expect(await interno.detalharProfissional("b")).toBe(bia);
    expect(await interno.detalharProfissional("z")).toBeNull();
  });

  it("registra avaliacao no banco e invalida o catalogo; nota invalida nao grava", async () => {
    await interno.registrarAvaliacao("a", { nota: 9, comentario: "otimo" });
    expect(insert).toHaveBeenCalledWith({ nota: 9, comentario: "otimo", profissional: { id: "a" } });
    expect(catalogo.invalidar).toHaveBeenCalledTimes(1);
    await expect(interno.registrarAvaliacao("a", { nota: 11 })).rejects.toThrow(AvaliacaoInvalidaError);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
