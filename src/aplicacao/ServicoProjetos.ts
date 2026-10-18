import { DataSource } from "typeorm";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { TipoEvento } from "../observers/TipoEvento";
import { DadosProjeto } from "../fabricas/FabricaProjeto";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { Papel } from "../domain/enums/Papel";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { StatusEquipe } from "../domain/enums/StatusEquipe";
import { OperacaoInvalidaError } from "../domain/erros";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";
import { MembroEquipe } from "../domain/entities/MembroEquipe";
import { Convite } from "../domain/entities/Convite";

const RELACOES_PROFISSIONAL = ["competencias", "competencias.competencia", "avaliacoes", "convites", "convites.projeto"];
const RELACOES_EQUIPE = ["equipe", "equipe.membros", "equipe.membros.profissional", "equipe.membros.convite"];

export interface AjustesProjeto {
  orcamentoTotal?: number;
  dataEntrega?: string;
}

/** Casos de uso da API: orquestra banco + SistemaRecomendacao. */
export class ServicoProjetos {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaRecomendacao
  ) {}

  async criar(tipo: TipoCaptacao, dados: DadosProjeto): Promise<Projeto> {
    const projeto = this.sistema.criarProjeto(tipo, dados);
    return this.dataSource.manager.save(projeto);
  }

  /**
   * Primeira recomendacao do projeto. Se ja existe uma equipe sem convites,
   * ela e' substituida; com convites em andamento use `reavaliar`.
   */
  async recomendar(projetoId: string): Promise<Equipe | null> {
    const projeto = await this.carregarProjeto(projetoId);
    if (!projeto) return null;
    if (projeto.equipe?.membros.some((m) => m.convite)) {
      throw new OperacaoInvalidaError("Equipe ja tem convites em andamento; use a reavaliacao");
    }

    const profissionais = await this.carregarProfissionais();
    const equipe = this.sistema.recomendar(projeto, profissionais);
    await this.dataSource.transaction(async (manager) => {
      await manager.createQueryBuilder().delete().from(Equipe).where("projeto_id = :id", { id: projeto.id }).execute();
      await manager.save(equipe);
    });
    return equipe;
  }

  async buscarEquipe(projetoId: string): Promise<Equipe | null> {
    const projeto = await this.carregarProjeto(projetoId);
    if (!projeto?.equipe) return null;
    return this.apresentar(projeto);
  }

  /** O produtor aprova o membro proposto: nasce o convite e o profissional e' notificado. */
  async aceitarRecomendacao(projetoId: string, papel: Papel, profissionalId: string): Promise<Convite | null> {
    const projeto = await this.carregarProjeto(projetoId);
    if (!projeto) return null;
    const profissional = this.membroProposto(projeto, papel, profissionalId);

    const convite = projeto.aceitarRecomendacao(papel, profissional);
    await this.salvar(projeto);

    this.sistema.notificarObservadores({
      tipo: TipoEvento.CONVITE_ENVIADO,
      projeto,
      papel,
      candidatos: [profissional]
    });
    return convite;
  }

  /** O profissional responde ao convite; o produtor e' notificado e, se todos confirmaram, a equipe e' formada. */
  async responderConvite(
    conviteId: string,
    aceito: boolean
  ): Promise<{ convite: Convite; equipeFormada: boolean } | null> {
    const existente = await this.dataSource.getRepository(Convite).findOne({
      where: { id: conviteId },
      relations: ["projeto"]
    });
    if (!existente) return null;
    if (existente.status !== StatusConvite.PENDENTE) {
      throw new OperacaoInvalidaError(`Convite ja esta ${existente.status}`);
    }

    const projeto = (await this.carregarProjeto(existente.projeto.id))!;
    const membro = projeto.equipe?.membros.find((m) => m.convite?.id === conviteId);
    if (!membro?.convite) throw new OperacaoInvalidaError("Convite nao pertence a equipe atual");

    membro.convite.status = aceito ? StatusConvite.ACEITO : StatusConvite.RECUSADO;
    membro.aceitouConvite = aceito;
    const equipe = projeto.equipe!;
    const equipeFormada = aceito && projeto.papeisPendentes().length === 0;
    if (equipeFormada) {
      equipe.status = StatusEquipe.FORMADA;
      equipe.formadaEm = new Date();
    }
    await this.salvar(projeto);

    this.sistema.notificarObservadores({
      tipo: aceito ? TipoEvento.CONVITE_ACEITO : TipoEvento.CONVITE_RECUSADO,
      projeto,
      papel: membro.papel,
      candidatos: [membro.profissional]
    });
    if (equipeFormada) {
      this.sistema.notificarObservadores({
        tipo: TipoEvento.EQUIPE_FORMADA,
        projeto,
        papel: null,
        candidatos: equipe.membros.map((m) => m.profissional)
      });
    }
    return { convite: membro.convite, equipeFormada };
  }

  /** O produtor dispensa o membro; nova rodada de recomendacao so' para o papel afetado. */
  async substituirMembro(projetoId: string, papel: Papel, profissionalId: string): Promise<Equipe | null> {
    const projeto = await this.carregarProjeto(projetoId);
    if (!projeto) return null;
    const profissional = this.membroProposto(projeto, papel, profissionalId);
    const convitesAfetados = this.convitesDaEquipe(projeto);

    projeto.substituirMembro(papel, profissional);
    this.sistema.notificarObservadores({
      tipo: TipoEvento.MEMBRO_SUBSTITUIDO,
      projeto,
      papel,
      candidatos: [profissional]
    });
    projeto.equipe!.membros.push(...(await this.proporMembros(projeto, [papel])));

    await this.salvar(projeto, convitesAfetados);
    return this.apresentar(projeto);
  }

  /**
   * O produtor pede nova avaliacao (opcionalmente com orcamento/prazo novos):
   * descarta quem ainda nao confirmou e refaz apenas esses papeis.
   */
  async reavaliar(projetoId: string, ajustes: AjustesProjeto = {}): Promise<Equipe | null> {
    const projeto = await this.carregarProjeto(projetoId);
    if (!projeto) return null;
    this.exigirEquipe(projeto);
    if (ajustes.orcamentoTotal !== undefined) projeto.orcamentoTotal = ajustes.orcamentoTotal;
    if (ajustes.dataEntrega !== undefined) projeto.dataEntrega = ajustes.dataEntrega;
    const convitesAfetados = this.convitesDaEquipe(projeto);

    const papeis = projeto.solicitarReavaliacao();
    projeto.equipe!.membros.push(...(await this.proporMembros(projeto, papeis)));

    await this.salvar(projeto, convitesAfetados);
    return this.apresentar(projeto);
  }

  // ---- apoio ----

  private async carregarProjeto(id: string): Promise<Projeto | null> {
    return this.dataSource.getRepository(Projeto).findOne({ where: { id }, relations: RELACOES_EQUIPE });
  }

  private carregarProfissionais(): Promise<Profissional[]> {
    return this.dataSource.getRepository(Profissional).find({ relations: RELACOES_PROFISSIONAL });
  }

  private exigirEquipe(projeto: Projeto): Equipe {
    if (!projeto.equipe) {
      throw new OperacaoInvalidaError("Projeto ainda nao tem equipe proposta; recomende antes");
    }
    return projeto.equipe;
  }

  private membroProposto(projeto: Projeto, papel: Papel, profissionalId: string): Profissional {
    this.exigirEquipe(projeto);
    const membro = projeto.membroDoPapel(papel);
    if (!membro || membro.profissional.id !== profissionalId) {
      throw new OperacaoInvalidaError(`Profissional nao e' o membro proposto para ${papel}`);
    }
    return membro.profissional;
  }

  private convitesDaEquipe(projeto: Projeto): Convite[] {
    return (projeto.equipe?.membros ?? []).flatMap((m) => (m.convite ? [m.convite] : []));
  }

  /** Sugere membro para cada papel, sem repetir quem ja esta na equipe nem quem o produtor dispensou naquele papel. */
  private async proporMembros(projeto: Projeto, papeis: Papel[]): Promise<MembroEquipe[]> {
    const todos = await this.carregarProfissionais();
    const ocupados = new Set(projeto.equipe!.membros.map((m) => m.profissional.id));
    const novos: MembroEquipe[] = [];
    for (const papel of papeis) {
      const dispensados = new Set((projeto.rejeitados ?? []).filter((r) => r.papel === papel).map((r) => r.profissionalId));
      const candidatos = todos.filter((p) => !ocupados.has(p.id) && !dispensados.has(p.id));
      for (const membro of this.sistema.recomendar(projeto, candidatos, undefined, [papel]).membros) {
        ocupados.add(membro.profissional.id);
        novos.push(membro);
      }
    }
    return novos;
  }

  private async salvar(projeto: Projeto, convitesAfetados: Convite[] = []): Promise<void> {
    const equipe = projeto.equipe!;
    equipe.projeto = projeto;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(projeto);
      if (convitesAfetados.length > 0) await manager.save(convitesAfetados);
      await manager.save(equipe);
    });
  }

  /** Membros na ordem dos papeis do projeto (o banco nao garante ordem). */
  private apresentar(projeto: Projeto): Equipe {
    const equipe = projeto.equipe!;
    equipe.projeto = projeto;
    const ordem = projeto.papeisObrigatorios.map((p) => p.papel as string);
    equipe.membros.sort((a, b) => ordem.indexOf(a.papel) - ordem.indexOf(b.papel));
    return equipe;
  }
}
