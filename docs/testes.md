# 🧪 Roteiro de Testes — CineBridge

Este documento registra a evidência dos testes automatizados (Jest) e o roteiro de testes manuais executados sobre a rota HTTP, incluindo a validação de compatibilidade Windows/Ubuntu exigida pelo enunciado.

## Testes automatizados (Jest)

```bash
npm run test:coverage
```

**Resultado atual (ATV3, `npm run test:coverage`):**

| Suítes | Testes | % Stmts | % Branch | % Funcs | % Lines |
|---|---|---|---|---|---|
| 31 passed | 317 passed | **100%** | **96.1%** | **100%** | **100%** |

Testes de integração (`npm run test:integration`, Postgres real): **5 suítes, 47 testes passando** (ATV3: Adapter, Composite e Decorator em `adapter.integration.test.ts`, `composite.integration.test.ts` e `decoradores.integration.test.ts`).
Teste de carga (`npm run carga`): ver seção "Teste de carga" abaixo.

Threshold mínimo configurado (`jest.config.js`): **80%** em todas as métricas — atingido e ultrapassado.

> Os blocos de saída bruta abaixo (Windows e Ubuntu) são a evidência registrada na ATV1, com 197 testes; mantidos como histórico de compatibilidade entre sistemas.

**Output real do terminal — Windows** (`npm run test:coverage`, evidência anterior):

```
-------------------------------|---------|----------|---------|---------|-------------------
File                           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------------------|---------|----------|---------|---------|-------------------
All files                      |     100 |     87.8 |     100 |     100 |
 domain/enums                  |     100 |      100 |     100 |     100 |
  Papel.ts                     |     100 |      100 |     100 |     100 |
  StatusConvite.ts             |     100 |      100 |     100 |     100 |
  TipoCaptacao.ts              |     100 |      100 |     100 |     100 |
 observers                     |     100 |    83.33 |     100 |     100 |
  ModuloAuditoria.ts           |     100 |      100 |     100 |     100 |
  ServicoEmail.ts              |     100 |      100 |     100 |     100 |
  ServicoMensagensInternas.ts  |     100 |      100 |     100 |     100 |
  SistemaRecomendacao.ts       |     100 |       50 |     100 |     100 | 14
 orquestrador                  |     100 |    83.33 |     100 |     100 |
  OrquestradorEquipe.ts        |     100 |      100 |     100 |     100 |
  OrquestradorPadrao.ts        |     100 |    66.66 |     100 |     100 | 20-21
 strategies                    |     100 |    82.14 |     100 |     100 |
  FiltragemColaborativa.ts     |     100 |       70 |     100 |     100 | 10,17-22
  RegrasOrcamento.ts           |     100 |     87.5 |     100 |     100 | 11
  SimilaridadeCosseno.ts       |     100 |       90 |     100 |     100 | 11
 visitors                      |     100 |    93.33 |     100 |     100 |
  CalculadorCompatibilidade.ts |     100 |       75 |     100 |     100 | 37,42
  GeradorRelatorio.ts          |     100 |      100 |     100 |     100 |
  ValidadorConsistencia.ts     |     100 |      100 |     100 |     100 |
-------------------------------|---------|----------|---------|---------|-------------------

Test Suites: 11 passed, 11 total
Tests:       197 passed, 197 total
Snapshots:   0 total
Time:        55.727 s
```

**Output real do terminal — Ubuntu 24.04 (WSL2)** (`npm run test:coverage`):

