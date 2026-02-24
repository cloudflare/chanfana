# AGENTS.md — Chanfana Template (Task API)

A starter Cloudflare Worker using Chanfana (OpenAPI), Hono, D1, and Zod v4. This is a copyable template — users clone it and build on top.

## Commands

```bash
npm run dev                # Start local dev server (http://localhost:8787)
npm test                   # Run integration tests via vitest-pool-workers
npm run deploy             # Deploy to Cloudflare
npm run db:migrate:local   # Apply D1 migrations locally
npm run db:migrate:remote  # Apply D1 migrations to production
```

Tests use `@cloudflare/vitest-pool-workers` with a local miniflare D1 binding. Config: `vitest.config.mts`.

## Project Layout

```
src/
  index.ts                 # Hono app, fromHono wrapper, route registration
  models/task.ts           # Zod schema + shared meta (tableName, primaryKeys)
  endpoints/
    taskCreate.ts          # POST   /api/tasks   — D1CreateEndpoint
    taskList.ts            # GET    /api/tasks   — D1ListEndpoint (filter, search, order)
    taskRead.ts            # GET    /api/tasks/:id — D1ReadEndpoint
    taskUpdate.ts          # PUT    /api/tasks/:id — D1UpdateEndpoint
    taskDelete.ts          # DELETE /api/tasks/:id — D1DeleteEndpoint
    hello.ts               # GET    /api/hello   — Custom OpenAPIRoute (non-D1 example)
test/
  tasks.test.ts            # Integration tests for all endpoints
migrations/
  0001_create_tasks/up.sql # D1 CREATE TABLE
wrangler.toml              # Worker config with D1 binding
```

## Code Style

Follow the same conventions as the parent chanfana library:
- 2-space indent, double quotes, always semicolons
- `import type` for type-only imports (`verbatimModuleSyntax: true`)
- Classes: `PascalCase` — endpoint classes named after their action (`TaskCreate`, `TaskList`)
- Named exports everywhere, no default exports (except the Hono app in `index.ts`)

## Zod v4 Rules (Critical)

All code must use Zod v4 syntax:
```typescript
// WRONG (v3)          → CORRECT (v4)
z.string().email()     → z.email()
z.string().uuid()      → z.uuid()
z.string().datetime()  → z.iso.datetime()
z.string().url()       → z.url()
z.nativeEnum(X)        → z.enum([...])
obj.strict()           → z.strictObject({...})
{ message: "..." }     → { error: "..." }
```

## How to Add a New Model

1. **Schema** — Create `src/models/<name>.ts` with a Zod object schema and a meta object:
   ```typescript
   import { z } from "zod";

   export const FooSchema = z.object({
     id: z.number().optional(),
     name: z.string(),
   });

   export const fooMeta = {
     model: {
       tableName: "foos" as const,
       schema: FooSchema,
       primaryKeys: ["id"] as const,
     },
   };
   ```

2. **Endpoints** — Create classes in `src/endpoints/` extending the D1 endpoints:
   ```typescript
   import { D1CreateEndpoint } from "chanfana";
   import { fooMeta } from "../models/foo";

   export class FooCreate extends D1CreateEndpoint {
     _meta = fooMeta;
   }
   ```

3. **Routes** — Register in `src/index.ts`:
   ```typescript
   router.post("/foos", FooCreate);
   ```

4. **Migration** — Add a SQL file in `migrations/0002_create_foos/up.sql`

5. **Tests** — Add tests in `test/` using the same pattern as `tasks.test.ts`

## D1 Endpoint Features

- `D1ListEndpoint` supports `filterFields`, `searchFields`, `orderByFields`, `defaultOrderBy`
- All D1 endpoints read the `DB` binding from `env` automatically (configurable via `dbName` property)
- Path params must match `primaryKeys` names (e.g., `/tasks/:id` with `primaryKeys: ["id"]`)
- Hooks: override `before()` / `after()` to transform data pre/post database operation

## Key Resources

- Chanfana docs: https://chanfana.pages.dev
- Chanfana source: https://github.com/cloudflare/chanfana
- Zod v4: https://zod.dev/v4
- Hono: https://hono.dev
