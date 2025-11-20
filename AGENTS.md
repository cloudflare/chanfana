# Agent Guide for Chanfana Development

This document contains comprehensive knowledge about the chanfana codebase, its architecture, patterns, and development practices. It's designed to help AI agents (and developers) quickly understand and work with the project.

## Project Overview

**Chanfana** is an OpenAPI schema generator and validator for edge runtime routers (Hono, itty-router). It provides:
- Automatic OpenAPI 3.0/3.1 schema generation from Zod schemas
- Request validation with Zod v4
- Type-safe endpoint definitions
- Auto CRUD endpoints for common database operations
- Built-in Swagger UI and ReDoc documentation

**Tech Stack:**
- TypeScript 5.9.3
- Zod 4.x (recently migrated from v3)
- @asteasolutions/zod-to-openapi v8
- Vitest for testing
- Cloudflare Workers runtime

## Project Structure

```
chanfana/
├── src/
│   ├── adapters/          # Router adapters (Hono, itty-router)
│   ├── endpoints/         # Auto CRUD endpoint classes
│   │   ├── create.ts
│   │   ├── read.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   ├── list.ts
│   │   ├── types.ts
│   │   └── d1/           # D1-specific implementations
│   ├── zod/              # Zod utilities and registry
│   ├── openapi.ts        # Core OpenAPI handler
│   ├── route.ts          # Base OpenAPIRoute class
│   ├── parameters.ts     # Zod parameter helpers
│   ├── exceptions.ts     # API exception classes
│   ├── types.ts          # TypeScript type definitions
│   └── index.ts          # Main exports
├── tests/
│   └── integration/      # Integration tests
├── docs/                 # VitePress documentation
└── dist/                 # Built output (CJS + ESM)
```

## Core Concepts

### 1. OpenAPIRoute

The base class for all endpoints. Extends this to create API endpoints:

```typescript
class MyEndpoint extends OpenAPIRoute {
  schema = {
    request: { /* ... */ },
    responses: { /* ... */ },
  };

  async handle(...args: any) {
    const data = await this.getValidatedData();
    return { result: data };
  }
}
```

**Key methods:**
- `getValidatedData()` - Returns validated request data (params, query, headers, body)
- `getUnvalidatedData()` - Returns raw request data before Zod applies defaults/transformations (Zod 4+)
- `execute()` - Internal method that handles request lifecycle
- `validateRequest()` - Validates incoming request against schema

**Zod 4 Consideration:**
In Zod 4, optional fields with `.default()` are always present in validated data, even when absent from the input. Use `getUnvalidatedData()` to check which fields were actually sent:

```typescript
const validated = await this.getValidatedData(); // { field: "default_value" }
const raw = await this.getUnvalidatedData();     // {}

if ('field' in raw.body) {
  // Field was actually sent in request
}
```

**Lifecycle:**
1. `execute()` called by router
2. Request validated via `validateRequest()`
3. `handle()` method runs with user logic
4. Errors caught and formatted
5. Response returned (auto-converted to JSON if object)

### 2. Auto Endpoints

CRUD endpoint classes that reduce boilerplate:

- **CreateEndpoint**: POST requests, creates resources
- **ReadEndpoint**: GET requests, retrieves single resource
- **UpdateEndpoint**: PUT/PATCH requests, updates resources
- **DeleteEndpoint**: DELETE requests, deletes resources
- **ListEndpoint**: GET requests, lists resources with pagination/filtering

**Meta Object Pattern:**
All auto endpoints require a `_meta` property:

```typescript
class UserReadEndpoint extends ReadEndpoint {
  _meta = {
    model: {
      tableName: 'users',
      schema: UserSchema,           // Zod schema
      primaryKeys: ['id'],          // Primary key fields
      serializer: (obj) => obj,     // Optional: transform output
      serializerSchema: PublicSchema, // Optional: public schema
    },
    fields: UserSchema,             // Optional: override fields
    pathParameters: ['userId'],     // Optional: explicit path params
  };

  async fetch(filters: ListFilters) {
    // Implementation
  }
}
```

