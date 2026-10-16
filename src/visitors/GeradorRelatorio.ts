import { VisitanteProjeto } from "./VisitanteProjeto";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";

/**
 * Monta um relatorio textual simples a partir da mesma arvore que os
 * outros visitantes percorrem - mesma estrutura de dados, operacao
 * totalmente diferente (texto legivel em vez de validacao/calculo),
 * sem precisar tocar nas entidades Projeto/Profissional.
 */
export class GeradorRelatorio implements VisitanteProjeto {
  private readonly linhas: string[] = [];

  visitarProjeto(projeto: Projeto): void {
    this.linhas.push(`Projeto: ${projeto.genero} (${projeto.tipoCaptacao})`);
    this.linhas.push(`  Orcamento: R$ ${Number(projeto.orcamentoTotal).toLocaleString("pt-BR")}`);
    this.linhas.push(`  Entrega: ${projeto.dataEntrega}`);
    this.linhas.push(`  Papeis obrigatorios: ${projeto.papeisObrigatorios.length}`);
  }

  visitarProfissional(profissional: Profissional): void {
    this.linhas.push(
      `  - ${profissional.nome} | ${profissional.especialidades.join(", ")} | ` +
        `R$ ${Number(profissional.precoBaseDiaria).toLocaleString("pt-BR")}/dia`
    );
  }

  gerarTexto(): string {
    return this.linhas.join("\n");
  }
}