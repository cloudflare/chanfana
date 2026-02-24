---
"chanfana": minor
---

### Hono error handler integration

Chanfana errors (validation errors, API exceptions) now flow through Hono's `onError` handler automatically when using `fromHono()`. Previously, these errors were caught internally and formatted into responses before Hono could see them.

**How it works:**

The Hono adapter converts chanfana errors into Hono `HTTPException` instances with the same JSON response body chanfana normally produces. This means:

- Hono's `onError` handler receives the error for logging, monitoring, or custom formatting
- If no `onError` is configured, Hono's default handler calls `HTTPException.getResponse()` and returns the formatted response as usual — no behavior change for users without `onError`
- Unknown errors (not ZodError or ApiException) propagate as-is without wrapping

**Usage:**

```typescript
import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono();
const openapi = fromHono(app);

app.onError((err, c) => {
  console.error('Caught:', err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: 'Internal Server Error' }, 500);
});
```

**No changes to itty-router behavior.**

**Implementation details:**

- Added `wrapHandler()` hook to `OpenAPIHandler` base class for adapter-specific handler wrapping
- `HonoOpenAPIHandler` overrides `wrapHandler()` to convert errors to `HTTPException` via dynamic import (no runtime cost for itty-router users)
- Extracted `formatChanfanaError()` utility for consistent error formatting across code paths
