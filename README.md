<div align="center">
  <a href="https://chanfana.pages.dev/">
    <img src="https://raw.githubusercontent.com/cloudflare/chanfana/refs/heads/main/docs/public/assets/logo.png" width="500" height="auto" alt="chanfana"/>
  </a>
</div>


<p align="center">
    <em>OpenAPI 3 and 3.1 schema generator and validator for <a href="https://github.com/honojs/hono" target="_blank">Hono</a>, <a href="https://github.com/kwhitley/itty-router" target="_blank">itty-router</a> and more!</em>
</p>

<hr />

**Documentation**: <a href="https://chanfana.pages.dev/">chanfana.pages.dev</a>

**Source Code**: <a href="https://github.com/cloudflare/chanfana/">github.com/cloudflare/chanfana</a>

<hr />

[chanfana](https://github.com/cloudflare/chanfana) **(previously known as itty-router-openapi)** is a library that adds
OpenAPI schema generation and validation to any router (<a href="https://github.com/honojs/hono" target="_blank">
Hono</a>, <a href="https://github.com/kwhitley/itty-router" target="_blank">itty-router</a>, etc), meant to be a
powerful and lightweight
library for Cloudflare Workers but runs on any runtime supported by the base router.

The key features are:

- OpenAPI 3 and 3.1 schema generator and validator
- Fully written in typescript
- [Class-based endpoints](https://chanfana.pages.dev/endpoints/defining-endpoints)
- Query, Path, Headers, and Body typescript inference, see [Parameters](https://chanfana.pages.dev/endpoints/parameters) and [Request Validation](https://chanfana.pages.dev/endpoints/request-validation)
- Extend existing [Hono](https://chanfana.pages.dev/router-adapters), [itty-router](https://chanfana.pages.dev/router-adapters), etc application, without touching old routes
- CLI to extract the schema.json from your code (npx chanfana) - see [CLI Documentation](https://chanfana.pages.dev/cli)

## Getting started

Get started with a template with this command:

```bash
npm create cloudflare@latest -- --type openapi
```

## Installation

```bash
npm i chanfana --save
```

## Command-Line Interface (CLI)

Chanfana includes a CLI tool to help you extract the OpenAPI schema from your Cloudflare Worker project. This is useful for generating a static schema file, for example, in CI/CD pipelines.

The basic command is:
```bash
npx chanfana
```
This will start your worker using `wrangler dev`, fetch the schema from `/openapi.json`, and save it to `schema.json`.

For more details on options and usage, please refer to the [**CLI Documentation**](https://chanfana.pages.dev/cli).

## Minimal Hono Example

```ts
import { fromHono, OpenAPIRoute } from 'chanfana'
import { Hono } from 'hono'
import { z } from 'zod'

export type Env = {
    // Example bindings
    DB: D1Database
    BUCKET: R2Bucket
}
export type AppContext = Context<{ Bindings: Env }>

export class GetPageNumber extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({
        id: z.string().min(2).max(10),
      }),
      query: z.object({
        page: z.number().int().min(0).max(20),
      }),
    },
  }

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>()

    return c.json({
      id: data.params.id,
      page: data.query.page,
    })
  }
}

// Start a Hono app
const app = new Hono<{ Bindings: Env }>()

// Setup OpenAPI registry
const openapi = fromHono(app)

// Register OpenAPI endpoints (this will also register the routes in Hono)
openapi.get('/entry/:id', GetPageNumber)

// Export the Hono app
export default app
```

## Feedback and contributions

[chanfana](https://github.com/cloudflare/chanfana) aims to be at the core of new APIs built using
Workers and define a pattern to allow everyone to
have an OpenAPI-compliant schema without worrying about implementation details or reinventing the wheel.

chanfana is considered stable and production ready and is being used with
the [Radar 2.0 public API](https://developers.cloudflare.com/radar/) and many other Cloudflare products.

You can also talk to us in the [Cloudflare Community](https://community.cloudflare.com/) or
the [Radar Discord Channel](https://discord.com/channels/595317990191398933/1035553707116478495)
