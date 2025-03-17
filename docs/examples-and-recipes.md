# Examples and Recipes

This section provides practical examples and recipes for common API development tasks using Chanfana. These examples are designed to be hands-on and demonstrate how to apply Chanfana's features in real-world scenarios.

## Complete API Example: A Simple Task Management API (Hono and D1)

Let's build a complete example of a simple Task Management API using Hono, Chanfana, and Cloudflare D1 for data persistence. This example will demonstrate CRUD operations for tasks, including listing, creating, reading, updating, and deleting tasks.

**Project Setup:**

1.  **Create a new Cloudflare Workers project:**

    ```bash
    npm create cloudflare@latest my-task-api -- --no-deploy
    cd my-task-api
    ```

2.  **Install dependencies:**

    ```bash
    npm install hono chanfana zod
    ```

3.  **Set up D1 binding in `wrangler.toml`:**

    ```toml
    name = "my-task-api"
    main = "src/index.ts"
    compatibility_date = "2024-01-01"

    [[d1_databases]]
    binding = "DB"
    database_name = "task-database"
    database_id = "your-database-id" # Replace with your D1 database ID
    ```

4.  **Create `src/index.ts` with the following code:**

    ```typescript
    import { Hono } from 'hono';
    import { fromHono, D1CreateEndpoint, D1ReadEndpoint, D1UpdateEndpoint, D1DeleteEndpoint, D1ListEndpoint, contentJson } from 'chanfana';
    import { z } from 'zod';

    // Task Model
    const TaskModel = z.object({
        id: z.string().uuid(),
        title: z.string().min(3).max(100),
        description: z.string().optional(),
        completed: z.boolean().default(false),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime().optional(),
    });

    // Task Meta
    const taskMeta = {
        model: {
            schema: TaskModel,
            primaryKeys: ['id'],
            tableName: 'tasks',
        },
    };

    // Endpoints
    class CreateTask extends D1CreateEndpoint { _meta = taskMeta; dbName = 'DB'; }
    class GetTask extends D1ReadEndpoint { _meta = taskMeta; dbName = 'DB'; }
    class UpdateTask extends D1UpdateEndpoint { _meta = taskMeta; dbName = 'DB'; }
    class DeleteTask extends D1DeleteEndpoint { _meta = taskMeta; dbName = 'DB'; }
    class ListTasks extends D1ListEndpoint { _meta = taskMeta; dbName = 'DB'; }


    const app = new Hono<{ Bindings: { DB: D1Database } }>();
    const openapi = fromHono(app);

    openapi.post('/tasks', CreateTask);
    openapi.get('/tasks/:id', GetTask);
    openapi.put('/tasks/:id', UpdateTask);
    openapi.delete('/tasks/:id', DeleteTask);
    openapi.get('/tasks', ListTasks);


    export default app;
    ```

5.  **Create a `migrations` directory and a migration file (e.g., `migrations/0001-create-tasks-table.sql`) with the following SQL to create the `tasks` table in your D1 database:**

    ```sql
    CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
    );
    ```

6.  **Apply the migration using `wrangler d1 migrations apply task-database --local` (or `--remote` for your deployed database).**

7.  **Run the API using `wrangler dev` and access the documentation at `http://localhost:8787/api/docs`.**

This example sets up a fully functional Task Management API with CRUD operations, input validation, OpenAPI documentation, and D1 database persistence, all with minimal code thanks to Chanfana's predefined D1 endpoints.

## OpenAPI schema customizations

Besides adding a schema to your endpoints, its also recommended you customize your schema. This can be done by passing
the schema argument when creating your router.

