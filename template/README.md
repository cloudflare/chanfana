# Chanfana Template — Task API

A starter Cloudflare Worker using **Chanfana** (OpenAPI), **Hono**, **D1**, and **Zod v4**.

Scaffold a new project with the `create-cloudflare` CLI:

```bash
npm create cloudflare@latest -- --template https://github.com/cloudflare/chanfana/tree/main/template
```

## Setup

```bash
# Install dependencies
npm install

# Create the D1 database
npx wrangler d1 create tasks-db
# Copy the returned database_id into wrangler.jsonc

# Run the migration locally
npm run db:migrate:local
```

## Development

```bash
npm run dev          # Start local dev server (http://localhost:8787)
```

Once running, open:

- **API docs** — http://localhost:8787/api/docs
- **OpenAPI spec** — http://localhost:8787/api/openapi.json

## Testing

Tests use `@cloudflare/vitest-pool-workers` with a local D1 binding (no real database needed):

```bash
npm test
```

## Deployment

```bash
# Apply migration to remote D1
npm run db:migrate:remote

# Deploy to Cloudflare
npm run deploy
```

## Project Structure

```
src/
  index.ts                 # Hono app + route registration
  models/task.ts           # Zod schema + shared meta
  endpoints/
    taskCreate.ts          # POST   /api/tasks
    taskList.ts            # GET    /api/tasks
    taskRead.ts            # GET    /api/tasks/:id
    taskUpdate.ts          # PUT    /api/tasks/:id
    taskDelete.ts          # DELETE /api/tasks/:id
    hello.ts               # GET    /api/hello  (custom non-D1 example)
test/
  tasks.test.ts            # Integration tests
migrations/
  0001_create_tasks/up.sql # D1 schema
```

## Adding a New Model

1. Create a Zod schema and meta object in `src/models/`
2. Create endpoint classes in `src/endpoints/` extending `D1CreateEndpoint`, `D1ReadEndpoint`, etc.
3. Register routes in `src/index.ts`
4. Add a D1 migration in `migrations/`

See the [Chanfana docs](https://chanfana.pages.dev) for the full API reference.
