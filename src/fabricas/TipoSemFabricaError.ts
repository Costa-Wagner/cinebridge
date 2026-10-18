export class TipoSemFabricaError extends Error {
  constructor(tipo: string) {
    super(`Nenhuma fabrica registrada para o tipo de projeto: ${tipo}`);
    this.name = "TipoSemFabricaError";
  }
}