**UpdateEndpoint & Zod 4 Partial Updates:**
`UpdateEndpoint` handles partial updates correctly with Zod 4. In Zod 4, optional fields with `.default()` are always present in validated data. The endpoint uses `getUnvalidatedData()` to determine which fields were actually sent:

```typescript
// UpdateEndpoint.getUpdatedData() implementation
async getUpdatedData(_oldObj: O<typeof this._meta>): Promise<UpdatedData> {
  const data = await this.getValidatedData();     // Has defaults applied
  const rawData = await this.getUnvalidatedData(); // Raw request body
  
  // Only update fields that were actually sent
  for (const [key, value] of Object.entries(data.body)) {
    if (key in rawData.body) {  // Check raw data
      updatedData[key] = value;
    }
  }
}
```

This prevents default values from overwriting existing database values during partial updates.

**ListEndpoint Properties:**
- `filterFields: string[]` - Fields for exact-match filtering
- `searchFields: string[]` - Fields for full-text search (LIKE)
- `orderByFields: string[]` - Fields available for sorting
- `defaultOrderBy: string` - Default sort field
- `searchFieldName: string` - Query param name (default: "search")

### 3. Parameter Helpers

Chanfana provides Zod wrappers for common parameter types:

```typescript
import { Str, Num, Int, Bool, Email, Uuid, DateTime, DateOnly, Ipv4, Ipv6 } from 'chanfana';

const schema = z.object({
  email: Email({ description: 'User email' }),
  age: Int({ required: false, default: 18 }),
  createdAt: DateTime(),
  birthDate: DateOnly(),
});
```

**Why use these?**
- Already updated for Zod v4 compatibility
- Add OpenAPI metadata automatically
- Provide consistent validation patterns

### 4. Exception Handling

Custom exception classes for API errors:

```typescript
// Base exception
throw new ApiException("Something went wrong");

// Specific exceptions
throw new NotFoundException();  // 404
throw new InputValidationException("Invalid email", ["body", "email"]); // 400

// Multiple exceptions
throw new MultiException([error1, error2]);
```

**Exception Flow:**
1. Exception thrown in `handle()`
2. Caught by `execute()` in `route.ts`
3. `buildResponse()` formats error
4. Returned with proper status code

## Zod v3 → v4 Migration (Completed)

### Changes Made

**1. String Format Methods** (`src/parameters.ts`)
```typescript
// Before (v3)
z.string().email()
z.string().uuid()
z.string().datetime({ message: "..." })

// After (v4)
z.email()
z.uuid()
z.iso.datetime({ error: "..." })
```

**2. Error Parameter** (`src/parameters.ts`)
```typescript
// Before: message:
z.string().datetime({ message: "Invalid" })

// After: error:
z.iso.datetime({ error: "Invalid" })
```

**3. Object Validation** (`src/route.ts`)
```typescript
// Before: .strict()
let schema = z.object(rawSchema);
if (raiseUnknownParameters) {
  schema = schema.strict();
}

// After: z.strictObject()
let schema;
if (raiseUnknownParameters) {
  schema = z.strictObject(rawSchema);
} else {
  schema = z.object(rawSchema);
}
```

**4. Native Enums** (`tests/integration/zod.ts`)
```typescript
// Before: z.nativeEnum()
type: z.nativeEnum({ active: "active", inactive: "inactive" })

// After: z.enum()
type: z.enum(["active", "inactive"])
```

**5. Type Constraints** (`src/types.ts`)
```typescript
// Before: z.ZodTypeAny
schema extends z.ZodTypeAny

// After: z.ZodType
schema extends z.ZodType
```

**6. Date Validation** (tests and src)
```typescript
// Before
z.string().date()  // For YYYY-MM-DD strings

// After
z.iso.date()  // Under z.iso namespace
```

### Migration Checklist for Future Changes

- [ ] No `z.string().email()` - use `z.email()`
- [ ] No `z.string().uuid()` - use `z.uuid()`
- [ ] No `z.string().datetime()` - use `z.iso.datetime()`
- [ ] No `z.string().url()` - use `z.url()`
- [ ] No `z.string().date()` - use `z.iso.date()`
- [ ] No `z.nativeEnum()` - use `z.enum()`
- [ ] No `.strict()` method - use `z.strictObject()`
- [ ] No `message:` param - use `error:`
- [ ] No `z.ZodTypeAny` - use `z.ZodType`

