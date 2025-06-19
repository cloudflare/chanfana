# Defining Endpoints

The `OpenAPIRoute` class is the cornerstone of building APIs with Chanfana. It provides a structured and type-safe way to define your API endpoints, including their schemas and logic. This guide will delve into the details of using `OpenAPIRoute` to create robust and well-documented endpoints.

## Understanding the `OpenAPIRoute` Class

`OpenAPIRoute` is an abstract class that serves as the base for all your API endpoint classes in Chanfana. To create an endpoint, you will extend this class and implement its properties and methods.

**Key Components of an `OpenAPIRoute` Class:**

*   **`schema` Property:** This is where you define the OpenAPI schema for your endpoint. It's an object that specifies the structure of the request (body, query, params, headers) and the possible responses. The `schema` is crucial for both OpenAPI documentation generation and request validation.

*   **`handle(...args: any[])` Method:** This **asynchronous** method contains the core logic of your endpoint. It's executed when a valid request is received. The arguments passed to `handle` depend on the router adapter you are using (e.g., Hono's `Context` object). You are expected to return a `Response` object, a Promise that resolves to a `Response`, or a plain JavaScript object (which Chanfana will automatically convert to a JSON response).

*   **`getValidatedData<S = any>()` Method:**  This **asynchronous** method is available within your `handle` method. It allows you to access the validated request data. It returns a Promise that resolves to an object containing the validated `body`, `query`, `params`, and `headers` based on the schemas you defined in the `schema.request` property. TypeScript type inference is used to provide type safety based on your schema definition.

## Basic Endpoint Structure

Here's the basic structure of an `OpenAPIRoute` class:

```typescript
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class MyEndpoint extends OpenAPIRoute {
    schema = {
        // Define your OpenAPI schema here (request and responses)
        request: {
            // ... request schema (optional)
        },
        responses: {
            // ... response schema (required)
        },
    };

    async handle(c: Context) {
        // Implement your endpoint logic here
        // Access validated data using this.getValidatedData()
        // Return a Response, Promise<Response>, or a plain object
    }
}
```

## Defining the `schema`

The `schema` property is where you define the OpenAPI contract for your endpoint. Let's break down its components:

### Request Schema (`request`)

The `request` property is an optional object that defines the structure of the incoming request. It can contain the following properties, each being a Zod schema:

*   **`body`:**  Schema for the request body. Typically used for `POST`, `PUT`, and `PATCH` requests. You'll often use `contentJson` to define JSON request bodies.
*   **`query`:** Schema for query parameters in the URL. Use `z.object({})` to define the structure of query parameters.
*   **`params`:** Schema for path parameters in the URL path. Use `z.object({})` to define the structure of path parameters.
*   **`headers`:** Schema for HTTP headers. Use `z.object({})` to define the structure of headers.

**Example: Request Schema with Body and Query Parameters**

```typescript
import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class ExampleEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            body: contentJson(z.object({
                name: z.string().min(3),
                email: z.string().email(),
            })),
            query: z.object({
                page: z.number().int().min(1).default(1),
                pageSize: z.number().int().min(1).max(100).default(20),
            }),
        },
        responses: {
            // ... response schema
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        // data.body will be of type { name: string, email: string }
        // data.query will be of type { page: number, pageSize: number }
        console.log("Validated Body:", data.body);
        console.log("Validated Query:", data.query);
        return { message: 'Request Validated!' };
    }
}
```

### Response Schema (`responses`)

The `responses` property is a **required** object that defines the possible responses your endpoint can return. It's structured as a dictionary where keys are HTTP status codes (e.g., "200", "400", "500") and values are response definitions.

Each response definition should include:

*   **`description`:** A human-readable description of the response.
*   **`content`:** (Optional) Defines the response body content. You'll often use `contentJson` to define JSON response bodies.

**Example: Response Schema with Success and Error Responses**

