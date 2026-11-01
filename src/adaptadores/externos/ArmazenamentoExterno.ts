export interface ArquivoExterno {
  caminho: string;
  dados: Buffer;
}

/** API simulada de armazenamento no estilo S3 (upload/download/listar por pasta). */
export class ArmazenamentoExterno {
  private readonly arquivos = new Map<string, Buffer>();

  upload(arquivo: ArquivoExterno): string {
    this.arquivos.set(arquivo.caminho, arquivo.dados);
    return arquivo.caminho;
  }

  download(caminho: string): ArquivoExterno {
    const dados = this.arquivos.get(caminho);
    if (!dados) throw new Error(`NoSuchKey: ${caminho}`);
    return { caminho, dados };
  }

  listar(pasta: string): string[] {
    return [...this.arquivos.keys()].filter((c) => c.startsWith(pasta));
  }
}
