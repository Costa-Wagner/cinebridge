import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ProfissionalCompetencia } from "./ProfissionalCompetencia";

@Entity("competencias")
export class Competencia {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  nome!: string;

  @OneToMany(
    () => ProfissionalCompetencia,
    (vinculo) => vinculo.competencia
  )
  vinculos!: ProfissionalCompetencia[];
}
