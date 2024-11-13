## Describing response headers:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    responses: {
      200: {
        description: 'Object with user data.',
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
        headers: {
          'x-bar': 'header-example',
          'x-foo': new Str({required: false}),
        },
      },
    },
  }


  async handle(c: Context) {
    // ...
  }
}
```

## Describing response headers with zod:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    responses: {
      200: {
        description: 'Object with user data.',
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
        headers: z.object({
          'x-bar': z.string()
        }),
      },
    },
  }


  async handle(c: Context) {
    // ...
  }
}
```
