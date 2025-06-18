# Welcome to Chanfana

![Chanfana Logo](/assets/logo.png)

Chanfana is a powerful and lightweight TypeScript library designed to effortlessly bring the benefits of OpenAPI to your web APIs. Built with modern JavaScript runtimes in mind, especially Cloudflare Workers, Chanfana provides schema generation and validation for popular routers like [Hono](https://github.com/honojs/hono) and [itty-router](https://github.com/kwhitley/itty-router), and is adaptable to many more.

## What is Chanfana?

Chanfana, previously known as `itty-router-openapi`, is more than just an OpenAPI generator. It's a comprehensive toolkit that allows you to:

*   **Define your API contracts using TypeScript classes and Zod schemas.** Write your API logic and schema in one place, ensuring type safety and reducing boilerplate.
*   **Automatically generate OpenAPI v3 and v3.1 compliant schemas.**  No more manual schema writing! Chanfana infers your API structure directly from your code.
*   **Enforce request validation.**  Protect your API by automatically validating incoming requests against your defined schemas.
*   **Serve interactive API documentation.**  Chanfana seamlessly integrates with Swagger UI and ReDoc to provide beautiful, interactive documentation for your API consumers.
*   **Extend your existing router applications.**  Integrate Chanfana into your Hono or itty-router projects without rewriting your existing routes.

Chanfana is built to be both powerful and lightweight, making it ideal for serverless environments like Cloudflare Workers, but it runs perfectly well in any JavaScript runtime.

## Key Features at a Glance

*   **OpenAPI v3 & v3.1 Schema Generation:**  Supports the latest OpenAPI specifications.
*   **TypeScript First:**  Fully written in TypeScript, providing excellent type safety and developer experience.
*   **Class-Based Endpoints:**  Organize your API logic using clean, reusable classes.
*   **Automatic Type Inference:**  Leverage TypeScript's power for automatic inference of request parameters (query, path, headers, body).
*   **Extensible Router Support:**  Designed to work seamlessly with Hono, itty-router, and adaptable to other routers.
*   **Built-in Validation:**  Automatic request validation based on your OpenAPI schemas.
*   **Interactive Documentation:**  Effortless integration with Swagger UI and ReDoc for API documentation.
*   **Lightweight and Performant:**  Optimized for serverless environments and fast runtimes.
*   **Production Ready:**  Used in production at Cloudflare and powering public APIs like [Radar 2.0](https://developers.cloudflare.com/radar/).

## Why Choose Chanfana?

In today's API-driven world, having a well-defined and documented API is crucial. Chanfana simplifies this process by:

*   **Reducing Development Time:**  Automatic schema generation eliminates the tedious task of manually writing OpenAPI specifications.
*   **Improving API Quality:**  Schema validation ensures that your API behaves as expected and reduces integration issues.
*   **Enhancing Developer Experience:**  TypeScript and class-based endpoints provide a structured and enjoyable development workflow.
*   **Facilitating Collaboration:**  OpenAPI documentation makes it easy for teams to understand and work with your APIs.
*   **Boosting Confidence:**  Production readiness and usage in large-scale projects give you confidence in Chanfana's reliability.

## Who is Chanfana For?

Chanfana is designed for developers who want to build robust, well-documented, and maintainable APIs, especially if you are:

*   **Building APIs with Hono or itty-router.** Chanfana provides first-class support for these popular routers.
*   **Developing serverless APIs on Cloudflare Workers or similar platforms.** Chanfana's lightweight nature is perfect for serverless environments.
*   **Seeking to adopt OpenAPI for your APIs.** Chanfana makes it easy to generate and utilize OpenAPI specifications.
*   **Looking for a TypeScript-first API development experience.** Chanfana leverages TypeScript to its fullest potential.
*   **Wanting to automate API documentation and validation.** Chanfana handles these tasks so you can focus on your API logic.

Whether you are building a small personal project or a large-scale enterprise API, Chanfana can help you create better APIs, faster.

---

Ready to get started? Let's move on to the [**Getting Started**](./getting-started.md) guide to set up your first Chanfana API!
