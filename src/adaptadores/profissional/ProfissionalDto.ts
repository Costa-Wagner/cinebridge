import { Profissional } from "../../domain/entities/Profissional";
import { ProfissionalCompetencia } from "../../domain/entities/ProfissionalCompetencia";
import { Competencia } from "../../domain/entities/Competencia";
import { Avaliacao } from "../../domain/entities/Avaliacao";

/** Forma de um Profissional no fio: sem referencias circulares e sem convites/recomendacoes (sao da api). */
export interface ProfissionalDto {
  id: string;
  nome: string;
  email: string;
  especialidades: string[];
  precoBaseDiaria: number;
  disponibilidade: { inicio: string; fim: string }[];
  localizacao: string;
  competencias: { id?: string; nivel: number; competencia: { id?: string; nome: string } }[];
  avaliacoes: { id?: string; nota: number; comentario?: string; criadoEm?: string }[];
}

export function paraDto(p: Profissional): ProfissionalDto {
  return {
    id: p.id,
    nome: p.nome,
    email: p.email,
    especialidades: p.especialidades,
    precoBaseDiaria: Number(p.precoBaseDiaria),
    disponibilidade: p.disponibilidade,
    localizacao: p.localizacao,
    competencias: (p.competencias ?? []).map((v) => ({
      id: v.id,
      nivel: Number(v.nivel),
      competencia: { id: v.competencia.id, nome: v.competencia.nome }
    })),
    avaliacoes: (p.avaliacoes ?? []).map((a) => ({
      id: a.id,
      nota: Number(a.nota),
      comentario: a.comentario,
      criadoEm: a.criadoEm?.toISOString()
    }))
  };
}

export function deDto(dto: ProfissionalDto): Profissional {
  const p = new Profissional();
  p.id = dto.id;
  p.nome = dto.nome;
  p.email = dto.email;
  p.especialidades = dto.especialidades;
  p.precoBaseDiaria = dto.precoBaseDiaria;
  p.disponibilidade = dto.disponibilidade;
  p.localizacao = dto.localizacao;
  p.competencias = dto.competencias.map((c) =>
    Object.assign(new ProfissionalCompetencia(), {
      id: c.id,
      nivel: c.nivel,
      profissional: p,
      competencia: Object.assign(new Competencia(), { id: c.competencia.id, nome: c.competencia.nome })
    })
  );
  p.avaliacoes = dto.avaliacoes.map((a) =>
    Object.assign(new Avaliacao(), {
      id: a.id,
      nota: a.nota,
      comentario: a.comentario,
      criadoEm: a.criadoEm ? new Date(a.criadoEm) : new Date(),
      profissional: p
    })
  );
  p.convites = [];
  p.recomendacoes = [];
  return p;
}
