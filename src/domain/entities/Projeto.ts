import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  TableInheritance
} from "typeorm";
import { TipoCaptacao } from "../enums/TipoCaptacao";
import { PapelObrigatorio } from "./PapelObrigatorio";
import { Recomendacao } from "./Recomendacao";
import { Convite } from "./Convite";
import { Equipe } from "./Equipe";
import type { MembroEquipe } from "./MembroEquipe";
import type { Profissional } from "./Profissional";
import { Papel } from "../enums/Papel";
import { StatusConvite } from "../enums/StatusConvite";
import { OperacaoInvalidaError } from "../erros";
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

  /** Equipe proposta/formada (lado inverso; a chave fica em equipes.projeto_id). */
  @OneToOne(() => Equipe, (equipe) => equipe.projeto)
  equipe?: Equipe | null;

  /** Profissionais que o produtor dispensou, por papel; nao voltam a ser sugeridos para o mesmo papel. */
  @Column({ type: "jsonb", default: () => "'[]'" })
  rejeitados!: { papel: Papel; profissionalId: string }[];

  @CreateDateColumn()
  criadoEm!: Date;

  aceitar(visitante: VisitanteProjeto): any {
    return visitante.visitarProjeto(this);
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
    copia.rejeitados = [];
    return copia;
  }

  // ---- Fluxo do produtor sobre a equipe proposta (so' estado; busca de novos candidatos e' do servico) ----

  /** Membro atual do papel, confirmado ou nao. */
  membroDoPapel(papel: Papel): MembroEquipe | undefined {
    return this.equipe?.membros?.find((m) => m.papel === papel);
  }

  /** Papeis ainda sem membro confirmado, na ordem do projeto. */
  papeisPendentes(): Papel[] {
    return this.papeisObrigatorios
      .map((p) => p.papel as Papel)
      .filter((papel) => !this.membroDoPapel(papel)?.aceitouConvite);
  }

  /** O produtor aprova o membro proposto para o papel: nasce o convite (PENDENTE). */
  aceitarRecomendacao(papel: Papel, profissional: Profissional): Convite {
    const membro = this.membroProposto(papel, profissional);
    if (membro.convite) {
      throw new OperacaoInvalidaError(`${profissional.nome} ja foi convidado(a) para ${papel}`);
    }
    const convite = new Convite();
    convite.projeto = this;
    convite.profissional = profissional;
    convite.papel = papel;
    convite.status = StatusConvite.PENDENTE;
    membro.convite = convite;
    return convite;
  }

  /** O produtor dispensa o membro proposto: sai da equipe, o convite pendente e' cancelado e ele nao volta para esse papel. */
  substituirMembro(papel: Papel, profissional: Profissional): void {
    const membro = this.membroProposto(papel, profissional);
    if (membro.aceitouConvite) {
      throw new OperacaoInvalidaError(
        `${profissional.nome} ja confirmou presenca em ${papel}; nao pode ser substituido(a)`
      );
    }
    this.descartar(membro);
    this.rejeitados = [...(this.rejeitados ?? []), { papel, profissionalId: profissional.id }];
  }

  /** Descarta os membros ainda nao confirmados e devolve os papeis a refazer. Confirmados permanecem. */
  solicitarReavaliacao(): Papel[] {
    for (const membro of [...(this.equipe?.membros ?? [])]) {
      if (!membro.aceitouConvite) this.descartar(membro);
    }
    return this.papeisPendentes();
  }

  private membroProposto(papel: Papel, profissional: Profissional): MembroEquipe {
    const membro = this.membroDoPapel(papel);
    if (!membro || membro.profissional.id !== profissional.id) {
      throw new OperacaoInvalidaError(`${profissional.nome} nao e' o membro proposto para ${papel}`);
    }
    return membro;
  }

  private descartar(membro: MembroEquipe): void {
    if (membro.convite?.status === StatusConvite.PENDENTE) {
      membro.convite.status = StatusConvite.CANCELADO;
    }
    this.equipe!.membros = this.equipe!.membros.filter((m) => m !== membro);
  }
}