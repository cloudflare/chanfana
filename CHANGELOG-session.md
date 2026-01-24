# Changelog

## [Unreleased]

### Breaking Changes

1. **D1 Endpoints: Error messages are no longer exposed in database errors**
   - Previously: Database error messages (e.g., `UNIQUE constraint failed: users.email`) were thrown directly as `ApiException(e.message)`
   - Now: Database errors throw a generic `ApiException("Database operation failed")` or `ApiException("Failed to create record")` to prevent leaking internal database details
   - **Migration**: If you relied on parsing error messages for specific constraint violations, use the `constraintsMessages` property instead:
     ```typescript
     class MyEndpoint extends D1CreateEndpoint {
       constraintsMessages = {
         "users.email": new InputValidationException("Email already exists", ["body", "email"])
       };
     }
     ```

2. **D1 Endpoints: Column names are now validated against schema**
   - Previously: Any column name from request data was used directly in SQL queries
   - Now: Column names are validated against the model schema's defined fields
   - **Migration**: Ensure all fields you want to use in queries are defined in your Zod schema

3. **D1DeleteEndpoint & D1UpdateEndpoint: Only primary key filters are applied**
   - Previously: All filters were applied to WHERE clauses
   - Now: Only filters matching `primaryKeys` are used (security improvement)
   - **Migration**: This should not affect normal usage, but if you relied on filtering by non-primary-key fields in delete/update operations, that will no longer work

4. **D1ListEndpoint: `per_page` is now capped at 100**
   - Previously: No limit on `per_page` value
   - Now: `per_page` is clamped between 1 and 100
   - **Migration**: If you need more than 100 results per page, override the `list()` method

5. **Legacy Type Support Removed**
   - Removed `legacyTypeIntoZod` function - no longer exported
   - Removed `Arr()` helper function - use `z.array()` directly
   - Removed `Obj()` helper function - use `z.object()` directly
   - `contentJson()` now requires a Zod schema, not plain objects
   - `Enumeration().values` property no longer attached for backward compatibility
   - **Migration**: Replace with native Zod:
     - `Arr(Str())` → `z.array(z.string())` or `z.string().array()`
     - `Obj({ field: Str() })` → `z.object({ field: z.string() })`
     - `contentJson({ success: Boolean })` → `contentJson(z.object({ success: z.boolean() }))`
     - `String` / `Number` / `Boolean` → `z.string()` / `z.number()` / `z.boolean()`

6. **Parameter Helper Functions Removed**
   - Removed all helper functions: `Str()`, `Num()`, `Int()`, `Bool()`, `DateTime()`, `DateOnly()`, `Regex()`, `Email()`, `Uuid()`, `Hostname()`, `Ipv4()`, `Ipv6()`, `Ip()`, `Enumeration()`, `convertParams()`
   - **Migration**: Use native Zod methods directly:
     - `Str()` → `z.string()`
     - `Num()` → `z.number()`
     - `Int()` → `z.number().int()`
     - `Bool()` → `z.boolean()`
     - `DateTime()` → `z.iso.datetime()`
     - `DateOnly()` → `z.iso.date()`
     - `Email()` → `z.email()`
     - `Uuid()` → `z.uuid()`
     - `Ipv4()` → `z.ipv4()`
     - `Ipv6()` → `z.ipv6()`
     - `Ip()` → `z.union([z.ipv4(), z.ipv6()])`
     - `Hostname()` → `z.string().regex(/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/)`
     - `Regex({ pattern })` → `z.string().regex(pattern)`
     - `Enumeration({ values })` → `z.enum([...])`
   - For OpenAPI metadata, use `.openapi()` or `.describe()` methods

### Bug Fixes

1. **CreateEndpoint: Fixed response schema reference** (`src/endpoints/create.ts`)
   - Changed from `...this.schema?.responses?.[200]` to `...this.schema?.responses?.[201]`
   - The CreateEndpoint returns 201, so custom response overrides should use status 201

2. **parameters.ts: Fixed falsy default values**
   - Previously: `if (params.default)` would skip falsy defaults like `0`, `false`, or `""`
   - Now: Uses `if (params.default !== undefined)` to properly apply falsy defaults

3. **parameters.ts: Fixed BigInt coercion**
   - Previously: Used `parseInt()` for BigInt coercion which could lose precision
   - Now: Uses `BigInt()` directly for proper BigInt coercion

4. **parameters.ts: Fixed null boolean coercion**
   - Added null check before boolean coercion to prevent errors

