**Please make sure to read the [Types](../types.md) page before continuing.**


You can declare `Query` parameters in the `parameters` property of your endpoint schema.

The validated data is available under `data.query.<name>`, where name is the key used inside the `parameters` property.
 
## Basic parameter

For basic parameters you are fine using the Native types, this should cover almost everything you need to build a big
project.

```ts hl_lines="8-10"
import { OpenAPIRoute, Query, Int } from '@cloudflare/itty-router-openapi'

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    parameters: {
      limit: Query(Int, {
        description: 'Number of results to return',
      }),
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { limit } = data.query
    // ...
  }
}
```

## Advanced parameters

If you need a more advanced control over the validation, you should use [Zod](https://zod.dev/).

While the previous example will work well, you might want more control, like make the limit something between 10 and 100.

```ts hl_lines="9-11"
import { OpenAPIRoute, Query } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List ToDos',
    parameters: {
      limit: Query(z.coerce.number().gte(10).lte(100), {
        description: 'Number of results to return',
      }),
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { limit } = data.query
    // ...
  }
}
```

## Reusable parameters

While you can define a variable with your parameter and then reference it in more than 1 endpoint, you will notice that
you have to repeat the parameter name in all endpoints.

```ts hl_lines="4-6 13"
import { OpenAPIRoute, Query } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

const queryLimit = Query(z.coerce.number().gte(10).lte(100), {
  description: 'Number of results to return',
})

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List ToDos',
    parameters: {
      limit: queryLimit,
    },
  }

  // ...
}
```


But if you need a parameter in more than a dozen endpoints, it can be tricky to make sure all have the same name.

With this in mind we added support for you to define parameter in an array instead of an object, this way, you define
the name you want the parameter to have in the variable and then reuse it everywhere:


```ts hl_lines="5 13-15"
import { OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

const queryLimit = Query(z.coerce.number().gte(10).lte(100), {
  name: 'limit',
  description: 'Number of results to return',
})

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List ToDos',
    parameters: [
      queryLimit,
    ],
  }

  // ...
}
```

