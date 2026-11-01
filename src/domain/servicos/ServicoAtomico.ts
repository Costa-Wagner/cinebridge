import { Papel } from "../enums/Papel";
import { DadoServicoAtomico, ServicoProjeto } from "./ServicoProjeto";

/** Leaf: um servico individual (ex.: edicao de video) ligado a um papel tecnico. */
export class ServicoAtomico implements ServicoProjeto {
  constructor(
    readonly nome: string,
    readonly papel: Papel,
    readonly peso: number,
    readonly custo: number = 0,
    readonly prazoDias: number = 1
  ) {}

  calcularCusto(): number {
    return this.custo;
  }

  listarSubservicos(): ServicoProjeto[] {
    return [];
  }

  obterPrazo(): number {
    return this.prazoDias;
  }

  validar(): string[] {
    const problemas: string[] = [];
    const rotulo = `Servico "${this.nome}"`;
    if (!this.nome) problemas.push("Servico sem nome");
    if (!Object.values(Papel).includes(this.papel)) problemas.push(`${rotulo}: papel invalido (${this.papel})`);
    if (!Number.isFinite(this.peso) || this.peso < 0 || this.peso > 10) {
      problemas.push(`${rotulo}: peso invalido (${this.peso})`);
    }
    if (!Number.isFinite(this.custo) || this.custo < 0) problemas.push(`${rotulo}: custo invalido (${this.custo})`);
    if (!Number.isInteger(this.prazoDias) || this.prazoDias < 1) {
      problemas.push(`${rotulo}: prazo invalido (${this.prazoDias})`);
    }
    return problemas;
  }

  paraJSON(): DadoServicoAtomico {
    return {
      tipo: "ATOMICO",
      nome: this.nome,
      papel: this.papel,
      peso: this.peso,
      custo: this.custo,
      prazoDias: this.prazoDias
    };
  }

  toJSON(): DadoServicoAtomico {
    return this.paraJSON();
  }
}
