---
name: write-endpoints
description: Comprehensive guide for building OpenAPI endpoints with chanfana - schema definition, request validation, CRUD operations, D1 database integration, and exception handling
---

# Writing OpenAPI Endpoints with Chanfana

## When to Use

Use this skill when:
- Building OpenAPI endpoints with chanfana for Cloudflare Workers
- Defining request/response schemas with Zod v4
- Creating CRUD auto endpoints (Create, Read, Update, Delete, List)
- Integrating with Cloudflare D1 databases
- Implementing error handling with exception classes

## Part 1: Fundamentals

### Quick Start with Hono

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

export type Env = {
    DB: D1Database;
};
export type AppContext = Context<{ Bindings: Env }>;

class HelloEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": {
                description: 'Successful response',
                ...contentJson(z.object({ message: z.string() })),
            },
        },
    };

    async handle(c: AppContext) {
        return { message: 'Hello, Chanfana!' };
    }
}

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);
openapi.get('/hello', HelloEndpoint);

export default app;
```

### Quick Start with itty-router

```typescript
import { Router } from 'itty-router';
import { fromIttyRouter, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

class HelloEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": {
                description: 'Successful response',
                ...contentJson(z.object({ message: z.string() })),
            },
        },
    };

    async handle(request: Request, env, ctx) {
        return { message: 'Hello, Chanfana!' };
    }
}

const router = Router();
const openapi = fromIttyRouter(router);
openapi.get('/hello', HelloEndpoint);
router.all('*', () => new Response("Not Found.", { status: 404 }));

export const fetch = router.handle;
```

### Schema Definition

Define request validation for body, query, params, and headers:

```typescript
import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

class CreateUserEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            body: contentJson(z.object({
                username: z.string().min(3).max(20),
                password: z.string().min(8),
                email: z.email(),
                fullName: z.string().optional(),
            })),
            query: z.object({
                notify: z.boolean().optional().default(true),
            }),
            params: z.object({
                orgId: z.uuid(),
            }),
            headers: z.object({
                'X-API-Key': z.string(),
            }),
        },
        responses: {
            "200": {
                description: 'User created successfully',
                ...contentJson(z.object({
                    id: z.uuid(),
                    username: z.string(),
                    email: z.email(),
                })),
            },
            "400": {
                description: 'Validation error',
                ...contentJson(z.object({
                    success: z.literal(false),
                    errors: z.array(z.object({
                        code: z.number(),
                        message: z.string(),
                    })),
                })),
            },
        },
    };

    async handle(c) {
        const data = await this.getValidatedData<typeof this.schema>();
        // data.body, data.query, data.params, data.headers are all typed
        return { id: crypto.randomUUID(), username: data.body.username, email: data.body.email };
    }
}
```

### Zod v4 Syntax (CRITICAL)

Chanfana v3 uses Zod v4. Use the correct syntax:

```typescript
// WRONG - Zod v3 syntax (deprecated)
z.string().email()
z.string().uuid()
z.string().datetime()
z.string().date()
z.string().url()
z.string().ip({ version: "v4" })
z.object({}).strict()
z.nativeEnum(MyEnum)

// CORRECT - Zod v4 syntax
z.email()
z.uuid()
z.iso.datetime()
z.iso.date()
z.url()
z.ipv4()
z.strictObject({})
z.enum(['option1', 'option2'])
```

### Common Zod Types for APIs

Use native Zod schemas for all parameter types:

```typescript
import { z } from 'zod';

// String with constraints
const nameSchema = z.string()
    .min(3)
    .max(50)
    .describe("User's name")
    .openapi({ example: 'John Doe' });

// Number with range
const priceSchema = z.number()
    .min(0)
    .describe('Product price')
    .openapi({ example: 99.99 });

// Integer
const ageSchema = z.number()
    .int()
    .min(0)
    .max(120)
    .describe("User's age");

// Boolean with default
const isActiveSchema = z.boolean()
    .default(true)
    .describe('User active status');

// Date/time (ISO 8601)
const createdAtSchema = z.iso.datetime()
    .describe('Creation timestamp')
    .openapi({ example: '2024-01-20T10:30:00Z' });

// Date only (YYYY-MM-DD)
const birthDateSchema = z.iso.date()
    .describe('Birth date')
    .openapi({ example: '1990-05-15' });

// Email, UUID
const emailSchema = z.email().describe('Email address');
const userIdSchema = z.uuid().describe('User ID');

// Enumeration
const statusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered'])
    .default('pending')
    .describe('Order status');

// Array
const tagsSchema = z.array(z.string()).openapi({
    description: 'Tags',
});

