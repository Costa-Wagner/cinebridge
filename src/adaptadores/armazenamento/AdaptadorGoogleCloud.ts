import { AdaptadorArmazenamento, ArquivoNaoEncontradoError, MetadadosArquivo } from "./AdaptadorArmazenamento";
import { GoogleCloudStorageSimulado } from "../externos/GoogleCloudStorageSimulado";

const ESQUEMA = "gs://";

export class AdaptadorGoogleCloud implements AdaptadorArmazenamento {
  constructor(private readonly gcs: GoogleCloudStorageSimulado = new GoogleCloudStorageSimulado()) {}

  salvarArquivo(conteudo: Buffer, metadados: MetadadosArquivo): string {
    this.gcs.gravarObjeto(metadados.nome, conteudo, metadados.tipo ?? "application/octet-stream");
    return ESQUEMA + metadados.nome;
  }

  recuperarArquivo(id: string): Buffer {
    const dados = this.gcs.lerObjeto(id.slice(ESQUEMA.length));
    if (!dados) throw new ArquivoNaoEncontradoError(id);
    return dados;
  }

  listarArquivos(prefixo: string): string[] {
    return this.gcs.listarObjetos(prefixo).map((o) => ESQUEMA + o.name);
  }
}
