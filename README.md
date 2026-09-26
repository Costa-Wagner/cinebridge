# 📚 DSM – Desenvolvimento de Software Multiplataforma – FATEC/SJC

Atividade prática **ATV1** – TP.II - Técnicas de Programação II · Prof. Dr. Eng. Gerson Penha.

# 🎬 CineBridge – Recomendação e Orquestração de Equipes

Microsserviço REST que recebe as especificações técnicas de um projeto audiovisual, analisa o perfil dos profissionais cadastrados e compõe automaticamente uma equipe equilibrada — notificando os envolvidos e permitindo ajustes dinâmicos ao longo do processo.

> Primeiro de uma série de exercícios que vão incrementar este mesmo projeto ao longo do semestre — a estrutura aqui documentada é a base sobre a qual as próximas entregas serão construídas.

## 📋 Requisitos

- Node.js (versão LTS)
- Docker Desktop (o Postgres roda em container)

## 🛠 Tecnologias

### ⚙️ Back-end (Linguagem e Frameworks)

<p align="left">
<a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js" height="25px">
</a>
<a href="https://www.typescriptlang.org" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" height="25px">
</a>
<a href="https://fastify.dev" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white" alt="Fastify" height="25px">
</a>
<a href="https://typeorm.io" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/TypeORM-FE0803?style=flat&logo=typeorm&logoColor=white" alt="TypeORM" height="25px">
</a>
</p>

### 🗄 Banco de dados

<p align="left">
<a href="https://www.postgresql.org" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL 16" height="25px">
</a>
</p>

### 🧪 Testes

<p align="left">
<a href="https://jestjs.io" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/Jest-C21325?style=flat&logo=jest&logoColor=white" alt="Jest" height="25px">
</a>
</p>

### 🐳 Infraestrutura

<p align="left">
<a href="https://www.docker.com" target="_blank" rel="noopener noreferrer">
<img src="https://img.shields.io/badge/Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker Compose" height="25px">
</a>
</p>

Versões: Node.js LTS · TypeScript 5.5 (modo `strict`) · Fastify 4 · TypeORM 0.3 · Postgres 16 · Jest 30 + ts-jest.

## 🚀 Como executar

```bash
git clone <url-do-repositorio>
cd cinebridge-recomendacao
npm install
cp .env.example .env
docker compose up -d
npm run seed
npm run dev
```

- Porta padrão do servidor: `3000`.
- Porta padrão do Postgres: `5432` (mapeada pelo `docker-compose.yml`, lendo o `.env`).
- Confirme o banco no ar com `docker ps` — deve aparecer `cinebridge-postgres` com `0.0.0.0:5432->5432/tcp`. Se aparecer outra porta, o `.env` não existe ou não foi lido; repita o `cp .env.example .env` e rode `docker compose down && docker compose up -d`.
- O `npm run seed` popula o banco com projetos e profissionais de exemplo — é necessário rodar ao menos uma vez antes de usar a API.

Teste rápido:
```bash
curl http://localhost:3000/health
```
Deve retornar `{"status":"ok"}`.

## 🗂 Estrutura do projeto

```
src/
├── config/                # DataSource do TypeORM, perfil ideal de competências por papel
├── domain/
│   ├── entities/            # Projeto, Profissional, Competencia, Avaliacao, Recomendacao, Convite...
│   └── enums/                # Papel, StatusConvite, TipoCaptacao
├── strategies/             # Strategy: algoritmos de recomendação + testes
├── orquestrador/           # Template Method: OrquestradorEquipe / OrquestradorPadrao + testes
├── observers/              # Observer: Publicador, Assinante e implementações + testes
├── visitors/               # Visitor: IVisitanteProjeto e implementações + testes
├── seed.ts                 # Popula o banco com dados de exemplo
├── testar-orquestrador.ts  # Script de demonstração manual (Strategy + Template Method + Observer)
├── testar-visitors.ts      # Script de demonstração manual (Visitor)
└── server.ts               # Entrypoint: Fastify + rota HTTP
```

Os arquivos de teste automatizado (`*.test.ts`) ficam ao lado do arquivo que testam (ex: `SimilaridadeCosseno.ts` + `SimilaridadeCosseno.test.ts`).

## 🏗 Decisão de arquitetura — padrões de projeto aplicados

```mermaid
flowchart TD
    A["POST /projetos/:id/recomendar"] --> B["OrquestradorPadrao.orquestrar()<br/>(Template Method)"]
    B --> C{"Para cada papel obrigatório do projeto"}
    C --> D["Strategy.recomendar()<br/>(pontua e ranqueia candidatos)"]
    D --> E["Publicador.notificarAssinantes()<br/>(Observer)"]
    E --> E1["ServicoEmail"]
    E --> E2["ServicoMensagensInternas"]
    E --> E3["ModuloAuditoria"]
    D --> F["selecionarCandidato() + criarConvite()"]
    F --> C
    C -->|todos os papéis processados| G["Retorna recomendações + convites"]

    H["Profissional / Projeto"] -.->|"aceitar(visitante)"| I["Visitor<br/>(operação transversal, fora do fluxo HTTP)"]
    I --> I1["ValidadorConsistencia"]
    I --> I2["CalculadorCompatibilidade"]
    I --> I3["GeradorRelatorio"]
```

**Strategy** — `IRecomendacaoStrategy`, três implementações intercambiáveis (0–10 pontos):