// Object
const addressSchema = z.object({
    street: z.string().describe('Street address'),
    city: z.string().describe('City'),
    zipCode: z.string().describe('Zip code'),
});

// Regex pattern
const phoneSchema = z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .describe('Phone number');

// IP addresses
const ipv4Schema = z.ipv4();
const ipv6Schema = z.ipv6();
const ipSchema = z.union([z.ipv4(), z.ipv6()]);

// Hostname (regex pattern)
const hostnameSchema = z.string().regex(
    /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/
);
```

### Validated Data Access

Always use `await` with `getValidatedData()`:

```typescript
class MyEndpoint extends OpenAPIRoute {
    async handle(c) {
        // CORRECT - with await and type annotation
        const data = await this.getValidatedData<typeof this.schema>();

        // Type-safe access
        const username = data.body.username;
        const page = data.query.page;
        const userId = data.params.userId;
        const apiKey = data.headers['X-API-Key'];

        return { success: true };
    }
}
```

### Using getUnvalidatedData() for Partial Updates

In Zod v4, optional fields with `.default()` always have values in validated data. Use `getUnvalidatedData()` to detect what was actually sent:

```typescript
class UpdateUser extends OpenAPIRoute {
    schema = {
        request: {
            body: contentJson(z.object({
                name: z.string().optional(),
                status: z.enum(['active', 'inactive']).default('active'),
            })),
        },
    };

    async handle() {
        const validated = await this.getValidatedData<typeof this.schema>();
        // validated.body.status is 'active' even if not sent

        const raw = await this.getUnvalidatedData();
        // raw.body = {} if nothing was sent

        // Check what was actually sent
        const updates: Record<string, any> = {};
        if ('name' in raw.body) updates.name = validated.body.name;
        if ('status' in raw.body) updates.status = validated.body.status;

        return { updated: updates };
    }
}
```

## Part 2: CRUD Auto Endpoints

### Meta Object Definition

All auto endpoints require a `_meta` property:

```typescript
import { z } from 'zod';

// Define the model schema
const UserSchema = z.object({
    id: z.uuid(),
    username: z.string().min(3).max(20),
    email: z.email(),
    role: z.enum(['user', 'admin']),
    createdAt: z.iso.datetime(),
});

// Define the meta object
const userMeta = {
    model: {
        schema: UserSchema,              // Required: Zod schema for the model
        primaryKeys: ['id'],             // Required: Array of primary key fields
        tableName: 'users',              // Required for D1 endpoints
        serializer: (user: any) => {     // Optional: Transform output
            const { passwordHash, ...safe } = user;
            return safe;
        },
        serializerSchema: UserSchema.omit({ passwordHash: true }), // Optional: Schema for serialized output
    },
    pathParameters: ['id'],              // Optional: Explicit path params for nested routes
};
```

### CreateEndpoint

```typescript
import { CreateEndpoint, type O } from 'chanfana';

class CreateUser extends CreateEndpoint {
    _meta = userMeta;

    // Optional: Pre-processing hook
    async before(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
        return {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
    }

    // Required: Create logic
    async create(data: O<typeof this._meta>) {
        await db.users.insert(data);
        return data;
    }

    // Optional: Post-processing hook
    async after(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
        await sendWelcomeEmail(data.email);
        return data;
    }
}

// Register route
openapi.post('/users', CreateUser);
```

### ReadEndpoint

```typescript
import { ReadEndpoint, type Filters, type O } from 'chanfana';

class GetUser extends ReadEndpoint {
    _meta = userMeta;

    async before(filters: Filters): Promise<Filters> {
        // Pre-fetch validation
        return filters;
    }

    async fetch(filters: Filters): Promise<O<typeof this._meta> | null> {
        const userId = filters.filters[0].value;
        return await db.users.findById(userId);
    }

    async after(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
        // Post-fetch processing
        return data;
    }
}

// Register route with path parameter
openapi.get('/users/:id', GetUser);
```

### ListEndpoint

```typescript
import { ListEndpoint, type ListFilters, type ListResult, type O } from 'chanfana';

class ListUsers extends ListEndpoint {
    _meta = userMeta;

    // Configure filtering, search, and sorting
    filterFields = ['role', 'status'];           // Exact match filtering
    searchFields = ['username', 'email'];         // Full-text search (LIKE)
    orderByFields = ['createdAt', 'username'];    // Available sort fields
    defaultOrderBy = 'createdAt';                 // Default sort field

    async before(filters: ListFilters): Promise<ListFilters> {
        // Add tenant filter, etc.
        return filters;
    }

