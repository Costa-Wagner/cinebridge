import { ValidadorPorTipo } from "../ValidadorPorTipo";
import { ProjetoDocumentario } from "../../domain/entities/ProjetoDocumentario";

export class ValidadorDocumentario extends ValidadorPorTipo<ProjetoDocumentario> {
  protected readonly tipoEsperado = ProjetoDocumentario;

  protected validarEspecifico(projeto: ProjetoDocumentario): void {
    if (!projeto.tema?.trim()) {
      this.problemas.push(`${this.rotulo(projeto)}: documentario exige tema`);
    }
    if (!projeto.entrevistados || projeto.entrevistados.length === 0) {
      this.problemas.push(`${this.rotulo(projeto)}: documentario exige ao menos um entrevistado`);
    }
  }
}
