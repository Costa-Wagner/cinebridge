import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany
} from "typeorm";
import { Avaliacao } from "./Avaliacao";
import { Convite } from "./Convite";
import { Recomendacao } from "./Recomendacao";
import { ProfissionalCompetencia } from "./ProfissionalCompetencia";
import type { ElementoVisitavel } from "../../visitors/ElementoVisitavel";
import type { VisitanteProjeto } from "../../visitors/VisitanteProjeto";

@Entity("profissionais")
export class Profissional implements ElementoVisitavel {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  nome!: string;

  @Column()
  email!: string;

  @Column("simple-array")
  especialidades!: string[];

  @Column("decimal", { precision: 10, scale: 2 })
  precoBaseDiaria!: number;

  @Column("jsonb")
  disponibilidade!: { inicio: string; fim: string }[];

  @Column()
  localizacao!: string;

  @OneToMany(() => ProfissionalCompetencia, (vinculo) => vinculo.profissional)
  competencias!: ProfissionalCompetencia[];

  @OneToMany(() => Avaliacao, (avaliacao) => avaliacao.profissional)
  avaliacoes!: Avaliacao[];

  @OneToMany(() => Convite, (convite) => convite.profissional)
  convites!: Convite[];

  @OneToMany(() => Recomendacao, (recomendacao) => recomendacao.profissional)
  recomendacoes!: Recomendacao[];

  aceitar(visitante: VisitanteProjeto): any {
    return visitante.visitarProfissional(this);
  }
}