    async list(filters: ListFilters): Promise<ListResult<O<typeof this._meta>>> {
        const users = await db.users.findMany(filters);
        return { result: users };
    }

    async after(data: ListResult<O<typeof this._meta>>): Promise<ListResult<O<typeof this._meta>>> {
        return data;
    }
}

// Register route
openapi.get('/users', ListUsers);

// API calls:
// GET /users?page=2&per_page=10
// GET /users?role=admin
// GET /users?search=john
// GET /users?order_by=createdAt&order_by_direction=desc
```

### UpdateEndpoint

```typescript
import { UpdateEndpoint, type UpdateFilters, type O } from 'chanfana';

class UpdateUser extends UpdateEndpoint {
    _meta = userMeta;

    async before(oldObj: O<typeof this._meta>, filters: UpdateFilters): Promise<UpdateFilters> {
        filters.updatedData = {
            ...filters.updatedData,
            updatedAt: new Date().toISOString(),
        };
        return filters;
    }

    async getObject(filters: UpdateFilters): Promise<O<typeof this._meta> | null> {
        const userId = filters.filters[0].value;
        return await db.users.findById(userId);
    }

    async update(oldObj: O<typeof this._meta>, filters: UpdateFilters): Promise<O<typeof this._meta>> {
        const userId = filters.filters[0].value;
        return await db.users.update(userId, { ...oldObj, ...filters.updatedData });
    }

    async after(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
        await cache.invalidate(`user:${data.id}`);
        return data;
    }
}

// Register route
openapi.put('/users/:id', UpdateUser);
```

### DeleteEndpoint

```typescript
import { DeleteEndpoint, type Filters, type O } from 'chanfana';

class DeleteUser extends DeleteEndpoint {
    _meta = userMeta;

    async before(oldObj: O<typeof this._meta>, filters: Filters): Promise<Filters> {
        await checkDeletionPermissions(oldObj.id);
        return filters;
    }

    async getObject(filters: Filters): Promise<O<typeof this._meta> | null> {
        const userId = filters.filters[0].value;
        return await db.users.findById(userId);
    }

    async delete(oldObj: O<typeof this._meta>, filters: Filters): Promise<O<typeof this._meta> | null> {
        const userId = filters.filters[0].value;
        await db.users.delete(userId);
        return oldObj;
    }

    async after(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
        await auditLog.record('user_deleted', data.id);
        return data;
    }
}

// Register route
openapi.delete('/users/:id', DeleteUser);
```

### Nested Routes with pathParameters

For composite primary keys in nested routes:

```typescript
const PostSchema = z.object({
    userId: z.uuid(),
    id: z.uuid(),
    title: z.string(),
    content: z.string(),
});

const postMeta = {
    model: {
        schema: PostSchema,
        primaryKeys: ['userId', 'id'],  // Composite primary key
        tableName: 'posts',
    },
    pathParameters: ['userId', 'id'],   // Explicit path params
};

class GetPost extends ReadEndpoint {
    _meta = postMeta;

    async fetch(filters: Filters) {
        const userId = filters.filters.find(f => f.field === 'userId')?.value;
        const postId = filters.filters.find(f => f.field === 'id')?.value;
        return await db.posts.findOne({ userId, id: postId });
    }
}

// Nested route: /users/:userId/posts/:id
const postsRouter = new Hono();
const postsOpenapi = fromHono(postsRouter);
postsOpenapi.get('/:id', GetPost);

// Mount nested router
openapi.route('/:userId/posts', postsOpenapi);
```

## Part 3: D1 Database Integration

### D1 Endpoint Classes

D1 endpoints extend CRUD endpoints with built-in database operations:

```typescript
import {
    D1CreateEndpoint,
    D1ReadEndpoint,
    D1UpdateEndpoint,
    D1DeleteEndpoint,
    D1ListEndpoint,
    InputValidationException,
} from 'chanfana';

// wrangler.toml:
// [[d1_databases]]
// binding = "DB"
// database_name = "my-database"
// database_id = "your-database-id"

class CreateUser extends D1CreateEndpoint {
    _meta = userMeta;
    dbName = 'DB';  // Must match wrangler.toml binding name

    // Optional: Handle UNIQUE constraint violations
    constraintsMessages = {
        'users_email_unique': new InputValidationException(
            'Email already registered',
            ['body', 'email']
        ),
        'users_username_unique': new InputValidationException(
            'Username already taken',
            ['body', 'username']
        ),
    };

