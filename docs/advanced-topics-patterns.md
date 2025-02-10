# Advanced Topics and Patterns

As you build more complex APIs with Chanfana, you might encounter advanced use cases and design patterns that require a deeper understanding of Chanfana's capabilities. This section explores some advanced topics and patterns to help you build sophisticated and maintainable APIs.

## Nested Routers: Organizing Complex APIs

For large APIs with many endpoints, organizing your routes into nested routers can improve code structure and maintainability. Chanfana fully supports nested routers with both Hono and itty-router adapters.

**Example: Nested Routers with Hono**

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

// User Routes (nested router)
const userRoutes = new Hono();

class ListUsersEndpoint extends OpenAPIRoute {
    schema = { 
      responses: { 
        "200": { 
          description: 'List users' 
        } 
      } 
    };
    
    async handle(c: AppContext) { 
      return { 
        message: 'List users' 
      }; 
    }
}
userRoutes.get('/', ListUsersEndpoint);

class GetUserEndpoint extends OpenAPIRoute {
    schema = { 
      responses: { 
        "200": { 
          description: 'Get user' 
        } 
      } 
    };
    
    async handle(c: AppContext) { 
      return { message: 'Get user' }; 
    }
}
userRoutes.get('/:userId', GetUserEndpoint);

// Product Routes (nested router)
const productRoutes = new Hono();

class ListProductsEndpoint extends OpenAPIRoute {
    schema = { 
      responses: { 
        "200": { 
          description: 'List products' 
        } 
      } 
    };
    
    async handle(c: AppContext) { 
      return { message: 'List products' }; 
    }
}
productRoutes.get('/', ListProductsEndpoint);

// Main App
const app = new Hono();
const openapi = fromHono(app);

// Mount nested routers
openapi.route('/users', userRoutes);
openapi.route('/products', productRoutes);

export default app;
```

**Explanation:**

*   We create separate Hono router instances for `/users` and `/products` routes (`userRoutes`, `productRoutes`).
*   Within each nested router, we define endpoints using `OpenAPIRoute` classes and register them using the nested router's `get()`, `post()`, etc., methods.
*   In the main app (`app`), we initialize Chanfana using `fromHono`.
*   We use `openapi.route('/users', userRoutes)` and `openapi.route('/products', productRoutes)` to mount the nested routers under specific paths. Chanfana automatically merges the OpenAPI schemas from nested routers into the main OpenAPI document, correctly adjusting paths.

**Benefits of Nested Routers:**

*   **Improved Code Organization:** Break down large APIs into smaller, manageable modules based on resources or features.
*   **Route Grouping:** Logically group related endpoints together.
*   **Path Prefixing:** Easily apply path prefixes to entire groups of routes.
*   **Schema Merging:** Chanfana automatically handles merging OpenAPI schemas from nested routers, ensuring a complete and accurate API documentation.

## Middleware and Interceptors

Chanfana is designed to work seamlessly with the middleware capabilities of your chosen router (Hono or itty-router). You can use middleware for common tasks like authentication, authorization, logging, request modification, and response transformation, alongside Chanfana's OpenAPI features.

**Example: Authentication Middleware in Hono**

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

// Authentication Middleware
const authMiddleware = async (c, next) => {
    const apiKey = c.req.header('X-API-Key');
    if (apiKey !== 'valid-api-key') {
        return c.json({ success: false, message: 'Unauthorized' }, 401);
    }
    await next();
};

class ProtectedEndpoint extends OpenAPIRoute {
    schema = {
        responses: { "200": { description: 'Protected resource' } },
    };
    
    async handle(c: AppContext) { 
      return { message: 'Protected data' }; 
    }
}

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);

// Apply authentication middleware to the /protected route
openapi.get('/protected', authMiddleware, ProtectedEndpoint);

export default app;
```

