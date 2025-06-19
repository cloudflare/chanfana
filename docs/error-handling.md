# Error Handling and Exception Management

Robust error handling is essential for building reliable APIs. Chanfana provides a structured approach to managing errors and exceptions, ensuring consistent and informative error responses for your API clients. This section will guide you through Chanfana's exception system and best practices for error handling.

## Understanding Exceptions in Chanfana

Chanfana uses custom exception classes to represent different types of API errors. These exceptions are designed to:

*   **Provide Structured Error Information:** Carry relevant error details like error codes, messages, and optional paths to pinpoint the source of the error.
*   **Generate OpenAPI Schema:** Automatically generate OpenAPI schema definitions for error responses, documenting potential error scenarios in your API specification.
*   **Enable Consistent Error Responses:** Facilitate the creation of consistent error response formats across your API, improving the developer experience for API consumers.
*   **Simplify Error Handling Logic:** Streamline error handling within your endpoint `handle` methods by allowing you to throw specific exception types that Chanfana can automatically process.

## `ApiException`: The Base Exception Class

`ApiException` is the base class for all Chanfana's custom exceptions. It provides common properties and methods for error representation.

**Key features of `ApiException`:**

*   **Extends `Error`:** Inherits from the standard JavaScript `Error` class.
*   **`isVisible` Property:** (boolean, default: `true`) Controls whether the error message should be exposed to the client in the API response. Set to `false` for internal errors where you don't want to reveal sensitive details.
*   **`message` Property:** (string) The error message.
*   **`default_message` Property:** (string, default: `"Internal Error"`) A default, generic error message used if `message` is not provided or if `isVisible` is `false`.
*   **`status` Property:** (number, default: `500`) The HTTP status code for the error response.
*   **`code` Property:** (number, default: `7000`) A unique error code to categorize the error type.
*   **`includesPath` Property:** (boolean, default: `false`) Indicates if the error includes a `path` property (e.g., for validation errors).
*   **`buildResponse()` Method:** Returns an array of error objects suitable for inclusion in the API response body.
*   **`static schema()` Method:** A static method that generates an OpenAPI schema definition for error responses of this type.

**Example: Basic `ApiException` Usage**

```typescript
import { ApiException } from 'chanfana';
import { type Context } from 'hono';

class MyEndpoint {
    async handle(c: Context) {
        const operationSuccessful = false; // Simulate an error condition

        if (!operationSuccessful) {
            throw new ApiException("Operation failed due to an unexpected error.");
        }

        return { success: true, message: "Operation successful" };
    }
}
```

When an `ApiException` is thrown within a Chanfana endpoint's `handle` method, Chanfana will automatically catch it and return an HTTP response with:

*   **Status Code:** `500 Internal Server Error` (by default, as defined in `ApiException.status`).
*   **Response Body (JSON):**

    ```json
    {
        "success": false,
        "errors": [
            {
                "code": 7000,
                "message": "Operation failed due to an unexpected error."
            }
        ]
    }
    ```

## Common Exception Types

Chanfana provides several pre-built exception classes that extend `ApiException` for common error scenarios.

### `InputValidationException`: Handling Validation Errors

`InputValidationException` is specifically designed for representing input validation errors. It's typically thrown when request data (body, query parameters, path parameters, headers) fails validation against your defined schemas.

**Key features of `InputValidationException`:**

*   **Extends `ApiException`:** Inherits from `ApiException`.
*   **`default_message` Property:** Overridden to `"Input Validation Error"`.
*   **`status` Property:** Overridden to `400 Bad Request`.
*   **`code` Property:** Overridden to `7001`.
*   **`includesPath` Property:** Overridden to `true`.
*   **`path` Property:** (`Array<string> | null`) An optional array of strings representing the path to the invalid field(s) in the request data (e.g., `['body', 'username']`).

**Example: Throwing `InputValidationException`**

