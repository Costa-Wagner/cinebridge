import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";
import { Projeto } from "./Projeto";
import { Profissional } from "./Profissional";
import { Papel } from "../enums/Papel";
import { StatusConvite } from "../enums/StatusConvite";

@Entity("convites")
export class Convite {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Projeto, (projeto) => projeto.convites, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "projeto_id" })
  projeto!: Projeto;

  @ManyToOne(() => Profissional, (profissional) => profissional.convites, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "profissional_id" })
  profissional!: Profissional;

  @Column({ type: "enum", enum: Papel })
  papel!: Papel;

  @Column({ type: "enum", enum: StatusConvite, default: StatusConvite.PENDENTE })
  status!: StatusConvite;

  @CreateDateColumn()
  enviadoEm!: Date;

  @UpdateDateColumn()
  respondidoEm!: Date;
}
