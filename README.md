# itty-router-openapi

This library provides an easy and compact OpenAPI 3 and 3.1 schema generator and validator
for [Cloudflare Workers](https://developers.cloudflare.com/workers/).

`itty-router-openapi` is built on top of [itty-router](https://github.com/kwhitley/itty-router) and extends some of its
core features, such as adding class-based endpoints. It also provides a simple and iterative path for migrating from old
applications based on `itty-router`.

A template repository is available
at [cloudflare/templates](https://github.com/cloudflare/workers-sdk/tree/main/templates/worker-openapi),
with a live demo [here](https://worker-openapi-example.radar.cloudflare.com/docs).

There is a Tutorial Section [available here](https://github.com/cloudflare/itty-router-openapi/blob/main/TUTORIAL.md)!

## Features

- [x] Drop-in replacement for existing itty-router applications
- [x] OpenAPI 3 and 3.1 schema generator and validator
- [x] Query, Path, Request Body and Header validator
- [x] Fully written in typescript
- [x] Class-based endpoints
- [x] Out of the box OpenAI plugin support

## Installation

```
npm i @cloudflare/itty-router-openapi --save
```

## Basic Usage

Creating a new OpenAPI route is simple:

- Create a new class that extends the base `Route`.
- Fill your schema parameters.
- Add your code to the handle function.

In the example below, the `ToDoList` route will have an Integer parameter called `page` that will be validated before
calling the `handle()` function.

Then the page number will be available inside the `handle()` function in the data object passed in the argument.

Take notice that the `data` object is always the **last argument** that the `handle()` function receives.

If you try to send a value that is not an Integer in this field, a `ValidationError` will be raised, and the Route will
internally convert into a readable HTTP 400 error.

Endpoints can return both `Response` instances or an object that internally will be returned as a JSON Response.

```ts
import { OpenAPIRoute, Query, Int, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    parameters: {
      page: Query(Int, {
        description: 'Page number',
        default: 1,
        required: false,
      }),
    },
    responses: {
      '200': {
        schema: {
          currentPage: 1,
          nextPage: 2,
          results: ['lorem'],
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}
```

Then, ideally in a different file, you can register the routes normally:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }))

export default {
  fetch: router.handle,
}
```

Now `wrangler dev` and go to `/docs` or `/redocs` with your browser. You'll be greeted with an OpenAPI UI that you can
use to call your endpoints.

## Feedback and contributions

Currently this package is maintained by the [Cloudflare Radar Team](https://radar.cloudflare.com/) and features are
prioritized based on the Radar roadmap.

Nonetheless you can still open pull requests or issues in this repository and they will get reviewed.

You can also talk to us in the [Cloudflare Community](https://community.cloudflare.com/) or
the [Radar Discord Channel](https://discord.com/channels/595317990191398933/1035553707116478495)
