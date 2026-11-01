import { gunzipSync } from "zlib";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";
import { Projeto } from "../domain/entities/Projeto";
import { RecomendacaoStrategy } from "../strategies/RecomendacaoStrategy";
import { RecomendadorBase } from "../strategies/RecomendadorBase";
import { ArmazemCache } from "./ArmazemCache";
import { CacheDecorator } from "./CacheDecorator";
import { AuditoriaDecorator } from "./AuditoriaDecorator";
import { CompressaoDecorator } from "./CompressaoDecorator";
import { RecomendacaoDecorator, estrategiaBase, nomeDaEstrategia } from "./RecomendacaoDecorator";
import { ConfiguracaoDecoradores, PilhaInvalidaError } from "./PilhaDecoradores";

const prof = (id: string, nome = `Profissional ${id}`) =>
  ({ id, nome, email: `${id}@exemplo.com`, especialidades: "Direção", precoBaseDiaria: 900, localizacao: "São Paulo" }) as unknown as Profissional;

const projeto = (extras: Partial<Projeto> = {}) =>
  ({
    id: "proj-1",
    tipoCaptacao: "DOCUMENTARIO",
    genero: "Drama",
    orcamentoTotal: 50000,
    dataEntrega: "2026-12-10",
    papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }, { papel: Papel.EDITOR, peso: 8 }],
    ...extras
  }) as unknown as Projeto;

/** Recomendador de mentira que conta chamadas e devolve todos os candidatos em todos os papeis. */
class FalsoRecomendador implements RecomendacaoStrategy {
  chamadas = 0;
  recomendar(_p: Projeto, profissionais: Profissional[]) {
    this.chamadas++;
    return new Map<Papel, Profissional[]>([
      [Papel.DIRETOR, [...profissionais]],
      [Papel.EDITOR, [...profissionais].reverse()]
    ]);
  }
}

describe("Decorator base", () => {
  it("delega por padrao e desembrulha ate' o recomendador real", () => {
    const base = new FalsoRecomendador();
    class Passa extends RecomendacaoDecorator {}
    const pilha = new Passa(new Passa(base));
    expect(pilha.recomendar(projeto(), [prof("1")]).get(Papel.DIRETOR)).toHaveLength(1);
    expect(estrategiaBase(pilha)).toBe(base);
    expect(nomeDaEstrategia(pilha)).toBe("FalsoRecomendador");
    expect(nomeDaEstrategia(base)).toBe("FalsoRecomendador");
  });
});

describe("ArmazemCache", () => {
  it("expira pelo TTL e descarta o mais antigo ao passar do maximo", () => {
    let agora = 0;
    const c = new ArmazemCache<number>(100, 2, () => agora);
    c.guardar("a", 1);
    c.guardar("b", 2);
    c.guardar("c", 3);
    expect(c.obter("a")).toBeUndefined();
    expect(c.tamanho).toBe(2);
    agora = 99;
    expect(c.obter("b")).toBe(2);
    agora = 100;
    expect(c.obter("b")).toBeUndefined();
    expect(c.tamanho).toBe(1);
    c.limpar();
    expect(c.tamanho).toBe(0);
  });

  it("regravar uma chave renova o valor e a posicao", () => {
    const c = new ArmazemCache<number>(1000, 2);
    c.guardar("a", 1);
    c.guardar("b", 2);
    c.guardar("a", 10);
    c.guardar("c", 3);
    expect(c.obter("a")).toBe(10);
    expect(c.obter("b")).toBeUndefined();
  });
});