All [OpenAPI Object Properties](https://swagger.io/specification/#schema) except `paths`, `components` and `webhooks` are
available.

`paths` can only be added by registering routes like:
```ts
const router = Router()
const openAPI = fromIttyRouter(router)
openAPI.post('/scan/metadata/', ScanMetadataCreate)
```

`components` can only be added by registering them in the main router like:
```ts
const router = Router()
const openAPI = fromIttyRouter(router)
const bearerAuth = openAPI.registry.registerComponent(
  'securitySchemes',
  'bearerAuth',
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
)
```

Every other property must be defined in your main/root router as such:

```ts
const router = Router()
const openAPI = fromIttyRouter(router, {
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
    servers: [
      {
        "url": "https://development.gigantic-server.com/v1",
        "description": "Development server"
      },
      {
        "url": "https://staging.gigantic-server.com/v1",
        "description": "Staging server"
      },
      {
        "url": "https://api.gigantic-server.com/v1",
        "description": "Production server"
      }
    ]
  },
})
```

For more information on the structure of every available property you can read the specification for
[OpenAPI 3 here](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md) and
[OpenAPI 3.1 here](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md).

## Pagination for List Endpoints

Pagination is essential for list endpoints to handle large datasets efficiently. Chanfana's `ListEndpoint` and `D1ListEndpoint` automatically support pagination using query parameters `page` and `per_page`.

**Example: Pagination with `ListEndpoint`**

```typescript
// ... (ListEndpoint and Meta definition) ...

class MyListEndpoint extends ListEndpoint {
    _meta = myMeta; // Your Meta object

    async list(filters: any) {
        const page = filters.options.page;
        const perPage = filters.options.per_page;

        // ... logic to fetch paginated data from your data source ...
        const items = getPaginatedItems(page, perPage); // Assume this function fetches paginated data
        const totalCount = getTotalItemCount(); // Assume this function gets total count

        return {
            result: items,
            result_info: {
                page: page,
                per_page: perPage,
                total_count: totalCount,
            },
        };
    }
}
```

**Query Parameters:**

*   `page`: (integer, default: 1) Page number to retrieve.
*   `per_page`: (integer, default: 20, max: 100) Number of items per page.

Chanfana automatically documents these query parameters in your OpenAPI specification and makes them available in the `filters.options` object within your `list` method.

## Filtering for List Endpoints

Filtering allows clients to narrow down the results of list endpoints based on specific criteria. `ListEndpoint` and `D1ListEndpoint` provide built-in support for filtering based on the `filterFields` property.

**Example: Filtering with `D1ListEndpoint`**

```typescript
// ... (D1ListEndpoint and Meta definition) ...

class MyD1ListEndpoint extends D1ListEndpoint {
    _meta = myMeta; // Your Meta object
    filterFields = ['status', 'category']; // Enable filtering by 'status' and 'category' fields
}
```

**Query Parameters (for filtering, automatically generated based on `filterFields`):**

*   `status`: (string, optional) Filter by `status` field (exact match).
*   `category`: (string, optional) Filter by `category` field (exact match).

Chanfana automatically generates query parameters in your OpenAPI spec based on `filterFields`. In your `list` method (or the default D1 `list` method), the `filters.filters` array will contain filter conditions based on the provided query parameters.

## File Uploads (if supported, or planned)

*(Currently, Chanfana core library does not have built-in direct support for file uploads in terms of specialized parameter types or request body handling for `multipart/form-data`. However, you can handle file uploads using the underlying router's capabilities and standard Fetch API methods within your `OpenAPIRoute` endpoints.)*

**Example: Basic File Upload Handling in Hono (Conceptual)**

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

class UploadFileEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            // OpenAPI schema for multipart/form-data request (example - adjust as needed)
            body: {
                description: "File upload",
                content: {
                    "multipart/form-data": {
                        schema: {
                            type: "object",
                            properties: {
                                file: {
                                    type: "string",
                                    format: "binary",
                                    description: "File to upload"
                                },
                                description: {
                                    type: "string",
                                    description: "Optional file description"
                                }
                            },
                            required: ["file"]
                        }
                    }
                }
            }
        },
        responses: {
            "200": { description: 'File uploaded successfully' },
        },
    };

    async handle(c: AppContext) { // Hono Context
        const formData = await c.req.formData();
        const file = formData.get('file') as File;
        const description = formData.get('description') as string | null;

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'No file uploaded' }, 400);
        }

        // ... logic to process file upload (e.g., save to storage) ...

        return { message: 'File uploaded successfully', filename: file.name, size: file.size, description };
    }
}


const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);

openapi.post('/upload', UploadFileEndpoint);

export default app;
```

**Explanation:**

*   **OpenAPI Schema for `multipart/form-data`:** We manually define an OpenAPI schema for `multipart/form-data` request body within the `schema.request.body.content`. This example shows a basic schema with a `file` (binary format) and an optional `description` field. **Note:** Zod itself doesn't directly validate `multipart/form-data`.
*   **`handle` Method:**
    *   We use `c.req.formData()` (Hono-specific method to parse form data) to get the `FormData` object from the request.
    *   We extract the `file` and `description` fields from the `FormData`.
    *   We perform basic checks to ensure a file was uploaded.
    *   **File Processing Logic:** You would replace the `// ... logic to process file upload ...` comment with your actual file handling logic (e.g., saving to R2, cloud storage, etc.).

**Important Notes for File Uploads:**

