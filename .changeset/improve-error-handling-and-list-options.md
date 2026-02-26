---
"chanfana": minor
---

Add `handleError` hook, `defaultOrderByDirection`, fix validation error format and D1 update with extra columns

- Add `handleError(error)` protected method on `OpenAPIRoute` to transform errors before chanfana formats them. Enables custom error wrapping (e.g., bypassing chanfana's formatter to use Hono's `onError`).
- Add `defaultOrderByDirection` property to `ListEndpoint` (defaults to `"asc"`). Allows configuring the default sort direction when `orderByFields` is used.
- Validation errors from `validateRequest()` now return `InputValidationException` format (`{code: 7001, message, path}`) instead of raw Zod issues. This makes the actual response match the OpenAPI schema that chanfana documents.
- `D1UpdateEndpoint.update()` now automatically filters `updatedData` to only include columns defined in the Zod schema. Previously, DB tables with extra columns not in the schema would cause `validateColumnName()` to throw.
