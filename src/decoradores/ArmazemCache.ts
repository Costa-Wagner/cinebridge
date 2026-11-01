/** Cache em memoria com validade (TTL) e tamanho maximo; descarta o mais antigo ao encher. */
export class ArmazemCache<V> {
  private readonly itens = new Map<string, { valor: V; expiraEm: number }>();

  constructor(
    private readonly ttlMs: number = 30_000,
    private readonly maximo: number = 500,
    private readonly agora: () => number = Date.now
  ) {}

  obter(chave: string): V | undefined {
    const item = this.itens.get(chave);
    if (!item) return undefined;
    if (item.expiraEm <= this.agora()) {
      this.itens.delete(chave);
      return undefined;
    }
    return item.valor;
  }

  guardar(chave: string, valor: V): void {
    this.itens.delete(chave);
    this.itens.set(chave, { valor, expiraEm: this.agora() + this.ttlMs });
    if (this.itens.size > this.maximo) this.itens.delete(this.itens.keys().next().value as string);
  }

  limpar(): void {
    this.itens.clear();
  }

  get tamanho(): number {
    return this.itens.size;
  }
}