    // Optional: Enable logging
    logger = console;
}

class GetUser extends D1ReadEndpoint {
    _meta = userMeta;
    dbName = 'DB';
}

class UpdateUser extends D1UpdateEndpoint {
    _meta = userMeta;
    dbName = 'DB';
}

class DeleteUser extends D1DeleteEndpoint {
    _meta = userMeta;
    dbName = 'DB';
}

class ListUsers extends D1ListEndpoint {
    _meta = userMeta;
    dbName = 'DB';
    filterFields = ['role', 'status'];
    searchFields = ['username', 'email'];
    orderByFields = ['createdAt', 'username'];
    defaultOrderBy = 'createdAt';
}

// Register routes
const app = new Hono<{ Bindings: { DB: D1Database } }>();
const openapi = fromHono(app);

openapi.post('/users', CreateUser);
openapi.get('/users', ListUsers);
openapi.get('/users/:id', GetUser);
openapi.put('/users/:id', UpdateUser);
openapi.delete('/users/:id', DeleteUser);
```

### SQL Injection Prevention

D1 endpoints include built-in security utilities:

```typescript
import {
    validateSqlIdentifier,
    validateTableName,
    validateColumnName,
    buildSafeFilters,
} from 'chanfana/endpoints/d1/base';

// Validate identifiers
const table = validateTableName('users');        // OK
const column = validateColumnName('email');      // OK
validateTableName('DROP TABLE--');               // Throws ApiException

// Build safe WHERE clauses
const filters = [
    { field: 'status', operator: 'EQ', value: 'active' },
    { field: 'role', operator: 'EQ', value: 'admin' },
];
const validColumns = ['id', 'status', 'role', 'name'];
const { conditions, conditionsParams } = buildSafeFilters(filters, validColumns);
// conditions: ['status = ?1', 'role = ?2']
// conditionsParams: ['active', 'admin']
```

## Part 4: Error Handling

### Exception Classes

| Exception | Status | Code | Default Message | Special Properties |
|-----------|--------|------|-----------------|-------------------|
| `ApiException` | 500 | 7000 | "Internal Error" | Base class |
| `InputValidationException` | 400 | 7001 | "Input Validation Error" | `path` |
| `NotFoundException` | 404 | 7002 | "Not Found" | - |
| `UnauthorizedException` | 401 | 7003 | "Unauthorized" | - |
| `ForbiddenException` | 403 | 7004 | "Forbidden" | - |
| `MethodNotAllowedException` | 405 | 7005 | "Method Not Allowed" | - |
| `ConflictException` | 409 | 7006 | "Conflict" | - |
| `UnprocessableEntityException` | 422 | 7007 | "Unprocessable Entity" | `path` |
| `TooManyRequestsException` | 429 | 7008 | "Too Many Requests" | `retryAfter` |
| `InternalServerErrorException` | 500 | 7009 | "Internal Server Error" | `isVisible: false` |
| `BadGatewayException` | 502 | 7010 | "Bad Gateway" | - |
| `ServiceUnavailableException` | 503 | 7011 | "Service Unavailable" | `retryAfter` |
| `GatewayTimeoutException` | 504 | 7012 | "Gateway Timeout" | - |

### Throwing Exceptions

```typescript
import {
    InputValidationException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    TooManyRequestsException,
    MultiException,
} from 'chanfana';

class MyEndpoint extends OpenAPIRoute {
    async handle(c) {
        // Validation error with path
        if (!isValidEmail(email)) {
            throw new InputValidationException('Invalid email format', ['body', 'email']);
        }

        // Not found
        const user = await db.users.findById(id);
        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        // Authentication required
        if (!c.req.header('Authorization')) {
            throw new UnauthorizedException('Authentication required');
        }

        // Permission denied
        if (!user.hasPermission('admin')) {
            throw new ForbiddenException('Admin access required');
        }

        // Resource conflict
        if (await db.users.existsByEmail(email)) {
            throw new ConflictException('Email already registered');
        }

        // Rate limiting
        if (rateLimitExceeded) {
            throw new TooManyRequestsException('Rate limit exceeded', 60); // retry after 60s
        }

        // Multiple errors
        const errors = [];
        if (field1Invalid) errors.push(new InputValidationException('Field 1 invalid', ['body', 'field1']));
        if (field2Invalid) errors.push(new InputValidationException('Field 2 invalid', ['body', 'field2']));
        if (errors.length > 0) {
            throw new MultiException(errors);
        }

        return { success: true };
    }
}
```

### Documenting Exceptions in Schema

```typescript
import {
    OpenAPIRoute,
    contentJson,
    InputValidationException,
    NotFoundException,
    UnauthorizedException,
} from 'chanfana';

class GetUser extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({ id: z.uuid() }),
        },
        responses: {
            "200": {
                description: 'User found',
                ...contentJson(UserSchema),
            },
            ...InputValidationException.schema(),  // Documents 400 response
            ...UnauthorizedException.schema(),      // Documents 401 response
            ...NotFoundException.schema(),          // Documents 404 response
        },
    };
}
```

## Part 5: Verification

### Checklist

**Basic Endpoints:**
- [ ] Schema defines `responses` (required, even if just 200)
- [ ] Using `contentJson()` wrapper for JSON request/response bodies
- [ ] Using `await this.getValidatedData<typeof this.schema>()` for type-safe access
- [ ] Using Zod v4 syntax (`z.email()` not `z.string().email()`)
- [ ] Path parameters in schema match route definition (`:userId` -> `params: z.object({ userId: ... })`)
- [ ] Exception responses documented using `...ExceptionClass.schema()` spread

**CRUD Auto Endpoints:**
- [ ] `_meta` property is defined on the endpoint class
- [ ] `_meta.model.schema` is a valid Zod object schema
- [ ] `_meta.model.primaryKeys` is an array of primary key field names
- [ ] `_meta.model.tableName` is set (required for D1 endpoints)
- [ ] Nested routes use `pathParameters` in meta for composite primary keys
- [ ] ListEndpoint has `filterFields`, `searchFields`, `orderByFields` configured as needed

**D1 Endpoints:**
- [ ] `dbName` matches the binding name in wrangler.toml
- [ ] `constraintsMessages` defined for UNIQUE constraint handling
- [ ] Hono app typed with `{ Bindings: { DB: D1Database } }`

### Common Mistakes

**1. Missing contentJson wrapper**
```typescript
// WRONG - response body not properly documented
responses: {
    "200": {
        description: 'Success',
        content: { 'application/json': { schema: z.object({...}) } }
    }
}

