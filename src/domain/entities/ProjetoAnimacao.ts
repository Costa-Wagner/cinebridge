import { ChildEntity, Column } from "typeorm";
import { Projeto } from "./Projeto";
import { TipoCaptacao } from "../enums/TipoCaptacao";

@ChildEntity(TipoCaptacao.ANIMACAO)
export class ProjetoAnimacao extends Projeto {
  tipoCaptacao = TipoCaptacao.ANIMACAO;

  @Column({ type: "varchar", nullable: true })
  softwareModelagem!: string;

  @Column({ type: "jsonb", nullable: true })
  metricasRenderizacao!: string[];

  clonar(): ProjetoAnimacao {
    const copia = super.clonar() as ProjetoAnimacao;
    copia.softwareModelagem = this.softwareModelagem;
    copia.metricasRenderizacao = [...(this.metricasRenderizacao ?? [])];
    return copia;
  }
}
