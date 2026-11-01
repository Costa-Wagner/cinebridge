import "dotenv/config";
import "reflect-metadata";
import { gerarProfissionaisEmMassa, NOME_BANCO_CARGA, prepararBancoDeTestes } from "./bancoDeTestes";
import { criarApp } from "../app";
import { montarSistema } from "../composicao";
import { ServicoProjetos } from "../aplicacao/ServicoProjetos";
import { CatalogoProfissionais } from "../aplicacao/CatalogoProfissionais";

/**
 * Teste de carga leve do requisito nao funcional: recomendacoes com ate
 * 10 mil profissionais ativos, 100 requisicoes simultaneas, resposta em ate 2 s.
 *
 *   npm run carga                       (padrao: 10000 profissionais, 100 requisicoes, limite 2000 ms)
 *   PROFISSIONAIS=2000 npm run carga    (variaveis: PROFISSIONAIS, REQUISICOES, LIMITE_MS, LOGS=1)
 *
 * Usa um banco proprio (cinebridge_carga) e chama a API em memoria
 * (fastify.inject): mede o servico e o banco, sem a rede.
 *
 * Criterio de aprovacao: p95 <= LIMITE_MS e nenhuma falha com o cadastro ja
 * em memoria, como no servidor (que o carrega na subida). A rodada com
 * cadastro frio e' so' informativa: inclui a leitura de todos os profissionais.
 */
const PROFISSIONAIS = Number(process.env.PROFISSIONAIS ?? 10_000);
const REQUISICOES = Number(process.env.REQUISICOES ?? 100);
const LIMITE_MS = Number(process.env.LIMITE_MS ?? 2_000);
const silenciar = process.env.LOGS !== "1";

const projeto = {
  tipoCaptacao: "DOCUMENTARIO",
  duracaoEstimadaMinutos: 80,
  orcamentoTotal: 60000,
  dataEntrega: "2026-12-10",
  localizacaoFilmagem: "Santos",
  tema: "Mares",
  entrevistados: ["Ana", "Beto"]
};

const percentil = (ordenado: number[], p: number) => ordenado[Math.min(ordenado.length - 1, Math.floor(ordenado.length * p))];

async function principal(): Promise<void> {
  console.log(`Preparando banco ${NOME_BANCO_CARGA} com ${PROFISSIONAIS} profissionais...`);
  const { ds } = await prepararBancoDeTestes(NOME_BANCO_CARGA);
  await gerarProfissionaisEmMassa(ds, PROFISSIONAIS);

  const catalogo = new CatalogoProfissionais(ds);
  const app = criarApp(new ServicoProjetos(ds, montarSistema(), catalogo));
  const logOriginal = console.log;
  if (silenciar) console.log = () => {};

  const ids: string[] = [];
  for (let i = 0; i < REQUISICOES; i++) {
    ids.push((await app.inject({ method: "POST", url: "/projetos", payload: projeto })).json().id);
  }

  const disparar = async () => {
    const latencias: number[] = [];
    const inicio = Date.now();
    const status = await Promise.all(
      ids.map(async (id) => {
        const t = Date.now();
        const resposta = await app.inject({ method: "POST", url: `/projetos/${id}/recomendar`, payload: {} });
        latencias.push(Date.now() - t);
        return resposta.statusCode;
      })
    );
    latencias.sort((a, b) => a - b);
    return { total: Date.now() - inicio, latencias, falhas: status.filter((s) => s !== 200).length };
  };

  const rodadas = [
    { nome: "cadastro frio, so' informativo (a primeira requisicao le o cadastro)", valeComoCriterio: false, resultado: await disparar() },
    { nome: "cadastro em memoria", valeComoCriterio: true, resultado: await disparar() }
  ];
  // diagnostico: separa o custo do banco do custo de processamento nesta maquina
  const pings: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t = Date.now();
    await ds.query("SELECT 1");
    pings.push(Date.now() - t);
  }
  const unica = Date.now();
  await app.inject({ method: "POST", url: `/projetos/${ids[0]}/recomendar`, payload: {} });
  const tempoUnica = Date.now() - unica;
  console.log = logOriginal;

  let reprovado = false;
  for (const { nome, valeComoCriterio, resultado } of rodadas) {
    const { total, latencias, falhas } = resultado;
    const p95 = percentil(latencias, 0.95);
    console.log(
      `\n${REQUISICOES} requisicoes simultaneas, ${nome}:\n` +
        `  total ${total} ms | p50 ${percentil(latencias, 0.5)} ms | p95 ${p95} ms | max ${latencias[latencias.length - 1]} ms | falhas ${falhas}`
    );
    if (falhas > 0 || (valeComoCriterio && p95 > LIMITE_MS)) reprovado = true;
  }
  const media = (pings.reduce((a, b) => a + b, 0) / pings.length).toFixed(1);
  const quente = rodadas[1].resultado;
  console.log(
    `\nDiagnostico: ida e volta ao banco ${media} ms | 1 requisicao isolada ${tempoUnica} ms | ` +
      `custo medio por requisicao na rodada quente ${(quente.total / REQUISICOES).toFixed(1)} ms ` +
      `(o Node processa uma requisicao por vez, entao total ≈ requisicoes × custo por requisicao)`
  );
  console.log(reprovado ? `\nREPROVADO: limite de ${LIMITE_MS} ms (p95) ou falhas.` : `\nAPROVADO: p95 dentro de ${LIMITE_MS} ms, sem falhas.`);

  await app.close();
  await ds.destroy();
  process.exit(reprovado ? 1 : 0);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
