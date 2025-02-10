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

The `base` option allows you to set a base path for all API routes managed by Chanfana. If provided, this base path will be prepended to all route paths when generating the OpenAPI document. This is useful when your API is served under a specific path prefix (e.g., `/api/v1`).

**Example:**

```typescript
fromHono(app, { base: '/api/v1' });

openapi.get('/users', UserListEndpoint); // OpenAPI path will be /api/v1/users
openapi.get('/users/:userId', UserGetEndpoint); // OpenAPI path will be /api/v1/users/{userId}
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

## Customizing OpenAPI Schema Output

While `RouterOptions` allows you to configure the overall OpenAPI document, you can also customize the schema output for individual endpoints and parameters using Zod's OpenAPI metadata features and Chanfana's parameter types (e.g., `Str`, `Num`, `Enumeration`).

*   **`describe()`:** Use Zod's `describe()` method to add descriptions to your schema fields, which will be included in the OpenAPI documentation.
*   **`openapi()`:** Use Zod's `openapi()` method to provide OpenAPI-specific metadata, such as examples, formats, and other schema extensions.
*   **Chanfana Parameter Type Options:**  Options like `description`, `example`, `format`, `required`, and `default` in Chanfana's parameter types (`Str`, `Num`, `Enumeration`, etc.) are directly translated into OpenAPI schema properties.

Refer to the [Zod-to-OpenAPI documentation](https://github.com/asteasolutions/zod-to-openapi) and [Zod documentation](https://zod.dev/) for more details on schema customization options.

## Serving OpenAPI Documentation (Swagger UI, ReDoc)

Chanfana makes it easy to serve interactive API documentation using Swagger UI and ReDoc. By default, if you provide `docs_url` and `openapi_url` (or `redoc_url` and `openapi_url`) in `RouterOptions`, Chanfana automatically sets up routes to serve these documentation UIs.

*   **Swagger UI:** Served at the URL specified in `docs_url` (default: `/docs`). Provides an interactive, visual interface for exploring and testing your API.
*   **ReDoc:** Served at the URL specified in `redoc_url` (default: `/redocs`). Provides a clean, three-panel documentation layout, often preferred for its readability.

Both Swagger UI and ReDoc are served as static HTML pages that fetch your OpenAPI schema from the `openapi_url` (default: `/openapi.json`) and render the documentation dynamically.

You can customize the URLs for these documentation endpoints using the `docs_url`, `redoc_url`, and `openapi_url` options in `RouterOptions`, or disable serving specific documentation UIs by setting their corresponding URL option to `null`.

---

By understanding and utilizing these OpenAPI configuration and customization options, you can fine-tune Chanfana to generate OpenAPI documents that accurately represent your API, meet your documentation requirements, and enhance the developer experience for your API consumers.