```
-------------------------------|---------|----------|---------|---------|-------------------
File                           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------------------|---------|----------|---------|---------|-------------------
All files                      |     100 |     87.8 |     100 |     100 |
 domain/enums                  |     100 |      100 |     100 |     100 |
  Papel.ts                     |     100 |      100 |     100 |     100 |
  StatusConvite.ts             |     100 |      100 |     100 |     100 |
  TipoCaptacao.ts              |     100 |      100 |     100 |     100 |
 observers                     |     100 |    83.33 |     100 |     100 |
  ModuloAuditoria.ts           |     100 |      100 |     100 |     100 |
  ServicoEmail.ts              |     100 |      100 |     100 |     100 |
  ServicoMensagensInternas.ts  |     100 |      100 |     100 |     100 |
  SistemaRecomendacao.ts       |     100 |       50 |     100 |     100 | 14
 orquestrador                  |     100 |    83.33 |     100 |     100 |
  OrquestradorEquipe.ts        |     100 |      100 |     100 |     100 |
  OrquestradorPadrao.ts        |     100 |    66.66 |     100 |     100 | 20-21
 strategies                    |     100 |    82.14 |     100 |     100 |
  FiltragemColaborativa.ts     |     100 |       70 |     100 |     100 | 10,17-22
  RegrasOrcamento.ts           |     100 |     87.5 |     100 |     100 | 11
  SimilaridadeCosseno.ts       |     100 |       90 |     100 |     100 | 11
 visitors                      |     100 |    93.33 |     100 |     100 |
  CalculadorCompatibilidade.ts |     100 |       75 |     100 |     100 | 37,42
  GeradorRelatorio.ts          |     100 |      100 |     100 |     100 |
  ValidadorConsistencia.ts     |     100 |      100 |     100 |     100 |
-------------------------------|---------|----------|---------|---------|-------------------

Test Suites: 11 passed, 11 total
Tests:       197 passed, 197 total
Snapshots:   0 total
Time:        59.757 s
```

Cobertura **idêntica** em ambos os sistemas (mesmas métricas, mesmas linhas descobertas) — confirma que o comportamento do código independe do sistema operacional.

| Padrão | Suíte de teste | Qtd. testes |
|---|---|---|
| Strategy | `SimilaridadeCosseno.test.ts` | 6 |
| Strategy | `FiltragemColaborativa.test.ts` | 5 |
| Strategy | `RegrasOrcamento.test.ts` | 4 |
| Template Method | `OrquestradorPadrao.test.ts` | 6 |
| Observer | `SistemaRecomendacao.test.ts` | 4 |
| Observer | `ServicoEmail.test.ts` | 2 |
| Observer | `ServicoMensagensInternas.test.ts` | 1 |
| Observer | `ModuloAuditoria.test.ts` | 1 |
| Visitor | `ValidadorConsistencia.test.ts` | 10 |
| Visitor | `CalculadorCompatibilidade.test.ts` | 7 |
| Visitor | `GeradorRelatorio.test.ts` | 6 |

Os testes unitários usam objetos fake/mock, sem dependência do Postgres — rodam de forma determinística e independente do Docker. Os testes de integração (`*.integration.test.ts`) usam um banco próprio (`cinebridge_test`), recriado a cada execução.

**Entidades de domínio** (`domain/entities/`) e **arquivos de infraestrutura** (`config/`, `server.ts`, scripts manuais) foram excluídos do cálculo de cobertura por serem majoritariamente decorators do TypeORM e setup, sem lógica de negócio própria — decisão registrada em `jest.config.js` (`collectCoverageFrom`).

> Na ATV1 não havia teste de integração; na ATV2 foram acrescentados (`src/integracao/`): criação por tipo com gravação real, equipes consistentes com o tipo, notificações por tipo, substituição de equipe, fluxo completo de convites até a equipe formada, histórico de recomendações e Visitor sobre as mesmas entidades.

---
## Teste de carga

Requisito: recomendações em até 2 s com até 10 mil profissionais ativos e 100 requisições simultâneas.

```bash
npm run carga        # PROFISSIONAIS=10000 REQUISICOES=100 LIMITE_MS=2000 (padrões)
```

O script cria o banco `cinebridge_carga`, gera os profissionais direto no banco, cria um projeto por requisição e dispara todas as recomendações ao mesmo tempo (API em memória, sem rede). Reprova se houver falha ou se o p95 com o cadastro em memória passar de `LIMITE_MS`.

| Cenário | Antes (`find` com relações) | Depois (`CatalogoProfissionais` + pré-seleção) |
|---|---|---|
| 99 requisições simultâneas, 10 mil profissionais | processo Node encerrado por falta de memória | **p95 ≈ 0,8–1,0 s**, sem falhas |
| Primeira requisição (cadastro frio) | — | informativo: ~2–2,5 s (a leitura do cadastro entra na conta) |
| 100 requisições simultâneas, 10 mil profissionais (Windows 10+, Docker Desktop, Postgres 18) | — | **p95 ≈ 3,6 s** (custo ~36 ms por requisição); o limite de 2 s não é atendido neste hardware, ver README |

