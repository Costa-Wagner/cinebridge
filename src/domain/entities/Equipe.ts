import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn
} from "typeorm";
import { Projeto } from "./Projeto";
import { MembroEquipe } from "./MembroEquipe";

@Entity("equipes")
export class Equipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => Projeto, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projeto_id" })
  projeto!: Projeto;

  @OneToMany(() => MembroEquipe, (membro) => membro.equipe, { cascade: true })
  membros!: MembroEquipe[];

  @CreateDateColumn()
  criadaEm!: Date;
}
