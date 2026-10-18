import { ValidadorPorTipo } from "../ValidadorPorTipo";
import { ProjetoPublicitario } from "../../domain/entities/ProjetoPublicitario";

export class ValidadorPublicitario extends ValidadorPorTipo<ProjetoPublicitario> {
  protected readonly tipoEsperado = ProjetoPublicitario;

  protected validarEspecifico(projeto: ProjetoPublicitario): void {
    if (!projeto.cliente?.trim()) {
      this.problemas.push(`${this.rotulo(projeto)}: projeto publicitario exige cliente`);
    }
    if (!projeto.canal?.trim()) {
      this.problemas.push(`${this.rotulo(projeto)}: projeto publicitario exige canal`);
    }
  }
}
