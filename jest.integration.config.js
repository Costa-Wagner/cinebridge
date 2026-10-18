/** Testes de integracao: exigem o PostgreSQL do docker-compose rodando. */
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.integration.test.ts"],
  testTimeout: 60000,
  collectCoverageFrom: [
    "src/aplicacao/**/*.ts",
    "src/app.ts",
    "src/composicao.ts",
    "src/seed.ts"
  ]
};
