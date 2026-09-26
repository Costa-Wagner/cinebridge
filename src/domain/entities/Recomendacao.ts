import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from "typeorm";
import { Projeto } from "./Projeto";
import { Profissional } from "./Profissional";
import { Papel } from "../enums/Papel";

@Entity("recomendacoes")
export class Recomendacao {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Projeto, (projeto) => projeto.recomendacoes, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "projeto_id" })
  projeto!: Projeto;

  @ManyToOne(() => Profissional, (profissional) => profissional.recomendacoes, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "profissional_id" })
  profissional!: Profissional;

  @Column({ type: "enum", enum: Papel })
  papel!: Papel;

  @Column("decimal", { precision: 5, scale: 2 })
  pontuacao!: number;

  @Column("int")
  posicaoRanking!: number;

  @Column()
  estrategiaUtilizada!: string;

  @CreateDateColumn()
  criadoEm!: Date;
}