```typescript
import { OpenAPIRoute, contentJson, InputValidationException } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class AnotherEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            "200": {
                description: 'Successful operation',
                ...contentJson(z.object({
                    status: z.string().default("success"),
                    data: z.object({ id: z.number() }),
                })),
            },
            ...InputValidationException.schema(),
            "500": {
                description: 'Internal Server Error',
                ...contentJson(z.object({
                    status: z.string().default("error"),
                    message: z.string(),
                })),
            },
        },
    };

    async handle(c: Context) {
        // ... your logic ...
        const success = Math.random() > 0.5;
        if (success) {
            return { status: "success", data: { id: 123 } };
        } else {
            throw new Error("Something went wrong!"); // Example of throwing an error
        }
    }
}
```

## Implementing the `handle` Method

The `handle` method is where you write the core logic of your API endpoint. It's an asynchronous method that receives arguments depending on the router adapter.

**Inside the `handle` method, you typically:**

1.  **Access Validated Data:** Use `this.getValidatedData<typeof this.schema>()` to retrieve the validated request data. TypeScript will infer the types of `data.body`, `data.query`, `data.params`, and `data.headers` based on your schema.
2.  **Implement Business Logic:** Perform the operations your endpoint is designed for (e.g., database interactions, calculations, external API calls).
3.  **Return a Response:**
    *   **Return a `Response` object directly:** You can construct a `Response` object using the built-in `Response` constructor or helper functions from your router framework (e.g., `c.json()` in Hono).
    *   **Return a Promise that resolves to a `Response`:** If your logic is asynchronous, return a Promise that resolves to a `Response`.
    *   **Return a plain JavaScript object:** Chanfana will automatically convert a plain JavaScript object into a JSON response with a `200 OK` status code. You can customize the status code and headers if needed by returning a `Response` object instead.

**Example: `handle` Method Logic**

```typescript
import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class UserEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({
                userId: z.string(),
            }),
        },
        responses: {
            "200": {
                description: 'User details retrieved',
                ...contentJson(z.object({
                    id: z.string(),
                    name: z.string(),
                    email: z.string(),
                })),
            },
            // ... error responses
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const userId = data.params.userId;

        // Simulate fetching user data (replace with actual database/service call)
        const user = {
            id: userId,
            name: `User ${userId}`,
            email: `user${userId}@example.com`,
        };

        return { ...user }; // Return a plain object, Chanfana will convert to JSON
    }
}
```

## Accessing Validated Data with `getValidatedData()`

The `getValidatedData<S = any>()` method is crucial for accessing the validated request data within your `handle` method.

**Key features of `getValidatedData()`:**

*   **Type Safety:**  By using `getValidatedData<typeof this.schema>()`, you get strong TypeScript type inference. The returned `data` object will have properties (`body`, `query`, `params`, `headers`) that are typed according to your schema definitions. This significantly improves code safety and developer experience.
*   **Asynchronous Operation:** `getValidatedData()` is an asynchronous method because it performs request validation. You need to `await` its result before accessing the validated data.
*   **Error Handling:** If the request validation fails, `getValidatedData()` will throw a `ZodError` exception. Chanfana automatically catches this exception and returns a `400 Bad Request` response. You typically don't need to handle validation errors explicitly within your `handle` method unless you want to customize the error response further.

**Example: Using `getValidatedData()`**

```typescript
import { type Context } from 'hono';

async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>();
    const userName = data.body.name; // TypeScript knows data.body.name is a string
    const pageNumber = data.query.page; // TypeScript knows data.query.page is a number

    // ... use validated data in your logic ...
}
```

## Example: A Simple Greeting Endpoint

Let's put it all together with a simple greeting endpoint that takes a name as a query parameter and returns a personalized greeting.

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

class GreetingEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            query: z.object({
                name: z.string().min(1).describe("Name to greet"),
            }),
        },
        responses: {
            "200": {
                description: 'Greeting message',
                ...contentJson(z.object({
                    greeting: z.string(),
                })),
            },
        },
    };

    async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const name = data.query.name;
        return { greeting: `Hello, ${name}! Welcome to Chanfana.` };
    }
}

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);
openapi.get('/greet', GreetingEndpoint);