```typescript
import { InputValidationException, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class CreateUserEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            body: contentJson(z.object({
                username: z.string().min(3),
                email: z.string().email(),
            })),
        },
        responses: {
            "200": { description: 'User created' },
            ...InputValidationException.schema(), // Document HTTP 400 error
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const username = data.body.username;
        const email = data.body.email;

        const usernameExists = await checkUsernameExists(username); // Assume this function checks for username uniqueness

        if (usernameExists) {
            throw new InputValidationException("Username is already taken.", ['body', 'username']);
        }

        // ... logic to create user ...
        return { message: 'User created' };
    }
}

async function checkUsernameExists(username: string): Promise<boolean> {
    // ... your logic to check if username exists in database ...
    return username === 'existinguser'; // Simulate username already exists
}
```

In this example, if the `checkUsernameExists` function returns `true`, we throw an `InputValidationException` with a specific message and the path `['body', 'username']`. Chanfana will automatically return a `400 Bad Request` response with a body like:

```json
{
    "success": false,
    "errors": [
        {
            "code": 7001,
            "message": "Username is already taken.",
            "path": [ "body", "username" ]
        }
    ]
}
```

### `NotFoundException`: Signaling Resource Not Found

`NotFoundException` is used to indicate that a requested resource could not be found.

**Key features of `NotFoundException`:**

*   **Extends `ApiException`:** Inherits from `ApiException`.
*   **`default_message` Property:** Overridden to `"Not Found"`.
*   **`status` Property:** Overridden to `404 Not Found`.
*   **`code` Property:** Overridden to `7002`.

**Example: Throwing `NotFoundException`**

```typescript
import { NotFoundException, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class GetProductEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            params: z.object({ productId: z.string() }),
        },
        responses: {
            "200": { description: 'Product details' },
            ...NotFoundException.schema(), // Document HTTP 404 error
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const productId = data.params.productId;

        const product = await getProductFromDatabase(productId); // Assume this function might return null

        if (!product) {
            throw new NotFoundException(`Product with ID '${productId}' not found`);
        }

        return { product };
    }
}

async function getProductFromDatabase(productId: string): Promise<any | null> {
    // ... your logic to fetch product from database ...
    return productId === 'product123' ? { id: 'product123', name: 'Example Product' } : null; // Simulate product not found
}
```

If `getProductFromDatabase` returns `null`, a `NotFoundException` is thrown. Chanfana will return a `404 Not Found` response with a body like:

```json
{
    "success": false,
    "errors": [
        {
            "code": 7002,
            "message": "Not Found"
        }
    ]
}
```

### `MultiException`: Managing Multiple Errors

`MultiException` is used to group multiple `ApiException` instances together. This can be useful when you need to report multiple validation errors or other types of errors simultaneously.

**Key features of `MultiException`:**

*   **Extends `Error`:** Inherits from the standard JavaScript `Error` class.
*   **`errors` Property:** (`Array<ApiException>`) An array of `ApiException` instances that are grouped together.
*   **`status` Property:** (number, default: `400`) The highest HTTP status code among all contained exceptions (defaults to 400 if no exceptions are provided).
*   **`isVisible` Property:** (boolean, default: `true`) `false` if any of the contained exceptions have `isVisible: false`.
*   **`buildResponse()` Method:** Returns a combined array of error objects from all contained exceptions.

**Example: Using `MultiException` for Multiple Validation Errors**

```typescript
import { MultiException, InputValidationException, OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

class ValidateMultipleFieldsEndpoint extends OpenAPIRoute {
    schema = {
        request: {
            body: contentJson(z.object({
                field1: z.string().min(5),
                field2: z.number().positive(),
                field3: z.boolean(),
            })),
        },
        responses: {
            ...InputValidationException.schema(), // Document HTTP 400 error
        },
    };

    async handle(c: Context) {
        const data = await this.getValidatedData<typeof this.schema>();
        const field1 = data.body.field1;
        const field2 = data.body.field2;
        const field3 = data.body.field3;

        const errors: ApiException[] = [];

        if (field1.length > 10) {
            errors.push(new InputValidationException("Field 1 is too long", ['body', 'field1']));
        }
        if (field2 > 100) {
            errors.push(new InputValidationException("Field 2 is too large", ['body', 'field2']));
        }

        if (errors.length > 0) {
            throw new MultiException(errors);
        }

        return { message: 'Validation successful' };
    }
}
```

