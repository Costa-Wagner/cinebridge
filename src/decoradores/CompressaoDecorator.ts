import { gunzipSync, gzipSync } from "zlib";
import type { Papel } from "../domain/enums/Papel";
import type { Profissional } from "../domain/entities/Profissional";
import type { Projeto } from "../domain/entities/Projeto";
import type { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { RecomendacaoDecorator } from "./RecomendacaoDecorator";

export interface RelatorioCompressao {
  bytesOriginais: number;
  bytesComprimidos: number;
  /** 1 - comprimido/original (0.8 = 80% menor). */
  reducao: number;
}

type Projecao = Record<string, Array<Pick<Profissional, "id" | "nome" | "email" | "especialidades" | "precoBaseDiaria" | "localizacao">>>;

/**
 * Prepara a saida para trafegar: serializa o resultado (so' os campos de contato e
 * preco de cada profissional) e o comprime em gzip. O contrato nao muda: o mapa
 * devolvido e' o mesmo; o pacote comprimido fica em `ultimoPacote` e a metrica em
 * `ultimoRelatorio`. `descomprimir` desfaz a operacao sem perdas.
 */
export class CompressaoDecorator extends RecomendacaoDecorator {
  ultimoPacote?: Buffer;
  ultimoRelatorio?: RelatorioCompressao;

  constructor(interno: RecomendacaoStrategy) {
    super(interno);
  }

  recomendar(projeto: Projeto, profissionais: Profissional[]): Map<Papel, Profissional[]> {
    const resultado = this.interno.recomendar(projeto, profissionais);
    const bruto = Buffer.from(JSON.stringify(CompressaoDecorator.projetar(resultado)));
    const pacote = gzipSync(bruto);
    this.ultimoPacote = pacote;
    this.ultimoRelatorio = {
      bytesOriginais: bruto.length,
      bytesComprimidos: pacote.length,
      reducao: bruto.length === 0 ? 0 : Math.round((1 - pacote.length / bruto.length) * 1000) / 1000
    };
    return resultado;
  }

  static projetar(resultado: Map<Papel, Profissional[]>): Projecao {
    return Object.fromEntries(
      [...resultado].map(([papel, lista]) => [
        papel,
        lista.map(({ id, nome, email, especialidades, precoBaseDiaria, localizacao }) => ({
          id, nome, email, especialidades, precoBaseDiaria, localizacao
        }))
      ])
    );
  }

  static descomprimir(pacote: Buffer): Projecao {
    return JSON.parse(gunzipSync(pacote).toString());
  }
}
