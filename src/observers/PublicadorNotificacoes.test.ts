import { PublicadorNotificacoes } from "./PublicadorNotificacoes";
import { EventoRecomendacao } from "./EventoRecomendacao";
import { TipoEvento } from "./TipoEvento";
import { BarramentoEventos } from "../eventos/BarramentoEventos";

const AGORA = new Date("2026-11-10T12:00:00Z");
const candidatos = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, nome: `Pessoa ${i}`, email: `p${i}@x.com`, outro: "ignorado" }));
const evento = (tipo: TipoEvento, lista = candidatos, papel: string | null = "DIRETOR") =>
  ({ tipo, projeto: { id: "proj-1", genero: "Documentário" }, papel, candidatos: lista }) as unknown as EventoRecomendacao;

describe("PublicadorNotificacoes", () => {
  it("publica o evento na fila de notificacoes com os dados minimos (ate 10 profissionais)", () => {
    const barramento: BarramentoEventos = { publicar: jest.fn().mockResolvedValue(undefined), assinar: jest.fn() };

    new PublicadorNotificacoes(barramento, () => AGORA).atualizar(evento(TipoEvento.RECOMENDACAO_GERADA));

    expect(barramento.publicar).toHaveBeenCalledWith("eventos-notificacoes", {
      tipo: "RECOMENDACAO_GERADA",
      projetoId: "proj-1",
      genero: "Documentário",
      papel: "DIRETOR",
      totalCandidatos: 12,
      profissionais: candidatos.slice(0, 10).map(({ id, nome, email }) => ({ id, nome, email })),
      ocorridoEm: AGORA.toISOString()
    });
  });

  it("evento da equipe inteira vai sem papel", () => {
    const barramento: BarramentoEventos = { publicar: jest.fn(), assinar: jest.fn() };
    new PublicadorNotificacoes(barramento).atualizar(evento(TipoEvento.EQUIPE_FORMADA, candidatos.slice(0, 2), null));
    expect(barramento.publicar).toHaveBeenCalledWith("eventos-notificacoes", expect.objectContaining({ tipo: "EQUIPE_FORMADA", papel: null, totalCandidatos: 2 }));
  });

  it("falha de publicacao e' registrada e nao interrompe os demais observadores", async () => {
    const erro = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const barramento: BarramentoEventos = { publicar: jest.fn().mockRejectedValue(new Error("broker fora")), assinar: jest.fn() };

    expect(() => new PublicadorNotificacoes(barramento).atualizar(evento(TipoEvento.CONVITE_ACEITO))).not.toThrow();
    await new Promise((r) => setImmediate(r));

    expect(erro).toHaveBeenCalledWith(expect.stringContaining("CONVITE_ACEITO"), expect.any(Error));
    erro.mockRestore();
  });
});
