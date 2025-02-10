# Troubleshooting and FAQ

This section provides solutions to common issues you might encounter while using Chanfana, frequently asked questions, debugging tips, and resources for getting help and support.

## Common Issues and Solutions

**1. "TypeError: Router.get is not a function" or similar errors when using `fromHono` or `fromIttyRouter`:**

*   **Cause:** You might be calling `fromHono` or `fromIttyRouter` on an object that is not a valid Hono or itty-router router instance.
*   **Solution:** Ensure that you are passing a valid router instance to `fromHono` or `fromIttyRouter`. Double-check your router initialization code:

    ```typescript
    // Hono example:
    import { Hono } from 'hono';
    const app = new Hono(); // Correct: Initialize Hono router
    const openapi = fromHono(app, {/* options */});

    // Itty-router example:
    import { Router } from 'itty-router';
    const router = Router(); // Correct: Initialize itty-router
    const openapi = fromIttyRouter(router, {/* options */});
    ```

**2. OpenAPI documentation is not showing up at `/docs` or `/openapi.json`:**

*   **Cause 1:** You haven't registered any routes with Chanfana's `openapi` instance.
*   **Solution:** Make sure you are registering your `OpenAPIRoute` classes using methods like `openapi.get()`, `openapi.post()`, etc., and **not** directly on the original router instance (`app.get()` in Hono or `router.get()` in itty-router after initialization with Chanfana).

    ```typescript
    // Correct: Register route with Chanfana's openapi instance
    openapi.get('/my-endpoint', MyEndpointClass);

    // Incorrect: Registering directly on the Hono app instance (OpenAPI not enabled for this route)
    app.get('/another-endpoint', () => new Response("Hello"));
    ```

*   **Cause 2:** You have set `docs_url`, `redoc_url`, or `openapi_url` to `null` in `RouterOptions`.
*   **Solution:** Check your `RouterOptions` and ensure that `docs_url`, `redoc_url`, and `openapi_url` are set to valid URL paths (strings) if you want to enable documentation UIs and schema endpoints.

*   **Cause 3:** Your application is not running or is not accessible at the expected address and port.
*   **Solution:** Verify that your application is running correctly and is accessible in your browser or using `curl` at the URL where you expect to see the documentation.

**3. Request validation errors are not being handled as expected:**

*   **Cause 1:** You are not defining request schemas in your `OpenAPIRoute` classes.
*   **Solution:** Ensure that you have defined request schemas (e.g., `schema.request.body`, `schema.request.query`, etc.) in your `OpenAPIRoute` classes for the endpoints where you want request validation to be performed.

*   **Cause 2:** You are catching and handling `ZodError` exceptions manually in your `handle` method, potentially overriding Chanfana's default error handling.
*   **Solution:** In most cases, you should **not** manually catch `ZodError` exceptions within your `handle` method. Let Chanfana automatically handle validation errors and return `400 Bad Request` responses. Only catch exceptions if you need to perform custom error handling logic for specific error types other than validation errors.

**4. "TypeError: Cannot read properties of undefined (reading 'schema')" or similar errors related to `_meta`:**

*   **Cause:** You are using auto endpoints (`CreateEndpoint`, `ReadEndpoint`, etc.) without properly defining the `_meta` property in your endpoint class.
*   **Solution:** When using auto endpoints, you **must** define the `_meta` property and assign a valid `Meta` object to it. Ensure that your `Meta` object includes the `model` property with `schema`, `primaryKeys`, and `tableName` (if applicable).

    ```typescript
    class MyCreateEndpoint extends CreateEndpoint {
        _meta = { // Correct: Define _meta property
            model: {
                schema: MyDataModel,
                primaryKeys: ['id'],
                tableName: 'my_table',
            },
        };
         { /* ... */ };
        // ...
    }
    ```

**5. OpenAPI schema is missing descriptions or examples:**

*   **Cause:** You have not provided descriptions or examples in your Zod schemas or Chanfana parameter types.
*   **Solution:** Use Zod's `describe()` method and Chanfana parameter type options like `description` and `example` to add metadata to your schemas. This metadata is used to generate more informative OpenAPI documentation.

    ```typescript
    const nameSchema = Str({ description: 'User name', example: 'John Doe' }); // Add description and example
    const ageSchema = Int({ description: 'User age' }); // Add description
    ```

**6. D1 endpoints are not working, "Binding 'DB' is not defined in worker" error:**

