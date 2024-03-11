## Describing response headers:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema: OpenAPIRouteSchema = {
    responses: {
      200: {
        description: 'Object with user data.',
        schema: {
          series: {
            timestamps: ['2023-01-01 00:00:00'],
            values: [0.56],
          },
        },
        headers: {
          'x-bar': 'header-example',
          'x-foo': new Str({required: false}),
        },
      },
    },
  }


  async handle(request: Request, env: any, context: any, data: any) {
    // ...
  }
}
```

## Describing response headers with zod:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema: OpenAPIRouteSchema = {
    responses: {
      200: {
        description: 'Object with user data.',
        schema: {
          series: {
            timestamps: ['2023-01-01 00:00:00'],
            values: [0.56],
          },
        },
        headers: z.object({
          'x-bar': z.string()
        }),
      },
    },
  }


  async handle(request: Request, env: any, context: any, data: any) {
    // ...
  }
}
```
