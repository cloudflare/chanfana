---
"chanfana": minor
---

Add `validateResponse` router option to validate and sanitize response bodies against their Zod schemas at runtime.

When enabled, responses are parsed through `z.object().parseAsync()`, which strips unknown fields and validates required fields/types. This prevents accidental data leaks (e.g., internal fields like `passwordHash` reaching the client) and catches handler bugs where the response doesn't match the declared schema.

```typescript
const router = fromHono(app, { validateResponse: true });
```

**Behavior:**
- Plain object responses are validated against the `200` response schema
- `Response` objects with `application/json` content are cloned, validated, and reconstructed with corrected headers
- Non-JSON responses and responses without a matching Zod schema are passed through unchanged
- Validation failures return `500 Internal Server Error` (code `7013`) and log the full error via `console.error`

**New exports:**
- `ResponseValidationException` — thrown when a handler's response doesn't match its declared schema (status 500, code 7013, `isVisible: false`)
