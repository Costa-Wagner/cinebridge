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
import { FILA_EVENTOS_NOTIFICACOES } from "../eventos/eventosNotificacao";
import { FILA_EVENTOS_PROJETOS } from "../eventos/eventosProjeto";
import { conectarAmqp } from "../mensageria/CanalAmqp";
import { CanalMensageria } from "../mensageria/CanalMensageria";
import { criarDataSourceProjetos } from "../servicos/projetos/dataSource";
import { GestaoProjetos } from "../servicos/projetos/GestaoProjetos";
import { ligarGestao, publicadorEventosProjetos } from "../servicos/projetos/ligarGestao";
import { RegistroProjeto } from "../servicos/projetos/RegistroProjeto";
import { criarDataSourceNotificacoes } from "../servicos/notificacoes/dataSource";
import { Notificacao } from "../servicos/notificacoes/Notificacao";
import { ServicoNotificacoes } from "../servicos/notificacoes/ServicoNotificacoes";
import { EnviadorEmailSimulado, EnviadorMensagemInternaSimulado } from "../servicos/notificacoes/enviadores";
import { ligarNotificacoes } from "../servicos/notificacoes/ligarNotificacoes";
import { Papel } from "../domain/enums/Papel";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";

/**
 * Cadeia completa com tres processos simulados por tres conexoes ao RabbitMQ e bancos separados:
 * api (ServicoProjetos) -> cinebridge-projetos -> cinebridge-notificacoes, e api -> cinebridge-notificacoes.
 */
const prefixo = `teste.${randomUUID()}.`;
const url = montarUrlMQ();
const BANCOS = { projetos: "cinebridge_test_projetos", notificacoes: "cinebridge_test_notificacoes" };
let dsApi: DataSource;
let dsProjetos: DataSource;
let dsNotificacoes: DataSource;
let canais: CanalMensageria[] = [];
let servico: ServicoProjetos;
let linhasEnviadas: string[] = [];

const notificacoesDe = (projetoId: string) => dsNotificacoes.getRepository(Notificacao).find({ where: { projetoId }, order: { criadoEm: "ASC" } });
const tiposDe = (lista: Notificacao[]) => lista.map((n) => `${n.origem}:${n.tipoEvento}:${n.canal}`);
const esperarTipos = (projetoId: string, esperados: string[]) =>
  esperarPor(async () => {
    const lista = await notificacoesDe(projetoId);
    return esperados.every((e) => tiposDe(lista).includes(e)) ? lista : null;
  });

async function dataSourceNoMesmoServidor(fabrica: (env: NodeJS.ProcessEnv, database?: string) => DataSource, database: string): Promise<DataSource> {
  await garantirBanco(database);
  const { host, port } = AppDataSource.options as unknown as { host: string; port: number };
  const ds = new DataSource({ ...(fabrica({}, database).options as object), host, port } as never);
  await ds.initialize();
  await ds.synchronize(true);
  return ds;
}

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  dsApi = (await prepararBancoDeTestes()).ds;
  dsProjetos = await dataSourceNoMesmoServidor(criarDataSourceProjetos, BANCOS.projetos);
  dsNotificacoes = await dataSourceNoMesmoServidor(criarDataSourceNotificacoes, BANCOS.notificacoes);

  const [apiMQ, projetosMQ, notificacoesMQ] = await Promise.all([1, 2, 3].map(() => conectarAmqp(url, { tentativas: 3, intervaloMs: 500 })));
  canais = [apiMQ, projetosMQ, notificacoesMQ];
  const barramento = (canal: CanalMensageria) => new BarramentoComPrefixo(new BarramentoRabbitMQ(canal), prefixo);

  const barramentoProjetos = barramento(projetosMQ);
  await ligarGestao(barramentoProjetos, new GestaoProjetos(dsProjetos.getRepository(RegistroProjeto), publicadorEventosProjetos(barramentoProjetos)));

  linhasEnviadas = [];
  const escrever = (linha: string) => void linhasEnviadas.push(linha);
  await ligarNotificacoes(
    barramento(notificacoesMQ),
    new ServicoNotificacoes(dsNotificacoes.getRepository(Notificacao), [new EnviadorEmailSimulado(escrever), new EnviadorMensagemInternaSimulado(escrever)])
  );

  const barramentoApi = barramento(apiMQ);
  servico = new ServicoProjetos(dsApi, montarSistema(barramentoApi), undefined, undefined, barramentoApi);
});

