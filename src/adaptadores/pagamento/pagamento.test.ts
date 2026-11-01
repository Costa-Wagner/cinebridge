import { AdaptadorPagamento, PagamentoInvalidoError } from "./AdaptadorPagamento";
import { AdaptadorStripe } from "./AdaptadorStripe";
import { AdaptadorPagSeguro } from "./AdaptadorPagSeguro";
import { AdaptadorPayPal } from "./AdaptadorPayPal";

const provedores: Array<[string, () => AdaptadorPagamento]> = [
  ["Stripe", () => new AdaptadorStripe()],
  ["PagSeguro", () => new AdaptadorPagSeguro()],
  ["PayPal", () => new AdaptadorPayPal()]
];

describe.each(provedores)("AdaptadorPagamento: %s (mesmo contrato)", (_nome, criar) => {
  it("efetua, verifica e cancela o pagamento", () => {
    const a = criar();
    const id = a.efetuarPagamento(1500.5, "produtor", "profissional");

    expect(a.verificarPagamento(id)).toBe("CONFIRMADO");
    expect(a.cancelarPagamento(id)).toBe(true);
    expect(a.verificarPagamento(id)).toBe("CANCELADO");
    expect(a.cancelarPagamento(id)).toBe(false);
  });

  it("devolve DESCONHECIDO / false para transacao inexistente", () => {
    const a = criar();
    expect(a.verificarPagamento("nada")).toBe("DESCONHECIDO");
    expect(a.cancelarPagamento("nada")).toBe(false);
  });

  it("recusa valor nao positivo", () => {
    expect(() => criar().efetuarPagamento(0, "a", "b")).toThrow(PagamentoInvalidoError);
    expect(() => criar().efetuarPagamento(NaN, "a", "b")).toThrow(PagamentoInvalidoError);
  });
});

describe("sistemas externos simulados rejeitam chamadas invalidas", () => {
  it("gateway, PagSeguro e PayPal", () => {
    expect(() => new AdaptadorStripe().efetuarPagamento(10, "", "b")).toThrow("card_declined");
    expect(() => new AdaptadorPagSeguro().efetuarPagamento(10, "a", "b")).not.toThrow();
    expect(() => new AdaptadorPayPal().efetuarPagamento(10, "a", "")).toThrow("INVALID_REQUEST");
  });

  it("PagSeguro trabalha em centavos inteiros", () => {
    const { ApiPagSeguroSimulada } = jest.requireActual("../externos/ApiPagSeguroSimulada");
    expect(() => new ApiPagSeguroSimulada().criarCobranca({ valorCentavos: 10.5, pagador: "a", recebedor: "b" })).toThrow();
  });
});
