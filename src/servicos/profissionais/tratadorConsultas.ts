import { AdaptadorProfissional } from "../../adaptadores/profissional/AdaptadorProfissional";
import { ConsultaProfissionais } from "../../adaptadores/profissional/protocoloProfissionais";
import { paraDto } from "../../adaptadores/profissional/ProfissionalDto";

/** Lado servidor das consultas: traduz cada operacao para o AdaptadorProfissional local do servico. */
export function criarTratadorConsultas(adaptador: AdaptadorProfissional) {
  return async (consulta: ConsultaProfissionais): Promise<unknown> => {
    switch (consulta.operacao) {
      case "listar":
        return (await adaptador.listarProfissionais(consulta.criterios ?? {})).map(paraDto);
      case "detalhar": {
        const profissional = await adaptador.detalharProfissional(consulta.id);
        return profissional ? paraDto(profissional) : null;
      }
      case "avaliar":
        await adaptador.registrarAvaliacao(consulta.id, consulta.avaliacao);
        return null;
      default:
        throw new Error(`Operacao desconhecida: ${(consulta as { operacao?: unknown }).operacao}`);
    }
  };
}
