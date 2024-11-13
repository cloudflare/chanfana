**Please make sure to read the [Types](../types.md) page before continuing.**


You can declare `query` parameters in the `request` property of your endpoint schema.

The validated data is available under `data.query.<name>`.
 
```ts hl_lines="10-12"
import { OpenAPIRoute } from 'chanfana'
import { z } from 'zod'
import { Context } from 'hono'

export class ToDoFetch extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'List ToDos',
    request: {
      query: z.object({
        limit: z.number().gte(10).lte(100)
      })
    }
  }

  async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    // You get full type inference when accessing the data variable
    data.query.limit
    
    // ...
  }
}
```
