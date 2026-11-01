
/** Forma serializada (JSON) da arvore de servicos; e' o que vai para o banco e para a API. */
export type DadoServico = DadoServicoAtomico | DadoPacoteServico;

export interface DadoServicoAtomico {
  tipo: "ATOMICO";
  nome: string;
  papel: string;
  peso: number;
  custo: number;
  prazoDias: number;
}

export interface DadoPacoteServico {
  tipo: "PACOTE";
  nome: string;
  modo?: ModoPrazo;
  servicos: DadoServico[];
}

/** SEQUENCIAL: prazo do pacote = soma dos filhos; PARALELO: prazo = o maior filho. */
export type ModoPrazo = "SEQUENCIAL" | "PARALELO";

/** Component do Composite: servico atomico e pacote sao tratados pela mesma interface. */
export interface ServicoProjeto {
  readonly nome: string;
  /** Custo total em reais (soma recursiva). */
  calcularCusto(): number;
  /** Filhos diretos; vazio para servico atomico. */
  listarSubservicos(): ServicoProjeto[];
  /** Prazo em dias corridos. */
  obterPrazo(): number;
  /** Problemas encontrados em toda a subarvore (vazio = valida). */
  validar(): string[];
  paraJSON(): DadoServico;
}

export class ServicoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ServicoInvalidoError";
  }
}

