# cinebridge-notificacoes (porta 3003). Contexto de build: raiz do repositorio.
# Etapa 1: instala tudo e compila o TypeScript.
FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json

# Etapa 2: imagem final, so' com dependencias de producao e o JavaScript compilado.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
USER node
EXPOSE 3003
CMD ["node", "dist/servicos/notificacoes/main.js"]