In this example, we define an `authMiddleware` function that checks for an API key in the request headers. We then apply this middleware to the `/protected` route when registering the `ProtectedEndpoint` using `openapi.get('/protected', authMiddleware, ProtectedEndpoint)`. The middleware will be executed before the `ProtectedEndpoint`'s `handle` method, ensuring that only authenticated requests reach the endpoint logic.

**Interceptors (Before/After Hooks in Endpoints):**

Chanfana's auto endpoints (e.g., `CreateEndpoint`, `ReadEndpoint`, `UpdateEndpoint`, `DeleteEndpoint`, `ListEndpoint`) provide `before` and `after` lifecycle methods that act as interceptors. You can override these methods to perform actions before and after the core logic of these endpoints (e.g., data transformation, logging, authorization checks).

Refer to the documentation for each predefined endpoint type for details on available lifecycle methods.

## Custom Serializers: Transforming Response Data

In some cases, you might need to transform or format your API response data before sending it to clients. Chanfana's `Meta` object (used with auto endpoints) allows you to define a custom `serializer` function to handle response data transformation.

**Example: Custom Data Serializer**

```typescript
import { Hono } from 'hono';
import { fromHono, ListEndpoint, contentJson } from 'chanfana';
import { z } from 'zod';

// Define Product Model
const ProductModel = z.object({
    productId: z.string().uuid(), // Renamed field
    productName: z.string(),     // Renamed field
    priceInCents: z.number().int(), // Different unit
});

// Define Meta with custom serializer
const productListMeta = {
    model: {
        schema: z.object({ // Internal schema (e.g., database schema)
            id: z.string().uuid(),
            name: z.string(),
            price_cents: z.number().int(),
        }),
        primaryKeys: ['id'],
        tableName: 'products',
        serializer: (obj: any) => ({ // Custom serializer function
            productId: obj.id,
            productName: obj.name,
            priceInCents: obj.price_cents,
            priceInDollars: (obj.price_cents / 100).toFixed(2), // Add calculated field
        }),
        serializerSchema: ProductModel, // Schema for serialized output
    },
};

class ListProductsEndpoint extends ListEndpoint {
    _meta = productListMeta;
  
    async list() {
        const products = [ // Simulate database data
            { id: 'uuid-1', name: 'Product X', price_cents: 12999 },
            { id: 'uuid-2', name: 'Product Y', price_cents: 5999 },
        ];
        return { result: products };
    }
}

const app = new Hono();
const openapi = fromHono(app);
openapi.get('/products', ListProductsEndpoint);

export default app;
```

**Explanation:**

*   In `productListMeta.model`, we define a `serializer` function. This function takes the raw data object (e.g., from a database query) as input and returns a transformed object.
*   We also define `serializerSchema` to describe the structure of the serialized output. This schema (`ProductModel` in this example) is used for OpenAPI documentation of the response body.
*   In `ListProductsEndpoint`, when the `list` method returns data, Chanfana automatically applies the `serializer` function to each item in the `result` array before sending the response.

**Benefits of Custom Serializers:**

*   **Data Transformation:** Adapt data from your data layer (e.g., database) to the desired API response format.
*   **Field Renaming:** Rename fields for API consistency or client convenience.
*   **Data Formatting:** Format data (e.g., dates, numbers, currencies) for API responses.
*   **Calculated Fields:** Add calculated or derived fields to API responses.
*   **Schema Documentation:** Ensure that your OpenAPI documentation accurately reflects the structure of the serialized response data using `serializerSchema`.

## Logging and Monitoring API Requests

For production APIs, logging and monitoring are crucial. You can integrate logging and monitoring middleware or logic into your Chanfana APIs to track requests, responses, errors, and performance metrics.

**Example: Request Logging Middleware in Hono**

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

// Logging Middleware
const loggingMiddleware = async (c, next) => {
    const startTime = Date.now();
    await next();
    const endTime = Date.now();
    const duration = endTime - startTime;
    const method = c.req.method;
    const url = c.req.url;
    const status = c.res.status;
    console.log(`${method} ${url} - ${status} - ${duration}ms`);
};

