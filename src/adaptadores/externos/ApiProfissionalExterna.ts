export interface RegistroExterno {
  id: string;
  nomeCompleto: string;
  emailContato: string;
  funcoes: string[];
  habilidades: string[];
  valorDiaria: number;
  cidade: string;
}

/** API simulada de rede social profissional (estilo LinkedIn). */
export class ApiProfissionalExterna {
  readonly avaliacoes = new Map<string, number[]>();

  constructor(private readonly registros: RegistroExterno[] = []) {}

  buscarProfissionais(filtros: { funcoes: string[]; limite?: number }): RegistroExterno[] {
    const achados = this.registros.filter(
      (r) => filtros.funcoes.length === 0 || r.funcoes.some((f) => filtros.funcoes.includes(f))
    );
    return filtros.limite === undefined ? achados : achados.slice(0, filtros.limite);
  }

  obterPerfil(id: string): RegistroExterno | undefined {
    return this.registros.find((r) => r.id === id);
  }

  avaliarProfissional(id: string, nota: number): void {
    this.avaliacoes.set(id, [...(this.avaliacoes.get(id) ?? []), nota]);
  }
}
