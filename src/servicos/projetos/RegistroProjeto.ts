import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export const STATUS_REGISTRO = ["CRIADO", "ATUALIZADO", "FINALIZADO"] as const;
export type StatusRegistro = (typeof STATUS_REGISTRO)[number];

const numero = { to: (v: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) };

/** Registro do projeto no cinebridge-projetos (fonte de verdade do ciclo de vida; o projeto completo fica na api). */
@Entity("registros_projeto")
export class RegistroProjeto {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  tipoCaptacao!: string;

  @Column({ type: "varchar", nullable: true })
  genero!: string | null;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true, transformer: numero })
  orcamentoTotal!: number | null;

  @Column({ type: "varchar", nullable: true })
  dataEntrega!: string | null;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true, transformer: numero })
  custoTotal!: number | null;

  @Column({ type: "int", nullable: true })
  prazoTotal!: number | null;

  @Column({ type: "varchar" })
  status!: StatusRegistro;

  @Column({ type: "jsonb", nullable: true })
  equipe!: { papel: string; profissionalId: string; nome: string }[] | null;

  @Column({ type: "timestamptz", nullable: true })
  finalizadoEm!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  criadoEm!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  atualizadoEm!: Date;
}
