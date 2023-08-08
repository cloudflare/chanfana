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
