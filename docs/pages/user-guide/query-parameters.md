**Please make sure to read the [Types](../types.md) page before continuing.**


You can declare `query` parameters in the `request` property of your endpoint schema.

The validated data is available under `data.query.<name>`.
 
```ts hl_lines="9-11"
import { OpenAPIRoute } from 'chanfana'
import {z} from 'zod'

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

  async handle(
    request: Request,
    env: any,
    context: any,
  ) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    // You get full type inference when accessing the data variable
    data.query.limit
    
    // ...
  }
}
```
