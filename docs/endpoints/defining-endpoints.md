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
                content: contentJson(z.object({
                    status: z.string().default("success"),
                    data: z.object({ id: z.number() }),
                })),
            },
            ...InputValidationException.schema(),
            "500": {
                description: 'Internal Server Error',
                content: contentJson(z.object({
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
                content: contentJson(z.object({
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
import { fromHono, OpenAPIRoute } from 'chanfana';
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
                content: contentJson(z.object({
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
