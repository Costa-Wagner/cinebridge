import "dotenv/config";
import { randomUUID } from "crypto";
import * as amqp from "amqplib";
import { DataSource } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { garantirBanco, prepararBancoDeTestes } from "./bancoDeTestes";
import { BarramentoComPrefixo, esperarPor } from "./apoioMensageria";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { BarramentoRabbitMQ } from "../eventos/BarramentoRabbitMQ";
import { montarUrlMQ } from "../eventos/criarBarramento";
import { EventoProjeto, FILA_EVENTOS_PROJETOS } from "../eventos/eventosProjeto";
import { conectarAmqp } from "../mensageria/CanalAmqp";
import { CanalMensageria } from "../mensageria/CanalMensageria";
import { criarDataSourceProjetos } from "../servicos/projetos/dataSource";
import { GestaoProjetos } from "../servicos/projetos/GestaoProjetos";
import { ligarGestao, publicadorEventosProjetos } from "../servicos/projetos/ligarGestao";
import { RegistroProjeto } from "../servicos/projetos/RegistroProjeto";
import { Papel } from "../domain/enums/Papel";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";

const NOME_BANCO_PROJETOS = "cinebridge_test_projetos";
const prefixo = `teste.${randomUUID()}.`;
const url = montarUrlMQ();
let dsApi: DataSource;
let dsProjetos: DataSource;
let apiMQ: CanalMensageria;
let servicoMQ: CanalMensageria;
let servico: ServicoProjetos;
const emitidos: EventoProjeto[] = [];

const registroDe = (id: string) => dsProjetos.getRepository(RegistroProjeto).findOneBy({ id });
const eventoDe = (tipo: string, projetoId: string) => emitidos.find((e) => e.tipo === tipo && e.projetoId === projetoId);

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  dsApi = (await prepararBancoDeTestes()).ds;

  // cinebridge-projetos: banco proprio (so' a sua entidade), no mesmo servidor Postgres dos testes
  await garantirBanco(NOME_BANCO_PROJETOS);
  const { host, port } = AppDataSource.options as unknown as { host: string; port: number };
  dsProjetos = new DataSource({ ...(criarDataSourceProjetos().options as object), host, port, database: NOME_BANCO_PROJETOS } as never);
  await dsProjetos.initialize();
  await dsProjetos.synchronize(true);

  apiMQ = await conectarAmqp(url, { tentativas: 3, intervaloMs: 500 });
  servicoMQ = await conectarAmqp(url, { tentativas: 3, intervaloMs: 500 });
  const barramentoApi = new BarramentoComPrefixo(new BarramentoRabbitMQ(apiMQ), prefixo);
  const barramentoServico = new BarramentoComPrefixo(new BarramentoRabbitMQ(servicoMQ), prefixo);

  const gestao = new GestaoProjetos(dsProjetos.getRepository(RegistroProjeto), publicadorEventosProjetos(barramentoServico));
  await barramentoServico.assinar(FILA_EVENTOS_PROJETOS, (e) => void emitidos.push(e));
  await ligarGestao(barramentoServico, gestao);

  servico = new ServicoProjetos(dsApi, montarSistema(barramentoApi), undefined, undefined, barramentoApi);
});

afterAll(async () => {
  await apiMQ.fechar();
  await servicoMQ.fechar();
  const conexao = await amqp.connect(url);
  const canal = await conexao.createChannel();
  for (const fila of ["projeto.criado", "projeto.atualizado", "equipe.formada", "eventos-notificacoes", FILA_EVENTOS_PROJETOS]) await canal.deleteQueue(`${prefixo}${fila}`);
  await conexao.close();
  await dsProjetos.destroy();
  await dsApi.destroy();
  jest.restoreAllMocks();
});

describe("Ciclo de vida do projeto: api -> RabbitMQ -> cinebridge-projetos -> eventos-projetos", () => {
  it("criar, reavaliar e formar a equipe registram o projeto no servico e emitem os eventos", async () => {
    const projeto = await servico.criar(TipoCaptacao.DOCUMENTARIO, {
      duracaoEstimadaMinutos: 60,
      orcamentoTotal: 30000,
      dataEntrega: "2026-12-01",
      localizacaoFilmagem: "São Paulo",
      tema: "Rios",
      entrevistados: ["Ana"],
      papeisObrigatorios: [
        { papel: Papel.DIRETOR, peso: 10 },
        { papel: Papel.EDITOR, peso: 8 }
      ]
    });

    // 1) criado
    const criado = await esperarPor(async () => registroDe(projeto.id));
    expect(criado).toMatchObject({ tipoCaptacao: "DOCUMENTARIO", orcamentoTotal: 30000, dataEntrega: "2026-12-01", status: "CRIADO" });
    await esperarPor(async () => eventoDe("PROJETO_CRIADO", projeto.id));

    // 2) atualizado (a reavaliacao muda o orcamento)
    await servico.recomendar(projeto.id);
    await servico.reavaliar(projeto.id, { orcamentoTotal: 45000 });
    const atualizado = await esperarPor(async () => {
      const r = await registroDe(projeto.id);
      return r?.status === "ATUALIZADO" ? r : null;
    });
    expect(atualizado.orcamentoTotal).toBe(45000);
    expect(eventoDe("PROJETO_ATUALIZADO", projeto.id)?.detalhes).toMatchObject({ orcamentoTotal: 45000 });

    // 3) finalizado (todos os convites aceitos = equipe formada)
    const equipe = (await servico.buscarEquipe(projeto.id))!;
    let formada = false;
    for (const membro of equipe.membros) {
      const convite = await servico.aceitarRecomendacao(projeto.id, membro.papel, membro.profissional.id);
      formada = (await servico.responderConvite(convite!.id, true))!.equipeFormada;
    }
    expect(formada).toBe(true);
    const finalizado = await esperarPor(async () => {
      const r = await registroDe(projeto.id);
      return r?.status === "FINALIZADO" ? r : null;
    });
    expect(finalizado.equipe).toHaveLength(2);
    expect(finalizado.finalizadoEm).toBeInstanceOf(Date);
    expect(finalizado.orcamentoTotal).toBe(45000);
    await esperarPor(async () => eventoDe("PROJETO_FINALIZADO", projeto.id));

    expect(emitidos.filter((e) => e.projetoId === projeto.id).map((e) => e.tipo)).toEqual(["PROJETO_CRIADO", "PROJETO_ATUALIZADO", "PROJETO_FINALIZADO"]);
  });
});
