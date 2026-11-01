import { Profissional } from "../../domain/entities/Profissional";
import { ProfissionalCompetencia } from "../../domain/entities/ProfissionalCompetencia";
import { Competencia } from "../../domain/entities/Competencia";

/** Provedores externos informam so' as habilidades, nao o nivel: assume-se um nivel medio-alto fixo. */
export const NIVEL_PADRAO_EXTERNO = 7;

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
  // cada habilidade vira uma competencia, para o ranking (cosseno) tratar o externo como qualquer profissional
  const competencias = dados.especialidades.map((nome) =>
    Object.assign(new ProfissionalCompetencia(), {
      nivel: NIVEL_PADRAO_EXTERNO,
      competencia: Object.assign(new Competencia(), { nome })
    })
  );
  Object.assign(p, dados, { disponibilidade: [], competencias, avaliacoes: [], convites: [], recomendacoes: [] });
  return p;
}
