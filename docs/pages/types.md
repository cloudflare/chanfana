Types are used everywhere in this framework, from defining parameters to response formats.

There are 2 API's to define types in itty-router-open, but we recommend that you choose one and stick to it.

Native types, are types developed exclusive to this framework, they are pretty straight forward and easy to use, but are
some limitations.

Zod types, are as the name says, types from the [Zod](https://github.com/colinhacks/zod) library, they are much more
verbose
than the native types, but allows you to define almost everything.

## Native types

All of theses Types can be imported like:
```ts
import { Email } from '@cloudflare/itty-router-openapi'
```

| Name        |                      Arguments                       |
|-------------|:----------------------------------------------------:|
| Num         |             description example default              |
| Int         |             description example default              |
| Str         |          description example default format          |
| Enumeration | description example default values enumCaseSensitive |
| DateTime    |             description example default              |
| DateOnly    |             description example default              |
| Bool        |             description example default              |
| Regex       |   description example default pattern patternError   |
| Email       |             description example default              |
| Uuid        |             description example default              |
| Hostname    |             description example default              |
| Ipv4        |             description example default              |
| Ipv6        |             description example default              |

As an example, you would define a string query parameter as the following:

```ts
import { Query, Str } from '@cloudflare/itty-router-openapi'

const queryDescription = Query(Str, { description: 'Task description' })
```

Then use it in a endpoint like this:

```ts
import { Query, Str, Int, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class Example extends OpenAPIRoute {
  static schema = {
    parameters: {
      description: queryDescription,
    },
    responses: {
      '200': {
        schema: {},
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    return {
      validatedDescription: data.query.description
    }
  }
}
```

## Zod types

> Zod is a TypeScript-first schema declaration and validation library. I'm using the term "schema" to broadly refer to
> any data type, from a simple string to a complex nested object.

> Zod is designed to be as developer-friendly as possible. The goal is to eliminate duplicative type declarations. With
> Zod, you declare a validator once and Zod will automatically infer the static TypeScript type. It's easy to compose
> simpler types into complex data structures.

Zod types can be used everywhere the Native types are used (because native types are actually just Zod wrappers).

Zod allows you to have a much more granular control over what is a valid input or not.

For example you could define a `Query` parameter that only accepts number bellow or equal to 10 with the following line.

```ts
import { Query } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

const queryResponseLimit = Query(z.coerce.number().lte(10))
```

Then use it in a endpoint like this:

```ts
import { OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class Example extends OpenAPIRoute {
  static schema = {
    parameters: {
      limit: queryResponseLimit,
    },
    responses: {
      '200': {
        schema: {},
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    return {
      validatedLimit: data.query.limit
    }
  }
}
```

Read the Zod documentation [here](https://zod.dev/)!
