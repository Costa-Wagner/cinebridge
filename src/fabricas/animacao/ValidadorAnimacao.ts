import { ValidadorPorTipo } from "../ValidadorPorTipo";
import { ProjetoAnimacao } from "../../domain/entities/ProjetoAnimacao";
import { Papel } from "../../domain/enums/Papel";

export class ValidadorAnimacao extends ValidadorPorTipo<ProjetoAnimacao> {
  protected readonly tipoEsperado = ProjetoAnimacao;

  protected validarEspecifico(projeto: ProjetoAnimacao): void {
    if (!projeto.softwareModelagem?.trim()) {
      this.problemas.push(`${this.rotulo(projeto)}: animacao exige software de modelagem`);
    }
    const temEfeitosVisuais = (projeto.papeisObrigatorios ?? []).some(
      (p) => p.papel === Papel.ESPECIALISTA_EFEITOS_VISUAIS
    );
    if (!temEfeitosVisuais) {
      this.problemas.push(`${this.rotulo(projeto)}: animacao exige o papel ESPECIALISTA_EFEITOS_VISUAIS`);
    }
  }
}
