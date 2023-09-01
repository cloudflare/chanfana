Types are used everywhere in this framework, from defining parameters to response formats.

There are 2 API's to define types in itty-router-open, but we recommend that you choose one and stick to it.

* Native types
* Zod types

## Native types

Native types, are referred in this documentation as 3 things that work interchangeably:

* itty-router-openapi types (`Email`, `Ipv4`, ...)
* JavaScript native types (`String`, `Number`, ...)
* JavaScript variables (`'myvar'` gets parsed as `String`, and so on for numbers and bools)

When these types were defined we tried to make them as simple as possible, tried to add as much compatibility as
possible.
This is the main reason we support such wide variations.

### itty-router-openapi types

itty-router-openapi types are imported as the following:

```ts
import { Email, Str } from '@cloudflare/itty-router-openapi'
```

Here is a list of all available itty-router-openapi types and the parameters available

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

All itty-router-openapi types can be instantiated in 3 ways:

* normal class (`new Email({description: 'user email'})`)
* raw class (just `Email` and itty-router-openapi handles the instantiation)
* instantiation by parameter location (`Query(Str, { description: 'Task description' })`)

As an example, you could define the same query parameter in these 3 ways:

```ts
import { Query, Str } from '@cloudflare/itty-router-openapi'

const queryDescription1 = Query(Str)
const queryDescription2 = Query(new Str({ description: 'Task description' }))
const queryDescription3 = Query(Str, { description: 'Task description' })
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

### JavaScript native types

JavaScript native types can be used everywhere the itty-router-openapi types are used, sometimes it just makes
defining schemas simpler

For example here is the same query parameters as above defined as JavaScript native types.
In this case you cannot instantiate the type with the `new` keyword, so you must pass the parameters to the parameter
location.

```ts
import { Query } from '@cloudflare/itty-router-openapi'

const queryDescription1 = Query(String)
const queryDescription3 = Query(String, { description: 'Task description' })
```

### JavaScript variables

The main reason we support JavaScript variables is to make it as simple as possible to define schemas and even set as
example.

Here is an example of the same end result defined with a variable and as itty-router-openapi type.

```ts
import { Query } from '@cloudflare/itty-router-openapi'

const queryDescription1 = Query('john cena')
const queryDescription3 = Query(String, { example: 'john cena' })
```

Defining request bodies and response schemas is even easier with variables, here is another end result defined as
variables and with itty-router-openapi type:

```ts
export class ExampleVariables extends OpenAPIRoute {
  static schema = {
    requestBody: {
      name: 'john cena',
      description: 'John Felix Anthony Cena is an American professional wrestler.',
      height: 1.85,
      can_be_seen: false,
    }
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    // ...
  }
}
```

```ts
export class ExampleIttyRouterOpenAPI extends OpenAPIRoute {
  static schema = {
    requestBody: {
      name: new Str({ example: 'john cena' }),
      description: new Str({ example: 'John Felix Anthony Cena is an American professional wrestler.' }),
      height: new Num({ example: 1.85 }),
      can_be_seen: new Bool({ example: false }),
    }
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    // ...
  }
}
```

Defining response bodies is such an easy task with variables, you literaly just have to call your endpoint, and
copy-paste
the response is your schema.

```ts
export class ExampleRequestBody extends OpenAPIRoute {
  static schema = {
    responses: {
      '200': {
        description: 'Successful Response',
        schema: {
          'asn': {
            'name': 'CLOUDFLARENET',
            'nameLong': '',
            'aka': 'Cloudflare',
            'asn': 13335,
            'website': 'https://www.cloudflare.com',
            'country': 'US',
            'countryName': 'United States',
            'orgName': 'Cloudflare, Inc.',
            'related': [
              {
                'name': 'CLOUDFLARENET-AUS',
                'aka': '',
                'asn': 14789,
                'estimatedUsers': null,
              },
              {
                'name': 'CLOUDFLARENET-SFO',
                'aka': '',
                'asn': 394536,
                'estimatedUsers': null,
              },
              {
                'name': 'CLOUDFLARENET-SFO05',
                'aka': '',
                'asn': 395747,
                'estimatedUsers': null,
              },
            ],
          },
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any,
  ) {
    // ...
  }
}
```

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
import { Query } from '@cloudflare/itty-router-openapi'
import { z } from 'zod'

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
