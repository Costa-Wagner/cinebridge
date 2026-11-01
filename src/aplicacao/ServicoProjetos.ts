import { DataSource, EntityManager } from "typeorm";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { TipoEvento } from "../observers/TipoEvento";
import { DadosProjeto } from "../fabricas/FabricaProjeto";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { Papel } from "../domain/enums/Papel";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { StatusEquipe } from "../domain/enums/StatusEquipe";
import { OperacaoInvalidaError } from "../domain/erros";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";
import { MembroEquipe } from "../domain/entities/MembroEquipe";
import { Convite } from "../domain/entities/Convite";
import { Recomendacao } from "../domain/entities/Recomendacao";
import { CatalogoProfissionais } from "./CatalogoProfissionais";
import { ConfiguracaoDecoradores } from "../decoradores/PilhaDecoradores";
import { AdaptadorInterno } from "../adaptadores/profissional/AdaptadorInterno";

const RELACOES_EQUIPE = ["equipe", "equipe.membros", "equipe.membros.profissional", "equipe.membros.convite"];

export interface AjustesProjeto {
  orcamentoTotal?: number;
  dataEntrega?: string;
}

/** Casos de uso da API: orquestra banco + SistemaRecomendacao. */
export class ServicoProjetos {
  private readonly catalogo: CatalogoProfissionais;

  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaRecomendacao,
    catalogo?: CatalogoProfissionais,
    readonly decoradores: ConfiguracaoDecoradores = new ConfiguracaoDecoradores()
  ) {
    this.catalogo = catalogo ?? new CatalogoProfissionais(dataSource);
    if (!sistema.temAdaptadorProfissional()) {
      sistema.configurarAdaptadores({ profissional: new AdaptadorInterno(this.catalogo, dataSource) });
    }
  }

  /** Carrega o cadastro de profissionais antes da primeira requisicao (usado na subida do servidor). */
  async aquecerCadastro(): Promise<void> {
    await this.catalogo.listar();
  }

  async criar(tipo: TipoCaptacao, dados: DadosProjeto): Promise<Projeto> {
    const projeto = this.sistema.criarProjeto(tipo, dados);
    return this.dataSource.manager.save(projeto);
  }

  /**
   * Primeira recomendacao do projeto. Se ja existe uma equipe sem convites,
   * ela e' substituida; com convites em andamento use `reavaliar`.
   */
  async recomendar(projetoId: string, preferencias: { decoradores?: string[] } = {}): Promise<Equipe | null> {
    // caminho quente: sem carregar a arvore equipe/membros/convites (so' interessa se ha convites)
    const projeto = await this.dataSource.getRepository(Projeto).findOneBy({ id: projetoId });
    if (!projeto) return null;
    if (await this.temConvitesEmAndamento(projetoId)) {
      throw new OperacaoInvalidaError("Equipe ja tem convites em andamento; use a reavaliacao");
    }

    const equipe = await this.sistema.executarRecomendacao(projeto, {
      estrategia: this.estrategiaConfigurada(projeto, preferencias.decoradores)
    });

    // gravacao em lote (INSERTs diretos): e' uma equipe nova, sem nada a comparar com o banco
    await this.dataSource.transaction(async (manager) => {
      await manager.createQueryBuilder().delete().from(Equipe).where("projeto_id = :id", { id: projeto.id }).execute();
      await manager.insert(Equipe, equipe as never);
      for (const membro of equipe.membros) membro.equipe = equipe;
      if (equipe.membros.length > 0) await manager.insert(MembroEquipe, equipe.membros as never);
      await this.registrarRecomendacoes(manager, projeto, [equipe]);
    });
    return equipe;
  }

  private async temConvitesEmAndamento(projetoId: string): Promise<boolean> {
    const linhas = await this.dataSource.query(
      `SELECT 1 FROM membros_equipe m JOIN equipes e ON e.id = m.equipe_id
        WHERE e.projeto_id = $1 AND m.convite_id IS NOT NULL LIMIT 1`,
      [projetoId]
    );
    return linhas.length > 0;
  }

  /** Historico de recomendacoes do projeto (todas as rodadas), da mais recente para a mais antiga. Null se o projeto nao existe. */
  async listarRecomendacoes(projetoId: string): Promise<Recomendacao[] | null> {
    const projeto = await this.dataSource.getRepository(Projeto).findOne({ where: { id: projetoId } });
    if (!projeto) return null;
    return this.dataSource.getRepository(Recomendacao).find({
      where: { projeto: { id: projetoId } },
      relations: ["profissional"],
      order: { criadoEm: "DESC", papel: "ASC", posicaoRanking: "ASC" }
    });
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
    this.catalogo.invalidar();

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
    this.catalogo.invalidar();

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
    const proposta = await this.proporMembros(projeto, [papel]);
    projeto.equipe!.membros.push(...proposta.membros);

    await this.salvar(projeto, convitesAfetados, proposta.rodadas);
    this.catalogo.invalidar();
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
    const proposta = await this.proporMembros(projeto, papeis);
    projeto.equipe!.membros.push(...proposta.membros);

    await this.salvar(projeto, convitesAfetados, proposta.rodadas);
    this.catalogo.invalidar();
    return this.apresentar(projeto);
  }

  // ---- apoio ----

  private async carregarProjeto(id: string): Promise<Projeto | null> {
    return this.dataSource.getRepository(Projeto).findOne({ where: { id }, relations: RELACOES_EQUIPE });
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
  private async proporMembros(
    projeto: Projeto,
    papeis: Papel[]
  ): Promise<{ membros: MembroEquipe[]; rodadas: Equipe[] }> {
    const ocupados = new Set(projeto.equipe!.membros.map((m) => m.profissional.id));
    const novos: MembroEquipe[] = [];
    const rodadas: Equipe[] = [];
    for (const papel of papeis) {
      const dispensados = (projeto.rejeitados ?? []).filter((r) => r.papel === papel).map((r) => r.profissionalId);
      const excluir = new Set([...ocupados, ...dispensados]);
      const rodada = await this.sistema.executarRecomendacao(projeto, { papeis: [papel], excluir, estrategia: this.estrategiaConfigurada(projeto) });
      rodadas.push(rodada);
      for (const membro of rodada.membros) {
        ocupados.add(membro.profissional.id);
        novos.push(membro);
      }
    }
    return { membros: novos, rodadas };
  }

  private async salvar(projeto: Projeto, convitesAfetados: Convite[] = [], rodadas: Equipe[] = []): Promise<void> {
    const equipe = projeto.equipe!;
    equipe.projeto = projeto;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(projeto);
      if (convitesAfetados.length > 0) await manager.save(convitesAfetados);
      await manager.save(equipe);
      await this.registrarRecomendacoes(manager, projeto, rodadas);
    });
  }

  /** Grava o ranking de cada rodada (papel, posicao, recomendador) como historico do projeto. */
  private async registrarRecomendacoes(manager: EntityManager, projeto: Projeto, rodadas: Equipe[]): Promise<void> {
    const registros = rodadas.flatMap((rodada) =>
      [...(rodada.ranking ?? [])].flatMap(([papel, candidatos]) =>
        candidatos.map((profissional, indice) =>
          Object.assign(new Recomendacao(), {
            projeto,
            profissional,
            papel,
            pontuacao: null,
            posicaoRanking: indice + 1,
            estrategiaUtilizada: rodada.estrategia
          })
        )
      )
    );
    // um unico INSERT em lote: o historico e' so' gravacao e nao precisa do ciclo completo do ORM
    if (registros.length > 0) await manager.insert(Recomendacao, registros);
  }

  /** Membros na ordem dos papeis do projeto (o banco nao garante ordem). */
  private apresentar(projeto: Projeto): Equipe {
    const equipe = projeto.equipe!;
    equipe.projeto = projeto;
    const ordem = projeto.papeisObrigatorios.map((p) => p.papel as string);
    equipe.membros.sort((a, b) => ordem.indexOf(a.papel) - ordem.indexOf(b.papel));
    return equipe;
  }

  /** Recomendador do tipo do projeto envolvido pela pilha de decoradores vigente (undefined = sem decoradores). */
  private estrategiaConfigurada(projeto: Projeto, sobrepor?: string[]): RecomendacaoStrategy | undefined {
    const base = this.sistema.obterFabrica(projeto.tipoCaptacao).criarRecomendador();
    return this.decoradores.decorar(base, sobrepor);
  }
}
