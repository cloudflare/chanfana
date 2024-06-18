# chanfana

<p align="center">
    <em>OpenAPI 3 and 3.1 schema generator and validator for <a href="https://github.com/honojs/hono" target="_blank">Hono</a>, <a href="https://github.com/kwhitley/itty-router" target="_blank">itty-router</a> and more!</em>
</p>

---

**Documentation**: <a href="https://chanfana.pages.dev/">chanfana.pages.dev</a>

**Source Code**: <a href="https://github.com/cloudflare/chanfana/">github.com/cloudflare/chanfana</a>

---

[chanfana](https://github.com/cloudflare/chanfana) **(previously known as itty-router-openapi)** is a library that adds
OpenAPI schema generation and validation to any router (<a href="https://github.com/honojs/hono" target="_blank">
Hono</a>, <a href="https://github.com/kwhitley/itty-router" target="_blank">itty-router</a>, etc), meant to be a
powerful and lightweight
library for Cloudflare Workers but runs on any runtime supported by the base router.

The key features are:

- OpenAPI 3 and 3.1 schema generator and validator
- Query, Path, Headers and Body typescript inference
- Fully written in typescript
- Class-based endpoints
- Extend existing Hono, itty-router, etc application, without touching old routes

## Getting started

Get started with a template with this command:

```bash
npm create cloudflare@latest -- --type openapi
```

## Installation

```bash
npm i chanfana --save
```

## Minimal Hono Example

```ts
import { fromHono, OpenAPIRoute } from 'chanfana'
import { Hono } from 'hono'
import { z } from 'zod'

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

  async handle(c) {
    const data = await this.getValidatedData<typeof this.schema>()

    return c.json({
      id: data.params.id,
      page: data.query.page,
    })
  }
}

// Star a Hono app
const app = new Hono()

// Setup OpenAPI registry
const openapi = fromHono(app)

// Register OpenAPI endpoints
openapi.get('/entry/:id', GetPageNumber)

// Export the Hono app
export default app
```

## Feedback and contributions

[chanfana](https://github.com/cloudflare/chanfana) aims to be at the core of new APIs built using
Workers and define a pattern to allow everyone to
have an OpenAPI-compliant schema without worrying about implementation details or reinventing the wheel.

chanfana is considered stable and production ready and is being used with
the [Radar 2.0 public API](https://developers.cloudflare.com/radar/).

Currently this package is maintained by the [Cloudflare Radar Team](https://radar.cloudflare.com/) and features are
prioritized based on the Radar roadmap.

Nonetheless you can still open pull requests or issues in this repository and they will get reviewed.

You can also talk to us in the [Cloudflare Community](https://community.cloudflare.com/) or
the [Radar Discord Channel](https://discord.com/channels/595317990191398933/1035553707116478495)
