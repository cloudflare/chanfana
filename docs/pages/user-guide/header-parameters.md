**Please make sure to read the [Types](../types.md) page before continuing.**


You can declare `headers` parameters in the `request` property of your endpoint schema.

The validated data is available under `data.headers.<name>`.

```ts hl_lines="10-12"
import {OpenAPIRoute, Ip} from 'chanfana'
import {z} from 'zod'
import {Context} from 'hono'

export class ToDoFetch extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    request: {
      headers: z.object({
        forwardedFor: Ip()
      })
    }
  }

  async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>()

    // You get full type inference when accessing the data variable
    data.headers.forwardedFor

    // ...
  }
}
```
