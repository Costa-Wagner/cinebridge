import { EnviadorEmailSimulado, EnviadorMensagemInternaSimulado } from "./enviadores";

const mensagem = { canal: "EMAIL" as const, destinatario: "ana@x.com", assunto: "Convite", corpo: "Convite para DIRETOR" };

describe("enviadores simulados", () => {
  it("e-mail escreve destinatario, assunto e corpo", async () => {
    const linhas: string[] = [];
    await new EnviadorEmailSimulado((l) => linhas.push(l)).enviar(mensagem);
    expect(linhas).toEqual(["[EMAIL] Para ana@x.com: Convite - Convite para DIRETOR"]);
    expect(new EnviadorEmailSimulado().canal).toBe("EMAIL");
  });

  it("mensagem interna escreve destinatario e corpo", async () => {
    const linhas: string[] = [];
    await new EnviadorMensagemInternaSimulado((l) => linhas.push(l)).enviar({ ...mensagem, canal: "MENSAGEM_INTERNA", destinatario: "produtor" });
    expect(linhas).toEqual(["[MENSAGEM_INTERNA] Para produtor: Convite para DIRETOR"]);
    expect(new EnviadorMensagemInternaSimulado().canal).toBe("MENSAGEM_INTERNA");
  });

  it("por padrao escreve no console", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    await new EnviadorEmailSimulado().enviar(mensagem);
    await new EnviadorMensagemInternaSimulado().enviar(mensagem);
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
