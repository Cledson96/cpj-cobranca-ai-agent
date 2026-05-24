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
npm run build:shared
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

O `build:shared` garante que o pacote `@cpj-cobranca/shared` gere `dist/` antes da API e do painel importarem os schemas compartilhados. O `.env` pode ficar na raiz do repo; a API carrega esse arquivo mesmo rodando dentro de `apps/api`.

Os scripts principais tambem executam esse build automaticamente antes de `dev`, `test`, `typecheck`, `build` e `prisma:seed`, evitando falha em um clone limpo.

## Endpoints principais

- `GET /health`
- `POST /api/v1/review`
- `POST /api/v1/compliance`
- `POST /api/v1/document`
- `POST /api/v1/tests`
- `GET /api/v1/history`
- `GET /api/v1/history/:id`

Exemplos prontos ficam em [`requests/cpj-cobranca-agent.http`](requests/cpj-cobranca-agent.http).

## Exemplos de uso da API

As respostas abaixo sao exemplos representativos. Em chamadas reais, o texto pode variar conforme o modelo configurado no OpenRouter, mas o contrato JSON e validado pela API.

### `POST /api/v1/review`

**Request**

```http
POST http://localhost:3000/api/v1/review
Content-Type: application/json
```

```json
{
  "code": "export async function buscarAcordos(db, devedorId) { return db.query(`select * from acordos where devedor_id = ${devedorId}`); }",
  "language": "typescript",
  "context": "Modulo de consulta de acordos da cobranca"
}
```

**Response**

```json
{
  "overall_quality": "regular",
  "score": 45,
  "issues": [
    {
      "severity": "high",
      "line_hint": "linha 1",
      "description": "A query SQL e montada com interpolacao direta de devedorId, abrindo risco de SQL injection.",
      "suggestion": "Use parametros preparados, por exemplo db.query('select * from acordos where devedor_id = ?', [devedorId])."
    },
    {
      "severity": "medium",
      "line_hint": "assinatura da funcao",
      "description": "Nao ha validacao do identificador recebido nem tratamento de erro da consulta.",
      "suggestion": "Valide devedorId na borda e retorne erro controlado quando a consulta falhar."
    }
  ],
  "positives": [
    "Funcao pequena e com objetivo claro.",
    "Uso de async permite integrar corretamente com operacoes de I/O."
  ],
  "summary": "O codigo resolve a consulta, mas precisa corrigir a montagem da SQL e adicionar validacao/tratamento de erro antes de uso em producao."
}
```

### `POST /api/v1/compliance`

**Request**

```http
POST http://localhost:3000/api/v1/compliance
Content-Type: application/json
```

```json
{
  "task_description": "A API deve registrar tentativa de contato, validar devedor_id obrigatorio e gravar data/hora da tentativa.",
  "code": "app.post('/contatos', async (req, res) => { await repo.save(req.body); return res.status(201).send(); })",
  "language": "javascript"
}
```

**Response**

```json
{
  "compliant": false,
  "compliance_score": 40,
  "covered_requirements": [
    "Existe uma rota para registrar contato.",
    "A implementacao persiste o corpo recebido via repositorio."
  ],
  "missing_requirements": [
    "Nao valida devedor_id como obrigatorio.",
    "Nao grava explicitamente data/hora da tentativa."
  ],
  "partial_requirements": [
    "Registra a tentativa, mas aceita qualquer payload sem normalizacao ou validacao."
  ],
  "verdict": "A entrega cobre apenas parte do requisito. E necessario validar devedor_id e adicionar timestamp controlado pelo backend."
}
```

### `POST /api/v1/document`

**Request**

```http
POST http://localhost:3000/api/v1/document
Content-Type: application/json
```

```json
{
  "code": "export function calcularAtraso(dataVencimento: Date, hoje = new Date()) { return Math.max(0, Math.floor((hoje.getTime() - dataVencimento.getTime()) / 86400000)); }",
  "language": "typescript",
  "doc_type": "technical"
}
```

**Response**