describe("CacheDecorator", () => {
  it("segunda chamada equivalente nao chega ao recomendador", () => {
    const base = new FalsoRecomendador();
    const cache = new CacheDecorator(base, new ArmazemCache());
    const candidatos = [prof("1"), prof("2")];
    const a = cache.recomendar(projeto(), candidatos);
    const b = cache.recomendar(projeto({ id: "outro-projeto" }), [candidatos[1], candidatos[0]]);
    expect(base.chamadas).toBe(1);
    expect([cache.acertos, cache.falhas]).toEqual([1, 1]);
    expect(b.get(Papel.DIRETOR)).toEqual(a.get(Papel.DIRETOR));
  });

  it.each([
    ["candidatos diferentes", projeto(), [prof("1"), prof("3")]],
    ["orcamento diferente", projeto({ orcamentoTotal: 1 }), [prof("1"), prof("2")]],
    ["peso diferente", projeto({ papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 1 }] as never }), [prof("1"), prof("2")]],
    ["tipo diferente", projeto({ tipoCaptacao: "ANIMACAO" as never }), [prof("1"), prof("2")]]
  ])("%s gera outra chave", (_n, outro, candidatos) => {
    const base = new FalsoRecomendador();
    const cache = new CacheDecorator(base, new ArmazemCache());
    cache.recomendar(projeto(), [prof("1"), prof("2")]);
    cache.recomendar(outro, candidatos);
    expect(base.chamadas).toBe(2);
  });

  it("o chamador pode alterar o resultado sem corromper o cache", () => {
    const base = new FalsoRecomendador();
    const cache = new CacheDecorator(base, new ArmazemCache());
    cache.recomendar(projeto(), [prof("1"), prof("2")]).get(Papel.DIRETOR)!.pop();
    cache.recomendar(projeto(), [prof("1"), prof("2")]).delete(Papel.EDITOR);
    expect(cache.recomendar(projeto(), [prof("1"), prof("2")]).get(Papel.DIRETOR)).toHaveLength(2);
    expect(cache.recomendar(projeto(), [prof("1"), prof("2")]).has(Papel.EDITOR)).toBe(true);
  });

  it("acerto de cache e' bem mais rapido que o calculo", () => {
    const lento: RecomendacaoStrategy = {
      recomendar: (p, profs) => {
        const fim = performance.now() + 25;
        while (performance.now() < fim) { /* simula um ranking caro */ }
        return new FalsoRecomendador().recomendar(p, profs);
      }
    };
    const cache = new CacheDecorator(lento, new ArmazemCache());
    const medir = () => { const t = performance.now(); cache.recomendar(projeto(), [prof("1")]); return performance.now() - t; };
    const primeira = medir();
    const segunda = medir();
    expect(primeira).toBeGreaterThanOrEqual(25);
    expect(segunda).toBeLessThan(primeira / 5);
  });
});

describe("AuditoriaDecorator", () => {
  it("registra cada chamada em JSON, com contagens e duracao", () => {
    const linhas: string[] = [];
    let t = 0;
    const aud = new AuditoriaDecorator(new FalsoRecomendador(), (l) => linhas.push(l), () => (t += 5), () => new Date("2026-11-01T10:00:00Z"));
    aud.recomendar(projeto(), [prof("1"), prof("2")]);
    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0])).toEqual({
      origem: "AUDITORIA_RECOMENDACAO",
      em: "2026-11-01T10:00:00.000Z",
      estrategia: "FalsoRecomendador",
      projetoId: "proj-1",
      tipoProjeto: "DOCUMENTARIO",
      candidatos: 2,
      resultado: { DIRETOR: 2, EDITOR: 2 },
      duracaoMs: 5
    });
    expect(aud.registros).toHaveLength(1);
  });

  it("registra a falha e repassa o erro; projeto sem id vira null", () => {
    const linhas: string[] = [];
    const quebra: RecomendacaoStrategy = { recomendar: () => { throw new Error("falhou"); } };
    const aud = new AuditoriaDecorator(quebra, (l) => linhas.push(l));
    expect(() => aud.recomendar(projeto({ id: undefined as never }), [])).toThrow("falhou");
    const registro = JSON.parse(linhas[0]);
    expect(registro).toMatchObject({ erro: "falhou", projetoId: null, estrategia: "Object" });
  });

  it("usa console.log e o relogio real por padrao", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    new AuditoriaDecorator(new FalsoRecomendador()).recomendar(projeto(), [prof("1")]);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});

describe("CompressaoDecorator", () => {
  const muitos = Array.from({ length: 60 }, (_, i) => prof(String(i + 1)));

  it("reduz o tamanho transmitido sem perdas e devolve o mesmo mapa", () => {
    const base = new FalsoRecomendador();
    const comp = new CompressaoDecorator(base);
    const resultado = comp.recomendar(projeto(), muitos);
    expect(resultado.get(Papel.DIRETOR)).toHaveLength(60);
    const r = comp.ultimoRelatorio!;
    expect(r.bytesComprimidos).toBeLessThan(r.bytesOriginais);
    expect(r.reducao).toBeGreaterThan(0.5);
    expect(comp.ultimoPacote!.length).toBe(r.bytesComprimidos);
    expect(r.bytesOriginais).toBe(gunzipSync(comp.ultimoPacote!).length);
    expect(CompressaoDecorator.descomprimir(comp.ultimoPacote!)).toEqual(CompressaoDecorator.projetar(resultado));
  });

  it("resultado vazio nao divide por zero", () => {
    const vazio: RecomendacaoStrategy = { recomendar: () => new Map() };
    const comp = new CompressaoDecorator(vazio);
    comp.recomendar(projeto(), []);
    expect(comp.ultimoRelatorio!.bytesOriginais).toBe(2);
    expect(Number.isFinite(comp.ultimoRelatorio!.reducao)).toBe(true);
  });
});

