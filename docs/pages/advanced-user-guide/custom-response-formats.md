## Describing a binary file:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        description: 'PDF response',
        content: {
          'application/pdf': {
            schema: Str({ format: 'binary' }),
          },
        },
      },
    },
  }

  async handle(c: Context) {
    // ...
  }
}
```

## Describing multiple content types:

```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: z.object({
              title: z.string()
            }),
          },
          'audio/mpeg': {
            schema: Str({ format: 'binary' }),
          },
        },
      },
    },
  }

  async handle(c: Context) {
    // ...
  }
}
```
