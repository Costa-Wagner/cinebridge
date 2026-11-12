import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

export type CanalNotificacao = "EMAIL" | "MENSAGEM_INTERNA";
export type StatusNotificacao = "ENVIADA" | "FALHA";
export type OrigemNotificacao = "api" | "projetos";

/** Notificacao registrada pelo cinebridge-notificacoes (projetoId sem FK: o projeto vive em outro servico). */
@Entity("notificacoes")
export class Notificacao {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar" })
  projetoId!: string;

  @Column({ type: "varchar" })
  tipoEvento!: string;

  @Column({ type: "varchar" })
  canal!: CanalNotificacao;

  @Column({ type: "varchar" })
  destinatario!: string;

  @Column({ type: "varchar" })
  assunto!: string;

  @Column({ type: "text" })
  corpo!: string;

  @Column({ type: "varchar" })
  status!: StatusNotificacao;

  @Column({ type: "text", nullable: true })
  erro!: string | null;

  @Column({ type: "varchar" })
  origem!: OrigemNotificacao;

  @CreateDateColumn({ type: "timestamptz" })
  criadoEm!: Date;

  @Column({ type: "timestamptz", nullable: true })
  enviadoEm!: Date | null;
}
