# AGENTS.md — Chanfana

Chanfana is an OpenAPI 3/3.1 schema generator and request validator for Hono and itty-router on Cloudflare Workers. It uses Zod v4 for schemas and provides auto CRUD endpoints with D1 support.

## Commands

```bash
npm test                              # Run all tests (tsc + vitest)
npm test -- coverage-gaps.test.ts     # Run a single test file by name
npm test -- --coverage                # Run with Istanbul coverage report
npm run build                         # Build CJS + ESM to dist/
npm run lint                          # Lint via Biome (auto-fixes on failure)
```

Tests run inside `@cloudflare/vitest-pool-workers` with a real D1 binding. Config: `tests/vitest.config.mts`.

## Project Layout

```
src/
  adapters/        # Router adapters: hono.ts, ittyRouter.ts
  endpoints/       # Auto CRUD: create, read, update, delete, list
    d1/            # D1-specific implementations + SQL utilities (base.ts)
  zod/             # OpenAPI registry merger
  openapi.ts       # Core handler: route registration, schema generation, doc UI
  route.ts         # Base OpenAPIRoute class (validation, lifecycle, error handling)
  parameters.ts    # Query/path param coercion (string → number/boolean/BigInt/Date)
  exceptions.ts    # ApiException hierarchy (12 exception classes, codes 7000–7012)
  types.ts         # Shared TypeScript types
  index.ts         # Barrel re-exports (export * from every module)
tests/integration/ # All tests (no unit test directory)
docs/              # VitePress documentation
skills/            # AI coding skills (write-endpoints)
```

## Code Style

**Formatter/Linter**: Biome (`biome.json`). Key settings:
- 2-space indent, 120 char line width, double quotes, always semicolons, trailing commas on multiline
- `noExplicitAny` is OFF — `any` is used deliberately throughout

**TypeScript** (`tsconfig.json`): `strict: true`, `verbatimModuleSyntax: true` (requires `import type` for type-only imports), target ES2022, bundler module resolution.

**Imports**: Biome auto-organizes. External packages first (alphabetical), then relative imports. No blank lines between groups. Use `import type` for type-only:
```typescript
import { z } from "zod";
import type { AnyZodObject, RouteParameter } from "./types";
// or mixed:
import { MetaGenerator, type MetaInput, type O } from "./types";
```

**Naming**:
- Classes: `PascalCase` — suffixed `Endpoint` or `Exception` (`CreateEndpoint`, `NotFoundException`)
- Functions/methods/variables: `camelCase` (`getValidatedData`, `coerceInputs`)
- Module-level constants: `SCREAMING_SNAKE_CASE` (`HIJACKED_METHODS`)
- User-facing config keys: `snake_case` (`docs_url`, `openapi_url`, `default_message`)
- Booleans: `is`/`has` prefix (`isVisible`, `isRoute`, `includesPath`)
- Unused params: `_` prefix (`_args`, `_e`, `_oldObj`)

**Types**: Return types are generally inferred. Parameters are always explicitly typed. Class properties always have explicit types or initializers. `@ts-expect-error` is used when needed (e.g., `_meta` in endpoint subclasses).

**Error handling**: Exception class hierarchy rooted at `ApiException extends Error`. Each has `buildResponse()` and `static schema()`. Pattern in `execute()`:
```typescript
try {
  resp = await this.handle(...args);
} catch (e) {
  if (this.params?.raiseOnError) throw e;
  const errorResponse = formatChanfanaError(e);
  if (errorResponse) return errorResponse;
  throw e; // unknown error: re-throw
}
```

**Async**: Always `async/await`, never `.then()` chains. Use `for...of` for iteration, never `for...in`.

**Exports**: All named, no default exports. Barrel file `src/index.ts` uses `export *`.

## Zod v4 Rules (Critical)

All code must use Zod v4 syntax. Common mistakes:
```typescript
// WRONG (v3)          → CORRECT (v4)
z.string().email()     → z.email()
z.string().uuid()      → z.uuid()
z.string().datetime()  → z.iso.datetime()
z.string().date()      → z.iso.date()
z.string().url()       → z.url()
z.nativeEnum(X)        → z.enum([...])
obj.strict()           → z.strictObject({...})
{ message: "..." }     → { error: "..." }
z.ZodTypeAny           → z.ZodType
```

## Testing Patterns

Tests live in `tests/integration/`. Framework: Vitest with `describe`/`it` (not `test`).

**Two request-building approaches**:
1. `buildRequest({ method, path })` — plain object for itty-router (add `json: () => ({...})` for body)
2. `new Request(url, { method, body, headers })` — for Hono or when body/headers needed

**Test endpoint classes** are defined inline at the top of test files, before `describe` blocks. Named descriptively with `Endpoint` suffix (`FalsyDefaultsEndpoint`, `ThrowNotFoundEndpoint`).

**D1 tests** use `import { env } from "cloudflare:test"` and pass `env` as second arg to `router.fetch()`. Setup with raw SQL in `beforeEach`.

**Standard assertions**:
```typescript
expect(request.status).toBe(200);
expect(resp.success).toBe(true);
expect(resp.result).toEqual({ ... });
expect(resp.errors[0].code).toBe(7001);
```

## Architecture Quick Reference

**OpenAPIRoute lifecycle**: `execute()` → reset caches → `handle()` → catch errors → auto-JSON-wrap response

**Auto endpoints** (`CreateEndpoint`, `ReadEndpoint`, etc.) require a `_meta` property with `model.schema` (Zod), `model.primaryKeys`, and `model.tableName` (for D1). Support `before()`/`after()` hooks.

**Router adapters** (`fromHono`, `fromIttyRouter`) return a Proxy that intercepts route registration to capture OpenAPI metadata, then delegates to the underlying router.

**D1 endpoints** extend the base CRUD classes with SQL generation. Use parameterized queries exclusively. `d1/base.ts` provides `validateSqlIdentifier()`, `buildSafeFilters()`, `buildPrimaryKeyFilters()`, `handleDbError()`.

## Changesets

This project uses `@changesets/cli`. Add a changeset for user-facing changes:
```bash
npx changeset        # Interactive prompt
```
For internal-only changes (tests, CI), use an empty changeset (frontmatter only, no package entry).

## Key Resources

- Docs: https://chanfana.pages.dev
- Source: https://github.com/cloudflare/chanfana
- Detailed coding skill: `skills/write-endpoints/SKILL.md`
- Zod v4: https://zod.dev/v4