describe("ConfiguracaoDecoradores (pilha em tempo de execucao)", () => {
  it("normaliza texto e lista; rejeita nome desconhecido e repetido", () => {
    expect(new ConfiguracaoDecoradores(" cache , auditoria ").obter()).toEqual(["CACHE", "AUDITORIA"]);
    expect(new ConfiguracaoDecoradores("").obter()).toEqual([]);
    expect(() => new ConfiguracaoDecoradores("CACHE,LOG")).toThrow(PilhaInvalidaError);
    expect(() => new ConfiguracaoDecoradores(["CACHE", "CACHE"])).toThrow("repetido");
  });

  it("pilha vazia nao decora; a ordem configurada define quem e' a camada externa", () => {
    const base = new FalsoRecomendador();
    const cfg = new ConfiguracaoDecoradores();
    expect(cfg.decorar(base)).toBeUndefined();
    cfg.definir("CACHE,AUDITORIA,COMPRESSAO");
    const pilha = cfg.decorar(base)!;
    expect(pilha).toBeInstanceOf(CompressaoDecorator);
    const meio = (pilha as CompressaoDecorator).interno;
    expect(meio).toBeInstanceOf(AuditoriaDecorator);
    expect((meio as AuditoriaDecorator).interno).toBeInstanceOf(CacheDecorator);
    expect(estrategiaBase(pilha)).toBe(base);
  });

  it("a mesma pilha pode ser combinada em outra ordem e sobreposta por chamada, sem tocar no recomendador base", () => {
    const base = new FalsoRecomendador();
    const linhas: string[] = [];
    const cfg = new ConfiguracaoDecoradores("CACHE,AUDITORIA", (l) => linhas.push(l));

    // cache por dentro, auditoria por fora: audita todas as chamadas
    const auditaTudo = cfg.decorar(base)!;
    auditaTudo.recomendar(projeto(), [prof("1")]);
    auditaTudo.recomendar(projeto(), [prof("1")]);
    expect(base.chamadas).toBe(1);
    expect(linhas).toHaveLength(2);

    // ordem invertida (sobreposta): cache por fora, a auditoria so' ve o que passou pelo cache
    linhas.length = 0;
    const cacheFora = cfg.decorar(base, ["AUDITORIA", "CACHE"])!;
    cacheFora.recomendar(projeto({ orcamentoTotal: 7 }), [prof("1")]);
    cacheFora.recomendar(projeto({ orcamentoTotal: 7 }), [prof("1")]);
    expect(linhas).toHaveLength(1);
    expect(base.chamadas).toBe(2);

    // o cache e' compartilhado entre pilhas: trocar a configuracao nao perde o que foi guardado
    cfg.definir("CACHE");
    cfg.decorar(base)!.recomendar(projeto({ orcamentoTotal: 7 }), [prof("1")]);
    expect(base.chamadas).toBe(2);
    expect(cfg.armazem.tamanho).toBeGreaterThan(0);
  });

  it("cada decorador acrescenta so' o seu comportamento a um RecomendadorBase real, sem altera-lo", () => {
    const base = new RecomendadorBase();
    const original = base.recomendar;
    const espiao = jest.spyOn(base, "recomendar");
    const pilha = new ConfiguracaoDecoradores("CACHE,COMPRESSAO").decorar(base)!;
    const p = projeto({ papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }] as never });
    const resultado = pilha.recomendar(p, []);
    expect(resultado.get(Papel.DIRETOR)).toEqual([]);
    expect(espiao).toHaveBeenCalledTimes(1);
    pilha.recomendar(p, []);
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(RecomendadorBase.prototype.recomendar).toBe(original);
    expect(nomeDaEstrategia(pilha)).toBe("RecomendadorBase");
  });
});