```json
{
  "doc_type": "technical",
  "title": "calcularAtraso",
  "description": "Calcula a quantidade inteira de dias de atraso entre a data de vencimento e uma data de referencia, sem retornar valores negativos.",
  "inputs": [
    "dataVencimento: Date - data original de vencimento.",
    "hoje: Date - data de referencia opcional; por padrao usa a data atual."
  ],
  "outputs": [
    "number - total de dias de atraso, limitado ao minimo de zero."
  ],
  "side_effects": [
    "Quando hoje nao e informado, depende do relogio do sistema."
  ],
  "usage_example": "const dias = calcularAtraso(new Date('2026-05-01'), new Date('2026-05-10')); // 9",
  "notes": [
    "A funcao considera dias de 24 horas e nao trata diferencas de fuso horario/calendario comercial."
  ]
}
```

### `POST /api/v1/tests`

**Request**

```http
POST http://localhost:3000/api/v1/tests
Content-Type: application/json
```

```json
{
  "code": "export function calcularJurosSimples(valor, taxa, dias) { if (dias < 0) throw new Error('dias invalido'); return valor + valor * taxa * dias; }",
  "language": "javascript",
  "test_framework": "jest"
}
```

**Response**

```json
{
  "framework": "jest",
  "test_file": "import { calcularJurosSimples } from './calcular-juros-simples';\n\ndescribe('calcularJurosSimples', () => {\n  it('calcula juros para caminho feliz', () => {\n    expect(calcularJurosSimples(100, 0.01, 10)).toBe(110);\n  });\n\n  it('retorna o valor original quando dias e zero', () => {\n    expect(calcularJurosSimples(100, 0.01, 0)).toBe(100);\n  });\n\n  it('lanca erro para dias negativos', () => {\n    expect(() => calcularJurosSimples(100, 0.01, -1)).toThrow('dias invalido');\n  });\n});\n",
  "test_cases": [
    {
      "name": "calcula juros para caminho feliz",
      "type": "happy_path",
      "description": "Valida o calculo com valor, taxa e dias positivos."
    },
    {
      "name": "retorna valor original quando dias e zero",
      "type": "edge_case",
      "description": "Garante que nao ha acrescimo quando nao existe atraso."
    },
    {
      "name": "lanca erro para dias negativos",
      "type": "error_case",
      "description": "Cobre a regra de rejeicao para entrada invalida."
    }
  ],
  "coverage_hints": [
    "Adicionar caso com taxa zero.",
    "Validar comportamento para valores decimais."
  ]
}
```

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

A API usa OpenRouter por padrao. As rotas de IA exigem `OPENROUTER_API_KEY`; sem essa chave, apenas health, historico e admin continuam disponiveis. O modelo inicial fica em `OPENROUTER_MODEL` e tambem pode ser alterado por fluxo no painel admin.

O custo real depende do modelo escolhido e do tamanho do codigo enviado. Para os exemplos pequenos deste README, usando um modelo economico configurado no OpenRouter, o custo esperado tende a ficar em centavos de dolar ou menos por chamada. Quando o provedor retorna telemetria de preco, a API grava `promptTokens`, `completionTokens`, `totalTokens` e `costUsd` na execucao.

## Testes

```bash
npm test
npm run typecheck
npm run build
npm run lint
npm run test:e2e
```

Os testes automatizados mockam o OpenRouter para nao gastar credito. O `lint` executa checagem estatica via TypeScript nos workspaces. Chamadas reais acontecem pelos exemplos `.http` depois de configurar `OPENROUTER_API_KEY`.

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

## O que faria com mais tempo

- Adicionar suporte opcional a Ollama/local para rodar sem chave de provedor pago.
- Implementar retry com backoff exponencial para erros transientes do provedor de IA.
- Usar `requestHash` para cache controlado por input e reduzir custo em chamadas repetidas.
- Criar endpoint batch para avaliar varios artefatos na mesma requisicao.
- Adicionar streaming ou webhook para execucoes mais longas.
- Evoluir autenticacao admin para login com usuarios, RBAC e auditoria.

## Referencias

- Fastify: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- Next.js: https://nextjs.org/docs
- LangGraph JS: https://docs.langchain.com/oss/javascript/langgraph/overview
- LangChain structured output: https://docs.langchain.com/oss/javascript/langchain/structured-output
- OpenRouter API: https://openrouter.ai/docs/api/reference/overview
