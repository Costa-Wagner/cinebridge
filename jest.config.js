/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.test\\.ts$"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/config/**",
    "!src/server.ts",
    "!src/seed.ts",
    "!src/testar-orquestrador.ts",
    "!src/testar-visitors.ts",
    "!src/domain/entities/**",
    "!src/integracao/**",
    "!src/composicao.ts"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};