import { Profissional } from "../domain/entities/Profissional";

/**
 * Guarda, por objeto Profissional, valores derivados que nao mudam enquanto
 * o cadastro em memoria for o mesmo (vetor de competencias, media das
 * avaliacoes...). Quando o catalogo recarrega, os objetos sao outros e o
 * calculo e' refeito; entradas de profissionais descartados saem sozinhas.
 */
export function criarMemo<T>(calcular: (profissional: Profissional) => T): (profissional: Profissional) => T {
  const cache = new WeakMap<Profissional, T>();
  return (profissional) => {
    let valor = cache.get(profissional);
    if (valor === undefined) {
      valor = calcular(profissional);
      cache.set(profissional, valor);
    }
    return valor;
  };
}