*   **Zod Validation:** Zod is primarily designed for validating JSON-like data structures. Direct validation of `multipart/form-data` with Zod is not straightforward. You might need to perform manual validation of file types, sizes, etc., within your `handle` method.
*   **Streaming:** For large file uploads, consider using streaming techniques to avoid loading the entire file into memory at once. Refer to your router's documentation and Fetch API streams for handling large request bodies efficiently.
*   **Security:** Implement proper security measures for file uploads, including file type validation, size limits, and protection against malicious files.

*(Future versions of Chanfana might introduce more specialized parameter types or utilities for handling file uploads more seamlessly.)*

## API Authentication and Authorization (Basic Example)

API authentication and authorization are critical for securing your APIs. Here's a basic example of implementing API key-based authentication using middleware in Hono and Chanfana.

**Example: API Key Authentication Middleware**

```typescript
import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { fromHono, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

// API Key Authentication Middleware
const apiKeyAuthMiddleware = async (c, next) => {
    const apiKey = c.req.header('X-API-Key');
    if (!apiKey || apiKey !== process.env.API_KEY) { // Validate against API_KEY environment variable
        throw new HTTPException(401, { message: 'Invalid API Key.' })
    }
    await next();
};


class ProtectedDataEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": { description: 'Protected data' },
            "401": { description: 'Invalid API Key' },
        },
    };
    async handle(c: AppContext) {
        return { message: 'Access granted to protected data' };
    }
}


const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);

// Apply API Key authentication middleware to /protected route
openapi.get('/protected', apiKeyAuthMiddleware, ProtectedDataEndpoint);

export default app;
```

**Explanation:**

*   **`apiKeyAuthMiddleware`:** This middleware function:
    *   Retrieves the `X-API-Key` header from the request.
    *   Validates the API key against an expected value (e.g., from environment variables).
    *   If the API key is invalid or missing, it throws an `HTTPException`.
    *   If the API key is valid, it calls `next()` to proceed to the next handler in the chain (the endpoint).
*   **`ProtectedDataEndpoint`:** This endpoint is protected by the `apiKeyAuthMiddleware`. It also documents a `401 Unauthorized`.
*   **Applying Middleware:** We use `openapi.get('/protected', apiKeyAuthMiddleware, ProtectedDataEndpoint)` to apply the `apiKeyAuthMiddleware` to the `/protected` route.

**Security Considerations for Authentication:**

*   **Securely Store API Keys:** Never hardcode API keys directly in your code. Use environment variables or secure configuration management to store sensitive credentials.
*   **HTTPS:** Always use HTTPS to encrypt communication between clients and your API, protecting API keys and other sensitive data in transit.
*   **Rate Limiting and Abuse Prevention:** Implement rate limiting and other security measures to prevent abuse of your API and protect against brute-force attacks on authentication.
*   **More Robust Authentication Methods:** For production APIs, consider more robust authentication methods like OAuth 2.0, JWT (JSON Web Tokens), or session-based authentication, depending on your security requirements.

## Custom Error Handling

In order to customize the zod error formats, just overwrite the `handleValidationError` function in your endpoint class

```ts
import { OpenAPIRoute } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    // ...
  }

  handleValidationError(errors: z.ZodIssue[]): Response {
    return Response.json({
      errors: errors,
      success: false,
      result: {},
    }, {
      status: 400,
    })
  }

  async handle(c: Context) {
    // ...
  }
}
```

### Reusing errors handlers across the project

First define a generic class that extends `OpenAPIRoute`, in this function define you cross endpoint functions

```ts
import { OpenAPIRoute } from "chanfana";

class MyProjectRoute extends OpenAPIRoute {
  handleValidationError(errors: z.ZodIssue[]): Response {
    return Response.json({
      errors: errors,
      success: false,
      result: {},
    }, {
      status: 400,
    })
  }
}
```

Then, in your endpoint extend from the new class

```ts
import { MyProjectRoute } from './route'
import { Context } from 'hono'

export class ToDoList extends MyProjectRoute {
  schema = {
    // ...
  }

  async handle(c: Context) {
    // ...
  }
}
```

## Custom Response Formats

### Describing a binary file:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        description: 'PDF response',
        content: {
          'application/pdf': {
            schema: Str({ format: 'binary' }),
          },
        },
      },
    },
  }

  async handle(c: Context) {
    // ...
  }
}
```

### Describing multiple content types:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: z.object({
              title: z.string()
            }),
          },
          'audio/mpeg': {
            schema: Str({ format: 'binary' }),
          },
        },
      },
    },
  }

  async handle(c: Context) {
    // ...
  }
}
```

