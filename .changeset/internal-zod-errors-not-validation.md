---
"chanfana": minor
---

Stop treating `ZodError`s thrown from `handle()` as request validation errors (#166).

Previously, any `z.ZodError` thrown inside `handle()` (for example from parsing a database row or an upstream response with Zod) was turned into a `400` response with code `7001`, exposing internal schema details as if the client had sent an invalid request. Now only request validation (`getValidatedData()` / `validateRequest()`) produces `400` / `7001` responses. Any other `ZodError` is treated like an unknown error: chanfana re-throws it to the router (itty-router's `catch`, or Hono's `onError` as a raw `ZodError` instead of an `HTTPException`), which typically returns a `500`. The exported `formatChanfanaError()` helper now returns `null` for a raw `ZodError`. Request validation responses are unchanged.

To keep the old behavior for a route, convert the error yourself, either where you parse or in the `handleError()` hook:

```ts
import { InputValidationException, MultiException } from "chanfana";

protected handleError(error: unknown): unknown {
  if (error instanceof z.ZodError) {
    return new MultiException(
      error.issues.map((issue) => new InputValidationException(issue.message, issue.path.map(String))),
    );
  }
  return error;
}
```
