---
"chanfana": minor
---

### Breaking Changes

- **Parameter helper functions removed** — `Str()`, `Num()`, `Int()`, `Bool()`, `DateTime()`, `DateOnly()`, `Email()`, `Uuid()`, `Hostname()`, `Ipv4()`, `Ipv6()`, `Ip()`, `Regex()`, `Enumeration()`, and `convertParams()` have been removed. Use native Zod schemas directly (e.g., `Str()` → `z.string()`, `Email()` → `z.email()`, `DateTime()` → `z.iso.datetime()`)
- **Legacy type support removed** — `legacyTypeIntoZod`, `Arr()`, and `Obj()` are no longer exported. `contentJson()` now requires a Zod schema instead of plain objects
- **D1 endpoint error messages sanitized** — Database errors no longer expose internal details. Use the `constraintsMessages` property to map constraint violations to user-friendly errors
- **D1 delete/update restricted to primary key filters** — Only filters matching `primaryKeys` are used in WHERE clauses for security
- **D1 `per_page` capped at 100** — Configurable via `maxPerPage` class property
- **`raiseUnknownParameters` now enforced** — Was previously accepted but not functional; now active

### New Features

- **10 new exception classes** — `UnauthorizedException` (401), `ForbiddenException` (403), `MethodNotAllowedException` (405), `ConflictException` (409), `UnprocessableEntityException` (422), `TooManyRequestsException` (429), `InternalServerErrorException` (500), `BadGatewayException` (502), `ServiceUnavailableException` (503), `GatewayTimeoutException` (504)
- **D1 SQL injection prevention utilities** — New `d1/base.ts` module with `validateSqlIdentifier()`, `validateTableName()`, `validateColumnName()`, `buildSafeFilters()`, `buildPrimaryKeyFilters()`, `getD1Binding()`, `handleDbError()`, and query clause builders. All exported from `chanfana`
- **`Retry-After` HTTP header** — Automatically set on responses for `TooManyRequestsException` and `ServiceUnavailableException` when `retryAfter` is provided
- **`getUnvalidatedData()`** — New method on `OpenAPIRoute` to access raw request data before Zod applies defaults/transformations, useful for partial updates with Zod 4
- **Hono `basePath()` auto-detection** — Chanfana now detects Hono's `basePath()` automatically; passing both `basePath()` and `base` option now throws a descriptive error
- **Hono error flow** — Errors now flow through Hono's `app.onError` as `HTTPException` instances instead of being caught internally

### Bug Fixes

- **D1: Prevent unscoped DELETE/UPDATE** — `buildPrimaryKeyFilters()` throws when no primary key filters match
- **D1: Fix shared exception instances** — `handleDbError()` clones constraint exceptions instead of re-throwing the same object
- **D1: Fix empty update producing invalid SQL** — Returns existing object when no fields to update
- **D1: Read endpoint uses primary key filters** — Consistent with delete/update behavior
- **D1: Delete uses shared `handleDbError`** — Consistent error handling and `constraintsMessages` support
- **D1: Escape LIKE wildcards** — `%` and `_` in search values no longer cause unintended pattern matching
- **D1: Column names validated against model schema** — Only fields defined in the Zod schema are accepted in SQL queries
- **Schema generation errors propagate** — No longer silently swallowed
- **CreateEndpoint response schema** — Fixed reference from status 200 to 201
- **Falsy default values** — `0`, `false`, and `""` are now correctly applied as defaults
- **BigInt coercion** — Uses `BigInt()` directly instead of `parseInt()` to avoid precision loss
- **Boolean coercion null guard** — Prevents errors when coercing null values to boolean
- **HEAD requests** — No longer attempt to parse request body
- **YAML URL generation** — Only replaces trailing `.json` in URL
- **ApiException import** — Changed from `import type` to value import for proper `instanceof` checks
- **ReadEndpoint & ListEndpoint response schema** — Added `InputValidationException` to documented 400 responses
- **Removed dead code** — `handleValidationError()` and `D1EndpointConfig` interface removed

### Improvements

- **D1 parallel queries** — List endpoint runs data and count queries concurrently with `Promise.all()`
- **Configurable `maxPerPage`** — `D1ListEndpoint.maxPerPage` is a class property that can be overridden
- **Normalized ORDER BY direction** — Returns lowercase `"asc"`/`"desc"` for consistency
- **`sanitizeOperationId()`** — Ensures operationIds are valid by removing special characters
- **Router constructor validation** — `OpenAPIHandler` throws if router argument is missing
- **Comprehensive JSDoc** — Added to all exception classes, D1 endpoint methods, and OpenAPI handler methods
- **Error responses include `result: {}`** — Consistent shape with success responses
