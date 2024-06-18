Types are used everywhere in this framework, from defining the request parameters to response formats.

We highly recommend that you use Zod types by default, but chanfana native types are still available.

There are 2 API's to define types in chanfana:

* Zod types
* Native types

## Zod types

Zod types, are as the name says, types from the [Zod](https://github.com/colinhacks/zod) library, they are much more
verbose than the native types, but allows you to define almost everything supported by the OpenAPI specification, like
AnyOf, AllOF, etc.

> Zod is a TypeScript-first schema declaration and validation library. I'm using the term "schema" to broadly refer to
> any data type, from a simple string to a complex nested object.

> Zod is designed to be as developer-friendly as possible. The goal is to eliminate duplicative type declarations. With
> Zod, you declare a validator once and Zod will automatically infer the static TypeScript type. It's easy to compose
> simpler types into complex data structures.

Zod types can be used everywhere the Native types are used (because native types are actually just Zod wrappers).

Zod allows you to have a much more granular control over what is a valid input or not.

For example you could define a `Query` parameter that only accepts number bellow or equal to 10 with the following line.

```ts
import { z } from 'zod'

const responseLimit = z.coerce.number().lte(10)
```

Then use it in a endpoint like this:

```ts
import { OpenAPIRoute } from 'chanfana'

export class Example extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        limit: queryResponseLimit,
      })
    }
  }

  async handle(request: Request, env: any, context: any) {
    // TODO data
    return {
      validatedLimit: data.query.limit
    }
  }
}
```

Read the Zod documentation [here](https://zod.dev/)!


### chanfana types

chanfana types are just helper functions that allow your type to have a small footprint in your code, they internally
generate normal Zod types, and you can use then as the following:

```ts
import { Email } from 'chanfana'

const emailParam = Email({description: 'a valid email address', required: false})
```

Here is a list of all available chanfana types and the parameters available

| Name        |                           Arguments                           |
|-------------|:-------------------------------------------------------------:|
| Num         |             description example default required              |
| Int         |             description example default required              |
| Str         |          description example default format required          |
| Enumeration | description example default values enumCaseSensitive required |
| DateTime    |             description example default required              |
| DateOnly    |             description example default required              |
| Bool        |             description example default required              |
| Regex       |   description example default pattern patternError required   |
| Email       |             description example default required              |
| Uuid        |             description example default required              |
| Hostname    |             description example default required              |
| Ipv4        |             description example default required              |
| Ipv6        |             description example default required              |
| Ip          |             description example default required              |



Because native types are just alias to Zod types with glitter, you can use them
in every place you could use a Zod types, like this:

```ts
import { Str, Int, OpenAPIRoute } from 'chanfana'

const queryDescription = Str({description: 'a valid email address'})

export class Example extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        description: queryDescription
      })
    }
  }

  async handle(request: Request, env: any, context: any) {
    // todo data
    return {
      validatedDescription: data.query.description
    }
  }
}
```
