**Please make sure to read the [Types](../types.md) page before continuing.**


As said in the [Types](../types.md) page, you can define response schemas using Native types or Zod types.

Ideally you would define the response schema as a `z.object(...)`, like this:

```ts
import { OpenAPIRoute, legacyTypeIntoZod } from 'chanfana'
import { z } from 'zod'

export class TimeseriesFetch extends OpenAPIRoute {
  schema = {
    responses: {
      '200': {
        description: 'Timeseries response',
        content: {
          'application/json': {
            schema: z.object({
              series: z.object({
                timestamps: z.string().date().array(),
                values: z.number().array(),
              })
            }),
          },
        },
      },
    },
  }

  // ...
}
```

This can get a lot verbose, depending on your endpoint schema, so 2 tools are bundled with chanfana to make this easier.

### legacyTypeIntoZod

`legacyTypeIntoZod` allows you to send any javascript structure inside it, containing or not native types or Zod types.
It will then loop through the structure to convert everything into Zod types so that the response is well displayed.

You can even send javascript variables like strings and numbers and it will be able to parse them as well.

Here's an example of a response schema using variables

```ts
import { OpenAPIRoute, legacyTypeIntoZod } from 'chanfana'

export class TimeseriesFetch extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    responses: {
      '200': {
        description: 'Timeseries response',
        content: {
          'application/json': {
            schema: legacyTypeIntoZod({
              series: {
                timestamps: ['2023-01-01 00:00:00'],
                values: [0.56],
              },
            }),
          },
        },
      },
    },
  }

  // ...
}
```

### contentJson

If you want even less verbose definitions you can use `contentJson`, this function will also call `legacyTypeIntoZod`
under the hood, for you to have even more flexibility.

```ts
import { contentJson, OpenAPIRoute } from 'chanfana'
import { z } from 'zod'

export class TimeseriesFetch extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    responses: {
      '200': {
        description: 'Timeseries response',
        ...contentJson({
          series: {
            timestamps: ['2023-01-01 00:00:00'],
            values: z.number().gte(0).array(),
          },
        }),
      },
    },
  }

  // ...
}
```
