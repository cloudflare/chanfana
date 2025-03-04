# Request Validation

Chanfana's automatic request validation is a key feature that ensures your API receives and processes only valid data. This section dives deep into how request validation works for different parts of an HTTP request: body, query parameters, path parameters, and headers.

## Validating Request Body

Request body validation is crucial for `POST`, `PUT`, and `PATCH` requests where clients send data to your API in the request body. Chanfana primarily supports JSON request bodies and uses Zod schemas to define their structure.

### Using `contentJson` for JSON Bodies

The `contentJson` helper function simplifies defining JSON request bodies in your `schema.request.body`. It automatically sets the `content-type` to `application/json` and wraps your Zod schema appropriately for OpenAPI.

**Example: Validating a User Creation Body**

```typescript
import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class CreateUserEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            body: contentJson(z.object({
                username: z.string().min(3).max(20),
                password: z.string().min(8),
                email: z.string().email(),
                fullName: z.string().optional(),
                age: z.number().int().positive().optional(),
            })),
        },
        responses: {
            // ... responses
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const userDetails = data.body; // Type-safe access to validated body

        // ... logic to create a user ...
        return { message: 'User created successfully' };
    }
}
```

In this example:

*   We use `contentJson` to wrap a Zod object schema that defines the expected structure of the JSON request body.
*   The schema specifies fields like `username`, `password`, `email`, `fullName`, and `age` with their respective types and validation rules (e.g., `min`, `max`, `email`, `int`, `positive`, `optional`).
*   In the `handle` method, `this.getValidatedData<typeof this.schema>().body` will be automatically typed as:

    ```typescript
    {
        username: string;
        password: string;
        email: string;
        fullName?: string | undefined;
        age?: number | undefined;
    }
    ```

### Zod Schemas for Body

You can use the full power of Zod to define complex validation rules for your request bodies. This includes:

*   **Data Types:** `z.string()`, `z.number()`, `z.boolean()`, `z.date()`, `z.array()`, `z.object()`, `z.enum()`, etc.
*   **String Validations:** `min()`, `max()`, `email()`, `url()`, `uuid()`, `regex()`, etc.
*   **Number Validations:** `int()`, `positive()`, `negative()`, `min()`, `max()`, etc.
*   **Array Validations:** `min()`, `max()`, `nonempty()`, `unique()`, etc.
*   **Object Validations:** `required()`, `optional()`, `partial()`, `strict()`, `refine()`, etc.
*   **Transformations:** `transform()`, `preprocess()`, etc.
*   **Effects:** `refinement()`, `superRefine()`, etc.

Refer to the [Zod documentation](https://zod.dev/) for a comprehensive list of validation methods and features.

### Body Type Inference

Chanfana leverages TypeScript's type inference capabilities. When you use `getValidatedData<typeof this.schema>().body`, TypeScript automatically infers the type of `data.body` based on the Zod schema you defined in `schema.request.body`. This provides excellent type safety and autocompletion in your code editor.

## Validating Query Parameters

Query parameters are key-value pairs appended to the URL after the `?` symbol (e.g., `/items?page=1&pageSize=20`). Chanfana validates query parameters using Zod schemas defined in `schema.request.query`.

### Defining Query Parameter Schema with Zod

Use `z.object({})` within `schema.request.query` to define the expected query parameters and their validation rules.

**Example: Filtering Resources with Query Parameters**

```typescript
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class ListProductsEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            query: z.object({
                category: z.string().optional().describe("Filter by product category"),
                minPrice: z.number().min(0).optional().describe("Filter products with minimum price"),
                maxPrice: z.number().min(0).optional().describe("Filter products with maximum price"),
                sortBy: z.enum(['price', 'name', 'date']).default('name').describe("Sort products by field"),
                sortOrder: z.enum(['asc', 'desc']).default('asc').describe("Sort order"),
                page: z.number().int().min(1).default(1).describe("Page number for pagination"),
                pageSize: z.number().int().min(1).max(100).default(20).describe("Number of items per page"),
            }),
        },
        responses: {
            // ... responses
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const queryParams = data.query; // Type-safe access to validated query parameters

        // ... logic to fetch and filter products based on queryParams ...
        return { message: 'Product list retrieved' };
    }
}
```

In this example:

*   We define a Zod object schema for `schema.request.query` with various query parameters like `category`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder`, `page`, and `pageSize`.
*   Each parameter is defined with its type, validation rules (e.g., `optional()`, `min()`, `enum()`, `default()`), and a `describe()` method to add descriptions for OpenAPI documentation.
*   `this.getValidatedData<typeof this.schema>().query` will be typed according to the schema, providing type-safe access to validated query parameters.

### Query Parameter Type Inference

Similar to request bodies, Chanfana infers the types of query parameters based on your Zod schema. `data.query` will be an object with properties corresponding to your query parameter names, and their types will match the Zod schema definitions.

## Validating Path Parameters

Path parameters are dynamic segments in the URL path, denoted by colons (e.g., `/users/:userId`). Chanfana validates path parameters using Zod schemas defined in `schema.request.params`.

### Defining Path Parameter Schema with Zod

Use `z.object({})` within `schema.request.params` to define the expected path parameters and their validation rules.

**Example: Retrieving a Resource by ID**

```typescript
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class GetProductEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({
                productId: z.string().uuid().describe("Unique ID of the product"),
            }),
        },
        responses: {
            // ... responses
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const productId = data.params.productId; // Type-safe access to validated path parameter

        // ... logic to fetch product details based on productId ...
        return { message: `Product ${productId} details retrieved` };
    }
}
```

In this example:

*   We define a Zod object schema for `schema.request.params` with a single path parameter `productId`.
*   The `productId` is defined as a `z.string().uuid()` to ensure it's a valid UUID.
*   `this.getValidatedData<typeof this.schema>().params` will be typed as:

    ```typescript
    {
        productId: string;
    }
    ```

### Path Parameter Type Inference

Type inference works similarly for path parameters. `data.params` will be an object with properties corresponding to your path parameter names, and their types will be inferred from your Zod schema.

## Validating Headers

Headers are metadata sent with HTTP requests. Chanfana allows you to validate specific headers using Zod schemas defined in `schema.request.headers`.

### Defining Header Schema with Zod

Use `z.object({})` within `schema.request.headers` to define the headers you want to validate and their rules.

**Example: API Key Authentication via Headers**

```typescript
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class AuthenticatedEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            headers: z.object({
                'X-API-Key': z.string().describe("API Key for authentication"),
            }),
        },
        responses: {
            // ... responses
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const apiKey = data.headers['X-API-Key']; // Type-safe access to validated header

        // ... logic to authenticate user based on apiKey ...
        return { message: 'Authenticated request' };
    }
}
```

In this example:

*   We define a Zod object schema for `schema.request.headers` to validate the `X-API-Key` header.
*   `this.getValidatedData<typeof this.schema>().headers` will be typed as:

    ```typescript
    {
        'X-API-Key': string;
    }
    ```

### Header Parameter Type Inference

Type inference also applies to headers. `data.headers` will be an object with properties corresponding to your header names (in lowercase), and their types will be inferred from your Zod schema.

---

By leveraging Chanfana's request validation capabilities, you can build APIs that are more secure, reliable, and easier to maintain. Validation ensures that your API logic only processes valid data, reducing errors and improving the overall API experience.

Next, let's move on to [**Crafting Response Definitions**](./response-definition.md) to learn how to define the responses your API endpoints will return.
