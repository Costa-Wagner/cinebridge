import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/data-source";
import { Competencia } from "./domain/entities/Competencia";
import { Profissional } from "./domain/entities/Profissional";
import { ProfissionalCompetencia } from "./domain/entities/ProfissionalCompetencia";
import { Avaliacao } from "./domain/entities/Avaliacao";
import { Projeto } from "./domain/entities/Projeto";
import { Papel } from "./domain/enums/Papel";
import { TipoCaptacao } from "./domain/enums/TipoCaptacao";

interface CompetenciaSeed {
  nome: string;
  nivel: number;
}

interface ProfissionalSeed {
  nome: string;
  email: string;
  especialidades: string[];
  precoBaseDiaria: number;
  localizacao: string;
  disponibilidade: { inicio: string; fim: string }[];
  competencias: CompetenciaSeed[];
  notasAvaliacoes: number[];
}

const PROFISSIONAIS_SEED: ProfissionalSeed[] = [
  {
    nome: "Ana Beatriz Duarte",
    email: "ana.duarte@example.com",
    especialidades: ["Direção", "Liderança de equipe"],
    precoBaseDiaria: 1500,
    localizacao: "São Paulo",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }],
    competencias: [
      { nome: "Liderança", nivel: 9 },
      { nome: "Direção", nivel: 9 },
      { nome: "Roteiro", nivel: 5 },
      { nome: "Edição", nivel: 3 }
    ],
    notasAvaliacoes: [9, 8, 9]
  },
  {
    nome: "Bruno Salgado",
    email: "bruno.salgado@example.com",
    especialidades: ["Fotografia", "Iluminação de cena"],
    precoBaseDiaria: 1200,
    localizacao: "Rio de Janeiro",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }],
    competencias: [
      { nome: "Fotografia", nivel: 9 },
      { nome: "Iluminação", nivel: 8 },
      { nome: "Câmera", nivel: 9 },
      { nome: "Edição", nivel: 2 }
    ],
    notasAvaliacoes: [7, 8]
  },
  {
    nome: "Carla Nascimento",
    email: "carla.nascimento@example.com",
    especialidades: ["Som direto", "Mixagem"],
    precoBaseDiaria: 800,
    localizacao: "São Paulo",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }],
    competencias: [
      { nome: "Som", nivel: 9 },
      { nome: "Mixagem de Áudio", nivel: 8 },
      { nome: "Edição", nivel: 2 }
    ],
    notasAvaliacoes: []
  },
  {
    nome: "Diego Ferraz",
    email: "diego.ferraz@example.com",
    especialidades: ["Edição de vídeo", "Color grading"],
    precoBaseDiaria: 900,
    localizacao: "Belo Horizonte",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }],
    competencias: [
      { nome: "Edição", nivel: 9 },
      { nome: "Color Grading", nivel: 6 },
      { nome: "Roteiro", nivel: 2 }
    ],
    notasAvaliacoes: []
  },
  {
    nome: "Elis Marques",
    email: "elis.marques@example.com",
    especialidades: ["Roteiro", "Pesquisa"],
    precoBaseDiaria: 700,
    localizacao: "Rio de Janeiro",
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-12-31" }],
    competencias: [
      { nome: "Roteiro", nivel: 9 },
      { nome: "Direção", nivel: 3 },
      { nome: "Pesquisa", nivel: 7 }
    ],
    notasAvaliacoes: []
  },
  {
    nome: "Fabio Yamamoto",
    email: "fabio.yamamoto@example.com",
    especialidades: ["Efeitos visuais", "Animação"],
    precoBaseDiaria: 2000,
    localizacao: "São Paulo",
    // janela de disponibilidade que NAO cobre a data de entrega do projeto seed
    // (proposital, pra testar a regra de indisponibilidade do RegrasOrcamento)
    disponibilidade: [{ inicio: "2026-01-01", fim: "2026-06-01" }],
    competencias: [
      { nome: "Efeitos Visuais", nivel: 9 },
      { nome: "Animação", nivel: 6 },
      { nome: "Edição", nivel: 3 }
    ],
    notasAvaliacoes: []
  }
];

async function limparBanco(): Promise<void> {
  await AppDataSource.query(
    `TRUNCATE TABLE "convites", "recomendacoes", "profissional_competencias", "avaliacoes", "competencias", "profissionais", "projetos" RESTART IDENTITY CASCADE`
  );
}

async function seedCompetencias(): Promise<Map<string, Competencia>> {
  const nomes = new Set(
    PROFISSIONAIS_SEED.flatMap((p) => p.competencias.map((c) => c.nome))
  );
  const repo = AppDataSource.getRepository(Competencia);
  const mapa = new Map<string, Competencia>();

  for (const nome of nomes) {
    const competencia = await repo.save(repo.create({ nome }));
    mapa.set(nome, competencia);
  }

  return mapa;
}

async function seedProfissionais(competencias: Map<string, Competencia>): Promise<void> {
  const profissionalRepo = AppDataSource.getRepository(Profissional);
  const vinculoRepo = AppDataSource.getRepository(ProfissionalCompetencia);
  const avaliacaoRepo = AppDataSource.getRepository(Avaliacao);

  for (const dado of PROFISSIONAIS_SEED) {
    const profissional = await profissionalRepo.save(
      profissionalRepo.create({
        nome: dado.nome,
        email: dado.email,
        especialidades: dado.especialidades,
        precoBaseDiaria: dado.precoBaseDiaria,
        localizacao: dado.localizacao,
        disponibilidade: dado.disponibilidade
      })
    );

    for (const comp of dado.competencias) {
      const competencia = competencias.get(comp.nome);
      if (!competencia) continue;
      await vinculoRepo.save(
        vinculoRepo.create({ profissional, competencia, nivel: comp.nivel })
      );
    }

    for (const nota of dado.notasAvaliacoes) {
      await avaliacaoRepo.save(avaliacaoRepo.create({ profissional, nota }));
    }
  }
}

async function seedProjeto(): Promise<void> {
  const repo = AppDataSource.getRepository(Projeto);
  await repo.save(
    repo.create({
      genero: "Ficção Científica",
      duracaoEstimadaMinutos: 90,
      orcamentoTotal: 50000,
      dataEntrega: "2026-12-01",
      tipoCaptacao: TipoCaptacao.FICCAO,
      localizacaoFilmagem: "Rio de Janeiro",
      papeisObrigatorios: [
        { papel: Papel.DIRETOR, peso: 10 },
        { papel: Papel.DIRETOR_FOTOGRAFIA, peso: 9 },
        { papel: Papel.SONOPLASTA, peso: 6 },
        { papel: Papel.EDITOR, peso: 7 },
        { papel: Papel.ROTEIRISTA, peso: 8 },
        { papel: Papel.ESPECIALISTA_EFEITOS_VISUAIS, peso: 5 }
      ]
    })
  );
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  await limparBanco();

  const competencias = await seedCompetencias();
  await seedProfissionais(competencias);
  await seedProjeto();

  console.log("Seed concluido: 1 projeto, 6 profissionais, competencias e avaliacoes.");
  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error("Erro no seed:", err);
  await AppDataSource.destroy();
  process.exit(1);
});