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
| `generateOperationIds`   | `boolean`                         | This will generate operation ids from class names for your endpoints when nothing is provided | true                                                                       |
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

