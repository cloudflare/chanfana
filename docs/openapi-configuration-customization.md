# OpenAPI Configuration and Customization

Chanfana offers various options to configure and customize the generation of your OpenAPI document. These configurations are primarily set through the `RouterOptions` object when you initialize Chanfana using `fromHono` or `fromIttyRouter`. This section will explore the available configuration options and how to use them to tailor your OpenAPI specification.

## Configuring OpenAPI Document Generation

The primary way to configure OpenAPI document generation in Chanfana is through the `RouterOptions` object, which you pass as the second argument to `fromHono` or `fromIttyRouter`.

**Example: Configuring Router Options**

```typescript
import { Hono } from 'hono';
import { fromHono } from 'chanfana';

const app = new Hono();

const openapi = fromHono(app, {
    base: '/api/v1', // Base path for all API routes
    schema: {
        info: {
            title: 'My Awesome API',
            version: '2.0.0',
            description: 'This is the documentation for my awesome API.',
            termsOfService: 'https://example.com/terms/',
            contact: {
                name: 'API Support',
                url: 'https://example.com/support',
                email: 'support@example.com',
            },
            license: {
                name: 'Apache 2.0',
                url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
            },
        },
        servers: [
            { url: 'https://api.example.com/api/v1', description: 'Production server' },
            { url: 'http://localhost:3000/api/v1', description: 'Development server' },
        ],
        tags: [
            { name: 'users', description: 'Operations related to users' },
            { name: 'products', description: 'Operations related to products' },
        ],
    },
    docs_url: '/api/v1/docs',
    redoc_url: '/api/v1/redocs',
    openapi_url: '/api/v1/openapi.json',
    openapiVersion: '3.1', // or '3' for OpenAPI v3.0.3
    generateOperationIds: true,
    raiseUnknownParameters: false,
});

// ... register your endpoints using 'openapi' ...
```

## `RouterOptions`: Controlling OpenAPI Behavior

The `RouterOptions` object accepts the following properties to customize Chanfana's behavior:

### `base`: Setting the Base Path for API Routes

*   **Type:** `string`
*   **Default:** `undefined`

The `base` option sets a base path for all API routes managed by Chanfana. When provided, this base path is prepended to all route paths in the generated OpenAPI document. This is useful when your API is served under a specific path prefix (e.g., `/api/v1`).

The `base` value must start with `/` and must not end with `/` (e.g., `/api/v1` is valid, `api/v1` and `/api/v1/` are not).

**With Hono**, the `base` option also applies Hono's `basePath()` internally, so routes actually match at the prefixed path — not just in the schema. You can use either approach:

```typescript
// Option 1: Use chanfana's base option (chanfana calls basePath internally)
const router = fromHono(new Hono(), { base: '/api/v1' });

// Option 2: Use Hono's basePath directly (chanfana auto-detects it)
const router = fromHono(new Hono().basePath('/api/v1'));

// Both result in:
router.get('/users', UserListEndpoint);     // Route matches at /api/v1/users
router.get('/users/:userId', UserGetEndpoint); // Route matches at /api/v1/users/{userId}
```

::: warning
Do not combine both Hono's `basePath()` and chanfana's `base` option — this will throw an error. Use one or the other.
:::

**With itty-router**, `base` only affects the OpenAPI schema (not route matching). You must also pass the `base` to `AutoRouter` for route matching:

```typescript
const router = fromIttyRouter(AutoRouter({ base: '/api' }), { base: '/api' });
```

### `schema`: Customizing OpenAPI Document Information

*   **Type:** `Partial<OpenAPIObjectConfigV31 | OpenAPIObjectConfig>`
*   **Default:** `{ info: { title: 'OpenAPI', version: '1.0.0' } }`

The `schema` option allows you to provide a partial OpenAPI object configuration to customize the root-level properties of your generated OpenAPI document. This is where you can set metadata like API title, version, description, contact information, license, servers, and tags.

**Properties you can customize within `schema`:**

*   **`info`:** (OpenAPI `Info` Object)  Provides metadata about the API.
    *   `title`: API title (required).
    *   `version`: API version (required).
    *   `description`: API description.
    *   `termsOfService`: Terms of service URL.
    *   `contact`: Contact information for the API.
        *   `name`: Contact name.
        *   `url`: Contact URL.
        *   `email`: Contact email.
    *   `license`: License information for the API.
        *   `name`: License name.
        *   `url`: License URL.
*   **`servers`:** (Array of OpenAPI `Server` Objects) Defines the API servers.
    *   `url`: Server URL (required).
    *   `description`: Server description (optional).
    *   `variables`: Server variables (optional).
*   **`tags`:** (Array of OpenAPI `Tag` Objects) Defines tags for organizing operations in the OpenAPI document.
    *   `name`: Tag name (required).
    *   `description`: Tag description (optional).
    *   `externalDocs`: External documentation for the tag (optional).
