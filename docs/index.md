---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "chanfana"
  image: assets/logo-icon.png
  tagline: OpenAPI 3 and 3.1 schema generator and validator for Hono, itty-router and more!
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: Auto Endpoints
      link: /endpoints/auto/base

features:
  - title: ✨ OpenAPI Schema Generation
    details: Automatically generate OpenAPI v3 & v3.1 compliant schemas from your TypeScript API endpoint definitions.
    link: /getting-started
  - title: ✅ Automatic Request Validation
    details: Enforce API contracts by automatically validating incoming requests against your defined schemas.
    link: /endpoints/request-validation
  - title: 🚀 Class-Based Endpoints
    details: Organize your API logic in a clean and structured way using class-based endpoints, promoting code reusability.
    link: /endpoints/defining-endpoints
  - title: 📦 Auto CRUD Endpoints
    details: Auto generate endpoints for common CRUD operations, reducing boilerplate.
    link: /endpoints/auto/base
  - title: ⌨️ TypeScript Type Inference
    details: Automatic type inference for request parameters, providing a type-safe and developer-friendly experience.
    link: /getting-started
  - title: 🔌 Router Adapters
    details: Seamlessly integrate Chanfana with popular routers like Hono and itty-router.
    link: /router-adapters
---
