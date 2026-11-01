import { DataSource } from "typeorm";
import { AdaptadorProfissional, AvaliacaoProfissional, CriteriosProfissional, validarNota } from "./AdaptadorProfissional";
import { CatalogoProfissionais } from "../../aplicacao/CatalogoProfissionais";
import { Profissional } from "../../domain/entities/Profissional";
import { Avaliacao } from "../../domain/entities/Avaliacao";

/** Cadastro proprio da plataforma (Postgres via CatalogoProfissionais). */
export class AdaptadorInterno implements AdaptadorProfissional {
  constructor(
    private readonly catalogo: CatalogoProfissionais,
    private readonly dataSource: DataSource
  ) {}

  async listarProfissionais(criterios: CriteriosProfissional): Promise<Profissional[]> {
    const { papeis, limitePorPapel } = criterios;
    if (!papeis || papeis.length === 0) return this.catalogo.listar();
    return limitePorPapel === undefined
      ? this.catalogo.preSelecionar(papeis)
      : this.catalogo.preSelecionar(papeis, limitePorPapel);
  }

  async detalharProfissional(id: string): Promise<Profissional | null> {
    return (await this.catalogo.listar()).find((p) => p.id === id) ?? null;
  }

  async registrarAvaliacao(id: string, avaliacao: AvaliacaoProfissional): Promise<void> {
    validarNota(avaliacao.nota);
    await this.dataSource.getRepository(Avaliacao).insert({
      nota: avaliacao.nota,
      comentario: avaliacao.comentario,
      profissional: { id } as Profissional
    });
    this.catalogo.invalidar();
  }
}
