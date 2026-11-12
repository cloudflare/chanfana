# Adapters: Integrating with Routers

Chanfana is designed to be router-agnostic, allowing you to integrate it with various JavaScript web routers. Adapters are the bridge that connects Chanfana's OpenAPI functionality to specific router implementations. Currently, Chanfana provides adapters for [Hono](https://github.com/honojs/hono) and [itty-router](https://github.com/kwhitley/itty-router), two popular choices for modern JavaScript runtimes, especially Cloudflare Workers.

## Introduction to Adapters

Adapters in Chanfana serve the following key purposes:

*   **Router Integration:** They provide specific functions and classes to seamlessly integrate Chanfana's OpenAPI schema generation, validation, and documentation features into the routing mechanism of a particular router library.
*   **Request Handling Abstraction:** Adapters abstract away the router-specific details of request and response handling, allowing Chanfana's core logic to remain router-independent.
*   **Middleware Compatibility:** They ensure compatibility with the middleware ecosystem of the target router, allowing you to use existing middleware alongside Chanfana's features.

Chanfana provides two main adapters:

*   **Hono Adapter (`fromHono`):** For integrating with Hono applications.
*   **Itty Router Adapter (`fromIttyRouter`):** For integrating with itty-router applications.

## Hono Adapter (`fromHono`)

The `fromHono` adapter is used to extend your Hono applications with Chanfana's OpenAPI capabilities. It provides the `fromHono` function and the `HonoOpenAPIRouterType` type.

### Setting up Chanfana with Hono

To integrate Chanfana into your Hono application, you use the `fromHono` function.

**Example: Basic Hono Integration**

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export type Env = {
    // Example bindings
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

class MyEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": { description: 'Success' },
        },
    };
    async handle(c: AppContext) {
        return { message: 'Hello from Hono!' };
    }
}

const app = new Hono<{ Bindings: Env }>();

// Initialize Chanfana for Hono using fromHono
const openapi = fromHono(app);

// Register your OpenAPIRoute endpoints using the openapi instance
openapi.get('/hello', MyEndpoint);

export default app;
```

**Explanation:**

1.  **Import `fromHono`:** Import the `fromHono` function (and other necessary components like `OpenAPIRoute`) from the `chanfana` package.
2.  **Create a Hono App:** Create a standard Hono application instance using `new Hono()`.
3.  **Initialize Chanfana with `fromHono`:** Call `fromHono(app, options)` to initialize Chanfana for your Hono app.
    *   The first argument is your Hono application instance (`app`).
    *   The second argument is an optional `RouterOptions` object to configure Chanfana (e.g., `openapi_url`, `docs_url`).
    *   **Base path:** Chanfana automatically detects Hono's `basePath()`. You can use either `fromHono(new Hono().basePath('/api'))` or `fromHono(new Hono(), { base: '/api' })` — both configure route matching, schema generation, and documentation URLs correctly. Do not combine both approaches.
4.  **Use `openapi` to Register Routes:** Use the `openapi` instance (returned by `fromHono`) to register your `OpenAPIRoute` classes for different HTTP methods (`get`, `post`, `put`, `delete`, `patch`, `all`, `on`, `route`). These methods work similarly to Hono's routing methods but are extended with Chanfana's OpenAPI features.

### Extending Existing Hono Applications

`fromHono` is designed to be non-intrusive and can be easily integrated into existing Hono applications without requiring major code changes. You can gradually add OpenAPI documentation and validation to your existing routes by converting your route handlers to `OpenAPIRoute` classes and registering them using the `openapi` instance.

**Example: Extending an Existing Hono App**

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute } from 'chanfana';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

const app = new Hono<{ Bindings: Env }>();

// Existing Hono route (without OpenAPI)
app.get('/legacy-route', (c) => c.text('This is a legacy route'));

// Initialize Chanfana
const openapi = fromHono(app);

// New OpenAPI-documented route
class NewEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": { description: 'Success' },
        },
    };
    async handle(c: AppContext) {
        return { message: 'This is a new OpenAPI route!' };
    }
}
openapi.get('/new-route', NewEndpoint);

export default app;
```

In this example, we have an existing Hono route `/legacy-route` that is not managed by Chanfana. We then initialize Chanfana using `fromHono` and register a new route `/new-route` using `OpenAPIRoute` and `openapi.get()`. Both routes will coexist in the same Hono application. Only the `/new-route` will have OpenAPI documentation and validation.

### Error Handling with Hono

When using `fromHono()`, chanfana automatically converts its errors (validation errors and `ApiException` subclasses) into Hono `HTTPException` instances. This means errors flow through Hono's `app.onError` handler for centralized logging, monitoring, or custom error formatting.

If you don't define an `onError` handler, Hono's default handler calls `HTTPException.getResponse()` which returns chanfana's standard JSON error response -- no setup needed.