export default app;
```

This example demonstrates the basic structure of an `OpenAPIRoute`, defining a schema for query parameters and responses, and implementing the endpoint logic in the `handle` method.

---

In the next sections, we will explore request validation and response definition in more detail, along with the various parameter types Chanfana provides. Let's start with [**Request Validation in Detail**](./request-validation.md).
docs/endpoints/response-definition.md
# Response Definitions

Defining clear and comprehensive response definitions is as important as request validation for building well-documented and predictable APIs. Chanfana makes it easy to define your API responses within the `schema.responses` property of your `OpenAPIRoute` classes. This section will guide you through crafting effective response definitions.

## Structuring the `responses` Schema

The `responses` property in your `OpenAPIRoute.schema` is an object that defines all possible HTTP responses your endpoint can return. It's structured as a dictionary where:

*   **Keys are HTTP Status Codes:** These are strings representing HTTP status codes (e.g., `"200"`, `"201"`, `"400"`, `"404"`, `"500"`). You should define responses for all relevant status codes your endpoint might return, including success and error scenarios.
*   **Values are Response Definitions:** Each value is an object that defines the details of the response for the corresponding status code.

## Defining Response Status Codes

You should define responses for all relevant HTTP status codes that your endpoint might return. Common categories include:

### Success Responses (2xx)

These status codes indicate that the request was successfully processed. Common success status codes include:

*   **`"200"` (OK):** Standard response for successful GET, PUT, PATCH, and DELETE requests. Typically used when returning data or confirming a successful operation.
*   **`"201"` (Created):**  Response for successful POST requests that result in the creation of a new resource. Often includes details of the newly created resource in the response body and a `Location` header pointing to the resource's URL.
*   **`"204"` (No Content):** Response for successful requests that don't return any content in the response body, such as successful DELETE operations or updates where no data needs to be returned.

**Example: Success Responses**

```typescript
import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class CreateResourceEndpoint extends OpenAPIRoute {
    schema = {
        // ... request schema ...
        responses: {
            "201": {
                description: 'Resource created successfully',
                ...contentJson(z.object({
                    id: z.string(),
                    createdAt: z.string().datetime(),
                })),
                headers: z.object({
                    'Location': z.string().url().describe('URL of the newly created resource'),
                }),
            },
            "400": { description: 'Bad Request' }, // Example error response
        },
    };

    async handle(c: Context) {
        // ... logic to create resource ...
        const newResourceId = 'resource-123';
        const resource = { id: newResourceId, createdAt: new Date().toISOString() };
        return new Response(JSON.stringify(resource), {
            status: 201,
            headers: { 'Location': `/resources/${newResourceId}` },
        });
    }
}
```

### Error Responses (4xx, 5xx)

These status codes indicate that an error occurred during request processing. It's crucial to define error responses to provide clients with information about what went wrong and how to fix it. Common error status code categories include:

*   **4xx Client Errors:** Indicate errors caused by the client's request (e.g., invalid input, unauthorized access).
    *   **`"400"` (Bad Request):** Generic client error, often used for validation failures.
    *   **`"401"` (Unauthorized):** Indicates missing or invalid authentication credentials.
    *   **`"403"` (Forbidden):** Indicates that the client is authenticated but doesn't have permission to access the resource.
    *   **`"404"` (Not Found):** Indicates that the requested resource could not be found.
    *   **`"409"` (Conflict):** Indicates a conflict with the current state of the resource (e.g., trying to create a resource that already exists).
    *   **`"422"` (Unprocessable Entity):**  Used for validation errors when the server understands the request entity but is unable to process it (more semantically correct than 400 for validation errors in some contexts).

*   **5xx Server Errors:** Indicate errors on the server side.
    *   **`"500"` (Internal Server Error):** Generic server error, should be avoided in detailed API responses but can be used as a fallback.
    *   **`"503"` (Service Unavailable):** Indicates that the server is temporarily unavailable (e.g., due to overload or maintenance).

**Example: Error Responses**

```typescript
import { OpenAPIRoute, contentJson, InputValidationException, NotFoundException } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class GetItemEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({ itemId: z.string() }),
        },
        responses: {
            "200": {
                description: 'Item details retrieved',
                ...contentJson(z.object({
                    id: z.string(),
                    name: z.string(),
                })),
            },
            ...InputValidationException.schema(),
            ...NotFoundException.schema(),
            "500": {
                description: 'Internal Server Error',
                ...contentJson(z.object({
                    error: z.string(),
                })),
            },
        },
    };

    getItemFromDatabase(itemId: string) {
        // ... your database lookup logic ...
        // Simulate item not found for certain IDs
        if (itemId === 'item-not-found') return null;
        return { id: itemId, name: `Item ${itemId}` };
    }

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const itemId = data.params.itemId;

        // Simulate item retrieval (replace with actual logic)
        const item = this.getItemFromDatabase(itemId); // Assume this function might return null

        if (!item) {
            throw new NotFoundException(`Item with ID '${itemId}' not found`);
        }

        return { ...item };
    }
}
```

In this example, we define responses for:

*   `"200"` (OK) for successful item retrieval.
*   `"400"` (Bad Request) using the schema from `InputValidationException` (for validation errors).
*   `"404"` (Not Found) using the schema from `NotFoundException` (when the item is not found).
*   `"500"` (Internal Server Error) for generic server-side errors.

## Defining Response Bodies

For each response status code, you can define a response body using the `content` property. Similar to request bodies, you'll often use `contentJson` for JSON response bodies.

### Using `contentJson` for JSON Responses

`contentJson` simplifies defining JSON response bodies. It sets the `content-type` to `application/json` and wraps your Zod schema for OpenAPI.

**Example: Defining Response Body Schema with Zod**

In the examples above, we've already seen how to use `contentJson` to define response bodies. Here's a recap:

```typescript
responses: {
    "200": {
        description: 'Successful response with user data',
        ...contentJson(z.object({
            id: z.string(),
            username: z.string(),
            email: z.string(),
        })),
    },
    // ... other responses ...
}
```

### Zod Schemas for Response Bodies

You can use the same Zod schema capabilities for response bodies as you do for request bodies. Define the structure and data types of your response payloads using Zod's rich set of validation and schema definition methods.

## Example Responses

Let's look at a complete example that defines both request and response schemas for a simple endpoint:

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute, contentJson, InputValidationException, NotFoundException } from 'chanfana';
import { z } from 'zod';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

class ProductEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({
                productId: z.string().uuid().describe("Unique ID of the product"),
            }),
        },
        responses: {
            "200": {
                description: 'Product details retrieved',
                ...contentJson(z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string().optional(),
                    price: z.number().positive(),
                    imageUrl: z.string().url().optional(),
                })),
            },
            ...InputValidationException.schema(),
            ...NotFoundException.schema(),
            "500": {
                description: 'Internal Server Error',
                ...contentJson(z.object({
                    error: z.string(),
                })),
            },
        },
    };

    getProductFromDatabase(productId: string) {
        // ... your database lookup logic ...
        // Simulate product data
        return {
            id: productId,
            name: `Awesome Product ${productId}`,
            description: 'This is a simulated product for demonstration.',
            price: 99.99,
            imageUrl: 'https://example.com/product-image.jpg',
        };
    }

    async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const productId = data.params.productId;

        // Simulate fetching product data (replace with actual logic)
        const product = this.getProductFromDatabase(productId);

        if (!product) {
            throw new NotFoundException(`Product with ID '${productId}' not found`);
        }

        return { ...product };
    }
}

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);
openapi.get('/products/:productId', ProductEndpoint);

export default app;
```

This comprehensive example demonstrates how to define both success and error responses with detailed schemas for the response bodies, making your API documentation clear and your API behavior predictable for clients.

---

Next, we will explore [**Leveraging Auto Endpoints for CRUD Operations**](./auto/base.md) to see how Chanfana simplifies common API patterns.
docs/getting-started.md
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

## Command Line Interface (CLI)

Chanfana also comes with a handy Command Line Interface (CLI) tool that can help you extract your OpenAPI schema directly from your running Cloudflare Worker project. This can be useful for CI/CD pipelines or for quickly generating a static schema file.

Learn more about it in the [**CLI Documentation**](./cli.md).

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
    import { fromHono, OpenAPIRoute, contentJson } from 'chanfana';
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
    import { fromIttyRouter, OpenAPIRoute, contentJson } from 'chanfana';
    import { z } from 'zod';

    // Define a simple endpoint class
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
