---
"chanfana": patch
---

Coerce each item of array query, path and header parameters with the array element type, so schemas like `z.number().array()` or `z.array(z.boolean())` accept `?ids=1&ids=2` instead of failing with "expected number, received string". Array elements declared with `z.coerce.*` or `.catch()` now get the same pre-coercion as scalar parameters, for example `z.array(z.coerce.boolean())` reads `false` as `false`, and `z.coerce.number().array()` rejects hex, binary and blank items like scalar `z.coerce.number()` already does.