5. **openapi.ts: Fixed YAML URL generation**
   - Previously: `.replace(".json", ".yaml")` could replace `.json` anywhere in the URL
   - Now: Uses `/\.json$/` regex to only replace trailing `.json`

6. **openapi.ts: Fixed typo in error message**
   - Changed "don't" to "doesn't" in operationId error message

7. **route.ts: Fixed ApiException import**
   - Changed from `import type { ApiException }` to `import { ApiException }` for proper `instanceof` checks

8. **route.ts: Added HEAD request exclusion from body parsing**
   - HEAD requests no longer attempt to parse request body

9. **ReadEndpoint & ListEndpoint: Added InputValidationException to response schema**
   - These endpoints can return 400 errors, now properly documented in OpenAPI schema

### New Features

1. **New Exception Types** (`src/exceptions.ts`)
   - `UnauthorizedException` (401) - For authentication failures
   - `ForbiddenException` (403) - For authorization failures
   - `MethodNotAllowedException` (405) - For unsupported HTTP methods
   - `ConflictException` (409) - For duplicate resource conflicts
   - `UnprocessableEntityException` (422) - For semantic validation errors (includes path)
   - `TooManyRequestsException` (429) - For rate limiting (includes retryAfter)
   - `InternalServerErrorException` (500) - For server errors (hidden by default)
   - `BadGatewayException` (502) - For upstream errors
   - `ServiceUnavailableException` (503) - For maintenance/overload (includes retryAfter)
   - `GatewayTimeoutException` (504) - For upstream timeouts

2. **D1 Base Utilities** (`src/endpoints/d1/base.ts`) - NEW FILE
   - `validateSqlIdentifier()` - Validates SQL identifiers against injection patterns
   - `validateTableName()` - Validates and returns safe table names
   - `validateColumnName()` - Validates column names against allowed list
   - `validateOrderDirection()` - Validates ORDER BY direction (ASC/DESC)
   - `validateOrderByColumn()` - Validates ORDER BY column against whitelist
   - `buildSafeFilters()` - Builds parameterized WHERE conditions
   - `buildPrimaryKeyFilters()` - Builds filters restricted to primary keys only
   - `getD1Binding()` - Gets D1 binding with proper error handling
   - `handleDbError()` - Handles DB errors with constraint message support
   - `buildWhereClause()` - Builds WHERE clause from conditions
   - `buildOrderByClause()` - Builds ORDER BY clause

3. **ApiException now includes `result: {}` in error responses** (`src/route.ts`)
   - Error responses now include an empty result object for consistency with success responses

4. **New exports in index.ts**
   - All D1 base utilities are now exported
   - All new exception types are exported

### Improvements

1. **D1 Endpoints: SQL Injection Prevention**
   - All D1 endpoints now use parameterized queries exclusively
   - Table names, column names, and ORDER BY columns are validated
   - Filters are restricted to primary keys for delete/update operations

2. **D1 Endpoints: Better Error Handling**
   - Consistent error handling across all D1 endpoints
   - Support for custom constraint violation messages
   - Errors are logged (if logger provided) but sanitized before throwing

3. **D1ListEndpoint: Parallel Query Execution**
   - Data and count queries now run in parallel with `Promise.all()`

4. **openapi.ts: Added error handling for schema generation**
   - Returns a minimal valid schema on generation failure instead of crashing

5. **openapi.ts: Added sanitizeOperationId()**
   - Ensures operationIds are valid by removing special characters

6. **openapi.ts: Added constructor validation**
   - Throws error if router is not provided

7. **JSDoc Documentation**
   - Added comprehensive JSDoc comments to all exception classes
   - Added JSDoc comments to all D1 endpoint methods
   - Added JSDoc comments to OpenAPI handler methods
   - Added JSDoc comments to parameter helper functions

### Internal Changes

1. **tsconfig.json: Tests excluded from main compilation**
   - Tests now use their own tsconfig extending the main one
   - Fixes compilation issues with cloudflare:test module

2. **Test Infrastructure**
   - Added D1 database binding to vitest config
   - Added D1Database type to test bindings

### Test Coverage

- **+71 new tests** (99 → 170 total)
  - 37 exception handling tests
  - 12 edge case tests  
  - 22 D1 endpoint tests

## Migration Guide

### From Previous Version

1. **If you parse database error messages**: Use `constraintsMessages` property instead
2. **If you use `per_page` > 100**: Override `list()` method or paginate client-side
3. **If you filter updates/deletes by non-PK fields**: Reconsider your data model or override `getSafeFilters()`
4. **Custom error handling**: New exception types available - consider using them for proper HTTP status codes
