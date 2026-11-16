import { selecionarAdaptadorProfissional } from "./selecionarAdaptadorProfissional";
import { AdaptadorProfissionalComProjecao } from "./AdaptadorProfissionalComProjecao";
import { CanalEmMemoria } from "../../mensageria/CanalEmMemoria";

describe("selecionarAdaptadorProfissional", () => {
  const dataSource = {} as never;

  it("PROFISSIONAIS_VIA ausente ou local: nao configura adaptador (usa o interno)", async () => {
    const conectar = jest.fn();
    expect(await selecionarAdaptadorProfissional(dataSource, {}, conectar)).toBeUndefined();
    expect(await selecionarAdaptadorProfissional(dataSource, { PROFISSIONAIS_VIA: "LOCAL" }, conectar)).toBeUndefined();
    expect(conectar).not.toHaveBeenCalled();
  });

  it("PROFISSIONAIS_VIA=mq conecta ao broker e devolve o adaptador remoto com projecao", async () => {
    const conectar = jest.fn().mockResolvedValue(new CanalEmMemoria());
    const adaptador = await selecionarAdaptadorProfissional(
      dataSource,
      { PROFISSIONAIS_VIA: "mq", MQ_HOST: "cinebridge-mq", RPC_TIMEOUT_MS: "1500" },
      conectar
    );
    expect(adaptador).toBeInstanceOf(AdaptadorProfissionalComProjecao);
    expect(conectar).toHaveBeenCalledWith("amqp://guest:guest@cinebridge-mq:5672");
  });

  it("usa timeout de 5 s quando RPC_TIMEOUT_MS nao e' informado", async () => {
    const conectar = jest.fn().mockResolvedValue(new CanalEmMemoria());
    expect(await selecionarAdaptadorProfissional(dataSource, { PROFISSIONAIS_VIA: "mq" }, conectar)).toBeDefined();
  });

  it("recusa valor desconhecido", async () => {
    await expect(selecionarAdaptadorProfissional(dataSource, { PROFISSIONAIS_VIA: "http" }, jest.fn())).rejects.toThrow(
      'PROFISSIONAIS_VIA invalido: "http"'
    );
  });
});
