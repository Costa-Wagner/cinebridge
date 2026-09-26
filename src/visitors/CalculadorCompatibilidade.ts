import { IVisitanteProjeto } from "./IVisitanteProjeto";
import { Projeto } from "../domain/entities/Projeto";
import { Profissional } from "../domain/entities/Profissional";

interface IndicadoresProjeto {
  criticidadeMedia: number;
  quantidadePapeis: number;
}

interface IndicadoresProfissional {
  nivelMedioCompetencias: number;
  quantidadeCompetencias: number;
  prontidao: number; // combina nivel medio de competencia com volume de avaliacoes
}

/**
 * Calcula indicadores agregados sobre a arvore, sem alterar as entidades
 * visitadas - guarda os resultados internamente, indexados por id.
 */
export class CalculadorCompatibilidade implements IVisitanteProjeto {
  readonly indicadoresProjetos = new Map<string, IndicadoresProjeto>();
  readonly indicadoresProfissionais = new Map<string, IndicadoresProfissional>();

  visitarProjeto(projeto: Projeto): void {
    const pesos = projeto.papeisObrigatorios.map((p) => p.peso);
    const criticidadeMedia = pesos.length
      ? pesos.reduce((soma, peso) => soma + peso, 0) / pesos.length
      : 0;

    this.indicadoresProjetos.set(projeto.id, {
      criticidadeMedia: Number(criticidadeMedia.toFixed(2)),
      quantidadePapeis: pesos.length
    });
  }

  visitarProfissional(profissional: Profissional): void {
    const niveis = (profissional.competencias ?? []).map((v) => Number(v.nivel));
    const nivelMedioCompetencias = niveis.length
      ? niveis.reduce((soma, n) => soma + n, 0) / niveis.length
      : 0;

    const quantidadeAvaliacoes = (profissional.avaliacoes ?? []).length;
    const fatorHistorico = Math.min(1, quantidadeAvaliacoes / 5);
    const prontidao = nivelMedioCompetencias * (0.6 + 0.4 * fatorHistorico);

    this.indicadoresProfissionais.set(profissional.id, {
      nivelMedioCompetencias: Number(nivelMedioCompetencias.toFixed(2)),
      quantidadeCompetencias: niveis.length,
      prontidao: Number(prontidao.toFixed(2))
    });
  }
}