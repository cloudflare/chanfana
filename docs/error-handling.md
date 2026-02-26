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

When an `ApiException` is thrown within a Chanfana endpoint's `handle` method, Chanfana will automatically process it and return an HTTP response with:

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
                email: z.email(),
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
            "message": "Product with ID 'abc123' not found"
        }
    ]
}
```

### `UnauthorizedException`: Authentication Required (401)

`UnauthorizedException` is used when authentication is required but not provided or invalid.

**Key features:**
*   **`status`:** `401 Unauthorized`
*   **`code`:** `7003`
*   **`default_message`:** `"Unauthorized"`

```typescript
import { UnauthorizedException } from 'chanfana';

// In your endpoint
if (!authToken) {
    throw new UnauthorizedException("Authentication token is required");
}
```

### `ForbiddenException`: Access Denied (403)

`ForbiddenException` is used when the user is authenticated but doesn't have permission to access the resource.

**Key features:**
*   **`status`:** `403 Forbidden`
*   **`code`:** `7004`
*   **`default_message`:** `"Forbidden"`

```typescript
import { ForbiddenException } from 'chanfana';

// In your endpoint
if (!user.hasRole('admin')) {
    throw new ForbiddenException("Admin access required");
}
```

### `MethodNotAllowedException`: HTTP Method Not Supported (405)

`MethodNotAllowedException` is used when the HTTP method is not supported for the requested resource.

**Key features:**
*   **`status`:** `405 Method Not Allowed`
*   **`code`:** `7005`
*   **`default_message`:** `"Method Not Allowed"`

### `ConflictException`: Resource Conflict (409)

`ConflictException` is used when the request conflicts with the current state of the resource (e.g., duplicate resource creation).

**Key features:**
*   **`status`:** `409 Conflict`
*   **`code`:** `7006`
*   **`default_message`:** `"Conflict"`

```typescript
import { ConflictException } from 'chanfana';

// In your endpoint
const existingUser = await db.getUserByEmail(email);
if (existingUser) {
    throw new ConflictException("A user with this email already exists");
}
```

### `UnprocessableEntityException`: Semantic Validation Error (422)

`UnprocessableEntityException` is used when the request is well-formed but contains semantic errors. Like `InputValidationException`, it includes a `path` property.

**Key features:**
*   **`status`:** `422 Unprocessable Entity`
*   **`code`:** `7007`
*   **`default_message`:** `"Unprocessable Entity"`
*   **`path`:** Optional path to the problematic field

```typescript
import { UnprocessableEntityException } from 'chanfana';

// In your endpoint
if (startDate > endDate) {
    throw new UnprocessableEntityException(
        "Start date cannot be after end date",
        ["body", "startDate"]
    );
}
```

### `TooManyRequestsException`: Rate Limiting (429)

`TooManyRequestsException` is used when the user has sent too many requests in a given time period. It includes an optional `retryAfter` property.

**Key features:**
*   **`status`:** `429 Too Many Requests`
*   **`code`:** `7008`
*   **`default_message`:** `"Too Many Requests"`
*   **`retryAfter`:** Optional number of seconds until the user can retry. When provided, chanfana automatically sets the `Retry-After` HTTP response header.

```typescript
import { TooManyRequestsException } from 'chanfana';

// In your endpoint
if (rateLimitExceeded) {
    throw new TooManyRequestsException("Rate limit exceeded", 60); // Retry after 60 seconds
}
// Response will include header: Retry-After: 60
```

### `InternalServerErrorException`: Server Errors (500)

`InternalServerErrorException` is used for unexpected server errors. **Important:** By default, `isVisible` is `false` to prevent leaking internal error details to clients.

**Key features:**
*   **`status`:** `500 Internal Server Error`
*   **`code`:** `7009`
*   **`default_message`:** `"Internal Server Error"`
*   **`isVisible`:** `false` (error message hidden from clients)

```typescript
import { InternalServerErrorException } from 'chanfana';

// In your endpoint
try {
    await criticalOperation();
} catch (e) {
    console.error("Critical operation failed:", e);
    throw new InternalServerErrorException("Database connection failed"); // Message won't be exposed
}
```

### `BadGatewayException`: Upstream Server Error (502)

`BadGatewayException` is used when an upstream server returns an invalid response.

**Key features:**
*   **`status`:** `502 Bad Gateway`
*   **`code`:** `7010`
*   **`default_message`:** `"Bad Gateway"`

### `ServiceUnavailableException`: Service Temporarily Unavailable (503)

`ServiceUnavailableException` is used when the server is temporarily unavailable (e.g., maintenance, overload). It includes an optional `retryAfter` property.

**Key features:**
*   **`status`:** `503 Service Unavailable`
*   **`code`:** `7011`
*   **`default_message`:** `"Service Unavailable"`
*   **`retryAfter`:** Optional number of seconds until the service is available. When provided, chanfana automatically sets the `Retry-After` HTTP response header.

```typescript
import { ServiceUnavailableException } from 'chanfana';

