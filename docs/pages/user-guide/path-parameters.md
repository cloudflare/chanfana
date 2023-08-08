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
