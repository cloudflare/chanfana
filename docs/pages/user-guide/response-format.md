**Please make sure to read the [Types](../types.md) page before continuing.**


As said in the [Types](../types.md) page, you can define response schemas using Native types or Zod types.

But the easier way for this is to just define it using javascript variables, or copy paste your endpoints response after
calling it.

Here's an example of a response schema using variables

```ts
import { OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class TimeseriesFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    responses: {
      '200': {
        description: 'Timeseries response',
        schema: {
          series: {
            timestamps: ['2023-01-01 00:00:00'],
            values: [0.56],
          },
        },
      },
    },
  }

  // ...
}
```

And because this is all common javascript objects you can reuse your schemas like:

```ts
import { OpenAPIRoute } from '@cloudflare/itty-router-openapi'

const annotations = [
  {
    'dataSource': 'NET',
    'startDate': '2023-08-11T10:00:00Z',
    'endDate': '2023-08-11T10:30:00Z',
    'eventType': 'PIPELINE',
    'description': 'Internal issue',
    'linkedUrl': '',
    'isInstantaneous': false,
  },
]

export class TimeseriesFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    responses: {
      '200': {
        description: 'Timeseries with meta response',
        schema: {
          meta: {
            annotations: annotations
          },
          series: {
            timestamps: ['2023-01-01 00:00:00'],
            values: [0.56],
          },
        },
      },
    },
  }

  // ...
}
```

You can also define other response formats than `application/json` read more 
[here](../advanced-user-guide/custom-response-formats.md).
