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
                content: contentJson(z.object({
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
                content: contentJson(z.object({
                    id: z.string(),
                    name: z.string(),
                })),
            },
            ...InputValidationException.schema(),
            ...NotFoundException.schema(),
            "500": {
                description: 'Internal Server Error',
                content: contentJson(z.object({
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
        content: contentJson(z.object({
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
                content: contentJson(z.object({
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
                content: contentJson(z.object({
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