*   **Cause:** You have not correctly configured the D1 database binding in your `wrangler.toml` file, or the binding name in your code (`dbName = 'DB'`) does not match the binding name in `wrangler.toml`.
*   **Solution:**
    *   Verify your `wrangler.toml` file and ensure that you have a `[[d1_databases]]` section with a `binding` name (e.g., `binding = "DB"`).
    *   Make sure that the `dbName` property in your D1 endpoint class matches the `binding` name in `wrangler.toml` (case-sensitive).
    *   Ensure that you have deployed your Cloudflare Worker or are running it in a local environment where the D1 binding is correctly set up.

## Frequently Asked Questions (FAQ)

**Q: Can I use Chanfana with routers other than Hono and itty-router?**

**A:** Chanfana is designed to be router-agnostic in principle. While it provides official adapters for Hono and itty-router, you can potentially create custom adapters for other routers. However, creating a custom adapter might require a deeper understanding of Chanfana's internals and the API of the target router.

**Q: Does Chanfana support OpenAPI 3.1?**

**A:** Yes, Chanfana fully supports OpenAPI 3.1 (which is the default) and also OpenAPI 3.0.3. You can select the OpenAPI version using the `openapiVersion` option in `RouterOptions`.

**Q: Can I customize the generated OpenAPI document beyond the `RouterOptions`?**

**A:** Yes, you can customize the OpenAPI schema output extensively using Zod's `describe()` and `openapi()` methods, as well as Chanfana's parameter type options. For more advanced customizations or modifications to the generated OpenAPI document structure, you might need to extend or modify Chanfana's core classes (which is generally not recommended unless you have a deep understanding of the library).

**Q: Is Chanfana suitable for production APIs?**

**A:** Yes, Chanfana is considered stable and production-ready. It is used in production at Cloudflare and powers public APIs like [Radar 2.0](https://developers.cloudflare.com/radar/).

**Q: Does Chanfana support authentication and authorization?**

**A:** Chanfana itself does not provide built-in authentication or authorization mechanisms. However, it is designed to work seamlessly with middleware and custom logic for implementing authentication and authorization in your API endpoints. Refer to the [Examples and Recipes](./examples-and-recipes.md) section for a basic example of API key authentication.

**Q: How can I handle different content types (e.g., XML, plain text) in request and responses?**

**A:** Chanfana primarily focuses on JSON APIs and provides `contentJson` for simplifying JSON content handling. For handling other content types like XML or plain text, you might need to:

*   Manually define OpenAPI `content` objects in your schema without using `contentJson`.
*   Use Zod schemas that are appropriate for the data format (e.g., `z.string()` for plain text).
*   Handle request parsing and response serialization for non-JSON content types within your endpoint `handle` methods using router-specific or Fetch API methods.

*(Future versions of Chanfana might introduce more utilities for handling different content types.)*

## Debugging Tips

*   **Check Browser Console:** When using Swagger UI or ReDoc, inspect the browser's developer console for any JavaScript errors or warnings that might indicate issues with the documentation rendering or OpenAPI schema.
*   **Validate OpenAPI Schema:** Use online OpenAPI validators (e.g., Swagger Editor, ReDoc online validator) to validate your generated `openapi.json` schema file for any structural or syntax errors.
*   **Verbose Logging:** Add `console.log` statements in your endpoint `handle` methods and middleware to trace the request flow, data validation, and error handling logic.
*   **Simplify and Isolate:** If you encounter complex issues, try to simplify your endpoint definitions and isolate the problematic part of your code to narrow down the source of the error.
*   **Example Projects:** Refer to the example projects and code snippets in the documentation and Chanfana's repository for working examples and best practices.

## Getting Help and Support

*   **Chanfana GitHub Repository:** [https://github.com/cloudflare/chanfana/](https://github.com/cloudflare/chanfana/) - Check the repository for issues, discussions, and updates.
*   **Cloudflare Developer Community:** [https://community.cloudflare.com/](https://community.cloudflare.com/) - Ask questions and seek help from the Cloudflare developer community.
*   **Radar Discord Channel:** [https://discord.com/channels/595317990191398933/1035553707116478495](https://discord.com/channels/595317990191398933/1035553707116478495) - Join the Radar Discord channel for discussions and support related to Chanfana and Radar API development.
*   **Report Issues:** If you encounter bugs or have feature requests, please open an issue in the Chanfana GitHub repository.
