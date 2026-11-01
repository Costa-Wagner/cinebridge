import { Papel } from "../enums/Papel";
import type { PapelObrigatorio } from "../entities/PapelObrigatorio";
import { PacoteServico } from "./PacoteServico";
import { ServicoAtomico } from "./ServicoAtomico";
import { DadoServico, ServicoInvalidoError, ServicoProjeto } from "./ServicoProjeto";

/** Reconstroi a arvore a partir do JSON (banco/API); formato inesperado = ServicoInvalidoError. */
export function servicoDeJSON(dado: DadoServico): ServicoProjeto {
  if (dado?.tipo === "ATOMICO") {
    return new ServicoAtomico(dado.nome, dado.papel as Papel, dado.peso, dado.custo, dado.prazoDias);
  }
  if (dado?.tipo === "PACOTE") {
    if (!Array.isArray(dado.servicos)) throw new ServicoInvalidoError(`Pacote "${dado.nome}": lista de servicos ausente`);
    return new PacoteServico(dado.nome, dado.servicos.map(servicoDeJSON), dado.modo);
  }
  throw new ServicoInvalidoError("Servico com tipo desconhecido (use ATOMICO ou PACOTE)");
}

/** Pacote plano com um servico atomico por papel (custo 0, prazo 1 ate' serem informados). */
export function pacoteDePapeis(papeis: PapelObrigatorio[], nome = "Projeto"): PacoteServico {
  return new PacoteServico(nome, papeis.map((p) => new ServicoAtomico(String(p.papel), p.papel, p.peso)));
}

/** Folhas da arvore, em ordem de profundidade. */
export function coletarAtomicos(servico: ServicoProjeto): ServicoAtomico[] {
  if (servico instanceof ServicoAtomico) return [servico];
  return servico.listarSubservicos().flatMap(coletarAtomicos);
}

/** Papeis (com peso) derivados da arvore. */
export function papeisDaArvore(servico: ServicoProjeto): PapelObrigatorio[] {
  return coletarAtomicos(servico).map((a) => ({ papel: a.papel, peso: a.peso }));
}
