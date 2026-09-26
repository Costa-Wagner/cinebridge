import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from "typeorm";
import { Profissional } from "./Profissional";

@Entity("avaliacoes")
export class Avaliacao {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Profissional, (profissional) => profissional.avaliacoes, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "profissional_id" })
  profissional!: Profissional;

  @Column("decimal", { precision: 3, scale: 2 })
  nota!: number;

  @Column({ type: "text", nullable: true })
  comentario?: string;

  @CreateDateColumn()
  criadoEm!: Date;
}
