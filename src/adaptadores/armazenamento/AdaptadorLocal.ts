import * as fs from "fs";
import * as path from "path";
import { AdaptadorArmazenamento, ArquivoNaoEncontradoError, MetadadosArquivo } from "./AdaptadorArmazenamento";

const ESQUEMA = "local://";

/** Armazenamento em disco (desenvolvimento e testes); funciona igual em Windows e Linux. */
export class AdaptadorLocal implements AdaptadorArmazenamento {
  constructor(private readonly raiz: string) {}

  salvarArquivo(conteudo: Buffer, metadados: MetadadosArquivo): string {
    const destino = this.resolver(metadados.nome);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, conteudo);
    return ESQUEMA + metadados.nome;
  }

  recuperarArquivo(id: string): Buffer {
    const origem = this.resolver(id.slice(ESQUEMA.length));
    if (!fs.existsSync(origem)) throw new ArquivoNaoEncontradoError(id);
    return fs.readFileSync(origem);
  }

  listarArquivos(prefixo: string): string[] {
    return this.listarTodos(this.raiz)
      .map((arquivo) => path.relative(this.raiz, arquivo).split(path.sep).join("/"))
      .filter((nome) => nome.startsWith(prefixo))
      .map((nome) => ESQUEMA + nome);
  }

  private resolver(nome: string): string {
    const destino = path.resolve(this.raiz, nome);
    if (path.relative(this.raiz, destino).startsWith("..")) throw new Error(`Caminho invalido: ${nome}`);
    return destino;
  }

  private listarTodos(pasta: string): string[] {
    if (!fs.existsSync(pasta)) return [];
    return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
      const completo = path.join(pasta, e.name);
      return e.isDirectory() ? this.listarTodos(completo) : [completo];
    });
  }
}
