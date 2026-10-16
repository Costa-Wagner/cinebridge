import { ChildEntity, Column } from "typeorm";
import { Projeto } from "./Projeto";
import { TipoCaptacao } from "../enums/TipoCaptacao";

@ChildEntity(TipoCaptacao.DOCUMENTARIO)
export class ProjetoDocumentario extends Projeto {
  tipoCaptacao = TipoCaptacao.DOCUMENTARIO;

  @Column({ type: "varchar", nullable: true })
  tema!: string;

  @Column({ type: "jsonb", nullable: true })
  entrevistados!: string[];

  clonar(): ProjetoDocumentario {
    const copia = super.clonar() as ProjetoDocumentario;
    copia.tema = this.tema;
    copia.entrevistados = [...(this.entrevistados ?? [])];
    return copia;
  }
}