afterAll(async () => {
  await Promise.all(canais.map((c) => c.fechar()));
  const conexao = await amqp.connect(url);
  const canal = await conexao.createChannel();
  for (const fila of ["projeto.criado", "projeto.atualizado", "equipe.formada", FILA_EVENTOS_NOTIFICACOES, FILA_EVENTOS_PROJETOS]) await canal.deleteQueue(`${prefixo}${fila}`);
  await conexao.close();
  await Promise.all([dsProjetos.destroy(), dsNotificacoes.destroy(), dsApi.destroy()]);
  jest.restoreAllMocks();
});

describe("Notificacoes: api -> cinebridge-projetos -> cinebridge-notificacoes", () => {
  it("cada etapa do projeto gera as notificacoes certas, com origem, canal e status registrados", async () => {
    const projeto = await servico.criar(TipoCaptacao.DOCUMENTARIO, {
      duracaoEstimadaMinutos: 60,
      orcamentoTotal: 30000,
      dataEntrega: "2026-12-01",
      localizacaoFilmagem: "São Paulo",
      tema: "Rios",
      entrevistados: ["Ana"],
      papeisObrigatorios: [{ papel: Papel.DIRETOR, peso: 10 }, { papel: Papel.EDITOR, peso: 8 }]
    });

    // criado -> projetos registra e emite PROJETO_CRIADO -> notificacoes
    await esperarTipos(projeto.id, ["projetos:PROJETO_CRIADO:EMAIL", "projetos:PROJETO_CRIADO:MENSAGEM_INTERNA"]);

    // recomendacao -> a api publica direto em eventos-notificacoes (um evento por papel)
    await servico.recomendar(projeto.id);
    const recomendacoes = await esperarPor(async () => {
      const lista = (await notificacoesDe(projeto.id)).filter((n) => n.tipoEvento === "RECOMENDACAO_GERADA" && n.canal === "EMAIL");
      return lista.length >= 2 ? lista : null;
    });
    expect(recomendacoes).toHaveLength(2);

    // convites aceitos -> equipe formada
    const equipe = (await servico.buscarEquipe(projeto.id))!;
    for (const membro of equipe.membros) {
      const convite = await servico.aceitarRecomendacao(projeto.id, membro.papel, membro.profissional.id);
      await servico.responderConvite(convite!.id, true);
    }
    const final = await esperarTipos(projeto.id, [
      "api:CONVITE_ENVIADO:EMAIL",
      "api:CONVITE_ACEITO:EMAIL",
      "api:EQUIPE_FORMADA:EMAIL",
      "projetos:PROJETO_FINALIZADO:EMAIL"
    ]);

    expect(final.every((n) => n.status === "ENVIADA" && n.enviadoEm instanceof Date && n.erro === null)).toBe(true);
    const convitesEnviados = (await esperarPor(async () => {
      const lista = (await notificacoesDe(projeto.id)).filter((n) => n.tipoEvento === "CONVITE_ENVIADO" && n.canal === "EMAIL");
      return lista.length >= 2 ? lista : null;
    })).filter((n) => n.tipoEvento === "CONVITE_ENVIADO" && n.canal === "EMAIL");
    expect(convitesEnviados).toHaveLength(2);
    expect(convitesEnviados.every((n) => n.destinatario.includes("@"))).toBe(true); // vai para o e-mail do profissional
    expect(final.filter((n) => n.tipoEvento === "CONVITE_ACEITO" && n.canal === "EMAIL").every((n) => n.destinatario === "produtor")).toBe(true);
    expect(linhasEnviadas.some((l) => l.startsWith("[EMAIL] Para produtor: Equipe formada"))).toBe(true);
  });
});
