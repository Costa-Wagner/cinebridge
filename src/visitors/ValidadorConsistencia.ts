import { IVisitanteProjeto } from "./IVisitanteProjeto";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";

/**
 * Percorre a arvore Projeto/Profissional coletando inconsistencias de
 * dados sem lancar excecao no meio do caminho - acumula tudo em
 * `problemas` pra quem chamou decidir o que fazer (bloquear, logar, etc).
 */
export class ValidadorConsistencia implements IVisitanteProjeto {
  readonly problemas: string[] = [];

  visitarProjeto(projeto: Projeto): void {
    if (projeto.orcamentoTotal <= 0) {
      this.problemas.push(`Projeto ${projeto.id}: orcamento total deve ser positivo`);
    }
    if (projeto.duracaoEstimadaMinutos <= 0) {
      this.problemas.push(`Projeto ${projeto.id}: duracao estimada deve ser positiva`);
    }
    if (!projeto.papeisObrigatorios || projeto.papeisObrigatorios.length === 0) {
      this.problemas.push(`Projeto ${projeto.id}: nenhum papel obrigatorio definido`);
    } else {
      for (const p of projeto.papeisObrigatorios) {
        if (p.peso < 0 || p.peso > 10) {
          this.problemas.push(
            `Projeto ${projeto.id}: peso invalido (${p.peso}) para o papel ${p.papel}`
          );
        }
      }
    }
    if (Number.isNaN(new Date(projeto.dataEntrega).getTime())) {
      this.problemas.push(`Projeto ${projeto.id}: data de entrega invalida`);
    }
  }

  visitarProfissional(profissional: Profissional): void {
    if (profissional.precoBaseDiaria <= 0) {
      this.problemas.push(`Profissional ${profissional.id}: preco base diaria deve ser positivo`);
    }
    if (!profissional.email.includes("@")) {
      this.problemas.push(`Profissional ${profissional.id}: email invalido`);
    }
    if (!profissional.disponibilidade || profissional.disponibilidade.length === 0) {
      this.problemas.push(`Profissional ${profissional.id}: nenhuma janela de disponibilidade`);
    }
  }
}