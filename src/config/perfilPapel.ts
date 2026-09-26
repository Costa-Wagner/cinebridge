import { Papel } from "../domain/enums/Papel";

/**
 * Vetor-alvo de competencias por papel: nome da competencia -> peso ideal (0-10).
 * Serve de referencia pra strategy de similaridade de cosseno comparar
 * contra o vetor real de cada profissional (ProfissionalCompetencia.nivel).
 * Em producao isso poderia vir de configuracao editavel, mas o enunciado
 * nao define uma entidade pra isso, entao fica como constante de dominio.
 */
export const PERFIL_IDEAL_PAPEL: Record<Papel, Record<string, number>> = {
  [Papel.DIRETOR]: {
    Liderança: 9,
    Roteiro: 6,
    Direção: 10,
    Edição: 4
  },
  [Papel.DIRETOR_FOTOGRAFIA]: {
    Fotografia: 10,
    Iluminação: 9,
    Câmera: 9,
    Edição: 3
  },
  [Papel.SONOPLASTA]: {
    Som: 10,
    "Mixagem de Áudio": 9,
    Edição: 3
  },
  [Papel.EDITOR]: {
    Edição: 10,
    "Color Grading": 6,
    Roteiro: 3
  },
  [Papel.ROTEIRISTA]: {
    Roteiro: 10,
    Direção: 4,
    Pesquisa: 6
  },
  [Papel.ESPECIALISTA_EFEITOS_VISUAIS]: {
    "Efeitos Visuais": 10,
    Animação: 7,
    Edição: 4
  }
};
