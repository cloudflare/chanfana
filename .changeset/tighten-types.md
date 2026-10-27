---
"chanfana": patch
---

Improve internal and public typings by replacing most `any` usages with precise types or `unknown`

- Router adapters now accept `OpenAPIRouteClass` (any `OpenAPIRoute` subclass) instead of `typeof OpenAPIRoute<any>`, and their `getRequest()`/`getUrlParams()`/`getBindings()` helpers return `Request`/`Record<string, unknown>`
- `OpenAPIRoute.execute()` is now typed as `Promise<Response>`, `RouteOptions.router` is typed as `OpenAPIHandler`
- `coerceInputs()`, `jsonResp()`, `getD1Binding()`, `Logger` and the exception `path` arguments use `unknown`-based types that accept the same inputs as before
- Optional properties of `RequestTypes`, `RouteOptions` and `retryAfter` explicitly allow `undefined`, improving compatibility with `exactOptionalPropertyTypes`
