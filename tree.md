cinebridge/
├─ docs/
│  ├─ ~$nebridge.resumo.docx
│  ├─ 1.pdf
│  ├─ 2.pdf
│  ├─ atv1.pdf
│  ├─ atv2.pdf
│  ├─ cinebridge.resumo.docx
│  ├─ execucao.md
│  └─ testes.md
├─ imagens/
│  └─ diagrama-1.png
├─ src/
│  ├─ aplicacao/
│  │  ├─ ServicoProjetos.test.ts
│  │  └─ ServicoProjetos.ts
│  ├─ config/
│  │  ├─ data-source.ts
│  │  ├─ mapeamento.test.ts
│  │  └─ perfilPapel.ts
│  ├─ domain/
│  │  ├─ entities/
│  │  │  ├─ Avaliacao.ts
│  │  │  ├─ Competencia.ts
│  │  │  ├─ Convite.ts
│  │  │  ├─ Equipe.ts
│  │  │  ├─ MembroEquipe.ts
│  │  │  ├─ PapelObrigatorio.ts
│  │  │  ├─ Profissional.ts
│  │  │  ├─ ProfissionalCompetencia.ts
│  │  │  ├─ Projeto.clonar.test.ts
│  │  │  ├─ Projeto.fluxo.test.ts
│  │  │  ├─ Projeto.ts
│  │  │  ├─ ProjetoAnimacao.ts
│  │  │  ├─ ProjetoDocumentario.ts
│  │  │  ├─ ProjetoPublicitario.ts
│  │  │  └─ Recomendacao.ts
│  │  ├─ enums/
│  │  │  ├─ Papel.ts
│  │  │  ├─ StatusConvite.ts
│  │  │  ├─ StatusEquipe.ts
│  │  │  └─ TipoCaptacao.ts
│  │  ├─ prototipos/
│  │  │  ├─ RegistroPrototipos.test.ts
│  │  │  └─ RegistroPrototipos.ts
│  │  └─ erros.ts
│  ├─ eventos/
│  │  ├─ BarramentoEventos.ts
│  │  └─ consumidoresExternos.ts
│  ├─ fabricas/
│  │  ├─ animacao/
│  │  │  ├─ FabricaAnimacao.ts
│  │  │  ├─ NotificadorAnimacao.ts
│  │  │  ├─ PontuacaoAnimacao.ts
│  │  │  ├─ RecomendadorAnimacao.ts
│  │  │  └─ ValidadorAnimacao.ts
│  │  ├─ documentario/
│  │  │  ├─ FabricaDocumentario.ts
│  │  │  ├─ NotificadorDocumentario.ts
│  │  │  ├─ RecomendadorDocumentario.ts
│  │  │  └─ ValidadorDocumentario.ts
│  │  ├─ publicitario/
│  │  │  ├─ FabricaPublicitario.ts
│  │  │  ├─ NotificadorPublicitario.ts
│  │  │  ├─ RecomendadorPublicitario.ts
│  │  │  └─ ValidadorPublicitario.ts
│  │  ├─ Extensibilidade.test.ts
│  │  ├─ FabricaProjeto.ts
│  │  ├─ Fabricas.test.ts
│  │  ├─ TipoSemFabricaError.ts
│  │  └─ ValidadorPorTipo.ts
│  ├─ integracao/
│  │  ├─ bancoDeTestes.ts
│  │  ├─ fluxo.integration.test.ts
│  │  └─ recomendacao.integration.test.ts
│  ├─ observers/
│  │  ├─ EventoRecomendacao.ts
│  │  ├─ EventosDoFluxo.test.ts
│  │  ├─ IntegradorMicrosservicos.ts
│  │  ├─ ModuloAuditoria.test.ts
│  │  ├─ ModuloAuditoria.ts
│  │  ├─ Observador.ts
│  │  ├─ Publicador.ts
│  │  ├─ ServicoEmail.test.ts
│  │  ├─ ServicoEmail.ts
│  │  ├─ ServicoMensagensInternas.test.ts
│  │  ├─ ServicoMensagensInternas.ts
│  │  ├─ SistemaRecomendacao.fabricas.test.ts
│  │  ├─ SistemaRecomendacao.test.ts
│  │  ├─ SistemaRecomendacao.ts
│  │  └─ TipoEvento.ts
│  ├─ orquestrador/
│  │  ├─ OrquestradorEquipe.test.ts
│  │  ├─ OrquestradorEquipe.ts
│  │  ├─ OrquestradorPadrao.test.ts
│  │  ├─ OrquestradorPadrao.ts
│  │  └─ ProjetoInvalidoError.ts
│  ├─ strategies/
│  │  ├─ FiltragemColaborativa.test.ts
│  │  ├─ FiltragemColaborativa.ts
│  │  ├─ PontuacaoHibrida.test.ts
│  │  ├─ PontuacaoHibrida.ts
│  │  ├─ PontuacaoStrategy.ts
│  │  ├─ RecomendacaoStrategy.ts
│  │  ├─ RecomendadorPorPontuacao.test.ts
│  │  ├─ RecomendadorPorPontuacao.ts
│  │  ├─ RegrasOrcamento.test.ts
│  │  ├─ RegrasOrcamento.ts
│  │  ├─ SimilaridadeCosseno.test.ts
│  │  └─ SimilaridadeCosseno.ts
│  ├─ visitors/
│  │  ├─ CalculadorCompatibilidade.test.ts
│  │  ├─ CalculadorCompatibilidade.ts
│  │  ├─ ElementoVisitavel.ts
│  │  ├─ GeradorRelatorio.test.ts
│  │  ├─ GeradorRelatorio.ts
│  │  ├─ ValidadorConsistencia.test.ts
│  │  ├─ ValidadorConsistencia.ts
│  │  └─ VisitanteProjeto.ts
│  ├─ app.test.ts
│  ├─ app.ts
│  ├─ composicao.ts
│  ├─ seed.ts
│  ├─ server.ts
│  ├─ testar-orquestrador.ts
│  └─ testar-visitors.ts
├─ .env
├─ .env.example
├─ .gitignore
├─ docker-compose.yml
├─ jest.config.js
├─ jest.integration.config.js
├─ package-lock.json
├─ package.json
├─ README.md
└─ tsconfig.json
