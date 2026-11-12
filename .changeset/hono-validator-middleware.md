---
"chanfana": minor
---

Add `chanfanaValidator()`, an opt-in marker that gives Hono route middleware the endpoint's validated request data (#84).

Place it before the endpoint class in a `fromHono()` route, and middleware after it can read the validated, typed data with `c.req.valid("json" | "query" | "param" | "header")`:

```ts
openapi.post("/users", authMw, chanfanaValidator(), emailCheckMw, CreateUser);
```

The request is validated once, at the marker, against the endpoint's schema, and the endpoint reuses that data. Invalid requests get the same `400` response as before, through the same `handleError()`, `passthroughErrors` and `onError` handling. Routes without the marker are unchanged.

Route registrations on `fromHono()` are now also typed when middleware come before the endpoint class (`openapi.get(path, authMw, Endpoint)`, which previously needed a cast, #273), for up to 5 middleware. `all()` now also registers routes where middleware come before the endpoint class. The new `OpenAPIRouteHonoValidatedInput` type gives the Hono `Input` added by the marker.