class MyEndpoint extends OpenAPIRoute {
    schema = { 
      responses: { 
        "200": { 
          description: 'Success' 
        } 
      } 
    };
    
    async handle(c: Context) { 
      return { message: 'Hello' }; 
    }
}

const app = new Hono();
const openapi = fromHono(app);

// Apply logging middleware globally
app.use(loggingMiddleware);

openapi.get('/hello', MyEndpoint);

export default app;
```

In this example, `loggingMiddleware` logs information about each incoming request, including method, URL, status code, and response time. We apply this middleware globally to the Hono app using `app.use(loggingMiddleware)`.

You can use similar middleware or custom logic to integrate with monitoring tools, error tracking services, and performance monitoring systems.

## Extending `OpenAPIRoute` for Reusable Logic (Abstract Base Classes)

For complex APIs, you might want to create your own abstract base classes that extend `OpenAPIRoute` to encapsulate reusable logic, configurations, or middleware. This can help reduce code duplication and enforce consistency across your API endpoints.

**Example: Abstract Base Class for Authenticated Endpoints**

```typescript
import { OpenAPIRoute } from 'chanfana';
import { HTTPException } from 'hono/http-exception';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

// Abstract Base Class for Authenticated Endpoints
abstract class AuthenticatedRoute extends OpenAPIRoute {
    async beforeHandle(c: AppContext) { // Custom lifecycle method (not Chanfana built-in, just an example)
        const isAuthenticated = await this.isAuthenticated(c); // Abstract method to be implemented in subclasses
        if (!isAuthenticated) {
            throw new HTTPException(401, { message: 'Authentication required.' })
        }
    }

    abstract isAuthenticated(c: AppContext): Promise<boolean>; // Abstract method to be implemented by subclasses

    async execute(c: [AppContext]) { // Override execute to include beforeHandle
        await this.beforeHandle(c[0]);
        return super.execute(c);
    }
}

// Concrete Authenticated Endpoint
class MyAuthenticatedEndpoint extends AuthenticatedRoute {
    schema = {
        responses: { 
          "200": {description: 'Authenticated data'}, 
          "401": {description: 'Request not Authenticated'}
        },
    };

    async isAuthenticated(c: AppContext): Promise<boolean> {
        // ... your authentication logic ...
        return true; // Replace with actual authentication check
    }

    async handle(c: AppContext) {
        return { message: 'Authenticated data' };
    }
}

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);

openapi.get('/protected', MyAuthenticatedEndpoint);

export default app;
```

In this example, we create an abstract class `AuthenticatedRoute` that extends `OpenAPIRoute`. It includes an abstract `isAuthenticated()` method that subclasses must implement to provide authentication logic. It also overrides the `execute` method to include a custom `beforeHandle()` hook that checks authentication before proceeding with the endpoint logic. Concrete endpoints that require authentication can then extend `AuthenticatedRoute` and implement the `isAuthenticated()` method.

## Versioned APIs

For evolving APIs, versioning is often necessary to maintain backward compatibility while introducing new features or changes. Chanfana can be used to build versioned APIs by:

*   **Using Base Paths:** Utilize the `base` option in `RouterOptions` to set version-specific base paths (e.g., `/api/v1`, `/api/v2`).
*   **Nested Routers for Versions:** Organize routes for different API versions into nested routers mounted under version-specific paths.
*   **Conditional Logic in Endpoints:** Implement version-specific logic within your endpoint `handle` methods based on request headers, path segments, or query parameters.
*   **Separate OpenAPI Documents:** Generate separate OpenAPI documents for each API version by initializing Chanfana with different `RouterOptions` for each version.

Choose the versioning strategy that best fits your API evolution needs and client compatibility requirements.

---

These advanced topics and patterns provide you with the tools and techniques to build sophisticated, well-organized, and maintainable APIs with Chanfana, addressing complex requirements and design considerations.
