import { DataSource } from "typeorm";
import { Profissional } from "../domain/entities/Profissional";
import { ProfissionalCompetencia } from "../domain/entities/ProfissionalCompetencia";
import { Competencia } from "../domain/entities/Competencia";
import { Avaliacao } from "../domain/entities/Avaliacao";
import { Convite } from "../domain/entities/Convite";
import { Projeto } from "../domain/entities/Projeto";
import { StatusConvite } from "../domain/enums/StatusConvite";
import { Papel } from "../domain/enums/Papel";

/**
 * Catalogo de profissionais com carga O(n) (queries simples + montagem manual),
 * cache em memoria com TTL e invalidacao quando o conjunto de convites muda.
 *
 * Substitui o `find({ relations })` do TypeORM, que gera produto cartesiano
 * e estoura memoria/tempo com ~10k registros.
 */
export class CatalogoProfissionais {
  private cache: Profissional[] | null = null;
  private carregadoEm = 0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly ttlMs: number = 60_000
  ) {}

  /** Retorna o catalogo (cache hit ou recarga completa). */
  async listar(): Promise<Profissional[]> {
    if (this.cache && Date.now() - this.carregadoEm < this.ttlMs) {
      return this.cache;
    }
    this.cache = await this.carregar();
    this.carregadoEm = Date.now();
    return this.cache;
  }

  /** Descarta o cache (chamar apos aceitar/responder/substituir/reavaliar). */
  invalidar(): void {
    this.cache = null;
    this.carregadoEm = 0;
  }

  /** Forca recarga imediata (util em testes de carga). */
  async recarregar(): Promise<Profissional[]> {
    this.invalidar();
    return this.listar();
  }

  // ---- carga O(n) ----

  private async carregar(): Promise<Profissional[]> {
    const [profissionais, vinculos, avaliacoes, convites] = await Promise.all([
      this.dataSource.query(
        `SELECT id, nome, email, especialidades, "precoBaseDiaria", disponibilidade, localizacao
         FROM profissionais`
      ),
      this.dataSource.query(
        `SELECT pc.id, pc.profissional_id, pc.competencia_id, pc.nivel, c.nome AS competencia_nome
         FROM profissional_competencias pc
         INNER JOIN competencias c ON c.id = pc.competencia_id`
      ),
      this.dataSource.query(
        `SELECT id, profissional_id, nota, comentario, "criadoEm"
         FROM avaliacoes`
      ),
      this.dataSource.query(
        `SELECT cv.id, cv.profissional_id, cv.projeto_id, cv.papel, cv.status, cv."enviadoEm",
                p.genero AS projeto_genero
         FROM convites cv
         LEFT JOIN projetos p ON p.id = cv.projeto_id`
      )
    ]);

    const porId = new Map<string, Profissional>();
    for (const row of profissionais as Array<Record<string, unknown>>) {
      const p = new Profissional();
      p.id = row.id as string;
      p.nome = row.nome as string;
      p.email = row.email as string;
      p.especialidades = this.parseArray(row.especialidades);
      p.precoBaseDiaria = Number(row.precoBaseDiaria);
      p.disponibilidade = (this.parseJson(row.disponibilidade) as { inicio: string; fim: string }[] | null) ?? [];
      p.localizacao = row.localizacao as string;
      p.competencias = [];
      p.avaliacoes = [];
      p.convites = [];
      p.recomendacoes = [];
      porId.set(p.id, p);
    }

    for (const row of vinculos as Array<Record<string, unknown>>) {
      const p = porId.get(row.profissional_id as string);
      if (!p) continue;
      const competencia = new Competencia();
      competencia.id = row.competencia_id as string;
      competencia.nome = row.competencia_nome as string;
      const vinculo = new ProfissionalCompetencia();
      vinculo.id = row.id as string;
      vinculo.nivel = Number(row.nivel);
      vinculo.competencia = competencia;
      vinculo.profissional = p;
      p.competencias.push(vinculo);
    }

    for (const row of avaliacoes as Array<Record<string, unknown>>) {
      const p = porId.get(row.profissional_id as string);
      if (!p) continue;
      const av = new Avaliacao();
      av.id = row.id as string;
      av.nota = Number(row.nota);
      av.comentario = (row.comentario as string) ?? undefined;
      av.criadoEm = row.criadoEm ? new Date(row.criadoEm as string) : new Date();
      av.profissional = p;
      p.avaliacoes.push(av);
    }

    for (const row of convites as Array<Record<string, unknown>>) {
      const p = porId.get(row.profissional_id as string);
      if (!p) continue;
      const projeto = new Projeto();
      projeto.id = row.projeto_id as string;
      projeto.genero = (row.projeto_genero as string) ?? "";
      const cv = new Convite();
      cv.id = row.id as string;
      cv.papel = row.papel as Papel;
      cv.status = row.status as StatusConvite;
      cv.enviadoEm = row.enviadoEm ? new Date(row.enviadoEm as string) : new Date();
      cv.projeto = projeto;
      cv.profissional = p;
      p.convites.push(cv);
    }

    return [...porId.values()];
  }

  private parseArray(valor: unknown): string[] {
    if (Array.isArray(valor)) return valor as string[];
    if (typeof valor === "string") {
      // TypeORM simple-array: "a,b,c"
      return valor.length === 0 ? [] : valor.split(",");
    }
    return [];
  }

  private parseJson(valor: unknown): unknown {
    if (valor == null) return null;
    if (typeof valor === "object") return valor;
    if (typeof valor === "string") {
      try {
        return JSON.parse(valor);
      } catch {
        return null;
      }
    }
    return null;
  }
}
