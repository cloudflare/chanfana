---
"chanfana": minor
---

Add `handleError` hook, `defaultOrderByDirection`, fix validation error format and D1 update with extra columns

- Add `handleError(error)` protected method on `OpenAPIRoute` to transform errors before chanfana formats them. Enables custom error wrapping (e.g., bypassing chanfana's formatter to use Hono's `onError`).
- Add `defaultOrderByDirection` property to `ListEndpoint` (defaults to `"asc"`). Allows configuring the default sort direction when `orderByFields` is used.
- **Breaking:** Validation errors from `validateRequest()` now return `InputValidationException` format instead of raw Zod issues. This makes the actual response match the OpenAPI schema that chanfana documents. If you parse validation error responses, update your code to use the new shape:

  **Before:**
  ```json
  {
    "errors": [{
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "message": "Invalid input: expected string, received number",
      "path": ["body", "name"]
    }],
    "success": false,
    "result": {}
  }
  ```

  **After:**
  ```json
  {
    "errors": [{
      "code": 7001,
      "message": "Invalid input: expected string, received number",
      "path": ["body", "name"]
    }],
    "success": false,
    "result": {}
  }
  ```

  Key differences: `code` is now the numeric `7001` (was a string like `"invalid_type"`), and Zod-specific fields (`expected`, `received`) are no longer included.
- `D1UpdateEndpoint.update()` now automatically filters `updatedData` to only include columns defined in the Zod schema. Previously, DB tables with extra columns not in the schema would cause `validateColumnName()` to throw.
