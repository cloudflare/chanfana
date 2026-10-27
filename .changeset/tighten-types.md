---
"chanfana": patch
---

Improve typings by replacing most internal `any` usages with precise types or `unknown`, without changing the public API

- Router adapters accept `OpenAPIRouteClass` (any `OpenAPIRoute` subclass, exported together with an `isOpenAPIRouteClass()` helper) in place of `typeof OpenAPIRoute<any>`
- `getRequest()` adapter helpers now return `Request`
- Parameters of `coerceInputs()`, `jsonResp()`, `getD1Binding()`, `Logger` and exception `path` arguments are widened to `unknown`-based types that accept the same inputs as before
- Optional properties of `RequestTypes`, `RouteOptions` and `retryAfter` explicitly allow `undefined`, improving compatibility with `exactOptionalPropertyTypes`
