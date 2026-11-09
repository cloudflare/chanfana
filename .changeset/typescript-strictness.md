---
"chanfana": patch
---

Build with `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature`, and replace several unchecked casts with type guards. `handleDbError()` now accepts `unknown` errors (non-`Error` values are wrapped). No runtime behavior changes for valid inputs; `hono.on(method, path, Endpoint)` now throws the "single method+path" error early when `path` is not a string.
