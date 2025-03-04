# Core Concepts of Chanfana

To effectively use Chanfana, it's important to understand its core concepts. This section will break down the fundamental ideas behind Chanfana and how they work together to simplify API development and documentation.

## OpenAPI Specification: The Foundation

At its heart, Chanfana is built around the [OpenAPI Specification](https://www.openapis.org/) (formerly known as Swagger Specification). OpenAPI is a standard, language-agnostic format to describe RESTful APIs. It allows both humans and computers to understand the capabilities of an API without access to source code, documentation, or network traffic inspection.

**Key benefits of using OpenAPI:**

*   **Standardized API Descriptions:** Provides a universal language for describing APIs, making them easier to understand and integrate with.
*   **Automated Documentation:** Enables the generation of interactive API documentation, like Swagger UI and ReDoc, directly from the specification.
*   **Code Generation:** Tools can automatically generate server stubs and client SDKs from OpenAPI specifications, speeding up development.
*   **API Design First:** Encourages designing your API contract before writing code, leading to better API design and consistency.

Chanfana leverages the OpenAPI specification to generate documentation and perform request validation, ensuring your API is well-defined and robust.

## Schema Generation and Validation: Ensuring API Quality

Chanfana's primary goal is to automate the generation of OpenAPI schemas and use these schemas for request validation.

*   **Schema Generation:** Chanfana automatically generates OpenAPI schemas by analyzing your endpoint definitions, specifically the `schema` property within your `OpenAPIRoute` classes. It uses [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi) under the hood to convert your Zod schemas into OpenAPI schema objects. This eliminates the need to manually write verbose YAML or JSON OpenAPI specifications.

*   **Request Validation:** Once you define your request schemas (for body, query parameters, path parameters, and headers), Chanfana automatically validates incoming requests against these schemas. This validation happens before your `handle` method is executed. If a request doesn't conform to the schema, Chanfana will automatically return a `400 Bad Request` response with detailed validation errors, protecting your API from invalid data and ensuring data integrity.

By combining schema generation and validation, Chanfana helps you build APIs that are not only well-documented but also inherently more reliable and secure.

## Routers: Hono, Itty Router, and Beyond

Chanfana is designed to be router-agnostic, meaning it can be integrated with various JavaScript web routers. Currently, it provides first-class adapters for:

*   **[Hono](https://github.com/honojs/hono):** A small, fast, and ultrafast web framework for the Edge. Hono is a popular choice for Cloudflare Workers and other edge runtimes. Chanfana's `fromHono` adapter seamlessly extends Hono with OpenAPI capabilities.

*   **[itty-router](https://github.com/kwhitley/itty-router):** A tiny, functional router, also very popular for Cloudflare Workers due to its simplicity and performance. Chanfana's `fromIttyRouter` adapter brings OpenAPI support to itty-router.

**Extensibility:**

Chanfana's architecture is designed to be extensible. While it provides adapters for Hono and itty-router out of the box, it can be adapted to work with other routers as well. The core logic of schema generation and validation is independent of the underlying router. If you are using a different router, you can potentially create a custom adapter to integrate Chanfana.

## `OpenAPIRoute`: Building Blocks of Your API

The `OpenAPIRoute` class is the central building block for defining your API endpoints in Chanfana. It's an abstract class that you extend to create concrete endpoint implementations.

**Key aspects of `OpenAPIRoute`:**

*   **Class-Based Structure:** Encourages organizing your endpoint logic within classes, promoting code reusability and maintainability.
*   **Schema Definition:**  The `schema` property within your `OpenAPIRoute` subclass is where you define the OpenAPI schema for your endpoint, including request and response specifications.
*   **`handle` Method:**  This is the core method where you implement the actual logic of your endpoint. It's executed after successful request validation.
*   **`getValidatedData()` Method:**  Provides access to the validated request data (body, query parameters, path parameters, headers) within your `handle` method, ensuring you are working with data that conforms to your schema.
*   **Lifecycle Hooks (e.g., `before`, `after`, `create`, `update`, `delete`, `fetch`, `list` in auto endpoints):**  Some subclasses of `OpenAPIRoute`, like the predefined CRUD endpoints, offer lifecycle hooks to customize behavior at different stages of the request processing.

By extending `OpenAPIRoute`, you create reusable and well-defined endpoints that automatically benefit from schema generation and validation.

## Request and Response Schemas: Defining API Contracts

The `schema` property in your `OpenAPIRoute` class is crucial for defining the contract of your API endpoint. It's an object that can contain the following key properties:

*   **`request`:** Defines the structure of the incoming request. It can specify schemas for:
    *   `body`: Request body (typically for `POST`, `PUT`, `PATCH` requests).
    *   `query`: Query parameters in the URL.
    *   `params`: Path parameters in the URL path.
    *   `headers`: HTTP headers.

*   **`responses`:** Defines the possible responses your API endpoint can return. For each response, you specify:
    *   `statusCode`: The HTTP status code (e.g., "200", "400", "500").
    *   `description`: A human-readable description of the response.
    *   `content`: The response body content, including the media type (e.g., "application/json") and the schema of the response body.

Chanfana uses Zod schemas to define the structure of both requests and responses. Zod is a TypeScript-first schema declaration and validation library that is highly expressive and type-safe. Chanfana provides helper functions like `contentJson` to simplify defining JSON request and response bodies.

## Data Validation: Protecting Your API

Data validation is automatically performed by Chanfana based on the request schemas you define in your `OpenAPIRoute` classes.

**How validation works:**

1.  **Request Interception:** When a request comes in for a Chanfana-managed route, Chanfana intercepts it before it reaches your `handle` method.
2.  **Schema Parsing:** Chanfana parses the request data (body, query parameters, path parameters, headers) and attempts to validate it against the corresponding schemas defined in your endpoint's `schema.request` property.
3.  **Zod Validation:** Under the hood, Chanfana uses Zod to perform the actual validation. Zod checks if the incoming data conforms to the defined schema rules (data types, required fields, formats, etc.).
4.  **Success or Failure:**
    *   **Success:** If the request data is valid according to the schema, Chanfana proceeds to execute your `handle` method. You can then access the validated data using `this.getValidatedData()`.
    *   **Failure:** If the request data is invalid, Zod throws a `ZodError` exception. Chanfana catches this exception and automatically generates a `400 Bad Request` response. This response includes a JSON body containing detailed information about the validation errors, helping clients understand what went wrong and how to fix their requests.

## Error Handling: Graceful API Responses

Chanfana provides a structured approach to error handling. When validation fails or when exceptions occur within your `handle` method, Chanfana aims to return informative and consistent error responses.

*   **Automatic Validation Error Responses:** As mentioned above, validation errors are automatically caught and transformed into `400 Bad Request` responses with detailed error messages.
*   **Exception Handling:** You can throw custom exceptions within your `handle` method to signal specific error conditions. Chanfana provides base exception classes like `ApiException`, `InputValidationException`, and `NotFoundException` that you can use or extend to create your own API-specific exceptions. These exceptions can be configured to automatically generate appropriate error responses and OpenAPI schema definitions for error responses.
*   **Consistent Error Format:** Chanfana encourages a consistent error response format (typically JSON) to make it easier for clients to handle errors from your API.

By understanding these core concepts, you are well-equipped to start building robust, well-documented, and maintainable APIs with Chanfana.

---

Next, let's explore how to [**Define Endpoints**](./endpoints/defining-endpoints.md) in more detail.