*   **`externalDocs`:** (OpenAPI `ExternalDocumentation` Object)  Provides external documentation for the API as a whole.
    *   `description`: Description of external documentation.
    *   `url`: URL for external documentation (required).

Refer to the [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0.html#oasObject) for details on these properties and their structure.

### `docs_url`, `redoc_url`, `openapi_url`: Configuring Documentation Endpoints

*   **Type:** `string | null`
*   **Default:**
    *   `docs_url`: `"/docs"`
    *   `redoc_url`: `"/redocs"`
    *   `openapi_url`: `"/openapi.json"`

These options control the URLs at which Chanfana serves the OpenAPI documentation and schema:

*   **`docs_url`:**  URL path to serve Swagger UI. Set to `null` to disable Swagger UI documentation.
*   **`redoc_url`:** URL path to serve ReDoc UI. Set to `null` to disable ReDoc UI documentation.
*   **`openapi_url`:** URL path to serve the raw OpenAPI JSON schema. Set to `null` to disable serving the OpenAPI schema.

Chanfana automatically creates routes in your router to serve these documentation UIs and the OpenAPI schema at the specified URLs.

### `openapiVersion`: Selecting OpenAPI Version (3 or 3.1)

*   **Type:** `"3" | "3.1"`
*   **Default:** `"3.1"`

The `openapiVersion` option allows you to choose between generating OpenAPI v3.0.3 or v3.1.0 compliant schemas.

*   `"3"`: Generates OpenAPI v3.0.3 specification.
*   `"3.1"`: Generates OpenAPI v3.1.0 specification (default).

Choose the version that best suits your needs and the tools you are using to consume your OpenAPI document. OpenAPI 3.1 is the latest version and offers some advantages, but OpenAPI 3.0.3 is still widely supported.

### `generateOperationIds`: Controlling Operation ID Generation

*   **Type:** `boolean`
*   **Default:** `true`

The `generateOperationIds` option controls whether Chanfana should automatically generate `operationId` values for your OpenAPI operations.

*   `true`: (Default) Chanfana automatically generates `operationId` values based on the HTTP method and route path (e.g., `get_users_userId`).
*   `false`: Chanfana will **not** automatically generate `operationId` values. In this case, you **must** provide `operationId` explicitly in your endpoint's `schema` definition. If you don't provide `operationId` when `generateOperationIds` is `false`, Chanfana will throw an error.

`operationId` values are used to uniquely identify operations in your OpenAPI document and are often used by code generation tools and API clients.

### `raiseUnknownParameters`: Strict Parameter Validation

*   **Type:** `boolean`
*   **Default:** `true`

The `raiseUnknownParameters` option controls whether Chanfana should perform strict validation of request parameters (query, path, headers, body).

*   `true`: (Default) Strict validation is enabled. If the incoming request contains parameters that are **not** defined in your schema, Chanfana will consider it a validation error and return a `400 Bad Request` response. This is generally recommended for API robustness and security.
*   `false`: Strict validation is disabled. Chanfana will only validate the parameters that are defined in your schema and ignore any unknown parameters in the request. This can be useful for backward compatibility or when you want to allow clients to send extra parameters that your API might not explicitly handle.

### `raiseOnError`: Error Propagation to Router Error Handlers

*   **Type:** `boolean`
*   **Default:** `true` for Hono (set automatically by `fromHono`), `false` for itty-router

The `raiseOnError` option controls whether chanfana re-throws errors instead of catching and formatting them internally.

*   `true`: Errors are re-thrown from `execute()`, allowing the router's native error handler to process them. For Hono, chanfana converts errors to `HTTPException` instances that flow through `app.onError`.
*   `false`: Errors are caught internally and formatted into JSON responses directly (the default for itty-router).

**Note:** When using `fromHono()`, this option is always set to `true` automatically. When using `fromIttyRouter()`, this option is always stripped and defaults to `false`, since itty-router has no `onError` mechanism. You do not need to set this option manually.

See [Error Handling - Global Error Handling Strategies](./error-handling.md#global-error-handling-strategies) for usage details.

### `passthroughErrors`: Bypass Chanfana Error Handling

*   **Type:** `boolean`
*   **Default:** `false`

The `passthroughErrors` option disables all of chanfana's error handling. When set to `true`, errors thrown during `handle()` (or during request validation) propagate as-is to the framework's error handler — chanfana does not catch, format, or wrap them in any way.

*   `true`: Errors are re-thrown immediately from `execute()` without any processing. The `handleError()` hook, `formatChanfanaError()`, and Hono's `HTTPException` wrapping are all skipped. Raw exceptions (`ApiException`, `ZodError`, `Error`, etc.) reach Hono's `app.onError` directly.
*   `false`: (Default) Chanfana handles errors normally — formatting them into JSON responses or wrapping them as `HTTPException` for Hono.

**Example:**

```typescript
import { Hono } from 'hono';
import { fromHono, NotFoundException } from 'chanfana';

const app = new Hono();

app.onError((err, c) => {
    // Errors arrive as raw exceptions — NotFoundException, ZodError, etc.
    // No HTTPException wrapping, no chanfana JSON formatting.
    if (err instanceof NotFoundException) {
        return c.json({ ok: false, message: err.message }, 404);
    }
    return c.json({ ok: false, message: 'Internal Server Error' }, 500);
});

const openapi = fromHono(app, { passthroughErrors: true });
```

::: tip
This option is most useful with Hono, where `app.onError` provides centralized error handling. With itty-router (which has no `onError` mechanism), enabling `passthroughErrors` causes errors to propagate unhandled.
:::

See [Error Handling - Bypassing Chanfana's Error Formatting](./error-handling.md#bypassing-chanfanas-error-formatting) for a detailed walkthrough.

### `validateResponse`: Response Body Validation

*   **Type:** `boolean`
*   **Default:** `false`

The `validateResponse` option enables runtime validation of response bodies against their declared Zod schemas. When enabled, every response from `handle()` is parsed through the matching Zod response schema before being sent to the client.

This provides two key benefits:

1.  **Data leak prevention:** Unknown fields are stripped from responses, so internal properties (e.g., `passwordHash`, `internalNotes`) never accidentally reach the client.
2.  **Handler bug detection:** If a handler returns data missing required fields or with wrong types, the mismatch is caught immediately instead of silently returning malformed responses.

**Example:**

```typescript
import { Hono } from 'hono';
import { fromHono, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

class GetUserEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": {
                description: "User details",
                ...contentJson(z.object({
                    id: z.number(),
                    name: z.string(),
                })),
            },
        },
    };

    async handle(c) {
        const user = await db.getUser(1);
        // Even if `user` contains { id: 1, name: "Alice", passwordHash: "..." },
        // the response will only include { id: 1, name: "Alice" }
        return user;
    }
}

const app = new Hono();
const router = fromHono(app, { validateResponse: true });
router.get("/user/:id", GetUserEndpoint);
```

**How it works:**

| Response type | Behavior |
|---|---|
| Plain object | Validated against the `200` response schema |
| `Response` with `application/json` | Body is cloned, validated against the schema matching `resp.status`, and reconstructed with corrected headers |
| `Response` with non-JSON content type | Passed through unchanged |
| No Zod schema defined for the status code | Passed through unchanged |
| `null` or `undefined` | Passed through unchanged |

**When validation fails** (e.g., a required field is missing from the response), chanfana:

1.  Logs the full error details via `console.error` for server-side debugging.
2.  Returns a `500 Internal Server Error` response with error code `7013`. The error message is hidden from clients (`isVisible: false`) to avoid leaking internal schema details.

```json
{
    "success": false,
    "errors": [{ "code": 7013, "message": "Internal Error" }],
    "result": {}
}
```

::: tip
Response validation failures are **server-side bugs** (the handler doesn't match its declared schema), which is why they return `500` — not `400`. Check `console.error` output for the specific Zod validation issues.
:::

::: warning
This option adds a parsing step to every response. For most APIs the overhead is negligible, but for extremely high-throughput endpoints returning large payloads you may want to enable it selectively or only in development/staging.
:::

## Customizing OpenAPI Schema Output

While `RouterOptions` allows you to configure the overall OpenAPI document, you can also customize the schema output for individual endpoints and parameters using Zod's OpenAPI metadata features.

*   **`describe()`:** Use Zod's `describe()` method to add descriptions to your schema fields, which will be included in the OpenAPI documentation.
*   **`openapi()`:** Use Zod's `openapi()` method to provide OpenAPI-specific metadata, such as examples, formats, and other schema extensions.

Refer to the [Zod-to-OpenAPI documentation](https://github.com/asteasolutions/zod-to-openapi) and [Zod documentation](https://zod.dev/) for more details on schema customization options.

## Serving OpenAPI Documentation (Swagger UI, ReDoc)

Chanfana makes it easy to serve interactive API documentation using Swagger UI and ReDoc. By default, if you provide `docs_url` and `openapi_url` (or `redoc_url` and `openapi_url`) in `RouterOptions`, Chanfana automatically sets up routes to serve these documentation UIs.

*   **Swagger UI:** Served at the URL specified in `docs_url` (default: `/docs`). Provides an interactive, visual interface for exploring and testing your API.
*   **ReDoc:** Served at the URL specified in `redoc_url` (default: `/redocs`). Provides a clean, three-panel documentation layout, often preferred for its readability.

Both Swagger UI and ReDoc are served as static HTML pages that fetch your OpenAPI schema from the `openapi_url` (default: `/openapi.json`) and render the documentation dynamically.

You can customize the URLs for these documentation endpoints using the `docs_url`, `redoc_url`, and `openapi_url` options in `RouterOptions`, or disable serving specific documentation UIs by setting their corresponding URL option to `null`.

---

By understanding and utilizing these OpenAPI configuration and customization options, you can fine-tune Chanfana to generate OpenAPI documents that accurately represent your API, meet your documentation requirements, and enhance the developer experience for your API consumers.
