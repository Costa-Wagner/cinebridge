import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { Profissional } from "./Profissional";
import { Competencia } from "./Competencia";

@Entity("profissional_competencias")
export class ProfissionalCompetencia {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Profissional, (profissional) => profissional.competencias, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "profissional_id" })
  profissional!: Profissional;

  @ManyToOne(() => Competencia, (competencia) => competencia.vinculos, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "competencia_id" })
  competencia!: Competencia;

  @Column("decimal", { precision: 5, scale: 2 })
  nivel!: number;
}
