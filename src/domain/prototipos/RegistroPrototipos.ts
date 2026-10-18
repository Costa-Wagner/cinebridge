import type { Projeto } from "../entities/Projeto";

/**
 * Prototype Registry: guarda projetos-modelo por nome e entrega sempre
 * uma copia (clonar), nunca a instancia registrada.
 */
export class RegistroPrototipos {
  private readonly prototipos = new Map<string, Projeto>();

  registrar(nome: string, prototipo: Projeto): void {
    this.prototipos.set(nome, prototipo);
  }

  criar(nome: string): Projeto {
    const prototipo = this.prototipos.get(nome);
    if (!prototipo) {
      throw new Error(`Prototipo nao registrado: ${nome}`);
    }
    return prototipo.clonar();
  }

  nomes(): string[] {
    return [...this.prototipos.keys()];
  }
}
