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

1.  **Import `fromHono`:** Import the `fromHono` function from `chanfana/adapters/hono`.
2.  **Create a Hono App:** Create a standard Hono application instance using `new Hono()`.
3.  **Initialize Chanfana with `fromHono`:** Call `fromHono(app, options)` to initialize Chanfana for your Hono app.
    *   The first argument is your Hono application instance (`app`).
    *   The second argument is an optional `RouterOptions` object to configure Chanfana (e.g., `openapi_url`, `docs_url`).
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

### `HonoOpenAPIRouterType`

The `fromHono` function returns an object of type `HonoOpenAPIRouterType`. This type is an intersection of `Hono` and `OpenAPIRouterType`, extending the standard Hono application instance with Chanfana's OpenAPI routing methods and properties.

**Key extensions provided by `HonoOpenAPIRouterType`:**

*   **OpenAPI Routing Methods:**  `get()`, `post()`, `put()`, `delete()`, `patch()`, `all()`, `on()`, `route()` methods are extended to handle `OpenAPIRoute` classes and automatically register them for OpenAPI documentation and validation.
*   **`original` Property:**  Provides access to the original Hono application instance.
*   **`options` Property:**  Provides access to the `RouterOptions` passed to `fromHono`.
*   **`registry` Property:**  Provides access to the OpenAPI registry used by Chanfana to collect schema definitions.
*   **`schema()` Method:**  Returns the generated OpenAPI schema as a JavaScript object.

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

1.  **Import `fromIttyRouter`:** Import the `fromIttyRouter` function from `chanfana/adapters/ittyRouter`.
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
