# Análise de anti-padrões — CineBridge (ATV3)

Revisão do código das ATV1 e ATV2 em busca de más práticas que parecem soluções, mas custam manutenibilidade, e o que foi feito sobre cada uma. Referência: Koenig (1995) e Brown et al. (1998). Cada achado indica **onde está**, **por que é problema**, **a refatoração** e **a situação** (corrigido na ATV3, mitigado ou aceito com justificativa).

| # | Anti-padrão | Onde | Situação |
|---|---|---|---|
| 1 | Acoplamento a implementações concretas / *Vendor lock-in* | `ServicoProjetos` lia o cadastro direto do catálogo; sem caminho para provedores externos | **Corrigido** — Adapter |
| 2 | Estrutura rígida / *Primitive Obsession* | `Projeto.papeisObrigatorios`: lista plana de `{papel, peso}` sem custo, prazo nem hierarquia | **Corrigido** — Composite |
| 3 | Preocupações transversais misturadas / *Spaghetti* em potencial | Cache, auditoria e compressão teriam de entrar dentro das strategies | **Corrigido** — Decorator |
| 4 | *Blob* (objeto deus) em formação | `ServicoProjetos` (~300 linhas, 9 operações públicas) | **Mitigado**; refatoração proposta |
| 5 | *Copy-and-Paste Programming* | `Notificador{Documentario,Publicitario,Animacao}` | **Aceito** com justificativa; refatoração proposta |
| 6 | Tipagem fraca / escape de tipos | `DadosProjeto` com `[campo: string]: any`; `as never` em `manager.insert` | **Aceito** com justificativa |
| 7 | Padrão que vira anti-padrão | Decorator/Cache e o *setter* de compatibilidade de `papeisObrigatorios` | **Controlado** (ver abaixo) |

## 1. Acoplamento a provedores concretos → Adapter

**Problema.** A lógica de negócio dependia de uma única origem de profissionais (o catálogo em memória sobre o Postgres) e não tinha como falar com armazenamento em nuvem, pagamentos ou outras fontes de cadastro. Integrar cada serviço externo direto no núcleo espalharia protocolos e formatos diferentes pela regra de negócio.

**Refatoração.** Três contratos (`AdaptadorArmazenamento`, `AdaptadorPagamento`, `AdaptadorProfissional`) com 3 adaptadores cada, sobre sistemas externos simulados com interfaces propositalmente diferentes (`ArmazenamentoExterno` em estilo S3, `GoogleCloudStorageSimulado`, `GatewayPagamento`, `ApiPagSeguroSimulada`, `PayPalSimulado`, `ApiProfissionalExterna`, `PortalEmpregoSimulado`). `SistemaRecomendacao.configurarAdaptadores()` recebe as instâncias e `executarRecomendacao()` obtém os candidatos pelo `AdaptadorProfissional`; o `ServicoProjetos` injeta o `AdaptadorInterno` (catálogo) por padrão.

**Evidência.** `src/integracao/adapter.integration.test.ts`: o mesmo código de negócio roda com os 3 armazenamentos, os 3 gateways e as 3 fontes de profissionais, trocando só a instância injetada.

**Defeito encontrado no caminho.** O primeiro adaptador de profissionais externos devolvia `Profissional` sem `competencias`; o ranking por cosseno os descartava e a recomendação saía vazia. O teste de integração expôs o problema; `criarProfissionalExterno` passou a converter as habilidades em competências com nível padrão 7 (premissa: os provedores não informam nível).

## 2. Lista plana de papéis → Composite

**Problema.** Um projeto era "uma lista de papéis". Não há como representar pacotes (pós-produção → edição, coloração, mixagem), nem custo ou prazo por serviço.

**Refatoração.** `ServicoProjeto` (`calcularCusto`, `listarSubservicos`, `obterPrazo`, `validar`), `ServicoAtomico` (folha) e `PacoteServico` (composto, prazo sequencial ou paralelo). `Projeto.servicoPrincipal` guarda a raiz em `jsonb`; `calcularCustoTotal()` apenas delega. `papeisObrigatorios` virou derivado da árvore, então fábricas, orquestrador e visitantes não mudaram.

**Evidência.** `src/domain/servicos/composite.test.ts` (árvores de 1 a 3 níveis, custo, prazo, validação recursiva) e `composite.integration.test.ts` (persistência no Postgres e recomendação a partir da árvore).

