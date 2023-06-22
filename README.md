# itty-router-openapi

This library provides an easy and compact OpenAPI 3 schema generator and validator
for [Cloudflare Workers](https://developers.cloudflare.com/workers/).

`itty-router-openapi` is built on top of [itty-router](https://github.com/kwhitley/itty-router) and extends some of its
core features, such as adding class-based endpoints. It also provides a simple and iterative path for migrating from old
applications based on `itty-router`.

A template repository is available
at [cloudflare/templates](https://github.com/cloudflare/templates/tree/main/worker-openapi),
with a live demo [here](https://worker-openapi-example.radar.cloudflare.com/docs).

There is a Tutorial Section [available here](https://github.com/cloudflare/itty-router-openapi/blob/main/TUTORIAL.md)!

## Features

- [x] Drop-in replacement for existing itty-router applications
- [x] OpenAPI 3 schema generator
- [x] Fully written in typescript
- [x] Class-based endpoints
- [x] Query parameters validator
- [x] Path parameters validator
- [x] Body request validator
- [x] Out of the box [OpenAI plugin support](#aiplugin)

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

## Migrating from existing `itty-router` applications

All it takes is changing one line of code. After installing `itty-router-openapi` replace `Router` with the
new `OpenAPIRouter` function.

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

// ...
```

Now, when running the application, go to `/docs`. You will see your endpoints listed with the query parameters parsed
and ready to be invoked.

## Options API

#### `OpenAPIRouter(options = {})`

| Name                     | Type(s)                           | Description                                                                                   | Examples                                                                   |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `base`                   | `string`                          | prefixes all routes with this string                                                          | `Router({ base: '/api' })`                                                 |
| `routes`                 | `array of routes`                 | array of manual routes for preloading                                                         | [see documentation](https://github.com/kwhitley/itty-router#manual-routes) |
| `schema`                 | `object`                          | Object of the common OpenAPI customizations                                                   | [see documentation](#4-core-openapi-schema-customizations)                 |
| `docs_url`               | `string` or `null` or `undefined` | Path for swagger docs, `null`: disabled, `undefined`: `/docs`                                 | `/docs`                                                                    |
| `redoc_url`              | `string` or `null` or `undefined` | Path for redoc docs, `null`: disabled, `undefined`: `/redocs`                                 | `/redocs`                                                                  |
| `openapi_url`            | `string` or `null` or `undefined` | Path for openapi schema, `null`: disabled, `undefined`: `/openapi.json`                       | `/openapi.json`                                                            |
| `raiseUnknownParameters` | `boolean`                         | This will raise validation errors when an endpoint received an unknown query parameter        | true                                                                       |
| `generateOperationIds`   | `boolean`                         | This will generate operarion ids from class names for your endpoints when nothing is provided | true                                                                       |
| `aiPlugin`               | `object` or `undefined`           | Object that will be used to generate the `ai-plugin.json` schema                              | [see schema bellow](#aiplugin)                                             |

#### `aiPlugin`

Example configurations are [available here](#openai-plugin-support)

| Name                    | Type(s)                                    | Description                                                                           | Examples                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`        | `SchemaVersion` or `string` or `undefined` | Schema Version, `undefined`: defaults `v1`                                            | `v1`                                                                                                                                                                                                                       |
| `name_for_model`        | `string`                                   | Name for model                                                                        | `cloudflare_radar`                                                                                                                                                                                                         |
| `name_for_human`        | `string`                                   | Name for Human                                                                        | `Cloudflare Radar API`                                                                                                                                                                                                     |
| `description_for_model` | `string`                                   | Description for model                                                                 | `Plugin for retrieving the data based on Cloudflare Radar's data. Use it whenever a user asks something that might be related to Internet usage, eg. outages, Internet traffic, or Cloudflare Radar's data in particular.` |
| `description_for_human` | `string`                                   | Description for human                                                                 | `Get data insights from Cloudflare's point of view.`                                                                                                                                                                       |
| `logo_url`              | `string`                                   | Logo url                                                                              | `https://cdn-icons-png.flaticon.com/512/5969/5969044.png`                                                                                                                                                                  |
| `contact_email`         | `string`                                   | Contact email                                                                         | `radar@cloudflare.com`                                                                                                                                                                                                     |
| `legal_info_url`        | `string`                                   | Legal info url                                                                        | `https://www.cloudflare.com/website-terms/`                                                                                                                                                                                |
| `auth`                  | `object` or `undefined`                    | Object for Auth configuration, `undefined`: defaults to no Auth                       | `{type: AuthType.USER_HTTP, authorization_type: 'bearer'}`                                                                                                                                                                 |
| `api`                   | `object` or `undefined`                    | Object for Api configuration, `undefined`: defaults to openapi.json spec              | `{type: APIType.OPENAPI, has_user_authentication: false, url: '/openai.json'}`                                                                                                                                             |
| `is_dev`                | `boolean` or `undefined`                   | Boolean to let chatgpt know it is in development mode, `undefined`: defaults to false | `true`                                                                                                                                                                                                                     |

## Schema types

Schema types can be used in parameters, requestBody and responses.

All of theses Types can be imported like `import { Email } from '@cloudflare/itty-router-openapi'`

| Name          |                           Arguments                            |
| ------------- | :------------------------------------------------------------: |
| `Num`         |               `description` `example` `default`                |
| `Int`         |               `description` `example` `default`                |
| `Str`         |           `description` `example` `default` `format`           |
| `Enumeration` | `description` `example` `default` `values` `enumCaseSensitive` |
| `DateTime`    |               `description` `example` `default`                |
| `DateOnly`    |               `description` `example` `default`                |
| `Bool`        |               `description` `example` `default`                |
| `Regex`       |   `description` `example` `default` `pattern` `patternError`   |
| `Email`       |               `description` `example` `default`                |
| `Uuid`        |               `description` `example` `default`                |
| `Hostname`    |               `description` `example` `default`                |
| `Ipv4`        |               `description` `example` `default`                |
| `Ipv6`        |               `description` `example` `default`                |

In order to make use of the `enum` argument you should pass your Enum values to the `Enumeration` class, as shown
bellow.

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

#### Example responses:

Example with common values

```ts
responses = {
  '200': {
    schema: {
      result: {
        series: {
          timestamps: ['2023-01-01 00:00:00'],
          values: [0.56],
        },
      },
    },
  },
}
```

Example with defined types

```ts
responses = {
  '200': {
    schema: {
      result: {
        meta: {
          confidenceInfo: schemaDateRange,
          dateRange: schemaDateRange,
          aggInterval: schemaAggInterval,
          lastUpdated: new DateTime(),
        },
        series: {
          timestamps: [new DateTime()],
          values: [new Str({ example: 0.56 })],
        },
      },
    },
  },
}
```

#### Example requestBody:

```ts
requestBody = {
  datasetId: new Int({ example: 3 }),
  search: new Str(),
}
```

#### Example Enumeration:

Enumerations like the other types can be defined both inline or as a variable outside the schema.

```ts
import { Enumeration } from '@cloudflare/itty-router-openapi'

parameters = {
  format: Query(Enumeration, {
    description: 'Format the response should be returned',
    default: 'json',
    required: false,
    values: {
      json: 'json',
      csv: 'csv',
    },
  }),
}
```

#### Example Enumeration not case sensitive:

This way, the client can call any combination of upper and lower characters and it will still be a valid input.

```ts
import { Enumeration } from '@cloudflare/itty-router-openapi'

const formatsEnum = new Enumeration({
  enumCaseSensitive: false,
  values: {
    json: 'json',
    csv: 'csv',
  },
})

parameters = {
  format: Query(formatsEnum, {
    description: 'Format the response should be returned',
    default: 'json',
    required: false,
  }),
}
```

## Parameters

Currently there is support for both the `Query` and `Path` parameters.

This is where you will use the Schema types explained above.

Example path parameter:

Notice that parameter key needs to be the same name as the route path

```ts
import { OpenAPIRoute, Path, Int, Str } from '@cloudflare/itty-router-openapi'

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    parameters: {
      todoId: Path(Int, {
        description: 'ToDo ID',
      }),
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    const { todoId } = data
    // ...
  }
}

router.get('/todos/:todoId', ToDoFetch)
```

Example query parameter:

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
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    const { page } = data
    // ...
  }
}

router.get('/todos', ToDoList)
```

## Request Body Validation

The `requestBody` is defined the same way as the normal `parameters`.
The validated data will be available inside the `body` property in the `data` argument.

Remember that `requestBody` is only available when the route method is not `GET`.

```ts
export class ToDoCreate extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Create a new Todo',
    requestBody: {
      title: String,
      description: new Str({ required: false }),
      type: new Enumeration({
        values: {
          nextWeek: 'nextWeek',
          nextMonth: 'nextMonth',
        }
      })
    },
    responses: {
      '200': {
        schema: {
          todo: {
            id: 123,
            title: 'My title',
          },
        },
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: Record<string, any>) {
    const { body } = data

    // Actually insert the data somewhere

    return {
      todo: {
        id: 123,
        title: body.title,
      },
    }
  }
}

...

router.post('/todos', ToDoCreate)
```

## OpenAI plugin support

In the `aiPlugin` field you can define all fields from
the [plugin manifest](https://platform.openai.com/docs/plugins/getting-started)

This library include default values for the following plugin manifest fields:

```ts
import { AuthType, SchemaVersion, APIType } from '@cloudflare/itty-router-openapi'

const default = {
  schema_version: SchemaVersion.V1,
  auth: {
    type: AuthType.NONE,
  },
  api: {
    type: APIType.OPENAPI,
    has_user_authentication: false,
    url: '/openai.json', // The path to the schema will be the same as the `openapi_url` field in the router configuration
  }
}
```

Taking into consideration the default values included, we can build a very minimal configuration, assuming the api
doesn't require Auth:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter({
  aiPlugin: {
    name_for_human: 'Cloudflare Radar API',
    name_for_model: 'cloudflare_radar',
    description_for_human: "Get data insights from Cloudflare's point of view.",
    description_for_model:
      "Plugin for retrieving the data based on Cloudflare Radar's data. Use it whenever a user asks something that might be related to Internet usage, eg. outages, Internet traffic, or Cloudflare Radar's data in particular.",
    contact_email: 'radar@cloudflare.com',
    legal_info_url: 'https://www.cloudflare.com/website-terms/',
    logo_url: 'https://cdn-icons-png.flaticon.com/512/5969/5969044.png',
  },
})

// ...
```

Now when calling the `/.well-known/ai-plugin.json` path in our worker, we will see a full ai-plugin schema, that
automatically points to our generated OpenAPI 3 Schema.

### Serving the OpenAI schema from multiple domains/hosts

When serving from multiple domains, the OpenAPI schema should automatically update to the domain being served.

Thats why we made the `aiPlugin.api.url` to allow relative paths, and when doing so, the itty-router-openapi will
automatically fill the domain.

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter({
  aiPlugin: {
    // other fields
    api: {
      url: '/my-schema-for-openai.json',
    },
  },
})

// ...
```

Then when calling for `https://example.com/.well-known/ai-plugin.json` the response will have the absolut url

```
{
  ...
  api: {
    url: 'https://example.com/my-schema-for-openai.json'
  }
}
```

## Advanced Usage

### 1. Cloudflare ES6 Module Worker

In the Module Worker format, the parameters binding is different.

Instead of the worker only having access to the `event` argument, that argument is split
into `request`, `env`, `context`.
And as said above, the `data` object (that contains the validated parameters) is always the **last argument** that
the `handle()`
function receives.

```ts
import { OpenAPIRouter, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = { ... }

  async handle(request: Request, env, context, data: Record<string, any>) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

export default {
  fetch: router.handle
}
```

Otherwise, if you don't need the new `env` and `context` parameters, you can remove theses like the next example

```ts
import { OpenAPIRouter, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = { ... }

  async handle(request: Request, data: Record<string, any>) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

export default {
  fetch: (request) => router.handle(request)
}
```

Learn more
about [Cloudflare Module Worker format here](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#syntax-module-worker).

### 2. Using Javascript types

If you are planning on using this lib with Typescript, then declaring schemas is even easier than with Javascript
because instead of importing the parameter types, you can use the native Typescript data types `String`, `Number`,
or `Boolean`.

```ts
export class ToDoList extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    parameters: {
      page: Query(Number, {
        description: 'Page number',
        default: 1,
        required: false,
      }),
    },
    responses: {
      '200': {
        schema: {
          currentPage: Number,
          nextPage: Number,
          results: [String],
        },
      },
    },
  }
  // ...
}
```

### 3. Build your own Schema Type

All schema types extend from the `BaseParameter` or other type and build on top of that. To build your own type just
pick an already available type, like `Str` or extend from the base class.

```ts
export class Num extends BaseParameter {
  type = 'number'

  validate(value: any): any {
    value = super.validate(value)

    value = Number.parseFloat(value)

    if (isNaN(value)) {
      throw new ValidationError('is not a valid number')
    }

    return value
  }
}

export class DateOnly extends Str {
  type = 'string'
  protected declare params: StringParameterType

  constructor(params?: StringParameterType) {
    super({
      example: '2022-09-15',
      ...params,
      format: 'date',
    })
  }
}
```

### 4. Core openapi schema customizations

Besides adding a schema to your endpoints, its also recomended you customize your schema. This can be done by passing
the schema argument when creating your router. All [OpenAPI Fixed Fields](https://swagger.io/specification/#schema) are
available.

The example bellow will change the schema title, and add a Bearer token authentication to all endpoints

```ts
const router = OpenAPIRouter({
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
})
```

### 5. Hiding routes in the OpenAPI schema

Hiding routes can be archived by registering your endpoints in the original `itty-router`,as shown here:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()

router.original.get(
  '/todos/:id',
  ({ params }) => new Response(`Todo #${params.id}`)
)
```

This endpoint will still be accessible, but will not be shown in the schema.

### 6. Accessing the `openapi.json` schema

For CI/CD pipelines, you can read the complete `openapi.json` schemas by calling the `schema` property from the router
instance.

Here is an example of a nodejs script that would pick the schema, make some changes and write it to a file, to be able
to
be picked from a CI/CD pipeline.

```ts
import fs from 'fs'
import { router } from '../src/router'

// Get the Schema from itty-router-openapi
const schema = router.schema

// Optionaly: update the schema with some costumizations for publishing

// Write the final schema
fs.writeFileSync('./public-api.json', JSON.stringify(schema, null, 2))
```

### 7. Nested Routers

For big projects, having all routes in the same file can be chaotic.

In this example we split some routes to a different router

```ts
// api/attacks/router.ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

export const attacksRouter = OpenAPIRouter({ base: '/api/v1/attacks' })

attacksRouter.get('/layer3/timeseries', AttacksLayer3Timeseries)
```

```ts
// router.ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'
import { attacksRouter } from 'api/attacks/router'

export const router = OpenAPIRouter({
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
  },
})

router.all('/api/v1/attacks/*', attacksRouter)

// Other routes
router.get('/api/v1/bgp/timeseries', BgpTimeseries)
```

Now run `wrangler dev` and go to `/docs` with your browser, here you can verify that all nested routers appear correctly
and you are able to call every endpoint.

### 8. Cloudflare Worker using addEventListener

If you want to use the `addEventListener` instead of exporting an object, you can define your worker like this:

```ts
import { OpenAPIRouter, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = { ... }

  async handle(request: Request, data: Record<string, any>) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

addEventListener('fetch', (event) => event.respondWith(router.handle(event.request)))
```

You can also pass other `event` parameters to the endpoint, by adding them in the `addEventListener` function

```ts
import { OpenAPIRouter, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = { ... }

  async handle(request: Request, waitUntil: any, data: Record<string, any>) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

addEventListener('fetch', (event) => event.respondWith(router.handle(event.request, event.waitUntil.bind(event))))
```

Notice that, in this last example the endpoint is receiving an extra `waitUntil` parameter.

Learn more
about [Cloudflare Workers addEventListener here](https://developers.cloudflare.com/workers/runtime-apis/add-event-listener/).

### 9. Custom responses formats

Describing a binary file:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        contentType: 'application/pdf',
        schema: new Str({ format: 'binary' }),
      },
    },
  }

  async handle(request: Request, data: Record<string, any>) {
    // ...
  }
}
```

Describing a XML response:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        contentType: 'application/xml',
        schema: new Obj(
          {
            code: new Str({ example: '13335' }),
            name: new Str({ example: 'Cloudflare' }),
            type: new Str({ example: 'asn' }),
          },
          { xml: { name: 'root' } }
        ),
      },
    },
  }

  async handle(request: Request, data: Record<string, any>) {
    // ...
  }
}
```

## Feedback and contributions

Currently this package is maintained by the [Cloudflare Radar Team](https://radar.cloudflare.com/) and features are
prioritized based on the Radar roadmap.

Nonetheless you can still open pull requests or issues in this repository and they will get reviewed.

You can also talk to us in the [Cloudflare Community](https://community.cloudflare.com/) or
the [Radar Discord Channel](https://discord.com/channels/595317990191398933/1035553707116478495)
