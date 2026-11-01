import type { Papel } from "../domain/enums/Papel";
import type { Profissional } from "../domain/entities/Profissional";
import type { Projeto } from "../domain/entities/Projeto";
import type { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { RecomendacaoDecorator, nomeDaEstrategia } from "./RecomendacaoDecorator";

export interface RegistroAuditoriaRecomendacao {
  origem: "AUDITORIA_RECOMENDACAO";
  em: string;
  estrategia: string;
  projetoId: string | null;
  tipoProjeto: string;
  candidatos: number;
  resultado: Record<string, number>;
  duracaoMs: number;
  erro?: string;
}

/** Registra cada chamada (quantos candidatos entraram, quantos sairam por papel e quanto demorou), inclusive as que falham. */
export class AuditoriaDecorator extends RecomendacaoDecorator {
  readonly registros: RegistroAuditoriaRecomendacao[] = [];

  constructor(
    interno: RecomendacaoStrategy,
    private readonly saida: (linha: string) => void = console.log,
    private readonly relogio: () => number = () => performance.now(),
    private readonly agora: () => Date = () => new Date()
  ) {
    super(interno);
  }

  recomendar(projeto: Projeto, profissionais: Profissional[]): Map<Papel, Profissional[]> {
    const inicio = this.relogio();
    const registro: RegistroAuditoriaRecomendacao = {
      origem: "AUDITORIA_RECOMENDACAO",
      em: this.agora().toISOString(),
      estrategia: nomeDaEstrategia(this.interno),
      projetoId: projeto.id ?? null,
      tipoProjeto: projeto.tipoCaptacao,
      candidatos: profissionais.length,
      resultado: {},
      duracaoMs: 0
    };
    try {
      const resultado = this.interno.recomendar(projeto, profissionais);
      for (const [papel, lista] of resultado) registro.resultado[papel] = lista.length;
      return resultado;
    } catch (erro) {
      registro.erro = (erro as Error).message;
      throw erro;
    } finally {
      registro.duracaoMs = Math.round((this.relogio() - inicio) * 100) / 100;
      this.registros.push(registro);
      this.saida(JSON.stringify(registro));
    }
  }
}
