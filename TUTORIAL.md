# Building an OpenAPI with Workers

This is a follow-up to the
[How we built it: the technology behind Cloudflare Radar 2.0](https://blog.cloudflare.com/technology-behind-radar2/)
blog.

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

## OpenAPI for itty-router

[itty-router-openapi](https://github.com/cloudflare/itty-router-openapi) is a library that
extends [itty-router](https://github.com/kwhitley/itty-router), a powerful and lightweight routing system for Cloudflare
Workers, already familiar to many developers, and adds an easy-to-use and
compact [OpenAPI 3](https://swagger.io/specification/) schema generator and
validator.

itty-route-openapi can also have class-based routes, allowing the developer to quickly build on top of and extend other
endpoints while reusing code.

Let's see how all of this works, and create an example API using itty-router-openapi and Workers, step by step.

## Initializing the project

First, create a new directory, and use [wrangler](https://github.com/cloudflare/wrangler2), our command line tool for
building Cloudflare Workers, which we assume
you have [installed](https://github.com/cloudflare/wrangler2#installation) already, to initialize the project:

```bash
mkdir openapi-example && cd openapi-example
wrangler init
```

Now install `itty-router-openapi`:

```bash
npm i @cloudflare/itty-router-openapi --save
```

Let's create our first class-based endpoint called TaskFetch in src/tasks.ts now.

Make sure that ‘Task' is global, otherwise you must redefine `responses.schema.task` with every endpoint.

When defining the schema, you can interchangeably use native typescript types or use the included types to set required
flags, descriptions, and other fields.

```ts
import { OpenAPIRoute, Path, Str, DateOnly } from '@cloudflare/itty-router-openapi'

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

  async handle(request: Request, env: any, context: any, data: Record<string, any>) {
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

![Tutorial Example Preview](https://raw.githubusercontent.com/cloudflare/itty-router-openapi/main/docs/tutorial-example.png)

Pretty easy, right?

## Schema Validation

In the next example, a new TaskList endpoint has a schema with two parameters, `page` and `isCompleted`. When
the `handle` function is called, itty-router-openapi will have validated the input and made the resulting values
available in `data`.

```ts
import { OpenAPIRoute, Path, Int, Str, Query } from '@cloudflare/itty-router-openapi'

const Task = {
  name: new Str({ example: 'lorem' }),
  description: String,
  completed: Boolean,
}

export class TaskFetch extends OpenAPIRoute {
  // ...
}

export class TaskList extends OpenAPIRoute {
  static schema = {
    tags: ['Tasks'],
    summary: 'List all tasks',
    parameters: {
      page: Query(Int, {
        description: '',
        default: 1,
      }),
      isCompleted: Query(Boolean, {
        required: false,
      }),
    },
    responses: {
      '200': {
        schema: {},
        tasks: [Task],
      },
    },
  }

  async handle(request: Request, data: Record<string, any>) {
    // Retrieve the validated slug
    const { page, isCompleted } = data

    // the page parameter is always not null, because of the default value

    if (isCompleted !== null) {
      // Execute logic to filter by this flag
    }

    return {
      metaData: { meta: 'data' },
      tasks: [],
    }
  }
}
```

As you can see, itty-router-openapi does automatic input validation based on your route's schema and fills the handler'
s `data` argument with the endpoint with the corresponding parameter values.

Make sure to use the `data` object when reading the endpoint parameters. Don't access the `request` object directly.

## Migrating from an existing itty-router application

We specifically designed this library to be a drop-in replacement for already existing itty-router applications; All you
need to do is replace the `Router` class with `OpenAPIRouter`.

```ts
// Old router
//import { Router } from 'itty-router'
//const router = Router()

// New router
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()

// Old routes remain the same
router.get('/todos', () => new Response('Todos Index!'))
router.get('/todos/:id', ({ params }) => new Response(`Todo #${params.id}`))
```

## Conclusion

[itty-router-openapi](https://github.com/cloudflare/itty-router-openapi) aims to be at the core of new APIs built using
Workers and define a pattern to allow everyone to
have an OpenAPI-compliant schema without worrying about implementation details or reinventing the wheel.

itty-router-openapi is considered stable and production ready and is being used with
the [Radar 2.0 public API](https://developers.cloudflare.com/radar/).

However, we don't cover all of the OpenAPI standards yet. We are open to suggestions and feature requests in the
[GitHub repository](https://github.com/cloudflare/itty-router-openapi).

The source code for the example in this blog can
be [found here](https://github.com/cloudflare/templates/tree/main/worker-openapi), and we have deployed
it [online here](https://worker-openapi-example.radar.cloudflare.com/docs) so you can play with
it.

We are excited to see what the community will be building using this.

We opened a Radar room on our Developers [Discord Server](https://discord.cloudflare.com/). Feel free
to [join](https://discord.cloudflare.com/) it and ask us
questions; the team is eager to
receive feedback and discuss web technology with you.

You can also follow us [on Twitter](https://twitter.com/cloudflareradar) for more Radar updates.
