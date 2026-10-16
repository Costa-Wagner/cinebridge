import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  TableInheritance
} from "typeorm";
import { TipoCaptacao } from "../enums/TipoCaptacao";
import { PapelObrigatorio } from "./PapelObrigatorio";
import { Recomendacao } from "./Recomendacao";
import { Convite } from "./Convite";
import type { ElementoVisitavel } from "../../visitors/ElementoVisitavel";
import type { VisitanteProjeto } from "../../visitors/VisitanteProjeto";

/**
 * Tabela unica com discriminador `tipoCaptacao`: cada tipo de projeto
 * (ProjetoDocumentario, ProjetoAnimacao, ProjetoPublicitario) e' uma
 * subclasse persistida nesta mesma tabela. Persistir sempre pela
 * subclasse, nunca por uma instancia da base.
 */
@Entity("projetos")
@TableInheritance({ column: { type: "enum", enum: TipoCaptacao, name: "tipoCaptacao" } })
export class Projeto implements ElementoVisitavel {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  genero!: string;

  @Column("int")
  duracaoEstimadaMinutos!: number;

  @Column("decimal", { precision: 12, scale: 2 })
  orcamentoTotal!: number;

  @Column("date")
  dataEntrega!: string;

  @Column({ type: "enum", enum: TipoCaptacao })
  tipoCaptacao!: TipoCaptacao;

  @Column()
  localizacaoFilmagem!: string;

  @Column("jsonb")
  papeisObrigatorios!: PapelObrigatorio[];

  @OneToMany(() => Recomendacao, (recomendacao) => recomendacao.projeto)
  recomendacoes!: Recomendacao[];

  @OneToMany(() => Convite, (convite) => convite.projeto)
  convites!: Convite[];

  @CreateDateColumn()
  criadoEm!: Date;

  aceitar(visitante: VisitanteProjeto): void {
    visitante.visitarProjeto(this);
  }

  /**
   * Prototype: devolve uma copia profunda, ainda nao persistida (sem id,
   * convites ou recomendacoes), do mesmo tipo concreto do original.
   * As subclasses estendem para copiar seus proprios campos.
   */
  clonar(): Projeto {
    const copia = new (this.constructor as new () => Projeto)();
    copia.genero = this.genero;
    copia.duracaoEstimadaMinutos = this.duracaoEstimadaMinutos;
    copia.orcamentoTotal = this.orcamentoTotal;
    copia.dataEntrega = this.dataEntrega;
    copia.tipoCaptacao = this.tipoCaptacao;
    copia.localizacaoFilmagem = this.localizacaoFilmagem;
    copia.papeisObrigatorios = this.papeisObrigatorios.map((p) => ({ ...p }));
    return copia;
  }
}