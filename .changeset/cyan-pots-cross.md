---
"chanfana": patch
---

### Bug Fixes

- **D1: Prevent unscoped DELETE/UPDATE** — `buildPrimaryKeyFilters()` now throws when no primary key filters match, preventing catastrophic queries that would affect all rows
- **D1: Fix shared exception instances** — `handleDbError()` now clones constraint exception instances instead of re-throwing the same object, preventing shared mutable state across concurrent requests
- **D1: Fix empty update producing invalid SQL** — `D1UpdateEndpoint` returns the existing object unchanged when no fields to update, instead of generating invalid `UPDATE table SET WHERE ...`
- **D1: Consistent primary key filtering** — `D1ReadEndpoint` now uses `buildPrimaryKeyFilters` (matching delete/update behavior) instead of allowing arbitrary filter fields
- **D1: Consistent error handling** — `D1DeleteEndpoint` now uses the shared `handleDbError()` utility and supports `constraintsMessages`
- **D1: Escape LIKE wildcards** — `%` and `_` characters in search values are now escaped to prevent unintended pattern matching
- **Retry-After header** — `TooManyRequestsException` (429) and `ServiceUnavailableException` (503) now set the `Retry-After` HTTP response header when `retryAfter` is provided
- **Schema generation errors propagate** — `getGeneratedSchema()` no longer silently swallows errors; configuration mistakes are now visible during development
- **Remove dead code** — Removed unused `handleValidationError()` method from `OpenAPIRoute` and unused `D1EndpointConfig` interface
- **Allow primitive returns from handle()** — Returning strings or numbers from `handle()` no longer throws; values pass through to the underlying router

### Improvements

- **Configurable `maxPerPage`** — `D1ListEndpoint.maxPerPage` is now a class property (default: 100) that can be overridden
- **Normalized ORDER BY direction** — `validateOrderDirection()` now returns lowercase `"asc"`/`"desc"` for consistency with the schema default

### Documentation

- Document `contentJson()` now requires Zod schemas (breaking change in migration guide)
- Document `raiseUnknownParameters` is now enforced
- Add "Migrating to Chanfana 3.1" section covering D1 security changes and new exception types
- Fix stale `Str()` helper references in examples and docs
- Fix deep import paths in D1 docs to use top-level `from 'chanfana'`
- Document `Retry-After` header behavior for 429/503 exceptions
