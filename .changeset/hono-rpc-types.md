---
"chanfana": minor
---

Preserve Hono RPC route types in `fromHono()`. Routes chained on the Hono router now infer their `hc` client input (`param`, `query`, `header`, `json`) and per-status JSON output (typed as serialized JSON, like `c.json()`) from the endpoint's `schema`, so `hc<typeof routes>` from `hono/client` is fully typed. Nested routers mounted with `.route()` also keep their route types. Type-only change, no runtime behavior changes.