```typescript
import { HTTPException } from 'hono/http-exception';

app.onError((err, c) => {
    console.error(err); // Log all errors centrally

    if (err instanceof HTTPException) {
        return err.getResponse(); // Chanfana's formatted error response
    }

    return c.json({ error: 'Internal Server Error' }, 500);
});

const openapi = fromHono(app);
```

If you want errors to reach `onError` without chanfana formatting or wrapping them, use the `passthroughErrors` option:

```typescript
const openapi = fromHono(app, { passthroughErrors: true });
```

With this flag, raw exceptions (`NotFoundException`, `ZodError`, etc.) propagate directly to `onError` — no `HTTPException` wrapping, no JSON formatting. See [Bypassing Chanfana's Error Formatting](./error-handling.md#bypassing-chanfanas-error-formatting) for details.

See [Error Handling - Global Error Handling Strategies](./error-handling.md#global-error-handling-strategies) for more details.

### `HonoOpenAPIRouterType`

The `fromHono` function returns an object of type `HonoOpenAPIRouterType`. This type is an intersection of `Hono` and `OpenAPIRouterType`, extending the standard Hono application instance with Chanfana's OpenAPI routing methods and properties.

**Key extensions provided by `HonoOpenAPIRouterType`:**

*   **OpenAPI Routing Methods:**  `get()`, `post()`, `put()`, `delete()`, `patch()`, `all()`, `on()`, `route()` methods are extended to handle `OpenAPIRoute` classes and automatically register them for OpenAPI documentation and validation.
*   **`original` Property:**  Provides access to the original Hono application instance.
*   **`options` Property:**  Provides access to the `RouterOptions` passed to `fromHono`.
*   **`registry` Property:**  Provides access to the OpenAPI registry used by Chanfana to collect schema definitions.
*   **`schema()` Method:**  Returns the generated OpenAPI schema as a JavaScript object.

### Typed RPC Client (`hono/client`)

Routes registered on the router returned by `fromHono` keep Hono's route types, so you can use [Hono's RPC client](https://hono.dev/docs/guides/rpc) (`hc`) with Chanfana endpoints. As with plain Hono, **chain** the route registrations and export the type of the result:

```typescript
// server.ts
import { Hono } from "hono";
import { contentJson, fromHono, OpenAPIRoute } from "chanfana";
import { z } from "zod";

const Task = z.object({ id: z.number(), name: z.string() });

class TaskFetch extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({ id: z.number() }),
      query: z.object({ verbose: z.boolean().optional() }),
    },
    responses: {
      "200": { description: "The task", ...contentJson(z.object({ task: Task })) },
      "404": { description: "Not found", ...contentJson(z.object({ error: z.string() })) },
    },
  };

  async handle() {
    const { params } = await this.getValidatedData<typeof this.schema>();
    return { task: { id: params.id, name: "Write docs" } };
  }
}

class TaskCreate extends OpenAPIRoute {
  schema = {
    request: { body: contentJson(z.object({ name: z.string() })) },
    responses: { "201": { description: "Created", ...contentJson(Task) } },
  };

  async handle() {
    const { body } = await this.getValidatedData<typeof this.schema>();
    return Response.json({ id: 1, name: body.name }, { status: 201 });
  }
}

const app = new Hono();
const openapi = fromHono(app);

const routes = openapi.get("/tasks/:id", TaskFetch).post("/tasks", TaskCreate);

export type AppType = typeof routes;
export default app;
```

```typescript
// client.ts
import { hc } from "hono/client";
import type { AppType } from "./server";

const client = hc<AppType>("https://api.example.com");

const res = await client.tasks[":id"].$get({ param: { id: "1" }, query: { verbose: "true" } });
if (res.status === 200) {
  const { task } = await res.json(); // { id: number; name: string }
}

await client.tasks.$post({ json: { name: "Write docs" } });
```

The client types are inferred from the endpoint's `schema` property:

| Endpoint schema | RPC client |
| --- | --- |
| `request.params` | `param` (values typed as strings) |
| `request.query` | `query` (values typed as strings, string enums kept) |
| `request.headers` (Zod object) | `header` (values typed as strings) |
| `request.body` with an `application/json` Zod schema | `json` |
| `responses[status]` with an `application/json` Zod schema | `res.json()` for that status (JSON-serialized output type) |

Path, query and header values travel as strings in the URL and headers, so the client accepts strings; Chanfana coerces them to the types in your schema on the server. A `query`, `param` or `header` object whose fields are all optional can be omitted.

Response types describe the JSON the client receives, the same way Hono types `c.json()`: the schema's output type is mapped through Hono's `JSONParsed`, so a `z.date()` field is a `string` in `res.json()`, and values that `JSON.stringify()` can't serialize (such as `bigint`) become `never`.

**Limitations:**

*   Only the declared type of the `schema` property is used. If it is annotated as `OpenAPIRouteSchema` (for example `schema: OpenAPIRouteSchema = {...}`), built in `getSchema()`, or generated at runtime (auto endpoints such as `CreateEndpoint`), the route is still registered, but its input and output are untyped, as with a plain Hono handler without validators.
*   Bodies declared with `contentJson()` use the schema's output type, because `contentJson()` doesn't keep the schema's input type. Fields with a `.default()` are then required in the client, and a `z.preprocess()` body is typed with its parsed type. Use `{ content: { "application/json": { schema } } }` directly to get the input type (fields with defaults become optional; a `z.preprocess()` body accepts `unknown`).
*   Response types are declared, not checked: they come from the schema, not from what `handle()` returns. Enable [`validateResponse`](./openapi-configuration-customization.md#validateresponse-response-body-validation) to enforce them at runtime.
*   Form, cookie and non-JSON request bodies are not typed. Routes registered with `on()` are not typed.
*   Route-level middleware combined with an endpoint class (`openapi.get(path, middleware, Endpoint)`) works at runtime but is not accepted by the TypeScript types. Register the middleware with `app.use(path, middleware)` instead.
*   Routes must be chained (or the type of each step reassigned); registering them as separate statements keeps the router's type unchanged, as in Hono.

### Example with Hono

Refer to the [Quick Start with Hono](./getting-started.md#quick-start-with-hono) section for a complete example of setting up Chanfana with Hono and creating a basic endpoint.

## Itty Router Adapter (`fromIttyRouter`)

The `fromIttyRouter` adapter is used to integrate Chanfana with [itty-router](https://github.com/kwhitley/itty-router) applications. It provides the `fromIttyRouter` function and the `IttyRouterOpenAPIRouterType` type.

### Setting up Chanfana with Itty Router

To integrate Chanfana into your itty-router application, you use the `fromIttyRouter` function.

**Example: Basic Itty Router Integration**

```typescript
import { Router } from 'itty-router';
import { fromIttyRouter, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

class MyEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": { description: 'Success' },
        },
    };
    async handle(request: Request, env, ctx) {
        return { message: 'Hello from itty-router!' };
    }
}

const router = Router();

// Initialize Chanfana for itty-router using fromIttyRouter
const openapi = fromIttyRouter(router);

// Register your OpenAPIRoute endpoints using the openapi instance
openapi.get('/hello', MyEndpoint);

// Add a default handler for itty-router (required)
router.all('*', () => new Response("Not Found.", { status: 404 }));

export const fetch = router.handle; // Export the fetch handler
```

**Explanation:**

1.  **Import `fromIttyRouter`:** Import the `fromIttyRouter` function (and other necessary components like `OpenAPIRoute`) from the `chanfana` package.
2.  **Create an Itty Router Instance:** Create an itty-router instance using `Router()`.
3.  **Initialize Chanfana with `fromIttyRouter`:** Call `fromIttyRouter(router, options)` to initialize Chanfana for your itty-router instance.
    *   The first argument is your itty-router instance (`router`).
    *   The second argument is the optional `RouterOptions` object.
4.  **Use `openapi` to Register Routes:** Use the `openapi` instance to register your `OpenAPIRoute` classes for different HTTP methods (`get`, `post`, `put`, `delete`, `patch`, `all`). These methods extend itty-router's routing methods with Chanfana's OpenAPI features.
5.  **Add Default Handler:** Itty-router requires a default handler to be registered using `router.all('*', ...)`. This is necessary for itty-router to function correctly.
6.  **Export `fetch` Handler:** Export the `router.handle` function as `fetch`. This is the standard way to export an itty-router application for Cloudflare Workers or other Fetch API environments.

### Extending Existing Itty Router Applications

Similar to Hono, `fromIttyRouter` can be integrated into existing itty-router applications without major refactoring. You can gradually add OpenAPI documentation and validation to your routes.

### `IttyRouterOpenAPIRouterType`

The `fromIttyRouter` function returns an object of type `IttyRouterOpenAPIRouterType`. This type extends the original itty-router instance with Chanfana's OpenAPI routing methods and properties, similar to `HonoOpenAPIRouterType`.

### Example with Itty Router

Refer to the [Quick Start with Itty Router](./getting-started.md#quick-start-with-itty-router) section for a complete example of setting up Chanfana with itty-router and creating a basic endpoint.

## Choosing the Right Adapter

Choose the adapter that corresponds to the web router you are using in your project:

*   Use `fromHono` for Hono applications.
*   Use `fromIttyRouter` for itty-router applications.

If you are using a different router, you might need to create a custom adapter. Chanfana's architecture is designed to be extensible, and creating a new adapter is possible, although it might require a deeper understanding of Chanfana's internals and the target router's API.