// In your endpoint
if (maintenanceMode) {
    throw new ServiceUnavailableException("Service under maintenance", 300); // Retry after 5 minutes
}
// Response will include header: Retry-After: 300
```

### `GatewayTimeoutException`: Upstream Server Timeout (504)

`GatewayTimeoutException` is used when an upstream server doesn't respond in time.

**Key features:**
*   **`status`:** `504 Gateway Timeout`
*   **`code`:** `7012`
*   **`default_message`:** `"Gateway Timeout"`

## Exception Summary Table

| Exception | Status | Code | Default Message | Special Properties |
|-----------|--------|------|-----------------|-------------------|
| `ApiException` | 500 | 7000 | "Internal Error" | Base class |
| `InputValidationException` | 400 | 7001 | "Input Validation Error" | `path` |
| `NotFoundException` | 404 | 7002 | "Not Found" | - |
| `UnauthorizedException` | 401 | 7003 | "Unauthorized" | - |
| `ForbiddenException` | 403 | 7004 | "Forbidden" | - |
| `MethodNotAllowedException` | 405 | 7005 | "Method Not Allowed" | - |
| `ConflictException` | 409 | 7006 | "Conflict" | - |
| `UnprocessableEntityException` | 422 | 7007 | "Unprocessable Entity" | `path` |
| `TooManyRequestsException` | 429 | 7008 | "Too Many Requests" | `retryAfter` |
| `InternalServerErrorException` | 500 | 7009 | "Internal Server Error" | `isVisible: false` |
| `BadGatewayException` | 502 | 7010 | "Bad Gateway" | - |
| `ServiceUnavailableException` | 503 | 7011 | "Service Unavailable" | `retryAfter` |
| `GatewayTimeoutException` | 504 | 7012 | "Gateway Timeout" | - |

### `MultiException`: Managing Multiple Errors

`MultiException` is used to group multiple `ApiException` instances together. This can be useful when you need to report multiple validation errors or other types of errors simultaneously.

**Key features of `MultiException`:**

*   **Extends `ApiException`:** Inherits from the `ApiException` class.
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

## Validation Error Format

When request validation fails (e.g., a required field is missing or has the wrong type), chanfana automatically converts the Zod validation errors into `InputValidationException` instances wrapped in a `MultiException`. This ensures validation errors use a consistent format that matches the OpenAPI schema:

```json
{
    "success": false,
    "errors": [
        {
            "code": 7001,
            "message": "Invalid input: expected string, received number",
            "path": ["body", "name"]
        },
        {
            "code": 7001,
            "message": "Invalid input: expected number, received undefined",
            "path": ["body", "age"]
        }
    ],
    "result": {}
}
```

Each validation error includes:
- **`code`:** `7001` (the `InputValidationException` error code)
- **`message`:** The human-readable validation error message from Zod
- **`path`:** Array of strings indicating the location of the invalid field (e.g., `["body", "name"]`, `["query", "page"]`)

## The `handleError` Hook

`OpenAPIRoute` provides a `handleError` hook that lets you transform errors thrown during `handle()` before chanfana's default error formatting runs. This is useful when you need to:

- Wrap chanfana exceptions in your own error types
- Re-classify errors (e.g., convert validation errors to a custom format)
- Route specific errors to your framework's error handler (e.g., Hono's `onError`)

**Method signature:**

```typescript
protected handleError(error: unknown): unknown {
    return error; // Default: pass through unchanged
}
```

The returned value is used for all subsequent error handling:
- If `raiseOnError` is true (Hono adapter), the returned error is re-thrown to Hono's `onError`.
- Otherwise, chanfana's `formatChanfanaError` is called on the returned error.

::: tip
When [`passthroughErrors`](./openapi-configuration-customization.md#passthrougherrors-bypass-chanfana-error-handling) is enabled, the `handleError()` hook is skipped entirely — errors propagate raw from `handle()` without any transformation.
:::

**Example: Custom error wrapping for Hono**

A common pattern is wrapping `ApiException` in a custom error class so that it bypasses chanfana's built-in formatter and reaches Hono's `onError`, where you can apply your own response format:

```typescript
import { ApiException, OpenAPIRoute, NotFoundException } from 'chanfana';

// Custom error that chanfana won't recognize
class MyAppError extends Error {
    constructor(public readonly original: ApiException) {
        super(original.message);
    }
}

class MyEndpoint extends OpenAPIRoute {
    protected handleError(error: unknown): unknown {
        if (error instanceof ApiException) {
            return new MyAppError(error);
        }
        return error;
    }

