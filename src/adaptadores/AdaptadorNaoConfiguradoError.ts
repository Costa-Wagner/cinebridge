/** O SistemaRecomendacao foi usado sem o adaptador necessario (HTTP 500: erro de composicao). */
export class AdaptadorNaoConfiguradoError extends Error {
  constructor(adaptador: string) {
    super(`Adaptador de ${adaptador} nao configurado`);
    this.name = "AdaptadorNaoConfiguradoError";
  }
}
