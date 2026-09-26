import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn
} from "typeorm";
import { TipoCaptacao } from "../enums/TipoCaptacao";
import { PapelObrigatorio } from "./PapelObrigatorio";
import { Recomendacao } from "./Recomendacao";
import { Convite } from "./Convite";
import type { ElementoVisitavel } from "../../visitors/ElementoVisitavel";
import type { IVisitanteProjeto } from "../../visitors/IVisitanteProjeto";

@Entity("projetos")
export class Projeto implements ElementoVisitavel {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  genero!: string;

  @Column("int")
  duracaoEstimadaMinutos!: number;

  @Column("decimal", { precision: 12, scale: 2 })
  orcamentoTotal!: number;

  @Column("date")
  dataEntrega!: string;

  @Column({ type: "enum", enum: TipoCaptacao })
  tipoCaptacao!: TipoCaptacao;

  @Column()
  localizacaoFilmagem!: string;

  @Column("jsonb")
  papeisObrigatorios!: PapelObrigatorio[];

  @OneToMany(() => Recomendacao, (recomendacao) => recomendacao.projeto)
  recomendacoes!: Recomendacao[];

  @OneToMany(() => Convite, (convite) => convite.projeto)
  convites!: Convite[];

  @CreateDateColumn()
  criadoEm!: Date;

  aceitar(visitante: IVisitanteProjeto): void {
    visitante.visitarProjeto(this);
  }
}