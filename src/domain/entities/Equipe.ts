import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Column
} from "typeorm";
import { Projeto } from "./Projeto";
import { MembroEquipe } from "./MembroEquipe";
import { Profissional } from "./Profissional";
import { Papel } from "../enums/Papel";
import { StatusEquipe } from "../enums/StatusEquipe";

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

  @Column({ type: "enum", enum: StatusEquipe, default: StatusEquipe.EM_FORMACAO })
  status!: StatusEquipe;

  /** Registro da composicao final: quando todos os papeis ficaram confirmados. */
  @Column({ type: "timestamp", nullable: true })
  formadaEm!: Date | null;

  /** Nao persistido: ranking completo por papel (o primeiro de cada lista e' o membro proposto). */
  ranking!: Map<Papel, Profissional[]>;
}
