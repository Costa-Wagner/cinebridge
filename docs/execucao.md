# 🚀 Guia de Execução — CineBridge

Guia detalhado, passo a passo, para rodar o projeto do zero — sem assumir conhecimento prévio do ambiente. Para uma visão geral do projeto, veja o [README](../README.md).

---

## Pré-requisitos

Antes de começar, instale:

- **[Node.js LTS](https://nodejs.org/)** — baixe o instalador e siga o padrão (marcar "Add to PATH" se perguntado)
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — necessário estar **aberto e rodando** (ícone da baleia 🐳 na bandeja do sistema, sem animação de carregamento) sempre que for usar o banco de dados
- **Git** — geralmente já vem com o [Git for Windows](https://git-scm.com/downloads/win), que também instala o Git Bash

---

## Windows — passo a passo

### 1. Abrir um terminal

Abra o **PowerShell**: menu Iniciar → digite "PowerShell" → Enter. Todos os comandos abaixo rodam nele.

### 2. Clonar o repositório

```powershell
git clone https://github.com/SEU_USUARIO/cinebridge-atv1.git
cd cinebridge-atv1
```

### 3. Instalar as dependências

```powershell
npm install
```
Pode levar 1–2 minutos na primeira vez. Avisos (`npm warn`) são normais e podem ser ignorados; erros (`npm error`) não.

### 4. Configurar variáveis de ambiente

```powershell
cp .env.example .env
```
Não precisa editar nada — os valores padrão já funcionam com o `docker-compose.yml`.

### 5. Subir o banco de dados

**Confirme que o Docker Desktop está aberto** (ícone da baleia visível e estável na bandeja) antes de rodar:

```powershell
docker compose up -d
```

Confirme que subiu corretamente:
```powershell
docker ps
```
Deve aparecer uma linha com `cinebridge-postgres` e a porta `0.0.0.0:5432->5432/tcp`. Se aparecer uma porta diferente de `5432` (tipo `51234`), o `.env` não foi criado corretamente — repita o passo 4.

### 6. Popular o banco com dados de exemplo

```powershell
npm run seed
```
Deve terminar com a mensagem `Seed concluido: 1 projeto, 6 profissionais, competencias e avaliacoes.`

### 7. Rodar o servidor

```powershell
npm run dev
```

**Este comando não termina sozinho** — ele fica rodando, esperando requisições (é assim que um servidor funciona). O terminal vai mostrar algo como:
```
Server listening at http://0.0.0.0:3000
```
Deixe essa janela aberta e rodando. Não feche.

### 8. Testar em um **segundo** terminal

Para enviar requisições ao servidor que você acabou de deixar rodando, é necessário **abrir uma segunda janela do PowerShell** (menu Iniciar → PowerShell de novo — não feche a primeira). Nessa nova janela:

```powershell
curl http://localhost:3000/health
```
Deve retornar `{"status":"ok"}`.

Para testar a rota de recomendação, primeiro descubra o UUID do projeto criado pelo seed:
```powershell
docker exec -it cinebridge-postgres psql -U postgres -d cinebridge -c "SELECT id FROM projetos;"
```
Copie o UUID retornado e use:
```powershell
curl -X POST http://localhost:3000/projetos/COLE-O-UUID-AQUI/recomendar
```

> Para ver a resposta JSON formatada (mais legível), recomenda-se usar [Thunder Client](https://www.thunderclient.com/) (extensão do VS Code) ou [Insomnia](https://insomnia.rest/) em vez do `curl` puro. Ao montar a requisição `POST` nessas ferramentas, deixe o corpo (*Body*) como **"No Body"**; se essa opção não existir, use `{}` — enviar corpo vazio com `Content-Type: application/json` causa erro `415`.

### 9. Rodar os testes automatizados

Em qualquer um dos dois terminais (não precisa do servidor rodando pra isso):
```powershell
npm test
```
Ou, com relatório de cobertura:
```powershell
npm run test:coverage
```

---

## Ubuntu 24.04 (nativo ou via WSL2 no Windows)

Se você está num Ubuntu de verdade (não Windows), pule direto para o passo 2 abaixo — o WSL já vem pronto.

### 1. Preparar o WSL2 (só se estiver testando a partir do Windows)

No **PowerShell do Windows**, verifique se já tem uma distro Ubuntu instalada:
```powershell
wsl -l -v
```
Se não aparecer nenhuma `Ubuntu`, instale com:
```powershell
wsl --install -d Ubuntu-24.04
```
Depois, abra o Ubuntu:
```powershell
wsl -d Ubuntu-24.04
```
(todos os comandos a partir daqui rodam **dentro** dessa janela do Ubuntu — o prompt muda para algo como `usuario@maquina:~$`)

**Ative a integração do Docker com o WSL**: abra o Docker Desktop no Windows → **Settings** → **Resources** → **WSL Integration** → ative o toggle da distro `Ubuntu-24.04` → **Apply & Restart**. Sem isso, o comando `docker` não vai ser encontrado dentro do Ubuntu.

### 2. Instalar o Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```
Confirme:
```bash
node --version
npm --version
```

### 3. Clonar e instalar

Se estiver usando WSL2 sobre Windows, clone dentro do próprio sistema de arquivos do Linux (não em `/mnt/c/` ou `/mnt/d/`) — é bem mais rápido e evita problemas de permissão:
```bash
cd ~
git clone https://github.com/SEU_USUARIO/cinebridge-atv1.git
cd cinebridge-atv1
npm install
```

### 4. Repetir os passos 4 a 9 da seção Windows

A partir daqui, os comandos são idênticos aos do Windows (`cp .env.example .env`, `docker compose up -d`, `npm run seed`, `npm run dev`, `npm test`), só que digitados no terminal Ubuntu em vez do PowerShell. Para testar a rota com um segundo terminal, abra uma nova janela do PowerShell e rode `wsl -d Ubuntu-24.04` de novo (não feche a primeira, onde o `npm run dev` está rodando).

---

## Solução de problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `docker: command not found` (dentro do Ubuntu/WSL) | Integração WSL do Docker Desktop desativada | Docker Desktop → Settings → Resources → WSL Integration → ativa o toggle da distro |
| `docker ps` mostra uma porta aleatória em vez de `5432` | Arquivo `.env` não existe ou não foi lido pelo Docker Compose | `cp .env.example .env`, depois `docker compose down && docker compose up -d` |
| Erro `415 Unsupported Media Type` no Insomnia/Thunder Client | Corpo da requisição em branco com `Content-Type: application/json` presente | Trocar o Body para "No Body", ou digitar `{}` se essa opção não existir |
| `curl: Failed to connect... Couldn't connect to server` | O `npm run dev` não está rodando, ou está rodando num terminal/sistema diferente do que você está testando (ex: rodou no Git Bash e testou no WSL) | Confirmar que o servidor está ativo no mesmo ambiente (Windows ou WSL) de onde você está testando |
| `relation "projeto" does not exist` no `psql` | Nome da tabela tem case ou pluralização diferente do esperado | Rodar `\dt` no `psql` pra ver o nome real da tabela (é `projetos`, minúsculo e plural) |