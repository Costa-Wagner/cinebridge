export interface MetadadosArquivo {
  /** Caminho logico, ex.: "projetos/p1/roteiro.pdf". */
  nome: string;
  tipo?: string;
}

/** Contrato padrao de armazenamento de midia; o nucleo nunca conhece o provedor. */
export interface AdaptadorArmazenamento {
  /** Salva o arquivo e devolve o identificador a usar em `recuperarArquivo`. */
  salvarArquivo(conteudo: Buffer, metadados: MetadadosArquivo): string;
  recuperarArquivo(id: string): Buffer;
  /** Identificadores dos arquivos cujo caminho logico comeca por `prefixo`. */
  listarArquivos(prefixo: string): string[];
}

export class ArquivoNaoEncontradoError extends Error {
  constructor(id: string) {
    super(`Arquivo nao encontrado: ${id}`);
    this.name = "ArquivoNaoEncontradoError";
  }
}