If both `field1` and `field2` fail validation, a `MultiException` will be thrown, and Chanfana will return a `400 Bad Request` response with a body like:

```json
{
    "success": false,
    "errors": [
        {
            "code": 7001,
            "message": "Field 1 is too long",
            "path": [ "body", "field1" ]
        },
        {
            "code": 7001,
            "message": "Field 2 is too large",
            "path": [ "body", "field2" ]
        }
    ]
}
```

## Custom Exception Classes

You can create your own custom exception classes by extending `ApiException`. This allows you to define API-specific error types with custom error codes, status codes, and messages.

**Example: Creating a Custom `AuthenticationException`**

```typescript
import { ApiException, contentJson } from 'chanfana';
import { z } from 'zod';
import { type Context } from 'hono';

export class AuthenticationException extends ApiException {
    default_message = "Authentication failed";
    status = 401;
    code = 1000;
}

// ... in your endpoint ...
class AuthenticatedEndpoint extends OpenAPIRoute {
    schema = {
        responses: {
            ...AuthenticationException.schema(), // Document HTTP 401 error
        },
    };

    async handle(c: Context) {
        const isAuthenticated = await authenticateUser(); // Assume this function checks authentication

        if (!isAuthenticated) {
            throw new AuthenticationException("Invalid credentials.");
        }

        return { message: 'Authenticated' };
    }
}

async function authenticateUser(): Promise<boolean> {
    // ... your authentication logic ...
    return false; // Simulate authentication failure
}
```

In this example, we create a custom `AuthenticationException` class with a `401 Unauthorized` status code and a specific error code. We also document the `401` response in the endpoint's `schema.responses` using `...AuthenticationException.schema()`.

## Defining Exception Schemas for OpenAPI Documentation

The `static schema()` method in `ApiException` and its subclasses is used to generate OpenAPI schema definitions for error responses. This ensures that your API documentation accurately reflects potential error scenarios and their response structures.

When you call `...MyExceptionClass.schema()` it returns an OpenAPI response object that you can include in your endpoint's `schema.responses`. This automatically documents the error response with the correct status code, description, and response body schema (based on the `ApiException`'s `buildResponse()` output).

## Global Error Handling Strategies

While Chanfana provides structured exception handling within endpoints, you might also want to implement global error handling for your application to catch unhandled exceptions or perform centralized error logging and reporting.

**Hono Example: Global Error Handler**

In Hono, you can use the `app.onError` handler to catch unhandled exceptions:

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, ApiException } from 'chanfana';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

const app = new Hono<{ Bindings: Env }>();
const openapi = fromHono(app);

openapi.get('/error', () => {
    throw new Error("Something went terribly wrong!"); // Throw a standard error
});

app.onError((err, c) => {
    console.error("Global error handler caught:", err); // Log the error

    if (err instanceof ApiException) {
        // If it's a Chanfana ApiException, let Chanfana handle the response
        return c.json({ success: false, errors: err.buildResponse() }, err.status);
    }

    // For other errors, return a generic 500 response
    return c.json({ success: false, errors: [{ code: 7000, message: "Internal Server Error" }] }, 500);
});

export default app;
```

In this example, `app.onError` catches any error thrown within Hono routes. It checks if the error is an instance of `ApiException`. If so, it uses `err.buildResponse()` and `err.status` to create the response. For other types of errors, it returns a generic 500 error response.

---

By using Chanfana's exception system and implementing proper error handling strategies, you can build APIs that are not only robust and reliable but also provide a clear and helpful experience for developers consuming your API.
