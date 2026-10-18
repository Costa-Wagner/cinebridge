import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Equipe } from "./Equipe";
import { Profissional } from "./Profissional";
import { Convite } from "./Convite";
import { Papel } from "../enums/Papel";

@Entity("membros_equipe")
export class MembroEquipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Equipe, (equipe) => equipe.membros, { onDelete: "CASCADE", orphanedRowAction: "delete" })
  @JoinColumn({ name: "equipe_id" })
  equipe!: Equipe;

  @ManyToOne(() => Profissional, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profissional_id" })
  profissional!: Profissional;

  /** Convite enviado quando o produtor aceita a recomendacao (nulo = apenas proposto). */
  @ManyToOne(() => Convite, { nullable: true, cascade: ["insert", "update"], onDelete: "SET NULL" })
  @JoinColumn({ name: "convite_id" })
  convite?: Convite | null;

  @Column({ type: "enum", enum: Papel })
  papel!: Papel;

  @Column({ default: false })
  aceitouConvite!: boolean;
}
