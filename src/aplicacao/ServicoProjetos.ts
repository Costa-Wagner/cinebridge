import { DataSource } from "typeorm";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { DadosProjeto } from "../fabricas/FabricaProjeto";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";
import { Equipe } from "../domain/entities/Equipe";

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

  /** Recomenda e persiste a equipe proposta (substitui a anterior do projeto). Null se o projeto nao existe. */
  async recomendar(projetoId: string): Promise<Equipe | null> {
    const projeto = await this.dataSource.getRepository(Projeto).findOneBy({ id: projetoId });
    if (!projeto) return null;

    const profissionais = await this.dataSource.getRepository(Profissional).find({
      relations: ["competencias", "competencias.competencia", "avaliacoes", "convites", "convites.projeto"]
    });

    const equipe = this.sistema.recomendar(projeto, profissionais);
    await this.dataSource.transaction(async (manager) => {
      await manager.createQueryBuilder().delete().from(Equipe).where("projeto_id = :id", { id: projeto.id }).execute();
      await manager.save(equipe);
    });
    return equipe;
  }

  async buscarEquipe(projetoId: string): Promise<Equipe | null> {
    return this.dataSource.getRepository(Equipe).findOne({
      where: { projeto: { id: projetoId } },
      relations: ["membros", "membros.profissional"]
    });
  }
}
