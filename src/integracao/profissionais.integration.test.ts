import "dotenv/config";
import { randomUUID } from "crypto";
import * as amqp from "amqplib";
import { DataSource } from "typeorm";
import { prepararBancoDeTestes } from "./bancoDeTestes";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { CatalogoProfissionais } from "../aplicacao/CatalogoProfissionais";
import { AdaptadorInterno } from "../adaptadores/profissional/AdaptadorInterno";
import { AdaptadorMensageria } from "../adaptadores/profissional/AdaptadorMensageria";
import { AdaptadorProfissionalComProjecao } from "../adaptadores/profissional/AdaptadorProfissionalComProjecao";
import { AdaptadorProfissional, AvaliacaoInvalidaError } from "../adaptadores/profissional/AdaptadorProfissional";
import { criarProfissionalExterno } from "../adaptadores/profissional/profissionalExterno";
import { criarTratadorConsultas } from "../servicos/profissionais/tratadorConsultas";
import { conectarAmqp } from "../mensageria/CanalAmqp";
import { CanalMensageria } from "../mensageria/CanalMensageria";
import { ClienteRPC } from "../mensageria/ClienteRPC";
import { registrarRespondedor } from "../mensageria/ResponderRPC";
import { montarUrlMQ } from "../eventos/criarBarramento";
import { Papel } from "../domain/enums/Papel";
import { Profissional } from "../domain/entities/Profissional";

/**
 * Cadastro remoto: a api consulta o servico de profissionais por fila. Duas conexoes ao RabbitMQ simulam
 * os dois processos; as filas tem nome unico para nao competir com um servico de verdade em execucao.
 */
let ds: DataSource;
let projetoSeedId: string;
let servidor: CanalMensageria;
let cliente: CanalMensageria;
let remotoReal: AdaptadorProfissional;
let viaFila: AdaptadorProfissionalComProjecao;
const filas: string[] = [];
const url = montarUrlMQ();

async function clienteDe(fila: string): Promise<AdaptadorProfissionalComProjecao> {
  const rpc = new ClienteRPC(cliente, { timeoutMs: 5000 });
  await rpc.iniciar();
  return new AdaptadorProfissionalComProjecao(new AdaptadorMensageria(rpc, fila), ds);
}

function novaFila(): string {
  const fila = `teste.profissionais.${randomUUID()}`;
  filas.push(fila);
  return fila;
}

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  const banco = await prepararBancoDeTestes();
  ds = banco.ds;
  projetoSeedId = banco.projetoSeedId;
  servidor = await conectarAmqp(url, { tentativas: 3, intervaloMs: 500 });
  cliente = await conectarAmqp(url, { tentativas: 3, intervaloMs: 500 });
  remotoReal = new AdaptadorInterno(new CatalogoProfissionais(ds), ds);
  const fila = novaFila();
  await registrarRespondedor(servidor, fila, criarTratadorConsultas(remotoReal));
  viaFila = await clienteDe(fila);
});

afterAll(async () => {
  await servidor.fechar();
  await cliente.fechar();
  const conexao = await amqp.connect(url);
  const canal = await conexao.createChannel();
  for (const fila of filas) await canal.deleteQueue(fila);
  await conexao.close();
  await ds.destroy();
  jest.restoreAllMocks();
});

const resumo = (lista: Profissional[]) =>
  lista
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: Number(p.precoBaseDiaria),
      competencias: p.competencias.map((c) => `${c.competencia.nome}:${Number(c.nivel)}`).sort(),
      notas: p.avaliacoes.map((a) => Number(a.nota)).sort()
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

