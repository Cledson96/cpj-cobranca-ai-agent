# CPJ Cobranca AI Agent

Backend Fastify para o case CPJ-Cobranca com agente IA via OpenRouter, orquestracao LangGraph, prompts versionados em banco e painel administrativo em Next.js.

## O que entrega

- API obrigatoria em `http://localhost:3000`.
- Admin Next.js em `http://localhost:3001/admin`.
- Prompts editaveis e versionados no SQLite.
- Configuracao por fluxo de modelo principal, fallbacks, temperatura, max tokens e modo de resposta.
- Historico de execucoes com prompt usado, modelo, tokens, custo, latencia e erro.
- Dashboard de uso e custos quando o OpenRouter retorna telemetria.

## Subir com Docker

```bash
cp .env.example .env
# edite OPENROUTER_API_KEY no .env
docker compose up --build
```

URLs:

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Admin: `http://localhost:3001/admin`
- Token admin padrao: `change-me-local-admin-token`

Sem `OPENROUTER_API_KEY`, o health, historico e admin sobem, mas as rotas IA retornam erro claro de configuracao do provedor.

## Rodar local

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

O `.env` pode ficar na raiz do repo; a API carrega esse arquivo mesmo rodando dentro de `apps/api`.

## Endpoints principais

- `GET /health`
- `POST /api/v1/review`
- `POST /api/v1/compliance`
- `POST /api/v1/document`
- `POST /api/v1/tests`
- `GET /api/v1/history`
- `GET /api/v1/history/:id`

Exemplos prontos ficam em [`requests/cpj-cobranca-agent.http`](requests/cpj-cobranca-agent.http).

## Admin API

Todos os endpoints admin usam header:

```http
x-admin-token: <ADMIN_TOKEN>
```

Rotas principais:

- `GET /api/admin/prompt-templates`
- `POST /api/admin/prompt-templates`
- `POST /api/admin/prompt-templates/:id/activate`
- `GET /api/admin/flow-settings`
- `PUT /api/admin/flow-settings/:flowType`
- `POST /api/admin/models/sync`
- `GET /api/admin/models`
- `GET /api/admin/usage/summary`
- `GET /api/admin/executions`
- `GET /api/admin/executions/:id`

## Decisoes tecnicas

Fastify ficou como backend principal porque o case e orientado a contrato JSON, validacao e respostas previsiveis. Next.js foi usado apenas no painel operacional, sem substituir a API obrigatoria.

OpenRouter centraliza o acesso a varios modelos. A cada execucao o sistema salva modelo solicitado, modelo usado, tokens, custo quando disponivel, id da geracao e fallback configurado.

LangGraph organiza o fluxo do agente: carregar prompt e settings, chamar modelo, validar JSON com Zod, tentar reparo uma vez, persistir execucao e devolver a resposta tipada.

Prisma com SQLite reduz friccao para avaliacao local e Docker. Em producao, a troca natural seria PostgreSQL para concorrencia, backups e operacao multiusuario.

## Prompts e custos

Os templates ficam no banco em `PromptTemplate`. Criar uma nova versao nao altera historico: cada `Execution` guarda `promptTemplateId` e `promptTemplateVersion`.

O painel `/admin/prompts` permite criar e ativar versoes. O painel `/admin/models` permite sincronizar catalogo OpenRouter e configurar modelos por fluxo. O dashboard mostra requests, sucesso/falha, tokens e custo agregado.

## Testes

```bash
npm test
npm run typecheck
npm run build
npm run lint
npm run test:e2e
```

Os testes automatizados mockam o OpenRouter para nao gastar credito. Chamadas reais acontecem pelos exemplos `.http` depois de configurar `OPENROUTER_API_KEY`.

## Estrutura

```text
apps/api       Fastify, Prisma, LangGraph, OpenRouter
apps/web       Next.js App Router para o admin
packages/shared Zod schemas e tipos compartilhados
requests       Exemplos HTTP para avaliacao
```

## Branches e commits

- `main`: base estavel e planejamento.
- `development`: implementacao.
- Commits curtos em portugues, usando prefixos como `feature:`, `bug:`, `docs:`, `test:` e `chore:`.

## Trade-offs

- Autenticacao admin usa `ADMIN_TOKEN` simples para manter o case direto; em producao entraria login, RBAC e auditoria de usuario.
- SQLite favorece setup rapido; PostgreSQL seria melhor para carga e concorrencia.
- O reparo de JSON tenta uma vez para limitar custo e latencia.
- O dashboard mostra custo `nao informado` quando o provedor nao devolve preco.

## Referencias

- Fastify: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- Next.js: https://nextjs.org/docs
- LangGraph JS: https://docs.langchain.com/oss/javascript/langgraph/overview
- LangChain structured output: https://docs.langchain.com/oss/javascript/langchain/structured-output
- OpenRouter API: https://openrouter.ai/docs/api/reference/overview
