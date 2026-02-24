---
"chanfana": minor
---

### Hono `basePath()` support

Chanfana now properly handles Hono's `basePath()` for route matching, OpenAPI schema generation, and documentation URLs.

**New features:**

- **Auto-detection of Hono's `basePath()`**: When a Hono instance is created with `basePath()` (e.g., `new Hono().basePath("/api")`), Chanfana automatically detects the base path and uses it for schema generation and doc routes. No need to pass `base` separately.
- **`base` option applies `basePath()` for Hono**: Using `fromHono(new Hono(), { base: "/api" })` now calls Hono's `basePath()` internally, so routes actually match at the prefixed path — not just in the OpenAPI schema.
- **`options` exposed via proxy**: The router proxy now exposes the `options` property for runtime access to the configured `RouterOptions`.

**New validations:**

- **Combining `basePath()` and `base` throws an error**: Using both Hono's `basePath()` and chanfana's `base` option (e.g., `fromHono(new Hono().basePath("/api"), { base: "/v1" })`) now throws a descriptive error with migration guidance.
- **Base path format validation**: The `base` option must start with `/` and must not end with `/`. Invalid formats now throw a clear error.

**Bug fixes:**

- Fixed a stale reference in nested route handling where routes were registered on the original Hono instance instead of the based router.

**No changes to itty-router behavior.**
