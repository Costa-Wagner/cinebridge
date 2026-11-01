import { DataSource } from "typeorm";
import { prepararBancoDeTestes } from "./bancoDeTestes";
import { montarSistema } from "../composicao";
import { SistemaRecomendacao } from "../observers/SistemaRecomendacao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { Projeto } from "../domain/entities/Projeto";
import { Equipe } from "../domain/entities/Equipe";
import { Papel } from "../domain/enums/Papel";
import { TipoCaptacao } from "../domain/enums/TipoCaptacao";
import { AdaptadorArmazenamento } from "../adaptadores/armazenamento/AdaptadorArmazenamento";
import { AdaptadorS3 } from "../adaptadores/armazenamento/AdaptadorS3";
import { AdaptadorGoogleCloud } from "../adaptadores/armazenamento/AdaptadorGoogleCloud";
import { AdaptadorLocal } from "../adaptadores/armazenamento/AdaptadorLocal";
import { AdaptadorPagamento } from "../adaptadores/pagamento/AdaptadorPagamento";
import { AdaptadorStripe } from "../adaptadores/pagamento/AdaptadorStripe";
import { AdaptadorPagSeguro } from "../adaptadores/pagamento/AdaptadorPagSeguro";
import { AdaptadorPayPal } from "../adaptadores/pagamento/AdaptadorPayPal";
import { AdaptadorProfissional } from "../adaptadores/profissional/AdaptadorProfissional";
import { AdaptadorInterno } from "../adaptadores/profissional/AdaptadorInterno";
import { AdaptadorLinkedIn } from "../adaptadores/profissional/AdaptadorLinkedIn";
import { AdaptadorIndeed } from "../adaptadores/profissional/AdaptadorIndeed";
import { ApiProfissionalExterna } from "../adaptadores/externos/ApiProfissionalExterna";
import { PortalEmpregoSimulado } from "../adaptadores/externos/PortalEmpregoSimulado";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let ds: DataSource;
let sistema: SistemaRecomendacao;
let servico: ServicoProjetos;
let projeto: Projeto;
const pastaLocal = fs.mkdtempSync(path.join(os.tmpdir(), "cb-adapter-"));

/**
 * "Logica de negocio" do teste: depende somente das interfaces entregues pelo
 * SistemaRecomendacao. Trocar o provedor nao pode exigir nenhuma mudanca aqui.
 */
async function contratar(equipe: Equipe) {
  const armazenamento = sistema.obterAdaptadorArmazenamento();
  const pagamento = sistema.obterAdaptadorPagamento();
  const resumo = equipe.membros.map((m) => `${m.papel}:${m.profissional.id}`).join("\n");
  const arquivo = armazenamento.salvarArquivo(Buffer.from(resumo), { nome: `projetos/${equipe.projeto.id}/equipe.txt` });
  const pagamentos = equipe.membros.map((m) => pagamento.efetuarPagamento(m.profissional.precoBaseDiaria, "produtor", m.profissional.id));
  return { arquivo, conteudo: armazenamento.recuperarArquivo(arquivo).toString(), pagamentos, pagamento };
}

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  const banco = await prepararBancoDeTestes();
  ds = banco.ds;
  sistema = montarSistema();
  servico = new ServicoProjetos(ds, sistema); // injeta o AdaptadorInterno
  projeto = await ds.getRepository(Projeto).findOneByOrFail({ id: banco.projetoSeedId });
});

afterAll(async () => {
  await ds.destroy();
  fs.rmSync(pastaLocal, { recursive: true, force: true });
  jest.restoreAllMocks();
});

const armazenamentos: Array<[string, string, () => AdaptadorArmazenamento]> = [
  ["S3", "", () => new AdaptadorS3()],
  ["GoogleCloud", "gs://", () => new AdaptadorGoogleCloud()],
  ["Local", "", () => new AdaptadorLocal(pastaLocal)]
];
const pagamentos: Array<[string, () => AdaptadorPagamento]> = [
  ["Stripe", () => new AdaptadorStripe()],
  ["PagSeguro", () => new AdaptadorPagSeguro()],
  ["PayPal", () => new AdaptadorPayPal()]
];