## 3. Preocupações transversais → Decorator

**Problema.** Cache, auditoria e compressão não são responsabilidade das strategies. Colocá-las dentro delas misturaria algoritmo e infraestrutura e exigiria uma subclasse por combinação (`RecomendadorComCache`, `RecomendadorComCacheEAuditoria`...).

**Refatoração.** `CacheDecorator`, `AuditoriaDecorator` e `CompressaoDecorator` implementam `RecomendacaoStrategy` e envolvem outra instância; a pilha é montada por `ConfiguracaoDecoradores` (variável `DECORADORES`, `PUT /configuracao/decoradores` ou preferência na chamada). A ordem muda o comportamento (auditoria por fora do cache vê todas as chamadas; por dentro, só as que passaram pelo cache) sem tocar no `SistemaRecomendacao` nem no recomendador base.

**Efeito colateral tratado.** O orquestrador gravava `estrategia.constructor.name`, que passaria a ser "CacheDecorator". `nomeDaEstrategia()` desembrulha a pilha e mantém o nome do recomendador real.

## 4. Blob em formação — `ServicoProjetos`

**Sintoma.** ~300 linhas e 9 operações públicas (criar, recomendar, listar, buscar, aceitar, responder, substituir, reavaliar, aquecer), mais montagem e gravação em lote.

**Mitigação já existente.** As regras do fluxo (aceitar, substituir, reavaliar, estados do convite) estão em `Projeto`, não no serviço; o serviço só carrega, delega e persiste. Não há estado próprio além do catálogo e da configuração.

**Refatoração proposta (não aplicada).** Separar em `ServicoRecomendacao` (criar, recomendar, histórico) e `ServicoConvites` (aceitar, responder, substituir, reavaliar), compartilhando um repositório de projetos. Não foi aplicada nesta atividade porque mudaria a assinatura usada por `app.ts` e por todos os testes do serviço sem alterar comportamento; o risco superava o ganho no prazo.

## 5. Código duplicado — notificadores por tipo

**Sintoma.** Os três notificadores têm a mesma estrutura (receber o evento, converter o projeto para o tipo, formatar uma linha); só o texto muda.

**Justificativa.** A duplicação é pequena (um método de ~5 linhas) e cada tipo evolui de forma independente, que é o propósito da Abstract Factory.

**Refatoração proposta.** Classe base `NotificadorPorTipo<P>` com o rótulo e o método abstrato `descrever(projeto: P, evento)`; cada subclasse implementaria só a descrição.

## 6. Tipagem fraca

- `DadosProjeto` aceita campos específicos de cada tipo por `[campo: string]: any`: é o que permite uma fábrica nova sem alterar a base (demonstrado em `Extensibilidade.test.ts`). O custo é perder checagem; a validação por tipo (Visitor) compensa em tempo de execução.
- `as never` em `manager.insert(Equipe, ...)`: contorna a restrição de tipos do TypeORM para inserções em lote (decisão de desempenho). Fica restrito a duas linhas em `ServicoProjetos`.

## 7. Padrões que podem virar anti-padrões

| Risco | Como foi controlado |
|---|---|
| **Decorator com cache** serve dados antigos | Validade de 30 s e tamanho máximo; a chave usa só o que as strategies leem; o resultado é copiado. Limite conhecido: uma nova avaliação só aparece após a validade |
| **Composite** com custo/prazo fictícios | Papéis informados sem serviço viram pacote plano com custo 0 e prazo 1 dia, explicitamente documentado; a validação recusa custo negativo e prazo inválido |
| *Setter* `papeisObrigatorios` (compatibilidade) esconde a árvore | É um atalho para o caso plano; a fonte de verdade é `servicoPrincipal`, e o `seed` e a API já usam a árvore |
| **Singleton / estado global** | Não usado. O único estado compartilhado é o catálogo e o armazém de cache, ambos injetados pela raiz de composição (`composicao.ts`, `server.ts`) |
| **Adapter** que vaza o formato externo | Os adaptadores devolvem sempre `Profissional`, `string` e `Buffer` do domínio; os formatos externos não saem de `adaptadores/externos` |

## Como reproduzir a verificação

```bash
npm test                  # unitários
docker compose up -d recomendacoes-db cinebridge-mq && npm run test:integration
```