describe("Cadastro de profissionais via RabbitMQ", () => {
  it("a listagem pela fila e' equivalente a listagem direta no cadastro", async () => {
    const direto = await remotoReal.listarProfissionais({});
    const remoto = await viaFila.listarProfissionais({});
    expect(remoto).toHaveLength(6);
    expect(resumo(remoto)).toEqual(resumo(direto));
  });

  it("a pre-selecao por papel respeita criterios e limite", async () => {
    const criterios = { papeis: [Papel.DIRETOR], limitePorPapel: 2 };
    const direto = await remotoReal.listarProfissionais(criterios);
    const remoto = await viaFila.listarProfissionais(criterios);
    expect(remoto.length).toBeLessThanOrEqual(2);
    expect(remoto.map((p) => p.id).sort()).toEqual(direto.map((p) => p.id).sort());
  });

  it("a recomendacao completa gera a mesma equipe com o cadastro local e com o remoto", async () => {
    const local = new ServicoProjetos(ds, montarSistema());
    const equipeLocal = await local.recomendar(projetoSeedId);

    const sistema = montarSistema();
    sistema.configurarAdaptadores({ profissional: viaFila });
    const equipeRemota = await new ServicoProjetos(ds, sistema).recomendar(projetoSeedId);

    const membros = (e: typeof equipeLocal) => e!.membros.map((m) => `${m.papel}:${m.profissional.id}`).sort();
    expect(equipeRemota!.membros.length).toBeGreaterThan(0);
    expect(membros(equipeRemota)).toEqual(membros(equipeLocal));
  });

  it("detalha profissional existente e devolve null para inexistente", async () => {
    const [primeiro] = await remotoReal.listarProfissionais({});
    expect((await viaFila.detalharProfissional(primeiro.id))?.nome).toBe(primeiro.nome);
    expect(await viaFila.detalharProfissional(randomUUID())).toBeNull();
  });

  it("a avaliacao registrada pela fila e' gravada no cadastro", async () => {
    const [alvo] = await remotoReal.listarProfissionais({});
    const antes = (await ds.query(`SELECT COUNT(*)::int AS n FROM avaliacoes WHERE profissional_id = $1`, [alvo.id]))[0].n;

    await viaFila.registrarAvaliacao(alvo.id, { nota: 8.5, comentario: "via fila" });

    const depois = (await ds.query(`SELECT COUNT(*)::int AS n FROM avaliacoes WHERE profissional_id = $1`, [alvo.id]))[0].n;
    expect(depois).toBe(antes + 1);
    await expect(viaFila.registrarAvaliacao(alvo.id, { nota: 11 })).rejects.toBeInstanceOf(AvaliacaoInvalidaError);
  });

  it("profissional que so' existe no cadastro remoto e' projetado na base local (FK de convites e recomendacoes)", async () => {
    const novo = criarProfissionalExterno({
      id: randomUUID(),
      nome: "Gabriela Remota",
      email: "gabriela@remoto.com",
      especialidades: ["Direção"],
      precoBaseDiaria: 1100,
      localizacao: "Curitiba"
    });
    novo.disponibilidade = [{ inicio: "2026-01-01", fim: "2026-12-31" }];
    const fila = novaFila();
    const remotoFalso: AdaptadorProfissional = {
      listarProfissionais: async () => [novo],
      detalharProfissional: async () => novo,
      registrarAvaliacao: async () => undefined
    };
    await registrarRespondedor(servidor, fila, criarTratadorConsultas(remotoFalso));
    const adaptador = await clienteDe(fila);
    expect(await ds.query(`SELECT 1 FROM profissionais WHERE id = $1`, [novo.id])).toHaveLength(0);

    const lista = await adaptador.listarProfissionais({});
    await adaptador.listarProfissionais({}); // idempotente: segunda consulta atualiza, nao duplica

    expect(lista[0].id).toBe(novo.id);
    const linhas = await ds.query(`SELECT nome, email, especialidades, "precoBaseDiaria", localizacao FROM profissionais WHERE id = $1`, [novo.id]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ nome: "Gabriela Remota", email: "gabriela@remoto.com", especialidades: "Direção", localizacao: "Curitiba" });
    expect(Number(linhas[0].precoBaseDiaria)).toBe(1100);
  });
});
