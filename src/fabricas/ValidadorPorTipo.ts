import { ValidadorConsistencia } from "../visitors/ValidadorConsistencia";
import { Projeto } from "../domain/entities/Projeto";

/**
 * Validador de um tipo de projeto: aplica a consistencia geral (herdada)
 * e as regras do tipo. Recusa projetos de outro tipo, o que impede
 * misturar objetos de familias diferentes.
 */
export abstract class ValidadorPorTipo<T extends Projeto> extends ValidadorConsistencia {
  protected abstract readonly tipoEsperado: new () => T;

  protected abstract validarEspecifico(projeto: T): void;

  visitarProjeto(projeto: Projeto): boolean {
    const antes = this.problemas.length;
    super.visitarProjeto(projeto);
    if (projeto instanceof this.tipoEsperado) {
      this.validarEspecifico(projeto as T);
    } else {
      this.problemas.push(
        `${this.rotulo(projeto)}: esperado ${this.tipoEsperado.name}, recebido ${projeto.constructor.name}`
      );
    }
    return this.problemas.length === antes;
  }
}