// CORRECT - use contentJson helper
responses: {
    "200": {
        description: 'Success',
        ...contentJson(z.object({...}))
    }
}
```

**2. Not awaiting getValidatedData**
```typescript
// WRONG - missing await
const data = this.getValidatedData<typeof this.schema>();

// CORRECT
const data = await this.getValidatedData<typeof this.schema>();
```

**3. Using Zod v3 syntax**
```typescript
// WRONG - Zod v3 syntax
z.string().email()
z.string().datetime()
z.object({}).strict()

// CORRECT - Zod v4 syntax
z.email()
z.iso.datetime()
z.strictObject({})
```

**4. Forgetting response schema**
```typescript
// WRONG - no responses defined
schema = { request: { ... } }

// CORRECT - always define responses
schema = {
    request: { ... },
    responses: { "200": { description: 'Success', ...contentJson(...) } }
}
```

**5. Primary key mismatch in nested routes**
```typescript
// WRONG - composite key not reflected in pathParameters
const postMeta = {
    model: {
        primaryKeys: ['userId', 'postId'],
    }
};
// Route: /users/:userId/posts/:postId but no pathParameters

// CORRECT - explicitly define pathParameters
const postMeta = {
    model: {
        primaryKeys: ['userId', 'postId'],
    },
    pathParameters: ['userId', 'postId'],
};
```

**6. Optional fields with defaults in Zod v4**
```typescript
// GOTCHA - Zod v4 always provides default values
const data = await this.getValidatedData();
// data.body.status is 'active' even if not sent in request

// SOLUTION - use getUnvalidatedData() to check what was actually sent
const raw = await this.getUnvalidatedData();
if ('status' in raw.body) {
    // status was actually sent
}
```

**7. D1 binding name mismatch**
```typescript
// WRONG - binding name doesn't match wrangler.toml
class MyEndpoint extends D1CreateEndpoint {
    dbName = 'DATABASE'; // wrangler.toml has binding = "DB"
}

// CORRECT
class MyEndpoint extends D1CreateEndpoint {
    dbName = 'DB'; // matches wrangler.toml [[d1_databases]] binding
}
```

**8. Missing _meta in auto endpoints**
```typescript
// WRONG - no _meta defined
class CreateUser extends CreateEndpoint {
    async create(data) { ... }
}

// CORRECT - _meta is required
class CreateUser extends CreateEndpoint {
    _meta = {
        model: {
            schema: UserSchema,
            primaryKeys: ['id'],
            tableName: 'users',
        },
    };
    async create(data) { ... }
}
```

**9. Using nativeEnum in Zod v4**
```typescript
// WRONG - Zod v3 syntax
enum Status { Active = 'active', Inactive = 'inactive' }
z.nativeEnum(Status)

// CORRECT - Zod v4 syntax
z.enum(['active', 'inactive'])
```
