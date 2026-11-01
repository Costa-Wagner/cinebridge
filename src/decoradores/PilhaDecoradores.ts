import type { Profissional } from "../domain/entities/Profissional";
import type { Papel } from "../domain/enums/Papel";
import type { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { ArmazemCache } from "./ArmazemCache";
import { AuditoriaDecorator } from "./AuditoriaDecorator";
import { CacheDecorator } from "./CacheDecorator";
import { CompressaoDecorator } from "./CompressaoDecorator";

export const DECORADORES = ["CACHE", "AUDITORIA", "COMPRESSAO"] as const;
export type NomeDecorador = (typeof DECORADORES)[number];

export class PilhaInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "PilhaInvalidaError";
  }
}

/**
 * Monta e guarda a pilha de decoradores. A lista e' a ordem de aplicacao: o primeiro
 * nome envolve o recomendador, o seguinte envolve o resultado, e assim por diante
 * (o ultimo e' a camada mais externa). Pode ser trocada em tempo de execucao ou
 * sobreposta numa chamada (preferencia do produtor); o cache e' compartilhado entre
 * pilhas, entao trocar a configuracao nao perde o que ja foi guardado.
 */
export class ConfiguracaoDecoradores {
  readonly armazem: ArmazemCache<Map<Papel, Profissional[]>>;
  private pilha: NomeDecorador[] = [];

  constructor(
    inicial: string | NomeDecorador[] = [],
    private readonly saidaAuditoria: (linha: string) => void = console.log,
    armazem?: ArmazemCache<Map<Papel, Profissional[]>>
  ) {
    this.armazem = armazem ?? new ArmazemCache();
    this.definir(inicial);
  }

  /** Aceita lista ou texto "CACHE,AUDITORIA" (variavel de ambiente); valida nomes e repeticoes. */
  definir(nomes: string | string[]): void {
    this.pilha = ConfiguracaoDecoradores.normalizar(nomes);
  }

  obter(): NomeDecorador[] {
    return [...this.pilha];
  }

  static normalizar(nomes: string | string[]): NomeDecorador[] {
    const lista = (typeof nomes === "string" ? nomes.split(",") : nomes).map((n) => n.trim().toUpperCase()).filter(Boolean);
    for (const nome of lista) {
      if (!DECORADORES.includes(nome as NomeDecorador)) {
        throw new PilhaInvalidaError(`Decorador desconhecido: ${nome} (use ${DECORADORES.join(", ")})`);
      }
    }
    if (new Set(lista).size !== lista.length) throw new PilhaInvalidaError("Decorador repetido na pilha");
    return lista as NomeDecorador[];
  }

  /** Envolve o recomendador com a pilha (a configurada ou `sobrepor`); pilha vazia = sem decoradores (undefined). */
  decorar(base: RecomendacaoStrategy, sobrepor?: string[]): RecomendacaoStrategy | undefined {
    const nomes = sobrepor ? ConfiguracaoDecoradores.normalizar(sobrepor) : this.pilha;
    if (nomes.length === 0) return undefined;
    return nomes.reduce<RecomendacaoStrategy>((atual, nome) => this.criar(nome, atual), base);
  }

  private criar(nome: NomeDecorador, interno: RecomendacaoStrategy): RecomendacaoStrategy {
    switch (nome) {
      case "CACHE":
        return new CacheDecorator(interno, this.armazem);
      case "AUDITORIA":
        return new AuditoriaDecorator(interno, this.saidaAuditoria);
      case "COMPRESSAO":
        return new CompressaoDecorator(interno);
    }
  }
}