## Testing Patterns

### Test File Structure

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { z } from "zod";
import { fromIttyRouter } from "../../src";
import { buildRequest } from "../utils";

describe("Feature Name", () => {
  const mockDB: Record<string, any> = {};

  beforeEach(() => {
    // Setup test data
  });

  it("should do something", async () => {
    const request = await router.fetch(
      new Request("https://example.com/path", {
        method: "POST",
        body: JSON.stringify({ data: "value" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result).toEqual({ expected: "value" });
  });
});
```

### Test Coverage Requirements

1. **CRUD Operations**: Create, Read, Update, Delete, List
2. **Validation**: Required fields, type validation, format validation
3. **Error Handling**: 404s, 400s, validation errors
4. **Edge Cases**: Empty data, null values, composite keys
5. **Advanced Features**: Filtering, searching, sorting, pagination

### Running Tests

```bash
npm test                      # Run all tests
npm test -- endpoints.test.ts # Run specific test file
npm run build                 # Build the project
```

## Documentation Patterns

### Documentation Structure

```
docs/
├── index.md                    # Home page
├── introduction.md
├── getting-started.md
├── migration-to-chanfana-3.md  # Migration guide
├── endpoints/
│   ├── defining-endpoints.md
│   ├── parameters.md
│   ├── request-validation.md
│   ├── response-definition.md
│   └── auto/
│       ├── base.md           # Auto endpoints guide
│       └── d1.md             # D1 endpoints
├── error-handling.md
└── advanced-topics-patterns.md
```

### Documentation Standards

1. **Code Examples**: Always show before/after for migrations
2. **Type Safety**: Include TypeScript types in examples
3. **Practical Examples**: Use real-world scenarios (users, products, etc.)
4. **API Calls**: Show actual HTTP requests when relevant
5. **Complete Examples**: Include imports and full working code

### Adding New Documentation

1. Create markdown file in appropriate directory
2. Add to `.vitepress/config.ts` sidebar
3. Include practical code examples
4. Cross-reference related pages
5. Test all code examples

## Common Issues and Solutions

### Issue: "Invalid input: expected string, received undefined"

**Cause:** Required field missing in request
**Solution:** Add validation, make field optional, or provide default

```typescript
// Option 1: Make optional
field: z.string().optional()

// Option 2: Provide default
field: z.string().default("default value")

// Option 3: Transform undefined to null
field: z.preprocess((val) => val ?? null, z.string().nullable())
```

### Issue: "Model primaryKeys differ from urlParameters"

**Cause:** Composite primary keys in nested routes
**Solution:** Use `pathParameters` in Meta object

```typescript
_meta = {
  model: {
    primaryKeys: ['userId', 'postId'],
    // ...
  },
  pathParameters: ['userId', 'postId'], // Explicit definition
}
```

### Issue: Error messages not matching tests after Zod v4 upgrade

**Cause:** Zod v4 changed error message formats
**Solution:** Update test expectations

```typescript
// Before (Zod v3)
expect(error.message).toBe("Required");

// After (Zod v4)
expect(error.message).toBe("Invalid input: expected string, received undefined");
```

### Issue: Sensitive data exposed in API responses

**Cause:** No serializer defined
**Solution:** Use `serializer` and `serializerSchema`

```typescript
_meta = {
  model: {
    schema: InternalSchema,
    serializer: (obj) => {
      const { passwordHash, apiKey, ...public } = obj;
      return public;
    },
    serializerSchema: PublicSchema,
  },
}
```

## Development Workflow

### Making Changes

1. **Update Code**: Make changes in `src/`
2. **Update Tests**: Add/update tests in `tests/integration/`
3. **Update Docs**: Update relevant markdown files in `docs/`
4. **Run Tests**: `npm test` - must pass all 94 tests
5. **Build**: `npm run build` - must succeed
6. **Commit**: Clear commit messages describing changes

### Adding New Features

1. **Design API**: Consider backwards compatibility
2. **Implement**: Add to `src/` with TypeScript types
3. **Export**: Add to `src/index.ts` if public API
4. **Test**: Create comprehensive test suite
5. **Document**: Add examples to relevant docs
6. **Update Migration Guide**: If breaking changes

### Release Checklist

- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Documentation updated
- [ ] Migration guide updated (if breaking)
- [ ] Examples work with new version
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

## Key Files Reference

### `src/openapi.ts`

Central OpenAPI handler. Manages:
- Route registration
- Schema generation
- Swagger UI serving
- Registry merging for nested routers

**Key Methods:**
- `registerRoute()` - Registers endpoint with OpenAPI
- `registerNestedRouter()` - Merges nested router schemas
- `getGeneratedSchema()` - Generates final OpenAPI spec

### `src/route.ts`

Base `OpenAPIRoute` class. Core functionality:
- Request validation
- Error handling (Zod + ApiException)
- Data type conversion
- Lifecycle management

**Recent Change:** Now catches `ApiException` and formats with proper status codes.

### `src/parameters.ts`

Zod parameter helper functions. All updated for Zod v4:
- Uses top-level functions (`z.email()`, `z.uuid()`)
- Uses `z.iso.*` namespace for date/time
- Uses `error:` parameter instead of `message:`

### `src/endpoints/`

Auto CRUD endpoint implementations:
- **Base classes**: create.ts, read.ts, update.ts, delete.ts, list.ts
- **D1 implementations**: d1/ directory
- **Types**: types.ts with Meta, Model, Filters

## Advanced Patterns

### Lifecycle Hooks

All auto endpoints support `before()` and `after()` hooks:

```typescript
class CreateUser extends CreateEndpoint {
  async before(data: User): Promise<User> {
    // Pre-processing: validation, transformation
    return { ...data, createdAt: new Date() };
  }

  async after(data: User): Promise<User> {
    // Post-processing: side effects
    await sendWelcomeEmail(data.email);
    return data;
  }
}
```

### Custom Serialization

Transform output before sending:

```typescript
_meta = {
  model: {
    serializer: (user: any) => ({
      id: user.id,
      displayName: `${user.firstName} ${user.lastName}`,
      // Computed fields, format changes, etc.
    }),
    serializerSchema: z.object({
      id: z.string(),
      displayName: z.string(),
    }),
  },
}
```

### Nested Routes with Composite Keys

Handle multi-level routing:

```typescript
// Route: /orgs/:orgId/teams/:teamId
_meta = {
  model: {
    primaryKeys: ['orgId', 'teamId'],
  },
  pathParameters: ['orgId', 'teamId'], // Explicit for validation
}
```

## Performance Considerations

1. **Tree-shaking**: Zod v4 improves tree-shaking - use top-level functions
2. **Validation**: Runs on every request - keep schemas simple
3. **Serialization**: Called on every response - avoid heavy computation
4. **Registry**: Schema generation happens once at startup

## Security Best Practices

1. **Always use serializers** for sensitive data
2. **Validate all inputs** with Zod schemas
3. **Use strict object schemas** (`raiseUnknownParameters: true`)
4. **Handle errors safely** (don't expose internals)
5. **Sanitize error messages** in production

## Quick Reference Commands

```bash
# Development
npm install                   # Install dependencies
npm test                      # Run tests
npm run build                 # Build project
npm run lint                  # Lint code

# Documentation
npm run docs:dev             # Start docs dev server
npm run docs:build           # Build docs
npm run docs:deploy          # Deploy to Cloudflare Pages

# Testing
npm test -- endpoints.test.ts              # Specific test file
npm test -- --grep "CreateEndpoint"        # Filter tests
npm test -- --coverage                     # With coverage
```

## Resources

- **Main Docs**: https://chanfana.pages.dev
- **GitHub**: https://github.com/cloudflare/chanfana
- **Zod v4 Docs**: https://zod.dev/v4
- **OpenAPI 3.1**: https://spec.openapis.org/oas/v3.1.0

## Version Information

- **Current Version**: 3.0.0-alpha.1
- **Zod Version**: 4.1.12
- **Node Version**: >= 18
- **TypeScript**: 5.9.3

---

**Last Updated**: 2025-11-11
**Maintainer**: Gabriel Massadas (@g4brym)
**License**: MIT