| Estratégia | Arquivo | Critério |
|---|---|---|
| `SIMILARIDADE_COSSENO` | `strategies/SimilaridadeCosseno.ts` | Similaridade de cosseno entre competências do profissional e o perfil ideal do papel |
| `FILTRAGEM_COLABORATIVA` | `strategies/FiltragemColaborativa.ts` | Média histórica de avaliações + bônus de afinidade por gênero de projeto |
| `REGRAS_ORCAMENTO` | `strategies/RegrasOrcamento.ts` | Viabilidade financeira e disponibilidade na janela de entrega |

**Template Method** — `OrquestradorEquipe` (abstrata) fixa o algoritmo em `orquestrar()`; `OrquestradorPadrao` (concreta) só implementa os dois pontos variáveis: qual strategy usar e o critério de corte (`pontuacaoMinima`).

**Observer** — `Publicador`/`Assinante`. A cada recomendação gerada, `SistemaRecomendacao` notifica `ServicoEmail`, `ServicoMensagensInternas` e `ModuloAuditoria`, sem conhecer os detalhes de cada um.

**Visitor** — `IVisitanteProjeto`, implementada por `Projeto`/`Profissional` via `ElementoVisitavel.aceitar()`. `ValidadorConsistencia`, `CalculadorCompatibilidade` e `GeradorRelatorio` adicionam operações novas sem alterar as entidades. Roda hoje de forma independente do fluxo HTTP (script de demonstração), não integrado na rota `/recomendar`.

## 🖥 Endpoints

| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| GET | `/health` | Verificação de que o servidor está no ar | 200 |
| POST | `/projetos/:id/recomendar` | Aplica a estratégia configurada e retorna a equipe recomendada | 200, 404 |

```bash
curl -X POST http://localhost:3000/projetos/<uuid-do-projeto>/recomendar
```

Resposta: JSON com `recomendacoes` (ranking completo por papel) e `convites` (candidato escolhido por papel, status `PENDENTE`).

> Recomenda-se Thunder Client ou Insomnia para visualizar a resposta formatada. Requisições sem corpo devem usar `No Body` (ou `{}`, se a opção não existir) — `Content-Type: application/json` com corpo vazio causa erro `415`.

## 🔧 Variáveis de ambiente

| Variável | Descrição | Padrão (`.env.example`) |
|---|---|---|
| `DB_HOST` | Host do Postgres | `localhost` |
| `DB_PORT` | Porta do Postgres | `5432` |
| `DB_USER` | Usuário do Postgres | `postgres` |
| `DB_PASSWORD` | Senha do Postgres | `postgres` |
| `DB_NAME` | Nome do banco | `cinebridge` |
| `PORT` | Porta do servidor Fastify | `3000` |

O `docker-compose.yml` lê essas variáveis do `.env` automaticamente.

## 🧪 Testes

```bash
npm test              # roda toda a suíte
npm run test:coverage # roda com relatório de cobertura
```

| Padrão | Suítes cobertas |
|---|---|
| Strategy | `SimilaridadeCosseno`, `FiltragemColaborativa`, `RegrasOrcamento` |
| Template Method | `OrquestradorPadrao` |
| Observer | `SistemaRecomendacao`, `ServicoEmail`, `ServicoMensagensInternas`, `ModuloAuditoria` |
| Visitor | `ValidadorConsistencia`, `CalculadorCompatibilidade`, `GeradorRelatorio` |

Estado atual: **52 testes, 11 suítes, 100% de cobertura de statements/functions/lines, 87.8% de branches** (threshold mínimo: 80% em todas as métricas).

Todos os testes são **unitários**: usam objetos fake/mock e chamam as classes diretamente, sem depender do Postgres — por isso rodam mesmo com o Docker parado. Não há testes de integração validando inserção real no banco (essa cobertura hoje é só manual, via `seed.ts` + verificação da rota).

Entidades de domínio (`domain/entities/`) e arquivos de infraestrutura (`config/`, `server.ts`) são excluídos do cálculo de cobertura (`jest.config.js`) por serem majoritariamente decorators do TypeORM e setup, sem lógica de negócio própria.

## 🔩 Scripts de demonstração manual

```bash
npm run test:orquestrador  # Strategy + Template Method + Observer, ponta a ponta com o banco
npm run test:visitors      # Visitor, percorrendo projeto + profissionais seedados
```

Diferente dos `*.test.ts` (Jest, mocks, sem banco), esses dois scripts fazem execução real contra o Postgres — exigem `docker compose up -d` e `npm run seed` antes.

## 🖥 Compatibilidade

| Sistema | Situação |
|---|---|
| Windows 10+ (desenvolvimento) | Testado ponta a ponta |
| Ubuntu 24.04+ | Compatível (Docker + Node.js LTS); não testado nesta entrega |

## 💾 Persistência de dados

PostgreSQL 16 via Docker Compose, com volume nomeado (`cinebridge_pgdata`) — os dados persistem entre reinicializações do container. `npm run seed` popula projetos e profissionais de exemplo.

## 🎯 Conceitos aplicados

- Node.js + TypeScript em modo estrito
- Fastify e API REST (verbos HTTP e códigos de status)
- TypeORM: `@Entity`, `@OneToMany`, colunas `jsonb`/`simple-array`
- Padrões de projeto: Strategy, Template Method, Observer, Visitor
- Testes unitários com Jest + ts-jest, mocks e fakes, cobertura de código
- Injeção de dependência explícita via construtor (strategy e publicador injetados no orquestrador)