## Custom Response Headers

### Describing response headers:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    responses: {
      200: {
        description: 'Object with user data.',
        content: {
          'application/json': {
            schema: z.object({
              series: z.object({
                timestamps: z.string().date().array(),
                values: z.number().array(),
              })
            }),
          },
        },
        headers: {
          'x-bar': 'header-example',
          'x-foo': new Str({required: false}),
        },
      },
    },
  }


  async handle(c: Context) {
    // ...
  }
}
```

### Describing response headers with zod:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    responses: {
      200: {
        description: 'Object with user data.',
        content: {
          'application/json': {
            schema: z.object({
              series: z.object({
                timestamps: z.string().date().array(),
                values: z.number().array(),
              })
            }),
          },
        },
        headers: z.object({
          'x-bar': z.string()
        }),
      },
    },
  }


  async handle(c: Context) {
    // ...
  }
}
```

## Hiding Routes in OpenAPI Schema

If you don't want a route to be displayed in the openapi schema, just register it in the base router

```ts
import { fromIttyRouter } from 'chanfana'
import { Router } from 'itty-router'

const router = Router()
const openAPI = fromIttyRouter(router)

router.get(
  '/todos/:id',
  ({ params }) => new Response(`Todo #${params.id}`)
)
```

This endpoint will still be accessible, but will not be shown in the schema.

## Reusable Schemas

Before continuing, please learn more about [Reusing Descriptions by OpenAPI](https://learn.openapis.org/specification/components.html).

To start reusing your schemas, all you need to do is call the `.openapi("schema name here")` after any schema you have
defined. This includes `parameters`, `requestBody`, `responses` even `Enum`.

!!! note

    This is only available when using [chanfana types](../types.md#chanfana-types) or
    [zod types](../types.md#zod-types)


```ts
export class PutMetadata extends OpenAPIRoute {
  schema = {
    operationId: 'post-bucket-put-object-metadata',
    tags: ['Buckets'],
    summary: 'Update object metadata',
    parameters: {
      bucket: Path(String),
      key: Path(z.string().describe('base64 encoded file key')),
    },
    requestBody: z.object({
      customMetadata: z.record(z.string(), z.any())
    }).openapi("Object metadata")
  }

  // ...
}
```

Then when running the server, it would get rendered like this:

![Reusable Parameters](https://raw.githubusercontent.com/cloudflare/chanfana/main/docs/images/reusable-parameters.png)

The OpenAPI spec will also reflect this, by moving the schemas out of the endpoint and into the `components`:

```json
{
  "components": {
    "schemas": {
      "Object metadata": {
        "type": "object",
        "properties": {
          "customMetadata": {
            "type": "object",
            "additionalProperties": {}
          }
        },
        "required": [
          "customMetadata"
        ]
      }
    }
  }
}
```

Inside the endpoint schema, the reusable parameter is referenced by the name:

```json
{
  "paths": {
    "post": {
      "operationId": "post-bucket-put-object-metadata",
      "tags": [
        "Buckets"
      ],
      "summary": "Update object metadata",
      "parameters": [],
      "requestBody": {
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Object metadata"
            }
          }
        }
      },
      "responses": {}
    }
  }
}
}
```

## Accessing URL parameters from the class schema

You can now get a list of url parameters inside the getSchema function.
This can be very helpful when auto generating schemas

```ts
import { OpenAPIRoute } from './route'

// Define route
router.get("/v1/:account_id/gateways/:gateway_id", GetGateway);

export class GetAccountStats extends OpenAPIRoute {
	getSchema() {
    console.log(this.params.urlParams)

    // The line above will print this: ["account_id", "gateway_id"]
    // You can use this to manipulate the schema, adding or removing fields

		return this.schema
	}
};
```

## CI/CD Pipelines

For CI/CD pipelines, you can read the complete `openapi.json` schemas by calling the `schema` property from the router
instance.

Here is an example of a nodejs script that would pick the schema, make some changes and write it to a file, to be able
to
be picked from a CI/CD pipeline.

```ts
import fs from 'fs'
import { openAPI } from '../src/router'

// Get the Schema from chanfana
const schema = openAPI.schema

// Optionaly: update the schema with some costumizations for publishing

// Write the final schema
fs.writeFileSync('./public-api.json', JSON.stringify(schema, null, 2))
```

---

These examples and recipes provide a starting point for building various types of APIs with Chanfana. You can adapt and extend these patterns to create more complex and feature-rich APIs tailored to your specific needs.
