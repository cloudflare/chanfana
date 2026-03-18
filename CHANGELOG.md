# chanfana

## 3.3.0

### Minor Changes

- [#316](https://github.com/cloudflare/chanfana/pull/316) [`d30cc36`](https://github.com/cloudflare/chanfana/commit/d30cc3662db1b6152f01e1b296cde294cc67939c) Thanks [@G4brym](https://github.com/G4brym)! - Add customizable pagination and ordering parameter names to ListEndpoint via `pageFieldName`, `perPageFieldName`, `orderByFieldName`, and `orderByDirectionFieldName` class properties.

  **Breaking change for subclasses overriding `optionFields`:** `optionFields` is now a computed getter derived from the four `*FieldName` properties. Subclasses that previously overrode `optionFields` directly should instead override the individual field name properties.

- [#317](https://github.com/cloudflare/chanfana/pull/317) [`39c89d2`](https://github.com/cloudflare/chanfana/commit/39c89d29e7ff28f5c9ce8c3b76540450d7461818) Thanks [@G4brym](https://github.com/G4brym)! - Add `validateResponse` router option to validate and sanitize response bodies against their Zod schemas at runtime.

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

- [#315](https://github.com/cloudflare/chanfana/pull/315) [`47d304a`](https://github.com/cloudflare/chanfana/commit/47d304a3ff48740344aaf1f50979fb7c9ab111ca) Thanks [@G4brym](https://github.com/G4brym)! - Add `SerializerContext` parameter to auto endpoint serializer function, providing access to filters and options for context-aware serialization.

  The serializer signature changes from `(obj: object) => object` to `(obj: object, context?: SerializerContext) => object`. The `SerializerContext` type contains:

  - `filters` — `Array<FilterCondition>`: the active filter conditions for the current request
  - `options` — pagination and ordering options (`page`, `per_page`, `order_by`, `order_by_direction`)

  **Context passed per endpoint type:**

  | Endpoint                            | Context                |
  | ----------------------------------- | ---------------------- |
  | `ListEndpoint` / `ReadEndpoint`     | `{ filters, options }` |
  | `UpdateEndpoint` / `DeleteEndpoint` | `{ filters }`          |
  | `CreateEndpoint`                    | `{ filters: [] }`      |

  ```typescript
  const meta = {
    model: {
      schema: UserSchema,
      primaryKeys: ["id"],
      tableName: "users",
      serializer: (obj: any, context?: SerializerContext) => {
        const hasRoleFilter = context?.filters?.some((f) => f.field === "role");
        // Conditionally include fields based on active filters
        return hasRoleFilter ? obj : omit(obj, ["role"]);
      },
    },
  };
  ```

  **New exports:**

  - `SerializerContext` — type for the serializer's second parameter

### Patch Changes

- [#335](https://github.com/cloudflare/chanfana/pull/335) [`028c256`](https://github.com/cloudflare/chanfana/commit/028c2562e6ab0531dd2648a556042445398896da) Thanks [@andrewheberle](https://github.com/andrewheberle)! - Fix: Error from Zod transform is returning 500 instead of 400

- [#328](https://github.com/cloudflare/chanfana/pull/328) [`662ff72`](https://github.com/cloudflare/chanfana/commit/662ff7259819b1ba1038219a4331c69322989c8c) Thanks [@G4brym](https://github.com/G4brym)! - Include CHANGELOG.md in the npm package so AI agents and tools can read the project's change history. Also add a changelog page to the documentation site.

## 3.2.1

### Patch Changes

- [#325](https://github.com/cloudflare/chanfana/pull/325) [`c182e59`](https://github.com/cloudflare/chanfana/commit/c182e594258b306da2a03fdd076f73b1ee0326be) Thanks [@G4brym](https://github.com/G4brym)! - Export `OrderByDirection` type alias (`"asc" | "desc"`) so consumers can import it directly instead of inlining literal unions

- [#325](https://github.com/cloudflare/chanfana/pull/325) [`c182e59`](https://github.com/cloudflare/chanfana/commit/c182e594258b306da2a03fdd076f73b1ee0326be) Thanks [@G4brym](https://github.com/G4brym)! - Add `passthroughErrors` option to bypass chanfana's error handling and let errors propagate raw to the framework's error handler

  ```typescript
  import { Hono } from "hono";
  import { fromHono, ApiException } from "chanfana";
  import { ZodError } from "zod";

  const app = new Hono();

  app.onError((err, c) => {
    // Errors arrive as raw exceptions — no HTTPException wrapping
    if (err instanceof ApiException) {
      return c.json(
        { ok: false, code: err.code, message: err.message },
        err.status as any
      );
    }
    if (err instanceof ZodError) {
      return c.json({ ok: false, validationErrors: err.issues }, 400);
    }
    return c.json({ ok: false, message: "Internal Server Error" }, 500);
  });

  const openapi = fromHono(app, { passthroughErrors: true });
  ```

## 3.2.0

### Minor Changes

- [#314](https://github.com/cloudflare/chanfana/pull/314) [`2408999`](https://github.com/cloudflare/chanfana/commit/24089994dab32ee4a94162f64ff030dc65684ca1) Thanks [@G4brym](https://github.com/G4brym)! - Add `tags` support to auto endpoint `_meta` for OpenAPI tag grouping

- [#323](https://github.com/cloudflare/chanfana/pull/323) [`d9b7297`](https://github.com/cloudflare/chanfana/commit/d9b7297632f8fc552f18225aab0e61272cde94d7) Thanks [@G4brym](https://github.com/G4brym)! - Add `handleError` hook, `defaultOrderByDirection`, fix validation error format and D1 update with extra columns

  - Add `handleError(error)` protected method on `OpenAPIRoute` to transform errors before chanfana formats them. Enables custom error wrapping (e.g., bypassing chanfana's formatter to use Hono's `onError`).
  - Add `defaultOrderByDirection` property to `ListEndpoint` (defaults to `"asc"`). Allows configuring the default sort direction when `orderByFields` is used.
  - **Breaking:** Validation errors from `validateRequest()` now return `InputValidationException` format instead of raw Zod issues. This makes the actual response match the OpenAPI schema that chanfana documents. If you parse validation error responses, update your code to use the new shape:

    **Before:**

    ```json
    {
      "errors": [
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "number",
          "message": "Invalid input: expected string, received number",
          "path": ["body", "name"]
        }
      ],
      "success": false,
      "result": {}
    }
    ```

    **After:**

    ```json
    {
      "errors": [
        {
          "code": 7001,
          "message": "Invalid input: expected string, received number",
          "path": ["body", "name"]
        }
      ],
      "success": false,
      "result": {}
    }
    ```

    Key differences: `code` is now the numeric `7001` (was a string like `"invalid_type"`), and Zod-specific fields (`expected`, `received`) are no longer included.

  - `D1UpdateEndpoint.update()` now automatically filters `updatedData` to only include columns defined in the Zod schema. Previously, DB tables with extra columns not in the schema would cause `validateColumnName()` to throw.

## 3.1.0

### Minor Changes

- [#297](https://github.com/cloudflare/chanfana/pull/297) [`59df713`](https://github.com/cloudflare/chanfana/commit/59df713db890e9f37ae53a87202359d9f2b0c12d) Thanks [@G4brym](https://github.com/G4brym)! - ### Breaking Changes

  - **Parameter helper functions removed** — `Str()`, `Num()`, `Int()`, `Bool()`, `DateTime()`, `DateOnly()`, `Email()`, `Uuid()`, `Hostname()`, `Ipv4()`, `Ipv6()`, `Ip()`, `Regex()`, `Enumeration()`, and `convertParams()` have been removed. Use native Zod schemas directly (e.g., `Str()` → `z.string()`, `Email()` → `z.email()`, `DateTime()` → `z.iso.datetime()`)
  - **Legacy type support removed** — `legacyTypeIntoZod`, `Arr()`, and `Obj()` are no longer exported. `contentJson()` now requires a Zod schema instead of plain objects
  - **D1 endpoint error messages sanitized** — Database errors no longer expose internal details. Use the `constraintsMessages` property to map constraint violations to user-friendly errors
  - **D1 delete/update restricted to primary key filters** — Only filters matching `primaryKeys` are used in WHERE clauses for security
  - **D1 `per_page` capped at 100** — Configurable via `maxPerPage` class property
  - **`raiseUnknownParameters` now enforced** — Was previously accepted but not functional; now active

  ### New Features

  - **10 new exception classes** — `UnauthorizedException` (401), `ForbiddenException` (403), `MethodNotAllowedException` (405), `ConflictException` (409), `UnprocessableEntityException` (422), `TooManyRequestsException` (429), `InternalServerErrorException` (500), `BadGatewayException` (502), `ServiceUnavailableException` (503), `GatewayTimeoutException` (504)
  - **D1 SQL injection prevention utilities** — New `d1/base.ts` module with `validateSqlIdentifier()`, `validateTableName()`, `validateColumnName()`, `buildSafeFilters()`, `buildPrimaryKeyFilters()`, `getD1Binding()`, `handleDbError()`, and query clause builders. All exported from `chanfana`
  - **`Retry-After` HTTP header** — Automatically set on responses for `TooManyRequestsException` and `ServiceUnavailableException` when `retryAfter` is provided
  - **`getUnvalidatedData()`** — New method on `OpenAPIRoute` to access raw request data before Zod applies defaults/transformations, useful for partial updates with Zod 4
  - **Hono `basePath()` auto-detection** — Chanfana now detects Hono's `basePath()` automatically; passing both `basePath()` and `base` option now throws a descriptive error
  - **Hono error flow** — Errors now flow through Hono's `app.onError` as `HTTPException` instances instead of being caught internally

  ### Bug Fixes

  - **D1: Prevent unscoped DELETE/UPDATE** — `buildPrimaryKeyFilters()` throws when no primary key filters match
  - **D1: Fix shared exception instances** — `handleDbError()` clones constraint exceptions instead of re-throwing the same object
  - **D1: Fix empty update producing invalid SQL** — Returns existing object when no fields to update
  - **D1: Read endpoint uses primary key filters** — Consistent with delete/update behavior
  - **D1: Delete uses shared `handleDbError`** — Consistent error handling and `constraintsMessages` support
  - **D1: Escape LIKE wildcards** — `%` and `_` in search values no longer cause unintended pattern matching
  - **D1: Column names validated against model schema** — Only fields defined in the Zod schema are accepted in SQL queries
  - **Schema generation errors propagate** — No longer silently swallowed
  - **CreateEndpoint response schema** — Fixed reference from status 200 to 201
  - **Falsy default values** — `0`, `false`, and `""` are now correctly applied as defaults
  - **BigInt coercion** — Uses `BigInt()` directly instead of `parseInt()` to avoid precision loss
  - **Boolean coercion null guard** — Prevents errors when coercing null values to boolean
  - **HEAD requests** — No longer attempt to parse request body
  - **YAML URL generation** — Only replaces trailing `.json` in URL
  - **ApiException import** — Changed from `import type` to value import for proper `instanceof` checks
  - **ReadEndpoint & ListEndpoint response schema** — Added `InputValidationException` to documented 400 responses
  - **Removed dead code** — `handleValidationError()` and `D1EndpointConfig` interface removed

  ### Improvements

  - **D1 parallel queries** — List endpoint runs data and count queries concurrently with `Promise.all()`
  - **Configurable `maxPerPage`** — `D1ListEndpoint.maxPerPage` is a class property that can be overridden
  - **Normalized ORDER BY direction** — Returns lowercase `"asc"`/`"desc"` for consistency
  - **`sanitizeOperationId()`** — Ensures operationIds are valid by removing special characters
  - **Router constructor validation** — `OpenAPIHandler` throws if router argument is missing
  - **Comprehensive JSDoc** — Added to all exception classes, D1 endpoint methods, and OpenAPI handler methods
  - **Error responses include `result: {}`** — Consistent shape with success responses

- [#306](https://github.com/cloudflare/chanfana/pull/306) [`9470a04`](https://github.com/cloudflare/chanfana/commit/9470a045434b95f36e25d9650461b90e25c8cf74) Thanks [@G4brym](https://github.com/G4brym)! - ### Hono `basePath()` support

  Chanfana now properly handles Hono's `basePath()` for route matching, OpenAPI schema generation, and documentation URLs.

  **New features:**

  - **Auto-detection of Hono's `basePath()`**: When a Hono instance is created with `basePath()` (e.g., `new Hono().basePath("/api")`), Chanfana automatically detects the base path and uses it for schema generation and doc routes. No need to pass `base` separately.
  - **`base` option applies `basePath()` for Hono**: Using `fromHono(new Hono(), { base: "/api" })` now calls Hono's `basePath()` internally, so routes actually match at the prefixed path — not just in the OpenAPI schema.
  - **`options` exposed via proxy**: The router proxy now exposes the `options` property for runtime access to the configured `RouterOptions`.

  **New validations:**

  - **Combining `basePath()` and `base` throws an error**: Using both Hono's `basePath()` and chanfana's `base` option (e.g., `fromHono(new Hono().basePath("/api"), { base: "/v1" })`) now throws a descriptive error with migration guidance.
  - **Base path format validation**: The `base` option must start with `/` and must not end with `/`. Invalid formats now throw a clear error.

  **Bug fixes:**

  - Fixed a stale reference in nested route handling where routes were registered on the original Hono instance instead of the based router.

  **No changes to itty-router behavior.**

- [`b671b4d`](https://github.com/cloudflare/chanfana/commit/b671b4dd45919dbafb4e8c8228162a210651868c) Thanks [@G4brym](https://github.com/G4brym)! - ### Hono error handler integration

  Chanfana errors (validation errors, API exceptions) now flow through Hono's `onError` handler automatically when using `fromHono()`. Previously, these errors were caught internally and formatted into responses before Hono could see them.

  **How it works:**

  The Hono adapter converts chanfana errors into Hono `HTTPException` instances with the same JSON response body chanfana normally produces. This means:

  - Hono's `onError` handler receives the error for logging, monitoring, or custom formatting
  - If no `onError` is configured, Hono's default handler calls `HTTPException.getResponse()` and returns the formatted response as usual — no behavior change for users without `onError`
  - Unknown errors (not ZodError or ApiException) propagate as-is without wrapping

  **Usage:**

  ```typescript
  import { fromHono } from "chanfana";
  import { Hono } from "hono";
  import { HTTPException } from "hono/http-exception";

  const app = new Hono();
  const openapi = fromHono(app);

  app.onError((err, c) => {
    console.error("Caught:", err);
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    return c.json({ error: "Internal Server Error" }, 500);
  });
  ```

  **No changes to itty-router behavior.**

  **Implementation details:**

  - Added `wrapHandler()` hook to `OpenAPIHandler` base class for adapter-specific handler wrapping
  - `HonoOpenAPIHandler` overrides `wrapHandler()` to convert errors to `HTTPException` via dynamic import (no runtime cost for itty-router users)
  - Extracted `formatChanfanaError()` utility for consistent error formatting across code paths

### Patch Changes

- [#312](https://github.com/cloudflare/chanfana/pull/312) [`1b889cf`](https://github.com/cloudflare/chanfana/commit/1b889cf76b0cb26058c0b353db40f182a3e19265) Thanks [@G4brym](https://github.com/G4brym)! - Include source code, AI coding skills, and documentation in the npm package so AI tools can browse implementation details after installing chanfana. Added `llms.txt` as a lightweight entry point following the llmstxt.org convention.
