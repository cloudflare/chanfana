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




#### Example parameters:

```ts
parameters = {
  page: Query(Number, {
    description: 'Page number',
    default: 1,
    required: false,
  }),
  search: Query(
    new Str({
      description: 'Search query',
      example: 'funny people',
    }),
    { required: false }
  ),
}
```
