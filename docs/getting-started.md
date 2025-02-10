# Getting Started

This guide will walk you through the initial steps to get Chanfana up and running. We'll cover installation, setting up basic examples with both Hono and itty-router, and exploring the automatically generated OpenAPI documentation.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (version 18 or later recommended) and **npm** (Node Package Manager) or **yarn**.
*   **A text editor or IDE** (like VS Code) for writing code.

## Installation

Installing Chanfana is straightforward using npm or yarn:

**Using npm:**

```bash
npm install chanfana --save
```

**Using yarn:**

```bash
yarn add chanfana
```

## Quick Start with Hono

Let's create a simple "Hello, World!" API endpoint using Hono and Chanfana.

### Creating Your First Endpoint (Hono)

1.  **Create a new project directory:**

    ```bash
    mkdir chanfana-hono-example
    cd chanfana-hono-example
    npm init -y # or yarn init -y
    ```

2.  **Install dependencies:**

    ```bash
    npm install hono chanfana zod --save # or yarn add hono chanfana zod
    ```

3.  **Create a file named `index.ts` (or `src/index.ts` if you are setting up a more structured project) and add the following code:**

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
    
    // Define a simple endpoint class
    class HelloEndpoint extends OpenAPIRoute {
        schema = {
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: z.object({ message: z.string() }),
                        },
                    },
                },
            },
        };

        async handle(c: AppContext) {
            return { message: 'Hello, Chanfana!' };
        }
    }

    // Create a Hono app
    const app = new Hono<{ Bindings: Env }>();

    // Initialize Chanfana for Hono
    const openapi = fromHono(app);

    // Register the endpoint
    openapi.get('/hello', HelloEndpoint);

    // Export the Hono app (for Cloudflare Workers or other runtimes)
    export default app;
    ```

### Running the Example (Hono)

1.  **Run your application.**  The command to run your application will depend on your environment. For a simple Node.js environment, you can use `tsx` or `node`:

    ```bash
    npx tsx index.ts # or node index.js if you compiled to JS
    ```

    If you are using Cloudflare Workers, you would typically use `wrangler dev` or `wrangler publish`.

2.  **Access your API.** By default, Hono applications listen on port 3000. You can access your API endpoint in your browser or using `curl`:

    ```bash
    curl http://localhost:3000/hello
    ```

    You should see the JSON response:

    ```json
    {"message": "Hello, Chanfana!"}
    ```

### Exploring the OpenAPI Documentation (Hono)

1.  **Navigate to the documentation URL.** Open your browser and go to the `/docs` URL you configured in the `fromHono` options (in this example, `http://localhost:3000/docs`).

2.  **Explore the Swagger UI.** You should see the Swagger UI interface, automatically generated from your endpoint schema. You can explore your API's endpoints, schemas, and even try out API calls directly from the documentation.

    You can also access the raw OpenAPI JSON schema at `/openapi.json` (e.g., `http://localhost:3000/openapi.json`).

## Quick Start with Itty Router

Now, let's do the same with itty-router.

### Creating Your First Endpoint (Itty Router)

1.  **Create a new project directory:**

    ```bash
    mkdir chanfana-itty-router-example
    cd chanfana-itty-router-example
    npm init -y # or yarn init -y
    ```

2.  **Install dependencies:**

    ```bash
    npm install itty-router chanfana zod --save # or yarn add itty-router chanfana zod
    ```

3.  **Create a file named `index.ts` (or `src/index.ts`) and add the following code:**

    ```typescript
    import { Router } from 'itty-router';
    import { fromIttyRouter, OpenAPIRoute } from 'chanfana';
    import { z } from 'zod';

    // Define a simple endpoint class
    class HelloEndpoint extends OpenAPIRoute {
        schema = {
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: z.object({ message: z.string() }),
                        },
                    },
                },
            },
        };

        async handle(request: Request, env, ctx) {
            return { message: 'Hello, Chanfana for itty-router!' };
        }
    }

    // Create an itty-router router
    const router = Router();

    // Initialize Chanfana for itty-router
    const openapi = fromIttyRouter(router);

    // Register the endpoint
    openapi.get('/hello', HelloEndpoint);

    // Add a default handler for itty-router (required)
    router.all('*', () => new Response("Not Found.", { status: 404 }));

    // Export the router's fetch handler (for Cloudflare Workers or other runtimes)
    export const fetch = router.handle;
    ```

### Running the Example (Itty Router)

1.  **Run your application.**  Similar to Hono, the command depends on your environment. For Node.js:

    ```bash
    npx tsx index.ts # or node index.js if compiled
    ```

    For Cloudflare Workers, use `wrangler dev` or `wrangler publish`.

2.  **Access your API.**  itty-router also defaults to port 3000. Access the endpoint:

    ```bash
    curl http://localhost:3000/hello
    ```

    You should see:

    ```json
    {"message": "Hello, Chanfana for itty-router!"}
    ```

### Exploring the OpenAPI Documentation (Itty Router)

1.  **Navigate to the documentation URL.** Open your browser to `/docs` (e.g., `http://localhost:3000/docs`).

2.  **Explore the Swagger UI.**  You'll see the Swagger UI, now documenting your itty-router API endpoint.

## Using the Template

For an even faster start, Chanfana provides a template that sets up a Cloudflare Worker project with OpenAPI documentation out of the box.

**Create a new project using the template:**

```bash
npm create cloudflare@latest -- --type openapi
```

Follow the prompts to set up your project. This template includes Chanfana, Hono, and a basic endpoint structure, ready for you to expand upon.

---

Congratulations! You've successfully set up Chanfana with both Hono and itty-router and explored the automatically generated OpenAPI documentation.

Next, we'll dive deeper into the [**Core Concepts**](./core-concepts.md) of Chanfana to understand how it works and how to leverage its full potential.