Medições no ambiente de desenvolvimento (Ubuntu 24.04, Postgres local); o resultado depende do processador da máquina, e o script imprime um diagnóstico para interpretá-lo em outro computador. A rodada "fria" não é critério de aprovação porque o servidor carrega o cadastro na subida. Detalhes das decisões: seção "Desempenho" do README.

## Testes manuais (rota HTTP)

Ambiente: Postgres via `docker compose up -d`, banco populado via `npm run seed`, servidor via `npm run dev`.

| # | Passo | Requisição | Resultado esperado | Resultado obtido |
|---|---|---|---|---|
| T01 | Health check | `GET http://localhost:3000/health` | `200` — `{"status":"ok"}` | ✅ Conforme esperado |
| T02 | Recomendação — fluxo feliz | `POST /projetos/{uuid}/recomendar` (projeto seedado, sem corpo) | `200` — JSON com `equipe` (1 membro proposto por papel, sem repetição de profissional) e `alternativas` por papel | ✅ ATV1: 6 convites, um por papel. ATV2: o contrato mudou (equipe proposta; convites só nascem quando o produtor aceita) e é verificado pelos testes de integração |
| T03 | Corpo vazio com `Content-Type: application/json` (Thunder Client) | `POST /projetos/{uuid}/recomendar` com aba Body em "JSON" vazio | Erro `415 Unsupported Media Type` (Fastify não aceita corpo JSON vazio com header presente) | ✅ Erro reproduzido conforme esperado — corrigido enviando `{}` como corpo válido |
| T04 | Recomendação — corpo corrigido | `POST /projetos/{uuid}/recomendar` com corpo `{}` | `200` — mesmo resultado de T02 | ✅ Conforme esperado |
| T05 | Projeto inexistente | `POST /projetos/00000000-0000-0000-0000-000000000000/recomendar` | `404` — `{"erro":"Projeto não encontrado"}` | ✅ `HTTP/1.1 404 Not Found`, corpo de 34 bytes (compatível com o JSON esperado) |

### Ferramentas usadas

- **Insomnia** — validação inicial em Windows (T01, T02)
- **Thunder Client** (extensão VS Code) — validação do erro de `Content-Type` e correção (T03, T04)
- **curl** — usado nos testes de compatibilidade Ubuntu (ver abaixo)

---

## Compatibilidade (Windows / Ubuntu)

Requisito do enunciado: *"Compatibilidade com Windows 10 ou superior, Ubuntu 24.04.03 ou superior"*.

| Sistema | Etapas validadas | Resultado |
|---|---|---|
| **Windows 10+** | `npm install`, `docker compose up -d`, `npm run seed`, `npm run dev`, `npm test`, testes manuais T01–T04 (Insomnia + Thunder Client) | ✅ Todas as etapas concluídas com sucesso |
| **Ubuntu 24.04** (via WSL2, distro `Ubuntu-24.04`) | Clone isolado do repositório dentro do WSL (`~/cinebridge-teste-ubuntu`), `npm install`, `docker compose up -d` (Docker Desktop com integração WSL ativada), `npm test` (197/197 passando), `npm run seed`, `npm run dev`, `curl http://localhost:3000/health`, `curl -X POST .../recomendar` | ✅ Todas as etapas concluídas com sucesso |

**Observação de ambiente**: a suíte de testes rodou mais lenta no WSL (~80s) do que no Windows nativo (~18–35s) — atribuído a I/O de sistema de arquivos do WSL2, não indica problema de compatibilidade real (todos os 197 testes passaram identicamente nos dois sistemas).

---

## Limitações conhecidas

- `Recomendacao.pontuacao` fica nula (o contrato do diagrama devolve só a ordem); posição e recomendador são gravados.
- Os roteiros manuais T01–T05 foram executados na ATV1; na ATV2 o comportamento da rota é coberto pelos testes de integração automatizados.
- `CalculadorCompatibilidade` e `GeradorRelatorio` (Visitor) não têm rota HTTP — validados por testes e por `npm run test:visitors`. O validador de consistência roda no fluxo (criação e orquestração).
- A pré-seleção por aderência é aproximada (30 por papel).
