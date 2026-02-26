---
"chanfana": patch
---

Add `passthroughErrors` option to bypass chanfana's error handling and let errors propagate raw to the framework's error handler

```typescript
import { Hono } from "hono";
import { fromHono, ApiException } from "chanfana";
import { ZodError } from "zod";

const app = new Hono();

app.onError((err, c) => {
  // Errors arrive as raw exceptions — no HTTPException wrapping
  if (err instanceof ApiException) {
    return c.json({ ok: false, code: err.code, message: err.message }, err.status as any);
  }
  if (err instanceof ZodError) {
    return c.json({ ok: false, validationErrors: err.issues }, 400);
  }
  return c.json({ ok: false, message: "Internal Server Error" }, 500);
});

const openapi = fromHono(app, { passthroughErrors: true });
```
