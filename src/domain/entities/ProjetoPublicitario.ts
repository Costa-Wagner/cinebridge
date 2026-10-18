import { ChildEntity, Column } from "typeorm";
import { Projeto } from "./Projeto";
import { TipoCaptacao } from "../enums/TipoCaptacao";

@ChildEntity(TipoCaptacao.PUBLICITARIO)
export class ProjetoPublicitario extends Projeto {
  tipoCaptacao = TipoCaptacao.PUBLICITARIO;

  @Column({ type: "varchar", nullable: true })
  cliente!: string;

  @Column({ type: "varchar", nullable: true })
  canal!: string;

  clonar(): ProjetoPublicitario {
    const copia = super.clonar() as ProjetoPublicitario;
    copia.cliente = this.cliente;
    copia.canal = this.canal;
    return copia;
  }
}
