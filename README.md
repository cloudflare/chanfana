# itty-router-openapi

<p align="center">
    <em>OpenAPI 3 and 3.1 schema generator and validator for <a href="https://developers.cloudflare.com/workers/" target="_blank">Cloudflare Workers</a></em>
</p>

---

**Documentation**: <a href="https://cloudflare.github.io/itty-router-openapi/">https://cloudflare.github.io/itty-router-openapi/</a>

**Source Code**: <a href="https://github.com/cloudflare/itty-router-openapi/">https://github.com/cloudflare/itty-router-openapi/</a>

---

[itty-router-openapi](https://github.com/cloudflare/itty-router-openapi) is a library that
extends [itty-router](https://github.com/kwhitley/itty-router), a powerful and lightweight routing system for Cloudflare
Workers, already familiar to many developers, and adds an easy-to-use and
compact [OpenAPI 3 and 3.1](https://swagger.io/specification/) schema generator and
validator.

itty-route-openapi can also have class-based routes, allowing the developer to quickly build on top of and extend other
endpoints while reusing code.

The key features are:

- OpenAPI 3 and 3.1 schema generator
- [Query](https://cloudflare.github.io/itty-router-openapi/user-guide/query-parameters/),
  [Path](https://cloudflare.github.io/itty-router-openapi/user-guide/path-parameters/),
  [Request Body](https://cloudflare.github.io/itty-router-openapi/user-guide/request-body/) and
  [Header](https://cloudflare.github.io/itty-router-openapi/user-guide/header-parameters/) validator
- Fully written in typescript
- Class-based endpoints
- Out of the box [OpenAI plugin support](https://cloudflare.github.io/itty-router-openapi/advanced-user-guide/openai-plugin/)
- [Drop-in replacement](https://cloudflare.github.io/itty-router-openapi/migrating-from-itty-router/) for existing itty-router applications

A template repository is available
at [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk/tree/main/templates/worker-openapi),
with a live demo [here](https://worker-openapi-example.radar.cloudflare.com/docs).

## Why create another router library for workers?

This framework built on top of [itty-router](https://github.com/kwhitley/itty-router) and extends some of its
core features, such as adding class-based endpoints. It also provides a simple and iterative path for migrating from old
applications based on `itty-router`.

Building APIs and maintaining good documentation on the parameters and fields of your API hard. However, there is an
open standard that makes this documentation process much more effortless, called [OpenAPI](https://www.openapis.org/).

OpenAPI "defines a standard, language-agnostic interface to RESTful APIs which allows both humans and computers to
discover and understand the capabilities of the service without access to source code, documentation, or through network
traffic inspection." This allows other machines to reliably parse those definitions and use the remote APIs easily,
without additional implementation logic.

Some of the top requirements for Radar 2.0 were having better API documentation, improving the deployment lifecycle with
end-to-end testing, and making it publicly available to Cloudflare customers. OpenAPI support quickly jumped out as the
obvious choice to help us on all these fronts.

However, we struggled to find an existing OpenAPI framework that checked all our boxes:

- Easy integration with Cloudflare Workers
- Input validation for endpoints parameters
- Actual code-based schema generation (not just generated from comments or manually)

Since we couldn't find anything that suited us, as many engineers do, we opted for the second-best alternative: building
our own and open-source it.

## Quick setup

Get started fast using the `create-cloudflare` command line, just run this command to setup an initial project with
some example routes:

<!-- termynal -->

```bash
npm create cloudflare@latest hello-world -- --type openapi

---> 100%
```

Then to start the local server just run

```bash
cd hello-world
wrangler dev
```

## Installation

<!-- termynal -->

```bash
npm i @cloudflare/itty-router-openapi --save

---> 100%
```

## Example

Let's create our first class-based endpoint called TaskFetch in src/tasks.ts now.

Make sure that ‘Task' is global, otherwise you must redefine `responses.schema.task` with every endpoint.

When defining the schema, you can interchangeably use native typescript types or use the included types to set required
flags, descriptions, and other fields.

```ts
import {
  OpenAPIRoute,
  Path,
  Str,
  DateOnly,
} from '@cloudflare/itty-router-openapi'

const Task = {
  name: new Str({ example: 'lorem' }),
  slug: String,
  description: new Str({ required: false }),
  completed: Boolean,
  due_date: new DateOnly(),
}

export class TaskFetch extends OpenAPIRoute {
  static schema = {
    tags: ['Tasks'],
    summary: 'Get a single Task by slug',
    parameters: {
      taskSlug: Path(Str, {
        description: 'Task slug',
      }),
    },
    responses: {
      '200': {
        schema: {
          metaData: {},
          task: Task,
        },
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    // Retrieve the validated slug
    const { taskSlug } = data

    // Actually fetch a task using the taskSlug

    return {
      metaData: { meta: 'data' },
      task: {
        name: 'my task',
        slug: taskSlug,
        description: 'this needs to be done',
        completed: false,
        due_date: new Date().toISOString().slice(0, 10),
      },
    }
  }
}
```

Now initialize a new OpenAPIRouter, and reference our newly created endpoint as a regular ‘itty-router’ .get route:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'
import { TaskFetch } from './tasks'

const router = OpenAPIRouter()
router.get('/api/tasks/:taskSlug/', TaskFetch)

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }))

export default {
  fetch: router.handle,
}
```

Finally, run `wrangler dev` and head to `/docs` our `/redocs` with your browser.

You'll be greeted with a beautiful OpenAPI page that you can use to test and call your new endpoint.

![Tutorial Example Preview](https://raw.githubusercontent.com/cloudflare/itty-router-openapi/main/docs/images/tutorial-example.png)

Pretty easy, right?

## Feedback and contributions

[itty-router-openapi](https://github.com/cloudflare/itty-router-openapi) aims to be at the core of new APIs built using
Workers and define a pattern to allow everyone to
have an OpenAPI-compliant schema without worrying about implementation details or reinventing the wheel.

itty-router-openapi is considered stable and production ready and is being used with
the [Radar 2.0 public API](https://developers.cloudflare.com/radar/).

Currently this package is maintained by the [Cloudflare Radar Team](https://radar.cloudflare.com/) and features are
prioritized based on the Radar roadmap.

Nonetheless you can still open pull requests or issues in this repository and they will get reviewed.

You can also talk to us in the [Cloudflare Community](https://community.cloudflare.com/) or
the [Radar Discord Channel](https://discord.com/channels/595317990191398933/1035553707116478495)
