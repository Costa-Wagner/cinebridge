import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { AdaptadorArmazenamento, ArquivoNaoEncontradoError } from "./AdaptadorArmazenamento";
import { AdaptadorS3 } from "./AdaptadorS3";
import { AdaptadorGoogleCloud } from "./AdaptadorGoogleCloud";
import { AdaptadorLocal } from "./AdaptadorLocal";

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "cinebridge-"));
afterAll(() => fs.rmSync(pasta, { recursive: true, force: true }));

const provedores: Array<[string, () => AdaptadorArmazenamento, string]> = [
  ["S3", () => new AdaptadorS3(), "s3://"],
  ["GoogleCloud", () => new AdaptadorGoogleCloud(), "gs://"],
  ["Local", () => new AdaptadorLocal(fs.mkdtempSync(path.join(pasta, "t-"))), "local://"]
];

describe.each(provedores)("AdaptadorArmazenamento: %s (mesmo contrato)", (_nome, criar, esquema) => {
  it("salva, recupera e lista por prefixo", () => {
    const a = criar();
    const id = a.salvarArquivo(Buffer.from("roteiro"), { nome: "projetos/p1/roteiro.txt", tipo: "text/plain" });
    a.salvarArquivo(Buffer.from("x"), { nome: "projetos/p2/outro.txt" });

    expect(id).toBe(`${esquema}projetos/p1/roteiro.txt`);
    expect(a.recuperarArquivo(id).toString()).toBe("roteiro");
    expect(a.listarArquivos("projetos/p1")).toEqual([id]);
    expect(a.listarArquivos("projetos/")).toHaveLength(2);
  });

  it("falha ao recuperar arquivo inexistente", () => {
    expect(() => criar().recuperarArquivo(`${esquema}nao/existe.txt`)).toThrow(ArquivoNaoEncontradoError);
  });
});

describe("AdaptadorLocal", () => {
  it("lista vazio quando a pasta nao existe e recusa caminhos fora da raiz", () => {
    const a = new AdaptadorLocal(path.join(pasta, "inexistente"));
    expect(a.listarArquivos("")).toEqual([]);
    expect(() => a.salvarArquivo(Buffer.from("x"), { nome: "../fora.txt" })).toThrow("Caminho invalido");
  });
});
