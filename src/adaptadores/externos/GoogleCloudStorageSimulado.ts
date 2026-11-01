/** API simulada do Google Cloud Storage: interface propositalmente diferente da do S3. */
export class GoogleCloudStorageSimulado {
  private readonly objetos = new Map<string, { dados: Buffer; contentType: string }>();

  gravarObjeto(nomeObjeto: string, dados: Buffer, contentType: string): void {
    this.objetos.set(nomeObjeto, { dados, contentType });
  }

  lerObjeto(nomeObjeto: string): Buffer | undefined {
    return this.objetos.get(nomeObjeto)?.dados;
  }

  listarObjetos(prefixoNome: string): Array<{ name: string }> {
    return [...this.objetos.keys()].filter((n) => n.startsWith(prefixoNome)).map((name) => ({ name }));
  }
}
