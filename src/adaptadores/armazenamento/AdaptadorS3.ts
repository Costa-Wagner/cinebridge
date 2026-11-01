import { AdaptadorArmazenamento, ArquivoNaoEncontradoError, MetadadosArquivo } from "./AdaptadorArmazenamento";
import { ArmazenamentoExterno } from "../externos/ArmazenamentoExterno";

const ESQUEMA = "s3://";

export class AdaptadorS3 implements AdaptadorArmazenamento {
  constructor(private readonly s3: ArmazenamentoExterno = new ArmazenamentoExterno()) {}

  salvarArquivo(conteudo: Buffer, metadados: MetadadosArquivo): string {
    return ESQUEMA + this.s3.upload({ caminho: metadados.nome, dados: conteudo });
  }

  recuperarArquivo(id: string): Buffer {
    try {
      return this.s3.download(id.slice(ESQUEMA.length)).dados;
    } catch {
      throw new ArquivoNaoEncontradoError(id);
    }
  }

  listarArquivos(prefixo: string): string[] {
    return this.s3.listar(prefixo).map((c) => ESQUEMA + c);
  }
}
