import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Equipe } from "./Equipe";
import { Profissional } from "./Profissional";
import { Papel } from "../enums/Papel";

@Entity("membros_equipe")
export class MembroEquipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Equipe, (equipe) => equipe.membros, { onDelete: "CASCADE" })
  @JoinColumn({ name: "equipe_id" })
  equipe!: Equipe;

  @ManyToOne(() => Profissional, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profissional_id" })
  profissional!: Profissional;

  @Column({ type: "enum", enum: Papel })
  papel!: Papel;

  @Column({ default: false })
  aceitouConvite!: boolean;
}