describe("Adapter: trocar de provedor sem alterar a logica de negocio", () => {
  let equipe: Equipe;
  beforeAll(async () => {
    equipe = await sistema.executarRecomendacao(projeto);
  });

  it("a equipe vem do cadastro interno (AdaptadorInterno sobre o catalogo e o Postgres)", () => {
    expect(equipe.membros.length).toBe(projeto.papeisObrigatorios.length);
    expect(equipe.membros.every((m) => !m.profissional.id.includes(":"))).toBe(true);
  });

  it.each(armazenamentos)("armazenamento %s: mesmo codigo de negocio, mesmo resultado", async (_nome, esquema, criar) => {
    sistema.configurarAdaptadores({ armazenamento: criar() });
    const { arquivo, conteudo } = await contratar(equipe);
    expect(conteudo).toBe(equipe.membros.map((m) => `${m.papel}:${m.profissional.id}`).join("\n"));
    expect(arquivo.startsWith(esquema)).toBe(true);
    expect(sistema.obterAdaptadorArmazenamento().listarArquivos(`projetos/${equipe.projeto.id}/`)).toHaveLength(1);
  });

  it.each(pagamentos)("pagamento %s: um pagamento confirmado por membro, e cancelavel", async (_nome, criar) => {
    sistema.configurarAdaptadores({ pagamento: criar() });
    const { pagamentos: ids, pagamento } = await contratar(equipe);
    expect(ids).toHaveLength(equipe.membros.length);
    expect(ids.every((id) => pagamento.verificarPagamento(id) === "CONFIRMADO")).toBe(true);
    expect(pagamento.cancelarPagamento(ids[0])).toBe(true);
    expect(pagamento.verificarPagamento(ids[0])).toBe("CANCELADO");
  });

  it("trocar o adaptador substitui so' o provedor: os arquivos de um nao aparecem no outro", async () => {
    sistema.configurarAdaptadores({ armazenamento: new AdaptadorS3() });
    await contratar(equipe);
    sistema.configurarAdaptadores({ armazenamento: new AdaptadorGoogleCloud() });
    expect(sistema.obterAdaptadorArmazenamento().listarArquivos("projetos/")).toEqual([]);
  });
});

describe("Adapter: fontes de profissionais intercambiaveis", () => {
  const registros = [
    { id: "7", nomeCompleto: "Lia", emailContato: "lia@x.com", funcoes: [Papel.DIRETOR], habilidades: ["Direção", "Liderança"], valorDiaria: 1200, cidade: "SP" },
    { id: "8", nomeCompleto: "Edu", emailContato: "edu@x.com", funcoes: [Papel.EDITOR], habilidades: ["Edição"], valorDiaria: 800, cidade: "RJ" }
  ];
  const candidatos = registros.map((r) => ({
    candidateId: r.id, fullName: r.nomeCompleto, mail: r.emailContato, roles: r.funcoes,
    skills: r.habilidades, dailyRate: r.valorDiaria, city: r.cidade
  }));
  const fontes: Array<[string, string, () => AdaptadorProfissional]> = [
    ["LinkedIn", "linkedin:", () => new AdaptadorLinkedIn(new ApiProfissionalExterna(registros))],
    ["Indeed", "indeed:", () => new AdaptadorIndeed(new PortalEmpregoSimulado(candidatos))]
  ];

  it.each(fontes)("%s: a recomendacao usa os profissionais da fonte externa", async (_nome, prefixo, criar) => {
    sistema.configurarAdaptadores({ profissional: criar() });
    const equipe = await sistema.executarRecomendacao(projeto, { papeis: [Papel.DIRETOR, Papel.EDITOR] });
    const porPapel = Object.fromEntries(equipe.membros.map((m) => [m.papel, m.profissional]));
    expect(porPapel[Papel.DIRETOR]).toMatchObject({ id: `${prefixo}7`, nome: "Lia", precoBaseDiaria: 1200 });
    expect(porPapel[Papel.EDITOR]).toMatchObject({ id: `${prefixo}8`, nome: "Edu" });
  });

  it("voltar ao AdaptadorInterno restaura a fonte do banco, sem mexer em mais nada", async () => {
    sistema.configurarAdaptadores({ profissional: new AdaptadorInterno(servico["catalogo"], ds) });
    const equipe = await sistema.executarRecomendacao(projeto);
    expect(equipe.membros.every((m) => !m.profissional.id.includes(":"))).toBe(true);
    expect(projeto.tipoCaptacao).toBe(TipoCaptacao.ANIMACAO);
  });

  it("avaliacao registrada pelo adaptador interno chega ao banco", async () => {
    const interno = new AdaptadorInterno(servico["catalogo"], ds);
    const [alguem] = await interno.listarProfissionais({ limitePorPapel: 1 });
    const antes = await ds.query(`SELECT count(*)::int AS n FROM avaliacoes WHERE profissional_id = $1`, [alguem.id]);
    await interno.registrarAvaliacao(alguem.id, { nota: 9, comentario: "otimo trabalho" });
    const depois = await ds.query(`SELECT count(*)::int AS n FROM avaliacoes WHERE profissional_id = $1`, [alguem.id]);
    expect(depois[0].n).toBe(antes[0].n + 1);
  });
});