    async handle(c) {
        throw new NotFoundException("Resource not found");
    }
}
```

Then in your Hono app:

```typescript
app.onError((err, c) => {
    if (err instanceof MyAppError) {
        // Your custom error format
        return c.json({
            ok: false,
            error: { code: err.original.code, message: err.original.message }
        }, err.original.status);
    }
    return c.json({ error: "Internal Server Error" }, 500);
});
```

**Example: Re-classifying validation errors**

```typescript
class StrictEndpoint extends OpenAPIRoute {
    protected handleError(error: unknown): unknown {
        // Convert validation MultiException to a single ApiException
        if (error instanceof MultiException) {
            return new ApiException("Request validation failed");
        }
        return error;
    }
}
```

## Global Error Handling Strategies

While Chanfana provides structured exception handling within endpoints, you can also implement global error handling for centralized error logging, monitoring, and custom response formatting.

### Hono: Automatic `onError` Integration

When using `fromHono()`, Chanfana automatically converts its errors (validation errors and `ApiException` subclasses) into Hono [`HTTPException`](https://hono.dev/docs/api/exception) instances. This means all chanfana errors flow through Hono's `app.onError` handler, enabling centralized error handling.

The `HTTPException` wraps chanfana's standard JSON error response, accessible via `err.getResponse()`. If you don't define an `onError` handler, Hono's default behavior calls `err.getResponse()` automatically -- so the response format is the same as before, with no extra setup required.

**Example: Centralized Error Logging with Hono**

```typescript
import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { fromHono } from 'chanfana';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
    console.error("Global error handler caught:", err);

    if (err instanceof HTTPException) {
        // Chanfana errors arrive as HTTPException with the formatted response attached.
        // Call getResponse() to return chanfana's standard error format.
        return err.getResponse();
    }

    // For non-chanfana errors, return a generic 500 response
    return c.json({ success: false, errors: [{ code: 7000, message: "Internal Server Error" }] }, 500);
});

const openapi = fromHono(app);

// Register your endpoints...

export default app;
```

In this example, `app.onError` receives all errors thrown within Hono routes:

*   **Chanfana errors** (validation failures, `ApiException` subclasses like `NotFoundException`, `InputValidationException`, etc.) arrive as `HTTPException` instances. Calling `err.getResponse()` returns chanfana's standard JSON error response with the correct status code.
*   **Non-chanfana errors** (raw `Error`, `TypeError`, etc.) arrive as-is, allowing you to handle them separately.

::: tip
Unknown errors that are not `ZodError` or `ApiException` subclasses are **not** wrapped in `HTTPException` -- they propagate to `onError` as-is.
:::

#### Bypassing Chanfana's Error Formatting

If you want errors to propagate to Hono's `onError` without chanfana touching them at all — no `handleError()` hook, no JSON formatting, no `HTTPException` wrapping — use the [`passthroughErrors`](./openapi-configuration-customization.md#passthrougherrors-bypass-chanfana-error-handling) option:

```typescript
import { Hono, type Context } from 'hono';
import { fromHono, NotFoundException, ApiException } from 'chanfana';
import { ZodError } from 'zod';

export type Env = {
    // Example bindings, use your own
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
    console.error("Raw error:", err);

    // Chanfana exceptions arrive as-is — not wrapped in HTTPException
    if (err instanceof ApiException) {
        return c.json({
            ok: false,
            code: err.code,
            message: err.message,
        }, err.status as any);
    }

    // Validation errors arrive as raw ZodError
    if (err instanceof ZodError) {
        return c.json({
            ok: false,
            validationErrors: err.issues,
        }, 400);
    }

    return c.json({ ok: false, message: 'Internal Server Error' }, 500);
});

const openapi = fromHono(app, { passthroughErrors: true });
```

With `passthroughErrors: true`, chanfana's entire error pipeline is bypassed:

1. **`handleError()` hook** — skipped entirely
2. **`formatChanfanaError()`** — skipped entirely
3. **`HTTPException` wrapping** (Hono adapter) — skipped entirely

This means `err instanceof HTTPException` will **not** match chanfana errors in your `onError` handler. You handle the raw exception types directly (`ApiException`, `ZodError`, `Error`, etc.).

This is useful when you want to:
- Apply your own error response format instead of chanfana's standard `{ success, errors, result }` shape
- Integrate with a shared error handler that doesn't understand `HTTPException`
- Handle `ZodError` validation failures with your own logic

### itty-router: Internal Error Formatting

itty-router does not have an `onError` mechanism. When using `fromIttyRouter()`, chanfana catches errors internally and formats them into JSON responses directly -- the same behavior as previous versions. No additional error handling setup is needed.

---

By using Chanfana's exception system and implementing proper error handling strategies, you can build APIs that are not only robust and reliable but also provide a clear and helpful experience for developers consuming your API.
