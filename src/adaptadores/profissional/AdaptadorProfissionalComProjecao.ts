import { DataSource } from "typeorm";
import { AdaptadorProfissional, AvaliacaoProfissional, CriteriosProfissional } from "./AdaptadorProfissional";
import { Profissional } from "../../domain/entities/Profissional";
import { Convite } from "../../domain/entities/Convite";
import { Projeto } from "../../domain/entities/Projeto";
import { StatusConvite } from "../../domain/enums/StatusConvite";
import { Papel } from "../../domain/enums/Papel";

/**
 * Decorator de AdaptadorProfissional para quando o cadastro e' remoto.
 * Convites, recomendacoes e equipes da api referenciam profissionais por FK, e FK nao
 * atravessa bancos: a cada consulta o profissional e' gravado (upsert) numa projecao
 * local, e os convites do historico sao anexados (a filtragem colaborativa os usa).
 * O dono do cadastro continua sendo o servico remoto.
 */
export class AdaptadorProfissionalComProjecao implements AdaptadorProfissional {
  constructor(
    private readonly remoto: AdaptadorProfissional,
    private readonly dataSource: DataSource
  ) {}

  async listarProfissionais(criterios: CriteriosProfissional): Promise<Profissional[]> {
    const profissionais = await this.remoto.listarProfissionais(criterios);
    await this.projetar(profissionais);
    return profissionais;
  }

  async detalharProfissional(id: string): Promise<Profissional | null> {
    const profissional = await this.remoto.detalharProfissional(id);
    if (profissional) await this.projetar([profissional]);
    return profissional;
  }

  registrarAvaliacao(id: string, avaliacao: AvaliacaoProfissional): Promise<void> {
    return this.remoto.registrarAvaliacao(id, avaliacao);
  }

  private async projetar(profissionais: Profissional[]): Promise<void> {
    if (profissionais.length === 0) return;
    await this.dataSource.getRepository(Profissional).upsert(
      profissionais.map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        especialidades: p.especialidades,
        precoBaseDiaria: p.precoBaseDiaria,
        disponibilidade: p.disponibilidade,
        localizacao: p.localizacao
      })),
      ["id"]
    );
    await this.anexarConvites(profissionais);
  }

  private async anexarConvites(profissionais: Profissional[]): Promise<void> {
    const porId = new Map(profissionais.map((p) => [p.id, p]));
    const linhas = (await this.dataSource.query(
      `SELECT cv.id, cv.profissional_id, cv.projeto_id, cv.papel, cv.status, cv."enviadoEm",
              p.genero AS projeto_genero
       FROM convites cv
       LEFT JOIN projetos p ON p.id = cv.projeto_id
       WHERE cv.profissional_id = ANY($1)`,
      [[...porId.keys()]]
    )) as Array<Record<string, unknown>>;
    for (const linha of linhas) {
      const dono = porId.get(linha.profissional_id as string);
      if (!dono) continue;
      dono.convites.push(
        Object.assign(new Convite(), {
          id: linha.id as string,
          papel: linha.papel as Papel,
          status: linha.status as StatusConvite,
          enviadoEm: linha.enviadoEm ? new Date(linha.enviadoEm as string) : new Date(),
          projeto: Object.assign(new Projeto(), { id: linha.projeto_id as string, genero: (linha.projeto_genero as string) ?? "" }),
          profissional: dono
        })
      );
    }
  }
}
