## Describing a binary file:

```ts
import { OpenAPIRoute, Str } from 'chanfana'

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

  async handle(request: Request, env: any, context: any) {
    // ...
  }
}
```

## Describing multiple content types:

```ts
import { OpenAPIRoute, Str } from 'chanfana'

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

  async handle(request: Request, env: any, context: any, data: any) {
    // ...
  }
}
```
