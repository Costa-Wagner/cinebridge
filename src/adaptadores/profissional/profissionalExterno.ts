import { Profissional } from "../../domain/entities/Profissional";

/** Monta um Profissional do dominio a partir de dados ja traduzidos de um provedor externo. */
export function criarProfissionalExterno(dados: {
  id: string;
  nome: string;
  email: string;
  especialidades: string[];
  precoBaseDiaria: number;
  localizacao: string;
}): Profissional {
  const p = new Profissional();
  Object.assign(p, dados, { disponibilidade: [], competencias: [], avaliacoes: [], convites: [], recomendacoes: [] });
  return p;
}
