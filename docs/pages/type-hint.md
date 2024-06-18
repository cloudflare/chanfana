The type hint works on `query`, `params`, `headers`, and `body` out of the box. 

To enable this, simply pass your endpoint schema to the generic type when retrieving the validated data, like this:

```ts hl_lines="17"
import { OpenAPIRoute, Str } from 'chanfana'

export class TaskFetch extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({
        taskSlug: Str({description: 'Task slug'})
      }),
    },
  }

  async handle(request: Request, env: any, context: any) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    // you now get type hints, when accessing the data argument
    data.params.taskSlug
    
    // ...
  }
}
```
